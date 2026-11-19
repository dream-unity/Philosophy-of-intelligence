'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const stages=[...fs.readFileSync(path.join(directory,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*>/g)].map(m=>m[1]);
const place={name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false};
function region(snapshot){
  let clock=1000000;
  class Clock extends Date{static now(){return clock;}}
  const ctx=vm.createContext({Date:Clock,console,structuredClone});ctx.window=ctx;
  for(const name of stages){
    vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),ctx,{filename:name+'.js'});
    if(name==='simulation')break;
  }
  const sim=ctx.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found(place).ok);
  const w=sim.state;
  clock=Math.max(clock,w.lastProductionAt||0);
  return {ctx,sim,w,market:w.communityLife.outposts[2],watch:w.communityLife.outposts[1],
    production(){clock+=24100;assert.ok(sim.production(w.productionSerial||0,()=>true).ok);},
    week(){clock+=24100;assert.ok(sim.advance().ok);},
    save(){const raw=JSON.stringify(w);assert.ok(ctx.CommonEarthSim.readSave(raw));return raw;}};
}
test('inspecting a neighbouring worksite never changes land, reservations, wages, occupancy or a Town Centre decision',()=>{
  const seed=region().save(),near=region(seed),far=region(seed);
  const original=near.w.activeId;
  for(let i=0;i<12;i++){
    const {ctx,w,market}=near,geo=ctx.EarthRegionalWorld.geography(w,market),pin=geo.towns.find(t=>t.site===market);
    ctx.EarthRegionalWorld.inspect(w,near.sim.active(),pin.x,pin.y,market.id);
    ctx.EarthRegionalWorld.travellers(w,market);
    ctx.EarthCommunityLife.entryAssessment(w,market);
    ctx.EarthHousing.view(w,market);
    for(const run of [near,far]){run.production();if(i%3===2)run.week();}
    assert.equal(near.save(),far.save(),'camera-dependent outcome at round '+i);
  }
  assert.equal(near.w.activeId,original);
  const {ctx,w,market}=near,reopened=region(near.save()),homes=ctx.EarthHousing.view(w,market).homes;
  assert.ok(market.civicLand.homes.length>=1);
  assert.ok(homes.some(h=>h.key.startsWith('cottage-')&&h.occupants.length));
  assert.ok(market.communityLife.townCentre.arrivals.length);
  assert.equal(reopened.market.population,market.population);
  assert.equal(ctx.EarthCityModel.housingCapacity(market),ctx.EarthHousing.view(w,market).capacity);
});
test('one missing material prevents the contract, which later pays a named builder and houses the person who needed it',()=>{
  const seed=region().save(),able=region(seed),short=region(seed);
  const before=able.ctx.EarthHousing.view(able.w,able.market),workerPay=[];
  assert.equal(before.unmet,1);
  const floor=short.ctx.EarthCivicInitiatives.reserve(short.w,short.market);
  short.market.materials=floor.materials+2;
  able.production();short.production();
  assert.equal(able.market.civicLand.project.escrow,3);
  assert.equal(short.market.civicLand.project,undefined);
  assert.match(short.market.civicLand.delay,/materials/);
  assert.equal(able.ctx.EarthCityModel.housingCapacity(able.market),before.capacity);
  const reopened=region(able.save());
  assert.equal(reopened.market.civicLand.project.workerKey,able.market.civicLand.project.workerKey);
  function recent(run){
    const rows=run.ctx.EarthDistrictGrowth.transfers(run.market.growth.history[0]);
    workerPay.push(...rows.filter(r=>r.from==='Council housing escrow'&&r.good==='funds'));
  }
  for(let i=0;i<15&&!able.market.civicLand.homes.length;i++){able.production();recent(able);}
  assert.equal(able.market.civicLand.homes.length,1);
  assert.equal(workerPay.reduce((n,r)=>n+r.amount,0),3);
  const view=able.ctx.EarthHousing.view(able.w,able.market);
  assert.equal(view.unmet,0);assert.equal(view.capacity,before.capacity+2);
  assert.ok(view.homes.find(h=>h.key==='cottage-0').occupants.some(p=>p.key===before.namedMissing[0].key));
  short.market.materials+=3;
  for(let i=0;i<20&&!short.market.civicLand.homes.length;i++)short.production();
  assert.ok(short.market.civicLand.homes.length);
  short.save();able.save();
});
test('a hostile watch commits a paid resident, fights on regional time and changes jurisdiction without transferring a private deed',()=>{
  const run=region(),{w,ctx,watch}=run;
  assert.ok(ctx.EarthBorderConflict.profile(watch).expansionist);
  const ids=new Set(),encounters=[];
  let claim=null;
  for(let i=0;i<100&&!claim;i++){
    run.production();if(i%4===3)run.week();
    const campaign=watch.communityLife.border?.campaign;
    if(campaign){
      ids.add(campaign.attacker.key);
      if(campaign.phase==='fight'){
        encounters.push(campaign.defender.key);
        const actors=ctx.EarthRegionalWorld.travellers(w,watch).filter(a=>a.phase==='fighting');
        assert.ok(actors.find(p=>p.personId===campaign.attacker.id));
      }
    }
    claim=Object.values(w.regionalWorld.regions[run.sim.active().id].parcels).find(p=>p.occupation&&p.charter===watch.id);
    run.save();
  }
  assert.ok(ids.size);assert.ok(encounters.length);assert.ok(claim);
  assert.ok(Object.keys(claim.claims).length>=2);
  assert.ok(Object.values(claim.agreements).some(a=>a.terms==='disputed'));
  const event=watch.communityLife.entryRecords.find(r=>r.kind==='invasion');
  assert.ok(event.official);assert.ok(event.reported>event.week);
});
test('the same visitor receives different treatment with sponsored entry, and a changed resident mix can withdraw authority for war',()=>{
  const {w,ctx,sim,watch}=region(),home=sim.active(),guest=w.communityLife.profile;
  const initial=ctx.EarthBorderConflict.profile(watch);
  assert.ok(initial.closed);assert.ok(ctx.EarthBorderConflict.entry(w,home,watch,guest,false));
  watch.communityLife.entryPass={guestKey:guest.identityKey,opens:w.week,until:w.week+2};
  assert.equal(ctx.EarthBorderConflict.entry(w,home,watch,guest,false),'');
  // Change only the residents' dispositions in this counterfactual. The founding
  // articles, visitor, food supply and treasury stay fixed.
  for(const p of ctx.EarthDistrictGrowth.members(watch)){
    const persisted=watch.communityLife.people[p.id];
    if(persisted){persisted.profile.traits.aggression=4;continue;}
    watch.communityLife.people[p.id]={profile:{...p,traits:{...p.traits,aggression:4}},status:'member',since:w.week,
      originId:watch.id,originName:watch.name,originSlot:p.id};
  }
  const mixed=ctx.EarthBorderConflict.profile(watch);
  assert.ok(mixed.score<initial.score);assert.equal(mixed.expansionist,false);
  assert.equal(ctx.EarthCommunityLife.entryAssessment(w,watch).rule.label,'Hosted entry');
});

test('a resident turns earnings and a council advance into a working shop, then repays the town from sales',()=>{
  const seed=region().save(),a=region(seed),b=region(seed),town=a.w.communityLife.outposts[0],ledger=a.ctx.EarthDistrictGrowth;
  let owner=null,loan=0,repayment=0,receipt;
  for(let i=0;i<80&&!repayment;i++){
    for(const f of [a,b]){f.production();if(i%8===7)f.week();}
    a.ctx.EarthHousing.view(a.w,town);
    const rows=ledger.transfers(town.growth.history[0]);
    for(const entry of rows){
      if(!owner&&entry.reason==='Council financed part of the first commercial deed'){owner=entry.to;loan=entry.amount;}
      if(owner&&entry.reason==='Retail payment'&&entry.to===owner)receipt=entry;
      if(owner&&entry.reason==='Commercial deed repayment'&&entry.from===owner)repayment+=entry.amount;
    }
  }
  assert.ok(owner&&loan>0&&receipt&&repayment,'a funded commercial deed, completed sale and repayment');
  const shop=town.growth.households.find(h=>h.name===owner&&h.shop);
  assert.ok(shop);assert.equal(shop.shopDebt,loan-repayment);assert.equal(a.save(),b.save());
});
