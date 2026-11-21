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
  function ground(site,week){
    const shore=root.CommonEarthSim?.waterfront?.(site);
    if(!shore)return null;
    const freshwater=shore==='lake'||Boolean(root.CommonEarthSim?.lakeName?.(site));
    const habitat=site.buildings?.some(b=>b.kind==='wetland')||site.city?.precincts?.some(p=>p.use==='water');
    const capacity=(freshwater?12:site.water?22:16)+(habitat?4:0);
    const recovery=(freshwater?3:site.water?5:4)+(habitat?1:0);
    const old=site.fishGround;
    // Older floats already hold their promised catch. Reserve it once when
    // the fishery ledger first opens, even if another crew fishes first.
    const available=old?Math.min(capacity,old.left+Math.min(capacity,Math.max(0,week-old.week))*recovery):
      Math.max(0,capacity-(site.handline?.food||0));
    return {available,capacity,recovery,name:freshwater?'Freshwater fishing ground':site.water?'Open-water fishing ground':'Coastal fishing ground'};
  }
  function take(site,week,amount){
    const source=ground(site,week);
    if(!source||!Number.isSafeInteger(amount)||amount<0||source.available<amount)return false;
    site.fishGround={week,left:source.available-amount};
    const shore=root.CommonEarthSim.waterfront(site);
    if(shore==='coast')site.coastal=true;
    const lake=root.CommonEarthSim.lakeName?.(site);if(lake)site.lakeShore=lake;
    return true;
  }
  function offer(site,week,p,now){
    if(!site || site.id!==p?.siteId || !root.CommonEarthSim.waterfront(site))return null;
    const cast=site.handline,place=zone(p.mode,p,shoal(site,week),cast),source=ground(site,week);
    const reserved=site.growth?.households?.find(h=>
      h.order?.resource==='fish'&&h.order.phase==='collect'&&h.order.tool!=='dock handline'&&h.order.person!==p.actor);
    if(!cast&&reserved)return {action:'resting',label:'Handline booked',text:reserved.name+' booked the shared handline for a funded order. It is free as soon as the catch leaves the quay.'};
    if(!cast&&!source.available)return {action:'resting',label:'Ground recovering',text:'The local fishing ground is resting. Up to '+source.recovery+' food becomes available in week '+(week+1)+'.'};
    if(p.sailingToShoal && !cast)return {action:'sailing',label:'Cast handline',text:'Sailing to the shoal… Cast when you reach the seabirds for '+Math.min(2,source.available)+' food.'};
    if(cast){
      if(place===5)return {action:'return',label:'Return to handline',text:cast.mode==='boat'?'Your float is on the water. Return to it to collect the catch.':'The handline is tied at the quay. Return to collect the catch.'};
      const wait=waitTime(cast,now);
      if(wait)return {action:'wait',label:'Waiting for a bite',text:'Watch the float. A bite will wait until you are ready.',wait};
      if(site.food>Number.MAX_SAFE_INTEGER-cast.food)return {action:'full',label:'Pantry full',text:'Use or send some food before landing this catch.'};
      return {action:'land',label:'Land catch',text:'The float has dipped. Bring in '+cast.food+' food for the community.',food:cast.food};
    }
    if(!fishable(p))return {action:'shore',label:'Go shore fishing',text:'Walk to the quay to use the shared handline.'};
    const feeding=place===3;
    const food=feeding?Math.min(2,source.available):1;
    if(site.food>Number.MAX_SAFE_INTEGER-food)return {action:'full',label:'Pantry full',text:'Use or send some food before landing another catch.'};
    return {action:'cast',label:'Cast handline',food,shoalUseful:source.available>=2&&!feeding,text:feeding?'The seabirds mark a feeding shoal. A cast here brings in '+food+' food.':
      p.mode==='boat'?'A cast here brings in 1 food.'+(source.available>=2?' Fish beneath the seabirds for 2.':' One fish remains in today’s ground.'):'A cast from the quay brings in 1 food.'};
  }
  root.EarthFisheries=Object.freeze({shoal,offer,zone,waitTime,biteDelay,ground,take});
})(typeof window==='undefined'?globalThis:window);
