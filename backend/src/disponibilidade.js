import { agoraNoFuso, diaDaSemana } from './datas.js';
import { calcularHorariosLivres } from './slots.js';

/**
 * Horários livres de um serviço em uma data. Usa `db` (pool ou client de transação).
 * Retorna { motivoIndisponivel } quando o dia não tem atendimento.
 */
export async function buscarHorariosLivres(db, servico, data, config) {
  const agora = agoraNoFuso(config.fusoHorario);
  if (data < agora.data) return { horarios: [], motivoIndisponivel: 'Data no passado.' };

  const bloqueio = await db.query(
    `SELECT motivo FROM bloqueio_agenda
      WHERE id_profissional = $1 AND $2::date BETWEEN data_inicio AND data_fim LIMIT 1`,
    [servico.id_profissional, data],
  );
  if (bloqueio.rowCount) {
    return { horarios: [], motivoIndisponivel: bloqueio.rows[0].motivo || 'Dia sem atendimento.' };
  }

  const janelas = await db.query(
    `SELECT to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fim,'HH24:MI') AS hora_fim
       FROM horario_disponivel WHERE id_profissional = $1 AND dia_semana = $2 ORDER BY hora_inicio`,
    [servico.id_profissional, diaDaSemana(data)],
  );
  if (!janelas.rowCount) return { horarios: [], motivoIndisponivel: 'Sem atendimento neste dia da semana.' };

  const ocupados = await db.query(
    `SELECT to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fim,'HH24:MI') AS hora_fim
       FROM agendamento
      WHERE id_profissional = $1 AND data_agendamento = $2 AND status <> 'CANCELADO'`,
    [servico.id_profissional, data],
  );

  const horarios = calcularHorariosLivres({
    janelas: janelas.rows,
    ocupados: ocupados.rows,
    duracao: servico.duracao_minutos,
    passo: config.passoMinutos,
    minimoMinutos: data === agora.data ? agora.minutos + config.antecedenciaMinutos : 0,
  });
  return { horarios };
}
