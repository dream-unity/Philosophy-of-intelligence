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
