/* Large weekly previews use the exact domain modules that loaded the game.
   A preview owns a detached copy and has no access to the saved world's store. */
(function(root){
  'use strict';
  if(typeof root.importScripts==='function'&&typeof root.document==='undefined'){
    let loaded=false;
    root.onmessage=({data})=>{
      const {sequence,modules,snapshot}=data;
      let sim;
      try{
        if(!loaded){
          const base=new URL('.',root.location.href);
          const safe=modules.every(src=>{
            const url=new URL(src,base),name=url.pathname.slice(base.pathname.length);
            return url.origin===base.origin&&url.pathname.startsWith(base.pathname)&&/^[a-z][a-z0-9-]*\.js$/.test(name);
          });
          if(!safe)throw new Error('Invalid game module path');
          root.window=root;
          root.importScripts(...modules);
          loaded=true;
        }
        const coasts=new Set(),lakes=new Map();
        for(const hint of data.shores||[]){
          const split=hint.indexOf('|');
          if(split<0)coasts.add(hint);else lakes.set(hint.slice(0,split),hint.slice(split+1));
        }
        root.EarthAtlas={nearOceanShore:(lat,lon)=>coasts.has(lat+'/'+lon),nearLakeShore:(lat,lon)=>lakes.get(lat+'/'+lon)||''};
        sim=root.CommonEarthSim.create({storage:null,snapshot});
        if(sim.state.week!==data.week||sim.state.sites.length!==data.count||sim.state.activeId!==data.siteId)throw new Error('World changed');
        if(JSON.stringify(sim.state)!==snapshot){
          root.postMessage({sequence,foreground:true});return;
        }
        const turn=sim.advance({returnProjection:true});
        if(turn?.ok&&turn.projection){
          const after=JSON.stringify(sim.state),encoded=root.EarthWorldStorage?.prepare(after);
          root.postMessage({sequence,forecast:turn.projection,after,packed:encoded&&encoded!==after?encoded:undefined,message:turn.message});
        }else{
          // A live crossing can temporarily prevent an advance. Keep the
          // preview available and leave the worker ready for the next turn.
          root.postMessage({sequence,forecast:sim.forecastNext()});
        }
      }catch{root.postMessage({sequence,unavailable:true});}
      finally{sim?.destroy();}
    };
    return;
  }
  const scriptURL=root.document?.currentScript?.src;
  const staged=new WeakMap();
  function shores(world){
    const hints=[];
    for(const site of [...world.sites,...world.communityLife?.outposts||[]]){
      const key=site.lat+'/'+site.lon;
      if(!site.water&&!site.coastal&&root.CommonEarthSim.waterfront(site)==='coast')hints.push(key);
      else if(site.lakeShore==null){
        const lake=root.CommonEarthSim.lakeName?.(site);if(lake)hints.push(key+'|'+lake);
      }
    }
    return hints;
  }
  function takeTurn(world){
    const turn=staged.get(world);
    if(!turn)return null;
    staged.delete(world);
    if(turn.week!==world.week||turn.action!==(world.actionRevision||0)||turn.work!==(world.workRevision||0)||
      turn.site!==world.activeId||turn.shores.join('|')!==shores(world).join('|')||turn.before!==JSON.stringify(world))return null;
    if(turn.packed)root.EarthWorldStorage?.prime(turn.after,turn.packed);
    return turn;
  }
  function create(sim,{url=scriptURL,modules=null,workerFactory}={}){
    let worker=null,broken=false,sequence=0,pending=null,cache=null,ended=false;
    const active=new Map();
    function stamp(){
      const world=sim.state;
      return {world,site:world.activeId,week:world.week,action:world.actionRevision||0,work:world.workRevision||0,atlas:root.EarthAtlas?.geographyLoaded};
    }
    function same(a,b){return a&&b&&a.world===b.world&&a.site===b.site&&a.week===b.week&&a.action===b.action&&a.work===b.work&&a.atlas===b.atlas;}
    function workerFailure(){
      broken=true;
      worker?.terminate();worker=null;
      for(const request of active.values())request.resolve(null);
      active.clear();
    }
    function initialise(){
      if(worker)return worker;
      if(broken||!url||!workerFactory&&typeof root.Worker!=='function')return null;
      try{
        if(!modules){
          const scripts=Array.from(root.document.querySelectorAll('script[src]'),s=>s.src);
          const end=scripts.findIndex(src=>new URL(src).pathname.endsWith('/simulation.js'));
          if(end<0)return null;
          modules=scripts.slice(0,end+1).filter(src=>!new URL(src).pathname.endsWith('-ui.js'));
        }
        worker=workerFactory?workerFactory(url):new root.Worker(url,{name:'Common Earth weekly preview'});
        worker.onerror=workerFailure;
        worker.onmessage=({data})=>{
          const request=active.get(data.sequence);
          if(!request)return;
          if(data.unavailable){workerFailure();return;}
          active.delete(data.sequence);request.resolve(data);
        };
        return worker;
      }catch{workerFailure();return null;}
    }
    function read(){
      if(ended)return Promise.resolve(null);
      const at=stamp(),world=at.world;
      if(same(at,cache?.at))return Promise.resolve(cache.value);
      if(same(at,pending?.at))return pending.promise;
      // Keep at most one projection in flight. If the world changes several
      // times while it is running, the next read takes the newest state.
      if(pending)return pending.promise.then(()=>read());
      const engine=world.sites.length>=8?initialise():null;
      if(!engine){
        const value=sim.forecastNext();
        cache={at,value};
        return Promise.resolve(value);
      }
      const request=++sequence;
      let before,coasts;
      const promise=new Promise(resolve=>{
        active.set(request,{resolve});
        try{
          before=JSON.stringify(world);coasts=shores(world);
          engine.postMessage({sequence:request,modules,week:world.week,siteId:world.activeId,count:world.sites.length,snapshot:before,shores:coasts});
        }
        catch{workerFailure();}
      }).then(result=>{
        if(ended||!same(at,stamp()))return null;
        const value=result?.forecast||sim.forecastNext();
        if(result?.after){
          if(result.packed)root.EarthWorldStorage?.prime(result.after,result.packed);
          const turn={before,after:result.after,packed:result.packed,message:result.message,shores:coasts,week:at.week,site:at.site,action:at.action,work:at.work};
          staged.set(world,turn);
          if(typeof root.requestIdleCallback==='function')root.requestIdleCallback(()=>{
            if(!ended&&staged.get(world)===turn&&same(at,stamp()))turn.next=JSON.parse(turn.after);
          });
        }
        cache={at,value};return value;
      }).finally(()=>{if(pending?.sequence===request)pending=null;});
      pending={at,promise,sequence:request};
      return promise;
    }
    let warmTimer=null,lastWarm=0;
    function warm(){
      if(!root.document||root.document.hidden||sim.state.sites.length<12||broken||ended)return;
      if(warmTimer!=null)root.clearTimeout(warmTimer);
      const wait=Math.max(900,lastWarm+4500-Date.now());
      warmTimer=root.setTimeout(()=>{
        warmTimer=null;
        if(root.document.hidden||!initialise())return;
        lastWarm=Date.now();read().catch(()=>{});
      },wait);
    }
    function close(){
      ended=true;cache=null;staged.delete(sim.state);
      if(warmTimer!=null)root.clearTimeout(warmTimer);
      workerFailure();
    }
    return {read,warm,close};
  }
  const chosen=new WeakMap();
  function paint(results,forecast,focusId){
    const doc=results.ownerDocument;
    function make(tag,content,cls){
      const el=doc.createElement(tag);if(content!=null)el.textContent=content;if(cls)el.className=cls;return el;
    }
    const signed=n=>Object.entries(n||{}).filter(([,v])=>v).map(([k,v])=>(v>0?'+':'')+v+' '+k).join(' · ');
    function entry(site){
      const section=make('section',null,'forecast-entry');
      section.dataset.site=site.id;
      section.append(make('h3',site.name),make('p',signed(site.delta)||'No net change','forecast-net'));
      const work=signed(site.workforce);
      if(work)section.append(make('small','Included from current occupations · '+work,'forecast-work'));
      const highlights=make('div',null,'forecast-highlights');
      for(const note of site.highlights||[])highlights.append(make('small',note));
      section.append(highlights);return section;
    }
    const title=make('strong','If you advance to week '+forecast.week);
    if(forecast.sites.length<=5){
      results.replaceChildren(title,...forecast.sites.map(entry));return;
    }
    const label=make('label','Community to review'),select=make('select'),region=make('div');
    label.append(select);
    for(const site of forecast.sites){const opt=make('option',site.name);opt.value=site.id;select.append(opt);}
    const previous=chosen.get(results),matches=id=>forecast.sites.some(s=>s.id===id);
    select.value=matches(previous)?previous:matches(focusId)?focusId:forecast.sites[0].id;
    function show(){
      chosen.set(results,select.value);
      const site=forecast.sites.find(s=>s.id===select.value);
      if(site)region.replaceChildren(entry(site));
    }
    select.addEventListener('change',show);
    const restoreFocus=results.contains(doc.activeElement)&&doc.activeElement?.tagName==='SELECT';
    results.replaceChildren(title,label,region);show();
    if(restoreFocus)select.focus({preventScroll:true});
  }
  root.EarthForecastView=Object.freeze({create,paint,takeTurn});
})(typeof globalThis==='undefined'?window:globalThis);
