'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const source=fs.readFileSync(path.join(directory,'navigation.js'),'utf8');

test('place search yields during fallback indexing and accepts overlapping queries',async()=>{
  let slices=0;
  const runtime=vm.createContext({
    document:{currentScript:{src:'navigation.js'}},
    performance,
    setTimeout(fn){slices++;return setImmediate(fn);}
  });
  runtime.window=runtime;
  vm.runInContext(source,runtime);
  const nav=runtime.EarthNavigation;
  const melbourne=nav.searchAsync('Melbourne Victoria',1);
  const suva=nav.searchAsync('Suva Fiji',1);
  assert.equal(slices,1,'the first index task is shared');
  assert.equal(nav.featured().length,6);
  assert.equal((await melbourne)[0].name,'Melbourne');
  assert.equal((await suva)[0].name,'Suva');
  assert(slices>1,'indexing yields for input');
  const prior=slices;
  assert.equal((await nav.searchAsync('Hobart TAS',1))[0].name,'Hobart');
  assert.equal(slices,prior,'subsequent searches use the prepared index');
});

test('exact pins and regional place lists work before the text index is used',()=>{
  const runtime=vm.createContext({});runtime.window=runtime;
  vm.runInContext(source,runtime);
  const nav=runtime.EarthNavigation;
  const melbourne=nav.featured().find(p=>p.name==='Melbourne');
  assert.equal(nav.anchorAt(melbourne.lat,melbourne.lon).name,'Melbourne');
  assert.equal(nav.anchorAt(90,-179).name,'North Pole');
  assert.equal(nav.anchorAt(-90,179).name,'South Pole');
  assert(nav.nearbyCities(melbourne.lat,melbourne.lon,1,20).some(p=>p.name==='Melbourne'));
  assert.equal(nav.anchorAt(0,-150).name,'Pacific Ocean');
  const found=nav.search('Melbourne VIC',1)[0];
  assert.equal(found.region,melbourne.region);
  assert.equal(found.locality,melbourne.locality);
});

test('a worker which cannot receive a query falls back and stays usable',async()=>{
  let attempts=0,stopped=false;
  class BrokenWorker{
    constructor(){attempts++;}
    postMessage(){throw new Error('Worker port closed');}
    terminate(){stopped=true;}
  }
  const runtime=vm.createContext({document:{currentScript:{src:'navigation.js'}},Worker:BrokenWorker,performance,setTimeout:setImmediate});
  runtime.window=runtime;vm.runInContext(source,runtime);
  const first=await runtime.EarthNavigation.searchAsync('Sao Paulo',1);
  const second=await runtime.EarthNavigation.searchAsync('North Pole',1);
  assert.equal(first[0].name,'São Paulo');assert.equal(second[0].name,'North Pole');
  assert.equal(attempts,1);assert(stopped);
});

test('backgrounding releases an idle place-search worker and keeps an outstanding answer',async()=>{
  const doc={hidden:false,currentScript:{src:'navigation.js'},addEventListener(_,fn){this.onVisibility=fn;}};
  const workers=[],timers=new Map();
  class QueryWorker{
    constructor(){workers.push(this);}
    postMessage(data){this.request=data;}
    answer(){this.onmessage({data:{id:this.request.id,places:[{name:this.request.query}]}});}
    terminate(){this.stopped=true;}
  }
  const runtime=vm.createContext({document:doc,Worker:QueryWorker,
    setTimeout:fn=>{const key=timers.size+1;timers.set(key,fn);return key;},clearTimeout:key=>timers.delete(key)});
  runtime.window=runtime;vm.runInContext(source,runtime);
  const search=q=>runtime.EarthNavigation.searchAsync(q);
  const pending=search('Hobart');
  doc.hidden=true;doc.onVisibility();assert(!workers[0].stopped);
  workers[0].answer();assert.equal((await pending)[0].name,'Hobart');assert(workers[0].stopped);
  doc.hidden=false;doc.onVisibility();
  const next=search('Suva');assert.equal(workers.length,2);
  workers[1].answer();assert.equal((await next)[0].name,'Suva');
  assert.equal(timers.size,1);[...timers.values()][0]();assert(workers[1].stopped);
});
