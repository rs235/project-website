import fs from 'node:fs/promises';
import express from 'express';
import { CACHE_DIR, PHOTO_DIR, PORT } from './config.js';
import { listPhotos, scanPhotoDirectory, watchPhotoDirectory } from './photo-catalog.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.get('/backend/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.get('/backend/photos', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json({ photos: listPhotos() });
});

// Only generated WebP variants are exposed; the original bind-mounted files
// are never served directly.
app.use(
  '/media',
  express.static(CACHE_DIR, {
    dotfiles: 'deny',
    index: false,
    fallthrough: false,
    immutable: true,
    maxAge: '365d',
    setHeaders(response) {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

app.use((error, _request, response, _next) => {
  if (error.status === 404 || error.statusCode === 404) return response.sendStatus(404);
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

let server;
let watcher;

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  await watcher?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

async function start() {
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await scanPhotoDirectory();
  watcher = watchPhotoDirectory();

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Photo portfolio API listening on port ${PORT}`);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((error) => {
  console.error('Could not start API:', error);
  process.exit(1);
});
