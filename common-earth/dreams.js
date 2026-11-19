/* Personal ambitions span many weekly decisions. Their requirements use the
   worker's own calendar, purse, qualifications and actual town facilities. */
(function(root){
  'use strict';

  function stage(activity,venue,axis,sessions,wait=0,conditions={}){
    return Object.freeze({activity,venue,axis,sessions,wait,...conditions});
  }

  const ambitions={
    balcony:{
      title:'Build a balcony outside my kitchen',
      quote:'When everyone has gone home, I would like a place where I can sit outside with one friend and watch the street.',
      community:'The builder leaves a measured drawing for neighbours who want to adapt their homes.',
      earned:'A kitchen balcony with room for two chairs',effect:['wellbeing',1],
      stages:[
        stage('Measure the kitchen doorway','home','numeracy',2),
        stage('Take a scale drawing to the housing meeting','hall','communication',2,1,{trust:40}),
        stage('Prepare the fittings at the workshop','workshop','craft',3,1,{fee:2,supplier:'the joiner',facility:'workshop'}),
        stage('Check the finished balcony with the joiner','home','craft',2,2)
      ]
    },
    skydive:{
      title:'Make my first tandem skydive',
      quote:'I spend most days tracing streets on foot. Just once, I want to recognise this place from the air and tell someone what it felt like.',
      community:'The club visit gives the town a first-hand account for its recreation group.',
      earned:'A first tandem jump with the regional club',effect:['wellbeing',1],
      stages:[
        stage('Compare club dates with my working rota','market','organisation',2),
        stage('Attend the visiting instructor’s briefing','hall','communication',2,1),
        stage('Book the tandem place with my savings','market','organisation',1,1,{fee:4,supplier:'the regional skydiving club'}),
        stage('Meet the club shuttle for the booked jump','market','stamina',1,2,{review:4})
      ]
    },
    space:{
      title:'Become a research astronaut',
      quote:'I keep imagining how our coastlines and cities look from orbit. I want to earn a crew place by doing research that someone else can reproduce.',
      community:'A trained researcher brings the work of the district into a regional space programme.',
      earned:'Completed a first orbital research assignment',effect:['trust',2],
      stages:[
        stage('Keep an observation and measurement journal','bench','numeracy',4),
        stage('Present field results from a specialist post','workshop','numeracy',6,12,{experience:104}),
        stage('Present my research to the crew selection panel','hall','communication',3,13,{review:13}),
        stage('Complete the regional crew training rotation','hall','organisation',12,104),
        stage('Report the orbital research results to the town','hall','communication',1,26)
      ]
    },
    ensemble:{
      title:'Play a whole set for people I know',
      quote:'I would like to get past the same awkward phrase and play an evening of music at a pace I can manage.',
      community:'Neighbours can hear a complete set at an open rehearsal.',
      earned:'A first complete neighbourhood performance',effect:['wellbeing',2],
      stages:[
        stage('Mark the difficult bars in my rehearsal book','home','music',2),
        stage('Rehearse one tune from beginning to end','bench','music',4,1),
        stage('Try the programme in the meeting room','hall','music',3,1),
        stage('Play the agreed set for the neighbourhood','hall','music',1,2)
      ]
    },
    orchard:{
      title:'Keep a fruit garden that outlives my first harvest',
      quote:'A basket feeds someone today. I would like the person who collects it in two years to know which tree it came from.',
      community:'The shared pantry receives two food from the first picking.',
      earned:'A fruit garden with its first harvest recorded',effect:['food',2],
      stages:[
        stage('Record the light and shelter at the beds','garden','care',3),
        stage('Order a suitable small fruit tree','market','organisation',1,1,{fee:2,supplier:'the nursery'}),
        stage('Tend the young planting through its first season','garden','care',5,8),
        stage('Weigh the first picking for the pantry','garden','numeracy',2,36)
      ]
    },
    archive:{
      title:'Open a listening room for neighbourhood stories',
      quote:'I have heard three versions of the same street’s history. I want each speaker to be able to recognise their own voice in the record.',
      community:'Residents gain a listening session with accounts from more than one household.',
      earned:'An oral-history listening room',effect:['trust',2],
      stages:[
        stage('Make an interview invitation in my own words','home','communication',2),
        stage('Collect accounts at neighbourhood listening sessions','bench','communication',4,1),
        stage('Return the transcripts for corrections','hall','care',2,2),
        stage('Open the first listening room','hall','organisation',1,3,{trust:40})
      ]
    },
    toolroom:{
      title:'Start a repair bench that neighbours can borrow',
      quote:'I want someone to be able to fix a broken drawer when the workshop is closed. Borrowing the right tool should be the easy part.',
      community:'Recovered fittings add two usable materials to community stores.',
      earned:'A lending bench with its first repaired tools',effect:['materials',2],
      stages:[
        stage('Record which tools neighbours borrow most','market','organisation',2),
        stage('Measure fittings for the lending bench','workshop','numeracy',2,1),
        stage('Refurbish a small set of shared tools','workshop','craft',3,2,{facility:'workshop'}),
        stage('Open the bench and return the recovered fittings','workshop','craft',1,2)
      ]
    },
    supper:{
      title:'Host a supper where late-shift workers can eat together',
      quote:'I know who misses the ordinary supper because they close the workshop. I want the last place at my table to be theirs.',
      community:'A late supper gives people on different shifts time to meet.',
      earned:'A recurring after-shift supper table',effect:['wellbeing',2],
      stages:[
        stage('Compare shift endings at the market','market','organisation',2),
        stage('Trial a small meal for people finishing late','garden','care',2,1),
        stage('Agree the collection rota with neighbours','hall','communication',2,2),
        stage('Lay the table after the last shift','home','care',1,1)
      ]
    },
    trail:{
      title:'Make a walking route a newcomer can follow alone',
      quote:'I remember getting lost here. I would like to leave someone a route with a rest stop exactly where they will want one.',
      community:'The neighbourhood has a checked walking route for new arrivals.',
      earned:'A tested neighbourhood walking guide',effect:['trust',1],
      stages:[
        stage('Walk the first survey circuit','bench','stamina',2),
        stage('Time the distance between resting places','bench','numeracy',3,1),
        stage('Revise the guide for a first-time visitor','hall','communication',2,2),
        stage('Leave the finished route in the exchange','market','organisation',1,1)
      ]
    }
  };
  const researchPosts=['engineer','mathematician','geneticist'];
  const pathways={
    balcony:['orchard','supper','toolroom'],skydive:['trail','archive','space'],space:['archive','toolroom','trail'],
    ensemble:['archive','supper','balcony'],orchard:['supper','toolroom','balcony'],archive:['ensemble','trail','supper'],
    toolroom:['balcony','space','trail'],supper:['orchard','archive','ensemble'],trail:['skydive','archive','orchard']
  };
  const keys=Object.keys(ambitions);
  for(const plan of Object.values(ambitions)){
    let prior=0;
    plan.before=Object.freeze(plan.stages.map(s=>{const previous=prior;prior+=s.sessions;return previous;}));
    plan.total=prior;
    Object.freeze(plan.stages);Object.freeze(plan.effect);Object.freeze(plan);
  }
  const plans=Object.freeze(ambitions);
  const memo=new WeakMap();
  const integer=(n,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const pick=(site,id)=>root.EarthPersonas?.profile(site,id);
  const record=(site,id)=>site.autonomy?.people?.[id]?.dream;
  function hash(text,value=2166136261){
    for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
    return value>>>0;
  }
  function preference(person){
    let result=memo.get(person);
    if(result)return result;
    const aptitude=person.aptitudes||{},traits=person.traits||{},role=(person.originRole||person.role||'').toLowerCase();
    const prefix=hash(person.name+'|'+person.home+'|'+person.originRole+'|');
    const bias=id=>hash(id,prefix)%27;
    const scores={
      balcony:(aptitude.craft||0)*.32+(traits.patience||0)*.18+(/carpenter/.test(role)?31:0),
      skydive:(aptitude.stamina||0)*.35+(traits.adaptability||0)*.32+(traits.initiative||0)*.14,
      space:(aptitude.numeracy||0)*.38+(traits.curiosity||0)*.32+(traits.patience||0)*.15,
      ensemble:(person.hobbyAxis==='music'?35:0)+(traits.sociability||0)*.22+(aptitude.music||0)*.22,
      orchard:(aptitude.care||0)*.34+(traits.patience||0)*.26+(/grower|seed keeper/.test(role)?25:0),
      archive:(aptitude.communication||0)*.32+(traits.curiosity||0)*.2+(traits.sociability||0)*.19,
      toolroom:(aptitude.craft||0)*.36+(traits.initiative||0)*.24+(/repairer|carpenter/.test(role)?16:0),
      supper:(aptitude.care||0)*.32+(traits.sociability||0)*.28+(/baker|cook/.test(role)?22:0),
      trail:(aptitude.stamina||0)*.33+(traits.curiosity||0)*.26+(/courier|porter/.test(role)?18:0)
    };
    // Someone can enjoy amateur music with a modest musical ceiling. A
    // research-flight ambition needs an attainable route into a research post.
    if(!root.EarthCareers?.catalog?.some(job=>researchPosts.includes(job.id)&&root.EarthCareers.fits?.(person,job)) ||
      (aptitude.numeracy??0)<64 || (traits.curiosity??0)<55)scores.space=-Infinity;
    let best=-Infinity;
    for(const id of keys){const score=scores[id]+bias(id);if(score>best){result=id;best=score;}}
    memo.set(person,result);return result;
  }
  function researchRoute(site,person){
    const current=site.careers?.[person.id]?.jobId;
    if(researchPosts.includes(current))return current;
    const candidates=(root.EarthCareers?.catalog||[]).filter(j=>researchPosts.includes(j.id)&&root.EarthCareers.fits(person,j));
    const ability=j=>(person.aptitudes?.[j.skill]||0)+(person.aptitudes?.[j.secondary]||0)/2;
    return candidates.sort((a,b)=>ability(b)-ability(a))[0]?.id||null;
  }
  function unmetPlace(site,stage){
    if(stage.trust!=null&&site.trust<stage.trust)return 'The neighbourhood meeting needs trust of '+stage.trust+' before it will support this change.';
    if(stage.facility&&!site.buildings?.some(b=>b.kind===stage.facility)&&!site.city?.precincts?.some(p=>p.use==='yard'))
      return 'A working '+stage.facility+' is needed. A neighbour can propose building one.';
    return '';
  }
  function view(site,world,id,person=pick(site,id),row=record(site,id)){
    if(!person||!world||!site)return null;
    const life=site.autonomy?.people?.[id];
    const next=life?.nextDream,planId=row?.id||(Object.hasOwn(plans,next)?next:Object.hasOwn(plans,person.ambitionId)?person.ambitionId:preference(person)),plan=plans[planId];if(!plan)return null;
    const position=row?.step||0,finished=position===plan.stages.length;
    const stage=plan.stages[finished?position-1:position],sessions=row?.sessions||0;
    const total=plan.total,progress=finished?total:plan.before[position]+sessions,blockers=[];
    const checkpoint=row?.checkpoint??site.founded??world.week;
    const wallet=site.purses?.people?.[id]?.balance||0;
    const fee=stage.fee&&sessions===0?stage.fee:0;
    const age=checkpoint+stage.wait;
    if(!finished){
      if(world.week<age)blockers.push('The next stage opens in week '+age+'.');
      const place=unmetPlace(site,stage);if(place)blockers.push(place);
      if(stage.experience){
        const career=site.careers?.[id];
        if(!researchPosts.includes(career?.jobId))blockers.push('The programme requires an engineering, mathematics or genetics post and two years doing the work.');
        else{
          const served=researchPosts.reduce((n,jobId)=>n+(root.EarthCareers?.serviceWeeks?.(world,site,id,jobId)||0),0);
          const remaining=stage.experience-served;
          if(remaining>0)blockers.push('The research panel needs '+remaining+' more full working weeks. The earliest review is week '+(world.week+remaining)+'.');
        }
      }
      if(stage.review&&world.week>=age){
        const offset=hash(person.name)%stage.review,until=(offset-world.week%stage.review+stage.review)%stage.review;
        if(until)blockers.push('The regional '+(planId==='space'?'selection panel':'club shuttle')+' returns in week '+(world.week+until)+'.');
      }
      if(fee>wallet)blockers.push('Save '+(fee-wallet)+' more personal fund'+(fee-wallet===1?'':'s')+' for '+stage.supplier+'.');
    }
    const gift=row?.support;
    const supportNote=gift?gift.name+' gave me '+gift.amount+' personal fund'+(gift.amount===1?'':'s')+' in week '+gift.week+
      (position>gift.step?' and I have since finished that stage.':'. I still choose when to take the next step.'):'';
    return {id:planId,title:plan.title,quote:plan.quote,reason:plan.quote,step:position,stages:plan.stages.length,progress,total,supportNote,
      progressText:finished?'Completed in week '+row.completedWeek:'Stage '+(position+1)+'/'+plan.stages.length+' · '+sessions+'/'+stage.sessions+' sessions',
      activity:stage.activity,axis:stage.axis,venue:stage.venue,fee,shortfall:Math.max(0,fee-wallet),supplier:stage.supplier||null,
      status:finished?'Achieved':blockers.length?'Waiting':row?'In progress':'Ready to begin',
      next:finished?plan.earned:blockers[0]||stage.activity,earned:finished?plan.earned:null,community:plan.community,
      onHold:life?.onHold?{title:plans[life.onHold.id].title,week:life.onHold.pausedWeek,where:life.onHold.place,
        reason:life.onHold.reason,retained:plans[life.onHold.id].before[life.onHold.step]+life.onHold.sessions}:null,
      achievements:(life?.achievements||[]).map(e=>({id:e.id,week:e.week,place:e.place,earned:plans[e.id].earned})),
      blockers,completedWeek:row?.completedWeek||null,researchRoute:planId==='space'&&stage.experience?researchRoute(site,person):null};
  }
  const money=n=>n+' personal fund'+(n===1?'':'s');
  const local=(site,p)=>p&&root.EarthCommunityLife?.present?.(site,p.id)!==false&&
    (!root.EarthCommunityLife?.residency||root.EarthCommunityLife.residency(site,p.id)==='member');
  function giftTerms(site,world,recipient,donor){
    const row=record(site,recipient.id),stage=plans[row?.id]?.stages[row.step];
    if(!row||!stage?.fee||row.sessions||row.support||donor.id===recipient.id||!local(site,recipient)||!local(site,donor))return null;
    const saved=site.purses?.people?.[recipient.id]?.balance||0,amount=stage.fee-saved;
    if(amount<1||!root.EarthPurses?.transferPerson)return null;
    const goal=view(site,world,recipient.id,recipient,row);
    const trust=root.EarthAutonomy?.bond?.(site,recipient.id,donor.id,world.week)||0;
    const traits=recipient.traits||{},minimum=(traits.sociability??50)<45||(traits.initiative??50)>78?2:1;
    const otherBlock=goal.blockers.length>1?goal.blockers[0]:'';
    const refusal=otherBlock?'Let’s wait on the money. '+otherBlock:
      trust<0?'I’d like us to keep an agreement together first. I don’t want money standing in for that.':
      trust<minimum?(minimum===2?'I’d rather cover it myself until we’ve done some work together.':'I would rather we got to know each other before money changes hands.'):'';
    const purse=site.purses?.people?.[donor.id]?.balance||0,own=record(site,donor.id);
    const reserved=plans[own?.id]?.stages.slice(own.step).find(s=>s.fee)?.fee||0;
    const buffer=Math.max(1,reserved),outgoing=donor.id==='steward'?'':purse-amount<buffer?
      (reserved?'I’m keeping '+money(buffer)+' for my own plan.':'I want to keep something for my own expenses.'):
      trust<2?'I haven’t decided to give my savings to someone I barely know.':'';
    return {row,stage,amount,saved,goal,trust,refusal,outgoing,purse,topic:'dream-gift:'+row.id+':'+row.step+':'+amount+':'+world.week};
  }
  function supportTopics(site,world,recipient,donor){
    if(!donor||world.activeId!==site.id||root.EarthCommunityLife?.isHome?.(world,site)===false)return [];
    const offer=giftTerms(site,world,recipient,donor);if(!offer)return [];
    const topics=[{id:'dream-help',label:'Would sharing the cost help?',context:true}];
    if(!offer.refusal&&offer.purse>=offer.amount)topics.push({id:offer.topic,label:
      (donor.id==='steward'?'Offer ':'Suggest '+donor.name+' give ')+money(offer.amount)+' toward '+offer.stage.supplier,context:true});
    return topics;
  }
  function acceptGift(site,world,recipient,donor,offer){
    if(offer.refusal||offer.outgoing)return null;
    const paid=root.EarthPurses.transferPerson(world,site,donor.id,recipient.id,offer.amount,'Help with “'+offer.goal.title+'”');
    if(!paid?.ok)return paid;
    offer.row.support={week:world.week,step:offer.row.step,amount:offer.amount,name:donor.name,
      donorId:donor.id,donorKey:donor.identityKey||root.EarthPersonas?.profile(site,donor.id)?.identityKey,siteId:site.id};
    root.EarthAutonomy?.remember?.(site,world.week,donor.id,recipient.id,'support');
    return {ok:true,changed:true,message:donor.name+' gave '+recipient.name+' '+money(offer.amount)+' toward '+offer.stage.supplier+
      '. '+recipient.name+' keeps the money in their own purse and decides when to book.'};
  }
  function discussSupport(site,world,recipient,donor,topic,meeting){
    const topics=supportTopics(site,world,recipient,donor);
    if(!topics.some(t=>t.id===topic)||meeting?.mode!=='walk'||meeting.siteId!==site.id||meeting.actor!==donor.id||
      meeting.target!==recipient.id||donor.id!==root.EarthAgency.actorId(site)||
      ![meeting.x,meeting.y,meeting.tx,meeting.ty].every(Number.isFinite)||Math.hypot(meeting.x-meeting.tx,meeting.y-meeting.ty)>1.56)
      return {ok:false,message:'Meet the resident again to check which stage and contribution they are considering.'};
    const offer=giftTerms(site,world,recipient,donor);
    const quote=(person,words)=>({ok:true,message:person.name+' · “'+words+'”'});
    if(topic==='dream-help')return quote(recipient,offer.refusal||('I’ve saved '+money(offer.saved)+'. '+offer.stage.supplier[0].toUpperCase()+
      offer.stage.supplier.slice(1)+' asks for '+offer.stage.fee+'. I’d welcome help with the remaining '+offer.amount+', if I can decide when I’m ready.'));
    if(offer.outgoing)return quote(donor,offer.outgoing);
    return acceptGift(site,world,recipient,donor,offer)||{ok:false,message:'That contribution is no longer available.'};
  }
  function considerSupport(site,world){
    const accounts=site.purses?.people,lives=site.autonomy?.people;
    if(!world.communityLife||!accounts||!lives||!root.EarthPurses?.transferPerson)return '';
    const controlled=world.activeId===site.id?root.EarthAgency?.actorId?.(site):null,free=id=>id!==controlled&&id!=='steward';
    for(const [id,life] of Object.entries(lives)){
      const row=life.dream,stage=plans[row?.id]?.stages[row.step];
      if(!stage?.fee||row.sessions||row.support||!free(id)||!life.ties?.some(t=>t.strength>=3)||(accounts[id]?.balance||0)>=stage.fee)continue;
      const recipient=pick(site,id);if(!local(site,recipient))continue;
      // Ask someone this person actually knows locally. No civic appropriation
      // or gift from an absent original character is part of this decision.
      for(const peer of root.EarthAutonomy?.contacts?.(site,id,world.week)||[]){
        if(peer.strength<3||!peer.here||!free(peer.id)||!accounts[peer.id]?.balance)continue;
        const donor=pick(site,peer.id);if(!local(site,donor))continue;
        const offer=giftTerms(site,world,recipient,donor);
        if(offer&&!offer.refusal&&!offer.outgoing&&offer.purse>=offer.amount){
          const result=acceptGift(site,world,recipient,donor,offer);if(result?.ok)return result.message;
        }
      }
    }
    return '';
  }
  function supportLink(site,id){
    const row=record(site,id),gift=row?.support;if(!gift)return null;
    let donor=gift.siteId===site.id&&gift.donorId&&pick(site,gift.donorId);
    if(!donor||!gift.donorKey||donor.identityKey!==gift.donorKey||!local(site,donor))
      donor=gift.donorKey&&(root.EarthPersonas?.list(site)||[]).find(p=>p.identityKey===gift.donorKey&&local(site,p));
    return {from:donor?.id||null,to:id,fromName:gift.name,amount:gift.amount,week:gift.week,title:plans[row.id].title,
      detail:gift.name+' contributed '+money(gift.amount)+' toward '+plans[row.id].stages[gift.step].supplier+' in week '+gift.week+'.'};
  }
  function work(site,world,person,life){
    const goal=view(site,world,person.id,person,life.dream);
    if(!goal||goal.earned||goal.blockers.length||life.dream?.last===world.week)return null;
    if(!root.EarthCareers?.hobbyPractice?.(world,site,person.id,goal.axis,false).ok)return null;
    // All mutable operations below are synchronous. Recheck the binding quote
    // before recording a session or awarding the one-time result.
    if(goal.fee&&!root.EarthPurses?.dreamExpense?.(world,site,person.id,goal.fee,goal.supplier))return null;
    const practice=root.EarthCareers.hobbyPractice(world,site,person.id,goal.axis,true);
    const row=life.dream||={id:goal.id,step:0,sessions:0,started:world.week,checkpoint:world.week,last:world.week};
    delete life.nextDream;
    row.sessions++;row.last=world.week;
    const plan=plans[goal.id],stage=plan.stages[row.step],complete=row.sessions===stage.sessions;
    if(complete){row.step++;row.sessions=0;row.checkpoint=world.week;}
    const finished=row.step===plan.stages.length;
    let outcome='';
    if(finished){
      row.completedWeek=world.week;
      preserveAchievement(site,person,life);
      const [metric,amount]=plan.effect;
      const ceiling=['trust','wellbeing'].includes(metric)?100:Number.MAX_SAFE_INTEGER;
      const before=site[metric]||0;site[metric]=Math.min(ceiling,before+amount);
      outcome=plan.earned+'. '+plan.community+' '+metric+' +'+(site[metric]-before)+'.';
    }
    const detail=stage.activity+'. '+(goal.fee?'Paid '+goal.fee+' personal funds to '+goal.supplier+'. ':'')+
      (outcome|| (practice.gain?'Gained '+practice.gain+' '+goal.axis+'. ':'')+
      (complete?'Completed stage '+row.step+' of '+plan.stages.length+'.':'Session '+row.sessions+' of '+stage.sessions+'.'));
    const item={week:world.week,kind:'dream',dreamId:goal.id,goal:goal.title,title:goal.activity,activity:goal.activity,
      axis:goal.axis,step:goal.step+1,total:plan.stages.length,reason:detail.slice(0,450),venue:goal.venue,target:null};
    return {item,outcome:outcome?person.name+' · '+outcome:null,message:person.name+' · '+detail};
  }
  function preserveAchievement(site,p,life){
    const done=life.dream;
    if(!done?.completedWeek)return;
    const records=life.achievements||=[];
    if(!records.some(e=>e.id===done.id))records.push({id:done.id,week:done.completedWeek,place:site.name,siteId:site.id});
    const book=site.autonomy||={week:0,people:{},effects:{}},places=book.landmarks||=[];
    // The original place keeps its own history after its maker moves. A
    // second person using the same house does not erase its original maker.
    if(!places.some(e=>e.id===done.id&&e.personId===p.id))
      places.push({id:done.id,personId:p.id,name:p.name,week:done.completedWeek});
  }
  function landmarks(site){
    const records=site?.autonomy?.landmarks;
    let projected=records;
    if(!projected){
      projected=[];
      for(const [id,life] of Object.entries(site?.autonomy?.people||{})){
        const done=life.dream;
        if(!done?.completedWeek||!Object.hasOwn(plans,done.id))continue;
        const achievement=life.achievements?.find(e=>e.id===done.id);
        if(achievement&&achievement.siteId!==site.id)continue;
        const owner=pick(site,id);if(owner)projected.push({id:done.id,personId:id,name:owner.name,week:done.completedWeek});
      }
    }
    return projected.map(e=>{
      const plan=plans[e.id];
      return {...e,title:plan.title,earned:plan.earned,venue:plan.stages.at(-1).venue};
    });
  }
  function nextPlans(site,world,p,life){
    const current=life?.dream;if(!current)return [];
    const traits=p.traits||{},finished=current.completedWeek,parked=life.onHold;
    const rest=current.id==='space'?26:traits.adaptability>=70?8:traits.patience>=70?20:13;
    if(finished){
      if(world.week<finished+rest)return [];
    }else{
      const stage=plans[current.id].stages[current.step],patience=13+Math.floor((traits.patience??50)/4);
      if(world.week<current.last+patience || !unmetPlace(site,stage))return [];
    }
    if(parked){
      const plan=plans[parked.id];
      if(!unmetPlace(site,plan.stages[parked.step])){
        return [{id:parked.id,title:plan.title,quote:'The obstacle has cleared. I can return to the stages I already earned.',mode:'resume'}];
      }
      if(!finished)return [];
    }
    const past=new Set((life.achievements||[]).map(e=>e.id));past.add(current.id);
    if(parked)past.add(parked.id);
    const options=pathways[current.id].filter(id=>!past.has(id));
    if(p.hobbyAxis==='music'&&!past.has('ensemble')&&!options.includes('ensemble'))options.push('ensemble');
    // Prefer natural follow-ups. A stalled permission or inaccessible
    // workplace also makes a feasible independent pastime worth exploring.
    if(!finished||parked)for(const id of ['ensemble','trail','supper']){
      if(!past.has(id)&&!options.includes(id))options.push(id);
    }
    const skills=site.careers?.[p.id]?.skills||{},applicants=[];
    for(const id of options){
      if(id==='space' && (!(p.aptitudes?.numeracy>=64||skills.numeracy>=64)||(traits.curiosity??0)<55||!researchRoute(site,p)))continue;
      const plan=plans[id];
      if(plan.stages.some(s=>unmetPlace(site,s)))continue;
      const personalFit=plan.stages.reduce((n,s)=>n+(skills[s.axis]??p.aptitudes?.[s.axis]??40),0)/plan.stages.length;
      const need=id==='orchard'&&site.food<2*Math.ceil(site.population/5)?15:id==='toolroom'&&site.materials<5?12:0;
      const variation=hash(p.name+'|'+current.id+'|'+id)%13;
      applicants.push({id,title:plan.title,quote:plan.quote,score:personalFit+need+variation,mode:finished?'new':'postpone'});
    }
    return applicants.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,2);
  }
  function chooseNext(site,world,p,life,id){
    const next=nextPlans(site,world,p,life).find(row=>row.id===id);
    if(!next)return false;
    if(life.dream.completedWeek && !life.achievements?.some(e=>e.id===life.dream.id))preserveAchievement(site,p,life);
    if(next.mode==='resume'){
      const {pausedWeek,place,reason,...progress}=life.onHold;
      if(life.dream.completedWeek)delete life.onHold;
      else life.onHold={...life.dream,pausedWeek:world.week,place:site.name,reason:unmetPlace(site,plans[life.dream.id].stages[life.dream.step])};
      life.dream=progress;delete life.nextDream;
      return true;
    }
    if(next.mode==='postpone'){
      const stage=plans[life.dream.id].stages[life.dream.step];
      life.onHold={...life.dream,pausedWeek:world.week,place:site.name,reason:unmetPlace(site,stage)};
    }
    life.nextDream=next.id;delete life.dream;
    return true;
  }
  function validHistory(life,week){
    const parked=life.onHold;
    if(parked!==undefined && (!valid(parked,week)||parked.completedWeek||!integer(parked.pausedWeek,parked.last,week)||
      typeof parked.place!=='string'||!parked.place.length||parked.place.length>512||
      typeof parked.reason!=='string'||!parked.reason.length||parked.reason.length>300||parked.id===life.dream?.id||parked.id===life.nextDream))return false;
    if(life.nextDream!==undefined && (life.dream||!Object.hasOwn(plans,life.nextDream)))return false;
    if(life.achievements===undefined)return life.nextDream===undefined||!!parked;
    return Array.isArray(life.achievements)&&life.achievements.length<=keys.length&&
      new Set(life.achievements.map(e=>e?.id)).size===life.achievements.length&&life.achievements.every((e,i)=>e&&Object.hasOwn(plans,e.id)&&
      integer(e.week,1,week)&&(!i||e.week>life.achievements[i-1].week)&&typeof e.place==='string'&&e.place.length>0&&e.place.length<=512&&
      typeof e.siteId==='string'&&e.siteId.length>0&&e.siteId.length<=512&&e.id!==life.nextDream&&e.id!==parked?.id);
  }
  function validPlaces(site,week){
    const rows=site.autonomy?.landmarks;if(rows===undefined)return true;
    if(!Array.isArray(rows)||rows.length>34*keys.length)return false;
    const used=new Set();
    return rows.every(entry=>{
      if(!entry||!Object.hasOwn(plans,entry.id)||!integer(entry.week,1,week)||typeof entry.name!=='string'||!entry.name.length||entry.name.length>128||
        typeof entry.personId!=='string'||!pick(site,entry.personId))return false;
      const key=entry.personId+'/'+entry.id;if(used.has(key))return false;
      used.add(key);return true;
    });
  }
  function valid(row,week){
    if(!row||typeof row!=='object'||!Object.hasOwn(plans,row.id))return false;
    const plan=plans[row.id];
    if(!integer(row.started,1,week)||!integer(row.checkpoint,row.started,week)||!integer(row.last,row.checkpoint,week)||
      !integer(row.step,0,plan.stages.length))return false;
    if(row.support!==undefined){
      const gift=row.support,fee=plan.stages[gift?.step]?.fee;
      if(!gift||!fee||!integer(gift.step,0,row.step)||!integer(gift.week,row.started,week)||!integer(gift.amount,1,fee)||
        typeof gift.name!=='string'||!gift.name.trim()||gift.name.length>128)return false;
      if(gift.donorId!==undefined||gift.donorKey!==undefined||gift.siteId!==undefined){
        if(typeof gift.donorId!=='string'||!gift.donorId.length||gift.donorId.length>512||
          gift.donorKey!==undefined&&(typeof gift.donorKey!=='string'||!gift.donorKey.length||gift.donorKey.length>1040)||
          typeof gift.siteId!=='string'||!gift.siteId.length||gift.siteId.length>512)return false;
      }
    }
    let earliest=row.started;
    for(let i=0;i<row.step;i++){
      const stage=plan.stages[i];
      earliest+=(i?Math.max(1,stage.wait):0)+stage.sessions-1;
    }
    if(row.checkpoint<earliest)return false;
    if(row.step===plan.stages.length)return row.completedWeek===row.last&&row.checkpoint===row.last&&row.sessions===0;
    const stage=plan.stages[row.step];
    if(row.completedWeek!=null||!integer(row.sessions,row.step?0:1,stage.sessions-1))return false;
    if(!row.step && row.checkpoint!==row.started)return false;
    if(!row.sessions)return row.last===row.checkpoint;
    return row.last>=row.checkpoint+(row.step?Math.max(1,stage.wait):0)+row.sessions-1;
  }
  function validIntent(item){
    const plan=Object.hasOwn(plans,item.dreamId)?plans[item.dreamId]:null,s=plan?.stages[item.step-1];
    return !!s&&integer(item.step,1,plan.stages.length)&&item.total===plan.stages.length&&item.venue===s.venue&&item.axis===s.axis&&
      item.activity===s.activity&&item.title===s.activity&&item.goal===plan.title;
  }
  root.EarthDreams=Object.freeze({preference,view,work,landmarks,nextPlans,chooseNext,supportTopics,discussSupport,considerSupport,supportLink,valid,validHistory,validPlaces,validIntent});
})(typeof window==='undefined'?globalThis:window);
