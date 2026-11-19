'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const source=fs.readFileSync(path.join(folder,'forecast-view.js'),'utf8');
const script='https://example.org/common-earth/forecast-view.js?v=test';
const urlFor=name=>new URL(name,script).href;
const modules=[...fs.readFileSync(path.join(folder,'index.html'),'utf8').matchAll(/<script src="([\w-]+\.js)(?:\?[^"]*)?"[^>]*><\/script>/g)].map(m=>m[1]);
const core=modules.slice(0,modules.indexOf('simulation.js')+1).filter(f=>!f.endsWith('-ui.js'));
function runtime(Clock=Date){
  const c=vm.createContext({URL,console,Date:Clock});c.window=c;
  for(const f of core)vm.runInContext(fs.readFileSync(path.join(folder,f),'utf8'),c,{filename:f});
  vm.runInContext(source,c);
  return c;
}
test('background preview of a mixed saved world matches the foreground close and leaves the input untouched',()=>{
  const c=runtime(),sim=c.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19,region:'Zanzibar'}).ok);
  for(let i=0;i<8;i++)assert(sim.advance().ok);
  const original=JSON.stringify(sim.state),expected=JSON.stringify(sim.forecastNext().sites.map(x=>x.closing));
  let reply;
  const worker=vm.createContext({URL,Date,console,location:{href:script},postMessage:value=>{reply=value;}});
  worker.importScripts=(...urls)=>{for(const url of urls){const f=path.basename(new URL(url).pathname);vm.runInContext(fs.readFileSync(path.join(folder,f),'utf8'),worker,{filename:f});}};
  vm.runInContext(source,worker);
  worker.onmessage({data:{modules:core.map(urlFor),snapshot:original,sequence:7,count:1,week:sim.state.week,siteId:sim.state.activeId}});
  assert.equal(reply.sequence,7);assert.equal(JSON.stringify(reply.forecast.sites.map(x=>x.closing)),expected);
  const distant=reply.sections.find(section=>section.key==='outposts'),after=JSON.parse(reply.after);
  assert.equal(distant.ends.length,after.communityLife.outposts.length);
  const first=JSON.parse(reply.after.slice(distant.start,distant.ends[0]));
  assert.deepEqual(first,after.communityLife.outposts[0]);
  assert.equal(JSON.stringify(sim.state),original);sim.destroy();
});
test('two panels share one worker projection, stale replies are discarded and a changed world gets its own turn',async()=>{
  const c=runtime(),sites=Array.from({length:8},(_,i)=>({id:'town'+i,water:true})),state={sites,activeId:'town0',week:3,actionRevision:4};
  let sent=[],forecasts=0,worker;
  const sim={state,forecastNext(){forecasts++;return {week:state.week+1};}};
  const engine=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker={postMessage:m=>sent.push(m),terminate(){}}});
  const first=engine.read(),duplicate=engine.read();assert.equal(first,duplicate);assert.equal(sent.length,1);
  state.week++;
  const later=engine.read();worker.onmessage({data:{sequence:sent[0].sequence,forecast:{week:4}}});assert.equal(await first,null);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.length,2);
  worker.onmessage({data:{sequence:sent[1].sequence,forecast:{week:5}}});assert.equal((await later).week,5);assert.equal(forecasts,0);
  assert.equal((await engine.read()).week,5);assert.equal(sent.length,2);engine.close();
});
test('a worker unavailable on this browser falls back without changing the week or requiring another tap',async()=>{
  const c=runtime(),sites=Array.from({length:8},(_,i)=>({id:'town'+i,water:true})),state={sites,activeId:'town0',week:4};
  let sent,worker,calls=0;
  const read=c.EarthForecastView.create({state,forecastNext(){calls++;return {week:5,sites};}},
    {url:script,modules:core.map(urlFor),workerFactory:()=>worker={postMessage:m=>sent=m,terminate(){}}});
  const first=read.read();worker.onmessage({data:{sequence:sent.sequence,unavailable:true}});
  assert.equal((await first).week,5);assert.equal(calls,1);assert.equal(state.week,4);read.close();
});
function eightDistricts(context){
  const first=context.CommonEarthSim.create({storage:null});
  assert(first.found({name:'Hobart',lat:-42.88,lon:147.32,region:'Tasmania'}).ok);
  const world=JSON.parse(JSON.stringify(first.state)),original=world.sites[0],pattern=JSON.stringify(original);
  delete world.communityLife;
  world.sites=Array.from({length:8},(_,i)=>{
    const s=JSON.parse(pattern.replaceAll(original.id,'district-'+i));
    delete s.communityLife;s.name='District '+i;s.lon=144+i/10;return s;
  });
  world.activeId=world.sites[0].id;first.destroy();
  return JSON.stringify(world);
}
function workerForGame(Clock=Date){
  // create() supplies a script URL when this helper is passed as a factory.
  const clock=typeof Clock==='function'?Clock:Date;
  const worker=vm.createContext({URL,Date:clock,console,location:{href:script}});
  const bridge={replies:[],terminate(){},postMessage(msg){setImmediate(()=>worker.onmessage({data:msg}));}};
  worker.postMessage=reply=>{bridge.replies.push(reply);bridge.onmessage({data:reply});};
  worker.importScripts=(...urls)=>{for(const url of urls){
    const f=path.basename(new URL(url).pathname);vm.runInContext(fs.readFileSync(path.join(folder,f),'utf8'),worker,{filename:f});
  }};
  vm.runInContext(source,worker);return bridge;
}
test('committing a prepared full turn writes exactly the same world and last-week review as the synchronous path',async()=>{
  const c=runtime(),raw=eightDistricts(c),values=new Map([['common-earth.world.v1',raw]]),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const sim=c.CommonEarthSim.create({storage}),ordinary=c.CommonEarthSim.create({storage:null,snapshot:raw});
  const worker=workerForGame(),preview=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker});
  for(let i=0;i<4;i++){
    assert.equal((await preview.read()).week,sim.state.week+1);
    assert.ok(worker.replies.at(-1).after,'worker supplied a reusable complete turn');
    const prior=sim.state;
    const regular=ordinary.advance(),prepared=sim.advance({usePrepared:true});
    assert.ok(prepared.ok,prepared.message);assert.equal(prepared.message,regular.message);
    assert.notEqual(sim.state,prior,'the command consumed the staged state');
    assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
    const persisted=runtime().EarthWorldStorage.unpack(values.get('common-earth.world.v1'));
    assert.equal(persisted,JSON.stringify(sim.state),'a cold reader opens the exact committed primary, including packed saves');
  }
  preview.close();sim.destroy();ordinary.destroy();
});
test('a same-revision input edit invalidates a staged calendar and preserves the edit on commit',async()=>{
  const c=runtime(),raw=eightDistricts(c),sim=c.CommonEarthSim.create({storage:null,snapshot:raw});
  const worker=workerForGame(),preview=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker});
  await preview.read();
  const prior=sim.state;
  sim.active().food+=7;
  const ordinary=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(sim.state)});
  assert.ok(ordinary.advance().ok);assert.ok(sim.advance({usePrepared:true}).ok);
  assert.equal(sim.state,prior,'a stale preparation reran the ordinary engine in place');
  assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  preview.close();sim.destroy();ordinary.destroy();
});

test('older inland settlements send named lake shores to the worker and expire staged turns when the chart changes',async()=>{
  const c=runtime(),raw=eightDistricts(c),seed=c.CommonEarthSim.create({storage:null,snapshot:raw});
  for(const s of seed.state.sites){s.food=2;delete s.coastal;delete s.lakeShore;}
  const common=JSON.stringify(seed.state),first=seed.state.sites[0];seed.destroy();
  let lake='Lake Ontario';
  c.EarthAtlas={nearOceanShore:()=>false,nearLakeShore:(lat,lon)=>lat===first.lat&&lon===first.lon?lake:''};
  const sim=c.CommonEarthSim.create({storage:null,snapshot:common}),ordinary=c.CommonEarthSim.create({storage:null,snapshot:common}),worker=workerForGame();
  let sent;
  const send=worker.postMessage.bind(worker);worker.postMessage=value=>{sent=value;send(value);};
  const preview=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker});
  assert.equal(c.CommonEarthSim.waterfront(sim.active()),'lake');assert.equal(c.EarthResources.environment(sim.active()),'lakeside');
  await preview.read();assert.ok(sent.shores.includes(first.lat+'/'+first.lon+'|Lake Ontario'));
  assert.ok(worker.replies.at(-1).after);assert.ok(ordinary.advance().ok);assert.ok(sim.advance({usePrepared:true}).ok);
  assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  const inland=sim.state.sites[1];
  await preview.read();const before=sim.state;
  c.EarthAtlas.nearLakeShore=(lat,lon)=>lat===inland.lat&&lon===inland.lon?'Lake Ladoga':lat===first.lat&&lon===first.lon?lake:'';
  assert.ok(sim.advance({usePrepared:true}).ok);assert.equal(sim.state,before,'discovering a second waterbody re-evaluates the ordinary calendar');
  preview.close();sim.destroy();ordinary.destroy();
});

test('an uninterrupted large world resumes the exact detached turn, and edited districts send a fresh snapshot',async()=>{
  const c=runtime(),raw=eightDistricts(c),sim=c.CommonEarthSim.create({storage:null,snapshot:raw});
  const ordinary=c.CommonEarthSim.create({storage:null,snapshot:raw}),worker=workerForGame(),sent=[];
  const deliver=worker.postMessage.bind(worker);worker.postMessage=message=>{sent.push(message);deliver(message);};
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker});
  for(let week=0;week<5;week++){
    if(week===3){
      sim.active().food+=7;ordinary.active().food+=7;
    }
    assert.equal(await forecast.prepareAdvance(),true);
    const request=sent.at(-1);
    if(!week||week===3)assert.equal(typeof request.snapshot,'string');
    else{assert.equal(request.resume,sent.at(-2).sequence);assert.equal(request.snapshot,undefined);}
    assert.ok(ordinary.advance().ok);assert.ok(sim.advance({usePrepared:true}).ok);
    assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  }
  forecast.close();sim.destroy();ordinary.destroy();
});

test('an asynchronous calendar close stays tied to the chosen world, never previews twice after a worker failure',async()=>{
  const c=runtime(),sites=Array.from({length:8},(_,i)=>({id:'town'+i,water:true}));
  const state={sites,activeId:'town0',week:3,actionRevision:4};let message,worker,ordinaryPreviews=0;
  const sim={state,forecastNext(){ordinaryPreviews++;return {week:this.state.week+1};}};
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker={
    postMessage:m=>message=m,terminate(){}}});
  const preparing=forecast.prepareAdvance();
  sim.state={...state,activeId:'town1'};
  worker.onmessage({data:{sequence:message.sequence,forecast:{week:4}}});
  assert.equal(await preparing,false);assert.equal(ordinaryPreviews,0);
  const retry=forecast.prepareAdvance();
  worker.onmessage({data:{sequence:message.sequence,unavailable:true}});
  assert.equal(await retry,true);assert.equal(ordinaryPreviews,0);
  assert.equal(await forecast.prepareAdvance(),true);assert.equal(ordinaryPreviews,0);
  assert.equal((await forecast.read()).week,4);assert.equal(ordinaryPreviews,1);
  forecast.close();
});

test('large saves reopen in separate input tasks and reach the identical district order and complete turn',async()=>{
  const c=runtime(),raw=eightDistricts(c),sim=c.CommonEarthSim.create({storage:null,snapshot:raw});
  const ordinary=c.CommonEarthSim.create({storage:null,snapshot:raw});
  let jobs=0,t=0;c.performance={now(){return t+=4;}};
  c.setTimeout=setTimeout;c.clearTimeout=clearTimeout;
  c.scheduler={postTask(fn){jobs++;return new Promise(resolve=>setImmediate(()=>{fn();resolve();}));}};
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:workerForGame});
  assert.equal(await forecast.prepareAdvance(),true);
  assert.ok(jobs>2,'eight district records were parsed over separate tasks');
  assert.ok(sim.advance({usePrepared:true}).ok);assert.ok(ordinary.advance().ok);
  assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  forecast.close();sim.destroy();ordinary.destroy();
});

test('the next shared week warms once after a close, while ordinary edits still wait for a quiet interval',async()=>{
  const c=runtime(),sim=c.CommonEarthSim.create({storage:null,snapshot:eightDistricts(c)});
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:workerForGame});
  await forecast.prepareAdvance();assert.ok(sim.advance({usePrepared:true}).ok);
  const timers=[],cleared=[];c.document={hidden:false};
  c.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};c.clearTimeout=id=>cleared.push(id);
  forecast.warm();forecast.warm();
  assert.equal(timers.length,1);assert.ok(timers[0].delay<450,'a second manual close can use the previous worker result');
  const site=sim.active();assert.ok(sim.setBuildPlan(site.id,'garden',site.buildPlan||null).ok);
  forecast.warm();assert.equal(timers.length,2);assert.ok(timers[1].delay>=900);assert.deepEqual(cleared,[1]);
  forecast.close();sim.destroy();
});

test('the worker threshold counts independent towns in the regional economy',async()=>{
  const c=runtime(),state={week:3,activeId:'home',sites:[{id:'home',water:true}],
    communityLife:{outposts:Array.from({length:7},(_,i)=>({id:'other-'+i,water:true}))}};
  let sent,worker,forecasts=0;
  const forecast=c.EarthForecastView.create({state,forecastNext(){forecasts++;}},{url:script,modules:core.map(urlFor),
    workerFactory:()=>worker={postMessage:m=>sent=m,terminate(){}}});
  const preparing=forecast.prepareAdvance();assert.ok(sent);assert.equal(forecasts,0);
  worker.onmessage({data:{sequence:sent.sequence,forecast:{week:4}}});
  assert.equal(await preparing,true);forecast.close();
});

test('four founding communities can settle their calendar in the worker',async()=>{
  const c=runtime(),sim=c.CommonEarthSim.create({storage:null});
  assert.ok(sim.found({name:'Cairns',region:'Queensland',lat:-16.92,lon:145.77}).ok);
  assert.equal(sim.state.sites.length+sim.state.communityLife.outposts.length,4);
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:workerForGame});
  const original=sim.state;
  assert.ok(await forecast.prepareAdvance());assert.ok(sim.advance({usePrepared:true}).ok);
  assert.notEqual(sim.state,original);assert.equal(sim.state.week,2);
  forecast.close();sim.destroy();
});
test('a large production round commits the same inventories, development and receipts through the save lock',async()=>{
  class Clock extends Date{static now(){return 1800000000000;}}
  const c=runtime(Clock),raw=eightDistricts(c),key='common-earth.world.v1',values=new Map([[key,raw]]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const sim=c.CommonEarthSim.create({storage}),ordinary=c.CommonEarthSim.create({storage:null,snapshot:raw});
  const worker=workerForGame(Clock),forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>worker});
  const prior=sim.state,site=sim.active(),person=site.residents[0],serial=prior.productionSerial||0;
  assert.ok(await forecast.prepareProduction(serial,()=>true));assert.equal(sim.state,prior);
  assert.ok(ordinary.production(serial,()=>true).ok);assert.ok((await sim.perform('production',serial,()=>true)).ok);
  assert.ok(worker.replies.at(-1).after);assert.equal(sim.state,prior);assert.equal(sim.active(),site);
  assert.equal(sim.active().residents[0],person);assert.equal(sim.state.productionSerial,serial+1);
  assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  const reopened=runtime().CommonEarthSim.create({storage});assert.equal(reopened.state.week,sim.state.week);
  assert.equal(JSON.stringify(reopened.state),JSON.stringify(sim.state));
  forecast.close();sim.destroy();ordinary.destroy();reopened.destroy();
});
test('a worker production receipt cannot supersede a same-revision edit or an expired eligibility check',async()=>{
  class Clock extends Date{static now(){return 1800000000000;}}
  const c=runtime(Clock),sim=c.CommonEarthSim.create({storage:null,snapshot:eightDistricts(c)}),prior=sim.state;
  const forecast=c.EarthForecastView.create(sim,{url:script,modules:core.map(urlFor),workerFactory:()=>workerForGame(Clock)});
  let eligible=true;
  const preparing=forecast.prepareProduction(0,()=>eligible);eligible=false;
  assert.equal(await preparing,false);assert.equal(sim.state.productionSerial||0,0);
  assert.ok(await forecast.prepareProduction(0,()=>true));sim.active().funds+=19;
  const ordinary=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(sim.state)});
  assert.ok(ordinary.production(0,()=>true).ok);assert.ok(sim.production(0,()=>true).ok);
  assert.equal(sim.state,prior,'a direct input edit forced the ordinary in-place path');
  assert.equal(JSON.stringify(sim.state),JSON.stringify(ordinary.state));
  forecast.close();sim.destroy();ordinary.destroy();
});
