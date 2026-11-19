'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const game=process.env.COMMON_EARTH_GAME_DIR||path.resolve(__dirname,'../common-earth');

function sceneDocument(){
  const doc={hidden:false,addEventListener(type,fn){this[type]=fn;}};
  class Node{
    constructor(tag){Object.assign(this,{tag,ownerDocument:doc,children:[],dataset:{},attributes:{},events:{},textContent:'',hidden:false});}
    get isConnected(){return this===doc.body||Boolean(this.parentElement?.isConnected);}
    append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
    prepend(...nodes){for(const n of nodes){n.parentElement=this;}this.children.unshift(...nodes);}
    remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(n=>n!==this);this.parentElement=null;}}
    scrollIntoView(){}
    replaceChildren(...nodes){this.children.forEach(n=>n.parentElement=null);this.children=[];this.append(...nodes);}
    setAttribute(key,value){this.attributes[key]=String(value);}
    addEventListener(type,fn){this.events[type]=fn;}
    fire(type,event={}){return this.events[type]?.({target:this,...event});}
    focus(){doc.activeElement=this;}
    getBoundingClientRect(){return {top:0,bottom:20};}
    hasAttribute(key){return Object.hasOwn(this.attributes,key);}
    closest(sel){return this.matches(sel)?this:this.parentElement?.closest(sel);}
    matches(sel){
      if(sel==='[hidden]')return this.hidden;
      if(sel.startsWith('#'))return this.id===sel.slice(1);
      if(sel.startsWith('.'))return this.className?.split(' ').includes(sel.slice(1));
      const data=sel.match(/^\[data-([a-z]+)-([a-z]+)(?:="([^"]*)")?\]$/);
      if(data){const value=this.dataset[data[1]+data[2][0].toUpperCase()+data[2].slice(1)];return value!==undefined&&(!data[3]||value===data[3]);}
      return sel===this.tag;
    }
    querySelectorAll(sel){return this.children.flatMap(n=>[...(n.matches(sel)?[n]:[]),...n.querySelectorAll(sel)]);}
    querySelector(sel){return this.querySelectorAll(sel)[0];}
    content(){return [this.textContent,...this.children.map(n=>n.content())].join(' ');}
  }
  doc.body=new Node('body');doc.createElement=tag=>new Node(tag);doc.getElementById=id=>doc.body.querySelector('#'+id);
  const source=fs.readFileSync(path.join(game,'index.html'),'utf8');
  const stage=new Node('div'),canvas=new Node('canvas');canvas.id='street-canvas';doc.body.append(stage);stage.append(canvas);
  const layout=source.slice(source.indexOf('<div id="street-hud"'),source.indexOf('<div id="street-controls"'));
  const parents=[stage];
  for(const match of layout.matchAll(/<(\/?)([a-z]+)([^>]*)>/g)){
    const [,close,tag,attrs]=match;
    if(close){if(parents.length>1)parents.pop();continue;}
    const el=new Node(tag);
    for(const [name,key] of [['id','id'],['class','className'],['data-scene-open','sceneOpen'],['data-scene-pane','scenePane']]){
      const value=attrs.match(new RegExp('(?:^| )'+name+'="([^"]*)"'))?.[1];
      if(value)(name.startsWith('data-')?el.dataset:el)[key]=value;
    }
    el.hidden=/\bhidden\b/.test(attrs);parents.at(-1).append(el);parents.push(el);
  }
  return {doc,stage,host:doc.getElementById('street-hud')};
}
function fixture(options={}){
  const {doc,host,stage}=sceneDocument();
  for(const id of options.omit||[])doc.getElementById(id)?.remove();
  const w=vm.createContext({document:doc,structuredClone,setTimeout(){return 1;},clearTimeout(){},...(options.now?{Date:class extends Date{static now(){return options.now();}}}:{})});w.window=w;
  for(const file of ['shifts','construction','city','personas','careers','fisheries','market','purses','provisions','local-projects','civic-initiatives','autonomy','social-introductions','neighbour-errands','dialogue','agency','simulation','community-effects','street-hud']){
    const filename=path.join(game,file+'.js');if(fs.existsSync(filename))vm.runInContext(fs.readFileSync(filename,'utf8'),w,{filename});
  }
  const disk=new Map(),storage=options.storage||{getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value)};
  const sim=w.CommonEarthSim.create({storage});
  if(!sim.active())assert(sim.found(options.point||{lat:-6.16,lon:39.19,name:'Stone Town',water:false}).ok);
  let near=null,route=null,watch=null,stageEpoch=0,previewReads=0;
  const realForecast=sim.forecastNext;
  const model={...sim,get state(){return sim.state;},forecastNext(){previewReads++;return realForecast();}};
  const getState=()=>({actor:w.EarthAgency.actorId(sim.active()),siteId:sim.active().id,nearby:near?{type:'npc',npcId:near}:null,
    mode:'walk',waterfront:true,travelling:!!route,x:9,y:15,...options.position});
  const street={getState,meeting(ref){const target=ref.residentId||ref.npcId;
    return near===target?{...getState(),target,tx:9,ty:15}:null;},
    activityOf(id){const person=w.EarthPersonas.profile(sim.active(),id);return person?{id,name:person.name,label:'Check today’s supplies',venue:'The market'}:null;},
    observePerson(id){watch=id;return true;},atStop(){return true;}};
  const ui=w.EarthStreetHUD.mount(host,{sim:model,getStreet:()=>street,stageVersion:()=>stageEpoch,meet(ref,label,arrive){
    stageEpoch++;route={target:ref.npcId||ref.residentId,arrive};return true;},venue:(_ref,_name,arrive)=>arrive(),
    after:()=>ui.render(),advance:()=>sim.perform('advance'),followGoal:()=>ui.previewWeek(),personalWork:()=>ui.openTool('work')});
  const id=name=>doc.getElementById(name),cmd=name=>host.querySelector('[data-street-command="'+name+'"]');
  ui.render();
  return {w,sim,ui,stage,doc,id,cmd,street,storage,watch:()=>watch,near(value){near=value;ui.scene(getState());},
    arrive(){const r=route;route=null;near=r.target;r.arrive();},previewReads:()=>previewReads,route:()=>route?.target};
}
test('a passing neighbour cannot replace the chosen interlocutor; a real encounter opens all topics and preserves the reply',async()=>{
  const g=fixture(),{sim,ui,id,cmd}=g;
  const selected='walker-0',other='walker-1';ui.openTalk({type:'npc',npcId:selected});
  assert.equal(id('scene-talk-person').value,selected);assert(cmd('topic-news').disabled);g.near(other);
  assert.equal(id('scene-talk-person').value,selected);assert(cmd('topic-meal').disabled);
  id('scene-approach').fire('click');assert.equal(g.route(),selected);g.arrive();
  assert(!cmd('topic-news').disabled);await cmd('topic-news').fire('click');
  const reply=id('scene-reply').textContent;assert(reply.includes(g.w.EarthAgency.identity(sim.active(),selected).name));
  ui.render(true);g.near(other);assert.equal(id('scene-reply').textContent,reply);assert(cmd('topic-news').disabled);
  assert(id('scene-contact').textContent.includes('earshot'));ui.invalidate();sim.destroy();
});
test('a save-lock delay followed by selecting a different person prevents a stale meal or promise',async()=>{
  const g=fixture(),{w,sim,ui,cmd,id}=g,stock=sim.active().food;
  g.near('walker-0');ui.openTalk({npcId:'walker-0'});let unlock;
  w.navigator={locks:{request:(_key,fn)=>new Promise(resolve=>unlock=()=>resolve(fn()))}};
  const pending=cmd('topic-meal').fire('click');assert(unlock);
  ui.openTalk({npcId:'walker-1'});g.near('walker-1');unlock();await pending;
  assert.equal(sim.active().food,stock);assert.equal(id('scene-talk-person').value,'walker-1');
  assert.equal(id('scene-reply').textContent,'');ui.invalidate();sim.destroy();
});
test('goals open personal observation and a lazy multi-community forecast. Escape restores the opener',()=>{
  const g=fixture(),{ui,sim,cmd,id,stage}=g;ui.setObjective({label:'Preview week',detail:'Keep the pantry stocked.'},{forecast:'A calm week.'});
  ui.openTool('goals',id('scene-open-goals'));assert.match(id('scene-goal-detail').content(),/Keep the pantry stocked/);
  assert.match(id('scene-store-summary').textContent,/food.*materials.*funds/);assert.equal(g.previewReads(),0);
  cmd('next-goal').fire('click');const f=id('scene-week-preview');assert(f.open);f.fire('toggle');assert.equal(g.previewReads(),1);assert.match(f.content(),/Stone Town/);
  ui.selectPurpose('walker-0');assert.match(id('scene-goal-detail').content(),/Check today’s supplies/);cmd('watch').fire('click');
  assert.equal(g.watch(),'walker-0');assert(!id('scene-watching').hidden);assert(id('scene-card').hidden);
  id('scene-stop-watch').fire('click');assert.equal(g.watch(),null);
  ui.openTool('goals');stage.fire('keydown',{key:'Escape',preventDefault(){},stopPropagation(){}});
  assert(id('scene-card').hidden);assert.equal(g.doc.activeElement,id('scene-open-goals'));sim.destroy();
});
test('face-to-face residents can start and end a shared day without leaving the canvas',async()=>{
  const g=fixture(),{sim,ui,cmd,id}=g,p=sim.active().residents[0];
  g.near(p.id);ui.openTalk({residentId:p.id});const start=cmd('startShift-'+p.id);assert(start&&!start.disabled);
  await start.fire('click');assert.equal(sim.active().shift?.residentId,p.id);assert.match(id('scene-shift-actions').content(),/09:00/);
  await cmd('finish-day').fire('click');assert(!sim.active().shift);assert(!id('scene-reply').hidden);ui.invalidate();sim.destroy();
});

test('the Fish button inside the Street scene opens the handline and refreshes stocks after a suspended visit',async()=>{
  const {doc,host}=sceneDocument();doc.body.hasAttribute=name=>Object.hasOwn(doc.body.attributes,name);
  let now=1234,visible=true;const events=new Map();
  const w=vm.createContext({document:doc,structuredClone,Date:class extends Date{static now(){return now;}},setTimeout:()=>1,clearTimeout(){},addEventListener:(id,fn)=>events.set(id,fn)});w.window=w;
  for(const name of ['fisheries','agency','simulation','street-hud','waterfront-ui'])vm.runInContext(fs.readFileSync(path.join(game,name+'.js'),'utf8'),w);
  const sim=w.CommonEarthSim.create({storage:null});assert(sim.found({lat:-24,lon:75,water:true,name:'Ocean Anchorage'}).ok);
  const site=sim.active(),p={siteId:site.id,actor:'steward',mode:'boat',x:14,y:32,waterfront:true};
  const street={getState:()=>p,cancelTravel(){},refreshFishingFloat(){}};
  const getStreet=()=>visible?street:null,ui=w.EarthStreetHUD.mount(host,{sim,getStreet});
  const pane=doc.getElementById('scene-fishing'),opener=doc.getElementById('scene-open-fishing'),initial=site.food;
  const panel=w.EarthWaterfrontUI.mount(pane,{sim,getStreet,refresh:()=>ui.render()});
  ui.registerTool('fishing',{render:panel.render,onScene:panel.render,close:panel.close});
  assert.equal(opener.hidden,false);opener.fire('click');assert.equal(ui.active(),'fishing');assert.equal(pane.hidden,false);
  assert.equal(opener.attributes['aria-expanded'],'true');
  const line=pane.querySelectorAll('button').find(b=>b.dataset.fishing==='line');
  assert.equal(line.textContent,'Cast line · 1 food');await line.fire('click');assert(line.disabled);assert(site.handline);
  opener.fire('click');visible=false;now+=6000;visible=true;events.get('pageshow')({persisted:true});opener.fire('click');
  assert.equal(line.textContent,'Reel in · 1 food');await line.fire('click');assert.equal(site.food,initial+1);
  assert.match(pane.content(),/Landed 1 food/);assert.match(pane.content(),new RegExp('pantry · '+site.food+' food'));
  p.waterfront=false;ui.scene(p);assert.equal(opener.hidden,true);
  sim.destroy();
});
test('the controlled character can practise a personal pastime from their on-scene goals when civic effort is exhausted',async()=>{
  const g=fixture(),{ui,sim,w,cmd}=g,site=sim.active();sim.state.effort=0;const actor=w.EarthAgency.actorId(site);
  ui.selectPurpose(actor);
  const practice=cmd('hobby-hobbyPractice');assert(practice&&!practice.disabled);
  const axis=w.EarthPersonas.profile(site,actor).hobbyAxis,prior=w.EarthCareers.view(sim.state,site,actor).skills[axis];
  await practice.fire('click');assert.equal(sim.state.effort,0);assert(w.EarthCareers.view(sim.state,site,actor).skills[axis]>prior);assert(cmd('hobby-hobbyPractice').disabled);
  ui.invalidate();sim.destroy();
});
test('town needs and the controlled character’s own aim are reachable separately, with named two-way project effects',()=>{
  const g=fixture(),{ui,id,sim,cmd}=g,site=sim.active(),self='steward',neighbor=site.residents[0];
  site.food=0;ui.render();assert.match(id('scene-goal-summary').textContent,/Stock .* food/);assert(id('scene-person-summary').textContent);
  id('scene-open-person').fire('click');assert.equal(id('scene-goal-person').value,self);assert.equal(id('scene-open-person').attributes['aria-expanded'],'true');
  assert.match(id('scene-goal-detail').content(),/Energy \d+ \/ 8/);
  const existing=g.w.EarthAutonomy;g.w.EarthAutonomy={...existing,view(town,world,id){
    const p=existing.view(town,world,id);
    return id===self?{...p,received:{week:world.week,ownerId:neighbor.id,kind:'food'},
      contribution:{week:world.week,ownerId:neighbor.id,activity:'Sorted the harvest'}}:p;
  }};
  ui.render(true);assert.match(id('scene-goal-detail').content(),new RegExp('Received food from '+neighbor.name));
  assert.match(id('scene-goal-detail').content(),new RegExp('Helped '+neighbor.name));cmd('contributed-to').fire('click');assert.equal(id('scene-goal-person').value,neighbor.id);
  id('scene-open-goals').fire('click');assert.equal(id('scene-goal-person').value,'');assert(cmd('supply-town'));
  ui.invalidate();sim.destroy();
});
test('recent effects open only for recorded outcomes, link the people involved, and keep outside observers separate from the worker’s own purse',async()=>{
  const g=fixture(),{ui,sim,street,cmd,id}=g,site=sim.active(),neighbor=site.residents[0];
  let purseVisits=0;
  ui.registerTool('stores',{render(){},openPurse(){purseVisits++;}});
  ui.selectPurpose('steward');
  assert(!id('scene-recent-effects'));assert.match(id('scene-goal-detail').content(),/Personal funds · 0/);
  cmd('own-purse').fire('click');assert.equal(ui.active(),'stores');assert.equal(purseVisits,1);
  const desk=()=>({...street.getState(),target:'market',tx:9.2,ty:15});
  const start=sim.purseView('steward').options.find(o=>o.action==='start');
  assert(start.available,start.reason);
  const accepted=await sim.perform('purseAction',start.request,desk);assert(accepted.ok,accepted.message);
  g.w.navigator={locks:{request:(_key,run)=>run()}};assert.match(sim.liveWeekHold(),/stock check/);
  const app=fs.readFileSync(path.join(game,'app.js'),'utf8'),reviewSource=app.slice(app.indexOf('  function liveReview()'),app.indexOf('  function refreshLiveReview()'));
  const review=vm.runInNewContext(reviewSource+'\nliveReview',{sim,window:g.w,getStreet:()=>street,streetHud:ui,
    localMarket:{openPurse(){purseVisits++;}},clockState:()=>({hold:sim.liveWeekHold()})});
  const held=review();assert.match(held.label,/stock check/);await held.run();assert.equal(purseVisits,2);
  ui.selectPurpose('steward');
  assert(id('scene-goal-detail').content().includes(sim.purseView().entries[0].text));
  ui.selectPurpose(neighbor.id);assert(!cmd('own-purse'));assert(!id('scene-goal-detail').content().includes(accepted.message));
  neighbor.lastMissed={week:sim.state.week,revised:false};
  ui.selectPurpose('');const history=id('scene-recent-effects');assert(history);assert(!history.open);
  assert(!cmd('effect-person-'+neighbor.id));history.open=true;history.fire('toggle');
  assert.match(history.content(),/promised delivery was missed/);cmd('effect-person-'+neighbor.id).fire('click');
  assert.equal(id('scene-goal-person').value,neighbor.id);
  assert(id('scene-recent-effects'));ui.selectPurpose('walker-0');assert(!id('scene-recent-effects'));
  ui.invalidate();sim.destroy();
});
for(const surface of ['goals','talk'])test('a shared-day handoff in '+surface+' quotes the outcome and an abandoned review cannot finish it',async()=>{
  const g=fixture(),{sim,ui,w,doc,street}=g,site=sim.active(),[host,next]=site.residents;
  const node=(tag,cls,label)=>{const x=doc.createElement(tag);x.className=cls;x.textContent=label||'';return x;};
  const button=(label,fn)=>{const x=node('button','',label);x.addEventListener('click',fn);return x;};
  for(const id of ['street-actor','street-actor-role','actor-role-label']){
    const x=doc.createElement('select');x.id=id;x.options=[];doc.body.append(x);
  }
  vm.runInContext(fs.readFileSync(path.join(game,'agency-ui.js'),'utf8'),w);
  street.setSite=()=>{};
  const controls=w.EarthAgencyUI.mount({sim,street:()=>street,version:()=>0,node,button,onResult:r=>r.ok,
    resetEncounter(){},refresh:()=>ui.render()});
  controls.update();
  g.near(host.id);ui.openTalk({residentId:host.id});await g.cmd('startShift-'+host.id).fire('click');assert(site.shift);
  const select=id=>surface==='goals'?ui.selectPurpose(id):ui.openTalk({residentId:id});
  select(next.id);
  const pane=g.id(surface==='goals'?'scene-goal-detail':'scene-talk-handoff'),field=g.id(surface==='goals'?'scene-goal-person':'scene-talk-person');
  const origin=()=>({host:pane,returnFocus:field,current:()=>ui.active()===surface&&field.value===next.id});
  await controls.playAs(next.id,origin());const first=pane.querySelector('.actor-review');assert(first);assert.match(first.content(),/Finish day and switch/);
  const old=first.querySelector('button');select(host.id);await old.fire('click');
  assert.equal(w.EarthAgency.actorId(site),'steward');assert(site.shift);
  select(next.id);await controls.playAs(next.id,origin());await pane.querySelector('.actor-review').querySelector('button').fire('click');
  assert.equal(w.EarthAgency.actorId(sim.active()),next.id);assert(!sim.active().shift);
  sim.destroy();
});
test('Meet while watching restores the character’s point of view and walks to the watched person before speaking',()=>{
  const g=fixture(),{ui,sim,id,cmd}=g;
  ui.selectPurpose('walker-1');cmd('watch').fire('click');assert.equal(g.watch(),'walker-1');
  id('scene-meet-watched').fire('click');assert.equal(g.watch(),null);assert.equal(ui.active(),'talk');
  assert.equal(g.route(),'walker-1');assert(cmd('topic-news').disabled);g.arrive();assert(!cmd('topic-news').disabled);
  assert.equal(id('scene-talk-person').value,'walker-1');ui.invalidate();sim.destroy();
});
test('a citizen’s proposal shows its real beneficiaries and votes, and an endorsement commits only beside its delegate',async()=>{
  const g=fixture(),{sim,ui,cmd,id}=g;
  for(let week=0;week<10&&!sim.civicView().active;week++)assert((await sim.perform('advance')).ok);
  const p=sim.civicView().active;assert(p?.leadId);ui.render();ui.openTool('goals');
  const goals=id('scene-goal-detail');assert(goals.content().includes(p.title));assert(goals.content().includes(p.beneficiaryName));
  const details=goals.querySelectorAll('details').find(x=>x.content().includes('Votes, evidence and costs'));
  assert(details);details.open=true;details.fire('toggle');for(const vote of p.votes)assert(details.content().includes(vote.reason));
  const delegate=g.w.EarthCivicInitiatives.guidance(sim.state,sim.active()).contactId;
  cmd('meet-civic-lead').fire('click');assert.equal(g.route(),delegate);assert(id('scene-civic-dialogue').open);
  assert(cmd('people-endorse').disabled);await cmd('people-endorse').fire('click');assert(!sim.civicView().active.endorsement);
  g.arrive();await cmd('people-endorse').fire('click');assert(sim.civicView().active.endorsement);assert(!id('scene-reply').hidden);
  assert(cmd('people-endorse').disabled);const newest=g.w.CommonEarthSim.readSave(JSON.stringify(sim.state));
  assert(newest.sites[0].civicInitiatives.active.endorsement);ui.invalidate();sim.destroy();
});
test('an introduction guides the player to a named contact and arriving alone never redeems it',async()=>{
  const g=fixture(),{sim,ui,w,cmd,id}=g;const site=sim.active(),actor=w.EarthAgency.actorId(site);
  let referral;
  for(const guide of w.EarthPersonas.list(site).filter(p=>p.id!==actor)){
    g.near(guide.id);ui.openTalk({npcId:guide.id});
    for(const opt of w.EarthAgency.topics(site,sim.state,guide.id).filter(o=>o.id.startsWith('intro:ask:'))){
      await cmd('topic-'+opt.id).fire('click');referral=w.EarthIntroductions.pending(site,sim.state,actor);if(referral)break;
    }
    if(referral)break;
  }
  assert(referral?.contactId);assert(!id('scene-referral').hidden);cmd('meet-referral').fire('click');
  assert.equal(g.route(),referral.contactId);assert(cmd('topic-intro:meet:'+referral.serial).disabled);
  g.arrive();assert.equal(w.EarthIntroductions.pending(site,sim.state,actor).serial,referral.serial);
  await cmd('topic-intro:meet:'+referral.serial).fire('click');assert(!w.EarthIntroductions.pending(site,sim.state,actor));
  assert(cmd('topic-intro:recall:'+referral.serial));ui.invalidate();sim.destroy();
});
test('the roster includes walkers and the driver; their handoff uses the freshly sampled body and civic workforce duties stay resident-only',async()=>{
  const g=fixture(),{w,sim,doc,street,ui}=g,site=sim.active(),messages=[];
  const node=(tag,cls,label)=>{const n=doc.createElement(tag);n.className=cls;n.textContent=label||'';return n;};
  for(const id of ['street-actor','street-actor-role','actor-role-label']){
    const n=node('select');n.id=id;n.options=[];doc.body.append(n);
  }
  vm.runInContext(fs.readFileSync(path.join(game,'agency-ui.js'),'utf8'),w);
  street.setSite=()=>{};street.actorScene=id=>({...street.getState(),targetPose:{id,x:7.25,y:20,mode:id==='driver'?'drive':'walk'}});
  const controls=w.EarthAgencyUI.mount({sim,street:()=>street,version:()=>0,node,button:()=>node('button'),onResult:r=>{messages.push(r.message);return r.ok;},refresh:()=>ui.render(),resetEncounter(){}});
  controls.update();const ids=g.id('street-actor').children.map(n=>n.value);
  assert.equal(ids.length,10);assert(ids.includes('driver'));assert(ids.includes('walker-4'));
  await controls.playAs('driver');assert.equal(w.EarthAgency.actorId(site),'steward');assert.match(messages.at(-1),/driver is aboard/);
  await controls.playAs('walker-4');assert.equal(w.EarthAgency.actorId(site),'walker-4');assert(g.id('actor-role-label').hidden);
  assert.equal(site.agency.actorAt.x,7.25);ui.invalidate();sim.destroy();
});
test('a real reply is physically anchored and the compact conversation shelf leaves both neighbouring characters above it',async()=>{
  const g=fixture(),{ui,id,cmd,sim,street}=g,host=id('street-hud'),bubble=id('scene-speech');
  const style=()=>({setProperty(key,value){this[key]=value;}});
  host.style=style();bubble.style=style();bubble.offsetWidth=128;bubble.offsetHeight=32;
  host.getBoundingClientRect=()=>({left:0,top:0,bottom:320,width:390,height:320});
  street.personAnchor=who=>({x:who==='walker-0'?214:193,y:who==='walker-0'?138:146,visible:true});
  g.near('walker-0');ui.openTalk({npcId:'walker-0'});assert(bubble.hidden);assert.equal(host.dataset.talkDock,'bottom');
  assert(320-parseInt(host.style['--talk-size'])>146+18);
  await cmd('topic-work').fire('click');assert(!bubble.hidden);assert(bubble.style.transform.startsWith('translate('));
  assert(id('scene-speech-words').content().trim().length<=90);assert(id('scene-reply').content().length>=id('scene-speech-words').content().length);
  g.near('walker-1');assert(bubble.hidden);
  ui.openTalk({npcId:'walker-1'});await cmd('topic-news').fire('click');assert(!bubble.hidden);ui.close();assert(bubble.hidden);
  sim.destroy();
});
test('a tablet reader can page through the entire spoken reply on the map, go back and close only the bubble',async()=>{
  const g=fixture(),{ui,id,cmd,sim,street,w}=g,host=id('street-hud');
  host.getBoundingClientRect=()=>({left:0,top:0,bottom:320,width:390,height:320});
  street.personAnchor=()=>({x:198,y:145,visible:true});
  const lines='I counted the empty bowls after the workshop closed. The person collecting flour had set a basket beside the back door. If we leave the lamps burning until the last carrier comes through, the people on that shift can tell us for themselves which portions they can carry.';
  const original=w.EarthDialogue;
  w.EarthDialogue={...original,describe(s,world,p,speaker,topic,m){
    return topic==='news'?{ok:true,message:p.name+' · “'+lines+'”'}:original.describe(s,world,p,speaker,topic,m);
  }};
  try{
    g.near('walker-0');ui.openTalk({npcId:'walker-0'});await cmd('topic-news').fire('click');
    const bubble=id('scene-speech'),back=id('scene-speech-back'),next=id('scene-speech-next'),words=id('scene-speech-words');
    assert(!bubble.hidden&&!id('scene-speech-pages').hidden);assert(back.disabled);
    const read=[words.textContent];
    while(next.textContent==='Next'){next.fire('click');read.push(words.textContent);assert(read.length<10);}
    assert.equal(read.join(' '),lines);assert.equal(id('scene-talk-person').value,'walker-0');
    assert.equal(id('scene-speech-count').textContent,read.length+' / '+read.length);
    back.fire('click');assert.equal(words.textContent,read.at(-2));next.fire('click');next.fire('click');
    assert(bubble.hidden);assert(!id('scene-card').hidden);assert(id('scene-reply').textContent.includes(lines));
    await cmd('topic-meal').fire('click');assert(!id('scene-speech-kind').hidden);
  }finally{ui.close();sim.destroy();}
});
test('the personal goal card states a project aim once while retaining different motives, status, next step and benefit',()=>{
  const g=fixture(),{ui,sim,w,id}=g,old=w.EarthAutonomy,q='Let two households share one collection box';
  w.EarthAutonomy={...old,view(site,world,who){const plan=old.view(site,world,who);if(who!=='walker-0')return plan;
    return {...plan,goal:q,reason:'Separate the soft fruit. '+q+'.',ownProject:null,project:{
      id:'box',kind:'build',title:'Fit a removable divider',goal:q+'.',why:'Lose fewer vegetables. '+q+'.',phase:'In progress',progress:1,total:4,role:'Organiser',
      next:'Cut the fittings.',effect:'The carrier will take two labelled orders.',ownerId:who,ownerName:'Jo'}};}};
  ui.selectPurpose('walker-0');const words=id('scene-goal-detail').content();
  assert.equal(words.split(q).length-1,1);for(const bit of ['Separate the soft fruit','Lose fewer vegetables','In progress','Cut the fittings','two labelled orders'])assert(words.includes(bit));
  ui.invalidate();sim.destroy();
});
test('a new runtime on the same saved town reopens the active ocean cast without replaying it and the catch receipt survives a second reload',async()=>{
  let time=15000;const options={point:{lat:-24,lon:75,name:'Ocean Anchorage',water:true},position:{mode:'boat',x:14,y:32},now:()=>time};
  function waterfront(g){
    vm.runInContext(fs.readFileSync(path.join(game,'waterfront-ui.js'),'utf8'),g.w);
    Object.assign(g.street,{cancelTravel(){},refreshFishingFloat(){}});
    const pane=g.id('scene-fishing'),panel=g.w.EarthWaterfrontUI.mount(pane,{sim:g.sim,getStreet:()=>g.street,refresh:()=>g.ui.render()});
    g.ui.registerTool('fishing',{render:panel.render,onScene:panel.render,close:panel.close});return pane.querySelectorAll('button').find(b=>b.dataset.fishing==='line');
  }
  function markets(g){
    vm.runInContext(fs.readFileSync(path.join(game,'market-panel.js'),'utf8'),g.w);
    const meet=g.street.meeting;
    g.street.meeting=ref=>ref.type==='market'?{...g.street.getState(),x:15,y:24,tx:15,ty:24,target:'market'}:meet(ref);
    const panel=g.w.EarthMarketPanel.mount(g.id('local-market'),{sim:g.sim,street:()=>g.street,version:()=>g.ui.version(),
      onResult(){},after:()=>g.ui.render()});
    g.ui.registerTool('stores',panel);return panel;
  }
  const a=fixture(options),first=waterfront(a),stock=a.sim.active().food;a.ui.openTool('fishing');await first.fire('click');
  const cast=a.sim.active().handline.castAt,memory=JSON.parse(JSON.stringify(a.ui.snapshot()));assert.equal(memory.pane,'fishing');a.sim.destroy();
  time+=7000;const b=fixture({...options,storage:a.storage}),line=waterfront(b);assert(b.ui.restore(memory));assert.equal(b.ui.active(),'fishing');
  assert.equal(b.sim.active().handline.castAt,cast);assert.equal(b.sim.active().food,stock);assert.match(line.textContent,/Reel in/);
  await line.fire('click');assert.equal(b.sim.active().food,stock+1);assert.equal(b.sim.active().provisions.receipt.source,'catch');
  options.position.mode='walk';const market=markets(b);b.ui.openTool('stores');
  const row=b.id('local-market').querySelector('[data-market-action="buy-food"]');assert(row&&!row.disabled);
  row.fire('click');await Promise.resolve();await Promise.resolve();
  b.id('local-market').querySelector('[data-market-action="section-records"]').fire('click');
  assert.equal(market.snapshot().tab,'records');const stores=JSON.parse(JSON.stringify(b.ui.snapshot())),receipt=b.sim.marketView().history[0].text;
  b.sim.destroy();
  const c=fixture({...options,storage:a.storage}),reopened=markets(c);assert(c.ui.restore(stores));assert.equal(c.ui.active(),'stores');
  assert.equal(reopened.snapshot().tab,'records');assert(c.id('local-market').content().includes(receipt));assert.equal(c.sim.marketView().history.filter(r=>r.text===receipt).length,1);
  assert(c.sim.marketView().history.some(r=>/paid .* one fund/i.test(r.text)));
  assert.equal(c.sim.active().provisions.receipt.units,1);assert.equal(c.sim.active().food,stock+2);assert(!c.sim.active().handline);c.sim.destroy();
});
test('a same-town reload resumes an actual observation; a talk reload restores only its listener and rechecks range before any new words',async()=>{
  const a=fixture();a.ui.selectPurpose('walker-1');a.cmd('watch').fire('click');
  const watch=a.ui.snapshot();assert.equal(watch.watch,'walker-1');a.sim.destroy();
  const b=fixture({storage:a.storage});assert(b.ui.restore(watch));assert.equal(b.watch(),'walker-1');assert(!b.id('scene-watching').hidden);
  b.id('scene-meet-watched').fire('click');b.arrive();await b.cmd('topic-news').fire('click');assert(!b.id('scene-reply').hidden);
  const talk=JSON.parse(JSON.stringify(b.ui.snapshot()));assert(!('reply' in talk));b.sim.destroy();
  const c=fixture({storage:a.storage}),before=JSON.stringify(c.sim.state);
  assert(c.ui.restore(talk));assert.equal(c.id('scene-talk-person').value,'walker-1');assert(c.cmd('topic-news').disabled);assert(c.id('scene-reply').hidden);
  assert(!c.route());assert.equal(before,JSON.stringify(c.sim.state));
  for(const field of [{name:'Another town'},{siteId:'another'},{generation:0},{handoff:37},{actor:'walker-2'},{v:1.5}]){
    assert.equal(c.ui.restore({...talk,...field}),false);
  }
  c.ui.invalidate();c.sim.destroy();
});
test('new HUD code on earlier markup retains Fish, Talk, Goals and safe restoration with optional speech and newer controls absent',async()=>{
  const g=fixture({omit:['scene-speech','scene-open-person','scene-referral','scene-civic-dialogue','scene-plans','scene-meet-watched','scene-live','scene-open-live']});
  const {ui,id,cmd,sim}=g;let paints=0;
  ui.registerTool('fishing',{render:()=>paints++});ui.scene(g.street.getState());id('scene-open-fishing').fire('click');
  assert.equal(ui.active(),'fishing');assert.equal(paints,1);ui.close();
  g.near('walker-0');ui.openTalk({npcId:'walker-0'});await cmd('topic-news').fire('click');assert(!id('scene-reply').hidden);
  ui.selectPurpose('walker-0');cmd('watch').fire('click');assert(!id('scene-watching').hidden);
  const saved=ui.snapshot();ui.invalidate();assert(ui.restore(saved));assert.equal(g.watch(),'walker-0');sim.destroy();
});

test('tapping overlapping neighbours gives named choices, then follows the selected body instead of cycling',async()=>{
  const g=fixture(),first='walker-0',second='walker-1';
  g.w.EarthCommunityLife={personLabel:(_site,id,name)=>id===second?name+' · Bellhaven':name};
  assert(g.ui.openTalkChoices([{type:'npc',npcId:first},{type:'npc',npcId:second},{type:'npc',npcId:second}]));
  const picker=g.id('scene-nearby-people');assert(!picker.hidden);assert.equal(picker.querySelectorAll('button').length,2);
  const other=g.cmd('choose-neighbour-'+second);assert.match(other.textContent,/Bellhaven · Carpenter/i);assert.match(g.id('scene-talk-person').content(),/Bellhaven · Carpenter/i);other.fire('click');
  assert(picker.hidden);assert.equal(g.route(),second);assert(g.cmd('topic-news').disabled);
  g.arrive();await g.cmd('topic-news').fire('click');const words=g.id('scene-reply').textContent;
  await g.cmd('topic-work').fire('click');assert(!g.id('scene-transcript').hidden);
  assert(g.id('scene-transcript-lines').content().includes(words));assert(g.id('scene-transcript-lines').content().includes('How are things?'));
  g.ui.openTalk({npcId:first});assert(g.id('scene-transcript').hidden);g.ui.invalidate();g.sim.destroy();
});
test('an on-map agreement carries the player to both named speakers without moving the stock until the return',async()=>{
  const g=fixture(),{sim,ui,cmd,id}=g,site=sim.active(),owner='walker-0',baseline=site.food,gestures=[];
  g.street.showNeighbourHelp=(...pair)=>gestures.push(pair);
  g.near(owner);ui.openTalk({npcId:owner});
  await cmd('topic-errand:ask:supper').fire('click');
  const row=site.agency.arrangements.rows[0];assert(!id('scene-agreement-route').hidden);assert(cmd('meet-agreement'));
  cmd('meet-agreement').fire('click');assert.equal(g.route(),row.contactId);assert(cmd('topic-errand:terms:'+row.id).disabled);
  g.arrive();await cmd('topic-errand:terms:'+row.id).fire('click');assert.match(id('scene-reply').textContent,/household round/);
  await cmd('topic-errand:goods:'+row.id).fire('click');assert.equal(site.food,baseline);assert.equal(row.status,'agreed');
  cmd('meet-agreement').fire('click');assert.equal(g.route(),owner);g.arrive();
  await cmd('topic-errand:finish:'+row.id).fire('click');
  assert.equal(site.food,baseline-2);assert.equal(row.status,'kept');assert.match(id('scene-reply').textContent,/late table/);
  assert(id('scene-agreement-route').hidden);assert.deepEqual(gestures,[['steward',owner,'supper','goods']]);ui.invalidate();sim.destroy();
});
test('selecting an individual in the street directory walks over in one gesture and names their occupation',()=>{
  const g=fixture();g.ui.openTool('talk');
  const chooser=g.id('scene-talk-person'),candidate=chooser.children.find(o=>o.value==='walker-1');
  assert.match(candidate.textContent,/Carpenter/);chooser.value='walker-1';chooser.fire('change');
  assert.equal(g.route(),'walker-1');assert(g.cmd('topic-news').disabled);g.arrive();assert(!g.cmd('topic-news').disabled);
  g.ui.invalidate();g.sim.destroy();
});

test('the original-character strip stays visible after a handoff, with an accessible consequence and the current person’s aim',()=>{
  const g=fixture(),p='walker-0',name=g.w.EarthAgency.identity(g.sim.active(),p).name,original=g.w.EarthAgency.identity(g.sim.active(),'steward').name;
  g.w.EarthInterdependence={anchor:()=>({name:original,status:'Late-table supper due week 3',nearest:{due:3},yours:g.w.EarthAgency.actorId(g.sim.active())==='steward'})};
  assert(g.sim.changeActor(p,()=>({siteId:g.sim.active().id,actor:'steward',mode:'walk',x:7,y:8,targetPose:{id:p,x:9,y:8,mode:'walk'}})).ok);
  g.ui.render();const btn=g.id('scene-original-return');assert(!btn.hidden);assert.match(btn.attributes['aria-label'],/Late-table supper/);
  assert.match(g.id('scene-original-status').textContent,/Due week 3/);assert.equal(g.id('scene-person-label').textContent,name+'’s aim');
  g.ui.invalidate();g.sim.destroy();
});
test('an in-person news reply needs no write lock while offers that change the world still acquire one',async()=>{
  const g=fixture(),who='walker-0',locks=[];
  g.w.navigator={locks:{request:(name,run)=>{locks.push(name);return Promise.resolve(run());}}};
  g.near(who);g.ui.openTalk({npcId:who});await g.cmd('topic-news').fire('click');assert(g.id('scene-reply').textContent.length>20);
  assert.equal(locks.length,0);await g.cmd('topic-listen').fire('click');assert.equal(locks.length,1);
  g.ui.invalidate();g.sim.destroy();
});
test('a named contact with actual terms can initiate a conversation on approach without opening a panel or changing the save',async()=>{
  const g=fixture(),site=g.sim.active(),owner='walker-0';
  g.near(owner);g.ui.openTalk({npcId:owner});await g.cmd('topic-errand:ask:supper').fire('click');
  const row=site.agency.arrangements.rows[0];g.ui.close(false);const before=JSON.stringify(g.sim.state);
  g.near(row.contactId);assert.equal(g.ui.active(),null);assert.equal(JSON.stringify(g.sim.state),before);
  assert(!g.id('scene-notice').hidden);const invitation=g.cmd('hear-neighbour');assert(invitation);invitation.fire('click');
  assert.equal(g.ui.active(),'talk');assert.equal(g.id('scene-talk-person').value,row.contactId);assert.match(g.id('scene-reply').textContent,/household round/);
  assert.equal(JSON.stringify(g.sim.state),before);g.ui.close(false);g.near(null);g.near(row.contactId);
  assert(!g.cmd('hear-neighbour'));g.ui.invalidate();g.sim.destroy();
});

test('a local resident can raise a real food shortage unprompted, and hearing them leaves the choice and resources with the player',async()=>{
  const g=fixture(),site=g.sim.active(),owner='walker-0',week=g.sim.state.week;
  site.food=Math.ceil(site.population/5)-1;const before=JSON.stringify(g.sim.state);
  g.near(owner);assert.match(g.id('scene-notice-text').textContent,/after the last shift/);
  assert.equal(g.ui.active(),null);g.cmd('hear-neighbour').fire('click');
  assert.match(g.id('scene-reply').textContent,/serving bowls/);
  assert.match(g.cmd('topic-errand:ask:supper').textContent,/I’ll ask/);assert.equal(JSON.stringify(g.sim.state),before);
  g.ui.close(false);g.near(null);g.near('walker-2');assert(!g.cmd('hear-neighbour'));
  g.sim.state.week=week+1;g.near(null);g.near('walker-2');assert(g.cmd('hear-neighbour'));
  g.ui.invalidate();g.sim.destroy();
});
test('the original strip opens its own street pane even while playing the founder at home',()=>{
  const g=fixture(),name=g.w.EarthAgency.identity(g.sim.active(),'steward').name;
  g.w.EarthInterdependence={anchor:()=>({name,yours:true,atHome:true,held:[],status:'Pantry round',dutyWeek:4,nearest:{due:6}})};
  let opened=0;g.ui.registerTool('original',{render(){opened++;}});
  g.ui.invalidate();g.ui.render();const opener=g.id('scene-original-return');
  assert(!opener.hidden);assert.match(g.id('scene-original-status').textContent,/Pantry.*4/);
  opener.fire('click');assert.equal(g.ui.active(),'original');assert(!g.id('scene-original').hidden);
  assert.equal(g.id('scene-title').textContent,'Original life');assert.equal(opened,1);
  g.ui.invalidate();g.sim.destroy();
});

test('Calendar lists activities inside the panel and offers fishing only on a playable local waterfront',()=>{
  const {ui,doc,sim,id,w}=fixture();
  const app=fs.readFileSync(path.join(game,'app.js'),'utf8');
  const start=app.indexOf('    function calendarActivities(scene)'),end=app.indexOf("    streetHud.registerTool('live'",start);
  const town={lat:0,lon:18,water:false},world={communityLife:{}};
  let member=true;
  const activities=vm.runInNewContext(app.slice(start,end)+'\ncalendarActivities',{
    sim:{active:()=>town,state:world},window:{CommonEarthSim:w.CommonEarthSim,EarthCommunityLife:{isHome:()=>member}},
    personalWork:{},lifePanel:{},waterfrontUI:{},show:(key,visible)=>{id(key).hidden=!visible;}
  });
  const calendar=id('scene-live'),fishing=id('calendar-fishing');
  assert.ok(calendar.querySelector('[data-scene-open="talk"]'));
  assert.ok(calendar.querySelector('[data-scene-open="person"]'));
  assert.equal(calendar.querySelector('#calendar-fishing'),fishing);
  assert.equal(id('scene-open-live').children.length,0);
  ui.registerTool('live',{render:activities,onScene:activities});
  ui.registerTool('fishing',{render(){}});
  id('scene-open-live').fire('click');
  assert.equal(id('scene-title').textContent,'Calendar');
  assert.ok(fishing.hidden);assert.equal(id('calendar-work').hidden,false);assert.equal(id('calendar-study').hidden,false);
  for(const setting of [{coastal:true},{lakeShore:'Local lake'},{water:true}]){
    Object.assign(town,{coastal:false,lakeShore:'',water:false},setting);ui.scene({waterfront:true});
    assert.equal(fishing.hidden,false);
  }
  fishing.fire('click');assert.equal(ui.active(),'fishing');
  id('scene-open-live').fire('click');ui.scene({waterfront:false});assert.ok(fishing.hidden);
  member=false;ui.scene({waterfront:true});assert.ok(fishing.hidden);
  sim.destroy();
});

test('a face-to-face truck eyewitness can refer the listener to dispatch and the scene files the account at the kerb',async()=>{
  const g=fixture(),{sim,w,ui,cmd,id}=g,site=sim.active();
  vm.runInContext(fs.readFileSync(path.join(game,'fleet.js'),'utf8'),w);
  const witness='walker-2',operator='walker-1',depot=w.EarthFleet.depot;
  const scene=(mode,extra={})=>({siteId:site.id,actor:w.EarthAgency.actorId(site),...depot,truck:depot,stopped:true,mode,...extra});
  const control=actor=>sim.changeActor(actor,()=>scene('walk',{targetPose:{...depot,id:actor,mode:'walk'}}));
  const dispatch=(action,mode,extra)=>{const offer=sim.truckView();return sim.useTruck({actorId:offer.actorId,siteId:site.id,generation:offer.generation,week:offer.week,serial:offer.serial,action},()=>scene(mode,extra));};
  try{
    assert(control(operator).ok);assert(dispatch('take','walk',{witnesses:[witness]}).ok);
    assert(dispatch('return','drive',{vehicle:'truck'}).ok);assert(control('steward').ok);
    const name=w.EarthAgency.identity(site,operator).name;
    assert(!site.fleet.records.some(row=>row.actor===operator||row.text.includes(name)));
    ui.openTalk({npcId:witness});g.near(witness);
    await cmd('topic-truck').fire('click');assert(id('scene-reply').textContent.includes(name));
    const trust=site.trust;
    await cmd('topic-truck-testimony').fire('click');
    assert.match(id('scene-reply').textContent,/give dispatch my name/);assert.equal(site.trust,trust);
    await cmd('meet-other-perspective').fire('click');assert.equal(g.route(),'driver');
    assert(cmd('topic-truck-report').disabled);g.arrive();assert(!cmd('topic-truck-report').disabled);
    await cmd('topic-truck-report').fire('click');
    assert.match(id('scene-reply').textContent,/Dispatch suspended/);assert.equal(site.fleet.incident.report.source,witness);
    assert.equal(site.trust,trust-4);assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  }finally{ui.close();sim.destroy();}
});

test('the signer can arrange a different carrier and tell the recipient using the buttons in the street conversation',async()=>{
  const g=fixture(),{sim,w,ui,cmd,id}=g,site=sim.active(),receiver=site.residents[1],helper='walker-1';
  vm.runInContext(fs.readFileSync(path.join(game,'social-memory.js'),'utf8'),w);
  try{
    ui.openTalk({residentId:receiver.id});g.near(receiver.id);
    await cmd('people-listen:'+receiver.id).fire('click');
    await cmd('people-promise:'+receiver.id).fire('click');
    const p=receiver.promise,ref=receiver.slot+':'+p.start+':'+p.dueWeek;
    ui.openTalk({npcId:helper});g.near(helper);
    await cmd('topic-relay:terms:'+ref).fire('click');assert.match(id('scene-reply').textContent,/booking fee/);
    w.EarthAutonomy.remember(site,sim.state.week,'steward',helper,'kept');
    ui.render(true);
    await cmd('topic-relay:book:'+ref+':0').fire('click');assert.equal(p.handover.worker,helper);
    assert(!p.handover.informed);
    await cmd('meet-other-perspective').fire('click');assert.equal(g.route(),receiver.id);
    const notice='topic-relay:notify:'+ref;
    assert(cmd(notice).disabled);g.arrive();await cmd(notice).fire('click');
    assert(p.handover.informed);
    await cmd('topic-purpose').fire('click');assert(id('scene-reply').textContent.includes(w.EarthAgency.identity(site,helper).name));
    assert.equal(p.by,'steward');assert(w.CommonEarthSim.readSave(JSON.stringify(sim.state)));
  }finally{ui.close();sim.destroy();}
});
