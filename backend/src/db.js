import pg from 'pg';

// DATE (1082) como texto "YYYY-MM-DD": evita conversão para Date e erro de fuso horário.
pg.types.setTypeParser(1082, (v) => v);
// NUMERIC (1700) como número (preços).
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));

export function criarPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida. Copie backend/.env.example para backend/.env e preencha.');
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
  return new pg.Pool({
    connectionString: databaseUrl,
    ssl: local ? false : { rejectUnauthorized: false }, // Supabase exige SSL
    max: 5,
  });
}
