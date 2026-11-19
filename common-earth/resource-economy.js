/* Raw lots are physical goods. They enter the pantry or building store only
   when somebody makes a batch. The merchant holds separate stock and cash. */
(function(root){
  'use strict';
  const lotLimit=24, shelfLimit=8;
  const max=Number.MAX_SAFE_INTEGER;
  const resources={
    grain:{name:'Grain',family:'Staples',place:'grain fields',unit:'sacks',capacity:8,renew:2,value:2},
    pulses:{name:'Pulses',family:'Staples',place:'bean plots',unit:'sacks',capacity:6,renew:2,value:2},
    roots:{name:'Root vegetables',family:'Fresh food',place:'allotment beds',unit:'baskets',capacity:7,renew:2,value:2},
    fruit:{name:'Orchard fruit',family:'Fresh food',place:'orchard rows',unit:'baskets',capacity:6,renew:2,value:2},
    berries:{name:'Berries',family:'Fresh food',place:'managed berry patches',unit:'baskets',capacity:5,renew:1,value:3},
    greens:{name:'Leaf greens',family:'Fresh food',place:'sheltered growing beds',unit:'trays',capacity:6,renew:2,value:2},
    mushrooms:{name:'Mushrooms',family:'Fresh food',place:'covered growing racks',unit:'trays',capacity:5,renew:2,value:3},
    kelp:{name:'Edible seaweed',family:'Fresh food',place:'tidal growing lines',unit:'baskets',capacity:6,renew:2,value:2},
    reed:{name:'Reed fibre',family:'Fibre & wood',place:'reed beds',unit:'bundles',capacity:7,renew:2,value:2},
    timber:{name:'Timber',family:'Fibre & wood',place:'coppice lots',unit:'loads',capacity:7,renew:1,value:3},
    salvage:{name:'Reclaimed boards',family:'Fibre & wood',place:'depot sorting yard',unit:'loads',capacity:6,renew:1,value:2},
    stone:{name:'Building stone',family:'Minerals',place:'local quarry',unit:'loads',capacity:18,renew:0,value:3},
    clay:{name:'Clay',family:'Minerals',place:'clay beds',unit:'loads',capacity:14,renew:0,value:2}
  };
  const shelfLife={roots:9,fruit:5,berries:2,greens:3,mushrooms:3,kelp:2};
  const recipes=[
    {id:'porridge',name:'Mill & cook grain',inputs:{grain:2},good:'food',yield:2},
    {id:'pulsepot',name:'Cook a pot of pulses',inputs:{pulses:2},good:'food',yield:2},
    {id:'rootpot',name:'Roast the roots',inputs:{roots:2},good:'food',yield:2},
    {id:'fruitjars',name:'Put up orchard fruit',inputs:{fruit:2},good:'food',yield:2},
    {id:'berryjars',name:'Make berry preserves',inputs:{berries:2},good:'food',yield:2},
    {id:'greenbaskets',name:'Prepare market greens',inputs:{greens:2},good:'food',yield:2},
    {id:'mushroompot',name:'Cook mushroom portions',inputs:{mushrooms:2},good:'food',yield:2},
    {id:'kelppot',name:'Prepare edible seaweed',inputs:{kelp:2},good:'food',yield:2},
    {id:'meal',name:'Cook a grain and pulse supper',inputs:{grain:1,pulses:1},good:'food',yield:3},
    {id:'stew',name:'Cook a vegetable stew',inputs:{greens:1,roots:1},good:'food',yield:3},
    {id:'basket',name:'Weave a load basket',inputs:{reed:2},good:'materials',yield:2},
    {id:'boards',name:'Prepare framing timber',inputs:{timber:2},good:'materials',yield:2},
    {id:'reclaim',name:'De-nail reusable boards',inputs:{salvage:2},good:'materials',yield:2},
    {id:'blocks',name:'Dress building stone',inputs:{stone:2},good:'materials',yield:2},
    {id:'bricks',name:'Make earthen blocks',inputs:{clay:2},good:'materials',yield:2},
    {id:'frame',name:'Prepare footings and framing',inputs:{stone:1,timber:1},good:'materials',yield:3},
    {id:'panels',name:'Make reed-and-clay panels',inputs:{reed:1,clay:1},good:'materials',yield:3}
  ];
  const foodKey=id=>['Staples','Fresh food'].includes(resources[id].family);
  const idList=Object.keys(resources);
  const actions=new Set(['gatherLot','buyLot','sellLot','makeBatch']);
  const own=(object,key)=>object!=null&&Object.hasOwn(object,key);
  const object=value=>value!=null&&typeof value==='object'&&!Array.isArray(value);
  const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const failed=message=>({ok:false,message});
  const hasFacility=(site,kind)=>site.buildings?.some(building=>building.kind===kind);
  const hasUse=(site,kind)=>site.city?.precincts?.some(precinct=>precinct.use===kind);
  const foodBed=site=>hasFacility(site,'garden')||hasUse(site,'food');
  const wetBed=site=>hasFacility(site,'wetland')||hasUse(site,'water');
  function environment(site){
    const lat=Math.abs(site.lat||0);
    const shore=root.CommonEarthSim?.waterfront?.(site)||site.water&&'ocean'||site.coastal&&'coast';
    if(site.water)return (root.CommonEarthSim?.lakeName?.(site)||site.lakeShore||/(?:\blakes?\b|\blac\b|\blago\b|reservoir|inland water|freshwater)/i.test(site.region||site.name))?'lake':'ocean';
    if(shore==='lake'||site.lakeShore)return 'lakeside';
    if(shore)return 'coast';
    if(lat>=67)return 'cold';
    if(lat>=54)return 'woodland';
    const lon=site.lon||0,ns=site.lat||0;
    // Broad dryland bands for fictional local districts. The harbour and cold
    // cases take precedence. A built water commons adds irrigated crops.
    if(ns>=19&&ns<=29&&lon>=-8&&lon<=58 ||
       ns<=-21&&ns>=-29&&lon>=121&&lon<=140 ||
       ns>=26&&ns<=34&&lon>=-114&&lon<=-104 ||
       ns<=-18&&ns>=-27&&lon>=-70&&lon<=-67)return 'dry';
    return lat<25?'warm':'mixed';
  }
  const habitats={
    lake:{title:'Freshwater settlement',local:['reed','salvage'],food:'Handline catches, incoming staples and floating gardens when built'},
    lakeside:{title:'Lakeside settlement',local:['pulses','roots','reed','clay','stone','salvage'],food:'Lakeside allotments, bean plots and freshwater catches'},
    ocean:{title:'Marine settlement',local:['kelp','salvage'],food:'Seaweed lines, handline catches and incoming staples'},
    coast:{title:'Coastal settlement',local:['pulses','roots','kelp','reed','stone','salvage'],food:'Allotments, shore harvests and handline catches'},
    cold:{title:'Cold inland settlement',local:['mushrooms','stone','salvage'],food:'Sheltered growing racks and supplied staples'},
    woodland:{title:'Cool woodland settlement',local:['roots','berries','mushrooms','timber','stone','salvage'],food:'Root beds, berry patches and covered growing racks'},
    dry:{title:'Dry inland settlement',local:['pulses','stone','clay','salvage'],food:'Dryland pulses and supplied staples'},
    warm:{title:'Warm inland settlement',local:['roots','pulses','fruit','reed','timber','clay','salvage'],food:'Orchard rows, food beds and bean plots'},
    mixed:{title:'Temperate inland settlement',local:['grain','pulses','roots','fruit','timber','stone','clay','salvage'],food:'Grain fields, orchards and allotments'}
  };
  function localIds(site){
    const habitat=environment(site),ids=new Set(habitats[habitat].local);
    if(foodBed(site)){ids.add('greens');ids.add('roots');}
    if(wetBed(site)){ids.add('reed');if(!site.water){ids.add('greens');ids.add('grain');}}
    if(hasUse(site,'yard')||hasFacility(site,'workshop'))ids.add('salvage');
    return [...ids];
  }
  function survey(site){
    if(!site||!Number.isFinite(site.lat)||!Number.isFinite(site.lon))return {summary:''};
    const habitat=habitats[environment(site)],ids=localIds(site);
    const food=ids.filter(foodKey).map(id=>resources[id].name.toLowerCase());
    const materials=ids.filter(id=>!foodKey(id)).map(id=>resources[id].name.toLowerCase());
    const fish=Boolean(root.CommonEarthSim?.waterfront?.(site)||site.water||site.coastal);
    if(fish)food.push('handline catches');
    return {habitat:habitat.title,food,materials,fish,
      summary:habitat.title+'. Local food sources include '+food.join(', ')+'. Building supplies include '+materials.join(', ')+'.'};
  }
  function seasonIndex(site,week){return (Math.floor(((week-1)%52)/13)+(site.lat<0?2:0))%4;}
  const seasonLabels=['Spring','Summer','Autumn','Winter'];
  function regrowth(site,id,index){
    const doc=resources[id];
    if(!doc.renew)return 0;
    if(['mushrooms','salvage','kelp','timber','reed'].includes(id))return doc.renew;
    const sheltered=foodBed(site)&&['greens','roots'].includes(id);
    if(index===3&&!sheltered)return id==='fruit'||id==='berries'?0:1;
    if(index===2&&['grain','fruit','berries','roots'].includes(id))return doc.renew+1;
    return doc.renew;
  }
  function fieldSize(site,id){
    const def=resources[id];
    return def.capacity+(foodKey(id)&&foodBed(site)?2:0)+(id==='salvage'&&hasFacility(site,'workshop')?2:0);
  }
  function standing(site,id,week){
    const cap=fieldSize(site,id),old=site.resourceLedger?.fields[id];
    if(!old)return cap;
    let quantity=Math.min(old.left,cap);
    if(resources[id].renew&&old.week<week){
      // At our maximum patch size, a full year of regrowth fills any
      // renewable patch. Bound iteration even for very old save files.
      const start=Math.max(old.week+1,week-51);
      for(let turn=start;turn<=week&&quantity<cap;turn++)quantity+=regrowth(site,id,seasonIndex(site,turn));
    }
    return Math.min(quantity,cap);
  }
  function initialShelf(site){
    const ids=localIds(site),shelf={grain:2,pulses:2,salvage:2,timber:1};
    for(const id of ids)shelf[id]=Math.max(shelf[id]||0,2);
    return shelf;
  }
  function ledger(world,site){
    return site.resourceLedger||{serial:0,lastWeek:world.week,bins:{},fields:{},shelf:initialShelf(site)};
  }
  function dates(store,side,id,week){
    if(!shelfLife[id])return null;
    const storage=store.dates||={bins:{},shelf:{}},list=storage[side][id]||=[];
    // Existing saves and unopened stalls receive a full storage period on
    // first inspection by the weekly crew. Reads of the panel stay pure.
    const counted=list.reduce((sum,lot)=>sum+lot.count,0),missing=(store[side][id]||0)-counted;
    if(missing>0)mergeDates(list,[{until:Math.min(max,week+shelfLife[id]),count:missing}]);
    return list;
  }
  function mergeDates(list,lots){
    for(const lot of lots){
      const matching=list.find(old=>old.until===lot.until);
      if(matching)matching.count+=lot.count;else list.push({...lot});
    }
    list.sort((a,b)=>a.until-b.until);
  }
  function takeStock(store,side,id,amount,week){
    const list=dates(store,side,id,week),taken=[];
    if(list){
      let left=amount;
      while(left&&list.length){
        const oldest=list[0],count=Math.min(left,oldest.count);
        taken.push({until:oldest.until,count});oldest.count-=count;left-=count;
        if(!oldest.count)list.shift();
      }
      if(!list.length)delete store.dates[side][id];
    }
    store[side][id]-=amount;
    return taken;
  }
  function addStock(store,side,id,amount,week,lots=null){
    const list=dates(store,side,id,week);
    if(list)mergeDates(list,lots||[{until:Math.min(max,week+shelfLife[id]),count:amount}]);
    store[side][id]=(store[side][id]||0)+amount;
  }
  function oldestDate(store,side,id,week){
    if(!store[side][id]||!shelfLife[id])return null;
    return store.dates?.[side]?.[id]?.[0]?.until||Math.min(max,week+shelfLife[id]);
  }
  function expiringPublicLot(site,week){
    let result=null;
    for(const [id,lots] of Object.entries(site.resourceLedger?.dates?.bins||{})){
      const first=lots[0];
      if(!first||first.until>week+1||result&&first.until>=result.until)continue;
      result={label:resources[id].name.toLowerCase(),amount:first.count,until:first.until};
    }
    return result;
  }
  function ageStores(world,site){
    const store=site.resourceLedger;if(!store)return '';
    const losses={bins:{},shelf:{}};
    for(const side of ['bins','shelf']){
      for(const id of Object.keys(store[side])){
        if(!shelfLife[id]||!store[side][id])continue;
        const list=dates(store,side,id,world.week);
        let spoiled=0;
        while(list.length&&list[0].until<=world.week)spoiled+=list.shift().count;
        if(!list.length)delete store.dates[side][id];
        if(spoiled){store[side][id]-=spoiled;losses[side][id]=spoiled;}
      }
    }
    if(!Object.keys(losses.bins).length&&!Object.keys(losses.shelf).length)return '';
    store.serial=Math.min(max,store.serial+1);store.lastLoss={week:world.week,...losses};
    const notes=[];
    if(Object.keys(losses.bins).length)notes.push(amounts(losses.bins)+' passed their storage dates in the district bins');
    if(Object.keys(losses.shelf).length)notes.push(amounts(losses.shelf)+' spoiled at the merchant’s stall');
    return notes.join('. ')+'.';
  }
  function destination(site,id,actor){
    if(id==='kelp'||id==='reed'&&site.water)return {ref:{type:'quay'},name:'the quay'};
    const foods=foodKey(id),venue=foods?'garden':'workshop';
    const facility=(site.buildings||[]).filter(b=>b.kind===venue&&integer(b.plot,0,8)).sort((a,b)=>a.plot-b.plot)[0];
    if(facility)return {ref:{type:'workplace',venue,plot:facility.plot},name:facility.name||'the district '+venue};
    if(id==='salvage')return {ref:{type:'market'},name:'the depot counter'};
    const roles=foods?/grower|gardener|seed keeper|cook|baker/i:/repairer|carpenter|builder|engineer|craft/i;
    const present=(site.residents||[]).filter(p=>p.id!==actor&&
      root.EarthCommunityLife?.present?.(site,p.id)!==false&&root.EarthCommunityLife?.residency?.(site,p.id)!=='visitor');
    const supplier=present.find(p=>roles.test(root.EarthCareers?.role?.(site,p.id)||p.role||''));
    return supplier?{ref:{type:'resident',residentId:supplier.id},name:supplier.name+'’s collection point'}:
      {ref:{type:'market'},name:'the collection counter at the exchange'};
  }
  function atDestination(site,actor,where,scene){
    if(!scene||scene.siteId!==site.id||scene.actor!==actor||
      scene.placement||scene.seated||scene.boarding||scene.returning||
      !Number.isFinite(scene.x)||!Number.isFinite(scene.y))return false;
    if(where.type==='quay')return scene.mode==='walk'&&scene.target==='quay'&&
      scene.x>=-.7&&scene.x<=24.7&&scene.y>=23.1&&scene.y<=25.25;
    if(where.type==='workplace'){
      if(scene.mode!=='walk'||scene.venue!==where.venue||scene.personId!==actor||!Number.isFinite(scene.tx)||!Number.isFinite(scene.ty))return false;
      const door=root.EarthConstruction?.streetPoint?.({scope:'street',plot:where.plot})||
        {x:3+6*(where.plot%3),y:5.04+6*Math.floor(where.plot/3)};
      return Math.hypot(scene.tx-door.x,scene.ty-door.y)<1.5&&Math.hypot(scene.x-scene.tx,scene.y-scene.ty)<1.56;
    }
    const expected=where.type==='resident'?where.residentId:'market';
    if(scene.target!==expected||scene.mode!=='walk'&&!(where.type==='market'&&scene.mode==='drive'))return false;
    return Number.isFinite(scene.tx)&&Number.isFinite(scene.ty)&&Math.hypot(scene.x-scene.tx,scene.y-scene.ty)<(scene.mode==='drive'?1.9:1.56);
  }
  function tradingPrice(id,count,meals){
    const demand=foodKey(id)?Math.min(5,2+Math.ceil(meals/3)):3;
    const bid=Math.max(1,resources[id].value+(count<demand?1:count>=demand+2?-1:0));
    return {bid,ask:bid+2};
  }
  const amounts=goods=>Object.entries(goods).map(([id,n])=>n+' '+resources[id].name.toLowerCase()).join(' + ');
  function quote(action,good,title,reason,price,where,detail){
    return {action,good,title,available:!reason,reason,price,venue:where?.ref||{type:'market'},station:where?.name||'the exchange counter',detail};
  }
  function collectQuote(site,world,book,id,actor){
    const amount=Math.min(2,standing(site,id,world.week),lotLimit-(book.bins[id]||0));
    const target=destination(site,id,actor),name=resources[id].name.toLowerCase();
    const reason=(book.bins[id]||0)>=lotLimit?'All storage spaces for '+name+' are occupied. Use or sell a lot.':
      amount===0?(resources[id].renew?'This source needs time to recover.':'This deposit is exhausted. Trade for further supplies.'):'';
    return quote('gatherLot',id,amount?'Collect '+amount+' '+name:'Collect '+name,reason,amount,target,'Collect at '+target.name+'. The goods stay in the district bins until used or sold.');
  }
  function tradeQuotes(site,world,store,book,id,room){
    const stock=store.bins[id]||0,ready=store.shelf[id]||0,meals=Math.ceil(site.population/5);
    const shelfDate=oldestDate(store,'shelf',id,world.week),ownDate=oldestDate(store,'bins',id,world.week);
    const ask=Math.max(1,tradingPrice(id,ready,meals).ask-Number(shelfDate!=null&&shelfDate<=world.week+1));
    const bid=Math.max(1,tradingPrice(id,ready+1,meals).bid-Number(ownDate!=null&&ownDate<=world.week+1));
    const buyBlocked=!ready?'No stock on the merchant’s shelf.':stock>=lotLimit?'The district bin is full.':
      site.funds<ask?'The treasury needs '+ask+' funds.':room<ask?'The merchant till has no space.':'';
    const sellBlocked=!stock?'Collect or buy this good first.':ready>=shelfLimit?'The merchant’s shelf is full.':
      book.till<bid?'The merchant needs more cash.':site.funds>max-bid?'The district treasury is full.':'';
    return [quote('buyLot',id,'Buy 1 · '+ask+' funds',buyBlocked,ask),
      quote('sellLot',id,'Sell 1 · '+bid+' funds',sellBlocked,bid)];
  }
  function recipeQuote(site,store,recipe){
    const missing=Object.entries(recipe.inputs).filter(([id,n])=>(store.bins[id]||0)<n);
    const bonus=recipe.good==='materials'&&hasFacility(site,'workshop')?1:0;
    const output=recipe.yield+bonus;
    const blocked=missing.length?'Needs '+amounts(Object.fromEntries(missing.map(([id,n])=>[id,n-(store.bins[id]||0)])))+'.':
      site[recipe.good]>max-output?'Make room in the district '+(recipe.good==='food'?'pantry.':'store.'):'';
    return quote('makeBatch',recipe.id,recipe.name,blocked,output,null,
      amounts(recipe.inputs)+' → '+output+' '+recipe.good+(bonus?' using workshop tools.':'.'));
  }
  function view(world,site,exchange,room,actor){
    const store=ledger(world,site),habitat=environment(site),ids=localIds(site),local=new Set(ids);
    const rows=[],options=[];
    for(const id of idList){
      const doc=resources[id],owned=store.bins[id]||0,shelf=store.shelf[id]||0;
      if(!local.has(id)&&!owned&&!shelf)continue;
      const harvest=local.has(id)?collectQuote(site,world,store,id,actor):null;
      const row={id,name:doc.name,family:doc.family,unit:doc.unit,owned,shelf,local:local.has(id),
        source:harvest?doc.place:'Regional trade',standing:harvest?standing(site,id,world.week):0,
        cap:harvest?fieldSize(site,id):0,renew:harvest?regrowth(site,id,seasonIndex(site,world.week)):0,finite:doc.renew===0,storageWeeks:shelfLife[id]||null,binDate:oldestDate(store,'bins',id,world.week),stallDate:oldestDate(store,'shelf',id,world.week)};
      rows.push(row);
      if(harvest)options.push(harvest);
      options.push(...tradeQuotes(site,world,store,exchange,id,room));
    }
    const present=new Set(rows.map(row=>row.id));
    const batches=recipes.filter(r=>Object.keys(r.inputs).every(k=>present.has(k))).map(r=>({...recipeQuote(site,store,r),inputs:Object.keys(r.inputs)}));
    options.push(...batches);
    return {habitat:habitats[habitat].title,foodSources:habitats[habitat].food,season:seasonLabels[seasonIndex(site,world.week)],
      fishing:Boolean(root.CommonEarthSim?.waterfront?.(site)||site.water||site.coastal),
      serial:store.serial,rows,options,recipes:batches,binLimit:lotLimit,mealNeed:Math.ceil(site.population/5),
      shortage:Math.max(0,Math.ceil(site.population/5)-site.food),
      loss:store.lastLoss?.week===world.week&&Object.keys(store.lastLoss.bins).length?amounts(store.lastLoss.bins):null};
  }
  function run(world,site,r,scene,exchange,room,actorName){
    const restricted=root.EarthCommunityLife?.permission?.(world,site,'exchange',[r]);
    if(restricted)return failed(restricted);
    const store=ledger(world,site),actor=r.actorId;
    if(!integer(r.resourceSerial,0,max)||store.serial!==r.resourceSerial||store.serial>=max)return failed('The local stock changed. Review the current lots and prices.');
    let option,recipe;
    if(r.action==='makeBatch'){
      recipe=recipes.find(x=>x.id===r.good);
      if(recipe)option=recipeQuote(site,store,recipe);
    }else if(own(resources,r.good)){
      if(r.action==='gatherLot'&&localIds(site).includes(r.good))option=collectQuote(site,world,store,r.good,actor);
      if(r.action==='buyLot'||r.action==='sellLot')option=tradeQuotes(site,world,store,exchange,r.good,room).find(o=>o.action===r.action);
    }
    if(!option||!option.available||option.price!==r.price)return failed(option?.reason||'Review the available resource or batch first.');
    if(!atDestination(site,actor,option.venue,scene))return failed('Reach '+option.station+' to '+option.title.toLowerCase()+'.');
    return execute(world,site,store,exchange,actor,actorName,option,recipe);
  }
  function execute(world,site,store,exchange,actor,actorName,option,recipe){
    let message;
    const good=option.good,n=option.price;
    if(option.action==='gatherLot'){
      const left=standing(site,good,world.week)-n;
      store.fields[good]={week:world.week,left};
      addStock(store,'bins',good,n,world.week);
      message=actorName+' collected '+n+' '+resources[good].name.toLowerCase()+' from the '+resources[good].place+'. '+left+' remain at the source.';
    }else if(option.action==='makeBatch'){
      for(const [key,count] of Object.entries(recipe.inputs))takeStock(store,'bins',key,count,world.week);
      site[recipe.good]+=n;
      if(recipe.good==='food')root.EarthProvisions?.credit(world,site,'harvest',n,actor);
      message=actorName+' turned '+amounts(recipe.inputs)+' into '+n+' '+recipe.good+' for the '+(recipe.good==='food'?'pantry.':'building store.');
    }else{
      const bought=option.action==='buyLot',delta=bought?1:-1;
      const lots=takeStock(store,bought?'shelf':'bins',good,1,world.week);
      addStock(store,bought?'bins':'shelf',good,1,world.week,lots);
      site.funds-=n*delta;exchange.till+=n*delta;
      message=actorName+(bought?' bought ':' sold ')+'one lot of '+resources[good].name.toLowerCase()+' for '+n+' funds.';
    }
    store.serial++;site.resourceLedger=store;
    return {ok:true,message};
  }
  function crewOpportunity(world,site,self,exchange,room){
    const store=site.resourceLedger;
    if(!self?.free||self.row?.energy<3||self.wasAdvised==='rest'||!store||store.serial>=max||store.crewWeek===world.week||
       !Object.values(store.bins).some(n=>n>0)||
       root.EarthCommunityLife?.residency&&root.EarthCommunityLife.residency(site,self.id)!=='member')return null;
    const meals=Math.max(1,Math.ceil(site.population/5)),initiative=self.traits?.initiative??50;
    const pantryShort=site.food<2*meals;
    if(!pantryShort&&site.funds>=7&&!expiringPublicLot(site,world.week))return null;
    const role=root.EarthCareers?.role?.(site,self.id)||self.profile?.originRole||self.profile?.role||'';
    const atRisk=new Set(Object.entries(store.dates?.bins||{}).filter(([,lots])=>lots[0]?.until<=world.week+1).map(([id])=>id));
    if((pantryShort||atRisk.size&&site.food<6*meals)&&/cook|baker|garden|grower|seed keeper/i.test(role)){
      let best=null,priority=0;
      for(const recipe of recipes){
        if(recipe.good!=='food')continue;
        const ingredients=Object.entries(recipe.inputs);
        if(!ingredients.every(([id,n])=>(store.bins[id]||0)>=n))continue;
        const urgent=ingredients.reduce((total,[id,n])=>total+(atRisk.has(id)?n:0),0);
        if(!pantryShort&&!urgent)continue;
        const value=recipe.yield+urgent*3;
        if(value>priority){best=recipe;priority=value;}
      }
      if(best){
        const option=recipeQuote(site,store,best);
        const atDate=Object.keys(best.inputs).filter(id=>atRisk.has(id)).map(id=>resources[id].name.toLowerCase());
        if(option.available)return {recipe:best,option,title:best.name,activity:'prepare',goal:'Keep household meals ready',
          reason:(atDate.length?'The '+atDate.join(' and ')+' in our bin must be used before next week.':'We have '+site.food+' food ready.')+
            ' I can cook '+amounts(best.inputs)+' into '+option.price+' portions before another market trip.',
          score:(site.food<meals?113:atDate.length?96:84)+initiative/10};
      }
    }
    if(site.funds>=7&&!atRisk.size||!/trad|exchange|courier|porter|driver/i.test(role))return null;
    const materialFloor=site.buildPlan&&root.CommonEarthSim?.buildings?.[site.buildPlan]?.materials||3;
    let sale=null,saleRank=0;
    for(const [id,n] of Object.entries(store.bins)){
      const expiring=atRisk.has(id);
      if(site.funds>=7&&!expiring)continue;
      const keep=expiring?0:foodKey(id)?(site.food>=3*meals?1:lotLimit):site.materials>=materialFloor?1:lotLimit;
      if(n<=keep)continue;
      const offer=tradeQuotes(site,world,store,exchange,id,room)[1],rank=offer.price+Number(expiring)*4;
      if(offer.available&&rank>saleRank){sale=offer;saleRank=rank;}
    }
    if(!sale)return null;
    const expiring=atRisk.has(sale.good),label=resources[sale.good].name.toLowerCase();
    return {option:sale,title:'Sell surplus '+label,activity:'sell',goal:'Fund community supplies',
      reason:(expiring?'The oldest lot of '+label+' will spoil next week.':'The treasury holds '+site.funds+' funds.')+
        ' The stall will pay '+sale.price+' for it while we keep supplies for work and meals.',
      score:(expiring?91:80)+initiative/10};
  }
  function crewWork(world,site,self,exchange,room,actorName){
    const plan=crewOpportunity(world,site,self,exchange,room);
    if(!plan)return null;
    const result=execute(world,site,site.resourceLedger,exchange,self.id,actorName,plan.option,plan.recipe);
    if(!result.ok)return null;
    site.resourceLedger.crewWeek=world.week;
    return {reason:plan.reason+' '+result.message,title:plan.title,goal:plan.goal,activity:plan.activity};
  }
  function tick(world,site,exchange,room){
    const store=site.resourceLedger;
    if(!store||store.lastWeek>=world.week)return '';
    store.lastWeek=world.week;store.serial=Math.min(max,store.serial+1);
    const ids=localIds(site),rotation=Math.abs(Math.round((site.lon||0)*3+(site.lat||0)))%13;
    const meals=Math.ceil(site.population/5),turn=world.week+rotation;
    const bids=Object.keys(store.shelf).filter(k=>store.shelf[k]>0);
    let bought='',sold='';
    if(bids.length){
      const preferred=bids.filter(id=>foodKey(id)===(turn%3!==0)),wanted=preferred.length?preferred:bids;
      const id=wanted[turn%wanted.length],ask=tradingPrice(id,store.shelf[id],meals).ask;
      if(room>=ask){takeStock(store,'shelf',id,1,world.week);exchange.till+=ask;sold='Market visitors bought '+resources[id].name.toLowerCase()+' for '+ask+' funds.';}
    }
    // A travelling supplier can deliver a missing staple or local output.
    // Purchase actually leaves the private till before goods reach the shelf.
    const imported=turn%4===0,source=imported?['grain','pulses','timber','reed']:ids.filter(key=>standing(site,key,world.week)>0);
    if(source.length){
      const id=source[(imported?Math.floor(turn/4):turn)%source.length],cost=Math.max(1,resources[id].value-1),ready=store.shelf[id]||0;
      if(ready<4&&exchange.till>=cost){
        if(!imported)store.fields[id]={week:world.week,left:standing(site,id,world.week)-1};
        addStock(store,'shelf',id,1,world.week);exchange.till-=cost;
        bought='The merchant '+(imported?'imported ':'bought a local lot of ')+resources[id].name.toLowerCase()+' for '+cost+' fund'+(cost===1?'':'s')+'.';
      }
    }
    return [sold,bought].filter(Boolean).join(' ');
  }
  function projectCrop(world,site,owner,preferred){
    const choices=[];
    for(const id of localIds(site)){
      if(!foodKey(id))continue;
      const available=standing(site,id,world.week);if(available)choices.push({id,available});
    }
    const fishable=root.CommonEarthSim?.waterfront?.(site)||site.water||site.coastal;
    const shoreFisher=fishable&&Array.from(owner||'').reduce((n,ch)=>n+ch.charCodeAt(0),0)%3===0;
    if(fishable&&(preferred==='fish'||!choices.length||!preferred&&shoreFisher)){
      const available=Math.min(3,root.EarthFisheries?.ground?.(site,world.week)?.available??3);
      if(available)return {id:'fish',name:'fresh fish',place:'quay',venue:'dock',available};
    }
    if(!choices.length)return null;
    let chosen=choices.find(candidate=>candidate.id===preferred);
    if(!chosen){
      // Pick a crop where a collection helps most. Filled bins and a thin
      // stand make another source more attractive. Ties rotate per organiser.
      const seed=Array.from(owner||'').reduce((n,l)=>(n*31+l.charCodeAt(0))>>>0,world.week);
      let best=-Infinity;
      choices.forEach((candidate,i)=>{
        const score=candidate.available-2*(site.resourceLedger?.bins[candidate.id]||0)+((seed+i)%choices.length)/choices.length;
        if(score>best){chosen=candidate;best=score;}
      });
    }
    const doc=resources[chosen.id];
    return {...chosen,name:doc.name.toLowerCase(),place:doc.place,venue:chosen.id==='kelp'?'dock':'garden'};
  }
  function harvestForProject(world,site,crop,wanted,mayStoreRaw){
    // All baskets, including those taken straight to households, leave the
    // same standing field that suppliers, visitors to the stall and players see.
    const amount=Math.min(wanted,crop.available);
    if(crop.id==='fish'){
      const taken=!root.EarthFisheries?.take||root.EarthFisheries.take(site,world.week,amount);
      return {amount:taken?amount:0,stored:null};
    }
    const store=ledger(world,site),stock=store.bins[crop.id]||0,meals=Math.max(1,Math.ceil(site.population/5));
    const stored=amount>=2&&mayStoreRaw&&site.food>=3*meals&&stock<Math.min(lotLimit,Math.max(2,meals))?crop:null;
    store.fields[crop.id]={week:world.week,left:crop.available-amount};
    if(stored)addStock(store,'bins',crop.id,1,world.week);
    store.serial=Math.min(max,store.serial+1);site.resourceLedger=store;
    return {amount,stored};
  }
  function quickGather(world,site,owner,commit=false){
    if(root.EarthCommunityLife?.residency&&root.EarthCommunityLife.residency(site,owner)!=='member')return null;
    let crop=projectCrop(world,site,owner);
    if(crop?.id==='fish'&&site.handline&&!hasFacility(site,'fishingDock')){
      const alternate=localIds(site).find(id=>foodKey(id)&&standing(site,id,world.week)>0);
      crop=alternate?projectCrop(world,site,owner,alternate):null;
    }
    if(!crop)return null;
    if(commit){
      if(!harvestForProject(world,site,crop,1,false).amount)return null;
      if(crop.id==='fish')root.EarthProvisions?.landing?.(world,site,owner,1);
    }
    return {venue:crop.venue,resource:crop.id,title:crop.id==='fish'?'Fish for the pantry':'Gather '+crop.name,
      reason:'We have less than two weeks of meals. I can '+(crop.id==='fish'?'land a fish at the quay':'collect one lot of '+crop.name+' from the '+crop.place)+' for tonight’s pantry.'};
  }
  function projectShipment(site,ownerId){
    const p=site.autonomy?.projects?.owners?.[ownerId];
    if(!p?.carriedBy||p.finished!==site.autonomy.week||!p.delivered||p.kind!=='food')return null;
    return {week:p.finished,crop:p.crop,sourceVenue:p.crop==='fish'||p.crop==='kelp'?'dock':'garden',
      venue:'pantry',carrierId:p.carriedBy,amount:p.delivered};
  }
  function useForPantry(world,site,owner){
    const store=site.resourceLedger;
    const role=root.EarthCommunityLife?.residency?.(site,owner);
    if(role&&role!=='member'||!store||store.serial>=max||site.food>=2*Math.ceil(site.population/5))return null;
    const stock=idList.filter(id=>foodKey(id)&&(store.bins[id]||0)>0);
    if(!stock.length)return null;
    // The crew chooses the largest bin for the missing household portion.
    // Tie-breaking the most perishable goods first protects the seed supply.
    stock.sort((a,b)=>(oldestDate(store,'bins',a,world.week)||max)-(oldestDate(store,'bins',b,world.week)||max)||
      store.bins[b]-store.bins[a]||a.localeCompare(b));
    const id=stock[0];takeStock(store,'bins',id,1,world.week);store.serial++;
    return {id,source:resources[id].name.toLowerCase(),by:owner};
  }
  function valid(site,week){
    const d=site.resourceLedger;if(d===undefined)return true;
    if(!object(d)||!integer(d.serial,1,max)||!integer(d.lastWeek,1,week)||d.crewWeek!=null&&!integer(d.crewWeek,1,week)||!object(d.bins)||!object(d.fields)||!object(d.shelf))return false;
    if(!Object.entries(d.bins).every(([k,n])=>own(resources,k)&&integer(n,0,lotLimit))||
      !Object.entries(d.shelf).every(([k,n])=>own(resources,k)&&integer(n,0,shelfLimit)))return false;
    if(d.dates!=null){
      if(!object(d.dates))return false;
      for(const side of ['bins','shelf']){
        if(!object(d.dates[side]))return false;
        for(const [id,lots] of Object.entries(d.dates[side])){
          if(!own(shelfLife,id)||!Array.isArray(lots)||lots.length>(d[side][id]||0)||
            !lots.every((lot,i)=>object(lot)&&integer(lot.until,1,max)&&integer(lot.count,1,lotLimit)&&(!i||lots[i-1].until<lot.until))||
            lots.reduce((total,lot)=>total+lot.count,0)!==d[side][id])return false;
        }
      }
    }
    if(d.lastLoss!=null){
      const loss=d.lastLoss;
      if(!object(loss)||!integer(loss.week,1,week)||!object(loss.bins)||!object(loss.shelf)||
        !Object.keys(loss.bins).length&&!Object.keys(loss.shelf).length||
        !['bins','shelf'].every(side=>Object.entries(loss[side]).every(([id,n])=>own(shelfLife,id)&&integer(n,1,side==='bins'?lotLimit:shelfLimit))))return false;
    }
    return Object.entries(d.fields).every(([k,f])=>own(resources,k)&&object(f)&&integer(f.week,1,week)&&integer(f.left,0,resources[k].capacity+2));
  }
  root.EarthResources=Object.freeze({survey,environment,view,run,tick,ageStores,expiringPublicLot,crewOpportunity,crewWork,projectCrop,quickGather,projectShipment,harvestForProject,useForPantry,valid,isCrop:id=>id==='fish'||own(resources,id)&&foodKey(id),isAction:action=>actions.has(action)});
})(typeof window==='undefined'?globalThis:window);
