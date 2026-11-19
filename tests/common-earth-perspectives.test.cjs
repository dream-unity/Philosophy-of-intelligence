'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth'),'interdependence.js'),'utf8');
function district(){
  const people=[{id:'grower',name:'Lea',identityKey:'Lea-birth',role:'Grower'},{id:'maker',name:'Jo',identityKey:'Jo-birth',role:'Carpenter'}];
  const plans={grower:{reason:'I promised the kitchen a delivery.',goal:'Harvest roots',dream:{title:'Plant my orchard'}},
    maker:{reason:'The repair needs a dry day.',goal:'Fit the sill',dream:{title:'Build a balcony'}}};
  const memory={id:'grower',name:'Lea',here:true,week:4,reason:'made time to meet',strength:1};
  const pair={from:'grower',to:'maker',product:'apron',fromIdentity:'Lea-birth',toIdentity:'Jo-birth'};
  const receipt={week:5,action:'purchase',pair,text:'Lea bought a work apron from Jo for 3 personal funds.'};
  const site={residents:[],purses:{people:{grower:{entries:[receipt]}}}};
  const w=vm.createContext({EarthPersonas:{profile:(_,id)=>people.find(p=>p.id===id)},
    EarthAutonomy:{view:(_,__,id)=>plans[id],contacts:(_,id)=>id==='maker'?[memory]:[]}});w.window=w;
  vm.runInContext(source,w);return {model:w.EarthInterdependence,people,site,world:{week:5},pair,memory};
}
test('residents recall a transaction and a one-sided encounter from their own perspective',()=>{
  const {model,people,site,world}=district();
  const v=model.perspectives(site,world,people,'grower','maker');
  assert.equal(v.first.dream,'Plant my orchard');assert.equal(v.second.plan,'Fit the sill');
  assert.equal(v.first.memory,undefined);assert.equal(v.second.memory.week,4);
  assert.equal(v.links.length,1);assert.equal(v.links[0].from,'grower');assert.equal(v.links[0].to,'maker');
  assert.match(v.links[0].detail,/3 personal funds/);
});
test('a replacement occupant, absent memory or a historical receipt cannot stand in for the original neighbour',()=>{
  const {model,people,site,world,pair,memory}=district();
  pair.toIdentity='Previous occupant';memory.here=false;
  let v=model.perspectives(site,world,people,'grower','maker');
  assert.equal(v.links.length,0);assert.equal(v.second.memory,undefined);
  delete pair.toIdentity;v=model.perspectives(site,world,people,'grower','maker');assert.equal(v.links.length,0);
  assert.equal(model.perspectives(site,world,people,'maker','maker'),null);
  assert.equal(model.perspectives(site,world,people,'grower','departed'),null);
});
