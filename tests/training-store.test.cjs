const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/training-store.js');

function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values, writes: 0,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { this.writes++; values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
}
function observation(id = 'one', changes = {}) {
  return {
    id, stageId: 'circle', exercise: 'heart', streamId: 'first-practice',
    createdAt: '2026-10-29T10:00:00.000Z', source: 'Warmth near the chest.',
    recollection: '', referenceId: null, referenceSource: '', lag: 1,
    relation: '', revision: '', ...changes
  };
}
function session(id = 'session-one', changes = {}) {
  return { id, stageId: 'circle', exercise: 'heart', endedAt: '2026-10-29T10:03:00.000Z', seconds: 180, completed: true, ...changes };
}
function add(store, value) {
  const next = store.data;
  next.entries.push(value);
  return store.save(next);
}

test('new manual store does not load, overwrite, or score legacy quiz progress', () => {
  const legacy = '{"mastered":"circle","private":"earlier notes"}';
  const storage = memory({ 'form.progress.v1': legacy });
  const store = P.createStore(storage);
  assert.equal(global.FormTrainingStore, P);
  assert.equal(store.writable, true);
  assert.equal(storage.writes, 0);
  assert.deepEqual(store.data, { schemaVersion: 1, entries: [], sessions: [], readiness: {} });
  assert.equal(add(store, observation()).ok, true);
  assert.equal(storage.getItem('form.progress.v1'), legacy);
  assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).entries.length, 1);
});

test('export preserves exact private text and snapshots cannot mutate stored sources', () => {
  const storage = memory();
  const store = P.createStore(storage);
  const source = '  <private>\nA warmth: “uncertain”.\u0000  ';
  const next = store.data;
  next.entries.push(observation('one', { source }));
  assert.equal(store.save(next).ok, true);
  next.entries[0].source = 'Changed through original input';
  const snapshot = store.data;
  snapshot.entries[0].source = 'Changed through getter';
  snapshot.readiness.circle = { heart: true, body: true };
  assert.equal(store.data.entries[0].source, source);
  assert.deepEqual(store.data.readiness, {});
  assert.deepEqual(JSON.parse(store.exportJSON()), store.data);
  assert.equal(P.createStore(storage).data.entries[0].source, source);
});

test('entries stay append-only, while readiness is an independent personal assessment', () => {
  const store = P.createStore(memory());
  assert.equal(add(store, observation()).ok, true);
  for (const change of [next => { next.entries[0].source = 'replacement'; }, next => { next.entries[0].revision = 'replacement'; }, next => { next.entries = []; }]) {
    const next = store.data;
    change(next);
    const saved = store.save(next);
    assert.equal(saved.ok, false);
    assert.match(saved.error, /cannot be changed/);
    assert.equal(store.data.entries[0].source, 'Warmth near the chest.');
  }
  const next = store.data;
  next.sessions.push(session());
  assert.equal(store.save(next).ok, true);
  assert.deepEqual(store.data.readiness, {}, 'time or completion does not establish readiness');
  next.readiness.circle = { heart: true, body: false };
  assert.equal(store.save(next).ok, true);
  const assessment = store.data;
  assessment.readiness.circle.heart = false;
  assessment.readiness.circle.body = true;
  assert.equal(store.save(assessment).ok, true);
  assert.deepEqual(store.data.readiness.circle, { heart: false, body: true, stream: false });
});

test('references must preserve the exact lag source in the same shape, exercise, and stream', () => {
  const store = P.createStore(memory());
  const a = observation('a', { source: 'Earlier warmth.' });
  const b = observation('b', { source: 'Later pressure.', referenceId: a.id, referenceSource: a.source });
  assert.equal(add(store, a).ok, true);
  assert.equal(add(store, observation('other-exercise', { exercise: 'body' })).ok, true);
  assert.equal(add(store, observation('other-shape', { stageId: 'triangle' })).ok, true);
  assert.equal(add(store, observation('other-stream', { streamId: 'second-practice' })).ok, true);
  assert.equal(add(store, b).ok, true);
  for (const changes of [
    { referenceId: 'a', referenceSource: a.source, lag: 1 },
    { referenceId: 'b', referenceSource: 'A rewritten source', lag: 1 },
    { referenceId: 'other-exercise', referenceSource: 'Warmth near the chest.', lag: 1 },
    { referenceId: 'other-shape', referenceSource: 'Warmth near the chest.', lag: 1 },
    { referenceId: 'other-stream', referenceSource: 'Warmth near the chest.', lag: 1 },
    { referenceId: 'future', referenceSource: 'Later', lag: 4 },
    { referenceId: null, referenceSource: a.source, lag: 1 }
  ]) assert.equal(add(store, observation('invalid', changes)).ok, false);
  assert.equal(add(store, observation('c', { lag: 2, referenceId: 'a', referenceSource: a.source, recollection: 'I remember warmth.' })).ok, true);
  assert.equal(store.data.entries.at(-1).referenceSource, a.source);
});

test('N-back seeds end at the chosen lag and cannot skip an available exact target', () => {
  for (const lag of [1, 2, 3, 4]) {
    const storage = memory(), store = P.createStore(storage);
    for (let index = 0; index < lag; index++) {
      assert.equal(add(store, observation('seed-' + index, { lag })).ok, true);
    }
    const before = storage.getItem(P.STORAGE_KEY);
    const skipped = add(store, observation('skipped', { lag }));
    assert.equal(skipped.ok, false);
    assert.match(skipped.error, /return target cannot be skipped/);
    assert.equal(storage.getItem(P.STORAGE_KEY), before);
    assert.equal(store.data.entries.length, lag);
    const first = store.data.entries[0];
    assert.equal(add(store, observation('return', { lag, referenceId: first.id, referenceSource: first.source, recollection: 'I do not reliably recall.' })).ok, true, 'uncertain retrieval still preserves the exact scheduled target');
    assert.equal(add(store, observation('new-stream', { lag, streamId: 'new-history' })).ok, true);
  }
});

test('a batch of new records cannot disguise its second entry as another seed', () => {
  const storage = memory(), store = P.createStore(storage);
  const next = store.data;
  next.entries.push(observation('first'), observation('second'));
  assert.equal(store.save(next).ok, false);
  assert.deepEqual(store.data.entries, []);
  assert.equal(storage.writes, 0);
  next.entries[1].referenceId = next.entries[0].id;
  next.entries[1].referenceSource = next.entries[0].source;
  assert.equal(store.save(next).ok, true);
});

test('older v1 entries without references remain readable while new returns use their target', () => {
  const legacy = { schemaVersion: 1, entries: [observation('older-first'), observation('older-second')], sessions: [], readiness: {} };
  const raw = JSON.stringify(legacy, null, 2), storage = memory({ [P.STORAGE_KEY]: raw });
  const store = P.createStore(storage);
  assert.equal(store.writable, true);
  assert.equal(storage.writes, 0);
  assert.equal(store.originalRaw, raw);
  assert.deepEqual(store.data.entries, legacy.entries);
  const assessment = store.data;
  assessment.readiness.circle = { heart: true, body: false, stream: false };
  assert.equal(store.save(assessment).ok, true, 'unrelated valid changes preserve legacy entries');
  assert.equal(add(store, observation('new-without-reference')).ok, false);
  const target = legacy.entries[1];
  assert.equal(add(store, observation('new-return', { referenceId: target.id, referenceSource: target.source })).ok, true);
  assert.deepEqual(P.createStore(storage).data.entries.slice(0, 2), legacy.entries);
});

test('pre-stream v1 data loads without rewriting originals and retains every earlier record on save', () => {
  const first = observation('original', { source: '  An earlier source.\nKept exactly.  ' });
  const second = observation('second', { referenceId: first.id, referenceSource: first.source, recollection: 'My own earlier recollection.' });
  const legacy = {
    schemaVersion: 1,
    entries: [first, second],
    sessions: [session()],
    readiness: { circle: { heart: true, body: false } }
  };
  const raw = JSON.stringify(legacy, null, 2);
  const storage = memory({ [P.STORAGE_KEY]: raw });
  const store = P.createStore(storage);
  assert.equal(store.writable, true);
  assert.equal(storage.writes, 0, 'reading must not rewrite old saved data');
  assert.equal(store.originalRaw, raw);
  assert.equal(storage.getItem(P.STORAGE_KEY), raw);
  assert.deepEqual(store.data.entries, legacy.entries);
  assert.deepEqual(store.data.sessions, legacy.sessions);
  assert.deepEqual(store.data.readiness.circle, { heart: true, body: false, stream: false });

  assert.equal(add(store, observation('stream-first', { exercise: 'stream', source: 'The ocean contains the boat.' })).ok, true);
  const restored = P.createStore(storage).data;
  assert.deepEqual(restored.entries.slice(0, 2), legacy.entries);
  assert.deepEqual(restored.sessions, legacy.sessions);
  assert.equal(restored.entries[2].exercise, 'stream');
  assert.deepEqual(restored.readiness.circle, { heart: true, body: false, stream: false });
});

test('consciousness-stream records use their exact N target independently of heart and body records', () => {
  const store = P.createStore(memory());
  const first = observation('stream-a', { exercise: 'stream', source: 'The ocean contains the boat.' });
  const second = observation('stream-b', { exercise: 'stream', source: 'The boat enables passage across the ocean.', referenceId: first.id, referenceSource: first.source });
  assert.equal(add(store, first).ok, true);
  assert.equal(add(store, observation('heart-record')).ok, true);
  assert.equal(add(store, observation('body-record', { exercise: 'body' })).ok, true);
  assert.equal(add(store, second).ok, true);
  assert.equal(add(store, observation('other-stream', { exercise: 'stream', streamId: 'different-period' })).ok, true);
  assert.equal(add(store, observation('wrong-target', { exercise: 'stream', referenceId: first.id, referenceSource: first.source })).ok, false);
  assert.equal(add(store, observation('cross-exercise', { exercise: 'stream', referenceId: 'heart-record', referenceSource: 'Warmth near the chest.' })).ok, false);
  assert.equal(add(store, observation('stream-c', { exercise: 'stream', lag: 2, referenceId: first.id, referenceSource: first.source })).ok, true);
  const next = store.data;
  next.sessions.push(session('stream-session', { exercise: 'stream' }));
  next.readiness.circle = { heart: false, body: true, stream: true };
  assert.equal(store.save(next).ok, true);
  const restored = JSON.parse(store.exportJSON());
  assert.deepEqual(restored.entries.at(-1), next.entries.at(-1));
  assert.equal(restored.sessions.at(-1).exercise, 'stream');
  assert.deepEqual(restored.readiness.circle, { heart: false, body: true, stream: true });
});

test('corrupt or incompatible stored data is preserved and pauses persistence', () => {
  for (const raw of ['{broken', JSON.stringify({ schemaVersion: 99 }), JSON.stringify({ schemaVersion: 1, entries: [], sessions: [], readiness: {}, privateExtra: 'do not discard' })]) {
    const storage = memory({ [P.STORAGE_KEY]: raw });
    const store = P.createStore(storage);
    assert.equal(store.writable, false);
    assert.match(store.warning, /original is untouched/);
    assert.equal(store.originalRaw, raw);
    assert.equal(add(store, observation()).ok, false);
    assert.equal(storage.writes, 0);
    assert.equal(storage.getItem(P.STORAGE_KEY), raw);
    assert.equal(JSON.parse(store.exportJSON()).entries[0].id, 'one');
    assert.equal(store.reload().ok, false);
    assert.equal(store.data.entries.length, 1, 'failed reload retains work in this tab');
  }
});

test('two tabs detect conflicts without overwriting either set of private observations', () => {
  const storage = memory();
  const first = P.createStore(storage), second = P.createStore(storage);
  assert.equal(add(first, observation('first')).ok, true);
  const firstRaw = storage.getItem(P.STORAGE_KEY);
  const conflict = add(second, observation('second'));
  assert.equal(conflict.ok, false);
  assert.match(conflict.error, /another tab/);
  assert.equal(second.writable, false);
  assert.equal(storage.getItem(P.STORAGE_KEY), firstRaw);
  assert.equal(second.originalRaw, firstRaw);
  assert.equal(JSON.parse(second.exportJSON()).entries[0].id, 'second');
  assert.equal(add(second, observation('third', { referenceId: 'second', referenceSource: 'Warmth near the chest.' })).ok, false);
  assert.deepEqual(second.data.entries.map(item => item.id), ['second', 'third'], 'accepted work remains exportable while persistence is blocked');
  assert.equal(storage.getItem(P.STORAGE_KEY), firstRaw);
  assert.equal(second.reload().ok, true);
  assert.deepEqual(second.data.entries.map(item => item.id), ['first']);
  assert.equal(second.warning, '');
  assert.equal(second.writable, true);
});

test('quota failure keeps accepted data in the tab and a later save can retry', () => {
  const storage = memory();
  const originalSet = storage.setItem;
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const store = P.createStore(storage);
  assert.equal(add(store, observation()).ok, false);
  assert.equal(store.writable, false);
  assert.match(store.warning, /kept in this tab only/);
  assert.equal(storage.getItem(P.STORAGE_KEY), null);
  assert.equal(JSON.parse(store.exportJSON()).entries.length, 1);
  storage.setItem = originalSet;
  assert.equal(store.save(store.data).ok, true);
  assert.equal(store.writable, true);
  assert.equal(store.warning, '');
  assert.equal(JSON.parse(storage.getItem(P.STORAGE_KEY)).entries.length, 1);
});

test('unavailable or denied storage keeps valid private work exportable', () => {
  for (const storage of [null, { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }]) {
    const store = P.createStore(storage);
    assert.equal(store.writable, false);
    assert.equal(add(store, observation()).ok, false);
    assert.equal(JSON.parse(store.exportJSON()).entries.length, 1);
    assert.match(store.warning, /tab only/);
  }
});

test('reset clears only manual data and restores writes after corrupt storage', () => {
  const storage = memory({ [P.STORAGE_KEY]: '{broken', 'form.progress.v1': 'legacy', 'unrelated': 'keep' });
  const store = P.createStore(storage);
  add(store, observation());
  assert.equal(store.reset().ok, true);
  assert.equal(storage.getItem(P.STORAGE_KEY), null);
  assert.equal(storage.getItem('form.progress.v1'), 'legacy');
  assert.equal(storage.getItem('unrelated'), 'keep');
  assert.equal(store.originalRaw, null);
  assert.deepEqual(store.data.entries, []);
  assert.equal(store.writable, true);
  assert.equal(add(store, observation('new')).ok, true);
});

test('failed reset preserves the current data for export', () => {
  const storage = memory();
  const store = P.createStore(storage);
  add(store, observation());
  const raw = storage.getItem(P.STORAGE_KEY);
  storage.removeItem = () => { throw new Error('denied'); };
  assert.equal(store.reset().ok, false);
  assert.equal(storage.getItem(P.STORAGE_KEY), raw);
  assert.equal(store.data.entries.length, 1);
});

test('all fourteen shapes work, with strict types, bounds and no silent truncation', () => {
  assert.equal(P.STAGE_IDS.length, 14);
  const store = P.createStore(memory());
  for (const id of P.STAGE_IDS) assert.equal(add(store, observation(id, { stageId: id, referenceId: '' })).ok, true);
  assert.ok(store.data.entries.every(item => item.referenceId === null));
  for (const changes of [{ source: ' ' }, { source: 'x'.repeat(3001) }, { stageId: 'unknown' }, { exercise: 'other' }, { lag: 0 }, { lag: 5 }, { lag: 1.5 }, { createdAt: '2026-02-30T10:00:00Z' }, { source: 3 }, { privateExtra: 'never discard' }]) {
    assert.equal(add(store, observation('invalid', changes)).ok, false);
    assert.equal(store.data.entries.length, 14);
  }
  const duplicate = store.data;
  duplicate.entries.push(observation('circle'));
  assert.equal(store.save(duplicate).ok, false);
  const long = store.data;
  long.entries.push(...Array.from({ length: 487 }, (_, i) => observation('extra-' + i)));
  assert.equal(long.entries.length, 501);
  assert.equal(store.save(long).ok, false);
  assert.equal(store.data.entries.length, 14);
  const tooManySessions = store.data;
  tooManySessions.sessions = Array.from({ length: 501 }, (_, i) => session('session-' + i));
  assert.equal(store.save(tooManySessions).ok, false);
  assert.deepEqual(store.data.sessions, []);
});

test('malformed sessions and inherited values cannot manufacture progress', () => {
  const store = P.createStore(memory());
  for (const changes of [{ seconds: -1 }, { seconds: Infinity }, { seconds: '60' }, { completed: 'true' }, { exercise: 'other' }]) {
    const next = store.data;
    next.sessions.push(session('invalid', changes));
    assert.equal(store.save(next).ok, false);
  }
  for (const readiness of [{ circle: { heart: true } }, { circle: { heart: 'true', body: false } }, { circle: { heart: true, body: false, stream: 'true' } }, { circle: { heart: true, body: false, stream: null } }, { unknown: { heart: true, body: true } }]) {
    const next = store.data;
    next.readiness = readiness;
    assert.equal(store.save(next).ok, false);
  }
  const next = store.data;
  next.entries.push(Object.create(observation()));
  assert.equal(store.save(next).ok, false);
  assert.deepEqual(store.data.readiness, {});
  assert.deepEqual(store.data.sessions, []);
});
