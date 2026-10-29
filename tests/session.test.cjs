'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/curriculum.js');
const S = require('../src/session.js');
const copy = value => JSON.parse(JSON.stringify(value));

function prepared(stageId, options = {}) {
  let session = S.create(stageId, { id: 'test-' + stageId, mode: 'independent', seed: 99, ...options });
  while (session.phase === 'warmup') session = S.commitWarmup(session);
  if (session.phase === 'study') session = S.finishStudy(session);
  return session;
}
function answer(session, response = C.answerFor(session.challenge)) {
  if (session.challenge.steps) {
    for (const step of session.challenge.steps) session = S.setResponse(session, { ...session.response, [step.id]: response[step.id] });
    return session;
  }
  return S.setResponse(session, response);
}
function finalFeedback(stageId, options) {
  let session = prepared(stageId, options);
  while (session.phase !== 'complete') {
    if (session.phase === 'study') session = S.finishStudy(session);
    session = S.submit(answer(session)).session;
    assert.equal(session.phase, 'feedback');
    if (session.attemptIds.length === session.target) return session;
    session = S.advance(session);
  }
  return session;
}
function completed(stageId, options) { return S.advance(finalFeedback(stageId, options)); }
function assertFrozen(session) {
  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(session.challenge));
  assert.ok(Object.isFrozen(session.challenge.source));
  assert.ok(Object.isFrozen(session.challenge.source.items));
  assert.ok(Object.isFrozen(session.history));
  session.history.forEach(record => assert.ok(Object.isFrozen(record.features)));
}

test('every shape completes through real response transitions and restores its active source', () => {
  for (const stage of C.STAGES) {
    const pending = finalFeedback(stage.id), session = S.advance(pending);
    assert.equal(session.results.length, 8, stage.id);
    assert.equal(session.results.filter(result => result.correct).length, 8, stage.id);
    assert.equal(new Set(session.attemptIds).size, 8);
    assertFrozen(session);
    const restored = S.restore(copy(pending));
    assert.ok(restored, stage.id);
    assert.equal(restored.phase, 'paused');
    assert.equal(restored.resumePhase, 'feedback');
    assert.deepEqual(restored.challenge, pending.challenge);
    assert.deepEqual(restored.history, pending.history);
    assert.deepEqual(restored.feedback, pending.feedback);
    assertFrozen(restored);
    assert.equal(S.restore(copy(session)), null);
  }
});

test('Square first N observations are unscored and commits preserve the exact target', () => {
  for (const lag of [1, 2, 3, 4]) {
    let session = S.create('square', { id: 'lag-' + lag, seed: 42, mode: 'independent', lag });
    const ids = [];
    for (let i = 0; i < lag; i++) {
      assert.equal(session.phase, 'warmup');
      assert.equal(S.submit(session, { skip: true }).attempt, null);
      ids.push(session.challenge.memoryRecord.id);
      const paused = S.pause(session);
      assert.deepEqual(paused.history, session.history);
      session = S.resume(paused);
      session = S.commitWarmup(session);
    }
    assert.equal(session.phase, 'respond');
    assert.equal(session.attemptIds.length, 0);
    assert.equal(session.challenge.reference.id, ids[0]);
    const before = copy(session);
    session = S.submit(answer(session)).session;
    assert.deepEqual(session.history, before.history, 'response does not advance memory');
    session = S.advance(session);
    assert.equal(session.history.length, lag + 1);
    assert.equal(session.challenge.reference.id, lag === 1 ? before.challenge.memoryRecord.id : ids[1]);
    assert.deepEqual(before.challenge.source, C.generateChallenge('square', { seed: 42, ordinal: lag, lag, history: before.history }).source);
  }
});

test('guided Square fixes one feature by default and offers an explicit mixed progression', () => {
  for (const focusFeature of ['color', 'shape', 'value']) {
    let session = prepared('square', { mode: 'guided', focusFeature });
    const expectedWord = focusFeature === 'color' ? 'colour' : focusFeature;
    for (let i = 0; i < 8; i++) {
      assert.equal(session.focusFeature, focusFeature);
      assert.ok(session.challenge.steps[1].prompt.includes('same ' + expectedWord));
      assert.equal(session.aided, true);
      session = S.advance(S.submit(answer(session)).session);
    }
  }
  assert.equal(S.create('square', { mode: 'guided' }).focusFeature, 'color');
  const seen = new Set();
  let mixed = prepared('square', { mode: 'guided', focusFeature: null, target: 20 });
  while (mixed.phase !== 'complete') {
    assert.equal(mixed.focusFeature, null);
    seen.add(mixed.challenge.steps[1].prompt.match(/same (colour|shape|value)/)[1]);
    mixed = S.advance(S.submit(answer(mixed)).session);
  }
  assert.deepEqual([...seen].sort(), ['colour', 'shape', 'value']);
});

test('independent and explore Square always use mixed features', () => {
  for (const mode of ['independent', 'explore']) {
    const session = prepared('square', { mode, focusFeature: 'value', lag: 2 });
    assert.equal(session.focusFeature, null);
    assert.deepEqual(session.challenge, C.generateChallenge('square', { seed: session.seed, ordinal: session.ordinal, history: session.history, lag: session.lag }));
  }
  assert.equal(S.create('sphere', { mode: 'guided', focusFeature: 'color' }).focusFeature, null);
});

test('restore preserves guided feature focus while legacy guided sessions remain mixed', () => {
  for (const focusFeature of ['color', 'shape', 'value', null]) {
    const original = finalFeedback('square', { mode: 'guided', focusFeature, lag: 3 });
    const restored = S.restore(copy(original));
    assert.ok(restored);
    assert.equal(restored.focusFeature, focusFeature);
    assert.deepEqual(restored.challenge, original.challenge);
    assert.deepEqual(restored.history, original.history);
    assert.deepEqual(restored.feedback, original.feedback);
  }
  const legacy = prepared('square', { mode: 'guided', focusFeature: null });
  const saved = copy(legacy);
  delete saved.focusFeature;
  const restored = S.restore(saved);
  assert.ok(restored);
  assert.equal(restored.focusFeature, null);
  assert.deepEqual(restored.challenge, legacy.challenge);
  for (const invalid of ['mixed', 'texture', {}, 0, false]) assert.equal(S.restore({ ...copy(legacy), focusFeature: invalid }), null);
  assert.equal(S.restore({ ...copy(prepared('square')), focusFeature: 'color' }), null);
  assert.equal(S.restore({ ...copy(prepared('circle', { mode: 'guided' })), focusFeature: 'color' }), null);
});

test('completed missions cannot be restored into the active-session slot', () => {
  const done = completed('square');
  assert.equal(S.restore(copy(done)), null);
  assert.equal(S.restore({ ...copy(done), phase: 'paused', resumePhase: 'complete' }), null);
});

test('correct relation cannot erase a wrong source binding', () => {
  let session = prepared('square', { lag: 2 });
  const correct = C.answerFor(session.challenge);
  const wrong = session.challenge.steps[0].options.find(option => option.id !== correct.binding).id;
  session = answer(session, { binding: wrong, relation: correct.relation });
  const { attempt } = S.submit(session);
  assert.equal(attempt.correct, false);
  assert.deepEqual(attempt.channelResults.binding, { correct: 0, total: 1 });
  assert.deepEqual(attempt.channelResults.relation, { correct: 1, total: 1 });
  assert.equal(attempt.responseClass, correct.relation);
});

test('sequential operations commit one new step, disclose one next step, and lock prior choices', () => {
  for (const id of ['square', 'heptagon', 'octagon', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere']) {
    let session = prepared(id);
    const correct = C.answerFor(session.challenge), steps = session.challenge.steps;
    assert.equal(S.stepProgress(session).visibleCount, 1, id);
    assert.equal(S.setResponse(session, correct), session, 'cannot commit all steps at once');
    assert.equal(S.setResponse(session, { [steps[1].id]: correct[steps[1].id] }), session, 'cannot answer a hidden later step');
    session = S.setResponse(session, { [steps[0].id]: correct[steps[0].id] });
    assert.equal(S.stepProgress(session).visibleCount, 2);
    assert.deepEqual(S.stepProgress(session).lockedIds, [steps[0].id]);
    const changed = steps[0].options.find(option => option.id !== correct[steps[0].id]).id;
    assert.equal(S.setResponse(session, { [steps[0].id]: changed }), session, 'cannot revise a committed prediction');
    assert.equal(S.setResponse(session, { [steps[0].id]: changed, [steps[1].id]: correct[steps[1].id] }), session, 'cannot change an earlier choice while adding a new one');
    assert.equal(S.setResponse(session, null), session, 'clearing cannot bypass commitment');
    for (const step of steps.slice(1)) session = S.setResponse(session, { ...session.response, [step.id]: correct[step.id] });
    assert.equal(S.stepProgress(session).complete, true);
    assert.equal(S.responseComplete(session.challenge, session.response), true);
    assert.equal(S.submit(session).attempt.correct, true);
  }
});

test('final sequential choice may change before submit, earlier choices stay locked', () => {
  let session = answer(prepared('sphere'));
  const steps = session.challenge.steps, final = steps.at(-1);
  const changed = final.options.find(option => option.id !== session.response[final.id]).id;
  const updated = S.setResponse(session, { ...session.response, [final.id]: changed });
  assert.equal(updated.response[final.id], changed);
  assert.deepEqual(updated.response[steps[0].id], session.response[steps[0].id]);
  assert.equal(S.submit(updated).attempt.correct, false);
});

test('retry archives the previous response and permanently marks the same attempt aided', () => {
  let session = prepared('sphere');
  const first = session.challenge.steps[0];
  session = S.setResponse(session, { [first.id]: first.options[0].id });
  const prior = copy(session.response);
  session = S.resetResponse(session);
  assert.equal(session.response, null);
  assert.equal(session.aided, true);
  assert.equal(session.resetCount, 1);
  assert.deepEqual(session.responseRevisions[0].response, prior);
  assert.equal(S.stepProgress(session).visibleCount, 1);
  const saved = copy(session);
  saved.aided = false;
  session = S.resume(S.restore(saved));
  assert.equal(session.aided, true, 'a reset cannot be laundered into an independent attempt');
  const result = S.submit(answer(session));
  assert.equal(result.attempt.correct, true);
  assert.equal(result.attempt.aided, true);
  assert.equal(S.advance(result.session).aided, false, 'a new independent attempt starts clean');
});

test('every transition preserves immutable sources, reference, and committed history', () => {
  let session = prepared('square', { lag: 2 });
  const original = copy(session.challenge.source);
  for (const transform of [S.reveal, S.pause, S.resume, answer]) {
    session = transform(session);
    assertFrozen(session);
    assert.deepEqual(session.challenge.source, original);
    assert.ok(Object.isFrozen(session.challenge.reference));
    assert.throws(() => { session.challenge.source.body = 'rewritten'; }, TypeError);
    assert.throws(() => { session.history[0].features.color = 'rewritten'; }, TypeError);
  }
  const result = S.submit(session);
  assertFrozen(result.session);
  assert.ok(Object.isFrozen(result.attempt.channelResults));
  assert.equal(S.submit(result.session).attempt, null);
});

test('restoring Square final feedback preserves the pre-current N-back target and commits once', () => {
  for (const lag of [1, 2, 3, 4]) {
    const session = finalFeedback('square', { lag });
    const restored = S.restore(copy(session));
    assert.ok(restored);
    assert.equal(restored.challenge.reference.id, session.challenge.reference.id);
    assert.deepEqual(restored.challenge.answer, session.challenge.answer);
    assert.equal(restored.feedback.correct, true);
    assert.equal(restored.history.filter(record => record.id === session.challenge.memoryRecord.id).length, 0);
    const done = S.advance(S.resume(restored));
    assert.equal(done.phase, 'complete');
    assert.equal(done.history.at(-1).id, session.challenge.memoryRecord.id);
    assert.equal(done.history.filter(record => record.id === session.challenge.memoryRecord.id).length, 1);
  }
});

test('restore supports study, warmup, response, partial sequence and feedback without advancing', () => {
  const cases = [S.create('half-circle', { seed: 5 }), S.create('square', { seed: 7, lag: 3 }), prepared('circle'), prepared('sphere')];
  const sphere = cases.at(-1), first = sphere.challenge.steps[0];
  cases.push(S.setResponse(sphere, { [first.id]: first.options[0].id }));
  cases.push(S.submit(answer(prepared('square'))).session);
  for (const original of cases) {
    const restored = S.restore(copy(original));
    assert.ok(restored);
    assert.equal(restored.phase, 'paused');
    assert.equal(restored.resumePhase, original.phase);
    assert.deepEqual(restored.challenge, original.challenge);
    assert.deepEqual(restored.history, original.history);
    assert.deepEqual(restored.response, original.response);
    const resumed = S.resume(restored);
    assert.equal(resumed.phase, original.phase);
    assertFrozen(resumed);
  }
});

test('warmup phase forgery cannot create a scored attempt, including Skip', () => {
  const original = S.create('square', { seed: 2, lag: 2 });
  const forged = { ...copy(original), phase: 'respond' };
  assert.equal(S.restore(forged), null);
  assert.equal(S.submit(forged, { skip: true }).attempt, null);
  const paused = { ...copy(original), phase: 'paused', resumePhase: 'respond' };
  assert.equal(S.restore(paused), null);
  assert.equal(S.restore({ ...copy(original), phase: 'study' }), null);
});

test('recall cannot skip study, while supported recall survives restore', () => {
  const original = S.create('half-circle', { seed: 3, mode: 'independent' });
  assert.equal(S.restore({ ...copy(original), phase: 'respond' }), null);
  assert.equal(S.submit({ ...copy(original), phase: 'respond' }, { skip: true }).attempt, null);
  const supported = S.reveal(S.finishStudy(original));
  const restored = S.resume(S.restore(copy(supported)));
  assert.equal(restored.aided, true);
  assert.equal(restored.studySeen, true);
});

test('restore rejects duplicate, replaced, reordered and malformed observation occurrences', () => {
  const original = prepared('square', { lag: 3 });
  for (const mutate of [
    value => { value.history[1].id = value.history[0].id; },
    value => { value.history[0].features.color = 'unrecorded'; },
    value => { value.history.reverse(); },
    value => { value.history[0].features = null; },
    value => { value.history.push(copy(value.history[0])); }
  ]) {
    const forged = copy(original); mutate(forged); assert.equal(S.restore(forged), null);
  }
});

test('malformed results and duplicate attempt identities are rejected', () => {
  const original = finalFeedback('square', { lag: 2 });
  for (const mutate of [
    value => { value.results[0] = null; },
    value => { value.results[0].channelResults = null; },
    value => { value.results[0].channelResults.binding.correct = '<script>'; },
    value => { value.results[0].channelResults.binding.total = Infinity; },
    value => { value.results[0].channelResults.binding.correct = -1; },
    value => { value.results[0].channelResults.binding.correct = 0; },
    value => { value.results[0].channelResults.binding.total = 2; },
    value => { value.results[0].channelResults = { function: { correct: 1, total: 1 } }; },
    value => { value.results[0].aided = 'false'; },
    value => { value.results[0].correct = 1; },
    value => { value.results[0].id = 'other'; },
    value => { value.attemptIds[1] = value.attemptIds[0]; },
    value => { value.attemptIds[0] = 'other:0'; },
    value => { value.ordinal = 999; },
    value => { value.phase = 'paused'; value.resumePhase = 'made-up'; }
  ]) {
    const forged = copy(original); mutate(forged); assert.equal(S.restore(forged), null);
  }
});

test('skip remains incorrect with zero credited channels after persistence', () => {
  const selected = answer(prepared('sphere'));
  const skipped = S.submit(selected, { skip: true }).session;
  const restored = S.resume(S.restore(copy(skipped)));
  assert.equal(restored.feedback.skipped, true);
  assert.equal(restored.feedback.correct, false);
  assert.ok(Object.values(restored.feedback.channelResults).every(value => value.correct === 0));
  assert.equal(restored.results.at(-1).skipped, true);
  assert.equal(restored.results.at(-1).correct, false);
});

test('restore reconstructs current feedback and ignores supplied source and explanation', () => {
  const original = S.submit(answer(prepared('sphere'))).session;
  const forged = copy(original);
  forged.challenge.source.body = '<script>fake source</script>';
  forged.feedback.explanation = '<script>fake feedback</script>';
  forged.feedback.correct = false;
  forged.results.at(-1).correct = false;
  const restored = S.resume(S.restore(forged));
  assert.equal(restored.feedback.correct, true);
  assert.deepEqual(restored.challenge.source, original.challenge.source);
  assert.equal(restored.feedback.explanation, original.feedback.explanation);
});

test('invalid partial responses, out-of-order persisted steps and extra answer keys are rejected', () => {
  const session = prepared('sphere'), steps = session.challenge.steps;
  const partial = { [steps[1].id]: steps[1].options[0].id };
  assert.equal(S.restore({ ...copy(session), response: partial }), null);
  const response = { ...C.answerFor(session.challenge), extra: 'answer' };
  assert.equal(S.responseComplete(session.challenge, response), false);
  assert.equal(S.setResponse(session, response), session);
});

test('only Square contributes match-class accounting', () => {
  for (const stage of C.STAGES) {
    const result = S.submit(answer(prepared(stage.id))).attempt;
    if (stage.id === 'square') {
      assert.ok(['match', 'nonmatch'].includes(result.expectedClass));
      assert.equal(result.responseClass, result.expectedClass);
    } else {
      assert.equal(Object.hasOwn(result, 'expectedClass'), false);
      assert.equal(Object.hasOwn(result, 'responseClass'), false);
    }
  }
});
