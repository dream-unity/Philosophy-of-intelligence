'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');

function fixture(water=false,snapshot=null){
  let milliseconds=100000;
  class GameDate extends Date{static now(){return milliseconds;}}
  const runtime=vm.createContext({console,structuredClone,Date:GameDate});runtime.window=runtime;
  const load=name=>vm.runInContext(fs.readFileSync(path.join(dir,name+'.js'),'utf8'),runtime,{filename:name+'.js'});
  for(const m of fs.readFileSync(path.join(dir,'index.html'),'utf8').matchAll(/<script src="([\w-]+)\.js(?:\?[^"]*)?"[^>]*><\/script>/g)){
    load(m[1]);if(m[1]==='simulation')break;
  }
  load('regional-render');load('street');
  const sim=runtime.CommonEarthSim.create({storage:null,snapshot});
  if(!sim.active())assert.ok(sim.found({name:water?'Open sea':'Port settlement',region:'Regional camera test',lat:water?-20:-6.16,lon:water?-140:39.19,water}).ok);
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
  function streetAt(site,spectator=false){const scene=runtime.EarthStreet.mount(canvas,{spectator,getWorld:()=>world,getWeek:()=>world.week});
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

test('the bottom-left minimap jumps to any point and preserves each community’s survey',()=>{
  const {sim,world,home,geo,streetAt,runtime,makeCanvas,load,events}=fixture(),scene=streetAt(home);
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
  map.refresh();
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
