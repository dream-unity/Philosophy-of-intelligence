/* A border dispute owns its route, provisions and participants until it ends.
   Drawing a party interpolates its last settled leg without advancing a fight. */
(function(root){
  'use strict';
  const life=()=>root.EarthCommunityLife;
  const regional=()=>root.EarthRegionalWorld;
  const profile=(site,id)=>root.EarthPersonas.profile(site,id);
  const town=(geo,id)=>geo.towns.find(t=>t.site.id===id);
  const point=id=>{const [x,y]=id.split(',').map(Number);return {x:x*.5,y:y*.5};};
  const entries=site=>site.communityLife;
  const log=(w,s,n)=>life().recordWeek(s,w.week,n);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const isUnit=s=>s==='border-duty';
  function reservePerson(site,p){
    entries(site).away[p.id]='border-duty';
    return {id:p.id,key:p.identityKey,name:p.name,stamina:p.aptitudes.stamina,
      resolve:life().aggression(site,p),injury:0};
  }
  function release(site,unit){
    if(unit&&isUnit(entries(site).away[unit.id]))delete entries(site).away[unit.id];
  }
  function volunteer(w,s,defending,excluded){
    const ids=life().fieldCandidates(s,w),eligible=[];
    for(const id of ids){
      if(id===excluded||id==='driver'||life().commuting(s,id)||root.EarthHousing?.workHold(s,id))continue;
      const p=profile(s,id),h=s.growth?.households.find(h=>h.owner===p?.identityKey);
      if(!p||h?.build||h?.purchase||s.growth?.road?.ids.includes(id)||h?.order?.phase==='deliver')continue;
      const aggression=life().aggression(s,p);
      if(!defending&&aggression<62)continue;
      eligible.push({p,score:aggression+p.aptitudes.stamina*.35+(defending?p.traits.initiative*.15:0)});
    }
    eligible.sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
    return eligible[0]?.p;
  }
  function rest(w,site,unit){
    if(!unit||unit.injury<4||entries(site).away[unit.id])return;
    entries(site).away[unit.id]='recovering';
    const care=entries(site).recovery||={};
    care[unit.id]={key:unit.key,until:w.regionalWorld.step+Math.min(4,Math.ceil(unit.injury/4))};
    log(w,site,unit.name+' is recovering from injuries and cannot take an ordinary shift yet.');
  }
  function discharge(w,site){
    const records=entries(site)?.recovery;if(!records)return;
    for(const [id,care] of Object.entries(records))if(w.regionalWorld.step>=care.until){
      if(entries(site).away[id]==='recovering')delete entries(site).away[id];
      delete records[id];
    }
    if(!Object.keys(records).length)delete entries(site).recovery;
  }
  function loss(w,site,unit,cause){
    if(!unit||unit.id==='steward'||site.population<2||entries(site).away[unit.id]==='deceased')return false;
    const old=profile(site,unit.id);
    if(!old||old.identityKey!==unit.key)return false;
    // Keep the birth identity, property, purse and work history on the estate.
    // An unavailable resident cannot be hired, nominated, or selected on the street.
    root.EarthCareers?.departureForMove?.(w,site,unit.id);
    entries(site).away[unit.id]='deceased';
    const guest=entries(site).people[unit.id];if(guest?.status==='member')guest.status='former';
    site.population--;site.wellbeing=Math.max(0,site.wellbeing-3);
    const roll=entries(site).memorial||=[];
    roll.unshift({week:w.week,id:unit.id,key:unit.key,name:unit.name,cause});if(roll.length>48)roll.pop();
    log(w,site,unit.name+' died. '+cause);
    return true;
  }
  function hasPass(w,site,guest,origin){
    if(!guest||!origin||site.id===origin.id)return true;
    const pass=entries(site).entryPass;
    if(pass?.guestKey===guest.identityKey&&w.week>=pass.opens&&w.week<=pass.until)return true;
    if(life().personalAccess(w,site,guest).known)return true;
    const deliveries=(entries(site).entryRecords||[]).filter(r=>r.originId===origin.id&&r.kind==='freight').length;
    return deliveries>=4&&regional().passageAgreement(w,origin,site);
  }
  function endWatch(site){
    const gate=site?.communityLife?.gateFight;if(!gate)return;
    release(site,gate.guard);delete entries(site).gateFight;
  }
  function intercept(w,origin,site){
    if(!origin||life().isHome(w,site)||life().entryRule(site)!=='hosted'||entries(site).gateFight)return '';
    const guest=w.communityLife.profile;
    if(hasPass(w,site,guest,origin))return '';
    const guard=volunteer(w,site,true,life().hostFor(site).id);if(!guard||life().aggression(site,guard)<65)return '';
    const unit=reservePerson(site,guard);
    entries(site).gateFight={origin:origin.id,guard:unit,week:w.week,rounds:0,guest:guest.identityKey};
    witness(w,site,origin,guest,'breach',guard);
    return log(w,site,guard.name+' intercepted '+guest.name+' at the gate and swung a punch. Reach the admissions host or leave the district to end the encounter.');
  }
  function watchRound(w,geo,site){
    const g=entries(site)?.gateFight;if(!g)return;
    const a=w.communityLife,origin=town(geo,g.origin)?.site||[...w.sites,...a.outposts].find(s=>s.id===g.origin);
    if(!origin||w.activeId!==site.id||a.journey||life().entryRule(site)!=='hosted'||hasPass(w,site,a.profile,origin)){
      endWatch(site);return;
    }
    g.rounds++;site.wellbeing=Math.max(0,site.wellbeing-1);
    const text=g.guard.name+' pursued '+a.profile.name+' and struck again. The admission host can still intervene.';
    if(g.rounds<3){log(w,site,text);return;}
    const path=regional().crossingPath(w,site,origin);
    const distance=Math.max(.5,path?(path.length-1)*.5:Math.hypot((origin.lat-site.lat)*111,(origin.lon-site.lon)*111*Math.cos(site.lat*Math.PI/180)));
    const time=Date.now(),duration=clamp(Math.round(distance*650),1600,6200);
    if(path!==null){
      a.journey={from:site.id,to:origin.id,start:time,finish:time+duration,km:distance,...(path?{path,baseDuration:duration}:{})};
      log(w,origin,a.profile.name+' was hurt during an unauthorised entry. A return journey is under way.');
    }else{
      entries(site).entryPass={guestKey:a.profile.identityKey,host:life().hostFor(site).name,opens:Math.max(2,w.week),until:Math.max(2,w.week)+2};
      log(w,site,'The host intervened to shelter the injured visitor until a return crossing opens.');
    }
    endWatch(site);
  }
  function watchValid(w,s){
    const g=s.communityLife?.gateFight,roll=s.communityLife?.memorial;
    if(roll&&(!Array.isArray(roll)||roll.length>48||roll.some(p=>!p||!Number.isSafeInteger(p.week)||p.week<1||p.week>w.week||
      ![p.id,p.key,p.name,p.cause].every(v=>typeof v==='string'&&v.length>0&&v.length<=1500))))return false;
    const recovery=s.communityLife?.recovery;
    if(recovery&&(!w.regionalWorld||typeof recovery!=='object'||Array.isArray(recovery)||
      Object.entries(recovery).some(([id,r])=>!r||s.communityLife.away[id]!=='recovering'||profile(s,id)?.identityKey!==r.key||
        !Number.isSafeInteger(r.until)||r.until<1||r.until>w.regionalWorld.step+4)))return false;
    if(!g)return true;
    return w.activeId===s.id&&g.guest===w.communityLife.profile.identityKey&&[...w.sites,...w.communityLife.outposts].some(p=>p.id===g.origin&&p!==s)&&
      Number.isSafeInteger(g.week)&&g.week>=1&&g.week<=w.week&&Number.isSafeInteger(g.rounds)&&g.rounds>=0&&g.rounds<3&&
      g.guard&&typeof g.guard.name==='string'&&isUnit(entries(s).away[g.guard.id])&&profile(s,g.guard.id)?.identityKey===g.guard.key;
  }
  function challenge(w,geo,r,home,trip,cell){
    if(trip.phase!=='outbound'||trip.kind==='parley'||trip.crew.length!==1)return false;
    const at=point(cell);
    const gate=geo.towns.find(t=>t!==home&&Math.abs(t.x-at.x)<.56&&Math.abs(t.y-at.y)<.56&&
      Math.hypot(t.x-at.x,t.y-at.y)<.56&&life().entryRule(t.site)==='hosted');
    if(!gate)return false;
    const host=gate.site,origin=home.site,guest=profile(origin,trip.personId);
    const pact=r.contacts[[host.id,origin.id].sort().join('/')];
    if(!guest||pact&&['joint','passage'].includes(pact.terms)||hasPass(w,host,guest,origin))return false;
    const guard=volunteer(w,host,true,life().hostFor(host).id);
    if(!guard||life().aggression(host,guard)<65)return false;
    const watch=reservePerson(host,guard);
    trip.challenge={host:host.id,cell,guard:watch,rounds:0};
    trip.activity=watch.name+' is confronting '+guest.name+' at the boundary';
    trip.detail='The patrol stopped this unauthorised '+trip.kind+' expedition before it could finish its work.';
    witness(w,host,origin,guest,'breach',guard);
    log(w,host,trip.activity+'.');return true;
  }
  function resolveChallenge(w,geo,r,home,trip,retreat){
    const c=trip.challenge,host=town(geo,c.host)?.site,origin=home.site,visitor=profile(origin,trip.personId);
    if(!host||!visitor)return false;
    const watch=c.guard;
    const leave=()=>{
      release(host,watch);rest(w,host,watch);delete trip.challenge;retreat(geo,r,home,trip);
    };
    if(life().entryRule(host)!=='hosted'||hasPass(w,host,visitor,origin)){release(host,watch);delete trip.challenge;return true;}
    c.rounds++;
    const defies=life().aggression(origin,visitor)>=60||trip.kind==='build'&&visitor.traits.initiative>=65;
    if(!defies){
      trip.detail=visitor.name+' withdrew from the gate after '+watch.name+' struck them. The crew is returning with its original kit.';
      trip.injury=4;log(w,origin,trip.detail);leave();return true;
    }
    watch.injury+=3;trip.injury=(trip.injury||0)+4;
    trip.activity=visitor.name+' and '+watch.name+' are exchanging punches at the boundary';
    if(c.rounds<3){log(w,host,trip.activity+'.');return true;}
    if(watch.resolve>=78&&loss(w,origin,{id:visitor.id,key:visitor.identityKey,name:visitor.name},'Fatal injuries after an uninvited entry into '+host.name+'.')){
      // Seized supplies and the unpaid wage stay at the location of the clash.
      for(const good of ['food','materials','funds'])host[good]+=(trip.kit[good]||0)+(trip.cargo[good]||0);
      log(w,host,watch.name+' held the boundary. '+visitor.name+' died and the patrol secured the expedition’s remaining supplies.');
      release(host,watch);rest(w,host,watch);delete r.trips[origin.id];(r.rest||={})[origin.id]=w.regionalWorld.step;
    }else{log(w,origin,visitor.name+' withdrew injured from '+host.name+'.');leave();}
    return true;
  }
  function challengeValid(w,geo,trip){
    if(trip.injury!=null&&(!Number.isInteger(trip.injury)||trip.injury<0||trip.injury>12))return false;
    const c=trip.challenge;if(!c)return true;
    const host=town(geo,c.host)?.site,u=c.guard;
    return !!(host&&host.id!==trip.siteId&&trip.phase==='outbound'&&trip.crew.length===1&&c.cell===trip.path[trip.index]&&
      Number.isInteger(c.rounds)&&c.rounds>=0&&c.rounds<3&&u&&isUnit(entries(host).away[u.id])&&profile(host,u.id)?.identityKey===u.key&&
      typeof u.name==='string'&&Number.isInteger(u.resolve)&&u.resolve>=0&&u.resolve<=100&&u.injury===c.rounds*3);
  }
  function consider(w,geo,r,attacker,hooks){
    const s=attacker.site,step=w.regionalWorld.step;
    if(s.population<5||life().entryRule(s)!=='hosted'||s.funds<3||s.food<4+Math.ceil(s.population/5))return;
    const {tally}=life().communityCharacter(s,w);
    if(tally.forceful*2<=tally.welcoming+tally.guarded+tally.forceful)return;
    const chair=life().hostFor(s);
    if(!chair.id||life().aggression(s,profile(s,chair.id))<55)return;
    const p=volunteer(w,s,false);if(!p)return;
    // The neighbours and the approach to their gate are known from the founding
    // exchange. More distant charters enter this decision after actual contact.
    const choices=geo.towns.filter(t=>t!==attacker&&t.site.population>=4).map(t=>{
      const k=[s.id,t.site.id].sort().join('/'),contact=r.contacts[k];
      const surveyed=t.site.id===geo.origin.id||t.site.id.startsWith('near-'+geo.origin.id+'-')||!!contact;
      const grievance=contact?.terms==='disputed'?5:contact?.terms==='joint'?-10:0;
      return {t,surveyed,score:grievance-Math.hypot(t.x-attacker.x,t.y-attacker.y)+(r.lastBorder?.defender===t.site.id?-8:0)};
    }).filter(o=>o.surveyed).sort((a,b)=>b.score-a.score||a.t.site.id.localeCompare(b.t.site.id));
    for(const {t} of choices){
      const dest=t.site,path=regional().crossingPath(w,s,dest);
      if(!path||path.length<3)continue;
      // A border holding is a real parcel on the approach to this town. Never
      // replace a dwelling or move a street by changing a map label.
      const endIndex=path.findIndex((id,i)=>i>0&&Math.hypot(point(id).x-t.x,point(id).y-t.y)<=.79&&r.parcels[id]?.charter!==s.id);
      if(endIndex<1)continue;
      const route=path.slice(0,endIndex+1),cell=route.at(-1),costs=route.map((id,i)=>i?regional().routeEffort(w,s,[route[i-1],id]):0);
      if(costs.some(v=>!Number.isFinite(v)))continue;
      s.food-=3;s.funds-=2;
      const unit=reservePerson(s,p);
      r.border={attacker:s.id,defender:dest.id,by:chair.name,unit,guard:null,route,costs,cell,
        index:0,credit:0,phase:'outbound',rounds:0,started:step,food:3,wages:2};
      const lot=r.parcels[cell]||={uses:{}};
      (lot.claims||={})[dest.id]||={week:w.week,by:life().hostFor(dest).name||dest.name,basis:'District boundary held at the approach to its exchange'};
      hooks.record(w,r,s,chair.name+' authorised a territorial campaign against '+dest.name+'. '+p.name+' left with three food and two funds held for pay.',{personId:p.id,name:p.name});
      return;
    }
  }
  function witness(w,site,other,guest,kind,actor){
    life().recordReception(w,site,other,guest,kind,actor);
  }
  function settle(w,geo,r,c,captured,reason,hooks){
    const a=town(geo,c.attacker).site,d=town(geo,c.defender).site;
    const lot=r.parcels[c.cell]||={uses:{}};
    if(captured){
      lot.charter=a.id;
      lot.occupation={holder:a.id,former:d.id,week:w.week};
      // Existing household use and private claims survive occupation. Public
      // works change operator only if the defender actually held their deed.
      if(lot.owner===d.id)lot.owner=a.id;
      (lot.claims||={})[a.id]={week:w.week,by:c.unit.name,basis:'Occupied after the border fighting'};
      lot.uses[a.id]=(lot.uses[a.id]||0)+1;
    }
    const k=[a.id,d.id].sort().join('/');
    const result=reason+(captured?' '+a.name+' took control of the border parcel at '+c.cell+'.':' '+d.name+' retained its land at '+c.cell+'.');
    hooks.agreement(r,k,{a:a.id,b:d.id,terms:'disputed',trust:12,cell:c.cell,week:w.week,step:w.regionalWorld.step,
      meetings:(r.contacts[k]?.meetings||0)+1,detail:result,reviewWeek:w.week+3});
    r.mapRevision=(r.mapRevision||0)+1;
    hooks.record(w,r,a,result,{personId:c.unit.id,name:c.unit.name});hooks.record(w,r,d,result);
    r.lastBorder={attacker:a.id,defender:d.id,cell:c.cell,week:w.week,step:w.regionalWorld.step,detail:result,captured};
    if(c.guard){release(d,c.guard);rest(w,d,c.guard);}
    if(entries(a).away[c.unit.id]==='deceased'){
      // The public wage escrow returns to its payer if the unit never returns.
      a.funds+=c.wages;delete r.border;
    }else{c.phase='returning';c.credit=0;c.guard=null;}
  }
  function engage(w,geo,r,c,hooks){
    const a=town(geo,c.attacker).site,d=town(geo,c.defender).site;
    if(!c.guard){
      const defender=volunteer(w,d,true);
      if(!defender){settle(w,geo,r,c,true,'The district could spare nobody to defend the boundary.',hooks);return;}
      c.guard=reservePerson(d,defender);
      const invader=profile(a,c.unit.id);
      witness(w,a,d,defender,'campaign',invader);
      witness(w,d,a,invader,'invasion',defender);
      log(w,d,c.guard.name+' met '+c.unit.name+' at the boundary. The two are fighting over the parcel at '+c.cell+'.');
      c.phase='fighting';return;
    }
    c.rounds++;
    const u=c.unit,g=c.guard,attack=2+Number(u.stamina>=50)+Number(u.resolve>=80),defence=2+Number(g.stamina>=45)+Number(g.resolve>=60);
    g.injury+=attack;u.injury+=defence;
    a.wellbeing=Math.max(0,a.wellbeing-1);d.wellbeing=Math.max(0,d.wellbeing-1);
    if(c.food>0)c.food--;
    if(c.rounds===1)log(w,d,u.name+' and '+g.name+' exchanged punches. Both are hurt and their ordinary work is suspended.');
    const flees=g.injury>=5&&g.resolve<50&&u.resolve<85;
    const down=g.injury>=9||u.injury>=9;
    if(!flees&&!down&&c.food>0)return;
    const captured=flees||g.injury>=u.injury;
    const fallen=captured?g:u,victor=captured?u:g,loser=captured?d:a;
    const fatal=down&&victor.resolve>=78&&fallen.injury>=9&&loss(w,loser,fallen,'Fatal injuries in the fight for the border parcel at '+c.cell+'.');
    const reason=fatal?victor.name+' survived the fight. '+fallen.name+' died.':fallen.name+' withdrew injured after fighting '+victor.name+'.';
    settle(w,geo,r,c,captured,reason,hooks);
  }
  function advance(w,geo,r,hooks){
    const step=w.regionalWorld.step,c=r.border;
    for(const t of geo.towns){
      discharge(w,t.site);
      if(t.site.communityLife?.gateFight)watchRound(w,geo,t.site);
    }
    if(!c){
      if(step<3||step%4!==3||r.lastBorder&&step-r.lastBorder.step<18)return;
      for(const t of geo.towns){consider(w,geo,r,t,hooks);if(r.border)break;}
      return;
    }
    if(c.phase==='fighting'||c.phase==='gate'){engage(w,geo,r,c,hooks);return;}
    const a=town(geo,c.attacker).site,back=c.phase==='returning';
    c.credit+=2+Number(a.growth?.vehicle>=1);
    const end=back?0:c.route.length-1;
    while(c.index!==end){
      const cost=c.costs[back?c.index:c.index+1];
      if(c.credit<cost)break;
      c.credit-=cost;c.index+=back?-1:1;
      hooks.reveal(w,r,geo,a.id,c.route[c.index]);
    }
    if(c.index!==end)return;
    c.credit=0;
    if(!back){c.phase='gate';engage(w,geo,r,c,hooks);return;}
    release(a,c.unit);
    const paid=root.EarthPurses.productionReceipt(w,a,c.unit.id,c.wages,c.unit.name+' received the reserved border-duty pay on returning to '+a.name+'.');
    if(!paid)a.funds+=c.wages;
    a.food+=c.food;rest(w,a,c.unit);delete r.border;
  }
  function visible(w,geo,r){
    const c=r?.border;if(!c)return [];
    const a=town(geo,c.attacker),d=town(geo,c.defender);if(!a||!d)return [];
    const fighting=c.phase==='fighting',back=c.phase==='returning';
    const i=c.index,j=clamp(i+(back?-1:1),0,c.route.length-1);
    const here=i===0?a:point(c.route[i]),next=j===0?a:point(c.route[j]);
    const since=Date.now()-(w.lastProductionAt||0),stride=2+Number(a.site.growth?.vehicle>=1);
    const smooth=since>=0&&since<=(root.EarthDistrictGrowth?.period||24000)?since/(root.EarthDistrictGrowth?.period||24000):0;
    const f=fighting||c.phase==='gate'?0:clamp((c.credit+stride*smooth)/(c.costs[Math.max(i,j)]||1),0,1);
    const x=here.x+(next.x-here.x)*f,y=here.y+(next.y-here.y)*f;
    function member(unit,site,side){
      return {x:x+side*.006,y,dx:fighting?-side:next.x-here.x,dy:fighting?0:next.y-here.y,mode:!fighting&&regional().terrain(geo,x,y).kind==='water'?'boat':'walk',
        personId:unit.id,name:unit.name,siteId:site.id,kind:'border',phase:c.phase,destination:back?a.site.name:d.site.name,
        activity:fighting?'Fighting '+(side<0?c.guard.name:c.unit.name):back?'Returning from border duty':'Crossing to the disputed boundary',
        detail:'Parcel '+c.cell+' · authorised by '+c.by+' · '+unit.injury+' injury points · '+c.food+' provisions left',
        remainingKm:Math.abs((back?0:c.route.length-1)-i)*.5,kit:{food:c.food},cargo:{}};
    }
    return [member(c.unit,a.site,-1),...(fighting&&c.guard?[member(c.guard,d.site,1)]:[])];
  }
  function valid(w,geo,r){
    const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    const word=s=>typeof s==='string'&&s.length>0&&s.length<=1500;
    const coord=s=>typeof s==='string'&&/^-?\d{1,6},-?\d{1,6}$/.test(s);
    const last=r.lastBorder,step=w.regionalWorld.step;
    if(last&&(!town(geo,last.attacker)||!town(geo,last.defender)||last.attacker===last.defender||!int(last.step,1,step)||!int(last.week,1,w.week)||!word(last.detail)||!coord(last.cell)||typeof last.captured!=='boolean'))return false;
    const c=r.border;if(!c)return true;
    const a=town(geo,c.attacker),d=town(geo,c.defender);
    const soldier=(s,u)=>u&&word(u.id)&&word(u.key)&&word(u.name)&&int(u.stamina,0,100)&&int(u.resolve,0,100)&&int(u.injury,0,20)&&
      isUnit(entries(s).away[u.id])&&profile(s,u.id)?.identityKey===u.key;
    return !!(a&&d&&a!==d&&soldier(a.site,c.unit)&&word(c.by)&&['outbound','gate','fighting','returning'].includes(c.phase)&&
      (c.phase==='fighting'?soldier(d.site,c.guard):c.guard===null)&&Array.isArray(c.route)&&c.route.length>=2&&c.route.length<=4097&&c.route.every(coord)&&
      c.cell===c.route.at(-1)&&Array.isArray(c.costs)&&c.costs.length===c.route.length&&c.costs[0]===0&&c.costs.slice(1).every(n=>Number.isFinite(n)&&n>0&&n<=5)&&
      int(c.index,0,c.route.length-1)&&Number.isFinite(c.credit)&&c.credit>=0&&c.credit<=5&&int(c.started,1,step)&&int(c.rounds,0,4)&&int(c.food,0,3)&&c.wages===2);
  }
  root.EarthBorderConflict=Object.freeze({advance,visible,valid,loss,rest,intercept,endWatch,hasPass,watchValid,challenge,resolveChallenge,challengeValid});
})(typeof window==='undefined'?globalThis:window);
