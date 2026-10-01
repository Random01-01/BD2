// Testes das rotas do painel da profissional (serviços, categorias, horários, folgas e resumo).
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';

const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
const hoje = agoraNoFuso(config.fusoHorario).data;
const terca = proximaData(2, hoje, 2);
const domingo = proximaData(0, hoje, 2);

let srv; let url; let tk;
const j = async (m, c, corpo, token = tk) => {
  const r = await fetch(url + c, {
    method: m,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return [r.status, await r.json()];
};

before(async () => {
  srv = criarApp(criarRepoMemoria(), config).listen(0);
  url = `http://localhost:${srv.address().port}/api`;
  tk = (await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' }, null))[1].token;
});
after(() => srv.close());

test('todas as rotas do painel exigem login', async () => {
  for (const c of ['/admin/resumo', '/admin/servicos', '/admin/categorias', '/admin/horarios', '/admin/bloqueios']) {
    assert.equal((await j('GET', c, null, null))[0], 401, c);
  }
});

test('resumo (dashboard)', async () => {
  const [s, b] = await j('GET', '/admin/resumo');
  assert.equal(s, 200);
  assert.equal(b.porDia.length, 7);
  assert.equal(typeof b.hoje.previsto, 'number');
  assert.ok(Array.isArray(b.proximos));
});

test('serviços: criar, validar, editar, desativar e excluir', async () => {
  const [c, nova] = await j('POST', '/admin/servicos', { nome: 'Hidratação', preco: '80,5', duracao_minutos: 45 });
  assert.equal(c, 400); // preço com vírgula não é número
  assert.ok(nova.detalhes.includes('preço inválido'));
  assert.equal((await j('POST', '/admin/servicos', { nome: 'X', preco: 10, duracao_minutos: 3 }))[0], 400);
  assert.equal((await j('POST', '/admin/servicos', { nome: 'Hidratação', preco: 10, duracao_minutos: 30, id_categoria: 999 }))[0], 400);

  const [s1, criado] = await j('POST', '/admin/servicos', { nome: 'Hidratação', descricao: 'Profunda', preco: 80.5, duracao_minutos: 45, id_categoria: 1 });
  assert.equal(s1, 201);
  assert.equal(criado.categoria, 'Cabelo');
  assert.equal(criado.ativo, true);

  let [, publicos] = await j('GET', '/servicos', null, null);
  assert.ok(publicos.some((x) => x.nome === 'Hidratação'));

  const [s2, editado] = await j('PUT', `/admin/servicos/${criado.id_servico}`, { ...criado, preco: 90, ativo: false });
  assert.equal(s2, 200);
  assert.equal(editado.preco, 90);
  [, publicos] = await j('GET', '/servicos', null, null);
  assert.ok(!publicos.some((x) => x.nome === 'Hidratação'), 'inativo some do site do cliente');
  const [, todos] = await j('GET', '/admin/servicos');
  assert.ok(todos.some((x) => x.nome === 'Hidratação' && x.ativo === false), 'inativo continua no painel');
  assert.equal((await j('GET', `/disponibilidade?servico=${criado.id_servico}&data=${terca}`, null, null))[0], 404);

  assert.equal((await j('DELETE', `/admin/servicos/${criado.id_servico}`))[0], 200);
  assert.equal((await j('DELETE', `/admin/servicos/${criado.id_servico}`))[0], 404);
  assert.equal((await j('PUT', '/admin/servicos/9999', { nome: 'Nada', preco: 1, duracao_minutos: 30 }))[0], 404);
});

test('serviço com agendamentos não pode ser excluído (só desativado)', async () => {
  const [s, b] = await j('DELETE', '/admin/servicos/1'); // "Corte feminino" tem agendamento no seed
  assert.equal(s, 409);
  assert.match(b.erro, /Desative/);
});

test('categorias: criar, duplicada, editar e excluir', async () => {
  const [s, c] = await j('POST', '/admin/categorias', { nome: 'Maquiagem' });
  assert.equal(s, 201);
  assert.equal((await j('POST', '/admin/categorias', { nome: 'maquiagem' }))[0], 409);
  assert.equal((await j('POST', '/admin/categorias', { nome: '' }))[0], 400);
  assert.equal((await j('PUT', `/admin/categorias/${c.id_categoria}`, { nome: 'Make' }))[0], 200);
  assert.equal((await j('PUT', `/admin/categorias/${c.id_categoria}`, { nome: 'Cabelo' }))[0], 409);
  assert.equal((await j('DELETE', `/admin/categorias/${c.id_categoria}`))[0], 200);
  assert.equal((await j('DELETE', `/admin/categorias/${c.id_categoria}`))[0], 404);
});

test('horários de atendimento: sobreposição, validação e efeito na disponibilidade', async () => {
  const [, antes] = await j('GET', `/disponibilidade?servico=4&data=${domingo}`, null, null);
  assert.deepEqual(antes.horarios, []); // domingo sem atendimento

  assert.equal((await j('POST', '/admin/horarios', { dia_semana: 0, hora_inicio: '10:00', hora_fim: '09:00' }))[0], 400);
  assert.equal((await j('POST', '/admin/horarios', { dia_semana: 7, hora_inicio: '09:00', hora_fim: '10:00' }))[0], 400);
  assert.equal((await j('POST', '/admin/horarios', { dia_semana: 2, hora_inicio: '17:00', hora_fim: '19:00' }))[0], 409); // terça já 09-18

  const [s, h] = await j('POST', '/admin/horarios', { dia_semana: 0, hora_inicio: '09:00', hora_fim: '11:00' });
  assert.equal(s, 201);
  const [, depois] = await j('GET', `/disponibilidade?servico=4&data=${domingo}`, null, null);
  assert.deepEqual(depois.horarios, ['09:00', '09:30', '10:00', '10:30']);

  const [, lista] = await j('GET', '/admin/horarios');
  assert.ok(lista.some((x) => x.id_horario === h.id_horario && x.dia_semana === 0));
  assert.equal((await j('DELETE', `/admin/horarios/${h.id_horario}`))[0], 200);
  assert.equal((await j('DELETE', `/admin/horarios/${h.id_horario}`))[0], 404);
});

test('folgas: bloqueiam o dia, avisam agendamentos afetados e podem ser removidas', async () => {
  assert.equal((await j('POST', '/admin/bloqueios', { data_inicio: 'abc' }))[0], 400);
  assert.equal((await j('POST', '/admin/bloqueios', { data_inicio: terca, data_fim: hoje }))[0], 400);

  const [s, b] = await j('POST', '/admin/bloqueios', { data_inicio: terca, motivo: 'Feriado' });
  assert.equal(s, 201);
  assert.equal(b.data_fim, terca);            // fim assume o início
  assert.equal(b.agendamentos_afetados, 2);   // os dois do seed nessa terça

  const [, d] = await j('GET', `/disponibilidade?servico=1&data=${terca}`, null, null);
  assert.deepEqual(d.horarios, []);
  assert.equal(d.motivoIndisponivel, 'Feriado');
  assert.equal((await j('POST', '/agendamentos', { id_servico: 1, data: terca, hora_inicio: '15:00', cliente: { nome: 'Teste', telefone: '18911112222' } }, null))[0], 409);

  const [, lista] = await j('GET', '/admin/bloqueios');
  assert.ok(lista.some((x) => x.id_bloqueio === b.id_bloqueio));
  assert.equal((await j('DELETE', `/admin/bloqueios/${b.id_bloqueio}`))[0], 200);
  const [, livre] = await j('GET', `/disponibilidade?servico=1&data=${terca}`, null, null);
  assert.ok(livre.horarios.length > 0);
});
