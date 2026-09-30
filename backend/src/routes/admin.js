import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assinarToken, exigirLogin } from '../auth.js';
import { dataValida } from '../datas.js';

const TRANSICOES = {
  PENDENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

export function rotasAdmin(pool, config) {
  const r = Router();

  const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  r.post('/auth/login', limiteLogin, async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? '');
    const { rows } = await pool.query(
      'SELECT id_usuario, id_profissional, nome, email, senha_hash, perfil FROM usuario WHERE lower(email) = $1',
      [email],
    );
    const u = rows[0];
    const ok = u && (await bcrypt.compare(senha, u.senha_hash));
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    res.json({ token: assinarToken(u, config.jwtSecret), usuario: { nome: u.nome, email: u.email, perfil: u.perfil } });
  });

  const protegido = Router();
  protegido.use(exigirLogin(config.jwtSecret));

  // Agenda num período: /api/admin/agenda?inicio=2026-10-05&fim=2026-10-11
  protegido.get('/agenda', async (req, res) => {
    const { inicio, fim = inicio } = req.query;
    if (!dataValida(inicio) || !dataValida(fim)) return res.status(400).json({ erro: 'Informe "inicio" e "fim" (AAAA-MM-DD).' });
    const { rows } = await pool.query(
      `SELECT id_agendamento, data_agendamento, to_char(hora_inicio,'HH24:MI') AS hora_inicio,
              to_char(hora_fim,'HH24:MI') AS hora_fim, status, observacao,
              id_cliente, cliente, telefone_cliente, id_servico, servico, preco
         FROM vw_agenda
        WHERE id_profissional = $1 AND data_agendamento BETWEEN $2 AND $3
        ORDER BY data_agendamento, hora_inicio`,
      [req.usuario.id_profissional, inicio, fim],
    );
    res.json(rows);
  });

  // Muda status: confirmar, concluir ou cancelar (com motivo)
  protegido.patch('/agendamentos/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const novo = req.body?.status;
    if (!Number.isInteger(id) || !Object.keys(TRANSICOES).includes(novo)) {
      return res.status(400).json({ erro: 'Informe um status válido.' });
    }
    const atual = await pool.query(
      'SELECT status FROM agendamento WHERE id_agendamento = $1 AND id_profissional = $2',
      [id, req.usuario.id_profissional],
    );
    if (!atual.rowCount) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    if (!TRANSICOES[atual.rows[0].status].includes(novo)) {
      return res.status(409).json({ erro: `Não é possível mudar de ${atual.rows[0].status} para ${novo}.` });
    }
    const motivo = novo === 'CANCELADO' ? String(req.body?.motivo_cancelamento ?? 'Cancelado pela profissional').slice(0, 255) : null;
    await pool.query(
      `UPDATE agendamento SET status = $2::status_agendamento,
              motivo_cancelamento = $3,
              data_cancelamento = CASE WHEN $2::text = 'CANCELADO' THEN now() END
        WHERE id_agendamento = $1`,
      [id, novo, motivo],
    );
    res.json({ ok: true });
  });

  r.use('/admin', protegido);
  return r;
}
