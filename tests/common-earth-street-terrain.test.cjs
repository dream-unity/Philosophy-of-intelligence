'use strict';
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const source = readFileSync(path.join(game, 'street.js'), 'utf8');
const construction=readFileSync(path.join(game,'construction.js'),'utf8');

function waterfront(memory,{reduced=false,paintCost=1,timed=false,bitmap=null}={}) {
  let surfaces=0,frame, now=0, underlay, evenings=0, work=0, foregroundPaints=0;
  const paints=[],lampPaints=[];
  function element() {
    const noop=()=>{};
    const handlers=new Map();
    const node={handlers,children:[], style:{}, getAttribute:()=>null, setAttribute:noop, removeAttribute:noop,
      addEventListener:(type,fn)=>handlers.set(type,fn), removeEventListener:type=>handlers.delete(type), remove:noop, append:noop, querySelector:()=>null,
      appendChild(child){child.parentElement=this;this.children.push(child);},
      replaceWith(next){const p=this.parentElement;p.children[p.children.indexOf(this)]=next;next.parentElement=p;}
    };
    const clips=[];
    const brush=new Proxy({get clipped(){return clips.at(-1)||false;},save(){clips.push(this.clipped);},restore(){clips.pop();},
      clip(){clips[clips.length-1]=true;},createLinearGradient:()=>({addColorStop:noop}),measureText:()=>({width:10})},
    {get(target,key){return key in target?target[key]:noop;}});
    node.getContext=()=>brush;
    return node;
  }
  const canvas=element(),stage=element(),evening=element();
  stage.querySelector=selector=>selector==='#street-evening'?evening:null;
  stage.classList={contains:key=>key==='street-stage'};stage.appendChild(canvas);
  canvas.getContext().setTransform=()=>{foregroundPaints++;};
  canvas.before=clip=>{underlay=clip;};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:1024,height:620});
  const surroundings={profile:()=> 'ocean',background:()=>['#abc','#def'],paint(g,project,unit,site){
    paints.push({site:site.id,patch:g.clipped,dock:site.buildings.some(b=>b.kind==='fishingDock')});
  }};
  const runtime={
    window:{...element(),EarthTownSurroundings:surroundings,
      EarthTownLight:{lightsFor:()=>[{x:8,y:11,radius:1.22}],paving:g=>lampPaints.push(g),halo(){},blueHour(){evenings++;}}},
    document:{...element(),createElement:tag=>{if(tag==='canvas')surfaces++;return element();},createElementNS:element,body:{hasAttribute:()=>false}},
    performance:{now:()=>work+=paintCost},devicePixelRatio:2,navigator:{deviceMemory:memory},matchMedia:()=>({matches:reduced}),
    requestAnimationFrame(fn){frame=fn;return 1;},cancelAnimationFrame(){frame=null;}
  };
  if(bitmap)runtime.createImageBitmap=bitmap;
  const timers=new Map();let nextTimer=1;
  if(timed){
    runtime.setTimeout=(fn,delay)=>{const id=nextTimer++;timers.set(id,{fn,due:now+delay});return id;};
    runtime.clearTimeout=id=>timers.delete(id);
  }
  function wait(ms){
    const end=now+ms;
    for(;;){
      const next=[...timers.entries()].sort((a,b)=>a[1].due-b[1].due)[0];
      if(!next||next[1].due>end)break;
      const [id,timer]=next;timers.delete(id);now=Math.max(now,timer.due);timer.fn();
    }
    now=end;
  }
  vm.runInNewContext(construction,runtime,{filename:'construction.js'});
  vm.runInNewContext(source,runtime,{filename:'street.js'});
  const street=runtime.window.EarthStreet.mount(canvas);
  function draw(delta=100) {const next=frame;frame=null;assert.ok(next);next(now+=delta);}
  function visit(site){street.setSite(site);draw();return underlay.children.at(-1);}
  function pointer(type,id,x,y){
    canvas.handlers.get(type)({type,pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0});
  }
  function hideTab(hidden){runtime.document.hidden=hidden;runtime.document.handlers.get('visibilitychange')({});}
  return {surfaces:()=>surfaces,hideTab,wait,ground:()=>underlay.children.at(-1),paintCount:()=>foregroundPaints,street,paints,lampPaints,draw,visit,pointer,canvas,hasFrame:()=>Boolean(frame),evenings:()=>evenings,light:()=>evening.handlers.get('click')({})};
}
function site(id){return {id,name:id,lat:0,lon:12,water:true,residents:[],buildings:[]};}

test('ordinary lot updates repaint locally, while opening and removing a fishing dock repaint its shoreline landing',()=>{
  const {street,paints,visit}=waterfront(4),harbour=site('harbour');
  visit(harbour);
  assert.deepEqual(paints.at(-1),{site:'harbour',dock:false,patch:false});
  harbour.buildings.push({id:'garden',kind:'garden',plot:1});
  visit(harbour);assert.equal(paints.at(-1).patch,true);
  harbour.buildings.push({id:'dock',kind:'fishingDock',plot:0});
  visit(harbour);assert.deepEqual(paints.at(-1),{site:'harbour',dock:true,patch:false});
  harbour.buildings.pop();
  visit(harbour);assert.deepEqual(paints.at(-1),{site:'harbour',dock:false,patch:false});
  street.destroy();
});

test('an unchanged return visit reuses terrain and reconciles work started or completed in the other district',()=>{
  const {street,paints,visit,draw}=waterfront(4),a=site('north'),b=site('south');
  visit(a);visit(b);visit(a);visit(b);
  const before=paints.length;visit(a);assert.equal(paints.length,before);
  // Work began while north was offscreen. Its construction view arrives after its site.
  const job={id:'shed',scope:'street',kind:'workshop',plot:2,name:'Workshop',progress:.2,stageIndex:0};
  street.setConstruction({jobs:[job],workers:[]});draw();assert.equal(paints.at(-1).patch,true);
  visit(b);a.buildings.push({id:'shed-built',kind:'workshop',plot:2});visit(a);
  assert.deepEqual(paints.at(-1),{site:'north',dock:false,patch:false});
  visit(b);a.buildings.push({id:'dock',kind:'fishingDock',plot:0});visit(a);
  assert.deepEqual(paints.at(-1),{site:'north',dock:true,patch:false});
  const beforeDiscard=paints.length;street.discardTerrain();visit(a);
  assert.equal(paints.length,beforeDiscard+1);assert.equal(paints.at(-1).patch,false);
  const surface=visit(null);assert.equal(surface.width,1);street.destroy();
});

test('low-memory devices retain a single ground surface across visits',()=>{
  const {street,paints,visit}=waterfront(2),a=site('north'),b=site('south');
  const first=visit(a);
  for(const destination of [b,a,b,a])assert.equal(visit(destination),first);
  assert.equal(paints.length,5);street.destroy();
});


test('zooming into a busy low-memory harbour keeps reusing the visible prop surfaces',()=>{
  const g=waterfront(2);
  g.visit(site('harbour'));g.street.zoomBy(2);g.draw();
  g.pointer('pointerdown',1,470,280);
  function pan(start,end){
    for(let i=start;i<end;i++){g.pointer('pointermove',1,465+10*(i%2),280);g.draw(34);}
  }
  pan(0,20);
  const warm=g.surfaces();
  pan(20,50);
  assert.equal(g.surfaces(),warm,'neighbouring camera positions reuse the same raster surfaces');
  g.street.destroy();
});

test('reduced-motion paint wakes on input, rests between gestures and resolves at full detail',()=>{
  const g=waterfront(4,{reduced:true});
  g.visit(site('bay'));
  const fullWidth=g.canvas.width;
  assert.equal(g.hasFrame(),false,'the idle map rests');
  g.light();g.draw();assert.equal(g.evenings(),1);
  g.light();g.draw();assert.equal(g.evenings(),1);
  assert.equal(g.hasFrame(),false,'changing the light does not start a permanent loop');

  g.pointer('pointerdown',1,420,200);
  for(let i=1;i<=8;i++){g.pointer('pointermove',1,432+i*6,200);g.draw();}
  assert(g.canvas.width<fullWidth,'repeated slow drag frames use motion resolution');
  assert.equal(g.hasFrame(),false,'holding the finger still pauses the renderer');
  g.pointer('pointerup',1,480,200);g.draw();
  assert.equal(g.canvas.width,fullWidth,'lifting the finger restores the full-resolution image');
  assert.equal(g.hasFrame(),false);

  const start=g.street.getState().zoom;
  g.pointer('pointerdown',2,385,220);g.pointer('pointerdown',3,505,220);
  g.pointer('pointermove',3,555,220);g.draw();
  assert(g.street.getState().zoom>start);
  assert.equal(g.hasFrame(),false,'pinch redraws only when fingers move');
  g.pointer('pointerup',3,555,220);g.draw();g.pointer('pointerup',2,385,220);
  if(g.hasFrame())g.draw();
  assert.equal(g.hasFrame(),false);
  g.street.destroy();
});

test('lamp pools are painted once in the evening, restored after a lot repair and removed without rebaking for daylight',()=>{
  const {street,paints,lampPaints,draw,visit,light}=waterfront(4),harbour=site('port');
  visit(harbour);assert.equal(lampPaints.length,0);
  light();draw();assert.equal(lampPaints.length,1);
  for(let i=0;i<4;i++)visit(harbour);
  assert.equal(lampPaints.length,1);
  harbour.buildings.push({id:'garden',kind:'garden',plot:1});
  visit(harbour);assert.equal(lampPaints.length,2);assert.equal(paints.at(-1).patch,true);
  const terrainPaints=paints.length;
  light();draw();assert.equal(lampPaints.length,2);assert.equal(paints.length,terrainPaints);
  light();draw();assert.equal(lampPaints.length,3);assert.equal(paints.length,terrainPaints);
  street.destroy();
});


test('travel uses extra display refreshes only with sustained headroom and preserves the walking route',()=>{
  function follow({memory=4,cost=1,reduced=false,refresh=60,stall=false}={}){
    const {street,visit,draw,paintCount}=waterfront(memory,{paintCost:cost,reduced});
    const town=site('harbour');town.residents=['A','B','C'].map((name,slot)=>({name,slot,id:'r'+slot}));
    visit(town);assert(street.focusResident('r1'));
    let elapsed=0,samples=0;
    while(street.getState().travelling && elapsed<5000){
      const step=stall && elapsed>=750 && elapsed<1000 ? 1000/30 : 1000/refresh;
      const before=paintCount();draw(step);elapsed+=step;
      if(elapsed>1100 && elapsed<=2100)samples+=paintCount()-before;
    }
    const end=street.getState();street.destroy();
    assert.equal(end.travelling,false);assert.equal(end.x,21);assert.equal(end.y,17.04);
    return {elapsed,samples};
  }
  const fast=follow();assert(fast.samples>=58 && fast.samples<=61);
  const highRefresh=follow({refresh:120});assert(highRefresh.samples>=58 && highRefresh.samples<=61);
  for(const limited of [{memory:2},{cost:12},{reduced:true},{refresh:30},{stall:true}]){
    const trip=follow(limited);assert(trip.samples>=29 && trip.samples<=31,JSON.stringify({limited,trip}));
    assert(Math.abs(trip.elapsed-fast.elapsed)<=35);
  }
});


test('backgrounding releases viewport buffers and restores exactly the same street camera and terrain',()=>{
  const g=waterfront(4);
  const ground=g.visit(site('bay')),before=g.street.snapshotView(),fullWidth=g.canvas.width;
  assert.ok(fullWidth>1 && ground.width>1);
  g.hideTab(true);
  assert.equal(g.hasFrame(),false);
  assert.equal(g.canvas.width,1);
  assert.equal(g.canvas.height,1);
  assert.ok(ground.width>1);
  g.hideTab(false);g.draw();
  assert.equal(g.canvas.width,fullWidth);
  assert.equal(g.paints.length,1);
  assert.deepEqual(g.street.snapshotView(),before);
  g.street.destroy();
});

test('alternating missed refreshes reduce motion cost in stages and release restores full detail',()=>{
  const g=waterfront(4,{reduced:true});
  const tile=g.visit(site('bay')),groundWidth=tile.width,fullWidth=g.canvas.width;
  g.pointer('pointerdown',1,420,200);
  const sizes=new Set([fullWidth]);
  for(let i=1;i<=105;i++){
    g.pointer('pointermove',1,430+Math.sin(i/10)*75,200+Math.cos(i/10)*34);
    g.draw(i%2?50:1000/30);sizes.add(g.canvas.width);
  }
  assert.equal(sizes.size,3);
  assert.equal(g.canvas.width,1024);
  assert.equal(tile.width,groundWidth);
  g.pointer('pointerup',1,420,200);g.draw();
  assert.equal(g.canvas.width,fullWidth);
  g.street.destroy();
});

test('a restored foreground or backdrop wakes the stationary reduced-motion district',()=>{
  const g=waterfront(4,{reduced:true}),ground=g.visit(site('restore'));
  const backdrop=ground.parentElement.children[0];
  assert.equal(g.hasFrame(),false);
  const original=g.street.snapshotView();
  for(const surface of [g.canvas,backdrop]){
    surface.handlers.get('contextrestored')({});assert(g.hasFrame());g.draw();
    assert.equal(g.hasFrame(),false);assert.deepEqual(g.street.snapshotView(),original);
  }
  g.street.destroy();assert.equal(backdrop.handlers.has('contextrestored'),false);
});

test('a stationary placement guide and fading notice repaint the moving actors and clear the expired text',()=>{
  const g=waterfront(4),brush=g.canvas.getContext(),frames=[];
  brush.clearRect=()=>frames.push({clipped:brush.clipped,notice:false});
  brush.fillText=text=>{if(text.includes('Choose a marked')&&frames.length)frames.at(-1).notice=true;};
  g.visit(site('working-harbour'));
  g.street.setPlacement('garden');
  for(let i=0;i<6;i++)g.draw();
  assert(frames.at(-1).clipped,'the placement highlights are static between moving residents');
  g.pointer('pointerdown',4,1,1);g.pointer('pointerup',4,1,1);
  for(let i=0;i<42;i++)g.draw();
  const live=frames.filter(frame=>frame.notice);
  assert(live.length>5&&live.some(frame=>frame.clipped),'the instruction stays visible while people still move');
  const cleared=frames[frames.findLastIndex(frame=>frame.notice)+1];
  assert(cleared&&!cleared.clipped,'clearing the old text refreshes the foreground');
  assert(frames.at(-1).clipped);
  g.street.destroy();
});

test('terrain refinement leaves a complete district visible until the detailed floor is ready',()=>{
  const g=waterfront(4,{timed:true}),low=g.visit(site('inlet'));
  const width=low.width;
  assert.equal(width,84*16);
  g.wait(35);
  assert.equal(g.ground(),low);
  g.wait(100);g.draw(1);
  const detailed=g.ground();
  assert.notEqual(detailed,low);
  assert(detailed.width>width);
  assert.equal(low.width,1,'the opening buffer is released after the swap');
  g.street.destroy();g.wait(300);
});

test('plot changes, community switches and backgrounding discard refinements prepared for old scenery',()=>{
  const g=waterfront(4,{timed:true}),north=site('north-inlet'),south=site('south-inlet');
  g.visit(north);g.wait(18);
  north.buildings.push({id:'farm',kind:'garden',plot:1});g.visit(north);
  g.wait(18);
  const start=g.paints.length,low=g.visit(south),firstWidth=low.width;
  g.wait(18);g.hideTab(true);g.wait(200);
  assert.equal(g.ground(),low);
  assert(g.paints.slice(start).every(p=>p.site===south.id));
  g.hideTab(false);g.draw(1);g.wait(130);g.draw(1);
  assert(g.ground().width>firstWidth);
  assert(g.paints.slice(start).every(p=>p.site===south.id));
  g.street.destroy();
});

test('a stale asynchronous terrain upload cannot replace the floor in another community',async()=>{
  const pending=[],disposed=[];
  const bitmap=()=>new Promise(resolve=>pending.push(()=>resolve({close:()=>disposed.push(true)})));
  const g=waterfront(4,{timed:true,bitmap});
  const low=g.visit(site('first-bay'));g.wait(16);
  assert.equal(pending.length,1);
  g.visit(site('second-bay'));const other=g.ground();g.wait(16);
  assert.equal(pending.length,2);
  pending.shift()();await Promise.resolve();
  assert.equal(disposed.length,1);
  assert.equal(g.ground(),other);
  for(let i=0;i<8;i++){
    assert.equal(pending.length,1);pending.shift()();await Promise.resolve();g.wait(13);
  }
  g.draw(1);assert.notEqual(g.ground(),low);assert(g.ground().width>84*16);
  assert.equal(disposed.length,9);
  g.street.destroy();
});

test('software evening lighting copies each small lamp footprint once and keeps working when readback is protected',()=>{
  const g=waterfront(4),floor=g.visit(site('night-port')),brush=floor.getContext('2d'),reads=[];
  brush.getImageData=(x,y,w,h)=>{reads.push([x,y,w,h]);return {width:w,height:h};};
  g.light();g.draw();
  assert(reads.length>0);
  assert(reads.every(([, ,w,h])=>w<floor.width/8&&h<floor.height/8));
  const first=reads.length;g.draw();g.draw();assert.equal(reads.length,first);
  g.light();g.draw();
  let denied=0;brush.getImageData=()=>{denied++;throw Error('protected origin');};
  g.light();g.draw();assert.equal(denied,1);
  assert(g.evenings()>=2);g.street.destroy();
});
