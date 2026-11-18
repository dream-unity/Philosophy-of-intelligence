/* Common Earth civic simulation. Browser global, no network or timers.
 * create({storage?, key?}) -> state, active(), actions(group), act(id, plot?),
 * found(point, name?), visit(id), advance(), overview(), reset(), subscribe(fn),
 * previewBuild(kind,lot), previewReclaim(lot), reclaim(lot), forecastNext(),
 * beginVoyage(target,style), sail(choiceId).
 * Groups: people, build, research, council, routes, work, all.
 * Commands return {ok,message}. Lots 0–8 form a 3×3 grid in row-major order.
 * An action's "available" and "reason" reflect the current world. Save data
 * contains only serializable facts; rules and dialogue always come from here.
 */
(function (root) {
  'use strict';
  const VERSION = 1;
  const MAX_EFFORT = 4;
  const BUILDINGS = {
    garden: {name:'Community garden', funds:5, materials:3, info:'Grows 3 food each week. Shares tools with an adjoining workshop for 1 extra food.'},
    workshop: {name:'Repair workshop', funds:6, materials:3, info:'Recovers 2 materials each week. Its tools also improve adjacent gardens.'},
    market: {name:'Neighbourhood market', funds:7, materials:3, info:'Earns 3 funds each week. Next to a pier, earns 1 more from visiting traders.'},
    hall: {name:'Assembly hall', funds:5, materials:2, info:'Adds 1 wellbeing each week and makes room for shared apprenticeships.'},
    pier: {name:'Exchange depot', funds:6, materials:3, info:'Moves another 2 units per trade shipment. An adjacent market earns 1 extra fund.'},
    wetland: {name:'Water commons', funds:5, materials:4, info:'Grows 1 food each week. Protects the district during a flood and supports slow repair.'}
  };
  const PROFILES = [
    {role:'Grower', value:'Food security', quotes:['“There is enough ground to grow food. What we lack is a way to share the harvest.”','“People tell you when the shelves are empty. They rarely tell you when they start skipping a meal.”'],
      ask:'restock the shared pantry', support:'Stock the pantry', goods:{food:3}, result:'Three baskets went to households with the smallest reserves.', alternative:'garden'},
    {role:'Repairer', value:'A useful livelihood', quotes:['“A broken tool can cost a person a whole week of work. Give us a bench and we can teach the repairs.”','“When someone learns to fix the pump, the whole district owns a little more of its future.”'],
      ask:'equip a repair bench', support:'Equip the bench', goods:{materials:2}, result:'Neighbours now have tools to borrow and a place to learn repairs.', alternative:'workshop'},
    {role:'Convenor', value:'A voice in decisions', quotes:['“People who work late miss every meeting. Ask who had the chance to disagree before you call it consensus.”','“An invitation means more when someone can afford the journey and the time to come.”'],
      ask:'cover travel to an open meeting', support:'Fund meeting access', goods:{funds:3}, result:'Travel grants brought previously absent residents into the room.', alternative:'hall'}
  ];
  const NAMES = [['Mira','Idris','Sol'],['Eden','Noor','Teo'],['Anika','Ari','Lena'],['Ellis','Remy','Inez'],['Ravi','Mina','Ash'],['Sasha','Jules','Emi']];
  const CHARTERS = {
    care:{name:'A fair table',text:'Keep every settlement supplied with at least 6 food, with 2 promises kept across the network.'},
    voice:{name:'An open council',text:'Hear every founding resident in two settlements and resolve two council decisions.'},
    craft:{name:'Knowledge in common',text:'Complete shared apprenticeships in two settlements and deliver one street errand.'}
  };
  const TECH = [
    {id:'apprenticeship',name:'Shared apprenticeship',era:'Neighbourhood',funds:5,materials:2,info:'Residents share practical skills. Unlocks water commons and adds 1 material each week.'},
    {id:'exchange',name:'Exchange network',era:'Federation',funds:7,materials:3,info:'Coordinate trade consignments one week faster, with a minimum transit of one week.'},
    {id:'stewardship',name:'Stewardship compact',era:'Stewardship',funds:9,materials:3,info:'Ask an independent assembly to judge the network against the charter you chose.'}
  ];
  const QUESTIONS = [
    {title:'A lean harvest',services:'kitchen',prompt:'A poor harvest has raised food prices. Who should carry the cost of this week’s shortage?',choices:[
      {id:'kitchen',name:'Open a public kitchen',terms:'Spend 3 food now. In two weeks, healthier households add 4 wellbeing and the grower gains a bond.',goods:{food:3},after:{wellbeing:4},ally:0,story:'Neighbours who had been skipping meals returned to work and school.'},
      {id:'voucher',name:'Guarantee local orders',terms:'Spend 4 funds now. In two weeks, local suppliers deliver 5 food and the repairer gains a bond.',goods:{funds:4},after:{food:5},ally:1,story:'The guaranteed orders let small suppliers pool the cost of the next delivery.'}]
    },
    {title:'Who owns the square?',services:'commons',prompt:'Traders want more stalls on the square. Residents also need a place where they can stay without buying anything.',choices:[
      {id:'lease',name:'Lease stalls for a season',terms:'Receive 3 funds now. In two weeks receive 2 more, lose 2 wellbeing, and earn the repairer’s support.',now:{funds:3},after:{funds:2,wellbeing:-2},ally:1,story:'Stall fees paid for repairs. Fewer people lingered in the square after work.'},
      {id:'commons',name:'Protect the common square',terms:'Spend 2 funds now. In two weeks gain 3 trust and the convenor gains a bond.',goods:{funds:2},after:{trust:3},ally:2,story:'An evening circle formed where the fee-free square stayed open.'}]
    },
    {title:'Before the high water',services:'homes',prompt:'High water is forecast. Crews can protect the supply store or help residents prepare their homes.',choices:[
      {id:'store',name:'Protect the store',terms:'Spend 1 material now. In two weeks gain 3 food but lose 2 trust. A water commons prevents that trust loss.',goods:{materials:1},after:{food:3,trust:-2},ally:0,story:'The store stayed dry. Families remembered whether they also had protection.'},
      {id:'homes',name:'Reinforce the homes',terms:'Spend 2 materials now. In two weeks gain 4 wellbeing but lose 2 food. A water commons prevents that food loss.',goods:{materials:2},after:{wellbeing:4,food:-2},ally:2,story:'Residents sheltered in their homes while crews checked what remained of the harvest.'}]
    },
    {
      title:'The last lantern procession',stage:1,services:'lanterns',
      prompt:'The lantern makers are retiring. Some families want the craft carried on. Others want younger groups to decide what the night becomes.',
      choices:[
        {id:'lanterns',name:'Pay two apprentices',goods:{funds:3,materials:1},after:{wellbeing:3},ally:1,
          terms:'Spend 3 funds and 1 material. In two weeks gain 3 wellbeing. After that the apprentices earn the district 1 material each week until the next vote on the procession.',
          practice:{materials:1},story:'The last makers passed their moulds to two apprentices. The procession had fewer lanterns, and two more people knew how to make them.'},
        {id:'night',name:'Give the night to a rotating host',goods:{funds:2},after:{trust:2},ally:2,
          terms:'Spend 2 funds. In two weeks gain 2 trust. From then on, rotating hosts add 1 wellbeing each week until the next vote on the procession.',
          practice:{wellbeing:1},story:'The first host kept an hour for the old songs and gave the closing hour to a new group. The lantern makers could choose whether to take part.'}
      ]
    },
    {
      title:'The donor’s conditions',stage:2,services:'subscriptions',
      prompt:'A donor can finance the meeting rooms immediately, in return for reserving their busiest hours. The alternative asks residents to fund a slower reopening.',
      choices:[
        {id:'sponsor',name:'Accept five sponsored evenings',now:{funds:6},after:{materials:2,wellbeing:-2},ally:1,
          terms:'Take 6 funds now. In two weeks receive 2 materials for repairs and lose 2 wellbeing as groups move their evening meetings.',
          story:'The room reopened ahead of schedule. The repaired roof held, and two evening groups had to find another venue.'},
        {id:'subscriptions',name:'Keep the timetable in residents’ hands',goods:{funds:2},after:{funds:4,trust:3},delay:3,ally:2,
          terms:'Spend 2 funds to organise small subscriptions. In three weeks subscriptions bring in 4 funds and add 3 trust. Residents retain the evening timetable.',
          story:'Paint cans arrived a little at a time. On reopening night, groups booked evening hours under the rules they had written.'}
      ]
    },
    {
      title:'Who reads the pantry ledger?',stage:1,services:'consent',
      prompt:'A buying cooperative offers better deliveries if it can study local demand. Household details would reveal who relies on the pantry.',
      choices:[
        {id:'totals',name:'Share totals for the whole district',after:{funds:2,trust:2},ally:2,
          terms:'Share district totals at no financial cost. In two weeks gain 2 funds from collective buying and 2 trust. Individual streets remain indistinguishable in the figures.',
          story:'The cooperative negotiated a bulk price. The published totals protected household identities and concealed the sharp difference between two streets.'},
        {id:'consent',name:'Run a resident-owned opt-in register',goods:{funds:3},after:{food:6,wellbeing:2},delay:3,ally:0,
          terms:'Spend 3 funds on consent and review. In three weeks participating households receive 6 food and the district gains 2 wellbeing. Non-participants keep their details private.',
          story:'Participants corrected the proposed delivery times before sharing the figures. Households that stayed out of the register kept using the ordinary pantry.'}
      ]
    },
    {
      title:'Which pantry gets the reserve?',stage:1,partner:true,services:'send-stores',
      prompt:'A linked settlement has the thinnest food reserve per resident among your partners. Your own families face an uncertain harvest too.',
      choices:[
        {id:'send-stores',name:'Release food to the partner pantry',goods:{food:4},after:{trust:2},transfer:{food:4},ally:2,
          terms:'Commit 4 food now. The partner receives all 4 after transit. Your district gains 2 trust when the delivery arrives.',
          story:'The receiving pantry opened its stockroom for inspection and sent back the tally. The four food came from this district’s reserve.'},
        {id:'home-stores',name:'Build a local buffer first',goods:{funds:3},after:{food:4,wellbeing:2},ally:0,
          terms:'Buy 3 funds’ worth of supplies locally. In two weeks your own pantry gains 4 food and households gain 2 wellbeing. The partner receives no food from this vote.',
          story:'Households close to home had a dependable buffer through the lean week. The linked pantry continued with its existing supplies.'}
      ]
    }
  ];
  const LABELS={funds:'funds',food:'food',materials:'materials',trust:'trust',wellbeing:'wellbeing'};
  const blank = () => ({version:VERSION,week:1,effort:MAX_EFFORT,sites:[],activeId:null,routes:[],journal:[],charter:null,completed:false,voyage:null,lastVoyage:null});
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const signed = v => v >= 0 ? '+'+v : String(v);
  const tidy = (value,max=48) => String(value || '').replace(/[<>&"'\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
  function resources(cost) { return Object.entries(cost || {}).map(([k,v])=> v+' '+LABELS[k]).join(' · '); }
  function summary(delta) { return Object.entries(delta).filter(([,v])=>v!==0).map(([k,v])=>signed(v)+' '+LABELS[k]).join(' · '); }
  function apply(site,delta) {
    const changes={};
    for(const [key,value] of Object.entries(delta || {})){
      const before=site[key];
      site[key]=clamp(before+value,0,key==='trust'||key==='wellbeing'?100:Number.MAX_SAFE_INTEGER);
      changes[key]=site[key]-before;
    }
    return changes;
  }
  function affordable(site,goods) { return Object.entries(goods || {}).every(([key,amount])=>site[key]>=amount); }
  function payment(site,goods) { for(const [key,value] of Object.entries(goods || {})) site[key]-=value; }
  function has(site,kind) { return site.buildings.some(b=>b.kind===kind); }
  function adjacent(a,b) { return Math.abs(Math.floor(a/3)-Math.floor(b/3))+Math.abs(a%3-b%3)===1; }
  function neighbours(site,plot,kind) { return site.buildings.some(b=>b.kind===kind && adjacent(b.plot,plot)); }
  function productiveLinks(site) {
    const links=[];
    for(const b of site.buildings){
      const source=b.kind==='garden'?'workshop':b.kind==='market'?'pier':null;
      if(!source)continue;
      const partners=site.buildings.filter(other=>other.kind===source && adjacent(other.plot,b.plot)).sort((a,b)=>a.plot-b.plot);
      if(partners.length)links.push({from:partners[0].plot,to:b.plot,resource:b.kind==='garden'?'food':'funds'});
    }
    return links;
  }
  function practices(site){
    return Object.entries(site.practices || {}).map(([i,id])=>{
      const q=QUESTIONS[i],c=q?.choices.find(option=>option.id===id && option.practice);
      return c?{name:c.name,agenda:q.title,effect:summary(c.practice)+' per week',rate:{...c.practice}}:null;
    }).filter(Boolean);
  }
  function rates(site) {
    const result={funds:2,food:3-Math.ceil(site.population/5),materials:1,wellbeing:0};
    result[site.specialty]++;
    for(const b of site.buildings) {
      if(b.kind==='garden') result.food+=3;
      if(b.kind==='market') result.funds+=3;
      if(b.kind==='workshop') result.materials+=2;
      if(b.kind==='hall') result.wellbeing++;
      if(b.kind==='wetland') result.food++;
    }
    for(const link of productiveLinks(site))result[link.resource]++;
    if(site.tech.includes('apprenticeship')) result.materials++;
    for(const practice of practices(site))for(const [k,v] of Object.entries(practice.rate))result[k]+=v;
    return result;
  }
  function distance(a,b) {
    const rad=Math.PI/180, u=Math.sin((b.lat-a.lat)*rad/2),v=Math.sin((b.lon-a.lon)*rad/2);
    return 12742*Math.asin(Math.sqrt(clamp(u*u+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*v*v,0,1)));
  }
  function bond(resident,amount){
    const before=resident.bond;
    resident.bond=clamp(before+amount,0,10);
    return resident.bond===before?'bond stayed at '+resident.bond:signed(resident.bond-before)+' bond';
  }
  function outcome(delta,relationship){
    const parts=[summary(delta),relationship].filter(Boolean);
    return parts.length?parts.join(' · ')+'.':'The public measures were already at their limit.';
  }
  // Validate facts the rules depend on. Optional fields added during the first
  // edition get defaults without discarding residents, sites or extension data.
  function readSave(raw){
    if(!raw)return null;
    try {
      const saved=JSON.parse(raw);
      const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
      const unique=values=>new Set(values).size===values.length;
      if(!saved || saved.version!==VERSION || !integer(saved.week,1) || !integer(saved.effort,0,MAX_EFFORT) || !Array.isArray(saved.sites))return null;
      const w={...blank(),...saved};
      if(!Array.isArray(w.routes)||!Array.isArray(w.journal)||!unique(w.sites.map(s=>s.id)))return null;
      for(const s of w.sites){
        if(!s || typeof s.id!=='string' || !s.id || typeof s.name!=='string' || !Number.isFinite(s.lat)||Math.abs(s.lat)>90 || !Number.isFinite(s.lon)||Math.abs(s.lon)>180)return null;
        if(!['food','funds','materials'].includes(s.specialty) || !['funds','food','materials','population'].every(k=>integer(s[k])) || !['trust','wellbeing'].every(k=>integer(s[k],0,100)))return null;
        if(!Array.isArray(s.buildings)||!s.buildings.every(b=>b&&integer(b.plot,0,8)&&Object.hasOwn(BUILDINGS,b.kind))||!unique(s.buildings.map(b=>b.plot)))return null;
        if(!Array.isArray(s.residents)||s.residents.length!==3 || !s.residents.every((p,i)=>p&&p.slot===i&&typeof p.id==='string'&&typeof p.name==='string'&&integer(p.bond,0,10)&&(!p.promise||integer(p.promise.dueWeek,1)))||!unique(s.residents.map(p=>p.id)))return null;
        s.tech=s.tech || [];
        if(!Array.isArray(s.tech)||!s.tech.every((id,i)=>TECH[i]&&TECH[i].id===id))return null;
        s.stats={kept:0,missed:0,resolved:0,deliveries:0,...s.stats};
        if(!Object.values(s.stats).every(n=>integer(n)))return null;
        s.founded=s.founded??1;s.lastDeliveryWeek=s.lastDeliveryWeek??0;s.issueIndex=s.issueIndex??-1;s.pending=s.pending || [];
        if(!integer(s.founded,1,w.week)||!integer(s.lastDeliveryWeek)||!integer(s.issueIndex,-1,QUESTIONS.length-1))return null;
        if(s.issue && (!integer(s.issue.index,0,QUESTIONS.length-1)||!integer(s.issue.deadline,1)))return null;
        if(!Array.isArray(s.pending)||!s.pending.every(p=>p&&integer(p.index,0,QUESTIONS.length-1)&&integer(p.week,1)&&QUESTIONS[p.index].choices.some(c=>c.id===p.choice)))return null;
        if(s.delivery&&!s.residents.some(p=>p.id===s.delivery.residentId))return null;
      }
      const ids=new Set(w.sites.map(s=>s.id));
      if(!w.routes.every(r=>r&&ids.has(r.from)&&ids.has(r.to)&&r.from!==r.to&&Array.isArray(r.shipments)&&r.shipments.every(sh=>sh && (sh.from===r.from&&sh.to===r.to||sh.from===r.to&&sh.to===r.from)&&['food','materials'].includes(sh.good)&&integer(sh.amount,1)&&integer(sh.due,1))))return null;
      if(!w.journal.every(j=>j&&integer(j.week,1)&&typeof j.text==='string'))return null;
      if(w.charter&&!Object.hasOwn(CHARTERS,w.charter))return null;
      if(w.voyage && (!w.voyage.origin || !ids.has(w.voyage.origin.id) || !w.voyage.target || !integer(w.voyage.legs,1)||!integer(w.voyage.leg,0,w.voyage.legs-1)||!Array.isArray(w.voyage.itinerary)))return null;
      if(!ids.has(w.activeId))w.activeId=w.sites.length?w.sites[0].id:null;
      return w;
    }catch(e){return null;}
  }
  function create(options={}) {
    let storage=options.storage;
    if(storage===undefined){ try { storage=root.localStorage; } catch(e){storage=null;} }
    const key=options.key || 'common-earth.world.v1';
    let world=blank(),saveIssue=!storage,saveMessage=!storage?'This browser cannot store the world between visits.':'';
    let lastSeen=null,lastGood=null,futureSave=false;
    const backupKey=key+'.previous',listeners=new Set();
    const current=()=>world.sites.find(s=>s.id===world.activeId)||null;
    const record=(text,site)=>{world.journal.unshift({week:world.week,text,siteId:site ? site.id : null}); world.journal.length=Math.min(world.journal.length,160);};
    const reject=message=>({ok:false,message});
    function notify(external=false){
      for(const fn of listeners)fn(world,{external,message:saveMessage});
    }
    function storageRead(k){
      if(!storage)return null;
      try{return storage.getItem(k);}catch(e){saveIssue=true;saveMessage='Browser storage is unavailable. Progress is in this tab only.';return undefined;}
    }
    function restore(raw,preserveSelection){
      const selected=preserveSelection && world.activeId;
      futureSave=false;
      let restored=readSave(raw),goodText=raw;
      if(!restored && raw){
        try{futureSave=JSON.parse(raw)?.version>VERSION;}catch(e){/* Try the last complete turn. */}
        if(!futureSave){goodText=storageRead(backupKey);restored=readSave(goodText);}
        saveIssue=true;
        saveMessage=futureSave?'A newer edition saved this world. Reload the latest game to continue.':
          restored?'Recovered the previous complete turn.':'The stored world could not be read. A new game is available.';
      }else{saveIssue=!storage;saveMessage=storage?'':'This browser cannot store the world between visits.';}
      world=restored || blank();
      if(selected && world.sites.some(s=>s.id===selected))world.activeId=selected;
      lastSeen=raw;lastGood=restored?goodText:null;
    }
    const initial=storageRead(key);
    if(initial!==undefined)restore(initial,false);
    function sync(){
      if(!storage)return false;
      const raw=storageRead(key);
      if(raw===undefined || raw===lastSeen)return false;
      restore(raw,true);notify(true);return true;
    }
    const conflict='Another tab updated this world. Review the current state and try again.';
    function guarded(operation,allowNewer=false){
      return (...args)=>{
        if(sync())return reject(conflict);
        if(futureSave&&!allowNewer)return reject(saveMessage);
        return operation(...args);
      };
    }
    function onStorage(event){if((event.key===key||event.key===null) && (!event.storageArea || event.storageArea===storage))sync();}
    if(storage && root.addEventListener)root.addEventListener('storage',onStorage);
    function save(){
      if(sync())return reject(conflict);
      if(storage){
        const text=JSON.stringify(world);
        try{
          if(lastGood && lastGood!==text){
            try{storage.setItem(backupKey,lastGood);}catch(e){/* Primary save takes priority when storage is full. */}
          }
          try{storage.setItem(key,text);}
          catch(e){
            if(!storage.removeItem)throw e;
            storage.removeItem(backupKey);storage.setItem(key,text);
          }
          lastSeen=text;lastGood=text;futureSave=false;saveIssue=false;saveMessage='';
        }catch(e){saveIssue=true;saveMessage='This turn is in memory. The browser could not save it for a later visit.';}
      }
      notify();
      return null;
    }
    function fulfilled(site,p,why){
      p.promise=null;p.lastPromise=world.week;site.stats.kept++;
      return p.name+' saw the promise kept. '+why+' '+outcome(apply(site,{trust:3}),bond(p,2));
    }
    function charterMet(){
      if(world.charter==='care') return world.sites.every(s=>s.food>=6) && world.sites.reduce((a,s)=>a+s.stats.kept,0)>=2;
      if(world.charter==='voice')return world.sites.filter(s=>s.residents.every(p=>p.heard)).length>=2 && world.sites.reduce((a,s)=>a+s.stats.resolved,0)>=2;
      if(world.charter==='craft')return world.sites.filter(s=>s.tech.includes('apprenticeship')).length>=2 && world.sites.some(s=>s.stats.deliveries>0);
      return false;
    }
    function checkVictory(){
      if(!world.completed && world.sites.some(s=>s.tech.includes('stewardship')) && charterMet()){
        world.completed=true;
        const msg='Charter fulfilled: '+CHARTERS[world.charter].name+'. The assembly ratified your network’s compact. Your settlements remain open to play.';
        record(msg);return msg;
      }
      return '';
    }
    function complete(message,site,write=true){
      if(write && message)record(message,site);
      const victory=checkVictory();
      const collision=save();
      return collision || {ok:true,message:message+(victory?' '+victory:'')};
    }
    function found(point,customName){
      if(!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat)>90 || Math.abs(point.lon)>180)return reject('Choose a point on Earth first.');
      const old=current();
      const nearby=world.sites.find(s=>distance(s,point)<10);
      if(nearby)return reject('A settlement already serves this area: '+nearby.name+'.');
      if(old && (world.effort<1 || old.funds<6 || old.materials<2))return reject('A new outpost needs 1 effort, 6 funds and 2 materials from '+old.name+'.');
      const index=world.sites.length,water=Boolean(point.water),region=tidy(point.name || point.region) || (water?'Open water':'Earth');
      const names=NAMES[index % NAMES.length], id='site-'+(index+1);
      let name=tidy(customName) || (region==='Earth'?'Earth':region)+(water?' Anchorage':' Commons');
      if(world.sites.some(s=>s.name===name))name+=' '+(index+1);
      if(old){payment(old,{funds:6,materials:2});world.effort--;}
      const specialty=water?'food':['food','materials','funds'][Math.abs(Math.round(point.lat*2+point.lon))%3];
      const site={id,name,region,lat:point.lat,lon:point.lon,water,specialty,era:'Settlement',founded:world.week,
        population:12,funds:old?9:16,food:old?9:12,materials:old?5:8,trust:50,wellbeing:54,tech:[],buildings:[],delivery:null,
        residents:PROFILES.map((p,slot)=>({id:id+'-p'+slot,slot,name:names[slot],role:p.role,value:p.value,bond:0,heard:false,promise:null,lastTalk:0,lastPromise:-10})),
        issue:null,pending:[],stats:{kept:0,missed:0,resolved:0,deliveries:0},issueIndex:-1,lastDeliveryWeek:0};
      world.sites.push(site);world.activeId=id;
      return complete(name+' founded. '+(old?old.name+' contributed 6 funds and 2 materials. ':'')+'Local strength: '+LABELS[specialty]+'.',site);
    }
    function visit(id){
      const next=world.sites.find(s=>s.id===id);
      if(!next)return reject('That settlement could not be found.');
      world.activeId=id;return complete('Now in '+next.name+'.',next,false);
    }
    function tradeRoute(a,b){
      return world.routes.find(r=>(r.from===a.id && r.to===b.id)||(r.from===b.id && r.to===a.id));
    }
    function travelTime(a,b){
      const weeks=distance(a,b)<1800?1:distance(a,b)<7500?2:3;
      return Math.max(1,weeks-Number(a.tech.includes('exchange')||b.tech.includes('exchange')));
    }
    function actionsAndRules(group='all'){
      const site=current(),actions=[];
      if(!site)return actions;
      function add(category,id,label,description,options,run){
        if(group!=='all' && group!==category)return;
        const {effort=1,goods={},gate='',...meta}=options || {};
        const reason=gate || (world.effort<effort?'Requires '+effort+' effort. Advance the week to refresh.':'') ||
          (!affordable(site,goods)?'Requires '+resources(goods)+'.':'');
        actions.push({id,group:category,label,description,cost:effort,goods,available:!reason,reason,...meta,run});
      }
      for(const p of site.residents){
        const profile=PROFILES[p.slot],who={residentId:p.id};
        const when=p.promise?p.promise.dueWeek:0;
        add('people','listen:'+p.id,p.heard?'Check in with '+p.name:'Listen to '+p.name,p.role+' · '+p.value+'. '+(p.heard?'Hear how the work is going.':'Hear the experience behind this resident’s priorities.'),{...who,gate:p.lastTalk===world.week?'You already spoke this week.':''},()=>{
          const quote=profile.quotes[p.heard?1:0];p.heard=true;p.lastTalk=world.week;
          return p.name+': '+quote+' '+bond(p,1)+'.';
        });
        if(p.heard && !p.promise){
          add('people','promise:'+p.id,'Make a promise to '+p.name,'Commit to '+profile.ask+' by the end of week '+(world.week+2)+'. Keeping it costs '+resources(profile.goods)+' or a new '+BUILDINGS[profile.alternative].name.toLowerCase()+'.',
            {...who,effort:0,gate:world.week-p.lastPromise<3?'Give this resident time to see the result.':''},()=>{
              p.promise={dueWeek:world.week+2};return 'You promised '+p.name+' to '+profile.ask+' by the end of week '+p.promise.dueWeek+'.';
            });
        }
        if(p.promise)add('people','fulfil:'+p.id,profile.support,'Keep your promise to '+p.name+' by the end of week '+when+'. '+profile.result,{...who,goods:profile.goods},()=>fulfilled(site,p,profile.result));
      }
      for(const [kind,b] of Object.entries(BUILDINGS)){
        const gate=site.buildings.length===9?'All nine district lots are occupied.':kind==='wetland' && !site.tech.includes('apprenticeship')?'First research shared apprenticeship.':'';
        add('build','build:'+kind,b.name,b.info,{kind,goods:{funds:b.funds,materials:b.materials},gate},(plot)=>{
          const partners=site.residents.filter(p=>p.promise && PROFILES[p.slot].alternative===kind);
          site.buildings.push({id:site.id+'-b'+plot,kind,plot,name:b.name,partners:partners.map(p=>p.id)});
          let msg=b.name+' opened on lot '+(plot+1)+'.';
          for(const p of partners)msg+=' '+fulfilled(site,p,'The project met the need they raised.');
          return msg;
        });
      }
      if(site.buildings.length===9)for(const b of site.buildings){
        const plan=previewReclaim(b.plot);
        add('build','reclaim:'+b.plot,'Dismantle lot '+(b.plot+1),plan.text,{plot:b.plot},()=>takeDown(site,b.plot));
      }
      const nextTech=TECH[site.tech.length];
      if(nextTech){
        let gate='';
        if(nextTech.id==='apprenticeship'){
          if(!site.residents.some(p=>p.heard))gate='Listen to a resident first.';
          else if(!has(site,'hall')&&!has(site,'workshop'))gate='Build an assembly hall or a repair workshop.';
        }else if(nextTech.id==='exchange'){
          if(!world.routes.some(r=>r.from===site.id||r.to===site.id))gate='Open an exchange route from this settlement.';
          else if(site.stats.kept<1)gate='Keep one promise in this settlement.';
        }else{
          if(!world.charter)gate='Choose a network charter in Council.';
          else if(site.stats.resolved<1)gate='See one local council decision through to its outcome.';
          else if(!site.residents.every(p=>p.heard))gate='Listen to all three local residents.';
        }
        add('research','research:'+nextTech.id,nextTech.name,nextTech.info,{effort:2,goods:{funds:nextTech.funds,materials:nextTech.materials},gate},()=>{
          site.tech.push(nextTech.id);site.era=nextTech.era;return site.name+' entered the '+nextTech.era+' era. '+nextTech.info;
        });
      }
      if(!world.charter)for(const [id,c] of Object.entries(CHARTERS)){
        add('council','charter:'+id,c.name,'Choose a lasting measure of success. '+c.text,{effort:0},()=>{world.charter=id;return 'Your founding charter is “'+c.name+'”. '+c.text;});
      }
      if(site.issue){
        const q=QUESTIONS[site.issue.index];
        for(const c of q.choices)add('council','vote:'+c.id,c.name,q.title+' · '+q.prompt+' '+c.terms,{goods:c.goods || {},issueTitle:q.title},()=>{
          apply(site,c.now);site.pending.push({index:site.issue.index,choice:c.id,week:world.week+2});site.issue=null;
          return site.name+' voted: '+c.name+'. '+c.terms;
        });
      }
      for(const other of world.sites.filter(s=>s.id!==site.id)){
        const route=tradeRoute(site,other),weeks=travelTime(site,other);
        const mode=site.water||other.water?'Sea passage':site.region===other.region?'Supply road':'Trade passage';
        if(!route)add('routes','route:'+other.id,'Link '+other.name,mode+' · '+Math.round(distance(site,other)).toLocaleString('en')+' km · '+weeks+' week'+(weeks===1?'':'s')+' each way. Partners lend food or materials to the neighbour with less, keeping reserves of 5.',{targetId:other.id,goods:{funds:3,materials:1}},()=>{
          world.routes.push({id:site.id+'~'+other.id,from:site.id,to:other.id,name:mode,opened:world.week,shipments:[],deliveries:0,lastDispatch:0,lastStatus:'Partners are comparing reserves.'});
          return mode+' opened between '+site.name+' and '+other.name+'. Consignments move when one partner has at least three more units.';
        });
      }
      add('work','work:forage','Tend the food beds','Spend a shift harvesting food for the district. +3 food.',{},()=>{apply(site,{food:3});return 'The food beds yielded 3 food.';});
      add('work','work:salvage','Recover materials','Salvage and sort reusable timber and fittings. +3 materials.',{},()=>{apply(site,{materials:3});return 'The salvage crew recovered 3 materials.';});
      add('work','work:contract','Take a paid shift','Work a shift for the trading cooperative. +4 funds.',{},()=>{apply(site,{funds:4});return 'The cooperative paid 4 funds for the shift.';});
      if(!site.delivery){
        const p=site.residents[site.stats.deliveries%site.residents.length];
        add('work','courier:pick','Collect the market parcel','Carry the parcel to '+p.name+', the '+p.role.toLowerCase()+'. Delivery earns 3 funds and 1 bond.',{residentId:p.id,venue:'market',gate:site.lastDeliveryWeek===world.week?'The next parcel arrives next week.':''},()=>{
          site.delivery={residentId:p.id,week:world.week};return 'Parcel collected. Find '+p.name+' at the '+p.role.toLowerCase()+'’s door.';
        });
      }else{
        const p=site.residents.find(r=>r.id===site.delivery.residentId);
        if(p)add('work','courier:deliver:'+p.id,'Deliver the parcel to '+p.name,'Hand over the market parcel at '+p.name+'’s door. +3 funds · +1 bond.',{effort:0,residentId:p.id,venue:'resident'},()=>{
          site.delivery=null;site.lastDeliveryWeek=world.week;site.stats.deliveries++;return p.name+' received the parcel. '+outcome(apply(site,{funds:3}),bond(p,1));
        });
      }
      if(root.EarthNeighbours)root.EarthNeighbours.actions(world,site,add);
      return actions;
    }
    function actions(group='all'){return actionsAndRules(group).map(({run,...view})=>view);}
    function act(id,plot){
      const site=current();
      if(!site)return reject('Found your first settlement on the globe.');
      const a=actionsAndRules().find(item=>item.id===id);
      if(!a)return reject('This action is no longer available here.');
      if(!a.available)return reject(a.reason);
      if(a.id.startsWith('build:')){
        if(plot===undefined || plot===null){
          plot=Array.from({length:9},(_,n)=>n).find(n=>!site.buildings.some(b=>b.plot===n));
        }
        if(!Number.isInteger(plot)||plot<0||plot>8 || site.buildings.some(b=>b.plot===plot))return reject('Choose an empty district lot.');
      }
      world.effort-=a.cost;payment(site,a.goods);return complete(a.run(plot),site);
    }
    function previewBuild(kind,plot) {
      const site=current(),b=BUILDINGS[kind];
      const invalid=reason=>({ok:false,available:false,reason,label:b?b.name:'District lot',text:reason,forecast:'',delta:{},fulfilled:[],neighbours:[]});
      if(!site)return invalid('Found your first settlement.');
      if(!b)return invalid('Choose a project.');
      if(!Number.isInteger(plot) || plot<0 || plot>8)return invalid('Choose a district lot.');
      if(site.buildings.some(item=>item.plot===plot))return invalid('This lot is already in use.');
      const action=actionsAndRules('build').find(item=>item.kind===kind);
      const around=site.buildings.filter(item=>adjacent(item.plot,plot)).map(({kind,plot,name})=>({kind,plot,name}));
      const oldRate=rates(site);
      const newRate=rates({...site,buildings:[...site.buildings,{kind,plot,name:b.name}]});
      const delta={};
      for(const k of Object.keys(newRate))if(newRate[k]!==oldRate[k])delta[k]=newRate[k]-oldRate[k];
      const promises=site.residents.filter(p=>p.promise && PROFILES[p.slot].alternative===kind).map(p=>p.name);
      let pairing='';
      if(kind==='garden' && around.some(n=>n.kind==='workshop'))pairing=' A neighbouring workshop adds 1 food.';
      if(kind==='market' && around.some(n=>n.kind==='pier'))pairing=' A neighbouring depot adds 1 fund.';
      if(kind==='workshop' || kind==='pier'){
        const partner=kind==='workshop'?'garden':'market',unit=kind==='workshop'?'food':'fund';
        const improved=around.filter(n=>n.kind===partner && !neighbours(site,n.plot,kind)).length;
        if(improved)pairing=' Neighbouring '+(kind==='workshop'?'gardens':'markets')+' gain '+improved+' '+unit+(unit==='fund'&&improved>1?'s':'')+' in total.';
      }
      const forecast=summary(delta) || 'No direct change in weekly yield';
      const effects=promises.length?' Keeps the promise to '+promises.join(' and ')+'.':'';
      let service='';
      if(kind==='pier')service=' Increases route cargo capacity to 4 units.';
      if(kind==='wetland')service=' Protects local homes and food during high water.';
      return {ok:true,available:action.available,reason:action.reason,label:b.name,text:'Lot '+(plot+1)+' · '+forecast+'.'+pairing+service+effects,forecast,delta,fulfilled:promises,neighbours:around};
    }
    function previewReclaim(plot){
      const site=current(),b=site && site.buildings.find(p=>p.plot===plot);
      if(!b)return {ok:false,available:false,reason:'Choose an occupied district lot.',text:'Choose an occupied district lot.'};
      const previous=rates(site),next=rates({...site,buildings:site.buildings.filter(p=>p.plot!==plot)});
      const delta={};
      for(const k of Object.keys(next))if(next[k]!==previous[k])delta[k]=next[k]-previous[k];
      const recovered=Math.max(1,Math.floor(BUILDINGS[b.kind].materials/2));
      const partners=site.residents.filter(p=>(b.partners || []).includes(p.id));
      const forecast=summary(delta)||'No direct change in weekly yield';
      let text='Dismantle '+b.name.toLowerCase()+' on lot '+(plot+1)+'. Recover '+recovered+' material'+(recovered===1?'':'s')+'. '+forecast+'.';
      if(partners.length)text+=' '+partners.map(p=>p.name).join(' and ')+' helped secure this project. Trust −2 · bond −1.';
      return {ok:true,available:world.effort>=1,reason:world.effort>=1?'':'Requires 1 effort. Advance the week to refresh.',label:b.name,text,forecast,delta,recovered,partners:partners.map(p=>p.id)};
    }
    function takeDown(site,plot){
      const plan=previewReclaim(plot);
      site.buildings=site.buildings.filter(b=>b.plot!==plot);
      apply(site,{materials:plan.recovered});
      if(plan.partners.length){
        apply(site,{trust:-2});
        for(const p of site.residents)if(plan.partners.includes(p.id))bond(p,-1);
      }
      return 'Lot '+(plot+1)+' reopened. '+plan.text;
    }
    function reclaim(plot){
      const plan=previewReclaim(plot);
      if(!plan.ok || !plan.available)return reject(plan.reason);
      world.effort--;return complete(takeDown(current(),plot),current());
    }
    function beginVoyage(target,style='exchange'){
      const site=current(),nav=root.EarthVoyages;
      if(!site)return reject('Found a home settlement first.');
      if(!nav)return reject('Voyage navigation is unavailable.');
      if(world.voyage)return reject('Finish the current voyage before launching another.');
      if(world.effort<1)return reject('Commissioning a voyage takes 1 effort. Advance the week to refresh.');
      const launch=nav.start(site,target,style);
      if(!launch.ok)return reject(launch.message);
      if(!affordable(site,launch.cost))return reject('The expedition needs '+resources(launch.cost)+'.');
      payment(site,launch.cost);world.effort--;world.voyage=launch.voyage;
      return complete(launch.message,site);
    }
    function sail(choiceId){
      const nav=root.EarthVoyages,v=world.voyage;
      if(!nav || !v)return reject('Choose a destination and launch an expedition first.');
      const site=world.sites.find(s=>s.id===v.origin.id);
      if(!site)return reject('This expedition has no home port.');
      const step=nav.step(v,choiceId);
      if(!step.ok)return reject(step.message);
      let message=step.message;
      if(step.complete){
        apply(site,step.reward);
        const dest=world.sites.find(s=>s.id!==site.id && s.id===v.target.id);
        if(dest && step.report.targetReward && Object.keys(step.report.targetReward).length){
          apply(dest,step.report.targetReward);message+=' '+dest.name+' received '+summary(step.report.targetReward)+'.';
        }
        world.lastVoyage=step.report;world.voyage=null;
      }else world.voyage=step.voyage;
      return complete(message,site,step.complete);
    }
    function moveCargo(turn,arrive,depart){
      const arrivals=[],byId=new Map(turn.sites.map(s=>[s.id,s]));
      const inbound=new Map(turn.sites.map(s=>[s.id,{food:0,materials:0}]));
      // Deliver every due shipment before computing new departures. Incoming
      // cargo is included in the demand calculation to avoid repeat shipments.
      for(const r of turn.routes) {
        r.shipments=r.shipments.filter(sh=>{
          if(sh.due>turn.week){inbound.get(sh.to)[sh.good]+=sh.amount;return true;}
          const dest=byId.get(sh.to);
          if(dest){apply(dest,{[sh.good]:sh.amount});r.deliveries++;
            const text=sh.amount+' '+LABELS[sh.good]+' arrived in '+dest.name+'.';arrive(text,dest);arrivals.push(text);r.lastStatus=text;}
          return false;
        });
      }
      function projected(site,good){
        return site[good]+inbound.get(site.id)[good];
      }
      for(const r of turn.routes){
        const a=byId.get(r.from),b=byId.get(r.to);
        const options=[];
        for(const [from,to] of [[a,b],[b,a]])for(const good of ['food','materials']){
          const difference=projected(from,good)-projected(to,good);
          const capacity=2+(has(from,'pier')||has(to,'pier')?2:0);
          const amount=Math.min(capacity,from[good]-5,Math.floor(difference/2));
          if(difference>=3 && amount>=1)options.push({from,to,good,amount,difference});
        }
        options.sort((l,h)=>h.difference-l.difference);
        const choice=options[0];
        if(!choice){if(!r.shipments.length)r.lastStatus='Reserves are balanced. No cargo is due.';continue;}
        const {from,to,good,amount}=choice,due=turn.week+travelTime(from,to);
        payment(from,{[good]:amount});inbound.get(to.id)[good]+=amount;r.shipments.push({from:from.id,to:to.id,good,amount,due});r.lastDispatch=turn.week;
        r.lastStatus=amount+' '+LABELS[good]+' travelling to '+to.name+' · due week '+due+'.';depart(r.lastStatus,from);
      }
      return arrivals;
    }
    // Mutate exactly the supplied snapshot. Both the actual transition and
    // the week-ahead forecast run these rules, including in-transit cargo.
    function rollWeek(turn) {
      const events=[];
      const reports=new Map(turn.sites.map(s=>[s.id,{id:s.id,name:s.name,production:{},forecast:'',promises:[],council:[],arrivals:[],departures:[],highlights:[],closing:{},delta:{}}]));
      const keys=['funds','food','materials','trust','wellbeing','population'];
      const opening=new Map(turn.sites.map(s=>[s.id,Object.fromEntries(keys.map(k=>[k,s[k]]))]));
      function event(text,site,type){
        const item=reports.get(site.id);item.highlights.push(text);
        if(type)item[type].push(text);
        events.push({site,text});
      }
      turn.week++;turn.effort=MAX_EFFORT;
      for(const s of turn.sites){
        const delta=rates(s),shortage=s.food+delta.food<0;
        const report=reports.get(s.id);
        report.production={...delta};report.forecast=summary(delta)+' per week';
        apply(s,delta);
        if(shortage){apply(s,{wellbeing:-3,trust:-1});event(s.name+' ran short of food. Wellbeing −3 · trust −1.',s);}
        if((turn.week-s.founded)%3===0 && s.food>=9 && s.trust>=50 && s.buildings.length){
          s.population+=2;event('Two residents settled in '+s.name+'. Its weekly food need is now '+Math.ceil(s.population/5)+'.',s);
        }
        for(const p of s.residents)if(p.promise && turn.week>p.promise.dueWeek){
          p.promise=null;p.lastPromise=turn.week;s.stats.missed++;bond(p,-1);apply(s,{trust:-3});
          event('The promise to '+p.name+' lapsed. Trust −3 · bond −1. Check in to rebuild the relationship.',s,'promises');
        }
        s.pending=s.pending.filter(item=>{
          if(item.week>turn.week)return true;
          const q=QUESTIONS[item.index],c=q.choices.find(choice=>choice.id===item.choice);
          const after={...c.after};
          if(item.index===2 && has(s,'wetland'))for(const k of Object.keys(after))if(after[k]<0)after[k]=0;
          apply(s,after);bond(s.residents[c.ally],1);s.stats.resolved++;
          event(c.name+' in '+s.name+': '+c.story+' '+summary(after)+' · '+s.residents[c.ally].name+' bond +1.',s,'council');return false;
        });
        if(s.issue && turn.week>s.issue.deadline){
          const q=QUESTIONS[s.issue.index];s.issue=null;apply(s,{trust:-2});
          event('The decision on “'+q.title+'” lapsed without a vote. Trust −2.',s,'council');
        }
        if(!s.issue && (turn.week-s.founded-1)%4===0 && turn.week>s.founded){
          s.issueIndex=(s.issueIndex+1)%QUESTIONS.length;s.issue={index:s.issueIndex,title:QUESTIONS[s.issueIndex].title,prompt:QUESTIONS[s.issueIndex].prompt,deadline:turn.week+2};
          event('Council opened “'+s.issue.title+'”. Vote by the end of week '+s.issue.deadline+'.',s,'council');
        }
        for(const p of s.residents)if(p.promise && p.promise.dueWeek===turn.week)report.promises.push(p.name+'’s promise is due by the end of week '+turn.week+'.');
        if(s.issue && s.issue.deadline===turn.week)report.council.push('Final week to vote on “'+s.issue.title+'”.');
        if(root.EarthNeighbours)for(const text of (root.EarthNeighbours.tick(turn,s) || []))event(text,s);
      }
      moveCargo(turn,(text,site)=>event(text,site,'arrivals'),(text,site)=>reports.get(site.id).departures.push(text));
      for(const site of turn.sites){
        const report=reports.get(site.id),before=opening.get(site.id);
        for(const k of keys){report.closing[k]=site[k];report.delta[k]=site[k]-before[k];}
      }
      const sites=Array.from(reports.values());
      return {week:turn.week,sites,highlights:events.map(e=>e.text),events};
    }
    function forecastNext(){
      const copy=JSON.parse(JSON.stringify(world));
      const {events,...forecast}=rollWeek(copy);
      return forecast;
    }
    function advance(){
      if(!current())return reject('Found your first settlement on the globe.');
      const report=rollWeek(world);
      for(const e of report.events)record(e.text,e.site);
      const local=report.sites.find(s=>s.id===world.activeId);
      const text='Week '+world.week+' began. '+(local.highlights[0] || report.highlights[0] || 'Local production and household needs have been settled.');
      return complete(text,current(),false);
    }
    function overview(){
      const s=current();
      if(!s)return {objective:'Select a place on Earth and found your first community.',era:'Earth',chapter:'First landing',forecast:'',charter:null};
      const tech=TECH[s.tech.length],charter=CHARTERS[world.charter];
      let objective;
      if(world.completed)objective='Your charter has been ratified. Continue shaping the world.';
      else if(!s.residents.some(p=>p.heard))objective='Meet a resident and listen to what they need.';
      else if(!s.stats.kept) objective='Make a promise to a resident, then deliver it before its deadline.';
      else if(!world.charter)objective='Choose in Council how this network will measure a life well lived.';
      else if(tech){
        const a=actionsAndRules('research')[0];
        objective=tech.name+': '+(a.available?'ready to research.':a.reason);
      }else objective=charter.text;
      return {objective,era:s.era,chapter:world.completed?'Charter ratified':charter?charter.name:'Founding years',forecast:summary(rates(s))+' per week',charter:charter?{...charter,met:charterMet()}:null};
    }
    const commands={
      found:guarded(found),visit:guarded(visit),act:guarded(act),advance:guarded(advance),
      beginVoyage:guarded(beginVoyage),sail:guarded(sail),reclaim:guarded(reclaim),
      reset:guarded(()=>{world=blank();return save() || {ok:true,message:'A new world is ready.'};},true)
    };
    // The async entry point also serializes commits between browser tabs with
    // the Web Locks API. The direct commands retain synchronous compatibility.
    async function perform(command,...args){
      if(!Object.hasOwn(commands,command))return reject('Unknown game action.');
      const expected=lastSeen;
      function run(){return expected!==lastSeen?reject(conflict):commands[command](...args);}
      if(!storage||!root.navigator?.locks?.request)return run();
      return root.navigator.locks.request('civic-world:'+key,run);
    }
    return {
      ...commands,get state(){return world;},get saveIssue(){return saveIssue;},get saveMessage(){return saveMessage;},
      active:current,actions,overview,previewBuild,previewReclaim,forecastNext,perform,sync,
      subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
      destroy(){listeners.clear();if(root.removeEventListener)root.removeEventListener('storage',onStorage);}
    };
  }
  root.CommonEarthSim={create,productiveLinks,practices,buildings:BUILDINGS,charters:CHARTERS,maxEffort:MAX_EFFORT};
})(typeof window==='undefined'?globalThis:window);
