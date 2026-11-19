/* Paid production rounds use the shared save lock but do not consume a calendar
   decision or the player's movement. Sales outside the region are export income. */
(function(root){
  'use strict';
  const period=12000,targets=[80,240,540],eras=['Neighbourhood','Federation','Stewardship'];
  const trades={
    food:{axis:'care',item:'basket'},
    repair:{axis:'craft',item:'stool'},
    exchange:{axis:'organisation',item:'satchel'}
  };
  const traditions=['Harvest supper','Repair circle','Market gathering'];
  const institutions=['Seed library','Apprentices’ guild','Merchants’ cooperative'];
  const vehicles=['Handcart','Freight wagon','Delivery van','Electric carrier'];
  const members=site=>(root.EarthPersonas?.list(site)||[]).filter(p=>root.EarthCommunityLife.residency(site,p.id)==='member'&&!root.EarthCommunityLife.commuting(site,p.id));
  const key=p=>p.identityKey||p.id;
  const resident=(site,p)=>site.growth?.households.find(h=>h.owner===key(p));
  const account=(site,id)=>site.purses?.people?.[id];
  const trade=(site,p)=>root.EarthDistrictOrders.occupation(site,p);
  function reserve(world,site){
    const floor=root.EarthCivicInitiatives?.reserve(world,site)||{funds:6,materials:3,food:6};
    const held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    return Object.fromEntries(['funds','materials','food'].map(k=>[k,floor[k]+(held[k]||0)]));
  }
  function homePoint(site,plot){
    return site.growth?.households[plot]?.houseSite||{x:1.7+(plot%10)*2.2,y:-1.9-Math.floor(plot/10)*1.75};
  }
  function shopPoint(site,plot){
    const g=site.growth,kept=g?.households.find(h=>h.shop&&h.businessPlot===plot);
    if(kept)return kept.shopSite||{x:1.7+(plot%10)*2.2,y:-2.1-(Math.ceil(g.households.length/10)+Math.floor(plot/10))*1.75};
    // New trade frontages face the westward path. Extending a residential
    // row elsewhere never moves the shop or changes ownership of its lot.
    return {x:-1.9-Math.floor(plot/10)*1.9,y:1.7+(plot%10)*2.2};
  }
  function register(site,people){
    const g=site.growth||={round:0,points:0,roads:0,vehicle:0,custom:'',households:[],history:[],sales:0};
    const land=new Set(),pointKey=p=>Math.round((p.x-1.7)/2.2)+','+Math.round((p.y+1.9)/1.75);
    const owners=new Set();
    for(const h of g.households){
      owners.add(h.owner);
      land.add(pointKey(homePoint(site,h.plot)));
      if(h.shop){h.shopSite||=shopPoint(site,h.businessPlot);land.add(pointKey(h.shopSite));}
    }
    for(const p of people){
      const owner=key(p);if(owners.has(owner))continue;
      const plot=g.households.length,h={owner,name:p.name,plot,home:1,points:0,stock:0,shop:'',businessPlot:null,last:'Settled on residential lot '+(plot+1)};
      let i=plot,spot=homePoint(site,i);
      while(land.has(pointKey(spot))){i++;spot=homePoint(site,i);}
      if(i!==plot)h.houseSite=spot;
      g.households.push(h);owners.add(owner);land.add(pointKey(spot));
    }
    return g;
  }
  function report(site){
    const g=site.growth,level=site.tech.length;
    return {points:g?.points||0,target:targets[level]||0,next:eras[level]||'',vehicle:vehicles[g?.vehicle||0],
      custom:g?.custom||'No custom adopted yet',roads:g?.roads||0};
  }
  function goal(site,p){
    const h=resident(site,p),points=h?.points||0,rank=Math.floor(points/12);
    return {h,points,rank,next:12*(rank+1)};
  }
  // Repeated account names and movement reasons are shared within each round.
  // Long-running districts retain readable receipts without serialising the
  // same prose once per worker and transfer.
  const receiptFields=['from','to','good','amount','personId','workId','reason'];
  function packTransfers(round,rows){
    const words=[],indices=new Map();
    const index=value=>{
      if(value==null)return 0;
      if(!indices.has(value)){words.push(value);indices.set(value,words.length);}
      return indices.get(value);
    };
    round.words=words;
    round.lines=rows.map(row=>receiptFields.map(k=>(k==='amount'?row[k]:index(row[k])).toString(36)).join('.')).join('/');
  }
  function transfers(round){
    if(!round?.lines)return round?.transfers||[];
    const words=round.words;
    return round.lines.split('/').map(line=>{
      const parts=line.split('.'),row={};
      receiptFields.forEach((k,i)=>{const index=parseInt(parts[i],36);row[k]=k==='amount'?index:words[index-1]??null;});
      return row;
    });
  }
  function recordResearch(world,site,tech){
    const g=site.growth;if(!g)return;
    const id='research-'+tech.id,who=root.EarthDistrictOrders.publicAccount,why='Research adopted by the local council';
    g.lastResearch={week:world.week,tech:tech.id,funds:tech.funds,materials:tech.materials};
    const last=g.history[0];if(last?.week!==world.week)return;
    const rows=transfers(last);
    root.EarthDistrictOrders.record(rows,who,tech.name,'funds',tech.funds,null,id,why);
    root.EarthDistrictOrders.record(rows,'Public building store',tech.name,'materials',tech.materials,null,id,why);
    last.funds-=tech.funds;last.materials-=tech.materials;packTransfers(last,rows);
  }
  function buildingJob(site,h,id){
    const g=site.growth,b=h.build,road=g.road;
    const onRoad=road?.ids?.includes(id);
    if(!onRoad&&(!b||b.person!==id))return null;
    const project=onRoad?road:b,shop=!onRoad&&b.shop;
    const lot=onRoad?road.lot:shop?b.lot:h.plot;
    const base=shop?shopPoint(site,lot):homePoint(site,lot);
    const shopName=shop?root.EarthResidentShops.products[shop].name+' shop':null;
    const destination=onRoad?'access road to lot '+(lot+1):shop?shopName:h.name+'’s '+b.extension.toLowerCase();
    const to={x:base.x+(onRoad&&road.ids.indexOf(id)===1?.28:0),y:base.y+.52,label:destination};
    const from=project.origins?.[id]||{x:21.1,y:17.46,label:'the building store'},travelMs=root.EarthDistrictOrders.movement(site,from,to);
    const action=onRoad?'Lay the access road':shop?'Build the trading frontage':'Improve the home';
    const reason=onRoad?'The council set aside three materials and both crew wages. This road gives another household access and opens a licensed trading lot.':
      h.name+' holds the deed and reserved two materials to finish '+destination+'.';
    return {kind:'build',id:project.id,ownerId:id,workerName:h.name,name:destination,phase:'build',step:2,steps:2,orderGood:'materials',
      source:from.label,from,to,point:to,destination,venue:'workshop',action,reason,resource:'materials',resourceName:'building materials',amount:onRoad?3:2,
      payer:onRoad?'Community treasury':h.name,price:onRoad?1:0,tool:onRoad?'spade and tamper':'hammer and measuring rule',
      startedAt:project.at||0,travelMs,workMs:onRoad?6400:8200};
  }
  function activeWork(site){
    const g=site.growth;if(!g)return [];
    const rows=[];
    for(const h of g.households){
      if(h.order)rows.push(root.EarthDistrictOrders.orderView(site,h.order));
      else if(h.build?.person)rows.push(buildingJob(site,h,h.build.person));
    }
    if(g.road?.ids)g.road.owners.forEach((owner,i)=>{
      const h=g.households.find(row=>row.owner===owner);if(h)rows.push(buildingJob(site,h,g.road.ids[i]));
    });
    return rows;
  }
  function work(site,p){
    const id=typeof p==='string'?p:p?.id,g=site?.growth;
    if(!id||!g)return null;
    const h=g.households.find(h=>h.order?.person===id||h.build?.person===id);
    if(h?.order)return root.EarthDistrictOrders.orderView(site,h.order);
    if(h)return buildingJob(site,h,id);
    const i=g.road?.ids?.indexOf(id)??-1;
    return i<0?null:buildingJob(site,g.households.find(row=>row.owner===g.road.owners[i]),id);
  }
  const reachedWork=(at,job)=>!job||at<job.startedAt||at>=job.startedAt+job.travelMs+job.workMs;
  function due(world,now=Date.now()){
    const elapsed=now-(world.lastProductionAt||0);
    return !world.lastProductionAt||elapsed<0||elapsed>=period;
  }
  function settle(world,site,closeWeek=false){
    const jobs=root.EarthDistrictOrders,people=members(site),g=register(site,people),floor=reserve(world,site);
    const start={food:site.food,materials:site.materials,funds:site.funds},events=[],transfers=[];
    const byOwner=new Map(g.households.map(h=>[h.owner,h])),present=new Map(people.map(p=>[key(p),p]));
    const hOf=p=>byOwner.get(key(p));
    const played=site.id===world.activeId?(root.EarthAgency?.actorId(site)||'steward'):null;
    const at=closeWeek?(world.lastProductionAt||0):Date.now();
    const add=jobs.record,counts={food:0,repair:0,exchange:0},free=[],busy=new Set();
    g.round++;
    let wages=0;
    const credit=(p,n,why)=>root.EarthPurses.productionReceipt(world,site,p.id,n,why);
    const goodsName=good=>good==='materials'?'Public building store':jobs.publicAccount;
    const publicMove=(to,good,n,p,id,why)=>add(transfers,goodsName(good),to,good,n,p?.id,id,why);
    const act=(p,action)=>{const h=hOf(p);h.activity=action;busy.add(p.id);};
    const workedOn=(p,n)=>{const h=hOf(p);h.points+=n;g.points+=n;};
    for(const h of g.households){
      const p=present.get(h.owner);
      if(!p){
        if(h.order)jobs.cancel(site,h,transfers,'The resident left the district');
        continue;
      }
      const block=(!closeWeek&&p.id===played?'Choosing your own activity':jobs.commitment(world,site,p));
      if(block){
        if(h.order)jobs.cancel(site,h,transfers,block);
        h.activity='commitment';h.last=block+'.';busy.add(p.id);continue;
      }
      if(!h.order)continue;
      const o=h.order;busy.add(p.id);
      const elapsed=at<o.at?o.travelMs+o.workMs:at-o.at;
      if(!closeWeek&&elapsed<o.travelMs+o.workMs)continue;
      if(o.phase==='collect'){
        if(!jobs.collect(world,site,h,at,transfers)||!closeWeek)continue;
      }
      const earned=h.order.wage;
      if(jobs.deliver(world,site,p,h,transfers,counts)){wages+=earned;events.push(h.last);}
    }
    // A deed and its materials stay together while the owner works elsewhere.
    // A later available shift erects the building before its benefits begin.
    for(const p of people){
      const h=hOf(p),build=h.build;
      if(!build||busy.has(p.id))continue;
      if(!closeWeek&&!reachedWork(at,buildingJob(site,h,p.id))){act(p,build.shop?'shop':'home');continue;}
      const arrived=buildingJob(site,h,p.id);if(arrived)h.lastPoint=arrived.to;
      const name=build.shop?root.EarthResidentShops.products[build.shop].name+' shop':build.extension;
      if(build.shop){h.shopSite=shopPoint(site,build.lot);h.shop=build.shop;h.businessPlot=build.lot;}else{h.home++;h.extension=build.extension;}
      const message=p.name+' finished '+name+' with the two materials held for their '+(build.shop?'shop':'home')+'.';
      add(transfers,'Property worksite',name,'materials',2,p.id,build.id,'Construction completed');
      events.push(message);h.last=message;act(p,build.shop?'shop':'home');workedOn(p,3);delete h.build;
    }
    if(g.road){
      const project=g.road,crew=project.owners.map(owner=>present.get(owner));
      if(crew.every(p=>p&&!busy.has(p.id)&&!hOf(p).build)){
        const able=crew.every(p=>{const a=account(site,p.id);return (a?.balance||0)<Number.MAX_SAFE_INTEGER&&(a?.productionIncome||0)<Number.MAX_SAFE_INTEGER;});
        const arrived=closeWeek||crew.every(p=>reachedWork(at,buildingJob(site,hOf(p),p.id)));
        if(!arrived)for(const p of crew)act(p,'road');
        if(able&&arrived){
          for(const p of crew){
            const h=hOf(p),msg=p.name+' earned a district wage for building the access road to residential lot '+(project.lot+1)+'.';
            h.lastPoint=buildingJob(site,h,p.id)?.to;
            credit(p,1,msg);add(transfers,'Road worksite',p.name,'funds',1,p.id,project.id,'Road-building wage');
            h.roadLot=project.lot;act(p,'road');h.last=msg;workedOn(p,2);wages++;
          }
          add(transfers,'Road worksite','Road to lot '+(project.lot+1),'materials',3,crew[0].id,project.id,'Laid the road');
          g.roads++;g.lastRoad=g.round;g.points+=2;
          const beneficiary=g.households[project.lot];
          if(beneficiary){
            beneficiary.access=project.id;beneficiary.points++;g.points++;
          }
          events.push(crew.map(p=>p.name).join(' and ')+' opened the access road to '+(beneficiary?.name||'the district')+'’s lot. It permits another trading frontage.');
          site.trust=Math.min(100,site.trust+1);delete g.road;
        }
      }else if(crew.some(p=>!p)){
        site.materials+=3;site.funds+=2;
        add(transfers,'Road worksite',goodsName('materials'),'materials',3,null,project.id,'Crew member moved');
        add(transfers,'Road worksite',jobs.publicAccount,'funds',2,null,project.id,'Crew member moved');
        delete g.road;events.push('A road crew member moved away. The district returned the reserved supplies and can put together a new crew.');
      }
    }
    const usedLots=new Set(),hiring=new Set(g.households.filter(h=>h.order?.employer).map(h=>h.order.employer));
    for(const h of g.households){
      if(h.shop)usedLots.add(h.businessPlot);
      if(h.build?.shop)usedLots.add(h.build.lot);
    }
    const permits=2+g.roads+site.tech.length*2;
    for(let i=0;i<people.length;i++){
      const p=people[(i+g.round-1)%people.length],h=hOf(p);
      if(busy.has(p.id)||h.order||h.build)continue;
      const work=trade(site,p),cash=account(site,p.id)?.balance||0;
      // Catch, food and consumables already in a household are its own goods.
      if(h.pantry&&g.round%3===0){h.pantry--;add(transfers,p.name,'Household meals','food',1,p.id,null,'Ate from the home pantry');}
      const wish=root.EarthAutonomy?.intent?.(site,p.id)?.goal||'';
      const commercial=(p.traits.initiative>=52||cash>=12||/business|market|shop/i.test(wish))&&!h.shop;
      let lot=null;
      if(commercial&&cash>=7)for(let j=0;j<permits;j++){const candidate=(h.plot+j)%permits;if(!usedLots.has(candidate)){lot=candidate;break;}}
      const reserves=site.materials-floor.materials-(g.roads<g.households.length&&!g.road?3:0);
      const fromHome=Math.min(2,h.supplies||0),fromStore=2-fromHome;
      const improvement=lot!==null||h.home<3&&cash>=5;
      if(improvement&&reserves>=fromStore&&(g.round+h.plot)%3===0){
        const shop=lot!==null?(p.hobbyAxis==='music'?'flute':trades[work].item):null,price=(shop?3:1)+fromStore;
        const extension=p.hobbyAxis==='music'?'Music room':work==='food'?'Kitchen garden':work==='repair'?'Home workshop':'Courtyard studio';
        const id='property-'+g.round+'-'+h.plot;
        const why=p.name+' paid '+price+' to the district and reserved 2 materials for '+(shop?'a commercial lot':'their '+extension.toLowerCase())+'.';
        if(credit(p,-price,why)){
          site.materials-=fromStore;h.supplies=(h.supplies||0)-fromHome;site.funds+=price;
          add(transfers,p.name,jobs.publicAccount,'funds',price,p.id,id,shop?'Commercial deed and building materials':'Home improvement and materials');
          publicMove('Property worksite','materials',fromStore,p,id,'Reserved at the building site');
          add(transfers,p.name,'Property worksite','materials',fromHome,p.id,id,'Owner supplied building materials');
          h.build={id,shop,extension,lot,person:p.id,at,round:g.round,...(h.lastPoint?{origins:{[p.id]:h.lastPoint}}:{})};if(shop)usedLots.add(lot);
          act(p,shop?'shop':'home');h.last=why;events.push(why);continue;
        }
      }
      // The proprietor invests from an actual purse. This till can finance
      // a specialist while the proprietor keeps a different obligation.
      if(h.shop&&!h.businessFunds&&cash>=6){
        const amount=Math.min(4,cash-3),reason=p.name+' invested '+amount+' personal funds in the shop’s working capital.';
        if(credit(p,-amount,reason)){
          h.businessFunds=amount;
          add(transfers,p.name,p.name+'’s shop','funds',amount,p.id,'capital-'+h.plot,'Owner invested working capital');
        }
      }
      if(h.shop&&!hiring.has(h.owner)&&h.stock<3&&(h.businessFunds<2||!h.businessFunds||h.stock===0&&(h.plot+g.round)%3===0)&&reserves>=1&&cash>=2&&((h.plot+g.round)%2===0||h.stock===0)){
        const id='stock-'+g.round+'-'+h.plot,article=root.EarthResidentShops.products[h.shop].name;
        const why=p.name+' bought a material from the district to make a '+article+'.';
        if(credit(p,-1,why)){
          site.materials--;site.funds++;h.stock++;act(p,'shop');h.last=why;workedOn(p,1);
          add(transfers,p.name,jobs.publicAccount,'funds',1,p.id,id,'Bought workshop input');
          publicMove(p.name,'materials',1,p,id,'Used in manufacture');
          add(transfers,'Shop workbench',p.name,article,1,p.id,id,'Finished retail stock');continue;
        }
      }
      free.push(p);
    }
    // The public committee books actual workers, treasury and materials before
    // a road can be completed. Reserved workers are unavailable for private jobs.
    if(!g.road&&g.roads<g.households.length&&free.length>=2&&site.materials-floor.materials>=3&&site.funds-floor.funds>=2&&g.round-(g.lastRoad||0)>=3){
      const nominees=free.filter(p=>p.traits.sociability>=42||trade(site,p)==='repair'||hOf(p).plot>=g.roads&&g.round-(g.lastRoad||0)>=6);
      if(nominees.length>=2){
        const pair=nominees.slice(0,2),id='road-'+g.round+'-'+g.roads;
        const origins=Object.fromEntries(pair.filter(p=>hOf(p).lastPoint).map(p=>[p.id,hOf(p).lastPoint]));
        g.road={id,lot:g.roads,owners:pair.map(key),ids:pair.map(p=>p.id),origins,at,round:g.round};site.materials-=3;site.funds-=2;
        publicMove('Road worksite','materials',3,pair[0],id,'Materials committed to the road');
        publicMove('Road worksite','funds',2,pair[0],id,'Wages reserved for the road crew');
        for(const p of pair){act(p,'road');const h=hOf(p);h.roadLot=g.roads;h.last=p.name+' has committed to the funded access road to lot '+(g.roads+1)+'.';}
      }
    }
    const offers=jobs.prepare(world,site,people,transfers);
    let onOrder=g.households.reduce((n,h)=>n+Boolean(h.order),0);
    // Staff home industries, allow association and leave time for other goals.
    const capacity=Math.max(2,Math.ceil(people.length*.78))+g.vehicle;
    for(const p of free){
      const h=hOf(p);if(busy.has(p.id)||h.build)continue;
      const intent=root.EarthAutonomy?.intent?.(site,p.id),rest=intent?.kind==='rest'&&(g.round+h.plot)%3===0;
      if(rest||onOrder>=capacity){h.activity='home';h.last=rest?'Resting at home between orders.':'The available orders are already staffed.';continue;}
      const o=jobs.start(world,site,p,h,floor,offers,at,transfers);
      if(!o)continue;
      onOrder++;
      if(closeWeek&&jobs.collect(world,site,h,at,transfers)&&jobs.deliver(world,site,p,h,transfers,counts)){wages+=o.wage;events.push(h.last);}
    }
    for(const p of people){
      const h=hOf(p),purse=account(site,p.id);if(!purse||purse.balance<4||h.order||h.build)continue;
      if((g.round+h.plot)%12===0){
        const used=Object.keys(purse.belongings||{}).find(k=>['basket','stool','satchel'].includes(k));
        if(used){if(--purse.belongings[used]===0)delete purse.belongings[used];add(transfers,p.name,'Worn out',used,1,p.id,null,'Used at work');}
      }
      const sellers=people.filter(s=>s!==p&&hOf(s).stock>0&&!purse.belongings?.[hOf(s).shop]);
      sellers.sort((a,b)=>Number(root.EarthResidentShops.products[hOf(b).shop].axis===p.hobbyAxis)-Number(root.EarthResidentShops.products[hOf(a).shop].axis===p.hobbyAxis));
      if(!sellers.length)continue;
      const s=sellers[0],seller=hOf(s),item=root.EarthResidentShops.products[seller.shop];
      const price=2+Number(seller.stock<2)+Number(!h.access&&p.traits.patience<50),id='sale-'+g.round+'-'+h.plot;
      const sale=p.name+' bought a '+item.name+' from '+s.name+' for '+price+' funds.';
      if(root.EarthPurses.transferPerson(world,site,p.id,s.id,price,sale,seller.shop).ok){
        seller.stock--;
        if((seller.businessFunds||0)<6&&credit(s,-1,s.name+' retained one fund of sale proceeds for the next shop shift.')){
          seller.businessFunds=(seller.businessFunds||0)+1;
          add(transfers,s.name,s.name+'’s shop','funds',1,s.id,id,'Reinvested retail proceeds');
        }
        const items=purse.belongings||={};items[seller.shop]=(items[seller.shop]||0)+1;
        add(transfers,p.name,s.name,'funds',price,p.id,id,'Retail payment');add(transfers,s.name,p.name,item.name,1,s.id,id,'Shop purchase');
        g.sales++;workedOn(s,1);h.activity='purchase';h.marketLot=seller.businessPlot;h.last=sale;events.push(sale);
      }
    }
    const habits=g.practices||={food:0,repair:0,exchange:0};
    for(const k of Object.keys(counts))habits[k]=Math.min(1e7,habits[k]+counts[k]);
    if(g.roads>=2&&(!g.custom||g.round%24===0)){
      const choice=Object.keys(counts).sort((a,b)=>habits[b]-habits[a])[0];
      if(habits[choice]>=3){const prior=g.custom;g.custom=traditions[Object.keys(trades).indexOf(choice)];if(prior!==g.custom)events.push('After '+habits[choice]+' completed '+choice+' orders, neighbours adopted the '+g.custom+'.');}
    }
    if(g.custom&&site.tech.length>=2&&!g.institution&&site.funds-floor.funds>=5&&site.materials-floor.materials>=3){
      g.institution=institutions[traditions.indexOf(g.custom)];site.funds-=5;site.materials-=3;
      publicMove(g.institution,'funds',5,null,'institution','Opening cost');publicMove(g.institution,'materials',3,null,'institution','Construction supplies');
      events.push('Residents opened the '+g.institution+' to teach the skills behind their '+g.custom+'.');
    }
    for(const p of people){
      const h=hOf(p),level=Math.floor(h.points/12);
      if(level>(h.trained||0)){
        root.EarthCareers.productionLesson(site,p,trades[trade(site,p)].axis,world.week);
        if(g.institution)root.EarthCareers.productionLesson(site,p,'communication',world.week);
        h.trained=level;
      }
    }
    if(g.vehicle<site.tech.length&&g.roads>g.vehicle&&site.funds-floor.funds>=6&&site.materials-floor.materials>=4){
      g.vehicle++;site.funds-=6;site.materials-=4;const name=vehicles[g.vehicle];
      publicMove(name,'funds',6,null,'transport-'+g.vehicle,'Vehicle commissioning');publicMove(name,'materials',4,null,'transport-'+g.vehicle,'Vehicle construction');
      events.push('The transport crew commissioned a '+name+'. Carriers can now move a larger load along the access roads.');
    }
    g.history.unshift({round:g.round,week:world.week,wages,food:site.food-start.food,materials:site.materials-start.materials,
      funds:site.funds-start.funds,events:events.slice(-8)});
    packTransfers(g.history[0],transfers);
    g.history.length=Math.min(8,g.history.length);
    // Recent movement is itemised. Older rounds retain their account balances
    // and investments; personal receipts and deeds persist independently.
    if(g.history[3]){delete g.history[3].transfers;delete g.history[3].lines;delete g.history[3].words;}
  }
  function validTransfers(row){
    if(row.lines===undefined)return row.words===undefined;
    if(typeof row.lines!=='string'||row.lines.length>200000||!Array.isArray(row.words)||
      row.words.length>8000||!row.words.every(w=>typeof w==='string'&&w.length<=600))return false;
    if(!row.lines)return !row.words.length;
    return row.lines.split('/').every(line=>{
      const fields=line.split('.');
      return fields.length===7&&fields.every((s,i)=>/^[0-9a-z]{1,12}$/.test(s)&&
        (i===3?Number.isSafeInteger(parseInt(s,36))&&parseInt(s,36)>0:parseInt(s,36)<=row.words.length));
    });
  }
  function valid(site,week){
    const g=site.growth;if(g===undefined)return true;
    const nat=n=>Number.isSafeInteger(n)&&n>=0;
    if(!g||!root.EarthDistrictOrders.validBroker(g.broker)||![g.points,g.round,g.roads,g.sales,g.vehicle].every(nat)||g.vehicle>3||!['',...traditions].includes(g.custom)||
      g.institution&&!institutions.includes(g.institution)||!Array.isArray(g.households)||!Array.isArray(g.history)||g.history.length>8)return false;
    const owners=new Set(),lots=new Set();
    const text=s=>typeof s==='string'&&s.length>0&&s.length<=350;
    const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<1e5&&Math.abs(p.y)<1e5;
    const origins=(o,ids)=>o==null||o&&typeof o==='object'&&!Array.isArray(o)&&Object.entries(o).every(([id,p])=>ids.includes(id)&&point(p)&&text(p.label));
    if(g.lastRoad!=null&&(!nat(g.lastRoad)||g.lastRoad>g.round)||g.practices&&
        !['food','repair','exchange'].every(k=>nat(g.practices[k])))return false;
    const road=g.road;
    if(road&&(!text(road.id)||road.lot!==g.roads||!nat(road.round)||road.round>g.round||
      !Array.isArray(road.owners)||road.owners.length!==2||road.owners[0]===road.owners[1]||
      !road.owners.every(owner=>g.households.some(h=>h.owner===owner))||
      !Array.isArray(road.ids)||road.ids.length!==2||new Set(road.ids).size!==2||!road.ids.every(text)||!nat(road.at)||!origins(road.origins,road.ids)))return false;
    return g.households.every((h,i)=>{
      if(!h||!root.EarthDistrictOrders.validOrder(h.order,h)||!h.owner||typeof h.owner!=='string'||owners.has(h.owner)||typeof h.name!=='string'||h.plot!==i||
        ![1,2,3].includes(h.home)||![h.trained,h.pantry,h.supplies,h.roadLot,h.marketLot,h.hires,h.businessFunds].every(n=>n==null||nat(n))||
        h.activity!=null&&!['home','commitment','food','repair','exchange','road','shop','purchase'].includes(h.activity)||!nat(h.points)||!nat(h.stock)||h.stock>3||typeof h.last!=='string'||
        (h.shop?!Object.hasOwn(root.EarthResidentShops.products,h.shop)||!nat(h.businessPlot)||lots.has(h.businessPlot):h.businessPlot!==null))return false;
      if((h.shopInputs&&!Object.entries(h.shopInputs).every(([id,n])=>h.shop&&root.EarthResidentShops.products[h.shop].inputs.includes(id)&&nat(n)))||
        [h.houseSite,h.shopSite,h.lastPoint].some(p=>p!=null&&!point(p))||h.lastPoint&&!text(h.lastPoint.label))return false;
      if(h.order?.kind==='retail'&&!g.households.some(shop=>shop.owner===h.order.employer&&shop.shop===h.order.resource&&shop.businessPlot===h.order.employerPlot))return false;
      const b=h.build;
      if(b&&(!text(b.id)||!text(b.extension)||!nat(b.round)||b.round>g.round||!text(b.person)||!nat(b.at)||!origins(b.origins,[b.person])||
        (b.shop?!Object.hasOwn(root.EarthResidentShops.products,b.shop)||!nat(b.lot)||lots.has(b.lot)||h.shop:b.lot!==null)))return false;
      if(h.lastStop!=null&&!['home','market','pantry','workshop','shop'].includes(h.lastStop))return false;
      if(b?.shop)lots.add(b.lot);
      owners.add(h.owner);if(h.shop)lots.add(h.businessPlot);return true;
    })&&g.history.every(h=>h&&validTransfers(h)&&nat(h.round)&&h.round<=g.round&&nat(h.week)&&h.week<=week&&nat(h.wages)&&
      [h.food,h.materials,h.funds].every(Number.isSafeInteger)&&Array.isArray(h.events)&&h.events.every(e=>typeof e==='string'));
  }
  root.EarthDistrictGrowth={valid,period,due,settle,transfers,recordResearch,closeWeek:(world,site)=>settle(world,site,true),work,activeWork,homePoint,shopPoint,register,members,report,goal,vehicles};
})(globalThis);
