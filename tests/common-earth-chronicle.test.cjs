'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const browser = vm.createContext({});
browser.window = browser;
vm.runInContext(fs.readFileSync(path.join(game, 'simulation.js'), 'utf8'), browser);
const api = browser.CommonEarthSim, key = 'common-earth.world.v1';
function fixture(raw) {
  const db = new Map(raw ? [[key, raw]] : []);
  const storage = {getItem: k => db.get(k) ?? null, setItem: (k, v) => db.set(k, v)};
  const restore = () => api.create({storage});
  return {sim: restore(), restore};
}
function founded() {
  const f = fixture();
  assert(f.sim.found({lat: -37.8, lon: 144.95, name: 'Melbourne'}).ok);
  return f;
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('the Chronicle keeps the actual closed week through actions, forecasts and a reload', () => {
  const {sim, restore} = founded();
  assert.equal(sim.lastWeek(), null);
  const forecast = sim.forecastNext().sites[0];
  assert.equal(sim.lastWeek(), null);
  assert(sim.advance().ok);
  const ledger = plain(sim.lastWeek());
  assert.deepEqual(ledger.sites[0].closing,plain(forecast.closing));
  assert.deepEqual(ledger.sites[0].delta,plain(forecast.delta));
  assert.match(ledger.sites[0].highlights.join(' '), /lean harvest/);
  assert(sim.act('work:contract').ok);
  assert.equal(sim.active().funds,ledger.sites[0].closing.funds+4);
  sim.forecastNext();
  assert.deepEqual(plain(restore().lastWeek()),ledger);
  assert.deepEqual(plain(sim.lastWeek()),ledger);
  assert(sim.advance().ok);
  assert.equal(sim.lastWeek().week,ledger.week+1);
});

test('large worlds keep every settlement’s real balances within one shared story budget', () => {
  const {sim} = founded();
  const saved = plain(sim.state), source = saved.sites[0], total = 96;
  delete saved.lastWeekReview; // earlier saved world
  saved.sites = Array.from({length: total}, (_, i) => {
    const s = plain(source);
    s.id = 'site-'+(i+1);
    s.name = 'Settlement '+(i+1);
    s.lon = -175+i*3;
    for (const p of s.residents) p.id = s.id+'-p'+p.slot;
    return s;
  });
  saved.activeId = saved.sites.at(-1).id;
  const {sim: many, restore} = fixture(JSON.stringify(saved));
  assert.equal(many.lastWeek(),null);
  assert(many.advance().ok);
  const ledger = many.lastWeek();
  assert.equal(ledger.sites.length,total);
  assert.equal(ledger.totalEvents,total);
  assert.equal(ledger.omittedEvents,total-64);
  assert.equal(ledger.sites.filter(s=>s.highlights.length).length,64);
  assert.equal(ledger.sites.find(s=>s.id===many.state.activeId).highlights.length,1);
  for(const row of ledger.sites){
    const site=many.state.sites.find(s=>s.id===row.id);
    for(const [k,n] of Object.entries(row.closing))assert.equal(site[k],n);
  }
  assert(JSON.stringify(ledger).length<60000);
  assert.deepEqual(plain(restore().lastWeek()),plain(ledger));
});
