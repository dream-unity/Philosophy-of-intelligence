import {roleNames, roleVerbs} from './case-layout.js';

const opSymbols = {
  eq: '=',
  neq: '≠',
  imp: '⇒',
  or: 'or',
  nand: 'not both'
};

const opSpoken = {
  eq: ' has the same truth value as ',
  neq: ' has the opposite truth value to ',
  imp: ' implies ',
  or: ' or at least one holds with ',
  nand: ' cannot both hold with '
};

const opLegend = {
  eq: '= same truth',
  neq: '≠ opposite truth',
  imp: '⇒ if left, then right',
  or: 'or: at least one holds',
  nand: 'not both: at most one holds'
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

function roleRow(row, index) {
  const divEnd = index === 1 || index === 3 ? ' case-div-end' : '';
  const entry = element('div', 'case-row' + (row.disputed ? ' case-unconfirmed' : '') + divEnd);
  const term = element('dt', 'case-row-label');
  const name = element('span', 'case-role-name');
  name.append(roleLabel(row.role));
  if (row.disputed && !row.alias && !row.alt) {
    const marker = element('span', 'case-query', '?');
    marker.setAttribute('aria-hidden', 'true');
    name.append(marker, element('span', 'case-sr', ' direction unconfirmed'));
  }
  term.append(name, element('small', 'case-verb', roleVerbs[row.role]));
  const links = element('dd', 'case-links');
  row.links.forEach((link, i) => {
    const cell = element('span', 'case-link-cell');
    cell.append(arrow(link));
    if (row.disputed && row.alt && row.alt.index === i) {
      cell.append(element('small', 'case-alt', 'or ' + row.alt.link.from + ' → ' + row.alt.link.to + '?'));
    }
    links.append(cell);
  });
  if (row.disputed && row.alias) {
    links.append(element('small', 'case-swap', 'Swap ' + row.alias.join(' and ') + '?'));
  }
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
    line.append(
      element('span', 'case-fact', report.op === 'verified' ? 'Verified' : 'Ruled out'),
      claim(report.right)
    );
  } else {
    const isWord = report.op === 'or' || report.op === 'nand';
    const isLogic = report.op === 'imp' || isWord;
    const cls = 'case-sign' + (isLogic ? ' case-sign-logic' : '') + (isWord ? ' case-sign-word' : '');
    const sign = element('b', cls, opSymbols[report.op]);
    sign.setAttribute('aria-hidden', 'true');
    line.append(
      claim(report.left),
      sign,
      element('span', 'case-sr', opSpoken[report.op]),
      claim(report.right)
    );
  }
  return line;
}

function easyReport(report, rows) {
  const leftKnown = rows.some(row => row.role === report.left.role && !row.disputed);
  const confirmed = leftKnown ? report.left : report.right;
  const block = element('section', 'case-reports');
  const explainMap = {
    eq: 'Both claims are true or both are false.',
    neq: 'Exactly one claim is true.',
    imp: 'If the left claim holds, the right claim must hold.',
    or: 'At least one of the two claims holds.',
    nand: 'At most one of the two claims holds (not both).'
  };
  block.append(
    element('h3', '', 'Check the ' + roleNames[confirmed.role] + ' row first'),
    element('p', 'case-key', explainMap[report.op])
  );
  const list = element('ul', 'case-report-list');
  list.append(reportLine(report));
  block.append(list);
  return block;
}

export function renderCaseEvidence(root, evidence, {shortlist = true, onShortlistChange} = {}) {
  const board = element('div', 'case-file');
  const brief = element('header', 'case-brief');
  const titleRow = element('div', 'case-title-row');
  titleRow.append(element('p', 'case-title', evidence.title));
  if (evidence.domain) {
    titleRow.append(element('p', 'case-domain', evidence.domain));
  }
  brief.append(titleRow, element('h2', '', evidence.order));
  board.append(brief);

  const hasShortlistToggle = evidence.level === 'super-easy' || evidence.level === 'very-easy';
  if (hasShortlistToggle) {
    const leads = element('div', 'case-leads');
    const toggle = element('label', 'case-shortlist-toggle');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'shortlist-toggle';
    checkbox.name = 'shortlist';
    checkbox.checked = Boolean(shortlist);
    toggle.append(checkbox, element('span', '', 'Shortlist'));
    leads.append(toggle);

    const names = element('span', 'case-leads-names', evidence.leads.join(' · '));
    names.hidden = !shortlist || !evidence.leads.length;
    leads.append(names);

    if (typeof checkbox.addEventListener === 'function') {
      checkbox.addEventListener('change', () => {
        const enabled = checkbox.checked;
        names.hidden = !enabled || !evidence.leads.length;
        if (onShortlistChange) onShortlistChange(enabled);
      });
    }
    board.append(leads);
  } else if (evidence.leads.length) {
    const leads = element('p', 'case-leads');
    leads.append(element('b', '', 'Shortlist'), document.createTextNode(evidence.leads.join(' · ')));
    board.append(leads);
  }

  if (hasShortlistToggle && evidence.hint) {
    board.append(element('p', 'case-first', evidence.hint));
  }

  const records = element('dl', 'case-records');
  records.setAttribute('aria-label', 'Intelligence records by category');
  evidence.rows.forEach((row, index) => records.append(roleRow(row, index)));
  board.append(records);

  const keyNotes = [];
  if (evidence.rows.some(row => row.disputed && !row.alias && !row.alt)) {
    keyNotes.push('? beside a role means both arrows may run backward.');
  }
  if (evidence.rows.some(row => row.disputed && row.alias)) {
    keyNotes.push('Swap trades those two names everywhere in that row.');
  }
  if (evidence.rows.some(row => row.disputed && row.alt)) {
    keyNotes.push('An “or X → Y?” tag marks an alternate contact for that link.');
  }
  if (keyNotes.length) {
    board.append(element('p', 'case-key', keyNotes.join(' ')));
  }

  if (evidence.level === 'easy' && evidence.reports.length === 1 && evidence.reports[0].left) {
    board.append(easyReport(evidence.reports[0], evidence.rows));
  } else if (evidence.reports.length) {
    const reports = element('section', 'case-reports');
    reports.append(element('h3', '', 'Cross-checks'));
    const presentOps = ['eq', 'neq', 'imp', 'or', 'nand'].filter(op => evidence.reports.some(r => r.op === op));
    if (presentOps.length) {
      reports.append(element('p', 'case-key', presentOps.map(op => opLegend[op]).join(' · ')));
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
  panel.append(
    element('p', 'case-title', trial.evidence.title),
    element('h3', '', 'Why ' + trial.pair.join(' and '))
  );
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
  section(
    'Read all six intelligence categories',
    'Each category records a distinct operational link: Friend backs, Foe opposes, Spy watches, Double agent leaks to, Civilian reports to, and Foreigner handles. Arrows always run from the actor on the left to the recipient on the right. Depending on the order, even an ally or civilian may belong in the target pair.'
  );
  if ((level === 'super-easy' || level === 'very-easy') && shortlist) {
    section('Use the shortlist', 'All six rows are confirmed, and the answer pair is among the four shortlist names. You can uncheck Shortlist at any time to weigh all ten targets.');
  } else if (level === 'super-easy' || level === 'very-easy') {
    section('Check the whole file', 'All six rows are confirmed. Weigh every suspect across all six categories to find the exact pair required by the order.');
  } else if (level === 'easy') {
    section('Settle one disputed record', 'Five rows are confirmed and one is disputed. Check the confirmed claim first, then use =, ≠, ⇒ (if left then right), or (at least one), or not both (at most one) to settle the disputed row.');
  } else {
    section('Resolve coupled cross-checks', 'A ? row may reverse both arrows; a Swap row may trade two names; an “or X → Y?” tag marks an alternate contact. Cross-checks form coupled logic cycles with no standalone handouts: test an interpretation around the cycle to rule out every impossible reading.');
  }
  root.replaceChildren(guide);
}
