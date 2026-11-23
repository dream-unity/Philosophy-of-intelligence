const assert = require('node:assert/strict');
const { before, test } = require('node:test');
let game, store, story, travel, inventory;
before(async () => {
  [game, store, story, travel, inventory] = await Promise.all(
    ['world', 'journey-store', 'story', 'travel', 'inventory'].map((n) => import('../zelda-and-the-princess-zombie/' + n + '.mjs'))
  );
});
// Fields serialized by the briefly published v2 bridge edition. Its JSON used
// the same version number as the earlier journey, but a different stamina scale.
function bridge(x = 30, z = 1512.8) {
  const w = game.createWorld();
  delete w.journeyEdition;
  Object.assign(w, { elapsed: 190, gateCrossed: true, gateClosed: false, route: 'guided', greeted: true });
  Object.assign(w.player, { x, z, y: 0.12, yaw: 0, pitch: 0, stamina: 72, maxStamina: 100 });
  delete w.player.feetY;
  w.journal = [{ id: 'route-guided', title: 'The Castle Road', text: 'The witch marked the northern road and gave three cinder phials.', time: 3 }];
  w.potions = 3;
  return w;
}
function load(w) {
  return store.restoreJourney(JSON.parse(JSON.stringify(w)));
}
function approach(w, x, z) {
  for (let i = 0; i < 450; i++) {
    const dx = x - w.player.x, dz = z - w.player.z;
    if (Math.hypot(dx, dz) < 0.17) return;
    w.player.yaw = Math.atan2(dx, dz);
    game.tick(w, 1 / 30, { forward: 1, walk: true });
  }
  assert.fail('Could not reach ' + [x, z] + ' from ' + [w.player.x, w.player.z]);
}
test('the retired east gallery maps to a walkable landing and stairs, and ordinary courtyard coordinates stay put', () => {
  const before = bridge(50.6, 1455.7);
  Object.assign(before, { dialogue: { kind: 'clue', speaker: 'The Bell Gallery', text: 'A heavy bell rope runs from this courtyard pulley.', choices: [] } });
  before.journal.push({ id: 'bell-gallery', title: 'The Bell Gallery', text: 'Every peal was pulled from inside the banquet room.', time: 188 });
  const w = load(before);
  assert.equal(story.storyLocation(w), 'The Bellfounder’s Gallery');
  assert.equal(w.dialogue.speaker, 'The Bell Gallery');
  assert.equal(w.journal.find((j) => j.id === 'gallery').at, 188);
  assert.ok(w.galleryOpenedAt == null);
  assert.ok(game.act(w, 'close'));
  approach(w, 18, 1458.4);
  approach(w, 18, 1441);
  assert.ok(!story.storyLocation(w));
  assert.ok(w.gateCrossed);
  const stair = load(bridge(52, 1446));
  assert.equal(stair.player.z, 1449);
  assert.equal(stair.player.feetY, travel.footHeight(stair, stair.player.x, stair.player.z));
  const court = load(bridge(36, 1446));
  assert.deepEqual([court.player.x, court.player.z], [36, 1446]);
});
test('a legacy banquet preserves the meaning and availability of its displayed keys, even at the former reveal distance', () => {
  const base = bridge(30, 1499);
  base.milestones.reveal = true;
  base.dialogue = { kind: 'banquet', text: 'Xero rises from the table.', speaker: 'The Long Hall',
    choices: [{ id: 2, label: 'Reach for the princess' }, { id: 3, label: 'Step back and watch' }] };
  const w = load(base);
  assert.deepEqual(w.dialogue.choices, base.dialogue.choices);
  assert.ok(w.player.z > 1510);
  assert.ok(game.choose(w, 3));
  assert.ok(w.watchedTable);
  assert.equal(w.tableKnockAt, undefined);
  assert.equal(w.sequence, null);
  assert.ok(game.act(w, 'interact'));
  assert.ok(game.choose(w, 2));
  assert.equal(w.sequence.id, 'feast');
  const rescue = structuredClone(base);
  Object.assign(rescue, { route: 'unbound', hasVial: true, hasMap: true, antidote: true });
  rescue.dialogue.choices = [{ id: 1, label: 'Break the moonwater vial over Xero’s hand' }, { id: 2, label: 'Reach for the princess' }];
  const vial = load(rescue);
  assert.equal(game.choose(vial, 3), false);
  assert.ok(game.choose(vial, 1));
  assert.equal(vial.sequence.id, 'saved');
});
test('live bridge-edition fate snapshots retain their clock fraction, hand pose, committed effects and eventual ending', () => {
  for (const [id, duration, time] of [['feast', 3.8, 2.4], ['bound', 4.4, 8 / 3], ['saved', 4.1, 17 / 6]]) {
    const before = bridge();
    before.sequence = { id, x: before.player.x, z: before.player.z, yaw: 0, pitch: 0,
      time, duration, progress: time / duration, resisted: id === 'bound', contact: id === 'feast' };
    if (id === 'saved') {
      before.ropeFallen = true;
      before.dispersalAt = 188.78;
      before.actors.find((a) => a.type === 'body').freed = true;
      before.actors.find((a) => a.type === 'princess').cured = true;
    }
    const w = load(before);
    assert.equal(w.sequence.progress, time / duration);
    assert.ok(Number.isFinite(story.storyHandPose(w).clench));
    game.tick(w, 1 / 30, {});
    assert.ok(Math.abs(w.sequence.progress - (time / duration + 1 / 30 / story.storyFates[id].duration)) < 1e-8);
    assert.ok(!w.events.some((e) => ['cure','release','hurt','compel','shackle'].includes(e.type)));
    if (id === 'saved') assert.equal(w.dispersalAt, before.dispersalAt);
    for (let i = 0; i < 400 && !w.ending; i++) game.tick(w, 1 / 30, {});
    assert.equal(w.ending.id, id);
    assert.deepEqual(load(w).ending, w.ending);
  }
});
test('loading a gate mid-closure still shows the rest of the arrival, then commits the same loss', () => {
  const base = bridge(0, 7.4);
  Object.assign(base, { elapsed: 365.52, gateCrossed: false, gateClosed: true,
    sequence: { id: 'horde', time: 0.5, duration: 3.3, progress: 0.5 / 3.3, x: 0, z: 7.4 } });
  const w = load(base);
  assert.ok(Math.abs((w.elapsed - w.gateClosedAt) / 3.25 - 0.5 / 3.3) < 1e-8);
  for (let i = 0; i < 75; i++) game.tick(w, 1 / 30, {});
  assert.ok(!w.ending);
  for (let i = 0; i < 12; i++) game.tick(w, 1 / 30, {});
  assert.equal(w.ending.id, 'horde');
});
test('legacy directions preserve the three promised cinders, their original note, and the crossroads after a retry', () => {
  const base = bridge(0, 7.4);
  base.gateCrossed = false;
  base.dialogue = { kind: 'directions', speaker: 'The witch', text: 'Three cinder phials for the road.', choices: [] };
  const checkpoint = { ...base }; delete checkpoint.checkpoint;
  base.checkpoint = JSON.stringify(checkpoint);
  const w = load(base);
  const run = w.runId;
  assert.ok(game.act(w, 'close'));
  game.tick(w, 1 / 30, {});
  assert.deepEqual(inventory.bagItems(w).map((i) => [i.id, i.count]), [['cinder', 3]]);
  assert.deepEqual(w.journal.filter((j) => j.id === 'guided').map((j) => [j.text, j.at]), [[base.journal[0].text, 3]]);
  game.resumeCheckpoint(w);
  assert.equal(w.runId, run);
  assert.ok(w.legacyCrossroads);
  assert.equal(w.potions, 3);
});
