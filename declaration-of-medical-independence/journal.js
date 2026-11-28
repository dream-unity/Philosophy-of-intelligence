const shortDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric'
});
const fullDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
});

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'journal-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function byRecent(a, b) {
  return b.updated - a.updated || a.id.localeCompare(b.id);
}

export function mountJournal(root, entries, onEdit, onDelete) {
  const doc = root.ownerDocument;
  function el(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(className, label) {
    const node = el('button', className, label);
    node.type = 'button';
    return node;
  }

  const widget = el('div', 'journal-editor');
  const shelf = el('div', 'jr-shelf');
  const shelfBar = el('div', 'jr-shelf-bar');
  const shelfTitle = el('h3', 'jr-shelf-title', 'Entries');
  const add = button('jr-add', 'New entry');
  const list = el('ul', 'jr-list');
  list.setAttribute('aria-label', 'Journal entries, most recently edited first');
  const empty = el('p', 'jr-empty', 'Your entries will appear here.');
  shelfBar.append(shelfTitle, add);
  shelf.append(shelfBar, list, empty);

  const writing = el('div', 'jr-paper');
  const fieldId = createId();
  const titleLabel = el('label', 'jr-label', 'Title');
  const title = el('input', 'jr-title');
  title.id = fieldId + '-title';
  title.type = 'text';
  title.placeholder = 'Untitled entry';
  titleLabel.htmlFor = title.id;
  const bodyLabel = el('label', 'jr-label', 'Reflection');
  const body = el('textarea', 'jr-body');
  body.id = fieldId + '-body';
  body.rows = 10;
  bodyLabel.htmlFor = body.id;
  const footer = el('div', 'jr-footer');
  const stamp = el('p', 'jr-stamp');
  const remove = button('jr-remove', 'Delete entry');
  const confirmation = el('div', 'jr-confirm');
  confirmation.hidden = true;
  confirmation.setAttribute('role', 'group');
  confirmation.setAttribute('aria-label', 'Confirm entry deletion');
  const warning = el('span', 'jr-warning', 'Delete this entry permanently?');
  const cancel = button('jr-cancel', 'Keep entry');
  const confirm = button('jr-confirm-delete', 'Delete');
  confirmation.append(warning, cancel, confirm);
  footer.append(stamp, remove, confirmation);
  writing.append(titleLabel, title, bodyLabel, body, footer);
  widget.append(shelf, writing);
  root.replaceChildren(widget);

  let saved = new Map();
  let current = null;
  let isDraft = false;
  let destroyed = false;
  const rows = new Map();

  function dismiss() {
    confirmation.hidden = true;
    remove.hidden = isDraft;
  }

  function makeDraft(initialTitle = '') {
    current = { id: createId(), title: initialTitle, body: '', updated: 0 };
    isDraft = true;
  }

  function pickFirst() {
    const first = Array.from(saved.values()).sort(byRecent)[0];
    if (first) {
      current = first;
      isDraft = false;
    } else {
      makeDraft();
    }
  }

  function updateStamp() {
    stamp.textContent = isDraft ? 'New entry' : 'Edited ' + fullDate.format(current.updated);
  }

  function showFields() {
    if (title.value !== current.title) title.value = current.title;
    if (body.value !== current.body) body.value = current.body;
    dismiss();
    updateStamp();
  }

  function updateList() {
    for (const [id, row] of rows) {
      if (!saved.has(id)) {
        row.li.remove();
        rows.delete(id);
      }
    }
    const ordered = Array.from(saved.values()).sort(byRecent);
    let position = list.firstElementChild;
    for (const entry of ordered) {
      let row = rows.get(entry.id);
      if (!row) {
        const li = el('li');
        const control = button('jr-row', '');
        const name = el('span', 'jr-row-name');
        const date = el('time', 'jr-date');
        control.append(name, date);
        control.addEventListener('click', () => {
          current = saved.get(entry.id);
          isDraft = false;
          showFields();
          updateList();
          body.focus();
        });
        li.append(control);
        row = { li, control, name, date };
        rows.set(entry.id, row);
      }
      const label = entry.title.trim() || entry.body.trim().split(/\r?\n/, 1)[0].slice(0, 75) || 'Untitled entry';
      if (row.name.textContent !== label) row.name.textContent = label;
      const day = shortDate.format(entry.updated);
      if (row.date.textContent !== day) row.date.textContent = day;
      row.date.dateTime = new Date(entry.updated).toISOString();
      if (current.id === entry.id) row.control.setAttribute('aria-current', 'true');
      else row.control.removeAttribute('aria-current');
      if (row.li !== position) list.insertBefore(row.li, position);
      position = row.li.nextElementSibling;
    }
    empty.hidden = ordered.length > 0;
  }

  function refresh(next) {
    if (destroyed) return;
    saved = new Map((Array.isArray(next) ? next : []).filter(entry =>
      entry && typeof entry.id === 'string' && typeof entry.title === 'string' &&
      typeof entry.body === 'string' && Number.isFinite(entry.updated) &&
      Number.isFinite(new Date(entry.updated).getTime())
    ).map(entry => [entry.id, entry]));
    if (current && saved.has(current.id)) {
      current = saved.get(current.id);
      isDraft = false;
    } else if (!current || !isDraft) {
      pickFirst();
    }
    showFields();
    updateList();
  }

  function newEntry(initialTitle = '') {
    if (destroyed) return;
    makeDraft(String(initialTitle));
    showFields();
    updateList();
    (initialTitle ? body : title).focus();
  }

  function edited() {
    if (isDraft && !title.value.trim() && !body.value.trim()) return;
    const entry = { id: current.id, title: title.value, body: body.value, updated: Date.now() };
    current = entry;
    isDraft = false;
    saved.set(entry.id, entry);
    dismiss();
    updateStamp();
    updateList();
    onEdit({ ...entry });
  }

  title.addEventListener('input', edited);
  body.addEventListener('input', edited);
  add.addEventListener('click', () => newEntry());
  remove.addEventListener('click', () => {
    remove.hidden = true;
    confirmation.hidden = false;
    cancel.focus();
  });
  cancel.addEventListener('click', () => {
    dismiss();
    remove.focus();
  });
  confirmation.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      remove.focus();
    }
  });
  confirm.addEventListener('click', () => {
    const id = current.id;
    saved.delete(id);
    pickFirst();
    showFields();
    updateList();
    onDelete(id);
    (isDraft ? title : body).focus();
  });

  refresh(entries);
  return { refresh, newEntry, destroy() { destroyed = true; widget.remove(); } };
}
