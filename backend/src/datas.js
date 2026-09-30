const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function dataValida(texto) {
  if (typeof texto !== 'string' || !FORMATO_DATA.test(texto)) return false;
  const d = new Date(`${texto}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

export const horaValida = (texto) => typeof texto === 'string' && FORMATO_HORA.test(texto);

/** 0=Domingo ... 6=Sábado (igual ao Date.getDay e à coluna dia_semana) */
export function diaDaSemana(texto) {
  return new Date(`${texto}T12:00:00Z`).getUTCDay();
}

/** Data ("YYYY-MM-DD") e minutos desde 00:00 "agora" no fuso de São Paulo. */
export function agoraNoFuso(fuso, agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(agora).map((p) => [p.type, p.value]),
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

export const normalizarTelefone = (t) => String(t ?? '').replace(/\D/g, '');
