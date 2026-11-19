'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const folder=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
function game(standing=true){
  const c=vm.createContext({console,Date,URL,TextDecoder});c.window=c;
  const files=[...fs.readFileSync(path.join(folder,'index.html'),'utf8').matchAll(/<script src="([\w-]+\.js)/g)].map(m=>m[1]);
  for(const f of files.slice(0,files.indexOf('simulation.js')+1))vm.runInContext(fs.readFileSync(path.join(folder,f),'utf8'),c,{filename:f});
  const sim=c.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19},undefined,'later',null,null,{residentBallots:standing}).ok);
  return {sim,c,site:sim.active()};
}
function reachHearing(sim){
  for(let i=0;i<10&&!sim.active().issue;i++)assert.ok(sim.advance().ok);
  const hearing=sim.active().issue;assert.ok(hearing);
  while(sim.state.week<hearing.deadline)assert.ok(sim.advance().ok);
  return hearing;
}
test('ordinary council decisions can proceed with named local votes and forecast the actual outcome',()=>{
  const {sim,site,c}=game();const hearing=reachHearing(sim);
  assert.doesNotMatch(sim.liveWeekHold(),/council vote/);
  const preview=sim.forecastNext(),week=sim.state.week;
  assert.equal(sim.state.week,week);assert.ok(sim.advance().ok);
  const vote=sim.state.journal.find(e=>e.week===week+1&&e.siteId===site.id&&e.text.includes(' backed “'));
  assert.ok(vote,JSON.stringify(sim.lastWeek()));assert.match(vote.text,/Mira|Sol|Idris/);
  assert.ok(site.pending.some(p=>p.index===hearing.index));assert.ok(preview.sites[0].council.includes(vote.text));
  assert(c.CommonEarthSim.readSave(JSON.stringify(sim.state)));sim.destroy();
});
test('a resident-controlled clock keeps the original signer responsible and can restore a manual ballot',()=>{
  const {sim,site}=game();const receiver=site.residents[0];assert.ok(sim.act('listen:'+receiver.id).ok);
  assert.ok(sim.act('promise:'+receiver.id).ok);
  while(sim.state.week<receiver.promise.dueWeek)assert.ok(sim.advance().ok);
  assert.match(sim.liveWeekHold(),/promise/i);assert.ok(sim.act('fulfil:'+receiver.id).ok);
  assert.ok(sim.act('hearing:hold').ok);reachHearing(sim);
  assert.match(sim.liveWeekHold(),/council vote/);assert.ok(sim.act('hearing:resident').ok);
  assert.doesNotMatch(sim.liveWeekHold(),/council vote/);sim.destroy();
});
test('a public hearing can let a proposal lapse when each choice would spend protected stock',()=>{
  const {sim,site}=game();const hearing=reachHearing(sim);
  site.food=1;site.funds=1;site.materials=1;
  assert.ok(sim.advance().ok);const report=sim.lastWeek().sites[0];
  assert.ok(!site.pending.some(p=>p.index===hearing.index));
  assert.ok(sim.state.journal.some(e=>e.week===sim.state.week&&e.text.includes(hearing.title)&&e.text.includes('lapsed')),JSON.stringify(report));
  sim.destroy();
});
