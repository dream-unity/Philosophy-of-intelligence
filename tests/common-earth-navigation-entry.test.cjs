'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');
const source=fs.readFileSync(path.join(directory,'navigation.js'),'utf8');
const html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
function landing(){
  const [,src,json]=html.match(/<script id="earth-opening-places"[^>]*data-src="([^"]+)"[^>]*>([\s\S]*?)<\/script>/);
  const requests=[];
  const document={
    baseURI:'https://example.invalid/common-earth/',
    getElementById:()=>({dataset:{src},textContent:json}),
    createElement:()=>({remove(){}}),
    head:{appendChild:script=>requests.push(script)}
  };
  const runtime=vm.createContext({document,URL,performance,setTimeout:setImmediate});runtime.window=runtime;
  vm.runInContext(fs.readFileSync(path.join(directory,'navigation-entry.js'),'utf8'),runtime);
  const entry=runtime.EarthNavigation;
  function install(){
    const script=requests.at(-1);
    document.currentScript=script;vm.runInContext(source,runtime);document.currentScript=null;script.onload();
  }
  return {runtime,entry,requests,install};
}
test('all opening commissions and quick picks have the same data before and after detailed places load',async()=>{
  const l=landing();
  const points=[...l.entry.featured(),{name:'Stone Town',lat:-6.1622,lon:39.1922}];
  const offsets=[0,.17,.359,.37,-.17,-.359,-.37];
  assert.equal(l.requests.length,0);
  const load=l.entry.load();
  l.install();const full=await load;
  const plain=o=>JSON.parse(JSON.stringify(o));
  assert.deepEqual(plain(full.featured()),plain(l.entry.featured()));
  for(const point of points)for(const d of offsets){
    const p={lat:point.lat+d,lon:point.lon+d/2};
    assert.deepEqual(plain(l.entry.scenario(p)),plain(full.scenario(p)),point.name);
  }
  assert.equal(l.entry.scenario({lat:0,lon:0}),null);
  const changed=l.entry.featured();changed[0].name='Elsewhere';
  assert.equal(l.entry.featured()[0].name,points[0].name);
  assert.equal(l.requests.length,1);
});
test('detailed places share the same request, surface failure and retry without losing the opening list',async()=>{
  const {entry,requests,install}=landing();
  const first=entry.load(),same=entry.load();
  assert.equal(first,same);assert.equal(requests.length,1);
  requests[0].onerror();await assert.rejects(first,/could not load/);
  assert.equal(entry.featured().length,6);
  const places=entry.searchAsync('Hobart Tasmania',1),retry=entry.load();
  assert.equal(requests.length,2);assert.match(requests[1].src,/navigation\.js\?v=[a-f0-9]{12}$/);
  install();assert.equal((await places)[0].name,'Hobart');assert.equal(await entry.load(),await retry);
});
