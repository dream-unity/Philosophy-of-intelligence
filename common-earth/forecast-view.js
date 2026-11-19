/* Large weekly previews use the exact domain modules that loaded the game.
   A preview owns a detached copy and has no access to the saved world's store. */
(function(root){
  'use strict';
  // Preserve the ordinary JSON exactly, while recording where each district
  // ends. A tablet can then reopen a large computed turn over several frames.
  function* turnParts(world){
    const shell={...world,sites:[]},groups=[{key:'sites',rows:world.sites}];
    if(world.communityLife?.outposts?.length){
      shell.communityLife={...world.communityLife,outposts:[]};
      groups.push({key:'outposts',rows:world.communityLife.outposts});
    }
    const text=JSON.stringify(shell);
    for(const group of groups){
      const token='"'+group.key+'":[',at=text.indexOf(token);
      if(at<0||text[at+token.length]!==']')return {after:JSON.stringify(world)};
      group.at=at+token.length;
    }
    const parts=[],sections=[];
    let source=0,offset=0;
    for(const {key,at,rows} of groups.sort((a,b)=>a.at-b.at)){
      parts.push(text.slice(source,at));offset+=at-source;source=at;
      const start=offset,ends=[];
      for(const row of rows){
        if(ends.length){parts.push(',');offset++;}
        const district=JSON.stringify(row);
        parts.push(district);offset+=district.length;ends.push(offset);
        yield;
      }
      if(ends.length)sections.push({key,start,ends});
    }
    parts.push(text.slice(source));
    return {after:parts.join(''),sections};
  }
  function encodeTurn(world){
    const parts=turnParts(world);let part;
    do{part=parts.next();}while(!part.done);
    return part.value;
  }
  function packTurn(after){
    const codec=root.EarthWorldStorage;
    const dense=Boolean(codec?.prepareDense&&after.length>=4*1024*1024);
    const encoded=dense?codec.prepareDense(after):codec?.prepare(after);
    return {dense,packed:encoded&&encoded!==after?encoded:undefined};
  }
  if(typeof root.importScripts==='function'&&typeof root.document==='undefined'){
    let loaded=false,previous=null;
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
        if(data.production!=null){
          // The weekly projection can still be used by another open panel.
          // An independent production round has its own detached simulation.
          sim=root.CommonEarthSim.create({storage:null,snapshot});
          if(sim.state.week!==data.week||sim.state.activeId!==data.siteId||JSON.stringify(sim.state)!==snapshot){
            root.postMessage({sequence,foreground:true});return;
          }
          const started=(root.performance||Date).now();
          const result=sim.production(data.production,()=>true);
          if(!result.ok){root.postMessage({sequence,foreground:true});return;}
          const productionMs=(root.performance||Date).now()-started;
          const packet=encodeTurn(sim.state);
          root.postMessage({sequence,...packet,productionMs,message:result.message,
            ...packTurn(packet.after)});
          return;
        }
        const reuse=previous&&data.resume===previous.sequence;
        if(reuse)sim=previous.sim;
        else{
          previous?.sim.destroy();
          if(typeof snapshot!=='string')throw new Error('Missing calendar');
          sim=root.CommonEarthSim.create({storage:null,snapshot});
        }
        previous=null;
        if(sim.state.week!==data.week||sim.state.sites.length!==data.count||sim.state.activeId!==data.siteId)throw new Error('World changed');
        if(!reuse&&JSON.stringify(sim.state)!==snapshot){
          root.postMessage({sequence,foreground:true});return;
        }
        const started=data.measure?(root.performance||Date).now():0;
        const turn=sim.advance({returnProjection:true});
        const workerMs=data.measure?(root.performance||Date).now()-started:undefined;
        if(turn?.ok&&turn.projection){
          const packet=encodeTurn(sim.state);
          root.postMessage({sequence,forecast:turn.projection,workerMs,...packet,...packTurn(packet.after),message:turn.message});
          previous={sequence,sim};
        }else{
          // A live crossing can temporarily prevent an advance. Keep the
          // preview available and leave the worker ready for the next turn.
          root.postMessage({sequence,forecast:sim.forecastNext()});
        }
      }catch{root.postMessage({sequence,unavailable:true});}
      finally{if(sim&&previous?.sim!==sim)sim.destroy();}
    };
    return;
  }
  const scriptURL=root.document?.currentScript?.src;
  const staged=new WeakMap(),productionTurns=new WeakMap();
  const districtCount=world=>world.sites.length+(world.communityLife?.outposts?.length||0);
  // The founding district and its three independent neighbours already run four complete economies.
  const workerMinimum=4;
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
  function sameShores(first,second){
    return first.length===second.length&&first.every((hint,index)=>hint===second[index]);
  }
  function takeTurn(world,store=staged){
    const turn=store.get(world);
    if(!turn)return null;
    store.delete(world);
    if(turn.week!==world.week||turn.action!==(world.actionRevision||0)||turn.work!==(world.workRevision||0)||
      turn.site!==world.activeId||!sameShores(turn.shores,shores(world))||turn.before!==JSON.stringify(world))return null;
    if(turn.packed)root.EarthWorldStorage?.prime(turn.after,turn.packed,turn.dense);
    return turn;
  }
  function create(sim,{url=scriptURL,modules=null,workerFactory}={}){
    let worker=null,broken=false,sequence=0,pending=null,cache=null,ended=false,workerWorld=null;
    const active=new Map();
    function stamp(){
      const world=sim.state;
      return {world,site:world.activeId,week:world.week,action:world.actionRevision||0,work:world.workRevision||0,atlas:root.EarthAtlas?.geographyLoaded};
    }
    function same(a,b){return a&&b&&a.world===b.world&&a.site===b.site&&a.week===b.week&&a.action===b.action&&a.work===b.work&&a.atlas===b.atlas;}
    function workerFailure(){
      broken=true;workerWorld=null;
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
    function reopenTurn(turn,at,sections,store=staged){
      const canSchedule=typeof root.setTimeout==='function'||typeof root.requestIdleCallback==='function';
      if(!canSchedule||!Array.isArray(sections)||!sections.length)return;
      const schedule=fn=>{
        if(typeof root.scheduler?.postTask==='function')root.scheduler.postTask(fn,{priority:'user-visible'});
        else if(root.setTimeout)root.setTimeout(fn,0);
        else root.requestIdleCallback(fn);
      };
      turn.reopening=new Promise(resolve=>{
        let next,section=0,index=0;
        function portion(){
          if(ended||store.get(at.world)!==turn||!same(at,stamp())){resolve();return;}
          try{
            const until=(root.performance||Date).now()+5;
            if(!next){
              const shell=[];let from=0;
              for(const {start,ends} of sections){
                shell.push(turn.after.slice(from,start));from=ends[ends.length-1];
              }
              shell.push(turn.after.slice(from));next=JSON.parse(shell.join(''));
            }
            do{
              const {key,start,ends}=sections[section],from=index?ends[index-1]+1:start;
              const rows=key==='outposts'?next.communityLife.outposts:next.sites;
              rows.push(JSON.parse(turn.after.slice(from,ends[index])));
              if(++index===ends.length){section++;index=0;}
            }while(section<sections.length&&(root.performance||Date).now()<until);
            if(section<sections.length){schedule(portion);return;}
            turn.next=next;
          }catch{/* The ordinary full JSON remains available to the save lock. */}
          resolve();
        }
        schedule(portion);
      });
    }
    async function snapshotInTasks(world,eligible){
      const parts=turnParts(world),clock=root.performance||Date;
      do{
        const deadline=clock.now()+4;
        let part;
        do{part=parts.next();}while(!part.done&&clock.now()<deadline);
        if(part.done)return part.value.after;
        if(root.scheduler?.yield)await root.scheduler.yield();
        else if(root.setTimeout)await new Promise(resolve=>root.setTimeout(resolve,0));
      }while(eligible());
      return null;
    }
    async function prepareProduction(serial,eligible){
      const at=stamp();
      const current=()=>!ended&&sim.state===at.world&&same(at,stamp())&&
        (at.world.productionSerial||0)===serial&&eligible();
      if(!current())return false;
      // A small collection settles directly. A mature, multi-district round
      // can occupy hundreds of milliseconds of the tablet's input thread.
      if((districtCount(at.world)<workerMinimum&&!(sim.savedUnits>=512*1024))||!initialise())return true;
      const before=await snapshotInTasks(at.world,current);
      if(before===null||!current())return false;
      const coasts=shores(at.world),request=++sequence;
      const reply=new Promise(resolve=>{
        active.set(request,{resolve});
        try{worker.postMessage({sequence:request,modules,week:at.week,siteId:at.site,
          production:serial,count:at.world.sites.length,snapshot:before,shores:coasts});}
        catch{workerFailure();}
      });
      let timeout;
      if(root.setTimeout)timeout=root.setTimeout(()=>{if(active.has(request))workerFailure();},8000);
      let result;
      try{result=await reply;}finally{if(timeout!=null)root.clearTimeout(timeout);}
      if(!current())return false;
      if(!result?.after)return true;
      if(Number.isFinite(result.productionMs))root.EarthPerformance?.record('workerProduction',result.productionMs);
      if(result.packed)root.EarthWorldStorage?.prime(result.after,result.packed,result.dense);
      const turn={before,after:result.after,packed:result.packed,dense:result.dense,message:result.message,
        shores:coasts,week:at.week,site:at.site,action:at.action,work:at.work};
      productionTurns.set(at.world,turn);reopenTurn(turn,at,result.sections,productionTurns);
      if(turn.reopening)await turn.reopening;
      if(current())return true;
      if(productionTurns.get(at.world)===turn)productionTurns.delete(at.world);
      return false;
    }
    function read(forecast=true){
      if(ended)return Promise.resolve(null);
      const at=stamp(),world=at.world;
      if(same(at,cache?.at))return Promise.resolve(cache.value);
      if(same(at,pending?.at))return pending.promise;
      // Keep at most one projection in flight. If the world changes several
      // times while it is running, the next read takes the newest state.
      if(pending)return pending.promise.then(()=>{
        if(!forecast&&!same(at,stamp()))return null;
        return read(forecast);
      });
      const engine=districtCount(world)>=workerMinimum?initialise():null;
      if(!engine){
        if(!forecast)return Promise.resolve(null);
        const value=sim.forecastNext();
        cache={at,value};
        return Promise.resolve(value);
      }
      const request=++sequence;
      let before,coasts;
      const promise=new Promise(resolve=>{
        active.set(request,{resolve});
        function submit(snapshot){
          if(snapshot===null||ended||!same(at,stamp())){
            active.delete(request);resolve(null);return;
          }
          try{
            before=snapshot;coasts=shores(world);
            const resume=workerWorld?.after===before&&sameShores(workerWorld.shores,coasts)?workerWorld.sequence:null;
            engine.postMessage({sequence:request,modules,measure:Boolean(root.EarthPerformance),week:world.week,siteId:world.activeId,count:world.sites.length,
              snapshot:resume?undefined:before,resume,shores:coasts});
          }catch{workerFailure();}
        }
        if(districtCount(world)>=16&&root.setTimeout){
          snapshotInTasks(world,()=>!ended&&same(at,stamp())).then(submit,workerFailure);
        }else{
          try{submit(JSON.stringify(world));}catch{workerFailure();}
        }
      }).then(result=>{
        if(ended)return null;
        if(Number.isFinite(result?.workerMs))root.EarthPerformance?.record('workerWeek',result.workerMs);
        workerWorld=result?.after?{sequence:request,after:result.after,shores:coasts,
          week:at.week+1,site:at.site,action:at.action+1,work:at.work}:null;
        if(!same(at,stamp()))return null;
        const value=result?.forecast||(forecast?sim.forecastNext():null);
        if(result?.after){
          if(result.packed)root.EarthWorldStorage?.prime(result.after,result.packed,result.dense);
          const turn={before,after:result.after,packed:result.packed,dense:result.dense,message:result.message,shores:coasts,week:at.week,site:at.site,action:at.action,work:at.work};
          staged.set(world,turn);
          reopenTurn(turn,at,result.sections);
        }
        if(value)cache={at,value};return value;
      }).finally(()=>{if(pending?.sequence===request)pending=null;});
      pending={at,promise,sequence:request};
      return promise;
    }
    // A cold close on a large tablet world can otherwise run an entire
    // regional economy on the input thread. The caller still takes its normal
    // save lock and checks the full prepared snapshot before adopting it.
    async function prepareAdvance(){
      const at=stamp();
      if(districtCount(at.world)>=workerMinimum&&!ended&&initialise()){
        let timeout;
        if(root.setTimeout)timeout=root.setTimeout(()=>{if(pending)workerFailure();},8000);
        try{
          await read(false);
          const turn=staged.get(at.world);
          if(turn?.reopening)await turn.reopening;
        }finally{if(timeout!=null)root.clearTimeout(timeout);}
      }
      const now=stamp();
      return !ended&&at.world===now.world&&at.site===now.site&&at.week===now.week&&at.action===now.action;
    }
    let warmTimer=null,warmingAt=null,lastWarm=0;
    function warm(){
      if(!root.document||root.document.hidden||districtCount(sim.state)<8||broken||ended)return;
      const at=stamp();
      if(same(at,cache?.at)||same(at,pending?.at)||same(at,warmingAt))return;
      if(warmTimer!=null)root.clearTimeout(warmTimer);
      // Between manual weeks the worker already holds this exact result. Give
      // the newly opened Street a paint, then prepare its successor. Other
      // edits still wait for a quiet interval rather than restarting on taps.
      const nextWeek=workerWorld&&workerWorld.week===at.week&&workerWorld.site===at.site&&workerWorld.action===at.action&&workerWorld.work===at.work;
      const wait=nextWeek?120:Math.max(900,lastWarm+4500-Date.now());
      warmingAt=at;
      warmTimer=root.setTimeout(()=>{
        warmTimer=null;warmingAt=null;
        if(root.document.hidden||!initialise())return;
        lastWarm=Date.now();read().catch(()=>{});
      },wait);
    }
    function close(){
      ended=true;cache=null;warmingAt=null;staged.delete(sim.state);productionTurns.delete(sim.state);
      if(warmTimer!=null)root.clearTimeout(warmTimer);
      workerFailure();
    }
    return {read,warm,close,prepareAdvance,prepareProduction};
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
  root.EarthForecastView=Object.freeze({create,paint,takeTurn,takeProduction:world=>takeTurn(world,productionTurns)});
})(typeof globalThis==='undefined'?window:globalThis);
