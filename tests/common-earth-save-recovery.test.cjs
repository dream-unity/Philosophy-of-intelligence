'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({ TextEncoder });
runtime.window = runtime;
for (const file of ['simulation.js', 'saves.js']) {
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
