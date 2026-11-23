import { advanceGameClock } from './game-clock.mjs';
import { makeFieldSurvey } from './map-controls.mjs';
import { hasDirections, compassPoint, bearing, describeRace, survey } from './navigation.mjs';
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
} from './journey-store.mjs';
import { createWorld, act, choose, getHUD, resumeCheckpoint, hordePosition } from './world.mjs';
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
const audio = createAudio();
let activeSurvey = null,
  accumulator = 0,
  captionTimer = 0,
  bellTimer = 0,
  sprintBeforeMap = false;
function applyPreferences() {
  document.body.dataset.hand = options.handedness;
  document.body.dataset.stick = options.stickSize;
  document.body.dataset.stickHeight = options.stickHeight;
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
  stopMotion();
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
    'On a touchscreen, move with your left thumb and drag the view with your right. Drag from a tool to aim, then release to use it. Run switches between walking and sprinting. Swap sides or resize the joystick in Settings.'
  );
  const table = document.createElement('div');
  table.className = 'key-table';
  for (const label of [
    'Move',
    'W A S D',
    'Look',
    'Mouse or drag',
    'Turn / move',
    'Arrow keys',
    'Look up / down',
    'Page Up / Page Down',
    'Thrust / guard',
    'R / G',
    'Run',
    'Hold Shift',
    'Interact',
    'E',
    'Swing sword',
    'F or a short click',
    'Cast cinder phial',
    'Q',
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
  const actions = [button('Back', returnFromPanel, 'primary')];
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
          ' m by the marked route · next bearing ' +
          compassPoint(hud.bearing) +
          '.',
        'field-note'
      )
    );
  if (hasDirections(world) || world.survey?.visits?.bells)
    notes.push(
      paragraph(
        world.bridgeOpen ? 'Sluice bridge: raised and passable.' : 'Sluice bridge: lowered.',
        'field-note'
      )
    );
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
        if (gestures[i]) paragraphs.push(paragraph(gestures[i], 'stage-direction'));
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
      ? compassPoint(h.bearing) + ' · ' + Math.round(h.distance) + ' m by trail'
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
    b.setPointerCapture(e.pointerId);
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
      };
      accumulator = advanceGameClock(
        world,
        dt,
        accumulator,
        input,
        Number(keys.has('PageUp')) - Number(keys.has('PageDown'))
      );
      audio.update(world);
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
        renderer.render(world, world.elapsed);
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
  $('stick').setPointerCapture(stickId);
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
  const commands = {
    KeyM: mapPanel,
    Escape: pause,
    KeyE: () => gameAction('interact'),
    KeyF: () => gameAction('strike'),
    KeyQ: () => gameAction('potion'),
    KeyG: () => gameAction('guard'),
    KeyR: () => gameAction('thrust'),
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
