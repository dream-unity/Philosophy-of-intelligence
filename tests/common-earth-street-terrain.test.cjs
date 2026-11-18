'use strict';
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const game = process.env.COMMON_EARTH_GAME_DIR || path.resolve(__dirname, '../common-earth');
const source = readFileSync(path.join(game, 'street.js'), 'utf8');

function waterfront(memory) {
  let frame, now=0, underlay;
  const paints=[];
  function element() {
    const noop=()=>{};
    const node={children:[], style:{}, getAttribute:()=>null, setAttribute:noop, removeAttribute:noop,
      addEventListener:noop, removeEventListener:noop, remove:noop, append:noop, querySelector:()=>null,
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
  const canvas=element(),stage=element();
  stage.classList={contains:key=>key==='street-stage'};stage.appendChild(canvas);
  canvas.before=clip=>{underlay=clip;};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:1024,height:620});
  const surroundings={profile:()=> 'ocean',background:()=>['#abc','#def'],paint(g,project,unit,site){
    paints.push({site:site.id,patch:g.clipped,dock:site.buildings.some(b=>b.kind==='fishingDock')});
  }};
  const runtime={
    window:{...element(),EarthTownSurroundings:surroundings,
      EarthConstruction:{streetPoint:job=>({x:3+(job.plot%3)*6,y:5.04+Math.floor(job.plot/3)*6})}},
    document:{...element(),createElement:element,createElementNS:element,body:{hasAttribute:()=>false}},
    navigator:{deviceMemory:memory},matchMedia:()=>({matches:false}),
    requestAnimationFrame(fn){frame=fn;return 1;},cancelAnimationFrame(){frame=null;}
  };
  vm.runInNewContext(source,runtime,{filename:'street.js'});
  const street=runtime.window.EarthStreet.mount(canvas);
  function draw() {const next=frame;frame=null;assert.ok(next);next(now+=100);}
  function visit(site){street.setSite(site);draw();return underlay.children.at(-1);}
  return {street,paints,draw,visit};
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
