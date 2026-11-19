'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
function setup({coast=false}={}){
  let now=12345;
  const context=vm.createContext({structuredClone,Date:class extends Date{static now(){return now;}}});
  context.window=context;
  if(coast)context.EarthAtlas={nearOceanShore:()=>true};
  for(const file of ['fisheries','simulation'])vm.runInContext(fs.readFileSync(path.join(directory,file+'.js'),'utf8'),context);
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  return {open:()=>context.CommonEarthSim.create({storage}),time:ms=>now+=ms,context};
}
const shore={x:9,y:24.5,mode:'walk'};
const ocean={lat:-24,lon:75,name:'Indian Ocean',water:true};
function ok(result){assert.equal(result.ok,true,result.message);return result;}

test('a shared handline feeds a depleted community without building a dock or spending weekly effort',async()=>{
  const g=setup();let sim=g.open();ok(sim.found(ocean));
  const site=sim.active(),p={...shore,siteId:site.id};
  sim.state.effort=0;site.food=0;site.materials=0;site.funds=0;
  assert.equal(sim.handlineOffer({...p,y:9}).action,'shore');
  assert.equal(sim.useHandline({...p,y:9},'cast').ok,false);
  assert.equal(sim.handlineOffer(p).food,1);
  ok(await sim.perform('useHandline',p,'cast'));assert.equal(site.food,0);
  assert.equal(sim.handlineOffer(p).action,'wait');
  assert.equal(sim.useHandline(p,'land').ok,false);
  sim.destroy();sim=g.open();assert.ok(sim.active().handline);
  g.time(5000);
  assert.equal(sim.handlineOffer({...p,x:1}).action,'return');
  assert.equal(sim.useHandline({...p,x:1},'land').ok,false);
  ok(await sim.perform('useHandline',p,'land'));
  assert.equal(sim.useHandline(p,'land').ok,false,'one catch can be collected only once');
  assert.equal(sim.active().food,1);assert.equal(sim.state.effort,1);
  assert.equal(sim.handlineOffer(p).action,'cast');
  sim.destroy();
});

test('sailing to feeding seabirds increases the harvest and a float remains in its own community',()=>{
  const g=setup(),sim=g.open();ok(sim.found(ocean));
  const site=sim.active(),p={siteId:site.id,mode:'boat',...g.context.EarthFisheries.shoal(site,sim.state.week)};
  assert.equal(sim.handlineOffer(p).food,2);
  ok(sim.useHandline(p,'cast'));
  ok(sim.found({lat:47,lon:8,water:false,name:'Highland'}));const inland=sim.active();
  assert.equal(sim.handlineOffer({...p,siteId:inland.id}),null);
  assert.equal(sim.useHandline(p,'land').ok,false);
  const waiting=JSON.stringify(site.handline);
  ok(sim.advance());
  assert.equal(JSON.stringify(site.handline),waiting,'the handline holds its original catch while the school moves next week');
  g.time(5000);ok(sim.visit(site.id));
  assert.equal(sim.handlineOffer({...p,mode:'walk',y:24.5}).action,'return');
  const before=sim.active().food;
  const currentMark=g.context.EarthFisheries.shoal(site,sim.state.week);
  ok(sim.useHandline(p,'land'));assert.equal(sim.active().food,before+2);
  assert.equal(sim.handlineOffer({...p,...currentMark}).food,1,'the shoal scattered but the fishing spot remains usable');
  assert.equal(sim.handlineOffer({...p,...g.context.EarthFisheries.shoal(site,sim.state.week)}).food,2);
  sim.destroy();
});

test('coastal land communities retain their quay and saved line when offline',()=>{
  const g=setup({coast:true});let sim=g.open();
  ok(sim.found({lat:-42.88,lon:147.33,name:'Hobart',water:false}));
  assert.equal(sim.active().water,false);assert.equal(sim.active().coastal,true);
  delete sim.active().coastal; // legacy settlement reviewed after the chart loads
  const p={...shore,siteId:sim.active().id};ok(sim.useHandline(p,'cast'));
  sim.destroy();delete g.context.EarthAtlas;sim=g.open();
  assert.equal(g.context.CommonEarthSim.waterfront(sim.active()),'coast');
  g.time(-10000);ok(sim.useHandline(p,'land'));
  assert.equal(sim.active().food,13);
  sim.destroy();
});

test('landlocked saves cannot import a fishing line and invalid offshore coordinates cannot grant food',()=>{
  const g=setup(),sim=g.open();ok(sim.found(ocean));const id=sim.active().id;
  for(const bad of [{x:90,y:33,mode:'boat'},{x:8,y:9,mode:'boat'},{x:8,y:39,mode:'walk'}]){
    assert.equal(sim.useHandline({...bad,siteId:id},'cast').ok,false);
  }
  const p={...shore,siteId:id};ok(sim.useHandline(p,'cast'));
  const snapshot=JSON.parse(JSON.stringify(sim.state));snapshot.sites[0].water=false;
  assert.equal(g.context.CommonEarthSim.readSave(JSON.stringify(snapshot)),null);
  snapshot.sites[0].water=true;snapshot.sites[0].handline.food=999;
  assert.equal(g.context.CommonEarthSim.readSave(JSON.stringify(snapshot)),null);
  sim.destroy();
});
test('a delayed cast rechecks the live fisher and the chosen school at commit time',async()=>{
  const g=setup(),sim=g.open();ok(sim.found(ocean));
  const site=sim.active(),p={siteId:site.id,mode:'boat',...g.context.EarthFisheries.shoal(site,sim.state.week)};
  let unlock,position=p;
  g.context.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{unlock=()=>resolve(run());})}};
  const command=sim.perform('useHandline',()=>position,'cast',2);
  position=null;unlock();
  assert.equal((await command).ok,false);assert.equal(site.handline,undefined);
  const second=sim.perform('useHandline',()=>position,'cast',2);
  position={...p,y:28};unlock();
  assert.equal((await second).ok,false);assert.equal(site.handline,undefined);
  sim.destroy();
});

test('an unreadable optional fishing script cannot roll back an otherwise valid community save',()=>{
  const g=setup();let sim=g.open();ok(sim.found(ocean));
  ok(sim.useHandline({...shore,siteId:sim.active().id},'cast'));
  sim.destroy();vm.runInContext('window.EarthFisheries=undefined',g.context);sim=g.open();
  assert.ok(sim.active()?.handline);
  assert.equal(sim.active().name,'Indian Ocean Anchorage');
  assert.equal(sim.handlineOffer({...shore,siteId:sim.active().id}),null);
  ok(sim.advance());sim.destroy();
});


test('the fishing controls distinguish underway, stopped, and ready to cast beneath the seabirds',()=>{
  const g=setup(),sim=g.open();ok(sim.found({name:'Stone Town',lat:-6.16,lon:39.19}));
  const site=sim.active(),berth={siteId:site.id,mode:'boat',waterfront:true,x:14.32,y:30.44};
  const mark=g.context.EarthFisheries.shoal(site,sim.state.week);
  const fields=new Map(),field=id=>{if(!fields.has(id))fields.set(id,{});return fields.get(id);};
  const source=fs.readFileSync(path.join(directory,'app.js'),'utf8');
  const handler=source.match(/^  function updateStreetInteract\(state\) \{[\s\S]*?^  \}/m);
  assert.ok(handler,'the Street interaction handler is present');
  Object.assign(g.context,{sim,streetHud:null,syncLiveClock:()=>{},document:{body:{hasAttribute:()=>false}},$:field,handlineDue:0,
    put:(id,content)=>{field(id).text=content;},show:(id,visible)=>{field(id).visible=visible;}});
  vm.runInContext(handler[0],g.context);
  const draw=scene=>g.context.updateStreetInteract(scene);
  draw(berth);assert.equal(field('street-shoal').text,'Sail to shoal');
  assert.equal(field('street-shoal').visible,true);assert.match(field('street-line-terms').text,/1 food/);
  const sailing={...berth,...mark,sailingToShoal:true};draw(sailing);
  assert.equal(field('street-shoal').text,'Stop sailing');assert.equal(field('street-shoal').visible,true);
  assert.equal(field('street-handline').disabled,true);assert.match(field('street-line-terms').text,/Sailing to the shoal/);
  assert.equal(sim.useHandline(sailing,'cast',2).ok,false);
  draw(berth);assert.equal(field('street-handline').disabled,false);assert.equal(field('street-shoal').text,'Sail to shoal');
  const arrived={...berth,...mark};draw(arrived);
  assert.equal(field('street-shoal').visible,false);assert.equal(field('street-handline').disabled,false);
  assert.match(field('street-line-terms').text,/2 food/);ok(sim.useHandline(arrived,'cast',2));sim.destroy();
});

test('a reel input from an older catch cannot land a replacement float with the same food yield',()=>{
  const g=setup(),sim=g.open();ok(sim.found(ocean));const p={...shore,siteId:sim.active().id};
  ok(sim.useHandline(p,'cast',1));const first=sim.active().handline.castAt;g.time(5000);ok(sim.useHandline(p,'land',1,first));
  ok(sim.useHandline(p,'cast',1));const second=sim.active().handline.castAt;g.time(5000);
  const stock=sim.active().food;assert.equal(sim.useHandline(p,'land',1,first).ok,false);assert.equal(sim.active().food,stock);
  ok(sim.useHandline(p,'land',1,second));assert.equal(sim.active().food,stock+1);sim.destroy();
});
