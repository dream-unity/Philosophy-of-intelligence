'use strict';

const express = require('express');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const BLOCKED_PATHS = [
  '/node_modules',
  '/scripts',
  '/tests',
  '/.git',
  '/.github',
  '/server.js',
  '/package.json',
  '/package-lock.json',
];

app.use((req, res, next) => {
  let decoded;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    return res.status(400).send('Bad Request');
  }
  const normalized = path.posix.normalize(decoded);
  const lower = normalized.toLowerCase();
  if (
    BLOCKED_PATHS.some(
      (blocked) => lower === blocked || lower.startsWith(`${blocked}/`)
    )
  ) {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use(
  express.static(ROOT, {
    dotfiles: 'ignore',
    index: 'index.html',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
