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
    return {weekly,records,capacity,reachable,pressure,noise,developed,marketCatchments:state.filter(p=>p.use==='market').length,works:state.filter(p=>p.target).length};
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
    const state=precincts(site),p=state[index],was=overview(site,state),record=was.records[index];
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
    const afterState=state.map((x,i)=>i===index?{use:project,target:null,turns:0}:x);
    const after=overview(site,afterState),r=after.records[index];
    const rate=difference(after.weekly,was.weekly);
    const shopPlan=window.CommonEarthSim?.marketPlan;
    const localFunds=shopPlan ? shopPlan(site,{cityMarkets:after.marketCatchments}).totalFunds-shopPlan(site,{cityMarkets:was.marketCatchments}).totalFunds : 0;
    if(localFunds)rate.funds=(rate.funds||0)+localFunds;
    const beds=after.capacity-was.capacity, reach=after.reachable-was.reachable;
    const risk=after.pressure-was.pressure, noise=after.noise-was.noise;
    let reason='';
    if(was.works>=2)reason='Both city crews have jobs. Finish or cancel one before starting another.';
    else if(world.effort<cost.effort)reason='Needs '+cost.effort+' effort. Advance the week to refresh it.';
    else if(site.funds<cost.funds || site.materials<cost.materials)reason='The treasury needs '+cost.funds+' funds and '+cost.materials+' materials for this project.';
    const capacityNote=beds?'Housing capacity '+was.capacity+' → '+after.capacity:'';
    const accessNote=reach?'Precincts within 15 minutes '+was.reachable+' → '+after.reachable:'';
    const impact=[flows(rate)?flows(rate)+' per week':'',capacityNote,accessNote].filter(Boolean);
    const forecast=impact.length?impact.join(' · '):'The weekly totals stay the same.';
    return {ok:true,available:!reason,reason,cost,turns:spec.turns,title:nameOf(site,project),old:nameOf(site,p.use),forecast,rate,beds,reach,risk,noise,localFunds,capacityNote,accessNote,
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
  const LAYERS={land:'Land use',access:'Travel time',impact:'Local impact'};
  const PROJECTS=model.projects;
  const PALETTES={
    open:['#667f67','#66856f'],homes:['#a39473','#a89b7b'],food:['#788e61','#869c69'],
    yard:['#927f6d','#958474'],market:['#a99668','#b09d72'],transit:['#6b9185','#78a296'],
    care:['#908980','#a39b98'],water:['#658d7e','#6b9b8d']
  };
  const LAND_TINT={field:'#8a966c',ridge:'#868d73',crossing:'#95977c',shelter:'#83947b',yard:'#8c8d79',wet:'#6d8f79'};
  const SEA_TINT={field:'#679082',ridge:'#748983',crossing:'#83978e',shelter:'#7f998d',yard:'#83918c',wet:'#77a596'};
  const STRUCTURE_TONES={
    homes:['#d8baa0','#8a725d','#b39a77'],food:['#a7b3a2','#619481','#8ba38e'],yard:['#a9b1a5','#6a8180','#8f9590'],
    market:['#ddb67d','#956f50','#b88d5a'],transit:['#a2c0ab','#648981','#87a592'],care:['#d4bcad','#947e78','#baa49b']
  };
  const fmt=n=>Number(n.toFixed(1));
  const attr = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nss=' vector-effect="non-scaling-stroke"';
  function poly(points, fill, stroke, sw=.7, additional='') {
    return '<polygon points="'+points.map(p=>fmt(p[0])+','+fmt(p[1])).join(' ')+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+sw+'"':'')+additional+'/>';
  }
  function path(d,stroke,sw=1,fill='none',extra='') { return '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>'; }
  function ellipse(x,y,rx,ry,fill,extra=''){return '<ellipse cx="'+fmt(x)+'" cy="'+fmt(y)+'" rx="'+fmt(rx)+'" ry="'+fmt(ry)+'" fill="'+fill+'" '+extra+'/>';}
  const rect=(x,y,w,h,fill)=>'<rect x="'+fmt(x)+'" y="'+fmt(y)+'" width="'+fmt(w)+'" height="'+fmt(h)+'" fill="'+fill+'"/>';
  function hex(x,y,s=1) {
    const corners=[[-SX,0],[-SX/2,-SY],[SX/2,-SY],[SX,0],[SX/2,SY],[-SX/2,SY]];
    return corners.map(([dx,dy])=>{
      const u=x+dx,v=y+dy;
      const a=8.6*Math.sin((u+v*.81)/41)+3.9*Math.cos((v-u*.3)/19);
      const b=6.4*Math.sin((v-u*.35)/33)+2.7*Math.cos((u+v*.5)/27);
      return [x+(dx+a)*s,y+(dy+b)*s];
    });
  }
  function between(seed, a, b) {
    let t=seed|0;t=Math.imul(t^(t>>>16),0x7feb352d);t=Math.imul(t^(t>>>15),0x846ca68b);
    return a+((t^(t>>>16))>>>0)/4294967295*(b-a);
  }
  function tree(x,y,size,shade=0) {
    const dark=['#3d6957','#496b53','#52745b','#49735d'][shade%4],top=['#729774','#8da37c','#a5af7e','#80a286'][shade%4];
    return ellipse(x+size*.3,y+2,size*.9,size*.42,'#566e59','opacity=".59"')+
      path('M'+fmt(x)+' '+fmt(y+1)+'v-'+fmt(size*.95),'#745f48',1.3)+
      ellipse(x,y-size*.76,size*.77,size*.82,dark)+ellipse(x-size*.16,y-size*.98,size*.57,size*.49,top);
  }
  function grove(seed,x,y,count,scale=1) {
    const trees=[];
    for(let k=0;k<count;k++)trees.push([x+between(seed+k*33,-16,16)*scale,y+between(seed+k*97+31,-8,8)*scale,between(seed+k*77+12,3.8,6.4)*scale,k%4]);
    return trees.sort((a,b)=>a[1]-b[1]).map(q=>tree(...q)).join('');
  }
  function block(x,y,w,d,z,kind,style='flat') {
    const [roof,left,right]=STRUCTURE_TONES[kind]||STRUCTURE_TONES.homes;
    const ax=w*.83,ay=w*.35,bx=-d*.83,by=d*.35;
    const front=[x+ax+bx,y+ay+by],a=[x+ax,y+ay],b=[x+bx,y+by],top=q=>[q[0],q[1]-z];
    let s=poly([[x+5,y+2],[a[0]+4,a[1]+3],[front[0]+4,front[1]+3],[b[0]+2,b[1]+2]],'#50685b');
    s+=poly([top(a),a,front,top(front)],right,'#4c6259',.5)+poly([top(b),b,front,top(front)],left,'#4c6259',.5);
    s+=poly([[x,y-z],top(a),top(front),top(b)],roof,'#536b62',.55);
    if(style==='gable'){
      const g0=[x+bx*.50,y+by*.50-z-z*.33],g1=[g0[0]+ax,g0[1]+ay];
      s+=poly([[x,y-z],g0,g1,top(a)],roof,'#667267',.5)+poly([g0,top(b),top(front),g1],kind==='homes'?'#ae8e79':'#899c8f','#6c776d',.5);
    } else if(style==='stripe'){
      for(let i=2;i<d;i+=3)s+=path('M'+fmt(x-i*.83)+' '+fmt(y+i*.35-z)+'l'+fmt(ax)+' '+fmt(ay),'#70867c',.55);
    } else {
      s+=poly([[x+1,y-z+1],[a[0]-2,a[1]-z+1],[front[0],front[1]-z-1],[b[0]+2,b[1]-z]],'none','#97a79a',.45);
    }
    for(let k=1;k<w/6;k++) {
      const f=k/(Math.floor(w/6)+1); const xx=b[0]+f*ax,yy=b[1]+f*ay-z*.65;
      s+=poly([[xx,yy],[xx+1.7,yy+.64],[xx+1.7,yy+2.7],[xx,yy+2.1]],'#566f68');
    }
    return s;
  }
  function bed(x,y,wide=26) {
    let s=poly([[x,y],[x+wide,y+wide*.37],[x+wide-11,y+wide*.37+5],[x-11,y+5]],'#887953','#687457',.5);
    for(let j=0;j<4;j++)s+=path('M'+fmt(x-j*2.6)+' '+fmt(y+j*1.2)+'l'+wide+' '+fmt(wide*.37),'#a9bb77',1.2);
    return s;
  }
  function ripple(x,y,long,color='#9dbab0') {
    return path('M'+fmt(x)+' '+fmt(y)+'q'+fmt(long*.25)+' -1.7 '+fmt(long*.49)+' 0t'+fmt(long*.51)+' 0',color,.65);
  }
  function waterPatch(x,y,s) {
    let out='<g transform="translate('+x+' '+y+') scale('+s+')">';
    out+=path('M-47 2Q-38-10-24-10T6-15Q29-23 43-14T47 0Q38 9 23 10T-8 19Q-29 19-43 12Z','#648c77',2,'#769e8d');
    out+=path('M-41 1Q-34-7-22-7T6-12Q24-18 38-12T40-1Q33 6 19 7T-8 15Q-27 16-38 9Z','#709a8c',1,'#577e76');
    for(let i=0;i<10;i++){const xx=between(i+38,-31,23),yy=between(i+144,-6,9);out+=ripple(xx,yy,between(i+33,4,10));}
    for(let i=0;i<9;i++){const xx=-33+i*6,yy=13+Math.sin(i*.8)*4;out+=path('M'+xx+' '+fmt(yy)+'l-1.6-4m1.6 4 .6-6m-.6 6 2.3-4','#617a52',1);}
    return out+'</g>';
  }
  function platform(x,y,scale=1) {
    const pts=hex(x,y,scale);
    let str=poly(pts.map(([a,b])=>[a+1,b+4]),'#4a6965','#789b90',1)+poly(pts,'#8b9e8a','#a7b2a0',1);
    return str;
  }
  function baseGarden(terrain,seed) {
    let s='';
    if(terrain==='field'){
      s+=bed(-38,-13,26)+bed(-24,-19,26)+bed(-9,-24,26)+grove(seed,22,-1,8,.87);
      s+=block(-42,9,8,6,3,'food','gable');
    } else if(terrain==='ridge'){
      for(let i=0;i<4;i++)s+=path('M'+(-61+i*2)+' '+(-6-i*3)+'q24-17 48-7t51-9','#758769',1);
      s+=grove(seed,-12,-13,9,.96)+grove(seed+13,38,-17,6,.84);
    } else if(terrain==='crossing'){
      s+=path('M-76-16Q-27 2 1-2T71-20','#aaa998',7)+path('M-76-16Q-27 2 1-2T71-20','#6e8378',3.8);
      s+=block(-30,-12,10,7,4,'market','gable')+block(15,-14,8,6,4,'market','gable')+tree(43,1,5);
    } else if(terrain==='shelter'){
      s+=grove(seed,-27,-4,7,.89)+grove(seed+21,27,-14,8,.83)+block(-8,-15,11,8,4,'homes','gable');
      s+=path('M-36 11Q-6-7 20 5T51 0','#c0b399',3);
    } else if(terrain==='yard'){
      for(let k=0;k<2;k++){const y=-25+k*9;s+=path('M-56 '+y+'l92 35','#596f69',1.8);}
      for(let k=0;k<14;k++){const x=-52+k*6,y=-23+k*2.3;s+=path('M'+x+' '+fmt(y)+'l-3 6','#798578',.9);}
      s+=block(13,-22,17,7,4,'yard','stripe')+block(38,-10,8,6,3,'yard');s+=grove(seed,-43,2,4,.76);
    } else s+=waterPatch(-2,-7,.83)+grove(seed,-44,-19,5,.73);
    return s;
  }
  function art(use,seed) {
    let s='';
    if(use==='homes') {
      s+=path('M-53-7 0 13 55-10','#c0ae8e',5)+grove(seed,11,0,3,.65);
      s+=block(-33,-18,24,12,10,'homes','gable')+block(10,-20,25,12,11,'homes','gable')+block(26,0,18,9,7,'homes','gable')+block(-23,3,16,8,7,'homes','gable');
    } else if(use==='food'){
      for(let k=0;k<5;k++)s+=bed(-44+k*11,-6-k*4.6,29);
      s+=block(19,-10,20,10,6,'food','stripe')+block(30,3,12,6,4,'food','gable')+tree(-39,7,4.4);
    } else if(use==='yard'){
      s+=block(-29,-16,34,17,13,'yard','stripe')+block(10,-19,27,12,8,'yard','stripe');
      s+=rect(-30,-35,4,14,'#767b70')+ellipse(-28,-35,2.8,1,'#b5a18a')+block(10,1,15,8,5,'yard')+block(28,6,9,6,4,'market');
    } else if(use==='market'){
      s+=poly([[-57,-6],[-3,-27],[56,-6],[-4,15]],'#aa9b79','#8b8b73');
      for(let k=0;k<4;k++){
        const x=-33+(k%2)*39+(k>1?3:0),y=-14+(k>1?16:0);
        s+=block(x,y,18,10,5,'market','gable');
        for(let j=1;j<=3;j++)s+=path('M'+(x+j*3.7)+' '+fmt(y-5+j*1.5)+'l-8.7 3.8','#d2bba3',1.8);
      }s+=grove(seed,44,-3,3,.58);
    } else if(use==='transit'){
      s+=path('M-67 8Q-40-12-12-8T55-15','#576d68',7)+path('M-67 8Q-40-12-12-8T55-15','#b0b595',1,'none','stroke-dasharray="3 2"');
      s+=block(-20,-13,28,8,6,'transit','stripe')+block(16,-8,20,6,4,'transit')+path('M-27-10l18 6','#d4aa6f',2);
      s+=grove(seed,39,3,4,.7);
    } else if(use==='care'){
      s+=poly([[-49,-4],[-20,-18],[38,4],[8,17]],'#bbad93','#a2a38e');
      s+=block(-26,-12,38,15,10,'care')+block(0,-19,18,15,12,'care','gable')+block(9,-3,16,9,4,'care');
      s+=grove(seed,35,6,5,.73);
    } else if(use==='water'){
      s+=waterPatch(-5,-6,.98)+grove(seed,-40,-13,7,.84)+grove(seed+9,35,-14,5,.77);
      s+=path('M-33 12q16 6 36-7t33-7','#c7b48a',2.3);
    }
    return s;
  }
  function coreArt(site) {
    let s='';
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const x=(col-row)*16,y=(col+row)*6-22,b=site.buildings.find(b=>b.plot===row*3+col);
      s+=poly([[x,y-5.2],[x+13,y],[x,y+5.2],[x-13,y]],b?'#82927c':'#73816c','#c0b896',.65);
      if(!b) continue;
      if(b.kind==='garden')s+=bed(x-3,y-2.4,10);
      else if(b.kind==='wetland')s+=waterPatch(x,y,.23);
      else s+=block(x,y-3.4,12,9,6,{workshop:'yard',market:'market',hall:'care',pier:'transit'}[b.kind]||'homes','gable');
    }
    s+=block(-47,-8,15,8,6,'homes','gable')+block(29,-17,16,9,7,'homes','gable')+block(30,4,13,8,5,'market','stripe');
    return s;
  }

  function tint(rec,layer,sea) {
    if(layer==='access')return rec.minutes<=12?'#80a78e':rec.minutes<=15?'#98a684':rec.minutes<=19?'#b09e75':'#bd9276';
    if(layer==='impact')return rec.pressure||rec.disturbed?'#c18c76':rec.use==='water'||rec.use==='care'?'#82ae99':'#889486';
    return rec.use==='open'?(sea?SEA_TINT:LAND_TINT)[rec.terrain.id]:PALETTES[rec.use][0];
  }
  const label= (x,y,s,cls,anchor='middle')=>'<text x="'+x+'" y="'+y+'" class="'+cls+'" text-anchor="'+anchor+'">'+attr(s)+'</text>';
  function transportLines(sea) {
    const roadways=[
      'M55 174Q121 162 181 190T287 223Q340 223 383 246T472 285Q539 300 590 337T768 398',
      'M212 485Q248 422 302 391T395 326Q439 292 460 230T524 96Q548 46 595 12',
      'M111 367Q192 352 244 314T370 266Q446 252 508 213T650 164Q694 155 749 122'
    ];
    return roadways.map(d=>path(d,sea?'#acaf93':'#b3ad96',sea?5.2:7.2)+path(d,sea?'#918e73':'#768071',sea?3.6:4.7)+path(d,'#bcb79c',.62,'none','stroke-dasharray="4 4"')).join('');
  }
  function peripheralLandscape(sea) {
    let s='';
    if(!sea){
      const river='M64-35C130 24 88 78 118 111s53 29 37 68-28 70-12 121 10 71-20 113-7 85 49 132';
      s+=path(river,'#a1ad8f',24)+path(river,'#63887e',17)+path(river,'#93ad9a',.85);
      const cottages=[[173,125],[190,131],[207,120],[658,97],[674,106],[691,115],[688,396],[703,404],[669,416],[180,436],[173,450],[516,493]];
      for(let i=0;i<cottages.length;i++){const [x,y]=cottages[i];s+=block(x,y,10+i%4,7+i%3,3+i%4,'homes','gable');}
      for(let i=0;i<7;i++)s+=bed(79+i*8,273-i*3,20)+bed(680+i*8,294-i*3.6,23);
    }else for(const [x,y] of [[130,223],[698,182],[677,431]]) {
      s+=ellipse(x,y+3,7,1.6,'#406861')+path('M'+(x-7)+' '+y+'l14-2-4 5-8-1Z','#899f8e',.6,'#b8b99a')+path('M'+x+' '+(y-1)+'v-9l4 7Z','#a8b8a4',.6,'#d3cdb0');
    }
    return s+transportLines(sea);
  }
  function detailedParcel(rec,sea,seed) {
    const u=rec.use,t=rec.terrain.id;
    const lane=['M-82-25Q-50-11-23-12T24-24Q44-34 76-26','M-76 26q26-29 60-35T62-33','M-73-25q25 24 48 22T53-18'][rec.id%3];
    let s=path(lane,sea?'#a7aa8b':'#aea88f',3.5)+path(lane,'#8d9984',1.5)+path('M-53 25q24-11 46-7t46 1','#b7ab8f',1.7);
    if(u==='open')return s+(t==='field'?bed(24,8,15)+bed(35,5,15):grove(seed+45,50,-24,5,.7))+grove(seed+65,-46,8,t==='ridge'?7:4,.69);
    if(u==='water')return s+grove(seed+700,-42,-24,9,.81)+grove(seed+45,52,0,4,.7);
    if(u==='food')return s+bed(-48,-26,18)+bed(-40,-31,20)+bed(-29,-34,18)+block(45,0,12,6,4,'food','stripe')+grove(seed,-48,8,4,.65);
    const rows={
      homes:[[-48,-29,18,9,7],[-25,-35,17,9,7],[3,-33,20,9,8],[48,-9,15,9,7],[-47,5,16,9,8]],
      market:[[-48,-23,17,9,7],[-29,-32,15,9,7],[-9,-36,15,9,6],[41,-10,13,9,7]],
      yard:[[-47,-27,26,10,7],[43,-7,17,8,5],[-43,6,10,6,4],[-34,9,10,6,4]],
      transit:[[-45,-26,22,8,6],[9,-33,11,7,5],[43,-15,14,7,6]],care:[[-43,-28,18,13,7],[19,-33,16,11,7]]
    };
    const rowsHere=rows[u]||[];
    for(const [x,y,w,d,z] of rowsHere)s+=block(x,y,w,d,z,u,(u==='yard'||u==='transit')?'stripe':'gable');
    return s+grove(seed+629,48,5,4,.76);
  }

  function outerScenery(site) {
    let s='';
    const sea=site.water;
    if(sea){
      for(let i=0;i<165;i++)s+=ripple(between(i*3+41,20,830),between(i*13+8,0,560),between(i*19+76,5,22),'#799b94');
      for(let i=0;i<3;i++){const x=between(i*41+758,125,700),y=[75,465,385][i];s+=path('M'+x+' '+y+'l11 -2 -7 5z','#b3b7a1',.8,'#b0b59d');}
      return s;
    }
    // Perimeter contours and scattered copses belong to the fictional plan.
    for(let i=0;i<14;i++){
      const x=-80+i*16; const dx=73+i*4;
      s+=path('M'+x+' -10q'+dx+' 66 43 114t19 130q17 51-1 102t48 151','#65816e',.8);
      const xx=620+i*14;
      s+=path('M'+xx+' -22q-29 53 8 83t54 98q11 58-35 121t25 119q43 39 27 130','#708874',.72);
    }
    const woods=[[139,92],[170,396],[705,135],[648,448],[194,38],[725,342],[33,240],[385,505]];
    for(let i=0;i<woods.length;i++)s+=grove(i*81+33,woods[i][0],woods[i][1],7,1.04);
    return s;
  }
  function allMap(site,city,select,layer) {
    const sea=site.water;
    const backdrop=sea?'#517a73':'#7c9078';
    let s='<svg viewBox="62 4 716 511" preserveAspectRatio="xMidYMid meet" class="city-plan-svg" role="group" aria-labelledby="city-picture-title city-picture-desc" xmlns="http://www.w3.org/2000/svg">'+
      '<title id="city-picture-title">'+attr(site.name)+' city plan</title><desc id="city-picture-desc">Six planning precincts surround the central street district. Choose a precinct to inspect and develop it. The precinct selector offers the same choices.</desc>'+
      '<defs><pattern id="city-grain" patternUnits="userSpaceOnUse" width="6" height="6"><circle cx="1" cy="1" r=".42" fill="#ebd9b4" opacity=".57"/><circle cx="4.1" cy="3.8" r=".53" fill="#4f685a" opacity=".58"/></pattern><pattern id="city-construction" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0v7" stroke="#e4b96f" stroke-width="2"/></pattern><filter id="city-drop" x="-30%" y="-40%" width="160%" height="190%"><feDropShadow dx="0" dy="1.1" stdDeviation=".7" flood-color="#425951" flood-opacity=".4"/></filter></defs>'+
      rect(-90,-90,1040,740,backdrop)+rect(-90,-90,1040,740,'url(#city-grain)')+outerScenery(site)+peripheralLandscape(sea);
    // All six neighbourhoods share a continuous surveyed street or boardwalk.
    const shell=[...SITES,[...CENTRE]];
    for(const [x,y] of shell)s+=poly(hex(x,y,1.018),'none',sea?'#8da99c':'#a8a895',sea?3.2:6);
    for(const [x,y] of shell)s+=poly(hex(x,y,1.004),'none',sea?'#616d62':'#667a6e',1);
    for(const rec of city.records){
      const i=rec.id,[x,y]=SITES[i];
      s+='<g data-city-precinct="'+i+'" class="city-parcel'+(select===i?' is-current':'')+'" role="button" aria-pressed="'+(select===i)+'" tabindex="0" aria-label="'+attr(rec.direction+', '+rec.name+', '+model.nameOf(site,rec.use))+'"><title>'+attr(rec.direction+' · '+rec.name+' · '+model.nameOf(site,rec.use))+'</title>';
      if(sea)s+=platform(x,y,.95);
      s+=poly(hex(x,y,sea?.928:.974),tint(rec,layer,sea),'#a7ae96',.8)+poly(hex(x,y,.945),'url(#city-grain)',null);
      if(rec.target)s+=poly(hex(x,y,.939),'url(#city-construction)',null,1,' opacity=".19"');
      const selected=select===i,clip='city-clip-'+i;
      s+='<defs><clipPath id="'+clip+'">'+poly(hex(x,y,sea?.92:.965),'black',null)+'</clipPath></defs>';
      s+='<g clip-path="url(#'+clip+')" opacity="'+(layer==='land'?.83:.48)+'">'+transportLines(sea)+'</g>';
      s+='<g class="city-parcel-art" transform="translate('+x+' '+y+')" opacity="'+(layer==='land'?1:.66)+'">'+
        detailedParcel(rec,sea,288+i*23)+(rec.use==='open'?baseGarden(rec.terrain.id,293+i*39):art(rec.use,210+i*31))+'</g>';
      const tag=layer==='access'?rec.minutes+' MIN TO CENTRE':layer==='impact'?(rec.pressure?'RENT PRESSURE':rec.disturbed?'DISTURBANCE':rec.use==='care'||rec.use==='water'?'PROTECTED':'NO ACTIVE STRAIN'):rec.target?'WORK IN PROGRESS':rec.use==='open'?(sea?'OPEN DECK':'COMMON GROUND'):PROJECTS[rec.use].category.toUpperCase();
      s+=label(x,y+32,rec.name,'city-map-name')+label(x,y+46,tag,'city-map-detail');
      if(rec.target) s+=path('M'+(x-37)+' '+(y+48)+'h74','#bc9c5d',2.6)+path('M'+(x-37)+' '+(y+48)+'h'+(rec.turns===1?55:24),'#efc478',2.6);
      if(layer==='access' && rec.transit)s+=path('M'+(x-12)+' '+(y-44)+'h24','#d3ddd0',2.2);
      s+=poly(hex(x,y,.956),'transparent',selected?'#fae6ae':'transparent',selected?2.5:1,' class="city-zone-edge"'+nss);
      if(selected)s+=path('M'+(x-10)+' '+(y-SY*.96+2)+'h20','#f6c779',3);
      s+='</g>';
    }
    const [x,y]=CENTRE;
    s+='<g data-city-precinct="centre" class="city-core" role="button" tabindex="0" aria-label="Enter central streets"><title>Enter central streets · '+site.buildings.length+' of nine lots developed</title>';
    s+=poly(hex(x,y,.965),sea?'#829884':'#949779','#acb39d',.9)+poly(hex(x,y,.945),'url(#city-grain)',null)+
      '<g transform="translate('+x+' '+y+')">'+coreArt(site)+'</g>'+
      label(x,y+31,'Central streets','city-map-name city-centre-name')+label(x,y+45,'ENTER STREET VIEW  ↗','city-map-detail')+poly(hex(x,y,.953),'transparent','transparent',2,' class="city-zone-edge"'+nss)+'</g>';
    s+='</svg>';
    return s;
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
    let currentId=null,select=0,layer='land',project='food',busy=false,message='',onMapFocus=false,hasDestroyed=false;
    const scene=make('div','city-scene');
    const heading=make('header','city-chart-head'),headText=make('div');
    headText.append(make('p','kicker','Local planning map'));
    const cityName=make('h2','city-title');headText.append(cityName);
    const scale=make('span','city-chart-scale','Six precincts · One centre');heading.append(headText,scale);
    const picture=make('div','city-picture');
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
    function parcelFrom(el){const tile=el?.closest?.('[data-city-precinct]');return tile ? (tile.dataset.cityPrecinct==='centre'?'centre':Number(tile.dataset.cityPrecinct)) : null;}
    picture.addEventListener('click',ev=>{const n=parcelFrom(ev.target);if(n!==null)choose(n,false);});
    picture.addEventListener('keydown',ev=>{
      const n=parcelFrom(ev.target);if(n===null)return;
      if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(n,true);}
      if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(ev.key)){
        ev.preventDefault();const dir=ev.key==='ArrowRight'||ev.key==='ArrowDown'?1:-1;
        choose(((typeof n==='number'?n:0)+dir+6)%6,true);
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
      const city=model.overview(site),r=city.records[select];
      cityName.textContent=site.name;inspectLink.textContent='Inspect '+r.name+' ↘';
      picture.innerHTML=allMap(site,city,select,layer);fitPicture();
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
          forecast.append(make('span','data-label','When the project opens'),make('strong','',model.flows(projection.rate)?model.flows(projection.rate)+' per week':'Weekly production stays level.'));
          if(projection.capacityNote)forecast.append(make('small','',projection.capacityNote+' residents.'));
          if(projection.accessNote)forecast.append(make('small','',projection.accessNote+' of six.'));
          if(projection.completedView.capacity<site.population)forecast.append(make('small','','Residents keep their homes. Further arrivals pause until more space opens.'));
          if(projection.localFunds)forecast.append(make('small','','Includes '+(projection.localFunds>0?'+':'')+projection.localFunds+' funds from shops in central streets.'));
          if(projection.risk)forecast.append(make('small','',projection.risk>0?'One more precinct faces rent pressure.':'One precinct gains protection against rent pressure.'));
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
      const brief=make('details','city-brief');brief.append(make('summary','','Read the city ledger'));
      const q=model.flows(city.weekly)||'No city production yet';
      brief.append(make('p','','Outer precincts per week: '+q+'.'),
        make('p','','Two crews can work at once. The central streets contain nine smaller lots. Housing changes how many people can settle here. Shared transit shortens journeys in neighbouring precincts.'));
      content.push(brief);
      panel.replaceChildren(...content);
    }
    render();
    return {render,destroy(){hasDestroyed=true;observed?.disconnect();mapRoot.replaceChildren();panel.replaceChildren();}};
  }
  window.EarthCity=Object.freeze({mount});

})();
