// Acesso ao MySQL. Toda a SQL do sistema fica neste arquivo.
// Tabelas: ver database/mysql/*.sql
import { ConflitoError } from '../erros.js';

const DIAS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']; // ENUM de horario_disponivel
const HORA = (c) => `TIME_FORMAT(${c}, '%H:%i')`;
const SO_DIGITOS = (c) => `REGEXP_REPLACE(${c}, '[^0-9]', '')`;

// O trigger do banco usa SIGNAL SQLSTATE '45000' (errno 1644) quando há conflito de horário.
const ehConflito = (e) => e?.errno === 1644 || e?.sqlState === '45000';

function consultas(ex) {
  const q = async (sql, params = []) => (await ex.query(sql, params))[0];
  return {
    async ping() { await q('SELECT 1'); },

    listarServicos: () => q(
      `SELECT s.id_servico, s.nome, s.descricao, s.preco, s.duracao_minutos,
              c.id_categoria, c.nome AS categoria
         FROM servico s LEFT JOIN categoria_servico c ON c.id_categoria = s.id_categoria
        WHERE s.ativo = TRUE
        ORDER BY c.nome IS NULL, c.nome, s.nome`),

    async obterServicoAtivo(id) {
      const rows = await q(
        'SELECT id_servico, id_profissional, duracao_minutos, preco FROM servico WHERE id_servico = ? AND ativo = TRUE', [id]);
      return rows[0] ?? null;
    },

    async bloqueioNoDia(idProfissional, data) {
      const rows = await q(
        `SELECT motivo FROM bloqueio_agenda
          WHERE id_profissional = ? AND ? BETWEEN data_inicio AND data_fim LIMIT 1`, [idProfissional, data]);
      return rows[0] ?? null;
    },

    janelasDoDia: (idProfissional, diaSemana) => q(
      `SELECT ${HORA('hora_inicio')} AS hora_inicio, ${HORA('hora_fim')} AS hora_fim
         FROM horario_disponivel WHERE id_profissional = ? AND dia_semana = ?
        ORDER BY horario_disponivel.hora_inicio`, [idProfissional, DIAS[diaSemana]]),

    ocupadosDoDia: (idProfissional, data) => q(
      `SELECT ${HORA('hora_inicio')} AS hora_inicio, ${HORA('hora_fim')} AS hora_fim
         FROM agendamento
        WHERE id_profissional = ? AND data_agendamento = ? AND status <> 'CANCELADO'`, [idProfissional, data]),

    async cancelarPeloCliente({ id, telefone, motivo }) {
      const r = await ex.query(
        `UPDATE agendamento a JOIN cliente c ON c.id_cliente = a.id_cliente
            SET a.status = 'CANCELADO', a.motivo_cancelamento = ?, a.data_cancelamento = NOW()
          WHERE a.id_agendamento = ? AND ${SO_DIGITOS('c.telefone')} = ?
            AND a.status IN ('PENDENTE','CONFIRMADO')`, [motivo, id, telefone]);
      return r[0].affectedRows > 0;
    },

    async buscarUsuarioPorEmail(email) {
      const rows = await q(
        `SELECT id_usuario, id_profissional, nome, email, senha_hash, perfil
           FROM usuario WHERE LOWER(email) = ?`, [email]);
      return rows[0] ?? null;
    },

    agendaDoPeriodo: (idProfissional, inicio, fim) => q(
      `SELECT a.id_agendamento, a.data_agendamento, ${HORA('a.hora_inicio')} AS hora_inicio,
              ${HORA('a.hora_fim')} AS hora_fim, a.status, a.observacao,
              c.id_cliente, c.nome AS cliente, c.telefone AS telefone_cliente,
              s.id_servico, s.nome AS servico, COALESCE(a.preco_cobrado, s.preco) AS preco
         FROM agendamento a
         JOIN cliente c ON c.id_cliente = a.id_cliente
         JOIN servico s ON s.id_servico = a.id_servico
        WHERE a.id_profissional = ? AND a.data_agendamento BETWEEN ? AND ?
        ORDER BY a.data_agendamento, a.hora_inicio`, [idProfissional, inicio, fim]),

    async statusDoAgendamento(id, idProfissional) {
      const rows = await q('SELECT status FROM agendamento WHERE id_agendamento = ? AND id_profissional = ?', [id, idProfissional]);
      return rows[0]?.status ?? null;
    },

    async atualizarStatus({ id, status, motivo }) {
      try {
        await q(
          `UPDATE agendamento SET status = ?, motivo_cancelamento = ?,
                  data_cancelamento = CASE WHEN ? = 'CANCELADO' THEN NOW() ELSE NULL END
            WHERE id_agendamento = ?`, [status, motivo, status, id]);
      } catch (e) {
        if (ehConflito(e)) throw new ConflitoError('Conflito de horário ao alterar o agendamento.');
        throw e;
      }
    },

    // --- usados somente dentro de transacao() ---
    async travarProfissional(id) {
      // Serializa as reservas da mesma profissional (o trigger sozinho não é seguro contra concorrência).
      await q('SELECT id_profissional FROM profissional WHERE id_profissional = ? FOR UPDATE', [id]);
    },

    async upsertCliente({ nome, telefone, email }) {
      const rows = await q(`SELECT id_cliente FROM cliente WHERE ${SO_DIGITOS('telefone')} = ? LIMIT 1`, [telefone]);
      if (rows.length) {
        if (email) await q('UPDATE cliente SET email = COALESCE(email, ?) WHERE id_cliente = ?', [email, rows[0].id_cliente]);
        return rows[0].id_cliente;
      }
      const r = await ex.query('INSERT INTO cliente (nome, telefone, email) VALUES (?, ?, ?)', [nome, telefone, email]);
      return r[0].insertId;
    },

    async inserirAgendamento(a) {
      let id;
      try {
        const r = await ex.query(
          `INSERT INTO agendamento
             (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim,
              preco_cobrado, status, observacao)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [a.id_cliente, a.id_servico, a.id_profissional, a.data, a.hora_inicio, a.hora_fim,
           a.preco_cobrado, a.status, a.observacao]);
        id = r[0].insertId;
      } catch (e) {
        if (ehConflito(e)) throw new ConflitoError();
        throw e;
      }
      const rows = await q(
        `SELECT id_agendamento, data_agendamento, ${HORA('hora_inicio')} AS hora_inicio,
                ${HORA('hora_fim')} AS hora_fim, status, preco_cobrado
           FROM agendamento WHERE id_agendamento = ?`, [id]);
      return rows[0];
    },
  };
}

export function criarRepoMysql(pool) {
  return {
    ...consultas(pool),
    async transacao(fn) {
      const conn = await pool.getConnection();
      try {
        // READ COMMITTED é essencial: no padrão (REPEATABLE READ) a leitura feita antes do FOR UPDATE
        // fixaria um "retrato" antigo do banco, e o trigger anti-conflito não enxergaria a reserva
        // que acabou de ser confirmada por outra requisição.
        await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await conn.beginTransaction();
        const resultado = await fn(consultas(conn));
        await conn.commit();
        return resultado;
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }
    },
  };
}
