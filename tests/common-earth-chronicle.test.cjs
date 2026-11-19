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

test('weekly previews independently normalize optional and older save data using its original JSON field keys', () => {
  const local = vm.createContext({});
  local.window = local;
  vm.runInContext(fs.readFileSync(path.join(game, 'simulation.js'), 'utf8'), local);
  const first = local.CommonEarthSim.create({storage: null});
  assert(first.found({lat: -6.16, lon: 39.19, name: 'Stone Town'}).ok);
  const saved = JSON.parse(JSON.stringify(first.state));
  saved.sites[0].extras = JSON.parse('{"list":[{"stock":4}],"__proto__":{"legacyNote":"kept"}}');
  const sim = local.CommonEarthSim.create({storage: null, snapshot: JSON.stringify(saved)});
  first.destroy();
  local.extras = sim.active().extras;
  vm.runInContext(`
    const calls=[];
    extras.absent=undefined;
    extras.series=[,undefined,NaN,-0,Infinity];
    extras.unusual=Object.assign(Object.create({inherited:'outside the save'}),{own:'preserved'});
    Object.defineProperty(extras,'note',{enumerable:true,get(){calls.push('getter');return 'once';}});
    extras.date=new Date(0);
    extras.custom={toJSON(key){calls.push(key);return 'under '+key;}};
    extras.remove={toJSON(){return undefined;}};
    if(typeof JSON.rawJSON==='function')extras.raw=JSON.rawJSON('123');
    window.expected=JSON.stringify(JSON.parse(JSON.stringify(extras)));
    calls.length=0;
    window.EarthPurses={tick(_world,site){window.seen=site.extras;return [];}};
  `, local);
  sim.forecastNext();
  assert.equal(JSON.stringify(local.seen), local.expected);
  assert.deepEqual(Array.from(vm.runInContext('calls', local)), ['getter', 'custom']);
  assert(Object.hasOwn(local.seen, '__proto__'));
  assert.equal(local.seen.legacyNote, undefined);
  assert.equal(local.seen.__proto__.legacyNote, 'kept');
  assert.equal(Object.is(local.seen.series[3], -0), false);
  assert.equal(Object.hasOwn(local.seen, 'absent'), false);
  local.seen.list[0].stock=0;
  assert.equal(sim.active().extras.list[0].stock, 4);
  assert.equal(local.seen.unusual.inherited, undefined);
  assert.equal(sim.active().extras.unusual.inherited, 'outside the save');
  sim.destroy();
});
