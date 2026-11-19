'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const scripts=[...fs.readFileSync(path.join(directory,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)]
  .map(m=>m[1]);
const sources=scripts.slice(0,scripts.indexOf('simulation')+1).map(name=>[name,fs.readFileSync(path.join(directory,name+'.js'),'utf8')]);
const harbour={name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false};
function game(snapshot,location=harbour){
  let clock=500000;
  class Clock extends Date{static now(){return clock;}}
  const ctx=vm.createContext({Date:Clock,structuredClone,console});ctx.window=ctx;
  for(const [name,src] of sources)vm.runInContext(src,ctx,{filename:name+'.js'});
  const sim=ctx.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found(location).ok);
  const w=sim.state,home=sim.active(),R=ctx.EarthRegionalWorld,geo=R.geography(w,home);
  const fixture={home,sim,w,R,geo,ctx,clock(ms){clock+=ms;},
    propose(kind,x,y){return sim.regionalWork({kind,x,y,siteId:home.id,originId:geo.origin.id,week:w.week});},
    progress(){clock+=24100;return sim.production(w.productionSerial||0,()=>true);},
    save(){const raw=JSON.stringify(w);assert.ok(ctx.CommonEarthSim.readSave(raw));return raw;},
    get region(){return w.regionalWorld?.regions[geo.origin.id];},
    runToReturn(){for(let i=0;i<65&&this.region?.trips[home.id];i++)assert.ok(this.progress().ok);assert.ok(!this.region?.trips[home.id]);}
  };
  return fixture;
}
test('both neighbourhoods use one stable surveyed coast; observer reads no clock, position or territorial knowledge',()=>{
  const f=game(),{w,home,R,geo}=f;
  assert.equal(geo.towns.length,4);
  const neighbour=geo.towns.find(t=>t.site!==home),old=JSON.stringify(w),lng=geo.locate(neighbour.x,neighbour.y);
  assert.ok(Math.abs(lng.lat-neighbour.site.lat)<1e-8);
  assert.equal(R.geography(w,neighbour.site).origin.id,home.id);
  assert.equal(R.known(w,neighbour.site,neighbour.site.id,neighbour.x,neighbour.y),true);
  assert.equal(R.known(w,home,home.id,neighbour.x,neighbour.y),false);
  for(const {site} of geo.towns){
    const chart=new Set(R.surveyedCells(w,home,site.id).map(p=>p.x+','+p.y));
    for(let x=-10;x<=10;x+=.5)for(let y=-10;y<=10;y+=.5)assert.equal(chart.has(x+','+y),R.known(w,home,site.id,x,y));
    assert.equal(R.ledger(w,site).knownCells,chart.size);
  }
  const t=geo.towns[0];assert.equal(R.terrain(geo,t.x-.25,t.y-.25).kind,'water');
  assert.notEqual(R.terrain(geo,t.x+.05,t.y+.05).kind,'water');
  for(const s of [home,neighbour.site])for(const [x,y] of [[1.2,3.8],[-9.6,9.9],[neighbour.x,neighbour.y]]){
    assert.ok(R.inspect(w,s,x,y,home.id).label);R.routes(w,s);R.travellers(w,s);R.ledger(w,s);
  }
  assert.equal(JSON.stringify(w),old);
  assert.equal(R.inspect(w,home,geo.bounds.maxX+1,0),null);
});
test('an explicit survey dispatches an available real resident, then the same recovered save can support a working field and paid deliveries',()=>{
  const f=game(),{home,R,w}=f,point={x:1.43,y:1.11};
  home.food=40;home.materials=40;home.funds=50;
  assert.equal(f.propose('build',point.x,point.y).ok,false);
  let before=w.week;
  const order=f.propose('survey',point.x,point.y);assert.ok(order.ok,order.message);
  const outgoing=f.region.trips[home.id],key=outgoing.personId,openingCash=home.purses?.people?.[key]?.balance||0;
  assert.equal(home.funds,49);assert.equal(home.food,39);assert.equal(home.communityLife.away[key],'regional-field');
  assert.equal(R.known(w,home,home.id,point.x,point.y),false);assert.equal(w.week,before);
  const re=game(f.save()),trip=re.region.trips[home.id];
  assert.equal(trip.personId,key);assert.deepEqual(JSON.stringify(trip.path),JSON.stringify(outgoing.path));
  re.runToReturn();
  assert.equal(re.R.known(re.w,re.home,re.home.id,point.x,point.y),true);
  assert.ok(re.R.surveyedCells(re.w,re.home,re.home.id).some(p=>p.x===1.5&&p.y===1));
  assert.ok(re.home.purses.people[key].balance>=openingCash+1);
  assert.ok(re.R.residentRecord(re.w,re.home,key).records.some(n=>n.text.includes('reserved fund')));
  const construction=re.propose('build',point.x,point.y);assert.ok(construction.ok,construction.message);
  re.runToReturn();
  const work=re.R.works(re.w,re.home).find(p=>p.x===point.x&&p.y===point.y);
  assert.ok(work&&work.siteId===home.id&&work.builder);
  assert.equal(re.R.inspect(re.w,re.home,point.x,point.y).jurisdiction,null);
  const gather=re.propose('gather',point.x,point.y);assert.ok(gather.ok,gather.message);
  re.runToReturn();
  assert.ok(re.R.ledger(re.w,re.home).records.some(n=>/delivered 4/.test(n.text)));
  assert.equal(re.R.inspect(re.w,re.home,point.x,point.y).owner,home.name);re.save();
});
test('a crossing fork changes actual reachable waypoints without moving the traveller at the fork; reload restores position and time',()=>{
  const f=game(),{w,R,geo,home,ctx}=f,n=geo.towns[1].site;
  const cmd=(action,target)=>f.sim.communityLife({site:home.id,actor:'steward',week:w.week,action,target},
    {siteId:home.id,actor:'steward',mode:'walk',target:'market',x:2,y:4,tx:2,ty:4});
  assert.ok(cmd('walkTrail',n.id).ok);const trip=w.communityLife.journey,old=trip.path.join('/');
  f.clock(6500);const at=R.tripPosition(w,home,trip,.23);
  assert.ok(cmd('routeChoice','work').ok);assert.notEqual(trip.path.join('/'),old);
  const same=R.tripPosition(w,home,trip,.23);
  assert.ok(Math.hypot(same.x-at.x,same.y-at.y)<1e-7);
  const remade=game(f.save()),line=remade.R.tripLine(remade.w,remade.home,remade.w.communityLife.journey);
  assert.equal(line[0].fraction,0);assert.equal(line.at(-1).fraction,1);
  assert.ok(Math.abs(line.at(-1).x-geo.towns[1].x)<1e-7);
  assert.ok(R.travellers(w,home).some(p=>p.personId==='steward'&&p.destination===n.name));
  assert.ok(cmd('routeChoice','direct').ok);f.clock(6500);assert.ok(cmd('arrive',n.id).arrived);
  assert.ok(R.known(w,home,home.id,geo.towns[1].x,geo.towns[1].y));assert.equal(w.communityLife.homeId,home.id);
  const traversals=new Map();
  for(const id of trip.path)traversals.set(id,(traversals.get(id)||0)+1);
  for(const [id,times] of traversals)assert.equal(f.region.parcels[id].traffic[home.id],times,
    'inspecting a landmark and later arriving counts only the physical passages at '+id);
  assert.equal(ctx.EarthCommunityLife.residency(n,'steward'),'visitor');
});
test('two willing founders carry their own identities, skills, kit and homes to the surveyed point; observer retains citizenship',()=>{
  const f=game(),{geo,w,home,ctx,R}=f;
  home.food=50;home.materials=50;home.funds=60;
  const p={x:2.11,y:.95};assert.notEqual(R.terrain(geo,p.x,p.y).kind,'water');
  assert.ok(f.propose('survey',p.x,p.y).ok);f.runToReturn();
  const offer=f.propose('found',p.x,p.y);assert.ok(offer.ok,offer.message);
  const party=f.region.trips[home.id].crew.map(a=>({id:a.id,name:a.name,key:ctx.EarthPersonas.profile(home,a.id).identityKey}));
  const n=home.population,before=geo.towns.length;
  f.runToReturn();
  const towns=R.geography(w,home).towns,field=towns.find(t=>t.site.id.startsWith('field-'));
  assert.equal(towns.length,before+1);assert.ok(field);
  assert.ok(Math.abs(field.x-p.x)<1e-8&&Math.abs(field.y-p.y)<1e-8);
  assert.equal(home.population,n-2);assert.equal(field.site.population,2);
  assert.equal(ctx.EarthCommunityLife.census(w,field.site).here,2);
  assert.equal(w.communityLife.homeId,home.id);assert.equal(w.activeId,home.id);
  for(const person of party){assert.equal(home.communityLife.away[person.id],field.site.id);
    assert.ok(ctx.EarthPersonas.list(field.site).some(m=>m.identityKey===person.key&&m.name===person.name));}
  f.save();
});
test('the same recorded use supports or blocks a negotiated agreement according to host trust and reserve; public transfers balance',()=>{
  function check(hostTrust){
    const f=game(),{w,home,R,geo}=f,other=geo.towns[1].site,location={x:1,y:1};
    home.funds=30;home.food=30;home.materials=40;home.trust=60;
    assert.ok(f.propose('survey',location.x,location.y).ok);f.runToReturn();
    const r=f.region,id='2,2',p=r.parcels[id]||={uses:{}};
    p.uses[other.id]=3;p.claims={[other.id]:{week:w.week,by:other.residents[0].name,basis:'Repeated harvest'}};
    other.trust=hostTrust;other.food=0;other.funds=3;other.materials=12;
    const key=[other.id,home.id].sort().join('/');
    r.contacts[key]={a:home.id,b:other.id,terms:'disputed',cell:id,trust:30,step:w.regionalWorld.step,week:w.week,detail:'The competing uses closed the crossing.',meetings:1};
    assert.equal(R.passageAgreement(w,home,other),false);
    const kit={food:home.food,funds:home.funds,materials:home.materials};
    const proposal=f.propose('parley',location.x,location.y);assert.ok(proposal.ok,proposal.message);
    assert.equal(home.food,kit.food-2);assert.equal(home.materials,kit.materials-1);assert.equal(home.funds,kit.funds-2);
    const initialMaterial=other.materials,initialFunds=other.funds;
    for(let i=0;i<20&&r.trips[home.id];i++)R.advance(w,null,'production');
    assert.equal(r.trips[home.id],undefined);
    const accepted=R.passageAgreement(w,home,other);
    assert.equal(other.materials,initialMaterial+Number(accepted));assert.equal(other.funds,initialFunds+Number(accepted));
    assert.equal(home.materials,kit.materials-Number(accepted));
    f.save();return accepted;
  }
  assert.equal(check(70),true);assert.equal(check(18),false);
});
test('sealed reciprocal cargo remains with its named carriers during a dispute, then reaches each buyer exactly once',()=>{
  const f=game(),{w,R,ctx,home}=f,[farm,yard]=w.communityLife.outposts,life=ctx.EarthCommunityLife;
  w.week=6;farm.food=100;farm.materials=1;yard.food=8;yard.materials=100;
  life.tick(w);
  const out=farm.communityLife.freight,back=yard.communityLife.freight;
  assert.ok(out?.path?.length&&back?.path?.length);
  const positions=R.travellers(w,home);
  const carrier=positions.find(t=>t.siteId===farm.id&&t.personId===out.signer);
  assert.equal(carrier.cargo.food,out.amount);
  assert.equal(life.present(farm,out.signer),false);
  R.shareCrossing(w,farm,yard,out.signer,out.name,out.path);
  const r=f.region,agreement=r.contacts[[farm.id,yard.id].sort().join('/')];
  assert.ok(agreement);
  agreement.terms='disputed';agreement.cell=out.path[Math.floor(out.path.length/2)];
  const amounts=()=>[farm.food,farm.materials,yard.food,yard.materials],signed=amounts();
  w.week++;life.tick(w);
  assert.deepEqual(amounts(),signed);assert.equal(out.due,w.week+1);
  assert.equal(farm.communityLife.freight.amount,out.amount);assert.equal(yard.communityLife.freight.amount,back.amount);
  assert.ok(life.valid(w,()=>true));
  agreement.terms='passage';w.week++;life.tick(w);
  const delivered=amounts();
  assert.deepEqual(delivered,[signed[0],signed[1]+back.amount,signed[2]+out.amount,signed[3]]);
  life.tick(w);assert.deepEqual(amounts(),delivered);
  assert.equal(life.present(farm,out.signer),true);
});
test('sailing and driving obey different access, and malformed paths cannot enter an imported world',()=>{
  const f=game(undefined,{name:'Open Ocean',lat:1,lon:-135,water:true}),n=f.geo.towns[1];
  assert.ok(f.R.crossingPath(f.w,f.home,n.site,'walk').length>1);
  assert.equal(f.R.crossingPath(f.w,f.home,n.site,'van'),null);
  const req={site:f.home.id,actor:'steward',week:f.w.week,target:n.site.id};
  const drive=f.sim.communityLife({...req,action:'driveTrail'},{siteId:f.home.id,actor:'steward',mode:'drive',vehicle:'van'});
  assert.equal(drive.ok,false);assert.equal(f.w.communityLife.journey,null);
  const walk=f.sim.communityLife({...req,action:'walkTrail'},{siteId:f.home.id,actor:'steward',mode:'walk',target:'market',x:0,y:0,tx:0,ty:0});
  assert.ok(walk.ok,walk.message);
  const raw=JSON.parse(f.save());raw.communityLife.journey.path=[{}];
  assert.equal(f.ctx.CommonEarthSim.readSave(JSON.stringify(raw)),null);
});
test('the same dry leg takes less of a shift after a resident supplies directions; the note cannot reopen a disputed crossing',()=>{
  const f=game(),{home,w,R,geo,ctx}=f,next=geo.towns[1].site;
  const path=R.crossingPath(w,home,next);
  const selected=path.slice(1).find(id=>{const [i,j]=id.split(',').map(Number);return R.terrain(geo,i*.5,j*.5).kind!=='water';});
  assert.ok(selected);
  const before=R.routeEffort(w,home,path);
  const book=home.practice||={serial:1,open:[],events:[]};book.wayfinding={[selected]:{by:ctx.EarthPersonas.profile(home,'steward').identityKey,week:w.week,choice:1}};
  const after=R.routeEffort(w,home,path);
  assert.ok(Math.abs(before-after-.15)<.00001,'the same mapped landmark saves its travel cost');
  R.shareCrossing(w,home,next,'steward',w.communityLife.profile.name,path);
  const r=f.region,agreement=r.contacts[[home.id,next.id].sort().join('/')];
  agreement.terms='disputed';agreement.cell=selected;
  (r.parcels[selected]||={uses:{}}).claims={[next.id]:{week:w.week,by:next.residents[0].name,basis:'Boundary claim'}};
  assert.equal(R.routeEffort(w,home,path),Infinity);
});
test('coincident legacy settlement pins separate on viable ground, survive reordering and retain every household account',()=>{
  const f=game(),source=JSON.parse(f.save()),peers=source.communityLife.outposts;
  for(const p of peers){p.lat=source.sites[0].lat+.012;p.lon=source.sites[0].lon+.011;}
  const family=peers.map(s=>[s.id,s.population,s.funds,s.food,s.materials]),original=JSON.stringify(source);
  const first=game(original),reversed=JSON.parse(original);reversed.communityLife.outposts.reverse();
  const second=game(JSON.stringify(reversed)),third=game(first.save());
  function map(g){return g.geo.towns.filter(t=>t.site.id!==g.home.id).toSorted((a,b)=>a.site.id.localeCompare(b.site.id)).map(t=>[t.site.id,t.site.lon,t.site.lat]);}
  assert.deepEqual(JSON.stringify(map(first)),JSON.stringify(map(second)));assert.deepEqual(JSON.stringify(map(first)),JSON.stringify(map(third)));
  assert.equal(new Set(map(first).map(([id,x,y])=>x+','+y)).size,3);
  for(const [id,population,funds,food,materials] of family){
    const town=first.geo.towns.find(t=>t.site.id===id);
    assert.deepEqual([town.site.population,town.site.funds,town.site.food,town.site.materials],[population,funds,food,materials]);
    assert.notEqual(first.R.terrain(first.geo,town.x,town.y).kind,'water');
    const old=peers.find(p=>p.id===id),P=first.ctx.EarthPersonas;
    for(const person of P.list(old)){
      const firstBirth=P.birthProfile(town.site,person.id);
      assert.equal(JSON.stringify(firstBirth),JSON.stringify(P.birthProfile(old,person.id)));
      assert.equal(JSON.stringify(firstBirth),JSON.stringify(third.ctx.EarthPersonas.birthProfile(third.geo.towns.find(t=>t.site.id===id).site,person.id)));
    }
  }
  const oldest=map(first)[0];assert.equal(oldest[1],peers[0].lon);assert.equal(oldest[2],peers[0].lat);
});

test('a field worker can give an observation to a traveller who can bring that one parcel to a foreign meeting',()=>{
  const f=game(),{w,sim,home,geo,R,ctx}=f,point={x:1.43,y:1.11};
  home.food=40;home.materials=40;home.funds=50;
  assert(f.propose('survey',point.x,point.y).ok);const worker=f.region.trips[home.id].personId;
  const pose=(target,tx=6)=>({siteId:sim.active().id,actor:ctx.EarthAgency.actorId(sim.active()),mode:'walk',target,x:6,y:6,tx,ty:6});
  const topics=id=>ctx.EarthAgency.topics(sim.active(),w,id);
  const act=(person,option,tx)=>sim.converse(person,option.id,()=>pose(person,tx));
  f.runToReturn();
  const receipt=R.fieldAccount(w,home,ctx.EarthPersonas.profile(home,worker));assert(receipt,JSON.stringify(R.ledger(w,home).records));
  const ask=topics(worker).find(o=>o.id.startsWith('field:ask:')),copy=topics(worker).find(o=>o.id.startsWith('field:copy:'));assert(ask&&copy);
  const foreign=geo.towns.find(t=>t.site.id!==home.id&&!R.known(w,home,t.site.id,point.x,point.y)).site;
  const before=JSON.stringify(w);assert.match(act(worker,ask).message,/I was on that crew/);
  assert.equal(JSON.stringify(w),before);assert.equal(act(worker,copy,13).ok,false);
  assert(act(worker,copy).changed);assert(!R.known(w,home,foreign.id,point.x,point.y));
  const localWitness=ctx.EarthPersonas.profile(home,worker).name;
  const command=(action,target)=>sim.communityLife({site:sim.active().id,actor:'steward',week:w.week,action,target},pose('market'));
  assert(command('depart',foreign.id).ok);f.clock(7000);assert(command('arrive',foreign.id).ok);
  const delegate=ctx.EarthCommunityLife.hostFor(foreign).id;
  const file=topics(delegate).find(o=>o.id.startsWith('field:file:'));assert(file);assert.match(file.label,new RegExp(localWitness));
  const outsider=ctx.EarthPersonas.list(foreign).find(p=>p.id!==delegate&&p.id!=='steward');
  assert(!topics(outsider.id).some(o=>o.id.startsWith('field:file:')));
  const sharedBefore=Object.keys(f.region.knowledge[foreign.id]||{}).length;
  assert(!act(delegate,file,12).ok);assert(!R.known(w,foreign,foreign.id,point.x,point.y));
  assert(act(delegate,file).changed);assert(R.known(w,foreign,foreign.id,point.x,point.y));
  assert.equal(Object.keys(f.region.knowledge[foreign.id]).length,sharedBefore+1);assert(!act(delegate,file).ok);
  const again=game(f.save()),surviving=again.w.communityLife.fieldNotes;assert(surviving.some(n=>n.sourceName===localWitness));
});

test('a willing resident carries a field account away from a completed mutual visit only if the other person actually hosted them',()=>{
  const f=game(),{home,w,sim,R,ctx}=f,point={x:1.43,y:1.11};
  home.food=40;home.materials=40;home.funds=50;
  assert(f.propose('survey',point.x,point.y).ok);const worker=f.region.trips[home.id].personId;f.runToReturn();assert(sim.advance().ok);
  const reader=ctx.EarthPersonas.list(home).find(p=>p.id!==worker&&p.id!=='steward'&&p.traits.curiosity>=62&&home.autonomy.people[p.id]);
  assert(reader);assert(R.fieldAccount(w,home,ctx.EarthPersonas.profile(home,worker)));const week=w.week;
  const copy=JSON.stringify(w);
  for(const arrived of [false,true]){
    const test=game(copy),site=test.home;
    site.autonomy.people[worker].history[0]={kind:'visit',week,venue:'garden',target:reader.id};
    site.autonomy.people[reader.id].history[0]={kind:'host',week,venue:'garden',target:arrived?worker:'steward'};
    test.w.week++;test.ctx.EarthDialogue.closeWeek(site,test.w);
    const notes=test.w.communityLife.fieldNotes||[];
    assert.equal(notes.some(n=>n.reader===reader.identityKey&&n.sourceKey===ctx.EarthPersonas.profile(home,worker).identityKey),arrived);
    if(arrived){
      const row=notes.find(n=>n.reader===reader.identityKey);assert.equal(row.week,test.w.week);
      const current=notes.length;test.ctx.EarthDialogue.closeWeek(site,test.w);assert.equal(test.w.communityLife.fieldNotes.length,current);
    }
    test.sim.destroy();
  }
  sim.destroy();
});

test('an unbuilt field in the former town exclusion circle accepts work and the crew walks all the way to its surveyed point',()=>{
  const f=game(),{w,home,R,geo}=f,spot={x:.22,y:.20};
  home.funds=40;home.food=40;home.materials=40;
  assert.equal(R.streetFootprint(geo,0,0).site.id,home.id);
  assert.equal(R.streetFootprint(geo,spot.x,spot.y),null);
  assert.equal(R.inspect(w,home,0,0).choices.find(c=>c.kind==='build').available,false);
  assert.equal(R.inspect(w,home,spot.x,spot.y).choices.find(c=>c.kind==='build').available,true);
  const order=f.propose('build',spot.x,spot.y);assert.ok(order.ok,order.message);
  const person=()=>R.travellers(w,home).find(t=>t.siteId===home.id&&t.kind==='build');
  assert.equal(person().x,0);assert.equal(person().y,0);
  f.clock(1100);
  const moving=person();assert.ok(moving.x>0&&moving.x<spot.x);assert.ok(moving.y>0&&moving.y<spot.y);
  assert.ok(f.progress().ok);assert.equal(person().phase,'working');assert.equal(person().x,spot.x);assert.equal(person().y,spot.y);
  assert.ok(f.progress().ok);assert.equal(person().phase,'returning');assert.equal(person().x,spot.x);assert.equal(person().y,spot.y);
  f.runToReturn();assert.ok(R.works(w,home).some(p=>p.x===spot.x&&p.y===spot.y));f.save();
});
test('the poles and date line retain kilometre distances, source profiles and cell addresses across a reload',()=>{
  for(const lat of [90,-90]){
    const f=game(undefined,{name:'Polar research haven',lat,lon:179.99,water:true});
    const expected=[[0,0],[-2.9,2.1],[4.9,-3.4],[3.2,5.6]];
    function verify(R,w,base){
      const geo=R.geography(w,base);
      for(const [i,t] of geo.towns.entries()){
        assert.ok(Math.hypot(t.x-expected[i][0],t.y-expected[i][1])<1e-7);
        assert.ok(R.crossingPath(w,base,t.site));
      }
      for(const [x,y] of [[9.8,-9.8],[-8.9,8.3],[.01,.02]]){
        const roundtrip=geo.project(geo.locate(x,y));assert.ok(Math.hypot(roundtrip.x-x,roundtrip.y-y)<1e-7);
      }
    }
    verify(f.R,f.w,f.home);
    const older=JSON.parse(f.save()),peers=older.communityLife.outposts;
    for(let i=0;i<3;i++)Object.assign(peers[i],f.ctx.EarthCommunityLife.nearLocation(older.sites[0],i,true));
    const historic=game(JSON.stringify(older));verify(historic.R,historic.w,historic.home);
    for(const t of historic.geo.towns.slice(1)){
      const old=peers.find(s=>s.id===t.site.id);
      assert.equal(t.site.birthCoordinate.lat,old.lat);
      assert.equal(JSON.stringify(historic.ctx.EarthPersonas.birthProfile(t.site,'walker-0')),JSON.stringify(f.ctx.EarthPersonas.birthProfile(old,'walker-0')));
    }
    assert.ok(f.progress().ok);const reopened=game(f.save());
    verify(reopened.R,reopened.w,reopened.home);
  }
});
test('an agreement opens precisely the witnessed parcel and survives a later meeting about a different property',()=>{
  const f=game(),{w,home,R,geo}=f,peer=geo.towns[1].site;
  home.trust=peer.trust=80;home.food=peer.food=45;home.materials=peer.materials=40;
  R.shareCrossing(w,home,peer,'steward','Surveyor',['0,0']);
  const r=f.region,k=[home.id,peer.id].sort().join('/');
  for(const id of ['2,2','3,2']){
    r.parcels[id]={uses:{[peer.id]:2},owner:peer.id};
    r.knowledge[home.id][id]=w.week;
  }
  const canGather=(x)=>R.inspect(w,home,x,1).choices.find(c=>c.kind==='gather').available;
  assert.equal(canGather(1),false);assert.equal(canGather(1.5),false);
  R.shareCrossing(w,home,peer,'steward','Surveyor',['0,0','1,0','1,1','2,1','2,2']);
  assert.equal(r.contacts[k].terms,'joint');
  assert.equal(canGather(1),true);assert.equal(canGather(1.5),false);
  w.regionalWorld.step+=3;home.trust=peer.trust=48;
  R.shareCrossing(w,home,peer,'steward','Surveyor',['3,2']);
  assert.equal(r.contacts[k].cell,'3,2');assert.notEqual(r.contacts[k].terms,'joint');
  assert.equal(canGather(1),true);assert.equal(canGather(1.5),false);
  const loaded=game(f.save());assert.ok(loaded.R.inspect(loaded.w,loaded.home,1,1).agreements.some(a=>a.terms==='joint'));
});

test('an ungoverned district finances, finishes and occupies the same courtyard on and off camera',()=>{
  const f=game(),town=f.w.communityLife.outposts[1];
  Object.assign(town,{population:19,food:80,funds:80,materials:80});
  const opening=f.save();
  function run(observe){
    const f=game(opening),town=f.w.communityLife.outposts[1],city=f.ctx.EarthCityModel;
    let plot=null,relief=false,capacityBefore=null;
    for(let n=0;n<100;n++){
      if(observe){
        const geo=f.R.geography(f.w,town),point=geo.towns.find(t=>t.site===town);
        f.R.inspect(f.w,town,point.x,point.y,town.id);
        f.R.travellers(f.w,town);
        f.ctx.EarthCommunityLife.districtProfile(f.w,town);
        f.ctx.EarthHousing.view(f.w,town);
      }
      assert.ok(f.sim.advance().ok);
      const agreement=town.civicInitiatives?.history?.find(p=>p.choiceId==='precinct:homes');
      const job=agreement&&town.construction?.find(j=>j.id===agreement.jobId);
      if(job&&plot===null){
        plot=job.precinct;
        capacityBefore=city.housingCapacity(town);
        assert.equal(job.paid.funds,7);assert.equal(job.paid.materials,4);
        assert.equal(town.city.precincts[plot].use,'open');
      }
      if(agreement?.works?.relief?.length)relief=true;
      if(plot===null||town.city.precincts[plot].use!=='homes')continue;
      const directory=f.ctx.EarthHousing.view(f.w,town);
      const opened=directory.homes.find(h=>h.key==='precinct-'+plot);
      assert.ok(opened);assert.ok(city.housingCapacity(town)>=capacityBefore+6);
      if(opened.occupants.length){
        assert.ok(relief,'A replacement covered a departing signatory’s shift.');
        const tenant=opened.occupants[0];
        assert.ok(town.housing.rights.some(r=>r.key===tenant.key&&r.home===opened.key));
        assert.ok(f.ctx.CommonEarthSim.readSave(JSON.stringify(f.w)));
        return JSON.stringify(f.w);
      }
    }
    assert.fail('The financed courtyard should open and a named resident should take up a place.');
  }
  assert.equal(run(true),run(false));
});

test('a housing request competes for public reserves and available land',()=>{
  function decision(population){
    const f=game(),town=f.w.communityLife.outposts[1];
    Object.assign(town,{population,food:80,funds:80,materials:80});
    for(let i=0;i<3;i++)assert.ok(f.sim.advance().ok);
    return town.civicInitiatives?.active?.choiceId;
  }
  assert.equal(decision(19),'precinct:homes');
  assert.notEqual(decision(10),'precinct:homes');
});

test('a territorial expedition reserves its people and wages, survives reopening and changes access to an actual parcel',()=>{
  const f=game(),life=f.ctx.EarthCommunityLife,combat=f.ctx.EarthBorderConflict;
  let start,clash,last,seenReload=false;
  for(let n=0;n<72;n++){
    assert.ok(f.progress().ok);
    const c=f.region.border;
    if(c&&!start){
      const attacker=f.geo.towns.find(t=>t.site.id===c.attacker).site;
      assert.equal(life.entryRule(attacker),'hosted');
      assert.equal(attacker.communityLife.away[c.unit.id],'border-duty');
      assert.equal(c.wages,2);assert.equal(c.food,3);
      assert.ok(!life.fieldCandidates(attacker,f.w).includes(c.unit.id));
      start={attacker:c.attacker,defender:c.defender,cell:c.cell};
    }
    if(c?.phase==='fighting'){
      const units=combat.visible(f.w,f.geo,f.region);assert.equal(units.length,2);
      assert.notEqual(units[0].siteId,units[1].siteId);assert.equal(units[0].phase,'fighting');
      clash={...c.guard};
      if(!seenReload){
        const raw=f.save(),reopened=game(raw);
        assert.equal(reopened.region.border.guard.key,c.guard.key);
        assert.equal(reopened.region.border.rounds,c.rounds);seenReload=true;
      }
    }
    if(f.region.lastBorder){last=f.region.lastBorder;break;}
    if(n%3===2)assert.ok(f.sim.advance().ok);
  }
  assert.ok(start&&clash&&seenReload&&last);
  const lot=f.region.parcels[last.cell];assert.equal(last.cell,start.cell);
  assert.ok(last.captured);assert.equal(lot.charter,start.attacker);assert.equal(lot.occupation.former,start.defender);
  assert.ok(lot.claims[start.defender]&&lot.claims[start.attacker]);
  const attacker=f.geo.towns.find(t=>t.site.id===start.attacker).site,defender=f.geo.towns.find(t=>t.site.id===start.defender).site;
  const local=defender.communityLife.entryRecords.find(e=>e.kind==='invasion');
  assert.ok(local.official);assert.equal(local.originId,attacker.id);
  assert.ok(attacker.communityLife.entryRecords.some(e=>e.kind==='campaign'&&e.reported>e.week));
  assert.equal(defender.communityLife.away[clash.id],'deceased');
  const diary=defender.communityLife.memorial.find(e=>e.key===clash.key);assert.ok(diary);
  for(let n=0;n<35&&f.region.border;n++)assert.ok(f.progress().ok);
  assert.ok(!f.region.border);assert.equal(lot.occupation.holder,attacker.id);
  assert.ok(!life.census(f.w,defender,true).ids.includes(clash.id));f.save();
});

test('a sponsor changes what happens to the same named foreign surveyor at a hosted boundary',()=>{
  const f=game(),{ctx,w,geo,home}=f,life=ctx.EarthCommunityLife,clash=ctx.EarthBorderConflict;
  const origin=geo.towns.find(t=>t.site.id===home.id),host=geo.towns.find(t=>life.entryRule(t.site)==='hosted');
  const id=life.fieldCandidates(home,w).find(id=>id!=='driver'),person=ctx.EarthPersonas.profile(home,id);
  const cell=Math.round(host.x*2)+','+Math.round(host.y*2);
  const trip={kind:'survey',phase:'outbound',crew:[{id,name:person.name}],personId:id,siteId:home.id,
    target:cell,path:[cell],index:0,kit:{funds:1,food:1,materials:0},cargo:{food:0,materials:0}};
  const region={contacts:{},trips:{[home.id]:trip}};
  home.communityLife.away[id]='regional-field';
  assert.ok(clash.challenge(w,geo,region,origin,trip,cell));
  assert.equal(host.site.communityLife.away[trip.challenge.guard.id],'border-duty');
  const guard=trip.challenge.guard.id,trust=life.personalAccess(w,host.site,person).score;
  const chair=life.hostFor(host.site);
  life.recordReception(w,host.site,home,person,'shift',chair);
  assert.ok(life.personalAccess(w,host.site,person).score>trust);
  assert.ok(clash.resolveChallenge(w,geo,region,origin,trip,()=>assert.fail('Host accepted this entry.')));
  assert.equal(trip.challenge,undefined);assert.equal(host.site.communityLife.away[guard],undefined);
  assert.equal(clash.challenge(w,geo,region,origin,trip,cell),false);
});
