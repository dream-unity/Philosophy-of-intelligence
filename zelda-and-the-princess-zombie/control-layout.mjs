export const actionNames = {
  interact: 'Interact',
  potion: 'Cinder phial',
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
export const keyChoices = 'EQFRGZXCVBTHYUIOPKLN'.split('').map((letter) => 'Key' + letter);
const defaultKeys = { interact: 'KeyE', potion: 'KeyQ', strike: 'KeyF', thrust: 'KeyR', guard: 'KeyG' };
export function controlLayout(saved = {}) {
  const ids = Object.keys(actionNames),
    slots = [];
  for (const id of Array.isArray(saved?.slots) ? saved.slots : [])
    if (ids.includes(id) && !slots.includes(id)) slots.push(id);
  slots.push(...ids.filter((id) => !slots.includes(id)));
  const keys = { ...defaultKeys },
    taken = new Set();
  for (const id of Object.keys(keys)) {
    const code = saved?.keys?.[id];
    if (keyChoices.includes(code) && !taken.has(code)) {
      keys[id] = code;
      taken.add(code);
    } else keys[id] = null;
  }
  for (const id of Object.keys(keys))
    if (!keys[id]) {
      keys[id] = !taken.has(defaultKeys[id]) ? defaultKeys[id] : keyChoices.find((code) => !taken.has(code));
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
