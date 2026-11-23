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

test('the private bottles stay in the fallen satchel until pickup, then work as separate assignable items', async () => {
  const controls = await import(directory + 'control-layout.mjs');
  const { touchKeys, assignTouchKey } = await import(directory + 'touch-keys.mjs');
  const { numberPadLegend } = await import(directory + 'number-pad.mjs');
  const w = chooseRoad();
  assert.deepEqual(bag.availableQuickItems(w), ['item:cinder', 'item:veil', 'item:lure']);
  const witch = w.actors.find(a => a.type === 'witch');
  position(w, witch.x, witch.z - 1.4);
  assert.ok(game.act(w, 'thrust'));
  elapse(w, 0.42);
  assert.equal(witch.alive, false);
  assert.equal(bag.equipItem(w, 'saveher'), false);
  const satchel = w.actors.find(a => a.type === 'satchel' && a.alive);
  assert.ok(satchel);
  position(w, satchel.x, satchel.z - 1.4);
  assert.ok(game.act(w, 'interact'));
  assert.equal(satchel.alive, false);
  assert.match(w.dialogue.text, /“Last Bell” and “Save Her”/);
  const extras = bag.bagItems(w).filter(item => ['saveher', 'lastbell'].includes(item.id));
  assert.deepEqual(extras.map(item => [item.name, item.count]), [['Last Bell', 1], ['Save Her', 1]]);
  assert.equal(extras[1].description, undefined);
  assert.notEqual(extras[0].shape, extras[1].shape);
  const layout = controls.controlLayout();
  const thumb = touchKeys();
  for (const [id, name, digit] of [['lastbell', 'Last Bell', '2'], ['saveher', 'Save Her', '3']]) {
    const action = 'item:' + id;
    assert.ok(bag.equipItem(w, id));
    assert.equal(bag.selectedItem(w).name, name);
    assert.ok(assignTouchKey(thumb, 'action', action));
    assert.equal(thumb.action, action);
    assert.ok(controls.rebindKeypad(layout, action, 'Numpad' + digit));
    assert.equal(controls.actionForKey(layout, 'Digit' + digit), action);
    assert.equal(numberPadLegend(layout, 'Numpad' + digit, w).text, name + ' ×1');
  }
});

test('loading and retrying an older looted satchel grants its two new bottles once and keeps spent pockets empty', () => {
  const old = chooseRoad();
  assert.ok(bag.takeItem(old, 'veil'));
  Object.assign(old, { hasMap: true, hasVial: true, route: 'unbound' });
  const checkpoint = { ...old };
  delete checkpoint.checkpoint;
  old.checkpoint = JSON.stringify(checkpoint);
  const load = w => store.restoreJourney(JSON.parse(JSON.stringify(w)));
  const loaded = load(old);
  assert.equal(bag.quickItem(loaded, 'item:saveher').count, 1);
  assert.equal(bag.quickItem(loaded, 'item:lastbell').count, 1);
  assert.equal(bag.selectedItem(loaded).id, 'cinder');
  assert.equal(bag.quickItem(loaded, 'item:veil').count, 0);
  game.resumeCheckpoint(loaded);
  assert.equal(bag.quickItem(loaded, 'item:saveher').count, 1);
  assert.ok(bag.takeItem(loaded, 'lastbell'));
  assert.ok(bag.takeItem(loaded, 'saveher'));
  const saved = load(loaded);
  for (const id of ['lastbell', 'saveher']) assert.equal(bag.quickItem(saved, 'item:' + id).count, 0);
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
