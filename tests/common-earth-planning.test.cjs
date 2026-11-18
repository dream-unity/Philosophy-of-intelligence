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

test('the precinct inspector includes another project scheduled to open alongside the proposed project', () => {
  const sim=found(),model=world.EarthCityModel,site=sim.active();
  assert.equal(sim.planCity(0,'food').ok,true);
  const p=model.preview(site,sim.state,1,'water');
  assert.equal(p.concurrent,1);
  const actual=JSON.parse(JSON.stringify(site)),original=JSON.parse(JSON.stringify(site));
  assert.equal(model.apply(actual,{effort:2,week:sim.state.week},1,'water').ok,true);
  model.weekly(actual);model.weekly(original);
  assert.equal(p.rate.food,model.overview(actual).weekly.food-model.overview(original).weekly.food);
  assert.ok(p.rate.food>=2);
  sim.destroy();
});

test('the two-step parcel rehearsal matches delivery on the street, including a zero-effort handover', () => {
  const live=found();
  for(let i=0;i<3;i++)assert(live.act('work:salvage').ok);
  const collect=live.actions('work').find(a=>a.id==='courier:pick');
  const deliver='courier:deliver:'+collect.residentId, before=JSON.stringify(live.state);
  const forecast=world.EarthPlanner.project(live.state,[{id:collect.id},{id:deliver}],1);
  assert.equal(JSON.stringify(live.state),before);
  assert(live.act(collect.id).ok);
  assert.equal(live.state.effort,0);
  assert(live.act(deliver).ok);
  advance(live,1);
  verifyProjected(live,forecast);
});

test('a crew can be recalled in rehearsal at zero effort and a closed lot can be dismantled', () => {
  const live=found();
  assert(live.act('build:garden',0).ok);
  const remove=live.actions('build').find(a=>a.id.startsWith('reclaim:')).id;
  const dismantle=world.EarthPlanner.project(live.state,[{id:remove}],1);
  assert(dismantle.ok,dismantle.message);
  assert(live.planCity(0,'homes').ok);
  assert(live.act('work:contract').ok);
  assert.equal(live.state.effort,0);
  const cancel=world.EarthPlanner.project(live.state,[{id:'city-project',location:0,project:'cancel'}],2);
  assert(live.planCity(0,'cancel').ok);
  advance(live,2);
  verifyProjected(live,cancel);
});

test('a blank world returns a useful rehearsal message', () => {
  const live=world.CommonEarthSim.create({storage:null});
  const plan=world.EarthPlanner.project(live.state,[{id:'wait'}],1);
  assert.equal(plan.ok,false);
  assert.match(plan.message,/community/i);
});

test('rehearsal keeps the full weekly highlights while advancing each private week only once', () => {
  const home=found();
  const expected=[];
  const before=JSON.stringify(home.state);
  const projected=world.EarthPlanner.project(home.state,[{id:'wait'}],4);
  assert(projected.ok);
  assert.equal(JSON.stringify(home.state),before);
  for(let i=0;i<4;i++){
    for(const site of home.forecastNext().sites)for(const text of site.highlights)expected.push(site.name+' · '+text);
    const live=home.advance();
    assert(live.ok);
    assert.equal(live.highlights,undefined);
  }
  assert(expected.length>0);
  assert.deepEqual(Array.from(projected.effects),expected);
});
