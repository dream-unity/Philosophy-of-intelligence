'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { STAGES, generateChallenge, evaluateChallenge, answerFor } = require('../src/curriculum.js');

const IDS = ['circle', 'half-circle', 'triangle', 'square', 'pentagon', 'hexagon', 'prism', 'heptagon', 'octagon', 'cube', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere'];
const copy = value => JSON.parse(JSON.stringify(value));

function stream(seed, lag, length, additional) {
  const history = [];
  const challenges = [];
  for (let ordinal = 0; ordinal < length; ordinal += 1) {
    const challenge = generateChallenge('square', { ...additional, seed, ordinal, lag, history });
    challenges.push(challenge);
    history.push(copy(challenge.memoryRecord));
  }
  return challenges;
}

function wrongResponse(challenge) {
  if (Array.isArray(challenge.answer)) return challenge.answer.slice().reverse();
  if (challenge.answer && typeof challenge.answer === 'object') {
    const answer = answerFor(challenge);
    const key = Object.keys(answer)[0];
    answer[key] = 'definitely-not-a-valid-answer';
    return answer;
  }
  return 'definitely-not-a-valid-answer';
}

function assertOptionSet(options, correct) {
  assert.ok(Array.isArray(options) && options.length >= 2, 'at least two answer alternatives');
  assert.equal(new Set(options.map(option => option.id)).size, options.length, 'option ids are unique');
  assert.equal(new Set(options.map(option => option.label)).size, options.length, 'visible option labels are unique');
  assert.equal(options.filter(option => option.id === correct).length, 1, 'one keyed correct answer');
  for (const option of options) {
    assert.equal(typeof option.id, 'string');
    assert.ok(typeof option.label === 'string' && option.label.length > 0);
  }
}

function assertWellFormed(challenge) {
  assert.ok(challenge.source && typeof challenge.source.body === 'string');
  assert.ok(Array.isArray(challenge.source.items));
  assert.ok(typeof challenge.prompt === 'string' && challenge.prompt.length > 10);
  assert.ok(typeof challenge.explanation === 'string' && challenge.explanation.length > 20);
  assert.ok(typeof challenge.hint === 'string' && challenge.hint.length > 10);
  assert.ok(Object.isFrozen(challenge));
  assert.ok(Object.isFrozen(challenge.source));
  assert.ok(Object.isFrozen(challenge.source.items));
  if (challenge.warmup) {
    assert.equal(challenge.kind, 'warmup');
    assert.ok(challenge.memoryRecord);
    assert.deepEqual(evaluateChallenge(challenge, answerFor(challenge)).channelResults, {});
    return;
  }
  if (challenge.kind === 'choice' || challenge.kind === 'recall') assertOptionSet(challenge.options, challenge.answer);
  if (challenge.kind === 'recall') {
    assert.ok(challenge.study && challenge.study.items.length > 0);
    assert.ok(Object.isFrozen(challenge.study));
  }
  if (challenge.kind === 'function' || challenge.kind === 'sequence') {
    assert.ok(challenge.steps.length >= 2 && challenge.steps.length <= 3);
    assert.equal(new Set(challenge.steps.map(step => step.id)).size, challenge.steps.length);
    assert.deepEqual(Object.keys(challenge.answer).sort(), challenge.steps.map(step => step.id).sort());
    for (const step of challenge.steps) assertOptionSet(step.options, challenge.answer[step.id]);
  }
  if (challenge.kind === 'connect') {
    assert.equal(challenge.answer.length, 2);
    assert.notEqual(challenge.answer[0], challenge.answer[1]);
    for (const id of challenge.answer) assert.equal(challenge.nodes.filter(node => node.id === id).length, 1);
  }
  if (challenge.kind === 'order') {
    assert.equal(challenge.answer.length, challenge.options.length);
    assert.deepEqual(challenge.answer.slice().sort(), challenge.options.map(option => option.id).sort());
  }
  if (challenge.kind === 'mapping') {
    assert.equal(challenge.left.length, challenge.right.length);
    assert.deepEqual(Object.keys(challenge.answer).sort(), challenge.left.map(item => item.id).sort());
    assert.deepEqual(Object.values(challenge.answer).sort(), challenge.right.map(item => item.id).sort());
  }
  assert.equal(evaluateChallenge(challenge, answerFor(challenge)).correct, true);
  assert.equal(evaluateChallenge(challenge, wrongResponse(challenge)).correct, false);
  assert.equal(evaluateChallenge(challenge, null).correct, false);
  const roundTripped = copy(challenge);
  assert.equal(evaluateChallenge(roundTripped, answerFor(roundTripped)).correct, true, 'JSON round trip preserves task');
}

test('the fourteen stages preserve the agreed order, labels and teaching metadata', () => {
  assert.deepEqual(STAGES.map(stage => stage.id), IDS);
  assert.deepEqual(STAGES.map(stage => stage.label), Array.from({ length: 14 }, (_, i) => 70 + 10 * i));
  assert.ok(Object.isFrozen(STAGES));
  for (const [index, stage] of STAGES.entries()) {
    assert.equal(stage.index, index);
    assert.ok(Object.isFrozen(stage));
    for (const key of ['name', 'verb', 'chapter', 'tagline', 'description', 'lesson', 'workedExample', 'breathBridge', 'lagUnit']) {
      assert.ok(typeof stage[key] === 'string' && stage[key].length > 0, `${stage.id}.${key}`);
    }
    assert.ok(stage.steps.length >= 3);
    assert.ok(stage.skills.length >= 2);
  }
  assert.equal(STAGES.find(stage => stage.id === 'square').lagUnit, 'committed observations');
  assert.ok(STAGES.filter(stage => stage.id !== 'square').every(stage => stage.lagUnit === 'not applicable'));
});

test('UMD exposes the browser API without a module loader', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/curriculum.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.FormContent.generateChallenge, 'function');
  assert.equal(sandbox.FormContent.STAGES.length, 14);
});

test('all generators are deterministic, immutable and answerable across varied seeds', () => {
  for (const stageId of IDS) {
    for (const seed of [0, 1, 17, 'harbour', '☀', 'session-27']) {
      const history = [];
      for (let ordinal = 0; ordinal < 35; ordinal += 1) {
        const input = { seed, ordinal, lag: 2, history };
        const before = copy(input);
        const first = generateChallenge(stageId, input);
        const second = generateChallenge(stageId, input);
        assert.deepEqual(first, second, `${stageId}/${seed}/${ordinal} must reproduce`);
        assert.deepEqual(input, before, 'generation must not mutate caller data');
        assertWellFormed(first);
        if (first.memoryRecord) history.push(copy(first.memoryRecord));
      }
    }
  }
});

test('answerFor returns a mutable independent answer, never the stored answer object', () => {
  for (const id of ['triangle', 'hexagon', 'prism', 'heptagon', 'cube', 'sphere']) {
    const challenge = generateChallenge(id, { seed: 9, ordinal: 4 });
    const initial = copy(challenge.answer);
    const answer = answerFor(challenge);
    assert.notEqual(answer, challenge.answer);
    if (Array.isArray(answer)) answer[0] = 'changed';
    else answer[Object.keys(answer)[0]] = 'changed';
    assert.deepEqual(challenge.answer, initial);
  }
});

test('correct answer positions and node layouts are shuffled across trials', () => {
  for (const id of IDS.filter(id => !['square', 'triangle', 'hexagon', 'prism', 'cube'].includes(id))) {
    const seen = new Set();
    for (let ordinal = 0; ordinal < 80; ordinal += 1) {
      const challenge = generateChallenge(id, { seed: 'shuffle-check', ordinal });
      const step = challenge.steps && challenge.steps[0];
      const list = step ? step.options : challenge.options;
      const answer = step ? challenge.answer[step.id] : challenge.answer;
      seen.add(list.findIndex(option => option.id === answer));
    }
    assert.ok(seen.size >= 3, `${id} correct position must vary`);
  }
  for (const id of ['triangle', 'hexagon', 'prism', 'cube']) {
    const layouts = new Set();
    for (let ordinal = 0; ordinal < 30; ordinal += 1) {
      const challenge = generateChallenge(id, { seed: 'layout-check', ordinal });
      const items = challenge.nodes || challenge.options || challenge.right;
      layouts.add(items.map(item => item.id).join(','));
    }
    assert.ok(layouts.size >= 3, `${id} layout must vary`);
  }
});

test('Square uses exact prior committed position for every lag and never includes current record in its reference', () => {
  for (const seed of [1, 17, 'source-binding']) {
    for (const lag of [1, 2, 3, 4, 6, 8, 12]) {
      const trials = stream(seed, lag, 120 + lag);
      const occurrenceIds = new Set();
      let warmups = 0;
      for (let i = 0; i < trials.length; i += 1) {
        const challenge = trials[i];
        assert.ok(!occurrenceIds.has(challenge.memoryRecord.id), 'each occurrence has a unique identity');
        occurrenceIds.add(challenge.memoryRecord.id);
        if (i < lag) {
          assert.equal(challenge.warmup, true);
          assert.equal(challenge.reference, undefined);
          assert.deepEqual(evaluateChallenge(challenge, 'continue').channelResults, {});
          warmups += 1;
          continue;
        }
        assert.notEqual(challenge.kind, 'warmup');
        assert.deepEqual(challenge.reference, trials[i - lag].memoryRecord);
        assert.notEqual(challenge.reference.id, challenge.memoryRecord.id);
        assert.equal(challenge.answer.binding, trials[i - lag].memoryRecord.id);
        assertOptionSet(challenge.steps[0].options, challenge.answer.binding);
        assertOptionSet(challenge.steps[1].options, challenge.answer.relation);
        const scored = evaluateChallenge(challenge, answerFor(challenge));
        assert.deepEqual(scored.channelResults, { binding: { correct: 1, total: 1 }, relation: { correct: 1, total: 1 } });
      }
      assert.equal(warmups, lag);
    }
  }
});

test('Square balances match and nonmatch cases rather than permitting an always-match strategy', () => {
  for (const seed of [0, 1, 2, 'balance', 'session-a', 'session-b']) {
    for (const lag of [1, 2, 5, 8]) {
      const trials = stream(seed, lag, 100 + lag).filter(challenge => !challenge.warmup);
      assert.equal(trials.length, 100);
      const matches = trials.filter(challenge => challenge.expectedClass === 'match').length;
      const nonmatches = trials.filter(challenge => challenge.expectedClass === 'nonmatch').length;
      assert.ok(matches >= 45 && matches <= 55, `${seed}/${lag}: ${matches} matches`);
      assert.equal(matches + nonmatches, 100);
      for (const challenge of trials) {
        const question = challenge.steps[1].prompt;
        const feature = question.includes('colour') ? 'color' : question.includes('shape') ? 'shape' : 'value';
        const equal = challenge.memoryRecord.features[feature] === challenge.reference.features[feature];
        assert.equal(challenge.expectedClass, equal ? 'match' : 'nonmatch', 'class must reflect supplied records');
      }
    }
  }
});

test('Square scores source identity independently of a correct comparison', () => {
  const trials = stream('separate-channels', 3, 10);
  const challenge = trials[8];
  const wrongBinding = answerFor(challenge);
  wrongBinding.binding = challenge.memoryRecord.id;
  const bindingResult = evaluateChallenge(challenge, wrongBinding);
  assert.equal(bindingResult.correct, false);
  assert.deepEqual(bindingResult.channelResults, { binding: { correct: 0, total: 1 }, relation: { correct: 1, total: 1 } });
  const wrongRelation = answerFor(challenge);
  wrongRelation.relation = challenge.answer.relation === 'match' ? 'nonmatch' : 'match';
  const relationResult = evaluateChallenge(challenge, wrongRelation);
  assert.equal(relationResult.correct, false);
  assert.deepEqual(relationResult.channelResults, { binding: { correct: 1, total: 1 }, relation: { correct: 0, total: 1 } });
});

test('guided Square focus teaches one declared feature without changing exact-lag or balance rules', () => {
  for (const focusFeature of ['color', 'shape', 'value']) {
    for (const lag of [1, 2, 4, 8]) {
      const trials = stream('focused-practice', lag, 100 + lag, { focusFeature });
      const focusLabel = focusFeature === 'color' ? 'colour' : focusFeature;
      for (const [index, challenge] of trials.entries()) {
        assert.equal(challenge.focusFeature, focusFeature);
        assert.equal(challenge.comparedFeature, focusFeature);
        assert.ok(challenge.source.body.includes('Guided focus: ' + focusLabel));
        if (challenge.warmup) {
          assert.ok(challenge.prompt.includes('comparison feature for this practice is ' + focusLabel));
          assert.deepEqual(evaluateChallenge(challenge, 'continue').channelResults, {});
          continue;
        }
        assert.deepEqual(challenge.reference, trials[index - lag].memoryRecord);
        assert.equal(challenge.answer.binding, challenge.reference.id);
        const equal = challenge.memoryRecord.features[focusFeature] === challenge.reference.features[focusFeature];
        assert.equal(challenge.answer.relation, equal ? 'match' : 'nonmatch');
        assert.equal(evaluateChallenge(challenge, answerFor(challenge)).correct, true);
      }
      const scored = trials.filter(challenge => !challenge.warmup);
      const matches = scored.filter(challenge => challenge.expectedClass === 'match').length;
      assert.ok(matches >= 45 && matches <= 55);
    }
  }
  const reference = { id: 'earlier', label: 'Earlier', features: { color: 'gold', shape: 'square', value: 5 }, locus: 'shelf' };
  const input = { seed: 25, ordinal: 1, lag: 1, history: [reference] };
  const mixed = generateChallenge('square', input);
  assert.deepEqual(generateChallenge('square', { ...input, focusFeature: null }), mixed);
  assert.deepEqual(generateChallenge('square', { ...input, focusFeature: 'invalid' }), mixed);
  assert.equal(mixed.focusFeature, null);
  assert.equal(new Set(stream('mixed-practice', 1, 100).filter(item => !item.warmup).map(item => item.comparedFeature)).size, 3);
});

test('Square occurrence binding survives repeated features and repeated labels', () => {
  const features = { color: 'blue', shape: 'triangle', value: 4 };
  const history = [
    { id: 'first-occurrence', label: 'Repeated label', features: copy(features), locus: 'window' },
    { id: 'second-occurrence', label: 'Repeated label', features: copy(features), locus: 'shelf' },
    { id: 'third-occurrence', label: 'Other label', features: copy(features), locus: 'table' }
  ];
  const original = copy(history);
  const challenge = generateChallenge('square', { seed: 2, ordinal: 3, lag: 3, history });
  assert.equal(challenge.answer.binding, 'first-occurrence');
  assert.equal(challenge.reference.id, 'first-occurrence');
  assert.deepEqual(history, original);
  assert.equal(Object.isFrozen(history[0]), false, 'caller-owned records remain caller-owned');
  const response = answerFor(challenge);
  response.binding = 'second-occurrence';
  assert.equal(evaluateChallenge(challenge, response).correct, false);
  assert.equal(new Set(challenge.steps[0].options.map(option => option.label)).size, challenge.steps[0].options.length);
});

test('Square handles a genuinely unrecorded target feature as unknown', () => {
  const challenge = generateChallenge('square', { seed: 'unknown', ordinal: 1, lag: 1, history: [{ id: 'old', label: 'Incomplete record', features: {}, locus: 'window' }] });
  assert.equal(challenge.expectedClass, 'unknown');
  assert.equal(challenge.answer.relation, 'unknown');
  assert.equal(evaluateChallenge(challenge, answerFor(challenge)).correct, true);
});

test('Half-circle hides the study binding from the recall source', () => {
  for (let ordinal = 0; ordinal < 40; ordinal += 1) {
    const challenge = generateChallenge('half-circle', { seed: 'recall', ordinal });
    const correct = challenge.options.find(option => option.id === challenge.answer).label;
    assert.ok(challenge.study.items.some(item => item.label.includes(correct)));
    assert.ok(!JSON.stringify(challenge.source).includes(correct));
  }
});

test('Circle and Half-circle keys agree with the displayed feature or study binding', () => {
  for (let ordinal = 0; ordinal < 100; ordinal += 1) {
    const circle = generateChallenge('circle', { seed: 'read-source', ordinal });
    const question = circle.prompt.match(/What is the (colour|shape|value) of (\w+)\?/);
    assert.ok(question);
    const item = circle.source.items.find(entry => entry.label.startsWith(question[2] + ':'));
    const feature = question[1] === 'colour' ? 'color' : question[1];
    const selected = circle.options.find(option => option.id === circle.answer).label;
    assert.equal(selected, String(item[feature]));

    const recall = generateChallenge('half-circle', { seed: 'read-source', ordinal });
    const location = recall.prompt.match(/at the (.+)\?/)[1];
    const binding = recall.study.items.find(entry => entry.role === location);
    const itemName = binding.label.match(/^At the .+: (.+)\.$/)[1];
    const recalled = recall.options.find(option => option.id === recall.answer).label;
    assert.equal(recalled, itemName);
  }
});

test('Triangle endpoints follow the two stated facts and directed prompt', () => {
  for (let ordinal = 0; ordinal < 100; ordinal += 1) {
    const challenge = generateChallenge('triangle', { seed: 'transitivity', ordinal });
    const edges = challenge.source.items.map(item => {
      const match = item.label.match(/^(\w+) (comes before|comes after|is taller than|is shorter than|is north of|is south of) (\w+)\.$/);
      assert.ok(match);
      const reversed = ['comes after', 'is shorter than', 'is south of'].includes(match[2]);
      return reversed ? [match[3], match[1]] : [match[1], match[3]];
    });
    const all = new Set(edges.flat());
    const high = [...all].find(name => !edges.some(edge => edge[1] === name));
    const low = [...all].find(name => !edges.some(edge => edge[0] === name));
    const reversedPrompt = /Select the (last|shortest|southernmost)/.test(challenge.prompt);
    const expectedNames = reversedPrompt ? [low, high] : [high, low];
    const selectedNames = challenge.answer.map(id => challenge.nodes.find(node => node.id === id).label);
    assert.deepEqual(selectedNames, expectedNames);
    assert.equal(challenge.givenEdges.length, 2);
    assert.ok(Object.isFrozen(challenge.givenEdges));
    for (const edge of challenge.givenEdges) {
      assert.ok(Object.isFrozen(edge));
      const from = challenge.nodes.find(node => node.id === edge.from).label;
      const to = challenge.nodes.find(node => node.id === edge.to).label;
      assert.ok(challenge.source.items.some(item => item.label === `${from} ${edge.label} ${to}.`), 'graph direction and label reproduce an actual premise');
      assert.notDeepEqual([edge.from, edge.to].slice().sort(), challenge.answer.slice().sort(), 'the inferred edge is not exposed as a given');
    }
  }
});

function sourceRoles(source, nodes) {
  const initiating = source.body.match(/(?:^|sequence: )(?:A|An) (.+?) triggers (?:a|an) (.+?)\./);
  assert.ok(initiating, 'source explicitly names cue and triggered response');
  const cue = nodes.find(node => node.label === initiating[1]);
  const response = nodes.find(node => node.label === initiating[2]);
  assert.ok(cue && response && cue.id !== response.id);
  const outcomes = nodes.filter(node => node.id !== cue.id && node.id !== response.id);
  assert.equal(outcomes.length, 1, 'one supplied event remains as the consequence');
  const outcome = outcomes[0];
  for (const word of outcome.label.split(/\s+/)) assert.ok(source.body.toLowerCase().includes(word.toLowerCase()), 'outcome vocabulary is grounded in the supplied account');
  return { cue, response, outcome };
}

test('Hexagon order and Prism mappings follow supplied roles, including misleading shared vocabulary', () => {
  let neutralOrderings = 0, falseFriendMappings = 0;
  for (let ordinal = 0; ordinal < 240; ordinal += 1) {
    const ordered = generateChallenge('hexagon', { seed: 'role-evidence', ordinal });
    const roles = sourceRoles(ordered.source, ordered.options);
    assert.deepEqual(ordered.answer, [roles.cue.id, roles.response.id, roles.outcome.id]);
    if (ordered.source.title.startsWith('Pulse model')) neutralOrderings += 1;
    assert.ok(!ordered.explanation.includes('Each event depends'), 'feedback must not convert mere temporal order into extra causal evidence');

    const mapped = generateChallenge('prism', { seed: 'role-evidence', ordinal });
    const left = sourceRoles(mapped.source, mapped.left);
    const right = sourceRoles(mapped.secondary, mapped.right);
    const independentlyMapped = {};
    for (const role of ['cue', 'response', 'outcome']) independentlyMapped[left[role].id] = right[role].id;
    assert.deepEqual(mapped.answer, independentlyMapped);

    if (mapped.source.title.startsWith('Pulse model') && mapped.secondary.title.startsWith('Pulse model')) {
      falseFriendMappings += 1;
      const lexicalMapping = {};
      for (const item of mapped.left) {
        lexicalMapping[item.id] = mapped.right.find(target => target.label === item.label).id;
        assert.notEqual(mapped.answer[item.id], lexicalMapping[item.id], 'matching the same word must fail when its role changes');
      }
      assert.equal(evaluateChallenge(mapped, lexicalMapping).correct, false);
      assert.deepEqual(evaluateChallenge(mapped, lexicalMapping).channelResults, { mapping: { correct: 0, total: 3 } });
    }
  }
  assert.ok(neutralOrderings >= 20, 'ordering includes source-defined generic tokens');
  assert.ok(falseFriendMappings >= 45, 'the mapping curriculum regularly requires more than lexical matching');
});

function accountRoles(source, nodes) {
  const prefixes = { 'Reported thought: ': 'belief', 'Stated aim: ': 'goal', 'Chosen step: ': 'action', 'Observed result: ': 'outcome' };
  const result = {};
  for (const item of source.items) {
    const prefix = Object.keys(prefixes).find(value => item.label.startsWith(value));
    assert.ok(prefix, 'provenance of each account statement is explicitly supplied');
    const role = prefixes[prefix];
    assert.equal(result[role], undefined, 'each account supplies one statement per role');
    const statement = item.label.slice(prefix.length);
    const matched = nodes.filter(node => node.label === statement);
    assert.equal(matched.length, 1);
    result[role] = matched[0];
  }
  assert.deepEqual(Object.keys(result).sort(), ['action', 'belief', 'goal', 'outcome']);
  return result;
}

test('Cube maps the explicitly reported roles and distinguishes an intended result from an actual result', () => {
  let failedExpectationCases = 0;
  for (let ordinal = 0; ordinal < 200; ordinal += 1) {
    const challenge = generateChallenge('cube', { seed: 'account-provenance', ordinal });
    const left = accountRoles(challenge.source, challenge.left);
    const right = accountRoles(challenge.secondary, challenge.right);
    const expected = {};
    for (const role of ['belief', 'goal', 'action', 'outcome']) expected[left[role].id] = right[role].id;
    assert.deepEqual(challenge.answer, expected);
    const switched = { ...expected, [left.goal.id]: right.outcome.id, [left.outcome.id]: right.goal.id };
    assert.equal(evaluateChallenge(challenge, switched).correct, false);
    assert.deepEqual(evaluateChallenge(challenge, switched).channelResults, { mapping: { correct: 2, total: 4 } });
    if ([challenge.source, challenge.secondary].some(source => /prototype trial|message exchange/.test(source.title))) failedExpectationCases += 1;
  }
  assert.ok(failedExpectationCases > 40, 'accounts include outcomes which diverge from the reported expectation');
});

test('Heptagon has exactly one rule explaining all displayed positive and negative cases', () => {
  const predicates = { both: (a, b) => a && b, either: (a, b) => a || b, 'exactly-one': (a, b) => a !== b };
  for (let ordinal = 0; ordinal < 90; ordinal += 1) {
    const challenge = generateChallenge('heptagon', { seed: 'truth-table', ordinal });
    const cases = challenge.source.items.map(item => {
      const match = item.label.match(/^(\w+) (present|absent); (\w+) (present|absent) → gate (opens|waits)\.$/);
      assert.ok(match);
      return [match[2] === 'present', match[4] === 'present', match[5] === 'opens'];
    });
    const fitted = Object.entries(predicates).filter(([, predicate]) => cases.every(([a, b, out]) => predicate(a, b) === out)).map(([id]) => id);
    assert.deepEqual(fitted, [challenge.answer.rule]);
    const next = challenge.source.body.match(/New case: \w+ (present|absent); \w+ (present|absent)\./);
    const opens = predicates[fitted[0]](next[1] === 'present', next[2] === 'present');
    assert.equal(challenge.answer.action, opens ? 'open' : 'wait');
    assert.equal(challenge.answer.effect, opens ? 'passes' : 'stays');
  }
});

test('Pentagon does not mistake missing context for uncertainty when all applicable rules agree', () => {
  let agreed = 0, unresolved = 0;
  for (let ordinal = 0; ordinal < 500; ordinal += 1) {
    const challenge = generateChallenge('pentagon', { seed: 'context', ordinal });
    if (!challenge.source.body.includes('Active mode: not supplied')) continue;
    const data = challenge.source.items.map(item => {
      const match = item.label.match(/height (\d+), weight (\d+)/);
      return { id: item.id, height: Number(match[1]), weight: Number(match[2]) };
    });
    const tallest = data[0].height > data[1].height ? data[0].id : data[1].id;
    const lightest = data[0].weight < data[1].weight ? data[0].id : data[1].id;
    if (tallest === lightest) { agreed += 1; assert.equal(challenge.answer, tallest); }
    else { unresolved += 1; assert.equal(challenge.answer, 'unknown'); }
  }
  assert.ok(agreed > 10 && unresolved > 10);
});

test('Octagon transfers the declared role and calculates only when the target is in scope', () => {
  const outcomes = new Set();
  for (let ordinal = 0; ordinal < 150; ordinal += 1) {
    const challenge = generateChallenge('octagon', { seed: 'transfer-truth', ordinal });
    const totalRecord = challenge.secondary.items.find(item => item.id === 'total').label;
    const allocatedRecord = challenge.secondary.items.find(item => item.id === 'allocated').label;
    const distinct = challenge.secondary.items.find(item => item.id === 'distinct').label;
    const total = Number(totalRecord.match(/: (\d+)\./)[1]);
    const allocated = Number(allocatedRecord.match(/: (\d+)\./)[1]);
    const mapped = challenge.steps[0].options.find(option => option.id === challenge.answer.map).label;
    assert.equal(mapped, allocatedRecord.split(':')[0]);
    const scope = distinct.startsWith('Every entry') ? 'inside' : distinct.startsWith('Some entries') ? 'outside' : 'unknown';
    assert.equal(challenge.answer.scope, scope);
    assert.equal(challenge.answer.prediction, scope === 'inside' ? 'value-' + (total - allocated) : 'no-prediction');
    assert.ok(allocated >= 3, 'overlap does not accidentally determine one unique occupied count');
    outcomes.add(scope);
    assert.deepEqual(evaluateChallenge(challenge, answerFor(challenge)).channelResults, { mapping: { correct: 1, total: 1 }, function: { correct: 2, total: 2 } });
  }
  assert.deepEqual([...outcomes].sort(), ['inside', 'outside', 'unknown']);
});

test('Dodecahedron keys follow the applicable library function, including unlisted patterns', () => {
  for (let ordinal = 0; ordinal < 100; ordinal += 1) {
    const challenge = generateChallenge('dodecahedron', { seed: 'library-truth', ordinal });
    const current = challenge.source.body.match(/Current token: (\w+), value (\d+)/);
    const pattern = current[1], value = Number(current[2]);
    const entry = challenge.source.items.find(item => item.label.startsWith('For ' + pattern + ' tokens,'));
    if (!entry) {
      assert.deepEqual(challenge.answer, { select: 'none', apply: 'unknown' });
      continue;
    }
    let result;
    if (entry.label.includes('double')) result = value * 2;
    else if (entry.label.includes('add')) result = value + Number(entry.label.match(/add (\d+)/)[1]);
    else result = value - Number(entry.label.match(/subtract (\d+)/)[1]);
    assert.deepEqual(challenge.answer, { select: entry.id, apply: 'value-' + result });
  }
});

test('Icosahedron diagnostic test uniquely separates the supplied model predictions', () => {
  for (let ordinal = 0; ordinal < 120; ordinal += 1) {
    const challenge = generateChallenge('icosahedron', { seed: 'model-truth', ordinal });
    const ruleA = challenge.source.body.match(/setting is (\w+)\./)[1];
    const ruleB = challenge.source.body.match(/marker is (\w+)\./)[1];
    const useful = challenge.steps[0].options.filter(option => {
      const trial = option.label.match(/^(\w+) with a (\w+) marker$/);
      const a = trial[1] === ruleA, b = trial[2] === ruleB;
      return a !== b;
    });
    assert.equal(useful.length, 1);
    assert.equal(challenge.answer.test, useful[0].id);
    const evidence = challenge.steps[1].prompt;
    const diagnosticCase = useful[0].label.match(/^(\w+) with a (\w+) marker$/);
    const predictionA = diagnosticCase[1] === ruleA;
    const actualResult = evidence.includes('was ON');
    const expected = evidence.includes('no recorded result') ? 'unresolved' : actualResult === predictionA ? 'model-a' : 'model-b';
    assert.equal(challenge.answer.update, expected);
    assert.notEqual(challenge.answer.update, 'proved');
  }
});

test('Geodesic diagnoses and repairs process errors, with correct traces as counterexamples', () => {
  const diagnoses = new Set();
  const lags = new Set();
  for (let ordinal = 0; ordinal < 160; ordinal += 1) {
    const challenge = generateChallenge('geodesic', { seed: 'operator-truth', ordinal });
    diagnoses.add(challenge.answer.diagnose);
    assert.equal(challenge.channel, 'revision');
    assert.deepEqual(evaluateChallenge(challenge, answerFor(challenge)).channelResults, { revision: { correct: 2, total: 2 } });
    if (challenge.source.title.includes('retrieval')) {
      const lag = Number(challenge.source.body.match(/exactly (\d+) committed/)[1]);
      lags.add(lag);
      const names = challenge.source.items.map(item => item.label.match(/: (\w+)\./)[1]);
      const target = names[names.length - lag];
      const previous = challenge.source.body.match(/Previous attempt selected (\w+)\./)[1];
      assert.equal(challenge.answer.diagnose, previous === target ? 'none' : 'lag');
      const repair = challenge.steps[1].options.find(option => option.id === challenge.answer.repair).label;
      assert.ok(repair.includes(target));
    } else if (challenge.source.title.includes('role-assignment')) {
      const rule = challenge.source.body.match(/^(?:A|An) (.+?) triggers (?:a|an) (.+?)\./);
      assert.ok(rule);
      assert.equal(challenge.answer.diagnose, 'roles');
      const repair = challenge.steps[1].options.find(option => option.id === challenge.answer.repair).label;
      assert.ok(repair.startsWith('Cue = ' + rule[1] + '; response = ' + rule[2]));
    } else {
      assert.equal(challenge.answer.diagnose, 'scope');
      assert.equal(challenge.answer.repair, 'limit-rule');
      assert.ok(challenge.source.body.includes('STRIPED'));
      assert.ok(challenge.source.items[0].label.includes('SPOTTED'));
    }
  }
  assert.deepEqual([...diagnoses].sort(), ['lag', 'none', 'roles', 'scope']);
  assert.deepEqual([...lags].sort(), [2, 3, 4]);
});

test('Sphere preserves original records and introduces revision evidence only in the final step', () => {
  const revisions = new Set();
  for (let ordinal = 0; ordinal < 60; ordinal += 1) {
    const challenge = generateChallenge('sphere', { seed: 'revision', ordinal });
    assert.ok(challenge.source.items.every(item => item.label.startsWith('LIGHT load:')));
    assert.ok(!JSON.stringify(challenge.source).includes('NEW OBSERVATION'));
    assert.ok(challenge.steps[2].prompt.startsWith('NEW OBSERVATION:'));
    const pairs = challenge.source.items.map(item => item.label.match(/input (\d+) → output (\d+)/).slice(1).map(Number));
    const candidates = challenge.steps[0].options.map(option => {
      const amount = Number(option.label.match(/\d+/)[0]);
      const apply = option.label.startsWith('Add ') ? value => value + amount : option.label.startsWith('Subtract ') ? value => value - amount : value => value * amount;
      return { id: option.id, apply };
    });
    const fitting = candidates.filter(candidate => pairs.every(([input, output]) => candidate.apply(input) === output));
    assert.equal(fitting.length, 1, 'the source must uniquely distinguish listed functions');
    const input = Number(challenge.steps[1].prompt.match(/input (\d+)/)[1]);
    assert.equal(challenge.answer.map, fitting[0].id);
    assert.equal(challenge.answer.infer, 'number-' + fitting[0].apply(input));
    const later = challenge.steps[2].prompt.match(/input (\d+) under (LIGHT|HEAVY) load produced output (\d+)/);
    const revised = later[2] === 'HEAVY' ? 'boundary' : Number(later[3]) === fitting[0].apply(Number(later[1])) ? 'retain' : 'reopen';
    assert.equal(challenge.answer.revise, revised);
    const correct = evaluateChallenge(challenge, answerFor(challenge));
    assert.deepEqual(correct.channelResults, { mapping: { correct: 1, total: 1 }, function: { correct: 1, total: 1 }, revision: { correct: 1, total: 1 } });
    revisions.add(challenge.answer.revise);
    assert.notEqual(challenge.answer.revise, 'erase');
  }
  assert.deepEqual([...revisions].sort(), ['boundary', 'reopen', 'retain']);
});

test('function choices, diagnostic directions and case classes cannot be solved from fixed verbal or ordinal shortcuts', () => {
  const functions = new Map(), combinations = new Set(), diagnosticDirections = new Set();
  const positions = { pentagon: new Set(), octagon: new Set(), dodecahedron: new Set(), icosahedron: new Set(), geodesic: new Set(), sphere: new Set() };
  for (let ordinal = 0; ordinal < 180; ordinal += 1) {
    const sphere = generateChallenge('sphere', { seed: 'anti-shortcut', ordinal });
    functions.set(sphere.answer.map, (functions.get(sphere.answer.map) || 0) + 1);
    combinations.add(sphere.answer.map + '/' + sphere.answer.revise);
    if (sphere.answer.revise === 'boundary') positions.sphere.add(ordinal % 3);

    const diagnostic = generateChallenge('icosahedron', { seed: 'anti-shortcut', ordinal });
    const ruleA = diagnostic.source.body.match(/setting is (\w+)\./)[1];
    const test = diagnostic.steps[0].options.find(option => option.id === diagnostic.answer.test).label;
    diagnosticDirections.add(test.startsWith(ruleA + ' ') ? 'A-on/B-off' : 'A-off/B-on');
    if (diagnostic.answer.update === 'unresolved') positions.icosahedron.add(ordinal % 5);

    const pentagon = generateChallenge('pentagon', { seed: 'anti-shortcut', ordinal });
    if (pentagon.source.body.includes('Active mode: not supplied')) positions.pentagon.add(ordinal % 5);
    const octagon = generateChallenge('octagon', { seed: 'anti-shortcut', ordinal });
    if (octagon.answer.scope === 'unknown') positions.octagon.add(ordinal % 5);
    const library = generateChallenge('dodecahedron', { seed: 'anti-shortcut', ordinal });
    if (library.answer.select === 'none') positions.dodecahedron.add(ordinal % 5);
    const repair = generateChallenge('geodesic', { seed: 'anti-shortcut', ordinal });
    if (repair.answer.diagnose === 'lag') positions.geodesic.add(ordinal % 4);
  }
  assert.deepEqual([...functions.keys()].sort(), ['add', 'multiply', 'subtract']);
  assert.ok([...functions.values()].every(count => count >= 25));
  assert.equal(combinations.size, 9, 'each function occurs with each revision category');
  assert.equal(diagnosticDirections.size, 2);
  for (const [stage, seen] of Object.entries(positions)) assert.ok(seen.size >= 3, `${stage} important case type must move across ordinal positions`);
});

test('all numeric function predictions have unique answers with varied ranks, including within each selected rule', () => {
  const ranks = { sphere: [0, 0, 0, 0], octagon: [0, 0, 0], dodecahedron: [0, 0, 0] };
  const ruleRanks = { add: [0, 0, 0], double: [0, 0, 0], subtract: [0, 0, 0] };
  for (const seed of ['rank-audit', 19, 'independent-numbers']) {
    for (let ordinal = 0; ordinal < 240; ordinal += 1) {
      for (const stage of ['sphere', 'octagon', 'dodecahedron']) {
        const challenge = generateChallenge(stage, { seed, ordinal });
        if (stage === 'octagon' && challenge.answer.scope !== 'inside') continue;
        if (stage === 'dodecahedron' && challenge.answer.select === 'none') continue;
        const stepId = stage === 'sphere' ? 'infer' : stage === 'octagon' ? 'prediction' : 'apply';
        const step = challenge.steps.find(item => item.id === stepId);
        const correct = Number(step.options.find(option => option.id === challenge.answer[stepId]).label);
        const numbers = step.options.map(option => Number(option.label)).filter(Number.isFinite).sort((a, b) => a - b);
        assert.equal(new Set(numbers).size, numbers.length, 'numeric alternatives are distinct');
        assert.equal(numbers.filter(value => value === correct).length, 1, 'exactly one numeric alternative is correct');
        assert.ok(numbers.every(value => value >= 0));
        if (stage === 'octagon') {
          const total = Number(challenge.secondary.items.find(item => item.id === 'total').label.match(/: (\d+)\./)[1]);
          assert.ok(numbers.every(value => value <= total), 'capacity alternatives remain within the meaningful range');
        }
        const rank = numbers.indexOf(correct);
        ranks[stage][rank] += 1;
        if (stage === 'dodecahedron') ruleRanks[challenge.answer.select][rank] += 1;
      }
    }
  }
  for (const [stage, counts] of Object.entries(ranks)) {
    const total = counts.reduce((sum, value) => sum + value, 0);
    assert.ok(counts.every(count => count > total * 0.15), `${stage} uses every numeric rank`);
    assert.ok(Math.max(...counts) / total < 0.5, `${stage} cannot be solved with a consistently favoured numeric rank`);
  }
  for (const [rule, counts] of Object.entries(ruleRanks)) {
    const total = counts.reduce((sum, value) => sum + value, 0);
    assert.ok(counts.every(count => count > total * 0.15), `${rule} uses every numeric rank even after selecting its function`);
    assert.ok(Math.max(...counts) / total < 0.5, `${rule} cannot substitute a fixed rank for calculation`);
  }
});

test('multi-part responses cannot pass by answering one subtask or adding ambiguous entries', () => {
  for (const id of ['heptagon', 'octagon', 'dodecahedron', 'icosahedron', 'geodesic', 'sphere']) {
    const challenge = generateChallenge(id, { seed: 25, ordinal: 7 });
    const answer = answerFor(challenge);
    delete answer[Object.keys(answer)[0]];
    assert.equal(evaluateChallenge(challenge, answer).correct, false);
    const extra = answerFor(challenge);
    extra.unrequested = 'extra';
    assert.equal(evaluateChallenge(challenge, extra).correct, false);
  }
  for (const id of ['prism', 'cube']) {
    const challenge = generateChallenge(id, { seed: 25, ordinal: 7 });
    const answer = answerFor(challenge);
    const keys = Object.keys(answer);
    answer[keys[1]] = answer[keys[0]];
    assert.equal(evaluateChallenge(challenge, answer).correct, false, 'mapping must be one-to-one');
  }
});

test('invalid stage/history fail explicitly; scalar options are sanitised deterministically', () => {
  assert.throws(() => generateChallenge('not-a-stage', {}), RangeError);
  assert.throws(() => generateChallenge('__proto__', {}), RangeError);
  assert.throws(() => generateChallenge('square', { history: {} }), TypeError);
  assert.throws(() => generateChallenge('square', { history: [null] }), TypeError);
  const record = { id: 'same', label: 'Duplicate', features: { color: 'blue', shape: 'circle', value: 1 } };
  assert.throws(() => generateChallenge('square', { history: [record, record] }), /distinct occurrence/);
  assert.deepEqual(generateChallenge('circle', { ordinal: -8 }), generateChallenge('circle', { ordinal: 0 }));
  assert.deepEqual(generateChallenge('circle', { ordinal: 'not a number' }), generateChallenge('circle', { ordinal: 0 }));
  assert.throws(() => answerFor(null), TypeError);
  assert.throws(() => evaluateChallenge({}, null), TypeError);
});
