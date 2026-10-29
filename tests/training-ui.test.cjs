'use strict';

// Exercise the real component's event handlers, storage, and clock without a
// browser dependency. This intentionally small DOM adapter implements only the
// HTML/selectors used by training.js; visual/layout checks remain browser QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const decode = value => String(value).replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]));
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

class Element {
  constructor(tag = 'div', attributes = {}) {
    this.tagName = tag.toUpperCase(); this.attributes = attributes; this.children = [];
    this.listeners = new Map(); this.style = {}; this._text = ''; this._value = null;
    this.hidden = Object.hasOwn(attributes, 'hidden'); this.disabled = Object.hasOwn(attributes, 'disabled');
    this.readOnly = Object.hasOwn(attributes, 'readonly'); this.checked = Object.hasOwn(attributes, 'checked');
    this.open = Object.hasOwn(attributes, 'open');
    this.dataset = Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    this.classList = { toggle: (name, force) => {
      const classes = new Set((this.attributes.class || '').split(/\s+/).filter(Boolean));
      if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name);
      this.attributes.class = [...classes].join(' ');
    } };
  }
  set innerHTML(html) {
    this.children = []; this._text = ''; this._html = html;
    const stack = [this];
    for (const token of html.match(/<!--[^]*?-->|<[^>]*>|[^<]+/g) || []) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<')) {
        const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
        const attrs = {};
        const tail = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
        for (const match of tail.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[match[1]] = decode(match[2] ?? match[3] ?? match[4] ?? '');
        const child = new Element(tag, attrs); stack.at(-1).children.push(child);
        if (!voidTags.has(tag) && !/\/>$/.test(token)) stack.push(child);
      } else stack.at(-1)._text += decode(token);
    }
  }
  get innerHTML() { return this._html || ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set value(value) { this._value = String(value); }
  get value() {
    if (this._value !== null) return this._value;
    if (this.tagName === 'TEXTAREA') return this.textContent;
    if (this.tagName === 'SELECT') {
      const options = this.querySelectorAll('option');
      return (options.find(option => Object.hasOwn(option.attributes, 'selected')) || options[0])?.value || '';
    }
    return this.attributes.value || '';
  }
  matches(selector) {
    if (selector.startsWith('#')) return this.attributes.id === selector.slice(1);
    if (selector.startsWith('.')) return (this.attributes.class || '').split(/\s+/).includes(selector.slice(1));
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute) return Object.hasOwn(this.attributes, attribute[1]) && (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2]);
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    const result = [];
    for (const child of this.children) {
      if (child.matches(selector)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  dispatch(type) { for (const callback of this.listeners.get(type) || []) callback({ target: this, preventDefault() {} }); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.focused = true; }
  scrollIntoView() {}
  remove() {}
  append(child) { this.children.push(child); }
}

function harness(options = {}) {
  let now = 0, failWrites = !!options.failWrites;
  const raw = new Map(), intervals = new Map(), events = new Map(), sounds = [], downloads = [];
  const storage = {
    getItem(key) { return raw.get(key) ?? null; },
    setItem(key, value) { if (failWrites) throw new Error('QuotaExceeded'); raw.set(key, value); },
    removeItem(key) { raw.delete(key); }
  };
  class Audio {
    constructor() { this.enabled = false; this.destroyed = false; this.cues = []; sounds.push(this); }
    start(settings) { this.enabled = true; this.settings = settings; return true; }
    stop() { this.enabled = false; }
    cue(inhale) { if (this.enabled) this.cues.push(inhale); }
    complete() { this.completed = true; }
    destroy() { this.enabled = false; this.destroyed = true; }
  }
  const browser = vm.createContext({
    console, Blob, performance: { now: () => now }, localStorage: storage,
    confirm: () => true,
    document: { body: new Element('body'), createElement: tag => new Element(tag) },
    URL: { createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: () => 1, clearTimeout() {},
    setInterval(callback) { const id = intervals.size + 1; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    addEventListener(type, callback) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(callback); },
    removeEventListener(type, callback) { events.get(type)?.delete(callback); }
  });
  vm.runInContext('window = globalThis;', browser);
  for (const filename of ['shape-practice.js', 'exercises.js', 'training-store.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', filename), 'utf8'), browser, { filename });
  browser.FormExercises = { ...browser.FormExercises, ExerciseAudio: Audio };
  browser.FormGeometry = { miniIcon: () => '<svg aria-hidden="true"></svg>' };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/training.js'), 'utf8'), browser, { filename: 'training.js' });
  const host = new Element(), changes = [];
  const app = browser.FormTraining.mount({ root: host, stageId: options.stageId || 'circle', onStageChange: id => changes.push(id) });
  const q = selector => { const element = host.querySelector(selector); assert.ok(element, 'Missing UI control: ' + selector); return element; };
  function type(selector, value) { const element = q(selector); assert.equal(element.readOnly, false, 'Cannot type into a committed field'); element.value = value; element.dispatch('input'); }
  function choose(selector, value) { const element = q(selector); element.value = value; element.dispatch('change'); }
  return {
    app, host, q, type, choose, sounds, downloads, raw, changes, intervals,
    click: selector => q(selector).click(),
    submit: () => q('[data-return-form]').dispatch('submit'),
    data: () => JSON.parse(storage.getItem(browser.FormTrainingStore.STORAGE_KEY)),
    advance(seconds) { now += seconds * 1000; for (const callback of intervals.values()) callback(); },
    external(value) { raw.set(browser.FormTrainingStore.STORAGE_KEY, value); for (const callback of events.get('storage') || []) callback({ key: browser.FormTrainingStore.STORAGE_KEY }); },
    allowWrites() { failWrites = false; },
    key: browser.FormTrainingStore.STORAGE_KEY
  };
}

test('manual return keeps the exact two-back source and commits recollection before revealing it', () => {
  const page = harness({ stageId: 'square' });
  page.choose('[data-lag]', '2');
  page.type('[data-note="source"]', 'First: warmth.'); page.submit();
  page.type('[data-note="source"]', 'Second: pressure.'); page.submit();
  page.type('[data-note="source"]', 'Third: movement.');
  page.type('[data-note="recollection"]', 'I remember heat.');
  assert.equal(page.q('.training-original').hidden, true);
  assert.doesNotMatch(page.q('.training-original').textContent, /First: warmth/);
  page.submit();
  assert.equal(page.data().entries.length, 2, 'cannot keep a comparison without its source check');
  page.click('[data-reveal]');
  assert.equal(page.q('.training-original').hidden, false);
  assert.match(page.q('.training-original').textContent, /First: warmth/);
  assert.doesNotMatch(page.q('.training-original').textContent, /Second: pressure/);
  assert.equal(page.q('[data-note="source"]').readOnly, true);
  assert.equal(page.q('[data-note="recollection"]').readOnly, true);
  assert.equal(page.q('[data-lag]').disabled, true);
  page.type('[data-note="relation"]', 'The present feature differs from the original warmth.');
  page.type('[data-note="revision"]', 'The earlier word was warmth, not heat.');
  page.submit();
  const entries = page.data().entries;
  assert.equal(entries.length, 3);
  assert.equal(entries[2].referenceId, entries[0].id);
  assert.equal(entries[2].referenceSource, 'First: warmth.');
  assert.equal(entries[2].recollection, 'I remember heat.');
  assert.equal(entries[0].source, 'First: warmth.');
  assert.equal(page.app.hasDraft(), false);
});

test('changing exercise and shape preserves drafts while keeping observation streams separate', () => {
  const page = harness();
  page.type('[data-note="source"]', 'Heart draft.');
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-note="source"]').value, '');
  page.type('[data-note="source"]', 'Body draft.');
  page.app.setStage('sphere');
  assert.equal(page.q('[data-note="source"]').value, '');
  page.app.setStage('circle');
  assert.equal(page.q('[data-note="source"]').value, 'Body draft.');
  page.submit();
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-note="source"]').value, 'Heart draft.');
  assert.equal(page.host.querySelector('[data-reveal]'), null, 'a body record cannot become the heart return target');
  page.submit();
  assert.deepEqual(page.data().entries.map(entry => entry.exercise), ['body', 'heart']);
  assert.ok(page.data().entries.every(entry => entry.referenceId === null));
});

test('all fourteen shapes expose both manual applications and readiness remains reversible', () => {
  const page = harness();
  const ids = ['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'prism', 'heptagon', 'octagon', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere'];
  for (const id of ids) {
    page.app.setStage(id);
    assert.equal(page.q('[data-shape]').value, id);
    for (const exercise of ['heart', 'body']) {
      page.click('[data-exercise="' + exercise + '"]');
      assert.equal(page.q('[data-exercise="' + exercise + '"]').getAttribute('aria-pressed'), 'true');
      const check = page.q('[data-ready]'); check.checked = true; check.dispatch('change');
      assert.equal(page.data().readiness[id][exercise], true);
    }
    const check = page.q('[data-ready]'); check.checked = false; check.dispatch('change');
    assert.equal(page.data().readiness[id].body, false);
    assert.equal(page.data().readiness[id].heart, true);
  }
  assert.equal(page.data().sessions.length, 0, 'self-assessment does not manufacture a session');
  assert.equal(page.data().entries.length, 0, 'notes are optional for manual practice');
  assert.doesNotMatch(page.host.textContent, /Cedar|End mission|Commit the relation|CHALLENGE 1/);
});

test('body dimensions advance at 30 seconds, rereading does not change the clock, and pause freezes it', () => {
  const page = harness();
  page.click('[data-exercise="body"]'); page.click('[data-start]');
  assert.equal(page.q('[data-dimension]').textContent, 'Location');
  page.advance(10); page.click('[data-peek="4"]');
  assert.equal(page.q('[data-dimension]').textContent, 'Direction');
  assert.equal(page.q('[data-timer]').textContent, '14:50');
  page.advance(20);
  assert.equal(page.q('[data-dimension]').textContent, 'Quality', 'a new live step ends rereading');
  page.click('[data-pause]'); page.advance(500);
  assert.equal(page.q('[data-timer]').textContent, '14:30');
  assert.equal(page.q('[data-session-state]').textContent, 'Paused');
  page.click('[data-pause]'); page.advance(30);
  assert.equal(page.q('[data-dimension]').textContent, 'Intensity');
  page.click('[data-end]');
  assert.equal(page.data().sessions.length, 1);
  assert.equal(page.data().sessions[0].seconds, 60);
  assert.equal(page.data().sessions[0].completed, false);
  assert.match(page.q('[data-record]').textContent, /1 recorded practice period/);
  page.app.pause(); page.advance(100);
  assert.equal(page.data().sessions.length, 1, 'lifecycle pauses cannot duplicate a session record');
});

test('heart completion records once, time never awards readiness, and all audio stops on leave', () => {
  const page = harness();
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  page.choose('[data-pacing]', 'paced'); page.click('[data-start]');
  page.advance(298);
  assert.match(page.q('[data-step-label]').textContent, /Step 2/);
  page.click('[data-test-sound]');
  assert.equal(page.sounds[0].enabled, true, 'test tone does not interrupt the exercise sound');
  assert.equal(page.sounds[1].enabled, true);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath]').textContent, 'Own rhythm');
  page.advance(602);
  assert.equal(page.q('[data-session-state]').textContent, 'Complete');
  assert.equal(page.data().sessions.length, 1);
  assert.equal(page.data().sessions[0].completed, true);
  assert.deepEqual(page.data().readiness, {});
  page.advance(600);
  assert.equal(page.data().sessions.length, 1);
  page.app.pause();
  assert.ok(page.sounds.every(audio => !audio.enabled));
  page.app.destroy();
  assert.ok(page.sounds.every(audio => audio.destroyed));
  assert.equal(page.intervals.size, 0);
});

test('heart practice starts with paced breathing and audible phase bells without enabling ambient sound', () => {
  const page = harness();
  assert.equal(page.q('[data-pacing]').value, 'paced');
  assert.equal(page.q('[data-sound]').checked, false);
  assert.equal(page.q('[data-heart-bell]').hidden, false);
  assert.match(page.q('[data-heart-bell]').textContent, /Bell: on/i);
  assert.equal(page.q('.training-sound').querySelector('[data-heart-bell]'), null, 'the bell control is available outside collapsed sound settings');
  assert.ok(page.sounds.every(audio => !audio.enabled), 'rendering a page must not start audio');
  page.click('[data-start]');
  assert.equal(page.sounds[0].enabled, true);
  assert.equal(page.sounds[0].settings.frequency, 0, 'the default starts bowls only, with no ambient pulse');
  assert.deepEqual(page.sounds[0].cues, [true]);
  assert.equal(page.q('[data-breath]').textContent, 'Inhale');
  page.advance(4.8);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.advance(0.2);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  assert.equal(page.q('[data-breath]').textContent, 'Exhale');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
});

test('muting and unmuting heart bells skips missed cues without inventing a mid-phase ring', () => {
  const page = harness();
  page.click('[data-start]'); page.advance(2);
  page.click('[data-heart-bell]');
  assert.match(page.q('[data-heart-bell]').textContent, /Bell: off/i);
  assert.equal(page.sounds[0].enabled, false, 'muting bells with ambient off leaves the exercise silent');
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true], 'the exhale cue at five seconds was muted');
  page.click('[data-heart-bell]');
  assert.equal(page.sounds[0].enabled, true);
  assert.deepEqual(page.sounds[0].cues, [true], 'unmuting at seven seconds is not a new breath phase');
  page.advance(2.8);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.advance(0.2);
  assert.deepEqual(page.sounds[0].cues, [true, true], 'the next regular inhale cue remains audible');
  page.click('[data-pause]');
  page.click('[data-heart-bell]'); page.click('[data-heart-bell]');
  assert.equal(page.sounds[0].enabled, false, 'changing the bell preference while paused must not restart audio');
});

test('ambient controls and pause/resume remain independent of the heart bell cadence', () => {
  const page = harness();
  page.click('[data-start]'); page.advance(2);
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  assert.equal(page.sounds[0].settings.frequency, 10);
  assert.deepEqual(page.sounds[0].cues, [true], 'enabling ambient sound adds no phase cue');
  page.click('[data-pause]'); page.advance(100);
  assert.equal(page.sounds[0].enabled, false);
  page.click('[data-pause]');
  assert.equal(page.sounds[0].enabled, true);
  assert.equal(page.sounds[0].settings.frequency, 10);
  assert.deepEqual(page.sounds[0].cues, [true], 'resuming two seconds into inhale must not repeat its bell');
  page.advance(3);
  assert.deepEqual(page.sounds[0].cues, [true, false]);
  sound.checked = false; sound.dispatch('change');
  assert.equal(page.sounds[0].enabled, true, 'turning ambient off does not mute the independent heart bell');
  assert.equal(page.sounds[0].settings.frequency, 0);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
  sound.checked = true; sound.dispatch('change');
  page.click('[data-heart-bell]');
  assert.equal(page.sounds[0].enabled, true, 'muting the heart bell does not stop requested ambient audio');
  assert.equal(page.sounds[0].settings.frequency, 10);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true, false, true]);
});

test('using one’s own rhythm suppresses heart breathing bells until a later paced phase boundary', () => {
  const page = harness();
  page.click('[data-start]'); page.advance(2);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath]').textContent, 'Own rhythm');
  assert.equal(page.sounds[0].enabled, false);
  page.advance(5);
  assert.deepEqual(page.sounds[0].cues, [true]);
  page.click('[data-live-pace]');
  assert.equal(page.q('[data-breath]').textContent, 'Exhale');
  assert.equal(page.sounds[0].enabled, true);
  assert.deepEqual(page.sounds[0].cues, [true], 'switching to a guide partway through exhale adds no cue');
  page.advance(3);
  assert.deepEqual(page.sounds[0].cues, [true, true]);
});

test('body practice keeps its natural silent default and each exercise remembers its own pacing choice', () => {
  const page = harness();
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-pacing]').value, 'natural');
  assert.equal(page.q('[data-sound]').checked, false);
  const bell = page.host.querySelector('[data-heart-bell]');
  assert.ok(!bell || bell.hidden, 'body mapping does not display the heart-only bell control');
  page.click('[data-start]'); page.advance(30);
  assert.equal(page.sounds[0].enabled, false);
  assert.deepEqual(page.sounds[0].cues, []);
  page.click('[data-end]'); page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pacing]').value, 'paced');
  page.choose('[data-pacing]', 'natural');
  page.click('[data-exercise="body"]');
  assert.equal(page.q('[data-pacing]').value, 'natural');
  page.choose('[data-pacing]', 'paced');
  page.click('[data-exercise="heart"]');
  assert.equal(page.q('[data-pacing]').value, 'natural', 'the chosen heart rhythm survives switching away');
  page.choose('[data-pacing]', 'paced');
  page.click('[data-other]');
  assert.equal(page.q('[data-pacing]').value, 'paced', 'the readiness shortcut also restores the body’s own choice');
});

test('body bowl cues follow the source dimension pattern when the seven-step sequence repeats', () => {
  const page = harness();
  page.click('[data-exercise="body"]');
  const sound = page.q('[data-sound]'); sound.checked = true; sound.dispatch('change');
  page.click('[data-start]');
  for (let step = 0; step < 7; step++) page.advance(30);
  assert.equal(page.q('[data-dimension]').textContent, 'Location');
  assert.deepEqual(page.sounds[0].cues, [true, false, true, false, true, false, true, true]);
});

test('quota failures retain private work for export and keep the unload guard active', () => {
  const page = harness({ failWrites: true });
  page.type('[data-note="source"]', 'Private unsaved observation.'); page.submit();
  assert.equal(page.data(), null);
  assert.equal(page.q('[data-note="source"]').value, '', 'accepted work moved into the in-tab record');
  assert.equal(page.app.hasDraft(), true, 'in-tab-only accepted work still needs protection on close');
  assert.match(page.q('[data-record]').textContent, /Private unsaved observation/);
  assert.match(page.q('[data-storage]').textContent, /tab only/);
  page.allowWrites();
  const ready = page.q('[data-ready]'); ready.checked = true; ready.dispatch('change');
  assert.equal(page.data().entries[0].source, 'Private unsaved observation.');
  assert.equal(page.app.hasDraft(), false);
});

test('another tab cannot silently replace this tab’s source stream or private work', () => {
  const page = harness();
  page.type('[data-note="source"]', 'Keep this tab’s source.'); page.submit();
  const original = page.data();
  page.type('[data-note="source"]', 'Unfinished present observation.');
  const changed = { schemaVersion: 1, entries: [], sessions: [], readiness: { sphere: { heart: true, body: true } } };
  page.external(JSON.stringify(changed));
  assert.match(page.q('[data-record]').textContent, /Keep this tab’s source/);
  assert.equal(page.q('[data-note="source"]').value, 'Unfinished present observation.');
  assert.deepEqual(page.data(), changed, 'stale local work must not overwrite the other tab');
  page.click('[data-reveal]');
  assert.match(page.q('.training-original').textContent, /Keep this tab’s source/);
  page.submit();
  assert.equal(page.app.hasDraft(), true);
  assert.deepEqual(page.data(), changed);
  assert.equal(original.entries.length, 1);
});

test('a cross-tab replacement guards already-committed local records even when no field is dirty', () => {
  const page = harness();
  page.type('[data-note="source"]', 'This saved source still needs preserving.'); page.submit();
  assert.equal(page.app.hasDraft(), false);
  page.external(JSON.stringify({ schemaVersion: 1, entries: [], sessions: [], readiness: {} }));
  assert.equal(page.q('[data-note="source"]').value, '');
  assert.match(page.q('[data-record]').textContent, /This saved source still needs preserving/);
  assert.equal(page.app.hasDraft(), true, 'the retained local version must be guarded until saved or deliberately reloaded');
});
