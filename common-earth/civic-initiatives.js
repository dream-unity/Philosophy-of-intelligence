/* Residents propose, debate and authorise a defined expense. Pledges are votes
   over existing public money. Only the core simulation pays the bill, starts a
   real construction contract or adopts a technology. The project chest and
   the player's weekly effort are outside this budget. */
(function(root){
  'use strict';
  const policies={
    garden:{axis:'care',evidence:['food','build'],venue:'garden',benefit:'Households will receive food from the completed garden each week.'},
    workshop:{axis:'craft',evidence:['build','research'],venue:'workshop',benefit:'Repairers and apprentices will share a bench and recover materials each week.'},
    market:{axis:'organisation',evidence:['build','food'],venue:'market',benefit:'Local sellers can use a market with a paying catchment.'},
    hall:{axis:'communication',evidence:['teach','hobby'],venue:'hall',benefit:'Residents will gain a meeting place and room for shared apprenticeships.'},
    fishingDock:{axis:'stamina',evidence:['food','build'],venue:'dock',benefit:'Fishers can use community nets from the completed dock.'},
    wetland:{axis:'care',evidence:['research','food'],venue:'garden',benefit:'The water commons will grow food and protect households during floods.'},
    pier:{axis:'organisation',evidence:['build','research'],venue:'dock',benefit:'Freight workers can send larger consignments on local routes.'},
    apprenticeship:{axis:'craft',evidence:['teach','research','build'],venue:'workshop',benefit:'Apprentices will share practical training and the town will recover more material.'},
    exchange:{axis:'organisation',evidence:['research','teach'],venue:'market',benefit:'Trading partners will receive consignments sooner through the network.'},
    stewardship:{axis:'communication',evidence:['teach','research'],venue:'hall',benefit:'The independent assembly can assess the network against its chosen charter.'}
  };
  const activePhases=['consultation','pledging','postponed','blocked'],closedPhases=['commissioned','built','adopted','cancelled','withdrawn'];
  const integer=(v,lo,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
  const string=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
  const dict=v=>v&&typeof v==='object'&&!Array.isArray(v),goods=()=>({funds:0,materials:0});
  const tag=id=>typeof id==='string'?id.split(':')[1]:null;
  const residents=site=>(root.EarthPersonas?.list(site)||site.residents||[]).filter(person=>
    !root.EarthCommunityLife?.residency||root.EarthCommunityLife.residency(site,person.id)==='member');
  const person=(site,id)=>root.EarthPersonas?.profile(site,id)||site.residents?.find(p=>p.id===id);
  const actor=(world,site)=>site.id===world.activeId?(root.EarthAgency?.actorId(site)||site.agency?.actor||'steward'):null;
  const state=site=>site.civicInitiatives||={version:1,week:0,serial:0,revision:0,nextWeek:0,active:null,history:[],testimony:[]};
  function volunteers(world,site){
    const alreadyWorked=new Set((site.civicInitiatives?.history||[]).flatMap(h=>h.works?.week===world.week?h.works.people:[]));
    const controlled=actor(world,site),assigned=site.construction?.length?new Set((root.EarthConstruction?.view?.(site,world)?.workers||[]).filter(p=>p.jobId).map(p=>p.residentId)):null;
    return residents(site).filter(p=>{
      const worker=site.workforce?.members?.[p.id],resident=site.residents?.find(r=>r.id===p.id),career=site.careers?.[p.id];
      return p.id!==controlled && !alreadyWorked.has(p.id) && !assigned?.has(p.id) && !resident?.promise && site.shift?.residentId!==p.id &&
        !worker?.jobId && !worker?.preferredJobId && (!worker?.preference || worker.preference==='auto') &&
        !career?.training && !career?.application && !(career?.specialistRelief?.week>=world.week) && site.pursuits?.ticket?.maker!==p.name;
    });
  }
  function reserve(world,site){
    const floor={funds:6,materials:3,food:Math.ceil(site.population/5)*2};
    const plan=root.CommonEarthSim?.buildings?.[site.buildPlan];
    if(plan)for(const key of ['funds','materials'])floor[key]+=plan[key]||0;
    const goal=world.learningGoals?.active;
    if(goal?.siteId===site.id)for(const field of [goal.aim,goal.guard]){
      if(field&&Object.hasOwn(floor,field.key))floor[field.key]=Math.max(floor[field.key],field.target??field.base??0);
    }
    for(const p of site.residents||[])if(p.promise){
      // Provision the ordinary, still-unpaid promise. A revised agreement
      // already paid its advance and keeps only the remaining obligation.
      const [key,amount]=[['food',3],['materials',2],['funds',3]][p.slot]||[];
      if(key)floor[key]+=Math.max(0,amount-(p.promise.advance?.[key]||0));
    }
    return floor;
  }
  function safeToSpend(world,site,proposal){
    const floor=reserve(world,site);
    for(const key of ['funds','materials'])if(site[key]-proposal.goods[key]<floor[key])return 'Keep '+floor[key]+' '+key+' for households, promises and pinned work before paying '+proposal.goods[key]+'.';
    if(site.food<floor.food && !['garden','wetland','fishingDock'].includes(tag(proposal.choiceId)))return 'Keep '+floor.food+' food in the pantry before spending on this project.';
    return '';
  }
  function reservedChoice(site,c){
    const key=tag(c.id);
    if(c.kind!=='build')return false;
    if(site.civicInitiatives?.history?.filter(h=>h.phase==='commissioned').length>=2)return true;
    return site.buildPlan===key || site.buildPlanPlot!=null&&site.buildPlanPlot===c.plot ||
      (site.buildings||[]).some(b=>b.kind===key||b.plot===c.plot) || (site.construction||[]).some(j=>j.kind===key||j.scope==='street'&&j.plot===c.plot) ||
      (site.buildings?.length||0)+(site.construction||[]).filter(j=>j.scope==='street'&&j.type!=='demolish').length>=7;
  }
  function need(world,site,key){
    switch(key){
      case 'garden':case 'fishingDock':case 'wetland':return [site.food<=Math.max(8,Math.ceil(site.population/5)*3)?34:13,site.food+' food serves '+site.population+' residents.'];
      case 'workshop':return [site.materials<=6||world.charter==='craft'?30:16,'Repair crews share '+site.materials+' materials, and a workshop can train apprentices.'];
      case 'hall':return [world.charter==='voice'||site.wellbeing<55?32:14,'Residents need a place for meetings and shared learning.'];
      case 'market':return [site.funds<12?27:12,'Local traders need a place to sell goods to their neighbourhood.'];
      case 'pier':return [world.routes?.some(r=>r.from===site.id||r.to===site.id)?26:2,'Freight crews need a depot for exchanges between communities.'];
      case 'apprenticeship':return [world.charter==='craft'?51:37,'The town has a working place to teach repairs and share practical knowledge.'];
      case 'exchange':return [41,'A local route and a kept promise give the district a basis for coordinated deliveries.'];
      default:return [43,'The town can test its experience against the network’s charter.'];
    }
  }
  function aptitude(p,axis){return p.aptitudes?.[axis]??40;}
  function select(world,site,choices,available){
    const evidence=root.EarthLocalProjects?.completions?.(site)||[],used=new Set((site.civicInitiatives?.history||[]).map(h=>h.evidence?.id));
    const previous=site.civicInitiatives?.history?.[0];
    let best=null;
    for(const c of choices){
      const key=tag(c.id),policy=policies[key];
      if(!policy || !c.available || reservedChoice(site,c) || previous?.choiceId===c.id && previous.phase==='withdrawn' && world.week-previous.closedWeek<12)continue;
      const relevant=evidence.find(e=>e.ownerName&&!used.has(e.id)&&policy.evidence.includes(e.kind)&&world.week-e.week<=26);
      const [urgency,why]=need(world,site,key);
      const lead=[...available].sort((a,b)=>{
        const score=p=>aptitude(p,policy.axis)+(p.traits?.initiative??50)/4+(p.id===relevant?.ownerId?22:0);
        return score(b)-score(a);
      })[0];
      const goal=world.learningGoals?.active,care=world.charter==='care'&&['garden','wetland','fishingDock'].includes(key);
      const priority=urgency+aptitude(lead,policy.axis)/5+(relevant?16:0)+(care?8:0)+(goal?.siteId===site.id&&goal.aim?.key==='food'&&care?6:0);
      if(!best||priority>best.priority)best={c,key,policy,why,relevant,lead,priority};
    }
    return best;
  }
  function refreshVotes(world,site,p,available){
    const shortage=safeToSpend(world,site,p),key=tag(p.choiceId);
    p.votes=p.votes.map((prior,i)=>{
      const voter=person(site,prior.personId),axis=policies[key].axis;
      if(!voter || available&&!available.some(v=>v.id===prior.personId))return {...prior,stance:'abstain',reason:'An existing commitment keeps me away from this meeting.'};
      if(i===0)return {...prior,stance:'support',reason:p.evidence?'The completed '+p.evidence.title+' gives us something concrete to extend.':p.reason};
      if(shortage)return {...prior,stance:'dissent',reason:shortage};
      const competing=site.food<Math.ceil(site.population/5)*3&&!['garden','fishingDock','wetland'].includes(key);
      if(i===1 && !p.evidence && (voter.traits?.patience??50)>65 && site.funds-p.goods.funds<reserve(world,site).funds+3)return {...prior,stance:'dissent',reason:'I could use the project, but would like three more funds in reserve before we sign.'};
      if(i===2 && (competing || (voter.traits?.patience??50)>65 && !p.evidence))return {...prior,stance:'dissent',reason:competing?'I would put the pantry first. Households have less than three weeks of food.':'I want a tested local example before committing money to this design.'};
      return {...prior,stance:'support',reason:i===1?p.benefit:(aptitude(voter,axis)>=55?'I can help with the '+axis+' work. ':'The quote leaves the household reserves intact. ')+(p.evidence?'We can build on '+p.evidence.ownerName+'’s experience.':'I can contribute a shift.')};
    });
  }
  function propose(world,site,choice,available,ledger){
    const {c,policy,why,lead,relevant}=choice;
    const others=available.filter(p=>p.id!==lead.id);
    const beneficiary=others.find(p=>p.id===relevant?.beneficiaryId)||[...others].sort((a,b)=>aptitude(b,policy.axis)-aptitude(a,policy.axis))[0];
    const scoreCritic=p=>{
      const founding=site.residents.some(r=>r.id===p.id);
      return (founding&&!hasTestimony(site,p.id)?100:0)+(p.traits?.patience??50);
    };
    const critic=others.filter(p=>p!==beneficiary).sort((a,b)=>scoreCritic(b)-scoreCritic(a))[0];
    const p={id:site.id+'-civic-'+(++ledger.serial),title:c.label,choiceId:c.id,kind:c.kind,plot:c.kind==='build'?c.plot:null,phase:'consultation',
      leadId:lead.id,leadName:lead.name,beneficiaryId:beneficiary.id,beneficiaryName:beneficiary.name,benefit:policy.benefit,reason:why,
      proposedWeek:world.week,decisionWeek:world.week+2,reviewWeek:world.week+2,goods:{funds:c.goods.funds||0,materials:c.goods.materials||0},
      pledged:goods(),labour:0,effort:c.effort,contributions:[],meetingWeek:0,attendees:[],votes:[lead,beneficiary,critic].map(v=>({personId:v.id,name:v.name,stance:'abstain',reason:'Considering the terms.'})),
      evidence:relevant?{id:relevant.id,title:relevant.title,ownerId:relevant.ownerId,ownerName:relevant.ownerName,week:relevant.week}:null,
      status:'Discuss the proposal before week '+(world.week+2)+'. The quoted goods remain in the treasury.'};
    refreshVotes(world,site,p);ledger.active=p;return p;
  }
  function hasTestimony(site,id){return Boolean(site.residents?.some(r=>r.id===id) && site.civicInitiatives?.testimony?.some(t=>t.personId===id));}
  function hear(world,site,p,available,ledger){
    refreshVotes(world,site,p,available);
    const attending=p.votes.filter(v=>v.stance!=='abstain');
    if(attending.length<2)return;
    p.meetingWeek=world.week;p.attendees=attending.map(v=>v.personId);
    for(const v of attending){
      if(!site.residents.some(r=>r.id===v.personId)||hasTestimony(site,v.personId))continue;
      ledger.testimony.push({personId:v.personId,week:world.week,proposalId:p.id,stance:v.stance});
    }
  }
  function contribute(world,site,p,available){
    const supporters=p.votes.filter(v=>v.stance==='support'),people=available.filter(p=>supporters.some(v=>v.personId===p.id));
    const count=id=>p.contributions.filter(c=>c.personId===id).length;
    people.sort((a,b)=>count(a.id)-count(b.id));
    for(const who of people.slice(0,2)){
      const funds=Number(p.pledged.funds<p.goods.funds),materials=Number(p.pledged.materials<p.goods.materials),labour=Number(p.labour<p.effort);
      if(!funds&&!materials&&!labour)break;
      p.contributions.push({personId:who.id,name:who.name,week:world.week,funds,materials,labour});
      p.pledged.funds+=funds;p.pledged.materials+=materials;p.labour+=labour;
    }
  }
  function finish(world,site,ledger,p,phase,status,jobId=null){
    p.phase=phase;p.closedWeek=world.week;p.status=status;p.jobId=jobId;
    ledger.history.unshift(p);
    if(ledger.history.length>6){
      // A paused public contract keeps its named crew when older stories expire.
      const oldest=ledger.history.findLastIndex(h=>h.phase!=='commissioned');
      ledger.history.splice(oldest>=0?oldest:ledger.history.length-1,1);
    }
    ledger.active=null;ledger.nextWeek=world.week+(phase==='withdrawn'?4:7);return [status];
  }
  function jobState(site,p){
    if(p.phase!=='commissioned')return p;
    if(site.buildings?.some(b=>b.id===p.jobId&&b.plot===p.plot))return {...p,phase:'built',status:p.title+' opened on lot '+(p.plot+1)+'. '+p.benefit};
    if(site.construction?.some(j=>j.id===p.jobId))return p;
    return {...p,phase:'cancelled',status:p.title+' left the construction queue before opening. The site is free for another decision.'};
  }
  function tick(world,site,hooks){
    if(!world||!site||!hooks?.options||!hooks?.enact||site.civicInitiatives?.week===world.week)return [];
    if(world.week-site.founded<3&&!site.civicInitiatives)return [];
    const d=state(site);d.week=world.week;d.revision++;
    d.history=d.history.map(h=>jobState(site,h));
    if(!d.active&&world.week<d.nextWeek || d.active&&world.week<d.active.reviewWeek)return [];
    const available=volunteers(world,site),choices=hooks.options(world,site)||[];
    if(!d.active){
      if(available.length<3)return [];
      const choice=select(world,site,choices,available);if(!choice)return [];
      const p=propose(world,site,choice,available,d);return [p.leadName+' proposed '+p.title+' for '+p.beneficiaryName+' and their neighbours. '+p.status];
    }
    const p=d.active;
    if(world.week<p.reviewWeek)return [];
    const choice=choices.find(c=>c.id===p.choiceId&&(c.kind!=='build'||c.plot===p.plot));
    if(world.week-p.proposedWeek>=14)return finish(world,site,d,p,'withdrawn',p.leadName+' withdrew '+p.title+' after the town could not agree the promised site and budget. No goods were spent.');
    hear(world,site,p,available,d);
    if(!choice?.available||reservedChoice(site,choice)||choice.effort!==p.effort||choice.goods.funds!==p.goods.funds||choice.goods.materials!==p.goods.materials){
      p.phase='blocked';p.status=choice?.reason||'The original lot, gates or price changed. The town will review the same proposal next week.';p.reviewWeek=world.week+1;return [];
    }
    const support=new Set(p.votes.filter(v=>v.stance==='support').map(v=>v.personId));
    if(p.endorsement)support.add(p.endorsement.personId);
    const reserveReason=safeToSpend(world,site,p),yes=support.size;
    if(reserveReason||yes<2||p.meetingWeek!==world.week){p.phase='blocked';p.status=reserveReason||(p.meetingWeek!==world.week?'Two available committee members must meet before a decision.':'A second citizen must support the proposal before work starts.');p.reviewWeek=world.week+1;return [];}
    p.phase='pledging';contribute(world,site,p,available);
    if(p.pledged.funds<p.goods.funds || p.pledged.materials<p.goods.materials || p.labour<p.effort){p.status='Residents authorised '+p.pledged.funds+' of '+p.goods.funds+' funds and '+p.pledged.materials+' of '+p.goods.materials+' materials; '+p.labour+' of '+p.effort+' civic shifts committed.';p.reviewWeek=world.week+1;return [];}
    const result=hooks.enact(world,site,choice,p);
    if(!result?.ok){p.phase='blocked';p.reviewWeek=world.week+1;p.status=result?.message||'Conditions changed before the contract could be signed.';return [];}
    const building=choice.kind==='build',jobId=building?(result.jobId||site.construction?.find(j=>j.kind===tag(choice.id)&&j.plot===p.plot)?.id):null;
    const outcome=p.leadName+' and the residents '+(building?'commissioned '+p.title+' on lot '+(p.plot+1):'adopted '+p.title)+' after consultation.';
    return finish(world,site,d,p,building?'commissioned':'adopted',outcome+' '+(result.message||p.benefit),jobId||null);
  }
  function view(world,site){
    const data=site?.civicInitiatives;return {active:data?.active||null,history:(data?.history||[]).map(p=>jobState(site,p)),nextWeek:data?.nextWeek||Math.max(1,(site?.founded||1)+3),revision:data?.revision||0};
  }
  function interlocutor(world,site,p){return p.leadId!==actor(world,site)?p.leadId:p.votes.find(v=>v.personId!==p.leadId)?.personId;}
  function guidance(world,site){
    const {active:p,revision}=view(world,site);if(!p)return {revision,choices:[]};
    const speaker=actor(world,site),contactId=interlocutor(world,site,p);
    return {revision,contactId,choices:['endorse','postpone'].map(id=>{
      const reason=!speaker?'Visit the community to speak with its committee.':p.responseWeek===world.week?'The committee heard you this week.':id==='endorse'&&p.endorsement?'The recorded endorsement still stands.':'';
      return {id,targetId:p.id,expectedRevision:revision,label:id==='endorse'?'Endorse the proposal':'Request two more weeks',detail:id==='endorse'?'Add your voice to the decision. The construction and budget gates still apply.':'The committee will pause its pledges and spending for two full weeks.',available:!reason,reason};
    })};
  }
  function command(world,site,personId,action,targetId,expectedRevision,proof){
    const d=site?.civicInitiatives,p=d?.active,meeting=typeof proof==='function'?proof():proof;
    if(!p||p.id!==targetId || d.revision!==expectedRevision)return {ok:false,message:'This proposal has changed. Read its current terms.'};
    const model=guidance(world,site),choice=model.choices.find(c=>c.id===action),speaker=actor(world,site);
    if(!choice?.available)return {ok:false,message:choice?.reason||'Choose a current response.'};
    if(personId!==model.contactId||meeting?.actor!==speaker||meeting?.siteId!==site.id||meeting?.target!==personId||meeting?.mode!=='walk'||![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite)||Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)return {ok:false,message:'Meet the proposal delegate on foot to discuss the public budget.'};
    const name=person(site,speaker)?.name||'The steward';p.responseWeek=world.week;d.revision++;
    if(action==='postpone'){p.phase='postponed';p.reviewWeek=Math.max(p.reviewWeek,world.week+3);p.status=name+' requested more time. The committee will review it in week '+p.reviewWeek+'.';}
    else{p.endorsement={personId:speaker,name,week:world.week};p.status=name+' endorsed the proposal. The original consultation and budget still apply.';}
    return {ok:true,changed:true,message:p.status};
  }
  function commitment(site,world,id){
    if(actor(world,site)===id)return null;
    const hearing=site.residentBallots&&!site.mandate&&site.issue?.deadline===world.week&&
      root.EarthCommunityLife?.isHome?.(world,site)&&root.EarthCommunityLife.wasDelegate(site,id)&&
      !root.EarthLegacy?.governs?.(world,site)&&root.EarthCommunityLife.present(site,id)?
      {title:'Hear “'+site.issue.title+'”',reason:'I am taking the household estimates to the assembly for today’s vote on “'+site.issue.title+'”.',venue:'hall'}:null;
    const d=site?.civicInitiatives;if(!d||d.week!==world.week)return hearing;
    const job=d.history.find(h=>h.works?.week===world.week && h.works.people.includes(id));
    if(job)return {reason:'I worked a construction shift on '+job.title+' at lot '+(job.plot+1)+'.',venue:policies[tag(job.choiceId)].venue,jobId:job.jobId,plot:job.plot};
    const p=d.active||d.history[0];if(!p)return hearing;
    const pledged=p.contributions.some(c=>c.week===world.week&&c.personId===id);
    const attending=p.meetingWeek===world.week&&p.attendees.includes(id);
    if(!attending&&!pledged && !(p.proposedWeek===world.week&&p.leadId===id))return hearing;
    return {reason:attending?'I am discussing the costs and beneficiaries of '+p.title+' with the committee.':pledged?'I committed a civic shift to '+p.title+'.':'I am presenting '+p.title+' to the town.',venue:'hall'};
  }
  function valid(site,week){
    const d=site.civicInitiatives;if(d==null)return true;
    const actorId=id=>string(id,100)&&(id==='steward'||id==='driver'||/^walker-[0-4]$/.test(id)||/^carrier-[0-8]-[0-8]$/.test(id)||site.residents?.some(r=>r.id===id));
    const cost=g=>dict(g)&&integer(g.funds,0,1000)&&integer(g.materials,0,1000);
    const member=c=>dict(c)&&actorId(c.personId)&&string(c.name,120);
    function proposal(p,active){
      if(!dict(p)||!string(p.id,160)||!string(p.title,120)||!string(p.choiceId,100)||!Object.hasOwn(policies,tag(p.choiceId))||!['research','build'].includes(p.kind)||p.choiceId.split(':')[0]!==p.kind||
        !(active?activePhases:closedPhases).includes(p.phase)||!actorId(p.leadId)||!actorId(p.beneficiaryId)||p.leadId===p.beneficiaryId||!string(p.leadName,120)||!string(p.beneficiaryName,120)||!string(p.reason,600)||!string(p.benefit,600)||!string(p.status,1800)||
        !integer(p.proposedWeek,1,week)||p.decisionWeek!==p.proposedWeek+2||!integer(p.reviewWeek,p.decisionWeek,week+16)||!cost(p.goods)||!cost(p.pledged)||!integer(p.effort,1,12)||!integer(p.labour,0,p.effort)||
        !(p.kind==='build'?integer(p.plot,0,8):p.plot===null)||!Array.isArray(p.votes)||p.votes.length!==3||new Set(p.votes.map(v=>v?.personId)).size!==3||
        !integer(p.meetingWeek,0,week)||!Array.isArray(p.attendees)||p.attendees.length>3||new Set(p.attendees).size!==p.attendees.length||!p.attendees.every(id=>p.votes.some(v=>v.personId===id))||
        !p.votes.every(v=>member(v)&&['support','dissent','abstain'].includes(v.stance)&&string(v.reason,1000))||!Array.isArray(p.contributions)||p.contributions.length>30)return false;
      if(p.evidence!=null && (!dict(p.evidence)||!string(p.evidence.id,200)||!string(p.evidence.title,200)||!actorId(p.evidence.ownerId)||!string(p.evidence.ownerName,120)||!integer(p.evidence.week,1,p.proposedWeek)))return false;
      if(p.endorsement!=null && (!member(p.endorsement)||!integer(p.endorsement.week,p.proposedWeek,week)))return false;
      if(p.responseWeek!=null&&!integer(p.responseWeek,p.proposedWeek,week))return false;
      if(p.works!=null && (active||p.kind!=='build'||!dict(p.works)||!integer(p.works.week,p.closedWeek,week)||!Array.isArray(p.works.people)||p.works.people.length<1||p.works.people.length>4||!p.works.people.every(id=>actorId(id)&&p.votes.some(v=>v.personId===id&&v.stance==='support'))||new Set(p.works.people).size!==p.works.people.length))return false;
      if(!active && (!integer(p.closedWeek,p.proposedWeek,week)||p.jobId!=null&&!string(p.jobId,160)))return false;
      const total=goods();let work=0;const counted=new Set();
      for(const c of p.contributions){const key=c?.week+'/'+c?.personId;
        if(!member(c)||!integer(c.week,p.decisionWeek,week)||!integer(c.labour,0,1)||!integer(c.funds,0,1)||!integer(c.materials,0,1)||counted.has(key))return false;
        counted.add(key);total.funds+=c.funds;total.materials+=c.materials;work+=c.labour;
      }
      return work===p.labour&&total.funds===p.pledged.funds&&total.materials===p.pledged.materials&&total.funds<=p.goods.funds&&total.materials<=p.goods.materials;
    }
    return dict(d)&&d.version===1&&integer(d.week,0,week)&&integer(d.serial,0)&&integer(d.revision,0)&&integer(d.nextWeek,0,week+16)&&
      (d.active===null||proposal(d.active,true))&&Array.isArray(d.testimony)&&d.testimony.length<=3&&new Set(d.testimony.map(t=>t?.personId)).size===d.testimony.length&&d.testimony.every(t=>dict(t)&&site.residents.some(r=>r.id===t.personId)&&integer(t.week,1,d.week)&&string(t.proposalId,160)&&['support','dissent'].includes(t.stance))&&Array.isArray(d.history)&&d.history.length<=6&&d.history.every(h=>proposal(h,false))&&new Set([d.active?.id,...d.history.map(h=>h.id)].filter(Boolean)).size===d.history.length+Number(!!d.active);
  }
  root.EarthCivicInitiatives=Object.freeze({tick,view,guidance,command,valid,commitment,hasTestimony,reserve});
})(typeof window==='undefined'?globalThis:window);
