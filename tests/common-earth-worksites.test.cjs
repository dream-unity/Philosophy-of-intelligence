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
  for(const name of ['construction','dismantling','shifts','city','strategy','partners','legacy','simulation','construction-clock']){
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
  const treasury=site.funds,stock=site.materials;
  ok(s.act('build:workshop',8));
  assert.equal(site.funds,treasury-6);assert.equal(site.materials,stock-3);
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
  const quote=s.previewCancelConstruction(job.id),funds=site.funds,materials=site.materials;
  assert(quote.available);ok(s.cancelConstruction(job.id));
  assert.equal(site.funds,funds+quote.refund.funds);assert.equal(site.materials,materials+quote.refund.materials);
  assert.equal(s.cancelConstruction(job.id).ok,false);
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
function visibleClock(sim){
  const origin=1_700_000_000_000,events={},pageEvents={},calls=[];
  let elapsed=0,timer=null;
  const doc={hidden:false,addEventListener:(id,fn)=>pageEvents[id]=fn,removeEventListener:id=>delete pageEvents[id]};
  const env=makeRuntime({document:doc,performance:{timeOrigin:origin,now:()=>elapsed},
    addEventListener:(id,fn)=>events[id]=fn,removeEventListener:id=>delete events[id],
    setTimeout:(fn,delay)=>{assert.equal(delay,1000);timer=fn;return 1;},clearTimeout:()=>timer=null});
  const host={get state(){return sim.state;},subscribe:sim.subscribe,worksiteLoadIssue:sim.worksiteLoadIssue,
    perform:(command,seconds,through)=>{calls.push([seconds,through-origin]);return sim.perform(command,seconds,through);}};
  const stop=env.EarthConstructionClock.start(host);
  return {origin,calls,stop,pass(ms){elapsed+=ms;},async fire(ms){elapsed+=ms;const next=timer;timer=null;assert(next);await next();},
    hidden(value){doc.hidden=value;pageEvents.visibilitychange();},get pending(){return !!timer;}};
}
test('delayed foreground timers settle the same workshop and crew as a steady clock',async()=>{
  const live=found();ok(live.act('build:workshop',4));
  const steady=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(live.state)});
  const clock=visibleClock(live);
  try{
    const local=game=>JSON.stringify([game.active().construction,game.active().buildings,game.active().workforce]);
    for(let i=0;i<10;i++){
      await clock.fire(6000);
      for(let second=0;second<6;second++)ok(steady.workConstruction(1));
      assert.equal(local(live),local(steady));
      if(live.active().buildings.length)break;
    }
    assert.equal(live.active().buildings[0]?.plot,4);
    assert(clock.calls.length<=10);
  }finally{clock.stop();live.destroy();steady.destroy();}
});
test('foreground catch-up batches are bounded, respect another tab’s watermark and end when the game is hidden',async()=>{
  const disk=storage(),live=found(disk);ok(live.act('build:workshop',4));
  const other=runtime.CommonEarthSim.create({storage:disk}),clock=visibleClock(live);
  try{
    await clock.fire(42000);
    assert.deepEqual(clock.calls,[[15,15000]]);
    ok(await other.perform('workConstruction',5,clock.origin+20000));
    assert(live.sync());
    await clock.fire(1000);
    assert.deepEqual(clock.calls.at(-1),[15,35000]);
    clock.hidden(true);
    assert.equal(clock.pending,false);clock.pass(600000);
    clock.hidden(false);await clock.fire(1000);
    assert.deepEqual(clock.calls.at(-1),[1,644000]);
  }finally{clock.stop();other.destroy();live.destroy();}
});
test('new work orders receive no overdue batch from before their crew assignment',async()=>{
  const live=found();ok(live.act('build:workshop',4));
  const clock=visibleClock(live);
  try{
    await clock.fire(42000);
    ok(live.act('build:garden',0));
    await clock.fire(1000);
    assert.deepEqual(clock.calls,[[15,15000],[2,43000]]);
  }finally{clock.stop();live.destroy();}
});
test('paid shifts and resident visits preserve foregone timer callbacks while a workshop crew stays on the same job',async()=>{
  const live=found();ok(live.act('build:workshop',4));
  const steady=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(live.state)});
  const clock=visibleClock(live);
  try{
    await clock.fire(42000);
    for(const game of [live,steady]){
      ok(game.act('work:contract'));ok(game.act('listen:'+game.active().residents[0].id));
    }
    await clock.fire(1000);await clock.fire(1000);
    assert.deepEqual(clock.calls,[[15,15000],[15,30000],[14,44000]]);
    ok(steady.workConstruction(44));
    assert.equal(JSON.stringify(live.active().construction),JSON.stringify(steady.active().construction));
    assert.equal(JSON.stringify(live.active().workforce),JSON.stringify(steady.active().workforce));
  }finally{clock.stop();live.destroy();steady.destroy();}
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

test('pausing one lot retains precisely its work and budget while a second lot and the week continue',async()=>{
  const disk=storage(),s=found(disk),site=s.active();
  ok(s.act('build:workshop',8));ok(s.act('build:garden',0));
  const [hold,other]=site.construction;
  ok(s.assignBuilders([site.residents[1].id],hold.id));ok(s.workConstruction(12));
  const retained=hold.work,weekly=s.forecastNext().sites[0];assert(retained>0);assert(weekly.workforce.materials<0);
  const funds=site.funds,materials=site.materials;
  ok(await s.perform('setConstructionPaused',hold.id,true));
  const revision=s.state.actionRevision;
  ok(await s.perform('setConstructionPaused',hold.id,true));assert.equal(s.state.actionRevision,revision);
  assert.equal(s.assignBuilders([site.residents[0].id],hold.id).ok,false);
  assert.equal(site.funds,funds);assert.equal(site.materials,materials);
  const resume=runtime.CommonEarthSim.create({storage:disk});
  const paused=resume.constructionView().jobs.find(j=>j.id===hold.id);
  assert.equal(paused.paused,true);assert.equal(paused.work,retained);assert.equal(paused.etaSeconds,null);
  assert.equal(resume.active().construction.find(j=>j.id===other.id).work,other.work);
  ok(resume.workConstruction(120));ok(resume.advance());
  assert.equal(resume.active().construction.find(j=>j.id===hold.id).work,retained);
  assert(resume.active().buildings.some(b=>b.plot===0));assert(!resume.active().buildings.some(b=>b.plot===8));
  ok(resume.setConstructionPaused(hold.id,false));ok(resume.workConstruction(90));
  assert.equal(resume.active().buildings.filter(b=>b.plot===8).length,1);
  assert.equal(resume.setConstructionPaused(hold.id,false).ok,false);
});

test('finishing a shift uses the visible companion position only when the resident and district match',()=>{
  const s=found(),site=s.active(),host=site.residents[0];
  ok(s.act('build:garden',2));ok(s.workConstruction(8));
  ok(s.beginShift(host.id));
  const wrong=runtime.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(s.state)});
  const original=JSON.stringify(wrong.active().workforce.members[host.id].position);
  ok(wrong.finishShift({x:1,y:2,siteId:'elsewhere',residentId:host.id}));
  assert.equal(JSON.stringify(wrong.active().workforce.members[host.id].position),original);
  ok(s.finishShift({x:12,y:18.5,siteId:site.id,residentId:host.id}));
  assert.deepEqual({...site.workforce.members[host.id].position},{x:12,y:18.5});
  ok(s.workConstruction(1));assert.notEqual(JSON.stringify(site.workforce.members[host.id].position),JSON.stringify({x:12,y:18.5}));
});

test('an exhausted street order counter stays readable and cannot consume building supplies',()=>{
  const s=found(),site=s.active();site.projectSerial=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(s.state);
  assert.equal(s.act('build:workshop',8).ok,false);assert.equal(JSON.stringify(s.state),before);
  assert.equal(runtime.CommonEarthSim.readSave(before).sites[0].projectSerial,Number.MAX_SAFE_INTEGER);
});

test('a missing precinct or salvage module cannot consume an almost-finished job or its reserved goods',()=>{
  for(const module of ['EarthCityModel','EarthDismantling']){
    const r=makeRuntime(),s=r.CommonEarthSim.create({storage:null});ok(s.found(point));
    const site=s.active();
    if(module==='EarthCityModel')ok(s.planCity(2,'food'));
    else{ok(s.act('build:workshop',8));ok(s.workConstruction(90));ok(s.reclaim(8,site.buildings[0].id));}
    const pending=site.construction[0],owner=r[module];pending.work=pending.total-1;
    const before=JSON.stringify(s.state);r[module]=undefined;
    assert.match(s.constructionView().jobs[0].loadIssue,/Reload/);
    assert.equal(s.previewCancelConstruction(pending.id).available,false);
    ok(s.workConstruction(90));assert.equal(JSON.stringify(s.state),before);
    r[module]=owner;ok(s.workConstruction(90));assert.equal(site.construction.length,0);
  }
});

test('an independent council’s paid worksite employs a physical crew before anyone visits, and two tabs cannot finish it twice',async()=>{
  const context=vm.createContext({structuredClone,TextDecoder});context.window=context;
  const html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
  for(const match of html.matchAll(/<script src="([\w-]+\.js)/g)){
    vm.runInContext(fs.readFileSync(path.join(directory,match[1]),'utf8'),context,{filename:match[1]});
    if(match[1]==='simulation.js')break;
  }
  const disk=storage(),open=()=>context.CommonEarthSim.create({storage:disk}),a=open();
  ok(a.found({name:'Stone Town',region:'Zanzibar',lat:-6.1622,lon:39.1922}));
  const homeId=a.state.activeId;
  assert.deepEqual(Array.from(context.CommonEarthSim.constructionDistricts(a.state),s=>s.id),[homeId],'idle neighbours do not enter the physical construction loop');
  let town,job;
  for(let n=0;n<24&&!job;n++){
    ok(a.advance());
    for(const candidate of a.state.communityLife.outposts){
      const staffed=context.EarthConstruction.view(candidate,a.state).jobs.find(j=>j.workers.length);
      if(staffed){town=candidate;job=staffed;break;}
    }
  }
  assert.ok(job,'an autonomous council commissioned a staffed worksite');
  const {id,plot,kind}=job,treasury=town.funds,materials=town.materials;
  const journalCount=()=>a.state.journal.filter(line=>line.siteId===town.id&&line.text.includes('opened on lot '+(plot+1))).length;
  const beforeJournal=journalCount(),opening=JSON.stringify(town.workforce);
  const b=open(),local=[],remote=[];
  a.subscribe((_w,notice)=>local.push(notice));b.subscribe((_w,notice)=>remote.push(notice));
  const start=1700000000000;
  const first=ok(await a.perform('workConstruction',8,start));
  assert.ok(first.changed);assert.notEqual(JSON.stringify(town.workforce),opening);
  assert.ok(local.at(-1).sites.includes(town.id));
  assert.equal(ok(await b.perform('workConstruction',8,start)).changed,false);
  assert.ok(remote.at(-1).sites.includes(town.id));
  const finished=ok(await a.perform('workConstruction',220,start+220000));
  assert.equal(finished.completed.filter(j=>j.siteId===town.id&&j.id===id).length,1);
  assert.ok(b.sync());
  assert.ok(remote.at(-1).completed.some(j=>j.siteId===town.id&&j.id===id));
  assert.equal(ok(await b.perform('workConstruction',220,start+220000)).changed,false);
  assert.equal(a.state.activeId,homeId);assert.ok(!a.state.sites.some(s=>s.id===town.id));
  assert.equal(town.buildings.filter(v=>v.kind===kind&&v.plot===plot).length,1);
  assert.equal(town.funds,treasury);assert.equal(town.materials,materials);assert.equal(journalCount(),beforeJournal+1);
  const reloaded=open(),saved=reloaded.state.communityLife.outposts.find(s=>s.id===town.id);
  assert.ok(saved.buildings.some(v=>v.kind===kind&&v.plot===plot));
  assert.ok(!context.CommonEarthSim.constructionDistricts(reloaded.state).some(s=>s.id===town.id&&!s.construction.length));
  for(const sim of [a,b,reloaded])sim.destroy();
});
