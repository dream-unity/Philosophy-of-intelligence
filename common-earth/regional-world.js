/* All regional coordinates are kilometres east and north of the founding town.
   Observer queries never reveal terrain to a town or advance its expeditions. */
(function(root){
  'use strict';
  const cellSize=.5,localRadius=.72,kmPerDegree=111,streetKilometres=.013;
  const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const places=world=>[...(world?.sites||[]),...(world?.communityLife?.outposts||[])];
  const key=(i,j)=>i+','+j;
  const cell=(x,y)=>key(Math.round(x/cellSize),Math.round(y/cellSize));
  const coordinates=new Map();
  function point(id){
    let p=coordinates.get(id);
    if(!p){
      const comma=id.indexOf(',');
      p=Object.freeze({x:Number(id.slice(0,comma))*cellSize,y:Number(id.slice(comma+1))*cellSize});
      if(coordinates.size>=4096)coordinates.clear();
      coordinates.set(id,p);
    }
    return p;
  }
  const inside=(geo,x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=geo.bounds.minX&&x<=geo.bounds.maxX&&y>=geo.bounds.minY&&y<=geo.bounds.maxY;
  const descriptors={
    water:{kind:'water',label:'Open water',good:'food',resource:'fish',facility:'landing',work:'fishing landing'},
    shore:{kind:'shore',label:'Shore',good:'food',resource:'shellfish',facility:'landing',work:'shore landing'},
    meadow:{kind:'meadow',label:'Grassland',good:'food',resource:'field crops',facility:'garden',work:'market garden'},
    woodland:{kind:'woodland',label:'Woodland',good:'materials',resource:'timber',facility:'forestry',work:'woodlot'},
    rock:{kind:'rock',label:'Exposed rock',good:'materials',resource:'stone',facility:'quarry',work:'quarry'}
  };
  const geoCache=new WeakMap(),mapCache=new WeakMap(),lineCache=new WeakMap();
  const surveysByTown=new WeakMap(),chartRevisions=new WeakMap(),streetsByTown=new WeakMap();
  function polarProjection(origin){
    // An azimuthal equidistant chart retains a kilometre and a bearing through
    // the date line and both poles, where a longitude scale collapses.
    const rad=Math.PI/180,radius=6371,phi=origin.lat*rad,lambda=origin.lon*rad;
    const sp=Math.sin(phi),cp=Math.cos(phi),sl=Math.sin(lambda),cl=Math.cos(lambda);
    function locate(x,y){
      const d=Math.hypot(x,y);if(d<1e-12)return {lat:origin.lat,lon:origin.lon};
      const arc=d/radius,up=Math.cos(arc),east=Math.sin(arc)*x/d,north=Math.sin(arc)*y/d;
      const vx=(up*cp-north*sp)*cl-east*sl,vy=(up*cp-north*sp)*sl+east*cl,vz=up*sp+north*cp;
      return {lat:Math.atan2(vz,Math.hypot(vx,vy))/rad,lon:Math.atan2(vy,vx)/rad};
    }
    function project(p){
      const lat=p.lat*rad,d=(p.lon-origin.lon)*rad,c=Math.cos(lat),s=Math.sin(lat);
      const east=c*Math.sin(d),north=cp*s-sp*c*Math.cos(d),up=sp*s+cp*c*Math.cos(d),h=Math.hypot(east,north);
      const scale=h>1e-12?radius*Math.atan2(h,up)/h:radius;return {x:east*scale,y:north*scale};
    }
    return {project,locate};
  }
  function geography(world,site){
    if(!world||!site)return null;
    const originId=site.communityLife?.cluster||site.id;
    let group=geoCache.get(world);if(!group){group=new Map();geoCache.set(world,group);}
    const cached=group.get(originId),outposts=world.communityLife?.outposts,atlasReady=!!root.EarthAtlas?.geographyLoaded;
    if(cached&&cached.atlasReady===atlasReady&&cached.surveys.every(t=>t.water===t.site.water&&t.coastal===t.site.coastal&&t.lake===t.site.lakeShore)&&cached.first===world.sites[0]&&cached.lastSite===world.sites.at(-1)&&cached.lastOutpost===outposts?.at(-1)&&cached.siteCount===world.sites.length&&cached.outpostCount===(outposts?.length||0))return cached;
    const all=places(world),origin=all.find(s=>s.id===originId)||world.communityLife?.retired?.[originId]||site;
    const lonScale=kmPerDegree*Math.max(.01,Math.cos(origin.lat*Math.PI/180));
    let project=loc=>({x:(((loc.lon-origin.lon+540)%360)-180)*lonScale,y:(loc.lat-origin.lat)*kmPerDegree});
    let locate=(x,y)=>({lat:clamp(origin.lat+y/kmPerDegree,-89.99999,89.99999),lon:((origin.lon+x/lonScale+540)%360)-180});
    const saved=world.regionalWorld?.regions[originId],polar=Math.abs(origin.lat)>85&&(!saved||saved.projection==='polar');
    if(polar)({project,locate}=polarProjection(origin));
    const towns=all.filter(s=>(s.communityLife?.cluster||s.id)===origin.id).map(s=>({site:s,...project(s)}));
    if(!towns.some(t=>t.site.id===site.id))towns.push({site,...project(site)});
    const extent=Math.max(10,...towns.map(t=>Math.ceil(Math.max(Math.abs(t.x),Math.abs(t.y))+3)));
    const bounds={minX:-extent,maxX:extent,minY:-extent,maxY:extent};
    // The inaugural settlement footprints were surveyed by the old street engine.
    // Preserve their coastlines. Later development never moves the underlying coast.
    const surveys=towns.filter(t=>t.site===origin||t.site.id.startsWith('near-'+origin.id+'-')).map(t=>({...t,
      water:t.site.water,coastal:t.site.coastal,lake:t.site.lakeShore,quay:!!(t.site.water||t.site.coastal||t.site.lakeShore||root.CommonEarthSim?.waterfront?.(t.site))}));
    const g={origin,towns,bounds,cellSize,lonScale,project,locate,surveys,atlasReady,polar,
      first:world.sites[0],lastSite:world.sites.at(-1),lastOutpost:outposts?.at(-1),siteCount:world.sites.length,outpostCount:outposts?.length||0,
      habitat:root.EarthResources?.environment?.(origin)||'mixed',
      tidal:!!(origin.coastal||origin.lakeShore||root.CommonEarthSim?.waterfront?.(origin)),
      seed:Math.sin(origin.lat*7.31+origin.lon*5.53)*19,macro:new Map(),terrainCells:new Map(),dryEdges:new Map(),townJurisdictions:new Map()};
    group.set(origin.id,g);return g;
  }
  function reconcileLocations(world){
    // Some early breakaway households inherited the identical atlas pin.
    // Retain the first settlement and put later households on the closest
    // unused, compatible ground. The actual saved latitude/longitude changes
    // once, so regional travel and the world atlas agree on every later load.
    const groups=new Map(),all=places(world);
    for(const origin of all){
      if(Math.abs(origin.lat)<=85||origin.id!==origin.communityLife?.cluster||world.regionalWorld?.regions[origin.id])continue;
      for(let i=0;i<3;i++){
        const site=all.find(s=>s.id==='near-'+origin.id+'-'+i),near=root.EarthCommunityLife?.nearLocation;
        if(!site||!near)continue;
        const old=near(origin,i,true);
        if(Math.abs(site.lat-old.lat)>1e-8||Math.abs(site.lon-old.lon)>1e-8)continue;
        const moved=near(origin,i),chart=polarProjection(origin),p=chart.project(moved);
        if(all.some(other=>other!==site&&dist(chart.project(other),p)<1.2))continue;
        site.birthCoordinate??={lat:site.lat,lon:site.lon};site.lat=moved.lat;site.lon=moved.lon;geoCache.delete(world);
      }
    }
    for(const site of all){
      const k=(site.communityLife?.cluster||site.id)+'/'+site.lat.toFixed(7)+'/'+(((site.lon+540)%360)-180).toFixed(7);
      if(!groups.has(k))groups.set(k,[]);groups.get(k).push(site);
    }
    for(const group of groups.values()){
      if(group.length<2)continue;
      group.sort((a,b)=>Number(b.communityLife?.cluster===b.id)-Number(a.communityLife?.cluster===a.id)||
        a.founded-b.founded||a.id.localeCompare(b.id));
      const first=group[0];
      for(const site of group.slice(1)){
        const geo=geography(world,first),base=geo.project(first);
        let hash=0;for(const c of site.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
        const phase=(hash%360)*Math.PI/180;
        let chosen=null;
        for(const radius of [1.35,1.85,2.5,3.5,4.75]){
          for(let n=0;n<24;n++){
            const t=phase+n*Math.PI/12,x=base.x+Math.cos(t)*radius,y=base.y+Math.sin(t)*radius;
            if(!inside(geo,x,y)||(terrain(geo,x,y).kind==='water')!==site.water)continue;
            if(all.some(other=>other!==site&&dist(geo.project(other),{x,y})<1.2))continue;
            chosen=geo.locate(x,y);break;
          }
          if(chosen)break;
        }
        if(chosen){
          // A founding coordinate seeded native identities, aptitudes and career limits.
          site.birthCoordinate??={lat:site.lat,lon:site.lon};
          site.lat=chosen.lat;site.lon=chosen.lon;geoCache.delete(world);
        }
      }
    }
  }
  const macroPlanes=new WeakMap();
  function macroHeight(geo,x,y){
    const ix=Math.floor(x/4),iy=Math.floor(y/4),u=x/4-ix,v=y/4-iy;
    function sample(i,j){
      const id=key(i,j);if(geo.macro.has(id))return geo.macro.get(id);
      const water=root.EarthRouteTerrain?.waterAt(geo.locate(i*4,j*4))??geo.origin.water;
      const value=water?-1:1;geo.macro.set(id,value);return value;
    }
    // Adjacent pixels and route probes usually share the same four atlas
    // samples. Interpolate in the same order used for settlement and travel.
    let plane=macroPlanes.get(geo);
    if(!plane||plane.x!==ix||plane.y!==iy){
      plane={x:ix,y:iy,sw:sample(ix,iy),se:sample(ix+1,iy),nw:sample(ix,iy+1),ne:sample(ix+1,iy+1)};
      macroPlanes.set(geo,plane);
    }
    const a=plane.sw*(1-u)+plane.se*u,b=plane.nw*(1-u)+plane.ne*u;
    return a*(1-v)+b*v;
  }
  function terrain(geo,x,y,surface){
    const s=geo.seed;
    const ridge=Math.sin(.8*x+.42*y+s)+.58*Math.cos(.53*x-.94*y-s)+.3*Math.sin(2*x+.87*y);
    let nearest=null,minDistance=Infinity;
    for(const t of geo.surveys){const d=(t.x-x)**2+(t.y-y)**2;if(d<minDistance){nearest=t;minDistance=d;}}
    const local=geo.origin.water?-1:1,macro=macroHeight(geo,x,y);
    // The atlas supplies the broad landmass. At this scale its pixels cannot
    // resolve tidal inlets, river valleys or the surveyed settlement footprint.
    let height=.35*macro+.65*local+.37*ridge;
    if(!geo.origin.water){
      const channel=Math.abs(y+2.1+.29*x-1.1*Math.sin(x*.7+s));
      if(geo.tidal){
        height=Math.min(height,(channel-.66)*.85+.12*ridge);
      }else height=Math.min(height,(channel-.14)*1.8+.1);
    }
    if(nearest&&minDistance<1.96){
      const dx=x-nearest.x,dy=y-nearest.y;
      const influence=clamp((1.4-Math.sqrt(minDistance))/.85,0,1);
      // In the town's isometric street coordinates the established quay runs
      // along local y=25, southwest across the north-up map. Blend that exact
      // waterline into the surveyed inlet/river as the street recedes.
      const shoreHeight=clamp((dx+dy+.34)*3.4,-.76,.68);
      const surveyed=nearest.quay?shoreHeight:.65;
      if(nearest.site.water){
        // Water settlements have a compact working platform and open water
        // throughout the rest of their surroundings.
        height=Math.min(height,shoreHeight);
      }else height=height*(1-influence)+surveyed*influence;
    }
    const canopy=Math.sin(1.2*x-.63*y+s)+Math.cos(.65*y+.45*x)+.55*ridge;
    const descriptor=height<-.07?descriptors.water:height<.09?descriptors.shore:
      ridge>1.12?descriptors.rock:canopy>.38?descriptors.woodland:descriptors.meadow;
    if(surface){
      surface.kind=descriptor.kind;surface.height=height;return surface;
    }
    if(descriptor.kind==='water'&&geo.origin.water&&canopy>1.2)
      return {...descriptor,height,good:'materials',resource:'driftwood',work:'salvage landing'};
    if(descriptor.kind==='meadow'){
      const crop=geo.habitat==='cold'?'hardy roots':geo.habitat==='dry'?'millet':'field crops';
      return {...descriptor,height,resource:crop};
    }
    return {...descriptor,height};
  }
  const waterSurface={};
  function sailingWater(geo,town,x,y){
    // The detailed quay replaces the survey raster at the waterfront.
    if(x>=-1.5&&x<=25.5&&y>25.5&&y<=39)return true;
    const east=town.x+(x-y)*streetKilometres,north=town.y-(x+y-24)*streetKilometres;
    for(const other of geo.towns){
      const dx=east-other.x,dy=north-other.y;
      if(Math.abs(dx)+Math.abs(dy)<=27*streetKilometres)return false;
    }
    return terrain(geo,east,north,waterSurface).kind==='water';
  }
  function terrainCell(geo,id){
    if(!geo.terrainCells.has(id)){const p=point(id);geo.terrainCells.set(id,terrain(geo,p.x,p.y));}
    return geo.terrainCells.get(id);
  }
  const townFor=(geo,id)=>geo?.towns.find(t=>t.site.id===id);
  const regionFor=(world,geo)=>world.regionalWorld?.regions?.[geo.origin.id];
  function known(world,site,communityId,x,y){
    const geo=geography(world,site),home=townFor(geo,communityId);if(!home||!inside(geo,x,y))return false;
    const i=Math.round(x/cellSize),j=Math.round(y/cellSize);
    return (home.x-i*cellSize)**2+(home.y-j*cellSize)**2<=localRadius**2||!!regionFor(world,geo)?.knowledge?.[communityId]?.[key(i,j)];
  }
  function surveyedCells(world,site,communityId){
    const geo=geography(world,site),home=townFor(geo,communityId);
    if(!home)return [];
    const marks=regionFor(world,geo)?.knowledge?.[communityId],revision=marks?chartRevisions.get(marks)||0:0;
    const cached=surveysByTown.get(home);
    if(cached&&cached.marks===marks&&cached.revision===revision)return cached.cells;
    const ids=new Set(Object.keys(marks||{})),centre=point(cell(home.x,home.y));
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
      const p={x:centre.x+i*cellSize,y:centre.y+j*cellSize};
      if(dist(p,home)<=localRadius)ids.add(cell(p.x,p.y));
    }
    const cells=[...ids].map(point).filter(p=>inside(geo,p.x,p.y));
    surveysByTown.set(home,{marks,revision,cells});return cells;
  }
  function marks(world,site){
    const geo=geography(world,site),r=geo&&regionFor(world,geo);
    if(!r)return {works:[],routes:[]};
    const step=world.regionalWorld.step,revision=r.mapRevision||0;
    let cached=mapCache.get(r);
    if(cached&&cached.step===step&&cached.revision===revision)return cached;
    const works=Object.entries(r.parcels).flatMap(([id,v])=>[...(v.work?[{...point(id),...v.work,siteId:v.owner}]:[]),...(v.trail?[v.trail]:[])]);
    const routes=Object.values(r.routes).map(route=>({...route,points:route.path.map(point),
      closed:r.contacts[pair(route.siteId,route.target)]?.terms==='disputed',
      mode:townFor(geo,route.siteId)?.site.water?'water':'land'}));
    cached={step,revision,works,routes};mapCache.set(r,cached);return cached;
  }
  const works=(world,site)=>marks(world,site).works;
  const routes=(world,site)=>marks(world,site).routes;
  const pair=(a,b)=>[a,b].sort().join('/');
  const records=(r,k)=>Object.entries(r?.[k]||{});
  const titles={survey:'Survey',gather:'Gather',build:'Build',trail:'Improve the passage',parley:'Ask for a passage meeting',found:'Found a settlement'};
  const costs={
    survey:{food:1,materials:0,funds:1},gather:{food:1,materials:0,funds:1},
    build:{food:1,materials:3,funds:2},trail:{food:1,materials:2,funds:2},parley:{food:2,materials:1,funds:2},found:{food:5,materials:4,funds:4}
  };
  function reserve(world,site){
    const held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    const publicFloor=root.EarthCivicInitiatives?.reserve?.(world,site)||{};
    return {food:Math.max(Math.ceil(site.population/5)*2,publicFloor.food||0)+(held.food||0),
      materials:(publicFloor.materials||0)+(held.materials||0),funds:(publicFloor.funds||0)+(held.funds||0)};
  }
  function state(world,geo){
    const book=world.regionalWorld||={version:1,step:0,week:world.week,regions:{}};
    return book.regions[geo.origin.id]||={...(geo.polar?{projection:'polar'}:{}),knowledge:{},parcels:{},routes:{},trips:{},contacts:{},records:[]};
  }
  function record(world,r,site,text,actor){
    const entry={week:world.week,step:world.regionalWorld.step,siteId:site.id,text};
    if(actor)Object.assign(entry,{personId:actor.personId,name:actor.name});
    if(actor?.phase==='working'&&actor.path?.[actor.index]===actor.target&&r.knowledge[site.id]?.[actor.target]){
      const witness=root.EarthPersonas?.profile?.(site,actor.personId);
      if(witness?.identityKey)Object.assign(entry,{fieldCell:actor.target,witnessKey:witness.identityKey});
    }
    r.records.unshift(entry);if(r.records.length>48)r.records.pop();
    root.EarthCommunityLife?.recordWeek?.(site,world.week,text);
    return text;
  }
  function reveal(world,r,geo,siteId,id){
    const knowledge=r.knowledge[siteId]||={};
    // Only physical presence, or a named exchange of these observations, writes here.
    if(!Object.hasOwn(knowledge,id)){
      knowledge[id]=world.week;
      chartRevisions.set(knowledge,(chartRevisions.get(knowledge)||0)+1);
    }
  }
  function nearestTown(geo,p,limit){
    let best=null,min=limit;
    for(const t of geo.towns){const d=dist(p,t);if(d<=min){best=t;min=d;}}
    return best;
  }
  function streetExtent(site){
    const growth=site.growth,rows=growth?.households||[],cached=streetsByTown.get(site);
    const tLevel=Math.max(site.territoryLevel||0,site.freeLand?.tier||0);
    const extraCount=(site.freeBuildings?.length||0)+(site.playerHouses?.length||0)+(site.freeLand?.buildings?.length||0);
    if(cached&&cached.round===growth?.round&&cached.count===rows.length&&cached.tLevel===tLevel&&cached.extraCount===extraCount)return cached;
    const plots=[],model=root.EarthDistrictGrowth;
    let radius=.52;
    function add(p){
      if(!p)return;
      plots.push(p);
      radius=Math.max(radius,(Math.max(Math.abs(p.x-p.y),Math.abs(p.x+p.y-24))+5)*streetKilometres);
    }
    const mbLayout=root.EarthMilitaryBase?.layoutFor?.(site);
    add({x:27,y:12});
    if(tLevel>0){
      add(mbLayout?.place||root.EarthMilitaryBase?.place);
      const rw=mbLayout?.runway||root.EarthMilitaryBase?.runway;
      if(rw){
        add({x:rw.x,y:rw.yStart??rw.startY??0});
        add({x:rw.x,y:12});
        add({x:rw.x,y:rw.yEnd??rw.endY??24});
      }
    }
    for(const fb of site.freeLand?.buildings||[])add({x:fb.x,y:fb.y});
    for(const fb of site.freeBuildings||[])add({x:fb.x,y:fb.y});
    for(const ph of site.playerHouses||[])add({x:ph.x,y:ph.y});
    for(const h of rows){
      add(h.houseSite||model?.homePoint(site,h.plot));
      if(h.shop)add(h.shopSite||model?.shopPoint(site,h.businessPlot));
      if(h.build?.shop)add(model?.shopPoint(site,h.build.lot));
    }
    for(const h of site.civicLand?.homes||[])add(root.EarthCouncilHomes.plot(h.plot));
    if(site.civicLand?.project)add(root.EarthCouncilHomes.plot(site.civicLand.project.plot));
    const extent={round:growth?.round,count:rows.length,tLevel,extraCount,plots,radius};streetsByTown.set(site,extent);return extent;
  }
  function streetFootprint(geo,x,y){
    let nearest=null,best=Infinity;
    for(const t of geo.towns){
      const {radius,plots,tLevel}=streetExtent(t.site),dx=x-t.x,dy=y-t.y;
      if(Math.abs(dx)>radius||Math.abs(dy)>radius)continue;
      const sx=12+(dx-dy)/(2*streetKilometres),sy=12-(dx+dy)/(2*streetKilometres);
      const expand=(tLevel||0)*6;
      const streets=tLevel>0
        ? sx>=-7.5-expand&&sx<=27.5+expand&&sy>=-7.5-expand&&sy<=25.2+(t.site.waterfront?0:2.3+expand)
        : sx>=-1.8&&sx<=25.8&&sy>=-1.8&&sy<=25.2;
      if(!streets&&!plots.some(p=>Math.abs(sx-p.x)<=1.8&&Math.abs(sy-p.y)<=1.8))continue;
      const d=dx*dx+dy*dy;if(d<best){best=d;nearest=t;}
    }
    return nearest;
  }
  function tenure(geo,r,id){
    const lot=r?.parcels[id];
    let incorporated=geo.townJurisdictions.get(id);
    if(incorporated===undefined){
      incorporated=nearestTown(geo,point(id),.54)?.site.id||null;
      geo.townJurisdictions.set(id,incorporated);
    }
    const occupier=incorporated&&townFor(geo,incorporated)?.site.communityLife?.border?.occupiedBy;
    return {parcel:lot,owner:lot?.owner||null,jurisdiction:(lot?.occupation&&lot.charter)||occupier||incorporated||lot?.charter||null,
      claims:Object.keys(lot?.claims||{})};
  }
  function localAgreement(r,a,b,id){
    const k=pair(a,b),latest=r?.contacts[k];
    return latest?.cell===id?latest:r?.parcels[id]?.agreements?.[k];
  }
  function saveAgreement(r,k,meeting){
    const old=r.contacts[k];
    // Keep the earlier parcel's terms even when the next council meeting
    // concerns a different site. One landholder cannot grant a blanket title.
    for(const pact of [old,meeting])if(pact){
      const parcel=newParcel(r,pact.cell);
      (parcel.agreements||={})[k]={a:pact.a,b:pact.b,terms:pact.terms,week:pact.week};
    }
    r.contacts[k]=meeting;
  }
  function passage(geo,r,siteId,id){
    const {parcel,owner,jurisdiction,claims}=tenure(geo,r,id);
    if(parcel?.occupation&&jurisdiction===siteId&&(!owner||owner===siteId))return true;
    for(const other of new Set([owner,jurisdiction,...claims])){
      if(!other||other===siteId)continue;
      const pact=localAgreement(r,siteId,other,id);
      if(pact?.terms==='disputed')return false;
    }
    return true;
  }
  function harvestRights(geo,r,siteId,id){
    const {parcel,owner,jurisdiction,claims}=tenure(geo,r,id);
    if(parcel?.occupation&&jurisdiction===siteId&&(!owner||owner===siteId))return true;
    for(const other of new Set([owner,jurisdiction,...claims])){
      if(!other||other===siteId)continue;
      const agreement=localAgreement(r,siteId,other,id);
      if(agreement?.terms==='disputed')return false;
      if((owner===other||jurisdiction===other)&&agreement?.terms!=='joint')return false;
    }
    return true;
  }
  function buildingRights(geo,r,siteId,id){
    if(!harvestRights(geo,r,siteId,id))return false;
    const {claims,parcel}=tenure(geo,r,id);
    if(parcel?.occupation&&parcel.charter===siteId)return true;
    return claims.every(other=>other===siteId||localAgreement(r,siteId,other,id)?.terms==='joint');
  }
  function nodeCost(geo,r,town,id,byWater,knownOpen=false){
    if(!knownOpen&&!passage(geo,r,town.site.id,id))return Infinity;
    const ground=terrainCell(geo,id);
    if(ground.kind==='water'&&!byWater)return Infinity;
    const cost=r?.parcels[id]?.trail?.level ? .65 : ground.kind==='rock'?2.1:ground.kind==='woodland'?1.35:ground.kind==='water'?1.25:1;
    // Routes recorded by a resident make finding the next dry-land marker
    // quicker. Published notes confer neither a boat nor permission to pass.
    return ground.kind!=='water'&&root.EarthPractice?.waymarked?.(town.site,id)?Math.max(.6,cost-.15):cost;
  }
  function canSail(town,r){
    return town.site.water||town.site.coastal||town.site.lakeShore||town.site.buildings?.some(b=>b.kind==='pier')||
      root.CommonEarthSim?.waterfront?.(town.site)||Object.values(r?.parcels||{}).some(p=>p.owner===town.site.id&&p.work?.kind==='landing');
  }
  function dryEdge(geo,from,to){
    const id=from<to?from+'/'+to:to+'/'+from;
    if(geo.dryEdges.has(id))return geo.dryEdges.get(id);
    const a=point(from),b=point(to);
    // A narrow inlet can cross the segment between two dry parcel centres.
    // Survey its intervening ground before treating the edge as a road.
    const clear=[.25,.5,.75].every(f=>terrain(geo,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f).kind!=='water');
    geo.dryEdges.set(id,clear);return clear;
  }
  function pathTo(geo,r,town,from,to,mode){
    if(from===to)return [from];
    const start=point(from),end=point(to);if(!inside(geo,end.x,end.y))return null;
    const byWater=mode!=='van'&&!!canSail(town,r),sailing=town.site.water,knownCells=r?.knowledge?.[town.site.id]||{},exploring=mode==='survey';
    const mapped=(id,p)=>knownCells[id]||dist(town,p)<=localRadius;
    // Restrictions and terrain are fixed for this synchronous route search.
    const prices=new Map(),contested=new Set();
    for(const meeting of Object.values(r?.contacts||{}))if(meeting.terms==='disputed')contested.add(meeting.cell);
    function price(id){
      const cached=prices.get(id);if(cached!==undefined)return cached;
      const knownOpen=!contested.has(id)&&!r?.parcels[id]?.agreements;
      const cost=nodeCost(geo,r,town,id,byWater,knownOpen);
      prices.set(id,cost);return cost;
    }
    if((!exploring||mapped(to,end))&&!Number.isFinite(price(to)))return null;
    const open=[{id:from,priority:dist(start,end)/cellSize}],cost=new Map([[from,0]]),parent=new Map(),done=new Set();
    const directions=[[1,0],[-1,0],[0,1],[0,-1]];
    // Binary heap, ordered by estimated total walking / sailing time.
    function insert(value){
      let i=open.length;open.push(value);
      while(i){const k=(i-1)>>1;if(open[k].priority<=value.priority)break;open[i]=open[k];i=k;}
      open[i]=value;
    }
    function take(){
      const first=open[0],last=open.pop();if(!open.length)return first;
      let i=0;
      while(i*2+1<open.length){
        let c=i*2+1;if(c+1<open.length&&open[c+1].priority<open[c].priority)c++;
        if(open[c].priority>=last.priority)break;open[i]=open[c];i=c;
      }
      open[i]=last;return first;
    }
    // A single regional planning decision remains bounded on an old, sprawling map.
    for(let budget=0;open.length&&budget<4096;budget++){
      const current=take().id;if(done.has(current))continue;done.add(current);
      if(current===to){
        const path=[to];while(path.at(-1)!==from)path.push(parent.get(path.at(-1)));
        return path.reverse();
      }
      const p=point(current);
      for(const [di,dj] of directions){
        const x=p.x+di*cellSize,y=p.y+dj*cellSize,id=cell(x,y);
        if(done.has(id)||!inside(geo,x,y))continue;
        const examined=!exploring||mapped(id,{x,y});
        if(examined&&!byWater&&!dryEdge(geo,current,id))continue;
        // A scout can choose a bearing into unknown country. Its actual
        // conditions enter the community record when the crew reaches it.
        const terrainCost=examined?price(id):1.55;
        const next=cost.get(current)+terrainCost+(knownCells[id]?0:.1)+(sailing&&examined&&terrainCell(geo,id).kind!=='water'?.25:0);
        if(!Number.isFinite(next)||next>=(cost.get(id)??Infinity))continue;
        cost.set(id,next);parent.set(id,current);
        insert({id,priority:next+.6*(Math.abs(x-end.x)+Math.abs(y-end.y))/cellSize});
      }
    }
    return null;
  }
  function candidates(world,site,kind){
    if(kind==='found')return root.EarthCommunityLife?.volunteers?.(site,world)||[];
    const ids=root.EarthCommunityLife?.fieldCandidates?.(site,world)||[];
    const geo=geography(world,site),regional=regionFor(world,geo),axis=kind==='parley'?'communication':kind==='build'||kind==='trail'?'craft':'stamina';
    const last=regional?.records.find(n=>n.siteId===site.id&&n.personId);
    return ids.map(id=>root.EarthPersonas?.profile(site,id)).filter(p=>p&&p.id!=='steward'&&p.id!=='driver')
      .map(p=>({id:p.id,name:p.name,score:(kind==='survey'?p.traits.curiosity+p.aptitudes.stamina:
        kind==='build'||kind==='trail'?p.aptitudes.craft+p.traits.patience:kind==='parley'?p.aptitudes.communication+p.traits.sociability:p.aptitudes.stamina+p.traits.initiative)-
        (root.EarthCommunityLife?.wasDelegate?.(site,p.id)?36:0)+(site.careers?.[p.id]?.skills?.[axis]??p.aptitudes[axis])*.2+
        (p.hobbyAxis===axis?8:0)-(last?.personId===p.id&&world.regionalWorld.step-last.step<4?22:0)}))
      .filter(p=>p.score>=65).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  }
  function checks(world,geo,r,town,kind,id,options={}){
    if(!town)return 'The sponsoring community is outside this region.';
    const site=town.site,p=options.target||point(id),lot=r?.parcels[id];
    if(r?.trips[site.id])return 'The field crew is still away. Their current work and supplies are committed.';
    if(!inside(geo,p.x,p.y))return 'This point lies beyond the region.';
    const local=streetFootprint(geo,p.x,p.y);
    if(!['survey','parley','trail'].includes(kind)&&local)return local.site.name+' manages this ground through its town lots.';
    const seen=known(world,site,site.id,p.x,p.y);
    if(kind!=='survey'&&!seen)return 'A resident needs to survey this ground and report its use first.';
    if(kind==='survey'&&local?.site.id===site.id)return 'The home streets are already mapped.';
    if(kind==='gather'&&!harvestRights(geo,r,site.id,id))return 'The crew needs an agreement with the households using this ground.';
    if(kind==='build'&&(lot?.work||!buildingRights(geo,r,site.id,id)))return lot?.work?'A working facility already occupies this site.':'Other users must agree before work can begin.';
    if(kind==='parley'&&!counterpart(geo,r,town,id))return 'There is no neighbouring claim, agreement or household to meet here.';
    if(kind==='trail'){
      if(lot?.trail)return 'The access crew has already improved this passage.';
      if(!lot?.traffic||Object.values(lot.traffic).reduce((n,v)=>n+v,0)<3)return 'The council needs evidence of repeated passage before funding a route improvement.';
      if(!buildingRights(geo,r,site.id,id))return 'Other claimants need to agree to joint use before a shared route can be improved.';
    }
    if(kind==='found'){
      if(nearestTown(geo,p,1.25))return 'The founding households need space beyond an existing settlement.';
      if(lot?.owner||!buildingRights(geo,r,site.id,id))return 'Founders need an unoccupied site with agreed access.';
      if(site.population<6)return 'Too few households can remain to cover the home rota.';
      if(terrain(geo,p.x,p.y).kind==='water'&&!site.water)return 'A land-based founding group needs a shore or dry ground.';
    }
    const floor=options.floor||reserve(world,site),kit=costs[kind];
    for(const k of ['food','materials','funds'])if(site[k]-kit[k]<floor[k])return 'Reserve '+kit[k]+' '+k+' for the crew after protecting the home commitment of '+floor[k]+'.';
    if(options.crew&&options.crew.length<(kind==='found'?2:1))return kind==='found'?
      'Two willing residents with food and repair skills need cover for their present obligations.':'No available resident agreed to leave their commitments for this work.';
    return '';
  }
  function inspect(world,site,x,y,communityId=world.communityLife?.homeId||site?.id){
    const geo=geography(world,site);if(!geo||!inside(geo,x,y))return null;
    const r=regionFor(world,geo),id=cell(x,y),p=point(id),ground=terrain(geo,x,y);
    const {parcel,owner,jurisdiction,claims}=tenure(geo,r,id),townName=s=>townFor(geo,s)?.site.name||s;
    const agreements=Object.values(parcel?.agreements||{}).map(a=>localAgreement(r,a.a,a.b,id));
    const uses=Object.entries(parcel?.uses||{}).map(([s,count])=>({id:s,name:townName(s),count}));
    const knowledge=geo.towns.filter(t=>known(world,site,t.site.id,x,y)).map(t=>({id:t.site.id,name:t.site.name,week:r?.knowledge[t.site.id]?.[id]||t.site.founded}));
    const home=townFor(geo,world.communityLife?.homeId||world.activeId),names=claims.map(townName);
    const actor=places(world).find(s=>s.id===world.activeId);
    const authority=home&&home.site.id===world.activeId&&(root.EarthAgency?.actorId?.(actor)||'steward')==='steward'&&!world.communityLife?.journey;
    const summary=[ground.label+' · '+ground.resource+'.',knowledge.length?'Mapped by '+knowledge.map(v=>v.name).join(', ')+'.':'No community has recorded this ground.',
      owner?'The '+(parcel?.work?.label||'site')+' belongs to '+townName(owner)+'.':'',jurisdiction?'Local authority: '+townName(jurisdiction)+'.':'',
      parcel?.occupation?'Military occupation by '+townName(parcel.charter)+' since week '+parcel.occupation+'.':'',
      names.length?'Recorded use claims: '+names.join(', ')+'.':'',...agreements.map(a=>townName(a.a)+' and '+townName(a.b)+' recorded '+(a.terms==='joint'?'shared use':a.terms)+' for this parcel in week '+a.week+'.')].filter(Boolean).join(' ');
    const choices=Object.entries(titles).filter(([kind])=>
      kind==='parley'?!!(home&&counterpart(geo,r,home,id)):kind==='trail'?!!parcel?.traffic:true).map(([kind,title])=>{
      const reason=!authority?'Only the original character’s home community can sponsor this proposal.':
        checks(world,geo,r,home,kind,id,{target:{x,y}});
      return {kind,label:kind==='survey'?'Propose a survey':kind==='gather'?'Gather '+ground.resource:kind==='build'?'Propose a '+ground.work:title,available:!reason,reason};
    });
    const routeNote=home?.site.practice?.wayfinding?.[id]||null;
    return {id,x,y,kind:ground.kind,label:ground.label,resource:ground.resource,routeNote,known:knowledge.some(v=>v.id===communityId),summary,knowledge,uses,
      claims:names,agreements,owner:owner?townName(owner):null,jurisdiction:jurisdiction?townName(jurisdiction):null,project:parcel?.work||null,choices};
  }
  function newParcel(r,id){return r.parcels[id]||={uses:{}};}
  function travelWitnesses(r,geo,id,siteId){
    const close=nearestTown(geo,point(id),.64);
    const out=new Set(close?[close.site.id]:[]);
    // Shared evidence of sustained work can introduce two households even when
    // their shifts differ. A single isolated discovery never signs an accord.
    const p=r.parcels[id];
    if(p?.owner)out.add(p.owner);
    for(const [other,n] of Object.entries(p?.uses||{}))if(n>=2)out.add(other);
    for(const trip of Object.values(r.trips))if(trip.path[trip.index]===id)out.add(trip.siteId);
    out.delete(siteId);return out;
  }
  function contact(world,geo,r,town,otherId,id,trip){
    const other=townFor(geo,otherId)?.site;if(!other)return;
    const home=town.site,k=pair(home.id,otherId),old=r.contacts[k],now=world.regionalWorld.step;
    if(old&&(old.step>=now-2||old.reviewWeek>world.week))return;
    // Passing a surveyor cannot end a war. A parley can still negotiate a settlement.
    const a=home.communityLife?.border,b=other.communityLife?.border;
    if(a?.campaign?.against===other.id||b?.campaign?.against===home.id||
      old?.terms==='disputed'&&(a?.foothold?.by===other.id||b?.foothold?.by===home.id))return;
    const lot=r.parcels[id],resource=terrainCell(geo,id).good;
    const pressure=(site)=>site[resource]<=(resource==='food'?Math.ceil(site.population/5)*2+2:5);
    const bothNeed=pressure(home)&&pressure(other),uses=lot?.uses||{},rivals=(uses[home.id]||0)+(uses[other.id]||0)>=2;
    const trust=clamp(Math.round((home.trust+other.trust)/2)+(old?.terms==='joint'?5:0)-
      (rivals&&bothNeed?14:0)+(old?.meetings>=2?3:0),0,100);
    const terms=(rivals&&bothNeed&&trust<48||Math.min(home.trust,other.trust)<25&&rivals)?'disputed':
      trust>=61&&!bothNeed?'joint':trust>=45&&home.specialty!==other.specialty?'exchange':'passage';
    const previous=localAgreement(r,home.id,otherId,id)?.terms;
    const detail=terms==='disputed'?'Both work parties depend on this '+terrainCell(geo,id).label.toLowerCase()+
      '. Access at this parcel is suspended while the district meetings consider their rival use.':
      terms==='joint'?'The councils allow one another to use this ground and add its adjoining survey marks to their maps.':
      terms==='exchange'?'The councils recognise passage and deliveries between their different local trades.':
      'The residents recognise passage here. Collecting resources or building still needs separate agreement.';
    if(previous!==terms)r.mapRevision=(r.mapRevision||0)+1;
    saveAgreement(r,k,{a:home.id,b:other.id,terms,trust,cell:id,meetings:(old?.meetings||0)+1,step:now,week:world.week,detail});
    reveal(world,r,geo,home.id,id);reveal(world,r,geo,other.id,id);
    if(terms==='joint'){
      // Neighbours share the route they have just taken. Their unexplored
      // hinterlands stay separate.
      for(const routeCell of trip.path.slice(0,trip.index+1))reveal(world,r,geo,other.id,routeCell);
      for(const otherCell of Object.keys(r.knowledge[other.id]||{}))if(dist(point(otherCell),point(id))<=1)
        reveal(world,r,geo,home.id,otherCell);
    }
    if(terms!==previous){
      const text=home.name+' and '+other.name+' recorded '+(terms==='joint'?'shared use':terms==='exchange'?'an exchange agreement':terms==='disputed'?'a disputed claim':'a passage agreement')+' at '+id+'. '+detail;
      record(world,r,home,text,trip);record(world,r,other,text);
      if(terms==='disputed'){
        home.trust=Math.max(0,home.trust-1);other.trust=Math.max(0,other.trust-1);
      }
    }
  }
  function witness(world,geo,r,town,trip,id){
    reveal(world,r,geo,town.site.id,id);
    const parcel=newParcel(r,id),traffic=parcel.traffic||={};
    traffic[town.site.id]=Math.min(65535,(traffic[town.site.id]||0)+1);
    const p=point(id);
    // A crew can see the immediate surroundings from the route it traverses.
    for(const [dx,dy] of [[cellSize,0],[-cellSize,0],[0,cellSize],[0,-cellSize]]){
      if(inside(geo,p.x+dx,p.y+dy))reveal(world,r,geo,town.site.id,cell(p.x+dx,p.y+dy));
    }
    for(const other of travelWitnesses(r,geo,id,town.site.id))contact(world,geo,r,town,other,id,trip);
  }
  function passageAgreement(world,from,to){
    if(!from||!to)return false;
    const geo=geography(world,from),r=regionFor(world,geo);
    const deal=r?.contacts[pair(from.id,to.id)];
    return deal?.terms!=='disputed';
  }
  function counterpart(geo,r,town,id){
    const {parcel,owner,claims,jurisdiction}=tenure(geo,r,id);
    const relevant=[...Object.values(parcel?.agreements||{}),...records(r,'contacts').map(([,c])=>c).filter(c=>c.cell===id)].filter(c=>c.a===town.site.id||c.b===town.site.id);
    const ids=[...relevant.map(c=>c.a===town.site.id?c.b:c.a),owner,jurisdiction,...claims,...Object.keys(parcel?.uses||{})];
    return ids.filter(s=>s&&s!==town.site.id).map(s=>townFor(geo,s)).find(Boolean);
  }
  function meetingPath(geo,r,town,id,kind){
    const from=cell(town.x,town.y),direct=pathTo(geo,r,town,from,id,kind==='survey'?'survey':undefined);
    if(direct||kind!=='parley')return direct;
    // A meeting can be held on either side of a closed parcel. It does not
    // presume permission to cross the disputed line.
    const {x,y}=point(id);
    const borders=[[1,0],[-1,0],[0,1],[0,-1]].map(([di,dj])=>({x:x+cellSize*di,y:y+cellSize*dj}))
      .filter(p=>inside(geo,p.x,p.y)).sort((a,b)=>dist(a,town)-dist(b,town));
    for(const p of borders){const path=pathTo(geo,r,town,from,cell(p.x,p.y));if(path)return path;}
    return null;
  }
  function settleMeeting(world,geo,r,town,trip,id){
    const host=counterpart(geo,r,town,id)?.site;
    if(!host){record(world,r,town.site,'No other claimant came to the agreed meeting. The crew will return the reserved materials.',trip);return;}
    const site=town.site,k=pair(site.id,host.id),old=r.contacts[k],good=terrainCell(geo,id).good;
    const floor=reserve(world,host),pressure=host[good]<=floor[good]+2,trust=Math.round((site.trust+host.trust)/2);
    const lead=root.EarthPersonas?.profile(site,trip.personId),reach=lead?.aptitudes?.communication||40;
    const longstanding=(old?.meetings||0)>=3;
    const joint=host.trust>=50&&trust+Math.min(8,Math.floor(reach/12))>=59&&!pressure;
    const adopts=joint||host.trust>=30&&(trust+Number(longstanding)*6>=39||host.materials<floor.materials+1);
    const previous=localAgreement(r,site.id,host.id,id)?.terms||'disputed';
    const occupier=site.communityLife?.border?.foothold?.by===host.id?host:
      host.communityLife?.border?.foothold?.by===site.id?site:null;
    const pressingClaim=occupier&&root.EarthBorderConflict?.relation(world,site.id,host.id)?.state==='war'&&
      occupier.food>=reserve(world,occupier).food+2&&occupier.funds>=reserve(world,occupier).funds+2;
    const offersPassage=!pressingClaim&&(adopts||!pressure&&host.trust>=45);
    const terms=joint?'joint':offersPassage?'passage':previous;
    const accepted=offersPassage&&host.materials<Number.MAX_SAFE_INTEGER&&host.funds<Number.MAX_SAFE_INTEGER;
    const detail=accepted?(terms==='joint'?'Both meetings opened the parcel to shared harvest and maintenance.':
      'The host accepted passage and retained the right to decide who may harvest.')+' The home crew transferred 1 material and 1 fund to the receiving community for upkeep.':
      (pressingClaim?occupier.name+' is still pressing its claim on the town centre. ':pressure?host.name+' needs its reserve of '+good+' for local commitments. ':host.name+' asked for evidence of dependable cooperation. ')+'Access terms did not change.';
    if(accepted){site.trust=Math.min(100,site.trust+1);host.trust=Math.min(100,host.trust+1);host.materials++;host.funds++;trip.kit.materials--;trip.kit.funds--;}
    saveAgreement(r,k,{a:site.id,b:host.id,terms:accepted?terms:previous,trust,week:world.week,step:world.regionalWorld.step,
      cell:id,meetings:(old?.meetings||0)+1,reviewWeek:world.week+(accepted?5:1),detail});
    reveal(world,r,geo,host.id,id);reveal(world,r,geo,site.id,id);
    record(world,r,site,trip.name+' met '+host.name+' at the boundary. '+detail,trip);
    record(world,r,host,site.name+' sent '+trip.name+' to the boundary meeting. '+detail);
  }
  function routeEffort(world,site,path,mode){
    const geo=geography(world,site),r=regionFor(world,geo),town=townFor(geo,site.id),byWater=mode!=='van'&&!!canSail(town,r);
    let effort=0;
    for(let i=1;i<path.length;i++){
      if(!byWater&&!dryEdge(geo,path[i-1],path[i]))return Infinity;
      effort+=nodeCost(geo,r,town,path[i],byWater);
    }
    return effort;
  }
  function routeOpen(world,site,path){
    const geo=geography(world,site),r=regionFor(world,geo);
    return path.every(id=>passage(geo,r,site.id,id));
  }
  function shareCrossing(world,from,to,personId,name,path,seenThrough=-1){
    const geo=geography(world,from),dest=townFor(geo,to.id);if(!dest)return;
    const town=townFor(geo,from.id),r=state(world,geo);
    const traversed=path||pathTo(geo,r,town,cell(town.x,town.y),cell(dest.x,dest.y));
    if(!traversed)return;
    const trip={name,personId,siteId:from.id,path:traversed,index:0};
    for(let i=seenThrough+1;i<traversed.length;i++){trip.index=i;witness(world,geo,r,town,trip,traversed[i]);}
    saveRoute(r,from.id,to.id,traversed,name,world.week);
  }
  function remainingCrossing(world,from,path,seenThrough,mode){
    if(!path?.length)return path;
    const geo=geography(world,from),r=regionFor(world,geo),town=townFor(geo,from.id);
    const at=Math.max(0,seenThrough??0),remaining=path.slice(at+1);
    if(remaining.every(id=>passage(geo,r,from.id,id)))return path;
    // A closure behind a traveller cannot stop the journey. A closure ahead
    // requires a route from the actual reached parcel, keeping the earlier track.
    const detour=pathTo(geo,r,town,path[at],path.at(-1),mode);
    return detour?[...path.slice(0,at),...detour]:null;
  }
  function crossingPath(world,from,to,mode){
    const geo=geography(world,from),dest=townFor(geo,to?.id);if(!dest)return undefined;
    const town=townFor(geo,from.id);
    if(mode==='van'&&(from.water||to.water))return null;
    return pathTo(geo,regionFor(world,geo),town,cell(town.x,town.y),cell(dest.x,dest.y),mode);
  }
  function foundingGround(world,from,location){
    const geo=geography(world,from),town=townFor(geo,from.id),r=regionFor(world,geo),p=geo.project(location),id=cell(p.x,p.y);
    if(!inside(geo,p.x,p.y)||r?.parcels[id]?.owner||!buildingRights(geo,r,from.id,id))return null;
    const ground=terrain(geo,p.x,p.y);
    if((ground.kind==='water')!==from.water)return null;
    const path=pathTo(geo,r,town,cell(town.x,town.y),id);
    return path?{...location,water:ground.kind==='water',coastal:ground.kind==='shore',path}:null;
  }
  function scheduledJourneys(world,geo,r,town){
    const c=town.site.communityLife;if(!c)return;
    const plans=Object.entries(c.excursions||{}).map(([id,plan])=>({members:[id],plan,destination:townFor(geo,plan.to)}));
    if(c.foundingPlan?.point)plans.push({members:c.foundingPlan.members,plan:c.foundingPlan,destination:null});
    for(const {plan,members,destination} of plans){
      if(!plan.path){
        if(!destination)continue;
        const path=crossingPath(world,town.site,destination.site);if(!path)continue;plan.path=path;
      }
      let departed=false;
      if(plan.travelIndex==null){
        // Residents finish the promised handover before they set out. A weekly
        // fast-forward traverses this same route at the close.
        if(members.some(id=>!root.EarthCommunityLife.present(town.site,id)||town.site.agency?.actor===id))continue;
        plan.travelIndex=0;departed=true;
        for(const id of members)c.away[id]='regional-visit';
      }
      const lead=members[0],name=root.EarthPersonas.profile(town.site,lead)?.name||lead;
      const trip={path:plan.path,siteId:town.site.id,personId:lead,name,index:plan.travelIndex};
      if(departed)witness(world,geo,r,town,trip,plan.path[0]);
      const steps=plan.point?4:3,end=Math.min(plan.path.length-1,plan.travelIndex+steps);
      for(let j=plan.travelIndex+1;j<=end;j++){
        if(!passage(geo,r,town.site.id,plan.path[j]))break;
        trip.index=j;witness(world,geo,r,town,trip,plan.path[j]);plan.travelIndex=j;
      }
    }
  }
  function saveRoute(r,siteId,target,path,name,week){
    const routeId=siteId+'>'+target;
    const prior=r.routes[routeId],count=(prior?.uses||0)+1;
    if(!prior&&Object.keys(r.routes).length>=64){
      const retire=Object.entries(r.routes).sort((a,b)=>a[1].week-b[1].week||a[1].uses-b[1].uses)[0];
      if(retire)delete r.routes[retire[0]];
    }
    r.routes[routeId]={siteId,target,path:path.slice(),name,week,uses:count};r.mapRevision=(r.mapRevision||0)+1;
  }
  function bearingFrom(town,p){
    const compass=['north','northeast','east','southeast','south','southwest','west','northwest'];
    const i=(Math.round(Math.atan2(p.x-town.x,p.y-town.y)*4/Math.PI)+8)%8;
    return dist(town,p).toFixed(1)+' km '+compass[i]+' of '+town.site.name;
  }
  function depart(world,geo,r,town,kind,id,crew,path,instruction,targetPoint=point(id),startedAt){
    const site=town.site,ground=terrain(geo,targetPoint.x,targetPoint.y),kit={...costs[kind]};
    const members=crew.slice(0,kind==='found'?2:1).map(p=>({id:p.id,name:p.name}));
    const lead=members[0],destination=(kind==='survey'?'survey point':kind==='build'?ground.work:ground.label.toLowerCase())+', '+bearingFrom(town,targetPoint);
    const action=kind==='survey'?'record ground and access':kind==='gather'?'bring back '+ground.resource:
      kind==='build'?'establish a '+ground.work:kind==='trail'?'improve the working passage':kind==='parley'?'meet the other users about access':'establish a new settlement';
    const detail=(instruction||site.name+' needs a field report')+'. The crew agreed to '+action+'.';
    if(path.length===1&&kind!=='parley'&&dist(town,targetPoint)>.00001)path=[path[0],path[0]];
    const trip={kind,siteId:site.id,target:id,targetPoint,startPoint:{x:town.x,y:town.y},...(startedAt!=null?{startedAt}:{}),name:lead.name,personId:lead.id,crew:members,kit,cargo:{food:0,materials:0},
      path,index:0,phase:'outbound',started:world.regionalWorld.step,activity:'Travelling to '+destination,destination,detail};
    for(const k of Object.keys(kit))site[k]-=kit[k];
    for(const p of members)site.communityLife.away[p.id]='regional-field';
    r.trips[site.id]=trip;witness(world,geo,r,town,trip,path[0]);
    return record(world,r,site,members.map(p=>p.name).join(' and ')+' set out from '+site.name+' to '+action+'. '+kit.food+' food, '+kit.materials+(kit.materials===1?' material':' materials')+' and '+kit.funds+(kit.funds===1?' fund':' funds')+' were set aside. '+detail,trip);
  }
  function propose(world,site,req){
    const fail=message=>({ok:false,message});
    if(!req||!site||!Object.hasOwn(titles,req.kind)||req.week!==world.week||req.siteId!==site.id)return fail('The place or week changed. Inspect the ground again.');
    if(site.id!==world.communityLife?.homeId||world.activeId!==site.id||(root.EarthAgency?.actorId(site)||'steward')!=='steward'||world.communityLife.journey)
      return fail('Only the original character can propose this use to their home community.');
    const geo=geography(world,site);
    if(req.originId!==geo.origin.id||!inside(geo,req.x,req.y))return fail('The selected point is beyond the home region.');
    const town=townFor(geo,site.id),r=regionFor(world,geo),id=cell(req.x,req.y),crew=candidates(world,site,req.kind);
    const reason=checks(world,geo,r,town,req.kind,id,{crew,target:req});
    if(reason)return fail(reason);
    const exact=terrain(geo,req.x,req.y);
    if(exact.kind==='water'&&!canSail(town,r)&&!['survey','parley'].includes(req.kind))return fail('The crew needs a boat or a working landing to reach this water.');
    const path=meetingPath(geo,r,town,id,req.kind);
    if(!path)return fail('This crew could not find an accessible crossing with its present transport and passage agreements.');
    return {ok:true,message:depart(world,geo,state(world,geo),town,req.kind,id,crew,path,'The home community accepted the proposal',{x:req.x,y:req.y},root.EarthDayClock?.now(world)??Date.now())};
  }
  function planning(world,geo,r,town){
    const site=town.site,step=world.regionalWorld.step;
    if(site.population<4||r.trips[site.id]||site.communityLife?.foundingPlan)return;
    const last=r.rest?.[site.id]||0;if(last>=step-1&&last>0)return;
    const floor=reserve(world,site);
    if(site.funds<=floor.funds||site.food<=floor.food)return;
    const observed=surveyedCells(world,site,site.id),candidatesFor=[];
    // Proposals only use this community's records. A survey can choose an
    // unexamined bearing, but nobody knows its yield or builds sight unseen.
    const demand=site.food-floor.food<site.materials-floor.materials?'food':'materials';
    const capacity=root.EarthCityModel?.housingCapacity?.(site)||18;
    const buildingHere=site.civicLand?.project||site.city?.precincts?.some(p=>p.target==='homes')||site.civicInitiatives?.active?.choiceId==='precinct:homes';
    const approaching=site.population>=capacity&&!buildingHere&&site.population>=6&&world.week-(site.founded||1)>=4;
    const recent=(r.records||[]).find(n=>n.siteId===site.id&&n.personId);
    const rotation=(step+Math.abs(Math.round(town.x*3+town.y)))%5;
    const disputes=new Set(Object.values(r.contacts).filter(c=>c.terms==='disputed'&&(c.a===site.id||c.b===site.id)).map(c=>c.cell));
    for(const p of observed){
      const id=cell(p.x,p.y),range=dist(town,p);if(range>10||streetFootprint(geo,p.x,p.y))continue;
      const ground=terrainCell(geo,id),lot=r.parcels[id],uses=lot?.uses?.[site.id]||0;
      const foreign=(disputes.has(id)||lot?.agreements)&&counterpart(geo,r,town,id);
      if(foreign&&localAgreement(r,site.id,foreign.site.id,id)?.terms==='disputed'){
        const prior=r.contacts[pair(site.id,foreign.site.id)];
        if(!prior.reviewWeek||prior.reviewWeek<=world.week)candidatesFor.push({kind:'parley',id,score:20-range,why:'The disputed passage is delaying households in both communities'});
      }
      if(!lot?.trail&&lot?.traffic&&Object.keys(lot.traffic).length>1&&site.materials>=floor.materials+4)
        candidatesFor.push({kind:'trail',id,score:11-range,why:'Residents from different communities repeatedly use this passage'});
      if(approaching&&world.week-site.founded>=2&&!site.civicLand?.project&&!lot?.owner&&range>1.7)candidatesFor.push({kind:'found',id,score:17-range,why:'Families are looking for room beyond the existing housing'});
      if(uses>=1&&!lot?.work&&site.materials>=floor.materials+5)candidatesFor.push({kind:'build',id,score:13-range+(ground.good===demand?2:0),why:'Repeated collections justify permanent facilities'});
      const available=availableYield(world,lot,ground);
      if(available>0)candidatesFor.push({kind:'gather',id,score:(ground.good===demand?10:6)-range+Number(!!lot?.work)*2+
        (rotation<2?-5:0),why:site.name+' is protecting its '+demand+' reserve'});
    }
    const heading=(step*2.39996+town.x*.68+town.y*.24+geo.seed);
    for(let i=0;i<12;i++){
      const angle=heading+i*Math.PI/6;
      const range=1.5+Math.min(4,Math.floor(observed.length/15))*.75;
      const x=town.x+Math.cos(angle)*range,y=town.y+Math.sin(angle)*range,id=cell(x,y);
      if(inside(geo,x,y)&&!known(world,site,site.id,x,y))
        candidatesFor.push({kind:'survey',id,score:(rotation<2||!recent?15:7)-i*.1,why:'Local route records end in this direction'});
    }
    candidatesFor.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const crews=new Map();
    for(const offer of candidatesFor.slice(0,40)){
      if(checks(world,geo,r,town,offer.kind,offer.id,{floor}))continue;
      if(!crews.has(offer.kind))crews.set(offer.kind,candidates(world,site,offer.kind));
      const crew=crews.get(offer.kind);
      if(crew.length<(offer.kind==='found'?2:1))continue;
      const path=meetingPath(geo,r,town,offer.id,offer.kind);
      if(path){depart(world,geo,r,town,offer.kind,offer.id,crew,path,offer.why);return;}
    }
  }
  function availableYield(world,lot,ground){
    const maximum=ground.kind==='rock'?8:6,stock=lot?.stock;
    if(stock==null)return maximum;
    const renewal=ground.kind==='rock'?0:Math.max(0,world.week-(lot.harvestWeek||world.week));
    return Math.min(maximum,stock+renewal);
  }
  function fieldPoint(town,trip,index){
    if(index===0&&trip.startPoint)return trip.startPoint;
    if(index===trip.path.length-1){
      if(trip.phase==='returning')return {x:town.x,y:town.y};
      if(trip.kind!=='parley'&&trip.path[index]===trip.target&&trip.targetPoint)return trip.targetPoint;
    }
    return point(trip.path[index]);
  }
  function fieldCost(geo,r,town,trip,index,byWater){
    const id=trip.path[index],prev=trip.path[index-1],cost=nodeCost(geo,r,town,id,byWater);
    if(!Number.isFinite(cost))return Infinity;
    if(index!==1&&index!==trip.path.length-1)return byWater||dryEdge(geo,prev,id)?cost:Infinity;
    const a=fieldPoint(town,trip,index-1),b=fieldPoint(town,trip,index);
    if(!byWater){
      const edge=a.x+','+a.y+'>'+b.x+','+b.y;
      if(!geo.dryEdges.has(edge))geo.dryEdges.set(edge,[.25,.5,.75,1].every(f=>terrain(geo,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f).kind!=='water'));
      if(!geo.dryEdges.get(edge))return Infinity;
    }
    return Math.max(.01,dist(a,b)/cellSize)*cost;
  }
  function homeward(geo,r,town,trip){
    const arrival=trip.path[trip.index],home=cell(town.x,town.y),from=fieldPoint(town,trip,trip.index);
    const fresh=pathTo(geo,r,town,arrival,home);
    // A crew stranded by a newly contested crossing holds its kit. Each
    // subsequent round rechecks access; supplies never teleport home.
    if(!fresh){trip.phase='waiting';trip.activity='Waiting for a return passage';return;}
    if(fresh.length===1&&dist(from,town)>.00001)fresh.push(home);
    trip.phase='returning';trip.path=fresh;trip.startPoint={x:from.x,y:from.y};trip.index=0;trip.legWork=0;trip.activity='Returning to '+town.site.name;
  }
  function finishAt(world,geo,r,town,trip,makeSite){
    const site=town.site,id=trip.target,p=trip.targetPoint||point(id),ground=terrain(geo,p.x,p.y);
    const why=trip.detail,eligible=harvestRights(geo,r,site.id,id);
    const lot=newParcel(r,id),visits=lot.uses[site.id]||0;
    if(trip.kind==='survey'){
      record(world,r,site,trip.name+' surveyed '+ground.label.toLowerCase()+' at '+id+' and recorded '+ground.resource+' and the return route.',trip);
    }else if(trip.kind==='parley'){
      settleMeeting(world,geo,r,town,trip,id);
    }else if(trip.kind==='trail'&&buildingRights(geo,r,site.id,id)&&!lot.trail){
      const other=counterpart(geo,r,town,id);
      lot.trail={kind:'trail',label:ground.kind==='water'?'marked channel':'maintained trail',builder:trip.name,personId:trip.personId,
        level:1,week:world.week,x:p.x,y:p.y,siteId:site.id,partners:other&&localAgreement(r,site.id,other.site.id,id)?.terms==='joint'?[other.site.id]:[]};
      trip.kit.materials=0;
      record(world,r,site,trip.name+' improved the '+lot.trail.label+' at '+id+' with 2 public materials. Carriers crossing the marked parcel now spend less of their shift in transit.',trip);
    }else if(!eligible||['found','build'].includes(trip.kind)&&!buildingRights(geo,r,site.id,id)){
      record(world,r,site,trip.name+' found another household’s claim at '+id+' and is bringing the unused materials back for negotiation.',trip);
    }else if(trip.kind==='found'){
      if(!lot.owner&&!nearestTown(geo,p,1.25)&&site.population>trip.crew.length){
        const place=root.EarthCommunityLife.settleFieldCamp(world,site,trip,{...geo.locate(p.x,p.y),water:ground.kind==='water',coastal:ground.kind==='shore'},makeSite);
        if(place){
          lot.uses[place.id]=1;lot.charter=place.id;
          saveRoute(r,site.id,place.id,trip.path,trip.name,world.week);
          delete r.trips[site.id];(r.rest||={})[site.id]=world.regionalWorld.step;
          record(world,r,site,trip.crew.map(c=>c.name).join(' and ')+' reached '+id+' and founded '+place.name+'. Their households and skills moved with them. '+site.name+' has '+site.population+' people on its remaining rota.',trip);
          return;
        }
      }
      record(world,r,site,'Conditions changed before the founding group arrived. The households are bringing their supplies home.',trip);
    }else if(trip.kind==='build'&&!lot.work){
      lot.owner||=site.id;lot.uses[site.id]=visits+1;
      lot.work={x:p.x,y:p.y,resource:ground.resource,kind:ground.facility,label:ground.work,builder:trip.name,personId:trip.personId,week:world.week,level:1};
      trip.kit.materials=0;
      record(world,r,site,trip.name+' finished the '+ground.work+' at '+id+' using 3 materials. Subsequent crews can load two more units here. '+why,trip);
    }else if(trip.kind==='gather'){
      const available=availableYield(world,lot,ground),amount=Math.min(available,lot.work?.resource===ground.resource?4:2);
      trip.cargo[ground.good]=amount;trip.resource=ground.resource;lot.stock=available-amount;lot.harvestWeek=world.week;
      if(amount){
        lot.uses[site.id]=visits+1;
        if(visits+1>=2&&!(lot.claims||={})[site.id]){
          lot.claims[site.id]={week:world.week,by:trip.name,basis:'Repeated collection of '+ground.resource};
          record(world,r,site,trip.name+' recorded a use claim for '+site.name+' after repeated collection at '+id+'. It grants no exclusive title.',trip);
        }
      }
      record(world,r,site,trip.name+' loaded '+amount+' '+ground.resource+' at '+id+'. '+(amount?'The goods reach the town stores when the crew returns.':'The crew recorded the depleted ground.'),trip);
    }
    saveRoute(r,site.id,id,trip.path,trip.name,world.week);
    homeward(geo,r,town,trip);
  }
  function finishHome(world,r,town,trip){
    const site=town.site;
    if(site.food>Number.MAX_SAFE_INTEGER-trip.cargo.food||site.materials>Number.MAX_SAFE_INTEGER-trip.cargo.materials-trip.kit.materials||
      site.funds>Number.MAX_SAFE_INTEGER-trip.kit.funds){
      trip.activity='Waiting for space in the receiving stores';return;
    }
    for(const p of trip.crew)if(site.communityLife.away[p.id]==='regional-field')delete site.communityLife.away[p.id];
    const wage=trip.kind==='found'?0:trip.kit.funds;
    let paid=0;
    for(let i=0;i<trip.crew.length&&paid<wage;i++){
      const person=trip.crew[i],due=Math.floor((wage-paid)/(trip.crew.length-i));
      if(due&&root.EarthPurses?.productionReceipt?.(world,site,person.id,due,person.name+' completed the regional '+trip.kind+' trip to '+trip.destination+' and received '+due+' reserved public funds.'))paid+=due;
    }
    site.materials+=trip.kit.materials+trip.cargo.materials;
    site.food+=trip.cargo.food;site.funds+=trip.kit.funds-paid;
    if(trip.cargo.food)root.EarthProvisions?.credit?.(world,site,trip.resource==='fish'?'catch':'harvest',trip.cargo.food,trip.personId);
    let result=trip.cargo.food||trip.cargo.materials?' The crew delivered '+(trip.cargo.food||trip.cargo.materials)+' '+trip.resource+' to public stores.':'';
    if(trip.kit.materials)result+=' '+trip.kit.materials+' unused materials were returned.';
    record(world,r,site,trip.name+' returned to '+site.name+'. The crew used '+trip.kit.food+' food on the journey.'+result+
      (paid?' '+paid+' reserved fund'+(paid===1?'':'s')+' paid the crew.':''),trip);
    root.EarthBorderConflict?.homecoming(world,site,trip);
    delete r.trips[site.id];(r.rest||={})[site.id]=world.regionalWorld.step;
  }
  function moveTrip(world,geo,r,town,trip,makeSite){
    if(trip.checkpoint){
      const host=geo.towns.find(t=>t.site.id===trip.checkpoint.host)?.site;
      if(root.EarthBorderConflict.guardShift(world,host,town.site,trip))homeward(geo,r,town,trip);
      return;
    }
    if(trip.phase==='waiting'){homeward(geo,r,town,trip);return;}
    if(trip.phase==='working'){finishAt(world,geo,r,town,trip,makeSite);return;}
    const byWater=!!canSail(town,r),pace=town.site.growth?.vehicle>=1?5:3;
    let time=pace;
    while(trip.index<trip.path.length-1&&time>0){
      const current=trip.path[trip.index],next=trip.path[trip.index+1],last=trip.path.at(-1);
      const cost=fieldCost(geo,r,town,trip,trip.index+1,byWater);
      if(!Number.isFinite(cost)){
        reveal(world,r,geo,town.site.id,next);
        const replacement=pathTo(geo,r,town,current,last,trip.kind==='survey'&&trip.phase==='outbound'?'survey':undefined);
        if(!replacement||current===next||replacement[1]===next){
          const other=counterpart(geo,r,town,next),host=other?.site,dispute=host&&r.contacts[pair(town.site.id,host.id)];
          const clash=dispute?.terms==='disputed'&&Math.min(host.trust,town.site.trust)<27&&
            (trip.cargo.food+trip.cargo.materials>0||town.site[terrainCell(geo,next).good]<reserve(world,town.site)[terrainCell(geo,next).good]);
          if(clash){town.site.wellbeing=Math.max(0,town.site.wellbeing-1);host.wellbeing=Math.max(0,host.wellbeing-1);dispute.reviewWeek=world.week+1;}
          trip.detail=clash?'Work parties clashed over this consignment. They withdrew with the sealed goods and requested a boundary meeting.':
            (terrainCell(geo,next).kind==='water'?'The survey found water beyond the bank; this crew has no boat.':'The next crossing is inaccessible.')+' The crew is seeking another way home with its supplies.';
          record(world,r,town.site,trip.name+' stopped at '+next+'. '+trip.detail,trip);
          homeward(geo,r,town,trip);return;
        }
        trip.detail='The crew found an alternate passage around the closed parcel at '+next+'. '+((replacement.length-1)*cellSize).toFixed(1)+' km remain.';
        record(world,r,town.site,trip.name+' changed course. '+trip.detail,trip);
        const here=fieldPoint(town,trip,trip.index);trip.startPoint={x:here.x,y:here.y};
        trip.path=replacement;trip.index=0;trip.legWork=0;continue;
      }
      // Give rough ground and sailing an actual cost. Fractional effort carries
      // into the next field shift, including on the last leg of a long journey.
      const remaining=cost-(trip.legWork||0),used=Math.min(time,remaining);
      trip.legWork=(trip.legWork||0)+used;time-=used;
      if(trip.legWork+.00001<cost)break;
      trip.legWork=0;trip.index++;
      if(current!==next){
        witness(world,geo,r,town,trip,next);
        const hostId=trip.phase==='outbound'&&tenure(geo,r,next).jurisdiction;
        if(hostId&&hostId!==town.site.id&&trip.kind!=='parley'){
          const host=geo.towns.find(t=>t.site.id===hostId)?.site;
          const agreement=localAgreement(r,town.site.id,hostId,next);
          const invited=agreement&&['exchange','joint','passage'].includes(agreement.terms);
          const visitor=root.EarthPersonas.profile(town.site,trip.personId);
          const encounter=host&&visitor&&root.EarthBorderConflict?.entry(world,town.site,host,visitor,invited,next);
          if(encounter){
            trip.checkpoint=encounter;trip.detail=encounter.message;trip.activity='Fighting at the guarded boundary';
            record(world,r,town.site,trip.detail,trip);return;
          }
        }
      }
    }
    if(trip.index!==trip.path.length-1)return;
    if(trip.phase==='returning'){finishHome(world,r,town,trip);return;}
    trip.phase='working';
    const target=trip.targetPoint||point(trip.target),ground=terrain(geo,target.x,target.y);
    trip.activity=trip.kind==='survey'?'Surveying '+ground.label.toLowerCase():trip.kind==='gather'?'Collecting '+ground.resource:
      trip.kind==='build'?'Building the '+ground.work:trip.kind==='trail'?'Grading the passage':trip.kind==='parley'?'Meeting the other users':'Setting out the founding households';
  }
  function advance(world,makeSite,mode){
    if(!world.communityLife||!world.sites.length)return;
    const book=world.regionalWorld||={version:1,step:0,week:world.week,regions:{}};
    if(mode==='calendar'&&book.productionWeek===world.week-1)return;
    if(mode==='production')book.productionWeek=world.week;
    book.week=world.week;book.step++;
    root.EarthMilitaryBase?.advance(world);
    const groups=new Set();let distant=0;
    for(const site of places(world)){
      // Historical globe saves can have hundreds of solitary districts which
      // have never established a local regional network. Their households
      // plan field work in staggered rounds. A committed trip still moves on
      // every round, independently of which community the camera is showing.
      const solitary=!site.communityLife?.cluster,cycle=distant++;
      if(solitary&&!book.regions[site.id]?.trips[site.id]&&(cycle+book.step)%16!==0)continue;
      const geo=geography(world,site);if(groups.has(geo.origin.id))continue;groups.add(geo.origin.id);
      const r=state(world,geo);
      root.EarthBorderConflict?.advance(world,geo,r);
      for(const town of geo.towns)scheduledJourneys(world,geo,r,town);
      for(const town of geo.towns){const trip=r.trips[town.site.id];if(trip)moveTrip(world,geo,r,town,trip,makeSite);}
      if(!solitary||(cycle+book.step)%16===0)for(const town of geo.towns)planning(world,geo,r,town);
    }
  }
  function legs(trip){
    const n=trip.path.length-1;return [{f:0,i:0},...(trip.knots||[]),{f:1,i:n}];
  }
  function indexAt(trip,f){
    const steps=legs(trip);
    for(let j=1;j<steps.length;j++){
      const a=steps[j-1],b=steps[j];if(f>b.f&&j<steps.length-1)continue;
      return a.i+(b.i-a.i)*clamp((f-a.f)/(b.f-a.f||1),0,1);
    }
    return 0;
  }
  function tripLine(world,site,trip){
    if(!trip?.path?.length||!site)return [];
    const geo=geography(world,site),from=townFor(geo,trip.from),to=townFor(geo,trip.to);
    if(!from||!to)return [];
    const cached=lineCache.get(trip.path);
    if(cached&&cached.geo===geo&&cached.knots===trip.knots&&cached.from===from.site.id&&cached.to===to.site.id)return cached.line;
    const steps=legs(trip),last=trip.path.length-1;
    const at=i=>i===0?from:i===last?to:point(trip.path[i]);
    const indices=new Set(trip.path.map((_,i)=>i));
    for(const k of steps)indices.add(k.i);
    let j=1;
    const line=[...indices].sort((a,b)=>a-b).map(i=>{
      while(j<steps.length-1&&i>steps[j].i)j++;
      const a=steps[j-1],b=steps[j],before=at(Math.floor(i)),after=at(Math.ceil(i)),f=i%1;
      return {x:before.x+(after.x-before.x)*f,y:before.y+(after.y-before.y)*f,
        fraction:a.f+(b.f-a.f)*(i-a.i)/(b.i-a.i||1)};
    });
    lineCache.set(trip.path,{geo,knots:trip.knots,from:from.site.id,to:to.site.id,line});return line;
  }
  function positionOnLine(line,f){
    if(!line.length)return null;
    for(let j=1;j<line.length;j++){
      const a=line[j-1],b=line[j];if(f>b.fraction&&j<line.length-1)continue;
      const r=clamp((f-a.fraction)/(b.fraction-a.fraction||1),0,1);
      return {x:a.x+r*(b.x-a.x),y:a.y+r*(b.y-a.y),dx:b.x-a.x,dy:b.y-a.y};
    }
    return {x:line[0].x,y:line[0].y,dx:0,dy:0};
  }
  function tripPosition(world,site,trip,fraction=root.EarthCommunityLife.routeProgress(trip)){
    return positionOnLine(tripLine(world,site,trip),fraction);
  }
  function changeBranch(world,site,trip,target,f){
    if(!trip.path?.length||trip.path.length<3||trip.via===target)return true;
    const geo=geography(world,site),r=regionFor(world,geo),town=townFor(geo,trip.from),other=townFor(geo,trip.to);
    if(!town||!other)return true;
    const progress=indexAt(trip,f),fork=Math.ceil(progress),id=trip.path[fork],end=trip.path.at(-1);
    if(fork>=trip.path.length-1)return false;
    const current=point(id),finish=point(end),dx=finish.x-current.x,dy=finish.y-current.y,length=Math.hypot(dx,dy);
    const mid={x:current.x+dx*.5,y:current.y+dy*.5},good=target==='work'?'materials':'food';
    const options=[];
    // A route choice uses actual nearby facilities, shared waypoints or terrain.
    // A traveller can discover an unfamiliar path by taking it.
    for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
      const x=mid.x+i*cellSize,y=mid.y+j*cellSize,node=cell(x,y),p=point(node);
      if(!inside(geo,p.x,p.y)||node===id||node===end)continue;
      const side=(p.x-mid.x)*(-dy)+(p.y-mid.y)*dx,preferred=target==='work'?1:-1;
      if(side*preferred<length*cellSize*.6||dist(p,current)+dist(p,finish)>length*1.75+cellSize)continue;
      const lot=r?.parcels[node],match=terrainCell(geo,node).good===good;
      options.push({node,score:(lot?.work?2:0)+(match?1:0)+Number(!!r?.knowledge[town.site.id]?.[node])-.35*dist(p,mid)});
    }
    options.sort((a,b)=>b.score-a.score);
    for(const {node} of options.slice(0,12)){
      const first=pathTo(geo,r,town,id,node,trip.vehicle),second=first&&pathTo(geo,r,town,node,end,trip.vehicle);
      if(!first||!second)continue;
      const next=[...trip.path.slice(0,fork),...first,...second.slice(1)];
      if(next.join('/')===trip.path.join('/'))continue;
      const oldKnots=(trip.knots||[]).filter(k=>k.f<f&&k.i<progress);
      if(f>0&&progress>0)oldKnots.push({f,i:progress});
      trip.knots=oldKnots.slice(-32);trip.path=next;trip.km=Math.max(.1,(next.length-1)*cellSize);
      trip.baseDuration=Math.round(clamp(routeEffort(world,site,next,trip.vehicle)*cellSize*620,1600,6200));
      return true;
    }
    return false;
  }
  function observeLeg(world,from,trip,f){
    if(!trip.path?.length)return;
    const geo=geography(world,from),town=townFor(geo,from.id),r=state(world,geo),through=Math.floor(indexAt(trip,f)),seen=trip.observed??-1;
    const actor={name:world.communityLife.profile.name,personId:'steward',siteId:from.id,path:trip.path,index:0};
    for(let i=seen+1;i<=through;i++){actor.index=i;witness(world,geo,r,town,actor,trip.path[i]);}
    trip.observed=Math.max(seen,through);
  }
  function fieldPosition(world,geo,r,town,trip){
    const at=fieldPoint(town,trip,trip.index);
    if(trip.phase==='working')return {...(trip.kind==='parley'?at:trip.targetPoint||at),dx:0,dy:0};
    if(trip.phase==='waiting'||trip.index===trip.path.length-1)return {...at,dx:0,dy:0};
    const period=root.EarthDistrictGrowth?.period||24000,elapsed=(root.EarthDayClock?.now(world)??Date.now())-Math.max(trip.startedAt||0,world.lastProductionAt||0);
    // Interpolate the same terrain-priced legs the next paid shift will settle.
    // Opening a sleeping save resumes at its last committed point.
    const fraction=elapsed>=0&&elapsed<=period*1.5?clamp(elapsed/period,0,1):0;
    const byWater=!!canSail(town,r),pace=town.site.growth?.vehicle>=1?5:3;
    let time=pace*fraction+(trip.legWork||0),a=at;
    for(let i=trip.index+1;i<trip.path.length;i++){
      const b=fieldPoint(town,trip,i),cost=fieldCost(geo,r,town,trip,i,byWater);
      if(!Number.isFinite(cost))return {...a,dx:0,dy:0};
      if(time<=cost){
        const f=time/cost;
        return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,dx:b.x-a.x,dy:b.y-a.y};
      }
      a=b;time-=cost;
    }
    return {...a,dx:0,dy:0};
  }
  function travellers(world,site){
    const geo=geography(world,site),r=geo&&regionFor(world,geo);
    const visible=Object.values(r?.trips||{}).flatMap(trip=>{
      const town=townFor(geo,trip.siteId);if(!town)return [];
      if(trip.checkpoint){
        const gate=trip.checkpoint,p=point(gate.cell);
        const host=townFor(geo,gate.host);
        return host?root.EarthBorderConflict.combatants(p,[gate.visitor],[gate.guard],town.site,host.site,trip.detail):[];
      }
      const {x,y,dx,dy}=fieldPosition(world,geo,r,town,trip);
      return trip.crew.map((crew,i)=>({x:x+.024*i,y:y+.014*i,name:crew.name,personId:crew.id,siteId:trip.siteId,
        destination:trip.destination,activity:trip.activity,detail:trip.detail,remainingKm:(trip.path.length-1-trip.index)*cellSize,
        kind:trip.kind,phase:trip.phase,dx,dy,mode:terrain(geo,x,y).kind==='water'?'boat':'walk',kit:{...trip.kit},cargo:{...trip.cargo}}));
    });
    const original=world.communityLife?.journey;
    const location=original?.path&&tripPosition(world,site,original);
    if(location){
      const destination=townFor(geo,original.to)?.site.name||original.to;
      visible.push({...location,name:world.communityLife.profile.name,personId:'steward',siteId:original.from,kind:'visit',phase:'outbound',mode:original.vehicle==='van'?'van':terrain(geo,location.x,location.y).kind==='water'?'boat':'walk',
        activity:'Travelling to '+destination,destination,remainingKm:(1-root.EarthCommunityLife.routeProgress(original))*original.km,
        detail:'Visiting under the receiving community’s admission rules.',kit:{},cargo:world.communityLife.parcel?{[world.communityLife.parcel.good]:world.communityLife.parcel.amount}:{}});
    }
    for(const town of geo?.towns||[]){
      const c=town.site.communityLife;
      const planned=Object.entries(c?.excursions||{}).map(([id,plan])=>({members:[id],plan}));
      if(c?.foundingPlan)planned.push({members:c.foundingPlan.members,plan:c.foundingPlan});
      for(const {members,plan} of planned){
        if(plan.travelIndex==null||!plan.path)continue;
        const a=point(plan.path[plan.travelIndex]),b=point(plan.path[Math.min(plan.travelIndex+1,plan.path.length-1)]);
        const destination=plan.point?'Proposed settlement':townFor(geo,plan.to)?.site.name||plan.to;
        for(const [i,id] of members.entries()){
          const name=root.EarthPersonas.profile(town.site,id)?.name||id;
          visible.push({x:a.x+.018*i,y:a.y,dx:b.x-a.x,dy:b.y-a.y,siteId:town.site.id,name,personId:id,
            kind:plan.point?'found':'visit',mode:terrain(geo,a.x,a.y).kind==='water'?'boat':'walk',phase:'outbound',
            destination,activity:plan.point?'Surveying the proposed settlement':'Travelling to inspect '+destination,
            detail:plan.point?'The households have reserved food, materials and funds for their new home.':'The traveller and the host decide on residence after the visit.',
            remainingKm:(plan.path.length-1-plan.travelIndex)*cellSize,kit:{...plan.kit},cargo:{}});
        }
      }
      const run=town.site.communityLife?.freight;if(!run?.path?.length)continue;
      const destination=townFor(geo,run.to)?.site.name||run.to;
      const time=root.EarthDayClock?.now(world)??Date.now();
      const partial=clamp((time-(world.lastProductionAt||time))/(root.EarthDistrictGrowth?.period||24000),0,1);
      const closed=r?.contacts[pair(town.site.id,run.to)]?.cell,stop=closed?run.path.indexOf(closed):-1;
      const f=run.held?(stop>0?(stop-1)/Math.max(1,run.path.length-1):.94):
        clamp(((world.regionalWorld?.step||0)-(run.departedRound||0)+partial)/5,0,.98);
      const loc=tripPosition(world,site,{path:run.path,from:town.site.id,to:run.to},f);if(!loc)continue;
      visible.push({...loc,name:run.name,personId:run.signer,siteId:town.site.id,kind:'freight',phase:run.held?'waiting':'outbound',mode:terrain(geo,loc.x,loc.y).kind==='water'?'boat':'walk',activity:'Escorting '+run.amount+' '+run.good,
        destination,remainingKm:(run.path.length-1)*cellSize*(1-f),cargo:{[run.good]:run.amount},kit:{},
        detail:'The receiving community agreed to send '+run.expected+' units in exchange. Delivery is due in week '+run.due+'.'});
    }
    if(geo&&root.EarthMilitaryBase)visible.push(...root.EarthMilitaryBase.actors(world,geo));
    if(geo&&root.EarthBorderConflict)visible.push(...root.EarthBorderConflict.actors(world,geo));
    return visible;
  }
  function ledger(world,site){
    const geo=geography(world,site),r=geo&&regionFor(world,geo);if(!geo)return null;
    return {knownCells:surveyedCells(world,site,site.id).length,works:works(world,site).filter(w=>w.siteId===site.id),
      journeys:travellers(world,site).filter(t=>t.siteId===site.id),
      contacts:records(r,'contacts').map(([,v])=>v).filter(v=>v.a===site.id||v.b===site.id)
        .map(v=>{const otherId=v.a===site.id?v.b:v.a;return {...v,otherId,name:townFor(geo,otherId)?.site.name||otherId};}),
      records:(r?.records||[]).filter(note=>note.siteId===site.id)};
  }
  function residentRecord(world,site,id){
    const view=ledger(world,site);if(!view)return {journey:null,records:[]};
    return {journey:view.journeys.find(j=>j.personId===id)||null,records:view.records.filter(note=>note.personId===id)};
  }
  function fieldAccount(world,site,person){
    if(!person?.identityKey||!world.regionalWorld)return null;
    const region=site.communityLife?.cluster||site.id,r=world.regionalWorld.regions[region];
    if(!r)return null;
    const receipt=r.records.find(n=>n.fieldCell&&n.witnessKey===person.identityKey);
    if(!receipt)return null;
    return {region,cell:receipt.fieldCell,observed:receipt.week,step:receipt.step,sourceKey:receipt.witnessKey,
      sourceName:receipt.name,sourceSite:receipt.siteId,words:receipt.text};
  }
  function shareFieldReport(world,site,note,reporter,delegate,commit=true){
    if(!note||!reporter?.identityKey||!delegate||root.EarthCommunityLife?.hostFor(site)?.id!==delegate.id)return false;
    const geo=geography(world,site),r=geo&&regionFor(world,geo),p=point(note.cell);
    if(!r||note.region!==geo.origin.id||!r.knowledge[note.sourceSite]?.[note.cell]||
       !inside(geo,p.x,p.y)||known(world,site,site.id,p.x,p.y))return false;
    const witnessed=note.sourceKey===reporter.identityKey&&r.records.some(n=>n.fieldCell===note.cell&&n.step===note.step&&n.witnessKey===note.sourceKey);
    const received=world.communityLife?.fieldNotes?.some(n=>n.reader===reporter.identityKey&&n.region===note.region&&
      n.cell===note.cell&&n.sourceKey===note.sourceKey&&n.sourceSite===note.sourceSite&&n.step===note.step);
    if(!witnessed&&!received)return false;
    if(!commit)return true;
    reveal(world,r,geo,site.id,note.cell);
    r.mapRevision=(r.mapRevision||0)+1;
    record(world,r,site,delegate.name+' entered '+note.sourceName+'’s field observation from week '+note.observed+
      ' on the community map. '+reporter.name+' brought the account for parcel '+note.cell+'.');
    return true;
  }
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
  const text=v=>typeof v==='string'&&v.length>0&&v.length<=1600;
  const coordinate=id=>typeof id==='string'&&/^-?\d{1,6},-?\d{1,6}$/.test(id);
  const validPath=path=>Array.isArray(path)&&path.length>0&&path.length<=4097&&path.every(coordinate);
  function valid(world){
    const b=world.regionalWorld,journey=world.communityLife?.journey,sites=places(world);
    if(journey?.path!=null&&(!validPath(journey.path)||journey.observed!=null&&!integer(journey.observed,-1,journey.path.length-1)||
      journey.knots!=null&&(!Array.isArray(journey.knots)||journey.knots.length>64||!journey.knots.every((k,i,a)=>object(k)&&
      Number.isFinite(k.f)&&k.f>0&&k.f<1&&Number.isFinite(k.i)&&k.i>0&&k.i<journey.path.length-1&&(!i||k.f>a[i-1].f&&k.i>a[i-1].i)))))return false;
    for(const site of sites){
      const c=site.communityLife,run=c?.freight;
      for(const plan of [...Object.values(c?.excursions||{}),...(c?.foundingPlan?[c.foundingPlan]:[])]){
        if(plan.path!=null&&!validPath(plan.path)||plan.travelIndex!=null&&(!plan.path||!integer(plan.travelIndex,0,plan.path.length-1)))return false;
        if(plan.point&&(!Number.isFinite(plan.point.lat)||Math.abs(plan.point.lat)>90||!Number.isFinite(plan.point.lon)||Math.abs(plan.point.lon)>180))return false;
      }
      if(run?.path!=null&&(!validPath(run.path)||!integer(run.departedRound)||run.held!=null&&typeof run.held!=='boolean'))return false;
    }
    if(b==null)return true;
    if(!object(b)||b.version!==1||!integer(b.step)||!integer(b.week,1,world.week)||!object(b.regions)||
      b.productionWeek!=null&&!integer(b.productionWeek,1,world.week))return false;
    const all=new Map(sites.map(s=>[s.id,s]));
    for(const [origin,r] of Object.entries(b.regions)){
      if((!all.has(origin)&&!world.communityLife?.retired?.[origin])||!object(r)||r.projection!=null&&r.projection!=='polar'||!['knowledge','parcels','routes','trips','contacts'].every(k=>object(r[k]))||!Array.isArray(r.records)||r.records.length>48)return false;
      for(const [id,map] of records(r,'knowledge'))if(!all.has(id)||!object(map)||!Object.entries(map).every(([c,w])=>coordinate(c)&&integer(w,1,world.week)))return false;
      for(const [id,p] of records(r,'parcels')){
        if(!coordinate(id)||!object(p)||!object(p.uses)||!Object.entries(p.uses).every(([s,n])=>all.has(s)&&integer(n,1))||
          p.stock!=null&&!integer(p.stock,0,8)||p.harvestWeek!=null&&!integer(p.harvestWeek,1,world.week)||
          p.owner!=null&&!all.has(p.owner)||p.charter!=null&&!all.has(p.charter)||p.occupiedFrom!=null&&!all.has(p.occupiedFrom)||
          p.traffic!=null&&(!object(p.traffic)||!Object.entries(p.traffic).every(([s,n])=>all.has(s)&&integer(n,1,65535)))||
          p.claims!=null&&(!object(p.claims)||!Object.entries(p.claims).every(([s,c])=>all.has(s)&&object(c)&&integer(c.week,1,world.week)&&text(c.by)&&text(c.basis))))return false;
        if(p.agreements&&(!object(p.agreements)||!Object.entries(p.agreements).every(([k,a])=>object(a)&&all.has(a.a)&&all.has(a.b)&&a.a!==a.b&&k===pair(a.a,a.b)&&integer(a.week,1,world.week)&&['joint','exchange','passage','disputed'].includes(a.terms))))return false;
        if(p.trail&&(!object(p.trail)||p.trail.kind!=='trail'||!all.has(p.trail.siteId)||!integer(p.trail.week,1,world.week)||
          !Array.isArray(p.trail.partners)||!p.trail.partners.every(s=>all.has(s))||!Number.isFinite(p.trail.x)||!Number.isFinite(p.trail.y)))return false;
        if(p.work&&(!object(p.work)||!all.has(p.owner)||!['garden','landing','quarry','forestry','trail'].includes(p.work.kind)||
          !text(p.work.label)||!text(p.work.builder)||!text(p.work.personId)||!integer(p.work.week,1,world.week)||!integer(p.work.level,1)))return false;
      }
      if(!records(r,'routes').every(([,v])=>object(v)&&all.has(v.siteId)&&text(v.target)&&validPath(v.path)&&text(v.name)&&integer(v.week,1,world.week)&&integer(v.uses,1)))return false;
      if(!records(r,'contacts').every(([k,c])=>object(c)&&all.has(c.a)&&all.has(c.b)&&c.a!==c.b&&k===pair(c.a,c.b)&&coordinate(c.cell)&&
        ['joint','passage','disputed','exchange'].includes(c.terms)&&integer(c.step,0,b.step)&&integer(c.week,1,world.week)&&
        integer(c.meetings,1)&&integer(c.trust,0,100)&&text(c.detail)))return false;
      if(!r.records.every(n=>object(n)&&all.has(n.siteId)&&integer(n.step,0,b.step)&&integer(n.week,1,world.week)&&text(n.text)&&
        (n.fieldCell==null?n.witnessKey==null:coordinate(n.fieldCell)&&text(n.witnessKey)&&text(n.name)&&text(n.personId)&&!!r.knowledge[n.siteId]?.[n.fieldCell])))return false;
      if(r.rest&&(!object(r.rest)||!Object.entries(r.rest).every(([s,k])=>all.has(s)&&integer(k,0,b.step))))return false;
      for(const [s,t] of records(r,'trips')){
        const site=all.get(s);
        if(t?.checkpoint){
          const c=t.checkpoint,actor=p=>object(p)&&text(p.id)&&text(p.key)&&text(p.name)&&integer(p.resolve,0,100)&&integer(p.stamina,0,100)&&integer(p.energy,1,120);
          if(!all.has(c.host)||!coordinate(c.cell)||!text(c.message)||!integer(c.round,0,9)||!actor(c.guard)||!actor(c.visitor)||
            c.visitor.id!==t.personId||t.path?.[t.index]!==c.cell||t.phase!=='outbound')return false;
        }
        if(t?.trauma&&(!text(t.trauma.id)||!text(t.trauma.key)||typeof t.trauma.fatal!=='boolean'||!text(t.trauma.reason)))return false;
        if(!site||!object(t)||s!==t.siteId||!Object.hasOwn(titles,t.kind)||!coordinate(t.target)||!validPath(t.path)||
          t.targetPoint!=null&&(!object(t.targetPoint)||!Number.isFinite(t.targetPoint.x)||!Number.isFinite(t.targetPoint.y)||cell(t.targetPoint.x,t.targetPoint.y)!==t.target)||
          t.startPoint!=null&&(!object(t.startPoint)||!Number.isFinite(t.startPoint.x)||!Number.isFinite(t.startPoint.y)||cell(t.startPoint.x,t.startPoint.y)!==t.path[0])||
          t.startedAt!=null&&!integer(t.startedAt)||!integer(t.index,0,t.path.length-1)||!['outbound','working','returning','waiting'].includes(t.phase)||!integer(t.started,0,b.step)||
          !text(t.activity)||!text(t.destination)||!text(t.detail)||!text(t.name)||!text(t.personId)||!Array.isArray(t.crew)||
          t.crew.length!==(t.kind==='found'?2:1)||new Set(t.crew.map(p=>p.id)).size!==t.crew.length||
          !t.crew.every(p=>object(p)&&text(p.id)&&text(p.name)&&site.communityLife?.away?.[p.id]==='regional-field')||
          !object(t.kit)||!Object.keys(costs[t.kind]).every(k=>integer(t.kit[k],0,costs[t.kind][k]))||
          !object(t.cargo)||!['food','materials'].every(k=>integer(t.cargo[k],0,4))||
          t.legWork!=null&&(!Number.isFinite(t.legWork)||t.legWork<0||t.legWork>4.8))return false;
      }
    }
    return true;
  }
  root.EarthRegionalWorld={geography,polarProjection,streetKilometres,streetExtent,streetFootprint,reconcileLocations,terrain,sailingWater,known,surveyedCells,works,routes,travellers,inspect,ledger,residentRecord,fieldAccount,shareFieldReport,valid,propose,advance,tripLine,tripPosition,changeBranch,observeLeg,routeEffort,routeOpen,foundingGround,passageAgreement,crossingPath,remainingCrossing,shareCrossing};
})(typeof window==='undefined'?globalThis:window);
