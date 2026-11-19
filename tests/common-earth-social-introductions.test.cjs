'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const base=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function setup(){
  const c=vm.createContext({});c.window=c;
  for(const f of ['personas','careers','local-projects','autonomy','social-introductions','dialogue','agency','simulation'])
    vm.runInContext(fs.readFileSync(path.join(base,f+'.js'),'utf8'),c,{filename:f+'.js'});
  const storage=new Map(),create=()=>c.CommonEarthSim.create({storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
  const sim=create();assert.ok(sim.found({name:'Stone Town',lat:-6.16,lon:39.19}).ok);
  return {c,sim,s:sim.active(),w:sim.state,create};
}
const pose=(s,from,to)=>({siteId:s.id,actor:from,target:to,mode:'walk',x:9,y:8,tx:9.8,ty:8});
const to=(t,id,topic,guard)=>t.sim.converse(id,topic,guard||pose(t.s,t.c.EarthAgency.actorId(t.s),id));
function ok(result){assert.ok(result.ok,result.message);return result;}
function ask(t){
  const guide=t.s.residents[0].id;
  const options=t.c.EarthAgency.topics(t.s,t.w,guide);
  assert.ok(options.some(q=>q.id==='intro:ask:care'));
  const reply=ok(to(t,guide,'intro:ask:care')),p=reply.introduction;
  assert.ok(p,reply.message);assert.equal(p.contactId,t.s.residents[2].id);return p;
}
test('two distinct face-to-face meetings create one remembered introduction; saves and casual talk preserve it',()=>{
  const t=setup(),guide=t.s.residents[0].id,baseline=JSON.stringify(t.s);
  assert.equal(t.c.EarthIntroductions.pending(t.s,t.w,'steward'),null);
  assert.ok(t.c.EarthAgency.topics(t.s,t.w,guide).length);assert.equal(JSON.stringify(t.s),baseline);
  for(const bad of [{x:15},{mode:'boat'},{actor:'driver'},{siteId:'other'},{target:'driver'}]){
    assert.equal(to(t,guide,'intro:ask:care',{...pose(t.s,'steward',guide),...bad}).ok,false);
  }
  const p=ask(t),i=t.c.EarthIntroductions,term='intro:meet:'+p.serial,learner=t.c.EarthCareers.view(t.w,t.s,'steward','nurse').skills.care;
  assert.equal(new Set(['steward',p.contactId,p.guideId]).size,3);
  assert.equal(i.level(t.s,'steward',p.contactId,'care',t.w.week),0);assert.equal(t.s.careers,undefined);
  assert.equal(to(t,guide,term).ok,false);assert.equal(to(t,'driver',term).ok,false);
  assert.equal(to(t,p.contactId,term,{...pose(t.s,'steward',p.contactId),x:20}).ok,false);
  ok(to(t,p.contactId,'news'));assert.equal(i.pending(t.s,t.w,'steward').serial,p.serial);
  assert.equal(i.pending(t.s,t.w,p.contactId),null);
  t.sim.destroy();t.sim=t.create();t.s=t.sim.active();t.w=t.sim.state;
  assert.equal(i.pending(t.s,t.w,'steward').contactId,p.contactId);
  const accepted=ok(to(t,p.contactId,term));assert.match(accepted.message,new RegExp(p.guideName));
  assert.equal(i.level(t.s,'steward',p.contactId,p.field,t.w.week),2);
  assert.equal(i.level(t.s,p.contactId,'steward',p.field,t.w.week),0);
  assert.equal(i.level(t.s,'steward',p.contactId,'music',t.w.week),0);
  assert.equal(t.c.EarthCareers.view(t.w,t.s,'steward','nurse').skills.care,learner);
  assert.equal(t.s.careers,undefined);assert.equal(to(t,p.contactId,term).ok,false);
  assert.equal(i.pending(t.s,t.w,'steward'),null);
  t.sim.destroy();t.sim=t.create();t.s=t.sim.active();t.w=t.sim.state;
  const memory=ok(to(t,p.contactId,'intro:recall:'+p.serial));
  assert.match(memory.message,new RegExp(p.guideName));assert.equal(memory.changed,undefined);t.sim.destroy();
});
test('a guide can withdraw, missed meetings expire, another town and another player cannot collect the referral',()=>{
  for(const scenario of ['withdraw-before','withdraw-after','expire']){
    const t=setup(),p=ask(t),api=t.c.EarthIntroductions,meet='intro:meet:'+p.serial,withdraw='intro:withdraw:'+p.serial;
    const copy=JSON.parse(JSON.stringify(t.s));
    assert.equal(api.pending(t.s,{...t.w,activeId:'other'},'steward'),null);
    assert.equal(api.converse(t.s,{...t.w,activeId:'other'},p.contactId,'steward',meet,pose(t.s,'steward',p.contactId)).ok,false);
    ok(t.sim.changeActor(p.guideId,pose(t.s,'steward',p.guideId)));
    assert.equal(api.pending(t.s,t.w,p.guideId),null);assert.equal(to(t,p.contactId,meet).ok,false);
    ok(t.sim.changeActor('steward',pose(t.s,p.guideId,'steward')));
    if(scenario==='expire'){
      for(let j=0;j<3;j++)ok(t.sim.advance());
      assert.equal(api.pending(t.s,t.w,'steward'),null);assert.equal(to(t,p.contactId,meet).ok,false);
    }else{
      if(scenario==='withdraw-after')ok(to(t,p.contactId,meet));
      assert.equal(to(t,'driver',withdraw).ok,false);ok(to(t,p.guideId,withdraw));
      assert.equal(to(t,p.contactId,meet).ok,false);assert.equal(to(t,p.guideId,withdraw).ok,false);
      assert.equal(to(t,p.contactId,'intro:recall:'+p.serial).ok,scenario==='withdraw-after');
      assert.equal(api.level(t.s,'steward',p.contactId,p.field,t.w.week),0);
    }
    assert.equal(api.valid(t.s,t.w.week),true);copy.foundingRevision++;assert.equal(api.valid(copy,t.w.week),false);
    assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)));t.sim.destroy();
  }
});
test('only genuine acquaintances, completed collaborators, and qualifying experience are offered; declined requests cost nothing',()=>{
  const t=setup(),guide='walker-3',contact='walker-1',benefit='walker-0';
  // A passing courier and carpenter have never met in this new town.
  const before=JSON.stringify(t.s),refusal=ok(to(t,guide,'intro:ask:stamina'));
  assert.match(refusal.message,/don’t know/);assert.equal(JSON.stringify(t.s),before);
  t.s.autonomy={week:1,people:{},effects:{},projects:{owners:{},notes:0,assists:0,completed:[{ownerId:guide,partnerId:contact,
    beneficiaryId:benefit,serial:1,kind:'build',axis:'craft',variant:0,week:1,result:'Delivered a stackable crate.'}]}};
  const f=ok(to(t,guide,'intro:ask:craft'));assert.equal(f.introduction.contactId,contact);
  assert.match(f.message,/stackable pantry crate/);assert.ok(!f.message.includes('more experience'));
  const other=setup(),a=other.s.residents[0],b=other.s.residents[1];other.s.neighbourWork={links:{'0-1':-1}};
  ok(other.sim.changeActor(a.id,pose(other.s,'steward',a.id)));
  const askable=other.c.EarthIntroductions.topics(other.s,other.w,b.id).find(q=>q.id.startsWith('intro:ask:'));
  assert.match(ok(to(other,b.id,askable.id)).message,/rebuild trust/);assert.equal(other.s.introductions,undefined);
  other.sim.destroy();t.sim.destroy();
});
test('a redeemed introduction changes real close mentor selection and reserved project consent, without awarding a lesson',()=>{
  const t=setup(),api=t.c.EarthIntroductions,guide=t.s.residents[0].id,contact=t.s.residents[1].id,other='walker-0';
  // An apprenticeship cohort with two equally available experienced mentors and one reserved hobbyist.
  const native=t.c.EarthPersonas,rows=native.list(t.s).map(p=>{
    const value=p.id==='steward'?20:p.id===contact?78:p.id===other?79:35;
    return {...p,aptitudes:{...p.aptitudes,music:value},bounds:{...p.bounds,music:{min:value,max:97}}};
  });
  t.c.EarthPersonas={...native,list:()=>rows,profile:(_,id)=>rows.find(p=>p.id===id)};
  const h=id=>({kind:'hobby',axis:'music',variant:0,serial:1,started:1,progress:0,partnerId:null,beneficiaryId:null,lastWorked:null,finished:null,blocked:null});
  t.s.autonomy={week:0,people:{},effects:{},projects:{owners:{[guide]:h(guide),[contact]:h(contact)},notes:0,assists:0}};
  const mentor=()=>t.c.EarthCareers.view(t.w,t.s,'steward','musician').choices.find(q=>q.id==='mentor');
  assert.equal(mentor().mentorId,other);
  assert.equal(t.c.EarthLocalProjects.joining(t.s,t.w,contact,'steward').ok,false);
  const p=ok(to(t,guide,'intro:ask:music')).introduction;assert.equal(p.contactId,contact);
  assert.equal(mentor().mentorId,other);assert.equal(t.c.EarthLocalProjects.joining(t.s,t.w,contact,'steward').ok,false);
  ok(to(t,contact,'intro:meet:'+p.serial));
  assert.equal(mentor().mentorId,contact);assert.match(mentor().detail,/introduction/);
  assert.ok(t.c.EarthLocalProjects.joining(t.s,t.w,contact,'steward').ok);
  assert.equal(t.s.careers,undefined,'a referral alone cannot teach a skill or consume either weekly lesson');
  for(const [field,from,to,expected] of [['music','steward',contact,2],['care','steward',contact,0],['music','driver',contact,0]]){
    assert.equal(api.level(t.s,from,to,field,t.w.week),expected);
  }
  t.w.week+=4;assert.equal(mentor().mentorId,other);
  assert.equal(t.c.EarthLocalProjects.joining(t.s,t.w,contact,'steward').ok,false);t.sim.destroy();
});
test('valid old saves round-trip and invalid identities, duplicate rewards, dates and missing agency records are rejected',()=>{
  const t=setup();assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)));
  ask(t);const clean=JSON.stringify(t.w);
  for(const damage of [
    (b,r,s)=>{delete s.agency;},b=>{b.serial++;},(b,r)=>{r.contactId=r.guideId;},(b,r)=>{r.actorId='stranger';},(b,r)=>{r.field='invented';},
    (b,r)=>{r.metWeek=1;},(b,r)=>{r.status='met';r.metWeek=10;},(b,r)=>{r.expiresWeek++;},(b,r)=>{r.contactName='';},
    (b,r)=>{b.rows.push({...r});},(b,r)=>{r.status='withdrawn';r.withdrawnWeek=80;} ]){
    const copy=JSON.parse(clean),s=copy.sites[0],b=s.introductions;damage(b,b.rows[0],s);
    assert.equal(t.c.CommonEarthSim.readSave(JSON.stringify(copy)),null);
  }
  assert.ok(t.c.CommonEarthSim.readSave(clean));t.sim.destroy();
});
test('a real conversation played as a passing local makes a later introduction possible; a stale meeting callback cannot redeem it',async()=>{
  const t=setup(),guide='walker-0',friend=t.s.residents[1].id;
  assert.match(ok(to(t,guide,'intro:ask:craft')).message,/don’t know/);
  ok(t.sim.changeActor(guide,{...pose(t.s,'steward',guide),targetPose:{id:guide,mode:'walk',x:10,y:8}}));
  ok(to(t,friend,'listen'));ok(t.sim.changeActor('steward',pose(t.s,guide,'steward')));
  const p=ok(to(t,guide,'intro:ask:craft')).introduction;
  assert.equal(p.contactId,friend);assert.match(t.s.agency.visits[0].from,/walker-0/);
  let unlock,meeting=pose(t.s,'steward',friend);
  t.c.navigator={locks:{request:(_,fn)=>new Promise(resolve=>{unlock=()=>resolve(fn());})}};
  const attempt=t.sim.perform('converse',friend,'intro:meet:'+p.serial,()=>meeting);
  meeting={...meeting,ty:20};unlock();assert.equal((await attempt).ok,false);
  assert.equal(t.c.EarthIntroductions.pending(t.s,t.w,'steward').serial,p.serial);
  delete t.c.navigator;ok(to(t,friend,'intro:meet:'+p.serial));assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)));t.sim.destroy();
});
test('a long-lived town retains a bounded introduction book and an expired meeting remains a memory without ongoing preference',()=>{
  const t=setup(),api=t.c.EarthIntroductions,guide=t.s.residents[0].id,contact=t.s.residents[2].id;
  for(let week=1;week<=70;week++){
    t.w.week=week;
    const p=ok(to(t,guide,'intro:ask:care')).introduction;
    assert.equal(p.serial,week);ok(to(t,contact,'intro:meet:'+p.serial));
    assert.ok(api.valid(t.s,week));assert(t.s.introductions.rows.length<=64);
  }
  t.w.week+=4;assert.equal(api.level(t.s,'steward',contact,'care',t.w.week),0);
  assert.match(ok(to(t,contact,'intro:recall:70')).message,/week 70/);
  assert.equal(to(t,contact,'intro:recall:1').ok,false);assert.ok(t.c.CommonEarthSim.readSave(JSON.stringify(t.w)));t.sim.destroy();
});
