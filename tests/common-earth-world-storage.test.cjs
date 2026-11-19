'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth'),key='common-earth.world.v1';
function runtime(all=false){
  const events=new Map(),c=vm.createContext({TextEncoder,TextDecoder});c.window=c;
  c.addEventListener=(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);};
  c.removeEventListener=(name,callback)=>events.get(name)?.delete(callback);
  c.fire=(name,event)=>events.get(name)?.forEach(fn=>fn(event));
  for(const file of all?['world-storage','simulation','saves']:['world-storage'])
    vm.runInContext(fs.readFileSync(path.join(dir,file+'.js'),'utf8'),c,{filename:file+'.js'});
  return c;
}
function storage(limit=Infinity){
  const rows=new Map();let used=0;
  return {limit,get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,getItem:k=>rows.get(k)??null,
    setItem(k,v){v=String(v);const delta=rows.has(k)?v.length-rows.get(k).length:v.length+k.length;
      if(used+delta>this.limit)throw Error('QuotaExceededError');rows.set(k,v);used+=delta;},
    removeItem(k){if(rows.has(k)){used-=k.length+rows.get(k).length;rows.delete(k);}}};
}
const passage='A gardener came across the exchange to compare the collection dates for two orchards. ';
function largeWorld(c){
  const sim=c.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922}).ok);
  const world=sim.state;world.journal[0].text=Array.from({length:9000},(_,i)=>passage+(i*7919%100003)).join('\n');
  const raw=JSON.stringify(world);sim.destroy();return raw;
}
test('storage round-trips every UTF-16 code unit, including unpaired surrogates, across a cold reader',()=>{
  const units=[];
  for(let start=0;start<65536;start+=1024)units.push(String.fromCharCode(...Array.from({length:1024},(_,i)=>start+i)));
  const raw=units.join('')+passage.repeat(9000)+'😀ༀ𐌰'+units.join('');
  const packed=runtime().EarthWorldStorage.prepare(raw),reader=runtime().EarthWorldStorage;
  assert(packed.length<raw.length/2);assert.equal(reader.unpack(packed),raw);
  assert.equal(reader.prepare('{"week":1}'),'{"week":1}');assert.equal(reader.unpack(null),null);
});
test('a prepared worker payload must identify the current text and pass transport integrity',()=>{
  const raw=passage.repeat(7900),worker=runtime().EarthWorldStorage,packed=worker.prepare(raw),reader=runtime().EarthWorldStorage;
  const corrupt=packed.slice(0,-1)+(packed.endsWith('a')?'b':'a');
  assert.equal(reader.prime(raw,corrupt),false);assert.equal(reader.prime('Z'+raw.slice(1),packed),false);
  assert.equal(reader.unpack(corrupt),corrupt);assert.equal(reader.prime(raw,packed),true);
  assert.equal(reader.prepare(raw),packed);
  const malformed=['~CEW1~zzzzzzzzzz.1.1.','~CEW1~999999.3.0.',packed.slice(0,30),packed+'x'];
  for(const text of malformed)assert.equal(reader.unpack(text),text);
});
test('an adapter leaves registry values alone and supports primary and backup under custom storage keys',()=>{
  const c=runtime().EarthWorldStorage,store=storage(),adapter=c.wrap(store,'custom-game'),raw=passage.repeat(7500);
  assert.equal(c.wrap(adapter),adapter);assert.equal(c.nativeOf(adapter),store);
  adapter.setItem('common-earth.slots.v1.anything',raw);assert.equal(store.getItem('common-earth.slots.v1.anything'),raw);
  adapter.setItem('custom-game',raw);adapter.setItem('custom-game.previous',raw);
  assert(store.getItem('custom-game').length<raw.length);assert.equal(adapter.getItem('custom-game.previous'),raw);
  assert.equal(adapter.length,3);adapter.removeItem('custom-game');assert.equal(adapter.getItem('custom-game'),null);
});
test('a plain legacy turn advances and reloads under a quota smaller than its JSON, exports ordinary JSON and imports as a separate durable world',async()=>{
  const c=runtime(true),store=storage(),raw=largeWorld(c);store.setItem(key,raw);
  store.limit=raw.length+1000;
  const worlds=c.EarthSaves.open({storage:store,session:null,locks:null,idGenerator:()=> 'imported-world'});
  assert((await worlds.sim.perform('advance')).ok);assert.equal(worlds.status().mode,'autosave');
  assert(store.getItem(key).length<raw.length/3);assert(store.getItem(key+'.previous').length<raw.length/3);
  worlds.dispose();const after=runtime(true).EarthSaves.open({storage:store,session:null,locks:null,idGenerator:()=> 'imported-world'});
  assert.equal(after.sim.state.week,2);const file=after.exportWorld(),portable=JSON.parse(file.text);
  assert.equal(portable.format,'common-earth-world');assert.equal(portable.world.journal.find(r=>r.week===1).text,JSON.parse(raw).journal[0].text);
  const reviewed=after.prepareImport(file.text);assert(reviewed.ok);
  assert((await after.confirmImport(reviewed.token,'Separate world')).ok);assert.equal(after.status().mode,'autosave');
  assert.equal(after.sim.state.week,2);assert(store.getItem('common-earth.playthrough.v1.imported-world').length<raw.length/3);
  after.dispose();
});
test('corrupted packed primary recovers its preceding turn and quota failure preserves both in-memory export and the last disk version',()=>{
  const c=runtime(true),store=storage(),raw=largeWorld(c);
  c.EarthWorldStorage.wrap(store).setItem(key,raw);
  const sim=c.CommonEarthSim.create({storage:store});
  assert(sim.advance().ok);assert.equal(sim.state.week,2);
  store.setItem(key,store.getItem(key).slice(0,-2));sim.destroy();
  const cold=runtime(true),rescued=cold.CommonEarthSim.create({storage:store});
  assert.equal(rescued.state.week,1);assert.match(rescued.saveMessage,/previous complete turn/);
  assert(rescued.advance().ok);assert.equal(rescued.saveIssue,false);rescued.destroy();
  const worlds=runtime(true).EarthSaves.open({storage:store,session:null,locks:null});
  store.limit=1;assert(worlds.sim.advance().ok);assert.equal(worlds.sim.state.week,3);
  assert.equal(worlds.status().mode,'limited');assert.equal(JSON.parse(worlds.exportWorld().text).world.week,3);
  worlds.dispose();const persisted=runtime(true).CommonEarthSim.create({storage:store});
  assert.equal(persisted.state.week,2);persisted.destroy();
});
test('native storage events reconcile the same compressed world and keep two genuinely diverged turns intact',()=>{
  const a=runtime(true),b=runtime(true),store=storage(),raw=largeWorld(a);
  store.setItem(key,a.EarthWorldStorage.prepare(raw));
  const left=a.CommonEarthSim.create({storage:store}),right=b.CommonEarthSim.create({storage:store});
  assert(left.advance().ok);b.fire('storage',{key,storageArea:store});assert.equal(right.state.week,2);
  store.limit=1;assert(left.advance().ok);assert(left.hasUnsavedChoice);assert.equal(left.state.week,3);
  store.limit=Infinity;const action=right.actions('work').find(row=>row.available);
  assert(action);assert(right.act(action.id).ok);a.fire('storage',{key,storageArea:store});
  assert(left.hasDiverged);assert.equal(left.state.week,3);assert.equal(right.state.week,2);
  const persisted=runtime(true).CommonEarthSim.create({storage:store});assert.equal(persisted.state.week,2);
  left.destroy();right.destroy();persisted.destroy();
});
test('incompressible Unicode retains the exact plain payload and private temporary worlds retain their listing after a switch',async()=>{
  const c=runtime(true),codec=c.EarthWorldStorage,parts=[];let value=13;
  for(let block=0;block<35;block++){
    const chars=new Uint16Array(16384);
    for(let i=0;i<chars.length;i++){value=(Math.imul(value,1664525)+1013904223)>>>0;chars[i]=value>>>16;}
    parts.push(String.fromCharCode.apply(null,chars));
  }
  const noise=parts.join('');assert.equal(codec.prepare(noise),noise);
  const store=storage(300),raw=largeWorld(c);let serial=0;
  const book=c.EarthSaves.open({storage:store,session:null,locks:null,idGenerator:()=> 'temp-world-'+(++serial)});
  const review=book.prepareImport(raw);assert(review.ok);
  const opened=await book.confirmImport(review.token,'Keepsake');assert(opened.temporary);
  assert(book.sim.advance().ok);assert.equal(book.sim.state.week,2);
  assert((await book.select('original')).ok);
  const away=book.list().find(row=>row.id===opened.id);assert.equal(away.week,2);assert.equal(away.settlements,1);
  assert((await book.select(opened.id)).ok);assert.equal(JSON.parse(book.exportWorld().text).world.week,2);
  book.dispose();
});
