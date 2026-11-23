const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const game = '../zelda-and-the-princess-zombie/';
let createWorld,
  act,
  tick,
  hordePosition,
  rankPosition,
  hostWithin,
  footHeight,
  registerObstacle,
  restoreJourney,
  castleGuests;
before(async () => {
  ({ createWorld, act, tick, hordePosition, rankPosition } = await import(game + 'world.mjs'));
  ({ hostWithin } = await import(game + 'host-query.mjs'));
  ({ footHeight, registerObstacle } = await import(game + 'travel.mjs'));
  ({ restoreJourney } = await import(game + 'journey-store.mjs'));
  ({ castleGuests } = await import(game + 'procession.mjs'));
});

function road() {
  const w = createWorld();
  Object.assign(w, { elapsed: 12, greeted: true, route: 'wander', hostActors: {} });
  w.actors = w.actors.filter((a) => a.type === 'witch');
  Object.assign(w.player, { x: 22, z: 220, feetY: footHeight(w, 22, 220), yaw: 0, pitch: 0 });
  return w;
}
function walker(w, i, x, z, state = 'windup') {
  return (w.hostActors[i] = {
    i,
    type: 'host',
    x,
    z,
    hp: 2,
    state,
    heading: Math.PI,
    since: w.elapsed,
    until: w.elapsed + 3,
    seenAt: w.elapsed,
    seenX: w.player.x,
    seenZ: w.player.z,
  });
}
function frames(w, count) {
  for (let i = 0; i < count; i++) tick(w, 1 / 60);
}

test('a cut interrupts an individual attacker, a second strike fells it, and the same file stays absent on reload', () => {
  const w = road(),
    a = walker(w, 3, 22, 221.55);
  assert.equal(act(w, 'strike'), true);
  assert.equal(a.hp, 2, 'the edge must reach the body');
  frames(w, 40);
  assert.equal(a.hp, 1);
  assert.equal(a.state, 'stagger');
  assert.equal(w.attack.contact.material, 'zombie');
  assert.deepEqual(w.attack.hits, ['host3']);
  assert.equal(act(w, 'thrust'), true);
  frames(w, 40);
  assert.equal(a.state, 'fallen');
  assert.equal(w.player.health, 5);
  assert.deepEqual(
    w.events.filter((e) => e.type === 'impact' && e.text === 'zombie').map((e) => e.i),
    [3, 3]
  );
  const loaded = restoreJourney(w);
  assert.ok(loaded.hostFallen[3]);
  const rank = rankPosition(loaded, 3);
  for (const point of [a, rank])
    assert.ok(!hostWithin(loaded, point, 5, rankPosition).some((q) => q.i === 3));
});

test('a cinder jar breaks on an attacking body and its light reaches only exposed individuals', () => {
  const w = road();
  walker(w, 3, 22, 224, 'stagger');
  walker(w, 4, 20, 228, 'stagger');
  walker(w, 5, 22, 239, 'stagger');
  walker(w, 6, 26, 226.2, 'stagger');
  registerObstacle(24, 224.9, 0.84, 'stone', 3.5);
  w.potions = 1;
  assert.equal(act(w, 'potion'), true);
  assert.equal(act(w, 'potion'), false);
  frames(w, 48);
  assert.ok(
    Math.abs(w.cinder.z - 224) < 0.5 && w.cinder.y > footHeight(w, 22, 224) + 1,
    'the jar met the recoiling body in flight'
  );
  assert.deepEqual(Object.keys(w.hostFallen).sort(), ['3', '4']);
  assert.equal(w.hostActors[5].hp, 2, 'outside the burst');
  assert.equal(w.hostActors[6].hp, 2, 'protected by the stone');
  assert.equal(
    w.events.filter((e) => e.type === 'impact' && e.text === 'zombie').length,
    1,
    'one audible impact for a group'
  );
});

test('host queries resolve the same identities as a full scan along the branch roads, main march and open gate', () => {
  const w = road();
  w.gateCrossed = true;
  const differentGuests = new Set();
  // In the last seating, even the centre body used for a row's spatial
  // index leaves its neighbours and enters the hall.
  let sawDetachedCentre = false;
  for (const t of [18, 122, 286, 434, 490, 580, 705, 875, w.raceDuration + 21115]) {
    w.elapsed = t;
    if (t >= w.raceDuration) w.gateClosedAt = w.raceDuration;
    const ranks = Array.from({ length: 3072 }, (_, i) => ({ ...hordePosition(w, i), i }));
    const visitors = [...castleGuests(w)];
    for (const id of visitors) differentGuests.add(id);
    const displacedCentre = visitors.find((i) => {
      if (i % 48) return false;
      const anchor = rankPosition(w, i, true);
      return Math.hypot(anchor.x - ranks[i].x, anchor.z - ranks[i].z) > 50;
    });
    if (displacedCentre != null) sawDetachedCentre = true;
    for (const i of new Set([
      0,
      19,
      46,
      310,
      1278,
      2278,
      2398,
      3071,
      ...visitors.slice(-3),
      ...visitors.slice(0, 3),
      ...(displacedCentre == null ? [] : [displacedCentre, displacedCentre + 1]),
    ])) {
      const p = ranks[i];
      const seen = hostWithin(w, p, 11.5, rankPosition)
        .map((q) => q.i)
        .sort((a, b) => a - b);
      const expected = ranks.filter((q) => Math.hypot(p.x - q.x, p.z - q.z) <= 11.5).map((q) => q.i);
      assert.deepEqual(seen, expected);
    }
  }
  assert.ok(differentGuests.size > 6, 'several groups actually left their ranks to eat');
  assert.ok(sawDetachedCentre, 'tested the remaining row and its travelling centre separately');
});

test('aim follows a guest bending over the table, including a defender on a raised floor', async () => {
  const { actorVolumes, capsuleEntry } = await import(game + 'combat-zones.mjs');
  const a = { i: 13, id: 'host13', type: 'marcher', x: 20, z: 1480, feetY: 2.25, heading: 0 };
  const head = (state, t = 40) =>
    actorVolumes({ ...a, state, since: 39, until: 40.15 }, t).find((v) => v.name === 'head');
  const upright = head('march'),
    feeding = Array.from({ length: 24 }, (_, i) => head('feed', 40 + i * 0.25)).sort(
      (a, b) => a.a[1] - b.a[1]
    )[0];
  assert.ok(feeding.a[1] < upright.a[1] - 0.3);
  assert.ok(feeding.a[2] > upright.a[2] + 0.6);
  const from = [19.6, feeding.a[1], feeding.a[2]],
    to = [20.4, feeding.a[1], feeding.a[2]];
  assert.ok(Number.isFinite(capsuleEntry(from, to, feeding)));
  assert.equal(capsuleEntry(from, to, upright), Infinity);
});
