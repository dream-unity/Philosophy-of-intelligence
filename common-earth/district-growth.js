/* Paid production rounds use the shared save lock but do not consume a calendar
   decision or the player's movement. Sales outside the region are export income. */
(function(root){
  'use strict';
  const period=24000,targets=[80,240,540],eras=['Neighbourhood','Federation','Stewardship'];
  const trades={
    food:{axis:'care',good:'food',order:'produce basket',building:'garden kitchen',item:'basket'},
    repair:{axis:'craft',good:'materials',order:'repair order',building:'joinery',item:'stool'},
    exchange:{axis:'organisation',good:'funds',order:'delivery service',building:'general store',item:'satchel'}
  };
  const traditions=['Harvest supper','Repair circle','Market gathering'];
  const institutions=['Seed library','Apprentices’ guild','Merchants’ cooperative'];
  const vehicles=['Handcart','Freight wagon','Delivery van','Electric carrier'];
  const members=site=>(root.EarthPersonas?.list(site)||[]).filter(p=>root.EarthCommunityLife.residency(site,p.id)==='member'&&!root.EarthCommunityLife.commuting(site,p.id));
  const key=p=>p.identityKey||p.id;
  const resident=(site,p)=>site.growth?.households.find(h=>h.owner===key(p));
  const account=(site,id)=>site.purses?.people?.[id];
  function trade(site,p){
    const role=root.EarthCareers.work(site,p.id)?.occupation||p.role||'';
    if(/food|garden|grow|harvest|fish|cook|nurse|care/i.test(role))return 'food';
    if(/repair|build|craft|survey|mechanic|carpent/i.test(role))return 'repair';
    return 'exchange';
  }
  function reserve(world,site){
    const floor=root.EarthCivicInitiatives?.reserve(world,site)||{funds:6,materials:3,food:6};
    const held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    return Object.fromEntries(['funds','materials','food'].map(k=>[k,floor[k]+(held[k]||0)]));
  }
  function register(site,people){
    const g=site.growth||={round:0,points:0,roads:0,vehicle:0,custom:'',households:[],history:[],sales:0};
    for(const p of people)if(!resident(site,p)){
      const plot=g.households.length;
      g.households.push({owner:key(p),name:p.name,plot,home:1,points:0,stock:0,shop:'',businessPlot:null,last:'Settled on residential lot '+(plot+1)});
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
  function pay(world,site,p,n,why){
    return root.EarthPurses.productionReceipt(world,site,p.id,n,why);
  }
  function settle(world,site){
    const people=members(site),g=register(site,people),floor=reserve(world,site);
    g.round++;
    const demand=Math.max(2,Math.ceil(people.length*.85))+g.vehicle;
    let orders=0;
    const counts={food:0,repair:0,exchange:0},before=[site.food,site.materials,site.funds],crew=[],events=[];
    let wages=0;
    for(let i=0;i<people.length;i++){
      const p=people[(i+g.round-1)%people.length],h=resident(site,p),base=trade(site,p);
      const onDuty=site.purses?.tickets?.[p.id]||site.shift?.residentId===p.id||site.careers?.[p.id]?.training?.pace==='intensive'&&!site.careers[p.id].training.paused;
      const intent=root.EarthAutonomy?.intent?.(site,p.id);
      if(onDuty||intent?.kind==='rest'&&(g.round+h.plot)%3===0){h.activity=onDuty?'commitment':'home';h.last=onDuty?'Keeping a previously booked shift or study commitment.':'Resting at home between orders.';continue;}
      const shortage=site.food<floor.food+2?'food':site.materials<floor.materials+7?'repair':null;
      const kind=shortage&&base==='exchange'&&(g.round+h.plot)%3===0?shortage:base,job=trades[kind];
      if(orders>=demand){crew.push(p);h.activity='home';h.last='Available for the next public road crew.';continue;}
      orders++;
      const income=1+Math.min(2,Math.floor(h.points/24))+(g.vehicle>=2?1:0);
      const craft=site.careers?.[p.id]?.skills?.[job.axis]??p.aptitudes[job.axis];
      const product=1+Number(g.custom===traditions[Object.keys(trades).indexOf(kind)]&&g.round%3===0)+
        Number(craft>=65&&g.round%4===0)+Number(h.extension==='Kitchen garden'&&kind==='food'&&g.round%2===0);
      // Each local order supplies its own district and fulfils an outside order.
      const output=job.good==='funds'&&product===1?'fund':job.good;
      const why=p.name+' fulfilled a '+job.order+' for an outside customer and earned '+income+(income===1?' fund.':' funds.')+' The district received '+product+' '+output+' and 1 fund in market dues.';
      if(!pay(world,site,p,income,why))continue;
      site[job.good]+=product;site.funds++;wages+=income;counts[kind]++;
      h.points+=product;g.points+=product;h.last=why;h.activity=kind;

      // Food and supplies kept at the home belong to its deed holder.
      h.pantry??=0;h.supplies??=0;
      if(kind==='food')h.pantry++;else if(kind==='repair')h.supplies++;
      if(g.round%3===0&&h.pantry>0)h.pantry--;
      if(h.supplies>2&&site.materials<floor.materials+8){h.supplies--;site.materials++;h.points++;g.points++;}
      const cash=account(site,p.id).balance;
      const available=site.materials-floor.materials-(g.roads<g.households.length?3:0);
      const wish=root.EarthAutonomy?.intent?.(site,p.id)?.goal||'';
      const commercial=p.traits.initiative>=52||cash>=12||/business|market|shop/i.test(wish);
      const used=new Set(g.households.filter(o=>o.businessPlot!==null).map(o=>o.businessPlot));
      const licensedLots=2+g.roads+site.tech.length*2;
      let lot=null;
      for(let i=0;i<licensedLots;i++){
        const candidate=(h.plot+i)%licensedLots;if(!used.has(candidate)){lot=candidate;break;}
      }
      const wantsShop=!h.shop&&lot!==null&&commercial&&cash>=7;
      if(available>=2&&(wantsShop||h.home<3&&cash>=5)&&(g.round+h.plot)%3===0){
        const cost=wantsShop?5:3;
        const action=wantsShop?'bought a commercial lot and built a '+(p.hobbyAxis==='music'?'music shop':job.building):'improved their own residence to grade '+(h.home+1);
        if(pay(world,site,p,-cost,p.name+' '+action+' using 2 district materials.')){
          site.materials-=2;site.funds+=cost;
          if(wantsShop){h.businessPlot=lot;h.shop=p.hobbyAxis==='music'?'flute':job.item;}
          else{h.home++;h.extension=p.hobbyAxis==='music'?'Music room':kind==='food'?'Kitchen garden':kind==='repair'?'Home workshop':'Courtyard studio';}
          h.activity=wantsShop?'shop':'home';h.points+=2;g.points+=2;h.last=p.name+' '+action+'.';events.push(h.last);
        }
      }else if(h.shop&&h.stock<3&&available>=1&&cash>=3){
        if(pay(world,site,p,-1,p.name+' bought material to make a '+root.EarthResidentShops.products[h.shop].name+'.')){
          site.materials--;site.funds++;h.stock++;h.activity='shop';h.last='Made stock for their shop.';
        }
      }else if(p.traits.sociability>=45||kind==='repair')crew.push(p);
    }
    for(const kind of ['food','repair']){
      if(!counts[kind])continue;
      const lot=root.EarthResources?.collectDistrictLot(world,site,kind==='food');
      if(lot)events.push('The '+(kind==='food'?'food':'materials')+' crew stocked 1 lot of '+lot+' in the public bins.');
    }
    // Residents choose goods they do not own. A purchase moves one finished
    // item and the asking price between two personal accounts.
    for(const p of people){
      const purse=account(site,p.id);if(!purse||purse.balance<5)continue;
      // Used work gear is eventually replaced. Its owner keeps other purchases.
      if((g.round+resident(site,p).plot)%12===0){
        const used=Object.keys(purse.belongings||{}).find(k=>['basket','stool','satchel'].includes(k));
        if(used&&--purse.belongings[used]===0)delete purse.belongings[used];
      }
      const sellers=people.filter(s=>s!==p&&resident(site,s).stock>0&&!purse.belongings?.[resident(site,s).shop]);
      sellers.sort((a,b)=>Number(root.EarthResidentShops.products[resident(site,b).shop].axis===p.hobbyAxis)-Number(root.EarthResidentShops.products[resident(site,a).shop].axis===p.hobbyAxis));
      if(!sellers.length)continue;
      const s=sellers[0],h=resident(site,s),item=root.EarthResidentShops.products[h.shop];
      const sale=p.name+' bought a '+item.name+' from '+s.name+' for 3 funds.';
      if(root.EarthPurses.transferPerson(world,site,p.id,s.id,3,sale,h.shop).ok){
        h.stock--;const items=purse.belongings||={};items[h.shop]=(items[h.shop]||0)+1;
        g.sales++;h.points++;g.points++;h.activity='shop';resident(site,p).activity='purchase';resident(site,p).marketLot=h.businessPlot;events.push(sale);
      }
    }
    if(crew.length>=2&&g.roads<g.households.length&&site.materials-floor.materials>=3&&site.funds-floor.funds>=2&&g.round%3===0){
      const start=g.roads%crew.length,pair=[crew[start],crew[(start+1)%crew.length]];
      for(const p of pair){pay(world,site,p,1,p.name+' earned a district road-building wage.');const h=resident(site,p);h.points++;h.activity='road';h.roadLot=g.roads;h.last='Built the access road to residential lot '+(g.roads+1)+'.';}
      site.materials-=3;site.funds-=2;g.roads++;g.points+=4;
      events.push(pair.map(p=>p.name).join(' and ')+' built the access road to residential lot '+g.roads+'.');
    }
    if(events.some(e=>e.includes('built the access road'))&&site.trust<100)site.trust++;
    if(g.roads>=2&&(!g.custom||g.round%24===0)){
      const localTrade={food:'food',materials:'repair',funds:'exchange'}[site.specialty];
      if(localTrade)counts[localTrade]+=Math.ceil(people.length/2);
      const choice=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      const prior=g.custom;g.custom=traditions[Object.keys(trades).indexOf(choice)];if(prior!==g.custom)events.push('Households adopted the '+g.custom+'. Every third round it adds output in their shared trade.');
    }
    if(g.custom&&site.tech.length>=2&&!g.institution&&site.funds-floor.funds>=5&&site.materials-floor.materials>=3){
      g.institution=institutions[traditions.indexOf(g.custom)];site.funds-=5;site.materials-=3;
      events.push('Residents opened the '+g.institution+' to teach the skills behind their '+g.custom+'.');
    }
    for(const p of people){
      const h=resident(site,p),level=Math.floor(h.points/12);
      if(level>(h.trained||0)){
        root.EarthCareers.productionLesson(site,p,trades[trade(site,p)].axis,world.week);
        if(g.institution)root.EarthCareers.productionLesson(site,p,'communication',world.week);
        h.trained=level;
      }
    }
    if(g.vehicle<site.tech.length&&g.roads>g.vehicle&&site.funds-floor.funds>=6&&site.materials-floor.materials>=4){
      g.vehicle++;site.funds-=6;site.materials-=4;events.push('The transport crew commissioned a '+vehicles[g.vehicle]+'.');
    }
    g.history.unshift({round:g.round,week:world.week,wages,food:site.food-before[0],materials:site.materials-before[1],funds:site.funds-before[2],events:events.slice(-8)});
    g.history.length=Math.min(8,g.history.length);
  }
  function valid(site,week){
    const g=site.growth;if(g===undefined)return true;
    const nat=n=>Number.isSafeInteger(n)&&n>=0;
    if(!g||![g.points,g.round,g.roads,g.sales,g.vehicle].every(nat)||g.vehicle>3||!['',...traditions].includes(g.custom)||
      g.institution&&!institutions.includes(g.institution)||!Array.isArray(g.households)||!Array.isArray(g.history)||g.history.length>8)return false;
    const owners=new Set(),lots=new Set();
    return g.households.every((h,i)=>{
      if(!h||!h.owner||typeof h.owner!=='string'||owners.has(h.owner)||typeof h.name!=='string'||h.plot!==i||
        ![1,2,3].includes(h.home)||![h.trained,h.pantry,h.supplies,h.roadLot,h.marketLot].every(n=>n==null||nat(n))||
        h.activity!=null&&!['home','commitment','food','repair','exchange','road','shop','purchase'].includes(h.activity)||!nat(h.points)||!nat(h.stock)||h.stock>3||typeof h.last!=='string'||
        (h.shop?!Object.hasOwn(root.EarthResidentShops.products,h.shop)||!nat(h.businessPlot)||lots.has(h.businessPlot):h.businessPlot!==null))return false;
      owners.add(h.owner);if(h.shop)lots.add(h.businessPlot);return true;
    })&&g.history.every(h=>h&&nat(h.round)&&h.round<=g.round&&nat(h.week)&&h.week<=week&&nat(h.wages)&&
      [h.food,h.materials,h.funds].every(Number.isSafeInteger)&&Array.isArray(h.events)&&h.events.every(e=>typeof e==='string'));
  }
  root.EarthDistrictGrowth={valid,period,settle,register,members,report,goal,vehicles};
})(globalThis);
