'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({});
runtime.window = runtime;
for(const file of ['construction.js','simulation.js'])vm.runInContext(fs.readFileSync(path.join(game,file),'utf8'),runtime);

function campaign() {
  const files = new Map();
  const storage = {getItem: key => files.get(key) || null, setItem: (key, text) => files.set(key, text)};
  const restore = () => runtime.CommonEarthSim.create({storage});
  const sim = restore();
  success(sim.found({lat: -37.8, lon: 144.95, name: 'Melbourne', water: false}));
  return {sim, restore};
}
function success(result) {
  assert.equal(result.ok, true, result.message);
  return result;
}
function personAt(sim, slot) { return sim.active().residents[slot]; }
function ask(sim, action, slot) { return sim.act(action + ':' + personAt(sim, slot).id); }

function negotiate(sim, slot) {
  success(ask(sim, 'listen', slot));
  success(ask(sim, 'promise', slot));
  const oldDate = personAt(sim, slot).promise.dueWeek;
  const firstOffer = sim.actions('people').find(a => a.id === 'revise:' + personAt(sim, slot).id);
  assert.equal(firstOffer.available, false);
  assert.match(firstOffer.reason, /bond of 2/);
  success(sim.advance());
  success(ask(sim, 'listen', slot));
  success(ask(sim, 'revise', slot));
  assert.equal(personAt(sim, slot).promise.dueWeek, oldDate + 1);
  return oldDate + 1;
}

test('a negotiated advance is credited once to the real balance for all three needs', () => {
  for (const [slot, resource, original] of [[0,'food',3],[1,'materials',2],[2,'funds',3]]) {
    const {sim, restore} = campaign();
    negotiate(sim, slot);
    const p = personAt(sim, slot), current = sim.active()[resource];
    assert.equal(p.promise.advance[resource], 1);
    assert.equal(ask(sim, 'revise', slot).ok, false);
    assert.equal(sim.active()[resource], current);
    const resumed = restore(), remaining = resumed.actions('people').find(a => a.id === 'fulfil:' + p.id);
    assert.equal(remaining.goods[resource], original - 1);
    success(ask(resumed, 'fulfil', slot));
    assert.equal(resumed.active()[resource], current - (original - 1));
    assert.equal(personAt(resumed, slot).promise, null);
    assert.equal(resumed.active().stats.kept, 1);
    assert.equal(ask(resumed, 'fulfil', slot).ok, false);
  }
});

test('the final week remains playable, and building the requested project closes the revised promise', () => {
  const {sim} = campaign();
  const revisedDate = negotiate(sim, 1);
  while (sim.state.week < revisedDate) success(sim.advance());
  const plan = sim.previewBuild('workshop', 0), site = sim.active();
  assert.equal(plan.fulfilled[0], site.residents[1].name);
  const funds = site.funds, materials = site.materials;
  success(sim.act('build:workshop', 0));
  assert.equal(site.stats.kept,0);
  success(sim.workConstruction(120));
  assert.equal(site.funds, funds - plan.goods.funds);
  assert.equal(site.materials, materials - plan.goods.materials);
  success(sim.advance());
  assert.equal(site.stats.kept, 1);
  assert.equal(site.stats.missed, 0);
});

test('an unkept revised date yields one bounded penalty and a resident-specific follow-up', () => {
  const {sim, restore} = campaign();
  const revisedDate = negotiate(sim, 0);
  // Decide the first independent council question so its lapse cannot mask the
  // trust change attributable to the promise.
  success(sim.act('vote:voucher'));
  while (sim.state.week < revisedDate) success(sim.advance());
  const resumed = restore(), site = resumed.active(), p = personAt(resumed, 0);
  const trust = site.trust, bond = p.bond;
  const forecast = resumed.forecastNext().sites[0];
  assert.match(forecast.promises.join(' '), /revised promise.*2 food undelivered/);
  success(resumed.advance());
  assert.equal(site.trust, Math.max(0, trust - 4));
  assert.equal(p.bond, Math.max(0, bond - 2));
  assert.equal(site.trust, forecast.closing.trust);
  assert.equal(site.stats.missed, 1);
  assert.equal(p.promise, null);
  assert.match(success(ask(resumed, 'listen', 0)).message, /made a new plan together/);
  success(resumed.advance());
  assert.equal(site.stats.missed, 1);
  assert.doesNotMatch(success(ask(resumed, 'listen', 0)).message, /made a new plan together/);
});
