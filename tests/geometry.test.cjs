'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const geometry = require('../src/geometry.js');

const key = (a, b) => [a, b].sort((x, y) => x - y).join(':');

test('all fourteen stages return distinct, accessible standalone SVGs', () => {
  assert.equal(geometry.STAGE_IDS.length, 14);
  const shapes = geometry.STAGE_IDS.map(id => geometry.shapeSVG(id));
  for (let i = 0; i < shapes.length; i++) {
    const svg = shapes[i];
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-labelledby="form-geometry-\d+-title"/);
    assert.match(svg, /<title id="form-geometry-\d+-title">[^<]+<\/title>/);
    assert.match(svg, new RegExp('data-stage="' + geometry.STAGE_IDS[i] + '"'));
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|Infinity|<script|foreignObject|\son[a-z]+=/i);
  }
  assert.equal(new Set(shapes).size, 14);
});

test('the solid wireframes have the exact polyhedral topology', () => {
  const expected = {
    prism: [6, 9, 5],
    cube: [8, 12, 6],
    dodecahedron: [20, 30, 12],
    icosahedron: [12, 30, 20],
    geodesic: [42, 120, 80]
  };
  for (const [id, [vertexCount, edgeCount, faceCount]] of Object.entries(expected)) {
    const mesh = geometry.meshFor(id);
    assert.deepEqual([mesh.vertices.length, mesh.edges.length, mesh.faces.length], [vertexCount, edgeCount, faceCount], id);
    assert.equal(vertexCount - edgeCount + faceCount, 2, id + ' satisfies Euler’s formula');
    assert.equal(new Set(mesh.edges.map(([a, b]) => key(a, b))).size, edgeCount, id + ' has no duplicate edges');
    const incidence = new Map();
    for (const face of mesh.faces) {
      assert.equal(new Set(face).size, face.length);
      face.forEach((a, i) => {
        const edge = key(a, face[(i + 1) % face.length]);
        incidence.set(edge, (incidence.get(edge) || 0) + 1);
      });
    }
    for (const [a, b] of mesh.edges) {
      assert.ok(a >= 0 && a < vertexCount && b >= 0 && b < vertexCount && a !== b);
      assert.equal(incidence.get(key(a, b)), 2, id + ' has a closed surface');
    }
  }
  assert.ok(geometry.meshFor('dodecahedron').faces.every(face => face.length === 5));
  assert.ok(geometry.meshFor('icosahedron').faces.every(face => face.length === 3));
  assert.ok(geometry.meshFor('cube').faces.every(face => face.length === 4));
  assert.deepEqual(geometry.meshFor('prism').faces.map(face => face.length).sort(), [3, 3, 4, 4, 4]);
});

test('Platonic solids have equal edge lengths and their proper vertex degrees', () => {
  for (const [id, degree] of [['cube', 3], ['dodecahedron', 3], ['icosahedron', 5]]) {
    const mesh = geometry.meshFor(id);
    const lengths = mesh.edges.map(([a, b]) => Math.hypot(...mesh.vertices[a].map((value, i) => value - mesh.vertices[b][i])));
    assert.ok(Math.max(...lengths) - Math.min(...lengths) < 0.000001, id + ' edges are regular');
    for (let i = 0; i < mesh.vertices.length; i++) assert.equal(mesh.edges.filter(edge => edge.includes(i)).length, degree);
  }
});

test('mesh snapshots cannot mutate subsequent illustrations', () => {
  const mesh = geometry.meshFor('dodecahedron');
  const before = JSON.stringify(mesh);
  mesh.vertices[0][0] = 900;
  mesh.edges.pop();
  mesh.faces[0].push(300);
  assert.equal(JSON.stringify(geometry.meshFor('dodecahedron')), before);
});

test('polygon stage outlines have exactly the requested number of sides', () => {
  for (const [id, sides] of [['triangle', 3], ['square', 4], ['pentagon', 5], ['hexagon', 6], ['heptagon', 7], ['octagon', 8]]) {
    const mesh = geometry.meshFor(id);
    assert.equal(mesh.kind, 'polygon');
    assert.equal(mesh.vertices.length, sides);
    assert.equal(mesh.edges.length, sides);
  }
});

test('shape labels and colors cannot introduce executable or external SVG content', () => {
  const attack = '</title><script>alert(1)</script><image href="https://evil.example/x">';
  const svg = geometry.shapeSVG('sphere', { label: attack, color: 'url(https://evil.example/color)', size: '" onload="alert(1)', progress: Infinity });
  assert.ok(svg.includes('&lt;/title&gt;&lt;script&gt;'));
  assert.doesNotMatch(svg, /<script|<image|onload=|url\(https:|width="NaN"/);
  assert.match(svg, /stroke="#237a72"/);
  assert.match(svg, /width="240"/);
  assert.match(geometry.shapeSVG('<script>'), /data-stage="circle"/);
});

test('all document ids are unique, including repeated sphere gradients', () => {
  const document = Array.from({ length: 12 }, () => geometry.shapeSVG('sphere', { animated: true })).join('')
    + geometry.relationSVG([{ id: 'a', label: 'A' }], []);
  const ids = Array.from(document.matchAll(/\sid="([^"]+)"/g), match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});

test('progress creates bounded coral geometry and motion includes a reduced-motion override', () => {
  for (const id of geometry.STAGE_IDS) {
    const svg = geometry.shapeSVG(id, { progress: 0.45, animated: true });
    assert.match(svg, /class="form-geometry-progress"/);
    assert.match(svg, /#d87559/);
    assert.match(svg, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(svg, /requestAnimationFrame|setInterval|<animate/);
  }
  assert.doesNotMatch(geometry.shapeSVG('triangle', { progress: -5 }), /class="form-geometry-progress"/);
  assert.equal((geometry.shapeSVG('triangle', { progress: 20 }).match(/opacity="0.95"/g) || []).length, 3);
});

test('miniIcon shares the geometry and accepts a bounded display size', () => {
  assert.match(geometry.miniIcon('cube'), /width="24" height="24"/);
  assert.match(geometry.miniIcon('cube', 40), /width="40" height="40"/);
  assert.match(geometry.miniIcon('cube', -100), /width="12" height="12"/);
  assert.match(geometry.miniIcon('prism'), /Triangular prism/);
});

test('relationship maps escape content and ignore invalid nodes and edges', () => {
  const nodes = [{ id: 'a', label: 'Belief <A>' }, { id: 'b', label: 'Choice & consequence' }, { id: 'b', label: 'Duplicate' }, null];
  const edges = [{ from: 'a', to: 'b', label: '"><script>x</script>' }, { from: 'missing', to: 'b', label: 'bad' }];
  const svg = geometry.relationSVG(nodes, edges);
  assert.match(svg, /2 nodes and 1 directed relationships/);
  assert.match(svg, /Belief &lt;A&gt;/);
  assert.match(svg, /Choice &amp; consequence/);
  assert.doesNotMatch(svg, /<script|Duplicate|NaN|Infinity/);
  assert.equal((svg.match(/class="form-relation-node"/g) || []).length, 2);
  assert.equal((svg.match(/class="form-relation-edge"/g) || []).length, 1);
  assert.match(svg, /marker-end="url\(#form-relations-\d+-arrow\)"/);
});

test('relationship diagrams handle empty, self-loop and reciprocal graphs', () => {
  assert.match(geometry.relationSVG(null, null), /No relationships to display/);
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  const svg = geometry.relationSVG(nodes, [{ from: 'a', to: 'a', label: 'updates' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }], { width: 600, height: 240 });
  assert.match(svg, /viewBox="0 0 600 240"/);
  assert.equal((svg.match(/class="form-relation-edge"/g) || []).length, 3);
  assert.match(svg, /d="M[^"]+C/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test('mapping diagrams retain left and right columns and describe the proposed edges', () => {
  const nodes = [
    { id: 'left-b', label: 'First source', column: 'left' },
    { id: 'left-a', label: 'Second source', column: 'left' },
    { id: 'right-a', label: 'First target', column: 'right' },
    { id: 'right-b', label: 'Second target', column: 'right' }
  ];
  const svg = geometry.relationSVG(nodes, [{ from: 'left-b', to: 'right-b', label: 'proposed match' }], { layout: 'columns', width: 500, height: 200, label: 'Your <mapping>' });
  assert.match(svg, /<title[^>]*>Your &lt;mapping&gt;<\/title>/);
  assert.match(svg, /Connections: First source to Second target, proposed match/);
  const boxes = Object.fromEntries(Array.from(svg.matchAll(/data-relation-node="([^"]+)"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g), match => [match[1], { x: Number(match[2]), y: Number(match[3]), width: Number(match[4]) }]));
  assert.equal(boxes['left-b'].x, boxes['left-a'].x);
  assert.equal(boxes['right-a'].x, boxes['right-b'].x);
  assert.ok(boxes['left-b'].x + boxes['left-b'].width < boxes['right-a'].x);
  assert.ok(boxes['left-b'].y < boxes['left-a'].y);
  assert.ok(boxes['right-a'].y < boxes['right-b'].y);
  assert.equal(boxes['left-b'].y, boxes['right-a'].y);
  assert.doesNotMatch(svg, /\sdata-node=/);
});

test('empty construction diagrams expose their unconnected state without highlighting an answer', () => {
  const svg = geometry.relationSVG([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], []);
  assert.match(svg, /No connections selected/);
  assert.doesNotMatch(svg, /stroke="#d87559"/);
});
