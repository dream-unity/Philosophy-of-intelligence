'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const names=[...fs.readFileSync(path.join(directory,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)].map(match=>match[1]);
const scripts=names.slice(0,names.indexOf('simulation')+1).map(name=>new vm.Script(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),{filename:name+'.js'}));
function game(snapshot){
  const ctx=vm.createContext({structuredClone,console,Date:class extends Date{static now(){return 500000;}}});ctx.window=ctx;
  for(const script of scripts)script.runInContext(ctx);
  const sim=ctx.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false}).ok);
  const world=sim.state,home=sim.active(),centre=ctx.EarthTownCentre;
  const quote=(route,criteria={})=>centre.quote(world,home,route,criteria);
  const sign=q=>sim.communityLife({...q,actor:'steward',action:'townCentre'});
  function save(){const text=JSON.stringify(world);assert.ok(ctx.CommonEarthSim.readSave(text));return text;}
  return {ctx,centre,sim,world,home,quote,sign,save};
}

test('a blind invitation commits before revealing a fixed identity and imports the person’s own savings once',()=>{
  const t=game(),before=t.save(),n=t.home.population,funds=t.home.funds,q=t.quote('random');
  for(const key of ['name','person','profile','identity','history'])assert.equal(q[key],undefined);
  assert.equal(q.price,0);assert.equal(t.save(),before);
  const a=t.sign(q);assert.ok(a.ok,a.message);
  const p=t.home.communityLife.people[a.id].profile;
  assert.equal(t.home.population,n+1);assert.equal(t.home.funds,funds);
  assert.equal(t.home.purses.people[a.id].balance,p.externalHistory.savings);
  assert.equal(t.home.purses.people[a.id].arrivalSavings,p.externalHistory.savings);
  assert.equal(t.home.purses.people[a.id].productionIncome||0,0);
  assert.equal(t.home.purses.people[a.id].entries[0].action,'arrival');
  assert.equal(t.ctx.EarthHousing.view(t.world,t.home).rows.find(row=>row.key===p.identityKey).name,p.name);
  const after=t.save();
  assert.equal(t.sign(q).ok,false);assert.equal(t.save(),after);
  const replay=game(before),again=replay.sign(replay.quote('random'));
  assert.equal(replay.home.communityLife.people[again.id].profile.identityKey,p.identityKey);
  assert.deepEqual(JSON.parse(JSON.stringify(replay.home.communityLife.people[again.id].profile)),JSON.parse(JSON.stringify(p)));
  const next=game(after);assert.equal(next.quote('random').cursor,1);
  assert.ok(next.sign(next.quote('random')).ok);assert.equal(next.world.widerEarth.cursors.open,2);next.save();
});
test('narrow and multiple search ranges cost more and every purchased range is met on the retained person',()=>{
  const t=game(),criteria={craft:[76,80],craftPotential:[92,95],curiosity:[61,68],aggression:[0,10],workEthic:[76,100],
    learningRate:[80,85],reputation:[70,80],reliability:[84,90]};
  t.home.funds=500;
  assert.equal(t.quote('targeted',{craft:[90,100],craftPotential:[20,80]}).ok,false);
  assert.equal(t.quote('targeted',{other:[2,8]}).ok,false);
  assert.ok(t.quote('targeted',{craft:[80,82]}).price>t.quote('targeted',{craft:[50,100]}).price);
  const q=t.quote('targeted',criteria),before=t.save();
  assert.ok(q.price>t.quote('targeted',{craft:[76,80]}).price);
  assert.equal(t.sign({...q,price:0}).ok,false);assert.equal(t.save(),before);
  const result=t.sign(q);assert.ok(result.ok,result.message);
  const p=t.home.communityLife.people[result.id].profile;
  for(const [key,[low,high]] of Object.entries(criteria)){
    const actual=key.endsWith('Potential')?p.bounds[key.slice(0,-9)].max:p.aptitudes[key]??p.traits[key]??p.externalHistory[key];
    assert.ok(actual>=low&&actual<=high,key+' '+actual);
  }
  assert.equal(t.home.funds,500-q.price);assert.equal(t.home.communityLife.townCentre.arrivals[0].price,q.price);
  t.save();
});
test('the two wider routes display a real projected housing deficit and a successful open invitation can exceed it',()=>{
  const t=game();
  for(let i=0;i<6;i++)assert.ok(t.sign(t.quote('random')).ok);
  assert.equal(t.ctx.EarthHousing.view(t.world,t.home).open,0);
  const q=t.quote('random'),paid=t.quote('targeted',{care:[80,100]});
  assert.equal(q.unhoused,1);assert.equal(paid.unhoused,1);
  assert.ok(t.sign(q).ok);
  const view=t.ctx.EarthHousing.view(t.world,t.home);
  assert.equal(view.unmet,1);assert.equal(view.namedMissing.length,1);assert.ok(t.home.housing.hardship.length);t.save();
});
test('a full roster or a depleted treasury leaves the applicant at home and both public and personal accounts unchanged',()=>{
  const t=game(),q=t.quote('targeted',{learningRate:[99,100],organisation:[99,100]});t.home.funds=0;
  const empty=t.save();assert.equal(t.sign(q).ok,false);assert.equal(t.save(),empty);
  let count=0;
  while(count<30&&t.sign(t.quote('random')).ok)count++;
  assert.ok(count>0&&count<25);
  const full=t.save(),result=t.sign(t.quote('random'));
  assert.equal(result.ok,false);assert.match(result.message,/roster/);assert.equal(t.save(),full);
});
test('a funding opportunity in an autonomous town uses the shared external register and an older home quote expires',()=>{
  const t=game(),peer=t.world.communityLife.outposts[0];
  // Intermediate calendar closes run the actual production markets, visiting
  // applicants and institutions, with the original character staying home.
  for(let i=0;i<16;i++)assert.ok(t.sim.advance().ok);
  assert.ok(peer.communityLife.townCentre?.serial>0);
  const last=peer.communityLife.townCentre.arrivals[0];
  const revised=t.quote(last.route,last.criteria);assert.ok(revised.cursor>0);
  assert.equal(t.sign({...revised,cursor:0}).ok,false);
  const a=t.sign(revised);assert.ok(a.ok,a.message);
  const person=t.home.communityLife.people[a.id].profile;
  assert.equal(person.externalHistory.index,revised.cursor+1);
  const remoteIds=t.world.communityLife.outposts.flatMap(s=>(s.communityLife.townCentre?.arrivals||[]).map(e=>e.person));
  assert.ok(!remoteIds.includes(person.identityKey));
  const broken=JSON.parse(t.save());broken.widerEarth.cursors[person.externalHistory.cohort]--;
  assert.equal(t.ctx.CommonEarthSim.readSave(JSON.stringify(broken)),null);
});
test('a visiting regional applicant pays for a named housing share and carries the same identity into the destination',()=>{
  const t=game();
  let accepted=null;
  for(let i=0;i<20&&!accepted;i++){
    assert.ok(t.sim.advance().ok);
    const beforeReading=JSON.stringify(t.world);
    const applicants=t.centre.applications(t.world,t.home);
    for(const town of t.world.communityLife.outposts)t.centre.applications(t.world,town);
    assert.equal(JSON.stringify(t.world),beforeReading,'inspecting home and neighbouring institutions must be read-only');
    for(const a of applicants){
      const q={route:'regional',site:t.home.id,week:t.world.week,generation:t.home.foundingRevision,id:a.id,identity:a.identity,terms:a.terms};
      if(!a.housing.available){
        const before=t.save();assert.equal(t.sign(q).ok,false);assert.equal(t.save(),before);continue;
      }
      if(!a.fit.personalYes||!a.fit.localYes)continue;
      const guest=t.home.communityLife.people[a.id],from=t.world.communityLife.outposts.find(s=>s.id===guest.visitFrom);
      const oldPopulation=from.population,homePopulation=t.home.population,homeFunds=t.home.funds;
      assert.equal(t.sign({...q,identity:'an outdated visitor'}).ok,false);
      assert.equal(t.sign({...q,terms:'older lower price'}).ok,false);
      const result=t.sign(q);assert.ok(result.ok,result.message);
      assert.equal(from.population,oldPopulation-1);assert.equal(t.home.population,homePopulation+1);assert.equal(t.home.funds,homeFunds+a.housing.price);
      const newResident=t.home.communityLife.people[a.id];
      assert.equal(newResident.status,'member');assert.equal(newResident.profile.identityKey,a.identity);
      assert.equal(t.home.housing.rights.find(r=>r.key===a.identity).home,a.housing.dwelling);
      assert.equal(t.sign(q).ok,false);t.save();accepted=a;
      break;
    }
  }
  assert.ok(accepted,'a willing applicant with housing and personal funds reached the Town Centre');
});
test('two tabs signing the same funded search save one person, one treasury debit and one imported opening balance',async()=>{
  const t=game();t.home.funds=100;
  const key='two-town-centre-tabs',book=new Map([[key,t.save()]]);
  const storage={getItem:k=>book.get(k)||null,setItem:(k,v)=>book.set(k,v),removeItem:k=>book.delete(k)};
  const open=()=>t.ctx.CommonEarthSim.create({storage,key,compressStorage:false});
  const first=open(),second=open(),criteria={reliability:[63,78]};
  const request=sim=>({...t.centre.quote(sim.state,sim.active(),'targeted',criteria),actor:'steward',action:'townCentre'});
  const a=request(first),b=request(second),receipt=await first.perform('communityLife',a);
  assert.ok(receipt.ok,receipt.message);
  const saved=book.get(key);assert.equal((await second.perform('communityLife',b)).ok,false);assert.equal(book.get(key),saved);
  const recovered=open(),home=recovered.active(),p=home.purses.people[receipt.id];
  assert.equal(home.population,t.home.population+1);assert.equal(home.funds,100-a.price);
  assert.equal(p.arrivalSavings,p.balance);assert.equal(recovered.state.widerEarth.serial,1);
  assert.equal(home.communityLife.townCentre.arrivals.length,1);
});
