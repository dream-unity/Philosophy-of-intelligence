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
    const turns=target && Number.isFinite(raw.turns) ? clamp(Math.ceil(raw.turns),1,USES[target].turns) : 0;
    return {use,target:turns?target:null,turns};
  }
  function precincts(site) {
    const source=site?.city?.precincts;
    return Array.from({length:6},(_,i)=>cleanPrecinct(source?.[i]));
  }
  function valid(city) {
    if(city===undefined || city===null)return true;
    if(city.version!==1 || !Array.isArray(city.precincts) || city.precincts.length!==6)return false;
    let working=0;
    for(const p of city.precincts) {
      if(!p || !isUse(p.use))return false;
      if(p.target===null){ if(p.turns!==0)return false; continue; }
      if(!isUse(p.target) || p.target===p.use || !Number.isInteger(p.turns) || p.turns<1 || p.turns>USES[p.target].turns)return false;
      working++;
    }
    return working<=2;
  }
  function normalise(site) {
    if(!site || typeof site!=='object')return;
    site.city={version:1, precincts:precincts(site)};
  }
  function marketCatchments(site) { return precincts(site).filter(p=>p.use==='market').length; }
  function housingCapacity(site) {
    if(!site)return 18;
    return precincts(site).reduce((sum,p,i)=>sum+(p.use==='homes' ? (terrainAt(site,i).id==='shelter'?8:6) : 0),18);
  }
  function overview(site, state = precincts(site)) {
    const weekly={...ZERO}, records=[];
    const centralHall=(site?.buildings||[]).some(b=>b.kind==='hall');
    let reachable=0,pressure=0,noise=0,capacity=18,developed=0;
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
        name:site.water?t.sea:t.land,type:site.water?t.marine:t.label,direction:DIRECTIONS[i],use:p.use,target:p.target,turns:p.turns});
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
  function preview(site,world,index,project) {
    const bad=reason=>({ok:false,available:false,reason});
    if(!site)return bad('Found a community first.');
    if(!Number.isInteger(index)||index<0||index>5)return bad('Choose one of the six outer precincts.');
    const state=precincts(site),p=state[index],now=overview(site,state),record=now.records[index];
    if(project==='cancel') {
      if(!p.target)return bad('There is no construction to cancel here.');
      const target=USES[p.target];
      return {ok:true,available:true,reason:'',cancel:true,cost:{effort:0,funds:0,materials:0},turns:0,
        title:'Cancel construction',recovery:{funds:Math.floor(target.funds/2),materials:Math.floor(target.materials/2)},
        forecast:'The current use continues. Half the original funds and materials are recovered, rounded down.'};
    }
    if(!isUse(project))return bad('Choose a land use.');
    const spec=USES[project],cost={funds:spec.funds,materials:spec.materials,effort:spec.effort};
    if(p.target)return bad('A crew is already working here. Finish or cancel its job first.');
    if(p.use===project)return bad('This precinct already has that use.');
    // Compare the same opening week, including nearby work already commissioned.
    const baseline=state.map(row=>row.target && row.turns<=spec.turns?{use:row.target,target:null,turns:0}:row);
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
    let reason='';
    if(now.works>=2)reason='Both city crews have jobs. Finish or cancel one before starting another.';
    else if(world.effort<cost.effort)reason='Needs '+cost.effort+' effort. Advance the week to refresh it.';
    else if(site.funds<cost.funds || site.materials<cost.materials)reason='The treasury needs '+cost.funds+' funds and '+cost.materials+' materials for this project.';
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
    return {ok:true,available:!reason,reason,cost,turns:spec.turns,title:nameOf(site,project),old:nameOf(site,p.use),forecast,rate,beds,reach,risk,noise,localFunds,concurrent,capacityNote,accessNote,crowdingNote,
      record:r,siteName:record.name,people:spec.people,purpose:spec.purpose,completedView:after,week:(Number(world.week)||1)+spec.turns};
  }
  function apply(site,world,index,project) {
    const p=preview(site,world,index,project);
    if(!p.ok||!p.available)return {ok:false,message:p.reason};
    normalise(site);
    const row=site.city.precincts[index], name=overview(site).records[index].name;
    if(project==='cancel') {
      const work=nameOf(site,row.target);
      row.target=null;row.turns=0;
      site.funds+=p.recovery.funds;site.materials+=p.recovery.materials;
      return {ok:true,message:'Cancelled '+work.toLowerCase()+' at '+name+'. Recovered '+p.recovery.funds+' funds and '+p.recovery.materials+' materials.'};
    }
    world.effort-=p.cost.effort;site.funds-=p.cost.funds;site.materials-=p.cost.materials;
    row.target=project;row.turns=p.turns;
    return {ok:true,message:p.title+' commissioned at '+name+'. Opens in week '+p.week+'. '+p.forecast};
  }
  function weekly(site) {
    normalise(site);
    const notes=[];let recovered=0;
    site.city.precincts.forEach((p,i)=>{
      if(!p.target || --p.turns>0)return;
      const ground=terrainAt(site,i),place=site.water?ground.sea:ground.land,original=p.use;
      p.use=p.target;p.target=null;p.turns=0;
      if(p.use==='open' && original!=='open'){recovered++;notes.push(place+' reopened as common ground. One material was recovered.');}
      else notes.push(nameOf(site,p.use)+' opened at '+place+'.');
    });
    const delta={...overview(site).weekly};delta.materials+=recovered;
    return {delta,notes};
  }

  const Model=Object.freeze({valid,normalise,preview,apply,weekly,housingCapacity,marketCatchments,overview,projects:USES,options:BUILD_OPTIONS,flows,nameOf});
  window.EarthCityModel=Model;
})();

(() => {
  'use strict';
  const model=window.EarthCityModel;
  const CENTRE=[420,271], SX=104, SY=71;
  const SITES=[[420,129],[576,200],[576,342],[420,413],[264,342],[264,200]];
  const mapNodes=[...SITES,CENTRE];
  const arrowDirection={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  function neighbourOnMap(from,[dx,dy]){
    const [x,y]=mapNodes[from==='centre'?SITES.length:from];
    let nearest=null,best=Infinity;
    for(const [i,[px,py]] of mapNodes.entries()){
      const ahead=(px-x)*dx+(py-y)*dy,across=Math.abs((px-x)*dy-(py-y)*dx);
      if(ahead<=0 || across>ahead)continue;
      const distance=Math.hypot(ahead,across);
      if(distance<best){best=distance;nearest=i===SITES.length?'centre':i;}
    }
    return nearest;
  }
  const LAYERS={land:'Land use',access:'Travel time',impact:'Local impact'};
  const PROJECTS=model.projects;
  const TERRAINS=['field','ridge','crossing','shelter','yard','wet'];
  const DEVELOPMENTS=['homes','food','yard','market','transit','care','water','centre'];
  const LAND_COLOURS={field:'#b5ad72',ridge:'#8d9b79',crossing:'#cfb997',shelter:'#99ae81',yard:'#bcac8c',wet:'#78b19c'};
  const USE_COLOURS={homes:'#e1b18b',food:'#a4be7b',yard:'#bfa382',market:'#e2bb79',transit:'#9ec7b2',care:'#d0b4ac',water:'#82c5b3'};
  const fmt=n=>Number(n.toFixed(1));
  const attr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hex(x,y,s=1) {
    const corners=[[-SX,0],[-SX/2,-SY],[SX/2,-SY],[SX,0],[SX/2,SY],[-SX/2,SY]];
    return corners.map(([dx,dy])=>{
      const u=x+dx,v=y+dy;
      const a=8.6*Math.sin((u+v*.81)/41)+3.9*Math.cos((v-u*.3)/19);
      const b=6.4*Math.sin((v-u*.35)/33)+2.7*Math.cos((u+v*.5)/27);
      return fmt(x+(dx+a)*s)+','+fmt(y+(dy+b)*s);
    }).join(' ');
  }
  function mapSetting(site) {
    if(site.water)return 'sea';
    // Use the Swahili coastal artwork for the Zanzibar islands. A custom town
    // name can change, so its coordinates determine the regional appearance.
    const {lat,lon}=site;
    const unguja=lat>=-6.55&&lat<=-5.68&&lon>=39.14&&lon<=39.60;
    const pemba=lat>=-5.54&&lat<=-4.84&&lon>=39.55&&lon<=39.90;
    return unguja||pemba?'zanzibar':'land';
  }
  function spriteDefinitions(setting) {
    const atlas=`<image id="city-precinct-atlas" href="plan-art/${setting}-precincts.webp" width="1024" height="896"/>`;
    const sprites=TERRAINS.concat(DEVELOPMENTS).map((_,index)=>
      `<symbol id="city-art-${index}" viewBox="${index%4*256} ${Math.floor(index/4)*224} 256 224" preserveAspectRatio="none" overflow="hidden"><use href="#city-precinct-atlas"/></symbol>`);
    return atlas+sprites.join('');
  }
  // The bottom centre of each trimmed sprite is its physical contact with the map.
  function sprite(index,x,ground,width,height=width*.81) {
    return `<use href="#city-art-${index}" x="${fmt(x-width/2)}" y="${fmt(ground-height)}" width="${fmt(width)}" height="${fmt(height)}" class="city-model"/>`;
  }
  function previewModel(site,record,use) {
    const index=use==='open'?TERRAINS.indexOf(record.terrain.id):6+DEVELOPMENTS.indexOf(use);
    const thumb=make('span','city-project-model');
    thumb.setAttribute('aria-hidden','true');
    thumb.style.backgroundImage=`url(plan-art/${mapSetting(site)}-precincts.webp)`;
    thumb.style.backgroundPosition=`${index%4*100/3}% ${Math.floor(index/4)*100/3}%`;
    return thumb;
  }
  function coreArt(site) {
    const artFor={garden:'food',wetland:'water',workshop:'yard',market:'market',hall:'centre',pier:'transit'};
    const projectArt=kind=>6+DEVELOPMENTS.indexOf(kind);
    const models=[
      {ground:-12,svg:sprite(projectArt('homes'),-20,-12,72,57)},
      {ground:-3,svg:sprite(projectArt('market'),24,-3,65,54)},
      {ground:12,svg:sprite(projectArt('homes'),-42,12,52,39)}
    ];
    let paving='';
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const x=(col-row)*13+11,y=(col+row)*4.1-1;
      const b=site.buildings.find(building=>building.plot===row*3+col);
      paving+=`<path d="M${fmt(x)},${fmt(y-4)}l12.6 4.1-12.6 4.1-12.6-4.1Z" class="city-central-lot${b?' is-built':''}"/>`;
      if(b && artFor[b.kind])models.push({ground:y+4,svg:sprite(projectArt(artFor[b.kind]),x,y+4,26,22)});
    }
    return paving+models.sort((a,b)=>a.ground-b.ground).map(model=>model.svg).join('');
  }
  const ROAD_SEGMENTS=[
    'M-20 114Q103 107 179 156T307 214Q357 231 420 254T527 287Q579 302 634 330T864 418',
    'M172 551Q219 460 276 404T372 327Q420 289 441 243T513 111Q545 49 609-29',
    'M-30 446Q74 383 182 363T285 320Q339 280 389 269T499 240Q553 212 614 193T754 150Q796 131 868 77'
  ];
  function connections(sea) {
    const strokes=ROAD_SEGMENTS.map(d=>`<path d="${d}"/>`).join('');
    return `<g aria-hidden="true" class="city-connections${sea?' at-sea':''}"><g class="city-track-bank">${strokes}</g><g class="city-track">${strokes}</g><g class="city-track-mark">${strokes}</g></g>`;
  }
  function layerColour(rec,layer,sea) {
    if(layer==='access')return rec.minutes<=12?'#79b891':rec.minutes<=15?'#acbd86':rec.minutes<=19?'#e0bd79':'#d9916b';
    if(layer==='impact')return rec.pressure||rec.disturbed?'#da8c72':rec.use==='water'||rec.use==='care'?'#83c5a5':'#a6b8aa';
    return rec.use==='open'?(sea?'#a1d8ca':LAND_COLOURS[rec.terrain.id]):USE_COLOURS[rec.use];
  }
  function caption(name,detail) {
    const w=Math.max(95,Math.min(159,Math.max(name.length*8.25,detail.length*5.45)+17));
    const half=fmt(w/2);
    return `<g class="city-map-caption" pointer-events="none"><rect x="-${half}" y="21" width="${fmt(w)}" height="32" rx="4"/><text y="35" text-anchor="middle" class="city-map-name">${attr(name)}</text><text y="47" text-anchor="middle" class="city-map-detail">${attr(detail)}</text></g>`;
  }
  function layerDescription(rec,sea,layer) {
    if(layer==='access')return rec.minutes+' MIN TO CENTRE';
    if(layer==='impact')return rec.pressure?'RENT PRESSURE':rec.disturbed?'DISTURBANCE':rec.use==='care'||rec.use==='water'?'PROTECTED':'NO ACTIVE STRAIN';
    if(rec.target)return 'WORK IN PROGRESS';
    return rec.use==='open'?(sea?'OPEN DECK':'COMMON GROUND'):PROJECTS[rec.use].category.toUpperCase();
  }
  function parcelArt(rec,sea,layer,selected,site) {
    const [x,y]=SITES[rec.id],name=model.nameOf(site,rec.use),boundary=hex(x,y,.97);
    const artwork=rec.use==='open'?TERRAINS.indexOf(rec.terrain.id):6+DEVELOPMENTS.indexOf(rec.use);
    const label=layerDescription(rec,sea,layer);
    const progress=rec.target?`<g class="city-construction-rule"><path d="M-32 56h64"/><path d="M-32 56h${rec.turns===1?46:22}"/></g>`:'';
    return `<g data-city-precinct="${rec.id}"
      class="city-parcel${selected?' is-current':''}" role="button" aria-pressed="${selected}" tabindex="0" aria-label="${attr(rec.direction+', '+rec.name+', '+name)}"><title>${attr(rec.direction+' · '+rec.name+' · '+name)}</title>
      <polygon points="${boundary}" class="city-region-fill" fill="${layerColour(rec,layer,sea)}"/>
      <g transform="translate(${x} ${y})">${sprite(artwork,0,24,142,96)}${caption(rec.name,label)}${progress}</g>
      <polygon points="${boundary}" class="city-zone-edge" vector-effect="non-scaling-stroke"/></g>`;
  }
  function allMap(site,city,select,layer) {
    const sea=Boolean(site.water),[cx,cy]=CENTRE;
    return `<svg viewBox="62 4 716 511" preserveAspectRatio="xMidYMid meet" class="city-plan-svg city-layer-${layer}" role="group" aria-labelledby="city-picture-title city-picture-desc" xmlns="http://www.w3.org/2000/svg">
      <title id="city-picture-title">${attr(site.name)} city plan</title>
      <desc id="city-picture-desc">Six planning precincts surround the central street district. Tap a precinct or use the arrow keys to inspect it. Activate the centre to enter street view. The precinct selector offers the same planning choices.</desc>
      <defs>${spriteDefinitions(mapSetting(site))}</defs>
      ${connections(sea)}
      ${city.records.map(rec=>parcelArt(rec,sea,layer,select===rec.id,site)).join('')}
      <g data-city-precinct="centre" class="city-core" role="button" tabindex="0" aria-label="Enter central streets">
        <title>Enter central streets · ${site.buildings.length} of nine lots developed</title>
        <polygon points="${hex(cx,cy,.96)}" class="city-region-fill city-core-fill"/>
        <g transform="translate(${cx} ${cy})">${coreArt(site)}${caption('Central streets','ENTER STREET VIEW  ↗')}</g>
        <polygon points="${hex(cx,cy,.96)}" class="city-zone-edge" vector-effect="non-scaling-stroke"/></g></svg>`;
  }
  const make=(tag,style,text)=>{
    const n=document.createElement(tag);if(style)n.className=style;if(text!==undefined)n.textContent=text;return n;
  };
  const button=(text,callback,cls='city-secondary')=>{
    const b=make('button',cls,text);b.type='button';b.addEventListener('click',callback);return b;
  };
  const definition=(parent,term,value)=>{
    const d=make('div','city-metric');d.append(make('dt','',term),make('dd','',value));parent.append(d);
  };
  function mount({mapRoot,panel,sim,onStreet,onResult,onChange,onRehearse}) {
    if(!mapRoot||!panel||!sim)throw new Error('City plan needs a map, inspector and simulation.');
    let currentId=null,renderedWeek=null,select=0,layer='land',project='food',busy=false,message='',onMapFocus=false,hasDestroyed=false;
    const scene=make('div','city-scene');
    const heading=make('header','city-chart-head'),headText=make('div');
    headText.append(make('p','kicker','Local planning map'));
    const cityName=make('h2','city-title');headText.append(cityName);
    const scale=make('span','city-chart-scale','Six precincts · One centre');heading.append(headText,scale);
    const picture=make('div','city-picture');
    let mapRevision='';
    function fitPicture() {
      const svg=picture.querySelector('svg');
      if(svg)svg.setAttribute('viewBox',picture.clientWidth<610?'142 42 556 459':'45 31 752 462');
    }
    const observed=typeof ResizeObserver==='function'?new ResizeObserver(fitPicture):null;
    observed?.observe(picture);
    const tools=make('div','city-chart-tools');
    const layers=make('div','city-chart-layers');layers.setAttribute('role','group');layers.setAttribute('aria-label','Plan layer');
    const layerButtons=[];
    for(const [key,text] of Object.entries(LAYERS)){
      const b=button(text,()=>{if(layer===key)return;layer=key;render();},'city-layer');
      b.dataset.layer=key;layerButtons.push(b);layers.append(b);
    }
    const legend=make('span','city-legend');
    const inspectLink=make('a','city-inspect-link');inspectLink.href='#city-panel';
    inspectLink.addEventListener('click',()=>{panel.tabIndex=-1;panel.focus({preventScroll:true});});
    tools.append(layers,legend,inspectLink);scene.append(heading,picture,tools);mapRoot.replaceChildren(scene);
    function choose(id,fromMap) {
      if(id==='centre'){onStreet?.();return;}
      if(!Number.isInteger(id)||id<0||id>5)return;
      select=id;message='';const site=sim.active(),record=site && model.overview(site).records[id];
      if(record && (project===record.use || project==='open' && record.use==='open'))project=record.use==='food'?'homes':'food';
      onMapFocus=fromMap;render();
    }
    function previewProject(index,projectId) {
      const site=sim.active();
      if(hasDestroyed || !site || !Number.isInteger(index) || index<0 || index>5 || !model.options.includes(projectId))return false;
      if(site.id!==currentId)render();
      const record=model.overview(site).records[index];
      if(record.use===projectId || (record.target && record.target!==projectId))return false;
      project=projectId;choose(index,false);
      panel.tabIndex=-1;
      panel.focus({preventScroll:true});
      panel.scrollIntoView({block:'start'});
      return true;
    }
    function snapshotView(){
      if(hasDestroyed || !currentId)return null;
      const state={siteId:currentId,precinct:select};
      if(!busy)Object.assign(state,{layer,project});
      return state;
    }
    function restoreView(snapshot){
      const site=sim.active();
      if(hasDestroyed || !site || snapshot?.siteId!==site.id || !Number.isInteger(snapshot.precinct) || snapshot.precinct<0 || snapshot.precinct>5)return false;
      if(site.id!==currentId)render();
      if(!busy){
        if(typeof snapshot.layer==='string' && Object.hasOwn(LAYERS,snapshot.layer))layer=snapshot.layer;
        if(model.options.includes(snapshot.project))project=snapshot.project;
      }
      choose(snapshot.precinct,false);
      return true;
    }
    function parcelFrom(el){const tile=el?.closest?.('[data-city-precinct]');return tile ? (tile.dataset.cityPrecinct==='centre'?'centre':Number(tile.dataset.cityPrecinct)) : null;}
    picture.addEventListener('click',ev=>{const n=parcelFrom(ev.target);if(n!==null)choose(n,false);});
    picture.addEventListener('keydown',ev=>{
      if(ev.altKey || ev.ctrlKey || ev.metaKey)return;
      const n=parcelFrom(ev.target);if(n===null)return;
      if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(n,true);}
      if(Object.hasOwn(arrowDirection,ev.key)){
        ev.preventDefault();
        const next=neighbourOnMap(n,arrowDirection[ev.key]);
        if(next==='centre')picture.querySelector('[data-city-precinct="centre"]')?.focus({preventScroll:true});
        else if(next!==null)choose(next,true);
      }
    });
    async function submit(id) {
      if(busy||hasDestroyed)return;
      busy=true;message='';const prior=sim.active()?.id;render();
      try{
        const result=await sim.perform('planCity',select,id);
        if(hasDestroyed)return;
        if(prior===sim.active()?.id)message=result.message;
        onResult?.(result);
        onChange?.();
      }catch(err){
        message='The project could not be saved. Check the current precinct and try again.';
      }finally{
        busy=false;if(!hasDestroyed)render();
      }
    }
    function metricLine(city,site) {
      const dl=make('dl','city-metrics');
      definition(dl,'Housing',site.population+' / '+city.capacity);
      definition(dl,'15-minute reach',city.reachable+' / 6');
      definition(dl,'Rent pressure',city.pressure===0?'None':String(city.pressure));
      return dl;
    }
    function render() {
      const site=sim.active();
      if(!site||hasDestroyed)return;
      if(site.id!==currentId){currentId=site.id;select=0;layer='land';project='food';message='';}
      if(renderedWeek!==sim.state.week){renderedWeek=sim.state.week;message='';}
      const city=model.overview(site),r=city.records[select];
      cityName.textContent=site.name;inspectLink.textContent='Inspect '+r.name+' ↘';
      // Form edits and repeated simulation notifications don't repaint an unchanged map.
      const revision=JSON.stringify([site.id,site.name,site.water,select,layer,site.buildings.map(b=>[b.plot,b.kind]),
        city.records.map(rec=>[rec.terrain.id,rec.use,rec.target,rec.turns,rec.minutes,rec.pressure,rec.disturbed])]);
      if(revision!==mapRevision){
        picture.dataset.setting=mapSetting(site);
        picture.innerHTML=allMap(site,city,select,layer);mapRevision=revision;fitPicture();
      }
      if(onMapFocus){onMapFocus=false;picture.querySelector('[data-city-precinct="'+select+'"]')?.focus({preventScroll:true});}
      layerButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));
      legend.textContent=layer==='access'?'Journey to central streets':layer==='impact'?'Rent, habitat and workshop noise':'Select a precinct to plan its use';
      const head=make('header','city-panel-head');head.append(make('span','kicker','City plan'));
      const survey=make('label','city-control','Planning precinct');
      const pick=make('select','city-select');
      city.records.forEach(rec=>{const opt=make('option','',rec.direction+' · '+rec.name);opt.value=String(rec.id);pick.append(opt);});
      pick.value=String(select);pick.addEventListener('change',()=>{choose(Number(pick.value),false);panel.querySelector('.city-select')?.focus({preventScroll:true});});
      survey.append(pick);
      const title=make('h2','city-area-title',r.name);
      const subtitle=make('p','city-subtitle',r.type+' · '+r.minutes+' min to centre');
      const data=make('div','city-site-fact');
      data.append(make('strong','',model.nameOf(site,r.use)),make('p','',r.terrain.note));
      if(r.reasons.length)data.append(make('p','city-impact',r.reasons.join(' ')));
      const content=[head,survey,title,subtitle,data];
      if(r.target){
        const pending=make('div','city-pending');
        pending.append(make('strong','',model.nameOf(site,r.target)+' underway'),make('p','','Opens in week '+(sim.state.week+r.turns)+'. The existing use continues until then.'));
        const refund=model.preview(site,sim.state,select,'cancel').recovery;
        const cancel=button('Cancel · recover '+refund.funds+' funds and '+refund.materials+' materials',()=>submit('cancel'),'city-secondary');
        cancel.disabled=busy;pending.append(cancel);content.push(pending);
      }else{
        const form=make('div','city-project');
        const selector=make('label','city-control','Proposed use'), dropdown=make('select','city-project-select');
        const available=model.options.filter(id=>id!==r.use);
        if(!available.includes(project))project=available[0];
        for(const key of available){const opt=make('option','',model.nameOf(site,key));opt.value=key;dropdown.append(opt);}
        dropdown.value=project;dropdown.addEventListener('change',()=>{project=dropdown.value;message='';render();panel.querySelector('.city-project-select')?.focus({preventScroll:true});});
        selector.append(dropdown);form.append(selector);
        const projection=model.preview(site,sim.state,select,project);
        if(projection.ok){
          const info=make('details','city-project-detail');info.append(make('summary','','Who benefits?'),make('p','',projection.people),make('p','',projection.purpose));
          const cost=make('p','city-project-cost',projection.cost.effort+' effort · '+projection.cost.funds+' funds · '+projection.cost.materials+' materials');
          const forecast=make('div','city-result-preview');
          forecast.append(previewModel(site,r,project),make('span','data-label','When the project opens'),make('strong','',model.flows(projection.rate)?model.flows(projection.rate)+' per week':'Weekly production stays level.'));
          if(projection.capacityNote)forecast.append(make('small','',projection.capacityNote+' residents.'));
          if(projection.accessNote)forecast.append(make('small','',projection.accessNote+' of six.'));
          if(projection.crowdingNote)forecast.append(make('small','',projection.crowdingNote));
          if(projection.localFunds)forecast.append(make('small','','Includes '+(projection.localFunds>0?'+':'')+projection.localFunds+' funds from shops in central streets.'));
          if(projection.concurrent)forecast.append(make('small','','Includes other commissioned work due by opening week.'));
          if(projection.risk){
            const n=Math.abs(projection.risk);
            forecast.append(make('small','',n+' '+(n===1?'precinct':'precincts')+(projection.risk>0?' newly exposed to rent pressure.':' newly protected against rent pressure.')));
          }
          if(projection.noise)forecast.append(make('small','',projection.noise>0?'More households or habitat will face disturbance.':'A source of disturbance will be buffered.'));
          const timing=projection.turns===1?'Operates from next week (week '+projection.week+').':'Next week is a construction week. Opens in week '+projection.week+'.';
          forecast.append(make('small','',timing));
          form.append(info,cost,forecast);
          const submitButton=button(busy?'Saving project…':project==='open'?'Reopen common ground':'Commission project',()=>submit(project),'primary city-commission');
          submitButton.disabled=busy||!projection.available;form.append(submitButton);
          if(projection.available && onRehearse)form.append(button('Rehearse this project',()=>onRehearse(select,project),'city-secondary'));
          if(!projection.available)form.append(make('p','city-reason',projection.reason));
        }
        content.push(form);
      }
      if(message)content.push(make('p','city-outcome',message));
      const dl=metricLine(city,site);
      content.push(dl);
      if(city.crowding.excess)content.push(make('p','city-reason',city.crowding.excess+' '+(city.crowding.excess===1?'resident lacks':'residents lack')+' a housing place. Crowding costs '+Math.abs(city.crowding.wellbeing)+' wellbeing per week. More homes can make room.'));
      const brief=make('details','city-brief');brief.append(make('summary','','Read the city ledger'));
      const q=model.flows(city.weekly)||'No city production yet';
      brief.append(make('p','','Outer precincts per week: '+q+'.'),
        make('p','','Two crews can work at once. The central streets contain nine smaller lots. Housing changes how many people can settle here. Shared transit shortens journeys in neighbouring precincts.'));
      content.push(brief);
      panel.replaceChildren(...content);
    }
    render();
    return {render,previewProject,snapshotView,restoreView,destroy(){hasDestroyed=true;observed?.disconnect();mapRoot.replaceChildren();panel.replaceChildren();}};
  }
  window.EarthCity=Object.freeze({mount});

})();
