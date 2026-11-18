'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const source=fs.readFileSync(path.join(game,'app.js'),'utf8');
function sourceBetween(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
const survey=sourceBetween('  function validPreparedSurvey','  async function found()');
const choose=sourceBetween('  function selectPlace(point,fly)','  function choosePlace');
const destination={lat:-24,lon:75,water:true,name:'Indian Ocean',region:'Indian'};
function ok(result){assert.equal(result.ok,true,result.message);}
function setup(){
  let now=12345;
  const ctx=vm.createContext({Date:class extends Date{static now(){return now;}},structuredClone});ctx.window=ctx;
  for(const file of ['pursuits','simulation'])vm.runInContext(fs.readFileSync(path.join(game,file+'.js'),'utf8'),ctx);
  const sim=ctx.CommonEarthSim.create({storage:null});ctx.sim=sim;
  ok(sim.found({name:'Sponsor',lat:12,lon:17}));const sponsor=sim.active();
  for(const p of sponsor.residents.slice(0,2))ok(sim.act('listen:'+p.id));
  ok(sim.found({name:'Outpost',lat:23,lon:9}));ok(sim.advance());
  const outpost=sim.active(),offer=sim.sponsorshipOffer(sponsor.id);
  for(const key of Object.keys(offer.goods))sponsor[key]=offer.goods[key]+(offer.reserves[key]||0);
  sponsor.funds-=2;
  const fields={'found-name':{value:'Reef Harbour'},'commission-at-founding':{checked:true},
    'site-inspector':{scrollIntoView(){}},'place-name':{focus(){}}};
  Object.assign(ctx,{preparedSurvey:null,preparingSurvey:false,foundingSponsor:sponsor.id,selected:{...destination},view:'world',
    $:id=>fields[id],known:p=>sim.state.sites.find(s=>s.lat===p.lat&&s.lon===p.lon),atlas:{focus(){},setSelection(){}},
    personalWork:{open(key){ctx.openedWork=key;}},setView:view=>{ctx.view=view;},
    async openSite(s){ok(await sim.perform('visit',s.id));ctx.selectPlace(s,false);ctx.setView('street');}
  });
  vm.runInContext(choose+survey,ctx);
  return {ctx,sim,fields,sponsor,outpost,work(action){
    const v=ctx.EarthPursuits.view(sim.active());
    const market=action==='collect'?{siteId:v.siteId,actor:v.actorId,mode:'walk',target:'market',x:15,y:23,tx:15,ty:23.04}:undefined;
    ok(sim.pursue({siteId:v.siteId,generation:v.generation,actorId:v.actorId,serial:v.serial,kind:'funds',action},market));
    if(action==='start')now+=15_000;
  }};
}

test('earn the missing founding supplies and resume the same named survey from another sponsor',async()=>{
  const {ctx,fields,sim,sponsor,outpost,work}=setup();
  const before={funds:sponsor.funds,people:sponsor.population,week:sim.state.week,effort:sim.state.effort};
  assert.equal(sim.foundingOffer(destination,sponsor.id).preparation.amount,2);
  await ctx.prepareFounding();
  assert.equal(sim.state.activeId,sponsor.id);assert.notEqual(sim.state.activeId,outpost.id);
  assert.equal(ctx.view,'street');assert.equal(ctx.openedWork,'funds');
  assert.equal(fields['found-name'].value,'');assert.equal(fields['commission-at-founding'].checked,false);
  assert.equal(sponsor.funds,before.funds);assert.equal(sponsor.population,before.people);
  assert.equal(sim.state.week,before.week);assert.equal(sim.state.effort,before.effort);
  work('start');work('collect');
  ctx.preparedSurvey=structuredClone(ctx.preparedSurvey); // tab-view snapshots carry plain data
  ctx.resumeFounding();
  assert.equal(ctx.view,'world');assert.deepEqual({...ctx.selected},destination);assert.equal(ctx.foundingSponsor,sponsor.id);
  assert.equal(fields['found-name'].value,'Reef Harbour');assert.equal(fields['commission-at-founding'].checked,true);
  assert.equal(sim.foundingOffer(ctx.selected,ctx.foundingSponsor).available,true);
  assert.equal(sim.state.sites.length,2);assert.equal(sim.state.week,before.week);assert.equal(sim.state.effort,before.effort);
});
test('a restarted sponsor cannot inherit a saved departure proposal',async()=>{
  const {ctx,sim,sponsor}=setup();await ctx.prepareFounding();
  assert.equal(ctx.validPreparedSurvey(ctx.preparedSurvey),true);
  ok(sim.manageSite(sponsor.id,'restart'));
  assert.equal(ctx.validPreparedSurvey(ctx.preparedSurvey),false);ctx.resumeFounding();
  assert.equal(ctx.preparedSurvey,null);assert.equal(ctx.view,'world');assert.equal(sim.state.sites.length,2);
});

test('arrival rechecks a sponsor whose missing supplies were earned in another tab',async()=>{
  const {ctx,sponsor,fields}=setup(),visit=ctx.openSite;
  ctx.openSite=async s=>{sponsor.funds+=2;await visit(s);};
  await ctx.prepareFounding();
  assert.equal(ctx.openedWork,undefined);assert.equal(ctx.view,'world');
  assert.equal(fields['found-name'].value,'Reef Harbour');assert.equal(fields['commission-at-founding'].checked,true);
  assert.equal(ctx.foundingSponsor,sponsor.id);assert.deepEqual({...ctx.selected},destination);
});
