'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');

function fixture(water=false,snapshot=null,place=null){
  let milliseconds=100000;
  class GameDate extends Date{static now(){return milliseconds;}}
  const runtime=vm.createContext({console,structuredClone,Date:GameDate});runtime.window=runtime;
  const load=name=>vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
  for(const m of fs.readFileSync(path.join(dir,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    load(m[1]);if(m[1]==='simulation')break;
  }
  load('regional-render');load('street');
  const sim=runtime.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found(place||{name:water?'Open sea':'Port settlement',region:'Regional camera test',lat:water?-20:-6.16,lon:water?-140:39.19,water}).ok);
  const w=1280,h=720,events=[],handlers=new Map();let frame;
  const noop=()=>{};
  const drawing=new Proxy({
    createImageData:(x,y)=>({data:new Uint8ClampedArray(x*y*4)}),
    createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),
    measureText:t=>({width:String(t).length*7})
  },{get:(target,k)=>k in target?target[k]:noop});
  function makeCanvas(active=false){return {width:1,height:1,style:{},getContext:()=>drawing,
    getAttribute:()=>null,setAttribute:noop,removeAttribute:noop,setPointerCapture:noop,
    getBoundingClientRect:()=>({left:0,top:0,width:active?w:0,height:active?h:0}),
    addEventListener:(type,fn)=>{if(active)handlers.set(type,fn);},removeEventListener:noop,
    dispatchEvent:e=>events.push(e),focus:noop};}
  runtime.document={hidden:false,body:{dataset:{},hasAttribute:()=>false},createElement:()=>makeCanvas(),addEventListener:noop,removeEventListener:noop};
  runtime.addEventListener=runtime.removeEventListener=noop;
  runtime.requestAnimationFrame=fn=>{frame=fn;return 1;};runtime.cancelAnimationFrame=noop;
  runtime.CustomEvent=class{constructor(type,args){this.type=type;Object.assign(this,args);}};
  const home=sim.active(),world=sim.state,geo=runtime.EarthRegionalWorld.geography(world,home),canvas=makeCanvas(true);
  function streetAt(site,spectator=false,handlers={}){const scene=runtime.EarthStreet.mount(canvas,{spectator,getWorld:()=>world,getWeek:()=>world.week,...handlers});
    scene.setSite(spectator?structuredClone(site):site);return scene;}
  let now=0;
  const paint=()=>{const f=frame;frame=null;if(f)f(now+=35);};
  const touch=(type,x,y,id=1)=>handlers.get(type)?.({type,clientX:x,clientY:y,pointerType:'touch',pointerId:id,button:0,preventDefault:noop});
  function swipe(scene,px,py){
    const view=scene.regionalCamera(),foot=view.footprint,dx=(view.x-px)*w/(foot.maxX-foot.minX),dy=(py-view.y)*h/(foot.maxY-foot.minY);
    const n=Math.ceil(Math.max(1,Math.abs(dx)/(w*.75),Math.abs(dy)/(h*.72)));
    for(let i=0;i<n;i++){
      const a=w/2-dx/n*.5,b=h/2-dy/n*.5;
      touch('pointerdown',a,b);touch('pointermove',a+dx/n,b+dy/n);touch('pointerup',a+dx/n,b+dy/n);paint();
    }
  }
  return {sim,world,home,geo,touch,swipe,paint,streetAt,events,runtime,makeCanvas,load,wait:ms=>{milliseconds+=ms;}};
}

test('tablet drags cross rural ground and reach another rendered district without moving a person or passing a week',()=>{
  for(const sea of [false,true]){
    const {sim,world,home,geo,swipe,paint,streetAt,events}=fixture(sea),s=streetAt(home);
    assert.ok(geo.towns.length>=4);
    const target=geo.towns.find(t=>t.site.id!==home.id);
    const invariants=()=>JSON.stringify([s.getState().x,s.getState().y,world.week,world.activeId,world.communityLife.homeId,world.regionalWorld]);
    const before=invariants();paint();
    swipe(s,target.x*.5,target.y*.5);
    assert.equal(events.filter(e=>e.type==='earthregionalinspect').at(-1).detail.kind,'terrain');
    swipe(s,target.x,target.y);
    assert.equal(events.filter(e=>e.type==='earthregionalinspect').at(-1).detail.siteId,target.site.id);
    assert.ok(Math.hypot(s.regionalCamera().x-target.x,s.regionalCamera().y-target.y)<.001);
    assert.equal(invariants(),before);
    const saved=s.snapshotView();s.recenter();assert.ok(s.restoreView(saved));
    assert.ok(Math.hypot(s.regionalCamera().x-target.x,s.regionalCamera().y-target.y)<.001);
    assert.equal(invariants(),before);s.destroy();sim.destroy();
  }
});

test('the neighbouring observation surface uses the same region bounds, arbitrary inspection and two-finger geographic zoom',()=>{
  const {sim,world,home,geo,swipe,paint,touch,streetAt,events}=fixture();
  const target=geo.towns.at(-1),s=streetAt(target.site,true);paint();
  const invariant=()=>JSON.stringify([world.activeId,world.communityLife.homeId,world.week,world.regionalWorld]);
  const before=invariant();
  swipe(s,0,0);assert.equal(events.filter(e=>e.type==='earthregionalinspect').at(-1).detail.siteId,home.id);
  assert.ok(s.inspectRegion(2.17,-.93));paint();
  const picked=events.filter(e=>e.type==='earthregionalinspect'&&e.detail.picked).at(-1).detail;
  assert.equal(picked.siteId,null);assert.ok(Math.hypot(picked.x-2.17,picked.y+.93)<1e-7);
  touch('pointerdown',160,330,1);touch('pointerdown',1120,330,2);
  for(let i=1;i<=10;i++){touch('pointermove',160+460*i/10,330,1);touch('pointermove',1120-460*i/10,330,2);}
  touch('pointerup',620,330,1);touch('pointerup',660,330,2);paint();
  assert.ok(s.regionalCamera().zoom<.29);
  s.inspectRegion(geo.bounds.maxX+10000,geo.bounds.minY-40);paint();
  assert.ok(Math.abs(s.regionalCamera().x-geo.bounds.maxX)<1e-7);assert.ok(Math.abs(s.regionalCamera().y-geo.bounds.minY)<1e-7);
  assert.equal(invariant(),before);s.destroy();sim.destroy();
});

function mountMap(f,scene){
  const {runtime,makeCanvas,load,sim}=f;
  const nodes=new Map();
  function element(id){
    const o=makeCanvas(),handlers=new Map();
    Object.assign(o,{hidden:id==='region-view'||id==='region-streets',value:'',clientWidth:id==='region-land'?780:98,
      clientHeight:id==='region-land'?500:70,children:[],addEventListener:(name,fn)=>handlers.set(name,fn),
      fire:(name,e)=>handlers.get(name)?.(e),querySelector:()=>element('mini-surface'),replaceChildren:(...opts)=>{o.children=opts;}});
    nodes.set(id,o);return o;
  }
  for(const id of ['region-view','region-mini','region-land','region-town','region-info','region-overlay','region-open',
    'street-stage','region-streets','region-layout','region-fit','region-close','region-closer','region-further'])element(id);
  runtime.document.getElementById=id=>nodes.get(id);
  runtime.Option=class{constructor(label,value){this.label=label;this.value=value;}};
  runtime.ResizeObserver=class{observe(){}};runtime.setInterval=()=>1;runtime.clearTimeout=()=>{};
  load('region-map');
  const map=runtime.EarthRegionMap.mount({sim,getScene:()=>scene,watch:()=>assert.fail('Map selection caused a district transfer')});
  return {map,nodes};
}

test('the street minimap jumps to any point and preserves each community’s survey',()=>{
  const f=fixture(),{sim,world,home,geo,streetAt,events}=f,scene=streetAt(home);
  const {map,nodes}=mountMap(f,scene);map.refresh();
  const before=JSON.stringify([world.week,world.activeId,world.regionalWorld,scene.getState().x,scene.getState().y]);
  const picker=nodes.get('region-overlay');picker.value=geo.towns[2].site.id;picker.fire('change');
  assert.equal(scene.regionalCamera().exploration,picker.value);
  const x=1.765,y=-.825,b=geo.bounds;
  const child=nodes.get('mini-surface'),px=(x-b.minX)/(b.maxX-b.minX)*child.clientWidth,py=(b.maxY-y)/(b.maxY-b.minY)*child.clientHeight;
  nodes.get('region-mini').fire('click',{clientX:px,clientY:py,detail:1});
  assert.equal(nodes.get('region-view').hidden,true);
  const camera=scene.regionalCamera();assert.ok(Math.hypot(camera.x-x,camera.y-y)<1e-9);
  assert.equal(events.filter(e=>e.detail?.picked).at(-1).detail.kind,'terrain');
  assert.equal(JSON.stringify([world.week,world.activeId,world.regionalWorld,scene.getState().x,scene.getState().y]),before);
  scene.destroy();sim.destroy();
});


test('a burst of tablet atlas inputs paints once per frame and still picks the final geographic coordinate',()=>{
  const f=fixture(),{runtime,geo,home}=f,frames=[];
  const scene=f.streetAt(home),original=runtime.EarthRegionalRender;
  let landscapes=0,atlasFrames=0,miniFrames=0;
  runtime.EarthRegionalRender={...original,
    soil(...args){landscapes++;return original.soil(...args);},
    actors(context,world,base,view,mini){
      if(mini)miniFrames++;else atlasFrames++;
      return original.actors(context,world,base,view,mini);
    }
  };
  runtime.requestAnimationFrame=fn=>{frames.push(fn);return 1;};
  runtime.setTimeout=()=>1;
  const {map,nodes}=mountMap(f,scene),land=nodes.get('region-land');
  map.refresh();map.open();
  const opening=landscapes,painted=atlasFrames,miniAtOpen=miniFrames,before=JSON.stringify(f.world);
  function pointer(type,x,y){land.fire(type,{type,pointerId:1,button:0,clientX:x,clientY:y});}
  pointer('pointerdown',300,250);
  for(let x=301;x<=330;x++)pointer('pointermove',x,250);
  pointer('pointerup',330,250);
  assert.equal(landscapes,opening);
  assert.equal(frames.length,1);
  frames.shift()();
  assert.equal(atlasFrames,painted+1,'the final camera and travellers were drawn');
  assert.equal(miniFrames,miniAtOpen,'the covered minimap was not drawn');
  assert.equal(landscapes,opening,'the 30-pixel pan stayed within the buffered terrain');
  pointer('pointerdown',390,250);pointer('pointerup',390,250);
  const camera=scene.regionalCamera(),fit=original.fit(geo,780,500);
  assert.ok(Math.abs(camera.x-(fit.x-30/fit.sx))<1e-8);
  assert.equal(camera.y,fit.y);
  assert.equal(JSON.stringify(f.world),before);
  scene.destroy();f.sim.destroy();
});

test('deferred regional terrain resolves to the exact full-resolution raster for the same survey',()=>{
  const f=fixture(),{runtime,geo}=f,render=runtime.EarthRegionalRender;
  const noop=()=>{};
  runtime.document.createElement=()=>{
    const tile={width:0,height:0};
    tile.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:data=>{tile.pixels=Buffer.from(data.data);}});
    return tile;
  };
  const view=render.fit(geo,390,290);
  function draw(renderer,prepare){
    const parts=[];
    const g={fillRect:noop,save:noop,beginPath:noop,rect:noop,clip:noop,restore:noop,
      drawImage:(tile,...dest)=>parts.push({width:tile.width,dest,pixels:tile.pixels})};
    renderer.soil(g,geo,view,false,null,prepare);return parts;
  }
  const jobs=[],initial=draw(render,job=>jobs.push(job));
  assert.ok(jobs.length>0);assert.ok(initial.every(p=>p.width===20));
  for(const job of jobs)job();
  const complete=draw(render,()=>assert.fail('A prepared tile was queued twice'));
  assert.ok(complete.every(p=>p.width===48));
  f.load('regional-render');
  assert.deepEqual(complete,draw(runtime.EarthRegionalRender));
  f.sim.destroy();
});

test('offscreen and superseded regional views stop preparing tiles and never apply an obsolete background',()=>{
  const f=fixture(),{runtime}=f,callbacks=new Map();
  let id=0,active=true,finished=0,tiles=0;
  runtime.requestIdleCallback=fn=>{callbacks.set(++id,fn);return id;};
  runtime.cancelIdleCallback=key=>callbacks.delete(key);
  const work=runtime.EarthRegionalRender.tileRefinement(()=>active,()=>finished++);
  for(let i=0;i<4;i++)work.add(()=>tiles++);
  function pulse(){
    const [key,fn]=callbacks.entries().next().value;
    callbacks.delete(key);fn({timeRemaining:()=>0});
  }
  work.wake();active=false;pulse();
  assert.equal(tiles,0);assert.equal(callbacks.size,0);
  active=true;work.wake();pulse();assert.equal(tiles,1);assert.equal(callbacks.size,1);
  work.cancel();assert.equal(callbacks.size,0);assert.equal(finished,0);
  work.add(()=>tiles++);work.wake();pulse();
  assert.equal(tiles,2);assert.equal(finished,1);assert.equal(callbacks.size,0);
  f.sim.destroy();
});

test('a save made after real travel reopens in the host town and can be panned all the way home',()=>{
  const first=fixture(),host=first.geo.towns.at(-1).site;
  function crossing(action,target){
    const site=first.sim.active(),actor='steward';
    return first.sim.communityLife({site:site.id,actor,week:first.world.week,action,target},
      {siteId:site.id,actor,mode:'walk',target:'market',x:6,y:6,tx:6,ty:6});
  }
  const departure=crossing('depart',host.id);assert.ok(departure.ok,departure.message);
  first.wait(120000);const arrival=crossing('arrive',host.id);assert.ok(arrival.arrived,arrival.message);
  const save=JSON.stringify(first.world);assert.ok(first.runtime.CommonEarthSim.readSave(save));first.sim.destroy();
  const reopened=fixture(false,save),s=reopened.streetAt(reopened.home);
  assert.equal(reopened.home.id,host.id);
  const state=()=>JSON.stringify([reopened.world.week,reopened.world.activeId,reopened.world.communityLife.homeId,
    reopened.world.regionalWorld,s.getState().x,s.getState().y]);
  const before=state();reopened.paint();reopened.swipe(s,0,0);
  assert.equal(reopened.events.filter(e=>e.type==='earthregionalinspect').at(-1).detail.siteId,first.home.id);
  assert.equal(state(),before);s.destroy();reopened.sim.destroy();
});

test('a street quay, its fishing water and its land approach agree with the regional surface',()=>{
  const {sim,runtime,world,home}=fixture();
  home.coastal=true;
  const geo=runtime.EarthRegionalWorld.geography(world,home),t=geo.towns.find(t=>t.site===home);
  function surface(x,y){
    const at=runtime.EarthRegionalRender.regionalPoint(t,x,y);
    const soil=runtime.EarthRegionalWorld.terrain(geo,at.x,at.y);
    const local=runtime.EarthRegionalRender.localPoint(t,at.x,at.y);
    assert.ok(Math.hypot(local.x-x,local.y-y)<.00001);
    return soil.kind;
  }
  for(const x of [3,12,21]){
    assert.ok(['meadow','woodland','rock'].includes(surface(x,23.95)));
    assert.equal(surface(x,25.5),'shore');
    assert.equal(surface(x,27.5),'water');
  }
  sim.destroy();
});

test('an outlying trading frontage belongs to its growing town while nearby unbuilt land remains open',()=>{
  const {sim,runtime,home,world,streetAt,events}=fixture();
  const g=runtime.EarthDistrictGrowth.register(home,runtime.EarthDistrictGrowth.members(home));
  const holder=g.households[0],lot=32,address=runtime.EarthDistrictGrowth.shopPoint(home,lot);
  Object.assign(holder,{shop:'weaving',businessPlot:lot,shopSite:address});
  const t=runtime.EarthRegionalWorld.geography(world,home).towns.find(t=>t.site===home);
  const s=streetAt(home);
  const lookup=(x,y)=>{
    const p=runtime.EarthRegionalRender.regionalPoint(t,x,y);s.inspectRegion(p.x,p.y);
    return events.filter(e=>e.detail?.picked).at(-1).detail;
  };
  assert.ok(address.x<-4);
  assert.equal(lookup(address.x,address.y).siteId,home.id);
  assert.equal(lookup(address.x-2.1,address.y+1.5).siteId,null);
  s.destroy();sim.destroy();
});

test('a local building proposal preserves free observation and cannot confirm a plot in another town',()=>{
  const {sim,geo,home,streetAt,paint,touch,swipe,events}=fixture();
  const placements=[],s=streetAt(home,false,{onPlace:q=>placements.push(q)});
  const active=geo.towns.find(t=>t.site.id===home.id),neighbour=geo.towns.find(t=>t!==active);
  s.setPlacement('garden');paint();assert.equal(s.getState().placement,'garden');
  const original=[s.getState().x,s.getState().y,sim.state.week];
  swipe(s,neighbour.x,neighbour.y);
  assert.equal(events.filter(e=>e.type==='earthregionalinspect').at(-1).detail.siteId,neighbour.site.id);
  assert.equal(s.interact(),false);
  for(let i=0;i<2;i++){touch('pointerdown',640,382);touch('pointerup',640,382);}
  assert.equal(placements.length,0);
  s.zoomBy(.001);assert.ok(s.regionalCamera().zoom<.29);
  assert.equal(s.getState().placement,'garden');
  s.inspectRegion(active.x,active.y,{zoom:.55});paint();
  assert.equal(s.interact(),true);assert.equal(placements.length,1);
  assert.deepEqual([s.getState().x,s.getState().y,sim.state.week],original);
  s.destroy();sim.destroy();
});

test('touching a neighbouring truck reports its actual assignment without moving the original or taking custody',()=>{
  const {sim,runtime,world,geo,home,streetAt,paint,touch,events}=fixture();
  const away=geo.towns.find(t=>t.site.id!==home.id),s=streetAt(home);
  const before=JSON.stringify([world.week,world.activeId,away.site.fleet,home.fleet,s.getState().x,s.getState().y]);
  const cab=runtime.EarthRegionalRender.regionalPoint(away,15,23.69);
  s.inspectRegion(cab.x,cab.y,{zoom:1});paint();
  const span=s.regionalCamera().footprint,unit=1280/(span.maxX-span.minX)*runtime.EarthRegionalRender.KM;
  const y=720*.53-.44*unit;
  touch('pointerdown',640,y);touch('pointerup',640,y);
  const hit=events.filter(e=>e.detail?.picked).at(-1).detail;
  const truck=(hit.choices||[hit]).find(c=>c.assetId==='truck');
  assert.ok(truck);assert.equal(truck.siteId,away.site.id);
  const expected=runtime.EarthFleet.assignment(world,away.site);
  for(const field of ['owner','operator','destination','reason'])assert.equal(truck.assignment[field],expected[field]);
  assert.equal(JSON.stringify([world.week,world.activeId,away.site.fleet,home.fleet,s.getState().x,s.getState().y]),before);
  s.destroy();sim.destroy();
});

test('a regional surveyor remains individually selectable as the regional map zooms out around the field party',()=>{
  const {sim,runtime,world,geo,home,streetAt,paint,touch,events,wait}=fixture();
  home.food=40;home.materials=40;home.funds=50;
  assert.ok(sim.regionalWork({kind:'survey',x:1.43,y:1.11,siteId:home.id,originId:geo.origin.id,week:world.week}).ok);
  wait(3500);
  const people=runtime.EarthRegionalWorld.travellers(world,home),surveyor=people.find(p=>p.siteId===home.id&&p.kind==='survey');
  assert.ok(surveyor);
  const s=streetAt(home),before=JSON.stringify([world.week,world.activeId,world.regionalWorld,s.getState().x,s.getState().y]);
  s.inspectRegion(surveyor.x,surveyor.y,{zoom:.24});paint();
  touch('pointerdown',640,720*.53-1);touch('pointerup',640,720*.53-1);
  const hit=events.filter(e=>e.detail?.picked).at(-1).detail;
  const seen=(hit.choices||[hit]).find(c=>c.personId===surveyor.personId&&c.inTransit);
  assert.equal(seen.personName,surveyor.name);assert.equal(seen.activity.destination,surveyor.destination);
  assert.equal(JSON.stringify([world.week,world.activeId,world.regionalWorld,s.getState().x,s.getState().y]),before);
  s.destroy();sim.destroy();
});

test('one touch on overlapping founding travellers exposes both identities in the on-scene chooser',()=>{
  const {sim,runtime,world,geo,home,streetAt,paint,touch,events,wait,load}=fixture();
  home.food=50;home.materials=50;home.funds=60;
  const p={x:2.11,y:.95},propose=kind=>sim.regionalWork({kind,...p,siteId:home.id,originId:geo.origin.id,week:world.week});
  assert.ok(propose('survey').ok);
  for(let i=0;i<40&&world.regionalWorld.regions[geo.origin.id].trips[home.id];i++){
    wait(24100);assert.ok(sim.production(world.productionSerial||0,()=>true).ok);
  }
  const found=propose('found');assert.ok(found.ok,found.message);wait(3500);
  const party=runtime.EarthRegionalWorld.travellers(world,home).filter(p=>p.siteId===home.id&&p.kind==='found');
  assert.equal(party.length,2);
  const street=streetAt(home),lead=party[0],centre={x:(lead.x+party[1].x)/2,y:(lead.y+party[1].y)/2};
  street.inspectRegion(centre.x,centre.y,{zoom:.045});paint();
  const before=JSON.stringify([world.week,world.activeId,world.regionalWorld,street.getState().x,street.getState().y]);
  touch('pointerdown',640,720*.53);touch('pointerup',640,720*.53);
  const hit=events.filter(e=>e.detail?.picked).at(-1).detail;
  for(const traveller of party)assert.ok(hit.choices.some(c=>c.personName===traveller.name&&c.inTransit));
  const nodes=new Map(),handler=()=>assert.fail('selecting a traveller triggered a command');
  function node(tag){
    return {tag,children:[],events:{},focus(){},setAttribute(){},
      append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},
      querySelector(tag){if(this.tag===tag)return this;for(const n of this.children){const found=n.querySelector(tag);if(found)return found;}},
      addEventListener(key,fn){this.events[key]=fn;}};
  }
  runtime.document.body.toggleAttribute=()=>{};
  runtime.document.createElement=tag=>node(tag);
  runtime.document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,node('section'));return nodes.get(id);};
  load('regional-inspector');
  runtime.EarthRegionalInspector.mount({sim,street:()=>street,watch:handler,travel:handler,returnStreet:handler,
    refresh:handler,ledger:handler,contextChanged:()=>{}});
  nodes.get('street-stage').events.earthregionalinspect({detail:hit});
  const panel=nodes.get('region-point-detail');
  for(const traveller of party){
    const field=panel.querySelector('select');field.value=String(hit.choices.findIndex(c=>c.personId===traveller.personId));field.events.change();
    assert.equal(nodes.get('region-context-name').textContent,traveller.name);
    assert.equal(panel.querySelector('select').children.length,hit.choices.length);
  }
  assert.equal(JSON.stringify([world.week,world.activeId,world.regionalWorld,street.getState().x,street.getState().y]),before);
  street.destroy();sim.destroy();
});

test('an open Town Centre dialog stays visible above the observed street',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(dir,'district-desk.css'),'utf8');
  assert.match(html,/<dialog id="town-centre"/);
  // A hidden modal still makes the rest of the page inert in native browsers.
  const observerMask=css.match(/body\[data-observing-town\] #street-stage > :not\(([^)]*)\)/);
  if(observerMask)assert.ok(observerMask[1].split(',').map(s=>s.trim()).includes('dialog[open]'));
});

test('the street keeps both fighters on the map and allows walking, running and driving during pursuit',()=>{
  const {sim,world,home,streetAt,wait,paint}=fixture(false,null,{name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false});
  const target=world.communityLife.outposts.find(t=>t.name==='Reed Quay');
  const act=(action,id)=>sim.communityLife({site:sim.active().id,actor:'steward',week:world.week,action,target:id},
    {siteId:sim.active().id,actor:'steward',mode:'walk',target:'market',x:0,y:0,tx:0,ty:0});
  assert.ok(act('depart',target.id).ok);wait(7000);assert.ok(act('arrive',target.id).arrived);
  const street=streetAt(target),watch=target.communityLife.border.street;
  const before=street.getState();paint();
  assert.ok(street.fightProof());assert.notEqual(street.fightProof().gx,before.x);
  assert.ok(street.move('left')||street.move('right'));assert.notDeepEqual([street.getState().x,street.getState().y],[before.x,before.y]);
  const moving=street.getState();street.setSite(target);assert.equal(street.getState().x,moving.x);
  assert.ok(act('resist',watch.guard.key).ok);paint();
  assert.ok(street.runFromWatch());street.setSite(target);paint();
  street.cancelTravel();assert.ok(street.toggleVehicle());
  for(let i=0;i<180&&street.getState().mode!=='drive';i++)paint();
  assert.equal(street.getState().mode,'drive');const parked=street.getState();
  assert.ok(street.move('left')||street.move('right')||street.move('down')||street.move('up'));
  assert.notDeepEqual([street.getState().x,street.getState().y],[parked.x,parked.y]);
  street.setSite(target);paint();assert.equal(street.getState().mode,'drive');
  assert.ok(act('withdraw',watch.guard.key).arrived);street.setSite(sim.active());paint();
  assert.equal(sim.active(),home);assert.equal(target.communityLife.border.street,undefined);
  street.destroy();sim.destroy();
});
