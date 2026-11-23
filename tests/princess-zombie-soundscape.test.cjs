const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let createScore, createWorld, tick;
before(async () => {
  ({ createScore } = await import('../zelda-and-the-princess-zombie/sound-score.mjs'));
  ({ createWorld, tick } = await import('../zelda-and-the-princess-zombie/world.mjs'));
});

function listener(world = createWorld()) {
  const notes = [];
  const update = createScore();
  function listen(time, reading = false) {
    update(world, time, (instrument, frequency, level, start, duration) => {
      notes.push({ instrument, frequency, level, start, duration, scheduled: time });
    }, reading);
  }
  return { world, notes, listen };
}

test('sprinting straight to the witch hears the opening, then her accompaniment survives a long read', () => {
  const { world, notes, listen } = listener();
  for (let frame = 0; frame < 90 && !world.dialogue; frame++) {
    tick(world, 1 / 30, { forward: 1, sprint: true });
    if (frame % 7 === 0) listen(frame / 30);
  }
  assert.equal(world.dialogue?.kind, 'witch');
  const arrival = world.elapsed;
  assert.ok(notes.some((n) => n.instrument === 'flute' && n.start < arrival));

  notes.length = 0;
  for (let time = arrival; time < arrival + 25; time += 0.24) listen(time, true);
  assert.equal(world.elapsed, arrival, 'reading the offers leaves the race paused');
  const duringLongRead = notes.filter((n) => n.start >= arrival + 7);
  assert.ok(duringLongRead.some((n) => n.instrument === 'choir'));
  assert.ok(duringLongRead.some((n) => n.instrument === 'viola' && n.start > arrival + 18));
});

test('consulting a map during an ambush suspends its warning pulse until play resumes', () => {
  const { world, notes, listen } = listener();
  world.route = 'wander';
  Object.assign(world.player, { x: 80, z: 301 });
  Object.assign(world.actors.find((a) => a.type === 'wolf'), { alerted: true, windupUntil: 5 });
  const dangerBeat = (n) => n.instrument === 'sine' && n.frequency < 100;
  for (let i = 0; i < 16; i++) listen(i * 0.23);
  assert.ok(notes.some(dangerBeat));
  notes.length = 0;
  for (let i = 16; i < 64; i++) listen(i * 0.23, true);
  assert.ok(notes.length > 0 && !notes.some(dangerBeat));
  notes.length = 0;
  for (let i = 64; i < 81; i++) listen(i * 0.23);
  assert.ok(notes.some(dangerBeat));
});

test('approaching the closed sluice clears the forest line and leaves the bell register free', () => {
  const { world, notes, listen } = listener();
  for (let i = 0; i < 8; i++) listen(i * 0.23);
  notes.length = 0;
  Object.assign(world.player, { x: 30, z: 993 });
  for (let i = 8; i < 51; i++) listen(i * 0.23);
  assert.ok(notes.length > 0, 'the river still has accompaniment');
  assert.ok(notes.every((n) => n.frequency < 207.65), 'the lowest puzzle bell is 207.65 Hz');
  assert.ok(notes.every((n) => n.instrument !== 'harp'), 'plucked attacks leave room for real strikes');
  notes.length = 0;
  world.bridgeOpen = true;
  for (let i = 51; i < 111; i++) listen(i * 0.23);
  assert.ok(notes.some((n) => n.instrument === 'flute'), 'the river melody returns after the crossing opens');
});

test('clock jumps, the banquet and a fresh traveller never flush a backlog of audible field notes', () => {
  const { world, notes, listen } = listener();
  for (let i = 0; i < 12; i++) listen(i * 0.23);
  notes.length = 0;
  let frame = 12;
  for (const [key, value] of [
    ['dialogue', { kind: 'banquet' }],
    ['sequence', { id: 'feast' }],
    ['ending', { id: 'feast' }],
  ]) {
    world[key] = value;
    for (let i = 0; i < 5; i++) listen(frame++ * 0.23);
    world[key] = null;
  }
  assert.deepEqual(notes, []);
  // Simulate a suspended tab followed by loading a different save. Neither
  // transition should release missed phrases or submit the rest of a bar.
  for (const start of [93, 0.5]) {
    notes.length = 0;
    if (start < 1) world.player = { ...world.player };
    for (let i = 0; i < 22; i++) listen(start + i * 0.23);
    assert.ok(notes.length > 0);
    for (const n of notes) {
      assert.ok(n.start >= n.scheduled);
      assert.ok(n.start <= n.scheduled + 0.6, 'upcoming changes can still interrupt the phrase');
      assert.ok(n.duration > 0 && n.level > 0 && Number.isFinite(n.frequency));
    }
  }
});
