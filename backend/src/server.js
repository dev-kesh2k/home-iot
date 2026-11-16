import express from 'express';
import { api } from './routes.js';
import { HaError } from './ha.js';
import { startScheduler } from './automations.js';
import { prisma } from './db.js';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

// O proxy pode repassar /api/..., o caminho completo /<slug>/api/... ou já sem o prefixo (/auth/login).
const publicPath = String(process.env.PUBLIC_PATH || '').replace(/\/+$/, '');
// Saúde com o banco: 503 quando o Postgres não responde (é este /health que o Hub enxerga depois de publicado).
app.get(['/health', `${publicPath}/health`], async (_req, res) => {
  const started = Date.now();
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]);
    res.json({ ok: true, db: 'ok', dbMs: Date.now() - started, uptimeS: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ ok: false, db: 'erro', uptimeS: Math.round(process.uptime()) });
  }
});
if (publicPath) app.use(`${publicPath}/api`, api);
app.use('/api', api);
app.use('/', api);

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HaError) return res.status(502).json({ error: err.message });
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Erro interno' : err.message });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`HomeIoT API ouvindo em 0.0.0.0:${port} (prefixo ${publicPath || '/'})`);
  startScheduler();
});
