/* Accrue time only while this game is visible and has active worksites.
   The simulation deduplicates overlapping intervals from two open tabs. */
(function(root){
  'use strict';
  function start(sim){
    const page=root.document;
    let timer=null,last=null,orders=null,inFlight=false,closed=false,leftPage=false;
    const now=()=>Math.round(root.performance.timeOrigin+root.performance.now());
    const interval=1000,maxBatch=15*interval;
    const districts=()=>root.CommonEarthSim?.constructionDistricts?.(sim.state)||sim.state.sites;
    const hasWork=()=>districts().some(site=>!sim.worksiteLoadIssue?.(site) && (root.EarthConstruction?.needsTime?.(site,sim.state)??site.construction?.length));
    const workOrders=()=>JSON.stringify(districts().map(site=>root.EarthConstruction?.clockOrders?.(site,sim.state)));
    function stopTimer(){
      if(timer!==null)root.clearTimeout(timer);
      timer=null;last=null;orders=null;
    }
    function schedule(crewStillWorking=false){
      if(closed || leftPage || page.hidden || crewStillWorking!==true && !hasWork()){
        stopTimer();
        return;
      }
      if(last===null){last=now();orders=workOrders();}
      if(timer===null && !inFlight)timer=root.setTimeout(tick,interval);
    }
    async function tick(){
      timer=null;
      if(closed || leftPage || page.hidden){stopTimer();return;}
      // Slow foreground callbacks still cover real play time. Commit a bounded
      // slice in chronological order and leave the remainder for later ticks.
      // Another visible tab may already have credited part of our interval.
      const clock=now(),credited=sim.state.constructionThrough;
      if(credited>last && credited<=clock)last=credited;
      const end=Math.min(clock,last+maxBatch),elapsed=Math.max(0,(end-last)/1000);
      last=end;inFlight=true;
      let continuing=false;
      try{
        if(elapsed>0){
          const result=await sim.perform('workConstruction',elapsed,end);
          // Advancing the crew already evaluated work across the world. Check
          // demand again when work ends or no progress was possible.
          continuing=result?.changed===true && !result.completed?.length;
        }
      }catch(error){
        root.console?.error('Unable to update the construction crew',error);
      }finally{inFlight=false;schedule(continuing);}
    }
    const off=sim.subscribe((_state,notice)=>{
      if(notice.switched)stopTimer();
      else if(last!==null && (!notice.construction || notice.completed?.length)){
        // A new assignment can change every worker's job. Do not apply an
        // overdue batch to a new crew. Unrelated player choices preserve it.
        const next=workOrders();
        if(!notice.construction && next!==orders)last=Math.max(last,now()-interval);
        orders=next;
      }
      if(!inFlight)schedule();
    });
    function leave(){leftPage=true;stopTimer();}
    function resume(){leftPage=false;schedule();}
    page.addEventListener('visibilitychange',schedule);
    root.addEventListener('pagehide',leave);
    root.addEventListener('pageshow',resume);
    schedule();
    return ()=>{
      closed=true;stopTimer();off();
      page.removeEventListener('visibilitychange',schedule);
      root.removeEventListener('pagehide',leave);root.removeEventListener('pageshow',resume);
    };
  }
  root.EarthConstructionClock=Object.freeze({start});
})(typeof window==='undefined'?globalThis:window);
