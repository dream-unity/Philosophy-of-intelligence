'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({});
runtime.window = runtime;
for (const file of ['shifts.js', 'simulation.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), runtime, { filename: file });
}

function simulation(saved) {
  const data = new Map(saved ? [['shift-world', JSON.stringify(saved)]] : []);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const sim = runtime.CommonEarthSim.create({ key: 'shift-world', storage });
  if (!saved) ok(sim.found({ lat: -42.88, lon: 147.33, name: 'Hobart' }));
  return sim;
}
function ok(result) {
  assert.equal(result.ok, true, result.message);
}
function snapshot(sim) {
  return JSON.parse(JSON.stringify(sim.state));
}

test('leaving an unworked day restores exactly the reserved effort once, including earlier saves', () => {
  const sim = simulation();
  const id = sim.active().residents[0].id;
  ok(sim.beginShift(id));
  ok(sim.arriveShift('earn'));
  ok(sim.act('work:contract'));
  const saved = snapshot(sim);
  saved.effort=2;delete saved.sites[0].shift.effortPaid;
  // Releases before cancellable shifts recorded the hosting date when the day opened.
  saved.sites[0].lastShiftWeek = saved.week;
  saved.sites[0].residents[0].lastShiftWeek = saved.week;
  const restored = simulation(saved);
  const funds = restored.active().funds;
  const effort = restored.state.effort;
  ok(restored.finishShift());
  assert.equal(restored.state.effort, effort + 1);
  assert.equal(restored.active().funds, funds);
  assert.equal(restored.finishShift().ok, false);
  assert.equal(restored.state.effort, effort + 1);
  assert.equal(runtime.EarthShifts.gate(restored.state, restored.active(), id).available, true);
  ok(restored.beginShift(id));
  ok(restored.act('work:contract'));
  ok(restored.finishShift());
  assert.equal(restored.state.effort, Math.min(4,effort+2));
  assert.equal(restored.active().funds, funds + 4);
});

test('activities for each resident can be completed in one day, recalled and settled after reload', () => {
  const scripts = [
    [['earn', 'share'], ['care', 'baskets']],
    [['earn', 'diagnose'], ['meaning', 'card']],
    [['earn', 'phrases'], ['care', 'ride']]
  ];
  for (let slot = 0; slot < scripts.length; slot++) {
    const sim = simulation(), site = sim.active(), resident = site.residents[slot];
    const effort = sim.state.effort;
    ok(sim.beginShift(resident.id));
    for (const [stop, choice] of scripts[slot]) {
      ok(sim.arriveShift(stop));
      ok(sim.chooseShift(choice));
      assert.equal(sim.chooseShift(choice).ok, false);
    }
    const mid = snapshot(sim);
    const finished = simulation(mid);
    ok(finished.finishShift());
    assert.equal(finished.state.effort, effort);
    assert.equal(finished.active().residents[slot].bond, 1);
    assert.equal(finished.active().residents[slot].shiftMemory.week, sim.state.week);
    assert.equal(finished.beginShift(resident.id).ok, false);
    const auto = simulation(mid);
    ok(auto.advance());
    ok(finished.advance());
    assert.equal(auto.active().residents[slot].bond, finished.active().residents[slot].bond);
    assert.equal(auto.active().wellbeing, finished.active().wellbeing);
    assert.ok(!auto.active().shift);
    assert.equal(auto.active().shiftFollowUps.length, 0);
    const memory = finished.active().residents[slot].shiftMemory.quote;
    assert.ok(finished.act('listen:' + resident.id).message.includes(memory));
    assert.equal(finished.beginShift(resident.id).ok, false);
    const other = finished.active().residents[(slot + 1) % scripts.length];
    ok(finished.beginShift(other.id));
  }
});

test('a household visit requires the actual doorstep even when the resident is already beside the player',()=>{
  const sim=simulation(),site=sim.active(),p=site.residents[1],model=runtime.EarthShifts;
  ok(sim.beginShift(p.id));
  const day=model.view(site,sim.state.week),stop=day.stops.find(s=>s.venue.residentId===p.id);
  assert.ok(stop);assert.equal(stop.venue.doorstep,true);
  const mobile={type:'resident',residentId:p.id};
  assert.equal(model.matches(stop.venue,mobile),false);
  assert.equal(model.matches(stop.venue,{...mobile,doorstep:true}),true);
  assert.equal(model.matches({type:'resident',residentId:p.id},mobile),true);
  assert.equal(day.stops.find(s=>s.venue.type==='market').venue.doorstep,undefined);
  ok(sim.arriveShift(stop.id));
  assert.equal(site.shift.at.doorstep,undefined);assert.equal(site.shift.venues[stop.id].doorstep,undefined);
  const restored=simulation(snapshot(sim));
  assert.equal(model.view(restored.active(),restored.state.week).currentStopId,stop.id);
  ok(restored.chooseShift('card'));ok(restored.finishShift());
});
