'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const axes=['numeracy','music','communication','care','craft','stamina','organisation'];
function person(id,name,role,levels={},traits={}){
  const aptitudes=Object.fromEntries(axes.map(axis=>[axis,levels[axis]??60]));
  return {id,name,role,originRole:role,identityKey:'birth-fixture/'+id,home:'Harbour',kind:'walker',aptitudes,
    bounds:Object.fromEntries(axes.map(axis=>[axis,{min:aptitudes[axis],max:98}])),
    traits:{patience:70,sociability:55,adaptability:60,curiosity:75,initiative:75,...traits},strengths:[],interests:[]};
}
function fixture(people,week=1){
  const root={EarthPersonas:{profile:(_,id)=>people.find(p=>p.id===id),list:()=>people},EarthAgency:{actorId:s=>s.agency?.actor||'steward'}};
  root.window=root;vm.createContext(root);
  for(const f of ['social-memory','employers','careers','autonomy']){
    vm.runInContext(fs.readFileSync(path.join(directory,f+'.js'),'utf8'),root,{filename:f+'.js'});
  }
  const s={id:'town',name:'Harbour',agency:{actor:'steward'},founded:1,food:30,materials:24,funds:30,trust:80,wellbeing:80,population:12,residents:[]};
  const world={week,activeId:'town'},c=root.EarthCareers;
  const cv=(id,target)=>c.view(world,s,id,target,{speakerId:id});
  const act=(id,target,action,proof)=>c.command(world,s,id,action,target,cv(id,target).revision,proof,{speakerId:id});
  const entry=(id,fields={})=>((s.careers||={})[id]={revision:1,skills:{},portfolios:{},qualifications:{},references:{},history:[],...fields});
  const pathFor=(id,job)=>{const a=s.autonomy||={week:world.week-1,people:{},effects:{}};a.people[id]={energy:7,contact:0,revision:1,history:[],path:job};};
  const settle=()=>{c.tick(world,s);root.EarthAutonomy.settle(s,world);assert(c.valid(s,world.week),'career data should import');assert(root.EarthAutonomy.valid(s,world.week),'weekly decisions should import');};
  return {root,s,world,c,cv,act,entry,pathFor,settle};
}
const rowan=()=>person('steward','Rowan','Steward');

test('identical entry skills can lead to different work interests, and a real hiring need can change the ranking',()=>{
  const skills={numeracy:79,communication:79,organisation:68};
  const quiet=person('walker-0','Noor','Steward',skills,{sociability:10});
  const outgoing=person('walker-1','Jo','Steward',skills,{sociability:90});
  const {c,s,world,root}=fixture([rowan(),quiet,outgoing],20);
  const scores=p=>Object.fromEntries(c.routes(world,s,p).map(plan=>[plan.job.id,plan]));
  const before=JSON.stringify(s),a=scores(quiet),b=scores(outgoing);
  assert(a.mathematician.attainable&&a.teacher.attainable);
  assert(a.mathematician.score>a.teacher.score);
  assert(b.teacher.score>b.mathematician.score);
  assert.equal(JSON.stringify(s),before,'exploration cannot enrol anyone');
  root.EarthEmployers.open(world,s,outgoing,a.teacher.job,true);
  const opening=scores(quiet).teacher;
  assert(opening.score>a.teacher.score);assert.match(c.rationale(opening,s),/Jo’s old round/);
});

test('documented service earns limited related-course credit; a certificate alone does not shorten the new course',()=>{
  const carpenter=person('walker-1','Pia','Carpenter',{craft:85,numeracy:75}),{s,c,world,cv,entry,act}=fixture([rowan(),carpenter],105);
  const m=entry(carpenter.id,{qualifications:{carpenter:3},experience:{carpenter:0}});
  let offer=cv(carpenter.id,'engineer').choices.find(o=>o.id==='enroll');
  assert.doesNotMatch(offer.detail,/recognises/);
  m.jobId='carpenter';m.joinedWeek=1;m.experience.carpenter=104;
  offer=cv(carpenter.id,'engineer').choices.find(o=>o.id==='enroll');
  assert.match(offer.detail,/45 credits.*137 credits/);
  const before={...m.skills};
  assert(act(carpenter.id,'engineer','enroll').ok);
  assert.equal(m.training.credits,45);assert.equal(m.training.recognised.sourceId,'carpenter');
  assert.deepEqual({...m.skills},before);assert.equal(cv(carpenter.id).careerId,'carpenter');assert.equal(cv(carpenter.id,'engineer').qualified,false);
  assert(c.valid(s,world.week));
  const tampered=structuredClone(s);tampered.careers[carpenter.id].training.recognised.credits=100;
  assert(!c.valid(tampered,world.week));
  const copy=cv(carpenter.id,'engineer').training;copy.recognised.credits=0;assert.equal(m.training.recognised.credits,45);
  assert(act(carpenter.id,'engineer','pause').ok);assert(act(carpenter.id,'engineer','leaveCourse').ok);
  assert(act(carpenter.id,'engineer','enroll').ok);assert.equal(m.training.credits,45,'re-enrolment cannot stack credit');
});

function waitingWorld(){
  const learner=person('walker-0','Ira','Carpenter',{craft:90,numeracy:84,care:74},{patience:42});
  const nurse=person('walker-2','Lee','Nurse',{care:91,organisation:75}),former=person('driver','Dia','Engineer');
  const g=fixture([rowan(),learner,nurse,former],40),{world,c,entry,s,pathFor,root}=g;
  entry(nurse.id,{jobId:'nurse',joinedWeek:1,qualifications:{nurse:1}});
  const m=entry(learner.id,{qualifications:{nurse:1,engineer:1},portfolios:{engineer:2,nurse:2},
    application:{targetId:'nurse',phase:'waiting',autonomous:true,appliedWeek:1,dueWeek:41}});
  pathFor(learner.id,'nurse');
  const open=()=>root.EarthEmployers.open(world,s,former,c.catalog.find(j=>j.id==='engineer'),true);
  return {...g,learner,m,open};
}
test('a waiting applicant keeps the qualification and independently pursues a named vacancy after comparing local prospects',()=>{
  const {c,s,world,root,cv,settle,open,learner,m}=waitingWorld();
  assert.equal(c.waitingAlternative(world,s,learner),null,'a full specialist rota alone cannot invent an alternative post');
  open();assert.equal(c.waitingAlternative(world,s,learner).job.id,'engineer');
  const referral=cv(learner.id,'engineer').choices.find(o=>o.id==='followVacancy');
  assert(referral?.available);const before=JSON.stringify(s);
  const stale=c.command(world,s,learner.id,'followVacancy','engineer',referral.expectedRevision,null,{speakerId:learner.id,openingKey:'a different vacancy'});
  assert(!stale.ok);assert.equal(JSON.stringify(s),before);
  m.agreedPlan='nurse';assert.equal(c.waitingAlternative(world,s,learner),null);delete m.agreedPlan;
  m.application.autonomous=false;assert.equal(c.waitingAlternative(world,s,learner),null);m.application.autonomous=true;
  const young={...world,week:7};assert.equal(c.waitingAlternative(young,s,learner),null);
  settle();assert.equal(m.application.phase,'screening');assert.equal(m.application.targetId,'engineer');assert.equal(m.qualifications.nurse,1);
  assert.equal(s.autonomy.people[learner.id].path,'engineer');
  assert.match(root.EarthAutonomy.intent(s,learner.id).reason,/left the nurse waiting list and applied to replace Dia/);
  assert.equal(c.work(s,learner.id),null,'a new application is not an appointment');
});

test('an applicant at their personal ceiling can use additional work evidence to reach the entry standard',()=>{
  const learner=person('walker-0','Mara','Baker',{stamina:41});
  learner.bounds.stamina.max=41;
  const {c,s,world,entry,pathFor,settle}=fixture([rowan(),learner],5);
  const m=entry(learner.id,{qualifications:{refuse:2},agreedPlan:'refuse'});
  pathFor(learner.id,'refuse');
  for(let i=0;i<20&&!m.jobId;i++){settle();world.week++;}
  assert.equal(m.jobId,'refuse');assert.equal(m.portfolios.refuse,2);assert.equal(c.view(world,s,learner.id,'refuse').skills.stamina,41);
});

function placementWorld(){
  const pupil=person('walker-0','Ira','Grower',{craft:47,numeracy:40});
  const teacher=person('walker-1','Pia','Carpenter',{craft:85,numeracy:64});
  const main=person('steward','Rowan','Carpenter',{craft:98,numeracy:98},{patience:100});
  const g=fixture([main,pupil,teacher],20);
  const student=g.entry(pupil.id,{training:{targetId:'carpenter',startedWeek:1,lastWeek:19,credits:18,pace:'evening',paused:false,autonomous:true}});
  g.pathFor(pupil.id,'carpenter');
  return {...g,pupil,teacher,student};
}
test('supervised practice pairs two autonomous people at the actual employer, respects competing duties and awards evidence only once',()=>{
  const {s,c,root,world,teacher,pupil,student,settle}=placementWorld();
  const original=JSON.stringify(s);
  assert(c.placement(world,s,pupil.id,'carpenter',[teacher]));assert.equal(JSON.stringify(s),original);
  s.shift={residentId:teacher.id};assert.equal(c.placement(world,s,pupil.id,'carpenter',[teacher]),null);delete s.shift;
  teacher.traits.sociability=20;teacher.traits.patience=20;assert.equal(c.placement(world,s,pupil.id,'carpenter',[teacher]),null);
  teacher.traits.sociability=55;teacher.traits.patience=70;
  settle();
  const child=root.EarthAutonomy.intent(s,pupil.id),adult=root.EarthAutonomy.intent(s,teacher.id);
  assert.equal(child.placementSide,'learner');assert.equal(adult.placementSide,'mentor');
  assert.equal(child.venue,'workshop');assert.equal(adult.venue,child.venue);
  assert.equal(child.target,teacher.id);assert.equal(adult.target,pupil.id);assert.equal(adult.placementJob,'carpenter');
  assert.equal(student.portfolios.carpenter,1);assert.equal(student.skills.craft,50);assert.equal(student.training.placement.name,'Pia');
  assert.equal(s.careers[teacher.id].lastPracticeWeek,world.week);
  assert(root.EarthAutonomy.contacts(s,pupil.id,world.week).some(t=>t.id===teacher.id&&t.kind==='lesson'));
  assert(root.EarthAutonomy.contacts(s,teacher.id,world.week).some(t=>t.id===pupil.id&&t.kind==='lesson'));
  assert.equal(root.EarthAutonomy.intent(s,'steward').kind,'player');
  const done=JSON.stringify(s);assert(!c.attendPlacement(world,s,pupil.id,'carpenter',teacher.id).ok);
  assert.equal(JSON.stringify(s),done);
  assert(!c.valid({...s,careers:{...s.careers,[pupil.id]:{...student,training:{...student.training,placement:{...student.training.placement,week:0}}}}},world.week));
});

test('a player can meet the named supervisor in person and cannot charge practice time by inspecting a profile or guessing a different mentor',()=>{
  const {s,world,c,act,cv,pupil}=placementWorld();s.agency.actor=pupil.id;
  const option=cv(pupil.id,'carpenter').choices.find(o=>o.id==='placement');
  assert(option?.available);
  const proof={siteId:s.id,actor:pupil.id,target:option.mentorId,mode:'walk',x:2,y:2,tx:2,ty:3};
  const before=JSON.stringify(s);
  for(const bad of [{...proof,x:12},{...proof,target:'unknown'},{...proof,mode:'boat'}])assert(!act(pupil.id,'carpenter','placement',bad).ok);
  assert.equal(JSON.stringify(s),before);
  assert(act(pupil.id,'carpenter','placement',proof).ok);
  assert(!cv(pupil.id,'carpenter').choices.some(o=>o.id==='placement'));
  assert.equal(s.careers[pupil.id].portfolios.carpenter,1);assert(c.valid(s,world.week));
});

test('a missed agreement can make a resident decline career advice while keeping control of their own learning',()=>{
  const pupil=person('walker-0','Ira','Baker'),{root,c,s,world,act}=fixture([rowan(),pupil],4);
  assert(root.EarthAutonomy.remember(s,world.week,'steward',pupil.id,'missed'));
  const advisory={speakerId:'steward'},advice=()=>c.view(world,s,pupil.id,'refuse',advisory).choices.find(o=>o.id==='enroll');
  assert(!advice().available);assert.match(advice().reason,/rebuild trust/);
  const attempt=c.command(world,s,pupil.id,'enroll','refuse',advice().expectedRevision,null,advisory);
  assert(!attempt.ok);assert.equal(s.careers,undefined);
  assert(act(pupil.id,'refuse','practice').ok,'the learner can still develop their own skills');
  world.week++;assert(root.EarthAutonomy.remember(s,world.week,'steward',pupil.id,'kept'));assert(advice().available);
});
