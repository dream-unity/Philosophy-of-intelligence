/* Dispatch owns the blue truck, its relief roster and one paid run per week.
   Street owns the moving vehicle. Check its live position at every handover. */
(function(root){
  'use strict';
  const depot=Object.freeze({name:'Market exchange',x:15,y:24});
  const stops=Object.freeze([
    Object.freeze({name:'Pantry stop',x:9,y:24,good:'food'}),
    Object.freeze({name:'Repair stop',x:21,y:18,good:'materials'}),
    Object.freeze({name:'Assembly stop',x:21,y:24,good:'funds'})
  ]);
  const fail=message=>({ok:false,message});
  const whole=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const within=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
  const location=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-.8&&p.x<=24.8&&p.y>=-.8&&p.y<=24.8;
  const crew=site=>['steward',...site.residents.map(p=>p.id),'walker-0','walker-1','walker-2','walker-3','walker-4','driver'];
  const data=site=>site.fleet||{};
  function writable(site){return site.fleet||={serial:0,roster:{},records:[]};}
  const person=(site,id)=>root.EarthPersonas?.profile(site,id)?.name||site.residents.find(p=>p.id===id)?.name||'Community steward';
  const driver=site=>person(site,'driver');
  function entry(f,week,actor,text,otherId=null){f.records.unshift({week,actor,text,...(otherId&&otherId!==actor?{otherId}:{})});f.records.length=Math.min(8,f.records.length);}
  function identityStamp(site,id){
    const p=root.EarthPersonas?.profile?.(site,id);
    return {id,name:p?.name||person(site,id),key:p?.identityKey||null};
  }
  function isSame(site,stamp,id){
    if(!stamp||stamp.id!==id)return false;
    const actual=identityStamp(site,id);
    return stamp.key?stamp.key===actual.key:stamp.name===actual.name;
  }
  function recorded(incident){return !!incident&&(!incident.operator||!!incident.report);}
  function operatorHere(site,incident,id){
    return incident?.actor===id&&(!incident.operator||isSame(site,incident.operator,id));
  }
  function witness(site,incident,id){
    return incident?.witnesses?.find(p=>isSame(site,p,id));
  }
  function heard(site,incident,id){
    return incident?.statements?.find(s=>isSame(site,s.listener,id));
  }
  function report(world,site,source){
    const f=site.fleet,i=f.incident;
    if(recorded(i))return '';
    const urgent=i.independent&&site.mandate==='services';
    const loss=Math.min(site.trust,urgent?2:4);
    i.report={source:source.id,sourceName:source.name,week:world.week,loss};
    site.trust-=loss;
    const message=(source.id===i.actor?source.name+' acknowledged taking':source.name+' identified '+i.operator.name+' as the person who took')+
      ' the truck without a booking. Dispatch suspended '+i.operator.name+'’s access.'+
      (urgent?' The service mandate weighed the emergency request.':'')+(loss?' Community trust fell by '+loss+'.':'');
    entry(f,world.week,i.actor,message,'driver');
    return message;
  }
  function openIncident(world,site,actor,scene,independent=false){
    const operator=identityStamp(site,actor);
    const present=id=>root.EarthCommunityLife?.present?.(site,id)!==false;
    const ids=[...new Set(scene.witnesses||[])].filter(id=>id!==actor&&(crew(site).includes(id)||root.EarthAgency?.canPlay?.(site,id))&&present(id));
    const i={actor,operator,week:world.week,witnesses:ids.slice(0,40).map(id=>identityStamp(site,id)),statements:[],...(independent?{independent:true}:{})};
    const f=writable(site);f.incident=i;
    entry(f,world.week,'driver','No signed consignment accompanied the truck. The usual pickup lost its vehicle.');
    const dispatch=witness(site,i,'driver');
    return dispatch?report(world,site,dispatch):'The co-op has lost use of its truck. Dispatch has no identification on file.';
  }
  function incidentTopics(world,site,listenerId,speakerId){
    const i=site.fleet?.incident;
    if(!i)return [];
    const options=[{id:'truck',label:'What do you know about the missing pickup?',context:true}];
    if(!i.operator||recorded(i))return options;
    const saw=witness(site,i,listenerId),previous=heard(site,i,speakerId);
    if(saw&&i.statements.length<128&&!previous&&!witness(site,i,speakerId)&&!operatorHere(site,i,speakerId))
      options.push({id:'truck-testimony',label:'Could I take your account to dispatch?',context:true});
    if(listenerId==='driver'&&(operatorHere(site,i,speakerId)||previous||witness(site,i,speakerId))){
      options.push({id:'truck-report',label:operatorHere(site,i,speakerId)?'Tell dispatch I took the truck':'Give dispatch the eyewitness account',context:true});
    }
    return options;
  }
  function incidentReply(world,site,listenerId,speakerId,topic){
    const f=site.fleet,i=f?.incident;if(!i)return null;
    const name=person(site,listenerId),quote=(words,next)=>({ok:true,message:name+' · “'+words+'”',...(next&&next!==speakerId?{followContact:next}:{})});
    const self=operatorHere(site,i,listenerId),dispatcher=listenerId==='driver',seen=witness(site,i,listenerId);
    if(topic==='truck-testimony'||topic==='truck-report'){
      if(!incidentTopics(world,site,listenerId,speakerId).some(r=>r.id===topic))return fail('The account or the person who can give it has changed.');
      if(topic==='truck-testimony'){
        i.statements.push({listener:identityStamp(site,speakerId),source:seen,week:world.week});
        f.serial++;
        return {...quote('I was at the kerb. I saw '+i.operator.name+' take the truck. You can give dispatch my name.','driver'),changed:true};
      }
      const source=operatorHere(site,i,speakerId)?i.operator:witness(site,i,speakerId)||heard(site,i,speakerId).source;
      const message=report(world,site,source);f.serial++;return {ok:true,message,changed:true};
    }
    if(topic!=='truck')return null;
    if(self)return quote('I took the co-op truck without a booking.'+(i.independent?' I wanted a collection for the empty pantry.':'')+
      (recorded(i)?' Dispatch has my name on the report.':' Dispatch has yet to identify the operator.'),'driver');
    if(seen)return quote('I saw '+(i.operator?.name||person(site,i.actor))+' climb into the cab near me. '+(recorded(i)?'Dispatch has a report.':'I can tell dispatch what I saw.'),'driver');
    if(dispatcher&&recorded(i))return quote('We missed a pickup. '+(i.operator?.name||person(site,i.actor))+
      ' took the vehicle without a booking.'+(i.report?' '+i.report.sourceName+' gave the account in week '+i.report.week+'.':''),i.actor);
    if(dispatcher)return quote('We missed a pickup. The van was booked and there is no signed handover. I need someone who saw who took it.');
    const statement=heard(site,i,listenerId);
    if(statement)return quote(statement.source.name+' told me they saw '+i.operator.name+' at the wheel. I did not see the handover myself.','driver');
    return quote('I didn’t see who took it. Dispatch keeps the bookings. I’d ask the person responsible for the run.','driver');
  }
  function instruction(site,id){
    const person=root.EarthPersonas?.profile(site,id),skills=site.careers?.[id]?.skills||{},reference=site.careers?.[id]?.latestReference;
    const routeReading=skills.organisation??person?.aptitudes?.organisation??50;
    const handling=skills.stamina??person?.aptitudes?.stamina??50;
    const extra=Number(routeReading<33||handling<30)+Number(reference?.quality<0);
    return {weeks:1+extra,reason:extra?'Dispatch adds supervised route practice or a reference check.':'Dispatch checks the route card and a supervised delivery.'};
  }
  function manifest(site,week){
    let lean=stops[(week+site.founded)%stops.length];
    if(site.food<=Math.ceil(site.population/5)+1)lean=stops[0];
    else if(site.materials<=2)lean=stops[1];
    return [lean,...stops.filter(s=>s!==lean)].find(s=>!root.EarthMarket||root.EarthMarket.canLoadFreight(site,s.good))||lean;
  }
  function regular(world,site){
    if(!site||!world)return null;
    const f=data(site),week=world.week;
    const next=site.food<Math.ceil(site.population/5)*2?stops[0]:site.materials<=1?stops[1]:site.funds<=1?stops[2]:null;
    const plan=root.EarthAutonomy?.intent(site,'driver');
    const duty=site.careers?.driver?.jobId;
    const controlled=world.activeId===site.id&&(root.EarthAgency?.actorId(site)||'steward')==='driver';
    const reason=f.servedWeek===week?'The week’s dispatch is complete.':f.custody?'The vehicle is checked out.':
      root.EarthCommunityLife?.present?.(site,'driver')===false?'The transport driver has left the community.':
      root.EarthCommunityLife?.residency?.(site,'driver')==='visitor'?'The visiting driver has no local dispatch agreement.':controlled?'The driver is under your control.':
      duty&&duty!=='driver'?'The founding driver now works in another occupation.':
      plan?.week===week&&!['routine','gather'].includes(plan.kind)?'The driver has a different commitment today.':
      !next?'The regular shops have enough supplies.':!root.EarthMarket?.canLoadFreight(site,next.good)?'The exchange has no spare '+next.good+' for this run.':'';
    return {available:!reason,reason,next,week,serial:f.serial||0,siteId:site.id,generation:site.foundingRevision||0,
      done:f.regularWeek===week,marketRevision:site.exchange?.serial||0,driverId:'driver',driverName:driver(site)};
  }
  function moveRegularCargo(world,site,order){
    const f=writable(site),next=order.next;
    // Authorisation, loading and delivery form one settlement entry. Both
    // receipts are generated by the same stock ledger used by player drivers.
    f.custody={kind:'work',actor:'driver',week:world.week,delivered:false};
    const load=root.EarthMarket.freight(site,next.good,'load',world.week);
    if(!load.ok){delete f.custody;return load;}
    const drop=root.EarthMarket.freight(site,next.good,'deliver',world.week);
    if(!drop.ok)root.EarthMarket.freight(site,next.good,'return',world.week);
    delete f.custody;
    if(!drop.ok)return drop;
    const relevant={food:/grower|garden|baker|cook|seed/i,materials:/repair|carpent|engineer/i,funds:/convenor|trader|steward/i}[next.good];
    const recipient=site.residents.find(p=>relevant.test(root.EarthCareers?.role(site,p.id)||p.role));
    const message=order.driverName+' delivered 1 '+next.good+' from exchange stock at '+next.name+' to cover a shortage'+
      (recipient?' for '+recipient.name+'’s crew.':'.');
    f.servedWeek=world.week;f.regularWeek=world.week;f.serial++;entry(f,world.week,'driver',message,recipient?.id);
    return {ok:true,message};
  }
  function finishRegular(world,site,quote,scene){
    const current=regular(world,site);
    if(!current?.available||!quote||quote.siteId!==site.id||quote.generation!==current.generation||quote.week!==current.week||
       quote.serial!==current.serial||quote.marketRevision!==current.marketRevision||quote.next?.name!==current.next.name)
      return fail(current?.reason||'The dispatch order changed. Check the current load.');
    if(!scene||scene.siteId!==site.id||scene.driverId!=='driver'||scene.mode!=='service'||scene.attended!==true||scene.stop!==current.next.name||
       !location(scene)||!within(scene,current.next,1.2))return fail('The assigned driver must reach the correct kerb with the blue truck.');
    return moveRegularCargo(world,site,current);
  }
  function closeWeek(world,site){
    const order=regular(world,site);
    if(!order?.available)return [];
    const result=moveRegularCargo(world,site,order);
    return result.ok?[result.message]:[];
  }
  function dispute(world,site){
    if(!world||!site||world.activeId!==site.id)return null;
    const f=data(site),held=f.custody,week=world.week;
    const quote=(actor,action)=>({siteId:site.id,generation:site.foundingRevision||0,week,serial:f.serial||0,
      actor,action,name:person(site,actor),destination:stops[0],reason:'The pantry is empty and the driver has no available relief load.'});
    if(held){
      if(f.incident?.independent&&held.kind==='theft'&&!within(held.anchor,stops[0],1.2))return quote(held.actor,'park');
      return null;
    }
    if(f.incident||f.servedWeek===week||site.food>0||site.trust>24||week-(f.independentWeek??-100)<12||regular(world,site)?.available)return null;
    // Scarcity alone is insufficient. A recent dispute, an empty dispatch
    // rota and a resident willing to act immediately must coincide.
    const controlled=root.EarthAgency?.actorId(site)||'steward';
    let candidate=null,best=0;
    const residents=root.EarthPersonas?.list?.(site)?.map(p=>p.id)||crew(site);
    for(const id of residents){
      const career=site.careers?.[id],reference=career?.latestReference,plan=root.EarthAutonomy?.intent(site,id);
      if(!reference||reference.quality>=0||!whole(reference.week,Math.max(1,week-12),week)||
        id===controlled||root.EarthCommunityLife?.present?.(site,id)===false||root.EarthCommunityLife?.residency?.(site,id)==='visitor'||root.EarthCommunityLife?.travelIntent?.(site,id)||
        career.jobId==='driver'||f.roster?.[id]||career.application||career.training||site.workforce?.members?.[id]?.jobId||
        root.EarthDistrictGrowth?.work?.(site,id)||plan?.week===week&&!['routine','gather'].includes(plan.kind))continue;
      const self=root.EarthPersonas?.profile(site,id),traits=self?.traits;if(!traits)continue;
      const urgency=traits.initiative-traits.patience+Math.round((self.aptitudes?.care||0)/5);
      if(urgency>=18&&urgency>best){candidate=id;best=urgency;}
    }
    return candidate?quote(candidate,'take'):null;
  }
  function finishDispute(world,site,quote,scene){
    const offer=dispute(world,site);
    if(!offer||!quote||['siteId','generation','week','serial','actor','action'].some(key=>quote[key]!==offer[key]))
      return fail('The resident or dispatch has changed plans.');
    if(!scene||scene.siteId!==site.id||scene.actor!==offer.actor||!location(scene)||!location(scene.truck)||scene.stopped!==true)
      return fail('The worker and the stopped truck must be at the same kerb.');
    if(offer.action==='park'){
      if(scene.mode!=='drive'||!within(scene,scene.truck,.22)||!within(scene.truck,stops[0],1.2))return fail('The truck has yet to reach the pantry.');
      const f=site.fleet;
      f.custody.anchor={x:scene.truck.x,y:scene.truck.y};
      const identified=recorded(f.incident);
      const message=identified?offer.name+' left the blue truck at the pantry to ask for an emergency collection. No food was available to unload.':'The missing blue truck has reached the pantry. No dispatch load was available to unload.';
      f.serial++;entry(f,world.week,identified?offer.actor:'driver',message,'driver');return {ok:true,message};
    }
    if(scene.mode!=='walk'||scene.emptyCab!==true||!within(scene,scene.truck,1.56)||!within(scene.truck,depot,1.2))return fail('The co-op truck is occupied, moving or beyond the resident’s reach.');
    const f=writable(site),pickup={x:scene.truck.x,y:scene.truck.y};
    f.serial++;f.independentWeek=world.week;
    f.custody={actor:offer.actor,token:f.serial,kind:'theft',week:world.week,stop:0,pickup,anchor:{...pickup},delivered:false};
    const message=openIncident(world,site,offer.actor,scene,true);
    return {ok:true,message};
  }
  function view(world,site){
    if(!world||!site)return null;
    const id=root.EarthAgency?.actorId(site)||'steward',f=data(site),custody=f.custody||null;
    const relief=f.roster?.[id],hired=(site.careers?.[id]?.jobId||(id==='driver'?'driver':''))==='driver';
    const induction=instruction(site,id);
    const licence=hired||Boolean(relief&&relief.ready<=world.week);
    let next=manifest(site,world.week);
    if(custody)next=stops[custody.stop];
    const suspended=recorded(f.incident)&&operatorHere(site,f.incident,id);
    const hasLoad=!root.EarthMarket||root.EarthMarket.canLoadFreight(site,next.good);
    const role=licence?(hired?'Transport cooperative employee':'Co-op relief roster'):relief?'Dispatch induction in progress':'Enquiring about a driving shift';
    const choices=[];
    function add(action,label,detail,gate='',at='truck'){choices.push({action,label,detail,available:!gate,reason:gate,at});}
    if(!custody){
      if(!licence&&!relief)add('enrol','Apply for relief driving',induction.reason+' Your regular job continues during the '+induction.weeks+'-week induction. The relief roster opens in week '+(world.week+induction.weeks)+'.',
        suspended?'Resolve your outstanding incident first.':'','depot');
      add('checkout','Take the assigned delivery','Collect one '+next.good+' from exchange stock for '+next.name+'. Unload at the marked kerb to transfer it to community stores.',
        custody?'The truck is checked out.':suspended?'Dispatch has suspended this person’s access.':!licence?relief?'Induction finishes in week '+relief.ready+'.':'The transport cooperative authorises employees and its relief roster.':
        f.servedWeek===world.week?'This week’s contracted delivery is complete.':!hasLoad?'The stall has no spare freight. Sell stock at the market or return after its next supplier round.':'');
      if(!licence||suspended)add('take','Take without permission','The booked worker loses the truck. Anyone at the kerb who sees you can identify you to dispatch.',
        f.incident?'The co-op is already dealing with a missing-truck incident.':'');
    }else if(custody.actor===id){
      if(custody.kind==='work'&&!custody.delivered)add('deliver','Unload at '+next.name,'Drive to the labelled kerb. The cooperative releases the freight into community stores on arrival.',site[next.good]>=Number.MAX_SAFE_INTEGER?'The community store is full. Free one space or return the load to dispatch.':'','stop');
      add('park','Park and step out','Keep custody of the truck while you visit someone on foot. You can return to this kerb and board it again.','','vehicle');
      add('return','Return truck to dispatch',custody.kind==='theft'?'Report back at the market exchange. The original driver gets the vehicle back and you can make amends.':
        'Return it at the market exchange so the regular driver can resume deliveries.','','depot');
    }
    if(suspended&&!custody)add('repair','Volunteer a dispatch shift','Give one civic effort to help the displaced crew. Dispatch restores access and the town regains 2 trust.',
      world.effort<1?'Civic effort refreshes next week.':'','depot');
    return {actorId:id,siteId:site.id,generation:site.foundingRevision||0,week:world.week,serial:f.serial||0,owner:'Transport cooperative',
      driver:driver(site),role,induction,next,depot,custody,choices,incident:f.incident||null,history:f.records||[]};
  }
  function assignment(world,site){
    if(!world||!site)return null;
    const f=data(site),held=f.custody,service=regular(world,site),owner='Transport cooperative';
    if(held){
      const operator=person(site,held.actor);
      if(held.kind==='theft')return {owner,operator,operatorId:held.actor,destination:f.incident?.independent?stops[0].name:null,
        cargo:null,status:'Unbooked use',reason:'The vehicle is away from dispatch without a signed booking.'};
      const stop=stops[held.stop];
      return {owner,operator,operatorId:held.actor,destination:held.delivered?depot.name:stop.name,cargo:held.stock||null,
        status:held.delivered?'Returning to dispatch':'Contracted delivery',reason:held.delivered?'Dispatch is waiting for the vehicle after the freight delivery.':'The exchange released the signed load for '+stop.name+'.'};
    }
    if(service.available)return {owner,operator:service.driverName,operatorId:service.driverId,destination:service.next.name,cargo:service.next.good,
      status:'Contracted delivery',reason:'The receiving store needs '+service.next.good+' and the exchange has the consignment.'};
    return {owner,operator:null,operatorId:null,destination:depot.name,cargo:null,status:'Standby',reason:service.reason};
  }
  function run(world,site,request,scene){
    const quote=view(world,site);
    if(!quote||!request||request.actorId!==quote.actorId||request.week!==world.week||request.generation!==quote.generation||
       request.siteId!==site.id||request.serial!==quote.serial)return fail('Dispatch changed. Review the current truck and shift.');
    const choice=quote.choices.find(o=>o.action===request.action);
    if(!choice?.available)return fail(choice?.reason||'That dispatch action is no longer available.');
    const id=quote.actorId,own=quote.custody?.actor===id;
    if(!scene||scene.siteId!==site.id||scene.actor!==id||!location(scene)||!location(scene.truck))return fail('Meet the blue co-op truck in this community.');
    if(['take','checkout'].includes(request.action)&&scene.stopped===false)return fail('Wait for the truck to stop at the kerb before a handover.');
    const at=['vehicle','truck'].includes(choice.at)?scene.truck:choice.at==='stop'?quote.next:depot;
    if(!within(scene,at,choice.at==='truck'?1.56:1.8))return fail('Travel to '+(choice.at==='truck'?'the blue co-op truck':at.name)+' first.');
    if(own){
      if(scene.mode!=='drive'||scene.vehicle!=='truck'||!within(scene,scene.truck,.22))return fail('Drive the checked-out blue truck to this stop.');
    }else if(scene.mode!=='walk')return fail('Step out and meet dispatch on foot.');
    const f=writable(site),actorName=person(site,id);
    const unreported=f.custody?.kind==='theft'&&!recorded(f.incident);
    let message;
    switch(request.action){
      case 'enrol':
        f.roster[id]={ready:world.week+quote.induction.weeks,joined:world.week};
        message=actorName+' signed a relief agreement with the transport cooperative. Dispatch induction ends in week '+f.roster[id].ready+'.';break;
      case 'checkout':case 'take':{
        const stolen=request.action==='take';
        const pickup={x:scene.truck.x,y:scene.truck.y};
        f.custody={actor:id,token:f.serial+1,kind:stolen?'theft':'work',week:world.week,stop:stops.indexOf(quote.next),pickup,anchor:{...pickup},delivered:false};
        if(!stolen&&root.EarthMarket){
          const load=root.EarthMarket.freight(site,quote.next.good,'load',world.week);
          if(!load.ok){delete f.custody;return fail(load.message);}
        }
        if(stolen)message=openIncident(world,site,id,scene);
        else message='Dispatch assigned '+actorName+' the blue truck and a delivery for '+quote.next.name+'.';break;
      }
      case 'deliver':
        if(f.custody.stock){
          const unload=root.EarthMarket?.freight(site,quote.next.good,'deliver',world.week);
          if(!unload?.ok)return fail(unload?.message||'Reload the exchange to unload the registered freight.');
        }else site[quote.next.good]=Math.min(Number.MAX_SAFE_INTEGER,site[quote.next.good]+1);
        f.custody.delivered=true;f.custody.anchor={x:scene.x,y:scene.y};
        f.servedWeek=world.week;
        message=actorName+' delivered the co-op order to '+quote.next.name+'. Community stores received 1 '+quote.next.good+'.';break;
      case 'park':
        f.custody.anchor={x:scene.x,y:scene.y};message=unreported?'The blue truck is parked. Dispatch still has no signed handover.':actorName+' parked the blue truck. Dispatch recorded this kerb for the next pickup.';break;
      case 'return':
        if(f.custody.stock){
          const refund=root.EarthMarket?.freight(site,f.custody.stock,'return',world.week);
          if(!refund?.ok)return fail(refund?.message||'Reload the exchange to receive this cargo.');
        }
        delete f.custody;f.parkedWeek=world.week;
        message=(unreported?'Dispatch recovered the blue truck at the exchange. ':actorName+' returned the blue truck at the exchange. ')+quote.driver+' can resume the co-op route.';break;
      case 'repair':
        delete f.incident;world.effort--;site.trust=Math.min(100,site.trust+2);
        message=actorName+' helped the dispatch crew cover the missed work. The restriction is lifted and the community regained 2 trust.';break;
    }
    if(request.action!=='take')entry(f,world.week,unreported?'driver':id,message,['return','repair'].includes(request.action)?'driver':null);f.serial++;
    return {ok:true,message,action:request.action};
  }
  function tick(world,site){
    const f=site.fleet,held=f?.custody,i=f?.incident;
    const notes=[];
    if(i?.operator&&!recorded(i)){
      // Someone who actually saw the handover can report on a later visit to
      // the exchange. Absence, a changed identity or a different duty delays it.
      const source=i.witnesses.find(w=>isSame(site,w,w.id)&&root.EarthCommunityLife?.present?.(site,w.id)!==false&&
        site.autonomy?.people?.[w.id]?.history?.[0]?.week===world.week-1&&site.autonomy.people[w.id].history[0].venue==='market');
      if(source){notes.push(report(world,site,source));f.serial++;}
      else if(!held&&world.week>=i.week+4){
        const text='Dispatch closed the recovered-truck enquiry without identifying an operator.';
        delete f.incident;f.serial++;entry(f,world.week,'driver',text);return [text];
      }
    }
    if(!held&&f?.incident?.independent&&recorded(f.incident)&&world.week>=f.incident.week+2&&site.food>0){
      const actor=f.incident.actor,gain=Math.min(2,100-site.trust);
      const message=person(site,actor)+' volunteered a dispatch shift after the truck was returned. The co-op lifted the restriction and the town regained '+gain+' trust.';
      site.trust+=gain;delete f.incident;f.serial++;entry(f,world.week,actor,message,'driver');return [message];
    }
    if(!held||held.week>=world.week||f.review===world.week)return notes;
    f.review=world.week;f.serial++;
    let message;
    if(held.kind==='theft'){
      const cost=Math.min(site.funds,1);site.funds-=cost;
      message=driver(site)+' organised cover for the missing truck. The transport cooperative recovered it at the exchange.'+(cost?' Cover cost 1 fund.':' The crew covered the run on foot.');
      delete f.custody;f.parkedWeek=world.week;
    }else if(world.week>held.week+1){
      if(held.stock&&!root.EarthMarket?.freight(site,held.stock,'return',world.week)?.ok)return [];
      message='The relief run ended. Dispatch brought the blue truck back to the market exchange.';
      delete f.custody;f.parkedWeek=world.week;
    }else message='Dispatch is waiting for '+person(site,held.actor)+' to return the truck. The regular driver is covering the exchange.';
    entry(f,world.week,held.kind==='theft'&&!recorded(i)?'driver':held.actor,message,'driver');return [...notes,message];
  }
  function valid(site,week){
    const f=site.fleet;if(f===undefined)return true;
    if(!f||!whole(f.serial,0)||!f.roster||Array.isArray(f.roster)||typeof f.roster!=='object'||!Array.isArray(f.records)||f.records.length>8)return false;
    const people=crew(site),known=id=>people.includes(id)||Boolean(root.EarthAgency?.canPlay?.(site,id));
    if(!Object.entries(f.roster).every(([id,row])=>known(id)&&whole(row?.ready,2,week+3)&&(row.joined==null||whole(row.joined,1,week)&&whole(row.ready-row.joined,1,3))))return false;
    if(!f.records.every(e=>e&&known(e.actor)&&(e.otherId==null||known(e.otherId)&&e.otherId!==e.actor)&&whole(e.week,1,week)&&typeof e.text==='string'&&e.text.length<=400))return false;
    if(['servedWeek','parkedWeek','review','regularWeek','independentWeek'].some(k=>f[k]!==undefined&&!whole(f[k],1,week)))return false;
    if(f.incident&&(!known(f.incident.actor)||!whole(f.incident.week,1,week)||
      f.incident.independent!=null&&(f.incident.independent!==true||f.independentWeek!==f.incident.week)))return false;
    if(f.incident?.operator){
      const i=f.incident;
      const stamp=p=>p&&known(p.id)&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=200&&(p.key===null||typeof p.key==='string'&&p.key.length>0&&p.key.length<=1040);
      if(!stamp(i.operator)||i.operator.id!==i.actor||!Array.isArray(i.witnesses)||i.witnesses.length>40||
         !i.witnesses.every(w=>stamp(w)&&w.id!==i.actor)||new Set(i.witnesses.map(w=>w.id)).size!==i.witnesses.length||
         !Array.isArray(i.statements)||i.statements.length>128||!i.statements.every(r=>stamp(r.listener)&&stamp(r.source)&&
           whole(r.week,i.week,week)&&i.witnesses.some(w=>w.id===r.source.id&&w.key===r.source.key&&w.name===r.source.name))||
         new Set(i.statements.map(s=>s.listener.key||s.listener.id+'/'+s.listener.name)).size!==i.statements.length||
         i.report&&(![i.operator,...i.witnesses].some(s=>s.id===i.report.source&&s.name===i.report.sourceName)||
           !whole(i.report.week,i.week,week)||!whole(i.report.loss,0,4)))return false;
    }
    const c=f.custody;
    return !c||known(c.actor)&&whole(c.week,1,week)&&whole(c.stop,0,stops.length-1)&&location(c.anchor)&&location(c.pickup)&&
      whole(c.token,1,f.serial)&&typeof c.delivered==='boolean'&&['work','theft'].includes(c.kind)&&(c.stock===undefined||c.kind==='work'&&!c.delivered&&c.stock===stops[c.stop].good)&&(c.kind!=='theft'||f.incident?.actor===c.actor&&!c.delivered);
  }
  root.EarthFleet=Object.freeze({view,assignment,run,tick,valid,identified:(site,id)=>recorded(site.fleet?.incident)&&operatorHere(site,site.fleet.incident,id),incidentTopics,incidentReply,regular,finishRegular,closeWeek,dispute,finishDispute,depot,stops});
})(typeof window==='undefined'?globalThis:window);
