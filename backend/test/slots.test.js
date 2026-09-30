import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agoraNoFuso, dataValida, diaDaSemana, normalizarTelefone } from '../src/datas.js';
import { calcularHorariosLivres, somarMinutos } from '../src/slots.js';

const janela = [{ hora_inicio: '09:00', hora_fim: '12:00' }];

test('gera horários de 30 em 30 dentro da janela', () => {
  const r = calcularHorariosLivres({ janelas: janela, ocupados: [], duracao: 60, passo: 30 });
  assert.deepEqual(r, ['09:00', '09:30', '10:00', '10:30', '11:00']); // 11:30 + 60 passaria de 12:00
});

test('remove horários que se sobrepõem a agendamentos', () => {
  const r = calcularHorariosLivres({
    janelas: janela, ocupados: [{ hora_inicio: '10:00', hora_fim: '11:00' }], duracao: 60, passo: 30,
  });
  assert.deepEqual(r, ['09:00', '11:00']); // 09:30 terminaria 10:30 (conflita); 11:00 encosta e é permitido
});

test('serviço longo não cabe antes de um agendamento', () => {
  const r = calcularHorariosLivres({
    janelas: janela, ocupados: [{ hora_inicio: '10:00', hora_fim: '10:30' }], duracao: 120, passo: 30,
  });
  assert.deepEqual(r, []);
});

test('duas janelas (pausa de almoço)', () => {
  const r = calcularHorariosLivres({
    janelas: [{ hora_inicio: '09:00', hora_fim: '10:00' }, { hora_inicio: '14:00', hora_fim: '15:00' }],
    ocupados: [], duracao: 30, passo: 30,
  });
  assert.deepEqual(r, ['09:00', '09:30', '14:00', '14:30']);
});

test('respeita o horário mínimo (hoje + antecedência)', () => {
  const r = calcularHorariosLivres({ janelas: janela, ocupados: [], duracao: 30, passo: 30, minimoMinutos: 10 * 60 + 1 });
  assert.deepEqual(r, ['10:30', '11:00', '11:30']);
});

test('formatos com segundos (vindos do banco) funcionam', () => {
  const r = calcularHorariosLivres({
    janelas: [{ hora_inicio: '09:00:00', hora_fim: '10:00:00' }],
    ocupados: [{ hora_inicio: '09:00:00', hora_fim: '09:30:00' }], duracao: 30, passo: 30,
  });
  assert.deepEqual(r, ['09:30']);
});

test('somarMinutos', () => assert.equal(somarMinutos('10:45', 45), '11:30'));

test('dataValida / diaDaSemana', () => {
  assert.equal(dataValida('2026-10-06'), true);
  assert.equal(dataValida('2026-02-30'), false);
  assert.equal(dataValida('06/10/2026'), false);
  assert.equal(diaDaSemana('2026-10-06'), 2); // terça
  assert.equal(diaDaSemana('2026-10-11'), 0); // domingo
});

test('normalizarTelefone', () => assert.equal(normalizarTelefone('(18) 98888-2222'), '18988882222'));

test('agoraNoFuso usa o fuso informado', () => {
  const r = agoraNoFuso('America/Sao_Paulo', new Date('2026-10-06T02:30:00Z')); // 23:30 do dia 05 em SP (UTC-3)
  assert.deepEqual(r, { data: '2026-10-05', minutos: 23 * 60 + 30 });
});
