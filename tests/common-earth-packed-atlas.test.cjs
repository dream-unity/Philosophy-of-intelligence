'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR || path.join(__dirname,'../common-earth');
const script=fs.readFileSync(path.join(dir,'globe.js'),'utf8');

function atlas(index){
  const images=[],files=[],window={};
  class Image {
    constructor(){this.width=2;this.height=1;}
    set src(url){images.push(url);queueMicrotask(()=>this.onload());}
  }
  const document={baseURI:'https://example.invalid/game/',createElement:()=>({
    getContext:()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray(8)};}})
  })};
  const fetch=async url=>{files.push(url.pathname);return new Response(index);};
  vm.runInNewContext(script,{document,Image,URL,window,fetch,Response,DecompressionStream});
  return {images,files,api:window.EarthAtlas};
}
test('packed geographic lookup resolves land and water without a bitmap readback',async()=>{
  const {api,images,files}=atlas(fs.readFileSync(path.join(dir,'earth-cells-v1.bin')));
  await api.ready();
  assert.equal(api.locate(-24,133).name,'Australia');
  assert.equal(api.locate(-18,-130).water,true);
  assert.deepEqual(files,['/game/earth-cells-v1.bin']);
  assert.equal(images.length,1);
});
test('an unreadable packed index falls back to the original classification bitmap',async()=>{
  const {api,images}=atlas(new Uint8Array([1,2,3]));
  await api.ready();
  assert(images.some(url=>url.includes('earth-index.png')));
  assert(api.locate(0,0));
});

test('harbour eligibility uses the existing ocean chart and excludes inland lakes',async()=>{
  const {api}=atlas(fs.readFileSync(path.join(dir,'earth-cells-v1.bin')));
  await api.ready();
  assert.equal(api.nearOceanShore(-42.881,147.327),true,'Hobart estuary');
  assert.equal(api.nearOceanShore(-4.05,39.67),true,'Mombasa Island');
  assert.equal(api.nearOceanShore(47.377,8.542),false,'Zürich');
  assert.equal(api.nearOceanShore(43.64,-79.38),false,'Toronto lies on freshwater');
});
test('a returning land community can resolve its harbour without loading globe artwork',async()=>{
  const {api,images,files}=atlas(fs.readFileSync(path.join(dir,'earth-cells-v1.bin')));
  assert.equal(api.nearOceanShore(-42.88,147.33),null);
  await api.geographyReady();
  assert.equal(api.nearOceanShore(-42.88,147.33),true);
  assert.equal(images.length,0);
  await api.ready();
  assert.equal(images.length,1);assert.equal(files.length,1);
});
test('the gazetteer estuary ports keep their landing without reclassifying neighbouring inland survey pins',async()=>{
  const {api}=atlas(fs.readFileSync(path.join(dir,'earth-cells-v1.bin')));
  for(const [lat,lon] of [[-42.85,147.295],[50.9,-1.4],[49.2754,-123.1236],[35.687,139.7495]]){
    assert.equal(api.nearOceanShore(lat,lon),true);
    assert.equal(api.nearOceanShore(lat+.001,lon),null);
  }
  await api.ready();
  assert.equal(api.nearOceanShore(-42.85,147.295),true);
  assert.equal(api.nearOceanShore(-42.849,147.295),false);
});

test('mapped inland shores support freshwater fishing on land, marine shoreline crops and dry inland resources remain distinct',async()=>{
  const {api}=atlas(fs.readFileSync(path.join(dir,'earth-cells-v1.bin')));
  assert.equal(api.nearLakeShore(43.66,-79.4),null);await api.ready();
  const toronto={lat:43.69,lon:-79.41,name:'Toronto'},coast={lat:-4.05,lon:39.67,name:'Mombasa'},interior={lat:-24,lon:133,name:'Central Australia'};
  assert.equal(api.locate(toronto.lat,toronto.lon).water,false);assert.equal(api.nearLakeShore(toronto.lat,toronto.lon),'Lake Ontario');
  assert.equal(api.nearLakeShore(coast.lat,coast.lon),'');assert.equal(api.nearLakeShore(interior.lat,interior.lon),'');
  const context=vm.createContext({Date,structuredClone});context.window=context;context.EarthAtlas=api;
  for(const file of ['resource-economy','market','provisions','fisheries','simulation'])vm.runInContext(fs.readFileSync(path.join(dir,file+'.js'),'utf8'),context,{filename:file});
  let clock=32000;context.Date=class extends Date{static now(){return clock;}};
  const sim=context.CommonEarthSim.create({storage:null});assert.equal(sim.found(toronto).ok,true);
  const lake=sim.active(),wc=context.CommonEarthSim.waterfront,e=context.EarthResources;
  assert.equal(lake.water,false);assert.equal(lake.lakeShore,'Lake Ontario');assert.equal(wc(lake),'lake');
  assert.equal(wc(coast),'coast');assert.equal(wc(interior),null);
  assert.equal(e.environment(lake),'lakeside');assert.equal(e.environment(coast),'coast');assert.equal(e.environment(interior),'dry');
  const resources=sim.marketView().local.rows;assert.equal(resources.find(r=>r.id==='reed').local,true);assert.ok(!resources.some(r=>r.id==='kelp'&&r.local));
  const pose={siteId:lake.id,actor:'steward',mode:'walk',target:'quay',x:7,y:24},pantry=lake.food;
  assert.equal(sim.useHandline(pose,'cast').ok,true);clock+=5000;assert.equal(sim.useHandline(pose,'land').ok,true);assert.equal(lake.food,pantry+1);
  delete context.EarthAtlas;const offline=context.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert.ok(offline);assert.equal(wc(offline.sites[0]),'lake');assert.equal(e.environment(offline.sites[0]),'lakeside');
  assert.equal(context.CommonEarthSim.readSave(JSON.stringify({...offline,sites:[{...offline.sites[0],lakeShore:43}]})),null);
  sim.destroy();
});
