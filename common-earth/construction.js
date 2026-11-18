/* Physical construction runs on supplied active-play time. No timer or storage access here:
   the game and the rehearsal table use the same workers, decisions and travel rules. */
(function(root){
  'use strict';

  const roles = ['food','repair','exchange'];
  const goods = {food:'food',repair:'materials',exchange:'funds'};
  const professions = {food:'Grower',repair:'Repairer',exchange:'Exchange worker'};
  const customaryTitles=['Grower','Repairer','Convenor'];
  const preferences = Object.freeze([
    {id:'auto',label:'Decide for myself'}, {id:'build',label:'Construction'},
    {id:'usual',label:'Usual occupation'}, {id:'food',label:'Food growing'},
    {id:'repair',label:'Repair work'}, {id:'exchange',label:'Trade and exchange'}
  ].map(Object.freeze));
  const streetWork = {garden:22,workshop:39,market:35,hall:31,pier:44,fishingDock:41,wetland:32};
  const dismantleWork={garden:14,workshop:23,market:21,hall:19,pier:26,fishingDock:24,wetland:18};
  const cityWork = {food:35,homes:55,yard:58,market:42,transit:62,care:39,water:41,open:20};
  const stages = {
    growing:['Preparing ground','Laying beds','Planting'],
    fishing:['Setting pilings','Laying the deck','Rigging the nets'],
    water:['Surveying ground','Shaping channels','Planting banks'],
    open:['Securing the site','Taking down structures','Restoring access'],
    dismantle:['Securing the site','Salvaging materials','Clearing the plot'],
    building:['Foundations','Framing','Fitting out']
  };
  const tradeByKind={garden:0,fishingDock:0,food:0,wetland:0,water:0,hall:2,market:2,care:2,transit:2};
  const schoolBySlot=['larder','toolbank','relay'];
  const facilities=[['garden','wetland'],['workshop'],['market','pier']];
  const pairs={tools:[0,1],meals:[0,2],room:[1,2]};
  const homeBlocks=[[1,3],[3,2],[3,3]];
  const gateways=[[12,.5],[23.5,6],[23.5,12],[18,23.5],[.5,18],[.5,6]];
  const SPEED=3.5,WORK_INTERVAL=28,REST_SECONDS=6;
  const point=(x,y)=>({x,y});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const reject=reason=>({ok:false,reason,message:reason});
  const cleanMoney=cost=>({funds:cost?.funds??0,materials:cost?.materials??0});
  const amount=(n,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
  const validPoint=p=>p&&Number.isFinite(p.x)&&p.x>=0&&p.x<=24&&Number.isFinite(p.y)&&p.y>=0&&p.y<=24;
  const doorAt=(bx,by)=>point(3+6*bx,5.04+6*by);
  const home=p=>doorAt(...(root.EarthShifts?.district?.homes?.[p.slot]||homeBlocks[p.slot]));
  const marketDoor=()=>doorAt(...(root.EarthShifts?.district?.market||[2,3]));
  const queues=site=>site?.construction||[];
  const hasPreference=id=>preferences.some(p=>p.id===id);
  const table=scope=>scope==='city'?cityWork:streetWork;

  function streetPoint(job) {
    if(job.scope==='city')return point(...gateways[job.precinct]);
    return doorAt(job.plot%3,Math.floor(job.plot/3));
  }
  function station(job,slot){
    const p=streetPoint(job),spread=(slot-1)*.45;
    if(job.scope==='city'&&[1,2,4,5].includes(job.precinct))p.y+=spread;
    else p.x+=spread;
    return p;
  }
  function fresh(person) {
    return {preference:'auto',preferredJobId:null,jobId:null,position:home(person),route:[],fatigue:0,rest:0,relief:null};
  }
  function member(site,person) {
    const members=site.workforce?.members;
    return members&&Object.hasOwn(members,person.id)?members[person.id]:fresh(person);
  }
  function prepare(site){
    site.workforce||={carryMs:0,members:Object.create(null)};
    const members=site.workforce.members;
    for(const p of site.residents)if(!Object.hasOwn(members,p.id)){
      Object.defineProperty(members,p.id,{value:fresh(p),enumerable:true,configurable:true,writable:true});
    }
    return site.workforce;
  }
  function roadAccess(p){
    const x=6*Math.round(p.x/6),y=6*Math.round(p.y/6);
    const horizontal=Math.abs(p.y-y)<=Math.abs(p.x-x);
    const kerb=horizontal?point(p.x,y):point(x,p.y);
    const k=horizontal?p.x:p.y;
    return {kerb,choices:[...new Set([6*Math.floor(k/6),6*Math.ceil(k/6)])].map(i=>horizontal?point(i,y):point(x,i))};
  }
  function roadRoute(from,to){
    if(distance(from,to)<.001)return [];
    const a=roadAccess(from),b=roadAccess(to);
    let best;
    if(a.kerb.x===b.kerb.x&&a.kerb.x%6===0 || a.kerb.y===b.kerb.y&&a.kerb.y%6===0){
      best=[a.kerb,b.kerb,to];
    }else{
      // Every candidate follows the same kerbs at its ends. Between those kerbs
      // every leg is axis-aligned. Only construct the shortest of the four paths.
      let shortest=Infinity,start,end;
      for(const i of a.choices)for(const j of b.choices){
        const length=Math.abs(a.kerb.x-i.x)+Math.abs(a.kerb.y-i.y)+
          Math.abs(i.x-j.x)+Math.abs(i.y-j.y)+Math.abs(j.x-b.kerb.x)+Math.abs(j.y-b.kerb.y);
        if(length<shortest){shortest=length;start=i;end=j;}
      }
      best=[a.kerb,start,point(start.x,end.y),end,b.kerb,to];
    }
    return best.filter((p,i)=>distance(i?best[i-1]:from,p)>.001);
  }
  function itinerary(person,worker,job){
    const target=station(job,person.slot),last=worker.route.at(-1)||worker.position;
    if(worker.jobId===job.id&&distance(last,target)<.001)return worker.route;
    return roadRoute(worker.position,target);
  }
  function travelSeconds(position,route){
    const length=route.reduce((sum,p,i)=>sum+distance(i?route[i-1]:position,p),0);
    return Math.ceil(Math.max(0,length-.00001)/SPEED);
  }

  function commitment(site,world,person) {
    if(site.agency?.actor===person.id)return ['Under your control','Working and travelling with your direction.'];
    if(site.shift?.residentId===person.id)return ['Resident companion','Spending the workday with you.'];
    const term=world?.legacy?.term;
    if(term?.siteId===site.id&&term.residentId===person.id)return ['Council steward','Serving an elected council term.','council'];
    const joint=site.neighbourWork?.active;
    if(joint?.phase==='working'){
      const partners=pairs[joint.kind]||[];
      if(partners.includes(person.slot) && !(joint.agreement==='lead'&&joint.limited&&person.slot===partners[1]))
        return ['Project partner','Keeping an agreement on a shared neighbourhood project.'];
    }
    const strategy=site.strategy,slot=person.slot,school=schoolBySlot[slot];
    if(strategy&&strategy.crew[slot]>0&&site.buildings.some(b=>facilities[slot].includes(b.kind))){
      if(strategy.studying===school)return ['Teacher','Leading a study with the neighbourhood crew.','school'];
      if(strategy.active===school)return ['School lead','Staffing the district’s operating school.','school'];
    }
    return null;
  }
  function localPriority(site,slot){
    if(slot===0&&site.food<Math.max(4,Math.ceil(site.population/5)))return 'Staying with the food crew while the pantry is low.';
    if(slot===1&&site.materials<2)return 'Recovering materials while the workshop stores are low.';
    if(slot===2&&site.funds<2)return 'Taking paid work while the treasury is low.';
    return '';
  }
  function lowSupply(site,occupation,holding=false){
    // Use separate enter/leave thresholds so covering an urgent need remains a meaningful shift.
    const threshold=occupation==='food'
      ? holding?Math.max(5,Math.ceil(site.population/3)):Math.max(2,Math.ceil(site.population/6))
      : holding?4:2;
    return site[goods[occupation]]<threshold;
  }
  function spareSupply(site,occupation,holding=false){
    const reserve=occupation==='food'?Math.max(8,Math.ceil(site.population*.6)):occupation==='repair'?5:7;
    return site[goods[occupation]]>=reserve-(holding?2:0);
  }
  function possibleRelief(site){
    const members=site.workforce?.members;
    if(members&&site.residents.some(p=>Object.hasOwn(members,p.id)&&members[p.id].relief))return true;
    return roles.some(target=>lowSupply(site,target)&&roles.some(donor=>donor!==target&&spareSupply(site,donor)));
  }
  function relieveShortage(site,workers){
    if(!possibleRelief(site))return;
    const available=workers.filter(w=>!w.job&&w.activity==='usual'&&w.state.preference==='auto');
    // One person can switch trades, only after construction and binding commitments are covered.
    for(const target of roles){
      const candidates=available.filter(w=>w.occupation!==target);
      let helper=candidates.find(w=>w.state.relief===target&&lowSupply(site,target,true)&&spareSupply(site,w.occupation,true));
      if(!helper&&lowSupply(site,target)){
        helper=candidates.filter(w=>spareSupply(site,w.occupation))
          .sort((a,b)=>b.person.slot-a.person.slot)[0];
      }
      if(!helper)continue;
      helper.occupation=target;
      helper.relief=target;
      helper.role=professions[target];
      helper.workplace=workplace(site,helper.person,target,'auto');
      helper.reason={food:'Chose to help grow food while the pantry is low.',
        repair:'Chose to recover materials while workshop stores are low.',
        exchange:'Chose paid exchange work while the treasury is low.'}[target];
      return;
    }
  }
  const doorstep=p=>({type:'resident',residentId:p.id,label:p.name+'’s doorstep',...home(p)});
  function locateFacility(site,person,kinds){
    let marketPlans;
    for(const kind of kinds){
      const options=site.buildings.filter(b=>b.kind===kind);
      if(kind==='market'&&options.length>1)marketPlans=root.CommonEarthSim?.marketPlan?.(site)?.markets;
      const building=options.find(b=>!marketPlans || kind!=='market' || marketPlans.some(m=>m.plot===b.plot&&m.base>0));
      if(building){
        const p=station({scope:'street',plot:building.plot},person.slot);
        return {type:'building',plot:building.plot,kind:building.kind,label:building.name||building.kind,...p};
      }
    }
    return null;
  }
  function dutyWorkplace(site,person,duty){
    return locateFacility(site,person,duty==='council'?['hall']:facilities[person.slot])||doorstep(person);
  }
  function workplace(site,person,occupation,preference) {
    // A settled earlier world keeps its home markers until somebody starts taking up new work.
    if(!site.workforce&&occupation===roles[person.slot])return doorstep(person);
    const convening=person.slot===2&&occupation==='exchange'&&preference!=='exchange';
    const kinds=convening?['hall']:occupation==='food'?['garden','wetland','fishingDock']:occupation==='repair'?['workshop']:['market','pier'];
    const facility=locateFacility(site,person,kinds);
    if(facility)return facility;
    if(convening)return doorstep(person);
    if(occupation==='exchange'){
      const door=marketDoor();door.x+=(person.slot-1)*.45;
      return {type:'market',label:'Market exchange',...door};
    }
    const lead=site.residents[occupation==='food'?0:1],door=doorstep(lead);
    if(lead.id!==person.id)door.x+=.45*(person.slot>lead.slot?1:-1);
    return door;
  }
  function commuteRoute(state,dest){
    if(distance(state.position,dest)<.001)return [];
    const last=state.route.at(-1);
    return state.jobId===null&&last&&distance(last,dest)<.001?state.route:roadRoute(state.position,point(dest.x,dest.y));
  }
  function occupationOf(person,state){return roles.includes(state.preference)?state.preference:roles[person.slot];}
  function allocate(site,world){
    const orders=queues(site),jobs=orders.filter(j=>!j.paused),teams=new Map(orders.map(j=>[j.id,[]]));
    const workers=site.residents.map(person=>{
      const state=member(site,person),duty=commitment(site,world,person),pref=state.preference;
      const fixed=roles.includes(pref);
      const heldJob=pref==='build'&&state.preferredJobId?orders.find(j=>j.id===state.preferredJobId&&j.paused):null;
      const need=pref==='auto'?localPriority(site,person.slot):'';
      const occupation=occupationOf(person,state),physicalDuty=duty?.[2]||null;
      const place=physicalDuty?dutyWorkplace(site,person,physicalDuty):workplace(site,person,occupation,pref);
      const usualRole=person.role||customaryTitles[person.slot];
      const changedProfession=fixed&&(pref!==roles[person.slot]||pref==='exchange');
      let activity='usual',role=changedProfession?professions[occupation]:usualRole;
      let reason=fixed?'Chose this occupation.':pref==='usual'?'Keeping their usual occupation.':'Working their usual occupation.';
      if(need)reason=need;
      if(heldJob)reason='Keeping their usual work until '+heldJob.name+' resumes.';
      if(duty){
        activity='busy';[role,reason]=duty;
        if(physicalDuty==='council'&&place.type==='resident')reason='Chairing the council from their doorstep while no assembly hall is open.';
      }
      else if(state.rest){activity='resting';role='On a break';reason='Resting after a building shift ('+state.rest+' s).';}
      return {person,state,occupation,usualRole,physicalDuty,heldJob,workplace:place,activity,role,reason,need,candidate:!heldJob&&!duty&&!state.rest&&(pref==='auto'||pref==='build'),job:null,route:[]};
    });
    function assign(w,j,reason){
      const path=itinerary(w.person,w.state,j);
      w.job=j;w.route=path;w.activity=path.length?'travelling':'building';w.role=j.kind==='dismantle'?'Dismantling crew':'Builder';w.reason=reason;
      teams.get(j.id).push(w);
    }
    // A request for a particular site wins over an invitation to any site. Social commitments still win.
    for(const w of workers.filter(w=>w.candidate&&w.state.preference==='build'&&w.state.preferredJobId)){
      const j=jobs.find(j=>j.id===w.state.preferredJobId);
      if(j)assign(w,j,'Accepted an invitation to this site.');
    }
    function score(w,j){
      return (w.state.jobId===j.id?100:0) + (w.person.slot===(tradeByKind[j.kind]??1)?30:0)
        - (w.need?150:0) - travelSeconds(w.state.position,itinerary(w.person,w.state,j))/4;
    }
    for(const j of jobs){
      if(teams.get(j.id).length)continue;
      const candidates=workers.filter(w=>!w.job&&w.candidate)
        .sort((a,b)=>score(b,j)-score(a,j)||a.person.slot-b.person.slot);
      const w=candidates[0];
      // One volunteer gets a new project moving. Other residents protect a scarce essential supply.
      if(!w || w.need&&[...teams.values()].some(team=>team.length))continue;
      assign(w,j,w.state.preference==='build'?'Volunteered for the construction crew.':
        w.need?'Covering the first building shift while supplies are low.':
        w.person.slot===(tradeByKind[j.kind]??1)?'Volunteered for work that fits their trade.':'Volunteered to put this project into use.');
    }
    for(const w of workers.filter(w=>!w.job&&w.candidate&&w.state.preference==='build')){
      const j=jobs.slice().sort((a,b)=>teams.get(a.id).length-teams.get(b.id).length||score(w,b)-score(w,a))[0];
      if(j)assign(w,j,'Joined the crew to help finish sooner.');
      else w.reason='Ready to build when a site opens.';
    }
    relieveShortage(site,workers);
    for(const w of workers){
      if(w.physicalDuty){w.route=commuteRoute(w.state,w.workplace);continue;}
      if(w.job || w.activity==='busy')continue;
      if(w.activity==='resting'){
        if(w.state.preference==='auto'||w.state.preference==='build'){
          const place=jobs.find(j=>j.id===(w.state.preferredJobId||w.state.jobId));
          if(place){w.restJob=place;teams.get(place.id).push(w);}
        }
        continue;
      }
      const dest=w.workplace,atHome=dest.type==='resident'&&dest.residentId===w.person.id;
      if(distance(w.state.position,dest)>.001){
        w.activity=atHome?'returning':'commuting';
        if(!w.relief&&!w.heldJob)w.reason=atHome?'Walking back to their doorstep.':'Going to '+dest.label+' for work.';
        w.route=commuteRoute(w.state,dest);
      }else if(!atHome||roles.includes(w.state.preference)){
        w.activity='working';
        if(!w.need&&!w.relief&&!w.heldJob)w.reason='Working at '+dest.label+'.';
      }
    }
    return {workers,teams};
  }

  function stageNames(kind){
    if(kind==='garden'||kind==='food')return stages.growing;
    if(kind==='fishingDock')return stages.fishing;
    if(kind==='wetland'||kind==='water')return stages.water;
    if(kind==='dismantle')return stages.dismantle;
    return kind==='open'?stages.open:stages.building;
  }
  function weeklyDelta(w,prospective=false){
    const delta={food:0,materials:0,funds:0},customaryGood=goods[roles[w.person.slot]];
    if(w.job||w.restJob||prospective&&!w.heldJob&&w.state.preference==='build'&&w.state.preferredJobId){
      // A committed crew member is away from their ordinary weekly production from departure until release.
      delta[customaryGood]--;
    }else if((prospective||w.activity==='usual'||w.activity==='working')&&(w.relief||roles.includes(w.state.preference))){
      delta[customaryGood]--;
      delta[goods[w.occupation]]++;
    }
    return delta;
  }
  function workforceDelta(workers){
    const delta={food:0,materials:0,funds:0};
    for(const w of workers){
      const person=weeklyDelta(w);
      delta.food+=person.food;delta.materials+=person.materials;delta.funds+=person.funds;
    }
    return delta;
  }
  function weeklyAdjustment(site,world){
    const delta={food:0,materials:0,funds:0},building=queues(site).length>0;
    if(!site.workforce&&!building)return delta;
    if(building||possibleRelief(site))return workforceDelta(allocate(site,world).workers);
    for(const p of site.residents){
      const s=member(site,p),pref=s.preference;
      if(!roles.includes(pref)||pref===roles[p.slot]||s.rest||commitment(site,world,p))continue;
      if(distance(s.position,workplace(site,p,pref,pref))>.001)continue;
      delta[goods[roles[p.slot]]]--;
      delta[goods[pref]]++;
    }
    return delta;
  }
  function jobView(job,team){
    const progress=job.work/job.total,stageIndex=progress<.28?0:progress<.73?1:2;
    const arrivals=team.map(w=>travelSeconds(w.state.position,w.restJob?itinerary(w.person,w.state,job):w.route));
    // Estimate from assigned workers' individual arrival times and their regular breaks.
    let etaSeconds=null;
    if(team.length){
      let remaining=job.total-job.work,t=0;
      const fatigue=team.map(w=>w.state.fatigue),rest=team.map(w=>w.state.rest);
      while(remaining>0){
        t++;
        for(let i=0;i<team.length;i++){
          if(t<=arrivals[i])continue;
          if(rest[i]){rest[i]--;continue;}
          remaining--;if(++fatigue[i]>=WORK_INTERVAL){fatigue[i]=0;rest[i]=REST_SECONDS;}
        }
      }
      etaSeconds=t;
    }
    const active=team.filter(w=>w.activity==='building');
    const workingStatus=job.kind==='dismantle'?'Dismantling underway':'Under construction';
    const status=job.paused?'Paused · work kept':!team.length?'Awaiting a builder':active.length?workingStatus:team.some(w=>w.activity==='travelling')?'Crew travelling':'Crew resting';
    return {...job,...(job.original?{original:copyBuilding(job.original)}:{}),paid:{...job.paid},partners:[...(job.partners||[])],progress,stageIndex,stage:stageNames(job.kind)[stageIndex],status,
      workers:team.map(w=>w.person.id),workerNames:team.map(w=>w.person.name),
      activeWorkerIds:active.map(w=>w.person.id),workRate:active.length,etaSeconds};
  }
  function view(site,world){
    if(!site)return {jobs:[],workers:[],preferences};
    const {workers,teams}=allocate(site,world);
    return {preferences,jobs:queues(site).map(j=>jobView(j,teams.get(j.id))),workers:workers.map(w=>({
      residentId:w.person.id,name:w.person.name,slot:w.person.slot,role:w.role,reason:w.reason,preference:w.state.preference,
      occupation:w.occupation,usualRole:w.usualRole,workplace:w.workplace,physicalDuty:w.physicalDuty,relief:w.relief||null,
      preferredJobId:w.state.preferredJobId,jobId:(w.job||w.restJob)?.id||null,area:(w.job||w.restJob)?.scope||null,activity:w.activity,
      x:w.state.position.x,y:w.state.position.y,travelling:Boolean(w.physicalDuty&&w.route.length)||['travelling','returning','commuting'].includes(w.activity),
      travelLeft:travelSeconds(w.state.position,w.route),restLeft:w.state.rest,weeklyDelta:weeklyDelta(w),preferenceDelta:weeklyDelta(w,true)
    }))};
  }
  function workerRole(site,world,id){return view(site,world).workers.find(w=>w.residentId===id)||null;}
  const identifier=id=>typeof id==='string'&&id.length>0&&id.length<=512;
  const validPartners=(site,ids)=>Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>site.residents.some(p=>p.id===id));
  const copyBuilding=building=>JSON.parse(JSON.stringify(building));
  const reservedIds=job=>job.original?[job.id,job.original.id]:[job.id];
  function validDismantle(site,j){
    const b=j.original;
    if(!b||typeof b!=='object'||Array.isArray(b)||!Object.hasOwn(dismantleWork,b.kind)||
      !identifier(b.id)||b.id===j.id||b.plot!==j.plot||!identifier(b.name)||
      b.partners!=null&&!validPartners(site,b.partners))return false;
    const materials=root.CommonEarthSim?.buildings?.[b.kind]?.materials??(b.kind==='wetland'?4:3);
    return j.total===dismantleWork[b.kind]&&Object.keys(j.paid).length===2&&j.paid.funds===0&&j.paid.materials===0&&
      j.recovered===Math.max(1,Math.floor(materials/2));
  }
  function validJob(site,j){
    if(!j||!identifier(j.id)||!identifier(j.name)||!['city','street'].includes(j.scope))return false;
    if(Object.hasOwn(j,'paused')&&typeof j.paused!=='boolean')return false;
    const dismantling=j.scope==='street'&&j.kind==='dismantle',cost=j.paid;
    if(!cost||!amount(cost.funds)||!amount(cost.materials)||!amount(j.total,1,3600)||!amount(j.work,0,j.total-1))return false;
    if(j.scope==='street'?!amount(j.plot,0,8):!amount(j.precinct,0,5))return false;
    if(dismantling){if(!validDismantle(site,j))return false;}
    else if(!Object.hasOwn(table(j.scope),j.kind)||Object.hasOwn(j,'original')||Object.hasOwn(j,'recovered'))return false;
    return j.partners===undefined||validPartners(site,j.partners);
  }
  function valid(site){
    if(site.construction!=null){
      if(!Array.isArray(site.construction)||site.construction.length>15)return false;
      const ids=new Set(site.buildings.map(b=>b.id)),lots=new Set();
      for(const j of site.construction){
        if(!validJob(site,j))return false;
        const lot=j.scope+':'+(j.scope==='city'?j.precinct:j.plot);
        if(lots.has(lot)||j.scope==='street'&&site.buildings.some(b=>b.plot===j.plot))return false;
        for(const id of reservedIds(j)){if(ids.has(id))return false;ids.add(id);}
        lots.add(lot);
      }
    }
    const workforce=site.workforce;
    if(workforce==null)return true;
    if(!amount(workforce.carryMs,0,999)||!workforce.members||typeof workforce.members!=='object'||Array.isArray(workforce.members))return false;
    const ids=new Set(queues(site).map(j=>j.id));
    return Object.entries(workforce.members).every(([id,s])=>site.residents.some(p=>p.id===id)&&s&&hasPreference(s.preference)&&
      (s.preferredJobId===null || s.preference==='build'&&ids.has(s.preferredJobId))&&(s.jobId===null||ids.has(s.jobId))&&
      (s.relief==null||s.preference==='auto'&&roles.includes(s.relief))&&validPoint(s.position)&&Array.isArray(s.route)&&s.route.length<=8&&s.route.every(validPoint)&&
      amount(s.fatigue,0,WORK_INTERVAL-1)&&amount(s.rest,0,REST_SECONDS));
  }
  function makeJob(site,spec){
    const scope=spec.scope||'street',dismantling=scope==='street'&&spec.kind==='dismantle';
    const total=dismantling?dismantleWork[spec.original?.kind]:table(scope)[spec.kind],fraction=spec.workFraction??0;
    if(!Number.isFinite(fraction)||fraction<0||fraction>=1)return reject('Invalid saved construction progress.');
    const j={id:spec.id,scope,kind:spec.kind,name:spec.name||spec.kind,paid:cleanMoney(spec.paid),
      ...(scope==='city'?{precinct:spec.precinct}:{plot:spec.plot}),work:Math.floor(total*fraction),total};
    if(Object.hasOwn(spec,'paused'))j.paused=spec.paused;
    if(dismantling){
      if(!spec.original)return reject('Choose the existing building to dismantle.');
      if(spec.paid&&Object.keys(spec.paid).some(k=>k!=='funds'&&k!=='materials'))return reject('Dismantling does not charge additional goods.');
      try{j.original=copyBuilding(spec.original);}catch{return reject('The building record could not be preserved.');}
      j.recovered=spec.recovered;
    }else if(Object.hasOwn(spec,'original')||Object.hasOwn(spec,'recovered'))return reject('Only a dismantling project can recover building materials.');
    if(spec.partners!==undefined){
      if(!Array.isArray(spec.partners))return reject('Choose residents from this town.');
      j.partners=[...spec.partners];
    }
    if(!validJob(site,j))return reject('Choose a valid project and site.');
    const ids=reservedIds(j);
    if(queues(site).some(k=>reservedIds(k).some(id=>ids.includes(id)) || k.scope===scope&&(scope==='city'?k.precinct===j.precinct:k.plot===j.plot)))return reject('This site already has a project.');
    if(site.buildings.some(b=>ids.includes(b.id)||scope==='street'&&b.plot===j.plot))return reject('This plot is already occupied.');
    return {ok:true,job:j};
  }
  function start(site,world,spec){
    const result=makeJob(site,spec);
    if(!result.ok)return result;
    prepare(site);(site.construction||=[]).push(result.job);
    return {ok:true,message:result.job.name+' commissioned.',job:result.job};
  }
  function preview(site,world,spec,beforeSite=site){
    const result=makeJob(site,spec);
    if(!result.ok)return result;
    const projected={...site,construction:[...queues(site),result.job]},allocation=allocate(projected,world);
    const job=jobView(result.job,allocation.teams.get(result.job.id));
    const before=weeklyAdjustment(beforeSite,world),after=workforceDelta(allocation.workers);
    job.weeklyDelta={food:after.food-before.food,materials:after.materials-before.materials,funds:after.funds-before.funds};
    return {ok:true,reason:'',job};
  }
  function detach(site,job){
    for(const w of Object.values(site.workforce?.members||{})){
      if(w.jobId===job.id){w.jobId=null;w.route=[];}
      if(w.preferredJobId===job.id)w.preferredJobId=null;
    }
  }
  function cancel(site,id){
    const list=queues(site),index=list.findIndex(j=>j.id===id);
    if(index<0)return null;
    const [job]=list.splice(index,1);detach(site,job);
    return job;
  }
  function setPaused(site,world,jobId,paused){
    const job=queues(site).find(j=>j.id===jobId);
    if(!job||typeof paused!=='boolean')return reject('Choose an active worksite to pause or resume.');
    if(Boolean(job.paused)===paused)return {ok:true,unchanged:true,message:job.name+(paused?' is already paused.':' is already open for work.')};
    job.paused=paused;
    return {ok:true,message:paused?job.name+' paused. Completed work and invitations are kept.':job.name+' resumed. Available crew can return.'};
  }
  function setPreference(site,world,id,preference,jobId=null){
    if(!site?.residents.some(p=>p.id===id)||!hasPreference(preference))return reject('Choose a resident and an available occupation.');
    if(jobId!==null&&(preference!=='build'||!queues(site).some(j=>j.id===jobId)))return reject('This construction site is no longer available.');
    if(jobId!==null&&queues(site).some(j=>j.id===jobId&&j.paused))return reject('Resume this worksite before assigning a crew.');
    const m=prepare(site).members[id];
    m.preference=preference;m.preferredJobId=jobId;if(preference!=='auto')m.relief=null;
    const who=site.residents.find(p=>p.id===id),work=workerRole(site,world,id);
    let message=who.name+' · '+work.role+'. '+work.reason;
    if(work.activity==='busy'||work.activity==='resting'){
      const job=jobId&&queues(site).find(j=>j.id===jobId);
      const plan=job?'join the crew at '+job.name:preference==='build'?'look for construction work':
        preference==='auto'?'choose their next work':preference==='usual'?'return to their usual occupation':
        'take up '+preferences.find(p=>p.id===preference).label.toLowerCase();
      message+=' When free, '+who.name+' will '+plan+'.';
    }
    return {ok:true,message};
  }
  function releaseFromShift(site,shift,actor){
    const person=site?.residents.find(p=>p.id===shift?.residentId);
    if(!person)return false;
    let location=validPoint(actor)&&(actor.residentId==null||actor.residentId===person.id)?point(actor.x,actor.y):null;
    if(!location){
      // A cancelled meeting with no travel began wherever the person was already working.
      if(!shift.time&&!shift.stopId&&!shift.history?.length)return false;
      const venue=shift.at;
      if(venue?.type==='market')location=marketDoor();
      else if(venue?.type==='building'&&amount(venue.plot,0,8))location=streetPoint({scope:'street',plot:venue.plot});
      else if(venue?.type==='resident'){
        const host=site.residents.find(p=>p.id===venue.residentId);
        if(host)location=home(host);
      }
      if(!location)return false;
    }
    const state=prepare(site).members[person.id];
    state.position=location;state.route=[];state.jobId=null;
    return true;
  }
  function stepWalk(state){
    let left=SPEED;
    while(left>0&&state.route.length){
      const p=state.route[0],dist=distance(state.position,p);
      if(dist<=left){state.position=p;state.route.shift();left-=dist;}
      else{
        const f=left/dist;state.position=point(state.position.x+(p.x-state.position.x)*f,state.position.y+(p.y-state.position.y)*f);
        break;
      }
    }
  }
  function pendingMovement(site,world){
    const members=site.workforce?.members;
    if(!members&&!site.strategy?.active&&!site.strategy?.studying&&world?.legacy?.term?.siteId!==site.id)return false;
    return site.residents.some(p=>{
      const s=members&&Object.hasOwn(members,p.id)?members[p.id]:fresh(p);
      if(s.jobId||s.rest||s.fatigue||s.route.length)return true;
      const duty=commitment(site,world,p);
      if(duty)return Boolean(duty[2]&&distance(s.position,dutyWorkplace(site,p,duty[2]))>.001);
      return Boolean(members&&distance(s.position,workplace(site,p,occupationOf(p,s),s.preference))>.001);
    });
  }
  // Most idle towns can answer without assigning people. When a roster decision is
  // necessary, return those exact workers for the same tick to avoid deciding twice.
  function timeDemand(site,world){
    if(!site)return false;
    if(possibleRelief(site)){
      const {workers}=allocate(site,world);
      const moving=workers.some(w=>w.job||w.route.length||w.state.jobId||w.state.route.length||
        w.state.rest||w.state.fatigue||(w.state.relief||null)!==(w.relief||null));
      return moving&&workers;
    }
    if(pendingMovement(site,world))return true;
    if(!queues(site).length)return false;
    const {workers}=allocate(site,world);
    return workers.some(w=>w.job)&&workers;
  }
  function needsTime(site,world){return Boolean(timeDemand(site,world));}
  function advance(site,world,seconds,onFinished){
    if(!Number.isFinite(seconds)||seconds<0||seconds>3600)return {ok:false,changed:false,completed:[],reason:'Advance up to one hour of active play at a time.'};
    const completed=[];
    const demand=seconds&&timeDemand(site,world);
    if(!demand)return {ok:true,changed:false,completed};
    const wf=prepare(site),oldCarry=wf.carryMs,ms=oldCarry+Math.round(seconds*1000);
    if(ms===oldCarry)return {ok:true,changed:false,completed};
    wf.carryMs=ms%1000;
    let changed=oldCarry!==wf.carryMs;
    // New and older partial saves acquire real members in prepare. Discard any
    // provisional workers from before that point, and reconsider roles every later second.
    const first=Array.isArray(demand)&&demand.every(w=>wf.members[w.person.id]===w.state)?demand:null;
    for(let i=0;i<Math.floor(ms/1000);i++){
      const workers=(i===0&&first)||allocate(site,world).workers;
      let stepped=false;
      for(const w of workers){
        const state=w.state;
        if((state.relief||null)!==(w.relief||null)){state.relief=w.relief||null;stepped=true;}
        if(!w.job){
          if(!w.restJob){
            if(state.jobId||state.route.length)stepped=true;
            state.jobId=null;state.route=w.route;
          }
          if(w.activity==='returning'||w.activity==='commuting'||w.physicalDuty&&state.route.length){stepWalk(state);stepped=true;}
          if(state.rest){state.rest--;stepped=true;}
          else if(state.fatigue){state.fatigue=Math.max(0,state.fatigue-3);stepped=true;}
          continue;
        }
        stepped=true;state.jobId=w.job.id;state.route=w.route;
        if(state.route.length){stepWalk(state);continue;}
        if(w.job.work===w.job.total)continue;
        w.job.work++;
        if(++state.fatigue===WORK_INTERVAL){state.fatigue=0;state.rest=REST_SECONDS;}
      }
      for(const j of queues(site).filter(j=>j.work===j.total)){
        const opened=cancel(site,j.id);
        if(opened){completed.push(opened);onFinished?.(opened);}
      }
      if(!stepped){if(wf.carryMs)wf.carryMs=0;break;}
      changed=true;
    }
    return {ok:true,changed,completed};
  }
  root.EarthConstruction=Object.freeze({start,advance,preview,view,valid,cancel,setPreference,setPaused,workerRole,streetPoint,releaseFromShift,weeklyAdjustment,needsTime});
})(typeof window==='undefined'?globalThis:window);
