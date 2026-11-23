import { quickItemActions } from './inventory.mjs';

export const actionNames = {
  interact: 'Interact',
  potion: 'Use belt item',
  strike: 'Sword',
  thrust: 'Thrust',
  guard: 'Guard',
  run: 'Run',
};
export const slotNames = [
  'Upper left',
  'Upper middle',
  'Upper right',
  'Lower left',
  'Lower middle',
  'Lower right',
];
export const utilityActions = { dodge: 'Dodge', bag: 'Bag', map: 'Map', journal: 'Journal', tools: 'Tools' };
export function fieldAction(hand, item, hint) {
  if (hand === 'belt' && item) return 'potion';
  return hint ? 'interact' : 'strike';
}
export function toolsGesture(dx, dy) {
  if (Math.hypot(dx, dy) < 24) return 'tools';
  if (Math.abs(dx) > Math.abs(dy)) return 'dodge';
  return dy < 0 ? 'guard' : 'potion';
}
export const keyChoices = [...'EQFRGZXCVBTHYUIOPKLNMJ'.split('').map((letter) => 'Key' + letter), 'Space'];
export function keyLabel(code) {
  return code?.startsWith('Key') ? code.slice(3) : code || '';
}
const defaultKeys = {
  run: 'Space',
  interact: 'KeyE',
  potion: 'KeyQ',
  strike: 'KeyF',
  thrust: 'KeyV',
  guard: 'KeyR',
  dodge: 'KeyC',
  bag: 'KeyB',
  map: 'KeyM',
  journal: 'KeyJ',
  tools: 'KeyT',
};
export const defaultKeypad = {
  run: 'Numpad0',
  strike: 'Numpad1',
  guard: 'Numpad2',
  dodge: 'Numpad3',
  potion: 'Numpad4',
  interact: 'Numpad5',
  thrust: 'Numpad6',
  bag: 'Numpad7',
  map: 'Numpad8',
  journal: 'Numpad9',
  tools: 'NumpadDecimal',
};
export const keypadChoices = Object.values(defaultKeypad);
export function keypadLabel(code) {
  if (code === 'NumpadDecimal') return '. / Pad .';
  return keypadChoices.includes(code) ? code.slice(-1) + ' / Pad ' + code.slice(-1) : '';
}
function keypadCode(code) {
  if (code === 'Period') return 'NumpadDecimal';
  if (/^Digit[0-9]$/.test(code)) return 'Numpad' + code.slice(-1);
  return keypadChoices.includes(code) ? code : null;
}
function assignableNumber(id) {
  return Object.hasOwn(defaultKeypad, id) || Object.hasOwn(quickItemActions, id);
}

export function controlLayout(saved = {}) {
  const ids = Object.keys(actionNames),
    slots = [];
  for (const id of Array.isArray(saved?.slots) ? saved.slots : [])
    if (ids.includes(id) && !slots.includes(id)) slots.push(id);
  slots.push(...ids.filter((id) => !slots.includes(id)));
  const keys = {},
    taken = new Set();
  for (const id of Object.keys(defaultKeys)) {
    const code = saved?.keys?.[id];
    // Before Run was assignable, Space was saved as Dodge by default. Upgrade old
    // layouts while preserving unrelated choices and all future deliberate remaps.
    const legacySpace = code === 'Space' && !saved?.keys?.run && id !== 'run';
    if (!legacySpace && keyChoices.includes(code) && !taken.has(code)) {
      keys[id] = code;
      taken.add(code);
    }
  }
  for (const [id, preferred] of Object.entries(defaultKeys))
    if (!keys[id]) {
      keys[id] = !taken.has(preferred) ? preferred : keyChoices.find((code) => !taken.has(code));
      taken.add(keys[id]);
    }
  const keypad = {};
  const usedNumbers = new Set();
  for (const [id, code] of Object.entries(saved?.keypad || {})) {
    if (!assignableNumber(id)) continue;
    if (code === '' || (keypadChoices.includes(code) && !usedNumbers.has(code))) {
      keypad[id] = code;
      if (code) usedNumbers.add(code);
    }
  }
  for (const [id, code] of Object.entries(defaultKeypad)) {
    if (!Object.hasOwn(keypad, id)) keypad[id] = usedNumbers.has(code) ? '' : code;
  }
  return { slots, keys, keypad };
}
export function moveTouchAction(layout, id, slot) {
  const at = layout.slots.indexOf(id);
  if (at < 0 || !Number.isInteger(slot) || slot < 0 || slot >= layout.slots.length) return;
  [layout.slots[at], layout.slots[slot]] = [layout.slots[slot], layout.slots[at]];
}
export function rebind(layout, id, code) {
  if (!Object.hasOwn(defaultKeys, id) || !keyChoices.includes(code)) return;
  const prior = Object.keys(layout.keys).find((other) => layout.keys[other] === code),
    old = layout.keys[id];
  if (prior) layout.keys[prior] = old;
  layout.keys[id] = code;
}
export function rebindKeypad(layout, id, code) {
  if (!assignableNumber(id) || (code !== '' && !keypadChoices.includes(code))) return false;
  const old = layout.keypad[id] || '';
  const previous = code && Object.keys(layout.keypad).find((other) => layout.keypad[other] === code);
  if (previous && previous !== id) layout.keypad[previous] = old;
  layout.keypad[id] = code;
  return true;
}
export function actionForKey(layout, code) {
  const number = keypadCode(code);
  const bindings = number ? layout.keypad : layout.keys;
  const match = number || code;
  return Object.keys(bindings).find((id) => bindings[id] === match);
}
