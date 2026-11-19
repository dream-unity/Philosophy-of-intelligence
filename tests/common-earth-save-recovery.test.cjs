'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const runtime = vm.createContext({ TextEncoder });
runtime.window = runtime;
for (const file of ['construction.js', 'simulation.js', 'saves.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), runtime, {filename: file});
}

function toggledStore() {
  const values = new Map();
  return {
    writable: false,
    get length() { return values.size; },
    key: i => [...values.keys()][i] ?? null,
    getItem: k => values.get(k) ?? null,
    setItem(k, v) {
      if (!this.writable) throw new Error('Quota exhausted');
      values.set(k, String(v));
    },
    removeItem(k) { values.delete(k); }
  };
}
const town = {lat: -42.88, lon: 147.33, name: 'Hobart'};
const savedKey = 'common-earth.world.v1';
function open(storage) {
  let id = 0;
  return runtime.EarthSaves.open({storage, session:null, idGenerator:()=> 'test-world-'+(++id)});
}

test('a successful local write restores autosave and sends future copies to persistent storage', async () => {
  const store = toggledStore(), book = open(store);
  assert.equal(book.status().mode, 'limited');
  assert.equal((await book.sim.perform('found', town)).ok, true);
  assert.equal(store.getItem(savedKey), null);
  assert.equal(book.status().mode, 'limited');
  store.writable = true;
  assert.equal((await book.sim.perform('advance')).ok, true);
  assert.equal(JSON.parse(store.getItem(savedKey)).week, 2);
  assert.equal(book.status().mode, 'autosave');
  const copy = await book.copy('Restored copy');
  assert.equal(copy.ok, true);
  assert.equal(book.current().temporary, false);
  assert.equal(JSON.parse(store.getItem('common-earth.playthrough.v1.'+copy.id)).week, 2);
  book.dispose();
  const reopened = open(store);
  assert.equal(reopened.current().name, 'Restored copy');
  assert.equal(reopened.sim.active().name, 'Hobart Commons');
  reopened.dispose();
});

test('external reads and play in a temporary or retained world do not signal a durable write', async () => {
  const store = toggledStore(), book = open(store);
  const external = runtime.CommonEarthSim.create({storage:null});
  assert.equal(external.found(town).ok, true);
  store.writable = true;
  store.setItem(savedKey, JSON.stringify(external.state));
  assert.equal(book.sim.sync(), true);
  assert.equal(book.status().mode, 'limited');
  store.writable = false;
  assert.equal((await book.sim.perform('advance')).ok, true);
  const temp = await book.create('Temporary world');
  assert.equal(temp.ok, true);
  store.writable = true;
  assert.equal((await book.sim.perform('found', town)).ok, true);
  assert.equal(book.status().mode, 'temporary');
  assert.equal(store.getItem('common-earth.playthrough.v1.'+temp.id), null);
  assert.equal((await book.select('original')).ok, true);
  assert.equal(book.sim.state.week, 2);
  assert.equal((await book.sim.perform('advance')).ok, true);
  assert.equal(book.status().mode, 'temporary');
  assert.equal(JSON.parse(store.getItem(savedKey)).week, 1);
  external.destroy();
  book.dispose();
});

test('a background crew cannot erase a player order that is in memory during a quota failure',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);assert((await s.perform('act','build:workshop',8)).ok);
  const remote=runtime.CommonEarthSim.create({storage:store});
  store.writable=false;
  assert((await s.perform('act','build:garden',7)).ok);assert(s.hasUnsavedChoice);
  assert.equal(s.active().construction.length,2);
  store.writable=true;
  assert((await remote.perform('workConstruction',3,100000)).ok);
  s.sync();assert(s.hasUnsavedChoice);assert.equal(s.active().construction.length,2);
  assert((await s.perform('workConstruction',2,100500)).ok);
  assert.equal(s.hasUnsavedChoice,false);assert.equal(book.status().mode,'autosave');
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction.length,2);
  remote.destroy();book.dispose();
});

test('two different player choices after a quota failure remain available separately',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);
  const remote=runtime.CommonEarthSim.create({storage:store});
  store.writable=false;assert((await s.perform('act','build:garden',7)).ok);
  store.writable=true;assert((await remote.perform('act','build:workshop',8)).ok);
  assert(s.sync());assert.match(book.status().message,/copy or export/);
  assert.equal(JSON.parse(book.exportWorld().text).world.sites[0].construction[0].kind,'garden');
  assert((await s.perform('workConstruction',3)).ok);
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction[0].kind,'workshop');
  const copy=await book.copy('My garden');assert(copy.ok);assert.equal(book.status().mode,'autosave');
  assert.equal(book.sim.active().construction[0].kind,'garden');
  assert.equal(JSON.parse(store.getItem(savedKey)).sites[0].construction[0].kind,'workshop');
  assert((await book.select('original')).ok);assert.equal(book.sim.active().construction[0].kind,'workshop');
  assert((await book.select(copy.id)).ok);assert.equal(book.sim.active().construction[0].kind,'garden');
  remote.destroy();book.dispose();
});

test('the saved-world picker keeps focus during normal labour but still reports a quota change or recovery',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;
  assert((await s.perform('found',town)).ok);assert((await s.perform('act','build:garden',7)).ok);
  let refresh=0;const off=book.watch(()=>refresh++);
  assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,0);
  store.writable=false;assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,1);
  assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,1);
  store.writable=true;assert((await s.perform('workConstruction',2)).ok);assert.equal(refresh,2);
  off();book.dispose();
});

test('a queued player order cannot change a previous saved world after the player switches slots',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store),s=book.sim;assert((await s.perform('found',town)).ok);
  const alternate=await book.create('Other community');assert(alternate.ok);assert((await book.select('original')).ok);
  let resume;
  runtime.navigator={locks:{request:(_key,run)=>new Promise(resolve=>{resume=()=>resolve(run());})}};
  try{
    const pending=s.perform('act','build:workshop',8);
    assert.equal(typeof resume,'function');assert((await book.select(alternate.id)).ok);
    resume();assert.equal((await pending).ok,false);
    assert((await book.select('original')).ok);assert.equal(s.active().construction.length,0);
    assert.equal(s.active().funds,16);
  }finally{delete runtime.navigator;book.dispose();}
});

test('saved world summaries follow replaced, corrupted and restored payloads',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store);
  assert((await book.sim.perform('found',town)).ok);
  const copied=await book.copy('Port copy');assert(copied.ok);
  assert((await book.select('original')).ok);
  const other=()=>book.list().find(s=>s.id===copied.id);
  const first=other();
  assert.equal(first.week,1);
  first.names[0]='Changed only in the returned list';
  assert.equal(other().names[0],'Hobart Commons');
  const key='common-earth.playthrough.v1.'+copied.id;
  const original=store.getItem(key),later=JSON.parse(original);
  later.week=9;later.sites[0].name='Northern port';
  store.setItem(key,JSON.stringify(later));
  assert.equal(other().week,9);
  assert.equal(other().active,'Northern port');
  store.setItem(key,'unfinished');
  assert.equal(other().settlements,0);
  store.setItem(key,original);
  assert.equal(other().active,'Hobart Commons');
  book.dispose();
});

test('a valid multi-community transport file larger than the legacy import budget opens in full',async()=>{
  const seed=runtime.CommonEarthSim.create({storage:null});
  assert.equal(seed.found(town).ok,true);
  const world=JSON.parse(JSON.stringify(seed.state)),first=world.sites[0],template=JSON.stringify(first);
  seed.destroy();
  const count=Math.ceil(4100000/template.length);
  world.sites=Array.from({length:count},(_,i)=>{
    const site=JSON.parse(template.replaceAll(first.id,'site-'+(i+1)));
    site.lat=-80+(i%70)*2;site.lon=-176+Math.floor(i/70)*4;site.name='District '+(i+1);
    return site;
  });
  const last=world.sites.at(-1);last.funds=731;world.activeId=last.id;
  const exported=JSON.stringify({format:'common-earth-world',version:1,name:'Connected districts',world});
  assert(Buffer.byteLength(exported)>4000000);
  const storage=toggledStore();storage.writable=true;
  const book=open(storage),review=book.prepareImport(exported);assert.equal(review.ok,true,review.message);
  assert.equal(review.info.settlements,count);
  const result=await book.confirmImport(review.token);
  assert.equal(result.ok,true,result.message);assert.equal(book.status().durable,true);
  assert.equal(book.sim.active().id,last.id);assert.equal(book.sim.active().funds,731);
  assert.equal(JSON.parse(book.exportWorld().text).world.sites.length,count);
  book.dispose();
});

test('a reviewed import survives a full store in this tab and leaves the durable selection intact on reload',async()=>{
  for(const failedPrefix of ['common-earth.playthrough.v1.','common-earth.slots.v1.']){
    const storage=toggledStore();storage.writable=true;
    const book=open(storage);assert.equal(book.sim.found(town).ok,true);
    const original=storage.getItem(savedKey),source=book.exportWorld().text;
    const other=await book.create('Elsewhere');assert.equal(other.ok,true);
    assert.equal(book.sim.found({lat:40,lon:12,name:'Elsewhere'}).ok,true);
    const otherKey='common-earth.playthrough.v1.'+other.id,prior=storage.getItem(otherKey);
    const review=book.prepareImport(source);assert.equal(review.ok,true,review.message);
    const write=storage.setItem.bind(storage);
    storage.setItem=(k,v)=>{if(k.startsWith(failedPrefix))throw new Error('Quota exhausted');write(k,v);};
    const imported=await book.confirmImport(review.token,'Recovered harbour');
    assert.equal(imported.ok,true,imported.message);assert.equal(imported.temporary,true);
    assert.match(imported.message,/in this tab only/i);assert.match(imported.message,/export changes/i);
    assert.equal(book.current().id,imported.id);assert.equal(book.status().durable,false);
    assert.equal(book.sim.active().name,'Hobart Commons');
    assert.equal(book.sim.advance().ok,true);const portable=book.exportWorld();
    assert.equal(JSON.parse(portable.text).world.week,2);
    assert.equal(storage.getItem('common-earth.playthrough.v1.'+imported.id),null);
    assert.equal(storage.getItem('common-earth.slots.v1.'+imported.id),null);
    assert.equal(storage.getItem(savedKey),original);assert.equal(storage.getItem(otherKey),prior);book.dispose();
    const reloaded=open(storage);assert.equal(reloaded.current().id,other.id);
    assert.equal(reloaded.sim.active().name,'Elsewhere Commons');
    const recovered=reloaded.prepareImport(portable.text);assert.equal(recovered.ok,true);assert.equal(recovered.info.week,2);reloaded.dispose();
  }
});

test('a reviewed import that fails to reopen keeps the previous world and removes the incomplete slot',async()=>{
  const store=toggledStore();store.writable=true;
  const book=open(store);assert(book.sim.found(town).ok);
  const original=store.getItem(savedKey),file=book.exportWorld().text;
  const migrate=runtime.CommonEarthSim.migrateDetachedSave;
  try{
    runtime.CommonEarthSim.migrateDetachedSave=world=>{
      const result=migrate(world);result.sites[0].residents=[];return result;
    };
    const review=book.prepareImport(file);assert(review.ok);
    const result=await book.confirmImport(review.token,'Unusable copy');
    assert.equal(result.ok,false);assert.match(result.message,/could not be reopened/);
    assert.equal(book.current().id,'original');assert.equal(store.getItem(savedKey),original);
    assert.equal(book.list().length,1);
  }finally{runtime.CommonEarthSim.migrateDetachedSave=migrate;book.dispose();}
});

test('larger file support preserves byte, value, depth, inert-key and simulation integrity checks',()=>{
  const storage=toggledStore();storage.writable=true;
  const book=open(storage);assert.equal(book.sim.found(town).ok,true);
  const prior=storage.getItem(savedKey),base=JSON.parse(prior),limit=runtime.EarthSaves.maxBytes;
  assert.match(book.prepareImport(' '.repeat(limit+1)).message,/32 MB/);
  assert.match(book.prepareImport('界'.repeat(Math.floor(limit/3)+1)).message,/32 MB/);
  assert.match(book.prepareImport(JSON.stringify({...base,alignment:new Array(800000).fill(0)})).message,/unsupported structure/);
  let nested=0;for(let i=0;i<42;i++)nested=[nested];
  assert.match(book.prepareImport(JSON.stringify({...base,nested})).message,/unsupported structure/);
  assert.match(book.prepareImport(prior.slice(0,-1)+',"__proto__":{}}').message,/unsupported structure/);
  base.sites[0].funds=-1;assert.match(book.prepareImport(JSON.stringify(base)).message,/integrity check/);
  assert.equal(storage.getItem(savedKey),prior);assert.equal(book.current().id,'original');book.dispose();
});

function priorTurn(){
  const original=runtime.CommonEarthSim.create({storage:null});
  assert(original.found(town).ok);
  const good=JSON.stringify(original.state);
  assert(original.advance().ok);
  const next=JSON.stringify(original.state);
  original.destroy();
  return {good,next};
}
test('an empty or missing primary resumes only its own previous turn and a successful action restores autosave',()=>{
  const {good,next}=priorTurn(),key='common-earth.playthrough.v1.selected';
  for(const missing of [true,false]){
    const store=toggledStore(),read=[],get=store.getItem.bind(store);store.writable=true;
    store.setItem(savedKey+'.previous',good);
    store.setItem(key+'.previous',next);
    if(!missing)store.setItem(key,'');
    store.getItem=k=>{read.push(k);return get(k);};
    const sim=runtime.CommonEarthSim.create({key,storage:store});
    assert.deepEqual(read,[key,key+'.previous']);assert.equal(sim.state.week,2);
    assert.equal(sim.active().name,'Hobart Commons');assert.match(sim.saveMessage,/Recovered/);
    assert(sim.advance().ok);assert.equal(sim.saveIssue,false);sim.destroy();
    const resumed=runtime.CommonEarthSim.create({key,storage:store});
    assert.equal(resumed.state.week,3);assert.equal(resumed.state.sites.length,1);
    assert.equal(store.getItem(savedKey+'.previous'),good);resumed.destroy();
  }
});
test('a genuinely new world opens normally and an intentional reset overrides its complete earlier turn',()=>{
  const store=toggledStore();store.writable=true;
  const fresh=runtime.CommonEarthSim.create({storage:store});
  assert.equal(fresh.saveIssue,false);assert.equal(fresh.state.sites.length,0);
  assert(fresh.found(town).ok);assert(fresh.reset().ok);fresh.destroy();
  assert.equal(JSON.parse(store.getItem(savedKey+'.previous')).sites.length,1);
  const resumed=runtime.CommonEarthSim.create({storage:store});
  assert.equal(resumed.saveIssue,false);assert.equal(resumed.state.sites.length,0);resumed.destroy();
});
test('a newer edition in the selected primary or its only fallback is game-locked and can be exported intact after switching',async()=>{
  const {good}=priorTurn(),future='{"version":20,"sites":[],"newerData":"retain this edition"}';
  for(const source of ['primary','previous']){
    const store=toggledStore();store.writable=true;
    if(source==='primary'){store.setItem(savedKey,future);store.setItem(savedKey+'.previous',good);}
    else store.setItem(savedKey+'.previous',future);
    const book=open(store);
    for(let n=0;n<2;n++){
      assert.match(book.sim.saveMessage,/newer edition/i);assert.equal(book.sim.found(town).ok,false);
      assert.equal((await book.copy('Copy')).ok,false);assert.equal(book.exportWorld().text,future);
      if(n===0){assert((await book.create('Other')).ok);assert((await book.select('original')).ok);}
    }
    assert.equal(store.getItem(source==='primary'?savedKey:savedKey+'.previous'),future);book.dispose();
  }
});
function recoveryStore(primary,backup){
  const previous=savedKey+'.previous',values=new Map([[savedKey,primary],[previous,backup]]),removed=[];
  return {
    removed,cap:Infinity,failPrimary:()=>false,unreadable:false,failVerification:false,
    get length(){return values.size;},key:i=>[...values.keys()][i]??null,
    getItem(k){if(k===savedKey&&this.unreadable)throw Error('Primary is unreadable');return values.get(k)??null;},
    setItem(k,value){
      const text=String(value),others=[...values].reduce((size,[id,v])=>size+(id===k?0:id.length+v.length),0);
      if(k===savedKey&&this.failPrimary(text)||others+k.length+text.length>this.cap){
        if(k===savedKey&&this.failVerification)this.unreadable=true;
        throw Error('Storage cannot write this value');
      }
      values.set(k,text);
    },
    removeItem(k){removed.push(k);values.delete(k);}
  };
}
test('a failed primary write preserves the only recovered turn and keeps the current choice available for export',()=>{
  const {good}=priorTurn(),previous=savedKey+'.previous',broken='{"week":';
  for(const unavailable of ['quota','write','read after write failure']){
    const store=recoveryStore(broken,good),book=open(store);
    assert.match(book.sim.saveMessage,/Recovered/);
    if(unavailable==='quota')store.cap=good.length+savedKey.length+previous.length+broken.length+50;
    else{store.failPrimary=()=>true;store.failVerification=unavailable==='read after write failure';}
    assert(book.sim.advance().ok);assert.equal(book.sim.state.week,2);
    assert.match(book.sim.saveMessage,/in memory.*Export/);
    assert.equal(JSON.parse(book.exportWorld().text).world.week,2);
    assert.equal(store.getItem(previous),good);assert(!store.removed.includes(previous));
    book.dispose();store.unreadable=false;
    const resumed=runtime.CommonEarthSim.create({storage:store});
    assert.equal(resumed.state.week,1);assert.equal(resumed.state.sites.length,1);assert.match(resumed.saveMessage,/Recovered/);resumed.destroy();
  }
});
test('a quota retry releases the old copy only after a healthy primary exists',()=>{
  const {good,next}=priorTurn(),previous=savedKey+'.previous';
  for(const primary of [good,'{"week":']){
    const store=recoveryStore(primary,good),sim=runtime.CommonEarthSim.create({storage:store});
    store.cap=Math.max(savedKey.length+previous.length+2*good.length,savedKey.length+next.length);
    assert(sim.advance().ok);assert.equal(sim.saveIssue,false);
    assert(store.removed.includes(previous));assert.equal(store.getItem(savedKey),JSON.stringify(sim.state));
    sim.destroy();const resumed=runtime.CommonEarthSim.create({storage:store});
    assert.equal(resumed.state.week,2);assert.equal(resumed.state.sites.length,1);resumed.destroy();
  }
});
test('a repaired primary survives a second write failure and the in-memory action can be retried later',()=>{
  const {good}=priorTurn(),previous=savedKey+'.previous',store=recoveryStore('{"week":',good);
  const sim=runtime.CommonEarthSim.create({storage:store});
  store.failPrimary=value=>value!==good;
  assert(sim.advance().ok);assert(sim.saveIssue);assert.equal(store.getItem(savedKey),good);
  assert(store.removed.includes(previous));
  store.failPrimary=()=>false;
  assert(sim.advance().ok);assert.equal(sim.hasDiverged,false);assert.equal(sim.saveIssue,false);
  sim.destroy();const resumed=runtime.CommonEarthSim.create({storage:store});assert.equal(resumed.state.week,3);resumed.destroy();
});
