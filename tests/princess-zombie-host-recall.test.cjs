const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let sim, travel;
before(async () => {
  sim = await import('../zelda-and-the-princess-zombie/world.mjs');
  travel = await import('../zelda-and-the-princess-zombie/travel.mjs');
});
function besideWalker(x, z) {
  const w = sim.createWorld();
  Object.assign(w, { elapsed: 12, greeted: true, route: 'guided', lastBell: 1 });
  Object.assign(w.player, { x, z, yaw: 0, pitch: 0, feetY: travel.footHeight(w, x, z) });
  w.hostActors = {
    41: {
      i: 41,
      type: 'host',
      hp: 2,
      state: 'pursue',
      heading: 0,
      x: x + 7,
      z: z + 1,
      seenX: x,
      seenZ: z,
      seenAt: 12,
      since: 11,
      until: 11,
    },
  };
  return w;
}
function frames(w, n) {
  for (let i = 0; i < n; i++) sim.tick(w, 1 / 30);
}
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('a bellglass draws a hunter to its landing spot; willow veil breaks the same pursuit', () => {
  for (const kind of ['lure', 'veil']) {
    const w = besideWalker(22, 213),
      hunter = w.hostActors[41];
    w.bag = { stock: { [kind]: 1 }, selected: kind };
    w.player.pitch = kind === 'veil' ? -1.05 : -0.12;
    assert.equal(sim.act(w, 'use-equipped'), true);
    for (let i = 0; i < 90 && !w.fieldMedicine?.[kind]; i++) frames(w, 1);
    const bottle = w.fieldMedicine?.[kind];
    assert.ok(bottle, 'the bottle physically landed');
    const before = gap(bottle, hunter);
    frames(w, 22);
    if (kind === 'lure') {
      assert.equal(hunter.state, 'lured');
      assert.ok(gap(bottle, hunter) < before - 0.8);
    } else assert.equal(hunter.state, 'return');
    assert.equal(w.player.health, 5);
  }
});

test('ringing the open sluice turns a hunting zombie towards the actual low bell', () => {
  const w = besideWalker(19, 993.8),
    hunter = w.hostActors[41];
  Object.assign(hunter, { x: 33, z: 993 });
  w.bridgeOpen = true;
  w.bridgeRaisedAt = 2;
  assert.equal(sim.act(w, 'interact'), true);
  assert.equal(w.sluiceDecoyAt, 12);
  const bell = w.actors.find((a) => a.tone === 'low'),
    before = gap(hunter, bell);
  frames(w, 30);
  assert.equal(hunter.state, 'lured');
  assert.ok(gap(hunter, bell) < before - 1.5);
});

test('a struck diner can retaliate in the hall while its unprovoked neighbours keep eating', async () => {
  const procession = await import('../zelda-and-the-princess-zombie/procession.mjs');
  const fight = await import('../zelda-and-the-princess-zombie/host-encounters.mjs');
  const w = sim.createWorld();
  Object.assign(w, { greeted: true, route: 'guided', gateCrossed: true, gateClosedAt: 435, elapsed: 515 });
  const diners = procession.castleGuests(w).filter((id) => procession.guestAtTable(w, id));
  assert.ok(diners.length > 1);
  const i = diners[0],
    q = sim.hordePosition(w, i);
  Object.assign(w.player, {
    x: q.x + 1,
    z: q.z,
    yaw: Math.PI / 2,
    feetY: travel.footHeight(w, q.x + 1, q.z),
  });
  frames(w, 30);
  assert.equal(w.player.health, 5);
  assert.equal(w.hostActors?.[i], undefined);
  fight.damageHost(w, { i, ...q }, 1);
  frames(w, 90);
  assert.equal(w.player.health, 4);
  assert.ok(procession.guestAtTable(w, diners[1]));
  assert.deepEqual(Object.keys(w.hostActors), [String(i)]);
});
