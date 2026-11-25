const roleNames = {
  friend: 'Friend', foe: 'Foe', spy: 'Spy', double: 'Double agent',
  civilian: 'Civilian', foreigner: 'Foreigner'
};
const roleVerbs = {
  friend: 'backs', foe: 'opposes', spy: 'observes', double: 'leaks to',
  civilian: 'reports to', foreigner: 'visits'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function arrow({from, to}) {
  const item = element('span', 'case-arrow');
  const mark = element('span', 'case-arrow-mark', ' → ');
  mark.setAttribute('aria-hidden', 'true');
  item.append(document.createTextNode(from), mark, element('span', 'case-sr', ' to '), document.createTextNode(to));
  return item;
}

function roleLabel(role) {
  return element('span', 'case-role case-' + role, roleNames[role]);
}

function roleRow(row) {
  const entry = element('div', 'case-row' + (row.disputed ? ' case-unconfirmed' : ''));
  const term = element('dt', 'case-row-label');
  const name = element('span', 'case-role-name');
  name.append(roleLabel(row.role));
  if (row.disputed && !row.alias) {
    const marker = element('span', 'case-query', '?');
    marker.setAttribute('aria-hidden', 'true');
    name.append(marker, element('span', 'case-sr', ' direction unconfirmed'));
  }
  term.append(name, element('small', 'case-verb', roleVerbs[row.role]));
  const links = element('dd', 'case-links');
  for (const link of row.links) links.append(arrow(link));
  if (row.alias) links.append(element('small', 'case-swap', 'Swap ' + row.alias.join(' and ') + '?'));
  entry.append(term, links);
  return entry;
}

function claim(clue) {
  const item = element('span', 'case-claim');
  item.append(roleLabel(clue.role), arrow(clue));
  return item;
}

function reportLine(report) {
  const line = element('li', 'case-report');
  if (!report.left) {
    line.append(element('span', 'case-fact', report.same ? 'Verified' : 'Ruled out'), claim(report.right));
  } else {
    const sign = element('b', 'case-sign', report.same ? '=' : '≠');
    sign.setAttribute('aria-hidden', 'true');
    line.append(claim(report.left), sign,
      element('span', 'case-sr', report.same ? ' has the same truth value as ' : ' has the opposite truth value to '),
      claim(report.right));
  }
  return line;
}

function easyReport(report, rows) {
  const leftKnown = rows.some(row => row.role === report.left.role && !row.disputed);
  const first = leftKnown ? report.left : report.right;
  const second = leftKnown ? report.right : report.left;
  const block = element('section', 'case-reports');
  block.append(element('h3', '', 'Check the ' + roleNames[first.role] + ' row first'),
    element('p', 'case-key', report.same ? 'Both claims are true or both are false.' : 'Exactly one claim is true.'));
  const claims = element('p', 'case-report');
  claims.append(claim(first), element('span', 'case-arrow-mark', ' · '), claim(second));
  block.append(claims);
  return block;
}

export function renderCaseEvidence(root, evidence) {
  const board = element('div', 'case-file');
  const brief = element('header', 'case-brief');
  brief.append(element('p', 'case-title', evidence.title), element('h2', '', evidence.order));
  board.append(brief);

  if (evidence.leads.length) {
    const leads = element('p', 'case-leads');
    leads.append(element('b', '', 'Shortlist'), document.createTextNode(evidence.leads.join(' · ')));
    board.append(leads);
  }
  if (evidence.level === 'very-easy' && evidence.hint) {
    board.append(element('p', 'case-first', evidence.hint));
  }

  const records = element('dl', 'case-records');
  records.setAttribute('aria-label', 'Contact records by role');
  for (const row of evidence.rows) records.append(roleRow(row));
  board.append(records);

  if (evidence.rows.some(row => row.disputed && !row.alias))
    board.append(element('p', 'case-key', '? beside a role means both arrows may run backward.'));
  if (evidence.rows.some(row => row.alias))
    board.append(element('p', 'case-key', 'A swap trades the two names everywhere in that row.'));
  if (evidence.level === 'easy' && evidence.reports.length === 1 && evidence.reports[0].left) {
    board.append(easyReport(evidence.reports[0], evidence.rows));
  } else if (evidence.reports.length) {
    const reports = element('section', 'case-reports');
    reports.append(element('h3', '', 'Cross-checks'));
    if (evidence.reports.some(report => report.left)) {
      reports.append(element('p', 'case-key', '= both true or both false · ≠ exactly one true'));
    }
    const list = element('ul', 'case-report-list');
    for (const report of evidence.reports) list.append(reportLine(report));
    reports.append(list);
    board.append(reports);
  }
  root.replaceChildren(board);
}

export function renderCaseResult(root, trial) {
  const panel = element('section', 'case-result');
  panel.append(element('p', 'case-title', trial.evidence.title),
    element('h3', '', 'Why ' + trial.pair.join(' and ')));
  const list = element('ul', 'case-proof');
  for (const explanation of trial.proof) list.append(element('li', '', explanation));
  panel.append(list);
  root.replaceChildren(panel);
}

export function renderCaseGuide(root, level, {shortlist = true} = {}) {
  const guide = element('div', 'case-guide');
  const section = (title, words) => {
    const block = element('section');
    block.append(element('h3', '', title), element('p', '', words));
    guide.append(block);
  };
  section('Read the contact file', 'You’re the intelligence officer. Read each arrow from sender to contact. In the Spy row, Samp → Mira means Samp observed Mira. Samp can be a friend to someone else in the same file.');
  if (level === 'very-easy' && shortlist) {
    section('Use the shortlist', 'The pair is among the four names shown. Use the arrows across the whole file to work out which two fit the question.');
  } else if (level === 'very-easy') {
    section('Check the whole file', 'All six rows are confirmed. Compare every name against the order to work out which two fit the question.');
  } else if (level === 'easy') {
    section('Check one disputed row', 'Five rows are confirmed. Look up the first claim in its confirmed row. The clue tells you whether the second claim agrees with it. Use that to decide which way the disputed arrows run, or whether two names traded places.');
  } else {
    section('Check the whole file', 'Compare every name against the order. A contact who fits the Friend row may be ruled out by a different relationship.');
  }
  if (level === 'medium' || level === 'hard') {
    section('Resolve the disputed records', 'A ? beside a role means both arrows might point the other way. A “Swap” row might have two names exchanged. A verified contact gives you a starting fact.');
    section('Use the cross-checks', 'An equals sign means the two claims agree in truth. If one is false, the other is false too. A ≠ sign means exactly one is true. Carry what you learn into the other rows before choosing the pair.');
  }
  root.replaceChildren(guide);
}
