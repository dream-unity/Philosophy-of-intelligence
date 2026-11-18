'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const browser=vm.createContext({});browser.window=browser;
for(const name of ['legacy','simulation'])vm.runInContext(fs.readFileSync(path.join(source,name+'.js'),'utf8'),browser);
const game=()=>browser.CommonEarthSim.create({storage:null});
const place=(name,lat,lon)=>({name,lat,lon,water:false});
function success(result){assert.equal(result.ok,true,result.message);}
function step(s,id){
  for(let i=0;i<40;i++){
    const action=s.actions().find(a=>a.id===id);
    assert.ok(action,id);
    if(action.available){success(s.act(id));return;}
    if(s.state.effort<action.cost){success(s.advance());continue;}
    const missing=Object.entries(action.goods).find(([key,quantity])=>s.active()[key]<quantity);
    assert.ok(missing,id+': '+action.reason);
    step(s,'work:'+({funds:'contract',materials:'salvage',food:'forage'}[missing[0]]));
  }
  assert.fail('Unreachable action '+id);
}
function progress(s){
  const original=JSON.stringify(s.state);
  const value=browser.EarthLegacy.charterProgress(s.state);
  assert.equal(JSON.stringify(s.state),original,'opening the guide must not change the simulation');
  return value;
}

test('one Fair Table community can meet its promises and pantry goal but still needs a linked partner for Stewardship',()=>{
  const s=game();assert.equal(progress(s),null);
  success(s.found(place('Stone Town',-6.1622,39.1922)));
  assert.equal(progress(s),null);
  const home=s.active();
  step(s,'charter:care');
  for(const p of home.residents.slice(0,2)){step(s,'listen:'+p.id);step(s,'promise:'+p.id);step(s,'fulfil:'+p.id);}
  step(s,'build:workshop');step(s,'research:apprenticeship');
  const guide=progress(s);
  assert.equal(guide.termsMet,true);assert.equal(guide.stewardshipMet,false);
  assert.equal(guide.priority,true);assert.equal(guide.ratified,false);
  assert.equal(guide.next.kind,'atlas');
  assert.match(guide.summary,/route between two communities/);
  assert.deepEqual(Array.from(guide.rows,r=>r.count),[1,2,0]);
});

test('one unheard resident in Lisbon is the exact next guide target, and hearing them ratifies immediately',()=>{
  const s=game();success(s.found(place('Recife',-8.05,-34.88)));
  const first=s.active();step(s,'charter:voice');
  for(const p of first.residents)step(s,'listen:'+p.id);
  step(s,'promise:'+first.residents[0].id);step(s,'fulfil:'+first.residents[0].id);
  step(s,'build:hall');step(s,'research:apprenticeship');
  const end=place('Lisbon',38.72,-9.14);
  for(let i=0;i<20&&!s.foundingOffer(end).available;i++){
    const offer=s.foundingOffer(end);
    const low=Object.entries(offer.goods).find(([k,n])=>first[k]<n);
    if(!s.state.effort||!low)success(s.advance());
    else step(s,'work:'+({funds:'contract',materials:'salvage',food:'forage'}[low[0]]));
  }
  success(s.found(end));const lisbon=s.active();step(s,'route:'+first.id);
  success(s.visit(first.id));step(s,'research:exchange');
  for(let i=0;i<24&&first.stats.resolved<2;i++){
    const vote=s.actions('council').find(a=>a.available&&a.id.startsWith('vote:'));
    if(vote)step(s,vote.id);
    success(s.advance());
  }
  step(s,'research:stewardship');
  success(s.visit(lisbon.id));for(const p of lisbon.residents.slice(0,2))step(s,'listen:'+p.id);
  success(s.visit(first.id));
  const next=progress(s);
  assert.equal(next.priority,true);assert.equal(next.stewardshipMet,true);assert.equal(next.termsMet,false);
  assert.equal(next.next.kind,'resident');assert.equal(next.next.siteId,lisbon.id);
  assert.equal(next.next.residentId,lisbon.residents[2].id);assert.ok(next.summary.includes(lisbon.residents[2].name));
  assert.equal(lisbon.stats.kept,0);
  success(s.visit(next.next.siteId));step(s,'listen:'+next.next.residentId);
  const done=progress(s);assert.ok(s.state.completed);assert.equal(done.ratified,true);assert.equal(done.next,null);
  assert.equal(done.priority,false);assert.ok(done.rows.every(r=>r.met&&r.action===null));
});

test('a knowledge charter guides a learner through the workshop gate and tracks the particular parcel',()=>{
  const s=game();success(s.found(place('Suva',-18.13,178.43)));const home=s.active();
  step(s,'charter:craft');
  let guide=progress(s);assert.equal(guide.next.kind,'resident');
  step(s,'listen:'+guide.next.residentId);
  assert.equal(progress(s).next.group,'build');
  step(s,'build:workshop');assert.equal(progress(s).next.actionId,'research:apprenticeship');
  step(s,'research:apprenticeship');assert.equal(progress(s).next.kind,'atlas');
  step(s,'courier:pick');guide=progress(s);
  const parcel=guide.rows.find(row=>row.id==='deliveries');
  assert.ok(parcel.detail.includes(home.residents[0].name));
  assert.equal(parcel.action.actionId,'courier:deliver:'+home.residents[0].id);
  step(s,parcel.action.actionId);
  assert.equal(progress(s).rows.find(row=>row.id==='deliveries').met,true);
});

for(const charter of ['care','voice','craft']){
  test('a first-time player can follow available steps all the way to the '+charter+' charter',()=>{
    const s=game();
    success(s.found(place('Stone Town',-6.1622,39.1922)));
    let settlements=1;
    for(let n=0;n<120 && !s.state.completed;n++){
      const before=JSON.stringify(s.state),guide=browser.EarthLegacy.guidance(s);
      assert.equal(JSON.stringify(s.state),before,'reading the guide must be free');
      assert.ok(guide?.label,'missing guidance');
      if(guide.siteId!==s.state.activeId)success(s.visit(guide.siteId));
      if(guide.kind==='week'){success(s.advance());continue;}
      if(guide.kind==='atlas'){
        assert.ok(s.sponsorshipOffer().available,'the atlas shortcut should wait for viable sponsorship');
        assert.equal(settlements++,1,'a third community should never be required');
        success(s.found(place('Lisbon',38.72,-9.14)));
        continue;
      }
      assert.ok(['resident','group'].includes(guide.kind),guide.label);
      const options=s.actions(guide.group);
      const action=guide.actionId?options.find(a=>a.id===guide.actionId):
        guide.inspectVote?options.find(a=>a.id.startsWith('vote:')&&a.available):
        options.find(a=>a.id==='charter:'+charter);
      assert.ok(action,guide.label);
      assert.ok(action.available,guide.label+' recommended a disabled choice: '+action.reason);
      success(s.act(action.id));
    }
    assert.equal(settlements,2);
    assert.ok(s.state.completed,'all steps should end in ratification');
    const succession=browser.EarthLegacy.guidance(s);
    if(s.state.effort===0){assert.equal(succession.kind,'week');success(s.advance());}
    assert.equal(browser.EarthLegacy.guidance(s).page,'legacy');
    assert.ok(browser.CommonEarthSim.readSave(JSON.stringify(s.state)));
  });
}

test('both trials in all nine local commissions can be completed by following their local priorities',()=>{
  const ctx=vm.createContext({});ctx.window=ctx;
  for(const name of ['navigation','city','neighbours','shifts','campaigns','legacy','simulation']){
    vm.runInContext(fs.readFileSync(path.join(source,name+'.js'),'utf8'),ctx);
  }
  const places=[
    ['stone',-6.16,39.19],['melbourne',-37.81,144.96],['mombasa',-4.04,39.66],
    ['valparaiso',-33.04,-71.63],['rotterdam',51.92,4.48],['suva',-18.13,178.42],
    ['reykjavik',64.14,-21.94],['inland',47.38,8.54],['water',0,-150]
  ];
  for(const [key,lat,lon] of places)for(const trial of [0,1]){
    const sim=ctx.CommonEarthSim.create({storage:null});
    success(sim.found({name:'Independent trial',lat,lon,water:key==='water'},'Neighbourhood','accept'));
    const site=sim.active();
    assert.equal(site.commission.key,key);
    for(let move=0;move<30 && site.commission.phase!=='complete';move++){
      const step=ctx.EarthLegacy.guidance(sim);assert.ok(step,key);
      if(step.kind==='week'){success(sim.advance());continue;}
      const actions=sim.actions(step.group);
      const selected=step.inspectPilot?actions.filter(a=>a.id.startsWith('commission:pilot:'))[trial]:
        actions.find(a=>a.id===step.actionId);
      assert.ok(selected?.available,key+': '+step.label);
      success(sim.act(selected.id));
    }
    assert.equal(site.commission.phase,'complete',key);
    assert.equal(site.commission.supported,true,key+' can secure backing before the review');
    assert.equal(ctx.EarthCampaigns.summary(sim.state,site).testimony.length,2);
    const reviewed=site.commission.outcome;
    success(sim.advance());
    assert.equal(site.commission.outcome,reviewed,'completed trials must stay final');
    assert.ok(ctx.CommonEarthSim.readSave(JSON.stringify(sim.state)),key+' round-trip');
    sim.destroy();
  }
});
