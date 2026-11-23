const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = '../zelda-and-the-princess-zombie/';

test('the touch number pad mirrors physical number bindings, including empty keys and the actual pocket quantity', async () => {
  const [{ numberPadLegend }, { controlLayout, rebindKeypad, actionForKey }, inventory, { createWorld }] =
    await Promise.all(['number-pad', 'control-layout', 'inventory', 'world'].map((name) => import(source + name + '.mjs')));
  const layout = controlLayout();
  const w = createWorld();
  inventory.giveRoadBottles(w);
  assert.equal(numberPadLegend(layout, 'Numpad0', w).text, 'Run');
  assert.equal(numberPadLegend(layout, 'Numpad1', w).text, 'Sword');
  assert.equal(numberPadLegend(layout, 'NumpadDecimal', w).text, 'Tools');
  assert.ok(rebindKeypad(layout, 'strike', 'Numpad0'));
  assert.equal(numberPadLegend(layout, 'Numpad1', w).action, actionForKey(layout, 'Digit1'));
  assert.equal(numberPadLegend(layout, 'Numpad0', w).text, 'Sword');
  assert.ok(rebindKeypad(layout, 'item:veil', 'Numpad2'));
  assert.deepEqual(numberPadLegend(layout, 'Numpad2', w), {
    action: 'item:veil', text: 'Willow veil ×1', label: 'Willow veil, 1 remaining',
  });
  inventory.takeItem(w, 'veil');
  assert.equal(numberPadLegend(layout, 'Numpad2', w).text, 'Willow veil ×0');
  assert.equal(numberPadLegend(layout, 'Numpad4', w).text, 'Red cinder ×1');
  assert.ok(rebindKeypad(layout, 'item:veil', ''));
  assert.equal(numberPadLegend(layout, 'Numpad2', w).disabled, true);
});
