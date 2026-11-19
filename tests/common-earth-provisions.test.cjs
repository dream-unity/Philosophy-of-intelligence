'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const ok=result=>{assert.equal(result.ok,true,result.message);return result;};
const raw=x=>JSON.parse(JSON.stringify(x));
function town({ocean=false,autonomy=false}={}){
  let now=1700000000000;
  const ctx=vm.createContext({Date:class extends Date{static now(){return now;}},structuredClone});ctx.window=ctx;
  const files=['shifts','personas','agency','pursuits','fisheries','provisions',...(autonomy?['careers','autonomy']:[]),'simulation'];
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(directory,file+'.js'),'utf8'),ctx,{filename:file+'.js'});
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const open=()=>ctx.CommonEarthSim.create({key:'earth',storage});
  const sim=open();ok(sim.found(ocean?{name:'Island Anchorage',water:true,lat:-24,lon:75}:{name:'River Bend',lat:-36,lon:141}));
  return {open,sim,ctx,s:sim.active(),w:sim.state,p:ctx.EarthProvisions,time:ms=>{now+=ms;}};
}
function proof(t,target='market'){
  const s=t.sim.active(),actor=t.ctx.EarthAgency.actorId(s);
  return target==='quay'?{siteId:s.id,mode:'walk',actor,target,x:6,y:24.65,waterfront:true}:
    {siteId:s.id,mode:'walk',actor,target,x:15,y:23.1,tx:15,ty:23.04};
}
function request(t,action,crateId){
  const {actorId,siteId,generation,serial,week}=t.sim.provisionsView();
  return {actorId,siteId,generation,serial,week,action,crateId};
}
const act=(t,action,crateId,scene)=>t.sim.provision(request(t,action,crateId),scene||proof(t));
const add=(s,kind)=>s.buildings.push({id:'b'+s.buildings.length,kind,plot:s.buildings.length,name:kind});
test('two fresh food and one material buy a finite, recoverable parcel with no subsidy or civic effort',()=>{
  const t=town(),{s,w,sim}=t;
  const before=JSON.stringify(s);assert.equal(sim.provisionsView().capacity,1);assert.equal(JSON.stringify(s),before);
  s.food=2;s.materials=1;w.effort=0;
  const q=request(t,'pack');
  ok(sim.provision(q,proof(t)));assert.deepEqual([s.food,s.materials,w.effort],[0,0,0]);
  const crate=sim.provisionsView().crates[0];
  assert.equal(crate.remaining,2);assert.equal(crate.packedBy,t.ctx.EarthPersonas.profile(s,'steward').name);
  assert.equal(crate.origin,'Shared pantry food');assert.equal(crate.reserved,false);
  assert(!sim.provision(q,proof(t)).ok);
  s.food=20;s.materials=10;assert(!act(t,'pack').ok);
  add(s,'garden');add(s,'market');add(s,'fishingDock');add(s,'garden');add(s,'garden');
  assert.equal(sim.provisionsView().capacity,6);
  for(let i=0;i<5;i++)ok(act(t,'pack'));
  assert(!act(t,'pack').ok);const ids=sim.provisionsView().crates.map(c=>c.id);
  s.buildings=[];assert.equal(sim.provisionsView().capacity,1);
  ok(act(t,'reserve',ids[0]));ok(act(t,'hold',ids[0]));ok(act(t,'reserve',ids[0]));
  const loose=s.food;for(const id of ids)ok(act(t,'open',id));
  assert.equal(s.food,loose+12);assert.equal(sim.provisionsView().used,0);assert(!act(t,'open',ids[0]).ok);
  s.food=1;assert.match(sim.provisionsView().options[0].reason,/handline/);
  s.food=2;s.materials=0;assert.match(sim.provisionsView().options[0].reason,/Recover one material/);
  sim.destroy();
});
test('handling samples the actual actor at the correct exchange or quay after the save lock opens',async()=>{
  const t=town(),{s,sim,ctx}=t,spot=proof(t),before=JSON.stringify(s);
  for(const patch of [{x:2},{x:7,tx:7},{target:'homes'},{mode:'boat'},{boarding:true},{placement:true},{returning:true},{actor:'driver'},{siteId:'other'}]){
    assert(!sim.provision(request(t,'pack'),{...spot,...patch}).ok);
  }
  assert(!act(t,'pack',undefined,proof(t,'quay')).ok,'there is no real shore here');
  assert.equal(JSON.stringify(s),before);
  let unlock,present=spot;
  ctx.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{unlock=()=>resolve(run());})}};
  const close=sim.perform('provision',request(t,'pack'),()=>present);present=null;unlock();
  assert(!(await close).ok);assert.equal(JSON.stringify(s),before);
  delete ctx.navigator;
  const stale=request(t,'pack');
  ok(sim.changeActor(s.residents[1].id,{...spot,actor:'steward'}));
  assert(!sim.provision(stale,proof(t)).ok);
  ok(act(t,'pack'));assert.equal(sim.provisionsView().crates[0].packedBy,s.residents[1].name);
  assert(!sim.provision({...request(t,'open',s.provisions.crates[0].id),generation:s.foundingRevision+1},proof(t)).ok);
  sim.destroy();
});
test('a boat catch feeds two fish crates packed by a different person and survives a reload',()=>{
  const t=town({ocean:true}),{s,sim,ctx}=t;add(s,'fishingDock');
  const original=s.food;
  ok(sim.fish(s.id,()=>({mode:'boat'})));
  assert.equal(s.food,original+4);
  const fisher=ctx.EarthPersonas.profile(s,'steward').name,packer=s.residents[2];
  ok(sim.changeActor(packer.id,proof(t)));
  ok(act(t,'pack',undefined,proof(t,'quay')));ok(act(t,'pack',undefined,proof(t,'quay')));
  assert.equal(s.food,original);assert.equal(s.provisions.receipt,undefined);
  for(const c of sim.provisionsView().crates){assert.equal(c.origin,'Fish landed by '+fisher);assert.equal(c.packedBy,packer.name);}
  const saved=raw(sim.provisionsView().crates);sim.destroy();const reloaded=t.open();
  assert.deepEqual(raw(reloaded.provisionsView().crates),saved);reloaded.destroy();
});
test('a shore handline and exchange harvest label only real currently available food, and never mint a second catch',()=>{
  const t=town({ocean:true}),{s,sim,p,w}=t;const q=proof(t,'quay'),fisher=t.ctx.EarthPersonas.profile(s,'steward').name;
  ok(sim.useHandline(q,'cast'));t.time(6000);ok(sim.useHandline(q,'land'));assert(!sim.useHandline(q,'land').ok);
  ok(act(t,'pack',undefined,q));
  assert.equal(sim.provisionsView().crates[0].origin,'Fish landed by '+fisher+' with shared pantry food');
  ok(act(t,'open',s.provisions.crates[0].id));assert.equal(s.provisions.receipt,undefined);
  function task(action,kind){const {siteId,generation,actorId,serial}=t.ctx.EarthPursuits.view(s);
    return sim.pursue({siteId,generation,actorId,serial,action,kind},action==='collect'?proof(t):undefined);}
  ok(task('start','food'));t.time(16000);const previous=s.food;ok(task('collect'));assert.equal(s.food,previous+2);
  assert.match(sim.provisionsView().options[0].detail,new RegExp('Produce collected by '+fisher));
  s.food--;p.reconcile(s,w.week);s.food+=5;p.reconcile(s,w.week);
  assert.equal(s.provisions.receipt.units,1,'new generic food does not renew a spent harvest');
  ok(act(t,'pack',undefined,q));
  assert.equal(sim.provisionsView().crates[0].origin,'Produce collected by '+fisher+' with shared pantry food');
  const snapshot=JSON.stringify(s.provisions);p.credit(w,s,'catch',1,null);assert.equal(JSON.stringify(s.provisions),snapshot);
  add(s,'garden');ok(sim.advance());
  assert.match(sim.provisionsView().options[0].detail,/Harvest from the district garden/);
  sim.destroy();
});
test('only the uncovered portion of household meals draws a reserved crate, after council deliveries and before hunger',()=>{
  const t=town(),{s,sim,ctx}=t;
  s.food=2;s.materials=2;s.population=20;s.specialty='materials';
  ok(act(t,'pack'));const id=s.provisions.crates[0].id;
  assert.equal(sim.forecastNext().sites[0].foodShortage,true,'holding a crate is a real choice');
  ok(act(t,'reserve',id));s.pending=[{index:2,choice:'store',week:2}];
  const stored=JSON.stringify(s.provisions);let forecast=sim.forecastNext();
  assert.equal(forecast.sites[0].foodShortage,false);assert.equal(forecast.sites[0].closing.food,2);
  assert.equal(JSON.stringify(s.provisions),stored);ok(sim.advance());
  assert.equal(sim.provisionsView().reservedFood,2);assert.equal(s.provisions.lastRelief,undefined);
  s.food=0;forecast=sim.forecastNext();assert.equal(forecast.sites[0].foodShortage,false);assert.equal(forecast.sites[0].closing.food,0);
  const source=sim.provisionsView().crates[0].packedBy;
  assert.ok(forecast.highlights.some(line=>line.includes(source)&&line.includes('shortfall was covered')));
  ok(sim.advance());assert.equal(s.food,0);assert.equal(sim.provisionsView().reservedFood,1);
  assert.equal(t.p.relieve(t.w,s,1),'','closing twice cannot spend the remaining portion');
  assert.deepEqual(raw(s.provisions.lastRelief),{week:3,amount:1,shortfall:1,contributors:['steward']});
  s.population=25;forecast=sim.forecastNext();assert.equal(forecast.sites[0].foodShortage,true);
  assert.ok(forecast.highlights.some(line=>line.includes('1 food was still missing')));
  ok(sim.advance());assert.equal(s.provisions.crates.length,0);assert.equal(s.provisions.lastRelief.shortfall,2);
  assert.ok(ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));sim.destroy();
});
test('a free food worker spends real stores and their one session on an earmarked surplus, protecting promises and the lean weeks',()=>{
  const t=town({autonomy:true}),{s,w,p,ctx,sim}=t,foodWorker=ctx.EarthPersonas.profile(s,'walker-0');
  const available={id:foodWorker.id,profile:foodWorker,row:{energy:7},free:true};
  s.food=32;s.materials=10;
  assert.equal(p.volunteer(w,s,available),false);add(s,'market');assert(p.volunteer(w,s,available));
  const promise={dueWeek:3,advance:{food:0}};s.residents[0].promise=promise;s.food=12;
  assert.equal(p.volunteer(w,s,available),false);delete s.residents[0].promise;s.food=32;
  for(const unavailable of [{...available,free:false},{...available,row:{energy:2}},
    {...available,id:'driver',profile:ctx.EarthPersonas.profile(s,'driver')}]){
    assert.equal(p.volunteer(w,s,unavailable),false);
  }
  p.credit(w,s,'harvest',2,s.residents[0].id);
  const copy=raw(w);copy.week++;ctx.EarthAutonomy.settle(copy.sites[0],copy);w.week++;ctx.EarthAutonomy.settle(s,w);
  assert.deepEqual(raw(copy.sites[0].provisions),raw(s.provisions));
  const choices=Object.entries(s.autonomy.people).filter(([,row])=>row.history[0].kind==='preserve');
  assert.equal(choices.length,1);assert.equal(choices[0][0],s.provisions.crates[0].by);
  assert.notEqual(choices[0][0],'steward');assert(s.provisions.crates[0].reserved);
  assert.equal(sim.provisionsView().crates[0].origin,'Produce collected by '+s.residents[0].name);
  assert.deepEqual([s.food,s.materials],[30,9]);assert.equal(p.putByCrew(w,s,available),null);
  const snapshot=JSON.stringify(s);assert.deepEqual(raw(ctx.EarthAutonomy.settle(s,w)),[]);assert.equal(JSON.stringify(s),snapshot);
  assert(ctx.EarthAutonomy.valid(s,w.week));assert(p.valid(s,w.week));sim.destroy();
});
test('old saves keep an empty shelf and invalid goods, provenance, dates and actors cannot enter the simulation',()=>{
  const t=town(),{ctx,p,s,w,sim}=t;
  const legacy=ctx.CommonEarthSim.readSave(JSON.stringify(w));assert(legacy);assert.equal(legacy.sites[0].provisions,undefined);
  ok(act(t,'pack'));ok(act(t,'reserve',s.provisions.crates[0].id));
  for(const corrupt of [d=>{d.crates[0].remaining=3;},d=>{d.crates.push({...d.crates[0]});},d=>{d.crates[0].by='unknown-person';},
    d=>{d.crates[0].source='catch';d.crates[0].sourceUnits=2;},d=>{d.crates[0].week=w.week+1;},d=>{d.crates[0].id=d.serial+1;},
    d=>{d.receipt={source:'harvest',units:15,stock:15,week:w.week,by:null};},
    d=>{d.lastRelief={week:w.week,amount:2,shortfall:1,contributors:['steward']};}]){
    const broken=raw(w);corrupt(broken.sites[0].provisions);
    assert.equal(p.valid(broken.sites[0],broken.week),false);assert.equal(ctx.CommonEarthSim.readSave(JSON.stringify(broken)),null);
  }
  const legacyPorter=raw(w);legacyPorter.sites[0].provisions.crates[0].by='carrier-0-1';
  ctx.EarthPersonas=undefined;assert(ctx.CommonEarthSim.readSave(JSON.stringify(legacyPorter)));
  legacyPorter.sites[0].provisions.crates[0].by='carrier-0-8';assert.equal(ctx.CommonEarthSim.readSave(JSON.stringify(legacyPorter)),null);
  assert(ctx.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('a full fresh pantry creates no phantom fish receipt; the ordinary empty settlement APIs stay safe',()=>{
  const t=town({ocean:true}),{s,sim,ctx}=t;add(s,'fishingDock');s.food=Number.MAX_SAFE_INTEGER;
  assert.equal(sim.fish(s.id,()=>({mode:'boat'})).ok,false);assert.equal(s.provisions,undefined);
  const empty=ctx.CommonEarthSim.create({storage:null});assert.equal(empty.provisionsView(),null);
  assert.equal(empty.provision({},null).ok,false);assert.equal(empty.pursue({action:'collect'}).ok,false);
  empty.destroy();sim.destroy();
});
