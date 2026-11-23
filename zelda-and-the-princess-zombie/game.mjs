import { drawFieldMap, describeFieldMap } from './field-map.mjs';
import { createWorld, tick, act, choose, getHUD, resumeCheckpoint } from './world.mjs';
import { createAudio } from './audio.mjs';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const saveKey = 'xero.forest.journey.v1',
  crossroadsKey = 'xero.forest.crossroads.v1',
  endingsKey = 'xero.forest.endings.v1',
  settingsKey = 'xero.forest.controls.v1';

const ENDING_NAMES = {
  saved: 'The Bell Falls Silent',
  feast: 'The Feast',
  bound: 'The Bound Way',
  horde: 'The Three Thousand',
  wilds: 'Lost to the Wilds',
};

let storageWarned = false;
function showStorageWarning() {
  if (storageWarned) return;
  storageWarned = true;
  const banner = $('storage-banner');
  if (!banner) return;
  banner.textContent = 'Browser storage is unavailable — progress will not persist after closing this tab.';
  banner.hidden = false;
}
function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showStorageWarning();
    return false;
  }
}
function hydrateJourney(saved) {
  if (
    !(saved?.version === 1 || saved?.version === 2) ||
    !Array.isArray(saved.actors) ||
    !saved.actors.length ||
    !Number.isFinite(saved.player?.x) ||
    !Number.isFinite(saved.elapsed) ||
    typeof saved.checkpoint !== 'string'
  )
    return null;
  const base = createWorld();
  return {
    ...base,
    ...saved,
    player: { ...base.player, ...saved.player },
    milestones: { ...base.milestones, ...(saved.milestones || {}) },
    discovered: { ...base.discovered, ...(saved.discovered || {}) },
    journal: Array.isArray(saved.journal) ? saved.journal : base.journal,
    effects: [],
    events: [],
    mapOpen: false,
    version: 2,
  };
}
function loadJourney(key = saveKey) {
  return hydrateJourney(read(key));
}
function recordEnding(id) {
  if (!id) return;
  const list = read(endingsKey);
  const next = Array.isArray(list) ? [...new Set([...list, id])] : [id];
  write(endingsKey, next);
}

const preferences = read(settingsKey) || {};
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const options = {
  sound: preferences.sound !== false,
  masterVolume: clamp(Number(preferences.masterVolume ?? 1), 0, 1),
  musicVolume: clamp(Number(preferences.musicVolume ?? 0.85), 0, 1),
  sfxVolume: clamp(Number(preferences.sfxVolume ?? 1), 0, 1),
  sensitivity: clamp(Number(preferences.sensitivity) || 1, 0.4, 2),
  reduceMotion:
    typeof preferences.reduceMotion === 'boolean' ? preferences.reduceMotion : motionQuery.matches,
  leftHanded: Boolean(preferences.leftHanded),
  largeTouch: Boolean(preferences.largeTouch),
};
function applyBodyPrefs() {
  document.body.classList.toggle('touch-left-handed', options.leftHanded);
  document.body.classList.toggle('touch-large', options.largeTouch);
}
applyBodyPrefs();

motionQuery.addEventListener?.('change', (event) => {
  if (typeof read(settingsKey)?.reduceMotion === 'boolean') return;
  options.reduceMotion = event.matches;
  if (world) world.reducedMotion = event.matches;
});

const keys = new Set(),
  movement = { forward: 0, strafe: 0 };
const view = $('view'),
  stage = $('stage'),
  title = $('title-screen'),
  overlay = $('overlay');
const audio = createAudio();
audio.setVolumes({
  master: options.masterVolume,
  music: options.musicVolume,
  sfx: options.sfxVolume,
});

let world = null,
  renderer = null,
  createView = null,
  needsFrame = true,
  screen = 'title',
  panel = '',
  dialogueRef = null,
  endingRef = null;
let frameId = 0,
  lastTime = 0,
  lastHUD = 0,
  lastSave = 0,
  running = false,
  sprint = false,
  stickId = null,
  lookId = null,
  lookX = 0,
  lookY = 0,
  lookDownX = 0,
  lookDownY = 0,
  lookDownAt = 0,
  lookMoved = false,
  guardHeld = false,
  swordHoldTimer = 0,
  swordLongPressed = false,
  crossroadsSaved = false;
let lastFocus = null,
  damageTimer = 0,
  ignoreUnlock = false,
  showingLoad = false;

const mapView = { zoom: 1, panX: 0, panY: 0 };
let lastMapProjection = null;

function syncBodyState() {
  let state = 'title';
  if (screen === 'game') {
    if (world?.ending || panel === 'ending') state = 'gameover';
    else if (panel) state = 'paused';
    else state = 'playing';
  }
  document.body.dataset.state = state;
}
function display(node, visible) {
  if (node) node.hidden = !visible;
}
function text(nodeId, value) {
  const node = $(nodeId);
  if (node && node.textContent !== value) node.textContent = value;
}
function icon(name) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    use = document.createElementNS(el.namespaceURI, 'use');
  el.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', location.pathname + location.search + '#' + name);
  el.append(use);
  return el;
}
// Fragment-only sprite links retain the current document on both clean URL forms and query strings.
document
  .querySelectorAll('use[href^="#"]')
  .forEach((use) => use.setAttribute('href', location.pathname + location.search + use.getAttribute('href')));

function paragraph(content, className) {
  const el = document.createElement('p');
  el.textContent = content;
  if (className) el.className = className;
  return el;
}
function button(label, callback, style = 'secondary') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = style;
  el.textContent = label;
  el.addEventListener('click', callback);
  return el;
}
function stopMotion({ keepSprint = false } = {}) {
  keys.clear();
  movement.forward = 0;
  movement.strafe = 0;
  stickId = null;
  lookId = null;
  if (guardHeld && world) act(world, 'unguard');
  guardHeld = false;
  $('guard-button')?.setAttribute('aria-pressed', 'false');
  const stick = $('stick');
  if (stick?.firstElementChild) stick.firstElementChild.style.transform = '';
  if (!keepSprint) {
    sprint = false;
    $('sprint')?.setAttribute('aria-pressed', 'false');
  }
}
function save() {
  if (!world || showingLoad) return;
  write(saveKey, { ...world, events: [], effects: [], mapOpen: false });
}
function saveCrossroadsIfReady() {
  if (!world || crossroadsSaved) return;
  if (world.greeted && world.route === 'undecided' && world.actors[0]?.alive) {
    crossroadsSaved = true;
    write(crossroadsKey, { ...world, events: [], effects: [], mapOpen: false });
  }
}
function soundState() {
  $('title-sound').replaceChildren(
    icon(options.sound ? 'sound' : 'mute'),
    Object.assign(document.createElement('span'), { textContent: options.sound ? 'Sound on' : 'Sound off' })
  );
  $('title-sound').setAttribute('aria-pressed', String(options.sound));
  audio.setVolumes({
    master: options.masterVolume,
    music: options.musicVolume,
    sfx: options.sfxVolume,
  });
  audio.setEnabled(
    Boolean(
      options.sound &&
        screen === 'game' &&
        !document.hidden &&
        !['pause', 'help', 'restart', 'error', 'context'].includes(panel)
    )
  );
}
function toggleSound() {
  options.sound = !options.sound;
  write(settingsKey, options);
  if (options.sound) audio.unlock();
  soundState();
}
$('title-sound').addEventListener('click', toggleSound);

function releaseLook() {
  if (document.pointerLockElement === view) {
    ignoreUnlock = true;
    document.exitPointerLock?.();
  }
}
function modal(name, kicker, heading, body, actions, { closable = true, keepSprint = false } = {}) {
  if (!panel) lastFocus = document.activeElement;
  stopMotion({ keepSprint });
  panel = name;
  releaseLook();
  display(overlay, true);
  title.inert = screen === 'title';
  stage.inert = screen === 'game';
  $('panel').classList.toggle('map-panel', name === 'map');
  const portrait = name === 'dialogue' && world?.dialogue?.speaker === 'The witch';
  $('panel').classList.toggle('witch-panel', portrait);
  let portraitImage = $('witch-portrait');
  if (portrait && !portraitImage) {
    portraitImage = document.createElement('img');
    portraitImage.id = 'witch-portrait';
    portraitImage.src = 'witch.webp';
    portraitImage.alt = 'The traveller with her lantern';
    portraitImage.decoding = 'async';
    $('panel').prepend(portraitImage);
  }
  if (portraitImage) display(portraitImage, portrait);
  text('panel-kicker', kicker);
  text('panel-title', heading);
  $('panel-body').replaceChildren(...body);
  $('panel-actions').replaceChildren(...actions);
  display($('panel-close'), closable);
  $('panel').scrollTop = 0;
  $('panel-title').focus({ preventScroll: true });
  soundState();
  syncBodyState();
}
function dismiss({ keepSprint = false } = {}) {
  display(overlay, false);
  panel = '';
  title.inert = false;
  stage.inert = false;
  dialogueRef = null;
  endingRef = null;
  lastTime = performance.now() / 1000;
  stopMotion({ keepSprint });
  soundState();
  syncBodyState();
  const focusNode =
    screen === 'game'
      ? view
      : lastFocus?.isConnected && !lastFocus.closest('[hidden]')
        ? lastFocus
        : $('start');
  focusNode?.focus({ preventScroll: true });
}
function returnFromPanel() {
  if (panel === 'help' || panel === 'restart') {
    screen === 'game' ? pause() : dismiss();
    return;
  }
  if (panel === 'map') {
    act(world, 'close');
    dismiss({ keepSprint: true });
    return;
  }
  if (panel === 'journal') {
    dismiss({ keepSprint: true });
    return;
  }
  if (panel === 'dialogue') {
    if (act(world, 'close')) {
      dismiss();
      syncStory();
      save();
    }
    return;
  }
  if (panel === 'pause') dismiss();
}
$('panel-close').addEventListener('click', returnFromPanel);

function controls() {
  const touch = paragraph(
    'On a touchscreen, move with the thumb stick and drag the scene to look. Tap Sword to slash or hold to thrust. Hold Guard to parry an incoming blow. Swap handedness or enlarge buttons in Pause.'
  );
  const table = document.createElement('div');
  table.className = 'key-table';
  for (const label of [
    'Move',
    'W A S D',
    'Look / pitch',
    'Mouse, drag, or I / K',
    'Turn / move',
    'Arrow keys',
    'Sprint',
    'Hold Shift',
    'Interact / forage',
    'E',
    'Slash / Thrust',
    'F or click · Shift+F or V',
    'Guard & Parry',
    'Hold R or right-click',
    'Step-dodge',
    'Space',
    'Throw cinder phial',
    'Q',
    'Map / Journal / Pause',
    'M / J / Esc',
  ]) {
    const cell = document.createElement('span');
    cell.textContent = label;
    table.append(cell);
  }
  const hint = paragraph(
    'Quick left-click swings your sword even without pointer lock; drag to turn. Right-click holds guard to deflect attacks.',
    'field-note'
  );
  modal('help', 'Field guide', 'How to play', [touch, table, hint], [button('Back', returnFromPanel)]);
}
$('help').addEventListener('click', controls);

function openFullscreen() {
  const f = document.fullscreenElement ? document.exitFullscreen?.() : $('app').requestFullscreen?.();
  if (f?.catch)
    f.catch(() => {
      if (screen === 'title') text('startup-status', 'Fullscreen is unavailable in this browser.');
    });
}
if (!document.fullscreenEnabled) display($('fullscreen'), false);
$('fullscreen').addEventListener('click', openFullscreen);
document.addEventListener('fullscreenchange', () => {
  textFull();
  renderer?.resize();
});
function textFull() {
  $('fullscreen').querySelector('span').textContent = document.fullscreenElement
    ? 'Leave fullscreen'
    : 'Fullscreen';
}

function sliderSetting(labelText, min, max, step, value, onChange) {
  const row = document.createElement('label');
  row.className = 'setting';
  row.append(labelText);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => onChange(Number(input.value)));
  row.append(input);
  return row;
}
function checkSetting(labelText, checked, onChange) {
  const row = document.createElement('label');
  row.className = 'setting';
  row.append(labelText);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  input.addEventListener('change', () => onChange(input.checked));
  row.append(input);
  return row;
}

function pause() {
  if (!world || world.ending) return;
  save();
  const rows = [
    checkSetting('Sound enabled', options.sound, () => toggleSound()),
    sliderSetting('Master volume', 0, 1, 0.05, options.masterVolume, (v) => {
      options.masterVolume = v;
      write(settingsKey, options);
      soundState();
    }),
    sliderSetting('Music volume', 0, 1, 0.05, options.musicVolume, (v) => {
      options.musicVolume = v;
      write(settingsKey, options);
      soundState();
    }),
    sliderSetting('Effects volume', 0, 1, 0.05, options.sfxVolume, (v) => {
      options.sfxVolume = v;
      write(settingsKey, options);
      soundState();
    }),
    sliderSetting('Look sensitivity', 0.4, 2, 0.1, options.sensitivity, (v) => {
      options.sensitivity = v;
      write(settingsKey, options);
    }),
    checkSetting('Reduce camera motion', options.reduceMotion, (checked) => {
      options.reduceMotion = checked;
      world.reducedMotion = checked;
      write(settingsKey, options);
    }),
    checkSetting('Left-handed touch layout', options.leftHanded, (checked) => {
      options.leftHanded = checked;
      applyBodyPrefs();
      write(settingsKey, options);
    }),
    checkSetting('Larger touch controls', options.largeTouch, (checked) => {
      options.largeTouch = checked;
      applyBodyPrefs();
      write(settingsKey, options);
    }),
  ];
  const actions = [
    button(
      'Resume',
      () => {
        audio.unlock();
        dismiss();
      },
      'primary'
    ),
    button('Field journal', journalPanel),
    button('How to play', controls),
    button('Title screen', goHome),
    button('Begin anew', confirmNew),
  ];
  if (document.fullscreenEnabled)
    actions.push(button(document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen', openFullscreen));
  modal('pause', getHUD(world).location, 'Journey paused', rows, actions);
}
$('pause-button').addEventListener('click', pause);

function confirmNew() {
  modal(
    'restart',
    'Lanternwood',
    'Begin a new journey?',
    [paragraph('Return to the start of the forest and replace your saved journey.')],
    [button('Begin anew', () => start(false), 'primary'), button('Keep my journey', returnFromPanel)]
  );
}
$('fresh').addEventListener('click', confirmNew);

function updateStart() {
  const saved = loadJourney(saveKey);
  const crossroads = loadJourney(crossroadsKey);
  $('start').querySelector('span').textContent = saved ? 'Continue journey' : 'Enter the forest';
  display($('fresh'), Boolean(saved));
  display($('resume-crossroads'), Boolean(crossroads));
  const endings = read(endingsKey);
  const recordEl = $('endings-record');
  if (Array.isArray(endings) && endings.length) {
    const names = endings.map((id) => ENDING_NAMES[id] || id).join(' · ');
    recordEl.textContent = `Endings reached (${endings.length}/5): ${names}`;
    display(recordEl, true);
  } else {
    display(recordEl, false);
  }
}
$('resume-crossroads').addEventListener('click', () => start('crossroads'));

function goHome() {
  save();
  releaseLook();
  cancelAnimationFrame(frameId);
  frameId = 0;
  running = false;
  screen = 'title';
  dismiss();
  display(stage, false);
  display(title, true);
  world = null;
  updateStart();
  $('start').focus();
  soundState();
  syncBodyState();
}

function graphicsError() {
  running = false;
  save();
  modal(
    'error',
    'Lanternwood',
    'The view could not open',
    [paragraph('Try opening the forest again. Your last position is saved on this device.')],
    [button('Return to title', goHome, 'primary')],
    { closable: false }
  );
  renderer?.dispose();
  renderer = null;
}

async function start(mode = true) {
  if (showingLoad) return;
  showingLoad = true;
  $('start').disabled = true;
  text('startup-status', '');
  audio.unlock();
  try {
    if (mode === 'crossroads') {
      world = loadJourney(crossroadsKey) || createWorld();
    } else if (mode === true) {
      world = loadJourney(saveKey) || createWorld();
    } else {
      world = createWorld();
    }
    world.events = [];
    world.effects = [];
    world.reducedMotion = options.reduceMotion;
    crossroadsSaved = Boolean(world.route && world.route !== 'undecided');
    needsFrame = true;
    if (!renderer) {
      const module = await import('./render.mjs');
      createView = module.createRenderer;
      renderer = createView(view);
    }
    screen = 'game';
    display(title, false);
    display(stage, true);
    dismiss();
    renderer.resize();
    running = true;
    lastTime = performance.now() / 1000;
    lastHUD = 0;
    lastSave = lastTime;
    refreshHUD();
    syncStory();
    syncBodyState();
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(frame);
  } catch (error) {
    console.error('Forest start failed', error);
    screen = 'title';
    display(stage, false);
    display(title, true);
    dismiss();
    text('startup-status', 'The forest could not load. Reload this page to try again.');
  } finally {
    showingLoad = false;
    $('start').disabled = false;
  }
  if (screen === 'game') save();
}
$('start').addEventListener('click', () => start(true));

function drawMap() {
  const canvas = $('field-map');
  if (!canvas || !world) return;
  lastMapProjection = drawFieldMap(canvas, world, mapView);
  canvas.setAttribute('aria-label', describeFieldMap(world));
}

function mapPanel() {
  if (!world || world.dialogue || world.ending || world.sequence) return;
  if (panel === 'map') {
    returnFromPanel();
    return;
  }
  if (panel) return;
  act(world, 'map');
  const toolbar = document.createElement('div');
  toolbar.className = 'map-toolbar';
  const zoomGroup = document.createElement('div');
  zoomGroup.className = 'map-toolbar-group';
  const pinGroup = document.createElement('div');
  pinGroup.className = 'map-toolbar-group';
  const clearPinBtn = button('Clear pin', () => {
    world.waypoint = null;
    display(clearPinBtn, false);
    drawMap();
    refreshHUD();
    save();
  });
  display(clearPinBtn, Boolean(world.waypoint));
  zoomGroup.append(
    button('Zoom +', () => {
      mapView.zoom = clamp(mapView.zoom + 0.55, 1, 3.2);
      drawMap();
    }),
    button('Zoom −', () => {
      mapView.zoom = clamp(mapView.zoom - 0.55, 1, 3.2);
      if (mapView.zoom <= 1.02) {
        mapView.panX = 0;
        mapView.panY = 0;
      }
      drawMap();
    }),
    button('Center', () => {
      mapView.zoom = 1;
      mapView.panX = 0;
      mapView.panY = 0;
      drawMap();
    })
  );
  pinGroup.append(clearPinBtn);
  toolbar.append(zoomGroup, pinGroup);

  const canvas = document.createElement('canvas');
  canvas.id = 'field-map';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', describeFieldMap(world));

  let dragId = null,
    dragStartX = 0,
    dragStartY = 0,
    dragLastX = 0,
    dragLastY = 0,
    dragMoved = false;
  canvas.addEventListener('pointerdown', (ev) => {
    dragId = ev.pointerId;
    dragStartX = dragLastX = ev.clientX;
    dragStartY = dragLastY = ev.clientY;
    dragMoved = false;
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {}
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (dragId !== ev.pointerId || !lastMapProjection) return;
    const dx = ev.clientX - dragLastX,
      dy = ev.clientY - dragLastY;
    if (Math.hypot(ev.clientX - dragStartX, ev.clientY - dragStartY) > 6) dragMoved = true;
    if (dragMoved && mapView.zoom > 1.01) {
      mapView.panX -= dx / lastMapProjection.scale;
      mapView.panY += dy / lastMapProjection.scale;
      drawMap();
    }
    dragLastX = ev.clientX;
    dragLastY = ev.clientY;
  });
  canvas.addEventListener('pointerup', (ev) => {
    if (dragId !== ev.pointerId) return;
    dragId = null;
    if (!dragMoved && lastMapProjection) {
      const rect = canvas.getBoundingClientRect();
      const [wx, wz] = lastMapProjection.world(ev.clientX - rect.left, ev.clientY - rect.top);
      world.waypoint = { x: Math.round(wx), z: Math.round(wz) };
      display(clearPinBtn, true);
      drawMap();
      refreshHUD();
      save();
    }
  });
  canvas.addEventListener('pointercancel', () => {
    dragId = null;
  });

  const legend = document.createElement('div');
  legend.className = 'map-key';
  for (const [label, color] of [
    ['You', '#fff4d0'],
    ...(world.knowsRoad ? [['Castle road', '#ddbb79']] : []),
    ...(world.hasMap ? [['Pale trail', '#c8e1bf']] : []),
    ...(world.milestones.ridge ? [['The host', '#c78f77']] : []),
    ['Pin (click map)', '#f0c86d'],
  ]) {
    const item = document.createElement('span');
    item.style.setProperty('--key-color', color);
    item.textContent = label;
    legend.append(item);
  }
  const hud = getHUD(world);
  modal(
    'map',
    '',
    world.hasMap ? 'The inked map' : 'Field map',
    [
      toolbar,
      canvas,
      legend,
      paragraph(
        hud.location +
          ' · ' +
          Math.round(hud.distance) +
          ' m by path to ' +
          (world.hasMap && !world.antidote ? 'the Moonwell.' : 'Princess Xero.') +
          ' Tap or click the chart to set a compass waypoint.',
        'field-note'
      ),
    ],
    [button('Fold map', returnFromPanel)],
    { keepSprint: true }
  );
  drawMap();
}
$('map-button').addEventListener('click', mapPanel);

function journalPanel() {
  if (!world || world.dialogue || world.ending || world.sequence) return;
  if (panel === 'journal') {
    returnFromPanel();
    return;
  }
  const entries = Array.isArray(world.journal) ? world.journal : [];
  const body = [];
  if (!entries.length) {
    body.push(
      paragraph('No notes yet. Landmarks, inscriptions, and discoveries along your journey are recorded here.')
    );
  } else {
    const list = document.createElement('div');
    list.className = 'journal-list';
    for (const item of [...entries].reverse()) {
      const card = document.createElement('article');
      card.className = 'journal-entry';
      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      const p = document.createElement('p');
      p.textContent = item.text;
      card.append(h3, p);
      list.append(card);
    }
    body.push(list);
  }
  modal(
    'journal',
    'Field journal',
    'Notes along the way',
    body,
    [button('Close journal', returnFromPanel)],
    { keepSprint: true }
  );
}
$('journal-button').addEventListener('click', journalPanel);

function syncStory() {
  if (!world) return;
  saveCrossroadsIfReady();
  if (world.ending && endingRef !== world.ending) {
    const ending = world.ending;
    endingRef = ending;
    recordEnding(ending.id);
    const actions = [button('Begin anew', () => start(false), 'primary')];
    if (ending.id !== 'saved')
      actions.push(
        button('Return to checkpoint', () => {
          world = resumeCheckpoint(world);
          world.reducedMotion = options.reduceMotion;
          needsFrame = true;
          dismiss();
          refreshHUD();
          save();
        })
      );
    if (loadJourney(crossroadsKey)) {
      actions.push(button('Return to crossroads', () => start('crossroads')));
    }
    actions.push(button('Title screen', goHome));
    modal('ending', 'Journey’s end', ending.title, [paragraph(ending.text)], actions, { closable: false });
    save();
    return;
  }
  if (world.dialogue && dialogueRef !== world.dialogue) {
    const d = world.dialogue;
    dialogueRef = d;
    const paragraphs = [];
    if (d.question) paragraphs.push(paragraph('Zelda: “' + d.question + '”', 'question'));
    if (d.kind === 'witch') {
      for (const s of d.text.split(/\s+(?=Option number (?:one|two|three))/)) paragraphs.push(paragraph(s));
    } else paragraphs.push(paragraph(d.text));
    const actions = d.choices.map((c, i) => {
      const b = button(
        c.label,
        () => {
          choose(world, c.id);
          dismiss();
          syncStory();
          refreshHUD();
          save();
        },
        'choice'
      );
      b.dataset.choiceIndex = String(i + 1);
      const sign = document.createElement('b');
      sign.setAttribute('aria-hidden', 'true');
      sign.textContent = ['I', 'II', 'III'][i] || '';
      b.prepend(sign);
      return b;
    });
    if (!actions.length) actions.push(button('Continue', returnFromPanel, 'primary'));
    modal('dialogue', d.kind === 'witch' ? 'Lanternwood' : '', d.speaker, paragraphs, actions, {
      closable: true,
    });
    save();
  }
}

function compassDirection(angle) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
}

function refreshHUD() {
  if (!world) return;
  display($('hud'), !world.sequence);
  const h = getHUD(world),
    healthEl = $('health'),
    old = healthEl.getAttribute('aria-valuenow');
  if (old !== String(h.health) || healthEl.childElementCount !== h.maxHealth) {
    healthEl.replaceChildren();
    for (let i = 0; i < h.maxHealth; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart' + (i < h.health ? '' : ' empty');
      heart.textContent = i < h.health ? '♥' : '♡';
      heart.setAttribute('aria-hidden', 'true');
      healthEl.append(heart);
    }
    healthEl.setAttribute('aria-valuenow', String(h.health));
    healthEl.setAttribute('aria-valuemax', String(h.maxHealth));
  }
  const staminaEl = $('stamina'),
    staminaFill = $('stamina-fill');
  if (staminaEl && staminaFill) {
    const pct = clamp((h.stamina / (h.maxStamina || 100)) * 100, 0, 100);
    staminaFill.style.width = pct.toFixed(1) + '%';
    staminaEl.setAttribute('aria-valuenow', String(h.stamina));
    staminaEl.classList.toggle('exhausted', world.elapsed < (world.player.exhaustedUntil || 0));
  }
  const vialBadge = $('vial-badge');
  if (vialBadge) {
    display(vialBadge, Boolean(h.hasVial));
    vialBadge.classList.toggle('filled', Boolean(h.antidote));
    text('vial-label', h.antidote ? 'Silver Moonwater' : 'Empty Vial');
  }
  const reticle = $('reticle');
  if (reticle) {
    reticle.classList.toggle('in-range', Boolean(h.inSwordRange) && !h.guarding);
    reticle.classList.toggle('guarding', Boolean(h.guarding));
  }
  $('guard-button')?.setAttribute('aria-pressed', String(Boolean(h.guarding)));

  text('heading', compassDirection(world.player.yaw));
  const goalEl = $('compass-goal');
  if (goalEl) {
    if (world.waypoint) {
      const wx = world.waypoint.x - world.player.x,
        wz = world.waypoint.z - world.player.z,
        wd = Math.round(Math.hypot(wx, wz));
      if (wd < 10) {
        world.waypoint = null;
        display(goalEl, false);
      } else {
        goalEl.textContent = `Pin ${compassDirection(Math.atan2(wx, wz))} · ${wd}m`;
        goalEl.classList.remove('urgent');
        display(goalEl, true);
      }
    } else if (!h.gateCrossed && world.route !== 'wander' && h.hordeProgress > 0.68) {
      goalEl.textContent = h.hordeProgress > 0.86 ? 'Host at the gate' : 'Host closing in';
      goalEl.classList.add('urgent');
      display(goalEl, true);
    } else {
      display(goalEl, false);
    }
  }

  text('location', h.location);
  text('objective', h.objective);
  text('notice', h.notice);
  text('potion-count', 'Cinder · ' + h.potions);
  text('interact-hint', h.hint);
  display($('interact-hint'), Boolean(h.hint));
}

function gameAction(action) {
  if (screen !== 'game' || panel) return;
  act(world, action);
  syncStory();
  refreshHUD();
  save();
}
$('interact-hint').addEventListener('click', () => gameAction('interact'));

document.querySelectorAll('[data-act]').forEach((b) => {
  const actName = b.dataset.act;
  if (actName === 'guard') {
    b.addEventListener('pointerdown', (ev) => {
      if (screen !== 'game' || panel) return;
      ev.preventDefault();
      guardHeld = true;
      gameAction('guard');
    });
    const endGuard = () => {
      if (!guardHeld) return;
      guardHeld = false;
      if (world) act(world, 'unguard');
      refreshHUD();
    };
    b.addEventListener('pointerup', endGuard);
    b.addEventListener('pointercancel', endGuard);
    b.addEventListener('pointerleave', endGuard);
    return;
  }
  if (actName === 'strike') {
    b.addEventListener('pointerdown', (ev) => {
      if (screen !== 'game' || panel) return;
      swordLongPressed = false;
      clearTimeout(swordHoldTimer);
      swordHoldTimer = setTimeout(() => {
        swordLongPressed = true;
        gameAction('thrust');
      }, 240);
      ev.stopPropagation();
    });
    b.addEventListener('pointerup', () => {
      clearTimeout(swordHoldTimer);
      if (!swordLongPressed) gameAction('strike');
      swordLongPressed = false;
    });
    b.addEventListener('pointercancel', () => {
      clearTimeout(swordHoldTimer);
      swordLongPressed = false;
    });
    return;
  }
  b.addEventListener('click', () => gameAction(actName));
});

$('sprint').addEventListener('click', () => {
  sprint = !sprint;
  $('sprint').setAttribute('aria-pressed', String(sprint));
});

function frame(timestamp) {
  if (!running || screen !== 'game') return;
  const now = timestamp / 1000,
    dt = clamp(now - lastTime, 0, 0.35);
  lastTime = now;
  if (!document.hidden) {
    if (!panel) {
      const pitchKey =
        Number(keys.has('KeyI') || keys.has('PageUp')) - Number(keys.has('KeyK') || keys.has('PageDown'));
      if (pitchKey) {
        world.player.pitch = clamp(world.player.pitch + pitchKey * 1.45 * dt, -1.03, 1.04);
      }
      tick(world, dt, {
        forward:
          movement.forward +
          Number(keys.has('KeyW') || keys.has('ArrowUp')) -
          Number(keys.has('KeyS') || keys.has('ArrowDown')),
        strafe: movement.strafe + Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        turn: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
        sprint: sprint || keys.has('ShiftLeft') || keys.has('ShiftRight'),
      });
      audio.update(world);
    }
    for (const ev of world.events.splice(0)) {
      audio.cue(ev);
      if (ev.type === 'hurt' && !options.reduceMotion) {
        const damage = $('damage');
        damage.style.opacity = '1';
        clearTimeout(damageTimer);
        damageTimer = setTimeout(() => (damage.style.opacity = '0'), 160);
      }
    }
    if (!panel || needsFrame) {
      try {
        renderer.render(world, world.elapsed);
        needsFrame = false;
      } catch (error) {
        console.error('Forest rendering failed', error);
        graphicsError();
        return;
      }
    }
    if (now - lastHUD > 0.1) {
      refreshHUD();
      lastHUD = now;
    }
    syncStory();
    if (!panel && now - lastSave > 4) {
      save();
      lastSave = now;
    }
  }
  frameId = requestAnimationFrame(frame);
}

function moveLook(dx, dy) {
  if (!world || panel || world.sequence) return;
  const scale = 0.0031 * options.sensitivity;
  world.player.yaw = (world.player.yaw + dx * scale) % (Math.PI * 2);
  world.player.pitch = clamp(world.player.pitch - dy * scale, -1.03, 1.04);
}

view.addEventListener('contextmenu', (event) => event.preventDefault());

view.addEventListener('pointerdown', (event) => {
  if (panel) return;
  view.focus({ preventScroll: true });
  if (event.button === 2) {
    event.preventDefault();
    guardHeld = true;
    gameAction('guard');
    return;
  }
  if (event.button !== 0 || lookId !== null) return;
  if (event.pointerType === 'mouse' && document.pointerLockElement === view) {
    gameAction(event.shiftKey ? 'thrust' : 'strike');
    return;
  }
  if (event.pointerType === 'mouse' && view.requestPointerLock) {
    try {
      const req = view.requestPointerLock();
      req?.catch?.(() => {});
    } catch {
      /* Drag-to-look remains available. */
    }
  }
  lookId = event.pointerId;
  lookX = lookDownX = event.clientX;
  lookY = lookDownY = event.clientY;
  lookDownAt = performance.now();
  lookMoved = false;
  try {
    view.setPointerCapture(event.pointerId);
  } catch {}
});
view.addEventListener('pointermove', (event) => {
  if (lookId !== event.pointerId || document.pointerLockElement === view) return;
  if (Math.hypot(event.clientX - lookDownX, event.clientY - lookDownY) > 7) lookMoved = true;
  moveLook(event.clientX - lookX, event.clientY - lookY);
  lookX = event.clientX;
  lookY = event.clientY;
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === view) moveLook(event.movementX, event.movementY);
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === view) {
    ignoreUnlock = false;
    lookId = null;
    return;
  }
  if (ignoreUnlock) {
    ignoreUnlock = false;
    return;
  }
  if (screen === 'game' && !panel) pause();
});

function moveStick(event) {
  const r = $('stick').getBoundingClientRect(),
    radius = r.width * 0.39;
  const dx = event.clientX - r.left - r.width / 2,
    dy = event.clientY - r.top - r.height / 2;
  const length = Math.max(radius, Math.hypot(dx, dy));
  movement.strafe = dx / length;
  movement.forward = -dy / length;
  $('stick').firstElementChild.style.transform =
    'translate(' + movement.strafe * radius * 0.71 + 'px,' + -movement.forward * radius * 0.71 + 'px)';
}
$('stick').addEventListener('pointerdown', (event) => {
  if (stickId !== null || panel) return;
  stickId = event.pointerId;
  $('stick').setPointerCapture(stickId);
  moveStick(event);
});
$('stick').addEventListener('pointermove', (event) => {
  if (stickId === event.pointerId) moveStick(event);
});

function stopPointer(event) {
  if (event.button === 2 && guardHeld) {
    guardHeld = false;
    if (world) act(world, 'unguard');
    refreshHUD();
  }
  if (stickId === event.pointerId) {
    stickId = null;
    movement.strafe = movement.forward = 0;
    $('stick').firstElementChild.style.transform = '';
  }
  if (lookId === event.pointerId) {
    const isQuickClick =
      event.type === 'pointerup' &&
      event.pointerType === 'mouse' &&
      !lookMoved &&
      performance.now() - lookDownAt < 190 &&
      document.pointerLockElement !== view;
    lookId = null;
    if (isQuickClick) gameAction(event.shiftKey ? 'thrust' : 'strike');
  }
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
  document.addEventListener(type, stopPointer, true);

document.addEventListener('keydown', (event) => {
  if (panel) {
    if (event.code === 'Escape') {
      event.preventDefault();
      returnFromPanel();
      return;
    }
    if (panel === 'map' && event.code === 'KeyM') {
      event.preventDefault();
      returnFromPanel();
      return;
    }
    if (panel === 'journal' && event.code === 'KeyJ') {
      event.preventDefault();
      returnFromPanel();
      return;
    }
    if (panel === 'dialogue' && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
      const idx = event.code.slice(-1);
      const btn = $('panel-actions')?.querySelector(`[data-choice-index="${idx}"]`);
      if (btn) {
        event.preventDefault();
        btn.click();
        return;
      }
    }
    if (event.key === 'Tab') {
      const focus = [...$('panel').querySelectorAll('button:not([hidden]),input')];
      if (!focus.length) return;
      const first = focus[0],
        last = focus[focus.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === $('panel-title'))
      ) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
    return;
  }
  if (screen !== 'game') {
    if (
      (event.code === 'Enter' || event.code === 'Space') &&
      !event.repeat &&
      [document.body, title].includes(document.activeElement)
    ) {
      event.preventDefault();
      start();
    }
    return;
  }
  if (event.code === 'KeyR') {
    event.preventDefault();
    if (!event.repeat) {
      guardHeld = true;
      gameAction('guard');
    }
    return;
  }
  const commands = {
    KeyM: mapPanel,
    KeyJ: journalPanel,
    Escape: pause,
    KeyE: () => gameAction('interact'),
    KeyF: () => gameAction(event.shiftKey ? 'thrust' : 'strike'),
    KeyV: () => gameAction('thrust'),
    Space: () => gameAction('dodge'),
    KeyQ: () => gameAction('potion'),
  };
  if (commands[event.code]) {
    event.preventDefault();
    if (!event.repeat) commands[event.code]();
    return;
  }
  if (
    [
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyI',
      'KeyK',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ].includes(event.code)
  ) {
    event.preventDefault();
    keys.add(event.code);
  }
});
document.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  if (event.code === 'KeyR' && guardHeld) {
    guardHeld = false;
    if (world) act(world, 'unguard');
    refreshHUD();
  }
});

// Clear held inputs on blur without auto-pausing (prevents stalls in embedded previews / automation).
window.addEventListener('blur', () => {
  stopMotion({ keepSprint: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopMotion();
    save();
    if (screen === 'game' && !panel) pause();
  }
  lastTime = performance.now() / 1000;
  soundState();
});
window.addEventListener('pagehide', save);
window.addEventListener('resize', () => {
  needsFrame = true;
  if (screen === 'game') renderer?.resize();
  if (panel === 'map') drawMap();
});
view.addEventListener('webglcontextlost', (event) => {
  // The renderer switches to canvas drawing. Keep the simulation and its checkpoint.
  event.preventDefault();
  needsFrame = true;
  stopMotion();
  save();
  if (screen === 'game' && !panel) pause();
});
view.addEventListener('webglcontextrestored', () => {
  try {
    renderer?.dispose();
    renderer = null;
    if (screen === 'game') {
      renderer = createView(view);
      renderer.resize();
      needsFrame = true;
    }
  } catch {
    graphicsError();
  }
});

updateStart();
soundState();
syncBodyState();

if (new URLSearchParams(location.search).get('autostart') === '1') {
  start(false);
}
