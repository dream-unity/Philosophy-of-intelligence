'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const gameRoot = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({});
runtime.window = runtime;
function load(name) {
  vm.runInContext(fs.readFileSync(path.join(gameRoot, name), 'utf8'), runtime, { filename: name });
}
for (const name of ['navigation.js', 'voyages.js', 'neighbours.js', 'construction.js', 'simulation.js']) load(name);

const south = { lat: -42.88, lon: 147.33, name: 'Tasmania', water: false };
const north = { lat: 50.05, lon: -140, name: 'North Pacific Ocean', water: true };
const create = storage => runtime.CommonEarthSim.create({ storage });
function memory(initial) {
  const items = new Map(initial);
  return {
    writes: 0,
    getItem(key) { return items.get(key) ?? null; },
    setItem(key, value) { items.set(key, value); this.writes++; }
  };
}
function success(result) {
  assert.equal(result.ok, true, result.message);
}
function settle(sim, point = south) {
  success(sim.found(point));
  return sim.active();
}
function action(sim, id, plot) { success(sim.act(id, plot)); }
function next(sim) { success(sim.advance()); }
function snapshot(sim) { return JSON.stringify(sim.state); }
function supplies(sim, name) {
  return sim.state.sites.reduce((n, site) => n + site[name], 0)
    + sim.state.routes.reduce((n, route) => n + route.shipments.reduce(
      (cargo, shipment) => cargo + (shipment.good === name ? shipment.amount : 0), 0), 0);
}

test('settlements share weekly effort and restore their exact active district, promises and construction', () => {
  const store = memory(), sim = create(store);
  const first = settle(sim), grower = first.residents[0];
  action(sim, 'listen:' + grower.id);
  action(sim, 'promise:' + grower.id);
  action(sim, 'build:workshop', 4);
  const second = settle(sim, north);
  assert.equal(second.water, true);
  assert.equal(sim.state.effort, 1);
  success(sim.visit(first.id));
  assert.equal(sim.state.effort, 1);
  action(sim, 'work:forage');
  success(sim.visit(second.id));
  assert.equal(sim.act('work:contract').ok, false);
  const copy = create(store);
  assert.equal(snapshot(copy), snapshot(sim));
  assert.equal(copy.active().id, second.id);
  next(copy);
  assert.equal(copy.state.effort, 4);
  success(copy.visit(first.id));
  assert.equal(copy.active().construction[0].plot, 4);
  assert.equal(copy.active().buildings.length, 0);
  success(copy.workConstruction(120));
  assert.equal(copy.active().buildings[0].plot, 4);
  assert.ok(copy.active().residents[0].promise);
  const storageFailure = create({ getItem() { return null; }, setItem() { throw Error('storage disabled'); } });
  settle(storageFailure);
  assert.equal(storageFailure.saveIssue, true);
  assert.equal(storageFailure.active().population, 12);
});

test('water settlements, poles and antimeridian duplicates obey the same coordinate contract', () => {
  const sim = create(memory());
  for (const [lat, lon] of [[91, 0], [-91, 0], [0, -181], [0, 181], [NaN, 10], [0, Infinity]]) {
    assert.equal(sim.found({lat, lon}).ok, false);
  }
  settle(sim, {lat: 0, lon: 179.99, name: 'Pacific Ocean', water: true});
  const baseline = snapshot(sim);
  assert.equal(sim.found({lat: 0, lon: -179.99, water: true}).ok, false);
  assert.equal(snapshot(sim), baseline);
  assert.equal(sim.active().specialty, 'food');
  settle(sim, {lat: 90, lon: 180, water: true});
  assert.equal(sim.found({lat: 90, lon: -70, water: true}).ok, false);
});

test('garden yields use shared sides on the three-by-three map, and failed placement never charges', () => {
  for (const [plot, expectedGain] of [[1, 4], [5, 4], [3, 3], [4, 3], [8, 3]]) {
    const sim = create(memory());
    const site = settle(sim);
    action(sim, 'build:workshop', 2);
    success(sim.workConstruction(120));
    const before = snapshot(sim);
    const preview = sim.previewBuild('garden', plot);
    assert.equal(preview.ok, true);
    assert.equal(preview.delta.food, expectedGain);
    assert.equal(snapshot(sim), before);
    for (const invalid of [2, -1, 9, 1.5]) {
      assert.equal(sim.act('build:garden', invalid).ok, false);
      assert.equal(snapshot(sim), before);
    }
    const without = sim.forecastNext().sites[0].production.food;
    action(sim, 'build:garden', plot);
    // The grower leaves their ordinary food production while constructing the garden.
    assert.equal(sim.forecastNext().sites[0].production.food, without - 1);
    success(sim.workConstruction(120));
    const openingFood = site.food;
    next(sim);
    assert.equal(site.food - openingFood, without + expectedGain);
  }
});

test('week forecasts never write, notify, advance resident memories or consume a pending decision', () => {
  const store = memory(), sim = create(store);
  const site = settle(sim), grower = site.residents[0];
  action(sim, 'listen:' + grower.id);
  action(sim, 'promise:' + grower.id);
  next(sim);
  action(sim, 'vote:kitchen');
  next(sim);
  const before = snapshot(sim), writes = store.writes;
  let notifications = 0;
  const stop = sim.subscribe(() => notifications++);
  const first = sim.forecastNext();
  assert.equal(JSON.stringify(first), JSON.stringify(sim.forecastNext()));
  assert.equal(snapshot(sim), before);
  assert.equal(store.writes, writes);
  assert.equal(notifications, 0);
  assert.equal(first.sites[0].promises.length, 1);
  assert.equal(first.sites[0].council.length, 1);
  next(sim);
  assert.equal(site.stats.missed, 1);
  assert.equal(site.stats.resolved, 1);
  assert.equal(notifications, 1);
  assert.equal(first.week, sim.state.week);
  for (const [name, amount] of Object.entries(first.sites[0].closing)) assert.equal(site[name], amount, name);
  stop();
});

test('a promised building meets the named need once and remains deliverable throughout its final week', () => {
  const sim = create(memory());
  const site = settle(sim), grower = site.residents[0];
  action(sim, 'listen:' + grower.id);
  action(sim, 'promise:' + grower.id);
  const deadline = grower.promise.dueWeek;
  while (sim.state.week < deadline) next(sim);
  assert.equal(sim.previewBuild('garden', 0).fulfilled[0], grower.name);
  action(sim, 'build:garden', 0);
  assert.equal(site.stats.kept, 0);
  success(sim.workConstruction(120));
  assert.equal(site.stats.kept, 1);
  assert.equal(site.trust, 53);
  assert.equal(grower.bond, 3);
  assert.equal(sim.act('fulfil:' + grower.id).ok, false);
  next(sim);
  assert.equal(site.stats.missed, 0);
});

test('residents remember who had a say, even across a save and a switch of active district', () => {
  function run(agreement) {
    const store = memory(), sim = create(store), site = settle(sim);
    assert.equal(sim.act('together:tools').ok, false);
    for (const person of site.residents.slice(0, 2)) action(sim, 'listen:' + person.id);
    action(sim, 'together:tools');
    action(sim, 'agreement:' + agreement);
    const restored = create(store);
    next(restored);
    if (agreement === 'rota') {
      assert.equal(restored.active().neighbourWork.completed, 0);
      const other = settle(restored, north);
      assert.notEqual(other.id, site.id);
      next(restored);
      success(restored.visit(site.id));
    }
    return restored.active();
  }
  const lead = run('lead'), rota = run('rota');
  assert.equal(lead.neighbourWork.completed, 1);
  assert.equal(rota.neighbourWork.completed, 1);
  const status = site => runtime.EarthNeighbours.summary(site).links.find(p => p.id === 'tools');
  assert.ok(status(lead).strength < 0);
  assert.ok(status(rota).strength > 0);
  assert.ok(lead.residents[1].bond < rota.residents[1].bond);
  assert.ok(lead.trust < rota.trust);
});

test('council votes carry distinct immediate costs, future outcomes and relationships', () => {
  function resolve(choice) {
    const sim = create(memory()), site = settle(sim);
    next(sim);
    action(sim, 'vote:' + choice);
    const atVote = {funds: site.funds, food: site.food};
    assert.equal(site.stats.resolved, 0);
    next(sim);
    assert.equal(site.stats.resolved, 0);
    next(sim);
    assert.equal(site.stats.resolved, 1);
    return {site, atVote};
  }
  const kitchen = resolve('kitchen'), voucher = resolve('voucher');
  assert.equal(kitchen.atVote.food, voucher.atVote.food - 3);
  assert.equal(kitchen.atVote.funds, voucher.atVote.funds + 4);
  assert.ok(kitchen.site.wellbeing > voucher.site.wellbeing);
  assert.ok(kitchen.site.food < voucher.site.food);
  assert.equal(kitchen.site.residents[0].bond, 1);
  assert.equal(voucher.site.residents[1].bond, 1);
});

test('distant sea consignments leave real stock, arrive once, and conserve network inventory in transit', () => {
  const sim = create(memory());
  const exporter = settle(sim);
  action(sim, 'work:forage');
  action(sim, 'work:forage');
  const importer = settle(sim, north);
  action(sim, 'route:' + exporter.id);
  const route = sim.state.routes[0];
  assert.equal(route.name, 'Sea passage');
  success(sim.visit(exporter.id));
  assert.equal(sim.act('route:' + importer.id).ok, false);
  for (let turn = 0; turn < 5; turn++) {
    const forecast = sim.forecastNext();
    const opening = {food:supplies(sim,'food'), materials:supplies(sim,'materials')};
    const arrivalsDue = route.shipments.filter(shipment => shipment.due <= forecast.week).length;
    const delivered = route.deliveries;
    next(sim);
    for (const good of Object.keys(opening)) {
      const produced = forecast.sites.reduce((sum, report) => sum + report.production[good], 0);
      assert.equal(supplies(sim, good), opening[good] + produced, good);
    }
    assert.equal(route.deliveries, delivered + arrivalsDue);
    assert.equal(forecast.sites.reduce((n, report) => n + report.arrivals.length, 0), arrivalsDue);
    if (turn === 0) {
      assert.equal(route.shipments.length, 1);
      const cargo = route.shipments[0];
      assert.equal(cargo.to, importer.id);
      assert.ok(cargo.due > sim.state.week + 1);
      assert.ok(exporter[cargo.good] >= 5);
    }
  }
  assert.ok(route.deliveries > 0);
});

test('market errands cannot be delivered to a different resident or duplicated by revisiting', () => {
  const sim = create(memory()), first = settle(sim);
  const before = first.funds;
  action(sim, 'courier:pick');
  const [recipient, other] = first.residents;
  assert.equal(sim.act('courier:deliver:' + other.id).ok, false);
  assert.equal(first.delivery.residentId, recipient.id);
  action(sim, 'courier:deliver:' + recipient.id);
  assert.equal(first.stats.deliveries, 1);
  assert.equal(first.funds, before + 3);
  assert.equal(recipient.bond, 1);
  assert.equal(sim.act('courier:deliver:' + recipient.id).ok, false);
  assert.equal(sim.act('courier:pick').ok, false);
  settle(sim, north);
  success(sim.visit(first.id));
  assert.equal(sim.act('courier:pick').ok, false);
  next(sim);
  action(sim, 'courier:pick');
  assert.equal(first.delivery.residentId, other.id);
});

// Plan through the public action catalogue. Spending a shift for missing stock
// and passing a week are the same options a player has when research is gated.
function invest(sim, id, plot) {
  const shifts = {food:'work:forage', funds:'work:contract', materials:'work:salvage'};
  for (let step = 0; step < 24; step++) {
    const item = sim.actions().find(option => option.id === id);
    assert.ok(item, 'unlisted action: ' + id);
    if (item.available) return action(sim, id, plot);
    if (sim.state.effort < item.cost || sim.state.effort === 0) {
      next(sim);
      continue;
    }
    const shortage = Object.entries(item.goods).find(([key, n]) => sim.active()[key] < n);
    assert.ok(shortage, id + ' was blocked: ' + item.reason);
    action(sim, shifts[shortage[0]]);
  }
  assert.fail('Could not fund ' + id);
}
function resolveNextVote(sim) {
  const site = sim.active(), goal = site.stats.resolved + 1;
  for (let weeks = 0; weeks < 7; weeks++) {
    if (site.stats.resolved === goal) return;
    const vote = sim.actions('council').find(item => item.id.startsWith('vote:') && item.available);
    if (vote) action(sim, vote.id);
    next(sim);
  }
  assert.fail('Council did not resolve its vote in ' + site.name);
}

for (const charter of ['care', 'voice', 'craft']) {
  test('the ' + charter + ' charter can be ratified through normal play only after its distinct obligations are met', () => {
    const sim = create(memory());
    const home = settle(sim);
    action(sim, 'charter:' + charter);
    assert.equal(sim.act('charter:' + (charter === 'care' ? 'voice' : 'care')).ok, false);
    for (const resident of home.residents) invest(sim, 'listen:' + resident.id);
    const [grower] = home.residents;
    invest(sim, 'promise:' + grower.id);
    invest(sim, 'fulfil:' + grower.id);
    invest(sim, 'build:workshop', 4);
    success(sim.workConstruction(120));
    invest(sim, 'research:apprenticeship');
    resolveNextVote(sim);

    // Prepare founding supplies, then establish the partner and its link.
    while (home.funds < 6) invest(sim, 'work:contract');
    while (home.materials < 2) invest(sim, 'work:salvage');
    if (!sim.state.effort) next(sim);
    const partner = settle(sim, north);
    invest(sim, 'route:' + home.id);
    success(sim.visit(home.id));
    invest(sim, 'research:exchange');
    invest(sim, 'research:stewardship');
    assert.equal(sim.state.completed, false, 'research alone cannot win');
    assert.equal(sim.overview().charter.met, false);

    success(sim.visit(partner.id));
    if (charter === 'care') {
      const contact = partner.residents[0];
      invest(sim, 'listen:' + contact.id);
      invest(sim, 'promise:' + contact.id);
      invest(sim, 'fulfil:' + contact.id);
      for (const site of sim.state.sites) {
        success(sim.visit(site.id));
        while (site.food < 6) invest(sim, 'work:forage');
      }
    } else if (charter === 'voice') {
      for (const person of partner.residents) invest(sim, 'listen:' + person.id);
      resolveNextVote(sim);
    } else {
      invest(sim, 'listen:' + partner.residents[0].id);
      invest(sim, 'build:hall', 0);
      success(sim.workConstruction(120));
      invest(sim, 'research:apprenticeship');
      assert.equal(sim.state.completed, false, 'craft also needs an errand');
      invest(sim, 'courier:pick');
      invest(sim, 'courier:deliver:' + partner.delivery.residentId);
    }
    assert.equal(sim.overview().charter.met, true);
    assert.equal(sim.state.completed, true);
    next(sim);
    const ratifications = sim.state.journal.filter(entry => entry.text.includes('Charter fulfilled:'));
    assert.equal(ratifications.length, 1);
  });
}

test('atlas search distinguishes cities with the same name, local-language names, and open water', () => {
  const atlas = runtime.EarthNavigation;
  const us = atlas.search('Melbourne, US', 1)[0];
  const au = atlas.search('Melbourne, Australia', 1)[0];
  assert.equal(us.name, au.name);
  assert.equal(us.region, 'United States');
  assert.equal(au.region, 'Australia');
  assert.ok(us.lat > 0 && au.lat < 0);
  assert.equal(atlas.search('Sao Paulo', 1)[0].name, 'São Paulo');
  assert.equal(atlas.search('東京', 1)[0].name, 'Tokyo');
  assert.equal(atlas.search('Aotearoa', 1)[0].name, 'New Zealand');
  assert.equal(atlas.search('La Manche', 1)[0].water, true);
  assert.equal(atlas.search('Pacific Ocean', 1)[0].water, true);
  assert.equal(atlas.search('Melbourne', 0).length, 0);
  const featured = atlas.featured();
  assert.ok(featured.length >= 2);
  assert.ok(featured.every(point => atlas.scenario(point)?.question));
  assert.equal(atlas.scenario(north), null);
  us.region = 'changed';
  assert.equal(atlas.search('Melbourne, US', 1)[0].region, 'United States');
});

test('expeditions reject invalid targets, follow the short dateline crossing and remain finite at the antipode', () => {
  const nav = runtime.EarthVoyages;
  const origin = {name:'West', lat:0, lon:179, water:true};
  const target = {name:'East', lat:0, lon:-179, water:true};
  assert.equal(nav.preview(origin, origin, 'survey').ok, false);
  assert.equal(nav.preview(origin, {...target, lat:91}, 'survey').ok, false);
  assert.equal(nav.preview(origin, target, 'unknown').ok, false);
  const crossing = nav.preview(origin, target, 'survey');
  assert.equal(crossing.ok, true);
  assert.ok(crossing.distance > 200 && crossing.distance < 230);
  const midpoint = nav.position(origin, target, 0.5);
  assert.ok(Math.abs(Math.abs(midpoint.lon) - 180) < 0.001);
  const antipodes = [{lat:0,lon:0}, {lat:0,lon:180}];
  const opposite = nav.preview(...antipodes, 'survey');
  assert.ok(opposite.distance > 20000 && opposite.distance < 20020);
  for (const fraction of [0, .25, .5, .75, 1]) {
    const point = nav.position(...antipodes, fraction);
    assert.ok(Number.isFinite(point.lat) && Number.isFinite(point.lon));
  }
});

test('a commissioned voyage resumes at its saved leg and awards the home and receiving communities exactly once', () => {
  const nav = runtime.EarthVoyages;
  const store = memory(), sim = create(store), origin = settle(sim), dest = settle(sim, north);
  success(sim.visit(origin.id));
  const before = snapshot(sim);
  assert.equal(sim.beginVoyage(origin, 'mutual-aid').ok, false);
  assert.equal(snapshot(sim), before);
  const terms = nav.preview(origin, dest, 'mutual-aid'), openingFunds = origin.funds, openingFood = origin.food;
  success(sim.beginVoyage(dest, 'mutual-aid'));
  assert.equal(origin.funds, openingFunds - terms.cost.funds);
  assert.equal(origin.food, openingFood - terms.cost.food);
  const afterLaunch = snapshot(sim);
  assert.equal(sim.beginVoyage(dest, 'mutual-aid').ok, false);
  assert.equal(sim.sail('unknown').ok, false);
  assert.equal(snapshot(sim), afterLaunch);
  const generous = voyage => nav.choices(voyage).filter(c => c.available)
    .sort((a,b) => (b.effects.goodwill || 0) - (a.effects.goodwill || 0))[0].id;
  const firstChoice = generous(sim.state.voyage);
  success(sim.sail(firstChoice));
  assert.equal(sim.sail(firstChoice).ok, false);
  success(sim.visit(dest.id));
  const resumed = create(store);
  assert.equal(snapshot(resumed), snapshot(sim));
  const receivedBefore = resumed.active().food;
  const homeTrust = resumed.state.sites.find(s => s.id === origin.id).trust;
  let lastChoice = firstChoice;
  for (let leg = 1; leg < terms.legs; leg++) {
    assert.equal(nav.scene(resumed.state.voyage).number, leg + 1);
    lastChoice = generous(resumed.state.voyage);
    success(resumed.sail(lastChoice));
  }
  const report = resumed.state.lastVoyage;
  assert.ok(report.goodwill > 0);
  assert.equal(resumed.state.voyage, null);
  assert.equal(report.log.length, terms.legs);
  assert.equal(report.position.lat, dest.lat);
  assert.equal(report.position.lon, dest.lon);
  assert.equal(resumed.active().food, receivedBefore + report.targetReward.food);
  assert.ok(resumed.active().food > receivedBefore);
  assert.equal(resumed.state.sites.find(s => s.id === origin.id).trust, homeTrust + report.reward.trust);
  const arrival = snapshot(resumed);
  assert.equal(resumed.sail(lastChoice).ok, false);
  assert.equal(snapshot(resumed), arrival);
});

test('two open tabs cannot spend the same shift or replace a completed choice with a stale command', async () => {
  const store = memory(), primary = create(store);
  const site = settle(primary);
  const other = create(store);
  success(await primary.perform('act', 'work:forage'));
  const afterFirst = snapshot(primary);
  assert.equal((await other.perform('act', 'work:contract')).ok, false);
  assert.equal(snapshot(other), afterFirst);
  assert.equal(snapshot(create(store)), afterFirst);
  success(await other.perform('act', 'work:contract'));
  assert.equal(primary.sync(), true);
  assert.equal(primary.active().id, site.id);
  assert.equal(primary.state.effort, 2);
  assert.equal(snapshot(primary), snapshot(other));
});
