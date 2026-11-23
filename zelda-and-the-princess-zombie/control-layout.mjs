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
  interact: 'KeyE',
  potion: 'KeyQ',
  strike: 'KeyF',
  thrust: 'KeyV',
  guard: 'KeyR',
  dodge: 'Space',
  bag: 'KeyB',
  map: 'KeyM',
  journal: 'KeyJ',
  tools: 'KeyT',
};
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
    if (keyChoices.includes(code) && !taken.has(code)) {
      keys[id] = code;
      taken.add(code);
    }
  }
  for (const [id, preferred] of Object.entries(defaultKeys))
    if (!keys[id]) {
      keys[id] = !taken.has(preferred) ? preferred : keyChoices.find((code) => !taken.has(code));
      taken.add(keys[id]);
    }
  return { slots, keys };
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
export function actionForKey(layout, code) {
  return Object.keys(layout.keys).find((id) => layout.keys[id] === code);
}
