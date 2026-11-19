'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const directory=process.env.COMMON_EARTH_GAME_DIR||path.join(__dirname,'../common-earth');
function start(){
  const c=vm.createContext({});c.window=c;
  for(const name of ['personas','agency','social-memory','simulation','interdependence']){
    vm.runInContext(fs.readFileSync(path.join(directory,name+'.js'),'utf8'),c,{filename:name+'.js'});
  }
  const sim=c.CommonEarthSim.create({storage:null});
  assert(sim.found({lat:-37.8,lon:145,name:'Brickmakers',region:'Australia'}).ok);
  const site=sim.active();
  const people=c.EarthPersonas.list(site);
  function change(id){
    return sim.changeActor(id,{siteId:site.id,actor:c.EarthAgency.actorId(site),x:5,y:5,mode:'walk',targetPose:{id,x:5,y:6,mode:'walk'}});
  }
  return {sim,site,c,people,change};
}
test('switching lives retains the signatory, while another person can make the actual delivery',()=>{
  const {sim,site,c,people,change}=start(),r=site.residents[0],id=r.id;
  assert(sim.act('listen:'+id).ok);assert(sim.act('promise:'+id).ok);assert.equal(r.promise.by,'steward');
  assert(change('walker-1').ok);
  const original=c.EarthInterdependence.anchor(sim.state,site);
  assert.equal(original.yours,false);assert.equal(original.nearest.who,id);
  assert.match(sim.actions('people').find(a=>a.id==='revise:'+id).reason,/person who made/);
  assert(sim.act('fulfil:'+id).ok);
  const restored=c.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert(restored);const receipt=restored.sites[0].residents[0].agreements[0];
  assert.equal(receipt.by,'steward');assert.equal(receipt.deliveredBy,'walker-1');
  assert.equal(c.EarthInterdependence.anchor(sim.state,site).held.length,0);
  const links=c.EarthInterdependence.ties(site,sim.state,people);
  assert(links.some(x=>x.from==='walker-1'&&x.to==='steward'&&x.label.includes('helped')));
  assert(links.some(x=>x.from==='steward'&&x.to===id&&x.label==='kept a promise'));
  sim.destroy();
});
test('a resident remembers which speaker missed the deadline and asks that person to check in',()=>{
  const {sim,site,change}=start(),r=site.residents[0],id=r.id;
  assert(sim.act('listen:'+id).ok);assert(sim.act('promise:'+id).ok);const due=r.promise.dueWeek;
  while(sim.state.week<=due)assert(sim.advance().ok);
  assert.equal(r.agreements[0].by,'steward');assert.equal(r.agreements[0].status,'missed');
  while(sim.state.week<r.lastPromise+3)assert(sim.advance().ok);
  assert.match(sim.actions('people').find(a=>a.id==='promise:'+id).reason,/missed date/);
  assert(change('walker-1').ok);
  assert(sim.act('listen:'+id).ok);
  assert(sim.actions('people').find(a=>a.id==='promise:'+id).available);
  assert(change('steward').ok);
  assert.match(sim.actions('people').find(a=>a.id==='promise:'+id).reason,/missed date/);
  assert(sim.act('listen:'+id).ok);assert(sim.act('promise:'+id).ok);sim.destroy();
});
test('older community promises can still be revised or met without inventing a signer',()=>{
  const {sim,site,c}=start(),r=site.residents[2];
  r.heard=true;r.promise={dueWeek:sim.state.week+2};
  const saved=c.CommonEarthSim.create({storage:null,snapshot:JSON.stringify(sim.state)});
  assert(!c.EarthInterdependence.signings(saved.active(),saved.state,'steward').length);
  assert(saved.act('fulfil:'+r.id).ok);
  assert.equal(saved.active().residents[2].agreements,undefined);saved.destroy();sim.destroy();
});
