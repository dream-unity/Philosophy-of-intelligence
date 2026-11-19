'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
const html=fs.readFileSync(path.join(directory,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([\w-]+)\.js[^"<>]*"[^>]*><\/script>/g)].map(match=>match[1]);
function open(location){
  let time=200000;
  class Clock extends Date {static now(){return time;}}
  const c=vm.createContext({Date:Clock,structuredClone});c.window=c;
  const sources=[...scripts.slice(0,scripts.indexOf('simulation')+1),'development-ledger'];
  for(const name of sources)vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),c,{filename:name+'.js'});
  const sim=c.CommonEarthSim.create({storage:null});assert.ok(sim.found(location).ok);
  return {c,sim,advance(){time+=60000;return sim.production(sim.state.productionSerial||0,()=>true);}};
}

test('paid work links the same individual to its reserved funds and the settled transfer, across geography and reload',()=>{
  for(const location of [{name:'Upland farm',lat:46.1,lon:11.2,water:false},{name:'Aegean port',lat:37.5,lon:23.5,coastal:true,water:false}]){
    const {c,sim,advance}=open(location),world=sim.state,site=world.communityLife.outposts[0];
    let job,paid;
    for(let round=0; round<16 && !paid; round++){
      assert.ok(advance().ok);
      const raw=JSON.stringify(world),entries=c.EarthDevelopmentLedger.records(world,site);
      assert.equal(JSON.stringify(world),raw,'inspection must not consume resources, add knowledge or allocate work');
      if(!job){job=c.EarthDistrictGrowth.activeWork(site).find(work=>work.phase==='collect');assert.ok(job);}
      const record=entries.find(e=>e.key==='order/'+job.id);assert.ok(record);
      assert.ok(record.people.some(p=>p.id===job.ownerId));
      const batch=entries.find(e=>e.transfers?.some(t=>t.workId===job.id && t.to===job.workerName && t.good==='funds'));
      if(batch){paid=true;assert.ok(batch.related.includes(record.key));assert.match(record.details.join('\n'),new RegExp(job.workerName));}
    }
    assert.ok(paid,'the worker delivered their order and their personal account was credited');
    const again=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(world)}),reloaded=again.state.communityLife.outposts.find(s=>s.id===site.id);
    const record=c.EarthDevelopmentLedger.records(again.state,reloaded).find(e=>e.key==='order/'+job.id);
    assert.ok(record.people.some(p=>p.id===job.ownerId));assert.ok(record.details.some(t=>t.includes(job.workerName)));
    again.destroy();sim.destroy();
  }
});
