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
