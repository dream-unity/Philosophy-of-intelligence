'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const source=['neighbours','voyages','shifts','campaigns','strategy','partners','city','legacy','goals','construction','dismantling','personas','careers','autonomy','agency','fisheries','pursuits','simulation'];
function engine(context={}){
  const runtime=vm.createContext(context);runtime.window=runtime;
  for(const file of source)vm.runInContext(fs.readFileSync(path.join(directory,file+'.js'),'utf8'),runtime,{filename:file+'.js'});
  return runtime;
}
function storage(){
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
function town(runtime,store=null){
  const sim=runtime.CommonEarthSim.create({storage:store});
  if(!sim.active())assert.ok(sim.found({name:'Port Melbourne',region:'Victoria',lat:-37.84,lon:144.92,water:false}).ok);
  return sim;
}
function command(runtime,sim,id,profession,action){
  const site=sim.active(),actorId=runtime.EarthAgency.actorId(site);
  const model=runtime.EarthCareers.view(sim.state,site,id,profession,{speakerId:actorId});
  const choice=model.choices.find(c=>c.id===action);
  assert.ok(choice?.available,choice?.reason||action);
  return {domain:'career',action,targetId:profession,expectedRevision:choice.expectedRevision,coverId:choice.coverId,
    week:sim.state.week,siteId:site.id,generation:site.foundingRevision||0,actorId};
}
function scene(site,actor,target){return {siteId:site.id,actor,target,mode:'walk',x:5,y:6,tx:5.5,ty:6};}
const plain=value=>JSON.parse(JSON.stringify(value));
function termQuote(sim,actorId){
  const site=sim.active(),quote=sim.courseCalendar(actorId);
  return {siteId:site.id,actorId,generation:site.foundingRevision||0,week:sim.state.week,...quote};
}
test('first career activity in an existing town persists without replacing anyone or their earlier relationships',async()=>{
  const runtime=engine(),store=storage(),first=town(runtime,store),legacy=plain(first.state);
  const resident=legacy.sites[0].residents[1],id=resident.id;
  assert.equal(legacy.sites[0].careers,undefined);
  const founderName=resident.name;
  legacy.sites[0].residents[1].bond=3;
  first.destroy();store.setItem('common-earth.world.v1',JSON.stringify(legacy));
  const sim=town(runtime,store),site=sim.active();
  assert.equal(runtime.EarthPersonas.profile(site,id).name,founderName);
  assert.ok(sim.changeActor(id,scene(site,'steward',id)).ok);
  const before=runtime.EarthCareers.view(sim.state,site,id,'musician').skills.music;
  const req=command(runtime,sim,id,'musician','practice');
  assert.ok((await sim.perform('lifeAction',id,req,()=>scene(site,id))).ok);
  assert.equal((await sim.perform('lifeAction',id,req,()=>scene(site,id))).ok,false);
  sim.destroy();
  const reopened=town(runtime,store);
  const info=runtime.EarthCareers.view(reopened.state,reopened.active(),id,'musician');
  assert.equal(reopened.active().residents[1].bond,3);
  assert.equal(info.name,founderName);assert.ok(info.skills.music>before);assert.equal(info.fits,false);
  assert.equal(runtime.EarthCareers.view(reopened.state,reopened.active(),id,'mathematician').fits,true);
});
test('the original NPC must still be physically present after waiting on another browser tab',async()=>{
  let enter;
  const runtime=engine({navigator:{locks:{request:(_key,fn)=>new Promise(resolve=>{enter=()=>resolve(fn());})}}});
  const sim=town(runtime,storage()),s=sim.active(),id='walker-0',req=command(runtime,sim,id,'refuse','practice');
  let pose=scene(s,'steward',id);
  const pending=sim.perform('lifeAction',id,req,()=>pose);
  pose={...pose,target:'walker-1'};enter();
  assert.equal((await pending).ok,false);assert.equal(s.careers,undefined);
  pose=scene(s,'steward',id);
  const present=sim.perform('lifeAction',id,req,()=>pose);enter();assert.ok((await present).ok);
  assert.deepEqual(Object.keys(s.careers),[id]);
});
test('study terms advance the same week-by-week world, preserve forecasts, and stop for another person’s promise',async()=>{
  const runtime=engine(),store=storage(),sim=town(runtime,store),s=sim.active(),actor='steward',friend=s.residents[0];
  assert.ok(sim.act('listen:'+friend.id).ok);
  assert.ok(sim.act('promise:'+friend.id).ok);
  assert.ok(sim.lifeAction(actor,command(runtime,sim,actor,'nurse','enroll'),scene(s,actor)).ok);
  const controlStore=storage();controlStore.setItem('common-earth.world.v1',JSON.stringify(sim.state));
  const reference=town(runtime,controlStore),opening=JSON.stringify(sim.state);
  const quote=termQuote(sim,actor);
  assert.equal(quote.weeks,2);assert.match(quote.reason,/promise/);assert.equal(JSON.stringify(sim.state),opening);
  for(let i=0;i<quote.weeks;i++){
    const predicted=reference.forecastNext();
    assert.ok(reference.advance().ok);
    assert.deepEqual(plain(reference.lastWeek().sites[0].closing),plain(predicted.sites[0].closing));
  }
  assert.ok((await sim.perform('studyTerm',actor,quote,()=>scene(s,actor))).ok);
  assert.deepEqual(plain(sim.active()),plain(reference.active()));
  assert.deepEqual(plain(sim.lastWeek()),plain(reference.lastWeek()));
  assert.equal(sim.courseCalendar(actor).available,false);
  assert.ok(sim.active().residents[0].promise);
  assert.ok(runtime.CommonEarthSim.readSave(JSON.stringify(sim.state)));
});
test('reviewed terms are invalidated by new work or a new learner, and stop at graduation',()=>{
  const runtime=engine(),sim=town(runtime),s=sim.active(),id='steward';
  assert.ok(sim.lifeAction(id,command(runtime,sim,id,'refuse','enroll'),scene(s,id)).ok);
  const initial=termQuote(sim,id);
  assert.ok(sim.act('work:salvage').ok);
  const sameWeek=sim.state.week;
  assert.equal(sim.studyTerm(id,initial,scene(s,id)).ok,false);assert.equal(sim.state.week,sameWeek);
  const valid=termQuote(sim,id);
  assert.equal(sim.studyTerm(id,valid,scene(s,s.residents[0].id)).ok,false);
  assert.equal(valid.weeks,3);
  assert.ok(sim.studyTerm(id,valid,scene(s,id)).ok);
  assert.equal(sim.active().careers[id].qualifications.refuse,sim.state.week);
  assert.equal(sim.courseCalendar(id).available,false);
});
test('a learner abroad pauses at a promise in the original community',()=>{
  const runtime=engine(),sim=town(runtime),home=sim.active();
  for(const resident of home.residents.slice(0,2))assert.ok(sim.act('listen:'+resident.id).ok);
  assert.ok(sim.act('promise:'+home.residents[0].id).ok);
  assert.ok(sim.found({name:'Hill Outpost',lat:23,lon:9,water:false},'Hill Outpost').ok);
  const college=sim.active(),id='steward';
  assert.notEqual(college.id,home.id);
  assert.ok(sim.lifeAction(id,command(runtime,sim,id,'nurse','enroll'),scene(college,id)).ok);
  const proposal=termQuote(sim,id);
  assert.equal(proposal.weeks,2);assert.ok(proposal.reason.includes(home.name));
  assert.ok(sim.studyTerm(id,proposal,scene(college,id)).ok);
  assert.equal(sim.courseCalendar(id).weeks,0);
  assert.ok(sim.state.sites.find(s=>s.id===home.id).residents[0].promise);
  assert.equal(sim.active().careers[id].training.credits,2);
});
