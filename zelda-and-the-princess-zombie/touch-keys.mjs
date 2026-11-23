import { quickItemActions } from './inventory.mjs';

export const touchActionNames = {
  run: 'Run',
  strike: 'Sword',
  interact: 'Interact',
  thrust: 'Thrust',
  guard: 'Guard',
  dodge: 'Dodge',
  potion: 'Equipped item',
  bag: 'Bag',
  map: 'Map',
  journal: 'Journal',
  ...quickItemActions,
};
const defaults = { movement: 'run', action: 'strike' };

export function touchKeys(saved = {}) {
  const chosen = { ...defaults };
  for (const side of Object.keys(defaults)) {
    if (Object.hasOwn(touchActionNames, saved?.[side])) assignTouchKey(chosen, side, saved[side]);
  }
  return chosen;
}

export function assignTouchKey(chosen, side, id) {
  if (!Object.hasOwn(defaults, side) || !Object.hasOwn(touchActionNames, id)) return false;
  const other = side === 'action' ? 'movement' : 'action';
  if (chosen[other] === id) chosen[other] = chosen[side];
  chosen[side] = id;
  return true;
}

const icons = {
  run: 'run',
  strike: 'sword',
  thrust: 'sword',
  interact: 'hand',
  guard: 'sigil',
  dodge: 'leap',
  potion: 'flask',
  bag: 'pack',
  map: 'mapicon',
  journal: 'book',
  'item:leaf': 'leaf-icon',
  'item:berries': 'leaf-icon',
};
export function touchKeyIcon(action) {
  return icons[action] || 'flask';
}

// Only a completed tap is resumable. A finger still on Run is as transient as
// a held physical key, even when a second Run key is visible on the number pad.
export function createTouchRun() {
  const held = new Set();
  let latched = false;
  let tapCandidate = null;
  return {
    get active() {
      return latched || held.size > 0;
    },
    get latched() {
      return latched;
    },
    press(id) {
      if (latched) {
        latched = false;
        return;
      }
      tapCandidate = held.size ? null : id;
      held.add(id);
    },
    release(id, completedTap) {
      if (!held.delete(id)) return;
      if (id === tapCandidate) {
        latched = completedTap;
        tapCandidate = null;
      }
    },
    reset(resumeLatch = false) {
      held.clear();
      tapCandidate = null;
      latched = resumeLatch;
    },
  };
}
