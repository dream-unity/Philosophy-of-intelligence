/* Optional neighbourhood commissions. Real place names locate fictional cases.
 * The existing city simulation owns the clock, resources, bonds and save file.
 * Reading a brief or viewing progress never changes the settlement. */
(function (root) {
  'use strict';
  const label='Fictional local commission';
  const has=(s,kind)=>s.buildings.some(b=>b.kind===kind);
  const linked=(w,s)=>w.routes.some(r=>r.from===s.id || r.to===s.id);
  const completedVoyage=(w,s)=>(s.stats.voyages||0)>0 || w.lastVoyage?.origin?.id===s.id;
  const project=s=>(s.neighbourWork?.completed || 0)>0;
  const stocked=s=>s.food>=8;
  const tools=s=>s.materials>=6;
  const keptPromise=s=>s.stats.kept>0;
  const caretaker=s=>s.funds>=7;
  const heardAll=s=>s.residents.every(p=>p.heard);
  const heard=(s,slots)=>slots.every(i=>s.residents[i].heard);
  const baseProof={
    parcel:{label:'Complete a street delivery',test:(w,s)=>s.stats.deliveries>0},
    promise:{label:'Keep a promise to a resident',test:(w,s)=>s.stats.kept>0},
    project:{label:'Finish a shared project between neighbours',test:(w,s)=>project(s)},
    route:{label:'Open an exchange route from this community',test:linked},
    voyage:{label:'Complete an expedition launched from this community',test:completedVoyage},
    hall:{label:'Open an assembly hall',test:(w,s)=>has(s,'hall')},
    garden:{label:'Open a community garden',test:(w,s)=>has(s,'garden')},
    workshop:{label:'Open a repair workshop',test:(w,s)=>has(s,'workshop')},
    pier:{label:'Open an exchange depot',test:(w,s)=>has(s,'pier')},
    grid:{label:'Build a garden beside a workshop or a market beside a depot',test:(w,s)=>Boolean(root.CommonEarthSim.productiveLinks(s).length)},
    apprenticeship:{label:'Research shared apprenticeship',test:(w,s)=>s.tech.includes('apprenticeship')}
  };
  function trial(id,name,terms,cost,resource,amount,ally,normal,supported){
    return {id,name,terms,cost,resource,amount,ally,normal,supported};
  }
  const briefs={
    stone:{
      title:'An address everyone can use',
      seats:[1,2],voices:['how a tool can travel between several small jobs','who can get into a storeroom when its owner is away'],proof:['parcel','workshop','project'],
      test:keptPromise,support:'Keep a local promise by review so a second keyholder can rely on the handover.',backing:'A trusted second keyholder',
      trials:[
        trial('stock','Rent the stock shelves to traders','The co-op earns a reliable fee. A second keyholder could run the tool shelf after the traders leave.',{},'funds',4,1,'Traders stocked the room before dawn. A neighbour needing a borrowed tool found nobody with a key.','Traders stocked the room before dawn. A trusted second keyholder opened the tool shelf when a neighbour came after closing.'),
        trial('keys','Let borrowers manage the tool shelf','Spend 2 funds on keys and a ledger. Neighbours can borrow without waiting for a trader.',{funds:2},'trust',4,2,'Two neighbours borrowed a spanner. The early trader had to track down the key before unloading.','Two neighbours borrowed a spanner. A trusted handover left the key and ledger ready for the early trader.')
      ]},
    melbourne:{
      title:'Who gets the last delivery?',seats:[0,1],voices:['who relies on the evening meal','what happens to a trader when a delivery misses the market'],proof:['parcel','promise','grid'],
      test:stocked,support:'Keep 8 food in reserve by the review so the delayed kitchen run still has a meal to collect.',backing:'The delayed kitchen run',
      trials:[
        trial('stock','Book the van for market stock','The morning market covers its transport bill. Food held in reserve can cover the kitchen’s later collection.',{},'funds',4,1,'The traders unloaded before opening. The cook had to turn away the final table.','Stock arrived before opening. Food held in reserve gave the cook enough for the final table.'),
        trial('supper','Give the cook the first run','Spend 2 funds to rebook the trader. The van collects supper first and leaves a named slot for the delayed stock.',{funds:2},'wellbeing',4,0,'The first tables ate on time. A trader could plan around the later slot, though the final meal was small.','The cook served both sittings. Traders used the written second slot to let their customers know when stock would arrive.')
      ]},
    mombasa:{
      title:'A timetable the harbour can trust',seats:[0,1],voices:['how long a harvest can wait in the queue','why a late spare part can tie up the repair crew'],proof:['pier','project','parcel'],
      test:tools,support:'Hold 6 materials at review as a spare kit for whichever crew yields its turn.',backing:'A spare kit for the displaced crew',
      trials:[
        trial('fixed','Give repairs a fixed unloading slot','A reliable workshop hour brings reusable parts home. A spare kit gives the growers some flexibility.',{},'materials',3,1,'The repairs crew got its parts. Growers lost a loading turn when a trolley failed.','The repairs crew got its parts. The spare kit kept the growers’ trolley running until their slot.'),
        trial('swap','Let both crews swap the slot','Spend 2 funds on a shared booking steward. Growers can call a change, and repairers receive the same notice.',{funds:2},'trust',4,0,'A shared booking board gave both crews a voice. A missed part still held one repair over.','A grower moved the unloading slot in time. The repairers used the spare kit and posted when the slot was free again.')
      ]},
    valparaiso:{
      title:'The cost of the hill',seats:[0,2],voices:['how much food one collection can carry','whose time the walk to a collection point consumes'],proof:['parcel','garden','hall'],
      test:keptPromise,support:'Keep at least one local promise by the review to give vulnerable neighbours a dependable handover.',backing:'A trusted handover',
      trials:[
        trial('depot','Pool collections at one depot','One bulk trip yields extra food. A dependable local contact can pass baskets on to uphill households.',{},'food',4,0,'The depot filled the shelves. One household still needed a second trip up the hill.','The depot filled the shelves. A trusted contact passed baskets to neighbours who could not make the return walk.'),
        trial('uphill','Pay for small uphill collections','Spend 2 funds to bring the collection point closer to residents. Smaller loads leave fewer spare baskets.',{funds:2},'wellbeing',4,2,'Shorter walks brought a carer to the kitchen, though the handovers still ran late.','A carer reached the nearby collection in time. A familiar contact took the last basket to a household further up.')
      ]},
    rotterdam:{
      title:'A quiet berth',seats:[1,2],voices:['which repairs depend on night deliveries','how the loading noise affects people who never use the berth'],proof:['workshop','route','project'],
      test:tools,support:'Keep 6 materials by review for quiet handling or spare parts during a longer wait.',backing:'Quiet handling and spare stock',
      trials:[
        trial('night','Keep one night delivery','The workshop gains supplies. Spare materials can cushion the loading trolley before the late shift.',{},'materials',3,1,'The workshop had parts by morning. A neighbour heard every trolley on the loading boards.','The workshop had parts by morning. Spare material cushioned the trolley wheels past sleeping homes.'),
        trial('day','Move the delivery into daylight','Spend 2 funds to change the carrier’s slot. Nearby residents regain the night. Spare stock can cover an early repair.',{funds:2},'wellbeing',4,2,'The street slept. A cyclist came back that afternoon after the repairer ran out of parts.','The street slept. The repairer used a spare part to get a cyclist to work before the daytime load came in.')
      ]},
    suva:{
      title:'Room for the return trip',seats:[1,2],voices:['what the outbound booking pays for','who gets a say in the ship’s return cargo'],proof:['route','voyage','pier'],
      test:heardAll,support:'Hear all three founding residents by review so food, repairs and access have a voice in the manifest.',backing:'A second voice on the manifest',
      trials:[
        trial('book','Sell the outbound booking','The paying load adds funds. Hearing all three local voices helps the visitors find a return contact.',{},'funds',4,1,'The owner collected the fee. The visiting crew left with an empty return list.','The owner collected the fee. The grower put the visitors in touch with a return supplier before they left.'),
        trial('reserve','Reserve return space for the visitors','Spend 2 funds to hold a space open. The visiting crew chooses the return consignment.',{funds:2},'trust',4,2,'The visiting crew chose its consignment. Home partners learned about it at loading time.','The visiting crew chose its load. Home partners had heard the full plan and came to help receive it.')
      ]},
    reykjavik:{
      title:'A light left on',seats:[1,2],voices:['how much paid repair time the room can support','who can afford a warm place to meet after closing'],proof:['workshop','hall','project'],
      test:caretaker,support:'Keep 7 funds by review to cover a caretaker and keep the room open during handovers.',backing:'A paid caretaker',
      trials:[
        trial('repairs','Guarantee the repair hours','A regular bench booking earns income. A caretaker could pass the key to neighbours after the last job.',{},'funds',4,1,'The repairer finished a full shift. With no one paid to close up later, the key went home.','The repairer finished a full shift. A paid caretaker handed the room to an evening reading group.'),
        trial('open','Guarantee an open evening','Spend 2 funds on an evening booking. Neighbours can stay without buying anything.',{funds:2},'wellbeing',4,2,'Neighbours met in the warm room. The last volunteer stayed late to put every tool back.','Neighbours met in the warm room. A paid caretaker set the benches out for the first repair shift.')
      ]},
    inland:{
      title:'The key to the common room',
      brief:'Imagine two residents sharing one room. A repairer wants to keep the bench ready for paid jobs. A convenor wants a room that neighbours can enter without paying.',
      question:'Whose time makes a room truly public?',
      seats:[1,2],voices:['who depends on a dependable workbench','who misses meetings when nobody can stay to close up'],proof:['workshop','hall','project'],
      test:keptPromise,support:'Keep a local promise by review so someone trusts the proposed handover.',backing:'A trusted keyholder',
      trials:[
        trial('bench','Book the bench for paid repairs','A regular shift earns funds. A trusted keyholder can let a group use the room afterwards.',{},'funds',4,1,'The repairer kept the bench open. The evening group found the room locked.','The repairer kept the bench open. A trusted keyholder stayed back so a group could meet afterwards.'),
        trial('room','Give the evening group a key','Spend 2 funds on room access. The evening group can meet on its own terms.',{funds:2},'trust',4,2,'The group met. Someone had to find the repairer the next morning to sort out the tools.','The group met. A trusted handover left the complete tool set on the bench for morning repairs.')
      ]},
    water:{
      title:'The last space aboard',
      brief:'Imagine a floating community with one dry locker left. A grower needs space for food. A repairer needs a spare pump ready to lend to a visiting vessel.',
      question:'Who should carry a reserve when the next person who needs it has no vote here?',
      seats:[0,1],voices:['which food will spoil on the open deck','what a visiting crew must do if its pump fails'],proof:['pier','voyage','promise'],
      test:tools,support:'Keep 6 materials by review to fit a second dry box for the supplies left out.',backing:'A second dry box',
      trials:[
        trial('pump','Give the spare pump the locker','The visiting crew leaves usable fittings. A second dry box could protect the food on deck.',{},'materials',3,1,'A visiting crew borrowed the pump. The grower had to use the exposed food first.','A visiting crew borrowed the pump. A second box kept the evening food dry.'),
        trial('pantry','Give food the dry locker','Spend 2 funds on a handover. The next shared meal is protected. Spare materials can shelter the visitor’s pump.',{funds:2},'food',4,0,'Families collected food in good condition. The visiting crew waited while the repairer dried its pump.','Families collected dry food. A second box kept the spare pump ready for the next crew.')
      ]}
  };
  const keysByPlace={'Melbourne':'melbourne','Mombasa':'mombasa','Valparaíso':'valparaiso','Rotterdam':'rotterdam','Suva':'suva','Reykjavík':'reykjavik','Stone Town':'stone'};
  const titleToKey=new Map(Object.entries(briefs).map(([key,b])=>[b.title,key]));
  function describe(point) {
    const opening=root.EarthNavigation?.scenario(point);
    const local=keysByPlace[opening?.place] || titleToKey.get(opening?.title);
    const key=local || (point?.water?'water':'inland');
    return {key,definition:briefs[key],opening};
  }
  function preview(point) {
    const {key,definition:b,opening}=describe(point);
    const roles=['grower','repairer','convenor'];
    const firstStep='Hear the '+b.seats.map(i=>roles[i]).join(' and the ')+', then try one practical step, such as “'+baseProof[b.proof[0]].label+'”.';
    return {key,title:b.title,brief:b.brief||opening?.brief||'',question:b.question||opening?.question||'',firstStep,label};
  }
  const PHASES=new Set(['offered','active','declined','trial','complete']);
  function record(site) {
    const state=site.commission;
    return state && Object.hasOwn(briefs,state.key) && PHASES.has(state.phase)?state:null;
  }
  function progress(world,site,b) {
    const requesters=b.seats.map(slot=>site.residents[slot]);
    const channels=b.proof.map(key=>baseProof[key]);
    return {requesters,milestones:[
      {label:'Hear both sides',detail:requesters.map((p,i)=>p.name+' on '+b.voices[i]).join(' · ')+'. Open People and choose Meet beside each name to find them.',met:heard(site,b.seats)},
      {label:'Try one practical approach',detail:channels.map(x=>x.label).join(' OR ')+'. Completed work counts.',met:channels.some(x=>x.test(world,site))}
    ]};
  }
  function summary(world,site) {
    if(!site)return null;
    const saved=record(site),opening=preview(site),key=saved?.key||opening.key,b=briefs[key];
    const {requesters,milestones}=progress(world,site,b);
    const status=saved?.phase||'offered',phase=status==='active'&&milestones.every(m=>m.met)?'ready':status;
    const pilot=b.trials.find(t=>t.id===saved?.choice);
    return {key,title:b.title,brief:opening.brief,question:opening.question,label,phase,
      requesters:requesters.map(p=>p.name+' · '+p.role).join(' and '),milestones,
      testimony:requesters.flatMap((p,index)=>p.heard?[{name:p.name,text:witnesses[key][index]}]:[]),reviewWeek:saved?.due||null,
      support:b.support,conditionMet:b.test(site),choice:pilot?.name||'',outcome:saved?.outcome||''};
  }
  const witnesses={
    stone:['If nobody knows who has the spanner, I lose a morning asking around.','I can hold a second key. I need a handover I can count on.'],
    melbourne:['A van can arrive too late for supper even if every basket is still fresh.','If you move our booking, tell the stallholders before they set up empty tables.'],
    mombasa:['The grower who gives up today’s slot needs to know when the next one really is.','A spare part sitting on a boat leaves a whole bench idle. Give us a way to call ahead.'],
    valparaiso:['One full load is cheaper to collect. That only works if the food makes it beyond the depot.','Our ledger counts crates. Where does it count the return walk for someone carrying a child?'],
    rotterdam:['One stock box overnight would get my first customer moving before the daytime delivery.','The people who hear the loading trolley every night never signed the freight agreement.'],
    suva:['Selling the outbound booking pays for the crossing. I can show you the sums.','Can the visitors choose a return load of their own, or only accept what we want to send?'],
    reykjavik:['If the tools stay laid out, I can finish a paid repair before the first bus.','We can meet after the tools go away. Who gets paid for putting them back?'],
    inland:['I can share this bench if I can find every tool before my first job.','A room is free on paper. Somebody still gives up their evening to shut the door.'],
    water:['Food in this locker stays dry long enough for the next shared meal.','A visiting crew cannot lend us its voice today. It could still need our pump tomorrow.']
  };
  const reviewedTrials=new WeakMap();
  function projectedSupport(sim,site){
    const world=sim.state,actions=world.actionRevision||0,work=world.workRevision||0;
    let cache=reviewedTrials.get(world);
    if(!cache || cache.actions!==actions || cache.work!==work || cache.week!==world.week){
      const support=new Map();
      for(const report of sim.forecastNext().sites){
        if(typeof report.commissionSupported==='boolean')support.set(report.id,report.commissionSupported);
      }
      cache={week:world.week,actions,work,support};
      reviewedTrials.set(world,cache);
    }
    return cache.support.get(site.id);
  }
  function guidance(sim,site) {
    const saved=record(site);
    if(!saved || !['active','trial'].includes(saved.phase))return null;
    const state=summary(sim.state,site),brief=briefs[state.key],siteId=site.id;
    const group=(name,id,label,detail)=>({kind:'group',group:name,siteId,actionId:id,label,detail});
    const meet=(person,action='listen')=>({kind:'resident',siteId,group:'people',residentId:person.id,actionId:action+':'+person.id,
      label:'Visit '+person.name,detail:state.title+'. '+(saved.phase==='trial'?state.support:state.milestones[0].detail)});
    function prepareBacking(){
      const detail=state.support+(state.phase==='ready'?' Both proposals are ready for review in Council. Check the costs before choosing.':'');
      if(brief.test===heardAll)return {...meet(site.residents.find(p=>!p.heard&&p.id!==site.agency?.actor)||site.residents.find(p=>!p.heard)),detail};
      if(brief.test===keptPromise){
        const step=root.EarthLegacy.promiseStep(sim.state,site);
        return {...step,detail:[detail,step.detail].filter(Boolean).join(' ')};
      }
      const task=brief.test===tools?'salvage':brief.test===caretaker?'contract':'forage';
      const work=sim.actions('work',siteId).find(a=>a.id==='work:'+task);
      return group('work',work.id,work.label,detail);
    }
    if(state.phase==='trial'){
      // Meals, deliveries and production land before the trial is judged.
      // A pantry that looks full in Street view can still miss its review.
      const numeric=[tools,caretaker,stocked].includes(brief.test);
      const projected=numeric?projectedSupport(sim,site):undefined;
      if(!(projected??state.conditionMet))return prepareBacking();
      return {kind:'week',siteId,label:'Review the next week',detail:state.title+' is due for review in week '+saved.due+'. '+state.support};
    }
    if(state.phase==='ready' && !state.conditionMet)return prepareBacking();
    if(state.phase==='ready')return {...group('council',null,'Choose a local trial',state.title+'. Both sides have been heard and the practical step is complete. Choose how to run the trial.'),
      page:'commission',inspectPilot:true};
    const waiting=brief.seats.map(i=>site.residents[i]).filter(p=>!p.heard);
    const unheard=waiting.find(p=>p.id!==site.agency?.actor)||waiting[0];
    if(unheard)return meet(unheard);
    // Every invitation offers several ways to contribute. Point to an actual local
    // job; the invitation still lists every other way to meet its requirement.
    const sites=(site.construction || []).filter(job=>job.scope==='street');
    const links=sites.length && brief.proof.includes('grid')
      ? root.CommonEarthSim.productiveLinks({...site,buildings:[...site.buildings,...sites]}) : [];
    const underway=root.EarthLegacy?.constructionStep(sim.state,site,job=>job.scope==='street' &&
      (brief.proof.includes(job.kind) || links.some(link=>link.from===job.plot || link.to===job.plot)));
    if(underway)return {...underway,detail:state.title+'. '+underway.detail+' This practical step counts once the building opens.'};
    const practical=sim.actions('build',siteId).filter(a=>a.kind && brief.proof.includes(a.kind));
    if(practical.length && sites.some(j=>j.kind==='dismantle')){
      const room=root.EarthLegacy.makeRoomStep(sim.state,site,'a practical project for this commission');
      if(room)return room;
    }
    const project=practical.find(a=>a.available);
    if(project)return group('build',project.id,'Plan a '+project.label.toLowerCase(),state.title+'. '+state.milestones[1].detail);
    if(brief.proof.includes('parcel')){
      const action=sim.actions('work',siteId).find(a=>a.id.startsWith('courier:'));
      if(action)return group('work',action.id,action.label,state.title+'. '+action.description);
    }
    if(brief.proof.includes('promise')){
      const step=root.EarthLegacy.promiseStep(sim.state,site);
      return {...step,detail:state.title+'. '+(step.detail || state.milestones[1].detail)};
    }
    if(site.buildings.length+sites.length<9 && practical.length)return group('build',practical[0].id,'Plan a '+practical[0].label.toLowerCase(),state.title+'. '+state.milestones[1].detail);
    if(brief.proof.includes('project'))return {...group('people',null,'Plan a shared project',state.title+'. The neighbours can work together on a practical trial.'),page:'projects'};
    if(practical.length){
      const room=root.EarthLegacy.makeRoomStep(sim.state,site,'a practical project for this commission');
      if(room)return room;
    }
    return {...group('council',null,'Review the local commission',state.title),page:'commission'};
  }

  function testimony(world,site,person) {
    const saved=record(site);
    if(!saved || !['active','trial'].includes(saved.phase))return '';
    const slot=briefs[saved.key].seats.indexOf(person.slot);
    return slot<0?'':' On the commission, '+person.name+' adds, “'+witnesses[saved.key][slot]+'”';
  }
  function found(world,site,choice='later'){
    if(record(site) || !['accept','decline'].includes(choice))return '';
    const {key,definition}=describe(site);
    site.commission={key,phase:choice==='accept'?'active':'declined'};
    return choice==='accept'?'You took up “'+definition.title+'”. The two residents can be heard in People.':'The commission was set aside. It remains available in Council.';
  }
  function actions(world,site,add) {
    const state=summary(world,site),b=briefs[state.key];
    const addAction=(id,title,description,opts,run)=>add('council','commission:'+id,title,description,{campaign:true,...opts},run);
    if(state.phase==='offered'||state.phase==='declined'){
      addAction('accept','Take the local commission',b.title+' · Hear '+state.requesters+' and try one practical approach. You choose when to bring it back to Council.',{},()=>{
        site.commission={key:state.key,phase:'active'};return 'You took up “'+b.title+'”. '+state.milestones[0].detail;
      });
      if(state.phase==='offered')addAction('decline','Set this commission aside','Continue building freely. You can take up the commission here at any time.',{},()=>{
        site.commission={key:state.key,phase:'declined'};return 'Your community set aside “'+b.title+'”. It can reopen the commission in Council.';
      });
      return;
    }
    if(state.phase!=='active'&&state.phase!=='ready')return;
    const gate=state.milestones.filter(m=>!m.met).map(m=>m.label).join(' and ');
    for(const t of b.trials) {
      const ally=site.residents[t.ally].name;
      const bounded=['trust','wellbeing'].includes(t.resource);
      const terms=t.terms+' Next week’s review brings '+(bounded?'up to ':'')+t.amount+' '+t.resource+' and up to 1 bond with '+ally+'. '+b.support+' Meeting it adds up to 2 trust.';
      addAction('pilot:'+t.id,t.name,terms,{goods:t.cost,gate:gate?'First '+gate.toLowerCase()+'.':''},()=>{
        site.commission={key:state.key,phase:'trial',choice:t.id,due:world.week+1};
        return 'The community chose “'+t.name+'”. Its first handover is reviewed in week '+site.commission.due+'. '+b.support;
      });
    }
    addAction('pause','Set the commission aside','Return to this decision later. Neighbours remember the work you have already done.',{},()=>{
      site.commission={key:state.key,phase:'declined'};return 'The commission was set aside. Completed work still counts when you return.';
    });
  }
  function tick(world,site,helpers) {
    const saved=record(site);
    if(!saved || saved.phase!=='trial' || !Number.isSafeInteger(saved.due) || world.week<saved.due)return [];
    const b=briefs[saved.key],t=b.trials.find(choice=>choice.id===saved.choice);
    if(!t)return [];
    const supported=b.test(site),ally=site.residents[t.ally];
    const effects={[t.resource]:t.amount};
    if(supported)effects.trust=(effects.trust||0)+2;
    const delta=helpers.apply(site,effects),bondChange=helpers.bond(ally,1);
    const observed=Object.entries(delta).map(([key,amount])=>amount ? '+'+amount+' '+key : key+' held at '+site[key]).join(' · ');
    const narrative=supported?t.supported:t.normal;
    const outcome=narrative+' '+observed+' · '+ally.name+' '+bondChange+'.';
    site.commission={...saved,phase:'complete',supported,outcome};
    return [b.title+' — '+outcome];
  }
  function valid(site) {
    if(site?.commission==null)return true;
    const saved=record(site);if(!saved)return false;
    if(saved.phase!=='trial' && saved.phase!=='complete')return saved.choice==null && saved.due==null;
    if(!Number.isSafeInteger(saved.due) || saved.due<1 || !briefs[saved.key].trials.some(p=>p.id===saved.choice))return false;
    return saved.phase==='trial' || (typeof saved.outcome==='string' && typeof saved.supported==='boolean');
  }
  root.EarthCampaigns=Object.freeze({preview,summary,found,actions,tick,testimony,guidance,valid});
})(typeof window==='undefined'?globalThis:window);
