const { test, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const root = '../zelda-and-the-princess-zombie/';
let sim, geo, nav, map, control, clock, travel;
before(async () => {
  [sim, geo, nav, map, control, clock, travel] = await Promise.all(
    ['world', 'geography', 'navigation', 'field-map', 'control-layout', 'game-clock', 'travel'].map(
      (p) => import(root + p + '.mjs')
    )
  );
});
afterEach(() => {
  delete globalThis.localStorage;
});
function near(w, x, z) {
  Object.assign(w.player, { x, z });
  return w;
}
function volatileStore() {
  const records = new Map(),
    blocked = new Set();
  globalThis.localStorage = {
    getItem: (k) => records.get(k) ?? null,
    setItem(k, v) {
      if (blocked.has(k)) throw Error('quota');
      records.set(k, v);
    },
  };
  return { records, blocked };
}
const store = () => import(root + 'journey-store.mjs?fixture=' + Math.random());

test('50/52–54: sketches accrue real sites and keep north up through zoom and pan', () => {
  const w = sim.createWorld();
  assert.equal(geo.course(w), null);
  assert.deepEqual(
    nav.knownLandmarks(w).map((m) => m.id),
    ['clearing']
  );
  const place = geo.LANDMARKS.find((s) => s.id === 'ridge');
  near(w, place.x, place.z);
  nav.survey(w);
  assert.deepEqual(
    nav.knownLandmarks(w).map((m) => m.id),
    ['clearing', 'ridge']
  );
  assert.ok(!nav.knownLandmarks(w).some((s) => s.id === 'ford'));
  w.hasMap = true;
  assert.ok(nav.knownLandmarks(w).some((s) => s.id === 'ford'));
  for (const [width, height] of [
    [800, 360],
    [360, 800],
  ])
    for (const zoom of [1, 4, 12]) {
      const m = map.mapProjection(width, height, w, { zoom, x: 40, z: 515 });
      assert.ok(m.point(30, 504)[1] < m.point(30, 503)[1]);
      const q = m.world(...m.point(-85, 737));
      assert.ok(Math.hypot(q[0] + 85, q[1] - 737) < 1e-9);
    }
});
test('51/56–58: remaining bell contacts are real detours; the raised deck shortens the road', () => {
  const w = near(sim.createWorld(), 30, 999);
  w.route = 'guided';
  const full = geo.course(w);
  assert.equal(full.crossing, 'sluice');
  assert.deepEqual(
    full.points.slice(1, 4).map((p) => p[0]),
    [19, 41, 30]
  );
  w.bells = ['low'];
  const two = geo.course(w);
  w.bells = ['low', 'high'];
  const one = geo.course(w);
  assert.ok(full.metres > two.metres && two.metres > one.metres);
  assert.equal(one.points[1][0], 30);
  w.bridgeOpen = true;
  w.bridgeRaisedAt = w.elapsed;
  assert.match(nav.bridgeReport(w), /Rising/);
  assert.equal(travel.barrier(w, 30, 1021), 'water');
  w.elapsed += 1.8;
  assert.match(nav.bridgeReport(w), /Raised/);
  assert.equal(travel.barrier(w, 30, 1021), '');
  const direct = geo.course(w);
  assert.ok(direct.metres < one.metres);
  assert.equal(sim.getHUD(w).distance, direct.metres);
  near(w, 30, 1100);
  w.bridgeOpen = false;
  const north = geo.course(w);
  assert.ok(!north.points.some((q) => q[1] < 1032));
});
test('51/55/107: the map selects an earned ford, and reports the host relative to known features', () => {
  const w = near(sim.createWorld(), 48, 480);
  w.route = 'guided';
  const front = sim.hordePosition(w, 0);
  assert.equal(nav.hostReport(w, front), '');
  w.milestones.ridge = true;
  assert.match(nav.hostReport(w, front), /of the gate/);
  assert.doesNotMatch(nav.hostReport(w, front), /Ford/);
  near(w, -125, 1005);
  nav.survey(w);
  assert.match(nav.hostReport(w, front), /of Pale Ford/);
  assert.equal(geo.course(w).crossing, 'ford');
  w.ropeFallen = true;
  assert.match(nav.hostReport(w, front), /turned away/);
});
test('59–61/111: the interior chart follows the journal, exposing only experienced rooms', () => {
  const w = sim.createWorld();
  w.gateCrossed = true;
  w.route = 'guided';
  assert.ok(!nav.knownLandmarks(w).some((p) => p.id === 'gallery'));
  w.journal = [{ id: 'gallery', title: 'Stair', text: 'The stair', at: 20 }];
  assert.deepEqual(
    nav.knownLandmarks(w).find((p) => p.id === 'gallery'),
    { id: 'gallery', name: 'Bellfounder’s stair', x: 18, z: 1441 }
  );
  assert.ok(!nav.knownLandmarks(w).some((p) => p.id === 'register'));
});
test('101–105: all six touch positions are independently swappable; key conflicts swap and survive reload', () => {
  const layout = control.controlLayout();
  const oldStrike = layout.slots.indexOf('strike');
  for (let i = 0; i < 6; i++) {
    control.moveTouchAction(layout, 'guard', i);
    assert.equal(layout.slots[i], 'guard');
    assert.equal(new Set(layout.slots).size, 6);
  }
  control.moveTouchAction(layout, 'run', oldStrike);
  assert.equal(layout.slots[oldStrike], 'run');
  control.rebind(layout, 'interact', 'KeyF');
  assert.equal(control.actionForKey(layout, 'KeyF'), 'interact');
  assert.equal(control.actionForKey(layout, 'KeyE'), 'strike');
  control.rebind(layout, 'guard', 'KeyW');
  assert.equal(control.actionForKey(layout, 'KeyW'), undefined);
  assert.deepEqual(control.controlLayout(JSON.parse(JSON.stringify(layout))), layout);
  assert.equal(
    new Set(
      control.controlLayout({
        slots: ['run', 'run', 'wrong'],
        keys: { potion: 'KeyF', strike: 'KeyF' },
      }).slots
    ).size,
    6
  );
});
test('109–110: three failed records retry independently without discarding fork, ending, or active state', async () => {
  const { records, blocked } = volatileStore(),
    s = await store();
  const w = sim.createWorld();
  w.runId = 'retry';
  blocked.add('xero.forest.fork.v1');
  blocked.add('xero.forest.endings.v1');
  blocked.add(s.saveKey);
  s.rememberFork(w, true);
  w.ending = { id: 'wilds', title: 'Lost', text: 'A wolf' };
  s.rememberEnding(w);
  assert.equal(s.write(s.saveKey, w), false);
  assert.equal(s.read(s.saveKey).ending.id, 'wilds');
  assert.equal(s.lasting(), false);
  blocked.delete(s.saveKey);
  blocked.delete('xero.forest.endings.v1');
  assert.equal(s.write(s.saveKey, w), true);
  assert.equal(s.lasting(), false);
  assert.equal(JSON.parse(records.get('xero.forest.endings.v1'))[0].ending.id, 'wilds');
  blocked.clear();
  assert.equal(s.retryPending(), true);
  assert.ok(records.has('xero.forest.fork.v1'));
  const reborn = await store();
  assert.equal(reborn.recallFork(reborn.restoreJourney(reborn.read(s.saveKey))).route, 'undecided');
});
test('106/109/110: a portable save preserves a live three-choice dialogue and independent fork across a storage outage', async () => {
  const { blocked } = volatileStore(),
    s = await store();
  const w = near(sim.createWorld(), 0, 7);
  w.player.yaw = 0;
  w.runId = 'exported';
  sim.act(w, 'interact');
  assert.equal(w.dialogue.kind, 'witch');
  s.rememberFork(w);
  blocked.add(s.saveKey);
  s.write(s.saveKey, w);
  const packed = JSON.parse(JSON.stringify(s.journeyFile(w)));
  const bundle = s.readJourneyFile(packed);
  assert.equal(bundle.world.player.z, 7);
  assert.deepEqual(
    bundle.world.dialogue.choices.map((c) => c.id),
    [1, 2, 3]
  );
  assert.equal(s.readJourneyFile({ ...packed, format: 'other' }), null);
  assert.ok(s.readJourneyFile({ ...packed, fork: { ...packed.fork, runId: 'other' } }).fork === null);
  assert.equal(s.applyJourneyFile(bundle), false);
  const restored = s.restoreJourney(s.read(s.saveKey));
  sim.choose(restored, 1);
  assert.equal(restored.route, 'guided');
  assert.ok(restored.potions > 0);
  assert.equal(restored.antidote, false);
  assert.equal(s.recallFork(restored).dialogue.kind, 'witch');
});
test('112/113: active simulation preserves camera and race clocks through four-second rendering stalls', () => {
  function run(frames) {
    const w = sim.createWorld();
    let debt = 0;
    for (const dt of frames) debt = clock.advanceGameClock(w, dt, debt, { forward: -0.1 }, 0.05);
    while (debt > 1 / 30 - 1e-8) debt = clock.advanceGameClock(w, 0, debt, { forward: -0.1 }, 0.05);
    return [w.elapsed, w.player.z, w.player.pitch, sim.hordePosition(w, 4).x];
  }
  assert.deepEqual(run(Array(360).fill(1 / 60)), run([4, 0.5, 1.5]));
});
