const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let game, geo, travel, edge, march, wild;
before(async () => {
  [game, geo, travel, edge, march, wild] = await Promise.all(
    ['world', 'geography', 'travel', 'forest-edge', 'procession', 'wildlife'].map(
      (name) => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});
function field(x, z) {
  const w = game.createWorld();
  w.greeted = true;
  w.route = 'guided';
  Object.assign(w.player, { x, z, feetY: travel.footHeight(w, x, z), yaw: 0 });
  return w;
}
function advance(w, seconds, input = {}) {
  const n = Math.ceil(seconds * 60);
  for (let i = 0; i < n; i++) game.tick(w, seconds / n, input);
}

test('1/6/8: simultaneous arrivals are resolved at the physical plane and a winner has time inside', () => {
  const w = field(33.6, 1434.94);
  w.elapsed = w.raceDuration - 0.025;
  w.player.vz = 5.9;
  game.tick(w, 0.05, { forward: 1, sprint: true });
  assert.equal(w.gateCrossed, true);
  assert.ok(w.gateCrossedAt < w.raceDuration);
  advance(w, 6, { forward: 1 });
  assert.equal(w.ending, null);
  assert.equal(game.arrivalView(w), w);
  const late = field(33.6, 1434.82);
  late.elapsed = late.raceDuration - 0.005;
  late.player.vz = 5.9;
  game.tick(late, 0.05, { forward: 1, sprint: true });
  assert.equal(late.gateCrossed, false);
  assert.ok(travel.gateClearance(late) > 5);
  assert.equal(travel.barrier(late, 30, 1435), '');
  advance(late, 1.1);
  assert.equal(travel.barrier(late, 30, 1435), 'metal');
  advance(late, 2.5);
  assert.equal(late.ending?.id, 'horde');
  assert.equal(game.secondsToGate(game.createWorld()), 435);
  const legacy = field(40, 100);
  delete legacy.raceDuration;
  assert.equal(game.secondsToGate(legacy), 395);
});

test('2/8/9: distant players witness the falling gate without moving the saved player or bounding their forest route', () => {
  const w = field(45, 820);
  w.elapsed = w.raceDuration - 0.03;
  advance(w, 0.09);
  const rendered = game.arrivalView(w);
  assert.notEqual(rendered, w);
  assert.equal(rendered.player.z, 1418);
  assert.equal(w.player.z, 820);
  assert.equal(w.ending, null);
  w.reducedMotion = true;
  assert.equal(game.arrivalView(w), w);
  advance(w, 3.5);
  assert.equal(w.ending.id, 'horde');
  const wander = field(45, 820);
  wander.route = 'wander';
  wander.elapsed = wander.raceDuration - 0.03;
  advance(wander, 4);
  assert.equal(wander.ending, null);
  assert.equal(game.arrivalView(wander), wander);
});

test('3–5/11/12: a close princess behind the camera, a high glance or a distant clue cannot start a scene', () => {
  const w = field(30, 1515.23);
  for (const [yaw, pitch] of [
    [Math.PI, 0],
    [0, 1.03],
    [Math.PI * 0.45, 0],
  ]) {
    w.player.yaw = yaw;
    w.player.pitch = pitch;
    game.tick(w, 0.05);
    assert.equal(w.dialogue, null);
    assert.equal(game.act(w, 'interact'), false);
  }
  Object.assign(w.player, { z: 1512, yaw: 0, pitch: 0 });
  game.tick(w, 0.05);
  assert.equal(w.dialogue.kind, 'banquet');
  game.act(w, 'close');
  assert.equal(w.sequence, null);
  const remote = field(-400, 220);
  remote.player.yaw = 0;
  advance(remote, 0.1);
  assert.ok(!remote.milestones.fork);
  Object.assign(remote.player, { x: -180, z: 480 });
  advance(remote, 0.1);
  assert.ok(!remote.milestones.ridge);
  // Facing the host below the southern lip of the ridge still leaves all heads behind terrain.
  Object.assign(remote.player, { x: 48, z: 453, feetY: geo.terrainHeight(48, 453) });
  remote.elapsed = 75;
  const hiddenFront = game.hordePosition(remote, 0);
  remote.player.yaw = Math.atan2(hiddenFront.x - 48, hiddenFront.z - 453);
  advance(remote, 0.07);
  assert.ok(!remote.milestones.ridge);
  Object.assign(remote.player, { x: 48, z: 480 });
  const front = game.hordePosition(remote, 0);
  remote.player.yaw = Math.atan2(front.x - 48, front.z - 480);
  advance(remote, 0.1);
  assert.equal(remote.milestones.ridge, true);
});

test('17–20/24: the bank deepens, shifts a stationary wader downstream, and the ford supports the feet', () => {
  const w = field(112, 1009.9);
  const shallow = travel.riverImmersion(w, 112, 1009.1),
    deep = travel.riverImmersion(w, 112, 1010.4);
  assert.ok(deep > shallow && shallow > 0);
  assert.ok(travel.footHeight(w, 112, 1010.4) < travel.footHeight(w, 112, 1009.1));
  advance(w, 0.8);
  assert.ok(w.player.x > 112.17);
  assert.equal(w.player.surface, 'water');
  assert.equal(travel.barrier(w, 112, 1015), 'water');
  assert.equal(travel.riverImmersion(w, -125, 1020), 0);
  assert.equal(travel.footing(w, -125, 1020), 'stone');
  const drop = field(0, 16);
  drop.player.feetY += 1.15;
  advance(drop, 0.1);
  assert.ok(drop.player.airborne);
  advance(drop, 0.8);
  assert.equal(drop.player.airborne, false);
  assert.equal(drop.events.filter((e) => e.type === 'land').length, 1);
});

test('25/44: the boundary rises visibly before a scalloped thorn or rock wall and fauna follow scent independently of the map', () => {
  const w = game.createWorld(),
    a = edge.edgePoint('east', 440),
    b = edge.edgePoint('east', 470);
  assert.ok(Math.abs(a.x - b.x) > 0.4);
  assert.ok(edge.edgeRise(a.x, a.z) > 2);
  assert.equal(travel.barrier(w, a.x, a.z), 'thorns');
  assert.equal(travel.barrier(w, a.x - 2, a.z), '');
  let faces = 0;
  const painter = { tri: () => faces++, beam: () => faces++ };
  Object.assign(w.player, a);
  edge.drawForestEdge({}, painter, w, geo.terrainHeight);
  assert.ok(faces > 40);
  const z = 405,
    x = geo.trailX(z),
    herb = edge.scentPatch(x, z);
  assert.ok(herb);
  const player = field(herb.x, herb.z),
    wolf = player.actors.find((a) => a.type === 'wolf');
  Object.assign(wolf, { x: herb.x + 2, z: herb.z + 2, homeX: herb.x, homeZ: herb.z });
  for (const hasMap of [true, false]) {
    player.hasMap = hasMap;
    advance(player, 0.05);
    assert.equal(wolf.alerted, false);
  }
  Object.assign(player.player, { x: herb.x + 25, z: herb.z });
  advance(player, 0.05);
  assert.equal(wolf.alerted, true);
});

test('45–46/49: the procession separates around solid wreckage, passes a stopped walker, and rear ranks continue to the keep', () => {
  const w = game.createWorld(),
    id = 3 * 48 + 46,
    q = march.stragglerSchedule(id);
  w.elapsed = q.begins + 0.6;
  const halted = game.hordePosition(w, id),
    next = game.hordePosition(w, id + 48);
  w.elapsed += 4;
  assert.ok(
    Math.hypot(game.hordePosition(w, id).x - halted.x, game.hordePosition(w, id).z - halted.z) < 0.17
  );
  assert.ok(
    Math.hypot(game.hordePosition(w, id + 48).x - next.x, game.hordePosition(w, id + 48).z - next.z) > 3.6
  );
  const obs = march.marchObstructions[0];
  assert.equal(travel.barrier(w, obs.x, obs.z), 'wood');
  assert.ok(march.skirtWreckage(obs.station, obs.offset - 0.12) < obs.offset - 1.7);
  assert.ok(march.skirtWreckage(obs.station, obs.offset + 0.12) > obs.offset + 1.7);
  w.elapsed = w.raceDuration;
  const last = game.hordePosition(w, game.HORDE_COUNT - 1),
    rel = (p) => Math.hypot(p.x - 30, p.z - 1435);
  w.elapsed += 275;
  assert.ok(rel(game.hordePosition(w, game.HORDE_COUNT - 1)) < rel(last) - 110);
  Object.assign(w.player, obs);
  const prints = game.hostFootprints(w);
  assert.ok(prints.length > 2);
  assert.ok(prints.every((p) => Math.hypot(p.x - obs.x, p.z - obs.z) > obs.r));
});

function encounter(kind) {
  const w = field(geo.roadX(650), 650);
  const a = w.actors.find((a) => a.type === kind);
  for (const b of w.actors) if (b !== a && ['troll', 'wolf', 'dragon'].includes(b.type)) b.alive = false;
  Object.assign(a, {
    x: w.player.x,
    z: w.player.z - (kind === 'dragon' ? 12 : 3.4),
    homeX: w.player.x,
    homeZ: w.player.z,
    attackAt: 0,
  });
  return [w, a];
}
test('39–42: trolls plant before committing their weight and dragon breath travels along the telegraphed lane', () => {
  const [w, troll] = encounter('troll');
  advance(w, 0.12);
  assert.ok(troll.windupUntil > w.elapsed);
  const origin = troll.z;
  w.player.x += 4.9;
  advance(w, 0.75);
  assert.equal(troll.z, origin);
  advance(w, 0.64);
  assert.ok(troll.z > origin + 0.7);
  assert.equal(w.player.health, 5);
  assert.ok(w.events.some((e) => e.type === 'bough'));
  for (const dodge of [true, false]) {
    const [world, a] = encounter('dragon');
    advance(world, 1.64);
    assert.ok(world.dragonBreath?.at > 0);
    assert.equal(world.player.health, 5);
    const runway = a.z;
    if (dodge) world.player.x += 5;
    advance(world, 0.8);
    assert.ok(a.z > runway + 2.2);
    assert.equal(world.player.health, dodge ? 5 : 3);
  }
});

test('13/21: every new ridge pollard has a shared physical trunk before any renderer is started', async () => {
  const { ridgePollards } = await import('../zelda-and-the-princess-zombie/ridge-landscape.mjs');
  const { moveBody } = await import('../zelda-and-the-princess-zombie/swordplay.mjs');
  assert.ok(ridgePollards.length > 1);
  for (const t of ridgePollards) {
    const w = field(t.x, t.z - 2.5);
    assert.equal(travel.barrier(w, t.x, t.z), 'wood');
    moveBody(w, w.player, 0, 5);
    assert.ok(w.player.z < t.z);
  }
});

test('39/43: pack roles follow a moving traveller and a distant wolf remains dangerous beside the sluice latitude', () => {
  const w = field(82, 322),
    wolves = w.actors.filter((a) => a.type === 'wolf');
  Object.assign(wolves[0], { x: 80, z: 315, homeX: 80, homeZ: 315 });
  Object.assign(wolves[1], { x: 70, z: 314, homeX: 70, homeZ: 314 });
  advance(w, 0.1, { forward: 1 });
  assert.equal(wolves[0].packRole, 'press');
  assert.equal(wolves[1].packRole, 'left');
  assert.ok(wolves[1].alerted);
  const far = field(-190, 996),
    wolf = far.actors.find((a) => a.type === 'wolf');
  Object.assign(wolf, { x: -190, z: 994, homeX: -190, homeZ: 994 });
  advance(far, 0.1);
  assert.ok(wolf.alerted);
  assert.ok(wolf.windupUntil > far.elapsed);
});

test('45: the leading marcher yields when approached at body contact, before the player is inside it', () => {
  const w = field(0, 0);
  w.elapsed = 110;
  const target = game.hordePosition(w, 0);
  Object.assign(w.player, { x: target.x + 0.59, z: target.z, yaw: -Math.PI / 2 });
  advance(w, 0.12, { forward: 1 });
  assert.ok(w.hostReactions?.[0]);
  const clone = { ...w, hostReactions: {} };
  advance(w, 0.25, { forward: 1 });
  const moved = game.hordePosition(w, 0),
    unperturbed = game.hordePosition({ ...clone, elapsed: w.elapsed }, 0);
  assert.ok(Math.hypot(moved.x - unperturbed.x, moved.z - unperturbed.z) > 0.15);
});

test('12/48: a close procession clue needs a visible illustrated figure, and the bowl must be the figure actually seen', () => {
  const w = field(30, 1390);
  w.elapsed = 180;
  w.player.yaw = Math.PI;
  const ground = geo.terrainHeight(30, 1397);
  const bowl = { id: 107, kind: 0, x: 30, y: ground, z: 1397, h: 1.85 };
  const neighbor = { id: 108, kind: 2, x: 30, y: geo.terrainHeight(30, 1393.8), z: 1393.8, h: 1.9 };
  function view(poses) {
    game.recordProcessionView(w, poses, 16 / 9);
    advance(w, 0.21);
  }
  view([bowl]);
  assert.ok(!w.milestones.procession, 'seen only from behind the player');
  w.player.yaw = 0;
  w.player.pitch = 1;
  view([bowl]);
  assert.ok(!w.milestones.procession, 'looking above the figure');
  w.player.pitch = 0;
  view([neighbor, bowl]);
  assert.equal(w.milestones.procession, true);
  assert.ok(!w.milestones.bowl, 'a closer body hides the bowl');
  assert.doesNotMatch(w.journal.find((entry) => entry.id === 'procession').text, /bowl/i);
  view([{ ...bowl, kind: 3 }]);
  assert.ok(!w.milestones.bowl, 'this asset shows empty hands');
  view([bowl]);
  assert.equal(w.milestones.bowl, true);
  assert.match(w.journal.find((entry) => entry.id === 'bowl').text, /wooden bowl/);
});

test('the ordinary road and ford both afford a close, forward view of the actual procession', async () => {
  const { createProcessionView } = await import('../zelda-and-the-princess-zombie/procession-view.mjs');
  // Positions and headings are from full, non-teleporting guided and ford route
  // replays. The second road sample is from a journey which never sprinted.
  for (const [x, z, yaw, time] of [
    [80.4, 1175.7, -0.115, 247],
    [80.4, 1175.7, -0.115, 346],
    [-110.7, 1115.7, 0.252, 207],
  ]) {
    const w = field(x, z);
    w.elapsed = time;
    w.player.yaw = yaw;
    const view = createProcessionView();
    // Stream all rows exactly as an active camera would.
    for (let i = 0; i < 36; i++) { w.elapsed = time - (36 - i) / 60; view.update(w); }
    w.elapsed = time;
    const group = view.near(w, 800 / 450, time, 48).poses;
    assert.ok(group.some(guest => {
      const dist = Math.hypot(guest.x - x, guest.z - z);
      return dist < 36 && travel.clearSegment(w, x, z, guest.x, guest.z, 0.02, w.player.feetY + 1.64, guest.y + 1.5);
    }), 'there must be at least one near, in-view walker unobstructed by terrain or scenery');
  }
});

test('an isolated low bell changes the march clock once while the independent rear files settle at the castle', () => {
  const w = field(19, 993.8);
  w.bridgeOpen = true;
  w.elapsed = 205;
  const original = game.hordePosition(w, 0);
  const before = game.secondsToGate(w);
  assert.ok(game.act(w, 'interact'));
  assert.equal(w.sluiceDecoyAt, 205);
  assert.equal(game.secondsToGate(w), before + 14);
  advance(w, 4);
  const paused = game.hordePosition(w, 0);
  assert.ok(Math.hypot(original.x - paused.x, original.z - paused.z) < 1.45);
  game.act(w, 'interact');
  assert.equal(w.hostPauseUntil, 219, 'ringing repeatedly cannot create unlimited race time');
  const loaded = JSON.parse(JSON.stringify(w));
  assert.deepEqual(game.hordePosition(loaded, 500), game.hordePosition(w, 500));
  w.elapsed = w.raceDuration + 14 + 320;
  const vanguard = game.hordePosition(w, 0), tail = game.hordePosition(w, 3071);
  assert.ok(Math.hypot(vanguard.x - 30, vanguard.z - 1435) < 2.2);
  assert.ok(Math.hypot(tail.x - 30, tail.z - 1435) < 102);
});

test('winning then returning outside closes the main gate but the unlatched wicket permits re-entry', () => {
  const w = field(33.6, 1434.8);
  advance(w, 0.39, { forward: 1 });
  assert.ok(w.gateCrossed);
  advance(w, 1.5, { forward: -1 });
  assert.ok(w.player.z < 1434);
  w.elapsed = w.raceDuration - 0.02;
  advance(w, 1.65);
  assert.ok(w.gateClosedAt != null);
  assert.equal(travel.barrier(w, 30, 1435), 'metal');
  w.player.yaw = Math.atan2(34.05 - w.player.x, 1435 - w.player.z);
  assert.equal(game.getHUD(w).hint, 'Lift the wicket latch');
  assert.ok(game.act(w, 'interact'));
  advance(w, 0.8);
  assert.equal(travel.barrier(w, 30, 1435), 'metal');
  assert.equal(travel.barrier(w, 33.6, 1435), '');
  w.player.yaw = 0;
  advance(w, 1.6, { forward: 1 });
  assert.ok(w.player.z > 1437);
  advance(w, 7);
  assert.equal(travel.barrier(w, 33.6, 1435), 'metal');
  assert.equal(w.ending, null);
});

test('the press warns before taking a heart, and a guard turned towards that specific hand stops it', () => {
  for (const guard of [false, true]) {
    const w = field(0, 0);
    w.route = 'wander';
    w.nextHunt = Infinity;
    w.elapsed = 420;
    const body = game.hordePosition(w, 99);
    Object.assign(w.player, { x: body.x + 0.1, z: body.z + 0.12, feetY: travel.footHeight(w, body.x, body.z) });
    for (let i = 0; i < 200 && !w.hostWarning; i++) game.tick(w, 1 / 60);
    assert.ok(w.hostWarning);
    assert.equal(w.player.health, 5);
    advance(w, 0.9);
    if (guard) {
      const hand = game.hordePosition(w, w.hostWarning.i);
      w.player.yaw = Math.atan2(hand.x - w.player.x, hand.z - w.player.z);
      assert.ok(game.act(w, 'guard'));
    }
    advance(w, 0.55);
    assert.equal(w.player.health, guard ? 5 : 4);
    assert.ok(w.events.some(e => e.type === (guard ? 'block' : 'hurt') && e.text === 'host'));
  }
});

test('a northern predator hears the actual file of feet and breaks away from it', () => {
  const w = field(0, 0);
  w.elapsed = 215;
  const front = game.hordePosition(w, 0);
  const beast = w.actors.find(a => a.type === 'dragon');
  Object.assign(beast, { x: front.x + 5, z: front.z + 12, homeX: front.x + 5, homeZ: front.z + 12 });
  const before = Math.hypot(beast.x - front.x, beast.z - front.z);
  advance(w, 0.65);
  assert.ok(beast.hostFlight.until > w.elapsed);
  assert.ok(Math.hypot(beast.x - front.x, beast.z - front.z) > before + 0.7);
  assert.equal(beast.alerted, false);
});
