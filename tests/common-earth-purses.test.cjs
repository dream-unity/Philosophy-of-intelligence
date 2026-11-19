'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const source=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function setup(){
  const c=vm.createContext({});c.window=c;
  for(const f of ['personas','careers','local-projects','autonomy','agency','market','purses','community-effects','simulation'])
    vm.runInContext(fs.readFileSync(path.join(source,f+'.js'),'utf8'),c,{filename:f+'.js'});
  const disk=new Map(),create=()=>c.CommonEarthSim.create({storage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)}});
  const sim=create();assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19}).ok);
  return {sim,create,c};
}
const ok=r=>{assert.equal(r.ok,true,r.message);return r;};
const no=r=>{assert.equal(r.ok,false,r.message);return r;};
function option(t,action,good){
  const o=t.sim.purseView().options.find(o=>o.action===action&&(!good||o.good===good));
  assert(o,'missing '+action+' '+(good||''));return o;
}
function pose(t,venue){
  const site=t.sim.active();
  return {siteId:site.id,actor:t.c.EarthAgency.actorId(site),target:venue.residentId||'market',mode:'walk',x:8,y:4,tx:8.9,ty:4};
}
function act(t,action,good){
  const o=option(t,action,good);return t.sim.purseAction(o.request,pose(t,o.venue));
}
function switchTo(t,id){
  const p=pose(t,{type:'market'});p.targetPose={id,mode:'walk',x:p.x+1,y:p.y};ok(t.sim.changeActor(id,p));
}
function earn(t){ok(act(t,'start'));ok(act(t,'check'));ok(act(t,'finish'));}
function wealth(t){
  const site=t.sim.active(),m=t.c.EarthMarket.view(t.sim.state,site);
  return [site.funds+m.till+t.c.EarthPurses.escrow(site)+(site.purses?.household||0)+Object.values(site.purses?.people||{}).reduce((sum,p)=>sum+p.balance,0),
    site.food+m.shelf.food,site.materials+m.shelf.materials];
}
function reload(t){t.sim.destroy();t.sim=t.create();assert(t.sim.active());}
test('a bankrupt town can earn a private wage through the three physical stops without effort or a treasury debit',()=>{
  const t=setup(),s=t.sim.active(),sim=t.sim,w=sim.state;s.funds=s.food=s.materials=w.effort=0;
  const start=JSON.stringify(w);assert.equal(sim.purseView().balance,0);assert.equal(JSON.stringify(w),start);assert.ok(t.c.CommonEarthSim.readSave(start));
  const totals=wealth(t),request=option(t,'start').request,market=pose(t,{type:'market'});
  for(const change of [{actor:'walker-0'},{siteId:'away'},{target:'hall'},{mode:'drive'},{tx:20}]){
    no(sim.purseAction(request,{...market,...change}));assert.equal(JSON.stringify(w),start);
  }
  ok(act(t,'start'));assert.equal(s.exchange.till,6);assert.equal(t.c.EarthPurses.escrow(s),2);assert.equal(sim.purseView().balance,0);
  assert.deepEqual(wealth(t),totals);assert.equal(sim.purseView().options.some(o=>o.action==='finish'),false);
  no(sim.purseAction(request,market));const task=option(t,'check'),clerk=task.venue.residentId;
  no(sim.purseAction(task.request,market));no(sim.purseAction(task.request,{...pose(t,task.venue),actor:clerk}));
  reload(t);assert.equal(t.sim.purseView().shift.clerkId,clerk);assert.equal(t.sim.purseView().shift.count,null);
  ok(act(t,'check'));assert.equal(t.sim.purseView().shift.count,0);reload(t);const paid=option(t,'finish').request;
  ok(act(t,'finish'));no(t.sim.purseAction(paid,market));assert.deepEqual(wealth(t),totals);
  assert.equal(t.sim.active().funds,0);assert.equal(t.sim.state.effort,0);assert.equal(t.sim.purseView().balance,2);
  assert.match(t.sim.purseView().entries[0].text,/paid 2 personal funds/);assert(!option(t,'start').available);
  const career=t.c.EarthCareers.view(t.sim.state,t.sim.active(),'steward','nurse');
  assert.equal(career.choices.find(o=>o.id==='practice').available,false);
  assert.equal(t.sim.purseView(clerk).balance,0);assert.equal(t.sim.purseView(clerk).options.length,0);t.sim.destroy();
});
test('jobs stay with their people across handoffs, vacancies are finite, and pooled gifts move exactly one shelf unit',()=>{
  const t=setup(),s=t.sim.active(),w=t.sim.state,initial=wealth(t);
  ok(act(t,'start'));const original=t.sim.purseView().shift;
  switchTo(t,'walker-0');assert.equal(t.sim.purseView().shift,null);ok(act(t,'start'));
  switchTo(t,'driver');assert(!option(t,'start').available);assert.equal(t.c.EarthPurses.escrow(s),4);
  switchTo(t,'walker-0');ok(act(t,'check'));ok(act(t,'finish'));ok(act(t,'donate'));assert.equal(t.sim.purseView().balance,1);
  switchTo(t,'steward');assert.equal(t.sim.purseView().shift.serial,original.serial);ok(act(t,'check'));ok(act(t,'finish'));
  ok(act(t,'donate'));ok(act(t,'donate'));assert.equal(t.sim.purseView().household,3);assert.equal(t.sim.purseView().balance,0);
  const food=s.food,stock=s.exchange.shelf.food;ok(act(t,'household'));assert.equal(s.food,food+1);assert.equal(s.exchange.shelf.food,stock-1);
  assert.equal(t.sim.purseView().household,0);assert.match(s.exchange.history[0].text,/household/);
  const effects=t.c.EarthCommunityEffects.view(w,s);
  const pledge=effects.find(e=>e.title==='Neighbours pooled money for food'),purchase=effects.find(e=>e.title==='Household funds bought pantry food');
  assert.deepEqual(Array.from(pledge.people,p=>p.id).sort(),['steward','walker-0']);
  assert.match(pledge.result,/gave 2 personal funds/);assert.match(pledge.result,/gave 1 personal fund\./);
  assert.deepEqual(Array.from(purchase.people,p=>p.id),['steward']);
  assert.match(purchase.result,/3 household funds for 1 shelf food/);assert.doesNotMatch(purchase.result,/Purse now|fund now/);
  assert(!t.c.EarthCommunityEffects.view(w,s,'driver').some(e=>/pooled|Household funds/.test(e.title)));
  assert.deepEqual(wealth(t),initial);assert.equal(t.sim.purseView('walker-0').balance,1);assert.equal(t.sim.purseView('driver').balance,0);
  assert.equal(s.funds,16);assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(w)));reload(t);assert.deepEqual(wealth(t),initial);t.sim.destroy();
});
test('own earnings buy shelf goods at the current posted price and cannot spend from somebody else or substitute communal cash',()=>{
  const t=setup(),s=t.sim.active();earn(t);s.food=16;
  ok(t.sim.advance());earn(t);const funds=s.funds,totals=wealth(t);
  const op=option(t,'buy','food'),price=op.request.price;assert(op.available);assert(t.sim.purseView().balance>=price);
  no(t.sim.purseAction({...op.request,price:1},pose(t,op.venue)));
  const other=s.residents[0].id;switchTo(t,other);no(t.sim.purseAction(op.request,pose(t,op.venue)));switchTo(t,'steward');
  const food=s.food,shelf=s.exchange.shelf.food,previous=t.sim.purseView().balance;ok(act(t,'buy','food'));
  assert.equal(t.sim.purseView().balance,previous-price);assert.equal(s.exchange.shelf.food,shelf-1);assert.equal(s.food,food+1);assert.equal(s.funds,funds);assert.deepEqual(wealth(t),totals);
  s.exchange.shelf.materials=0;assert(!option(t,'buy','materials').available);
  s.exchange.till=0;switchTo(t,'driver');assert(!option(t,'start').available);t.sim.destroy();
});
test('cancelled or unfinished shifts return reserved cash once, while market purchases reserve refund capacity',()=>{
  const t=setup(),s=t.sim.active();ok(act(t,'start'));const initial=wealth(t),cancel=option(t,'cancel');
  ok(act(t,'cancel'));no(t.sim.purseAction(cancel.request,pose(t,cancel.venue)));assert.deepEqual(wealth(t),initial);assert.equal(s.exchange.till,8);
  ok(act(t,'start'));ok(act(t,'check'));assert.match(t.c.EarthPurses.tick({week:2},s)[0],/expired/);
  assert.equal(s.exchange.till,8);assert.equal(t.c.EarthPurses.tick({week:2},s).length,0);assert.deepEqual(wealth(t),initial);
  const q=setup(),site=q.sim.active();ok(act(q,'start'));site.exchange.till=Number.MAX_SAFE_INTEGER-2;
  assert(!option(q,'buy','food').available);site.exchange.serial=Number.MAX_SAFE_INTEGER;
  ok(act(q,'cancel'));assert.equal(site.exchange.till,Number.MAX_SAFE_INTEGER);assert.equal(q.c.EarthPurses.escrow(site),0);
  assert.ok(q.c.CommonEarthSim.readSave(JSON.stringify(q.sim.state)));q.sim.destroy();t.sim.destroy();
});
test('late market prices and stale proof during a pending lock do not move money; if the exchange is unavailable the escrow survives',async()=>{
  const t=setup(),s=t.sim.active(),o=option(t,'start');
  let enter,proof=pose(t,o.venue);
  t.c.navigator={locks:{request:(_,fn)=>new Promise(resolve=>{enter=()=>resolve(fn());})}};
  const pending=t.sim.perform('purseAction',o.request,()=>proof);proof=null;enter();no(await pending);assert.equal(s.purses,undefined);
  delete t.c.navigator;ok(act(t,'start'));const check=option(t,'check');s.exchange.serial++;
  ok(t.sim.purseAction(check.request,pose(t,check.venue)));
  const old=t.c.EarthMarket;t.c.EarthMarket=undefined;
  assert.equal(t.c.EarthPurses.tick({week:2},s).length,0);assert.equal(t.c.EarthPurses.escrow(s),2);assert.equal(s.purses.people.steward.balance,0);
  t.c.EarthMarket=old;assert.equal(t.c.EarthPurses.tick({week:2},s).length,1);assert.equal(t.c.EarthPurses.escrow(s),0);t.sim.destroy();
});
test('autonomous shift responds to a pantry shortage, uses one named session, and preserves a funded walk-in job',()=>{
  const t=setup(),sim=t.sim,s=sim.active(),w=sim.state;
  assert.equal(s.purses,undefined);s.food=16;ok(sim.advance());assert.equal(s.purses,undefined,'healthy households did not prompt a wage or gift');
  s.food=0;const prior=JSON.stringify(w),preview=sim.forecastNext();assert.equal(JSON.stringify(w),prior);assert.ok(preview.sites);
  ok(sim.advance());const workers=Object.entries(s.purses?.people||{}).filter(([,p])=>p.lastWeek===w.week);
  assert.equal(workers.length,1);const [id,person]=workers[0];assert.notEqual(id,'steward');assert.equal(person.earned,2);
  const intent=t.c.EarthAutonomy.intent(s,id);assert.equal(intent.kind,'wage');assert.equal(intent.venue,'market');
  assert.match(person.entries.at(-1).text,/exchange paid 2 personal funds/);assert.equal(t.c.EarthAutonomy.settle(s,w).length,0);
  assert(option(t,'start').available);assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(w)));reload(t);assert.equal(t.sim.purseView(id).lastWeek,t.sim.state.week);t.sim.destroy();
});
test('voluntary spending respects each person’s temperament and can only buy a real affordable shelf unit',()=>{
  for(const social of [25,92]){
    const t=setup(),s=t.sim.active(),api=t.c.EarthPurses,id='walker-2';s.food=0;const profile=t.c.EarthPersonas.profile(s,id);
    const p={id,name:profile.name,profile,free:true,row:{energy:6},traits:{initiative:84,patience:55,sociability:social}};
    const start=wealth(t);assert(api.workWeek(t.sim.state,s,p));assert.deepEqual(wealth(t),start);assert.equal(api.workWeek(t.sim.state,s,p),null);
    assert.equal(s.purses.household,social===92?1:0);
    t.sim.state.week=2;assert(api.workWeek(t.sim.state,s,p));assert.deepEqual(wealth(t),start);
    assert.equal(s.food,social===92?1:0);assert.equal(s.purses.people[id].earned,4);assert.equal(s.purses.people[id].balance,social===92?0:4);
    assert(api.valid(s,2));t.sim.destroy();
  }
});
test('corrupt dates, forged balances and duplicate tickets fail reload; prior worlds and a valid interrupted job remain readable',()=>{
  const t=setup();assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.sim.state)));ok(act(t,'start'));
  const save=JSON.stringify(t.sim.state);assert.ok(t.c.CommonEarthSim.readSave(save));
  for(const corrupt of [
    b=>{b.tickets.steward.count=-1;},b=>{b.tickets.steward.week=0;},b=>{b.tickets.steward.clerkId='unknown';},
    b=>{b.people.steward.balance=100;},b=>{b.people.steward.earned=101;},b=>{b.household=2;},b=>{b.tickets.ghost=b.tickets.steward;},
    b=>{b.people.steward.entries[0].amount=2;},(b,s)=>{delete s.exchange;},(b,s)=>{s.exchange.till=Number.MAX_SAFE_INTEGER;}
  ]){
    const w=JSON.parse(save),s=w.sites[0];corrupt(s.purses,s);assert.equal(t.c.CommonEarthSim.readSave(JSON.stringify(w)),null);
  }
  t.sim.destroy();
});
test('visiting another community leaves the old wage with its employer and only the current character’s errand pauses live weeks',()=>{
  const t=setup(),a=t.sim.active(),first=a.id;
  // Browser lock capability is present, but these synchronous commands stay on the same real save.
  t.c.navigator={locks:{request:(_,fn)=>Promise.resolve(fn())}};
  ok(act(t,'start'));const old=option(t,'check').request;
  assert.match(t.sim.liveWeekHold(),/paid market stock check/);
  switchTo(t,'walker-0');assert(!/paid market stock check/.test(t.sim.liveWeekHold()));switchTo(t,'steward');
  for(const person of a.residents.slice(0,2))ok(t.sim.act('listen:'+person.id));
  ok(t.sim.found({name:'Outpost',lat:23,lon:9}));const b=t.sim.active();assert.notEqual(b.id,first);
  assert.equal(t.sim.purseView().balance,0);assert(!/paid market stock check/.test(t.sim.liveWeekHold()));
  no(t.sim.purseAction(old,pose(t,{type:'resident',residentId:a.residents[0].id})));
  a.food=0;const snapshot=JSON.stringify(t.sim.state);t.sim.forecastNext();assert.equal(JSON.stringify(t.sim.state),snapshot);
  ok(t.sim.advance());assert.equal(t.c.EarthPurses.escrow(a),0);assert.match(a.purses.people.steward.entries.find(e=>e.action==='expired').text,/returned 2/);
  assert.equal(t.sim.purseView('steward').balance,0);assert.equal(t.c.EarthPurses.escrow(b),0);
  assert(Object.values(a.purses.people).some(p=>p.lastWeek===t.sim.state.week));
  ok(t.sim.visit(first));assert.equal(t.c.EarthAutonomy.intent(a,'steward').kind,'project');
  assert.match(option(t,'start').reason,/committed/);switchTo(t,'walker-0');ok(act(t,'start'));
  assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.sim.state)));t.sim.destroy();
});
test('real shelf trades leave personal donations and an already reserved wage usable, while a pending shelf purchase keeps its original quote',()=>{
  const t=setup(),s=t.sim.active(),m=()=>t.sim.marketView();
  function exchange(action,good){
    const v=m(),o=v.options.find(row=>row.action===action&&row.good===good);
    assert(o.available,o.reason);
    ok(t.sim.exchange({week:v.week,siteId:v.siteId,actorId:v.actorId,generation:v.generation,serial:v.serial,action,good,price:o.price},pose(t,{type:'market'})));
  }
  function submit(o){return t.sim.purseAction(o.request,pose(t,o.venue));}
  // An unrelated customer can be served while the worker is travelling.
  const offered=option(t,'start');exchange('buy','materials');ok(submit(offered));
  const count=option(t,'check');exchange('buy','food');
  assert.notEqual(m().serial,count.request.marketSerial);ok(submit(count));no(submit(count));
  const finish=option(t,'finish'),captured=s.purses.tickets.steward.count;exchange('sell','food');
  assert.equal(t.sim.purseView().shift.count,captured);ok(submit(finish));no(submit(finish));
  const donation=option(t,'donate'),shelf=m().shelf.food;exchange('sell','food');
  assert.equal(m().shelf.food,shelf+1);assert.equal(t.sim.purseView().balance,2);
  const before=wealth(t);ok(submit(donation));no(submit(donation));
  assert.deepEqual(wealth(t),before);assert.equal(t.sim.purseView().balance,1);assert.equal(t.sim.purseView().household,1);
  assert.match(option(t,'household').detail,/pool holds 1 fund\./);
  switchTo(t,'walker-0');earn(t);ok(act(t,'donate'));ok(act(t,'donate'));
  const price=option(t,'household');assert(price.available,price.reason);
  exchange('buy','food');
  const beforePurchase=wealth(t),stock=s.food,pool=t.sim.purseView().household;
  assert.match(no(submit(price)).message,/terms changed/);assert.equal(s.food,stock);assert.equal(t.sim.purseView().household,pool);
  assert.deepEqual(wealth(t),beforePurchase);const again=option(t,'household');
  if(again.available)ok(submit(again));else assert(again.reason);
  t.sim.destroy();
});
test('an invalid or revoked wage reservation cannot be claimed despite a perfectly current physical meeting',()=>{
  const t=setup(),s=t.sim.active();ok(act(t,'start'));ok(act(t,'check'));
  const payment=option(t,'finish'),book=s.exchange;
  delete s.exchange;no(t.sim.purseAction(payment.request,pose(t,payment.venue)));assert.equal(s.purses.people.steward.balance,0);
  s.exchange=book;ok(act(t,'cancel'));no(t.sim.purseAction(payment.request,pose(t,payment.venue)));
  assert.equal(t.sim.purseView().balance,0);assert.equal(s.exchange.till,8);t.sim.destroy();
});

function offerWithNotice(t){
  const site=t.sim.active(),leaver=site.residents[0].id;
  site.careers??={};
  site.careers[leaver]={revision:1,qualifications:{nurse:1},portfolios:{nurse:3},skills:{},references:{},history:[],
    application:{targetId:'nurse',phase:'offer',dueWeek:4,appliedWeek:1,autonomous:false}};
  switchTo(t,leaver);
  function review(){
    return t.c.EarthCareers.view(t.sim.state,t.sim.active(),leaver,'nurse',{speakerId:leaver});
  }
  function choose(action,coverId){
    const s=t.sim.active();
    return t.sim.lifeAction(leaver,{domain:'career',action,targetId:'nurse',actorId:leaver,siteId:s.id,
      generation:s.foundingRevision||0,week:t.sim.state.week,expectedRevision:review().revision,coverId},pose(t,{residentId:leaver}));
  }
  ok(choose('accept'));
  const cover=()=>review().choices.find(row=>row.id==='handover')?.coverId;
  assert(cover(),'The departing worker has a colleague available to cover the notice period.');
  return {leaver,cover,choose};
}

test('an arranged handover reserves the colleague through departure and rejects an earlier stock-check quote after reload',()=>{
  const t=setup(),notice=offerWithNotice(t),colleague=notice.cover();
  switchTo(t,colleague);
  const offer=option(t,'start');assert(offer.available);
  switchTo(t,notice.leaver);ok(notice.choose('handover',colleague));
  switchTo(t,colleague);reload(t);
  const through=t.c.EarthCareers.coverCommitment(t.sim.active(),colleague,t.sim.state.week);
  assert.ok(through>t.sim.state.week);
  assert.equal(option(t,'start').available,false);
  assert.match(option(t,'start').reason,new RegExp('through week '+through));
  const raw=JSON.stringify(t.sim.state);no(t.sim.purseAction(offer.request,pose(t,offer.venue)));
  assert.equal(JSON.stringify(t.sim.state),raw);
  while(t.sim.state.week<through)ok(t.sim.advance());
  assert.equal(t.sim.active().careers[notice.leaver].departure.coverId,colleague);
  assert.equal(option(t,'start').available,false);
  ok(t.sim.advance());assert.equal(t.c.EarthCareers.coverCommitment(t.sim.active(),colleague,t.sim.state.week),null);
  assert.doesNotMatch(option(t,'start').reason,/former duties/);t.sim.destroy();
});

test('a reserved market wage survives reload and the departing employer must choose a different colleague',()=>{
  const t=setup(),notice=offerWithNotice(t),first=notice.cover();
  switchTo(t,first);ok(act(t,'start'));
  switchTo(t,notice.leaver);reload(t);
  const alternative=notice.cover();assert.ok(alternative);assert.notEqual(alternative,first);
  no(notice.choose('handover',first));ok(notice.choose('handover',alternative));
  switchTo(t,first);reload(t);
  assert(t.sim.purseView().shift);assert.equal(t.c.EarthPurses.escrow(t.sim.active()),2);
  ok(act(t,'check'));ok(act(t,'finish'));assert.equal(t.sim.purseView().balance,2);
  assert.equal(t.c.EarthPurses.escrow(t.sim.active()),0);
  assert.equal(t.sim.active().careers[notice.leaver].application.coverId,alternative);t.sim.destroy();
});

test('a paid stock ticket must close before its worker joins a six-hour day as host or companion',()=>{
  for(const booked of ['host','companion']){
    const t=setup();
    vm.runInContext(fs.readFileSync(path.join(source,'shifts.js'),'utf8'),t.c,{filename:'shifts.js'});
    const host=t.sim.active().residents[0].id,worker=booked==='host'?host:'steward';
    switchTo(t,worker);ok(act(t,'start'));switchTo(t,'steward');reload(t);
    const gate=t.c.EarthShifts.gate(t.sim.state,t.sim.active(),host);
    assert.equal(gate.available,false);assert.match(gate.reason,/paid stock check/);
    const before=JSON.stringify(t.sim.state);
    no(t.sim.beginShift(host,()=>true));assert.equal(JSON.stringify(t.sim.state),before);
    assert.equal(t.c.EarthPurses.escrow(t.sim.active()),2);
    switchTo(t,worker);
    if(booked==='host')ok(act(t,'cancel'));
    else{ok(act(t,'check'));ok(act(t,'finish'));}
    switchTo(t,'steward');reload(t);
    assert.equal(t.c.EarthPurses.escrow(t.sim.active()),0);
    ok(t.sim.beginShift(host,()=>true));t.sim.destroy();
  }
});

test('another resident’s market ticket leaves the day available, and starting the day first protects its own participants',()=>{
  const t=setup();
  vm.runInContext(fs.readFileSync(path.join(source,'shifts.js'),'utf8'),t.c,{filename:'shifts.js'});
  const site=t.sim.active(),[host,worker]=site.residents.map(p=>p.id),day=t.c.EarthShifts;
  switchTo(t,worker);ok(act(t,'start'));switchTo(t,'steward');reload(t);
  assert(day.gate(t.sim.state,t.sim.active(),host).available);
  ok(t.sim.beginShift(host,()=>true));reload(t);
  const booked=t.sim.active().purses.tickets;
  assert(booked[worker]);assert.equal(t.c.EarthPurses.escrow(t.sim.active()),2);
  const stock=option(t,'start');assert.equal(stock.available,false);assert.match(stock.reason,/accompanied shift/);
  assert.equal(t.sim.active().shift.residentId,host);
  t.sim.destroy();
});

test('the payroll scheduler leaves a resident hosting an accompanied day free to complete it',()=>{
  const t=setup();
  vm.runInContext(fs.readFileSync(path.join(source,'shifts.js'),'utf8'),t.c,{filename:'shifts.js'});
  const [host,other]=t.sim.active().residents.map(p=>p.id);
  t.sim.active().food=0;ok(t.sim.beginShift(host,()=>true));reload(t);
  function candidate(id){
    return {id,free:true,profile:{aptitudes:{organisation:65}},traits:{initiative:60,patience:55}};
  }
  assert.equal(t.c.EarthPurses.opportunity(t.sim.state,t.sim.active(),candidate(host)),null);
  assert.ok(t.c.EarthPurses.opportunity(t.sim.state,t.sim.active(),candidate(other)));
  t.sim.destroy();
});

test('relocation carries the actual remaining purse, keeps both local wage books and the household pool, and preserves a same-week work limit',()=>{
  const t=setup(),{sim,c}=t,origin=sim.active(),w=sim.state,api=c.EarthPurses;
  earn(t);ok(act(t,'donate'));
  ok(sim.found({name:'Garden Ward',lat:-36,lon:145,water:false}));const dest=sim.active();
  const priorHouse=origin.purses.household,originTill=c.EarthMarket.privateTill(origin),destTill=c.EarthMarket.privateTill(dest);
  const moved=api.moveBalance(w,origin,dest,'steward','steward');
  assert.deepEqual([moved.moved,moved.kept,moved.worked],[1,0,true]);
  assert.deepEqual([origin.purses.people.steward.earned,origin.purses.people.steward.balance,origin.purses.household],[2,0,priorHouse]);
  assert.deepEqual([dest.purses.people.steward.earned,dest.purses.people.steward.balance,dest.purses.household],[0,1,0]);
  assert.deepEqual([c.EarthMarket.privateTill(origin),c.EarthMarket.privateTill(dest)],[originTill,destTill]);
  assert.deepEqual(JSON.parse(JSON.stringify(origin.purses.people.steward.entries[0].transfer)),JSON.parse(JSON.stringify(dest.purses.people.steward.entries[0].transfer)));
  assert.equal(option(t,'start').available,false);assert.equal(sim.purseView().openings,2,'an incoming wage record does not occupy a job in the new district');
  assert.equal(api.moveBalance(w,origin,dest,'steward','steward'),null,'retry cannot issue another receipt');
  assert.ok(api.validMoves(w));assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));
  const forged=JSON.parse(JSON.stringify(w));forged.sites[1].purses.people.steward.entries[0].transfer.fromRevision++;
  assert.equal(api.validMoves(forged),false);
  ok(act(t,'donate'));assert.equal(dest.purses.household,1);assert.equal(origin.purses.household,1);
  assert.ok(api.valid(dest,w.week));assert.ok(api.validMoves(w));
  ok(sim.advance());assert.equal(option(t,'start').available,true);
  earn(t);assert.equal(dest.purses.people.steward.earned,2);assert.equal(origin.purses.people.steward.earned,2);
  const back=api.moveBalance(w,dest,origin,'steward','steward');assert.equal(back.moved,2);assert.equal(origin.purses.people.steward.balance,2);
  assert.equal(origin.purses.people.steward.earned,2);assert.equal(dest.purses.people.steward.balance,0);assert.ok(api.validMoves(w));
  assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});
test('a paid worker with an empty purse carries only the same-week work commitment; unrelated residents can still take the local opening',()=>{
  const t=setup(),{sim,c}=t,from=sim.active();earn(t);ok(act(t,'donate'));ok(act(t,'donate'));
  ok(sim.found({name:'North Bend',lat:36,lon:-104}));const to=sim.active();
  const out=c.EarthPurses.moveBalance(sim.state,from,to,'steward','steward');assert.equal(out.moved,0);assert(out.worked);
  assert.equal(c.EarthPurses.committed(to,'steward',sim.state.week),true);
  assert.equal(c.EarthPurses.committed(to,to.residents[1].id,sim.state.week),false);
  assert.equal(to.purses.people.steward.lastWeek,0);assert.equal(to.purses.people.steward.earned,0);
  assert.ok(c.EarthPurses.validMoves(sim.state));assert.ok(c.CommonEarthSim.readSave(JSON.stringify(sim.state)));sim.destroy();
});
