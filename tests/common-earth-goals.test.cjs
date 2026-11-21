'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const context=vm.createContext({});context.window=context;
for(const file of ['construction','dismantling','neighbours','voyages','shifts','campaigns','strategy','partners','city','goals','legacy','simulation']){
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
  ok(sim.beginGoal(s.id,'food','trust',2));ok(sim.act('listen:'+p.id));ok(sim.act('promise:'+p.id));ok(sim.planCity(0,'market'));ok(sim.workConstruction(120));
  const before=serialize(sim),first=sim.forecastNext();
  assert.match(first.highlights.join(' '),/safeguard crossed its limit/i);assert.equal(serialize(sim),before);
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,49);
  const resumed=game(serialize(sim));sim.destroy();
  ok(resumed.act('fulfil:'+p.id));ok(resumed.planCity(1,'care'));ok(resumed.workConstruction(120));ok(resumed.act('work:forage'));
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
  assert.equal(goals.summary(sim.state).active.aim.value,18);ok(sim.workConstruction(120));advances(sim,1);
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
  ok(sim.beginGoal(s.id,'food','shortage',4));ok(sim.planCity(2,'yard'));ok(sim.workConstruction(120));
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,0);
  advances(sim,1);assert.equal(goals.summary(sim.state).active.guard.worst,6);
  ok(sim.planCity(1,'homes'));ok(sim.workConstruction(120));advances(sim,2);
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
    const work=goals.nextStep(sim);assert.equal(work.kind,'construction');
    assert.equal(work.jobId,sim.constructionView().jobs[0].id);
    assert.equal(goals.summary(sim.state).active.aim.value,goals.summary(sim.state).active.aim.base);
    ok(sim.workConstruction(120));
    assert.equal(goals.nextStep(sim).kind,'week');
    advances(sim,2);assert.equal(review(sim).aim.status,'Target reached');

    const queued=fresh(),home=queued.active();
    ok(queued.planCity(step.precinct,project));advances(queued,1);
    ok(queued.beginGoal(home.id,aim,'trust',1));
    assert.equal(goals.nextStep(queued).kind,'construction');
    ok(queued.workConstruction(120));
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

test('two calendar closes cannot satisfy a housing review when no worker staffed the site',()=>{
  const sim=fresh(),site=sim.active();
  ok(sim.beginGoal(site.id,'housing','trust',2));
  const next=goals.nextStep(sim);ok(sim.planCity(next.precinct,next.project));
  for(const resident of site.residents)ok(sim.setWorkPreference(resident.id,'usual'));
  ok(sim.workConstruction(120));
  const guide=goals.nextStep(sim);assert.equal(guide.kind,'construction');assert.match(guide.label,/crew/);
  advances(sim,2);
  const result=review(sim);assert.equal(result.aim.value,result.aim.base);assert.notEqual(result.aim.status,'Target reached');
  const siteJob=site.construction[0];ok(sim.setWorkPreference(site.residents[0].id,'build',siteJob.id));
  ok(sim.workConstruction(120));assert.ok(context.EarthCityModel.overview(site).capacity>=result.aim.target);
  assert.equal(review(sim).aim.value,result.aim.base,'a later opening must not rewrite an archived review');
  sim.destroy();
});

test('a resident with the building supplies can commission a short review project immediately',()=>{
  const sim=fresh(),site=sim.active();
  ok(sim.beginShift(site.residents[1].id));ok(sim.finishShift());
  ok(sim.beginGoal(site.id,'housing','trust',2));
  assert.equal(goals.nextStep(sim).kind,'city');
  const city=goals.nextStep(sim);ok(sim.planCity(city.precinct,city.project));
  ok(sim.workConstruction(120));advances(sim,2);assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('a one-week housing review exposes a conflicting conversion for voluntary cancellation',()=>{
  const sim=fresh(),site=sim.active();
  ok(sim.planCity(0,'homes'));ok(sim.workConstruction(120));advances(sim,2);
  for(let i=0;i<3;i++)ok(sim.act('work:contract'));
  ok(sim.act('work:salvage'));advances(sim,1);
  ok(sim.planCity(0,'yard'));ok(sim.planCity(1,'homes'));advances(sim,1);
  ok(sim.beginGoal(site.id,'housing','trust',1));
  const current=serialize(sim),guide=goals.nextStep(sim);
  assert.equal(serialize(sim),current);assert.equal(guide.kind,'city');assert.equal(guide.precinct,0);assert.equal(guide.project,'cancel');
  ok(sim.planCity(guide.precinct,guide.project));
  assert.equal(goals.nextStep(sim).kind,'construction');
  ok(sim.workConstruction(120));advances(sim,1);
  assert.equal(review(sim).aim.status,'Target reached');
  assert.equal(context.EarthCityModel.overview(site).records[0].use,'homes');
  sim.destroy();
});

test('a short review may recover supplies from occupied projects before its final commissioning window closes',()=>{
  const sim=fresh(),site=sim.active();
  ok(sim.planCity(0,'food'));ok(sim.planCity(1,'water'));
  assert.equal(site.materials,2);
  ok(sim.beginGoal(site.id,'housing','trust',2));
  for(let n=0;n<2;n++){
    const before=serialize(sim),review=goals.nextStep(sim);
    assert.equal(serialize(sim),before);
    assert.equal(review.kind,'city');assert.equal(review.project,'cancel');
    ok(sim.planCity(review.precinct,review.project));
  }
  assert.equal(site.materials,4);
  const homes=goals.nextStep(sim);assert.equal(homes.project,'homes');
  ok(sim.planCity(homes.precinct,homes.project));ok(sim.workConstruction(120));advances(sim,2);
  assert.equal(review(sim).aim.status,'Target reached');
  sim.destroy();
});

test('paid shifts can fund a two-week goal before its commissioning window closes',()=>{
  const sim=fresh(),site=sim.active();
  ok(sim.act('build:market',1));ok(sim.act('build:market',3));ok(sim.workConstruction(180));
  assert.ok(site.funds<7);
  const proposal=goals.preview(sim.state,site.id,'housing','trust',2);
  ok(proposal);ok(sim.beginGoal(site.id,'housing','trust',2));
  let next;
  for(let n=0;n<20 && sim.state.learningGoals.active;n++){
    next=goals.nextStep(sim);
    if(next.kind==='week')ok(sim.advance());
    else if(next.kind==='city')ok(sim.planCity(next.precinct,next.project));
    else if(next.kind==='construction')ok(sim.workConstruction(120));
    else ok(sim.act(next.actionId));
  }
  assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('guidance protects threatened homes even when a new housing project still needs to be commissioned',()=>{
  const sim=fresh(),site=sim.active(),city=context.EarthCityModel;
  const sheltered=city.overview(site).records.find(r=>r.terrain.id==='shelter').id;
  ok(sim.planCity(sheltered,'homes'));ok(sim.workConstruction(120));advances(sim,2);
  for(let i=0;i<3;i++)ok(sim.act('work:contract'));ok(sim.act('work:salvage'));advances(sim,1);
  ok(sim.planCity(sheltered,'yard'));ok(sim.workConstruction(120));
  assert.equal(city.overview(site).records[sheltered].laborReady,true);
  ok(sim.beginGoal(site.id,'housing','trust',2));
  const protection=goals.nextStep(sim);
  assert.equal(protection.project,'cancel');assert.equal(protection.precinct,sheltered);
  ok(sim.planCity(protection.precinct,protection.project));
  const more=goals.nextStep(sim);assert.equal(more.project,'homes');assert.notEqual(more.precinct,sheltered);
  ok(sim.planCity(more.precinct,more.project));ok(sim.workConstruction(120));advances(sim,2);
  assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('at zero effort a resident can move into food growing and cover the final basket before the pantry review',()=>{
  const sim=game();ok(sim.found({name:'Estuary',lat:0,lon:1,water:false}));const site=sim.active();
  assert.equal(site.specialty,'materials');ok(sim.beginGoal(site.id,'food','trust',1));ok(sim.act('work:forage'));
  sim.state.effort=0;
  const initial=sim.forecastNext().sites[0].closing.food,report=goals.summary(sim.state).active;
  assert.equal(initial,report.aim.target-1);assert.equal(sim.state.effort,0);
  const guide=goals.nextStep(sim);assert.equal(guide.group,'build');assert.match(guide.actionId,/^work-role:/);
  const id=guide.actionId.slice('work-role:'.length);
  ok(sim.setWorkPreference(id,'food'));assert.equal(goals.nextStep(sim).actionId,guide.actionId);
  assert.match(goals.nextStep(sim).detail,/on the way/);
  ok(sim.workConstruction(60));assert.equal(goals.nextStep(sim).kind,'week');
  advances(sim,1);assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('a housing goal recommends resuming an existing paused precinct even after its calendar date passes',()=>{
  const sim=fresh(),site=sim.active();ok(sim.planCity(0,'homes'));
  const job=site.construction[0];ok(sim.setConstructionPaused(job.id,true));
  advances(sim,2);ok(sim.workConstruction(120));assert.equal(job.work,0);
  ok(sim.beginGoal(site.id,'housing','trust',1));const guide=goals.nextStep(sim);
  assert.equal(guide.kind,'construction');assert.equal(guide.jobId,job.id);assert.match(guide.label,/Resume work/);
  ok(sim.setConstructionPaused(job.id,false));ok(sim.workConstruction(120));
  assert.equal(goals.nextStep(sim).kind,'week');advances(sim,1);assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('a bond review can be reached by spending a day with a resident who already spoke and recently kept a promise',()=>{
  const sim=fresh(),site=sim.active(),p=site.residents[1];
  for(const move of ['listen','promise','fulfil'])ok(sim.act(move+':'+p.id));
  advances(sim,1);ok(sim.beginGoal(site.id,'bond:'+p.id,'trust',1));
  const talk=goals.nextStep(sim);assert.equal(talk.actionId,'listen:'+p.id);ok(sim.act(talk.actionId));
  const spend=goals.nextStep(sim);assert.equal(spend.page,'startShift');assert.equal(spend.residentId,p.id);
  ok(sim.beginShift(p.id));assert.equal(goals.nextStep(sim).page,'shift');
  for(const [stop,choice] of [['earn','diagnose'],['meaning','card']]){ok(sim.arriveShift(stop));ok(sim.chooseShift(choice));}
  const handover=goals.nextStep(sim);assert.equal(handover.page,'shift');assert.match(handover.label,/^Finish/);
  ok(sim.finishShift());assert.equal(goals.nextStep(sim).kind,'week');advances(sim,1);
  assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('delivery of a parcel already in hand can supply the final bond without effort',()=>{
  const sim=fresh(),site=sim.active(),p=site.residents[0];
  ok(sim.beginGoal(site.id,'bond:'+p.id,'trust',1));ok(sim.act('listen:'+p.id));
  ok(sim.act('courier:pick'));sim.state.effort=0;
  assert.equal(sim.state.effort,0);const handover=goals.nextStep(sim);
  assert.equal(handover.actionId,'courier:deliver:'+p.id);ok(sim.act(handover.actionId));
  advances(sim,1);assert.equal(review(sim).aim.status,'Target reached');sim.destroy();
});

test('a short bond review offers a hearing and recognises a promise an existing worksite can still keep',()=>{
  const empty=fresh(),site=empty.active(),repairer=site.residents[1];
  empty.state.effort=1;
  const before=serialize(empty),blocked=goals.preview(empty.state,site.id,'bond:'+repairer.id,'trust',1);
  ok(blocked);assert.match(blocked.aim.hint,/parcel/);assert.equal(serialize(empty),before);
  empty.destroy();

  const staffed=fresh(),home=staffed.active(),person=home.residents[1];ok(staffed.act('build:workshop',0));
  staffed.state.effort=1;
  ok(staffed.beginGoal(home.id,'bond:'+person.id,'trust',1));
  ok(staffed.act(goals.nextStep(staffed).actionId));
  const agreement=goals.nextStep(staffed);assert.equal(agreement.actionId,'promise:'+person.id);ok(staffed.act(agreement.actionId));
  assert.equal(goals.nextStep(staffed).kind,'construction');ok(staffed.workConstruction(120));advances(staffed,1);
  assert.equal(review(staffed).aim.status,'Target reached');staffed.destroy();
});

test('the zero-effort pantry preview gives a numerical shortfall and preserves uncertain funded openings',()=>{
  const empty=game();ok(empty.found({name:'Estuary',lat:0,lon:1,water:false}));const site=empty.active();
  empty.state.effort=0;
  const before=serialize(empty),blocked=goals.preview(empty.state,site.id,'food','trust',1);
  ok(blocked);assert.match(blocked.aim.hint,/projects 12 food against a target of 16/);
  assert.equal(serialize(empty),before);ok(empty.beginGoal(site.id,'food','trust',2));empty.destroy();

  const farm=fresh(),home=farm.active();ok(farm.act('build:garden',0));
  farm.state.effort=0;
  const risk=goals.preview(farm.state,home.id,'food','trust',1);ok(risk);assert.match(risk.aim.hint,/Closing now projects/);
  ok(farm.beginGoal(home.id,'food','trust',1));assert.equal(goals.nextStep(farm).kind,'construction');
  ok(farm.workConstruction(120));advances(farm,1);assert.equal(review(farm).aim.status,'Target reached');
  farm.destroy();
});
