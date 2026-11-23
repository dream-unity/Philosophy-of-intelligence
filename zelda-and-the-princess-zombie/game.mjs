import { drawFieldMap } from './field-map.mjs';
import { createWorld, tick, act, choose, getHUD, resumeCheckpoint } from './world.mjs';
import { createAudio } from './audio.mjs';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const saveKey = 'xero.forest.journey.v1',
  settingsKey = 'xero.forest.controls.v1';
function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage may be disabled. */
  }
}
function loadJourney() {
  const saved = read(saveKey);
  if (
    saved?.version !== 1 ||
    !Array.isArray(saved.actors) ||
    !saved.actors.length ||
    !Number.isFinite(saved.player?.x) ||
    !Number.isFinite(saved.elapsed) ||
    typeof saved.checkpoint !== 'string'
  )
    return null;
  return { ...createWorld(), ...saved, events: [], mapOpen: false };
}
const preferences = read(settingsKey) || {};
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const options = {
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
const keys = new Set(),
  movement = { forward: 0, strafe: 0 };
const view = $('view'),
  stage = $('stage'),
  title = $('title-screen'),
  overlay = $('overlay');
const audio = createAudio();
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
  write(saveKey, { ...world, events: [], mapOpen: false });
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
    dismiss();
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
    'On a touchscreen, move with your left thumb and drag the view with your right. Tap a tool to use it. Run switches between walking and sprinting.'
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
    'Run',
    'Hold Shift',
    'Interact',
    'E',
    'Swing sword',
    'F or left click',
    'Use potion',
    'Q',
    'Map / pause',
    'M / Esc',
  ]) {
    const cell = document.createElement('span');
    cell.textContent = label;
    table.append(cell);
  }
  const hint = paragraph(
    'Click the scene for mouse look. If your browser keeps the cursor visible, drag the scene to turn.',
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
  const sound = document.createElement('label');
  sound.className = 'setting';
  sound.append('Sound');
  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabled.checked = options.sound;
  enabled.addEventListener('change', toggleSound);
  sound.append(enabled);
  const look = document.createElement('label');
  look.className = 'setting';
  look.append('Look sensitivity');
  const sensitivity = document.createElement('input');
  sensitivity.type = 'range';
  sensitivity.min = '.4';
  sensitivity.max = '2';
  sensitivity.step = '.1';
  sensitivity.value = String(options.sensitivity);
  sensitivity.addEventListener('input', () => {
    options.sensitivity = Number(sensitivity.value);
    write(settingsKey, options);
  });
  look.append(sensitivity);
  const motion = document.createElement('label');
  motion.className = 'setting';
  motion.append('Reduce camera motion');
  const reduced = document.createElement('input');
  reduced.type = 'checkbox';
  reduced.checked = options.reduceMotion;
  reduced.addEventListener('change', () => {
    options.reduceMotion = reduced.checked;
    world.reducedMotion = reduced.checked;
    write(settingsKey, options);
  });
  motion.append(reduced);
  const actions = [
    button(
      'Resume',
      () => {
        audio.unlock();
        dismiss();
      },
      'primary'
    ),
    button('How to play', controls),
    button('Title screen', goHome),
    button('Begin anew', confirmNew),
  ];
  if (document.fullscreenEnabled)
    actions.push(button(document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen', openFullscreen));
  modal('pause', getHUD(world).location, 'Journey paused', [sound, look, motion], actions);
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
  const saved = loadJourney();
  $('start').querySelector('span').textContent = saved ? 'Continue journey' : 'Enter the forest';
  display($('fresh'), Boolean(saved));
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
    [paragraph('Try opening the forest again. Your last position is saved on this device.')],
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
    world.reducedMotion = options.reduceMotion;
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
  drawFieldMap($('field-map'), world);
}
function mapPanel() {
  if (!world || world.dialogue || world.ending || world.sequence) return;
  if (panel === 'map') {
    returnFromPanel();
    return;
  }
  if (panel) return;
  act(world, 'map');
  const canvas = document.createElement('canvas');
  canvas.id = 'field-map';
  canvas.setAttribute('aria-label', 'Map showing the road north, your position and nearby landmarks.');
  const legend = document.createElement('div');
  legend.className = 'map-key';
  for (const [label, color] of [
    ['You', '#fff4d0'],
    ['Castle road', '#ddbb79'],
    ...(world.hasMap ? [['Pale trail', '#c8e1bf']] : []),
    ...(world.milestones.ridge ? [['The host', '#c78f77']] : []),
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
      canvas,
      legend,
      paragraph(
        hud.location +
          ' · ' +
          Math.round(hud.distance) +
          ' m to ' +
          (world.hasMap && !world.antidote ? 'the Moonwell.' : 'Princess Xero.'),
        'field-note'
      ),
    ],
    [button('Fold map', returnFromPanel)]
  );
  drawMap();
}
$('map-button').addEventListener('click', mapPanel);
function syncStory() {
  if (!world) return;
  if (world.ending && endingRef !== world.ending) {
    const ending = world.ending;
    endingRef = ending;
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
      const sign = document.createElement('b');
      sign.setAttribute('aria-hidden', 'true');
      sign.textContent = ['I', 'II', 'III'][i] || '';
      b.prepend(sign);
      return b;
    });
    if (!actions.length) actions.push(button('Continue', returnFromPanel, 'primary'));
    modal('dialogue', d.kind === 'witch' ? 'Lanternwood' : '', d.speaker, paragraphs, actions, {
      closable: d.kind !== 'banquet',
    });
    save();
  }
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
  const dir = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
    ((Math.round(world.player.yaw / (Math.PI / 4)) % 8) + 8) % 8
  ];
  text('heading', dir);
  text('location', h.location);
  text('objective', h.objective);
  text('notice', h.notice);
  text('potion-count', 'Potion · ' + h.potions);
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
document
  .querySelectorAll('[data-act]')
  .forEach((b) => b.addEventListener('click', () => gameAction(b.dataset.act)));
$('sprint').addEventListener('click', () => {
  sprint = !sprint;
  $('sprint').setAttribute('aria-pressed', String(sprint));
});
function frame(timestamp) {
  if (!running || screen !== 'game') return;
  const now = timestamp / 1000,
    dt = clamp(now - lastTime, 0, 0.12);
  lastTime = now;
  if (!document.hidden) {
    if (!panel) {
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
  if (event.pointerType === 'mouse' && view.requestPointerLock) {
    try {
      const req = view.requestPointerLock();
      req?.catch?.(() => {});
    } catch {
      /* Drag-to-look remains available. */
    }
  }
  lookId = event.pointerId;
  lookX = event.clientX;
  lookY = event.clientY;
  try {
    view.setPointerCapture(event.pointerId);
  } catch {}
});
view.addEventListener('pointermove', (event) => {
  if (lookId !== event.pointerId || document.pointerLockElement === view) return;
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
    if (event.code === 'Enter' && !event.repeat && [document.body, title].includes(document.activeElement))
      start();
    return;
  }
  const commands = {
    KeyM: mapPanel,
    Escape: pause,
    KeyE: () => gameAction('interact'),
    KeyF: () => gameAction('strike'),
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
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  stopMotion();
  if (screen === 'game' && !panel) pause();
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
