'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const runtime=vm.createContext({});
runtime.window=runtime;
const game=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
for(const name of ['city','construction','dismantling','simulation']){
  vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
}
const engine=runtime.CommonEarthSim,processOrder=runtime.EarthDismantling;
const copy=x=>JSON.parse(JSON.stringify(x));
const ok=result=>assert.equal(result.ok,true,result.message||result.reason);
function startingWorld(){
  const sim=engine.create({storage:null});ok(sim.found({name:'Common Shore',lat:-42.88,lon:147.33,water:false}));
  return copy(sim.state);
}
const load=raw=>engine.create({storage:null,snapshot:JSON.stringify(raw)});
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));
const maps=(site)=>site.buildings.map(b=>b.id).join(',');
function occupied(){
  const raw=startingWorld(),s=raw.sites[0];
  s.buildings=[
    {id:'first-market',name:'East market',kind:'market',plot:7},
    {id:'old-workshop',name:'Repair Guild',kind:'workshop',plot:3,partners:[s.residents[0].id,s.residents[1].id],inscription:{year:1910}},
    {id:'second-market',name:'West market',kind:'market',plot:1},
    {id:'wetland',name:'Reed filter',kind:'wetland',plot:0}
  ];
  // The same address can possess a different market tier if undo reorders these buildings.
  return raw;
}
test('dismantling takes the last effort, reserves its lot and can be undone before work reaches it',()=>{
  const raw=occupied();raw.effort=1;
  const sim=load(raw),s=sim.active();
  for(const p of s.residents)ok(sim.setWorkPreference(p.id,'usual'));
  const original=copy(s.buildings),money=s.materials,trust=s.trust,bonds=s.residents.map(p=>p.bond),prior=JSON.stringify(sim.state);
  const quote=sim.previewReclaim(3);
  assert.equal(quote.recovered,1);assert.equal(quote.available,true);assert.equal(quote.crew.workers.length,0);
  assert.equal(JSON.stringify(sim.state),prior);
  ok(sim.act('reclaim:old-workshop'));
  assert.equal(sim.state.effort,0);assert.equal(s.buildings.some(b=>b.plot===3),false);
  const job=s.construction[0];
  assert.equal(job.kind,'dismantle');same(job.original,original[1]);
  assert.notEqual(job.id,job.original.id);
  assert.equal(sim.previewBuild('garden',3).available,false);
  ok(sim.workConstruction(120));
  assert.equal(job.work,0);assert.equal(s.materials,money);assert.equal(s.trust,trust);
  assert.equal(sim.previewCancelConstruction(job.id).available,true);
  const restored=load(sim.state);
  ok(restored.cancelConstruction(job.id));
  assert.equal(restored.state.effort,0);assert.equal(restored.active().dismantleOrders,undefined);
  same(restored.active().buildings,original);same(restored.active().residents.map(p=>p.bond),bonds);
  assert.equal(restored.cancelConstruction(job.id).ok,false);
});
test('only physical clearing pays salvage and partner costs, including across save and resume',()=>{
  const sim=load(occupied()),s=sim.active();
  for(const p of s.residents){p.bond=2;ok(sim.setWorkPreference(p.id,'usual'));}
  s.trust=1;
  const money=s.materials;
  ok(sim.reclaim(3,'old-workshop'));
  const job=s.construction[0],id=job.id;
  assert.equal(s.trust,1);assert.equal(s.materials,money);same(s.residents.map(p=>p.bond),[2,2,2]);
  ok(sim.setWorkPreference(s.residents[1].id,'build',id));
  for(let n=0;!job.work&&n<100;n++)ok(sim.workConstruction(1));
  assert(job.work>0&&job.work<job.total);assert.equal(sim.previewCancelConstruction(id).available,false);
  const before=JSON.stringify(sim.state);assert.equal(sim.cancelConstruction(id).ok,false);assert.equal(JSON.stringify(sim.state),before);
  const resumed=load(sim.state),site=resumed.active(),result=resumed.workConstruction(180);ok(result);
  assert.equal(site.buildings.some(b=>b.plot===3),false);assert.equal(site.construction.length,0);assert.equal(site.materials,money+1);
  assert.equal(site.trust,0);same(site.residents.map(p=>p.bond),[1,1,2]);
  assert.equal(result.completed.length,1);
  assert.equal(processOrder.finish(site,result.completed[0]).ok,false);
  ok(resumed.workConstruction(50));assert.equal(site.materials,money+1);
  assert.equal(load(resumed.state).active().materials,money+1);
});
test('concurrent withdrawals preserve original market priority, including after an intervening clearance',()=>{
  const sim=load(occupied()),s=sim.active();
  for(const p of s.residents)ok(sim.setWorkPreference(p.id,'usual'));
  for(const [plot,id] of [[3,'old-workshop'],[7,'first-market'],[0,'wetland']])ok(sim.reclaim(plot,id));
  const [repair,east,reeds]=s.construction;
  ok(sim.setWorkPreference(s.residents[1].id,'build',repair.id));
  const money=s.materials;
  for(let n=0;s.construction.some(j=>j.id===repair.id)&&n<100;n++)ok(sim.workConstruction(1));
  ok(sim.setWorkPreference(s.residents[1].id,'usual'));
  assert.equal(s.materials,money+1);
  assert.equal(s.construction.length,2);
  // Reopen in a different order from closure. The oldest market must remain the first market.
  ok(sim.cancelConstruction(reeds.id));ok(sim.cancelConstruction(east.id));
  assert.equal(maps(s),'first-market,second-market,wetland');
  assert.equal(engine.marketPlan(s).markets[0].plot,7);
  assert.equal(s.dismantleOrders,undefined);
});
test('modified receipts cannot restore a different building and two wetland materials only arrive at completion',()=>{
  const sim=load(occupied()),s=sim.active(),money=s.materials;
  ok(sim.reclaim(0,'wetland'));
  const job=s.construction[0];
  for(const change of [world=>{delete world.sites[0].dismantleOrders;},world=>{world.sites[0].dismantleOrders['0'].rank=10;},
    world=>{world.sites[0].dismantleOrders['0'].id='another-order';},world=>{world.sites[0].construction[0].recovered=20;}]){
    const corrupted=copy(sim.state);change(corrupted);
    assert.equal(engine.readSave(JSON.stringify(corrupted)),null);
  }
  assert.equal(s.materials,money);
  const result=sim.workConstruction(180);ok(result);
  assert.equal(result.completed[0].id,job.id);assert.equal(s.materials,money+2);
  assert.equal(sim.reclaim(0,'wetland').ok,false);
});
