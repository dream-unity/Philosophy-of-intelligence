const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let game, mapMod, hallMod;
before(async () => {
  game = await import('../zelda-and-the-princess-zombie/world.mjs');
  mapMod = await import('../zelda-and-the-princess-zombie/field-map.mjs');
  hallMod = await import('../zelda-and-the-princess-zombie/hall.mjs');
});

// Mouse and touch look both set a heading before locomotion. Walk every metre
// through tick so these runs also cover geography, enemies and the race clock.
const frame = 1 / 24;
function distance(player, x, z) {
  return Math.hypot(x - player.x, z - player.z);
}
function walk(world, x, z, { radius = 1.2, during } = {}) {
  const budget = Math.ceil((distance(world.player, x, z) + 80) / frame);
  let stalled = 0;
  for (let step = 0; step < budget && distance(world.player, x, z) > radius; step++) {
    if (world.dialogue || world.ending) break;
    const baseYaw = Math.atan2(x - world.player.x, z - world.player.z);
    world.player.yaw = baseYaw + (stalled > 0.2 ? 0.65 : 0);
    if (during) during(world);
    const { x: previousX, z: previousZ } = world.player;
    game.tick(world, frame, { forward: 1, sprint: true });
    stalled = distance(world.player, previousX, previousZ) < 0.01 ? stalled + frame : 0;
    if (stalled > 2.2) break;
  }
}
function advance(world, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / frame); i++) game.tick(world, frame, input);
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
      distance(world.player, actor.x, actor.z) < 15
  );
  if (approaching && world.potions) {
    world.player.yaw = Math.atan2(approaching.x - world.player.x, approaching.z - world.player.z);
    game.act(world, 'potion');
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
  advance(world, game.HOURGLASS + 12);
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

test('ordinary rescue crosses a working sluice, reveals Xero safely inside the hall, and lets Escape dismiss without instant death', () => {
  const world = meetWitch();
  game.choose(world, 1);
  assert.equal(world.potions, 3);
  game.act(world, 'close');
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 9 && z <= 990))
    at(world, x, z, { during: defend, radius: 4 });
  walk(world, 30, 1018);
  assert.ok(world.player.z < 1011, 'the river must hold before the bridge opens');
  const bells = world.actors.filter((a) => a.type === 'bell');
  for (const tone of ['high', 'low', 'high', 'mid']) {
    const bell = bells.find((a) => a.tone === tone);
    at(world, bell.x, bell.z - 2.4, { radius: 2.2 });
    faceAndUse(world, bell);
  }
  assert.equal(world.bridgeOpen, true);
  advance(world, 2.5);
  assert.ok(world.bridgeProgress > 0.9, 'the bridge rises physically above the water');
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 1000 && z < 1500))
    at(world, x, z, { during: defend, radius: 4 });
  at(world, 30, 1445, { radius: 2 });
  assert.equal(world.gateCrossed, true, 'crossing the castle gate must register before the horde arrives');
  at(world, 20, 1463, { radius: 2 });
  world.player.yaw = 0;
  for (let i = 0; i < 30; i++) game.tick(world, 0.05, { forward: 1, sprint: true });
  assert.ok(world.player.z < 1466, 'the banquet hall wall blocks the player beside its open arch');
  at(world, 30, 1463, { radius: 2 });
  walk(world, 30, 1516, { during: defend, radius: 2 });
  assert.equal(world.dialogue?.kind, 'banquet');
  assert.equal(world.dialogue.choices.length, 2, 'non-cure banquet offers explicit choices instead of fatal Escape');
  assert.match(world.dialogue.text, /still alive/i);
  assert.equal(game.act(world, 'close'), true);
  assert.equal(world.sequence, null, 'pressing Escape must not trigger feast');
  assert.equal(world.ending, null);
  // Approaching Xero directly re-opens banquet choices; choosing 2 triggers feast
  at(world, 30, 1513, { radius: 2 });
  const xero = world.actors.find((a) => a.type === 'princess');
  faceAndUse(world, xero);
  assert.equal(world.dialogue?.kind, 'banquet');
  game.choose(world, 2);
  assert.equal(world.sequence?.id, 'feast');
  advance(world, 6);
  assert.equal(world.ending?.id, 'feast');
  assert.equal(world.player.health, 0);
});

test('accepting the potion binds Zelda; wandering steps the witch aside and exempts Zelda from hourglass horde loss', () => {
  const bound = meetWitch();
  game.choose(bound, 2);
  assert.equal(bound.sequence?.id, 'bound');
  const initialHeading = bound.player.yaw;
  advance(bound, 6.5);
  assert.notEqual(bound.player.yaw, initialHeading);
  assert.equal(bound.ending?.id, 'bound');

  const wanderer = meetWitch();
  const witchStartX = wanderer.actors[0].x;
  game.choose(wanderer, 3);
  assert.equal(wanderer.hasMap, false);
  assert.equal(wanderer.potions, 0);
  game.act(wanderer, 'close');
  advance(wanderer, 2.2);
  assert.ok(Math.abs(wanderer.actors[0].x - witchStartX) > 2.5, 'witch physically steps aside on Option 3');
  for (const kind of ['wolf', 'troll', 'dragon'])
    assert.ok(wanderer.actors.some((a) => a.type === kind && a.alive));
  // Hourglass expiration seals castle gate instead of killing a wanderer
  wanderer.elapsed = game.HOURGLASS - 0.1;
  advance(wanderer, 0.5);
  assert.equal(wanderer.gateClosed, true);
  assert.equal(wanderer.ending, null, 'wanderer must not get forced horde game-over');
  // Wildlife still threatens the wanderer
  for (const [rx, rz] of game.MAP.road.filter(([, z]) => z > 9 && z <= 310)) at(wanderer, rx, rz, { radius: 4 });
  walk(wanderer, 80, 303, { radius: 4 });
  advance(wanderer, 30);
  assert.equal(wanderer.ending?.id, 'wilds');
});

test('the unoffered route requires striking the witch during active swing, taking the map, filling the vial, and using it on Xero', () => {
  const world = meetWitch();
  game.act(world, 'close');
  at(world, 0, 6.4, { radius: 0.5 });
  world.player.yaw = Math.atan2(world.actors[0].x - world.player.x, world.actors[0].z - world.player.z);
  assert.equal(game.getHUD(world).hint, 'Speak to the witch');
  assert.equal(game.act(world, 'strike'), true);
  // Active blade timing passes through target after windup
  advance(world, 0.25);
  assert.equal(world.actors[0].alive, false, 'witch falls during active swing phase');
  assert.equal(world.hasMap, false);
  const satchel = world.actors.find((a) => a.alive && a.type === 'satchel');
  assert.ok(satchel);
  faceAndUse(world, satchel);
  assert.equal(world.hasMap, true);
  assert.equal(world.antidote, false);
  assert.equal(world.hasVial, true);
  game.act(world, 'close');
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 9 && z <= 850)) at(world, x, z, { radius: 4 });
  faceAndUse(
    world,
    world.actors.find((a) => a.type === 'spring')
  );
  assert.equal(world.antidote, true);
  assert.equal(world.moonwellPurified, true, 'drawing the cure purifies the Moonwell reeds');
  game.act(world, 'close');
  for (const [x, z] of game.MAP.trail.filter(([, z]) => z > 850)) at(world, x, z, { radius: 4 });
  assert.equal(world.bridgeOpen, false, 'the ford is an independent physical crossing');
  walk(world, 30, 1516, { radius: 2 });
  assert.equal(world.dialogue?.kind, 'banquet');
  const savedAtGate = JSON.parse(JSON.stringify(world));
  game.choose(world, 1);
  advance(world, 6);
  assert.equal(world.ending?.id, 'saved');
  assert.equal(world.actors.find((actor) => actor.type === 'princess').cured, true);
  assert.equal(world.ropeFallen, true);
  game.resumeCheckpoint(savedAtGate);
  assert.equal(savedAtGate.ending, null);
  assert.ok(savedAtGate.antidote);
  walk(savedAtGate, 30, 1516, { radius: 2 });
  game.choose(savedAtGate, 2);
  advance(savedAtGate, 6);
  assert.equal(savedAtGate.ending?.id, 'feast');
});

test('crossing the gate seals the horde outside instead of losing; checkpoints give winnable time margins', () => {
  const world = game.createWorld();
  world.route = 'guided';
  world.player.x = 30;
  world.player.z = game.GATE_Z + 4;
  world.elapsed = game.HOURGLASS - 0.2;
  advance(world, 0.5);
  assert.equal(world.gateCrossed, true);
  assert.equal(world.gateClosed, true);
  assert.equal(world.ending, null, 'crossing the gate wins the race even after hourglass elapses');

  // Checkpoints preserve enough time to finish
  const late = game.createWorld();
  late.route = 'guided';
  late.elapsed = game.HOURGLASS - 4;
  late.player.x = 30;
  late.player.z = 1042;
  advance(late, 0.1);
  assert.equal(late.milestones.riverSave, true);
  const cp = JSON.parse(late.checkpoint);
  assert.ok(game.HOURGLASS - cp.elapsed >= 90, 'river checkpoint must guarantee at least 90s');
});

test('banquet reveal requires being inside the Long Hall and facing Xero', () => {
  const world = game.createWorld();
  world.route = 'guided';
  // Outside the east hall wall near Xero's Z — must NOT trigger through wall
  world.player.x = 50;
  world.player.z = 1515;
  world.player.yaw = -Math.PI / 2;
  advance(world, 0.3);
  assert.equal(world.dialogue, null, 'must not trigger banquet through hall wall');

  // Inside hall at z=1498 facing SOUTH (away from Xero) — must NOT trigger
  world.player.x = 30;
  world.player.z = 1498;
  world.player.yaw = Math.PI;
  advance(world, 0.3);
  assert.equal(world.dialogue, null, 'must not trigger banquet while facing away');

  // Facing NORTH toward Xero inside hall — triggers reveal
  world.player.yaw = 0;
  advance(world, 0.2);
  assert.equal(world.dialogue?.kind, 'banquet');
});

test('honest sword physics: reach, narrow cone, vertical pitch, wall occlusion, thrust 2x, parry, and troll poise', () => {
  const world = game.createWorld();
  world.route = 'guided';
  const wolf = world.actors.find((a) => a.type === 'wolf');
  wolf.x = 0;
  wolf.z = 30;
  world.player.x = 0;
  world.player.z = 22;
  world.player.yaw = 0;
  world.player.pitch = 0;
  assert.equal(game.isTargetInSwordReach(world, wolf, 'slash'), false, '8m away is out of sword reach');

  // Move to 2.7m, facing away -> miss
  world.player.z = 27.3;
  world.player.yaw = Math.PI;
  assert.equal(game.isTargetInSwordReach(world, wolf, 'slash'), false, 'behind player must miss');

  // Facing wolf -> hit
  world.player.yaw = 0;
  assert.equal(game.isTargetInSwordReach(world, wolf, 'slash'), true, '2.7m directly ahead is in reach');

  // Vertical pitch check against dragon 3m overhead
  const dragon = world.actors.find((a) => a.type === 'dragon');
  dragon.x = 0;
  dragon.z = 30;
  world.player.x = 0;
  world.player.z = 27;
  world.player.yaw = 0;
  world.player.pitch = -0.6;
  assert.equal(game.isTargetInSwordReach(world, dragon, 'slash'), false, 'looking at feet must miss airborne dragon');
  world.player.pitch = 0.72;
  assert.equal(game.isTargetInSwordReach(world, dragon, 'slash'), true, 'aiming upward strikes airborne dragon');

  // Wall occlusion check
  const xero = world.actors.find((a) => a.type === 'princess');
  world.player.x = 46;
  world.player.z = xero.z;
  world.player.yaw = -Math.PI / 2;
  world.player.pitch = 0;
  assert.equal(game.isTargetInSwordReach(world, xero, 'slash'), false, 'cannot swing through hall wall');

  // Thrust deals 2 damage & breaks wolf in one piercing hit
  const wolf2 = world.actors.filter((a) => a.type === 'wolf')[1];
  wolf2.x = 0;
  wolf2.z = 50;
  wolf2.hp = 2;
  world.player.x = 0;
  world.player.z = 47.4;
  world.player.yaw = 0;
  world.player.pitch = 0;
  assert.equal(game.act(world, 'thrust'), true);
  advance(world, 0.6);
  assert.equal(wolf2.alive, false, 'thrust deals 2 damage');

  // Guard / Parry triggers parry event and staggers attacker without damaging Zelda
  const wolf3 = world.actors.filter((a) => a.type === 'wolf')[2];
  wolf3.x = 0;
  wolf3.z = 60;
  wolf3.state = 'windup';
  wolf3.stateUntil = world.elapsed + 0.05;
  world.player.x = 0;
  world.player.z = 58.2;
  world.player.yaw = 0;
  const hpBefore = world.player.health;
  assert.equal(game.act(world, 'guard'), true);
  advance(world, 0.15);
  assert.equal(world.player.health, hpBefore, 'timed parry negates damage');
  assert.ok(wolf3.parryWindowUntil > world.elapsed, 'parried wolf is staggered open for counter');
});

test('localized sanctuary, Pale Trail lore shelter, castle rooms, obstacles, and accessible map summary', () => {
  const world = game.createWorld();
  // Bell sanctuary is localized near bells, NOT across the entire map at z=996
  world.player.x = 30;
  world.player.z = 996;
  assert.equal(game.isPlayerSheltered(world), true, 'near the three bells is sheltered');
  world.player.x = 180;
  world.player.z = 996;
  assert.equal(game.isPlayerSheltered(world), false, '150m east of bells is NOT sheltered');

  // Pale Trail shelters even without possessing the witch's map
  world.hasMap = false;
  world.player.x = game.trailX(450);
  world.player.z = 450;
  assert.equal(game.isPlayerSheltered(world), true, 'Pale Trail ash/wolfbane wards beasts independent of map item');

  // Wrong sluice bell triggers an audible castle echo (phrase starts with 'low', so 'high' is wrong)
  const wrongBell = world.actors.find((a) => a.type === 'bell' && a.tone === 'high');
  world.player.x = wrongBell.x;
  world.player.z = wrongBell.z - 2;
  faceAndUse(world, wrongBell);
  assert.ok(world.castleEchoAt > world.elapsed, 'wrong sluice note triggers distant castle echo');

  // Solid obstacles exist in headless simulation (e.g. living witch & Moonwell pillars)
  assert.equal(game.passable(world, 0, 9), false, 'living witch has physical collision');
  assert.equal(game.passable(world, -155 + 4.5, 850), false, 'Moonwell stone pillar blocks movement');

  // Castle Cloister & Bell Gallery rooms are walkable and stairs elevate height
  assert.equal(hallMod.insideCloister(11, 1454), true);
  assert.equal(hallMod.hallWalkable(11, 1454), true);
  assert.equal(hallMod.insideGallery(49, 1456), true);
  assert.equal(hallMod.hallWalkable(49, 1456), true);
  assert.ok(hallMod.castleSurfaceHeight(49, 1456) > 2, 'Bell Gallery sits elevated at 2.4m');

  // Accessible Field Map description
  const summary = mapMod.describeFieldMap(world);
  assert.match(summary, /metres/i);
  assert.match(summary, /facing/i);
});
