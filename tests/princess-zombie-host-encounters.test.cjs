const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let game, travel, store, inventory, march;
before(async () => {
  [game, travel, store, inventory, march] = await Promise.all(
    ['world', 'travel', 'journey-store', 'inventory', 'procession'].map(
      (file) => import('../zelda-and-the-princess-zombie/' + file + '.mjs')
    )
  );
});
function advance(w, seconds, stop = () => false) {
  for (let i = 0; i < Math.ceil(30 * seconds) && !w.ending && !stop(); i++)
    game.tick(w, 1 / 30);
}
function waitBesideColumn(metres = 7) {
  const w = game.createWorld();
  Object.assign(w, { elapsed: 200, greeted: true, route: 'wander', nextHunt: 1e6 });
  const edge = game.hordePosition(w, 47), centre = game.hordePosition(w, 0);
  const dx = edge.x - centre.x, dz = edge.z - centre.z, spread = Math.hypot(dx, dz);
  const x = edge.x + metres * dx / spread, z = edge.z + metres * dz / spread;
  Object.assign(w.player, { x, z, feetY: travel.footHeight(w, x, z), yaw: Math.atan2(-dx, -dz) });
  return w;
}
function face(w, q) {
  w.player.yaw = Math.atan2(q.x - w.player.x, q.z - w.player.z);
  w.player.pitch = -0.09;
}
const hurt = (w) => w.events.some((e) => e.type === 'hurt' && e.text === 'host');
test('an unprovoked passer-by is noticed, pursued and bitten beside the march; a saved warning stays interruptible', () => {
  const w = waitBesideColumn();
  const initialHealth = w.player.health;
  advance(w, 6, () => Boolean(w.hostWarning));
  assert.ok(w.hostWarning, 'one living zombie must leave the formation and threaten the traveller');
  assert.ok(w.events.some((e) => e.type === 'telegraph' && e.text === 'host'));
  assert.equal(w.player.health, initialHealth);
  const hand = w.hostWarning.i;
  assert.ok(Math.hypot(w.hostActors[hand].x - w.player.x, w.hostActors[hand].z - w.player.z) < 2);
  const saved = store.restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.deepEqual(game.hordePosition(saved, hand), game.hordePosition(w, hand));
  advance(w, 3, () => hurt(w));
  assert.ok(hurt(w));
  assert.equal(w.player.health, initialHealth - 1);
  advance(saved, 0.92);
  face(saved, game.hordePosition(saved, hand));
  assert.ok(game.act(saved, 'guard'));
  advance(saved, 0.55);
  assert.equal(saved.player.health, initialHealth);
  assert.ok(saved.events.some((e) => e.type === 'block' && e.text === 'host'));
  advance(w, 22);
  assert.equal(w.ending?.id, 'taken', 'remaining surrounded can end the journey through zombie contact');
});
test('the public equipment action burns actual marchers, and a restored journey remembers which individuals fell', () => {
  const w = waitBesideColumn(4);
  inventory.giveRoadBottles(w);
  advance(w, 4, () => Boolean(w.hostWarning));
  const id = w.hostWarning.i;
  face(w, game.hordePosition(w, id));
  w.player.pitch = -0.48;
  assert.ok(game.act(w, 'item:cinder'));
  advance(w, 1.4);
  assert.equal(w.hostFallen?.[id], true);
  assert.ok(w.events.some((e) => e.type === 'potion' && e.text === 'shatter'));
  const saved = store.restoreJourney(JSON.parse(JSON.stringify(w)));
  assert.equal(saved.hostFallen[id], true);
  advance(saved, 4.5);
  assert.ok(saved.hostFallen[id]);
  assert.notEqual(saved.hostWarning?.i, id);
  assert.ok(!saved.hostActors?.[id] || !saved.hostActors[id].hp);
});
test('a marcher enters the wicket, feeds, and walks back while another takes the same place', () => {
  const w = game.createWorld();
  Object.assign(w, { greeted: true, gateCrossed: true, elapsed: w.raceDuration - 0.25, route: 'guided' });
  advance(w, 3, () => w.gateClosedAt != null);
  assert.ok(Number.isFinite(w.gateClosedAt), 'a living member of the host must reach the gate');
  const id = march.castleGuestIds[0];
  const entry = game.hordePosition(w, id);
  let crossedIn = false, crossedOut = false, seat, replacement;
  let last = entry;
  for (let sec = 0; sec <= 200; sec += 0.5) {
    w.elapsed = w.gateClosedAt + sec;
    const q = game.hordePosition(w, id);
    assert.ok(Math.hypot(q.x - last.x, q.z - last.z) < 1.5, 'both legs of the journey are continuous');
    if ((last.z < 1435) !== (q.z < 1435)) {
      assert.ok(Math.abs(q.x - 33.55) < 1);
      assert.ok(march.guestWicketLift(w) > 1.5, 'the wicket must be open on both crossings');
      if (q.z >= 1435) crossedIn = true;
      else {
        assert.ok(seat, 'the first guest must have eaten before leaving the castle');
        crossedOut = true;
      }
    }
    if (march.guestAtTable(w, id)) {
      assert.ok(crossedIn);
      assert.ok(Math.hypot(q.x - 31, q.z - 1517) < 4);
      seat = q;
    } else if (seat && !replacement) {
      replacement = march.castleGuests(w).find((i) => {
        if (i === id || !march.guestAtTable(w, i)) return false;
        const next = game.hordePosition(w, i);
        return Math.hypot(next.x - seat.x, next.z - seat.z) < 0.1;
      });
    }
    last = q;
  }
  assert.ok(crossedOut);
  assert.ok(Number.isInteger(replacement), 'another real member of the host must take the vacated seat');
  assert.ok(Math.hypot(last.x - entry.x, last.z - entry.z) < 1, 'the first guest returns to its file');
  assert.ok(game.hordePosition(w, 1000).z < 1435, 'the rest still crowd the approach');
});
test('choosing the ordinary road encounters an actual hungry scout well before the river', () => {
  const w = game.createWorld();
  function walkTo(x, z, stop) {
    for (let i = 0; i < 30 * 90 && !w.ending && !w.dialogue && !stop(); i++) {
      if (Math.hypot(x - w.player.x, z - w.player.z) < 1.15) break;
      w.player.yaw = Math.atan2(x - w.player.x, z - w.player.z);
      game.tick(w, 1 / 30, { forward: 1, sprint: true });
    }
  }
  walkTo(0, 9, () => false);
  assert.ok(game.choose(w, 1));
  game.act(w, 'close');
  walkTo(-2, 12, () => false);
  const noticed = () => w.events.some((e) => e.type === 'host' && e.text === 'notice');
  for (const [x, z] of game.MAP.road.filter(([, z]) => z > 9 && z < 450)) {
    walkTo(x, z, noticed);
    if (noticed()) break;
  }
  assert.ok(noticed(), 'taking the open road should expose the player to the moving host');
  const scout = Object.values(w.hostActors).find((a) => march.roadFileIds.includes(a.i));
  assert.ok(scout);
  assert.ok(Math.hypot(scout.x - w.player.x, scout.z - w.player.z) < 24);
  advance(w, 14, () => hurt(w));
  assert.ok(hurt(w), 'idling in the approaching scout’s path allows it to catch the player');
});
