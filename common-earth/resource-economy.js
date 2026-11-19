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
    millet:{name:'Millet',family:'Staples',place:'dryland grain plots',unit:'sacks',capacity:8,renew:2,value:2},
    nuts:{name:'Orchard nuts',family:'Staples',place:'nut groves',unit:'sacks',capacity:5,renew:1,value:3},
    shellfish:{name:'Shellfish',family:'Fresh food',place:'tidal shellfish beds',unit:'baskets',capacity:7,renew:1,value:3},
    herbs:{name:'Kitchen herbs',family:'Seasonings',place:'sheltered herb beds',unit:'bunches',capacity:4,renew:2,value:2},
    water:{name:'Fresh water',family:'Water',place:'district water tanks',unit:'casks',capacity:8,renew:2,value:2},
    cloth:{name:'Reclaimed cloth',family:'Textiles',place:'textile sorting tables',unit:'rolls',capacity:5,renew:1,value:2},
    flax:{name:'Flax fibre',family:'Textiles',place:'retted flax beds',unit:'bundles',capacity:6,renew:1,value:2},
    stone:{name:'Building stone',family:'Minerals',place:'local quarry',unit:'loads',capacity:18,renew:0,value:3},
    clay:{name:'Clay',family:'Minerals',place:'clay beds',unit:'loads',capacity:14,renew:0,value:2}
  };
  const living=id=>resources[id]?.renew>0&&!['cloth','salvage','water'].includes(id);
  const soilBed=id=>living(id)&&!['kelp','reed','shellfish'].includes(id);
  const compostLimit=8;
  const shelfLife={herbs:3,shellfish:2,roots:9,fruit:5,berries:2,greens:3,mushrooms:3,kelp:2};
  const recipes=[
    {id:'milletpot',name:'Cook a pot of millet',inputs:{millet:2},good:'food',yield:2},
    {id:'roastnuts',name:'Shell and roast nuts',inputs:{nuts:2},good:'food',yield:2},
    {id:'shellfishpot',name:'Prepare the shellfish catch',inputs:{shellfish:2},good:'food',yield:2},
    {id:'broth',name:'Simmer a herb and pulse broth',inputs:{herbs:1,pulses:1,water:1},good:'food',yield:4},
    {id:'milletstew',name:'Make millet and bean stew',inputs:{millet:1,pulses:1},good:'food',yield:3},
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
  const actions=new Set(['gatherLot','buyLot','sellLot','makeBatch','restPatch','dressSoil','irrigate','compostLot']);
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
    coast:{title:'Coastal settlement',local:['pulses','roots','kelp','reed','stone','salvage'],food:'Allotments, tidal shellfish beds, seaweed and handline catches'},
    cold:{title:'Cold inland settlement',local:['mushrooms','stone','salvage'],food:'Sheltered growing racks and supplied staples'},
    woodland:{title:'Cool woodland settlement',local:['roots','berries','mushrooms','timber','stone','salvage'],food:'Root beds, berry patches, nut groves and covered growing racks'},
    dry:{title:'Dry inland settlement',local:['pulses','stone','clay','salvage'],food:'Millet, dryland pulses and supplied staples'},
    warm:{title:'Warm inland settlement',local:['roots','pulses','fruit','reed','timber','clay','salvage'],food:'Orchard rows, food beds and bean plots'},
    mixed:{title:'Temperate inland settlement',local:['grain','pulses','roots','fruit','timber','stone','clay','salvage'],food:'Grain fields, fruit and nut orchards, bean plots and allotments'}
  };
  function localIds(site,habitat=environment(site)){
    const ids=new Set(habitats[habitat].local);
    // Recovered textiles come from a working sorting yard. Growing fibre has its own water and climate requirements.
    if(habitat==='dry'||habitat==='warm')ids.add('millet');
    if(['mixed','woodland','warm'].includes(habitat))ids.add('nuts');
    if(habitat==='coast'||habitat==='ocean'&&hasFacility(site,'fishingDock'))ids.add('shellfish');
    if(!['dry','ocean'].includes(habitat)||wetBed(site))ids.add('water');
    if(hasFacility(site,'workshop')||hasUse(site,'yard'))ids.add('cloth');
    if(['mixed','lakeside','woodland'].includes(habitat)||wetBed(site)&&!site.water)ids.add('flax');
    if(foodBed(site)){ids.add('greens');ids.add('roots');ids.add('herbs');}
    if(wetBed(site)){ids.add('reed');if(!site.water){ids.add('greens');ids.add('grain');}}
    if(hasUse(site,'yard')||hasFacility(site,'workshop'))ids.add('salvage');
    return [...ids];
  }
  function survey(site){
    if(!site||!Number.isFinite(site.lat)||!Number.isFinite(site.lon))return {summary:''};
    const habitat=habitats[environment(site)],ids=localIds(site);
    const food=ids.filter(foodKey).map(id=>resources[id].name.toLowerCase());
    const materials=ids.filter(id=>!foodKey(id)&&!['herbs','water'].includes(id)).map(id=>resources[id].name.toLowerCase());
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
    if(id==='water')return environment(site)==='dry'?1:resources.water.renew;
    if(['mushrooms','salvage','cloth','kelp','shellfish','timber','reed'].includes(id))return doc.renew;
    const sheltered=foodBed(site)&&['greens','roots'].includes(id);
    if(index===3&&!sheltered)return ['fruit','berries','nuts','herbs'].includes(id)?0:1;
    if(index===2&&['grain','fruit','berries','nuts','roots','millet'].includes(id))return doc.renew+1;
    return doc.renew;
  }
  function fieldSize(site,id){
    const def=resources[id];
    return def.capacity+(foodKey(id)&&foodBed(site)?2:0)+(id==='salvage'&&hasFacility(site,'workshop')?2:0);
  }
  function localRate(site,id,week){
    let rate=regrowth(site,id,seasonIndex(site,week));
    if(!living(id)||!rate)return rate;
    const field=site.resourceLedger?.fields[id],plan=site.resourceLedger?.care?.[id];
    if(field?.pressureUntil>=week&&!(plan?.from<=week&&plan.through>=week))rate=Math.max(0,rate-1);
    if(plan?.from<week&&week<=plan.through)rate++;
    return rate;
  }
  function stockAt(site,id,week){
    const cap=fieldSize(site,id),old=site.resourceLedger?.fields[id];
    if(!old)return cap;
    let quantity=Math.min(old.left,cap);
    if(resources[id].renew&&old.week<week){
      // At our maximum patch size, a full year of regrowth fills any
      // renewable patch. Bound iteration even for very old save files.
      const start=Math.max(old.week+1,week-51);
      for(let turn=start;turn<=week&&quantity<cap;turn++)quantity+=localRate(site,id,turn);
    }
    return Math.min(quantity,cap);
  }
  function closed(site,id,week){
    const plan=site.resourceLedger?.care?.[id];
    return plan?.kind==='rest'&&plan.from<=week&&week<plan.reopens;
  }
  function standing(site,id,week){return closed(site,id,week)?0:stockAt(site,id,week);}
  function removeAtSource(site,store,id,week,amount){
    const old=store.fields[id]||{},left=Math.max(0,standing(site,id,week)-amount);
    const field={week,left};
    if(living(id)){
      if(old.pressureUntil>=week)field.pressureUntil=old.pressureUntil;
      if(old.stripped>=week-8)field.stripped=old.stripped;
      if(!left){
        if(old.stripped!=null&&old.stripped>=week-8&&old.stripped!==week)field.pressureUntil=Math.min(max,week+6);
        field.stripped=week;
      }
    }
    store.fields[id]=field;return left;
  }
  function initialShelf(site){
    const ids=localIds(site),shelf={grain:2,pulses:2,salvage:2,timber:1,cloth:2,reed:1,water:1};
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
    const gardenWaste=Object.values(losses.bins).reduce((sum,n)=>sum+n,0);
    const compost=Math.min(compostLimit-(store.compost||0),gardenWaste);
    if(compost)store.compost=(store.compost||0)+compost;
    if(Object.keys(losses.bins).length)notes.push(amounts(losses.bins)+' passed their storage dates in the district bins');
    if(Object.keys(losses.shelf).length)notes.push(amounts(losses.shelf)+' spoiled at the merchant’s stall');
    if(compost)notes.push(compost+' lot'+(compost===1?' was':'s were')+' recovered for the community compost store');
    return notes.join('. ')+'.';
  }
  function destination(site,id,actor){
    if(id==='kelp'||id==='shellfish'||id==='reed'&&site.water)return {ref:{type:'quay'},name:'the quay'};
    const foods=foodKey(id)||id==='herbs'||id==='water',venue=foods?'garden':'workshop';
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
  function collectQuote(site,world,book,id,actor,target=destination(site,id,actor)){
    const carry=2+(root.EarthResidentShops?.gatherBonus?.(site,actor,id,foodKey(id))||0);
    const amount=Math.min(carry,standing(site,id,world.week),lotLimit-(book.bins[id]||0));
    const name=resources[id].name.toLowerCase();
    const reason=closed(site,id,world.week)?'The '+resources[id].place+' are resting. Collection reopens in week '+book.care[id].reopens+'.':
      (book.bins[id]||0)>=lotLimit?'All storage spaces for '+name+' are occupied. Use or sell a lot.':
      amount===0?(resources[id].renew?'This source needs time to recover.':'This deposit is exhausted. Trade for further supplies.'):'';
    return quote('gatherLot',id,amount?'Collect '+amount+' '+name:'Collect '+name,reason,amount,target,'Collect at '+target.name+'. The goods stay in the district bins until used or sold.');
  }
  function careQuote(world,site,store,id,actor,action,where,knownLocal=false){
    const doc=resources[id],plan=store.care?.[id],week=world.week;
    if(action==='compostLot'){
      if(!shelfLife[id])return null;
      const reason=!(store.bins[id]>0)?'Bring a fresh lot into the district bin first.':
        (store.compost||0)>=compostLimit?'The compost store is full. Dress a depleted bed first.':'';
      return quote(action,id,'Compost one lot',reason,1,null,'One real lot of '+doc.name.toLowerCase()+' becomes one dressing for a growing bed.');
    }
    if(!living(id)||!knownLocal&&!localIds(site).includes(id)||action!=='restPatch'&&!soilBed(id))return null;
    const rest=action==='restPatch',at=stockAt(site,id,week),cap=fieldSize(site,id);
    const reason=plan?.through>=week?'Aftercare here runs through week '+plan.through+'.':
      action==='dressSoil'&&!(store.compost>0)?'Dress the bed with one lot from the district compost store.':
      action==='irrigate'&&!(store.bins.water>0)?'Collect or buy one real cask of fresh water for the district bins.':
      at>=cap?'This patch is at full capacity.':'';
    where||=destination(site,id,actor);
    return quote(action,id,rest?'Rest this patch for three weeks':action==='irrigate'?'Water the growing beds':'Dress the soil with compost',reason,rest?0:1,where,
      rest?'Crews and merchants leave the patch alone through week '+(week+2)+'. Collection resumes in week '+(week+3)+'. Recovery improves through week '+(week+6)+'.':
      action==='irrigate'?'Use one cask from the district water bin. The beds stay open and recovery improves for three weeks.':
      'Use one district compost. The patch stays open and recovery improves for four weeks.');
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
  // Makers buy a single raw input at the counter. An empty district bin
  // and an empty treasury cannot prevent a privately financed purchase.
  function makerInput(world,site,id,room,commit=false){
    if(!own(resources,id))return null;
    const store=ledger(world,site),ready=store.shelf[id]||0;
    const price=Math.max(1,resources[id].value-1+Number(ready<=1));
    const reason=!ready?'The merchant has sold the last lot of '+resources[id].name.toLowerCase()+'.':
      store.serial>=max||room<price?'The merchant cannot record this payment.':'';
    if(commit&&!reason){
      takeStock(store,'shelf',id,1,world.week);
      store.serial++;site.resourceLedger=store;
    }
    return {price,reason,available:!reason,name:resources[id].name.toLowerCase(),stock:ready};
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
    const store=ledger(world,site),habitat=environment(site),local=new Set(localIds(site,habitat)),rows=[];
    for(const id of idList){
      const doc=resources[id],owned=store.bins[id]||0,shelf=store.shelf[id]||0,here=local.has(id);
      if(!here&&!own(store.bins,id)&&!own(store.shelf,id))continue;
      rows.push({id,name:doc.name,family:doc.family,unit:doc.unit,owned,shelf,local:here,
        source:here?doc.place:'Regional trade',standing:here?stockAt(site,id,world.week):0,
        reopens:closed(site,id,world.week)?store.care[id].reopens:null,
        caredThrough:store.care?.[id]?.through>=world.week?store.care[id].through:null,
        pressureUntil:store.fields[id]?.pressureUntil>=world.week?store.fields[id].pressureUntil:null,
        cap:here?fieldSize(site,id):0,renew:here?localRate(site,id,world.week+1):0,finite:doc.renew===0,
        storageWeeks:shelfLife[id]||null,binDate:oldestDate(store,'bins',id,world.week),stallDate:oldestDate(store,'shelf',id,world.week)});
    }
    let cachedOptions,cachedRecipes,cachedPrices;
    function priceList(){
      if(cachedPrices)return cachedPrices;
      const closedBook=store.serial>=max||exchange.serial>=max;
      cachedPrices=rows.map(row=>{
        const [ask,bid]=tradeQuotes(site,world,store,exchange,row.id,room);
        const terms=(q,expires,lots)=>({price:q.price,lots,expires,available:!closedBook&&q.available,
          reason:closedBook?'The exchange cannot record another trade.':q.reason});
        return {id:row.id,name:row.name,ask:terms(ask,row.stallDate,row.shelf),bid:terms(bid,row.binDate,row.owned)};
      });
      return cachedPrices;
    }
    function batches(){
      if(!cachedRecipes){
        const present=new Set(rows.map(r=>r.id));
        cachedRecipes=recipes.filter(r=>Object.keys(r.inputs).every(k=>present.has(k))).map(r=>({...recipeQuote(site,store,r),inputs:Object.keys(r.inputs)}));
      }
      return cachedRecipes;
    }
    function orders(){
      if(cachedOptions)return cachedOptions;
      cachedOptions=[];
      for(const row of rows){
        const id=row.id;
        if(row.local){
          const target=destination(site,id,actor);
          cachedOptions.push(collectQuote(site,world,store,id,actor,target));
          if(living(id))for(const action of ['restPatch','dressSoil','irrigate']){
            const o=careQuote(world,site,store,id,actor,action,target,true);if(o)cachedOptions.push(o);
          }
        }
        if(row.owned&&shelfLife[id])cachedOptions.push(careQuote(world,site,store,id,actor,'compostLot'));
        cachedOptions.push(...tradeQuotes(site,world,store,exchange,id,room));
      }
      cachedOptions.push(...batches());return cachedOptions;
    }
    return {habitat:habitats[habitat].title,foodSources:habitats[habitat].food,season:seasonLabels[seasonIndex(site,world.week)],
      fishing:Boolean(root.CommonEarthSim?.waterfront?.(site)||site.water||site.coastal),
      serial:store.serial,rows,get prices(){return priceList();},get options(){return orders();},get recipes(){return batches();},binLimit:lotLimit,compost:store.compost||0,compostLimit,mealNeed:Math.ceil(site.population/5),
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
      if(['restPatch','dressSoil','irrigate','compostLot'].includes(r.action))option=careQuote(world,site,store,r.good,actor,r.action);
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
      const left=removeAtSource(site,store,good,world.week,n);
      addStock(store,'bins',good,n,world.week);
      message=actorName+' collected '+n+' '+resources[good].name.toLowerCase()+' from the '+resources[good].place+'. '+left+' remain at the source.';
    }else if(['restPatch','dressSoil','irrigate'].includes(option.action)){
      const week=world.week,rest=option.action==='restPatch',watered=option.action==='irrigate',doc=resources[good];
      // Materialise the old field before beginning a programme. Earlier weeks
      // cannot borrow its recovery bonus when the next player inspects the patch.
      const left=stockAt(site,good,week);
      store.fields[good]={...store.fields[good],left,week};
      const plan={kind:rest?'rest':watered?'water':'compost',from:week,through:Math.min(max,week+(rest?6:watered?3:4))};
      if(rest)plan.reopens=Math.min(max,week+3);else if(watered)takeStock(store,'bins','water',1,week);else store.compost--;
      (store.care||={})[good]=plan;
      message=actorName+(rest?' marked the '+doc.place+' to rest. Collection reopens in week '+plan.reopens:
        watered?' watered the '+doc.place+' with one cask of district water. The beds stay open':' dressed the '+doc.place+' with one lot of community compost. The beds stay open')+'. Aftercare runs through week '+plan.through+'.';
    }else if(option.action==='compostLot'){
      takeStock(store,'bins',good,1,world.week);store.compost=(store.compost||0)+1;
      message=actorName+' turned one public lot of '+resources[good].name.toLowerCase()+' into compost. There are '+store.compost+' soil dressings.';
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
       root.EarthCommunityLife?.residency&&root.EarthCommunityLife.residency(site,self.id)!=='member')return null;
    const meals=Math.max(1,Math.ceil(site.population/5)),initiative=self.traits?.initiative??50;
    const pantryShort=site.food<2*meals;
    const role=root.EarthCareers?.role?.(site,self.id)||self.profile?.originRole||self.profile?.role||'';
    if(!pantryShort&&/grower|garden|seed keeper/i.test(role)&&(self.traits?.patience??50)>=50){
      for(const [id,field] of Object.entries(store.fields)){
        if(!living(id)||!(field.pressureUntil>=world.week)||store.care?.[id]?.through>=world.week)continue;
        const act=soilBed(id)&&store.compost>0?'dressSoil':soilBed(id)&&store.bins.water>0?'irrigate':'restPatch',option=careQuote(world,site,store,id,self.id,act);
        if(!option?.available)continue;
        return {option,title:option.title+' at the '+resources[id].place,activity:'tendPatch',resource:id,care:act,venue:id==='kelp'||id==='shellfish'?'dock':foodKey(id)||id==='herbs'?'garden':'workshop',
          goal:'Keep the next harvest possible',reason:'The '+resources[id].place+' have been stripped twice. We have '+site.food+' food for '+meals+
            ' household shares. '+(act==='restPatch'?'I can leave this patch undisturbed while we draw on stores.' :act==='irrigate'?'I can spare a cask of water and keep the beds open.':'I can use a dressing of compost and leave the patch open.'),score:86+initiative/12};
      }
    }
    if(!Object.values(store.bins).some(n=>n>0)||!pantryShort&&site.funds>=7&&!expiringPublicLot(site,world.week))return null;
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
    return {reason:plan.reason+' '+result.message,title:plan.title,goal:plan.goal,activity:plan.activity,venue:plan.venue,resource:plan.resource,care:plan.care};
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
    const imported=turn%4===0,source=imported?['grain','pulses','timber','reed','cloth','salvage','water']:ids.filter(key=>standing(site,key,world.week)>0);
    if(source.length){
      const id=source[(imported?Math.floor(turn/4):turn)%source.length],cost=Math.max(1,resources[id].value-1),ready=store.shelf[id]||0;
      if(ready<4&&exchange.till>=cost){
        if(!imported)removeAtSource(site,store,id,world.week,1);
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
    return {...chosen,name:doc.name.toLowerCase(),place:doc.place,venue:['kelp','shellfish'].includes(chosen.id)?'dock':'garden'};
  }
  function harvestForProject(world,site,crop,wanted,mayStoreRaw){
    // All baskets, including those taken straight to households, leave the
    // same standing field that suppliers, visitors to the stall and players see.
    if(!integer(wanted,1,max)||!crop||!integer(crop.available,1,max))return {amount:0,stored:null};
    if(crop.id==='fish'){
      const amount=Math.min(wanted,crop.available,root.EarthFisheries?.ground?.(site,world.week)?.available??crop.available);
      const taken=!root.EarthFisheries?.take||root.EarthFisheries.take(site,world.week,amount);
      return {amount:taken?amount:0,stored:null};
    }
    if(!own(resources,crop.id)||!localIds(site).includes(crop.id))return {amount:0,stored:null};
    const amount=Math.min(wanted,crop.available,standing(site,crop.id,world.week));
    if(!amount)return {amount:0,stored:null};
    const store=ledger(world,site),stock=store.bins[crop.id]||0,meals=Math.max(1,Math.ceil(site.population/5));
    const stored=amount>=2&&mayStoreRaw&&site.food>=3*meals&&stock<Math.min(lotLimit,Math.max(2,meals))?crop:null;
    removeAtSource(site,store,crop.id,world.week,amount);
    if(stored)addStock(store,'bins',crop.id,1,world.week);
    store.serial=Math.min(max,store.serial+1);site.resourceLedger=store;
    return {amount,stored};
  }
  // Quotes and extraction read the same standing fields, closures and fishery as
  // a handline, a project harvest or a resident gathering a lot personally.
  function orderSources(world,site,good){
    const sources=localIds(site).filter(id=>good==='food'?foodKey(id):
      ['Fibre & wood','Minerals'].includes(resources[id].family)).map(id=>{
        const r=resources[id];
        return {id,name:r.name.toLowerCase(),place:r.place,available:standing(site,id,world.week),
          venue:['kelp','shellfish'].includes(id)?'dock':good==='food'?'garden':'workshop'};
      });
    if(good==='food'&&!site.handline){
      const stock=root.EarthFisheries?.ground?.(site,world.week);
      if(stock)sources.push({id:'fish',name:'fresh fish',place:stock.name.toLowerCase(),venue:'dock',available:stock.available});
    }
    return sources;
  }
  function collectDistrictLot(world,site,food){
    const store=ledger(world,site);
    const candidates=localIds(site).filter(id=>Boolean(foodKey(id))===food&&(food||!['water','herbs'].includes(id))&&standing(site,id,world.week)>0&&
      !closed(site,id,world.week)&&(store.bins[id]||0)<lotLimit);
    const id=candidates.sort((a,b)=>(store.bins[a]||0)-(store.bins[b]||0)||standing(site,b,world.week)-standing(site,a,world.week))[0];
    if(!id)return '';
    removeAtSource(site,store,id,world.week,1);addStock(store,'bins',id,1,world.week);
    store.serial++;site.resourceLedger=store;
    return resources[id].name;
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
    return {week:p.finished,crop:p.crop,sourceVenue:['fish','kelp','shellfish'].includes(p.crop)?'dock':'garden',
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
    if(d.compost!=null&&!integer(d.compost,0,compostLimit))return false;
    if(d.care!=null&&(!object(d.care)||!Object.entries(d.care).every(([id,p])=>living(id)&&object(p)&&integer(p.from,1,week)&&
      own(d.fields,id)&&p.from<=d.fields[id].week&&integer(p.through,p.from,max)&&
      (p.kind==='rest'?p.reopens===Math.min(max,p.from+3)&&p.through===Math.min(max,p.from+6):
        ['compost','water'].includes(p.kind)&&soilBed(id)&&p.reopens==null&&p.through===Math.min(max,p.from+(p.kind==='water'?3:4))))))return false;
    return Object.entries(d.fields).every(([k,f])=>own(resources,k)&&object(f)&&integer(f.week,1,week)&&integer(f.left,0,resources[k].capacity+2)&&
      (f.stripped==null||living(k)&&integer(f.stripped,1,f.week))&&
      (f.pressureUntil==null||living(k)&&integer(f.pressureUntil,1,Math.min(max,f.week+6))));
  }
  root.EarthResources=Object.freeze({orderSources,collectDistrictLot,survey,environment,view,run,tick,makerInput,ageStores,expiringPublicLot,crewOpportunity,crewWork,projectCrop,quickGather,projectShipment,harvestForProject,useForPantry,valid,isResource:id=>own(resources,id),isCrop:id=>id==='fish'||own(resources,id)&&foodKey(id),isAction:action=>actions.has(action)});
})(typeof window==='undefined'?globalThis:window);
