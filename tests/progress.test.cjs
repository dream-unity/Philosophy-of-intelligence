const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/progress.js');
const iso = days => new Date(Date.now() - days * 86400000 - 3600000).toISOString();
function makeAttempt(i, options = {}) {
  return Object.assign({ id: `a-${i}`, stageId: 'square', mode: 'independent', lag: 1, lagUnit: 'observations', correct: true, aided: false, tutorial: false, at: iso(2), sessionId: 's-1', channelResults: { binding: { correct: 1, total: 1 }, relation: { correct: 1, total: 1 } }, expectedClass: i % 2 ? 'match' : 'nonmatch', responseClass: i % 2 ? 'match' : 'nonmatch' }, options);
}
function addDay(state, name, days, count = 20, transform = x => x, sessionOptions = {}) {
  const attempts = [];
  for (let i = 0; i < count; i++) attempts.push(transform(makeAttempt(i, { id: `${name}-${i}`, sessionId: name, at: iso(days) }), i));
  state.attempts.push(...attempts);
  state.sessions.push(Object.assign({ id: name, stageId: 'square', mode: 'independent', lag: 1, lagUnit: 'observations', complete: true, at: iso(days), attemptIds: attempts.map(a => a.id) }, sessionOptions));
  return state;
}

test('defaults are fresh and conservative; UMD is available', () => {
  const a = P.defaultProgress(), b = P.defaultProgress();
  a.preferences.breath.sound = true; a.attempts.push({});
  assert.equal(b.preferences.breath.sound, false);
  assert.equal(b.preferences.pacing, 'manual');
  assert.equal(b.preferences.sessionLength, 8);
  assert.deepEqual(b.attempts, []);
  assert.equal(global.FormProgress, P);
});
test('storage handles corrupt JSON, missing access and quota failures', () => {
  assert.match(P.loadProgress({ getItem: () => '{broken' }).warning, /could not be read/);
  assert.match(P.loadProgress({ getItem() { throw new Error('denied'); } }).warning, /denied/);
  assert.match(P.loadProgress(null).warning, /unavailable/);
  assert.equal(P.saveProgress({ setItem() { throw new Error('quota'); } }, P.defaultProgress()).ok, false);
  const map = new Map();
  const store = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
  assert.equal(P.saveProgress(store, P.defaultProgress()).ok, true);
  assert.ok(map.has('form.progress.v1'));
  assert.equal(P.loadProgress(store).state.schemaVersion, 1);
});
test('rejects unsupported schemas and oversized imports; sanitizes private plain text', () => {
  assert.throws(() => P.importProgress({ schemaVersion: 2 }), /Unsupported/);
  assert.throws(() => P.importProgress('x'.repeat(P.LIMITS.importBytes + 1)), /too large/);
  const state = P.defaultProgress();
  state.journal = [{ id: 'j', text: '\0hello' }];
  state.preferences.breath = { inhale: -1, exhale: 900, volume: Infinity, sound: 'true' };
  const sanitized = P.importProgress(JSON.stringify(state));
  assert.equal(sanitized.journal[0].text, 'hello');
  assert.equal(sanitized.preferences.breath.inhale, 2);
  assert.equal(sanitized.preferences.breath.exhale, 8);
  assert.equal(sanitized.preferences.breath.sound, false);
  assert.equal({}.polluted, undefined);
  state.journal[0].text = 'x'.repeat(3001);
  assert.throws(() => P.importProgress(state), /has not been shortened/);
});
test('malformed dates, future dates, invalid stages and warmups never score', () => {
  const state = P.defaultProgress();
  state.attempts = [makeAttempt(1, { at: '2026-02-30T10:00:00Z' }), makeAttempt(2, { at: 'nonsense' }), makeAttempt(3, { at: new Date(Date.now() + 86400000).toISOString() }), makeAttempt(4, { warmup: true }), makeAttempt(5, { stageId: 'unavailable' })];
  assert.deepEqual(P.validateProgress(state).attempts, []);
});
test('attempt writes are immutable, deduplicated and permanent aid cannot be cleared', () => {
  const first = P.defaultProgress();
  const second = P.recordAttempt(first, makeAttempt(1));
  assert.equal(first.attempts.length, 0);
  let third = P.recordAttempt(second, makeAttempt(1, { aided: true }));
  third = P.recordAttempt(third, makeAttempt(1, { aided: false }));
  assert.equal(third.attempts.length, 1);
  assert.equal(third.attempts[0].aided, true);
  assert.equal(second.attempts[0].aided, false);
  const imported = P.defaultProgress();
  imported.attempts = [makeAttempt(2), makeAttempt(2, { tutorial: true })];
  assert.equal(P.importProgress(imported).attempts[0].tutorial, true);
});
test('duplicate conflicting result cannot overwrite source or inflate a score', () => {
  let state = P.recordAttempt(P.defaultProgress(), makeAttempt(1, { correct: false }));
  state = P.recordAttempt(state, makeAttempt(1, { correct: true }));
  assert.equal(state.attempts[0].correct, false);
  assert.equal(state.attempts[0].aided, true);
});
test('a repeated submission with a new timestamp does not double-score or penalize an unchanged answer', () => {
  let state = P.recordAttempt(P.defaultProgress(), makeAttempt(1, { at: iso(3) }));
  state = P.recordAttempt(state, makeAttempt(1, { at: iso(2) }));
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].aided, false);
  assert.equal(state.attempts[0].at.slice(0, 10), iso(3).slice(0, 10));
});
test('mastery requires two separate days of 20 completed independent attempts', () => {
  const state = addDay(P.defaultProgress(), 'first', 3);
  let summary = P.stageSummary(state, 'square');
  assert.equal(summary.ready, true); assert.equal(summary.mastered, false);
  addDay(state, 'second', 2);
  summary = P.stageSummary(state, 'square');
  assert.equal(summary.mastered, true); assert.equal(summary.stars, 3);
  assert.equal(summary.independentCount, 40); assert.equal(summary.days.length, 2);
  assert.equal(summary.channels.binding.accuracy, 1);
  assert.equal(P.stageSummary(state, 'sphere').mastered, false);
});
test('one day, insufficient samples, incomplete sessions and mixed settings cannot master', () => {
  const sameDay = addDay(addDay(P.defaultProgress(), 'a', 2), 'b', 2);
  assert.equal(P.stageSummary(sameDay, 'square').mastered, false);
  const short = addDay(addDay(P.defaultProgress(), 'a', 3, 19), 'b', 2, 19);
  assert.equal(P.stageSummary(short, 'square').ready, false);
  const aborted = addDay(addDay(P.defaultProgress(), 'a', 3), 'b', 2, 20, x => x, { complete: false });
  assert.equal(P.stageSummary(aborted, 'square').mastered, false);
  assert.equal(P.stageSummary(aborted, 'square').independentCount, 20);
  const mixed = addDay(addDay(P.defaultProgress(), 'a', 3), 'b', 2, 20, x => ({ ...x, lag: 2 }), { lag: 2 });
  assert.equal(P.stageSummary(mixed, 'square').mastered, false);
});
test('aids, tutorials, wrong session ownership and missing required channels cannot inflate mastery', () => {
  for (const mutate of [x => ({ ...x, aided: true }), x => ({ ...x, tutorial: true }), x => ({ ...x, sessionId: 'other' }), x => ({ ...x, channelResults: { relation: { correct: 1, total: 1 } } })]) {
    const state = addDay(addDay(P.defaultProgress(), 'a', 3, 20, mutate), 'b', 2, 20, mutate);
    assert.equal(P.stageSummary(state, 'square').mastered, false);
    assert.equal(P.stageSummary(state, 'square').independentCount, 0);
  }
});
test('85 percent overall does not hide inadequate nonmatch performance', () => {
  const mutate = (x, i) => i === 0 || i === 2 ? { ...x, correct: false, responseClass: 'match', channelResults: { binding: { correct: 1, total: 1 }, relation: { correct: 0, total: 1 } } } : x;
  const state = addDay(addDay(P.defaultProgress(), 'a', 3, 20, mutate), 'b', 2, 20, mutate);
  assert.equal(P.stageSummary(state, 'square').accuracy, 0.9);
  assert.equal(P.stageSummary(state, 'square').mastered, false);
});
test('binary mastery requires actual match and nonmatch coverage', () => {
  const onlyMatch = x => ({ ...x, expectedClass: 'match', responseClass: 'match' });
  const state = addDay(addDay(P.defaultProgress(), 'a', 3, 20, onlyMatch), 'b', 2, 20, onlyMatch);
  assert.equal(P.stageSummary(state, 'square').accuracy, 1);
  assert.equal(P.stageSummary(state, 'square').mastered, false);
});
test('imported missing aid/tutorial flags do not silently establish independent mastery', () => {
  const omitFlags = x => { delete x.aided; delete x.tutorial; return x; };
  const state = addDay(addDay(P.defaultProgress(), 'a', 3, 20, omitFlags), 'b', 2, 20, omitFlags);
  assert.equal(P.stageSummary(state, 'square').independentCount, 0);
});
test('practice completion requires completed non-tutorial six-item session with 75 percent accuracy', () => {
  let state = addDay(P.defaultProgress(), 'a', 2, 6, (x, i) => ({ ...x, mode: 'guided', aided: true, correct: i !== 0 }), { mode: 'guided' });
  assert.equal(P.stageSummary(state, 'square').practiceComplete, true);
  assert.equal(P.stageSummary(state, 'square').stars, 2);
  assert.equal(P.stageSummary(state, 'square').independentCount, 0);
  state.sessions[0].complete = false;
  assert.equal(P.stageSummary(state, 'square').practiceComplete, false);
});
test('export excludes private narratives and pending content by default; import keeps explicit private backup', () => {
  const state = P.defaultProgress();
  state.journal = [{ id: 'j', text: 'private narrative' }];
  state.palace = [{ id: 'a', text: 'private by default' }, { id: 'b', private: true, text: 'secret' }, { id: 'c', private: false, text: 'public example' }];
  state.activeSession = { id: 's', stageId: 'square', mode: 'guided', lag: 1, response: 'private pending response' };
  const standard = P.exportProgress(state);
  assert.deepEqual(standard.journal, []);
  assert.deepEqual(standard.palace.map(x => x.id), ['c']);
  assert.equal(standard.activeSession, null);
  const backup = P.importProgress(JSON.stringify(P.exportProgress(state, { includePrivate: true })));
  assert.equal(backup.journal[0].text, 'private narrative');
  assert.equal(backup.activeSession.id, 's');
  assert.equal(state.journal.length, 1);
});
test('active session is bounded and malformed logs cannot overflow counters', () => {
  const state = P.defaultProgress();
  state.activeSession = { id: 's', stageId: 'square', mode: 'guided', lag: 1, history: Array(257).fill({}) };
  state.attempts = [makeAttempt(1, { channelResults: { binding: { correct: 999, total: 1 } } })];
  const clean = P.validateProgress(state);
  assert.equal(clean.activeSession, null);
  assert.deepEqual(clean.attempts[0].channelResults, {});
  assert.equal(clean.attempts[0].correct, false);
  assert.equal(P.stageSummary(clean, 'square').independentCount, 0);
});
test('every stage requires its own complete channel evidence and can independently reach mastery', () => {
  const required = {
    circle: ['observation'], 'half-circle': ['binding'], triangle: ['relation'], square: ['binding', 'relation'],
    pentagon: ['relation'], hexagon: ['binding'], prism: ['mapping'], heptagon: ['function'],
    octagon: ['mapping', 'function'], cube: ['mapping'], dodecahedron: ['function'], icosahedron: ['revision'],
    geodesic: ['revision'], sphere: ['mapping', 'function', 'revision']
  };
  for (const [stageId, names] of Object.entries(required)) {
    const channels = Object.fromEntries(names.map(name => [name, { correct: 1, total: 1 }]));
    const convert = x => ({ ...x, stageId, channelResults: channels });
    const state = addDay(addDay(P.defaultProgress(), 'a', 3, 20, convert, { stageId }), 'b', 2, 20, convert, { stageId });
    assert.equal(P.stageSummary(state, stageId).mastered, true, `${stageId} should be able to qualify`);
    state.attempts.forEach(a => { a.channelResults = { unsupported: { correct: 1, total: 1 } }; });
    assert.equal(P.stageSummary(state, stageId).mastered, false, `${stageId} cannot borrow unrelated scores`);
  }
});
test('optional undefined fields survive as JSON omissions and normalized dangerous keys are removed', () => {
  const state = P.defaultProgress();
  state.activeSession = { id: 's', stageId: 'square', mode: 'guided', lag: 1, challenge: { secondary: undefined, title: 'Example' } };
  state.journal = [JSON.parse('{"id":"j","__proto__\\u0000":{"polluted":true},"text":"safe"}')];
  const clean = P.validateProgress(state);
  assert.equal(clean.activeSession.challenge.title, 'Example');
  assert.equal(Object.hasOwn(clean.activeSession.challenge, 'secondary'), false);
  assert.equal(Object.getPrototypeOf(clean.journal[0]), Object.prototype);
  assert.equal(Object.hasOwn(clean.journal[0], '__proto__'), false);
});
test('imported record fields cannot become executable markup or crash source/revision rendering', () => {
  const state = P.defaultProgress();
  state.journal = [{ id: 'j', locus: {}, title: { toString: 'broken' }, source: 'preserved', referenceSource: 'earlier', lag: '<img src=x onerror=alert(1)>', createdAt: { toString: 'broken' }, revisions: [null, false, { text: '<b>plain text</b>', at: {} }] }];
  state.palace = [{ id: 'p', private: false, source: { title: {}, body: 'safe', items: [null, 'bad', { label: {}, color: {}, value: { toString: 'broken' } }, { label: 'good', value: 3 }] }, revisions: [null] }];
  const clean = P.importProgress(JSON.stringify(state));
  const journal = clean.journal[0], palace = clean.palace[0];
  assert.equal(journal.locus, 'Atrium'); assert.equal(journal.title, '');
  assert.equal(journal.lag, 0); assert.equal(journal.createdAt, '');
  assert.equal(journal.revisions.length, 1); assert.equal(journal.revisions[0].text, '<b>plain text</b>');
  assert.equal(palace.source.items.length, 2);
  assert.equal(palace.source.items[0].color, '');
  assert.equal(palace.source.items[0].value, undefined);
  assert.equal(palace.source.items[1].value, 3);
  assert.deepEqual(palace.revisions, []);
});
test('personal revisions make a principle private even if an imported flag incorrectly says public', () => {
  const state = P.defaultProgress();
  state.palace = [{ id: 'edited', kind: 'principle', private: false, title: 'Generated principle', revisions: [{ at: iso(1), text: 'Personal experience' }] }, { id: 'unedited', private: false, title: 'Generated principle', revisions: [] }];
  assert.equal(P.importProgress(state).palace[0].private, true);
  assert.deepEqual(P.exportProgress(state).palace.map(p => p.id), ['unedited']);
  assert.equal(P.exportProgress(state, { includePrivate: true }).palace.length, 2);
});
test('private prediction and later evidence survive backup without changing the committed prediction', () => {
  const state = P.defaultProgress();
  const prediction = { condition: 'If the queue starts with six items', expected: 'One extra place will be needed', revisionTrigger: 'More than one item leaves', committedAt: iso(3) };
  state.journal = [{ id: 'prediction', source: 'Six items in the queue', prediction, evidence: [{ observation: 'Three items left', verdict: 'challenges', revision: 'Include departures before predicting capacity', at: iso(2) }] }];
  const restored = P.importProgress(JSON.stringify(P.exportProgress(state, { includePrivate: true })));
  assert.deepEqual(restored.journal[0].prediction, prediction);
  assert.equal(restored.journal[0].evidence[0].verdict, 'challenges');
  assert.equal(restored.journal[0].private, true);
  restored.journal[0].evidence.push({ observation: 'A later queue matched', verdict: 'supports', revision: '', at: iso(1) });
  assert.deepEqual(P.validateProgress(restored).journal[0].prediction, prediction);
  assert.deepEqual(P.exportProgress(restored).journal, []);
  assert.ok(!JSON.stringify(P.exportProgress(restored)).includes('Three items left'));
});
test('prediction/evidence imports reject malformed fields, unsupported verdicts and evidence predating commitment', () => {
  const state = P.defaultProgress();
  state.journal = [{ id: 'good', prediction: { condition: '', expected: 'A checkable result', revisionTrigger: '', committedAt: iso(3) }, evidence: [null, { observation: {}, verdict: 'supports', revision: '', at: iso(1) }, { observation: 'x', verdict: 'certain', revision: '', at: iso(1) }, { observation: 'x', verdict: 'supports', revision: {}, at: iso(1) }, { observation: 'earlier event', verdict: 'supports', revision: '', at: iso(4) }, { observation: 'x', verdict: 'supports', revision: '', at: 'yesterday' }, { observation: 'Later data', verdict: 'unclear', revision: 'Need another observation', at: iso(1) }] }, { id: 'bad', prediction: { condition: [], expected: 'x', revisionTrigger: '', committedAt: iso(3) } }, { id: 'undated', prediction: { condition: '', expected: 'x', revisionTrigger: '', committedAt: 'yesterday' } }];
  const clean = P.importProgress(JSON.stringify(state));
  assert.equal(clean.journal[0].evidence.length, 1);
  assert.equal(clean.journal[0].evidence[0].observation, 'Later data');
  assert.equal(clean.journal[1].prediction, undefined);
  assert.equal(clean.journal[2].prediction, undefined);
});
test('prediction fields and evidence are bounded and make a principle private', () => {
  const state = P.defaultProgress(), long = 'x'.repeat(3000);
  state.palace = [{ id: 'p', private: false, prediction: { condition: long, expected: long, revisionTrigger: long, committedAt: iso(3) }, evidence: Array.from({ length: 20 }, () => ({ observation: long, verdict: 'supports', revision: long, at: iso(2) })) }];
  const clean = P.validateProgress(state).palace[0];
  assert.equal(clean.prediction.condition.length, 3000);
  assert.equal(clean.prediction.expected.length, 3000);
  assert.equal(clean.prediction.revisionTrigger.length, 3000);
  assert.equal(clean.evidence.length, 20);
  assert.equal(clean.evidence[0].observation.length, 3000);
  assert.equal(clean.evidence[0].revision.length, 3000);
  assert.equal(clean.private, true);
  assert.deepEqual(P.exportProgress(state).palace, []);
  state.palace[0].evidence.push({ observation: 'extra', verdict: 'unclear', revision: '', at: iso(2) });
  assert.throws(() => P.importProgress(state), /no evidence has been discarded/);
});
test('private collection overflow, duplicate identifiers and field overflow reject without truncating data', () => {
  const state = P.defaultProgress();
  state.journal = Array.from({ length: P.LIMITS.journal + 1 }, (_, i) => ({ id: 'entry-' + i, source: 'Keep this source' }));
  assert.equal(P.canStorePrivate(state), false);
  assert.throws(() => P.importProgress(state), /no private entries have been discarded/);
  assert.equal(state.journal.length, P.LIMITS.journal + 1);
  state.journal = [{ id: 'same', source: 'first' }, { id: 'same', source: 'second' }];
  assert.throws(() => P.importProgress(state), /not been merged or discarded/);
  state.journal = [{ id: 'long', source: 'x'.repeat(3001) }];
  assert.equal(P.canStorePrivate(state), false);
  assert.throws(() => P.importProgress(state), /has not been shortened/);
  assert.equal(state.journal[0].source.length, 3001);
});
test('UTF-8 private budget and maximum log budgets produce a lossless re-importable private backup', () => {
  const state = P.defaultProgress(), unicode = '界'.repeat(3000), past = iso(2), later = iso(1);
  const entry = { kind: 'personal', private: true, title: 'Private source', source: unicode, relation: unicode, function: unicode, recollection: unicode, referenceSource: unicode, locus: 'Atrium', createdAt: past, prediction: { condition: unicode, expected: unicode, revisionTrigger: unicode, committedAt: past }, evidence: Array.from({ length: 20 }, () => ({ observation: unicode, verdict: 'unclear', revision: unicode, at: later })), revisions: Array.from({ length: 20 }, () => ({ text: unicode, at: later })) };
  while (true) {
    state.journal.push({ ...entry, id: 'full-' + state.journal.length });
    if (!P.canStorePrivate(state)) { state.journal.pop(); break; }
  }
  assert.ok(state.journal.length > 5);
  const payload = JSON.stringify({ palace: state.palace, journal: state.journal });
  assert.ok(Buffer.byteLength(payload, 'utf8') > P.LIMITS.privateBytes * 0.9);
  assert.ok(payload.length < P.LIMITS.privateBytes / 2, 'the budget must count UTF-8 bytes rather than JavaScript characters');
  const extra = { ...state, journal: [...state.journal, { ...entry, id: 'overflow' }] };
  assert.equal(P.canStorePrivate(extra), false);
  assert.throws(() => P.importProgress(extra), /8 MiB collection limit/);
  const longId = '界'.repeat(150);
  state.attempts = Array.from({ length: P.LIMITS.attempts }, (_, i) => makeAttempt(i, { id: longId + '-' + i, sessionId: longId, lagUnit: '界'.repeat(40) }));
  const attemptIds = Array.from({ length: 256 }, (_, i) => longId + '-' + i);
  state.sessions = Array.from({ length: P.LIMITS.sessions }, (_, i) => ({ id: longId + '-' + i, stageId: 'square', mode: 'independent', lag: 1, lagUnit: 'observation', complete: false, at: past, attemptIds }));
  state.activeSession = { id: 'pending', stageId: 'square', mode: 'guided', lag: 1, padding: Array(10).fill('界'.repeat(8192)) };
  const exported = P.exportProgress(state, { includePrivate: true });
  const serialized = JSON.stringify(exported);
  assert.ok(Buffer.byteLength(serialized, 'utf8') < P.LIMITS.importBytes);
  assert.ok(Buffer.byteLength(JSON.stringify(exported.attempts), 'utf8') <= P.LIMITS.logBytes / 2);
  assert.ok(Buffer.byteLength(JSON.stringify(exported.sessions), 'utf8') <= P.LIMITS.logBytes / 2);
  const restored = P.importProgress(serialized);
  assert.deepEqual(restored.journal, exported.journal);
  assert.equal(restored.journal[0].source, unicode);
  assert.equal(restored.journal[0].evidence.length, 20);
  assert.equal(restored.journal[0].evidence[19].observation, unicode);
  assert.equal(restored.journal[0].revisions[19].text, unicode);
  assert.equal(restored.journal.length, state.journal.length);
});
