'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function game(saved){
  let time=1750000000000;
  class Clock extends Date{static now(){return time;}}
  const q=vm.createContext({Date:Clock,console,structuredClone});q.window=q;
  for(const [,name] of fs.readFileSync(path.join(dir,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),q,{filename:name+'.js'});if(name==='simulation')break;
  }
  const sim=q.CommonEarthSim.create({storage:null,snapshot:saved});
  if(!sim.active())assert.ok(sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false}).ok);
  const w=sim.state;
  return {w,q,sim,home:sim.active(),shore:w.communityLife.outposts[0],hostile:w.communityLife.outposts[1],
    step(){time+=24100;assert.ok(sim.production(w.productionSerial||0,()=>true).ok);},week(){time+=120000;assert.ok(sim.advance().ok);},
    snap(){const r=JSON.stringify(w);assert.ok(q.CommonEarthSim.readSave(r));return r;}};
}
function command(f,request){
  return f.q.EarthTownCentre.command(f.w,f.home,{site:f.home.id,week:f.w.week,round:f.home.growth?.round||0,serial:f.w.townCentres.next,...request});
}
test('a remote housing shortage becomes an occupied home, a recruit and a trading shop with or without an observer',()=>{
  const first=game(),saved=first.snap(),a=game(saved),b=game(saved),s=a.shore,H=a.q.EarthHousing,R=a.q.EarthRegionalWorld;
  const displaced=Object.keys(s.housing.distress)[0],before=H.summary(s).capacity;
  assert.ok(displaced);let project,payer;
  for(let i=1;i<=16;i++){
    // The same reads the street observer and regional map make; neither buys a right or discovers land.
    H.directory(s);H.structures(s);a.q.EarthBorders.character(s);R.inspect(a.w,s,0,0);R.travellers(a.w,s);
    a.step();b.step();
    if(i===1){
      project={...s.housing.project};assert.equal(project.materials,4);assert.equal(project.wage,3);assert.equal(H.summary(s).capacity,before);
      const rows=a.q.EarthDistrictGrowth.transfers(s.growth.history[0]);
      assert.ok(rows.some(r=>r.from==='Community treasury'&&r.workId===project.id&&r.amount===3));
      assert.ok(rows.some(r=>r.from==='Public building store'&&r.workId===project.id&&r.amount===4));
      payer=s.purses?.people[project.worker]?.balance||0;
    }
    if(i===2){assert.equal(s.housing.project.phase,'building');assert.equal(H.summary(s).capacity,before);}
    if(i===3){
      assert.equal(s.housing.licences[displaced],project.id);assert.equal(H.summary(s).capacity,before+2);
      assert.ok(s.purses.people[project.worker].balance>=payer+3);
      assert.equal(s.population,11);assert.ok(s.housing.licences[s.housing.lastArrival.key]);
    }
  }
  assert.equal(a.snap(),b.snap());
  const shop=s.housing.titles.find(t=>t.kind==='shop');assert.ok(shop.sales>0);
  const home=H.directory(s).find(t=>t.id===project.id);assert.equal(home.people.length,2);
});
test('one missing building input prevents funding and occupancy until the town can deliver it',()=>{
  const seed=game().snap(),a=game(seed),b=game(seed);b.shore.materials=0;
  a.step();b.step();
  assert.equal(a.shore.housing.project.phase,'delivery');
  assert.equal(b.shore.housing.project,undefined);assert.match(b.shore.housing.reason,/materials/);
  b.shore.materials=a.shore.materials+4;
  for(let i=0;i<4;i++)b.step();
  assert.ok(b.shore.housing.titles.some(t=>t.kind==='house'));assert.ok(b.snap());
});
test('a past agreement affects entry, resident composition affects aggression, witnesses carry news after the encounter',()=>{
  const a=game(),s=a.hostile,p=a.w.communityLife.profile,B=a.q.EarthBorders;
  const first=B.assessment(a.w,s,p,a.home);
  assert.equal(first.closed,true);assert.equal(first.type,'Hostile to unintroduced visitors');
  B.remember(a.w,s,p,a.home,52,'The host witnessed the visitor return the freight.',false);
  assert.ok(B.request(a.w,s,p,a.home).ok);
  const held=B.assessment(a.w,s,p,a.home);assert.ok(held.introduced);assert.equal(held.homeTrust>first.homeTrust,true);
  assert.ok(!B.receive(a.w,s,p,a.home).denied);
  assert.equal(a.home.border?.reports[s.id],undefined);
  for(let i=0;i<9;i++)a.step();
  assert.ok(a.home.border.reports[s.id].count>0);
  const before=B.character(s);
  for(const r of a.q.EarthDistrictGrowth.members(s)){
    s.communityLife.people[r.id]||={profile:structuredClone(r),status:'member'};
    s.communityLife.people[r.id].profile.background={...r.background,aggression:2};
  }
  const after=B.character(s);
  assert.ok(after.tally.forceful<before.tally.forceful);assert.ok(after.mean<before.mean);
  assert.equal(after.custom,before.custom);
});
test('targeted criteria, a blind housing deficit and an obsolete quote reconcile against actual people and funds',()=>{
  const f=game(),H=f.q.EarthHousing,C=f.q.EarthTownCentre,terms={aggression:[86,87],learning:[20,23],craft:[72,78]};
  f.home.funds=140;const cost=C.price(terms),first=f.home.funds,n=f.home.population;
  assert.ok(cost>C.price({craft:[45,95]}));assert.ok(C.price({craft:[45,95]})>C.price({}));
  const stale=f.w.townCentres.next,paid=command(f,{action:'targeted',criteria:terms,price:cost});assert.ok(paid.ok,paid.message);
  assert.equal(f.home.funds,first-cost);assert.equal(f.home.population,n+1);
  const person=f.q.EarthPersonas.profile(f.home,paid.personId);
  for(const [k,[lo,hi]] of Object.entries(terms)){const score=person.background[k]??person.aptitudes[k];assert.ok(score>=lo&&score<=hi,k);}
  assert.equal(command(f,{action:'blind',price:0,serial:stale}).ok,false);
  const before=f.home.funds;
  for(let i=0;i<3;i++)assert.ok(command(f,{action:'blind',price:0}).ok);
  assert.equal(f.home.funds,before);assert.ok(H.summary(f.home).unhoused>0);assert.ok(f.snap());
});
test('an accepted regional applicant carries the same identity, purse, relationships and workplace vacancy into a new town',()=>{
  const f=game(),C=f.q.EarthTownCentre,from=f.shore;
  const p=f.q.EarthDistrictGrowth.members(from).find(p=>p.id.startsWith('walker-')&&f.q.EarthCommunityLife.canLeave(from,p.id,f.w));
  f.q.EarthPurses.productionReceipt(f.w,from,p.id,7,p.name+' completed a funded shift before applying.');
  const number=++f.w.townCentres.serial;
  f.w.townCentres.applications.push({key:p.identityKey,id:p.id,name:p.name,number,week:f.w.week,until:f.w.week+4,from:from.id,to:f.home.id,need:'care',fit:80});
  const [s0,s1]=[from.population,f.home.population],reputation=f.q.EarthBorders.character(f.home);
  const r=command(f,{action:'accept',application:number});assert.ok(r.ok,r.message);
  assert.equal(from.population,s0-1);assert.equal(f.home.population,s1+1);
  assert.equal(f.q.EarthPersonas.profile(f.home,r.personId).identityKey,p.identityKey);
  assert.ok(from.communityLife.vacancies.some(v=>v.name===p.name));assert.equal(f.home.purses.people[r.personId].balance,5);
  assert.equal(from.housing.members[p.identityKey],undefined);assert.ok(f.home.housing.licences[p.identityKey]);
  const sponsor=f.home.communityLife.people[r.personId].sponsor;assert.ok(f.q.EarthAutonomy.bond(f.home,sponsor,r.personId,f.w.week)>0);
  assert.notDeepEqual(f.q.EarthBorders.character(f.home).tally,reputation.tally);assert.ok(f.snap());
});
test('older saves preserve property, census and rights on successive reopens',()=>{
  const old=game();old.step();const raw=JSON.parse(old.snap());delete raw.townCentres;
  for(const s of [...raw.sites,...raw.communityLife.outposts]){delete s.housing;delete s.border;}
  const a=game(JSON.stringify(raw)),b=game(a.snap());
  for(const [i,s] of [a.home,...a.w.communityLife.outposts].entries()){
    const copy=[b.home,...b.w.communityLife.outposts][i],ledger=a.q.EarthHousing.summary(s);
    assert.ok(ledger.capacity>=18);assert.equal(s.population,copy.population);
    assert.equal(JSON.stringify(s.housing),JSON.stringify(copy.housing));assert.ok(a.q.EarthHousing.structures(s).some(b=>b.use==='townCentre'));
  }
});
