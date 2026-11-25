// Keep the player's deductions with this particular trial when the range pauses.
const pages = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text) {
  const node = element('button', className, text);
  node.type = 'button';
  return node;
}

function makeLedger({headers, rows}) {
  const table = element('table', 'nb-ledger');
  table.append(element('caption', '', 'Signal log'));
  const head = table.createTHead().insertRow();
  for (const header of headers) {
    const th = element('th', '', header);
    th.scope = 'col';
    head.append(th);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    const actor = element('th', '', row[0]);
    actor.scope = 'row';
    tr.append(actor);
    for (const value of row.slice(1)) tr.append(element('td', '', value));
  }
  return table;
}

export function mountNotebook(root, trial, onChange = () => {}, priorNotes = {}) {
  // Use the public headings, names and clues. Only the player's own choices
  // populate the six pairs.
  const roles = trial.roles.map(({key, label}) => ({key, label}));
  const names = [...trial.roster].sort((a, b) => a.localeCompare(b));
  if (!pages.has(trial)) {
    const marks = new Map();
    for (const {key} of roles) {
      const carried = trial.amended && Array.isArray(priorNotes?.[key]) ? priorNotes[key] : [];
      const valid = new Set(carried.filter(name => names.includes(name)));
      marks.set(key, new Set([...valid].slice(0, 2)));
    }
    pages.set(trial, {view: 'evidence', active: roles[0].key, marks});
  }
  const page = pages.get(trial);

  const book = element('div', 'field-book');
  const pagesMenu = element('div', 'nb-pages');
  pagesMenu.setAttribute('role', 'group');
  pagesMenu.setAttribute('aria-label', 'Briefing pages');
  const evidenceButton = button('nb-tab', 'Clues');
  const notesButton = button('nb-tab', 'My notebook');
  pagesMenu.append(evidenceButton, notesButton);

  const spread = element('div', 'nb-spread');
  const evidence = element('section', 'nb-evidence nb-page');
  evidence.setAttribute('aria-label', 'Trial evidence');
  const rosterSummary = element('p', 'nb-roster-summary');
  rosterSummary.append(element('strong', '', 'Roster'), document.createTextNode(names.join(' · ')));
  evidence.append(element('h3', 'nb-heading', 'Clues'), rosterSummary, makeLedger(trial.brief.table));
  const clueList = element('dl', 'nb-clues');
  for (const clue of trial.brief.clues) {
    const group = element('div', 'nb-clue');
    group.append(element('dt', '', clue.title), element('dd', '', clue.text));
    clueList.append(group);
  }
  evidence.append(clueList);

  const notes = element('section', 'nb-notes nb-page');
  notes.setAttribute('aria-label', 'My notebook');
  notes.append(element('h3', 'nb-heading', 'My notebook'));
  notes.append(element('p', 'nb-instruction', 'Choose a category, then mark two names. A name can belong to more than one pair.'));

  const categories = element('div', 'nb-categories');
  categories.setAttribute('role', 'group');
  categories.setAttribute('aria-label', 'Notebook categories');
  const categoryButtons = new Map();
  for (const {key, label} of roles) {
    const tab = button('nb-category');
    const pair = element('span', 'nb-pair');
    tab.append(element('span', 'nb-category-title', label), pair);
    tab.addEventListener('click', () => {
      page.active = key;
      refreshMarks();
    });
    categoryButtons.set(key, {tab, pair});
    categories.append(tab);
  }

  const picker = element('fieldset', 'nb-picker');
  const legend = element('legend');
  const picks = element('div', 'nb-picks');
  const count = element('p', 'nb-count');
  count.setAttribute('aria-live', 'polite');
  count.setAttribute('aria-atomic', 'true');
  const nameButtons = new Map();
  for (const name of names) {
    const toggle = button('nb-name', name);
    toggle.addEventListener('click', () => {
      const current = page.marks.get(page.active);
      if (current.has(name)) current.delete(name);
      else if (current.size < 2) current.add(name);
      refreshMarks();
      onChange();
    });
    nameButtons.set(name, toggle);
    picks.append(toggle);
  }
  picker.append(legend, picks, count);
  notes.append(categories, picker);
  spread.append(evidence, notes);
  book.append(pagesMenu, spread);
  root.replaceChildren(book);

  function refreshMarks() {
    for (const {key, label} of roles) {
      const marks = [...page.marks.get(key)].sort();
      const {tab, pair} = categoryButtons.get(key);
      tab.setAttribute('aria-pressed', String(key === page.active));
      tab.setAttribute('aria-label', label + ', ' + marks.length + ' of 2 marked' + (marks.length ? ', ' + marks.join(' and ') : ''));
      pair.textContent = marks.length ? marks.join(' · ') : '0 / 2';
    }
    const activeRole = roles.find(role => role.key === page.active);
    const current = page.marks.get(page.active);
    legend.textContent = activeRole.label;
    for (const [name, toggle] of nameButtons) {
      const marked = current.has(name);
      toggle.setAttribute('aria-pressed', String(marked));
      toggle.disabled = !marked && current.size === 2;
    }
    count.textContent = current.size === 2
      ? '2 of 2 marked. Tap a marked name to remove it.'
      : current.size + ' of 2 marked.';
  }

  function show(view) {
    page.view = view;
    book.dataset.view = view;
    evidenceButton.setAttribute('aria-pressed', String(view === 'evidence'));
    notesButton.setAttribute('aria-pressed', String(view === 'notes'));
  }
  const showEvidence = () => show('evidence');
  const showNotes = () => show('notes');
  evidenceButton.addEventListener('click', showEvidence);
  notesButton.addEventListener('click', showNotes);
  show(page.view);
  refreshMarks();
  return {
    showEvidence,
    showNotes,
    getNotes: () => Object.fromEntries(roles.map(({key}) => [key, [...page.marks.get(key)]]))
  };
}
