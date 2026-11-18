'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const directory = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const world = vm.createContext({});
world.window = world;
for (const name of ['neighbours','voyages','shifts','campaigns','strategy','partners','city','legacy','simulation','planner']) {
  vm.runInContext(fs.readFileSync(path.join(directory, name + '.js'), 'utf8'), world, {filename: name + '.js'});
}
const measures = ['food','funds','materials','trust','wellbeing','population'];
function found() {
  const sim = world.CommonEarthSim.create({storage:null});
  const result = sim.found({name:'Stone Town',region:'Zanzibar, Tanzania',lat:-6.1622,lon:39.1922,water:false});
  assert.equal(result.ok,true,result.message);
  return sim;
}
function advance(sim,n) {
  for (let i=0;i<n;i++) assert.equal(sim.advance().ok,true);
}
function verifyProjected(sim,forecast) {
  assert.equal(forecast.ok,true,forecast.message);
  assert.equal(forecast.week,sim.state.week);
  for (const key of measures) assert.equal(forecast.site[key],sim.active()[key],key);
  for (const projected of forecast.people) {
    const actual=sim.active().residents.find(p=>p.id===projected.id);
    assert.equal(projected.bond,actual.bond);
    assert.equal(projected.promise,actual.promise?.dueWeek||null);
  }
}
test('rehearsing two branches shows actual outcomes without changing the live week or bonds', () => {
  for (const horizon of [1,2,3,4]) {
    const home=found(), observer=found(), start=JSON.stringify(home.state);
    const firstPerson=home.active().residents[0].id;
    const choices=[{id:'listen:'+firstPerson},{id:'promise:'+firstPerson}];
    const personal=world.EarthPlanner.project(home.state,choices,horizon);
    const construction=world.EarthPlanner.project(home.state,[{id:'build:garden',plot:1}],horizon);
    assert.equal(JSON.stringify(home.state),start);
    for (const action of choices) assert.equal(home.act(action.id).ok,true);
    advance(home,horizon);
    verifyProjected(home,personal);
    assert.equal(observer.act('build:garden',1).ok,true);
    advance(observer,horizon);
    verifyProjected(observer,construction);
    assert.ok(construction.site.food>personal.site.food);
    home.destroy();observer.destroy();
  }
});

test('rehearsal rejects impossible plots and time horizons without consuming live resources', () => {
  const home=found();
  const start=JSON.stringify(home.state);
  for (const horizon of [-1,0,.5,5]) {
    assert.equal(world.EarthPlanner.project(home.state,[{id:'wait'}],horizon).ok,false);
  }
  assert.equal(world.EarthPlanner.project(home.state,[{id:'build:garden',plot:-1}],1).ok,false);
  assert.equal(world.EarthPlanner.project(home.state,[{id:'build:garden',plot:1},{id:'build:workshop',plot:1}],1).ok,false);
  assert.equal(JSON.stringify(home.state),start);
  home.destroy();
});

test('choosing a city precinct in a rehearsal pays its full cost and opens it on the live timetable', () => {
  const live=found(),reference=found();
  const location=world.EarthCityModel.overview(live.active()).records.findIndex(p=>p.minutes>15);
  const project={id:'city-project',location,project:'transit'};
  const initial=JSON.stringify(live.state);
  const short=world.EarthPlanner.project(live.state,[project],1);
  const long=world.EarthPlanner.project(live.state,[project],2);
  assert.equal(JSON.stringify(live.state),initial);
  assert.equal(reference.planCity(location,'transit').ok,true);
  advance(reference,1);
  verifyProjected(reference,short);
  assert.equal(short.city.reachable,world.EarthCityModel.overview(reference.active()).reachable);
  advance(reference,1);
  verifyProjected(reference,long);
  assert.equal(long.city.reachable,world.EarthCityModel.overview(reference.active()).reachable);
  assert.ok(long.city.reachable>short.city.reachable);
  assert.equal(world.EarthPlanner.project(live.state,[{...project,location:99}],2).ok,false);
  live.destroy();reference.destroy();
});
