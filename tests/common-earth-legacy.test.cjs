'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const directory = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const ctx = vm.createContext({});
ctx.window = ctx;
for (const basename of ['navigation','voyages','neighbours','shifts','campaigns','city','strategy','legacy','simulation']) {
  vm.runInContext(fs.readFileSync(path.join(directory,basename+'.js'),'utf8'),ctx,{filename:basename+'.js'});
}
const E = ctx.CommonEarthSim;
function memory(saved) {
  const values = new Map();
  if (saved) values.set('test', saved);
  return {getItem:k => values.get(k) ?? null,setItem:(k,v) => values.set(k,v),removeItem:k => values.delete(k)};
}
function ok(result) { assert.equal(result.ok, true, result.message); return result; }
function getGame(storage) { return E.create({storage,key:'test'}); }
function spend(sim,id) {
  const shifts = {funds:'work:contract',materials:'work:salvage',food:'work:forage'};
  for(let i=0;i<24;i++){
    const option=sim.actions().find(a=>a.id===id);
    assert.ok(option,id+' missing');
    if(option.available) return ok(sim.act(id));
    if(sim.state.effort<option.cost || sim.state.effort===0){ok(sim.advance());continue;}
    const lack=Object.entries(option.goods).find(([k,v])=>sim.active()[k]<v);
    assert.ok(lack,id+' blocked: '+option.reason);
    ok(sim.act(shifts[lack[0]]));
  }
  assert.fail('Could not afford '+id);
}
let established;
function olderRatifiedWorld() {
  if(established) return established;
  const store=memory(),sim=getGame(store);
  ok(sim.found({name:'Melbourne',lat:-37.8181,lon:144.9731,water:false}));
  const home=sim.active();
  spend(sim,'charter:care');
  for(const p of home.residents) spend(sim,'listen:'+p.id);
  for(const p of home.residents.slice(0,2)) {
    spend(sim,'promise:'+p.id);
    spend(sim,'fulfil:'+p.id);
  }
  spend(sim,'build:workshop');
  spend(sim,'research:apprenticeship');
  while(!home.stats.resolved){
    const vote=sim.actions('council').find(o=>o.available && o.id.startsWith('vote:'));
    if(vote)ok(sim.act(vote.id));
    ok(sim.advance());
  }
  const target={name:'Pacific',lat:0,lon:-150,water:true};
  for(let i=0;i<16;i++) {
    const offer=sim.foundingOffer(target);
    if(offer.available) break;
    if(!sim.state.effort){ok(sim.advance());continue;}
    const need=Object.entries(offer.goods).find(([k,v])=>home[k]<v);
    assert.ok(need,offer.reason);
    spend(sim,'work:'+({funds:'contract',food:'forage',materials:'salvage'}[need[0]]));
  }
  ok(sim.found(target));
  spend(sim,'route:'+home.id);
  // Keep the first ratification available as a smoke test for pre-handover saves.
  while(sim.active().food<6)spend(sim,'work:forage');
  ok(sim.visit(home.id));
  spend(sim,'research:exchange');
  spend(sim,'research:stewardship');
  while(home.food<6)spend(sim,'work:forage');
  assert.equal(sim.state.completed,true);
  if(!sim.state.effort)ok(sim.advance());
  established=store.getItem('test');
  assert.equal(JSON.parse(established).legacy,undefined);
  return established;
}
function fourAdvances(sim) {
  for(let i=0;i<4;i++)ok(sim.advance());
}
test('an old ratified world offers a voluntary successor and otherwise keeps governing normally', () => {
  const sim=getGame(memory(olderRatifiedWorld()));
  assert.equal(ctx.EarthLegacy.summary(sim.state,sim.active()).phase,'ready');
  const candidates=sim.actions('council').filter(a=>a.legacy);
  assert.equal(candidates.length,3);
  assert.ok(candidates.every(a=>a.available));
  fourAdvances(sim);
  assert.equal(sim.state.legacy,undefined);
  const fresh=getGame(memory());
  ok(fresh.found({lat:4,lon:3,name:'Inland',water:false}));
  assert.equal(fresh.actions('council').some(a=>a.legacy),false);
});
for(const slot of [0,1,2]) {
  test(['a grower','a repairer','a convenor'][slot]+' governs four actual budget rounds, then returns the chair with an inspectable review', () => {
    const store=memory(olderRatifiedWorld());
    let sim=getGame(store);
    const homeId=sim.active().id, successor=sim.active().residents[slot];
    const baseline=getGame(memory(olderRatifiedWorld()));
    const originalWeek=sim.state.week;
    ok(sim.act('legacy:start:'+successor.id));
    assert.equal(ctx.EarthLegacy.governs(sim.state,sim.active()),true);
    assert.equal(sim.actions('council').some(a=>a.id.startsWith('vote:')),false);
    assert.equal(sim.actions('council').some(a=>a.legacy),false);
    const other=sim.state.sites.find(s=>s.id!==homeId);
    ok(sim.visit(other.id));
    assert.equal(ctx.EarthLegacy.governs(sim.state,sim.active()),false);
    for(let i=0;i<4;i++){
      const before=JSON.stringify(sim.state),projection=sim.forecastNext();
      assert.equal(JSON.stringify(sim.state),before);
      ok(sim.advance());ok(baseline.advance());
      for(const forecast of projection.sites){
        const site=sim.state.sites.find(s=>s.id===forecast.id);
        for(const [k,value] of Object.entries(forecast.closing))assert.equal(site[k],value,k);
      }
      if(i<3) assert.equal(sim.state.legacy.term.decisions.length,i+1);
      if(i===1) {
        const saved=JSON.stringify(sim.state);sim=getGame(store);
        assert.equal(JSON.stringify(sim.state),saved);
      }
    }
    assert.equal(sim.state.week,originalWeek+4);
    assert.equal(sim.state.legacy.term,null);
    const review=sim.state.legacy.history[0];
    assert.equal(review.person,successor.name);assert.equal(review.decisions.length,4);
    assert.match(review.result,/charter/);assert.match(review.reach,/Direct household support/);
    assert.ok(review.opening && review.closing);
    const [before,after]=[baseline,sim].map(w=>w.state.sites.map(s=>[s.food,s.funds,s.materials,s.trust,s.wellbeing,s.residents.map(p=>[p.heard,p.bond])]));
    assert.notEqual(JSON.stringify(before),JSON.stringify(after),'handover must change played state');
    const words=review.decisions.join(' ').toLowerCase();
    if(slot===0)assert.match(words,/food|meal/);
    if(slot===1)assert.match(words,/equipment|materials|food cart/);
    if(slot===2)assert.match(words,/session with/);
    ok(sim.visit(homeId));
    assert.equal(ctx.EarthLegacy.summary(sim.state,sim.active()).phase,'ready');
    const saved=JSON.stringify(sim.state);const restored=getGame(store);
    assert.equal(JSON.stringify(restored.state),saved);
    ok(restored.advance());assert.equal(restored.state.legacy.history.length,1);
  });
}


for(const affordable of [false,true]){
  test('the chair settles a closing agenda using the outgoing week’s '+(affordable?'adequate':'insufficient')+' reserves',()=>{
    const saved=JSON.parse(olderRatifiedWorld()),home=saved.sites.find(s=>s.id===saved.activeId);
    const deadline=saved.week;
    home.food=affordable?16:0;home.funds=affordable?10:0;
    home.issue={index:0,title:'A lean harvest',prompt:'Who carries the cost?',deadline,targetId:null};
    const sim=getGame(memory(JSON.stringify(saved)));
    ok(sim.act('legacy:start:'+sim.active().residents[0].id));
    const next=ctx.EarthLegacy.guidance(sim);
    assert.equal(next.kind,'week');assert.ok(next.detail.includes(home.name));
    ok(sim.advance());
    const notes=sim.lastWeek().sites.find(s=>s.id===home.id).highlights;
    if(affordable){
      assert.ok(notes.some(t=>t.includes('voted')));
      assert.ok(sim.active().pending.some(v=>v.index===0 && v.week===deadline+2));
      assert.equal(sim.state.legacy.term.decisions.length,1);
    }else{
      assert.ok(notes.some(t=>t.includes('lapsed')));
      assert.ok(!sim.active().pending.some(v=>v.index===0));
    }
    assert.ok(E.readSave(JSON.stringify(sim.state)));
  });
}
