'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
function makeRuntime(extra={}){
  const runtime=vm.createContext(extra);
  runtime.window=runtime;
  for(const name of ['construction','shifts','city','strategy','partners','legacy','simulation','construction-clock']){
    vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
  }
  return runtime;
}
const runtime=makeRuntime();
function storage(){
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
const point={name:'Australia',lat:-25.3,lon:133.8};
function ok(r){assert.equal(r?.ok,true,r?.message);return r;}
function found(store=null){
  const sim=runtime.CommonEarthSim.create({storage:store});ok(sim.found(point));return sim;
}
test('the pictured lot nine is paid once, builds in active time and keeps the repair promise only on opening',()=>{
  const disk=storage(),s=found(disk),site=s.active(),person=site.residents[1];
  ok(s.act('listen:'+person.id));ok(s.act('promise:'+person.id));
  ok(s.act('build:garden',7));ok(s.workConstruction(120));
  const before=s.forecastNext().sites[0].production;
  const treasury=site.funds,stock=site.materials,effort=s.state.effort;
  ok(s.act('build:workshop',8));
  assert.equal(site.funds,treasury-6);assert.equal(site.materials,stock-3);assert.equal(s.state.effort,effort-1);
  assert.equal(site.stats.kept,0);assert.equal(site.buildings.length,1);
  assert.equal(s.previewBuild('workshop',8).available,false);
  const first=site.construction[0];assert.equal(first.work,0);
  assert.equal(s.act('build:workshop',8).ok,false);
  ok(s.workConstruction(14));
  assert(first.work>0&&first.work<first.total);
  const reloaded=runtime.CommonEarthSim.create({storage:disk});
  assert.equal(reloaded.active().construction[0].work,first.work);
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.forecastNext().sites[0].production)),{...before,materials:before.materials-1});
  ok(reloaded.workConstruction(120));
  const open=reloaded.active(),production=reloaded.forecastNext().sites[0].production;
  assert.equal(open.construction.length,0);assert.equal(open.stats.kept,1);
  assert.equal(open.buildings.filter(b=>b.plot===8&&b.kind==='workshop').length,1);
  assert.equal(open.funds,treasury-6);assert.equal(open.materials,stock-3);
  assert.equal(production.food,before.food+1);assert.equal(production.materials,before.materials+2);
  ok(reloaded.workConstruction(120));
  assert.equal(open.stats.kept,1);assert.equal(open.buildings.length,2);
});
test('withdrawn builders pause work through calendar changes, and cancellation returns the quoted balance once',()=>{
  const s=found(),site=s.active();
  ok(s.act('build:hall',2));const job=site.construction[0];
  ok(s.workConstruction(16));assert(job.work>0&&job.work<job.total);
  for(const p of site.residents)ok(s.setWorkPreference(p.id,'usual'));
  const progress=job.work;
  ok(s.advance());ok(s.workConstruction(90));assert.equal(job.work,progress);assert.equal(site.buildings.length,0);
  const quote=s.previewCancelConstruction(job.id),funds=site.funds,materials=site.materials,effort=s.state.effort;
  assert(quote.available);ok(s.cancelConstruction(job.id));
  assert.equal(site.funds,funds+quote.refund.funds);assert.equal(site.materials,materials+quote.refund.materials);
  assert.equal(s.state.effort,effort);assert.equal(s.cancelConstruction(job.id).ok,false);
  assert(s.previewBuild('workshop',2).available);
  ok(s.act('build:workshop',2));assert.notEqual(site.construction[0].id,job.id);
  assert.equal(s.cancelConstruction(job.id).ok,false);
});
test('two visible tabs credit overlapping time once and a clock-only save preserves the next valid player action',async()=>{
  const disk=storage(),a=found(disk);
  ok(a.act('build:workshop',8));
  const b=runtime.CommonEarthSim.create({storage:disk});
  const notices=[];
  b.subscribe((_state,notice)=>notices.push(notice));
  function amounts(s){return JSON.stringify([s.active().construction,s.active().workforce]);}
  ok(await a.perform('workConstruction',12,100000));
  const once=amounts(a);
  ok(await b.perform('workConstruction',12,100000));assert.equal(amounts(b),once);
  assert.equal(notices.length,1);assert.equal(notices[0].external,true);assert.equal(notices[0].construction,true);
  ok(await b.perform('workConstruction',3,101000));
  const solo=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(a.state)});
  ok(solo.workConstruction(1));assert.equal(amounts(solo),amounts(b));
  const before=a.active().funds;
  ok(await a.perform('act','work:contract'));assert.equal(a.active().funds,before+4);
  // Another tab's economic transaction still requires reviewing its refreshed state.
  assert.equal((await b.perform('act','work:contract')).ok,false);
  ok(await b.perform('workConstruction',180,300000));const seen=[];
  a.subscribe((_state,notice)=>seen.push(notice));assert(a.sync());
  assert.equal(seen.at(-1).completed.length,1);assert.equal(seen.at(-1).completed[0].siteId,a.active().id);
  assert.equal(a.active().buildings.length,1);
});
test('a backgrounded or closed game never accrues construction while away',async()=>{
  let time=0,token=0,listener,timer;
  const onPage={},onWindow={},calls=[];
  const doc={hidden:false,addEventListener:(name,fn)=>onPage[name]=fn,removeEventListener:(name)=>delete onPage[name]};
  const r=makeRuntime({document:doc,performance:{timeOrigin:100000,now:()=>time},
    addEventListener:(name,fn)=>onWindow[name]=fn,removeEventListener:(name)=>delete onWindow[name],
    setTimeout:fn=>{timer=fn;return ++token;},clearTimeout:()=>timer=null});
  const sim={state:{sites:[]},subscribe:fn=>{listener=fn;return ()=>listener=null;},
    perform:async(...args)=>{calls.push(args);return {ok:true};}};
  // Use the game model to give the clock an authentic active site.
  const active=found();ok(active.act('build:garden',4));
  const stop=r.EarthConstructionClock.start(sim);
  assert.equal(timer,undefined);
  sim.state.sites.push(active.active());listener(sim.state,{});time+=1000;await timer();
  assert.equal(calls.length,1);assert.equal(calls[0][1],1);
  doc.hidden=true;onPage.visibilitychange();assert.equal(timer,null);
  time+=4*60*60*1000;doc.hidden=false;onPage.visibilitychange();time+=1000;await timer();
  assert.equal(calls[1][1],1);
  onWindow.pagehide();assert.equal(timer,null);
  time+=15000;onWindow.pageshow();time+=1000;await timer();assert.equal(calls[2][1],1);
  stop();assert.equal(timer,null);assert.equal(listener,null);
});
test('a cheaper cancellation quote requires another confirmation and a stale map order cannot partially assign a crew',()=>{
  const s=found(),site=s.active();ok(s.act('build:workshop',8));
  const job=site.construction[0],first=s.previewCancelConstruction(job.id).refund;
  const ids=site.residents.map(p=>p.id),before=JSON.stringify(site.workforce);
  assert.equal(s.assignBuilders([ids[0],'someone-else'],job.id).ok,false);
  assert.equal(s.assignBuilders([ids[0],ids[0]],job.id).ok,false);
  assert.equal(s.assignBuilders(ids,'missing').ok,false);
  assert.equal(JSON.stringify(site.workforce),before);
  ok(s.assignBuilders(ids,job.id));ok(s.workConstruction(12));
  const next=s.previewCancelConstruction(job.id);
  assert(next.available && next.refund.funds<first.funds);
  assert.equal(s.cancelConstruction(job.id,first).ok,false);
  assert.equal(site.construction.length,1);
  ok(s.cancelConstruction(job.id,next.refund));assert.equal(site.construction.length,0);
});

test('a delayed foreground callback cannot rewind the labour clock or grant the same work twice',async()=>{
  const disk=storage(),fast=found(disk);ok(fast.act('build:workshop',8));
  const delayed=runtime.CommonEarthSim.create({storage:disk});
  const now=Date.now();ok(await fast.perform('workConstruction',18,now));
  const progress=fast.active().construction[0].work;
  await delayed.perform('workConstruction',2,now-8200);
  assert.equal(delayed.active().construction[0].work,progress);assert.equal(delayed.state.constructionThrough,now);
  ok(await delayed.perform('workConstruction',2,now+1000));
  const control=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(fast.state)});
  ok(control.workConstruction(1));assert.equal(delayed.active().construction[0].work,control.active().construction[0].work);
});

test('a world imported from a device with its clock set ahead resumes on the first local crew tick',()=>{
  const s=found();ok(s.act('build:workshop',8));const now=Date.now();
  s.state.constructionThrough=now+86400000;
  const restored=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(s.state)});
  const r=ok(restored.workConstruction(1,now));assert.equal(r.changed,true);assert.equal(restored.state.constructionThrough,now);
});
