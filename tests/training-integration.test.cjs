'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { STAGES } = require('../src/shape-practice.js');
const Progress = require('../src/progress.js');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const appSource = read('src/app.js');

// Run the whole app adapter with real archive/relationship-atlas/geometry modules.
// The training controller is a contract double: its exercises are covered
// separately, while these tests check mounting, routing and record isolation.
function harness({ hash = '#journey', archive = null, missingModule = null } = {}) {
  const elements = new Map(), events = new Map(), documentEvents = new Map();
  const calls = { mounts: [], stages: [], pauses: 0, drafts: false, writes: [], scrolls: [], focuses: [] };
  const records = new Map([['unrelated-record', 'keep me']]);
  if (archive !== null) records.set(Progress.STORAGE_KEY, archive);
  const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

  function matches(node, selector) {
    if (selector.includes(',')) return selector.split(',').some(part => matches(node, part));
    const parts = selector.trim().split(/\s+/);
    const leaf = parts.pop();
    const attributes = [...leaf.matchAll(/\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]/g)];
    for (const [, name, value] of attributes) {
      if (!(name in node.attrs) || value !== undefined && node.attrs[name] !== value) return false;
    }
    const plain = leaf.replace(/\[[^\]]+\]/g, '');
    const id = plain.match(/#([\w-]+)/)?.[1];
    if (id && node.id !== id) return false;
    for (const [, name] of plain.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(name)) return false;
    const tag = plain.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && node.tagName !== tag.toLowerCase()) return false;
    if (parts.length) {
      let parent = node.parentElement;
      while (parent && !matches(parent, parts.join(' '))) parent = parent.parentElement;
      if (!parent) return false;
    }
    return true;
  }
  function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
  function makeElement(tagName, attrs = {}) {
    const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    const listeners = new Map();
    let inner = '';
    const element = {
      id: attrs.id, tagName, attrs, children: [], parentElement: null,
      hidden: 'hidden' in attrs, open: 'open' in attrs, textContent: '',
      dataset: Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key,value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),value])),
      classList: {
        toggle(name, enabled = !classes.has(name)) { if (enabled) classes.add(name); else classes.delete(name); return enabled; },
        contains(name) { return classes.has(name); },
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); }
      },
      addEventListener(type, handler) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(handler); },
      dispatch(type, event = {}) { if (!event.target) event.target=this; for (const handler of listeners.get(type) || []) handler(event); },
      setAttribute(name, value) { attrs[name] = String(value); },
      getAttribute(name) { return attrs[name] ?? null; },
      removeAttribute(name) { delete attrs[name]; },
      focus() { document.activeElement = this; calls.focuses.push(this); },
      scrollIntoView(options) { calls.scrolls.push({ element:this, options }); },
      showModal() { this.open = true; }, close() { this.open = false; },
      querySelectorAll(selector) { return descendants(this).filter(node => matches(node, selector)); },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
      closest(selector) { let node = this; while (node && !matches(node, selector)) node = node.parentElement; return node; },
      get innerHTML() { return inner; },
      set innerHTML(value) { inner = value; this.children = []; register(value, this); }
    };
    if (element.id) elements.set(element.id, element);
    return element;
  }
  function register(markup, host) {
    const stack = [host];
    for (const match of markup.matchAll(/<(\/?)([a-z][\w:-]*)\b([^>]*)>/gi)) {
      const tag = match[2].toLowerCase();
      if (match[1]) {
        const index = stack.findLastIndex(node => node.tagName === tag);
        if (index > 0) stack.length = index;
        continue;
      }
      const attrs = Object.fromEntries([...match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(value => [value[1], value[2] ?? '']));
      const element = makeElement(tag, attrs), parent = stack.at(-1);
      element.parentElement = parent; parent.children.push(element);
      if (!voidTags.has(tag) && !/\/\s*$/.test(match[3])) stack.push(element);
    }
  }
  const documentRoot = makeElement('document');
  register(html, documentRoot);
  const body = descendants(documentRoot).find(node => node.tagName === 'body');
  const document = {
    body, hidden: false, activeElement: null,
    getElementById: id => elements.get(id) || null,
    querySelectorAll: selector => documentRoot.querySelectorAll(selector),
    querySelector: selector => documentRoot.querySelector(selector),
    addEventListener(type, handler) { documentEvents.set(type, handler); }
  };
  const location = { hash };
  function renderController() {
    elements.get('training-root').innerHTML = '<a class="back-link" href="#stage-path">All shapes</a><select data-shape="" aria-label="Choose a shape"></select>';
  }
  const controller = {
    setStage(id) { calls.stages.push(id); renderController(); },
    pause() { calls.pauses++; },
    hasDraft() { return calls.drafts; },
    destroy() { throw new Error('Selecting shapes must preserve the shared controller and its drafts'); }
  };
  const context = vm.createContext({
    document, location, console, Blob, URL, performance,
    setTimeout() { return 1; }, clearTimeout() {},
    requestAnimationFrame(callback) { callback(); return 1; },
    localStorage: {
      getItem: key => records.get(key) ?? null,
      setItem(key, value) { calls.writes.push({ key, value }); records.set(key, value); }
    },
    matchMedia: () => ({ matches: false }), scrollTo(options) { calls.scrolls.push({ options }); },
    addEventListener(type, handler) { events.set(type, handler); },
    history: { replaceState(state, title, nextHash) { location.hash = nextHash; } },
    FormTraining: { mount(options) { calls.mounts.push(options); renderController(); return controller; } },
    FormLab: { mount() { throw new Error('The retired laboratory must not mount'); } },
    FormBreath: { BreathGuide: class { constructor() { throw new Error('The app must not create a second breath clock'); } } }
  });
  context.window = context;
  for (const name of ['relational-models', 'shape-practice', 'progress', 'geometry']) {
    vm.runInContext(read('src/' + name + '.js'), context, { filename: name + '.js' });
  }
  if (missingModule) context[missingModule] = undefined;
  vm.runInContext(appSource, context, { filename: 'app.js' });
  return {
    calls, document, elements, records, location,
    navigate(nextHash) { location.hash = nextHash; events.get('hashchange')(); },
    click(element) {
      const event = { target: element, button:0, preventDefault() { this.defaultPrevented = true; } };
      let node = element;
      while (node) { node.dispatch('click', event); node = node.parentElement; }
      documentEvents.get('click')?.(event);
      if (!event.defaultPrevented && element.attrs.href?.startsWith('#') && location.hash !== element.attrs.href) {
        location.hash = element.attrs.href; events.get('hashchange')();
      }
    },
    toggle(id, open) { const element=elements.get(id); element.open=open; element.dispatch('toggle'); },
    fire(type, event = {}) { events.get(type)?.(event); },
    visibility(hidden) { document.hidden = hidden; documentEvents.get('visibilitychange')(); }
  };
}

function earlierArchive() {
  const state = Progress.defaultProgress();
  state.activeSession = {id:'earlier-session',stageId:'circle',mode:'independent',lag:1,entries:[{source:'Keep the earlier generated session opaque.'}]};
  state.journal.push({ id: 'earlier-observation', kind: 'personal', private: true, source: 'Keep this original source.', title: 'Earlier observation', locus: 'Atrium', stageId: 'circle', createdAt: '2026-10-01T00:00:00.000Z', revisions: [] });
  // Whitespace makes an accidental parse-and-reserialize write detectable.
  return JSON.stringify(state, null, 2);
}

test('the initial page keeps the metronome hidden until a shape is selected', () => {
  for (const hash of ['', '#journey']) {
    const app = harness({ hash });
    assert.equal(app.document.body.dataset.view, 'journey');
    assert.equal(app.elements.get('view-journey').hidden, false);
    assert.equal(app.elements.get('view-practice').hidden, true);
    assert.equal(app.calls.mounts.length, 0, 'no practice clock or settings are mounted before choosing a shape');
    assert.equal(app.document.querySelectorAll('#stage-path .selected').length, 0, 'the initial screen does not imply an active shape');
  }
});

test('a missing app module exposes its warning without mounting or revealing practice', () => {
  for (const missingModule of ['FormShapePractice','FormProgress','FormGeometry']) {
    const app = harness({ missingModule });
    assert.equal(app.elements.get('practice-resources').hidden, false);
    assert.equal(app.elements.get('archive-panel').open, true);
    assert.equal(app.elements.get('storage-warning').hidden, false);
    assert.match(app.elements.get('storage-warning').textContent, /module could not load/);
    assert.equal(app.elements.get('view-journey').hidden, false);
    assert.equal(app.elements.get('view-practice').hidden, true);
    assert.equal(app.calls.mounts.length, 0);
  }
});

test('old theory and archive links do not reveal the metronome before shape selection', () => {
  for (const [hash, panel] of [['#philosophy','philosophy-panel'], ['#palace','archive-panel']]) {
    const app = harness({ hash });
    assert.equal(app.elements.get(panel).open, true);
    assert.equal(app.elements.get('practice-resources').hidden, false);
    assert.equal(app.elements.get('view-journey').hidden, false);
    assert.equal(app.elements.get('view-practice').hidden, true);
    assert.equal(app.calls.mounts.length, 0);
  }
});

test('all fourteen selections retain the homepage and share one training controller', () => {
  const archive = earlierArchive(), app = harness({ archive });
  const song = app.elements.get('site-song');
  for (const stage of STAGES) {
    app.navigate('#practice/' + stage.id);
    assert.equal(app.document.body.dataset.view, 'journey');
    assert.equal(app.elements.get('view-practice').hidden, false);
    assert.equal(app.elements.get('view-journey').hidden, false, 'the logo, song, shape cards and introduction stay on the page');
    assert.equal(app.elements.get('site-song'), song, 'selection does not replace the music player');
    const selected = app.document.querySelectorAll('#stage-path .selected');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].dataset.stage, stage.id);
  }
  assert.equal(app.calls.mounts.length, 1);
  assert.equal(app.calls.mounts[0].root, app.elements.get('training-root'));
  assert.deepEqual([app.calls.mounts[0].stageId, ...app.calls.stages], STAGES.map(stage => stage.id));
  app.navigate('#philosophy');
  app.navigate('#palace');
  app.navigate('#journey');
  app.fire('pagehide');
  app.fire('beforeunload', { preventDefault() {} });
  assert.equal(app.records.get(Progress.STORAGE_KEY), archive);
  assert.equal(app.records.get('unrelated-record'), 'keep me');
  assert.deepEqual(app.calls.writes, [], 'navigation must not migrate or rewrite the legacy archive');
});

test('shape selection and legacy deep links reveal the same inline practice', () => {
  const app = harness({ hash: '#practice/circle' });
  assert.equal(app.elements.get('view-journey').hidden, false);
  assert.equal(app.elements.get('view-practice').hidden, false);
  app.calls.mounts[0].onStageChange('cube');
  assert.equal(app.location.hash, '#practice/cube');
  app.fire('hashchange');
  assert.deepEqual(app.calls.stages, ['cube']);
  assert.equal(app.document.activeElement, app.elements.get('training-root').querySelector('[data-shape]'), 'changing the shape retains keyboard focus on its selector');
  app.navigate('#philosophy');
  app.navigate('#studio');
  assert.equal(app.location.hash, '#practice/cube');
  assert.equal(app.document.body.dataset.view, 'journey');
  assert.equal(app.calls.mounts.length, 1);
  assert.deepEqual(app.calls.stages, ['cube'], 'returning to the same stage preserves its mounted state');
});

test('clicking an already selected shape returns to practice without remounting it', () => {
  const app = harness({ hash: '#practice/triangle' });
  app.calls.drafts = true;
  const card = app.document.querySelector('#stage-path [data-stage="triangle"]');
  const scrollsBefore = app.calls.scrolls.length;
  app.click(card);
  assert.equal(app.calls.mounts.length, 1);
  assert.deepEqual(app.calls.stages, []);
  assert.ok(app.calls.scrolls.length > scrollsBefore, 'the same-card click still scrolls to the inline practice');
  assert.equal(app.elements.get('view-journey').hidden, false);
  assert.equal(app.elements.get('view-practice').hidden, false);
});

test('repeated All shapes clicks still pause and return to the grid at the same address', () => {
  const app = harness({ hash:'#practice/cube' });
  app.navigate('#stage-path');
  const pausesBefore = app.calls.pauses, scrollsBefore = app.calls.scrolls.length;
  const link = app.elements.get('training-root').querySelector('.back-link');
  app.click(link);
  assert.equal(app.location.hash, '#stage-path');
  assert.equal(app.calls.pauses, pausesBefore + 1);
  assert.equal(app.calls.scrolls.length, scrollsBefore + 1);
  assert.equal(app.calls.scrolls.at(-1).element, app.elements.get('stage-path'));
  assert.equal(app.document.activeElement, app.elements.get('stage-path'));
  assert.equal(app.elements.get('view-practice').hidden, false);
  assert.equal(app.calls.mounts.length, 1);
  assert.deepEqual(app.calls.stages, []);
});

test('theory and archive open below practice without replacing the main page', () => {
  const app = harness({ hash:'#practice/sphere', archive:earlierArchive() });
  for (const [hash, panel] of [['#philosophy','philosophy-panel'], ['#palace','archive-panel']]) {
    app.navigate(hash);
    assert.equal(app.elements.get(panel).open, true);
    assert.equal(app.elements.get('view-journey').hidden, false);
    assert.equal(app.elements.get('view-practice').hidden, false);
    assert.equal(app.document.body.dataset.view, 'journey');
  }
  assert.match(app.elements.get('palace-entries').innerHTML, /Keep this original source/);
  assert.match(app.elements.get('philosophy-sphere').innerHTML, /<svg/);
  app.navigate('#journey');
  assert.equal(app.elements.get('view-practice').hidden, false, 'returning to the shape list keeps the selected practice available below it');
  assert.equal(app.calls.mounts.length, 1);
});

test('opening inline details renders their content without changing the selected shape', () => {
  const app = harness({ hash:'#practice/half-circle', archive:earlierArchive() });
  app.toggle('archive-panel', true);
  assert.match(app.elements.get('palace-entries').innerHTML, /Keep this original source/);
  app.toggle('philosophy-panel', true);
  assert.match(app.elements.get('philosophy-sphere').innerHTML, /<svg/);
  assert.equal(app.location.hash, '#practice/half-circle');
  assert.equal(app.calls.mounts.length, 1);
  assert.deepEqual(app.calls.stages, []);
});

test('returning to the shape list and hiding the page pause practice while preserving its draft guard', () => {
  const app = harness({ hash: '#practice/circle', archive: earlierArchive() });
  app.navigate('#practice/triangle');
  const afterSelection = app.calls.pauses;
  app.navigate('#journey');
  assert.ok(app.calls.pauses > afterSelection, 'return to the shape list pauses active practice');
  const afterReturn = app.calls.pauses;
  app.visibility(false);
  assert.equal(app.calls.pauses, afterReturn);
  app.visibility(true);
  app.fire('pagehide');
  assert.equal(app.calls.pauses, afterReturn + 2);
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  app.fire('beforeunload', event);
  assert.equal(prevented, 0);
  app.calls.drafts = true;
  app.fire('beforeunload', event);
  assert.equal(prevented, 1);
  assert.equal(event.returnValue, '');
  assert.deepEqual(app.calls.writes, []);
});

test('unreadable earlier archives do not block the new practice or overwrite the original', () => {
  const archive = '{"journal":[{"source":"preserve exactly"}], unfinished';
  const app = harness({ archive });
  assert.equal(app.elements.get('storage-warning').hidden, true);
  app.navigate('#practice/hexagon');
  assert.equal(app.calls.mounts[0].stageId, 'hexagon');
  assert.equal(app.elements.get('storage-warning').hidden, true);
  app.navigate('#palace');
  assert.equal(app.elements.get('storage-warning').hidden, false);
  assert.ok(app.elements.has('download-recovery'));
  assert.equal(app.records.get(Progress.STORAGE_KEY), archive);
  assert.deepEqual(app.calls.writes, []);
});

test('the page exposes shared training and theory without the retired studio, quiz or lab controls', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  assert.ok(ids.has('training-root'));
  for (const id of ['view-studio', 'studio-form', 'lesson-panel', 'mission-panel', 'session-result', 'practice-help', 'model-lab', 'open-pace', 'pace-dialog']) {
    assert.equal(ids.has(id), false, id + ' is retired');
  }
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  const trainingIndex = scripts.indexOf('src/training.js');
  assert.ok(trainingIndex >= 0);
  for (const dependency of ['src/relational-models.js', 'src/model-view.js', 'src/shape-practice.js', 'src/exercises.js', 'src/training-store.js']) {
    assert.ok(scripts.indexOf(dependency) >= 0 && scripts.indexOf(dependency) < trainingIndex, dependency + ' loads before shared training');
  }
  assert.ok(trainingIndex < scripts.indexOf('src/app.js'));
  for (const retired of ['src/lab.js','src/curriculum.js','src/session.js']) assert.equal(scripts.includes(retired), false);
});
