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

function surface(width = 820, height = 500, {animated=false, links=null, deferFrames=false, lives=false, onFishingMark, onState, waterfront, getWeek, getRegularRun, onRegularArrival,getTruckDispute,onTruckDispute,onTalkChoices,onTruckInteract,landmarks,membership,visible=false,working,onNeighbourHelp,resources}={}) {
  const pointerEvents = new Map();
  let frame = null;
  let now = 100, timerId = 0;
  const timers = new Map();
  const noop=()=>{};
  const brush=new Proxy({measureText:label=>({width:String(label).length*6}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},
    {get:(obj,key)=>key in obj?obj[key]:noop});
  const canvas = {
    style: {},
    getContext: () => brush,
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
      body: { dataset:{},hasAttribute(name) { return name === 'data-sheet-open' && covered; } },
      addEventListener(name, handler) { documentEvents.set(name, handler); },
      removeEventListener(name) { documentEvents.delete(name); }
    },
    // Offscreen rendering is suspended while the actual input and movement loop still run.
    IntersectionObserver: class {
      constructor(handler) { this.handler = handler; }
      observe() { this.handler([{isIntersecting: visible}]); }
      disconnect() {}
    },
    requestAnimationFrame(handler) { frame = handler; return 1; },
    cancelAnimationFrame() { frame = null; },
    matchMedia: query => ({ matches: !animated||!query.includes('prefers-reduced-motion') })
  };
  vm.runInNewContext(readFileSync(path.join(gameRoot,'fisheries.js'),'utf8'),runtime);
  if(links)runtime.window.CommonEarthSim={productiveLinks:typeof links==='function'?links:()=>links};
  if(waterfront)runtime.window.CommonEarthSim={...runtime.window.CommonEarthSim,waterfront};
  if(landmarks)runtime.window.EarthDreams={landmarks};
  if(membership)runtime.window.EarthCommunityLife=membership;
  if(working)runtime.window.EarthNeighbourErrands={working};
  if(resources)vm.runInNewContext(readFileSync(path.join(gameRoot,'resource-economy.js'),'utf8'),runtime);
  if(lives)for(const file of ['personas.js','careers.js','autonomy.js','street-activity.js'])vm.runInNewContext(readFileSync(path.join(gameRoot,file),'utf8'),runtime);
  vm.runInNewContext(surroundingsScript, runtime);
  vm.runInNewContext(constructionScript, runtime);
  vm.runInNewContext(agencyScript,runtime);
  vm.runInNewContext(script, runtime);
  const encounters = [], updates = [], observations=[];
  const hints = [], handcarts = [];
  const placed = [], previews = [], assignments = [], targetLists = [];
  const street = runtime.window.EarthStreet.mount(canvas, {
    onObservation: current => observations.push(current),
    onFishingMark,getWeek,getRegularRun,onRegularArrival,getTruckDispute,onTruckDispute,onTalkChoices,onTruckInteract,onNeighbourHelp,onState: state => {updates.push(state);onState?.(state);},
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
  function crossing(open) {
    runtime.document.body.dataset.districtCrossing=String(open);
    documentEvents.get('earthdistrictcrossing')?.({type:'earthdistrictcrossing'});
  }
  function host(residentId) {
    vm.runInNewContext(shiftScript,runtime);
    const active = { ...site, food:8, funds:12, materials:9, delivery:{residentId:'r1'} };
    const shifts=runtime.window.EarthShifts;
    active.shift=shifts.start({sites:[active],week:1,effort:3},active,residentId).shift;
    street.setSite(active);
    return {active,stops:shifts.view(active,1).stops};
  }
  return { agency:runtime.window.EarthAgency,resources:runtime.window.EarthResources,street, sheet, crossing, host, updates, observations, encounters, hints, handcarts, placed, previews, assignments, targetLists, interactionFrame, overviewFrame, pointer, tap, key, step, finish, drive, at };
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
  const visits=[];
  assert(g.street.approachFishing('shore',scene=>visits.push(scene)));
  assert.equal(visits.length,0);g.finish();
  assert.equal(visits.length,1);assert.equal(visits[0].mode,'walk');
  assert.equal(g.street.getState().mode,'walk');
  assert(g.street.getState().y>=23.1);
  assert(g.street.toggleBoat());g.finish();
  assert(g.street.approachFishing('shoal'));g.finish();
  assert.equal(g.street.getState().mode,'boat');
  assert(g.street.getState().y>32);
  const p=g.street.getState();
  active.handline={x:p.x,y:p.y,mode:'boat',castAt:12345,food:2};
  g.street.setSite(active);
  assert(g.street.approachFishing('shore',scene=>visits.push(scene)));g.finish();
  assert.equal(visits.length,2);assert.equal(visits[1].mode,'walk');assert(visits[1].y>=23.1);
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

function fishingPanelFixture(point,coastal=false){
  let now=10000,serial=0;const timers=new Map();
  const runtime={structuredClone,Date:class extends Date{static now(){return now;}},setTimeout:(f,delay)=>{timers.set(++serial,{f,due:now+delay});return serial;},clearTimeout:id=>timers.delete(id)};
  const pageEvents=new Map();runtime.addEventListener=(type,fn)=>pageEvents.set(type,fn);runtime.removeEventListener=(type,fn)=>{if(pageEvents.get(type)===fn)pageEvents.delete(type);};
  runtime.window=runtime;if(coastal)runtime.EarthAtlas={nearOceanShore:()=>true};
  vm.createContext(runtime);for(const f of ['fisheries','simulation','waterfront-ui'])vm.runInContext(readFileSync(path.join(gameRoot,f+'.js'),'utf8'),runtime);
  const sim=runtime.CommonEarthSim.create({storage:null});assert(sim.found(point).ok);
  const elements=[],doc={body:{hasAttribute:()=>false},createElement(tag){
    const handlers=new Map(),el={tag,ownerDocument:doc,dataset:{},textContent:'',append(){},setAttribute(){},remove(){},addEventListener:(event,f)=>handlers.set(event,f),
      click(){assert(!el.hidden&&!el.disabled,'available button: '+el.textContent);return handlers.get('click')();}};
    elements.push(el);return el;
  }};
  const marks=[];let panel,markedCommand;
  const g=surface(820,500,{getWeek:()=>sim.state.week,waterfront:runtime.CommonEarthSim.waterfront,onState:state=>panel?.render(state),
    onFishingMark:mark=>{marks.push(mark);if(mark==='float')markedCommand=panel.act('line');if(mark==='shoal')markedCommand=panel.act('shoal');}});
  g.street.setSite(sim.active());panel=runtime.EarthWaterfrontUI.mount(doc.createElement('section'),{sim,getStreet:()=>g.street,refresh:()=>g.street.setSite(sim.active())});panel.render();
  const button=key=>elements.find(e=>e.dataset.fishing===key),part=cls=>elements.find(e=>e.className===cls);
  return {g,sim,panel,button,part,marks,marked:()=>markedCommand,resumeAfter(ms){now+=ms;pageEvents.get('pageshow')({persisted:true});},wait(){now+=5000;for(const [id,t] of timers)if(t.due<=now){timers.delete(id);t.f();}},destroy(){panel.destroy();g.street.destroy();sim.destroy();}};
}

test('tablet fishing controls take an Ocean Anchorage from boarding to fish in the pantry and a second catch',async()=>{
  const f=fishingPanelFixture({name:'Ocean Anchorage',lat:-18,lon:92,water:true}),{g,sim}=f;
  const stock=sim.active().food;await f.button('boat').click();g.finish();assert.equal(g.street.getState().mode,'boat');
  g.street.recenter();let p=g.street.getState();g.tap(g.interactionFrame()(p.x,p.y,-.44));assert.equal(f.marks.at(-1),'boat');
  await f.button('line').click();assert.equal(sim.active().handline.food,1);assert.match(f.part('waterfront-status').textContent,/bite/);
  assert(f.button('line').disabled);f.resumeAfter(10000);assert.match(f.button('line').textContent,/Reel in/);
  p=g.street.getState();g.street.recenter();g.tap(g.interactionFrame()(p.x,p.y+1.1,-.42));assert.equal(f.marks.at(-1),'float');await f.marked();
  assert.equal(sim.active().food,stock+1);assert.match(f.part('waterfront-result').textContent,/Landed 1 food/);assert.match(f.part('waterfront-pantry').textContent,new RegExp(stock+1));
  await f.button('shoal').click();g.finish();assert.match(f.button('line').textContent,/2 food/);
  await f.button('line').click();f.wait();await f.button('boat').click();g.finish();assert.equal(g.street.getState().mode,'walk');
  await f.button('line').click();g.finish();assert.equal(g.street.getState().mode,'boat');assert.match(f.button('line').textContent,/Reel in/);
  await f.button('line').click();assert.equal(sim.active().food,stock+3);assert.match(f.part('waterfront-result').textContent,/Landed 2 food/);f.destroy();
});

test('a coastal land save can fish on foot, retrieve a quay float from sea in one journey, and keep its pantry catch',async()=>{
  const f=fishingPanelFixture({name:'Hobart',lat:-42.85,lon:147.295},true),{g,sim}=f,stock=sim.active().food;
  assert.equal(sim.active().water,false);assert.equal(sim.active().coastal,true);
  await f.button('line').click();g.finish();assert.equal(g.street.getState().mode,'walk');assert.match(f.button('line').textContent,/Cast line/);
  await f.button('line').click();await f.button('boat').click();g.finish();f.wait();assert.equal(g.street.getState().mode,'boat');
  await f.button('line').click();g.finish();assert.equal(g.street.getState().mode,'walk');assert.match(f.button('line').textContent,/Reel in/);
  await f.button('line').click();assert.equal(sim.active().food,stock+1);f.destroy();
});

test('watching an autonomous research project shows walking, real work and return while the player stands still',()=>{
  const g=surface(740,390,{animated:true,deferFrames:true,lives:true}),id='walker-1';
  const town={...site,buildings:[{id:'labs',kind:'workshop',plot:7,name:'Records workshop'}],
    autonomy:{people:{[id]:{history:[{week:2,kind:'project',projectKind:'research',projectId:'survey',phase:'work',title:'Survey the local springs',venue:'workshop'}]}}}};
  g.street.setSite(town);
  const avatar=g.street.getState(),origin=g.street.activityOf(id);
  assert(g.street.observePerson(id));assert.equal(g.observations.at(-1).following,true);
  const stages=new Set(),labels=new Set();let reached=false;
  for(let i=0;i<2600;i++){
    g.step();const seen=g.street.activityOf(id);
    if(seen.goal==='Survey the local springs'){
      stages.add(seen.phase);labels.add(seen.label);
      if(seen.phase!=='travel'){assert(Math.hypot(seen.x-9,seen.y-17.04)<1.52);reached=true;}
    }
  }
  assert(reached&&stages.has('travel')&&stages.has('work')&&labels.size>=3);
  assert(Math.hypot(g.street.activityOf(id).x-origin.x,g.street.activityOf(id).y-origin.y)>1);
  assert(g.observations.length>2&&g.observations.length<80);
  g.at(avatar.x,avatar.y,0);assert.equal(g.encounters.length,0);
  const before=g.street.activityOf(id);g.sheet(true);
  for(let i=0;i<600;i++)g.step();
  const after=g.street.activityOf(id);assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.label,before.label);
  g.sheet(false);g.street.move('left');assert.equal(g.observations.at(-1),null);
  assert.equal(g.street.activityOf(id).following,false);assert.equal(g.street.observePerson('unknown'),false);
});

test('reduced-motion residents keep appointments and display distinct study actions without player movement',()=>{
  const g=surface(390,355,{lives:true,deferFrames:true}),id='walker-0';
  const town={...site,autonomy:{people:{[id]:{history:[{week:1,kind:'learn',venue:'hall'}]}}}};
  g.street.setSite(town);const avatar=g.street.getState();
  assert(g.street.observePerson(id));
  const lessons=new Set();let travelled=false;
  for(let i=0;i<1800;i++){
    g.step();const who=g.street.activityOf(id);
    if(who.phase==='study'){assert.equal(who.venue,'Cooperative Hall');lessons.add(who.label);}
    if(who.phase==='travel')travelled=true;
  }
  assert(travelled&&lessons.size>=2);g.at(avatar.x,avatar.y,0);
  g.street.recenter();assert.equal(g.observations.at(-1),null);
});

test('a distant neighbour keeps walking while approached, and an actual face-to-face stop still succeeds',()=>{
  const g=surface(740,390,{lives:true,animated:true,deferFrames:true});
  g.street.setSite({...site,autonomy:{people:{'walker-0':{history:[{week:1,kind:'learn',venue:'hall'}]}}}});
  const ref={type:'npc',npcId:'walker-0'},before=g.street.activityOf(ref.npcId);
  assert(Math.hypot(before.x-g.street.getState().x,before.y-g.street.getState().y)>5);
  assert(g.street.focusStop(ref));
  for(let i=0;i<25;i++)g.step();
  const later=g.street.activityOf(ref.npcId);
  assert(Math.hypot(later.x-before.x,later.y-before.y)>.25);
  g.finish();assert.equal(g.encounters.at(-1).npcId,ref.npcId);
  const proof=g.street.meeting(ref);assert(proof&&Math.hypot(proof.x-proof.tx,proof.y-proof.ty)<=1.56);
});

test('overlapping visitors can both be selected with a repeated touch in the district overview',()=>{
  const g=surface(390,355,{lives:true,deferFrames:true});
  const x=21.42,y=4.34;
  const town={...site,autonomy:{people:{'walker-0':{history:[{week:1,kind:'visit',venue:'bench',target:'walker-4'}]},
    'walker-4':{history:[{week:1,kind:'host',venue:'bench',target:'walker-0'}]}}}};
  g.street.setSite(town);
  const shot=g.street.snapshotView();assert(g.street.restoreView({...shot,player:{...shot.player,x,y:y+.52}}));
  let a,b;
  for(let i=0;i<2600;i++){
    g.step();a=g.street.activityOf('walker-0');b=g.street.activityOf('walker-4');
    if(a.phase==='social'&&b.phase==='social'&&Math.hypot(a.x-b.x,a.y-b.y)<.65)break;
  }
  assert(a.phase==='social'&&b.phase==='social');
  g.street.toggleOverview();
  const point=g.overviewFrame()((a.x+b.x)*.5,(a.y+b.y)*.5,.42);
  g.tap(point);g.tap(point);
  assert.deepEqual(new Set(g.encounters.map(e=>e.npcId)),new Set(['walker-0','walker-4']));
});

test('a co-op truck returns from the Pantry between residents working along opposite kerbs',()=>{
  const g=surface();
  const pickup={x:11.08284,y:23.46};
  const anchor={x:9,y:24,dx:1,dy:0};
  const town={...site,fleet:{custody:{actor:'steward',week:7,token:'delivery',anchor,pickup}}};
  g.street.setSite(town);
  const snapshot=g.street.snapshotView();
  assert(g.street.restoreView({...snapshot,player:{x:9.1,y:24.58,dx:1,dy:0}}));
  g.street.setConstruction({jobs:[],workers:[onCrew('working',9.38,23.04,null)]});
  assert(g.street.boardServiceTruck());
  let arrived=false;
  assert(g.street.followTruckDelivery({x:15,y:24},()=>{arrived=true;}));
  for(let i=0;i<750&&g.street.getState().travelling;i++){
    g.step();
    const {x,y,dx,dy}=g.street.truckStatus().truck;
    const heading=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;
    const co=Math.abs(Math.cos(heading)),si=Math.abs(Math.sin(heading)),rx=.82*co+.32*si,ry=.82*si+.32*co;
    for(const p of [{x:9.38,y:23.04},g.street.actorScene('driver').targetPose])
      assert(!(Math.abs(x-p.x)<rx+.095&&Math.abs(y-p.y)<ry+.095),'the actual truck body keeps clear of each person');
  }
  assert.equal(arrived,true,'the return path considers both sides of the street');
  assert.equal(g.street.getState().travelling,false);
  g.at(15,24);
  g.street.destroy();
});

test('a passing resident walks to a civic consultation and carries out the hall activity',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true});
  const id='walker-1',reason='Hear neighbours about the proposed clinic.';
  const town={...site,autonomy:{people:{[id]:{history:[{kind:'commitment',week:1,civic:true,venue:'hall',reason}]}}}};
  g.street.setSite(town);
  let worked=false,walked=false;
  for(let i=0;i<2000&&!worked;i++){
    g.step();
    const body=g.street.activityOf(id);
    if(body.goal!==reason||!body.venue.includes('Hall'))continue;
    if(body.phase==='travel')walked=true;
    else if(body.phase==='work'||body.phase==='prepare')worked=true;
  }
  assert(walked,'travels to the civic venue');
  assert(worked,'acts on the current consultation there');
  g.street.destroy();
});

test('all five passing residents take control at their own feet and resume from where they are released',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true}),town={...site};
  g.street.setSite(town);
  function change(id){
    const scene=g.street.actorScene(id),target={...scene.targetPose};
    assert(g.agency.checkHandoff(town,id,scene).ok);
    assert(g.agency.change(town,id,scene).ok);
    g.street.setSite(town);
    g.at(target.x,target.y,.001);
    return target;
  }
  let former=null,stale=null;
  for(const id of ['walker-0','walker-1','walker-2','walker-3','walker-4','walker-0']){
    change(id);
    assert.equal(g.street.getState().actor,id);
    assert.equal(g.street.activityOf(id).phase,'player');
    assert(!g.street.localPeople().some(p=>p.npcId===id));
    assert.equal(g.street.focusStop({type:'npc',npcId:id}),false);
    if(former){
      const released=g.street.activityOf(former.id);
      assert(Math.hypot(released.x-former.x,released.y-former.y)<.002,'the former resident starts again at the handoff');
      assert.notEqual(released.phase,'player');
    }
    if(id==='walker-0'){
      if(stale)assert.equal(g.street.restoreView(stale),false,'a view from an earlier shift cannot overwrite the new handoff');
      else stale=g.street.snapshotView();
    }
    assert(g.street.snapshotView().actorSerial>0);
    g.street.focusMarket();g.finish();
    former={id,...g.street.getState()};
    g.street.setSite(town);
    g.at(former.x,former.y,.001);
    for(let i=0;i<5;i++)g.step();
  }
  g.street.destroy();
});

test('the driver can take control on foot but a driver aboard a co-op vehicle continues their delivery',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true}),town={...site};
  g.street.setSite(town);
  const aboard=g.street.actorScene('driver');
  assert.equal(aboard.targetPose.mode,'drive');
  assert.equal(g.agency.checkHandoff(town,'driver',aboard).ok,false);
  town.careers={driver:{jobId:'nurse'}};
  g.street.setSite(town);
  for(let i=0;i<30;i++)g.step();
  const foot=g.street.actorScene('driver');
  assert.equal(foot.targetPose.mode,'walk');
  assert(g.agency.checkHandoff(town,'driver',foot).ok);
  assert(g.agency.change(town,'driver',foot).ok);
  g.street.setSite(town);g.at(foot.targetPose.x,foot.targetPose.y,.001);
  assert(!g.street.localPeople().some(p=>p.npcId==='driver'));
  const truck=g.street.truckStatus().truck;
  for(let i=0;i<200;i++)g.step();
  assert.deepEqual(g.street.truckStatus().truck,truck,'dispatch waits while its driver is elsewhere');
  g.street.focusMarket();g.finish();
  const old=g.street.getState(),next=g.street.actorScene('walker-1');
  assert(g.agency.change(town,'walker-1',next).ok);
  g.street.setSite(town);
  const released=g.street.activityOf('driver');
  assert(Math.hypot(released.x-old.x,released.y-old.y)<.002);
  assert.equal(g.street.actorScene('driver').targetPose.mode,'walk');
  g.street.destroy();
});

test('urgent NPC freight arrives with a physical proof, returns to the depot and departs in the next week',async()=>{
  const quote={available:true,done:false,week:1,serial:0,generation:0,marketRevision:0,siteId:site.id,
    driverId:'driver',next:{name:'Pantry stop',x:9,y:24,good:'food'}};
  const claims=[];
  let reads=0;
  const g=surface(740,390,{animated:true,lives:true,deferFrames:true,
    getRegularRun:()=>{reads++;return {...quote};},
    onRegularArrival:async(order,getProof)=>{
      const proof=getProof();claims.push({order,proof});
      assert(proof.attended);
      assert.equal(proof.mode,'service');
      assert.equal(proof.driverId,'driver');
      assert.equal(proof.stop,order.next.name);
      assert(Math.hypot(proof.x-order.next.x,proof.y-order.next.y)<.85);
      quote.available=false;quote.done=true;quote.serial++;
      return {ok:true};
    }});
  const saved=g.street.snapshotView();
  assert(g.street.restoreView({...saved,player:{x:21.42,y:4.86,dx:1,dy:0}}));
  for(let i=0;i<7500&&!claims.length;i++){g.step();if(i%50===0)await new Promise(setImmediate);}
  assert.equal(claims.length,1);
  for(let i=0;i<14500&&g.street.regularTruckStatus().stop!=='Market exchange';i++)g.step();
  assert.equal(g.street.regularTruckStatus().stop,'Market exchange','the vehicle returns to its depot');
  const parked={...g.street.truckStatus().truck};
  for(let i=0;i<400;i++)g.step();
  assert.deepEqual({...g.street.truckStatus().truck},parked);
  assert.equal(claims.length,1);assert(reads<60,'demand was checked on arrivals, not every frame');
  quote.week=2;quote.done=false;quote.available=true;quote.next={name:'Repair stop',x:21,y:18,good:'materials'};
  g.street.setSite(site);
  for(let i=0;i<14500&&claims.length<2;i++){g.step();if(i%50===0)await new Promise(setImmediate);}
  assert.equal(claims.length,2);
  g.street.destroy();
});

test('speech anchors follow the speaker’s actual head through camera zoom and a live handoff',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true}),id='walker-2';
  const town={...site};g.street.setSite(town);
  const scene=g.street.actorScene(id);
  assert(g.agency.change(town,id,scene).ok);g.street.setSite(town);
  for(const delta of [0,1]){
    if(delta)g.street.zoomBy(1.36);
    g.street.recenter();
    const body=g.street.activityOf(id),expected=g.interactionFrame()(body.x,body.y,.84),actual=g.street.personAnchor(id);
    assert.equal(actual.visible,true);
    assert(Math.hypot(expected.x-8-actual.x,expected.y-12-actual.y)<.1);
  }
  assert.equal(g.street.personAnchor('missing-person'),null);
  assert(g.street.personAnchor('driver'));
  g.street.destroy();
});

test('a physically reached NPC freight stop transfers real stall stock into the pantry exactly once',async()=>{
  const runtime=vm.createContext({});runtime.window=runtime;
  for(const name of ['personas','careers','local-projects','autonomy','dialogue','agency','market','fleet','simulation']){
    vm.runInContext(readFileSync(path.join(gameRoot,name+'.js'),'utf8'),runtime);
  }
  const sim=runtime.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19,water:true}).ok);
  const town=sim.active();town.food=1;
  const receipts=[];
  const g=surface(740,390,{lives:true,deferFrames:true,getWeek:()=>sim.state.week,
    getRegularRun:()=>sim.regularTruckView(),onRegularArrival:async(order,proof)=>{
      const result=await sim.perform('regularTruck',order,proof);
      receipts.push(result);return result;
    }});
  g.street.setSite(town);
  const saved=g.street.snapshotView();
  assert(g.street.restoreView({...saved,player:{x:21.42,y:4.86,dx:1,dy:0}}));
  for(let i=0;i<7500&&!receipts.length;i++){g.step();if(i%50===0)await new Promise(setImmediate);}
  assert.equal(receipts.length,1);assert.equal(receipts[0].ok,true);
  assert.equal(sim.active().food,2);
  assert.equal(sim.active().fleet.regularWeek,sim.state.week);
  g.street.setSite(sim.active());for(let i=0;i<2000;i++)g.step();
  assert.equal(receipts.length,1);assert.equal(sim.active().food,2);
  g.street.destroy();sim.destroy();
});

test('a truck departing a narrow kerb strip can reach the Repair stop without crossing either pedestrian',()=>{
  const g=surface();
  const anchor={x:9.89784,y:23.69,dx:-1,dy:0};
  const town={...site,buildings:[],fleet:{custody:{actor:'steward',week:14,token:'departure',anchor,pickup:anchor}}};
  g.street.setSite(town);
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{x:9.94,y:24.30,dx:-1,dy:0}}));
  g.street.setConstruction({jobs:[],workers:[onCrew('working',8.24,23.04,null)]});
  assert(g.street.boardServiceTruck());
  let arrived=false;
  assert(g.street.followTruckDelivery({x:21,y:18},()=>{arrived=true;}),'the adjacent junction is connectable from this kerb');
  g.finish();g.at(21,18);assert.equal(arrived,true);
  g.street.destroy();
});

test('a truck keeps its depot destination while a pedestrian temporarily closes the remaining lane',()=>{
  const g=surface();
  const anchor={x:12,y:24,dx:1,dy:0},pickup={x:12,y:24};
  const town={...site,buildings:[{id:'work',kind:'workshop',plot:0,name:'Repair workshop'}],
    fleet:{custody:{actor:'steward',week:8,token:'depot-return',anchor,pickup}}};
  g.street.setSite(town);
  const shot=g.street.snapshotView();
  assert(g.street.restoreView({...shot,player:{x:12.1,y:24.58,dx:1,dy:0}}));
  const residents=[onCrew('working',11.04,24,null),{...onCrew('working',12,23.53,null),residentId:'r0',slot:0},
    {...onCrew('working',12.96,24,null),residentId:'r2',slot:2}];
  g.street.setConstruction({jobs:[],workers:residents});
  assert(g.street.boardServiceTruck());
  let arrived=false;
  assert(g.street.followTruckDelivery({x:15,y:24},()=>{arrived=true;}));
  for(let i=0;i<100;i++)g.step();
  const stopped=g.street.getState();assert.equal(stopped.travelling,true);assert(Math.abs(stopped.x-12)<.15);
  g.street.setConstruction({jobs:[],workers:[residents[0],residents[1],{...residents[2],x:15,y:18.75}]});
  g.finish();assert.equal(arrived,true);g.at(15,24);
  g.street.destroy();
});

test('a northbound work truck clears the kerb light, resumes from a saved pose and drives to Repair',()=>{
  const g=surface(),anchor={x:17.69,y:4.4502,dx:0,dy:1};
  const town={...site,id:'site-1',lat:34.726,lon:135.5,water:false,
    buildings:[{id:'b0',kind:'hall',name:'Assembly hall',plot:0},{id:'b1',kind:'workshop',name:'Repair workshop',plot:1}],
    fleet:{custody:{actor:'steward',week:12,token:'goods',anchor,pickup:anchor}}};
  g.street.setSite(town);
  const saved=g.street.snapshotView();
  assert(g.street.restoreView({...saved,player:{x:18.43,y:4.46,dx:-1,dy:0}}));
  assert(g.street.boardServiceTruck());
  const aboard=g.street.snapshotView();assert(g.street.restoreView(aboard),'the saved north-facing hull clears the post');
  const post=[16.985,4.865,17.135,5.015];
  const touched=()=>{
    const {x,y,dx,dy}=g.street.truckStatus().truck;
    const heading=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;
    const co=Math.abs(Math.cos(heading)),si=Math.abs(Math.sin(heading)),rx=.82*co+.32*si,ry=.82*si+.32*co;
    return x+rx>post[0]&&x-rx<post[2]&&y+ry>post[1]&&y-ry<post[3];
  };
  assert.equal(touched(),false);
  let arrived=false;assert(g.street.followTruckDelivery({x:21,y:18},()=>{arrived=true;}));
  for(let i=0;i<900&&g.street.getState().travelling;i++){
    g.step();assert.equal(touched(),false,'the rotating truck body maintains clearance');
  }
  assert(arrived);g.at(21,18);g.street.destroy();
});

test('unattended deliveries bypass a van parked across a corner and keep working residents clear',async()=>{
  const g=surface(740,390,{lives:true,animated:true,deferFrames:true});
  const parked={x:6,y:12.2,dx:0,dy:-1};
  const saved=g.street.snapshotView();
  assert(g.street.restoreView({...saved,player:{x:21.42,y:4.86,dx:1,dy:0},van:parked}));
  g.street.setConstruction({jobs:[],workers:[onCrew('working',18,7.5,null)]});
  const seen=new Set();let leftRepair=false,returned=false;
  for(let i=0;i<12000&&!returned;i++){
    g.step();
    const {x,y,dx,dy}=g.street.truckStatus().truck,proof=g.street.regularTruckStatus();
    if(proof.stop){seen.add(proof.stop);if(leftRepair&&proof.stop==='Repair stop')returned=true;}
    if(Math.hypot(x-21,y-18)>2)leftRepair=true;
    const heading=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;
    const co=Math.abs(Math.cos(heading)),si=Math.abs(Math.sin(heading)),rx=.82*co+.32*si,ry=.82*si+.32*co;
    assert(!(Math.abs(x-18)<rx+.095&&Math.abs(y-7.5)<ry+.095),'the service truck leaves room for the working resident');
    assert(!(Math.abs(x-parked.x)<rx+.335&&Math.abs(y-parked.y)<ry+.665),'the service truck leaves room for the parked van');
  }
  assert(returned,'the service truck rejoins its route after the obstruction');
  assert(seen.has('Pantry stop')&&seen.has('Market exchange')&&seen.has('Assembly stop'));
  g.street.destroy();
});

test('dispatchers step onto open ground on every perimeter kerb before handing over the truck',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true});
  const pickups=[
    {x:15.46584,y:24.74,dx:-1,dy:0},{x:8.2,y:-.74,dx:1,dy:0},
    {x:24.74,y:19.2,dx:0,dy:1},{x:-.74,y:7.9,dx:0,dy:-1}
  ];
  for(const [i,pickup] of pickups.entries()){
    const town={...site,id:'perimeter-'+i,buildings:[{id:'exchange',kind:'market',plot:0,name:'Exchange'}],
      fleet:{custody:{actor:'steward',week:8,token:i+1,anchor:pickup,pickup}}};
    g.street.setSite(town);
    const dispatcher=g.street.actorScene('driver').targetPose;
    assert.equal(dispatcher.mode,'walk');
    const vertical=Boolean(pickup.dy),rx=vertical?.32:.82,ry=vertical?.82:.32;
    assert(!(Math.abs(dispatcher.x-pickup.x)<rx+.095&&Math.abs(dispatcher.y-pickup.y)<ry+.095),
      'the dispatcher leaves the cab before the player boards');
    const old=g.street.snapshotView();
    assert(g.street.restoreView({...old,player:{x:dispatcher.x,y:dispatcher.y,dx:1,dy:0}}));
    assert(g.street.boardServiceTruck());
    let arrived=false;
    assert(g.street.followTruckDelivery({x:21,y:18},()=>{arrived=true;}));
    g.finish();assert(arrived);
  }
  g.street.destroy();
});

test('playing the porter removes the separate courier body and on release they walk back to their supply lane',()=>{
  const id='carrier-0-1',link={from:0,to:1,resource:'food'};
  const g=surface(740,390,{lives:true,animated:true,deferFrames:true,links:()=>[link]});
  const town={...site,buildings:[{id:'source',kind:'garden',plot:0,name:'Food garden'},
    {id:'sink',kind:'market',plot:1,name:'Produce market'}]};
  g.street.setSite(town);for(let i=0;i<30;i++)g.step();
  const first=g.street.actorScene(id);
  assert.equal(first.targetPose.mode,'walk');
  assert(g.agency.playables(town).some(person=>person.id===id));
  assert(g.agency.checkHandoff(town,id,first).ok);
  assert(g.agency.change(town,id,first).ok);g.street.setSite(town);
  g.at(first.targetPose.x,first.targetPose.y,.002);
  assert.equal(g.street.activityOf(id).phase,'player');
  assert(!g.street.localPeople().some(person=>person.npcId===id));
  assert.equal(g.street.focusStop({type:'npc',npcId:id}),false);
  assert(g.street.focusMarket());g.finish();
  const dropped=g.street.getState(),next=g.street.actorScene('walker-1');
  assert(g.agency.change(town,'walker-1',next).ok);g.street.setSite(town);
  let previous=g.street.activityOf(id);
  assert(Math.hypot(previous.x-dropped.x,previous.y-dropped.y)<.002);
  let nearDepot=false,worked=false;
  for(let i=0;i<1900;i++){
    g.step();const current=g.street.activityOf(id);
    assert(Math.hypot(current.x-previous.x,current.y-previous.y)<1.9,'the porter walks each leg, including rejoining');
    if(Math.hypot(current.x-first.targetPose.x,current.y-first.targetPose.y)<3.1){
      nearDepot=true;
      if(current.phase==='prepare'||current.phase==='work'||current.phase==='handover')worked=true;
    }
    previous=current;
    if(nearDepot&&worked)break;
  }
  assert(nearDepot&&worked,'returns to the corridor, then loads or hands over a real crate');
  g.street.destroy();
});

test('a previously played porter remains a reachable neighbour when an operating supply corridor closes',()=>{
  const id='carrier-0-1',link={from:0,to:1,resource:'food'};
  const g=surface(740,390,{lives:true,deferFrames:true,links:town=>town.buildings.some(b=>b.kind==='garden')?[link]:[]});
  const town={...site,buildings:[{id:'source',kind:'garden',plot:0,name:'Food garden'},
    {id:'sink',kind:'market',plot:1,name:'Produce market'}]};
  g.street.setSite(town);
  const enter=g.street.actorScene(id);assert(g.agency.change(town,id,enter).ok);g.street.setSite(town);
  const stale=g.street.snapshotView();
  town.buildings=town.buildings.filter(b=>b.kind!=='garden');g.street.setSite(town);
  assert.equal(g.street.getState().actor,id);assert(g.agency.canPlay(town,id));
  assert(g.street.focusMarket());g.finish();
  const dropped=g.street.getState();
  assert(g.agency.change(town,'steward',g.street.actorScene('steward')).ok);g.street.setSite(town);
  const body=g.street.actorScene(id);
  assert.equal(body.targetPose.mode,'walk');assert(Math.hypot(body.targetPose.x-dropped.x,body.targetPose.y-dropped.y)<.002);
  const ref=g.street.localPeople().find(p=>p.npcId===id);
  assert(ref&&g.street.focusStop(ref));g.finish();assert.equal(g.street.meeting(ref,true).target,id);
  assert(g.agency.change(town,id,g.street.actorScene(id)).ok);g.street.setSite(town);
  assert.equal(g.street.restoreView(stale),false);
  g.street.destroy();
});

test('the unattended truck keeps serving repeat rounds through a perimeter street blocked by a parked van',()=>{
  const runtime=vm.createContext({});runtime.window=runtime;
  vm.runInContext(readFileSync(path.join(gameRoot,'simulation.js'),'utf8'),runtime);
  const g=surface(740,390,{lives:true,animated:true,deferFrames:true,links:runtime.CommonEarthSim.productiveLinks});
  const town={...site,id:'geometry-0-3-false',lat:-36,lon:28,water:true,buildings:[
    {id:'tools',kind:'workshop',plot:0,name:'Repair workshop'},{id:'field',kind:'garden',plot:1,name:'Food garden'}]};
  assert.equal(runtime.CommonEarthSim.productiveLinks(town).length,1);
  g.street.setSite(town);
  const saved=g.street.snapshotView();
  assert(g.street.restoreView({...saved,player:{x:21.42,y:4.86,dx:1,dy:0},van:{x:6,y:12.2,dx:0,dy:1}}));
  let at=null,returns=0,left=false;const visits=new Set();
  for(let i=0;i<13000&&returns<3;i++){
    g.step();const stop=g.street.regularTruckStatus().stop;
    if(stop)visits.add(stop);
    if(stop==='Repair stop'&&at!==stop&&left)returns++;
    if(stop&&stop!=='Repair stop')left=true;
    at=stop;
  }
  assert.equal(visits.size,4);assert.equal(returns,3,'a repeated delivery round remains reachable');
  g.street.destroy();
});

test('one shore-fishing instruction walks the character to the real quay and casts, leaving the bite for a touch to reel in',async()=>{
  const f=fishingPanelFixture({name:'Hobart',lat:-42.85,lon:147.295},true);
  const before=f.sim.active().food;
  await f.button('quick').click();f.g.finish();await new Promise(resolve=>setImmediate(resolve));
  const cast=f.sim.active().handline;
  assert.ok(cast,'following the route reaches a legal fishing spot and casts there');
  assert.equal(cast.mode,'walk');assert.equal(cast.x,f.g.street.getState().x);
  assert.equal(f.sim.active().food,before,'casting alone cannot award a catch');
  f.wait();await f.button('line').click();
  assert.equal(f.sim.active().food,before+1);assert.equal(f.sim.active().handline,undefined);f.destroy();
});

test('a fully stocked district parks its interactive truck at the exchange until actual freight is booked',()=>{
  const regular={available:false,done:false,week:1,siteId:site.id,reason:'The regular shops have enough supplies.'},inspections=[];
  const g=surface(740,390,{lives:true,deferFrames:true,getRegularRun:()=>regular,onRegularArrival:()=>null,onTruckInteract:s=>inspections.push(s)});
  const initial=g.street.truckStatus();assert.equal(initial.status,'standby');
  assert(Math.hypot(initial.truck.x-15,initial.truck.y-24)<1);assert.equal(g.street.actorScene('driver').targetPose.mode,'walk');
  for(let i=0;i<550;i++)g.step();
  assert.deepEqual(g.street.truckStatus().truck,initial.truck);g.street.recenter();
  g.tap(g.interactionFrame()(initial.truck.x-.7,initial.truck.y,.48));assert.equal(inspections.length,1);
  g.street.destroy();
});

test('an independent contested pickup is proved at its cab and drives the real truck to the pantry',async()=>{
  const town={...site,agency:{localPositions:{'walker-2':{x:6.1,y:5.2,serial:1}}}};
  let action='take',serial=0,armed=false,g;
  const observations=[];
  const quote=()=>armed&&action?{siteId:town.id,generation:0,week:1,serial,actor:'walker-2',action,name:'Neighbour',destination:{x:9,y:24,name:'Pantry stop'}}:null;
  g=surface(740,390,{lives:true,animated:true,deferFrames:true,getRegularRun:()=>({available:false,week:1,siteId:town.id,reason:'No load is available.'}),
    onRegularArrival:()=>null,getTruckDispute:quote,onTruckDispute:(q,getProof)=>{
      const proof=getProof();observations.push(proof);
      if(q.action==='take'){
        assert.equal(proof.emptyCab,true);assert.equal(proof.stopped,true);assert.equal(proof.mode,'walk');assert(Math.hypot(proof.x-proof.truck.x,proof.y-proof.truck.y)<=1.56);
        town.fleet={serial:1,incident:{actor:q.actor,independent:true,week:1},custody:{kind:'theft',actor:q.actor,week:1,token:1,pickup:proof.truck,anchor:proof.truck,stop:0,delivered:false}};
        action='park';serial++;
      }else{
        assert.equal(proof.mode,'drive');assert(Math.hypot(proof.truck.x-9,proof.truck.y-24)<1.2);
        town.fleet.custody.anchor={...proof.truck};action=null;serial++;
      }
      g.street.setSite(town);return {ok:true};
    }});
  armed=true;g.street.setSite(town);
  const initial=g.street.actorScene('walker-2').targetPose;assert(initial.x<9&&initial.y<9);
  const saved=g.street.snapshotView();assert(g.street.restoreView({...saved,player:{x:21.42,y:4.86,dx:1,dy:0}}));
  let sawOnFoot=false,sawDriving=false;
  for(let i=0;i<12500&&observations.length<2;i++){
    g.step();if(i%20===0){
      const at=g.street.actorScene('walker-2').targetPose;
      if(at.mode==='walk'&&Math.hypot(at.x-initial.x,at.y-initial.y)>1)sawOnFoot=true;
      if(at.mode==='drive'&&at.x<14&&at.x>10)sawDriving=true;
      await new Promise(setImmediate);
    }
  }
  assert.equal(observations.length,2);assert(sawOnFoot&&sawDriving);
  assert.equal(g.street.actorScene('walker-2').targetPose.mode,'walk');
  g.street.destroy();
});

test('dream venues require the actual person, foot travel and arrival before a session can be proved',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true});
  assert.equal(g.street.venueProof('unknown','r1'),null);
  assert.equal(g.street.focusVenue('home','fake'),false);
  assert.equal(g.street.venueProof('home','r1'),null);
  const arrived=[];assert(g.street.focusVenue('home','r1',proof=>arrived.push(proof)));g.finish();
  assert.equal(arrived.length,1);assert.equal(arrived[0].personId,'r1');assert.equal(arrived[0].venue,'home');assert.equal(arrived[0].mode,'walk');
  assert(g.street.venueProof('home','r1'));assert(g.street.toggleVehicle());g.finish();assert.equal(g.street.venueProof('home','r1'),null);g.street.destroy();
});

test('negotiated favours show different roles for the actual two people, then clear when the player leaves',()=>{
  const g=surface(740,390,{lives:true,deferFrames:true});
  assert.equal(g.street.showNeighbourHelp('steward','r1','supper','goods'),false);
  g.street.focusResident('r1');g.finish();
  assert(g.street.showNeighbourHelp('steward','r1','supper','goods'));
  assert.match(g.street.activityOf('steward').label,/Passing over/);
  assert.match(g.street.activityOf('r1').label,/Receiving portions/);
  assert.doesNotMatch(g.street.activityOf('r0').label,/Receiving portions/);
  g.street.focusMarket();g.finish();assert.equal(g.street.activityOf('steward').phase,'player');g.street.destroy();
});

test('completed homes, fruit beds and programmes remain inspectable after their owners leave and across a district reload',()=>{
  const credits=[
    {personId:'r0',name:'Mira',id:'balcony',week:24,earned:'A kitchen balcony'},
    {personId:'walker-3',name:'Jo',id:'orchard',week:68,earned:'First picking'},
    {personId:'walker-1',name:'Hadi',id:'ensemble',week:19,earned:'First set'}
  ];
  const town={...site,buildings:[{kind:'garden',plot:3,id:'garden'},...site.buildings],credits};
  const g=surface(740,390,{deferFrames:true,landmarks:s=>s.credits||[]});
  assert.equal(g.street.focusAchievement('r0','balcony'),false);
  g.street.setSite(town);
  assert(g.street.focusAchievement('r0','balcony'));assert.match(g.hints.at(-1),/Kitchen balcony.*Mira · week 24/);
  assert(g.street.focusAchievement('walker-3','orchard'));assert.match(g.hints.at(-1),/fruit garden.*Jo · week 68/);
  assert(g.street.focusAchievement('walker-1','ensemble'));assert.match(g.hints.at(-1),/performance board.*Hadi · week 19/);
  assert.equal(g.street.focusAchievement('r0','space'),false);
  const other={...site,id:'inland',credits:[]};g.street.setSite(other);assert.equal(g.street.focusAchievement('r0','balcony'),false);
  g.street.setSite(JSON.parse(JSON.stringify(town)));g.street.toggleOverview();
  g.tap(g.overviewFrame()(9.30,22.53,1.12));assert.match(g.hints.at(-1),/Kitchen balcony.*Mira · week 24/);
  g.street.destroy();
});

test('a signed errand waits for both named people to reach the same venue and perform the handover on foot',async()=>{
  const town={...site,agency:{localPositions:{'walker-1':{x:6.1,y:5.1,serial:1},'walker-3':{x:18.7,y:11.4,serial:1}}}};
  const row={siteId:town.id,generation:0,week:1,rowId:'task-1',actorId:'walker-1',targetId:'walker-3',kind:'bench',method:'time',venue:'workshop'};
  const seen=[];let ready=false;
  const g=surface(740,390,{animated:true,lives:true,visible:true,working:()=>ready?[row]:[],
    onNeighbourHelp:(item,proof)=>{
      const p=proof();assert.equal(item.rowId,row.rowId);assert(p);assert.equal(p.venue,'workshop');assert.equal(p.visible,true);
      assert(Math.hypot(p.x-p.tx,p.y-p.ty)<=1.56);
      assert.match(g.street.activityOf(row.actorId).label,/Straightening/);assert.match(g.street.activityOf(row.targetId).label,/Holding/);
      seen.push(p);return {ok:true};
    }});
  ready=true;g.street.setSite(town);g.street.observePerson(row.actorId);assert.equal(g.street.neighbourHelpProof(row.actorId,row.targetId),null);
  for(let i=0;i<2600&&!seen.length;i++){
    g.step();if(i%25===0)await new Promise(setImmediate);
  }
  assert.equal(seen.length,1);assert.equal(g.street.neighbourHelpProof(row.targetId,row.actorId),null);
  for(let i=0;i<120;i++)g.step();await new Promise(setImmediate);assert.equal(seen.length,1);
  g.sheet(true);assert.equal(g.street.neighbourHelpProof(row.actorId,row.targetId),null);
  g.street.destroy();
});

test('a founding household and the transport driver can leave and return without leaving selectable doubles',()=>{
  const absent=new Set(),membership={present:(_site,id)=>!absent.has(id)};
  const g=surface(740,390,{lives:true,deferFrames:true,membership,getRegularRun:()=>({available:false,siteId:site.id,reason:'No booked run'}),onRegularArrival:()=>null});
  assert(g.street.actorScene('r0')&&g.street.actorScene('driver'));
  absent.add('r0');absent.add('driver');g.street.setSite(site);
  assert.equal(g.street.actorScene('r0'),null);assert.equal(g.street.focusResident('r0'),false);
  assert.equal(g.street.actorScene('driver'),null);assert.equal(g.street.regularTruckStatus().attended,false);
  const at=g.street.truckStatus().truck;for(let i=0;i<200;i++)g.step();assert.deepEqual(g.street.truckStatus().truck,at);
  absent.clear();g.street.setSite(site);assert(g.street.actorScene('r0')&&g.street.actorScene('driver'));g.street.destroy();
});

test('only the named harvest carrier carries a settled crop from its real bed to the shared pantry and resumes their ordinary day',()=>{
  const owner='walker-0',carrier='walker-1',history={week:7,kind:'project',projectKind:'food',phase:'finish',projectId:owner+'/1',
    venue:'garden',goal:'Bring the gathered food to the pantry',title:'Bring the gathered food to the pantry'};
  const town={...site,buildings:[{kind:'garden',plot:0,name:'Upland growing beds'}],food:9,
    autonomy:{week:7,projects:{owners:{[owner]:{kind:'food',serial:1,crop:'roots',finished:7,delivered:2,carriedBy:carrier}}},
      people:{[owner]:{history:[{...history,target:carrier}]},[carrier]:{history:[{...history,target:owner}]}}}};
  const g=surface(740,390,{animated:true,deferFrames:true,lives:true,resources:true});
  g.street.setSite(town);g.street.observePerson(carrier);
  const stages=new Set();let unloaded=false,resumed=false,firstCarry=null,lastCarry=null;
  for(let i=0;i<3400;i++){
    g.step();const seen=g.street.activityOf(carrier),peer=g.street.activityOf(owner);
    assert(!/Carrying roots to the shared pantry|Handing roots to the shared pantry/.test(peer.label));
    if(seen.label==='Lifting the settled roots basket'){
      stages.add('lift');assert(Math.hypot(seen.x-3,seen.y-5.04)<1.52);assert(!unloaded);
    }
    if(seen.label==='Carrying roots to the shared pantry'){
      stages.add('carry');firstCarry||=seen;lastCarry=seen;assert(!unloaded);
    }
    if(seen.label==='Handing roots to the shared pantry'){
      stages.add('unload');unloaded=true;assert(Math.hypot(seen.x-9.32,seen.y-23.48)<.15);
    }else if(unloaded&&seen.phase==='work')resumed=true;
  }
  assert.deepEqual([...stages],['lift','carry','unload']);
  assert(Math.hypot(lastCarry.x-firstCarry.x,lastCarry.y-firstCarry.y)>10);assert(resumed);
  assert.equal(town.food,9);
  g.street.setSite({...site,id:'another-district'});g.street.setSite(town);g.street.observePerson(carrier);
  for(let i=0;i<1400;i++){g.step();assert.doesNotMatch(g.street.activityOf(carrier).label,/settled roots basket|roots to the shared pantry/);}
  g.street.destroy();
});

test('the traversable path to another district pauses original Street input and invalidates origin interaction proofs',()=>{
  const g=surface(740,390,{animated:true,lives:true,deferFrames:true});
  g.street.focusMarket();g.finish();const before=g.street.getState(),ref={type:'market'};
  assert(g.street.meeting(ref));g.crossing(true);
  assert.equal(g.street.interact(),false);assert.equal(g.street.meeting(ref),null);assert.equal(g.street.atStop(ref),false);
  assert.equal(g.street.venueProof('market','steward'),null);assert.equal(g.street.move('up'),false);
  g.key('v');g.key('m');for(let i=0;i<120;i++)g.step();
  const paused=g.street.getState();assert.equal(paused.mode,before.mode);assert.equal(paused.x,before.x);assert.equal(paused.y,before.y);assert.equal(paused.zoom,before.zoom);
  g.crossing(false);assert(g.street.meeting(ref));g.street.destroy();
});


test('built gardens and workshops move local collection to the actual plot and release its stock only on arrival',()=>{
  const town={...site,lat:46,lon:12,food:5,materials:8,funds:8,population:12,buildings:[
    {kind:'garden',plot:0,name:'Upland growing beds',id:'beds'}, {kind:'workshop',plot:5,name:'Stone shed',id:'shed'}
  ]};
  const g=surface(740,390,{resources:true,lives:true}),world={week:1},book={till:8},actor='steward';
  g.street.setSite(town);
  for(const [id,place,number] of [['greens','garden',0],['stone','workshop',5]]){
    const local=g.resources.view(world,town,book,100,actor),offer=local.options.find(o=>o.good===id&&o.action==='gatherLot');
    assert.equal(offer.venue.venue,place);assert.equal(offer.venue.plot,number);
    const order={action:offer.action,good:id,actorId:actor,price:offer.price,resourceSerial:local.serial};
    assert.equal(g.resources.run(world,town,order,{siteId:town.id,actor,mode:'walk',venue:place,personId:actor,x:19,y:19,tx:19,ty:19},book,100,'Rae').ok,false);
    let settled=false;
    assert.ok(g.street.focusVenue(place,actor,()=>{
      const proof=g.street.venueProof(place,actor);assert.ok(proof);
      const arrived=g.resources.run(world,town,order,proof,book,100,'Rae');assert.equal(arrived.ok,true,arrived.message);
      assert.ok(g.street.showResourceWork(actor,id));settled=true;
    }));
    g.finish();assert.equal(settled,true);assert.equal(town.resourceLedger.bins[id],2);
    assert.equal(g.resources.run(world,town,order,g.street.venueProof(place,actor),book,100,'Rae').ok,false);
  }
  g.street.destroy();
});

test('a resident taking an emergency fish session casts at physical shore water even when the fishing co-op building is inland',()=>{
  const id='walker-2',project={week:7,kind:'gather',resource:'fish',venue:'dock',title:'Fish for the pantry'};
  const town={...site,water:true,buildings:[{kind:'fishingDock',plot:0,name:'Fish co-op'}],
    autonomy:{week:7,people:{[id]:{history:[project]}}}};
  const g=surface(740,390,{animated:true,deferFrames:true,lives:true,waterfront:s=>s?.water?'ocean':null});
  g.street.setSite(town);g.street.observePerson(id);
  let cast=null;
  for(let i=0;i<2100&&!cast;i++){g.step();const seen=g.street.activityOf(id);if(seen.label==='Drawing in the handline catch')cast=seen;}
  assert(cast);assert(cast.y>=23.1&&cast.y<=25.25);assert(Math.abs(cast.x-6.5)<1.48);assert.equal(cast.venue,'the fishing quay');
  assert(!town.handline);g.street.destroy();
});

test('a lakeside settlement on dry land has a real accessible shore and boat, while a dry interior site has neither',()=>{
  const lake={...site,id:'lake-edge',water:false,coastal:false},dry={...site,id:'upland',water:false,coastal:false};
  const g=surface(740,390,{deferFrames:true,waterfront:s=>s?.id===lake.id?'lake':null});g.street.setSite(lake);
  let arrival=null;assert(g.street.approachFishing('shore',()=>{arrival=g.street.getState();}));g.finish();
  assert(arrival&&arrival.mode==='walk'&&arrival.y>=23.1);assert(g.street.toggleBoat());g.finish();assert.equal(g.street.getState().mode,'boat');
  g.street.setSite(dry);assert.equal(g.street.approachFishing('shore'),false);assert.equal(g.street.toggleBoat(),false);g.street.destroy();
});

test('the twelve founding people remain individually observable, including the nurse and surveyor whose transport slots open later',()=>{
  const roles=[['carrier-8-7','Nadia','Practice nurse'],['carrier-8-5','Owen','Building surveyor']];
  const people=Object.fromEntries(roles.map(([id,name,role])=>[id,{status:'member',originId:site.id,originSlot:id,
    householdRole:role,profile:{id,name,kind:'household',role,originRole:role,home:'Bay',hobbyAxis:'craft',traits:{patience:55,curiosity:40,sociability:51},aptitudes:{stamina:65}}}]));
  const town={...site,agency:{porters:roles.map(r=>r[0])},communityLife:{people},buildings:[{kind:'hall',plot:4,name:'Clinic'},{kind:'workshop',plot:7,name:'Survey office'}]};
  const membership={present:()=>true,residency:()=> 'member',profile:(s,id)=>s?.communityLife?.people?.[id]?.profile||null,travelIntent:()=>null};
  const g=surface(740,390,{animated:true,deferFrames:true,lives:true,membership,
    links:s=>s.open?[{from:8,to:7,resource:'materials'},{from:8,to:5,resource:'food'}]:[]});
  g.street.setSite(town);const all=['steward',...town.residents.map(p=>p.id),'driver',...Array.from({length:5},(_,n)=>'walker-'+n),...roles.map(r=>r[0])];
  assert.equal(new Set(all).size,12);for(const id of all)assert(g.street.actorScene(id),id);
  for(const opened of [false,true]){
    town.open=opened;if(opened)town.buildings=[...town.buildings,{kind:'market',plot:8,name:'Exchange'}];g.street.setSite(town);
    const observed=new Set();g.street.observePerson(roles[0][0]);
    for(let i=0;i<1800;i++){g.step();for(const [id,name] of roles){
      const seen=g.street.activityOf(id);assert.equal(seen.name,name);
      assert.doesNotMatch(seen.label,/Carrying a supply crate/);if(/clinic supplies|shared building frontage/.test(seen.label))observed.add(id);
    }}
    assert.equal(observed.size,2);for(const [id] of roles){assert(g.street.observePerson(id));assert(g.street.focusStop({type:'npc',npcId:id}));g.finish();}
  }g.street.destroy();
});

test('substitutes walk to the former employer and visibly perform only their agreed handover scope',()=>{
  const id='walker-1',g=surface(740,390,{animated:true,lives:true,deferFrames:true});
  const town={...site,buildings:[{kind:'hall',plot:7,name:'Community clinic'}],careers:{[id]:{jobId:'carpenter'}},autonomy:{people:{[id]:{history:[]}}}};
  const scope=(handoverScope,title)=>{
    town.autonomy.people[id].history=[{week:2,kind:'commitment',handoverRole:'Practice nurse',handoverScope,venue:'hall',title}];
    g.street.setSite(town);assert(g.street.observePerson(id));
    const steps=new Set();
    for(let i=0;i<1800;i++){
      g.step();const body=g.street.activityOf(id);
      if(body?.goal!==title||body.phase==='travel')continue;
      assert(Math.hypot(body.x-9,body.y-17.04)<1.52);
      steps.add(body.label);
    }
    return [...steps].join('|');
  };
  const admin=scope('admin','Cover the outgoing appointment desk');
  assert.match(admin,/Updating appointment and referral records/);assert.doesNotMatch(admin,/clinic supplies/);
  const qualified=scope('qualified','Cover the qualified home-visit round');
  assert.match(qualified,/Packing the clinic supplies for the home-visit round/);
  assert.equal(town.careers[id].jobId,'carpenter');g.street.destroy();
});
