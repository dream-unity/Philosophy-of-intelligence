'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const base=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function town(place='Stone Town',point={lat:-6.16,lon:39.19},extra=[]){
  const ctx=vm.createContext({});ctx.window=ctx;
  for(const f of [...extra,'personas','careers','local-projects','autonomy','agency','simulation'])
    vm.runInContext(fs.readFileSync(path.join(base,f+'.js'),'utf8'),ctx,{filename:f+'.js'});
  const sim=ctx.CommonEarthSim.create({storage:null});
  assert(sim.found({name:place,...point}).ok);
  return {sim,s:sim.active(),w:sim.state,ctx,p:ctx.EarthLocalProjects,a:ctx.EarthAutonomy,c:ctx.EarthCareers};
}
const raw=x=>JSON.parse(JSON.stringify(x));
const meet=(s,actor,id)=>({siteId:s.id,actor,target:id,mode:'walk',x:8,y:7,tx:8.6,ty:7});
function action(t,id,key,pose){
  const rev=t.a.guidance(t.s,t.w,id).revision,actor=t.ctx.EarthAgency.actorId(t.s);
  return t.sim.lifeAction(id,{domain:'autonomy',action:key,expectedRevision:rev,week:t.w.week,siteId:t.s.id,generation:t.s.foundingRevision,actorId:actor},pose||meet(t.s,actor,id));
}
function goal(kind,axis,week=1){
  return {kind,axis,variant:0,serial:1,started:week,progress:0,partnerId:null,beneficiaryId:null,lastWorked:null,finished:null,blocked:null};
}
function cast(t){
  return t.ctx.EarthPersonas.list(t.s).map(profile=>({id:profile.id,name:profile.name,profile,traits:profile.traits,row:{energy:5,contact:4},base:{kind:profile.id==='steward'?'player':'routine'},free:profile.id!=='steward'}));
}
function workOn(t,id,week){
  t.w.week=week;
  const all=cast(t),schedule=t.p.prepare(t.s,t.w,all),task=schedule.tasks.find(o=>o.self.id===id);
  const effects={};
  if(!task)return {task,result:null,effects};
  return {task,result:t.p.assign(t.s,t.w,all,schedule,task,effects),effects};
}
test('each local person has an ongoing goal with a reason and real partners across five kinds, without directing the player',()=>{
  const t=town(),original=JSON.stringify(t.w),roster=t.ctx.EarthPersonas.list(t.s);
  for(const p of roster){
    const v=t.a.view(t.s,t.w,p.id);
    if(p.id==='steward'){assert.equal(v.project,null);continue;}
    assert.ok(v.project.goal&&v.project.why&&v.project.next&&v.project.effect&&v.project.id);
    assert.equal(v.project.ownerId,p.id);
  }
  assert.equal(t.a.view(t.s,t.w,t.s.residents[1].id).project.axis,'music');
  assert.equal(JSON.stringify(t.w),original,'inspection must not create goals or spend anything');
  const completed=new Set(),worked=new Set(),joint=new Set();let moreThanTwo=false,changedCareer=false;
  for(let i=0;i<150;i++){
    assert(t.sim.advance().ok);
    const rows=roster.map(p=>t.a.view(t.s,t.w,p.id));
    const today=rows.filter(r=>r.kind==='project');moreThanTwo||=today.length>2;
    for(const r of today){
      worked.add(r.id);
      if(r.progress===r.total)completed.add(r.projectKind);
      assert.equal(r.project.progress,r.progress);assert.equal(r.project.id,r.projectId);
      if(r.target){const other=rows.find(x=>x.id===r.target);assert.equal(other.target,r.id);assert.equal(other.projectId,r.projectId);joint.add(r.id);}
    }
    changedCareer||=Object.values(t.s.careers||{}).some(c=>c.jobId);
    assert.equal(rows[0].kind,'player');assert.ok(t.a.valid(t.s,t.w.week));
    if(i%13===0)assert.ok(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));
  }
  assert.deepEqual(Array.from(completed).sort(),['build','food','hobby','research','teach']);
  assert.equal(worked.size,9);assert.ok(joint.size>=7);assert.ok(moreThanTwo);assert.ok(changedCareer);
  assert(t.s.autonomy.projects.notes<=6&&t.s.autonomy.projects.assists<=6);
  const evidence=t.p.completions(t.s);
  assert.equal(evidence.length,16);assert.equal(new Set(evidence.map(e=>e.id)).size,16);
  assert(evidence.every((e,i)=>e.ownerName&&e.title&&e.result&&(!i||e.week<=evidence[i-1].week)));
  assert.deepEqual(raw(t.p.completions(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)).sites[0])),raw(evidence));
  const corrupted=raw(t.s);corrupted.autonomy.projects.completed[1]=corrupted.autonomy.projects.completed[0];
  assert.equal(t.p.valid(corrupted,t.w.week),false);
});
test('research costs actual supplies, tools only amplify a completed load, and no worker can use two venues at once',()=>{
  const t=town(),builder='walker-1',researcher='walker-2',collector='walker-3';
  const owners={[builder]:goal('build','craft'),[researcher]:goal('research','numeracy'),[collector]:goal('food','care')};
  t.s.autonomy={week:0,people:{},effects:{},projects:{notes:0,assists:0,owners}};
  t.s.materials=2;
  assert.equal(workOn(t,builder,2).result,null);assert.equal(owners[builder].progress,0);assert.equal(t.s.materials,2);
  t.s.materials=8;
  t.w.week=3;const group=cast(t),work=t.p.prepare(t.s,t.w,group);
  const project=id=>work.tasks.find(o=>o.self.id===id);
  assert(t.p.assign(t.s,t.w,group,work,project(builder),{}));
  assert.equal(t.s.materials,6);
  assert.equal(t.p.assign(t.s,t.w,group,work,project(researcher),{}),null,'same workshop cannot assign two teams to the one session');
  assert.equal(owners[researcher].progress,0);
  for(let n=4;n<=6;n++)assert.ok(workOn(t,builder,n).result);
  assert.equal(t.s.autonomy.projects.assists,3);assert.equal(t.s.materials,6);
  for(let n=7;n<10;n++)assert.ok(workOn(t,researcher,n).result);
  assert.equal(t.s.autonomy.projects.notes,0);assert.equal(t.s.materials,5);
  assert.ok(workOn(t,researcher,10).result);assert.equal(t.s.autonomy.projects.notes,2);
  assert.deepEqual(workOn(t,collector,11).effects,{});
  assert.deepEqual(workOn(t,collector,12).effects,{});
  const delivery=workOn(t,collector,13);
  assert.deepEqual(delivery.effects,{food:3});assert.match(delivery.result.note,new RegExp(t.ctx.EarthPersonas.profile(t.s,builder).name));
  assert.deepEqual(raw(t.p.latestHarvest(t.s,13)),{by:collector,amount:3});assert.equal(t.p.latestHarvest(t.s,14),null);
  assert.equal(t.s.autonomy.projects.assists,2);assert.equal(t.s.autonomy.projects.notes,2);
  assert.equal(workOn(t,collector,14).result,null,'the same completed load does not pay again');
});
test('pantry arrivals feed a tired named household from the collected load and reject fabricated supply provenance',()=>{
  const t=town(),owner='walker-2',recipient=t.s.residents[0].id,g=goal('food','care');
  Object.assign(g,{progress:2,lastWorked:1,beneficiaryId:recipient});
  t.s.autonomy={week:1,people:{},effects:{},projects:{notes:1,notesFrom:['walker-1'],assists:0,owners:{[owner]:g}}};
  t.w.week=2;
  const all=cast(t),household=all.find(p=>p.id===recipient);household.row.energy=2;
  const scheduler=t.p.prepare(t.s,t.w,all),task=scheduler.tasks.find(o=>o.self.id===owner),effects={};
  const done=t.p.assign(t.s,t.w,all,scheduler,task,effects);
  assert.ok(done);assert.equal(effects.food,2);assert.equal(household.row.energy,4);assert.equal(household.row.received.ownerId,owner);
  assert.match(done.note,new RegExp(household.name));assert.equal(t.s.autonomy.projects.notesFrom.length,0);
  assert.equal(t.p.assign(t.s,t.w,all,scheduler,task,effects),null);assert.equal(effects.food,2);
  const broken=raw(t.s);broken.autonomy.projects.assists=1;broken.autonomy.projects.assistsFrom=['invented'];
  assert.equal(t.p.valid(broken,t.w.week),false);
});
test('a named lesson cannot finish with a substitute student and consumes both real practice sessions',()=>{
  const t=town(),mentor=t.s.residents[1].id;
  const g=goal('teach','numeracy');t.s.autonomy={week:0,people:{},effects:{},projects:{notes:1,assists:0,owners:{[mentor]:g}}};
  const start=workOn(t,mentor,2);assert.ok(start.result);
  const student=g.partnerId,level=t.c.view(t.w,t.s,student).skills.numeracy;
  assert.ok(workOn(t,mentor,3).result);
  t.w.week=4;
  const all=cast(t);all.find(p=>p.id===student).free=false;
  const reservations=t.p.prepare(t.s,t.w,all);assert.equal(t.p.assign(t.s,t.w,all,reservations,reservations.tasks.find(o=>o.self.id===mentor),{}),null);
  assert.equal(g.partnerId,student);assert.equal(g.progress,2);
  assert.ok(workOn(t,mentor,5).result);
  const after=t.c.view(t.w,t.s,student).skills.numeracy;
  assert.ok(after>level&&after<=t.ctx.EarthPersonas.profile(t.s,student).bounds.numeracy.max);
  assert.equal(t.s.autonomy.projects.notes,0);
  assert.equal(t.s.careers[mentor].lastPracticeWeek,5);assert.equal(t.s.careers[student].lastPracticeWeek,5);
  assert.equal(t.c.projectLesson(t.w,t.s,mentor,student,'numeracy').ok,false);
  assert.match(g.result,new RegExp(t.ctx.EarthPersonas.profile(t.s,student).name));
});
test('in-person joint work reserves one named session, preserves direct control and can be postponed by prior duties',()=>{
  const t=town(),owner=t.s.residents[0].id,other=t.s.residents[1].id,actor='steward';
  const distant={...meet(t.s,actor,owner),tx:20};const initial=JSON.stringify(t.s);
  assert(!action(t,owner,'joinProject',distant).ok);assert.equal(JSON.stringify(t.s),initial);
  assert(action(t,owner,'joinProject').ok);assert(!action(t,owner,'joinProject').ok);assert(!action(t,other,'joinProject').ok);
  const invitation=t.a.view(t.s,t.w,owner).project;assert.equal(invitation.volunteerId,actor);assert.equal(invitation.progress,0);
  assert.ok(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));
  const shadow=raw(t.w);shadow.week++;t.a.settle(shadow.sites[0],shadow);
  assert(t.sim.advance().ok);let p=t.a.view(t.s,t.w,owner).project;
  assert.equal(p.progress,1);assert.equal(p.volunteerId,null);assert.equal(t.a.intent(t.s,owner).target,actor);
  assert.deepEqual(raw(t.s.autonomy),raw(shadow.sites[0].autonomy));
  assert.equal(t.a.view(t.s,t.w,actor).kind,'player');assert.equal(t.a.view(t.s,t.w,actor).contribution.ownerId,owner);
  assert(!action(t,actor,'hobbyPractice').ok,'donating time uses the player’s personal session');
  assert(action(t,owner,'joinProject').ok);
  t.s.residents[0].promise={dueWeek:4};t.w.week++;const notes=t.a.settle(t.s,t.w);
  p=t.a.view(t.s,t.w,owner).project;
  assert.equal(p.progress,1);assert.equal(p.volunteerId,null);assert.equal(t.a.intent(t.s,owner).kind,'commitment');
  assert(notes.some(note=>note.includes('postponed')));
});
test('the playable repairer can pursue music at zero civic effort, with durable practice capped at their individual potential',()=>{
  const t=town(),id=t.s.residents[1].id,profile=t.ctx.EarthPersonas.profile(t.s,id);
  t.s.agency={actor:id,meals:[]};t.w.effort=0;
  const before=t.c.view(t.w,t.s,id).skills.music;
  assert(action(t,id,'hobbyPractice').ok);assert.equal(t.w.effort,0);
  assert.equal(t.a.view(t.s,t.w,id).personalHobby.progress,1);
  assert.equal(t.c.view(t.w,t.s,id).skills.music,before+1);
  assert(!action(t,id,'hobbyPractice').ok);
  for(let i=0;i<70;i++){
    assert(t.sim.advance().ok);assert(action(t,id,'hobbyPractice').ok);
    if(i===1)assert.equal(t.a.view(t.s,t.w,id).personalHobby.phase,'Completed');
  }
  assert.equal(t.c.view(t.w,t.s,id).skills.music,profile.bounds.music.max);assert.ok(profile.bounds.music.max<70);
  assert.equal(t.a.intent(t.s,id).kind,'player');assert(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));
});
test('familiarity earns an invitation from a reserved hobbyist while missing supplies and strained relationships still matter',()=>{
  const t=town();
  const quiet=t.ctx.EarthPersonas.list(t.s).find(p=>p.id!=='steward'&&p.traits.sociability<38);
  assert(quiet);
  t.s.autonomy={week:0,people:{},effects:{},projects:{notes:0,assists:0,owners:{[quiet.id]:goal('hobby',quiet.hobbyAxis)}}};
  t.ctx.EarthDialogue={familiar:()=>false};
  assert.equal(t.p.joining(t.s,t.w,quiet.id,'steward').ok,false);
  t.ctx.EarthDialogue={familiar:()=>true};
  assert.equal(t.p.joining(t.s,t.w,quiet.id,'steward').ok,true);
  t.s.autonomy.projects.owners[quiet.id]=goal('build','craft');t.s.materials=1;
  assert.equal(t.p.joining(t.s,t.w,quiet.id,'steward').ok,false);
  t.s.materials=8;t.s.neighbourWork={links:{'0-1':-1}};
  assert.equal(t.p.joining(t.s,t.w,t.s.residents[0].id,t.s.residents[1].id).ok,false);
});

test('a named civic commitment travels to the agreed venue and preserves the participant’s own project without doubling their time',()=>{
  const t=town(),id='walker-3';
  t.ctx.EarthCivicInitiatives={commitment:(_site,_world,personId)=>personId===id?{venue:'hall',reason:'I agreed to review the workshop estimate with the assembly.'}:null};
  t.w.week++;t.a.settle(t.s,t.w);
  assert.equal(t.a.intent(t.s,id).kind,'commitment');assert.equal(t.a.intent(t.s,id).civic,true);
  assert.equal(t.a.intent(t.s,id).venue,'hall');assert.equal(t.p.view(t.s,t.w,id).progress,0);
  assert.ok(t.a.valid(t.s,t.w.week));
});

test('a played baker holds their own developing project, can reserve labour for another neighbour, and resumes their personal decisions after release',()=>{
  const t=town(),id='walker-0',actor=t.ctx.EarthAgency.actorId(t.s);
  assert(t.sim.advance().ok);
  const original=t.s.autonomy.projects.owners[id],progress=original.progress,serial=original.serial;
  const pose={...meet(t.s,actor,id),targetPose:{id,x:8.6,y:7,mode:'walk'}};
  assert(t.sim.changeActor(id,pose).ok);
  const person=t.ctx.EarthAgency.actor(t.s);assert.equal(person.kind,'walker');assert.equal(person.originRole,'Baker');
  const target=t.ctx.EarthPersonas.list(t.s).find(p=>p.id!==id&&t.a.guidance(t.s,t.w,p.id).choices.find(choice=>choice.id==='joinProject')?.available);
  assert(target);assert(action(t,target.id,'joinProject').ok);
  assert(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));assert(t.sim.advance().ok);
  assert.equal(t.ctx.EarthAgency.actorId(t.s),id);assert.equal(t.a.intent(t.s,id).kind,'player');
  assert.equal(t.s.autonomy.projects.owners[id].serial,serial);assert.equal(t.s.autonomy.projects.owners[id].progress,progress);
  assert.equal(t.a.view(t.s,t.w,id).contribution.ownerId,target.id);
  assert(t.sim.changeActor('steward',{...meet(t.s,id,'steward'),x:4.3,y:12.4}).ok);
  for(let i=0;i<15&&t.s.autonomy.projects.owners[id].progress===progress&&t.s.autonomy.projects.owners[id].serial===serial;i++)assert(t.sim.advance().ok);
  assert(t.s.autonomy.projects.owners[id].progress!==progress||t.s.autonomy.projects.owners[id].serial!==serial);
  assert.equal(t.s.agency.localPositions[id].x,4.3);assert(t.ctx.CommonEarthSim.readSave(JSON.stringify(t.w)));
});


test('freshwater crews book a real quay, respect a player’s float and credit their jointly landed fish exactly once',()=>{
  const t=town('Lake Victoria',{water:true,lat:-3,lon:32},['resource-economy','provisions','fisheries']);
  const owner='walker-3',g=goal('food','care');
  t.s.autonomy={week:1,people:{},effects:{},projects:{notes:0,assists:0,owners:{[owner]:g}}};
  assert.equal(workOn(t,owner,2).result.item.venue,'dock');assert.equal(g.crop,'fish');
  let clock=33000;t.ctx.Date=class extends Date{static now(){return clock;}};
  const quay={siteId:t.s.id,actor:'steward',mode:'walk',target:'quay',x:8,y:24};
  assert.equal(t.sim.useHandline(quay,'cast').ok,true);
  assert.equal(workOn(t,owner,3).result,null);assert.equal(g.progress,1);
  assert.match(g.blocked,/handline|float/);assert.equal(t.s.provisions?.landings,undefined);
  clock+=5500;assert.equal(t.sim.useHandline(quay,'land').ok,true);
  assert.match(workOn(t,owner,4).result.item.activity,/fishing line/);
  const finished=workOn(t,owner,5);assert.ok(finished.result);
  assert.equal(finished.effects.food,2);assert.equal(g.caught,2);assert.ok(g.carriedBy);
  assert.deepEqual(raw(t.p.latestHarvest(t.s,5)),{by:owner,amount:2,source:'catch'});
  assert.deepEqual(raw(t.s.provisions.landings),{week:5,by:owner,amount:2,thisWeek:2,total:3});
  t.s.autonomy.week=5;
  assert.deepEqual(raw(t.ctx.EarthResources.projectShipment(t.s,owner)),{week:5,crop:'fish',sourceVenue:'dock',venue:'pantry',carrierId:g.partnerId,amount:2});
  t.s.food+=finished.effects.food;t.ctx.EarthProvisions.credit(t.w,t.s,'catch',2,owner,true);
  assert.equal(t.s.provisions.landings.total,3);assert.equal(t.p.valid(t.s,t.w.week),true);
  t.s.autonomy.week++;assert.equal(t.ctx.EarthResources.projectShipment(t.s,owner),null);
  t.sim.destroy();
});

test('the available crop limits baskets for the pantry, reserve bin and collaborators even with a tested carrier',()=>{
  const t=town('Upland',{lat:46,lon:12},['resource-economy','provisions']);
  const owner='walker-4',g=goal('food','care');
  Object.assign(g,{crop:'grain',progress:2,lastWorked:1});
  t.s.autonomy={week:1,people:{},effects:{},projects:{notes:0,assists:1,assistsFrom:['walker-1'],owners:{[owner]:g}}};
  t.w.week=2;
  t.s.resourceLedger={serial:1,lastWeek:2,bins:{},shelf:{},fields:{grain:{week:2,left:2}}};
  const output=workOn(t,owner,2);
  assert.equal(output.effects.food,1);assert.equal(t.s.resourceLedger.bins.grain,1);
  assert.equal(t.s.resourceLedger.fields.grain.left,0);assert.equal(t.s.autonomy.projects.assists,1);
  assert.match(output.result.item.reason,/raw goods bin/);assert.ok(output.result.item.target);
  assert.equal(t.ctx.EarthResources.quickGather(t.w,t.s,owner).resource==='grain',false);
  const sources=t.ctx.EarthResources.view(t.w,t.s,{till:8},32,owner).rows;
  for(const {id,local} of sources)if(local&&t.ctx.EarthResources.isCrop(id))t.s.resourceLedger.fields[id]={week:2,left:0};
  assert.equal(t.ctx.EarthResources.quickGather(t.w,t.s,owner),null);
  const other='walker-0',empty=goal('food','care');t.s.autonomy.projects.owners[other]=empty;
  const waiting=workOn(t,other,2);assert.equal(waiting.result,null);assert.equal(empty.progress,0);
  assert.match(empty.blocked,/recover/);assert.ok(t.ctx.EarthResources.valid(t.s,2));
  t.sim.destroy();
});
