'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { STAGES } = require('../src/curriculum.js');
const Progress = require('../src/progress.js');
const LegacySession = require('../src/session.js');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const appSource = read('src/app.js');

// Run the whole app adapter with real archive/curriculum/geometry modules.
// The training controller is a contract double: its exercises are covered
// separately, while these tests check mounting, routing and record isolation.
function harness({ hash = '#journey', archive = null } = {}) {
  const elements = new Map(), nodes = [], events = new Map(), documentEvents = new Map();
  const calls = { mounts: [], stages: [], pauses: 0, drafts: false, writes: [] };
  const records = new Map([['unrelated-record', 'keep me']]);
  if (archive !== null) records.set(Progress.STORAGE_KEY, archive);

  function register(markup) {
    for (const match of markup.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
      const attrs = Object.fromEntries([...match[2].matchAll(/([\w:-]+)="([^"]*)"/g)].map(value => [value[1], value[2]]));
      const classes = new Set((attrs.class || '').split(/\s+/));
      const listeners = new Map();
      let inner = '';
      const element = {
        id: attrs.id, tagName: match[1].toLowerCase(), attrs, hidden: /\bhidden\b/.test(match[2]),
        dataset: Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5), value])),
        textContent: '', open: false,
        classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
        addEventListener(type, handler) { listeners.set(type, handler); },
        setAttribute(name, value) { attrs[name] = String(value); },
        removeAttribute(name) { delete attrs[name]; },
        focus() {}, showModal() { this.open = true; }, close() { this.open = false; },
        get innerHTML() { return inner; },
        set innerHTML(value) { inner = value; register(value); }
      };
      nodes.push(element);
      if (element.id) elements.set(element.id, element);
    }
  }
  register(html);
  const body = nodes.find(node => node.tagName === 'body');
  const document = {
    body, hidden: false,
    getElementById: id => elements.get(id) || null,
    querySelectorAll(selector) {
      if (selector === '.view') return nodes.filter(node => node.classList.contains('view'));
      if (selector === 'dialog') return nodes.filter(node => node.tagName === 'dialog');
      if (selector === '[data-nav]') return nodes.filter(node => node.dataset.nav);
      if (selector === '[data-filter]') return nodes.filter(node => node.dataset.filter);
      return [];
    },
    addEventListener(type, handler) { documentEvents.set(type, handler); }
  };
  const location = { hash };
  const controller = {
    setStage(id) { calls.stages.push(id); },
    pause() { calls.pauses++; },
    hasDraft() { return calls.drafts; },
    destroy() {}
  };
  const context = vm.createContext({
    document, location, console, Blob, URL, performance,
    setTimeout() { return 1; }, clearTimeout() {},
    localStorage: {
      getItem: key => records.get(key) ?? null,
      setItem(key, value) { calls.writes.push({ key, value }); records.set(key, value); }
    },
    matchMedia: () => ({ matches: false }), scrollTo() {},
    addEventListener(type, handler) { events.set(type, handler); },
    history: { replaceState(state, title, nextHash) { location.hash = nextHash; } },
    FormTraining: { mount(options) { calls.mounts.push(options); return controller; } },
    FormLab: { mount() { throw new Error('The retired laboratory must not mount'); } },
    FormBreath: { BreathGuide: class { constructor() { throw new Error('The app must not create a second breath clock'); } } }
  });
  context.window = context;
  for (const name of ['curriculum', 'progress', 'session', 'geometry']) {
    vm.runInContext(read('src/' + name + '.js'), context, { filename: name + '.js' });
  }
  context.FormSession = { ...context.FormSession, resume() { throw new Error('An archived mission must never resume'); } };
  vm.runInContext(appSource, context, { filename: 'app.js' });
  return {
    calls, document, elements, records, location,
    navigate(nextHash) { location.hash = nextHash; events.get('hashchange')(); },
    fire(type, event = {}) { events.get(type)?.(event); },
    visibility(hidden) { document.hidden = hidden; documentEvents.get('visibilitychange')(); }
  };
}

function earlierArchive() {
  const state = Progress.defaultProgress();
  state.activeSession = LegacySession.create('circle', { mode: 'independent', seed: 9 });
  state.journal.push({ id: 'earlier-observation', kind: 'personal', private: true, source: 'Keep this original source.', title: 'Earlier observation', locus: 'Atrium', stageId: 'circle', createdAt: '2026-10-01T00:00:00.000Z', revisions: [] });
  // Whitespace makes an accidental parse-and-reserialize write detectable.
  return JSON.stringify(state, null, 2);
}

test('all fourteen routes share one training mount and leave earlier archive bytes untouched', () => {
  const archive = earlierArchive(), app = harness({ archive });
  assert.equal(app.calls.mounts.length, 0, 'the homepage does not initialise training');
  for (const stage of STAGES) {
    app.navigate('#practice/' + stage.id);
    assert.equal(app.document.body.dataset.view, 'practice');
    assert.equal(app.elements.get('view-practice').hidden, false);
    assert.equal(app.elements.get('view-journey').hidden, true);
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

test('training stage selection and the old studio address use the same practice route', () => {
  const app = harness({ hash: '#practice/circle' });
  app.calls.mounts[0].onStageChange('cube');
  assert.equal(app.location.hash, '#practice/cube');
  app.fire('hashchange');
  assert.deepEqual(app.calls.stages, ['cube']);
  app.navigate('#philosophy');
  app.navigate('#studio');
  assert.equal(app.location.hash, '#practice/cube');
  assert.equal(app.document.body.dataset.view, 'practice');
  assert.equal(app.calls.mounts.length, 1);
  assert.deepEqual(app.calls.stages, ['cube'], 'returning to the same stage preserves its mounted state');
});

test('navigation and visibility pause the shared controller and its draft guards unloading', () => {
  const app = harness({ hash: '#practice/circle', archive: earlierArchive() });
  app.navigate('#practice/triangle');
  assert.equal(app.calls.pauses, 1);
  app.navigate('#journey');
  assert.equal(app.calls.pauses, 2);
  app.visibility(false);
  assert.equal(app.calls.pauses, 2);
  app.visibility(true);
  app.fire('pagehide');
  assert.equal(app.calls.pauses, 4);
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
  for (const dependency of ['src/shape-practice.js', 'src/exercises.js', 'src/training-store.js']) {
    assert.ok(scripts.indexOf(dependency) >= 0 && scripts.indexOf(dependency) < trainingIndex, dependency + ' loads before shared training');
  }
  assert.ok(trainingIndex < scripts.indexOf('src/app.js'));
  assert.equal(scripts.includes('src/lab.js'), false);
});
