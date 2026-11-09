'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { STAGES } = require('../src/shape-practice.js');
const checks = import('../scripts/check.mjs');
const root = path.join(__dirname, '..');
const source = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function songPage({ hash, supportsObserver }) {
  const html = source();
  const template = html.match(/<template id="site-song-source">([\s\S]*?)<\/template>/);
  assert.match(template[1], /<iframe\b[^>]+data-online-player="suno"/);
  assert.doesNotMatch(html.replace(template[0], ''), /<iframe\b[^>]+data-online-player="suno"/);

  const panel = new EventTarget(), page = new EventTarget();
  panel.removeAttribute = () => {};
  const content = { querySelector: () => ({}) };
  let mounts = 0, onVisibility;
  const slot = {
    content, isConnected:true, parentElement:panel,
    replaceWith(fragment) { assert.equal(fragment, content); this.isConnected = false; mounts++; }
  };
  class Observer {
    constructor(callback) { onVisibility = callback; }
    observe(target) { assert.equal(target, panel); }
    disconnect() {}
  }
  if (supportsObserver) page.IntersectionObserver = Observer;
  const loader = html.match(/<script id="site-song-loader">([\s\S]*?)<\/script>/)[1];
  require('node:vm').runInNewContext(loader, {
    document:{getElementById:() => slot}, window:page, location:{hash}, IntersectionObserver:page.IntersectionObserver
  });
  return {
    panel, page,
    get mounts() { return mounts; },
    visibility(isIntersecting, bottom) {
      assert.equal(typeof onVisibility, 'function', 'observe visibility before waiting for the page load event');
      onVisibility([{isIntersecting, boundingClientRect:{bottom}}]);
    }
  };
}

test('a shape deep link loads the song on first visibility without a hash change', () => {
  const song = songPage({hash:'#practice/icosahedron/wave', supportsObserver:true});
  song.visibility(false, 1400);
  assert.equal(song.mounts, 0, 'an offscreen player may wait');
  song.visibility(true, 350);
  assert.equal(song.mounts, 1, 'a visible player needs no prior scroll or interaction');
  song.visibility(false, -150);
  song.visibility(true, 350);
  song.page.dispatchEvent(new Event('hashchange'));
  song.panel.dispatchEvent(new Event('focusin'));
  assert.equal(song.mounts, 1, 'the same player survives further viewport and navigation events');
});

test('the song is available on a shape deep link without IntersectionObserver', () => {
  const song = songPage({hash:'#practice/icosahedron/wave', supportsObserver:false});
  assert.equal(song.mounts, 1);
});

// Inspect the committed HTML without running its application or preparer:
// the shape destinations must be usable before the practice software arrives.
test('homepage ships every curriculum shape as a native practice link with its drawing', async () => {
  const { attributes } = await checks;
  const html = source();
  const gallery = html.match(/(<section\b[^>]*\bid="stage-path"[^>]*>)([\s\S]*?)<\/section\s*>/i);
  assert.ok(gallery, 'the shape gallery is present in the HTML');
  const cards = [...gallery[2].matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a\s*>/gi)];
  assert.equal(cards.length, 14, 'all fourteen shapes render before JavaScript runs');
  assert.doesNotMatch(gallery[2], /<button\b|\bon(?:click|keydown)\s*=/i);
  for (const [index, card] of cards.entries()) {
    const stage = STAGES[index];
    const attrs = attributes(card[1]);
    assert.equal(attrs['data-stage'], stage.id);
    assert.equal(attrs.href, '#practice/' + stage.id);
    assert.equal(attrs['aria-label'], stage.name);
    for (const name of ['tabindex', 'aria-controls']) {
      assert.equal(Object.hasOwn(attrs, name), false, stage.id + ' has no ' + name);
    }
    assert.ok((attrs.class || '').split(/\s+/).includes('stage-tile'));
    assert.ok(card[2].includes(stage.name), stage.id + ' has its visible name');
    const drawing = card[2].match(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/i);
    assert.ok(drawing, stage.id + ' includes an SVG, not a script-created placeholder');
    assert.match(drawing[0], /<(?:path|circle|ellipse|line|polyline|polygon|rect)\b/i,
      stage.id + ' contains actual drawing geometry');
  }
});

test('the introductory symbol retains its original noninteractive artwork', async () => {
  const { attributes } = await checks;
  const home = [...source().matchAll(/(<section\b[^>]*>)([\s\S]*?)<\/section\s*>/gi)]
    .find(match => attributes(match[1]).id === 'view-journey');
  assert.ok(home, 'the homepage section is present');
  assert.doesNotMatch(home[2].split('<section id="stage-path"')[0], /<(?:a|button)\b|\brole\s*=\s*["'](?:button|link)["']/i);
  assert.doesNotMatch(home[2], /\bonclick\s*=/i);
});

test('practice is shipped hidden below the complete introductory writing', async () => {
  const { attributes } = await checks;
  const html = source();
  const intro = html.match(/<div class="creation-intro">[\s\S]*?<\/div>/);
  const practice = [...html.matchAll(/<section\b[^>]*>/gi)].find(match => attributes(match[0]).id === 'view-practice');
  assert.ok(intro && practice, 'the introduction and inline practice both exist');
  assert.ok(practice.index > intro.index + intro[0].length, 'practice follows the complete introductory writing');
  assert.ok(Object.hasOwn(attributes(practice[0]), 'hidden'), 'the metronome stays hidden even before app startup');
  for (const id of ['archive-panel','philosophy-panel']) {
    const panel = [...html.matchAll(/<details\b[^>]*>/gi)].find(match => attributes(match[0]).id === id);
    assert.ok(panel && panel.index > practice.index, id + ' remains accessible as inline details below the practice');
    assert.equal(Object.hasOwn(attributes(panel[0]), 'open'), false, id + ' starts collapsed');
  }
});

// A fresh HTML response must request fresh assets after a release; otherwise
// old app.js can still look up controls that the new HTML has removed.
test('every linked script and stylesheet uses the hash of its current file', async () => {
  const { attributes, localAsset } = await checks;
  const resources = [];
  for (const match of source().matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (/^<script\b/i.test(match[0]) && attrs.src) resources.push({ kind: 'script', url: attrs.src });
    if (/^<link\b/i.test(match[0]) && (attrs.rel || '').split(/\s+/).includes('stylesheet')) {
      resources.push({ kind: 'stylesheet', url: attrs.href });
    }
  }
  assert.ok(resources.some(resource => resource.kind === 'script'));
  assert.ok(resources.some(resource => resource.kind === 'stylesheet'));
  for (const resource of resources) {
    const url = new URL(resource.url, 'https://homepage.invalid/');
    const versions = url.searchParams.getAll('v');
    assert.equal(versions.length, 1, resource.url + ' has one cache version');
    assert.match(versions[0], /^[a-f0-9]{12}$/, resource.url + ' uses a content hash');
    const expected = createHash('sha256').update(fs.readFileSync(localAsset(resource.url, root, root))).digest('hex').slice(0, 12);
    assert.equal(versions[0], expected, resource.url + ' must be refreshed after its asset changes');
  }
});

test('startup keeps the practice engine and worked-model atlas off the homepage request path', () => {
  const html = source();
  const outsideTemplates = html.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '');
  assert.doesNotMatch(outsideTemplates, /<script\b[^>]*\bsrc=/i);
  const group = id => html.match(new RegExp('<template id="' + id + '"[^>]*>([\\s\\S]*?)</template>'))[1];
  assert.match(group('practice-scripts'), /src\/training\.js/);
  assert.doesNotMatch(group('practice-scripts'), /relational-models|model-view/);
  assert.match(group('reference-scripts'), /relational-models[\s\S]*model-view/);
  const preload = group('hero-preload').match(/href="([^"]+)"/)[1];
  assert.ok(html.includes('src="' + preload + '"'), 'the preloaded engraving matches the version displayed');
});
