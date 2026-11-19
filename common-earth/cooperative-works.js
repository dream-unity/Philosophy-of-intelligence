/* Households supply customers and labour. A cooperative occupies an ordinary
   street plot, so the planner, markets and subsequent owners see the same asset. */
(function(root){
  'use strict';
  const cost={funds:3,materials:4},store={x:21.1,y:17.46,label:'Public building store'};
  const title=k=>k==='market'?'Cooperative provisions store':'Materials workshop';
  const centre=plot=>({x:3+plot%3*6,y:3+Math.floor(plot/3)*6,label:'Street lot '+(plot+1)});
  const id=p=>p.identityKey||p.id;
  const point=p=>({...centre(p.plot),y:centre(p.plot).y+1.75});
  function work(site,person){
    const p=site.cooperative?.project;
    if(!p?.worker||person&&p.worker!==person)return null;
    const to=point(p),carry=p.stage===0;
    return {id:p.id,kind:'build',phase:'build',activity:'build',ownerId:p.worker,workerName:p.workerName,name:title(p.kind),
      action:carry?'Deliver reserved materials':'Build '+title(p.kind).toLowerCase(),reason:p.reason,step:p.stage+1,steps:3,
      startedAt:p.at,travelMs:carry?p.travelMs:0,workMs:carry?1800:4000,from:carry?store:to,to,point:to,
      resource:'materials',resourceName:'building materials',orderGood:'materials',amount:4,venue:'workshop',
      payer:'Cooperative wage escrow',price:1,source:store.label,destination:to.label,tool:carry?'handcart':'hammer'};
  }
  function trade(world,s,b,free,floor,rows,busy,events,byOwner){
    const market=b.open.find(m=>m.kind==='market'&&s.buildings.some(v=>v.id===m.id));
    if(!market||s.growth.round%3!==0||s.food<=floor.food||free.length<2)return;
    const customers=free.filter(p=>(s.purses?.people[p.id]?.balance||0)>=3);
    const buyer=customers.sort((a,b)=>b.traits.initiative-a.traits.initiative)[0];
    const clerk=free.filter(p=>p!==buyer).sort((a,b)=>b.aptitudes.communication-a.aptitudes.communication)[0];
    if(!buyer||!clerk||s.funds>=Number.MAX_SAFE_INTEGER)return;
    const clerkPurse=s.purses?.people[clerk.id];
    if((clerkPurse?.balance||0)>=Number.MAX_SAFE_INTEGER||(clerkPurse?.productionIncome||0)>=Number.MAX_SAFE_INTEGER)return;
    if(!root.EarthPurses.productionReceipt(world,s,buyer.id,-2,'Collected a food parcel from the cooperative.'))return;
    if(!root.EarthPurses.productionReceipt(world,s,clerk.id,1,'Earned a cooperative retail wage from '+buyer.name+'’s purchase.')){
      root.EarthPurses.productionReceipt(world,s,buyer.id,2,'Refund for an unfilled cooperative order.');return;
    }
    const customer=byOwner.get(id(buyer)),worker=byOwner.get(id(clerk));
    s.food--;s.funds++;customer.pantry=(customer.pantry||0)+1;
    customer.last='Bought provisions at street lot '+(market.plot+1)+'.';worker.last='Sold provisions to '+buyer.name+'.';
    busy.add(clerk.id);busy.add(buyer.id);customer.activity='purchase';worker.activity='shop';
    customer.lastPoint=worker.lastPoint=point(market);
    const record=root.EarthDistrictOrders.record;
    record(rows,'Public pantry',buyer.name,'food',1,buyer.id,market.id,'Provisions collected');
    record(rows,buyer.name,clerk.name,'funds',1,clerk.id,market.id,'Retail wage');
    record(rows,buyer.name,'Community treasury','funds',1,buyer.id,market.id,'Cooperative sale');
    market.sales++;market.lastSale={week:world.week,clerk:clerk.id,buyer:buyer.id,clerkName:clerk.name,buyerName:buyer.name};
    events.push(clerk.name+' sold provisions to '+buyer.name+' at the cooperative. One fund paid the clerk and one returned to the treasury.');
  }
  function settle(world,s,{people,byOwner,busy,played,floor,at,closeWeek,rows,events}){
    if(!s.communityLife?.cluster)return 0;
    let b=s.cooperative;
    if(!b&&!s.civicLand?.homes.length)return 0;
    const remaining=people.filter(p=>!busy.has(p.id)&&p.id!==played&&!s.growth.road?.ids?.includes(p.id)&&
      !root.EarthHousing.workHold(s,p.id)&&!byOwner.get(id(p))?.build);
    if(!b)b=s.cooperative={open:[],delay:''};
    for(const firm of b.open)if(firm.closed==null&&!s.buildings.some(v=>v.id===firm.id))firm.closed=s.growth.round;
    trade(world,s,b,remaining,floor,rows,busy,events,byOwner);
    let j=b.project;
    if(!j){
      if(s.civicLand?.project||s.housing?.hardship?.length||s.population<5)return 0;
      const recent=kind=>b.open.some(v=>v.kind===kind&&(v.closed==null||s.growth.round-v.closed<12));
      const kind=!recent('market')&&!s.buildings.some(v=>v.kind==='market')?'market':
        b.open.length&&s.materials<14&&!recent('workshop')&&!s.buildings.some(v=>v.kind==='workshop')?'workshop':null;
      if(!kind){b.delay='';return 0;}
      const plot=Array.from({length:9},(_,i)=>i).find(i=>s.buildPlanPlot!==i&&!s.buildings.some(v=>v.plot===i)&&!s.construction?.some(x=>x.scope==='street'&&x.plot===i));
      const reason=kind==='market'?'Households want a local provisions store after settling the new housing.':'Local construction needs more tools and building materials.';
      if(plot==null||s.funds-floor.funds<cost.funds||s.materials-floor.materials<cost.materials){b.delay=reason+' Waiting for '+(plot==null?'an open street lot':s.funds-floor.funds<cost.funds?'three uncommitted wage funds':'four uncommitted materials')+'.';return 0;}
      const proposer=root.EarthCommunityLife.hostFor(s);
      j={id:'cooperative-'+s.growth.round+'-'+plot,kind,plot,reason,proposer:proposer.name,proposerId:proposer.id,stage:0,escrow:3,at,worker:null};
    }
    const crafts=remaining.filter(p=>!busy.has(p.id)&&(s.careers?.[p.id]?.skills?.craft??p.aptitudes.craft)>=34);
    const incumbent=crafts.find(p=>p.id===j.worker&&id(p)===j.workerKey);
    const worker=incumbent||crafts.sort((a,b)=>b.aptitudes.craft-a.aptitudes.craft||a.id.localeCompare(b.id))[0];
    if(!worker){b.delay=j.reason+' Waiting for an available builder.';if(b.project)j.worker=null;return 0;}
    const h=byOwner.get(id(worker)),to=point(j);
    const receipt=(from,to,good,n,why)=>root.EarthDistrictOrders.record(rows,from,to,good,n,worker.id,j.id,why);
    if(!b.project){
      s.funds-=cost.funds;s.materials-=cost.materials;b.project=j;
      receipt('Community treasury','Cooperative wage escrow','funds',3,'Three funded shifts');
      receipt('Public building store','Cooperative loading bay','materials',4,'Construction materials reserved');
      events.push(j.proposer+' commissioned '+title(j.kind)+' on '+to.label+'. '+j.reason);
    }
    busy.add(worker.id);b.delay='';h.activity='commitment';
    if(!incumbent){j.worker=worker.id;j.workerKey=id(worker);j.workerName=worker.name;j.at=at;j.travelMs=root.EarthDistrictOrders.movement(s,store,to);h.last=work(s).action+' on '+to.label+'.';return 0;}
    const shift=work(s);
    if(!closeWeek&&at>=j.at&&at-j.at<shift.travelMs+shift.workMs)return 0;
    const why=worker.name+' earned a fund '+(j.stage===0?'delivering supplies':'building')+' at '+to.label+'.';
    if(!root.EarthPurses.productionReceipt(world,s,worker.id,1,why)){b.delay='The builder cannot receive payment.';return 0;}
    receipt('Cooperative wage escrow',worker.name,'funds',1,why);
    if(!j.stage)receipt('Cooperative loading bay',to.label,'materials',4,'Delivered to worksite');
    j.escrow--;j.stage++;j.at=at;h.points++;s.growth.points++;h.last=why;h.lastPoint=to;
    if(j.stage===3){
      const name=title(j.kind);
      s.buildings.push({id:j.id,kind:j.kind,plot:j.plot,name});
      b.open.push({id:j.id,kind:j.kind,plot:j.plot,week:world.week,builder:worker.id,builderName:worker.name,proposer:j.proposer,proposerId:j.proposerId,reason:j.reason,sales:0});
      if(b.open.length>12){const oldest=b.open.findIndex(v=>v.closed!=null);if(oldest>=0)b.open.splice(oldest,1);}
      delete b.project;
      const msg=worker.name+' opened the '+name.toLowerCase()+' on '+to.label+'.';events.push(msg);root.EarthCommunityLife.recordWeek(s,world.week,msg);
    }
    return 1;
  }
  function valid(s,week){
    const b=s.cooperative;if(b==null)return true;
    const positive=n=>Number.isSafeInteger(n)&&n>=0,text=v=>typeof v==='string'&&v.length>0&&v.length<720;
    const project=v=>v&&['market','workshop'].includes(v.kind)&&positive(v.plot)&&v.plot<9&&text(v.id)&&text(v.reason)&&text(v.proposer);
    if(!Array.isArray(b.open)||b.open.length>12||typeof b.delay!=='string'||!b.open.every(v=>project(v)&&positive(v.week)&&v.week<=week&&positive(v.sales)&&text(v.builderName)))return false;
    const j=b.project;
    return !j||project(j)&&positive(j.stage)&&j.stage<3&&j.escrow===3-j.stage&&positive(j.at)&&positive(j.travelMs)&&
      (j.worker==null||text(j.worker)&&text(j.workerKey)&&text(j.workerName))&&!s.buildings.some(v=>v.plot===j.plot);
  }
  root.EarthCooperativeWorks={work,settle,valid,centre};
})(globalThis);
