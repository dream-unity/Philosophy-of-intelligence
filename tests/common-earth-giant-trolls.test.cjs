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

test('Shadowfell Darklands Giant Troll community spawns immediately at game start attacking both player and other communities', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  const founded = await sim.perform('found', { name: 'Mombasa', region: 'Kenya', lat: -4.0381, lon: 39.688, water: false });
  assert.equal(founded.ok, true);
  const site = sim.active();
  const horde = sim.state.trollHorde;
  assert.ok(horde);
  assert.equal(horde.community.name, 'Shadowfell Darklands');

  const summary = ctx.EarthGiantTrolls.summary(sim.state, site.id);
  assert.ok(summary.localCount >= 2, 'At least 2 colossal Giant Trolls attack player from turn 1');
  assert.ok(summary.elsewhereCount >= 1, 'Giant Trolls simultaneously attack other human communities');
  for (const t of summary.local) {
    assert.ok(t.heightMeters >= 19 && t.heightMeters <= 24);
    assert.ok(t.maxHp >= 490);
  }
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
  for (let w = 0; w < 4; w++) {
    sim.state.week += 1;
    ctx.EarthGiantTrolls.tick(sim.state);
  }
  assert.ok((horde.community.humansLost || 0) > startHumansLost);
  assert.ok(site.population < 18);

  for (const t of horde.trolls) { t.hp = 0; t.state = 'slain'; }
  sim.state.week += 1;
  ctx.EarthGiantTrolls.tick(sim.state);
  const postWave = ctx.EarthGiantTrolls.summary(sim.state, site.id);
  assert.ok(postWave.localCount >= 1);
  assert.ok(postWave.elsewhereCount >= 1);
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

  const militiaRes = await sim.perform('trollAction', { siteId: site.id, action: 'militiaStrike', trollId: targetTroll.id });
  assert.equal(militiaRes.ok, true);
  const militiaDmg = startHp - targetTroll.hp;
  assert.ok(militiaDmg > 0 && militiaDmg <= 45);
  assert.ok(targetTroll.hp > startHp * 0.85);

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
  assert.ok(fireDmg >= militiaDmg * 3);

  const hpBeforeThunder = targetTroll.hp;
  const thunderRes = await sim.perform('dragonAction', {
    siteId: site.id, action: 'strikeThunder', riderId: wizard.id, dragonId: dragon.id,
    target: { kind: 'troll', isTroll: true, trollId: targetTroll.id, name: targetTroll.name }
  });
  assert.equal(thunderRes.ok, true);
  assert.ok(hpBeforeThunder - targetTroll.hp >= fireDmg);

  let guard = 0;
  while (targetTroll.hp > 0 && guard < 6) {
    await sim.perform('dragonAction', {
      siteId: site.id, action: 'strikeThunder', riderId: wizard.id, dragonId: dragon.id,
      target: { kind: 'troll', isTroll: true, trollId: targetTroll.id, name: targetTroll.name }
    });
    guard++;
  }
  assert.equal(targetTroll.hp, 0);
  assert.equal(targetTroll.state, 'slain');
  assert.ok(sim.state.trollHorde.community.totalSlain >= 1);
});

test('Saves containing trollHorde validate cleanly and index.html loads giant-trolls.js with valid SHA-256 hash', async () => {
  const ctx = loadSimEnv();
  const sim = ctx.CommonEarthSim.create({ storage: null });
  await sim.perform('found', { name: 'Suva', region: 'Fiji', lat: -18.133, lon: 178.4417, water: false });
  assert.equal(ctx.EarthGiantTrolls.valid(sim.state.trollHorde), true);

  const html = fs.readFileSync(path.join(ROOT, 'common-earth/index.html'), 'utf8');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'common-earth/giant-trolls.js'))).digest('hex').slice(0, 12);
  assert.ok(html.includes(`giant-trolls.js?v=${hash}`));
  assert.ok(html.includes('id="troll-siege-bar"'));
});
