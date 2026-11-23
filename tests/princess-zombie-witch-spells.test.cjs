const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const folder = '../zelda-and-the-princess-zombie/';
let world, travel, inventory, store, march, query, art, hit;
before(async () => {
  [world, travel, inventory, store, march, query, art, hit] = await Promise.all(
    ['world', 'travel', 'inventory', 'journey-store', 'procession', 'host-query', 'story-art', 'witch-spell-contact']
      .map(name => import(folder + name + '.mjs'))
  );
});
function journey(x, z, yaw = 0) {
  const w = world.createWorld();
  Object.assign(w, { greeted: true, route: 'unbound', elapsed: 100, hostActors: {}, hasMap: true });
  inventory.giveStolenBottles(w);
  inventory.equipItem(w, 'lastbell');
  Object.assign(w.player, { x, z, yaw, pitch: 0, feetY: travel.footHeight(w, x, z) });
  return w;
}
function hunter(w, i, x, z) {
  w.hostActors[i] = { i, x, z, hp: 2, type: 'host', heading: Math.PI, state: 'stagger',
    since: w.elapsed, until: w.elapsed + 8, seenAt: w.elapsed, seenX: x, seenZ: z };
}
function resolveFlight(w) {
  for (let i = 0; i < 180 && w.phialFlight; i++) world.tick(w, 1 / 60);
  assert.equal(w.phialFlight, null);
}
test('one locally witnessed cast kills every rank, hunter and guest while Xero and wildlife survive', () => {
  const w = journey(22, 220), remote = world.hordePosition(w, 3000);
  hunter(w, 3, 22, 224); hunter(w, 99, -110, 1110);
  w.hostFallen = { 55: true };
  w.hostWarning = { i: 99, at: w.elapsed };
  w.hostWounds = { 3: 1 };
  const native = w.actors.map(a => [a.id, a.alive]);
  assert.ok(world.act(w, 'use-equipped'));
  assert.equal(world.act(w, 'item:lastbell'), false);
  assert.equal(Object.keys(w.hostFallen).length, 1);
  world.tick(w, 0.07);
  assert.ok(w.phialFlight && w.phialFlight.z > 220);
  const loaded = store.restoreJourney(w);
  resolveFlight(loaded);
  assert.deepEqual(loaded.actors.map(a => [a.id, a.alive]), native);
  assert.equal(loaded.actors.find(a => a.type === 'princess').cured, undefined);
  assert.equal(Object.keys(loaded.hostFallen).length, world.HORDE_COUNT);
  for (let i = 0; i < world.HORDE_COUNT; i++) assert.equal(loaded.hostFallen[i], true);
  assert.deepEqual(loaded.hostActors, {});
  assert.equal(loaded.hostWarning, undefined);
  assert.equal(inventory.quickItem(loaded, 'item:lastbell').count, 0);
  assert.equal(inventory.quickItem(loaded, 'item:saveher').count, 1);
  const later = store.restoreJourney(loaded);
  assert.equal(world.secondsToGate(later), Infinity);
  later.elapsed = 540;
  assert.equal(query.hostWithin(later, remote, 50, world.rankPosition).length, 0);
  assert.equal(march.castleGuests(later).some(i => march.guestAtTable(later, i)), false);
  assert.equal(later.lastBellCastAt, loaded.lastBellCastAt);
});
test('the bell needs a real witness at impact; empty ground and a wall-shielded body let Zelda retry', () => {
  const w = journey(6.4, 1480, Math.PI / 2);
  hunter(w, 22, 9.5, 1480);
  assert.ok(world.act(w, 'item:lastbell')); resolveFlight(w);
  assert.equal(w.lastBellCastAt, undefined);
  assert.equal(w.bag.stock.lastbell, 1);
  assert.ok(w.events.some(e => e.type === 'potion' && e.text === 'rebound'));
  const open = journey(22, 220);
  // Bottle lands on empty ground. An off-axis walker, three metres from its
  // landing, hears the impact even though the glass never touched its body.
  assert.ok(world.act(open, 'item:lastbell')); resolveFlight(open);
  assert.equal(open.lastBellCastAt, undefined);
  for (let i=0;i<90;i++) world.tick(open, 1/60);
  const impact = open.events.find(e => e.type === 'potion' && e.text === 'rebound');
  hunter(open, 19, impact.x + 3, impact.z);
  assert.ok(world.act(open, 'item:lastbell')); resolveFlight(open);
  assert.equal(Object.keys(open.hostFallen).length, world.HORDE_COUNT);
});
test('Save Her striking the visible princess wins with both the host and Moonwell quest untouched', () => {
  const w = journey(30, 1512);
  w.gateCrossed = true;
  assert.ok(inventory.equipItem(w,'saveher'));
  assert.ok(world.act(w,'use-equipped'));
  world.tick(w, 0.08);
  assert.equal(w.royalPrize, undefined);
  assert.ok(w.phialFlight.z > w.player.z);
  const loaded = store.restoreJourney(w);
  resolveFlight(loaded);
  assert.equal(loaded.sequence.id,'saved');
  assert.equal(loaded.actors.find(a=>a.type==='princess').cured,true);
  assert.ok(loaded.royalPrize);
  assert.equal(loaded.antidote,false);
  assert.equal(Object.keys(loaded.hostFallen || {}).length,0);
  assert.equal(inventory.quickItem(loaded,'item:saveher').count,0);
  assert.equal(inventory.quickItem(loaded,'item:lastbell').count,1);
  assert.equal(loaded.bag.selected,null);
});
test('a Last Bell cast at or beside cursed Xero clears the distant host and leaves her available for Save Her', () => {
  for (const x of [30, 27]) {
    const w = journey(x, 1512);
    w.gateCrossed = true;
    w.hasVial = w.antidote = true;
    if (x === 27) w.player.pitch = -0.45; // Land on the rushes beside her, clear of the candlestick.
    const princess = w.actors.find(actor => actor.type === 'princess');
    assert.equal(query.hostWithin(w, princess, 15, world.rankPosition).length, 0);
    assert.ok(world.act(w, 'use-equipped'));
    resolveFlight(w);
    assert.equal(Object.keys(w.hostFallen).length, world.HORDE_COUNT);
    assert.ok(princess.alive && !princess.cured);
    assert.equal(w.royalPrize, undefined);
    assert.equal(w.bag.stock.saveher, 1);
    assert.equal(w.dialogue, null);
    for (let i = 0; i < 90; i++) world.tick(w, 1 / 60);
    const figure = art.storyFigure(w);
    const distance = Math.hypot(figure.x - w.player.x, figure.z - w.player.z);
    w.player.yaw = Math.atan2(figure.x - w.player.x, figure.z - w.player.z);
    w.player.pitch = Math.atan2(figure.y + figure.h * 0.5 - w.player.feetY - 1.64, distance);
    assert.ok(world.act(w, 'item:saveher'));
    resolveFlight(w);
    assert.ok(princess.alive && princess.cured);
    assert.equal(w.royalPrize.phase, 'restoring');
    assert.equal(w.antidote, true);
  }
});
test('a near miss beside Xero and a shot through the rear wall cannot restore her', () => {
  for (const [x,z,yaw] of [[28.3,1511,0],[30.6,1532,Math.PI]]) {
    const w = journey(x,z,yaw);
    w.gateCrossed = true;
    assert.ok(world.act(w,'item:saveher')); resolveFlight(w);
    assert.equal(w.royalPrize,undefined);
    assert.equal(w.bag.stock.saveher,1);
    assert.equal(w.actors.find(a=>a.type==='princess').cured,undefined);
  }
});
test('the hit shape follows both mirrored kneeling poses and excludes clear air above a sleeve', () => {
  for (const dir of [-1,1]) {
    const w=journey(30,1513,dir===1?0:Math.PI);
    const f=art.storyFigure(w);
    const local = (u,v,depth) => {
      const side=(u-0.5)*f.h*832/680 * (f.flip?-1:1);
      return [f.x+dir*side,f.y+v*f.h,f.z+depth];
    };
    const target=hit.princessBottleTarget(w,w.elapsed);
    assert.ok(Number.isFinite(hit.princessBottleEntry(target,local(0.13,0.75,-.2),local(0.13,0.75,.2))));
    assert.equal(hit.princessBottleEntry(target,local(0.88,0.85,-.2),local(0.88,0.85,.2)),Infinity);
  }
});
