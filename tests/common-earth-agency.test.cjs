'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const root=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const runtime=vm.createContext({});runtime.window=runtime;
for(const name of ['shifts','construction','legacy','agency','simulation']){
  vm.runInContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
}
function town(){
  const sim=runtime.CommonEarthSim.create({storage:null});
  assert.ok(sim.found({lat:-6.16,lon:39.19,name:'Stone Town',water:false}).ok);
  return sim;
}
const scene=(site,actor)=>({siteId:site.id,actor,mode:'walk',x:13,y:12});
const contact=(site,actor,target)=>({...scene(site,actor),tx:13.8,ty:12,target});
test('resident handoffs preserve shared effort, return former residents to work from their last location and survive export',()=>{
  const sim=town(),s=sim.active(),[a,b]=s.residents;
  const stores=[s.food,s.funds,s.materials],effort=sim.state.effort;
  assert.ok(sim.changeActor(a.id,scene(s,'steward')).ok);
  assert.equal(runtime.EarthConstruction.workerRole(s,sim.state,a.id).activity,'busy');
  assert.ok(!sim.act('listen:'+a.id).ok);
  assert.ok(!sim.beginShift(a.id).ok);
  assert.ok(sim.setWorkPreference(a.id,'food').ok);
  assert.ok(!sim.changeActor(b.id,scene(s,'steward')).ok);
  assert.ok(!sim.changeActor(b.id,{...scene(s,a.id),mode:'boat'}).ok);
  assert.ok(sim.changeActor(b.id,scene(s,a.id)).ok);
  assert.deepEqual([s.workforce.members[a.id].position.x,s.workforce.members[a.id].position.y],[13,12]);
  assert.equal(runtime.EarthConstruction.workerRole(s,sim.state,a.id).activity,'returning');
  assert.deepEqual([s.food,s.funds,s.materials],stores);
  assert.equal(sim.state.effort,effort);
  const saved=runtime.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert.equal(saved.sites[0].agency.actor,b.id);
  assert.ok(sim.changeActor('steward',scene(s,b.id)).ok);
  assert.equal(runtime.EarthAgency.actor(s),null);
});
test('face-to-face speech has no effort or weekly gate and sharing a meal belongs to its actual sender and recipient',()=>{
  const sim=town(),s=sim.active(),[a,b]=s.residents;
  assert.ok(sim.changeActor(a.id,scene(s,'steward')).ok);
  sim.state.effort=0;
  const pose=contact(s,a.id,b.id);
  for(const bad of [null,{...pose,mode:'boat'},{...pose,tx:20},{...pose,actor:'steward'},contact(s,a.id,'walker-3')]){
    assert.ok(!sim.converse(b.id,'meal',bad).ok);
  }
  const food=s.food,well=s.wellbeing,bond=b.bond,version=sim.state.actionRevision;
  for(const [id,topic] of [[b.id,'news'],[b.id,'work'],['walker-4','work'],['driver','news'],['steward','news']]){
    assert.ok(sim.converse(id,topic,contact(s,a.id,id)).ok);
  }
  assert.ok(sim.converse('steward','work',contact(s,a.id,'steward')).message.includes('stores'));
  assert.equal(sim.state.actionRevision,version,'casual conversation should not write a whole save');
  assert.ok(sim.converse(b.id,'meal',pose).ok);
  assert.deepEqual([s.food,s.wellbeing,b.bond,sim.state.effort],[food-1,well+1,bond+1,0]);
  assert.ok(!sim.converse(b.id,'meal',pose).ok);
  assert.ok(sim.converse(b.id,'news',pose).message.includes(a.name));
  assert.ok(sim.changeActor(b.id,scene(s,a.id)).ok);
  assert.ok(sim.converse(a.id,'news',contact(s,b.id,a.id)).message.includes('share that meal with you'));
  const copy=runtime.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert.equal(copy.sites[0].agency.meals[0].to,b.id);
});
test('previous community saves remain valid and corrupt agency selections are rejected',()=>{
  const sim=town(),s=sim.active(),raw=JSON.parse(JSON.stringify(sim.state));
  assert.ok(!Object.hasOwn(s,'agency'));
  assert.ok(runtime.CommonEarthSim.readSave(JSON.stringify(raw)));
  raw.sites[0].agency={actor:'someone-else',meals:[]};
  assert.equal(runtime.CommonEarthSim.readSave(JSON.stringify(raw)),null);
});

test('outlook and parcel delivery choose other people and make an explicit handoff actionable when a goal requires the current character',()=>{
  const sim=town(),s=sim.active(),[a,b]=s.residents;
  assert.ok(sim.changeActor(a.id,scene(s,'steward')).ok);
  const before=JSON.stringify(sim.state),step=runtime.EarthLegacy.guidance(sim);
  assert.equal(step.residentId,b.id);
  assert.equal(JSON.stringify(sim.state),before);
  sim.state.effort=0;
  assert.equal(runtime.EarthLegacy.guidance(sim).kind,'week');
  assert.equal(runtime.EarthLegacy.prepareStep(sim,{kind:'resident',residentId:a.id,siteId:s.id}).kind,'actor');
  sim.state.effort=1;
  assert.ok(sim.act('courier:pick').ok);
  assert.equal(s.delivery.residentId,b.id);
  assert.ok(sim.changeActor(b.id,scene(s,a.id)).ok);
  assert.ok(!sim.act('courier:deliver:'+b.id).ok);
  assert.ok(sim.changeActor(a.id,scene(s,b.id)).ok);
  assert.ok(sim.act('courier:deliver:'+b.id).ok);
  assert.equal(sim.state.journal[0].actorId,a.id);
  assert.ok(sim.state.journal[0].text.includes(a.name));
});

test('a queued conversation rechecks the two people when it acquires the save lock',async()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const sim=runtime.CommonEarthSim.create({storage});
  assert.ok(sim.found({lat:1,lon:2,name:'Bay',water:false}).ok);
  const site=sim.active(),target=site.residents[0].id,food=site.food;
  let enter,meeting=contact(site,'steward',target);
  runtime.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{enter=()=>resolve(run());})}};
  try{
    const pending=sim.perform('converse',target,'meal',()=>meeting);
    meeting=null;
    enter();
    assert.equal((await pending).ok,false);
    assert.equal(site.food,food);
  }finally{delete runtime.navigator;}
});

test('switching during a shared shift previews its consequences and closes it in one confirmed action',()=>{
  const sim=town(),s=sim.active(),[a,b]=s.residents,initial=sim.state.effort;
  assert.ok(sim.beginShift(a.id).ok);
  const before=JSON.stringify(sim.state),where={...scene(s,'steward'),companion:{residentId:a.id,x:12.5,y:12.2}};
  const review=sim.changeActor(a.id,where);
  assert.ok(review.finishQuote);assert.equal(JSON.stringify(sim.state),before);
  assert.ok(!sim.changeActor(b.id,where,review.finishQuote).ok);
  assert.equal(JSON.stringify(sim.state),before);
  assert.ok(sim.changeActor(a.id,where,review.finishQuote).ok);
  assert.equal(s.shift,null);assert.equal(sim.state.effort,initial);
  assert.equal(s.agency.actor,a.id);
  assert.equal(s.workforce.members[a.id].position.x,12.5);
  assert.equal(runtime.CommonEarthSim.readSave(JSON.stringify(sim.state)).sites[0].agency.actor,a.id);
});

test('two views of the same world agree who can work after a walking resident leaves and resumes a district',()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const sim=runtime.CommonEarthSim.create({storage});
  assert.ok(sim.found({lat:1,lon:2,name:'Bay',water:false}).ok);
  const harbour=sim.active(),[a,b]=harbour.residents;
  assert.ok(sim.act('listen:'+a.id).ok);assert.ok(sim.act('listen:'+b.id).ok);
  assert.ok(sim.changeActor(a.id,scene(harbour,'steward')).ok);
  const otherTab=runtime.CommonEarthSim.create({storage});
  const departure={...scene(harbour,a.id),x:6,y:12};
  assert.ok(sim.found({lat:2,lon:3,name:'Hills',water:false},undefined,'later',harbour.id,departure).ok);
  otherTab.sync();
  assert.equal(otherTab.active().id,harbour.id);
  assert.notEqual(sim.active().id,harbour.id);
  for(const engine of [sim,otherTab]){
    const home=engine.state.sites.find(s=>s.id===harbour.id),worker=runtime.EarthConstruction.workerRole(home,engine.state,a.id);
    assert.equal(home.agency.actor,'steward');assert.equal(home.agency.returningActor,a.id);
    assert.equal(worker.x,6);assert.equal(worker.y,12);assert.equal(worker.activity,'returning');
  }
  const restored=runtime.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert.equal(restored.sites[0].agency.returningActor,a.id);
  assert.ok(sim.visit(harbour.id).ok);otherTab.sync();
  assert.equal(sim.active().agency.actor,a.id);assert.equal(sim.active().agency.returningActor,undefined);
  assert.equal(runtime.EarthConstruction.workerRole(otherTab.active(),otherTab.state,a.id).activity,'busy');
});
test('leaving and re-entering Street while a character selection is queued invalidates that choice',async()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  const sim=runtime.CommonEarthSim.create({storage});
  assert.ok(sim.found({lat:1,lon:2,name:'Bay',water:false}).ok);
  const site=sim.active(),id=site.residents[0].id;
  const field=()=>({options:[],addEventListener(key,func){this[key]=func;},replaceChildren(...options){this.options=options;}});
  const elements={'street-actor':field(),'street-actor-role':field(),'actor-role-label':field()};
  const context=vm.createContext({document:{getElementById:id=>elements[id]}});context.window=context;
  context.EarthAgency=runtime.EarthAgency;context.EarthConstruction=runtime.EarthConstruction;
  vm.runInContext(fs.readFileSync(path.join(root,'agency-ui.js'),'utf8'),context);
  let version=0,entered,refreshed=0;
  const local={getState:()=>scene(site,'steward'),setSite:()=>{}};
  context.EarthAgencyUI.mount({sim,street:()=>local,version:()=>version,node:()=>({}),onResult:r=>r.ok,refresh:()=>refreshed++,resetEncounter:()=>{}});
  runtime.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{entered=()=>resolve(run());})}};
  try{
    elements['street-actor'].value=id;
    const pending=elements['street-actor'].change();
    version++;entered();await pending;
    assert.equal(runtime.EarthAgency.actor(site),null);
    assert.equal(elements['street-actor'].disabled,false);
    assert.equal(refreshed,0);
  }finally{delete runtime.navigator;}
});
test('a queued named parcel delivery cannot pay out once its in-person visit has ended',async()=>{
  const sim=town(),s=sim.active();
  assert.ok(sim.act('courier:pick').ok);
  const id=s.delivery.residentId,before=JSON.stringify(sim.state);
  assert.ok(!sim.act('courier:deliver:'+id,undefined,'work',()=>false).ok);
  assert.equal(JSON.stringify(sim.state),before);
  assert.ok(sim.act('courier:deliver:'+id,undefined,'work',()=>true).ok);
});
