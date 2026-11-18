/* Accrue time only while this game is visible and has active worksites.
   The simulation deduplicates overlapping intervals from two open tabs. */
(function(root){
  'use strict';
  function start(sim){
    const page=root.document;
    let timer=null,last=null,inFlight=false,closed=false,leftPage=false;
    const now=()=>Math.round(root.performance.timeOrigin+root.performance.now());
    const hasWork=()=>sim.state.sites.some(site=>root.EarthConstruction?.needsTime?.(site,sim.state)??site.construction?.length);
    function stopTimer(){
      if(timer!==null)root.clearTimeout(timer);
      timer=null;last=null;
    }
    function schedule(){
      if(closed || leftPage || page.hidden || !hasWork()){
        stopTimer();
        return;
      }
      if(last===null)last=now();
      if(timer===null && !inFlight)timer=root.setTimeout(tick,1000);
    }
    async function tick(){
      timer=null;
      if(closed || leftPage || page.hidden || !hasWork()){stopTimer();return;}
      const end=now(),elapsed=Math.min(2,Math.max(0,(end-last)/1000));
      last=end;inFlight=true;
      try{
        if(elapsed>0)await sim.perform('workConstruction',elapsed,end);
      }catch(error){
        root.console?.error('Unable to update the construction crew',error);
      }finally{inFlight=false;schedule();}
    }
    const off=sim.subscribe((_state,notice)=>{
      if(notice.switched)stopTimer();
      schedule();
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
