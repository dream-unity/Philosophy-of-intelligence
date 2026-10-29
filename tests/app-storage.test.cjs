'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LegacySession = require('../src/session.js');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
const appSource = read('app.js');

// The app is an IIFE rather than an importable module. Execute its real startup
// state and storage helpers, not a second implementation of the guards. Named
// boundaries deliberately fail if these helpers move and the harness needs care.
function between(start, end) {
  const begin = appSource.indexOf(start);
  const finish = appSource.indexOf(end, begin + start.length);
  assert.ok(begin >= 0 && finish > begin, 'Storage harness boundaries must match app.js');
  assert.equal(appSource.indexOf(start, begin + start.length), -1, 'Storage harness start must be unique');
  return appSource.slice(begin, finish);
}
const initialization = between('  const loaded = P.loadProgress(storage);', '  const motionPreference');
const helpers = between('  function toast(message) {', '  function showDialog(id) {');
const now = () => new Date().toISOString();
const entry = (id, source = 'An original observation') => ({ id, kind: 'personal', private: true, source, title: id, locus: 'Atrium', stageId: 'circle', createdAt: now(), revisions: [] });
const saved = (journal, activeSession = null) => JSON.stringify({ schemaVersion: 1, preferences: {}, attempts: [], sessions: [], palace: [], journal, activeSession });

function harness(options = {}) {
  let raw = options.raw ?? null;
  let writes = 0, writeAttempts = 0;
  let readError = !!options.readError, writeError = !!options.writeError;
  const elements = new Map(), blobs = [], downloads = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: true, textContent: '', innerHTML: '', listeners: new Map(),
      addEventListener(type, handler) { this.listeners.set(type, handler); },
      click() { this.listeners.get('click')?.(); }, remove() {}
    });
    return elements.get(id);
  }
  const storage = options.unavailable ? null : {
    getItem() { if (readError) throw new Error('Storage read blocked'); return raw; },
    setItem(key, value) { writeAttempts++; if (writeError) throw new Error('Quota exceeded'); writes++; raw = value; }
  };
  const context = vm.createContext({
    storage, Blob,
    $: element,
    document: {
      body: { append() {} },
      createElement() { return { click() { downloads.push({ href: this.href, download: this.download }); }, remove() {} }; }
    },
    URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test-' + blobs.length; }, revokeObjectURL() {} },
    setTimeout() { return 1; }, clearTimeout() {},
    location: { reload() {} }
  });
  // Load browser UMD exports in one realm so real plain-object validation runs.
  for (const name of ['curriculum.js', 'session.js', 'progress.js']) vm.runInContext(read(name), context, { filename: name });
  vm.runInContext(`
    const P = FormProgress, S = FormSession, stages = FormContent.STAGES;
    const clone = value => JSON.parse(JSON.stringify(value));
    ${initialization}
    ${helpers}
    globalThis.storageTest = {
      persist, canWrite, downloadSavedOriginal, showRecovery,
      storeEntryJSON(value) { return storeEntry('journal', JSON.parse(value)); },
      setPreference(value) { state.preferences.reducedMotion = value; },
      openArchive() { currentView = 'palace'; },
      inspect() { return JSON.stringify({ state, session, savedSnapshot, recoveryRequired, storageConflict, saveWarningShown }); }
    };
  `, context, { filename: 'app-storage-harness.js' });
  return {
    api: context.storageTest, element, blobs, downloads,
    inspect: () => JSON.parse(context.storageTest.inspect()),
    raw: () => raw, writes: () => writes, writeAttempts: () => writeAttempts,
    externalSave(value) { raw = value; },
    allowReads() { readError = false; }, allowWrites() { writeError = false; }
  };
}

for (const [name, options] of [
  ['malformed saved JSON', { raw: '{"journal": [unfinished' }],
  ['private text beyond the accepted limit', { raw: saved([entry('original', 'x'.repeat(3001))]) }],
  ['a storage read failure', { raw: saved([entry('original')]), readError: true }]
]) {
  test('archive write guards preserve the original after ' + name, () => {
    const app = harness(options), original = app.raw();
    assert.equal(app.inspect().recoveryRequired, true);
    assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('new'))), false);
    // Even a repeated explicit write cannot replace an unreadable archive.
    for (let i = 0; i < 3; i++) app.api.persist();
    assert.equal(app.writeAttempts(), 0);
    assert.equal(app.raw(), original);
    assert.equal(app.inspect().state.journal.length, 0);
    assert.equal(app.api.canWrite(), false);
    if (options.readError) {
      app.allowReads();
      app.api.persist();
      assert.equal(app.writeAttempts(), 0, 'read access returning does not authorize replacing an unloaded record');
      assert.equal(app.raw(), original);
    }
  });
}

test('normal saves keep private records and refresh the baseline for the next write', () => {
  for (const raw of [null, saved([entry('existing')])]) {
    const app = harness({ raw });
    assert.equal(app.inspect().recoveryRequired, false);
    assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('new'))), true);
    app.api.persist();
    assert.equal(app.writes(), 1);
    assert.equal(app.inspect().savedSnapshot, app.raw());
    app.api.setPreference(true);
    app.api.persist();
    assert.equal(app.writes(), 2);
    assert.equal(app.inspect().storageConflict, false);
    const recorded = JSON.parse(app.raw());
    assert.deepEqual(recorded.journal.map(item => item.id), raw ? ['existing', 'new'] : ['new']);
    assert.equal(recorded.journal.at(-1).source, 'An original observation');
    assert.equal(recorded.preferences.reducedMotion, true);
  }
});

test('a newer archive save blocks stale writes and keeps earlier sessions inactive', () => {
  const earlierSession = LegacySession.create('circle', { mode: 'independent', seed: 9 });
  const baseline = saved([entry('older')], earlierSession), newer = saved([entry('newer')], earlierSession);
  const app = harness({ raw: baseline });
  app.api.openArchive();
  assert.equal(app.inspect().session.phase, 'paused', 'restoring an earlier session does not run it');
  assert.equal(app.raw(), baseline, 'reading the archive does not rewrite its original bytes');
  app.externalSave(newer);
  app.api.persist();
  assert.equal(app.raw(), newer);
  assert.equal(app.writeAttempts(), 0);
  assert.equal(app.inspect().storageConflict, true);
  assert.equal(app.inspect().session.phase, 'paused');
  assert.equal(app.element('storage-warning').hidden, false);
  assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('blocked'))), false);
  assert.deepEqual(app.inspect().state.journal.map(item => item.id), ['older']);
  // A conflict remains latched; a coincidentally identical value is not consent.
  app.externalSave(baseline);
  app.api.persist();
  assert.equal(app.writeAttempts(), 0);
  assert.equal(app.inspect().session.phase, 'paused');
});

test('another tab clearing storage does not resurrect this tab’s old private journal', () => {
  const app = harness({ raw: saved([entry('old-private-source')]) });
  app.externalSave(null);
  app.api.persist();
  assert.equal(app.raw(), null);
  assert.equal(app.writeAttempts(), 0);
  assert.equal(app.inspect().storageConflict, true);
});

test('entry preflight rejects excessive private text without mutating the collection', () => {
  const app = harness({ raw: saved([entry('existing')]) });
  const before = app.inspect().state.journal;
  assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('too-long', 'x'.repeat(3001)))), false);
  assert.deepEqual(app.inspect().state.journal, before);
  assert.equal(app.writeAttempts(), 0);
  assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('accepted'))), true);
  app.api.persist();
  assert.deepEqual(JSON.parse(app.raw()).journal.map(item => item.id), ['existing', 'accepted']);
});

test('quota failure retains tab data and the old baseline so a later save can succeed', () => {
  const original = saved([entry('existing')]);
  const app = harness({ raw: original, writeError: true });
  assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('not-yet-saved'))), true);
  app.api.persist();
  assert.equal(app.writes(), 0);
  assert.equal(app.raw(), original);
  assert.equal(app.inspect().savedSnapshot, original);
  assert.equal(app.inspect().state.journal.length, 2);
  assert.equal(app.inspect().saveWarningShown, true);
  assert.match(app.element('storage-warning').textContent, /only in this tab/);
  app.allowWrites();
  app.api.persist();
  assert.equal(app.writes(), 1);
  assert.equal(app.inspect().storageConflict, false);
  assert.equal(JSON.parse(app.raw()).journal.length, 2);
});

test('recovery download preserves exact unreadable bytes without writing or normalizing them', async () => {
  const original = '{"journal":[{"source":"keep exactly"}], "unfinished":';
  const app = harness({ raw: original });
  app.api.showRecovery();
  app.element('download-recovery').click();
  assert.equal(app.blobs.length, 1);
  assert.equal(await app.blobs[0].text(), original);
  assert.equal(app.downloads.length, 1);
  assert.match(app.downloads[0].download, /^Philosophy-of-Intelligence-recovery-.*\.json$/);
  assert.equal(app.writeAttempts(), 0);
  assert.equal(app.inspect().recoveryRequired, true);
});

test('unavailable storage leaves in-tab work usable and reports that it needs export', () => {
  const app = harness({ unavailable: true });
  assert.equal(app.inspect().recoveryRequired, false);
  assert.equal(app.api.storeEntryJSON(JSON.stringify(entry('tab-only'))), true);
  app.api.persist();
  assert.equal(app.inspect().state.journal[0].id, 'tab-only');
  assert.equal(app.writes(), 0);
  assert.match(app.element('storage-warning').textContent, /only in this tab/);
});
