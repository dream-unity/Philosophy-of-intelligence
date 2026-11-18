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

async function atlas(options={}) {
  const handlers=new Map(),selected=[];
  // Keep rendering active so hit tests use positions and labels from the real
  // projection. The tiny image only supplies the software relief renderer.
  const context=new Proxy({
    measureText:text=>({width:text.length*7}),
    createRadialGradient:()=>({addColorStop:noop}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData:()=>({data:new Uint8ClampedArray(8)})
  },{get:(obj,k)=>k in obj?obj[k]:noop});
  const canvas={
    style:{},hasAttribute:()=>true,getAttribute:()=>true,getBoundingClientRect:()=>box,
    getContext:type=>type==='2d'?context:null,setPointerCapture:noop,releasePointerCapture:noop,
    addEventListener:(name,handler)=>handlers.set(name,handler),removeEventListener:noop
  };
  const document={baseURI:'https://example.invalid/game/',createElement:()=>({...canvas})};
  const windowHandlers=new Map();
  const window={addEventListener:(key,fn)=>windowHandlers.set(key,fn),removeEventListener:noop};
  class Image {
    constructor(){this.width=2;this.height=1;}
    set src(_){queueMicrotask(()=>this.onload());}
  }
  let frame,now=100;
  vm.runInNewContext(source,{document,window,Image,URL,performance:{now:()=>now},
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
  return {view,point,tap,selected,draw,blur:()=>windowHandlers.get('blur')?.()};
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
