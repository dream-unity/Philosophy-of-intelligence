const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let game;
before(async () => {
  game = await import('../zelda-and-the-princess-zombie/world.mjs');
});

// Mouse and touch look both set a heading before locomotion. Walk every metre
// through tick so these runs also cover geography, enemies and the race clock.
const frame = 1 / 24;
function distance(player, x, z) {
  return Math.hypot(x - player.x, z - player.z);
}
function walk(world, x, z, { radius = 1.2, during } = {}) {
  const budget = Math.ceil((distance(world.player, x, z) + 50) / frame);
  let stalled = 0;
  for (let step = 0; step < budget && distance(world.player, x, z) > radius; step++) {
    if (world.dialogue || world.ending) break;
    world.player.yaw = Math.atan2(x - world.player.x, z - world.player.z);
    if (during) during(world);
    const { x: previousX, z: previousZ } = world.player;
    game.tick(world, frame, { forward: 1, sprint: true });
    stalled = distance(world.player, previousX, previousZ) < 0.01 ? stalled + frame : 0;
    if (stalled > 1) break;
  }
}
function advance(world, seconds) {
  for (let i = 0; i < Math.ceil(seconds / frame); i++) game.tick(world, frame, {});
}

function at(world, x, z, options = {}) {
  walk(world, x, z, options);
  assert.ok(
    distance(world.player, x, z) <= (options.radius || 1.2),
    `Could not reach ${x}, ${z} from ${world.player.x.toFixed(2)}, ${world.player.z.toFixed(2)} after ${world.elapsed.toFixed(1)}s (${world.ending?.id || world.dialogue?.kind || world.notice})`
  );
}
function meetWitch() {
  const world = game.createWorld();
  walk(world, 0, 9);
  assert.equal(world.dialogue?.question, 'Do you know where Princess Xero is?');
  assert.deepEqual(
    world.dialogue.choices.map((choice) => choice.id),
    [1, 2, 3]
  );
  return world;
}
function defend(world) {
  const approaching = world.actors.find(
    (actor) =>
      actor.alive &&
      ['wolf', 'dragon', 'troll'].includes(actor.type) &&
      distance(world.player, actor.x, actor.z) < 17
  );
  if (approaching && world.potions) {
    const direction = world.player.yaw;
    world.player.yaw = Math.atan2(approaching.x - world.player.x, approaching.z - world.player.z);
    game.act(world, 'potion');
    world.player.yaw = direction;
  }
}
function faceAndUse(world, actor) {
  world.player.yaw = Math.atan2(actor.x - world.player.x, actor.z - world.player.z);
  assert.equal(game.act(world, 'interact'), true, `Cannot interact with ${actor.id}`);
}

test('all ranks begin inside the western boundary and march while Zelda stays in the clearing', () => {
  const world = game.createWorld();
  assert.ok(game.HORDE_COUNT >= 2000);
  const opening = Array.from({ length: game.HORDE_COUNT }, (_, i) => game.hordePosition(world, i));
  for (const { x, z } of opening) {
    assert.ok(x >= game.MAP.minX && x < 0 && z >= game.MAP.minZ && z <= game.MAP.maxZ);
  }
  assert.equal(new Set(opening.map(({ x, z }) => `${x},${z}`)).size, game.HORDE_COUNT);
  advance(world, 30);
  for (const i of [0, Math.floor(game.HORDE_COUNT / 2), game.HORDE_COUNT - 1]) {
    const p = game.hordePosition(world, i);
    assert.ok(distance(p, opening[i].x, opening[i].z) > 10);
  }
  advance(world, 380);
  assert.equal(world.ending?.id, 'horde');
});

test('the three spoken choices hide the unoffered route; reading and checking the map pause the race', () => {
  const world = meetWitch();
  const before = world.elapsed;
  const westernFront = game.hordePosition(world, 0);
  advance(world, 3);
  assert.equal(world.elapsed, before);
  assert.deepEqual(game.hordePosition(world, 0), westernFront);
  assert.equal(game.choose(world, 4), false);
  const offer = [
    world.dialogue.text,
    ...world.dialogue.choices.map((c) => c.label),
    game.getHUD(world).hint,
  ].join(' ');
  assert.doesNotMatch(
    offer,
    /(?:kill|strike|attack) (?:the |this )?witch|fourth (?:choice|option)|satchel|moonwater/i
  );
  game.act(world, 'close');
  assert.equal(game.act(world, 'map'), true);
  advance(world, 4);
  assert.equal(world.elapsed, before);
  assert.equal(game.act(world, 'strike'), false);
  game.act(world, 'close');
  advance(world, 1);
  assert.ok(world.elapsed > before);
});

test('ordinary rescue crosses a working sluice and ends with Xero at the table', () => {
  const world = meetWitch();
  game.choose(world, 1);
  assert.equal(world.potions, 3);
  game.act(world, 'close');
  at(world, -2, 12);
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 9 && z <= 990))
    at(world, x, z, { during: defend });
  at(world, 33.3, 993.1, { radius: 0.2 });
  walk(world, 33.3, 1018);
  assert.ok(
    world.player.z > 1008 && world.player.z < 1011,
    'the approach reaches the water but cannot cross'
  );
  at(world, 34.2, 999.1, { radius: 0.24 });
  at(world, 34.2, 993.7, { radius: 0.24 });
  const bells = world.actors.filter((a) => a.type === 'bell');
  for (const tone of ['high', 'low', 'high', 'mid']) {
    const bell = bells.find((a) => a.tone === tone);
    at(world, bell.x, bell.z - 1.85, { radius: 0.26 });
    faceAndUse(world, bell);
  }
  assert.equal(world.bridgeOpen, true);
  at(world, 32.8, 993.55, { radius: 0.24 });
  at(world, 32.8, 999.55, { radius: 0.24 });
  advance(world, 2);
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 1000 && z < 1500))
    at(world, x, z, { during: defend });
  at(world, 30, 1440);
  assert.equal(world.gateCrossed, true);
  // Winning the race protects time for exploring inside the castle.
  advance(world, Math.max(0, 401 - world.elapsed));
  assert.equal(world.ending, null);
  assert.ok(Number.isFinite(world.gateClosedAt));
  at(world, 18, 1440, { radius: 0.22 });
  at(world, 18, 1459.4, { radius: 0.22 });
  assert.match(game.getHUD(world).location, /gallery/i);
  assert.ok(world.player.feetY > game.terrainHeight(18, 1459.4) + 9);
  at(world, 12.2, 1460.15, { radius: 0.22 });
  const midRelay = { id: 'lever-mid', x: 10.2, z: 1460.15 };
  faceAndUse(world, midRelay);
  assert.ok(Number.isFinite(world.galleryOpenedAt));
  assert.ok(world.journal.some((e) => e.id === 'galleryOpen'));
  at(world, 18, 1459.4, { radius: 0.22 });
  at(world, 18, 1440, { radius: 0.22 });
  at(world, 30, 1440);
  at(world, 40, 1463);
  world.player.yaw = 0;
  for (let frame = 0; frame < 30; frame++) game.tick(world, 0.05, { forward: 1, sprint: true });
  assert.ok(world.player.z < 1466, 'the banquet hall wall blocks the player beside its open arch');
  at(world, 30, 1463);
  at(world, 30, 1469, { radius: 0.25 });
  at(world, 40, 1470.45, { radius: 0.23 });
  faceAndUse(world, { x: 40, z: 1472.6, id: 'register' });
  assert.ok(world.journal.some((e) => e.id === 'register'));
  game.act(world, 'close');
  at(world, 30, 1470, { radius: 0.3 });
  walk(world, 30, 1516, { during: defend });
  assert.equal(world.dialogue?.kind, 'banquet');
  assert.deepEqual(
    world.dialogue.choices.map((c) => c.id),
    [2]
  );
  assert.match(world.dialogue.text, /still alive/i);
  game.act(world, 'close');
  advance(world, 0.25);
  assert.equal(world.sequence, null);
  assert.equal(world.dialogue, null);
  faceAndUse(
    world,
    world.actors.find((a) => a.type === 'princess')
  );
  assert.equal(game.choose(world, 1), false);
  assert.equal(game.choose(world, 2), true);
  assert.equal(world.sequence?.id, 'feast');
  advance(world, 8);
  assert.equal(world.ending?.id, 'feast');
  assert.equal(world.player.health, 0);
});

test('accepting the potion binds Zelda; ordinary wandering exposes him to wildlife', () => {
  const bound = meetWitch();
  game.choose(bound, 2);
  assert.equal(bound.sequence?.id, 'bound');
  const initialHeading = bound.player.yaw;
  advance(bound, 1.5);
  assert.equal(game.act(bound, 'strike'), true);
  assert.equal(bound.sequence.resisted, true);
  advance(bound, 9);
  assert.notEqual(bound.player.yaw, initialHeading);
  assert.equal(bound.ending?.id, 'bound');
  const wanderer = meetWitch();
  game.choose(wanderer, 3);
  assert.equal(wanderer.hasMap, false);
  assert.equal(wanderer.potions, 0);
  for (const kind of ['wolf', 'troll', 'dragon'])
    assert.ok(wanderer.actors.some((a) => a.type === kind && a.alive));
  for (const [x, z] of [
    [-2, 12],
    [6, 110],
    [22, 220],
    [80, 317],
  ])
    walk(wanderer, x, z);
  advance(wanderer, 45);
  assert.equal(wanderer.ending?.id, 'wilds');
});

test('the unoffered route requires physically taking the map, filling the vial and choosing to use it on Xero', () => {
  const world = meetWitch();
  game.act(world, 'close');
  advance(world, 1.8);
  const witch = world.actors.find((a) => a.type === 'witch');
  at(world, witch.x, witch.z, { radius: 1.38 });
  world.player.yaw = Math.atan2(witch.x - world.player.x, witch.z - world.player.z);
  game.act(world, 'thrust');
  advance(world, 0.36);
  assert.equal(world.hasMap, false);
  const satchel = world.actors.find((a) => a.alive && a.type === 'satchel');
  assert.ok(satchel);
  faceAndUse(world, satchel);
  assert.equal(world.hasMap, true);
  assert.equal(world.antidote, false);
  game.act(world, 'close');
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 9 && z < 850)) at(world, x, z);
  at(world, -155, 844.35, { radius: 0.2 });
  faceAndUse(
    world,
    world.actors.find((a) => a.type === 'spring')
  );
  assert.equal(world.antidote, true);
  game.act(world, 'close');
  // Walk around the stone basin after filling the vial, then cross on foot at the ford.
  at(world, -148, 844, { radius: 0.25 });
  at(world, -148, 855, { radius: 0.25 });
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 850)) at(world, x, z, { radius: 0.38 });
  assert.equal(world.bridgeOpen, false, 'the ford is an independent physical crossing');
  walk(world, 30, 1516);
  assert.equal(world.dialogue?.kind, 'banquet');
  const savedAtGate = JSON.parse(JSON.stringify(world));
  game.choose(world, 1);
  advance(world, 12);
  assert.equal(world.ending?.id, 'saved');
  assert.ok(world.events.some((e) => e.type === 'release' && e.text === 'hart'));
  assert.ok(world.events.some((e) => e.type === 'recognition'));
  assert.equal(world.actors.find((actor) => actor.type === 'princess').cured, true);
  assert.equal(world.ropeFallen, true);
  game.resumeCheckpoint(savedAtGate);
  assert.equal(savedAtGate.ending, null);
  assert.ok(savedAtGate.antidote);
  walk(savedAtGate, 30, 1516);
  game.choose(savedAtGate, 2);
  advance(savedAtGate, 7);
  assert.equal(savedAtGate.ending?.id, 'feast');
});

test('a player who chose to wander can remain in the forest after the castle gate closes', () => {
  const world = meetWitch();
  game.choose(world, 3);
  advance(world, 403);
  assert.ok(Number.isFinite(world.gateClosedAt));
  assert.equal(world.ending, null);
  assert.equal(world.gateCrossed, false);
  at(world, -2, 12);
  at(world, 6, 110);
  assert.equal(world.ending, null);
});

test('reading the witch’s directions again or taking her bag later cannot refill spent cinder phials', () => {
  const world = meetWitch();
  game.choose(world, 1);
  game.act(world, 'close');
  const witch = world.actors.find((a) => a.type === 'witch');
  at(world, witch.x, witch.z, { radius: 1.38 });
  world.player.yaw = Math.atan2(witch.x - world.player.x, witch.z - world.player.z);
  assert.equal(game.act(world, 'potion'), true);
  assert.equal(world.potions, 2);
  faceAndUse(world, witch);
  assert.equal(world.dialogue.kind, 'directions');
  game.act(world, 'close');
  assert.equal(world.potions, 2);
  game.act(world, 'thrust');
  advance(world, 0.4);
  faceAndUse(
    world,
    world.actors.find((a) => a.type === 'satchel' && a.alive)
  );
  assert.equal(world.hasVial, true);
  assert.equal(world.hasMap, true);
  assert.equal(world.potions, 2);
});

test('movement, acceleration and stamina progress by elapsed simulation time at different update rates', () => {
  function move(step) {
    const w = game.createWorld();
    // Walk away from the first meeting so no dialogue interrupts the clock.
    for (let i = 0; i < Math.round(3 / step); i++) game.tick(w, step, { forward: -1 });
    return w.player;
  }
  const fast = move(1 / 60),
    slow = move(1 / 10);
  assert.ok(fast.z < -6 && slow.z < -6);
  assert.ok(Math.abs(fast.z - slow.z) < 0.15);
  assert.ok(Math.abs(fast.speed - slow.speed) < 0.02);
  assert.equal(fast.stamina, slow.stamina);
});
