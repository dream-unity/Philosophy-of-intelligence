const { before, test } = require('node:test');
const assert = require('node:assert/strict');
let world, march, travel;
before(async () => {
  [world, march, travel] = await Promise.all(['world', 'procession', 'travel'].map(
    n => import('../zelda-and-the-princess-zombie/' + n + '.mjs')
  ));
});
test('the western files take the ford on their way between the forest road and the castle, even with a shut bridge', () => {
  const w = world.createWorld();
  for (const id of march.roadFileIds) {
    let enteredFord = false;
    for (let t = 0; t < 940; t += 0.48) {
      w.elapsed = t;
      const p = world.rankPosition(w, id);
      assert.equal(travel.barrier(w, p.x, p.z, 0.22), '', 'walkable ground for file ' + id);
      if (p.z > 1010 && p.z < 1032) {
        enteredFord = true;
        assert.ok(Math.abs(p.x + 125) < 1.2);
      }
    }
    assert.ok(enteredFord);
  }
});
test('successive real arrivals pass the open wicket, share six seats and leave them for another group', () => {
  const w = world.createWorld();
  const seen = new Set();
  const earlier = new Map();
  for (const age of [-4, -1, ...Array.from({length: 1100}, (_,i)=>i * 0.3), 4360, 6502, 12019]) {
    w.elapsed = 435 + age;
    w.gateClosedAt = age >= 0 ? 435 : null;
    const guests = march.castleGuests(w);
    assert.ok(guests.length < 54);
    const seats = new Set();
    for (const id of guests) {
      const p = world.rankPosition(w,id);
      assert.equal(travel.barrier(w,p.x,p.z,0.24), '', 'the iron and both doorways admit the same body');
      if (march.guestAtTable(w,id)) {
        assert.ok(Math.hypot(p.x-31.65, p.z-1517) < 3.6);
        const key = p.x.toFixed(3) + ',' + p.z.toFixed(3);
        assert.ok(!seats.has(key), 'one body per seat');
        seats.add(key);
        seen.add(id);
        if (earlier.get(key) !== id) earlier.set(key, id);
      }
    }
    assert.ok(seats.size <= 6);
  }
  assert.equal(earlier.size, 6);
  assert.ok(seen.size >= 35);
  const first = march.castleGuestIds[0];
  w.elapsed = 515;
  assert.ok(march.guestAtTable(w,first));
  const seated = world.rankPosition(w,first);
  w.elapsed = 571;
  assert.ok(!march.guestAtTable(w,first));
  assert.ok(Math.hypot(world.rankPosition(w,first).x-seated.x,world.rankPosition(w,first).z-seated.z) > 12);
  w.elapsed = 515;
  w.hostFallen = {[first]:true};
  assert.equal(march.guestAtTable(w,first),false);
  w.hostFallen = {};
  w.ropeFallen = true;
  w.dispersalAt = 515;
  assert.equal(march.guestAtTable(w,first),false);
  w.elapsed += 5;
  assert.ok(world.rankPosition(w,first).z < seated.z - 5);
});
test('an early banquet death can show the later meal without rewriting the race or reviving fallen guests', () => {
  const w = world.createWorld();
  w.gateCrossed = true;
  w.elapsed = 330;
  w.ending = {id:'feast'};
  w.hostFallen = {[march.castleGuestIds[0]]:true};
  const before = JSON.stringify(w);
  const scene = world.feastAftermath(w);
  assert.ok(scene.feastAftermath && scene.elapsed > w.elapsed);
  scene.elapsed += 18;
  const atTable = march.castleGuests(scene).filter(id=>march.guestAtTable(scene,id));
  assert.ok(atTable.length >= 3);
  assert.ok(!atTable.includes(march.castleGuestIds[0]));
  assert.equal(JSON.stringify(w),before);
  w.ending = {id:'saved'};
  assert.equal(world.feastAftermath(w),null);
});
test('even the final rank leader takes a real turn at the table and a depleted host cannot attend', () => {
  const w = world.createWorld();
  w.gateClosedAt = 435;
  w.hostFallen = Object.fromEntries(Array.from({length: world.HORDE_COUNT - 1}, (_, i) => [i + 1, true]));
  const seatTime = march.nextMealAge(w, 0);
  assert.ok(Number.isFinite(seatTime));
  w.elapsed = w.gateClosedAt + seatTime + 2;
  assert.ok(march.castleGuests(w).includes(0));
  assert.ok(march.guestAtTable(w, 0));
  assert.ok(world.rankPosition(w, 0).z > 1515);
  assert.ok(world.rankPosition(w, 0, true).z < 1436);
  w.hostFallen[0] = true;
  w.ending = {id: 'feast'};
  assert.equal(march.nextMealAge(w, 0), Infinity);
  assert.equal(world.feastAftermath(w), null);
});
