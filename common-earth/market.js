/* The district owns its pantry, treasury and depot. The staffed exchange owns a
   separate shelf and till. Every local trade transfers the quoted physical unit
   between those two accounts. Partner cargo remains on its original manifest. */
(function(root){
  'use strict';
  const goods=['food','materials'],accounts=['food','materials','funds'];
  const names={food:'Food',materials:'Materials',funds:'Funds'};
  function quantity(good,n){
    const unit=n===1?({funds:'fund',materials:'material'}[good]||good):good;
    return n+' '+unit;
  }
  const limit=Number.MAX_SAFE_INTEGER;
  const lockCapacity=6;
  const own=(o,k)=>o!=null && Object.hasOwn(o,k);
  const int=(n,min=0,max=limit)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const dict=value=>value!=null&&typeof value==='object'&&!Array.isArray(value);
  const fail=message=>({ok:false,message});
  const actorId=site=>root.EarthAgency?.actorId?.(site)||site.agency?.actor||'steward';
  const actorName=(site,id)=>root.EarthPersonas?.profile?.(site,id)?.name || site.residents?.find(p=>p.id===id)?.name || 'Community steward';
  function fresh(week){
    return {serial:0,lastWeek:week,till:8,shelf:{food:3,materials:2},locked:{funds:0,materials:0},history:[]};
  }
  function openFieldStall(week){
    const stall=fresh(week);stall.serial=1;stall.till=0;stall.shelf={food:0,materials:0};
    log(stall,week,'The founding households opened a stall. Its till and shelves await the first delivery.');
    return stall;
  }
  function policy(site){
    const shops=root.CommonEarthSim?.marketPlan?.(site)?.markets?.filter(m=>m.base>0).length??0;
    const actual=site.buildings||[];
    return {capacity:8+Math.min(3,shops)*2,
      target:{food:Math.min(6,2+Math.ceil(site.population/8)),materials:3+Math.min(2,site.construction?.length||0)},
      garden:actual.some(b=>['garden','wetland','fishingDock'].includes(b.kind)),
      yard:actual.some(b=>['pier','workshop'].includes(b.kind)),shops};
  }
  function round(site,week,terms){
    // A town keeps its own visiting day. Neighbouring economies can have
    // different shortages even before they connect a freight route.
    const shift=Math.abs(Math.round((site.lat||0)*5+(site.lon||0)*7))%6;
    const day=week+shift,customerGood=day%3===0?'materials':'food',supplyGood=day%2?'materials':'food';
    const abundant=supplyGood===site.specialty||(supplyGood==='food'?terms.garden:terms.yard);
    return {customerGood,demand:1+Number(terms.shops>0),supplyGood,supply:1+Number(terms.shops>0)+Number(abundant),
      wholesale:supplyGood==='food'?1:2};
  }
  function fair(good,count,target){
    const usual=good==='food'?2:3;
    return usual+(count<target-1?1:count>=target+2?-1:0);
  }
  function plan(good,terms){
    const food=good==='food',extra=food?terms.garden:terms.yard;
    return {good,title:food?'Fund the gleaning round':'Fund timber recovery',cost:food?{funds:2,materials:1}:{funds:2,food:1},amount:extra?4:3,
      source:food?(extra?'Garden and waterfront crews can reach one extra crate.':'The crew gathers edible surplus from local allotments.'):
        (extra?'The depot or workshop adds a fourth load of usable parts.':'The crew salvages used packing timber from the exchange.')};
  }
  function offer(action,good,title,reason,price=0,detail=''){
    return {action,good,title,available:!reason,reason,price,detail};
  }
  function inTruck(site,good){
    const custody=site.fleet?.custody;
    return custody?.kind==='work' && !custody.delivered && custody.stock===good?1:0;
  }
  function wagesHeld(site){
    return root.EarthPurses?.escrow?.(site)??2*Object.keys(site.purses?.tickets||{}).length;
  }
  function privateTill(site){return site?.exchange?.till??8;}
  function tillRoom(site,book){
    return limit-book.till-inTruck(site,'funds')-wagesHeld(site);
  }
  function giftQuote(site,good,book,terms){
    const ready=book.shelf[good],price=fair(good,ready,terms.target[good])+1;
    const reason=ready===0?'The stall has sold its last unit. Fund the next supply round or collect your own.':
      tillRoom(site,book)<price?'The stall till is full. Sell a unit before buying again.':
      site[good]>=limit?'Make space in the district store.':'';
    return {price,reason,available:!reason};
  }
  function personalQuote(world,site,good){
    if(!world||!site||!goods.includes(good))return {price:0,reason:'Choose food or materials from the stall.',available:false};
    return giftQuote(site,good,site.exchange||fresh(world.week),policy(site));
  }
  function personal(world,site,action,good,amount,id=site&&actorId(site),source='personal'){
    if(!world||!site||!int(world.week,1)||!int(amount,1))return fail('Review the personal offer at the exchange.');
    const book=site.exchange||fresh(world.week);
    if(book.serial>=limit&&action!=='returnWage')return fail('The stall cannot record another receipt.');
    const name=actorName(site,id);
    let message;
    if(action==='buyGift'){
      const offer=personalQuote(world,site,good);
      if(!offer.available||offer.price!==amount)return fail(offer.reason||'The shelf price has changed.');
      book.shelf[good]--;site[good]++;book.till+=amount;
      message=name+' supplied the district with '+quantity(good,1)+' from the stall using '+quantity('funds',amount)+' from '+
        (source==='household'?'the household food fund.':'their personal purse.');
    }else if(action==='reserveWage'){
      if(amount!==2||book.till<amount)return fail('The stall needs two free funds to pay for this shift.');
      book.till-=amount;message='The exchange set aside '+amount+' funds for '+name+'’s work.';
    }else if(action==='returnWage'){
      if(amount!==2||!site.purses?.tickets?.[id]||wagesHeld(site)<amount||tillRoom(site,book)<0)
        return fail('Review the refundable shift held for this person.');
      book.till+=amount;message=name+' returned an unfinished shift. The exchange recovered '+amount+' funds.';
    }else return fail('Choose a personal transaction offered by the exchange.');
    site.exchange=book;book.serial=Math.min(limit,book.serial+1);log(book,world.week,message);
    return {ok:true,message};
  }
  function canLoadFreight(site,good){
    if(!site||!accounts.includes(good)||site.fleet?.custody?.stock!=null)return false;
    const book=site.exchange||fresh(site.founded||1);
    return (good==='funds'?book.till:book.shelf[good])>=1;
  }
  function freight(site,good,direction,week=site?.fleet?.custody?.week||site?.exchange?.lastWeek||site?.founded||1){
    const custody=site?.fleet?.custody;
    if(!accounts.includes(good)||custody?.kind!=='work'||custody.delivered||!int(week,1))
      return fail('Check the current authorised freight manifest.');
    if(direction==='load'){
      if(!canLoadFreight(site,good))return fail('The stall has no free '+good+' for this delivery.');
    }else{
      if(custody.stock!==good||!site.exchange)return fail('The truck is not carrying that unit.');
      if(direction==='deliver' && site[good]>=limit)return fail('Make space at the destination or return the freight to the stall.');
      if(!['deliver','return'].includes(direction))return fail('Choose a current freight transfer.');
    }
    const book=site.exchange??=fresh(week);
    let message;
    if(direction==='deliver'){
      site[good]++;delete custody.stock;
      message='The co-op truck delivered '+quantity(good,1)+' from the stall into the community store.';
    }else{
      const change=direction==='load'?-1:1;
      if(good==='funds')book.till+=change;else book.shelf[good]+=change;
      if(direction==='load'){custody.stock=good;message='Dispatch loaded '+quantity(good,1)+' from the stall into the co-op truck.';}
      else{delete custody.stock;message='Dispatch returned '+quantity(good,1)+' of undelivered cargo to the stall.';}
    }
    book.serial=Math.min(limit,book.serial+1);log(book,week,message);
    return {ok:true,message};
  }
  function offers(world,site,book,terms){
    const options=[];
    for(const good of goods){
      const ready=book.shelf[good],target=terms.target[good],quoted=giftQuote(site,good,book,terms),ask=quoted.price,bid=fair(good,ready+1,target);
      options.push(offer('buy',good,'Buy 1 · '+quantity('funds',ask),quoted.reason||
        (site.funds<ask?'The treasury is short by '+quantity('funds',ask-site.funds)+'.':''),ask));
      options.push(offer('sell',good,'Sell 1 · '+quantity('funds',bid),site[good]<1?'Bring '+quantity(good,1)+' from your district store.':
        ready+inTruck(site,good)>=terms.capacity?'The stall shelf is full. Its next customer round can make room.':
        book.till<bid?'The stall needs customer funds or a purchase before it can pay.':
        site.funds>limit-bid?'Make space in the district treasury.':'',bid));
    }
    for(const good of ['funds','materials']){
      options.push(offer('hold',good,'Set aside '+quantity(good,1),site[good]<1?'No free '+good+' to set aside.':
        book.locked.funds+book.locked.materials>=lockCapacity?'The six spaces in the project chest are occupied.':''));
      options.push(offer('release',good,'Release '+quantity(good,1),book.locked[good]<1?'No '+good+' set aside here.':
        site[good]>=limit?'The district store is full.':''));
    }
    if(book.batch){
      const batch=book.batch;
      const room=Object.entries(batch.cost).every(([k,n])=>site[k]<=limit-n);
      options.push(offer('cancel',batch.good,'Recall the delivery crew',world.week>=batch.due?'The round has already finished.':
        !room?'Spend or sell enough stock to make room for the refund.':'',0,'Recover the entire advance before the next weekly close.'));
    }else{
      for(const good of goods){
        const p=plan(good,terms),missing=Object.entries(p.cost).filter(([k,n])=>n>site[k]).map(([k,n])=>quantity(k,n-site[k]));
        options.push(offer('fund',good,p.title,missing.length?'Needs '+missing.join(' and ')+'.':'',p.amount,
          'Advance '+Object.entries(p.cost).map(([k,n])=>quantity(k,n)).join(' and ')+'. Receive '+quantity(good,p.amount)+' in week '+(world.week+1)+'. '+p.source));
      }
    }
    return options;
  }
  function manifests(world,site,book){
    const held=[],incoming=[],spent=[],external=[];
    const lot=(list,good,amount,source,due)=>{if(amount>0&&accounts.includes(good))list.push({good,amount,source,due});};
    for(const good of ['funds','materials'])lot(held,good,book.locked[good],'Project chest');
    lot(held,'food',site.strategy?.reserve||0,'Community larder');
    const crates=site.provisions?.crates||[];
    for(const reserved of [true,false]){
      const amount=crates.reduce((sum,crate)=>sum+(Boolean(crate.reserved)===reserved?crate.remaining:0),0);
      lot(held,'food',amount,reserved?'Sealed crates for household shortages':'Sealed crates awaiting opening');
    }
    if(site.pursuits?.ticket?.kind==='cart')lot(held,'materials',2,'Handcart work order');
    const b=book.batch;
    if(b){
      if(b.due>world.week){
        for(const [good,n] of Object.entries(b.cost))lot(held,good,n,'Delivery crew advance');
        lot(incoming,b.good,b.amount,'Paid '+(b.good==='food'?'gleaning':'timber recovery')+' round',b.due);
      }else lot(held,b.good,b.amount,'Finished delivery awaiting store space');
    }
    for(const job of site.construction||[]){
      for(const [good,n] of Object.entries(job.paid||{}))lot(spent,good,n,job.name||'Commissioned worksite');
    }
    for(const route of world.routes||[]){
      for(const shipment of route.shipments||[])if(shipment.to===site.id){
        const source=world.sites?.find(s=>s.id===shipment.from)?.name||'Linked community';
        lot(incoming,shipment.good,shipment.amount,source,shipment.due);
      }
    }
    for(const [id,state] of Object.entries(world.partners||{})){
      const a=state.agreement;if(!a||a.homeId!==site.id)continue;
      const group=root.EarthPartners?.get?.(world,site,id);if(!group)continue;
      external.push({name:group.name,phase:a.phase,good:group.importGood||null,paid:a.paid||0,balance:a.balance||0,due:a.due,exportGood:group.exportGood});
      if(a.phase==='return')lot(incoming,group.exportGood,a.returned,group.name,a.due);
      if(a.phase==='outbound'&&a.reserved)lot(incoming,group.exportGood,a.reserved,group.name,a.due+a.days);
    }
    return {held,incoming,spent,external};
  }
  function view(world,site,{flow={},extraIncoming=[]}={}){
    if(!site||!world)return null;
    const book=site.exchange||fresh(world.week),terms=policy(site),lots=manifests(world,site,book);
    for(const item of extraIncoming)if(accounts.includes(item.good)&&int(item.amount,1)&&int(item.due,world.week))lots.incoming.push({...item});
    const total=(rows,good)=>rows.reduce((sum,x)=>sum+(x.good===good?x.amount:0),0);
    return {siteId:site.id,generation:site.foundingRevision||0,actorId:actorId(site),week:world.week,serial:book.serial,
      rows:accounts.map(good=>({good,name:names[good],stock:site[good]+total(lots.held,good),held:total(lots.held,good),free:site[good],
        incoming:total(lots.incoming,good),flow:flow[good]??null})),...lots,
      till:book.till,wagesHeld:wagesHeld(site),shelf:{...book.shelf},capacity:terms.capacity,target:{...terms.target},locked:{...book.locked},lockCapacity,
      get local(){return root.EarthResources?.view(world,site,book,tillRoom(site,book),actorId(site))||null;},
      batch:book.batch?{...book.batch,cost:{...book.batch.cost}}:null,options:offers(world,site,book,terms),
      history:book.history.map(entry=>({...entry})),loaded:accounts.find(good=>inTruck(site,good))||null,nextRound:round(site,world.week+1,terms),populationMeals:Math.ceil(site.population/5)};
  }
  function flowDetail(site,rows,world){
    const parts=[];
    function add(good,amount,source){if(amount)parts.push({good,amount,source});}
    for(const [good,n] of Object.entries({funds:2,food:3,materials:1}))add(good,n,'Ordinary district activity');
    if(accounts.includes(site.specialty))add(site.specialty,1,'Local specialty');
    add('food',-Math.ceil(site.population/5),'Household shares');
    const facilities=site.buildings||[];
    for(const [kind,good,n,source] of [['garden','food',3,'Gardens'],['wetland','food',1,'Water commons'],['workshop','materials',2,'Repair workshops']]){
      add(good,n*facilities.filter(b=>b.kind===kind).length,source);
    }
    const plan=root.CommonEarthSim?.marketPlan?.(site);
    add('funds',plan?.baseFunds||0,'Operating market fees');
    const placed=plan?root.CommonEarthSim?.productiveLinks?.(site,plan)||[]:[];
    const links=root.EarthCareers?.laneWorker?placed.filter(link=>root.EarthCareers.laneWorker(site,world,link)):placed;
    for(const good of ['food','funds']){
      add(good,links.filter(l=>l.resource===good).length,'Neighbouring facilities');
    }
    if(site.tech?.includes('apprenticeship'))add('materials',1,'District apprentices');
    // The simulation supplies the authoritative net. Precincts, career duties,
    // crew allocations and council policies may add to or displace basic work.
    for(const row of rows){
      if(row.flow===null)continue;
      const counted=parts.reduce((sum,p)=>sum+(p.good===row.good?p.amount:0),0);
      add(row.good,row.flow-counted,'Other local work and civic arrangements');
    }
    return parts;
  }
  function atExchange(site,id,p){
    if(!p||p.siteId!==site.id||p.actor!==id||p.target!=='market'||!['walk','drive'].includes(p.mode))return false;
    return [p.x,p.y,p.tx,p.ty].every(Number.isFinite) && Math.hypot(p.x-p.tx,p.y-p.ty)<(p.mode==='drive'?1.9:1.56);
  }
  function log(book,week,text){
    book.history.unshift({week,text:text.slice(0,512)});book.history.length=Math.min(8,book.history.length);
    return text;
  }
  function run(world,site,r,scene){
    if(!site||!world||!r||r.siteId!==site.id||r.generation!==(site.foundingRevision||0)||r.week!==world.week||
      r.actorId!==actorId(site)||(site.exchange?.serial||0)!==r.serial)return fail('The town, worker, week or market changed. Review the current offer.');
    const restricted=root.EarthCommunityLife?.permission?.(world,site,'exchange',[r]);
    if(restricted)return fail(restricted);
    const initial=site.exchange||fresh(world.week);
    if(root.EarthResources?.isAction(r.action)){
      if(initial.serial>=limit)return fail('The stall cannot record another receipt.');
      const result=root.EarthResources.run(world,site,r,scene,initial,tillRoom(site,initial),actorName(site,r.actorId));
      if(result.ok){site.exchange=initial;initial.serial++;log(initial,world.week,result.message);}
      return result;
    }
    if(!atExchange(site,r.actorId,scene))return fail('Return to the exchange counter to complete this transaction.');
    const terms=policy(site);
    const chosen=offers(world,site,initial,terms).find(x=>x.action===r.action&&x.good===r.good);
    if(!chosen||!chosen.available||chosen.price!==r.price||initial.serial>=limit)return fail(chosen?.reason||'The terms changed. Review the current offer.');
    const book=site.exchange??=initial,name=actorName(site,r.actorId),good=chosen.good,cost=chosen.price;
    let text;
    switch(r.action){
      case 'buy':
        site.funds-=cost;site[good]++;book.shelf[good]--;book.till+=cost;
        text=name+' bought '+quantity(good,1)+' from the stall for '+quantity('funds',cost)+'.';break;
      case 'sell':
        site[good]--;site.funds+=cost;book.shelf[good]++;book.till-=cost;
        text=name+' sold '+quantity(good,1)+' to the stall for '+quantity('funds',cost)+'.';break;
      case 'hold':case 'release':{
        const units=r.action==='hold'?1:-1;
        site[good]-=units;book.locked[good]+=units;
        text=name+(units===1?' set aside '+quantity(good,1)+' for a future project.':' released '+quantity(good,1)+' from the project chest.');break;
      }
      case 'fund':{
        const p=plan(good,terms);
        for(const [k,n] of Object.entries(p.cost))site[k]-=n;
        book.batch={good,amount:p.amount,cost:p.cost,due:world.week+1};
        text=name+' advanced '+Object.entries(p.cost).map(([k,n])=>quantity(k,n)).join(' and ')+' for '+quantity(good,p.amount)+' due in week '+book.batch.due+'.';break;
      }
      case 'cancel':
        for(const [k,n] of Object.entries(book.batch.cost))site[k]+=n;
        delete book.batch;text=name+' recalled the delivery crew. All advanced supplies returned to the district.';break;
      default:return fail('Choose a current transaction.');
    }
    book.serial++;log(book,world.week,text);
    return {ok:true,message:text};
  }
  function tick(world,site){
    const b=site.exchange,week=world.week;
    const spoilage=root.EarthResources?.ageStores(world,site),events=[];
    if(spoilage&&Object.keys(site.resourceLedger.lastLoss.bins).length)events.push(spoilage);
    if(!b||b.lastWeek>=week)return events;
    const terms=policy(site);b.lastWeek=week;b.serial=Math.min(limit,b.serial+1);
    if(spoilage)log(b,week,spoilage);
    if(b.batch&&b.batch.due<=week){
      const order=b.batch,delivered=Math.min(order.amount,limit-site[order.good]);
      site[order.good]+=delivered;order.amount-=delivered;
      if(delivered)events.push(log(b,week,'The paid crew delivered '+delivered+' '+order.good+' to '+site.name+'.'));
      if(!order.amount)delete b.batch;
    }
    // Private customers buy from the stall only. They are visitors and
    // contractors with their own money; resident household meals use district food.
    const {customerGood,demand,supplyGood,supply,wholesale}=round(site,week,terms);
    const sold=Math.min(demand,b.shelf[customerGood]),unit=fair(customerGood,b.shelf[customerGood],terms.target[customerGood])+1;
    const paid=Math.max(0,Math.min(sold,Math.floor(tillRoom(site,b)/unit)));
    b.till+=paid*unit;b.shelf[customerGood]-=paid;
    // Alternate suppliers. The contractor parks unsold produce or reclaimed
    // timber at their own depot unless the stall actually pays for the load.
    const restock=Math.max(0,Math.min(supply,terms.target[supplyGood]+1-b.shelf[supplyGood],
      terms.capacity-b.shelf[supplyGood]-inTruck(site,supplyGood),Math.floor(b.till/wholesale)));
    b.till-=restock*wholesale;b.shelf[supplyGood]+=restock;
    if(paid||restock)log(b,week,'Visitor purchases · '+quantity(customerGood,paid)+' for '+quantity('funds',paid*unit)+'. Supplier delivery · '+
      quantity(supplyGood,restock)+' for '+quantity('funds',restock*wholesale)+'.');
    const local=root.EarthResources?.tick(world,site,b,tillRoom(site,b));
    if(local)log(b,week,local);
    return events;
  }
  function makerInput(world,site,id,confirm){
    const book=site.exchange||fresh(world.week);
    if(book.serial>=limit||!root.EarthResources?.makerInput)return null;
    const room=tillRoom(site,book),offer=root.EarthResources.makerInput(world,site,id,room);
    if(confirm===undefined)return offer;
    if(!offer?.available||offer.price!==confirm)return null;
    root.EarthResources.makerInput(world,site,id,room,true);
    book.till+=confirm;book.serial++;site.exchange=book;
    log(book,world.week,'A resident maker purchased one lot of '+offer.name+' from the stall for '+quantity('funds',confirm)+'.');
    return offer;
  }
  function resourceOpportunity(world,site,self){
    const personal=root.EarthResidentShops?.opportunity?.(world,site,self);
    if(!site.resourceLedger||!root.EarthResources)return personal||null;
    const book=site.exchange||fresh(world.week);
    if(book.serial>=limit)return personal||null;
    const publicWork=root.EarthResources.crewOpportunity(world,site,self,book,tillRoom(site,book));
    return personal&&personal.score>(publicWork?.score||0)?personal:publicWork;
  }
  function resourceWork(world,site,self,plan){
    if(plan?.privateAction)return root.EarthResidentShops?.work?.(world,site,self,plan)||null;
    if(!site.resourceLedger||!root.EarthResources)return null;
    const book=site.exchange||fresh(world.week);
    if(book.serial>=limit)return null;
    const decision=root.EarthResources.crewWork(world,site,self,book,tillRoom(site,book),actorName(site,self.id));
    if(decision){site.exchange=book;book.serial++;log(book,world.week,decision.reason);}
    return decision;
  }
  function valid(site,week){
    if(root.EarthResources && !root.EarthResources.valid(site,week))return false;
    const b=site.exchange;if(b===undefined)return !wagesHeld(site)&&!accounts.some(good=>inTruck(site,good));
    if(!dict(b)||!int(b.serial,1)||!int(b.lastWeek,1,week)||!int(b.till)||!dict(b.shelf)||!dict(b.locked)||
      !goods.every(k=>int(b.shelf[k],0,14-inTruck(site,k)))||tillRoom(site,b)<0||!['funds','materials'].every(k=>int(b.locked[k],0,lockCapacity))||
      b.locked.materials+b.locked.funds>lockCapacity||!Array.isArray(b.history)||b.history.length>8)return false;
    if(!b.history.every(h=>dict(h)&&int(h.week,1,week)&&typeof h.text==='string'&&h.text.length>0&&h.text.length<=512))return false;
    if(b.batch!==undefined){
      const order=b.batch;
      if(!dict(order)||!goods.includes(order.good)||!int(order.amount,1,4)||!int(order.due,1,week+1)||!dict(order.cost))return false;
      const other=order.good==='food'?'materials':'food';
      if(Object.keys(order.cost).length!==2||order.cost.funds!==2||order.cost[other]!==1)return false;
      if(order.due>week&&order.amount<3)return false;
    }
    return true;
  }
  root.EarthMarket=Object.freeze({openFieldStall,view,flowDetail,run,tick,valid,canLoadFreight,freight,privateTill,personalQuote,personal,quantity,makerInput,resourceOpportunity,resourceWork});
})(typeof window==='undefined'?globalThis:window);
