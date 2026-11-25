// Names on the left perform the relation named above each card.
function line(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function orderHeading(order, names) {
  const heading = line('h2', 'ac-order-title');
  // Mark only names explicitly printed in the order. Cue links receive
  // identical styling regardless of which names solve a particular case.
  for (const word of order.split(/(\p{L}[\p{L}\p{M}]*)/u)) {
    heading.append(names.has(word) ? line('em', 'ac-anchor', word) : document.createTextNode(word));
  }
  return heading;
}

function relationCard({label, links}) {
  const card = line('section', 'ac-card');
  const title = line('h3', 'ac-kind', label);
  const rows = line('ul', 'ac-links');
  for (const {from, to} of links) {
    const row = line('li', 'ac-link');
    const direction = line('span', 'ac-arrow', '→');
    direction.setAttribute('aria-hidden', 'true');
    row.append(
      line('span', 'ac-from', from),
      direction,
      line('span', 'ac-read', ' ' + label.toLowerCase() + ' '),
      line('span', 'ac-to', to)
    );
    rows.append(row);
  }
  card.append(title, rows);
  return card;
}

export function renderCues(root, trial) {
  const hud = line('div', 'arcade-cues');
  const content = line('div', 'ac-content');
  const order = line('div', 'ac-order');
  const command = line('p', 'ac-command', 'Find both');
  order.append(command, orderHeading(trial.order, new Set(trial.roster)));
  content.append(order);
  for (const cue of trial.cues) content.append(relationCard(cue));
  hud.append(content);
  root.replaceChildren(hud);
}
