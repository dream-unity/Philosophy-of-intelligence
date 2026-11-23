const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const gameDir = '../zelda-and-the-princess-zombie/';
let game, combat, pose, zones, travel, effects;
before(async () => {
  [game, combat, pose, zones, travel, effects] = await Promise.all(
    ['world', 'swordplay', 'blade-pose', 'combat-zones', 'travel', 'field-effects'].map(
      (n) => import(gameDir + n + '.mjs')
    )
  );
});
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
function field(x = 0, z = 0) {
  const w = game.createWorld();
  w.elapsed = 10;
  w.route = 'guided';
  w.greeted = true;
  w.actors = [];
  w.events = [];
  Object.assign(w.player, { x, z, pitch: 0, yaw: 0, feetY: travel.footHeight(w, x, z) });
  return w;
}
function foe(w, type, x, z, extra = {}) {
  const a = {
    type,
    id: type,
    hp: 8,
    x: w.player.x + x,
    z: w.player.z + z,
    alive: true,
    heading: Math.PI,
    ...extra,
  };
  w.actors.push(a);
  return a;
}
const rig = { move() {} },
  hooks = {
    ring() {},
    notify() {},
    drop(w, a) {
      a.alive = false;
    },
  };
function attack(w, kind = 'thrust', extraHooks = {}, until = 1) {
  assert.equal(combat.beginSwing(w, kind), true);
  const frames = Math.ceil(w.attack.duration * until * 120);
  for (let i = 0; i < frames; i++) {
    w.elapsed += 1 / 120;
    combat.strikeContacts(w, rig, { ...hooks, ...extraHooks });
  }
  return w.attack;
}
function projection(w, width, height) {
  return (x, y, z) => {
    const p = w.player,
      dx = x - p.x,
      dz = z - p.z,
      dy = y - p.feetY - 1.64;
    const lateral = Math.cos(p.yaw) * dx - Math.sin(p.yaw) * dz,
      forward = Math.sin(p.yaw) * dx + Math.cos(p.yaw) * dz;
    const depth = forward * Math.cos(p.pitch) + dy * Math.sin(p.pitch);
    return depth > 0.01
      ? [
          width / 2 + (0.685 * height * lateral) / depth,
          height / 2 - (0.685 * height * (dy * Math.cos(p.pitch) - forward * Math.sin(p.pitch))) / depth,
        ]
      : null;
  };
}
function checkDrawnWeapon(w, width, height) {
  w.viewAspect = width / height;
  const project = projection(w, width, height),
    live = combat.bladeCoordinates(w);
  assert.ok(Math.abs(distance(live.base, live.tip) - combat.steelLength) < 1e-6);
  assert.ok(Math.abs(distance(live.grip, live.base) - combat.gripToEdge) < 1e-6);
  const vertices = combat.bladeFallbackGeometry(w),
    ribbon = combat.bladeFallbackGeometry(w, true);
  let tipFound = false;
  for (let i = 0; i < vertices.length; i += 6) {
    if (distance([...vertices.subarray(i, i + 3)], live.tip) < 1e-5) tipFound = true;
  }
  assert.ok(tipFound, 'the fallback mesh reaches precisely the same steel point as the contact sweep');
  assert.ok(ribbon.length >= 18, 'the keepsake is present while art loads and after it becomes available');
  for (let i = 0; i < ribbon.length; i += 6) {
    assert.ok(distance([...ribbon.subarray(i, i + 3)], live.grip) < 0.21);
    assert.ok(ribbon[i + 5] > ribbon[i + 3]);
  }
  const painting = effects.swordPlacement(w, width, height, project);
  assert.ok(painting, 'painted wrist and point have an actual pose at this frame');
  assert.ok(
    distance(painting.map(0.052, 0.059), project(...live.tip)) < 4,
    'painted point registers to steel in pixels'
  );
  assert.ok(
    distance(painting.map(0.648, 0.721), project(...live.grip)) < 1.5,
    'painted palm lies on its physical grip'
  );
  return live;
}
test('rendered paint and fallback steel register to one physical point in portrait, landscape, guard, attack and recovery', () => {
  for (const [width, height] of [
    [390, 844],
    [960, 540],
  ]) {
    const w = field();
    const rest = checkDrawnWeapon(w, width, height),
      project = projection(w, width, height);
    for (const point of [rest.grip, rest.tip]) {
      const [x, y] = project(...point);
      assert.ok(x > 0 && x < width && y > 0 && y < height, 'rested grip and point fit the screen');
    }
    assert.ok(game.act(w, 'guard'));
    assert.ok(!game.act(w, 'thrust'), 'cannot bypass a committed guard by simultaneously attacking');
    const guard = checkDrawnWeapon(w, width, height);
    assert.ok(distance(rest.tip, guard.tip) > 0.4);
    w.elapsed += 1.1;
    assert.ok(game.act(w, 'thrust'));
    for (const t of [0.2, 0.47, 0.78, 0.96]) {
      w.elapsed = w.attack.start + t * w.attack.duration;
      combat.strikeContacts(w, rig, hooks);
      checkDrawnWeapon(w, width, height);
    }
  }
});
test('pitch, effective steel reach, visible windup and two different strokes determine actual body contact', () => {
  function run(type, x, z, pitch, kind = 'thrust') {
    const w = field();
    w.player.pitch = pitch;
    foe(w, type, x, z);
    return attack(w, kind);
  }
  assert.deepEqual(
    run('witch', Math.sin((64 * Math.PI) / 180) * 7.9, Math.cos((64 * Math.PI) / 180) * 7.9, 0, 'slash').hits,
    []
  );
  assert.deepEqual(run('witch', 0, 3.15, 0).hits, []);
  assert.deepEqual(run('wolf', 0, 1.7, 0.8).hits, []);
  assert.equal(run('wolf', 0, 1.7, -0.58).contact.zone, 'leg');
  assert.equal(run('witch', 0.9, 1.6, 0, 'slash').contact.material, 'witch');
  assert.deepEqual(run('witch', 0.9, 1.6, 0).hits, []);
  const w = field();
  const person = foe(w, 'witch', 0, 1.7);
  assert.equal(game.act(w, 'thrust'), true);
  game.tick(w, 0.105);
  assert.ok(person.alive);
  assert.ok(!w.attack.contact);
  for (let i = 0; i < 14; i++) game.tick(w, 1 / 60);
  assert.equal(person.alive, false);
  const contact = w.attack.contact;
  assert.ok(contact.fraction >= 0.24 && contact.fraction <= 0.72);
  const edge = combat.bladeCoordinates(w, contact.fraction),
    parts = zones.actorVolumes(person, contact.at);
  assert.ok(
    parts.some((part) => Number.isFinite(zones.capsuleEntry(edge.base, edge.tip, part))),
    'blade shown at the recorded strike actually crosses the posed target'
  );
});
test('a sweeping edge reaches the first body in its path regardless of actor list position or centre proximity', () => {
  for (const reverse of [false, true]) {
    const w = field();
    const near = foe(w, 'witch', -0.52, 1.1, { id: 'near' }),
      first = foe(w, 'witch', 0.88, 1.62, { id: 'first' });
    if (reverse) w.actors.reverse();
    assert.deepEqual(attack(w, 'slash').hits, ['first']);
    assert.equal(near.alive, true);
    assert.equal(first.alive, false);
  }
});
test('the same pre-render solid allows a shoulder-high thrust over a stump and stops steel at a tall post', () => {
  const z = 222;
  const run = (x, height) => {
    const w = field(x, z),
      a = foe(w, 'witch', 0, 1.95);
    travel.registerObstacle(x + 0.18, z + 1.0, 0.26, 'wood', height);
    assert.equal(travel.barrier(w, x + 0.18, z + 1, 0.08), 'wood');
    const swing = attack(w);
    return { w, a, swing };
  };
  assert.deepEqual(run(22, 0.45).swing.hits, ['witch']);
  const { w, a, swing } = run(25, 2.95);
  assert.equal(swing.contact.material, 'wood');
  assert.equal(a.alive, true);
  assert.ok(swing.stopAt < 0.72);
  const impact = [swing.contact.x, swing.contact.y, swing.contact.z];
  const steel = combat.bladeCoordinates(w, swing.stopAt);
  const atEdge = Array.from({ length: 101 }, (_, i) => pose.lerpPoint(steel.grip, steel.tip, i / 100));
  assert.ok(
    Math.min(...atEdge.map((p) => distance(p, impact))) < 0.018,
    'visible spark is on the actual recoiling sword'
  );
  assert.equal(
    travel.barrier(w, impact[0], impact[2], 0.08, false, undefined, undefined, impact[1]),
    'wood',
    'the same spark also lies on the surface of the actual post'
  );
  for (const t of [swing.stopAt, swing.stopAt + 0.08, 0.68, 0.85]) {
    const blade = combat.bladeCoordinates(w, t),
      eye = pose.observer(w);
    assert.equal(pose.inspectBlade(w, blade, eye), null, 'steel recoils on the same side of the post');
    assert.ok(Math.abs(distance(blade.base, blade.tip) - combat.steelLength) < 1e-6);
  }
});
test('troll shoulder plates deflect steel, its windup survives repeated frontal pressure and a recovered thrust can punish', () => {
  const w = field(),
    troll = foe(w, 'troll', -0.6, 1.85, { windupUntil: 10.9, attackAt: 10.9 });
  w.player.pitch = 0.65;
  let swing = attack(w);
  assert.equal(swing.contact.zone, 'armour');
  assert.equal(swing.contact.material, 'stone');
  assert.equal(troll.hp, 8);
  assert.equal(troll.windupUntil, 10.9);
  w.elapsed += 0.1;
  troll.windupUntil = w.elapsed + 0.9;
  const next = troll.windupUntil;
  swing = attack(w);
  assert.equal(troll.hp, 8);
  assert.equal(troll.windupUntil, next);
  w.elapsed += 0.1;
  troll.recoverUntil = w.elapsed + 1;
  w.player.pitch = 0; // take the exposed lower flank while the club is recovering
  w.player.yaw = Math.atan2(troll.x - w.player.x, troll.z - w.player.z);
  swing = attack(w);
  assert.equal(swing.contact.material, 'troll');
  assert.equal(troll.hp, 6);
});
test('real vanguard members in the moving world react on physical blade contact and ignore a swing overhead', () => {
  function strike(pitch) {
    const w = field(),
      lead = game.hordePosition(w, 0);
    w.raceGrace = 35; // hold the route clock while the vanguard finishes gathering
    const h = game.hordePosition(w, 0),
      after = game.hordePosition({ ...w, elapsed: 40 }, 0);
    const dx = after.x - h.x,
      dz = after.z - h.z,
      d = Math.hypot(dx, dz);
    w.player.x = h.x + (dx / d) * 1.55;
    w.player.z = h.z + (dz / d) * 1.55;
    w.player.yaw = Math.atan2(-dx, -dz);
    w.player.pitch = pitch;
    w.player.feetY = travel.footHeight(w, w.player.x, w.player.z);
    assert.ok(Number.isFinite(lead.x));
    game.act(w, 'thrust');
    for (let k = 0; k < 30; k++) game.tick(w, 1 / 60);
    return w;
  }
  const w = strike(0);
  assert.ok(w.attack.hits.some((id) => /^host\d+$/.test(id)));
  assert.ok(w.events.some((e) => e.type === 'impact' && e.text === 'zombie'));
  assert.equal(strike(1).events.filter((e) => e.text === 'zombie').length, 0);
});
test('public interactions consume rowanberries and a first drink at the well restores the player without refilling cinders', () => {
  const w = game.createWorld();
  w.route = 'wander';
  w.greeted = true;
  w.player.health = 1;
  w.potions = 0;
  const berries = w.actors.find((a) => a.type === 'berries');
  const useAt = (actor, distance) => {
    Object.assign(w.player, { x: actor.x, z: actor.z - distance, yaw: 0, pitch: 0 });
    return game.act(w, 'interact');
  };
  assert.ok(useAt(berries, 1.6));
  assert.equal(w.player.health, 3);
  assert.equal(berries.alive, false);
  assert.equal(useAt(berries, 1.6), false);
  const well = w.actors.find((a) => a.type === 'spring');
  assert.ok(useAt(well, 5.58));
  assert.equal(w.player.health, 5);
  w.player.health = 2;
  useAt(well, 5.58);
  assert.equal(w.player.health, 2);
  assert.equal(w.potions, 0);
});
test('a phial spends one charge and its visible burst reaches an exposed airborne body but not a dragon through the castle wall or 44 metres away', () => {
  function cast(x, z, separation, height, pitch = 0) {
    const w = field(x, z);
    w.potions = 1;
    w.player.pitch = pitch;
    const dragon = foe(w, 'dragon', 0, separation, { airHeight: height });
    assert.ok(game.act(w, 'potion'));
    assert.equal(w.potions, 0);
    const first = { ...w.phialFlight };
    assert.ok(!game.act(w, 'potion'));
    for (let i = 0; i < 220 && w.phialFlight; i++) {
      w.elapsed += 1 / 90;
      combat.advancePhial(w, 1 / 90, () => {});
    }
    assert.equal(w.phialFlight, null);
    assert.ok(w.cinder);
    return { hit: !dragon.alive, start: first, burst: w.cinder };
  }
  const exposed = cast(22, 218, 7, 3.1, 0.18);
  assert.ok(exposed.hit);
  assert.ok(exposed.burst.z > exposed.start.z + 2);
  const covered = cast(18, 1432, 7, 2.0, 0.12);
  assert.equal(covered.hit, false);
  assert.ok(covered.burst.z < 1434.2);
  const beyond = cast(18, 1432, 44, 2.0, 0.12);
  assert.equal(beyond.hit, false);
});
test('turning the camera on the contact frame cannot redirect a committed cut instantly behind Zelda', () => {
  const w = field(),
    behind = foe(w, 'witch', 0, -1.55);
  assert.ok(game.act(w, 'thrust'));
  w.elapsed += 0.145;
  combat.strikeContacts(w, rig, hooks);
  w.player.yaw = Math.PI;
  w.elapsed += 0.05;
  combat.strikeContacts(w, rig, hooks);
  assert.ok(Math.abs(w.attack.eye.yaw) < 0.3);
  assert.equal(behind.alive, true);
  w.player.yaw = 0;
  for (let i = 0; i < 50; i++) {
    w.elapsed += 1 / 120;
    combat.strikeContacts(w, rig, hooks);
  }
  assert.equal(behind.alive, true);
});
test('raising the blade on impact parries and extends the opening; an early raised guard blocks, turning away does neither', () => {
  function meet(when, yaw) {
    const w = field(22, 220),
      wolf = foe(w, 'wolf', 0, 1.9, { homeX: 22, homeZ: 221.9, phase: 0.3, attackAt: 0 });
    game.tick(w, 1 / 90);
    assert.ok(wolf.windupUntil > w.elapsed);
    const contactAt = wolf.windupUntil;
    for (let i = 0; i < 120; i++) {
      if (w.elapsed >= contactAt - when && !w.guardUntil) {
        w.player.yaw = yaw;
        assert.ok(game.act(w, 'guard'));
      }
      game.tick(w, 1 / 120);
      if (wolf.impactAt != null) break;
    }
    return { w, opening: wolf.recoverUntil - wolf.impactAt };
  }
  const early = meet(0.43, 0),
    late = meet(0.085, 0),
    back = meet(0.085, Math.PI);
  assert.ok(early.w.events.some((e) => e.type === 'block' && e.text === 'wolf'));
  assert.ok(late.w.events.some((e) => e.type === 'block' && e.text === 'parry'));
  assert.ok(late.opening > early.opening + 0.28);
  late.w.elapsed = late.w.parriedAt + 0.12;
  const lifted = combat.bladeCoordinates(late.w).tip;
  const steady = combat.bladeCoordinates({ ...late.w, parriedAt: undefined }).tip;
  assert.ok(distance(lifted, steady) > 0.13, 'the hand and blade visibly lift when Zelda catches the blow');
  assert.equal(early.w.player.health, 5);
  assert.equal(late.w.player.health, 5);
  assert.equal(back.w.player.health, 4);
});
test('the visible height of each bronze bell sets its striking zone and playing the phrase on steel raises the bridge', () => {
  const w = game.createWorld();
  w.greeted = true;
  w.route = 'guided';
  w.elapsed = 35;
  w.events = [];
  function sound(tone, pitch) {
    const bell = w.actors.find((a) => a.tone === tone);
    Object.assign(w.player, {
      x: bell.x,
      z: bell.z - 1.95,
      pitch,
      yaw: 0,
      feetY: travel.footHeight(w, bell.x, bell.z - 1.95),
    });
    assert.ok(game.act(w, 'thrust'));
    for (let i = 0; i < 48; i++) game.tick(w, 1 / 60);
    return w.attack.contact?.material;
  }
  assert.equal(sound('high', 0), undefined, 'blindly thrusting ahead passes under the smallest casting');
  assert.equal(sound('low', 0), 'bronze');
  assert.equal(sound('high', 0.23), 'bronze');
  assert.equal(sound('mid', 0.16), 'bronze');
  assert.deepEqual(w.bells, ['low', 'high', 'mid']);
  assert.ok(w.bridgeOpen);
  assert.ok(w.events.some((e) => e.type === 'chain' && e.text === 'rise'));
});
