'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({ TextEncoder });
runtime.window = runtime;
for (const file of ['construction.js', 'simulation.js', 'saves.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), runtime, {filename: file});
}

function toggledStore() {
  const values = new Map();
  return {
    writable: false,
    get length() { return values.size; },
    key: i => [...values.keys()][i] ?? null,
    getItem: k => values.get(k) ?? null,
    setItem(k, v) {
      if (!this.writable) throw new Error('Quota exhausted');
      values.set(k, String(v));
    },
    removeItem(k) { values.delete(k); }
  };
}
const town = {lat: -42.88, lon: 147.33, name: 'Hobart'};
const savedKey = 'common-earth.world.v1';
function open(storage) {
  let id = 0;
  return runtime.EarthSaves.open({storage, session:null, idGenerator:()=> 'test-world-'+(++id)});
}

test('a successful local write restores autosave and sends future copies to persistent storage', async () => {
  const store = toggledStore(), book = open(store);
  assert.equal(book.status().mode, 'limited');
  assert.equal((await book.sim.perform('found', town)).ok, true);
  assert.equal(store.getItem(savedKey), null);
  assert.equal(book.status().mode, 'limited');
  store.writable = true;
  assert.equal((await book.sim.perform('advance')).ok, true);
  assert.equal(JSON.parse(store.getItem(savedKey)).week, 2);
  assert.equal(book.status().mode, 'autosave');
  const copy = await book.copy('Restored copy');
  assert.equal(copy.ok, true);
  assert.equal(book.current().temporary, false);
  assert.equal(JSON.parse(store.getItem('common-earth.playthrough.v1.'+copy.id)).week, 2);
  book.dispose();
  const reopened = open(store);
  assert.equal(reopened.current().name, 'Restored copy');
  assert.equal(reopened.sim.active().name, 'Hobart Commons');
  reopened.dispose();
});

test('external reads and play in a temporary or retained world do not signal a durable write', async () => {
  const store = toggledStore(), book = open(store);
  const external = runtime.CommonEarthSim.create({storage:null});
  assert.equal(external.found(town).ok, true);
  store.writable = true;
  store.setItem(savedKey, JSON.stringify(external.state));
  assert.equal(book.sim.sync(), true);
  assert.equal(book.status().mode, 'limited');
  store.writable = false;
  assert.equal((await book.sim.perform('advance')).ok, true);
  const temp = await book.create('Temporary world');
  assert.equal(temp.ok, true);
  store.writable = true;
  assert.equal((await book.sim.perform('found', town)).ok, true);
  assert.equal(book.status().mode, 'temporary');
  assert.equal(store.getItem('common-earth.playthrough.v1.'+temp.id), null);
  assert.equal((await book.select('original')).ok, true);
  assert.equal(book.sim.state.week, 2);
  assert.equal((await book.sim.perform('advance')).ok, true);
  assert.equal(book.status().mode, 'temporary');
  assert.equal(JSON.parse(store.getItem(savedKey)).week, 1);
  external.destroy();
  book.dispose();
});

test('a background crew cannot erase a player order that is in memory during a quota failure',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);assert((await s.perform('act','build:workshop',8)).ok);
  const remote=runtime.CommonEarthSim.create({storage:store});
  store.writable=false;
  assert((await s.perform('act','build:garden',7)).ok);assert(s.hasUnsavedChoice);
  assert.equal(s.active().construction.length,2);
  store.writable=true;
  assert((await remote.perform('workConstruction',3,100000)).ok);
  s.sync();assert(s.hasUnsavedChoice);assert.equal(s.active().construction.length,2);
  assert((await s.perform('workConstruction',2,100500)).ok);
  assert.equal(s.hasUnsavedChoice,false);assert.equal(book.status().mode,'autosave');
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction.length,2);
  remote.destroy();book.dispose();
});

test('two different player choices after a quota failure remain available separately',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);
  const remote=runtime.CommonEarthSim.create({storage:store});
  store.writable=false;assert((await s.perform('act','build:garden',7)).ok);
  store.writable=true;assert((await remote.perform('act','build:workshop',8)).ok);
  assert(s.sync());assert.match(book.status().message,/copy or export/);
  assert.equal(JSON.parse(book.exportWorld().text).world.sites[0].construction[0].kind,'garden');
  assert((await s.perform('workConstruction',3)).ok);
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction[0].kind,'workshop');
  const copy=await book.copy('My garden');assert(copy.ok);assert.equal(book.status().mode,'autosave');
  assert.equal(book.sim.active().construction[0].kind,'garden');
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction[0].kind,'workshop');
  assert((await book.select('original')).ok);assert.equal(book.sim.active().construction[0].kind,'workshop');
  assert((await book.select(copy.id)).ok);assert.equal(book.sim.active().construction[0].kind,'garden');
  remote.destroy();book.dispose();
});

test('the saved-world picker keeps focus during normal labour but still reports a quota change or recovery',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);assert((await s.perform('act','build:garden',7)).ok);
  let refresh=0;const off=book.watch(()=>refresh++);
  assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,0);
  store.writable=false;assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,1);
  assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,1);
  store.writable=true;assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,2);
  off();book.dispose();
});

test('a queued player order cannot change a previous saved world after the player switches slots',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;assert((await s.perform('found',town)).ok);
  const alternate=await book.create('Other community');assert(alternate.ok);assert((await book.select('original')).ok);
  let resume;
  runtime.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{resume=()=>resolve(run());})}};
  try{
    const pending=s.perform('act','build:workshop',8);
    assert.equal(typeof resume,'function');assert((await book.select(alternate.id)).ok);
    resume();assert.equal((await pending).ok,false);
    assert((await book.select('original')).ok);assert.equal(s.active().construction.length,0);
    assert.equal(s.active().funds,16);
  }finally{delete runtime.navigator;book.dispose();}
});
