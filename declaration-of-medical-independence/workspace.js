import { mountJournal } from './journal.js';
import { mountSketch, validateSketch } from './sketch.js';
import { mountMap, createDefaultMap, validateMap } from './map.js';

const KEY = 'philosophy-of-intelligence.medical-declaration.workspace.v1';
const FORMAT = 'medical-declaration-workspace';
const descriptions = {
  journal: ['Journal', 'Write a reflection or draft a future addition to the declaration.'],
  sketchpad: ['Sketchpad', 'Write or draw an idea with a pen, mouse or finger.'],
  'mind-map': ['Mind map', 'Select an idea to rename it, move it or give it a new branch.']
};
const element = id => document.getElementById(id);
const root = element('tool-root');
const status = element('save-status');
const panes = { reading: element('reading-pane'), workspace: element('workspace-pane') };
const links = [...document.querySelectorAll('.tabs a')];
const empty = () => ({ format: FORMAT, version: 1, entries: [], sketch: [], map: createDefaultMap() });

function valid(value) {
  if (!value || value.format !== FORMAT || value.version !== 1 || !Array.isArray(value.entries)) return false;
  const ids = new Set();
  for (const entry of value.entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)
        || typeof entry.title !== 'string' || typeof entry.body !== 'string'
        || !Number.isFinite(entry.updated) || !Number.isFinite(new Date(entry.updated).getTime())) return false;
    ids.add(entry.id);
  }
  return validateSketch(value.sketch) && validateMap(value.map);
}

function read() {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return empty();
  const loaded = JSON.parse(raw);
  if (!valid(loaded)) throw new Error('Unrecognised workspace');
  return loaded;
}

function announce(message, problem = false) {
  status.textContent = message;
  status.dataset.problem = String(problem);
}

let state;
let dirty = false;
let storageUnreadable = false;
try {
  state = read();
} catch {
  state = empty();
  storageUnreadable = true;
  announce('The browser could not read this workspace. Download a backup of new work before leaving.', true);
}

function save(change) {
  try {
    if (storageUnreadable) throw new Error('Unreadable storage');
    const next = change(dirty ? state : read());
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      state = next;
      dirty = true;
      announce('Browser storage is unavailable or full. Download a backup before leaving.', true);
      return;
    }
    state = next;
    dirty = false;
    announce('Saved in this browser.');
  } catch {
    state = change(state);
    dirty = true;
    announce('Browser storage is unavailable. Download a backup before leaving.', true);
  }
}

let current;
let tool;
let addendumPending = false;

function mount(view) {
  tool?.destroy();
  tool = null;
  root.replaceChildren();
  if (view === 'journal') {
    tool = mountJournal(root, state.entries, entry => save(previous => ({
      ...previous, entries: [entry, ...previous.entries.filter(item => item.id !== entry.id)]
    })), id => save(previous => ({
      ...previous, entries: previous.entries.filter(item => item.id !== id)
    })));
    if (addendumPending) {
      addendumPending = false;
      tool.newEntry('Addition to my declaration');
    }
  } else if (view === 'sketchpad') {
    tool = mountSketch(root, state.sketch, sketch => save(previous => ({ ...previous, sketch })));
  } else if (view === 'mind-map') {
    tool = mountMap(root, state.map, map => save(previous => ({ ...previous, map })));
  }
}

function show() {
  const hash = location.hash.slice(1);
  const view = Object.hasOwn(descriptions, hash) ? hash : 'declaration';
  const changed = current !== view;
  const personal = view !== 'declaration';
  document.body.toggleAttribute('data-private-tool', personal);
  panes.reading.hidden = personal;
  panes.workspace.hidden = !personal;
  for (const link of links) {
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (changed) {
    current = view;
    document.querySelector('.backup').open = false;
    if (personal) {
      element('tool-heading').textContent = descriptions[view][0];
      element('tool-description').textContent = descriptions[view][1];
    }
    mount(view);
  }
  if (personal || hash === 'declaration') {
    window.scrollTo(0, 0);
  } else if (hash && document.getElementById(hash)) {
    document.getElementById(hash).scrollIntoView();
  }
}

element('addendum').addEventListener('click', () => { addendumPending = true; });
window.addEventListener('hashchange', show);
window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

window.addEventListener('storage', event => {
  if (event.key !== KEY && event.key !== null || dirty || storageUnreadable) return;
  let next;
  try { next = read(); } catch { return; }
  const old = state;
  state = next;
  if (current === 'journal') tool.refresh(state.entries);
  if (current === 'sketchpad' || current === 'mind-map') {
    const field = current === 'sketchpad' ? 'sketch' : 'map';
    if (JSON.stringify(old[field]) !== JSON.stringify(next[field])) mount(current);
  }
});

element('export-workspace').addEventListener('click', () => {
  if (!dirty && !storageUnreadable) {
    try { state = read(); } catch { /* The in-memory copy is still available. */ }
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'medical-declaration-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(download);
  download.click();
  download.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
});

const fileInput = element('backup-file');
element('import-workspace').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  let imported;
  try {
    imported = JSON.parse(await file.text());
    if (!valid(imported)) throw new Error('Invalid backup');
  } catch {
    announce('This file is not a valid declaration workspace backup. Choose a JSON backup saved from this page.', true);
    return;
  }
  if (!window.confirm('Replace the journal, sketch and mind map in this browser with those in this backup?')) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(imported));
  } catch {
    announce('The backup could not be restored to browser storage. Your current workspace is still available.', true);
    return;
  }
  state = imported;
  dirty = false;
  storageUnreadable = false;
  mount(current);
  document.querySelector('.backup').open = false;
  announce('Backup restored in this browser.');
});

show();
