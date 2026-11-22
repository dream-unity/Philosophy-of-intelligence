const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

function loadSimEnv() {
  const ctx = {
    console, Math, Date, JSON, Set, Map, Array, Object, Number, String, Boolean,
    RegExp, Error, Promise, parseInt, parseFloat, isNaN, isFinite, structuredClone,
    setTimeout, clearTimeout,
    localStorage: {
      _map: new Map(),
      getItem(k) { return this._map.has(k) ? this._map.get(k) : null; },
      setItem(k, v) { this._map.set(k, String(v)); },
      removeItem(k) { this._map.delete(k); }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);

  const scripts = [
    'common-earth/flight-physics.js',
    'common-earth/night-audio.js',
    'common-earth/dragon-stable.js',
    'common-earth/giant-trolls.js',
    'common-earth/community-life.js',
    'common-earth/neighbours.js',
    'common-earth/city.js',
    'common-earth/personas.js',
    'common-earth/agency.js',
    'common-earth/housing.js',
    'common-earth/simulation.js'
  ];
  for (const rel of scripts) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
  }
  return ctx;
}

test('Every community starts with a Giant Wolf Cave and 2 roaming Majestic Wolves (zero dragons, zero wizards)', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  const founded = await sim.perform('found', { name: 'Stone Town', region: 'Zanzibar', lat: -6.1622, lon: 39.1922, water: false });
  assert.equal(founded.ok, true);
  const site = sim.active();

  assert.equal(ctx.EarthDragonStable.hasStable(site), true, 'Newly founded community must start with a Giant Wolf Cave');
  assert.equal(site.dragonStable.built, true);
  const caveEntry = (site.freeBuildings || []).find(fb => fb.kind === 'dragonStable');
  assert.ok(caveEntry, 'Giant Wolf Cave must be placed in site.freeBuildings');
  assert.equal(caveEntry.name, 'Giant Wolf Cave');
  assert.equal(ctx.CommonEarthSim.buildings.dragonStable.name, 'Giant Wolf Cave');

  assert.equal(site.dragonStable.wizards.length, 0, 'Wizards must be completely removed');
  assert.ok(site.dragonStable.dragons.length >= 2, 'Starter pack of at least 2 Majestic Wolves must be present at founding');
  assert.ok(site.dragonStable.dragons.every(w => /Wolf/i.test(w.lineageTitle)), 'Pack members must be Majestic Wolves');

  // Calling another Majestic Wolf works cleanly with default starting resources
  const called = await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'arctic-moon', name: 'Ayla' });
  assert.equal(called.ok, true, `Expected calling a new wolf to succeed: ${called.message}`);
  assert.equal(site.dragonStable.dragons.length, 3);
  assert.equal(site.dragonStable.dragons[2].name, 'Ayla');
  assert.equal(ctx.EarthDragonStable.valid(site.dragonStable), true);
});

test('Realistic human-sized Zombies spawn in waves of 10+, hunt villagers, bite Majestic Wolves, and claw village shelters', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  const site = sim.active();
  site.population = 20;
  site.materials = 40;
  site.funds = 50;

  const summary = ctx.EarthGiantTrolls.summary(sim.state, site.id);
  assert.equal(summary.communityName, 'Undead Plague Horde');
  assert.ok(summary.localCount >= 10, `Every zombie wave must have >= 10 local zombies (got ${summary.localCount})`);
  assert.ok(summary.elsewhereCount >= 1, 'Zombies must also swarm neighbouring communities');

  for (const z of summary.local) {
    assert.ok(z.heightMeters >= 1.70 && z.heightMeters <= 1.95, `Zombie ${z.name} must be realistic human height (got ${z.heightMeters}m)`);
    assert.ok(z.maxHp >= 350, `Zombies should be resilient enough for real skirmishes (got ${z.maxHp})`);
  }

  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  const lead = zombies[0];
  // Move lead zombie near a villager AND near a wolf to verify authentic zombie behavior (bites everything moving!)
  lead.x = 10; lead.y = 6; lead.state = 'attacking'; lead.attackTimer = 0.05;
  const mockSims = [{ id: 'sim-1', name: 'Amina', x: 10.6, y: 6.2, downed: false }];
  let simBites = 0, wolfBites = 0, shelterClaws = 0, sawFeeding = false;

  for (let i = 0; i < 60; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.2, { sims: mockSims, wolves: [], isNight: false });
    if (lead.attackPhase === 'feed') sawFeeding = true;
    for (const ev of evs) {
      if (ev.type === 'simStrike') simBites++;
    }
    if (simBites >= 1 && sawFeeding) break;
  }
  assert.ok(simBites >= 1, 'Zombies must relentlessly lunge and bite villagers');
  assert.equal(sawFeeding, true, 'Zombies must enter feeding pose after biting a villager');

  // Now place a Majestic Wolf right beside the zombie (no Sims nearby) — zombie must try to eat the wolf too!
  const wolf = site.dragonStable.dragons[0];
  const wolfStartHp = wolf.hp;
  lead.attackPhase = 'chase';
  lead.attackTimer = 0.05;
  lead.x = 10; lead.y = 6;
  const mockWolves = [{ wolf, dragon: wolf, x: 10.5, y: 6.1 }];
  for (let i = 0; i < 60; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.2, { sims: [], wolves: mockWolves, isNight: false });
    for (const ev of evs) {
      if (ev.type === 'wolfStrike') wolfBites++;
    }
    if (wolfBites >= 1) break;
  }
  assert.ok(wolfBites >= 1, 'Zombies must also try to bite and eat roaming Majestic Wolves');
  assert.ok(wolf.hp < wolfStartHp, 'Zombie bite must reduce the wolf HP');

  // With no moving targets nearby, zombies claw into village shelters
  lead.attackPhase = 'chase';
  lead.attackTimer = 0.05;
  for (let i = 0; i < 120; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25, { sims: [], wolves: [], isNight: false });
    for (const ev of evs) {
      if (ev.type === 'buildingStrike') shelterClaws++;
    }
    if (shelterClaws >= 2) break;
  }
  assert.ok(shelterClaws >= 2, 'Zombies must claw and damage village shelters');
});

test('Majestic Wolves travel freely up to EXACTLY 100.0 meters outside community territory — no more and no less', async () => {
  const ctx = loadSimEnv();
  const FP = ctx.EarthFlightPhysics;
  const WC = ctx.EarthDragonStable;

  assert.equal(FP.MAX_WOLF_OUTSIDE_METERS, 100);
  assert.equal(WC.MAX_OUTSIDE_METERS, 100);

  // Pure Euclidean 100m clamp checks on straight edges AND diagonal corners
  const inner = FP.perimeterBounds(0, false);
  const farNorth = FP.clampPointToWolfTerritory2D(12, inner.minY - 50, 0, false);
  const distNorth = FP.distanceOutsideTerritoryMeters(farNorth.x, farNorth.y, 0, false);
  assert.ok(Math.abs(distNorth - 100) < 0.05, `Straight north boundary must be exactly 100.0m, got ${distNorth.toFixed(3)}m`);

  const farCorner = FP.clampPointToWolfTerritory2D(inner.maxX + 40, inner.maxY + 40, 0, false);
  const distCorner = FP.distanceOutsideTerritoryMeters(farCorner.x, farCorner.y, 0, false);
  assert.ok(Math.abs(distCorner - 100) < 0.05, `Diagonal corner boundary must be exactly 100.0m (Euclidean), got ${distCorner.toFixed(3)}m`);

  const midOutside = FP.clampPointToWolfTerritory2D(12, inner.minY - (65 / FP.METERS_PER_STREET_UNIT), 0, false);
  const distMid = FP.distanceOutsideTerritoryMeters(midOutside.x, midOutside.y, 0, false);
  assert.ok(Math.abs(distMid - 65) < 0.2, `Point 65m outside territory must NOT be clamped (got ${distMid.toFixed(2)}m)`);

  // Live simulation check: put a zombie 75m outside territory (wolf MUST reach & kill it!)
  // and another zombie 180m outside territory (wolf MUST stop at exact 100m border and NEVER exceed 100m!)
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Valparaiso', region: 'Chile', lat: -33.0458, lon: -71.623, water: false });
  const site = sim.active();
  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  for (const z of zombies) { z.hp = 0; z.state = 'slain'; }

  // 1) Zombie at 180m north: wolves sprint out to intercept, reach ~100m outside, and NEVER exceed 100.01m
  const farZombie = zombies[0];
  farZombie.hp = 400; farZombie.maxHp = 400; farZombie.state = 'approaching';
  farZombie.x = 12;
  farZombie.y = inner.minY - (180 / FP.METERS_PER_STREET_UNIT);

  let maxObservedOutsideM = 0;
  for (let step = 0; step < 100; step++) {
    const res = WC.stepAutonomousDefenders(sim.state, site, 0.25, { time: step * 0.25, isNight: false });
    for (const p of res.poses) {
      const outM = FP.distanceOutsideTerritoryMeters(p.x, p.y, site.territoryLevel || 0, Boolean(site.water));
      assert.ok(outM <= 100.05, `Wolf ${p.wolf.name} exceeded 100m limit! (${outM.toFixed(2)}m)`);
      if (outM > maxObservedOutsideM) maxObservedOutsideM = outM;
    }
  }
  assert.ok(maxObservedOutsideM >= 98.5 && maxObservedOutsideM <= 100.05, `Wolves must be able to travel right up to the 100m boundary (max reached: ${maxObservedOutsideM.toFixed(2)}m)`);

  // 2) Zombie at 70m north: wolves cross outside community territory (within 100m) and tear it down!
  farZombie.y = inner.minY - (70 / FP.METERS_PER_STREET_UNIT);
  let biteEvents = 0;
  for (let step = 0; step < 160; step++) {
    const res = WC.stepAutonomousDefenders(sim.state, site, 0.25, { time: (100 + step) * 0.25, isNight: false });
    for (const p of res.poses) {
      const outM = FP.distanceOutsideTerritoryMeters(p.x, p.y, site.territoryLevel || 0, Boolean(site.water));
      assert.ok(outM <= 100.05, `Combat wolf exceeded 100m limit (${outM.toFixed(2)}m)`);
    }
    for (const ev of res.events) if (ev.type === 'wolfBite') biteEvents++;
    if (farZombie.hp <= 0) break;
  }
  assert.ok(biteEvents >= 3, `Expected wolves to bite zombie at 70m outside territory (got ${biteEvents} bites)`);
  assert.equal(farZombie.hp, 0, 'Majestic Wolves must kill zombies inside their 100m outer range');
});

test('Full Moon Night triggers continuous never-stopping Zombie howling, synchronized Wolf Pack howling, and Web Audio sound state', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Rotterdam', region: 'Netherlands', lat: 51.9219, lon: 4.478, water: false });
  const site = sim.active();

  // During daytime: zombies are not night-howling
  ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25, { sims: [], wolves: [], isNight: false });
  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  assert.equal(zombies.every(z => !z.howling), true, 'Zombies do not night-howl during the day');

  // Switch to Full Moon Night: ALL zombies howl continuously without stopping across multiple steps
  for (let i = 0; i < 12; i++) {
    ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25, { sims: [], wolves: [], isNight: true });
    assert.equal(zombies.every(z => z.howling === true), true, 'Every zombie must howl continuously throughout the entire night');
  }

  // Place zombies far outside 100m so wolves gather and howl TOGETHER at the Full Moon!
  for (const z of zombies) { z.x = 12; z.y = -32; }
  let sawPackHowling = false;
  for (let i = 0; i < 40; i++) {
    const res = ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.25, { time: i * 0.25, isNight: true });
    if (res.howlingCount >= 2 && res.poses.every(p => p.howling === true)) {
      sawPackHowling = true;
      break;
    }
  }
  assert.equal(sawPackHowling, true, 'Majestic Wolf pack must visually howl together at the Full Moon during the night');

  // Engineered Night Audio controller state transitions cleanly between Night & Dawn
  ctx.EarthNightAudio.setNightState({ isNight: true, zombieCount: zombies.length, wolfCount: 2, howlingWolves: 2 });
  const nightStatus = ctx.EarthNightAudio.getStatus();
  assert.equal(nightStatus.isNight, true);
  assert.equal(nightStatus.zombieHowling, true);
  assert.equal(nightStatus.wolfHowling, true);

  ctx.EarthNightAudio.setNightState({ isNight: false, zombieCount: zombies.length, wolfCount: 2, howlingWolves: 0 });
  const dayStatus = ctx.EarthNightAudio.getStatus();
  assert.equal(dayStatus.isNight, false);
  assert.equal(dayStatus.zombieHowling, false);
  assert.equal(dayStatus.wolfHowling, false);
});

test('Walls and all buildings are 100% solid: neither zombies nor wolves can pass through intact walls or buildings', async () => {
  const ctx = loadSimEnv();
  const FP = ctx.EarthFlightPhysics;
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Stone Town', region: 'Zanzibar', lat: -6.1622, lon: 39.1922, water: false });
  const site = sim.active();
  // Fortify perimeter walls to stage 2 (solid walls surrounding the community)
  site.communityLife ||= {};
  site.communityLife.border ||= {};
  site.communityLife.border.defence = { stage: 2 };

  const solids = FP.collectSolidObstacles(site);
  assert.ok(solids.walls.length >= 6, 'Stage 2 fortification must produce solid perimeter walls');
  assert.ok(solids.buildings.length >= 5, 'Market, Homes, Giant Wolf Cave, and Airbase must all be registered as solid buildings');

  // 1. High-speed sprint straight at the solid north-west wall MUST stop outside the wall — never tunnel through!
  const nwWall = solids.walls.find(w => w.wallId === 'north-west');
  assert.ok(nwWall, 'Expected intact north-west perimeter wall');
  const wallMinY = nwWall.box[1];
  const chargeRes = FP.moveWithSolidCollision(2.0, wallMinY - 1.5, 2.0, wallMinY + 6.0, 0.36, solids);
  assert.ok(chargeRes.hitWall, 'Charging into an intact wall must report hitWall');
  assert.ok(chargeRes.y <= wallMinY - 0.34, `Entity must NOT penetrate or cross intact wall (y=${chargeRes.y.toFixed(3)}, wallMinY=${wallMinY})`);

  // 2. Charging directly through the solid Giant Wolf Cave & Market building MUST NEVER enter their solid footprint!
  const marketOb = solids.buildings.find(b => b.id === 'market');
  assert.ok(marketOb, 'Market building must be a solid obstacle');
  const bldgRes = FP.moveWithSolidCollision(marketOb.cx, marketOb.box[1] - 1.2, marketOb.cx, marketOb.cy, 0.36, solids);
  assert.ok(bldgRes.hitBuilding, 'Moving into a building must report hitBuilding');
  const insideMarket = FP.pointInRect({ x: bldgRes.x, y: bldgRes.y }, marketOb.box, 0.30);
  assert.equal(insideMarket, false, 'Entity must remain strictly outside solid building footprint');

  // 3. Wolves roaming & intercepting NEVER clip inside any intact wall or solid building AND remain strictly grounded (z === 0)
  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  for (const z of zombies) { z.hp = 0; z.state = 'slain'; }
  const scout = zombies[0];
  scout.hp = 400; scout.maxHp = 400; scout.state = 'approaching';
  scout.x = 2.0; scout.y = wallMinY - 3.5;

  const wolfSolids = FP.collectSolidObstacles(site, null, { forKind: 'wolf', isMember: true });
  let prevPhase = null;
  let movedSteps = 0;
  for (let s = 0; s < 80; s++) {
    const res = ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.2, { time: s * 0.2, isNight: false });
    for (const p of res.poses) {
      assert.equal(p.z, 0, 'Wolves must stay strictly grounded on land (z === 0)');
      for (const ob of wolfSolids.all) {
        assert.equal(
          FP.pointInRect({ x: p.x, y: p.y }, ob.box, 0.20),
          false,
          `Wolf ${p.wolf.name} clipped into solid ${ob.id} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
        );
      }
      if (p.wolf.id === res.poses[0].wolf.id) {
        if (prevPhase != null && p.moving) {
          assert.ok(p.stridePhase > prevPhase, 'Moving wolf must advance stridePhase proportionally to ground displacement');
          movedSteps++;
        }
        prevPhase = p.stridePhase;
      }
    }
  }
  assert.ok(movedSteps >= 5, 'Expected wolf to run on the ground across multiple steps');
});

test('Zombies cannot put even a dint in community walls (0 wall damage, 0 breaches), while fiercely biting Majestic Wolves', async () => {
  const ctx = loadSimEnv();
  const FP = ctx.EarthFlightPhysics;
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  const site = sim.active();
  site.communityLife ||= {};
  site.communityLife.border ||= {};
  site.communityLife.border.defence = { stage: 2 };

  const solids = FP.collectSolidObstacles(site, null, { forKind: 'zombie' });
  const nwWall = solids.walls.find(w => w.wallId === 'north-west');
  assert.ok(nwWall && nwWall.indestructible === true);
  const wallMinY = nwWall.box[1];
  const wallMaxY = nwWall.box[3];

  // Single zombie outside the tall wall CANNOT put even a dint in the wall and CANNOT pass through!
  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  for (let i = 1; i < zombies.length; i++) { zombies[i].hp = 0; zombies[i].state = 'slain'; }
  const z = zombies[0];
  z.x = 2.0;
  z.y = wallMinY - 1.2;
  z.state = 'hunting';
  z.attackPhase = 'chase';

  const insideSim = [{ id: 'sim-inside', name: 'Nadia', x: 2.0, y: wallMaxY + 2.5, downed: false }];
  let wallDamageEvents = 0;

  for (let step = 0; step < 120; step++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.2, { sims: insideSim, wolves: [], isNight: false });
    for (const ev of evs) {
      if (ev.type === 'wallStrike' || ev.type === 'wallBreach' || ev.type === 'gateStrike' || ev.type === 'gateBreach') {
        wallDamageEvents++;
      }
    }
    assert.ok(z.y <= wallMinY - 0.28, `Zombie passed through indestructible solid wall! (y=${z.y.toFixed(2)}, wallMinY=${wallMinY})`);
    assert.equal(FP.isWallDestroyed(site, 'north-west'), false, 'Zombies must NEVER destroy community walls');
  }
  assert.equal(wallDamageEvents, 0, 'Zombies must NEVER emit wall/gate strike or breach events');
  const wallDamageRecords = Object.keys(site.trollDamage || {}).filter(k => k.startsWith('wall-'));
  assert.equal(wallDamageRecords.length, 0, 'Zombies must NOT put even a single dint in perimeter walls or gates');

  // Verify hyper-aggressive zombie bite deals substantial damage (>= 40 HP) to a Majestic Wolf on the same side!
  const wolf = site.dragonStable.dragons[0];
  const hpBefore = wolf.hp;
  z.x = 12; z.y = 12; z._wallTarget = null; z.climbState = null; z.attackPhase = 'chase'; z.attackTimer = 0;
  const mockWolf = [{ wolf, dragon: wolf, x: 12.6, y: 12.1 }];
  let biteDmg = 0;
  for (let i = 0; i < 40; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.15, { sims: [], wolves: mockWolf, isNight: false });
    const hit = evs.find(e => e.type === 'wolfStrike');
    if (hit) { biteDmg = hit.damage; break; }
  }
  assert.ok(biteDmg >= 40, `Hyper-aggressive zombie bite against wolf must deal >= 40 HP (got ${biteDmg})`);
  assert.equal(wolf.hp, hpBefore - biteDmg);
});

test('Every community starts encircled by tall 4-sided indestructible walls and 4 auto-closing gates with a permanent protective magical shield upon opening', async () => {
  const ctx = loadSimEnv();
  const FP = ctx.EarthFlightPhysics;
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Stone Town', region: 'Zanzibar', lat: -6.1622, lon: 39.1922, water: true });
  const site = sim.active();

  const segs = FP.perimeterWallSegments(0, 0, true);
  const wallSides = new Set(segs.filter(s => s.kind === 'wall').map(s => s.side));
  assert.deepEqual([...wallSides].sort(), ['east', 'north', 'south', 'west'], 'All 4 sides must have tall perimeter walls at game start');
  for (const w of segs.filter(s => s.kind === 'wall')) {
    assert.ok(w.h >= 3.0, `Tall perimeter wall ${w.id} must be >= 3.0 units high (got ${w.h})`);
  }

  const gates = FP.perimeterGates(0, true, site);
  assert.equal(gates.length, 4, 'Every community must have exactly 4 gates (one per side)');
  assert.deepEqual([...gates.map(g => g.side)].sort(), ['east', 'north', 'south', 'west']);
  for (const g of gates) {
    assert.ok(g.h >= 3.0, `Tall gate ${g.id} must be >= 3.0 units high (got ${g.h})`);
    assert.equal(g.open, 0, `Gate ${g.id} must start closed`);
    assert.equal(g.isOpen, false, `Gate ${g.id} must start closed`);
    assert.equal(g.shieldActive, false, 'Shield curtain activates upon gate opening');
  }

  // Only members of THIS community (its Sims, home player, and its Majestic Wolves) can enter/exit the 4 gates
  const wolf = site.dragonStable.dragons[0];
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'sim', id: 's1', homeSiteId: site.id }, site, 'gate-north'), true);
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'player', isHome: true, homeSiteId: site.id }, site, 'gate-north'), true);
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'wolf', id: wolf.id, homeSiteId: site.id }, site, 'gate-north'), true);
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'zombie', id: 'z1' }, site, 'gate-north'), false, 'Zombies must NEVER cross any gate entrance');
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'enemy', id: 'e1' }, site, 'gate-north'), false, 'Enemies must NEVER cross any gate entrance');
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'sim', id: 'outsider', homeSiteId: 'other-town' }, site, 'gate-north'), false, 'Non-members from other communities cannot cross gates');
  assert.equal(FP.canEntityCrossGateEntrance({ kind: 'wolf', id: 'other-wolf', homeSiteId: 'other-town' }, site, 'gate-north'), false, 'Wolves from other communities cannot cross gates');

  const northGate = gates.find(g => g.id === 'gate-north');
  // Zombies approaching the North Gate NEVER open it!
  for (let i = 0; i < 15; i++) {
    FP.updateCommunityGates(site, [{ kind: 'zombie', x: northGate.cx, y: northGate.cy - 0.8 }], 0.1);
  }
  assert.equal(site._gateRuntime['gate-north'].open, 0, 'Closed gate must stay shut when zombies stand right at it');

  // Authorized wolf from THIS community approaches -> gate swings WIDE OPEN AND permanent protective magical shield stretches across!
  for (let i = 0; i < 12; i++) {
    FP.updateCommunityGates(site, [{ kind: 'wolf', id: wolf.id, homeSiteId: site.id, x: northGate.cx, y: northGate.cy + 0.4 }], 0.1);
  }
  assert.ok(site._gateRuntime['gate-north'].open >= 0.95, 'Community gate must swing open for its own Majestic Wolf');
  assert.equal(site._gateRuntime['gate-north'].shieldActive, true, 'Protective magical shield must permanently stretch across the gate entrance upon opening');

  // EVEN WHILE THE NORTH GATE IS WIDE OPEN (open === 1), zombies & enemies are 100% blocked and repelled by the magical shield!
  assert.equal(FP.perimeterGateways(2, 0, true, site, { forKind: 'zombie' }).length, 0, 'Zombies have ZERO passable ground gateways');
  assert.equal(FP.perimeterGateways(2, 0, true, site, { forKind: 'enemy' }).length, 0, 'Enemies have ZERO passable ground gateways');
  const zombieSolidsWhileOpen = FP.collectSolidObstacles(site, null, { forKind: 'zombie' });
  assert.ok(zombieSolidsWhileOpen.walls.some(w => w.wallId === 'gate-north' && w.shielded), 'Open gate MUST remain a 100% solid magical shield barrier to zombies');

  const zombies = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  for (let i = 1; i < zombies.length; i++) { zombies[i].hp = 0; zombies[i].state = 'slain'; }
  const z = zombies[0];
  z.x = northGate.cx;
  z.y = northGate.box[1] - 0.7;
  z.state = 'hunting';
  z.attackPhase = 'chase';
  const simInside = [{ id: 'inside-1', name: 'Amina', x: northGate.cx, y: northGate.box[3] + 2.5, downed: false }];
  let shieldRepels = 0;
  let sawOpenGateShieldRepel = false;
  for (let step = 0; step < 30; step++) {
    // Keep the North Gate held WIDE OPEN by the community wolf standing in the gateway while the zombie tries to rush in!
    FP.updateCommunityGates(site, [{ kind: 'wolf', id: wolf.id, homeSiteId: site.id, x: northGate.cx, y: northGate.cy + 0.3 }], 0.1);
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.15, { sims: simInside, wolves: [], isNight: false });
    for (const ev of evs) {
      if (ev.type === 'gateShieldRepel') {
        shieldRepels++;
        if (ev.gateOpen) sawOpenGateShieldRepel = true;
      }
      assert.notEqual(ev.type, 'gateStrike', 'Zombies must NEVER damage gates');
      assert.notEqual(ev.type, 'gateBreach', 'Zombies must NEVER destroy gates');
    }
    assert.ok(z.y <= northGate.box[1] - 0.25, `Zombie entered through OPEN magically-shielded gate! (y=${z.y.toFixed(2)}, gateMinY=${northGate.box[1]})`);
  }
  assert.ok(shieldRepels >= 1, 'Protective magical shield must repel zombies attempting to enter the open gate');
  assert.equal(sawOpenGateShieldRepel, true, 'Shield repel must trigger specifically while the gate is open');

  // Once the authorized wolf moves away, the gate immediately closes shut again!
  for (let i = 0; i < 15; i++) {
    FP.updateCommunityGates(site, [{ kind: 'wolf', id: wolf.id, homeSiteId: site.id, x: northGate.cx, y: northGate.cy - 6.0 }], 0.1);
  }
  assert.equal(site._gateRuntime['gate-north'].open, 0, 'Gate must immediately close shut after member/wolf passes through');
  assert.equal(site._gateRuntime['gate-north'].isOpen, false);
});

test('Zombies can ONLY jump over walls by climbing atop no less than 3 other zombies shoulders (difficult yet achievable, collapsible by wolves)', async () => {
  const ctx = loadSimEnv();
  const FP = ctx.EarthFlightPhysics;
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Melbourne', region: 'Victoria', lat: -37.8181, lon: 144.9731, water: false });
  const site = sim.active();

  const solids = FP.collectSolidObstacles(site, null, { forKind: 'zombie' });
  const nwWall = solids.walls.find(w => w.wallId === 'north-west');
  assert.ok(nwWall && nwWall.h >= 3.0);
  const wallMinY = nwWall.box[1];
  const wallMaxY = nwWall.box[3];
  const simInside = [{ id: 'prey-1', name: 'Tessa', x: 2.0, y: wallMaxY + 4.0, downed: false }];

  // PART A: 3 zombies total (only 2 other zombies beneath — LESS than 3 other zombies!) CANNOT climb over and do ZERO wall damage!
  const horde = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  for (let i = 0; i < horde.length; i++) {
    horde[i].hp = i < 3 ? 420 : 0;
    horde[i].state = i < 3 ? 'hunting' : 'slain';
    if (i < 3) {
      horde[i].x = 1.6 + i * 0.4;
      horde[i].y = wallMinY - 0.7;
      horde[i].attackPhase = 'chase';
      horde[i]._wallTarget = null;
    }
  }
  let climbsWithThree = 0;
  for (let s = 0; s < 70; s++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.15, { sims: simInside, wolves: [], isNight: false });
    climbsWithThree += evs.filter(e => e.type === 'wallClimb').length;
  }
  assert.equal(climbsWithThree, 0, '3 zombies total (only 2 other zombies beneath) MUST NOT be able to climb over the wall');
  for (let i = 0; i < 3; i++) {
    assert.equal(horde[i].z || 0, 0, 'With < 4 total zombies, no zombie should stack upward');
    assert.ok(horde[i].y <= wallMinY - 0.25, 'With < 4 total zombies, all must remain outside intact wall');
  }
  assert.equal(Object.keys(site.trollDamage || {}).filter(k => k.startsWith('wall-')).length, 0, 'Zero wall dints while gathering');

  // PART B: 4 zombies total (3 OTHER zombies forming the base shoulder ladder + 1 climber standing atop their shoulders)
  // Difficult (takes >= 6s incl. assembly, stabilization & mid-climb wobble slip), yet reliably achievable!
  for (let i = 0; i < 4; i++) {
    horde[i].hp = 420;
    horde[i].state = 'hunting';
    horde[i].attackPhase = 'chase';
    horde[i].x = 1.4 + i * 0.35;
    horde[i].y = wallMinY - 0.65;
    horde[i].z = 0;
    horde[i].climbState = null;
    horde[i].climbedOverWall = false;
    horde[i].stackStability = 0;
    horde[i]._wallTarget = null;
  }
  let sawThreeBaseLadder = false;
  let sawMidClimbSlip = false;
  let climbEvent = null;
  let peakVaultZ = 0;
  let elapsedSec = 0;
  for (let s = 0; s < 160; s++) {
    const dt = 0.12;
    elapsedSec += dt;
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, dt, { sims: simInside, wolves: [], isNight: false });
    const liveFour = horde.slice(0, 4);
    const ladder = liveFour.filter(z => z.climbState === 'ladder');
    if (ladder.length === 3) {
      const tiers = ladder.map(z => z.stackTier).sort((a, b) => a - b);
      if (tiers.join(',') === '0,1,2' && ladder.some(z => z.z >= 1.55)) {
        sawThreeBaseLadder = true;
      }
    }
    for (const z of liveFour) {
      if (z.climbState === 'vaulting') {
        if ((z.z || 0) > peakVaultZ) peakVaultZ = z.z;
        if (z.climbSlipping) sawMidClimbSlip = true;
      }
    }
    const found = evs.find(e => e.type === 'wallClimb');
    if (found) {
      climbEvent = found;
      break;
    }
  }
  assert.equal(sawThreeBaseLadder, true, 'No less than 3 other zombies must stack vertically (tiers 0, 1, 2) as the base shoulder ladder');
  assert.equal(sawMidClimbSlip, true, 'Difficult wall climb must exhibit realistic mid-climb balance wobble/slip');
  assert.ok(elapsedSec >= 6.0, `Climbing over the tall wall must be genuinely difficult and not instant (took ${elapsedSec.toFixed(1)}s)`);
  assert.ok(peakVaultZ >= 3.2, `Climber must leap above the 3.20 tall wall parapet (peakZ=${peakVaultZ.toFixed(2)})`);
  assert.ok(climbEvent && climbEvent.baseStackSize === 3 && climbEvent.stackSize === 4, 'wallClimb event must report 3 base zombies + 1 climber (4 total)');
  assert.ok(climbEvent.zombie.y > wallMaxY, 'Climber must land INSIDE the community after jumping over the wall');
  assert.equal(climbEvent.zombie.z, 0, 'Climber must land back on ground level (z === 0) inside the community');

  // PART C: Disrupting/striking a base zombie during a climb collapses the stack immediately!
  for (let i = 0; i < 4; i++) {
    horde[i].hp = 420;
    horde[i].state = 'hunting';
    horde[i].attackPhase = 'chase';
    horde[i].x = 2.5 + i * 0.2;
    horde[i].y = wallMinY - 0.6;
    horde[i].z = 0;
    horde[i].climbState = null;
    horde[i]._wallTarget = null;
    horde[i].stackStability = 0;
  }
  let vaultingZombie = null;
  for (let s = 0; s < 80; s++) {
    ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.12, { sims: simInside, wolves: [], isNight: false });
    vaultingZombie = horde.slice(0, 4).find(z => z.climbState === 'vaulting' && z.climbProgress > 0.15 && z.climbProgress < 0.6);
    if (vaultingZombie) break;
  }
  assert.ok(vaultingZombie, '4th zombie should begin climbing atop the 3-zombie shoulder stack');
  const baseLadder = horde.slice(0, 4).filter(z => z.climbState === 'ladder');
  assert.equal(baseLadder.length, 3);
  // Majestic Wolf bites one of the 3 base ladder zombies -> entire stack collapses!
  ctx.EarthGiantTrolls.attackTroll(sim.state, site, baseLadder[0].id, { source: 'wolfBite', wolfName: 'Fenrir' });
  ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.12, { sims: simInside, wolves: [], isNight: false });
  assert.ok(vaultingZombie.climbState !== 'vaulting' && vaultingZombie.climbState !== 'ladder', 'Disrupting a base zombie must immediately collapse the climber');
  assert.equal(vaultingZombie.z, 0, 'Collapsed climber must tumble back to z === 0');
  assert.equal(vaultingZombie.stackTier, -1, 'Collapsed climber must reset stackTier to -1');
});

test('index.html loads all updated enchanted forest, wolf, zombie, and night-audio assets with valid SHA-256 hashes and zero dragon/wizard labels', () => {
  const html = fs.readFileSync(path.join(ROOT, 'common-earth/index.html'), 'utf8');
  for (const asset of [
    'dragon.css', 'flight-physics.js', 'night-audio.js', 'dragon-stable.js',
    'giant-trolls.js', 'simulation.js', 'town-light.js', 'dragon-art.js',
    'street.js', 'dragon-ui.js', 'app.js'
  ]) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'common-earth', asset))).digest('hex').slice(0, 12);
    assert.ok(html.includes(`${asset}?v=${hash}`), `Expected ${asset}?v=${hash} in common-earth/index.html`);
  }
  assert.ok(html.includes('Giant Wolf Cave'));
  assert.ok(html.includes('id="street-night-toggle"'));
  assert.ok(html.includes('id="street-audio-toggle"'));
  assert.equal(html.includes('Choose a wizard'), false, 'Wizard rider dialog must be removed');
  assert.equal(html.includes('Dragon Stable &amp; 3D Flight'), false, 'Dragon Stable button label must be removed');
});
