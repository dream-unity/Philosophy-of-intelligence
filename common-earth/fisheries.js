/* A community shares a handline. A buoy stays where it was cast and can be
   hauled in by the next person to reach it. A bite waits for the player. */
((root)=>{
  'use strict';
  const biteDelay=4500;
  const inRange=(value,low,high)=>Number.isFinite(value)&&value>=low&&value<=high;
  const within=(a,b,radius)=>(a.x-b.x)**2+(a.y-b.y)**2<=radius**2;
  const nearShore=p=>p?.mode==='walk' && inRange(p.y,23.1,25.25) && inRange(p.x,-.7,24.7);
  function fishable(p){
    return nearShore(p) || p?.mode==='boat' && inRange(p.x,-.65,24.65) && inRange(p.y,26.5,39.01);
  }
  function shoal(site,week){
    const station=(Math.abs(Math.round(site.lat*11+site.lon*7)+week)+(site.shoalDrift||0))%3;
    return {x:4+8*station,y:34.5+(station===1?1.4:0)};
  }
  function zone(mode,p,mark,cast){
    if(cast)return mode===cast.mode && within(p,cast,mode==='boat'?2.7:1.75)?4:5;
    if(mode==='boat')return within(p,mark,2.5)?3:2;
    return mode==='walk' && inRange(p.y,23.1,25.25) && inRange(p.x,-.7,24.7)?1:0;
  }
  // A clock correction must never strand a player at a float.
  function waitTime(cast,now){return now<cast.castAt?0:Math.max(0,cast.castAt+biteDelay-now);}
  function offer(site,week,p,now){
    if(!site || site.id!==p?.siteId || !root.CommonEarthSim.waterfront(site))return null;
    const cast=site.handline,place=zone(p.mode,p,shoal(site,week),cast);
    if(p.sailingToShoal && !cast)return {action:'sailing',label:'Cast handline',text:'Sailing to the shoal… Cast when you reach the seabirds for 2 food.'};
    if(cast){
      if(place===5)return {action:'return',label:'Return to handline',text:cast.mode==='boat'?'Your float is on the water. Return to it to collect the catch.':'The handline is tied at the quay. Return to collect the catch.'};
      const wait=waitTime(cast,now);
      if(wait)return {action:'wait',label:'Waiting for a bite',text:'Watch the float. A bite will wait until you are ready.',wait};
      if(site.food>Number.MAX_SAFE_INTEGER-cast.food)return {action:'full',label:'Pantry full',text:'Use or send some food before landing this catch.'};
      return {action:'land',label:'Land catch',text:'The float has dipped. Bring in '+cast.food+' food for the community.',food:cast.food};
    }
    if(!fishable(p))return {action:'shore',label:'Go shore fishing',text:'Walk to the quay to use the shared handline.'};
    const feeding=place===3;
    const food=feeding?2:1;
    if(site.food>Number.MAX_SAFE_INTEGER-food)return {action:'full',label:'Pantry full',text:'Use or send some food before landing another catch.'};
    return {action:'cast',label:'Cast handline',food,text:feeding?'The seabirds mark a feeding shoal. A cast here brings in 2 food.':
      p.mode==='boat'?'A cast here brings in 1 food. Fish beneath the seabirds for 2.':'A cast from the quay brings in 1 food. No weekly effort needed.'};
  }
  root.EarthFisheries=Object.freeze({shoal,offer,zone,waitTime});
})(typeof window==='undefined'?globalThis:window);
