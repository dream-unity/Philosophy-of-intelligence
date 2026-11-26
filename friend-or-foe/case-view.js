import {formatDispatchTime, incidentsForDomain, roleNames, verbsForDomain} from './case-layout.js?v=fof20';

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
  eq: '= same',
  neq: '≠ opposite',
  imp: '⇒ if→then',
  or: 'or: ≥1',
  nand: 'not both: ≤1'
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatNameList(names) {
  if (!names || !names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + ' and ' + names[1];
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

function contactLink({from, to}) {
  const item = element('span', 'case-arrow');
  const mark = element('span', 'case-arrow-mark', ' → ');
  mark.setAttribute('aria-hidden', 'true');
  item.append(document.createTextNode(from), mark, element('span', 'case-sr', ' to '), document.createTextNode(to));
  return item;
}

function roleLabel(role) {
  return element('span', 'case-role case-' + role, roleNames[role]);
}

function roleEntry(row, index, verbs, incidents) {
  const divEnd = index === 1 || index === 3 ? ' case-div-end' : '';
  const entry = element('div', 'case-row' + (row.disputed ? ' case-unconfirmed' : '') + divEnd);
  if (typeof entry.setAttribute === 'function') entry.setAttribute('data-role', row.role);
  const term = element('dt', 'case-row-label');
  const name = element('span', 'case-role-name');
  name.append(roleLabel(row.role));
  if (row.disputed && !row.alias && !row.alt) {
    const marker = element('span', 'case-query', '?');
    marker.setAttribute('aria-hidden', 'true');
    name.append(marker, element('span', 'case-sr', ' direction unconfirmed'));
  }
  const meta = element('span', 'case-role-meta');
  meta.append(element('small', 'case-verb', verbs[row.role]));
  if (row.time) {
    meta.append(element('time', 'case-time', formatDispatchTime(row.time)));
  }
  if (row.incident !== undefined && incidents) {
    meta.append(element('span', 'case-incident case-inc-' + row.incident, incidents[row.incident]));
  }
  term.append(name, meta);
  const links = element('dd', 'case-links');
  row.links.forEach((link, i) => {
    const cell = element('span', 'case-link-cell');
    cell.append(contactLink(link));
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
  item.append(roleLabel(clue.role), contactLink(clue));
  return item;
}

function reportLine(report, index) {
  const line = element('li', 'case-report');
  if (typeof line.setAttribute === 'function') line.setAttribute('data-report-index', String(index));
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

function easyReport(report) {
  const block = element('section', 'case-reports');
  block.append(
    element('h3', '', 'Cross-check'),
    element('p', 'case-key', opLegend[report.op] || '')
  );
  const list = element('ul', 'case-report-list');
  list.append(reportLine(report, 0));
  block.append(list);
  return block;
}

function renderStatementWithSuspects(text, suspects) {
  const frag = element('span', 'nback-stmt-text');
  if (!suspects || !suspects.length) {
    frag.textContent = text;
    return frag;
  }
  const escaped = suspects.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`\\b(${escaped})(?='s\\b|\\b)`, 'g');
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const idx = match.index;
    if (idx > cursor) frag.append(document.createTextNode(text.slice(cursor, idx)));
    frag.append(element('strong', 'nback-stmt-suspect', match[1]));
    cursor = idx + match[1].length;
  }
  if (cursor < text.length) frag.append(document.createTextNode(text.slice(cursor)));
  return frag;
}

function renderNBackEvidence(root, evidence) {
  const board = element('div', 'case-file nback-case');
  const brief = element('header', 'case-brief');
  brief.append(element('h2', '', evidence.order));
  board.append(brief);

  const list = element('ol', 'nback-statements');
  list.setAttribute('aria-label', 'Three intelligence leads');
  evidence.statements.forEach((stmt, idx) => {
    const item = element('li', 'nback-stmt');
    if (typeof item.setAttribute === 'function') item.setAttribute('data-stmt-index', String(idx));
    const num = element('span', 'nback-stmt-num', (idx + 1) + '.');
    num.setAttribute('aria-hidden', 'true');
    item.append(num, renderStatementWithSuspects(stmt, evidence.suspects));
    list.append(item);
  });
  board.append(list);

  const keyText = 'Friends tell truth · Foes lie · Suspects: ' + evidence.suspects.join(' · ');
  board.append(element('p', 'nback-meta', keyText));
  root.replaceChildren(board);
}

export function renderCaseEvidence(root, evidence, {shortlist = true, onShortlistChange} = {}) {
  if (evidence && evidence.mode === 'climb-the-ladder') {
    renderNBackEvidence(root, evidence);
    return;
  }
  const board = element('div', 'case-file');
  const brief = element('header', 'case-brief');
  brief.append(element('h2', '', evidence.order));
  board.append(brief);

  const hasShortlistToggle = evidence.level === 'super-super-easy' || evidence.level === 'super-easy' || evidence.level === 'very-easy';
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

  const verbs = verbsForDomain(evidence.domain);
  const incidents = incidentsForDomain(evidence.domain);
  const records = element('dl', 'case-records');
  records.setAttribute('aria-label', 'Intelligence dispatches by role');
  evidence.rows.forEach((row, index) => records.append(roleEntry(row, index, verbs, incidents)));
  board.append(records);

  const keyNotes = [];
  if (evidence.rows.some(row => row.disputed && !row.alias && !row.alt)) {
    keyNotes.push('? reverse');
  }
  if (evidence.rows.some(row => row.disputed && row.alias)) {
    keyNotes.push('Swap: trade names');
  }
  if (evidence.rows.some(row => row.disputed && row.alt)) {
    keyNotes.push('or X→Y?: alt');
  }
  if (keyNotes.length) {
    board.append(element('p', 'case-key', keyNotes.join(' · ')));
  }

  if (evidence.level === 'easy' && evidence.reports.length === 1 && evidence.reports[0].left) {
    board.append(easyReport(evidence.reports[0]));
  } else if (evidence.reports.length) {
    const reports = element('section', 'case-reports');
    reports.append(element('h3', '', 'Cross-checks'));
    const presentOps = ['eq', 'neq', 'imp', 'or', 'nand'].filter(op => evidence.reports.some(r => r.op === op));
    if (presentOps.length) {
      reports.append(element('p', 'case-key', presentOps.map(op => opLegend[op]).join(' · ')));
    }
    const list = element('ul', 'case-report-list');
    evidence.reports.forEach((report, index) => list.append(reportLine(report, index)));
    reports.append(list);
    board.append(reports);
  }

  root.replaceChildren(board);
}

export function renderCaseResult(root, trial, {onHoldToggle, onNext, held = false} = {}) {
  const targets = trial.targets || trial.pair;
  const panel = element('section', 'case-result');
  const titleRow = element('div', 'case-title-row');
  titleRow.append(element('p', 'case-title', 'Debrief'));

  const controls = element('div', 'case-debrief-actions');
  controls.append(
    element('p', 'case-domain case-result-hint', held ? 'Held · Space: next · P: resume' : 'Space: next · P: hold')
  );
  if (typeof onHoldToggle === 'function') {
    const holdBtn = element('button', 'case-debrief-btn', held ? 'Resume' : 'Hold');
    holdBtn.type = 'button';
    if (typeof holdBtn.setAttribute === 'function') holdBtn.setAttribute('data-action', 'hold');
    holdBtn.addEventListener('click', () => onHoldToggle());
    controls.append(holdBtn);
  }
  if (typeof onNext === 'function') {
    const nextBtn = element('button', 'case-debrief-btn case-debrief-next', 'Next');
    nextBtn.type = 'button';
    if (typeof nextBtn.setAttribute === 'function') nextBtn.setAttribute('data-action', 'next');
    nextBtn.addEventListener('click', () => onNext());
    controls.append(nextBtn);
  }
  titleRow.append(controls);

  panel.append(
    titleRow,
    element('h3', '', 'Why ' + formatNameList(targets))
  );
  if (trial.rivalDebrief) {
    const rival = trial.rivalDebrief;
    const isDirect = typeof rival.reportIndex !== 'number' && rival.rivalTargets.length === 1;
    const text = isDirect
      ? 'Why not ' + rival.rivalTargets[0] + '? ' + rival.defeatedBy
      : 'Rival ' + formatNameList(rival.rivalTargets) + ' ruled out by: ' + rival.defeatedBy;
    panel.append(element('p', 'case-rival', text));
  }
  const list = element('ul', 'case-proof');
  for (const explanation of trial.proof) list.append(element('li', '', explanation));
  panel.append(list);

  if (trial.nbackDebrief && trial.nbackDebrief.refStatements) {
    const refBox = element('div', 'nback-ref-box');
    refBox.append(element('p', 'nback-ref-title', 'Reference briefing #' + trial.nbackDebrief.refNumber));
    const refList = element('ul', 'nback-ref-list');
    trial.nbackDebrief.refStatements.forEach((stmt, i) => {
      refList.append(element('li', '', (i + 1) + '. ' + stmt));
    });
    refBox.append(refList);
    panel.append(refBox);
  }

  const fileNode = typeof root.querySelector === 'function' ? root.querySelector('.case-file') : null;
  if (fileNode && typeof root.prepend === 'function') {
    if (fileNode.classList && typeof fileNode.classList.add === 'function') {
      fileNode.classList.add('case-debrief-active');
    }
    const oldResult = root.querySelector('.case-result');
    if (oldResult && typeof oldResult.remove === 'function') oldResult.remove();
    if (typeof root.querySelectorAll === 'function') {
      root.querySelectorAll('.case-decisive').forEach(node => node.classList.remove('case-decisive'));
      root.querySelectorAll('.nback-stmt').forEach(node => {
        node.classList.remove('nback-clash', 'nback-broken', 'nback-matched');
      });
      if (trial.nbackDebrief) {
        for (const ci of trial.nbackDebrief.clashIndices || []) {
          const hit = root.querySelector(`[data-stmt-index="${ci}"]`);
          if (hit) hit.classList.add('nback-clash');
        }
        for (const bi of trial.nbackDebrief.mismatchIndices || []) {
          const hit = root.querySelector(`[data-stmt-index="${bi}"]`);
          if (hit) hit.classList.add('nback-broken');
        }
        if (trial.nbackDebrief.isEcho) {
          root.querySelectorAll('.nback-stmt').forEach(node => node.classList.add('nback-matched'));
        }
      } else if (trial.rivalDebrief && typeof trial.rivalDebrief.reportIndex === 'number') {
        const hit = root.querySelector(`[data-report-index="${trial.rivalDebrief.reportIndex}"]`);
        if (hit) hit.classList.add('case-decisive');
      } else if (trial.rivalDebrief && trial.rivalDebrief.decisiveRole) {
        const hit = root.querySelector(`[data-role="${trial.rivalDebrief.decisiveRole}"]`);
        if (hit) hit.classList.add('case-decisive');
      }
    }
    root.prepend(panel);
  } else {
    root.replaceChildren(panel);
  }
}

export function renderCaseGuide(root, level, {shortlist = true, zeroToHero = false, nBack = 1} = {}) {
  const guide = element('div', 'case-guide');
  const section = (title, words) => {
    const block = element('section');
    block.append(element('h3', '', title), element('p', '', words));
    guide.append(block);
  };
  if (level === 'climb-the-ladder') {
    section(
      'Crack all three intelligence leads',
      'Each briefing names three suspects in three compact statements. Friends always tell the truth and Foes always lie. Unpack nested loyalties, speaker claims, analogies, and conditionals to deduce the Foes—or catch two speakers whose claims directly clash.'
    );
    section(
      'Compare N briefings back (' + nBack + '-back)',
      'Hold the underlying logical rules of each briefing across ' + nBack + ' trials. Names shift, order scrambles, and phrasing rewrites. If all three logical rules echo the briefing ' + nBack + ' trials back, invert your shot among the three suspects: shoot the Friends instead of the Foes, or shoot the uninvolved speaker instead of the clashing pair.'
    );
    root.replaceChildren(guide);
    return;
  }
  section(
    'Read all six intelligence roles',
    'Each role logs two operational contacts with a dispatch timestamp (01:00–06:00), an operation tag (split across two active sites), and an action verb adapted to the case. Each contact runs from the operative acting in that role to the person they reach. Every trial assigns one to four targets with matching bullets; depending on the order, even a Friend or Civilian may be marked.'
  );
  if (level === 'zero-to-hero') {
    section(
      'Climb from Zero to Hero',
      'You start at Super-super Easy with confirmed dispatches. Clear 6 straight trials to climb one difficulty tier all the way to Hard; miss 2 straight trials to drop one tier.'
    );
  } else {
    const isIntro = level === 'super-super-easy' || level === 'super-easy' || level === 'very-easy';
    if (isIntro && shortlist) {
      section('Use the shortlist', 'All six dispatches are confirmed, and every assigned target is on the shortlist. Uncheck Shortlist at any time to weigh all ten suspects.');
    } else if (isIntro) {
      section('Weigh all ten suspects', 'All six dispatches are confirmed. Cross-reference every suspect across all six roles and dispatch times to identify every target required by the order.');
    } else if (level === 'easy') {
      section('Settle one disputed dispatch', 'Five dispatches are confirmed and one is disputed. Compare the cross-check against the confirmed dispatch using = (same truth) or ≠ (opposite truth) to settle the disputed one.');
    } else {
      section('Resolve coupled cross-checks', 'A ? role may reverse both contacts; a Swap tag may trade two names throughout that dispatch; an “or X → Y?” tag marks a disputed contact. Cross-checks form coupled cycles with no standalone handouts: test an interpretation around the cycle to eliminate every impossible reading.');
    }
    if (zeroToHero) {
      section('From Zero to Hero', 'Clear 6 straight trials to climb one difficulty tier up to Hard; miss 2 straight trials to drop one tier.');
    }
  }
  root.replaceChildren(guide);
}
