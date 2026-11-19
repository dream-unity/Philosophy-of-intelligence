'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'../common-earth');
function game(){
  const c=vm.createContext({structuredClone,Date,console});c.window=c;
  for(const match of fs.readFileSync(path.join(dir,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js[^"]*"[^>]*><\/script>/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,match[1]+'.js'),'utf8'),c,{filename:match[1]+'.js'});if(match[1]==='simulation')break;
  }
  const sim=c.CommonEarthSim.create({storage:null});assert(sim.found({name:'Alpine market',lat:46,lon:12,water:false}).ok);
  const site=sim.active(),world=sim.state,id=c.EarthAgency.actorId(site);
  const pose=(other='bench')=>({siteId:site.id,mode:'walk',actor:id,target:other,venue:other,personId:id,x:8,y:8,tx:8.5,ty:8});
  const command=(data,at=pose())=>sim.practiceSession({siteId:site.id,generation:site.foundingRevision,actor:id,week:world.week,serial:site.practice?.serial||0,...data},at);
  const ok=r=>assert.equal(r.ok,true,r.message);
  return {sim,c,site,world,pose,command,id,ok};
}
test('an independent session takes real practice time, records a revised attempt, and survives the ordinary save reader',()=>{
  const {sim,c,site,world,id,command,pose,ok}=game(),m=c.EarthPractice;
  const offer=m.offer(world,site,'sport','solo','');assert(offer.ok,offer.reason);
  ok(command({action:'book',subject:'sport',route:'solo',prediction:2,intention:'Find a pace I can repeat.'}));
  const wrong=(offer.field.best+1)%3;
  assert.equal(command({action:'attempt',choice:wrong},pose('elsewhere')).ok,false);
  ok(command({action:'attempt',choice:wrong}));assert(site.practice.open[0].feedback);
  assert.equal(site.careers?.[id]?.lastPracticeWeek,undefined);
  assert(c.EarthPurses.committed(site,id,world.week));
  assert.equal(c.EarthCareers.hobbyPractice(world,site,id,'stamina').ok,false);
  const opened=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(world)});
  assert.equal(opened.active().practice.open[0].first,wrong);
  ok(command({action:'attempt',choice:offer.field.best}));
  const [record]=site.practice.events;assert.equal(record.outcome,1);assert.equal(record.prediction,2);assert.equal(record.first,wrong);assert.equal(record.choice,offer.field.best);
  assert.equal(record.intention,'Find a pace I can repeat.');assert.equal(site.careers[id].lastPracticeWeek,world.week);
  assert.equal(command({action:'book',subject:'sport',route:'solo',prediction:1}).ok,false);
  assert(c.CommonEarthSim.readSave(JSON.stringify(world)));assert.equal(site.practice.open.length,0);sim.destroy();opened.destroy();
});
test('the same invitation changes with the partner’s existing obligation; respecting a refusal keeps their plan and never charges for a date',()=>{
  const {c,site,world,id,command,pose,ok}=game(),m=c.EarthPractice;
  const partner=c.EarthPersonas.list(site).find(p=>p.id!==id&&c.EarthCommunityLife.present(site,p.id));
  let q=m.offer(world,site,'invitation','solo',partner.id);assert(q.ok,q.reason);assert.notEqual(q.field.best,2);
  site.residents[0].promise={by:partner.id,dueWeek:world.week+1};
  q=m.offer(world,site,'invitation','solo',partner.id);assert(q.ok,q.reason);assert.equal(q.field.best,2);
  assert.equal(m.offer(world,site,'invitation','commission',partner.id).ok,false);
  const reserve=JSON.stringify(site.residents[0].promise),cash=site.purses?.people?.[id]?.balance||0;
  assert.equal(command({action:'book',subject:'invitation',route:'solo',peer:partner.id,prediction:2}).ok,false);
  ok(command({action:'book',subject:'invitation',route:'solo',peer:partner.id,prediction:2},pose(partner.id)));
  ok(command({action:'attempt',choice:0},pose(partner.id)));
  assert.equal(site.practice.events[0].outcome,0);assert.match(site.practice.events[0].otherView,/declined/);
  assert.equal(JSON.stringify(site.residents[0].promise),reserve);assert.equal(site.purses?.people?.[id]?.balance||0,cash);
});
test('a booked professional completes one real home stage for the owner; both the supplier and the worker receive payment',()=>{
  const {sim,c,site,world,id,command,pose,ok}=game(),m=c.EarthPractice;
  // A household with paid earnings can afford the fixture and the builder.
  const amount=12;c.EarthPurses.productionReceipt(world,site,id,amount,'Settled the household orders.');
  const helper=m.participants(world,site,'housing','commission').find(p=>p.available);
  assert(helper,JSON.stringify(m.participants(world,site,'housing','commission')));
  const plan=m.offer(world,site,'housing','commission',helper.id),cash=site.purses.people[id].balance,till=c.EarthMarket.privateTill(site);
  ok(command({action:'book',subject:'housing',route:'commission',peer:helper.id,prediction:2},pose(helper.id)));
  assert.equal(site.privateHomes?.length||0,0);assert.equal(site.purses.people[id].balance,cash);
  assert(m.duty(site,helper.id,world.week));assert(c.CommonEarthSim.readSave(JSON.stringify(world)));
  const notes=m.closeWeek(world,site);assert(notes.length);assert.equal(site.privateHomes.length,1,notes.join(' '));
  assert.equal(site.privateHomes[0].ownerId,id);assert.equal(site.privateHomes[0].stage,1);assert.equal(site.practice.events[0].gain,0);
  assert.equal(c.EarthMarket.privateTill(site),till+plan.home.price);
  assert.equal(site.purses.people[id].balance,cash-plan.home.price-plan.fee);assert.equal(site.purses.people[helper.id].balance,plan.fee);
  assert.equal(m.closeWeek(world,site).length,0);assert(c.CommonEarthSim.readSave(JSON.stringify(world)));sim.destroy();
});
test('route design writes directions for a surveyed dry cell that survive reload without exploring any new land',()=>{
  const {sim,c,site,world,command,pose,ok}=game(),m=c.EarthPractice;
  const before=JSON.stringify(world.regionalWorld?.regions),q=m.offer(world,site,'design','solo','');
  assert(q.ok,q.reason);assert(q.field.note);assert(!m.waymarked(site,q.field.note.cell));
  ok(command({action:'book',subject:'design',route:'solo',prediction:1}));
  ok(command({action:'attempt',choice:q.field.best},pose('market')));
  assert.equal(JSON.stringify(world.regionalWorld?.regions),before);assert(m.waymarked(site,q.field.note.cell));
  const copied=c.CommonEarthSim.readSave(JSON.stringify(world));assert(copied);
  assert(m.waymarked(copied.sites.find(s=>s.id===site.id),q.field.note.cell));sim.destroy();
});
test('a housebuilding lesson needs both people at the plot, pays its suppliers and uses both weekly sessions',()=>{
  const {c,site,world,id,command,pose,ok}=game(),m=c.EarthPractice;
  c.EarthPurses.productionReceipt(world,site,id,12,'Delivered the paid household orders.');
  const teacher=m.participants(world,site,'housing','together').find(p=>p.available);assert(teacher);
  const q=m.offer(world,site,'housing','together',teacher.id),purse=site.purses.people[id].balance;
  ok(command({action:'book',subject:'housing',route:'together',peer:teacher.id,prediction:1},pose(teacher.id)));
  assert(c.EarthPurses.committed(site,teacher.id,world.week));
  const atPlot={...pose(),homePlot:q.home.plot};
  assert.equal(command({action:'attempt',choice:q.field.best},atPlot).ok,false);assert.equal(site.privateHomes?.length||0,0);
  const joined={...atPlot,partnerAtPlot:teacher.id};
  ok(command({action:'attempt',choice:(q.field.best+1)%3},joined));ok(command({action:'attempt',choice:q.field.best},joined));
  assert.equal(site.privateHomes[0].stage,1);
  assert.equal(site.careers[id].lastPracticeWeek,world.week);
  assert.equal(site.careers[teacher.id].lastTeachingWeek,world.week);
  assert.equal(site.purses.people[id].balance,purse-q.fee-q.home.price);
  assert.equal(site.practice.events[0].outcome,1);assert(site.practice.events[0].gain>0);
});
