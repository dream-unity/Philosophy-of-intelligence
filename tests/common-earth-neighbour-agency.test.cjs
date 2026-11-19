'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
function fixture(){
  const context=vm.createContext({structuredClone,console});context.window=context;
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const script of html.matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    vm.runInContext(fs.readFileSync(path.join(dir,script[1]+'.js'),'utf8'),context,{filename:script[1]+'.js'});
    if(script[1]==='simulation')break;
  }
  const sim=context.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.16,lon:39.19,water:true}).ok);
  const site=sim.active(),world=sim.state,agency=context.EarthAgency,errands=context.EarthNeighbourErrands;
  const actor=()=>agency.actorId(site);
  const proof=(target,extra)=>({mode:'walk',actor:actor(),target,siteId:site.id,x:8,y:8,tx:8.5,ty:8,...extra});
  const talk=(id,topic,extra)=>sim.converse(id,topic,()=>proof(id,extra));
  const topics=id=>agency.topics(site,world,id);
  const change=id=>sim.changeActor(id,()=>({...proof(id),targetPose:{id,mode:'walk',x:8.5,y:8}}));
  const saved=()=>assert(context.CommonEarthSim.readSave(JSON.stringify(world)),'save at week '+world.week);
  const next=()=>{const result=sim.advance();assert(result.ok,result.message);};
  function earn(){
    for(const action of ['start','check','finish']){
      const offer=sim.purseView().options.find(o=>o.action===action);assert(offer?.available,offer?.reason);
      const result=sim.purseAction(offer.request,proof(offer.venue.residentId||'market'));assert(result.ok,result.message);
    }
  }
  return {context,sim,site,world,errands,actor,talk,topics,change,next,earn,saved,proof};
}
test('residents originate and negotiate a three-person agreement that a bystander can follow on foot',()=>{
  const t=fixture(),{site,world}=t;
  while(world.week<3)t.next();
  const row=site.agency.arrangements.rows.find(r=>r.origin==='neighbours');assert(row);
  assert.equal(row.status,'asked');assert.equal(row.dueWeek,row.week+3);
  const participants=[row.requesterId,row.actorId,row.contactId];
  assert.equal(new Set(participants).size,3);assert(!participants.includes('steward'));
  const responses=new Set(),before=JSON.stringify(world);
  for(const id of participants){
    const topic=t.topics(id).find(o=>o.id==='agreement:'+row.id);assert(topic?.context);
    assert(!t.talk(id,topic.id,{tx:12}).ok);
    const result=t.talk(id,topic.id);assert(result.ok);assert(participants.includes(result.followContact));
    responses.add(result.message.split(' · ')[1]);
    assert(!t.talk(id,'agreement:9876').ok);
  }
  assert.equal(responses.size,3);assert.equal(JSON.stringify(world),before);
  assert(t.context.EarthDialogue.readOnly('agreement:'+row.id));
  const preview=t.sim.forecastNext();assert(preview.sites.some(s=>s.highlights.some(h=>h.includes('week '+row.dueWeek))));
  assert.equal(JSON.stringify(world),before);t.next();assert.equal(row.status,'agreed');
  const firstMethod=row.method,when=row.agreedWeek;assert(['goods','time'].includes(firstMethod));
  assert.equal(t.errands.closeWeek(site,world).filter(s=>s.includes('offered a personal work session')).length,0);
  assert.equal(row.agreedWeek,when);
  while(world.week<=row.dueWeek+1){t.saved();t.next();}
  assert(['kept','missed'].includes(row.status));
  if(row.status==='kept'&&firstMethod==='time')assert.equal(row.localSession,true);
  t.saved();t.sim.destroy();
});
test('taking a viewpoint preserves the resident’s right to reply and prevents automatic acceptance in their name',()=>{
  const t=fixture();while(t.world.week<3)t.next();
  const row=t.site.agency.arrangements.rows.find(r=>r.origin==='neighbours');assert(row);
  assert(t.change(row.actorId).ok);
  t.next();assert.equal(row.status,'asked');assert.equal(row.agreedWeek,undefined);
  const asked=t.talk(row.contactId,'errand:terms:'+row.id);assert(asked.ok);
  assert(t.change('steward').ok);t.next();assert(['agreed','withdrawn'].includes(row.status));t.saved();t.sim.destroy();
});
test('a promised transfer can become a mutually agreed personal visit when the public supplies disappear',()=>{
  const t=fixture(),{world,site}=t;
  while(world.week<3)t.next();
  const row=site.agency.arrangements.rows.find(r=>r.origin==='neighbours');
  assert.equal(row.kind,'meeting');site.funds=14;
  site.autonomy.people[row.actorId].energy=2;t.next();
  assert.equal(row.method,'goods');assert.equal(row.review.why,'release');site.funds=0;
  site.autonomy.people[row.actorId].energy=7;world.effort=0;
  const decision=t.errands.closeWeek(site,{...world,week:row.dueWeek});
  assert(decision.some(message=>message.includes('own time instead')));
  assert.equal(row.method,'time');assert.equal(row.changedWeek,row.dueWeek);assert.equal(world.effort,0);
  assert.equal(t.errands.closeWeek(site,{...world,week:row.dueWeek}).length,0);
  const why=t.errands.account(site,{...world,week:row.dueWeek},row.contactId,'steward',row);
  assert.match(why.message,/changed to a work session/);assert.equal(site.funds,0);t.sim.destroy();
});
function reachedFee(donor){
  const t=fixture();if(donor)assert(t.change(donor).ok);
  t.earn();while(t.world.week<4)t.next();
  const candidates=t.context.EarthPersonas.list(t.site).filter(p=>p.id!=='steward'&&p.id!==t.actor()&&
    t.context.EarthCommunityLife.residency(t.site,p.id)==='member');
  const recipient=candidates.find(p=>t.context.EarthAutonomy.bond(t.site,p.id,t.actor(),t.world.week)<=0)||candidates[0];
  assert(recipient);
  // Hold the fee shortfall fixed even when the normal paid shifts have already
  // given every resident a balance. Record the prior expenses on the real purse.
  const purse=t.site.purses.people[recipient.id];
  while(purse?.balance)assert(t.context.EarthPurses.dreamExpense(t.world,t.site,recipient.id,Math.min(4,purse.balance),'the orchard club'));
  if(donor){
    const funds=t.site.purses.people[donor];
    while(funds.balance>2)assert(t.context.EarthPurses.dreamExpense(t.world,t.site,donor,Math.min(4,funds.balance-2),'their own course'));
  }
  const row=t.site.autonomy.people[recipient.id];assert(row);
  row.dream={id:'orchard',step:1,sessions:0,started:1,checkpoint:3,last:3};
  delete row.nextDream;
  const donate=()=>t.topics(recipient.id).find(o=>o.id.startsWith('dream-gift:'));
  return {...t,recipient,donate};
}
test('a personal gift requires trust, matches the exact shortage, moves real money once and leaves the next decision to its owner',async()=>{
  const t=reachedFee(),{recipient,site,world}=t,id=recipient.id;
  assert(t.topics(id).some(o=>o.id==='dream-help'));
  assert.match(t.talk(id,'dream-help').message,/rather|first/);assert(!t.donate());
  assert(t.talk(id,'listen').changed);assert(t.talk(id,'meal').changed);
  const grant=t.donate();assert(grant?.context);assert.match(grant.label,/2 personal funds/);
  const claimed=site.autonomy.people[id].dream,publicBudget=site.funds,source=site.purses.people.steward.balance;
  const before=JSON.stringify(world);assert(!t.talk(id,grant.id,{tx:12}).ok);assert(!t.talk(id,grant.id.replace(/:2:4$/,':1:4')).ok);
  assert.equal(JSON.stringify(world),before);
  const result=await t.sim.perform('converse',id,grant.id,()=>t.proof(id));assert(result.ok,result.message);
  assert.equal(site.purses.people.steward.balance,source-2);assert.equal(site.purses.people[id].balance,2);
  assert.equal(site.purses.people[id].entries[0].action,'receive');assert.equal(site.funds,publicBudget);
  assert.equal(claimed.step,1);assert.equal(claimed.sessions,0);assert.equal(claimed.support.week,4);
  assert.match(t.talk(id,'dream').message,/gave me 2 personal funds/);
  const link=t.context.EarthDreams.supportLink(site,id);assert.equal(link.from,'steward');assert.equal(link.to,id);assert.equal(link.amount,2);
  assert(!t.talk(id,grant.id).ok);t.saved();
  const wrong=JSON.parse(JSON.stringify(world));wrong.sites[0].autonomy.people[id].dream.support.amount=3;
  assert.equal(t.context.CommonEarthSim.readSave(JSON.stringify(wrong)),null);t.sim.destroy();
});
test('another resident can refuse to give away their savings while the player is experiencing their day',()=>{
  const t=reachedFee('walker-1'),id=t.recipient.id,source=t.site.purses.people[t.actor()].balance;
  assert(t.talk(id,'listen').changed);assert(t.talk(id,'meal').changed);
  const option=t.donate();assert(option);const prior=JSON.stringify(t.world);
  const answer=t.talk(id,option.id);assert(answer.ok&&!answer.changed);assert.match(answer.message,/keeping|keep something/);
  assert.equal(t.site.purses.people[t.actor()].balance,source);assert.equal(JSON.stringify(t.world),prior);t.saved();t.sim.destroy();
});
test('a chosen listening topic remembers the real ambition, its blocked stage and the person at the meeting',()=>{
  const t=reachedFee(),id=t.recipient.id,{site,world}=t;
  const heard=t.talk(id,'dream');assert.equal(heard.followMemory.id,'listen:dream:orchard');
  const before=JSON.stringify(world);assert(!t.talk(id,'listen:dream:skydive').ok);assert.equal(JSON.stringify(world),before);
  assert(t.talk(id,heard.followMemory.id).changed);
  const v=site.agency.visits.find(r=>r.from===t.actor()&&r.to===id);
  assert.equal(v.thread.kind,'dream');assert.equal(v.thread.key,'orchard');assert.equal(v.toKey,t.recipient.identityKey);
  const bond=t.context.EarthAutonomy.bond(site,id,t.actor(),world.week);
  assert(!t.talk(id,heard.followMemory.id).changed);assert.equal(t.context.EarthAutonomy.bond(site,id,t.actor(),world.week),bond);
  const blocked=t.talk(id,'followup');assert.match(blocked.message,/same|haven’t moved/);assert.match(blocked.message,/Save 2 more personal funds/);
  t.saved();const real=site.autonomy.people[id].dream;
  // The nursery stage finished on the next available date. The old note
  // remains the comparison point even after the person's weekly work changes.
  Object.assign(real,{step:2,sessions:0,last:world.week,checkpoint:world.week});
  const update=t.talk(id,'followup');assert.match(update.message,/1 more practice session/);
  assert.match(update.message,/week 12/);t.saved();
  const changed=JSON.parse(JSON.stringify(world));
  changed.sites[0].agency.visits.find(r=>r.to===id).thread.at=-1;
  assert.equal(t.context.CommonEarthSim.readSave(JSON.stringify(changed)),null);
  v.toKey='another person registered at this slot';
  assert(!t.talk(id,'followup').ok);t.sim.destroy();
});

test('one signatory can find a different carrier; recipients learn the change through a meeting and actual delivery settles the original promise',()=>{
  const t=fixture(),{site,world,context}=t,receiver=site.residents[1],helper='walker-1';
  assert(t.sim.act('listen:'+receiver.id).ok);assert(t.sim.act('promise:'+receiver.id).ok);
  const p=receiver.promise,ref=receiver.slot+':'+p.start+':'+p.dueWeek;
  const quote='relay:terms:'+ref;
  const fundsBefore=JSON.stringify(site.purses);
  assert.match(t.talk(helper,quote).message,/booking fee/);
  assert(!t.topics(helper).some(o=>o.id.startsWith('relay:book:')));
  assert.equal(JSON.stringify(site.purses),fundsBefore);
  context.EarthAutonomy.remember(site,world.week,'steward',helper,'kept');
  const free=t.topics(helper).find(o=>o.id.startsWith('relay:book:'));assert(free);assert.match(free.id,/:0$/);
  assert(!t.talk(helper,free.id,{tx:12}).ok);assert(t.talk(helper,free.id).changed);
  assert.equal(p.by,'steward');assert.equal(context.EarthNeighbourErrands.deliveryWorker(site,receiver),helper);
  assert(!t.talk(helper,free.id).ok);assert(!p.handover.informed);
  assert.match(t.talk(helper,'purpose').message,new RegExp(receiver.name));
  const notify='relay:notify:'+ref;assert(t.talk(receiver.id,notify).changed);assert(p.handover.informed);
  assert.match(t.talk(receiver.id,'purpose').message,new RegExp(context.EarthPersonas.profile(site,helper).name));
  t.saved();
  while(world.week<p.dueWeek)t.next();
  const working=context.EarthNeighbourErrands.working(site,world.week).find(q=>q.targetId===receiver.id);assert(working);
  assert.equal(working.actorId,helper);assert.equal(p.by,'steward');
  t.next();assert.equal(receiver.agreements[0].by,'steward');assert.equal(receiver.agreements[0].deliveredBy,helper);t.saved();
});
