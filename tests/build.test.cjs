'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { tmpdir } = require('node:os');
const modules = Promise.all([import('../scripts/build.mjs'), import('../scripts/check.mjs')]);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/c1UAAAAASUVORK5CYII=', 'base64');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle id="ring" cx="5" cy="5" r="4"/></svg>';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'philosophy-build-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => { const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); return file; };
  write('icon.svg', svg);
  write('assets/paper grain.png', png);
  write('assets/diagram.svg', svg);
  write('styles/theme.css', '.paper { background-image: url("../assets/paper%20grain.png?v=3"); }');
  write('scripts/first.js', 'globalThis.order = ["first"]; const markup = \'<img src="not-a-real-resource.png">\';');
  write('scripts/last.js', 'globalThis.order.push("last"); const closing = "</script>";');
  const html = '<!doctype html><html><head><link rel="stylesheet" href="styles/theme.css"><link rel="icon" href="icon.svg" type="image/svg+xml"></head><body><img class="hero" src="assets/paper%20grain.png" alt="A paper texture"><script src="scripts/first.js" defer></script><script src="scripts/last.js" defer></script></body></html>';
  return { root, write, html, options: { fromDirectory: root, rootDirectory: root } };
}

test('offline build embeds raster images and stylesheet-relative assets without changing script order', async t => {
  const [{ buildOfflineHtml }, { assertDocumentResources, scriptBlocks }] = await modules;
  const f = fixture(t);
  const { html, stats } = buildOfflineHtml(f.html, f.options);
  assert.equal(stats.images, 1);
  assert.equal(stats.stylesheets, 1);
  assert.match(html, /<img class="hero" src="data:image\/png;base64,[^"]+" alt="A paper texture">/);
  assert.match(html, /background-image: url\("data:image\/png;base64,/);
  assert.equal(assertDocumentResources(html, { selfContained: true }), 0);
  const scripts = scriptBlocks(html);
  assert.deepEqual(scripts.map(script => script.attributes['data-form-module']), ['scripts/first.js', 'scripts/last.js']);
  assert.match(scripts[0].body, /<img src="not-a-real-resource\.png">/, 'tag-shaped JavaScript strings remain untouched');
  assert.match(scripts[1].body, /<\\\/script>/, 'closing tags remain escaped inside JavaScript');
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
});

test('inline styles, style attributes, SVG fragments and entity-encoded image names are embedded', async t => {
  const [{ buildOfflineHtml }, { assertDocumentResources }] = await modules;
  const f = fixture(t);
  f.write('assets/line&ring.svg', svg);
  const source = f.html.replace('</head>', '<style>.diagram { filter: url("assets/diagram.svg#ring"); }</style></head>')
    .replace('<body>', '<body style="background-image:url(&quot;assets/paper%20grain.png&quot;)">')
    .replace('src="assets/paper%20grain.png"', 'src="assets/line&amp;ring.svg"');
  const { html } = buildOfflineHtml(source, f.options);
  assert.match(html, /filter: url\("data:image\/svg\+xml;base64,[^"]+#ring"\)/);
  assert.match(html, /style="background-image:url\(&quot;data:image\/png;base64,/);
  assert.match(html, /<img class="hero" src="data:image\/svg\+xml;base64,/);
  assert.equal(assertDocumentResources(html, { selfContained: true }), 0);
});

test('source audit accepts local resources but final audit rejects every remaining file dependency', async t => {
  const [, { assertDocumentResources, assertOfflineCss }] = await modules;
  const f = fixture(t);
  assert.ok(assertDocumentResources(f.html, f.options) >= 4);
  assert.throws(() => assertDocumentResources(f.html, { selfContained: true }), /external file/);
  const css = '.a{background:url("../assets/paper%20grain.png")}';
  assert.doesNotThrow(() => assertOfflineCss(css, 'theme.css', { selfContained: false, fromDirectory: join(f.root, 'styles'), rootDirectory: f.root }));
  assert.throws(() => assertOfflineCss(css, 'theme.css'), /non-embedded CSS resource/);
});

test('missing resources, external URLs, escaping paths and escaping symlinks fail closed', async t => {
  const [{ embedCss }, { localAsset, assetDataUrl }] = await modules;
  const f = fixture(t);
  for (const path of ['missing.png', 'https://example.com/a.png', '//example.com/a.png', '../escape.png', '%2e%2e/escape.png', 'assets/%5c..%5csecret.png']) {
    assert.throws(() => assetDataUrl(path, f.root, f.root), /Missing|External|escapes|Invalid/);
  }
  assert.throws(() => embedCss('.a{background:url(https://example.com/a.png)}', 'external.css', f.root, f.root), /External/);
  assert.throws(() => embedCss('.a{background:url(' + String.fromCharCode(92) + '68 ttps://example.com/a.png)}', 'escaped.css', f.root, f.root), /External/);
  const outside = mkdtempSync(join(tmpdir(), 'philosophy-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, 'outside.png'), png);
  symlinkSync(join(outside, 'outside.png'), join(f.root, 'assets', 'symlink.png'));
  assert.throws(() => localAsset('assets/symlink.png', f.root, f.root), /symlink escapes/);
});

test('SVG images must be inert and self-contained before being encoded', async t => {
  const [, { assetDataUrl }] = await modules;
  const f = fixture(t);
  f.write('assets/active.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  f.write('assets/remote.svg', '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>');
  f.write('assets/local.svg', '<svg xmlns="http://www.w3.org/2000/svg"><image href="diagram.svg"/></svg>');
  f.write('assets/event.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
  f.write('assets/foreign.svg', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>');
  for (const name of ['active', 'remote', 'local', 'event', 'foreign']) assert.throws(() => assetDataUrl(`assets/${name}.svg`, f.root, f.root), /inert|external file/);
  assert.match(assetDataUrl('assets/diagram.svg', f.root, f.root), /^data:image\/svg\+xml;base64,/);
});

test('unsupported loading mechanisms and executable asset substitutions are rejected', async t => {
  const [{ buildOfflineHtml, embedCss }, { assetDataUrl }] = await modules;
  const f = fixture(t);
  assert.throws(() => buildOfflineHtml(f.html.replace('class="hero"', 'srcset="assets/paper%20grain.png 1x"'), f.options), /srcset/);
  assert.throws(() => embedCss('@import "theme.css";', 'import.css', f.root, f.root), /@import/);
  assert.throws(() => embedCss('.a{background:image-set("assets/paper.png" 1x)}', 'set.css', f.root, f.root), /image-set/);
  assert.throws(() => assetDataUrl('scripts/first.js', f.root, f.root), /Unsupported embedded asset type/);
  assert.throws(() => buildOfflineHtml(f.html.replace('defer', 'async'), f.options), /Async scripts/);
});

test('embedded data and local fragments survive while comment-only URLs are not read', async t => {
  const [{ embedCss }] = await modules;
  const f = fixture(t);
  const css = '/* url(missing.png) */ .a{filter:url(#ink);background:url("data:image/png;base64,' + png.toString('base64') + '")}';
  assert.equal(embedCss(css, 'self-contained.css', f.root, f.root), css);
});


test('the optional Suno player is allowed online and removed from the offline edition', async t => {
  const [{ buildOfflineHtml }, { assertDocumentResources, SUNO_EMBED_URL }] = await modules;
  const f = fixture(t);
  const player = `<iframe data-online-player="suno" src="${SUNO_EMBED_URL}" sandbox="allow-scripts allow-same-origin" title="Play Philosophy of Intelligence"></iframe>`;
  const source = f.html.replace('<body>', '<body>' + player)
    .replace('</body>', `<script>const examplePlayer = '${player}';</script></body>`);
  assert.doesNotThrow(() => assertDocumentResources(source, { ...f.options, allowOnlinePlayer: true }));
  assert.throws(() => assertDocumentResources(source, f.options), /External asset/);
  assert.throws(() => assertDocumentResources(player, { selfContained: true, allowOnlinePlayer: true }), /external file/);
  const { html } = buildOfflineHtml(source, f.options);
  assert.doesNotMatch(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), /<iframe\b/);
  assert.ok(html.includes(`const examplePlayer = '${player}';`), 'iframe-shaped JavaScript strings remain unchanged');
  assert.ok(html.includes('Music is available on the website.'));
  assert.doesNotMatch(html, /<a\b[^>]*href="https:\/\/suno\.com/);
  assert.equal(assertDocumentResources(html, { selfContained: true }), 0);
  for (const sandbox of ['', 'allow-scripts allow-same-origin allow-popups', 'allow-scripts allow-same-origin allow-top-navigation']) {
    assert.throws(() => assertDocumentResources(player.replace('sandbox="allow-scripts allow-same-origin"', `sandbox="${sandbox}"`), { ...f.options, allowOnlinePlayer: true }), /sandbox/);
  }
  for (const invalid of [
    player.replace(SUNO_EMBED_URL, 'https://example.com/player'),
    player.replace(SUNO_EMBED_URL, SUNO_EMBED_URL + '?autoplay=1'),
    player.replace('data-online-player="suno"', ''),
    player.replaceAll('iframe', 'script')
  ]) {
    assert.throws(() => assertDocumentResources(invalid, { ...f.options, allowOnlinePlayer: true }), /External asset/);
  }
});
