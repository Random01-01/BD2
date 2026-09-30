import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rotasAdmin } from './routes/admin.js';
import { rotasPublicas } from './routes/publico.js';

// Express 4 não captura erros de funções async sozinho; este envoltório resolve.
const comCaptura = (router) => {
  for (const camada of router.stack) {
    if (camada.route) {
      for (const c of camada.route.stack) {
        const original = c.handle;
        if (original.length <= 3) c.handle = (req, res, next) => Promise.resolve(original(req, res, next)).catch(next);
      }
    } else if (camada.handle?.stack) comCaptura(camada.handle);
  }
  return router;
};

export function criarApp(pool, config) {
  if (!config.jwtSecret || config.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET não definido (mínimo 16 caracteres). Veja backend/.env.example.');
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/saude', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api', comCaptura(rotasPublicas(pool, config)));
  app.use('/api', comCaptura(rotasAdmin(pool, config)));

  app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
  });
  return app;
}
