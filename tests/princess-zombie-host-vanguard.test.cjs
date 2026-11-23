const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let game, fight, saves, travel, march;
before(async () => {
  [game, fight, saves, travel, march] = await Promise.all(
    ['world', 'host-encounters', 'journey-store', 'travel', 'procession'].map(
      (name) => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});
function beforeArrival() {
  const w = game.createWorld();
  Object.assign(w, { greeted: true, route: 'guided', elapsed: w.raceDuration - 0.25 });
  return w;
}
function advance(w, seconds, input) {
  const frames = Math.ceil(seconds * 30);
  for (let i = 0; i < frames; i++) game.tick(w, seconds / frames, input);
}
function fell(w, i) {
  assert.equal(fight.damageHost(w, { ...game.hordePosition(w, i), i }, 3, 'cinder'), true);
}
function firstFile(w) {
  const atGate = { ...w, elapsed: w.raceDuration };
  return Array.from({ length: 48 }, (_, id) => id).filter((id) => game.rankPosition(atGate, id).z > 1432.9);
}

test('another front walker can physically reach the iron on the original beat', () => {
  const w = beforeArrival(),
    front = firstFile(w);
  assert.ok(front.length > 1 && front.includes(0));
  const remaining = front.at(-1);
  for (const id of front.slice(0, -1)) fell(w, id);
  assert.equal(game.secondsToGate(w), 0.25);
  advance(w, 0.48);
  assert.equal(w.gateVanguard, remaining);
  assert.ok(Math.abs(w.gateClosedAt - w.raceDuration) < 1e-7);
  assert.ok(game.hordePosition(w, remaining).z >= 1432.9);
});

test('two successive vanguards cover real ground and a save preserves the second walk', () => {
  const w = beforeArrival();
  for (const id of firstFile(w)) fell(w, id);
  assert.ok(game.secondsToGate(w) > 0.8);
  advance(w, 0.38);
  assert.equal(w.gateClosedAt, null);
  const first = w.gateRelief.i,
    a = game.hordePosition(w, first);
  assert.ok(a.z < 1432.8);
  advance(w, 0.23);
  const b = game.hordePosition(w, first);
  assert.ok(b.z - a.z > 0.27 && b.z - a.z < 0.45);
  fell(w, first);
  advance(w, 0.1);
  const second = w.gateRelief.i;
  assert.notEqual(first, second);
  assert.equal(w.gateClosedAt, null);
  const saved = saves.restoreJourney(w);
  assert.ok(saved);
  assert.deepEqual(game.hordePosition(saved, second), game.hordePosition(w, second));
  for (const world of [w, saved]) {
    advance(world, 1.35);
    assert.equal(world.gateVanguard, second);
    assert.equal(world.hostFallen[first], true);
    assert.ok(world.gateClosedAt > world.raceDuration + 0.9);
    assert.ok(game.hordePosition(world, second).z > 1432.7);
  }
  assert.equal(saved.gateClosedAt, w.gateClosedAt);
});

test('drawing the last front walker away also delays the gate', () => {
  const w = beforeArrival(),
    front = firstFile(w);
  for (const id of front.slice(1)) fell(w, id);
  const id = front[0],
    q = game.hordePosition(w, id);
  assert.equal(fight.damageHost(w, { ...q, i: id }, 1), true);
  Object.assign(w.hostActors[id], { x: q.x - 15, z: q.z - 7 });
  advance(w, 0.5);
  assert.equal(w.hostActors[id].hp, 2);
  assert.equal(w.gateClosedAt, null);
  assert.notEqual(w.gateRelief.i, id);
  assert.ok(game.secondsToGate(w) > 0.3);
});

test('an exhausted host leaves a passable gate, produces no gate loss, and cannot attend a feast', () => {
  const w = beforeArrival();
  w.hostFallen = Object.fromEntries(Array.from({ length: game.HORDE_COUNT }, (_, i) => [i, true]));
  assert.equal(game.secondsToGate(w), Infinity);
  advance(w, 9);
  assert.equal(w.gateClosedAt, null);
  assert.equal(w.ending, null);
  assert.ok(w.events.every((e) => e.type !== 'gate' && e.id !== 'close'));
  Object.assign(w.player, { x: 30, z: 1434.6, yaw: 0, feetY: travel.footHeight(w, 30, 1434.6) });
  advance(w, 1.0, { forward: 1 });
  assert.equal(w.gateCrossed, true);
  assert.ok(w.player.z > 1435);
  w.ending = { id: 'feast' };
  assert.equal(game.feastAftermath(w), null);
});

test('if only the woodcutters survive, the nearest real patrol finishes the western spur', () => {
  const w = beforeArrival();
  w.hostFallen = Object.fromEntries(Array.from({ length: game.HORDE_COUNT }, (_, i) => [i, true]));
  for (const id of march.roadFileIds) delete w.hostFallen[id];
  const remaining = game.secondsToGate(w);
  const expected = march.roadFileIds[6];
  const start = game.hordePosition(w, expected);
  advance(w, 0.48);
  assert.equal(w.gateRelief.i, expected);
  assert.equal(w.gateClosedAt, null);
  assert.ok(
    Math.hypot(game.hordePosition(w, expected).x - start.x, game.hordePosition(w, expected).z - start.z) < 1
  );
  assert.ok(remaining > 40 && remaining < 90);
  advance(w, remaining);
  assert.ok(Math.abs(w.gateClosedAt - (w.raceDuration - 0.25 + remaining)) < 0.06);
  assert.equal(w.gateVanguard, expected);
  assert.ok(game.hordePosition(w, expected).z > 1432.9);
});

test('a timely Last Bell at the falling grille leaves a real way into the courtyard', () => {
  const w = game.createWorld();
  Object.assign(w, { route: 'unbound', hasMap: true, greeted: true, elapsed: 440, gateClosedAt: 438.5, lastBellCastAt: 440 });
  Object.assign(w.player, { x: 33.55, z: 1432.65, yaw: 0 });
  assert.equal(game.act(w, 'interact'), true);
  assert.equal(w.wicketAt, 440);
  advance(w, 0.65);
  for (let n = 0; n < 75 && !w.gateCrossed; n++) game.tick(w, 1 / 30, {forward: 1});
  assert.ok(w.gateCrossed);
  assert.equal(w.gateClosedAt, 438.5);
  assert.ok(!w.ending);
  assert.ok(game.getHUD(w).distance < 100);
});
