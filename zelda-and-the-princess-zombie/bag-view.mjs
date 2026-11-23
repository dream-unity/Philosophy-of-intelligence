import { bagItems, selectedItem, equipItem } from './inventory.mjs';
import { keypadChoices, keypadLabel } from './control-layout.mjs';

const shapes = {
  cinder: 'M8 10h12v4h-2q8 3 8 9 0 7-12 8Q2 30 2 23q0-6 8-9H8z',
  veil: 'M10 3l7-1 1 4-2 1 1 18q0 5-4 6-4-1-4-5l3-19-2-1z',
  lure: 'M12 3h4v4l2 1-1 4q1 4 5 7 5 7 0 10-7 5-16 0-5-5 1-11 4-4 4-7L10 8l2-1z',
  lastbell: 'M10 3h8v4h-2v5q7 4 7 10v3l2 3q-11 5-22 0l2-3v-3q0-6 7-10V7h-2z',
  saveher: 'M11 2h6v4h-1v6l7 6v8l-9 6-9-6v-8l7-6V6h-1z',
  cordial: 'M10 3h8v4h-2v4c10 7 5 17-2 19C7 28 1 18 12 11V7h-2z',
  vial: 'M11 2h6v3h-1v18l-2 7-3-7V5z',
  leaf: 'M4 30Q1 11 22 3q2 20-14 21l-4 6z',
  berries: 'M13 11q-9-3-10 4t8 4q-4 8 3 9t7-8q7-3 1-9l-6 1q0-4 4-8l-2-1z',
  map: 'M2 8l8-4 8 3 7-3v22l-7 4-8-3-8 4z',
};
const engraving = {
  cinder: 'M8 12h12M4 21q10 5 20 0m-15 3 2-3-1-2 3-1',
  veil: 'M11 6l6-1m-6 6 5-1m-6 14 6-1m-5 4 4-1',
  lure: 'M11 8h6M5 25q9 5 18 0m-9-9v9m-2-2a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  lastbell: 'M10 6h8M6 25q8 4 16 0M14 15v8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  saveher: 'M11 5h6M7 19l7-5 7 5m-7-5v15',
  cordial: 'M10 5h7m-11 15 7 3 7-4m-9 5 3 2',
  map: 'M10 7v17m8-14v16',
  leaf: 'M6 25 18 10',
  berries: 'M14 11q0-6 6-7m-8 9 5 7',
  vial: 'M11 5h5m-5 17h5',
};
function glyph(item) {
  const ns = 'http://www.w3.org/2000/svg',
    svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 28 34');
  svg.setAttribute('aria-hidden', 'true');
  const silhouette = document.createElementNS(ns, 'path');
  silhouette.setAttribute('d', shapes[item.id] || shapes.vial);
  silhouette.setAttribute('fill', item.color || '#a9a5ba');
  silhouette.setAttribute('stroke', '#e9d7ae');
  silhouette.setAttribute('stroke-width', '1.1');
  svg.append(silhouette);
  const shine = document.createElementNS(ns, 'path');
  shine.setAttribute('d', engraving[item.id] || engraving.vial);
  shine.setAttribute('fill', 'none');
  shine.setAttribute('stroke', item.id === 'vial' ? '#fbf9ec' : '#413326');
  shine.setAttribute('stroke-opacity', '.65');
  svg.append(shine);
  return svg;
}
export function makeBagView(world, onEquip, shortcuts) {
  const pocket = document.createElement('div'),
    slots = document.createElement('div'),
    detail = document.createElement('section');
  pocket.className = 'inventory-pocket';
  slots.className = 'bag-slots';
  detail.className = 'item-detail';
  const items = bagItems(world),
    buttons = new Map();
  let highlighted = selectedItem(world)?.id || items[0]?.id;
  function inspect(id) {
    highlighted = id;
    const item = bagItems(world).find((i) => i.id === id);
    if (!item) return;
    const equipped = selectedItem(world)?.id;
    for (const [key, slot] of buttons) {
      slot.setAttribute('aria-pressed', String(key === highlighted));
      slot.querySelector('small').textContent = key === equipped ? 'On belt' : '';
    }
    detail.replaceChildren();
    const name = document.createElement('h3');
    name.textContent = item.name;
    detail.append(name);
    if (item.description) {
      const desc = document.createElement('p');
      desc.textContent = item.description;
      detail.append(desc);
    }
    if (item.equippable && item.count > 0) {
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'secondary';
      use.textContent = item.equipped ? 'Ready in hand' : 'Ready this item';
      use.onclick = () => {
        if (equipItem(world, item.id)) onEquip(item);
      };
      detail.append(use);
      if (shortcuts) {
        const label = document.createElement('label'),
          select = document.createElement('select'),
          action = 'item:' + item.id;
        label.className = 'item-shortcut';
        label.append('Field number key', select);
        select.setAttribute('aria-label', item.name + ' field number key');
        const empty = new Option('Unassigned', '');
        select.append(empty);
        for (const code of keypadChoices) {
          if (!code) continue;
          const owner = shortcuts.ownerName(code, action);
          const label = keypadLabel(code) + (owner ? ' · ' + owner : '');
          select.append(new Option(label, code));
        }
        select.value = shortcuts.layout.keypad[action] || '';
        select.addEventListener('change', () => {
          shortcuts.assign(action, select.value);
          inspect(item.id);
          detail.querySelector('select')?.focus({ preventScroll: true });
        });
        detail.append(label);
      }
    }
  }
  items.forEach((item, index) => {
    const slot = document.createElement('button'),
      label = document.createElement('span'),
      status = document.createElement('small');
    slot.type = 'button';
    slot.className = 'bag-slot';
    slot.dataset.pocket = String(index + 1);
    label.textContent = item.name + (item.count > 1 ? ' × ' + item.count : '');
    label.append(status);
    slot.append(glyph(item), label);
    slot.setAttribute('aria-label', item.name + ', ' + item.count + (item.equipped ? ', on belt' : ''));
    slot.onclick = () => inspect(item.id);
    buttons.set(item.id, slot);
    slots.append(slot);
  });
  if (items.length) {
    pocket.append(slots);
    inspect(highlighted);
  } else {
    const empty = document.createElement('p');
    empty.textContent = 'The leather pockets are empty. Your sword hangs at your hip.';
    pocket.append(empty);
  }
  return [pocket, detail];
}
