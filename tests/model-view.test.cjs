'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const view = require('../src/model-view.js');
const models = require('../src/relational-models.js');
const geometry = require('../src/geometry.js');

const attrs = (svg, name) => Array.from(svg.matchAll(new RegExp('\\s' + name + '="([^"]*)"', 'g')), match => match[1]);
const pair = (a, b) => [a, b].sort((left, right) => left - right).join(':');

test('every full breath state renders each semantic relationship and role exactly once', () => {
  for (const stage of models.STAGES) for (const exercise of models.EXERCISES) {
    const model = models.getModel(stage.id, exercise);
    for (let breath = 1; breath <= 4; breath += 1) {
      const svg = view.render(model, breath);
      const relations = attrs(svg, 'data-relation');
      const roles = attrs(svg, 'data-role');
      assert.equal(relations.length, model.relationshipCount, `${stage.id}/${exercise}/${breath}`);
      assert.equal(new Set(relations).size, relations.length);
      assert.equal(roles.length, model.nodeCount);
      assert.equal(new Set(roles).size, roles.length);
      assert.deepEqual(new Set(relations), new Set(model.states[breath - 1].relations.map(relation => relation.id)));
      assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert.match(svg, /class="training-model-diagram"/);
      assert.match(svg, /role="img" aria-labelledby="form-model-view-\d+-title" aria-describedby="form-model-view-\d+-description"/);
      assert.doesNotMatch(svg, /NaN|Infinity|<script|<foreignObject|marker-end=/);
    }
  }
});

test('Circle has one link, while Half-circle renders two geometrically distinct semantic links', () => {
  const circle = view.render(models.getModel('circle', 'stream'), 1);
  assert.match(circle, /class="model-unit-frame"/);
  assert.equal(attrs(circle, 'data-relation').length, 1);
  assert.match(circle, /the frame is not another link/);
  const half = view.layoutFor(models.getModel('half-circle', 'body'), 1);
  assert.equal(half.nodes.length, 2);
  assert.equal(half.relations.length, 2);
  assert.notEqual(half.relations[0].path, half.relations[1].path);
  assert.match(half.relations[0].path, /Q340 30/);
  assert.match(half.relations[1].path, /Q340 400/);
});

test('advanced layouts map every semantic edge onto the actual geometric mesh', () => {
  for (const stage of ['dodecahedron', 'icosahedron', 'geodesic', 'sphere']) {
    const meshStage = stage === 'sphere' ? 'geodesic' : stage;
    const mesh = geometry.meshFor(meshStage);
    const geometricEdges = new Set(mesh.edges.map(([a, b]) => pair(a, b)));
    for (const exercise of models.EXERCISES) {
      const model = models.getModel(stage, exercise);
      const layout = view.layoutFor(model, 1);
      assert.equal(layout.meshStage, meshStage);
      assert.equal(new Set(layout.nodes.map(node => node.vertexIndex)).size, mesh.vertices.length);
      const positions = new Map(layout.nodes.map(node => [node.id, node]));
      const semanticEdges = new Set(layout.relations.map(relation => pair(positions.get(relation.from).vertexIndex, positions.get(relation.to).vertexIndex)));
      assert.deepEqual(semanticEdges, geometricEdges, `${stage}/${exercise} is a genuine mesh mapping`);
      for (const node of layout.nodes) {
        assert.ok(node.x >= 90 && node.x <= 590);
        assert.ok(node.y >= 45 && node.y <= 385);
      }
    }
  }
});

test('selected relationships highlight exactly their two roles without duplicating an edge', () => {
  const model = models.getModel('geodesic', 'heart');
  const svg = view.render(model, 2, 'C13');
  assert.match(svg, /data-relation="C13"[^>]*data-selected="true"/);
  const selectedRoles = Array.from(svg.matchAll(/<g class="model-role is-selected" data-role="([^"]+)"/g), match => match[1]);
  const relation = model.states[1].relations.find(item => item.id === 'C13');
  assert.deepEqual(new Set(selectedRoles), new Set([relation.from, relation.to]));
  assert.equal(attrs(svg, 'data-relation').length, 120);
  assert.match(svg, /current imagined practice does not jointly honour/);
  assert.equal((view.render(model, 2, 'not-a-relation').match(/class="model-role is-selected"/g) || []).length, 0);
});

test('state changes update labels and edge meanings while keeping positions stable', () => {
  const model = models.getModel('half-circle', 'stream');
  const first = view.layoutFor(model, 1);
  const third = view.layoutFor(model, 3);
  assert.deepEqual(first.nodes.map(n => [n.id, n.x, n.y]), third.nodes.map(n => [n.id, n.x, n.y]));
  assert.deepEqual(first.nodes.map(n => n.label), ['Ocean', 'Boat']);
  assert.deepEqual(third.nodes.map(n => n.label), ['Harbour', 'Boat']);
  assert.match(view.render(model, 3, 'R02'), /Harbour shelters boat/);
  assert.doesNotMatch(view.render(model, 3), />Ocean</);
  const sphere = models.getModel('sphere', 'body');
  assert.deepEqual(view.layoutFor(sphere, 1).relations, view.layoutFor(sphere, 2).relations);
  assert.equal((view.render(sphere, 2).match(/class="model-relation is-changed"/g) || []).length, 0);
});

test('rendered text and identifiers are escaped and document identifiers remain unique', () => {
  const hostile = {
    stageId: 'circle', title: '</title><script>alert(1)</script>',
    nodes: [{id: 'a" onload="alert(1)', label: '<img src=x onerror="x">'}, {id: 'b', label: 'Care & context'}],
    relations: [{id: 'x" onclick="alert(1)', from: 'a" onload="alert(1)', to: 'b', text: '<script>not markup</script> & meaning'}]
  };
  const svg = view.render(hostile, 1, hostile.relations[0].id);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /Care &amp; context/);
  assert.match(svg, /x&quot; onclick=&quot;alert\(1\)/);
  assert.doesNotMatch(svg, /<script|<img|\sonload="|\sonclick="|\sonerror="|<foreignObject/);
  const repeated = Array.from({length: 8}, () => view.render(models.getModel('cube', 'heart'), 1)).join('');
  const ids = attrs(repeated, 'id');
  assert.equal(ids.length, new Set(ids).size);
});

test('invalid states and dangling endpoints are rejected before rendering', () => {
  assert.throws(() => view.render(null, 1), TypeError);
  assert.throws(() => view.render(models.getModel('circle', 'stream'), 0), RangeError);
  assert.throws(() => view.render({stageId: 'circle', nodes: [{id: 'a', label: 'A'}], relations: [{id: 'R', from: 'a', to: 'missing', text: 'Invalid'}]}, 1), TypeError);
});

test('offline browser rendering needs no DOM, network or runtime geometry dependency', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/model-view.js'), 'utf8');
  const browser = vm.createContext({});
  vm.runInContext(source, browser);
  const model = JSON.parse(JSON.stringify(models.getModel('geodesic', 'stream')));
  const svg = browser.FormModelView.render(model, 4, 'C22');
  assert.equal(attrs(svg, 'data-relation').length, 120);
  assert.equal(attrs(svg, 'data-role').length, 42);
  assert.match(svg, /Terminal access and terminal turnaround/);
});
