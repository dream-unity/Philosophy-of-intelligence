'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const root=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
function runtime(globals={}){
  const app=vm.createContext(globals);app.window=app;
  for(const name of ['personas','agency','careers','shifts','simulation']){
    vm.runInContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),app,{filename:name+'.js'});
  }
  return app;
}
const places=[['Stone Town',-6.1622,39.1922],['Melbourne',-37.8136,144.9631],['Valparaíso',-33.05,-71.62],['Reykjavík',64.14,-21.94],['Suva',-18.14,178.44],['Rotterdam',51.92,4.48],['Mombasa',-4.05,39.67],['Open water',12,-42]];
function town(app,[name,lat,lon]=places[0]){
  const sim=app.CommonEarthSim.create({storage:null});
  assert.ok(sim.found({name,lat,lon,water:name==='Open water'}).ok);
  return sim;
}
const copy=value=>JSON.parse(JSON.stringify(value));
const contact=(site,target)=>({siteId:site.id,actor:'steward',mode:'walk',target,x:3,y:4,tx:4,ty:4});

test('every character has a persistent identity, outside interest and independent bounded skill profile',()=>{
  const app=runtime(),personas=app.EarthPersonas;
  const founders=new Set(),repairers=new Set();
  for(const place of places){
    const sim=town(app,place),s=sim.active(),raw=JSON.stringify(s);
    const roster=personas.list(s),residents=s.residents;
    assert.equal(roster.length,10);
    assert.deepEqual(Array.from(roster,p=>p.id),['steward',...residents.map(p=>p.id),'walker-0','walker-1','walker-2','walker-3','walker-4','driver']);
    assert.equal(new Set(roster.map(p=>p.name)).size,10);
    assert.equal(new Set(roster.map(p=>p.description)).size,10);
    assert.equal(new Set(roster.map(p=>JSON.stringify(p.traits))).size,10);
    assert.equal(new Set(roster.map(p=>JSON.stringify(p.aptitudes))).size,10);
    for(const p of roster){
      assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.traits)&&Object.isFrozen(p.aptitudes)&&Object.isFrozen(p.interests));
      assert.ok(p.description.includes(p.name)&&p.outsideWork.length>30&&p.interests.length>=2);
      assert.equal(p.home,place[0]);
      assert.equal(personas.profile(s,p.id),p);
      assert.equal(app.EarthAgency.identity(s,p.id).name,p.name);
      assert.equal(personas.profile(copy(s),p.id),p,'forecasts and imports reuse the immutable founding profile');
      for(const axis of personas.axes){
        const skill=p.aptitudes[axis],{min,max}=p.bounds[axis];
        assert.ok(Number.isInteger(skill)&&Number.isInteger(min)&&Number.isInteger(max));
        assert.ok(0<=min && min<=skill && skill<max && max<=100,axis+' for '+p.name);
      }
      assert.deepEqual(Array.from(p.strengths),Array.from(personas.axes).sort((a,b)=>p.aptitudes[b]-p.aptitudes[a]).slice(0,2));
      for(const trait of personas.traits)assert.ok(Number.isInteger(p.traits[trait])&&p.traits[trait]>=0&&p.traits[trait]<=100);
    }
    assert.ok(roster.some(p=>p.aptitudes.music>=67&&p.bounds.music.max>=87));
    const repairer=personas.profile(s,residents[1].id);
    assert.equal(repairer.name,residents[1].name);assert.equal(repairer.originRole,'Repairer');
    assert.ok(repairer.aptitudes.numeracy>=74 && repairer.bounds.numeracy.max>=92 && repairer.bounds.organisation.max>=68);
    assert.ok(repairer.aptitudes.music<=26 && repairer.bounds.music.max>=55 && repairer.bounds.music.max<70);
    assert.ok(repairer.bounds.craft.max>=76);
    assert.equal(JSON.stringify(s),raw,'looking at personalities must never write to the save');
    founders.add(roster[0].name);repairers.add(JSON.stringify(repairer.traits));
  }
  assert.ok(founders.size>=6);assert.equal(repairers.size,places.length);
});

test('sequential detached forecasts keep their hot founding profiles beyond the strong cache capacity',()=>{
  for(const globals of [{},{WeakRef:undefined}]){
    const app=runtime(globals),p=app.EarthPersonas;
    const sites=Array.from({length:128},(_,i)=>({id:'town-'+i,region:'Test coast',lat:i/2,lon:-i,buildings:[],residents:[]}));
    const actors=sites.map(s=>p.profile(s,'steward'));
    for(let round=0;round<3;round++){
      const reused=sites.map((s,i)=>p.profile(copy(s),'steward')===actors[i]);
      assert.ok(reused.slice(0,96).every(Boolean),'one excess site cannot flush the working set');
      if(!Object.hasOwn(globals,'WeakRef'))assert.ok(reused.filter(Boolean).length>=125,'live large worlds can reuse the bounded weak overflow');
    }
  }
});

test('off-duty porters keep unique names and original skills when the goods, economy, and routes change',()=>{
  const app=runtime(),s=town(app).active(),p=app.EarthPersonas;
  const names=new Set(p.list(s).map(person=>person.name));
  let routes=0;
  for(let from=0;from<9;from++)for(let to=0;to<9;to++){
    const id='carrier-'+from+'-'+to;
    if(Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))!==1){
      assert.equal(p.profile(s,id),null);continue;
    }
    const porter=p.profile(s,id);assert.ok(porter.name&&!names.has(porter.name),id);names.add(porter.name);routes++;
  }
  assert.equal(routes,24);
  for(const id of ['carrier-0-1-other','walker-04','__proto__','toString',null]){
    assert.equal(p.profile(s,id),null);assert.equal(app.EarthAgency.identity(s,id),null);
  }
  const id='carrier-0-1',porter=p.profile(s,id),name=porter.name;
  assert.ok(!p.list(s).some(person=>person.id===id));
  assert.equal(app.EarthAgency.identity(s,id).available,false);
  assert.ok(!app.EarthAgency.converse(s,{week:1},id,'work',contact(s,id)).ok);
  s.buildings=[{kind:'workshop',plot:0},{kind:'garden',plot:1}];
  assert.equal(p.list(s).find(person=>person.id===id),porter);
  const worker=app.EarthAgency.identity(s,id);
  assert.equal(worker.name,name);assert.equal(worker.role,'Garden courier');
  assert.ok(app.EarthAgency.converse(s,{week:1},id,'work',contact(s,id)).message.includes('food'));
  s.buildings=[{kind:'pier',plot:0},{kind:'market',plot:1}];
  assert.equal(app.EarthAgency.identity(s,id).name,name);assert.equal(app.EarthAgency.identity(s,id).role,'Exchange porter');
  s.funds=0;s.population+=20;s.buildings=[];s.careers={[id]:{jobId:'engineer'}};
  assert.equal(app.EarthAgency.identity(s,id).name,name);assert.equal(app.EarthAgency.identity(s,id).role,'Engineer');
  assert.ok(app.EarthAgency.identity(s,id).available,'the new workplace keeps this porter in town');
  assert.equal(p.list(s).find(person=>person.id===id),porter);assert.equal(p.profile(s,id),porter);
  assert.match(app.EarthAgency.converse(s,{week:2},id,'work',contact(s,id)).message,/engineer at Public works studio/);
  s.buildings=[{kind:'pier',plot:0},{kind:'market',plot:1}];
  assert.equal(p.list(s).filter(person=>person.id===id).length,1);
  assert.deepEqual(copy(p.profile(copy(s),id)),copy(porter));
});

test('a former porter stays in the directory from study through recruitment after the old supply run closes',()=>{
  const app=runtime(),s=town(app).active(),p=app.EarthPersonas,id='carrier-0-1';
  const porter=p.profile(s,id),pose=contact(s,id);
  s.buildings=[];
  for(const career of [
    {agreedPlan:'nurse'},
    {training:{targetId:'nurse',credits:5}},
    {training:{targetId:'nurse',credits:50,paused:true}},
    {qualifications:{nurse:14}},
    {application:{targetId:'nurse',phase:'screening'}},
    {application:{targetId:'nurse',phase:'deferred'}},
    {application:{targetId:'nurse',phase:'offer'}},
    {application:{targetId:'nurse',phase:'notice'}},
    {jobId:'nurse'}
  ]){
    s.careers={[id]:career};
    assert.ok(p.retainsPorter(s,id));
    assert.equal(p.list(s).find(person=>person.id===id),porter);
    assert.ok(app.EarthAgency.identity(s,id).available);
    assert.ok(app.EarthAgency.converse(s,{week:15},id,'interests',pose).ok);
    assert.equal(p.list(copy(s)).find(person=>person.id===id),porter);
  }
  s.careers={[id]:{history:[],qualifications:{}},'driver':{jobId:'nurse'},'carrier-0-8':{jobId:'nurse'}};
  assert.ok(!p.retainsPorter(s,id)&&!p.retainsPorter(s,'driver')&&!p.retainsPorter(s,'carrier-0-8'));
  assert.ok(!p.list(s).some(person=>person.id===id));
});

test('household lists preserve live and historically retained local carriers in directory order',()=>{
  const app=runtime(),site=town(app).active(),directory=app.EarthPersonas;
  const resident='carrier-1-4',visitor='carrier-0-1',commuter='carrier-3-4',unrecorded='carrier-4-5';
  site.communityLife={people:{[resident]:{status:'member'},[visitor]:{status:'visitor'},[unrecorded]:{status:'member'}}};
  site.agency={porters:[commuter]};
  site.careers={driver:{application:{coverId:resident}}};
  site.buildings=[{kind:'workshop',plot:0},{kind:'garden',plot:1}];
  const carriers=options=>Array.from(directory.list(site,options),p=>p.id).filter(directory.isPorterId);
  assert.deepEqual(carriers(),[visitor,resident,commuter]);
  assert.deepEqual(carriers({includeCommuters:false}),[visitor,resident]);
  delete site.communityLife.people[unrecorded];
  site.agency.porters.push(resident,visitor);
  assert.deepEqual(carriers({includeCommuters:false}),[visitor,resident]);
  delete site.communityLife;
  assert.deepEqual(carriers({includeCommuters:false}),[]);
  assert.deepEqual(carriers(),[visitor,resident,commuter]);
});

test('careers, legacy bonds, promises and outside-work replies refer to the same named person after a save round trip',()=>{
  const app=runtime(),sim=town(app),s=sim.active(),id=s.residents[1].id;
  const who=app.EarthPersonas.profile(s,id),before=JSON.stringify(s),pose=contact(s,id);
  assert.ok(app.EarthAgency.converse(s,sim.state,id,'interests',pose).message.includes(who.outsideWork));
  assert.equal(JSON.stringify(s),before);
  assert.ok(app.EarthAgency.converse(s,sim.state,id,'meal',pose).ok);
  assert.equal(s.residents[1].bond,1);
  assert.ok(app.EarthAgency.converse(s,sim.state,id,'news',pose).message.includes(app.EarthPersonas.profile(s,'steward').name));
  const restored=app.CommonEarthSim.readSave(JSON.stringify(sim.state)).sites[0];
  assert.deepEqual(copy(app.EarthPersonas.profile(restored,id)),copy(who));
  restored.careers={[id]:{jobId:'engineer',history:[{week:1,text:'Joined Public works studio.'}]}};
  assert.equal(app.EarthAgency.identity(restored,id).role,'Engineer');
  assert.match(app.EarthAgency.converse(restored,{week:2},id,'work',pose).message,/engineer at Public works studio/);
  assert.match(app.EarthAgency.converse(restored,{week:2},id,'news',pose).message,/Joined Public works studio/);
  restored.residents[1].promise={dueWeek:4};
  assert.match(app.EarthAgency.converse(restored,{week:2},id,'news',pose).message,/promise due in week 4/);
  assert.equal(app.EarthPersonas.profile(restored,id).originRole,'Repairer');
  restored.shift=app.EarthShifts.start({week:2,effort:4,sites:[restored]},restored,id).shift;
  const day=app.EarthShifts.view(restored,2);
  assert.equal(day.name,who.name);assert.equal(day.role,'Engineer');
  assert.ok(day.stops.find(stop=>stop.id==='care').label.includes('neighbour'));
  const different=copy(restored);different.residents[1].name='Taylor';
  assert.equal(app.EarthPersonas.profile(different,id).name,'Taylor','importing another founder with the same ID must preserve their own name');
  assert.equal(app.EarthPersonas.profile(restored,id).name,who.name);
});

test('reopening a founding preserves the previously generated names and aptitude rolls',()=>{
  const personas=runtime().EarthPersonas;
  const site={id:'historic-harbour',foundingRevision:18,lat:-33.05,lon:-71.62,name:'Valparaíso',region:'Valparaíso 🌊',residents:[],buildings:[]};
  const existing=[
    ['steward','Rafael Lagos','craft',27,29,49],
    ['walker-2','Matías Soto','organisation',88,26,48],
    ['driver','Renata Flores','numeracy',69,33,59],
    ['carrier-1-2','Pilar Díaz','music',53,68,98]
  ];
  for(const [id,name,hobby,sociability,music,ceiling] of existing){
    const person=personas.profile(site,id);
    assert.equal(person.name,name);
    assert.equal(person.hobbyAxis,hobby);
    assert.equal(person.traits.sociability,sociability);
    assert.equal(person.aptitudes.music,music);
    assert.equal(person.bounds.music.max,ceiling);
  }
});
test('four neighbouring districts reserve distinct native names, roles and future porter names across a save and founding',()=>{
  const app=runtime();
  vm.runInContext(fs.readFileSync(path.join(root,'community-life.js'),'utf8'),app);
  vm.runInContext(fs.readFileSync(path.join(root,'autonomy.js'),'utf8'),app);
  const sim=town(app),s=sim.active(),p=app.EarthPersonas;
  const districts=()=>[...sim.state.sites,...sim.state.communityLife.outposts];
  assert.equal(districts().length,4);assert.deepEqual(s.residents.map(v=>v.name).join('/'),'Mira/Idris/Sol');
  function allLocals(sites){
    const slots=['steward','driver',...Array.from({length:5},(_,i)=>'walker-'+i)];
    for(let from=0;from<9;from++)for(let to=0;to<9;to++){
      if(Math.abs(from%3-to%3)+Math.abs(Math.floor(from/3)-Math.floor(to/3))===1)slots.push('carrier-'+from+'-'+to);
    }
    return sites.flatMap(site=>[...slots,...site.residents.map(r=>r.id)].map(id=>p.birthProfile(site,id)));
  }
  const locals=allLocals(districts()),names=locals.map(v=>v.name);
  assert.equal(new Set(names).size,names.length,'future route hires have reserved names too');
  for(const slot of ['walker-0','walker-1','walker-2','walker-3','walker-4','driver']){
    const workers=districts().map(d=>p.birthProfile(d,slot));
    assert.equal(new Set(workers.map(worker=>worker.originRole)).size,1);
    assert.ok(new Set(workers.map(worker=>worker.workFocus.duty)).size>=3,'distinct responsibilities in '+workers[0].originRole);
  }
  const grower=p.profile(s,s.residents[0].id);
  assert(grower.description.includes(grower.workFocus.label.toLowerCase()));assert.equal(app.EarthAutonomy.intent(s,grower.id).activity,grower.workFocus.duty);
  const porter=p.birthProfile(s,'carrier-0-1');assert.match(porter.workFocus.duty,/lots 1 and 2/);
  const saved=app.CommonEarthSim.readSave(JSON.stringify(sim.state));assert(saved);
  const again=allLocals([...saved.sites,...saved.communityLife.outposts]);
  assert.deepEqual(again.map(v=>[v.name,v.identityKey]),locals.map(v=>[v.name,v.identityKey]));
  const moved=sim.found({name:'Another Coast',lat:0,lon:25});assert(moved.ok,moved.message);
  const larger=allLocals(districts()),keys=larger.map(v=>v.name);
  assert.equal(new Set(keys).size,keys.length);
  const original=sim.state.communityLife.profile;
  assert.equal(p.profile(sim.active(),'steward').name,original.name);assert.equal(p.profile(sim.active(),'steward').identityKey,original.identityKey);
  assert(app.CommonEarthSim.readSave(JSON.stringify(sim.state)));sim.destroy();
});

test('allocating a nearby founding never rerolls an old district or identities already carried between communities',()=>{
  const app=runtime(),p=app.EarthPersonas,legacy=copy(town(app).active());delete legacy.birthNames;
  const prior=p.birthProfile(legacy,'driver'),existing=JSON.stringify(legacy);
  assert.equal(prior.workFocus,undefined);
  const remote={...copy(legacy),id:'near-one',lat:legacy.lat+.2};
  p.allocateBirthNames(remote,[legacy]);assert(remote.birthNames);
  assert.equal(JSON.stringify(legacy),existing);assert.deepEqual(copy(p.birthProfile(copy(legacy),'driver')),copy(prior));
  const restarted=copy(legacy);delete restarted.birthNames;p.allocateBirthNames(restarted,[legacy,remote]);
  assert.equal(restarted.birthNames,undefined);assert.deepEqual(copy(p.birthProfile(restarted,'driver')),copy(prior));
  assert(!p.validBirthNames({'walker-1':'A','walker-2':'A'}));assert(!p.validBirthNames({'unknown-slot':'A'}));
});
test('new colleagues with the same title divide actual workplace responsibilities and keep them on reopening',()=>{
  const app=runtime();
  vm.runInContext(fs.readFileSync(path.join(root,'autonomy.js'),'utf8'),app);
  const sim=town(app),site=sim.active(),ids=['walker-0','walker-1','walker-2'];
  site.population=36;site.buildings=[{kind:'hall',plot:0},{kind:'hall',plot:2}];
  assert.equal(app.EarthCareers.openings(site,'teacher'),3);
  site.careers={};
  for(const id of ids)site.careers[id]={revision:1,skills:{},qualifications:{teacher:1},portfolios:{teacher:2},references:{},history:[],
    application:{targetId:'teacher',phase:'notice',autonomous:true,dueWeek:5}};
  const week={week:5,activeId:site.id};app.EarthCareers.tick(week,site);
  const appointments=ids.map(id=>app.EarthCareers.work(site,id));
  assert(appointments.every(post=>post.label==='High-school teacher'));
  assert.equal(new Set(appointments.map(post=>post.assignment.label)).size,3);
  assert.equal(new Set(appointments.map(post=>post.assignment.duty)).size,3);
  for(const id of ids){
    const job=app.EarthCareers.work(site,id),plan=app.EarthAutonomy.intent(site,id);
    assert.equal(plan.title,job.assignment.duty);assert.equal(plan.goal,job.assignment.goal);
    assert.equal(app.EarthCareers.work(copy(site),id).assignment.label,job.assignment.label);
    assert(app.EarthCareers.view(week,site,id).history[0].text.includes(job.assignment.label.toLowerCase()));
  }
  assert(app.EarthCareers.valid(site,5));
  const practical=ids.find(id=>app.EarthCareers.work(site,id).assignment.axis==='craft');
  const before=app.EarthCareers.view(week,site,practical).skills.craft;
  for(let i=0;i<26;i++){week.week++;app.EarthCareers.tick(week,site);}
  const after=app.EarthCareers.view(week,site,practical);
  assert.equal(after.skills.craft,before+1);assert(after.history.some(row=>row.text.includes('practical lessons assignment developed craft')));
  assert(app.EarthCareers.valid(site,31));sim.destroy();
});
