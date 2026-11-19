'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const ok=r=>{assert.equal(r.ok,true,r.message);return r;};
const copy=x=>JSON.parse(JSON.stringify(x));
function district(omit=[]){
  const c=vm.createContext({structuredClone});c.window=c;
  for(const file of ['personas','agency','careers','local-projects','autonomy','market','purses','fleet','dialogue','provisions','simulation'])
    if(!omit.includes(file))vm.runInContext(fs.readFileSync(path.join(dir,file+'.js'),'utf8'),c,{filename:file+'.js'});
  const entries=new Map(),open=()=>c.CommonEarthSim.create({storage:{getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)}});
  const sim=open();ok(sim.found({lat:-6.16,lon:39.19,name:'Stone Town'}));
  return {c,sim,open};
}
function pose(t,id,x=8,y=9){
  const s=t.sim.active(),actor=t.c.EarthAgency.actorId(s);
  return {siteId:s.id,actor,x,y,tx:x+.5,ty:y,target:id,mode:'walk',targetPose:{id,x:12,y:10,mode:'walk'}};
}
const switchTo=(t,id,p)=>t.sim.changeActor(id,p||pose(t,id));
function lane(site,from,to,trade=false){site.buildings=[
  {id:'from',kind:trade?'pier':'workshop',plot:from,name:'Loading entrance'},
  {id:'to',kind:trade?'market':'garden',plot:to,name:'Destination'}];}
function work(t,action){
  const item=t.sim.purseView().options.find(o=>o.action===action);
  assert(item?.available,item?.reason);return t.sim.purseAction(item.request,pose(t,item.venue.residentId||'market'));
}
test('only present legal supply porters can take control, repeated switches preserve the named position without duplicating them',()=>{
  const t=district(),s=t.sim.active(),a=t.c.EarthAgency,id='carrier-0-1';
  const old=JSON.stringify(s);assert.equal(a.playables(s).length,10);assert(!a.canPlay(s,id));assert(!switchTo(t,id).ok);assert.equal(JSON.stringify(s),old);
  lane(s,0,1);const before=JSON.stringify(s),who=a.playables(s).at(-1);
  assert.equal(who.id,id);assert.equal(who.role,'Garden courier');assert.equal(JSON.stringify(s),before);
  for(const p of [{...pose(t,id),targetPose:null},{...pose(t,id),targetPose:{id,x:9,y:9,mode:'drive'}},pose(t,'carrier-1-0')]){
    assert(!switchTo(t,id,p).ok);assert.equal(JSON.stringify(s),before);
  }
  ok(switchTo(t,id));assert.equal(a.actor(s).name,who.name);assert.deepEqual(copy(s.agency.porters),[id]);
  assert.deepEqual([s.agency.actorAt.x,s.agency.actorAt.y],[12,10]);
  s.buildings=[];assert(a.canPlay(s,id));assert.equal(a.playables(s).filter(p=>p.id===id).length,1);
  ok(switchTo(t,'steward',pose(t,'steward',3.5,7)));assert.deepEqual([s.agency.localPositions[id].x,s.agency.localPositions[id].y],[3.5,7]);
  lane(s,0,1,true);ok(switchTo(t,id));assert.equal(a.actor(s).name,who.name);assert.equal(a.actor(s).role,'Exchange porter');
  assert.equal(s.agency.porters.length,1);assert.equal(a.playables(s).length,11);
  assert(t.c.CommonEarthSim.readSave(JSON.stringify(t.sim.state)));t.sim.destroy();
});
test('a named porter’s wage, conversations, driving induction and handoff survive losing the lane, a visit abroad and repeated reloads',()=>{
  const t=district(),{c}=t,s=t.sim.active(),id='carrier-0-1',resident=s.residents[1].id;lane(s,0,1);ok(switchTo(t,id));
  const porter=c.EarthAgency.actor(s).name;ok(work(t,'start'));ok(work(t,'check'));ok(work(t,'finish'));
  assert.equal(t.sim.purseView().balance,2);
  ok(t.sim.converse(resident,'listen',()=>pose(t,resident)));
  const f=t.sim.truckView();ok(t.sim.useTruck({action:'enrol',actorId:id,siteId:s.id,generation:f.generation,week:f.week,serial:f.serial},
    {...pose(t,'market'),...f.depot,truck:f.depot}));
  const oldName=s.residents[1].name,home=s.id;s.buildings=[];
  ok(t.sim.found({lat:4,lon:14,name:'Inland Junction'},undefined,'later',home,()=>pose(t,'steward',10.1,2.2)));
  const away=t.sim.active();assert.equal(c.EarthAgency.actorId(away),'steward');assert.equal(t.sim.purseView().balance,0);
  assert(!c.EarthAgency.canPlay(away,id));t.sim.destroy();t.sim=t.open();
  ok(t.sim.visit(home));const restored=t.sim.active();assert.equal(c.EarthAgency.actorId(restored),id);assert.equal(c.EarthAgency.actor(restored).name,porter);
  assert.deepEqual([restored.agency.actorAt.x,restored.agency.actorAt.y],[10.1,2.2]);assert.equal(t.sim.purseView().balance,2);
  assert.equal(t.sim.purseView().entries[0].action,'wage');assert.equal(t.sim.truckView().role,'Dispatch induction in progress');
  assert.match(t.sim.converse(resident,'followup',()=>pose(t,resident)).message,new RegExp(oldName));
  for(let i=0;i<4;i++){const snap=t.sim.forecastNext().sites[0].closing;ok(t.sim.advance());assert.equal(restored.food,snap.food);}
  assert.equal(t.sim.truckView().role,'Co-op relief roster');t.sim.destroy();t.sim=t.open();assert.equal(t.sim.purseView().balance,2);
  assert.equal(t.c.EarthPersonas.list(t.sim.active()).filter(p=>p.id===id).length,1);t.sim.destroy();
});
test('previously unplayed porters with earned skills or recorded meetings remain approachable; viewing a dormant identity creates no residents',()=>{
  const t=district(),s=t.sim.active(),a=t.c.EarthAgency,c=t.c.EarthCareers,id='carrier-0-1',second='carrier-3-4';
  lane(s,0,1);let v=c.view(t.sim.state,s,id,'nurse',{speakerId:'steward'});
  ok(t.sim.lifeAction(id,{domain:'career',action:'practice',targetId:'nurse',expectedRevision:v.revision,week:t.sim.state.week,siteId:s.id,generation:s.foundingRevision||0,actorId:'steward'},()=>pose(t,id)));
  s.buildings=[];assert(a.canPlay(s,id));assert.equal(s.agency?.porters,undefined);
  lane(s,3,4);ok(t.sim.converse(second,'listen',()=>pose(t,second)));s.buildings=[];
  assert(a.canPlay(s,second));assert(a.identity(s,second).available);assert.ok(t.sim.converse(second,'followup',()=>pose(t,second)).ok);
  const before=JSON.stringify(s);assert.equal(a.identity(s,'carrier-6-7').available,false);assert(!a.canPlay(s,'carrier-6-7'));assert.equal(JSON.stringify(s),before);
  assert.equal(t.c.EarthPersonas.porterIds(s).length,2);ok(switchTo(t,second));assert.deepEqual(copy(s.agency.porters),[second]);
  t.sim.destroy();
});
test('the controlled registry holds at most the 24 lawful, directional, adjacent supply roles and rejects invalid saved claimant positions',()=>{
  const t=district(),s=t.sim.active(),a=t.c.EarthAgency,all=[];
  for(let from=0;from<9;from++)for(let to=0;to<9;to++){
    const id='carrier-'+from+'-'+to,adjacent=Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1;
    if(!adjacent){assert.equal(a.canPlay(s,id),false);continue;}
    lane(s,from,to);ok(switchTo(t,id));ok(switchTo(t,'steward'));all.push(id);
  }
  assert.equal(all.length,24);s.buildings=[];assert.deepEqual(copy(s.agency.porters).sort(),all.sort());
  assert.equal(t.c.EarthPersonas.porterIds(s).length,24);assert.equal(a.playables(s).length,34);
  assert(t.c.CommonEarthSim.readSave(JSON.stringify(t.sim.state)));
  for(const breakIt of [x=>x.porters.push('carrier-0-0'),x=>x.porters[1]=x.porters[0],x=>x.porters[1]='carrier-0-8',
    x=>{x.porters={};},x=>{x.porters=[];},x=>{x.localPositions['carrier-6-8']=x.localPositions[all[0]];}]){
    const forged=copy(t.sim.state);breakIt(forged.sites[0].agency);assert.equal(t.c.CommonEarthSim.readSave(JSON.stringify(forged)),null);
  }
  t.sim.destroy();
});
function licensed(t,id,target='refuse'){
  const c=t.c.EarthCareers,s=t.sim.active(),p=t.c.EarthPersonas.profile(s,id),j=c.catalog.find(j=>j.id===target);
  const m=(s.careers||={})[id]||={revision:1,qualifications:{},skills:{},portfolios:{},references:{},history:[]};
  m.qualifications[target]=t.sim.state.week;m.portfolios[target]=3;
  for(const a of [j.skill,j.secondary])m.skills[a]=p.bounds[a].max;
  assert(c.valid(s,t.sim.state.week));return m;
}
function jobChoice(t,id,target,action){
  const {c,sim}=t,s=sim.active(),v=c.EarthCareers.view(sim.state,s,id,target,{speakerId:id});
  return sim.lifeAction(id,{domain:'career',action,targetId:target,expectedRevision:v.revision,week:sim.state.week,siteId:s.id,
    generation:s.foundingRevision||0,actorId:id},()=>pose(t,id));
}
test('the actual job handover removes only the marginal unit from each kind of supply run and returning to courier work restores it',()=>{
  for(const trade of [false,true]){
    const t=district(['autonomy','local-projects']),{sim,c}=t,s=sim.active(),id='carrier-0-1';s.population=23;s.specialty='materials';lane(s,0,1,trade);
    const marketBase=c.CommonEarthSim.marketPlan(s).baseFunds,baseFunds=2+marketBase,baseFood=3-Math.ceil(s.population/5)+(trade?0:3);
    const report=()=>sim.forecastNext().sites[0].production;
    ok(switchTo(t,id));assert.equal(report()[trade?'funds':'food'],trade?baseFunds+1:baseFood+1,'taking control alone leaves the staffed run intact');
    const m=licensed(t,id);ok(jobChoice(t,id,'refuse','apply'));ok(sim.advance());ok(sim.advance());ok(jobChoice(t,id,'refuse','accept'));
    const date=m.application.dueWeek;while(sim.state.week<date-1)ok(sim.advance());
    assert.equal(c.EarthCareers.view(sim.state,s,id).supplyLane.status,'staffed');
    const actual=report();assert.equal(actual.food,baseFood);assert.equal(actual.funds,baseFunds);
    ok(sim.advance());const duty=c.EarthCareers.view(sim.state,s,id).supplyLane;assert.equal(duty.status,'vacant');assert.equal(duty.resource,trade?'funds':'food');
    assert.equal(c.EarthCareers.weeklyAdjustment(s,sim.state).funds,undefined,'no second generic handover subtraction');
    for(let i=0;i<5;i++){const r=report();assert.equal(r.food,baseFood);assert.equal(r.funds,baseFunds);ok(sim.advance());}
    licensed(t,id,'driver');ok(jobChoice(t,id,'driver','apply'));ok(sim.advance());ok(sim.advance());ok(jobChoice(t,id,'driver','accept'));
    while(sim.state.week<m.application.dueWeek-1)ok(sim.advance());
    const second=report();assert.equal(second.food,baseFood);assert.equal(second.funds,baseFunds);
    assert.equal(second.materials,2+(trade?0:2)-1,'leaving the intervening sanitation job has its own repair-team vacancy');
    ok(sim.advance());assert.equal(c.EarthCareers.view(sim.state,s,id).supplyLane.status,'vacant');
    licensed(t,id,'courier');ok(jobChoice(t,id,'courier','apply'));ok(sim.advance());ok(sim.advance());ok(jobChoice(t,id,'courier','accept'));
    while(m.application)ok(sim.advance());
    assert.equal(c.EarthCareers.view(sim.state,s,id).supplyLane.status,'staffed');
    const check=copy(t.sim.state);assert(c.CommonEarthSim.readSave(JSON.stringify(check)));sim.destroy();
  }
});
test('a named handover colleague supplies the original resource through the two agreed weeks; a demolished corridor pays nobody',()=>{
  const t=district(['autonomy','local-projects']),{c,sim}=t,s=sim.active(),id='carrier-0-1';lane(s,0,1);s.population=22;s.specialty='materials';
  ok(switchTo(t,id));const m=licensed(t,id);ok(jobChoice(t,id,'refuse','apply'));ok(sim.advance());ok(sim.advance());ok(jobChoice(t,id,'refuse','accept'));
  const offer=c.EarthCareers.view(sim.state,s,id,'refuse',{speakerId:id}).choices.find(x=>x.id==='handover');assert(offer?.coverId);ok(jobChoice(t,id,'refuse','handover'));
  while(m.application)ok(sim.advance());
  const laneModel=()=>c.EarthCareers.view(sim.state,s,id).supplyLane;
  assert.equal(laneModel().status,'covered');assert.equal(laneModel().coverId,offer.coverId);assert.match(laneModel().description,new RegExp(offer.coverName));
  assert.equal(sim.forecastNext().sites[0].production.food,3-Math.ceil(s.population/5)+3+1);
  ok(sim.advance());assert.equal(laneModel().status,'covered');assert.equal(sim.forecastNext().sites[0].production.food,3-Math.ceil(s.population/5)+3);
  ok(sim.advance());assert.equal(laneModel().status,'vacant');
  s.buildings.pop();assert.equal(laneModel(),null);assert.equal(c.EarthCareers.coverage(s,sim.state).filter(g=>g.laneId).length,0);
  const plot=sim.previewBuild('garden',1);assert.match(plot.text,/needs a porter/);assert.equal(plot.delta.food,3);sim.destroy();
});
test('autonomous cover supplies exactly one lane unit per named weekly volunteer without manufacturing extra career production',()=>{
  const t=district(['local-projects']),{sim,c}=t,s=sim.active(),id='carrier-0-1';lane(s,0,1);s.population=22;s.specialty='materials';s.food=s.funds=s.materials=65;
  const m=licensed(t,id);m.jobId='refuse';m.joinedWeek=1;
  let covered=false;
  for(let i=0;i<9&&!covered;i++){
    const preview=sim.forecastNext().sites[0];ok(sim.advance());assert.equal(s.food,preview.closing.food);
    const duty=c.EarthCareers.supplyLane(s,sim.state,id);
    if(duty.status!=='covered')continue;
    const volunteers=Object.entries(s.autonomy.people).filter(([,r])=>r.history[0]?.week===sim.state.week&&r.history[0].laneId===id);
    assert.equal(volunteers.length,1);assert.equal(volunteers[0][0],duty.coverId);
    assert.equal(duty.coverName,c.EarthPersonas.profile(s,duty.coverId).name);
    assert.equal(s.autonomy.effects.food,undefined);assert.equal(preview.production.food,3-Math.ceil(s.population/5)+3+1);
    const changed=copy(sim.state),site=changed.sites[0];delete site.autonomy.people[duty.coverId].history[0].laneId;
    assert.equal(c.EarthCareers.supplyLane(site,changed,id).status,'vacant');
    assert(c.CommonEarthSim.readSave(JSON.stringify(sim.state)));covered=true;
  }
  assert(covered,'an available neighbour took the actual marginal supply round');sim.destroy();
});
