'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
const src=fs.readFileSync(path.join(directory,'globe.js'),'utf8');
const origin='https://example.invalid', base=origin+'/common-earth/';
const chart='earth-chart.webp', index='earth-index.png', token='d3479f1';
const versioned=name=>base+name+'?v='+token;

function setup({fail=()=>false,version=token,doc=base}={}){
  const requests=[];
  class TestImage{
    constructor(){this.width=2;this.height=1;}
    set src(url){
      requests.push(url);
      queueMicrotask(()=>{if(fail(url,requests))this.onerror();else this.onload();});
    }
  }
  const win={};
  const document={baseURI:doc,currentScript:{src:base+'globe.js',dataset:{atlasVersion:version}},
    createElement:()=>({getContext:()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray(8)};}})})};
  vm.runInNewContext(src,{window:win,document,Image:TestImage,URL});
  return {atlas:win.EarthAtlas,requests};
}

test('successful atlas startup keeps both release fingerprints and shares concurrent initialization',async()=>{
  const {atlas,requests}=setup();
  const [a,b]=await Promise.all([atlas.ready(),atlas.ready()]);
  assert.equal(a,b);assert.deepEqual(requests.sort(),[versioned(chart),versioned(index)].sort());
});
test('a failed versioned relief image retries only that image using its bare same-origin URL',async()=>{
  const {atlas,requests}=setup({fail:url=>url===versioned(chart)});
  await atlas.ready();assert(atlas.locate(0,0));
  assert.deepEqual(requests,[versioned(chart),versioned(index),base+chart]);
});
test('both bitmap requests can recover from a first image decode or request failure',async()=>{
  const {atlas,requests}=setup({fail:url=>new URL(url).search!==''});
  await atlas.ready();assert(atlas.locate(0,0));
  assert.deepEqual(requests.sort(),[versioned(chart),versioned(index),base+chart,base+index].sort());
});
test('persistent errors stop after one fallback and report the failed image',async()=>{
  const {atlas,requests}=setup({fail:url=>new URL(url).pathname.endsWith(index)});
  await assert.rejects(atlas.ready(),/Could not load earth-index\.png/);
  assert.deepEqual(requests,[versioned(chart),versioned(index),base+index]);
});
test('unversioned local development retries once without changing paths',async()=>{
  let attempted=false;
  const {atlas,requests}=setup({version:'',fail:url=>{
    if(url===base+chart&&!attempted){attempted=true;return true;}return false;
  }});
  await atlas.ready();assert.deepEqual(requests,[base+chart,base+index,base+chart]);
});
test('a script hosted on another origin does not switch to an unversioned resource',async()=>{
  const {atlas,requests}=setup({doc:'https://another.invalid/',fail:url=>url===versioned(chart)});
  await assert.rejects(atlas.ready(),/Could not load earth-chart\.webp/);
  assert.deepEqual(requests,[versioned(chart),versioned(index)]);
});
