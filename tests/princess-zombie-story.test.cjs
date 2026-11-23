const { before, test } = require('node:test');
const assert = require('node:assert/strict');

let world, story, art;
before(async () => {
  [world, story, art] = await Promise.all(
    ['world', 'story', 'story-art'].map((file) => import(`../zelda-and-the-princess-zombie/${file}.mjs`))
  );
});

function advanceTo(w, seconds) {
  while (w.sequence && w.sequence.time + 0.00001 < seconds)
    world.tick(w, Math.min(0.05, seconds - w.sequence.time));
}

function enterBanquet(ready = false) {
  const w = world.createWorld();
  Object.assign(w, {
    gateCrossed: true,
    greeted: true,
    route: ready ? 'unbound' : 'guided',
    antidote: ready,
  });
  Object.assign(w.player, { x: 30, z: 1512, yaw: 0, pitch: 0 });
  assert.equal(world.act(w, 'interact'), true);
  assert.equal(w.dialogue.kind, 'banquet');
  return w;
}

test('the uncured reeds change only after actual moonwater collection', () => {
  const w = world.createWorld();
  w.greeted = true;
  Object.assign(w.player, { x: -155, z: 846, yaw: 0 });
  const reeds = () => art.storyPieces(w).filter((p) => p.key.startsWith('reed-'));
  assert.equal(reeds().length, 5);
  assert.ok(reeds().every((p) => p.key === 'reed-cold'));
  world.act(w, 'interact');
  assert.equal(w.reedAt, undefined);
  w.hasVial = true;
  world.act(w, 'interact');
  assert.ok(w.antidote);
  world.act(w, 'close');
  for (let i = 0; i < 7; i++) world.tick(w, 0.35);
  assert.ok(reeds().every((p) => p.key === 'reed-living'));
  assert.equal(w.journal.filter((entry) => entry.id === 'spring').length, 1);
});

test('the kneeling portrait and bell line meet the hart and wrist from either aisle', () => {
  const w = world.createWorld();
  Object.assign(w.player, { x: 30, z: 1510 });
  for (const yaw of [0, 0.8, Math.PI, -1.9]) {
    w.player.yaw = yaw;
    const pose = art.storyFigure(w);
    assert.equal(pose.key, 'feeding');
    const span = (pose.flip ? 1 : -1) * pose.h * (832 / 680);
    const mouthX = pose.x + span * 0.38 * Math.cos(yaw);
    const mouthZ = pose.z - span * 0.38 * Math.sin(yaw);
    assert.ok(Math.hypot(mouthX - 31.16, mouthZ - 1516.62) < 0.04);
    const cord = art.storyTethers(w);
    assert.equal(cord.length, 5);
    for (let i = 1; i < cord.length; i++) assert.deepEqual(cord[i - 1].b, cord[i].a);
    const [wx, wy, wz] = cord.at(-1).b;
    assert.ok(
      Math.hypot(wx - (pose.x + span * 0.26 * Math.cos(yaw)), wz - (pose.z - span * 0.26 * Math.sin(yaw))) <
        0.04
    );
    assert.ok(wy > pose.y + 0.85 && wy < pose.y + 1.08);
  }
});

test('the banquet may be left and revisited until the player actually offers a hand', () => {
  const w = enterBanquet();
  assert.equal(world.choose(w, 1), false);
  assert.equal(world.act(w, 'close'), true);
  assert.equal(w.sequence, null);
  world.act(w, 'interact');
  assert.equal(world.choose(w, 2), true);
  advanceTo(w, story.storyFates.feast.duration * 0.55);
  assert.equal(art.storyFigure(w).key, 'lunge');
  assert.ok(art.storyHandPose(w).clench > 0.9);
  assert.equal(w.events.filter((e) => e.type === 'meal' && e.text === 'ribbon').length, 1);
  advanceTo(w, 7);
  assert.equal(w.player.health, 0);
  assert.equal(w.ending.id, 'feast');
});

test('Xero releases the rope, frees the live hart and only then recognizes Zelda', () => {
  const w = enterBanquet(true);
  assert.ok(world.choose(w, 1));
  const duration = story.storyFates.saved.duration;
  const hart = () => art.storyPieces(w).find((p) => p.key.startsWith('hart-'));
  const before = hart();
  assert.equal(before.key, 'hart-rest');
  advanceTo(w, duration * 0.29);
  assert.equal(art.storyFigure(w).key, 'cured');
  assert.ok(w.ropeFallen && art.storyPieces(w).some((p) => p.key === 'rope-coil'));
  advanceTo(w, duration * 0.51);
  assert.equal(hart().key, 'hart-fold');
  advanceTo(w, duration * 0.88);
  const after = hart();
  assert.match(after.key, /^hart-step-/);
  assert.ok(after.z < before.z - 4 && after.y < before.y - 0.7);
  assert.deepEqual(
    w.events.filter((e) => ['cure', 'release', 'recognition'].includes(e.type)).map((e) => e.type),
    ['cure', 'release', 'recognition']
  );
  const wristLine = art.storyTethers(w);
  assert.ok(wristLine.at(-1).b[1] < before.y - 0.5);
  advanceTo(w, duration + 1);
  assert.equal(w.ending.id, 'saved');
});

test('a player can resist the command while camera motion is reduced', () => {
  const w = world.createWorld();
  Object.assign(w.player, { z: 6, yaw: 0, pitch: 0.19 });
  world.tick(w, 0.03);
  assert.equal(w.dialogue.kind, 'witch');
  world.choose(w, 2);
  w.reducedMotion = true;
  const { x, z, yaw, pitch } = w.player;
  advanceTo(w, 1.4);
  assert.equal(world.act(w, 'resist'), true);
  assert.equal(w.sequence.resisted, true);
  assert.equal(w.events.filter((e) => e.type === 'compel' && e.text === 'resist').length, 1);
  advanceTo(w, 6.8);
  assert.ok(art.storyHandPose(w).reach > 0.9);
  assert.deepEqual([w.player.x, w.player.z, w.player.yaw, w.player.pitch], [x, z, yaw, pitch]);
  advanceTo(w, 9);
  assert.equal(w.ending.id, 'bound');
});
