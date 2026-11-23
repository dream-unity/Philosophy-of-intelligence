const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let game, charts;
before(async () => {
  game = await import('../zelda-and-the-princess-zombie/world.mjs');
  charts = await import('../zelda-and-the-princess-zombie/navigation.mjs');
});
function browserStorage(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, v) {
      values.set(key, v);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  });
  return storage;
}
function play(w, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds * 30); i++) game.tick(w, 1 / 30, input);
}

test('a fresh field survey cannot name the hidden trail, well, hall or horde before discovery', () => {
  const w = game.createWorld();
  assert.equal(game.getHUD(w).distance, null);
  assert.equal(charts.describeRace(w, 0), '');
  assert.deepEqual(
    charts.knownLandmarks(w).map((l) => l.id),
    ['clearing']
  );
  play(w, 2, { forward: 1 });
  assert.equal(w.dialogue.kind, 'witch');
  game.choose(w, 1);
  assert.ok(game.getHUD(w).distance > 1500);
  const taught = charts.knownLandmarks(w).map((l) => l.id);
  assert.ok(taught.includes('gate') && taught.includes('bells'));
  for (const id of ['chapel', 'ford', 'hall']) assert.ok(!taught.includes(id));
});

test('device storage reloads the committed decision, returns separately to the witch, and records an ending only once', async (t) => {
  browserStorage(t);
  const a = await import('../zelda-and-the-princess-zombie/journey-store.mjs?first-tab');
  const w = game.createWorld();
  w.runId = a.newRun();
  a.rememberFork(w, true);
  play(w, 2, { forward: 1 });
  assert.equal(w.dialogue.kind, 'witch');
  a.rememberFork(w);
  game.choose(w, 2);
  assert.equal(w.dialogue.kind, 'cordial');
  game.choose(w, 1);
  play(w, 10);
  a.rememberEnding(w);
  a.rememberEnding(w);
  a.write(a.saveKey, w);
  const settings = {
    quality: 'low',
    handedness: 'left',
    stickSize: 'large',
    stickHeight: 'raised',
    reduceMotion: true,
    subtitles: true,
    sensitivity: 1.3,
    mix: { music: 0.25, effects: 0.75, ambience: 0 },
  };
  a.write(a.settingsKey, settings);
  const b = await import('../zelda-and-the-princess-zombie/journey-store.mjs?second-tab');
  const saved = b.restoreJourney(b.read(b.saveKey));
  assert.equal(saved.ending.id, 'bound');
  assert.equal(saved.route, 'bound');
  assert.deepEqual(b.read(b.settingsKey), settings);
  assert.equal(b.pastJourneys().length, 1);
  assert.equal(b.hasFork(saved), true);
  const fresh = b.recallFork(saved);
  assert.notEqual(fresh.runId, saved.runId);
  assert.equal(fresh.dialogue.kind, 'witch');
  assert.equal(fresh.route, 'undecided');
  assert.equal(fresh.ending, null);
  game.choose(fresh, 3);
  assert.equal(fresh.route, 'wander');
  assert.equal(saved.route, 'bound');
  assert.equal(b.pastJourneys()[0].ending.id, 'bound');
});

test('active legacy and current saves survive reload with location, choices, and versioned physical defaults', async () => {
  const s = await import('../zelda-and-the-princess-zombie/journey-store.mjs');
  const old = game.createWorld();
  old.version = 1;
  old.greeted = true;
  old.route = 'guided';
  old.potions = 2;
  old.player.x = 30;
  old.player.z = 1478;
  old.elapsed = 236;
  delete old.gateCrossed;
  delete old.player.feetY;
  delete old.player.stamina;
  const migrated = s.restoreJourney(JSON.parse(JSON.stringify(old)));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.gateCrossed, true);
  assert.equal(migrated.player.z, 1478);
  assert.equal(migrated.potions, 2);
  assert.equal(migrated.route, 'guided');
  assert.ok(migrated.player.stamina > 0);
  assert.ok(migrated.player.feetY > 30);
  const current = game.createWorld();
  play(current, 2, { forward: 1 });
  const loaded = s.restoreJourney(JSON.parse(JSON.stringify(current)));
  assert.deepEqual(loaded.dialogue, current.dialogue);
  assert.deepEqual(loaded.player, current.player);
  for (const bad of [
    null,
    {},
    { ...old, version: 99 },
    { ...old, actors: [] },
    { ...old, player: { x: 0, z: NaN } },
  ])
    assert.equal(s.restoreJourney(bad), null);
});

test('a denied local-storage write preserves a usable tab copy and reports its durability', async (t) => {
  const storage = browserStorage(t);
  const s = await import('../zelda-and-the-princess-zombie/journey-store.mjs?denied');
  const w = game.createWorld();
  w.runId = s.newRun();
  const accepted = storage.setItem.bind(storage);
  storage.setItem = () => {
    throw new Error('quota');
  };
  assert.equal(s.write(s.saveKey, w), false);
  const originalX = w.player.x;
  w.player.x = 55;
  assert.equal(s.read(s.saveKey).player.x, originalX);
  assert.equal(s.lasting(), false);
  storage.setItem = accepted;
  assert.equal(s.write(s.saveKey, w), true);
  assert.equal(s.lasting(), true);
  assert.equal(s.read(s.saveKey).player.x, 55);
});

test('a legacy gate-approach checkpoint made seconds before expiry can be retried and physically won', () => {
  const old = game.createWorld();
  old.version = 1;
  old.route = 'guided';
  old.greeted = true;
  old.elapsed = 394.6;
  old.player.x = 30;
  old.player.z = 1393;
  old.player.yaw = 0;
  old.potions = 1;
  delete old.gateCrossed;
  delete old.player.feetY;
  const persisted = JSON.parse(JSON.stringify(old));
  delete persisted.checkpoint;
  old.checkpoint = JSON.stringify(persisted);
  old.ending = { id: 'horde' };
  old.phialFlight = { x: 0, z: 0 };
  game.resumeCheckpoint(old);
  assert.equal(old.ending, null);
  assert.equal(old.phialFlight, undefined);
  assert.ok(game.getHUD(old).secondsLeft > 8);
  // Overtake the slow front ranks in the open ground beside the road and return
  // through the actual gate gap, a few metres to the right of the procession.
  const targets = [
    [36, 1397],
    [36, 1425],
    [33, 1434],
    [33, 1440],
  ];
  let next = 0;
  for (let i = 0; i < 20 * 30 && !old.gateCrossed && next < targets.length; i++) {
    const [x, z] = targets[next];
    old.player.yaw = Math.atan2(x - old.player.x, z - old.player.z);
    game.tick(old, 1 / 30, { forward: 1, sprint: true });
    if (Math.hypot(x - old.player.x, z - old.player.z) < 0.5) next++;
  }
  assert.equal(old.gateCrossed, true);
  assert.equal(old.ending, null);
  assert.equal(old.potions, 1);
});
