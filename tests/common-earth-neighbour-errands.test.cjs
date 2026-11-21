'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'..','common-earth');
function setup(autonomous=false){
  const runtime=vm.createContext({});runtime.window=runtime;
  for(const name of ['personas','careers','provisions',...(autonomous?['social-memory','autonomy']:[]),'neighbour-errands','dialogue','agency','simulation']){
    vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
  }
  const sim=runtime.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19,water:true}).ok);
  const site=sim.active(),world=sim.state,agency=runtime.EarthAgency,dialogue=runtime.EarthDialogue;
  function talk(to,topic,extra={}){
    return sim.converse(to,topic,()=>({siteId:site.id,actor:agency.actorId(site),target:to,mode:'walk',x:10,y:10,tx:10.5,ty:10,...extra}));
  }
  function ask(owner){
    const topic=agency.topics(site,world,owner).find(t=>t.id.startsWith('errand:ask:'));
    assert(topic);assert(talk(owner,topic.id).changed);
    return site.agency.arrangements.rows[0];
  }
  function act(row,verb,target,extra){
    return talk(target||row.contactId,'errand:'+verb+':'+row.id,extra);
  }
  function switchTo(id){
    assert(sim.changeActor(id,()=>({siteId:site.id,actor:agency.actorId(site),mode:'walk',x:9,y:10,
      targetPose:{id,mode:'walk',x:10,y:10}})).ok);
  }
  function saved(){assert(runtime.CommonEarthSim.readSave(JSON.stringify(world)));}
  return {runtime,sim,site,world,agency,dialogue,talk,ask,act,switchTo,saved};
}

test('late supper weighs the household round and an existing promise against carrying the order in person',()=>{
  const g=setup(),{site,world,ask,act}=g,owner=site.residents[0],baseTrust=site.trust,baseWellbeing=site.wellbeing;
  site.food=6;owner.promise={dueWeek:2};
  const row=ask('walker-0');
  assert.equal(row.kind,'supper');assert.equal(row.actorId,'steward');
  assert.equal(new Set([row.actorId,row.requesterId,row.contactId]).size,3);
  assert.equal(act(row,'terms',row.contactId,{tx:15}).ok,false);
  const prior=JSON.stringify(world),terms=act(row,'terms');assert(terms.ok);
  assert.match(terms.message,/3 food for the household round/);assert.match(terms.message,new RegExp('promised to '+owner.name));
  assert.equal(JSON.stringify(world),prior);
  assert(!act(row,'goods').changed);assert.equal(row.status,'asked');
  assert(act(row,'time').changed);assert.equal(row.status,'agreed');
  assert.equal(act(row,'finish',row.contactId).ok,false);
  assert(act(row,'finish',row.requesterId).changed);assert.equal(site.food,6);
  assert.equal(site.trust,baseTrust);assert.equal(site.wellbeing,baseWellbeing+1);assert.equal(row.status,'kept');
  assert.equal(act(row,'finish',row.requesterId).ok,false);assert.match(g.talk(row.requesterId,'news').message,/collection round/);
  const [report]=g.dialogue.arrangements(site,world,'steward');assert.equal(report.nextId,null);assert.match(report.outcome,/collection round/);
  g.saved();
});

test('a named actor carries a promise between two households; changing bodies or reloading cannot discharge it',()=>{
  const g=setup(),{site,world,ask,act}=g,owner=site.residents[1],stock=site.materials;
  const one=ask(owner.id);assert.equal(one.kind,'bench');assert(act(one,'goods').changed);const week=world.week;g.saved();
  const other=Array.from(g.agency.playables(site)).find(p=>![one.actorId,one.contactId,one.requesterId].includes(p.id));
  g.switchTo(other.id);const state=JSON.stringify(world);
  assert.equal(act(one,'finish',one.requesterId).ok,false);assert.equal(JSON.stringify(world),state);
  const obligations=g.dialogue.arrangements(site,world,one.actorId);assert.equal(obligations[0].dueWeek,week+2);assert.equal(obligations[0].nextId,owner.id);
  g.switchTo(one.actorId);
  site.materials=0;assert(!act(one,'finish',one.requesterId).changed);assert.equal(one.status,'agreed');
  site.materials=stock;assert(act(one,'finish',one.requesterId).changed);assert.equal(site.materials,stock-1);assert.equal(owner.bond,1);
  assert.equal(one.finishedWeek,world.week);g.saved();
  const tampered=JSON.parse(JSON.stringify(world));
  tampered.sites[0].agency.arrangements.rows[0].contactId=one.actorId;
  assert.equal(g.runtime.CommonEarthSim.readSave(JSON.stringify(tampered)),null);
});

test('closing a rota penalises a missed promise once, leaves unanswered enquiries neutral and records who has to explain the gap',()=>{
  const g=setup(),{site,world,ask,act}=g,owner=site.residents[2];owner.bond=2;
  const oldTrust=site.trust,agreed=ask(owner.id);assert.equal(agreed.kind,'meeting');assert(act(agreed,'goods').changed);
  g.switchTo('walker-3');const started=ask('walker-1');
  assert.equal(g.dialogue.closeWeek(site,world).length,0);world.week=agreed.dueWeek+1;
  const events=g.dialogue.closeWeek(site,world);assert.equal(events.length,1);assert.match(events[0],new RegExp(owner.name));
  assert.equal(agreed.status,'missed');assert.equal(started.status,'withdrawn');assert.equal(site.trust,oldTrust-1);assert.equal(owner.bond,1);
  assert.equal(g.dialogue.closeWeek(site,world).length,0);g.switchTo('steward');assert.match(g.talk(owner.id,'news').message,/didn’t come back/);g.saved();
});

test('two signed errands can offer time when the same supplies are already promised',()=>{
  const g=setup(),{site,world,ask,act}=g;
  site.food=5;
  const a=ask('walker-0');assert(act(a,'goods').changed);
  g.switchTo('walker-3');const b=ask(site.residents[0].id);assert.equal(b.kind,'supper');
  assert.match(act(b,'terms').message,/2 food already offered to other neighbours/);
  assert.equal(act(b,'goods').changed,undefined);assert(act(b,'time').changed);
  g.switchTo('steward');assert(act(a,'time').changed);assert(act(a,'finish',a.requesterId).changed);
  assert.equal(site.food,5);g.saved();
});

test('visitors and people away can discuss their own situation without acquiring spending authority or signing referrals',()=>{
  const g=setup(),visitor='walker-0',gone='walker-1';
  g.runtime.EarthCommunityLife={present:(_site,id)=>id!==gone,residency:(_site,id)=>id===visitor?'visitor':id===gone?'away':'member'};
  const list=g.agency.topics(g.site,g.world,visitor);assert(list.some(t=>t.id==='visit-fit'));assert(list.every(t=>!t.id.startsWith('errand:')&&!t.id.startsWith('intro:')));
  assert.match(g.talk(visitor,'news').message,/finding out where/);assert(!g.talk(gone,'news').ok);
  const before=JSON.stringify(g.world);assert.equal(g.talk(visitor,'errand:ask:supper').ok,false);assert.equal(JSON.stringify(g.world),before);
});

test('a missed pledge changes willingness to lend supplies and keeping the next time pledge earns that trust back',()=>{
  const g=setup(),owner=g.site.residents[1],first=g.ask(owner.id);assert(g.act(first,'goods').changed);
  g.world.week=first.dueWeek+1;g.dialogue.closeWeek(g.site,g.world);
  const second=g.ask(owner.id);assert.match(g.act(second,'terms').message,/give the time yourself/);
  assert(!g.act(second,'goods').changed);assert(g.act(second,'time').changed);
  assert(g.act(second,'finish',owner.id).changed);assert(g.dialogue.familiar(g.site,'steward',owner.id,g.world.week));
  g.world.week++;assert(!g.agency.topics(g.site,g.world,owner.id).some(t=>t.id.startsWith('errand:ask:')));
  g.world.week++;const third=g.ask(owner.id);assert.equal(third.variant,'followup');assert.match(g.dialogue.arrangements(g.site,g.world,'steward')[0].title,/sideboard/);assert(g.act(third,'goods').changed);g.saved();
});

test('a distant contact can be replaced, and a requester who moves away releases a promised handover',()=>{
  const g=setup(),owner=g.site.residents[1],row=g.ask(owner.id),former=row.contactId,absent=new Set([former]);
  g.runtime.EarthCommunityLife={present:(_s,id)=>!absent.has(id),residency:(_s,id)=>absent.has(id)?'away':'member'};
  assert(g.act(row,'redirect',owner.id).changed);assert.notEqual(row.contactId,former);assert(g.act(row,'goods').changed);
  absent.add(owner.id);const before=g.site.trust;g.world.week=row.dueWeek+1;
  const log=g.dialogue.closeWeek(g.site,g.world);assert.match(log[0],/released/);assert.equal(g.site.trust,before);
  assert.equal(row.status,'withdrawn');assert.equal(row.releaseCause,'requesterAway');assert.equal(g.dialogue.arrangements(g.site,g.world,'steward')[0].method,'goods');
  assert(g.runtime.EarthNeighbourErrands.valid(g.site,g.world.week));
});

test('a released signer schedules their own paid visit with its requester, then completes at the real venue or the end of that week',()=>{
  function start(){
    const g=setup(true),{sim,site,world}=g,worker='walker-1',owner='walker-0';
    g.switchTo(worker);const row=g.ask(owner);assert(g.act(row,'goods').changed);g.switchTo('steward');
    const before=JSON.stringify(world);
    const forecast=sim.forecastNext();assert.equal(JSON.stringify(world),before);assert(forecast.sites[0].highlights.some(t=>t.includes('set out')));
    assert(sim.advance().ok);const [quote]=g.runtime.EarthNeighbourErrands.working(site,world.week);assert(quote);
    assert.equal(quote.actorId,worker);assert.equal(quote.targetId,owner);assert.equal(row.status,'agreed');assert.equal(row.workWeek,world.week);
    const a=site.autonomy.people[worker].history[0],b=site.autonomy.people[owner].history[0];
    assert(a.errand&&b.errand&&a.venue===b.venue);assert.equal(a.target,owner);assert.equal(b.target,worker);g.saved();
    const near={...quote,mode:'walk',visible:true,x:10,y:10,tx:10.5,ty:10};
    return {g,row,quote,near,paid:site.food};
  }
  const seen=start(),{g,row,quote,near}=seen;
  assert(!g.sim.neighbourAppointment(quote,()=>({...near,tx:13})).ok);
  assert(!g.sim.neighbourAppointment(quote,()=>({...near,venue:'home'})).ok);
  assert(!g.sim.neighbourAppointment(quote,()=>({...near,visible:false})).ok);
  assert(g.sim.neighbourAppointment(quote,()=>near).ok);assert.equal(row.status,'kept');
  assert.equal(g.site.food,seen.paid);assert(!g.sim.neighbourAppointment(quote,()=>near).ok);
  assert.equal(g.runtime.EarthNeighbourErrands.working(g.site,g.world.week).length,0);g.saved();
  const resumed=start();resumed.g.switchTo(resumed.row.actorId);
  assert(resumed.g.act(resumed.row,'finish',resumed.row.requesterId).changed);assert.equal(resumed.g.site.food,resumed.paid);
  assert.equal(resumed.g.runtime.EarthNeighbourErrands.working(resumed.g.site,resumed.g.world.week).length,0);resumed.g.saved();
  const off=start(),before=off.g.site.food,events=off.g.dialogue.closeWeek(off.g.site,{...off.g.world,week:off.g.world.week+1});
  assert(events.some(t=>t.includes('late table')));assert.equal(off.row.status,'kept');assert.equal(off.g.site.food,before);
  assert.equal(off.g.dialogue.closeWeek(off.g.site,{...off.g.world,week:off.g.world.week+1}).length,0);off.g.saved();
});
test('the original signer keeps their agreed work personally while the player experiences another resident',()=>{
  const g=setup(true),row=g.ask('walker-0');
  assert(g.act(row,'goods').changed);g.switchTo('walker-1');assert(g.sim.advance().ok);
  assert.equal(row.status,'agreed');assert.equal(row.workWeek,g.world.week);
  assert.equal(g.runtime.EarthNeighbourErrands.working(g.site,g.world.week)[0].actorId,'steward');
  g.saved();assert(g.sim.advance().ok);assert.equal(row.status,'kept');g.saved();
});

test('custodians respond differently to a real spoiled crop, and the extra reserve expires after a fresh round',()=>{
  const g=setup(),row=g.ask('walker-0'),keeper=g.runtime.EarthPersonas.birthProfile(g.site,row.contactId);
  g.site.food=Math.ceil(g.site.population/5)+2;
  g.site.resourceLedger={lastLoss:{week:g.world.week,bins:{roots:1},shelf:{}}};
  let traits={...keeper.traits,patience:84,adaptability:34};
  g.runtime.EarthCommunityLife={profile:(_site,id)=>id===keeper.id?{...keeper,traits}:null};
  const before=JSON.stringify(g.world);assert.match(g.act(row,'terms').message,/root vegetables that spoiled in week 1/);
  assert(!g.act(row,'goods').changed);assert.equal(JSON.stringify(g.world),before);
  traits={...traits,adaptability:88};assert.doesNotMatch(g.act(row,'terms').message,/holding back/);
  assert(g.act(row,'goods').changed);
  traits={...traits,adaptability:34};g.world.week+=2;
  assert(g.act(row,'finish',row.requesterId).changed);assert.equal(g.site.food,Math.ceil(g.site.population/5));
});

test('only the named requester can renegotiate a signed date, and hearing a refusal leaves the original obligation in place',()=>{
  function arrange(traits,scarce=false){
    const g=setup(),owner='walker-0',p=g.runtime.EarthPersonas.birthProfile(g.site,owner);
    g.runtime.EarthCommunityLife={profile:(_site,id)=>id===owner?{...p,traits:{...p.traits,...traits}}:null};
    const row=g.ask(owner);assert(g.act(row,'time').changed);const original=row.dueWeek;
    assert(!g.act(row,'later',owner).ok);g.world.week++;if(scarce)g.site.food=Math.ceil(g.site.population/5);
    assert(!g.act(row,'later',row.contactId).ok);const reply=g.act(row,'later',owner);
    assert(reply.ok&&reply.changed);assert(!g.act(row,'later',owner).ok);g.saved();
    return {g,row,original,reply};
  }
  const yes=arrange({patience:78,adaptability:80});assert.equal(yes.row.dueWeek,yes.original+1);
  assert.match(yes.g.dialogue.arrangements(yes.g.site,yes.g.world,'steward')[0].next,/moved the date from week 3 to week 4/);
  yes.g.world.week=yes.original+1;assert.equal(yes.g.dialogue.closeWeek(yes.g.site,yes.g.world).length,0);
  assert(yes.g.act(yes.row,'finish',yes.row.requesterId).changed);yes.g.saved();
  for(const no of [arrange({patience:32,adaptability:37}),arrange({patience:80,adaptability:86},true)]){
    assert.equal(no.row.dateDecision,'declined');assert.equal(no.row.dueWeek,no.original);
    no.g.world.week=no.original+1;no.g.dialogue.closeWeek(no.g.site,no.g.world);assert.equal(no.row.status,'missed');no.g.saved();
  }
});

test('the original receipt follows an ordinary non-original signer to the household, without spending before they meet or after somebody already delivered',()=>{
  function start(slot=0,worker='walker-1'){
    const g=setup(true),p=g.site.residents[slot];g.switchTo(worker);
    assert(g.sim.act('listen:'+p.id).ok);assert(g.sim.act('promise:'+p.id).ok);assert.equal(p.promise.by,worker);
    g.switchTo('steward');assert(g.sim.advance().ok);g.saved();
    const snapshot=JSON.stringify(g.world),future=g.sim.forecastNext();assert.equal(JSON.stringify(g.world),snapshot);
    assert(g.sim.advance().ok);assert.equal(p.promise.dueWeek,g.world.week);
    const q=g.runtime.EarthNeighbourErrands.working(g.site,g.world.week).find(row=>row.ordinary);
    assert(q,'due delivery not booked: '+JSON.stringify([g.site.autonomy.people[worker].history[0],g.site.autonomy.people[p.id].history[0]]));
    assert.equal(q.targetId,p.id);assert.equal(q.actorId,worker);assert(future.sites[0].highlights.some(t=>t.includes('set out')));
    g.saved();return {g,p,q,proof:{siteId:g.site.id,actorId:worker,targetId:p.id,visible:true,mode:'walk',x:4,y:4,tx:4.4,ty:4,venue:q.venue}};
  }
  const {g,p,q,proof}=start(),stock=g.site.food,kept=g.site.stats.kept,effort=g.world.effort;
  assert(!g.sim.neighbourAppointment(q,()=>({...proof,tx:8})).ok);
  assert(!g.sim.neighbourAppointment({...q,amount:q.amount+1},()=>proof).ok);
  assert.equal(g.site.food,stock);assert.equal(p.agreements?.length||0,0);
  assert(g.sim.neighbourAppointment(q,()=>proof).ok);assert.equal(g.site.food,stock-3);
  assert.equal(g.site.stats.kept,kept+1);assert.equal(g.world.effort,effort);assert.equal(p.promise,null);
  assert.equal(p.agreements[0].deliveredBy,q.actorId);assert.equal(p.agreements[0].by,q.actorId);assert.equal(p.agreements[0].week,g.world.week);
  assert(!g.sim.neighbourAppointment(q,()=>proof).ok);
  assert.equal(g.talk(p.id,'news').followContact,q.actorId);assert.match(g.talk(q.actorId,'news').message,/I brought/);g.saved();
  const changed=JSON.parse(JSON.stringify(start().g.world));delete changed.sites[0].autonomy.people[changed.sites[0].residents[0].id].history[0].ordinary;
  assert.equal(g.runtime.CommonEarthSim.readSave(JSON.stringify(changed)),null);
  const reserved=start(),home=reserved.g.site,actor=reserved.g.world;
  home.food=Math.ceil(home.population/5)+5;
  const pledged=reserved.g.ask('walker-0');assert(reserved.g.act(pledged,'goods').changed);
  home.food--;const pantry=home.food,effortAt=actor.effort;
  assert(!reserved.g.sim.neighbourAppointment(reserved.q,()=>reserved.proof).ok);assert.equal(home.food,pantry);
  assert.equal(actor.effort,effortAt);assert.equal(reserved.p.promise.by,reserved.q.actorId);
  assert(reserved.g.sim.advance().ok);assert.equal(reserved.p.agreements[0].status,'missed');reserved.g.saved();
  const controlled=start();controlled.g.switchTo(controlled.q.actorId);
  assert(!controlled.g.sim.neighbourAppointment(controlled.q,()=>controlled.proof).ok);
  assert(controlled.g.sim.advance().ok);assert.equal(controlled.p.agreements[0].status,'missed');controlled.g.saved();
  const revised=start();revised.g.switchTo(revised.q.actorId);
  assert(revised.g.sim.act('listen:'+revised.p.id).ok);const beforeRevision=revised.g.site.food;
  assert(revised.g.sim.act('revise:'+revised.p.id).ok);assert.equal(revised.g.site.food,beforeRevision-1);
  revised.g.switchTo('steward');assert(!revised.g.sim.neighbourAppointment(revised.q,()=>revised.proof).ok);
  assert(revised.g.sim.advance().ok);const later=revised.g.runtime.EarthNeighbourErrands.working(revised.g.site,revised.g.world.week).find(r=>r.ordinary);
  assert(later);assert.equal(later.amount,2);assert.notEqual(later.rowId,revised.q.rowId);const paidAt=revised.g.site.food;
  assert(revised.g.sim.neighbourAppointment(later,()=>revised.proof).ok);assert.equal(revised.g.site.food,paidAt-2);
  assert.equal(revised.p.agreements[0].due,later.week);revised.g.saved();
  const off=start(1);assert(off.g.sim.advance().ok);assert.equal(off.p.agreements[0].status,'kept');
  assert.equal(off.p.agreements[0].week,off.q.week);assert.equal(off.p.agreements[0].deliveredBy,off.q.actorId);off.g.saved();
  const manual=start(2);assert(manual.g.sim.act('fulfil:'+manual.p.id).ok);
  const funds=manual.g.site.funds;assert(!manual.g.sim.neighbourAppointment(manual.q,()=>manual.proof).ok);
  assert.equal(manual.g.site.funds,funds);assert.equal(manual.p.agreements[0].deliveredBy,'steward');manual.g.saved();
});

test('the original resident can deliver a signed promise when unplayed; unsigned promises and booked recipients still need help',()=>{
  for(const signer of ['steward',undefined,'walker-1']){
    const g=setup(true),r=g.site.residents[0];
    if(signer!=='steward')g.switchTo('walker-1');
    assert(g.sim.act('listen:'+r.id).ok);assert(g.sim.act('promise:'+r.id).ok);
    if(signer===undefined)delete r.promise.by;
    g.switchTo(signer==='steward'?'walker-2':'steward');
    if(signer==='walker-1')g.runtime.EarthCivicInitiatives={tick:()=>[],valid:()=>true,commitment:(_s,_w,id)=>id===r.id?{venue:'hall',reason:'I agreed to chair the hearing.'}:null};
    assert(g.sim.advance().ok);assert(g.sim.advance().ok);
    const assigned=g.runtime.EarthNeighbourErrands.working(g.site,g.world.week).some(q=>q.ordinary);
    assert.equal(assigned,signer==='steward');
    assert(g.sim.advance().ok);assert.equal(g.site.stats.missed,signer==='steward'?0:1);
    assert.equal(r.agreements?.[0]?.by,signer);g.saved();
  }
});
