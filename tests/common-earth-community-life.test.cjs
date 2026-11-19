'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
function fixture(snapshot,location){
  let clock=100000;
  class GameDate extends Date{static now(){return clock;}}
  const context=vm.createContext({Date:GameDate,structuredClone,console});context.window=context;
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const m of html.matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,m[1]+'.js'),'utf8'),context,{filename:m[1]+'.js'});
    if(m[1]==='simulation')break;
  }
  const sim=context.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found(location||{name:'Melbourne',region:'Victoria',lat:-37.8181,lon:144.9731,water:false}).ok);
  const life=context.EarthCommunityLife,anchor=life.anchor(sim.state),home=sim.active();
  const doAction=(action,target,standingAt)=>{
    const site=sim.active(),actor=context.EarthAgency.actorId(site);
    return sim.communityLife({site:site.id,actor,week:sim.state.week,action,target},{siteId:site.id,actor,mode:'walk',target:standingAt,x:6,y:6,tx:6,ty:6});
  };
  const visit=id=>{
    const go=doAction('depart',id,'market');assert.ok(go.ok,go.message);
    assert.equal(doAction('arrive',id).ok,false);clock+=6500;
    const end=doAction('arrive',id);assert.ok(end.arrived,end.message);
  };
  const saved=()=>{const snap=JSON.stringify(sim.state);assert.ok(context.CommonEarthSim.readSave(snap),'Save must reopen at week '+sim.state.week);return snap;};
  return {sim,life,anchor,home,context,doAction,visit,saved,wait:ms=>{clock+=ms;}};
}
test('a nearby crossing preserves one original character and its host retains authority',()=>{
  const {sim,life,anchor,home,context,visit,doAction,saved}=fixture();
  const n=life.neighbours(sim.state,home)[0];assert.ok(n.distance>0&&n.distance<8);
  assert.equal(doAction('depart',n.id,'home').ok,false);
  visit(n.id);const there=sim.active();assert.equal(there.name,n.name);assert.equal(life.anchor(sim.state).homeId,home.id);
  assert.equal(context.EarthPersonas.profile(there,'steward').name,anchor.name);assert.equal(life.present(home,'steward'),false);
  assert.equal(sim.act('work:salvage').ok,false);assert.equal(sim.manageSite(home.id,'restart').ok,false);
  assert.equal(sim.changeActor(there.residents[0].id,{siteId:there.id,actor:'steward',mode:'walk',x:1,y:1}).ok,false);
  assert.equal(sim.actions('build').every(a=>!a.available),true);
  assert.equal(doAction('apply',null,there.residents[2].id).ok,false);
  saved();visit(home.id);assert.equal(life.present(home,'steward'),true);assert.ok(sim.act('work:salvage').ok);saved();
});
test('the host assesses the personal introduction, labour trial, elapsed time and spare capacity',()=>{
  const {sim,life,anchor,home,context,visit,doAction,saved}=fixture();
  visit(life.neighbours(sim.state,home)[0].id);const target=sim.active(),host=target.residents[2].id;
  assert.equal(doAction('meet',null,'market').ok,false);
  assert.ok(doAction('meet',null,host).ok);assert.ok(doAction('help',null,'market').ok);assert.equal(doAction('help',null,'market').ok,false);
  assert.equal(doAction('apply',null,host).ok,false);
  sim.advance();if(life.view(sim.state,target).admission.apprentice)assert.ok(doAction('help',null,'market').ok);
  const stocked=target.food;target.food=0;assert.equal(doAction('apply',null,host).ok,false);target.food=stocked;
  const join=doAction('apply',null,host);assert.ok(join.ok,join.message);
  assert.equal(life.anchor(sim.state).homeId,target.id);assert.equal(life.anchor(sim.state).originId,home.id);
  assert.equal(context.EarthPersonas.profile(target,'steward').name,anchor.name);
  assert.ok(sim.act('work:salvage').ok);saved();
  assert.ok(sim.visit(home.id).ok);assert.equal(sim.act('work:salvage').ok,false);saved();
});
test('a named visitor inspects a real street and can independently refuse to move',()=>{
  const {sim,life,home,context,doAction,saved}=fixture();
  sim.advance();sim.advance();const guest=life.view(sim.state,home).visitors[0];assert.ok(guest);
  const record=home.communityLife.people[guest.id],from=sim.state.communityLife.outposts.find(s=>s.id===record.visitFrom),slot=record.visitSlot;
  assert.equal(context.EarthPersonas.profile(home,guest.id).name,context.EarthPersonas.profile(from,slot).name);
  assert.equal(life.present(from,slot),false);assert.equal(life.residency(home,guest.id),'visitor');
  assert.equal(sim.changeActor(guest.id,{siteId:home.id,actor:'steward',mode:'walk',x:4,y:4,targetPose:{id:guest.id,mode:'walk',x:5,y:5}}).ok,false);
  assert.ok(doAction('welcome',guest.id,guest.id).ok);saved();
  home.food=0;home.trust=21;home.wellbeing=20;sim.advance();
  assert.equal(life.residency(home,guest.id),'away');assert.equal(life.present(from,slot),true);saved();
});
test('named volunteers with complementary capacities travel to a newly founded community',()=>{
  const {sim,life,context,home,anchor,saved}=fixture(),crew=life.volunteers(home);
  assert.equal(crew.length,2);const startCount=home.population;
  const result=sim.found({name:'Second Haven',lat:-34.15,lon:146.67,water:false});assert.ok(result.ok,result.message);
  const newSite=sim.active();assert.equal(life.anchor(sim.state).homeId,newSite.id);assert.equal(home.population,startCount-3);
  assert.ok(crew.every(v=>!life.present(home,v.id)));
  const names=Object.values(newSite.communityLife.people).map(v=>v.profile.name);
  assert.ok(crew.every(v=>names.includes(v.name)));assert.ok(names.includes(anchor.name));
  assert.ok(context.EarthPersonas.list(newSite).some(p=>p.name===crew[0].name));saved();
});
test('original duties continue in other perspectives; forecasts leave attendance untouched',()=>{
  const {sim,life,home,doAction,saved}=fixture(),p=home.residents[0],scene=id=>({siteId:home.id,actor:id,mode:'walk',x:5,y:4});
  assert.ok(sim.changeActor(p.id,scene('steward')).ok);assert.equal(doAction('round',null,'market').ok,false);
  sim.advance();sim.advance();sim.forecastNext();assert.equal(life.anchor(sim.state).reliability,0);
  sim.advance();assert.equal(life.anchor(sim.state).reliability,-1);assert.ok(sim.changeActor('steward',scene(p.id)).ok);
  assert.ok(doAction('round',null,'market').ok);assert.equal(doAction('round',null,'market').ok,false);
  sim.advance();sim.advance();sim.advance();assert.equal(life.anchor(sim.state).reliability,0);saved();
});
test('multi-week departures and independent new settlements survive save and reload',()=>{
  const {sim,life,home,saved}=fixture();
  for(let i=0;i<25;i++){
    home.trust=8;home.wellbeing=12;home.food=16;
    assert.equal(sim.forecastNext().week,sim.state.week+1);
    const result=sim.advance();assert.ok(result.ok,result.message);saved();
  }
  const circles=sim.state.communityLife.outposts.filter(s=>s.id.startsWith('circle-'));assert.ok(circles.length);
  for(const independent of circles){const roll=life.census(sim.state,independent);assert.equal(roll.represented,roll.total);assert.equal(roll.anonymous,0);}
  assert.ok(Object.keys(home.communityLife.away).some(id=>id.startsWith('walker-')));
  const reopened=fixture(saved());assert.equal(reopened.life.anchor(reopened.sim.state).name,life.anchor(sim.state).name);
});
test('a legacy 112-district world keeps its distant viewpoint, separate trained local steward and a direct route home',()=>{
  const original=fixture(),raw=JSON.parse(JSON.stringify(original.sim.state)),first=raw.sites[0];
  delete raw.communityLife;delete first.communityLife;
  const pattern=JSON.stringify(first);
  raw.sites=Array.from({length:112},(_,i)=>{
    const site=JSON.parse(pattern.replaceAll(first.id,'legacy-'+i));
    site.lat=-45+(i%70);site.lon=-121+Math.floor(i/70)*135;site.name='District '+i;return site;
  });
  const last=raw.sites.at(-1);raw.activeId=last.id;
  const previous=original.context.EarthPersonas.birthProfile(last,'steward');
  last.careers={steward:{revision:1,skills:{numeracy:previous.bounds.numeracy.max},qualifications:{},portfolios:{},references:{},history:[{week:1,text:'Completed a local mathematics session.'}]}};
  const upgraded=fixture(JSON.stringify(raw)),state=upgraded.sim.state;
  assert.equal(upgraded.sim.active().id,last.id);assert.equal(state.sites.length,112);
  assert.equal(upgraded.life.anchor(state).homeId,raw.sites[0].id);
  const locals=upgraded.context.EarthPersonas.list(upgraded.sim.active());
  const previousSteward=locals.find(p=>p.id!=='steward'&&p.name===previous.name);
  assert.ok(previousSteward);assert.equal(upgraded.sim.active().careers[previousSteward.id].skills.numeracy,previous.bounds.numeracy.max);
  assert.equal(upgraded.life.residency(upgraded.sim.active(),'steward'),'visitor');
  const reachable=upgraded.life.neighbours(state,upgraded.sim.active());
  assert.ok(reachable.some(p=>p.home&&p.distance>70));assert.ok(reachable.some(p=>p.distance<7));
  assert.ok(reachable.every(p=>p.home||p.distance<=70));upgraded.saved();
});
test('the playable crossing stops at three real landmarks, takes a chosen fork, and resumes a paused save',()=>{
  const {sim,life,home,doAction,wait,saved}=fixture(),n=life.neighbours(sim.state,home)[0];
  assert.ok(doAction('walkTrail',n.id,'market').ok);wait(7000);
  let trip=sim.state.communityLife.journey;assert.equal(life.routeProgress(trip),.23);
  assert.equal(doAction('arrive',n.id).ok,false);assert.ok(doAction('routeChoice','inspect').ok);
  assert.deepEqual(Array.from(trip.seen),[0]);const paused=fixture(saved());paused.wait(100000);
  assert.equal(paused.life.routeProgress(paused.sim.state.communityLife.journey),.23);
  assert.ok(doAction('routeChoice','work').ok);wait(7000);
  assert.equal(life.trail(sim.state,trip).landmarks[1].label,'Tool yard');assert.equal(life.routeProgress(trip),.51);
  assert.ok(doAction('routeChoice','inspect').ok);assert.ok(doAction('routeChoice','2').ok);wait(7000);
  assert.equal(life.routeProgress(trip),.78);assert.ok(doAction('routeChoice','inspect').ok);
  assert.ok(doAction('routeChoice','direct').ok);wait(7000);assert.ok(doAction('arrive',n.id).ok);
  assert.equal(sim.active().communityLife.pathVisits.seen,3);saved();
});
test('a signer can physically honour an old promise after relocating with a parcel packed at the new home',()=>{
  const {sim,home,doAction,visit,saved}=fixture(),recipient=home.residents[1];
  assert.ok(sim.act('listen:'+recipient.id).ok);assert.ok(sim.act('promise:'+recipient.id).ok);
  assert.ok(sim.found({name:'Another home',lat:-35.2,lon:142.9,water:false}).ok);
  const newHome=sim.active();
  assert.ok(sim.act('work:salvage').ok);const before=newHome.materials;
  assert.ok(doAction('pack',recipient.id,'market').ok);
  assert.equal(newHome.materials,before-2);assert.equal(sim.state.communityLife.parcel.to,home.id);
  assert.equal(doAction('pack',recipient.id,'market').ok,false);saved();
  visit(home.id);assert.equal(doAction('deliver',recipient.id,'market').ok,false);
  const delivered=doAction('deliver',recipient.id,recipient.id);assert.ok(delivered.ok,delivered.message);
  assert.equal(recipient.promise,null);assert.equal(home.stats.kept,1);assert.equal(sim.state.communityLife.parcel,undefined);
  assert.equal(sim.act('work:salvage').ok,false);saved();
});
test('core delegates, the driver and an active supply-lane worker may choose to inspect; their original jobs are unavailable while away',()=>{
  for(const role of ['grower','repairer','convenor','driver','porter']){
    const {sim,life,home,context,doAction,saved}=fixture();home.trust=24;
    home.buildings=[{id:'g',kind:'garden',plot:0,name:'Garden'},{id:'w',kind:'workshop',plot:1,name:'Workshop'}];
    const link=context.CommonEarthSim.productiveLinks(home)[0];assert.ok(link);
    const id=role==='driver'?'driver':role==='porter'?'carrier-'+link.from+'-'+link.to:home.residents[['grower','repairer','convenor'].indexOf(role)].id;
    const offered=life.movingOptions(sim.state,home).find(p=>p.id===id);assert.ok(offered?.eligible,role+' · '+offered?.reason);
    assert.ok(doAction('suggestVisit',id,id).ok);
    assert.ok(life.travelIntent(home,id));assert.equal(life.present(home,id),true);saved();
    sim.advance();assert.equal(life.present(home,id),false,role);
    const destination=sim.state.communityLife.outposts.find(site=>Object.values(site.communityLife.people).some(g=>g.visitFrom===home.id&&g.visitSlot===id));
    assert.ok(destination,role+' visitor has a destination');
    if(role==='convenor')assert.notEqual(life.hostFor(home).id,id);
    if(role==='driver')assert.equal(sim.regularTruckView().available,false);
    if(home.residents.some(p=>p.id===id)){
      assert.equal(sim.act('listen:'+id).ok,false);assert.equal(sim.beginShift(id).ok,false);
      assert.equal(sim.setWorkPreference(id,'food').ok,false);
      assert.equal(context.EarthConstruction.workerRole(home,sim.state,id).role,'Away from the district');
    }
    saved();sim.advance();saved();
  }
});
test('a specific active errand and a core promise can defer a departure without changing either participant',()=>{
  const {sim,life,home,doAction}=fixture(),p=home.residents[1];
  sim.act('listen:'+p.id);sim.act('promise:'+p.id);
  const promised=life.movingOptions(sim.state,home).find(x=>x.id===p.id);
  assert.equal(promised.eligible,false);assert.match(promised.reason,/promis.*week/i);
  assert.equal(doAction('suggestVisit',p.id,p.id).ok,false);assert.equal(life.present(home,p.id),true);
  (home.agency||={actor:'steward',meals:[]}).arrangements={serial:1,rows:[{id:1,status:'agreed',actorId:'walker-2',requesterId:'walker-1',contactId:'walker-0',dueWeek:3,workWeek:2}]};
  const errand=life.movingOptions(sim.state,home).find(x=>x.id==='walker-2');
  assert.equal(errand.eligible,false);assert.match(errand.reason,/errand due in week 3/);
});
test('a group proposal reaches every household; members inspect on their own dates and can refuse the destination',()=>{
  const {sim,life,home,visit,doAction,saved}=fixture();home.trust=24;
  const peer=life.neighbours(sim.state,home)[0];visit(peer.id);const dest=sim.active(),host=life.hostFor(dest).id;
  assert.ok(doAction('meet',null,host).ok);assert.ok(doAction('help',null,'market').ok);sim.advance();
  if(life.view(sim.state,dest).admission.apprentice)assert.ok(doAction('help',null,'market').ok);
  const answers=life.householdOffer(sim.state,home,dest);
  assert.ok(answers.length>2);assert.ok(answers.filter(a=>a.willInspect).length>2);
  const before=home.population,result=doAction('moveGroup',null,host);assert.ok(result.ok,result.message);
  assert.equal(home.population,before-1);assert.equal(sim.state.communityLife.cohorts[0].pending.length,answers.filter(a=>a.willInspect).length);saved();
  sim.advance();const arrivals=Object.values(dest.communityLife.people).filter(g=>g.status==='visitor'&&g.visitFrom===home.id);
  assert.ok(arrivals.length>0&&arrivals.length<=2);
  const beforeDecline=dest.population;dest.trust=20;sim.advance();assert.ok(dest.population<=beforeDecline);
  saved();dest.trust=60;dest.food=24;
  for(let i=0;i<8;i++){sim.advance();saved();}
  assert.equal(sim.state.communityLife.cohorts.length,0);
});
test('when a founding delegate moves, a willing local can complete a two-week admissions handover',()=>{
  const {sim,life,home,doAction,saved}=fixture();home.trust=24;
  const leaving=home.residents[2].id;assert.ok(doAction('suggestVisit',leaving,leaving).ok);sim.advance();
  const current=life.hostFor(home);assert.notEqual(current.id,leaving);
  const to=sim.state.communityLife.outposts.find(s=>Object.values(s.communityLife.people).some(p=>p.visitSlot===leaving));to.food=20;to.trust=90;to.wellbeing=90;
  sim.advance();const training=home.communityLife.deputyTraining;assert.ok(training);assert.equal(training.ready,sim.state.week+2);
  assert.equal(life.wasDelegate(home,training.id),false);sim.advance();saved();sim.advance();saved();
  assert.equal(life.wasDelegate(home,training.id),true);
});

test('a trusted pantry deputy finishes the agreed round at the original exchange after the founder changes home',()=>{
  const {sim,home,life,doAction,saved}=fixture(),helper=home.residents[2];
  helper.heard=true;helper.bond=3;assert.ok(doAction('cover',helper.id,helper.id).ok);
  assert.match(life.travelIntent(home,helper.id).goal,/pantry/i);
  assert.equal(life.movingOptions(sim.state,home).find(p=>p.id===helper.id).eligible,false);
  assert.ok(sim.found({name:'The sister district',lat:-35.21,lon:142.92,water:false}).ok);
  const target=sim.active(),a=life.anchor(sim.state);
  assert.equal(a.dutySiteId,home.id);assert.equal(a.homeId,target.id);assert.equal(a.coverName,helper.name);
  assert.equal(doAction('round',null,'market').ok,false);saved();
  for(let i=0;i<3;i++){sim.advance();saved();}
  const after=life.anchor(sim.state);assert.equal(after.dutySiteId,target.id);assert.equal(after.reliability,1);
  assert.equal(after.coveredBy,null);assert.equal(life.travelIntent(home,helper.id),null);
  assert.ok(home.communityLife.log.some(n=>n.text.includes(helper.name)&&n.text.includes('covered')));
});
test('unvisited independent districts occupy their surveyed land and a visitor must go home before sponsoring',()=>{
  const {sim,home,life,visit}=fixture(),neighbour=sim.state.communityLife.outposts[0];
  assert.equal(sim.foundingOffer(neighbour).available,false);
  visit(neighbour.id);const offer=sim.sponsorshipOffer(home.id);
  assert.equal(offer.available,false);assert.match(offer.reason,/Return to/);
  assert.equal(sim.foundingOffer({name:'Hill',lat:-35.21,lon:142.92},home.id).available,false);
});

test('a local restart keeps the census, visitors, trained delegates and former members in their own homes',()=>{
  const {sim,home,life,context,doAction,saved}=fixture();
  home.trust=24;const id=home.residents[2].id;
  assert.ok(doAction('suggestVisit',id,id).ok);sim.advance();
  const destination=sim.state.communityLife.outposts.find(s=>Object.values(s.communityLife.people).some(p=>p.visitSlot===id));
  destination.trust=90;destination.food=20;destination.wellbeing=90;sim.advance();
  const emigrant=Object.entries(destination.communityLife.people).find(([,p])=>p.originSlot===id);
  assert.ok(emigrant);assert.equal(emigrant[1].status,'member');
  const population=home.population,visitors=life.view(sim.state,home).visitors.map(p=>p.id);
  assert.equal(sim.manageSite(home.id,'delete').ok,false);
  assert.ok(sim.manageSite(home.id,'restart').ok);
  const fresh=sim.active();assert.equal(fresh.population,population);
  assert.equal(life.present(fresh,id),false);assert.ok(!context.EarthPersonas.list(fresh).some(p=>p.id===id));
  assert.ok(visitors.every(slot=>life.residency(fresh,slot)==='visitor'));
  sim.advance();saved();
  const there=sim.state.communityLife.outposts.find(s=>s.id===destination.id);
  assert.equal(life.residency(there,emigrant[0]),'member');
});

test('cold, dry and freshwater regional work is drawn from the local habitat',()=>{
  for(const [location,match] of [
    [{name:'Inland plateau',lat:25,lon:15,water:false,coastal:false},/pulse|earthen/],
    [{name:'Polar station',lat:74,lon:90,water:false,coastal:false},/mushroom|shelter/],
    [{name:'Freshwater Lake',lat:45,lon:-87,water:true},/freshwater|floating/]
  ]){
    const {home,life,sim,saved}=fixture(undefined,location);
    const neighbours=life.neighbours(sim.state,home);
    assert.equal(neighbours.length,3);assert.ok(neighbours.every(n=>match.test(n.need+' '+n.lifestyle)));
    const residents=life.movingOptions(sim.state,home);assert.ok(residents.some(p=>p.place));saved();
  }
});
test('a real employer vacancy recognises portable qualifications without handing out its job',()=>{
  const {sim,home,life,context,visit,saved}=fixture(),target=sim.state.communityLife.outposts[0];
  const person=context.EarthPersonas.profile(home,'steward');
  const profession=context.EarthCareers.catalog.find(j=>j.requiredSkill<=person.aptitudes[j.skill]&&j.secondMinimum<=person.aptitudes[j.secondary]);
  assert.ok(profession);
  const colleague=context.EarthPersonas.profile(target,target.residents[1].id);
  assert.ok(context.EarthEmployers.open(sim.state,target,colleague,profession,true));
  home.careers||={};home.careers.steward={revision:1,skills:{},qualifications:{[profession.id]:1},portfolios:{},references:{},history:[]};
  visit(target.id);
  const employer=life.view(sim.state,sim.active()).admission.employer;
  assert.equal(employer.role,profession.label);assert.equal(employer.former,colleague.name);
  assert.equal(context.EarthEmployers.recorded(sim.active(),profession.id),1);
  assert.equal(sim.active().careers?.steward?.jobId,undefined);saved();
});
test('the full fresh founding census has twelve distinct visible individuals and skill-specific native jobs',()=>{
  const {sim,home,context,life,saved}=fixture(),list=context.EarthPersonas.list(home),roll=life.census(sim.state,home);
  assert.equal(list.length,12);assert.equal(new Set(list.map(p=>p.identityKey)).size,12);
  assert.equal(roll.total,12);assert.equal(roll.represented,12);assert.equal(roll.commuters+roll.anonymous+roll.visitors,0);
  const nurse=list.find(p=>p.id==='carrier-8-7'),surveyor=list.find(p=>p.id==='carrier-8-5');
  assert.ok(nurse&&surveyor);assert.match(nurse.role,/nurse/i);assert.match(surveyor.role,/surveyor/i);
  assert.ok(nurse.aptitudes.care>=60);assert.ok(surveyor.aptitudes.numeracy>=60);
  assert.ok(context.EarthAgency.playables(home).some(p=>p.id===nurse.id));
  const canonical=saved(),restored=fixture(canonical);assert.equal(JSON.stringify(restored.sim.state),canonical);
  assert.equal(restored.life.census(restored.sim.state,restored.home).represented,12);
  assert.equal(restored.context.EarthPersonas.profile(restored.home,nurse.id).identityKey,nurse.identityKey);
  for(const peer of sim.state.communityLife.outposts){
    const r=life.census(sim.state,peer);assert.equal(r.total,r.represented);
    assert.equal(context.EarthPersonas.list(peer).length,r.here);
  }
  assert.ok(sim.found({name:'A small new town',lat:-36.3,lon:142.2,water:false}).ok);
  const newHome=sim.active(),v=life.census(sim.state,newHome);
  assert.equal(v.total,7);assert.equal(v.here,7);assert.equal(context.EarthPersonas.list(newHome).length,7);
  assert.equal(life.census(sim.state,home).represented,home.population);saved();
});
test('a regional shift worker enters the local household census only after taking up residence',()=>{
  const {sim,home,context,life,doAction,saved}=fixture();home.trust=24;
  home.buildings=[{id:'g',kind:'garden',plot:0,name:'Garden'},{id:'w',kind:'workshop',plot:1,name:'Workshop'}];
  const lane=context.CommonEarthSim.productiveLinks(home)[0],id='carrier-'+lane.from+'-'+lane.to;
  const before=life.census(sim.state,home),option=life.movingOptions(sim.state,home).find(p=>p.id===id);
  assert.ok(before.commuters>=1);assert.equal(before.represented,home.population);assert.ok(option?.eligible);
  assert.ok(doAction('suggestVisit',id,id).ok);sim.advance();
  const dest=sim.state.communityLife.outposts.find(s=>Object.values(s.communityLife.people).some(g=>g.visitSlot===id));
  assert.ok(dest);const oldCount=home.population,newCount=dest.population;dest.food=24;dest.wellbeing=90;dest.trust=90;
  assert.equal(life.census(sim.state,dest).visitors,1);sim.advance();
  assert.equal(home.population,oldCount);assert.equal(dest.population,newCount+1);
  assert.equal(life.census(sim.state,dest).here,dest.population);saved();
});
test('a large historical population is retained without manufacturing retroactive personal records',()=>{
  const {saved}=fixture(),old=JSON.parse(saved());
  delete old.communityLife;delete old.sites[0].communityLife;
  if(old.sites[0].agency)delete old.sites[0].agency.porters;
  old.sites[0].population=420;
  const restored=fixture(JSON.stringify(old)),{sim,home,life,context}=restored;
  const roll=life.census(sim.state,home);
  assert.equal(roll.total,420);assert.equal(roll.represented,10);assert.equal(roll.anonymous,410);
  assert.equal(context.EarthPersonas.list(home).length,10);
  assert.equal(Object.values(home.communityLife.people).some(p=>p.householdRole),false);restored.saved();
});
test('a second tab cannot act as the village council after the original crosses into an independent district',()=>{
  const {saved,context,wait}=fixture(),key='membership-tabs';
  const rows=new Map([[key,saved()]]),storage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
  const a=context.CommonEarthSim.create({storage,key,compressStorage:false});
  const b=context.CommonEarthSim.create({storage,key,compressStorage:false});
  const home=a.active(),dest=context.EarthCommunityLife.neighbours(a.state,home)[0],cmd=(action,target,pose)=>a.communityLife({
    site:a.active().id,actor:'steward',week:a.state.week,action,target
  },pose);
  assert.ok(cmd('depart',dest.id,{siteId:home.id,actor:'steward',mode:'walk',target:'market',x:5,y:4,tx:5,ty:4}).ok);
  wait(6500);assert.ok(cmd('arrive',dest.id).ok);
  const funds=a.active().materials,old=rows.get(key);
  assert.equal(b.act('work:salvage').ok,false);b.sync();assert.equal(b.active().id,dest.id);
  assert.equal(b.act('work:salvage').ok,false);assert.equal(b.active().materials,funds);assert.equal(rows.get(key),old);
  a.destroy();b.destroy();
});
test('an unseen district finances civic projects and retains its actual buildings and research on the first crossing',()=>{
  const {sim,home,life,visit,saved}=fixture(),outpost=sim.state.communityLife.outposts[0];
  for(let w=0;w<28;w++){
    assert.equal(sim.state.activeId,home.id);
    assert.ok(sim.advance().ok);
    assert.equal(sim.state.sites.length,1);
    assert.ok(!sim.state.lastWeekReview.sites.some(s=>s.id===outpost.id));
  }
  assert.ok(outpost.buildings.length>0);
  assert.ok(outpost.civicInitiatives.history.some(h=>['built','adopted'].includes(h.phase)));
  assert.ok(outpost.stats.resolved>0);
  const before=life.districtProfile(sim.state,outpost),buildings=JSON.stringify(outpost.buildings);
  saved();visit(outpost.id);
  assert.equal(JSON.stringify(sim.active().buildings),buildings);
  assert.deepEqual(Array.from(sim.active().tech),Array.from(before.research));
  assert.equal(sim.active().funds,before.funds);assert.equal(sim.active().food,before.food);
  assert.equal(sim.act('work:salvage').ok,false);saved();
});
test('a two-district consignment removes exactly the signed loads, then delivers the same goods once',()=>{
  const {sim,life}=fixture(),w=sim.state,[farm,yard]=w.communityLife.outposts;
  w.week=6;farm.food=100;farm.materials=1;yard.food=8;yard.materials=100;
  const accounts=()=>[farm.food,farm.materials,yard.food,yard.materials];
  const before=accounts(),households=farm.population+yard.population;
  life.tick(w);const left=farm.communityLife.freight,right=yard.communityLife.freight;
  assert.ok(left&&right);assert.ok(left.amount>=1);assert.equal(left.amount,right.amount);
  assert.equal(left.good,'food');assert.equal(right.good,'materials');
  assert.deepEqual(accounts(),[before[0]-left.amount,before[1],before[2],before[3]-right.amount]);
  assert.equal(life.travelIntent(farm,left.signer).kind,'freight');
  assert.equal(life.districtProfile(w,farm).trade.includes(yard.name),true);
  assert.equal(life.valid(w,()=>true),true);
  const damaged=structuredClone(w);damaged.communityLife.outposts[0].communityLife.freight.amount=9;
  assert.equal(life.valid(damaged,()=>true),false);
  w.week++;life.tick(w);
  assert.deepEqual(accounts(),[before[0]-left.amount,before[1]+right.amount,before[2]+left.amount,before[3]-right.amount]);
  assert.equal(farm.communityLife.freight,undefined);assert.equal(yard.communityLife.freight,undefined);
  const arrived=accounts();life.tick(w);assert.deepEqual(accounts(),arrived);
  assert.equal(farm.population+yard.population,households);
});
test('settling into a new household takes two observable shared sessions and records the real guide and local relationship',()=>{
  const {sim,life,home,context,doAction,saved}=fixture();
  let pairing,town;
  for(let i=0;i<40&&!pairing;i++){
    assert.ok(sim.advance().ok);
    const guest=life.view(sim.state,home).visitors[0];
    if(guest&&!guest.welcomed)doAction('welcome',guest.id,guest.id);
    for(const s of [...sim.state.sites,...sim.state.communityLife.outposts]){
      const pair=s.communityLife.settling?.find(p=>p.sessions===2&&p.last===sim.state.week);
      if(pair){pairing=pair;town=s;break;}
    }
  }
  assert.ok(pairing,'at least one newcomer and an established neighbour must both agree and attend');
  const {entrant,guide,first,last}=pairing;assert.ok(first<last);
  const host=town.autonomy.people[guide].history[0],newcomer=town.autonomy.people[entrant].history[0];
  assert.equal(host.householdSession,2);assert.equal(host.target,entrant);
  assert.equal(newcomer.householdSession,2);assert.equal(newcomer.target,guide);assert.equal(host.venue,newcomer.venue);
  assert.ok(context.EarthAutonomy.bond(town,guide,entrant,last)>=2);
  const model=life.districtProfile(sim.state,town);
  assert.ok(model.households.completed.some(p=>p.guide===guide&&p.entrant===entrant));
  assert.ok(model.origins.length>=2);
  assert.equal(model.occupations.reduce((n,row)=>n+row.count,0),model.census.here);
  const again=fixture(saved()),s=[...again.sim.state.sites,...again.sim.state.communityLife.outposts].find(s=>s.id===town.id);
  assert.equal(again.life.districtProfile(again.sim.state,s).households.completed[0].sessions,2);
});
test('two independent grievances open a hearing with a chance to repair and an individual decision about leaving',()=>{
  const {sim,context,life,home,doAction,saved}=fixture(),accused='walker-2',people=home.residents.slice(0,2);
  for(const p of people)context.EarthAutonomy.remember(home,sim.state.week,p.id,accused,'missed');
  assert.ok(sim.advance().ok);
  const hearing=home.communityLife.hearing;
  assert.ok(hearing);assert.equal(hearing.id,accused);assert.ok(hearing.witnesses.length>=2);
  assert.equal(doAction('hearResident',accused,'market').ok,false);
  assert.ok(doAction('hearResident',accused,accused).ok);
  assert.equal(doAction('hearResident',accused,accused).ok,false);
  const witness=hearing.witnesses[0];assert.ok(doAction('hearResident',witness.id,witness.id).ok);
  saved();
  // Both sides spoke. Keep the grievances current so the hearing remains contested.
  while(sim.state.week<hearing.opened+4){
    for(const p of people)context.EarthAutonomy.remember(home,sim.state.week,p.id,accused,'missed');
    assert.ok(sim.advance().ok);saved();
  }
  assert.equal(home.communityLife.lastHearing.decision,'asked');
  assert.equal(home.communityLife.lastHearing.id,accused);
  assert.match(home.communityLife.lastHearing.text,/asked .* to consider leaving/);
  const inspected=Object.values(home.communityLife.away).some(Boolean);
  assert.ok(inspected||life.present(home,accused));
  assert.equal(askedOutsideHome(),false);
  function askedOutsideHome(){return Object.values(sim.state.communityLife.outposts).some(s=>s.communityLife.people[accused]?.status==='member'&&s.communityLife.people[accused]?.since===sim.state.week);}
});
test('a legacy twelve-person household roll gains its unrepresented people without using commuters or adding residents',()=>{
  const {saved}=fixture(),old=JSON.parse(saved()),s=old.sites[0];
  delete old.communityLife;delete s.communityLife;if(s.agency)delete s.agency.porters;
  s.buildings=[{id:'garden',name:'Garden',kind:'garden',plot:0},{id:'bench',name:'Workshop',kind:'workshop',plot:1}];
  const upgraded=fixture(JSON.stringify(old)),{home,sim,context,life}=upgraded;
  const roll=life.census(sim.state,home);assert.equal(roll.total,12);assert.equal(roll.anonymous,0);assert.ok(roll.commuters>0);
  const actual=context.EarthPersonas.list(home),people=Object.entries(home.communityLife.people);
  assert.equal(actual.length,roll.active);assert.equal(new Set(actual.map(p=>p.identityKey)).size,actual.length);
  assert.equal(people.filter(([,g])=>g.householdRole).length,2);
  assert.equal(actual.filter(p=>life.commuting(home,p.id)).every(p=>!people.some(([id])=>id===p.id)),true);
  const canonical=upgraded.saved();assert.equal(fixture(canonical).saved(),canonical);
});
test('successive breakaway groups survey different buildable country and choose their livelihood from named founders',()=>{
  const {sim,life,home,saved}=fixture();
  let circles=[];
  for(let w=0;w<80&&circles.length<2;w++){
    home.trust=8;home.wellbeing=20;home.food=22;home.materials=30;home.funds=20;
    assert.ok(sim.advance().ok);
    circles=sim.state.communityLife.outposts.filter(s=>s.id.startsWith('circle-'+home.id+'-'));
  }
  assert.ok(circles.length>=2,'the overburdened origin supported two independent groups');
  const angular=x=>x*Math.PI/180;
  const distance=(a,b)=>12742*Math.asin(Math.sqrt(Math.sin(angular(a.lat-b.lat)/2)**2+Math.cos(angular(a.lat))*Math.cos(angular(b.lat))*Math.sin(angular(a.lon-b.lon)/2)**2));
  assert.ok(distance(circles[0],circles[1])>=10);
  for(const settled of circles){
    assert.ok(distance(home,settled)<=70);assert.ok(distance(home,settled)>=10);
    assert.match(settled.communityLife.district,/-circle$/);
    assert.ok(life.neighbours(sim.state,home).some(n=>n.id===settled.id&&n.need));
    assert.ok(settled.communityLife.log.some(l=>l.text.includes('joint undertaking'))||settled.buildings.length);
  }
  saved();
});
test('a waiting list or deferred application allows an inspection while actual notice periods still reserve the worker',()=>{
  const {sim,life,home}=fixture(),[chosen]=life.movingOptions(sim.state,home).filter(p=>p.eligible&&p.id.startsWith('walker-'));
  assert.ok(chosen);
  home.careers||={};
  const row=home.careers[chosen.id]||={revision:0,skills:{},qualifications:{},portfolios:{},references:{},history:[]};
  for(const phase of ['waiting','deferred','notice']){
    row.application={phase,targetId:'nurse',dueWeek:sim.state.week+2};
    const option=life.movingOptions(sim.state,home).find(p=>p.id===chosen.id);
    assert.equal(option.eligible,phase!=='notice',phase);
  }
});
test('a host that remembers two real grievances asks for a longer trial and hears the original applicant again',()=>{
  const {sim,life,context,home,visit,doAction,saved}=fixture();
  visit(life.neighbours(sim.state,home)[0].id);const site=sim.active(),host=life.hostFor(site);
  const witnesses=site.residents.slice(0,2),remember=()=>{for(const w of witnesses)context.EarthAutonomy.remember(site,sim.state.week,w.id,'steward','missed');};
  remember();
  let admission=life.view(sim.state,site).admission,condition=admission.checks.find(c=>c.label==='Rebuild local confidence');
  assert.ok(condition&&!condition.pass);assert.ok(witnesses.every(p=>condition.detail.includes(p.name)));
  assert.ok(doAction('meet',null,host.id).ok);assert.ok(doAction('help',null,'market').ok);
  sim.advance();remember();
  assert.equal(doAction('apply',null,host.id).ok,false);
  assert.ok(doAction('help',null,'market').ok);
  sim.advance();remember();admission=life.view(sim.state,site).admission;
  assert.ok(admission.needsTrial);assert.equal(admission.available,false);
  assert.ok(doAction('help',null,'market').ok);
  assert.equal(life.view(sim.state,site).admission.checks.find(c=>c.label==='Rebuild local confidence').pass,true);
  assert.ok(doAction('apply',null,host.id).ok);saved();
});
test('districts negotiate different load sizes when material reserves and food needs value cargo differently',()=>{
  const {sim,life}=fixture(),world=sim.state,[farm,yard]=world.communityLife.outposts;
  world.week=6;farm.food=20;farm.materials=12;yard.food=4;yard.materials=22;
  life.tick(world);const a=farm.communityLife.freight,b=yard.communityLife.freight;
  assert.ok(a&&b);assert.equal(a.amount,2);assert.equal(a.expected,3);assert.equal(b.good,'materials');assert.equal(b.amount,3);
  assert.equal(life.valid(world,()=>true),true);
  assert.equal(farm.food,18);assert.equal(yard.materials,19);
  world.week++;life.tick(world);assert.equal(yard.food,6);assert.equal(farm.materials,15);
});

function originalDesk(game,options={}){
  const {context,sim}=game;
  for(const name of ['interdependence','original-life','community-life-ui'])vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),context);
  const doc={createElement:tag=>new Element(tag),addEventListener(){},getElementById(){return null;}};
  class Element{
    constructor(tag){Object.assign(this,{tag,ownerDocument:doc,dataset:{},children:[],events:{},textContent:''});}
    get isConnected(){return this===host||!!this.parent?.isConnected;}
    append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
    replaceChildren(...nodes){this.children.forEach(n=>{n.parent=null;});this.children=[];this.append(...nodes);}
    addEventListener(type,fn){this.events[type]=fn;}
    all(){return [this,...this.children.flatMap(n=>n.all())];}
  }
  let stop=null,at='',review;
  const host=new Element('section'),other=new Element('section');other.hidden=true;
  const proof=()=>({actor:context.EarthAgency.actorId(sim.active()),siteId:sim.active().id,mode:'walk',x:4,y:5,tx:4,ty:5});
  const street={getState:proof,meeting(ref){const target=ref.residentId||ref.type;return at===target?{...proof(),target}:null;}};
  function go(ref,label,arrived){stop=()=>{at=ref.residentId||ref.type;arrived();};}
  const district=context.EarthCommunityLifeUI.mount(other,{sim,getStreet:()=>street,atVenue:go,meet:go,refresh:()=>{},notify:()=>{}});
  const routes=[];
  const ui=context.EarthOriginalLife.mount(host,{sim,playAs:id=>{review=sim.changeActor(id,proof);},pantry:district.pantry,
    towns:id=>routes.push(id),talk:id=>routes.push(id),observing:options.observing});
  return {ui,render:()=>ui.render(),button:key=>host.all().find(n=>n.dataset.streetCommand===key),
    click:key=>host.all().find(n=>n.dataset.streetCommand===key)?.events.click(),arrive:()=>stop(),review:()=>review,routes,
    content:()=>host.all().map(n=>n.textContent).filter(Boolean).join(' ')};
}
test('the original life desk reads the signed ledger and personal purse across perspectives, and keeps a busy handoff under review',()=>{
  const g=fixture(),{sim,home}=g,[resident,other]=home.residents;
  assert(sim.changeActor(resident.id,{siteId:home.id,actor:'steward',mode:'walk',x:6,y:8}).ok);
  other.promise={by:'steward',dueWeek:sim.state.week+1};resident.promise={by:resident.id,dueWeek:sim.state.week};
  home.purses={people:{steward:{balance:9},[resident.id]:{balance:41}}};
  const h=originalDesk(g),before=JSON.stringify(sim.state);
  h.render();assert.equal(JSON.stringify(sim.state),before);assert.match(h.content(),/Personal purse · 9 funds/);
  assert(h.content().includes('Playing as '+resident.name));assert(h.content().includes('Promise to '+other.name));assert(!h.content().includes('Promise to '+resident.name));
  assert.match(h.content(),/Due next week/);assert(!h.button('original-round'));assert(h.button('original-handoff'));
  delete home.purses;other.promise=resident.promise=null;
  assert(sim.beginShift(other.id).ok);h.render();
  const busy=JSON.stringify(sim.state);h.click('original-handoff');assert(h.review()?.finishQuote,h.review()?.message);
  assert.equal(JSON.stringify(sim.state),busy);
});
test('pantry actions require reaching the exchange or meeting the consenting helper and cannot run from a stale or observing desk',async()=>{
  const g=fixture(),p=g.home.residents[0];p.bond=2;p.heard=true;
  let observing=false;const h=originalDesk(g,{observing:()=>observing});
  h.render();const stale=h.button('original-cover');assert(stale);
  observing=true;stale.events.click();h.render();assert(!h.button('original-cover'));assert(!g.life.anchor(g.sim.state).coveredBy);
  observing=false;h.render();stale.events.click();const before=JSON.stringify(g.sim.state);
  h.click('original-cover');assert.equal(JSON.stringify(g.sim.state),before);
  h.arrive();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(g.life.anchor(g.sim.state).coveredBy,p.id);h.render();assert(!h.button('original-round'));assert(h.content().includes(p.name+' agreed'));
  const other=fixture(),d=originalDesk(other);d.render();d.click('original-round');assert(!other.life.anchor(other.sim.state).attended);
  d.arrive();await new Promise(resolve=>setImmediate(resolve));assert(other.life.anchor(other.sim.state).attended);
});
test('the original can return from a visiting perspective, with real transit home and no authority over foreign residents',()=>{
  const g=fixture(),{sim,life,home,visit}=g;
  visit(life.neighbours(sim.state,home)[0].id);const dest=sim.active(),local=dest.residents[0];
  // A restored guest scene may still hold a local perspective.
  dest.agency.actor=local.id;
  const h=originalDesk(g);h.render();assert(h.content().includes(g.anchor.name));assert(h.content().includes('Home in '+home.name));
  assert(!h.button('original-round'));assert(!h.button('original-rota-route'));
  h.click('original-handoff');assert(h.review()?.ok,h.review()?.message);assert.equal(dest.agency.actor,'steward');
  assert(!sim.changeActor(local.id,{siteId:dest.id,actor:'steward',mode:'walk',x:6,y:8}).ok);
  h.render();h.click('original-rota-route');assert.deepEqual(h.routes,[home.id]);assert.equal(sim.active().id,dest.id);
});
test('a missed pantry handover is shown separately from the next live deadline',()=>{
  const g=fixture(),h=originalDesk(g);
  for(let i=0;i<3;i++)assert(g.sim.advance().ok);
  h.render();assert.match(h.content(),/Latest missed commitment.*no handover/);assert.match(h.content(),/Due week 7/);
});

test('all three unseen town councils can finance each era and old regions acquire the third neighbour once',()=>{
  const original=fixture(),older=JSON.parse(original.saved());
  older.communityLife.outposts.pop();
  const {sim,home,saved}=fixture(JSON.stringify(older));
  const towns=sim.state.communityLife.outposts;
  assert.equal(towns.length,3);
  assert.equal(fixture(saved()).sim.state.communityLife.outposts.length,3);
  for(let i=0;i<40;i++)assert.ok(sim.advance().ok);
  assert.equal(sim.active().id,home.id);
  assert(towns.slice(0,3).every(t=>t.era==='Stewardship'));
  saved();
});
