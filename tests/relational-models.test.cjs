'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const models = require('../src/relational-models.js');

const expected = {
  circle: [2, 1], 'half-circle': [2, 2], triangle: [3, 3], square: [4, 4],
  pentagon: [5, 5], hexagon: [6, 6], heptagon: [7, 7], octagon: [8, 8],
  prism: [6, 9], cube: [8, 12], dodecahedron: [20, 30],
  icosahedron: [12, 30], geodesic: [42, 120], sphere: [42, 120]
};
const pairKey = relation => [relation.from, relation.to].sort().join('|');
function adjacency(model) {
  const graph = new Map(model.nodes.map(node => [node.id, new Set()]));
  model.relations.forEach(relation => {
    graph.get(relation.from).add(relation.to);
    graph.get(relation.to).add(relation.from);
  });
  return graph;
}
function assertConnected(graph) {
  const pending = [graph.keys().next().value];
  const visited = new Set(pending);
  while (pending.length) {
    for (const next of graph.get(pending.pop())) if (!visited.has(next)) {
      visited.add(next);
      pending.push(next);
    }
  }
  assert.equal(visited.size, graph.size);
}
function assertFaceIncidence(model, faceCount, faceSize) {
  assert.equal(model.faces.length, faceCount);
  const edges = new Map(model.relations.map(relation => [relation.id, relation]));
  const use = new Map(model.relations.map(relation => [relation.id, 0]));
  const faceSets = new Set();
  for (const face of model.faces) {
    assert.equal(face.nodes.length, faceSize);
    assert.equal(new Set(face.nodes).size, faceSize);
    assert.equal(face.relations.length, faceSize);
    assert.equal(new Set(face.relations).size, faceSize);
    const faceDegrees = new Map(face.nodes.map(id => [id, 0]));
    for (const id of face.relations) {
      const edge = edges.get(id);
      assert.ok(edge, `face refers to absent relationship ${id}`);
      assert.ok(faceDegrees.has(edge.from) && faceDegrees.has(edge.to));
      faceDegrees.set(edge.from, faceDegrees.get(edge.from) + 1);
      faceDegrees.set(edge.to, faceDegrees.get(edge.to) + 1);
      use.set(id, use.get(id) + 1);
    }
    assert.ok([...faceDegrees.values()].every(degree => degree === 2));
    faceSets.add(face.nodes.slice().sort().join('|'));
  }
  assert.equal(faceSets.size, faceCount);
  assert.ok([...use.values()].every(count => count === 2), 'every solid edge belongs to two faces');
  assert.equal(model.nodes.length - model.relations.length + faceCount, 2);
}

test('all fourteen shapes have explicit semantic models in every exercise context', () => {
  assert.deepEqual(models.STAGES.map(stage => stage.id), Object.keys(expected));
  assert.deepEqual(models.EXERCISES, ['stream', 'heart', 'body']);
  for (const [stageId, [nodeCount, relationCount]] of Object.entries(expected)) {
    for (const exercise of models.EXERCISES) {
      const model = models.getModel(stageId, exercise);
      assert.equal(model.stageId, stageId);
      assert.equal(model.exercise, exercise);
      assert.equal(model.nodeCount, nodeCount);
      assert.equal(model.relationshipCount, relationCount);
      assert.equal(model.nodes.length, nodeCount);
      assert.equal(model.relations.length, relationCount);
      assert.equal(new Set(model.nodes.map(node => node.id)).size, nodeCount);
      assert.equal(new Set(model.relations.map(relation => relation.id)).size, relationCount);
      assert.equal(new Set(model.relations.map(relation => relation.text)).size, relationCount);
      const ids = new Set(model.nodes.map(node => node.id));
      for (const relation of model.relations) {
        assert.ok(ids.has(relation.from) && ids.has(relation.to));
        assert.notEqual(relation.from, relation.to, 'Circle no longer substitutes a self-loop for an explicit relation');
        assert.ok(relation.text.length > 15);
        assert.doesNotMatch(relation.text, /<[^>]+>/);
      }
      assert.equal(new Set(model.relations.map(pairKey)).size, stageId === 'half-circle' ? 1 : relationCount);
      assertConnected(adjacency(model));
      assert.equal(model.provenance.manualEdition, '2.2');
      assert.equal(model.provenance.physiologicalMeasurement, false);
    }
  }
});

test('Circle and Half-circle count meanings, not object count or duplicate inverse wording', () => {
  const circle = models.getModel('circle', 'stream');
  assert.match(circle.relations[0].text, /Ocean.*containing environment.*boat/);
  assert.equal(circle.nodes.length, 2);
  const half = models.getModel('half-circle', 'body');
  assert.equal(pairKey(half.relations[0]), pairKey(half.relations[1]));
  assert.match(half.relations[0].text, /supports/);
  assert.match(half.relations[1].text, /restricts/);
  assert.match(half.graphConvention, /semantic multigraph/);
});

test('polygons, prism and cube preserve their complete named topology', () => {
  for (const exercise of models.EXERCISES) {
    for (const stage of ['triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon']) {
      assert.ok([...adjacency(models.getModel(stage, exercise)).values()].every(neighbours => neighbours.size === 2));
    }
    for (const stage of ['prism', 'cube']) {
      const model = models.getModel(stage, exercise);
      const half = model.nodes.length / 2;
      const first = new Set(model.nodes.slice(0, half).map(node => node.id));
      const bridges = model.relations.filter(r => first.has(r.from) !== first.has(r.to));
      assert.equal(bridges.length, half);
      assert.equal(new Set(bridges.flatMap(r => [r.from, r.to])).size, model.nodes.length);
      assert.ok([...adjacency(model).values()].every(neighbours => neighbours.size === 3));
    }
  }
});

test('complete advanced models have valid shared-face incidence and declared finite topology', () => {
  for (const exercise of models.EXERCISES) {
    const dodecahedron = models.getModel('dodecahedron', exercise);
    assert.ok([...adjacency(dodecahedron).values()].every(neighbours => neighbours.size === 3));
    assertFaceIncidence(dodecahedron, 12, 5);
    const icosahedron = models.getModel('icosahedron', exercise);
    assert.ok([...adjacency(icosahedron).values()].every(neighbours => neighbours.size === 5));
    assertFaceIncidence(icosahedron, 20, 3);
    for (const stage of ['geodesic', 'sphere']) {
      const model = models.getModel(stage, exercise);
      assertFaceIncidence(model, 80, 3);
      const degrees = [...adjacency(model).values()].map(neighbours => neighbours.size).sort();
      assert.deepEqual(degrees, Array(12).fill(5).concat(Array(30).fill(6)));
      assert.equal(model.relations.filter(r => r.kind === 'mediated relationship').length, 60);
      assert.equal(model.relations.filter(r => r.kind === 'compatibility requirement').length, 60);
      assert.ok(!model.relations.some(r => /^I\d\d$/.test(r.id)), 'old direct edges are not silently retained');
    }
  }
});

test('four full states preserve counts and earlier changes without mutating their histories', () => {
  for (const stage of models.STAGES) for (const exercise of models.EXERCISES) {
    const model = models.getModel(stage.id, exercise);
    assert.equal(model.states.length, 4, `${stage.id}/${exercise} has four full registers`);
    for (const state of model.states) {
      assert.equal(state.relations.length, model.relationshipCount);
      assert.equal(state.nodes.length, model.nodeCount);
      assert.equal(new Set(state.relations.map(r => r.id)).size, model.relationshipCount);
      const ids = new Set(state.nodes.map(n => n.id));
      assert.ok(state.relations.every(r => ids.has(r.from) && ids.has(r.to)));
      assert.ok(state.changedRelationIds.every(id => state.relations.some(r => r.id === id)));
      assert.equal(models.getState(stage.id, exercise, state.breath), state);
    }
  }
  const stream = models.getModel('icosahedron', 'stream');
  assert.match(stream.states[0].relations.find(r => r.id === 'I09').text, /funds/);
  assert.match(stream.states[3].relations.find(r => r.id === 'I09').text, /withdraws/);
  assert.match(stream.states[2].relations.find(r => r.id === 'I24').text, /exclude/);
  assert.match(stream.states[3].relations.find(r => r.id === 'I24').text, /satisfied/);
  for (const exercise of models.EXERCISES) {
    const refined = models.getModel('geodesic', exercise);
    assert.deepEqual(refined.states[1].changedRelationIds, ['C13']);
    assert.deepEqual(refined.states[3].changedRelationIds, ['C22']);
    assert.equal(refined.states[3].relations.find(r => r.id === 'C13').status, 'provisionally met in construction');
    const sphere = models.getModel('sphere', exercise);
    assert.deepEqual(sphere.states[1].changedRelationIds, []);
    assert.deepEqual(sphere.states[0].relations, sphere.states[1].relations);
  }
});

test('advanced practice is explicitly prepared, and exercise models do not masquerade as physiology', () => {
  for (const exercise of models.EXERCISES) for (const stage of ['dodecahedron', 'icosahedron', 'geodesic', 'sphere']) {
    const model = models.getModel(stage, exercise);
    assert.equal(model.prepared, true);
    assert.match(model.preparation, /complete register/);
    assert.match(model.preparation, /not a claim.*ordinary inhale/);
    assert.match(model.preparation, /record-paced N = 1/);
  }
  assert.match(models.getModel('sphere', 'heart').description, /not measurements of cardiac coherence/);
  assert.match(models.getModel('sphere', 'body').description, /properties alone do not constitute/);
  for (const exercise of ['heart', 'body']) {
    const model = models.getModel('geodesic', exercise);
    const requirements = model.relations.filter(relation => relation.kind === 'compatibility requirement');
    assert.ok(requirements.every(relation => /current imagined practice must jointly honour/.test(relation.text)), 'application can fail without making the two rules intrinsically incompatible');
    assert.match(model.states[1].relations.find(relation => relation.id === 'C13').text, /practice does not jointly honour/);
  }
  assert.match(models.getModel('sphere', 'heart').states[1].inhale, /gentleness/);
  assert.match(models.getModel('sphere', 'body').states[1].inhale, /uncertainty/);
});

test('models and state snapshots are immutable; explicit updates preserve the baseline', () => {
  const model = models.getModel('geodesic', 'heart');
  assert.throws(() => { model.relations[0].text = 'changed'; }, TypeError);
  assert.throws(() => { model.states[0].relations.pop(); }, TypeError);
  const updated = models.applyChanges(model, model.fourBreaths[1].changes);
  assert.notEqual(updated.relations.find(r => r.id === 'C13').text, model.relations.find(r => r.id === 'C13').text);
  assert.equal(updated.relations.length, 120);
  assert.throws(() => models.applyChanges(model, [{relationId: 'absent', text: 'Invented link.'}]), RangeError);
  assert.throws(() => models.applyChanges(model, [{relationId: 'C13', text: ''}]), TypeError);
  assert.throws(() => models.applyChanges(model, [{relationId: 'C13', text: 'A revised meaning.', from: 'absent'}]), RangeError);
  assert.throws(() => models.getState('sphere', 'heart', 0), RangeError);
  assert.equal(models.getModel('unknown', 'unknown'), models.getModel('circle', 'stream'));
});

test('the browser can load the complete model registry offline without CommonJS', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/relational-models.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const browser = context.FormRelationalModels;
  assert.equal(browser.getModel('sphere', 'body').relations.length, 120);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.getModel('half-circle', 'stream'))), models.getModel('half-circle', 'stream'));
  assert.equal(browser.getState('sphere', 'body', 4).relations.length, 120);
});
