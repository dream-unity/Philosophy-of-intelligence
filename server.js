const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;

app.disable('x-powered-by');

// Prevent serving server/project metadata files directly
app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json', '/metadata.json'];
  if (blocked.includes(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(
  express.static(ROOT_DIR, {
    index: 'index.html',
    dotfiles: 'ignore',
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
      } else if (path.basename(filePath) === 'sw.js') {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Service-Worker-Allowed', '/');
      } else if (/\.(?:html|js|mjs|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
