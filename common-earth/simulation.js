/* Common Earth civic simulation. Browser global, no network or timers.
 * create({storage?, key?}) -> state, active(), actions(group), act(id, plot?),
 * found(point, name?), visit(id), advance(), overview(), reset(), subscribe(fn),
 * previewBuild(kind,lot), previewReclaim(lot), reclaim(lot,buildingId), forecastNext(),
 * beginVoyage(target,style), sail(choiceId).
 * Groups: people, build, research, council, routes, work, all.
 * Commands return {ok,message}. Lots 0–8 form a 3×3 grid in row-major order.
 * An action's "available" and "reason" reflect the current world. Save data
 * contains only serializable facts; rules and dialogue always come from here.
 */
(function (root) {
  'use strict';
  const VERSION = 1;
  const MAX_EFFORT = 4;
  const METRICS=['funds','food','materials','trust','wellbeing','population'];
  const REVIEW_STORIES=64;
  const BUILDINGS = {
    garden: {name:'Community garden', funds:5, materials:3, info:'Grows 3 food each week. Shares tools with an adjoining workshop for 1 extra food.'},
    workshop: {name:'Repair workshop', funds:6, materials:3, info:'Recovers 2 materials each week. Its tools also improve adjacent gardens.'},
    market: {name:'Neighbourhood market', funds:7, materials:3, info:'A full customer catchment earns 3 funds per week. A shared one earns 1, and a shop without customers earns 0. Outer exchanges, population and trading links expand demand. A depot adds 1 fund to an operating shop.'},
    hall: {name:'Assembly hall', funds:5, materials:2, info:'Adds 1 wellbeing each week and makes room for shared apprenticeships.'},
    fishingDock: {name:'Fishing dock', funds:6, materials:4, info:'Build a shore station and fishing jetty. Once the crew opens the dock, board a boat to land 4 food for 1 effort, once per week.'},
    pier: {name:'Exchange depot', funds:6, materials:3, info:'One depot at either end raises a route’s base shipment limit from 2 to 4. An adjacent market earns 1 extra fund.'},
    wetland: {name:'Water commons', funds:5, materials:4, info:'Grows 1 food each week. Protects the district during a flood and supports slow repair.'}
  };
  const PROFILES = [
    {role:'Grower', value:'Food security', quotes:['“There is enough ground to grow food. What we lack is a way to share the harvest.”','“People tell you when the shelves are empty. They rarely tell you when they start skipping a meal.”'],
      ask:'restock the shared pantry', support:'Stock the pantry', goods:{food:3}, result:'Three baskets went to households with the smallest reserves.', alternative:'garden'},
    {role:'Repairer', value:'A useful livelihood', quotes:['“A broken tool can cost a person a whole week of work. Give us a bench and we can teach the repairs.”','“When someone learns to fix the pump, the whole district owns a little more of its future.”'],
      ask:'equip a repair bench', support:'Equip the bench', goods:{materials:2}, result:'Neighbours now have tools to borrow and a place to learn repairs.', alternative:'workshop'},
    {role:'Convenor', value:'A voice in decisions', quotes:['“People who work late miss every meeting. Ask who had the chance to disagree before you call it consensus.”','“An invitation means more when someone can afford the journey and the time to come.”'],
      ask:'cover travel to an open meeting', support:'Fund meeting access', goods:{funds:3}, result:'Travel grants brought previously absent residents into the room.', alternative:'hall'}
  ];
  const NAMES = [['Mira','Idris','Sol'],['Eden','Noor','Teo'],['Anika','Ari','Lena'],['Ellis','Remy','Inez'],['Ravi','Mina','Ash'],['Sasha','Jules','Emi']];
  const CHARTERS = {
    care:{name:'A fair table',text:'Keep at least 6 food in each settlement’s pantry and keep 2 promises across the network.'},
    voice:{name:'An open council',text:'Hear every founding resident in two settlements and see two council agenda votes through to their outcomes.'},
    craft:{name:'Knowledge in common',text:'Complete shared apprenticeships in two settlements and deliver one street errand.'}
  };
  const TECH = [
    {id:'apprenticeship',name:'Shared apprenticeship',era:'Neighbourhood',funds:5,materials:2,info:'Residents share practical skills. Unlocks water commons and adds 1 material each week.'},
    {id:'exchange',name:'Exchange network',era:'Federation',funds:7,materials:3,info:'Coordinate trade consignments one week faster, with a minimum transit of one week.'},
    {id:'stewardship',name:'Stewardship compact',era:'Stewardship',funds:9,materials:3,info:'Ask an independent assembly to judge the network against the charter you chose.'}
  ];
  const QUESTIONS = [
    {title:'A lean harvest',services:'kitchen',prompt:'A poor harvest has raised food prices. Who should carry the cost of this week’s shortage?',choices:[
      {id:'kitchen',name:'Open a public kitchen',terms:'Spend 3 food now. In two weeks, healthier households add 4 wellbeing and the grower gains a bond.',goods:{food:3},after:{wellbeing:4},ally:0,story:'Neighbours who had been skipping meals returned to work and school.'},
      {id:'voucher',name:'Guarantee local orders',terms:'Spend 4 funds now. In two weeks, local suppliers deliver 5 food and the repairer gains a bond.',goods:{funds:4},after:{food:5},ally:1,story:'The guaranteed orders let small suppliers pool the cost of the next delivery.'}]
    },
    {title:'Who owns the square?',services:'commons',prompt:'Traders want more stalls on the square. Residents also need a place where they can stay without buying anything.',choices:[
      {id:'lease',name:'Lease stalls for a season',terms:'Receive 3 funds now. In two weeks receive 2 more, lose 2 wellbeing, and earn the repairer’s support.',now:{funds:3},after:{funds:2,wellbeing:-2},ally:1,story:'Stall fees paid for repairs. Fewer people lingered in the square after work.'},
      {id:'commons',name:'Protect the common square',terms:'Spend 2 funds now. In two weeks gain 3 trust and the convenor gains a bond.',goods:{funds:2},after:{trust:3},ally:2,story:'An evening circle formed where the fee-free square stayed open.'}]
    },
    {title:'Before the high water',services:'homes',prompt:'High water is forecast. Crews can protect the supply store or help residents prepare their homes.',choices:[
      {id:'store',name:'Protect the store',terms:'Spend 1 material now. In two weeks gain 3 food but lose 2 trust. A water commons prevents that trust loss.',goods:{materials:1},after:{food:3,trust:-2},ally:0,story:'The store stayed dry. Families remembered whether they also had protection.'},
      {id:'homes',name:'Reinforce the homes',terms:'Spend 2 materials now. In two weeks gain 4 wellbeing but lose 2 food. A water commons prevents that food loss.',goods:{materials:2},after:{wellbeing:4,food:-2},ally:2,story:'Residents sheltered in their homes while crews checked what remained of the harvest.'}]
    },
    {
      title:'The last lantern procession',stage:1,services:'night',
      prompt:'The lantern makers are retiring. Some families want the craft carried on. Others want younger groups to decide what the night becomes.',
      choices:[
        {id:'lanterns',name:'Pay two apprentices',goods:{funds:3,materials:1},after:{wellbeing:3},ally:1,
          terms:'Spend 3 funds and 1 material. In two weeks gain 3 wellbeing. After that the apprentices earn the district 1 material each week until the next vote on the procession.',
          practice:{materials:1},story:'The last makers passed their moulds to two apprentices. The procession had fewer lanterns, and two more people knew how to make them.'},
        {id:'night',name:'Give the night to a rotating host',goods:{funds:2},after:{trust:2},ally:2,
          terms:'Spend 2 funds. In two weeks gain 2 trust. From then on, rotating hosts add 1 wellbeing each week until the next vote on the procession.',
          practice:{wellbeing:1},story:'The first host kept an hour for the old songs and gave the closing hour to a new group. The lantern makers could choose whether to take part.'}
      ]
    },
    {
      title:'The donor’s conditions',stage:2,services:'subscriptions',
      prompt:'A donor can finance the meeting rooms immediately, in return for naming the rooms and reserving their busiest hours. The alternative asks residents to fund a slower reopening.',
      choices:[
        {id:'sponsor',name:'Accept five sponsored evenings',now:{funds:6},after:{materials:2,wellbeing:-2},ally:1,
          terms:'Take 6 funds now. In two weeks receive 2 materials for repairs and lose 2 wellbeing as groups move their evening meetings.',
          story:'The room reopened ahead of schedule. The repaired roof held, and two evening groups had to find another venue.'},
        {id:'subscriptions',name:'Keep the timetable in residents’ hands',goods:{funds:2},after:{funds:4,trust:3},delay:3,ally:2,
          terms:'Spend 2 funds to organise small subscriptions. In three weeks subscriptions bring in 4 funds and add 3 trust. Residents retain the evening timetable.',
          story:'Paint cans arrived a little at a time. On reopening night, groups booked evening hours under the rules they had written.'}
      ]
    },
    {
      title:'Who reads the pantry ledger?',stage:1,services:'consent',
      prompt:'A buying cooperative offers better deliveries if it can study local demand. Household details would reveal who relies on the pantry.',
      choices:[
        {id:'totals',name:'Share totals for the whole district',after:{funds:2,trust:2},ally:2,
          terms:'Share district totals at no financial cost. In two weeks gain 2 funds from collective buying and 2 trust. Individual streets remain indistinguishable in the figures.',
          story:'The cooperative negotiated a bulk price. The published totals protected household identities and concealed the sharp difference between two streets.'},
        {id:'consent',name:'Run a resident-owned opt-in register',goods:{funds:3},after:{food:6,wellbeing:2},delay:3,ally:0,
          terms:'Spend 3 funds on consent and review. In three weeks participating households receive 6 food and the district gains 2 wellbeing. Non-participants keep their details private.',
          story:'Participants corrected the proposed delivery times before sharing the figures. Households that stayed out of the register kept using the ordinary pantry.'}
      ]
    },
    {
      title:'Which pantry gets the reserve?',stage:1,partner:true,services:'send-stores',
      prompt:'A linked settlement has the thinnest food reserve per resident among your partners. Your own families face an uncertain harvest too.',
      choices:[
        {id:'send-stores',name:'Release food to the partner pantry',goods:{food:4},after:{trust:2},transfer:{food:4},ally:2,
          terms:'Commit 4 food now. The partner receives all 4 after transit. Your district gains 2 trust when the delivery arrives.',
          story:'The receiving pantry opened its stockroom for inspection and sent back the tally. The four food came from this district’s reserve.'},
        {id:'home-stores',name:'Build a local buffer first',goods:{funds:3},after:{food:4,wellbeing:2},ally:0,
          terms:'Buy 3 funds’ worth of supplies locally. In two weeks your own pantry gains 4 food and households gain 2 wellbeing. The partner receives no food from this vote.',
          story:'Households close to home had a dependable buffer through the lean week. The linked pantry continued with its existing supplies.'}
      ]
    }
  ];
  const MANDATES={services:'Give household needs priority',reserves:'Give productive reserves priority'};
  const LABELS={funds:'funds',food:'food',materials:'materials',trust:'trust',wellbeing:'wellbeing'};
  const blank = () => ({version:VERSION,week:1,effort:MAX_EFFORT,sites:[],activeId:null,routes:[],journal:[],charter:null,completed:false,voyage:null,lastVoyage:null,lastWeekReview:null});
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const signed = v => v >= 0 ? '+'+v : String(v);
  const tidy = (value,max=48) => String(value || '').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
  function resources(cost) { return Object.entries(cost || {}).map(([k,v])=> v+' '+LABELS[k]).join(' · '); }
  function summary(delta) { return Object.entries(delta).filter(([,v])=>v!==0).map(([k,v])=>signed(v)+' '+LABELS[k]).join(' · '); }
  function apply(site,delta) {
    const changes={};
    for(const [key,value] of Object.entries(delta || {})){
      const before=site[key];
      site[key]=clamp(before+value,0,key==='trust'||key==='wellbeing'?100:Number.MAX_SAFE_INTEGER);
      changes[key]=site[key]-before;
    }
    return changes;
  }
  function affordable(site,goods) { return Object.entries(goods || {}).every(([key,amount])=>site[key]>=amount); }
  function payment(site,goods) { for(const [key,value] of Object.entries(goods || {})) site[key]-=value; }
  function has(site,kind) { return site.buildings.some(b=>b.kind===kind); }
  function waterfront(site){
    if(site?.water)return 'ocean';
    if(site && Math.abs(site.lat+6.163)<.046 && Math.abs(site.lon-39.189)<.036)return 'zanzibar';
    return null;
  }
  function adjacent(a,b) { return Math.abs(Math.floor(a/3)-Math.floor(b/3))+Math.abs(a%3-b%3)===1; }
  function neighbours(site,plot,kind) { return site.buildings.some(b=>b.kind===kind && adjacent(b.plot,plot)); }
  function marketPlan(site,options={}){
    const cityMarkets=options.cityMarkets ?? root.EarthCityModel?.marketCatchments?.(site) ?? 0;
    const fullSlots=1+cityMarkets;
    const sharedSlots=1+Math.floor(Math.max(0,site.population-12)/8)+(site.routeLinks>0?1:0);
    const shops=site.buildings.filter(b=>b.kind==='market').map((b,order)=>({
      plot:b.plot,order,served:neighbours(site,b.plot,'pier')
    }));
    shops.sort((a,b)=>Number(b.served)-Number(a.served) || a.order-b.order);
    let baseFunds=0,depotFunds=0;
    const markets=shops.map((shop,index)=>{
      const tier=index<fullSlots?'full':index<fullSlots+sharedSlots?'shared':'idle';
      const base=tier==='full'?3:tier==='shared'?1:0,depot=base && shop.served?1:0;
      baseFunds+=base;depotFunds+=depot;
      return {plot:shop.plot,tier,base,depot};
    });
    return {fullSlots,sharedSlots,cityMarkets,markets,baseFunds,depotFunds,totalFunds:baseFunds+depotFunds};
  }
  function productiveLinks(site,plan=marketPlan(site)) {
    const links=[];
    for(const b of site.buildings){
      const source=b.kind==='garden'?'workshop':b.kind==='market'?'pier':null;
      if(!source || b.kind==='market' && !plan.markets.some(m=>m.plot===b.plot && m.base))continue;
      const partners=site.buildings.filter(other=>other.kind===source && adjacent(other.plot,b.plot)).sort((a,b)=>a.plot-b.plot);
      if(partners.length)links.push({from:partners[0].plot,to:b.plot,resource:b.kind==='garden'?'food':'funds'});
    }
    return links;
  }
  function promiseBalance(person){
    const goods={...PROFILES[person.slot].goods};
    for(const [k,n] of Object.entries(person.promise?.advance || {}))goods[k]-=n;
    return goods;
  }
  function practices(site){
    return Object.entries(site.practices || {}).map(([i,id])=>{
      const q=QUESTIONS[i],c=q?.choices.find(option=>option.id===id && option.practice);
      return c?{name:c.name,agenda:q.title,effect:summary(c.practice)+' per week',rate:{...c.practice}}:null;
    }).filter(Boolean);
  }
  function rates(site,cityDelta,world,workforce=undefined) {
    const result={funds:2,food:3-Math.ceil(site.population/5),materials:1,wellbeing:0};
    result[site.specialty]++;
    const markets=marketPlan(site);
    result.funds+=markets.baseFunds;
    for(const b of site.buildings) {
      if(b.kind==='garden') result.food+=3;
      if(b.kind==='workshop') result.materials+=2;
      if(b.kind==='hall') result.wellbeing++;
      if(b.kind==='wetland') result.food++;
    }
    for(const link of productiveLinks(site,markets))result[link.resource]++;
    if(site.tech.includes('apprenticeship')) result.materials++;
    for(const practice of practices(site))for(const [k,v] of Object.entries(practice.rate))result[k]+=v;
    const district=cityDelta ?? root.EarthCityModel?.overview(site)?.weekly;
    for(const contribution of [district,root.EarthStrategy?.rates(site),workforce??root.EarthConstruction?.weeklyAdjustment(site,world)]){
      for(const [k,v] of Object.entries(contribution || {}))result[k]=(result[k] || 0)+v;
    }
    return result;
  }
  const capacity=site=>root.EarthCityModel?.housingCapacity(site) ?? 18;
  function rateDifference(before,after){
    const change={};
    for(const k of new Set([...Object.keys(before),...Object.keys(after)])){
      const difference=(after[k] || 0)-(before[k] || 0);
      if(difference)change[k]=difference;
    }
    return change;
  }
  function distance(a,b) {
    const rad=Math.PI/180, u=Math.sin((b.lat-a.lat)*rad/2),v=Math.sin((b.lon-a.lon)*rad/2);
    return 12742*Math.asin(Math.sqrt(clamp(u*u+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*v*v,0,1)));
  }
  function bond(resident,amount){
    const before=resident.bond;
    resident.bond=clamp(before+amount,0,10);
    return resident.bond===before?'bond stayed at '+resident.bond:signed(resident.bond-before)+' bond';
  }
  function charterFacts(turn){
    const facts={supplied:0,kept:0,heard:0,decisions:0,schools:0,deliveries:0,stewards:0,termsMet:false};
    for(const s of turn.sites){
      if(s.food>=6)facts.supplied++;
      if(s.residents.every(person=>person.heard))facts.heard++;
      if(s.tech.includes('apprenticeship'))facts.schools++;
      if(s.tech.includes('stewardship'))facts.stewards++;
      facts.kept+=s.stats.kept;facts.decisions+=s.stats.resolved;facts.deliveries+=s.stats.deliveries;
    }
    if(turn.charter==='care')facts.termsMet=facts.supplied===turn.sites.length && facts.kept>=2;
    if(turn.charter==='voice')facts.termsMet=facts.heard>=2 && facts.decisions>=2;
    if(turn.charter==='craft')facts.termsMet=facts.schools>=2 && facts.deliveries>=1;
    return facts;
  }
  function outcome(delta,relationship){
    const parts=[summary(delta),relationship].filter(Boolean);
    return parts.length?parts.join(' · ')+'.':'The public measures were already at their limit.';
  }
  const integer=(n,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
  const recordLike=x=>x!==null && typeof x==='object' && !Array.isArray(x);
  const shortName=x=>typeof x==='string' && x.length>0 && x.length<=512;
  const unique=items=>new Set(items).size===items.length;
  const geoPoint=p=>p && Number.isFinite(p.lat) && Math.abs(p.lat)<=90 && Number.isFinite(p.lon) && Math.abs(p.lon)<=180;
  const knownAgenda=index=>integer(index,0,QUESTIONS.length-1);
  function validResident(person,slot,week){
    if(!recordLike(person) || person.slot!==slot || !shortName(person.id) || !shortName(person.name))return false;
    if(!integer(person.bond,0,10) || typeof person.heard!=='boolean')return false;
    person.role ??= PROFILES[slot].role;
    person.value ??= PROFILES[slot].value;
    person.lastTalk ??= 0;
    person.lastPromise ??= -10;
    if(!shortName(person.role) || !shortName(person.value) || !integer(person.lastTalk,0,week) || !integer(person.lastPromise,-10,week))return false;
    if(person.promise!=null){
      const p=person.promise;
      if(!recordLike(p) || !integer(p.dueWeek,week))return false;
      if(p.revised){
        const key=Object.keys(PROFILES[slot].goods)[0];
        if(p.revised!==true || !integer(p.originalDue,1) || p.dueWeek!==p.originalDue+1 || !integer(p.agreedWeek,1,p.originalDue) ||
          !recordLike(p.advance) || Object.keys(p.advance).length!==1 || p.advance[key]!==1)return false;
      }else if(p.advance!=null)return false;
    }
    if(person.lastMissed!=null){
      const m=person.lastMissed;
      if(!recordLike(m)||!integer(m.week,1,week)||typeof m.revised!=='boolean')return false;
      if(m.discussedWeek!=null && !integer(m.discussedWeek,m.week,week))return false;
    }
    if(person.lastShiftWeek!=null && !integer(person.lastShiftWeek,0,week))return false;
    if(person.shiftMemory!=null){
      const m=person.shiftMemory;
      if(!recordLike(m) || m.residentId!==person.id || !integer(m.week,1,week) || !shortName(m.quote) || typeof m.summary!=='string')return false;
      if(m.discussedWeek!=null && !integer(m.discussedWeek,m.week,week))return false;
    }
    return true;
  }
  function validSite(site,world,ids){
    if(!recordLike(site) || !shortName(site.id) || !shortName(site.name) || !geoPoint(site) || typeof site.water!=='boolean')return false;
    if(!['food','funds','materials'].includes(site.specialty))return false;
    if(!['funds','food','materials','population'].every(k=>integer(site[k])) || !['trust','wellbeing'].every(k=>integer(site[k],0,100)))return false;
    site.region ??= site.name;
    site.tech ??= [];
    site.pending ??= [];
    site.founded ??= 1;
    site.issueIndex ??= -1;
    site.lastDeliveryWeek ??= 0;
    if(!shortName(site.region) || !integer(site.founded,1,world.week) || !integer(site.lastDeliveryWeek,0,world.week))return false;
    if(site.foundedBy!=null && (!ids.has(site.foundedBy)||site.foundedBy===site.id))return false;
    if(!integer(site.issueIndex,-1,QUESTIONS.length-1)||!Array.isArray(site.tech)||!site.tech.every((id,i)=>TECH[i]?.id===id))return false;
    site.era=TECH[site.tech.length-1]?.era || 'Settlement';
    if(site.stats!=null && !recordLike(site.stats))return false;
    site.stats={kept:0,missed:0,resolved:0,deliveries:0,...site.stats};
    if(!Object.values(site.stats).every(n=>integer(n)))return false;
    if(!Array.isArray(site.residents) || site.residents.length!==3 || !site.residents.every((p,i)=>validResident(p,i,world.week)))return false;
    const residents=new Set(site.residents.map(p=>p.id));
    if(residents.size!==site.residents.length || !Array.isArray(site.buildings))return false;
    for(const building of site.buildings){
      if(!recordLike(building) || !integer(building.plot,0,8) || !Object.hasOwn(BUILDINGS,building.kind))return false;
      building.id ??= site.id+'-b'+building.plot;
      building.name ??= BUILDINGS[building.kind].name;
      if(!shortName(building.id) || !shortName(building.name))return false;
      if(building.partners!=null && (!Array.isArray(building.partners) || !unique(building.partners) || !building.partners.every(id=>residents.has(id))))return false;
    }
    if(!unique(site.buildings.map(b=>b.plot)) || !unique(site.buildings.map(b=>b.id)))return false;
    if(site.projectSerial!=null && !integer(site.projectSerial))return false;
    if(site.delivery!=null && (!residents.has(site.delivery.residentId) || !integer(site.delivery.week,1,world.week)))return false;
    if(site.issue!=null){
      const issue=site.issue;
      if(!recordLike(issue)||!knownAgenda(issue.index)||!integer(issue.deadline,1))return false;
      issue.title ??= QUESTIONS[issue.index].title;
      issue.prompt ??= QUESTIONS[issue.index].prompt;
      if(!shortName(issue.title) || typeof issue.prompt!=='string')return false;
      if(QUESTIONS[issue.index].partner && (!ids.has(issue.targetId)||issue.targetId===site.id))return false;
    }
    if(!Array.isArray(site.pending))return false;
    for(const item of site.pending){
      if(!recordLike(item) || !knownAgenda(item.index) || !integer(item.week,1))return false;
      const choice=QUESTIONS[item.index].choices.find(c=>c.id===item.choice);
      if(!choice || choice.transfer&&(!ids.has(item.targetId)||item.targetId===site.id))return false;
    }
    if(site.practices!=null && (!recordLike(site.practices) || !Object.entries(site.practices).every(([index,id])=>
      knownAgenda(Number(index)) && QUESTIONS[index]?.choices.some(c=>c.id===id&&c.practice))))return false;
    if(site.agendaVisits!=null && (!recordLike(site.agendaVisits) || !Object.entries(site.agendaVisits).every(([index,week])=>
      knownAgenda(Number(index)) && integer(week,1,world.week))))return false;
    if(site.mandate!=null && !Object.hasOwn(MANDATES,site.mandate))return false;
    if(site.lastFishingWeek!=null && !integer(site.lastFishingWeek,0,world.week))return false;
    if(site.lastAidWeek!=null && !integer(site.lastAidWeek,0,world.week))return false;
    if(site.lastShiftWeek!=null && !integer(site.lastShiftWeek,0,world.week))return false;
    if(root.EarthStrategy?.valid && !root.EarthStrategy.valid(site.strategy))return false;
    if(root.EarthCityModel?.valid && !root.EarthCityModel.valid(site.city))return false;
    if(root.EarthNeighbours?.valid && !root.EarthNeighbours.valid(site))return false;
    if(root.EarthCampaigns?.valid && !root.EarthCampaigns.valid(site))return false;
    if(site.shift && root.EarthShifts?.validShift && !root.EarthShifts.validShift(site,site.shift))return false;
    if(site.shiftFollowUps!=null && (!Array.isArray(site.shiftFollowUps) ||
      root.EarthShifts?.validFollowUp && !site.shiftFollowUps.every(f=>root.EarthShifts.validFollowUp(site,f))))return false;
    root.EarthCityModel?.normalise(site);
    if(root.EarthConstruction){
      site.construction ??= [];
      if(!root.EarthConstruction.valid(site,world))return false;
      if(root.EarthCityModel?.migrateWork?.(site,world)===false)return false;
      if(!root.EarthConstruction.valid(site,world))return false;
      if(root.EarthDismantling && !root.EarthDismantling.valid(site))return false;
      if(root.EarthCityModel?.validWork && !root.EarthCityModel.validWork(site,site.construction))return false;
    }
    return true;
  }
  function validRoute(route,world,ids){
    if(!recordLike(route)||!ids.has(route.from)||!ids.has(route.to)||route.from===route.to)return false;
    if(!shortName(route.id)||!shortName(route.name)||typeof route.lastStatus!=='string')return false;
    if(!integer(route.deliveries)||!integer(route.opened,1,world.week)||!integer(route.lastDispatch,0,world.week))return false;
    if(route.lastArrivalWeek!=null && !integer(route.lastArrivalWeek,1,world.week))return false;
    if(!Array.isArray(route.shipments))return false;
    return route.shipments.every(cargo=>{
      if(!recordLike(cargo) || !['food','materials'].includes(cargo.good) || !integer(cargo.amount,1) || !integer(cargo.due,1))return false;
      return cargo.from===route.from&&cargo.to===route.to || cargo.from===route.to&&cargo.to===route.from;
    });
  }
  function validReview(review,world,ids){
    if(review==null)return true;
    if(!recordLike(review)||!integer(review.week,1,world.week)||!Array.isArray(review.sites)||review.sites.length>world.sites.length)return false;
    let saved=0,total=0;
    const seen=new Set();
    for(const s of review.sites){
      if(!recordLike(s)||!ids.has(s.id)||seen.has(s.id)||!shortName(s.name))return false;
      seen.add(s.id);
      if(!recordLike(s.closing)||!recordLike(s.delta))return false;
      for(const k of METRICS)if(!integer(s.closing[k])||!Number.isSafeInteger(s.delta[k]))return false;
      if(s.closing.trust>100||s.closing.wellbeing>100)return false;
      if(!Array.isArray(s.highlights)||s.highlights.length>4||!s.highlights.every(t=>typeof t==='string'&&t.length<=360))return false;
      if(!integer(s.totalEvents,s.highlights.length)||!integer(s.arrivals)||!integer(s.departures))return false;
      saved+=s.highlights.length;total+=s.totalEvents;
    }
    return saved<=REVIEW_STORIES && review.totalEvents===total && review.omittedEvents===total-saved;
  }
  // Opening a world and importing a save use the same migration and integrity
  // rules. Only the parsed copy is changed; the input remains recoverable.
  function readSave(raw){
    if(typeof raw!=='string' || !raw)return null;
    try{
      const saved=JSON.parse(raw);
      if(!recordLike(saved)||saved.version!==VERSION||!integer(saved.week,1)||!integer(saved.effort,0,MAX_EFFORT)||!Array.isArray(saved.sites))return null;
      const world={...blank(),...saved},ids=new Set(world.sites.map(site=>site?.id));
      if(['actionRevision','workRevision','constructionThrough'].some(key=>world[key]!=null && !integer(world[key])))return null;
      if(ids.size!==world.sites.length || !world.sites.every(site=>validSite(site,world,ids)))return null;
      if(!unique(world.sites.flatMap(s=>s.residents.map(p=>p.id))))return null;
      if(!Array.isArray(world.routes)||!world.routes.every(route=>validRoute(route,world,ids))||!unique(world.routes.map(r=>r.id)))return null;
      if(!unique(world.routes.map(r=>JSON.stringify([r.from,r.to].sort()))))return null;
      const links=new Map(world.sites.map(site=>[site.id,0]));
      for(const route of world.routes){links.set(route.from,links.get(route.from)+1);links.set(route.to,links.get(route.to)+1);}
      for(const site of world.sites)site.routeLinks=links.get(site.id);
      if(!Array.isArray(world.journal)||!world.journal.every(j=>recordLike(j)&&integer(j.week,1,world.week)&&typeof j.text==='string'))return null;
      if(world.charter!=null && !Object.hasOwn(CHARTERS,world.charter) || typeof world.completed!=='boolean')return null;
      if(!validReview(world.lastWeekReview,world,ids))return null;
      if(root.EarthPartners?.valid && !root.EarthPartners.valid(world.partners,ids))return null;
      if(root.EarthLegacy?.valid && !root.EarthLegacy.valid(world))return null;
      if(root.EarthGoals?.valid && !root.EarthGoals.valid(world.learningGoals,world))return null;
      if(world.voyage!=null){
        const v=world.voyage;
        if(!geoPoint(v.origin)||!ids.has(v.origin.id)||!geoPoint(v.target)||!integer(v.legs,1)||!integer(v.leg,0,v.legs-1)||!Array.isArray(v.itinerary))return null;
        const origin=world.sites.find(s=>s.id===v.origin.id),target=world.sites.find(s=>s.id===v.target.id);
        if(distance(v.origin,origin)>=10 || target && distance(v.target,target)>=10)return null;
        if(root.EarthVoyages?.valid && !root.EarthVoyages.valid(v))return null;
      }
      if(world.lastVoyage!=null){
        const r=world.lastVoyage;
        if(!geoPoint(r.origin)||!ids.has(r.origin.id)||!geoPoint(r.target)||!Array.isArray(r.log))return null;
        if(root.EarthVoyages?.validReport && !root.EarthVoyages.validReport(r))return null;
      }
      if(!ids.has(world.activeId))world.activeId=world.sites[0]?.id ?? null;
      return world;
    }catch(e){return null;}
  }
  function create(options={}) {
    let storage=options.storage;
    if(storage===undefined){ try { storage=root.localStorage; } catch(e){storage=null;} }
    const key=options.key || 'common-earth.world.v1';
    let world=blank(),saveIssue=!storage,saveMessage=!storage?'This browser cannot store the world between visits.':'';
    let lastSeen=null,lastGood=null,futureSave=false,unsavedAction=false,diverged=false;
    let actionGeneration=0,lastSyncWasWork=false,closed=false;
    const backupKey=key+'.previous',listeners=new Set();
    const current=()=>world.sites.find(s=>s.id===world.activeId)||null;
    const record=(text,site)=>{world.journal.unshift({week:world.week,text,siteId:site ? site.id : null}); world.journal.length=Math.min(world.journal.length,160);};
    const reject=message=>({ok:false,message});
    function notify(external=false,details={}){
      for(const fn of listeners){
        try{fn(world,{external,message:saveMessage,...details});}
        catch(error){
          // A view that fails to redraw cannot undo a committed economic turn.
          if(root.reportError)root.reportError(error);
          else root.console?.error('Unable to refresh a game view',error);
        }
      }
    }
    function storageRead(k){
      if(!storage)return null;
      try{return storage.getItem(k);}catch(e){saveIssue=true;saveMessage='Browser storage is unavailable. Progress is in this tab only.';return undefined;}
    }
    function restore(raw,preserveSelection){
      const selected=preserveSelection && world.activeId;
      futureSave=false;
      let restored=readSave(raw),goodText=raw;
      if(!restored && raw){
        try{futureSave=JSON.parse(raw)?.version>VERSION;}catch(e){/* Try the last complete turn. */}
        if(!futureSave){goodText=storageRead(backupKey);restored=readSave(goodText);}
        saveIssue=true;
        saveMessage=futureSave?'A newer edition saved this world. Reload the latest game to continue.':
          restored?'Recovered the previous complete turn.':'The stored world could not be read. A new game is available.';
      }else{saveIssue=!storage;saveMessage=storage?'':'This browser cannot store the world between visits.';}
      world=restored || blank();
      if(selected && world.sites.some(s=>s.id===selected))world.activeId=selected;
      lastSeen=raw;lastGood=restored?goodText:null;
    }
    const initial=!storage && typeof options.snapshot==='string'?options.snapshot:storageRead(key);
    if(initial!==undefined)restore(initial,false);
    function sync(){
      if(!storage || diverged)return false;
      const raw=storageRead(key);
      if(raw===undefined || raw===lastSeen)return false;
      if(unsavedAction){
        // A clock in another tab can write the old economic position after a
        // local quota failure. Keep the player's choice and retry on the next save.
        const incoming=readSave(raw),base=readSave(lastGood);
        if(incoming && base && (incoming.actionRevision||0)===(base.actionRevision||0) &&
            incoming.week===base.week && (incoming.workRevision||0)>(base.workRevision||0)){
          lastSeen=raw;lastGood=raw;
          return false;
        }
        // Both tabs made a player choice. Keep both turns available: the other
        // one on disk, and this one here for copying or export under a new name.
        diverged=true;saveIssue=true;lastSyncWasWork=false;actionGeneration++;
        saveMessage='Another tab saved a different turn. Your choices are still here. Use Saved worlds to copy or export this version.';
        notify(true);
        return true;
      }
      const prior=world;
      restore(raw,true);
      lastSyncWasWork=!!world.workRevision && world.workRevision>(prior.workRevision||0) &&
        world.actionRevision===prior.actionRevision && world.week===prior.week && !saveIssue;
      if(lastSyncWasWork){
        const completed=[];
        for(const before of prior.sites){
          const after=world.sites.find(s=>s.id===before.id);
          for(const job of before.construction||[]){
            if(after && !after.construction?.some(next=>next.id===job.id))completed.push({...job,siteId:before.id});
          }
        }
        notify(true,{construction:true,completed});
      }else{actionGeneration++;notify(true);}
      return true;
    }
    const conflict='Another tab updated this world. Review the current state and try again.';
    function guarded(operation,allowNewer=false){
      return (...args)=>{
        if(closed)return reject('This world is no longer open in this tab.');
        if(sync()&&!lastSyncWasWork)return reject(conflict);
        if(futureSave&&!allowNewer)return reject(saveMessage);
        return operation(...args);
      };
    }
    function onStorage(event){if((event.key===key||event.key===null) && (!event.storageArea || event.storageArea===storage))sync();}
    if(storage && root.addEventListener)root.addEventListener('storage',onStorage);
    function save(notice={}){
      if(sync())return reject(conflict);
      if(notice.construction)world.workRevision=(world.workRevision||0)+1;
      else{world.actionRevision=(world.actionRevision||0)+1;actionGeneration++;}
      if(storage && !diverged){
        const text=JSON.stringify(world);
        try{
          if(lastGood && lastGood!==text && (!notice.construction || notice.completed?.length)){
            try{storage.setItem(backupKey,lastGood);}catch(e){/* Primary save takes priority when storage is full. */}
          }
          try{storage.setItem(key,text);}
          catch(e){
            if(!storage.removeItem)throw e;
            storage.removeItem(backupKey);storage.setItem(key,text);
          }
          lastSeen=text;lastGood=text;futureSave=false;saveIssue=false;saveMessage='';unsavedAction=false;
        }catch(e){if(!notice.construction)unsavedAction=true;saveIssue=true;saveMessage='This turn is in memory. The browser could not save it for a later visit.';}
      }
      notify(false,notice);
      return null;
    }
    function fulfilled(site,p,why){
      const revised=p.promise?.revised;
      const credit=revised?' The earlier '+resources(p.promise.advance)+' counted toward the agreement.':'';
      p.promise=null;p.lastPromise=world.week;site.stats.kept++;
      return p.name+' saw the '+(revised?'revised ':'')+'promise kept. '+why+credit+' '+outcome(apply(site,{trust:3}),bond(p,2));
    }
    function charterMet(turn=world){
      return charterFacts(turn).termsMet;
    }
    function ratify(turn){
      if(turn.completed || !turn.charter)return '';
      const progress=charterFacts(turn);
      if(progress.stewards && progress.termsMet){
        turn.completed=true;
        return 'Charter fulfilled: '+CHARTERS[turn.charter].name+'. The assembly ratified your network’s compact. Your settlements remain open to play.';
      }
      return '';
    }
    function complete(message,site,write=true){
      if(write && message)record(message,site);
      const victory=ratify(world);if(victory)record(victory);
      const collision=save();
      return collision || {ok:true,message:message+(victory?' '+victory:'')};
    }
    function sponsorshipOffer(siteId=world.activeId){
      const sponsor=world.sites.find(site=>site.id===siteId);
      const children=sponsor?world.sites.filter(s=>s.foundedBy===sponsor.id):[];
      const original=sponsor?.id===world.sites[0]?.id;
      // Early v1 worlds do not record parentage. Existing communities keep
      // their locations and resources, and the starting hub remains a sponsor.
      const repeat=children.length>0 || original&&world.sites.length>1;
      const firstGrant=sponsor && original && !repeat;
      const goods=sponsor?(repeat?{funds:8,materials:3,food:4}:{funds:6,materials:2,food:3}):{};
      const reserves=sponsor&&!firstGrant?{funds:2,materials:1,food:3}:{};
      const localSupport='Hear two local residents, keep a local promise, or hear one resident and open one local project.';
      const terms=sponsor?'One effort transfers '+resources(goods)+' to the new settlement. Two volunteers move from '+sponsor.name+' and four new members join them. Each hub sponsors at most once a week.'+
        (firstGrant?'':' The sponsor keeps '+resources(reserves)+' after departure.'):'Your first settlement begins with 12 residents, 16 funds, 8 materials and 12 food.';
      let reason='';
      if(sponsor){
        const heard=sponsor.residents.filter(p=>p.heard).length;
        const built=sponsor.buildings.length>0 || (root.EarthCityModel?.overview(sponsor).developed || 0)>0;
        const ready=heard>=2 || sponsor.stats.kept>0 || heard>0 && built;
        if(children.some(s=>s.founded===world.week))reason=sponsor.name+' sponsored a settlement this week. It can sponsor again next week.';
        else if(!firstGrant && !ready)reason=sponsor.name+' needs local support before sponsoring another community. '+localSupport;
        else if(sponsor.population<6)reason='At least six residents must live here before two volunteer to relocate.';
        else if(world.effort<1)reason='Sponsorship needs 1 effort. Advance the week to refresh.';
        else if(Object.entries(goods).some(([k,n])=>sponsor[k]<n+(reserves[k] || 0)))reason='Sponsorship needs '+resources(goods)+(firstGrant?'':' and must leave '+resources(reserves)+' at home')+'.';
      }
      return {available:!reason,reason,terms,goods,reserves,effort:sponsor?1:0,newPopulation:sponsor?6:12,relocating:sponsor?2:0,readiness:sponsor && !firstGrant?localSupport:''};
    }
    function foundingOffer(point){
      const offer=sponsorshipOffer();
      let reason='';
      if(!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat)>90 || Math.abs(point.lon)>180)reason='Choose a point on Earth first.';
      else if(point.kind==='partner' || point.partnerId!=null)reason='This independent community governs itself. Open its partner panel to negotiate.';
      else{
        const nearby=world.sites.find(s=>distance(s,point)<10);
        if(nearby)reason='A settlement already serves this area: '+nearby.name+'.';
      }
      return reason?{...offer,available:false,reason}:offer;
    }
    function found(point,customName,commission='later'){
      const offer=foundingOffer(point),old=current();
      if(!offer.available)return reject(offer.reason);
      const index=world.sites.length,water=Boolean(point.water),region=tidy(point.name || point.region) || (water?'Open water':'Earth');
      let serial=index+1;
      while(world.sites.some(site=>site.id==='site-'+serial))serial++;
      const names=NAMES[index % NAMES.length],id='site-'+serial;
      let name=tidy(customName) || (region==='Earth'?'Earth':region)+(water?' Anchorage':' Commons');
      if(world.sites.some(s=>s.name===name))name+=' '+(index+1);
      if(old){payment(old,offer.goods);old.population-=offer.relocating;world.effort-=offer.effort;}
      const site=newSettlement({id,name,region,point,water,names,old,offer});
      world.sites.push(site);world.activeId=id;
      const note=root.EarthCampaigns?.found(world,site,commission);
      return complete(name+' founded. '+(old?old.name+' transferred '+resources(offer.goods)+'. Two volunteers and four new members started the settlement. ':'')+({food:'Its growers produce 1 extra food each week.',materials:'Its salvage team recovers 1 extra material each week.',funds:'Its cooperative earns 1 extra fund each week.'})[site.specialty]+(note?' '+note:''),site);
    }
    function newSettlement({id,name,region,point,water,names,old,offer}){
      const specialty=water?'food':['food','materials','funds'][Math.abs(Math.round(point.lat*2+point.lon))%3];
      const site={id,name,region,lat:point.lat,lon:point.lon,water,specialty,era:'Settlement',founded:world.week,foundedBy:old?.id || null,routeLinks:0,
        population:offer.newPopulation,funds:old?offer.goods.funds:16,food:old?offer.goods.food:12,materials:old?offer.goods.materials:8,trust:50,wellbeing:54,tech:[],buildings:[],construction:[],delivery:null,
        residents:PROFILES.map((p,slot)=>({id:id+'-p'+slot,slot,name:names[slot],role:p.role,value:p.value,bond:0,heard:false,promise:null,lastTalk:0,lastPromise:-10})),
        issue:null,pending:[],stats:{kept:0,missed:0,resolved:0,deliveries:0},issueIndex:-1,lastDeliveryWeek:0};
      root.EarthCityModel?.normalise(site);
      return site;
    }
    function manageSite(id,action){
      const index=world.sites.findIndex(site=>site.id===id);
      if(index<0 || !['restart','delete'].includes(action))return reject('This community is unavailable.');
      const site=world.sites[index];
      const next=structuredClone(world);
      next.routes=next.routes.filter(route=>route.from!==id && route.to!==id);
      next.journal=next.journal.filter(entry=>entry.siteId!==id);
      next.lastWeekReview=null;
      for(const key of ['voyage','lastVoyage']){
        if(next[key]?.origin.id===id || next[key]?.target.id===id)next[key]=null;
      }
      for(const partner of Object.values(next.partners||{})){
        for(const key of ['offer','agreement'])if(partner[key]?.homeId===id)partner[key]=null;
      }
      if(next.legacy?.term?.siteId===id)next.legacy.term=null;
      if(next.learningGoals){
        if(next.learningGoals.active?.siteId===id)next.learningGoals.active=null;
        next.learningGoals.history=next.learningGoals.history.filter(entry=>entry.siteId!==id);
      }
      for(const other of next.sites){
        if(other.foundedBy===id)other.foundedBy=null;
        if(other.issue?.targetId===id)other.issue=null;
        other.pending=other.pending.filter(entry=>entry.targetId!==id);
      }
      if(action==='delete')next.sites.splice(index,1);
      else next.sites[index]=newSettlement({id,name:site.name,region:site.region,point:site,water:site.water,names:site.residents.map(p=>p.name),old:null,offer:{newPopulation:12}});
      const validated=readSave(JSON.stringify(next));
      if(!validated)return reject('This community could not be changed safely.');
      world=validated;
      return complete(site.name+(action==='delete'?' deleted.':' restarted.'),action==='restart'?world.sites[index]:null);
    }
    function visit(id){
      const next=world.sites.find(s=>s.id===id);
      if(!next)return reject('That settlement could not be found.');
      world.activeId=id;return complete('Now in '+next.name+'.',next,false);
    }
    function tradeRoute(a,b){
      return world.routes.find(r=>(r.from===a.id && r.to===b.id)||(r.from===b.id && r.to===a.id));
    }
    function travelTime(a,b){
      const weeks=distance(a,b)<1800?1:distance(a,b)<7500?2:3;
      return Math.max(1,weeks-Number(a.tech.includes('exchange')||b.tech.includes('exchange')));
    }
    function supplyPartner(turn,site){
      const partnerIds=new Set();
      for(const r of turn.routes){
        if(r.from===site.id)partnerIds.add(r.to);
        if(r.to===site.id)partnerIds.add(r.from);
      }
      const candidates=turn.sites.filter(s=>partnerIds.has(s.id));
      candidates.sort((a,b)=>a.food/Math.max(1,a.population)-b.food/Math.max(1,b.population));
      return candidates[0] || null;
    }
    function openIssue(turn,site) {
      const partner=supplyPartner(turn,site);
      const visited=site.agendaVisits || {};
      // Legacy worlds have a current agenda index but no record of older
      // agendas. Mark the current one so resuming does not instantly repeat it.
      if(site.issueIndex>=0 && !site.agendaVisits)visited[site.issueIndex]=turn.week-1;
      const eligible=QUESTIONS.map((q,index)=>({index,stage:q.stage||0,needsPartner:q.partner})).filter(q=>
        site.tech.length>=q.stage && (!q.needsPartner || partner)
      );
      eligible.sort((a,b)=>(visited[a.index]||0)-(visited[b.index]||0) || b.stage-a.stage || a.index-b.index);
      const index=site.issueIndex<0?0:eligible[0].index,q=QUESTIONS[index];
      site.issueIndex=index;visited[index]=turn.week;site.agendaVisits=visited;
      const target=q.partner?partner:null;
      site.issue={index,title:q.title,prompt:q.prompt+(target?' The receiving partner is '+target.name+'.':''),deadline:turn.week+2,targetId:target?.id || null};
    }
    function votePlan(turn,site,choice,week){
      const target=choice.transfer?turn.sites.find(s=>s.id===site.issue.targetId):null;
      const delay=Math.max(choice.delay || 2,target?travelTime(site,target):0);
      const due=week+delay;
      const details=choice.terms+(target?' Partner: '+target.name+'.':'')+' Outcome in week '+due+'.';
      return {target,due,details};
    }
    function recordVote(turn,site,c,week){
      const plan=votePlan(turn,site,c,week);
      apply(site,c.now);
      site.pending.push({index:site.issue.index,choice:c.id,week:plan.due,targetId:plan.target?.id || null});
      site.issue=null;
      return site.name+' voted to '+c.name.charAt(0).toLowerCase()+c.name.slice(1)+'. '+plan.details;
    }
    function mandateActions(turn,site,add){
      if(turn.sites.length<3 || !has(site,'hall')&&!site.mandate)return;
      const limit='A local vote costs 1 fund. It must leave at least 2 funds, 2 materials and 5 food. You may still vote first.';
      for(const [id,name] of Object.entries(MANDATES)){
        if(site.mandate===id)continue;
        const emphasis=id==='services'?'It favours households and access when views differ.':'It favours productive capacity and financial reserves when views differ.';
        add('council','mandate:'+id,name,'Let the assembly vote at the end of each deadline. '+emphasis+' '+limit,{goods:{funds:2},gate:has(site,'hall')?'':'Build an assembly hall before changing the mandate.'},()=>{
          site.mandate=id;return site.name+' authorised its assembly. '+name+'. '+limit;
        });
      }
      if(site.mandate)add('council','mandate:recall','Bring votes back to the player','The standing instruction is “'+MANDATES[site.mandate]+'”. Recall it before a deadline to resume personal responsibility.',{effort:0},()=>{
        site.mandate=null;return 'The assembly will wait for your vote on the next decision.';
      });
    }
    function delegatedVote(turn,site){
      if(!site.mandate)return '';
      if(!has(site,'hall'))return 'The assembly lost its meeting hall. ';
      const q=QUESTIONS[site.issue.index];
      const c=q.choices.find(c=>(c.id===q.services)===(site.mandate==='services'));
      const dues={...c.goods,funds:1+(c.goods?.funds||0)};
      const floors={funds:2,materials:2,food:5};
      if(Object.keys(floors).some(k=>site[k]-(dues[k] || 0)<floors[k]))return 'The assembly protected its minimum reserves. ';
      payment(site,dues);
      return 'The assembly used its standing mandate and 1 fund for the meeting. '+recordVote(turn,site,c,turn.week-1);
    }
    function successorVote(turn,site,slot,week=turn.week){
      if(!site.issue)return null;
      const q=QUESTIONS[site.issue.index],floors={food:Math.max(6,Math.ceil(site.population/5)),materials:2,funds:2};
      const choices=q.choices.filter(c=>Object.entries(c.goods || {}).every(([k,n])=>site[k]-n>=floors[k]));
      const choice=choices.find(c=>c.ally===slot) || choices.find(c=>(slot===1)!==(c.id===q.services)) || choices[0];
      if(!choice)return null;
      payment(site,choice.goods);
      return recordVote(turn,site,choice,week);
    }
    function buildQuote(site,kind,b){
      const gate=!root.EarthConstruction?'Construction crews could not load. Reload the game to try again.':
        !Number.isSafeInteger((site.projectSerial||0)+1)?'This district cannot record another work order.':
        site.buildings.length+(site.construction||[]).filter(job=>job.scope==='street').length>=9?'All nine district lots are occupied or reserved.':
        kind==='fishingDock' && !waterfront(site)?'Choose a community with a navigable waterfront.':
        kind==='fishingDock' && (has(site,kind)||site.construction?.some(job=>job.kind===kind||job.original?.kind===kind))?'This community already has a fishing dock or dock work order.':
        kind==='wetland' && !site.tech.includes('apprenticeship')?'First research shared apprenticeship.':'';
      const goods={funds:b.funds,materials:Math.max(1,b.materials-(root.EarthStrategy?.buildDiscount(site) || 0))};
      return {goods,gate};
    }
    function actionReason(site,effort,goods,gate){
      return gate || (world.effort<effort?'Requires '+effort+' effort. Advance the week to refresh.':'') ||
        (!affordable(site,goods)?'Requires '+resources(goods)+'.':'');
    }
    function actionsAndRules(group='all',site=current()){
      const actions=[];
      if(!site)return actions;
      function add(category,id,label,description,options,run){
        if(group!=='all' && group!==category)return;
        const {effort=1,goods={},gate='',...meta}=options || {};
        const reason=actionReason(site,effort,goods,gate);
        actions.push({id,group:category,label,description,cost:effort,goods,available:!reason,reason,...meta,run});
      }
      if(group==='all'||group==='people')for(const p of site.residents){
        const profile=PROFILES[p.slot],who={residentId:p.id};
        const when=p.promise?p.promise.dueWeek:0;
        add('people','listen:'+p.id,p.heard?'Check in with '+p.name:'Listen to '+p.name,p.role+' · '+p.value+'. '+(p.heard?'Hear how the work is going.':'Hear the experience behind this resident’s priorities.'),{...who,gate:p.lastTalk===world.week?'You already spoke this week.':''},()=>{
          const memory=p.shiftMemory,miss=p.lastMissed;
          let quote=profile.quotes[p.heard?1:0];
          if(miss && !miss.discussedWeek){
            quote=miss.revised?'“We made a new plan together. When the rest didn’t arrive, I had to ask the others to wait again. Tell me what you have in hand the next time we agree a date.”':
              '“When the date passed, I still had to answer to the people who were waiting. Come and talk to me while there’s time to make a different plan.”';
            miss.discussedWeek=world.week;
          }else if(memory && memory.week<world.week && !memory.discussedWeek && memory.quote){
            quote='“'+memory.quote.replace(/^[“"]|[”"]$/g,'')+'”';
            memory.discussedWeek=world.week;
          }
          p.heard=true;p.lastTalk=world.week;
          return p.name+': '+quote+' '+bond(p,1)+'.'+(root.EarthCampaigns?.testimony?.(world,site,p) || '');
        });
        if(p.heard && !p.promise){
          add('people','promise:'+p.id,'Make a promise to '+p.name,'Commit to '+profile.ask+' by the end of week '+(world.week+2)+'. Keeping it costs '+resources(profile.goods)+' or a new '+BUILDINGS[profile.alternative].name.toLowerCase()+'.',
            {...who,effort:0,gate:world.week-p.lastPromise<3?p.name+' can consider a new promise in week '+(p.lastPromise+3)+'.':''},()=>{
              p.promise={dueWeek:world.week+2};return 'You promised '+p.name+' to '+profile.ask+' by the end of week '+p.promise.dueWeek+'.';
            });
        }
        if(p.promise){
          const outstanding=promiseBalance(p);
          const credit=p.promise.revised?' Already delivered: '+resources(p.promise.advance)+'.':'';
          add('people','fulfil:'+p.id,profile.support,'Deliver '+resources(outstanding)+' to '+p.name+' by the end of week '+when+'.'+credit+' '+profile.result,
            {...who,goods:outstanding},()=>fulfilled(site,p,profile.result));
          if(!p.promise.revised){
            const item=Object.keys(profile.goods)[0],advance={[item]:1},rest={[item]:profile.goods[item]-1};
            const conditions=p.name+' will move the deadline from week '+when+' to week '+(when+1)+' if you visit now with '+resources(advance)+'. The remaining '+resources(rest)+' will still be due. Missing that revised date costs up to 4 trust and 2 bond.';
            add('people','revise:'+p.id,'Ask '+p.name+' for one more week',conditions,
              {...who,goods:advance,gate:p.bond<2?'A bond of 2 is needed for '+p.name+' to agree to revised terms.':''},()=>{
                p.promise={dueWeek:when+1,originalDue:when,revised:true,agreedWeek:world.week,advance};
                return p.name+' accepted '+resources(advance)+' today and agreed to the end of week '+(when+1)+'. '+resources(rest)+' remains due.';
              });
          }
        }
      }
      if(group==='all'||group==='build')for(const [kind,b] of Object.entries(BUILDINGS)){
        const {goods,gate}=buildQuote(site,kind,b);
        add('build','build:'+kind,b.name,b.info,{kind,goods,gate},plot=>{
          // The order reserves this plot and these supplies. Opening is a later worker event.
          let serial=site.projectSerial||0,id;
          const occupiedIds=new Set([...site.buildings,...(site.construction||[])].flatMap(item=>item.original?[item.id,item.original.id]:[item.id]));
          do{
            if(!Number.isSafeInteger(serial+1))return reject('This district cannot record another work order.');
            id=site.id.slice(0,420)+'-build-'+(++serial);
          }while(occupiedIds.has(id));
          const result=root.EarthConstruction.start(site,world,{id,scope:'street',kind,plot,name:b.name,paid:{...goods}});
          if(!result.ok)return result;
          site.projectSerial=serial;
          return b.name+' commissioned on lot '+(plot+1)+'.';
        });
      }
      if(group==='all' || group==='build')for(const b of site.buildings){
        const plan=previewReclaim(b.plot,site,false);
        add('build','reclaim:'+b.id,'Dismantle lot '+(b.plot+1),plan.text,{plot:b.plot,buildingId:b.id,gate:plan.available?'':plan.reason},()=>{
          const order=root.EarthDismantling.start(site,world,b.plot,b.id);
          return order.ok?order.message:order;
        });
      }
      const nextTech=TECH[site.tech.length];
      if(nextTech&&(group==='all'||group==='research')){
        let gate='';
        if(nextTech.id==='apprenticeship'){
          if(!site.residents.some(p=>p.heard))gate='Listen to a resident first.';
          else if(!has(site,'hall')&&!has(site,'workshop'))gate='Build an assembly hall or a repair workshop.';
        }else if(nextTech.id==='exchange'){
          if(!world.routes.some(r=>r.from===site.id||r.to===site.id))gate='Open an exchange route from this settlement.';
          else if(site.stats.kept<1)gate='Keep one promise in this settlement.';
        }else{
          if(!world.charter)gate='Choose a network charter in Council.';
          else if(site.stats.resolved<1)gate='See one local council decision through to its outcome.';
          else if(!site.residents.every(p=>p.heard))gate='Listen to all three local residents.';
        }
        add('research','research:'+nextTech.id,nextTech.name,nextTech.info,{effort:2,goods:{funds:nextTech.funds,materials:nextTech.materials},gate},()=>{
          site.tech.push(nextTech.id);site.era=nextTech.era;return site.name+' entered the '+nextTech.era+' era. '+nextTech.info;
        });
      }
      if(!world.charter&&(group==='all'||group==='council'))for(const [id,c] of Object.entries(CHARTERS)){
        add('council','charter:'+id,c.name,c.text+' Ratification also requires two linked communities and the Stewardship compact researched in one of them.',{effort:0},()=>{world.charter=id;return 'Your founding charter is “'+c.name+'”. '+c.text;});
      }
      const council=group==='all'||group==='council';
      const delegated=council&&root.EarthLegacy?.governs(world,site);
      if(council && site.issue && !delegated){
        const q=QUESTIONS[site.issue.index];
        for(const c of q.choices){
          const plan=votePlan(world,site,c,world.week);
          add('council','vote:'+c.id,c.name,q.title+' · '+site.issue.prompt+' '+plan.details,
            {goods:c.goods || {},issueTitle:q.title},()=>recordVote(world,site,c,world.week));
        }
      }
      if(council && !delegated)mandateActions(world,site,add);
      if(group==='all' || group==='routes')for(const other of world.sites.filter(s=>s.id!==site.id)){
        const route=tradeRoute(site,other),weeks=travelTime(site,other);
        const mode=site.water||other.water?'Sea passage':site.region===other.region?'Supply road':'Trade passage';
        if(!route)add('routes','route:'+other.id,'Link '+other.name,mode+' · '+Math.round(distance(site,other)).toLocaleString('en')+' km · '+weeks+' week'+(weeks===1?'':'s')+' each way. Partners protect a reserve of 5. Projected household food shortages take priority over balancing other stocks.',{targetId:other.id,goods:{funds:3,materials:1}},()=>{
          site.routeLinks=(site.routeLinks || 0)+1;other.routeLinks=(other.routeLinks || 0)+1;
          world.routes.push({id:site.id+'~'+other.id,from:site.id,to:other.id,name:mode,opened:world.week,shipments:[],deliveries:0,lastDispatch:0,lastStatus:'Partners are comparing reserves.'});
          return mode+' opened between '+site.name+' and '+other.name+'. Food is sent first when a partner is projected to fall below its reserve. Other surpluses move when stocks differ by at least three units.';
        });
      }
      add('work','work:forage','Tend the food beds','Spend a shift harvesting food for the district. +3 food.',{},()=>{apply(site,{food:3});return 'The food beds yielded 3 food.';});
      add('work','work:salvage','Recover materials','Salvage and sort reusable timber and fittings. +3 materials.',{},()=>{apply(site,{materials:3});return 'The salvage crew recovered 3 materials.';});
      add('work','work:contract','Take a paid shift','Work a shift for the trading cooperative. +4 funds.',{},()=>{apply(site,{funds:4});return 'The cooperative paid 4 funds for the shift.';});
      if(!site.delivery){
        const p=site.residents[site.stats.deliveries%site.residents.length];
        const reward=p.bond<10?'3 funds and 1 bond':'3 funds. Your bond is already at 10';
        add('work','courier:pick','Collect the market parcel','Carry the parcel to '+p.name+', the '+p.role.toLowerCase()+'. Delivery earns '+reward+'.',{residentId:p.id,venue:'market',gate:site.lastDeliveryWeek===world.week?'The next parcel arrives next week.':''},()=>{
          site.delivery={residentId:p.id,week:world.week};
          return 'Parcel collected. '+(site.shift?.residentId===p.id?p.name+' is with you and can take the parcel now.':'Choose Meet in People to find '+p.name+' in the district.');
        });
      }else{
        const p=site.residents.find(r=>r.id===site.delivery.residentId);
        if(p)add('work','courier:deliver:'+p.id,'Deliver the parcel to '+p.name,(site.shift?.residentId===p.id?'Hand the parcel to '+p.name+' while you are together.':'Meet '+p.name+' in the district to hand over the market parcel.')+(p.bond<10?' +3 funds · +1 bond.':' +3 funds · bond already at 10.'),{effort:0,residentId:p.id,venue:'resident'},()=>{
          site.delivery=null;site.lastDeliveryWeek=world.week;site.stats.deliveries++;return p.name+' received the parcel. '+outcome(apply(site,{funds:3}),bond(p,1));
        });
      }
      if(root.EarthNeighbours && (group==='all'||group==='people'))root.EarthNeighbours.actions(world,site,add);
      if(root.EarthCampaigns && (group==='all'||group==='council'))root.EarthCampaigns.actions(world,site,add);
      if(root.EarthPartners && (group==='all'||group==='routes'))root.EarthPartners.actions(world,site,add);
      if(root.EarthLegacy && (group==='all'||group==='council'))root.EarthLegacy.actions(world,site,add);
      if(root.EarthStrategy && (group==='all'||group==='research'))root.EarthStrategy.actions(world,site,add);
      return actions;
    }
    function actions(group='all',siteId=world.activeId){
      const site=world.sites.find(candidate=>candidate.id===siteId);
      return site?actionsAndRules(group,site).map(({run,...view})=>view):[];
    }
    function fishingOffer(){
      const site=current(),food=4,effort=1;
      let reason='';
      if(!waterfront(site))reason='Fishing needs a community with a navigable waterfront.';
      else if(!has(site,'fishingDock')){
        reason=site.construction?.some(job=>job.kind==='fishingDock')?'The crew is still building the fishing dock.':'Build a fishing dock in Community actions → Build.';
      }else if(site.lastFishingWeek===world.week)reason='This week’s catch is in. Fish again in week '+(world.week+1)+'.';
      else if(world.effort<effort)reason='Fishing needs 1 effort. Advance the week to refresh.';
      else if(site.food>Number.MAX_SAFE_INTEGER-food)reason='The community food store is full.';
      return {available:!reason,reason,food,effort};
    }
    function fish(siteId){
      const site=current();
      if(!site || site.id!==siteId)return reject('Return to the boat in the selected community.');
      const offer=fishingOffer();
      if(!offer.available)return reject(offer.reason);
      world.effort-=offer.effort;
      apply(site,{food:offer.food});
      site.lastFishingWeek=world.week;
      return complete('The fishing crew landed '+offer.food+' food for '+site.name+'.',site);
    }
    function act(id,plot){
      const site=current();
      if(!site)return reject('Found your first settlement on the globe.');
      const a=actionsAndRules().find(item=>item.id===id);
      if(!a)return reject('This action is no longer available here.');
      if(!a.available)return reject(a.reason);
      if(a.id.startsWith('build:')){
        if(plot===undefined || plot===null){
          plot=Array.from({length:9},(_,n)=>n).find(n=>!occupiedLot(site,n));
        }
        if(!Number.isInteger(plot)||plot<0||plot>8 || occupiedLot(site,plot))return reject('Choose a vacant lot. An active worksite reserves its plot.');
      }
      world.effort-=a.cost;payment(site,a.goods);
      const outcome=a.run(plot);
      if(outcome?.ok===false){world.effort+=a.cost;apply(site,a.goods);return outcome;}
      return complete(outcome,site);
    }
    function occupiedLot(site,plot){
      return site.buildings.some(item=>item.plot===plot) || (site.construction||[]).some(job=>job.scope==='street'&&job.plot===plot);
    }
    function previewBuild(kind,plot) {
      const site=current(),b=BUILDINGS[kind];
      const invalid=reason=>({ok:false,available:false,reason,label:b?b.name:'District lot',text:reason,forecast:'',delta:{},fulfilled:[],neighbours:[]});
      if(!site)return invalid('Found your first settlement.');
      if(!b)return invalid('Choose a project.');
      if(!Number.isInteger(plot) || plot<0 || plot>8)return invalid('Choose a district lot.');
      if(occupiedLot(site,plot))return invalid('This lot is already built on or reserved for construction.');
      const {goods,gate}=buildQuote(site,kind,b);
      const reason=actionReason(site,1,goods,gate);
      const around=site.buildings.filter(item=>adjacent(item.plot,plot)).map(({kind,plot,name})=>({kind,plot,name}));
      const oldRate=rates(site,undefined,world);
      const builtSite={...site,buildings:[...site.buildings,{kind,plot,name:b.name}]};
      const newRate=rates(builtSite,undefined,world);
      const delta=rateDifference(oldRate,newRate);
      const promises=site.residents.filter(p=>p.promise && PROFILES[p.slot].alternative===kind).map(p=>p.name);
      let pairing='';
      if(kind==='garden' && around.some(n=>n.kind==='workshop'))pairing=' A neighbouring workshop adds 1 food.';
      if(kind==='market'){
        const shop=marketPlan(builtSite).markets.find(m=>m.plot===plot);
        pairing=' This shop '+(shop.tier==='idle'?'has no remaining customer catchment':shop.tier==='full'?'serves a full catchment':'shares a catchment')+' and earns '+(shop.base+shop.depot)+' funds per week.'+
          (shop.depot?' That includes 1 from the adjoining depot.':'');
      }
      if(kind==='workshop' || kind==='pier'){
        const unit=kind==='workshop'?'food':'funds';
        const oldLinks=productiveLinks(site).filter(x=>x.resource===unit).length;
        const newLinks=productiveLinks(builtSite).filter(x=>x.resource===unit).length;
        const improved=newLinks-oldLinks;
        if(improved>0)pairing=' Shared access adds '+improved+' '+unit+' across '+(kind==='workshop'?'neighbouring gardens.':'operating markets.');
      }
      const forecast=summary(delta) || 'No direct change in weekly yield';
      const effects=promises.length?' Opening before the deadline keeps the promise to '+promises.join(' and ')+'.':'';
      let service='';
      if(kind==='pier'){
        const partners=world.sites.filter(other=>tradeRoute(site,other));
        const improved=has(site,'pier')?0:partners.filter(p=>!has(p,'pier')).length;
        service=improved?' Adds 2 units of cargo capacity on '+improved+' current route'+(improved===1?'':'s')+'.':
          partners.length || has(site,'pier')?' Existing route capacity stays the same.':' Future routes from this depot have a base capacity of 4 units.';
      }
      if(kind==='fishingDock')service=' Board a waterfront boat and spend 1 effort to land 4 food once per week.';
      if(kind==='wetland')service=' Protects local homes and food during high water.';
      return {ok:true,available:!reason,reason,label:b.name,text:'Lot '+(plot+1)+' once open · '+forecast+'.'+pairing+service+effects,forecast,delta,goods,fulfilled:promises,neighbours:around};
    }
    function previewReclaim(plot,site=current(),withCrew=true){
      const b=site && site.buildings.find(p=>p.plot===plot);
      if(!b)return {ok:false,available:false,reason:'Choose an occupied district lot.',text:'Choose an occupied district lot.'};
      const plan=root.EarthDismantling?.preview(site,world,plot,withCrew);
      if(!plan?.ok){
        const reason=plan?.reason||'The dismantling crew could not load. Reload the game to try again.';
        return {ok:false,available:false,reason,text:reason};
      }
      const closed={...site,buildings:site.buildings.filter(p=>p.plot!==plot)};
      // Keep lost services separate from the temporary labour assignment. Closing
      // a facility can also move its staff, already included in the crew estimate.
      const delta=rateDifference(rates(site,undefined,world,{}),rates(closed,undefined,world,{}));
      const crewDelta=plan.crew?.weeklyDelta;
      const recovered=plan.recovered;
      const partners=site.residents.filter(p=>(b.partners || []).includes(p.id));
      const forecast=summary(delta)||'No direct change in weekly yield';
      let text='Close '+b.name.toLowerCase()+' on lot '+(plot+1)+'. When the crew clears the lot, recover '+recovered+' material'+(recovered===1?'':'s')+'. Weekly services on closure · '+forecast+'. You can withdraw the order before the crew begins work.';
      if(plan.crew)text+=plan.crew.workerNames.length?' Expected crew · '+plan.crew.workerNames.join(', ')+' · about '+plan.crew.etaSeconds+' seconds.':' No builder is currently available. Assign a resident to clear the lot.';
      if(crewDelta && summary(crewDelta))text+=' While the crew clears the lot · '+summary(crewDelta)+' per week.';
      if(partners.length)text+=' '+partners.map(p=>p.name).join(' and ')+' helped secure this project. Trust can fall by 2 and their bonds by 1.';
      if(b.kind==='fishingDock')text+=' Boats can fish again when a fishing dock reopens.';
      if(b.kind==='hall' && site.mandate && site.buildings.filter(b=>b.kind==='hall').length===1)text+=' The local assembly will need another hall before it can vote.';
      if(b.kind==='pier' && site.buildings.filter(b=>b.kind==='pier').length===1)text+=' Routes with no depot at the other end will lose 2 units of base cargo capacity.';
      return {...plan,available:plan.available&&world.effort>=1,reason:plan.reason||(world.effort<1?'Requires 1 effort. Advance the week to refresh.':''),buildingId:b.id,label:b.name,text,forecast,delta,crewDelta,recovered,partners:partners.map(p=>p.id)};
    }
    function reclaim(plot,buildingId){
      const plan=previewReclaim(plot);
      if(!plan.ok || !plan.available)return reject(plan.reason);
      if(plan.buildingId!==buildingId)return reject('The building on this lot changed. Review it before dismantling.');
      return act('reclaim:'+buildingId);
    }
    function applyShiftResult(site,result,requiresFunds=true){
      const spent=Object.fromEntries(Object.entries(result.now||{}).filter(([k,v])=>['funds','materials','food'].includes(k)&&v<0).map(([k,v])=>[k,-v]));
      if(requiresFunds && !affordable(site,spent))return reject('This choice needs '+resources(spent)+'.');
      apply(site,result.now);
      if(result.memory){
        const person=site.residents.find(p=>p.id===result.memory.residentId);
        if(person)person.shiftMemory={...result.memory};
      }
      for(const effect of result.bonds || []){
        const p=site.residents.find(person=>person.id===effect.residentId);
        if(p)bond(p,effect.amount);
      }
      return null;
    }
    function shiftCommand(kind,id){
      const site=current(),domain=root.EarthShifts;
      if(!site || !domain)return reject('A resident shift is unavailable here.');
      if(kind==='start'){
        if(world.effort<1)return reject('Starting a shift needs 1 effort. Advance the week to refresh.');
        const gate=domain.gate(world,site,id);
        if(!gate.available)return reject(gate.reason);
      }
      const result=kind==='start'?domain.start(world,site,id):
        kind==='finish'?domain.finish(site,world.week):domain[kind](site,id,world.week);
      if(!result.ok)return reject(result.message);
      const shortfall=applyShiftResult(site,result);
      if(shortfall)return shortfall;
      if(kind==='start')world.effort--;
      if(kind==='choose' && !site.shift.history.length){
        site.lastShiftWeek=world.week;
        site.residents.find(p=>p.id===site.shift.residentId).lastShiftWeek=world.week;
      }
      if(kind==='finish' && !site.shift.history.length){
        world.effort=Math.min(MAX_EFFORT,world.effort+1);
        // Older saves marked the district and the host as busy as soon as the shift began.
        if(site.lastShiftWeek===world.week)delete site.lastShiftWeek;
        const host=site.residents.find(p=>p.id===site.shift.residentId);
        if(host.lastShiftWeek===world.week)delete host.lastShiftWeek;
        result.message+=' Your 1 effort is available again.';
      }
      if(kind==='finish'){
        const actor=id?.siteId===site.id && id.residentId===site.shift.residentId?id:undefined;
        root.EarthConstruction?.releaseFromShift?.(site,site.shift,actor);
      }
      site.shift=result.shift;
      if(result.followUps?.length)site.shiftFollowUps=[...(site.shiftFollowUps || []),...result.followUps];
      return complete(result.message,site);
    }
    function beginVoyage(target,style='exchange'){
      const site=current(),nav=root.EarthVoyages;
      if(!site)return reject('Found a home settlement first.');
      if(!nav)return reject('Voyage navigation is unavailable.');
      if(world.voyage)return reject('Finish the current voyage before launching another.');
      if(world.effort<1)return reject('Commissioning a voyage takes 1 effort. Advance the week to refresh.');
      const id=target?.siteId ?? target?.id,owned=world.sites.find(s=>s.id===id);
      if(owned && geoPoint(target) && distance(owned,target)>=10)return reject('This settlement marker does not match the chosen coordinates.');
      if(!owned && typeof id==='string' && /^site-\d+$/.test(id))return reject('This settlement no longer exists.');
      const end=owned || {...target,id:null,siteId:null};
      const launch=nav.start(site,end,style);
      if(!launch.ok)return reject(launch.message);
      if(!affordable(site,launch.cost))return reject('The expedition needs '+resources(launch.cost)+'.');
      payment(site,launch.cost);world.effort--;world.voyage=launch.voyage;
      return complete(launch.message,site);
    }
    function sail(choiceId){
      const nav=root.EarthVoyages,v=world.voyage;
      if(!nav || !v)return reject('Choose a destination and launch an expedition first.');
      const site=world.sites.find(s=>s.id===v.origin.id);
      if(!site)return reject('This expedition has no home port.');
      const step=nav.step(v,choiceId);
      if(!step.ok)return reject(step.message);
      let message=step.message;
      if(step.complete){
        const reward=apply(site,step.reward);
        site.stats.voyages=(site.stats.voyages || 0)+1;
        const dest=world.sites.find(s=>s.id!==site.id && s.id===v.target.id);
        const targetReward=dest?apply(dest,step.report.targetReward):{};
        message='Arrived at '+v.target.name+'. '+step.report.headline+'. '+site.name+' received '+(summary(reward)||'no further gains at its current limits')+'.';
        if(dest && Object.keys(targetReward).length)message+=' '+dest.name+' received '+(summary(targetReward)||'no further gains at its current limits')+'.';
        world.lastVoyage={...step.report,reward,targetReward};world.voyage=null;
      }else world.voyage=step.voyage;
      return complete(message,site,step.complete);
    }
    function receiveCargo(turn,byId,event){
      const inbound=new Map(turn.sites.map(site=>[site.id,{food:0,materials:0,foodByWeek:{}}]));
      for(const route of turn.routes){
        route.shipments=route.shipments.filter(cargo=>{
          if(cargo.due>turn.week){
            const incoming=inbound.get(cargo.to);incoming[cargo.good]+=cargo.amount;
            if(cargo.good==='food')incoming.foodByWeek[cargo.due]=(incoming.foodByWeek[cargo.due] || 0)+cargo.amount;
            return true;
          }
          const dest=byId.get(cargo.to);
          apply(dest,{[cargo.good]:cargo.amount});route.deliveries++;route.lastArrivalWeek=turn.week;
          route.lastStatus=cargo.amount+' '+cargo.good+' from '+byId.get(cargo.from).name+' arrived in '+dest.name+'.';
          event(route.lastStatus,dest,'arrivals');
          return false;
        });
      }
      return inbound;
    }
    function dispatchCargo(turn,byId,inbound,event){
      const foodRate=new Map(turn.sites.map(site=>[site.id,rates(site,undefined,turn).food]));
      const used=new Set();
      // Include voted local supplies and voted partner grants expected within
      // the route horizon, alongside cargo already committed in either direction.
      for(const site of turn.sites)for(const item of site.pending){
        const c=QUESTIONS[item.index].choices.find(c=>c.id===item.choice);
        if(c.after?.food && !(item.index===2 && c.after.food<0 && has(site,'wetland')))addFuture(site.id,item.week,c.after.food);
        if(c.transfer?.food && byId.has(item.targetId))addFuture(item.targetId,item.week,c.transfer.food);
      }
      // Quoted or conditional diplomatic offers have no guaranteed cargo.
      // Paid reserved shipments and return loads already afloat do.
      if(root.EarthPartners)for(const [key,partner] of Object.entries(turn.partners || {})){
        const a=partner.agreement,home=a && byId.get(a.homeId);
        if(!home || !['return','outbound'].includes(a.phase))continue;
        if(root.EarthPartners.get(turn,home,key)?.exportGood!=='food')continue;
        if(a.phase==='return')addFuture(home.id,a.due,a.returned);
        else if(a.reserved)addFuture(home.id,a.due+a.days,a.reserved);
      }
      function addFuture(id,week,amount){
        const due=inbound.get(id).foodByWeek;
        due[week]=(due[week] || 0)+amount;
      }
      function projectedFood(site,transit){
        let stock=site.food+(site.strategy?.reserve || 0);
        const due=inbound.get(site.id).foodByWeek,change=foodRate.get(site.id);
        let lowest=stock;
        for(let k=1;k<=transit;k++){
          stock+=change+(due[turn.week+k] || 0);
          lowest=Math.min(lowest,stock);
        }
        return {arrival:stock,lowest};
      }
      function availableFood(site,weeks){
        return Math.max(0,Math.min(site.food-5,projectedFood(site,weeks).lowest-5));
      }
      function capacityFor(a,b){
        return 2+(has(a,'pier')||has(b,'pier')?2:0)+(root.EarthStrategy?.cargoBonus(a) || 0);
      }
      function send(route,from,to,good,amount,weeks,aid=false){
        const due=turn.week+weeks;
        payment(from,{[good]:amount});
        inbound.get(to.id)[good]+=amount;
        if(good==='food')addFuture(to.id,due,amount);
        route.shipments.push({from:from.id,to:to.id,good,amount,due});
        route.lastDispatch=turn.week;
        if(aid)to.lastAidWeek=turn.week;
        route.lastStatus=amount+' '+good+' travelling to '+to.name+' · due week '+due+'.'+(aid?' Household food takes priority.':'');
        event(route.lastStatus,from,'departures',false);
        used.add(route);
      }
      const essential=[];
      for(const route of turn.routes){
        const a=byId.get(route.from),b=byId.get(route.to),weeks=travelTime(a,b);
        for(const [from,to] of [[a,b],[b,a]]){
          const expected=projectedFood(to,weeks).arrival;
          if(expected>=5 || availableFood(from,weeks)<=0)continue;
          const coverage=(to.food+(to.strategy?.reserve || 0)+(inbound.get(to.id).foodByWeek[turn.week+1] || 0))/Math.max(1,Math.ceil(to.population/5));
          essential.push({route,from,to,weeks,coverage,expected,lastAid:to.lastAidWeek || 0});
        }
      }
      essential.sort((a,b)=>a.coverage-b.coverage || a.lastAid-b.lastAid || a.weeks-b.weeks || a.expected-b.expected);
      for(const {route,from,to,weeks} of essential){
        if(used.has(route))continue;
        const need=5-projectedFood(to,weeks).arrival;
        const amount=Math.min(need,availableFood(from,weeks),capacityFor(from,to));
        if(amount>0)send(route,from,to,'food',amount,weeks,true);
      }
      for(const route of turn.routes){
        if(used.has(route))continue;
        const a=byId.get(route.from),b=byId.get(route.to),weeks=travelTime(a,b),options=[];
        for(const [from,to] of [[a,b],[b,a]])for(const good of ['food','materials']){
          const difference=(from[good]+inbound.get(from.id)[good])-(to[good]+inbound.get(to.id)[good]);
          const safe=good==='food'?availableFood(from,weeks):from[good]-5;
          const amount=Math.min(capacityFor(from,to),safe,Math.floor(difference/2));
          if(difference>=3 && amount>=1)options.push({from,to,good,amount,difference});
        }
        options.sort((a,b)=>b.difference-a.difference);
        if(!options.length){
          if(!route.shipments.length && route.lastArrivalWeek!==turn.week)route.lastStatus='No further shipment is due on this route.';
          continue;
        }
        const {from,to,good,amount}=options[0];send(route,from,to,good,amount,weeks);
      }
    }
    function closeDeadlines(turn,site,event,closingVotes){
      for(const p of site.residents)if(p.promise && turn.week>p.promise.dueWeek){
        const revised=Boolean(p.promise.revised),remaining=promiseBalance(p);
        p.lastMissed={week:turn.week,revised};
        p.promise=null;p.lastPromise=turn.week;site.stats.missed++;
        const result=outcome(apply(site,{trust:revised?-4:-3}),bond(p,revised?-2:-1));
        event('The '+(revised?'revised ':'')+'promise to '+p.name+' lapsed with '+resources(remaining)+' undelivered. '+result+' Check in to rebuild the relationship.',site,'promises');
      }
      if(!site.issue || turn.week<=site.issue.deadline)return;
      const elected=root.EarthLegacy?.governs(turn,site);
      if(elected && turn.week===site.issue.deadline+1){
        const vote=successorVote(turn,site,turn.legacy.term.slot,turn.week-1);
        if(vote){closingVotes.set(site.id,vote);return;}
      }
      const decision=elected?'The elected council protected its minimum reserves. ':delegatedVote(turn,site);
      if(site.issue){
        const q=QUESTIONS[site.issue.index];site.issue=null;
        event(decision+'The decision on “'+q.title+'” lapsed. '+outcome(apply(site,{trust:-2})),site,'council');
      }else event(decision,site,'council');
    }
    function settleCouncil(turn,site,transfers,event){
      site.pending=site.pending.filter(item=>{
        if(item.week>turn.week)return true;
        const question=QUESTIONS[item.index],choice=question.choices.find(c=>c.id===item.choice);
        const after={...choice.after};
        if(item.index===2 && has(site,'wetland'))for(const k of Object.keys(after))if(after[k]<0)after[k]=0;
        const ally=site.residents[choice.ally];
        const result=outcome(apply(site,after),ally.name+' '+bond(ally,1));
        site.stats.resolved++;
        let followup='';
        if(choice.practice){
          site.practices={...site.practices,[item.index]:choice.id};
          followup=' The new arrangement contributes '+summary(choice.practice)+' each week starting next week.';
        }
        if(choice.transfer && item.targetId)transfers.push({from:site,to:item.targetId,goods:choice.transfer});
        event(choice.name+' in '+site.name+'. '+choice.story+' '+result+followup,site,'council');
        return false;
      });
    }
    function settleResidents(turn,site,event){
      if(root.EarthShifts && (site.shift || site.shiftFollowUps?.length)){
        const result=root.EarthShifts.tick(site,turn.week);
        if(site.shift && !result.shift)root.EarthConstruction?.releaseFromShift?.(site,site.shift);
        site.shift=result.shift;site.shiftFollowUps=result.followUps;
        for(const item of result.events){applyShiftResult(site,item,false);event(item.message,site);}
      }
      if(root.EarthNeighbours)for(const note of root.EarthNeighbours.tick(turn,site) || [])event(note,site);
    }
    function settleHouseholds(turn,site,report,event){
      const production=report.production;
      if(root.EarthStrategy)for(const note of root.EarthStrategy.protect(site,production) || [])event(note,site);
      const shortage=site.food+production.food<0;
      apply(site,production);
      if(shortage)event(site.name+' ran short of food. '+outcome(apply(site,{wellbeing:-3,trust:-1})),site);
      if((turn.week-site.founded)%3!==0 || site.food<9 || site.trust<50)return;
      const room=Math.max(0,capacity(site)-site.population);
      const growth=Math.min(2,room);
      if(growth && (site.buildings.length || report.developedPrecincts)){
        site.population+=growth;
        event((growth===1?'One resident settled':'Two residents settled')+' in '+site.name+'. Its weekly food need is now '+Math.ceil(site.population/5)+'.',site);
      }
    }
    // This same transition runs on a detached snapshot for the forecast.
    // Close last week's decisions before new income. Deliver goods due this
    // week before assessing hunger. Dispatch only the uncommitted surplus.
    function rollWeek(turn){
      const events=[],transfers=[];
      const byId=new Map(turn.sites.map(site=>[site.id,site]));
      const metrics=METRICS;
      const opening=new Map(),reports=new Map();
      for(const site of turn.sites){
        opening.set(site.id,Object.fromEntries(metrics.map(k=>[k,site[k]])));
        reports.set(site.id,{id:site.id,name:site.name,production:{},forecast:'',
          promises:[],council:[],arrivals:[],departures:[],highlights:[],closing:{},delta:{}});
      }
      function event(text,site,type,logged=true){
        const report=reports.get(site.id);
        report.highlights.push(text);
        if(type)report[type].push(text);
        events.push({site,text,type,logged});
      }
      turn.week++;turn.effort=MAX_EFFORT;
      // A chair may cast the outgoing week's last ballot using the resources then in hand.
      const closingVotes=new Map();
      for(const site of turn.sites)closeDeadlines(turn,site,event,closingVotes);
      for(const site of turn.sites){
        const previousExcess=Math.max(0,site.population-capacity(site));
        const city=root.EarthCityModel?.weekly(site,turn);
        const report=reports.get(site.id);
        const cityView=root.EarthCityModel?.overview(site),recurring=cityView?.weekly;
        report.workforce=root.EarthConstruction?.weeklyAdjustment(site,turn)||{};
        report.production=rates(site,recurring,turn,report.workforce);
        if(city && recurring){
          report.cityOneOff=rateDifference(recurring,city.delta);
          apply(site,report.cityOneOff);
        }
        report.housingCapacity=cityView?.capacity ?? 18;
        report.developedPrecincts=cityView?.developed ?? 0;
        report.crowding=cityView?.crowding || null;
        report.forecast=summary(report.production)+' per week';
        for(const note of city?.notes || [])event(note,site);
        if(report.crowding?.excess){
          const {excess,capacity,wellbeing}=report.crowding;
          const note=excess+' '+(excess===1?'resident shares':'residents share')+' housing beyond its capacity of '+capacity+'. Crowding contributes '+signed(wellbeing)+' wellbeing this week.';
          report.forecast+=' '+note;
          event(note,site);
        }else if(previousExcess && report.crowding){
          event('Housing now has room for all '+site.population+' residents. The weekly crowding cost has ended.',site);
        }
      }
      const inbound=receiveCargo(turn,byId,event);
      for(const site of turn.sites){
        settleCouncil(turn,site,transfers,event);
        settleResidents(turn,site,event);
      }
      for(const transfer of transfers){
        const dest=byId.get(transfer.to);
        if(dest)event('The council shipment from '+transfer.from.name+' reached '+dest.name+'. '+outcome(apply(dest,transfer.goods)),dest,'arrivals');
      }
      if(root.EarthPartners)for(const item of root.EarthPartners.tick(turn,{apply}) || []){
        const site=byId.get(item.siteId);if(site)event(item.text,site,item.type);
      }
      for(const site of turn.sites)settleHouseholds(turn,site,reports.get(site.id),event);
      dispatchCargo(turn,byId,inbound,event);
      for(const site of turn.sites){
        if(!site.issue && (turn.week-site.founded-1)%4===0 && turn.week>site.founded){
          openIssue(turn,site);
          event('Council opened “'+site.issue.title+'”. Vote by the end of week '+site.issue.deadline+'.',site,'council');
        }
        if(root.EarthStrategy)for(const note of root.EarthStrategy.tick(turn,site) || [])event(note,site);
        if(root.EarthCampaigns)for(const note of root.EarthCampaigns.tick(turn,site,{apply,bond}) || [])event(note,site);
      }
      if(root.EarthLegacy)for(const item of root.EarthLegacy.tick(turn,{vote:(site,slot)=>successorVote(turn,site,slot),closingVote:site=>closingVotes.get(site.id),travelTime}) || []){
        if(byId.has(item.site?.id))event(item.text,item.site,'council');
      }
      const ratified=ratify(turn);
      if(ratified)event(ratified,turn.sites.find(s=>s.tech.includes('stewardship')),'council');
      if(root.EarthGoals)for(const result of root.EarthGoals.tick(turn)){
        const site=byId.get(result.siteId);
        if(site)event(result.text,site);
      }
      for(const site of turn.sites){
        const report=reports.get(site.id),before=opening.get(site.id);
        for(const p of site.residents)if(p.promise?.dueWeek===turn.week)report.promises.push(p.name+' is due '+resources(promiseBalance(p))+' by the end of week '+turn.week+(p.promise.revised?' under the revised agreement.':'.'));
        if(site.issue?.deadline===turn.week)report.council.push('Final week to vote on “'+site.issue.title+'”.');
        for(const k of metrics){report.closing[k]=site[k];report.delta[k]=site[k]-before[k];}
      }
      return {week:turn.week,sites:Array.from(reports.values()),highlights:events.map(e=>e.text),events,ratified};
    }
    function forecastNext(){
      const copy=JSON.parse(JSON.stringify({...world,lastWeekReview:null}));
      const {events,...forecast}=rollWeek(copy);
      return forecast;
    }
    function weekReview(report){
      const stories=new Map(report.sites.map(s=>[s.id,[]]));
      for(const e of report.events)stories.get(e.site.id).push(e);
      const priority=e=>e.text===report.ratified?0:({promises:1,council:2,arrivals:4,departures:5})[e.type] || 3;
      const sites=report.sites.map(s=>{
        const messages=stories.get(s.id);
        messages.sort((a,b)=>priority(a)-priority(b));
        return {id:s.id,name:s.name,closing:{...s.closing},delta:{...s.delta},highlights:[],
          totalEvents:messages.length,arrivals:s.arrivals.length,departures:s.departures.length};
      });
      const focus=sites.find(site=>site.id===world.activeId);
      const order=focus?[focus,...sites.filter(site=>site!==focus)]:sites;
      let saved=0;
      // Offer each place one story before adding a second to any place.
      for(let depth=0;depth<4 && saved<REVIEW_STORIES;depth++){
        for(const site of order){
          const message=stories.get(site.id)[depth]?.text;
          if(message){
            site.highlights.push(message.length>360?message.slice(0,359)+'…':message);
            if(++saved===REVIEW_STORIES)break;
          }
        }
      }
      const totalEvents=sites.reduce((sum,s)=>sum+s.totalEvents,0);
      return {week:report.week,sites,totalEvents,omittedEvents:totalEvents-saved};
    }
    function advance(reportOptions){
      if(!current())return reject('Found your first settlement on the globe.');
      const report=rollWeek(world);
      for(const e of report.events)if(e.logged)record(e.text,e.site);
      world.lastWeekReview=weekReview(report);
      const local=report.sites.find(s=>s.id===world.activeId);
      const text='Week '+world.week+' began. '+(local.highlights[0] || report.highlights[0] || 'Local production and household needs have been settled.');
      const result=complete(report.ratified && !text.includes(report.ratified)?text+' '+report.ratified:text,current(),false);
      if(result.ok && reportOptions?.includeHighlights){
        result.highlights=report.sites.flatMap(site=>site.highlights.map(note=>site.name+' · '+note));
      }
      return result;
    }
    function forecast(siteId=world.activeId){
      const site=world.sites.find(s=>s.id===siteId);
      return site?summary(rates(site,undefined,world))+' per week':'';
    }
    function overview(){
      const s=current();
      if(!s)return {objective:'Select a place on Earth and found your first community.',era:'Earth',chapter:'First landing',forecast:'',charter:null};
      const tech=TECH[s.tech.length],charter=CHARTERS[world.charter];
      let objective;
      if(world.completed)objective='Your charter has been ratified. Continue shaping the world.';
      else if(!s.residents.some(p=>p.heard))objective='Meet a resident and listen to what they need.';
      else if(!s.stats.kept){
        const p=s.residents.filter(r=>r.promise).sort((a,b)=>a.promise.dueWeek-b.promise.dueWeek)[0];
        objective=p?'Keep your promise to '+p.name+' by the end of week '+p.promise.dueWeek+'. Deliver '+resources(promiseBalance(p))+' or open a '+BUILDINGS[PROFILES[p.slot].alternative].name.toLowerCase()+'.':
          'Make a promise to a resident, then deliver it before its deadline.';
      }
      else if(!world.charter)objective='Choose in Council how this network will measure a life well lived.';
      else if(tech){
        const a=actionsAndRules('research')[0];
        objective=tech.name+': '+(a.available?'ready to research.':a.reason);
      }else objective=charter.text;
      return {objective,era:s.era,housingCapacity:capacity(s),chapter:world.completed?'Charter ratified':charter?charter.name:'Founding years',forecast:forecast(s.id),charter:charter?{...charter,met:charterMet()}:null};
    }
    function worksiteLoadIssue(site){
      if(!site?.construction?.length)return '';
      const needsCity=site.construction.some(job=>job.scope==='city'&&!job.paused);
      const needsDismantling=site.construction.some(job=>job.kind==='dismantle'&&!job.paused);
      if(!root.EarthConstruction || needsCity && !root.EarthCityModel?.finish || needsDismantling && !root.EarthDismantling?.finish)
        return 'Part of this district could not load. Reload the game to resume its saved work.';
      return '';
    }
    function constructionView(siteId=world.activeId){
      const site=world.sites.find(candidate=>candidate.id===siteId);
      if(!site||!root.EarthConstruction)return {jobs:[],workers:[],roster:[]};
      const report=root.EarthConstruction.view(site,world);
      const issue=worksiteLoadIssue(site);
      if(issue)report.jobs=report.jobs.map(job=>({...job,status:'Waiting for reload',loadIssue:issue,workRate:0,etaSeconds:null,activeWorkerIds:[]}));
      return {...report,roster:report.workers};
    }
    function openWorksite(site,job){
      if(job.scope==='city'){
        const result=root.EarthCityModel?.finish(site,job,world);
        if(result?.message)record(result.message,site);
        return result?.message || '';
      }
      if(job.kind==='dismantle'){
        const result=root.EarthDismantling.finish(site,job,world);
        if(result.ok)record(result.message,site);
        return result.ok?result.message:'';
      }
      const partners=site.residents.filter(person=>person.promise && PROFILES[person.slot].alternative===job.kind);
      const name=BUILDINGS[job.kind].name;
      site.buildings.push({id:job.id,kind:job.kind,plot:job.plot,name,partners:partners.map(person=>person.id)});
      let story=name+' opened on lot '+(job.plot+1)+'.';
      for(const person of partners)story+=' '+fulfilled(site,person,'The completed project met the need they raised.');
      record(story,site);
      return story;
    }
    function workConstruction(seconds,through){
      const domain=root.EarthConstruction;
      if(!domain || !Number.isFinite(seconds) || seconds<=0 || seconds>3600)return reject('Choose a valid period of construction time.');
      if(through!==undefined){
        if(!Number.isSafeInteger(through)||through<=0)return reject('Invalid construction clock.');
        // Two visible tabs may cover the same time span. Only the uncredited portion counts.
        const previous=world.constructionThrough || 0;
        // A suspended tab or a Web Lock can deliver an old tick several seconds late.
        // Rebase only when the device's actual clock is now behind the saved watermark.
        const now=Date.now();
        const resetClock=previous>now+5000 && Math.abs(through-now)<5000;
        if(!resetClock)seconds=Math.min(seconds,Math.max(0,(through-previous)/1000));
      }
      const completed=[],messages=[];
      let changed=false;
      // A rehearsal can cover several sites in one call. Settle each second in
      // play order so visits, new workplaces and journal entries match live play.
      let remaining=Math.round(seconds*1000);
      while(remaining>0){
        const slice=Math.min(1000,remaining);
        const startingCount=completed.length;
        let active=false;
        for(const site of world.sites){
          // A partially loaded page must not detach a finished job without the
          // domain that delivers its precinct or salvage. Other districts can run.
          if(worksiteLoadIssue(site))continue;
          const step=domain.advance(site,world,slice/1000,job=>{
            const message=openWorksite(site,job);
            completed.push({...job,siteId:site.id,message});
            if(message)messages.push(message);
          });
          active ||= step.changed;
        }
        if(!active)break;
        changed=true;
        if(completed.length>startingCount){
          const victory=ratify(world);
          if(victory){record(victory);messages.push(victory);}
        }
        remaining-=slice;
      }
      if(changed || completed.length){
        if(through!==undefined)world.constructionThrough=through;
        const collision=save({construction:true,completed});
        if(collision)return collision;
      }
      return {ok:true,changed,completed,message:messages.join(' ')};
    }
    function setWorkPreference(residentId,preference,jobId){
      const site=current(),domain=root.EarthConstruction;
      if(!site || !domain)return reject('Choose an active community.');
      const result=domain.setPreference(site,world,residentId,preference,jobId);
      return result.ok?complete(result.message,site):result;
    }
    function setConstructionPaused(jobId,paused){
      const site=current(),domain=root.EarthConstruction;
      if(!site || !domain?.setPaused)return reject('Choose a current worksite.');
      const result=domain.setPaused(site,world,jobId,paused);
      return result.ok && !result.unchanged?complete(result.message,site):result;
    }
    function assignBuilders(residentIds,jobId){
      const site=current(),domain=root.EarthConstruction;
      if(!site || !domain || !Array.isArray(residentIds) || !residentIds.length ||
        residentIds.length>site.residents.length || !unique(residentIds) ||
        !residentIds.every(id=>site.residents.some(person=>person.id===id)))return reject('Choose residents from this community first.');
      const job=site.construction?.find(item=>item.id===jobId);
      if(!job)return reject('That worksite has closed. Choose a current project.');
      if(job.paused)return reject('Resume work at this site before inviting builders.');
      for(const id of residentIds)domain.setPreference(site,world,id,'build',jobId);
      const roster=domain.view(site,world).workers.filter(w=>residentIds.includes(w.residentId));
      const ready=roster.filter(w=>w.jobId===jobId).map(w=>w.name);
      const busy=roster.filter(w=>w.jobId!==jobId).map(w=>w.name+' will join when free. '+w.reason);
      const message=(ready.length?ready.join(' and ')+' assigned to '+job.name.toLowerCase()+'. ':'')+busy.join(' ');
      return complete(message.trim(),site);
    }
    function previewCancelConstruction(jobId){
      const site=current(),job=site?.construction?.find(item=>item.id===jobId);
      if(!job)return {ok:false,available:false,reason:'This worksite has already closed.'};
      if(!root.EarthConstruction || job.scope==='city' && !root.EarthCityModel || job.kind==='dismantle' && !root.EarthDismantling)
        return {ok:false,available:false,reason:'Reload the game to manage this saved worksite.'};
      if(job.scope==='city'){
        const plan=root.EarthCityModel.preview(site,world,job.precinct,'cancel');
        return {...plan,refund:plan.recovery,effort:plan.cost?.effort||0,label:job.name,text:plan.forecast||plan.reason||''};
      }
      if(job.kind==='dismantle'){
        const available=root.EarthDismantling.canCancel(site,job);
        const reason=job.paused?'This partly dismantled building will remain here until you resume work.':'Dismantling has begun. Choose Pause work to keep the lot as it is, or let the crew finish clearing it.';
        return {ok:true,available,reason:available?'':reason,refund:{funds:0,materials:0},effort:0,label:job.name,
          text:available?'Withdraw the order to reopen the original '+job.original.name.toLowerCase()+'. The organising effort has been spent.':reason};
      }
      const remaining=1-clamp(job.work/job.total,0,1);
      const refund=Object.fromEntries(['funds','materials'].map(key=>[key,Math.floor(job.paid[key]*remaining)]));
      return {ok:true,available:true,refund,effort:0,label:job.name,
        text:'Release the workers and clear lot '+(job.plot+1)+'. Recover '+refund.funds+' funds and '+refund.materials+' materials. The effort used to organise the job has been spent.'};
    }
    function cancelConstruction(jobId,quotedRefund){
      const plan=previewCancelConstruction(jobId);
      if(!plan.available)return reject(plan.reason);
      if(quotedRefund && ['funds','materials'].some(key=>(plan.refund[key]||0)<(quotedRefund[key]||0)))
        return reject('The crew used more supplies before this request arrived. Review the updated refund and confirm again.');
      const site=current(),job=site.construction.find(item=>item.id===jobId);
      if(job.scope==='city')return planCity(job.precinct,'cancel',job.id);
      if(job.kind==='dismantle'){
        const result=root.EarthDismantling.cancel(site,job,world);
        return result.ok?complete(result.message,site):result;
      }
      root.EarthConstruction.cancel(site,jobId);
      apply(site,plan.refund);
      return complete('Cancelled '+job.name.toLowerCase()+' on lot '+(job.plot+1)+'. Recovered '+plan.refund.funds+' funds and '+plan.refund.materials+' materials.',site);
    }
    function planCity(precinctId,projectId,expectedJobId){
      const site=current(),model=root.EarthCityModel;
      if(!site || !model)return reject('City planning is unavailable here.');
      if(projectId==='cancel' && expectedJobId!==undefined && site.city?.precincts?.[precinctId]?.jobId!==expectedJobId)
        return reject('The project here has changed. Inspect the current worksite before cancelling.');
      const plan=model.preview(site,world,precinctId,projectId);
      if(!plan.ok || !plan.available)return reject(plan.reason || 'This project cannot begin here.');
      const result=model.apply(site,world,precinctId,projectId);
      return result.ok?complete(result.message,site):reject(result.message);
    }
    function beginGoal(siteId,aimKey,guardKey,weeks){
      const site=world.sites.find(s=>s.id===siteId);
      if(!site || !root.EarthGoals)return reject('Choose a settlement before setting a goal.');
      const result=root.EarthGoals.start(world,siteId,aimKey,guardKey,weeks);
      return result.ok?complete(result.message,site):reject(result.message);
    }
    const commands={
      planCity:guarded(planCity),beginGoal:guarded(beginGoal),workConstruction:guarded(workConstruction),
      setWorkPreference:guarded(setWorkPreference),setConstructionPaused:guarded(setConstructionPaused),assignBuilders:guarded(assignBuilders),cancelConstruction:guarded(cancelConstruction),
      fish:guarded(fish),manageSite:guarded(manageSite),found:guarded(found),visit:guarded(visit),act:guarded(act),advance:guarded(advance),
      beginShift:guarded(id=>shiftCommand('start',id)),arriveShift:guarded(id=>shiftCommand('arrive',id)),
      chooseShift:guarded(id=>shiftCommand('choose',id)),finishShift:guarded(actor=>shiftCommand('finish',actor)),
      beginVoyage:guarded(beginVoyage),sail:guarded(sail),reclaim:guarded(reclaim),
      reset:guarded(()=>{world=blank();return save() || {ok:true,message:'A new world is ready.'};},true)
    };
    // The async entry point also serializes commits between browser tabs with
    // the Web Locks API. The direct commands retain synchronous compatibility.
    async function perform(command,...args){
      if(!Object.hasOwn(commands,command))return reject('Unknown game action.');
      const expected=actionGeneration;
      function run(){return expected!==actionGeneration?reject(conflict):commands[command](...args);}
      if(!storage||!root.navigator?.locks?.request)return run();
      let entered=false;
      try{return await root.navigator.locks.request('civic-world:'+key,()=>{entered=true;return run();});}
      catch(error){
        if(!entered && (error?.name==='SecurityError' || error?.name==='NotSupportedError'))return run();
        throw error;
      }
    }
    return {
      ...commands,get state(){return world;},get saveIssue(){return saveIssue;},get saveMessage(){return saveMessage;},get hasUnsavedChoice(){return unsavedAction;},get hasDiverged(){return diverged;},
      active:current,fishingOffer,constructionView,worksiteLoadIssue,previewCancelConstruction,lastWeek:()=>world.lastWeekReview,actions,overview,foundingOffer,sponsorshipOffer,previewBuild,previewReclaim,forecast,forecastNext,perform,sync,
      subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
      destroy(){closed=true;listeners.clear();if(root.removeEventListener)root.removeEventListener('storage',onStorage);}
    };
  }
  root.CommonEarthSim={create,waterfront,readSave,marketPlan,productiveLinks,practices,charterFacts,mandates:MANDATES,buildings:BUILDINGS,charters:CHARTERS,maxEffort:MAX_EFFORT};
})(typeof window==='undefined'?globalThis:window);
