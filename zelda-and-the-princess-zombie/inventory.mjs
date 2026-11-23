// The field satchel is part of the saved world. The older potion counter is retained
// for existing journeys and callers that display the number of throwable bottles.
const catalogue = {
  cinder: {
    name: 'Red cinder',
    shape: 'jar',
    color: '#d78559',
    description:
      'A low earthenware jar, warm along the seam. The clay breaks where it lands and throws cinders against exposed bodies.',
  },
  veil: {
    name: 'Willow veil',
    shape: 'reed',
    color: '#9eb59a',
    description:
      'A green reed bottle sealed with beeswax. Crush it at your feet or throw it across a trail. Wolves lose the scent of anyone who passes through the mist.',
  },
  lure: {
    name: 'Bellglass',
    shape: 'bell',
    color: '#dcba73',
    description:
      'A hollow bronze pear with a bead inside. It keeps ringing where it lands. Heavy feet follow the sound. A dragon can mistake the ringing stone for prey.',
  },
  leaf: {
    name: 'Moonleaf',
    shape: 'leaf',
    color: '#b2c79b',
    description: 'A silver-veined leaf folded into cloth. Crush one against a wound to recover two hearts.',
  },
  berries: {
    name: 'Rowanberries',
    shape: 'berries',
    color: '#ca8172',
    description: 'A tart cluster carried in a fold of linen. Eat it to recover two hearts.',
  },
  vial: {
    name: 'Silver vial',
    shape: 'vial',
    color: '#b9cfd7',
    description: 'A narrow vessel with a thumb-worn silver rim. There is room for one careful measure.',
  },
  map: {
    name: 'The pale map',
    shape: 'map',
    color: '#ddcc95',
    description: 'A creased sheet with a second line in pale ink. Open the field map to follow its marks.',
    equippable: false,
  },
  cordial: {
    name: 'Pear cordial',
    shape: 'pear',
    color: '#adac72',
    description: 'Small and green. The wax smells of pears. A moth on the neck has folded its wings.',
  },
};
export const fieldBottles = ['cinder', 'veil', 'lure'];
const count = (n) => (Number.isFinite(n) ? Math.min(999, Math.max(0, Math.floor(n))) : 0);

function pouch(w) {
  if (!w.bag || typeof w.bag !== 'object' || !w.bag.stock) {
    w.bag = { stock: { cinder: count(w.potions) }, selected: 'cinder' };
  }
  return w.bag;
}
function quantity(w, id) {
  if (id === 'vial') return Number(Boolean(w.hasVial));
  if (id === 'map') return Number(Boolean(w.hasMap));
  return count(pouch(w).stock[id]);
}
function updateBelt(w) {
  w.potions = fieldBottles.reduce((sum, id) => sum + quantity(w, id), 0);
}
export function giveRoadBottles(w) {
  if (w.phialsGiven) return false;
  const bag = pouch(w);
  for (const id of fieldBottles) bag.stock[id] = quantity(w, id) + 1;
  w.phialsGiven = true;
  bag.selected = 'cinder';
  updateBelt(w);
  return true;
}
export function addForage(w, id) {
  pouch(w).stock[id] = quantity(w, id) + 1;
}
export function setCordial(w, held) {
  pouch(w).stock.cordial = Number(Boolean(held));
}
export function takeItem(w, id) {
  if (!quantity(w, id) || id === 'map' || id === 'vial') return false;
  const bag = pouch(w);
  bag.stock[id]--;
  if (bag.selected === id && !bag.stock[id]) bag.selected = null;
  updateBelt(w);
  return true;
}
function item(w, id) {
  const data = catalogue[id];
  if (!data) return null;
  const full = id === 'vial' && w.antidote;
  return {
    ...data,
    id,
    count: quantity(w, id),
    equippable: data.equippable !== false,
    equipped: pouch(w).selected === id,
    name: full ? 'Silver moonwater' : data.name,
    description: full
      ? 'Clear water trembles in the silver mouth. The reed it touched at the well is green again.'
      : data.description,
  };
}
export function bagItems(w) {
  return Object.keys(catalogue)
    .filter((id) => quantity(w, id) > 0)
    .map((id) => item(w, id));
}
export function equipItem(w, id) {
  if (!catalogue[id] || catalogue[id].equippable === false || !quantity(w, id)) return false;
  pouch(w).selected = id;
  return true;
}
export function selectedItem(w) {
  const bag = pouch(w);
  if (!catalogue[bag.selected] || !quantity(w, bag.selected)) return null;
  return item(w, bag.selected);
}
