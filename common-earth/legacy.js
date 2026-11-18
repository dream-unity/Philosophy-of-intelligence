/* A voluntary four-week Council handover. Only the elected community delegates
   its agenda. All changes use the usual world, reserves, routes and weekly clock. */
((root) => {
  'use strict';

  const WEEKS = 4;
  const OFFICES = [
    {name:'Pantry steward', aim:'Keep food within reach', brief:'Send spare food to a linked pantry in need. At home, pay for missing staples or share a meal with a resident.'},
    {name:'Workshop steward', aim:'Put tools into people’s hands', brief:'Send spare materials to a linked community in need. At home, repair practical equipment with a resident. A workshop makes the same materials go further.'},
    {name:'Assembly chair', aim:'Bring unheard voices into the room', brief:'Pay for local or linked listening sessions. Residents who have never spoken come first. An assembly hall reduces the cost.'}
  ];
  const has = (site, kind) => site.buildings.some(b => b.kind === kind);
  const foodFloor = site => Math.max(6, Math.ceil(site.population / 5));
  const personById = (site, id) => site.residents.find(p => p.id === id);
  const active = world => world.legacy?.term;
  const governs = (world, site) => Boolean(active(world)?.siteId === site.id);
  const fundsFor = (site, n) => site.funds - n >= 2;
  const units = (n,singular,plural) => n+' '+(n === 1 ? singular : plural);
  const cap = (object, key, increment, limit) => {
    const before = object[key];
    object[key] = Math.min(limit, before + increment);
    return object[key] - before;
  };

  function measure(world) {
    const {termsMet:met,supplied,kept,heard,decisions,schools,deliveries}=root.CommonEarthSim.charterFacts(world);
    let text;
    if(world.charter==='care'){
      text=supplied+' of '+units(world.sites.length,'community','communities')+' had at least 6 food, with '+units(kept,'promise','promises')+' kept.';
    }else if(world.charter==='voice'){
      text='All founding residents had spoken in '+units(heard,'community','communities')+'. Councils had resolved '+units(decisions,'decision','decisions')+'.';
    }else{
      text=units(schools,'community','communities')+' had shared apprenticeships. Residents had received '+units(deliveries,'street delivery','street deliveries')+'.';
    }
    return {met,text};
  }

  const groupStep=(site,group,label,actionId)=>({kind:'group',siteId:site.id,group,label,actionId});
  const atlasStep=site=>({kind:'atlas',siteId:site.id,label:'Found a second community on Earth'});
  const weekStep=(site,detail)=>({kind:'week',siteId:site.id,label:'Review the next week',detail});
  const meetStep=(site,p,verb='Hear',action='listen')=>({kind:'resident',group:'people',siteId:site.id,residentId:p.id,actionId:action+':'+p.id,label:verb+' '+p.name+' in '+site.name});

  function promiseStep(world,site) {
    const people=site.residents;
    const promised=people.filter(p=>p.promise).sort((a,b)=>a.promise.dueWeek-b.promise.dueWeek)[0];
    if(promised)return meetStep(site,promised,'Keep the promise to','fulfil');
    const ready=people.find(p=>p.heard && world.week-p.lastPromise>=3);
    if(ready)return meetStep(site,ready,'Discuss a promise with','promise');
    const unheard=people.find(p=>!p.heard);
    if(unheard)return meetStep(site,unheard);
    const nextWeek=Math.min(...people.map(p=>p.lastPromise+3));
    return weekStep(site,'Residents are seeing how their last agreements worked out. A new promise is available in week '+nextWeek+'.');
  }

  function apprenticeshipStep(site) {
    if(!site.residents.some(p=>p.heard))return meetStep(site,site.residents[0]);
    if(!has(site,'hall')&&!has(site,'workshop')){
      if(site.buildings.length===9)return {...groupStep(site,'build','Choose a lot to reopen in '+site.name),inspectReclaim:true};
      return groupStep(site,'build','Plan a repair workshop in '+site.name,'build:workshop');
    }
    return groupStep(site,'research','Review apprenticeship in '+site.name,'research:apprenticeship');
  }

  function councilStep(world,site) {
    if(site.issue)return {...groupStep(site,'council','Review the vote in '+site.name),inspectVote:true};
    const due=Math.min(...site.pending.map(p=>p.week));
    if(Number.isFinite(due))return weekStep(site,site.name+'’s vote has been cast. Its outcome counts in week '+due+'.');
    const first=site.founded+1;
    const next=first+Math.max(0,Math.floor((world.week-first)/4)+1)*4;
    return weekStep(site,'The next council agenda in '+site.name+' opens in week '+next+'.');
  }

  function stewardshipStep(world,site) {
    if(!site.tech.includes('apprenticeship'))return apprenticeshipStep(site);
    if(!site.tech.includes('exchange')){
      if(!world.routes.some(r=>r.from===site.id || r.to===site.id)){
        const partner=world.sites.find(s=>s.id!==site.id);
        return partner?groupStep(site,'routes','Review a link from '+site.name+' to '+partner.name,'route:'+partner.id):atlasStep(site);
      }
      if(site.stats.kept===0)return promiseStep(world,site);
      return groupStep(site,'research','Review Exchange network in '+site.name,'research:exchange');
    }
    if(site.stats.resolved===0)return councilStep(world,site);
    const unheard=site.residents.find(p=>!p.heard);
    if(unheard)return meetStep(site,unheard);
    return groupStep(site,'research','Review the Stewardship compact in '+site.name,'research:stewardship');
  }

  function charterProgress(world) {
    if(!world?.sites?.length || !world.charter)return null;
    const facts=root.CommonEarthSim.charterFacts(world),sites=world.sites,rows=[];
    const current=sites.find(s=>s.id===world.activeId)||sites[0];
    function add(id,label,count,target,detail,action){
      rows.push({id,label,count,target,met:count>=target,detail,action:count>=target || world.completed?null:action});
    }
    if(world.charter==='care'){
      const low=sites.find(s=>s.food<6);
      add('food','Keep six food in every community',facts.supplied,sites.length,
        facts.supplied+' of '+units(sites.length,'community','communities')+' hold at least 6 food.'+(low?' '+low.name+' currently has '+low.food+'.':''),
        low&&groupStep(low,'work','Tend the food beds in '+low.name,'work:forage'));
      const host=sites.find(s=>s.residents.some(p=>p.promise))||current;
      add('promises','Keep two promises',facts.kept,2,units(facts.kept,'promise','promises')+' kept across the network.',promiseStep(world,host));
    }else if(world.charter==='voice'){
      const unheard=s=>s.residents.filter(p=>!p.heard);
      const incomplete=sites.filter(s=>unheard(s).length).sort((a,b)=>unheard(a).length-unheard(b).length)[0];
      const testimony=incomplete?meetStep(incomplete,unheard(incomplete)[0]):atlasStep(current);
      add('voices','Hear every founding resident in two communities',facts.heard,2,
        units(facts.heard,'community has','communities have')+' heard everyone. The charter calls for two.'+(incomplete&&facts.heard<2?' Still to hear in '+incomplete.name+': '+unheard(incomplete).map(p=>p.name).join(', ')+'.':''),testimony);
      const agenda=sites.find(s=>s.issue)||sites.find(s=>s.pending.length)||current;
      add('decisions','Resolve two council decisions',facts.decisions,2,units(facts.decisions,'decision','decisions')+' resolved. A vote counts when its outcome takes effect.',councilStep(world,agenda));
    }else if(world.charter==='craft'){
      const learner=sites.find(s=>!s.tech.includes('apprenticeship'));
      add('schools','Establish shared apprenticeships in two communities',facts.schools,2,
        units(facts.schools,'community has','communities have')+' completed apprenticeship. The charter calls for two.',learner?apprenticeshipStep(learner):atlasStep(current));
      const courier=sites.find(s=>s.delivery)||current;
      const recipient=personById(courier,courier.delivery?.residentId);
      add('deliveries','Deliver one street errand',facts.deliveries,1,units(facts.deliveries,'parcel','parcels')+' delivered.'+(recipient?' The current parcel belongs to '+recipient.name+' in '+courier.name+'.':''),
        groupStep(courier,'work',recipient?'Review the parcel for '+recipient.name:'Collect a market parcel in '+courier.name,recipient?'courier:deliver:'+recipient.id:'courier:pick'));
    }else return null;
    const researchSite=sites.reduce((a,b)=>b.tech.length>a.tech.length?b:a,current);
    const nextResearch=stewardshipStep(world,researchSite);
    const researchDetail=facts.stewards?units(facts.stewards,'community has','communities have')+' completed the Stewardship compact.':
      'One community must research Stewardship. Its Exchange network requires a route between two communities. '+nextResearch.label+'.';
    add('stewardship','Research the Stewardship compact',facts.stewards,1,researchDetail,nextResearch);
    const unfinished=rows.find(row=>!row.met);
    const priority=!world.completed && (facts.termsMet || facts.stewards>0 || sites.some(s=>s.tech.includes('exchange')));
    return {key:world.charter,termsMet:facts.termsMet,stewardshipMet:facts.stewards>0,ratified:world.completed,rows,priority,
      next:world.completed?null:unfinished?.action||null,summary:world.completed?'Your network has ratified its charter.':unfinished?.detail||''};
  }

  const paidWork={funds:'work:contract',materials:'work:salvage',food:'work:forage'};

  function prepareStep(sim,step) {
    if(!step)return null;
    const world=sim.state, site=world.sites.find(s=>s.id===step.siteId);
    if(!site)return null;
    let cost, goods;
    if(step.kind==='atlas'){
      const offer=sim.sponsorshipOffer(site.id);
      if(offer.available)return step;
      cost=offer.effort;
      goods=Object.fromEntries(Object.entries(offer.goods).map(([k,n])=>[k,n+(offer.reserves[k]||0)]));
    }else if(step.kind==='city'){
      const proposal=root.EarthCityModel?.preview(site,world,step.precinct,step.project);
      if(!proposal?.ok || proposal.available)return step;
      if(root.EarthCityModel.overview(site).works>=2)return weekStep(site,'Both crews are working. Let a project finish or cancel an existing project before commissioning another.');
      cost=proposal.cost.effort;goods={funds:proposal.cost.funds,materials:proposal.cost.materials};
    }else if(step.inspectVote || step.inspectPilot || step.actionId){
      const actions=sim.actions(step.group,site.id);
      const choicePrefix=step.inspectVote?'vote:':step.inspectPilot?'commission:pilot:':null;
      const action=choicePrefix
        ? actions.find(a=>a.id.startsWith(choicePrefix)&&a.available)||actions.find(a=>a.id.startsWith(choicePrefix))
        : actions.find(a=>a.id===step.actionId);
      if(!action)return step;
      // A vote is the player's choice. Show the options together when any is actionable.
      if(action.available)return step;
      cost=action.cost;goods=action.goods;
    }else return step;
    const missing=Object.entries(goods).find(([key,n])=>site[key]<n);
    if(missing && world.effort>0){
      const [key,needed]=missing;
      const work=sim.actions('work',site.id).find(a=>a.id===paidWork[key]&&a.available);
      if(work)return {...groupStep(site,'work',work.label+' in '+site.name,work.id),
        detail:step.label+'. You have '+site[key]+' of the '+needed+' '+key+' needed. '+work.description};
    }
    if(world.effort<cost)return weekStep(site,step.label+' needs '+cost+' effort. You have '+world.effort+' left. The next week restores four.');
    return step;
  }

  function guidance(sim) {
    const world=sim.state,site=sim.active();
    if(!site)return null;
    // Bring an expiring commitment back into view even if the player has travelled.
    const urgent=world.sites.flatMap(s=>s.residents.filter(p=>p.promise?.dueWeek<=world.week).map(p=>({s,p})))
      .sort((a,b)=>a.p.promise.dueWeek-b.p.promise.dueWeek)[0];
    if(urgent && world.effort>0){
      const step=meetStep(urgent.s,urgent.p,'Review the promise to','fulfil');
      return prepareStep(sim,{...step,detail:urgent.p.name+'’s promise is due by the end of this week.'});
    }
    const commission=root.EarthCampaigns?.guidance(sim,site);
    if(commission)return prepareStep(sim,commission);
    if(world.completed){
      const term=active(world),last=world.legacy?.history?.[0];
      if(term)return weekStep(world.sites.find(s=>s.id===term.siteId),
        term.person+' has chaired '+term.siteName+' for '+term.decisions.length+' of '+WEEKS+' weeks. The handover review is due in week '+(term.start+WEEKS)+'.');
      if(!last){
        if(!world.effort)return weekStep(site,'Your charter was ratified. Electing a resident takes one effort, available again next week.');
        if(!site.residents.some(p=>p.heard))return {...meetStep(site,site.residents[0]),detail:'Hear a local resident before offering them the council chair.'};
      }
      return {...groupStep(site,'council',last?'Review '+last.person+'’s handover':'Review council succession'),page:'legacy',
        detail:last?last.result:'Your charter was ratified. You can elect a resident to chair the council for four weeks.'};
    }
    if(world.charter){
      const progress=charterProgress(world);
      return progress.next?prepareStep(sim,{detail:progress.summary,...progress.next}):
        weekStep(site,'The Stewardship compact and your charter commitments are ready for assembly review.');
    }
    if(!world.sites.some(s=>s.stats.kept>0)){
      const promising=world.sites.find(s=>s.residents.some(p=>p.promise));
      const host=promising || site;
      const step=promiseStep(world,host);
      const description=step.actionId && sim.actions('people',host.id).find(a=>a.id===step.actionId)?.description;
      return prepareStep(sim,{detail:description || 'Visit a neighbour, hear what they need and keep one agreement.',...step});
    }
    return {...groupStep(site,'council','Choose your network charter'),detail:'Choose what success means for your communities. Each charter has different commitments.'};
  }

  function contacts(world, site) {
    const linked = [];
    for (const route of world.routes) {
      const id = route.from === site.id ? route.to : route.to === site.id ? route.from : null;
      if (!id) continue;
      const partner = world.sites.find(s => s.id === id);
      if (partner) linked.push({site:partner, route});
    }
    return linked;
  }

  function chooseContact(term, candidates) {
    const people = [];
    for (const site of candidates) {
      for (const person of site.residents) {
        if (person.id !== term.residentId) people.push({site, person});
      }
    }
    const attended = person => term.reached.includes(person.id);
    people.sort((a,b) => Number(attended(a.person)) - Number(attended(b.person))
      || Number(a.person.heard) - Number(b.person.heard)
      || a.person.bond - b.person.bond);
    return people[0];
  }

  function unmet(world, site, good) {
    let incoming = 0;
    for (const r of world.routes) {
      for (const cargo of r.shipments) {
        if (cargo.to === site.id && cargo.good === good) incoming += cargo.amount;
      }
    }
    const goal = good === 'food' ? foodFloor(site) : 5;
    return Math.max(0, goal - site[good] - incoming);
  }

  function sendSurplus(world, home, term, good, travelTime) {
    if (!travelTime) return '';
    const floor = good === 'food' ? foodFloor(home) : 2;
    const spare = Math.min(good === 'food' ? 3 : 2, home[good] - floor);
    if (spare < 1) return '';
    const partners = contacts(world, home)
      .filter(p => p.route.lastDispatch !== world.week)
      .map(p => ({...p,need:unmet(world,p.site,good)}));
    partners.sort((a,b) => b.need - a.need);
    const receiver = partners[0];
    if (!receiver || !receiver.need) return '';
    const depot = has(home,'pier') || has(receiver.site,'pier');
    const capacity = (depot ? 4 : 2) + (root.EarthStrategy?.cargoBonus(home) || 0);
    const amount = Math.min(spare, receiver.need, capacity), due = world.week + travelTime(home, receiver.site);
    home[good] -= amount;
    receiver.route.shipments.push({from:home.id, to:receiver.site.id, good, amount, due});
    const text = 'Sent '+amount+' '+good+' from '+home.name+' to '+receiver.site.name+'. Delivery is due in week '+due+'.';
    receiver.route.lastDispatch = world.week;
    receiver.route.lastStatus = text;
    if (!term.partners.includes(receiver.site.name)) term.partners.push(receiver.site.name);
    return text;
  }

  function remember(term, p) {
    if (!term.reached.includes(p.id)) term.reached.push(p.id);
  }

  function provision(world, home, term, helpers) {
    const food = term.slot === 0;
    const good = food ? 'food' : 'materials';
    const floor = food ? foodFloor(home) : 2;
    const sent = sendSurplus(world, home, term, good, helpers.travelTime);
    if (sent) return sent;
    const needed = food ? 2 : 1;
    if (home[good] - needed < floor) {
      if (!fundsFor(home, 2)) return 'Kept '+home.name+'’s reserves intact. The proposed '+(food?'meal':'repair')+' could not be funded this week.';
      home.funds -= 2;
      const quantity = food && has(home,'market') ? 4 : 3;
      home[good] += quantity;
      return 'Paid 2 funds to local suppliers for '+quantity+' '+good+'. '+home.name+' kept the purchase in reserve.';
    }
    const p = chooseContact(term, [home]).person;
    home[good] -= needed;
    remember(term, p);
    cap(p, 'bond', 1, 10);
    if (food) {
      const gain = cap(home, 'wellbeing', has(home,'garden') ? 2 : 1, 100);
      return 'Shared 2 food with '+p.name+'’s household through '+(has(home,'garden')?'the community garden':'the pantry')+'. '+(gain?'Local wellbeing rose by '+gain+'.':'Local wellbeing held at 100.');
    }
    const output = has(home,'workshop') ? 3 : 1;
    if (home.food <= foodFloor(home) + 2) {
      home.food += output;
      return 'Used 1 material to repair a food cart with '+p.name+'. The cart brought home '+output+' food.';
    }
    home.funds += output;
    return 'Used 1 material to repair equipment with '+p.name+'. A local customer paid '+output+' '+(output === 1?'fund':'funds')+' into the treasury.';
  }

  function hear(world, home, term) {
    const cost = has(home,'hall') ? 1 : 2;
    if (!fundsFor(home,cost)) return 'Postponed a listening session. The '+cost+'-fund cost would have cut into the treasury reserve.';
    const {site,person} = chooseContact(term,[home,...contacts(world,home).map(p => p.site)]);
    const first = !person.heard;
    home.funds -= cost;
    person.heard = true;
    cap(person,'bond',1,10);
    const trust = cap(site,'trust',1,100);
    remember(term,person);
    if (site.id !== home.id && !term.partners.includes(site.name)) term.partners.push(site.name);
    const testimony = ['who misses the pantry distribution','which repairs routinely go unpaid','who cannot attend ordinary meeting hours'][person.slot];
    return 'Paid '+units(cost,'fund','funds')+' for a session with '+person.name+' in '+site.name+'. '+person.name+' spoke about '+testimony+(first?' for the first time on the public record':'')+'. '+(trust?'Local trust rose by '+trust+'.':'Local trust held at 100.');
  }

  function actions(world, site, add) {
    if (!world.completed || active(world)) return;
    for (const person of site.residents) {
      const office = OFFICES[person.slot];
      add('council','legacy:start:'+person.id,'Elect '+person.name+' as '+office.name.toLowerCase(),
        office.brief+' For the next four weeks '+person.name+' will also choose this council’s votes. Keeps 2 funds and 2 materials in reserve, and at least 6 food for local households.',
        {legacy:true,effort:1,gate:person.heard?'':'Hear '+person.name+' in People before offering the chair.'},() => {
          world.legacy ||= {version:1,term:null,history:[]};
          world.legacy.term = {siteId:site.id,siteName:site.name,residentId:person.id,person:person.name,slot:person.slot,
            start:world.week,opening:measure(world),decisions:[],reached:[],partners:[]};
          return person.name+' accepted a four-week term in '+site.name+'. The handover review is due in week '+(world.week+WEEKS)+'.';
        });
    }
  }

  function tick(world, helpers = {}) {
    const term = active(world);
    if (!term || world.week <= term.start + term.decisions.length) return [];
    const home = world.sites.find(s => s.id === term.siteId);
    if (!home) return [];
    const pending = Boolean(home.issue);
    const vote = helpers.closingVote?.(home) || (pending && helpers.vote?.(home,term.slot));
    const decision = vote || (pending?'Deferred the vote to protect reserves. ':'')+
      (term.slot === 2 ? hear(world,home,term) : provision(world,home,term,helpers));
    const line = 'Week '+world.week+' · '+term.person+' — '+decision;
    term.decisions.push(line);
    const events = [{site:home,text:line}];
    if (term.decisions.length === WEEKS) {
      const closing = measure(world);
      const people = world.sites.flatMap(s => s.residents.filter(p => term.reached.includes(p.id))
        .map(p => s.id === home.id ? p.name : p.name+' at '+s.name));
      const missed = home.residents.filter(p => p.id !== term.residentId && !term.reached.includes(p.id));
      const reach = 'Direct household support or hearings: '+(people.join(', ') || 'none')+'. '+
        (term.partners.length?'Partner communities supported: '+term.partners.join(', ')+'. ':'')+
        (missed.length?'No direct visit was recorded for '+missed.map(p => p.name).join(' or ')+'.':'Every other founding resident at home had a direct visit.');
      const result = closing.met?'The original charter’s conditions held at review.':'The original charter’s conditions were no longer all met at review.';
      const review = {person:term.person,siteName:term.siteName,office:OFFICES[term.slot].name,week:world.week,
        opening:term.opening.text,closing:closing.text,result,reach,decisions:term.decisions.slice()};
      world.legacy.history.unshift(review);
      world.legacy.history.length = Math.min(world.legacy.history.length, 6);
      world.legacy.term = null;
      events.push({site:home,text:term.person+' returned the chair to you. '+result+' '+reach});
    }
    return events;
  }

  function summary(world, site) {
    const term = active(world), archive = world.legacy?.history || [];
    const output = {unlocked:Boolean(world.completed),phase:'locked',title:'Council handover',description:'',current:'',comparison:'',decisions:[],history:[],archives:[]};
    if (!world.completed) return output;
    output.phase = term ? (governs(world,site)?'governing':'elsewhere') : 'ready';
    output.description = 'A resident can chair one community for four weeks. Their decision each week uses its real reserves. Other districts and ordinary play remain in your hands.';
    if (term) {
      output.title = term.person+'’s council';
      output.current = OFFICES[term.slot].aim+' · '+term.siteName+' · '+term.decisions.length+' of 4 weekly decisions.';
      output.comparison = 'At handover: '+term.opening.text;
      output.decisions = term.decisions.slice();
    }
    output.archives = archive.map(record => ({
      title:record.person+' · '+record.office+' · '+record.siteName+' · week '+record.week,
      lines:['At handover: '+record.opening,'At review: '+record.closing,record.result,record.reach,...record.decisions]
    }));
    if (output.archives.length) {
      const last = output.archives[0];
      output.history = [last.title,...last.lines];
    }
    return output;
  }

  function valid(world) {
    const data = world.legacy;
    if (data == null) return true;
    const strings = (array,n) => Array.isArray(array) && array.length <= n && array.every(value => typeof value === 'string');
    if (data.version !== 1 || !Array.isArray(data.history) || data.history.length > 6) return false;
    for (const record of data.history) {
      if (!record || !Number.isInteger(record.week) || !strings(record.decisions,WEEKS) ||
        !['person','siteName','office','opening','closing','result','reach'].every(k => typeof record[k] === 'string')) return false;
    }
    const t = data.term;
    if (t == null) return true;
    const site = world.sites.find(s => s.id === t.siteId);
    const member = site && personById(site,t.residentId);
    return Boolean(world.completed && member && member.slot === t.slot && Number.isInteger(t.start) && t.start >= 1 &&
      t.start <= world.week && t.start+WEEKS > world.week && typeof t.person === 'string' && typeof t.siteName === 'string' &&
      typeof t.opening?.text === 'string' && typeof t.opening.met === 'boolean' && strings(t.decisions,WEEKS-1) &&
      t.decisions.length === world.week-t.start && strings(t.partners,WEEKS) && strings(t.reached,WEEKS));
  }

  root.EarthLegacy = Object.freeze({governs,actions,tick,summary,valid,charterProgress,guidance,prepareStep,promiseStep});
})(typeof window === 'undefined' ? globalThis : window);
