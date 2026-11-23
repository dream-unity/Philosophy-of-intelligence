const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let game, trees, shapes, projection, witch, mountains, lights;
before(async () => {
  [game, trees, shapes, projection, witch, mountains, lights] = await Promise.all(
    ['world', 'woodland', 'rooted-trees', 'forest-projection', 'witch-body', 'mountain-range', 'scene-light'].map(
      (n) => import('../zelda-and-the-princess-zombie/' + n + '.mjs'),
    ),
  );
});
test('turning on the spot reprojects fixed roots and crown planes on every forest detail tier', () => {
  const w = game.createWorld(),
    tree = trees.clearingPopulation[0];
  const frozen = JSON.stringify(shapes.treeRootSpans(tree)),
    crown = JSON.stringify(shapes.crownFaces(tree));
  const far = projection.distantTreeFace(tree, w.player.x, w.player.z, 1);
  const root = shapes.treeRootSpans(tree).at(-1);
  const pixel = (x, z) => {
    const s = Math.sin(w.player.yaw),
      c = Math.cos(w.player.yaw),
      dx = x - w.player.x,
      dz = z - w.player.z;
    return (dx * c - dz * s) / (dx * s + dz * c);
  };
  const x0 = pixel(root.bx, root.bz);
  w.player.yaw += Math.PI / 4;
  assert.notEqual(pixel(root.bx, root.bz), x0);
  assert.equal(JSON.stringify(shapes.treeRootSpans(tree)), frozen);
  assert.equal(JSON.stringify(shapes.crownFaces(tree)), crown);
  assert.deepEqual(projection.distantTreeFace(tree, w.player.x, w.player.z, 1), far);
  assert.ok(new Set(trees.clearingPopulation.map(shapes.treeSpecies)).size >= 4);
});
test('mountain panorama closes continuously around a bounded playable rim', () => {
  const strip = mountains.mountainStrip();
  assert.equal(strip.length, mountains.rangePanels.length * 36);
  assert.ok(strip.every(Number.isFinite));
  const first = mountains.rangePanels[0][0],
    last = mountains.rangePanels.at(-1)[1];
  assert.ok(Math.hypot(first[0] - last[0], first[2] - last[2]) < 0.001);
  assert.equal(first[3], last[3]);
  for (const [x, z] of [
    [756, 0],
    [0, -270],
    [0, 1728],
  ])
    assert.ok(game.terrainHeight(x, z) < 12);
});
test('the room sees one moving, solid witch around the full circle; the lamp lights where her hand carries it', () => {
  const w = game.createWorld(),
    actor = w.actors.find((a) => a.type === 'witch'),
    y = game.terrainHeight(actor.x, actor.z);
  w.player.x = actor.x;
  w.player.z = actor.z - 1;
  const pose = witch.witchBodyVertices(w, actor, 2, y),
    front = pose.front.slice(),
    rear = pose.back.slice();
  assert.ok(front.length > 3600 && rear.length > 3600);
  for (let i = 0; i < 4; i++) {
    w.player.yaw += Math.PI / 2;
    const next = witch.witchBodyVertices(w, actor, 2, y);
    assert.ok(next.front.every((v, j) => v === front[j]) && next.back.every((v, j) => v === rear[j]));
  }
  const zs = Array.from(front).filter((v, i) => i % 6 === 2);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 0.28);
  const lamp = witch.witchLanternPoint(w, actor, 2, y);
  assert.ok(lights.sceneLights(w, 2).some((p) => Math.hypot(p[0] - lamp[0], p[1] - lamp[1], p[2] - lamp[2]) < 1e-7));
  const later = witch.witchBodyVertices(w, actor, 3, y);
  assert.ok(later.front.some((v, i) => i % 6 < 3 && Math.abs(v - front[i]) > 0.012));
});
