/* A maker purchases a real lot from the exchange and leaves the finished
   pieces on consignment. The owner sets the price before a customer arrives.
   A private sale moves an object and a payment between two named people. */
(function(root){
  'use strict';
  const products={
    apron:{name:'Work apron',make:'Stitch a work apron',shop:'clothing',inputs:['cloth','flax'],axis:'craft',threshold:41,interest:'care',use:'Carry an extra basket of fresh food from each collection.'},
    satchel:{name:'Shoulder satchel',make:'Sew a shoulder satchel',shop:'clothing',inputs:['cloth','flax'],axis:'craft',threshold:46,interest:'stamina',use:'Carry an extra lot of fibre, timber or reclaimed goods.'},
    quilt:{name:'Patchwork quilt',make:'Piece together a quilt',shop:'clothing',inputs:['cloth'],axis:'craft',threshold:52,interest:'care',use:'Recover an extra point of energy during a rest week.'},
    basket:{name:'Gathering basket',make:'Weave a gathering basket',shop:'weaving',inputs:['reed','flax'],axis:'craft',threshold:33,interest:'care',use:'Bring an extra lot of food back from the fields.'},
    mat:{name:'Woven sleeping mat',make:'Weave a sleeping mat',shop:'weaving',inputs:['reed','flax'],axis:'craft',threshold:43,interest:'stamina',use:'Recover an extra point of energy during a rest week.'},
    sling:{name:'Stone sling',make:'Weave a two-handled stone sling',shop:'weaving',inputs:['reed','flax'],axis:'organisation',threshold:47,interest:'organisation',use:'Carry one additional lot of quarried stone or clay.'},
    stool:{name:'Folding stool',make:'Fit a folding stool',shop:'joinery',inputs:['timber','salvage'],axis:'craft',threshold:47,interest:'craft',use:'Recover an extra point of energy during a rest week.'},
    crate:{name:'Carrying crate',make:'Assemble a carrying crate',shop:'joinery',inputs:['salvage','timber'],axis:'craft',threshold:40,interest:'organisation',use:'Carry an extra lot of wood, fibre or reclaimed goods.'},
    flute:{name:'Practice flute',make:'Tune a practice flute',shop:'music',inputs:['reed','timber'],axis:'music',threshold:45,interest:'music',use:'Take a portable instrument to personal music practice.'},
    drum:{name:'Frame drum',make:'Fit a frame drum',shop:'music',inputs:['timber','salvage'],axis:'music',threshold:52,interest:'music',use:'Take a portable instrument to personal music practice.'}
  };
  const specialties={clothing:'clothing stall',weaving:'basketry stall',joinery:'joinery stall',music:'instrument stall'};
  const article=name=>/^[aeiou]/i.test(name)?'an ':'a ';
  const productKeys=Object.keys(products),limit=Number.MAX_SAFE_INTEGER;
  const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
  const account=(site,id)=>own(site?.purses?.people,id)?site.purses.people[id]:null;
  const profile=(site,id)=>root.EarthPersonas?.profile?.(site,id)||site.residents?.find(p=>p.id===id);
  const member=(site,id)=>!root.EarthCommunityLife?.residency||root.EarthCommunityLife.residency(site,id)==='member';
  const int=(v,min,max=limit)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const record=v=>v!=null&&typeof v==='object'&&!Array.isArray(v);
  const skill=(site,id,p,axis)=>site.careers?.[id]?.skills?.[axis]??p.aptitudes?.[axis]??40;
  const held=(site,id,key)=>account(site,id)?.belongings?.[key]||0;
  const fit=(a,b)=>a===b?1:0;
  const fail=message=>({ok:false,message});
  const stallCapacity=site=>Math.min(8,2+(site.buildings||[]).filter(b=>b.kind==='market'||b.kind==='workshop').length+
    (site.city?.precincts||[]).filter(p=>p.use==='market').length);
  function listings(site){
    const rows=[];
    for(const [id,owner] of Object.entries(site.purses?.people||{})){
      if(owner.stall&&member(site,id))rows.push({id,owner,stall:owner.stall});
    }
    return rows;
  }
  function session(world,site,p){
    const life=site.autonomy?.people?.[p.id]?.dream;
    const ambition=p.id!=='steward'&&life&&!life.completedWeek?root.EarthDreams?.view?.(site,world,p.id,p,life):null;
    const reserve=ambition?.fee>0&&(life.support||p.traits?.patience>=55)?ambition.fee:0;
    return {quotes:new Map(),workConflict:root.EarthPurses?.workConflict?.(site,p.id,world.week)||'',reserve,
      protectedPrice:reserve?'I am keeping '+reserve+' personal funds for '+ambition.supplier+'.':''};
  }
  function supplies(world,site,product,session){
    let picked;
    for(const key of product.inputs){
      if(!session.quotes.has(key))session.quotes.set(key,root.EarthMarket?.makerInput?.(world,site,key));
      const offer=session.quotes.get(key);
      if(!offer)continue;
      if(!picked||offer.available&&(!picked.available||offer.price<picked.price))
        picked={...offer,key};
    }
    return picked;
  }
  function preference(p,site,product){
    const role=root.EarthCareers?.role?.(site,p.id)||p.originRole||p.role||'';
    const work=product.shop==='music'?/musician/i:product.shop==='joinery'?/carpenter|repair|builder|engineer/i:
      product.shop==='weaving'?/grower|garden|seed|porter/i:/baker|cook|nurse/i;
    return skill(site,p.id,p,product.interest)/5+fit(p.hobbyAxis,product.interest)*15+Number(work.test(role))*11;
  }
  function manufacture(world,site,p,key,rows,terms){
    const item=products[key],owner=account(site,p.id),stall=owner?.stall;
    if(!item||stall&&stall.kind!==item.shop)return null;
    const source=supplies(world,site,item,terms);
    if(!source)return null;
    const aptitude=skill(site,p.id,p,item.axis),existing=stall?.wares.length||0;
    const price=source.price,competition=rows.reduce((n,row)=>n+row.stall.wares.filter(w=>w.good===key).length,0);
    const ask=Math.min(8,price+Math.max(1,Math.min(3,1+Number(aptitude>=65)+Number(competition===0))));
    const reason=!stall&&rows.length>=stallCapacity(site)?'Every market stand is occupied. An additional market or repair workshop opens another stand.':
      existing>=3?'Three pieces are still on consignment. A customer must collect one before you can make another.':
      aptitude<item.threshold?'Needs '+item.axis+' '+item.threshold+'; current skill '+aptitude+'.':
      owner?.craftWeek===world.week?'This week’s making session is complete.':
      terms.workConflict||source.reason||
      ((owner?.balance||0)<price?'Needs '+price+' personal funds for a lot of '+source.name+'.':(owner?.balance||0)-price<terms.reserve?terms.protectedPrice:'');
    return {action:'makeWare',good:key,price,input:source.key,ask,available:!reason,reason,
      title:stall?item.make:'Open '+article(specialties[item.shop])+specialties[item.shop]+' and '+item.make.toLowerCase(),
      detail:'One lot of '+source.name+' costs '+price+' personal fund'+(price===1?'':'s')+'. Offer the '+item.name.toLowerCase()+' for '+ask+'. '+item.use};
  }
  function shopTerms(world,site,p){
    const stall=account(site,p.id)?.stall;if(!stall)return [];
    const offers=[],seen=new Set();
    for(const w of stall.wares){
      if(seen.has(w.good)||w.ask<=1)continue;
      seen.add(w.good);
      offers.push({action:'markDown',good:w.good,ask:w.ask,price:w.ask-1,available:true,reason:'',
        title:'Reduce '+products[w.good].name.toLowerCase()+' to '+(w.ask-1)+' fund'+(w.ask===2?'':'s'),
        detail:'The owner accepts one fund less for this piece. The stock still belongs to them.'});
    }
    const counts=Object.create(null);for(const w of stall.wares)counts[w.good]=(counts[w.good]||0)+1;
    const packed=Object.entries(counts).some(([key,n])=>held(site,p.id,key)>limit-n);
    const wait=packed?'Your household cannot store all of these pieces.':p.id!=='steward'&&world.week-stall.opened<4?'I want to give this stand four weeks before deciding whether to close it.':'';
    offers.push({action:'foldStall',good:'privateStall',price:0,available:!wait,reason:wait,title:'Close and pack the stand',
      detail:stall.wares.length+' unsold piece'+(stall.wares.length===1?' stays':'s stay')+' with the maker. Another resident can take the freed stand.'});
    return offers;
  }
  function closeStall(owner){
    if(!owner.stall)return;
    const gear=owner.belongings||={};
    for(const ware of owner.stall.wares)gear[ware.good]=(gear[ware.good]||0)+1;
    delete owner.stall;
    if(!Object.keys(gear).length)delete owner.belongings;
  }
  function forSale(world,site,p,rows,terms){
    const buyer=account(site,p.id),cash=buyer?.balance||0,offers=[];
    for(const row of rows){
      if(row.id===p.id)continue;
      const ownerName=profile(site,row.id)?.name||row.id,seen=new Set();
      for(const ware of row.stall.wares){
        if(seen.has(ware.good))continue;
        seen.add(ware.good);
        const product=products[ware.good];
        const reason=held(site,p.id,ware.good)>0?'You already own this item.':
          cash<ware.ask?'Needs '+(ware.ask-cash)+' more personal funds.':
          terms&&cash-ware.ask<terms.reserve?terms.protectedPrice:
          !root.EarthPurses.canTransfer(site,p.id,row.id,ware.ask)?'The owner’s account cannot receive this payment.':'';
        offers.push({action:'buyWare',good:ware.good,ownerId:row.id,price:ware.ask,available:!reason,reason,
          title:'Buy '+product.name.toLowerCase()+' from '+ownerName,detail:ware.ask+' personal funds go to '+ownerName+'. '+product.use});
      }
    }
    return offers;
  }
  function housePlots(site){
    return Math.min(6,3+(site.city?.precincts||[]).filter(p=>p.use==='homes').length);
  }
  const homeStages=[
    {label:'Lay the foundations',next:3,inputs:['stone','salvage','clay']},
    {label:'Raise the frame',next:4,inputs:['timber','salvage']},
    {label:'Fit the walls and roof',next:0,inputs:['timber','reed','salvage']}
  ];
  const floatingStages=[
    {label:'Fit a flotation base',next:3,inputs:['salvage','timber']},
    {label:'Join the deck frame',next:4,inputs:['timber','salvage']},
    {label:'Seal the cabin and roof',next:0,inputs:['timber','salvage','reed']}
  ];
  const stagesAt=site=>site.water?floatingStages:homeStages;
  const homeName=site=>site.water?'floating home':'courtyard home';
  function homes(site){
    return (site.privateHomes||[]).map(h=>({...h,name:profile(site,h.ownerId)?.name||h.ownerId,price:h.offer||null}));
  }
  function housingPlaces(site){
    return (site?.privateHomes||[]).reduce((n,h)=>n+(h.stage===3?2:0),0);
  }
  function privateHomeTerms(world,site,p,terms){
    const houses=site.privateHomes||[],owned=houses.find(h=>h.ownerId===p.id),cash=account(site,p.id)?.balance||0;
    if(owned?.stage===3){
      const price=owned.offer||Math.min(12,owned.cost+3);
      const waiting=p.id!=='steward'&&!owned.offer&&world.week-(owned.acquired||owned.lastWork)<6?'I want to live here for six weeks before deciding whether to sell.':'';
      return [{action:owned.offer?'withdrawHome':'listHome',good:'courtyardHome',plot:owned.plot,price,available:!waiting,reason:waiting,
        title:owned.offer?'Withdraw your home from sale':'Offer your home for '+price+' funds',
        detail:owned.offer?'Keep the deed and end the outstanding offer.':'Buyers decide whether to accept. The full price goes to your own purse.'}];
    }
    const result=[];
    if(!owned)for(const home of houses){
      if(!home.offer||!member(site,home.ownerId))continue;
      const reason=cash<home.offer?'Needs '+(home.offer-cash)+' more personal funds.':
        cash-home.offer<terms.reserve?terms.protectedPrice:
        !root.EarthPurses.canTransfer(site,p.id,home.ownerId,home.offer)?'The seller cannot receive this payment.':'';
      const seller=profile(site,home.ownerId)?.name||home.ownerId;
      result.push({action:'buyHome',good:'courtyardHome',plot:home.plot,ownerId:home.ownerId,price:home.offer,available:!reason,reason,
        title:'Buy '+seller+'’s '+homeName(site),detail:'The agreed '+home.offer+' funds go to '+seller+'. The existing dwelling keeps its two places.'});
    }
    const stage=owned?.stage||0,step=stagesAt(site)[stage],source=supplies(world,site,step,terms);
    if(!source)return result;
    let plot=owned?.plot;
    if(plot==null)for(let i=0;i<housePlots(site);i++){if(!houses.some(h=>h.plot===i)){plot=i;break;}}
    const builder=terms.builder||p;
    const skillValue=skill(site,builder.id,builder,'craft'),threshold=[44,50,46][stage],ready=owned?owned.lastWork+homeStages[stage-1].next:world.week;
    const peak=builder.bounds?.craft?.max??100;
    const reason=!owned&&peak<50?'Finishing the frame needs craft 50. You can look for a finished home or practise within your own range.':
      plot==null?'The serviced courtyard sites are occupied. A housing precinct opens another site.':
      skillValue<threshold?'This stage needs craft '+threshold+'. Current skill '+skillValue+'.':
      world.week<ready?'The previous stage needs until week '+ready+' before the next work can start.':
      terms.workConflict||source.reason||(cash<source.price?'Needs '+source.price+' personal funds for the '+source.name+'.':cash-source.price<terms.reserve?terms.protectedPrice:'');
    result.push({action:'buildHome',good:'courtyardHome',plot:plot??null,stage:stage+1,price:source.price,input:source.key,available:!reason,reason,
      title:step.label+(stage===0?' for your '+homeName(site):''),
      detail:source.price+' personal fund'+(source.price===1?'':'s')+' buys one lot of '+source.name+'. '+(stage===0?'Framing later needs craft 50. ':'')+(step.next?'Allow '+step.next+' weeks before the next stage.':'Finishing adds two housing places to the district.')});
    return result;
  }
  function constructionOffer(world,site,owner,builder=owner){
    const terms=session(world,site,owner);
    terms.builder=builder;
    if(builder.id!==owner.id)terms.workConflict=root.EarthPurses.workConflict(site,builder.id,world.week);
    return privateHomeTerms(world,site,owner,terms).find(o=>o.action==='buildHome');
  }
  function housingAction(world,site,p,q,builder=p,reserveSession=true){
    const options=q.action==='buildHome'?[constructionOffer(world,site,p,builder)].filter(Boolean):privateHomeTerms(world,site,p,session(world,site,p));
    const chosen=options.find(o=>o.action===q.action&&o.ownerId===q.ownerId);
    if(!chosen?.available||chosen.plot!==q.plot||chosen.stage!==q.stage||chosen.price!==q.price||chosen.input!==q.input)
      return fail(chosen?.reason||'The site, owner or asking price changed. Review the courtyard register.');
    const existing=site.privateHomes?.find(h=>h.plot===q.plot),payer=account(site,p.id);
    if(q.action==='buildHome'){
      const paid=root.EarthPurses.buyMakerInput(world,site,p.id,q.input,q.price,homeName(site));
      if(!paid.ok)return paid;
      const home=existing||{plot:q.plot,ownerId:p.id,started:world.week,stage:0,cost:0};
      if(!existing)(site.privateHomes||=[]).push(home);
      home.stage++;home.lastWork=world.week;home.cost+=q.price;if(reserveSession)payer.craftWeek=world.week;
      if(home.stage===3&&site.housing)root.EarthHousing?.sync(world,site);
      return {ok:true,message:p.name+' completed stage '+home.stage+' of their '+homeName(site)+' at plot '+(home.plot+1)+'. '+
        (home.stage===3?'The dwelling now has two housing places.':'The next stage can start in week '+(world.week+homeStages[home.stage-1].next)+'.')};
    }
    if(q.action==='buyHome'){
      const seller=profile(site,q.ownerId)?.name||q.ownerId;
      const reason=p.name+' bought the '+homeName(site)+' on plot '+(q.plot+1)+' from '+seller+' for '+q.price+' personal funds.';
      const paid=root.EarthPurses.transferPerson(world,site,p.id,q.ownerId,q.price,reason,'courtyardHome');
      if(!paid.ok)return paid;
      existing.ownerId=p.id;existing.acquired=world.week;delete existing.offer;
      if(site.housing)root.EarthHousing?.sync(world,site);
      return {ok:true,message:reason};
    }
    if(q.action==='listHome')existing.offer=q.price;else delete existing.offer;
    const reason=p.name+(existing.offer?' offered their home for '+existing.offer+' personal funds.':' withdrew the home from sale.');
    root.EarthPurses.noteDeed(world,site,p.id,reason);return {ok:true,message:reason};
  }
  function validHomes(site,week){
    const houses=site.privateHomes;if(houses===undefined)return true;
    if(!Array.isArray(houses)||houses.length>6)return false;
    const plots=new Set(),owners=new Set();
    return houses.every(h=>{
      if(!record(h)||!int(h.plot,0,5)||plots.has(h.plot)||typeof h.ownerId!=='string'||owners.has(h.ownerId)||!account(site,h.ownerId)||
        !int(h.stage,1,3)||!int(h.started,1,week)||!int(h.lastWork,h.started+[0,3,7][h.stage-1],week)||
        h.acquired!==undefined&&(h.stage!==3||!int(h.acquired,h.lastWork,week))||
        !int(h.cost,h.stage,h.stage*6)||h.offer!==undefined&&(h.stage!==3||!int(h.offer,1,12)))return false;
      plots.add(h.plot);owners.add(h.ownerId);return true;
    });
  }
  function view(world,site,p,editable=true){
    const owner=account(site,p.id),rows=listings(site),stall=owner?.stall;
    return {items:Object.entries(owner?.belongings||{}).filter(([,n])=>n>0).map(([key,count])=>({key,count,name:products[key].name,use:products[key].use})),
      stalls:rows.map(({id,stall})=>({id,name:profile(site,id)?.name||id,specialty:specialties[stall.kind],
        wares:stall.wares.map(w=>({key:w.good,name:products[w.good].name,ask:w.ask}))})),
      capacity:stallCapacity(site),ownShop:stall?specialties[stall.kind]:null,homes:homes(site),homePlots:housePlots(site),
      get actions(){
        if(!editable)return [];
        const terms=session(world,site,p);
        return [...forSale(world,site,p,rows,terms),...productKeys.map(key=>manufacture(world,site,p,key,rows,terms)).filter(Boolean),...shopTerms(world,site,p),...privateHomeTerms(world,site,p,terms)];
      }};
  }
  function action(world,site,p,offer){
    if(!p||!member(site,p.id))return fail('A local market stand needs a member of this community.');
    if(offer.good==='courtyardHome')return housingAction(world,site,p,offer);
    if(offer.action==='markDown'||offer.action==='foldStall'){
      const terms=shopTerms(world,site,p).find(o=>o.action===offer.action&&o.good===offer.good);
      if(!terms?.available||terms.price!==offer.price||terms.ask!==offer.ask)return fail(terms?.reason||'Check the current consignment terms.');
      const owner=account(site,p.id);let reason;
      if(offer.action==='foldStall'){
        reason=p.name+' packed their unsold stock and released the '+specialties[owner.stall.kind]+'.';closeStall(owner);
      }else{
        const piece=owner.stall.wares.find(w=>w.good===offer.good&&w.ask===offer.ask);
        if(!piece)return fail('The piece has sold.');
        piece.ask=offer.price;piece.listed=world.week;
        reason=p.name+' lowered the asking price of their '+products[piece.good].name.toLowerCase()+' to '+piece.ask+' personal fund'+(piece.ask===1?'':'s')+'.';
      }
      root.EarthPurses.noteDeed(world,site,p.id,reason,'listing');return {ok:true,message:reason};
    }
    const rows=listings(site);
    if(offer.action==='makeWare'){
      const q=own(products,offer.good)&&manufacture(world,site,p,offer.good,rows,session(world,site,p));
      if(!q?.available||q.price!==offer.price||q.input!==offer.input||q.ask!==offer.ask)
        return fail(q?.reason||'The maker’s inputs or offer changed. Check the current terms.');
      const item=products[q.good],old=account(site,p.id)?.stall;
      const receipt=root.EarthPurses.buyMakerInput(world,site,p.id,q.input,q.price,item.name);
      if(!receipt.ok)return receipt;
      const owner=account(site,p.id);
      const stall=owner.stall||={kind:item.shop,opened:world.week,wares:[]};
      stall.wares.push({good:q.good,ask:q.ask,listed:world.week});owner.craftWeek=world.week;
      return {ok:true,message:p.name+(old?' stocked their ':' opened '+article(specialties[item.shop]))+specialties[item.shop]+' with a '+item.name.toLowerCase()+
        '. Their purse paid '+q.price+' for the raw supply. The finished piece is offered for '+q.ask+' personal funds.'};
    }
    const q=forSale(world,site,p,rows,session(world,site,p)).find(q=>q.good===offer.good&&q.ownerId===offer.ownerId);
    if(!q?.available||q.price!==offer.price)return fail(q?.reason||'This piece has already sold or the price has changed.');
    const seller=account(site,q.ownerId),product=products[q.good],ownerName=profile(site,q.ownerId).name;
    const i=seller.stall.wares.findIndex(w=>w.good===q.good&&w.ask===q.price);
    if(i<0)return fail('The seller no longer has that piece.');
    const why=p.name+' bought a '+product.name.toLowerCase()+' from '+ownerName+' for '+q.price+' personal funds.';
    const paid=root.EarthPurses.transferPerson(world,site,p.id,q.ownerId,q.price,why,q.good);
    if(!paid.ok)return paid;
    seller.stall.wares.splice(i,1);
    const pocket=account(site,p.id),items=pocket.belongings||={};
    items[q.good]=(items[q.good]||0)+1;
    return {ok:true,message:why+' '+product.use};
  }
  function savingReason(world,site,self){
    const p=self.profile,owner=account(site,p.id),balance=owner?.balance||0;
    if(world.week<site.founded+2||site.food<Math.ceil(site.population/5)*2)return '';
    const home=site.privateHomes?.find(h=>h.ownerId===p.id);
    if(home&&home.stage<3&&balance<3)return 'I want to earn the next load for the home I am building in courtyard '+(home.plot+1)+'.';
    if(!home&&balance<12&&site.privateHomes?.some(h=>h.offer>balance&&member(site,h.ownerId))&&
      (p.hobbyAxis==='craft'||self.traits.patience>=70))return 'I am saving toward a local owner’s asking price for a courtyard home.';
    if(balance>=6)return '';
    if(owner?.stall?.wares.length>=3)return '';
    if(owner?.stall&&balance<2)return 'I want to earn the cost of another raw lot for my '+specialties[owner.stall.kind]+'.';
    const rows=listings(site),items=forSale(world,site,p,rows);
    for(const q of items)if(!held(site,p.id,q.good)&&balance<q.price&&preference(p,site,products[q.good])>=24)
      return 'I am saving for the '+products[q.good].name.toLowerCase()+' at '+profile(site,q.ownerId).name+'’s stall.';
    if(rows.length>=stallCapacity(site)||self.traits.initiative<54||balance>=2)return '';
    return 'I want enough in my own purse to buy my first lot of material and offer something I can make.';
  }
  function opportunity(world,site,self){
    if(!self?.free||self.wasAdvised==='rest'||self.row.energy<3||!member(site,self.id)||world.week<=site.founded||
      !account(site,self.id)?.balance&&!account(site,self.id)?.stall||site.purses?.serial>=limit-1||!root.EarthMarket?.makerInput||!root.EarthResources)return null;
    const p=self.profile||profile(site,self.id),rows=listings(site),terms=session(world,site,p),offers=forSale(world,site,p,rows,terms);
    const balance=account(site,p.id).balance,reserve=self.traits.patience>=72?2:self.traits.patience>=50?1:0;
    let best=null;
    function consider(offer,score,activity,goal,reason){
      if(offer.available&&score>(best?.score||0))best={privateAction:offer,score,activity,title:offer.title,goal,reason};
    }
    for(const offer of offers){
      if(!offer.available||balance-offer.price<reserve)continue;
      const item=products[offer.good];
      const why='I have '+balance+' in my purse. '+offer.price+' will buy the '+item.name.toLowerCase()+' from '+profile(site,offer.ownerId).name+
        ', leaving '+(balance-offer.price)+' for other plans.';
      consider(offer,55+preference(p,site,item)+self.traits.curiosity/10,'shop','Choose something useful for my household',why);
    }
    const stall=account(site,p.id).stall;
    // A long build suits patient owners. A resident can also accept another
    // owner's asking price, or offer their dwelling to finance other interests.
    if(world.week>=site.founded+5&&!terms.workConflict){
      const ownHome=site.privateHomes?.find(h=>h.ownerId===p.id),craft=skill(site,p.id,p,'craft');
      const housing=privateHomeTerms(world,site,p,terms);
      for(const offer of housing){
        if(!offer.available)continue;
        if(offer.action==='buildHome'&&(ownHome||craft>=52&&self.traits.patience>=53&&balance>=offer.price+1))
          consider(offer,(ownHome?87:53)+craft/8+self.traits.patience/9,'buildHome','Build a home I can keep',
            'I can buy a load of '+offer.input+' for '+offer.price+' from my own purse and '+stagesAt(site)[offer.stage-1].label.toLowerCase()+' at plot '+(offer.plot+1)+'.');
        if(offer.action==='buyHome'&&balance>=offer.price+reserve)
          consider(offer,69+self.traits.patience/4,'deed','Buy a finished home','The owner is willing to sell. I have '+balance+
            ' personally and the deed costs '+offer.price+'.');
        if(offer.action==='listHome'&&self.traits.initiative>=65&&balance<3&&world.week-(ownHome.acquired||ownHome.lastWork)>=6)
          consider(offer,72+self.traits.initiative/8,'deed','Offer my house to a buyer','I am willing to move back to my earlier quarters if a neighbour pays '+offer.price+
            '. That would free my own money for other plans.');
      }
    }
    if(stall?.wares.length){
      for(const q of shopTerms(world,site,p)){
        if(q.action!=='markDown')continue;
        const piece=stall.wares.find(w=>w.good===q.good&&w.ask===q.ask),age=world.week-(piece.listed||stall.opened);
        if(age<5)continue;
        consider(q,69+Math.min(18,age)+self.traits.adaptability/10,'stockStall','Find a buyer for work already made',
          'My '+products[q.good].name.toLowerCase()+' has waited '+age+' weeks. I can accept '+q.price+' now and leave the raw supplies for another maker.');
      }
    }
    if(stall?.wares.length>=2||!stall&&(rows.length>=stallCapacity(site)||self.traits.initiative<54))return best;
    for(const key of productKeys){
      const offer=manufacture(world,site,p,key,rows,terms);if(!offer?.available)continue;
      const item=products[key],others=rows.filter(r=>r.stall.kind===item.shop&&r.id!==p.id).length;
      const duplicates=stall?.wares.filter(w=>w.good===key).length||0;
      const score=52+skill(site,p.id,p,item.axis)/5+self.traits.initiative/6+preference(p,site,item)/3-others*10-duplicates*15;
      const why='The exchange can supply '+offer.input+' for '+offer.price+'. I can make '+article(item.name)+item.name.toLowerCase()+
        ' and offer it for '+offer.ask+'. I keep the stock and take the risk if nobody buys it.';
      consider(offer,score,stall?'makeWare':'stockStall','Run my own '+specialties[item.shop],why);
    }
    return best;
  }
  function work(world,site,self,plan){
    const result=action(world,site,self.profile,plan.privateAction);
    if(!result.ok)return null;
    const q=plan.privateAction;
    const consequence=q.action==='makeWare'?'The finished piece is now on my stand.':q.action==='buyWare'?products[q.good].use:
      q.action==='markDown'?'The lower price is now on the stall.':result.message;
    return {...plan,...(q.good==='courtyardHome'?{homePlot:q.plot,homeStage:q.stage||3,venue:q.action==='buildHome'?'home':'market'}:{ware:q.good}),
      reason:plan.reason+' '+consequence};
  }
  function gatherBonus(site,id,good,food){
    const items=account(site,id)?.belongings;if(!items)return 0;
    if(good==='stone'||good==='clay')return Number(Boolean(items.sling));
    if(food)return Number(Boolean(items.apron||items.basket));
    return Number(Boolean(items.satchel||items.crate));
  }
  function restBonus(site,id){const i=account(site,id)?.belongings;return Number(Boolean(i&&(i.quilt||i.stool||i.mat)));}
  function instrument(site,id){return held(site,id,'flute')?'practice flute':held(site,id,'drum')?'frame drum':null;}
  function wardrobe(site,id){return {apron:Boolean(held(site,id,'apron')),satchel:Boolean(held(site,id,'satchel'))};}
  function validAccount(p,week){
    if(p.belongings!==undefined&&(!record(p.belongings)||!Object.entries(p.belongings).every(([key,n])=>own(products,key)&&int(n,1))))return false;
    if(p.craftWeek!==undefined&&!int(p.craftWeek,1,week))return false;
    if(p.stall===undefined)return true;
    const s=p.stall;
    return record(s)&&own(specialties,s.kind)&&int(s.opened,1,week)&&int(p.craftWeek,s.opened,week)&&Array.isArray(s.wares)&&s.wares.length<=3&&
      s.wares.every(w=>record(w)&&own(products,w.good)&&products[w.good].shop===s.kind&&int(w.ask,1,8)&&(w.listed==null||int(w.listed,s.opened,week)));
  }
  function hasGoods(p){return Boolean(p?.stall||Object.keys(p?.belongings||{}).length);}
  function moveGoods(from,to){
    if(!hasGoods(from))return;
    const dest=to.belongings||={},left={};
    for(const [key,n] of Object.entries(from.belongings||{})){
      const amount=Math.min(n,limit-(dest[key]||0));
      if(amount)dest[key]=(dest[key]||0)+amount;
      if(n>amount)left[key]=n-amount;
    }
    const uncollected=[];
    for(const item of from.stall?.wares||[]){
      const key=item.good;
      if((dest[key]||0)<limit)dest[key]=(dest[key]||0)+1;
      else if((left[key]||0)<limit)left[key]=(left[key]||0)+1;
      else uncollected.push(item);
    }
    if(Object.keys(left).length)from.belongings=left;else delete from.belongings;
    if(!Object.keys(dest).length)delete to.belongings;
    if(from.craftWeek)to.craftWeek=Math.max(to.craftWeek||0,from.craftWeek);
    if(uncollected.length)from.stall.wares=uncollected;else delete from.stall;
  }
  root.EarthResidentShops=Object.freeze({constructionOffer,buildWith:(world,site,owner,q,builder)=>housingAction(world,site,owner,q,builder,false),products,homes,housingPlaces,validHomes,view,action,savingReason,opportunity,work,gatherBonus,restBonus,instrument,wardrobe,validAccount,hasGoods,moveGoods});
})(typeof window==='undefined'?globalThis:window);
