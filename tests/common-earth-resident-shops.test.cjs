'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const files=['personas','careers','employers','dreams','social-memory','resource-economy','resident-shops','agency','market','purses','local-projects','autonomy','construction','city','simulation'];
function setup(){
  const c=vm.createContext({structuredClone,Date});c.window=c;
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(source,file+'.js'),'utf8'),c,{filename:file});
  const sim=c.CommonEarthSim.create({storage:null}),ok=r=>assert.equal(r.ok,true,r.message);
  ok(sim.found({lat:46,lon:12,name:'Upland'}));
  const s=sim.active(),w=sim.state;
  function pose(venue={type:'market'}){
    return {siteId:s.id,actor:c.EarthAgency.actorId(s),mode:'walk',target:venue.residentId||'market',x:15,y:23,tx:15,ty:23};
  }
  function switchTo(id){ok(sim.changeActor(id,{...pose(),targetPose:{id,mode:'walk',x:15.1,y:23}}));}
  function act(action,good){
    const o=sim.purseView().options.find(o=>o.action===action&&(!good||o.good===good));
    assert(o,action+' '+good);return sim.purseAction(o.request,pose(o.venue));
  }
  function earn(){for(const action of ['start','check','finish'])ok(act(action));}
  function verify(){assert.ok(c.EarthPurses.valid(s,w.week),'purse ledger validates');assert.ok(c.CommonEarthSim.readSave(JSON.stringify(w)),'world reopens');}
  return {c,sim,s,w,ok,pose,switchTo,act,earn,verify};
}
const copy=o=>JSON.parse(JSON.stringify(o));
test('a named maker pays for a physical raw lot, consigns work and sells to another person who owns the useful object',()=>{
  const t=setup(),{s,w,sim,c,ok}=t,maker='walker-1',buyer='steward';
  t.switchTo(maker);t.earn();t.switchTo(buyer);t.earn();w.week++;t.earn();w.week++;
  t.switchTo(maker);
  const p=sim.purseView(),o=p.options.find(o=>o.action==='makeWare'&&o.available&&['apron','basket','crate','satchel','sling'].includes(o.good));
  assert(o,JSON.stringify(p.options.filter(o=>o.action==='makeWare')));
  const raw=()=>sim.marketView().local.rows.find(row=>row.id===o.input)?.shelf||0;
  const old={raw:raw(),money:p.balance,cash:s.exchange.till,treasury:s.funds,pantry:s.food,materials:s.materials};
  assert.equal(sim.purseAction(o.request,{...t.pose(),target:'hall'}).ok,false);
  ok(sim.purseAction(o.request,t.pose()));assert.equal(sim.purseAction(o.request,t.pose()).ok,false);
  assert.equal(raw(),old.raw-1);assert.equal(sim.purseView().balance,old.money-o.price);assert.equal(s.exchange.till,old.cash+o.price);
  assert.equal(sim.purseView().stalls[0].wares.length,1);assert.equal(sim.purseView().items.length,0);
  assert.ok(sim.purseView().options.filter(o=>o.action==='makeWare').every(o=>!o.available));t.verify();
  t.switchTo(buyer);
  const buy=sim.purseView().options.find(x=>x.good===o.good&&x.action==='buyWare');
  assert.ok(buy.available,buy.reason);
  const before=t.sim.purseView().balance,privateCash=s.exchange.till;
  ok(sim.purseAction(buy.request,t.pose()));assert.equal(sim.purseAction(buy.request,t.pose()).ok,false);
  assert.equal(s.purses.people[buyer].balance,before-buy.price);assert.equal(s.purses.people[maker].balance,old.money-o.price+buy.price);
  assert.equal(s.purses.people[maker].stall.wares.length,0);assert.equal(s.purses.people[buyer].belongings[o.good],1);
  assert.deepEqual([s.funds,s.food,s.materials,s.exchange.till],[old.treasury,old.pantry,old.materials,privateCash]);
  const good=o.good==='sling'?'stone':['crate','satchel'].includes(o.good)?'timber':'grain';
  assert.equal(sim.marketView().local.options.find(q=>q.good===good&&q.action==='gatherLot').price,3);
  const fake=copy(w);fake.sites[0].purses.people[buyer].entries[0].pair.product='unknown';assert.equal(c.CommonEarthSim.readSave(JSON.stringify(fake)),null);
  t.verify();sim.destroy();
});
test('a private gift keeps paired receipts, conserves cash, rejects overdrafts and never credits a public budget',()=>{
  const t=setup(),{s,w,c,ok}=t;t.earn();
  const gift=(n,to='driver')=>c.EarthPurses.transferPerson(w,s,'steward',to,n,'Gift for Beatrice’s personal practice.');
  const old=JSON.stringify(s);assert.equal(gift(3).ok,false);assert.equal(gift(1,'steward').ok,false);assert.equal(JSON.stringify(s),old);
  const cash=s.funds;ok(gift(2));assert.equal(s.purses.people.driver.balance,2);assert.equal(s.purses.people.steward.balance,0);assert.equal(s.funds,cash);
  assert.ok(c.EarthPurses.valid(s,w.week));t.verify();
  const invalid=copy(w);invalid.sites[0].purses.people.driver.entries[0].pair.stamp++;assert.equal(c.CommonEarthSim.readSave(JSON.stringify(invalid)),null);
  t.sim.destroy();
});
test('makers and customers choose private work through the normal weekly decision engine',()=>{
  const t=setup(),{s,w,sim,c}=t,observed=new Set();
  for(let week=0;week<58;week++){
    const result=sim.advance();assert.ok(result.ok,result.message);
    for(const plan of Object.values(s.autonomy?.people||{})){
      const intent=plan.history[0];if(intent.kind==='marketSupply')observed.add(intent.activity);
    }
    assert.ok(c.EarthPurses.valid(s,w.week),'a valid purse book in week '+w.week);
  }
  assert.ok(observed.has('stockStall'),JSON.stringify([...observed]));assert.ok(observed.has('shop'),JSON.stringify([...observed]));
  t.verify();sim.destroy();
});

test('an owner funds three physical building stages over eight weeks, then a willing sale transfers the deed without adding a second dwelling',()=>{
  const t=setup(),{s,w,sim,c,ok}=t,treasury=s.funds;
  const builder=c.EarthPersonas.list(s).find(p=>p.id!=='steward'&&p.aptitudes.craft>=50).id;
  const buyer=c.EarthPersonas.list(s).find(p=>p.id!=='steward'&&p.id!==builder).id;t.switchTo(builder);
  for(let i=0;i<3;i++){t.earn();w.week++;}
  function current(){return sim.purseView().options.find(q=>q.action==='buildHome');}
  function build(){
    const q=current();assert(q?.available,q?.reason);
    const address=c.EarthConstruction.privateHomeSite(q.plot),scene={siteId:s.id,actor:builder,mode:'walk',x:address.x,y:address.y,tx:address.x,ty:address.y,homePlot:q.plot};
    assert.equal(sim.purseAction(q.request,t.pose()).ok,false,'buying supplies at the exchange cannot finish construction from afar');
    ok(sim.purseAction(q.request,scene));assert.equal(sim.purseAction(q.request,scene).ok,false);
  }
  const initial=c.EarthCityModel.housingCapacity(s);build();assert.equal(c.EarthCityModel.housingCapacity(s),initial);
  assert.equal(current().available,false);w.week+=3;build();w.week+=3;assert.equal(current().available,false);
  w.week++;build();assert.equal(c.EarthCityModel.housingCapacity(s),initial+2);assert.equal(c.EarthCityModel.overview(s).capacity,initial+2);
  assert.equal(s.privateHomes[0].ownerId,builder);const held=sim.purseView().balance;t.verify();
  assert.equal(t.act('listHome').ok,false,'a new resident owner can decline to sell while settling in');w.week+=6;ok(t.act('listHome'));const ask=s.privateHomes[0].offer;assert(ask>0);t.switchTo(buyer);
  assert.equal(sim.purseView().options.find(q=>q.action==='buyHome').available,false);
  while(sim.purseView().balance<ask){
    const till=c.EarthMarket.privateTill(s);if(till<2){w.week++;c.EarthMarket.tick(w,s);continue;}
    if(sim.purseView().options.find(q=>q.action==='start')?.available)t.earn();w.week++;
    c.EarthMarket.tick(w,s);
  }
  ok(t.act('buyHome'));assert.equal(s.privateHomes[0].ownerId,buyer);assert.equal(s.privateHomes[0].offer,undefined);
  assert.equal(t.act('listHome').ok,false,'the new owner decides on their own six-week settling-in schedule');
  assert.equal(s.privateHomes.length,1);assert.equal(s.purses.people[builder].balance,held+ask);assert.equal(s.funds,treasury);
  assert.equal(c.EarthCityModel.housingCapacity(s),initial+2);t.verify();t.sim.destroy();
});
test('migration folds a local stall, keeps the stock with its maker and preserves the one-session limit',()=>{
  const t=setup(),{s,w,sim,c,ok}=t;t.earn();w.week++;
  const q=sim.purseView().options.find(q=>q.action==='makeWare'&&q.available);
  assert(q);ok(sim.purseAction(q.request,t.pose()));
  const person=s.purses.people.steward,stock=person.stall.wares.length,oldBalance=person.balance;
  const dest={...s,id:'fresh',purses:undefined};
  const result=c.EarthPurses.moveBalance(w,s,dest,'steward','driver');
  assert(result);assert.equal(person.stall,undefined);assert.equal(dest.purses.people.driver.belongings[q.good],stock);
  assert.equal(dest.purses.people.driver.balance,oldBalance);assert.equal(c.EarthPurses.committed(dest,'driver',w.week),true);
  assert.equal(c.EarthPurses.moveBalance(w,s,dest,'steward','driver'),null);
  assert(c.EarthPurses.valid(dest,w.week));assert(c.EarthPurses.valid(s,w.week));sim.destroy();
});

test('a maker can release a slow-selling consignment at a lower actual price and close without losing stock',()=>{
  const t=setup(),{sim,s,w,c,ok}=t;t.earn();w.week++;
  const q=sim.purseView().options.find(q=>q.action==='makeWare'&&q.available);ok(t.act('makeWare',q.good));
  const before=sim.purseView(),term=before.options.find(x=>x.action==='markDown'&&x.good===q.good);
  assert(term.available);ok(t.act('markDown',q.good));assert.equal(s.purses.people.steward.stall.wares[0].ask,q.ask-1);
  assert.equal(t.sim.purseAction(term.request,t.pose()).ok,false);
  const balance=s.purses.people.steward.balance;ok(t.act('foldStall'));
  assert.equal(s.purses.people.steward.stall,undefined);assert.equal(s.purses.people.steward.belongings[q.good],1);
  assert.equal(s.purses.people.steward.balance,balance);assert(c.EarthPurses.committed(s,'steward',w.week));t.verify();sim.destroy();
});
