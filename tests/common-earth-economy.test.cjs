'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const browser = vm.createContext({});
browser.window = browser;
for (const name of ['navigation', 'city', 'partners', 'campaigns', 'shifts', 'construction', 'simulation']) {
  vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),browser,{filename:name+'.js'});
}
const start = {name:'Stone Town',lat:-6.1622,lon:39.1922,water:false};
const saveKey = 'common-earth.world.v1';
function ok(result) { assert.equal(result.ok,true,result.message); }
function world(raw) {
  const rows = new Map(raw ? [[saveKey,raw]] : []);
  const storage = {getItem:key=>rows.get(key) ?? null,setItem:(key,value)=>rows.set(key,value)};
  const load = () => browser.CommonEarthSim.create({storage});
  const sim = load();
  if(!raw)ok(sim.found(start));
  return {sim,load};
}
function finishCrewWork(sim) {
  ok(sim.workConstruction(300));
  assert.equal(sim.active().construction.length,0);
}
function close(sim) {
  const forecast = sim.forecastNext().sites.find(s=>s.id===sim.active().id);
  ok(sim.advance());
  const report = sim.lastWeek().sites.find(s=>s.id===sim.active().id);
  for(const [key,amount] of Object.entries(forecast.closing)) {
    assert.equal(sim.active()[key],amount,key);
    assert.equal(report.closing[key],amount,key);
    assert.equal(report.delta[key],forecast.delta[key],key);
  }
  return forecast;
}
function vote(sim) {
  const ballot=sim.actions('council').find(a=>a.available && a.id.startsWith('vote:') && !['vote:store','vote:lease'].includes(a.id));
  if(ballot)ok(sim.act(ballot.id));
}

test('a growing district can begin with a productive outer precinct as well as a central garden', () => {
  const central=world().sim, outer=world().sim, idle=world().sim;
  ok(central.act('build:garden',0));
  const plot=browser.EarthCityModel.overview(outer.active()).records.find(r=>r.terrain.id==='field');
  ok(outer.planCity(plot.id,'food'));
  finishCrewWork(central);finishCrewWork(outer);
  for(let week=0;week<3;week++)for(const game of [central,outer,idle])close(game);
  assert.equal(outer.active().buildings.length,0);
  assert.equal(outer.active().population,central.active().population);
  assert.equal(outer.active().food,central.active().food);
  assert.equal(outer.active().population,14);
  assert.equal(idle.active().population,12);
});

test('actual opening and replacement of housing change crowding at the opening week and preserve existing residents', () => {
  const {sim,load}=world(),site=sim.active(),city=browser.EarthCityModel;
  ok(sim.act('build:garden',0));
  ok(sim.act('build:hall',1));
  finishCrewWork(sim);
  close(sim);
  const plot=city.overview(site).records.find(r=>r.terrain.id==='shelter').id;
  for(let tries=0;!city.preview(site,sim.state,plot,'homes').available;tries++){
    assert(tries<10);
    if(sim.state.effort)ok(sim.act(site.materials<4?'work:salvage':'work:contract'));
    else close(sim);
  }
  ok(sim.planCity(plot,'homes'));
  finishCrewWork(sim);
  while(site.population<26){assert(sim.state.week<40);vote(sim);close(sim);}
  const requested=city.preview(site,sim.state,plot,'yard');
  assert.equal(requested.completedView.crowding.excess,8);
  assert.match(requested.forecast,/8 residents/i);
  ok(sim.planCity(plot,'yard'));
  finishCrewWork(sim);
  const construction=close(sim);
  assert.equal(construction.crowding.excess,0);
  assert.equal(construction.housingCapacity,26);
  const converted=close(sim);
  assert.equal(site.population,26);
  assert.equal(converted.housingCapacity,18);
  assert.equal(converted.crowding.excess,8);
  assert.equal(converted.crowding.wellbeing,-2);
  assert.match(converted.forecast,/8 residents.*-2 wellbeing/);
  assert(converted.highlights.some(t=>t.includes('Crowding')));
  assert.equal(load().active().population,26);
  const recovery=city.preview(site,sim.state,plot,'homes');
  assert.equal(recovery.completedView.crowding.wellbeing,0);
  ok(sim.planCity(plot,'homes'));
  finishCrewWork(sim);
  const rebuilding=close(sim);
  assert.equal(rebuilding.crowding.excess,8);
  const reopened=close(sim);
  assert.equal(reopened.crowding.excess,0);
  assert.equal(reopened.crowding.wellbeing,0);
  assert(reopened.highlights.some(t=>t.includes('crowding cost has ended')));
  assert.equal(site.population,26);
  assert.equal(load().active().wellbeing,site.wellbeing);
});

test('a settlement with exhausted effort, empty stores and zero public trust can rebuild its food supply without a loan', () => {
  const initial=JSON.parse(JSON.stringify(world().sim.state)),site=initial.sites[0];
  Object.assign(site,{food:0,funds:0,materials:0,trust:0,wellbeing:0,population:24});
  initial.effort=0;
  const {sim,load}=world(JSON.stringify(initial));
  assert.match(close(sim).highlights.join(' '),/ran short of food/);
  const grower=sim.active().residents[0];
  for(const id of ['listen:'+grower.id,'promise:'+grower.id,'work:forage','fulfil:'+grower.id,'work:forage'])ok(sim.act(id));
  assert.equal(sim.active().food,3);
  assert.equal(sim.active().trust,3);
  close(sim);
  for(const id of ['work:contract','work:salvage','build:garden'])ok(sim.act(id));
  finishCrewWork(sim);
  assert.equal(close(sim).production.food,2);
  assert.equal(sim.active().food,4);
  assert.equal(load().active().food,4);
});

test('an earlier demolition confirmation cannot dismantle a replacement built on the same lot', () => {
  const {sim,load}=world();
  ok(sim.act('build:garden',0));
  finishCrewWork(sim);
  const first=sim.previewReclaim(0);
  ok(sim.reclaim(0,first.buildingId));
  ok(sim.act('build:garden',0));
  finishCrewWork(sim);
  const next=sim.previewReclaim(0),before=JSON.stringify(sim.state);
  assert.notEqual(next.buildingId,first.buildingId);
  assert.equal(sim.reclaim(0,first.buildingId).ok,false);
  assert.equal(JSON.stringify(sim.state),before);
  const restored=load();
  assert.equal(restored.previewReclaim(0).buildingId,next.buildingId);
  ok(restored.reclaim(0,next.buildingId));
  assert.equal(restored.active().buildings.length,0);
});

test('payday, cancelled work and a completed local commission cannot pay twice after a reload', () => {
  const wages=world();
  const opening=wages.sim.active().funds;
  for(let i=0;i<4;i++)ok(wages.sim.act('work:contract'));
  assert.equal(wages.sim.active().funds,opening+16);
  const paid=wages.load();
  assert.equal(paid.act('work:contract').ok,false);
  assert.equal(paid.active().funds,opening+16);

  const builder=world();
  const site=builder.sim.active(),funds=site.funds,materials=site.materials;
  ok(builder.sim.planCity(0,'homes'));
  ok(builder.sim.planCity(0,'cancel'));
  assert.deepEqual([site.funds,site.materials],[funds-4,materials-2]);
  assert.equal(builder.load().planCity(0,'cancel').ok,false);

  const charter=world(),sim=charter.sim;
  ok(sim.act('commission:accept'));
  const [,repairer,convenor]=sim.active().residents;
  for(const id of ['listen:'+repairer.id,'listen:'+convenor.id,'build:workshop'])ok(sim.act(id));
  finishCrewWork(sim);ok(sim.act('commission:pilot:stock'));
  const decision=close(sim);
  assert(decision.highlights.some(t=>t.includes('Traders stocked')));
  assert.equal(sim.active().commission.phase,'complete');
  const after=charter.load();
  assert.equal(after.active().funds,sim.active().funds);
  assert.equal(after.act('commission:accept').ok,false);
  assert.equal(after.act('commission:pilot:stock').ok,false);
  assert.equal(close(after).highlights.some(t=>t.includes('Traders stocked')),false);
});

test('a forfeited diplomatic deposit transfers once and its outstanding balance expires', () => {
  const {sim,load}=world();
  let key,booking;
  for(const item of sim.actions('routes').filter(a=>a.id.endsWith(':meet'))) {
    ok(sim.act(item.id));
    key=item.partnerId;
    booking=sim.actions('routes').find(a=>a.id==='partner:'+key+':book' && a.available);
    if(booking)break;
  }
  assert(booking);
  ok(sim.act(booking.id));
  const get=s=>browser.EarthPartners.get(s.state,s.active(),key);
  const pact=get(sim).agreement;
  assert.equal(pact.paid,1);
  assert.equal(pact.balance,2);
  const restored=load();
  assert.equal(restored.act(booking.id).ok,false);
  const messages=[];
  while(get(restored).agreement){
    assert(restored.state.week<pact.due+6);
    messages.push(...close(restored).highlights);
    const agreement=get(restored).agreement;
    if(agreement?.phase==='forfeit'){
      assert.equal(agreement.balance,0);
      assert.equal(restored.act('partner:'+key+':dispatch').ok,false);
    }
  }
  assert.equal(messages.filter(t=>t.includes('received the forfeited')).length,1);
  assert.equal(get(load()).standing,-1);
});

test('returning an unused shift effort cannot give two different projects the same identity',()=>{
  const {sim,load}=world(),site=sim.active();
  ok(sim.beginShift(site.residents[0].id));
  ok(sim.act('build:garden',0));
  ok(sim.finishShift());
  ok(sim.act('build:workshop',1));
  finishCrewWork(sim);
  assert.notEqual(site.buildings[0].id,site.buildings[1].id);
  assert.deepEqual(Array.from(load().active().buildings,b=>b.kind),['garden','workshop']);
});

test('districts wait independently for actual builders and their earliest opening week',()=>{
  const {sim,load}=world(),site=sim.active(),city=browser.EarthCityModel;
  for(const p of site.residents)ok(sim.setWorkPreference(p.id,'usual'));
  const i=city.overview(site).records.find(r=>r.terrain.id==='shelter').id;
  const before=[site.funds,site.materials,sim.state.effort];
  const offered=city.preview(site,sim.state,i,'homes',true);
  assert.equal(offered.available,true);
  assert.equal(offered.crew.workers.length,0);
  assert.equal(offered.crew.etaSeconds,null);
  ok(sim.planCity(i,'homes'));
  assert.deepEqual([site.funds,site.materials,sim.state.effort],[before[0]-7,before[1]-4,before[2]-2]);
  const id=site.city.precincts[i].jobId;
  ok(sim.workConstruction(120));
  assert.equal(site.construction[0].work,0);
  close(sim);close(sim);
  assert.equal(site.city.precincts[i].turns,0);
  assert.equal(site.city.precincts[i].target,'homes');
  assert.equal(city.housingCapacity(site),18);
  const resumed=load(),home=resumed.active();
  ok(resumed.setWorkPreference(home.residents[1].id,'build',id));
  const assigned=resumed.constructionView().jobs.find(j=>j.id===id);
  assert.equal(assigned.workers[0],home.residents[1].id);
  assert(assigned.etaSeconds>0);
  const week=resumed.state.week;
  finishCrewWork(resumed);
  assert.equal(resumed.state.week,week);
  assert.equal(home.city.precincts[i].target,null);
  assert.equal(city.housingCapacity(home),26);
  const journal=resumed.state.journal.filter(e=>e.text.includes('opened at'));
  assert.equal(journal.length,1);
  assert.equal(load().active().city.precincts[i].use,'homes');
});

test('old paid district construction migrates once and retains time already worked',()=>{
  const raw=JSON.parse(JSON.stringify(world().sim.state)),old=raw.sites[0];
  old.city.precincts[1]={use:'open',target:'homes',turns:1};
  delete old.city.serial;delete old.construction;delete old.workforce;
  const {sim,load}=world(JSON.stringify(raw)),site=sim.active(),order=site.construction[0];
  assert.equal(order.kind,'homes');assert.equal(order.precinct,1);
  assert.equal(order.work,Math.floor(order.total/2));
  assert.equal(site.funds,old.funds);assert.equal(site.materials,old.materials);
  assert.equal(sim.state.effort,raw.effort);
  const funds=site.funds,materials=site.materials,week=sim.state.week;
  finishCrewWork(sim);
  const ready=load();
  assert.equal(ready.active().city.precincts[1].laborReady,true);
  assert.equal(ready.active().construction.length,0);
  assert.equal(ready.state.week,week);
  assert.equal(ready.active().funds,funds);assert.equal(ready.active().materials,materials);
  assert.equal(ready.active().city.precincts[1].use,'open');
  close(ready);
  assert.equal(ready.active().city.precincts[1].use,'homes');
});

test('a broken city queue falls back to the previous paid order and migrates it',()=>{
  const {sim}=world(),city=browser.EarthCityModel;
  ok(sim.planCity(1,'homes'));
  const old=JSON.parse(JSON.stringify(sim.state)),site=old.sites[0];
  site.city.precincts[1]={use:'open',target:'homes',turns:1};
  const broken=JSON.stringify(old);
  assert.equal(city.validWork(site,[]),false);
  assert.equal(browser.CommonEarthSim.readSave(broken),null);
  delete site.construction;delete site.workforce;delete site.city.serial;
  const previous=JSON.stringify(old);
  const storage={getItem:key=>key===saveKey?broken:key===saveKey+'.previous'?previous:null};
  const recovered=browser.CommonEarthSim.create({storage});
  assert.match(recovered.saveMessage,/Recovered/);
  assert.equal(recovered.active().city.precincts[1].jobId,recovered.active().construction[0].id);
  assert.equal(recovered.active().construction[0].work,Math.floor(recovered.active().construction[0].total/2));
});

test('a cancellation releases the exact crew booking and cannot finish the next booking',()=>{
  const {sim,load}=world(),site=sim.active(),city=browser.EarthCityModel;
  ok(sim.planCity(0,'food'));
  const old=JSON.parse(JSON.stringify(site.construction[0]));
  ok(sim.setWorkPreference(site.residents[0].id,'build',old.id));
  ok(sim.workConstruction(3));ok(sim.planCity(0,'cancel',old.id));
  assert.equal(site.construction.length,0);
  assert.equal(site.workforce.members[site.residents[0].id].preferredJobId,null);
  ok(sim.planCity(0,'food'));
  assert.notEqual(site.construction[0].id,old.id);
  assert.equal(city.finish(site,old).ok,false);
  assert.equal(sim.planCity(0,'cancel',old.id).ok,false);
  assert.equal(site.city.precincts[0].laborReady,false);
  assert.equal(load().active().construction.length,1);
});

test('late removal keeps the original use until a crew finishes and salvages one material once',()=>{
  const {sim,load}=world(),site=sim.active(),city=browser.EarthCityModel;
  ok(sim.planCity(2,'market'));
  finishCrewWork(sim);
  assert.equal(site.city.precincts[2].laborReady,true);
  assert.equal(city.marketCatchments(site),0);
  close(sim);
  assert.equal(city.marketCatchments(site),1);
  ok(sim.planCity(2,'open'));
  const old=JSON.parse(JSON.stringify(site.construction[0]));
  close(sim);
  assert.equal(city.marketCatchments(site),1);
  const before=site.materials;
  finishCrewWork(sim);
  assert.equal(city.marketCatchments(site),0);
  assert.equal(site.materials,before+1);
  assert.equal(city.finish(site,old).ok,false);
  assert.equal(load().active().materials,before+1);
});
