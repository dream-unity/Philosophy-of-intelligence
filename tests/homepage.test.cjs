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

// Inspect the committed HTML without running its application or preparer:
// a failed script must not leave the homepage's only navigation empty.
test('homepage ships every curriculum shape as a usable link with its drawing', async () => {
  const { attributes } = await checks;
  const html = source();
  const nav = [...html.matchAll(/(<nav\b[^>]*>)([\s\S]*?)<\/nav\s*>/gi)]
    .find(match => attributes(match[1]).id === 'stage-path');
  assert.ok(nav, 'the shape navigation is present in the HTML');
  const cards = [...nav[2].matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a\s*>/gi)];
  assert.equal(cards.length, 14, 'all fourteen shapes render before JavaScript runs');
  assert.deepEqual(cards.map(card => attributes(card[1]).href), STAGES.map(stage => '#practice/' + stage.id));
  for (const [index, card] of cards.entries()) {
    const stage = STAGES[index];
    const attrs = attributes(card[1]);
    assert.equal(attrs['data-stage'], stage.id);
    assert.ok((attrs.class || '').split(/\s+/).includes('stage-tile'));
    assert.ok(card[2].includes(stage.name), stage.id + ' has its visible name');
    const drawing = card[2].match(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/i);
    assert.ok(drawing, stage.id + ' includes an SVG, not a script-created placeholder');
    assert.match(drawing[0], /<(?:path|circle|ellipse|line|polyline|polygon|rect)\b/i,
      stage.id + ' contains actual drawing geometry');
  }
});

test('the homepage symbol has no controls and only shape cards are links', async () => {
  const { attributes } = await checks;
  const home = [...source().matchAll(/(<section\b[^>]*>)([\s\S]*?)<\/section\s*>/gi)]
    .find(match => attributes(match[1]).id === 'view-journey');
  assert.ok(home, 'the homepage section is present');
  const anchors = [...home[2].matchAll(/<a\b[^>]*>/gi)].map(match => attributes(match[0]));
  assert.equal(anchors.length, 14);
  assert.ok(anchors.every(attrs => (attrs.class || '').split(/\s+/).includes('stage-tile')),
    'no symbol or extra homepage anchors remain');
  assert.doesNotMatch(home[2], /<button\b|\brole\s*=\s*["']button["']/i);
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
