'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const practice = require('../src/shape-practice.js');
const models = require('../src/relational-models.js');

const ORDER = ['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'prism', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere'];
const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 30, 30, 120, 120];
const EXERCISES = ['stream', 'heart', 'body'];

function assertFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value), 'exported nested data is immutable');
  Object.values(value).forEach(assertFrozen);
}

test('fourteen relationship lessons follow the declared count-first route', () => {
  assert.deepEqual(practice.STAGES.map(stage => stage.id), ORDER);
  assert.deepEqual(practice.STAGES.map(stage => stage.relationCount), COUNTS);
  for (const stage of practice.STAGES) {
    assert.equal(practice.getStage(stage.id), stage);
    assert.ok(stage.theory.length > 80);
    assert.ok(stage.topology.length > 35);
    assert.equal(stage.readiness.length, 3);
    assert.match(stage.preparation, /home/);
    assert.match(stage.preparation, /Palace bindings.*do not add source links/);
  }
  assert.match(practice.getStage('icosahedron').theory, /same as the Dodecahedron/);
  assert.match(practice.getStage('sphere').theory, /Circle’s one explicit relationship/);
});

test('each shape has three complete exercise applications and four distinct-address encounters', () => {
  for (const stage of practice.STAGES) {
    for (const exercise of EXERCISES) {
      const guide = stage[exercise];
      for (const operation of ['notice', 'recall', 'relate', 'revise']) {
        assert.ok(guide[operation].length > 80, `${stage.id}/${exercise}/${operation}`);
        assert.doesNotMatch(guide[operation], /<[^>]+>/, 'lesson instructions are plain text');
      }
      assert.equal(guide.examples.length, 4);
      assert.equal(guide.register.length, stage.relationCount);
      assert.equal(guide.register, models.getModel(stage.id, exercise).relations, 'the model module owns the single relation register');
      assert.equal(guide.model, models.getModel(stage.id, exercise));
      assert.ok(guide.baseline.length > 30);
      assert.deepEqual(guide.examples.map(row => row.address), practice.ADDRESSES);
      for (const [index, row] of guide.examples.entries()) {
        assert.ok(row.inhale.trim().length > 0);
        assert.equal(row.inhale, guide.model.fourBreaths[index].inhale);
        assert.equal(row.compare, guide.model.fourBreaths[index].compare);
        assert.equal(guide.model.states[index].relations.length, stage.relationCount);
        assert.ok(row.encode.length > 100);
        assert.ok(row.compare.trim().length > 0);
        assert.ok(row.encode.includes(practice.ADDRESSES[index]));
        if (index > 0) assert.match(row.encode, /retrieve only after this encoding/);
      }
    }
    assert.notDeepEqual(stage.stream.examples, stage.heart.examples);
    assert.notDeepEqual(stage.heart.examples, stage.body.examples);
  }
});

test('Circle is one meaningful relationship between two roles, with full return from the beginning', () => {
  const stage = practice.getStage('circle');
  assert.equal(stage.stream.model.nodes.length, 2);
  assert.equal(stage.stream.register.length, 1);
  assert.match(stage.stream.register[0].text, /Ocean.*containing environment.*boat/i);
  assert.match(stage.stream.examples[0].inhale, /Ocean.*containing environment.*boat/);
  assert.match(stage.stream.examples[1].inhale, /Boat.*traversing ocean/);
  assert.match(stage.stream.examples[2].inhale, /Ocean constrains boat/);
  assert.match(stage.stream.examples[3].inhale, /Ocean.*containing environment.*boat again/);
  assert.match(stage.stream.examples[1].compare, /Retrieve b1/);
  assert.match(stage.stream.examples[2].compare, /Retrieve b2/);
  assert.match(stage.stream.examples[3].compare, /Retrieve b3/);
  assert.match(stage.stream.examples[3].compare, /Do not substitute.*b1/);
  for (const exercise of EXERCISES) {
    assert.match(stage[exercise].notice, /On the inhale.*On the exhale, encode.*before deliberately/);
    assert.match(stage[exercise].recall, /Only after current encoding/);
    assert.match(stage[exercise].revise, /Keep both original entries at their own addresses/);
  }
  assert.doesNotMatch(stage.theory, /one chosen feature|self-loop|SelfReturn|without.*earlier/);
});

test('Half-circle preserves two substantive meanings and tracks a changed functional role', () => {
  const stage = practice.getStage('half-circle');
  assert.equal(stage.stream.model.nodes.length, 2);
  assert.equal(stage.stream.register.length, 2);
  assert.match(stage.theory, /Containment and function are distinct/);
  assert.match(stage.stream.examples[2].compare, /containing role now supplies/);
  assert.match(stage.stream.examples[3].compare, /restricts rather than shelters/);
  assert.match(stage.theory, /Nothing new is unlocked/);
});

test('all shapes preserve the same encoding and exact-return procedure independently of count', () => {
  assert.ok(practice.STAGES.every(stage => stage.defaultLag === 1));
  assert.match(practice.BREATH_BACK, /encode.*first; then deliberately retrieve/);
  assert.match(practice.BREATH_BACK, /N counts committed observations, not breaths or seconds/);
  assert.match(practice.BREATH_BACK, /B = 1 only when each complete entry fits one ordinary breath/);
  assert.match(practice.BREATH_BACK, /keep an already-started return target fixed/);
  for (const stage of practice.STAGES) {
    for (const exercise of EXERCISES) {
      assert.match(stage[exercise].recall, /exactly N committed entries back/);
      assert.match(stage[exercise].recall, /Until N earlier entries exist, seed history/);
      assert.match(stage[exercise].relate, /annotation, not another counted relationship/);
      assert.match(stage[exercise].revise, /partial model and its actual count/);
    }
  }
});

test('standalone streaming and represented practice models keep their scopes explicit', () => {
  for (const stage of practice.STAGES) {
    assert.match(stage.stream.notice, /does not require attention to bodily sensations/);
    assert.match(stage.body.notice, /location, texture and intensity alone do not define shape count/);
    assert.match(stage.heart.notice, /Do not substitute an expected feeling/);
    if (stage.relationCount >= 30) {
      for (const exercise of ['heart', 'body']) {
        assert.match(stage[exercise].preparation, /represented practice episode/);
        assert.match(stage[exercise].preparation, /actual encoding, retrieval and comparison.*outside its count/);
      }
      assert.match(stage.preparation, /Learn the full register/);
      assert.match(stage.preparation, /not a one-inhale requirement/);
    }
  }
});

test('lesson content, complete registers, examples and shared addresses are immutable', () => {
  assertFrozen(practice.STAGES);
  assertFrozen(practice.ADDRESSES);
  assert.throws(() => { practice.STAGES[0].stream.examples[0].inhale = 'boat'; }, TypeError);
  assert.throws(() => { practice.STAGES[0].stream.register.push({}); }, TypeError);
  assert.throws(() => { practice.ADDRESSES[0] = 'replacement'; }, TypeError);
  assert.equal(practice.getStage('missing'), practice.STAGES[0]);
  assert.equal(practice.getStage(undefined), practice.STAGES[0]);
});

test('offline browser scripts expose the same lessons and data without network dependencies', () => {
  const browser = vm.createContext({});
  for (const filename of ['relational-models.js', 'shape-practice.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', filename), 'utf8'), browser, { filename });
  }
  assert.deepEqual(JSON.parse(JSON.stringify(browser.FormShapePractice.STAGES)), JSON.parse(JSON.stringify(practice.STAGES)));
  assert.deepEqual(Array.from(browser.FormShapePractice.ADDRESSES), practice.ADDRESSES);
  assert.equal(browser.FormShapePractice.getStage('sphere').id, 'sphere');
});
