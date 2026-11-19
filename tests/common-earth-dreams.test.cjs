'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const files=['personas','careers','employers','dreams','social-memory','local-projects','autonomy','agency','market','purses','simulation'];
const plain=value=>JSON.parse(JSON.stringify(value));
function game(place='Stone Town',lat=-6.16,lon=39.19){
  const ctx={structuredClone};ctx.window=ctx;vm.createContext(ctx);
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(source,file+'.js'),'utf8'),ctx,{filename:file+'.js'});
  const sim=ctx.CommonEarthSim.create({storage:null});
  assert(sim.found({name:place,lat,lon}).ok);
  return {c:ctx,sim,s:sim.active(),w:sim.state};
}
function session(t){
  const id=t.c.EarthAgency.actorId(t.s),a=t.c.EarthAutonomy;
  const option=a.guidance(t.s,t.w,id).choices.find(o=>o.id==='dreamPractice');
  const proof={siteId:t.s.id,actor:id,personId:id,venue:option?.venue,mode:'walk',x:3,y:4,tx:3.2,ty:4};
  const request={domain:'autonomy',action:'dreamPractice',actorId:id,siteId:t.s.id,generation:t.s.foundingRevision,
    expectedRevision:option?.expectedRevision,week:t.w.week};
  return {option,proof,run:(p=proof)=>t.sim.lifeAction(id,request,()=>p)};
}
test('opening week is personal and visibly purposeful before the player advances time, without paying out a credit',()=>{
  const t=game(),{s,w,c}=t,prior=JSON.stringify(w);
  const cast=c.EarthPersonas.list(s);
  const plans=cast.map(p=>c.EarthAutonomy.intent(s,p.id));
  assert.equal(plans.filter(row=>row.kind==='dream').length,2);
  assert.ok(plans.every(plan=>plan.goal&&plan.title&&plan.venue));
  assert.ok(new Set(plans.map(p=>p.title)).size>=7);
  for(const p of cast){
    const dream=c.EarthAutonomy.dream(s,w,p.id);
    assert(dream.title&&dream.quote&&dream.community&&dream.activity);assert(dream.total>=6);
    assert.equal(dream.progress,0);
  }
  assert.equal(JSON.stringify(w),prior);assert.equal(s.careers,undefined);
  t.sim.destroy();
});
test('player progress requires the person and the physical venue, consumes a single practice session and survives a change of perspective',()=>{
  const t=game(),{s,c,w,sim}=t,{option,run,proof}=session(t);
  assert(option.available,option.reason);
  const prior=JSON.stringify(w);
  for(const altered of [{venue:'wrong'},{personId:'driver'},{mode:'drive'},{tx:10},{actor:'walker-0'}]){
    const result=run({...proof,...altered});assert.equal(result.ok,false,result.message);assert.equal(JSON.stringify(w),prior);
  }
  const done=run();assert(done.ok,done.message);
  const desire=c.EarthAutonomy.dream(s,w,'steward');
  assert.equal(desire.progress,1);assert.equal(s.careers.steward.lastPracticeWeek,w.week);
  assert(!run().ok);
  assert(c.CommonEarthSim.readSave(JSON.stringify(w)));
  assert(sim.changeActor('walker-1',{siteId:s.id,actor:'steward',mode:'walk',x:3,y:4,
    targetPose:{id:'walker-1',mode:'walk',x:4,y:4}}).ok);
  assert.equal(c.EarthAutonomy.dream(s,w,'steward').progress,1);
  sim.destroy();
});
test('a personal supplier is paid from actual wages once and a clinic or public treasury cannot substitute',()=>{
  const t=game(),{s,c,w}=t,id='steward',p=c.EarthPersonas.profile(s,id);
  const row={dream:{id:'balcony',step:2,sessions:0,started:1,checkpoint:4,last:4}};
  w.week=6;s.buildings=[{kind:'workshop',plot:2}];
  const budget=s.funds,view=()=>c.EarthDreams.view(s,w,id,p,row.dream);
  assert.equal(view().shortfall,2);
  assert.equal(c.EarthDreams.work(s,w,p,row),null);assert.equal(s.funds,budget);
  function pay(action){
    const offer=t.sim.purseView().options.find(o=>o.action===action);assert(offer?.available,offer?.reason);
    return t.sim.purseAction(offer.request,{siteId:s.id,actor:id,mode:'walk',x:3,y:3,tx:3.4,ty:3,target:offer.venue.residentId||'market'});
  }
  for(const action of ['start','check','finish'])assert(pay(action).ok);
  assert.equal(s.purses.people[id].balance,2);
  assert.equal(c.EarthDreams.work(s,w,p,row),null,'the wage already used this week’s session');
  w.week++;
  const done=c.EarthDreams.work(s,w,p,row);assert(done);assert.equal(row.dream.sessions,1);
  assert.equal(s.purses.people[id].balance,0);assert.equal(s.purses.people[id].earned,2);assert.equal(s.funds,budget);
  assert.equal(s.purses.people[id].entries[0].action,'dream');
  assert.equal(c.EarthDreams.work(s,w,p,row),null);assert(c.EarthPurses.valid(s,w.week));assert(c.EarthDreams.valid(row.dream,w.week));
  t.sim.destroy();
});
test('research astronaut progression requires sustained qualified work and a real selection window',()=>{
  const t=game(),{s,c,w}=t,id='steward',p=c.EarthPersonas.profile(s,id);
  const row={dream:{id:'space',step:1,sessions:0,started:1,checkpoint:4,last:4}};
  w.week=40;const goal=()=>c.EarthDreams.view(s,w,id,p,row.dream);
  assert.match(goal().blockers.join(' '),/post and two years/);assert.equal(c.EarthDreams.work(s,w,p,row),null);
  s.careers={[id]:{revision:1,skills:{},jobId:'engineer',joinedWeek:5,history:[],qualifications:{},portfolios:{},references:{}}};
  assert.match(goal().blockers.join(' '),/week 109/);
  for(w.week=109;w.week<115;w.week++)assert(c.EarthDreams.work(s,w,p,row));
  assert.equal(row.dream.step,2);assert.match(goal().next,/week 127/);
  w.week=127;while(goal().blockers.length)w.week++;
  assert(c.EarthDreams.work(s,w,p,row));w.week++;
  assert.match(goal().next,/selection panel/);assert(!c.EarthDreams.work(s,w,p,row));
  assert(c.EarthDreams.valid(row.dream,w.week));t.sim.destroy();
});
test('autonomous goals compete with duties and social time, charge money at most once per booked stage and match a detached forecast',()=>{
  const t=game(),{c,s,w,sim}=t;
  s.buildings=[{kind:'workshop',plot:2},{kind:'garden',plot:1}];const history=new Set(),dreams=new Set(),finished=new Set();
  for(let turn=0;turn<95;turn++){
    const before=JSON.stringify(w),next=sim.forecastNext();assert.equal(JSON.stringify(w),before);
    const result=sim.advance();assert(result.ok,result.message);
    const forecast=next.sites.find(report=>report.id===s.id);
    for(const [metric,value] of Object.entries(forecast.closing))assert.equal(s[metric],value,'forecast for '+metric);
    assert(c.CommonEarthSim.readSave(JSON.stringify(w)),'save week '+w.week);
    for(const [id,row] of Object.entries(s.autonomy.people)){
      const activity=row.history[0];history.add(activity.kind);
      const aspiration=c.EarthAutonomy.dream(s,w,id);
      if(row.dream)dreams.add(id);if(aspiration?.earned)finished.add(id);
      if(activity.kind==='dream'){
        assert(c.EarthDreams.validIntent(activity));assert.equal(row.dream.last,w.week);
        assert.equal(s.careers[id].lastPracticeWeek,w.week);
      }
    }
  }
  assert(dreams.size>=5,'residents initiated independent ambitions');
  assert(finished.size>=2,'multi-stage projects reached lasting outcomes');
  assert(history.has('rest')&&history.has('dream')&&history.has('visit')&&history.has('project'));
  sim.destroy();
});
test('absence and visitor status leave identities and saved memories intact while disabling employment and local control',()=>{
  const t=game(),{c,s,w}=t,visitor='walker-2',away='walker-1',remember=c.EarthPersonas.birthProfile(s,visitor);
  c.EarthCommunityLife={present:(_s,id)=>id!==away,residency:(_s,id)=>id===away?'away':id===visitor?'visitor':'member',
    profile:(_s,id)=>id===visitor?remember:null};
  assert(c.EarthPersonas.list(s).some(p=>p.id===visitor));assert(!c.EarthPersonas.list(s).some(p=>p.id===away));
  for(const id of [visitor,away]){
    assert(!c.EarthAutonomy.people(s).some(p=>p.id===id));assert(!c.EarthAgency.playables(s).some(p=>p.id===id));
    assert(c.EarthAgency.canPlay(s,id),'historical entries can still validate');
    assert(!c.EarthCareers.command(w,s,id,'enroll','refuse',0,null,{speakerId:id}).ok);
    assert(!c.EarthAgency.checkHandoff(s,id,{siteId:s.id,actor:'steward',mode:'walk',x:2,y:3,targetPose:{id,mode:'walk',x:2,y:4}}).ok);
  }
  t.sim.destroy();
});
test('repeated real meetings matter after the weekly news expires, and a reused street slot cannot inherit another person’s trust',()=>{
  const t=game(),{s,w,c}=t,a=c.EarthAutonomy,id='walker-2',peer='walker-4';
  assert(a.remember(s,w.week,id,peer,'visit'));assert(!a.remember(s,w.week,id,peer,'visit'));
  assert(a.remember(s,w.week,id,peer,'project'));
  assert.equal(a.bond(s,id,peer,w.week),3);assert.equal(a.bond(s,peer,id,w.week),3);
  const actual=c.EarthPersonas.profile(s,peer).name;
  assert.equal(a.contacts(s,id,1)[0].name,actual);assert.equal(a.bond(s,id,peer,10),3);
  assert.equal(a.bond(s,id,peer,28),2);
  assert(c.CommonEarthSim.readSave(JSON.stringify(w)),'relationship saves before first weekly close');
  const newcomer={...c.EarthPersonas.birthProfile(s,peer),name:'New arrival',identityKey:c.EarthPersonas.identityKey('new-district',peer)};
  c.EarthCommunityLife={profile:(_s,key)=>key===peer?newcomer:null,present:()=>true,residency:()=> 'member'};
  assert.equal(a.bond(s,id,peer,w.week),0);
  const abroad=a.contacts(s,id,w.week).find(x=>x.name===actual);assert(abroad);assert.equal(abroad.here,false);
  c.EarthCommunityLife=null;
  w.week=2;a.remember(s,w.week,id,peer,'missed');assert.equal(a.bond(s,id,peer,w.week),0);
  w.week++;a.remember(s,w.week,id,peer,'missed');assert.equal(a.bond(s,id,peer,w.week),-3);
  assert(c.CommonEarthSim.readSave(JSON.stringify(w)));t.sim.destroy();
});
test('namesakes at the same street meeting keep independent histories and existing memories upgrade at the next encounter',()=>{
  const {s,w,c,sim}=game(),life=c.EarthAutonomy,owner='walker-0',localId='walker-3',guestId='walker-4';
  const local=c.EarthPersonas.birthProfile(s,localId),guest={...local,id:guestId,
    identityKey:c.EarthPersonas.identityKey('other-district',localId),birthCommunityId:'other-district'};
  assert.notEqual(guest.identityKey,local.identityKey);
  c.EarthCommunityLife={profile:(_s,id)=>id===guestId?guest:null,present:()=>true,residency:()=> 'member',
    personLabel:(_s,id,name)=>id===guestId?name+' from Orchard Walk':name};
  life.remember(s,1,owner,localId,'visit');
  const tie=s.autonomy.people[owner].ties[0];
  tie.identity=JSON.stringify([local.name,local.home,local.originRole]);
  assert.equal(life.bond(s,owner,localId,1),1);
  assert.equal(life.bond(s,owner,guestId,1),0);
  life.remember(s,1,owner,guestId,'project');
  life.remember(s,2,owner,localId,'listen');
  assert.equal(tie.identity,local.identityKey);
  const contacts=life.contacts(s,owner,2);
  assert.equal(contacts.length,2);assert(contacts.every(p=>p.here));
  assert.equal(new Set(contacts.map(p=>p.id)).size,2);
  assert.equal(life.bond(s,owner,guestId,2),2);
  assert(c.EarthAgency.playables(s).find(p=>p.id===guestId).displayName.endsWith('Orchard Walk'));
  w.week=2;assert(c.EarthAutonomy.valid(s,w.week));sim.destroy();
});
test('achievement and its original place persist when a person chooses a second ambition, moves, or starts another session',()=>{
  const t=game(),{s,w,c}=t,id='walker-0',p=c.EarthPersonas.profile(s,id);
  const life={energy:5,contact:3,revision:1,history:[],dream:{id:'ensemble',started:1,checkpoint:11,last:11,step:3,sessions:0}};
  s.autonomy={week:11,people:{[id]:life},effects:{}};
  w.week=14;assert(c.EarthDreams.work(s,w,p,life));
  const places=c.EarthDreams.landmarks(s);assert.equal(places.length,1);assert.equal(places[0].name,p.name);assert.equal(places[0].id,'ensemble');
  assert.equal(c.EarthDreams.nextPlans(s,w,p,life).length,0);
  w.week=42;const next=c.EarthDreams.nextPlans(s,w,p,life)[0];assert(next);assert(c.EarthDreams.chooseNext(s,w,p,life,next.id));
  assert.equal(c.EarthDreams.view(s,w,id).id,next.id);assert.equal(life.achievements[0].id,'ensemble');
  assert.deepEqual(plain(c.EarthDreams.landmarks(s)),plain(places));
  assert(c.EarthDreams.work(s,w,p,life));assert.equal(life.dream.id,next.id);assert.equal(life.nextDream,undefined);
  assert(c.EarthDreams.validHistory(life,w.week));assert(c.EarthDreams.validPlaces(s,w.week));
  delete s.autonomy.people[id];assert.deepEqual(plain(c.EarthDreams.landmarks(s)),plain(places));
  const other={...s,id:'new-place',name:'New place',autonomy:{people:{[id]:life}}};
  assert.equal(c.EarthDreams.landmarks(other).length,0,'an imported life cannot duplicate a place from its home town');
  t.sim.destroy();
});
test('professional seniority counts actual working weeks, carries practice forward and grows only within a person’s learning range',()=>{
  const t=game(),{s,w,c}=t,id='walker-0',person=c.EarthPersonas.profile(s,id),job='engineer',axis='craft';
  s.careers={[id]:{revision:1,skills:{},jobId:job,joinedWeek:1,qualifications:{},portfolios:{},references:{},history:[],experience:{}}};
  const memory=s.careers[id];
  for(w.week=2;w.week<=14;w.week++)c.EarthCareers.tick(w,s);
  assert.equal(memory.experience.engineer,13);assert.equal(memory.skills.craft,Math.min(person.bounds[axis].max,person.aptitudes.craft+1));
  memory.training={targetId:'nurse',credits:0,startedWeek:w.week,lastWeek:w.week,pace:'intensive',paused:false,autonomous:false};
  for(let i=0;i<4;i++){w.week++;c.EarthCareers.tick(w,s);}
  assert.equal(memory.experience.engineer,13);memory.training.pace='evening';
  w.week++;c.EarthCareers.tick(w,s);assert.equal(memory.experience.engineer,14);
  c.EarthCareers.tick(w,s);assert.equal(memory.experience.engineer,14);
  assert.match(c.EarthCareers.view(w,s,id).tenure.detail,/14 credited working weeks/);
  t.sim.destroy();
});
test('a gardener’s employer keeps a vacancy open beyond notice and closes it only when the qualified replacement actually starts',()=>{
  const t=game(),{s,w,c,sim}=t,departing='walker-0',replacement='walker-1';
  function switchTo(id){
    assert(sim.changeActor(id,{siteId:s.id,actor:c.EarthAgency.actorId(s),mode:'walk',x:4,y:5,
      targetPose:{id,mode:'walk',x:4.5,y:5}}).ok);
  }
  function prepared(id,role,job){
    const p=c.EarthPersonas.profile(s,id),target=c.EarthCareers.catalog.find(j=>j.id===job);
    const skills={};skills[target.skill]=p.bounds[target.skill].max;skills[target.secondary]=p.bounds[target.secondary].max;
    (s.careers||={})[id]={revision:1,skills,qualifications:{[job]:1},portfolios:{[job]:3},references:{},history:[],
      manualWeek:1,...(role?{jobId:role,joinedWeek:1}:{})};
  }
  function take(id,action,targetId){
    const rev=s.careers[id].revision;
    const result=sim.lifeAction(id,{domain:'career',action,targetId,actorId:id,siteId:s.id,week:w.week,
      generation:s.foundingRevision,expectedRevision:rev},()=>({siteId:s.id,actor:id,mode:'walk',x:3,y:5}));
    assert(result.ok,result.message);
  }
  prepared(departing,'gardener','refuse');prepared(replacement,null,'gardener');
  switchTo(departing);take(departing,'apply','refuse');assert(sim.advance().ok);assert(sim.advance().ok);
  take(departing,'accept','refuse');assert.equal(s.employers,undefined);
  while(s.careers[departing].application)assert(sim.advance().ok);
  const exposed=c.EarthEmployers.view(s,w,'gardener');
  assert.equal(exposed.rows[0].formerId,departing);assert.equal(exposed.rows[0].opened,w.week);assert.equal(c.EarthEmployers.recorded(s,'gardener'),1);
  for(let i=0;i<5;i++)assert(sim.advance().ok);
  assert.equal(s.careers[departing].departure,undefined);
  const open=c.EarthEmployers.view(s,w,'gardener');
  assert.equal(open.rows.length,1);assert.equal(open.rows[0].covered+open.rows[0].missed,1);
  switchTo(replacement);take(replacement,'apply','gardener');assert(sim.advance().ok);assert(sim.advance().ok);
  assert.equal(c.EarthEmployers.recorded(s,'gardener'),1,'an offer is not a replacement');
  take(replacement,'accept','gardener');while(s.careers[replacement].application)assert(sim.advance().ok);
  const closed=c.EarthEmployers.view(s,w,'gardener');
  assert.equal(closed.rows.length,0);assert.equal(closed.lastHire.by,replacement);
  assert.equal(closed.lastHire.formerId,departing);assert.equal(s.careers[departing].jobId,'refuse');
  assert(c.CommonEarthSim.readSave(JSON.stringify(w)));sim.destroy();
});
test('a two-way employee exchange fills both openings without a phantom unstaffed post',()=>{
  const t=game(),{s,w,c}=t,job=id=>c.EarthCareers.catalog.find(j=>j.id===id);
  const gardener=c.EarthPersonas.profile(s,'walker-0'),collector=c.EarthPersonas.profile(s,'walker-1');
  const moves=[{person:gardener,from:job('gardener'),to:job('refuse'),appointed:true},
    {person:collector,from:job('refuse'),to:job('gardener'),appointed:true}];
  assert.equal(c.EarthEmployers.transition(w,s,moves).length,2);
  assert.equal(c.EarthEmployers.recorded(s,'gardener'),0);assert.equal(c.EarthEmployers.recorded(s,'refuse'),0);
  assert.equal(c.EarthEmployers.view(s,w,'refuse').lastHire.by,gardener.id);
  assert(c.EarthEmployers.valid(s,w.week));t.sim.destroy();
});
test('a long-blocked balcony can be parked without a false achievement, and the earned measurements return after workshop access improves',()=>{
  const t=game(),{s,w,c}=t,id='walker-1',p=c.EarthPersonas.profile(s,id);
  const life={energy:5,contact:2,revision:2,history:[],dream:{id:'balcony',started:1,checkpoint:4,last:4,step:2,sessions:0}};
  s.autonomy={week:4,people:{[id]:life},effects:{}};
  s.trust=50;s.buildings=[];w.week=6;
  assert.equal(c.EarthDreams.nextPlans(s,w,p,life).length,0);w.week=50;
  const alternatives=c.EarthDreams.nextPlans(s,w,p,life);assert(alternatives.length);
  assert.equal(alternatives[0].mode,'postpone');
  assert(c.EarthDreams.chooseNext(s,w,p,life,alternatives[0].id));assert.equal(life.onHold.id,'balcony');
  assert.equal(life.achievements,undefined);assert.equal(c.EarthDreams.landmarks(s).length,0);
  assert.equal(c.EarthDreams.view(s,w,id).onHold.retained,4);
  assert(c.EarthDreams.validHistory(life,w.week));
  // Finish the chosen second ambition through its binding calendar and fees.
  s.purses={serial:1,household:0,people:{[id]:{balance:4,earned:4,lastWeek:2,entries:[{week:2,action:'wage',amount:2,balance:4,text:'Worked at the market.'}]}},tickets:{}};
  for(let i=0;i<200&&!life.dream?.completedWeek;i++,w.week++)c.EarthDreams.work(s,w,p,life);
  assert(life.dream.completedWeek);
  w.week+=28;s.buildings=[{kind:'workshop',plot:2}];s.purses.people[id].balance=4;
  const offers=c.EarthDreams.nextPlans(s,w,p,life);assert.equal(offers[0].mode,'resume');
  assert(c.EarthDreams.chooseNext(s,w,p,life,'balcony'));assert.equal(life.onHold,undefined);
  assert.equal(life.dream.step,2);assert.equal(life.dream.started,1);assert.equal(c.EarthDreams.view(s,w,id).progress,4);
  t.sim.destroy();
});
test('relationship history accepts dated negative experiences and rejects duplicate identities, duplicate events and unknown event kinds',()=>{
  const t=game(),valid=t.c.EarthRelationships.valid;
  const memory={id:'walker-0',name:'Robin',identity:'birth:6/site-1walker-0',strength:-6,week:4,kind:'missed',seen:['listen','missed']};
  assert(valid([memory],4));assert(valid([{...memory,strength:10,kind:'listen',seen:['listen']}],4));
  const changes=[{id:''},{name:''},{identity:''},{strength:-7},{strength:11},{strength:1.5},{week:0},{week:5},
    {kind:'constructor'},{kind:'kept'},{seen:[]},{seen:['missed','missed']},{seen:['visit']},{seen:['missed','constructor']}];
  for(const delta of changes)assert.equal(valid([{...memory,...delta}],4),false,JSON.stringify(delta));
  assert.equal(valid([memory,{...memory,id:'walker-1'}],4),false);assert.equal(valid(null,4),false);
  assert(valid([memory,{...memory,id:'walker-1',identity:'another-person'}],4));
  t.sim.destroy();
});
test('native health and survey households take their actual rounds and keep their skills when a new district recruits them',()=>{
  const {c,s,w,sim}=game(),key='carrier-8-7',other='carrier-8-5',profiles=c.EarthPersonas;
  const nurse=profiles.householdProfile(s,key,'practice-nurse'),surveyor=profiles.householdProfile(s,other,'surveyor');
  assert(nurse.qualificationIds.includes('nurse'));assert(surveyor.qualificationIds.includes('surveyor'));
  s.communityLife={people:{[key]:{originId:s.id,householdRole:'practice-nurse',profile:nurse},[other]:{originId:s.id,householdRole:'surveyor',profile:surveyor}}};
  c.EarthCommunityLife={profile:(site,id)=>site.communityLife?.people?.[id]?.profile,present:()=>true,residency:()=> 'member'};
  assert.equal(c.EarthAutonomy.intent(s,key).venue,'hall');assert.equal(c.EarthAutonomy.intent(s,other).venue,'workshop');
  assert.match(c.EarthAutonomy.intent(s,other).title,/measurements/);
  c.EarthCareers.departureForMove(w,s,key);assert.equal(s.employers['practice-nurse'].open.length,1);
  const dest={...s,id:'another-district',careers:{},employers:{},communityLife:{people:{[key]:{originId:s.id,status:'member',profile:nurse}}}};
  const offer=c.EarthCareers.view(w,dest,key,'nurse',{speakerId:key,autonomous:true});
  assert.equal(offer.careerId,'origin');assert(!offer.choices.some(o=>o.id==='enroll'));
  assert(offer.choices.some(o=>o.id==='apply'));assert.equal(c.EarthCareers.work(dest,key),null);
  c.EarthCareers.departureForMove(w,dest,key);assert.equal(Object.keys(dest.employers).length,0);
  sim.destroy();
});
function clinicalHandoverFixture(qualifiedPeer=false){
  const t=game(),{s,w,c}=t,owner='carrier-8-7',helper='walker-0',peer='carrier-8-5';
  const departing=c.EarthPersonas.householdProfile(s,owner,'practice-nurse');
  const current=new Map([[owner,departing],[helper,c.EarthPersonas.birthProfile(s,helper)]]);
  if(qualifiedPeer){
    const clinic=c.EarthPersonas.householdProfile(s,peer,'practice-nurse');
    current.set(peer,{...clinic,role:'Nurse',originRole:'Nurse',qualificationIds:['nurse']});
  }
  const baker=current.get(helper);
  current.set(helper,{...baker,aptitudes:{...baker.aptitudes,care:85,organisation:72},
    bounds:{...baker.bounds,care:{min:85,max:96},organisation:{min:72,max:82}}});
  s.agency={actor:'steward',porters:qualifiedPeer?[owner,peer]:[owner],meals:[]};
  c.EarthCommunityLife={profile:(_s,id)=>current.get(id)||null,present:(_s,id)=>current.has(id)||id==='steward',
    residency:(_s,id)=>current.has(id)||id==='steward'?'member':'away'};
  s.careers={[owner]:{revision:1,skills:{},qualifications:{refuse:1},portfolios:{},references:{},history:[],
    application:{phase:'notice',targetId:'refuse',appliedWeek:1,dueWeek:4,autonomous:true}}};
  const action=()=>c.EarthCareers.view(w,s,owner,'refuse',{speakerId:owner,autonomous:true}).choices.find(o=>o.id==='handover');
  function agree(){
    const offer=action();assert(offer?.available);const m=s.careers[owner];
    const ok=c.EarthCareers.command(w,s,owner,'handover','refuse',m.revision,null,{speakerId:owner,autonomous:true,coverId:offer.coverId});
    assert.ok(ok.ok,ok.message);return ok;
  }
  return {...t,owner,helper,peer,current,action,agree};
}
test('office support keeps the appointment book staffed while the professional round, reference and permanent vacancy reflect the real shortage',()=>{
  const t=clinicalHandoverFixture(),{c,w,s,owner,helper}=t;
  const offer=t.action();assert.equal(offer.coverScope,'admin');
  const admin=offer.coverId;assert(!c.EarthCareers.canCoverPost(s,helper,'practice-nurse'),'a baker with 85 care still lacks the qualification');
  assert.match(c.EarthCareers.view(w,s,helper,'nurse').opening.relief.reason,/qualification/);
  assert.match(offer.detail,/appointment schedules and clinic records/);assert.match(t.agree().message,/qualified colleague/);
  const duty=c.EarthCareers.handoverDuty(s,admin,1);
  assert.equal(duty.scope,'admin');assert.equal(duty.venue,'hall');assert.equal(duty.role,'Practice nurse');
  w.week=2;c.EarthAutonomy.settle(s,w);const outing=c.EarthAutonomy.intent(s,admin);
  assert.equal(outing.handoverScope,'admin');assert.match(outing.title,/appointment/);assert.equal(outing.venue,'hall');
  w.week=4;c.EarthCareers.tick(w,s);
  assert.equal(s.careers[owner].latestReference.quality,1);assert.equal(s.careers[owner].departure.coverScope,'admin');
  const immediate=c.EarthCareers.coverage(s,w).find(g=>g.personId===owner);assert.equal(immediate.coverId,null);
  assert.equal(immediate.adminId,admin);assert.equal(immediate.credential,'practice-nurse');
  assert(c.EarthCareers.weeklyAdjustment(s,w).funds<0);assert.equal(c.EarthCareers.serviceWeeks(w,s,admin,'practice-nurse'),0);
  w.week=8;const vacancy=c.EarthEmployers.gaps(s,w).find(g=>g.opening==='practice-nurse');assert(vacancy);
  assert.equal(c.EarthEmployers.cover(s,w,t.current.get(helper),vacancy),false);assert.equal(c.EarthEmployers.view(s,w,'practice-nurse').rows[0].coverName,null);
  w.week++;c.EarthEmployers.review(w,s);assert.equal(c.EarthEmployers.view(s,w,'practice-nurse').rows[0].missed,1);
  t.sim.destroy();
});
test('equivalent qualified nurses take priority over a skilled administrator and earn the round without filling the permanent vacancy',()=>{
  const t=clinicalHandoverFixture(true),{s,w,c,owner,peer}=t,option=t.action();
  assert(c.EarthCareers.canCoverPost(s,owner,'nurse'));assert(c.EarthCareers.canCoverPost(s,peer,'practice-nurse'));
  s.communityLife={people:{[peer]:{originId:'another-district',status:'member',profile:t.current.get(peer)}}};
  const eligible=c.EarthCareers.view(w,s,peer,'nurse',{speakerId:peer,autonomous:true});
  assert.equal(eligible.careerId,'origin');assert(eligible.opening.relief.available,eligible.opening.relief.reason);
  assert.equal(option.coverId,peer);assert.equal(option.coverScope,'qualified');t.agree();
  assert.equal(c.EarthCareers.handoverDuty(s,peer,1).scope,'qualified');
  w.week=2;c.EarthAutonomy.settle(s,w);assert.equal(c.EarthAutonomy.intent(s,peer).handoverRole,'Practice nurse');
  w.week=4;c.EarthCareers.tick(w,s);assert.equal(s.careers[owner].latestReference.quality,2);
  assert.equal(c.EarthCareers.coverage(s,w).find(g=>g.personId===owner).coverId,peer);
  w.week=8;const gap=c.EarthEmployers.gaps(s,w).find(g=>g.opening==='practice-nurse');assert(gap);
  assert(c.EarthEmployers.cover(s,w,t.current.get(peer),gap));assert.equal(c.EarthEmployers.cover(s,w,t.current.get(peer),gap),false);
  assert.equal(c.EarthEmployers.view(s,w,'practice-nurse').rows[0].coverName,t.current.get(peer).name);
  w.week++;c.EarthEmployers.review(w,s);const live=c.EarthEmployers.view(s,w,'practice-nurse');
  assert.equal(live.rows.length,1);assert.equal(live.rows[0].covered,1);assert.equal(live.rows[0].missed,0);t.sim.destroy();
});
test('legacy clinical cover imports and rechecks the named worker before awarding service or closing the round',()=>{
  const t=clinicalHandoverFixture(),{c,s,w,owner,helper}=t,m=s.careers[owner],name=t.current.get(helper).name;
  Object.assign(m.application,{coverId:helper,coverName:name});
  assert(c.EarthCareers.valid(s,w.week));assert.equal(c.EarthCareers.handoverDuty(s,helper,w.week).scope,'admin');
  w.week=4;c.EarthCareers.tick(w,s);delete m.departure.coverScope;
  assert(c.EarthCareers.valid(s,w.week));assert.equal(c.EarthCareers.coverage(s,w)[0].coverId,null);
  const old=s.employers['practice-nurse'].open[0];w.week=8;
  old.lastCover={id:helper,name,week:w.week};
  assert(c.EarthEmployers.valid(s,w.week));
  assert.equal(c.EarthEmployers.view(s,w,'practice-nurse').rows[0].coverName,null);
  assert.equal(c.EarthEmployers.gaps(s,w).length,1);assert.equal(c.EarthEmployers.rates(s,w).funds,-1);
  w.week++;c.EarthEmployers.review(w,s);assert.equal(old.missed,1);assert.equal(old.covered,0);t.sim.destroy();
});
