'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');

// Mount the project controls used on Street, including their model and transaction guards.
function documentForInspector(){
  const roots=new Map(),doc={activeElement:null};
  class Control{
    constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this.style={};this.dataset={};}
    addEventListener(type,fn){this.events[type]=fn;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    contains(node){return this===node||this.children.some(child=>child.contains(node));}
    get isConnected(){return Array.from(roots.values()).some(root=>root.contains(this));}
    querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
    matches(selector){return selector===this.tag||selector.startsWith('.')&&(this.className||'').split(' ').includes(selector.slice(1));}
    querySelector(selector){
      for(const child of this.children){
        if(child.matches(selector))return child;
        const found=child.querySelector(selector);
        if(found)return found;
      }
      return null;
    }
    setAttribute(key,value){this.attrs[key]=value;}
    getAttribute(key){return this.attrs[key]??null;}
    click(){return this.events.click?.({target:this,currentTarget:this});}
    focus(){doc.activeElement=this;}
    scrollIntoView(){}
  }
  doc.createElement=tag=>new Control(tag);
  doc.getElementById=id=>{if(!roots.has(id))roots.set(id,new Control('section'));return roots.get(id);};
  doc.body=doc.getElementById('body');
  return doc;
}

test('a housing shortcut exposes only its selected proposal and a retired commission button cannot buy anything',async()=>{
  const document=documentForInspector(),w=vm.createContext({document});w.window=w;
  for(const name of ['construction','city','simulation','district-desk'])
    vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),w,{filename:name+'.js'});
  const sim=w.CommonEarthSim.create({storage:null});
  assert.equal(sim.found({name:'Melbourne',lat:-37.81,lon:144.96,water:false}).ok,true);
  const tools=new Map();let active=null;
  const hud={registerTool(id,module){tools.set(id,module);},active:()=>active,
    openTool(id){active=id;tools.get(id).render();return true;},notify(){}};
  const ui=w.EarthDistrictDesk.mount({sim,hud,redraw(){}});
  const panel=document.getElementById('scene-precinct'),pick=()=>panel.querySelector('button');
  const site=sim.active(),target=w.EarthCityModel.overview(site).records.find(r=>r.terrain.id==='shelter').id;
  assert(ui.project((target+1)%6,'food'));const original=pick();
  assert.equal(panel.querySelectorAll('select')[1].value,'food');
  const funds=site.funds,effort=sim.state.effort,materials=site.materials;
  assert(ui.project(target,'homes'));
  const controls=panel.querySelectorAll('select');
  assert.deepEqual(controls.map(c=>c.value),[String(target),'homes']);
  assert(!panel.contains(original));
  await original.click();assert.equal(site.construction.length,0);assert.equal(site.funds,funds);assert.equal(sim.state.effort,effort);
  const reviewed=pick();await reviewed.click();await reviewed.click();await original.click();
  assert.equal(site.construction.length,1);assert.equal(site.construction[0].precinct,target);assert.equal(site.construction[0].kind,'homes');
  assert.equal(site.funds,funds-7);assert.equal(site.materials,materials-4);assert.equal(sim.state.effort,effort-2);
  sim.destroy();
});
