/* A paid order has a customer, an advance, a source, a carrier and a destination.
   The coarse offscreen clock and the street read the same legs of that order. */
(function(root){
  'use strict';
  const period=12000,limit=Number.MAX_SAFE_INTEGER;
  const funds='funds',publicAccount='Community treasury',carrier='Visiting freight exchange',escrow='Order escrow';
  const pantry='Public pantry',yard='Public building store',stores={food:pantry,materials:yard};
  const natural=n=>Number.isSafeInteger(n)&&n>=0;
  const label={food:'food',repair:'materials',exchange:'parcels',retail:'wares'};
  const skill={food:'care',repair:'craft',exchange:'organisation'};
  const imported={crate:'staple crate',boards:'packing boards',parcel:'sealed parcel'};
  const changed=(entries,from,to,good,amount,personId,workId,reason)=>{
    if(amount)entries.push({from,to,good,amount,personId:personId||null,workId:workId||null,reason});
  };
  function member(site,id){
    return root.EarthCommunityLife.residency(site,id)==='member'&&!root.EarthCommunityLife.commuting(site,id);
  }
  function occupation(site,p){
    const role=root.EarthCareers.work(site,p.id)?.occupation||p.role||'';
    if(/food|garden|grow|harvest|fish|cook|nurse|care/i.test(role))return 'food';
    if(/repair|build|craft|survey|mechanic|carpent/i.test(role))return 'repair';
    return 'exchange';
  }
  function commitment(world,site,p,appointments){
    if(!member(site,p.id))return 'Away from this district';
    const housing=root.EarthTownCentre?.restriction(site,p);
    if(housing)return housing;
    if(p.background&&p.background.workEthic<25&&((site.growth?.round||0)+p.background.patience)%4<2)
      return 'Chose personal time instead of taking this shift';
    if(site.centre?.reliefShift===p.id)return 'Taking this shift to help a neighbour obtain relief';
    if(root.EarthPractice?.reserved?.(site,p.id,world.week))return 'Keeping a booked practice session';
    if(site.purses?.tickets?.[p.id])return 'A stock check is already booked';
    if(site.shift?.residentId===p.id||site.shift&&p.id===(site.agency?.actor||'steward'))return 'Working an accompanied shift';
    if(site.careers?.[p.id]?.training?.pace==='intensive'&&!site.careers[p.id].training.paused)return 'Attending an intensive course';
    if(site.workforce?.members?.[p.id]?.jobId)return 'A construction crew is depending on this resident';
    if(site.fleet?.custody?.actor===p.id||site.fleet?.dispute?.actor===p.id)return 'Responsible for a vehicle in use';
    if(site.communityLife?.freight?.signer===p.id)return 'Carrying a signed district shipment';
    if(site.communityLife?.excursions?.[p.id])return 'Travelling to another community';
    if(site.communityLife?.foundingPlan?.members?.includes(p.id))return 'Preparing an agreed relocation';
    if(appointments?appointments.has(p.id):root.EarthNeighbourErrands?.working?.(site,world.week).some(e=>e.actorId===p.id||e.targetId===p.id))return 'Keeping an agreed appointment';
    return '';
  }
  function supplier(site){
    return site.growth.broker||={cash:0,parcel:0,crate:0,boards:0,arrivals:0};
  }
  function arrive(world,site,people,log){
    const g=site.growth,b=supplier(site);
    if(b.arrivals&&g.round%4!==1)return;
    const connected=world.routes?.filter(r=>r.from===site.id||r.to===site.id).length||0;
    const berths=Math.min(18,Math.max(2,Math.ceil(people.length/2))+g.vehicle+connected);
    // The signed manifest names the external source of cash and incoming lots.
    // Anything left from the preceding customer's visit remains in their account.
    const add=(good,amount,room)=>{
      const n=Math.max(0,Math.min(amount,room-b[good]));
      if(n){b[good]+=n;changed(log,'Incoming freight manifest',carrier,good==='cash'?funds:imported[good],n,null,null,'Arriving customer consignment');}
    };
    add('cash',berths*6,berths*9);add('parcel',berths+2,berths*2);
    add('crate',Math.max(1,Math.ceil(berths/3)),berths);
    add('boards',Math.max(2,Math.ceil(berths/2)),berths);
    b.arrivals++;
  }
  function point(site,order,place){
    const delta=((order.plot%5)-2)*.16;
    if(place==='market')return {x:15+delta,y:23.48,label:'the exchange loading counter'};
    if(place==='pantry')return {x:9.32+delta,y:23.48,label:'the shared pantry counter'};
    if(place==='home'){
      const addressed=order.phase==='deliver'&&order.recipientPlot!=null;
      const plot=addressed?order.recipientPlot:order.plot;
      const house=root.EarthDistrictGrowth.homePoint(site,plot);
      return {x:house.x,y:house.y+.51,label:addressed?order.recipientName+'’s home':'the residential frontage'};
    }
    if(place==='shop'){
      const shop=root.EarthDistrictGrowth.shopPoint(site,order.employerPlot??order.plot);
      return {x:shop.x,y:shop.y+.53,label:(order.employerName||'the owner')+'’s shop'};
    }
    if(place==='dock'){
      const quay=root.EarthConstruction?.harvestQuay?.(site,{resource:order.resource});
      return {x:(quay?.x||11.4)+delta,y:24,label:'the fishing quay'};
    }
    const build=site.buildings?.find(b=>b.kind===place);
    if(build){const at=root.EarthConstruction.streetPoint({scope:'street',plot:build.plot});return {x:at.x+delta,y:at.y+.34,label:build.name};}
    return place==='garden'?{x:8.9+delta,y:23.46,label:'the growing beds'}:{x:21.1+delta,y:17.46,label:'the workshop frontage'};
  }
  function endpoints(site,order){
    const collecting=order.phase==='collect';
    const first=collecting?order.start:order.sourceVenue,last=collecting?order.sourceVenue:order.destVenue;
    return {from:collecting&&order.fromPoint?order.fromPoint:point(site,order,first),to:point(site,order,last)};
  }
  // A frontage opens on to a six-unit street grid. This route crosses blocks
  // along the same public streets when the detailed scene is unloaded.
  function path(a,b){
    const ya=Math.max(0,Math.min(24,Math.round(a.y/6)*6)),yb=Math.max(0,Math.min(24,Math.round(b.y/6)*6));
    if(ya===yb)return [a,{x:a.x,y:ya},{x:b.x,y:yb},b];
    const track=Math.max(0,Math.min(24,Math.round((a.x+b.x)/12)*6));
    return [a,{x:a.x,y:ya},{x:track,y:ya},{x:track,y:yb},{x:b.x,y:yb},b];
  }
  function orderView(site,order){
    const {from,to}=endpoints(site,order),travelling=order.phase==='collect',cargo=order.resourceName;
    const action=travelling?(order.kind==='retail'?root.EarthResidentShops.products[order.resource].make:order.resource==='fish'?'Cast the shared handline and land the catch':
      order.resource==='parcel'?'Collect the addressed parcel':'Collect '+cargo):'Deliver '+cargo+' to '+to.label;
    return {id:order.id,ownerId:order.person,workerName:order.worker,name:order.resourceName.charAt(0).toUpperCase()+order.resourceName.slice(1)+' order',phase:order.phase,action,reason:order.why,source:order.source,
      venue:travelling?order.sourceVenue:order.destVenue,destination:to.label,tool:order.tool,resource:order.resource,resourceName:order.resourceName,orderGood:order.kind,kind:'paidOrder',
      amount:travelling?order.request:order.cargo,payer:customer(order),price:order.wage,employerId:order.employerId||null,
      from,to,point:to,beneficiaryId:order.recipientId||order.employerId||null,beneficiaryName:order.recipientName||order.employerName||null,startedAt:order.at,travelMs:order.travelMs,workMs:order.workMs,step:travelling?1:2,steps:2};
  }
  function work(site,personOrId){
    if(!site?.growth)return null;
    const id=typeof personOrId==='string'?personOrId:personOrId?.id;
    const h=site.growth.households.find(h=>h.order?.person===id);
    return h?orderView(site,h.order):null;
  }
  function movement(site,from,to){
    const points=path(from,to);
    let length=0;
    for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    return Math.ceil(length/(1.55+.15*site.growth.vehicle)*1000);
  }
  function setLeg(site,o,at){
    o.at=at;
    const {from,to}=endpoints(site,o);
    o.travelMs=movement(site,from,to);
    o.workMs=o.phase==='deliver'?1300:o.kind==='retail'?6500:o.resource==='fish'?root.EarthFisheries.biteDelay*o.request:o.kind==='repair'&&site.growth.custom==='Repair circle'?1450:2100;
  }
  function overview(site){
    const g=site.growth;
    if(!g)return {reserved:0,orders:0,buyerFunds:0,cargo:0};
    const jobs=g.households.map(h=>h.order).filter(Boolean);
    return {reserved:jobs.reduce((n,o)=>n+o.wage+o.dues,0),orders:jobs.length,buyerFunds:g.broker?.cash||0,cargo:jobs.reduce((n,o)=>n+o.cargo,0)};
  }
  function customer(order){
    return order.client==='shop'?order.employerName+'’s shop':order.client==='public'?publicAccount:carrier;
  }
  function inputQuote(world,site,h){
    const item=root.EarthResidentShops.products[h.shop];
    let best=null;
    for(const id of item.inputs){
      if(h.shopInputs?.[id])return {id,cost:0,name:id};
      const offer=root.EarthMarket.makerInput(world,site,id);
      if(offer?.available&&(!best||offer.price<best.cost))best={id,cost:offer.price,name:offer.name};
    }
    return best;
  }
  function privateOffer(world,site,p,offers){
    let best=null;
    for(const opening of offers.openings){
      const {shop,employer,item,source,demand}=opening;
      if(offers.hired.has(shop.owner)||!demand)continue;
      const proficiency=site.careers?.[p.id]?.skills?.[item.axis]??p.aptitudes?.[item.axis]??40;
      const threshold=item.threshold-(site.growth.custom==='Repair circle'&&shop.access&&item.axis==='craft'?4:0);
      if(proficiency<threshold)continue;
      const workerTrust=root.EarthAutonomy?.bond?.(site,p.id,employer.id,world.week)||0;
      const employerTrust=root.EarthAutonomy?.bond?.(site,employer.id,p.id,world.week)||0;
      const familiarity=Math.min(workerTrust,employerTrust);
      if(familiarity<=-3)continue;
      const wage=proficiency>=65?2:1;
      if((shop.businessFunds||0)<wage+source.cost||source.cost+wage>4)continue;
      const score=37+Number(employer.id===p.id&&p.traits.initiative>=60)*2+proficiency/4+Math.min(15,demand*3)+familiarity+
        (p.hobbyAxis===item.axis?6:0)-shop.stock*8;
      if(!best||score>best.score)best={...opening,wage,score,familiarity};
    }
    return best;
  }
  function hire(world,site,p,h,offer,offers,at,log){
    const {shop,employer,item,source,wage}=offer;
    if(source.cost&&!root.EarthMarket.makerInput(world,site,source.id,source.cost))return null;
    if(!source.cost){if(!shop.shopInputs?.[source.id])return null;if(!--shop.shopInputs[source.id])delete shop.shopInputs[source.id];}
    const o={id:site.growth.round+'-'+h.plot,person:p.id,worker:p.name,plot:h.plot,stageRound:site.growth.round,kind:'retail',client:'shop',wage,dues:0,
      resource:shop.shop,resourceName:item.name.toLowerCase(),source:'the district making bench',sourceVenue:'workshop',destVenue:'shop',
      employer:shop.owner,employerId:employer.id,employerName:employer.name,employerPlot:shop.businessPlot,input:source.id,
      start:h.lastStop||'home',request:1,cargo:0,phase:'collect',tool:item.shop==='weaving'?'weaving frame':item.shop==='joinery'?'joinery tools':item.shop==='music'?'tuning tools':'sewing tools',
      why:employer.name+' needs '+item.name.toLowerCase()+' for '+offer.demand+' interested household'+(offer.demand===1?'':'s')+'. My '+item.axis+' skill meets the job requirement. The shop reserved '+wage+' for my work.'};
    const independent=employer.id===p.id;
    if(independent)o.why='I own this shop. '+offer.demand+' households could use a '+o.resourceName+'. My business bought the raw input and set aside '+wage+' for my time at the bench.';
    else if(offer.familiarity>0)o.why+=' We have kept agreements before.';
    if(h.lastPoint)o.fromPoint={...h.lastPoint};
    setLeg(site,o,at);
    shop.businessFunds-=source.cost+wage;offers.hired.add(shop.owner);
    if(source.cost)changed(log,customer(o),'Exchange till',funds,source.cost,employer.id,o.id,'Bought the shop’s raw input');
    changed(log,source.cost?'Exchange shelf':customer(o),escrow,source.id,1,employer.id,o.id,'Reserved workshop input');
    changed(log,customer(o),escrow,funds,wage,employer.id,o.id,independent?'Owner reserved a making session':'Employer reserved the wage');
    h.order=o;h.activity='shop';h.last=o.why;return o;
  }
  function start(world,site,p,h,floor,offers,at,log){
    const g=site.growth,b=supplier(site);
    const types=['food','repair','exchange'],trade=occupation(site,p);
    const wants=site.civicInitiatives?.active?.goods?.materials||0;
    const needs={food:Math.max(floor.food+3,Math.ceil(site.population/5)*5),repair:floor.materials+8+wants};
    const publicRoom=site.funds-floor.funds;
    const best=[];
    for(const kind of types){
      const good=label[kind],orderCount=offers.pending[kind]||0;
      const shortage=kind!=='exchange'&&site[good]+orderCount<needs[kind];
      const trained=site.careers?.[p.id]?.skills?.[skill[kind]]??p.aptitudes?.[skill[kind]]??45;
      const wage=1+Number(trained>=65)+Math.min(1,Math.floor(h.points/24));
      const client=shortage&&publicRoom>=wage?'public':'broker',dues=client==='broker'?1:0;
      if(client==='broker'&&b.cash<wage+dues)continue;
      let field=null;
      if(kind==='exchange'){
        if(!b.parcel||!offers.households.some(row=>row.p.id!==p.id))continue;
        field={id:'parcel',name:imported.parcel,place:'the exchange loading counter',venue:'market',available:b.parcel};
      }else{
        const prefersFish=/fish|dock|harbour|shore/i.test(p.role||'')||(h.plot+g.round)%4===0;
        let highest=-1;
        for(const source of offers.sources[kind]){
          const held=offers.held[source.id]||0,available=source.available-held;
          if(available<=0||source.id==='fish'&&held)continue;
          const score=available+(source.id==='fish'&&prefersFish?9:0);
          if(score>highest){highest=score;field={...source,available};}
        }
        if(!field){
          const replacement=kind==='food'?'crate':'boards';
          if(b[replacement])field={id:replacement,name:imported[replacement],place:'the arriving freight consignment',venue:'market',available:b[replacement]};
        }
      }
      if(!field)continue;
      const score=(kind===trade?26:0)+trained/5+(shortage?26+Math.min(16,needs[kind]-site[good]):0)-orderCount*3+
        (kind==='exchange'?(p.traits?.sociability||40)/8:0)+(p.traits?.initiative||45)/30;
      best.push({kind,good,score,client,wage,dues,field});
    }
    best.sort((a,b)=>b.score-a.score);
    const chosen=best[0],opening=privateOffer(world,site,p,offers);
    if(opening&&(!chosen||opening.score>=chosen.score)){
      const hired=hire(world,site,p,h,opening,offers,at,log);if(hired)return hired;
    }
    if(!chosen){h.last='Waiting for a funded order with an available source or an arriving consignment.';return null;}
    const {kind,good,client,wage,dues,field}=chosen,source=field.place;
    const customary=site.growth.custom===({food:'Harvest supper',repair:'Repair circle',exchange:'Market gathering'})[kind];
    const capacity=2+Number(kind==='repair'&&site.growth.vehicle>0||customary&&g.round%3===0);
    const request=imported[field.id]?(kind==='exchange'&&customary?Math.min(2,b.parcel):1):Math.min(field.available,capacity);
    const order={id:g.round+'-'+h.plot,person:p.id,worker:p.name,plot:h.plot,stageRound:g.round,kind,client,wage,dues,resource:field.id,
      resourceName:field.name,source,sourceVenue:field.venue,destVenue:kind==='exchange'?'home':client==='broker'?'market':kind==='food'?'pantry':'workshop',
      start:h.lastStop||'home',request,cargo:0,phase:'collect',tool:field.id==='fish'?(site.buildings.some(b=>b.kind==='fishingDock')?'dock handline':'shared handline'):kind==='exchange'?'delivery docket':kind==='food'?'harvest basket':'work tools',
      why:client==='public'?'The '+site.name+' council ordered '+good+' for its '+(kind==='food'?'households':'building crews')+
        '. The available store holds '+site[good]+', below its '+needs[kind]+' target.':
        'The freight exchange has a paid '+(kind==='exchange'?'doorstep delivery':'order for '+field.name)+'. Its advance covers my '+wage+'-fund wage and the market due.'};
    if(kind==='exchange'){
      // A different household placed the order. Earning a fee requires
      // delivering the addressed goods while that household still lives here.
      let receiver=null,least=Infinity,first=Infinity;
      const peers=offers.households.length-1;
      for(const row of offers.households){
        if(row.p.id===p.id)continue;
        const need=Math.min(row.h.pantry||0,row.h.supplies||0)+(offers.deliveries[row.h.owner]||0);
        const turn=(row.h.plot+g.round)%peers;
        if(need<least||need===least&&turn<first){least=need;first=turn;receiver=row;}
      }
      if(!receiver)return null;
      order.recipient=receiver.h.owner;order.recipientId=receiver.p.id;order.recipientName=receiver.p.name;
      order.recipientPlot=receiver.h.plot;order.contents=(receiver.h.pantry||0)<=(receiver.h.supplies||0)?'food':'materials';
      order.why=receiver.p.name+' is expecting '+request+' '+(order.contents==='food'?'meal':'supply')+' parcel'+(request===1?'':'s')+' at home.'+(request>1?' The Market gathering coordinates a combined delivery.':'')+' The freight exchange has set aside '+(wage+dues)+' funds for delivery and market dues.';
      offers.deliveries[receiver.h.owner]=(offers.deliveries[receiver.h.owner]||0)+1;
    }
    const from=h.lastPoint||site.workforce?.members?.[p.id]?.position;
    if(from&&Number.isFinite(from.x)&&Number.isFinite(from.y))order.fromPoint={x:from.x,y:from.y,label:h.lastPoint?.label||'the previous workplace'};
    setLeg(site,order,at);
    if(client==='public')site.funds-=wage;else b.cash-=wage+dues;
    if(imported[field.id])b[field.id]-=request;
    else offers.held[field.id]=(offers.held[field.id]||0)+request;
    offers.pending[kind]=(offers.pending[kind]||0)+1;
    changed(log,client==='public'?publicAccount:carrier,escrow,funds,wage+dues,p.id,order.id,'Funded '+field.name+' order');
    if(imported[field.id])changed(log,carrier,escrow,field.name,request,p.id,order.id,'Set aside the consignment');
    const ambition=site.autonomy?.people?.[p.id]?.dream;
    if(ambition&&!ambition.completedWeek&&order.why.length<213){
      const dream=root.EarthDreams?.view?.(site,world,p.id,p,ambition);
      if(dream?.shortfall)order.why+=(' I am saving '+dream.shortfall+' more funds for '+dream.supplier+'.').slice(0,86);
    }
    h.order=order;h.activity=kind;h.last=p.name+' accepted the order. '+order.why;
    return order;
  }
  function cancel(site,h,log,why){
    const o=h.order;if(!o)return;
    const business=o.client==='shop'&&site.growth.households.find(h=>h.owner===o.employer);
    if(business)business.businessFunds+=o.wage;
    else if(o.client==='public')site.funds+=o.wage;else supplier(site).cash+=o.wage+o.dues;
    changed(log,escrow,customer(o),funds,o.wage+o.dues,o.person,o.id,'Returned advance');
    if(business){
      if(o.cargo){business.stock++;business.restockedRound=site.growth.round;changed(log,o.worker,customer(o),o.resourceName,1,o.person,o.id,'Recovered paid shop stock');}
      else {const inputs=business.shopInputs||={};inputs[o.input]=(inputs[o.input]||0)+1;changed(log,escrow,customer(o),o.input,1,o.person,o.id,'Returned workshop input');}
    }else if(imported[o.resource]){
      supplier(site)[o.resource]+=o.request;
      changed(log,o.cargo?o.worker:escrow,carrier,o.resourceName,o.request,o.person,o.id,'Returned consignment');
    }else if(o.cargo){
      const good=label[o.kind];site[good]+=o.cargo;
      const receiver=good==='food'?'Pantry preparation':'Building-store receiving';
      changed(log,o.worker,receiver,o.resourceName,o.cargo,o.person,o.id,'Recovered the carrier’s load');
      changed(log,receiver,stores[good],good,o.cargo,o.person,o.id,'Recovered undelivered goods');
    }
    h.last=why+'. The customer recovered the advance.';delete h.order;
  }
  function collect(world,site,h,at,log){
    const o=h.order,sourceStocks=root.EarthResources;
    let quantity=o.request;
    if(o.kind==='retail'){
      changed(log,escrow,o.source,o.input,1,o.person,o.id,'Used the reserved input at the workbench');
    }else if(!imported[o.resource]){
      const legal=o.resource!=='fish'||!site.handline||o.tool==='dock handline'&&site.buildings.some(b=>b.kind==='fishingDock');
      quantity=legal?sourceStocks.harvestForProject(world,site,{id:o.resource,available:o.request},o.request,false).amount:0;
    }
    if(!quantity){cancel(site,h,log,o.source+' is unavailable');return false;}
    o.cargo=quantity;o.phase='deliver';o.stageRound=site.growth.round;setLeg(site,o,at);
    changed(log,imported[o.resource]?escrow:o.source,o.worker,o.resourceName,quantity,o.person,o.id,o.kind==='retail'?'Finished commissioned stock':'Collected at source');
    h.last=o.worker+' collected '+quantity+' '+o.resourceName+' at '+o.source+' and is taking the load to '+point(site,o,o.destVenue).label+'.';
    return true;
  }
  function deliver(world,site,p,h,log,counts){
    const o=h.order,good=label[o.kind],earn=o.wage;
    const who=customer(o),business=o.client==='shop'&&site.growth.households.find(h=>h.owner===o.employer);
    const publicUnits=o.kind==='exchange'||o.kind==='retail'?0:o.client==='public'?o.cargo:Math.max(0,o.cargo-1);
    const purse=site.purses?.people?.[p.id];
    if(site.funds>limit-o.dues||publicUnits&&site[good]>limit-publicUnits||
      (purse?.balance||0)>limit-earn||(purse?.productionIncome||0)>limit-earn){
      h.last='Waiting for space in the receiving store or account. The cargo and wage stay reserved.';return false;
    }
    const desc=p.name+' delivered '+o.cargo+' '+o.resourceName+' from '+o.source+' to '+point(site,o,o.destVenue).label+'. '+who+' paid '+earn+' personal '+(earn===1?'fund':'funds')+' from its advance.';
    const receiving=o.kind==='exchange'&&o.recipient?site.growth.households.find(home=>home.owner===o.recipient):null;
    if(o.recipient&&(!receiving||!member(site,o.recipientId)||root.EarthPersonas.profile(site,o.recipientId)?.identityKey!==o.recipient)){
      cancel(site,h,log,'The addressed household has moved or is away');return false;
    }
    if(receiving&&(receiving[o.contents==='food'?'pantry':'supplies']||0)>limit-o.cargo){h.last='The receiving household is making room for this parcel.';return false;}
    if(o.client==='shop'&&(!business||business.shop!==o.resource||business.stock>=3)){h.last='Waiting for space on the employer’s shelf.';return false;}
    if(!root.EarthPurses.productionReceipt(world,site,p.id,earn,desc))return false;
    changed(log,escrow,p.name,funds,earn,p.id,o.id,'Wage on delivery');
    if(o.dues){site.funds+=o.dues;changed(log,escrow,publicAccount,funds,o.dues,p.id,o.id,'Market due on delivery');}
    if(business){
      business.stock++;business.restockedRound=site.growth.round;
      if(o.person!==o.employerId){business.hires=(business.hires||0)+1;business.points++;site.growth.points++;}
      changed(log,p.name,who,o.resourceName,1,o.employerId,o.id,o.person===o.employerId?'Owner stocked the shop':'Employer received commissioned stock');
      business.last=who+' paid '+p.name+' '+earn+' for making a '+o.resourceName+'.';
      if(member(site,o.employerId))root.EarthAutonomy?.remember?.(site,world.week,o.person,o.employerId,'paidShift');
    }else if(o.kind==='exchange'){
      if(receiving){
        const item=o.contents==='food'?'pantry':'supplies';receiving[item]=(receiving[item]||0)+o.cargo;
        const doorstep=o.recipientName+'’s doorstep';
        changed(log,p.name,doorstep,o.resourceName,o.cargo,p.id,o.id,'Opened the addressed consignment');
        changed(log,doorstep,o.recipientName,o.contents,o.cargo,o.recipientId,o.id,'Received the addressed consignment');
      }else changed(log,p.name,'Receiving household',o.resourceName,o.cargo,p.id,o.id,'Delivered addressed consignment');
    }else{
      const local=publicUnits;
      if(local){
        const receiver=good==='food'?'Pantry preparation':'Building-store receiving';
        changed(log,p.name,receiver,o.resourceName,local,p.id,o.id,'Received raw lots for public use');
        site[good]+=local;changed(log,receiver,stores[good],good,local,p.id,o.id,o.client==='public'?'Public order filled':'Growers’ in-kind share');
      }
      if(o.cargo>local)changed(log,p.name,carrier,o.resourceName,o.cargo-local,p.id,o.id,'Export handed to buyer');
      if(o.resource==='fish'&&local)root.EarthProvisions?.credit?.(world,site,'catch',local,p.id);
    }
    const points=o.cargo+1;h.points+=points;site.growth.points+=points;counts[o.kind==='retail'?'repair':o.kind]++;
    h.last=desc;h.lastPoint=point(site,o,o.destVenue);h.lastStop=o.destVenue;h.activity=o.kind==='retail'?'shop':o.kind;delete h.order;
    return true;
  }
  function prepare(world,site,people,log){
    arrive(world,site,people,log);
    const sources={food:root.EarthResources.orderSources(world,site,'food'),repair:root.EarthResources.orderSources(world,site,'materials')};
    const pending={},held={},deliveries={},hired=new Set(),openings=[];
    const byOwner=new Map(site.growth.households.map(h=>[h.owner,h]));
    const households=people.map(p=>({p,h:byOwner.get(p.identityKey||p.id)}));
    for(const h of site.growth.households){
      const o=h.order;if(!o)continue;
      if(o.employer)hired.add(o.employer);
      if(o.recipient)deliveries[o.recipient]=(deliveries[o.recipient]||0)+1;
      pending[o.kind]=(pending[o.kind]||0)+1;
      if(o.phase==='collect'&&!imported[o.resource])held[o.resource]=(held[o.resource]||0)+o.request;
    }
    for(const {p:employer,h:shop} of households){
      if(!shop.shop||shop.stock>=2||!shop.businessFunds||hired.has(shop.owner))continue;
      const item=root.EarthResidentShops.products[shop.shop],source=inputQuote(world,site,shop);
      if(!source||shop.businessFunds<source.cost+1)continue;
      const demand=people.filter(p=>p!==employer&&(site.purses?.people[p.id]?.balance||0)>=3&&!site.purses.people[p.id].belongings?.[shop.shop]).length;
      if(demand>shop.stock)openings.push({shop,employer,item,source,demand});
    }
    return {sources,pending,held,deliveries,households,hired,openings};
  }
  function validOrder(o,h){
    if(!o)return o===undefined;
    const fields=['person','worker','id','source','resourceName','tool','why'];
    const venues=['home','garden','workshop','market','pantry','dock','shop'];
    return o.plot===h.plot&&(!o.fromPoint||Number.isFinite(o.fromPoint.x)&&Number.isFinite(o.fromPoint.y)&&typeof o.fromPoint.label==='string')&&fields.every(k=>typeof o[k]==='string'&&o[k].length>0&&o[k].length<=300)&&
      (o.kind==='retail'?Object.hasOwn(root.EarthResidentShops.products,o.resource):Object.hasOwn(imported,o.resource)||o.resource==='fish'||root.EarthResources.isResource(o.resource))&&Object.hasOwn(label,o.kind)&&
      ['collect','deliver'].includes(o.phase)&&(o.kind==='retail'?o.client==='shop'&&['employer','employerName','employerId'].every(k=>typeof o[k]==='string'&&o[k].length>0)&&natural(o.employerPlot)&&root.EarthResidentShops.products[o.resource].inputs.includes(o.input):['broker','public'].includes(o.client))&&
      [o.start,o.sourceVenue,o.destVenue].every(v=>venues.includes(v))&&
      [o.stageRound,o.at,o.travelMs,o.workMs,o.request,o.cargo,o.wage,o.dues].every(natural)&&o.request>=1&&o.request<=3&&o.cargo<=o.request&&
      (o.recipient==null||o.kind==='exchange'&&typeof o.recipient==='string'&&typeof o.recipientId==='string'&&typeof o.recipientName==='string'&&natural(o.recipientPlot)&&['food','materials'].includes(o.contents))&&
      o.wage>=1&&o.wage<=3&&o.dues===(o.client==='broker'?1:0)&&(o.phase==='collect'?o.cargo===0:o.cargo>0);
  }
  root.EarthDistrictOrders=Object.freeze({period,occupation,commitment,prepare,start,cancel,collect,deliver,work,overview,orderView,endpoints,path,movement,
    validOrder,validBroker:b=>!b||['cash','arrivals','parcel','crate','boards'].every(k=>natural(b[k])),record:changed,publicAccount,carrier,escrow});
})(globalThis);
