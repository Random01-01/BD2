// Conta opcional do cliente: cadastro, "meus agendamentos" e cancelamento sem digitar telefone.
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assinarTokenCliente, exigirLogin } from '../auth.js';
import { normalizarTelefone } from '../datas.js';

export function rotasCliente(repo, config) {
  const r = Router();
  const limite = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  r.post('/clientes/cadastro', limite, async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const telefone = normalizarTelefone(req.body?.telefone);
    const senha = String(req.body?.senha ?? '');

    const erros = [];
    if (nome.length < 2 || nome.length > 100) erros.push('nome obrigatório (2 a 100 caracteres)');
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 100) erros.push('e-mail inválido');
    if (telefone.length < 10 || telefone.length > 13) erros.push('telefone inválido (com DDD)');
    if (senha.length < 8 || senha.length > 72) erros.push('a senha deve ter de 8 a 72 caracteres');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });

    if (await repo.buscarContaPorEmail(email)) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail. Entre com a sua senha.' });
    const senha_hash = await bcrypt.hash(senha, 10);
    const conta = await repo.transacao((tx) => tx.criarConta({ nome, telefone, email, senha_hash }));
    res.status(201).json({
      token: assinarTokenCliente(conta, config.jwtSecret),
      usuario: { nome, email, telefone, perfil: 'CLIENTE', tipo: 'cliente' },
    });
  });

  const logado = Router();
  logado.use(exigirLogin(config.jwtSecret, 'cliente'));

  logado.get('/perfil', async (req, res) => {
    const perfil = await repo.obterPerfilCliente(req.usuario.id_cliente);
    if (!perfil) return res.status(404).json({ erro: 'Conta não encontrada.' });
    res.json(perfil);
  });

  logado.get('/agendamentos', async (req, res) => res.json(await repo.agendamentosDoCliente(req.usuario.id_cliente)));

  logado.post('/agendamentos/:id/cancelar', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Agendamento inválido.' });
    const motivo = String(req.body?.motivo ?? '').slice(0, 255) || 'Cancelado pelo cliente';
    const ok = await repo.cancelarDoCliente({ id, idCliente: req.usuario.id_cliente, motivo });
    if (!ok) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' });
    res.json({ ok: true });
  });

  r.use('/cliente', logado);
  return r;
}
