'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const game=process.env.COMMON_EARTH_GAME_DIR || path.join(__dirname,'../common-earth');
const source=fs.readFileSync(path.join(game,'globe.js'),'utf8');
const box={left:32,top:58,width:320,height:300};
const noop=()=>{};

async function atlas(options={},layered=false,withGpu=false) {
  const handlers=new Map(),selected=[],paints={relief:0,transform:[]};
  // Keep rendering active so hit tests use positions and labels from the real
  // projection. The tiny image only supplies the software relief renderer.
  const context=new Proxy({
    measureText:text=>({width:text.length*7}),
    createRadialGradient:()=>({addColorStop:noop}),
    setTransform:(...values)=>{paints.transform=values;},
    putImageData:()=>{paints.relief++;},
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData:()=>({data:new Uint8ClampedArray(8)})
  },{get:(obj,k)=>k in obj?obj[k]:noop});
  const canvas={
    style:{},hasAttribute:()=>true,getAttribute:()=>true,getBoundingClientRect:()=>box,
    getContext:type=>type==='2d'?context:null,setPointerCapture:noop,releasePointerCapture:noop,
    addEventListener:(name,handler)=>handlers.set(name,handler),removeEventListener:noop
  };
  const layers=[];
  if(layered){
    canvas.parentElement={classList:{contains:s=>s==='atlas-stage'}};
    canvas.before=surface=>{
      const at=layers.indexOf(surface);if(at>=0)layers.splice(at,1);layers.push(surface);
    };
  }
  const documentHandlers=new Map(),timers=new Map();
  let timerId=0,gpuLost=false;
  const gl=withGpu?new Proxy({NO_ERROR:0,getError:()=>0,getParameter:()=>4096,
    getProgramParameter:()=>true,getShaderParameter:()=>true,isContextLost:()=>gpuLost,
    getExtension:()=>({loseContext:noop})},{get:(obj,k)=>k in obj?obj[k]:noop}):null;
  const document={baseURI:'https://example.invalid/game/',
    addEventListener:(key,fn)=>documentHandlers.set(key,fn),removeEventListener:noop,createElement:()=>{
    const surface={...canvas,style:{},setAttribute:noop,getContext:type=>type==='webgl'?gl:context};
    const listeners=new Map();
    surface.addEventListener=(type,fn)=>listeners.set(type,fn);
    surface.removeEventListener=(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);};
    surface.dispatchEvent=event=>listeners.get(event.type)?.(event);
    surface.hasListener=type=>listeners.has(type);
    surface.remove=()=>{const at=layers.indexOf(surface);if(at>=0)layers.splice(at,1);};
    return surface;
  }};
  const windowHandlers=new Map();
  const window={addEventListener:(key,fn)=>windowHandlers.set(key,fn),removeEventListener:noop};
  class Image {
    constructor(){this.width=2;this.height=1;}
    set src(_){queueMicrotask(()=>this.onload());}
  }
  let frame,now=100;
  vm.runInNewContext(source,{document,window,Image,URL,performance:{now:()=>now},
    setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:noop});
  const view=window.EarthAtlas.mount(canvas,{lat:0,lon:0,...options,onSelect:p=>selected.push(p)});
  await view.ready;
  const draw=()=>{if(frame){const f=frame;frame=null;f(now);}};
  draw();
  function point(type,x,y,id=1) {
    now+=5;
    handlers.get('pointer'+type)({pointerId:id,pointerType:'touch',button:0,clientX:x+box.left,clientY:y+box.top});
  }
  const tap=(x,y)=>{point('down',x,y);point('up',x,y);};
  const hide=hidden=>{document.hidden=hidden;documentHandlers.get('visibilitychange')?.();};
  const expire=()=>{for(const [id,t] of timers){timers.delete(id);t.fn();}};
  return {window,canvas,layers,view,point,tap,selected,draw,hide,expire,paints,
    loseGpu:()=>{gpuLost=true;layers[1].dispatchEvent({type:'webglcontextlost'});},
    restoreOverlay:()=>handlers.get('contextrestored')?.(),blur:()=>windowHandlers.get('blur')?.()};
}

test('a small finger wobble selects without rotating, while swipes and cancellations never select',async()=>{
  const {view,point,selected}=await atlas();
  const before=view.getView();
  point('down',160,150);point('move',166,151);point('up',166,151);
  assert.equal(selected.length,1);
  assert.deepEqual(view.getView(),before);
  point('down',160,150);point('up',210,150); // final movement can arrive only at release
  point('down',160,150);point('cancel',160,150);
  assert.equal(selected.length,1);
  point('down',160,150);point('move',163,150);point('move',194,168);point('up',194,168);
  assert.notDeepEqual(view.getView(),before);
  assert.equal(selected.length,1);
});

test('adding and removing a third finger keeps the two-finger scale continuous',async()=>{
  const {view,point,selected}=await atlas();
  point('down',95,150,1);point('down',205,150,2);
  point('move',215,150,2);
  const before=view.getView();
  point('down',175,210,3);point('up',95,150,1);
  point('move',175,210,3); // the surviving pair has not moved
  assert.deepEqual(view.getView(),before);
  point('up',215,150,2);point('up',175,210,3);
  assert.equal(selected.length,0);
});

test('an off-centre pinch keeps the same geographic point beneath the moving midpoint',async()=>{
  const {view,point,tap,selected}=await atlas({lat:50,lon:170,zoom:1.5});
  tap(201,110);
  const ground=selected[0];
  point('down',169,107,1);point('down',233,113,2);
  point('move',162,116,1);point('move',274,132,2);
  point('up',162,116,1);point('up',274,132,2);
  tap(218,124);
  assert.ok(view.getView().zoom>1.5);
  assert.equal(selected.length,2);
  assert.ok(Math.abs(selected[1].lat-ground.lat)<1e-7);
  assert.ok(Math.abs(selected[1].lon-ground.lon)<1e-7);
});

test('a touch selects a settlement by its drawn name or its 44-pixel hit area',async()=>{
  const {view,tap,draw,selected}=await atlas();
  view.setSites([{id:'village',name:'Harbour neighbours',lat:0,lon:0,active:true}]);draw();
  tap(260,129); // visibly inside the caption, far from the pin
  tap(179,152); // just inside the finger-sized target, clear of the caption
  assert.deepEqual(selected.map(p=>p.id),['village','village']);
});

test('an intervening cancelled contact breaks the double-tap zoom sequence',async()=>{
  const {view,tap,point}=await atlas();
  tap(160,150);
  point('down',158,149);point('cancel',158,149);
  tap(160,150);
  assert.equal(view.getView().zoom,1);
  tap(160,150);
  assert.equal(view.getView().zoom,1.7);
});

test('switching away during a gesture leaves the next single-finger tap usable',async()=>{
  const {view,point,tap,blur,selected}=await atlas();
  point('down',140,150,2);point('down',185,150,3);
  blur();
  tap(160,150);
  assert.equal(selected.length,1);
  assert.equal(view.getView().zoom,1);
});

test('reopening the atlas restores its drawing surface, camera and settlement selection',async()=>{
  const {canvas,view,draw,tap,selected}=await atlas({lat:35,lon:18,zoom:6});
  view.setSites([{id:'port',name:'Port',lat:35,lon:18,active:true}]);
  draw();
  const size=[canvas.width,canvas.height],camera=view.getView();
  assert.ok(size.every(value=>value>1));
  for(let visit=0;visit<3;visit++){
    view.setActive(false);
    assert.deepEqual([canvas.width,canvas.height],[1,1]);
    view.setActive(true);
    draw();
    assert.deepEqual([canvas.width,canvas.height],size);
    assert.deepEqual(view.getView(),camera);
  }
  tap(160,150);
  assert.equal(selected[0].id,'port');
});

test('regional labels use the nearest touch target and preserve direct hits',()=>{
  const regionsSource=fs.readFileSync(path.join(game,'regions.js'),'utf8');
  const places=[{name:'West',lat:0,lon:0,importance:10},{name:'East',lat:0,lon:1,importance:10}];
  const win={EarthNavigation:{nearbyCities:()=>places}};
  vm.runInNewContext(regionsSource,{window:win});
  const regions=win.EarthRegions.mount('https://example.invalid/',noop);
  const ctx=new Proxy({measureText:t=>({width:t.length*6})},{get:(obj,k)=>k in obj?obj[k]:noop});
  regions.labels(ctx,(_lat,lon)=>({x:70+50*lon,y:70,z:1}),{lat:0,lon:0,zoom:7},300,180,600,[]);
  assert.equal(regions.hit({x:120,y:70},14).name,'East');
  assert.equal(regions.hit({x:117,y:80},14).name,'East');
  assert.equal(regions.hit({x:117,y:80}),null);
  assert.equal(regions.hit({x:30,y:130},14),null);
});


test('the layered atlas keeps touch selection live and releases and recreates its backing surfaces',async()=>{
  const {view,canvas,layers,selected,tap,draw}=await atlas({},true);
  assert.equal(layers.length,2);
  assert.ok(layers.every(s=>s.style.pointerEvents==='none' && s.width>1));
  view.setSites([{id:'harbour',name:'Harbour',lat:0,lon:0}]);draw();tap(160,150);
  assert.equal(selected.at(-1).id,'harbour');
  const home=view.getView();
  view.setActive(false);
  assert.ok([...layers,canvas].every(s=>s.width===1 && s.height===1));
  view.setActive(true);draw();
  assert.deepEqual(view.getView(),home);assert.ok(layers.every(s=>s.width>1));
  view.focus(20,30,8);draw();
  assert.equal(layers[0].width,1,'the invisible starfield is released at close zoom');
  view.focus(home.lat,home.lon,home.zoom);draw();assert.ok(layers[0].width>1);
  view.destroy();assert.equal(layers.length,0);
});

test('slow place lookups select the latest tap and cannot reopen a hidden atlas',async()=>{
  const g=await atlas();
  let resolvePlaces;
  function hold(){
    const wait=new Promise(resolve=>{resolvePlaces=()=>{g.window.EarthNavigation={};resolve();};});
    g.window.EarthNavigation={load:()=>wait};
  }
  hold();g.tap(155,155);g.tap(232,170);
  assert.equal(g.selected.length,0);
  resolvePlaces();await new Promise(setImmediate);
  assert.equal(g.selected.length,1);
  const chosen=g.selected[0];
  assert(chosen.lon>0);
  hold();g.tap(122,145);g.view.setActive(false);resolvePlaces();await new Promise(setImmediate);
  assert.deepEqual(g.selected,[chosen]);
  g.view.setActive(true);g.draw();
  hold();g.tap(160,150);g.tap(161,150);assert.equal(g.view.getView().zoom,1.7);
  resolvePlaces();await new Promise(setImmediate);
  g.view.destroy();
});

test('a moving regional layer restores exact survey lines and responds to arriving tiles',async()=>{
  const {window,view,canvas,layers,point,draw}=await atlas({},true);
  let paints=0,invalidate;
  window.devicePixelRatio=2;
  window.EarthRegions={mount(_base,onTile){
    invalidate=onTile;
    return {draw(){paints++;},labels:noop,destroy:noop};
  }};
  view.resize();view.focus(52,1,8);draw();await new Promise(setImmediate);draw();
  const chart=layers[2];
  assert.equal(paints,1);assert.equal(chart.width,canvas.width);
  view.setSelection({name:'Harbour',lat:52,lon:1});draw();assert.equal(paints,1);
  invalidate();draw();assert.equal(paints,2,'a decoded tile invalidates the chart');
  point('down',160,151);point('move',184,152);draw();
  assert(chart.width<canvas.width,'camera motion keeps a lightweight regional layer');
  const before=paints;
  point('move',185,152);draw();
  assert.equal(paints,before);assert.match(chart.style.transform,/^matrix\(/);
  point('up',185,152);draw();assert.equal(paints,before+1);
  assert.equal(chart.width,canvas.width);assert.equal(chart.style.transform,'');
  view.setActive(false);assert.equal(chart.width,1);
  view.setActive(true);draw();assert.equal(chart.width,canvas.width);
  view.focus(0,0,1);draw();assert.equal(chart.width,1);
  view.destroy();assert.equal(layers.length,0);
});

test('short tab switches keep a warm atlas and a dormant tab releases its canvases',async()=>{
  const {view,canvas,layers,draw,hide,expire}=await atlas({},true);
  const size=canvas.width,camera=view.getView();
  hide(true);assert.equal(canvas.width,size);hide(false);expire();draw();
  assert.equal(canvas.width,size,'a cancelled background timer leaves the map warm');
  hide(true);expire();assert([...layers,canvas].every(s=>s.width===1&&s.height===1));
  view.resize();assert.equal(canvas.width,1,'a hidden orientation change waits for a visible page');
  hide(false);draw();assert.equal(canvas.width,size);assert.deepEqual(view.getView(),camera);
  hide(true);view.destroy();expire();assert.equal(layers.length,0);
});

test('restored canvas contexts rebuild the full-density atlas overlay and software relief',async()=>{
  const {window,layers,view,paints,restoreOverlay,draw,tap,selected}=await atlas({},true);
  window.devicePixelRatio=2;view.resize();draw();
  const relief=layers[1],before=paints.relief;
  relief.oncontextrestored();assert.equal(paints.relief,before+1,'restore cached relief at a stationary camera');
  paints.transform=[];restoreOverlay();assert.deepEqual(paints.transform,[2,0,0,2,0,0]);
  view.setSites([{id:'restored',name:'Restored',lat:0,lon:0}]);draw();tap(160,150);
  assert.equal(selected.at(-1).id,'restored');view.destroy();assert.equal(relief.oncontextrestored,null);
});

test('a fractional display ratio settles a padded chart even when its pixel dimensions match',async()=>{
  const {window,canvas,view,layers,point,draw}=await atlas({},true);
  canvas.getBoundingClientRect=()=>({...box,width:300,height:300});window.devicePixelRatio=1.08;
  window.EarthRegions={mount(){return {draw:noop,labels:noop,destroy:noop};}};
  view.resize();view.focus(48,2,10);draw();await new Promise(setImmediate);draw();
  const chart=layers[2],full=chart.width;assert.equal(full,324);
  point('down',140,150);point('move',176,151);draw();
  assert.equal(chart.width,full);assert.equal(chart.style.left,'-12px');
  point('up',176,151);draw();assert.equal(chart.width,full);assert.equal(chart.style.left,'0px');
  view.destroy();
});

test('losing the GPU switches to software at a stationary camera while regional UI stays in order',async()=>{
  const {window,view,layers,loseGpu,draw,tap,selected}=await atlas({},true,true);
  const gpu=layers[1];assert(gpu.hasListener('webglcontextlost'));
  window.EarthRegions={lookup:()=>null,mount(){return {draw:()=>{},labels:()=>{},destroy:()=>{},hit:()=>null};}};
  view.focus(44,12,8);draw();await new Promise(setImmediate);draw();
  const sky=layers[0],regional=layers[2];assert(regional);
  loseGpu();draw();assert.equal(layers.length,3);assert.equal(layers[0],sky);assert.equal(layers[2],regional);
  assert.notEqual(layers[1],gpu);assert.equal(typeof layers[1].oncontextrestored,'function');
  assert.equal(gpu.hasListener('webglcontextlost'),false);view.setSites([{id:'safe',name:'Port',lat:44,lon:12}]);draw();
  tap(160,150);assert.equal(selected.at(-1).id,'safe');view.destroy();assert.equal(layers.length,0);
});

test('six sovereign town pins at world scale can each be selected without hiding later breakaway towns',async()=>{
  const {view,tap,draw,selected}=await atlas();
  const home={id:'own',name:'Home',lat:0,lon:0,active:true};
  const neighbours=Array.from({length:6},(_,i)=>({id:'near-'+i,name:'Ward '+i,lat:.018+i*.001,lon:.012+i*.001,nearbyRank:i+1}));
  view.setSites([home,...neighbours]);draw();
  for(const [x,y] of [[126,172],[194,172],[126,105],[194,105],[126,233],[194,233]])tap(x,y);
  assert.deepEqual(selected.map(p=>p.id),neighbours.map(p=>p.id));
});
