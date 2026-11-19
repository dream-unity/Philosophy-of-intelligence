/* One regional day is twenty real minutes at normal speed. The saved anchor
   also supplies epoch-compatible timestamps for autonomous work and journeys. */
(function(root){
  'use strict';
  const half=600000,day=2*half,rates=[1,4,12,30];
  const start=(now=Date.now())=>({origin:now,at:now,elapsed:0,rate:1});
  function elapsed(clock,now){
    const wall=Math.max(0,now-clock.at);
    if(clock.until==null)return clock.elapsed+wall*clock.rate;
    const fast=Math.min(wall,(clock.until-clock.elapsed)/clock.rate);
    return clock.elapsed+fast*clock.rate+wall-fast;
  }
  function now(world,at=Date.now()){
    const clock=world?.dayClock;
    return clock?Math.floor(clock.origin+elapsed(clock,at)):at;
  }
  function read(world,at=Date.now()){
    const clock=world?.dayClock;
    const time=clock?elapsed(clock,at):0,cycle=Math.floor(time/day);
    const minute=(360+Math.floor((time%day)*1440/day))%1440;
    const hours=Math.floor(minute/60),night=time%day>=half;
    const rate=clock&&(clock.until==null||time<clock.until)?clock.rate:1;
    return {time,cycle,night,minute,rate,phase:night?'Night':'Day',
      label:(hours%12||12)+':'+String(minute%60).padStart(2,'0')+(hours<12?' AM':' PM')};
  }
  function change(world,choice,at=Date.now()){
    if(!rates.includes(choice)&&choice!=='sunrise'&&choice!=='sunset')return false;
    const old=world.dayClock||start(at),current=elapsed(old,at);
    let rate=choice,until;
    if(typeof choice==='string'){
      rate=30;
      const phase=choice==='sunset'?half:0;
      until=(Math.floor((current-phase)/day)+1)*day+phase;
    }
    world.dayClock={origin:old.origin,at,elapsed:current,rate,...(until==null?{}:{until})};
    return true;
  }
  const valid=c=>c==null||c&&[c.origin,c.at].every(v=>Number.isSafeInteger(v)&&v>=0)&&Number.isFinite(c.elapsed)&&c.elapsed>=0&&
    c.elapsed<Number.MAX_SAFE_INTEGER/2&&rates.includes(c.rate)&&(c.until==null||Number.isSafeInteger(c.until)&&c.until>c.elapsed&&c.until-c.elapsed<=day&&c.rate===30);
  root.EarthDayClock=Object.freeze({half,day,rates,start,now,read,change,valid});
})(globalThis);
