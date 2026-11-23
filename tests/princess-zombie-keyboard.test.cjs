const { before, test } = require('node:test');
const assert = require('node:assert/strict');

let bindings, controls, game;
before(async () => {
  [bindings, controls, game] = await Promise.all(
    ['control-layout', 'field-keyboard', 'world'].map(
      (name) => import('../zelda-and-the-princess-zombie/' + name + '.mjs')
    )
  );
});
const centre = { forward: 0, strafe: 0 };

test('legacy dodge on Space migrates to a holdable run, retaining custom actions and deliberate new remaps', () => {
  const layout = bindings.controlLayout({ keys: { dodge: 'Space', strike: 'KeyL' } });
  assert.equal(bindings.actionForKey(layout, 'Space'), 'run');
  assert.equal(bindings.actionForKey(layout, 'KeyC'), 'dodge');
  assert.equal(bindings.actionForKey(layout, 'KeyL'), 'strike');
  bindings.rebind(layout, 'run', 'KeyC');
  const loaded = bindings.controlLayout(JSON.parse(JSON.stringify(layout)));
  assert.equal(bindings.actionForKey(loaded, 'KeyC'), 'run');
  assert.equal(bindings.actionForKey(loaded, 'Space'), 'dodge');
});

test('digit row, numpad switches and individual items can be reassigned without consuming unrelated bindings', () => {
  const layout = bindings.controlLayout();
  for (let i = 0; i < 10; i++) {
    assert.equal(bindings.actionForKey(layout, 'Digit' + i), bindings.actionForKey(layout, 'Numpad' + i));
  }
  bindings.rebindKeypad(layout, 'item:veil', 'Numpad1');
  bindings.rebindKeypad(layout, 'item:lure', 'Numpad4');
  bindings.rebindKeypad(layout, 'item:veil', 'Numpad0');
  const loaded = bindings.controlLayout(JSON.parse(JSON.stringify(layout)));
  assert.equal(bindings.actionForKey(loaded, 'Digit0'), 'item:veil');
  assert.equal(bindings.actionForKey(loaded, 'Numpad4'), 'item:lure');
  assert.equal(bindings.actionForKey(loaded, 'Digit1'), 'run');
  assert.equal(loaded.keypad.strike, '');
  assert.equal(loaded.keypad.potion, '');
  assert.equal(bindings.actionForKey(loaded, 'KeyF'), 'strike');
  assert.equal(bindings.actionForKey(loaded, 'Period'), 'tools');
  bindings.rebindKeypad(loaded, 'item:veil', '');
  assert.equal(bindings.actionForKey(bindings.controlLayout(loaded), 'Digit0'), undefined);
});

test('Space runs forward alone, diagonal steering and ordinary cuts work together, braking wins', () => {
  const k = controls.createFieldKeyboard(),
    l = bindings.controlLayout(),
    w = game.createWorld();
  w.route = 'wander';
  w.greeted = true;
  w.actors = w.actors.filter((a) => !['wolf', 'troll', 'dragon'].includes(a.type));
  Object.assign(w.player, { x: 22, z: 218, yaw: 0 });
  assert.equal(k.press(l, 'Space', 0).action, 'run');
  assert.equal(k.sample(centre, false, false).forward, 1);
  const began = w.player.z;
  for (let i = 0; i < 28; i++) game.tick(w, 1 / 60, k.sample(centre, false, false));
  assert.ok(w.player.z > began + 2 && w.player.speed > 5.8);
  assert.equal(w.dodgeAt, undefined);
  k.press(l, 'KeyD', 490);
  k.press(l, 'ShiftLeft', 495);
  const before = { x: w.player.x, z: w.player.z };
  const cut = k.press(l, 'KeyF', 500);
  assert.equal(cut.action, 'strike');
  assert.ok(game.act(w, cut.action));
  for (let i = 0; i < 18; i++) game.tick(w, 1 / 60, k.sample(centre, false, false));
  assert.equal(w.attack.kind, 'slash');
  assert.ok(w.player.x > before.x + 0.52 && w.player.z > before.z + 1 && w.player.speed > 5.3);
  assert.ok(w.player.stamina < 1);
  k.release('KeyF', 810);
  assert.ok(k.sample(centre, false, false).sprint);
  k.press(l, 'KeyS', 820);
  assert.equal(k.sample(centre, false, false).forward, -1);
  k.press(l, 'KeyW', 825);
  assert.equal(k.sample(centre, false, false).forward, 0);
  k.reset();
  assert.deepEqual(k.sample(centre, false, false), {
    forward: 0,
    strafe: 0,
    turn: 0,
    sprint: false,
    walk: false,
    pitch: 0,
  });
});

test('a second deliberate forward press sprints only until release; repeat events and stale first taps do not count', () => {
  const k = controls.createFieldKeyboard(),
    l = bindings.controlLayout();
  for (const key of ['KeyW', 'ArrowUp']) {
    k.press(l, key, 20);
    k.press(l, key, 72, true);
    assert.equal(k.sample(centre, false, false).sprint, false);
    k.release(key, 100);
    k.press(l, key, 210);
    assert.equal(k.sample(centre, false, false).sprint, true);
    k.release(key, 240);
    assert.equal(k.sample(centre, false, false).sprint, false);
    k.press(l, key, 520);
    k.release(key, 650);
    k.press(l, key, 1040);
    assert.equal(k.sample(centre, false, false).sprint, false);
    k.reset();
    k.press(l, key, 1200, true);
    assert.equal(k.sample(centre, false, false).forward, 0);
  }
  k.press(l, 'Space', 1300);
  k.press(l, 'Digit0', 1310);
  k.press(l, 'Numpad0', 1320);
  k.release('Space', 1350);
  k.release('Numpad0', 1350);
  assert.equal(k.sample(centre, false, false).forward, 1);
  k.release('Digit0', 1370);
  assert.equal(k.sample(centre, false, false).forward, 0);
});
