'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const game=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
require(path.join(game,'construction.js'));
const C=globalThis.EarthConstruction;
const world={week:1};
function town() {
  return {id:'local',population:12,food:12,funds:16,materials:8,buildings:[],
    residents:['Mira','Idris','Sol'].map((name,slot)=>({id:'person-'+slot,slot,name}))};
}
const order=(kind='workshop',plot=0)=>({scope:'street',id:'lot-'+plot,plot,kind,name:kind,paid:{funds:6,materials:3}});
function ok(result){assert.equal(result.ok,true,result.reason||result.message);return result;}
function oneBuilder(s,slot=1,id=null){
  for(const p of s.residents)ok(C.setPreference(s,world,p.id,p.slot===slot?'build':'usual',p.slot===slot?id:null));
}
const copy=s=>JSON.parse(JSON.stringify(s));
function siteJob(s,id){return C.view(s,world).jobs.find(j=>j.id===id);}

test('a real named crew must reach the site, deliver staged work, and return to their occupations',()=>{
  const s=town(),spec=order();
  const before=JSON.stringify(s);
  const proposed=ok(C.preview(s,world,spec)).job;
  assert.equal(JSON.stringify(s),before);
  assert.deepEqual(proposed.workers,['person-1']);
  const booked=ok(C.start(s,world,spec));
  assert.equal(booked.job.work,0);
  assert.equal(s.buildings.length,0);
  const tick=ok(C.advance(s,world,1));
  assert.equal(tick.completed.length,0);
  assert.equal(siteJob(s,spec.id).work,0);
  assert.equal(C.view(s,world).workers[1].activity,'travelling');
  const stages=new Set(),builders=new Set();
  let finished=[],elapsed=1;
  while(elapsed++<120){
    const v=C.view(s,world),j=v.jobs[0];
    if(!j)break;
    stages.add(j.stageIndex);
    for(const id of j.activeWorkerIds)builders.add(id);
    const step=C.advance(s,world,1);finished.push(...step.completed);
    assert.equal(C.valid(s,world),true);
  }
  assert.deepEqual([...stages],[0,1,2]);
  assert.ok(builders.size>=1);
  assert.deepEqual(finished.map(j=>[j.id,j.work,j.total]),[[spec.id,booked.job.total,booked.job.total]]);
  assert.equal(C.view(s,world).workers.some(w=>w.activity==='returning'||w.activity==='resting'),true);
  ok(C.advance(s,world,60));
  assert.equal(C.needsTime(s,world),false);
  const settled=JSON.stringify(s);
  assert.equal(C.advance(s,world,60).changed,false);
  assert.equal(JSON.stringify(s),settled);
});

test('part seconds, mid-walk saves, staged work, and a batch of active time agree exactly',()=>{
  const a=town();ok(C.start(a,world,order('pier',8)));oneBuilder(a);
  ok(C.advance(a,world,.4));assert.equal(a.construction[0].work,0);
  const b=copy(a);
  assert.equal(C.valid(b,world),true);
  const aa=C.advance(a,world,52.6),bb=[];
  for(let i=0;i<52;i++)bb.push(...C.advance(b,world,1).completed);
  bb.push(...C.advance(b,world,.6).completed);
  assert.deepEqual(copy(a),b);
  assert.deepEqual(aa.completed,bb);
  const old=JSON.stringify(a);
  for(const seconds of [-1,Infinity,3601,NaN])assert.equal(C.advance(a,world,seconds).ok,false);
  assert.equal(JSON.stringify(a),old);
});

test('explicit regular occupations pause work, a personal invitation resumes it, and extra builders shorten time',()=>{
  const s=town();ok(C.start(s,world,order('pier')));
  for(const p of s.residents)ok(C.setPreference(s,world,p.id,'usual'));
  ok(C.advance(s,world,20));
  assert.equal(s.construction[0].work,0);
  assert.equal(C.needsTime(s,world),false);
  const paused=JSON.stringify(s);
  assert.equal(C.advance(s,world,45).changed,false);
  assert.equal(JSON.stringify(s),paused);
  assert.equal(siteJob(s,'lot-0').etaSeconds,null);
  oneBuilder(s,1,'lot-0');
  const solo=copy(s),team=copy(s);
  for(const p of team.residents)ok(C.setPreference(team,world,p.id,'build','lot-0'));
  assert.ok(siteJob(team,'lot-0').etaSeconds<siteJob(solo,'lot-0').etaSeconds);
  function time(site){
    let i=0;
    while(site.construction.length && ++i<120)ok(C.advance(site,world,1));
    return i;
  }
  assert.ok(time(team)<time(solo));
  // A closed project cannot be selected by a stale button.
  assert.equal(C.setPreference(team,world,'person-0','build','lot-0').ok,false);
});

test('a single worker recovers from a timed break without inviting another person or changing the week',()=>{
  const s=town();ok(C.start(s,world,order('pier',8)));oneBuilder(s);
  for(let i=0;i<100&&siteJob(s,'lot-8')?.status!=='Crew resting';i++)C.advance(s,world,1);
  const j=siteJob(s,'lot-8'),crew=C.view(s,world).workers[1];
  assert.equal(j.status,'Crew resting');
  assert.equal(j.workRate,0);
  assert.equal(crew.restLeft,6);
  assert.ok(j.etaSeconds>crew.restLeft);
  const work=j.work;
  C.advance(s,world,crew.restLeft);
  assert.equal(siteJob(s,'lot-8').work,work);
  C.advance(s,world,1);
  assert.equal(siteJob(s,'lot-8').work,work+1);
});

test('city and district sites share one workforce, an interrupted crew yields to care, and cancellations release workers',()=>{
  const s=town(),city={id:'city-0',scope:'city',precinct:2,kind:'yard',name:'Repair yard',paid:{funds:5,materials:3}};
  ok(C.start(s,world,order()));ok(C.start(s,world,city));
  ok(C.setPreference(s,world,'person-0','build',city.id));
  ok(C.setPreference(s,world,'person-1','build','lot-0'));
  ok(C.setPreference(s,world,'person-2','usual'));
  C.advance(s,world,12);
  assert.equal(siteJob(s,city.id).workerNames[0],'Mira');
  assert.deepEqual(siteJob(s,'lot-0').workers,['person-1']);
  const original=s.construction.find(j=>j.id==='lot-0').work;
  s.shift={residentId:'person-1'};
  const queued=ok(C.setPreference(s,world,'person-1','build','lot-0'));
  assert.match(queued.message,/When free, Idris will join the crew at workshop/);
  C.advance(s,world,5);
  assert.equal(siteJob(s,'lot-0').work,original);
  assert.equal(C.workerRole(s,world,'person-1').activity,'busy');
  s.shift=null;
  C.advance(s,world,3);
  assert.ok(siteJob(s,'lot-0').work>original);
  const removed=C.cancel(s,city.id);
  assert.deepEqual(removed.paid,{funds:5,materials:3});
  assert.equal(C.cancel(s,city.id),null);
  assert.equal(C.workerRole(s,world,'person-0').preferredJobId,null);
  assert.equal(C.valid(s),true);
});

test('the roster protects active public jobs and a chosen profession transfers output without creating extra goods',()=>{
  const s=town();
  ok(C.setPreference(s,world,'person-0','exchange'));
  assert.equal(C.workerRole(s,world,'person-0').activity,'commuting');
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
  C.advance(s,world,30);
  assert.equal(C.workerRole(s,world,'person-0').workplace.label,'Market exchange');
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:-1,materials:0,funds:1});
  s.shift={residentId:'person-0'};
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
  s.shift=null;
  s.strategy={crew:[1,1,1],studying:'toolbank',active:null};
  s.buildings=[{id:'existing',kind:'workshop',plot:1}];
  ok(C.start(s,world,order('garden',0)));
  const steward={...world,legacy:{term:{siteId:s.id,residentId:'person-0'}}};
  const v=C.view(s,steward);
  assert.deepEqual(v.jobs[0].workers,['person-2']);
  assert.equal(v.workers[0].role,'Council steward');
  assert.equal(v.workers[1].role,'Teacher');
  assert.deepEqual(C.weeklyAdjustment(s,steward),{food:0,materials:0,funds:-1});
  s.neighbourWork={active:{phase:'working',kind:'room',agreement:'rota'}};
  assert.equal(C.view(s,steward).jobs[0].etaSeconds,null);
  assert.equal(C.advance(s,steward,60).completed.length,0);
});

test('orders preserve paid resources and prior partial work while validating occupancy and worker references',()=>{
  const s=town(),a=order('hall'),accepted=ok(C.start(s,world,{...a,workFraction:.5})).job;
  a.paid.funds=99;
  assert.equal(accepted.paid.funds,6);
  assert.equal(accepted.work,Math.floor(accepted.total*.5));
  assert.equal(C.start(s,world,order('market')).ok,false);
  assert.equal(C.start(s,world,{...order(),plot:19}).ok,false);
  assert.equal(C.start(s,world,{...order('garden',3),kind:'invented'}).ok,false);
  assert.equal(C.valid(s),true);
  for(const change of [z=>z.construction[0].work=z.construction[0].total,z=>z.construction[0].paid.funds=-1,
    z=>z.workforce.members['person-1'].preferredJobId='closed',z=>z.workforce.members['person-1'].position.x=Infinity]){
    const z=copy(s);change(z);assert.equal(C.valid(z),false);
  }
  assert.equal(C.valid(town()),true);
});

test('batch time opens facilities before the next labour decision, matching one-second play',()=>{
  const a=town(),b=town();
  for(const s of [a,b]){
    s.strategy={crew:[1,1,1],studying:'toolbank',active:null};
    ok(C.start(s,world,{...order('workshop',8),workFraction:.96}));
    ok(C.start(s,world,order('pier',6)));
    oneBuilder(s,1);
  }
  const finish=s=>j=>{
    assert.equal(s.construction.some(k=>k.id===j.id),false);
    s.buildings.push({kind:j.kind,plot:j.plot,id:j.id});
  };
  const result=ok(C.advance(a,world,60,finish(a)));
  for(let i=0;i<60;i++)ok(C.advance(b,world,1,finish(b)));
  assert.equal(result.completed.length,1);
  assert.equal(C.workerRole(a,world,'person-1').role,'Teacher');
  assert.equal(a.construction[0].work,0);
  assert.deepEqual(copy(a),copy(b));
});

test('role changes walk to actual facilities and redirect a commute if the workplace closes',()=>{
  const s=town(),id=s.residents[2].id;
  s.buildings.push({id:'beds',kind:'garden',name:'Community garden',plot:0},{id:'tools',kind:'workshop',name:'Repair workshop',plot:8});
  ok(C.setPreference(s,world,id,'food'));
  let w=C.workerRole(s,world,id);
  assert.equal(w.activity,'commuting');
  assert.equal(w.workplace.plot,0);
  C.advance(s,world,2);
  const moved=C.workerRole(s,world,id);assert.notDeepEqual([moved.x,moved.y],[w.x,w.y]);
  // Choosing a different profession halfway through must replace the route to the garden.
  ok(C.setPreference(s,world,id,'repair'));
  assert.equal(C.workerRole(s,world,id).workplace.plot,8);
  C.advance(s,world,50);
  w=C.workerRole(s,world,id);
  assert.equal(w.activity,'working');
  assert.equal(w.workplace.kind,'workshop');
  assert.deepEqual([w.x,w.y],[w.workplace.x,w.workplace.y]);
  assert.equal(C.needsTime(s,world),false);
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:1,funds:-1});
  s.buildings=s.buildings.filter(b=>b.kind!=='workshop');
  assert.equal(C.needsTime(s,world),true);
  assert.equal(C.workerRole(s,world,id).workplace.residentId,s.residents[1].id);
  C.advance(s,world,60);
  assert.equal(C.workerRole(s,world,id).activity,'working');
  assert.equal(C.needsTime(s,world),false);
});

test('low stores influence who volunteers; later supplies release the worker who was covering the pantry',()=>{
  const s=town();s.food=0;
  ok(C.start(s,world,order('garden',2)));
  assert.notDeepEqual(siteJob(s,'lot-2').workers,['person-0']);
  assert.match(C.workerRole(s,world,'person-0').reason,/pantry is low/);
  s.food=12;C.cancel(s,'lot-2');ok(C.start(s,world,order('garden',2)));
  assert.deepEqual(siteJob(s,'lot-2').workers,['person-0']);
  assert.match(C.workerRole(s,world,'person-0').reason,/fits their trade/);
});

test('the convenor keeps the civic role and assembly workplace until explicitly choosing trade',()=>{
  const s=town(),p=s.residents[2];p.role='Convenor';
  s.buildings.push({id:'a',plot:0,name:'Assembly hall',kind:'hall'},{id:'b',plot:1,name:'Neighbourhood market',kind:'market'});
  ok(C.setPreference(s,world,p.id,'usual'));
  let role=C.workerRole(s,world,p.id);
  assert.equal(role.role,'Convenor');
  assert.equal(role.workplace.kind,'hall');
  C.advance(s,world,30);
  assert.equal(C.workerRole(s,world,p.id).activity,'working');
  ok(C.setPreference(s,world,p.id,'exchange'));
  role=C.workerRole(s,world,p.id);
  assert.equal(role.role,'Exchange worker');
  assert.equal(role.workplace.kind,'market');
  assert.equal(role.usualRole,'Convenor');
});

test('a whole crew on its scheduled break delivers no labour until their rest finishes',()=>{
  const s=town(),spec=order('pier',8);
  ok(C.start(s,world,spec));
  for(const p of s.residents)ok(C.setPreference(s,world,p.id,'build',spec.id));
  while(siteJob(s,spec.id).workRate<3)C.advance(s,world,1);
  // Align a legitimately saved crew's shifts at the final second before their breaks.
  for(const m of Object.values(s.workforce.members))m.fatigue=27;
  C.advance(s,world,1);
  const breakStart=siteJob(s,spec.id);
  assert.equal(breakStart.workRate,0);
  assert.equal(breakStart.status,'Crew resting');
  assert.equal(breakStart.workers.length,3);
  for(let i=0;i<6;i++){
    assert.equal(C.needsTime(s,world),true);
    C.advance(s,world,1);
    assert.equal(siteJob(s,spec.id).work,breakStart.work);
  }
  C.advance(s,world,1);
  assert.equal(siteJob(s,spec.id).work,breakStart.work+3);
});

test('redirecting a resting solo builder to another site forecasts both the break and the new journey',()=>{
  const s=town(),first=order('pier',0),next=order('hall',8);
  ok(C.start(s,world,first));oneBuilder(s,1,first.id);
  while(siteJob(s,first.id).status!=='Crew resting')C.advance(s,world,1);
  ok(C.start(s,world,next));ok(C.setPreference(s,world,'person-1','build',next.id));
  const j=siteJob(s,next.id);
  assert.equal(j.status,'Crew resting');
  assert.ok(j.etaSeconds>6+j.total);
  const elapsed=j.etaSeconds;
  ok(C.advance(s,world,elapsed-1));
  assert.equal(siteJob(s,next.id).work,j.total-1);
  assert.equal(C.advance(s,world,1).completed[0].id,next.id);
});

test('a free resident chooses shortage cover, works on site, and returns once stores recover',()=>{
  const s=town(),sol=s.residents[2];
  s.food=0;s.buildings.push({id:'g',kind:'garden',plot:0,name:'Neighbourhood garden'});
  ok(C.setPreference(s,world,sol.id,'auto'));
  let worker=C.workerRole(s,world,sol.id);
  assert.equal(worker.relief,'food');
  assert.equal(worker.role,'Grower');
  assert.match(worker.reason,/chose.*pantry/i);
  assert.equal(worker.activity,'commuting');
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
  C.advance(s,world,30);
  worker=C.workerRole(s,world,sol.id);
  assert.equal(worker.activity,'working');assert.equal(worker.workplace.plot,0);
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:1,materials:0,funds:-1});
  assert.equal(C.needsTime(s,world),false);
  s.food=3;
  assert.equal(C.workerRole(s,world,sol.id).relief,'food');
  assert.equal(C.valid(s),true);
  const resumed=copy(s);
  assert.equal(C.workerRole(resumed,world,sol.id).relief,'food');
  resumed.food=5;
  assert.equal(C.workerRole(resumed,world,sol.id).role,'Convenor');
  assert.equal(C.needsTime(resumed,world),true);
  C.advance(resumed,world,30);
  assert.deepEqual(C.weeklyAdjustment(resumed,world),{food:0,materials:0,funds:0});
  assert.equal(C.needsTime(resumed,world),false);
});

test('shortage cover yields to new worksites and commitments and never takes scarce donor supplies',()=>{
  const s=town(),a=order('garden',0),b={id:'waterfront',scope:'city',precinct:2,kind:'yard',name:'Engine sheds'};
  s.food=0;
  ok(C.setPreference(s,world,'person-2','auto'));
  C.advance(s,world,10);
  assert.equal(C.workerRole(s,world,'person-2').relief,'food');
  ok(C.start(s,world,a));
  ok(C.start(s,world,b));
  let roster=C.view(s,world);
  assert.equal(roster.jobs.every(job=>job.workers.length===1),true);
  const assigned=roster.jobs.flatMap(j=>j.workers);
  assert.equal(new Set(assigned).size,2);
  assert.equal(roster.workers.some(w=>w.relief&&assigned.includes(w.residentId)),false);
  s.shift={residentId:'person-2'};
  roster=C.view(s,world);
  assert.equal(roster.workers[2].activity,'busy');
  assert.equal(roster.workers[2].relief,null);
  assert.equal(roster.jobs.flatMap(j=>j.workers).includes('person-2'),false);
  C.cancel(s,a.id);C.cancel(s,b.id);
  s.shift=null;s.funds=1;s.materials=1;
  C.advance(s,world,40);
  assert.equal(C.view(s,world).workers.some(w=>w.relief),false);
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
  s.funds=16;s.materials=8;
  ok(C.setPreference(s,world,'person-2','usual'));
  roster=C.view(s,world);
  assert.equal(roster.workers[2].relief,null);
  assert.equal(roster.workers[1].relief,'food');
});

test('the first shortage wakes a new or legacy town without a prior building or role change',()=>{
  const s=town();
  assert.equal(C.needsTime(s,world),false);
  s.food=1;
  const before=JSON.stringify(s);
  assert.equal(C.needsTime(s,world),true);
  const first=C.workerRole(s,world,'person-2');
  assert.equal(first.relief,'food');
  assert.equal(first.workplace.residentId,'person-0');
  assert.equal(first.activity,'commuting');
  assert.equal(JSON.stringify(s),before);
  C.advance(s,world,30);
  assert.equal(C.needsTime(s,world),false);
  assert.equal(C.workerRole(s,world,'person-2').activity,'working');
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:1,materials:0,funds:-1});
});

test('after an accompanied day, the host starts the journey to work from the actual end of the shift',()=>{
  const s=town(),id=s.residents[1].id;
  ok(C.start(s,world,order('pier',0)));oneBuilder(s,1);
  C.advance(s,world,15);
  const original=C.workerRole(s,world,id);
  assert.equal(original.activity,'building');
  const empty={residentId:id,time:0,at:{type:'resident',residentId:id},history:[]};
  assert.equal(C.releaseFromShift(s,empty),false);
  assert.equal(C.workerRole(s,world,id).activity,'building');
  s.shift={...empty,time:4,at:{type:'market'},history:[{}]};
  assert.equal(C.releaseFromShift(s,s.shift),true);
  s.shift=null;
  let worker=C.workerRole(s,world,id);
  assert.deepEqual([worker.x,worker.y],[15,23.04]);
  assert.equal(worker.activity,'travelling');
  const paused=siteJob(s,'lot-0').work;
  C.advance(s,world,worker.travelLeft);
  assert.equal(siteJob(s,'lot-0').work,paused);
  C.advance(s,world,1);
  assert.equal(siteJob(s,'lot-0').work,paused+1);
  // The live companion can be away from the last recorded stop, including after a no-visit walk.
  assert.equal(C.releaseFromShift(s,empty,{x:8,y:6}),true);
  worker=C.workerRole(s,world,id);
  assert.deepEqual([worker.x,worker.y],[8,6]);
  assert.equal(C.valid(s),true);
  assert.equal(C.releaseFromShift(s,empty,{x:-999,y:4}),false);
});

test('actual builders forgo customary production from departure through work and breaks, until release',()=>{
  const s=town(),spec=order('pier',0),id=s.residents[1].id;
  ok(C.start(s,world,spec));oneBuilder(s,1,spec.id);
  const loss={food:0,materials:-1,funds:0};
  let w=C.workerRole(s,world,id);
  assert.equal(w.activity,'travelling');
  assert.deepEqual(w.weeklyDelta,loss);
  assert.deepEqual(C.weeklyAdjustment(s,world),loss);
  while(siteJob(s,spec.id).status!=='Crew resting')C.advance(s,world,1);
  assert.deepEqual(C.workerRole(s,world,id).weeklyDelta,loss);
  assert.deepEqual(C.weeklyAdjustment(s,world),loss);
  s.shift={residentId:id};
  w=C.workerRole(s,world,id);
  assert.equal(w.activity,'busy');
  assert.deepEqual(w.weeklyDelta,{food:0,materials:0,funds:0});
  assert.deepEqual(w.preferenceDelta,loss);
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
  s.shift=null;
  for(const p of s.residents)ok(C.setPreference(s,world,p.id,'build',spec.id));
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:-1,materials:-1,funds:-1});
  C.cancel(s,spec.id);
  assert.deepEqual(C.weeklyAdjustment(s,world),{food:0,materials:0,funds:0});
});

test('dismantling reserves a street lot, preserves the closed building and needs named workers for every stage',()=>{
  const s=town(),original={id:'former-grove',plot:2,kind:'wetland',name:'Reed beds',partners:['person-1'],history:{founded:3}};
  const spec={id:'clear-1',scope:'street',kind:'dismantle',name:'Dismantle the reed beds',plot:2,original,recovered:2,paid:{funds:0,materials:0}};
  s.buildings.push(original);
  assert.equal(C.preview(s,world,spec).ok,false);
  s.buildings=[];
  const quoted=ok(C.preview(s,world,spec)).job;
  const j=ok(C.start(s,world,spec)).job;
  assert.deepEqual(j.original,original);
  assert.equal(j.total,18);assert.equal(j.work,0);
  assert.equal(quoted.workers[0],'person-1');
  original.history.founded=999;
  assert.equal(j.original.history.founded,3);
  const publicView=siteJob(s,spec.id);
  publicView.original.name='Changed in UI';
  assert.equal(j.original.name,'Reed beds');
  assert.equal(C.start(s,world,order('market',2)).ok,false);
  assert.equal(C.start(s,world,{...order('market',0),id:j.original.id}).ok,false);
  const reached=new Set();
  while(s.construction.length){
    const current=siteJob(s,spec.id);
    reached.add(current.stage);
    assert.equal(C.valid(s),true);
    C.advance(s,world,1);
  }
  assert.deepEqual([...reached],['Securing the site','Salvaging materials','Clearing the plot']);
  assert.deepEqual(s.buildings,[]);
});

test('every dismantle quote enforces the saved lot, building, zero payment, distinct identities and exact ordinary salvage',()=>{
  const known=['garden','workshop','market','hall','pier','wetland'];
  for(const kind of known){
    const s=town(),original={id:'old',plot:0,kind,name:'Preserved name',partners:['person-0']};
    const spec={id:'remove',scope:'street',plot:0,kind:'dismantle',name:'Careful removal',original,recovered:kind==='wetland'?2:1,paid:{funds:0,materials:0}};
    for(const invalid of [{...spec,recovered:4},{...spec,paid:{funds:0,materials:1}},{...spec,paid:{food:2}},{...spec,id:'old'},
      {...spec,scope:'city',precinct:0},{...spec,original:{...original,kind:'dismantle'}},{...spec,original:{...original,plot:3}},
      {...spec,original:{...original,name:''}},{...spec,original:{...original,partners:['missing']}},
      {...spec,original:{...original,partners:['person-0','person-0']}},{...order(),original},{...order(),recovered:1}]){
      assert.equal(C.start(s,world,invalid).ok,false);
    }
    ok(C.start(s,world,spec));
    const restored=copy(s);
    assert.equal(C.valid(restored),true);
    for(const damage of [z=>z.construction[0].total++,z=>z.construction[0].original.id='remove',z=>z.construction[0].recovered++,
      z=>z.construction[0].paid.food=8,z=>z.buildings.push({id:'old',plot:1,kind:'hall'})]){
      const z=copy(s);damage(z);assert.equal(C.valid(z),false);
    }
    assert.deepEqual(C.cancel(restored,spec.id).original,original);
    assert.equal(C.valid(restored),true);
  }
});

test('a proposed worksite quotes the change in occupational output across all existing assignments',()=>{
  const s=town(),spec=order('workshop',2),afterPayment={...s,funds:s.funds-spec.paid.funds,materials:s.materials-spec.paid.materials};
  const old=C.weeklyAdjustment(s,world),quote=ok(C.preview(afterPayment,world,spec,s)).job;
  const candidate=copy(afterPayment);
  ok(C.start(candidate,world,spec));
  let after=C.weeklyAdjustment(candidate,world);
  const diff=(before,now)=>({food:now.food-before.food,materials:now.materials-before.materials,funds:now.funds-before.funds});
  assert.deepEqual(quote.weeklyDelta,diff(old,after));
  assert.deepEqual(quote.weeklyDelta,{food:0,materials:-1,funds:0});
  // A second location can borrow another resident; its quote must never count already-assigned Idris twice.
  const second=order('hall',5),q=ok(C.preview(candidate,world,second)).job;
  ok(C.start(candidate,world,second));
  assert.deepEqual(q.weeklyDelta,diff(after,C.weeklyAdjustment(candidate,world)));
  assert.deepEqual(q.weeklyDelta,{food:0,materials:0,funds:-1});
});

test('a restored assignment with an obsolete route cannot contribute until its named worker physically arrives',()=>{
  const s=town(),id=s.residents[1].id,spec=order('pier',0);
  ok(C.start(s,world,spec));oneBuilder(s,1,spec.id);
  const stored=s.workforce.members[id];
  stored.jobId=spec.id;stored.route=[];
  assert.equal(C.valid(s),true);
  const w=C.workerRole(s,world,id);
  assert.equal(w.activity,'travelling');
  assert.ok(w.travelLeft>1);
  C.advance(s,world,1);
  assert.equal(siteJob(s,spec.id).work,0);
  const restored=copy(s);
  restored.workforce.members[id].route=[{x:21,y:23.04}];
  const journey=C.workerRole(restored,world,id);
  C.advance(restored,world,journey.travelLeft);
  assert.equal(siteJob(restored,spec.id).work,0);
  C.advance(restored,world,1);
  assert.equal(siteJob(restored,spec.id).work,1);
});

test('teachers and school leads commute to operating facilities, release work on closure and return on reopening',()=>{
  const s=town(),id=s.residents[1].id,venue={id:'school',kind:'workshop',plot:0,name:'Repair workshop'};
  s.buildings=[venue];s.strategy={crew:[1,1,1],studying:'toolbank',active:null};
  const first=C.workerRole(s,world,id);
  assert.equal(first.role,'Teacher');assert.equal(first.physicalDuty,'school');
  assert.equal(first.activity,'busy');assert.equal(first.travelling,true);
  assert.equal(first.workplace.plot,0);assert.ok(first.travelLeft>0);
  assert.equal(C.needsTime(s,world),true);assert.equal(s.workforce,undefined);
  C.advance(s,world,30);
  const arrived=C.workerRole(s,world,id);
  assert.equal(arrived.travelling,false);
  assert.deepEqual([arrived.x,arrived.y],[arrived.workplace.x,arrived.workplace.y]);
  assert.equal(C.needsTime(s,world),false);
  s.strategy.studying=null;s.strategy.active='toolbank';
  assert.equal(C.workerRole(s,world,id).role,'School lead');
  s.buildings=[];
  const pending=order('hall',7);
  ok(C.start(s,world,pending));oneBuilder(s,1,pending.id);
  assert.equal(C.workerRole(s,world,id).jobId,pending.id);
  assert.equal(C.workerRole(s,world,id).physicalDuty,null);
  C.advance(s,world,2);
  s.buildings=[venue];
  const recalled=C.workerRole(s,world,id);
  assert.equal(recalled.jobId,null);assert.equal(recalled.travelling,true);assert.equal(recalled.role,'School lead');
  const kept=siteJob(s,pending.id).work;C.advance(s,world,40);
  assert.equal(siteJob(s,pending.id).work,kept);
  assert.equal(C.workerRole(s,world,id).travelling,false);
  s.shift={residentId:id};
  assert.equal(C.workerRole(s,world,id).physicalDuty,null);
  assert.equal(C.workerRole(s,world,id).role,'Resident companion');
});

test('a steward physically hosts at the hall or their doorstep, and shared tasks without a recorded venue retain home access',()=>{
  const s=town(),person=s.residents[0],term={...world,legacy:{term:{siteId:s.id,residentId:person.id}}};
  const hall={id:'h',plot:0,kind:'hall',name:'District assembly'};
  const first=C.workerRole(s,term,person.id);
  assert.equal(first.role,'Council steward');assert.equal(first.physicalDuty,'council');assert.equal(first.travelling,false);
  assert.equal(first.workplace.residentId,person.id);
  assert.equal(C.needsTime(s,term),false);
  s.buildings=[hall];C.advance(s,term,3);
  const moving=C.workerRole(s,term,person.id);
  assert.equal(moving.workplace.kind,'hall');assert.equal(moving.travelling,true);
  s.buildings=[];
  assert.equal(C.workerRole(s,term,person.id).workplace.residentId,person.id);
  C.advance(s,term,30);assert.equal(C.needsTime(s,term),false);
  s.buildings=[hall];C.advance(s,term,30);
  assert.equal(C.workerRole(s,term,person.id).workplace.plot,0);
  assert.equal(C.workerRole(s,term,person.id).travelling,false);
  s.neighbourWork={active:{phase:'working',kind:'tools',agreement:'rota'}};
  assert.equal(C.workerRole(s,world,person.id).role,'Project partner');
  assert.equal(C.workerRole(s,world,person.id).physicalDuty,null);
});

test('pausing a specific street job preserves its progress and invitation while a precinct crew carries on',()=>{
  const s=town(),a=order('pier',1),b={id:'city',scope:'city',kind:'yard',precinct:2,name:'Repair yard'};
  ok(C.start(s,world,a));ok(C.start(s,world,b));
  ok(C.setPreference(s,world,'person-0','build',a.id));ok(C.setPreference(s,world,'person-1','build',b.id));
  ok(C.setPreference(s,world,'person-2','usual'));
  C.advance(s,world,13);
  const original=siteJob(s,a.id).work,other=siteJob(s,b.id).work;
  assert.ok(original>0);assert.ok(other>0);
  assert.equal(C.setPaused(s,world,a.id,'yes').ok,false);
  assert.equal(C.setPaused(s,world,'missing',true).ok,false);
  ok(C.setPaused(s,world,a.id,true));
  const frozen=JSON.stringify(s);
  assert.equal(C.setPaused(s,world,a.id,true).unchanged,true);assert.equal(JSON.stringify(s),frozen);
  assert.equal(C.setPreference(s,world,'person-2','build',a.id).ok,false);
  const held=siteJob(s,a.id),worker=C.workerRole(s,world,'person-0');
  assert.equal(held.status,'Paused · work kept');assert.equal(held.etaSeconds,null);assert.deepEqual(held.workers,[]);
  assert.equal(worker.preferredJobId,a.id);assert.equal(worker.jobId,null);
  assert.deepEqual(worker.weeklyDelta,{food:0,materials:0,funds:0});
  const resumed=copy(s);assert.equal(C.valid(resumed),true);
  C.advance(resumed,world,7);
  assert.equal(siteJob(resumed,a.id).work,original);
  assert.ok(siteJob(resumed,b.id).work>other);
  ok(C.setPaused(resumed,world,a.id,false));
  C.advance(resumed,world,20);
  assert.ok(siteJob(resumed,a.id).work>original);
  assert.equal(C.workerRole(resumed,world,'person-0').jobId,a.id);
});

test('paused precincts and dismantling stay inert across saves without occupying their former crew',()=>{
  const s=town(),demo={id:'clear',scope:'street',kind:'dismantle',plot:2,name:'Dismantle garden',
    paid:{funds:0,materials:0},original:{id:'garden',kind:'garden',plot:2,name:'Garden'},recovered:1};
  const city={id:'city',scope:'city',kind:'homes',precinct:1,name:'Settlement housing'};
  ok(C.start(s,world,demo));ok(C.start(s,world,city));
  C.advance(s,world,7);
  for(const job of [demo,city])ok(C.setPaused(s,world,job.id,true));
  C.advance(s,world,40);
  assert.equal(C.needsTime(s,world),false);
  const saved=JSON.stringify(s),restored=JSON.parse(saved);
  assert.equal(C.advance(restored,world,3600).changed,false);
  assert.equal(JSON.stringify(restored),saved);
  assert.equal(C.valid(restored),true);
  restored.construction[0].paused=1;
  assert.equal(C.valid(restored),false);restored.construction[0].paused=true;
  ok(C.setPaused(restored,world,demo.id,false));
  const result=C.advance(restored,world,90);
  assert.deepEqual(result.completed.map(j=>j.id),[demo.id]);
  assert.equal(siteJob(restored,city.id).status,'Paused · work kept');
});

test('a first tick on a partial legacy roster moves the prepared persistent member and reconsiders later decisions',()=>{
  const s=town();s.food=0;
  ok(C.start(s,world,order('pier',0)));
  const partial=copy(s);
  delete partial.workforce.members['person-2'];
  assert.equal(C.valid(partial),true);
  const ordinary=C.advance(s,world,4),repaired=C.advance(partial,world,4);
  assert.equal(ordinary.changed,true);assert.equal(repaired.changed,true);
  assert.deepEqual(copy(partial),copy(s));
  const role=C.workerRole(partial,world,'person-2');
  assert.ok(role.relief||role.jobId);
  assert.notDeepEqual([role.x,role.y],[21,23.04]);
});

test('an accepted career changes the physical workplace, and a saved weekly outing returns the person to that post once',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),runtime={};
  for(const file of ['personas.js','careers.js','autonomy.js','construction.js']){
    vm.runInNewContext(fs.readFileSync(path.join(game,file),'utf8'),runtime);
  }
  const crew=runtime.EarthConstruction,s=town(),person=s.residents[0],current={week:7};
  s.buildings=[{id:'clinic',plot:0,kind:'hall',name:'Community clinic'}];
  s.careers={[person.id]:{jobId:'nurse'}};
  assert(crew.needsTime(s,current));
  ok(crew.advance(s,current,30));
  const nurse=()=>crew.workerRole(s,current,person.id);
  assert.equal(nurse().role,'Nurse');
  assert.equal(nurse().workplace.kind,'hall');
  assert.equal(nurse().activity,'working');
  assert.deepEqual({...crew.weeklyAdjustment(s,current)},{food:0,materials:0,funds:0});
  const shift={week:7,kind:'rest',venue:'bench',reason:'Rest after a long shift.'};
  s.autonomy={people:{[person.id]:{history:[shift]}}};
  assert(crew.needsTime(s,current));
  assert.equal(nurse().workplace.type,'park');
  ok(crew.advance(s,current,5));
  const loaded=copy(s);
  ok(crew.advance(s,current,60));
  for(let i=0;i<60;i++)ok(crew.advance(loaded,current,1));
  assert.deepEqual(copy(s),copy(loaded));
  assert.equal(nurse().workplace.kind,'hall');
  assert.equal(s.workforce.members[person.id].outingWeek,7);
  assert.equal(s.workforce.members[person.id].outingLeft,0);
  assert.equal(crew.needsTime(s,current),false);
  current.week=8;s.autonomy.people[person.id].history=[{...shift,week:8}];
  s.agency={actor:person.id};
  assert.equal(crew.needsTime(s,current),false);
  assert.equal(nurse().role,'Under your control');
  delete s.agency;
  assert.equal(crew.needsTime(s,current),true);
  ok(crew.setPreference(s,current,person.id,'repair'));
  assert.equal(nurse().occupation,'repair');
  assert.notEqual(nurse().workplace.type,'park');
});
