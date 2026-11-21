/* Free-land territory expansion and open-land building placement.
   Allows players to expand community boundaries outward and place custom houses,
   workshops, orchards, labs, markets, parks, and watchtowers anywhere on empty
   land with strict solid-boundary separation from roads, walls, water, and the
   military airfield. */
(function(root){
  'use strict';

  const MAX_TIER=4;
  const TIER_STEP=6; // World units expanded outward per territory tier.
  const MAX_BUILDINGS=80;

  // Territory expansion costs scale gently so players can grow as large as they wish.
  const TIERS=Object.freeze([
    Object.freeze({tier:0,name:'Founding District',funds:0,materials:0,note:'Original town blocks plus cleared roadside margins.'}),
    Object.freeze({tier:1,name:'Outer Commons',funds:8,materials:6,note:'Survey +6 tiles of buildable land on every landward flank and push perimeter walls outward.'}),
    Object.freeze({tier:2,name:'Greenbelt Charter',funds:14,materials:10,note:'Survey +12 tiles outward for neighbourhoods, orchards, and workshops.'}),
    Object.freeze({tier:3,name:'Regional Precinct',funds:22,materials:16,note:'Survey +18 tiles outward for large-scale housing and research districts.'}),
    Object.freeze({tier:4,name:'Open Territory',funds:32,materials:22,note:'Survey +24 tiles outward — vast empty land ready for custom building.'})
  ]);

  const CATALOG=Object.freeze([
    Object.freeze({
      kind:'cottage',
      category:'housing',
      name:'Timber Cottage',
      funds:4,
      materials:2,
      housing:4,
      halfW:1.35,
      halfH:1.25,
      rates:{food:0,materials:0,funds:0,wellbeing:0},
      defence:0,
      roof:'#8f573c',
      wall:'#d9ccb4',
      note:'Adds 4 permanent housing places so new residents can settle.'
    }),
    Object.freeze({
      kind:'townhouse',
      category:'housing',
      name:'Courtyard Townhouse',
      funds:7,
      materials:4,
      housing:8,
      halfW:1.65,
      halfH:1.45,
      rates:{food:0,materials:0,funds:0,wellbeing:1},
      defence:0,
      roof:'#6f4e45',
      wall:'#e0d4be',
      note:'Adds 8 housing places and +1 wellbeing/week around a shared courtyard.'
    }),
    Object.freeze({
      kind:'apartment',
      category:'housing',
      name:'Apartment Block',
      funds:11,
      materials:6,
      housing:14,
      halfW:1.9,
      halfH:1.7,
      rates:{food:0,materials:0,funds:1,wellbeing:0},
      defence:0,
      roof:'#4d6370',
      wall:'#d6d0c4',
      note:'Adds 14 housing places for rapid community growth (+1 funds/week).'
    }),
    Object.freeze({
      kind:'orchard',
      category:'production',
      name:'Community Orchard',
      funds:5,
      materials:2,
      housing:0,
      halfW:1.6,
      halfH:1.5,
      rates:{food:3,materials:0,funds:0,wellbeing:0},
      defence:0,
      roof:'#4b7a42',
      wall:'#7c5b3b',
      note:'Produces +3 food each week on open soil.'
    }),
    Object.freeze({
      kind:'foundry',
      category:'production',
      name:'Timber & Craft Mill',
      funds:6,
      materials:3,
      housing:0,
      halfW:1.65,
      halfH:1.45,
      rates:{food:0,materials:2,funds:0,wellbeing:0},
      defence:0,
      roof:'#5d6973',
      wall:'#b89f82',
      note:'Produces +2 materials each week for ongoing expansion.'
    }),
    Object.freeze({
      kind:'bazaar',
      category:'production',
      name:'Open Market Stall',
      funds:6,
      materials:3,
      housing:0,
      halfW:1.5,
      halfH:1.35,
      rates:{food:0,materials:0,funds:3,wellbeing:0},
      defence:0,
      roof:'#b85d3b',
      wall:'#dfd3be',
      note:'Generates +3 funds each week through neighbourhood trade.'
    }),
    Object.freeze({
      kind:'researchLab',
      category:'civic',
      name:'Research Pavilion',
      funds:8,
      materials:4,
      housing:0,
      halfW:1.7,
      halfH:1.5,
      rates:{food:0,materials:1,funds:1,wellbeing:1},
      defence:0,
      roof:'#3e6e78',
      wall:'#d7dfe0',
      note:'Boosts +1 materials, +1 funds, and +1 wellbeing each week.'
    }),
    Object.freeze({
      kind:'solarGrid',
      category:'civic',
      name:'Solar Microgrid',
      funds:8,
      materials:4,
      housing:0,
      halfW:1.6,
      halfH:1.4,
      rates:{food:0,materials:1,funds:2,wellbeing:0},
      defence:0,
      roof:'#2c4f6b',
      wall:'#cfd5d8',
      note:'Clean power array yielding +2 funds and +1 materials each week.'
    }),
    Object.freeze({
      kind:'park',
      category:'civic',
      name:'Neighbourhood Park',
      funds:3,
      materials:1,
      housing:0,
      halfW:1.5,
      halfH:1.5,
      rates:{food:0,materials:0,funds:0,wellbeing:2},
      defence:0,
      roof:'#4e8249',
      wall:'#88a46e',
      note:'Shaded benches and lawn giving +2 wellbeing each week.'
    }),
    Object.freeze({
      kind:'watchtower',
      category:'defence',
      name:'Perimeter Watchtower',
      funds:5,
      materials:3,
      housing:0,
      halfW:1.15,
      halfH:1.15,
      rates:{food:0,materials:0,funds:0,wellbeing:0},
      defence:3,
      roof:'#59646b',
      wall:'#b9ad99',
      note:'Strengthens community perimeter defence by +3.'
    })
  ]);

  const byKind=kind=>CATALOG.find(c=>c.kind===kind)||null;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const int=(v,lo=0,hi=1e9)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
  const round2=v=>Math.round(Number(v)*100)/100;

  function isWaterfront(site){
    return Boolean(site&&(site.water||site.coastal||site.lakeShore));
  }

  function tierOf(site){
    return int(site?.freeLand?.tier,0,MAX_TIER)?site.freeLand.tier:0;
  }

  function buildingsOf(site){
    return Array.isArray(site?.freeLand?.buildings)?site.freeLand.buildings:[];
  }

  // Outer wall coordinates stay well beyond the outer roads (which span [-0.87..24.87])
  // and expand outward smoothly with territory tier.
  function wallBounds(site){
    const tier=tierOf(site),ext=tier*TIER_STEP,water=isWaterfront(site);
    return {
      west:-6.0-ext,
      north:-6.0-ext,
      // Keep east wall well outside the east road (24.87) and cleanly separated from the Military Airfield compound (which begins at x>=28.8).
      east:26.5,
      south:water?25.25:30.0+ext,
      waterfront:water,
      tier
    };
  }

  // Buildable empty-land boundary (strictly inside the perimeter walls, with solid wall setback).
  function territoryBounds(site){
    const tier=tierOf(site),ext=tier*TIER_STEP,water=isWaterfront(site);
    return {
      minX:-5.4-ext,
      maxX:25.6,
      minY:-5.4-ext,
      maxY:water?23.8:29.4+ext,
      waterfront:water,
      tier
    };
  }

  function isRoadOverlap(x,y,hw,hh){
    // Classic 4x4 grid streets at x,y in {0, 6, 12, 18, 24} spanning [-0.95..24.95], half-width ~0.95
    if(x+hw<-0.95||x-hw>24.95||y+hh<-0.95||y-hh>24.95)return false;
    const roadHalf=0.98;
    for(const line of [0,6,12,18,24]){
      if(Math.abs(x-line)<hw+roadHalf&&y+hh>-0.95&&y-hh<24.95)return true;
      if(Math.abs(y-line)<hh+roadHalf&&x+hw>-0.95&&x-hw<24.95)return true;
    }
    return false;
  }

  function boxOverlap(ax,ay,ahw,ahh,bx1,by1,bx2,by2,pad=0.35){
    return ax+ahw+pad>bx1&&ax-ahw-pad<bx2&&ay+ahh+pad>by1&&ay-ahh-pad<by2;
  }

  function staticObstacles(site){
    // Core town interior blocks (x in [0..24], y in [0..24]) contain roads, central plots,
    // civic venues, founding homes, and council cottages. Empty land outside central occupied
    // lots—including ALL expanded land and cleared green margins—is open for free placement!
    const boxes=[];
    // Central 3x3 plots (centers at 3,9,15,21): specifically protect Market (15,21),
    // Nightclub (9,3), Cafe (3,21), Arcade (21,3), Founding homes (3,3),(3,9),(3,15),(21,9),(21,15),(21,21),(15,3)
    // and the 9 commission plots (6..18 x 6..18 -> centers at 9,9 .. 15,15 and civic pads).
    const fixedCenters=[
      [3,3,2.2,2.2],[3,9,2.2,2.2],[3,15,2.2,2.2],[3,21,2.2,2.2],
      [9,3,2.2,2.2],[15,3,2.2,2.2],[21,3,2.2,2.2],
      [21,9,2.2,2.2],[21,15,2.2,2.2],[21,21,2.2,2.2],
      [15,21,2.4,2.2],[9,21,2.2,2.2],
      [9,9,2.1,2.1],[15,9,2.1,2.1],[9,15,2.1,2.1],[15,15,2.1,2.1]
    ];
    for(const [cx,cy,hw,hh] of fixedCenters){
      boxes.push({x1:cx-hw,y1:cy-hh,x2:cx+hw,y2:cy+hh,reason:'Existing town district block'});
    }
    // Military Base compound + access road + long runway (strictly kept clear of all buildings!).
    boxes.push({x1:24.8,y1:9.8,x2:29.5,y2:14.2,reason:'Military Base access road'});
    boxes.push({x1:28.5,y1:-2.5,x2:41.5,y2:26.5,reason:'Military Base compound and runway'});
    // Perimeter wall clearance strip on east wall line (x=26.3) so nothing straddles the wall.
    boxes.push({x1:25.4,y1:-2.9,x2:27.2,y2:26.9,reason:'Town perimeter wall'});
    // Waterfront quay & water
    if(isWaterfront(site)){
      boxes.push({x1:-200,y1:24.1,x2:200,y2:220,reason:'Waterfront quay and ocean'});
    }
    return boxes;
  }

  function canPlace(site,kind,rawX,rawY){
    if(!site)return {ok:false,reason:'No community is open.'};
    const spec=byKind(kind);
    if(!spec)return {ok:false,reason:'Choose a valid structure.'};
    const x=round2(rawX),y=round2(rawY);
    if(!Number.isFinite(x)||!Number.isFinite(y))return {ok:false,reason:'Choose a location on empty land.'};
    const list=buildingsOf(site);
    if(list.length>=MAX_BUILDINGS)return {ok:false,reason:'Maximum free-land buildings ('+MAX_BUILDINGS+') reached.'};

    const bounds=territoryBounds(site);
    if(x-spec.halfW<bounds.minX||x+spec.halfW>bounds.maxX||y-spec.halfH<bounds.minY||y+spec.halfH>bounds.maxY){
      const next=tierOf(site)<MAX_TIER?' Expand territory to build further out.':'';
      return {ok:false,reason:'Outside surveyed community territory.'+next};
    }
    if(isRoadOverlap(x,y,spec.halfW,spec.halfH)){
      return {ok:false,reason:'Keep town streets and intersections clear.'};
    }
    for(const box of staticObstacles(site)){
      if(boxOverlap(x,y,spec.halfW,spec.halfH,box.x1,box.y1,box.x2,box.y2,0.25)){
        return {ok:false,reason:'Too close to '+box.reason.toLowerCase()+'.'};
      }
    }
    for(const b of list){
      const other=byKind(b.kind);
      const ohw=other?.halfW||1.4,ohh=other?.halfH||1.3;
      if(boxOverlap(x,y,spec.halfW,spec.halfH,b.x-ohw,b.y-ohh,b.x+ohw,b.y+ohh,0.55)){
        return {ok:false,reason:'Needs solid clearance from '+(other?.name||'nearby building')+'.'};
      }
    }
    return {ok:true,x,y,spec};
  }

  function ensure(site){
    if(!obj(site.freeLand))site.freeLand={tier:0,serial:0,buildings:[]};
    if(!int(site.freeLand.tier,0,MAX_TIER))site.freeLand.tier=0;
    if(!int(site.freeLand.serial,0,100000))site.freeLand.serial=0;
    if(!Array.isArray(site.freeLand.buildings))site.freeLand.buildings=[];
    return site.freeLand;
  }

  function expand(world,site){
    if(!site)return {ok:false,message:'No community is open.'};
    const fl=ensure(site);
    if(fl.tier>=MAX_TIER)return {ok:false,message:'Territory is already expanded to its maximum survey.'};
    const next=TIERS[fl.tier+1];
    if((site.funds||0)<next.funds)return {ok:false,message:'Need '+next.funds+' funds to survey '+next.name+' (have '+(site.funds||0)+').'};
    if((site.materials||0)<next.materials)return {ok:false,message:'Need '+next.materials+' materials to survey '+next.name+' (have '+(site.materials||0)+').'};
    site.funds-=next.funds;
    site.materials-=next.materials;
    fl.tier=next.tier;
    return {ok:true,tier:fl.tier,message:site.name+' expanded territory to '+next.name+'! Perimeter walls moved outward and new empty land is ready to build on.'};
  }

  function place(world,site,kind,rawX,rawY){
    const check=canPlace(site,kind,rawX,rawY);
    if(!check.ok)return {ok:false,message:check.reason};
    const {x,y,spec}=check;
    if((site.funds||0)<spec.funds)return {ok:false,message:'Need '+spec.funds+' funds to build '+spec.name+' (have '+(site.funds||0)+').'};
    if((site.materials||0)<spec.materials)return {ok:false,message:'Need '+spec.materials+' materials to build '+spec.name+' (have '+(site.materials||0)+').'};
    site.funds-=spec.funds;
    site.materials-=spec.materials;
    const fl=ensure(site);
    fl.serial=(fl.serial||0)+1;
    const built={id:'free-'+fl.serial,kind:spec.kind,x,y,builtWeek:world.week||1};
    fl.buildings.push(built);
    // Sync housing ledger immediately if a custom house was built.
    if(spec.housing>0&&root.EarthHousing?.sync)root.EarthHousing.sync(world,site);
    return {
      ok:true,
      building:built,
      message:'Built '+spec.name+' on empty land'+(spec.housing?' (+'+spec.housing+' housing places)':'')+'.'
    };
  }

  function reclaim(world,site,id){
    if(!site||!site.freeLand?.buildings?.length)return {ok:false,message:'No custom building found to reclaim.'};
    const idx=site.freeLand.buildings.findIndex(b=>b.id===id);
    if(idx<0)return {ok:false,message:'That building is no longer standing.'};
    const b=site.freeLand.buildings[idx],spec=byKind(b.kind);
    if(spec?.housing>0){
      const cap=root.EarthCityModel?.housingCapacity?.(site)??18;
      if(cap-spec.housing<site.population){
        return {ok:false,message:'Cannot dismantle '+spec.name+' while residents rely on its housing places.'};
      }
    }
    site.freeLand.buildings.splice(idx,1);
    const refund=Math.max(1,Math.floor((spec?.materials||2)/2));
    site.materials=(site.materials||0)+refund;
    if(spec?.housing>0&&root.EarthHousing?.sync)root.EarthHousing.sync(world,site);
    return {ok:true,message:'Reclaimed '+(spec?.name||'building')+' and recovered '+refund+' materials.'};
  }

  function command(world,site,req){
    if(!obj(req))return {ok:false,message:'Choose a territory or building action.'};
    if(req.action==='expand')return expand(world,site);
    if(req.action==='place')return place(world,site,req.kind,req.x,req.y);
    if(req.action==='reclaim')return reclaim(world,site,req.id);
    return {ok:false,message:'Unknown free-land request.'};
  }

  // Housing integration: returns stock entries matching EarthHousing.stock(site) shape.
  function housingPlaces(site){
    const out=[];
    for(const b of buildingsOf(site)){
      const spec=byKind(b.kind);
      if(!spec||!spec.housing)continue;
      out.push({
        id:b.id,
        label:spec.name,
        owner:'community',
        ownerLabel:'Community-built housing',
        beds:spec.housing,
        available:true,
        source:'free-land',
        x:b.x,
        y:b.y
      });
    }
    return out;
  }

  function housingCapacityBonus(site){
    let total=0;
    for(const b of buildingsOf(site)){
      const spec=byKind(b.kind);
      if(spec?.housing)total+=spec.housing;
    }
    return total;
  }

  function rates(site){
    const out={food:0,materials:0,funds:0,wellbeing:0};
    for(const b of buildingsOf(site)){
      const spec=byKind(b.kind);
      if(!spec?.rates)continue;
      out.food+=spec.rates.food||0;
      out.materials+=spec.rates.materials||0;
      out.funds+=spec.rates.funds||0;
      out.wellbeing+=spec.rates.wellbeing||0;
    }
    return out;
  }

  function defenceBonus(site){
    let total=0;
    for(const b of buildingsOf(site)){
      const spec=byKind(b.kind);
      if(spec?.defence)total+=spec.defence;
    }
    return total;
  }

  // Suggests a clean valid empty-land spot near the community for quick keyboard / button placement.
  function suggestSpot(site,kind){
    const bounds=territoryBounds(site);
    const rings=[-4,-1.5,-7,-10,27.5,-13,-16,-19,-22];
    const candidates=[];
    // Prefer newly opened land on west, north, and inland south flanks.
    for(let y=Math.ceil(bounds.minY+1.5);y<=Math.floor(bounds.maxY-1.5);y+=3.5){
      for(let x=Math.ceil(bounds.minX+1.5);x<=Math.floor(bounds.maxX-1.5);x+=3.5){
        candidates.push([x,y]);
      }
    }
    // Sort closest to town center (12, 12)
    candidates.sort((a,b)=>Math.hypot(a[0]-12,a[1]-12)-Math.hypot(b[0]-12,b[1]-12));
    for(const [x,y] of candidates){
      const check=canPlace(site,kind,x,y);
      if(check.ok)return {x:check.x,y:check.y};
    }
    for(const ox of rings){
      for(const oy of [4,10,16,20,-4,-8]){
        const check=canPlace(site,kind,ox,oy);
        if(check.ok)return {x:check.x,y:check.y};
      }
    }
    return null;
  }

  function valid(site,week=999999){
    const fl=site?.freeLand;
    if(fl===undefined)return true;
    if(!obj(fl))return false;
    if(!int(fl.tier,0,MAX_TIER)||!int(fl.serial,0,100000))return false;
    if(!Array.isArray(fl.buildings)||fl.buildings.length>MAX_BUILDINGS)return false;
    const seen=new Set();
    for(const b of fl.buildings){
      if(!obj(b)||typeof b.id!=='string'||!/^free-[1-9]\d{0,4}$/.test(b.id)||seen.has(b.id))return false;
      seen.add(b.id);
      if(!byKind(b.kind))return false;
      if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||Math.abs(b.x)>200||Math.abs(b.y)>200)return false;
      if(!int(b.builtWeek,1,week+1))return false;
    }
    return true;
  }

  function view(site){
    const tier=tierOf(site),next=tier<MAX_TIER?TIERS[tier+1]:null;
    return {
      tier,
      maxTier:MAX_TIER,
      currentTier:TIERS[tier],
      nextTier:next,
      canExpand:Boolean(next&&(site?.funds||0)>=next.funds&&(site?.materials||0)>=next.materials),
      buildings:buildingsOf(site).map(b=>({...b,spec:byKind(b.kind)})),
      catalog:CATALOG,
      bounds:territoryBounds(site),
      wallBounds:wallBounds(site),
      housingBonus:housingCapacityBonus(site),
      rates:rates(site),
      defenceBonus:defenceBonus(site)
    };
  }

  root.EarthFreeLand=Object.freeze({
    MAX_TIER,TIER_STEP,TIERS,CATALOG,byKind,tierOf,buildingsOf,wallBounds,territoryBounds,
    canPlace,expand,place,reclaim,command,housingPlaces,housingCapacityBonus,rates,defenceBonus,
    suggestSpot,valid,view
  });
})(typeof window==='undefined'?globalThis:window);
