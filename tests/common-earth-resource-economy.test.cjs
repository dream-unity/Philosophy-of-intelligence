'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const root={lat:46,lon:12,name:'Upland',water:false};
function open(point=root,extras=[]){
  const c=vm.createContext({structuredClone,Date});c.window=c;
  for(const name of ['resource-economy','fisheries','agency','provisions','market',...extras,'simulation'])
    vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),c,{filename:name});
  const sim=c.CommonEarthSim.create({storage:null});
  assert.equal(sim.found(point).ok,true);
  const s=sim.active(),w=sim.state;
  const current=()=>sim.marketView();
  function intent(action,good){
    const m=current(),local=m.local,option=local.options.find(o=>o.action===action&&o.good===good);
    assert.ok(option,action+' '+good+' is part of the local economy');
    const r={action,good,week:m.week,generation:m.generation,siteId:m.siteId,actorId:m.actorId,serial:m.serial,
      resourceSerial:local.serial,price:option.price};
    const x=option.venue.type==='quay'?8:15,y=option.venue.type==='quay'?24:23;
    const scene={siteId:m.siteId,actor:m.actorId,mode:'walk',
      target:option.venue.residentId||option.venue.type,x,y,tx:x,ty:y};
    return {r,scene,option};
  }
  function act(action,good){
    const {r,scene}=intent(action,good);return sim.exchange(r,scene);
  }
  return {c,sim,s,w,current,intent,act};
}
const ok=res=>assert.equal(res.ok,true,res.message);
const no=res=>assert.equal(res.ok,false,res.message);
const rows=t=>t.current().local.rows;
const row=(t,id)=>rows(t).find(row=>row.id===id);
const raw=value=>JSON.parse(JSON.stringify(value));

test('founding surveys distinguish marine, freshwater, inland, dryland and protected agriculture',()=>{
  for(const [point,expected,forbidden] of [
    [root,['grain','timber','stone'],['kelp']],
    [{lat:23,lon:16,name:'Drylands'},['pulses','clay','stone'],['fruit','kelp']],
    [{lat:70,lon:27,name:'Northern settlement'},['mushrooms','stone'],['timber','kelp']],
    [{lat:-16,lon:75,name:'Open ocean',water:true},['kelp','salvage'],['stone','clay']],
    [{lat:-3,lon:32,name:'Lake Victoria',water:true},['reed','salvage'],['kelp','stone']],
    [{lat:-6.162,lon:39.191,name:'Stone Town'},['pulses','kelp','reed'],[]]
  ]){
    const t=open(point),survey=t.c.EarthResources.survey(t.s);
    assert.equal(survey.fish,Boolean(t.c.CommonEarthSim.waterfront(t.s)));
    for(const id of expected)assert.equal(row(t,id)?.local,true,id+' local at '+survey.habitat);
    for(const id of forbidden)assert.ok(!row(t,id)?.local,id+' absent at '+survey.habitat);
    if(t.s.water)assert.equal(row(t,'grain').local,false);
    t.s.buildings.push({kind:'garden'});
    assert.ok(row(t,'greens').local);
    t.sim.destroy();
  }
});

test('gathering needs the actual supplier or quay, conserves lots across sale and processing, and cannot replay a quote',()=>{
  const t=open(),{sim,s}=t,initial=s.food,first=t.intent('gatherLot','grain');
  no(sim.exchange(first.r,{...first.scene,target:'market'}));
  no(sim.exchange(first.r,{...first.scene,x:first.scene.x+4}));
  assert.equal(s.resourceLedger,undefined);
  ok(sim.exchange(first.r,first.scene));no(sim.exchange(first.r,first.scene));assert.equal(s.food,initial);
  assert.deepEqual([row(t,'grain').owned,row(t,'grain').standing],[2,6]);
  ok(t.act('gatherLot','pulses'));
  const finance=s.funds,till=s.exchange.till,merchant=row(t,'grain').shelf;
  const sale=t.intent('sellLot','grain');ok(sim.exchange(sale.r,sale.scene));
  assert.deepEqual([row(t,'grain').owned,row(t,'grain').shelf,s.funds,s.exchange.till],[1,merchant+1,finance+sale.r.price,till-sale.r.price]);
  ok(t.act('makeBatch','meal'));assert.equal(s.food,initial+3);assert.equal(row(t,'grain').owned,0);
  assert.equal(row(t,'pulses').owned,1);no(t.act('makeBatch','meal'));
  assert.match(s.exchange.history[0].text,/grain.*pulses.*pantry/);
  assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)));
  sim.destroy();
  const sea=open({lat:-6.162,lon:39.19,name:'Stone Town'}),shore=sea.intent('gatherLot','kelp');
  no(sea.sim.exchange(shore.r,{...shore.scene,y:16}));no(sea.sim.exchange(shore.r,{...shore.scene,mode:'boat'}));
  ok(sea.sim.exchange(shore.r,shore.scene));assert.equal(row(sea,'kelp').owned,2);sea.sim.destroy();
});

test('finite deposits deplete and seasonal beds regrow without crediting the pantry, even across skipped weeks',()=>{
  const t=open(),{s,w}=t,food=s.food,materials=s.materials;
  for(let i=0;i<9;i++)ok(t.act('gatherLot','stone'));
  assert.equal(row(t,'stone').standing,0);no(t.act('gatherLot','stone'));
  for(let i=0;i<3;i++)ok(t.act('gatherLot','fruit'));
  assert.equal(row(t,'fruit').standing,0);w.week++;
  assert.equal(row(t,'fruit').standing,2,'one spring week renews fruit');
  assert.equal(row(t,'stone').standing,0);assert.deepEqual([s.food,s.materials],[food,materials]);
  w.week=39;ok(t.act('gatherLot','fruit'));const beforeWinter=row(t,'fruit').standing;
  w.week=40;assert.equal(row(t,'fruit').standing,beforeWinter,'the northern orchard rests in winter');
  w.week=400;assert.equal(row(t,'fruit').standing,row(t,'fruit').cap);
  assert.equal(row(t,'stone').standing,0);t.sim.destroy();
});

test('imported products use merchant cash and stock, and a crew can choose an actual raw lot for a hungry household',()=>{
  const t=open({lat:-15,lon:96,name:'Marine settlement',water:true}),{c,s,w,sim}=t;
  assert.equal(row(t,'grain').local,false);
  const offered=t.intent('buyLot','grain'),initial=s.funds;
  s.funds=0;no(sim.exchange(offered.r,offered.scene));s.funds=initial;
  const initialShelf=row(t,'grain').shelf;ok(sim.exchange(offered.r,offered.scene));
  assert.equal(row(t,'grain').shelf,initialShelf-1);assert.equal(s.funds,initial-offered.r.price);
  assert.equal(s.exchange.till,8+offered.r.price);assert.equal(c.EarthResources.useForPantry(w,s,'grower'),null);
  s.food=1;const used=c.EarthResources.useForPantry(w,s,'grower');assert.equal(used.id,'grain');
  assert.equal(row(t,'grain').owned,0);assert.equal(s.food,1,'its project awards the household portion exactly once');
  assert.equal(c.EarthResources.useForPantry(w,s,'grower'),null);
  const actual=raw(w),predicted=raw(w);
  actual.week++;predicted.week++;c.EarthMarket.tick(actual,actual.sites[0]);c.EarthMarket.tick(predicted,predicted.sites[0]);
  assert.deepEqual(actual,predicted);
  const ticked=JSON.stringify(actual);c.EarthMarket.tick(actual,actual.sites[0]);assert.equal(JSON.stringify(actual),ticked);
  for(const corrupt of [d=>{d.bins.grain=-1;},d=>{d.shelf.grain=9;},d=>{d.fields.stone={left:99,week:1};},
    d=>{d.fields.fake={left:1,week:1};},d=>{d.lastWeek=8;}]){
    const broken=raw(w);corrupt(broken.sites[0].resourceLedger);assert.equal(c.CommonEarthSim.readSave(JSON.stringify(broken)),null);
  }
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('visitors cannot withdraw, harvest, process or ship a foreign district’s goods before the admission council accepts them',()=>{
  const t=open({lat:-18,lon:92,name:'Ocean Anchorage',water:true},['personas','community-life','partners','local-projects','careers','autonomy','purses']);
  const {sim,c,w}=t,home=sim.active(),dest=w.communityLife.outposts[0];let time=123456;
  c.Date=class extends Date{static now(){return time;}};
  function travel(action,target,at,who='steward'){
    const site=sim.active(),scene={siteId:site.id,actor:who,mode:'walk',target:at,x:10,y:10,tx:10,ty:10};
    return sim.communityLife({site:site.id,actor:who,week:w.week,action,target},scene);
  }
  for(const action of ['start','check','finish']){
    const choice=sim.purseView().options.find(o=>o.action===action);
    ok(sim.purseAction(choice.request,{siteId:home.id,mode:'walk',actor:'steward',target:choice.venue.residentId||'market',x:9,y:12,tx:9,ty:12}));
  }
  ok(t.act('gatherLot','salvage'));const original=raw(home.resourceLedger.bins);
  ok(travel('depart',dest.id,'market'));no(t.act('sellLot','salvage'));time+=8000;ok(travel('arrive',dest.id,'market'));
  assert.equal(sim.active().id,dest.id);assert.notEqual(w.communityLife.homeId,dest.id);
  assert.equal(home.purses.people.steward.balance,2,'exploring another district does not move the home ledger');
  const before=JSON.stringify(dest),publicBalance=sim.marketView();
  for(const [action,id] of [['gatherLot','salvage'],['buyLot','grain'],['sellLot','salvage'],['makeBatch','reclaim']]){
    const {r,scene}=t.intent(action,id);no(sim.exchange(r,scene));no(c.EarthMarket.run(w,dest,r,scene));
  }
  const pose={siteId:dest.id,mode:'walk',x:8,y:24,actor:'steward',target:'quay'};
  no(sim.useHandline(pose,'cast'));no(sim.fish(dest.id,()=>({...pose,mode:'boat'})));
  const pv=sim.provisionsView(),provision={siteId:dest.id,generation:pv.generation,actorId:pv.actorId,week:w.week,serial:pv.serial,action:'pack'};
  no(sim.provision(provision,pose));no(c.EarthProvisions.run(w,dest,provision,pose));
  no(sim.act('route:'+home.id));assert.equal(JSON.stringify(dest),before);
  assert.deepEqual(raw(home.resourceLedger.bins),original);assert.equal(publicBalance.rows[0].free,dest.food);
  const host=dest.residents[2].id;no(travel('apply',null,host));
  ok(travel('meet',null,host));ok(travel('help',null,'market'));ok(sim.advance());ok(travel('help',null,'market'));ok(travel('apply',null,host));
  assert.equal(w.communityLife.homeId,dest.id);
  assert.equal(home.purses.people.steward.balance,0);assert.equal(home.purses.people.steward.earned,2);
  assert.equal(dest.purses.people.steward.balance,4);assert.equal(dest.purses.people.steward.earned,0);
  assert.equal(dest.purses.people.steward.productionIncome,2);
  assert.ok(c.EarthPurses.validMoves(w));
  ok(t.act('gatherLot','salvage'));ok(t.act('makeBatch','reclaim'));
  assert.deepEqual(raw(home.resourceLedger.bins),original,'the move grants authority over the new stores, not its neighbours');
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('an independent host can refuse a freight pact; a signed route keeps its donors’ charter, promised goods and suspension rights',()=>{
  const t=open({lat:-6.162,lon:39.19,name:'Stone Town'},['personas','community-life']);
  const {sim,c,w}=t,home=sim.active(),away=w.communityLife.outposts[0];let time=45678;
  c.Date=class extends Date{static now(){return time;}};
  const visit=(action,target,at)=>{
    const s=sim.active();return sim.communityLife({site:s.id,actor:'steward',week:w.week,action,target},
      {siteId:s.id,actor:'steward',mode:'walk',target:at,x:15,y:23,tx:15,ty:23});
  };
  ok(visit('depart',away.id,'market'));time+=8000;ok(visit('arrive',away.id,'market'));ok(sim.visit(home.id));
  const routeId='route:'+away.id,terms=()=>sim.actions('routes').find(o=>o.id===routeId);
  const before=[home.funds,home.materials,away.routeLinks];
  assert.match(terms().reason,new RegExp(away.residents[2].name));no(sim.act(routeId));
  assert.deepEqual([home.funds,home.materials,away.routeLinks],before);assert.equal(w.routes.length,0);
  ok(sim.visit(away.id));ok(visit('meet',null,away.residents[2].id));ok(sim.visit(home.id));
  ok(sim.act('charter:care'));ok(sim.act('listen:'+home.residents[0].id));ok(sim.act('promise:'+home.residents[0].id));
  home.materials=5;no(sim.act(routeId));assert.match(terms().reason,/material/);home.materials=15;
  away.trust=20;assert.match(terms().reason,/trust/);no(sim.act(routeId));away.trust=55;
  ok(sim.act(routeId));const route=w.routes[0];assert.equal(route.accord.hostName,away.residents[2].name);
  const bad=raw(w);bad.routes[0].accord.hostId=home.residents[2].id;assert.equal(c.CommonEarthSim.readSave(JSON.stringify(bad)),null);
  const noWitness=raw(w);noWitness.routes[0].accord.hostName='Unknown signer';assert.equal(c.CommonEarthSim.readSave(JSON.stringify(noWitness)),null);
  const moved=raw(w),other=moved.sites.find(s=>s.id===away.id),oldWitness=other.residents[2];
  other.communityLife.away[oldWitness.id]=home.id;
  assert.equal(c.EarthCommunityLife.hostFor(other).id,other.residents[1].id);
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(moved)),'the former host signed before they left');
  home.food=7;home.materials=1;home.specialty='funds';home.population=5;
  away.food=0;away.materials=80;away.population=25;away.trust=10;
  ok(sim.advance());assert.ok(home.food<=9,'the donor cannot spare a shipment after its charter reserve and promise');
  assert.ok(route.shipments.every(s=>s.from!==home.id||s.good!=='food'));
  assert.ok(route.shipments.every(s=>s.from!==away.id||s.good!=='materials'),'a low-trust foreign donor with a surplus can withhold it');
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('autonomous growers use their actual week to cook real reserves, and traders exchange only surplus for finite merchant cash',()=>{
  const t=open(root,['personas','careers','local-projects','autonomy']),{sim,s,w,c}=t;
  ok(t.act('gatherLot','grain'));ok(t.act('gatherLot','pulses'));
  s.food=0;const originalGrain=row(t,'grain').owned,originalPulses=row(t,'pulses').owned,originalFunds=s.funds;
  w.week++;c.EarthAutonomy.settle(s,w);
  const cooks=Object.entries(s.autonomy.people).filter(([,r])=>r.history[0].kind==='marketSupply');
  assert.equal(cooks.length,1);assert.equal(cooks[0][1].history[0].activity,'prepare');
  assert.equal(s.food,3);assert.equal(row(t,'grain').owned,originalGrain-1);assert.equal(row(t,'pulses').owned,originalPulses-1);
  assert.equal(s.funds,originalFunds);assert.ok(c.EarthAutonomy.valid(s,w.week));
  assert.equal(c.EarthAutonomy.sessionSpent(s,cooks[0][0],w.week),true);
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));
  ok(t.act('gatherLot','timber'));ok(t.act('gatherLot','timber'));s.food=20;s.funds=1;s.materials=14;
  const trader=c.EarthPersonas.list(s).find(p=>/trader|courier|porter|driver/i.test(p.originRole));
  const self={id:trader.id,profile:trader,traits:trader.traits,free:true,row:{energy:6}},api=c.EarthMarket;
  assert.equal(api.resourceOpportunity(w,s,self),null,'the cooperative has already settled its market shift');
  w.week++;const sale=api.resourceOpportunity(w,s,self),cash=s.exchange.till,bins=row(t,'timber').owned,status=sale.option.price;
  assert.equal(sale.activity,'sell');const result=api.resourceWork(w,s,self);assert.match(result.reason,/treasury/);
  assert.deepEqual([s.funds,s.exchange.till,row(t,'timber').owned],[1+status,cash-status,bins-1]);
  assert.equal(api.resourceWork(w,s,self),null,'re-evaluating the same week cannot create a second unit or payment');
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});


test('cargo that only partly fits at the destination stays in transit until the final unit is received',()=>{
  const t=open(root),{sim,w}=t,home=sim.active();
  ok(sim.act('work:forage'));ok(sim.act('work:forage'));
  ok(sim.found({lat:-5,lon:90,water:true,name:'Passage'}));const dest=sim.active();
  ok(sim.act('route:'+home.id));const route=w.routes[0];
  const cargo={from:home.id,to:dest.id,good:'materials',due:w.week+1,amount:3};
  route.shipments.push(cargo);dest.materials=Number.MAX_SAFE_INTEGER-1;const initial=route.deliveries;
  ok(sim.advance());assert.equal(cargo.amount,2);assert.equal(cargo.due,w.week+1);assert.ok(route.shipments.includes(cargo));
  assert.equal(route.deliveries,initial);dest.materials=20;
  const otherDue=route.shipments.filter(s=>s!==cargo&&s.due<=w.week+1).length;
  ok(sim.advance());assert.ok(!route.shipments.includes(cargo));assert.equal(route.deliveries,initial+otherDue+1);
  assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('perishable lots age through sale and repurchase, the oldest lot leaves first, and stale berries reduce real raw stock',()=>{
  const t=open({lat:59,lon:15,name:'Woodland'}),{w,s,sim,c}=t;
  ok(t.act('gatherLot','berries'));assert.equal(row(t,'berries').binDate,3);
  assert.equal(row(t,'berries').owned,2);const pantry=s.food;
  assert.equal(c.EarthResources.expiringPublicLot(s,w.week),null);
  w.week=2;const unchanged=JSON.stringify(s);
  assert.deepEqual(raw(c.EarthResources.expiringPublicLot(s,w.week)),{label:'berries',amount:2,until:3});
  assert.equal(JSON.stringify(s),unchanged);
  ok(t.act('gatherLot','berries'));
  const sale=t.intent('sellLot','berries');ok(sim.exchange(sale.r,sale.scene));
  assert.deepEqual(raw(s.resourceLedger.dates.bins.berries),[{until:3,count:1},{until:4,count:2}]);
  assert.equal(row(t,'berries').stallDate,3);
  const purchase=t.intent('buyLot','berries');ok(sim.exchange(purchase.r,purchase.scene));
  assert.equal(row(t,'berries').owned,4);assert.equal(row(t,'berries').binDate,3,'trading does not refresh picked produce');
  assert.deepEqual(raw(s.resourceLedger.dates.bins.berries),[{until:3,count:2},{until:4,count:2}]);
  ok(t.act('makeBatch','berryjars'));assert.equal(s.food,pantry+2);assert.equal(row(t,'berries').binDate,4);
  assert.deepEqual(raw(s.resourceLedger.dates.bins.berries),[{until:4,count:2}]);
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));
  const dishonest=raw(w);dishonest.sites[0].resourceLedger.dates.bins.berries[0].count=3;
  assert.equal(c.CommonEarthSim.readSave(JSON.stringify(dishonest)),null);
  ok(sim.advance());assert.equal(row(t,'berries').owned,2);ok(sim.advance());assert.equal(row(t,'berries').owned,0);
  assert.deepEqual(raw(s.resourceLedger.lastLoss.bins),{berries:2});assert.equal(row(t,'berries').binDate,null);
  const waste=JSON.stringify(s.resourceLedger.lastLoss);assert.equal(c.EarthResources.ageStores(w,s),'');
  assert.equal(JSON.stringify(s.resourceLedger.lastLoss),waste);assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));
  sim.destroy();
});

test('a willing grower can cook a dated lot before spoilage even when the pantry already covers the week',()=>{
  const t=open({lat:59,lon:15,name:'Woodland'},['personas','careers','local-projects','autonomy']),{c,w,s,sim}=t;
  ok(t.act('gatherLot','berries'));const grower=c.EarthPersonas.list(s).find(p=>p.originRole==='Grower');
  const worker={id:grower.id,profile:grower,traits:grower.traits,row:{energy:7},free:true};
  assert.equal(c.EarthMarket.resourceOpportunity(w,s,worker),null);
  w.week++;const before=s.food,op=c.EarthMarket.resourceOpportunity(w,s,worker);assert.match(op.reason,/before next week/);
  assert.ok(c.EarthMarket.resourceWork(w,s,worker));assert.equal(row(t,'berries').owned,0);assert.equal(s.food,before+2);
  assert.equal(c.EarthMarket.resourceWork(w,s,worker),null);assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('one renewable lake ground supplies net crews and residents while an already cast handline keeps its fish through depletion or reload',()=>{
  const t=open({lat:-3,lon:32,water:true,name:'Lake Victoria'}),{c,sim,s,w}=t;
  let now=18000;c.Date=class extends Date{static now(){return now;}};
  s.buildings.push({kind:'fishingDock',id:'first-dock',name:'Fishing station',plot:0});
  const api=c.EarthFisheries,quay={siteId:s.id,actor:'steward',mode:'walk',target:'quay',x:8,y:24};
  assert.deepEqual(raw(api.ground(s,1)),{available:12,capacity:12,recovery:3,name:'Freshwater fishing ground'});
  const food=s.food,effort=w.effort;ok(sim.useHandline(quay,'cast'));assert.equal(api.ground(s,1).available,11);
  const old=raw(w);delete old.sites[0].fishGround;
  ok(sim.fish(s.id,()=>({...quay,mode:'boat'})));assert.equal(s.food,food+4);assert.equal(w.effort,Math.min(4,effort+1));
  assert.equal(api.ground(s,1).available,7);no(sim.fish(s.id,()=>({...quay,mode:'boat'})));
  for(const id of ['walker-0','walker-1','walker-2','walker-3','walker-4','driver',s.residents[0].id]){
    const activity=c.EarthResources.quickGather(w,s,id,true);assert.equal(activity.resource,'fish');
  }
  assert.equal(api.ground(s,1).available,0);assert.equal(c.EarthResources.quickGather(w,s,'walker-0'),null);
  now+=5000;assert.equal(sim.handlineOffer(quay).action,'land');ok(sim.useHandline(quay,'land'));
  assert.equal(s.food,food+5);assert.equal(s.provisions.landings.total,12);assert.equal(api.ground(s,1).available,0);
  const dry=sim.handlineOffer(quay);assert.equal(dry.action,'resting');assert.match(dry.text,/week 2/);no(sim.useHandline(quay,'cast'));
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));ok(sim.advance());assert.equal(api.ground(s,2).available,3);
  assert.equal(sim.handlineOffer(quay).action,'cast');assert.equal(sim.fishingOffer().available,false);
  s.buildings.push({kind:'wetland',id:'water-commons',name:'Water commons',plot:1});
  assert.equal(api.ground(s,3).recovery,4);assert.equal(api.ground(s,500).available,16);
  const malformed=raw(w);malformed.sites[0].fishGround.left=50;assert.equal(c.CommonEarthSim.readSave(JSON.stringify(malformed)),null);
  const restored=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(old)}),port=restored.active();
  assert.equal(api.ground(port,1).available,11);ok(restored.useHandline(quay,'land'));assert.equal(api.ground(port,1).available,11);
  assert.equal(restored.useHandline(quay,'land').ok,false);assert.ok(c.CommonEarthSim.readSave(JSON.stringify(restored.state)));
  restored.destroy();sim.destroy();
  const sea=open({lat:-16,lon:88,name:'Open water',water:true});assert.equal(sea.c.EarthFisheries.ground(sea.s,1).capacity,22);sea.sim.destroy();
});

test('repeated stripping depresses growth; actual compost restores an open field or a three-week closure binds every extractor',()=>{
  const t=open(),{s,w,c,sim}=t;
  for(let i=0;i<3;i++)ok(t.act('gatherLot','fruit'));
  w.week++;ok(t.act('gatherLot','fruit'));assert.equal(row(t,'fruit').pressureUntil,w.week+6);
  assert.equal(row(t,'fruit').renew,1);
  const expired=raw(w);expired.week+=6;
  c.EarthResources.ageStores(expired,expired.sites[0]);assert.ok(expired.sites[0].resourceLedger.compost>0);
  const before=row(t,'fruit').owned;ok(t.act('compostLot','fruit'));assert.equal(row(t,'fruit').owned,before-1);
  assert.equal(s.resourceLedger.compost,1);ok(t.act('dressSoil','fruit'));assert.equal(s.resourceLedger.compost,0);
  assert.equal(row(t,'fruit').renew,3);assert.equal(row(t,'fruit').reopens,null);w.week++;
  assert.equal(row(t,'fruit').standing,3);ok(t.act('gatherLot','fruit'));assert.equal(row(t,'fruit').standing,1);
  ok(t.act('gatherLot','timber'));const reviewed=c.EarthResources.projectCrop(w,s,'person','roots');
  ok(t.act('gatherLot','roots'));const shelf=row(t,'roots').shelf,held=row(t,'roots').owned;
  ok(t.act('restPatch','roots'));const start=w.week;
  no(t.act('gatherLot','roots'));assert.notEqual(c.EarthResources.projectCrop(w,s,'person','roots')?.id,'roots');
  assert.equal(c.EarthResources.harvestForProject(w,s,reviewed,1,true).amount,0,'an old project cannot harvest behind the closed gate');
  assert.deepEqual([row(t,'roots').shelf,row(t,'roots').owned],[shelf,held]);
  for(let i=1;i<=2;i++){w.week++;no(t.act('gatherLot','roots'));assert.equal(row(t,'roots').reopens,start+3);}
  w.week++;ok(t.act('gatherLot','roots'));no(t.act('restPatch','roots'));
  assert.equal(t.current().local.options.some(o=>o.good==='stone'&&o.action==='restPatch'),false);
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});

test('a willing grower takes a real session to protect worn beds while the pantry can cover the temporary closure',()=>{
  const t=open(),{s,w,c}=t;
  for(let i=0;i<3;i++)ok(t.act('gatherLot','fruit'));
  w.week++;ok(t.act('gatherLot','fruit'));s.food=18;
  const self={free:true,id:s.residents[0].id,traits:{initiative:70,patience:75},row:{energy:5},profile:{role:'Grower'}};
  const plan=c.EarthMarket.resourceOpportunity(w,s,self);assert.equal(plan.activity,'tendPatch');
  const result=c.EarthMarket.resourceWork(w,s,self,plan);assert.equal(result.resource,'fruit');
  assert.equal(row(t,'fruit').reopens,w.week+3);assert.equal(c.EarthMarket.resourceOpportunity(w,s,self),null);
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));t.sim.destroy();
});

test('dryland millet and traded water support irrigation while shellfish beds require a reachable coast or constructed marine dock',()=>{
  const t=open({lat:24,lon:27,name:'Dryland'}),{sim,s,w,c}=t;
  assert.equal(row(t,'millet').local,true);assert.equal(row(t,'water').local,false);assert.equal(row(t,'shellfish'),undefined);
  ok(t.act('gatherLot','millet'));no(t.act('irrigate','millet'));ok(t.act('buyLot','water'));
  const wallet=s.funds;ok(t.act('irrigate','millet'));assert.equal(row(t,'water').owned,0);assert.equal(s.funds,wallet);
  assert.equal(row(t,'millet').renew,3);assert.equal(row(t,'millet').reopens,null);assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
  const sea=open({lat:-12,lon:80,name:'Open ocean',water:true});assert.equal(row(sea,'shellfish'),undefined);
  sea.s.buildings.push({kind:'fishingDock',plot:3});assert.equal(row(sea,'shellfish').local,true);sea.sim.destroy();
});

test('public price comparison uses the executable one-lot terms, dated inventory and real merchant and treasury limits',()=>{
  const t=open({lat:59,lon:15,name:'Woodland'}),{w,s,sim}=t;
  const prices=()=>t.current().local.prices.find(q=>q.id==='berries');
  const compare=()=>{
    const p=prices();
    for(const [key,action] of [['bid','sellLot'],['ask','buyLot']]){
      const q=t.intent(action,'berries').option;
      assert.deepEqual([p[key].price,p[key].reason,p[key].available],[q.price,q.reason,q.available]);
    }
    return p;
  };
  const before=JSON.stringify(w),initial=compare();
  assert.equal(initial.bid.available,false);assert.equal(initial.ask.available,true);assert.equal(JSON.stringify(w),before);
  ok(t.act('gatherLot','berries'));const fresh=compare();assert(fresh.bid.available);
  w.week++;const marked=compare();assert.equal(marked.bid.price,fresh.bid.price-1);assert.equal(marked.bid.expires,w.week+1);
  const cash=s.funds;ok(t.act('sellLot','berries'));assert.equal(s.funds,cash+marked.bid.price);
  const asking=compare();assert.equal(asking.ask.expires,w.week+1);ok(t.act('buyLot','berries'));
  assert.equal(s.funds,cash+marked.bid.price-asking.ask.price);
  s.exchange.till=0;s.funds=0;const empty=compare();assert.match(empty.bid.reason,/more cash/);assert.match(empty.ask.reason,/treasury/i);
  s.resourceLedger.shelf.berries=0;assert.match(compare().ask.reason,/No stock/);
  s.resourceLedger.serial=Number.MAX_SAFE_INTEGER;
  assert.equal(prices().bid.available,false);assert.match(prices().ask.reason,/record/);sim.destroy();
});
