import 'dotenv/config';

const int = (valor, padrao) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : padrao;
};

export const config = {
  port: int(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  statusInicial: process.env.STATUS_INICIAL === 'PENDENTE' ? 'PENDENTE' : 'CONFIRMADO',
  passoMinutos: int(process.env.PASSO_MINUTOS, 30),
  antecedenciaMinutos: int(process.env.ANTECEDENCIA_MINUTOS, 60),
  fusoHorario: 'America/Sao_Paulo',
};
