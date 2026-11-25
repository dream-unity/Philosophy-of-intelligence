const roles = {
  friend: 'Friends', foe: 'Foes', spy: 'Spies', double: 'Double agents',
  civilian: 'Civilians', foreigner: 'Foreigners'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function comparison(same) {
  const op = element('span', 'cv-sign ' + (same ? 'cv-same' : 'cv-opposed'));
  const symbol = element('b', '', same ? '=' : '≠');
  symbol.setAttribute('aria-hidden', 'true');
  op.append(symbol, element('span', 'cv-sr', same ? ' same side as ' : ' opposite side to '));
  return op;
}

function expression(left, same, right) {
  const equation = element('span', 'cv-equation');
  equation.append(element('span', '', left), comparison(same), element('span', '', right));
  return equation;
}

function orderCard(trial) {
  const {family, role} = trial.query;
  let qualify, choose;
  if (family === 'intercept') {
    qualify = ['Previous lead', false, 'Next lead'];
    choose = ['Member', true, role === 'spy' ? 'Next lead' : 'Previous lead'];
  } else if (family === 'arrival') {
    qualify = null;
    choose = ['Member', role === 'civilian', 'Previous lead'];
  } else {
    qualify = ['Lead', false, 'Previous lead'];
    choose = ['Member', role === 'friend', trial.anchor];
  }
  const card = element('section', 'cv-order');
  card.append(element('h2', '', 'Find both ' + roles[role].toLowerCase()));
  const lines = element('div', 'cv-rules');
  for (const [label, rule] of [['Find duos', qualify], ['Shoot', choose]]) {
    const line = element('div', 'cv-rule');
    let condition;
    if (rule) {
      condition = expression(...rule);
    } else {
      condition = element('span', 'cv-equation', 'Lead on smaller side');
      condition.append(element('span', 'cv-sr', ' among the five leads'));
      condition.title = 'Count the five leads. This lead is on the less numerous side.';
    }
    line.append(element('span', 'cv-rule-label', label), condition);
    lines.append(line);
  }
  card.append(lines);
  return card;
}

function duoRing(trial) {
  const region = element('section', 'cv-duos');
  const caption = element('div', 'cv-heading');
  caption.append(element('h3', '', 'Rival duos'), element('span', '', 'Lead on top · 5 ↻ 1'));
  const ring = element('ol', 'cv-ring');
  ring.setAttribute('aria-label', 'Clockwise rival duos. The first name in each duo is its lead.');
  for (const [i, {lead, partner}] of trial.duos.entries()) {
    const card = element('li', 'cv-duo');
    const number = element('span', 'cv-number', i + 1);
    number.setAttribute('aria-hidden', 'true');
    card.append(number);
    const names = element('div', 'cv-names');
    for (const [name, position] of [[lead, 'lead'], [partner, 'partner']]) {
      const button = element('button', '', name);
      button.type = 'button';
      button.title = 'Pencil ' + name + ' as an ally of ' + trial.anchor;
      button.setAttribute('aria-label', 'Duo ' + (i + 1) + ' ' + position + ', ' + button.title);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const picked = button.getAttribute('aria-pressed') === 'true';
        for (const other of names.children) other.setAttribute('aria-pressed', 'false');
        if (!picked) button.setAttribute('aria-pressed', 'true');
      });
      names.append(button);
    }
    card.append(names);
    ring.append(card);
  }
  const face = element('div', 'cv-face');
  const contact = element('div', 'cv-contact');
  contact.append(element('span', '', 'Contact'), element('strong', '', trial.anchor));
  face.append(ring, contact);
  region.append(caption, face);
  return region;
}

function addReport(body, n, source, left, same, right) {
  const row = element('tr', source === null ? 'cv-fact' : '');
  const reporter = element('th');
  reporter.append(element('small', 'cv-report-no', '#' + n), document.createTextNode(source ?? 'Fact'));
  reporter.scope = 'row';
  const detail = element('td');
  detail.append(expression(left, same, right));
  row.append(reporter, detail);
  body.append(row);
}

function reportBoard(reports) {
  const region = element('section', 'cv-reports');
  const table = element('table');
  table.setAttribute('aria-label', 'Range facts and unverified reports');
  const head = table.createTHead().insertRow();
  for (const text of ['Source', 'Claim']) {
    const header = element('th', '', text);
    header.scope = 'col';
    head.append(header);
  }
  const body = table.createTBody();
  for (const [i, {speaker, left, same, right}] of reports.entries()) addReport(body, i + 1, speaker, left, same, right);
  region.append(table);
  return region;
}

export function renderCues(root, trial) {
  const panel = element('div', 'covert-cues');
  const evidence = element('div', 'cv-evidence');
  evidence.append(duoRing(trial), reportBoard(trial.reports));
  const key = element('div', 'cv-key');
  key.append(element('span', '', '= same side · ≠ opposite · 1 ally per duo'),
    element('span', '', 'Facts and allies tell truth · foes reverse signs'));
  panel.append(orderCard(trial), evidence, key);
  root.replaceChildren(panel);
}

export function renderCueGuide(root) {
  const guide = element('div', 'covert-guide');
  for (const [heading, text] of [
    ['Read the ring', 'Each rival duo has one ally of the contact and one foe. The upper name is the lead. For a smaller-side order, count just the five leads. Next follows the numbers clockwise, from 5 back to 1. Previous goes the other way.'],
    ['Read the reports', 'An equals sign means two people share a side. A crossed equals sign means opposite sides. A Fact is always true. Allies tell the truth. Foes reverse the sign.'],
    ['Follow the order', 'Check the first rule at each duo. For the two duos that match, use the second rule to pick one member from each. You can tap a name on the ring to pencil in a possible ally. Tap again to erase it.']
  ]) {
    const section = element('section');
    section.append(element('h3', '', heading), element('p', '', text));
    guide.append(section);
  }
  const example = element('section', 'cv-example');
  example.append(element('h3', '', 'Two claims, one contradiction'),
    reportBoard([{speaker:null, left:'Dex', right:'Ivo', same:false},
      {speaker:'Tess', left:'Dex', right:'Ivo', same:true}]),
    element('p', '', 'Tess reverses a known fact. She must oppose the contact, so her partner must be an ally.'));
  guide.append(example);
  root.replaceChildren(guide);
}
