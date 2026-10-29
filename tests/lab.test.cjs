'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../src/lab.js');

function run(state, ...actions) {
  return actions.reduce((current, action) => Lab.transition(current, action), state);
}

test('one given case leaves both models compatible; diagnostic cases distinguish them', () => {
  const first = Lab.createState();
  assert.deepEqual(Lab.compareModels(first.evidence).compatible, ['add2', 'double']);
  const second = Lab.transition(first, { type: 'reveal-example' });
  assert.deepEqual(Lab.compareModels(second.evidence).compatible, ['add2']);
  const third = Lab.transition(second, { type: 'reveal-example' });
  assert.equal(third.evidence.length, 3);
  assert.deepEqual(third.evidence.map(record => [record.input, record.output]), [[2, 4], [3, 5], [5, 7]]);
  assert.deepEqual(Lab.compareModels(third.evidence).double, { agrees: 1, differs: 2 });
  assert.equal(Lab.transition(third, { type: 'reveal-example' }), third);
  assert.deepEqual(first.evidence.map(record => record.input), [2]);
});

test('authored context and overflow routes are distinct from the green reference scope', () => {
  for (let input = 0; input <= 8; input++) {
    assert.equal(Lab.withinModelScope(input, 'green'), input <= 6);
    assert.equal(Lab.withinModelScope(input, 'amber'), false);
    assert.equal(Lab.observeMachine(input, 'green'), input <= 6 ? input + 2 : input * 2);
    assert.equal(Lab.observeMachine(input, 'amber'), input * 2);
  }
  assert.equal(Lab.observeMachine(6, 'green'), 8);
  assert.equal(Lab.observeMachine(7, 'green'), 14);
  assert.throws(() => Lab.observeMachine(2, 'blue'), RangeError);
  assert.throws(() => Lab.candidatePrediction('unknown', 2), RangeError);
  for (const value of [-1, 9, 1.5, NaN, Infinity, '2']) assert.throws(() => Lab.candidatePrediction('add2', value), RangeError);
});

test('a committed prediction freezes its parameters and evidence before an outcome appears', () => {
  const original = run(Lab.createState(), { type: 'choose-model', model: 'double' }, { type: 'choose-input', input: 3 });
  const committed = Lab.transition(original, { type: 'commit' });
  assert.equal(committed.phase, 'committed');
  assert.equal(committed.committed.prediction, 6);
  assert.equal(committed.outcome, null);
  assert.deepEqual(committed.committed.evidenceIds, ['given-1']);
  assert.equal(original.committed, null);
  for (const action of [{ type: 'choose-input', input: 8 }, { type: 'choose-context', context: 'amber' }, { type: 'choose-model', model: 'add2' }, { type: 'reveal-example' }, { type: 'commit' }, { type: 'revise' }]) {
    assert.equal(Lab.transition(committed, action), committed);
  }
  assert.equal(Object.isFrozen(committed.committed), true);
  assert.equal(Object.isFrozen(committed.evidence[0]), true);
  const observed = Lab.transition(committed, { type: 'observe' });
  assert.equal(observed.outcome.output, 5);
  assert.equal(observed.outcome.agrees, false);
  assert.equal(observed.tests.length, 1);
  assert.equal(observed.evidence.length, 2);
  assert.equal(committed.evidence.length, 1);
  assert.deepEqual(observed.tests[0].prediction, committed.committed);
  assert.equal(Lab.transition(observed, { type: 'observe' }), observed);
});

test('revision changes the next model while preserving the earlier prediction and observation', () => {
  const first = run(Lab.createState(), { type: 'choose-model', model: 'double' }, { type: 'choose-input', input: 3 }, { type: 'commit' }, { type: 'observe' });
  const revised = run(first, { type: 'revise' }, { type: 'choose-model', model: 'add2' }, { type: 'commit' }, { type: 'observe' });
  assert.equal(revised.tests.length, 2);
  assert.equal(revised.tests[0].prediction.prediction, 6);
  assert.equal(revised.tests[0].outcome.output, 5);
  assert.equal(revised.tests[1].prediction.prediction, 5);
  assert.equal(revised.tests[1].outcome.agrees, true);
  assert.deepEqual(revised.tests[0], first.tests[0]);
  assert.notEqual(revised.tests[0].prediction.id, revised.tests[1].prediction.id);
  assert.equal(Lab.compareModels(revised.evidence).total, 2, 'repeated conditions must not inflate independent case count');
});

test('outside-scope failure remains an extrapolation and does not change in-scope evidence support', () => {
  const given = run(Lab.createState(), { type: 'reveal-example' }, { type: 'reveal-example' });
  const observed = run(given, { type: 'choose-input', input: 8 }, { type: 'commit' }, { type: 'observe' });
  assert.equal(observed.committed.inScope, false);
  assert.equal(observed.committed.prediction, 10);
  assert.equal(observed.outcome.output, 16);
  assert.equal(observed.outcome.agrees, false);
  assert.deepEqual(Lab.compareModels(observed.evidence), Lab.compareModels(given.evidence));
  const amber = run(Lab.createState(), { type: 'choose-context', context: 'amber' }, { type: 'commit' }, { type: 'observe' });
  assert.equal(amber.committed.inScope, false);
  assert.equal(amber.outcome.output, 8);
});

test('agreement outside the reference remains an explicitly outside-scope test', () => {
  const observed = run(Lab.createState(), { type: 'choose-context', context: 'amber' }, { type: 'choose-model', model: 'double' }, { type: 'commit' }, { type: 'observe' });
  assert.equal(observed.outcome.agrees, true);
  assert.equal(observed.committed.inScope, false);
  assert.equal(Lab.compareModels(observed.evidence).total, 1);
});

test('invalid interactions and premature observation cannot alter the experiment', () => {
  const initial = Lab.createState();
  for (const action of [{ type: 'observe' }, { type: 'revise' }, { type: 'choose-input', input: 12 }, { type: 'choose-input', input: 2.5 }, { type: 'choose-model', model: '__proto__' }, { type: 'choose-context', context: 'red' }, { type: 'unknown' }, {}]) assert.equal(Lab.transition(initial, action), initial);
  assert.throws(() => Lab.mount(null), TypeError);
});

test('reset creates a clean ephemeral experiment without modifying prior records', () => {
  const used = run(Lab.createState(), { type: 'reveal-example' }, { type: 'commit' }, { type: 'observe' });
  const reset = Lab.transition(used, { type: 'reset' });
  assert.deepEqual(reset, Lab.createState());
  assert.equal(used.tests.length, 1);
  assert.equal(used.evidence.length, 3);
});
