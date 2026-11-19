/* Small housing contracts complement the larger precinct vote. The public
   store, the plot and the worker's purse are three separate accounts. */
(function(root){
  'use strict';
  const boards=3,wage=3,beds=2;
  const source={x:21.1,y:17.46,label:'Public building store'};
  const paper=site=>site.civicLand||={homes:[],delay:'',opened:0};
  function plot(n){return {x:-2.1-(n%6)*2.3,y:-2.1-Math.floor(n/6)*2.35,label:'Council lot C'+(n+1)};}
  function foundation(site){return site.communityLife?.foundingPlaces??18;}
  function places(site){return beds*(site.civicLand?.homes.length||0);}
  function need(world,site){
    const reserved=site.housing?.reservations?.length||0;
    if(!site.housing?.hardship?.length&&foundation(site)-reserved>site.population)return null;
    const capacity=root.EarthCityModel.housingCapacity(site);
    const prior=site.housing?.hardship?.length||0;
    if(!prior&&!(site.housing?.reservations?.length)&&site.population+1<capacity&&!site.privateHomes?.length)return null;
    const directory=root.EarthHousing.view(world,site);
    if(directory.unmet)return {reason:directory.unmet+(directory.unmet===1?' resident lacks':' residents lack')+' a dwelling with residential rights.',person:directory.namedMissing[0]};
    const recruiting=!!site.communityLife?.townCentre?.arrivals?.length||!!site.growth?.history?.some(h=>h.wages>0);
    return directory.open<1&&recruiting?{reason:'The last available housing share is occupied and local employers are paying for labour.'}:null;
  }
  function work(site,id){
    const c=site.civicLand?.project;
    if(!c||!c.worker||id&&id!==c.worker)return null;
    const carry=c.phase==='delivery',to={...plot(c.plot)};to.y+=.72;
    const action=carry?'Deliver the reserved building materials':'Build the council cottage';
    return {id:'cottage-'+c.plot,kind:'build',phase:c.phase,ownerId:c.worker,workerName:c.workerName,
      activity:'build',name:'Council cottage C'+(c.plot+1),action,reason:c.reason,step:carry?1:2,steps:2,
      orderGood:'materials',resource:'materials',resourceName:'building materials',amount:boards,
      venue:'workshop',payer:'Council housing escrow',price:1,source:source.label,destination:to.label,tool:carry?'handcart':'hammer',
      from:carry?source:to,to,point:to,startedAt:c.at,travelMs:c.travelMs,workMs:carry?1500:4000};
  }
  function settle(world,site,{people,busy,played,floor,at,closeWeek,rows,events}){
    if(!site.communityLife?.cluster||!root.EarthHousing)return 0;
    let land=site.civicLand,c=land?.project;
    const g=site.growth;
    if(!c){
      const shortage=need(world,site);
      if(!shortage){if(land)land.delay='';return 0;}
      land=paper(site);
      if(land.homes.length>=48){land.delay='The serviced cottage lots are occupied. The council can propose a housing precinct.';return 0;}
      if(site.city?.precincts?.some(p=>p.target==='homes')){land.delay='A housing precinct already has a crew and building supplies.';return 0;}
      if(site.materials-floor.materials<boards||site.funds-floor.funds<wage){
        land.delay=shortage.reason+' The building store needs '+boards+' uncommitted materials and the treasury needs '+wage+' uncommitted funds.';return 0;
      }
      const proposer=root.EarthCommunityLife.hostFor(site);
      c={plot:land.homes.length,proposer:proposer.name,proposerId:proposer.id,reason:shortage.reason,resident:shortage.person?.key||null,
        phase:'delivery',built:0,escrow:wage,worker:null,at,travelMs:0,started:world.week,round:g.round};
    }
    const contracts=g.households;
    const free=people.filter(p=>!busy.has(p.id)&&p.id!==played&&!contracts.find(h=>h.owner===p.identityKey)?.build&&
      !g.road?.ids?.includes(p.id)&&!root.EarthHousing.workHold(site,p.id));
    const incumbent=free.find(p=>p.id===c.worker&&p.identityKey===c.workerKey);
    const skill=p=>site.careers?.[p.id]?.skills?.craft??p.aptitudes.craft;
    const worker=incumbent||free.filter(p=>c.phase==='delivery'||skill(p)>=34).sort((a,b)=>skill(b)-skill(a)||a.id.localeCompare(b.id))[0];
    if(!worker){
      land.delay='A funded '+(c.phase==='delivery'?'delivery shift':'building shift')+' needs a free resident'+(c.phase==='build'?' with 34 craft skill.':'.');
      if(land.project&&!incumbent)c.worker=null;
      return 0;
    }
    const h=contracts.find(h=>h.owner===worker.identityKey);if(!h)return 0;
    const book=(from,to,good,n,why)=>root.EarthDistrictOrders.record(rows,from,to,good,n,worker.id,'cottage-'+c.plot,why);
    if(!land.project){
      site.materials-=boards;site.funds-=wage;land.project=c;land.opened++;
      book('Public building store','Reserved loading bay','materials',boards,'Supplies committed to the cottage');
      book('Community treasury','Council housing escrow','funds',wage,'Three paid shifts authorised');
      events.push(c.proposer+' commissioned a two-place cottage on lot C'+(c.plot+1)+'. '+c.reason);
    }
    land.delay='';busy.add(worker.id);
    h.activity='commitment';
    if(!incumbent){
      c.worker=worker.id;c.workerKey=worker.identityKey;c.workerName=worker.name;
      c.at=at;c.travelMs=c.phase==='delivery'?root.EarthDistrictOrders.movement(site,source,plot(c.plot)):0;
      h.last=worker.name+' agreed to '+work(site).action.toLowerCase()+' on '+plot(c.plot).label+'.';
      return 0;
    }
    const job=work(site);
    if(!closeWeek&&at>=c.at&&at<c.at+c.travelMs+job.workMs)return 0;
    const why=worker.name+' earned one fund for '+(c.phase==='delivery'?'delivering the reserved materials':'building the cottage')+' on lot C'+(c.plot+1)+'.';
    if(!root.EarthPurses.productionReceipt(world,site,worker.id,1,why)){land.delay='The worker’s account cannot receive the contracted wage.';return 0;}
    book('Council housing escrow',worker.name,'funds',1,why);c.escrow--;h.last=why;h.points++;g.points++;
    h.lastPoint=job.to;c.at=at;c.travelMs=0;
    if(c.phase==='delivery'){book('Reserved loading bay',plot(c.plot).label,'materials',boards,'Materials delivered to the worksite');c.phase='build';if(skill(worker)<34)c.worker=null;return 1;}
    c.built++;
    if(c.built<2)return 1;
    book(plot(c.plot).label,'Completed cottage','materials',boards,'Three materials incorporated in habitable housing');
    const house={plot:c.plot,places:beds,completed:world.week,builder:worker.name,workerId:worker.id,proposer:c.proposer,proposerId:c.proposerId,reason:c.reason};
    land.homes.push(house);delete land.project;
    if(c.resident){
      const person=root.EarthHousing.view(world,site).rows.find(r=>r.key===c.resident&&!r.uncounted);
      if(person)root.EarthHousing.grant(world,site,person.id,{dwelling:'cottage-'+c.plot});
    }
    root.EarthHousing.sync(world,site);
    const report=worker.name+' opened the two-place cottage on '+plot(c.plot).label+'.';
    events.push(report);root.EarthCommunityLife.recordWeek(site,world.week,report);
    return 1;
  }
  function valid(site,week){
    const n=site.communityLife?.foundingPlaces;
    if(n!=null&&(!Number.isSafeInteger(n)||n<1||n>18))return false;
    const l=site.civicLand;if(l==null)return true;
    const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
    const text=v=>typeof v==='string'&&v.length>0&&v.length<=700;
    if(!Array.isArray(l.homes)||l.homes.length>48||typeof l.delay!=='string'||l.delay.length>800||l.opened!==l.homes.length+Number(!!l.project))return false;
    if(!l.homes.every((h,i)=>h&&h.plot===i&&h.places===beds&&int(h.completed,1,week)&&text(h.builder)&&text(h.proposer)&&text(h.reason)&&text(h.workerId)))return false;
    const c=l.project;
    return !c||c.plot===l.homes.length&&int(c.started,1,week)&&int(c.round,0,site.growth?.round)&&text(c.proposer)&&text(c.reason)&&
      (c.resident==null||text(c.resident))&&int(c.at,0,Number.MAX_SAFE_INTEGER)&&int(c.travelMs,0,1e7)&&
      (c.worker==null||text(c.worker)&&text(c.workerKey)&&text(c.workerName))&&
      (c.phase==='delivery'?c.built===0&&c.escrow===3:c.phase==='build'&&int(c.built,0,1)&&c.escrow===2-c.built);
  }
  root.EarthCouncilHomes=Object.freeze({foundation,places,plot,work,settle,valid});
})(globalThis);
