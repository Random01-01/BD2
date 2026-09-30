// Cálculo de horários livres. Funções puras (sem banco) para facilitar os testes.

/** "09:30" ou "09:30:00" -> 570 (minutos desde 00:00) */
export function paraMinutos(hora) {
  const [h, m] = String(hora).split(':');
  return Number(h) * 60 + Number(m);
}

/** 570 -> "09:30" */
export function deMinutos(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * @param {object} p
 * @param {{hora_inicio:string,hora_fim:string}[]} p.janelas  expediente do dia
 * @param {{hora_inicio:string,hora_fim:string}[]} p.ocupados agendamentos não cancelados do dia
 * @param {number} p.duracao        duração do serviço em minutos
 * @param {number} p.passo          intervalo entre horários oferecidos (ex.: 30)
 * @param {number} [p.minimoMinutos] não oferecer horários que começam antes disso (para "hoje")
 * @returns {string[]} horários de início livres, "HH:MM"
 */
export function calcularHorariosLivres({ janelas, ocupados, duracao, passo, minimoMinutos = 0 }) {
  const ocup = ocupados.map((o) => [paraMinutos(o.hora_inicio), paraMinutos(o.hora_fim)]);
  const livres = new Set();

  for (const j of janelas) {
    const ini = paraMinutos(j.hora_inicio);
    const fim = paraMinutos(j.hora_fim);
    for (let t = ini; t + duracao <= fim; t += passo) {
      if (t < minimoMinutos) continue;
      const termina = t + duracao;
      const sobrepoe = ocup.some(([oi, of]) => t < of && termina > oi); // mesma regra do banco
      if (!sobrepoe) livres.add(t);
    }
  }
  return [...livres].sort((a, b) => a - b).map(deMinutos);
}

/** Soma minutos a "HH:MM" -> "HH:MM" */
export function somarMinutos(hora, minutos) {
  return deMinutos(paraMinutos(hora) + minutos);
}
