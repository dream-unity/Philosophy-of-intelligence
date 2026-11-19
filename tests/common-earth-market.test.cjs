'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const gameDir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function setup(){
  const c=vm.createContext({CommonEarthSim:{marketPlan:s=>({markets:s.buildings.filter(b=>b.kind==='market').map(()=>({base:3}))})},
    EarthAgency:{actorId:s=>s.agency?.actor||'steward'},EarthPersonas:{profile:(_,id)=>({name:id==='steward'?'Robin':'Ira'})},
    EarthPartners:{get:(_w,_s,id)=>({name:id,exportGood:id==='Tool co-op'?'materials':'food'})}});
  vm.runInContext(fs.readFileSync(path.join(gameDir,'market.js'),'utf8'),c,{filename:'market.js'});
  const s={id:'river',name:'River',population:12,funds:20,materials:8,food:12,buildings:[],construction:[],residents:[]};
  const w={week:1,sites:[s],routes:[],partners:{}},api=c.EarthMarket;
  const model=()=>api.view(w,s,{flow:{food:0,materials:1,funds:2}});
  const pose=()=>({siteId:s.id,target:'market',actor:c.EarthAgency.actorId(s),x:15,y:23,tx:15,ty:23.04,mode:'walk'});
  function request(action,good){
    const m=model(),o=m.options.find(o=>o.action===action&&o.good===good);
    assert.ok(o,'missing offer '+action+' '+good);
    return {action,good,price:o.price,siteId:m.siteId,week:m.week,serial:m.serial,actorId:m.actorId,generation:m.generation};
  }
  function run(action,good,p=pose()){return api.run(w,s,request(action,good),p);}
  function close(){w.week++;const events=api.tick(w,s);assert.ok(api.valid(s,w.week));return events;}
  return {api,s,w,model,pose,request,run,close,env:c};
}
function ok(r){assert.equal(r.ok,true,r.message);return r;}
function no(r){assert.equal(r.ok,false,r.message);return r;}

test('reading an old district opens a pure ledger of existing stores and a separately financed stall',()=>{
  const {api,s,w,model}=setup(),start=JSON.stringify(w),m=model();
  assert.deepEqual(Array.from(m.rows,r=>[r.good,r.stock,r.held,r.free,r.incoming,r.flow]),[['food',12,0,12,0,0],['materials',8,0,8,0,1],['funds',20,0,20,0,2]]);
  assert.equal(m.till,8);assert.equal(m.shelf.food,3);assert.equal(api.valid(s,1),true);
  m.rows[0].free=0;m.shelf.food=500;model().history.push({week:1,text:'edited'});
  assert.equal(JSON.stringify(w),start);assert.equal(s.exchange,undefined);
  assert.equal(api.tick(w,s).length,0);assert.equal(JSON.stringify(w),start);
});

test('purchases and sales draw on both real books, change scarce prices and cannot fund a round trip',()=>{
  const {s,model,run}=setup();s.funds=100;
  const balances=()=>({funds:s.funds+model().till,food:s.food+model().shelf.food,materials:s.materials+model().shelf.materials});
  const beginning=balances(),start=s.funds,food=s.food;
  const first=model().options.find(o=>o.action==='buy'&&o.good==='food').price;
  ok(run('buy','food'));ok(run('buy','food'));
  const dearer=model().options.find(o=>o.action==='buy'&&o.good==='food').price;
  assert.ok(dearer>first);
  ok(run('buy','food'));no(run('buy','food'));
  for(let i=0;i<3;i++)ok(run('sell','food'));
  assert.deepEqual(balances(),beginning);assert.equal(s.food,food);assert.ok(s.funds<start);
  for(let i=0;i<3;i++){
    const available=model().options.find(o=>o.action==='sell'&&o.good==='materials').available;
    if(!available)break;
    ok(run('sell','materials'));
  }
  assert.ok(model().till>=0);
  s.funds=0;assert.equal(model().options.find(o=>o.action==='buy'&&o.good==='food').available,false);
});

test('an oversupplied shelf and an empty till cannot be farmed for cash; new orders need real working capital',()=>{
  const {s,run,model,close}=setup();
  s.food=50;
  for(let i=0;i<20;i++){if(!model().options.find(o=>o.action==='sell'&&o.good==='food').available)break;ok(run('sell','food'));}
  const held=s.funds;no(run('sell','food'));assert.equal(s.funds,held);
  assert.ok(model().till<3 || model().shelf.food===model().capacity);
  s.funds=s.materials=s.food=0;no(run('fund','food'));no(run('fund','materials'));no(run('sell','materials'));
  const before=model();close();const after=model();
  assert.ok(after.till!==before.till||after.shelf.food!==before.shelf.food);
  assert.equal(s.funds,0);assert.equal(s.food,0);assert.equal(s.materials,0);
  assert.ok(after.history.some(r=>r.text.includes('Visitor purchases')));
});

test('escrow, later physical delivery and covered worksite costs remain distinct from stock available now',()=>{
  const {s,model,run,close}=setup();
  s.strategy={reserve:4};s.construction=[{name:'Garden',paid:{funds:5,materials:3}}];
  s.provisions={crates:[{remaining:2,reserved:true},{remaining:1,reserved:false}]};
  ok(run('hold','materials'));ok(run('hold','funds'));ok(run('fund','food'));
  const rows=Object.fromEntries(model().rows.map(r=>[r.good,r]));
  assert.deepEqual([rows.food.stock,rows.food.free,rows.food.held,rows.food.incoming],[19,12,7,3]);
  assert.equal(model().held.filter(r=>r.source.startsWith('Sealed')).reduce((n,r)=>n+r.amount,0),3);
  assert.deepEqual([rows.materials.stock,rows.materials.free,rows.materials.held],[8,6,2]);
  assert.deepEqual([rows.funds.stock,rows.funds.free,rows.funds.held],[20,17,3]);
  assert.equal(model().spent.find(r=>r.good==='materials').amount,3);
  ok(run('cancel','food'));assert.equal(s.food,12);assert.equal(s.materials,7);assert.equal(s.funds,19);
  ok(run('release','materials'));ok(run('release','funds'));
  s.buildings.push({kind:'garden'});ok(run('fund','food'));s.buildings=[];
  assert.equal(model().batch.amount,4,'the agreed physical load survives a change to the site');
  assert.match(close()[0],/delivered 4 food/);assert.equal(s.food,16);
  assert.equal(model().rows.find(r=>r.good==='food').incoming,0);assert.equal(s.exchange.batch,undefined);
  const dry=setup();dry.s.buildings=[{kind:'workshop'}];ok(dry.run('fund','materials'));
  dry.close();assert.equal(dry.s.materials,12);assert.equal(dry.s.food,11);
});

test('timeline, restricted capital, manifests and finite supplier movements survive save and forecast exactly once',()=>{
  const {api,w,s,run,model,close}=setup();
  w.sites.push({id:'east',name:'East'});w.routes=[{shipments:[
    {from:'east',to:'river',amount:2,good:'food',due:3},{from:'river',to:'east',amount:5,good:'materials',due:4}]}];
  w.partners={'Food co-op':{agreement:{phase:'outbound',homeId:'river',due:4,days:2,reserved:3}},
    'Tool co-op':{agreement:{phase:'return',homeId:'river',due:5,returned:4}},
    'Pending':{agreement:{phase:'pledge',homeId:'river',reserved:10}},'Discretionary':{agreement:{phase:'outbound',homeId:'river',reserved:0}}};
  assert.equal(model().incoming.length,3);assert.equal(model().rows.find(r=>r.good==='food').incoming,5);
  assert.deepEqual(Array.from(model().incoming,r=>r.due),[3,6,5]);
  for(let i=0;i<6;i++)ok(run('hold',i%2?'funds':'materials'));
  no(run('hold','materials'));ok(run('release','funds'));ok(run('fund','materials'));
  const detached=JSON.parse(JSON.stringify(w));detached.week++;const predicted=api.tick(detached,detached.sites[0]);
  const events=close();assert.deepEqual(Array.from(events),Array.from(predicted));assert.equal(JSON.stringify(s),JSON.stringify(detached.sites[0]));
  const snapshot=JSON.stringify(s);assert.equal(api.tick(w,s).length,0);assert.equal(JSON.stringify(s),snapshot);
  assert.ok(api.valid(JSON.parse(snapshot),w.week));
});

test('stale offers, unauthorized locations and overflowing stores cannot partially transfer goods',()=>{
  const {api,s,w,model,pose,request,run,close}=setup();
  const order=request('buy','materials'),scene=pose(),before=JSON.stringify(w);
  for(const bad of [null,{...scene,mode:'boat'},{...scene,actor:'another'},{...scene,target:'bench'},{...scene,x:4},{...scene,siteId:'east'}]){
    no(api.run(w,s,order,bad));assert.equal(JSON.stringify(w),before);
  }
  no(api.run(w,s,{...order,price:0},scene));no(api.run(w,s,{...order,generation:2},scene));
  ok(run('buy','materials'));no(api.run(w,s,order,scene));
  const newOrder=request('buy','food');s.agency={actor:'ira'};no(api.run(w,s,newOrder,pose()));
  ok(run('fund','food'));s.food=Number.MAX_SAFE_INTEGER-1;close();
  assert.equal(s.food,Number.MAX_SAFE_INTEGER);assert.equal(model().batch.amount,2);
  assert.equal(model().rows.find(r=>r.good==='food').held,2);no(run('cancel','food'));
  s.food-=2;close();assert.equal(s.food,Number.MAX_SAFE_INTEGER);assert.equal(model().batch,null);
  s.exchange.till=Number.MAX_SAFE_INTEGER;no(run('buy','materials'));
});

test('strict import keeps account books, work advances and the finite shelf consistent',()=>{
  const {api,s,w,run}=setup();ok(run('fund','food'));
  const data=JSON.stringify(s);
  for(const bad of [b=>{b.till=-1;},b=>{b.shelf.food=20;},b=>{b.locked.materials=7;},b=>{b.batch.cost.funds=0;},
    b=>{b.batch.cost.trust=1;},b=>{b.batch.amount=1;},b=>{b.batch.due=20;},b=>{b.history.push({week:20,text:'X'});} ]){
    const d=JSON.parse(data);bad(d.exchange);assert.equal(api.valid(d,w.week),false);
  }
});

test('the guarded simulation keeps a regional cash booking, the physical stall and next-week forecast in their own accounts',async()=>{
  const context=vm.createContext({});context.window=context;
  for(const part of ['construction','city','partners','agency','market','simulation']){
    vm.runInContext(fs.readFileSync(path.join(gameDir,part+'.js'),'utf8'),context,{filename:part+'.js'});
  }
  const entries=new Map(),store={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
  const open=()=>context.CommonEarthSim.create({key:'game',storage:store});
  const sim=open();ok(sim.found({name:'Recife',lat:-8.05,lon:-34.9}));
  const s=sim.active(),scene={actor:'steward',siteId:s.id,target:'market',mode:'walk',x:15,y:23,tx:15,ty:23.04};
  function request(action,good){
    const m=sim.marketView(),op=m.options.find(x=>x.action===action&&x.good===good);
    assert.ok(op.available,op.reason);
    return {action,good,price:op.price,siteId:m.siteId,actorId:m.actorId,week:m.week,serial:m.serial,generation:m.generation};
  }
  const buy=request('buy','food'),cash=s.funds;
  let unlock,pose=scene;
  context.navigator={locks:{request:(_key,fn)=>new Promise(resolve=>{unlock=()=>resolve(fn());})}};
  const skipped=sim.perform('exchange',buy,()=>pose);pose=null;unlock();no(await skipped);
  assert.equal(s.funds,cash);assert.equal(s.exchange,undefined);
  delete context.navigator;
  ok(await sim.perform('exchange',buy,()=>scene));const localCash=s.funds,till=s.exchange.till;
  const deal=id=>ok(sim.act('partner:shelf:'+id));
  deal('meet');deal('book');
  const booking=sim.state.partners.shelf.agreement,ledger=sim.marketView();
  assert.equal(s.funds,localCash-booking.paid);assert.equal(ledger.rows.find(r=>r.good==='funds').free,s.funds);
  assert.equal(ledger.external[0].name,'Slope Shelf Co-op');assert.equal(ledger.external[0].paid,booking.paid);
  assert.equal(ledger.rows.find(r=>r.good==='food').incoming,0,'a pledged booking awaits its final payment');
  const wholePrice=booking.balance+booking.paid;deal('dispatch');
  assert.equal(s.funds,localCash-wholePrice);assert.equal(s.exchange.till,till);
  const incoming=sim.marketView().incoming.find(i=>i.source==='Slope Shelf Co-op');
  assert.equal(incoming.amount,2);assert.equal(incoming.due,sim.state.partners.shelf.agreement.due+booking.days);
  ok(sim.exchange(request('fund','materials'),scene));
  const snapshot=JSON.stringify(sim.state),preview=sim.forecastNext();
  assert.equal(JSON.stringify(sim.state),snapshot);
  const anticipated=preview.sites.find(x=>x.id===s.id).closing;
  ok(sim.advance());assert.equal(s.materials,anticipated.materials);assert.equal(s.funds,anticipated.funds);
  assert.ok(sim.state.lastWeekReview.sites.find(x=>x.id===s.id).highlights.some(x=>x.includes('paid crew delivered')));
  const reopened=open();assert.equal(reopened.active().funds,s.funds);assert.equal(reopened.active().exchange.till,s.exchange.till);
  assert.deepEqual(JSON.parse(JSON.stringify(reopened.marketView().external)),JSON.parse(JSON.stringify(sim.marketView().external)));
  reopened.destroy();sim.destroy();
});

test('the in-scene stores panel walks to the exchange, samples contact at commit and drops stale travel or detached controls',async()=>{
  const {api,s,w,model,pose,env}=setup();
  env.CommonEarthSim.waterfront=()=>true;
  vm.runInContext(fs.readFileSync(path.join(gameDir,'provisions.js'),'utf8'),env,{filename:'provisions.js'});
  const supplies=env.EarthProvisions;
  w.activeId=s.id;w.actionRevision=0;
  const doc={hidden:false,addEventListener(){},activeElement:null};
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.ownerDocument=doc;this.dataset={};this.events={};this.textContent='';this.hidden=false;}
    get isConnected(){return this===doc.body||Boolean(this.parent?.isConnected);}
    append(...kids){for(const k of kids){k.parent=this;this.children.push(k);}}
    replaceChildren(...kids){for(const k of this.children)k.parent=null;this.children=[];this.append(...kids);}
    closest(q){return q==='[hidden]'&&this.hidden?this:this.parent?.closest(q);}
    querySelectorAll(q){return this.children.flatMap(c=>[...((q==='[data-market-action]'&&c.dataset.marketAction||c.tag===q)?[c]:[]),...c.querySelectorAll(q)]);}
    querySelector(q){if(q==='[data-market-content]')return this.children[0];return this.querySelectorAll(q)[0];}
    addEventListener(k,fn){this.events[k]=fn;}
    setAttribute(){}
    focus(){doc.activeElement=this;}
    fire(){if(!this.disabled)return this.events.click?.();}
  }
  doc.createElement=tag=>new Element(tag);doc.body=doc.createElement('body');
  const section=doc.createElement('section'),content=doc.createElement('div');doc.body.append(section);section.append(content);
  const rt=vm.createContext({EarthMarket:api,EarthAgency:{actorId:()=>s.agency?.actor||'steward'}});
  vm.runInContext(fs.readFileSync(path.join(gameDir,'market-panel.js'),'utf8'),rt,{filename:'market-panel.js'});
  let atCounter=false,atQuay=false,revision=0,arrival,grant;
  const local={getState:()=>({mode:'walk',waterfront:true}),meeting:()=>atCounter?pose():null};
  const sim={state:w,active:()=>s,marketView:model,provisionsView:()=>supplies.view(w,s),perform:(command,r,guard)=>new Promise(resolve=>{
    grant=()=>{const result=(command==='provision'?supplies:api).run(w,s,r,guard());if(result.ok)w.actionRevision++;resolve(result);};
  })};
  const h=rt.EarthMarketPanel.mount(section,{sim,street:()=>local,version:()=>revision,
    meet:(_ref,_name,arrive)=>{revision++;arrival=arrive;return true;},
    quayProof:()=>atQuay?{...pose(),target:'quay',x:8,y:24}:null,meetQuay:arrive=>{revision++;arrival=arrive;return true;}});
  const ctl=id=>content.querySelectorAll('[data-market-action]').find(b=>b.dataset.marketAction===id);
  h.open();
  const original=ctl('buy-food');original.fire();atCounter=true;
  const attempt=arrival();atCounter=false;grant();await attempt;
  assert.equal(s.exchange,undefined,'the actor left the market while awaiting the lock');
  ctl('buy-food').fire();atCounter=true;const approved=arrival();grant();await approved;
  assert.equal(s.food,13,'navigation itself changed the scene version before this legitimate arrival');
  const now=s.funds;original.fire();assert.equal(s.funds,now);
  atCounter=false;ctl('sell-food').fire();const abandoned=arrival;ctl('section-orders').fire();atCounter=true;
  await abandoned();assert.equal(s.food,13);
  const present=ctl('hold-materials');present.fire();section.hidden=true;revision++;section.hidden=false;grant();
  await Promise.resolve();assert.equal(s.exchange.locked.materials,0);
  const before=content.children;section.hidden=true;h.render();assert.equal(content.children,before);
  section.hidden=false;h.close();h.open();atCounter=false;ctl('buy-food').fire();const oldTrip=arrival;
  h.close();h.open();atCounter=true;await oldTrip();assert.equal(s.food,13);
  ctl('section-orders').fire();
  const station=content.querySelector('select');station.value='quay';station.events.change();
  const initialMaterials=s.materials;
  ctl('provision-pack-').fire();const firstQuay=arrival;atQuay=true;
  const delayed=firstQuay();atQuay=false;grant();await delayed;
  assert.equal(s.provisions,undefined,'leaving the quay while the save is queued must keep the original stores');
  ctl('provision-pack-').fire();atQuay=true;const packed=arrival();grant();await packed;
  assert.equal(s.food,11);assert.equal(s.materials,initialMaterials-1);
  assert.equal(model().rows.find(r=>r.good==='food').held,2);
  const id=s.provisions.crates[0].id;ctl('provision-open-'+id).fire();grant();await Promise.resolve();
  assert.equal(s.food,13);assert.equal(model().rows.find(r=>r.good==='food').held,0);
  const settings=h.snapshot();assert.deepEqual(Object.keys(settings).sort(),['cratesOpen','packAt','selectedCrate','tab']);
  assert.equal(settings.tab,'orders');assert.equal(settings.packAt,'quay');
  atQuay=false;ctl('provision-pack-').fire();const oldPacking=arrival;
  assert.equal(h.restore({...settings,selectedCrate:999,cratesOpen:true}),true);
  assert.equal(h.snapshot().selectedCrate,null);assert.equal(h.snapshot().cratesOpen,true);
  atQuay=true;await oldPacking();assert.equal(s.food,13,'restoring the reference crate cannot replay a trip or transaction');
  h.restore({tab:'forged',packAt:'invalid',cratesOpen:'true'});assert.equal(h.snapshot().tab,'trade');assert.equal(h.snapshot().packAt,'market');
  const ref={type:'resident',residentId:'clerk'},checkedRequest={...model(),marketSerial:model().serial,action:'check',good:'food',price:2};
  let byClerk=false,claimed=0;
  s.residents=[{id:'clerk',name:'Mara'}];
  local.meeting=place=>place.type==='resident'&&place.residentId==='clerk'&&byClerk?{...pose(),target:'clerk'}:null;
  sim.purseView=()=>({...checkedRequest,name:'Robin',balance:2,household:1,shift:{clerkName:'Mara',week:1,good:'food'},entries:[],
    options:[{action:'check',good:'food',venue:ref,title:'Check stock with Mara',available:true,request:checkedRequest}]});
  sim.perform=(kind,request,proof)=>new Promise(resolve=>{grant=()=>{
    assert.equal(kind,'purseAction');assert.equal(request,checkedRequest,'preserve the full employer quote');
    if(proof()?.target==='clerk'){claimed++;resolve({ok:true,message:'Checked stock with Mara.'});}
    else resolve({ok:false,message:'Meet Mara at her inventory post.'});
  };});
  assert.equal(h.openPurse(),true);assert.equal(h.snapshot().tab,'purse');
  assert.ok(content.querySelectorAll('p').some(p=>p.textContent.includes('1 fund pooled')));
  ctl('purse-check-food').fire();assert.ok(content.querySelectorAll('p').some(p=>p.textContent==='Walking to Mara for the stock count.'));
  byClerk=true;const errand=arrival();byClerk=false;grant();await errand;assert.equal(claimed,0);
  ctl('purse-check-food').fire();byClerk=true;const second=arrival();grant();await second;assert.equal(claimed,1);
  const savedPurse=h.snapshot();h.close();h.restore(savedPurse);assert.equal(h.snapshot().tab,'purse');assert.equal(claimed,1);
  let price=2,offered=null;atCounter=false;
  local.meeting=place=>place.type==='market'&&atCounter?pose():null;
  sim.purseView=()=>({...checkedRequest,name:'Robin',balance:5,household:1,shift:null,entries:[],
    options:[{action:'buy',good:'food',venue:{type:'market'},title:'Buy food for the town',available:true,request:{...checkedRequest,action:'buy',price}}]});
  sim.perform=async(_command,request,proof)=>{
    assert.ok(proof());offered=request.price;return {ok:offered===price,message:offered===price?'Food purchased.':'The shelf price changed.'};
  };
  h.openPurse();ctl('purse-buy-food').fire();const counterArrival=arrival;
  price=3;w.actionRevision++;h.render();atCounter=true;await counterArrival();
  assert.equal(offered,2,'an in-flight errand must keep its original quoted price across a UI refresh');
  assert.ok(content.querySelectorAll('p').some(p=>p.textContent==='The shelf price changed.'));
  atCounter=false;ctl('purse-buy-food').fire();const expiredArrival=arrival;w.week++;h.render();
  assert.ok(content.querySelectorAll('p').some(p=>p.textContent.includes('The week changed during the journey')));
  atCounter=true;offered=null;await expiredArrival();assert.equal(offered,null);
});

test('towns have their own supplier and visitor days and can make greater use of local trades without duplicating public output',()=>{
  const a=setup(),b=setup();a.s.lat=0;a.s.lon=0;b.s.lat=0;b.s.lon=1;
  const initial=a.model().nextRound,other=b.model().nextRound;
  assert.notEqual(initial.supplyGood,other.supplyGood);
  a.s.buildings.push({kind:'market'},{kind:'garden'});a.s.specialty=initial.supplyGood;
  assert.equal(a.model().nextRound.supply,3);assert.equal(a.model().nextRound.demand,2);
  const details=a.api.flowDetail(a.s,a.model().rows);
  for(const r of a.model().rows)assert.equal(details.reduce((n,x)=>n+(x.good===r.good?x.amount:0),0),r.flow);
  ok(a.run('hold','funds'));const stores=[a.s.food,a.s.funds,a.s.materials];a.close();
  assert.deepEqual([a.s.food,a.s.funds,a.s.materials],stores);
  assert.ok(a.model().history[0].text.includes('Supplier delivery'));
});

test('authorised truck freight remains one physical unit across loading, return, restocking and delivery',()=>{
  const {api,s,w,model,run,close}=setup();
  s.fleet={custody:{kind:'work',delivered:false,week:w.week}};
  const start=model();assert.ok(api.canLoadFreight(s,'food'));
  ok(api.freight(s,'food','load',w.week));const departed=model();
  assert.equal(s.fleet.custody.stock,'food');assert.equal(departed.loaded,'food');
  assert.equal(departed.shelf.food,start.shelf.food-1);assert.equal(s.food,12);
  no(api.freight(s,'food','load',w.week));no(api.freight(s,'materials','deliver',w.week));
  s.exchange.till=40;s.exchange.shelf.food=model().capacity-1;
  no(run('sell','food'));close();assert.ok(model().shelf.food<=model().capacity-1);
  const shelf=model().shelf.food;ok(api.freight(s,'food','return',w.week));
  assert.equal(model().shelf.food,shelf+1);assert.equal(model().loaded,null);
  no(api.freight(s,'food','return',w.week));assert.equal(s.food,12);
  const funds=s.funds,till=model().till,revision=model().serial;
  ok(api.freight(s,'funds','load',w.week));assert.equal(model().till,till-1);
  s.funds=Number.MAX_SAFE_INTEGER;no(api.freight(s,'funds','deliver',w.week));assert.equal(s.fleet.custody.stock,'funds');
  s.funds=funds;ok(api.freight(s,'funds','deliver',w.week));assert.equal(s.funds,funds+1);
  assert.equal(model().till,till-1);assert.equal(model().serial,revision+2);no(api.freight(s,'funds','deliver',w.week));
  s.exchange.till=Number.MAX_SAFE_INTEGER;ok(api.freight(s,'funds','load',w.week));
  no(run('buy','food'));close();assert.ok(model().till<=Number.MAX_SAFE_INTEGER-1);
  ok(api.freight(s,'funds','return',w.week));assert.ok(api.valid(s,w.week));
});

test('a playable street resident trades under their own name and a handoff invalidates their prior quote',()=>{
  const c=vm.createContext({});c.window=c;
  for(const file of ['personas','agency','market','simulation'])vm.runInContext(fs.readFileSync(path.join(gameDir,file+'.js'),'utf8'),c,{filename:file+'.js'});
  const sim=c.CommonEarthSim.create({storage:null});ok(sim.found({name:'Harbour',lat:-37.84,lon:144.92}));
  const site=sim.active(),id='walker-1';
  function pose(actor){return {actor,siteId:site.id,target:'market',mode:'walk',x:15,y:23,tx:15.3,ty:23.04};}
  ok(sim.changeActor(id,{...pose('steward'),targetPose:{id,mode:'walk',x:15,y:23}}));
  const m=sim.marketView(),choice=m.options.find(o=>o.action==='sell'&&o.good==='materials');
  assert.equal(m.actorId,id);assert.equal(choice.available,true);
  const request={actorId:m.actorId,siteId:m.siteId,week:m.week,serial:m.serial,generation:m.generation,action:choice.action,good:choice.good,price:choice.price};
  ok(sim.exchange(request,pose(id)));
  assert.match(site.exchange.history[0].text,new RegExp(c.EarthPersonas.profile(site,id).name));
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  const updated={...request,serial:sim.marketView().serial},stock=site.materials;
  ok(sim.changeActor('steward',pose(id)));no(sim.exchange(updated,pose('steward')));
  assert.equal(site.materials,stock);sim.destroy();
});

test('private wages, their safe return space and shelf gifts reconcile with the finite exchange',()=>{
  const {api,s,w,model,run,close}=setup(),max=Number.MAX_SAFE_INTEGER;
  assert.equal(api.privateTill(s),8);
  no(api.personal(w,s,'reserveWage',null,1,'ira'));assert.equal(s.exchange,undefined);
  ok(api.personal(w,s,'reserveWage',null,2,'ira'));s.purses={tickets:{ira:{week:w.week}}};
  assert.equal(api.privateTill(s),6);assert.equal(model().wagesHeld,2);assert.equal(s.funds,20);
  const initialFood=s.food,initialShelf=model().shelf.food,initialPrivate=api.privateTill(s),cash=s.funds;
  s.funds=0;const quote=api.personalQuote(w,s,'food');
  assert.ok(quote.available);assert.equal(model().options.find(o=>o.action==='buy'&&o.good==='food').available,false);
  no(api.personal(w,s,'buyGift','food',quote.price+1,'ira'));
  ok(api.personal(w,s,'buyGift','food',quote.price,'ira','household'));assert.equal(s.funds,0);
  assert.equal(s.food,initialFood+1);assert.equal(model().shelf.food,initialShelf-1);assert.equal(api.privateTill(s),initialPrivate+quote.price);
  assert.match(s.exchange.history[0].text,/Ira.*household food fund/);
  s.funds=cash;s.exchange.till=max-2;s.fleet={custody:{kind:'work',delivered:false,week:w.week}};
  ok(api.freight(s,'funds','load'));assert.equal(model().till,max-3);
  assert.ok(api.valid(s,w.week));assert.equal(api.personalQuote(w,s,'food').available,false);no(run('buy','materials'));
  s.exchange.till++;assert.equal(api.valid(s,w.week),false);s.exchange.till--;
  close();assert.ok(model().till<=max-3);ok(api.freight(s,'funds','return'));
  const paid=api.privateTill(s);s.exchange.serial=max;
  no(api.personal(w,s,'returnWage',null,2,'steward'));
  ok(api.personal(w,s,'returnWage',null,2,'ira'));delete s.purses.tickets.ira;
  assert.equal(api.privateTill(s),paid+2);assert.equal(s.exchange.serial,max);assert.equal(model().wagesHeld,0);
  assert.ok(api.valid(s,w.week));no(api.personal(w,s,'returnWage',null,2,'ira'));
});
