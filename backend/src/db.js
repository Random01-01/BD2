import mysql from 'mysql2/promise';

export function criarPool(databaseUrl, { ssl = false } = {}) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida. Copie backend/.env.example para backend/.env e preencha.');
  }
  return mysql.createPool({
    uri: databaseUrl,               // mysql://usuario:senha@host:3306/sistema_agendamento
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    dateStrings: true,              // DATE vem como "AAAA-MM-DD" (sem erro de fuso)
    decimalNumbers: true,           // DECIMAL (preços) vem como número
    charset: 'utf8mb4',
  });
}
