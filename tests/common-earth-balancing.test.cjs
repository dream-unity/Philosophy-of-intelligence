'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({});
runtime.window = runtime;
for (const name of ['navigation','voyages','neighbours','shifts','campaigns','city','strategy','partners','legacy','construction','simulation']) {
  vm.runInContext(fs.readFileSync(path.join(directory, name+'.js'), 'utf8'), runtime, {filename:name+'.js'});
}
const origin = {name:'Melbourne',lat:-37.8181,lon:144.9731,water:false};
const destination = {name:'Zürich',lat:47.3769,lon:8.5417,water:false};
function ok(result) { assert.equal(result.ok,true,result.message); }
function fresh() {
  const sim=runtime.CommonEarthSim.create({storage:null});
  ok(sim.found(origin));
  return sim;
}
function optional(sim,id) {
  if (!sim.actions().some(item => item.id===id && item.available)) return false;
  ok(sim.act(id)); return true;
}

test('founding relocates inventory and a young outpost cannot immediately sponsor an unconnected chain', () => {
  const sim=fresh(), first=sim.active();
  const opening=Object.fromEntries(['funds','materials','food','population'].map(key=>[key,first[key]]));
  const grant=sim.foundingOffer(destination);
  ok(sim.found(destination));
  for (const key of ['funds','materials','food']) {
    assert.equal(sim.active()[key],grant.goods[key]);
    assert.equal(first[key]+sim.active()[key],opening[key]);
  }
  assert.equal(first.population,opening.population-grant.relocating);
  assert.ok(sim.active().population<opening.population);
  const next={lat:12,lon:176,water:true,name:'Pacific'};
  assert.equal(sim.foundingOffer(next).available,false);
  const before=JSON.stringify(sim.state);
  assert.equal(sim.found(next).ok,false);
  assert.equal(JSON.stringify(sim.state),before);
});

test('a second street market serves limited local demand while full district exchanges retain their wider yield', () => {
  const sim=fresh(),s=sim.active();
  const ordinary=sim.forecastNext().sites[0].production.funds;
  ok(sim.act('build:market',0));
  ok(sim.workConstruction(120));
  const first=sim.forecastNext().sites[0].production.funds-ordinary;
  const second=sim.previewBuild('market',1).delta.funds;
  ok(sim.act('build:market',1));
  ok(sim.workConstruction(120));
  assert.equal(sim.forecastNext().sites[0].production.funds,ordinary+first+second);
  assert.ok(first>second);
  const other=fresh();
  const outside=runtime.EarthCityModel.overview(other.active()).records.filter(p=>p.terrain.id!=='crossing');
  for(const precinct of outside.slice(0,2))ok(other.planCity(precinct.id,'market'));
  ok(other.workConstruction(240));
  const outer=other.forecastNext().sites[0].production;
  assert.ok(outer.funds>sim.forecastNext().sites[0].production.funds);
  assert.ok(outer.trust<0);
  assert.equal(s.buildings.length,2);
});

test('a food deficit takes precedence over a much larger industrial surplus on a long-haul route', () => {
  const sim=fresh(), donor=sim.active();
  ok(sim.found(destination));
  const industrial=sim.active();
  for(let week=0;week<45 && industrial.population<18;week++) {
    if(industrial.trust<55 && sim.state.effort>=2) {
      const repairer=industrial.residents[1];
      if(!repairer.heard)optional(sim,'listen:'+repairer.id);
      if(!repairer.promise)optional(sim,'promise:'+repairer.id);
      if(repairer.promise)optional(sim,'fulfil:'+repairer.id);
    }
    while(sim.state.effort) {
      const vote=sim.actions('council').find(a=>a.available && a.id.startsWith('vote:') && !a.goods.food);
      if(vote){ok(sim.act(vote.id));continue;}
      if(industrial.food<12){ok(sim.act('work:forage'));continue;}
      if(industrial.buildings.length===3)break;
      if(optional(sim,'build:workshop'))ok(sim.workConstruction(120));
      else ok(sim.act(industrial.funds<6?'work:contract':'work:salvage'));
    }
    ok(sim.advance());
  }
  assert.equal(industrial.population,18);
  for(let week=0;week<45 && (industrial.food>0 || industrial.wellbeing>32);week++)ok(sim.advance());
  assert.equal(industrial.food,0);
  assert.ok(industrial.materials-donor.materials>donor.food-industrial.food);
  ok(sim.act('route:'+donor.id));
  let firstArrival=null;
  for(let week=0;week<12;week++) {
    const forecast=sim.forecastNext().sites.find(s=>s.id===industrial.id);
    ok(sim.advance());
    const route=sim.state.routes[0];
    if(!week)assert.ok(route.shipments.some(sh=>sh.good==='food'&&sh.to===industrial.id));
    if(firstArrival===null && forecast.arrivals.some(text=>text.includes('food')))firstArrival=industrial.wellbeing;
    if(firstArrival!==null)assert.ok(industrial.wellbeing>=firstArrival,'incoming food must reach households before hunger is applied');
  }
  assert.ok(firstArrival>0);
  assert.ok(industrial.food>0);
});
