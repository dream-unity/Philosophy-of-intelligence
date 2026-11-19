'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const coastal={name:'Bay Settlement',lat:-6.1622,lon:39.1922,coastal:true};
const dry={name:'Desert District',lat:24,lon:27,water:false};
function game(place=coastal,restored,clock=1000000){
  class LocalDate extends Date{static now(){return clock;}}
  const runtime=vm.createContext({Date:LocalDate,structuredClone,console});
  runtime.window=runtime;
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const [,module] of html.matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,module+'.js'),'utf8'),runtime,{filename:module+'.js'});
    if(module==='simulation')break;
  }
  const sim=runtime.CommonEarthSim.create({snapshot:restored,storage:null});
  if(!sim.active())assert.ok(sim.found(place).ok);
  return {runtime,sim,get home(){return sim.active();},snapshot(){return JSON.stringify(sim.state);},
    async step(ms=24000){
      clock+=ms;
      const result=await sim.perform('production',sim.state.productionSerial||0,()=>true);
      assert.ok(result.ok,result.message);return clock;
    }};
}
const stocks=t=>({food:t.food,materials:t.materials,funds:t.funds});
const wealth=t=>t.funds+(t.exchange?.till??8)+(t.growth.broker?.cash||0)+Object.values(t.purses?.people||{}).reduce((n,p)=>n+p.balance,0)+
  t.growth.households.reduce((n,h)=>n+(h.businessFunds||0)+(h.order?h.order.dues+h.order.wage:0),0)+(t.growth.road?2:0);
const net=(rows,account,good)=>rows.filter(r=>r.good===good).reduce((n,r)=>n+(r.to===account?r.amount:0)-(r.from===account?r.amount:0),0);
const accountNames={funds:'Community treasury',materials:'Public building store',food:'Public pantry'};
function cashInRegion(world){
  const sites=[...world.sites,...world.communityLife.outposts];
  const regionalEscrow=Object.values(world.regionalWorld?.regions||{}).flatMap(r=>Object.values(r.trips)).reduce((n,t)=>n+t.kit.funds,0);
  return sites.reduce((n,t)=>n+(t.growth?wealth(t):t.funds+(t.exchange?.till??8)),regionalEscrow);
}

test('calendar-only play opens funded livelihoods in new and existing unvisited settlements',()=>{
  const first=game(dry),saved=first.snapshot(),again=game(dry,saved);
  const home=again.home.id,week=again.sim.state.week;
  assert.equal(again.home.growth,undefined);
  assert.ok(again.sim.advance().ok);
  assert.equal(again.sim.state.week,week+1);assert.equal(again.sim.state.activeId,home);
  for(const site of [again.home,...again.sim.state.communityLife.outposts]){
    assert.equal(site.growth.round,1);
    assert.ok(Object.values(site.purses.people).some(p=>p.productionIncome>0));
    const logs=again.runtime.EarthDistrictGrowth.transfers(site.growth.history[0]);
    assert.ok(logs.some(t=>t.to==='Order escrow'));
    const paid=logs.find(t=>t.reason==='Wage on delivery');assert.ok(paid);
    assert.ok(logs.some(t=>t.workId===paid.workId&&t.reason==='Collected at source'));
    assert.ok(logs.some(t=>t.workId===paid.workId&&t.to==='Order escrow'&&t.good==='funds'));
  }
  assert.ok(again.runtime.CommonEarthSim.readSave(again.snapshot()));
});

test('a rotating regional economy reconciles advances, wages, public stores and research costs every round',async()=>{
  for(const place of [coastal,dry]){
    const g=game(place),sites=[g.home,...g.sim.state.communityLife.outposts],growth=g.runtime.EarthDistrictGrowth;
    let sales=0,roads=0,delivered=0,built=0;
    for(let i=0;i<50;i++){
      const beforeWealth=cashInRegion(g.sim.state);
      let external=0,capital=0;
      await g.step();
      sites.forEach((site,index)=>{
        const last=site.growth.history[0],rows=growth.transfers(last);
        // Regional expeditions booked after the local shift have a separate
        // manifest. The economic round reports only its own transactions.
        for(const [good,name] of Object.entries(accountNames))assert.equal(net(rows,name,good),last[good],site.name+' '+good+' round '+last.round);
        external-=net(rows,'Incoming freight manifest','funds');
        capital+=rows.filter(t=>t.good==='funds'&&['Vehicle commissioning','Opening cost','Research adopted by the local council'].includes(t.reason)).reduce((n,t)=>n+t.amount,0);
        delivered+=rows.filter(t=>t.reason==='Wage on delivery').length;
        sales+=rows.filter(t=>t.reason==='Retail payment').length;
        roads+=rows.filter(t=>t.reason==='Laid the road').length;
        built+=rows.filter(t=>t.reason==='Construction completed').length;
      });
      assert.equal(cashInRegion(g.sim.state)-beforeWealth,external-capital,place.name+' regional cash including travel reserves, round '+i);
    }
    assert(delivered>30);assert(roads>0);assert(built>0);assert(sales>0);
    assert(g.runtime.CommonEarthSim.readSave(g.snapshot()));
  }
});

test('a fisher reserves the shared line, takes fish at the quay and receives the held wage on delivery after reload',async()=>{
  let g=game(),candidate,site;
  for(let i=0;i<18&&!candidate;i++){
    await g.step(12001);
    for(const s of [g.home,...g.sim.state.communityLife.outposts]){
      const h=s.growth.households.find(h=>h.order?.resource==='fish'&&h.order.phase==='collect');
      if(h){site=s;candidate={...h.order};break;}
    }
  }
  assert.ok(candidate,'a waterfront resident voluntarily chose fishing');
  const id=candidate.person,siteId=site.id,openingPurse=site.purses?.people[id]?.balance||0,startingFish=g.runtime.EarthFisheries.ground(site,g.sim.state.week).available;
  const pose={actor:'other',siteId,mode:'walk',x:11.4,y:24};
  if(!site.buildings.some(b=>b.kind==='fishingDock'))assert.match(g.runtime.EarthFisheries.offer(site,g.sim.state.week,pose,Date.now()).text,/booked the shared handline/);
  const snap=g.snapshot();g=game(coastal,snap,candidate.at);
  site=[g.home,...g.sim.state.communityLife.outposts].find(t=>t.id===siteId);
  assert.deepEqual({...site.growth.households.find(h=>h.order?.id===candidate.id).order},candidate);
  const current=()=>site.growth.households.find(h=>h.order?.id===candidate.id)?.order;
  for(let i=0;i<8&&current()?.phase==='collect';i++)await g.step(12001);
  const loaded=current();assert.equal(loaded?.phase,'deliver');assert(loaded.cargo>0);
  assert(g.runtime.EarthFisheries.ground(site,g.sim.state.week).available<=startingFish-loaded.cargo);
  assert.equal(site.purses?.people[id]?.balance||0,openingPurse);
  while(current())await g.step(12001);
  const paid=site.growth.history.flatMap(h=>Array.from(g.runtime.EarthDistrictGrowth.transfers(h))).filter(t=>t.workId===candidate.id&&t.reason==='Wage on delivery');
  assert.equal(paid.length,1);assert.equal(paid[0].personId,id);assert.equal(paid[0].amount,candidate.wage);
  const still=g.snapshot();assert.ok(g.runtime.CommonEarthSim.readSave(still));
  const stale=await g.sim.perform('production',g.sim.state.productionSerial-1,()=>true);assert.equal(stale.ok,false);
  assert.equal(g.snapshot(),still);
});

test('a lost source refunds its advance and cannot pay a wage for undelivered goods',async()=>{
  const g=game(dry);await g.step();
  const site=g.home,before=g.snapshot(),h=site.growth.households.find(h=>h.order?.client==='public'&&g.runtime.EarthResources.isResource(h.order.resource));
  assert.ok(h);
  const order=h.order,field={id:order.resource,available:1000};
  const drained=g.runtime.EarthResources.harvestForProject(g.sim.state,site,field,1000,false);
  assert(drained.amount>0);
  const worker=g.runtime.EarthPersonas.profile(site,order.person),account=site.purses?.people?.[worker.id]?.balance||0;
  for(let i=0;i<10&&h.order?.id===order.id;i++)await g.step();
  const rows=site.growth.history.flatMap(r=>Array.from(g.runtime.EarthDistrictGrowth.transfers(r)));
  assert(rows.some(r=>r.workId===order.id&&r.reason==='Returned advance'&&r.to==='Community treasury'&&r.amount===order.wage));
  assert(!rows.some(r=>r.workId===order.id&&r.reason==='Wage on delivery'));
  assert.equal(site.purses?.people?.[worker.id]?.balance||0,account);
  const twin=game(dry,before,order.at),other=twin.home;
  for(let i=0;i<10&&!other.growth.history.some(round=>twin.runtime.EarthDistrictGrowth.transfers(round).some(t=>t.workId===order.id&&t.reason==='Wage on delivery'));i++)await twin.step();
  assert(other.growth.history.some(round=>twin.runtime.EarthDistrictGrowth.transfers(round).some(t=>t.workId===order.id&&t.reason==='Wage on delivery')));
});

test('old shop coordinates survive a new row of homes and remain unchanged after reopening',async()=>{
  const g=game();await g.step();const site=g.home,model=g.runtime.EarthDistrictGrowth;
  const original=site.growth.households[0];original.shop='basket';original.businessPlot=1;delete original.shopSite;
  const before={...model.shopPoint(site,1)},residents=model.members(site);
  model.register(site,Array.from({length:12},(_,i)=>({...residents[0],name:'Settler '+i,id:'new-'+i,identityKey:'test/deed-'+i})));
  assert.deepEqual({...model.shopPoint(site,1)},before);
  assert.equal(new Set(site.growth.households.map(h=>JSON.stringify(model.homePoint(site,h.plot)))).size,site.growth.households.length);
  for(const h of site.growth.households){const pos=model.homePoint(site,h.plot);assert(Math.hypot(pos.x-before.x,pos.y-before.y)>1.2,'new deeds leave the original shop frontage free');}
  assert(g.runtime.CommonEarthSim.readSave(g.snapshot()));
});

test('a recurring market gathering combines actual consignments and an attained development stage buys faster transport',async()=>{
  const a=game(),model=a.runtime.EarthDistrictGrowth;
  let district,source,advanced=false;
  for(let i=0;i<70&&!source;i++){
    await a.step();const towns=[a.home,...a.sim.state.communityLife.outposts];
    for(const t of towns){
      const g=t.growth;
      if(g.vehicle>0&&t.tech.length>0&&g.roads>0)advanced=true;
      const ongoing=g.households.filter(h=>h.order?.kind==='exchange'&&h.order.request===2);
      if(g.vehicle>0&&g.custom==='Market gathering'&&g.broker.parcel>=2&&ongoing.length){source=a.snapshot();district=t.id;}
    }
  }
  assert.ok(source,'A town adopted Market gathering and booked a combined delivery');
  assert(advanced,'Residents commissioned a transport upgrade after research and road construction');
  const b=game(coastal,source,a.sim.state.lastProductionAt);
  const locate=g=>[g.home,...g.sim.state.communityLife.outposts].find(t=>t.id===district);
  const t=locate(a),other=locate(b);
  other.growth.custom='';const worker=model.members(t).find(p=>model.work(t,p.id)?.orderGood==='exchange');
  assert(worker);const order=t.growth.households.find(h=>h.order?.person===worker.id).order;
  const before=model.work(t,worker.id);
  const normalTransport=other.growth.vehicle;other.growth.vehicle=0;
  if(normalTransport){const from={x:1.7,y:-1.39},to={x:15,y:23.48};assert(b.runtime.EarthDistrictOrders.movement(other,from,to)>a.runtime.EarthDistrictOrders.movement(t,from,to));}
  other.growth.vehicle=normalTransport;
  // A duplicate world, worker, stocks, route and time. Only the shared practice
  // changes the size of the next offer, and both offers reserve real inventory.
  let checked=false;
  for(const p of model.members(t)){
    const h=t.growth.households.find(h=>h.owner===p.identityKey),h2=other.growth.households.find(v=>v.owner===p.identityKey);
    if(!h||!h2||h.order||h2.order)continue;
    const aRows=[],bRows=[],prepare=(g,s,rows)=>g.runtime.EarthDistrictOrders.prepare(g.sim.state,s,g.runtime.EarthDistrictGrowth.members(s),rows);
    const quotes=prepare(a,t,aRows),otherQuotes=prepare(b,other,bRows);
    const broker=t.growth.broker.parcel,otherBroker=other.growth.broker.parcel;
    const ask=(g,s,h,offers,logs)=>g.runtime.EarthDistrictOrders.start(g.sim.state,s,p,h,{food:0,materials:0,funds:s.funds},offers,order.at,logs);
    const q=ask(a,t,h,quotes,aRows),r=ask(b,other,h2,otherQuotes,bRows);
    if(q?.kind==='exchange'&&r?.kind==='exchange'&&broker>=2){
      assert.equal(q.request,2);assert.equal(r.request,1);
      assert.equal(t.growth.broker.parcel,broker-2);assert.equal(other.growth.broker.parcel,otherBroker-1);checked=true;break;
    }
  }
  assert(checked,'a comparable carrier obtained a different offer under the custom');
});

test('an independent shop buys a raw lot and hires a different resident who makes and delivers saleable stock',async()=>{
  const g=game(),towns=[g.home,...g.sim.state.communityLife.outposts],model=g.runtime.EarthDistrictGrowth;
  const orders=new Map(),sales=[];
  for(let i=0;i<80;i++){
    await g.step();
    for(const s of towns){
      const round=s.growth.history[0],rows=model.transfers(round);
      for(const record of rows){const k=s.id+'/'+record.workId;
        if(record.reason==='Employer reserved the wage')orders.set(k,{employer:record.personId,id:record.workId,town:s.id,reserved:record.amount,receipts:[]});
        if(record.reason==='Retail payment')sales.push({town:s.id,round:round.round,seller:record.to});
      }
      for(const record of rows){
        const book=orders.get(s.id+'/'+record.workId);if(!book)continue;
        book.receipts.push({...record,round:round.round});
        if(record.reason==='Wage on delivery')book.worker=record.personId;
      }
    }
  }
  const story=[...orders.values()].find(o=>{
    const shelf=o.receipts.find(r=>r.reason==='Employer received commissioned stock');
    return shelf&&o.worker&&o.worker!==o.employer&&sales.some(s=>s.town===o.town&&shelf.to===s.seller+'’s shop'&&s.round>=shelf.round);
  });
  assert(story,'the named worker received an escrowed wage and the shop sold stock');
  assert(story.receipts.some(t=>t.reason==='Used the reserved input at the workbench'));
  assert(story.receipts.some(t=>t.reason==='Reserved workshop input'));
  assert(story.receipts.some(t=>t.reason==='Finished commissioned stock'));
  assert.equal(story.receipts.find(r=>r.reason==='Wage on delivery').amount,story.reserved);
  assert(g.runtime.CommonEarthSim.readSave(g.snapshot()));
});
