import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep cached ES modules from two deployments from sharing an incompatible game
// state or renderer. Import maps also cover nested and dynamic relative imports.
const folder = fileURLToPath(new URL('../zelda-and-the-princess-zombie/', import.meta.url));
const entry = resolve(folder, 'index.html');

export function versionGamePage() {
  const version = (name) => {
    const hash = createHash('sha256')
      .update(readFileSync(resolve(folder, name)))
      .digest('hex')
      .slice(0, 12);
    return name + '?v=' + hash;
  };
  const modules = readdirSync(folder)
    .filter((name) => name.endsWith('.mjs'))
    .sort();
  const imports = Object.fromEntries(modules.map((name) => ['./' + name, './' + version(name)]));
  const map = JSON.stringify({ imports }, null, 2)
    .split('\n')
    .map((line) => '      ' + line)
    .join('\n');
  const original = readFileSync(entry, 'utf8');
  const html = original
    .replace(/(<script type="importmap">)[\s\S]*?(<\/script>)/, '$1\n' + map + '\n    $2')
    .replace(/href="game\.css(?:\?[^"]*)?"/, 'href="' + version('game.css') + '"')
    .replace(/src="game\.mjs(?:\?[^"]*)?"/, 'src="' + version('game.mjs') + '"');
  return { html, original };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { html, original } = versionGamePage();
  if (html !== original) writeFileSync(entry, html);
}
