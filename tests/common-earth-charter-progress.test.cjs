'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const browser=vm.createContext({});browser.window=browser;
for(const name of ['construction','navigation','campaigns','legacy','simulation'])vm.runInContext(fs.readFileSync(path.join(source,name+'.js'),'utf8'),browser);
const game=()=>browser.CommonEarthSim.create({storage:null});
const place=(name,lat,lon)=>({name,lat,lon,water:false});
function success(result){assert.equal(result.ok,true,result.message);}
function step(s,id){
  for(let i=0;i<40;i++){
    const action=s.actions().find(a=>a.id===id);
    assert.ok(action,id);
    if(action.available){success(s.act(id));if(id.startsWith('build:'))success(s.workConstruction(300));return;}
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
      if(guide.kind==='construction'){
        const job=s.constructionView().jobs.find(job=>job.id===guide.jobId);
        assert.ok(job,guide.label);success(s.workConstruction(120));continue;
      }
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
  for(const name of ['construction','navigation','city','neighbours','shifts','campaigns','legacy','simulation']){
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
      if(step.kind==='construction'){
        const job=sim.constructionView().jobs.find(job=>job.id===step.jobId);
        assert.ok(job,key+' should follow a real worksite');success(sim.workConstruction(120));continue;
      }
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

test('an in-progress building can meet an active promise at opening or the player can deliver before then',()=>{
  for(const [slot,kind] of ['garden','workshop','hall'].entries())for(const outcome of ['open','deliver','expire']){
    const s=game();success(s.found(place('Stone Town',-6.1622,39.1922)));
    const site=s.active(),person=site.residents[slot];
    step(s,'listen:'+person.id);
    // An agreement may even be made after the work has started.
    success(s.act('build:'+kind,2));
    step(s,'promise:'+person.id);
    const job=site.construction[0];
    const waiting=browser.EarthLegacy.guidance(s);
    assert.equal(waiting.kind,'construction');assert.equal(waiting.jobId,job.id);
    assert.ok(waiting.detail.includes(person.name));assert.match(waiting.detail,/deliver.*supplies/i);
    assert.equal(site.stats.kept,0);assert.equal(site.buildings.length,0);
    if(outcome==='deliver')step(s,'fulfil:'+person.id);
    if(outcome==='expire')while(person.promise)success(s.advance());
    const kept=site.stats.kept,bond=person.bond;
    success(s.workConstruction(120));
    assert.equal(site.buildings.length,1);assert.equal(site.buildings[0].plot,2);
    const partners=Array.from(site.buildings[0].partners);
    assert.deepEqual(partners,outcome==='open'?[person.id]:[]);
    assert.equal(site.stats.kept,kept+(outcome==='open'?1:0));
    if(outcome!=='open')assert.equal(person.bond,bond);
    assert.ok(browser.CommonEarthSim.readSave(JSON.stringify(s.state)));
    s.destroy();
  }
});

test('an unstaffed apprenticeship site keeps the same lot and offers a crew before research',()=>{
  const s=game();success(s.found(place('Stone Town',-6.1622,39.1922)));
  const site=s.active();step(s,'charter:craft');step(s,'listen:'+site.residents[0].id);
  success(s.act('build:workshop',7));
  const job=site.construction[0];
  for(const p of site.residents)success(s.setWorkPreference(p.id,'usual'));
  const stalled=browser.EarthLegacy.guidance(s);assert.equal(stalled.kind,'construction');
  assert.equal(stalled.jobId,job.id);assert.match(stalled.label,/crew/i);
  success(s.workConstruction(120));success(s.advance());
  assert.equal(job.work,0);assert.equal(site.buildings.length,0);
  assert.equal(s.actions('research').find(a=>a.id==='research:apprenticeship').available,false);
  success(s.setWorkPreference(site.residents[1].id,'build',job.id));
  const staffed=browser.EarthLegacy.guidance(s);assert.equal(staffed.jobId,job.id);
  assert.match(staffed.label,/watch/i);assert.ok(staffed.detail.includes(site.residents[1].name));
  success(s.workConstruction(120));assert.equal(site.buildings[0].plot,7);
  assert.equal(browser.EarthLegacy.guidance(s).actionId,'research:apprenticeship');
  s.destroy();
});

test('a Melbourne commission follows the two halves of a planned street link until each really opens',()=>{
  const s=game();success(s.found(place('Melbourne',-37.81,144.96),'District','accept'));
  const site=s.active();
  step(s,'listen:'+site.residents[0].id);step(s,'listen:'+site.residents[1].id);
  success(s.act('build:garden',0));success(s.advance());
  while(site.funds<6)step(s,'work:contract');
  while(site.materials<3)step(s,'work:salvage');
  success(s.act('build:workshop',1));
  for(const p of site.residents)success(s.setWorkPreference(p.id,'usual'));
  const jobs=Array.from(site.construction);
  assert.equal(browser.EarthCampaigns.summary(s.state,site).milestones[1].met,false);
  for(const job of jobs){
    success(s.setWorkPreference(site.residents[0].id,'build',job.id));
    assert.equal(browser.EarthLegacy.guidance(s).jobId,job.id);
    success(s.workConstruction(job.total+35));
    assert.equal(site.buildings.at(-1).plot,job.plot);
    success(s.setWorkPreference(site.residents[0].id,'usual'));
  }
  assert.equal(browser.EarthCampaigns.summary(s.state,site).milestones[1].met,true);
  assert.equal(browser.EarthLegacy.guidance(s).inspectPilot,true);
});

test('one remaining effort goes to a viable promise and can secure an extension when only a deposit is available',()=>{
  const initial=game();success(initial.found(place('Stone Town',-6.1622,39.1922)));
  const people=initial.active().residents;
  for(const p of people.slice(0,2)){step(initial,'listen:'+p.id);step(initial,'promise:'+p.id);}
  success(initial.advance());step(initial,'listen:'+people[1].id);success(initial.advance());
  const snapshot=JSON.parse(JSON.stringify(initial.state));
  snapshot.effort=1;snapshot.sites[0].food=0;snapshot.sites[0].materials=2;
  const fresh=()=>browser.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(snapshot)});
  const first=fresh(),ready=browser.EarthLegacy.guidance(first);
  assert.equal(ready.actionId,'fulfil:'+people[1].id);
  success(first.act(ready.actionId));assert.equal(first.active().stats.kept,1);first.destroy();
  snapshot.sites[0].residents[0].promise=null;snapshot.sites[0].materials=1;
  const later=fresh(),extend=browser.EarthLegacy.guidance(later);
  assert.equal(extend.actionId,'revise:'+people[1].id);success(later.act(extend.actionId));
  success(later.advance());const fulfil=browser.EarthLegacy.guidance(later);
  if(fulfil.actionId==='work:salvage')success(later.act(fulfil.actionId));
  success(later.act('fulfil:'+people[1].id));assert.equal(later.active().stats.kept,1);
  initial.destroy();later.destroy();
});

test('an outstanding parcel can fund a same-week promise without spending the final effort on paid work',()=>{
  const initial=game();success(initial.found(place('Stone Town',-6.1622,39.1922)));
  const p=initial.active().residents[2];step(initial,'listen:'+p.id);step(initial,'promise:'+p.id);
  success(initial.advance());success(initial.advance());step(initial,'courier:pick');
  const snapshot=JSON.parse(JSON.stringify(initial.state));
  snapshot.effort=1;snapshot.sites[0].funds=0;
  const sim=browser.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(snapshot)});
  const parcel=browser.EarthLegacy.guidance(sim);assert.match(parcel.actionId,/^courier:deliver:/);
  success(sim.act(parcel.actionId));assert.equal(sim.state.effort,1);
  const promise=browser.EarthLegacy.guidance(sim);assert.equal(promise.actionId,'fulfil:'+p.id);
  success(sim.act(promise.actionId));assert.equal(sim.active().stats.kept,1);
  initial.destroy();sim.destroy();
});
