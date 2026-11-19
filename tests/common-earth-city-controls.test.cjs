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

test('the public ledger compares nearby real stalls on demand and leaves guest controls read-only',()=>{
  const document=documentForInspector(),w=vm.createContext({document,structuredClone,Date});w.window=w;
  for(const name of ['resource-economy','fisheries','agency','provisions','market','personas','community-life','city','simulation'])
    vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),w,{filename:name+'.js'});
  vm.runInContext(fs.readFileSync(path.join(game,'district-desk.js'),'utf8'),w);
  const sim=w.CommonEarthSim.create({storage:null});
  assert(sim.found({name:'Stone Town',lat:-6.162,lon:39.191,water:false}).ok);
  const state=sim.state,home=sim.active(),near=w.EarthCommunityLife.neighbours(state,home)[0];
  const peer=state.communityLife.outposts.find(s=>s.id===near.id)||state.sites.find(s=>s.id===near.id);
  // Distinct live tills distinguish a real comparison from a duplicated local quote.
  assert.ok(peer);peer.exchange={...JSON.parse(JSON.stringify(home.exchange||{serial:1,lastWeek:1,shelf:{food:3,materials:3},locked:{funds:0,materials:0},history:[]})),till:0};
  const realMarket=w.EarthMarket;
  const readAt=[],priceReads=[];
  w.EarthMarket={...realMarket,view(world,site){
    readAt.push(site.id);const m=realMarket.view(world,site),local=m.local;
    return {...m,local:new Proxy(local,{get(target,id){if(id==='prices')priceReads.push(site.id);return target[id];}})};
  }};
  const ui=w.EarthDistrictDesk.mount({sim,hud:{registerTool(){}},redraw(){}});
  const body=document.getElementById('district-ledger-body'),ribbon=document.getElementById('ribbon-resources');
  const button=label=>body.querySelectorAll('button').find(b=>b.textContent===label);
  const textOf=n=>[n.textContent||'',...n.children.map(textOf)].join(' ');
  const clickMode=()=>button('Compare market prices').click();
  ribbon.click();assert.ok(button('Visit the exchange'));assert.deepEqual(priceReads,[]);assert.deepEqual(readAt,[home.id]);
  const original=JSON.stringify(state);clickMode();
  assert.deepEqual(priceReads,[home.id]);assert.match(textOf(body),/funds per lot/);assert.match(textOf(body),/Freight/);
  const picker=body.querySelector('select');picker.value=peer.id;picker.events.change();
  assert.deepEqual(priceReads.slice(-2),[home.id,peer.id]);const content=textOf(body);
  assert.ok(content.includes(peer.name));assert.match(content,/0 funds in merchant till/);
  assert.equal(body.querySelectorAll('button').length,2,'only navigation buttons are present on the comparison');
  assert.equal(JSON.stringify(state),original,'reading both registers leaves every account unchanged');
  button('Stock and renewal').click();
  assert.ok(button('Visit the exchange'));const requests=readAt.length;
  picker.events.change();assert.equal(readAt.length,requests,'retired selection cannot refresh another view');
  // Open Public stores while visiting; all stock and both quoted ledgers remain inspectable.
  state.communityLife.homeId=peer.id;state.actionRevision++;ui.render(false);
  assert.equal(button('Visit the exchange'),undefined);assert.equal(body.querySelectorAll('button').length,2);
  clickMode();assert.equal(body.querySelectorAll('button').length,2);sim.destroy();
});
