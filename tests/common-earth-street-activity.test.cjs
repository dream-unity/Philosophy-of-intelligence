'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const root=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const context=vm.createContext({});
for(const name of ['careers.js','street-activity.js']){
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
}
const {plan,stage}=context.EarthStreetActivity;

test('all paid careers and original supply duties have physical workplace actions',()=>{
  for(const career of context.EarthCareers.catalog){
    const chosen=plan({careerId:career.id,role:career.label,occupation:career.occupation,venue:career.venue});
    assert.equal(chosen.id,career.id);
    assert(chosen.steps.length>=2);
    assert(chosen.steps.some(step=>step.prop!=='none'));
    assert(chosen.steps.every(step=>step.duration>0&&step.label));
  }
  const load=plan({role:'Exchange porter'}),mail=plan({role:'Foot courier'});
  assert.equal(stage(load,10,true).prop,'crate');assert.equal(stage(mail,10,true).prop,'parcel');
  assert.equal(stage(plan({careerId:'nurse',role:'Co-op delivery driver'}),0).label,'Checking the clinic list');
  assert.equal(stage(plan({kind:'dropoff'}),0).gesture,'place');
  assert.equal(stage(plan({kind:'pickup'}),3).gesture,'lift');
});

test('travel and idle work share immutable stages with finite deterministic boundaries',()=>{
  const chosen=plan({role:'Repairer',destination:'the workshop',personality:{traits:{patience:50}}});
  assert(Object.isFrozen(chosen)&&Object.isFrozen(chosen.steps)&&Object.isFrozen(chosen.steps[0]));
  assert.equal(stage(chosen,0,true),chosen.travel);
  assert.equal(chosen.travel.label,'Walking to the workshop');
  for(const seconds of [-9,NaN,Infinity,0,chosen.duration])assert.equal(stage(chosen,seconds),chosen.steps[0]);
  assert.equal(stage(chosen,chosen.steps[0].duration),chosen.steps[1]);
  assert.equal(stage(chosen,chosen.steps[0].duration+chosen.steps[1].duration),chosen.steps[2]);
  const patient=plan({role:'Repairer',personality:{patience:95}});
  assert(patient.duration>chosen.duration);
  assert.equal(stage(patient,patient.duration),patient.steps[0]);
});

test('projects visibly plan, work, and finish according to their subject',()=>{
  for(const projectKind of ['research','build','food','teach']){
    const phases=['plan','work','finish'].map(projectPhase=>plan({careerId:'driver',kind:'project',projectKind,projectPhase}));
    assert.equal(new Set(phases.map(p=>p.id)).size,3,projectKind);
    assert.notDeepEqual(phases[0].steps,phases[2].steps);
    assert.equal(stage(phases[0],0,true).gesture,'walk');
  }
  assert.equal(plan({kind:'project',projectKind:'research'}).id,'research-work');
  assert.equal(plan({kind:'project',projectKind:'unknown',role:'Grower'}).id,'grower');
});

test('rest, waiting, paired conversations and lessons have different visible phases',()=>{
  const rest=plan({kind:'rest',training:true}),host=plan({kind:'host'}),visit=plan({kind:'visit'}),alone=plan({kind:'waiting'});
  assert.equal(stage(rest,0).gesture,'sit');
  assert.equal(stage(alone,0).id,'wait-at-meeting');
  assert(visit.steps.some(s=>s.gesture==='speak')&&host.steps.some(s=>s.gesture==='listen'));
  assert.equal(stage(host,3).gesture,'listen');assert.equal(stage(visit,3).gesture,'speak');
  assert.equal(stage(plan({careerId:'engineer',training:true}),0).prop,'book');
  assert.equal(stage(plan({kind:'cover',venue:'workshop',role:'Steward'}),3).gesture,'turn');
  assert.equal(plan({careerId:'__proto__',role:'constructor',venue:'toString'}).id,'convenor');
});

test('a repairer’s personal music and mathematics sessions use the selected hobby instead of their day job',()=>{
  const session={role:'Repairer',kind:'project',projectKind:'hobby'};
  const music=plan({...session,axis:'music',projectPhase:'work'});
  const maths=plan({...session,axis:'numeracy',projectPhase:'work'});
  assert(music.steps.some(s=>s.gesture==='play'&&s.prop==='instrument'));
  assert(maths.steps.some(s=>s.gesture==='write'&&s.prop==='slate'));
  assert.equal(plan({...session,axis:'music',projectPhase:'plan'}).id,'music-plan');
  assert.equal(plan({...session,axis:'music',projectPhase:'finish'}).id,'music-finish');
  const dispatch=plan({role:'Co-op delivery driver',kind:'dispatch'});
  assert(dispatch.steps.every(s=>s.prop!=='crate'));
});

test('specific ambition stages have grounded tools and the shuttle meeting depicts the local departure',()=>{
  const rehearsal=plan({kind:'dream',dreamId:'ensemble',step:2,venue:'bench'}),changes=plan({kind:'dream',dreamId:'balcony',step:3,venue:'workshop'});
  assert(rehearsal.steps.some(s=>s.prop==='instrument'&&s.gesture==='play'));
  assert(changes.steps.some(s=>s.prop==='wrench'&&s.gesture==='turn'));
  const shuttle=plan({kind:'dream',dreamId:'skydive',step:4,venue:'market'});
  assert(shuttle.steps.some(s=>s.label.includes('shuttle departure')));
  assert.equal(context.EarthStreetActivity.favour('bench','time',false).gesture,'strike');
  assert.equal(context.EarthStreetActivity.favour('supper','goods',true).prop,'basket');
  assert.equal(context.EarthStreetActivity.favour('constructor','bad',true),null);
});

test('wood, stone, crops and kelp use the tool appropriate to the booked harvest',()=>{
  for(const [id,prop] of Object.entries({timber:'saw',stone:'pick',grain:'sickle',kelp:'line',roots:'trowel',fruit:'basket'})){
    assert.equal(context.EarthStreetActivity.harvestStep(id).prop,prop);
    const mission=plan({kind:'project',projectKind:'food',projectPhase:'work',resource:id});
    assert(mission.steps.some(step=>step.prop===prop));
  }
  assert.equal(context.EarthStreetActivity.harvestStep('constructor'),null);
});

test('a signed supply pledge carries the contract quantity in the right container and addresses its actual parties',()=>{
  for(const [good,prop] of Object.entries({food:'basket',materials:'crate',funds:'parcel'})){
    const row={ordinary:true,amount:3,good},outline={kind:'commitment',errandKind:'bench',method:'goods',pledge:row};
    const helper=plan({...outline,peerName:'Mira'}),recipient=plan({...outline,recipient:true,peerName:'Idris'});
    assert.equal(helper.travel.label,'Carrying 3 promised '+good+' to Mira');assert.equal(helper.travel.prop,prop);
    assert.equal(stage(helper,2).label,'Handing over 3 promised '+good+' to Mira');
    assert.equal(stage(recipient,2).label,'Receiving 3 promised '+good+' from Idris');assert.equal(recipient.travel.prop,'none');
  }
});

test('a restricted handover gives an administrative substitute only records work and a qualified substitute the outgoing role',()=>{
  for(const kind of ['commitment','cover']){
    const admin=plan({kind,role:'Practice nurse',careerId:'practice-nurse',handoverScope:'admin',handoverRole:'Practice nurse',venue:'hall'});
    assert.equal(admin.id,'handover-admin');assert(admin.steps.every(step=>['book','ledger'].includes(step.prop)));
    const nurse=plan({kind,role:'Carpenter',handoverScope:'qualified',handoverRole:'Practice nurse',venue:'hall'});
    assert.equal(nurse.id,'practice-nurse');assert(nurse.steps.some(step=>/home-visit/.test(step.label)));
    assert.equal(plan({kind,handoverScope:'qualified',handoverRole:'Police officer',venue:'hall'}).id,'police');
    const surveyOffice=plan({kind,handoverScope:'admin',handoverRole:'Building surveyor',venue:'workshop'});
    assert.equal(surveyOffice.id,'handover-schedule');
    assert.match(surveyOffice.steps.map(s=>s.label).join(' '),/duty rota and handover records/);
    assert.doesNotMatch(surveyOffice.steps.map(s=>s.label).join(' '),/clinic|referral|appointment/);
  }
  assert.equal(plan({kind:'routine',careerId:'surveyor',handoverRole:'Nurse',handoverScope:'qualified'}).id,'surveyor');
});
