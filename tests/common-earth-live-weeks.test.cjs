'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const game=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function runtime(files){
  const c=vm.createContext({structuredClone,setTimeout,clearTimeout,performance});c.window=c;
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(game,f+'.js'),'utf8'),c,{filename:f+'.js'});
  return c;
}
function scheduler(){
  let t=0,serial=0;const tasks=new Map();
  return {now:()=>t,later(fn,delay){const id=++serial;tasks.set(id,{fn,due:t+delay});return id;},cancel:id=>tasks.delete(id),
    count:()=>tasks.size,jump:ms=>t+=ms,async wait(ms){
      const target=t+ms;
      while(true){
        const next=[...tasks.entries()].sort((a,b)=>a[1].due-b[1].due).find(e=>e[1].due<=target);
        if(!next)break;
        tasks.delete(next[0]);t=Math.max(t,next[1].due);next[1].fn();await Promise.resolve();await Promise.resolve();
      }
      t=target;await Promise.resolve();await Promise.resolve();
    }};
}
function fixture(queued=false){
  const w=runtime(['live-weeks']),time=scheduler(),state={siteId:'bay',actorId:'steward',generation:1,week:6,actionRevision:9,hold:''};
  let grant,latest,n=0,notices=0;
  function advance(quote,proof){
    const run=()=>{if(!proof()||quote.week!==state.week)return {ok:false,message:'stale'};
      n++;state.week++;state.actionRevision++;return {ok:true,message:'Week '+state.week};};
    return queued?new Promise(resolve=>{grant=()=>resolve(run());}):Promise.resolve(run());
  }
  const clock=w.EarthLiveWeeks.create({read:()=>({...state}),advance,paint:s=>{latest=s;},notice:()=>notices++,...time});
  return {clock,state,time,grant:()=>grant(),count:()=>n,notices:()=>notices,display:()=>latest};
}
test('live weeks begin in manual mode, spend at least two visible minutes per week, and never run hidden catch-up',async()=>{
  const g=fixture(),{clock,state,time}=g;clock.update({force:true});assert(!clock.enabled());assert.equal(time.count(),0);
  await time.wait(8*3600000);assert.equal(g.count(),0);
  clock.start();await time.wait(75000);assert.equal(g.display().seconds,45);
  state.hold='Return to this browser tab.';clock.update();const held=g.display().seconds;assert.equal(time.count(),0);
  await time.wait(4*3600000);state.hold='';clock.update({discard:true});assert.equal(g.display().seconds,held);
  await time.wait(held*1000-1);assert.equal(g.count(),0);await time.wait(1);assert.equal(g.count(),1);
  assert.equal(g.display().nextWeek,8);assert.equal(g.display().seconds,120);await time.wait(120000);assert.equal(g.count(),2);
  clock.pause();assert.equal(time.count(),0);
});
test('travel, conversation and explicit pause preserve the remaining time; changing the shared week resets it',async()=>{
  const g=fixture(),{clock,state,time}=g;clock.start();await time.wait(43000);
  state.hold='Finish the conversation.';clock.update();assert.equal(g.display().seconds,77);await time.wait(400000);
  state.hold='Finish the journey.';clock.update();await time.wait(180000);assert.equal(g.count(),0);
  state.hold='';clock.update();await time.wait(2000);clock.pause();assert.equal(g.display().seconds,75);await time.wait(460000);
  clock.start();await time.wait(50000);state.week++;state.actionRevision++;clock.update();assert.equal(g.display().seconds,120);
  await time.wait(119999);assert.equal(g.count(),0);await time.wait(1);assert.equal(g.count(),1);
});
test('a save-lock delay is invalidated by a conversation, a character change, or pausing even if eligibility subsequently returns',async()=>{
  for(const change of ['conversation','actor','pause']){
    const g=fixture(true),{clock,state,time}=g;clock.start();await time.wait(120000);assert(g.display().pending);
    if(change==='conversation'){state.hold='Finish the conversation.';clock.update();state.hold='';clock.update();}
    if(change==='actor'){state.actorId='walker-0';clock.update();}
    if(change==='pause'){clock.pause();clock.start();}
    g.grant();await Promise.resolve();await Promise.resolve();assert.equal(g.count(),0);
    assert.equal(g.display().seconds,120);assert(!g.display().pending);clock.pause();
  }
});
test('manual play still works when shared clocks cannot be coordinated, and explicit deadlines pause only Live weeks',async()=>{
  const c=runtime(['shifts','agency','simulation']),map=new Map(),disk={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const sim=c.CommonEarthSim.create({storage:disk});assert(sim.found({lat:3,lon:14,name:'Bay',water:false}).ok);
  const quote=()=>({live:{siteId:sim.active().id,generation:sim.active().foundingRevision,actorId:'steward',week:sim.state.week,actionRevision:sim.state.actionRevision}});
  assert.match(sim.liveWeekHold(),/between saved-world tabs/);assert(!(await sim.perform('advance',quote(),()=>true)).ok);assert((await sim.perform('advance')).ok);
  c.navigator={locks:{request:(_key,fn)=>Promise.resolve(fn())}};
  const p=sim.active().residents[0];assert(sim.beginShift(p.id,()=>true).ok);
  assert.match(sim.liveWeekHold(),/Finish the accompanied shift/);assert(!(await sim.perform('advance',quote(),()=>true)).ok);
  assert((await sim.perform('advance')).ok);sim.destroy();
});
test('two saved tabs quoting the same week share one automatic advance, and a stale manual/auto race cannot spend the next week',async()=>{
  const c=runtime(['shifts','agency','simulation']),map=new Map(),disk={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},queue=[];
  c.navigator={locks:{request:(_key,fn)=>new Promise(resolve=>queue.push(()=>resolve(fn())))}};
  const a=c.CommonEarthSim.create({storage:disk});assert(a.found({lat:3,lon:14,name:'Bay',water:false}).ok);
  const b=c.CommonEarthSim.create({storage:disk}),w=a.state.week,site=a.active(),quote={live:{siteId:site.id,actorId:'steward',generation:site.foundingRevision,week:w,actionRevision:a.state.actionRevision}};
  const pa=a.perform('advance',quote,()=>true),pb=b.perform('advance',quote,()=>true);queue.shift()();queue.shift()();
  assert((await pa).ok);assert(!(await pb).ok);assert.equal(a.state.week,w+1);assert.equal(b.state.week,w+1);
  const stale=b.perform('advance',quote,()=>true);queue.shift()();assert(!(await stale).ok);assert.equal(b.state.week,w+1);
  a.destroy();b.destroy();
});

test('a restored town runs by default while deliberate pauses survive older tab saves and newer stored preferences',()=>{
  const {enabledOnReturn}=runtime(['live-weeks']).EarthLiveWeeks;
  assert.equal(enabledOnReturn(null,undefined),true);
  assert.equal(enabledOnReturn(null,true),true);
  assert.equal(enabledOnReturn(null,false),false);
  assert.equal(enabledOnReturn('manual',true),false);
  assert.equal(enabledOnReturn('live',false),true);
});
