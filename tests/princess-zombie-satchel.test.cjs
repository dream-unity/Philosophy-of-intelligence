const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const directory = '../zelda-and-the-princess-zombie/';
let game, bag, store, travel;
before(async () => {
  [game, bag, store, travel] = await Promise.all(
    ['world', 'inventory', 'journey-store', 'travel'].map((name) => import(directory + name + '.mjs'))
  );
});

function chooseRoad() {
  const w = game.createWorld();
  Object.assign(w.player, { x: 0, z: 6.8, yaw: 0 });
  game.act(w, 'interact');
  assert.equal(w.dialogue.kind, 'witch');
  game.choose(w, 1);
  game.act(w, 'close');
  return w;
}
function position(w, x, z, pitch = 0) {
  Object.assign(w.player, { x, z, pitch, yaw: 0, feetY: travel.footHeight(w, x, z) });
}
function elapse(w, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.tick(w, 1 / 60);
}
function cast(w, id) {
  assert.ok(bag.equipItem(w, id));
  assert.ok(game.act(w, 'use-equipped'));
  assert.equal(w.phialFlight.kind, id);
  assert.equal(game.act(w, 'use-equipped'), false);
  elapse(w, 1.4);
  assert.equal(w.phialFlight, null);
}

test('the three road gifts occupy different pockets and spend separately without arming another pocket', () => {
  const w = chooseRoad();
  const gifts = bag.bagItems(w);
  assert.deepEqual(
    gifts.map((r) => [r.id, r.count]),
    [
      ['cinder', 1],
      ['veil', 1],
      ['lure', 1],
    ]
  );
  assert.equal(new Set(gifts.map((r) => r.shape)).size, 3);
  position(w, 22, 218, -0.9);
  cast(w, 'veil');
  assert.ok(w.player.scentMaskedUntil > w.elapsed);
  assert.equal(w.cinder, undefined);
  assert.equal(bag.selectedItem(w), null);
  assert.equal(w.potions, 2);
  assert.equal(bag.giveRoadBottles(w), false);
  const resumed = store.restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.equal(bag.selectedItem(resumed), null);
  assert.equal(game.act(resumed, 'use-equipped'), false);
  assert.deepEqual(
    bag.bagItems(resumed).map((i) => i.id),
    ['cinder', 'lure']
  );
  cast(resumed, 'lure');
  assert.ok(resumed.fieldMedicine.lure.until > resumed.elapsed);
  assert.ok(resumed.events.some((e) => e.type === 'potion' && e.text === 'lure'));
  cast(resumed, 'cinder');
  assert.ok(resumed.cinder);
  assert.equal(resumed.potions, 0);
});

test('a numbered pocket uses only its named item, preserves the belt and leaves sword and movement available', () => {
  const w = chooseRoad();
  position(w, 22, 218, -0.9);
  assert.equal(bag.selectedItem(w).id, 'cinder');
  assert.deepEqual(bag.availableQuickItems(w), ['item:cinder', 'item:veil', 'item:lure']);
  assert.ok(game.act(w, 'item:veil'));
  assert.equal(w.phialFlight.kind, 'veil');
  assert.equal(bag.selectedItem(w).id, 'cinder');
  const z = w.player.z;
  for (let i = 0; i < 75; i++) game.tick(w, 1 / 60, { forward: 1, sprint: true });
  assert.ok(w.player.z > z + 4);
  assert.ok(game.act(w, 'strike'));
  assert.equal(game.act(w, 'item:veil'), false);
  assert.match(w.notice, /Willow veil.*empty/i);
  assert.equal(w.potions, 2);
  assert.equal(w.fieldMedicine.veil != null, true);
  assert.equal(game.act(w, 'item:cordial'), false);
  assert.equal(w.sequence, null);
  const resumed = store.restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.deepEqual(bag.availableQuickItems(resumed), ['item:cinder', 'item:lure']);
  assert.equal(bag.selectedItem(resumed).id, 'cinder');
});

test('scent disperses a real wolf and bellglass turns a troll toward the landing place', () => {
  const w = chooseRoad();
  position(w, 22, 218, -0.95);
  const wolf = w.actors.find((a) => a.type === 'wolf');
  Object.assign(wolf, { x: 22, z: 229, homeX: 22, homeZ: 228, huntingUntil: 200 });
  cast(w, 'veil');
  const gap = Math.hypot(wolf.x - w.player.x, wolf.z - w.player.z);
  elapse(w, 0.8);
  assert.equal(wolf.alerted, false);
  assert.ok(Math.hypot(wolf.x - w.player.x, wolf.z - w.player.z) > gap);
  w.player.pitch = 0.12;
  const troll = w.actors.find((a) => a.type === 'troll');
  cast(w, 'lure');
  const source = w.fieldMedicine.lure;
  // The troll enters the road between the sound and Zelda. It must turn its back to him.
  Object.assign(troll, { x: 22, z: 224.5, homeX: 22, homeZ: 224.5 });
  elapse(w, 2.5);
  assert.equal(troll.lureSpentAt, source.at);
  assert.ok(troll.impactAt > source.at && Math.cos(troll.attackYaw) > 0.9);
  assert.equal(w.player.health, w.player.maxHealth);
  assert.equal(troll.alive, true);
});

test('picked moonleaf goes into the bag, survives a reload and is consumed only when healing', () => {
  const w = chooseRoad();
  const herb = w.actors.find((a) => a.type === 'herb');
  position(w, herb.x, herb.z - 1.45);
  assert.ok(game.act(w, 'interact'));
  assert.equal(herb.alive, false);
  assert.ok(bag.equipItem(w, 'leaf'));
  assert.equal(game.act(w, 'use-equipped'), false);
  assert.equal(bag.selectedItem(w).count, 1);
  const r = store.restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.equal(r.actors.find((a) => a.id === herb.id).alive, false);
  assert.equal(bag.selectedItem(r).id, 'leaf');
  r.player.health = 2;
  assert.ok(game.act(r, 'use-equipped'));
  assert.equal(r.player.health, 4);
  assert.equal(bag.selectedItem(r), null);
  assert.equal(r.potions, 3);
});
