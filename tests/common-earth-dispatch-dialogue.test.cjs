'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function district(){
  const c=vm.createContext({});c.window=c;
  for(const name of ['personas','careers','local-projects','autonomy','dialogue','agency','market','fleet','community-effects','simulation'])
    vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),c,{filename:name+'.js'});
  const sim=c.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19,water:true}).ok);
  const site=sim.active(),w=sim.state;
  const pose=(at,mode='walk',extra={})=>({siteId:site.id,actor:c.EarthAgency.actorId(site),x:at.x,y:at.y,mode,truck:{x:at.x,y:at.y},...(mode==='drive'?{vehicle:'truck'}:{}),...extra});
  const drive=(action,at,mode='walk',extra={})=>{
    const q=sim.truckView();return sim.useTruck({actorId:q.actorId,siteId:q.siteId,generation:q.generation,week:q.week,serial:q.serial,action},()=>pose(at,mode,extra));
  };
  const talk=(id,topic,extra={})=>sim.converse(id,topic,()=>({siteId:site.id,actor:c.EarthAgency.actorId(site),mode:'walk',target:id,x:5,y:5,tx:5.8,ty:5,...extra}));
  const play=id=>{
    const d=c.EarthFleet.depot;
    return sim.changeActor(id,()=>pose(d,'walk',{targetPose:{id,mode:'walk',...d}}));
  };
  const read=()=>assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));
  return {sim,c,site,w,drive,pose,talk,play,read,depot:c.EarthFleet.depot};
}
const stock=(site,good)=>good==='funds'?site.exchange.till:site.exchange.shelf[good];

test('each trade speaks in its own voice and a remembered question belongs to the actual pair',()=>{
  const t=district(),residents=t.c.EarthPersonas.list(t.site).filter(p=>p.id!=='steward');
  const original=JSON.stringify(t.w),replies=new Set();
  for(const p of residents){
    const r=t.talk(p.id,'news');
    assert.equal(r.ok,true);assert.match(r.message,new RegExp('^'+p.name+' ·'));
    replies.add(r.message.substring(r.message.indexOf('“')));
  }
  assert.equal(replies.size,residents.length);assert.equal(JSON.stringify(t.w),original);
  const id=t.site.residents[1].id;
  assert.equal(t.talk(id,'listen',{tx:10}).ok,false);assert.equal(t.talk(id,'followup').ok,false);
  assert.equal(t.talk(id,'listen').changed,true);
  const revision=t.w.actionRevision;
  assert.equal(t.talk(id,'listen').changed,undefined);assert.equal(t.w.actionRevision,revision);
  assert.match(t.talk(id,'followup').message,/week 1/);
  assert.ok(t.c.EarthDialogue.familiar(t.site,'steward',id,1));
  assert(t.play('walker-1').ok);
  assert.equal(t.talk(id,'followup').ok,false);assert(t.talk(id,'listen').changed);
  t.read();
  const invalid=JSON.parse(JSON.stringify(t.w));
  invalid.sites[0].agency.visits.push({...invalid.sites[0].agency.visits[0]});
  assert.equal(t.c.CommonEarthSim.readSave(JSON.stringify(invalid)),null);
});

test('the actual transport employee can check out finite stock, unload only once, and return the truck',()=>{
  const t=district();assert(t.play('driver').ok);
  const first=t.sim.truckView(),good=first.next.good,startQty=t.site[good];
  const startingMarket=t.c.EarthMarket.view(t.w,t.site),initial=good==='funds'?startingMarket.till:startingMarket.shelf[good];
  assert.match(first.role,/employee/);
  assert.equal(t.drive('checkout',{x:4,y:4},'walk',{truck:t.depot}).ok,false);
  assert(t.drive('checkout',t.depot).ok);t.read();
  assert.equal(t.site.fleet.custody.stock,good);assert.equal(stock(t.site,good),initial-1);
  assert.equal(t.site[good],startQty);
  const old=t.sim.truckView(),req={actorId:old.actorId,siteId:old.siteId,generation:old.generation,week:old.week,serial:old.serial,action:'deliver'};
  assert.equal(t.sim.useTruck(req,t.pose(old.next,'drive',{vehicle:'publicVan'})).ok,false);
  assert.equal(t.sim.useTruck(req,t.pose({x:0,y:0},'drive')).ok,false);
  assert(t.sim.useTruck(req,t.pose(old.next,'drive')).ok);
  assert.equal(t.sim.useTruck(req,t.pose(old.next,'drive')).ok,false);
  assert.equal(t.site[good],startQty+1);assert.equal(t.site.fleet.custody.stock,undefined);t.read();
  assert(t.drive('return',t.depot,'drive').ok);
  assert.equal(t.drive('checkout',t.depot).ok,false);
  assert.equal(t.site.fleet.custody,undefined);t.read();
});

test('during a shortage each neighbour speaks for their own work, including two people on different garden runs',()=>{
  const t=district();t.site.food=0;
  t.site.buildings.push({kind:'workshop',plot:4},{kind:'garden',plot:3},{kind:'garden',plot:5});
  const people=t.c.EarthPersonas.list(t.site).filter(p=>p.id!=='steward');
  const words=people.map(p=>{
    const result=t.talk(p.id,'news');assert(result.ok);return result.message.split(' · ')[1];
  });
  assert.equal(new Set(words).size,people.length);
  assert.match(t.talk('carrier-4-3','news').message,/workshop on lot 5 to the garden on lot 4/);
  assert.match(t.talk('carrier-4-5','news').message,/workshop on lot 5 to the garden on lot 6/);
});

test('ordinary employees can cancel a loaded run or let dispatch recover it, without losing reserved stock',()=>{
  const t=district();assert(t.play('driver').ok);
  assert(t.drive('checkout',t.depot).ok);
  const good=t.site.fleet.custody.stock,afterLoad=stock(t.site,good);
  assert(t.drive('return',t.depot,'drive').ok);assert.equal(stock(t.site,good),afterLoad+1);
  assert(t.drive('checkout',t.depot).ok);const held=t.site.fleet.custody;
  t.w.week+=2;t.c.EarthFleet.tick(t.w,t.site);
  assert.equal(t.site.fleet.custody,undefined);assert.equal(stock(t.site,good),afterLoad+1);
  assert.match(t.site.fleet.records[0].text,/back to the market/);t.read();
  assert(held.token>=1);
});

test('taking the blue truck affects the original driver, the district treasury, and future permissions',()=>{
  const t=district();const trust=t.site.trust,funds=t.site.funds;
  assert.equal(t.drive('checkout',t.depot).ok,false);
  assert.equal(t.drive('take',t.depot,'drive',{vehicle:'van'}).ok,false);
  assert(t.drive('take',t.depot).ok);assert.equal(t.site.trust,trust-4);
  assert.equal(t.site.fleet.custody.stock,undefined);
  assert.match(t.talk('driver','news').message,/missed a pickup/);
  t.w.week++;t.c.EarthFleet.tick(t.w,t.site);
  assert.equal(t.site.funds,funds-1);assert.equal(t.site.fleet.custody,undefined);t.read();
  assert.equal(t.drive('enrol',t.depot).ok,false);const effort=t.w.effort;
  assert(t.drive('repair',t.depot).ok);assert.equal(t.w.effort,effort-1);assert.equal(t.site.trust,trust-2);
  assert(t.drive('enrol',t.depot).ok);const ready=t.site.fleet.roster.steward.ready;
  assert(ready>t.w.week);assert.equal(t.drive('checkout',t.depot).ok,false);
  t.w.week=ready;assert(t.drive('checkout',t.depot).ok);t.read();
});

test('a named autonomous driver only takes real stock to a shortage and a stale parcel cannot pay twice',()=>{
  const t=district();t.site.food=1;
  const q=t.sim.regularTruckView(),at={siteId:t.site.id,driverId:'driver',stop:q.next.name,mode:'service',attended:true,x:q.next.x,y:q.next.y+.3};
  assert(q.available);
  assert.equal(t.sim.regularTruck(q,()=>({...at,stop:'Assembly stop'})).ok,false);
  assert.equal(t.sim.regularTruck(q,()=>({...at,attended:false})).ok,false);
  assert.equal(t.sim.regularTruck(q,()=>({...at,x:0})).ok,false);
  assert(t.sim.regularTruck(q,()=>at).ok);assert.match(t.site.fleet.records[0].text,new RegExp(t.site.residents[0].name));
  assert.equal(t.site.food,2);assert.equal(t.sim.regularTruck(q,()=>at).ok,false);
  assert.equal(t.c.EarthFleet.closeWeek(t.w,t.site).length,0);t.read();
  t.w.week++;assert(t.play('driver').ok);
  assert.equal(t.sim.regularTruckView().available,false);
  assert.equal(t.c.EarthFleet.closeWeek(t.w,t.site).length,0);t.read();
});

test('a visible work gesture, and a past supply contribution, belong to the people who actually performed them',()=>{
  const t=district(),joiner='walker-1',farmer=t.site.residents[0].id,helper='walker-3';
  const profile=t.c.EarthPersonas.profile(t.site,joiner),observed={id:joiner,label:'Checking measurements',phase:'work'};
  assert.match(t.talk(joiner,'work',{activity:observed}).message,/I was checking measurements/);
  assert.doesNotMatch(t.talk(farmer,'work',{activity:observed}).message,/I was checking measurements/);
  assert.equal(t.talk(joiner,null).ok,false);
  t.site.autonomy={week:1,people:{},effects:{},projects:{notes:0,assists:0,owners:{},completed:[{
    ownerId:farmer,serial:2,kind:'food',variant:0,axis:'care',week:1,partnerId:helper,beneficiaryId:null,
    result:'The pantry received 3 food using '+profile.name+'’s carrier.',delivered:3,input:{kind:'carrier',ownerId:joiner}
  }]}};
  const before=JSON.stringify(t.site);
  for(const id of [joiner,farmer,helper]){
    const history=t.c.EarthCommunityEffects.view(t.w,t.site,id);assert.equal(history.length,1);
    assert.deepEqual(Array.from(history[0].people,p=>p.id).sort(),[farmer,helper,joiner].sort());
    assert.match(history[0].result,/3 food/);
  }
  assert.equal(t.c.EarthCommunityEffects.view(t.w,t.site,'walker-0').length,0);assert.equal(JSON.stringify(t.site),before);t.read();
  delete t.site.autonomy.projects.completed[0].input;
  assert.equal(t.c.EarthCommunityEffects.view(t.w,t.site,joiner).length,0,'older anonymous equipment cannot identify its maker without a receipt');
  t.site.autonomy.projects.completed[0].input={kind:'carrier',ownerId:'missing'};
  assert.equal(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)),null);
});
