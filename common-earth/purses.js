/* The employer sets aside the whole wage before anyone accepts a shift.
   Personal earnings, exchange cash and the household food fund are separate. */
(function(root){
  'use strict';
  const wage=2,openings=2,limit=Number.MAX_SAFE_INTEGER,goods=['food','materials'];
  const int=(v,low=0,high=limit)=>Number.isSafeInteger(v)&&v>=low&&v<=high;
  const obj=v=>v!=null&&typeof v==='object'&&!Array.isArray(v);
  const own=(m,id)=>m&&Object.hasOwn(m,id)?m[id]:null;
  const fail=message=>({ok:false,message});
  const funds=(n,kind='')=>n+(kind?' '+kind:'')+(n===1?' fund':' funds');
  const current=site=>root.EarthAgency?.actorId(site)||site.agency?.actor||'steward';
  const local=(site,id)=>typeof id==='string'&&(root.EarthAgency?.canPlay(site,id)??site.residents.some(p=>p.id===id));
  const name=(site,id)=>root.EarthPersonas?.profile(site,id)?.name||site.residents.find(p=>p.id===id)?.name||(id==='steward'?'Community steward':id);
  const empty=()=>({balance:0,earned:0,lastWeek:0,entries:[]});
  const account=(site,id)=>own(site.purses?.people,id);
  const ticket=(site,id)=>own(site.purses?.tickets,id);
  const escrow=site=>wage*Object.keys(site?.purses?.tickets||{}).length;
  const committed=(site,id,week)=>Boolean(ticket(site,id)||account(site,id)?.lastWeek===week);
  const book=site=>site.purses||={serial:0,household:0,people:{},tickets:{}};
  const named=(site,id)=>book(site).people[id]||=empty();
  const limitBook=b=>b.serial=Math.min(limit,b.serial+1);
  function receipt(site,id,week,action,amount,text){
    const b=book(site),p=named(site,id);
    p.entries.unshift({week,action,amount,balance:p.balance,text});p.entries.length=Math.min(8,p.entries.length);
    limitBook(b);return text;
  }
  function paid(site,week){
    return Object.values(site.purses?.people||{}).filter(p=>p.lastWeek===week).length;
  }
  function free(site,week){
    const cash=root.EarthMarket?.privateTill?.(site)??0;
    return Math.max(0,Math.min(openings-paid(site,week)-Object.keys(site.purses?.tickets||{}).length,Math.floor(cash/wage)));
  }
  function elsewhere(site,id,week){
    const row=site.autonomy?.people?.[id],career=site.careers?.[id];
    if(root.EarthCareers?.specialistShift?.(site,id,week)||career?.specialistRelief?.week>=week)return 'A specialist relief shift already needs this person.';
    const coverThrough=root.EarthCareers?.coverCommitment?.(site,id,week);
    if(coverThrough!=null)return 'This person agreed to cover a colleague’s former duties through week '+coverThrough+'.';
    if(career?.lastPracticeWeek===week||row?.pastime?.lastWeek===week||row?.contribution?.week===week)return 'The worker used this week’s personal work session.';
    if(site.shift?.residentId===id||site.shift&&id===current(site))return 'Finish the accompanied shift first.';
    if(career?.training?.pace==='intensive'&&!career.training.paused)return 'The intensive study timetable takes this person’s working time.';
    if(Object.values(site.autonomy?.projects?.owners||{}).some(goal=>goal.volunteer?.from===id&&goal.volunteer.week>=week-1))return 'This person promised a shared project session.';
    const recent=row?.history?.[0];
    if(recent?.week===week&&['cover','project','learn','apply','gather','preserve','wage','relief','visit','host','commitment'].includes(recent.kind))
      return 'This person committed this week’s discretionary session elsewhere.';
    return '';
  }
  function clerk(site,id,good){
    const occupation=good==='food'?'food':'repair',foundingWork=['food','repair','exchange'];
    const other=site.residents.filter(p=>p.id!==id);
    return other.find(p=>(root.EarthCareers?.work(site,p.id)?.occupation||foundingWork[p.slot])===occupation)||
      other.find(p=>p.slot===2)||other[0];
  }
  function assignment(world,site,id){
    const good=(world.week+(site.residents.find(p=>p.id===id)?.slot||0))%2?'food':'materials';
    const person=clerk(site,id,good);return person?{good,clerkId:person.id}:null;
  }
  function quote(world,site,good){
    return root.EarthMarket?.personalQuote?.(world,site,good)||{reason:'The exchange ledger is unavailable.',available:false,price:0};
  }
  function view(world,site,id=site&&current(site)){
    if(!site||!world||!local(site,id))return null;
    const p=account(site,id)||empty(),b=site.purses,job=ticket(site,id),mine=site.id===world.activeId&&id===current(site),company=root.EarthMarket;
    const result={week:world.week,actorId:current(site),siteId:site.id,generation:site.foundingRevision||0,serial:b?.serial||0,
      marketSerial:site.exchange?.serial||0,personId:id,name:name(site,id),balance:p.balance,lastWeek:p.lastWeek,household:b?.household||0,
      openings:free(site,world.week),entries:p.entries.map(e=>({...e})),shift:job?{...job,clerkName:name(site,job.clerkId)}:null,options:[]};
    if(!mine)return result;
    const desk={type:'market'};
    function add(action,good,title,detail,reason,price,venue=desk,clerkId=job?.clerkId||null){
      reason=reason||(!company?.personal||!company.privateTill?'Reload the exchange to see current terms.':'');
      result.options.push({action,good,title,detail,available:!reason,reason,venue,
        request:{week:world.week,actorId:id,siteId:site.id,generation:result.generation,serial:result.serial,marketSerial:result.marketSerial,action,good,price,
          ticketSerial:job?.serial||0,clerkId}});
    }
    if(!job){
      const work=assignment(world,site,id);
      const why=p.lastWeek===world.week?'This person collected this week’s wage. Another person can take a remaining opening, or you can check next week.':elsewhere(site,id,world.week)||
        (p.balance>limit-wage||p.earned>limit-wage?'The purse cannot receive another wage.':!work?'A local resident is needed to confirm the stock count.':
        paid(site,world.week)+Object.keys(b?.tickets||{}).length>=openings?'Both stock checks are booked. A cancellation reopens a place, and new shifts open next week.':
        !result.openings?'The exchange needs two funds in its own till. A shelf purchase or a visitor round can fund another shift.':'');
      add('start',work?.good||'food','Accept a paid stock check','Earn 2 personal funds. Visit '+(work?name(site,work.clerkId):'the resident')+' for the count, then return here before the next week.',why,wage,desk,work?.clerkId||null);
    }else{
      const expired=job.week!==world.week?'This booking expired at the weekly close. Return the reserved wage.':'';
      if(job.count===null)add('check',job.good,'Get the count from '+name(site,job.clerkId),'Meet '+name(site,job.clerkId)+' in person to confirm the current '+job.good+' count.',expired,0,{type:'resident',residentId:job.clerkId});
      else add('finish',job.good,'Report the count and collect 2 funds',name(site,job.clerkId)+' reported '+job.count+' '+job.good+'. The reserved wage goes into your own purse.',
        expired||(p.balance>limit-wage||p.earned>limit-wage?'The purse cannot receive the wage.':''),wage);
      add('cancel',job.good,'Return the shift to the exchange','The employer gets its 2 reserved funds back. The personal purse is unchanged.','',wage);
    }
    const meal=quote(world,site,'food');
    for(const good of goods){
      const item=good==='food'?meal:quote(world,site,good);
      add('buy',good,'Buy '+good+' for the town','Pay '+funds(item.price,'personal')+' for one actual shelf unit. It enters the '+(good==='food'?'pantry.':'materials store.'),
        item.reason||(p.balance<item.price?'Your purse needs '+funds(item.price-p.balance,'more')+'.':''),item.price);
    }
    add('donate','food','Donate 1 personal fund','Pool a fund with other residents to buy food for the pantry.',
      p.balance<1?'Earn a personal wage first.':result.household>=limit?'The household fund is full.':'',1);
    add('household','food','Buy food with the household fund','Spend '+funds(meal.price)+' from the household fund for one pantry food. The pool holds '+funds(result.household)+'.',
      meal.reason||(result.household<meal.price?'The household fund needs '+funds(meal.price-result.household,'more')+'.':''),meal.price);
    return result;
  }
  function near(site,id,scene,venue){
    const target=venue.type==='market'?'market':venue.residentId;
    return scene?.mode==='walk'&&scene.siteId===site.id&&scene.actor===id&&scene.target===target&&
      [scene.x,scene.y,scene.tx,scene.ty].every(Number.isFinite)&&Math.hypot(scene.x-scene.tx,scene.y-scene.ty)<=1.56;
  }
  function pay(world,site,id,good,count,clerkId){
    const p=named(site,id);
    p.balance+=wage;p.earned+=wage;p.lastWeek=world.week;
    const detail=clerkId?name(site,clerkId)+' reported '+count+' '+good:'the '+good+' stock count was '+count;
    return receipt(site,id,world.week,'wage',wage,name(site,id)+' returned the stock check. '+detail+'. The exchange paid 2 personal funds. Purse now '+p.balance+'.');
  }
  function donate(world,site,id){
    const b=book(site),p=named(site,id);p.balance--;b.household++;
    return receipt(site,id,world.week,'donate',-1,name(site,id)+' donated 1 personal fund for household food. The pool now holds '+b.household+' and their purse holds '+p.balance+'.');
  }
  function buy(world,site,id,good,price,pooled){
    const b=site.purses,p=account(site,id);
    if((pooled?b?.household:p?.balance)<price||!(pooled?b:p))return fail('Review the available funds.');
    const moved=root.EarthMarket.personal(world,site,'buyGift',good,price,id,pooled?'household':'personal');
    if(!moved.ok)return moved;
    if(pooled)b.household-=price;else p.balance-=price;
    const amount=pooled?0:-price,remaining=pooled?'Household fund now '+b.household:'Purse now '+p.balance;
    return {ok:true,message:receipt(site,id,world.week,pooled?'household':'buy',amount,name(site,id)+' used '+price+(pooled?' household':' personal')+
      ' funds for 1 shelf '+good+'. '+site.name+' now has '+site[good]+' '+good+'. '+remaining+'.')};
  }
  function refund(world,site,id,expired){
    const job=ticket(site,id);
    if(!job)return fail('This shift already closed.');
    const returned=root.EarthMarket?.personal?.(world,site,'returnWage',job.good,wage,id);
    if(!returned?.ok)return returned||fail('Reload the exchange so it can recover its held wage.');
    delete site.purses.tickets[id];
    return {ok:true,message:receipt(site,id,world.week,expired?'expired':'cancel',0,name(site,id)+'’s '+(expired?'expired':'cancelled')+
      ' stock check returned 2 reserved funds to the exchange. Their purse holds '+account(site,id).balance+'.')};
  }
  function run(world,site,request,scene){
    if(!world||!site||world.activeId!==site.id||request?.actorId!==current(site)||!local(site,request.actorId))return fail('Return to the town as the person who accepted the work.');
    const id=request.actorId,model=view(world,site,id);
    if(request.week!==world.week||request.siteId!==site.id||request.generation!==model.generation||request.serial!==model.serial)
      return fail('The worker, personal account or week changed. Check the current offer.');
    // Shelf purchases carry the exact exchange quote seen before walking over.
    // A fixed wage is already reserved, and a donation moves only personal funds.
    if(['buy','household'].includes(request.action)&&request.marketSerial!==model.marketSerial)
      return fail('The market terms changed. Review the shelf and current price.');
    const o=model.options.find(o=>o.action===request.action&&o.good===request.good);
    if(!o||!o.available||o.request.price!==request.price||o.request.ticketSerial!==request.ticketSerial||o.request.clerkId!==request.clerkId)
      return fail(o?.reason||'Review the current work ticket and price.');
    if(model.serial>=limit&&!['check','finish','cancel'].includes(o.action))return fail('The personal account book is full.');
    if(!near(site,id,scene,o.venue))return fail(o.venue.type==='market'?'Stand at the exchange counter on foot.':'Meet the named resident in person for the stock count.');
    const job=ticket(site,id),week=world.week,good=o.good;
    if(['check','finish','cancel'].includes(o.action)&&(!job||!site.exchange||!valid(site,week)||!root.EarthMarket?.valid?.(site,week)))
      return fail('The exchange could not verify this worker’s reserved wage. Reopen the current ticket.');
    if(o.action==='start'){
      const work=assignment(world,site,id),held=root.EarthMarket.personal(world,site,'reserveWage',good,wage,id);
      if(!held.ok)return held;
      const b=book(site);named(site,id);
      b.tickets[id]={week,serial:b.serial+1,good,clerkId:work.clerkId,count:null};
      return {ok:true,message:receipt(site,id,week,'start',0,'The exchange reserved 2 funds for '+name(site,id)+'. Meet '+name(site,work.clerkId)+' for the '+good+' count this week.')};
    }
    if(o.action==='check'){
      job.count=site[good];
      return {ok:true,message:receipt(site,id,week,'check',0,name(site,job.clerkId)+' gave '+name(site,id)+' the count of '+job.count+' '+good+'. Return to the exchange for payment.')};
    }
    if(o.action==='finish'){delete site.purses.tickets[id];return {ok:true,message:pay(world,site,id,good,job.count,job.clerkId)};}
    if(o.action==='cancel')return refund(world,site,id,false);
    if(o.action==='donate')return {ok:true,message:donate(world,site,id)};
    return buy(world,site,id,good,request.price,o.action==='household');
  }
  function tick(world,site){
    const events=[];
    for(const [id,job] of Object.entries(site.purses?.tickets||{})){
      if(job.week<world.week){const done=refund(world,site,id,true);if(done.ok)events.push(done.message);}
    }
    return events;
  }
  function opportunity(world,site,self){
    if(!self?.free||!local(site,self.id)||site.id===world.activeId&&self.id===current(site)||self.wasAdvised==='rest'||self.row?.path||
      !root.EarthMarket?.personal||!root.EarthMarket.privateTill||committed(site,self.id,world.week)||elsewhere(site,self.id,world.week))return null;
    // Someone must still be able to walk in and take a funded booking themselves.
    if(free(site,world.week)<2)return null;
    const meals=Math.ceil(site.population/5);
    const balance=account(site,self.id)?.balance||0,fit=self.profile.aptitudes?.organisation??45,traits=self.traits;
    if(site.food>=meals*2||balance>=8||fit<40||traits.initiative+traits.patience<85)return null;
    return {score:83+fit/6+traits.initiative/9,reason:'The pantry holds less than two weeks of meals. The exchange has offered two funds for a stock count.'};
  }
  function workWeek(world,site,self){
    const o=opportunity(world,site,self);
    if(!o)return null;
    const id=self.id,week=world.week,p=account(site,id)||empty();
    if(p.balance>limit-wage||p.earned>limit-wage)return null;
    const held=root.EarthMarket.personal(world,site,'reserveWage','food',wage,id);
    if(!held.ok)return null;
    let text=pay(world,site,id,'food',site.food,null);
    const pocket=account(site,id),meal=quote(world,site,'food'),traits=self.traits;
    // Contributing is a choice. Patient savers keep a small reserve, while
    // more sociable workers are willing to pool a wage earlier in a shortage.
    if(traits.sociability>=55&&meal.available&&pocket.balance>=meal.price+(traits.patience>=70?2:0)){
      const gift=buy(world,site,id,'food',meal.price,false);if(gift.ok)text+=' '+gift.message;
    }else if(traits.sociability>=65&&pocket.balance>1&&book(site).household<meal.price){
      text+=' '+donate(world,site,id);
    }
    if(traits.sociability>=55&&meal.available&&book(site).household>=meal.price&&site.food<Math.ceil(site.population/5)){
      const gift=buy(world,site,id,'food',meal.price,true);if(gift.ok)text+=' '+gift.message;
    }
    return {message:text,reason:text};
  }
  function valid(site,week){
    const b=site.purses;if(b===undefined)return true;
    if(!obj(b)||!int(b.serial,1)||!int(b.household)||!obj(b.people)||!obj(b.tickets)||
      Object.keys(b.people).length>site.residents.length+7||!Object.keys(b.people).length||Object.keys(b.tickets).length>openings)return false;
    let used=0,maxDonated=0;
    for(const [id,p] of Object.entries(b.people)){
      if(!local(site,id)||!obj(p)||!int(p.earned)||p.earned%wage||p.earned/wage>week-(site.founded||1)+1||!int(p.balance,0,p.earned)||
        !int(p.lastWeek,p.earned?site.founded||1:0,p.earned?week:0)||!Array.isArray(p.entries)||!p.entries.length||p.entries.length>8)return false;
      if(p.lastWeek===week)used++;
      maxDonated+=p.earned-p.balance;
      if(!p.entries.every((e,i)=>obj(e)&&int(e.week,1,i?p.entries[i-1].week:week)&&int(e.balance,0,p.earned)&&Number.isSafeInteger(e.amount)&&
        (i===0?e.balance===p.balance:e.balance+p.entries[i-1].amount===p.entries[i-1].balance)&&typeof e.text==='string'&&e.text.length>0&&e.text.length<=650&&
        (e.action==='wage'?e.amount===wage:e.action==='donate'?e.amount===-1:e.action==='buy'?e.amount<0&&e.amount>=-6:
        ['start','check','cancel','expired','household'].includes(e.action)&&e.amount===0)))return false;
    }
    const seen=new Set();
    for(const [id,j] of Object.entries(b.tickets)){
      if(!own(b.people,id)||!obj(j)||!int(j.week,site.founded||1,week)||!int(j.serial,1,b.serial)||seen.has(j.serial)||
        !goods.includes(j.good)||!site.residents.some(p=>p.id===j.clerkId&&p.id!==id)||j.count!==null&&!int(j.count)||account(site,id).lastWeek>=j.week)return false;
      if(j.week===week)used++;seen.add(j.serial);
    }
    return used<=openings&&b.household<=maxDonated&&(!escrow(site)||Boolean(site.exchange)&&site.exchange.till<=limit-escrow(site));
  }
  root.EarthPurses=Object.freeze({view,run,tick,valid,escrow,committed,opportunity,workWeek});
})(typeof window==='undefined'?globalThis:window);
