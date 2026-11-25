import {roleNames, rolePolarity, roleVerbs} from './case-layout.js';

const opSymbols = {
  eq: '=',
  neq: '≠',
  imp: '⇒',
  or: '∨'
};

const opSpoken = {
  eq: ' has the same truth value as ',
  neq: ' has the opposite truth value to ',
  imp: ' implies ',
  or: ' or at least one holds with '
};

const opLegend = {
  eq: '= same truth',
  neq: '≠ opposite truth',
  imp: '⇒ if left holds, right holds',
  or: '∨ at least one holds'
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
  const safe = rolePolarity[row.role] > 0;
  const badge = element('span', 'case-pol ' + (safe ? 'case-pol-safe' : 'case-pol-threat'), safe ? '+' : '−');
  badge.setAttribute('aria-hidden', 'true');
  name.append(badge, element('span', 'case-sr', safe ? 'Safe ' : 'Threat '), roleLabel(row.role));
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
    line.append(
      element('span', 'case-fact', report.op === 'verified' ? 'Verified' : 'Ruled out'),
      claim(report.right)
    );
  } else {
    const isLogic = report.op === 'imp' || report.op === 'or';
    const sign = element('b', 'case-sign' + (isLogic ? ' case-sign-logic' : ''), opSymbols[report.op]);
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
    or: 'At least one of the two claims is true.'
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
  const polKey = element('p', 'case-polarity-key');
  polKey.append(
    element('span', 'pol-safe', '+ Safe'),
    document.createTextNode(' · '),
    element('span', 'pol-threat', '− Threat')
  );
  titleRow.append(polKey);
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
  records.setAttribute('aria-label', 'Contact records by role');
  evidence.rows.forEach((row, index) => records.append(roleRow(row, index)));
  board.append(records);

  if (evidence.rows.some(row => row.disputed && !row.alias)) {
    board.append(element('p', 'case-key', '? beside a role means both arrows may run backward.'));
  }
  if (evidence.rows.some(row => row.alias)) {
    board.append(element('p', 'case-key', 'A swap trades the two names everywhere in that row.'));
  }

  if (evidence.level === 'easy' && evidence.reports.length === 1 && evidence.reports[0].left) {
    board.append(easyReport(evidence.reports[0], evidence.rows));
  } else if (evidence.reports.length) {
    const reports = element('section', 'case-reports');
    reports.append(element('h3', '', 'Cross-checks'));
    const presentOps = ['eq', 'neq', 'imp', 'or'].filter(op => evidence.reports.some(r => r.op === op));
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
    'Read polarity and divisions',
    'Every contact has a Safe (+) or Threat (−) sign across three divisions: Overt (Friend + / Foe −), Covert (Spy + / Double agent −), and Border (Civilian + / Foreigner −). On two-step chains, two Threats cancel to Allied (− × − = +), while Safe + Threat turns Hostile.'
  );
  if ((level === 'super-easy' || level === 'very-easy') && shortlist) {
    section('Use the shortlist', 'The pair is among the four names shown. You can uncheck Shortlist at any time to evaluate all ten targets across all six rows.');
  } else if (level === 'super-easy' || level === 'very-easy') {
    section('Check the whole file', 'All six rows are confirmed. Evaluate every name across all three divisions and both polarities to find the pair.');
  } else if (level === 'easy') {
    section('Resolve one disputed row', 'Five rows are confirmed. Check the confirmed claim first, then use =, ≠, ⇒ (if left then right), or ∨ (at least one) to settle the disputed row.');
  } else {
    section('Resolve coupled cross-checks', 'A ? row may reverse both arrows; a Swap row may trade two names. Some cross-check clusters form coupled cycles with no standalone Verified clue: trace = and ≠ around the loop to see the two competing worlds, then use ⇒ or ∨ to eliminate the impossible world.');
  }
  root.replaceChildren(guide);
}
