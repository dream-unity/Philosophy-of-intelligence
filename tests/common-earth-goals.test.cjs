'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const context=vm.createContext({});context.window=context;
for(const file of ['neighbours','voyages','shifts','campaigns','strategy','partners','city','goals','legacy','simulation']){
  vm.runInContext(fs.readFileSync(path.join(directory,file+'.js'),'utf8'),context,{filename:file+'.js'});
}
const engine=context.CommonEarthSim,goals=context.EarthGoals;
function ok(r){assert.equal(r.ok,true,r.message);return r;}
function game(save){
  const values=new Map(save?[['world',save]]:[]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  return engine.create({storage,key:'world'});
}
function fresh(){
  const sim=game();
  ok(sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,water:false}));
  return sim;
}
const serialize=sim=>JSON.stringify(sim.state);
function advances(sim,count){for(let i=0;i<count;i++)ok(sim.advance());}
function review(sim){return goals.summary(sim.state).history[0];}

test('legacy worlds open, preview is pure, setting the two commitments spends no income or effort',()=>{
  const sim=fresh(),s=sim.active(),before=serialize(sim),legacy=engine.readSave(before);
  assert.equal(legacy.learningGoals,undefined);
  for(const key of ['food','housing','reach','voices','bond:'+s.residents[1].id]){
    for(let weeks=1;weeks<=4;weeks++){
      const p=goals.preview(sim.state,s.id,key,'wellbeing',weeks);
      if(weeks===1 && ['housing','reach'].includes(key)){
        assert.equal(p.ok,false);assert.match(p.message,/two weeks/);continue;
      }
      ok(p);
      assert.equal(p.dueWeek,sim.state.week+weeks);assert.ok(p.aim.target>=p.aim.base);
    }
  }
  assert.equal(serialize(sim),before);
  for(const fail of [['nowhere','food','trust',2],[s.id,'bad','trust',2],[s.id,'food','!' ,2],
    [s.id,'food','trust',0],[s.id,'food','trust',5],[s.id,'food','trust',1.5],
    [s.id,'bond:'+s.residents[0].id,'bond:'+s.residents[0].id,2]]){
    assert.equal(sim.beginGoal(...fail).ok,false);
  }
  assert.equal(serialize(sim),before);
  const prior=[s.funds,s.food,s.materials,sim.state.effort];
  ok(sim.beginGoal(s.id,'housing','trust',2));
  assert.deepEqual([s.funds,s.food,s.materials,sim.state.effort],prior);
  const committed=serialize(sim);
  assert.equal(sim.beginGoal(s.id,'reach','wellbeing',1).ok,false);
  assert.equal(serialize(sim),committed);
  assert.ok(engine.readSave(committed));sim.destroy();
});

test('the endpoint can improve while missing the aim, and an earlier weekly breach survives a recovery',()=>{
  const sim=fresh(),s=sim.active(),p=s.residents[0];
  ok(sim.beginGoal(s.id,'food','trust',2));ok(sim.act('listen:'+p.id));ok(sim.act('promise:'+p.id));ok(sim.planCity(0,'market'));
  const before=serialize(sim),first=sim.forecastNext();
  assert.match(first.highlights.join(' '),/safeguard crossed its limit/i);assert.equal(serialize(sim),before);
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,49);
  const resumed=game(serialize(sim));sim.destroy();
  ok(resumed.act('fulfil:'+p.id));ok(resumed.planCity(1,'care'));ok(resumed.act('work:forage'));
  const snapshot=serialize(resumed),Forecast=resumed.forecastNext();
  assert.equal(serialize(resumed),snapshot);
  assert.match(Forecast.highlights.join(' '),/Learning goal review/);
  advances(resumed,1);
  const r=review(resumed);
  assert.equal(r.aim.base,12);assert.equal(r.aim.target,16);assert.equal(r.aim.value,14);
  assert.match(r.aim.status,/Improved, below target/);
  assert.equal(r.guard.base,50);assert.equal(r.guard.value,52);assert.equal(r.guard.worst,49);assert.equal(r.guard.worstWeek,2);
  assert.match(r.guard.status,/Crossed the limit, then recovered/);
  assert.ok(engine.readSave(serialize(resumed)));resumed.destroy();
});

test('actual voices, bonds and sequential housing openings give independent, measured outcomes',()=>{
  const sim=fresh(),s=sim.active(),person=s.residents[1];
  for(const p of s.residents)ok(sim.act('listen:'+p.id));
  ok(sim.beginGoal(s.id,'voices','bond:'+person.id,1));
  const startBond=person.bond;advances(sim,1);
  assert.match(review(sim).aim.status,/Already met and maintained/);
  assert.equal(review(sim).guard.base,startBond);assert.equal(review(sim).guard.value,startBond);
  ok(sim.beginGoal(s.id,'housing','shortage',2));ok(sim.planCity(0,'homes'));advances(sim,1);
  assert.equal(goals.summary(sim.state).active.aim.value,18);advances(sim,1);
  const end=review(sim);assert.ok(end.aim.value>=24);assert.equal(end.aim.status,'Target reached');
  assert.equal(end.guard.base,0);assert.equal(end.guard.worst,0);sim.destroy();
});

test('commitment remains anchored to its own district as player travels',()=>{
  const sim=fresh(),first=sim.active();
  for(const p of first.residents.slice(0,2))ok(sim.act('listen:'+p.id));
  ok(sim.act('build:garden',2));
  ok(sim.beginGoal(first.id,'bond:'+first.residents[0].id,'wellbeing',2));
  ok(sim.found({name:'North Sea',lat:57.3,lon:2.1,water:true}));
  const second=sim.active();assert.notEqual(second.id,first.id);
  advances(sim,1);
  const bystanderBond=second.residents[0].bond;ok(sim.act('listen:'+second.residents[0].id));
  assert.equal(second.residents[0].bond,bystanderBond+1);
  advances(sim,1);
  const r=review(sim);assert.equal(r.siteId,first.id);assert.equal(r.siteName,first.name);
  assert.equal(r.aim.value,first.residents[0].bond);assert.equal(r.aim.status,'Unchanged, below target');
  assert.ok(engine.readSave(serialize(sim)));sim.destroy();
});

test('housing safeguard records an opening-week shortage even when replacement housing opens by review',()=>{
  const initial=fresh(),saved=JSON.parse(serialize(initial)),district=saved.sites[0];
  district.population=24;district.city.precincts[2].use='homes';initial.destroy();
  const sim=game(JSON.stringify(saved)),s=sim.active();
  assert.equal(context.EarthCityModel.overview(s).crowding.excess,0);
  ok(sim.beginGoal(s.id,'food','shortage',4));ok(sim.planCity(2,'yard'));
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,0);
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,6);
  ok(sim.planCity(1,'homes'));advances(sim,2);
  const r=review(sim);assert.equal(r.guard.value,0);assert.equal(r.guard.worst,6);assert.equal(r.guard.worstWeek,3);
  assert.equal(r.guard.status,'Crossed the limit, then recovered');
  assert.ok(engine.readSave(serialize(sim)));sim.destroy();
});

test('only four completed reviews remain; invalid limits, identities, own-week comparisons and chronology are rejected',()=>{
  const sim=fresh(),s=sim.active();
  for(let i=0;i<6;i++){ok(sim.beginGoal(s.id,'food','wellbeing',1));advances(sim,1);}
  const archive=sim.state.learningGoals.history;assert.equal(archive.length,4);
  assert.deepEqual(Array.from(archive,e=>e.dueWeek),[7,6,5,4]);
  for(const mutate of [
    w=>w.learningGoals.history.push(w.learningGoals.history[0]),
    w=>{w.learningGoals.history[0].aim.target+=1;},
    w=>{w.learningGoals.history[0].guard.worstWeek=1;},
    w=>{w.learningGoals.history[0].guard.worst=100;},
    w=>{w.learningGoals.history[0].siteId='other';},
    w=>{w.learningGoals.history[0].guard.key='bond:missing';},
    w=>{w.learningGoals.history[0].dueWeek=w.week+1;},
    w=>{w.learningGoals.history.reverse();},
  ]){
    const altered=JSON.parse(serialize(sim));mutate(altered);assert.equal(engine.readSave(JSON.stringify(altered)),null);
  }
  ok(sim.beginGoal(s.id,'reach','trust',4));
  const active=JSON.parse(serialize(sim));active.learningGoals.active.checkedWeek--;assert.equal(engine.readSave(JSON.stringify(active)),null);
  assert.ok(engine.readSave(serialize(sim)));sim.destroy();
});

test('construction goals guide the player to a useful precinct and recognise work already scheduled to finish',()=>{
  for(const [aim,project] of [['housing','homes'],['reach','transit']]){
    const sim=fresh(),site=sim.active();
    assert.equal(sim.beginGoal(site.id,aim,'trust',1).ok,false);
    ok(sim.beginGoal(site.id,aim,'trust',2));
    const before=serialize(sim),step=goals.nextStep(sim);
    assert.equal(serialize(sim),before);
    assert.equal(step.kind,'city');assert.equal(step.project,project);
    ok(sim.planCity(step.precinct,step.project));
    assert.equal(goals.nextStep(sim).kind,'week');
    advances(sim,2);assert.equal(review(sim).aim.status,'Target reached');

    const queued=fresh(),home=queued.active();
    ok(queued.planCity(step.precinct,project));advances(queued,1);
    ok(queued.beginGoal(home.id,aim,'trust',1));
    assert.equal(goals.nextStep(queued).kind,'week');
    advances(queued,1);assert.equal(review(queued).aim.status,'Target reached');
    sim.destroy();queued.destroy();
  }
});

test('a food commitment near review uses the projected closing pantry rather than the stock before household meals',()=>{
  const first=fresh(),saved=JSON.parse(serialize(first));
  saved.sites[0].population=30;saved.sites[0].specialty='materials';
  const sim=game(JSON.stringify(saved)),site=sim.active();
  ok(sim.beginGoal(site.id,'food','trust',1));
  ok(sim.act('work:forage'));ok(sim.act('work:forage'));
  assert.ok(site.food>=16);
  assert.equal(goals.nextStep(sim).actionId,'work:forage');
  ok(sim.act('work:forage'));
  assert.equal(goals.nextStep(sim).kind,'week');
  advances(sim,1);assert.equal(review(sim).aim.status,'Target reached');
  sim.destroy();first.destroy();
});
