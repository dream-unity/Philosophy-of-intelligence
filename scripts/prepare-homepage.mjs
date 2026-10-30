import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { STAGES } = require('../src/shape-practice.js');

export function prepareHomepage() {
  // Render the noninteractive shape gallery before JavaScript starts. A delayed or failed script
  // must never leave the opening screen without its shape cards.
  delete require.cache[require.resolve('../src/geometry.js')];
  const geometry = require('../src/geometry.js');
  const cards = STAGES.map((stage, index) =>
    `          <div class="stage-tile" data-stage="${stage.id}" role="group" aria-label="${stage.name}"><span class="stage-number">${String(index + 1).padStart(2, '0')}</span><span class="stage-icon" aria-hidden="true">${geometry.miniIcon(stage.id, 65)}</span><span class="stage-name">${stage.name}</span></div>`
  ).join('\n');
  const path = resolve(root, 'index.html');
  let html = readFileSync(path, 'utf8');
  const gallery = /(<section\b[^>]*\bid="stage-path"[^>]*>)[\s\S]*?(<\/section>)/;
  if (!gallery.test(html)) throw new Error('The homepage shape gallery is missing.');
  html = html.replace(gallery, (_, open, close) => `${open}\n${cards}\n        ${close}`);

  // Changed files get new request URLs, avoiding old icons/JS/CSS paired with new
  // markup after deployment. Unchanged files keep their cached versions.
  html = html.replace(/(<(?:link|script|img)\b[^>]*\b(?:href|src)=")([^"?#]+\.(?:css|js|svg))(?:\?[^"#]*)?("[^>]*>)/g,
    (_, open, asset, close) => {
      const version = createHash('sha256').update(readFileSync(resolve(root, asset))).digest('hex').slice(0, 12);
      return `${open}${asset}?v=${version}${close}`;
    });
  writeFileSync(path, html);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareHomepage();
  console.log('Prepared fourteen static shape cards and versioned application assets.');
}
