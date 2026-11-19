const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameRoot = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const script = readFileSync(path.join(gameRoot, 'street.js'), 'utf8');
const surroundingsScript = readFileSync(path.join(gameRoot, 'town-surroundings.js'), 'utf8');
const constructionScript = readFileSync(path.join(gameRoot, 'construction.js'), 'utf8');
const agencyScript = readFileSync(path.join(gameRoot, 'agency.js'), 'utf8');
const shiftScript = readFileSync(path.join(gameRoot, 'shifts.js'), 'utf8');
const site = {
  id: 'harbour',
  lat: -37.8,
  lon: 145,
  residents: ['Mira', 'Idris', 'Avery'].map((name, slot) => ({ name, slot, id: 'r' + slot })),
  buildings: [{ id: 'hall-1', kind: 'hall', name: 'Cooperative Hall', plot: 4 }]
};

function surface(width = 820, height = 500, {animated=false, links=null, deferFrames=false, lives=false}={}) {
  const pointerEvents = new Map();
  let frame = null;
  let now = 100, timerId = 0;
  const timers = new Map();
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
    performance: { now: () => now },
    setTimeout(callback, delay) {
      timers.set(++timerId, {callback, due: now + delay});
      return timerId;
    },
    clearTimeout(id) { timers.delete(id); },
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
    matchMedia: query => ({ matches: !animated||!query.includes('prefers-reduced-motion') })
  };
  vm.runInNewContext(readFileSync(path.join(gameRoot,'fisheries.js'),'utf8'),runtime);
  if(links)runtime.window.CommonEarthSim={productiveLinks:typeof links==='function'?links:()=>links};
  if(lives)for(const file of ['personas.js','careers.js','autonomy.js'])vm.runInNewContext(readFileSync(path.join(gameRoot,file),'utf8'),runtime);
  vm.runInNewContext(surroundingsScript, runtime);
  vm.runInNewContext(constructionScript, runtime);
  vm.runInNewContext(agencyScript,runtime);
  vm.runInNewContext(script, runtime);
  const encounters = [], updates = [];
  const hints = [], handcarts = [];
  const placed = [], previews = [], assignments = [], targetLists = [];
  const street = runtime.window.EarthStreet.mount(canvas, {
    onState: state => updates.push(state),
    onHandcart: () => handcarts.push(true),
    onInteract: event => encounters.push(event),
    onHint: text => hints.push(text),
    onPlace: point => placed.push(point.plot),
    onPlotPreview: plot => previews.push(plot),
    onAssignWorksite: jobId => assignments.push(jobId),
    onChooseCrewTarget: () => targetLists.push(true)
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
  function key(key) {
    pointerEvents.get('keydown')?.({ key, preventDefault() {} });
  }
  function step() {
    now += 40;
    for (const [id, timer] of [...timers]) {
      if (timer.due > now || !timers.delete(id)) continue;
      timer.callback();
    }
    if (deferFrames || !frame) return;
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
  function host(residentId) {
    vm.runInNewContext(shiftScript,runtime);
    const active = { ...site, food:8, funds:12, materials:9, delivery:{residentId:'r1'} };
    const shifts=runtime.window.EarthShifts;
    active.shift=shifts.start({sites:[active],week:1,effort:3},active,residentId).shift;
    street.setSite(active);
    return {active,stops:shifts.view(active,1).stops};
  }
  return { street, sheet, host, updates, encounters, hints, handcarts, placed, previews, assignments, targetLists, interactionFrame, overviewFrame, pointer, tap, key, step, finish, drive, at };
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

test('tapping a passing neighbour meets that same person in walking range without redirecting to a parcel', () => {
  const g = surface();
  g.street.setSite({ ...site, delivery: { residentId: 'r1' } });
  g.street.toggleOverview();
  const passing = g.overviewFrame()(2.03,6.98,.54);
  g.tap(passing);
  assert.ok(g.street.getState().travelling);
  assert.equal(g.encounters.length,0);
  g.finish();
  const visit=g.encounters.at(-1);
  assert.equal(visit.npcId,'walker-0');
  assert.equal(visit.label,'Noor');
  assert.ok(g.street.meeting(visit));
  assert.equal(g.street.meeting({type:'resident',residentId:'r1'}),null);
});

test('all pedestrians and the delivery driver can be met from the roster, and changing actor moves control to their body',()=>{
  const g=surface();
  const people=g.street.localPeople();
  assert.equal(people.length,6);
  for(const person of people){
    assert.ok(g.street.focusStop(person),person.label);
    g.finish();
    assert.equal(g.encounters.at(-1).npcId,person.npcId);
    assert.ok(g.street.meeting(person),person.label);
  }
  const saved=g.street.snapshotView();
  const place={...site,agency:{actor:'r2',meals:[],stewardPosition:{x:12,y:12}}};
  g.street.setSite(place);
  assert.equal(g.street.getState().actor,'r2');
  assert.ok(!g.street.restoreView(saved));
  assert.equal(g.street.focusResident('r2'),false);
  assert.ok(g.street.localPeople().some(p=>p.npcId==='steward'));
  assert.ok(g.street.focusStop({type:'npc',npcId:'steward'}));
  g.finish();
  assert.equal(g.street.meeting({type:'npc',npcId:'steward'}).actor,'r2');
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

const workshop = {
  id: 'workshop-1', name: 'Repair workshop', kind: 'workshop', scope: 'street', plot: 8,
  stageIndex: 1, stage: 'Timber framing', progress: .52, workers: ['r1'], workerNames: ['Idris']
};
function onCrew(activity, x, y, jobId = workshop.id) {
  return { residentId: 'r1', name: 'Idris', slot: 1, activity, x, y, jobId,
    travelling: ['travelling', 'commuting', 'returning'].includes(activity) };
}

test('a progress update preserves the camera and journey; only an explicit Watch changes the view', () => {
  const g = surface();
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(6, 6));
  assert(g.street.getState().travelling);
  const snapshot = () => JSON.stringify(g.street.snapshotView());
  const enRoute = snapshot();
  g.street.setConstruction({ jobs: [workshop], workers: [onCrew('travelling', 18, 12)] });
  g.street.setConstruction({ jobs: [{ ...workshop, progress: .61 }], workers: [onCrew('building', 15, 17.04)] });
  assert.equal(snapshot(), enRoute);
  assert(g.street.getState().travelling);
  assert.equal(g.street.focusWorksite('absent'), false);
  assert(g.street.focusWorksite(workshop.id));
  const watch = g.street.snapshotView();
  assert.equal(watch.camera.centreX, 15);
  assert.equal(watch.player.x, JSON.parse(enRoute).player.x);
  assert(g.street.getState().travelling);
  g.finish();
  g.at(6, 6);
});

test('a finger can inspect a foundation or order selected residents without accidentally moving or building', () => {
  const g = surface(390, 355);
  const view = { jobs: [workshop], workers: [onCrew('building', 14.4, 17.04)] };
  g.street.setConstruction(view);
  g.street.toggleOverview();
  let screen = g.overviewFrame();
  g.tap(screen(15, 15));
  assert.equal(g.encounters.at(-1)?.jobId, workshop.id);
  assert.equal(g.encounters.at(-1)?.type, 'construction');
  assert.equal(g.street.getState().travelling, false);
  g.street.setCrewSelection(['r0', 'r1']);
  assert(g.street.interact());
  for(const code of ['e','Enter',' '])g.key(code);
  assert.equal(g.targetLists.length,4);
  g.tap(screen(6, 6));
  g.tap(screen(9, 23.04, .9));
  assert.equal(g.street.getState().travelling, false);
  assert.equal(g.encounters.length, 1);
  assert.deepEqual(g.assignments, []);
  const a = screen(15, 15), b = { x: a.x + 40, y: a.y - 9 };
  g.pointer('pointerdown', a);
  g.pointer('pointermove', b);
  g.pointer('pointerup', b);
  assert.deepEqual(g.assignments, []);
  g.street.recenter();
  g.street.toggleOverview();
  screen = g.overviewFrame();
  g.tap(screen(15, 15));
  assert.deepEqual(g.assignments, [workshop.id]);
  g.street.setCrewSelection([]);
  g.street.setPlacement('garden');
  g.tap(g.overviewFrame()(15, 15, .66));
  assert.match(g.hints.at(-1), /vacant/);
  assert.deepEqual(g.placed, []);
  g.street.setConstruction({ jobs: [], workers: [] });
  g.tap(g.overviewFrame()(15, 15, .66));
  assert.equal(g.previews.at(-1), 8);
  g.tap(g.overviewFrame()(15, 15, .66));
  assert.deepEqual(g.placed, [8]);
});

test('People and parcel visits find a worker at their actual position, including after their project opens mid-trip', () => {
  const ref = { type: 'resident', residentId: 'r1' };
  for (const mode of ['walk', 'drive']) {
    const g = surface();
    if (mode === 'drive') g.drive();
    g.street.setConstruction({ jobs: [workshop], workers: [onCrew('building', 15, 17.04)] });
    const arrivals = [];
    assert(g.street.focusStop(ref, p => arrivals.push(p)));
    for (let i = 0; i < 8; i++) g.step();
    const workplace = { type: 'market', label: 'Market exchange', x: 9, y: 5.04 };
    g.street.setConstruction({ jobs: [], workers: [{ ...onCrew('commuting', 9, 6, null), workplace, occupation: 'exchange' }] });
    g.street.setConstruction({ jobs: [], workers: [{ ...onCrew('working', 9, 5.04, null), workplace, occupation: 'exchange' }] });
    g.finish();
    assert.equal(arrivals.length, 1, mode);
    assert.equal(arrivals[0].residentId, 'r1');
    assert.equal(arrivals[0].x, 9);
    assert.equal(arrivals[0].y, 5.04);
    assert.equal(g.street.atStop(ref), true);
    assert.equal(g.street.getState().mode, mode);
  }
});

test('tapping a builder or a resident taking a short break starts their own conversation', () => {
  for (const activity of ['building', 'resting', 'returning']) {
    const g = surface();
    g.street.toggleOverview();
    const jobs = activity === 'building' ? [workshop] : [];
    const worker = onCrew(activity, 18, 12, jobs.length ? workshop.id : null);
    g.street.setConstruction({ jobs, workers: [worker] });
    g.tap(g.overviewFrame()(18, 12, .48));
    g.finish();
    assert.equal(g.encounters.length, 1, activity);
    assert.equal(g.encounters[0].residentId, 'r1', activity);
    assert.equal(g.encounters[0].x, 18);
    assert.equal(g.encounters[0].y, 12);
  }
});

test('a new timber frame diverts only a crossing foot journey, and a player already on the plot can leave it', () => {
  const g = surface();
  function startAt(x, y) {
    const shot = g.street.snapshotView();
    assert(g.street.restoreView({ ...shot, player: { ...shot.player, x, y } }));
  }
  startAt(15, 12.6);
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(15, 18.8));
  assert(g.street.getState().travelling);
  const camera = JSON.stringify(g.street.snapshotView().camera);
  const view = { jobs: [workshop], workers: [] };
  g.street.setConstruction(view);
  assert.equal(JSON.stringify(g.street.snapshotView().camera), camera);
  let steps = 0;
  while (g.street.getState().travelling && steps++ < 300) {
    g.step();
    const { x, y } = g.street.getState();
    assert(!(Math.abs(x - 15) < 1.23 && Math.abs(y - 15) < 1.02), 'frame remains outside the walking route');
  }
  g.at(15, 18.8);
  g.street.setConstruction({ jobs: [], workers: [] });
  startAt(15, 15);
  g.street.setConstruction(view);
  g.at(15, 15, 0);
  assert(g.street.focusResident('r1'));
  g.finish();
  assert.equal(g.street.atStop({ type: 'resident', residentId: 'r1' }), true);
});

test('crew orders frame distant active sites together, preserve an already suitable view, and return to the earlier camera on cancel', () => {
  const width=390,height=355,g=surface(width,height);
  const district={ ...workshop,id:'north',plot:0 },city={ ...workshop,id:'eastern-gateway',scope:'city',kind:'homes',precinct:2,plot:undefined };
  g.street.setConstruction({ jobs:[district,city],workers:[] });
  g.street.zoomBy(2.1);
  const before=g.street.snapshotView();
  g.street.setCrewSelection(['r0','r1']);
  assert(g.street.frameCrewTargets());
  const framed=g.street.snapshotView();
  assert(framed.camera.zoom<before.camera.zoom);
  assert.deepEqual(framed.player,before.player);
  assert.equal(g.street.getState().travelling,false);
  const u=Math.max(19,Math.min(37,width*.028+height*.014))*framed.camera.zoom;
  for(const [id,x,y] of [['north',3,3],['eastern-gateway',25.07,12]]){
    const target={
      x:8+width*.5+(x-y-framed.camera.centreX+framed.camera.centreY)*u,
      y:12+height*.53+(x+y-framed.camera.centreX-framed.camera.centreY)*u*.51
    };
    assert(target.x>30&&target.x<width-16);
    assert(target.y>28&&target.y<height-16);
    g.tap(target);
    assert.equal(g.assignments.at(-1),id);
  }
  g.street.frameCrewTargets();
  assert.deepEqual(g.street.snapshotView().camera,framed.camera);
  g.street.setCrewSelection([]);
  assert.deepEqual(g.street.snapshotView().camera,before.camera);
  g.at(before.player.x,before.player.y,0);
});

test('ending a shift can hand off the companion at their actual walking or riding position', () => {
  const g=surface();
  assert.equal(g.street.getState().companion,null);
  g.street.setSite({...site,shift:{residentId:'r1',week:1}});
  const walking=g.street.getState();
  assert.equal(walking.companion.residentId,'r1');
  assert(Math.hypot(walking.x-walking.companion.x,walking.y-walking.companion.y)<1.5);
  g.drive();
  const riding=g.street.getState();
  assert.equal(riding.companion.x,riding.x);
  assert.equal(riding.companion.y,riding.y);
  g.street.setSite(site);
  assert.equal(g.street.getState().companion,null);
});

test('a workshop being dismantled stays reserved, blocks its original footprint, and opens the salvage inspector throughout', () => {
  const g=surface(),real={id:'existing',plot:8,kind:'workshop',name:'Repair workshop'};
  const job={ ...workshop,id:'decommission-8',kind:'dismantle',name:'Dismantle repair workshop',original:real };
  g.street.setSite({...site,buildings:[...site.buildings,real]});
  g.street.setSite(site);
  g.street.toggleOverview();
  for(const [stage,progress] of [[0,.05],[1,.52],[2,.93]]){
    g.street.setConstruction({jobs:[{...job,stageIndex:stage,progress}],workers:[]});
    g.tap(g.overviewFrame()(15,15));
    const event=g.encounters.at(-1);
    assert.equal(event.type,'construction');
    assert.equal(event.kind,'dismantle');
    assert.equal(event.jobId,job.id);
    const shot=g.street.snapshotView();
    assert.equal(g.street.restoreView({...shot,player:{...shot.player,x:16.5,y:15}}),false);
    g.street.setPlacement('hall');
    g.tap(g.overviewFrame()(15,15,.66));
    assert.match(g.hints.at(-1),/vacant/);
    g.street.setPlacement(null);
  }
  g.street.setConstruction({jobs:[],workers:[]});
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{...shot.player,x:16.5,y:15}}));
  g.street.setPlacement('hall');
  g.tap(g.overviewFrame()(15,15,.66));
  assert.equal(g.previews.at(-1),8);
});

test('a school lead or council steward can be reached at their actual post and while commuting', () => {
  const g=surface(),ref={type:'resident',residentId:'r1'};
  for(const [physicalDuty,role,travelling,x,y] of [['school','Teacher',true,12,6],['council','Council steward',false,9,11.04]]){
    const w={...onCrew('busy',x,y,null),physicalDuty,role,travelling,workplace:{type:'building',label:'Hall',x:9,y:11.04}};
    g.street.setConstruction({jobs:[],workers:[w]});
    assert(g.street.focusStop(ref));
    g.finish();
    const event=g.encounters.at(-1);
    assert.equal(event.residentId,'r1');
    assert.equal(event.x,x);
    assert.equal(event.y,y);
    assert(g.hints.some(h=>h.includes(role)));
  }
});

test('a household shift requires visiting the actual door when its host is alongside you or its neighbour works elsewhere', () => {
  const g=surface(),{active,stops}=g.host('r0');
  const companion={type:'resident',residentId:'r0'},neighbour={type:'resident',residentId:'r1'};
  const home=stops.find(s=>s.id==='meaning').venue,household=stops.find(s=>s.id==='care').venue;
  assert(home.doorstep&&household.doorstep);
  assert(g.street.atStop(companion));
  assert.equal(g.street.atStop(home),false);
  const crew={jobs:[workshop],workers:[onCrew('building',15,17.04)]};
  g.street.setConstruction(crew);
  assert(g.street.focusResident('r1'));
  g.finish();
  assert(g.street.atStop(neighbour));
  assert.equal(g.street.atStop(household),false);
  assert.equal(g.encounters.at(-1).actionId,'courier:deliver:r1');
  assert.equal(g.encounters.at(-1).doorstep,undefined);
  const visits=[];
  assert(g.street.focusStop(household,p=>visits.push(p)));
  g.step();
  g.street.setSite({...active,buildings:[]});
  g.street.setConstruction({jobs:[],workers:[onCrew('commuting',12,6,null)]});
  g.finish();
  assert.equal(visits.length,1);
  assert.equal(visits[0].doorstep,true);
  assert.equal(visits[0].actionId,undefined);
  g.at(21,17.04);
  assert(g.street.interact());
  assert.equal(g.encounters.at(-1).doorstep,true);
  assert.equal(g.street.atStop(neighbour),false);
  assert(g.street.focusStop(home,p=>visits.push(p)));
  assert.equal(visits.length,1,'travelling with the host does not instantly visit their house');
  g.finish();g.at(9,23.04);
  assert.equal(visits[1].doorstep,true);
  assert(g.street.focusResident('r0'));
  assert.equal(g.encounters.at(-1).doorstep,undefined);
});

test('touch a moored boat, steer in water, restore the view, and return to the same landing', () => {
  const g=surface();
  g.street.setSite({...site,water:true});
  const shore=g.interactionFrame();
  g.tap(shore(16.6,26.85,-.34));
  assert(g.street.getState().boarding);
  g.finish();
  assert.equal(g.street.getState().mode,'boat');
  g.at(16.6,26.85);
  g.street.recenter();
  g.tap(g.interactionFrame()(13.6,33.5,-.44));
  g.finish();g.at(13.6,33.5);
  const snapshot=g.street.snapshotView();
  assert(g.street.move('left'));
  assert(g.street.restoreView(snapshot));
  g.at(13.6,33.5);
  assert.equal(g.street.toggleVehicle(),false);
  assert(g.street.toggleBoat());
  assert(g.street.getState().returning);
  g.finish();
  assert.equal(g.street.getState().mode,'walk');
  g.at(15,24.53);
});

test('boat button is unavailable inland and can cancel boarding or a return to shore', () => {
  const g=surface();
  assert.equal(g.street.getState().waterfront,false);
  assert.equal(g.street.toggleBoat(),false);
  g.street.setSite({...site,water:true});
  g.street.toggleBoat();assert(g.street.getState().boarding);
  g.street.toggleBoat();assert.equal(g.street.getState().travelling,false);
  assert.equal(g.street.getState().mode,'walk');
  g.drive();
  g.street.toggleBoat();g.finish();assert.equal(g.street.getState().mode,'boat');
  const before=g.street.getState();
  g.street.toggleBoat();g.street.toggleBoat();g.finish();
  assert.equal(g.street.getState().mode,'boat');g.at(before.x,before.y);
});

test('a finished fishing dock adds a working berth and removing it lands its occupant', () => {
  const g=surface();
  const dock={id:'dock',kind:'fishingDock',name:'Fishing dock',plot:0};
  const active={...site,water:true,buildings:[dock]};
  g.street.setSite(active);g.tap(g.interactionFrame()(8,27.9,-.34));g.finish();
  assert.equal(g.street.getState().mode,'boat');g.at(8,27.9);
  g.street.setSite({...active,buildings:[]});
  assert.equal(g.street.getState().mode,'walk');g.at(6.5,24.53);
});

test('both Stone Town harbour boats can leave their moorings and return after a district visit', () => {
  const g=surface();
  const stone={...site,id:'stone',lat:-6.163,lon:39.189,water:false};
  for(const [x,y,landingX] of [[14.32,30.44,11.4],[21.65,29.61,22.4]]){
    g.street.setSite(stone);assert(g.street.getState().waterfront);
    g.street.recenter();g.tap(g.interactionFrame()(x,y,-.34));g.finish();g.at(x,y);
    assert.equal(g.street.getState().mode,'boat');
    assert.equal(g.street.focusResident(stone.residents[0].id),false);
    g.street.setSite(site);assert.equal(g.street.getState().waterfront,false);
    g.street.setSite(stone);assert.equal(g.street.getState().mode,'boat');
    g.street.interact();g.finish();g.at(landingX,24.53);
  }
});

test('a companion stays aboard when the boat moves and steps ashore when it docks', () => {
  const g=surface(),{active}=g.host('r0');
  g.street.setSite({...active,water:true});g.key('b');g.finish();
  g.street.recenter();g.tap(g.interactionFrame()(17.5,34,-.44));g.finish();
  const rider=g.street.getState();
  assert.equal(rider.mode,'boat');
  assert.equal(g.street.meeting({type:'resident',residentId:'r0'}).companion,'r0');
  assert.equal(g.street.meeting({type:'resident',residentId:'r1'}),null);
  assert.equal(rider.companion.x,rider.x);assert.equal(rider.companion.y,rider.y);
  const saved=g.street.snapshotView();
  assert.equal(g.street.restoreView({...saved,player:{...saved.player,y:16}}),false);
  assert.equal(g.street.getState().mode,'boat');
  g.street.interact();g.finish();
  const awake=g.street.getState();
  assert.equal(awake.mode,'walk');
  assert(awake.companion.y<25 && Math.hypot(awake.companion.x-awake.x,awake.companion.y-awake.y)<1.2);
});

test('sailing offshore preserves the camera anchor under pinch, zoom and pan', () => {
  const g=surface();
  g.street.setSite({...site,water:true});
  g.street.toggleBoat();g.finish();
  g.street.recenter();g.tap(g.interactionFrame()(15,38,-.44));g.finish();g.street.recenter();
  const before=g.street.snapshotView().camera;
  assert(before.centreY>28);
  const centre={x:410,y:265};
  g.street.zoomBy(1.12,centre);
  const after=g.street.snapshotView().camera;
  assert(Math.abs(before.centreY-after.centreY)<.01);
  g.pointer('pointerdown',centre);g.pointer('pointermove',{x:431,y:265});g.pointer('pointerup',{x:431,y:265});
  assert(Math.abs(g.street.snapshotView().camera.centreY-after.centreY)<1);
  g.pointer('pointerdown',{x:360,y:265},1);g.pointer('pointerdown',{x:460,y:265},2);
  g.pointer('pointermove',{x:480,y:265},2);g.pointer('pointerup',{x:480,y:265},2);g.pointer('pointerup',{x:360,y:265},1);
  assert(g.street.snapshotView().camera.centreY>28);
});

test('cast feedback applies only to the occupied boat and stops it for the haul', () => {
  const g=surface();
  g.street.setSite({...site,water:true});
  assert.equal(g.street.showCatch(site.id),false);
  g.street.toggleBoat();g.finish();
  g.street.recenter();g.tap(g.interactionFrame()(17.3,31.7,-.44));
  assert(g.street.getState().travelling);
  assert.equal(g.street.showCatch('another-community'),false);
  assert(g.street.getState().travelling);
  assert(g.street.showCatch(site.id));assert.equal(g.street.getState().travelling,false);
  assert.equal(g.street.getState().mode,'boat');
});

test('restarting a waterfront community resets its boat and leaves another district’s van parked where it was', async () => {
  const runtime={structuredClone};
  vm.runInNewContext(readFileSync(path.join(gameRoot,'simulation.js'),'utf8'),runtime);
  const sim=runtime.CommonEarthSim.create({storage:null});
  const harbour={name:'Harbour',water:true,lat:0,lon:120};
  assert((await sim.perform('found',harbour)).ok);
  const harbourId=sim.active().id;
  assert((await sim.perform('found',{name:'Mainland',water:false,lat:-33,lon:145})).ok);
  const mainlandId=sim.active().id;
  const g=surface();
  g.street.setSite(sim.active());g.drive();
  const parked=g.street.snapshotView();
  assert((await sim.perform('visit',harbourId)).ok);
  g.street.setSite(sim.active());
  const fresh=g.street.snapshotView();
  assert(g.street.toggleBoat());g.finish();assert(g.street.move('down'));
  const offshore=g.street.snapshotView();
  assert.equal(offshore.mode,'boat');
  // A world map or another tab can manage the district while Street is hidden.
  assert((await sim.perform('manageSite',harbourId,'restart')).ok);
  g.street.setSite(sim.active());
  assert.equal(g.street.getState().mode,'walk');
  g.at(fresh.player.x,fresh.player.y);
  assert.equal(g.street.restoreView(offshore),false);
  assert(g.street.toggleBoat());g.finish();
  const secondTrip=g.street.snapshotView();
  assert((await sim.perform('visit',mainlandId)).ok);
  g.street.setSite(sim.active());
  assert.equal(g.street.getState().mode,'drive');
  g.at(parked.player.x,parked.player.y);
  // Restarting a previously visited district also drops its remembered vehicle.
  assert((await sim.perform('manageSite',harbourId,'restart')).ok);
  assert((await sim.perform('visit',harbourId)).ok);
  g.street.setSite(sim.active());
  assert.equal(g.street.getState().mode,'walk');
  assert.equal(g.street.restoreView(secondTrip),false);
  g.at(fresh.player.x,fresh.player.y);
  sim.destroy();
});

test('refounding a deleted waterfront at the same coordinates rejects its earlier trip and preserves legacy snapshots', async () => {
  const runtime={structuredClone};
  vm.runInNewContext(readFileSync(path.join(gameRoot,'simulation.js'),'utf8'),runtime);
  const sim=runtime.CommonEarthSim.create({storage:null});
  const point={name:'Lagoon',water:true,lat:4,lon:112};
  assert((await sim.perform('found',point)).ok);
  const id=sim.active().id;
  const g=surface();
  const legacy={...sim.active()};delete legacy.foundingRevision;
  g.street.setSite(legacy);
  assert(g.street.toggleBoat());g.finish();
  const legacyTrip=g.street.snapshotView();
  assert.equal(legacyTrip.site,id+'/4/112');
  assert(g.street.restoreView(legacyTrip));
  g.street.setSite(sim.active());
  assert(g.street.toggleBoat());g.finish();
  const saved=g.street.snapshotView();
  assert((await sim.perform('manageSite',id,'delete')).ok);
  assert((await sim.perform('found',point)).ok);
  assert.equal(sim.active().id,id);
  g.street.setSite(sim.active());
  assert.equal(g.street.getState().mode,'walk');
  assert.equal(g.street.restoreView(saved),false);
  assert.equal(g.street.restoreView(legacyTrip),false);
  const disk=JSON.stringify(sim.state),reopened=runtime.CommonEarthSim.create({storage:null,snapshot:disk});
  assert.equal(reopened.active().foundingRevision,sim.active().foundingRevision);
  sim.destroy();reopened.destroy();
});

test('an opaque sail pixel and its mirrored image use the same compact touch mask', () => {
  let reads=0;
  const runtime={
    window:{},Image:class {set src(url){this.onload();}},
    document:{createElement:()=>({getContext:()=>({
      drawImage(){},
      getImageData(_x,_y,w,h){
        reads++;
        const data=new Uint8ClampedArray(w*h*4);
        data[(151*w+33)*4+3]=255;
        return {data};
      }
    })})}
  };
  vm.runInNewContext(surroundingsScript,runtime);
  const art=runtime.window.EarthTownSurroundings;
  art.onReady(()=>{});
  const x=(33.5-109.62)*.01949,y=(151.5-209.79)*.01949;
  assert(art.boatContains('lateen',x*1.09,y*1.09,1.09,false));
  assert(art.boatContains('lateen',-x*.56,y*.56,.56,true));
  assert(!art.boatContains('lateen',0,y*.56,.56,true),'clear water stays tappable');
  assert.equal(reads,1);
});

test('the stern and jetty end board the intended skiff in compact views', () => {
  for(const [w,h] of [[390,355],[760,225]]) {
    const g=surface(w,h);g.street.setSite({...site,water:true});
    g.tap(g.interactionFrame()(16.6-.8,26.85+.18,-.35));g.finish();
    assert.equal(g.street.getState().mode,'boat');
    g.at(16.6,26.85);
    g.street.toggleBoat();g.finish();g.street.recenter();
    g.tap(g.interactionFrame()(9,27.25,-.08));g.finish();
    assert.equal(g.street.getState().mode,'boat');
    g.at(10.6,26.85);
  }
});

test('a park bench can be reached, used, saved and left by moving', () => {
  const g=surface();
  assert(g.street.useSeat());
  assert(g.street.getState().travelling);
  assert.equal(g.street.getState().seated,false,'sitting requires reaching the bench');
  g.finish();
  assert.equal(g.street.getState().seated,true);
  const seated=g.street.snapshotView();
  assert(seated.seat);
  const away=surface();
  assert(away.street.restoreView(JSON.parse(JSON.stringify(seated))));
  assert(away.street.getState().seated);
  assert(away.street.interact());
  assert.equal(away.street.getState().seated,false);
  assert(away.street.useSeat());
  away.finish();
  away.street.move('down');
  assert.equal(away.street.getState().seated,false);
  g.street.setSite({...site,id:'other-district'});
  assert.equal(g.street.getState().seated,false);
  g.street.setSite(site);
  assert.equal(g.street.getState().seated,true,'returning restores that community’s posture');
});

test('tapping a bench approaches its seat; reading a board uses an in-person range', () => {
  const g=surface();
  g.street.toggleOverview();
  const map=g.overviewFrame();
  // The fourth block of the first row is a public park with both seats and a kiosk.
  g.tap(map(21.42,3.85,.2));
  assert(g.street.getState().travelling);
  g.finish();
  assert(g.street.getState().seated);
  g.street.toggleOverview();g.street.toggleOverview();
  g.tap(g.overviewFrame()(21.07,2.6,.56));
  assert.equal(g.street.getState().seated,false);
  g.finish();
  assert(g.hints.some(h=>/Park noticeboard · /.test(h)));
  const {x,y}=g.street.getState();
  assert(Math.hypot(x-21.07,y-2.6)<1.2);
});

test('the lamp post rejects a saved position and the D-pad cannot cut through it', () => {
  const g=surface();
  const snap=g.street.snapshotView();
  const at=(x,y)=>g.street.restoreView({...snap,player:{...snap.player,x,y}});
  // The .48-unit diagonal step would jump the .15-unit base if only its endpoint were tested.
  assert.equal(at(5.06,4.94),false);
  assert(at(4.89,4.77));
  g.street.move('down');
  const p=g.street.getState();
  assert(p.x<=4.891||p.y<=4.771,'the avatar slides along one side instead of crossing the post');
  assert.equal(at(21.42,3.85),false,'bench seat');
  assert.equal(at(21.07,2.6),false,'kiosk');
  assert.equal(at(snap.van.x,snap.van.y),false,'parked van');
  assert(g.street.toggleVehicle());g.finish();
  assert.equal(g.street.getState().mode,'drive','physical sides still allow boarding');
});

test('a narrow post between two route nodes is avoided for the full tap-to-walk path', () => {
  const g=surface();
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{...shot.player,x:3.75,y:4.94}}));
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(7.62,4.94));
  assert(g.street.getState().travelling);
  let count=0;
  while(g.street.getState().travelling&&count++<250){
    g.step();const {x,y}=g.street.getState();
    assert(!(Math.abs(x-5.06)<.17&&Math.abs(y-4.94)<.17),'route avoids the lamp base');
  }
  g.at(7.62,4.94);
});

test('a foot journey bends around a waiting delivery vehicle without boarding or phoning its driver', () => {
  const g=surface();
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{...shot.player,x:19.1,y:18.29}}));
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(23.4,18.29));
  assert(g.street.getState().travelling);
  let steps=0;
  while(g.street.getState().travelling&&steps++<250){
    g.step();const {x,y}=g.street.getState();
    assert(!(Math.abs(x-21)<.915&&Math.abs(y-18.29)<.415),'the walker stays outside the delivery vehicle');
  }
  g.at(23.4,18.29);
  assert.equal(g.encounters.length,0);
});

test('the waterfront action walks to a playable quay and pilots the boat to its actual feeding ground',()=>{
  const g=surface(),active={...site,water:true};
  g.street.setSite(active);
  assert(g.street.approachFishing('shore'));g.finish();
  assert.equal(g.street.getState().mode,'walk');
  assert(g.street.getState().y>=23.1);
  assert(g.street.toggleBoat());g.finish();
  assert(g.street.approachFishing('shoal'));g.finish();
  assert.equal(g.street.getState().mode,'boat');
  assert(g.street.getState().y>32);
  const p=g.street.getState();
  active.handline={x:p.x,y:p.y,mode:'boat',castAt:12345,food:2};
  g.street.setSite(active);
  g.street.toggleBoat();g.finish();
  assert(g.street.approachFishing('line'));g.finish();
  assert.equal(g.street.getState().mode,'boat');
  assert(g.street.approachFishing('line'));g.finish();
  g.at(p.x,p.y);
});


test('the handcart appears as a solid, approachable market object as soon as residents complete it',()=>{
  const g=surface(),slot={...site,pursuits:{serial:1,cart:{builder:'Mira',fixture:'baskets'},ticket:null}};
  g.street.setSite(slot);
  const shot=g.street.snapshotView();
  assert.equal(g.street.restoreView({...shot,player:{...shot.player,x:12.95,y:21.15}}),false);
  g.street.toggleOverview();
  g.tap(g.overviewFrame()(12.95,21.15,.36));
  g.finish();
  assert.equal(g.handcarts.length,1);
  assert(Math.hypot(g.street.getState().x-12.95,g.street.getState().y-21.15)<1.15);
  g.street.setSite({...site,pursuits:undefined});
  assert(g.street.restoreView({...shot,player:{...shot.player,x:12.95,y:21.15}}));
});

test('supply couriers between productive lots can be approached and met before and after their workspace changes',()=>{
  const link={from:0,to:1,resource:'food'},g=surface(820,500,{animated:true,links:[link]});
  const projects=['workshop','garden'].map((kind,plot)=>({kind,plot,id:'lot'+plot,name:kind}));
  g.street.setSite({...site,buildings:projects});
  const carrier=g.street.localPeople().find(p=>p.npcId==='carrier-0-1');
  assert.ok(carrier);
  assert.equal(g.street.meeting(carrier),null);
  assert.ok(g.street.focusStop(carrier));g.finish();
  const meeting=g.street.meeting(carrier);
  assert.ok(meeting);
  assert.equal(meeting.target,carrier.npcId);
  assert.equal(g.encounters.at(-1).npcId,carrier.npcId);
  g.street.focusMarket();g.finish();
  assert.equal(g.street.meeting(carrier),null);
});

test('floating homes leave their gangways open while the surrounding berth water blocks walking', () => {
  const g=surface();
  g.street.setSite({...site,water:true});
  const shot=g.street.snapshotView();
  const place=(x,y)=>g.street.restoreView({...shot,player:{...shot.player,x,y}});
  assert.equal(place(10.65,21.4),false,'water between hull and boardwalk');
  assert.equal(place(9,22.68),true,'wooden gangway leading to the front');
  assert(g.street.focusResident('r0'));g.finish();
  assert(g.street.atStop({type:'resident',residentId:'r0'}));
});

test('a walker beside the kiosk can find a way out of a narrow gap between park trees', () => {
  const g=surface();
  g.street.setSite({...site,id:'park-3',lat:0,lon:10,water:false});
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{...shot.player,x:20.46,y:2.84}}));
  assert(g.street.focusMarket());
  g.finish();
  assert(g.street.atStop({type:'market'}));
});

test('returning to a community resumes a walking resident at the job they reached while the player was away',()=>{
  const g=surface(),local={...site,agency:{actor:'r1',meals:[]},workforce:{members:{r1:{position:{x:9,y:6}}}}};
  g.street.setSite(local);g.at(9,6);
  g.street.setSite({...site,id:'another'});
  local.workforce.members.r1.position={x:15,y:12};
  g.street.setSite(local);
  assert.equal(g.street.getState().actor,'r1');
  g.at(15,12);
});

test('a Stone Town boat detours around a moored neighbour and can still return to its own quay',()=>{
  const g=surface();
  g.street.setSite({...site,id:'stone',lat:-6.163,lon:39.189,water:false});
  assert(g.street.toggleBoat());g.finish();
  const original=g.street.snapshotView();
  assert.equal(original.berth,'harbour-lateen');
  const canopy={x:21.65,y:29.61};
  assert.equal(g.street.restoreView({...original,player:{...original.player,...canopy}}),false);
  g.street.recenter();g.tap(g.interactionFrame()(24.55,30.22,-.44));
  assert(g.street.getState().travelling);
  for(let i=0;i<500&&g.street.getState().travelling;i++){
    g.step();const p=g.street.getState();
    assert(!(Math.abs(p.x-canopy.x)<2.70&&Math.abs(p.y-canopy.y)<1.81),'the sailing hull leaves the moored canopy boat clear');
  }
  g.at(24.55,30.22);
  assert(g.street.toggleBoat());g.finish();
  assert.equal(g.street.getState().mode,'walk');g.at(11.4,24.53);
});

test('a neighbour follows a detour when the community van is parked across their usual path',()=>{
  const g=surface(820,500,{animated:true});
  const snap=g.street.snapshotView(),van={x:3.4,y:6.71,dx:1,dy:0};
  assert(g.street.restoreView({...snap,van}));
  assert(g.street.focusStop({type:'market'},()=>{}));
  assert(g.street.focusResident('r1'));
  let observed=false;
  for(let i=0;i<220;i++){
    if(!g.street.getState().travelling)g.street.focusResident(i%2?'r1':'r0');
    g.step();
    const actor=g.street.localPeople().find(p=>p.npcId==='walker-0');
    assert(actor);
    assert(!(Math.abs(actor.x-van.x)<.759&&Math.abs(actor.y-van.y)<.429));
    if(Math.abs(actor.y-6.98)>.18)observed=true;
  }
  assert(observed,'the neighbour leaves their usual straight path to pass the van');
});

test('a restarted community and a different controlled character cannot inherit a saved seat',()=>{
  const g=surface();assert(g.street.useSeat());g.finish();
  const seated=g.street.snapshotView();
  g.street.setSite({...site,agency:{actor:'r1',meals:[]}});
  assert.equal(g.street.getState().actor,'r1');
  assert.equal(g.street.getState().seated,false);
  assert.equal(g.street.restoreView(seated),false);
  g.street.setSite({...site,foundingRevision:1});
  assert.equal(g.street.getState().actor,'steward');
  assert.equal(g.street.getState().seated,false);
  assert.equal(g.street.restoreView(seated),false);
});

test('resuming at a delivery stop keeps the saved van and gives the driver a clear kerb',()=>{
  const g=surface();
  const shot=g.street.snapshotView(),driver=g.street.localPeople().find(p=>p.npcId==='driver');
  const van={x:driver.x,y:driver.y,dx:1,dy:0};
  assert(g.street.restoreView({...shot,van}));
  assert.deepEqual({...g.street.snapshotView().van},van);
  const next=g.street.localPeople().find(p=>p.npcId==='driver');
  assert(Math.hypot(next.x-van.x,next.y-van.y)>1.5);
});

test('a pre-collision saved driver beside a lamp resumes on the same kerb',()=>{
  const g=surface(),shot=g.street.snapshotView();
  const van={x:17.06,y:17.3,dx:1,dy:0};
  const previous={...shot,mode:'drive',van,player:van};
  delete previous.geometry;
  assert(g.street.restoreView(previous));
  assert.equal(g.street.getState().mode,'drive');
  const safe=g.street.snapshotView();
  assert(Math.hypot(safe.van.x-van.x,safe.van.y-van.y)<.92);
  assert.notDeepEqual({...safe.van},van);
  assert(g.street.restoreView(safe));
  assert.equal(g.street.restoreView({...safe,van,player:van}),false,'fresh snapshots enforce the wider footprint');
});


test('market collection uses the physical doorway of the active district',()=>{
  const g=surface();
  assert(g.street.focusMarket());g.finish();
  const seen=g.street.meeting({type:'market'});
  assert.equal(seen.siteId,site.id);assert.equal(seen.target,'market');assert.equal(seen.actor,'steward');
  assert.equal(seen.tx,15);assert.equal(seen.ty,23.04);
  assert(g.street.focusResident('r1'));g.finish();
  assert.equal(g.street.meeting({type:'market'}),null);
});


test('the first shoal course from a Stone Town mooring can be stopped, redirected, and completed',()=>{
  const g=surface(),town={...site,lat:-6.16,lon:39.19};g.street.setSite(town);
  assert(g.street.toggleBoat());g.finish();assert.equal(g.street.getState().mode,'boat');
  assert(g.street.approachFishing('shoal'));assert.equal(g.updates.at(-1).sailingToShoal,true);
  g.step();g.street.cancelTravel();assert.equal(g.updates.at(-1).sailingToShoal,false);
  assert(g.street.approachFishing('shoal'));g.step();g.street.move('down');
  assert.equal(g.updates.at(-1).sailingToShoal,false);
  assert(g.street.approachFishing('shoal'));g.finish();
  const arrival=g.updates.at(-1);assert.equal(arrival.mode,'boat');assert.equal(arrival.sailingToShoal,false);
  assert.equal(arrival.travelling,false);assert(arrival.y>32);
});

test('a scrolled-away district finishes walking and sailing when animation frames are deferred', () => {
  const g = surface(740,390,{deferFrames:true});
  g.street.setSite({...site,id:'stone',lat:-6.163,lon:39.189});
  assert(g.street.approachFishing('shore'));
  g.finish();
  assert(g.street.toggleBoat());
  g.finish();
  const boarded = g.street.getState();
  assert.equal(boarded.mode,'boat');
  assert(g.street.approachFishing('shoal'));
  g.finish();
  const arrived=g.street.getState();
  assert.equal(arrived.sailingToShoal,false);
  assert(Math.hypot(arrived.x-boarded.x,arrived.y-boarded.y)>2);
  assert.equal(g.updates.at(-1).travelling,false);
  g.street.destroy();
});

test('workers who leave the van and a supply run can be met at a new workplace, including after their old route closes',()=>{
  const link={from:0,to:1,resource:'food'};
  const g=surface(740,390,{animated:true,lives:true,links:town=>town.buildings.some(b=>b.kind==='garden')?[link]:[]});
  const town={...site,buildings:['workshop','garden','hall'].map((kind,plot)=>({id:'b'+plot,kind,plot,name:kind+' workplace'}))};
  const person=id=>g.street.localPeople().find(p=>p.npcId===id);
  g.street.setSite(town);
  const oldDriver=person('driver'),oldPorter=person('carrier-0-1');
  assert(oldDriver.label&&oldPorter.label&&oldDriver.label!==oldPorter.label);
  town.careers={driver:{jobId:'nurse'},'carrier-0-1':{jobId:'musician'}};
  g.street.setSite(town);
  assert.equal(person('driver').role,'Nurse');
  assert.equal(person('carrier-0-1').role,'Musician');
  assert(Math.hypot(person('driver').x-oldDriver.x,person('driver').y-oldDriver.y)<1.1);
  assert.equal(person('carrier-0-1').label,oldPorter.label);
  const reported=new Set();
  g.street.holdMove('right');
  for(let i=0;i<2400&&reported.size<2;i++){
    g.step();
    for(const id of ['driver','carrier-0-1']){
      const p=person(id);
      if(p.routine==='At hall workplace'){
        assert(Math.hypot(p.x-15,p.y-5.04)<1.50);reported.add(id);
      }
    }
  }
  g.street.releaseMove('right');assert.equal(reported.size,2);
  town.buildings=town.buildings.filter(b=>b.kind!=='garden');
  g.street.setSite(town);
  assert.equal(person('carrier-0-1').role,'Musician');
  assert(g.street.focusStop(person('carrier-0-1')));g.finish();
  assert.equal(g.street.meeting(person('carrier-0-1')).target,'carrier-0-1');
  const before=person('driver');town.careers.driver.jobId='driver';g.street.setSite(town);
  const returning=person('driver');
  assert(Math.hypot(returning.x-before.x,returning.y-before.y)<.25,'the driver walks back to the vehicle');
  g.street.holdMove('right');
  let boarded=false;
  for(let i=0;i<2300&&!boarded;i++){g.step();boarded=person('driver').routine==='Co-op delivery driver';}
  g.street.releaseMove('right');assert(boarded);
});

test('a visitor and host reach the same park bench and a porter in training stays reachable after the corridor closes',()=>{
  const link={from:0,to:1,resource:'food'};
  const g=surface(740,390,{animated:true,lives:true,links:town=>town.buildings.some(b=>b.kind==='garden')?[link]:[]});
  const town={...site,buildings:['workshop','garden','hall'].map((kind,plot)=>({id:'b'+plot,kind,plot,name:kind+' workplace'}))};
  const person=id=>g.street.localPeople().find(p=>p.npcId===id);
  g.street.setSite(town);
  town.careers={'carrier-0-1':{training:{targetId:'nurse'}}};
  town.buildings=town.buildings.filter(b=>b.kind!=='garden');
  town.autonomy={people:{'walker-0':{history:[{kind:'visit',venue:'bench',week:1,target:'walker-4'}]},
    'walker-4':{history:[{kind:'host',venue:'bench',week:1,target:'walker-0'}]}}};
  g.street.setSite(town);
  assert(person('carrier-0-1'),'the former porter is still present while studying');
  g.street.holdMove('up');
  let together=false,studying=false;
  for(let i=0;i<2200&&(!studying||!together);i++){
    g.step();const a=person('walker-0'),b=person('walker-4'),p=person('carrier-0-1');
    if(a.routine==='At Park bench'&&b.routine==='At Park bench'){
      const apart=Math.hypot(a.x-b.x,a.y-b.y);assert(apart>.25&&apart<1.56);together=true;
    }
    if(p.routine==='At hall workplace')studying=true;
  }
  g.street.releaseMove('up');assert(together);assert(studying);
  assert(g.street.focusStop(person('carrier-0-1')));g.finish();
  assert.equal(g.street.meeting(person('carrier-0-1')).target,'carrier-0-1');
});
