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
  const homeDistrict=world=>world.communityLife&&world.sites.find(s=>s.id===world.communityLife.homeId);
  const residentHere=(site,p)=>(root.EarthCommunityLife?.residency?.(site,p.id)||'member')==='member';
  const heardVoice=(site,p)=>p.heard||root.EarthCivicInitiatives?.hasTestimony?.(site,p.id);
  const neighboursStep=(world,label,detail)=>({kind:'neighbours',siteId:world.activeId,label,detail});
  function secondCommunity(world,site){
    const place=world.communityLife&&root.EarthCommunityLife?.neighbours?.(world,site)?.[0];
    return place?neighboursStep(world,'Visit '+place.name,'Take the path to '+place.name+' and meet its host. A visited neighbour can join the charter network on its own terms.'):atlasStep(site);
  }
  function partnerStep(world,home,partner){
    if(!world.communityLife)return groupStep(home,'routes','Review a link from '+home.name+' to '+partner.name,'route:'+partner.id);
    const host=root.EarthCommunityLife?.hostFor?.(partner),met=partner.communityLife?.visits?.steward?.met||host?.heard;
    const related=partner.foundedBy===home.id||home.foundedBy===partner.id;
    if(!host)return weekStep(home,partner.name+' is waiting for a local delegate to take up the admissions rota before considering a freight agreement.');
    if(!met&&(!related||world.charter==='voice'))return neighboursStep(world,'Meet '+(host?.name||'the host')+' in '+partner.name,
      'Introduce yourself in Towns. Return to '+home.name+' to propose a route that protects both towns’ reserves.');
    if(partner.trust<35||home.trust<35)return weekStep(home,'The councils require 35 trust in each town before committing supplies. '+home.name+' has '+home.trust+' and '+partner.name+' has '+partner.trust+'.');
    return {...groupStep(home,'routes','Review the proposed route to '+partner.name,'route:'+partner.id),detail:'The freight offer shows each council’s terms. Signing it keeps the two towns’ reserves separate.'};
  }
  function localHearing(world,site,topic){
    const active=site.civicInitiatives?.active;
    const detail=active?' The current proposal is “'+active.title+'”.'+(active.decisionWeek>=world.week?' Its decision is due in week '+active.decisionWeek+'.':''):' Its residents choose their own meeting and projects each week.';
    return {...weekStep(site,site.name+' decides '+topic+'.'+detail),label:'Review '+site.name+'’s next week'};
  }
  function pantryStep(world,home,low){
    if(!home)return groupStep(low,'work','Tend the food beds in '+low.name,'work:forage');
    const cargo=world.routes.flatMap(r=>r.shipments.filter(q=>q.to===low.id&&q.good==='food')).sort((a,b)=>a.due-b.due)[0];
    if(cargo&&(home.id!==low.id||low.food+cargo.amount>=6&&cargo.due<=world.week+1)){
      const sender=world.sites.find(s=>s.id===cargo.from);
      return weekStep(home,cargo.amount+' food from '+(sender?.name||'a trading partner')+' is on the way to '+low.name+' for week '+cargo.due+'.');
    }
    if(home.id===low.id)return groupStep(low,'work','Tend the food beds in '+low.name,'work:forage');
    const link=world.routes.find(r=>r.from===home.id&&r.to===low.id||r.to===home.id&&r.from===low.id);
    if(!link)return partnerStep(world,home,low);
    const floor=root.CommonEarthSim.freightReserve(world,home,'food');
    if(home.food<=floor)return {...groupStep(home,'work','Grow surplus for '+low.name+' in '+home.name,'work:forage'),
      detail:home.name+' must keep '+floor+' food for its own households and promises. A surplus can be offered along the existing route.'};
    return weekStep(home,'The route between '+home.name+' and '+low.name+' compares the stores and in-transit food each week. Each council can hold its own reserves.');
  }
  const neighboursFirst=(site,people=site.residents)=>site.agency?.actor?
    [...people.filter(p=>p.id!==site.agency.actor),...people.filter(p=>p.id===site.agency.actor)]:people;
  const meetStep=(site,p,verb='Hear',action='listen')=>({kind:'resident',group:'people',siteId:site.id,residentId:p.id,actionId:action+':'+p.id,label:verb+' '+p.name+' in '+site.name});

  function constructionStep(world,site,accept) {
    if(!site.construction?.length)return null;
    const jobs=root.EarthConstruction?.view(site,world)?.jobs || [];
    const matches=jobs.filter(job=>job.progress<1 && accept(job));
    if(!matches.length)return null;
    const job=matches.find(job=>!job.paused && job.workerNames.length) || matches.find(job=>!job.paused) || matches[0];
    if(job.paused)return {kind:'construction',siteId:site.id,jobId:job.id,label:'Resume work on '+job.name,
      detail:'This worksite in '+site.name+' is paused. Choose Resume work in its inspector, then allow available residents to reach the site and finish the job.'};
    const staffed=job.workerNames.length>0;
    const detail=staffed?job.workerNames.join(' and ')+(job.workerNames.length===1?' is':' are')+' on the '+job.name+' crew in '+site.name+'. Stay in active play to let the crew finish.':
      job.name+' is waiting for builders in '+site.name+'. Review the residents’ activities and offer a construction role.';
    return {kind:'construction',siteId:site.id,jobId:job.id,label:(staffed?'See work on ':'Find a crew for ')+job.name,detail};
  }
  function buildingPromiseStep(world,site,p) {
    const alternative=['garden','workshop','hall'][p.slot];
    const step=constructionStep(world,site,job=>job.scope==='street' && job.kind===alternative);
    if(!step)return null;
    step.detail+=' Opening it this week can keep the promise to '+p.name+'. You can also deliver the agreed supplies in People before the end of week '+p.promise.dueWeek+'.';
    return step;
  }
  function promiseStep(world,site) {
    const people=neighboursFirst(site).filter(p=>residentHere(site,p));
    if(!people.length)return localHearing(world,site,'when its residents are ready to meet');
    const promised=people.filter(p=>p.promise).sort((a,b)=>a.promise.dueWeek-b.promise.dueWeek)[0];
    if(promised)return buildingPromiseStep(world,site,promised) || meetStep(site,promised,'Keep the promise to','fulfil');
    const ready=people.find(p=>p.heard && world.week-p.lastPromise>=3);
    if(ready)return meetStep(site,ready,'Discuss a promise with','promise');
    const unheard=people.find(p=>!p.heard);
    if(unheard)return meetStep(site,unheard);
    const nextWeek=Math.min(...people.map(p=>p.lastPromise+3));
    return weekStep(site,'Residents are seeing how their last agreements worked out. A new promise is available in week '+nextWeek+'.');
  }

  function makeRoomStep(world,site,need) {
    const jobs=(site.construction || []).filter(j=>j.scope==='street');
    if(site.buildings.length+jobs.length<9)return null;
    const clearing=constructionStep(world,site,j=>j.scope==='street' && j.kind==='dismantle');
    if(clearing)return {...clearing,detail:clearing.detail+' Finishing this clearance will release a lot for '+need+'.'};
    if(!site.buildings.length){
      const job=jobs.slice().sort((a,b)=>a.work/a.total-b.work/b.total)[0];
      return {kind:'construction',siteId:site.id,jobId:job.id,label:'Review lot '+(job.plot+1)+' in '+site.name,
        detail:'All nine lots are reserved by unfinished projects. To make room for '+need+', you can cancel a commission in Build. Check the refund before deciding.'};
    }
    return {...groupStep(site,'build','Choose a lot to reopen in '+site.name),inspectReclaim:true,
      detail:'All nine lots are occupied or reserved. You can commission a crew to dismantle an open building, or cancel an unfinished project to make room for '+need+'.'};
  }

  function apprenticeshipStep(world,site) {
    if(!site.residents.some(p=>world.communityLife?heardVoice(site,p):p.heard)){
      const person=neighboursFirst(site).find(p=>residentHere(site,p));
      return person?meetStep(site,person):localHearing(world,site,'when its founders can give testimony');
    }
    if(!has(site,'hall')&&!has(site,'workshop')){
      const underway=constructionStep(world,site,job=>job.scope==='street' && ['workshop','hall'].includes(job.kind));
      if(underway)return underway;
      const room=makeRoomStep(world,site,'an apprenticeship workshop');
      if(room)return room;
      return groupStep(site,'build','Plan a repair workshop in '+site.name,'build:workshop');
    }
    return groupStep(site,'research','Review apprenticeship in '+site.name,'research:apprenticeship');
  }

  function councilStep(world,site) {
    if(governs(world,site))return weekStep(site,active(world).person+' holds this council’s elected chair through week '+(active(world).start+WEEKS)+'.');
    if(site.issue)return {...groupStep(site,'council','Review the vote in '+site.name),inspectVote:true};
    const due=Math.min(...site.pending.map(p=>p.week));
    if(Number.isFinite(due))return weekStep(site,site.name+'’s vote has been cast. Its outcome counts in week '+due+'.');
    const first=site.founded+1;
    const next=first+Math.max(0,Math.floor((world.week-first)/4)+1)*4;
    return weekStep(site,'The next council agenda in '+site.name+' opens in week '+next+'.');
  }

  function stewardshipStep(world,site) {
    if(!site.tech.includes('apprenticeship'))return apprenticeshipStep(world,site);
    if(!site.tech.includes('exchange')){
      if(!world.routes.some(r=>r.from===site.id || r.to===site.id)){
        const others=world.sites.filter(s=>s.id!==site.id);
        const partner=world.communityLife?others.find(s=>s.trust>=35&&root.EarthCommunityLife?.hostFor?.(s)&&
          (s.communityLife?.visits?.steward?.met||root.EarthCommunityLife.hostFor(s).heard))||
          others.find(s=>s.trust>=35&&root.EarthCommunityLife?.hostFor?.(s))||others[0]:others[0];
        return partner?partnerStep(world,site,partner):secondCommunity(world,site);
      }
      if(site.stats.kept===0)return promiseStep(world,site);
      return groupStep(site,'research','Review Exchange network in '+site.name,'research:exchange');
    }
    if(site.stats.resolved===0)return councilStep(world,site);
    const witnesses=neighboursFirst(site).filter(p=>!(world.communityLife?heardVoice(site,p):p.heard));
    const unheard=witnesses.find(p=>residentHere(site,p));
    if(unheard)return meetStep(site,unheard);
    if(witnesses.length)return neighboursStep(world,'Review the compact with another community',
      witnesses[0].name+' is away and this council still needs their testimony. You can visit a neighbouring town, review its progress and apply for membership if its residents agree.');
    return groupStep(site,'research','Review the Stewardship compact in '+site.name,'research:stewardship');
  }

  function charterProgress(world) {
    if(!world?.sites?.length || !world.charter)return null;
    const facts=root.CommonEarthSim.charterFacts(world),sites=world.sites,rows=[];
    const home=homeDistrict(world),current=home||sites.find(s=>s.id===world.activeId)||sites[0];
    function add(id,label,count,target,detail,action){
      rows.push({id,label,count,target,met:count>=target,detail,action:count>=target || world.completed?null:action});
    }
    if(world.charter==='care'){
      const low=home&&home.food<6?home:sites.find(s=>s.food<6);
      add('food','Keep six food in every community',facts.supplied,sites.length,
        facts.supplied+' of '+units(sites.length,'community','communities')+' hold at least 6 food.'+(low?' '+low.name+' currently has '+low.food+'.':''),
        low&&pantryStep(world,home,low));
      const host=home||sites.find(s=>s.residents.some(p=>p.promise))||current;
      add('promises','Keep two promises',facts.kept,2,units(facts.kept,'promise','promises')+' kept across the network.',promiseStep(world,host));
    }else if(world.charter==='voice'){
      const unheard=s=>neighboursFirst(s).filter(p=>!heardVoice(s,p));
      const incomplete=home&&unheard(home).some(p=>residentHere(home,p))?home:sites.filter(s=>unheard(s).length).sort((a,b)=>unheard(a).length-unheard(b).length)[0];
      const available=incomplete&&unheard(incomplete).find(p=>residentHere(incomplete,p));
      const testimony=!incomplete?secondCommunity(world,current):home&&(incomplete.id!==home.id||!available)?localHearing(world,incomplete,'whose testimony it needs'):
        meetStep(incomplete,available||unheard(incomplete)[0]);
      add('voices','Hear every founding resident in two communities',facts.heard,2,
        units(facts.heard,'community has','communities have')+' heard everyone. The charter calls for two.'+(incomplete&&facts.heard<2?' Still to hear in '+incomplete.name+': '+unheard(incomplete).map(p=>p.name).join(', ')+'.':''),testimony);
      const agenda=home||sites.find(s=>s.issue)||sites.find(s=>s.pending.length)||current;
      add('decisions','Resolve two council decisions',facts.decisions,2,units(facts.decisions,'decision','decisions')+' resolved. A vote counts when its outcome takes effect.',councilStep(world,agenda));
    }else if(world.charter==='craft'){
      const learner=home&&!home.tech.includes('apprenticeship')?home:sites.find(s=>!s.tech.includes('apprenticeship'));
      add('schools','Establish shared apprenticeships in two communities',facts.schools,2,
        units(facts.schools,'community has','communities have')+' completed apprenticeship. The charter calls for two.',learner?home&&learner.id!==home.id?localHearing(world,learner,'when to invest in apprenticeship'):apprenticeshipStep(world,learner):secondCommunity(world,current));
      const courier=home||sites.find(s=>s.delivery)||current;
      const recipient=personById(courier,courier.delivery?.residentId);
      add('deliveries','Deliver one street errand',facts.deliveries,1,units(facts.deliveries,'parcel','parcels')+' delivered.'+(recipient?' The current parcel belongs to '+recipient.name+' in '+courier.name+'.':''),
        groupStep(courier,'work',recipient?'Review the parcel for '+recipient.name:'Collect a market parcel in '+courier.name,recipient?'courier:deliver:'+recipient.id:'courier:pick'));
    }else return null;
    const researchSite=home||sites.reduce((a,b)=>b.tech.length>a.tech.length?b:a,current);
    const nextResearch=stewardshipStep(world,researchSite);
    const researchDetail=facts.stewards?units(facts.stewards,'community has','communities have')+' completed the Stewardship compact.':
      'One community must research Stewardship. Its Exchange network requires a route between two communities. '+nextResearch.label+'.';
    add('stewardship','Research the Stewardship compact',facts.stewards,1,researchDetail,nextResearch);
    const unfinished=rows.find(row=>!row.met);
    const priority=!world.completed && (facts.termsMet || facts.stewards>0 || sites.some(s=>s.tech.includes('exchange')));
    return {key:world.charter,termsMet:facts.termsMet,stewardshipMet:facts.stewards>0,ratified:world.completed,rows,priority,
      next:world.completed?null:unfinished?.action||null,summary:world.completed?'Your network has ratified its charter.':unfinished?.detail||''};
  }

  function reclaimableShift(world) {
    const home=homeDistrict(world),host=world.sites.find(s=>(!home||s.id===home.id)&&s.shift&&s.shift.effortPaid!==false&&!s.shift.history.length);
    if(!host)return null;
    const person=personById(host,host.shift.residentId);
    return {kind:'group',group:'people',page:'shift',siteId:host.id,label:'Review your day with '+person.name,
      detail:'You have not completed a visit together. Ending the shift now returns its one effort immediately.'};
  }

  function reservedSupplies(sim,site,goods,step) {
    const choices=[],jobs=site.construction || [],model=root.EarthCityModel;
    for(const r of model?.overview(site).records || []){
      if(!r.target || r.target===step.project)continue;
      const refund=model.preview(site,sim.state,r.id,'cancel').recovery;
      const job=jobs.find(j=>j.id===r.jobId);
      choices.push({refund,progress:r.laborReady?1:job?job.work/job.total:0,
        review:{kind:'city',siteId:site.id,precinct:r.id,project:'cancel',label:'Review the project at '+r.name}});
    }
    if(site.id===sim.state.activeId)for(const job of jobs){
      if(job.scope!=='street' || job.kind==='dismantle')continue;
      const cancellation=sim.previewCancelConstruction(job.id);
      if(cancellation?.available)choices.push({refund:cancellation.refund,progress:job.work/job.total,
        review:{kind:'construction',siteId:site.id,jobId:job.id,label:'Review the supplies reserved for '+job.name}});
    }
    const gaps=Object.entries(goods).filter(([key,need])=>site[key]<need);
    const useful=choices.filter(c=>gaps.some(([key])=>c.refund[key]>0));
    if(!useful.length || gaps.some(([key,need])=>site[key]+useful.reduce((n,c)=>n+(c.refund[key]||0),0)<need))return null;
    const covers=c=>gaps.every(([key,need])=>site[key]+(c.refund[key]||0)>=need);
    const chosen=useful.sort((a,b)=>Number(covers(b))-Number(covers(a)) || a.progress-b.progress)[0];
    return {...chosen.review,detail:step.label+' needs the remaining effort this week. Cancelling this project would return '+chosen.refund.funds+' funds and '+chosen.refund.materials+' materials.'+
      (!covers(chosen)?' A further release would also be needed.':'')+' Review the trade-off before deciding.'};
  }

  const paidWork={funds:'work:contract',materials:'work:salvage',food:'work:forage'};

  function prepareStep(sim,step) {
    if(!step)return null;
    const world=sim.state,site=world.sites.find(s=>s.id===step.siteId),home=homeDistrict(world);
    if(!site)return null;
    if(world.communityLife?.journey)return neighboursStep(world,'Continue along the path','Complete the crossing or turn back in Towns before making a new local commitment.');
    if(step.kind==='week'||step.kind==='neighbours')return step;
    if(home&&site.id!==home.id){
      const person=step.residentId&&personById(site,step.residentId);
      if(person?.promise?.by==='steward')return neighboursStep(world,'Carry your promise to '+person.name,
        'Pack the balance at your home exchange in Towns, travel to '+site.name+', then bring it to '+person.name+' before week '+person.promise.dueWeek+' ends.');
      return localHearing(world,site,'its own work and council business');
    }
    if(home&&world.activeId!==home.id)return neighboursStep(world,'Return home to '+home.name,step.label+' is a decision in your home community. Take the path home in Towns.');
    const self=site.agency?.actor;
    if(self && (step.kind==='resident'&&step.residentId===self || step.actionId==='courier:deliver:'+self)){
      const name=personById(site,self).name;
      return {kind:'actor',siteId:site.id,label:'Choose someone to meet '+name,
        detail:'You are playing as '+name+'. Switch to the steward or another neighbour to meet '+name+' in person.'};
    }
    let cost, goods;
    if(step.kind==='atlas'){
      const offer=sim.sponsorshipOffer(site.id);
      if(offer.available)return step;
      cost=offer.effort;
      goods=Object.fromEntries(Object.entries(offer.goods).map(([k,n])=>[k,n+(offer.reserves[k]||0)]));
    }else if(step.kind==='city'){
      const proposal=root.EarthCityModel?.preview(site,world,step.precinct,step.project);
      if(!proposal?.ok || proposal.available)return step;
      if(root.EarthCityModel.overview(site).works>=2)return constructionStep(world,site,job=>job.scope==='city') ||
        weekStep(site,'Both precinct work sites are occupied. Advance to the scheduled opening or review a cancellation.');
      cost=proposal.cost.effort;goods={funds:proposal.cost.funds,materials:proposal.cost.materials};
    }else if(step.inspectVote || step.inspectPilot || step.actionId){
      const actions=sim.actions(step.group,site.id);
      const choicePrefix=step.inspectVote?'vote:':step.inspectPilot?'commission:pilot:':null;
      const action=choicePrefix
        ? actions.find(a=>a.id.startsWith(choicePrefix)&&a.available)||actions.find(a=>a.id.startsWith(choicePrefix))
        : actions.find(a=>a.id===step.actionId);
      if(!action)return step;
      if(!action.available && root.EarthPursuits && !world.effort){
        const resource=Object.keys(paidWork).find(key=>paidWork[key]===action.id);
        if(resource)return {kind:'personalWork',siteId:site.id,resource,label:'Earn '+resource+' in '+site.name,
          detail:step.detail+' Personal work can supply '+resource+' before the next weekly close.'};
      }
      // A vote is the player's choice. Show the options together when any is actionable.
      if(action.available)return step;
      cost=action.cost;goods=action.goods;
      if(home&&action.targetId&&action.id==='route:'+action.targetId&&goods.materials)
        goods={...goods,materials:goods.materials+root.CommonEarthSim.freightReserve(world,site,'materials')};
    }else return step;
    const missing=Object.entries(goods).find(([key,n])=>site[key]<n);
    // Offer a personal job for the specific resource at the decision threshold.
    if(missing && root.EarthPursuits && world.effort===cost && Object.hasOwn(paidWork,missing[0])){
      const [resource,needed]=missing;
      return {kind:'personalWork',siteId:site.id,resource,label:'Earn '+resource+' for '+site.name,
        detail:step.label+' needs '+needed+' '+resource+'. Personal work can earn the remaining '+(needed-site[resource])+' while keeping the effort for the decision.'};
    }
    if(missing && world.effort>0){
      const [key,needed]=missing;
      if(key==='materials' && world.effort>=cost){
        const clearances=(site.construction || []).filter(j=>j.scope==='street' && j.kind==='dismantle');
        if(site.materials+clearances.reduce((sum,j)=>sum+(j.recovered||0),0)>=needed){
          const job=constructionStep(world,site,j=>j.scope==='street' && j.kind==='dismantle' && j.recovered>0);
          if(job)return {...job,detail:job.detail+' The recovered materials are added when the clearance finishes. They can help pay for '+step.label.toLowerCase()+' this week.'};
        }
      }
      if(key==='funds' && site.delivery){
        const handover=sim.actions('work',site.id).find(a=>a.id==='courier:deliver:'+site.delivery.residentId && a.available);
        if(handover)return {...groupStep(site,'work',handover.label,handover.id),detail:'Hand over the parcel already collected. The delivery earns 3 funds and uses no effort.'};
      }
      const promised=step.actionId?.startsWith('fulfil:') && personById(site,step.actionId.slice('fulfil:'.length));
      if(world.effort===cost && (step.startByWeek===world.week || promised?.promise?.dueWeek<=world.week)){
        const released=reservedSupplies(sim,site,goods,step);
        if(released)return released;
        const p=promised;
        if(p){
          const extension=sim.actions('people',site.id).find(a=>a.id==='revise:'+p.id && a.available);
          if(extension)return {...meetStep(site,p,'Discuss more time with','revise'),detail:extension.description};
          const kind=['garden','workshop','hall'][p.slot];
          const build=sim.actions('build',site.id).find(a=>a.kind===kind && a.available);
          if(build)return {...groupStep(site,'build','Plan a '+build.label.toLowerCase()+' for '+p.name,build.id),
            detail:'There is one effort left. You can commission this project now and let a crew finish it before advancing the week to keep the promise.'};
        }
      }
      const work=sim.actions('work',site.id).find(a=>a.id===paidWork[key]&&a.available);
      if(work)return {...groupStep(site,'work',work.label+' in '+site.name,work.id),
        detail:step.label+'. You have '+site[key]+' of the '+needed+' '+key+' needed. '+work.description};
    }
    if(world.effort<cost){
      const shift=cost===world.effort+1 && reclaimableShift(world);
      if(shift)return {...shift,detail:step.label+' needs '+cost+' effort. '+shift.detail};
      return {...groupStep(site,'work','Take a paid shift','work:contract'),detail:step.label+' needs '+cost+' civic effort. Each completed job restores one.'};
    }
    return step;
  }

  function guidance(sim) {
    const world=sim.state,site=sim.active(),home=homeDistrict(world);
    if(!site)return null;
    if(world.communityLife?.journey)return neighboursStep(world,'Continue along the path','Complete the crossing or turn back in Towns before making a new local commitment.');
    // Bring an expiring commitment back into view even if the player has travelled.
    const due=world.sites.flatMap(s=>s.residents.filter(p=>p.promise?.dueWeek<=world.week&&(!home||s.id===home.id||p.promise.by==='steward')).map(p=>({s,p})));
    const urgent=due.map(({s,p})=>{
      if(home&&s.id!==home.id)return {rank:0,step:prepareStep(sim,meetStep(s,p,'Carry your promise to','fulfil'))};
      const building=buildingPromiseStep(world,s,p);
      if(building)return {rank:0,step:building};
      if(!world.effort && !reclaimableShift(world))return null;
      const delivery=meetStep(s,p,'Review the promise to','fulfil');
      const step=prepareStep(sim,{...delivery,detail:p.name+'’s promise is due by the end of this week.'});
      // If several dates coincide, give the last effort to a promise it can still keep.
      const rank=step.actionId===delivery.actionId?1:step.actionId?.startsWith('revise:')?2:3;
      return {rank,step};
    }).filter(Boolean).sort((a,b)=>a.rank-b.rank)[0];
    if(urgent)return urgent.step;
    const commission=(!home||site.id===home.id)&&root.EarthCampaigns?.guidance(sim,site);
    if(commission)return prepareStep(sim,commission);
    if(home&&world.activeId!==home.id&&!world.charter)return neighboursStep(world,'Return home to '+home.name,'Bring a charter proposal to your own council after your visit.');
    if(world.completed&&home&&world.activeId!==home.id)return neighboursStep(world,'Return home to '+home.name,'The charter is ratified. Your own residents can consider a council handover when you return.');
    if(world.completed){
      const term=active(world),last=world.legacy?.history?.[0];
      const shiftSite=world.sites.find(s=>s.shift);
      if(term){
        const due=term.start+WEEKS;
        if(shiftSite){
          const host=personById(shiftSite,shiftSite.shift.residentId);
          return {kind:'group',group:'people',page:'shift',siteId:shiftSite.id,label:'Resume your day with '+host.name,
            detail:term.person+' is serving on the council through the handover in week '+due+'. Your current resident shift ends at this week’s close.'};
        }
        return weekStep(world.sites.find(s=>s.id===term.siteId),
          term.person+' has chaired '+term.siteName+' for '+term.decisions.length+' of '+WEEKS+' weeks. The handover review is due in week '+due+'.');
      }
      if(!last){
        if(!world.effort)return reclaimableShift(world) || weekStep(site,'Your charter was ratified. Electing a resident takes one effort, available again next week.');
        const heard=site.residents.filter(p=>p.heard);
        if(!heard.length)return {...meetStep(site,neighboursFirst(site)[0]),detail:'Hear a local resident before offering them the council chair.'};
        if(heard.every(p=>p.id===site.shift?.residentId))return {kind:'group',group:'people',page:'shift',siteId:site.id,
          label:'Review your day with '+heard[0].name,detail:'Finish the day together before electing '+heard[0].name+', or hear another local candidate.'};
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

  function chooseContact(term,candidates,allow=()=>true) {
    const people = [];
    for (const site of candidates) {
      for (const person of site.residents) {
        if (person.id !== term.residentId&&residentHere(site,person)&&allow(site,person)) people.push({site,person});
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
    if(world.communityLife&&home.trust<35)return '';
    const floor = Math.max(good === 'food' ? foodFloor(home) : 2,
      world.communityLife?root.CommonEarthSim.freightReserve(world,home,good):0);
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
    const p=chooseContact(term,[home])?.person;
    if(!p)return 'Kept the supplies in reserve because no household could meet the chair this week.';
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
    const contact=chooseContact(term,[home,...contacts(world,home).map(p=>p.site)],
      (site,person)=>!world.communityLife||site.id===home.id||root.EarthCivicInitiatives?.hasTestimony?.(site,person.id));
    if(!contact)return 'Kept the listening budget until a resident could attend or a neighbouring council published testimony.';
    const {site,person}=contact;
    if(world.communityLife&&site.id!==home.id){
      home.funds-=cost;remember(term,person);
      if(!term.partners.includes(site.name))term.partners.push(site.name);
      return 'Paid '+units(cost,'fund','funds')+' to bring '+person.name+'’s published testimony from '+site.name+' before the home council.';
    }
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
        {legacy:true,effort:1,gate:site.shift?.residentId===person.id?'Finish your day with '+person.name+' first, or elect another resident.':
          !residentHere(site,person)?person.name+' is away or visiting and cannot chair this meeting.':
          person.heard?'':'Hear '+person.name+' in People before offering the chair.'},() => {
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
    output.description = 'A resident can chair one community for four weeks. Their decision each week uses its real reserves.'+(world.communityLife?' Neighbouring councils retain authority over their own districts.':' Ordinary play continues across your districts.');
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

  root.EarthLegacy = Object.freeze({governs,actions,tick,summary,valid,charterProgress,guidance,prepareStep,promiseStep,constructionStep,buildingPromiseStep,makeRoomStep});
})(typeof window === 'undefined' ? globalThis : window);
