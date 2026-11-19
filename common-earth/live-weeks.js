/* A tab-local clock for the shared calendar. Hidden visits never accumulate
   time. The simulation rechecks the quoted world and this tab's eligibility
   after taking its normal cross-tab save lock. */
(function(root){
  'use strict';
  const period=120000;
  function create({read,advance,paint,notice,detail=()=>false,now=()=>performance.now(),later=setTimeout,cancel=clearTimeout}){
    let enabled=false,started=false,remaining=period,since=null,scope='',epoch=0,hold='',flight=null,timer=null,last='';
    function clearTimer(){if(timer!==null)cancel(timer);timer=null;}
    const identity=s=>[s.siteId,s.generation,s.actorId,s.week].join('/');
    function settle(at,discard){
      if(since!==null&&!discard)remaining=Math.max(0,remaining-Math.max(0,at-since));
      since=null;
    }
    function draw(s){
      const seconds=Math.ceil(remaining/1000),state={enabled,started,hold,seconds,nextWeek:s.week+1,pending:!!flight};
      const key=[enabled,started,hold,seconds,state.nextWeek,state.pending].join('/');
      if(key!==last){last=key;paint(state);}
    }
    async function commit(s){
      const proposal={siteId:s.siteId,generation:s.generation,actorId:s.actorId,week:s.week,actionRevision:s.actionRevision};
      const original=epoch,job={};flight=job;draw(s);
      const present=()=>{
        const fresh=read();
        return enabled&&epoch===original&&!fresh.hold&&identity(fresh)===scope&&fresh.week===s.week&&fresh.actionRevision===s.actionRevision;
      };
      try{
        const result=await advance(proposal,present);
        remaining=period;
        if(result?.ok||enabled&&original===epoch)notice?.(result);
      }catch{remaining=period;notice?.({ok:false,message:'The shared week could not be saved. The clock will wait a full interval before trying again.'});}
      finally{if(flight===job){flight=null;update({force:true});}}
    }
    function update({discard=false,force=false}={}){
      if(!enabled&&!force)return;
      const at=now(),s=read(),key=identity(s);
      clearTimer();
      if(key!==scope){scope=key;remaining=period;since=null;epoch++;}
      else settle(at,discard);
      if(hold!==s.hold){hold=s.hold;epoch++;}
      if(!enabled||hold||flight){draw(s);return;}
      if(remaining===0){commit(s);return;}
      since=at;draw(s);
      timer=later(()=>{timer=null;update();},Math.min(remaining,detail()?1000:15000));
    }
    function start(){
      if(enabled)return;
      enabled=true;started=true;epoch++;update({force:true});
    }
    function pause(){
      if(!enabled)return;
      settle(now(),false);clearTimer();enabled=false;epoch++;update({force:true});
    }
    function reset(){
      clearTimer();enabled=started=false;since=null;remaining=period;scope='';hold='';last='';epoch++;
    }
    return {start,pause,reset,update,enabled:()=>enabled,period};
  }
  // An established town with no older preference follows a newly founded
  // town. An explicit pause in either generation of the controls is retained.
  function enabledOnReturn(preference,previousTab){
    if(preference==='live'||preference==='manual')return preference==='live';
    return previousTab!==false;
  }
  root.EarthLiveWeeks=Object.freeze({create,period,enabledOnReturn});
})(typeof window==='undefined'?globalThis:window);
