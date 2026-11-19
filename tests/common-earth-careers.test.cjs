'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const gameDir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const axes=['numeracy','music','communication','care','craft','stamina','organisation'];
function person(id,name,role,options={}){
  const aptitudes=Object.fromEntries(axes.map(axis=>[axis,options.skills?.[axis]??64]));
  const bounds=Object.fromEntries(axes.map(axis=>[axis,{min:aptitudes[axis],max:options.max?.[axis]??98}]));
  return {id,name,role,originRole:role,aptitudes,bounds,traits:{patience:60,adaptability:60,...options.traits}};
}
function setup(){
  const people=[
    person('steward','Rowan','Steward'),
    person('resident-1','Ira','Repairer',{skills:{numeracy:79,music:18,organisation:53},max:{music:61}}),
    person('walker-0','Sam','Baker',{skills:{craft:83,care:87,stamina:85},traits:{adaptability:30}}),
    person('walker-1','Fin','Carpenter',{skills:{craft:78,communication:72},traits:{patience:32}}),
    person('driver','Morgan','Co-op delivery driver'),
    person('carrier-0-1','Jo','Supply porter')];
  const context=vm.createContext({EarthPersonas:{list:()=>people,profile:(_,id)=>people.find(p=>p.id===id)},
    EarthAgency:{actorId:site=>site.actor||'steward'}});
  const original=fs.readFileSync(path.join(gameDir,'careers.js'),'utf8');
  vm.runInContext(original,context,{filename:'careers.js'});
  const api=context.EarthCareers,world={week:1};
  const site={id:'town',residents:people.slice(1,2),food:8,materials:8,funds:8};
  function view(id,target,ctx={speakerId:id}){return api.view(world,site,id,target,ctx);}
  function choose(id,target,action,ctx={speakerId:id},proof=null){
    return api.command(world,site,id,action,target,view(id,target,ctx).revision,proof,ctx);
  }
  function advance(n){
    const notices=[];
    for(let i=0;i<n;i++){
      world.week++;notices.push(...api.tick(world,site));
      assert.ok(api.valid(site,world.week),'weekly state must round-trip at week '+world.week);
      const current=JSON.stringify(site);
      assert.equal(api.tick(world,site).length,0);
      assert.equal(JSON.stringify(site),current,'closing a week twice cannot grant benefits twice');
    }
    return notices;
  }
  return {api,site,world,people,view,choose,advance};
}
function ok(result){assert.ok(result.ok,result.message);return result;}
function rejected(result){assert.equal(result.ok,false,result.message);return result.message;}

test('opening old and ambient profiles is yield-free, stable and read-only',()=>{
  const {api,site,world,view}=setup(),before=JSON.stringify(site);
  assert.equal(view('steward').career,'Steward');
  assert.equal(view('steward','convenor').qualified,false);
  assert.equal(view('driver').employer,'Transport cooperative');
  assert.equal(view('carrier-0-1').career,'Supply porter');
  assert.equal(api.view(world,site,'bogus','nurse'),null);
  assert.equal(api.work(site,'driver'),null);
  assert.deepEqual(Object.keys(api.weeklyAdjustment(site,world)),[]);
  assert.ok(api.valid(site,1));assert.equal(JSON.stringify(site),before);
  for(const [job,min] of [['nurse',104],['teacher',104],['engineer',104],['mathematician',156],['police',52],['geneticist',156]]){
    assert.ok(api.catalog.find(j=>j.id===job).trainingWeeks>=min);
  }
});

test('a bounded amateur interest stays playable, while advisers and hiring panels respond to individual fit',()=>{
  const {api,site,world,view,choose,advance,people}=setup(),id='resident-1',outsider={speakerId:'steward'};
  assert.equal(api.fits(people[1],api.catalog.find(j=>j.id==='musician')),false);
  assert.match(rejected(choose(id,'musician','enroll',outsider)),/prefer another route/);
  assert.equal(site.careers,undefined);
  let snapshot=view(id,'musician');
  ok(choose(id,'musician','practice'));
  assert.match(rejected(api.command(world,site,id,'support','musician',snapshot.revision,null,{speakerId:id})),/changed/);
  assert.match(rejected(choose(id,'musician','practice')),/already used/);
  for(let i=0;i<60;i++){
    advance(1);
    if(view(id,'musician').choices.find(c=>c.id==='practice').available)ok(choose(id,'musician','practice'));
  }
  assert.equal(view(id,'musician').skills.music,61);
  assert.equal(view(id,'musician').fits,false);
  ok(choose(id,'musician','apply'));advance(2);
  snapshot=view(id,'musician');
  assert.equal(snapshot.application.phase,'deferred');assert.match(snapshot.status,/Music 80/);
  assert.match(rejected(choose(id,'musician','apply')),/reopen/);
  advance(1);ok(choose(id,'engineer','enroll',outsider));
  assert.equal(site.careers[id].agreedPlan,'engineer');assert.equal(site.careers[id].training.autonomous,true);
  ok(choose(id,'engineer','pause'));assert.equal(site.careers[id].agreedPlan,undefined);
  assert.equal(site.careers[id].training.autonomous,false);
  ok(choose(id,'engineer','leaveCourse'));
  assert.equal(view(id,'engineer').skills.music,61);
});

test('a two-person lesson rechecks physical contact and consumes both weekly practice sessions',()=>{
  const {site,view,choose,advance}=setup(),id='resident-1',job='nurse';
  const mentor=view(id,job).choices.find(c=>c.id==='mentor');
  assert.equal(mentor.mentorId,'walker-0');
  const proof={siteId:site.id,actor:id,target:mentor.mentorId,mode:'walk',x:2,y:2,tx:3,ty:2};
  for(const bad of [{...proof,x:12},{...proof,target:'driver'},{...proof,actor:'steward'},{...proof,mode:'boat'},{...proof,siteId:'elsewhere'}]){
    assert.match(rejected(choose(id,job,'mentor',{speakerId:id},bad)),/Meet/);
  }
  assert.equal(site.careers,undefined);
  const before=view(id,job).skills.care,teacher=view('walker-0',job).skills.communication;
  ok(choose(id,job,'mentor',{speakerId:id},proof));
  assert.ok(view(id,job).skills.care-before>=3);
  assert.equal(view('walker-0',job).skills.communication,teacher+1);
  assert.match(rejected(choose('walker-0',job,'portfolio')),/already used/);
  assert.match(view('walker-0',job).history[0].text,/Mentored Ira/);
  advance(1);ok(choose('walker-0',job,'portfolio'));
  assert.ok(!view(id,job).choices.some(c=>c.id==='mentor' && c.mentorId==='walker-0'));
});

test('long programmes have classes, supervised placements and assessed practice while the old job remains',()=>{
  const {api,site,world,view,choose,advance}=setup(),id='resident-1',job='mathematician';
  ok(choose(id,job,'enroll'));
  assert.equal(view(id,job).training.phase,'Foundation classes');
  advance(5);assert.equal(view(id,job).training.credits,5);
  ok(choose(id,job,'pause'));advance(3);assert.equal(view(id,job).training.credits,5);
  ok(choose(id,job,'resume'));ok(choose(id,job,'pace'));
  assert.equal(api.weeklyAdjustment(site,world).materials,-1);
  assert.ok(advance(33).some(text=>text.includes('supervised placement')));
  assert.equal(view(id,job).training.phase,'Supervised placement');
  for(let i=0;i<3;i++){ok(choose(id,job,'portfolio'));advance(1);}
  assert.equal(view(id,job).qualifications[job],undefined);
  assert.equal(view(id,job).career,'Repairer');
  assert.ok(advance(32).some(text=>text.includes('assessed practice')));
  assert.equal(view(id,job).training.phase,'Assessed practice');
  assert.ok(advance(34).some(text=>text.includes('completed the Mathematician course')));
  assert.equal(view(id,job).training,null);
  assert.equal(api.weeklyAdjustment(site,world).materials,-1,'graduation week still had an intensive timetable');
  assert.equal(view(id,job).career,'Repairer');assert.equal(view(id,job).missing.length,0);
  advance(1);assert.equal(api.weeklyAdjustment(site,world).materials,undefined);
  ok(choose(id,job,'apply'));advance(1);assert.equal(view(id,job).application.phase,'screening');
  advance(1);assert.equal(view(id,job).application.phase,'offer');
  advance(4);assert.equal(view(id,job).application.phase,'deferred');
  assert.equal(api.work(site,id),null);assert.match(view(id,job).status,/offer expired/);
  advance(1);ok(choose(id,job,'apply'));advance(2);ok(choose(id,job,'accept'));
  advance(2);assert.equal(api.work(site,id).id,job);
  assert.equal(view(id,job).latestReference.employer,'Repair cooperative');
});

test('recruitment, a refused early release and a named handover have different durable effects',()=>{
  const {api,site,world,view,choose,advance}=setup(),id='walker-0',job='refuse',self={speakerId:id},adviser={speakerId:'steward'};
  site.food=0;
  ok(choose(id,job,'enroll',adviser));assert.equal(site.careers[id].agreedPlan,job);
  advance(3);ok(choose(id,job,'apply',adviser));
  advance(2);assert.match(rejected(choose(id,job,'accept',adviser)),/unavailable/);
  ok(choose(id,job,'discussOffer',adviser));assert.equal(view(id,job).application.phase,'deferred');
  assert.equal(site.careers[id].agreedPlan,undefined);
  assert.match(view(id,job).status,/chose to stay/);
  advance(1);ok(choose(id,job,'apply'));advance(2);ok(choose(id,job,'accept'));
  assert.equal(api.role(site,id),null);const notice=view(id,job).application;
  assert.match(ok(choose(id,job,'release')).message,/declined/);
  assert.equal(view(id,job).application.dueWeek,notice.dueWeek);
  const cover=view(id,job).choices.find(c=>c.id==='handover');assert.ok(cover?.coverId);
  assert.match(rejected(choose(id,job,'handover',{...self,coverId:'unknown'})),/availability/);
  ok(choose(id,job,'handover',{...adviser,coverId:cover.coverId}));
  assert.match(view(cover.coverId,job).history[0].text,/Agreed to cover Sam/);
  ok(choose(id,job,'release'));advance(1);
  assert.equal(api.work(site,id).label,'Refuse collector');
  assert.equal(view(id,job).references.baker,2);
  assert.equal(api.coverage(site,world)[0].coverId,cover.coverId);
  advance(1);assert.equal(api.coverage(site,world).length,1);
  advance(1);assert.equal(api.coverage(site,world).length,0);
});

test('rushed vacancies cost two production closes and a poor reference follows the worker into later applications',()=>{
  const {api,site,world,choose,view,advance}=setup(),id='walker-0';
  ok(choose(id,'refuse','enroll'));advance(3);ok(choose(id,'refuse','apply'));advance(2);
  ok(choose(id,'refuse','accept'));ok(choose(id,'refuse','release'));advance(1);
  assert.equal(view(id,'refuse').latestReference.quality,-2);
  assert.equal(api.weeklyAdjustment(site,world).food,-1);
  advance(1);assert.equal(api.weeklyAdjustment(site,world).food,-1);
  advance(1);assert.equal(api.weeklyAdjustment(site,world).food,undefined);
  assert.ok(view(id,'courier').missing.some(m=>m.includes('1 work sample')));
  ok(choose(id,'courier','portfolio'));assert.ok(view(id,'courier').missing.every(m=>!m.includes('1 work sample')));
  ok(choose(id,'courier','enroll'));advance(3);ok(choose(id,'courier','apply'));advance(2);
  assert.equal(view(id,'courier').application.phase,'offer');
});

test('a patient proposal can get a personal work trial and a save rejects malformed or fictitious records',()=>{
  const {api,site,world,view,choose,advance}=setup(),id='walker-1',asSteward={speakerId:'steward'};
  assert.match(rejected(choose(id,'teacher','enroll',asSteward)),/try one work sample/);
  ok(choose(id,'teacher','portfolio',asSteward));
  ok(choose(id,'teacher','enroll',asSteward));
  const original=JSON.stringify(site);assert.ok(api.valid(JSON.parse(original),world.week));
  for(const bad of [
    s=>{s.careers.unknown=s.careers[id];},s=>{s.careers[id].training=0;},
    s=>{s.careers[id].training.credits=999;},s=>{s.careers[id].agreedPlan='invented';},
    s=>{s.careers[id].skills.music=141;},s=>{s.careers[id].application={phase:'deferred',targetId:'teacher',autonomous:true,dueWeek:2};},
    s=>{s.careers[id].history[0].week=30;}
  ]){
    const s=JSON.parse(original);bad(s);assert.equal(api.valid(s,world.week),false);
  }
  advance(2);assert.ok(api.valid(site,world.week));
  assert.equal(view(id,'teacher').employer,'Carpenters’ workshop');
});

test('a returning worker can repair a rushed reference even after reaching their attainable skill ceiling',()=>{
  const {api,site,world,choose,view,advance}=setup(),id='walker-0';
  ok(choose(id,'refuse','enroll'));advance(3);ok(choose(id,'refuse','apply'));advance(2);
  ok(choose(id,'refuse','accept'));ok(choose(id,'refuse','release'));advance(1);
  assert.equal(view(id,'courier').latestReference.quality,-2);
  ok(choose(id,'courier','relief'));assert.match(rejected(choose(id,'courier','relief')),/already used/);
  advance(1);assert.equal(api.weeklyAdjustment(site,world).food,0,'one relief shift replaces the food lost to the old vacancy');
  ok(choose(id,'baker','relief'));advance(1);
  assert.equal(api.weeklyAdjustment(site,world).food,1);
  assert.equal(view(id,'courier').latestReference.quality,0);assert.equal(view(id,'baker').references.baker,0);
  assert.ok(!view(id,'courier').missing.some(s=>s.includes('1 work sample')));
  assert.ok(!view(id,'courier').choices.some(c=>c.id==='relief'));
  advance(1);assert.equal(api.weeklyAdjustment(site,world).food,undefined);
});

test('a paid lesson at a worker’s skill ceiling leaves a fresh career untouched and older empty records still reopen',()=>{
  const {api,site,world,people}=setup(),p=people[1],axis='craft';
  p.bounds[axis].max=p.aptitudes[axis];
  api.productionLesson(site,p,axis,world.week);
  assert.equal(site.careers,undefined);
  site.careers={[p.id]:{revision:0,skills:{},qualifications:{},portfolios:{},references:{},history:[]}};
  assert.ok(api.valid(site,world.week));
  site.careers[p.id].jobId='doctor';
  assert.equal(api.valid(site,world.week),false);
});
