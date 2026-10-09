// Conta opcional de cliente: cadastro, login único, agendar logado, meus agendamentos, cancelar, isolamento.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';

const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
const hoje = agoraNoFuso(config.fusoHorario).data;
const quarta = proximaData(3, hoje, 2);

let srv; let url;
const j = async (m, c, corpo, token) => {
  const r = await fetch(url + c, {
    method: m,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return [r.status, await r.json()];
};
const cadastro = { nome: 'Bia Souza', email: 'Bia@Email.com', telefone: '(18) 99999-1111', senha: 'senha-segura-1' };
let tokenBia; let tokenAdmin;

before(async () => {
  srv = criarApp(criarRepoMemoria(), config).listen(0);
  url = `http://localhost:${srv.address().port}/api`;
  tokenAdmin = (await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' }))[1].token;
});
after(() => srv.close());

test('cadastro valida dados, recusa e-mail repetido e já devolve o token', async () => {
  assert.equal((await j('POST', '/clientes/cadastro', { ...cadastro, senha: '123' }))[0], 400);
  assert.equal((await j('POST', '/clientes/cadastro', { ...cadastro, email: 'xx' }))[0], 400);
  const [s, b] = await j('POST', '/clientes/cadastro', cadastro);
  assert.equal(s, 201);
  assert.equal(b.usuario.tipo, 'cliente');
  assert.equal(b.usuario.email, 'bia@email.com'); // normalizado
  tokenBia = b.token;
  assert.equal((await j('POST', '/clientes/cadastro', cadastro))[0], 409);
});

test('login único: cliente entra pelo mesmo endpoint e profissional continua sendo admin', async () => {
  const [s, b] = await j('POST', '/auth/login', { email: 'BIA@email.com', senha: cadastro.senha });
  assert.equal(s, 200);
  assert.equal(b.usuario.tipo, 'cliente');
  assert.equal((await j('POST', '/auth/login', { email: 'bia@email.com', senha: 'errada' }))[0], 401);
  const [, a] = await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' });
  assert.equal(a.usuario.tipo, 'admin');
});

test('token de cliente NÃO acessa o painel e token de admin NÃO acessa área do cliente', async () => {
  assert.equal((await j('GET', '/admin/resumo', null, tokenBia))[0], 403);
  assert.equal((await j('GET', '/admin/servicos', null, tokenBia))[0], 403);
  assert.equal((await j('GET', '/cliente/agendamentos', null, tokenAdmin))[0], 403);
  assert.equal((await j('GET', '/cliente/agendamentos'))[0], 401);
});

test('agenda logado (sem digitar dados), vê em "meus agendamentos" e cancela sem telefone', async () => {
  const [s, ag] = await j('POST', '/agendamentos', { id_servico: 2, data: quarta, hora_inicio: '10:00' }, tokenBia);
  assert.equal(s, 201);
  const [, lista] = await j('GET', '/cliente/agendamentos', null, tokenBia);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].servico, 'Escova');
  const [, perfil] = await j('GET', '/cliente/perfil', null, tokenBia);
  assert.equal(perfil.nome, 'Bia Souza');

  // a profissional vê o nome da cliente na agenda
  const [, agenda] = await j('GET', `/admin/agenda?inicio=${quarta}&fim=${quarta}`, null, tokenAdmin);
  assert.ok(agenda.some((a) => a.cliente === 'Bia Souza'));

  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/cancelar`, {}, tokenBia))[0], 200);
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/cancelar`, {}, tokenBia))[0], 404); // já cancelado
});

test('uma cliente não cancela nem enxerga agendamento de outra', async () => {
  const [, outra] = await j('POST', '/clientes/cadastro', { ...cadastro, nome: 'Carol', email: 'carol@email.com', telefone: '18988887777' });
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '14:00' }, tokenBia);
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/cancelar`, {}, outra.token))[0], 404);
  assert.equal((await j('GET', '/cliente/agendamentos', null, outra.token))[1].length, 0);
});

test('visitante continua agendando sem conta e não é misturado com a conta de mesmo telefone', async () => {
  const [s, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '15:00', cliente: { nome: 'Visitante', telefone: '(18) 99999-1111' } });
  assert.equal(s, 201);
  const [, lista] = await j('GET', '/cliente/agendamentos', null, tokenBia);
  assert.ok(!lista.some((a) => a.id_agendamento === ag.id_agendamento), 'agendamento de visitante não aparece na conta');
});

test('token de cliente inválido ao agendar dá 401 em vez de agendar como visitante', async () => {
  const [s] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '16:00', cliente: { nome: 'X Y', telefone: '18911112222' } }, 'lixo');
  assert.equal(s, 401);
});
