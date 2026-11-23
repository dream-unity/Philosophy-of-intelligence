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
    `Could not reach ${x}, ${z} from ${world.player.x}, ${world.player.z}`
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
  if (approaching && world.potions) game.act(world, 'potion');
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
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 9 && z <= 990))
    at(world, x, z, { during: defend });
  walk(world, 30, 1018);
  assert.ok(world.player.z < 1011, 'the river must hold before the bridge opens');
  const bells = world.actors.filter((a) => a.type === 'bell');
  for (const tone of ['high', 'low', 'high', 'mid']) {
    const bell = bells.find((a) => a.tone === tone);
    at(world, bell.x, bell.z - 2);
    faceAndUse(world, bell);
  }
  assert.equal(world.bridgeOpen, true);
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 1000 && z < 1500))
    at(world, x, z, { during: defend });
  at(world, 30, 1445);
  at(world, 20, 1463);
  world.player.yaw = 0;
  for (let frame = 0; frame < 30; frame++) game.tick(world, 0.05, { forward: 1, sprint: true });
  assert.ok(world.player.z < 1466, 'the banquet hall wall blocks the player beside its open arch');
  at(world, 30, 1463);
  walk(world, 30, 1516, { during: defend });
  assert.equal(world.dialogue?.kind, 'banquet');
  assert.equal(world.dialogue.choices.length, 0);
  assert.match(world.dialogue.text, /still alive/i);
  game.act(world, 'close');
  assert.equal(world.sequence?.id, 'feast');
  advance(world, 5);
  assert.equal(world.ending?.id, 'feast');
  assert.equal(world.player.health, 0);
});

test('accepting the potion binds Zelda; ordinary wandering exposes him to wildlife', () => {
  const bound = meetWitch();
  game.choose(bound, 2);
  assert.equal(bound.sequence?.id, 'bound');
  const initialHeading = bound.player.yaw;
  advance(bound, 5);
  assert.notEqual(bound.player.yaw, initialHeading);
  assert.equal(bound.ending?.id, 'bound');
  const wanderer = meetWitch();
  game.choose(wanderer, 3);
  assert.equal(wanderer.hasMap, false);
  assert.equal(wanderer.potions, 0);
  for (const kind of ['wolf', 'troll', 'dragon'])
    assert.ok(wanderer.actors.some((a) => a.type === kind && a.alive));
  walk(wanderer, 80, 303);
  advance(wanderer, 24);
  assert.equal(wanderer.ending?.id, 'wilds');
});

test('the unoffered route requires physically taking the map, filling the vial and choosing to use it on Xero', () => {
  const world = meetWitch();
  game.act(world, 'close');
  at(world, 0, 5);
  assert.equal(game.getHUD(world).hint, 'Speak to the witch');
  game.act(world, 'strike');
  assert.equal(world.hasMap, false);
  const satchel = world.actors.find((a) => a.alive && a.type === 'satchel');
  assert.ok(satchel);
  faceAndUse(world, satchel);
  assert.equal(world.hasMap, true);
  assert.equal(world.antidote, false);
  game.act(world, 'close');
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 9 && z <= 850)) at(world, x, z);
  faceAndUse(
    world,
    world.actors.find((a) => a.type === 'spring')
  );
  assert.equal(world.antidote, true);
  game.act(world, 'close');
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 850)) at(world, x, z);
  assert.equal(world.bridgeOpen, false, 'the ford is an independent physical crossing');
  walk(world, 30, 1516);
  assert.equal(world.dialogue?.kind, 'banquet');
  const savedAtGate = JSON.parse(JSON.stringify(world));
  game.choose(world, 1);
  advance(world, 5);
  assert.equal(world.ending?.id, 'saved');
  assert.equal(world.actors.find((actor) => actor.type === 'princess').cured, true);
  assert.equal(world.ropeFallen, true);
  game.resumeCheckpoint(savedAtGate);
  assert.equal(savedAtGate.ending, null);
  assert.ok(savedAtGate.antidote);
  walk(savedAtGate, 30, 1516);
  game.choose(savedAtGate, 2);
  advance(savedAtGate, 5);
  assert.equal(savedAtGate.ending?.id, 'feast');
});
