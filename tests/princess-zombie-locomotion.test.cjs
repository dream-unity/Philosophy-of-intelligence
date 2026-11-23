const { before, test } = require('node:test');
const assert = require('node:assert/strict');

let sim, clock, travel, woods, rootGeometry;
before(async () => {
  [sim, clock, travel, woods, rootGeometry] = await Promise.all(
    ['world', 'game-clock', 'travel', 'woodland', 'rooted-trees'].map(
      (name) => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});
function road() {
  const w = sim.createWorld();
  w.greeted = true;
  Object.assign(w.player, { x: 0, z: -95, yaw: 0, feetY: travel.footHeight(w, 0, -95) });
  return w;
}
function play(w, seconds, input) {
  for (let i = 0; i < Math.round(seconds * 30); i++) sim.tick(w, 1 / 30, input);
}

test('steady walk, jog and run advance smoothly on every 30–120 Hz display frame and uneven frames', () => {
  for (const steps of [[1 / 30], [1 / 60], [1 / 90], [1 / 120], [1 / 120, 1 / 40]]) {
    for (const input of [{ forward: 1, walk: true }, { forward: 1 }, { forward: 1, sprint: true }]) {
      const w = road();
      let remaining = 0,
        now = 0,
        previous = null,
        seen = 0;
      for (let i = 0; now < 3; i++) {
        const dt = steps[i % steps.length];
        remaining = clock.advanceGameClock(w, dt, remaining, input);
        const view = clock.presentationWorld(w, remaining);
        const { x, z, gaitOffset } = view.player;
        if (previous && now > 1) {
          const speed = (z - previous.z) / dt;
          const target = input.walk ? 1.55 : input.sprint ? 6.75 : 3.95;
          assert.ok(Math.abs(speed - target) < 0.02, 'steady speed ' + speed + ' at dt ' + dt);
          assert.equal(x, 0);
          assert.ok(Math.abs(gaitOffset) <= 0.009);
          assert.ok(Math.abs(gaitOffset - previous.bob) / dt < 0.2, 'no bob snap between display frames');
          ++seen;
        }
        previous = { z, bob: gaitOffset };
        now += dt;
      }
      assert.ok(seen > 55);
    }
  }
});

test('rotation while planted preserves the camera pivot and direct touch look is immediate between steps', () => {
  const w = road();
  let remaining = 0;
  for (let i = 0; i < 500; i++) {
    const turn = 0.023;
    w.player.yaw += turn;
    remaining = clock.advanceGameClock(w, 1 / 120, remaining, {});
    const v = clock.presentationWorld(w, remaining);
    assert.equal(v.player.x, w.player.x);
    assert.equal(v.player.z, -95);
    assert.equal(v.player.yaw, w.player.yaw);
    assert.ok(Math.abs(v.player.gaitOffset || 0) < 1e-8);
  }
});
test('near-neutral stick inputs do not creep and a new direction must decelerate through a reversal', () => {
  const w = road();
  play(w, 10, { forward: 0.04, strafe: 0.04, sprint: true });
  assert.deepEqual([w.player.x, w.player.z, w.player.stamina], [0, -95, 1]);
  play(w, 1, { forward: 1 });
  const before = w.player.vz;
  sim.tick(w, 1 / 30, { forward: -1 });
  assert.ok(w.player.vz < before && w.player.vz > 0);
  play(w, 0.8, { forward: -1 });
  assert.ok(w.player.vz < -2);
});
test('no stamina is drained while running into stone and exhaustion has a genuine recovery period', () => {
  const w = road();
  Object.assign(w.player, { x: 20, z: 1433.5, feetY: travel.footHeight(w, 20, 1433.5) });
  play(w, 1, { forward: 1, sprint: true });
  const settledZ = w.player.z;
  play(w, 5, { forward: 1, sprint: true });
  assert.equal(w.player.z, settledZ);
  assert.equal(w.player.stamina, 1);

  const open = road();
  open.player.stamina = 0.02;
  play(open, 1.2, { forward: 1, sprint: true });
  assert.equal(open.player.exhausted, true);
  const switches = [];
  let previous = open.player.exhausted;
  for (let i = 0; i < 150; i++) {
    sim.tick(open, 1 / 30, { forward: 1, sprint: true });
    if (previous !== open.player.exhausted) switches.push(i);
    previous = open.player.exhausted;
  }
  assert.deepEqual(switches.length, 1);
});
test('a directional dodge spends one charge of stamina and cannot cross a wall or be spammed', () => {
  const w = road();
  assert.ok(sim.act(w, 'dodge'));
  assert.deepEqual(w.events.filter((e) => e.type === 'dodge').length, 1);
  assert.equal(sim.act(w, 'dodge'), false);
  w.player.yaw += Math.PI / 2;
  play(w, 0.3, {});
  assert.ok(w.player.z < -96 && Math.abs(w.player.x) < 0.001, 'dodge uses its original world direction');
  assert.equal(sim.act(w, 'dodge'), false);
  play(w, 0.6, {});
  assert.ok(sim.act(w, 'dodge'));
  const atWall = road();
  Object.assign(atWall.player, { x: 20, z: 1433.65, yaw: Math.PI });
  assert.equal(sim.act(atWall, 'dodge'), false);
  assert.equal(atWall.player.stamina, 1);
});
test('roots stop movement at real woody buttresses, dry ford stones hold still and a gallery cannot be scaled sideways', () => {
  const w = road();
  const tree = woods.clearingPopulation[0];
  const spans = rootGeometry.treeRootSpans(tree);
  const big = spans.find(
    (s) => Math.hypot(s.bx - tree.x, s.bz - tree.z) > rootGeometry.treeTrunkRadius(tree) + 0.5 && s.ah > 0.65
  );
  assert.ok(big);
  const x = big.ax * 0.65 + big.bx * 0.35,
    z = big.az * 0.65 + big.bz * 0.35;
  assert.equal(travel.barrier(w, x, z, 0.22), 'wood');
  assert.equal(travel.barrier(w, x, z, 0.02, false, undefined, undefined, tree.h * 0.5), '');
  Object.assign(w.player, { x: travel.fordStoneX(6), z: 1008 + 1.76 * 6 });
  const stoneX = w.player.x;
  play(w, 3, {});
  assert.equal(w.player.x, stoneX);
  assert.equal(w.player.surface, 'stone');
  Object.assign(w.player, {
    x: 15,
    z: 1454.6,
    yaw: 0,
    vx: 0,
    vz: 0,
    feetY: travel.footHeight(w, 15, 1454.6),
  });
  play(w, 1, { strafe: 1 });
  assert.ok(w.player.x < 16.05);
});

test('a legacy save inside a new root can leave the clearing while a valid save stays exactly where it was', async () => {
  const w = road();
  assert.equal(travel.recoverFooting(w), false);
  assert.equal(w.player.z, -95);
  const oak = woods.clearingPopulation[0];
  Object.assign(w.player, { x: oak.x, z: oak.z });
  assert.equal(travel.barrier(w, w.player.x, w.player.z), 'wood');
  const { restoreJourney } = await import('../zelda-and-the-princess-zombie/journey-store.mjs');
  const restored = restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.equal(travel.barrier(restored, restored.player.x, restored.player.z), '');
  assert.equal(travel.recoverFooting(w), true);
  assert.equal(travel.barrier(w, w.player.x, w.player.z), '');
  assert.ok(Math.hypot(w.player.x - oak.x, w.player.z - oak.z) < 5);
  assert.equal(travel.recoverFooting(w), false);
});
