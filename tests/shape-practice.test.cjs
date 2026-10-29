'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const practice = require('../src/shape-practice.js');
const curriculum = require('../src/curriculum.js');

test('every existing shape routes to a complete manual application of both exercises', () => {
  assert.deepEqual(practice.STAGES.map(stage => stage.id), curriculum.STAGES.map(stage => stage.id));
  for (const stage of practice.STAGES) {
    assert.equal(practice.getStage(stage.id), stage);
    assert.equal(stage.name, curriculum.STAGES.find(item => item.id === stage.id).name);
    assert.ok(stage.theory.length > 80);
    assert.equal(stage.readiness.length, 3);
    for (const exercise of ['heart', 'body']) {
      assert.deepEqual(Object.keys(stage[exercise]), ['notice', 'recall', 'relate', 'revise']);
      for (const instruction of Object.values(stage[exercise])) {
        assert.ok(instruction.length > 40);
        assert.doesNotMatch(instruction, /<[^>]+>/, 'instructions remain text, safe for escaped templates');
      }
    }
    assert.notDeepEqual(stage.heart, stage.body, 'each exercise has a concrete, distinct application');
  }
});

test('shape complexity does not silently increase the observation return distance', () => {
  assert.ok(practice.STAGES.every(stage => stage.defaultLag === 1));
  assert.match(practice.BREATH_BACK, /N counts committed observations, not breaths or seconds/);
  assert.match(practice.getStage('square').body.notice, /30-second mapping prompt changes independently/);
  assert.match(practice.getStage('square').heart.recall, /Until N earlier observations exist/);
});

test('content cannot be changed by a selected page or a malformed route', () => {
  const original = practice.STAGES[0].heart.notice;
  assert.throws(() => { practice.STAGES[0].heart.notice = 'replacement'; }, TypeError);
  assert.throws(() => { practice.STAGES.push({}); }, TypeError);
  assert.equal(practice.STAGES[0].heart.notice, original);
  assert.equal(practice.getStage('missing'), practice.STAGES[0]);
  assert.equal(practice.getStage(undefined), practice.STAGES[0]);
});

test('offline browser script exposes the same data without CommonJS or network dependencies', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/shape-practice.js'), 'utf8');
  const browser = vm.createContext({});
  vm.runInContext(source, browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.FormShapePractice.STAGES)), JSON.parse(JSON.stringify(practice.STAGES)));
  assert.equal(browser.FormShapePractice.getStage('sphere').id, 'sphere');
});
