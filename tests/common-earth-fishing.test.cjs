'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const game=process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname,'../common-earth');
for(const file of ['construction','dismantling','simulation'])require(path.join(game,file+'.js'));
const model=globalThis.CommonEarthSim;
function storage(){
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
function ok(result){assert.equal(result.ok,true,result.reason||result.message);return result;}

test('a crew must open the dock before a catch can reach the food ledger',async()=>{
  const durable=storage();
  let sim=model.create({storage:durable});
  ok(await sim.perform('found',{lat:0,lon:120,water:true,name:'Shoal'}));
  const id=sim.active().id,catchFish=()=>sim.perform('fish',id);
  assert.equal((await catchFish()).ok,false);
  ok(await sim.perform('act','build:fishingDock',2));
  assert.equal(sim.active().buildings.length,0);
  assert.ok(sim.constructionView().jobs[0].workers.length);
  assert.equal((await catchFish()).ok,false);
  assert.equal((await sim.perform('act','build:fishingDock',3)).ok,false);
  ok(await sim.perform('workConstruction',180));
  const before=sim.active().food,effort=sim.state.effort;
  assert.equal((await sim.perform('fish','different-site')).ok,false);
  ok(await catchFish());
  assert.equal(sim.active().food,before+4);
  assert.equal(sim.state.effort,Math.min(4,effort+1));
  sim.destroy();sim=model.create({storage:durable});
  assert.equal(sim.active().food,before+4);
  assert.equal((await catchFish()).ok,false);
  ok(await sim.perform('advance'));
  ok(await catchFish());
  const dock=sim.active().buildings[0];
  ok(await sim.perform('reclaim',dock.plot,dock.id));
  assert.match(sim.fishingOffer().reason,/dock/i);
  assert.ok(model.readSave(JSON.stringify(sim.state)));
  ok(await sim.perform('workConstruction',180));
  assert.equal(sim.active().buildings.length,0);
  assert.equal(sim.active().construction.length,0);
  sim.destroy();
});

test('dock orders follow the same waterfronts as the street scene',async()=>{
  for(const [point,expected] of [[{lat:-6.1622,lon:39.1922},'zanzibar'],[{lat:10,lon:90,water:true},'ocean'],[{lat:40,lon:-100},null]]){
    const sim=model.create({storage:null});
    ok(await sim.perform('found',point));
    assert.equal(model.waterfront(sim.active()),expected);
    const offer=sim.actions('build').find(a=>a.id==='build:fishingDock');
    assert.equal(offer.available,Boolean(expected));
    const before=sim.active().funds;
    assert.equal((await sim.perform('act',offer.id,1)).ok,Boolean(expected));
    assert.equal(sim.active().funds,before-(expected?offer.goods.funds:0));
    sim.destroy();
  }
});
