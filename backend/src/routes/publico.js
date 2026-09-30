import { Router } from 'express';
import { dataValida, horaValida, normalizarTelefone } from '../datas.js';
import { buscarHorariosLivres } from '../disponibilidade.js';
import { somarMinutos } from '../slots.js';

export function rotasPublicas(pool, config) {
  const r = Router();

  // Serviços ativos (com categoria)
  r.get('/servicos', async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT s.id_servico, s.nome, s.descricao, s.preco, s.duracao_minutos,
              c.id_categoria, c.nome AS categoria
         FROM servico s LEFT JOIN categoria_servico c ON c.id_categoria = s.id_categoria
        WHERE s.ativo ORDER BY c.nome NULLS LAST, s.nome`,
    );
    res.json(rows);
  });

  // Horários livres: /api/disponibilidade?servico=1&data=2026-10-06
  r.get('/disponibilidade', async (req, res) => {
    const idServico = Number.parseInt(req.query.servico, 10);
    const { data } = req.query;
    if (!Number.isInteger(idServico) || !dataValida(data)) {
      return res.status(400).json({ erro: 'Informe "servico" (número) e "data" (AAAA-MM-DD).' });
    }
    const s = await pool.query(
      'SELECT id_servico, id_profissional, duracao_minutos FROM servico WHERE id_servico = $1 AND ativo',
      [idServico],
    );
    if (!s.rowCount) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    const { horarios, motivoIndisponivel } = await buscarHorariosLivres(pool, s.rows[0], data, config);
    res.json({ data, servico: idServico, horarios, motivoIndisponivel: motivoIndisponivel ?? null });
  });

  // Cria agendamento
  r.post('/agendamentos', async (req, res) => {
    const { id_servico, data, hora_inicio, cliente = {}, observacao } = req.body ?? {};
    const telefone = normalizarTelefone(cliente.telefone);
    const nome = String(cliente.nome ?? '').trim();
    const email = String(cliente.email ?? '').trim() || null;

    const erros = [];
    if (!Number.isInteger(id_servico)) erros.push('id_servico inválido');
    if (!dataValida(data)) erros.push('data inválida (AAAA-MM-DD)');
    if (!horaValida(hora_inicio)) erros.push('hora_inicio inválida (HH:MM)');
    if (nome.length < 2 || nome.length > 100) erros.push('nome obrigatório (2 a 100 caracteres)');
    if (telefone.length < 10 || telefone.length > 13) erros.push('telefone inválido (com DDD)');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) erros.push('e-mail inválido');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const s = await client.query(
        'SELECT id_servico, id_profissional, duracao_minutos, preco FROM servico WHERE id_servico = $1 AND ativo',
        [id_servico],
      );
      if (!s.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ erro: 'Serviço não encontrado.' }); }
      const servico = s.rows[0];

      // Confere expediente, bloqueios, passado e ocupação (o banco ainda é a palavra final)
      const { horarios } = await buscarHorariosLivres(client, servico, data, config);
      if (!horarios.includes(hora_inicio)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ erro: 'Este horário não está mais disponível. Escolha outro.' });
      }

      // Cliente identificado pelo telefone (somente dígitos)
      const existente = await client.query(
        "SELECT id_cliente FROM cliente WHERE regexp_replace(telefone, '\\D', '', 'g') = $1",
        [telefone],
      );
      let idCliente;
      if (existente.rowCount) {
        idCliente = existente.rows[0].id_cliente;
        if (email) await client.query('UPDATE cliente SET email = COALESCE(email, $2) WHERE id_cliente = $1', [idCliente, email]);
      } else {
        const novo = await client.query(
          'INSERT INTO cliente (nome, telefone, email) VALUES ($1, $2, $3) RETURNING id_cliente',
          [nome, telefone, email],
        );
        idCliente = novo.rows[0].id_cliente;
      }

      const ag = await client.query(
        `INSERT INTO agendamento
           (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim,
            preco_cobrado, status, observacao)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id_agendamento, data_agendamento, to_char(hora_inicio,'HH24:MI') AS hora_inicio,
                   to_char(hora_fim,'HH24:MI') AS hora_fim, status, preco_cobrado`,
        [idCliente, servico.id_servico, servico.id_profissional, data, hora_inicio,
         somarMinutos(hora_inicio, servico.duracao_minutos), servico.preco, config.statusInicial,
         observacao ? String(observacao).slice(0, 500) : null],
      );
      await client.query('COMMIT');
      res.status(201).json(ag.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      if (e.code === '23P01') { // exclusion_violation: alguém reservou no mesmo instante
        return res.status(409).json({ erro: 'Este horário acabou de ser ocupado. Escolha outro.' });
      }
      throw e;
    } finally {
      client.release();
    }
  });

  // Cancelamento pelo cliente (confirma identidade com o telefone)
  r.post('/agendamentos/:id/cancelar', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const telefone = normalizarTelefone(req.body?.telefone);
    const motivo = String(req.body?.motivo ?? '').slice(0, 255) || 'Cancelado pelo cliente';
    if (!Number.isInteger(id) || !telefone) return res.status(400).json({ erro: 'Informe o telefone usado no agendamento.' });

    const { rowCount } = await pool.query(
      `UPDATE agendamento a
          SET status = 'CANCELADO', motivo_cancelamento = $3, data_cancelamento = now()
         FROM cliente c
        WHERE a.id_agendamento = $1 AND c.id_cliente = a.id_cliente
          AND regexp_replace(c.telefone, '\\D', '', 'g') = $2
          AND a.status IN ('PENDENTE','CONFIRMADO')`,
      [id, telefone, motivo],
    );
    if (!rowCount) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' });
    res.json({ ok: true });
  });

  return r;
}
