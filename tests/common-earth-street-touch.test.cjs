const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameRoot = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const script = readFileSync(path.join(gameRoot, 'street.js'), 'utf8');
const site = {
  id: 'harbour',
  lat: -37.8,
  lon: 145,
  residents: ['Mira', 'Idris', 'Avery'].map((name, slot) => ({ name, slot, id: 'r' + slot })),
  buildings: [{ id: 'hall-1', kind: 'hall', name: 'Cooperative Hall', plot: 4 }]
};

function surface(width = 820, height = 500) {
  const pointerEvents = new Map();
  let frame = null;
  let now = 100;
  const canvas = {
    style: {},
    getContext: () => ({}),
    getAttribute: () => null,
    setAttribute() {},
    removeAttribute() {},
    focus() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 8, top: 12, width, height }),
    addEventListener(type, handler) { pointerEvents.set(type, handler); },
    removeEventListener(type) { pointerEvents.delete(type); }
  };
  const documentEvents = new Map();
  let covered = false;
  const runtime = {
    window: { addEventListener() {}, removeEventListener() {} },
    document: {
      hidden: false,
      body: { hasAttribute(name) { return name === 'data-sheet-open' && covered; } },
      addEventListener(name, handler) { documentEvents.set(name, handler); },
      removeEventListener(name) { documentEvents.delete(name); }
    },
    // Offscreen rendering is suspended while the actual input and movement loop still run.
    IntersectionObserver: class {
      constructor(handler) { this.handler = handler; }
      observe() { this.handler([{isIntersecting: false}]); }
      disconnect() {}
    },
    requestAnimationFrame(handler) { frame = handler; return 1; },
    cancelAnimationFrame() { frame = null; },
    matchMedia: () => ({ matches: true })
  };
  vm.runInNewContext(script, runtime);
  const encounters = [], updates = [];
  const hints = [];
  const placed = [], previews = [];
  const street = runtime.window.EarthStreet.mount(canvas, {
    onState: state => updates.push(state),
    onInteract: event => encounters.push(event),
    onHint: text => hints.push(text),
    onPlace: point => placed.push(point.plot),
    onPlotPreview: plot => previews.push(plot)
  });
  street.setSite(site);
  const unit = Math.max(19, Math.min(37, width * .028 + height * .014));
  // The street's public recenter action frames the current player with a margin at the outer kerbs.
  function interactionFrame() {
    const { x, y, zoom } = street.getState();
    const u = unit * zoom;
    const offsetX = (x - 12) * .28;
    const offsetY = (y - 12) * .28;
    const limit = Math.min(1, .15 * width / (Math.abs(offsetX - offsetY) * u || 1), .13 * height / (Math.abs(offsetX + offsetY) * u * .51 || 1));
    return project(x - offsetX * limit, y - offsetY * limit, u);
  }
  function project(cx, cy, u) {
    return (x, y, z = 0) => ({
      x: 8 + width * .5 + (x - y - cx + cy) * u,
      y: 12 + height * .53 + (x + y - cx - cy) * u * .51 - z * u
    });
  }
  function overviewFrame() { return project(12, 12, unit * street.getState().zoom); }
  function pointer(type, point, id = 1, device = 'touch') {
    pointerEvents.get(type)?.({
      type, clientX: point.x, clientY: point.y, pointerId: id,
      pointerType: device, button: 0, preventDefault() {}
    });
  }
  function tap(point, device) {
    pointer('pointerdown', point, 1, device);
    pointer('pointerup', point, 1, device);
  }
  function step() {
    now += 40;
    if (!frame) return;
    const callback = frame;
    frame = null;
    callback(now);
  }
  function finish() {
    for (let i = 0; street.getState().travelling && i < 750; i++) step();
    assert.equal(street.getState().travelling, false, 'player reaches the selected stop');
  }
  function drive() {
    assert(street.toggleVehicle());
    finish();
    assert.equal(street.getState().mode, 'drive');
    street.recenter();
    return interactionFrame();
  }
  function at(x, y, tolerance = .06) {
    const p = street.getState();
    assert(Math.hypot(p.x - x, p.y - y) <= tolerance, `Expected (${x}, ${y}), reached (${p.x}, ${p.y})`);
  }
  function sheet(open) {
    covered = open;
    documentEvents.get('earthsheetchange')?.({type:'earthsheetchange'});
  }
  return { street, sheet, updates, encounters, hints, placed, previews, interactionFrame, overviewFrame, pointer, tap, step, finish, drive, at };
}

test('driving to successive taps preserves their screen coordinates on a tablet', () => {
  const g = surface();
  const screen = g.drive();
  g.tap(screen(11.3, 24.64));
  g.finish();
  g.at(11.3, 24.64);
  g.tap(screen(19.8, 24.68));
  g.finish();
  g.at(19.8, 24.68);
  assert.equal(g.encounters.length, 0);
});

test('steering from the district overview keeps its zoom and allows a visit after parking', () => {
  const g = surface(390, 355);
  g.drive();
  g.street.toggleOverview();
  const previousZoom = g.street.getState().zoom;
  const overview = g.overviewFrame();
  // Deliberately aim at Mira's doorstep pin, not an arbitrary street.
  g.tap(overview(9, 23.04, .9));
  g.finish();
  assert.equal(g.street.getState().zoom, previousZoom);
  assert.equal(g.street.atStop({ type: 'resident', residentId: 'r0' }), true);
  assert.equal(g.encounters.length, 0, 'steering to a kerb does not open another panel');
  assert(g.street.interact());
  assert.equal(g.encounters[0].residentId, 'r0');
});

test('minor touch wobble counts as a tap; deliberate pan and pinch never start a trip', () => {
  const g = surface(390, 355);
  const screen = g.drive();
  const point = screen(12.1, 24.65);
  const wobble = { x: point.x + 7, y: point.y + 1 };
  g.pointer('pointerdown', point);
  g.pointer('pointermove', wobble);
  g.pointer('pointerup', wobble);
  g.finish();
  g.at(12.1, 24.65);
  const parked = g.street.getState();
  const a = { x: 95, y: 120 }, b = { x: 230, y: 140 };
  g.pointer('pointerdown', a);
  g.pointer('pointermove', b);
  g.pointer('pointerup', b);
  g.pointer('pointerdown', a);
  g.pointer('pointerdown', b, 2);
  g.pointer('pointermove', { x: b.x + 45, y: b.y }, 2);
  g.pointer('pointerup', a);
  g.pointer('pointerup', b, 2);
  assert.equal(g.street.getState().travelling, false);
  g.at(parked.x, parked.y);
});

test('selecting the current location cancels the previous driving destination', () => {
  const g = surface();
  const screen = g.drive();
  const start = g.street.getState();
  g.tap(screen(9.7, 24.7));
  assert(g.street.getState().travelling);
  g.tap(screen(start.x, start.y));
  assert.equal(g.street.getState().travelling, false);
  g.finish();
  g.at(start.x, start.y);
});

test('a requested venue action runs once, survives a scene rebuild and yields to a new destination', () => {
  const g = surface();
  const completed = [];
  const ref = { type: 'resident', residentId: 'r1' };
  assert(g.street.focusStop(ref, e => completed.push(e.residentId)));
  g.street.setSite({ ...site, buildings: [] });
  g.finish();
  assert.equal(g.street.atStop(ref), true);
  assert.deepEqual(completed, ['r1']);
  assert.equal(g.encounters.length, 0);
  assert(g.street.focusStop({ type: 'market' }, () => completed.push('cancelled')));
  g.street.focusResident('r0');
  g.finish();
  assert.deepEqual(completed, ['r1']);
  assert.equal(g.encounters[0].residentId, 'r0');
  assert(g.street.focusStop(ref, () => completed.push('hidden')));
  g.street.cancelTravel();
  g.finish();
  assert.deepEqual(completed, ['r1']);
});

test('mouse and pen can still tap to walk to a resident and open the encounter', () => {
  for (const device of ['mouse', 'pen']) {
    const g = surface();
    g.street.toggleOverview();
    const screen = g.overviewFrame();
    g.tap(screen(9, 23.04, .9), device);
    g.finish();
    assert.equal(g.encounters.length, 1, device);
    assert.equal(g.encounters[0].residentId, 'r0');
  }
});

test('taps beside the district stop the van; off-road taps select a nearby lane and explain why', () => {
  const g = surface();
  g.drive();
  g.street.toggleOverview();
  const screen = g.overviewFrame();
  const initial = g.street.getState();
  g.tap(screen(0, 0));
  assert(g.street.getState().travelling);
  g.tap(screen(-2, 12));
  assert.equal(g.street.getState().travelling, false);
  g.at(initial.x, initial.y);
  assert.match(g.hints.at(-1), /inside the district/);
  g.tap(screen(2.5, 2.9));
  assert.match(g.hints.at(-1), /Nearest road/);
  g.finish();
  const { x, y } = g.street.getState();
  assert(Math.abs(x) < .87);
  assert(y > 0 && y < 3);
  g.tap(screen(-.76, 13.65));
  g.finish();
  g.at(-.76, 13.65);
});

test('a cancelled drag, lost pointer capture and an interrupted three-finger gesture leave the next tap usable', () => {
  const g = surface();
  g.drive();
  const left = { x: 100, y: 200 }, middle = { x: 225, y: 240 }, right = { x: 320, y: 200 };
  g.pointer('pointerdown', left, 1);
  g.pointer('pointermove', middle, 1);
  g.pointer('pointercancel', middle, 1);
  g.pointer('pointerup', middle, 1);
  g.pointer('pointerdown', left, 2);
  g.pointer('pointerdown', right, 3);
  g.pointer('pointerdown', middle, 4);
  g.pointer('pointermove', middle, 2);
  g.pointer('lostpointercapture', middle, 2);
  g.pointer('pointerup', middle, 4);
  g.pointer('pointerup', right, 3);
  assert.equal(g.street.getState().travelling, false);
  g.street.recenter();
  const screen = g.interactionFrame();
  g.tap(screen(12.3, 24.4));
  g.finish();
  g.at(12.3, 24.4);
});

test('a named resident can be selected by tapping their visible figure at high zoom', () => {
  const g = surface();
  g.street.focusResident('r0');
  g.finish();
  g.encounters.length = 0;
  g.street.zoomBy(2.1);
  g.street.recenter();
  const screen = g.interactionFrame();
  g.tap(screen(9.47, 22.83, .68));
  assert.equal(g.encounters.at(-1)?.residentId, 'r0');
});

test('resume keeps the vehicle, feet, and camera, with no outstanding travel or venue action', () => {
  const g = surface(390, 355);
  g.drive();
  g.street.toggleOverview();
  const screen = g.overviewFrame();
  g.tap(screen(5.65, 12));
  for (let i = 0; i < 12; i++) g.step();
  assert(g.street.getState().travelling);
  const shot = g.street.snapshotView();
  const fresh = surface(390, 355);
  fresh.street.focusStop({ type: 'resident', residentId: 'r1' }, () => assert.fail('stale arrival'));
  assert(fresh.street.restoreView(JSON.parse(JSON.stringify(shot))));
  const arrived = fresh.street.getState();
  assert.equal(arrived.travelling, false);
  assert.equal(arrived.mode, 'drive');
  fresh.at(shot.player.x, shot.player.y);
  assert.equal(arrived.zoom, g.street.getState().zoom);
  assert.equal(fresh.encounters.length, 0);
  assert(fresh.street.toggleVehicle());
  const parked = fresh.street.snapshotView().van;
  fresh.street.focusResident('r0');
  fresh.finish();
  const onFoot = fresh.street.snapshotView();
  const next = surface(820, 500);
  assert(next.street.restoreView(onFoot));
  assert.equal(next.street.getState().mode, 'walk');
  next.at(onFoot.player.x, onFoot.player.y);
  assert(next.street.toggleVehicle());
  next.finish();
  assert.equal(next.street.getState().mode, 'drive');
  next.at(parked.x, parked.y);
});

test('invalid, other-site or obstructed saved positions are rejected before changing the scene', () => {
  const g = surface();
  const original = g.street.snapshotView();
  for (const patch of [
    { v: 2 }, { site: 'elsewhere' }, { mode: 'fly' },
    { player: { ...original.player, x: NaN } },
    { player: { ...original.player, x: 9, y: 9 } },
    { van: { ...original.van, x: 3, y: 3 } },
    { camera: { ...original.camera, zoom: 999 } },
    { camera: { ...original.camera, centreY: -30 } },
    { camera: { ...original.camera, cameraFollows: 'no' } }
  ]) {
    assert.equal(g.street.restoreView({ ...original, ...patch }), false);
    g.at(original.player.x, original.player.y);
    assert.equal(g.street.getState().mode, 'walk');
  }
  g.street.setSite(null);
  assert.equal(g.street.snapshotView(), null);
  assert.equal(g.street.restoreView(original), false);
});

test('placement and a no-op cancellation preserve an overview chosen by the player', () => {
  const g = surface(390, 355);
  g.drive();
  g.street.toggleOverview();
  const before = JSON.parse(JSON.stringify(g.street.snapshotView().camera));
  g.street.setPlacement(null);
  assert.deepEqual(JSON.parse(JSON.stringify(g.street.snapshotView().camera)), before);
  g.street.setPlacement('garden');
  g.street.setPlacement(null);
  assert.deepEqual(JSON.parse(JSON.stringify(g.street.snapshotView().camera)), before);
});

test('tap the actual companion or use Interact away from venues without walking to their empty doorstep', () => {
  const g = surface();
  const active = { ...site, shift: { residentId: 'r1', week: 1 } };
  g.street.setSite(active);
  const p = g.street.getState();
  const screen = g.interactionFrame();
  // The companion starts next to the player, with their household across town.
  g.tap(screen(p.x + .49, p.y - .36, .5));
  assert.equal(g.street.getState().travelling, false);
  assert.equal(g.encounters.at(-1).residentId, 'r1');
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(2, 5));
  g.finish();
  assert.equal(g.street.getState().nearby, null);
  assert(g.street.interact());
  assert.equal(g.encounters.at(-1).residentId, 'r1');
  assert(g.street.focusMarket());
  g.finish();
  assert.equal(g.encounters.at(-1).type, 'market', 'venue Interact still has priority');
});

test('replacing a venue en route discards its original arrival action', () => {
  const g = surface();
  let arrived = false;
  const hall = { type: 'building', plot: 4, kind: 'hall' };
  assert(g.street.focusStop(hall, () => arrived = true));
  g.step();
  g.street.setSite({ ...site, buildings: [{ id: 'hall-2', plot: 4, kind: 'hall' }] });
  g.finish();
  assert.equal(arrived, false);
});

test('the first finger or pen tap previews a plot, the next confirms it and changing projects clears that selection', () => {
  const g = surface(390, 355);
  for (const device of ['touch', 'pen']) {
    g.street.setPlacement('garden');
    const screen = g.overviewFrame();
    g.tap(screen(3, 3, .66), device);
    g.tap(screen(9, 3, .66), device);
    assert.equal(g.previews.at(-1), 1);
    assert.equal(g.street.getState().plot, 1);
    assert.equal(g.placed.length, 0);
    g.tap(screen(9, 3, .66), device);
    assert.deepEqual(g.placed.splice(0), [1]);
    g.tap(screen(3, 3, .66), device);
    g.street.setPlacement(null);
    g.street.setPlacement('workshop');
    g.tap(screen(3, 3, .66), device);
    assert.equal(g.placed.length, 0);
    g.street.interact();
    assert.deepEqual(g.placed.splice(0), [0]);
    g.tap(screen(15, 3, .66), 'mouse');
    assert.deepEqual(g.placed.splice(0), [2]);
    g.street.setPlacement(null);
  }
});

test('tapping a passing pedestrian directs the player to a real contact or active delivery', () => {
  const g = surface();
  g.street.toggleOverview();
  let screen = g.overviewFrame();
  const passing = screen(2.03, 6.98, .54);
  g.tap(passing);
  assert.match(g.hints.at(-1), /Nearest resident: (Mira|Idris|Avery)/);
  assert.equal(g.encounters.length, 0);
  g.street.setSite({ ...site, delivery: { residentId: 'r1' } });
  g.tap(passing);
  assert.match(g.hints.at(-1), /parcel is for Idris/);
  assert.equal(g.street.getState().travelling, false);
});

test('taking over a tap route with the D-pad immediately updates the Stop or Brake button state', () => {
  const g = surface();
  const screen = g.drive();
  g.tap(screen(11.3, 24.64));
  assert.equal(g.updates.at(-1).travelling, true);
  assert(g.street.holdMove('right'));
  assert.equal(g.updates.at(-1).travelling, false);
  g.street.releaseMove('right');
});

test('opening a sheet freezes an in-progress trip until dismissal, without catch-up or stale inputs', () => {
  const g = surface();
  const arrivals = [];
  assert(g.street.focusStop({ type: 'resident', residentId: 'r1' }, e => arrivals.push(e.residentId)));
  for (let i = 0; i < 5; i++) g.step();
  const before = g.street.getState();
  assert(before.travelling);
  g.sheet(true);
  for (let i = 0; i < 750; i++) g.step();
  g.at(before.x, before.y, 0);
  assert.deepEqual(arrivals, []);
  assert.equal(g.street.holdMove('right'), false);
  g.sheet(false);
  g.step();
  const resumed = g.street.getState();
  assert(Math.hypot(resumed.x - before.x, resumed.y - before.y) < .2);
  g.finish();
  assert.deepEqual(arrivals, ['r1']);
  g.street.holdMove('left');
  g.step();
  g.sheet(true);
  const stopped = g.street.getState();
  g.sheet(false);
  for (let i = 0; i < 20; i++) g.step();
  g.at(stopped.x, stopped.y, 0);
});
