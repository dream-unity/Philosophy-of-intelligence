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
    elapse(ms){clock+=ms;},
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
  const ids=new Set(),encounters=[],contested=new Set();
  let claim=null;
  for(let i=0;i<100&&!claim;i++){
    run.production();if(i%4===3)run.week();
    const campaign=watch.communityLife.border?.campaign;
    if(campaign){
      ids.add(campaign.attacker.key);
      if(campaign.phase==='fight'){
        encounters.push(campaign.defender.key);contested.add(campaign.cell);
        const actors=ctx.EarthRegionalWorld.travellers(w,watch).filter(a=>a.phase==='fighting');
        assert.ok(actors.find(p=>p.personId===campaign.attacker.id));
      }
    }
    // An earlier undefended occupation need not have involved a fight.
    const parcels=w.regionalWorld.regions[run.sim.active().id].parcels;
    claim=[...contested].map(cell=>parcels[cell]).find(p=>p?.occupation&&p.charter===watch.id);
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

test('the same named party can lose its claim through cumulative fatigue, with both sides visible and an actual witness',()=>{
  const starting=region();
  for(let i=0;i<45&&!starting.watch.communityLife.border?.campaign;i++)starting.production();
  const snapshot=starting.save();
  function resolve(exhausted){
    const run=region(snapshot),{watch,w,ctx}=run,c=watch.communityLife.border.campaign;
    const party=[c.attacker,c.partner].filter(Boolean);assert.ok(party.length);
    const watchOffice=watch.communityLife.border;
    if(exhausted)for(const p of party)(watchOffice.service||={})[p.key]={step:w.regionalWorld.step,experience:0,fatigue:90};
    let witnesses;
    for(let i=0;i<45;i++){
      run.production();
      if(c.phase==='fight'){
        const actors=ctx.EarthRegionalWorld.travellers(w,watch).filter(p=>p.phase==='fighting'&&p.destination.endsWith(' boundary'));
        witnesses=[...party,c.defender,c.support].filter(Boolean);
        for(const p of witnesses)assert.ok(actors.find(a=>a.personId===p.id&&a.name===p.name&&a.activity.includes('Fighting ')));
        assert.ok(actors.some(a=>a.fightSide===-1));assert.ok(actors.some(a=>a.fightSide===1));
      }
      const end=watchOffice.records.find(n=>n.text.includes('witnessed the outcome'));
      if(end){assert.ok(witnesses.some(p=>end.text.includes(p.name+' witnessed')));run.save();return {won:end.text.includes('took jurisdiction'),people:party.map(p=>p.key).join('/')};}
    }
    assert.fail('the paid expedition did not reach a witnessed outcome');
  }
  const fresh=resolve(false),tired=resolve(true);
  assert.equal(fresh.people,tired.people);assert.equal(fresh.won,true);assert.equal(tired.won,false);
});

test('an autonomous council turns a vacant street lot into staffed premises using household demand and funded work',()=>{
  const start=region().save(),observed=region(start),distant=region(start),seen=new Set();
  const {market,ctx,w}=observed,work=()=>market.cooperative?.project;
  let original=null,sale=null,wasVacant=false;
  for(let i=0;i<36&&!sale;i++){
    const pin=ctx.EarthRegionalWorld.geography(w,market).towns.find(t=>t.site===market);
    ctx.EarthRegionalWorld.inspect(w,market,pin.x,pin.y,market.id);ctx.EarthHousing.view(w,market);
    for(const f of [observed,distant]){f.production();if(i%3===2)f.week();}
    assert.equal(observed.save(),distant.save());
    const project=work();
    if(project?.kind==='market'){
      if(!original){original={...project};wasVacant=!market.buildings.some(b=>b.plot===project.plot);
        const proposal={id:'other-council-contract',name:'Repair workshop',scope:'street',kind:'workshop',plot:project.plot,paid:{funds:6,materials:3}};
        const clone=region(observed.save());assert.equal(clone.ctx.EarthConstruction.start(clone.market,clone.w,proposal).ok,false);}
      seen.add(project.stage);
    }
    const opened=market.cooperative?.open.find(s=>s.kind==='market');
    if(opened?.sales)sale=opened;
  }
  assert(original&&wasVacant);assert(seen.has(0)&&seen.has(1)&&seen.has(2));
  assert.equal(sale.id,original.id);assert.equal(sale.plot,original.plot);
  assert(market.buildings.some(b=>b.id===sale.id&&b.kind==='market'&&b.plot===sale.plot));
  assert.notEqual(sale.lastSale.clerk,sale.lastSale.buyer);
  const history=market.growth.history.flatMap(r=>ctx.EarthDistrictGrowth.transfers(r));
  assert(history.some(r=>r.workId===sale.id&&r.to==='Community treasury'&&r.reason==='Cooperative sale'&&r.amount===1));
  assert(history.some(r=>r.workId===sale.id&&r.reason==='Retail wage'&&r.amount===1));
  assert(history.some(r=>r.workId===sale.id&&r.good==='food'&&r.reason==='Provisions collected'));
  vm.runInContext(fs.readFileSync(path.join(directory,'development-ledger.js'),'utf8'),ctx,{filename:'development-ledger.js'});
  const ledger=ctx.EarthDevelopmentLedger.records(w,market).find(r=>r.title.startsWith('Cooperative provisions store')&&r.kind==='Cooperative enterprise');
  assert(ledger.people.some(p=>p.id===sale.lastSale.clerk));assert(ledger.people.some(p=>p.id===sale.lastSale.buyer));
});

test('a resident turns earnings and a council advance into a working shop, then repays the town from sales',()=>{
  const seed=region().save(),a=region(seed),b=region(seed),town=a.market,ledger=a.ctx.EarthDistrictGrowth;
  let owner=null,loan=0,repayment=0,receipt;
  for(let i=0;i<80&&!repayment;i++){
    for(const f of [a,b]){f.production();if(i%3===2)f.week();}
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

function travelAction(run,action,target){
  const {sim,w}=run,site=sim.active(),actor='steward';
  return sim.communityLife({action,target,site:site.id,week:w.week,actor},
    {siteId:site.id,actor,mode:'walk',target:'market',x:0,y:0,tx:0,ty:0});
}
function cross(run,id){
  const start=travelAction(run,'depart',id);assert.ok(start.ok,start.message);
  run.elapse(7000);
  const end=travelAction(run,'arrive',id);assert.ok(end.arrived,end.message);
  return end;
}
function exchange(run,gap=.75,mode='walk'){
  const site=run.sim.active(),watch=site.communityLife.border.street;
  return run.sim.communityLife({action:'streetContact',actor:'steward',site:site.id,week:run.w.week,
    round:watch.round,target:watch.guard.key},{siteId:site.id,actor:'steward',mode,x:10,y:10,gx:10+gap,gy:10});
}
test('a visitor can fight, run, board a van or leave and an invitation prevents the encounter',()=>{
  const run=region(),{w,sim,watch}=run,home=sim.active();
  assert.match(cross(run,watch.id).message,/pursuing you/);
  const fight=watch.communityLife.border.street,guard=fight.guard;
  assert.equal(watch.communityLife.away[guard.id],'regional-watch');
  run.production();assert.equal(fight.round,0);
  assert.equal(exchange(run,2).ok,false);
  const resumed=region(run.save());
  assert.ok(travelAction(resumed,'resist',guard.key).ok);
  assert.ok(exchange(resumed).ok);assert.equal(exchange(resumed).ok,false);
  assert.equal(resumed.sim.active().communityLife.border.street.round,1);
  assert.ok(exchange(run,6).ok);assert.equal(watch.communityLife.border.street,undefined);
  assert.equal(watch.communityLife.away[guard.id],undefined);assert.equal(sim.active(),watch);
  assert.ok(sim.visit(home.id).ok);assert.ok(sim.visit(watch.id).ok);
  assert.ok(exchange(run,.6,'drive').ok);assert.equal(watch.communityLife.border.street,undefined);
  assert.ok(sim.visit(home.id).ok);assert.ok(sim.visit(watch.id).ok);
  for(let i=0;i<8&&watch.communityLife.border.street.phase==='fight';i++){run.elapse(4100);assert.ok(exchange(run).ok);}
  assert.equal(watch.communityLife.border.street.phase,'repelled');
  assert.equal(home.communityLife.border.health.steward.condition,'injured');
  assert.ok(travelAction(run,'withdraw',watch.communityLife.border.street.guard.key).arrived);
  assert.ok(travelAction(run,'requestEntry',watch.id).ok);run.week();
  assert.ok(sim.visit(watch.id).ok);assert.equal(watch.communityLife.border.street,undefined);
  run.save();
});

test('an old save already inside a hostile town starts one fight and a current save resumes the same exchange',()=>{
  const run=region(),id=run.watch.id;
  cross(run,id);
  const old=JSON.parse(run.save()),c=old.sites.find(t=>t.id===id).communityLife;
  delete c.away[c.border.street.guard.id];delete c.border.street;delete c.people.steward.gateChecked;
  const next=region(JSON.stringify(old)),fight=next.sim.active().communityLife.border.street;
  assert.equal(fight.phase,'fight');assert.equal(fight.round,0);
  next.production();
  const again=region(next.save());
  assert.deepEqual(JSON.parse(JSON.stringify(again.sim.active().communityLife.border.street)),JSON.parse(JSON.stringify(fight)));
});

test('peace at the Town Centre releases the guard and gives visitors passage after reopening',()=>{
  const run=region(),{sim,watch}=run,home=sim.active();cross(run,watch.id);
  const guard=watch.communityLife.border.street.guard;
  const act=action=>sim.diplomacy({action,home:home.id,target:watch.id});
  assert.ok(act('negotiate').ok);assert.ok(act('cancel').ok);assert.equal(act('accept').ok,false);
  assert.ok(watch.communityLife.border.street);
  assert.ok(act('negotiate').ok);assert.ok(act('accept').ok);
  assert.equal(watch.communityLife.border.street,undefined);assert.equal(watch.communityLife.away[guard.id],undefined);
  const reopened=region(run.save());assert.ok(reopened.sim.visit(home.id).ok);assert.ok(reopened.sim.visit(watch.id).ok);
  assert.equal(reopened.sim.active().communityLife.border.street,undefined);
});

test('a busy watch follows up on an unintroduced arrival when a resident becomes free',()=>{
  const run=region(),{watch}=run,away=watch.communityLife.away,original={...away};
  const people=run.ctx.EarthDistrictGrowth.members(watch);
  for(const p of people)away[p.id]='regional-field';
  cross(run,watch.id);
  assert.equal(watch.communityLife.border.street.phase,'alert');
  assert.equal(watch.communityLife.border.street.guard,undefined);
  Object.assign(away,original);
  for(const p of people)if(!(p.id in original))delete away[p.id];
  run.production();assert.equal(watch.communityLife.border.street.phase,'fight');
  run.save();
});

test('a resident can die in a street fight and the same casualty is never counted twice',()=>{
  const run=region(),{watch,w,ctx,sim}=run,home=sim.active();
  // Old saves can contain an original character with advanced physical aptitudes.
  for(const axis of ['stamina','craft']){
    w.communityLife.profile.aptitudes[axis]=95;
    w.communityLife.profile.bounds[axis]={min:70,max:99};
  }
  w.communityLife.profile.traits.aggression=95;
  cross(run,watch.id);
  const fight=watch.communityLife.border.street,guard=fight.guard,count=watch.population;
  assert.ok(travelAction(run,'resist',guard.key).ok);
  for(let i=0;i<8&&fight.phase==='fight';i++){run.elapse(4100);assert.ok(exchange(run).ok);}
  const d=watch.communityLife.border;
  assert.equal(fight.phase,'won');assert.equal(d.health[guard.id].condition,'died');
  assert.equal(d.health[guard.id].key,guard.key);assert.equal(watch.population,count-1);
  assert.equal(ctx.EarthCommunityLife.present(watch,guard.id),false);
  const again=region(run.save());again.production();
  assert.equal(again.sim.active().communityLife.border.lost,1);
  assert.ok(sim.visit(home.id).ok);assert.equal(watch.communityLife.away[guard.id],'deceased');
});

test('a town at war can follow an occupied boundary with a second expedition that takes the town centre',()=>{
  const run=region(),{sim,w,watch,ctx}=run,home=sim.active();
  let foothold=false,marchedOnCentre=false;
  for(let i=0;i<100&&!home.communityLife.border?.occupiedBy;i++){
    run.production();if(i%4===3)run.week();
    foothold||=home.communityLife.border?.foothold?.by===watch.id;
    const campaign=watch.communityLife.border?.campaign;
    marchedOnCentre||=foothold&&campaign?.against===home.id&&campaign.cell==='0,0';
  }
  assert.ok(foothold);assert.ok(marchedOnCentre);
  assert.equal(home.communityLife.border.occupiedBy,watch.id);
  assert.equal(w.regionalWorld.regions[home.id].parcels['0,0'].charter,watch.id);
  assert.equal(w.activeId,home.id);
  const reopened=region(run.save());assert.equal(reopened.sim.active().communityLife.border.occupiedBy,watch.id);
  assert.ok(ctx.EarthCommunityLife.census(w,home).here>0);
  assert.ok(sim.diplomacy({action:'negotiate',home:home.id,target:watch.id}).ok);
  assert.ok(sim.diplomacy({action:'accept',home:home.id,target:watch.id}).ok);
  const centre=w.regionalWorld.regions[home.id].parcels['0,0'];
  assert.equal(centre.charter,home.id);assert.equal(centre.occupation,undefined);
  assert.equal(home.communityLife.border.occupiedBy,undefined);run.save();
});

test('established trading contacts do not turn every town into an ally, while negotiated truces suspend the campaign',()=>{
  const start=region();start.production();const base=start.save();
  for(const truce of [true,false]){
    const run=region(base),{watch,w,ctx}=run,geo=ctx.EarthRegionalWorld.geography(w,watch),r=w.regionalWorld.regions[geo.origin.id];
    for(const {site} of geo.towns.filter(t=>t.site.id!==watch.id)){
      const key=[watch.id,site.id].sort().join('/');
      r.contacts[key]={a:watch.id,b:site.id,terms:'exchange',week:w.week,step:w.regionalWorld.step,
        cell:'2,2',trust:65,meetings:4,detail:'Trade through the exchange.',...(truce?{reviewWeek:w.week+5}:{})};
    }
    for(let i=0;i<12&&!watch.communityLife.border?.campaign;i++)run.production();
    assert.equal(Boolean(watch.communityLife.border?.campaign),!truce);
    run.save();
  }
});


test('opening declarations follow resident aggression and peace persists across reloads and removes the gate siege',()=>{
  const first=region(),{sim,w,ctx,watch}=first,home=sim.active(),other=w.communityLife.outposts[0];
  const wars=Object.values(w.communityLife.relations);
  assert.equal(w.week,1);assert.equal(wars.length,3);assert.ok(wars.every(r=>r.from===watch.id&&r.state==='war'));
  assert.ok([home,other,first.market].every(s=>s.communityLife.border.defence.stage===0));
  const request=(action,target)=>sim.diplomacy({action,target:target.id,home:home.id});
  assert.ok(request('declare',other).ok);assert.equal(request('declare',other).ok,false);
  assert.ok(request('negotiate',other).ok);assert.ok(request('accept',other).ok);
  const reopened=region(first.save());assert.equal(ctx.EarthBorderConflict.relation(reopened.w,home.id,other.id).state,'peace');
  for(let i=0;i<18;i++)first.production();
  assert.equal(home.communityLife.border.defence.stage,3);
  assert.ok(home.communityLife.border.defence.builder);
  assert.ok(request('negotiate',watch).ok);assert.ok(request('accept',watch).ok);
  const c=watch.communityLife.border.campaign;
  if(c?.against===home.id)assert.equal(c.phase,'return');
  first.save();
  const edited=JSON.parse(region().save());
  delete edited.communityLife.relations;delete edited.communityLife.openingRoster;
  const towns=[...edited.sites,...edited.communityLife.outposts],rival=towns[1];
  for(const t of towns){
    const src=ctx.EarthCommunityLife.lookup(w,t.id);
    for(const p of ctx.EarthDistrictGrowth.members(t)){
      const persisted=t.communityLife.people[p.id];
      if(persisted)persisted.profile.traits.aggression=t===rival?95:10;
      else t.communityLife.people[p.id]={profile:{...ctx.EarthPersonas.profile(src,p.id),traits:{...p.traits,aggression:t===rival?95:10}},
        status:'member',originId:t.id,originSlot:p.id,originName:t.name,since:1};
    }
  }
  const altered=region(JSON.stringify(edited));
  assert.ok(Object.values(altered.w.communityLife.relations).every(r=>r.from===rival.id));
  assert.equal(altered.ctx.EarthBorderConflict.hostile(altered.w,altered.watch),false);
  assert.match(cross(altered,rival.id).message,/pursuing you/);
});

test('restart and delete target one district, keep other communities and reopen a mature save',()=>{
  const run=region();
  for(let i=0;i<16;i++){run.production();if(i%4===3)run.week();}
  const base=run.save();
  for(const id of [run.sim.active().id,run.market.id])for(const action of ['restart','delete']){
    const game=region(base),{sim,ctx}=game,site=ctx.EarthCommunityLife.lookup(sim.state,id);
    const other=game.watch,otherFunds=other.funds,identity=sim.state.communityLife.profile.identityKey;
    const response=sim.manageSite(id,action,site.foundingRevision);assert.ok(response.ok,response.message);
    const restored=region(JSON.stringify(sim.state)),survivor=restored.ctx.EarthCommunityLife.lookup(restored.w,id);
    assert.equal(restored.w.communityLife.profile.identityKey,identity);
    assert.equal(restored.ctx.EarthCommunityLife.lookup(restored.w,other.id).funds,otherFunds);
    if(action==='delete')assert.equal(Boolean(survivor),false);
    else{
      assert.equal(survivor.population,site.population);assert.equal(survivor.materials,8);assert.equal(survivor.funds,16);
      assert.equal(JSON.stringify(survivor.growth?.households),JSON.stringify(site.growth?.households));
      assert.equal(JSON.stringify(survivor.birthNames),JSON.stringify(site.birthNames));
    }
    restored.production();restored.week();restored.save();
  }
});

test('the regional clock gives each half-day ten real minutes and returns to normal after a targeted sunrise',async()=>{
  const {ctx,sim,w,elapse,save}=region(),clock=ctx.EarthDayClock;
  assert.equal(clock.read(w).label,'6:00 AM');
  elapse(300000);assert.equal(clock.read(w).label,'12:00 PM');
  elapse(299999);assert.equal(clock.read(w).night,false);
  elapse(1);assert.equal(clock.read(w).label,'6:00 PM');assert.equal(clock.read(w).night,true);
  const before=clock.now(w);
  assert.ok((await sim.perform('setWorldPace',12)).ok);assert.equal(clock.now(w),before);
  elapse(25000);assert.equal(clock.read(w).label,'12:00 AM');
  assert.ok((await sim.perform('setWorldPace','sunrise')).ok);
  elapse(9999);assert.equal(clock.read(w).rate,30);assert.equal(clock.read(w).night,true);
  elapse(1);assert.equal(clock.read(w).rate,1);assert.equal(clock.read(w).label,'6:00 AM');
  const fresh=JSON.parse(save());delete fresh.dayClock;
  const reopened=region(JSON.stringify(fresh));assert.equal(reopened.ctx.EarthDayClock.read(reopened.w).label,'6:00 AM');
  assert.equal(reopened.sim.active().id,sim.active().id);
});
test('overnight games use six seats, saved guests and paired scores, and release residents at sunrise',()=>{
  const {ctx,w,market,elapse,save,production}=region(),life=ctx.EarthNightlife,clock=ctx.EarthDayClock;
  elapse(clock.half);production();
  const list=life.guests(w,market,clock.read(w)),tables=life.tables(w,market,clock.read(w));
  assert.equal(tables.length,3);assert.ok(tables.some(t=>t.pair.length===2));
  assert.ok(tables.every(t=>t.points.every(p=>p>=1&&p<=5)));
  assert.equal(new Set(list.map(p=>p.id)).size,list.length);
  assert.equal(new Set(list.map(p=>p.venue+'/'+p.seat)).size,list.length);
  const persisted=JSON.parse(save()).communityLife.outposts.find(s=>s.id===market.id).nightlife;
  assert.deepEqual(persisted,JSON.parse(JSON.stringify(market.nightlife)));
  const visitor=list[0];market.communityLife.away[visitor.id]={week:w.week};
  assert.ok(!life.guests(w,market,clock.read(w)).some(row=>row.id===visitor.id));
  delete market.communityLife.away[visitor.id];
  elapse(clock.half);assert.equal(life.guests(w,market,clock.read(w)).length,0);
});

test('bases commission and train units against the selected treasury, and reject duplicate or unfunded orders',()=>{
  const {sim,w,ctx,market,save}=region(),home=sim.active(),base=ctx.EarthMilitaryBase;
  const order=q=>sim.baseOrder({site:market.id,generation:market.foundingRevision||0,...q});
  const own=[home.food,home.materials,home.funds];
  market.materials=0;
  assert.equal(order({action:'enlist',type:'scout'}).ok,false);
  assert.equal(market.militaryBase,undefined);
  market.materials=30;market.funds=30;
  const funds=market.funds;
  assert.ok(order({action:'research',type:'armour'}).ok);
  const b=market.militaryBase;assert.equal(b.units[0].type,'tank');assert.equal(market.funds,funds-7);
  assert.equal(order({action:'research',type:'armour'}).ok,false);
  assert.ok(order({action:'enlist',type:'guard'}).ok);
  assert.equal(order({action:'enlist',type:'jet'}).ok,false);
  assert.ok(order({action:'train',id:b.units[1].id}).ok);
  assert.equal(b.units[1].grade,1);
  assert.equal(order({action:'enlist',type:'guard',version:1}).ok,false);
  assert.deepEqual([home.food,home.materials,home.funds],own);
  assert.equal(base.ready(w,market).length,2);save();
});

test('mixed base expeditions travel, fight the selected town, return to service, and obey a ceasefire',()=>{
  const run=region(),{sim,w,ctx,market,save}=run,home=sim.active(),base=ctx.EarthMilitaryBase;
  home.materials=40;home.funds=60;
  const order=q=>sim.baseOrder({site:home.id,generation:home.foundingRevision||0,...q});
  for(const type of ['flight','armour'])assert.ok(order({action:'research',type}).ok);
  const ids=home.militaryBase.units.map(u=>u.id);
  assert.ok(order({action:'dispatch',order:'attack',ids,target:market.id}).ok);
  assert.equal(ctx.EarthBorderConflict.relation(w,home.id,market.id).state,'war');
  assert.equal(order({action:'dispatch',order:'scout',ids,target:market.id}).ok,false);
  assert.equal(base.ready(w,home).length,0);
  assert.ok(ctx.EarthRegionalWorld.travellers(w,home).some(a=>a.kind==='military'&&a.destination===market.name));
  const reopened=region(save());assert.equal(reopened.sim.active().militaryBase.missions.length,1);
  for(let i=0;i<25&&home.militaryBase.missions.length;i++)run.production();
  assert.ok(home.militaryBase.log.some(e=>e.text.includes('captured the military base')));
  assert.equal(market.communityLife.border.occupiedBy,home.id);assert.equal(base.ready(w,home).length,2);
  assert.ok(order({action:'dispatch',order:'attack',ids,target:market.id}).ok);
  for(const action of ['negotiate','accept'])assert.ok(sim.diplomacy({home:home.id,target:market.id,action}).ok);
  assert.equal(market.communityLife.border.occupiedBy,undefined);
  assert.equal(home.militaryBase.missions[0].phase,'returning');run.production();save();
});

test('a reinforcement changes defence until recalled; a restarted destination releases deployed assets',()=>{
  const run=region(),{w,sim,ctx,market,save}=run,s=sim.active(),base=ctx.EarthMilitaryBase;
  const order=q=>sim.baseOrder({site:s.id,generation:s.foundingRevision||0,...q});
  if(ctx.EarthBorderConflict.relation(w,s.id,market.id)?.state==='war'){
    for(const action of ['negotiate','accept'])assert.ok(sim.diplomacy({home:s.id,target:market.id,action}).ok);
  }
  assert.ok(order({action:'enlist',type:'engineer'}).ok);
  const ids=[s.militaryBase.units[0].id];
  assert.ok(order({action:'dispatch',target:market.id,order:'assist',ids}).ok);
  for(let i=0;i<20&&s.militaryBase.missions[0]?.phase!=='stationed';i++)run.production();
  const mission=s.militaryBase.missions[0];assert.equal(mission.phase,'stationed');
  const before=base.defence(w,market);
  assert.ok(order({action:'recall',id:mission.id}).ok);assert.equal(before-base.defence(w,market),5);
  assert.ok(sim.manageSite(market.id,'restart',market.foundingRevision||0).ok);
  assert.equal(sim.active().militaryBase.missions.length,0);
  assert.ok(ctx.CommonEarthSim.readSave(JSON.stringify(sim.state)));
});

test('a purchased time machine opens a historical branch while keeping the original expedition and stores recoverable',async()=>{
  const {ctx,elapse}=region();
  for(const name of ['time-machine','saves'])vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),ctx,{filename:name+'.js'});
  const mem=new Map(),storage={get length(){return mem.size;},key:i=>[...mem.keys()][i],getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
  const book=ctx.EarthSaves.open({storage,session:null}),sim=book.sim;
  assert.ok(sim.found(place).ok);
  const source=book.current().id,s=sim.active(),target=sim.state.communityLife.outposts[0].id;
  const order=q=>sim.perform('baseOrder',{site:s.id,generation:s.foundingRevision||0,...q});
  const first=(await book.moments()).find(m=>m.kind==='origin');assert.ok(first);
  assert.equal((await book.rewind(s.id,first)).ok,false);
  s.materials=30;s.funds=30;
  assert.ok((await order({action:'research',type:'time'})).ok);assert.ok((await order({action:'enlist',type:'guard'})).ok);
  const funds=s.funds;assert.ok((await book.markMoment(s.id)).ok);
  assert.ok((await order({action:'dispatch',order:'attack',ids:[s.militaryBase.units[0].id],target})).ok);
  elapse(150000);
  const beforeWar=(await book.moments()).find(m=>m.kind==='order');
  assert.ok((await book.rewind(s.id,beforeWar)).ok);assert.notEqual(book.current().id,source);
  assert.equal(sim.active().militaryBase.missions.length,0);assert.equal(sim.active().funds,funds);
  assert.equal(ctx.EarthDayClock.read(sim.state).label,beforeWar.label);
  assert.ok((await order({action:'enlist',type:'scout'})).ok);
  await book.select(source);assert.equal(sim.active().militaryBase.units.length,1);assert.equal(sim.active().militaryBase.missions.length,1);
  book.dispose();
});
