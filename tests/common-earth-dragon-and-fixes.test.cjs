'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCommonEarthEnv() {
  const ctx = vm.createContext({
    console,
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Error,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout,
    clearTimeout,
    performance: { now: () => Date.now() },
    Intl
  });
  ctx.globalThis = ctx;
  ctx.window = ctx;
  ctx.self = ctx;

  const scripts = [
    'flight-physics.js',
    'dragon-stable.js',
    'community-life.js',
    'district-path.js',
    'original-life.js',
    'neighbours.js',
    'route-terrain.js',
    'voyages.js',
    'shifts.js',
    'campaigns.js',
    'strategy.js',
    'partners.js',
    'city.js',
    'legacy.js',
    'goals.js',
    'construction.js',
    'dismantling.js',
    'personas.js',
    'dreams.js',
    'social-memory.js',
    'careers.js',
    'employers.js',
    'local-projects.js',
    'provisions.js',
    'civic-initiatives.js',
    'resource-economy.js',
    'market.js',
    'resident-shops.js',
    'purses.js',
    'autonomy.js',
    'fleet.js',
    'social-introductions.js',
    'neighbour-errands.js',
    'dialogue.js',
    'agency.js',
    'fisheries.js',
    'pursuits.js',
    'world-storage.js',
    'district-orders.js',
    'day-clock.js',
    'base-field.js',
    'military-base.js',
    'nightlife.js',
    'district-growth.js',
    'regional-world.js',
    'practice.js',
    'cooperative-works.js',
    'council-homes.js',
    'border-conflict.js',
    'housing.js',
    'town-centre.js',
    'simulation.js'
  ];

  for (const file of scripts) {
    const full = path.join(__dirname, '..', 'common-earth', file);
    const code = fs.readFileSync(full, 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

test('EarthFlightPhysics: perimeter walls sit outside all roads & parking bays, leave waterfront open, and enforce solid collision boundaries', () => {
  const FP = require('../common-earth/flight-physics.js');
  const wallSegs = FP.perimeterWallSegments(3, 0, true);
  assert.ok(wallSegs.length > 0, 'Stage 3 fortification produces perimeter wall segments');

  // Cars and EXCHANGE ST road live inside [-0.87, 24.87]. No solid wall may overlap that box!
  const roadBox = [-0.87, -0.87, 24.87, 24.87];
  for (const seg of wallSegs) {
    if (seg.box) {
      assert.equal(FP.rectOverlaps(seg.box, roadBox), false, `Wall segment ${seg.id} must not overlap roads/parking bays`);
    }
  }
  // Coastal waterfront (south side, y > 24.87) must remain open for docks & boats
  assert.equal(wallSegs.some(s => s.id.startsWith('south-')), false, 'Waterfront south side remains open');

  // Expanded territory pushes perimeter walls further outward
  const b0 = FP.perimeterBounds(0, true);
  const b2 = FP.perimeterBounds(2, true);
  assert.ok(b2.minX < b0.minX && b2.maxX > b0.maxX && b2.minY < b0.minY, 'Territory expansion expands perimeter');

  // Military base + very long runway sits completely outside walls & houses with zero overlap
  const base = FP.militaryBaseLayout(0);
  assert.ok(base.runway.length >= 20, 'Military runway is at least 20 world units long');
  assert.equal(FP.rectOverlaps(base.exclusionBox, roadBox), false, 'Military base never overlaps central town');
  for (const seg of wallSegs) {
    if (seg.box) {
      assert.equal(FP.rectOverlaps(seg.box, base.exclusionBox), false, `Wall ${seg.id} never overlaps military airbase/runway`);
    }
  }

  // Open-land building check rejects roads, military base, and existing solids, and accepts clear open land
  const onRoad = FP.isLandClearForBuilding(12, 12, 1.5, 1.5, { territoryLevel: 0, hasWaterfront: true });
  assert.equal(onRoad.clear, false, 'Rejects building on central town road/block');
  const onBase = FP.isLandClearForBuilding(base.place.x, base.place.y, 1.5, 1.5, { territoryLevel: 0, hasWaterfront: true });
  assert.equal(onBase.clear, false, 'Rejects building over military base');
  const openLand = FP.isLandClearForBuilding(-5.0, 8, 1.5, 1.5, { territoryLevel: 0, hasWaterfront: true });
  assert.equal(openLand.clear, true, 'Accepts clear open land inside initial perimeter');
});

test('EarthFlightPhysics: 6-DOF dragon aerodynamics & fighter jet runway takeoff physics', () => {
  const FP = require('../common-earth/flight-physics.js');

  // 1. Enchanted Dragon aerodynamic capabilities: flap, dive airspeed gain, bank-to-turn, unlimited travel, fire cone
  const dragon = FP.createFlightState('dragon', { x: 0, y: 40, z: 0, speed: 24, pitch: 0 });
  const speedBefore = dragon.speed;
  // Dive converts altitude into airspeed
  for (let i = 0; i < 30; i++) FP.stepFlight(dragon, { pitch: -0.7, throttle: 0.7 }, 0.05);
  assert.ok(dragon.speed > speedBefore, 'Diving converts altitude into higher airspeed');

  // Banking turns heading smoothly
  const yawBefore = dragon.yaw;
  for (let i = 0; i < 20; i++) FP.stepFlight(dragon, { roll: 0.85, throttle: 0.75 }, 0.05);
  assert.ok(Math.abs(dragon.yaw - yawBefore) > 0.25, 'Banking causes smooth aerodynamic coordinated turn');

  // Wing flap gives vertical lift & forward impulse
  const vyBefore = dragon.vy;
  FP.stepFlight(dragon, { flap: true, throttle: 0.8 }, 0.05);
  assert.ok(dragon.vy > vyBefore, 'Wing flap imparts immediate upward aerodynamic impulse');

  // Unlimited sky travel: flying far out has zero boundary clamp
  dragon.x = 4500;
  dragon.z = -3800;
  FP.stepFlight(dragon, { throttle: 1 }, 0.1);
  assert.ok(dragon.x > 4400 && dragon.z < -3700, 'Dragon has unrestricted flight anywhere across the world');

  // Fire-cone targeting finds enemies/buildings directly ahead of the dragon
  const fwd = FP.forwardVector(dragon.yaw, dragon.pitch);
  const targets = [
    { id: 'enemy-1', kind: 'enemy', x: dragon.x + fwd.x * 25, y: dragon.y + fwd.y * 25, z: dragon.z + fwd.z * 25, radius: 5 },
    { id: 'far-away', kind: 'building', x: dragon.x - fwd.x * 80, y: dragon.y, z: dragon.z - fwd.z * 80, radius: 5 }
  ];
  const hits = FP.findTargetsInFireCone(dragon, targets);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].target.id, 'enemy-1');

  // 2. Military Fighter Jet takes off from long runway and climbs cleanly into the sky
  const jet = FP.createFlightState('jet', { x: 100, y: 0.6, z: 0, speed: 0, airborne: false });
  assert.equal(jet.airborne, false);
  for (let i = 0; i < 90; i++) {
    FP.stepFlight(jet, { throttleDelta: 1, boost: true, pitch: jet.speed > 40 ? 0.65 : 0 }, 0.05);
  }
  assert.equal(jet.airborne, true, 'Fighter jet lifts off the runway once rotation speed is reached');
  assert.ok(jet.y > 15, `Fighter jet climbs high into the sky (y=${jet.y.toFixed(1)})`);
  assert.ok(jet.speed > 55, `Fighter jet achieves high airborne airspeed (${jet.speed.toFixed(1)})`);
});

test('Dragon Stable: Wizard-only dragon flight, stable workers replenishing dragon food, and fire blasts (combat + fun)', async () => {
  const ctx = loadCommonEarthEnv();
  const sim = ctx.CommonEarthSim.create();
  sim.found({ name: 'Stone Town', lat: -6.1622, lon: 39.1922, water: false }, 'Stone Town');
  const site = sim.active();
  site.funds = 100;
  site.materials = 60;
  site.food = 60;

  // Build Dragon Stable on open land
  const built = await sim.perform('buildFreeBuilding', { siteId: site.id, kind: 'dragonStable' });
  assert.equal(built.ok, true, built.message);
  assert.equal(ctx.EarthDragonStable.hasStable(site), true);

  // Summon an enchanted dragon
  const summoned = await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'starlight', name: 'Aurelia' });
  assert.equal(summoned.ok, true, summoned.message);
  const dragon = site.dragonStable.dragons[0];
  assert.equal(dragon.name, 'Aurelia');

  // Non-wizard CANNOT fly the dragon
  const blocked = ctx.EarthDragonStable.canFlyDragon(site, 'steward', dragon.id);
  assert.equal(blocked.ok, false, 'Non-wizard must not be allowed to fly a dragon');

  // Train steward as Wizard & create a new Wizard from the Dragon Stable
  const trained = await sim.perform('dragonAction', { siteId: site.id, action: 'trainWizard', personId: 'steward' });
  assert.equal(trained.ok, true, trained.message);
  const createdWiz = await sim.perform('dragonAction', { siteId: site.id, action: 'createWizard', name: 'Lyra Solis' });
  assert.equal(createdWiz.ok, true, createdWiz.message);
  assert.equal(site.dragonStable.wizards.length, 2);

  // Wizard CAN fly the dragon
  const allowed = ctx.EarthDragonStable.canFlyDragon(site, 'steward', dragon.id);
  assert.equal(allowed.ok, true, 'Trained Wizard is cleared to fly the dragon');

  // Blast fire mid-flight for fun AND attack a building/enemy
  const funFire = await sim.perform('dragonAction', { siteId: site.id, action: 'blastFire', riderId: 'steward', dragonId: dragon.id, target: { kind: 'fun' } });
  assert.equal(funFire.ok, true, funFire.message);
  const atkFire = await sim.perform('dragonAction', { siteId: site.id, action: 'blastFire', riderId: 'steward', dragonId: dragon.id, target: { kind: 'enemy', name: 'Rival Watchtower' } });
  assert.equal(atkFire.ok, true, atkFire.message);
  assert.equal(dragon.blasts, 2);

  // Assign a resident worker to replenish food & feed hungry dragons regularly
  const workerId = site.residents[0].id;
  const assigned = await sim.perform('dragonAction', { siteId: site.id, action: 'assignWorker', personId: workerId });
  assert.equal(assigned.ok, true, assigned.message);

  site.dragonStable.foodStock = 4;
  dragon.hunger = 35;
  ctx.EarthDragonStable.tick(sim.state, site, 1);
  assert.ok(site.dragonStable.foodStock >= 4, 'Worker replenished dragon food larder automatically');
  assert.ok(dragon.hunger > 35, 'Hungry dragon was fed automatically from replenished stable stock');
});

test('The Reading Room Café: Sit down, read at least 5 books on screen, order & pay for coffee, and drink it', async () => {
  const ctx = loadCommonEarthEnv();
  const sim = ctx.CommonEarthSim.create();
  sim.found({ name: 'Valparaíso', lat: -33.0458, lon: -71.623, water: false }, 'Valparaíso Commons');
  const site = sim.active();
  site.funds = 40;
  if (site.purses?.people?.steward) site.purses.people.steward.balance = 15;

  assert.ok(ctx.EarthNightlife.BOOKS.length >= 5, `Café must offer at least 5 books (has ${ctx.EarthNightlife.BOOKS.length})`);
  for (const book of ctx.EarthNightlife.BOOKS) {
    assert.ok(Array.isArray(book.pages) && book.pages.length >= 3, `Book "${book.title}" has full readable pages`);
  }

  // Sit in the reading room
  const sit = await sim.perform('cafeSit', { siteId: site.id, seated: true });
  assert.equal(sit.ok, true);
  assert.equal(site.cafeState.seated, true);

  // Pick a book & turn to page 2
  const read = await sim.perform('cafeBook', { siteId: site.id, bookId: ctx.EarthNightlife.BOOKS[2].id, page: 1 });
  assert.equal(read.ok, true);
  assert.equal(site.cafeState.bookId, ctx.EarthNightlife.BOOKS[2].id);
  assert.equal(site.cafeState.page, 1);

  // Order & pay for a coffee
  const coffee = ctx.EarthNightlife.COFFEE_MENU[0];
  const beforeBalance = site.purses?.people?.steward?.balance ?? site.funds;
  const ordered = await sim.perform('orderCafeCoffee', { siteId: site.id, coffeeId: coffee.id });
  assert.equal(ordered.ok, true, ordered.message);
  const afterBalance = site.purses?.people?.steward?.balance ?? site.funds;
  assert.ok(afterBalance < beforeBalance, 'Ordering coffee deducts money');
  assert.equal(site.cafeState.cup.id, coffee.id);
  assert.ok(site.cafeState.cup.sipsLeft > 0);

  // Drink coffee until finished
  let finished = false;
  for (let i = 0; i < 6; i++) {
    const sip = await sim.perform('drinkCafeCoffee', { siteId: site.id });
    assert.equal(sip.ok, true);
    if (!site.cafeState.cup) { finished = true; break; }
  }
  assert.equal(finished, true, 'Sim finishes drinking the ordered coffee');
  assert.ok(site.cafeState.cupsServed >= 1);
});

test('Player Houses, Unlimited Resident Importing, Territory Expansion, Freeform Open-Land Building & Unrestricted Ocean Boats', async () => {
  const ctx = loadCommonEarthEnv();
  const sim = ctx.CommonEarthSim.create();
  sim.found({ name: 'Stone Town', lat: -6.1622, lon: 39.1922, water: false }, 'Stone Town');
  const site = sim.active();
  site.funds = 200;
  site.materials = 150;
  site.food = 150;

  const cap0 = ctx.EarthCityModel.housingCapacity(site);
  const pop0 = site.population;

  // Expand territory twice
  const exp1 = await sim.perform('expandTerritory', { siteId: site.id });
  assert.equal(exp1.ok, true, exp1.message);
  assert.equal(site.territoryLevel, 1);

  // Build 3 houses freely on open land
  for (let i = 0; i < 3; i++) {
    const res = await sim.perform('buildPlayerHouse', { siteId: site.id });
    assert.equal(res.ok, true, res.message);
  }
  assert.equal(site.playerHouses.length, 3);
  const cap1 = ctx.EarthCityModel.housingCapacity(site);
  assert.equal(cap1, cap0 + 12, 'Three player houses add 12 residential places');

  // Import 5 new community members
  for (let i = 0; i < 5; i++) {
    const imp = await sim.perform('importResident', { siteId: site.id });
    assert.equal(imp.ok, true, imp.message);
  }
  assert.equal(site.population, pop0 + 5, 'Importing residents grows community population smoothly');

  // Open-land freeform building outside the 9 central plots
  const freeGarden = await sim.perform('buildFreeBuilding', { siteId: site.id, kind: 'garden', x: -5.5, y: 12 });
  assert.equal(freeGarden.ok, true, freeGarden.message);
  assert.ok(site.freeBuildings.some(b => b.kind === 'garden' && b.x === -5.5));

  // Verify open-ocean boat position validates far beyond old y=39 shallows limit
  site.handline = { mode: 'boat', x: 185, y: 420, castAt: 100, food: 2 };
  const snapshot = JSON.stringify(sim.state);
  const loaded = ctx.CommonEarthSim.readSave(snapshot);
  assert.ok(loaded && loaded.sites?.length >= 1, 'Open-ocean boat coordinates and all new state serialize & validate cleanly');
});

test('map mounting uses the played wizard, accepts a chosen rider, and enforces training and nourishment', async () => {
  const ctx = loadCommonEarthEnv();
  const sim = ctx.CommonEarthSim.create();
  sim.found({name:'Stone Town',lat:-6.16,lon:39.19,water:false},'Dragon Quay');
  const site = sim.active();
  const wizard = {id:site.residents[0].id,name:'Rider',title:'Skyweaver'};
  const dragon = {id:'dragon-1',name:'Aurelia',hunger:90};
  site.dragonStable = {built:true,dragons:[dragon],wizards:[wizard],workers:[]};
  const launches = [], notices = [];
  ctx.EarthFlight3D = {isOpen:()=>false,launch:opts=>{launches.push(opts);return true;}};
  const element = {open:false,focus(){}};
  ctx.document = {getElementById:()=>element};
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../common-earth/dragon-ui.js'),'utf8'),ctx);
  const ui = ctx.EarthDragonUI.mount({sim,notify:msg=>notices.push(msg)});
  const target = {siteId:site.id,dragonId:dragon.id};
  await ui.mountDragon(target);
  assert.equal(launches[0].wizard.id,wizard.id);
  assert.equal(launches[0].dragon.id,dragon.id);
  site.dragonStable.wizards.push({id:'steward',name:'Player',title:'Windbinder'});
  await ui.mountDragon(target);
  assert.equal(launches[1].wizard.id,'steward');
  await ui.mountDragon(target,wizard.id);
  assert.equal(launches[2].wizard.id,wizard.id);
  dragon.hunger = 2;
  await ui.mountDragon(target);
  assert.match(notices.at(-1),/hungry/);
  site.dragonStable.wizards = [];
  await ui.mountDragon(target);
  assert.match(notices.at(-1),/Train a Wizard/);
  assert.equal(launches.length,3);
});

test('EarthFlightPhysics: Sky-Dash surge, terrain-aware landing/perching anywhere, and compassBearing navigation', () => {
  const FP = require('../common-earth/flight-physics.js');

  // 1. Sky-Dash surges dragon speed above normal cruise
  const cruiseDragon = FP.createFlightState('dragon', { x: 0, y: 60, z: 0, speed: 30, pitch: 0 });
  const dashDragon = FP.createFlightState('dragon', { x: 0, y: 60, z: 0, speed: 30, pitch: 0 });
  for (let i = 0; i < 40; i++) {
    FP.stepFlight(cruiseDragon, { throttle: 1 }, 0.05);
    FP.stepFlight(dashDragon, { throttle: 1, dash: true }, 0.05);
  }
  assert.ok(dashDragon.speed > cruiseDragon.speed + 8, `Sky-Dash speed (${dashDragon.speed.toFixed(1)}) exceeds normal cruise (${cruiseDragon.speed.toFixed(1)})`);

  // 2. Terrain-aware landing/perching on an elevated mountain peak & taking back off
  const mountainHeight = (x, z) => (Math.hypot(x - 200, z + 300) < 40 ? 48 : 0);
  const perched = FP.createFlightState('dragon', { x: 200, y: 50, z: -300, speed: 6, pitch: -0.15 });
  for (let i = 0; i < 40; i++) {
    FP.stepFlight(perched, { throttle: 0, hover: true, groundHeightAt: mountainHeight }, 0.05);
  }
  assert.ok(perched.y >= 48 + 1.2, `Dragon respects elevated terrain floor (y=${perched.y.toFixed(1)})`);

  // Take off cleanly with flap + climb
  for (let i = 0; i < 40; i++) {
    FP.stepFlight(perched, { throttle: 0.9, flap: i === 0 || i === 18, pitch: 0.45, groundHeightAt: mountainHeight }, 0.05);
  }
  assert.equal(perched.airborne, true, 'Dragon takes off cleanly from elevated perch');
  assert.ok(perched.y > 58, `Dragon climbs high above mountain perch (y=${perched.y.toFixed(1)})`);

  // 3. Compass bearing calculation wraps cleanly and reports accurate cardinal headings & distances
  const nav = FP.createFlightState('dragon', { x: 0, y: 50, z: 0, yaw: 0, pitch: 0 }); // facing -Z (North)
  const north = FP.compassBearing(nav, { x: 0, z: -100 });
  assert.ok(Math.abs(north.relativeDeg) < 0.5, `Target due North has ~0 relative bearing (${north.relativeDeg})`);
  assert.ok(Math.abs(north.distance - 100) < 0.5, 'Accurate distance to North target');

  const east = FP.compassBearing(nav, { x: 100, z: 0 });
  assert.ok(Math.abs(east.relativeDeg - 90) < 1.0 || Math.abs(east.relativeDeg + 90) < 1.0, `East target is orthogonal (${east.relativeDeg})`);
  assert.ok(Math.abs(east.distance - 100) < 0.5, 'Accurate distance to East target');

  const south = FP.compassBearing(nav, { x: 0, z: 100 });
  assert.ok(Math.abs(Math.abs(south.relativeDeg) - 180) < 1.0, `South target is directly behind (${south.relativeDeg})`);
});

test('Flight 3D cache-busting hashes & Canvas 2D fallback renderer resilience', async () => {
  const crypto = require('node:crypto');
  const sha12 = relPath => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '..', 'common-earth', relPath))).digest('hex').slice(0, 12);

  // 1. Verify common-earth/index.html has up-to-date ?v= hashes for all flight/dragon assets
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'common-earth/index.html'), 'utf8');
  for (const file of ['flight-3d.css', 'flight-physics.js', 'dragon-art.js', 'dragon-ui.js', 'flight-3d.js']) {
    const expected = `${file}?v=${sha12(file)}`;
    assert.ok(html.includes(expected), `common-earth/index.html must reference ${expected} to prevent stale cached modules`);
  }

  // 2. Verify flight-3d.js imports vendor/three-flight-r187.mjs & flight-canvas.mjs with exact SHA-256 ?v= hashes
  const flightSrc = fs.readFileSync(path.resolve(__dirname, '..', 'common-earth/flight-3d.js'), 'utf8');
  for (const dep of ['flight-canvas.mjs', 'vendor/three-flight-r187.mjs']) {
    const expected = `./${dep}?v=${sha12(dep)}`;
    assert.ok(flightSrc.includes(expected), `flight-3d.js must import ${expected} so browsers never load a stale Three.js vendor bundle`);
  }

  // 3. Verify Canvas 2D fallback renderer never crashes on null scene.background, ShaderMaterial, BackSide sky domes, or InstancedMesh
  const { pathToFileURL } = require('node:url');
  const { createCanvasFlightRenderer } = await import(pathToFileURL(path.resolve(__dirname, '..', 'common-earth/flight-canvas.mjs')).href);
  const calls = [];
  const fakeCtx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
    fill: () => calls.push(['fill']), stroke: () => {}
  };
  const fakeCanvas = { width: 320, height: 240, getContext: () => fakeCtx };
  const renderer = createCanvasFlightRenderer(fakeCanvas);
  renderer.setSize(320, 240);
  const ident = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const fakeCamera = {
    near: 0.5,
    far: 2000,
    updateMatrixWorld: () => {},
    matrixWorldInverse: { elements: ident },
    projectionMatrix: { elements: [1.5,0,0,0, 0,1.5,0,0, 0,0,-1,-1, 0,0,-1,0] }
  };
  const makePos = arr => ({ count: arr.length / 3, getX: i => arr[i*3], getY: i => arr[i*3+1], getZ: i => arr[i*3+2] });
  const makeMesh = (mat, arr, extra = {}) => ({
    isMesh: true, visible: true, renderOrder: 0,
    material: { visible: true, side: 0, opacity: 1, ...mat },
    geometry: {
      attributes: { position: makePos(arr) },
      boundingSphere: { center: { x: 0, y: 0, z: -6 }, radius: 4 }
    },
    modelViewMatrix: { elements: [...ident], multiplyMatrices() { return this; } },
    matrixWorld: { elements: ident, getMaxScaleOnAxis: () => 1 },
    ...extra
  });
  const objects = [
    // BackSide sky dome ShaderMaterial (no .color) — must be skipped cleanly
    makeMesh({ isShaderMaterial: true, side: 1, uniforms: { uZenith: { value: { getStyle: () => '#123456' } } } }, [0,0,-5, 1,0,-5, 0,1,-5]),
    // InstancedMesh — must be skipped cleanly
    makeMesh({ color: { r: 0.4, g: 0.6, b: 0.3, getHex: () => 0x66994d } }, [0,0,-5, 1,0,-5, 0,1,-5], { isInstancedMesh: true }),
    // Ocean ShaderMaterial with uDeepColor uniform (no .color)
    makeMesh({ isShaderMaterial: true, side: 2, uniforms: { uDeepColor: { value: { r: 0.1, g: 0.3, b: 0.5, getHex: () => 0x1a4d80 } } } }, [-2,-1,-6, 2,-1,-6, 0,2,-6])
  ];
  const fakeScene = {
    background: null,
    updateMatrixWorld: () => {},
    traverseVisible: cb => { for (const o of objects) cb(o); }
  };
  assert.doesNotThrow(() => renderer.render(fakeScene, fakeCamera), 'Canvas 2D fallback renders safely with null background, ShaderMaterial & InstancedMesh');
  assert.ok(calls.some(c => c[0] === 'fillRect'), 'Canvas 2D fallback cleared the sky background');
  assert.ok(calls.some(c => c[0] === 'fill'), 'Canvas 2D fallback rasterized visible triangles from ShaderMaterial meshes');
});


