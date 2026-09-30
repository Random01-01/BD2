import { criarApp } from './app.js';
import { config } from './config.js';
import { criarPool } from './db.js';

const pool = criarPool(config.databaseUrl);
const app = criarApp(pool, config);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API no ar: http://localhost:${config.port}/api/saude`);
});
