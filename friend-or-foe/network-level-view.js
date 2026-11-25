function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function route(from, to) {
  const line = element('span', 'level-route');
  const arrow = element('span', 'level-arrow', ' → ');
  arrow.setAttribute('aria-hidden', 'true');
  line.append(document.createTextNode(from), arrow, element('span', 'nw-sr', ' to '), document.createTextNode(to));
  return line;
}

function relationship(row) {
  const entry = element('section', 'level-row');
  const header = element('h3', 'level-row-title');
  header.append(
    element('span', '', row.label),
    element('span', 'level-channel ' + (row.channel === 'aid' ? 'nw-aid-word' : 'nw-alert-word'),
      row.channel === 'aid' ? 'Aid' : 'Alert')
  );
  entry.append(header);
  if (row.disputed) {
    const column = (label, names) => {
      const line = element('p', 'level-unknown');
      line.append(element('b', '', label + ' '), document.createTextNode(names.sort().join(' / ')));
      return line;
    };
    const unknown = element('div', 'level-dispute');
    unknown.append(column('Senders', row.links.map(link => link.from)), column('Receivers', row.links.map(link => link.to)));
    entry.append(unknown);
  } else {
    const links = element('div', 'level-links');
    for (const link of row.links) links.append(route(link.from, link.to));
    entry.append(links);
  }
  return entry;
}

export function renderLevelEvidence(root, evidence) {
  const panel = element('div', 'network-view level-evidence');
  const question = element('header', 'nw-order');
  question.append(element('h2', '', evidence.order));
  if (evidence.level === 'very-easy') {
    const board = element('div', 'guided-trail');
    for (const step of evidence.steps) {
      const group = element('section', 'guided-step');
      const aid = step.verb === 'helped';
      group.append(element('h3', aid ? 'nw-aid-word' : 'nw-alert-word',
        aid ? 'Who helped whom' : 'Who warned whom'));
      for (const link of step.links) group.append(route(link.from, link.to));
      board.append(group);
    }
    panel.append(question, board);
    root.replaceChildren(panel);
    return;
  }
  question.append(element('p', 'nw-tip', 'Read arrows from sender to receiver. Use each name once per chain.'));
  const links = element('section', 'level-board');
  links.setAttribute('aria-label', 'Relationships by role');
  for (const row of evidence.rows) links.append(relationship(row));
  panel.append(question, links);
  if (evidence.trust) {
    const disputed = evidence.rows.find(row => row.disputed);
    const reports = element('section', 'level-reports');
    reports.append(element('h3', '', disputed.label + ' witnesses'), element('p', 'level-trust', evidence.trust.text));
    for (const report of evidence.reports) {
      const line = element('p', 'level-statement');
      line.append(element('b', '', report.speaker + ' says '), route(report.from, report.to));
      reports.append(line);
    }
    panel.append(reports);
  }
  root.replaceChildren(panel);
}

export function renderLevelGuide(root, level) {
  const guide = element('div', 'network-guide');
  const section = (title, copy) => {
    const block = element('section');
    block.append(element('h3', '', title), element('p', '', copy));
    guide.append(block);
  };
  if (level === 'very-easy') {
    section('Start with one name', 'Find the two people linked to the name in the question. Then follow each of them through the second set of clues.');
    section('Watch the arrow', 'Under “Who helped whom,” Samp → Mira means Samp helped Mira. If Mira warned Sol, then Sol got a warning from someone Samp helped. Find the other person the same way.');
    root.replaceChildren(guide);
    return;
  }
  section('Follow the arrows', 'Each arrow runs from sender to receiver. Join arrows when one ends at the name where the next begins. Use each person once per chain.');
  if (level === 'medium') {
    section('Settle the disputed row', 'Its senders and receivers are known. The trust clue tells you which witness to believe. Match the names in that account, then pair the remaining sender and receiver.');
    section('Follow three links', 'For aid, then alert, then aid, one chain could be Nia → Sol → Pia → Ivo. If the order asks for the last receiver, Ivo is one of your two targets. Find the other chain as well.');
  } else {
    section('Follow two links', 'If Nia aids Sol and Sol alerts Pia, they form an aid-then-alert chain. Nia is the first sender, Sol is the go-between, and Pia is the last receiver. Find both people in the position your order asks for.');
  }
  section('Who has the role?', 'A Friend gives help. A Foe receives a challenge. A Spy receives an alert and a Double agent sends one. A Civilian receives shelter. A Foreigner receives a request to carry.');
  root.replaceChildren(guide);
}

export function renderLevelResult(root, trial) {
  const panel = element('section', 'network-result');
  const proof = element('ul', 'nw-winning');
  for (const reason of trial.proof) proof.append(element('li', '', reason));
  panel.append(element('h3', '', 'Why ' + trial.pair.join(' and ')), proof);
  root.replaceChildren(panel);
}
