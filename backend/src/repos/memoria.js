// Repositório em memória: mesma interface do MySQL, sem banco.
// Usado nos testes automatizados e no "modo demo" (npm run demo), para o front-end
// poder ser desenvolvido sem MySQL instalado. Os dados somem ao reiniciar.
import bcrypt from 'bcryptjs';
import { agoraNoFuso, proximaData } from '../datas.js';
import { ConflitoError } from '../erros.js';
import { deMinutos, paraMinutos } from '../slots.js';

export function criarRepoMemoria({ fuso = 'America/Sao_Paulo' } = {}) {
  const hoje = agoraNoFuso(fuso).data;
  const proximaTerca = proximaData(2, hoje, 2);

  const db = {
    categorias: [{ id_categoria: 1, nome: 'Cabelo' }, { id_categoria: 2, nome: 'Estética' }, { id_categoria: 3, nome: 'Manicure e Pedicure' }],
    servicos: [
      { id_servico: 1, id_profissional: 1, id_categoria: 1, nome: 'Corte feminino', descricao: 'Corte de cabelo feminino', preco: 60, duracao_minutos: 60, ativo: true },
      { id_servico: 2, id_profissional: 1, id_categoria: 1, nome: 'Escova', descricao: 'Escova modelada', preco: 45, duracao_minutos: 45, ativo: true },
      { id_servico: 3, id_profissional: 1, id_categoria: 1, nome: 'Coloração', descricao: 'Coloração completa', preco: 150, duracao_minutos: 120, ativo: true },
      { id_servico: 4, id_profissional: 1, id_categoria: 2, nome: 'Design de sobrancelha', descricao: 'Design com henna', preco: 50, duracao_minutos: 30, ativo: true },
    ],
    janelas: [1, 2, 3, 4, 5].map((d) => ({ id_profissional: 1, dia: d, hora_inicio: '09:00', hora_fim: '18:00' }))
      .concat([{ id_profissional: 1, dia: 6, hora_inicio: '09:00', hora_fim: '13:00' }]),
    bloqueios: [],
    clientes: [
      { id_cliente: 1, nome: 'Ana Paula', telefone: '(18) 98888-2222', email: 'ana@email.com' },
      { id_cliente: 2, nome: 'Juliana Santos', telefone: '(18) 97777-3333', email: 'juliana@email.com' },
      { id_cliente: 3, nome: 'Carla Mendes', telefone: '(18) 96666-4444', email: 'carla@email.com' },
    ],
    agendamentos: [],
    usuarios: [{ id_usuario: 1, id_profissional: 1, nome: 'Mariana Admin', email: 'admin@mariana.com', senha_hash: bcrypt.hashSync('admin123', 10), perfil: 'ADMIN' }],
    seq: { cliente: 3, agendamento: 0 },
  };

  const semDigitos = (t) => String(t).replace(/\D/g, '');
  const ativo = (a) => a.status !== 'CANCELADO';
  const sobrepoe = (a, b) => paraMinutos(a.hora_inicio) < paraMinutos(b.hora_fim) && paraMinutos(a.hora_fim) > paraMinutos(b.hora_inicio);

  function inserir(a) { // espelha o trigger trg_impede_conflito_horario
    const novo = { id_agendamento: ++db.seq.agendamento, observacao: null, motivo_cancelamento: null, ...a };
    const conflito = db.agendamentos.some((x) =>
      x.id_profissional === novo.id_profissional && x.data_agendamento === novo.data_agendamento && ativo(x) && sobrepoe(novo, x));
    if (conflito) { db.seq.agendamento--; throw new ConflitoError(); }
    db.agendamentos.push(novo);
    return novo;
  }
  inserir({ id_cliente: 1, id_servico: 1, id_profissional: 1, data_agendamento: proximaTerca, hora_inicio: '10:00', hora_fim: '11:00', preco_cobrado: 60, status: 'CONFIRMADO' });
  inserir({ id_cliente: 2, id_servico: 2, id_profissional: 1, data_agendamento: proximaTerca, hora_inicio: '11:30', hora_fim: '12:15', preco_cobrado: 45, status: 'CONFIRMADO' });

  const leituras = {
    async ping() {},
    async listarServicos() {
      return db.servicos.filter((s) => s.ativo).map((s) => ({
        ...s, categoria: db.categorias.find((c) => c.id_categoria === s.id_categoria)?.nome ?? null,
      })).sort((a, b) => (a.categoria ?? '￿').localeCompare(b.categoria ?? '￿') || a.nome.localeCompare(b.nome));
    },
    async obterServicoAtivo(id) {
      const s = db.servicos.find((x) => x.id_servico === id && x.ativo);
      return s ? { id_servico: s.id_servico, id_profissional: s.id_profissional, duracao_minutos: s.duracao_minutos, preco: s.preco } : null;
    },
    async bloqueioNoDia(idProf, data) {
      return db.bloqueios.find((b) => b.id_profissional === idProf && data >= b.data_inicio && data <= b.data_fim) ?? null;
    },
    async janelasDoDia(idProf, dia) {
      return db.janelas.filter((j) => j.id_profissional === idProf && j.dia === dia)
        .map(({ hora_inicio, hora_fim }) => ({ hora_inicio, hora_fim })).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    },
    async ocupadosDoDia(idProf, data) {
      return db.agendamentos.filter((a) => a.id_profissional === idProf && a.data_agendamento === data && ativo(a))
        .map(({ hora_inicio, hora_fim }) => ({ hora_inicio, hora_fim }));
    },
    async cancelarPeloCliente({ id, telefone, motivo }) {
      const a = db.agendamentos.find((x) => x.id_agendamento === id);
      const c = a && db.clientes.find((x) => x.id_cliente === a.id_cliente);
      if (!a || semDigitos(c.telefone) !== telefone || !['PENDENTE', 'CONFIRMADO'].includes(a.status)) return false;
      Object.assign(a, { status: 'CANCELADO', motivo_cancelamento: motivo, data_cancelamento: new Date().toISOString() });
      return true;
    },
    async buscarUsuarioPorEmail(email) { return db.usuarios.find((u) => u.email.toLowerCase() === email) ?? null; },
    async agendaDoPeriodo(idProf, ini, fim) {
      return db.agendamentos.filter((a) => a.id_profissional === idProf && a.data_agendamento >= ini && a.data_agendamento <= fim)
        .sort((a, b) => a.data_agendamento.localeCompare(b.data_agendamento) || a.hora_inicio.localeCompare(b.hora_inicio))
        .map((a) => {
          const c = db.clientes.find((x) => x.id_cliente === a.id_cliente);
          const s = db.servicos.find((x) => x.id_servico === a.id_servico);
          return { id_agendamento: a.id_agendamento, data_agendamento: a.data_agendamento, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
            status: a.status, observacao: a.observacao ?? null, id_cliente: c.id_cliente, cliente: c.nome, telefone_cliente: c.telefone,
            id_servico: s.id_servico, servico: s.nome, preco: a.preco_cobrado ?? s.preco };
        });
    },
    async statusDoAgendamento(id, idProf) {
      return db.agendamentos.find((a) => a.id_agendamento === id && a.id_profissional === idProf)?.status ?? null;
    },
    async atualizarStatus({ id, status, motivo }) {
      Object.assign(db.agendamentos.find((a) => a.id_agendamento === id), { status, motivo_cancelamento: motivo });
    },
    async travarProfissional() {},
    async upsertCliente({ nome, telefone, email }) {
      const c = db.clientes.find((x) => semDigitos(x.telefone) === telefone);
      if (c) { c.email ??= email; return c.id_cliente; }
      db.clientes.push({ id_cliente: ++db.seq.cliente, nome, telefone, email });
      return db.seq.cliente;
    },
    async inserirAgendamento(a) {
      const n = inserir({ id_cliente: a.id_cliente, id_servico: a.id_servico, id_profissional: a.id_profissional,
        data_agendamento: a.data, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim, preco_cobrado: a.preco_cobrado,
        status: a.status, observacao: a.observacao });
      return { id_agendamento: n.id_agendamento, data_agendamento: n.data_agendamento, hora_inicio: n.hora_inicio, hora_fim: n.hora_fim, status: n.status, preco_cobrado: n.preco_cobrado };
    },
  };

  let fila = Promise.resolve(); // uma transação por vez (equivale ao FOR UPDATE)
  return {
    ...leituras,
    transacao(fn) {
      const exec = fila.then(() => fn(leituras));
      fila = exec.catch(() => {});
      return exec;
    },
    _db: db,
  };
}
