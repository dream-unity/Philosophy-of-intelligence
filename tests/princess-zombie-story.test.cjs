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

test('Xero reaches the actual wrist for the attack and lays an open hand beneath the rescued player’s palm', async () => {
  const { contactPose } = await import('../zelda-and-the-princess-zombie/story-contact.mjs');
  for (const ready of [false, true])
    for (const reduced of [false, true]) {
      const w = enterBanquet(ready);
      w.reducedMotion = reduced;
      w.player.yaw += 0.28;
      assert.ok(world.choose(w, ready ? 1 : 2));
      advanceTo(w, w.sequence.duration * 0.15);
      let pose = contactPose(w, art.storyFigure(w), world.terrainHeight);
      assert.equal(pose.joined, 0, 'a hand cannot reach across the room');
      advanceTo(w, w.sequence.duration * 0.955);
      pose = contactPose(w, art.storyFigure(w), world.terrainHeight);
      assert.equal(pose.joined, 1);
      assert.equal(art.storyHandPose(w).physical, true);
      const contact = ready ? pose.palm : pose.wrist;
      assert.ok(Math.hypot(...pose.queenPalm.map((v, i) => v - contact[i])) < 0.06);
      assert.ok(ready ? pose.queenPalm[1] < contact[1] : pose.queenPalm[1] > contact[1]);
      const sections = { beam: 0, quad: 0, tri: 0 };
      const capture = Object.fromEntries(
        Object.keys(sections).map((k) => [
          k,
          (_, ...values) => {
            sections[k]++;
            assert.ok(values.filter(Array.isArray).flat().every(Number.isFinite));
          },
        ])
      );
      art.storyHands([], capture, w);
      assert.ok(sections.beam > 18 && sections.quad >= 32 && sections.tri >= 16);
    }
});

test('the fixed bell stays in place and the loose wrist loop falls independently after the lunge', () => {
  const w = enterBanquet();
  world.choose(w, 2);
  advanceTo(w, w.sequence.duration * 0.28);
  const first = art.storyTethers(w),
    anchor = first[0].a;
  assert.equal(w.tetherRelease, undefined);
  advanceTo(w, w.sequence.duration * 0.38);
  assert.equal(w.tetherRelease.cause, 'slip');
  const start = art.storyTethers(w).at(-1).b;
  advanceTo(w, w.sequence.duration * 0.71);
  const final = art.storyTethers(w);
  assert.deepEqual(final[0].a, anchor);
  const dangling = final.at(-1).b;
  assert.ok(dangling[1] < start[1] - 0.6);
  assert.ok(Math.hypot(dangling[0] - anchor[0], dangling[2] - anchor[2]) < 0.25);
  assert.ok(Math.hypot(dangling[0] - art.storyFigure(w).x, dangling[2] - art.storyFigure(w).z) > 1.5);
  assert.equal(w.ropeFallen, false, 'a broken loop does not cure the princess or disperse the host');
});

test('vial leaves the player’s hand, breaks at Xero, and the candlelit table stays visible from the aisle', () => {
  const w = enterBanquet(true);
  world.choose(w, 1);
  advanceTo(w, w.sequence.duration * 0.056);
  const belt = art.storyPieces(w).find((p) => p.key === 'vial-silver');
  assert.ok(belt.z < w.player.z + 1 && belt.z > w.player.z);
  advanceTo(w, w.sequence.duration * 0.176);
  const flight = art.storyPieces(w).find((p) => p.key === 'vial-silver');
  assert.ok(flight.z > belt.z + 2);
  advanceTo(w, w.sequence.duration * 0.215);
  const pieces = art.storyPieces(w);
  assert.ok(!pieces.some((p) => p.key === 'vial-silver'));
  assert.ok(pieces.filter((p) => p.key === 'silver-drop').length >= 7);
  assert.ok(pieces.some((p) => p.key === 'rushlight'));
  assert.equal(story.storyPassable(31, 1519.75, w, 31, 1519.45), false);
  assert.equal(story.storyPassable(35.1, 1519.75, w, 35.1, 1519.45), true);
});

test('each of the four painted witch gestures moves its own prop while keeping the frame edges registered', async () => {
  const { witchWarp } = await import('../zelda-and-the-princess-zombie/story-witch.mjs');
  for (const [beat, x, y] of [
    [0, 0.25, 0.61],
    [1, 0.39, 0.6],
    [2, 0.32, 0.31],
    [3, 0.65, 0.48],
  ]) {
    const a = witchWarp(beat, x, y, 0.5),
      b = witchWarp(beat, x, y, 2.6);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.0005);
    assert.deepEqual(witchWarp(beat, 0, 0.5, 1), [0, 0.5]);
  }
});

test('Canvas places painted fingers at their projected 3D height in a pitched close-up', () => {
  const w = enterBanquet(true);
  world.choose(w, 1);
  advanceTo(w, w.sequence.duration * 0.94);
  const fig = art.storyFigure(w),
    queue = [],
    strips = [];
  const eye = world.terrainHeight(w.player.x, w.player.z) + 1.83,
    c = Math.cos(w.player.pitch),
    s = Math.sin(w.player.pitch),
    h = 510,
    f = 0.685 * h;
  function ray(x, y, z) {
    const dz = z - w.player.z,
      dy = y - eye,
      depth = c * dz + s * dy;
    return [425 + ((x - w.player.x) * f) / depth, h * 0.5 - ((dy * c - dz * s) * f) / depth, depth];
  }
  art.paintStoryPortrait({ width: 344, height: 680 }, fig, ray, queue, 1, 0);
  assert.equal(queue.length, 24);
  for (const q of queue) {
    q.draw({
      save() {},
      restore() {},
      translate(x, y) {
        strips.push({ x, y });
      },
      drawImage(...a) {
        strips.at(-1).h = a.at(-1);
      },
    });
  }
  const v = 0.412,
    i = Math.floor(v * 24),
    fraction = v * 24 - i;
  const actual = strips[i].y + (strips[i].h - 0.38) * fraction;
  const physical = ray(fig.x, fig.y + fig.h * (1 - v), fig.z)[1];
  assert.ok(Math.abs(actual - physical) < 0.18);
});
