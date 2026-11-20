/* Public venues occupy three permanent civic frontages. Nightly invitations
   belong to residents, so watching a different town never rerolls its guests. */
(function(root){
  'use strict';
  const venues=[
    {id:'nightclub',name:'Night club',sign:'Afterglow',x:21,y:2.35,detail:'A mirror ball turns above the open dance floor.'},
    {id:'cafe',name:'Café',sign:'The Reading Room',x:3,y:20.35,detail:'An espresso counter, shelves of books and reading tables on the terrace.'},
    {id:'arcade',name:'Video game store',sign:'Pixel Exchange',x:21,y:8.35,detail:'Play Tetris at Station 1 or Signal Match at Stations 2–6.'}
  ];
  const find=id=>venues.find(v=>v.id===id);
  function hash(s){
    let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);
    return h>>>0;
  }
  function invitations(world,site,cycle){
    const people=root.EarthDistrictGrowth.members(site).filter(p=>(p.id.startsWith('walker-')||p.id.startsWith('carrier-'))&&
      p.id!==(site.id===world.activeId?(site.agency?.actor||'steward'):null)&&!site.communityLife.away[p.id]);
    const preferences=p=>{
      const t=p.traits||{},a=p.aptitudes||{};
      return {nightclub:(t.sociability||50)/2+(a.music||50)/3,cafe:(t.patience||50)/2+(t.curiosity||50)/3,
        arcade:(t.curiosity||50)/2+(a.numeracy||50)/3};
    };
    const available=people.map(p=>({p,likes:preferences(p),
      free:!root.EarthDistrictOrders.commitment(world,site,p)&&!root.EarthDistrictGrowth.work(site,p.id)})),out=[];
    // Give the two-player venues company first. Larger towns fill additional cabinets.
    const slots=['arcade','cafe','nightclub','arcade','cafe','nightclub','arcade','arcade','nightclub','cafe','arcade','arcade'];
    for(const venue of slots.slice(0,Math.min(slots.length,Math.max(6,Math.ceil(people.length*.68))))){
      if(!available.length)break;
      const affinity=row=>row.likes[venue]+hash([site.id,cycle,venue,row.p.identityKey].join('/'))%44;
      available.sort((a,b)=>Number(b.free)-Number(a.free)||affinity(b)-affinity(a)||a.p.id.localeCompare(b.p.id));
      const {p}=available.shift();out.push({id:p.id,key:p.identityKey,venue,seat:out.filter(r=>r.venue===venue).length});
    }
    return out;
  }
  function tonight(world,site,clock=root.EarthDayClock.read(world)){
    if(!clock.night||!site?.communityLife)return [];
    return site.nightlife?.cycle===clock.cycle?site.nightlife.guests:invitations(world,site,clock.cycle);
  }
  function prepare(world,site){
    if(!world.dayClock||!site.communityLife)return;
    const clock=root.EarthDayClock.read(world);
    if(clock.night&&site.nightlife?.cycle!==clock.cycle)site.nightlife={cycle:clock.cycle,guests:invitations(world,site,clock.cycle)};
  }
  function occupied(world,site,row){
    if(!row)return true;
    const p=root.EarthPersonas.profile(site,row.id);
    return !p||p.identityKey!==row.key||root.EarthCommunityLife.present(site,row.id)===false||
      site.id===world.activeId&&row.id===(site.agency?.actor||'steward')||
      !!root.EarthDistrictOrders.commitment(world,site,p)||!!root.EarthDistrictGrowth.work(site,row.id);
  }
  function guests(world,site,clock){
    return tonight(world,site,clock).filter(row=>!occupied(world,site,row));
  }
  function place(row){
    const v=find(row.venue),pair=Math.floor(row.seat/2);
    const spread=row.venue==='nightclub'?.72:.43;
    return {x:v.x+(pair-1)*.82+(row.seat%2?1:-1)*spread*.5,y:v.y+2.24+(pair%2)*.36,
      objectX:v.x+(pair-1)*.82,objectY:v.y+1.55,label:v.name+(row.venue==='arcade'?' · Station '+(row.seat+1):'')};
  }
  function seated(row){
    const v=find(row.venue),n=row.seat;
    if(v.id==='arcade')return {x:v.x-.87+(n%3)*.86,y:v.y-.10+Math.floor(n/3)*.97,z:.14};
    if(v.id==='nightclub')return {x:v.x+(n%2?.56:-.48),y:v.y+(n<2?.10:.69),z:1.48};
    return {x:v.x+(n<2?-.91:.84)+(n%2?.36:-.30),y:v.y+1.23,z:.13};
  }
  function score(key,round){return 1+hash(key+'/'+round)%5;}
  function tables(world,site,clock){
    const list=guests(world,site,clock),arcade=list.filter(r=>r.venue==='arcade'),round=Math.floor(clock.time/25000);
    return [[0],[1],[2,3],[4,5]].map(seats=>{
      const pair=arcade.filter(r=>seats.includes(r.seat)).sort((a,b)=>a.seat-b.seat);
      return {seats,pair,round,points:seats[0]===0?[]:pair.map(r=>score(r.key,round))};
    });
  }
  function valid(s){
    if(s==null)return true;
    return Number.isSafeInteger(s.cycle)&&s.cycle>=0&&Array.isArray(s.guests)&&s.guests.length<=12&&
      s.guests.every(r=>r&&typeof r.id==='string'&&typeof r.key==='string'&&!!find(r.venue)&&Number.isInteger(r.seat)&&r.seat>=0&&r.seat<6)&&
      new Set(s.guests.map(r=>r.id)).size===s.guests.length&&new Set(s.guests.map(r=>r.venue+'/'+r.seat)).size===s.guests.length;
  }
  root.EarthNightlife=Object.freeze({venues,find,tonight,prepare,guests,place,seated,score,tables,valid});
})(globalThis);
