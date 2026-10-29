import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { STAGES } = require('../src/shape-practice.js');

export function prepareHomepage() {
  // Render navigation before JavaScript starts. A delayed or failed script
  // must never leave the opening screen without its shape cards.
  delete require.cache[require.resolve('../src/geometry.js')];
  const geometry = require('../src/geometry.js');
  const cards = STAGES.map((stage, index) =>
    `          <a class="stage-tile${index === 0 ? ' selected' : ''}" href="#practice/${stage.id}" data-stage="${stage.id}" aria-label="${stage.name} · Explore"><span class="stage-number">${String(index + 1).padStart(2, '0')}</span><span class="stage-icon" aria-hidden="true">${geometry.miniIcon(stage.id, 65)}</span><span class="stage-name">${stage.name}</span><span class="stage-status">Explore</span></a>`
  ).join('\n');
  const path = resolve(root, 'index.html');
  let html = readFileSync(path, 'utf8');
  const navigation = /(<nav\b[^>]*\bid="stage-path"[^>]*>)[\s\S]*?(<\/nav>)/;
  if (!navigation.test(html)) throw new Error('The homepage shape navigation is missing.');
  html = html.replace(navigation, (_, open, close) => `${open}\n${cards}\n        ${close}`);

  // Changed files get new request URLs, avoiding old icons/JS/CSS paired with new
  // markup after deployment. Unchanged files keep their cached versions.
  html = html.replace(/(<(?:link|script)\b[^>]*\b(?:href|src)=")([^"?#]+\.(?:css|js|svg))(?:\?[^"#]*)?("[^>]*>)/g,
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
