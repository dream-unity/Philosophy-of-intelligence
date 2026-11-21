'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const env=vm.createContext({});env.window=env;
for(const name of ['neighbours','simulation','planner']) vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),env,{filename:name+'.js'});
function ok(r){assert.equal(r.ok,true,r.message);return r;}
function open(raw) {
  const map=new Map(raw?[['peer-test',raw]]:[]);
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  return env.CommonEarthSim.create({storage,key:'peer-test'});
}
function option(sim,id){return sim.actions('people').find(a=>a.id===id);}
function pair(sim){return env.EarthNeighbours.summary(sim.active()).links.find(link=>link.id==='tools');}
function initial(){
  const sim=open();
  ok(sim.found({name:'Melbourne',lat:-37.8181,lon:144.9731,water:false}));
  for(const p of sim.active().residents.slice(0,2))ok(sim.act('listen:'+p.id));
  ok(sim.act('together:tools'));
  return JSON.stringify(sim.state);
}
function settle(sim) {
  const site=sim.active(),opening=site.materials,projection=sim.forecastNext().sites.find(s=>s.id===site.id);
  ok(sim.advance());assert.equal(site.materials,projection.closing.materials);
  return site.materials-opening-projection.production.materials;
}
function nextMeeting(sim){ok(sim.advance());ok(sim.act('together:tools'));}
function runCycle(sim,check){
  ok(sim.act('agreement:lead'));
  ok(sim.act(check?'agreement:check':'work:contract'));
  return settle(sim);
}
test('the same pair starts with neutral terms, then its prior handling of shared work changes a real offer',()=>{
  const seed=initial(),a=open(seed),b=open(seed);
  assert.equal(option(a,'agreement:reuse'),undefined);
  assert.equal(option(a,'agreement:repair'),undefined);
  assert.equal(runCycle(a,false),5);assert.equal(runCycle(b,true),5);
  assert.equal(pair(a).status,'strained');assert.equal(pair(b).handover,'tool-return agreement');
  nextMeeting(a);nextMeeting(b);
  assert.match(option(a,'agreement:lead').description,/holding back supplies/);
  assert.equal(option(a,'agreement:reuse'),undefined);
  const repeat=option(b,'agreement:reuse');
  assert.equal(Object.keys(repeat.goods).length,0);
  assert.match(repeat.description,/week 2/);
  ok(a.act('agreement:lead'));ok(b.act('agreement:lead'));
  assert.equal(settle(a),3);assert.equal(settle(b),5);
});

test('a trusted pair can reuse its signed working method once without organiser effort or fresh stock',()=>{
  const sim=open(initial());
  for(let i=0;i<3;i++){if(i)nextMeeting(sim);runCycle(sim,true);}
  assert.equal(pair(sim).status,'trusted collaborators');
  nextMeeting(sim);
  const offer=option(sim,'agreement:reuse');
  assert.equal(Object.keys(offer.goods).length,0);
  assert.match(offer.description,/4 materials/);
  const before=JSON.stringify(sim.state);
  const rehearsal=env.EarthPlanner.project(sim.state,[{id:'agreement:reuse'}],1);
  assert.equal(rehearsal.ok,true);assert.equal(JSON.stringify(sim.state),before);
  ok(sim.act(offer.id));
  const raw=JSON.stringify(sim.state),restored=open(raw);assert.equal(JSON.stringify(restored.state),raw);
  assert.equal(settle(restored),4);assert.equal(rehearsal.site.materials,restored.active().materials);
  nextMeeting(restored);assert.equal(option(restored,'agreement:reuse'),undefined);
});

test('a strained pair can repair a disagreement with time alone and try the resulting terms on a small joint job',()=>{
  const sim=open(initial());
  for(let i=0;i<3;i++){if(i)nextMeeting(sim);runCycle(sim,false);}
  assert.equal(pair(sim).strength,-3);
  nextMeeting(sim);
  const repair=option(sim,'agreement:repair');
  assert.equal(Object.keys(repair.goods).length,0);
  const before=sim.active().neighbourWork.completed,materials=sim.active().materials;
  ok(sim.act(repair.id));assert.equal(sim.active().materials,materials);
  assert.equal(option(sim,'agreement:check'),undefined);
  assert.equal(settle(sim),0);
  assert.equal(sim.active().neighbourWork.completed,before);
  assert.equal(pair(sim).strength,-1);assert.equal(pair(sim).handoverWeek,sim.state.week);
  nextMeeting(sim);
  const repeat=option(sim,'agreement:reuse');assert.match(repeat.description,/3 materials/);
  ok(sim.act(repeat.id));ok(sim.act('agreement:check'));assert.equal(settle(sim),4);
  assert.equal(pair(sim).status,'ready to try again');
  assert.equal(pair(sim).handoverWeek,sim.state.week);
});

test('an earlier save preserves an accepted scope and never invents a signed handover',()=>{
  const sim=open(initial());runCycle(sim,false);nextMeeting(sim);ok(sim.act('agreement:lead'));
  const old=JSON.parse(JSON.stringify(sim.state)),peer=old.sites[0].neighbourWork;
  // The original save format recorded the agreement without a reduced scope
  // or a stored joint handover. The neighbours had accepted the original yield.
  delete peer.handovers;delete peer.active.limited;
  const restored=open(JSON.stringify(old));
  assert.equal(pair(restored).handover,'');assert.equal(settle(restored),5);
  nextMeeting(restored);
  assert.ok(option(restored,'agreement:repair'));
  assert.equal(option(restored,'agreement:reuse'),undefined);
});
