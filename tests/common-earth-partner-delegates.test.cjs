'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const browser = vm.createContext({});
browser.window = browser;
for (const name of ['partners','simulation']) vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),browser,{filename:name+'.js'});
const ok = result => assert.equal(result.ok,true,result.message);
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(){
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const open=()=>browser.CommonEarthSim.create({storage,key:'partner-test'});
  const sim=open();ok(sim.found({name:'Home',lat:1,lon:74,water:false}));
  return {sim,open};
}
const partner=(sim,id,home=sim.active())=>browser.EarthPartners.get(sim.state,home,id);
function week(sim){
  const before=JSON.stringify(sim.state),forecast=sim.forecastNext();
  assert.equal(JSON.stringify(sim.state),before,'reading the forecast cannot teach a session');
  ok(sim.advance());
  for(const row of forecast.sites){
    const site=sim.state.sites.find(s=>s.id===row.id);
    for(const [key,value] of Object.entries(row.closing))assert.equal(site[key],value);
  }
}

test('delegates have distinct global identities and protect different reserves when negotiating',()=>{
  const {sim}=fixture(),home=sim.active();
  ok(sim.found({name:'Neighbour',lat:45,lon:12,water:false}));
  const delegates=browser.EarthPartners.list(sim.state,home);
  for(const field of ['id','personality','strength','nextRole'])assert.equal(new Set(delegates.map(d=>d.person[field])).size,6);
  for(const d of delegates)assert.deepEqual(plain(d.person),plain(partner(sim,d.partnerId).person));
  week(sim);
  for(const key of ['tidebench','shelf']){
    const s=sim.state.partners[key],p=partner(sim,key);s.met=true;s.standing=2;s.stock=p.reserve+4;s.inputs=3;
  }
  ok(sim.act('partner:tidebench:ask'));assert.equal(partner(sim,'tidebench').offer.kind,'counter');
  ok(sim.act('partner:shelf:ask'));assert.equal(partner(sim,'shelf').offer.kind,'bulk');
  ok(sim.act('partner:tidebench:sign'));assert.equal(partner(sim,'tidebench').agreement.reserved,2);
});

test('mentor freight, working weeks and covered handover produce a persistent new assignment',()=>{
  const {sim,open}=fixture(),first=sim.active(),id='tidebench';
  ok(sim.act('partner:'+id+':meet'));
  for(let n=0;n<15;n++)week(sim);
  const beginner=partner(sim,id);assert.equal(beginner.person.sessions,beginner.person.selfLimit);
  assert.equal(beginner.person.guidance,0);
  ok(sim.found({name:'Other',lat:-4,lon:17,water:false}));
  const second=sim.active();ok(sim.visit(first.id));
  ok(sim.act('partner:'+id+':coach'));
  assert.equal(partner(sim,id).person.guidance,0);assert(partner(sim,id).agreement.coaching);
  ok(sim.visit(second.id));const locked=JSON.stringify(sim.state);
  assert.equal(sim.act('partner:'+id+':coach').ok,false);assert.equal(JSON.stringify(sim.state),locked);
  let restored=open(),observedHandover=false,coachingTrips=1;
  for(let n=0;n<65 && !partner(restored,id).person.completed;n++){
    const p=partner(restored,id);
    if(p.person.handover){observedHandover=true;assert.equal(p.person.role,beginner.person.role);assert.equal(p.decision.reserve,p.reserve+1);}
    const action=restored.actions('routes').find(a=>a.id==='partner:'+id+':coach'&&a.available);
    if(action){ok(restored.act(action.id));coachingTrips++;}
    week(restored);
    assert(browser.CommonEarthSim.readSave(JSON.stringify(restored.state)));
    if(n%4===3){const before=plain(partner(restored,id).person);restored=open();assert.deepEqual(plain(partner(restored,id).person),before);}
  }
  const promoted=partner(restored,id).person;
  assert(observedHandover);assert(coachingTrips>=2);assert(promoted.completed);
  assert.equal(promoted.role,promoted.nextRole);assert.equal(promoted.id,beginner.person.id);
  assert.deepEqual(plain(promoted),plain(partner(restored,id,first).person));
  assert.equal(partner(restored,id).decision.reserve,partner(restored,id).reserve);
  assert(!restored.actions('routes').some(a=>a.id==='partner:'+id+':coach'));
  assert(restored.state.partners[id].history.length<=7);
  const bad=plain(restored.state);bad.partners[id].learning.guidance=100;
  assert.equal(browser.CommonEarthSim.readSave(JSON.stringify(bad)),null);
  delete bad.partners[id].learning;
  assert(browser.CommonEarthSim.readSave(JSON.stringify(bad)),'historical untouched partner state remains loadable');
});
