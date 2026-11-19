/* Expeditions run on regional time. Street exchanges require two named people
   within reach in the active street. Both kinds of fight share the service roll. */
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
    const start=person.birthTemperament??48;
    const t=person.traits||{};
    return cap(start+((t.initiative??50)-(t.patience??50))*.24+(50-(t.sociability??50))*.36);
  }
  function force(site,person){
    const past=site.autonomy?.people?.[person.id]?.history||[];
    const cooperation=past.filter(e=>['visit','host','cover','project'].includes(e.kind)).length;
    const resident=site.residents.find(r=>r.id===person.id);
    return cap(disposition(person)-Math.min(12,3*cooperation)+(50-site.trust)*.20+(50-site.wellbeing)*.14-(resident?.bond||0)*2);
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
    return {score,tally,militant,opposed,count,chair:host?.name||'the assembly',closed:militant*2>count,expansionist:militant*3>count*2};
  }
  function peers(world,site){
    const cluster=site.communityLife?.cluster||site.id;
    return [...world.sites,...(world.communityLife?.outposts||[])].filter(s=>(s.communityLife?.cluster||s.id)===cluster);
  }
  const ratings=new WeakMap();
  function hostile(world,site){
    if(!world?.communityLife||!site)return false;
    const group=site.communityLife?.cluster||site.id;
    const stamp=[world.actionRevision,world.productionSerial,world.week,world.regionalWorld?.step,world.sites.length,world.communityLife.outposts.length].join('/');
    let memo=ratings.get(world);
    if(memo?.stamp!==stamp){memo={stamp,groups:new Map()};ratings.set(world,memo);}
    if(!memo.groups.has(group)){
      const scores=peers(world,site).map(s=>[s.id,profile(s).score]);
      const mean=scores.reduce((sum,row)=>sum+row[1],0)/scores.length;
      memo.groups.set(group,new Set(scores.filter(row=>row[1]>mean).map(row=>row[0])));
    }
    return memo.groups.get(group).has(site.id);
  }
  const relation=(world,a,b)=>world.communityLife?.relations?.[keyOf(a,b)];
  function declare(world,from,to){
    const book=world.communityLife.relations||={};
    book[keyOf(from.id,to.id)]={from:from.id,to:to.id,state:'war',week:world.week};
    clerk(to).defence||={stage:0};
    const message=from.name+' declared war on '+to.name+'.';
    record(world,from,to,message);record(world,to,from,message);
    return message;
  }
  function openingWars(world,site){
    if(!world.communityLife||!site)return;
    const towns=[...world.sites,...world.communityLife.outposts];
    if(towns.length<2)return;
    const seen=new Set(world.communityLife.openingRoster||[]);
    if(towns.every(t=>seen.has(t.id)))return;
    const ranked=towns.map(t=>({site:t,score:profile(t).score})).sort((a,b)=>b.score-a.score||a.site.id.localeCompare(b.site.id));
    const leader=ranked[0].site;
    for(const t of towns)if(t!==leader&&(!seen.has(t.id)||!seen.has(leader.id))&&!relation(world,leader.id,t.id))declare(world,leader,t);
    world.communityLife.openingRoster=towns.map(t=>t.id);
  }
  function diplomacy(world,req){
    const from=life().lookup(world,world.communityLife?.homeId),to=life().lookup(world,req?.target);
    if(!from||!to||from===to||req.home!==from.id)return {ok:false,message:'Choose another community.'};
    const r=relation(world,from.id,to.id);
    if(req.action==='declare'&&r?.state!=='war'){
      const message=declare(world,from,to);relation(world,from.id,to.id).explicit=true;return {ok:true,message};
    }
    if(r?.state!=='war')return {ok:false,message:'These communities are at peace.'};
    if(req.action==='negotiate'){
      r.offer=true;
      return {ok:true,message:to.name+' offers a ceasefire. Both watches will return home, restore occupied parcels and reopen passage.'};
    }
    if(req.action==='cancel'&&r.offer){delete r.offer;return {ok:true,message:'Peace talks closed. The communities are still at war.'};}
    if(req.action!=='accept'||!r.offer)return {ok:false,message:'The diplomatic situation has changed.'};
    r.state='peace';r.week=world.week;delete r.offer;
    for(const [s,other] of [[from,to],[to,from]]){
      const campaign=s.communityLife.border?.campaign;
      if(campaign?.against===other.id){
        release(other,campaign.defender);release(other,campaign.support);
        campaign.phase='return';campaign.outcome='Peace signed. The watch is returning home.';
      }
      if(s.id===world.activeId&&other.id===world.communityLife.homeId)leaveStreet(s);
    }
    const key=keyOf(from.id,to.id);
    for(const region of Object.values(world.regionalWorld?.regions||{})){
      if(region.contacts[key])Object.assign(region.contacts[key],{terms:'passage',week:world.week,detail:'Both councils signed peace and reopened passage.'});
      for(const parcel of Object.values(region.parcels)){
        const agreement=parcel.agreements?.[key];if(!agreement)continue;
        const former=parcel.charter===from.id?to:parcel.charter===to.id?from:null;
        const border=former?.communityLife.border;
        const earlierOccupation=agreement.terms==='disputed'&&!parcel.occupiedFrom&&
          (border?.occupiedBy===parcel.charter||border?.foothold?.by===parcel.charter);
        if(parcel.occupation&&former&&(parcel.occupiedFrom===former.id||earlierOccupation)){
          parcel.charter=former.id;delete parcel.occupation;delete parcel.occupiedFrom;
        }
        agreement.terms='passage';agreement.week=world.week;
      }
      region.mapRevision=(region.mapRevision||0)+1;
    }
    for(const [site,rival] of [[from,to],[to,from]]){
      const border=site.communityLife.border;
      if(border?.occupiedBy===rival.id)delete border.occupiedBy;
      if(border?.foothold?.by===rival.id)delete border.foothold;
    }
    const message=from.name+' and '+to.name+' signed peace and reopened passage.';
    record(world,from,to,message);record(world,to,from,message);
    return {ok:true,message};
  }
  function buildDefence(world,site){
    const d=site.communityLife.border?.defence;
    if(!d||d.stage>=3||!Object.values(world.communityLife.relations||{}).some(r=>r.state==='war'&&r.to===site.id))return;
    const floor=root.EarthCivicInitiatives.reserve(world,site),held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    if(site.materials-(held.materials||0)<floor.materials+1||site.funds-(held.funds||0)<floor.funds+1)return;
    const builder=available(world,site,false)[0];
    if(!builder||!root.EarthPurses.productionReceipt(world,site,builder.id,1,'Built a section of the town boundary defences.'))return;
    site.materials--;site.funds--;d.stage++;d.builder=builder.name;
    const work=['','set the gateposts','raised the boundary walls','finished the guarded gate'];
    life().recordWeek(site,world.week,builder.name+' '+work[d.stage]+'.');
  }
  function available(world,site,atGate=false){
    const ids=life().fieldCandidates(site,world,atGate);
    const appointments=new Set((root.EarthNeighbourErrands?.working?.(site,world.week)||[]).flatMap(e=>[e.actorId,e.targetId]));
    return ids.filter(id=>!life().commuting(site,id)&&!root.EarthDistrictGrowth.work(site,id))
      .map(id=>root.EarthPersonas.profile(site,id)).filter(p=>p&&
        !root.EarthDistrictOrders.commitment(world,site,p,appointments)&&!root.EarthHousing?.workHold(site,p.id)).sort((a,b)=>readiness(world,site,b)-readiness(world,site,a)||a.id.localeCompare(b.id));
  }
  const clerk=site=>site.communityLife.border||={records:[],health:{},lost:0};
  function service(world,site,p){
    const old=site.communityLife.border?.service?.[p.identityKey||p.key];
    return old?{experience:old.experience,fatigue:Math.max(0,old.fatigue-Math.floor(((world.regionalWorld?.step||0)-old.step)*.6))}:{experience:0,fatigue:0};
  }
  function readiness(world,site,p){const s=service(world,site,p);return force(site,p)+Math.min(8,s.experience*2)-s.fatigue*.60;}
  function debrief(world,site,p,cost){
    if(!p)return;const old=service(world,site,p),log=clerk(site).service||={};
    log[p.key]={step:world.regionalWorld?.step||0,experience:Math.min(50,old.experience+1),fatigue:cap(old.fatigue+cost)};
  }
  function record(world,site,other,text,people=[],official=true){
    const office=clerk(site);
    office.records.unshift({week:world.week,step:world.regionalWorld?.step||0,other:other.id,text,people:people.map(p=>p.identityKey),official});
    office.records.length=Math.min(16,office.records.length);
    life().recordWeek(site,world.week,text);
  }
  function fightingSkill(p){
    return cap(.5*p.aptitudes.stamina+.3*p.aptitudes.craft+.2*(p.traits.initiative??50));
  }
  function fighter(site,p){
    const stamina=p.aptitudes.stamina,skill=fightingSkill(p);
    return {id:p.id,key:p.identityKey,name:p.name,stamina,skill,resolve:force(site,p),energy:80+Math.round(stamina*.3)};
  }
  function blow(world,site,actor){
    // Older saved patrols used stamina as their only fighting aptitude.
    const {experience,fatigue}=service(world,site,actor);
    return Math.round(((actor.skill??actor.stamina)+actor.resolve)/13+Math.min(7,experience)-fatigue*.08);
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
    if(!p||id==='steward'||p.identityKey===world.communityLife.profile.identityKey||site.population<=1||c.away[id]===deceased)return false;
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
    const neighbours=geo.towns.filter(t=>t!==town&&t.site.population>=1);
    const options=[];
    for(const rival of neighbours){
      if(rival.site.communityLife?.border?.occupiedBy===town.site.id)continue;
      const treaty=relation(world,town.site.id,rival.site.id);
      if(treaty?.state!=='war'||treaty.from!==town.site.id)continue;
      const agreement=r.contacts[keyOf(town.site.id,rival.site.id)];
      if(!treaty.explicit&&agreement?.terms!=='disputed'&&agreement?.reviewWeek>world.week)continue;
      const dist=Math.hypot(rival.x-town.x,rival.y-town.y);
      const foothold=rival.site.communityLife?.border?.foothold;
      const holdsFoothold=foothold?.by===town.site.id&&r.parcels[foothold.cell]?.charter===town.site.id;
      options.push({rival,holdsFoothold,score:(holdsFoothold?30:0)+(agreement?.terms==='disputed'?12:0)-dist});
    }
    options.sort((a,b)=>b.score-a.score||a.rival.site.id.localeCompare(b.rival.site.id));
    for(const {rival,holdsFoothold} of options){
      const path=region().crossingPath(world,town.site,rival.site);
      if(!path?.length)continue;
      // Pick the outermost parcel inside the rival's surveyed neighbourhood.
      // Retain its previous title and economic use separately from government.
      const index=holdsFoothold?path.length-1:path.findIndex((id,i)=>i>0&&Math.hypot(point(id).x-rival.x,point(id).y-rival.y)<=.74&&r.parcels[id]?.charter!==town.site.id);
      if(index>0){
        return {rival,path:path.slice(0,index+1),cell:path[index]};
      }
    }
    return null;
  }
  function openWar(world,geo,r,town){
    const site=town.site;
    if(!Object.values(world.communityLife.relations||{}).some(r=>r.from===site.id&&r.state==='war'))return;
    const step=world.regionalWorld.step,last=site.communityLife.border?.last??-40;
    if(site.communityLife.border?.occupiedBy||step<2||step-last<27||site.population<5)return;
    const floor=root.EarthCivicInitiatives.reserve(world,site),held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
    if(site.food-(held.food||0)<Math.max(floor.food,Math.ceil(site.population/5)*2)+2||site.funds-(held.funds||0)<floor.funds+2)return;
    const volunteers=available(world,site);
    if(!volunteers.length)return;
    const next=target(world,geo,r,town);if(!next)return;
    const travelCosts=next.path.map((cell,i)=>i?region().routeEffort(world,site,[next.path[i-1],cell]):0);
    if(travelCosts.some(n=>!Number.isFinite(n)))return;
    const clerkBook=clerk(site),leader=volunteers[0];
    const pay=leader.name+' accepted 2 treasury funds for the boundary watch.';
    if(!root.EarthPurses.productionReceipt(world,site,leader.id,2,pay))return;
    site.food-=2;site.funds-=2;
    clerkBook.last=step;
    clerkBook.campaign={against:next.rival.site.id,cell:next.cell,path:next.path,index:0,phase:'march',round:0,
      travelCosts,credit:0,began:step,attacker:assign(site,leader),defender:null};
    const partner=volunteers[1],party=[leader];
    if(partner&&site.food-(held.food||0)>=Math.max(floor.food,Math.ceil(site.population/5)*2)+2&&site.funds-(held.funds||0)>=floor.funds+2&&
        root.EarthPurses.productionReceipt(world,site,partner.id,2,'A second watch wage for the same expedition.')){
      site.food-=2;site.funds-=2;clerkBook.campaign.partner=assign(site,partner);party.push(partner);
    }
    const text=site.name+' sent its watch to seize '+(next.cell===idOf(next.rival.x,next.rival.y)?'the town centre at ':'the outer parcel at ')+next.cell+' in '+next.rival.site.name+'. '+party.map(p=>p.name).join(' and ')+' left with 2 food and a watch wage of 2 funds each.';
    record(world,site,next.rival.site,text,party);
  }
  function publish(world,site,other,campaign,text,kind){
    const p=root.EarthPersonas.profile(site,campaign.attacker.id);
    const guard=campaign.defender&&root.EarthPersonas.profile(other,campaign.defender.id);
    const witnesses=[p,guard,campaign.partner&&root.EarthPersonas.profile(site,campaign.partner.id),campaign.support&&root.EarthPersonas.profile(other,campaign.support.id)].filter(Boolean);
    record(world,site,other,text,witnesses);record(world,other,site,text,witnesses);
    if(kind&&p){
      const witness=guard&&other.communityLife.away[guard.id]!==deceased?guard:
        campaign.support&&root.EarthPersonas.profile(other,campaign.support.id)||campaign.partner&&root.EarthPersonas.profile(site,campaign.partner.id)||p;
      life().recordReception(world,site,other,witness,'invasion',p);
      life().recordReception(world,other,site,p,'trespass',witness);
    }
  }
  function settle(world,r,site,other,c,victory,message){
    const travel=Math.min(18,Math.ceil(c.path.length/(site.growth?.vehicle?3:2)));
    for(const p of [c.attacker,c.partner])debrief(world,site,p,19+travel+(victory?0:7));
    for(const p of [c.defender,c.support])debrief(world,other,p,victory?23:17);
    if(victory){
      const parcel=r.parcels[c.cell]||={uses:{}};
      parcel.charter=site.id;parcel.occupation=world.week;parcel.occupiedFrom=other.id;
      (parcel.claims||={})[other.id]||={week:world.week,by:other.name,basis:'Earlier jurisdiction retained on the record'};
      (parcel.claims)[site.id]={week:world.week,by:c.attacker.name,basis:'Occupied after the boundary dispute'};
      const k=keyOf(site.id,other.id);
      (parcel.agreements||={})[k]={a:site.id,b:other.id,terms:'disputed',week:world.week};
      r.contacts[k]={a:site.id,b:other.id,terms:'disputed',week:world.week,step:world.regionalWorld.step,
        cell:c.cell,trust:15,meetings:(r.contacts[k]?.meetings||0)+1,detail:'The occupation closed this boundary until the councils negotiate access.'};
      r.mapRevision=(r.mapRevision||0)+1;
      const town=region().geography(world,other).towns.find(t=>t.site.id===other.id);
      if(c.cell===idOf(town.x,town.y)){
        clerk(other).occupiedBy=site.id;delete clerk(other).foothold;
        message+=' '+site.name+' captured '+other.name+'’s town centre and now controls its territory.';
      }else{
        clerk(other).foothold={by:site.id,cell:c.cell};
        message+=' '+site.name+' took jurisdiction over '+c.cell+' and has a foothold for an advance on '+other.name+'.';
      }
    }
    other.trust=Math.max(0,other.trust-2);site.trust=Math.max(0,site.trust-1);
    publish(world,site,other,c,message,'invasion');
    release(other,c.defender);release(other,c.support);
    c.phase='return';c.outcome=message;
  }
  function march(c,pace,returning){
    if(!c.travelCosts){c.index=Math.max(0,Math.min(c.path.length-1,c.index+(returning?-pace:pace)));return;}
    c.credit=(c.credit||0)+pace;
    const end=returning?0:c.path.length-1;
    while(c.index!==end){
      const next=c.index+(returning?-1:1),effort=c.travelCosts[Math.max(next,c.index)];
      if(c.credit<effort)break;
      c.credit-=effort;c.index=next;
    }
    if(c.index===end)c.credit=0;
  }
  function advanceWar(world,geo,r,town,c){
    const site=town.site,other=geo.towns.find(t=>t.site.id===c.against)?.site;
    if(!other){release(site,c.attacker);release(site,c.partner);delete clerk(site).campaign;return;}
    if(c.phase==='return'){
      march(c,2,true);
      if(!c.index){release(site,c.attacker);release(site,c.partner);delete clerk(site).campaign;}
      return;
    }
    const pact=relation(world,site.id,other.id);
    if(site.communityLife.border.occupiedBy||pact?.state==='peace'){
      release(other,c.defender);release(other,c.support);c.phase='return';
      c.outcome=site.communityLife.border.occupiedBy?'The town centre fell. The expedition is returning home.':'The councils recognised passage and recalled the watch.';
      publish(world,site,other,c,c.outcome);return;
    }
    if(c.phase==='march'){
      march(c,1+(site.growth?.vehicle?1:0),false);
      if(c.index<c.path.length-1)return;
      const fort=other.communityLife.border?.defence?.stage||0;
      if(fort>=2&&(c.siege||0)<fort){
        c.siege=(c.siege||0)+1;
        if(c.siege===1)publish(world,site,other,c,other.name+'’s boundary wall stopped the invading watch at the gate.');
        return;
      }
      const guards=available(world,other,false),p=guards[0];
      if(!p){settle(world,r,site,other,c,true,other.name+' had no free resident to defend its outer parcel.');return;}
      c.defender=assign(other,p);c.phase='fight';
      const rallied=other.communityLife.border?.records.some(note=>note.other===site.id&&note.text.includes('took jurisdiction'));
      const second=guards.slice(1).find(g=>rallied||force(other,g)>=65);
      if(second)c.support=assign(other,second);
      const attackers=[c.attacker,c.partner].filter(Boolean),defenders=[c.defender,c.support].filter(Boolean);
      const travel=Math.min(18,Math.ceil(c.path.length/(site.growth?.vehicle?3:2)));
      for(const a of attackers)a.energy=Math.max(25,a.energy-service(world,site,a).fatigue-travel);
      for(const b of defenders)b.energy=Math.max(25,b.energy-service(world,other,b).fatigue+fort*3);
      publish(world,site,other,c,attackers.map(person=>person.name).join(' and ')+' entered the boundary without leave. '+defenders.map(person=>person.name).join(' and ')+' confronted them and began fighting.','invasion');
      return;
    }
    c.round++;
    const a=c.attacker,b=c.defender;
    // Stamina, willingness to continue and the previous exchange decide the
    // result. No random draws or camera frames are consumed by combat.
    const originalA=a.energy,originalB=b.energy;
    const strength=(field,p)=>13+blow(world,field,p);
    a.energy-=Math.round(strength(other,b)+(c.support?strength(other,c.support)*.54:0));
    b.energy-=Math.round(strength(site,a)+(c.partner?strength(site,c.partner)*.61:0));
    // A less committed watch can accept withdrawal. The most militant
    // expeditions continue the fight unless the councils negotiate passage.
    const retreat=b.resolve<58&&b.energy<42&&a.resolve<83;
    if(a.energy>0&&b.energy>0&&!retreat&&!(a.resolve<65&&a.energy<32))return;
    const victory=b.energy<=0&&a.energy<=0?a.energy>b.energy||a.energy===b.energy&&originalA>=originalB:b.energy<=0||retreat;
    const loser=victory?b:a,losingTown=victory?other:site;
    const winner=victory?a:b,exposure=Math.max(0,-loser.energy)+Math.max(0,winner.energy)*.4+service(world,losingTown,loser).fatigue*.3;
    const death=loser.energy<=0&&exposure>=15&&Math.max(winner.resolve,loser.resolve)>=75&&retire(world,losingTown,loser.id,'Died in the boundary fight at '+c.cell+'.');
    if(!death)hurt(world,losingTown,loser,'Injured in the boundary fight at '+c.cell+'.');
    const witness=[c.partner,c.support,winner].find(person=>person&&person.key!==loser.key);
    const message=loser.name+(death?' died in the fight.':' withdrew injured.')+(witness?' '+witness.name+' witnessed the outcome.':'');
    settle(world,r,site,other,c,victory,message);
    if(death&&!victory&&!c.partner)delete clerk(site).campaign;
  }
  function advance(world,geo,r){
    for(const t of geo.towns){
      buildDefence(world,t.site);
      recovery(world,t.site);
      const gate=t.site.communityLife?.border?.gate;
      if(gate&&world.regionalWorld.step>=gate.until){release(t.site,gate.guard);delete t.site.communityLife.border.gate;}
      const watch=t.site.communityLife?.border?.street;
      if(watch?.phase==='alert'&&world.activeId===t.site.id)muster(world,t.site,watch);
      const c=t.site.communityLife?.border?.campaign;
      if(c)advanceWar(world,geo,r,t,c);
      else openWar(world,geo,r,t);
    }
  }
  function combatants(at,visitors,guards,from,to,detail){
    const result=[];
    if(!visitors.length||!guards.length)return result;
    function add(p,i,all,opponents,site,side){
      const row=all.length===1?0:i===0?-1:1,opponent=opponents[i]||opponents[0];
      result.push({x:at.x+side*.004,y:at.y+row*.0065,dx:-side*.62,dy:opponents.length===all.length?0:-row*.5,
        kind:'border',phase:'fighting',fightSide:side,fightRow:row,mode:'walk',name:p.name,personId:p.id,siteId:site.id,
        destination:to.name+' boundary',activity:'Fighting '+opponent.name+' at the boundary',detail,remainingKm:0});
    }
    visitors.forEach((p,i)=>add(p,i,visitors,guards,from,-1));guards.forEach((p,i)=>add(p,i,guards,visitors,to,1));
    return result;
  }
  function actors(world,geo){
    const rows=[];
    for(const t of geo.towns){
      const office=t.site.communityLife?.border,gate=office?.gate;
      if(gate){
        const source=geo.towns.find(d=>d.site.id===gate.from);
        if(source){
          const dx=source.x-t.x,dy=source.y-t.y,n=Math.max(.01,Math.abs(dx)+Math.abs(dy));
          rows.push(...combatants({x:t.x+dx/n*.155,y:t.y+dy/n*.155},[gate.visitor],[gate.guard],source.site,t.site,gate.message));
        }
      }
      const c=office?.campaign;if(!c)continue;
      const rival=geo.towns.find(d=>d.site.id===c.against);if(!rival)continue;
      const next=c.phase==='return'?Math.max(0,c.index-2):Math.min(c.path.length-1,c.index+1);
      const a=point(c.path[c.index]),b=point(c.path[next]),crew=[c.attacker,c.partner].filter(p=>p&&t.site.communityLife.away[p.id]===borderDuty);
      if(c.phase==='fight'){
        rows.push(...combatants(a,crew,[c.defender,c.support].filter(Boolean),t.site,rival.site,t.site.name+' authorised the claim on parcel '+c.cell+'.'));continue;
      }
      const dt=Date.now()-(world.lastProductionAt||Date.now()),f=Math.max(0,Math.min(.98,dt/(root.EarthDistrictGrowth.period||12000)));
      const x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,back=c.phase==='return';
      const label=back?'Returning from the boundary':'Marching to contest the boundary';
      for(const [i,p] of crew.entries())rows.push({x:x+i*.01,y:y+i*.007,dx:b.x-a.x,dy:b.y-a.y,kind:'border',phase:c.phase,mode:'walk',
        personId:p.id,name:p.name,siteId:t.site.id,destination:back?t.site.name:rival.site.name+' boundary',activity:label,
        detail:c.outcome||label+' · parcel '+c.cell,remainingKm:(back?c.index:c.path.length-1-c.index)*.5});
    }
    return rows;
  }
  function hasPass(world,site,guest,origin){
    if(!origin||origin.id===site.id||relation(world,origin.id,site.id)?.state==='peace')return true;
    return life().recognisedVisitor(world,site,origin,guest);
  }
  function entry(world,from,to,visitor,invited,atCell=null){
    if(invited||from.id===to.id)return '';
    if(!hostile(world,to))return '';
    if(hasPass(world,to,visitor,from))return '';
    const guard=available(world,to)[0];
    if(!guard)return '';
    const msg=guard.name+' struck '+visitor.name+' at the boundary of '+to.name+' for entering without an invitation.';
    life().recordReception(world,to,from,visitor,'assault',guard);
    const owner=life().isHome(world,from)&&visitor.identityKey===world.communityLife.profile.identityKey?'steward':visitor.id;
    if(owner==='steward')hurt(world,from,{id:owner,key:visitor.identityKey},'Injured at the boundary of '+to.name+'.');
    record(world,to,from,msg,[guard,visitor],true);record(world,from,to,msg,[visitor,guard],false);
    if(atCell)return {host:to.id,cell:atCell,guard:assign(to,guard),visitor:fighter(from,visitor),round:0,message:msg};
    const office=clerk(to);if(office.gate)release(to,office.gate.guard);
    office.gate={from:from.id,until:(world.regionalWorld?.step||0)+2,guard:assign(to,guard),visitor:fighter(from,visitor),message:msg};
    return msg;
  }
  function leaveStreet(site){
    const office=site?.communityLife?.border,watch=office?.street;
    if(!watch)return;
    if(watch.phase==='fight')release(site,watch.guard);
    delete office.street;
  }
  function muster(world,site,watch){
    const local=available(world,site,true)[0];
    if(!local)return;
    const home=life().lookup(world,world.communityLife.homeId),guest=world.communityLife.profile;
    watch.guard=assign(site,local);
    watch.phase='fight';
    watch.nextStrike=Date.now()+4000;
    const message=local.name+' began pursuing '+guest.name+' on entering '+site.name+' without an introduction.';
    record(world,site,home,message,[local,guest]);record(world,home,site,message,[guest,local],false);
  }
  function streetEntry(world,from,to){
    const home=life().lookup(world,world.communityLife.homeId),guest=world.communityLife.profile;
    if(!from||from===to||home===to)return '';
    if(!hostile(world,to)||hasPass(world,to,guest,home))return '';
    const office=clerk(to);
    if(office.gate?.visitor.key===guest.identityKey){release(to,office.gate.guard);delete office.gate;}
    const watch=office.street={from:from.id,phase:'alert',round:0,resisting:false,visitor:fighter(home,guest)};
    muster(world,to,watch);
    return streetStatus(watch);
  }
  function streetStatus(watch){
    if(watch.phase==='alert')return 'The watch is looking for the unintroduced visitor.';
    if(watch.phase==='repelled')return 'You were injured. The watch has stopped pursuing you.';
    if(watch.phase==='won')return watch.outcome;
    return watch.guard.name+' is pursuing you · Your energy '+Math.max(0,watch.visitor.energy)+' · '+watch.guard.name+'’s energy '+Math.max(0,watch.guard.energy);
  }
  function streetRound(world,site,watch){
    if(watch.phase==='alert'){muster(world,site,watch);return;}
    if(watch.phase!=='fight')return;
    const {guard,visitor}=watch,home=life().lookup(world,world.communityLife.homeId);
    if(!watch.round)life().recordReception(world,site,home,world.communityLife.profile,'assault',root.EarthPersonas.profile(site,guard.id));
    watch.round++;
    visitor.energy-=13+blow(world,site,guard);
    if(watch.resisting)guard.energy-=20+blow(world,home,visitor);
    if(visitor.energy>0&&guard.energy>0)return;
    const won=guard.energy<=0&&(visitor.energy>0||guard.energy<visitor.energy);
    let message;
    if(won){
      const fatal=watch.resisting&&retire(world,site,guard.id,'Died fighting '+visitor.name+' at the gate.');
      if(!fatal)hurt(world,site,guard,'Injured fighting '+visitor.name+' at the gate.');
      watch.phase='won';message=guard.name+(fatal?' died in the fight.':' withdrew injured.')+' '+visitor.name+' got past the watch.';
    }else{
      hurt(world,home,visitor,'Injured by '+guard.name+' at the gate of '+site.name+'.');
      release(site,guard);watch.phase='repelled';
      message=guard.name+' drove '+visitor.name+' back to the gate injured.';
    }
    debrief(world,site,guard,won?23:17);debrief(world,home,visitor,won?17:23);
    watch.outcome=message;
    const people=[world.communityLife.profile,root.EarthPersonas.profile(site,guard.id)];
    record(world,home,site,message,people,false);record(world,site,home,message,people);
  }
  function streetContact(world,site,req,scene){
    const w=site.communityLife?.border?.street;
    if(!w||w.phase!=='fight'||w.guard.key!==req.target||req.round!==w.round||site.id!==world.activeId||
       scene?.siteId!==site.id||scene.actor!=='steward'||!['walk','drive','boat'].includes(scene.mode)||
       ![scene.x,scene.y,scene.gx,scene.gy].every(Number.isFinite))return {ok:false,message:'The encounter has moved.'};
    const gap=Math.hypot(scene.x-scene.gx,scene.y-scene.gy);
    if(gap>=5||scene.mode==='drive'){
      const message='You escaped '+w.guard.name+' in '+site.name+'.';
      leaveStreet(site);life().recordWeek(site,world.week,message);
      return {ok:true,message};
    }
    if(gap>1||scene.mode!=='walk'||Date.now()<(w.nextStrike||0))return {ok:false,message:'Beyond reach.'};
    streetRound(world,site,w);w.nextStrike=Date.now()+4000;
    return {ok:true,message:streetStatus(w)};
  }
  function guardShift(world,host,origin,trip){
    const gate=trip.checkpoint;
    if(!host||host.communityLife.away[gate.guard.id]!==borderDuty){delete trip.checkpoint;return true;}
    const guard=gate.guard,visitor=gate.visitor;
    gate.round++;
    visitor.energy-=15+blow(world,host,guard);
    guard.energy-=9+blow(world,origin,visitor);
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
    const actor=p=>p&&text(p.id)&&text(p.name)&&text(p.key)&&Number.isFinite(p.energy)&&p.energy>=-100&&p.energy<=140&&int(p.resolve,0,100)&&int(p.stamina,0,100)&&(p.skill==null||int(p.skill,0,100));
    if(d.defence&&(!int(d.defence.stage,0,3)||d.defence.builder!=null&&!text(d.defence.builder)))return false;
    if(!int(d.lost)||d.last!=null&&!int(d.last)||!Array.isArray(d.records)||d.records.length>16||!d.records.every(e=>e&&int(e.week,1,week)&&int(e.step)&&text(e.other)&&text(e.text)&&typeof e.official==='boolean'&&Array.isArray(e.people)&&e.people.length<=4&&e.people.every(text)))return false;
    if(!d.health||typeof d.health!=='object'||Array.isArray(d.health)||!Object.values(d.health).every(h=>h&&text(h.key)&&int(h.week,1,week)&&['injured','died','recovered'].includes(h.condition)&&text(h.reason)&&(h.condition!=='injured'||int(h.until,h.week,week+2))))return false;
    if(d.service&&(!d.service||typeof d.service!=='object'||Array.isArray(d.service)||!Object.values(d.service).every(v=>v&&int(v.step)&&int(v.experience,0,50)&&int(v.fatigue,0,100))))return false;
    if(d.gate&&(!text(d.gate.from)||!text(d.gate.message)||!int(d.gate.until)||!actor(d.gate.guard)||!actor(d.gate.visitor)))return false;
    if(d.occupiedBy!=null&&(!text(d.occupiedBy)||d.occupiedBy===site.id))return false;
    if(d.foothold!=null&&(!text(d.foothold.by)||!coord(d.foothold.cell)))return false;
    const w=d.street;
    if(w&&(!text(w.from)||w.from===site.id||!actor(w.visitor)||w.visitor.id!=='steward'||!int(w.round,0,12)||
      typeof w.resisting!=='boolean'||!['alert','fight','repelled','won'].includes(w.phase)||
      (w.phase==='alert'?w.guard!=null:!actor(w.guard))||(['repelled','won'].includes(w.phase)&&!text(w.outcome))))return false;
    const c=d.campaign;
    return !c||text(c.against)&&coord(c.cell)&&Array.isArray(c.path)&&c.path.length>=2&&c.path.length<=4097&&c.path.every(coord)&&c.path.at(-1)===c.cell&&
      (c.travelCosts==null||Array.isArray(c.travelCosts)&&c.travelCosts.length===c.path.length&&c.travelCosts[0]===0&&
        c.travelCosts.slice(1).every(n=>Number.isFinite(n)&&n>0&&n<=5)&&Number.isFinite(c.credit)&&c.credit>=0&&c.credit<=5)&&
      int(c.index,0,c.path.length-1)&&['march','fight','return'].includes(c.phase)&&int(c.round,0,12)&&int(c.began)&&actor(c.attacker)&&
      (c.partner==null||actor(c.partner))&&(c.support==null||actor(c.support))&&(c.defender==null?c.phase!=='fight':actor(c.defender));
  }
  root.EarthBorderConflict=Object.freeze({disposition,fightingSkill,force,profile,advance,actors,combatants,entry,streetEntry,streetStatus,leaveStreet,hostile,openingWars,diplomacy,relation,streetContact,hasPass,guardShift,homecoming,retire,valid});
})(globalThis);
