'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function fixture(){
  const ids=['steward','r0','r1','r2',...Array.from({length:5},(_,i)=>'walker-'+i),'driver','carrier-1-3'];
  const cast=ids.map((id,i)=>({id,name:'Person '+i,role:['Grower','Repairer','Convener'][i%3],
    traits:{curiosity:55,initiative:60,patience:45,adaptability:65,sociability:i===1?70:58},
    aptitudes:{care:65,craft:55,stamina:50},strengths:['care'],interests:['garden']}));
  const root={EarthPersonas:{list:()=>cast,profile:(_site,id)=>cast.find(p=>p.id===id)},EarthAgency:{actorId:s=>s.agency?.actor||'steward'}};
  vm.runInNewContext(fs.readFileSync(path.join(directory,'autonomy.js'),'utf8'),{window:root});
  const a=root.EarthAutonomy,world={week:2,activeId:'harbour'},site={id:'harbour',founded:1,population:12,food:20,
    residents:cast.slice(1,4).map((p,i)=>({...p,slot:i})),agency:{actor:'steward',meals:[]}};
  return {a,root,site,world,cast};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('a forecast and a real week choose identical local actions with finite output; repeated reads and settlement are inert',()=>{
  const {site,world,cast,a}=fixture();site.food=0;
  assert.equal(a.valid(site,world.week),true);
  a.view(site,world,'walker-2');a.guidance(site,world,'driver');assert.equal(site.autonomy,undefined);
  const forecast=structuredClone(site),notes=a.settle(forecast,world);
  assert.equal(site.autonomy,undefined);assert.deepEqual(plain(a.settle(site,world)),plain(notes));
  assert.deepEqual(plain(site.autonomy),plain(forecast.autonomy));
  assert.equal(Object.keys(site.autonomy.people).length,cast.length);assert.equal(a.intent(site,'steward').kind,'player');
  assert.equal(a.rates(site,world).food,1);assert.equal(site.food,0);assert.equal(notes.length,1);
  const before=JSON.stringify(site);assert.equal(a.settle(site,world).length,0);assert.equal(JSON.stringify(site),before);
  world.activeId='elsewhere';for(let i=0;i<80;i++){
    world.week++;const events=a.settle(site,world);assert(events.length<=2);assert.equal(a.valid(site,world.week),true);
    assert(Object.values(a.rates(site,world)).reduce((a,b)=>a+b,0)<=2);
  }
  assert.notEqual(a.intent(site,'steward').kind,'player');assert.equal(a.history(site,'driver').length,4);
  const corrupted=structuredClone(site);corrupted.autonomy.effects.food=25;assert(!a.valid(corrupted,world.week));
  corrupted.autonomy.effects={};corrupted.autonomy.people.driver.history[0].target='unknown';assert(!a.valid(corrupted,world.week));
});
test('keeping promises, shared shifts, chosen work roles, and missed agreements takes precedence over an outing',()=>{
  const {a,site,world}=fixture();site.food=0;site.residents[0].promise={dueWeek:3};
  site.shift={residentId:'r1'};site.workforce={members:{r2:{preference:'repair'}}};
  a.settle(site,world);
  for(const r of site.residents)assert.equal(a.intent(site,r.id).kind,'commitment');
  delete site.residents[0].promise;site.residents[0].lastMissed={week:2};world.week++;
  a.settle(site,world);assert.equal(a.intent(site,'r0').kind,'routine');assert.match(a.intent(site,'r0').reason,/missed promise/);
});
test('in-person advice can be declined, cannot be duplicated, and accepted advice influences the next week',()=>{
  const {a,site,world}=fixture(),id='driver';
  const proof={siteId:site.id,actor:'steward',target:id,mode:'walk',x:5,y:6,tx:5.4,ty:6};
  const ask=(action,rev=0,m=proof)=>a.command(world,site,id,action,null,rev,m);
  assert.equal(ask('help',0,{...proof,ty:15}).ok,false);assert.equal(site.autonomy,undefined);
  assert(ask('help').ok);assert.equal(a.view(site,world,id).advice.accepted,false);
  assert(!ask('learn').ok);world.week++;site.food=1;
  assert(ask('help',a.guidance(site,world,id).revision).ok);world.week++;
  a.settle(site,world);assert.equal(a.intent(site,id).kind,'gather');assert.equal(a.rates(site,world).food,1);
});
test('mutual visits remember a past meal and respect a neighbour who wants time alone',()=>{
  const {a,site,world,cast}=fixture();a.settle(site,world);world.week++;
  const source=cast.find(p=>p.id==='r0'),friend=cast.find(p=>p.id==='walker-3');
  for(const p of cast){p.traits.sociability=5;site.autonomy.people[p.id].contact=0;}
  source.traits.sociability=95;friend.traits.sociability=83;site.autonomy.people[source.id].contact=6;
  site.agency.meals.push({week:world.week-1,from:friend.id,to:source.id});
  a.settle(site,world);
  assert.equal(a.intent(site,source.id).kind,'visit');assert.equal(a.intent(site,source.id).target,friend.id);
  assert.equal(a.intent(site,friend.id).kind,'host');assert.equal(a.intent(site,friend.id).target,source.id);
  assert.equal(a.view(site,world,friend.id).contact,0);assert.deepEqual(plain(a.rates(site,world)),{});
});
test('career initiative goes through consenting domain offers and does not touch a player-led course',()=>{
  const {a,site,world,cast,root}=fixture();world.week=5;
  const learner=cast.find(p=>p.id==='driver'),manual=cast.find(p=>p.id==='r2');
  for(const p of [learner,manual]){p.traits.curiosity=95;p.traits.initiative=95;}
  const job={id:'nurse',label:'Nurse',skill:'care',employer:'District clinic',venue:'hall'},calls=[];
  root.EarthCareers={catalog:[job],view:(w,s,id)=>({revision:7,training:id===manual.id?{autonomous:false}:null,choices:[{id:'enroll',targetId:'nurse',available:true}]}),
    command:(w,s,id,action,job,rev,meeting,options)=>{calls.push({id,action,job,rev,meeting,options});return {ok:true};}};
  a.settle(site,world);assert.equal(calls.length,1);assert.deepEqual(plain(calls[0]),{id:'driver',action:'enroll',job:'nurse',rev:7,options:{speakerId:'driver',autonomous:true}});
  assert.equal(a.intent(site,'driver').kind,'learn');assert.match(a.intent(site,'driver').reason,/care/);
  assert.equal(a.intent(site,'r2').kind,'routine');
});

test('temporary cover restores at most the actual missing unit and leaves nominated cover alone',()=>{
  const {a,site,world,root}=fixture();
  let coverId=null;root.EarthCareers={coverage:()=>[{personId:'r0',oldRole:'Grower',occupation:'food',coverId}],weeklyAdjustment:()=>({food:-1})};
  a.settle(site,world);assert.equal(a.rates(site,world).food,1);assert.equal(Object.values(site.autonomy.people).filter(r=>r.history[0].kind==='cover').length,1);
  world.week++;coverId='r2';a.settle(site,world);assert.deepEqual(plain(a.rates(site,world)),{});
});

test('real local careers finish classes, apply with sufficient evidence and accept a post on their own timetable',()=>{
  const root={structuredClone};root.window=root;vm.createContext(root);
  for(const f of ['personas','careers','agency','autonomy','simulation'])vm.runInContext(fs.readFileSync(path.join(directory,f+'.js'),'utf8'),root);
  const sim=root.CommonEarthSim.create({storage:null});assert(sim.found({name:'Harbour',lat:55,lon:10}).ok);
  const site=sim.active(),actor=root.EarthAgency.actorId(site),world={activeId:site.id,week:1};
  let reviewed=false,started=false;
  for(let week=2;week<=230;week++){
    world.week=week;root.EarthCareers.tick(world,site);root.EarthAutonomy.settle(site,world);
    const careers=Object.entries(site.careers||{});
    assert(careers.filter(([,life])=>life.training?.autonomous||life.application?.autonomous).length<=2);
    for(const [id,life] of careers){
      assert.notEqual(id,actor);if(life.jobId)started=true;
      if(life.application?.phase==='screening'){
        const v=root.EarthCareers.view(world,site,id,life.application.targetId,{speakerId:id});
        assert.equal(v.qualified,true);assert.equal(v.missing.length,0);reviewed=true;
      }
    }
    assert(root.EarthAutonomy.valid(site,week));assert(root.EarthCareers.valid(site,week));
  }
  assert(reviewed,'somebody personally applied with a complete qualification');assert(started,'somebody started a different occupation');sim.destroy();
});

test('a walker who accepts a face-to-face training proposal can study, answer an offer and actually start the job',async()=>{
  const root={structuredClone};root.window=root;vm.createContext(root);
  for(const f of ['personas','careers','agency','autonomy','simulation'])vm.runInContext(fs.readFileSync(path.join(directory,f+'.js'),'utf8'),root);
  const sim=root.CommonEarthSim.create({storage:null});assert(sim.found({name:'Harbour',lat:55,lon:10}).ok);
  const site=sim.active(),id='walker-3',actor=root.EarthAgency.actorId(site),target='gardener';
  const spontaneous=()=>Object.values(site.autonomy?.people||{}).filter(p=>p.path&&!p.proposed).length;
  for(let i=0;i<40 && spontaneous()<2;i++)assert(sim.advance().ok);
  assert.equal(spontaneous(),2,'both spontaneous learning places are already occupied');
  assert.equal(site.careers[id],undefined,'this passing neighbour has not begun a career plan');
  const person=root.EarthPersonas.profile(site,id),meeting={siteId:site.id,actor,target:id,mode:'walk',x:5,y:6,tx:5.3,ty:6};
  const quote=root.EarthCareers.view(sim.state,site,id,target,{speakerId:actor}).choices.find(c=>c.id==='enroll');
  assert(quote?.available,quote?.reason);
  const result=await sim.perform('lifeAction',id,{domain:'career',action:'enroll',targetId:target,expectedRevision:quote.expectedRevision,actorId:actor,siteId:site.id,generation:site.foundingRevision||0,week:sim.state.week},()=>meeting);
  assert(result.ok,result.message);assert.equal(site.careers[id].agreedPlan,target);
  for(let i=0;i<70 && site.careers[id].jobId!==target;i++)assert(sim.advance().ok);
  assert.equal(root.EarthAgency.actorId(sim.active()),actor);
  assert.equal(site.careers[id].jobId,target,person.name+' progressed from an accepted suggestion to a real career');
  assert.equal(site.careers[id].agreedPlan,undefined);assert(root.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  sim.destroy();
});
