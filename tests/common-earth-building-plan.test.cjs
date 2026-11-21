'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const game=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
for(const file of ['construction','dismantling','simulation'])require(path.join(game,file+'.js'));
const model=globalThis.CommonEarthSim;

test('a pinned plan survives an empty treasury, a reload and an unsuccessful commission',()=>{
  let sim=model.create({storage:null});
  assert.ok(sim.found({lat:-6.1622,lon:39.1922}).ok);
  const snapshot=structuredClone(sim.state);
  const district=snapshot.sites[0];
  Object.assign(district,{funds:0,materials:0,food:0});snapshot.effort=0;
  sim.destroy();sim=model.create({storage:null,snapshot:JSON.stringify(snapshot)});
  assert.ok(sim.setBuildPlan(district.id,'garden',null).ok);
  assert.deepEqual(sim.buildPlanView().missing,[{key:'funds',amount:5},{key:'materials',amount:3}]);
  assert.equal(sim.act('build:garden',1).ok,false);
  assert.equal(sim.state.week,1);assert.equal(Object.hasOwn(sim.state,'effort'),false);
  assert.equal(sim.setBuildPlan(district.id,null,'workshop').ok,false);
  const saved=JSON.stringify(sim.state);sim.destroy();sim=model.create({storage:null,snapshot:saved});
  assert.equal(sim.buildPlanView().kind,'garden');
  assert.equal(sim.setBuildPlan('elsewhere',null,'garden').ok,false);
  assert.ok(sim.advance().ok);
  assert.ok(sim.act('work:contract').ok);assert.ok(sim.act('work:salvage').ok);
  assert.equal(sim.buildPlanView().ready,true);
  const effort=sim.state.effort;
  assert.equal(sim.act('build:garden',-1).ok,false);
  assert.equal(sim.state.effort,effort);assert.equal(sim.buildPlanView().kind,'garden');
  assert.ok(sim.act('build:garden',1).ok);
  assert.equal(sim.buildPlanView(),null);
  assert.ok(model.readSave(JSON.stringify(sim.state)));sim.destroy();
});

test('plans respect local geography, reject invalid ids and stay with their community',()=>{
  const sim=model.create({storage:null});
  assert.ok(sim.found({lat:40,lon:-100}).ok);const inland=sim.active().id;
  for(const kind of ['fishingDock','__proto__','constructor',['garden']]) assert.equal(sim.setBuildPlan(inland,kind,null).ok,false);
  assert.ok(sim.setBuildPlan(inland,'wetland',null).ok);
  assert.equal(sim.buildPlanView().next,'research');
  assert.ok(sim.found({lat:10,lon:110,water:true}).ok);const coast=sim.active().id;
  assert.equal(sim.buildPlanView(),null);
  assert.ok(sim.setBuildPlan(coast,'fishingDock',null).ok);
  assert.ok(sim.visit(inland).ok);assert.equal(sim.buildPlanView().kind,'wetland');
  assert.ok(sim.setBuildPlan(inland,null,'wetland').ok);assert.equal(sim.buildPlanView(),null);
  assert.ok(sim.visit(coast).ok);assert.equal(sim.buildPlanView().kind,'fishingDock');
  assert.ok(sim.manageSite(coast,'restart').ok);assert.equal(sim.buildPlanView(),null);
  sim.destroy();
});

test('marking a lot costs nothing and leaves the lot available until commissioned',()=>{
  const sim=model.create({storage:null});assert.ok(sim.found({lat:0,lon:0,water:true}).ok);
  const place=sim.active(),id=place.id;
  assert.equal(sim.markPlanLot(id,undefined,0,null).ok,false);
  assert.ok(sim.setBuildPlan(id,'garden',null).ok);const effort=sim.state.effort;
  assert.ok(sim.markPlanLot(id,'garden',0,null).ok);
  assert.equal(sim.state.effort,effort);assert.equal(place.materials,8);
  assert.equal(sim.buildPlanView().plot,0);assert.equal(sim.buildPlanView().occupied,false);
  assert.ok(sim.act('build:workshop',0).ok);
  assert.equal(sim.buildPlanView().occupied,true);
  assert.equal(sim.markPlanLot(id,'garden',1,null).ok,false);
  assert.ok(sim.markPlanLot(id,'garden',1,0).ok);
  assert.ok(sim.workConstruction(180).ok);
  const beside=sim.previewBuild('garden',1),far=sim.previewBuild('garden',8);
  assert.ok(beside.delta.food>far.delta.food);
  assert.ok(model.readSave(JSON.stringify(sim.state)));
  assert.ok(sim.act('build:garden',1).ok);
  assert.equal(place.buildPlanPlot,undefined);
  assert.equal(sim.buildPlanView(),null);sim.destroy();
});

test('an exhausted coastal save can commission a hall, a fishing dock and further projects in the same week',()=>{
  const original=model.create({storage:null});
  assert.ok(original.found({lat:-6.1622,lon:39.1922,coastal:true}).ok);
  const saved=structuredClone(original.state);
  original.destroy();
  saved.effort=0;
  Object.assign(saved.sites[0],{funds:26,materials:15});
  const sim=model.create({storage:null,snapshot:JSON.stringify(saved)});
  const site=sim.active();
  for(const [plot,kind] of ['hall','fishingDock','garden','garden','garden'].entries()){
    assert.ok(sim.setBuildPlan(site.id,kind,null).ok);
    assert.ok(sim.buildPlanView().ready);
    const action=sim.actions('build').find(a=>a.id==='build:'+kind);
    assert.ok(action.available,action.reason);
    assert.ok(sim.previewBuild(kind,plot).available);
    assert.ok(sim.act(action.id,plot).ok);
  }
  assert.equal(sim.state.week,saved.week);
  assert.equal(site.construction.length,5);
  assert.deepEqual([site.funds,site.materials],[0,0]);
  const blocked=sim.actions('build').find(a=>a.id==='build:hall');
  assert.equal(blocked.blocker,'supplies');
  assert.equal(sim.act(blocked.id,5).ok,false);
  const restored=model.readSave(JSON.stringify(sim.state));
  assert.equal(restored.sites[0].construction.length,5);
  assert.equal(Object.hasOwn(restored,'effort'),false);
  sim.destroy();
});
