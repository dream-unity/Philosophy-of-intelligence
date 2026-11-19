'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');

// Only layout, focus and native select interaction are left to the browser playtest.
function documentFixture(){
  const ids=new Map(),doc={hidden:false,activeElement:null,getElementById:id=>ids.get(id),
    addEventListener(name,fn){this[name]=fn;}};
  class Element{
    constructor(tag){this.tag=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.events={};this.attributes={};this.textContent='';}
    get isConnected(){return this===doc.body||Boolean(this.parent?.isConnected);}
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    replaceChildren(...children){for(const child of this.children)child.parent=null;this.children=[];this.append(...children);}
    setAttribute(k,v){this.attributes[k]=String(v);}
    removeAttribute(k){delete this.attributes[k];}
    addEventListener(name,fn){this.events[name]=fn;}
    fire(name,target=this){return this.events[name]?.({target,currentTarget:this});}
    matches(selector){
      const match=selector.match(/^\[data-life-(control|page)(?:="([^"]+)")?\]$/);
      if(!match)return this.tag===selector;
      const value=this.dataset[match[1]==='control'?'lifeControl':'lifePage'];
      return Boolean(value)&&(!match[2]||value===match[2]);
    }
    closest(sel){return this.matches(sel)?this:this.parent?.closest(sel);}
    querySelectorAll(sel){return this.children.flatMap(child=>[...(child.matches(sel)?[child]:[]),...child.querySelectorAll(sel)]);}
    querySelector(sel){return this.querySelectorAll(sel)[0];}
    focus(){doc.activeElement=this;}
    scrollIntoView(){}
    text(){return [this.textContent,...this.children.map(c=>c.text())].filter(Boolean).join(' ');}
  }
  doc.createElement=tag=>new Element(tag);
  doc.body=doc.createElement('body');
  function add(id,tag,parent){const el=doc.createElement(tag);ids.set(id,el);parent.append(el);return el;}
  const panel=add('character-lives','details',doc.body);
  add('life-person','select',panel);add('life-profile','div',panel);
  const tabs=add('life-pages','nav',panel);
  for(const page of ['career','abilities','weeks']){const b=doc.createElement('button');b.dataset.lifePage=page;tabs.append(b);}
  add('life-content','div',panel);add('life-feedback','p',panel);
  return {doc,panel,tabs};
}
function fixture(){
  const {doc,panel,tabs}=documentFixture(),w=vm.createContext({document:doc,structuredClone});w.window=w;
  for(const file of ['shifts','construction','city','personas','careers','autonomy','agency','simulation','life-panel']){
    vm.runInContext(fs.readFileSync(path.join(game,file+'.js'),'utf8'),w,{filename:file+'.js'});
  }
  const disk=new Map(),storage={getItem:id=>disk.get(id)??null,setItem:(id,data)=>disk.set(id,data)};
  const sim=w.CommonEarthSim.create({storage});
  assert(sim.found({lat:-6.16,lon:39.19,name:'Stone Town',water:false}).ok);
  const site=sim.active(),scene=()=>({actor:w.EarthAgency.actorId(sim.active()),siteId:sim.state.activeId,mode:'walk',x:11,y:12});
  let nearby=null,travel=null,camera=0,listCalls=0;
  const personas=w.EarthPersonas;w.EarthPersonas={...personas,list(s){listCalls++;return personas.list(s);}};
  const street={getState:scene,meeting(ref){const id=ref.residentId||ref.npcId;return id===nearby?{...scene(),target:id,tx:11.6,ty:12.1}:null;}};
  const results=[],ui=w.EarthLifePanel.mount(panel,{sim,street:()=>street,version:()=>camera,reviewWeek:()=>{},after:()=>ui.render(),
    onResult:r=>results.push(r),meet(ref,_name,callback){travel={ref,callback};return true;}});
  const content=doc.getElementById('life-content'),get=key=>content.querySelector('[data-life-control="'+key+'"]');
  function page(key){tabs.fire('click',tabs.querySelector('[data-life-page="'+key+'"]'));}
  function job(id){const box=get('career-target');box.value=id;box.fire('change');}
  return {w,doc,sim,site,panel,ui,get,page,job,results,content,scene,get listCalls(){return listCalls;},
    get travel(){return travel;},near(id){nearby=id;},move(){camera++;},review(){return doc.getElementById('life-feedback').text();}};
}
test('closed profiles do no character-directory work and open into the selected individual’s actual strengths, limits and employers',()=>{
  const g=fixture(),{sim,site,w,ui,doc}=g;
  for(let i=0;i<4;i++)ui.render();assert.equal(g.listCalls,0);
  const p=site.residents[1],profile=w.EarthPersonas.profile(site,p.id);ui.open(p.id);
  assert.equal(doc.getElementById('life-person').children.length,10);
  assert.match(doc.getElementById('life-profile').text(),new RegExp(p.name));
  g.job('musician');const model=w.EarthCareers.view(sim.state,site,p.id,'musician');
  assert(g.content.text().includes('Town ensemble'));
  assert(g.content.text().includes('Limit '+profile.bounds.music.max));
  if(!model.fits)assert(g.content.text().includes('personal interest'));
  g.page('abilities');assert(g.content.text().includes('range '+profile.bounds.music.min+'–'+profile.bounds.music.max));
  assert(g.content.text().includes('Curiosity'));
  g.page('career');
  const search=g.content.querySelector('input');search.value='garbage collector';search.fire('input');
  g.get('search-refuse').fire('click');assert.equal(g.get('career-target').value,'refuse');assert(g.content.text().includes('Sanitation crew'));
  sim.destroy();
});
test('an NPC career proposal walks to the selected neighbour and rechecks the meeting after the save lock opens',async()=>{
  const g=fixture(),{sim,w,site,ui}=g,id='walker-0';ui.open(id);g.job('refuse');
  const practice=g.get('career-practice');assert(!practice.disabled);
  practice.fire('click');assert.equal(g.travel.ref.npcId,id);assert.equal(site.careers?.[id],undefined);
  let grant;w.navigator={locks:{request:(_key,fn)=>new Promise(resolve=>{grant=()=>resolve(fn());})}};
  g.near(id);const pending=g.travel.callback();g.near(null);grant();await pending;
  assert.equal(g.results.at(-1).ok,false);assert.equal(site.careers?.[id],undefined);
  delete w.navigator;g.near(id);await g.get('career-practice').fire('click');
  assert.equal(g.results.at(-1).ok,true);assert(site.careers[id].revision>0);assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  sim.destroy();
});
test('changing profiles cancels a queued suggestion, and a detached offer cannot apply to anyone else',async()=>{
  const g=fixture(),{sim,w,site,ui}=g,id='driver';ui.open(id);g.page('weeks');
  const old=g.get('autonomy-rest');old.fire('click');const travel=g.travel;
  ui.open('walker-1');g.near(id);await travel.callback();await old.fire('click');
  assert.equal(site.autonomy?.people?.[id],undefined);
  ui.open(id);g.page('weeks');const ask=g.get('autonomy-rest');
  let grant;w.navigator={locks:{request:(_key,fn)=>new Promise(resolve=>{grant=()=>resolve(fn());})}};
  const pending=ask.fire('click');g.move();grant();await pending;
  assert.equal(site.autonomy?.people?.[id],undefined);
  delete w.navigator;await g.get('autonomy-rest').fire('click');
  assert.equal(site.autonomy.people[id].advice.week,sim.state.week);
  assert(g.get('autonomy-rest').disabled);sim.destroy();
});
test('the controlled character can practise without arranging a meeting and see the result in their career history',async()=>{
  const g=fixture(),{sim,site,ui}=g;ui.open('steward');g.job('musician');
  await g.get('career-practice').fire('click');assert(g.results.at(-1).ok);
  assert.equal(g.travel,null);
  g.page('weeks');assert(g.content.text().includes(site.careers.steward.history[0].text));
  sim.destroy();
});
test('a learner can advance the quoted shared study calendar and read the resulting checkpoint',async()=>{
  const g=fixture(),{sim,site,ui}=g;
  ui.open('steward');g.job('refuse');const enrol=g.get('career-enroll');assert(!enrol.disabled);
  await enrol.fire('click');assert(g.results.at(-1).ok,g.results.at(-1).message);
  const before=sim.state.week,quote=sim.courseCalendar('steward'),term=g.get('study-term');
  assert(quote.available,quote.reason);assert.equal(term.textContent,'Advance '+quote.weeks+' '+(quote.weeks===1?'week':'weeks')+' of study');
  assert(g.content.text().includes('Every community advances together'));
  await term.fire('click');assert(g.results.at(-1).ok,g.results.at(-1).message);
  assert.equal(sim.state.week,before+quote.weeks);assert(g.review().includes('week '+sim.state.week));
  assert(site.careers.steward.training?.credits>0||site.careers.steward.qualifications.refuse);
  ui.open('walker-0');assert.equal(g.get('study-term'),undefined);
  sim.destroy();
});
test('specialist hiring shows the actual reserved offer, qualified waiting list, review and temporary service for the chosen employer',async()=>{
  const g=fixture(),{w,site,sim,ui,content}=g,ids=[site.residents[0].id,'walker-0'],job=w.EarthCareers.catalog.find(j=>j.id==='nurse');
  for(const id of ids){
    const p=w.EarthPersonas.profile(site,id),skills={};
    for(const axis of [job.skill,job.secondary])skills[axis]=p.bounds[axis].max;
    (site.careers||={})[id]={revision:1,qualifications:{nurse:1},portfolios:{nurse:3},skills,references:{},history:[]};
  }
  assert(w.EarthCareers.valid(site,sim.state.week));
  for(const id of ids){
    const who={...g.scene(),targetPose:{id,x:11.5,y:12,mode:'walk'}};
    const changed=sim.changeActor(id,who);assert(changed.ok,changed.message);ui.open(id);g.job('nurse');
    assert(content.text().includes('1 of 1 specialist post open'));
    const application=g.get('career-apply');assert(!application.disabled);await application.fire('click');assert(g.results.at(-1).ok,g.results.at(-1).message);
  }
  assert((await sim.perform('advance')).ok);assert((await sim.perform('advance')).ok);
  const waiting=ids.find(id=>w.EarthCareers.view(sim.state,site,id,'nurse').stage==='waiting');assert(waiting);
  ui.open(waiting);g.job('nurse');
  const opening=w.EarthCareers.view(sim.state,site,waiting,'nurse').opening,team=opening.team[0],waiter=opening.waiters[0];
  for(const text of ['0 of 1 specialist post open',team.name+' · offer reserved',waiter.name+' (since week '+waiter.since+')',
    'Next hiring review · Week '+opening.nextReview,opening.reason,opening.service])assert(content.text().includes(text),text);
  assert(g.get('career-specialistRelief'));g.job('cook');assert(!content.text().includes('Temporary relief duty'));
  sim.destroy();
});
