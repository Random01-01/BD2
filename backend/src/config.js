import 'dotenv/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const int = (valor, padrao) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : padrao;
};

const DIST_PADRAO = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export const config = {
  port: int(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  modoDemo: process.env.MODO_DEMO === 'true' || process.argv.includes('--demo'),
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  statusInicial: process.env.STATUS_INICIAL === 'PENDENTE' ? 'PENDENTE' : 'CONFIRMADO',
  passoMinutos: int(process.env.PASSO_MINUTOS, 30),
  antecedenciaMinutos: int(process.env.ANTECEDENCIA_MINUTOS, 60),
  fusoHorario: 'America/Sao_Paulo',
  // Publicação em um serviço só: a API também entrega o site (frontend/dist), se ele já foi compilado.
  siteDir: process.env.SITE_DIR || (process.env.SERVIR_SITE === 'false' ? '' : (existsSync(DIST_PADRAO) ? DIST_PADRAO : '')),
  // Atrás de proxy (Render etc.): TRUST_PROXY=1 para o limite de tentativas de login enxergar o IP real.
  trustProxy: int(process.env.TRUST_PROXY, 0),
};
