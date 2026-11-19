/* Border disputes use the regional clock. Both parties commit named residents.
   The renderer only interpolates their last recorded movement or exchange. */
(function(root){
  'use strict';
  const life=()=>root.EarthCommunityLife;
  const region=()=>root.EarthRegionalWorld;
  const cap=n=>Math.max(0,Math.min(100,Math.round(n)));
  const idOf=(x,y)=>Math.round(x*2)+','+Math.round(y*2);
  const point=id=>{const [x,y]=id.split(',').map(Number);return {x:x/2,y:y/2};};
  const keyOf=(a,b)=>[a,b].sort().join('/');
  const borderDuty='regional-watch';
  const injured='recovering-at-home';
  const deceased='deceased';
  function disposition(person){
    if(Number.isFinite(person.traits?.aggression))return person.traits.aggression;
    if(Number.isFinite(person.externalHistory?.aggression))return person.externalHistory.aggression;
    const birth=person.birthCommunityId||'';
    const start=birth.startsWith('near-')?({'0':36,'1':93,'2':48}[birth.split('-').at(-1)]??48):48;
    const t=person.traits||{};
    return cap(start+((t.initiative??50)-(t.patience??50))*.24+(50-(t.sociability??50))*.36);
  }
  function force(site,person){
    const past=site.autonomy?.people?.[person.id]?.history||[];
    const cooperation=past.filter(e=>['visit','host','cover','project'].includes(e.kind)).length;
    const resident=site.residents.find(r=>r.id===person.id);
    return cap(disposition(person)-3*cooperation+(50-site.trust)*.20+(50-site.wellbeing)*.14-(resident?.bond||0)*2);
  }
  function members(site){
    const people=root.EarthPersonas.list(site,{includeCommuters:false}).filter(p=>life().residency(site,p.id)==='member');
    // A patrol assignment cannot erase its members' vote in their own town.
    for(const [id,where] of Object.entries(site.communityLife?.away||{})){
      if(where!==borderDuty&&where!==injured&&where!=='regional-field'&&where!=='regional-freight'&&where!=='regional-visit')continue;
      const p=root.EarthPersonas.profile(site,id);
      if(p&&!life().commuting(site,id))people.push(p);
    }
    return people;
  }
  function profile(site){
    const people=members(site),count=people.length;
    const values=people.map(p=>force(site,p));
    const militant=values.filter(v=>v>=65).length,opposed=values.filter(v=>v<35).length;
    const tally={welcoming:0,guarded:0,forceful:0};
    let total=0;
    for(const v of values){tally[v>=62?'forceful':v>=42?'guarded':'welcoming']++;total+=v;}
    const score=count?cap(total/count):0;
    const host=life().hostFor(site);
    const chair=host?.id&&root.EarthPersonas.profile(site,host.id);
    const charter=site.communityLife?.entryDecision?.rule||(['works','slipway'].includes(site.communityLife?.district)?'hosted':'welcome');
    const closed=charter==='hosted'&&militant*2>=count&&count>0;
    return {score,tally,militant,opposed,count,closed,chair:host?.name||'the assembly',
      expansionist:closed&&militant*3>=count*2&&(!chair||force(site,chair)>=54)};
  }
  function available(world,site,warParty){
    const ids=life().fieldCandidates(site,world);
    const appointments=new Set((root.EarthNeighbourErrands?.working?.(site,world.week)||[]).flatMap(e=>[e.actorId,e.targetId]));
    return ids.filter(id=>!life().commuting(site,id)&&!root.EarthDistrictGrowth.work(site,id))
      .map(id=>root.EarthPersonas.profile(site,id)).filter(p=>p&&
        !root.EarthDistrictOrders.commitment(world,site,p,appointments)&&!root.EarthHousing?.workHold(site,p.id)&&
        (!warParty||force(site,p)>=60)).sort((a,b)=>force(site,b)-force(site,a)||a.id.localeCompare(b.id));
  }
  const clerk=site=>site.communityLife.border||={records:[],health:{},lost:0};
  function record(world,site,other,text,people=[],official=true){
    const office=clerk(site);
    office.records.unshift({week:world.week,step:world.regionalWorld?.step||0,other:other.id,text,people:people.map(p=>p.identityKey),official});
    office.records.length=Math.min(16,office.records.length);
    life().recordWeek(site,world.week,text);
  }
  function fighter(site,p){
    return {id:p.id,key:p.identityKey,name:p.name,stamina:p.aptitudes.stamina,resolve:force(site,p),energy:80+Math.round(p.aptitudes.stamina*.3)};
  }
  function assign(site,p){
    site.communityLife.away[p.id]=borderDuty;
    return fighter(site,p);
  }
  function release(site,actor){
    if(actor&&site.communityLife.away[actor.id]===borderDuty)delete site.communityLife.away[actor.id];
  }
  function retire(world,site,id,reason){
    const c=site.communityLife,p=root.EarthPersonas.profile(site,id);
    if(!p||id==='steward'||site.population<=1||c.away[id]===deceased)return false;
    const office=clerk(site);
    root.EarthCareers?.departureForMove?.(world,site,id);
    c.away[id]=deceased;
    if(c.people[id])c.people[id].status='former';
    if(site.agency?.actor===id){site.agency.actor='steward';delete site.agency.actorAt;}
    if(site.agency?.returningActor===id)delete site.agency.returningActor;
    office.health[id]={key:p.identityKey,week:world.week,condition:'died',reason};
    site.population--;office.lost++;
    site.wellbeing=Math.max(0,site.wellbeing-3);
    return true;
  }
  function hurt(world,site,actor,reason){
    if(!actor)return;
    const p=root.EarthPersonas.profile(site,actor.id);
    if(!p||p.identityKey!==actor.key)return;
    const h=clerk(site).health;
    if(site.communityLife.away[p.id]===deceased)return;
    h[p.id]={key:p.identityKey,week:world.week,condition:'injured',reason,until:world.week+2};
    if(p.id!=='steward')site.communityLife.away[p.id]=injured;
  }
  function recovery(world,site){
    const border=site.communityLife?.border;
    if(!border)return;
    for(const [id,h] of Object.entries(border.health)){
      if(h.condition==='injured'&&world.week>=h.until){
        if(site.communityLife.away[id]===injured)delete site.communityLife.away[id];
        h.condition='recovered';delete h.until;
      }
    }
  }
  function target(world,geo,r,town){
    const neighbours=geo.towns.filter(t=>t!==town&&t.site.population>=4);
    const knowledge=r.knowledge[town.site.id]||{};
    const options=[];
    for(const rival of neighbours){
      const agreement=r.contacts[keyOf(town.site.id,rival.site.id)];
      // Founding households remember neighbouring settlements. Other claims
      // must appear on their own survey or come from an actual contact.
      const foundedTogether=town.site.id.startsWith('near-'+geo.origin.id+'-')&&
        (rival===geo.towns.find(t=>t.site===geo.origin)||rival.site.id.startsWith('near-'+geo.origin.id+'-'));
      if(!foundedTogether&&!agreement&&!knowledge[idOf(rival.x,rival.y)])continue;
      if(agreement&&['passage','exchange','joint'].includes(agreement.terms))continue;
      const dist=Math.hypot(rival.x-town.x,rival.y-town.y);
      options.push({rival,score:(agreement?.terms==='disputed'?12:0)-dist});
    }
    options.sort((a,b)=>b.score-a.score||a.rival.site.id.localeCompare(b.rival.site.id));
    for(const {rival} of options){
      const path=region().crossingPath(world,town.site,rival.site);
      if(!path?.length)continue;
      // Pick the outermost parcel inside the rival's surveyed neighbourhood.
      // Retain its previous title and economic use separately from government.
      const index=path.findIndex((id,i)=>i>0&&Math.hypot(point(id).x-rival.x,point(id).y-rival.y)<=.74&&r.parcels[id]?.charter!==town.site.id);
      if(index>0)return {rival,path:path.slice(0,index+1),cell:path[index]};
    }
    return null;
  }
  function openWar(world,geo,r,town){
    const site=town.site;
    if(!['works','slipway'].includes(site.communityLife?.district)&&site.communityLife?.entryDecision?.rule!=='hosted')return;
    const step=world.regionalWorld.step,last=site.communityLife.border?.last??-40;
    if(step<2||step-last<27||site.population<5||!profile(site).expansionist)return;
    const floor=root.EarthCivicInitiatives.reserve(world,site),held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    if(site.food-(held.food||0)<Math.max(floor.food,Math.ceil(site.population/5)*2)+2||site.funds-(held.funds||0)<floor.funds+2)return;
    const volunteers=available(world,site,true);
    if(!volunteers.length)return;
    const next=target(world,geo,r,town);if(!next)return;
    const clerkBook=clerk(site),leader=volunteers[0];
    const pay=leader.name+' accepted 2 treasury funds for the boundary watch.';
    if(!root.EarthPurses.productionReceipt(world,site,leader.id,2,pay))return;
    site.food-=2;site.funds-=2;
    clerkBook.last=step;
    clerkBook.campaign={against:next.rival.site.id,cell:next.cell,path:next.path,index:0,phase:'march',round:0,
      began:step,attacker:assign(site,leader),defender:null};
    const text=site.name+' declared war over the outer parcel at '+next.cell+' in '+next.rival.site.name+'. '+leader.name+' left with 2 food and a watch wage of 2 funds.';
    record(world,site,next.rival.site,text,[leader]);
  }
  function publish(world,site,other,campaign,text,kind){
    const p=root.EarthPersonas.profile(site,campaign.attacker.id);
    const guard=campaign.defender&&root.EarthPersonas.profile(other,campaign.defender.id);
    const witnesses=[p,guard].filter(Boolean);
    record(world,site,other,text,witnesses);record(world,other,site,text,witnesses);
    if(kind&&p){
      const witness=guard||life().hostFor(other);
      life().recordReception(world,site,other,witness,'invasion',p);
      life().recordReception(world,other,site,p,'trespass',witness);
    }
  }
  function settle(world,r,site,other,c,victory,message){
    if(victory){
      const parcel=r.parcels[c.cell]||={uses:{}};
      parcel.charter=site.id;parcel.occupation=world.week;
      (parcel.claims||={})[other.id]||={week:world.week,by:other.name,basis:'Earlier jurisdiction retained on the record'};
      (parcel.claims)[site.id]={week:world.week,by:c.attacker.name,basis:'Occupied after the boundary dispute'};
      const k=keyOf(site.id,other.id);
      (parcel.agreements||={})[k]={a:site.id,b:other.id,terms:'disputed',week:world.week};
      r.contacts[k]={a:site.id,b:other.id,terms:'disputed',week:world.week,step:world.regionalWorld.step,
        cell:c.cell,trust:15,meetings:(r.contacts[k]?.meetings||0)+1,detail:'The occupation closed this boundary until the councils negotiate access.'};
      r.mapRevision=(r.mapRevision||0)+1;
      message+=' '+site.name+' took jurisdiction over '+c.cell+'. Existing property titles remain on the register.';
    }
    other.trust=Math.max(0,other.trust-2);site.trust=Math.max(0,site.trust-1);
    publish(world,site,other,c,message,'invasion');
    release(other,c.defender);
    c.phase='return';c.outcome=message;
  }
  function advanceWar(world,geo,r,town,c){
    const site=town.site,other=geo.towns.find(t=>t.site.id===c.against)?.site;
    if(!other){release(site,c.attacker);delete clerk(site).campaign;return;}
    if(c.phase==='return'){
      c.index=Math.max(0,c.index-2);
      if(!c.index){release(site,c.attacker);delete clerk(site).campaign;}
      return;
    }
    const pact=r.contacts[keyOf(site.id,other.id)];
    if(pact&&pact.step>=c.began&&['joint','exchange','passage'].includes(pact.terms)){
      release(other,c.defender);c.phase='return';
      c.outcome='The councils recognised passage and recalled the watch.';
      publish(world,site,other,c,c.outcome);return;
    }
    if(c.phase==='march'){
      c.index=Math.min(c.path.length-1,c.index+1+(site.growth?.vehicle?1:0));
      if(c.index<c.path.length-1)return;
      const p=available(world,other,false)[0];
      if(!p){settle(world,r,site,other,c,true,other.name+' had no free resident to defend its outer parcel.');return;}
      c.defender=assign(other,p);c.phase='fight';
      publish(world,site,other,c,c.attacker.name+' entered the boundary without leave. '+p.name+' confronted them. The two residents began fighting.','invasion');
      return;
    }
    c.round++;
    const a=c.attacker,b=c.defender;
    // Stamina, willingness to continue and the previous exchange decide the
    // result. No random draws or camera frames are consumed by combat.
    const originalA=a.energy,originalB=b.energy;
    a.energy-=13+Math.round((b.stamina+b.resolve)/14);
    b.energy-=14+Math.round((a.stamina+a.resolve)/13);
    // A less committed watch can accept withdrawal. The most militant
    // expeditions continue the fight unless the councils negotiate passage.
    const retreat=b.resolve<58&&b.energy<42&&a.resolve<83;
    if(a.energy>0&&b.energy>0&&!retreat&&!(a.resolve<65&&a.energy<32))return;
    const victory=b.energy<=0&&a.energy<=0?a.energy>b.energy||a.energy===b.energy&&originalA>=originalB:b.energy<=0||retreat;
    const loser=victory?b:a,losingTown=victory?other:site;
    const death=loser.energy<=0&&((victory?a:b).resolve>=78||loser.resolve>=80)&&retire(world,losingTown,loser.id,'Died in the boundary fight at '+c.cell+'.');
    if(!death)hurt(world,losingTown,loser,'Injured in the boundary fight at '+c.cell+'.');
    const message=loser.name+(death?' died in the fight.':' withdrew injured.');
    settle(world,r,site,other,c,victory,message);
    if(death&&!victory)delete clerk(site).campaign;
  }
  function advance(world,geo,r){
    for(const t of geo.towns){
      recovery(world,t.site);
      const c=t.site.communityLife?.border?.campaign;
      if(c)advanceWar(world,geo,r,t,c);
      else openWar(world,geo,r,t);
    }
  }
  function actors(world,geo){
    const rows=[];
    for(const t of geo.towns){
      const c=t.site.communityLife?.border?.campaign;if(!c)continue;
      const rival=geo.towns.find(d=>d.site.id===c.against);if(!rival)continue;
      const fighting=c.phase==='fight',next=c.phase==='return'?Math.max(0,c.index-2):Math.min(c.path.length-1,c.index+1);
      const a=point(c.path[c.index]),b=point(c.path[next]);
      const dt=Date.now()-(world.lastProductionAt||Date.now()),f=fighting?0:Math.max(0,Math.min(.98,dt/(root.EarthDistrictGrowth.period||12000)));
      const x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;
      const label=fighting?'Fighting at the boundary':c.phase==='return'?'Returning from the boundary':'Marching to contest the boundary';
      function row(p,site,dx,offset){
        return {x:x+offset,y,dx,dy:fighting?0:b.y-a.y,kind:'border',phase:fighting?'fighting':c.phase,mode:'walk',
          personId:p.id,name:p.name,siteId:site.id,destination:rival.site.name+' boundary',activity:label,
          detail:c.outcome||label+' · '+t.site.name+' and '+rival.site.name+' · parcel '+c.cell,
          remainingKm:Math.max(0,c.path.length-1-c.index)*.5};
      }
      if(t.site.communityLife.away[c.attacker.id]===borderDuty)rows.push(row(c.attacker,t.site,fighting?1:b.x-a.x,fighting?-.005:0));
      if(fighting&&c.defender)rows.push(row(c.defender,rival.site,-1,.005));
    }
    return rows;
  }
  function entry(world,from,to,visitor,invited,atCell=null){
    if(invited||from.id===to.id)return '';
    // Check the institution before computing its entire distribution of residents.
    const rule=to.communityLife?.entryDecision?.rule;
    if((rule?rule!=='hosted':!['works','slipway'].includes(to.communityLife?.district))||!profile(to).closed)return '';
    const assessment=life().entryAssessment(world,to,from,visitor);
    const pass=to.communityLife?.entryPass;
    const safeConduct=pass?.guestKey===visitor.identityKey&&world.week>=pass.opens&&world.week<=pass.until;
    if(assessment.personal.known||assessment.originTrust>=66||safeConduct)return '';
    const guard=available(world,to,true)[0];
    if(!guard)return '';
    const msg=guard.name+' struck '+visitor.name+' at the boundary of '+to.name+' for entering without an invitation.';
    life().recordReception(world,to,from,visitor,'assault',guard);
    const owner=life().isHome(world,from)&&visitor.identityKey===world.communityLife.profile.identityKey?'steward':visitor.id;
    if(owner==='steward')hurt(world,from,{id:owner,key:visitor.identityKey},'Injured at the boundary of '+to.name+'.');
    record(world,to,from,msg,[guard,visitor],true);record(world,from,to,msg,[visitor,guard],false);
    if(atCell)return {host:to.id,cell:atCell,guard:assign(to,guard),visitor:fighter(from,visitor),round:0,message:msg};
    return msg;
  }
  function guardShift(world,host,origin,trip){
    const gate=trip.checkpoint;
    if(!host||host.communityLife.away[gate.guard.id]!==borderDuty){delete trip.checkpoint;return true;}
    const guard=gate.guard,visitor=gate.visitor;
    gate.round++;
    visitor.energy-=15+Math.round((guard.stamina+guard.resolve)/12);
    guard.energy-=9+Math.round((visitor.stamina+visitor.resolve)/14);
    const withdrew=visitor.resolve<58&&visitor.energy<65&&guard.resolve<83;
    if(!withdrew&&visitor.energy>0&&guard.energy>0)return false;
    const guestSurvived=visitor.energy>0||guard.resolve<78;
    const reason=(withdrew?'Withdrew injured':guestSurvived?'Was injured':'Was fatally injured')+' during the boundary fight at '+gate.cell+'.';
    trip.trauma={id:visitor.id,key:visitor.key,fatal:!guestSurvived,reason};
    const guest=root.EarthPersonas.profile(origin,visitor.id),resident=root.EarthPersonas.profile(host,guard.id);
    if(guard.energy<=0&&!retire(world,host,guard.id,'Died defending the boundary at '+gate.cell+'.'))hurt(world,host,guard,'Injured at the boundary.');
    else if(guard.energy>0)release(host,guard);
    const message=visitor.name+' '+reason.charAt(0).toLowerCase()+reason.slice(1);
    record(world,origin,host,message,[guest,resident]);record(world,host,origin,message,[resident,guest]);
    trip.detail=message+' The crew is bringing its reserved supplies back.';
    delete trip.checkpoint;
    return true;
  }
  function homecoming(world,site,trip){
    const t=trip.trauma;if(!t)return;
    if(!t.fatal||!retire(world,site,t.id,t.reason))hurt(world,site,t,t.reason);
  }
  function valid(site,week){
    const d=site.communityLife?.border;if(d==null)return true;
    const text=v=>typeof v==='string'&&v.length>0&&v.length<=1600;
    const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    const coord=s=>typeof s==='string'&&/^-?\d{1,5},-?\d{1,5}$/.test(s);
    const actor=p=>p&&text(p.id)&&text(p.name)&&text(p.key)&&Number.isFinite(p.energy)&&p.energy>=-100&&p.energy<=120&&int(p.resolve,0,100)&&int(p.stamina,0,100);
    if(!int(d.lost)||d.last!=null&&!int(d.last)||!Array.isArray(d.records)||d.records.length>16||!d.records.every(e=>e&&int(e.week,1,week)&&int(e.step)&&text(e.other)&&text(e.text)&&typeof e.official==='boolean'&&Array.isArray(e.people)&&e.people.length<=4&&e.people.every(text)))return false;
    if(!d.health||typeof d.health!=='object'||Array.isArray(d.health)||!Object.values(d.health).every(h=>h&&text(h.key)&&int(h.week,1,week)&&['injured','died','recovered'].includes(h.condition)&&text(h.reason)&&(h.condition!=='injured'||int(h.until,h.week,week+2))))return false;
    const c=d.campaign;
    return !c||text(c.against)&&coord(c.cell)&&Array.isArray(c.path)&&c.path.length>=2&&c.path.length<=4097&&c.path.every(coord)&&c.path.at(-1)===c.cell&&
      int(c.index,0,c.path.length-1)&&['march','fight','return'].includes(c.phase)&&int(c.round,0,12)&&int(c.began)&&actor(c.attacker)&&
      (c.defender==null?c.phase!=='fight':actor(c.defender));
  }
  root.EarthBorderConflict=Object.freeze({disposition,force,profile,advance,actors,entry,guardShift,homecoming,retire,valid});
})(globalThis);
