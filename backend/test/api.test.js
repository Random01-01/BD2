// Testes da API ponta a ponta (HTTP) usando o repositório em memória — não precisa de banco.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';

const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
const hoje = agoraNoFuso(config.fusoHorario).data;
const terca = proximaData(2, hoje, 2);   // terça futura (o seed ocupa 10:00-11:00 e 11:30-12:15)
const domingo = proximaData(0, hoje, 2);

let srv; let base_url; let token;
const j = async (metodo, caminho, corpo, tk) => {
  const r = await fetch(base_url + caminho, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return [r.status, await r.json()];
};

before(async () => {
  srv = criarApp(criarRepoMemoria(), config).listen(0);
  base_url = `http://localhost:${srv.address().port}/api`;
});
after(() => srv.close());

const novo = (extra = {}) => ({
  id_servico: 1, data: terca, hora_inicio: '14:00',
  cliente: { nome: 'Nova Cliente', telefone: '(18) 95555-1234', email: 'n@x.com' }, ...extra,
});

test('saúde e lista de serviços', async () => {
  assert.equal((await j('GET', '/saude'))[0], 200);
  const [s, b] = await j('GET', '/servicos');
  assert.equal(s, 200);
  assert.equal(b.length, 4);
  assert.equal(typeof b[0].preco, 'number');
});

test('disponibilidade respeita agendamentos existentes', async () => {
  const [, b] = await j('GET', `/disponibilidade?servico=1&data=${terca}`);
  assert.ok(b.horarios.includes('09:00'));
  assert.ok(!b.horarios.includes('10:00') && !b.horarios.includes('10:30'));
  assert.ok(b.horarios.includes('12:30'));
});

test('domingo, passado e parâmetros inválidos', async () => {
  let [, b] = await j('GET', `/disponibilidade?servico=1&data=${domingo}`);
  assert.deepEqual(b.horarios, []);
  [, b] = await j('GET', '/disponibilidade?servico=1&data=2020-01-01');
  assert.deepEqual(b.horarios, []);
  assert.equal((await j('GET', '/disponibilidade?servico=abc&data=xx'))[0], 400);
  assert.equal((await j('GET', `/disponibilidade?servico=99&data=${terca}`))[0], 404);
});

test('cria agendamento e rejeita conflitos', async () => {
  let [s, b] = await j('POST', '/agendamentos', novo());
  assert.equal(s, 201);
  assert.equal(b.hora_fim, '15:00');
  assert.equal(b.preco_cobrado, 60);
  assert.equal((await j('POST', '/agendamentos', novo()))[0], 409);                    // mesmo horário
  assert.equal((await j('POST', '/agendamentos', novo({ hora_inicio: '10:00' })))[0], 409); // horário do seed
  assert.equal((await j('POST', '/agendamentos', novo({ hora_inicio: '18:00' })))[0], 409); // fora do expediente
  [s] = await j('POST', '/agendamentos', novo({ cliente: { nome: 'X' } }));
  assert.equal(s, 400);
});

test('5 reservas simultâneas no mesmo horário: só 1 vence', async () => {
  const rs = await Promise.all([...Array(5)].map((_, i) =>
    j('POST', '/agendamentos', novo({ hora_inicio: '09:00', cliente: { nome: `C${i}`, telefone: `1899990000${i}` } }))));
  assert.equal(rs.filter((r) => r[0] === 201).length, 1);
  assert.equal(rs.filter((r) => r[0] === 409).length, 4);
});

test('cancelamento pelo cliente libera o horário', async () => {
  const [, ag] = await j('POST', '/agendamentos', novo({ hora_inicio: '16:00', cliente: { nome: 'Cancela', telefone: '(18) 94444-0000' } }));
  assert.equal((await j('POST', `/agendamentos/${ag.id_agendamento}/cancelar`, { telefone: '(18) 00000-0000' }))[0], 404);
  assert.equal((await j('POST', `/agendamentos/${ag.id_agendamento}/cancelar`, { telefone: '18944440000', motivo: 'Imprevisto' }))[0], 200);
  const [, b] = await j('GET', `/disponibilidade?servico=1&data=${terca}`);
  assert.ok(b.horarios.includes('16:00'));
});

test('mesmo telefone reaproveita o cliente', async () => {
  const [, a] = await j('POST', '/agendamentos', novo({ hora_inicio: '17:00', cliente: { nome: 'Repetida', telefone: '(18) 93333-0000' } }));
  const [, b] = await j('POST', '/agendamentos', novo({ id_servico: 4, hora_inicio: '16:30', cliente: { nome: 'Repetida', telefone: '18933330000' } }));
  assert.equal(a.id_agendamento !== b.id_agendamento, true);
  [, token] = await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' });
  const [, agenda] = await j('GET', `/admin/agenda?inicio=${terca}&fim=${terca}`, null, token.token);
  assert.equal(new Set(agenda.filter((x) => x.cliente === 'Repetida').map((x) => x.id_cliente)).size, 1);
});

test('painel admin: login, agenda e mudança de status', async () => {
  assert.equal((await j('GET', `/admin/agenda?inicio=${terca}`))[0], 401);
  assert.equal((await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'errada' }))[0], 401);
  const [s, login] = await j('POST', '/auth/login', { email: 'ADMIN@mariana.com', senha: 'admin123' });
  assert.equal(s, 200);
  const [, agenda] = await j('GET', `/admin/agenda?inicio=${terca}&fim=${terca}`, null, login.token);
  assert.ok(agenda.length >= 4);
  const ag = agenda.find((x) => x.status === 'CONFIRMADO').id_agendamento;
  assert.equal((await j('PATCH', `/admin/agendamentos/${ag}`, { status: 'CONCLUIDO' }, login.token))[0], 200);
  assert.equal((await j('PATCH', `/admin/agendamentos/${ag}`, { status: 'CANCELADO' }, login.token))[0], 409);
  assert.equal((await j('PATCH', '/admin/agendamentos/9999', { status: 'CANCELADO' }, login.token))[0], 404);
});

test('rota inexistente', async () => assert.equal((await j('GET', '/nada'))[0], 404));
