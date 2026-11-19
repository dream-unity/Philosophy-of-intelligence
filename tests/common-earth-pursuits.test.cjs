'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const gameDir=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
function setup(){
  let now=1_700_000_000_000;
  class Clock extends Date {static now(){return now;}}
  const world=vm.createContext({Date:Clock,structuredClone});
  world.window=world;
  for(const file of ['construction','dismantling','city','campaigns','legacy','goals','agency','pursuits','simulation'])
    vm.runInContext(fs.readFileSync(path.join(gameDir,file+'.js'),'utf8'),world,{filename:file+'.js'});
  const entries=new Map(),storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
  const open=()=>world.CommonEarthSim.create({key:'world',storage});
  const sim=open();
  ok(sim.found({name:'River Bend',lat:-36,lon:141}));
  return {sim,open,world,tick:ms=>{now+=ms;}};
}
function ok(r){assert.equal(r.ok,true,r.message);return r;}
function request(ctx,sim,action,kind){
  const model=ctx.world.EarthPursuits.view(sim.active());
  return {siteId:model.siteId,generation:model.generation,actorId:model.actorId,serial:model.serial,action,kind};
}
function start(ctx,sim,kind){return sim.pursue(request(ctx,sim,'start',kind));}
function market(ctx,sim){
  return {siteId:sim.active().id,actor:ctx.world.EarthAgency.actorId(sim.active()),mode:'walk',target:'market',
    x:15,y:23,tx:15,ty:23.04};
}
function collect(ctx,sim){return sim.pursue(request(ctx,sim,'collect'),market(ctx,sim));}
function finish(ctx,sim,kind){
  ok(start(ctx,sim,kind));
  ctx.tick(16_000);
  return ok(collect(ctx,sim));
}

test('all three resource paths are payable from an empty, exhausted district and can repeat in the same week',async()=>{
  const ctx=setup(),{sim,open,tick}=ctx,site=sim.active();
  site.funds=site.food=site.materials=sim.state.effort=0;
  for(const kind of ['funds','food','materials']){
    const order=request(ctx,sim,'start',kind);
    ok(await sim.perform('pursue',order));
    assert.equal((await sim.perform('pursue',order)).ok,false);
    assert.equal(collect(ctx,sim).ok,false);
    assert.equal(site[kind],0);
    tick(12_000);ok(collect(ctx,sim));assert.equal(site[kind],2);
    assert.equal(collect(ctx,sim).ok,false);
  }
  finish(ctx,sim,'food');
  assert.equal(site.food,4);assert.equal(sim.state.effort,4);assert.equal(sim.state.week,1);
  const later=open();assert.equal(later.active().food,4);assert.equal(later.state.week,1);
  assert.equal(collect(ctx,later).ok,false);
  later.destroy();sim.destroy();
});

test('a cart made by one character changes later work for others, and refitting trades one advantage for another',()=>{
  const ctx=setup(),{sim,world}=ctx,site=sim.active();
  const [maker,user]=site.residents;
  const scene=()=>({siteId:site.id,actor:world.EarthAgency.actorId(site),mode:'walk',x:14.9,y:22.9});
  ok(sim.changeActor(maker.id,scene()));
  ok(start(ctx,sim,'cart'));const staleClaim=request(ctx,sim,'collect');
  ctx.tick(16_000);ok(sim.changeActor(user.id,scene()));
  assert.equal(sim.pursue(staleClaim).ok,false);
  ok(collect(ctx,sim));assert.equal(site.pursuits.cart.builder,maker.name);
  const outputs=()=>Object.fromEntries(world.EarthPursuits.view(site).choices.map(x=>[x.kind,x.output]));
  assert.equal(outputs().funds,3);assert.equal(outputs().materials,3);assert.equal(outputs().food,3);
  finish(ctx,sim,'baskets');assert.equal(outputs().food,4);assert.equal(outputs().materials,3);
  const food=site.food;finish(ctx,sim,'food');assert.equal(site.food,food+4);
  finish(ctx,sim,'rack');assert.equal(outputs().materials,4);assert.equal(outputs().food,3);
  const metal=site.materials;finish(ctx,sim,'materials');assert.equal(site.materials,metal+4);
  assert.equal(start(ctx,sim,'rack').ok,false);assert.equal(start(ctx,sim,'cart').ok,false);
  assert.ok(world.CommonEarthSim.readSave(JSON.stringify(sim.state)));sim.destroy();
});

test('a voluntary supplier visit needs the correct person and proximity; the extra load is earned once and collected at the end',()=>{
  const ctx=setup(),{sim,world}=ctx,s=sim.active(),before=s.materials;
  ok(start(ctx,sim,'materials'));
  const ticket=world.EarthPursuits.view(s).ticket;
  const meeting={siteId:s.id,actor:'steward',target:ticket.supplier.id,mode:'walk',x:2,y:2,tx:2.8,ty:2.1};
  const pickup=details=>sim.pursue(request(ctx,sim,'pickup'),details);
  assert.equal(pickup({...meeting,tx:8}).ok,false);
  assert.equal(pickup({...meeting,target:s.residents[0].id}).ok,false);
  assert.equal(pickup({...meeting,actor:s.residents[0].id}).ok,false);
  ok(pickup(meeting));assert.equal(pickup(meeting).ok,false);
  assert.equal(s.materials,before);assert.equal(collect(ctx,sim).ok,false);
  ctx.tick(4000);ok(collect(ctx,sim));assert.equal(s.materials,before+3);
  assert.match(sim.state.journal[0].text,new RegExp(ticket.supplier.name));
  sim.destroy();
});

test('elapsed jobs survive a save, settle once, and can be released without losing their reserved materials',()=>{
  const ctx=setup(),{sim,open,tick}=ctx,stock=sim.active().materials;
  ok(start(ctx,sim,'cart'));assert.equal(sim.active().materials,stock-2);
  sim.destroy();const second=open(),other=open();
  const release=request(ctx,second,'release');
  ok(second.pursue(release));assert.equal(second.active().materials,stock);
  assert.equal(other.pursue(release).ok,false);assert.equal(other.active().materials,stock);
  ok(start(ctx,second,'food'));tick(15*86400_000);
  const payment=request(ctx,second,'collect');
  ok(second.pursue(payment,market(ctx,second)));
  assert.equal(other.pursue(payment,market(ctx,other)).ok,false);
  assert.equal(other.pursue(payment,market(ctx,other)).ok,false);
  assert.equal(other.active().food,second.active().food);
  assert.equal(second.state.week,1);
  second.destroy();other.destroy();
});

test('an overfull store retains a reserved cart refund and a finished load until there is room',()=>{
  const ctx=setup(),{sim}=ctx,s=sim.active(),max=Number.MAX_SAFE_INTEGER;
  ok(start(ctx,sim,'cart'));s.materials=max-1;
  const refund=request(ctx,sim,'release'),blocked=sim.pursue(refund);
  assert.equal(blocked.ok,false);assert.match(blocked.message,/finish the handcart/);
  assert.equal(s.materials,max-1);assert.equal(s.pursuits.ticket.kind,'cart');
  s.materials=max-2;ok(sim.pursue(refund));assert.equal(s.materials,max);
  ok(start(ctx,sim,'food'));ctx.tick(15_000);s.food=max-1;
  assert.equal(collect(ctx,sim).ok,false);assert.equal(s.food,max-1);assert.equal(s.pursuits.ticket.kind,'food');
  s.food=max-2;ok(collect(ctx,sim));assert.equal(s.food,max);assert.equal(s.pursuits.ticket,null);sim.destroy();
});

test('market collection and supplier handovers sample position under the save lock and keep a rejected job intact',async()=>{
  const ctx=setup(),{sim,world}=ctx,s=sim.active(),initial=s.funds;
  ok(start(ctx,sim,'funds'));
  const helper=world.EarthPursuits.view(s).ticket.supplier;
  let near={...market(ctx,sim),target:helper.id,tx:12,ty:21,x:12.3,y:21};
  let enter,reads=0;
  world.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{enter=()=>resolve(run());})}};
  const requestNear=action=>sim.perform('pursue',request(ctx,sim,action),()=>{reads++;return near;});
  const pickup=requestNear('pickup');assert.equal(reads,0);
  near={...near,x:23};enter();assert.equal((await pickup).ok,false);assert.equal(reads,1);
  assert.equal(s.pursuits.ticket.helper,undefined);
  near={...near,x:12.3};const retry=requestNear('pickup');enter();ok(await retry);
  ctx.tick(4000);near=market(ctx,sim);
  const distant=requestNear('collect');near={...near,mode:'boat'};enter();assert.equal((await distant).ok,false);
  const hidden=requestNear('collect');near=null;enter();assert.equal((await hidden).ok,false);
  assert.equal(s.funds,initial);assert(s.pursuits.ticket);
  assert.equal(sim.pursue(request(ctx,sim,'collect')).ok,false,'a stale or omitted market event is insufficient');
  const tooFar=sim.pursue(request(ctx,sim,'collect'),{...market(ctx,sim),y:2});
  assert.equal(tooFar.ok,false);
  const newActor=s.residents[1].id;delete world.navigator;
  ok(sim.changeActor(newActor,{siteId:s.id,actor:'steward',mode:'walk',x:16,y:19}));
  ok(collect(ctx,sim));assert.equal(s.funds,initial+3);assert.equal(s.pursuits.ticket,null);
  sim.destroy();
});

test('the zero-effort food commitment and the last-effort building deficit both point to executable personal work',()=>{
  const ctx=setup(),{sim,world}=ctx,s=sim.active();
  sim.state.effort=0;s.food=s.funds=s.materials=0;
  ok(sim.beginGoal(s.id,'food','trust',1));const advice=world.EarthGoals.nextStep(sim);
  assert.equal(advice.kind,'personalWork');assert.equal(advice.resource,'food');
  while(world.EarthGoals.nextStep(sim).kind!=='week' && s.food<16)finish(ctx,sim,'food');
  assert.equal(world.EarthGoals.nextStep(sim).kind,'week');
  ok(sim.advance());assert.match(world.EarthGoals.summary(sim.state).history[0].aim.status,/Target reached/);
  sim.state.effort=2;s.funds=s.materials=0;
  ok(sim.beginGoal(s.id,'housing','trust',2));const next=world.EarthGoals.nextStep(sim);
  assert.equal(next.kind,'personalWork');assert.ok(['funds','materials'].includes(next.resource));
  sim.destroy();
});

test('a one-point bond commitment can earn food and share it in person after the weekly effort runs out',()=>{
  const ctx=setup(),{sim,world}=ctx,s=sim.active(),p=s.residents[0];
  p.bond=9;p.heard=true;p.lastTalk=1;s.food=sim.state.effort=0;
  s.delivery={residentId:s.residents[1].id,week:1};
  ok(sim.beginGoal(s.id,'bond:'+p.id,'trust',1));
  assert.equal(world.EarthGoals.nextStep(sim).kind,'personalWork');
  finish(ctx,sim,'food');const next=world.EarthGoals.nextStep(sim);
  assert.equal(next.page,'meal');assert.equal(next.residentId,p.id);
  const meeting={siteId:s.id,actor:'steward',target:p.id,mode:'walk',x:3,y:4,tx:3.3,ty:4.2};
  ok(sim.converse(p.id,'meal',meeting));
  assert.ok(world.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  assert.equal(p.bond,10);assert.equal(world.EarthGoals.nextStep(sim).kind,'week');sim.destroy();
});

test('a commission checks reserves after household consumption and offers a usable job before its review',()=>{
  const ctx=setup(),{sim,world}=ctx,s=sim.active();
  s.commission={key:'melbourne',phase:'trial',choice:'stock',due:2};
  s.food=8;s.population=35;s.specialty='materials';sim.state.effort=0;
  assert.equal(world.EarthCampaigns.summary(sim.state,s).conditionMet,true);
  assert.equal(sim.forecastNext().sites[0].commissionSupported,false);
  const guide=world.EarthLegacy.guidance(sim);assert.equal(guide.kind,'personalWork');assert.equal(guide.resource,'food');
  while(!sim.forecastNext().sites[0].commissionSupported && s.food<24)finish(ctx,sim,'food');
  assert.equal(world.EarthLegacy.guidance(sim).kind,'week');
  ok(sim.advance());assert.equal(s.commission.supported,true);sim.destroy();
});

test('a stale district or actor cannot reassign a ticket and malformed ticket data does not enter imported worlds',()=>{
  const ctx=setup(),{sim,world}=ctx;
  const old=request(ctx,sim,'start','food');
  ok(sim.manageSite(sim.active().id,'restart'));assert.equal(sim.pursue(old).ok,false);
  ok(start(ctx,sim,'food'));
  const good=JSON.stringify(sim.state);
  for(const bad of [
    work=>{work.ticket.kind='__proto__';},work=>{work.ticket.started=-1;},work=>{work.ticket.maker='';},
    work=>{work.serial=0;},work=>{work.cart={builder:'Yes',fixture:'invalid'};}
  ]){
    const data=JSON.parse(good);bad(data.sites[0].pursuits);
    assert.equal(world.CommonEarthSim.readSave(JSON.stringify(data)),null);
  }
  const oldWorld=JSON.parse(good);delete oldWorld.sites[0].pursuits;
  assert.ok(world.CommonEarthSim.readSave(JSON.stringify(oldWorld)));sim.destroy();
});
