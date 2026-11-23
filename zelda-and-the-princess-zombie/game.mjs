import { selectedItem, quickItem, quickItemActions, availableQuickItems } from './inventory.mjs';
import { makeBagView } from './bag-view.mjs';
import { mountNumberPad } from './number-pad.mjs';
import { touchKeys, assignTouchKey, touchKeyIcon, touchActionNames, createTouchRun } from './touch-keys.mjs';
import { createFieldCheck } from './field-check.mjs';
import { witchVignette } from './story-witch.mjs';
import {
  actionNames,
  fieldAction,
  toolsGesture,
  utilityActions,
  keyLabel,
  slotNames,
  keyChoices,
  keypadChoices,
  keypadLabel,
  rebindKeypad,
  controlLayout,
  moveTouchAction,
  rebind,
  actionForKey,
} from './control-layout.mjs';
import { createFieldKeyboard, isHeldAction } from './field-keyboard.mjs';
import { advanceGameClock, presentationWorld, resetPresentation } from './game-clock.mjs';
import { makeFieldSurvey } from './map-controls.mjs';
import { hasDirections, compassPoint, bearing, describeRace, survey, bridgeReport } from './navigation.mjs';
import {
  saveKey,
  settingsKey,
  read,
  write,
  restoreJourney,
  lasting,
  newRun,
  rememberFork,
  recallFork,
  hasFork,
  rememberEnding,
  pastJourneys,
  retryPending,
  journeyFile,
  readJourneyFile,
  applyJourneyFile,
} from './journey-store.mjs';
import { createWorld, act, choose, getHUD, resumeCheckpoint, hordePosition, arrivalView } from './world.mjs';
import { createAudio } from './audio.mjs';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function loadJourney() {
  return restoreJourney(read(saveKey));
}
const preferences = read(settingsKey) || {};
const touchRun = createTouchRun();
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const validMix = (v) => (Number.isFinite(v) ? clamp(v, 0, 1) : 1);
const options = {
  layout: controlLayout(preferences.layout),
  touchKeys: touchKeys(preferences.touchKeys),
  controlStyle: preferences.controlStyle === 'classic' ? 'classic' : 'compact',
  handedness: (preferences.handedness ? preferences.handedness === 'left' : preferences.leftHanded)
    ? 'left'
    : 'right',
  stickSize: ['small', 'standard', 'large'].includes(preferences.stickSize)
    ? preferences.stickSize
    : preferences.largeTouch
      ? 'large'
      : 'standard',
  stickHeight: ['low', 'raised'].includes(preferences.stickHeight) ? preferences.stickHeight : 'low',
  quality: ['low', 'auto', 'high'].includes(preferences.quality) ? preferences.quality : 'auto',
  subtitles: preferences.subtitles !== false,
  mix: {
    music: validMix(
      preferences.mix?.music ?? (preferences.musicVolume ?? 1) * (preferences.masterVolume ?? 1)
    ),
    effects: validMix(
      preferences.mix?.effects ?? (preferences.sfxVolume ?? 1) * (preferences.masterVolume ?? 1)
    ),
    ambience: validMix(preferences.mix?.ambience ?? preferences.masterVolume),
  },
  sound: preferences.sound !== false,
  sensitivity: clamp(Number(preferences.sensitivity) || 1, 0.4, 2),
  reduceMotion:
    typeof preferences.reduceMotion === 'boolean' ? preferences.reduceMotion : motionQuery.matches,
};
motionQuery.addEventListener?.('change', (event) => {
  if (typeof read(settingsKey)?.reduceMotion === 'boolean') return;
  options.reduceMotion = event.matches;
  if (world) world.reducedMotion = event.matches;
});
const keyboard = createFieldKeyboard();
const movement = { forward: 0, strafe: 0 };
const view = $('view'),
  stage = $('stage'),
  title = $('title-screen'),
  overlay = $('overlay');
const audio = createAudio(),
  fieldCheck = createFieldCheck();
let activeSurvey = null,
  accumulator = 0,
  captionTimer = 0,
  bellTimer = 0,
  sprintBeforeMap = false,
  panelReturn = '',
  helpFromField = false,
  bindingsFromGuide = false,
  panelSprint = false,
  rimSprint = false,
  fieldInputEpoch = 0,
  paletteOpen = false;
function setPalette(open) {
  paletteOpen = open && options.controlStyle === 'compact';
  if (paletteOpen) setNumberPad(false);
  document.body.dataset.palette = paletteOpen ? 'open' : 'closed';
  $('quick-tools').setAttribute('aria-expanded', String(paletteOpen));
}
function applyPreferences() {
  document.body.dataset.controls = options.controlStyle;
  setPalette(false);
  document.body.dataset.hand = options.handedness;
  document.body.dataset.stick = options.stickSize;
  document.body.dataset.stickHeight = options.stickHeight;
  refreshTouchKeys();
  function describeKey(button, id) {
    const primary = keyLabel(options.layout.keys[id]);
    const number = options.layout.keypad[id];
    const digit = number === 'NumpadDecimal' ? '.' : number?.slice(-1);
    const fallback = actionNames[id] || utilityActions[id];
    const legend = [primary, keypadLabel(number)].filter(Boolean).join(' · ');
    button.title = fallback + ' (' + legend + ')';
    button.setAttribute('aria-keyshortcuts', [primary, digit].filter(Boolean).join(' '));
    const badge = button.querySelector('kbd');
    if (badge) badge.textContent = primary;
  }
  for (const [order, id] of options.layout.slots.entries()) {
    const action = id === 'run' ? $('sprint') : document.querySelector('[data-act="' + id + '"]');
    action.style.order = order;
    describeKey(action, id);
  }
  const bindings = { bag: 'bag-button', map: 'map-button', tools: 'quick-tools' };
  for (const [action, id] of Object.entries(bindings)) describeKey($(id), action);
  describeKey(document.querySelector('[data-act="dodge"]'), 'dodge');
  audio.setMix?.(options.mix);
  if (world) {
    world.renderQuality = options.quality;
    world.reducedMotion = options.reduceMotion;
  }
}
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
  stickId = null,
  lookId = null,
  lookX = 0,
  lookY = 0;
let lastFocus = null,
  damageTimer = 0,
  ignoreUnlock = false,
  showingLoad = false;
function display(node, visible) {
  node.hidden = !visible;
}
function text(nodeId, value) {
  const node = $(nodeId);
  if (node.textContent !== value) node.textContent = value;
}
function icon(name) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    use = document.createElementNS(el.namespaceURI, 'use');
  el.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', location.pathname + '#' + name);
  el.append(use);
  return el;
}
// Fragment-only sprite links retain the current document on both clean URL forms.
document
  .querySelectorAll('use[href^="#"]')
  .forEach((use) => use.setAttribute('href', location.pathname + use.getAttribute('href')));
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
function stopMotion() {
  setNumberPad(false);
  fieldInputEpoch++;
  setPalette(false);
  rimSprint = false;
  stopTool();
  keyboard.reset();
  movement.forward = 0;
  movement.strafe = 0;
  stickId = null;
  lookId = null;
  $('stick').firstElementChild.style.transform = '';
  touchRun.reset();
  $('sprint').setAttribute('aria-pressed', 'false');
}
function save() {
  if (!world || showingLoad) return;
  if (!world.runId) world.runId = newRun();
  survey(world);
  const ok = write(saveKey, { ...world, events: [], mapOpen: false });
  if (screen === 'game')
    text('storage-status', ok && lasting() ? '' : 'Saving is unavailable. This journey stays in this tab.');
  return ok;
}
const listeningPanels = new Set(['dialogue', 'map', 'bag', 'journal', 'preferences']);
function soundState() {
  $('title-sound').replaceChildren(
    icon(options.sound ? 'sound' : 'mute'),
    Object.assign(document.createElement('span'), { textContent: options.sound ? 'Sound on' : 'Sound off' })
  );
  $('title-sound').setAttribute('aria-pressed', String(options.sound));
  audio.setMix(panel === 'device' ? { ...options.mix, music: 0, ambience: 0 } : options.mix);
  audio.setEnabled(
    Boolean(
      options.sound &&
        screen === 'game' &&
        !document.hidden &&
        (!panel || listeningPanels.has(panel) || panel === 'ending' || panel === 'device')
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
function modal(name, kicker, heading, body, actions, { closable = true } = {}) {
  if (!panel) lastFocus = document.activeElement;
  fieldCheck.pause();
  stopMotion();
  panel = name;
  releaseLook();
  display(overlay, true);
  overlay.classList.toggle('bag-open', name === 'bag');
  title.inert = screen === 'title';
  stage.inert = screen === 'game';
  $('panel').classList.toggle('map-panel', name === 'map');
  $('panel').classList.toggle('bag-panel', name === 'bag');
  const portrait =
    name === 'dialogue' && world?.dialogue?.speaker === 'The witch' && world.dialogue.kind !== 'witch';
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
}
function dismiss() {
  display(overlay, false);
  panel = '';
  title.inert = false;
  stage.inert = false;
  dialogueRef = null;
  endingRef = null;
  lastTime = performance.now() / 1000;
  accumulator = 0;
  resetPresentation(world);
  stopMotion();
  soundState();
  const focusNode =
    screen === 'game'
      ? view
      : lastFocus?.isConnected && !lastFocus.closest('[hidden]')
        ? lastFocus
        : $('start');
  focusNode?.focus({ preventScroll: true });
}
function returnFromPanel() {
  if (panel === 'binding' && bindingsFromPad) {
    bindingsFromPad = false;
    dismiss();
    setNumberPad(true);
    $('assign-number-keys').focus({ preventScroll: true });
    return;
  }
  if (panel === 'touch-keys') {
    if (touchKeysReturn === 'binding') bindingsPanel();
    else if (touchKeysReturn === 'preferences') preferencesPanel();
    else if (touchKeysReturn === 'help') controls();
    else dismiss();
    return;
  }
  if (panel === 'binding' && bindingsFromGuide) {
    bindingsFromGuide = false;
    controls();
    return;
  }
  if (panel === 'binding' || panel === 'device') {
    preferencesPanel();
    return;
  }
  if (panel === 'load-confirm') {
    saveFiles();
    return;
  }
  if (panel === 'files') {
    if (screen === 'game') {
      if (world?.ending) {
        dismiss();
        syncStory();
      } else pause();
    } else dismiss();
    return;
  }
  if (panel === 'history') {
    dismiss();
    if (world?.ending) syncStory();
    else if (screen === 'game') pause();
    return;
  }
  if (panel === 'bag' || panel === 'journal') {
    if (panelReturn === 'pause') {
      panelReturn = '';
      pause();
    } else {
      dismiss();
      setTouchRun(panelSprint);
    }
    return;
  }
  if (panel === 'preferences' || panel === 'fork') {
    if (world?.ending) {
      dismiss();
      syncStory();
    } else pause();
    return;
  }
  if (panel === 'help') {
    if (helpFromField || screen !== 'game') dismiss();
    else pause();
    return;
  }
  if (panel === 'restart') {
    screen === 'game' ? pause() : dismiss();
    return;
  }
  if (panel === 'map') {
    act(world, 'close');
    activeSurvey = null;
    dismiss();
    setTouchRun(sprintBeforeMap);
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
  if (panel !== 'binding') helpFromField = screen === 'game' && !panel;
  const touch = paragraph(
    'Tap Run to run forward and tap it again to stop, or hold it and release to stop. Steer with the stick or drag the view. Tap Sword to cut while running. Drag from Sword to aim, or hold and release for a thrust.'
  );
  const tools = paragraph(
    'Tap Tools to open the Number pad or assign an action to either thumb. Hold Tools to open the bag. You can give a carried item its own number key in the bag.',
    'field-note'
  );
  const table = document.createElement('div');
  table.className = 'key-table';
  const pairs = [
    ['Move / turn', 'W A S D / arrows'],
    [
      'Sprint while steering',
      'Double-tap W or ↑, holding the second press. Shift also sprints while moving.',
    ],
    ['Walk slowly', 'Alt while moving'],
    ['Look up / down', 'Page Up / Page Down'],
    ...Object.entries({ ...actionNames, ...utilityActions }).map(([id, name]) => [
      name,
      [keyLabel(options.layout.keys[id]), keypadLabel(options.layout.keypad[id])].filter(Boolean).join(' · '),
    ]),
    ...Object.entries(quickItemActions)
      .filter(([id]) => options.layout.keypad[id])
      .map(([id, name]) => [
        world ? quickItem(world, id).name : name,
        keypadLabel(options.layout.keypad[id]),
      ]),
    ['Dialogue choices', '1, 2, 3…'],
    ['Pause', 'Esc'],
  ];
  for (const pair of pairs)
    for (const label of pair) {
      const cell = document.createElement('span');
      cell.textContent = label;
      table.append(cell);
    }
  const keys = paragraph(
    'Hold ' +
      keyLabel(options.layout.keys.run) +
      ' to run forward. Press ' +
      keyLabel(options.layout.keys.strike) +
      ' while holding it to swing. Number keys and their keypad equivalents share assignments during play.'
  );
  modal(
    'help',
    'Field guide',
    'How to play',
    [touch, tools, keys, table],
    [
      button('Assign keys', () => {
        bindingsFromGuide = true;
        bindingsPanel();
      }),
      button('Back', returnFromPanel),
    ]
  );
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
function pause() {
  if (!world || world.ending) return;
  save();
  const actions = [
    button(
      'Resume',
      () => {
        audio.unlock();
        dismiss();
      },
      'primary'
    ),
    button('Traveller’s bag', bagPanel),
    button('Journal', journalPanel),
    button('Save files', saveFiles),
    button('Settings', preferencesPanel),
    button('How to play', controls),
    button('Title screen', goHome),
  ];
  if (hasFork(world)) actions.push(button('Return to the forest fork', confirmFork));
  actions.push(button('Begin anew', confirmNew));
  modal(
    'pause',
    getHUD(world).location,
    'Journey paused',
    [
      paragraph(
        lasting()
          ? 'Progress saved on this device.'
          : 'Saving is unavailable. This journey stays in this tab.',
        'field-note'
      ),
    ],
    actions
  );
}
$('pause-button').addEventListener('click', pause);
function preferencesPanel() {
  const rows = [];
  function setting(label, input) {
    const row = document.createElement('label');
    row.className = 'setting';
    row.append(label, input);
    rows.push(row);
  }
  function changed() {
    applyPreferences();
    write(settingsKey, options);
    needsFrame = true;
  }
  function check(label, value, change) {
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = value;
    i.onchange = () => {
      change(i.checked);
      changed();
    };
    setting(label, i);
  }
  function range(label, value, max, min, step, change) {
    const i = document.createElement('input');
    i.type = 'range';
    i.min = min;
    i.max = max;
    i.step = step;
    i.value = value;
    i.oninput = () => {
      change(Number(i.value));
      changed();
    };
    setting(label, i);
  }
  function select(label, key, choices) {
    const i = document.createElement('select');
    for (const [value, name] of choices) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = name;
      i.append(o);
    }
    i.value = options[key];
    i.onchange = () => {
      options[key] = i.value;
      changed();
    };
    setting(label, i);
  }
  check('Sound', options.sound, (v) => {
    options.sound = v;
    if (v) audio.unlock();
    soundState();
  });
  for (const [key, name] of [
    ['music', 'Music'],
    ['effects', 'Effects'],
    ['ambience', 'Ambience'],
  ])
    range(name, options.mix[key], 1, 0, 0.05, (v) => (options.mix[key] = v));
  check('Sound captions', options.subtitles, (v) => (options.subtitles = v));
  check('Reduce camera motion', options.reduceMotion, (v) => (options.reduceMotion = v));
  range('Look sensitivity', options.sensitivity, 2, 0.4, 0.1, (v) => (options.sensitivity = v));
  select('Graphics', 'quality', [
    ['auto', 'Adaptive'],
    ['low', 'Battery saver'],
    ['high', 'High detail'],
  ]);
  select('Field controls', 'controlStyle', [
    ['compact', 'Compact master keys'],
    ['classic', 'Expanded buttons'],
  ]);
  select('Movement thumb', 'handedness', [
    ['right', 'Left thumb'],
    ['left', 'Right thumb'],
  ]);
  select('Joystick size', 'stickSize', [
    ['small', 'Small'],
    ['standard', 'Standard'],
    ['large', 'Large'],
  ]);
  select('Joystick position', 'stickHeight', [
    ['low', 'Lower'],
    ['raised', 'Raised'],
  ]);
  const actions = [
    button('Back', returnFromPanel, 'primary'),
    button('Arrange controls', bindingsPanel),
    button('Assign touch keys', touchKeysPanel),
    button('Device check', devicePanel),
  ];
  if (view.requestPointerLock)
    actions.push(
      button('Capture mouse', () => {
        dismiss();
        try {
          view.requestPointerLock()?.catch?.(() => {});
        } catch {}
      })
    );
  if (document.fullscreenEnabled)
    actions.push(button(document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen', openFullscreen));
  modal('preferences', '', 'Settings', rows, actions);
}
let touchKeysReturn = '';
function touchKeysPanel() {
  touchKeysReturn = panel;
  const group = document.createElement('div');
  group.className = 'touch-bindings';
  const selects = {};
  const inventoryWorld = world || loadJourney();
  const owned = new Set(availableQuickItems(inventoryWorld));
  for (const [side, name] of [
    ['movement', 'Movement-side key'],
    ['action', 'Action-side key'],
  ]) {
    const label = document.createElement('label');
    const select = document.createElement('select');
    select.setAttribute('aria-label', name);
    for (const [id, title] of Object.entries(touchActionNames)) {
      if (id.startsWith('item:') && !owned.has(id) && !Object.values(options.touchKeys).includes(id))
        continue;
      const option = document.createElement('option');
      option.value = id;
      option.textContent =
        inventoryWorld && id.startsWith('item:') ? quickItem(inventoryWorld, id).name : title;
      select.append(option);
    }
    selects[side] = select;
    select.value = options.touchKeys[side];
    select.onchange = () => {
      assignTouchKey(options.touchKeys, side, select.value);
      for (const [key, el] of Object.entries(selects)) el.value = options.touchKeys[key];
      refreshTouchKeys();
      write(settingsKey, options);
    };
    label.append(name, select);
    group.append(label);
  }
  modal(
    'touch-keys',
    '',
    'Assign touch keys',
    [
      paragraph(
        'Choose what each thumb can use directly. Assigning the same action to the other side swaps the keys. Items you carry can be pinned to either side.',
        'field-note'
      ),
      group,
    ],
    [
      button('Back', returnFromPanel, 'primary'),
      button('Restore Run and Sword', () => {
        options.touchKeys = touchKeys();
        for (const [key, el] of Object.entries(selects)) el.value = options.touchKeys[key];
        refreshTouchKeys();
        write(settingsKey, options);
      }),
    ]
  );
}
function devicePanel() {
  const content = document.createElement('div');
  modal('device', '', 'Device check', [content], [button('Back', returnFromPanel)]);
  fieldCheck.mount(content, {
    resume: () => {
      audio.unlock();
      dismiss();
    },
    playExample: (id) => options.sound && audio.preview(id),
  });
}
function bindingsPanel() {
  const group = document.createElement('div');
  group.className = 'binding-rows';
  const rows = [];
  function menu(values, changed, label) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    for (const [value, text] of values) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.onchange = () => {
      changed(select.value);
      refresh();
      applyPreferences();
      write(settingsKey, options);
    };
    return select;
  }
  function refresh() {
    for (const { id, position, key, keypad } of rows) {
      if (position) position.value = String(options.layout.slots.indexOf(id));
      if (key) key.value = options.layout.keys[id];
      keypad.value = options.layout.keypad[id] || '';
    }
  }
  const header = document.createElement('div');
  header.className = 'binding-head';
  for (const label of ['Action', 'Palette slot', 'Key', 'Number']) {
    const cell = document.createElement('span');
    cell.textContent = label;
    header.append(cell);
  }
  group.append(header);
  const actionLabels = { ...actionNames, ...utilityActions };
  const carried = new Set(availableQuickItems(world));
  for (const [id, name] of Object.entries(quickItemActions)) {
    if (carried.has(id) || options.layout.keypad[id]) actionLabels[id] = name;
  }
  for (const [id, name] of Object.entries(actionLabels)) {
    const row = document.createElement('div'),
      title = document.createElement('strong');
    title.textContent = name;
    const position = Object.hasOwn(actionNames, id)
      ? menu(
          slotNames.map((v, i) => [i, v]),
          (n) => moveTouchAction(options.layout, id, Number(n)),
          name + ' touch position'
        )
      : null;
    const key = Object.hasOwn(options.layout.keys, id)
      ? menu(
          keyChoices.map((k) => [k, keyLabel(k)]),
          (code) => rebind(options.layout, id, code),
          name + ' keyboard key'
        )
      : null;
    const keypad = menu(
      [['', 'Unassigned'], ...keypadChoices.map((code) => [code, keypadLabel(code)])],
      (code) => rebindKeypad(options.layout, id, code),
      name + ' number key'
    );
    row.append(
      title,
      position || document.createElement('span'),
      key || document.createElement('span'),
      keypad
    );
    group.append(row);
    rows.push({ id, position, key, keypad });
  }
  refresh();
  modal(
    'binding',
    '',
    'Arrange controls',
    [
      paragraph(
        'The number row and numeric keypad share assignments in the field. A number selects a reply or pocket inside its menu. Changing an occupied key swaps its assignments.',
        'field-note'
      ),
      group,
    ],
    [
      button('Back', returnFromPanel, 'primary'),
      button('Assign touch keys', touchKeysPanel),
      button('Reset controls', () => {
        options.layout = controlLayout();
        refresh();
        applyPreferences();
        write(settingsKey, options);
      }),
    ]
  );
}
function saveFiles() {
  const active = world || loadJourney(),
    status = paragraph(
      lasting()
        ? 'Your browser can save on this device.'
        : 'Device storage is unavailable. Download your journey to keep a copy.',
      'field-note'
    );
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  file.onchange = async () => {
    try {
      if (!file.files[0]) return;
      const bundle = readJourneyFile(JSON.parse(await file.files[0].text()));
      if (!bundle) throw Error();
      modal(
        'load-confirm',
        '',
        'Load this journey?',
        [
          paragraph(
            'Replace the active position with this saved journey? Completed journeys stay in your history.'
          ),
        ],
        [
          button(
            'Load journey',
            () => {
              applyJourneyFile(bundle);
              start(true);
            },
            'primary'
          ),
          button('Keep my place', saveFiles),
        ]
      );
    } catch {
      status.textContent = 'This file could not be read as a saved journey.';
      file.value = '';
    }
  };
  const actions = [];
  if (active)
    actions.push(
      button('Download journey', () => {
        const blob = new Blob([JSON.stringify(journeyFile(active))], { type: 'application/json' }),
          url = URL.createObjectURL(blob),
          link = document.createElement('a');
        link.href = url;
        link.download = 'princess-xero-journey.json';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
    );
  actions.push(button('Load journey file', () => file.click()));
  if (!lasting())
    actions.push(
      button('Retry device save', () => {
        const ok = retryPending();
        status.textContent = ok
          ? 'Your journey is saved on this device.'
          : 'Device storage is still unavailable. Your current journey remains in this tab.';
        if (screen === 'game' && ok) text('storage-status', '');
      })
    );
  actions.push(button('Back', returnFromPanel));
  modal('files', '', 'Save files', [status, file], actions);
}
$('save-files').addEventListener('click', saveFiles);
function bagPanel() {
  if (!world || world.dialogue || world.ending || world.sequence) return;
  if (panel === 'bag') {
    returnFromPanel();
    return;
  }
  panelReturn = panel;
  panelSprint = touchRun.latched;
  const contents = makeBagView(
    world,
    () => {
      world.fieldHand = 'belt';
      save();
      dismiss();
      setTouchRun(panelSprint);
      refreshHUD();
    },
    {
      layout: options.layout,
      ownerName(code, current) {
        const owner = actionForKey(options.layout, code);
        if (!owner || owner === current) return '';
        return actionNames[owner] || utilityActions[owner] || quickItemActions[owner] || '';
      },
      assign(action, code) {
        rebindKeypad(options.layout, action, code);
        applyPreferences();
        write(settingsKey, options);
      },
    }
  );
  modal('bag', 'Equipment', 'Traveller’s bag', contents, [
    button('Ready sword', () => {
      world.fieldHand = 'sword';
      save();
      dismiss();
      setTouchRun(panelSprint);
      refreshHUD();
    }),
    button('Close bag', returnFromPanel),
  ]);
}
$('bag-button').addEventListener('click', bagPanel);
function journalPanel() {
  if (!world || world.dialogue || world.ending) return;
  panelReturn = panel;
  panelSprint = touchRun.latched;
  const notes = Array.isArray(world.journal) ? world.journal : [],
    entries = [];
  if (!notes.length)
    entries.push(paragraph('The first page is still blank. Discoveries will appear here as you travel.'));
  for (const note of [...notes].reverse()) {
    const entry = document.createElement('article'),
      h = document.createElement('h3');
    h.textContent = note.title;
    entry.append(h, paragraph(note.text));
    const time = note.at ?? note.time;
    const previous = note.revises && notes.find((n) => n.id === note.revises);
    const info = [];
    if (Number.isFinite(time)) {
      const seconds = Math.max(0, Math.floor(time));
      info.push(Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + ' into the journey');
    }
    if (previous) info.push('Revisits ' + previous.title);
    if (info.length) entry.append(paragraph(info.join(' · '), 'field-note'));
    entries.push(entry);
  }
  modal('journal', 'Field notes', 'Travel journal', entries, [button('Back', returnFromPanel)]);
}
function historyPanel() {
  const entries = pastJourneys().map((item) => {
    const e = document.createElement('article'),
      h = document.createElement('h3');
    h.textContent = item.ending.title;
    e.append(h, paragraph(item.ending.text));
    if (!item.legacy && Number.isFinite(item.at) && Number.isFinite(item.elapsed)) {
      e.append(
        paragraph(
          new Date(item.at).toLocaleDateString() + ' · ' + Math.round(item.elapsed / 60) + ' minutes',
          'field-note'
        )
      );
    }
    return e;
  });
  modal('history', '', 'Past journeys', entries, [button('Back', returnFromPanel)]);
}
$('history').addEventListener('click', historyPanel);
function confirmFork() {
  modal(
    'fork',
    'Lanternwood',
    'Return to the forest fork?',
    [
      paragraph(
        'Start again at the forest meeting. This replaces your current position. Completed journeys stay in your history.'
      ),
    ],
    [
      button(
        'Return to the fork',
        () => {
          const fork = recallFork(world);
          if (fork) {
            write(saveKey, fork);
            start(true);
          }
        },
        'primary'
      ),
      button('Keep my place', returnFromPanel),
    ]
  );
}
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
  const saved = loadJourney();
  $('start').querySelector('span').textContent = saved ? 'Continue journey' : 'Enter the forest';
  display($('fresh'), Boolean(saved));
  display($('history'), pastJourneys().length > 0);
}
function goHome() {
  save();
  fieldCheck.pause();
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
}
function graphicsError() {
  running = false;
  save();
  modal(
    'error',
    'Lanternwood',
    'The view could not open',
    [
      paragraph(
        lasting()
          ? 'Try opening the forest again. Your last position is saved on this device.'
          : 'Try opening the forest again. Your current position remains in this tab.'
      ),
    ],
    [button('Return to title', goHome, 'primary')],
    { closable: false }
  );
  renderer?.dispose();
  renderer = null;
}
async function start(resume = true) {
  if (showingLoad) return;
  showingLoad = true;
  $('start').disabled = true;
  text('startup-status', '');
  audio.unlock();
  try {
    world = resume ? loadJourney() || createWorld() : createWorld();
    world.events = [];
    world.runId ||= newRun();
    applyPreferences();
    survey(world);
    rememberFork(world, true);
    if (!hasFork(world)) {
      const opening = createWorld();
      opening.runId = world.runId;
      rememberFork(opening, true);
    }
    accumulator = 0;
    activeSurvey = null;
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
  activeSurvey?.draw();
}
function routePhrase(crossing) {
  return crossing === 'sluice'
    ? 'including the remaining sluice detour'
    : crossing === 'ford'
      ? 'via Pale Ford'
      : 'by the marked route';
}
function mapPanel() {
  if (!world || world.dialogue || world.ending || world.sequence) return;
  if (panel === 'map') {
    returnFromPanel();
    return;
  }
  if (panel) return;
  sprintBeforeMap = touchRun.latched;
  act(world, 'map');
  activeSurvey = makeFieldSurvey(world, save);
  const { canvas, bar, text: description } = activeSurvey,
    hud = getHUD(world);
  const notes = [bar, canvas, description];
  if (hasDirections(world) && Number.isFinite(hud.distance))
    notes.push(
      paragraph(
        hud.location +
          ' · ' +
          Math.round(hud.distance) +
          ' m ' +
          routePhrase(hud.crossing) +
          ' · next bearing ' +
          compassPoint(hud.bearing) +
          '.',
        'field-note'
      )
    );
  if (hasDirections(world) || world.survey?.visits?.bells)
    notes.push(paragraph('Sluice bridge · ' + bridgeReport(world), 'field-note'));
  modal('map', '', world.hasMap ? 'The inked map' : 'Field sketch', notes, [
    button('Fold map', returnFromPanel),
  ]);
  drawMap();
}
$('map-button').addEventListener('click', mapPanel);
function syncStory() {
  if (!world) return;
  if (world.ending && endingRef !== world.ending) {
    const ending = world.ending;
    endingRef = ending;
    rememberEnding(world);
    const actions = [button('Begin anew', () => start(false), 'primary')];
    if (ending.id !== 'saved')
      actions.push(
        button('Return to checkpoint', () => {
          const runId = world.runId;
          world = resumeCheckpoint(world);
          world.runId = runId;
          applyPreferences();
          survey(world);
          needsFrame = true;
          dismiss();
          refreshHUD();
          save();
        })
      );
    if (hasFork(world)) actions.push(button('Return to the forest fork', confirmFork));
    actions.push(button('Past journeys', historyPanel), button('Title screen', goHome));
    modal('ending', 'Journey’s end', ending.title, [paragraph(ending.text)], actions, { closable: false });
    save();
    return;
  }
  if (world.dialogue && dialogueRef !== world.dialogue) {
    const d = world.dialogue;
    dialogueRef = d;
    const paragraphs = [];
    if (d.kind === 'witch') rememberFork(world);
    if (d.question) paragraphs.push(paragraph('Zelda: “' + d.question + '”', 'question'));
    if (d.kind === 'witch') {
      const gestures = [
        'She tilts the lantern and listens to the castle.',
        'Three ember-coloured bottles knock together in her palm.',
        'A moth settles on the green vial. Its wings fold.',
        'She opens one hand toward the trees.',
      ];
      const lines = d.text.split(/\s+(?=Option number (?:one|two|three))/);
      lines.forEach((line, i) => {
        if (gestures[i]) paragraphs.push(witchVignette(i, gestures[i], options.reduceMotion));
        paragraphs.push(paragraph(line));
      });
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
      b.dataset.reply = String(i + 1);
      b.setAttribute('aria-keyshortcuts', String(i + 1));
      const sign = document.createElement('b');
      sign.setAttribute('aria-hidden', 'true');
      sign.textContent = String(i + 1);
      b.prepend(sign);
      return b;
    });
    if (!actions.length) actions.push(button('Continue', returnFromPanel, 'primary'));
    else if (d.kind === 'banquet') actions.push(button('Step back', returnFromPanel));
    modal('dialogue', d.kind === 'witch' ? 'Lanternwood' : '', d.speaker, paragraphs, actions, {
      closable: d.kind !== 'banquet' || Boolean(d.choices.length),
    });
    save();
  }
}
function refreshTouchKeys(hint = '', item = world && selectedItem(world)) {
  const pinned = options.touchKeys;
  for (const [side, buttonId] of [
    ['movement', 'move-key'],
    ['action', 'action-key'],
  ]) {
    const action = pinned[side],
      key = $(buttonId);
    const direct = action.startsWith('item:');
    const pocket = direct && world ? quickItem(world, action) : null;
    const name =
      action === 'potion'
        ? item?.name || 'Belt'
        : action === 'run' && touchRun.active
          ? 'Stop'
          : action === 'interact' && hint
            ? hint
            : pocket?.name || touchActionNames[action];
    const glyph = touchKeyIcon(action);
    const visual = glyph + name;
    if (key.dataset.legend !== visual) {
      key.dataset.legend = visual;
      key.replaceChildren(icon(glyph), Object.assign(document.createElement('span'), { textContent: name }));
    }
    const accessible =
      action === 'run'
        ? touchRun.active
          ? 'Stop running'
          : 'Run'
        : action === 'strike'
          ? 'Swing sword'
          : action === 'interact' && hint
            ? hint
            : direct
              ? name + ', ' + (pocket?.count || 0) + ' remaining'
              : name;
    key.setAttribute('aria-label', accessible);
    key.title = accessible;
    if (action === 'run') key.setAttribute('aria-pressed', String(touchRun.active));
    else key.removeAttribute('aria-pressed');
    key.classList.toggle('empty-pocket', direct && !pocket?.count);
  }
  const palette = $('tool-palette');
  const signature = pinned.movement + '/' + pinned.action;
  if (palette.dataset.pins !== signature) {
    palette.dataset.pins = signature;
    for (const control of palette.querySelectorAll('[data-act], #sprint')) {
      const action = control.id === 'sprint' ? 'run' : control.dataset.act;
      control.classList.toggle('on-field-key', pinned.movement === action || pinned.action === action);
    }
  }
}
function refreshHUD() {
  if (!world) return;
  if (!$('number-pad').hidden) paintNumberPad(world, touchRun.active || keyboard.sprinting());
  display($('hud'), !world.sequence);
  display($('resist'), world.sequence?.id === 'bound');
  const h = getHUD(world),
    healthEl = $('health'),
    old = healthEl.getAttribute('aria-valuenow');
  const cinematic = Boolean(world.sequence && options.subtitles && h.notice);
  display($('sequence-caption'), cinematic);
  text('sequence-caption', cinematic ? h.notice : '');
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
  const dir = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
    ((Math.round(world.player.yaw / (Math.PI / 4)) % 8) + 8) % 8
  ];
  text('heading', dir);
  text('location', h.location);
  text('objective', h.objective);
  text('notice', h.notice);
  const item = selectedItem(world);
  const beltLabel = item ? item.name + ' · ' + item.count : 'Belt empty';
  text('potion-count', beltLabel);
  const field = $('field-action'),
    holdsItem = fieldAction(world.fieldHand, item, h.hint) === 'potion';
  const fieldLabel = holdsItem ? item.name : h.hint || 'Sword';
  const contextual = fieldAction(world.fieldHand, item, h.hint);
  const pinned = Object.values(options.touchKeys);
  const duplicatesPinned = pinned.includes(contextual) || (holdsItem && pinned.includes('item:' + item.id));
  display(field, !duplicatesPinned);
  refreshTouchKeys(h.hint, item);
  if (field.lastElementChild.textContent !== fieldLabel) {
    field.replaceChildren(
      icon(holdsItem ? (item.id === 'leaf' ? 'leaf-icon' : 'flask') : h.hint ? 'hand' : 'sword'),
      Object.assign(document.createElement('span'), { textContent: fieldLabel })
    );
  }
  field.setAttribute(
    'aria-label',
    holdsItem ? 'Use ' + item.name + ', ' + item.count + ' remaining' : h.hint || 'Swing sword'
  );
  field.classList.toggle('prompt-action', Boolean(!holdsItem && h.hint));
  document.querySelector('[data-act="potion"]').classList.toggle('no-belt', !item);
  document
    .querySelector('[data-act="guard"]')
    .setAttribute('aria-pressed', String((world.guardUntil || 0) > world.elapsed));
  $('stick').classList.toggle(
    'running',
    Boolean(rimSprint || touchRun.active || keyboard.sprinting()) && !world.player.exhausted
  );
  document
    .querySelector('[data-act="potion"]')
    .setAttribute(
      'aria-label',
      item ? 'Use ' + item.name + ', ' + item.count + ' remaining' : 'Open bag to equip an item'
    );
  survey(world);
  text(
    'belt-readout',
    world.hasVial ? (world.antidote ? 'Silver vial · moonwater' : 'Silver vial · empty') : ''
  );
  text(
    'route-readout',
    hasDirections(world) && Number.isFinite(h.distance)
      ? compassPoint(h.bearing) + ' · ' + Math.round(h.distance) + ' m ' + routePhrase(h.crossing)
      : ''
  );
  const sighted = world.milestones?.ridge || world.milestones?.procession || world.survey?.visits?.downs;
  const status = describeRace(world, h.hordeProgress);
  text(
    'race-readout',
    (world.gateCrossed && !world.ropeFallen ? 'Through in time. ' : '') +
      status +
      (status && sighted && !world.ropeFallen
        ? ' · ' + compassPoint(bearing(world.player, hordePosition(world, 0)))
        : '')
  );
  const stamina = clamp(Math.round((world.player.stamina ?? 1) * 100), 0, 100);
  $('stamina').firstElementChild.style.width = stamina + '%';
  $('stamina').setAttribute('aria-valuenow', String(stamina));
  display($('stamina'), stamina < 99);
  const interactKey = document.querySelector('[data-act="interact"]');
  interactKey.setAttribute('aria-label', h.hint || 'Interact');
  const hasSinglePrompt = options.controlStyle === 'compact' && !paletteOpen;
  text('interact-hint', h.hint);
  interactKey.querySelector('span').textContent = h.hint && !hasSinglePrompt ? h.hint : 'Interact';
  display($('interact-hint'), Boolean(h.hint && holdsItem) && hasSinglePrompt);
}
function gameAction(action) {
  if (screen !== 'game' || panel) return;
  const prepared = action === 'potion' || action.startsWith('item:') ? selectedItem(world) : null;
  if (action === 'potion' && !prepared) {
    bagPanel();
    return;
  }
  const applied = act(world, action === 'potion' ? 'use-equipped' : action);
  if (applied && prepared && selectedItem(world)?.id !== prepared.id) world.fieldHand = 'sword';
  if (!applied && !world.sequence && ['guard', 'thrust', 'dodge', 'strike'].includes(action)) {
    world.notice = world.player.stamina < 0.16 ? 'Catch your breath.' : 'Finish the movement first.';
    world.noticeUntil = world.elapsed + 1.2;
  }
  syncStory();
  refreshHUD();
  if (applied || world.dialogue || world.ending) save();
}
function dispatch(action) {
  if (action === 'bag') return bagPanel();
  if (action === 'map') return mapPanel();
  if (action === 'journal') return journalPanel();
  if (action === 'tools') {
    if (options.controlStyle === 'classic') {
      setNumberPad(false);
      $('tool-palette').focus({ preventScroll: true });
      return;
    }
    setPalette(!paletteOpen);
    refreshHUD();
    if (paletteOpen && !matchMedia('(any-pointer:coarse)').matches)
      document.querySelector('#tool-palette button')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'pause') return pause();
  if (action === 'run') {
    setTouchRun(!touchRun.active);
    setPalette(false);
    return;
  }
  setPalette(false);

  gameAction(action);
}
$('interact-hint').addEventListener('click', () => dispatch('interact'));
function setTouchRun(on) {
  touchRun.reset(on);
  paintTouchRun();
}
function paintTouchRun() {
  $('sprint').setAttribute('aria-pressed', String(touchRun.active));
  refreshTouchKeys();
}
function touchAutoForward() {
  return touchRun.active ? 1 : 0;
}
function aimedButton(b, resolve, holdSword = false) {
  let gesture = null;
  b.addEventListener('pointerdown', (e) => {
    if (gesture && gesture.epoch !== fieldInputEpoch) gesture = null;
    if (panel || gesture || e.button !== 0) return;
    const action = resolve();
    if (!action) return;
    gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: e.timeStamp,
      w: world,
      epoch: fieldInputEpoch,
      action,
    };
    if (gesture.action === 'run') {
      touchRun.press(e.pointerId);
      paintTouchRun();
    }
    try {
      b.setPointerCapture(e.pointerId);
    } catch {}
  });
  b.addEventListener('pointermove', (e) => {
    if (gesture?.id !== e.pointerId || gesture.epoch !== fieldInputEpoch) return;
    if (gesture.action === 'run') return;
    moveLook(e.clientX - gesture.x, e.clientY - gesture.y);
    gesture.x = e.clientX;
    gesture.y = e.clientY;
  });
  b.addEventListener('pointerup', (e) => {
    if (gesture?.id !== e.pointerId) return;
    const last = gesture;
    gesture = null;
    if (last.epoch !== fieldInputEpoch) return;
    const canAct = !panel && world === last.w && !world?.sequence;
    const held = e.timeStamp - last.start >= 330;
    let action = last.action;
    if (action === 'run') {
      touchRun.release(e.pointerId, canAct && !held);
      paintTouchRun();
      return;
    }
    if (!canAct) return;
    if (holdSword && action === 'strike' && held) action = 'thrust';
    dispatch(action);
  });
  for (const type of ['lostpointercapture', 'pointercancel'])
    b.addEventListener(type, (e) => {
      if (gesture?.id === e.pointerId) {
        if (gesture.action === 'run' && gesture.epoch === fieldInputEpoch) {
          touchRun.release(e.pointerId, false);
          paintTouchRun();
        }
        gesture = null;
      }
    });
  b.addEventListener('click', (e) => {
    if (e.detail === 0 && !panel) {
      const action = resolve();
      if (action) dispatch(action);
    }
  });
}
document
  .querySelectorAll('[data-act]')
  .forEach((b) => aimedButton(b, () => b.dataset.act, b.dataset.act === 'strike'));
aimedButton(
  $('field-action'),
  () => fieldAction(world.fieldHand, selectedItem(world), getHUD(world).hint),
  true
);
const toolsKey = $('quick-tools');
aimedButton($('move-key'), () => options.touchKeys.movement, true);
aimedButton($('action-key'), () => options.touchKeys.action, true);
const paintNumberPad = mountNumberPad($('number-pad-grid'), () => options.layout, aimedButton);
let bindingsFromPad = false;
function setNumberPad(open) {
  $('number-pad').hidden = !open;
  document.body.dataset.numberPad = open ? 'open' : 'closed';
  $('palette-number-pad').setAttribute('aria-expanded', String(open));
  if (open) {
    setPalette(false);
    paintNumberPad(world, touchRun.active || keyboard.sprinting());
  }
}
$('palette-number-pad').addEventListener('click', () => {
  setNumberPad($('number-pad').hidden);
});
$('close-number-pad').addEventListener('click', () => {
  setNumberPad(false);
  view.focus({ preventScroll: true });
});
$('assign-number-keys').addEventListener('click', () => {
  bindingsFromPad = true;
  bindingsPanel();
});
$('palette-bind').addEventListener('click', touchKeysPanel);
$('palette-bag').addEventListener('click', bagPanel);
$('palette-guide').addEventListener('click', controls);
let toolGesture = null;
function stopTool() {
  if (toolGesture) clearTimeout(toolGesture.timer);
  toolGesture = null;
}
toolsKey.addEventListener('pointerdown', (e) => {
  if (toolGesture || panel || e.button !== 0) return;
  const g = { id: e.pointerId, x: e.clientX, y: e.clientY };
  toolGesture = g;
  try {
    toolsKey.setPointerCapture(e.pointerId);
  } catch {}
  g.timer = setTimeout(() => {
    if (toolGesture === g && !panel) {
      stopTool();
      bagPanel();
    }
  }, 480);
});
toolsKey.addEventListener('pointermove', (e) => {
  if (
    toolGesture?.id === e.pointerId &&
    Math.hypot(e.clientX - toolGesture.x, e.clientY - toolGesture.y) > 12
  )
    clearTimeout(toolGesture.timer);
});
toolsKey.addEventListener('pointerup', (e) => {
  if (toolGesture?.id !== e.pointerId) return;
  const dx = e.clientX - toolGesture.x,
    dy = e.clientY - toolGesture.y;
  stopTool();
  dispatch(toolsGesture(dx, dy));
});
for (const type of ['pointercancel', 'lostpointercapture'])
  toolsKey.addEventListener(type, (event) => {
    if (toolGesture?.id === event.pointerId) stopTool();
  });
toolsKey.addEventListener('click', (e) => {
  if (e.detail === 0) dispatch('tools');
});
$('resist').addEventListener('click', () => gameAction('resist'));
$('sprint').addEventListener('click', () => dispatch('run'));
function frame(timestamp) {
  if (!running || screen !== 'game') return;
  const now = timestamp / 1000,
    dt = Math.max(0, now - lastTime);
  lastTime = now;
  if (!document.hidden) {
    if (!panel) {
      const input = keyboard.sample(movement, touchAutoForward(), touchRun.active || rimSprint);
      accumulator = advanceGameClock(world, dt, accumulator, input, input.pitch);
    }
    // The traveller can listen while reading or consulting the map. Only the
    // audio clock advances here; footsteps, threats and the race stay frozen.
    if (!panel || listeningPanels.has(panel))
      audio.update(arrivalView(world), Boolean(panel));
    for (const ev of world.events.splice(0)) {
      audio.cue(ev);
      soundCaption(ev);
      if (ev.type === 'bell' || ev.type === 'sluice') showBell(ev);
      if (ev.type === 'hurt' && !options.reduceMotion) {
        const damage = $('damage');
        damage.style.opacity = '1';
        clearTimeout(damageTimer);
        damageTimer = setTimeout(() => (damage.style.opacity = '0'), 160);
      }
    }
    if (!panel || needsFrame) {
      try {
        const scene = presentationWorld(world, accumulator);
        const drawn = renderer.render(scene, scene.elapsed);
        if (drawn && !panel)
          fieldCheck.frame(performance.now(), world, renderer.surface || view, renderer.backend);
        needsFrame = false;
      } catch (error) {
        console.error('Forest rendering failed', error);
        graphicsError();
        return;
      }
    }
    if (now - lastHUD > 0.14) {
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
const captionActions = {
  telegraph: {
    wolf: 'Paws scrape the ground',
    troll: 'A club lifts from the stones',
    dragon: 'Wings draw back',
  },
  block: { parry: 'Steel rings against the blow' },
  relay: { brace: 'The rope tightens against the brake', slip: 'The brake slips and the rope runs free' },
  knock: {
    single: 'One knock',
    orchard: 'Two quick knocks, then a third',
    reply: 'Two quiet knocks. A pause, then a third',
  },
  latch: { hoof: 'Hooves move across the stones', lift: 'A latch lifts' },
  fieldbird: { wings: 'A rush of wings leaves the branches', alarm: 'Two sharp cries from the branches' },
  potion: {
    veil: 'The reed snaps and mist hisses',
    lure: 'Bronze rings where the bottle landed',
    shatter: 'Clay cracks, then cinders scatter',
    fill: 'Water trickles into glass',
  },
};
const localCaptionRange = { fieldbird: 48, knock: 18, relay: 31, latch: 28, pebble: 14, potion: 40 };
function soundCaption(ev) {
  if (!options.subtitles) return;
  const range = localCaptionRange[ev.type];
  if (range && Number.isFinite(ev.x) && Math.hypot(ev.x - world.player.x, ev.z - world.player.z) > range)
    return;
  const directional = captionActions[ev.type]?.[ev.text];
  const line =
    ev.caption ||
    directional ||
    {
      bell: 'Castle bells ring in the distance',
      block: 'A blow strikes your guard',
      'enemy-breath': 'Flame rushes past',
      shackle: 'An iron shackle rattles',
      pebble: 'A pebble rattles against copper',
      answer: 'A crowd answers across the valley',
      howl: 'Wolves call in the woods',
      hurt: 'A blow lands',
      chime: 'An iron chain pulls taut',
      dragon: 'Wingbeats approach',
      roar: 'A low roar',
    }[ev.type];
  if (!line) return;
  text('captions', line);
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => text('captions', ''), 2700);
}
function showBell(ev) {
  const box = $('bell-call');
  clearTimeout(bellTimer);
  box.replaceChildren();
  display(box, true);
  const tones =
    ev.type === 'bell' ? ['low', 'high', 'mid'] : [ev.text].filter((x) => ['low', 'mid', 'high'].includes(x));
  const names = { low: 'Low', mid: 'Middle', high: 'High' };
  const timing = ev.type === 'bell' ? 'The castle calls' : 'Your bell';
  const source = document.createElement('small');
  source.textContent = timing;
  box.append(source);
  box.setAttribute('aria-label', timing + ' · ' + tones.map((v) => names[v]).join(', '));
  for (const tone of tones) {
    const ch = document.createElement('span');
    ch.className = 'bell-tone ' + tone;
    ch.textContent = { low: '▁', mid: '▄', high: '█' }[tone];
    if (ev.type === 'bell' && !options.reduceMotion) {
      ch.classList.add('pealing');
      ch.style.animationDelay = String(tones.indexOf(tone) * 0.46) + 's';
    }
    ch.title = names[tone];
    box.append(ch);
  }
  bellTimer = setTimeout(() => display(box, false), 3000);
}
function moveLook(dx, dy) {
  if (!world || panel || world.sequence) return;
  const scale = 0.0031 * options.sensitivity;
  world.player.yaw = (world.player.yaw + dx * scale) % (Math.PI * 2);
  world.player.pitch = clamp(world.player.pitch - dy * scale, -1.03, 1.04);
}
view.addEventListener('pointerdown', (event) => {
  if (panel || event.button !== 0 || lookId !== null) return;
  view.focus({ preventScroll: true });
  if (event.pointerType === 'mouse' && document.pointerLockElement === view) {
    gameAction('strike');
    return;
  }

  if (paletteOpen) setPalette(false);
  if (!world) return;
  mouseTap = {
    x: event.clientX,
    y: event.clientY,
    at: performance.now(),
    drift: 0,
    prompt: event.pointerType !== 'mouse' && Boolean(getHUD(world).hint),
  };
  lookId = event.pointerId;
  lookX = event.clientX;
  lookY = event.clientY;
  try {
    view.setPointerCapture(event.pointerId);
  } catch {}
});
view.addEventListener('pointermove', (event) => {
  if (lookId !== event.pointerId || document.pointerLockElement === view) return;
  if (mouseTap)
    mouseTap.drift = Math.max(
      mouseTap.drift,
      Math.hypot(event.clientX - mouseTap.x, event.clientY - mouseTap.y)
    );
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
  const push = -dy / radius;
  if (touchRun.active && push < -0.44 && Math.abs(dy) > Math.abs(dx)) setTouchRun(false);
  rimSprint = push > (rimSprint ? 1.08 : 1.24) && Math.abs(dx) < Math.abs(dy);
  movement.strafe = dx / length;
  movement.forward = -dy / length;
  $('stick').firstElementChild.style.transform =
    'translate(' + movement.strafe * radius * 0.71 + 'px,' + -movement.forward * radius * 0.71 + 'px)';
}
$('stick').addEventListener('pointerdown', (event) => {
  if (stickId !== null || panel) return;
  stickId = event.pointerId;
  try {
    $('stick').setPointerCapture(stickId);
  } catch {
    /* The pad still receives its own events. */
  }
  moveStick(event);
});
$('stick').addEventListener('pointermove', (event) => {
  if (stickId === event.pointerId) moveStick(event);
});
let mouseTap = null;
function stopPointer(event) {
  if (lookId === event.pointerId && event.type === 'pointerup' && mouseTap && !document.pointerLockElement) {
    if (
      performance.now() - mouseTap.at < 350 &&
      mouseTap.drift < 5 &&
      Math.hypot(event.clientX - mouseTap.x, event.clientY - mouseTap.y) < 5
    )
      dispatch(
        event.pointerType !== 'mouse' && world.sequence?.id === 'bound'
          ? 'resist'
          : event.pointerType !== 'mouse' && (mouseTap.prompt || getHUD(world).hint)
            ? 'interact'
            : 'strike'
      );
  }
  if (lookId === event.pointerId) mouseTap = null;
  if (stickId === event.pointerId) {
    stickId = null;
    rimSprint = false;
    movement.strafe = movement.forward = 0;
    $('stick').firstElementChild.style.transform = '';
  }
  if (lookId === event.pointerId) lookId = null;
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
  document.addEventListener(type, stopPointer, true);
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.isComposing) return;
  if (panel) {
    if (event.code === 'Escape') {
      event.preventDefault();
      returnFromPanel();
      return;
    }
    const number = /^(?:Digit|Numpad)([1-9])$/.exec(event.code)?.[1];
    if (number && (panel === 'dialogue' || panel === 'bag')) {
      const target = $('panel').querySelector(
        panel === 'bag' ? '[data-pocket="' + number + '"]' : '[data-reply="' + number + '"]'
      );
      if (target) {
        event.preventDefault();
        if (!event.repeat) target.click();
        return;
      }
    }
    if (['bag', 'map', 'journal'].includes(panel) && actionForKey(options.layout, event.code) === panel) {
      event.preventDefault();
      if (!event.repeat) returnFromPanel();
      return;
    }
    if (event.key === 'Tab') {
      const focus = [
        ...$('panel').querySelectorAll('button:not([hidden]),input,select,summary,canvas[tabindex]'),
      ];
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
    if (event.code === 'Enter' && !event.repeat && [document.body, title].includes(document.activeElement))
      start();
    return;
  }
  if (event.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
  if (event.code === 'Escape') {
    event.preventDefault();
    if (!event.repeat) {
      if (!$('number-pad').hidden) {
        setNumberPad(false);
        view.focus();
      } else if (paletteOpen) {
        setPalette(false);
        view.focus();
      } else pause();
    }
    return;
  }
  const input = keyboard.press(options.layout, event.code, performance.now(), event.repeat);
  if (!input) return;
  // Field bindings have priority even if the last touch or click focused a HUD
  // button. Modal controls above retain normal Space and Enter activation.
  event.preventDefault();
  if (!input.fresh) return;
  if (input.action === 'back' && touchRun.active) setTouchRun(false);
  if (
    world?.sequence?.id === 'bound' &&
    ['run', 'forward', 'interact', 'dodge', 'strike'].includes(input.action)
  ) {
    gameAction('resist');
    return;
  }
  if (!isHeldAction(input.action)) {
    dispatch(input.action);
    return;
  }
  if (!world.sequence && ['PageUp', 'PageDown'].includes(event.code)) {
    // A short tap at low frame rates still produces perceptible vertical look.
    world.player.pitch = clamp(
      world.player.pitch + (input.action === 'lookUp' ? 0.055 : -0.055),
      -1.03,
      1.04
    );
    needsFrame = true;
  }
});
stage.addEventListener(
  'pointerdown',
  (e) => {
    if (screen === 'game' && !panel && e.isTrusted) fieldCheck.input(performance.now());
  },
  { capture: true, passive: true }
);
document.addEventListener('keyup', (event) => {
  if (keyboard.release(event.code, performance.now()) && !panel && screen === 'game') event.preventDefault();
});
window.addEventListener('blur', () => {
  panelSprint = sprintBeforeMap = false;
  stopMotion();
  if (screen === 'game' && !panel) pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    panelSprint = sprintBeforeMap = false;
    fieldCheck.pause();
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
applyPreferences();
updateStart();
soundState();
