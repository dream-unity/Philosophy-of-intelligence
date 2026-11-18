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
