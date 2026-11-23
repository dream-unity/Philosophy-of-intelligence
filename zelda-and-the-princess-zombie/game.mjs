import { createFieldCheck } from './field-check.mjs';
import { witchVignette } from './story-witch.mjs';
import {
  actionNames,
  slotNames,
  keyChoices,
  controlLayout,
  moveTouchAction,
  rebind,
  actionForKey,
} from './control-layout.mjs';
import { advanceGameClock } from './game-clock.mjs';
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
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const validMix = (v) => (Number.isFinite(v) ? clamp(v, 0, 1) : 1);
const options = {
  layout: controlLayout(preferences.layout),
  handedness: preferences.handedness === 'left' ? 'left' : 'right',
  stickSize: ['small', 'standard', 'large'].includes(preferences.stickSize)
    ? preferences.stickSize
    : 'standard',
  stickHeight: ['low', 'raised'].includes(preferences.stickHeight) ? preferences.stickHeight : 'low',
  quality: ['low', 'auto', 'high'].includes(preferences.quality) ? preferences.quality : 'auto',
  subtitles: preferences.subtitles !== false,
  mix: {
    music: validMix(preferences.mix?.music),
    effects: validMix(preferences.mix?.effects),
    ambience: validMix(preferences.mix?.ambience),
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
const physicalShift = new Set();
const keys = new Set(),
  movement = { forward: 0, strafe: 0 };
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
  sprintBeforeMap = false;
function applyPreferences() {
  document.body.dataset.hand = options.handedness;
  document.body.dataset.stick = options.stickSize;
  document.body.dataset.stickHeight = options.stickHeight;
  for (const [order, id] of options.layout.slots.entries()) {
    const action = id === 'run' ? $('sprint') : document.querySelector('[data-act="' + id + '"]');
    action.style.order = order;
    if (options.layout.keys[id]) {
      const letter = options.layout.keys[id].slice(3);
      action.querySelector('kbd').textContent = letter;
      action.setAttribute('aria-keyshortcuts', letter);
    }
  }
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
  sprint = false,
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
  keys.clear();
  movement.forward = 0;
  movement.strafe = 0;
  stickId = null;
  lookId = null;
  $('stick').firstElementChild.style.transform = '';
  sprint = false;
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
function soundState() {
  $('title-sound').replaceChildren(
    icon(options.sound ? 'sound' : 'mute'),
    Object.assign(document.createElement('span'), { textContent: options.sound ? 'Sound on' : 'Sound off' })
  );
  $('title-sound').setAttribute('aria-pressed', String(options.sound));
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
function modal(name, kicker, heading, body, actions, { closable = true } = {}) {
  if (!panel) lastFocus = document.activeElement;
  fieldCheck.pause();
  stopMotion();
  panel = name;
  releaseLook();
  display(overlay, true);
  title.inert = screen === 'title';
  stage.inert = screen === 'game';
  $('panel').classList.toggle('map-panel', name === 'map');
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
  if (panel === 'journal' || panel === 'preferences' || panel === 'fork') {
    if (world?.ending) {
      dismiss();
      syncStory();
    } else pause();
    return;
  }
  if (panel === 'help') {
    screen === 'game' ? pause() : dismiss();
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
    sprint = sprintBeforeMap;
    $('sprint').setAttribute('aria-pressed', String(sprint));
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
    'On a touchscreen, move with your left thumb and drag the view with your right. Drag from a tool to aim, then release to use it. Nudge the stick to walk or push it farther to jog. Run toggles sprint. Swap sides or resize the joystick in Settings.'
  );
  const table = document.createElement('div');
  table.className = 'key-table';
  for (const label of [
    'Jog',
    'W A S D',
    'Walk',
    'Hold Space while moving',
    'Look',
    'Mouse or drag',
    'Turn / move',
    'Arrow keys',
    'Look up / down',
    'Page Up / Page Down',
    'Thrust / guard',
    options.layout.keys.thrust.slice(3) + ' / ' + options.layout.keys.guard.slice(3),
    'Run',
    'Hold Shift',
    'Interact',
    options.layout.keys.interact.slice(3),
    'Swing sword',
    options.layout.keys.strike.slice(3) + ' or a short click',
    'Cast cinder phial',
    options.layout.keys.potion.slice(3),
    'Map / pause',
    'M / Esc',
  ]) {
    const cell = document.createElement('span');
    cell.textContent = label;
    table.append(cell);
  }
  const hint = paragraph(
    'Drag the scene to turn. A short mouse click swings your sword. Mouse capture is available in Settings. Hold a second touch on the view to aim while operating a tool.',
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
    for (const { id, position, key } of rows) {
      position.value = String(options.layout.slots.indexOf(id));
      if (key) key.value = options.layout.keys[id];
    }
  }
  for (const [id, name] of Object.entries(actionNames)) {
    const row = document.createElement('div'),
      title = document.createElement('strong');
    title.textContent = name;
    const position = menu(
      slotNames.map((v, i) => [i, v]),
      (n) => moveTouchAction(options.layout, id, Number(n)),
      name + ' touch position'
    );
    const key =
      id === 'run'
        ? null
        : menu(
            keyChoices.map((k) => [k, k.slice(3)]),
            (code) => rebind(options.layout, id, code),
            name + ' keyboard key'
          );
    row.append(title, position, key || document.createTextNode('Shift'));
    group.append(row);
    rows.push({ id, position, key });
  }
  refresh();
  modal(
    'binding',
    '',
    'Arrange controls',
    [
      paragraph(
        'Choose a touch position or key for each action. If another action uses it, the two swap.',
        'field-note'
      ),
      group,
    ],
    [
      button('Back', returnFromPanel, 'primary'),
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
function journalPanel() {
  if (!world || world.dialogue || world.ending) return;
  const notes = Array.isArray(world.journal) ? world.journal : [],
    entries = [];
  if (!notes.length)
    entries.push(paragraph('The first page is still blank. Discoveries will appear here as you travel.'));
  for (const note of [...notes].reverse()) {
    const entry = document.createElement('article'),
      h = document.createElement('h3');
    h.textContent = note.title;
    entry.append(h, paragraph(note.text));
    entries.push(entry);
  }
  modal('journal', 'Field notes', 'Travel journal', entries, [button('Back', returnFromPanel)]);
}
function historyPanel() {
  const entries = pastJourneys().map((item) => {
    const e = document.createElement('article'),
      h = document.createElement('h3');
    h.textContent = item.ending.title;
    e.append(
      h,
      paragraph(item.ending.text),
      paragraph(
        new Date(item.at).toLocaleDateString() + ' · ' + Math.round(item.elapsed / 60) + ' minutes',
        'field-note'
      )
    );
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
  sprintBeforeMap = sprint;
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
      const sign = document.createElement('b');
      sign.setAttribute('aria-hidden', 'true');
      sign.textContent = ['I', 'II', 'III'][i] || '';
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
function refreshHUD() {
  if (!world) return;
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
  text('potion-count', 'Cinder · ' + h.potions);
  document
    .querySelector('[data-act="potion"]')
    .setAttribute('aria-label', 'Cast cinder potion, ' + h.potions + ' remaining');
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
  const sighted = world.milestones?.ridge || world.survey?.visits?.downs;
  const status = world.gateCrossed
    ? 'You reached the castle before the host.'
    : describeRace(world, h.hordeProgress);
  text(
    'race-readout',
    status +
      (status && sighted && !world.ropeFallen && !world.gateCrossed
        ? ' · ' + compassPoint(bearing(world.player, hordePosition(world, 0)))
        : '')
  );
  const stamina = clamp(Math.round((world.player.stamina ?? 1) * 100), 0, 100);
  $('stamina').firstElementChild.style.width = stamina + '%';
  $('stamina').setAttribute('aria-valuenow', String(stamina));
  display($('stamina'), stamina < 99);
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
  let gesture = null,
    consumed = -1000;
  b.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || panel) return;
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      /* A released pointer cannot be captured. */
    }
  });
  b.addEventListener('pointermove', (e) => {
    if (gesture?.id !== e.pointerId) return;
    moveLook(e.clientX - gesture.x, e.clientY - gesture.y);
    gesture.x = e.clientX;
    gesture.y = e.clientY;
  });
  b.addEventListener('pointerup', (e) => {
    if (gesture?.id !== e.pointerId) return;
    gesture = null;
    consumed = performance.now();
    gameAction(b.dataset.act);
  });
  b.addEventListener('pointercancel', () => {
    gesture = null;
  });
  b.addEventListener('click', () => {
    if (performance.now() - consumed > 500) gameAction(b.dataset.act);
  });
});
$('resist').addEventListener('click', () => gameAction('resist'));
$('sprint').addEventListener('click', () => {
  sprint = !sprint;
  $('sprint').setAttribute('aria-pressed', String(sprint));
});
function frame(timestamp) {
  if (!running || screen !== 'game') return;
  const now = timestamp / 1000,
    dt = Math.max(0, now - lastTime);
  lastTime = now;
  if (!document.hidden) {
    if (!panel) {
      const input = {
        forward:
          movement.forward +
          Number(keys.has('KeyW') || keys.has('ArrowUp')) -
          Number(keys.has('KeyS') || keys.has('ArrowDown')),
        strafe: movement.strafe + Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        turn: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
        sprint: sprint || physicalShift.size > 0,
        walk: keys.has('Space'),
      };
      accumulator = advanceGameClock(
        world,
        dt,
        accumulator,
        input,
        Number(keys.has('PageUp')) - Number(keys.has('PageDown'))
      );
      audio.update(arrivalView(world));
    }
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
        const drawn = renderer.render(arrivalView(world), world.elapsed);
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
function soundCaption(ev) {
  if (!options.subtitles) return;
  const directional =
    ev.type === 'telegraph'
      ? { wolf: 'Paws scrape the ground', troll: 'Heavy stone shifts', dragon: 'Wings draw back' }[ev.text] ||
        'A creature draws back'
      : ev.type === 'enemy-breath'
        ? 'Flame rushes past'
        : ev.type === 'block'
          ? 'A blow strikes your guard'
          : ev.type === 'shackle'
            ? 'An iron shackle rattles'
            : ev.type === 'relay'
              ? 'The shutters shift'
              : null;
  const line =
    ev.caption ||
    directional ||
    {
      bell: 'Castle bells ring in the distance',
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

  if (event.pointerType === 'mouse')
    mouseTap = { x: event.clientX, y: event.clientY, at: performance.now(), drift: 0 };
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
  if (
    lookId === event.pointerId &&
    event.type === 'pointerup' &&
    event.pointerType === 'mouse' &&
    mouseTap &&
    !document.pointerLockElement
  ) {
    if (
      performance.now() - mouseTap.at < 350 &&
      mouseTap.drift < 5 &&
      Math.hypot(event.clientX - mouseTap.x, event.clientY - mouseTap.y) < 5
    )
      gameAction('strike');
  }
  if (lookId === event.pointerId) mouseTap = null;
  if (stickId === event.pointerId) {
    stickId = null;
    movement.strafe = movement.forward = 0;
    $('stick').firstElementChild.style.transform = '';
  }
  if (lookId === event.pointerId) lookId = null;
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
  document.addEventListener(type, stopPointer, true);
document.addEventListener('keydown', (event) => {
  if (['ShiftLeft', 'ShiftRight'].includes(event.code)) physicalShift.add(event.code);
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
  if (world?.sequence?.id === 'bound' && ['Space', 'KeyE', 'KeyF', 'KeyW', 'ArrowUp'].includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) gameAction('resist');
    return;
  }
  if (event.code === 'Space' && event.target?.closest?.('button, input, select')) return;
  const bound = actionForKey(options.layout, event.code);
  if (bound) {
    event.preventDefault();
    if (!event.repeat) gameAction(bound);
    return;
  }
  const commands = {
    KeyM: mapPanel,
    Escape: pause,
    KeyJ: journalPanel,
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
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
      'ShiftLeft',
      'ShiftRight',
      'PageUp',
      'PageDown',
    ].includes(event.code)
  ) {
    event.preventDefault();
    // A brief keyboard tap can fall entirely between two low-rate tablet frames.
    if (
      !event.repeat &&
      !keys.has(event.code) &&
      !world.sequence &&
      ['PageUp', 'PageDown'].includes(event.code)
    ) {
      world.player.pitch = clamp(
        world.player.pitch + (event.code === 'PageUp' ? 0.055 : -0.055),
        -1.03,
        1.04
      );
      needsFrame = true;
    }
    keys.add(event.code);
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
  keys.delete(event.code);
  physicalShift.delete(event.code);
});
window.addEventListener('blur', () => {
  physicalShift.clear();
  stopMotion();
  if (screen === 'game' && !panel) pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    fieldCheck.pause();
    physicalShift.clear();
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
