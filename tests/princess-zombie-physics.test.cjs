const { before, test } = require('node:test');
const assert = require('node:assert/strict');

let travel, woods, combat, story, geography;
before(async () => {
  [travel, woods, combat, story, geography] = await Promise.all(
    ['travel', 'woodland', 'swordplay', 'story', 'geography'].map(
      (name) => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});
function field(x = 0, z = 0) {
  return { elapsed: 10, actors: [], events: [], player: { x, z, yaw: 0, pitch: 0 }, strikeUntil: 0 };
}

test('visible trunks, boulders and clearing fixtures block movement before a renderer has been created', () => {
  const w = field();
  const grove = woods.sceneryTrees(2, 5);
  const rocks = woods.sceneryBoulders(2, 5);
  assert.ok(grove.length && rocks.length, 'fixture contains procedurally placed scenery');
  for (const tree of grove) assert.ok(travel.barrier(w, tree.x, tree.z), 'solid at tree base');
  for (const rock of rocks) assert.ok(travel.barrier(w, rock.x, rock.z), 'solid at stone base');
  const [x, z, , canopy] = woods.clearingTrees[0];
  const trunk = canopy * 0.15;
  w.player.x = x;
  w.player.z = z - trunk - 1.5;
  combat.moveBody(w, w.player, 0, 8);
  assert.ok(w.player.z < z - trunk, 'a long movement step cannot tunnel through the tree');
  assert.equal(travel.barrier(w, 6.2, 9.4), 'wood', 'clearing lamp support');
  assert.equal(travel.clearSegment(w, x, z - 2, x, z + 2), false, 'the trunk also masks a weapon strike');
});

test('sluice lift, deck, rail, deep water and the separate western stepping stones share physical coordinates', () => {
  const w = field();
  assert.equal(travel.barrier(w, 30, 1020), 'water');
  assert.equal(travel.barrier(w, -125, 1020), '');
  assert.equal(travel.barrier(w, -122, 1020), 'water');
  assert.ok(travel.footHeight(w, -125, 1020) > geography.terrainHeight(-125, 1020));
  w.bridgeOpen = true;
  w.bridgeRaisedAt = w.elapsed;
  assert.equal(travel.bridgeRise(w), 0);
  assert.equal(travel.barrier(w, 30, 1020), 'water', 'raising takes time');
  w.elapsed += 2;
  assert.equal(travel.bridgeRise(w), 1);
  assert.equal(travel.barrier(w, 30, 1020), '');
  assert.equal(travel.barrier(w, 39.88, 1020), 'wood', 'bridge has a physical rail');
  assert.ok(travel.footHeight(w, 30, 1020) > geography.terrainHeight(30, 1020) + 0.3);
  assert.equal(travel.footing(w, 30, 1020), 'wood');
});

test('the gate, the long hall, the gallery stair and the tabletop occupy the same castle plateau', () => {
  const w = field();
  assert.ok(geography.terrainHeight(30, 1435) > geography.terrainHeight(30, 1225) + 20);
  assert.equal(travel.barrier(w, 30, 1435), '');
  assert.equal(travel.barrier(w, 20, 1435), 'stone');
  w.gateClosedAt = w.elapsed;
  assert.equal(travel.barrier(w, 30, 1435), 'metal');
  assert.equal(travel.barrier(w, 30, 1466), '');
  assert.equal(travel.barrier(w, 40, 1466), 'stone');
  assert.equal(travel.barrier(w, 31.6, 1517), 'stone', 'solid dining table');
  assert.equal(travel.footing(w, 30, 1507), 'stone');
  assert.ok(travel.footHeight(w, 18, 1459) > travel.footHeight(w, 18, 1441) + 9);
  assert.equal(story.storyPassable(17, 1459, w, 17, 1458.85), true);
  assert.equal(
    story.storyPassable(16.15, 1451, w, 15.95, 1451),
    false,
    'cannot enter stair from its high side'
  );
});

test('a timestepped sword swing hits a nearby body once and cannot hit through a tree or at a distance', () => {
  function trial(x, z, separation, yaw = 0) {
    const w = field(x, z);
    w.player.yaw = yaw;
    const foe = {
      id: 'foe',
      type: 'wolf',
      alive: true,
      x: x + Math.sin(yaw) * separation,
      z: z + Math.cos(yaw) * separation,
      hp: 8,
    };
    w.actors.push(foe);
    assert.equal(combat.beginSwing(w, 'thrust'), true);
    assert.equal(combat.beginSwing(w, 'thrust'), false, 'recovery prevents another attack');
    const h = { notify() {}, drop() {}, ring() {} };
    const rig = {
      move(a, dx, dz) {
        combat.moveBody(w, a, dx, dz);
      },
    };
    for (let i = 0; i < 35; i++) {
      w.elapsed += 1 / 60;
      combat.strikeContacts(w, rig, h);
    }
    return { hits: w.attack.hits.length, hp: foe.hp, events: w.events };
  }
  const near = trial(0, 0, 1.45);
  assert.equal(near.hits, 1);
  assert.ok(near.hp < 8 && near.hp >= 6);
  assert.equal(trial(0, 0, 7).hits, 0);
  const hidden = trial(-8, 5.8, 2.25);
  assert.equal(hidden.hits, 0);
  assert.ok(hidden.events.some((e) => e.type === 'impact' && e.text === 'wood'));
});

test('a wolf warns before lunging and its committed line can be guarded or sidestepped', async () => {
  const { advanceWildlife } = await import('../zelda-and-the-princess-zombie/wildlife.mjs');
  function encounter(answer) {
    const w = field(22, 220),
      a = {
        id: 'wolf',
        type: 'wolf',
        x: 22,
        z: 222,
        homeX: 22,
        homeZ: 222,
        alive: true,
        phase: 1,
        attackAt: 0,
      };
    w.actors.push(a);
    let hits = 0;
    const hooks = {
      notify() {},
      injury() {
        hits++;
      },
    };
    advanceWildlife(w, 1 / 30, hooks);
    assert.ok(w.events.some((e) => e.type === 'telegraph' && e.text === 'wolf'));
    assert.equal(hits, 0);
    if (answer === 'guard') w.guardUntil = a.windupUntil + 0.1;
    if (answer === 'sidestep') combat.moveBody(w, w.player, 3.4, 0);
    for (let i = 0; i < 28; i++) {
      w.elapsed += 1 / 30;
      advanceWildlife(w, 1 / 30, hooks);
    }
    return { hits, blocked: w.events.some((e) => e.type === 'block') };
  }
  assert.deepEqual(encounter('wait'), { hits: 1, blocked: false });
  assert.deepEqual(encounter('guard'), { hits: 0, blocked: true });
  assert.deepEqual(encounter('sidestep'), { hits: 0, blocked: false });
});

test('the marching formation stays clear of solid scenery and retains space between individual walkers through the funnel', async () => {
  const { createWorld, hordePosition, HORDE_COUNT } = await import(
    '../zelda-and-the-princess-zombie/world.mjs'
  );
  const w = createWorld();
  // These are samples of one continuous deterministic simulation, including the
  // western line of departure, turns across the downs and the crowded gate.
  for (const elapsed of [0, 85, 180, 280, 385, 395]) {
    w.elapsed = elapsed;
    const buckets = new Map();
    for (let i = 0; i < HORDE_COUNT; i++) {
      const p = hordePosition(w, i);
      assert.equal(
        travel.barrier(w, p.x, p.z, 0.18, false),
        '',
        'walker ' + i + ' overlaps scenery at ' + elapsed + 's'
      );
      const x = Math.floor(p.x),
        z = Math.floor(p.z);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const neighbor of buckets.get(x + dx + ',' + (z + dz)) || []) {
            assert.ok(
              Math.hypot(p.x - neighbor.x, p.z - neighbor.z) > 0.4,
              'two walkers occupy the same spot'
            );
          }
        }
      const key = x + ',' + z;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p);
    }
  }
});

test('cinder phials travel from the hand, hit an exposed target, and cannot burst through stone', () => {
  function cast(x, z, distance) {
    const w = field(x, z);
    const foe = { type: 'wolf', id: 'foe', alive: true, x, z: z + distance };
    w.potions = 1;
    w.actors.push(foe);
    combat.tossPhial(w);
    assert.equal(w.potions, 0);
    assert.ok(w.phialFlight);
    assert.equal(foe.alive, true);
    for (let i = 0; i < 120 && w.phialFlight; i++) {
      w.elapsed += 1 / 60;
      combat.advancePhial(w, 1 / 60, () => {});
    }
    assert.equal(w.phialFlight, null);
    assert.ok(w.cinder);
    assert.ok(w.events.some((e) => e.type === 'throw'));
    assert.ok(w.events.some((e) => e.text === 'shatter'));
    return { hit: !foe.alive, impact: w.cinder };
  }
  const exposed = cast(22, 220, 7);
  assert.equal(exposed.hit, true);
  assert.ok(exposed.impact.z > 223);
  const otherSideOfWall = cast(18, 1432, 7);
  assert.equal(otherSideOfWall.hit, false);
  assert.ok(otherSideOfWall.impact.z < 1434.2);
});
