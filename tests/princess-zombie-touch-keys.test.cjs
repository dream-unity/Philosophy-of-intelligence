const assert = require('node:assert/strict');
const { test } = require('node:test');

test('two field keys start with independent Run and Sword, swap on conflict and survive reload', async () => {
  const { touchKeys, assignTouchKey } = await import('../zelda-and-the-princess-zombie/touch-keys.mjs');
  const pins = touchKeys();
  assert.deepEqual(pins, { movement: 'run', action: 'strike' });
  assert.ok(assignTouchKey(pins, 'movement', 'strike'));
  assert.deepEqual(pins, { movement: 'strike', action: 'run' });
  assert.ok(assignTouchKey(pins, 'action', 'item:veil'));
  const reloaded = touchKeys(JSON.parse(JSON.stringify(pins)));
  assert.deepEqual(reloaded, { movement: 'strike', action: 'item:veil' });
  assert.equal(assignTouchKey(reloaded, 'action', 'item:missing'), false);
  assert.deepEqual(touchKeys({ movement: 'gone', action: 'item:missing' }), {
    movement: 'run',
    action: 'strike',
  });
});

test('held and cancelled contacts do not turn into auto-run when a menu restores field input', async () => {
  const { createTouchRun } = await import('../zelda-and-the-princess-zombie/touch-keys.mjs');
  const run = createTouchRun();
  run.press(10);
  assert.equal(run.active, true);
  const beforeBag = run.latched;
  run.reset();
  run.release(10, true);
  run.reset(beforeBag);
  assert.equal(run.active, false);

  run.press(11);
  run.release(11, true);
  const beforeMap = run.latched;
  run.reset();
  run.reset(beforeMap);
  assert.equal(run.active, true);
  run.press(12);
  assert.equal(run.active, false);
  run.release(12, true);
  assert.equal(run.latched, false);
});

test('holding both the pinned and numbered Run keeps running until the last contact ends', async () => {
  const { createTouchRun } = await import('../zelda-and-the-princess-zombie/touch-keys.mjs');
  const run = createTouchRun();
  run.press(3);
  run.press(4);
  run.release(3, true);
  assert.equal(run.active, true);
  assert.equal(run.latched, false);
  run.release(4, false);
  assert.equal(run.active, false);
});
