/* A district has two voluntary outings a week. Everyone else keeps their own
   commitments, recovers or follows their regular work. Forecasts use the same
   deterministic choices on their detached copy of the world. */
(function(root){
  'use strict';
  const labels={routine:'Keep the usual shift',player:'Choose your own next step',commitment:'Keep an agreement',rest:'Take a quiet afternoon',gather:'Help stock the community pantry',cover:'Cover a departing colleague',visit:'Visit a neighbour',host:'Make time for a visitor',learn:'Study a new occupation',apply:'Put a career plan into practice'};
  const adviceLabels={rest:'Suggest time to rest',learn:'Ask about trying a new occupation',help:'Suggest helping with a local shortage',connect:'Suggest catching up with a neighbour'};
  const actionGoal={rest:'Recover energy',gather:'Keep food within reach',cover:'Keep a service staffed',visit:'Stay in touch',host:'Stay in touch',learn:'Explore work that suits me',apply:'Put learning to work',player:'Set my own direction',routine:'Keep a dependable routine',commitment:'See an agreement through'};
  const venues=new Set(['market','garden','workshop','hall','bench','dock','home']);
  const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const clamp=(n,max)=>Math.max(0,Math.min(max,n));
  const has=(o,id)=>o!=null&&Object.hasOwn(o,id);
  const dict=o=>o!=null&&typeof o==='object'&&!Array.isArray(o);
  const record=(site,id)=>has(site?.autonomy?.people,id)?site.autonomy.people[id]:null;
  const line=(week,kind,reason,venue,target=null)=>({week,kind,reason,venue,target});
  const knownId=(site,id)=>typeof id==='string' && (id==='steward'||id==='driver'||/^walker-[0-4]$/.test(id)||/^carrier-[0-8]-[0-8]$/.test(id)||site.residents?.some(r=>r.id===id));
  const defaultTraits={initiative:50,patience:50,curiosity:50,sociability:50,adaptability:50};
  const workplace=(venue,role)=>venue==='pier'?'dock':venues.has(venue)?venue:roleVenue(role);
  const roleVenue=role=>/farmer|grower|seed|garden|baker|food|cook/i.test(role)?'garden':/repair|carpent|fabricat|craft|engineer/i.test(role)?'workshop':/driver|courier|exchange|trader|transport/i.test(role)?'market':'hall';
  function people(site){return root.EarthPersonas?.list(site)||[...(site?.residents||[])];}
  function fresh(person){return {energy:4+Math.floor((person.aptitudes?.stamina??50)/27),contact:2,revision:0,history:[]};}
  function setRecord(table,id,row){Object.defineProperty(table,id,{value:row,writable:true,enumerable:true,configurable:true});}
  function data(site){return site.autonomy||={week:0,people:Object.create(null),effects:{}};}
  function identity(site,id){return root.EarthPersonas?.profile(site,id)||site.residents?.find(r=>r.id===id);}
  function controlled(site,world){return site.id===world.activeId?(root.EarthAgency?.actorId(site)||site.agency?.actor||'steward'):null;}
  function busy(site,person){
    const resident=site.residents?.find(p=>p.id===person.id),worker=site.workforce?.members?.[person.id];
    if(resident?.promise)return 'I gave my word. I want to see that promise through first.';
    if(site.shift?.residentId===person.id)return 'I already agreed to spend this shift together.';
    if(site.pursuits?.ticket?.maker===person.name)return 'I have a job waiting on the market board.';
    if(worker && (worker.jobId || worker.preferredJobId || worker.preference && worker.preference!=='auto'))return 'I promised to cover my assigned occupation.';
    const pair={tools:[0,1],meals:[0,2],room:[1,2]}[site.neighbourWork?.active?.kind];
    if(site.neighbourWork?.active?.phase==='working' && pair?.includes(resident?.slot))return 'My neighbour and I already agreed on a joint job.';
    return '';
  }
  const memo=new WeakMap();
  function describe(id,item){
    if(!item)return null;
    if(!memo.has(item))memo.set(item,Object.freeze({...item,id,label:labels[item.kind],goal:actionGoal[item.kind]}));
    return memo.get(item);
  }
  function intent(site,id){return describe(id,record(site,id)?.history[0]);}
  function history(site,id){return (record(site,id)?.history||[]).map(h=>describe(id,h));}
  function view(site,world,id){
    const person=identity(site,id);if(!person)return null;
    const row=record(site,id),mine=controlled(site,world)===id,latest=intent(site,id);
    const fallback=mine?line(world.week,'player','I am choosing what to do next.','home'):
      line(world.week,'routine','I am following my regular routine.',roleVenue(person.role));
    const current=!mine&&latest&&latest.kind!=='player'?latest:describe(id,fallback);
    const career=site.careers?.[id],target=root.EarthCareers?.catalog?.find(j=>j.id===(career?.application?.targetId||career?.training?.targetId));
    const goal=target?(career.application?'Consider the '+target.label.toLowerCase()+' position at '+target.employer:'Complete '+target.label.toLowerCase()+' evening classes') : current.goal;
    return {...current,goal,energy:row?.energy??fresh(person).energy,contact:row?.contact??2,advice:row?.advice||null};
  }
  function guidance(site,world,id){
    const person=identity(site,id),row=record(site,id),revision=row?.revision||0;
    const reason=!person?'This person is away.':controlled(site,world)===id?'Choose a personal action for the character you are playing.':row?.advice?.week===world.week?'You already talked about their plans this week.':'';
    return {revision,choices:Object.entries(adviceLabels).map(([id,label])=>({id,label,detail:'They decide whether this fits their plans for next week.',reason,available:!reason,expectedRevision:revision}))};
  }
  function command(world,site,id,action,targetId,expectedRevision,proof){
    const person=identity(site,id),speaker=controlled(site,world),meeting=typeof proof==='function'?proof():proof;
    if(!person || !speaker || id===speaker || meeting?.actor!==speaker || meeting?.target!==id || meeting?.siteId!==site.id || meeting?.mode!=='walk' ||
      ![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite)||Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)
      return {ok:false,message:'Meet this person on foot to talk about their plans.'};
    const model=guidance(site,world,id),choice=model.choices.find(c=>c.id===action);
    if(!choice?.available||expectedRevision!==model.revision)return {ok:false,message:choice?.reason||'Their plans changed. Ask about them again.'};
    const d=data(site),r=record(site,id)||fresh(person);setRecord(d.people,id,r);
    const traits=person.traits||defaultTraits;
    const why=busy(site,person) || (action==='rest'&&r.energy>=6?'I feel rested, and I want to keep my usual shift.':
      action==='help'&&site.food>=2*Math.ceil(site.population/5)&&!root.EarthCareers?.coverage?.(site,world)?.some(g=>!g.coverId)?'Our pantry is stocked and the shifts have cover.':
      action==='learn'&&(traits.curiosity+traits.adaptability<85)?'I want more time in my current work before I explore another occupation.':
      action==='connect'&&r.contact<3&&traits.sociability<45?'I would like some quiet time this week.':'');
    r.advice={action,week:world.week,accepted:!why};r.revision++;
    return {ok:true,changed:true,message:person.name+' · “'+(why||'I will consider that when I make next week’s plans.')+'”'};
  }
  function friendScore(site,self,other,world){
    const a=site.residents?.find(r=>r.id===self.id),b=site.residents?.find(r=>r.id===other.id);
    const bond=a&&b?site.neighbourWork?.links?.[[a.slot,b.slot].sort().join('-')]||0:0;
    if(bond<0)return -1;
    const meal=site.agency?.meals?.some(m=>m.week>=world.week-2 && (m.from===self.id&&m.to===other.id||m.to===self.id&&m.from===other.id));
    const visit=self.row.history.find(h=>(h.kind==='visit'||h.kind==='host')&&h.target===other.id);
    const familiar=visit && world.week-visit.week>1?11:0;
    const recentHost=other.row.history.slice(0,2).filter(h=>h.kind==='host').length;
    return other.row.contact*2+other.traits.sociability/12+bond*4+(meal?20:0)+familiar-recentHost*6+(visit?.week===world.week-1?-12:0);
  }
  function candidate(site,world,person,table){
    const row=record(site,person.id)||fresh(person);setRecord(table,person.id,row);
    const career=site.careers?.[person.id];
    if(career?.agreedPlan){row.path=career.agreedPlan;row.proposed=true;}
    else if(row.proposed || career?.manualWeek || career?.jobId===row.path){delete row.path;delete row.proposed;}
    const traits=person.traits||defaultTraits,job=root.EarthCareers?.work?.(site,person.id),role=job?.label||job?.role||person.role;
    const venue=workplace(job?.venue,role),week=world.week;
    const resident=site.residents?.find(r=>r.id===person.id),failed=resident?.lastMissed?.week>=week-2;
    let duty=busy(site,person);
    const base=person.id===controlled(site,world)?line(week,'player','I choose where to go and what to do.','home'):
      duty?line(week,'commitment',duty,venue):row.energy<2?line(week,'rest','I have worked several weeks without a proper break.','bench'):
      failed?line(week,'routine','After the missed promise I want a dependable shift.',venue):line(week,'routine','I am keeping my regular shift as '+(role||'a community member')+'.',venue);
    return {id:person.id,name:person.name,profile:person,row,traits,base,item:base,free:base.kind==='routine'&&!failed,wasAdvised:row.advice?.accepted&&row.advice.week===week-1?row.advice.action:null};
  }
  function bestJob(person,site){
    const jobs=root.EarthCareers?.catalog||[],current=root.EarthCareers?.role?.(site,person.id)||person.profile.role;
    let best=null,score=-Infinity,currentFit=0;
    for(const job of jobs){
      const ability=person.profile.aptitudes?.[job.skill]??40,interest=person.profile.strengths?.includes(job.skill)?9:0;
      if(job.label.toLowerCase()===String(current||'').toLowerCase()){currentFit=ability+interest;continue;}
      const limits=person.profile.bounds;
      if(limits && (limits[job.skill].max+6<job.requiredSkill || limits[job.secondary].max<job.secondMinimum))continue;
      const horizon=Math.min(12,(job.trainingWeeks||0)/20)*(100-person.traits.patience)/100;
      const value=ability+interest-horizon+(person.profile.interests?.some(i=>String(i).toLowerCase().includes(job.label.toLowerCase()))?4:0);
      if(value>score){score=value;best=job;}
    }
    // People content in a well-matched line of work generally keep it.
    const needed=person.wasAdvised==='learn'?45:Math.max(45,currentFit+2);
    return score>=needed?best:null;
  }
  function careerStep(world,site,person){
    const careers=root.EarthCareers,book=person.row.path;
    if(!careers?.command||!careers.view)return null;
    const job=book?careers.catalog.find(j=>j.id===book):bestJob(person,site);if(!job)return null;
    const self={speakerId:person.id,autonomous:true};
    const cv=careers.view(world,site,person.id,job.id,self);if(!cv)return null;
    // Player-led enrolment, applications and employment always retain their terms.
    if(cv.training && (!cv.training.autonomous || cv.training.paused) || cv.application&&!cv.application.autonomous || !book && cv.history?.length)return null;
    if(cv.careerId===job.id){delete person.row.path;return null;}
    const stage=cv.application?.phase;
    if(stage==='screening'||stage==='notice')return null;
    let action='';
    if(stage==='offer')action='accept';
    else if(!cv.qualified && !cv.training)action='enroll';
    else if((cv.portfolios?.[job.id]||0)<Math.min(3,job.samples+Number((cv.references?.[job.id]||0)<0)))action='portfolio';
    else if((cv.skills?.[job.secondary]||0)<job.secondMinimum)action='support';
    else if((cv.skills?.[job.skill]||0)+2*(cv.portfolios?.[job.id]||0)<job.requiredSkill+2*Number((cv.references?.[job.id]||0)<0))action='practice';
    else if(cv.qualified && !cv.missing?.length)action='apply';
    const choice=cv.choices.find(c=>c.id===action && c.available && (!c.targetId||c.targetId===job.id));
    if(!choice)return null;
    const result=careers.command(world,site,person.id,choice.id,job.id,cv.revision,undefined,self);
    if(!result?.ok)return null;
    person.row.path=job.id;
    const kind=['enroll','support','practice','portfolio'].includes(choice.id)?'learn':'apply';
    const reason=choice.id==='enroll'?'I chose evening study for '+job.label.toLowerCase()+' because it uses '+job.skill+'.':
      ['support','practice'].includes(choice.id)?'I want practice in '+(choice.id==='support'?job.secondary:job.skill)+' for the '+job.label.toLowerCase()+' role.':
      choice.id==='portfolio'?'I am preparing a work sample for '+job.employer+'.':
      choice.id==='accept'?'The '+job.label.toLowerCase()+' offer fits the work I have prepared for.':'I am preparing for '+job.label.toLowerCase()+' work at '+job.employer+'.';
    return line(world.week,kind,reason,workplace(job.venue,job.label));
  }
  function settle(site,world){
    if(!site || !int(world?.week,1,Number.MAX_SAFE_INTEGER) || site.autonomy?.week===world.week)return [];
    const roster=people(site),table=Object.create(null),all=roster.map(p=>candidate(site,world,p,table)),week=world.week;
    const offers=[],effects={},events=[];
    const offer=(self,kind,score,reason,venue,extra={})=>offers.push({self,kind,score,reason,venue,...extra});
    const openPaths=all.filter(p=>p.row.path && !p.row.proposed).length;
    const pantry=site.food<2*Math.ceil(site.population/5),gaps=root.EarthCareers?.coverage?.(site,world)||[];
    // Considering a real offer is a personal decision, not a request for an
    // outing. Several employers may answer in one week. Every consenting
    // applicant can decide in time, including someone who is resting.
    for(const p of all){
      const app=site.careers?.[p.id]?.application;
      if(p.row.path!==app?.targetId || !app?.autonomous || app.phase!=='offer' || p.id===controlled(site,world))continue;
      const decision=careerStep(world,site,p);if(!decision)continue;
      p.item=decision;p.free=false;
    }
    for(const self of all.filter(p=>p.free)){
      const {row,traits,wasAdvised:ask,profile}=self;
      if(ask==='rest'&&row.energy<6){self.item=line(week,'rest','After our conversation I decided to take a break.','bench');self.free=false;continue;}
      const recent=row.history.slice(0,2),repeat=kind=>recent.filter(h=>h.kind===kind).length*25;
      if(pantry)offer(self,'gather',85+traits.initiative/5+(profile.aptitudes?.stamina??50)/8-repeat('gather')+(ask==='help'?35:0),'The pantry has less than two weeks of meals. I can bring in one food.','garden');
      for(const gap of gaps)if(!gap.coverId&&gap.personId!==self.id){
        const oldVenue=workplace(root.EarthCareers?.catalog?.find(j=>j.label===gap.oldRole)?.venue,gap.oldRole),canCover=self.base.venue===oldVenue || traits.adaptability>=70;
        if(canCover)offer(self,'cover',85+traits.adaptability/5-repeat('cover')+(ask==='help'?35:0),'I can cover '+gap.oldRole+' while '+(identity(site,gap.personId)?.name||'my colleague')+' moves on.',oldVenue,{target:gap.personId,gap});
      }
      if(row.contact>=3 || ask==='connect'){
        let other=null,best=-1;
        for(const p of all)if(self!==p && p.free && (p.traits.sociability>=40 || p.row.contact>=4)){
          const score=friendScore(site,self,p,world);if(score>best){best=score;other=p;}
        }
        if(other)offer(self,'visit',44+traits.sociability/4+row.contact*5-repeat('visit')+(ask==='connect'?35:0),
          'I want to catch up with '+other.name+' after time apart.','bench',{partner:other,target:other.id});
      }
      if((row.proposed || week-site.founded>=2) && (row.path || ask==='learn' || traits.curiosity+traits.initiative>=120)){
        const recentCareer=row.history.some(h=>h.kind==='learn'||h.kind==='apply');
        if(row.path||!recentCareer&&openPaths<2)offer(self,'career',(row.proposed?132:row.path?87:39)+traits.curiosity/4-repeat('learn')/3+(ask==='learn'?40:0),'','hall');
      }
    }
    // Rotate equally suitable volunteers, including NPCs, rather than always
    // choosing the first named person in a settlement.
    const index=new Map(all.map((p,i)=>[p.id,i])),rank=p=>(index.get(p.id)+week)%Math.max(1,all.length);
    offers.sort((a,b)=>b.score-a.score||rank(a.self)-rank(b.self));
    let outings=0,careerTaken=false;const covered=new Set();
    for(const o of offers){
      const p=o.self;if(outings>=2)break;
      if(!p.free||o.partner&&!o.partner.free||o.kind==='gather'&&effects.food||o.kind==='cover'&&covered.has(o.target))continue;
      let chosen=line(week,o.kind,o.reason,o.venue,o.target);
      if(o.kind==='career'){
        if(careerTaken)continue;
        chosen=careerStep(world,site,p);if(!chosen)continue;careerTaken=true;
      }
      if(o.kind==='cover'){
        const map={farming:'food',food:'food',farm:'food',repair:'materials',repairs:'materials',trade:'funds',exchange:'funds'};
        const key=map[o.gap.occupation];
        const lost=key?-(root.EarthCareers?.weeklyAdjustment?.(site,world)?.[key]||0):0;
        if(lost>0&&!effects[key])effects[key]=1;covered.add(o.target);
      }
      if(o.kind==='gather')effects.food=1;
      if(o.partner){o.partner.item=line(week,'host','I agreed to spend some time with '+p.name+'.',o.venue,p.id);o.partner.free=false;}
      p.item=chosen;p.free=false;outings++;
      events.push(p.name+' · '+labels[chosen.kind]+'. '+chosen.reason);
    }
    for(const p of all){
      const row=p.row,kind=p.item.kind;
      if(kind!=='player'){
        row.energy=clamp(row.energy+(kind==='rest'?5:['visit','host'].includes(kind)?1:-1),8);
        row.contact=clamp(['visit','host'].includes(kind)?0:row.contact+1,8);
      }
      row.history.unshift(p.item);row.history.length=Math.min(4,row.history.length);row.revision++;
    }
    const d=data(site);d.people=table;d.week=week;d.effects=effects;
    return events;
  }
  function rates(site,world){return site.autonomy?.week===world?.week?{...site.autonomy.effects}:{};}
  function valid(site,week){
    const d=site.autonomy;if(d==null)return true;
    const allowed=id=>knownId(site,id);
    if(!dict(d)||!int(d.week,0,week)||!dict(d.people)||Object.keys(d.people).length>92||!dict(d.effects))return false;
    if(!Object.entries(d.effects).every(([k,v])=>['funds','food','materials'].includes(k)&&v===1) || Object.keys(d.effects).length>2)return false;
    return Object.entries(d.people).every(([id,r])=>allowed(id)&&dict(r)&&int(r.energy,0,8)&&int(r.contact,0,8)&&int(r.revision,0,Number.MAX_SAFE_INTEGER)&&
      (r.proposed==null || r.proposed===true&&typeof r.path==='string')&&
      (r.path==null || typeof r.path==='string'&&r.path.length>0&&r.path.length<80)&&
      (r.advice==null||dict(r.advice)&&has(adviceLabels,r.advice.action)&&typeof r.advice.accepted==='boolean'&&int(r.advice.week,1,week))&&
      Array.isArray(r.history)&&r.history.length<=4&&r.history.every((h,i)=>dict(h)&&int(h.week,1,d.week)&&(!i||h.week<r.history[i-1].week)&&has(labels,h.kind)&&
        typeof h.reason==='string'&&h.reason.length>0&&h.reason.length<=450&&venues.has(h.venue)&&(h.target==null||allowed(h.target)&&h.target!==id)));
  }
  root.EarthAutonomy=Object.freeze({people,settle,rates,valid,intent,view,history,guidance,command});
})(typeof window==='undefined'?globalThis:window);
