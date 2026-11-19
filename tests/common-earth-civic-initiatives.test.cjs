'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function runtime(files){const w=vm.createContext({structuredClone});w.window=w;for(const f of files)vm.runInContext(fs.readFileSync(path.join(dir,f+'.js'),'utf8'),w,{filename:f});return w;}
function setup(){
  const w=runtime(['civic-initiatives']),c=w.EarthCivicInitiatives,world={week:4,activeId:'town',effort:0,sites:[]};
  const people=['steward','r0','r1','r2','walker-2'].map((id,i)=>({id,name:['Steward','Mei','Eli','Nora','Anders'][i],slot:i-1,traits:{initiative:40,patience:82},aptitudes:{craft:63-i,care:51-i,communication:62-i}}));
  const site={id:'town',founded:1,population:12,food:24,materials:13,funds:22,buildings:[],construction:[],residents:people.slice(1,4)};world.sites=[site];
  w.EarthPersonas={list:()=>people,profile:(_s,id)=>people.find(p=>p.id===id)};w.EarthAgency={actorId:s=>s.agency?.actor||'steward'};
  w.CommonEarthSim={buildings:{garden:{funds:5,materials:3},workshop:{funds:6,materials:3}}};
  let evidence=[{id:'r1/5',kind:'build',title:'A loading cradle',ownerId:'r1',ownerName:'Eli',beneficiaryId:'r0',week:3}];
  w.EarthLocalProjects={completions:()=>evidence};
  const choice={kind:'build',id:'build:workshop',label:'Repair workshop',goods:{funds:6,materials:3},effort:1,available:true,plot:4};
  const hooks={options:()=>[choice],enact:(_world,s,q)=>{
    if(s.funds<q.goods.funds||s.materials<q.goods.materials||s.construction.length)return {ok:false,message:'Contract cannot be issued.'};
    s.funds-=q.goods.funds;s.materials-=q.goods.materials;s.construction.push({id:'ordered',kind:'workshop',scope:'street',plot:q.plot});return {ok:true,jobId:'ordered',message:'The crew can start work.'};
  }};
  function tick(at){world.week=at;const n=c.tick(world,site,hooks);assert(c.valid(site,at));return n;}
  function meet(action,offset=.6){const p=c.view(world,site).active,m=c.guidance(world,site),id=m.contactId;
    return c.command(world,site,id,action,p.id,m.revision,{siteId:site.id,actor:w.EarthAgency.actorId(site),target:id,mode:'walk',x:3,y:5,tx:3+offset,ty:5});}
  return {c,w,site,world,choice,hooks,tick,meet,removeEvidence(){evidence=[];}};
}
test('a named delegation extends a finished personal project into a paid public work without taking player effort',()=>{
  const {site,world,c,tick}=setup();const cash=site.funds,materials=site.materials;
  tick(4);const p=c.view(world,site).active;
  assert.equal(p.leadName,'Eli');assert.equal(p.beneficiaryName,'Mei');assert.equal(p.evidence.id,'r1/5');assert.equal(p.decisionWeek,6);
  for(const v of p.votes)assert(!c.hasTestimony(site,v.personId));
  tick(5);assert.equal(site.funds,cash);assert.equal(p.contributions.length,0);
  tick(6);assert(p.contributions.length>0);assert.equal(site.funds,cash);assert.equal(site.construction.length,0);
  for(const v of p.votes.filter(v=>site.residents.some(r=>r.id===v.personId)))assert(c.hasTestimony(site,v.personId));
  const clone=structuredClone(site);c.tick(world,site,{options(){throw Error('duplicate tick');}});assert.deepEqual(JSON.parse(JSON.stringify(site)),JSON.parse(JSON.stringify(clone)));
  tick(7);tick(8);assert.equal(site.funds,cash-6);assert.equal(site.materials,materials-3);assert.equal(world.effort,0);
  assert.equal(c.view(world,site).history[0].phase,'commissioned');assert.equal(site.buildings.length,0);assert.equal(site.construction.length,1);
  const booked=site.civicInitiatives.history[0];booked.works={week:world.week,people:[p.leadId]};assert.equal(c.commitment(site,world,p.leadId).plot,4);
  site.buildings.push({id:'ordered',kind:'workshop',plot:4});site.construction=[];tick(9);assert.equal(c.view(world,site).history[0].phase,'built');
  assert.equal(c.commitment(site,world,p.leadId),null);assert(c.valid(site,world.week));
});
test('postponement requires the delegate in person, gives two further full weeks and preserves the original stock and lot',()=>{
  const {c,world,site,tick,meet,choice}=setup();tick(4);const p=c.view(world,site).active;
  assert.equal(meet('postpone',8).ok,false);assert(meet('postpone').ok);assert.equal(meet('endorse').ok,false);
  tick(5);tick(6);assert.equal(p.contributions.length,0);assert.equal(c.hasTestimony(site,p.leadId),false);
  choice.plot=7;tick(7);assert.equal(p.phase,'blocked');assert.equal(p.plot,4);assert.equal(site.construction.length,0);
  const before=site.funds;tick(18);assert.equal(c.view(world,site).history[0].phase,'withdrawn');assert.equal(site.funds,before);
});
test('dissent, absence, protected stocks, learning goals and pinned lots can stop a public expense',()=>{
  const {site,world,c,tick,meet,removeEvidence}=setup();removeEvidence();site.funds=13;
  tick(4);const p=c.view(world,site).active;assert(p.votes.filter(v=>v.stance==='dissent').length>=2);
  tick(6);assert(p.status.includes('second citizen'));assert.equal(p.contributions.length,0);
  assert(meet('endorse').ok);world.learningGoals={active:{siteId:site.id,guard:{key:'funds',base:13}}};
  site.workforce={members:{[p.beneficiaryId]:{preference:'repair'}}};tick(7);assert.match(p.status,/13 funds/);assert.equal(p.contributions.length,0);
  delete world.learningGoals;site.buildPlan='garden';site.buildPlanPlot=4;tick(8);assert.equal(p.phase,'blocked');assert.equal(site.construction.length,0);
  delete site.buildPlan;delete site.buildPlanPlot;site.workforce={};const before=site.funds;
  for(let week=9;week<=14;week++)tick(week);assert.equal(site.funds,before-6);assert.equal(site.construction.length,1);
  site.construction=[];tick(15);assert.equal(c.view(world,site).history[0].phase,'cancelled');assert.equal(site.buildings.length,0);
});
test('unavailable founding residents and controlled speakers cannot gain committee testimony',()=>{
  const {site,world,c,tick}=setup();tick(4);const p=c.view(world,site).active;
  const third=p.votes[2].personId;site.shift={residentId:third};site.agency={actor:p.leadId};tick(6);
  assert(!c.hasTestimony(site,third));assert(!c.hasTestimony(site,p.leadId));assert.equal(p.attendees.length,0);
  site.agency={actor:'steward'};delete site.shift;tick(7);assert(c.hasTestimony(site,third));
  const malformed=structuredClone(site);malformed.civicInitiatives.testimony.push({personId:'walker-2',week:6,proposalId:p.id,stance:'support'});assert(!c.valid(malformed,world.week));
});

function towns(){
  const w=runtime(['shifts','construction','personas','careers','local-projects','autonomy','agency','civic-initiatives','simulation']);
  const sim=w.CommonEarthSim.create({storage:null});assert(sim.found({name:'Glen',lat:2,lon:5}).ok);assert(sim.found({name:'Vale',lat:8,lon:22}).ok);
  return {w,sim,origin:sim.state.sites[0],other:sim.active()};
}
test('an unplayed town commissions a real street building, opens it and adopts research while player dialogue remains untouched',()=>{
  const {sim,w,origin,other}=towns();let firstJob,hadInspection=false;
  for(let i=0;i<46;i++){
    const before=JSON.stringify(sim.state);sim.forecastNext();assert.equal(JSON.stringify(sim.state),before,'forecast is detached');
    assert(sim.advance().ok);assert.equal(sim.state.activeId,other.id);
    assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)),'every intermediate result can be reopened');
    const h=w.EarthCivicInitiatives.view(sim.state,origin).history.find(p=>p.kind==='build');
    if(h?.phase==='commissioned'&&!firstJob){
      firstJob=h.jobId;const job=origin.construction.find(j=>j.id===firstJob);assert(job);assert.equal(job.plot,h.plot);assert(!origin.buildings.some(b=>b.id===firstJob));hadInspection=true;
    }
    if(origin.tech.includes('apprenticeship'))break;
  }
  assert(hadInspection);assert(origin.buildings.some(b=>b.id===firstJob));assert(origin.tech.includes('apprenticeship'));
  assert(w.EarthCivicInitiatives.view(sim.state,origin).history.some(h=>h.phase==='adopted'&&h.choiceId==='research:apprenticeship'));
  assert(origin.residents.every(p=>!p.heard));assert(origin.residents.some(p=>w.EarthCivicInitiatives.hasTestimony(origin,p.id)));
  sim.destroy();
});
test('pausing or cancelling an autonomous worksite is respected on the next remote weekly close',()=>{
  const {sim,w,origin,other}=towns();let initiative;
  for(let i=0;i<16;i++){
    assert(sim.advance().ok);initiative=w.EarthCivicInitiatives.view(sim.state,origin).history.find(p=>p.phase==='commissioned');if(initiative)break;
  }
  assert(initiative);assert(sim.visit(origin.id).ok);const job=origin.construction.find(j=>j.id===initiative.jobId),work=job.work;
  assert(sim.setConstructionPaused(job.id,true).ok);assert(sim.visit(other.id).ok);assert(sim.advance().ok);assert.equal(job.work,work);
  assert(sim.visit(origin.id).ok);assert(sim.cancelConstruction(job.id).ok);assert(sim.visit(other.id).ok);assert(sim.advance().ok);
  const closed=w.EarthCivicInitiatives.view(sim.state,origin).history.find(h=>h.id===initiative.id);
  assert.equal(closed.phase,'cancelled');assert(!origin.buildings.some(b=>b.id===job.id));assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)));sim.destroy();
});

test('two public worksites sharing a committee cannot spend the same volunteer shift twice',()=>{
  const {sim,w,origin,other}=towns();let first;
  for(let n=0;n<20&&!first;n++){
    assert(sim.advance().ok);
    first=origin.civicInitiatives?.history.find(p=>p.phase==='commissioned');
  }
  assert(first);
  const kind=first.choiceId==='build:garden'?'hall':'garden',plot=(first.plot+1)%9;
  assert(sim.visit(origin.id).ok);
  assert(sim.act('build:'+kind,plot).ok);
  const job=origin.construction.find(j=>j.plot===plot);assert(job);
  const second=structuredClone(first);
  Object.assign(second,{id:first.id+'-second',choiceId:'build:'+kind,title:job.name,plot,jobId:job.id});
  delete second.works;
  origin.civicInitiatives.history.push(second);
  assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)),'a restored town can have simultaneous public contracts');
  assert(sim.visit(other.id).ok);
  for(let i=0;i<3;i++){
    assert(sim.advance().ok);
    const shifts=origin.civicInitiatives.history.flatMap(p=>p.works?.week===sim.state.week?p.works.people:[]);
    assert(shifts.length>0);assert.equal(new Set(shifts).size,shifts.length,'a single person cannot work two contracts in one calendar shift');
    assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  }
  sim.destroy();
});
