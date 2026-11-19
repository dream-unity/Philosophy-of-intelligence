/* Membership, consent to entry and a witness's knowledge are separate.
   These are simulation encounters between fictional residents. */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
  const key=p=>p.identityKey||p.id;
  const life=()=>root.EarthCommunityLife;
  const centre=()=>root.EarthTownCentre;
  const sites=w=>centre().towns(w);
  const town=(w,id)=>w.sites.find(s=>s.id===id)||w.communityLife?.outposts.find(s=>s.id===id);
  const round=s=>s.growth?.round||0;
  function aggression(s,p){
    if(!p)return 0;
    const birth=p.birthCommunityId||s.communityLife?.people?.[p.id]?.originId||s.id,cohort=birth.startsWith('near-')?birth.match(/-(\d+)$/):null;
    const base=p.background?.aggression??(cohort?([21,94,49][Number(cohort[1])]??45):45);
    const resident=s.residents.find(r=>r.id===p.id),traits=p.traits;
    const cooperated=(s.autonomy?.people?.[p.id]?.history||[]).filter(e=>['host','cover','visit','project'].includes(e.kind)).length;
    return clamp(base+(traits.initiative-traits.patience)*.19+(50-traits.sociability)*.16+(50-s.trust)*.12-
      Math.min(10,cooperated*2+(resident?.bond||0))+(resident?.lastMissed?4:0));
  }
  function distribution(s,w){
    const members=w?centre().roster(w,s):root.EarthPersonas.list(s).filter(p=>life().residency(s,p.id)==='member'&&!life().commuting(s,p.id));
    for(const [id,where] of Object.entries(w?{}:s.communityLife.away||{})){
      if(!['regional-watch','regional-field','regional-freight','regional-visit'].includes(where)||members.some(p=>p.id===id))continue;
      const resident=root.EarthPersonas.profile(s,id);if(resident&&!life().commuting(s,id))members.push(resident);
    }
    const tally={welcoming:0,guarded:0,forceful:0},scores=members.map(p=>aggression(s,p));
    for(const n of scores)tally[n>=70?'forceful':n>=40?'guarded':'welcoming']++;
    const n=scores.length||1,mean=clamp(scores.reduce((a,b)=>a+b,0)/n);
    const leader=life().hostFor(s),p=leader.id&&root.EarthPersonas.profile(s,leader.id);
    const authority=p?aggression(s,p):mean;
    return {members,tally,mean,authority,host:leader.name,force:tally.forceful/n,divided:tally.forceful/n>=.2&&tally.welcoming/n>=.2};
  }
  function character(s,w){
    const d=distribution(s,w),t=d.tally,c=s.centre,type=d.divided?'Divided over visitors':d.force>=.5?'Hostile to unintroduced visitors':t.welcoming>t.guarded?'Welcoming with introductions':'Guarded and private';
    const trust=clamp(.45*s.trust+.55*(100-d.mean));
    const heard=Object.values(c.external||{}),reputation=heard.length?clamp(heard.reduce((sum,r)=>sum+r.score,0)/heard.length):null;
    return {type,tally:t,trust,aggression:d.mean,authority:d.authority,charter:c.charter,
      reputation,summary:type+' · aggression '+d.mean+'/100 · '+c.charter+' charter',
      detail:t.welcoming+' welcoming, '+t.guarded+' guarded, '+t.forceful+' willing to use force. '+d.host+' chairs the entry meeting ('+d.authority+'/100 aggression).'};
  }
  function reportView(s,otherId){
    const note=s.centre?.reports?.[otherId];
    return note?{...note,confidence:Math.min(95,25+note.count*13)}:{score:50,trend:0,count:0,confidence:0,reason:'No first-hand report has reached this town.'};
  }
  function assessment(w,s,visitor=w.communityLife.profile,originId=w.communityLife.homeId){
    const c=s.centre,d=distribution(s,w),k=key(visitor),v=c.personal?.[k];
    const pass=c.passes?.[k]>=round(s),family=c.diplomacy?.[originId],local=s.communityLife?.visits?.steward;
    const original=k===w.communityLife.profile.identityKey,introduced=original&&Boolean(local?.met);
    const own=originId===s.id,history=(v?.trust||0)+(introduced?13:0)+(original&&local?.help?16:0);
    const personal=clamp(50+history+(visitor.background?.reliability!=null?(visitor.background.reliability-50)*.12:0));
    const homeTrust=clamp(50+(family?.trust||0));
    const closed=c.charter==='closed',guarded=c.charter==='introduction';
    const severity=clamp(d.mean*.49+d.authority*.19+(closed?37:guarded?12:-14)+(50-personal)*.58+(50-homeTrust)*.32);
    const reception=own?'Member':pass?'Invited with a pass':introduced&&personal>=57?'Vouched for':
      severity>=70?'Entry refused; boundary watch will fight':severity>=44?'Introduction required':'Limited hospitality';
    return {personal,homeTrust,pass,introduced,own,severity,reception,host:d.host,distribution:d,
      access:own||pass||introduced&&personal>=57||severity<70,
      reason:[c.charter==='closed'?'The boundary assembly authorises force against uninvited entry. Its watch can cause fatal injuries.':c.charter==='hospitality'?'The kitchen offers a first meal.':'The charter asks for a named sponsor.',
        v?.reason||'The register has no first-hand incident recorded against this person.',pass?'A current safe-conduct pass is recorded.':'',introduced?'The admission host recorded an introduction.':'',family?.reason].filter(Boolean).join(' ')};
  }
  function remember(w,s,p,delta,reason){
    const personal=s.centre.personal||={},k=key(p);
    personal[k]={trust:Math.max(-50,Math.min(50,(personal[k]?.trust||0)+delta)),reason,week:w.week};
    s.centre.revision++;
  }
  function diplomatic(w,s,other,delta,reason){
    const d=s.centre.diplomacy||={};d[other.id]={trust:Math.max(-50,Math.min(50,(d[other.id]?.trust||0)+delta)),reason,week:w.week};
  }
  function witness(w,host,origin,p,actor,authorized,kind,words,impact,eyewitness){
    const c=host.centre,name=actor?.name||life().hostFor(host).name,day=round(host),a=c.incidents||=[];
    const event={week:w.week,round:day,actor:name,actorKey:actor&&key(actor)||null,visitor:p.name,visitorKey:key(p),origin:origin.id,authorized,
      witness:eyewitness?.name||root.EarthPersonas.list(host).find(v=>v.id!==actor?.id&&!life().commuting(host,v.id)&&life().present(host,v.id))?.name||name,kind,words};
    a.unshift(event);if(a.length>12)a.pop();
    const queue=c.news||=[];
    const neighbours=sites(w).filter(s=>s.centre&&s!==host&&s.communityLife?.cluster===host.communityLife?.cluster);
    for(const other of neighbours){
      const prior=queue.find(item=>item.to===other.id&&item.round===day&&item.kind===kind);
      if(prior)continue;
      queue.push({to:other.id,due:day+(other.id===origin.id?2:4),round:day,kind,source:event.witness,
        effect:other.id===origin.id?impact:Math.round(impact*(other.centre.charter==='closed'?.35:.65)),
        reason:event.witness+' reported: '+words,authorized});
    }
    c.news=queue.slice(-32);centre().note(w,host,words,key(p),'encounter');
  }
  function encounter(w,from,to,p,invited=false){
    if(!to?.centre||from.id===to.id)return {allowed:true,message:''};
    const homeId=key(p)===key(w.communityLife.profile)?w.communityLife.homeId:from.id;
    const a=assessment(w,to,p,homeId),c=to.centre;
    if(invited||a.access){
      const words=a.host+' received '+p.name+' from '+from.name+(invited||a.pass?' under an invitation.':a.severity>=44?' and requested a local introduction.':' and offered a meal.');
      remember(w,to,p,2,words);witness(w,to,from,p,null,true,'reception',words,4);
      return {allowed:true,message:words};
    }
    const members=a.distribution.members.filter(q=>life().present(to,q.id));
    const guard=members.slice().sort((x,y)=>aggression(to,y)-aggression(to,x))[0];
    const prior=c.personal?.[key(p)]?.trust||0;
    const cause='injuries during an uninvited boundary crossing';
    const exposed=prior<=-10||guard&&a.severity>=88&&p.traits.initiative>p.traits.patience+18&&guard.aptitudes.stamina>p.aptitudes.stamina;
    const loss=p.id!=='steward'&&exposed&&a.severity>=84&&from.population>3&&!life().departureReason(from,p.id,w)&&life().retire(w,from,p.id,cause);
    if(guard){
      c.boundaryScene={round:round(to),guard:{id:guard.id,name:guard.name},visitor:{id:p.id,name:p.name,siteId:from.id}};
    }
    const words=(guard?.name||a.host)+' struck '+p.name+' at the boundary of '+to.name+(loss?'. '+p.name+' died from the injuries.':'. The watch forced the visitor back to '+from.name+'.');
    remember(w,to,p,-10,'Entered without leave and ignored the admission custom.');diplomatic(w,from,to,-8,words);
    c.communityForce=(c.communityForce||0)+1;
    if(prior<=-10)diplomatic(w,to,from,-3,'Repeated unauthorised crossings from '+from.name+' prompted the host to review its entry safeguards.');
    const injury=from.centre.injuries||={};injury[key(p)]=round(from)+3;
    witness(w,to,from,p,guard,true,'boundary fight',words,-16);
    centre().note(w,from,words,key(p),'injury');
    return {allowed:false,message:words};
  }
  function requestPass(w,from,request){
    const to=town(w,request.target),p=w.communityLife.profile;
    if(!to?.centre||to===from||to.communityLife.cluster!==from.communityLife.cluster)return {ok:false,message:'Select a neighbouring Town Centre.'};
    const homeId=key(p)===key(w.communityLife.profile)?w.communityLife.homeId:from.id;
    const a=assessment(w,to,p,homeId),c=to.centre;
    if(a.pass)return {ok:false,message:'There is already a valid pass.'};
    if(a.personal<39||a.homeTrust<30)return {ok:false,message:a.host+' refused the request after reviewing the recorded incidents.'};
    const reason=c.charter==='closed'?'The assembly granted an escorted visit to its admission host.':'The admission host agreed to receive the visitor.';
    (c.passes||={})[key(p)]=round(to)+8;remember(w,to,p,3,reason);
    centre().note(w,to,reason,key(p),'pass');return {ok:true,message:reason+' Valid through production round '+(round(to)+8)+'.'};
  }
  function available(w,s){
    return life().fieldCandidates(s,w).map(id=>root.EarthPersonas.profile(s,id)).filter(p=>p&&p.id!=='driver'&&
      !life().commuting(s,p.id)&&!centre().restriction(s,p)&&!s.growth?.road?.ids?.includes(p.id)&&
      !root.EarthDistrictOrders.commitment(w,s,p)&&!s.growth?.households.some(h=>h.owner===key(p)&&(h.build||h.purchase)));
  }
  function service(s,p){
    const last=s.centre.watchService?.[key(p)];
    return last?{experience:last.experience,fatigue:Math.max(0,last.fatigue-Math.max(0,round(s)-last.round))}:{experience:0,fatigue:0};
  }
  function watchStrength(s,p,journey){
    const record=service(s,p),stamina=p.demonstratedSkills?.stamina??p.aptitudes.stamina;
    return Math.max(8,20+stamina*.52+p.traits.initiative*.12+aggression(s,p)*.12+
      Math.min(12,record.experience*2)-record.fatigue*.62-journey);
  }
  function recordService(s,p,exertion){
    const prior=service(s,p),records=s.centre.watchService||={};
    records[key(p)]={round:round(s),experience:Math.min(50,prior.experience+1),fatigue:clamp(prior.fatigue+exertion)};
  }
  function reserveWatch(w,s,people,reason){
    const receipts=[];
    for(const p of people){
      const h=s.growth?.households.find(h=>h.owner===key(p));
      if(h?.order)root.EarthDistrictOrders.cancel(s,h,receipts,reason);
      s.communityLife.away[p.id]='regional-watch';
    }
    if(receipts.length)centre().note(w,s,receipts.map(r=>r.reason+' · '+r.amount+' '+r.good+' to '+r.to).join('. '),null,'order refund');
  }
  const watchMember=p=>({id:p.id,key:key(p),name:p.name});
  function dispatch(w,s,d){
    const regional=root.EarthRegionalWorld,c=s.centre,readiness=p=>aggression(s,p)-service(s,p).fatigue*.65,
      people=available(w,s).sort((a,b)=>readiness(b)-readiness(a));
    const crew=people.filter(p=>aggression(s,p)>=69).slice(0,2);
    if(crew.length<2||s.food<Math.ceil(s.population/5)+3||s.funds<5)return;
    const choices=regional.geography(w,s).towns.filter(t=>t.site!==s&&t.site.centre&&t.site.population>2)
      .sort((a,b)=>(c.diplomacy?.[a.site.id]?.trust||0)-(c.diplomacy?.[b.site.id]?.trust||0)||a.site.id.localeCompare(b.site.id));
    const target=choices.find(t=>(c.diplomacy?.[t.site.id]?.trust||0)<15&&!(c.occupied||[]).includes(t.site.id));
    if(!target)return;
    const path=regional.crossingPath(w,s,target.site);if(!path?.length)return;
    reserveWatch(w,s,crew,'Called away by the boundary assembly');
    s.food-=2;s.funds-=2;c.lastExpedition=round(s);
    c.expedition={target:target.site.id,path,index:0,stage:'march',fight:0,crew:crew.map(watchMember),
      food:2,wages:2,mandate:d.host,started:round(s)};
    const msg=d.host+' authorised a land claim against '+target.site.name+'. '+crew.map(p=>p.name).join(' and ')+' left their duties with two rations and two reserved wages.';
    centre().note(w,s,msg,null,'declaration');
  }
  function march(w,s){
    const c=s.centre,e=c.expedition,other=town(w,e.target),regional=root.EarthRegionalWorld;if(!other)return;
    if(e.stage==='march'){
      e.index=Math.min(e.path.length-1,e.index+Math.max(1,2+(s.growth?.vehicle||0)));c.revision++;
      if(e.index<e.path.length-1)return;
      e.stage='fight';e.food=0;
      const ready=available(w,other).sort((a,b)=>watchStrength(other,b,0)-watchStrength(other,a,0));
      const experiencedHost=(other.centre.diplomacy?.[s.id]?.trust||0)<-10;
      const defenders=ready.slice(0,1),support=ready.slice(1).find(p=>experiencedHost||other.centre.charter==='closed'||aggression(other,p)>=70);
      if(support)defenders.push(support);
      reserveWatch(w,other,defenders,'Called to defend the town');
      if(defenders[0])e.defender=watchMember(defenders[0]);
      if(support)e.support=watchMember(support);
      const msg=e.crew[0].name+' reached '+other.name+(defenders.length?' and began fighting '+defenders.map(p=>p.name).join(' and ')+' over the boundary parcel.':' and found the boundary parcel undefended.');
      centre().note(w,s,msg,e.crew[0].key,'fight');centre().note(w,other,msg,e.defender?.key||null,'fight');return;
    }
    if(e.stage==='fight'){
      e.fight++;if(e.fight<2)return;
      const attackers=e.crew.map(m=>root.EarthPersonas.profile(s,m.id)).filter(Boolean);
      const guards=[e.defender,e.support].filter(Boolean).map(m=>root.EarthPersonas.profile(other,m.id)).filter(Boolean);
      const p=attackers[0],def=guards[0];
      for(const guard of guards)if(other.communityLife.away[guard.id]==='regional-watch')delete other.communityLife.away[guard.id];
      const journey=Math.min(14,Math.ceil((e.path.length-1)/(4+(s.growth?.vehicle||0))));
      const strength=attackers.reduce((n,a)=>n+watchStrength(s,a,journey),0);
      const defence=guards.reduce((n,g)=>n+watchStrength(other,g,0),guards.length?4+other.trust*.06:0);
      const won=strength>=defence,margin=Math.abs(strength-defence),losers=won?guards:attackers,losingTown=won?other:s;
      let words=e.mandate+'’s party '+(won?'won':'lost')+(guards.length?' the fight at ':' the uncontested claim at ')+other.name+'. '+attackers.length+' from '+s.name+' faced '+guards.length+' defender'+(guards.length===1?'':'s')+'.';
      if(losers.length){
        const vulnerable=losers.slice().sort((a,b)=>watchStrength(losingTown,a,0)-watchStrength(losingTown,b,0))[0];
        const history=service(losingTown,vulnerable),exposure=margin+history.fatigue*.35+Math.max(0,Math.abs(attackers.length-guards.length)*5);
        const severe=exposure>=26+vulnerable.aptitudes.stamina*.11+Math.min(7,history.experience);
        const injuries=losingTown.centre.injuries||={};
        for(const person of losers)injuries[key(person)]=round(losingTown)+2+Math.min(5,Math.floor(exposure/12));
        if(severe&&losingTown.population>3&&vulnerable.id!=='steward'&&key(vulnerable)!==key(w.communityLife.profile)){
          const away=losingTown.communityLife.away;
          if(away[vulnerable.id]==='regional-watch')delete away[vulnerable.id];
          if(life().retire(w,losingTown,vulnerable.id,'injuries in the boundary fight')){
            if(!won)e.crew.find(m=>m.id===vulnerable.id).lost=true;
            delete injuries[key(vulnerable)];words+=' '+vulnerable.name+' died from their injuries.';
          }else if(!won)away[vulnerable.id]='regional-watch';
        }
      }
      for(const a of attackers)recordService(s,a,20+journey+(won?0:5));
      for(const g of guards)recordService(other,g,won?23:17);
      if(won){
        const parcel=e.path[Math.max(0,e.path.length-2)];regional.occupy(w,s,other,parcel,e.crew[0]);
        (c.occupied||=[]).push(other.id);words+=' '+s.name+' took control of parcel '+parcel+'.';
      }
      diplomatic(w,other,s,-21,words);diplomatic(w,s,other,-7,words);
      const returningWitness=e.crew.find(m=>m.id!==p.id&&!m.lost)||e.crew.find(m=>!m.lost);
      witness(w,s,other,def||p,p,true,'territorial fight',words,-28,returningWitness);centre().note(w,other,words,e.defender?.key||null,'territory');
      e.stage='return';return;
    }
    e.index=Math.max(0,e.index-3);
    if(e.index)return;
    for(const m of e.crew){
      if(s.communityLife.away[m.id]==='regional-watch')delete s.communityLife.away[m.id];
      if(m.lost||!root.EarthPurses.productionReceipt(w,s,m.id,1,'One reserved wage for the boundary watch.'))s.funds++;
    }
    centre().note(w,s,'The boundary party returned to their households. The assembly settled its reserved wages.',null,'return');delete c.expedition;
  }
  function advance(w){
    if(!w.communityLife)return;
    for(const s of sites(w)){
      const c=s.centre;if(!c||!round(s)||c.boundaryRound===round(s))continue;c.boundaryRound=round(s);
      if(c.news?.length){
        c.news=c.news.filter(n=>{
          if(n.due>round(s))return true;
          const recipient=town(w,n.to);if(!recipient?.centre)return false;
          const opinions=recipient.centre.reports||={},old=reportView(recipient,s.id),score=clamp(old.score+n.effect);
          opinions[s.id]={score,trend:score-old.score,count:old.count+1,week:w.week,reason:n.reason,authorized:n.authorized};
          (c.external||={})[recipient.id]={score,week:w.week};
          recipient.centre.revision++;return false;
        });
      }
      if(c.expedition){march(w,s);continue;}
      if(c.charter!=='closed'||round(s)<3)continue;
      if(round(s)%8===0){
        const d=distribution(s);
        if(d.force<.35&&d.authority<60){
          c.peaceVotes=(c.peaceVotes||0)+1;
          if(c.peaceVotes>=2){c.charter='introduction';centre().note(w,s,d.host+' ratified sponsored entry after two successive assembly votes.',null,'charter');}
        }else c.peaceVotes=0;
      }
      if(round(s)-(c.lastExpedition||-12)<18||round(s)%3!==0||c.charter!=='closed')continue;
      const d=distribution(s);if(d.force>=.5&&d.authority>=55)dispatch(w,s,d);
    }
  }
  // The final leg meets the public street on the approaching side of town.
  // Keep the two parties at the same entrance, with distinct bodies and facing.
  function gateFight(result,host,from,visitors,guards,detail){
    if(!host||!from||!visitors.length)return;
    const east=from.x-host.x,north=from.y-host.y;
    const lx=east-north,ly=-east-north,k=root.EarthRegionalWorld.streetKilometres;
    const edgeX=Math.abs(lx)>=Math.abs(ly)?Math.sign(lx)*12:0;
    const edgeY=Math.abs(lx)<Math.abs(ly)?Math.sign(ly)*12:0;
    const gate={x:host.x+(edgeX-edgeY)*k,y:host.y-(edgeX+edgeY)*k};
    const attackers=visitors.map((p,i)=>({person:p,site:from,side:-1,row:visitors.length===1?0:i===0?-1:1}));
    const defenders=guards.map((p,i)=>({person:p,site:host,side:1,row:guards.length===1?0:i===0?-1:1}));
    for(const actor of [...attackers,...defenders]){
      const opponents=actor.side===1?attackers:defenders;
      const rival=opponents.find(o=>o.row===actor.row)||opponents[0];
      const x=gate.x+actor.side*.31*k,y=gate.y+actor.row*.51*k;
      result.push({x,y,dx:-actor.side*.62,dy:((rival?.row||0)-actor.row)*.51,
        personId:actor.person.id,name:actor.person.name,siteId:actor.site.site.id,
        fightSide:actor.side,fightRow:actor.row,phase:'working',kind:'fight',mode:'walk',
        destination:host.site.name,activity:rival?'Fighting '+rival.person.name+' at the boundary':'Holding the disputed entrance',
        detail,remainingKm:0,cargo:{},kit:{}});
    }
  }
  function travellers(w,base){
    const result=[],geo=root.EarthRegionalWorld.geography(w,base);if(!geo)return result;
    for(const t of geo.towns){
      const s=t.site,e=s.centre?.expedition;
      if(e){
        const other=geo.towns.find(v=>v.site.id===e.target),detail=e.mandate+' authorised this territorial claim.';
        if(e.stage==='fight')gateFight(result,other,t,e.crew,[e.defender,e.support].filter(Boolean),detail);
        else if(other){
          const returning=e.stage==='return',nextIndex=returning?Math.max(0,e.index-1):Math.min(e.path.length-1,e.index+1);
          const p=root.EarthRegionalWorld.pathPoint(e.path[e.index]),next=root.EarthRegionalWorld.pathPoint(e.path[nextIndex]);
          for(const [i,m] of e.crew.filter(m=>!m.lost).entries())result.push({x:p.x+.018*i,y:p.y+.013*i,dx:next.x-p.x,dy:next.y-p.y,personId:m.id,name:m.name,
            siteId:s.id,destination:returning?s.name:other.site.name,activity:returning?'Returning from the boundary':'Marching on '+other.site.name,
            detail,phase:returning?'returning':'outbound',kind:'boundary watch',mode:'walk',
            remainingKm:(returning?e.index:e.path.length-1-e.index)*geo.cellSize,cargo:{},kit:{food:e.food}});
        }
      }
      const scene=s.centre?.boundaryScene;
      if(scene&&round(s)-scene.round<2){
        const origin=geo.towns.find(other=>other.site.id===scene.visitor.siteId);
        gateFight(result,t,origin,[scene.visitor],[scene.guard],'The boundary watch challenged entry without a pass.');
      }
      const a=s.centre?.incoming;
      if(a?.path?.length&&a.duration){
        const i=Math.max(0,Math.min(a.path.length-1,Math.round((1-a.remaining/a.duration)*(a.path.length-1)))),p=root.EarthRegionalWorld.pathPoint(a.path[i]);
        result.push({...p,dx:0,dy:0,siteId:a.from,personId:a.person,name:a.name,destination:s.name,activity:'Moving to '+s.name,detail:a.reason,
          phase:'outbound',kind:'migration',mode:'walk',remainingKm:(a.path.length-i-1)*geo.cellSize,cargo:{},kit:{}});
      }
    }
    return result;
  }
  function validSite(s){
    const c=s.centre;if(!c)return true;
    if(c.news&&(!Array.isArray(c.news)||c.news.length>32||!c.news.every(n=>n&&typeof n.to==='string'&&Number.isSafeInteger(n.due)&&Number.isFinite(n.effect))))return false;
    const scene=c.boundaryScene,person=p=>p&&typeof p.id==='string'&&typeof p.name==='string';
    if(scene&&(!Number.isSafeInteger(scene.round)||scene.round<0||!person(scene.guard)||!person(scene.visitor)||typeof scene.visitor.siteId!=='string'))return false;
    const service=c.watchService;
    if(service&&(typeof service!=='object'||Array.isArray(service)||!Object.values(service).every(v=>v&&
      [v.round,v.experience,v.fatigue].every(n=>Number.isSafeInteger(n)&&n>=0))))return false;
    const e=c.expedition;return !e||(e.defender==null||person(e.defender))&&(e.support==null||person(e.support))&&typeof e.target==='string'&&Array.isArray(e.crew)&&e.crew.length===2&&e.crew.every(m=>m&&(s.communityLife.away[m.id]==='regional-watch'||m.lost&&s.communityLife.away[m.id]==='deceased'))&&
      ['march','fight','return'].includes(e.stage)&&Array.isArray(e.path)&&e.path.length>0&&e.path.length<=4097&&e.path.every(v=>typeof v==='string'&&/^-?\d{1,6},-?\d{1,6}$/.test(v))&&Number.isInteger(e.index)&&e.index>=0&&e.index<e.path.length;
  }
  root.EarthBoundaryAssembly={character,aggression,assessment,reportView,requestPass,encounter,witness,remember,advance,travellers,validSite};
})(typeof window==='undefined'?globalThis:window);
