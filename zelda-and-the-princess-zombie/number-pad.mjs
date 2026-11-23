import { actionForKey, actionNames, utilityActions } from './control-layout.mjs';
import { quickItem, quickItemActions, selectedItem } from './inventory.mjs';

const padOrder = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.'];

export function numberPadLegend(layout, code, world) {
  const action = actionForKey(layout, code);
  if (!action) return { text: '—', label: 'Unassigned', disabled: true };
  const item = world && (action === 'potion' ? selectedItem(world) : quickItem(world, action));
  if (item) {
    return {
      action,
      text: item.name + ' ×' + item.count,
      label: item.name + ', ' + item.count + ' remaining',
    };
  }
  const label = actionNames[action] || utilityActions[action] || quickItemActions[action];
  return { action, text: action === 'potion' ? 'Belt' : label, label };
}

export function mountNumberPad(grid, resolveLayout, wireButton) {
  const cells = padOrder.map((symbol) => {
    const code = symbol === '.' ? 'NumpadDecimal' : 'Numpad' + symbol;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.padCode = code;
    const digit = document.createElement('b');
    digit.textContent = String(symbol);
    const caption = document.createElement('span');
    button.append(digit, caption);
    grid.append(button);
    wireButton(button, () => actionForKey(resolveLayout(), code), true);
    return { button, caption, code, symbol };
  });
  return (world, running) => {
    const layout = resolveLayout();
    for (const { button, caption, code, symbol } of cells) {
      const legend = numberPadLegend(layout, code, world);
      const accessible = symbol + ' · ' + legend.label;
      if (caption.textContent !== legend.text) caption.textContent = legend.text;
      if (button.getAttribute('aria-label') !== accessible) {
        button.setAttribute('aria-label', accessible);
        button.title = accessible;
      }
      button.disabled = Boolean(legend.disabled);
      if (legend.action === 'run') button.setAttribute('aria-pressed', String(running));
      else if (button.hasAttribute('aria-pressed')) button.removeAttribute('aria-pressed');
    }
  };
}
