import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app.ts';

const port = Number(process.env.PORT || 4317);
const { app, close } = createApp({ databasePath: resolve(process.env.DATABASE_PATH || 'data/review-desk.sqlite') });
app.use('/api', (_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'This API route does not exist.' }));

if (existsSync(resolve('dist/index.html')) && process.env.NODE_ENV !== 'development') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  app.use(vite.middlewares);
}

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Collections Review Desk: http://127.0.0.1:${port}`);
  console.log('Synthetic demonstration. Local bank actions and demo personas.');
});
function shutdown() { server.close(() => { close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
