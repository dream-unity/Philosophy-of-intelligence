/* Common Earth district planning. Rules run without a DOM, including when the
   simulation advances a cloned world for a forecast. */
(() => {
  'use strict';

  const DIRECTIONS = ['North', 'Northeast', 'Southeast', 'South', 'Southwest', 'Northwest'];
  const TERRAINS = [
    {id:'field', land:'Orchard End', sea:'Kelp Reach', label:'Productive ground', marine:'Growing shallows', minutes:18,
      note:'Food growers can harvest an extra basket here every week.'},
    {id:'ridge', land:'Ridge Walk', sea:'Outer Break', label:'Remote edge', marine:'Outer moorings', minutes:24,
      note:'This is the longest trip to the centre. A local transit stop reaches both neighbouring precincts.'},
    {id:'crossing', land:'Crossroads', sea:'Ferry Gate', label:'Transport crossing', marine:'Ferry crossing', minutes:10,
      note:'A market here earns an extra fund from passing trade.'},
    {id:'shelter', land:'Lantern Court', sea:'Lantern Cove', label:'Sheltered site', marine:'Sheltered moorings', minutes:15,
      note:'A courtyard here shelters eight additional residents. Other sites shelter six.'},
    {id:'yard', land:'The Sidings', sea:'Repair Dock', label:'Freight access', marine:'Freight berth', minutes:12,
      note:'A fabrication yard can take larger deliveries here and recover an extra material each week.'},
    {id:'wet', land:'Reedbank', sea:'Tidal Garden', label:'Water-sensitive ground', marine:'Tidal habitat', minutes:21,
      note:'A water garden here grows two food each week. Industry here disturbs the water unless a neighbouring water garden buffers it.'}
  ];
  const USES = {
    open:{name:'Common ground', afloat:'Open deck', category:'Public land', icon:'open', color:'#72957a',
      funds:0, materials:0, effort:1, turns:1, people:'Neighbours who want to decide on a different use.', purpose:'Reopen this precinct and recover one material after work finishes.'},
    homes:{name:'Courtyard homes', afloat:'Floating courtyards', category:'Housing', icon:'home', color:'#d1a278',
      funds:7, materials:4, effort:2, turns:2, people:'Households seeking a stable home near work and services.', purpose:'Adds room for six residents, or eight on sheltered ground. Protected homes beside a market prevent pressure on local rents.'},
    food:{name:'Food cooperative', afloat:'Sea farm', category:'Food', icon:'food', color:'#abc980',
      funds:4, materials:3, effort:1, turns:1, people:'Households relying on the community pantry.', purpose:'Produces two food each week. Productive ground and a neighbouring water garden each add one.'},
    yard:{name:'Fabrication yard', afloat:'Repair pontoons', category:'Industry', icon:'yard', color:'#ba9278',
      funds:6, materials:3, effort:2, turns:2, people:'Apprentices and residents who maintain shared equipment.', purpose:'Produces two materials each week, plus one at a freight site. Nearby homes can lose wellbeing from noise.'},
    market:{name:'Market exchange', afloat:'Floating exchange', category:'Trade', icon:'market', color:'#e1b66d',
      funds:6, materials:3, effort:2, turns:1, people:'Small traders, customers and households on fixed incomes.', purpose:'Earns three funds each week, plus passing trade, and opens demand for another full-yield shop in the central district. Nearby homes, services or a central hall protect residents from rent pressure.'},
    transit:{name:'Transit cooperative', afloat:'Ferry cooperative', category:'Mobility', icon:'transit', color:'#83beb9',
      funds:6, materials:3, effort:2, turns:2, people:'Residents who lose part of each day travelling to work or care.', purpose:'Reduces journeys in this precinct and both neighbours by nine minutes. A connected market earns an extra fund.'},
    care:{name:'Neighbourhood services', afloat:'Community services deck', category:'Care', icon:'care', color:'#c9b6cb',
      funds:5, materials:2, effort:1, turns:1, people:'Carers, children and residents who struggle to reach services.', purpose:'Adds one wellbeing per week, or two within a twelve-minute trip. It also protects neighbouring markets from rent pressure.'},
    water:{name:'Water garden', afloat:'Living breakwater', category:'Ecology', icon:'water', color:'#88b6a3',
      funds:4, materials:3, effort:1, turns:1, people:'Residents downstream, food growers and those living beside workshops.', purpose:'Produces one food, or two on water-sensitive sites. Buffers nearby industry and improves neighbouring food cooperatives.'}
  };
  const BUILD_OPTIONS = ['homes','food','yard','market','transit','care','water','open'];
  const ZERO = {food:0, funds:0, materials:0, wellbeing:0, trust:0};
  const numbers = Object.keys(ZERO);
  const isUse = use => Object.prototype.hasOwnProperty.call(USES,use);
  const ring = i => [(i+5)%6, (i+1)%6];
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const grant = (total,delta) => { for(const k of numbers)total[k]+=(delta[k] || 0); };
  const nameOf = (site,use) => site.water ? USES[use].afloat : USES[use].name;
  function identity(site) {
    const a=Math.round((Number(site.lat)||0)*100),b=Math.round((Number(site.lon)||0)*100);
    return ((Math.imul(a+9001,2654435761)^Math.imul(b+18001,1597334677))>>>0);
  }
  function terrainAt(site, i) {
    const seed=identity(site);
    const orientation=(seed>>>4)%6, dir=(seed&1)?1:-1;
    return TERRAINS[(orientation+i*dir+6)%6];
  }
  function cleanPrecinct(raw) {
    const use=isUse(raw?.use) ? raw.use : 'open';
    const target=isUse(raw?.target) && raw.target!==use ? raw.target : null;
    if(!target)return {use,target:null,turns:0};
    const tracked=typeof raw.jobId==='string' && raw.jobId.length>0;
    const turns=clamp(Number.isInteger(raw.turns)?raw.turns:USES[target].turns,tracked?0:1,USES[target].turns);
    return tracked?{use,target,turns,jobId:raw.jobId,laborReady:raw.laborReady===true}:{use,target,turns};
  }
  function precincts(site) {
    const source=site?.city?.precincts;
    return Array.from({length:6},(_,i)=>cleanPrecinct(source?.[i]));
  }
  function valid(city) {
    if(city===undefined || city===null)return true;
    if(city.version!==1 || !Array.isArray(city.precincts) || city.precincts.length!==6)return false;
    if(city.serial!==undefined && (!Number.isSafeInteger(city.serial)||city.serial<0))return false;
    let working=0;
    const jobIds=new Set();
    for(const p of city.precincts) {
      if(!p || !isUse(p.use))return false;
      if(p.target===null){ if(p.turns!==0 || p.jobId!=null || p.laborReady!=null)return false; continue; }
      const tracked=p.jobId!==undefined;
      if(tracked){
        if(typeof p.jobId!=='string' || !p.jobId || p.jobId.length>180 || jobIds.has(p.jobId) || typeof p.laborReady!=='boolean')return false;
        jobIds.add(p.jobId);
      }else if(p.laborReady!==undefined)return false;
      if(!isUse(p.target) || p.target===p.use || !Number.isInteger(p.turns) || p.turns<(tracked?0:1) || p.turns>USES[p.target].turns || p.laborReady && !p.turns)return false;
      working++;
    }
    return working<=2;
  }
  function normalise(site) {
    if(!site || typeof site!=='object')return;
    site.city={version:1,serial:site.city?.serial||0,precincts:precincts(site)};
  }
  function marketCatchments(site) {
    let count=0;
    for(let i=0;i<6;i++)if(site?.city?.precincts?.[i]?.use==='market')count++;
    return count;
  }
  const precinctBeds=(site,i)=>terrainAt(site,i).id==='shelter'?8:6;
  function housingCapacity(site) {
    if(site?.housing&&window.EarthHousing)return window.EarthHousing.summary(site).capacity;
    let capacity=18+(window.EarthResidentShops?.housingPlaces?.(site)||0)+(window.EarthDistrictGrowth?.housingPlaces?.(site)||0);
    for(let i=0;i<6;i++){
      if(site?.city?.precincts?.[i]?.use==='homes')capacity+=terrainAt(site,i).id==='shelter'?8:6;
    }
    return capacity;
  }
  function overview(site, state = precincts(site)) {
    const weekly={...ZERO}, records=[];
    const centralHall=(site?.buildings||[]).some(b=>b.kind==='hall');
    let reachable=0,pressure=0,noise=0,capacity=18+(window.EarthResidentShops?.housingPlaces?.(site)||0)+(window.EarthDistrictGrowth?.housingPlaces?.(site)||0),developed=0;
    if(site?.housing&&window.EarthHousing)capacity=window.EarthHousing.dwellings(site,[]).reduce((n,t)=>n+t.beds,0);
    state.forEach((p,i)=>{
      const around=ring(i), neighbours=around.map(j=>state[j].use), t=terrainAt(site,i);
      const transit=p.use==='transit' || neighbours.includes('transit');
      const minutes=Math.max(5,t.minutes-(transit?9:0)), accessible=minutes<=15;
      const deltas={...ZERO}, reasons=[];
      let rent=false,disturbed=false,beds=0;
      if(accessible)reachable++;
      if(p.use!=='open')developed++;
      if(p.use==='homes') {
        beds=t.id==='shelter'?8:6;capacity+=beds;
        if(accessible){deltas.wellbeing++;reasons.push('Homes within a fifteen-minute trip add one wellbeing.');}
        if(neighbours.includes('yard') && !neighbours.includes('water')) {
          deltas.wellbeing--;disturbed=true;noise++;reasons.push('Neighbours report workshop noise. An adjoining water garden can buffer their homes.');
        }
      } else if(p.use==='food') {
        deltas.food=2+(t.id==='field'?1:0)+(neighbours.includes('water')?1:0);
        if(t.id==='field')reasons.push('Productive ground adds one food.');
        if(neighbours.includes('water'))reasons.push('An adjoining water garden adds one food.');
      } else if(p.use==='yard') {
        deltas.materials=2+(t.id==='yard'?1:0);
        if(t.id==='yard')reasons.push('Freight access adds one material.');
        if(t.id==='wet' && !neighbours.includes('water')) {deltas.wellbeing--;disturbed=true;noise++;reasons.push('Unbuffered work on water-sensitive ground costs one wellbeing.');}
      } else if(p.use==='market') {
        deltas.funds=3+(t.id==='crossing'?1:0)+(transit?1:0);
        if(t.id==='crossing')reasons.push('Passing trade adds one fund.');
        if(transit)reasons.push('The shared transit link adds one fund.');
        if(!centralHall&&!neighbours.includes('homes')&&!neighbours.includes('care')){
          rent=true;pressure++;deltas.trust--;reasons.push('Traders are bidding up rents. Trust falls by one each week until protection is in place.');
        } else reasons.push('Nearby protection keeps the benefits of the exchange in the community.');
      } else if(p.use==='water') {
        deltas.food=t.id==='wet'?2:1;
        if(t.id==='wet')reasons.push('Water-sensitive ground adds one food.');
      } else if(p.use==='care') {
        deltas.wellbeing=minutes<=12?2:1;
        if(minutes<=12)reasons.push('A trip of twelve minutes or less gives more households access to services.');
      } else if(p.use==='transit') {
        reasons.push('This stop serves both adjoining precincts. Overlapping transit stops share a route.');
      }
      grant(weekly,deltas);
      records.push({id:i,terrain:t,minutes,accessible,transit,pressure:rent,disturbed,beds,yields:deltas,reasons,
        name:site.water?t.sea:t.land,type:site.water?t.marine:t.label,direction:DIRECTIONS[i],use:p.use,target:p.target,turns:p.turns,jobId:p.jobId,laborReady:p.laborReady===true});
    });
    const residents=site.population||0,excess=Math.max(0,residents-capacity);
    const crowding={residents,capacity,excess,wellbeing:excess?-Math.min(2,Math.ceil(excess/4)):0};
    weekly.wellbeing+=crowding.wellbeing;
    return {weekly,records,capacity,crowding,reachable,pressure,noise,developed,marketCatchments:state.filter(p=>p.use==='market').length,works:state.filter(p=>p.target).length};
  }
  const units = {food:'food',funds:'funds',materials:'materials',wellbeing:'wellbeing',trust:'trust'};
  function difference(a,b) {
    const d={};for(const key of numbers){const v=a[key]-b[key];if(v)d[key]=v;}return d;
  }
  function flows(obj) {
    return numbers.filter(k=>obj?.[k]).map(k=>(obj[k]>0?'+':'')+obj[k]+' '+units[k]).join(' · ');
  }
  const noProjectNumber='This district has exhausted its project numbers.';
  function jobSpec(site,index,project,legacy=false){
    const {funds,materials}=USES[project],serial=legacy?'legacy':(site.city?.serial||0)+1;
    if(!legacy&&!Number.isSafeInteger(serial))return null;
    return {id:'city:'+String(site.id).slice(0,120)+':'+index+':'+project+':'+serial,scope:'city',precinct:index,kind:project,
      name:nameOf(site,project),paid:{funds,materials}};
  }
  function previewCrew(site,world,index,project){
    const spec=jobSpec(site,index,project);
    if(!spec)return {ok:false,reason:noProjectNumber};
    const cost=spec.paid;
    const afterPaying={...site,funds:site.funds-cost.funds,materials:site.materials-cost.materials};
    return window.EarthConstruction?.preview(afterPaying,world,spec,site);
  }
  function book(site,world,index,project,workFraction=0,legacy=false){
    const spec=jobSpec(site,index,project,legacy);
    if(!spec)return {ok:false,message:noProjectNumber};
    const built=window.EarthConstruction?.start(site,world,{...spec,workFraction});
    if(!built?.ok)return {ok:false,message:built?.message||built?.reason||'The construction roster is unavailable.'};
    if(!legacy)site.city.serial=(site.city.serial||0)+1;
    const row=site.city.precincts[index];
    row.target=project;row.jobId=spec.id;row.laborReady=false;
    return {ok:true};
  }
  function migrateWork(site,world){
    if(!site?.city || !window.EarthConstruction)return true;
    for(const [i,p] of site.city.precincts.entries()){
      if(!p.target || p.jobId)continue;
      const fraction=1-p.turns/USES[p.target].turns;
      // Paid legacy orders need no new project number, even in an imported
      // city whose counter has already reached the largest exact integer.
      if(!book(site,world,i,p.target,fraction,true).ok)return false;
    }
    return true;
  }
  function validWork(site,jobs=[]){
    if(!Array.isArray(jobs))return false;
    const active=jobs.filter(j=>j.scope==='city');
    const pending=precincts(site).map((p,index)=>({...p,index})).filter(p=>p.target);
    if(pending.some(p=>!p.jobId))return false;
    const orders=pending.filter(p=>!p.laborReady);
    return active.length===orders.length && orders.every(p=>active.some(j=>j.id===p.jobId && j.precinct===p.index && j.kind===p.target));
  }
  function terms(site,world,index,project,state=precincts(site)) {
    const bad=reason=>({ok:false,available:false,reason});
    if(!site)return bad('Found a community first.');
    if(!Number.isInteger(index)||index<0||index>5)return bad('Choose one of the six outer precincts.');
    const p=state[index];
    if(project==='cancel') {
      if(!p.target)return bad('There is no construction to cancel here.');
      const target=USES[p.target];
      return {ok:true,available:true,reason:'',cancel:true,cost:{effort:0,funds:0,materials:0},turns:0,
        title:'Cancel construction',recovery:{funds:Math.floor(target.funds/2),materials:Math.floor(target.materials/2)},
        forecast:'The current use continues. Half the original funds and materials are recovered, rounded down. Work already done and the original effort are lost.'};
    }
    if(!isUse(project))return bad('Choose a land use.');
    const spec=USES[project],cost={funds:spec.funds,materials:spec.materials,effort:spec.effort};
    if(p.target)return bad('A crew is already working here. Finish or cancel its job first.');
    if(p.use===project)return bad('This precinct already has that use.');
    let reason='';
    if(!Number.isSafeInteger((site.city?.serial||0)+1))reason=noProjectNumber;
    else if(state.filter(row=>row.target).length>=2)reason='Two precinct projects are already commissioned. Open or cancel one before starting another.';
    else if(world.effort<cost.effort)reason='Needs '+cost.effort+' effort. Advance the week to refresh it.';
    else if(site.funds<cost.funds || site.materials<cost.materials)reason='The treasury needs '+cost.funds+' funds and '+cost.materials+' materials for this project.';
    else if(!window.EarthConstruction)reason='The construction roster is unavailable.';
    return {ok:true,available:!reason,reason,cost,turns:spec.turns,title:nameOf(site,project),people:spec.people,
      week:(Number(world.week)||1)+spec.turns};
  }
  function preview(site,world,index,project,withCrew=false) {
    const state=precincts(site),quote=terms(site,world,index,project,state);
    if(!quote.ok || quote.cancel)return quote;
    const spec=USES[project],p=state[index],now=overview(site,state),record=now.records[index];
    // Compare the same opening week, including nearby work already commissioned.
    const baseline=state.map(row=>row.target && row.laborReady && row.turns<=spec.turns?{use:row.target,target:null,turns:0}:row);
    const concurrent=baseline.filter((row,i)=>row!==state[i]).length;
    const was=concurrent?overview(site,baseline):now;
    const afterState=baseline.map((x,i)=>i===index?{use:project,target:null,turns:0}:x);
    const after=overview(site,afterState),r=after.records[index];
    const rate=difference(after.weekly,was.weekly);
    const shopPlan=window.CommonEarthSim?.marketPlan;
    const localFunds=shopPlan ? shopPlan(site,{cityMarkets:after.marketCatchments}).totalFunds-shopPlan(site,{cityMarkets:was.marketCatchments}).totalFunds : 0;
    if(localFunds)rate.funds=(rate.funds||0)+localFunds;
    const beds=after.capacity-was.capacity, reach=after.reachable-was.reachable;
    const risk=after.pressure-was.pressure, noise=after.noise-was.noise;
    const scheduler=window.EarthConstruction;
    const staffing=withCrew && scheduler?previewCrew(site,world,index,project):null;
    const reason=quote.reason || (staffing && !staffing.ok?staffing.reason||'The construction roster is unavailable.':'');
    const capacityNote=beds?'Housing capacity '+was.capacity+' → '+after.capacity:'';
    let crowdingNote='';
    if(beds && (was.crowding.excess || after.crowding.excess)) {
      const gap=after.crowding.excess;
      crowdingNote=gap ? gap+' '+(gap===1?'resident would':'residents would')+' lack a housing place ('+after.crowding.wellbeing+' wellbeing per week from crowding).' :
        'All current residents would have a housing place. The weekly crowding cost would end.';
    }
    const accessNote=reach?'Precincts within 15 minutes '+was.reachable+' → '+after.reachable:'';
    const impact=[flows(rate)?flows(rate)+' per week':'',capacityNote,accessNote,crowdingNote].filter(Boolean);
    const forecast=impact.length?impact.join(' · '):'The weekly totals stay the same.';
    return {...quote,available:!reason,reason,old:nameOf(site,p.use),forecast,rate,beds,reach,risk,noise,localFunds,concurrent,capacityNote,accessNote,crowdingNote,
      record:r,siteName:record.name,purpose:spec.purpose,completedView:after,crew:staffing?.job||null};
  }
  function apply(site,world,index,project) {
    const p=preview(site,world,index,project);
    if(!p.ok||!p.available)return {ok:false,message:p.reason};
    normalise(site);
    const row=site.city.precincts[index],ground=terrainAt(site,index),name=site.water?ground.sea:ground.land;
    if(project==='cancel') {
      const work=nameOf(site,row.target);
      if(row.jobId && !row.laborReady)window.EarthConstruction?.cancel(site,row.jobId);
      site.city.precincts[index]={use:row.use,target:null,turns:0};
      site.funds+=p.recovery.funds;site.materials+=p.recovery.materials;
      return {ok:true,message:'Cancelled '+work.toLowerCase()+' at '+name+'. Recovered '+p.recovery.funds+' funds and '+p.recovery.materials+' materials.'};
    }
    const order=book(site,world,index,project);
    if(!order.ok)return order;
    world.effort-=p.cost.effort;site.funds-=p.cost.funds;site.materials-=p.cost.materials;
    row.turns=p.turns;
    return {ok:true,message:p.title+' commissioned at '+name+'. Opens once the crew finishes and week '+p.week+' begins. '+p.forecast};
  }
  function openPrecinct(site,i){
    const p=site.city.precincts[i],use=p.target,ground=terrainAt(site,i),place=site.water?ground.sea:ground.land;
    site.city.precincts[i]={use,target:null,turns:0};
    const material=use==='open'?1:0;
    const message=material?place+' reopened as common ground. One material was recovered.':nameOf(site,use)+' opened at '+place+'.';
    return {message,material};
  }
  function finish(site,job){
    const row=site?.city?.precincts?.[job?.precinct];
    if(job?.scope!=='city' || !row || row.jobId!==job.id || row.target!==job.kind || row.laborReady)return {ok:false};
    row.laborReady=true;
    if(row.turns>0)return {ok:true,opened:false,message:nameOf(site,row.target)+' crew work finished. Opens in '+row.turns+' more '+(row.turns===1?'week.':'weeks.')};
    const opened=openPrecinct(site,job.precinct);
    site.materials=clamp(site.materials+opened.material,0,Number.MAX_SAFE_INTEGER);
    return {ok:true,opened:true,message:opened.message,recovery:{materials:opened.material}};
  }
  function weekly(site) {
    normalise(site);
    const notes=[];let recovered=0;
    site.city.precincts.forEach((p,i)=>{
      if(!p.target || !p.jobId)return;
      p.turns=Math.max(0,p.turns-1);
      if(p.turns || !p.laborReady)return;
      const opened=openPrecinct(site,i);
      recovered+=opened.material;notes.push(opened.message);
    });
    const district=overview(site,site.city.precincts);
    const delta={...district.weekly};delta.materials+=recovered;
    return {delta,notes,district};
  }

  const Model=Object.freeze({valid,validWork,normalise,migrateWork,terms,preview,previewCrew,apply,finish,weekly,housingCapacity,precinctBeds,marketCatchments,overview,projects:USES,options:BUILD_OPTIONS,flows,nameOf});
  window.EarthCityModel=Model;
})();
