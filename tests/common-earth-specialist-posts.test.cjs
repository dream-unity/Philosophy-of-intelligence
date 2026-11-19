'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const ok=r=>{assert.equal(r.ok,true,r.message);return r;};
const json=v=>JSON.parse(JSON.stringify(v));
function town(){
  const ctx=vm.createContext({structuredClone});ctx.window=ctx;
  for(const file of ['personas','agency','careers','simulation'])vm.runInContext(fs.readFileSync(path.join(directory,file+'.js'),'utf8'),ctx,{filename:file+'.js'});
  const db=new Map(),storage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};
  const open=()=>ctx.CommonEarthSim.create({key:'town',storage});
  const sim=open();ok(sim.found({name:'Stone Town',lat:-6.16,lon:39.19}));
  const t={ctx,c:ctx.EarthCareers,sim,s:sim.active(),w:sim.state,open};
  t.view=(id,j='nurse')=>t.c.view(t.w,t.s,id,j,{speakerId:id});
  t.pose=(id)=>({siteId:t.s.id,actor:ctx.EarthAgency.actorId(t.s),x:9,y:8,tx:9.6,ty:8,target:id,mode:'walk',targetPose:{id,x:9.6,y:8,mode:'walk'}});
  t.play=id=>ok(t.sim.changeActor(id,t.pose(id)));
  t.request=(id,key,j='nurse')=>({domain:'career',action:key,targetId:j,actorId:ctx.EarthAgency.actorId(t.s),siteId:t.s.id,generation:t.s.foundingRevision||0,week:t.w.week,expectedRevision:t.view(id,j).revision});
  t.choose=(id,key,j='nurse')=>{t.play(id);return t.sim.lifeAction(id,t.request(id,key,j),t.pose(id));};
  t.step=(n=1)=>{for(let i=0;i<n;i++){const preview=t.sim.forecastNext(),forecast=preview.sites[0].closing;ok(t.sim.advance());
    for(const [key,value] of Object.entries(forecast))assert.equal(t.s[key],value,'preview of '+key+' at week '+t.w.week);}};
  t.reload=()=>{t.sim.destroy();t.sim=open();t.s=t.sim.active();t.w=t.sim.state;assert(t.s);};
  return t;
}
function learnTogether(t,ids){
  for(const id of ids){ok(t.choose(id,'enroll'));ok(t.choose(id,'support'));}
  for(let i=0;i<3;i++){t.step();for(const id of ids)ok(t.choose(id,'portfolio'));}
  t.step(153); // 156 actual calendar weeks after enrolment.
  for(const id of ids){assert.equal(t.view(id).qualifications.nurse,t.w.week);assert.deepEqual(json(t.view(id).missing),[]);}
}
function ready(t,id,j='nurse',jobId){
  const person=t.ctx.EarthPersonas.profile(t.s,id),post=t.c.catalog.find(job=>job.id===j);
  const skills={};
  for(const axis of [post.skill,post.secondary])skills[axis]=person.bounds[axis].max;
  (t.s.careers||={})[id]={revision:1,qualifications:{[j]:1},portfolios:{[j]:3},skills,references:{},history:[],...(jobId?{jobId,joinedWeek:1}:{})};
  assert(t.c.valid(t.s,t.w.week));
}
test('two nurses qualify over three calendar years, share one real post through notice, and fill a second only after the district grows',()=>{
  const t=town(),ids=[t.s.residents[0].id,'walker-0'];learnTogether(t,ids);
  const before=JSON.stringify(t.s),empty=t.view(ids[0]).opening;
  assert.equal(empty.capacity,1);assert.equal(empty.free,1);assert.equal(JSON.stringify(t.s),before);
  for(const id of ids)ok(t.choose(id,'apply'));
  t.step(2);
  const offered=ids.find(id=>t.view(id).stage==='offer'),waiting=ids.find(id=>t.view(id).stage==='waiting');
  assert(offered&&waiting);assert.notEqual(offered,waiting);
  const seat=t.view(waiting).opening;assert.equal(seat.free,0);assert.equal(seat.team.length,1);
  assert.equal(seat.team[0].id,offered);assert.equal(seat.team[0].status,'offer');assert.equal(seat.waiters[0].id,waiting);
  assert.match(t.view(waiting).status,/qualified waiting list/);
  const stale=t.request(waiting,'specialistRelief');ok(t.choose(offered,'accept'));
  assert(!t.sim.lifeAction(waiting,stale,t.pose(waiting)).ok);
  assert.equal(t.view(waiting).opening.team[0].status,'notice');
  const dur=t.view(offered).application.dueWeek-t.w.week;t.step(dur);t.reload();
  assert.equal(t.view(waiting).opening.team[0].status,'appointed');
  assert.equal(t.view(offered).career,'Nurse');assert.notEqual(t.view(waiting).career,'Nurse');
  assert.equal(t.view(waiting).qualified,true);assert(t.view(waiting).choices.some(c=>c.id==='support'));
  t.step(12);assert.equal(t.view(waiting).stage,'waiting');
  t.s.buildings.push({kind:'hall',name:'Assembly hall',plot:0,id:'built-hall'});
  assert.equal(t.view(waiting).opening.capacity,1,'a facility without the households does not fund a second contract');
  t.s.population=18;assert.equal(t.view(waiting).opening.free,1);
  t.step();assert.equal(t.view(waiting).stage,'offer');ok(t.choose(waiting,'accept'));
  t.step(t.view(waiting).application.dueWeek-t.w.week);
  assert.deepEqual(json(t.view(waiting).opening.team.map(e=>e.id)).sort(),[...ids].sort());
  t.s.buildings=[];assert.equal(t.view(waiting).opening.capacity,1);
  t.step(50);t.reload();
  for(const id of ids)assert.equal(t.view(id).career,'Nurse','existing appointments survive and qualifications were never lost');
  assert.equal(t.view(waiting).opening.free,0);assert(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));t.sim.destroy();
});
test('expired offers and real departures open posts in the same panel review while an unrelated old appointment continues',()=>{
  const t=town(),a=t.s.residents[0].id,b='walker-0',c='walker-1';
  for(const id of [a,b,c])ready(t,id);
  for(const id of [a,b])ok(t.choose(id,'apply'));
  t.step();ok(t.choose(c,'apply'));t.step();
  const first=[a,b].find(id=>t.view(id).stage==='offer'),early=[a,b].find(id=>id!==first);
  const until=t.view(first).application.dueWeek;t.step(until+1-t.w.week);
  assert.equal(t.view(first).stage,'deferred');assert.equal(t.view(early).stage,'offer');assert.equal(t.view(c).stage,'waiting');
  ok(t.choose(early,'accept'));t.step(t.view(early).application.dueWeek-t.w.week);
  t.s.careers[early].qualifications.cook=t.w.week;t.s.careers[early].portfolios.cook=2;
  ok(t.choose(early,'apply','cook'));t.step(2);ok(t.choose(early,'accept','cook'));
  const ending=t.view(early,'cook').application.dueWeek;t.step(ending-t.w.week-1);
  assert.equal(t.view(c).stage,'waiting');assert.equal(t.view(early).career,'Nurse');
  t.step();assert.equal(t.view(c).stage,'offer');assert.equal(t.view(early).career,'Cook');
  assert(t.c.coverage(t.s,t.w).some(r=>r.personId===early&&!r.coverId));
  // Historical saves may contain more appointments than today's regional grant.
  for(const id of [first,early]){t.s.careers[id].jobId='nurse';t.s.careers[id].joinedWeek=1;}
  const imported=t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w));assert(imported);
  assert.equal(t.c.view(t.w,imported.sites[0],c,'nurse').opening.team.length,3);
  t.sim.destroy();
});
test('one qualified relief booking covers a genuine service round, displaces exactly one normal crew unit and is safe across two tabs',async()=>{
  const t=town(),a='walker-0',b=t.s.residents[0].id;ready(t,a);ready(t,b);t.s.wellbeing=40;
  t.play(a);const quote=t.request(a,'specialistRelief'),other=t.open();assert.equal(t.view(a).opening.relief.available,true);
  ok(await t.sim.perform('lifeAction',a,quote,()=>t.pose(a)));
  assert.equal((await other.perform('lifeAction',a,quote,()=>t.pose(a))).ok,false);other.destroy();
  assert.equal(t.c.specialistShift(t.s,a,t.w.week),null);
  assert.match(t.choose(b,'specialistRelief').message,/already covers/);
  assert.equal(t.choose(a,'portfolio').ok,false);assert.equal(t.c.hobbyPractice(t.w,t.s,a,'music').ok,false);
  const before=t.s.wellbeing;t.step();assert.equal(t.c.specialistShift(t.s,a,2).metric,'wellbeing');
  assert.equal(t.c.weeklyAdjustment(t.s,t.w).food,-1);assert.equal(t.c.weeklyAdjustment(t.s,t.w).wellbeing,1);
  assert.equal(t.s.wellbeing,before+1);assert.equal(t.c.hobbyPractice(t.w,t.s,a,'music').ok,false);t.reload();
  const corrupt=json(t.w);corrupt.sites[0].careers[b].specialistRelief={...corrupt.sites[0].careers[a].specialistRelief};
  corrupt.sites[0].careers[b].lastPracticeWeek=1;
  assert.equal(t.ctx.CommonEarthSim.readSave(JSON.stringify(corrupt)),null);
  t.step();assert.equal(t.c.specialistShift(t.s,a,3),null);assert.equal(t.c.weeklyAdjustment(t.s,t.w).wellbeing,undefined);
  const incumbent=t.s.careers[b];incumbent.jobId='nurse';incumbent.joinedWeek=1;t.s.wellbeing=90;
  assert.match(t.view(a).opening.relief.reason,/cover its current workload/);
  t.s.wellbeing=40;assert.equal(t.view(a).opening.relief.available,true,'additional unmet clinical demand can justify one relief round');
  t.sim.destroy();
});
test('specialist capacity depends on the local funded service and real, completed buildings; original employment and general jobs retain open access',()=>{
  const t=town(),s=t.s,c=t.c,role='walker-1',before=JSON.stringify(s);
  assert.equal(t.view(role,'driver').opening,null);
  assert.equal(c.openings(s,'grower'),null);assert.equal(c.openings(s,'__proto__'),null);assert.equal(JSON.stringify(s),before);
  s.population=38;s.construction=[{kind:'hall',plot:0,remaining:1}];
  s.city={precincts:[{use:'open',target:'yard'},{use:'open',target:'care'}]};
  for(const id of ['nurse','police','teacher','musician','engineer','mathematician','geneticist'])assert.equal(c.openings(s,id),1);
  s.city.precincts[0].use='yard';s.city.precincts[1].use='care';s.buildings.push({kind:'workshop'});
  assert.equal(c.openings(s,'engineer'),3);assert.equal(c.openings(s,'mathematician'),3);
  assert.equal(c.openings(s,'nurse'),2);assert.equal(c.openings(s,'teacher'),2);assert.equal(c.openings(s,'musician'),2);
  assert.equal(c.openings(s,'police'),1);assert.equal(c.openings(s,'geneticist'),1);t.sim.destroy();
});
test('a qualified NPC on the waiting list books an available round, attends next week and continues their own career afterward',()=>{
  const t=town(),id='walker-0',clinic=t.s.residents[0].id;ready(t,id);ready(t,clinic,'nurse','nurse');
  vm.runInContext(fs.readFileSync(path.join(directory,'autonomy.js'),'utf8'),t.ctx,{filename:'autonomy.js'});
  t.s.wellbeing=40;t.s.careers[id].agreedPlan='nurse';
  t.s.careers[id].application={targetId:'nurse',phase:'waiting',dueWeek:2,appliedWeek:1,autonomous:true};
  let booked=null;
  for(let i=0;i<14&&!booked;i++){t.s.wellbeing=40;t.step();booked=t.s.careers[id].specialistRelief;}
  assert(booked,'the waitlisted baker considers an available clinic session');
  assert.equal(t.s.careers[id].application.phase,'waiting');assert(t.s.careers[id].qualifications.nurse);
  assert.equal(t.ctx.EarthAutonomy.intent(t.s,id).kind,'apply');
  t.step();assert.equal(t.c.specialistShift(t.s,id,t.w.week).employer,'Community clinic');
  assert.equal(t.ctx.EarthAutonomy.intent(t.s,id).kind,'cover');assert.equal(t.ctx.EarthAutonomy.intent(t.s,id).venue,'hall');
  assert.equal(t.view(id).career,'Baker');assert.equal(t.view(id).opening.waiters[0].id,id);
  assert(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));t.sim.destroy();
});
test('a founding grower staffing a clinic round goes to the hall and uses the clinical work sequence even with an empty pantry',()=>{
  const t=town(),grower=t.s.residents[0].id;
  for(const f of ['construction','street-activity'])vm.runInContext(fs.readFileSync(path.join(directory,f+'.js'),'utf8'),t.ctx,{filename:f+'.js'});
  ready(t,grower);t.s.buildings.push({id:'hall',name:'Meeting Hall',plot:4,kind:'hall'});t.s.wellbeing=20;
  ok(t.choose(grower,'specialistRelief'));t.play('steward');t.s.food=0;t.step();
  const w=t.ctx.EarthConstruction.workerRole(t.s,t.w,grower);
  assert.equal(w.physicalDuty,'specialist');assert.equal(w.workplace.label,'Meeting Hall');assert.equal(w.specialistId,'nurse');
  const plan=t.ctx.EarthStreetActivity.plan({kind:'cover',specialistId:w.specialistId,role:'Grower'});
  assert.equal(plan.id,'nurse');assert.equal(t.ctx.EarthStreetActivity.stage(plan,0).label,'Checking the clinic list');
  t.step();assert.equal(t.ctx.EarthConstruction.workerRole(t.s,t.w,grower).specialistId,null);t.sim.destroy();
});
