import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { STAGES } = require('../src/shape-practice.js');

// Keep a cached page paired with the versions of its scripts and styles it uses.
function versionAssets(html, directory) {
  return html.replace(/(<(?:link|script|img)\b[^>]*\b(?:href|src)=")([^"?#]+\.(?:css|js|svg|webp))(?:\?[^"#]*)?("[^>]*>)/g,
    (_, open, asset, close) => {
      const version = createHash('sha256').update(readFileSync(resolve(directory, asset))).digest('hex').slice(0, 12);
      return `${open}${asset}?v=${version}${close}`;
    });
}

// Keep the small landing list identical to the full gazetteer used after a map pick.
function openingPlaces(directory){
  const runtime={window:{}};
  runInNewContext(readFileSync(resolve(directory,'navigation.js'),'utf8'),runtime);
  const nav=runtime.window.EarthNavigation;
  const pins=nav.featured().map(place=>({place,featured:true}));
  pins.push({place:{name:'Stone Town',lat:-6.1622,lon:39.1922},featured:false});
  return JSON.stringify(pins.map(pin=>({...pin,story:nav.scenario(pin.place)}))).replaceAll('<','\\u003c');
}

export function prepareHomepage() {
  // Each shape is already drawn and linked while the practice software loads.
  delete require.cache[require.resolve('../src/geometry.js')];
  const geometry = require('../src/geometry.js');
  const cards = STAGES.map((stage, index) =>
    `          <a class="stage-tile" data-stage="${stage.id}" href="#practice/${stage.id}" aria-label="${stage.name}"><span class="stage-number">${String(index + 1).padStart(2, '0')}</span><span class="stage-icon" aria-hidden="true">${geometry.miniIcon(stage.id, 65).replace(/form-geometry-(\d+)-/g, 'gallery-geometry-$1-')}</span><span class="stage-name">${stage.name}</span></a>`
  ).join('\n');
  const path = resolve(root, 'index.html');
  let html = readFileSync(path, 'utf8');
  const gallery = /(<section\b[^>]*\bid="stage-path"[^>]*>)[\s\S]*?(<\/section>)/;
  if (!gallery.test(html)) throw new Error('The homepage shape gallery is missing.');
  html = html.replace(gallery, (_, open, close) => `${open}\n${cards}\n        ${close}`);

  writeFileSync(path, versionAssets(html, root));

  const gameDirectory = resolve(root, 'common-earth');
  const gameEntry = resolve(gameDirectory, 'index.html');
  // The renderer has its own script hash. Keep unchanged geography cached across renderer releases.
  const atlasHash = createHash('sha256');
  const cellFiles = readdirSync(resolve(gameDirectory, 'regions')).filter(name => name.endsWith('.bin')).sort();
  for (const asset of ['regions.js', 'earth-cells-v1.bin', 'earth-chart.webp', 'earth-index.png', ...cellFiles.map(name => 'regions/' + name)].sort()) {
    atlasHash.update(asset).update(readFileSync(resolve(gameDirectory, asset)));
  }
  const game = readFileSync(gameEntry, 'utf8').replace(/data-atlas-version="[^"]*"/, 'data-atlas-version="' + atlasHash.digest('hex').slice(0, 12) + '"');
  const withPlaces=game.replace(/(<script id="earth-opening-places"[^>]*>)[\s\S]*?(<\/script>)/,
    (_,open,close)=>open+openingPlaces(gameDirectory)+close);
  writeFileSync(gameEntry, versionAssets(withPlaces, gameDirectory));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareHomepage();
  console.log('Prepared fourteen static shape cards and versioned application assets.');
}
