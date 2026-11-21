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

test('Shadowfell Darklands Giant Trolls spawn ~1 km outside the community at game start, never inside town', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  const founded = await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  assert.equal(founded.ok, true);
  const site = sim.active();
  const horde = sim.state.trollHorde;
  assert.ok(horde);
  assert.equal(horde.community.name, 'Shadowfell Darklands');

  const summary = ctx.EarthGiantTrolls.summary(sim.state, site.id);
  assert.ok(summary.localCount >= 10, `Every wave must spawn at least 10 Giant Trolls (got ${summary.localCount})`);
  assert.ok(summary.elsewhereCount >= 1, 'Giant Trolls simultaneously attack other human communities');
  assert.equal(summary.attackingCount, 0, 'No Giant Troll starts inside the community at turn 1');
  assert.equal(summary.approachingCount, summary.localCount);
  assert.ok(summary.nearestKm >= 0.85 && summary.nearestKm <= 1.20, `Expected ~1.0 km starting distance, got ${summary.nearestKm}`);
  for (const t of summary.local) {
    assert.ok(t.heightMeters >= 19 && t.heightMeters <= 24);
    assert.ok(t.maxHp >= 1250, `Giant Trolls must be very difficult to kill (expected maxHp >= 1250, got ${t.maxHp})`);
    assert.ok((t.armor || 0) >= 0.55, `Expected heavy dark-hide armor >= 0.55, got ${t.armor}`);
    assert.equal(t.state, 'approaching');
    const km = ctx.EarthGiantTrolls.distanceKm(t);
    assert.ok(km >= 0.85 && km <= 1.25, `Expected troll ${t.name} ~1 km out, got ${km} km`);
    assert.ok(t.y < 0, 'Trolls approach from inland wilderness, never spawning inside town or ocean');
  }
});

test('Giant Trolls walk slowly from ~1 km out, breach the perimeter, and relentlessly smash both Sims and buildings without stopping', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  const site = sim.active();
  site.population = 20;
  site.materials = 40;
  site.funds = 50;

  const trolls = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  const lead = trolls[0];
  const initialKm = ctx.EarthGiantTrolls.distanceKm(lead);
  assert.ok(initialKm >= 0.90);

  // Simulate 5 seconds of slow marching: distance must drop slowly, not teleport into town
  for (let i = 0; i < 20; i++) {
    ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25);
  }
  const after5sKm = ctx.EarthGiantTrolls.distanceKm(lead);
  assert.ok(after5sKm < initialKm, 'Troll must walk closer over time');
  assert.ok(after5sKm > 0.75, 'Troll must walk slowly, not teleport straight into town');

  // Continue walking until perimeter breach (~65s total simulated march)
  let breached = false;
  for (let i = 0; i < 360; i++) {
    const events = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25);
    if (events.some(e => e.type === 'breach')) breached = true;
    if (breached && trolls.every(t => t.state !== 'approaching')) break;
  }
  assert.equal(breached, true, 'Trolls must reach and breach the community perimeter');

  // Now simulate live combat with human Sims near the trolls AND standing town buildings
  const mockSims = [
    { id: 'sim-1', name: 'Amina', x: lead.x + 0.8, y: lead.y + 0.4, downed: false },
    { id: 'sim-2', name: 'Juma', x: lead.x - 0.6, y: lead.y + 0.5, downed: false }
  ];
  let simStrikes = 0;
  let buildingStrikes = 0;
  const targetsHit = new Set();

  for (let i = 0; i < 320; i++) {
    const events = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25, { sims: mockSims });
    for (const ev of events) {
      if (ev.type === 'simStrike') {
        simStrikes++;
        // Remove struck mock sims after a couple hits so trolls seamlessly pivot to smashing buildings
        if (simStrikes >= 2) mockSims.length = 0;
      }
      if (ev.type === 'buildingStrike') {
        buildingStrikes++;
        if (ev.buildingName) targetsHit.add(ev.buildingName);
      }
    }
  }

  assert.ok(simStrikes >= 1, `Expected trolls to relentlessly attack Sims, got ${simStrikes} simStrikes`);
  assert.ok(buildingStrikes >= 4, `Expected trolls to relentlessly smash buildings, got ${buildingStrikes} buildingStrikes`);
  assert.ok(site.population < 20, 'Relentless Sim attacks must inflict population casualties');

  const dmg = ctx.EarthGiantTrolls.buildingDamageSummary(site);
  assert.ok(dmg.damaged + dmg.ruined >= 1, 'Town buildings must suffer structural damage or ruin');
  assert.ok(dmg.ruined >= 1, 'Continuous attacks must collapse targeted buildings into ruins');
  assert.ok(targetsHit.size >= 2 || dmg.damaged + dmg.ruined >= 2, 'After ruining a building, trolls must immediately advance to attack the next building');

  const repairRes = await sim.perform('trollAction', { siteId: site.id, action: 'repairBuildings' });
  assert.equal(repairRes.ok, true);
  const afterRepair = ctx.EarthGiantTrolls.buildingDamageSummary(site);
  assert.equal(afterRepair.ruined, 0);
  assert.equal(afterRepair.damaged, 0);
});

test('Giant Trolls continually attack human Sims across multiple communities and never stop reinforcing', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Valparaiso', region: 'Chile', lat: -33.0458, lon: -71.623, water: false });
  const site = sim.active();
  site.population = 18;
  const second = { ...JSON.parse(JSON.stringify(site)), id: 'site-other-1', name: 'Harbour Watch', population: 14 };
  sim.state.sites.push(second);

  const horde = ctx.EarthGiantTrolls.ensure(sim.state);
  const startHumansLost = horde.community.humansLost || 0;
  // 6 weekly ticks: weeks 1-2 march 1 km into town, weeks 3-6 relentlessly smash Sims & buildings
  for (let w = 0; w < 6; w++) {
    sim.state.week += 1;
    ctx.EarthGiantTrolls.tick(sim.state);
  }
  assert.ok((horde.community.humansLost || 0) > startHumansLost);
  assert.ok(site.population < 18);

  for (const t of horde.trolls) { t.hp = 0; t.state = 'slain'; }
  sim.state.week += 1;
  ctx.EarthGiantTrolls.tick(sim.state);
  const postWave = ctx.EarthGiantTrolls.summary(sim.state, site.id);
  assert.ok(postWave.localCount >= 10, `Reinforcing wave must spawn at least 10 local Giant Trolls (got ${postWave.localCount})`);
  assert.ok(postWave.elsewhereCount >= 1);
  assert.ok(postWave.nearestKm >= 0.85, 'Reinforcing wave spawns ~1 km out from the community');
});

test('Multiple escalating waves of 10+ Giant Trolls spawn automatically during live play and weekly ticks', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Rotterdam', region: 'Netherlands', lat: 51.9219, lon: 4.478, water: false });
  const site = sim.active();

  assert.equal(ctx.EarthGiantTrolls.MIN_TROLLS_PER_WAVE, 10);
  assert.ok(ctx.EarthGiantTrolls.waveSizeFor(1) >= 10);
  assert.ok(ctx.EarthGiantTrolls.waveSizeFor(2) >= 12);
  assert.ok(ctx.EarthGiantTrolls.waveSizeFor(3) >= 14);

  const w1Count = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id).length;
  assert.ok(w1Count >= 10, `Wave 1 must have >= 10 local trolls, got ${w1Count}`);

  // Step live timer past WAVE_INTERVAL_SEC (55s) so Wave 2 automatically arrives!
  let waveSpawnEvents = [];
  for (let i = 0; i < 240; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25);
    for (const ev of evs) if (ev.type === 'waveSpawn') waveSpawnEvents.push(ev);
  }
  assert.ok(waveSpawnEvents.length >= 1, 'Live play must automatically spawn Wave 2 after interval');
  assert.ok(waveSpawnEvents[0].count >= 10, `Wave 2 must spawn >= 10 trolls, got ${waveSpawnEvents[0].count}`);
  assert.ok(sim.state.trollHorde.community.wave >= 2);
  assert.ok(ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id).length >= 20, 'Wave 1 + Wave 2 must stack >= 20 active trolls');

  // Clear all current trolls and step 7 seconds — next wave must launch rapidly!
  for (const t of sim.state.trollHorde.trolls) { t.hp = 0; t.state = 'slain'; }
  const beforeClearWave = sim.state.trollHorde.community.wave;
  let clearWaveSpawned = null;
  for (let i = 0; i < 36; i++) {
    const evs = ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25);
    const found = evs.find(e => e.type === 'waveSpawn');
    if (found) { clearWaveSpawned = found; break; }
  }
  assert.ok(clearWaveSpawned, 'Clearing a wave must trigger the next wave quickly');
  assert.ok(clearWaveSpawned.count >= 10, 'Post-clear wave must also have >= 10 Giant Trolls');
  assert.ok(sim.state.trollHorde.community.wave > beforeClearWave);
});

test('Giant Trolls are hard to kill with militia, but Dragons and originating-community Wizards devastate and slay them', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Stone Town', region: 'Tanzania', lat: -6.1622, lon: 39.1922, water: false });
  const site = sim.active();
  site.funds = 200;
  site.materials = 100;
  site.food = 100;

  const targetTroll = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id)[0];
  const startHp = targetTroll.hp;
  assert.ok(startHp >= 1250, `Expected tough Giant Troll HP >= 1250, got ${startHp}`);

  const militiaRes = await sim.perform('trollAction', { siteId: site.id, action: 'militiaStrike', trollId: targetTroll.id });
  assert.equal(militiaRes.ok, true);
  const militiaDmg = startHp - targetTroll.hp;
  assert.ok(militiaDmg > 0 && militiaDmg <= 25, `Militia should only deal chip damage against armored trolls (got ${militiaDmg})`);
  assert.ok(targetTroll.hp > startHp * 0.96, 'Militia must barely dent a Giant Troll');

  // Verify live dark regeneration heals an unburned wounded troll
  const hpBeforeRegen = targetTroll.hp;
  for (let i = 0; i < 12; i++) ctx.EarthGiantTrolls.stepLive(sim.state, site, 0.25);
  assert.ok(targetTroll.hp > hpBeforeRegen, 'Unburned wounded Giant Troll must regenerate HP in live play');

  assert.equal((await sim.perform('buildFreeBuilding', { siteId: site.id, kind: 'dragonStable' })).ok, true);
  assert.equal((await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'solar-gold', name: 'Aurelia' })).ok, true);
  assert.equal((await sim.perform('dragonAction', { siteId: site.id, action: 'createWizard', name: 'Aldric' })).ok, true);

  const ds = ctx.EarthDragonStable.ensure(site);
  const dragon = ds.dragons[0];
  const wizard = ds.wizards[0];

  const hpBeforeFire = targetTroll.hp;
  const fireRes = await sim.perform('dragonAction', {
    siteId: site.id, action: 'blastFire', riderId: wizard.id, dragonId: dragon.id,
    target: { kind: 'troll', isTroll: true, trollId: targetTroll.id, name: targetTroll.name }
  });
  assert.equal(fireRes.ok, true);
  const fireDmg = hpBeforeFire - targetTroll.hp;
  assert.ok(fireDmg >= militiaDmg * 4, `Dragonfire (${fireDmg}) must hit far harder than militia (${militiaDmg})`);

  const hpBeforeThunder = targetTroll.hp;
  const thunderRes = await sim.perform('dragonAction', {
    siteId: site.id, action: 'strikeThunder', riderId: wizard.id, dragonId: dragon.id,
    target: { kind: 'troll', isTroll: true, trollId: targetTroll.id, name: targetTroll.name }
  });
  assert.equal(thunderRes.ok, true);
  assert.ok(hpBeforeThunder - targetTroll.hp >= fireDmg);

  // Tough trolls must take sustained arcane bombardment (more than 4 strikes total) to slay!
  let guard = 0;
  while (targetTroll.hp > 0 && guard < 18) {
    await sim.perform('dragonAction', {
      siteId: site.id, action: 'strikeThunder', riderId: wizard.id, dragonId: dragon.id,
      target: { kind: 'troll', isTroll: true, trollId: targetTroll.id, name: targetTroll.name }
    });
    guard++;
  }
  assert.ok(guard >= 4, `Expected tough troll to require sustained strikes (>=4 more thunder strikes, took ${guard})`);
  assert.equal(targetTroll.hp, 0);
  assert.equal(targetTroll.state, 'slain');
  assert.ok(sim.state.trollHorde.community.totalSlain >= 1);
});

test('Dragons NEVER travel outside community walls in 2D or 3D, yet autonomously incinerate Giant Trolls once they approach the walls', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  const site = sim.active();
  site.funds = 200;
  site.materials = 100;
  site.food = 100;

  assert.equal((await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'solar', name: 'Aurelia' })).ok, true);
  assert.equal((await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'solstice', name: 'Pyralis' })).ok, true);

  const ds = ctx.EarthDragonStable.ensure(site);
  assert.equal(ds.wizards.length, 0, 'Confirm ZERO Wizards exist — dragons defend purely on their own agency');
  assert.equal(ds.dragons.length, 2);

  const walls = ctx.EarthDragonStable.wallBoundsForSite(site);
  assert.ok(walls && Number.isFinite(walls.minX) && Number.isFinite(walls.maxX));

  // Phase 1: Trolls are 1 km out. Dragons must hold inner-wall guard and NEVER leave the walls!
  let sawGuardState = false;
  for (let step = 0; step < 30; step++) {
    const res = ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.25, { time: step * 0.25 });
    for (const p of res.poses) {
      assert.ok(p.x >= walls.minX - 0.01 && p.x <= walls.maxX + 0.01, `Dragon x=${p.x} escaped wall bounds [${walls.minX}, ${walls.maxX}]`);
      assert.ok(p.y >= walls.minY - 0.01 && p.y <= walls.maxY + 0.01, `Dragon y=${p.y} escaped wall bounds [${walls.minY}, ${walls.maxY}]`);
      if (p.state === 'guard') sawGuardState = true;
    }
  }
  assert.equal(sawGuardState, true, 'Dragons must hold guard inside the walls while trolls march from 1 km out');

  // Phase 2: Bring two lead trolls right up to the community perimeter breach; dragons incinerate them strictly from inside the walls!
  const localTrolls = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id);
  const leadA = localTrolls[0];
  const leadB = localTrolls[1];
  leadA.x = 6; leadA.y = -4.5; leadA.state = 'attacking';
  leadB.x = 16; leadB.y = -4.0; leadB.state = 'attacking';

  let fireEvents = 0;
  let sawBreathingPose = false;
  for (let step = 0; step < 260; step++) {
    const res = ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.25, { time: (30 + step) * 0.25 });
    for (const p of res.poses) {
      assert.ok(p.x >= walls.minX - 0.01 && p.x <= walls.maxX + 0.01, `Combat dragon x=${p.x} escaped walls [${walls.minX}, ${walls.maxX}]`);
      assert.ok(p.y >= walls.minY - 0.01 && p.y <= walls.maxY + 0.01, `Combat dragon y=${p.y} escaped walls [${walls.minY}, ${walls.maxY}]`);
      if (p.breathingFire && p.defending) sawBreathingPose = true;
    }
    for (const ev of res.events) {
      if (ev.type === 'dragonFire') fireEvents++;
    }
    if (leadA.hp <= 0 && leadB.hp <= 0) break;
  }

  assert.ok(fireEvents >= 10, `Expected sustained autonomous fire blasts against tough trolls, got ${fireEvents}`);
  assert.equal(sawBreathingPose, true, 'Defending dragons must expose breathingFire=true pose for rendering');
  assert.equal(leadA.hp, 0, 'Autonomous wall-defending dragons must kill breaching Giant Troll A');
  assert.equal(leadB.hp, 0, 'Autonomous wall-defending dragons must kill breaching Giant Troll B');
  assert.ok(ds.dragons.some(d => (d.autonomousKills || 0) >= 1), 'Dragon stats must record autonomous kills');
  assert.equal(ctx.EarthDragonStable.valid(site.dragonStable), true, 'Save validation must pass after autonomous combat');

  // Phase 3: Verify 3D Flight Physics strict community wall boundary for Dragons (and unrestricted flight for Fighter Jets!)
  const wb3D = ctx.EarthFlightPhysics.communityWallBounds3D(0, false, 3.0);
  const dragon3D = ctx.EarthFlightPhysics.createFlightState({ kind: 'dragon', airborne: true, x: wb3D.maxX + 40, y: 30, z: wb3D.minZ - 35, yaw: 0, speed: 32 });
  const wallRes = ctx.EarthFlightPhysics.enforceCommunityWallBoundary3D(dragon3D, wb3D, 1 / 60);
  assert.equal(wallRes.blocked, true, '3D Dragon attempting to fly outside community walls must be blocked');
  assert.ok(dragon3D.x >= wb3D.minX && dragon3D.x <= wb3D.maxX, '3D Dragon x must be clamped strictly inside walls');
  assert.ok(dragon3D.z >= wb3D.minZ && dragon3D.z <= wb3D.maxZ, '3D Dragon z must be clamped strictly inside walls');

  const jet3D = ctx.EarthFlightPhysics.createFlightState({ kind: 'jet', airborne: true, x: wb3D.maxX + 200, y: 60, z: wb3D.minZ - 200, yaw: 0, speed: 90 });
  const jetRes = ctx.EarthFlightPhysics.enforceCommunityWallBoundary3D(jet3D, wb3D, 1 / 60);
  assert.equal(jetRes.blocked, false, 'Fighter Jets must remain unrestricted outside community walls');
  assert.equal(jet3D.x, wb3D.maxX + 200);
});

test('Autonomous dragons aggressively torch and repel hostile rival war expeditions & border intruders without attacking peaceful foreign communities', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Lamu', region: 'Kenya', lat: -2.2717, lon: 40.902, water: false });
  const site = sim.active();
  site.funds = 200;
  site.materials = 100;
  site.food = 100;

  // Clear trolls so this test isolates rival border intruders & foreign communities
  for (const t of sim.state.trollHorde.trolls) { t.hp = 0; t.state = 'slain'; }

  assert.equal((await sim.perform('buildFreeBuilding', { siteId: site.id, kind: 'dragonStable' })).ok, true);
  assert.equal((await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'tempest', name: 'Vaelor' })).ok, true);
  const ds = ctx.EarthDragonStable.ensure(site);
  assert.equal(ds.wizards.length, 0);

  // Add a peaceful neighbouring community — dragons MUST NOT attack it!
  const peaceful = { id: 'peaceful-neighbour', name: 'Kilwa', population: 20, communityLife: { border: {} } };
  sim.state.sites.push(peaceful);
  const peacefulCheck = ctx.EarthDragonStable.autonomousDefend(sim.state, site);
  assert.equal(peacefulCheck.defended, false, 'Dragons must never attack peaceful foreign communities');

  // Now launch a hostile rival war expedition marching against our community + a hostile street fighter
  const raiderSite = {
    id: 'hostile-raider',
    name: 'Iron Ridge',
    population: 18,
    communityLife: {
      border: {
        campaign: { against: site.id, phase: 'fight', strength: 4, initial: 4, progress: 1, casualties: 0, seed: 0.9 }
      }
    }
  };
  sim.state.sites.push(raiderSite);
  site.communityLife ||= {};
  site.communityLife.border ||= {};
  site.communityLife.border.street = { phase: 'fight', hp: 100, guard: { key: 'raider-1', name: 'Iron Ridge Raider' } };

  // Autonomous weekly defense (via tick) + real-time defense must scorch & rout BOTH threats with ZERO Wizards!
  const def1 = ctx.EarthDragonStable.autonomousDefend(sim.state, site);
  assert.equal(def1.defended, true);
  assert.ok(def1.blasts >= 1);

  for (let i = 0; i < 40; i++) {
    ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.25, { time: i * 0.25 });
  }
  assert.equal(site.communityLife.border.street, undefined, 'Autonomous dragon must drive off hostile street border intruder');
  assert.equal(raiderSite.communityLife.border.campaign.phase, 'return', 'Autonomous dragon must burn back and rout invading rival war campaign');
  assert.equal(peaceful.population, 20, 'Peaceful foreign community remains completely untouched');
});

test('Every community starts with a pre-built Dragon Stable at founding so players can summon a protector dragon immediately before Giant Trolls arrive', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Stone Town', region: 'Zanzibar', lat: -6.1622, lon: 39.1922, water: false });
  const site = sim.active();

  // Dragon Stable must already exist right at community founding without calling buildFreeBuilding
  assert.equal(ctx.EarthDragonStable.hasStable(site), true, 'Newly founded community must start with a Dragon Stable');
  assert.equal(site.dragonStable.built, true, 'Starting dragonStable state must be marked built');
  const stableEntry = (site.freeBuildings || []).find(fb => fb.kind === 'dragonStable');
  assert.ok(stableEntry, 'Starting Dragon Stable must be placed in site.freeBuildings');
  assert.ok(Number.isFinite(stableEntry.x) && Number.isFinite(stableEntry.y), 'Starting Dragon Stable must have valid coordinates');

  // With default starting resources alone (no resource cheats, no Wizards), player can IMMEDIATELY summon a protector dragon on Week 1!
  const summoned = await sim.perform('dragonAction', { siteId: site.id, action: 'summon', lineageId: 'solar', name: 'Dawnwing' });
  assert.equal(summoned.ok, true, `Player must be able to summon a dragon immediately at game start: ${summoned.message}`);
  assert.equal(site.dragonStable.dragons.length, 1);
  assert.equal(site.dragonStable.dragons[0].name, 'Dawnwing');

  // The summoned dragon stays strictly inside the community walls and kills a breaching Giant Troll with zero Wizards
  const walls = ctx.EarthDragonStable.wallBoundsForSite(site);
  const leadTroll = ctx.EarthGiantTrolls.trollsForSite(sim.state, site.id)[0];
  leadTroll.x = 10; leadTroll.y = -4.2; leadTroll.state = 'attacking';
  for (let step = 0; step < 260; step++) {
    const res = ctx.EarthDragonStable.stepAutonomousDefenders(sim.state, site, 0.25, { time: step * 0.25 });
    for (const p of res.poses) {
      assert.ok(p.x >= walls.minX - 0.01 && p.x <= walls.maxX + 0.01);
      assert.ok(p.y >= walls.minY - 0.01 && p.y <= walls.maxY + 0.01);
    }
    if (leadTroll.hp <= 0) break;
  }
  assert.equal(leadTroll.hp, 0, 'Day-one dragon must destroy breaching Giant Troll from inside the community walls');
});

test('Saves containing trollHorde validate cleanly and index.html loads updated giant troll assets with valid SHA-256 hashes', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Suva', region: 'Fiji', lat: -18.133, lon: 178.4417, water: false });
  assert.equal(ctx.EarthGiantTrolls.valid(sim.state.trollHorde), true);

  const html = fs.readFileSync(path.join(ROOT, 'common-earth/index.html'), 'utf8');
  for (const asset of ['dragon.css', 'dragon-stable.js', 'giant-trolls.js', 'simulation.js', 'street.js', 'dragon-ui.js', 'flight-3d.js', 'app.js']) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'common-earth', asset))).digest('hex').slice(0, 12);
    assert.ok(html.includes(`${asset}?v=${hash}`), `Expected ${asset}?v=${hash} in common-earth/index.html`);
  }
  assert.ok(html.includes('id="troll-siege-bar"'));
  assert.ok(html.includes('id="troll-track-btn"'));
  assert.ok(html.includes('id="troll-repair-btn"'));
});

