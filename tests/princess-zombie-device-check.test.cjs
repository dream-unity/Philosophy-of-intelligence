const { test } = require('node:test');
const assert = require('node:assert/strict');
test('device check records submitted frames, skips menus and background, counts a slow frame and measures first pending input', async () => {
  const { createFieldCheck } = await import('../zelda-and-the-princess-zombie/field-check.mjs');
  const check = createFieldCheck(),
    world = { player: { x: 0, z: 0 }, actors: [] },
    surface = { width: 800, height: 450 };
  const frame = (t) => check.frame(t, world, surface, 'WebGL');
  frame(0);
  assert.deepEqual(check.snapshot(), []);
  check.start();
  frame(100);
  check.input(108);
  check.input(113);
  frame(132);
  frame(190);
  check.pause();
  frame(60000);
  frame(60034);
  check.input(60100);
  check.pause();
  frame(90000);
  frame(91110);
  const [forest] = check.snapshot();
  assert.equal(forest.frames, 4);
  assert.equal(forest.inputs, 1);
  assert.equal(forest.inputP95, 24);
  assert.equal(forest.median, 34);
  assert.equal(forest.p95, '>1000');
  assert.equal(forest.worst, 1110);
  assert.equal(forest.seconds, 1.234);
  assert.equal(forest.size, '800 × 450');
  check.stop();
  frame(100000);
  assert.deepEqual(check.snapshot(), [forest]);
  check.reset();
  assert.deepEqual(check.snapshot(), []);
});

test('the game entry pins its module graph and stylesheet to the published file contents', async () => {
  const { versionGamePage } = await import('../scripts/version-princess-zombie.mjs');
  const { html, original } = versionGamePage();
  assert.ok(html.includes('type="importmap"'));
  assert.equal(html, original, 'run node scripts/version-princess-zombie.mjs after changing game sources');
});

test('automatic detail steps down during genuine four-FPS foreground work, recovers and ignores an idle gap', async () => {
  const { createQualityController } = await import('../zelda-and-the-princess-zombie/render-quality.mjs');
  for (const fallback of [false, true]) {
    const budget = createQualityController(fallback);
    let time = 1000;
    budget.sample(time);
    budget.sample((time += 5000), 'auto', 7);
    assert.equal(budget.level, 1);
    for (let i = 0; i < 28; i++) budget.sample((time += 250), 'auto', 139);
    assert.equal(budget.level, fallback ? 0.55 : 0.66);
    const floor = budget.level;
    budget.sample((time += 18000), 'auto', 139);
    assert.equal(budget.level, floor);
    for (let i = 0; i < 1600; i++) budget.sample((time += 16.7), 'auto', 9);
    assert.equal(budget.level, 1);
  }
});

test('a keyboard walk and a small joystick deflection both move at walking pace', async () => {
  const { createWorld, tick } = await import('../zelda-and-the-princess-zombie/world.mjs');
  function speed(input) {
    const world = createWorld();
    Object.assign(world.player, { x: 0, z: -60, yaw: 0 });
    for (let i = 0; i < 90; i++) tick(world, 1 / 30, input);
    return world.player.speed;
  }
  for (const s of [speed({ forward: 1, walk: true, sprint: true }), speed({ forward: 0.4 })])
    assert.ok(s > 1.4 && s < 1.7, s);
  assert.ok(speed({ forward: 1 }) > 3.6);
  assert.ok(speed({ forward: 1, sprint: true }) > 6.1);
});
