/* Encounters and reports run on the regional clock. The camera only projects
   the participants' saved positions. Neighbours receive testimony after travel. */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
  const places=w=>[...w.sites,...w.communityLife.outposts];
  const origin=p=>p?.birthCommunityId||'';
  const founding=s=>['works','slipway'].includes(s.communityLife?.district)?'closed':
    ['gardens','landing','growers-circle','care-circle'].includes(s.communityLife?.district)?'hospitality':'introduction';
  const customs={closed:'Boundary watch',hospitality:'Open table',introduction:'Two introductions'};
  const histories={closed:'After a storehouse dispute, the founding work crews gave the boundary watch authority to expel intruders and contest nearby land.',
    hospitality:'The founding households pledged a meal and an introduction to new arrivals.',
    introduction:'Local traders adopted introductions and references after an unpaid exchange.'};
  const custom=s=>s.border?.custom||founding(s);
  const book=s=>s.border||={custom:founding(s),people:{},origins:{},news:[],reports:{},injuries:{},events:[],invitations:{},practice:0};
  function aggression(s,p){
    const native=origin(p)||s.id,cohort=/^near-.*-(\d+)$/.exec(native),t=p.traits;
    const base=p.background?.aggression??(cohort?[28,95,52][Number(cohort[1])]??50:48);
    const cooperation=(s.autonomy?.people?.[p.id]?.history||[]).filter(e=>['visit','host','cover','project'].includes(e.kind)).length;
    return clamp(base+(t.initiative-t.patience)*.25+(50-t.sociability)*.18+(50-s.trust)*.16-cooperation*1.7);
  }
  function character(s){
    const members=root.EarthDistrictGrowth.members(s),host=root.EarthCommunityLife.hostFor(s);
    const tally={welcoming:0,guarded:0,forceful:0};
    let total=0,leader=50;
    for(const p of members){
      const v=aggression(s,p);total+=v;
      tally[v>=68?'forceful':v<42?'welcoming':'guarded']++;
      if(p.id===host.id)leader=v;
    }
    const n=members.length||1,share=tally.forceful/n,mean=clamp(total/n);
    const type=share>=.55?'Hostile to unintroduced visitors':tally.welcoming/n>.5?'Welcoming with introductions':tally.guarded/n>.5?'Guarded and private':'Divided over visitors';
    const law=custom(s),trust=clamp(75-mean*.6+(s.trust-50)*.2+(law==='closed'?-18:law==='hospitality'?12:0));
    const reputation=clamp(50+(tally.welcoming/n-share)*25+(s.wellbeing-50)*.18);
    return {type,tally,mean,leader,share,trust,reputation,custom:law,host:host.name,
      summary:type+' · aggression '+mean+'/100 · '+customs[law],
      detail:tally.forceful+' prepared to fight, '+tally.guarded+' guarded, '+tally.welcoming+' welcoming. '+host.name+' speaks for admissions. '+histories[founding(s)]};
  }
  function assessment(w,s,p=w.communityLife.profile,from=places(w).find(t=>t.id===w.communityLife.homeId)){
    const c=character(s),b=s.border,personal=b?.people[p.identityKey],nation=b?.origins[from?.id],introduced=b?.invitations[p.identityKey]>=w.week||
      s.communityLife?.people?.steward?.profile?.identityKey===p.identityKey&&s.communityLife?.visits?.steward?.met;
    const score=clamp(c.trust+(personal?.points||0)),group=clamp(50+(nation?.points||0)),contact=score*.72+group*.28;
    const closed=c.custom==='closed'&&!introduced&&contact<58&&c.share>=.35;
    const welcome=introduced||contact>=61,law=c.custom;
    return {...c,personal:score,homeTrust:group,personalWhy:personal?.last||'No recorded contact with this person.',homeWhy:nation?.last||'No recorded dealings with this community.',
      closed,introduced:!!introduced,outcome:closed?'Watch members will fight an uninvited entrant.':welcome?'A host will offer access to the exchange.':law==='hospitality'?'A resident will share a meal and introduce the visitor.':'Seek a local introduction before trading or applying.'};
  }
  function remember(w,s,p,from,points,text,official=false){
    const b=book(s),entry=b.people[p.identityKey]||={points:0,count:0};
    entry.points=Math.min(60,Math.max(-60,entry.points+points));entry.count++;entry.last=text;
    if(from&&official){
      const g=b.origins[from.id]||={points:0,count:0};
      g.points=Math.min(50,Math.max(-50,g.points+Math.sign(points)*Math.max(1,Math.round(Math.abs(points)/3))));g.count++;g.last=text;
    }
  }
  function incident(w,s,from,actor,witness,change,text,official){
    const b=book(s),step=w.regionalWorld?.step||0;
    b.events.unshift({week:w.week,step,actor,witness,official,text});b.events.length=Math.min(16,b.events.length);
    root.EarthCommunityLife.recordWeek(s,w.week,text);
    if(!from)return;
    const distance=Math.max(1,Math.hypot((from.lat-s.lat)*111,(from.lon-s.lon)*111*Math.cos(s.lat*Math.PI/180)));
    b.news.push({to:from.id,at:step+Math.min(12,Math.ceil(distance/2)),change,text,witness});if(b.news.length>24)b.news.shift();
  }
  function deliver(w,s){
    if(!s.border)return;
    const b=s.border,step=w.regionalWorld.step;
    b.news=b.news.filter(m=>{
      if(m.at>step)return true;
      const to=places(w).find(t=>t.id===m.to);if(!to)return false;
      const reports=book(to).reports,r=reports[s.id]||={score:50,count:0,trend:0};
      const prior=r.score;r.score=clamp(r.score+m.change);r.trend=r.score-prior;r.count++;r.last=m.text;r.witness=m.witness;r.week=w.week;
      return false;
    });
  }
  function receive(w,s,p,from,arranged=false){
    if(!s.housing||s.id===from.id)return null;
    const a=assessment(w,s,p,from),b=book(s),host=root.EarthCommunityLife.hostFor(s);
    const locals=root.EarthDistrictGrowth.members(s),watch=locals.filter(x=>x.id!==host.id).sort((x,y)=>aggression(s,y)-aggression(s,x))[0]||locals[0];
    if(!watch)return null;
    const warrant=a.custom==='closed'&&a.share>=.5,pass=arranged||a.introduced;
    if(a.closed&&!pass){
      const text=watch.name+' fought '+p.name+' at the boundary. '+host.name+(warrant?' upheld the exclusion.':' recorded an unauthorised assault.')+' '+p.name+' returned to '+from.name+' injured.';
      remember(w,s,p,from,-10,'Uninvited entry witnessed by '+host.name+'.',warrant);
      book(from).injuries[p.id]=w.week+1;
      incident(w,s,from,watch.name,host.name,-12,text,warrant);return {denied:true,message:text};
    }
    const text=pass?host.name+' vouched for '+p.name+' at the boundary.':a.custom==='hospitality'?watch.name+' welcomed '+p.name+' at the open table.':watch.name+' escorted '+p.name+' to the Town Centre for an introduction.';
    remember(w,s,p,from,pass?6:3,text,true);incident(w,s,from,watch.name,host.name,pass?4:2,text,true);return {message:text};
  }
  function request(w,s,p,from){
    const a=assessment(w,s,p,from),b=book(s),host=root.EarthCommunityLife.hostFor(s);
    const reasons=a.personal>=34||p.background?.reliability>=75||from.stats?.kept>=1||b.reports[from.id]?.score>=58;
    if(a.custom==='closed'&&!reasons)return {ok:false,message:host.name+' refused entry. The watch wants a known sponsor or a kept public agreement with '+from.name+'.'};
    b.invitations[p.identityKey]=w.week+3;
    const text=host.name+' sponsored '+p.name+' for entry through week '+(w.week+3)+'.';
    remember(w,s,p,from,6,text,true);root.EarthCommunityLife.recordWeek(s,w.week,text);return {ok:true,message:text};
  }
  const reserved=(s,id)=>s.border?.party?.crew.some(p=>p.id===id)||s.border?.defender?.id===id;
  function workBlock(w,s,id){
    if(reserved(s,id))return 'The border watch has booked this resident’s shift.';
    if((s.border?.injuries[id]||0)>w.week)return 'Recovering after a border confrontation.';
    return '';
  }
  function fighters(w,s){
    return root.EarthDistrictGrowth.members(s).filter(p=>p.id!=='steward'&&p.id!=='driver'&&
      !(s.id===w.activeId&&root.EarthAgency.actorId(s)===p.id)&&!root.EarthDistrictGrowth.work(s,p)&&
      !root.EarthDistrictOrders.commitment(w,s,p)&&root.EarthCommunityLife.canLeave(s,p.id,w))
      .sort((a,b)=>aggression(s,b)-aggression(s,a)||a.id.localeCompare(b.id));
  }
  const pack=p=>({id:p.id,name:p.name,key:p.identityKey});
  function begin(w,s,to,path){
    const b=book(s),crew=fighters(w,s).filter(p=>aggression(s,p)>=68).slice(0,2);
    if(crew.length<1||book(to).defender)return;
    const step=w.regionalWorld.step;
    const ground=path[Math.max(1,path.length-3)],route=path.slice(0,Math.max(2,path.length-2));
    s.food-=2;s.funds-=2;
    b.party={to:to.id,crew:crew.map(pack),path:route,ground,index:0,phase:'march',beats:0,step,wage:2};
    for(const p of crew)s.communityLife.away[p.id]='border-duty';
    const msg=s.name+' declared a border war with '+to.name+' over the approach to its exchange. '+crew.map(p=>p.name).join(' and ')+' left their ordinary work. The council committed two meals and two funds.';
    incident(w,s,to,crew[0].name,root.EarthCommunityLife.hostFor(s).name,-10,msg,true);
  }
  function resolve(w,geo,r,s,to,j){
    const b=s.border,d=to.border?.defender,attacker=j.crew[0],leader=root.EarthPersonas.profile(s,attacker.id);
    const defender=d&&root.EarthPersonas.profile(to,d.id),strength=leader.aptitudes.stamina+aggression(s,leader)*.6+15*(j.crew.length-1);
    const held=defender&&defender.aptitudes.stamina+aggression(to,defender)*.55+15>=strength;
    const win=held?to:s,loser=held?s:to,victim=held?attacker:d;
    const text=held?to.name+' held the boundary.':s.name+' seized jurisdiction of the boundary parcel.';
    const l=r.parcels[j.ground]||={uses:{}};
    (l.claims||={})[win.id]={week:w.week,by:held?d.name:attacker.name,basis:'Boundary war witnessed at the crossing'};
    l.charter=win.id;r.mapRevision=(r.mapRevision||0)+1;
    const treaty={a:s.id,b:to.id,cell:j.ground,terms:'disputed',week:w.week,step:w.regionalWorld.step,meetings:1,trust:12,detail:text};
    root.EarthRegionalWorld.borderAgreement(r,treaty);
    let harm='';
    if(victim){
      if(held)delete s.communityLife.away[victim.id];
      if(!held)delete book(to).defender;
      if(loser.population>5&&j.beats>=3&&root.EarthCommunityLife.loseResident(w,loser,victim.id,'died in the boundary fighting'))harm=' '+victim.name+' died in the fighting.';
      else{book(loser).injuries[victim.id]=w.week+2;harm=' '+victim.name+' was injured and needs time to recover.';}
      if(held&&s.communityLife.away[victim.id]!=='deceased')s.communityLife.away[victim.id]='border-duty';
    }
    if(to.border)delete to.border.defender;
    j.phase='return';j.result=text+harm;j.step=w.regionalWorld.step;
    incident(w,s,to,attacker.name,d?.name||to.name,-16,text+harm,true);
    root.EarthCommunityLife.recordWeek(to,w.week,text+harm);
    b.lastWar=w.regionalWorld.step;
  }
  function advance(w,geo,r){
    const step=w.regionalWorld.step;
    for(const t of geo.towns){
      const s=t.site;if(!s.housing)continue;
      deliver(w,s);
      const b=s.border,j=b?.party;
      if(j){
        const to=geo.towns.find(t=>t.site.id===j.to)?.site;if(!to)continue;
        if(j.phase==='march'){
          j.index=Math.min(j.path.length-1,j.index+2);
          if(j.index===j.path.length-1){j.phase='clash';const d=fighters(w,to)[0];if(d)book(to).defender={...pack(d),from:s.id};
            incident(w,to,s,d?.name||to.name,j.crew[0].name,-4,j.crew[0].name+' reached the boundary. '+(d?d.name+' confronted the arriving party.':'The boundary was unguarded.'),true);}
        }else if(j.phase==='clash'){
          j.beats++;
          if(j.beats>=3||!to.border?.defender)resolve(w,geo,r,s,to,j);
        }else{
          j.index=Math.max(0,j.index-2);
          if(!j.index){
            const survivors=j.crew.filter(p=>s.communityLife.away[p.id]==='border-duty');
            for(const p of survivors)delete s.communityLife.away[p.id];
            if(survivors.length)root.EarthPurses.productionReceipt(w,s,survivors[0].id,j.wage,'The watch paid the returning party’s reserved two-fund stipend.');
            else s.funds+=j.wage;
            delete b.party;root.EarthHousing.sync(w,s);
          }
        }
        continue;
      }
      if(custom(s)!=='closed'||step%3||s.population<6||s.food<Math.ceil(s.population/5)*2+2||s.funds<8||
         step-(b?.lastWar??-48)<40)continue;
      const c=character(s);
      if(c.share<.55||c.leader<62)continue;
      const targets=geo.towns.filter(a=>a.site!==s&&!a.site.border?.defender&&!a.site.border?.party&&a.site.population>=5)
        .sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y));
      for(const target of targets){
        if((s.border?.origins[target.site.id]?.points||0)>=12)continue;
        const path=root.EarthRegionalWorld.crossingPath(w,s,target.site);
        if(path?.length>=4){begin(w,s,target.site,path);break;}
      }
    }
  }
  function actors(w,geo){
    const list=[];
    for(const t of geo.towns){
      const s=t.site,j=s.border?.party;if(!j)continue;
      const to=geo.towns.find(t=>t.site.id===j.to)?.site;if(!to)continue;
      const [cx,cy]=j.path[j.index].split(',').map(Number),x=cx*.5,y=cy*.5,fight=j.phase==='clash';
      const crew=j.crew.filter(p=>s.communityLife.away[p.id]==='border-duty');
      const d=to.border?.defender;
      if(fight&&d)crew.push({...d,defending:true});
      crew.forEach((p,i)=>{
        const sign=p.defending?-1:1,dx=fight?sign*.004*Math.sin(Date.now()/180+i):0;
        list.push({x:x+(p.defending?.018:i*.009)+dx,y:y+i*.004,dx:sign,dy:0,name:p.name,personId:p.id,siteId:p.defending?to.id:s.id,
          kind:'border',phase:fight?'fighting':j.phase,mode:'walk',destination:to.name,activity:fight?'Fighting at the boundary':j.phase==='march'?'Marching to the disputed boundary':'Returning from the boundary',
          detail:j.result||s.name+' authorised this border expedition.',remainingKm:(j.path.length-j.index-1)*.5,kit:{},cargo:{}});
      });
    }
    return list;
  }
  function calendar(w){
    for(const s of places(w)){
      const b=book(s);for(const [id,week] of Object.entries(b.injuries))if(week<=w.week)delete b.injuries[id];
      const c=character(s);
      if(b.custom==='closed'&&c.share<.35)b.practice++;else if(b.custom!=='closed'&&c.share>.7)b.practice--;else b.practice=0;
      if(Math.abs(b.practice)>=3){
        b.custom=b.practice>0?'introduction':'closed';b.practice=0;
        root.EarthCommunityLife.recordWeek(s,w.week,'After three assemblies the council adopted '+customs[b.custom]+'.');
      }
    }
  }
  function valid(s){
    const b=s.border;if(b===undefined)return true;
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),str=x=>typeof x==='string'&&x.length>0&&x.length<1300,nat=n=>Number.isSafeInteger(n)&&n>=0;
    const person=p=>obj(p)&&str(p.id)&&str(p.key)&&str(p.name);
    const j=b?.party;
    return obj(b)&&Object.hasOwn(customs,b.custom)&&['people','origins','reports','injuries','invitations'].every(k=>obj(b[k]))&&Number.isSafeInteger(b.practice)&&
      Array.isArray(b.events)&&b.events.length<=16&&b.events.every(e=>e&&nat(e.week)&&str(e.text)&&str(e.witness)&&str(e.actor))&&
      Array.isArray(b.news)&&b.news.length<=24&&b.news.every(e=>e&&nat(e.at)&&str(e.to)&&str(e.text)&&str(e.witness)&&Number.isSafeInteger(e.change))&&
      (!b.defender||person(b.defender)&&str(b.defender.from))&&(!j||obj(j)&&str(j.to)&&Array.isArray(j.crew)&&j.crew.length>=1&&j.crew.length<=2&&j.crew.every(person)&&
      ['march','clash','return'].includes(j.phase)&&Array.isArray(j.path)&&j.path.length>0&&j.path.length<=4097&&j.path.every(id=>/^-?\d+,-?\d+$/.test(id))&&nat(j.index)&&j.index<j.path.length&&nat(j.beats)&&j.wage===2);
  }
  root.EarthBorders={aggression,custom,customs,character,assessment,remember,request,receive,calendar,advance,actors,workBlock,reserved,valid};
})(globalThis);
