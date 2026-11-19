'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
function game(snapshot){
  const ctx=vm.createContext({structuredClone,console});ctx.window=ctx;
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const m of html.matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,m[1]+'.js'),'utf8'),ctx,{filename:m[1]+'.js'});if(m[1]==='simulation')break;
  }
  const sim=ctx.CommonEarthSim.create({snapshot,storage:null});
  if(!sim.active())assert.ok(sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,water:false,coastal:true}).ok);
  const w=sim.state,home=sim.active(),peer=w.communityLife.outposts[0],housing=ctx.EarthHousing,life=ctx.EarthCommunityLife;
  function save(){const raw=JSON.stringify(w);assert.ok(ctx.CommonEarthSim.readSave(raw),'World must load at week '+w.week);return raw;}
  function arrive(id='walker-2'){
    const p=ctx.EarthPersonas.profile(home,id),guest=life.guestSlot(peer,p,home.id,id,'visitor',w.week);
    Object.assign(peer.communityLife.people[guest],{visitFrom:home.id,visitSlot:id,inspects:w.week+1,welcomed:true});
    home.communityLife.away[id]=peer.id;home.trust=24;
    peer.food=50;peer.trust=90;peer.wellbeing=90;
    return guest;
  }
  const pay=(site,id,amount)=>assert.ok(ctx.EarthPurses.productionReceipt(w,site,id,amount,'Saved personal earnings.'));
  return {ctx,sim,w,home,peer,housing,life,save,arrive,pay};
}
test('the same permanent residential rights back the population control, unvisited district and opened save',()=>{
  const {ctx,sim,w,home,peer,housing,save}=game();
  const untouched=JSON.stringify(w),preview=housing.view(w,peer);
  assert.equal(JSON.stringify(w),untouched);
  assert.equal(preview.occupied,peer.population);assert.equal(preview.capacity,peer.population+3);assert.equal(preview.unmet,0);
  assert.equal(new Set(preview.rows.map(r=>r.home)).size,preview.population);
  assert.equal(ctx.EarthCityModel.housingCapacity(peer),preview.capacity);
  const first=JSON.stringify(preview.rows.map(r=>[r.key,r.home]));housing.sync(w,peer);
  const loaded=game(save());assert.equal(JSON.stringify(loaded.housing.view(loaded.w,loaded.peer).rows.map(r=>[r.key,r.home])),first);
  assert.equal(sim.active().id,home.id);
});
test('a visit reserves a real housing share only when its owner can pay; acceptance carries the same person and purse',()=>{
  const {ctx,w,peer,home,life,housing,arrive,pay,save}=game(),id='walker-2',guest=arrive(id);
  const population=peer.population,from=home.population,oldCash=peer.funds,identity=ctx.EarthPersonas.profile(home,id).identityKey;
  const refused=life.acceptVisitor(w,peer,guest);assert.equal(refused.ok,false);assert.match(refused.message,/personal funds/);
  let view=housing.view(w,peer);assert.equal(view.visitors,1);assert.equal(view.reservations.length,0);
  pay(home,id,5);view=housing.view(w,peer);
  const reserved=view.reservations[0].home;
  const arrived=life.acceptVisitor(w,peer,guest);assert.ok(arrived.ok,arrived.message);
  assert.equal(ctx.EarthPersonas.profile(peer,guest).identityKey,identity);assert.equal(peer.population,population+1);
  assert.equal(home.population,from-1);assert.equal(peer.funds,oldCash+2);
  assert.equal(peer.purses.people[guest].balance,3);assert.equal(home.purses.people[id].balance,0);
  const settled=housing.view(w,peer);assert.equal(settled.visitors,0);assert.equal(settled.rows.find(r=>r.key===identity).home,reserved);
  assert.equal(life.acceptVisitor(w,peer,guest).ok,false);save();
});
test('a retained private courtyard can be vacant while a resident lacks rights; purchasing the listed deed pays its owner',()=>{
  const {ctx,w,peer,home,life,housing,arrive,pay,save}=game(),id='walker-2',guest=arrive(id);
  // Restore a genuine historical census with unnamed households. They occupy
  // all eighteen founding places, including any vacated by the seller.
  delete peer.communityLife.foundingPlaces;peer.population=20;
  const owner=peer.residents[0].id;pay(peer,owner,1);
  peer.privateHomes=[{ownerId:owner,plot:0,stage:3,started:1,lastWork:8,cost:6}];w.week=9;w.communityLife.duty.due=11;
  const before=housing.view(w,peer);assert.equal(before.capacity,20);assert.equal(before.unmet,1);assert.equal(before.vacant,1);
  assert.equal(before.homes.find(h=>h.key==='private-0').occupants[0].id,owner);
  pay(home,id,6);peer.privateHomes[0].offer=6;
  const sale=housing.quote(w,peer,home,id);assert.equal(sale.seller,owner);assert.equal(sale.price,6);
  const funds=peer.funds,result=life.acceptVisitor(w,peer,guest);assert.ok(result.ok,result.message);
  assert.equal(peer.funds,funds);assert.equal(peer.purses.people[owner].balance,7);
  assert.equal(peer.privateHomes[0].ownerId,guest);assert.equal(peer.privateHomes[0].offer,undefined);
  assert.equal(housing.view(w,peer).rows.find(r=>r.id===guest).home,'private-0');save();
});
test('a visitor finances a vacant plot and waits for materials, professional availability and real construction before admission',()=>{
  const {ctx,w,peer,home,life,housing,arrive,pay,save}=game(),id='walker-2',guest=arrive(id);
  peer.population=peer.communityLife.foundingPlaces;pay(home,id,10);peer.materials=3;
  let q=housing.quote(w,peer,home,id);assert.equal(q.kind,'finance');assert.equal(q.available,false);assert.match(q.reason,/materials/);
  peer.materials=20;q=housing.quote(w,peer,home,id);assert.ok(q.available,q.reason);
  const population=peer.population,openingCash=peer.funds,signed=life.acceptVisitor(w,peer,guest);assert.ok(signed.pending,signed.message);
  assert.equal(peer.purses.people[q.worker].balance,1);assert.equal(peer.materials,17);assert.equal(peer.funds,openingCash+7);
  assert.equal(peer.privateHomes[0].stage,1);assert.equal(peer.population,population);assert.equal(housing.view(w,peer).capacity,population);
  assert.equal(housing.view(w,peer).works[0].places,2);save();
  for(let week=2;week<=8;week++){w.week=week;w.communityLife.duty.due=week+2;housing.tick(w,peer);}
  assert.equal(peer.privateHomes[0].stage,3);assert.equal(peer.housing.contracts.length,0);
  const builder=ctx.EarthPersonas.profile(peer,peer.housing.shifts.workers[0]);
  assert.match(ctx.EarthDistrictOrders.commitment(w,peer,builder),/funded housing contract/);
  assert.equal(housing.view(w,peer).capacity,population+2);assert.equal(peer.population,population);
  const done=life.acceptVisitor(w,peer,guest);assert.ok(done.ok,done.message);
  assert.equal(peer.population,population+1);assert.equal(peer.funds,openingCash+7);
  assert.equal(housing.view(w,peer).rows.find(r=>r.id===guest).home,'private-0');
  const holdings=Object.values(peer.purses.people).reduce((n,p)=>n+p.balance,0);assert.equal(holdings,3);
  save();
});
function recruit(f){
  const q=f.ctx.EarthTownCentre.quote(f.w,f.home,'random',{});
  const r=f.sim.communityLife({...q,action:'townCentre',actor:'steward'});assert.ok(r.ok,r.message);return r.id;
}
test('the last reserved bed survives a blind invitation, another calendar week and a reopened save',()=>{
  const t=game(),{w,ctx,home,peer,housing,life,pay,save}=t;
  for(let i=0;i<5;i++)recruit(t);
  const source='walker-2',p=ctx.EarthPersonas.profile(peer,source);
  const id=life.guestSlot(home,p,peer.id,source,'visitor',w.week);
  Object.assign(home.communityLife.people[id],{visitFrom:peer.id,visitSlot:source,inspects:w.week+1,welcomed:true});
  peer.communityLife.away[source]=home.id;pay(peer,source,2);
  const pending=housing.sync(w,home),place=pending.reservations[0].home;
  assert.equal(pending.open,0);assert.equal(pending.unmet,0);assert.equal(housing.projected(w,home),1);
  const newer=recruit(t),before=housing.view(w,home);assert.equal(before.unmet,1);
  assert.equal(before.namedMissing[0].id,newer);assert.equal(before.reservations[0].home,place);
  const again=game(save());again.w.week++;
  const v=again.housing.view(again.w,again.home);
  assert.equal(v.namedMissing[0].id,newer);assert.equal(v.reservations[0].home,place);
  assert.equal(again.housing.need(again.w,again.home),1);
});
test('a voluntary donation supports a real resident; an emergency lodging agreement restores a tenancy and work eligibility',()=>{
  const t=game(),{w,home,housing,ctx,pay,save}=t;
  for(let i=0;i<7;i++)recruit(t);
  const unhoused=housing.view(w,home).namedMissing[0];
  assert.ok(housing.workHold(home,unhoused.id));assert.ok(ctx.EarthPurses.workConflict(home,unhoused.id,w.week));
  const donor=ctx.EarthPersonas.list(home).find(p=>p.id!==unhoused.id&&p.traits.sociability>=60);
  pay(home,donor.id,4);const after=home.purses.people[unhoused.id].balance;
  home.housing.relief='private';w.week=2;
  assert.ok(housing.tick(w,home).some(m=>m.includes('emergency accommodation')));
  assert.equal(home.purses.people[unhoused.id].balance,after+1);
  // A completed, unlisted private home whose owner consents can offer its
  // second place under a paid four-week agreement. Fill the freed public place.
  w.week=9;w.communityLife.duty.due=11;
  home.privateHomes=[{ownerId:donor.id,plot:0,stage:3,started:1,lastWork:8,cost:6}];recruit(t);
  const before=housing.view(w,home);assert.equal(before.unmet,1);assert.equal(before.vacant,1);
  const money=home.funds;
  const choice={site:home.id,week:w.week,actor:'steward',action:'housingRelief',generation:home.foundingRevision,level:'emergency',prior:'private'};
  assert.ok(t.sim.communityLife(choice).ok);assert.equal(t.sim.communityLife(choice).ok,false);
  const who=before.namedMissing[0];
  // This fixture starts with the same active resident id as a saved handover.
  (home.agency||={}).actor=who.id;
  assert.equal(ctx.EarthAgency.actorId(home),who.id);
  const newShifts=()=>t.sim.actions('work').filter(a=>a.id.startsWith('work:')||a.id==='courier:pick');
  assert.ok(newShifts().every(a=>!a.available&&/shelter/.test(a.reason)));
  assert.ok(!t.sim.act('work:forage').ok);
  const notes=housing.tick(w,home);
  assert.ok(notes.some(n=>n.includes('four weeks')),notes.join(' '));assert.equal(home.funds,money-1);
  assert.equal(housing.workHold(home,who.id),'');assert.equal(housing.view(w,home).unmet,0);
  assert.ok(newShifts().some(a=>a.available));assert.ok(t.sim.act('work:forage').ok);
  home.agency.actor='steward';
  const saved=game(save());assert.equal(saved.home.housing.leases[0].through,12);
});
test('a prolonged unrelieved shortage records a loss once, excludes that resident from work and preserves the original resident',()=>{
  const f=game(),{w,home,housing,ctx,sim,save}=f;
  for(let i=0;i<7;i++)recruit(f);
  const row=housing.view(w,home).namedMissing[0];
  for(const [id,purse] of Object.entries(home.purses.people))if(purse.balance)ctx.EarthPurses.productionReceipt(w,home,id,-purse.balance,'Spent the last of the household savings on necessities.');
  home.food=1;home.trust=10;home.housing.relief='private';
  const count=home.population;
  for(let week=2;week<=23;week++){
    w.week=week;w.communityLife.duty.due=week+2;
    if(week===17)home.food=0;
    housing.tick(w,home);assert.equal(home.population,count);
  }
  w.week=24;w.communityLife.duty.due=26;housing.tick(w,home);
  assert.equal(home.population,count-1);assert.equal(home.housing.losses.length,1);
  const loss=home.housing.losses[0];assert.equal(loss.key,row.key);
  assert.ok(!ctx.EarthAgency.playables(home).some(p=>p.id===row.id));assert.ok(!ctx.EarthDistrictGrowth.members(home).some(p=>p.id===row.id));
  assert.equal(ctx.EarthCommunityLife.anchor(w).name,w.communityLife.profile.name);
  assert.equal(housing.workHold(home,row.id),'');assert.equal(sim.active().id,home.id);
  const fresh=game(save());assert.equal(fresh.housing.view(fresh.w,fresh.home).rows.some(p=>p.key===row.key),false);
});
test('a full district becomes an inspection option when a resident can afford a serviced plot with uncommitted materials',()=>{
  const {w,home,peer,life,pay}=game();
  for(const s of w.communityLife.outposts){s.population=18;s.food=50;s.trust=80;s.materials=0;}
  peer.materials=20;
  const id='walker-2',option=()=>life.movingOptions(w,home).find(p=>p.id===id);
  assert.equal(option().to,undefined);
  pay(home,id,10);assert.equal(option().to,peer.id);
  peer.materials=3;assert.equal(option().to,undefined);
});
