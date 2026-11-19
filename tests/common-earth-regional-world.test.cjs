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
  }
  const oldest=map(first)[0];assert.equal(oldest[1],peers[0].lon);assert.equal(oldest[2],peers[0].lat);
});
