/* These employers and calendars belong to the game. A person's existing job
   continues through education, screening and notice, including for old saves. */
(function(root){
  'use strict';
  const axes=['numeracy','music','communication','care','craft','stamina','organisation'];
  const replacementGoods={food:'food',repair:'materials',exchange:'funds'};
  function job(id,label,employer,skill,requiredSkill,secondary,secondMinimum,trainingWeeks,samples,occupation,venue,metric,interval,service){
    return Object.freeze({id,label,employer,skill,requiredSkill,secondary,secondMinimum,trainingWeeks,samples,occupation,venue,metric,interval,service});
  }
  const catalog=Object.freeze([
    job('gardener','Gardener','Parks cooperative','craft',44,'stamina',35,10,0,'food','garden','food',2,'Grow seedlings for the pantry.'),
    job('refuse','Refuse collector','Sanitation crew','stamina',44,'organisation',30,3,0,'repair','pier','wellbeing',3,'Keep shared streets clean.'),
    job('nurse','Nurse','Community clinic','care',72,'organisation',55,156,2,'exchange','hall','wellbeing',2,'Staff the community clinic.'),
    job('police','Police officer','Neighbourhood public service','communication',66,'stamina',58,78,2,'exchange','hall','trust',4,'Attend local concerns and mediate disputes.'),
    job('mathematician','Mathematician','Applied mathematics institute','numeracy',86,'organisation',58,208,3,'repair','workshop','materials',3,'Improve estimates and reduce wasted materials.'),
    job('engineer','Engineer','Public works studio','craft',76,'numeracy',65,182,2,'repair','workshop','materials',2,'Improve the maintenance of public works.'),
    job('geneticist','Geneticist','Natural history institute','numeracy',82,'organisation',68,208,3,'food','garden','food',3,'Maintain the district’s seed records.'),
    job('musician','Musician','Town ensemble','music',80,'communication',46,78,3,'exchange','hall','wellbeing',3,'Perform community concerts.'),
    job('teacher','High-school teacher','District secondary school','communication',72,'organisation',55,156,2,'exchange','hall','trust',3,'Teach the next generation.'),
    job('cook','Cook','Community kitchen','care',47,'organisation',38,16,1,'food','garden','food',2,'Prepare food for shared meals.'),
    job('baker','Baker','Town bakery','craft',48,'organisation',36,16,1,'food','market','food',2,'Bake for neighbourhood kitchens.'),
    job('carpenter','Carpenter','Carpenters’ workshop','craft',60,'numeracy',41,52,1,'repair','workshop','materials',2,'Make durable fittings for public buildings.'),
    job('driver','Co-op delivery driver','Transport cooperative','organisation',48,'stamina',36,10,0,'exchange','market','funds',2,'Deliver co-op orders between neighbourhoods.'),
    job('courier','Foot courier','District exchange','stamina',40,'organisation',32,3,0,'exchange','pier','funds',2,'Carry orders between workplaces.'),
    job('trader','Market trader','Market exchange','communication',48,'numeracy',38,12,1,'exchange','market','funds',2,'Arrange paid market bookings.'),
    job('grower','Grower','Food cooperative','care',43,'stamina',34,8,0,'food','garden','food',2,'Grow produce for shared stores.'),
    job('repairer','Repairer','Repair cooperative','craft',52,'organisation',35,26,1,'repair','workshop','materials',2,'Repair tools and reclaim usable parts.'),
    job('convenor','Convenor','Community assembly','communication',50,'organisation',42,18,1,'exchange','hall','trust',3,'Bring neighbours together for decisions.'),
    job('surveyor','Building surveyor','District survey office','numeracy',68,'craft',55,104,2,'repair','workshop','materials',3,'Measure proposed repairs before the workshop orders materials.'),
    job('practice-nurse','Practice nurse','Neighbourhood practice','care',72,'organisation',55,156,2,'exchange','hall','wellbeing',3,'Coordinate neighbourhood follow-up visits and community care.')
  ]);
  const jobs=Object.fromEntries(catalog.map(j=>[j.id,j]));
  // A disposition changes how appealing a working day feels. It never counts
  // toward a qualification or limits what a player can learn.
  const workStyles={
    gardener:['patience',true,'tending the same beds through a season'],
    refuse:['patience',true,'keeping a collection round dependable'],
    nurse:['adaptability',true,'adjusting the clinic round when a household needs help'],
    police:['sociability',true,'hearing both neighbours out in person'],
    mathematician:['sociability',false,'working through an estimate in quiet'],
    engineer:['curiosity',true,'testing a different repair when the first one fails'],
    geneticist:['patience',true,'following a seed trial across several plantings'],
    musician:['adaptability',true,'adjusting a phrase to the rest of the ensemble'],
    teacher:['sociability',true,'working out an explanation with a roomful of learners'],
    cook:['initiative',true,'finding a meal that uses what comes in today'],
    baker:['adaptability',false,'keeping the order of a familiar morning bake'],
    carpenter:['patience',true,'working a joint until both pieces fit'],
    driver:['initiative',true,'rerouting a collection when a delivery changes'],
    courier:['sociability',false,'walking the stretches between calls alone'],
    trader:['sociability',true,'negotiating with different buyers across the counter'],
    grower:['curiosity',true,'trying a new planting alongside a familiar crop'],
    repairer:['curiosity',true,'tracing a fault back to its cause'],
    convenor:['sociability',true,'bringing different households into a decision'],
    surveyor:['patience',true,'checking a site measurement before anyone orders timber'],
    'practice-nurse':['patience',true,'following a household through successive visits']
  };
  // Fictional employers recognise a limited amount of supervised work in a
  // related trade. Every change still has its own assessment and notice.
  const relatedTrades={
    gardener:['grower'], grower:['gardener'], refuse:['driver','courier'],
    driver:['courier','refuse'], courier:['driver','refuse'], cook:['baker'], baker:['cook'],
    carpenter:['repairer','surveyor'], repairer:['carpenter','engineer'],
    engineer:['surveyor','mathematician','carpenter','repairer'],
    surveyor:['engineer','carpenter','mathematician'], mathematician:['engineer','surveyor'],
    teacher:['mathematician','musician','convenor'], convenor:['teacher','police'],
    geneticist:['mathematician','grower']
  };
  const jobLabels=new Map(catalog.map(j=>[j.label,j.id]));
  const nursingPosts=['nurse','practice-nurse'];
  const get=(map,key)=>map&&Object.hasOwn(map,key)?map[key]:undefined;
  const int=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const record=x=>x!=null&&typeof x==='object'&&!Array.isArray(x);
  const label=x=>typeof x==='string'&&x.length>0&&x.length<=512;
  const safeId=id=>label(id)&&!['__proto__','constructor','prototype'].includes(id);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const title=axis=>axis[0].toUpperCase()+axis.slice(1);
  const fail=message=>({ok:false,message});
  function profile(site,id){
    if(!site||!safeId(id))return null;
    if(root.EarthPersonas)return root.EarthPersonas.profile(site,id);
    return root.EarthAgency?.identity(site,id)||site.residents?.find(r=>r.id===id)||null;
  }
  const residentHere=(site,id)=>root.EarthCommunityLife?.present?.(site,id)!==false && root.EarthCommunityLife?.residency?.(site,id)!=='visitor';
  const people=site=>(root.EarthPersonas?.list(site)||site.residents||[]).filter(p=>residentHere(site,p.id));
  function origin(p){
    const desc=p.originRole||p.role||'Neighbour';
    const matches=catalog.find(j=>j.label.toLowerCase()===desc.toLowerCase());
    if(matches)return matches;
    const base=/seed|grow|pantry/i.test(desc)?jobs.grower:/repair|carpenter/i.test(desc)?jobs.repairer:
      /courier|porter/i.test(desc)?jobs.courier:/trad/i.test(desc)?jobs.trader:jobs.convenor;
    // An original stewardship, seed library or porter post is its own job.
    return {...base,id:'origin',label:desc,employer:base===jobs.convenor?'Founding assembly':base.employer};
  }
  const memory=(site,id)=>get(site?.careers,id);
  const role=(site,id)=>get(jobs,memory(site,id)?.jobId)?.label||null;
  function work(site,id){
    const m=memory(site,id),j=get(jobs,m?.jobId);
    if(!j)return null;
    const assignment=root.EarthPersonas?.dutiesFor?.(j.id)?.[m.dutyIndex];
    return {id:j.id,role:j.label,label:j.label,employer:j.employer,venue:j.venue,occupation:j.occupation,service:j.service,...(assignment?{assignment}:{})};
  }
  const state=(site,id)=>memory(site,id)||{};
  function employment(site,p,m){
    const appointment=get(jobs,m.jobId);if(appointment)return appointment;
    const prior=origin(p),guest=site.communityLife?.people?.[p.id];
    if(!guest||guest.status==='anchor'||guest.originId===site.id)return prior;
    // Previous credentials travel. A district employer hires separately, even
    // when the visitor brings precisely the trade the new district needs.
    return {...prior,id:'origin',label:p.role||prior.label,employer:'Independent neighbourhood rounds'};
  }
  function chooseDuty(site,world,p,m,j){
    const options=root.EarthPersonas?.dutiesFor?.(j.id);if(!options)return;
    const staffing=options.map(()=>0);
    for(const colleague of people(site)){
      if(colleague.id===p.id)continue;
      const other=state(site,colleague.id);
      if(other.application?.phase==='notice'&&other.application.dueWeek<=world.week||employment(site,colleague,other).id!==j.id)continue;
      const index=other.jobId===j.id?other.dutyIndex:options.findIndex(v=>v.label===colleague.workFocus?.label);
      if(Number.isInteger(index)&&index>=0&&index<staffing.length)staffing[index]++;
    }
    let best=0;
    for(let index=1;index<options.length;index++){
      if(staffing[index]<staffing[best]||staffing[index]===staffing[best]&&skill(p,m,options[index].axis)>skill(p,m,options[best].axis))best=index;
    }
    m.dutyIndex=best;return options[best];
  }
  function ensure(site,id){
    const book=site.careers??={};
    return book[id]??={revision:0,skills:{},qualifications:{},portfolios:{},references:{},history:[]};
  }
  function note(m,week,text){
    m.history.unshift({week,text:text.slice(0,512)});m.history.length=Math.min(m.history.length,10);
  }
  const fixedRanges=new WeakMap(),fullRange=Object.freeze({min:0,max:100});
  function bounds(p,axis){
    const b=p.bounds?.[axis];if(!b||typeof b!=='object')return fullRange;
    const cached=fixedRanges.get(b);if(cached)return cached;
    const min=int(b.min,0,100)?b.min:0,max=int(b.max,min,100)?b.max:100;
    if(Object.isFrozen(b)){
      const range=min===b.min&&max===b.max?b:Object.freeze({min,max});
      fixedRanges.set(b,range);return range;
    }
    return {min,max};
  }
  function aptitude(p,axis){
    const b=bounds(p,axis);
    return clamp(p.aptitudes?.[axis]??40,b.min,b.max);
  }
  function skill(p,m,axis){
    const b=bounds(p,axis);
    return clamp(get(m.skills,axis)??p.aptitudes?.[axis]??40,b.min,b.max);
  }
  function gain(p,m,axis,amount){
    const old=skill(p,m,axis),next=clamp(old+amount,old,bounds(p,axis).max);
    if(next!==old)m.skills[axis]=next;
    return next-old;
  }
  function projectLesson(world,site,mentorId,learnerId,axis,commit=false,amount=2){
    const tutor=profile(site,mentorId),pupil=profile(site,learnerId),week=world.week;
    if(!tutor||!pupil||mentorId===learnerId||!axes.includes(axis))return {ok:false,reason:'Find a mentor and a learner with a shared subject.'};
    const teacher=state(site,mentorId),student=state(site,learnerId),at=skill(pupil,student,axis),teaches=skill(tutor,teacher,axis);
    if(teacher.lastPracticeWeek===week||student.lastPracticeWeek===week||root.EarthAutonomy?.sessionSpent?.(site,mentorId,week)||root.EarthAutonomy?.sessionSpent?.(site,learnerId,week)||specialistShift(site,mentorId,week)||specialistShift(site,learnerId,week)||root.EarthPurses?.committed?.(site,mentorId,week)||root.EarthPurses?.committed?.(site,learnerId,week))return {ok:false,reason:'One of us already used this week’s personal practice session.'};
    if(at>=bounds(pupil,axis).max||teaches-at<4)return {ok:false,reason:'This learner needs a different subject or a more experienced mentor.'};
    if(!commit)return {ok:true};
    const m=ensure(site,mentorId),s=ensure(site,learnerId),raised=gain(pupil,s,axis,Math.min(amount,teaches-at,3));
    m.lastTeachingWeek=week;m.lastPracticeWeek=week;s.lastPracticeWeek=week;
    gain(tutor,m,'communication',1);
    note(m,week,'Taught '+pupil.name+' '+axis+' during a practical demonstration.');
    note(s,week,'Gained '+raised+' '+axis+' through a practical demonstration with '+tutor.name+'.');
    m.revision++;s.revision++;root.EarthAutonomy?.remember?.(site,week,mentorId,learnerId,'lesson');
    return {ok:true,gain:raised};
  }
  function hobbyPractice(world,site,id,axis,commit=false,witness=null){
    const p=profile(site,id),week=world.week;
    if(!p||!axes.includes(axis))return {ok:false,reason:'Choose an interest that belongs to this person.'};
    if(state(site,id).lastPracticeWeek===week||root.EarthAutonomy?.sessionSpent?.(site,id,week)||specialistShift(site,id,week)||root.EarthPurses?.committed?.(site,id,week))return {ok:false,reason:'This week’s personal practice session is already used.'};
    if(!commit)return {ok:true};
    const m=ensure(site,id),other=witness&&profile(site,witness);
    const instrument=axis==='music'&&root.EarthResidentShops?.instrument?.(site,id);
    const raised=gain(p,m,axis,(other?2:1)+(instrument?1:0));
    m.lastPracticeWeek=week;m.revision++;
    note(m,week,'Practised '+axis+(instrument?' on the '+instrument:'')+(other?' with feedback from '+other.name:' independently')+
      (raised?' and gained '+raised+' skill point'+(raised===1?'':'s')+'.':'. The session was for enjoyment at the current skill ceiling.'));
    return {ok:true,gain:raised};
  }
  function practicedGain(p,m,axis){
    const room=bounds(p,axis).max-skill(p,m,axis);
    return Math.min(room,clamp(Math.ceil(room/15),1,4));
  }
  const samples=(m,j)=>get(m.portfolios,j.id)||0;
  const clinicalPractice=(p,m)=>nursingPosts.includes(m.jobId)||nursingPosts.includes(origin(p).id)||nursingPosts.some(id=>get(m.experience,id)>0);
  function qualified(p,m,j){
    const trained=id=>Boolean(get(m.qualifications,id)||p.qualificationIds?.includes(id));
    const birth=origin(p).id;
    if(nursingPosts.includes(j.id))return nursingPosts.some(id=>id===birth||m.jobId===id||trained(id));
    return birth===j.id||trained(j.id);
  }
  function employerReference(p,m,j){
    if(get(m.references,j.id)!=null)return {jobId:j.id,quality:m.references[j.id],employer:j.employer,occupation:j.occupation};
    if(!m.latestReference)return null;
    const source=get(jobs,m.latestReference.jobId)||origin(p);
    return {...m.latestReference,occupation:source.occupation};
  }
  function screening(p,m,j){
    const portfolio=samples(m,j),ref=employerReference(p,m,j)?.quality||0;
    const evidence=Math.min(portfolio*2,6);
    const missing=[];
    if(!qualified(p,m,j))missing.push('complete '+j.trainingWeeks+' course credits');
    if(skill(p,m,j.skill)+evidence<j.requiredSkill)missing.push(title(j.skill)+' '+j.requiredSkill+' (samples can demonstrate up to 6 points)');
    if(skill(p,m,j.secondary)<j.secondMinimum)missing.push(title(j.secondary)+' '+j.secondMinimum);
    const evidenceNeeded=clamp(j.samples+(ref<0?1:ref===2?-1:0),j.samples>0?1:0,3);
    if(portfolio<evidenceNeeded)missing.push(evidenceNeeded+' work '+(evidenceNeeded===1?'sample':'samples')+' ('+portfolio+' ready)');
    if(ref<0 && skill(p,m,j.skill)+evidence<j.requiredSkill+2)missing.push('stronger evidence after the previous rushed departure');
    return missing;
  }
  function canCoverPost(site,id,jobId){
    const p=profile(site,id),j=get(jobs,jobId),m=state(site,id);
    if(!p||!j||!residentHere(site,id))return false;
    if(requiresCredential(j.id)){
      const workSamples=nursingPosts.includes(j.id)?Math.max(...nursingPosts.map(id=>get(m.portfolios,id)||0)):samples(m,j);
      return (m.jobId===j.id||qualified(p,m,j))&&skill(p,m,j.skill)+2*workSamples>=j.requiredSkill&&skill(p,m,j.secondary)>=j.secondMinimum;
    }
    return skill(p,m,j.skill)>=Math.min(55,j.requiredSkill)&&skill(p,m,j.secondary)>=j.secondMinimum;
  }
  function departureForMove(world,site,id){
    const p=profile(site,id),m=state(site,id);if(!p||!root.EarthEmployers)return;
    const guest=root.EarthCommunityLife?.profile?.(site,id);
    const nativeHousehold=site.communityLife?.people?.[id]?.householdRole;
    if(guest&&guest.kind!=='steward'&&!nativeHousehold&&!m.jobId)return;
    root.EarthEmployers.open(world,site,p,get(jobs,m.jobId)||origin(p),!!m.jobId);
  }
  function canFit(p,j){
    return bounds(p,j.skill).max+6>=j.requiredSkill && bounds(p,j.secondary).max>=j.secondMinimum;
  }
  function recognisedStudy(world,site,p,m,j){
    let best=null;
    for(const id of relatedTrades[j.id]||[]){
      const served=serviceWeeks(world,site,p.id,id);
      if(served<8||!qualified(p,m,jobs[id]))continue;
      const credits=Math.min(Math.floor(j.trainingWeeks/4),Math.floor(served/2));
      if(credits>0&&(!best||credits>best.credits))best={sourceId:id,credits};
    }
    return best;
  }
  function outlook(world,site,p,m,j){
    const leading=skill(p,m,j.skill),support=skill(p,m,j.secondary);
    const [trait,high,activity]=workStyles[j.id],disposition=p.traits?.[trait]??50;
    const affinity=high?disposition:100-disposition;
    const vacancy=root.EarthEmployers?.recorded(site,j.id)||0;
    const free=openings(site,j.id),qualifiedHere=qualified(p,m,j);
    const studying=m.training?.targetId===j.id?m.training:null;
    const recognition=!qualifiedHere&&!studying?recognisedStudy(world,site,p,m,j):null;
    const weeks=qualifiedHere?0:Math.ceil((j.trainingWeeks-(studying?.credits??recognition?.credits??0))/(studying?.pace==='intensive'?2:1));
    const attainable=canFit(p,j),underPressure=pressure(site,j);
    const benefit=Math.min(18,vacancy*9)+(underPressure?4:0);
    const horizon=Math.min(15,Math.sqrt(weeks))*(107-(p.traits?.patience??50))/100;
    const skillFit=(leading*2+support)/3;
    const experience=Math.min(7,Math.sqrt(serviceWeeks(world,site,p.id,j.id)));
    const score=skillFit+(p.strengths?.includes(j.skill)?5:0)+(p.hobbyAxis===j.skill?3:0)+(p.workFocus?.axis===j.skill?2:0)+
      (affinity-50)*0.16+benefit+(qualifiedHere?6:0)+experience-horizon-(free===0&&m.jobId!==j.id?14:0);
    return {job:j,score,attainable,activity,affinity,weeks,recognition,vacancy,free,underPressure,incumbent:m.jobId===j.id};
  }
  function routes(world,site,p){
    const m=state(site,p.id);
    return catalog.map(j=>outlook(world,site,p,m,j)).sort((a,b)=>Number(b.attainable)-Number(a.attainable)||
      b.score-a.score||a.job.id.localeCompare(b.job.id));
  }
  function rationale(plan,site,firstPerson=true){
    if(!plan)return '';
    const {job:j}=plan;
    const worker=firstPerson?'I enjoy ':'The daily work includes ';
    const style=plan.affinity>=58?worker+plan.activity+'.':'The daily work includes '+plan.activity+'.';
    const opening=site.employers?.[j.id]?.open?.[0];
    if(opening)return style+' '+j.employer+' needs someone to take over '+opening.name+'’s old round.';
    if(plan.free===0&&!plan.incumbent)return style+' All funded posts are held. A qualified applicant can wait for an opening.';
    if(plan.underPressure){
      const need={food:'The pantry has '+site.food+' food for about '+Math.ceil((site.population||1)/5)+' meals a week.',
        materials:'Repair crews are drawing on the '+site.materials+' materials in store.',funds:'The treasury has '+site.funds+' funds left for local work.',
        wellbeing:'Households need the service more often while wellbeing is low.',trust:'Residents are asking for help to restore trust.'};
      return style+' '+need[j.metric];
    }
    return style;
  }
  function waitingAlternative(world,site,p,m=state(site,p.id)){
    const a=m.application;
    if(a?.phase!=='waiting'||!a.autonomous||m.agreedPlan||m.training||m.specialistRelief?.week>=world.week||
      !site.employers||world.week-a.appliedWeek<12+Math.round((p.traits?.patience??50)/4))return null;
    const current=employment(site,p,m),waiting=get(jobs,a.targetId);
    if(!waiting||openings(site,waiting.id)!==0)return null;
    const previous=outlook(world,site,p,m,waiting);
    const horizon=8+Math.round((p.traits?.adaptability??50)/3);
    let best=null;
    for(const [id,employer] of Object.entries(site.employers)){
      const job=get(jobs,id);
      if(!job||id===waiting.id||id===current.id||!employer.open?.length)continue;
      const plan=outlook(world,site,p,m,job);
      if(!plan.attainable||plan.free===0||plan.weeks>horizon||(!plan.weeks&&screening(p,m,job).length))continue;
      if(plan.score<previous.score+3||best&&plan.score<=best.score)continue;
      best=plan;
    }
    return best;
  }
  function consent(world,site,p,m,j,action,speaker){
    if(!speaker||speaker===p.id)return '';
    if(['apply','enroll','portfolio','practice','support','discussOffer','handover'].includes(action)&&
      (root.EarthAutonomy?.bond?.(site,p.id,speaker,world.week)||0)<=-3)
      return p.name+' remembers an agreement you missed. They want to rebuild trust before making another career plan with you.';
    const playable=root.EarthAgency?.canPlay?.(site,p.id)??(p.kind!=='carrier'&&!/^carrier-/.test(p.id));
    if(['withdraw','release','pause','pace','accept','resume','leaveCourse'].includes(action)){
      return playable?'Play as '+p.name+' to make this decision about their employment or study.':
        p.name+' manages this decision personally. Meet them to discuss a course, application or offer.';
    }
    if(action==='mentor'||action==='placement')return playable?'Play as '+p.name+' and meet the mentor.':
      p.name+' arranges their own lessons. You can meet them to suggest practice or a work sample.';
    if(action==='specialistRelief'&&(p.traits?.adaptability??50)<45&&!['waiting','screening'].includes(m.application?.phase))
      return p.name+' wants to finish their own work. They would consider covering this employer while pursuing a post there.';
    if(action==='enroll' && m.application && m.application.phase!=='deferred' && m.application.targetId!==j.id)
      return p.name+' wants to hear back about their existing job application first.';
    if(action==='apply' && m.training && m.training.targetId!==j.id)return p.name+' wants to finish the course they already chose before pursuing a different employer.';
    if(action==='enroll' && j.trainingWeeks>78 && (p.traits?.patience??50)<40 && !samples(m,j))
      return p.name+' would like to try one work sample before committing to a course lasting several seasons.';
    if(!canFit(p,j) && ['apply','enroll'].includes(action))return p.name+' would prefer another route. This employer asks for more than their projected skill range.';
    if(['apply','enroll'].includes(action) && skill(p,m,j.skill)+25<j.requiredSkill && samples(m,j)===0)
      return p.name+' wants to try '+j.skill+' first. Suggest practice or help them build a sample.';
    return '';
  }
  function mentorFor(world,site,p,m,j){
    const learner=skill(p,m,j.skill),week=world.week;
    let best=null,level=-Infinity;
    for(const person of people(site)){
      if(person.id===p.id)continue;
      const other=state(site,person.id),score=skill(person,other,j.skill);
      if(score<learner+3||other.training?.pace==='intensive'&&!other.training.paused||!freeForPlacement(world,site,person.id,other))continue;
      const tie=root.EarthAutonomy?.bond?.(site,p.id,person.id,week)||0;
      if(tie<0)continue;
      const priority=score+tie+(root.EarthIntroductions?.level(site,p.id,person.id,j.skill,week)||0);
      if(!best||priority>level||priority===level&&person.id<best.id){best=person;level=priority;}
    }
    return best;
  }
  function freeForPlacement(world,site,id,m){
    const week=world.week,row=site.autonomy?.people?.[id],roster=site.workforce?.members?.[id];
    return residentHere(site,id)&&m.lastPracticeWeek!==week&&!(m.specialistRelief?.week>=week)&&
      !root.EarthAutonomy?.sessionSpent?.(site,id,week)&&!root.EarthPurses?.committed?.(site,id,week)&&
      !coverCommitment(site,id,week)&&site.shift?.residentId!==id&&!site.residents?.some(r=>r.id===id&&r.promise)&&
      !(site.pursuits?.ticket&&site.pursuits.ticket.maker===profile(site,id)?.name)&&
      !roster?.jobId&&!roster?.preferredJobId&&(row?.energy??5)>=2&&
      !root.EarthConstruction?.assignedDuty?.(site,world,id)&&!root.EarthCivicInitiatives?.commitment?.(site,world,id);
  }
  function placement(world,site,id,targetId,mentors=null){
    const m=state(site,id),t=m.training,j=get(jobs,targetId);
    if(!j||t?.targetId!==targetId||t.paused||t.placement||!t.credits||t.credits>=j.trainingWeeks||
      j.trainingWeeks>=8&&coursePhase(j,t.credits).phase!=='Supervised placement')return null;
    if(!freeForPlacement(world,site,id,m))return null;
    const pupil=profile(site,id);
    let best=null;
    for(const tutor of mentors||people(site)){
      if(tutor.id===id)continue;
      const other=state(site,tutor.id),post=employment(site,tutor,other);
      if(post.id!==j.id&&!(nursingPosts.includes(post.id)&&nursingPosts.includes(j.id)))continue;
      if(requiresCredential(j.id)&&!canCoverPost(site,tutor.id,j.id))continue;
      if(other.training?.pace==='intensive'&&!other.training.paused||!freeForPlacement(world,site,tutor.id,other))continue;
      const tie=root.EarthAutonomy?.bond?.(site,tutor.id,id,world.week)||0;
      if(tie<0||tie===0&&(tutor.traits?.sociability??50)+(tutor.traits?.patience??50)<82)continue;
      const lead=skill(tutor,other,j.skill)-skill(pupil,m,j.skill),support=skill(tutor,other,j.secondary)-skill(pupil,m,j.secondary);
      const axis=lead>=support?j.skill:j.secondary;
      const growth=Math.max(0,Math.min(3,Math.max(lead,support),bounds(pupil,axis).max-skill(pupil,m,axis)));
      const sample=samples(m,j)<3;
      if(!sample&&!growth)continue;
      const score=tie*4+growth*2+(tutor.traits?.patience??50)/10;
      if(!best||score>best.score||score===best.score&&tutor.id<best.mentorId){
        best={mentorId:tutor.id,mentorName:tutor.name,axis,growth,sample,score};
      }
    }
    return best;
  }
  function attendPlacement(world,site,id,targetId,mentorId,scheduled=false){
    const tutor=profile(site,mentorId),pupil=profile(site,id),j=get(jobs,targetId);
    const agreed=tutor&&pupil&&placement(world,site,id,targetId,[tutor]);
    if(!agreed)return fail('The worker, supervision or course timetable changed. Review this placement again.');
    const week=world.week,m=ensure(site,id),other=ensure(site,mentorId);
    const raised=gain(pupil,m,agreed.axis,agreed.growth);
    m.lastPracticeWeek=week;other.lastPracticeWeek=week;other.lastTeachingWeek=week;
    gain(tutor,other,'communication',1);
    if(agreed.sample)m.portfolios[targetId]=samples(m,j)+1;
    m.training.placement={week,name:tutor.name,axis:agreed.axis,sample:agreed.sample,format:scheduled?'placement':'review'};
    const meeting=scheduled?tutor.name+' supervised '+pupil.name+' at '+j.employer+'. ':
      tutor.name+' met '+pupil.name+' to review their work for '+j.employer+'. ';
    const message=meeting+
      (agreed.sample?'The employer signed a '+j.label.toLowerCase()+' work sample. ':'')+
      (raised?pupil.name+' gained '+raised+' '+agreed.axis+'.':'The learner demonstrated their current skills.');
    note(m,week,message);note(other,week,meeting.trim());
    m.revision++;other.revision++;
    if(!scheduled)root.EarthAutonomy?.remember?.(site,week,id,mentorId,'lesson');
    return {ok:true,message,personId:id,revision:m.revision};
  }
  function coverFor(site,p,old,week,excludeId=null){
    const link=porterSlot(p.id)&&['origin','courier'].includes(old.id)?activeLane(site,p.id):null;
    const occupation=link?.resource==='food'?'food':old.occupation;
    const axis={food:'care',repair:'craft',exchange:'organisation'}[occupation];
    const assigned=new Set(Object.values(site.careers||{}).flatMap(m=>[m.application?.coverId,m.departure?.coverId]).filter(Boolean));
    const credential=requiresCredential(old.id)?old.id:null;
    let best=null,bestScore=-1,bestQualified=false;
    for(const other of people(site)){
      if(other.id===p.id||other.id===excludeId||assigned.has(other.id)||link&&porterSlot(other.id)&&!changedTrade(state(site,other.id))&&activeLane(site,other.id))continue;
      const m=state(site,other.id);
      if(m.application?.phase==='notice'||m.training?.pace==='intensive'&&!m.training.paused||m.specialistRelief?.week>=week||root.EarthPurses?.committed?.(site,other.id,week))continue;
      const post=get(jobs,m.jobId)||origin(other);
      const resident=site.residents?.find(r=>r.id===other.id),self=site.residents?.find(r=>r.id===p.id);
      const oldTie=resident&&self?site.neighbourWork?.links?.[[resident.slot,self.slot].sort().join('-')]||0:0;
      const bond=oldTie+(root.EarthAutonomy?.bond?.(site,other.id,p.id,week)||0);
      const worker=site.workforce?.members?.[other.id],energy=site.autonomy?.people?.[other.id]?.energy??5;
      if(bond<0||energy<2||resident?.promise||site.shift?.residentId===other.id||worker?.jobId||worker?.preferredJobId||
        (post.occupation!==occupation&&(other.traits?.adaptability??50)<35))continue;
      const recentMeal=site.agency?.meals?.some(row=>row.week>=week-3&&
        (row.from===p.id&&row.to===other.id||row.to===p.id&&row.from===other.id));
      const score=skill(other,m,axis)+(post.occupation===occupation?25:0)+bond*3+(recentMeal?8:0)+(other.traits?.sociability??50)/12;
      const professionallyQualified=credential&&canCoverPost(site,other.id,credential);
      if(!best||professionallyQualified&&!bestQualified||Boolean(professionallyQualified)===bestQualified&&score>bestScore){
        best={id:other.id,name:other.name,scope:credential?(professionallyQualified?'qualified':'admin'):null};
        bestScore=score;bestQualified=Boolean(professionallyQualified);
      }
    }
    return best;
  }
  const requiresCredential=id=>id==='practice-nurse'||id==='surveyor'||Object.hasOwn(specialistSites,id);
  function scope(site,agreement,jobId){
    if(!agreement?.coverId||!requiresCredential(jobId))return null;
    if(agreement.coverScope==='admin')return 'admin';
    // Earlier saves recorded a colleague with no distinction between office
    // support and professional service. Recheck competence before crediting it.
    return canCoverPost(site,agreement.coverId,jobId)?'qualified':'admin';
  }
  function departingPost(m){return jobLabels.get(m.departure?.oldRole)||m.latestReference?.jobId;}
  function supportTask(jobId){return nursingPosts.includes(jobId)?'appointment schedules and clinic records':'schedules and handover records';}
  function handoverDuty(site,id,week){
    for(const [owner,m] of Object.entries(site.careers||{})){
      const notice=m.application?.phase==='notice'&&m.application.coverId===id?m.application:null;
      const left=m.departure?.throughWeek>=week&&m.departure.coverId===id?m.departure:null;
      if(!notice&&!left)continue;
      const p=profile(site,owner),job=notice&&p?employment(site,p,m):get(jobs,departingPost(m));
      if(!job||!requiresCredential(job.id))return {reason:'I agreed to cover a colleague through their handover.'};
      const part=scope(site,notice||left,job.id);
      const title=part==='admin'?'Organise '+supportTask(job.id):'Cover the '+job.label.toLowerCase()+' round';
      const reason=part==='admin'?'I agreed to organise '+supportTask(job.id)+' at '+job.employer+'. The professional round still needs a qualified colleague.':
        'I agreed to cover the '+job.label.toLowerCase()+' round at '+job.employer+' during the handover.';
      return {scope:part,title,reason,role:job.label,venue:job.venue==='pier'?'dock':job.venue};
    }
    return null;
  }
  // Every established district shares the first specialist with its regional
  // employer. Further posts need households to serve and actual working space.
  const specialistSites={
    nurse:['hall','care','an assembly hall or neighbourhood services precinct'],
    police:['hall','transit','an assembly hall or transit precinct'],
    teacher:['hall','care','an assembly hall or neighbourhood services precinct'],
    musician:['hall','care','an assembly hall or neighbourhood services precinct'],
    mathematician:['workshop','yard','a repair workshop or fabrication precinct'],
    engineer:['workshop','yard','a repair workshop or fabrication precinct'],
    geneticist:['garden','food','a community garden or food cooperative precinct']
  };
  function funded(site,j){
    const rule=specialistSites[j.id];
    const rooms=(site.buildings||[]).filter(b=>b.kind===rule[0]).length+(site.city?.precincts||[]).filter(p=>p.use===rule[1]).length;
    return 1+Math.min(2,rooms,Math.floor((site.population||0)/18));
  }
  const reserves=(m,id)=>m.application?.targetId===id&&['offer','notice'].includes(m.application.phase);
  function openings(site,targetId){
    if(!Object.hasOwn(specialistSites,targetId))return null;
    const capacity=funded(site,jobs[targetId]),used=Object.entries(site.careers||{}).filter(([id,m])=>residentHere(site,id)&&(m.jobId===targetId||reserves(m,targetId))).length;
    return Math.max(0,capacity-used);
  }
  function specialistShift(site,id,week){
    const relief=memory(site,id)?.specialistRelief,j=get(jobs,relief?.targetId);
    return j&&relief.week===week&&canCoverPost(site,id,j.id)?{id:j.id,venue:j.venue,label:j.label,employer:j.employer,metric:j.metric,week}:null;
  }
  function onOtherDuty(site,id,m,week){
    return m.training?.pace==='intensive'&&!m.training.paused||m.specialistRelief?.week===week||
      coverCommitment(site,id,week)!=null;
  }
  function pressure(site,j){
    if(j.metric==='food')return site.food<2*Math.ceil((site.population||1)/5);
    if(j.metric==='materials')return site.materials<8||(site.construction||[]).some(c=>!c.paused);
    return site[j.metric]<(j.metric==='wellbeing'?52:48);
  }
  const demonstrated=(p,m,j)=>skill(p,m,j.skill)+2*samples(m,j)+(employerReference(p,m,j)?.quality||0);
  function opening(world,site,p,m,j,current){
    if(!j||!Object.hasOwn(specialistSites,j.id))return null;
    const team=[],waiters=[],capacity=funded(site,j),week=world.week;
    let reliefTaken=null,staffed=0;
    for(const [id,v] of Object.entries(site.careers||{})){
      if(!residentHere(site,id))continue;
      if(v.specialistRelief?.targetId===j.id&&v.specialistRelief.week===week+1&&canCoverPost(site,id,j.id))reliefTaken=id;
      if(v.jobId===j.id||reserves(v,j.id)){
        const appointed=v.jobId===j.id;
        team.push({id,name:profile(site,id)?.name||id,status:appointed?'appointed':v.application.phase});
        if(appointed&&!onOtherDuty(site,id,v,week+1))staffed++;
      }
      if(v.application?.targetId===j.id&&v.application.phase==='waiting')
        waiters.push({id,name:profile(site,id)?.name||id,since:v.application.appliedWeek});
    }
    waiters.sort((a,b)=>a.since-b.since||demonstrated(profile(site,b.id),state(site,b.id),j)-demonstrated(profile(site,a.id),state(site,a.id),j)||a.id.localeCompare(b.id));
    const free=Math.max(0,capacity-team.length),day=week+1,full=staffed>=capacity&&!pressure(site,j);
    const nextRound=day+(j.interval-day%j.interval)%j.interval;
    const life=site.autonomy?.people?.[p.id],today=life?.history?.[0];
    const used=today?.week===week&&(['project','dream','learn','apply','gather','preserve','cover','wage','visit','host','marketSupply'].includes(today.kind)||today.errand===true);
    const debt=used||life?.contribution?.week===week||m.lastPracticeWeek===week||m.specialistRelief?.week>=week||
      root.EarthPurses?.committed?.(site,p.id,week);
    const roster=site.workforce?.members?.[p.id],joint=Object.entries(site.autonomy?.projects?.owners||{}).some(([id,goal])=>
      goal.volunteer?.week===week&&(goal.volunteer.from===p.id||id===p.id));
    let reason='';
    if(current.id===j.id)reason='This person already holds the regular post.';
    else if(nursingPosts.includes(j.id)&&clinicalPractice(p,m)?!canCoverPost(site,p.id,j.id):
      !qualified(p,m,j)||screening(p,m,j).length)reason='Finish the qualification and demonstrate the entry skills before covering an independent round.';
    else if(debt||m.application?.phase==='notice'||onOtherDuty(site,p.id,m,day)||site.shift?.residentId===p.id||site.residents?.some(r=>r.id===p.id&&r.promise)||roster?.jobId||roster?.preferredJobId||roster?.preference&&roster.preference!=='auto'||joint||
      root.EarthConstruction?.assignedDuty?.(site,world,p.id)||root.EarthCivicInitiatives?.commitment?.(site,world,p.id)||site.pursuits?.ticket?.maker===p.name)
      reason='Another practice session, shift or promise already needs this person.';
    else if(reliefTaken)reason=(profile(site,reliefTaken)?.name||'A colleague')+' already covers the next round.';
    else if(full)reason='The funded team can cover its current workload.';
    else if(day!==nextRound)reason='The next relief round is in week '+nextRound+'. Book it the week before.';
    const rule=specialistSites[j.id],oldGood=replacementGoods[current.occupation];
    const service='One qualified relief worker provides 1 '+j.metric+' on an uncovered or high-demand round. Their usual team gives up 1 '+oldGood+' for that week.';
    return {capacity,free,team,waiters,reason:'The regional employer funds one district post. Each additional post needs another 18 residents and '+rule[2]+', up to three posts. A resignation or expired offer also frees a post.',
      nextReview:m.application?.targetId===j.id&&['waiting','screening'].includes(m.application.phase)?m.application.dueWeek:null,
      relief:{available:!reason,reason,metric:j.metric},service};
  }
  function coursePhase(j,credits){
    if(j.trainingWeeks<8)return {phase:'Work induction',phaseDetail:'Learn the daily rounds with the crew before applying.'};
    if(credits<Math.ceil(j.trainingWeeks/3))return {phase:'Foundation classes',phaseDetail:'Build a working knowledge of '+j.skill+' and '+j.secondary+'.'};
    if(credits<Math.ceil(2*j.trainingWeeks/3))return {phase:'Supervised placement',phaseDetail:'Practise alongside staff at '+j.employer+' while retaining the current job.'};
    return {phase:'Assessed practice',phaseDetail:'Demonstrate the work independently. Prepare samples for the hiring panel.'};
  }
  function coverCommitment(site,id,week){
    for(const m of Object.values(site.careers||{})){
      if(m.application?.phase==='notice'&&m.application.coverId===id)return m.application.dueWeek+1;
      if(m.departure?.coverId===id&&m.departure.throughWeek>=week)return m.departure.throughWeek;
    }
    return null;
  }
  function status(world,site,p,m,current){
    const a=m.application,t=m.training,j=get(jobs,a?.targetId);
    if(a?.phase==='screening')return j.employer+' is reviewing the application for '+j.label+'. A decision is due in week '+a.dueWeek+'. '+current.employer+' still employs '+p.name+'.';
    if(a?.phase==='waiting')return p.name+' met the '+j.label+' entry standard and is on the qualified waiting list. '+j.employer+' checks openings again in week '+a.dueWeek+'. Their current work and qualification continue.';
    if(a?.phase==='offer')return j.employer+' offered the '+j.label+' post. Accept by week '+a.dueWeek+' to begin notice at '+current.employer+'.';
    if(a?.phase==='notice'){
      const part=scope(site,a,current.id),plan=part==='admin'?a.coverName+' will handle '+supportTask(current.id)+'. The professional round still needs a qualified colleague.':
        a.coverName?a.coverName+' will cover the old post.':'The former team still needs cover.';
      return p.name+' remains '+current.label+' until week '+a.dueWeek+', then starts at '+j.employer+'. '+plan;
    }
    if(t){const target=jobs[t.targetId];return (t.paused?'Study paused at ':'Studying for '+target.label+' · ')+t.credits+'/'+target.trainingWeeks+' credits. '+(t.paused?'Completed credits are retained.':coursePhase(target,t.credits).phase+'. ')+(t.paused?'':t.pace==='intensive'?'Intensive study earns two credits per week and reduces working time.':'Evening study earns one credit each week after work.');
    }
    if(a?.phase==='deferred')return j.employer+' deferred the application. '+a.reason+' Reapply from week '+a.dueWeek+'.';
    return p.name+' works as '+current.label+' at '+current.employer+'.';
  }
  function view(world,site,id,targetId,context={}){
    const p=profile(site,id);if(!p||!world)return null;
    const m=state(site,id),a=m.application,t=m.training,week=world.week;
    const current=employment(site,p,m);
    const j=get(jobs,targetId||a?.targetId||t?.targetId||current.id);
    const revision=m.revision||0,choices=[],posts=opening(world,site,p,m,j,current);
    const speaker=context.speakerId??root.EarthAgency?.actorId(site)??id;
    const skills=Object.fromEntries(axes.map(k=>[k,skill(p,m,k)]));
    function add(action,text,detail,gate='',extra={}){
      const outside=residentHere(site,id)?!context.autonomous&&root.EarthCommunityLife?.visitReason?.(world,site):
        'This resident manages their employment outside the district.';
      const reason=outside||gate||consent(world,site,p,m,j,action,speaker);
      choices.push({id:action,targetId:j.id,label:text,detail,available:!reason,reason,expectedRevision:revision,...extra});
    }
    if(j){
      const studied=t?.targetId===j.id,enrolled=t&&!studied,active=a&&a.phase!=='deferred',appHere=a?.targetId===j.id;
      const sameJob=j.id===current.id;
      const canStudy=qualified(p,m,j);
      if(!canStudy&&!studied){
        const prior=recognisedStudy(world,site,p,m,j);
        const detail=prior?j.employer+' recognises '+prior.credits+' credits from documented work as '+jobs[prior.sourceId].label+'. Complete the remaining '+(j.trainingWeeks-prior.credits)+' credits alongside the current job.':
          'Evening study keeps the current job. Complete '+j.trainingWeeks+' credits before employer assessment.';
        add('enroll','Enrol in '+j.label+' training',detail,enrolled?'Finish, pause and leave, or resume your current course first.':'');
      }
      if(studied){
        if(t.paused)add('resume','Resume training','Carry on with the '+t.credits+' completed credits.');
        else{
          const fast=t.pace==='intensive';
          add('pace',fast?'Switch to evening study':'Request an intensive timetable',fast?'Earn one credit each week and restore full time at work.':
            'Earn two credits each week. Until study finishes, the old team loses one weekly unit of its usual work.');
          add('pause','Pause this course','Keep the completed credits and regain full working time.');
        }
        if(t.paused)add('leaveCourse','Leave the course','Your acquired skills stay. Leaving releases the place and clears these course credits.');
        const supervisor=context.matchPeople!==false&&placement(world,site,id,j.id);
        if(supervisor)add('placement','Review a work sample with '+supervisor.mentorName,'Bring a '+j.label.toLowerCase()+
          ' work sample to a colleague who holds the post. The session uses the learner’s and supervisor’s time.','',{mentorId:supervisor.mentorId,mentorName:supervisor.mentorName});
      }
      const taken=m.lastPracticeWeek===week||root.EarthAutonomy?.sessionSpent?.(site,id,week)||m.specialistRelief?.week===week||site.autonomy?.people?.[id]?.contribution?.week===week||root.EarthPurses?.committed?.(site,id,week)?'This person already used their personal practice session this week.':'';
      if(posts&&!sameJob&&canStudy)add('specialistRelief','Cover a '+j.label.toLowerCase()+' round',posts.service,posts.relief.reason);
      const reference=employerReference(p,m,j);
      if(reference?.quality<0)add('relief','Take a relief shift for '+reference.employer,
        'Commit this week’s practice session to the former crew. They receive one '+replacementGoods[reference.occupation]+' next week and improve the reference by one point.',taken);
      const lastClass=axis=>skill(p,m,axis)>=bounds(p,axis).max?'At the upper end of this person’s '+axis+' range.':'';
      add('practice','Practise '+j.skill,'Build this skill through personal practice. Current '+skills[j.skill]+' of '+bounds(p,j.skill).max+'.',taken||lastClass(j.skill));
      add('support','Practise '+j.secondary,'Work on the second skill used by '+j.employer+'. Current '+skills[j.secondary]+' of '+bounds(p,j.secondary).max+'.',taken||lastClass(j.secondary));
      const mentor=context.matchPeople!==false&&!taken&&!lastClass(j.skill)?mentorFor(world,site,p,m,j):null;
      if(mentor){
        const introduction=root.EarthIntroductions?.level(site,id,mentor.id,j.skill,week)>0?
          ' Your recent introduction gives this mentor priority when experience and availability are close.':'';
        add('mentor','Learn '+j.skill+' with '+mentor.name,'Meet in person for a guided session. Both people commit their practice time.'+introduction,taken,{mentorId:mentor.id,mentorName:mentor.name});
      }
      if(samples(m,j)<3)add('portfolio','Prepare a work sample','Earn one employer-reviewed '+j.skill+' sample. Each demonstrates two points toward the main skill requirement.',taken);
      if(!sameJob && !active){
        const retry=appHere&&a.phase==='deferred'&&a.dueWeek>week?'The panel will reopen in week '+a.dueWeek+'.':'';
        add('apply','Apply to '+j.employer,'The employer reviews the application over two weeks. Current job and wages continue.',retry);
      }else if(active&&appHere){
        if(a.phase==='offer'){
          const through=Math.max(coverCommitment(site,id,week)||0,m.specialistRelief?.week>=week?m.specialistRelief.week:0);
          const committed=through?'The worker promised cover through week '+through+'. The offer can be reconsidered after that shift.':'';
          if(context.autonomous&&speaker===id)add('considerOffer','Consider the employer’s offer','Decide whether the new duties fit current commitments and the former team’s resources.',committed);
          if(speaker===id)add('accept','Accept the offer','Start a notice period at '+current.employer+'. The new post begins after the handover.',committed);
          else add('discussOffer','Discuss the offer with '+p.name,'They weigh the offer against conditions at their current workplace and decide whether to give notice.',committed);
        }
        if(a.phase==='notice'){
          const cover=context.matchPeople!==false&&!a.coverId?coverFor(site,p,current,week,context.autonomous&&world.activeId===site.id?root.EarthAgency?.actorId(site)||'steward':null):null;
          if(cover){
            const office=cover.scope==='admin',text=office?'Arrange office support with '+cover.name:'Arrange cover with '+cover.name;
            const detail=office?cover.name+' can manage '+supportTask(current.id)+' through the first two weeks after departure. A qualified colleague is still needed for the '+current.label.toLowerCase()+' round.':
              'They can take up the old duties through the first two weeks after departure. They may step away from their own trade.';
            add('handover',text,detail,'',{coverId:cover.id,coverName:cover.name,coverScope:cover.scope});
          }
          if(!a.releaseAsked&&a.dueWeek>week+1)add('release','Request an early release',current.employer+' can refuse if important work is uncovered. Leaving urgently without cover affects their future reference.');
        }else add('withdraw','Withdraw application','Keep the current job and all completed learning.');
      }else if(!sameJob && active){
        if(a.phase==='waiting'&&speaker===id&&waitingAlternative(world,site,p,m)?.job.id===j.id){
          const opening=site.employers[j.id].open[0];
          add('followVacancy','Pursue the vacancy at '+j.employer,'Leave the '+jobs[a.targetId].label.toLowerCase()+' waiting list and '+(canStudy?'submit a fresh application':'start evening study')+' for '+opening.name+'’s former post. The previous qualification is retained.','',
            {openingKey:opening.opened+'/'+opening.formerId});
        }else add('apply','Apply to '+j.employer,'Only one live job application is considered at a time.','Finish or withdraw the current application first.');
      }
    }
    return {personId:id,name:p.name,career:current.label,careerId:current.id,employer:current.employer,assignment:work(site,id)?.assignment||(!m.jobId&&p.birthCommunityId===site.id?p.workFocus:null),
      skills,tenure:tenure(world,site,p,m,current),aptitude:Object.fromEntries(axes.map(k=>[k,aptitude(p,k)])),bounds:Object.fromEntries(axes.map(k=>[k,bounds(p,k)])),
      history:(m.history||[]).map(h=>({...h})),training:t?{...t,...(t.recognised?{recognised:{...t.recognised}}:{}),...(t.placement?{placement:{...t.placement}}:{}),...coursePhase(jobs[t.targetId],t.credits)}:null,application:a?{...a}:null,
      recruitment:j?root.EarthEmployers?.view(site,world,j.id)||null:null,qualifications:{...m.qualifications},portfolios:{...m.portfolios},references:{...m.references},latestReference:m.latestReference?{...m.latestReference}:null,agreedPlan:m.agreedPlan||null,
      targetId:j?.id,opening:posts,supplyLane:porterSlot(id)?supplyLane(site,world,id):null,qualified:j?qualified(p,m,j):false,missing:j?screening(p,m,j):[],
      fits:j?canFit(p,j):false,stage:a?.phase==='deferred'&&t?'training':a?.phase||(t?'training':'employed'),
      status:status(world,site,p,m,current),choices,revision};
  }
  function command(world,site,id,action,targetId,expectedRevision,proof,context={}){
    const p=profile(site,id),j=get(jobs,targetId),old=state(site,id);
    if(!p||!j||!world)return fail('Choose a known person and profession.');
    if(!residentHere(site,id))return fail('A visitor manages their own employment. Meet a member of this community to discuss local work.');
    if((old.revision||0)!==expectedRevision)return fail('This career decision changed. Review the person’s current options.');
    const info=view(world,site,id,targetId,{...context,matchPeople:['mentor','placement','handover'].includes(action)}),option=info.choices.find(c=>c.id===action);
    if(!option||!option.available)return fail(option?.reason||'This choice is unavailable at the current career stage.');
    if(action==='followVacancy'&&context.openingKey!==option.openingKey)return fail('The vacancy changed. Review the named opening before leaving the waiting list.');
    const week=world.week, speaker=context.speakerId??root.EarthAgency?.actorId(site)??id;
    const adopted=speaker!==id&&['enroll','apply'].includes(action),autonomous=Boolean(context.autonomous||adopted);
    if(['mentor','placement'].includes(action) && (!proof||proof.actor!==id||proof.target!==option.mentorId||proof.siteId!==site.id||
      proof.mode!=='walk'||![proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)||Math.hypot(proof.x-proof.tx,proof.y-proof.ty)>1.56))return fail('Meet the named mentor on foot for this lesson.');
    if(action==='placement')return attendPlacement(world,site,id,targetId,option.mentorId);
    if(action==='handover'&&context.coverId && context.coverId!==option.coverId)return fail('The proposed colleague’s availability changed.');
    const m=ensure(site,id),current=employment(site,p,m),a=m.application,t=m.training;
    let message;
    switch(action){
      case 'followVacancy':{
        const kept=jobs[a.targetId].label,former=site.employers[j.id].open[0].name;
        delete m.application;
        if(qualified(p,m,j)){
          m.application={targetId,phase:'screening',dueWeek:week+2,autonomous,...(Object.hasOwn(specialistSites,targetId)?{appliedWeek:week}:{})};
          message=p.name+' left the '+kept.toLowerCase()+' waiting list and applied to replace '+former+' at '+j.employer+'. Their qualification stays with them.';
          break;
        }
        message=p.name+' left the '+kept.toLowerCase()+' waiting list to train for '+former+'’s former post. ';
      }
      // Employers recognise prior practice on either route into evening study.
      case 'enroll':{
        const prior=recognisedStudy(world,site,p,m,j);
        m.training={targetId,credits:prior?.credits||0,startedWeek:week,lastWeek:week,pace:'evening',paused:false,autonomous};
        if(prior)m.training.recognised=prior;
        message=(message||'')+p.name+' enrolled in '+j.label+' training and kept their post at '+current.employer+'.'+
          (prior?' '+j.employer+' recognised '+prior.credits+' credits for service as '+jobs[prior.sourceId].label+'.':'');break;
      }
      case 'pace':
        t.pace=t.pace==='intensive'?'evening':'intensive';
        message=p.name+' agreed a new '+t.pace+' study timetable with '+current.employer+'.';break;
      case 'pause':case 'resume':
        t.paused=action==='pause';message=p.name+(t.paused?' paused':' resumed')+' the course with '+t.credits+' credits.';break;
      case 'leaveCourse':
        delete m.training;message=p.name+' left the course and retained their learned skills.';break;
      case 'practice':case 'support':case 'mentor':{
        const axis=action==='support'?j.secondary:j.skill;
        const raised=gain(p,m,axis,practicedGain(p,m,axis)+(action==='mentor'?2:0));
        m.lastPracticeWeek=week;
        let who='';
        if(action==='mentor'){
          const guide=profile(site,option.mentorId),teacher=ensure(site,guide.id);
          teacher.lastTeachingWeek=week;teacher.lastPracticeWeek=week;gain(guide,teacher,'communication',1);
          note(teacher,week,'Mentored '+p.name+' in '+axis+'.');teacher.revision++;who=' with '+guide.name;root.EarthAutonomy?.remember?.(site,week,guide.id,p.id,'lesson');
        }
        message=p.name+' practised '+axis+who+' and gained '+raised+' skill ('+skill(p,m,axis)+'/'+bounds(p,axis).max+').';break;
      }
      case 'specialistRelief':
        m.lastPracticeWeek=week;m.specialistRelief={targetId,week:week+1,occupation:current.occupation};
        message=p.name+' agreed to cover the '+j.label.toLowerCase()+' round at '+j.employer+' in week '+(week+1)+'. '+current.employer+' gives up 1 '+replacementGoods[current.occupation]+' to release them.';break;
      case 'relief':{
        const reference=employerReference(p,m,j);
        const quality=reference.quality+1;
        m.references[reference.jobId]=quality;
        if(m.latestReference?.jobId===reference.jobId)m.latestReference.quality=quality;
        m.lastPracticeWeek=week;m.relief={week,occupation:reference.occupation};
        message=p.name+' took a relief shift for '+reference.employer+'. '+(quality<0?'One more shift can restore a neutral reference.':'The employer restored a neutral reference.');break;
      }
      case 'portfolio':
        m.lastPracticeWeek=week;m.portfolios[targetId]=samples(m,j)+1;
        message=p.name+' prepared a '+j.label+' work sample ('+m.portfolios[targetId]+'/3).';break;
      case 'apply':
        m.application={targetId,phase:'screening',dueWeek:week+2,autonomous,...(Object.hasOwn(specialistSites,targetId)?{appliedWeek:week}:{})};
        message=j.employer+' received '+p.name+'’s application. Review in week '+(week+2)+'.';break;
      case 'withdraw':
        delete m.application;message=p.name+' withdrew the application and kept their old post.';break;
      case 'considerOffer':
      case 'discussOffer':
        if(site[replacementGoods[current.occupation]]<4 && (p.traits?.adaptability??50)<55 && j.occupation!==current.occupation &&
          (action!=='considerOffer'||!coverFor(site,p,current,week))){
          delete m.agreedPlan;a.phase='deferred';a.dueWeek=week+1;a.reason=p.name+' chose to stay while the former crew rebuilds its '+replacementGoods[current.occupation]+' stores.';
          message=a.reason+' They can consider the new employer again from week '+a.dueWeek+'.';break;
        }
        // A successful conversation means the applicant chooses to give notice.
      case 'accept':
        a.phase='notice';a.dueWeek=week+(current.trainingWeeks>=52?4:2);
        message=p.name+' accepted the offer. '+current.employer+' expects notice through week '+a.dueWeek+'.';break;
      case 'handover':{
        a.coverId=option.coverId;a.coverName=option.coverName;delete a.releaseAsked;
        if(option.coverScope)a.coverScope=option.coverScope;
        const admin=option.coverScope==='admin',colleague=ensure(site,a.coverId);
        note(colleague,week,admin?'Agreed to organise '+supportTask(current.id)+' for '+p.name+' at '+current.employer+'.':'Agreed to cover '+p.name+' at '+current.employer+'.');colleague.revision++;
        root.EarthAutonomy?.remember?.(site,week,p.id,option.coverId,admin?'office':'cover');
        message=admin?option.coverName+' agreed to organise '+supportTask(current.id)+' at '+current.employer+'. The '+current.label.toLowerCase()+' round still needs a qualified colleague.':
          option.coverName+' agreed to cover '+p.name+'’s duties at '+current.employer+' during the change.';break;
      }
      case 'release':{
        const metric=replacementGoods[current.occupation];
        a.releaseAsked=true;
        const fullCover=a.coverId&&scope(site,a,current.id)!=='admin';
        if(!fullCover && site[metric]<4)message=current.employer+' declined the early release. '+metric+' are low and the round still needs cover. The original notice ends in week '+a.dueWeek+'.';
        else{a.early=true;a.dueWeek=week+1;message=current.employer+' agreed to release '+p.name+' next week.'+(fullCover?' '+a.coverName+' will cover the handover.':' The unfilled post will affect the reference.');}
        break;
      }
      default:return fail('Choose a current career action.');
    }
    if(adopted)m.agreedPlan=targetId;
    else if(!context.autonomous && speaker===id){
      m.manualWeek=week;
      if(['enroll','apply','withdraw','pause','leaveCourse'].includes(action))delete m.agreedPlan;
      if(m.training && ['pause','pace','resume'].includes(action))m.training.autonomous=false;
    }
    m.revision++;note(m,week,message);
    return {ok:true,message,personId:id,revision:m.revision};
  }
  function serviceWeeks(world,site,id,jobId){
    const m=state(site,id);
    if(m.experience)return m.experience[jobId]||0;
    // Earlier saves have an appointment date and no attendance ledger. Carry
    // forward their existing tenure once, then count actual full working weeks.
    return m.jobId===jobId&&int(m.joinedWeek,1,world.week)?world.week-m.joinedWeek:0;
  }
  function tenure(world,site,p,m,current){
    if(!m.jobId)return null;
    const weeks=serviceWeeks(world,site,p.id,current.id),induction=current.trainingWeeks>=52?8:2;
    const next=weeks<induction?induction:weeks<26?26:weeks<52?52:Math.ceil((weeks+1)/26)*26;
    const stage=weeks<induction?'Learning the local rota':weeks<26?'Independent shifts':weeks<52?'Experienced team member':'Experienced colleague';
    return {weeks,stage,next,detail:stage+' · '+weeks+' credited working week'+(weeks===1?'':'s')+' in '+current.label.toLowerCase()+
      '. Working in the post builds '+current.skill+' and '+current.secondary+' within the person’s own range.'};
  }
  function clockService(world,site,p,m){
    const current=get(jobs,m.jobId),week=world.week;
    if(!current||week<=m.joinedWeek)return null;
    const imported=!m.experience;
    if(imported)m.experience={[current.id]:Math.max(0,week-m.joinedWeek-1)};
    if(onOtherDuty(site,p.id,m,week))return imported?{message:''}:null;
    const weeks=(m.experience[current.id]||0)+1;m.experience[current.id]=weeks;
    // Retained skill and service history travel with the person. The team
    // stops counting attendance during intensive study or a borrowed shift.
    let skillGrowth=0;
    if(weeks%13===0)skillGrowth+=gain(p,m,current.skill,1);
    if(weeks%26===0)skillGrowth+=gain(p,m,current.secondary,1);
    const duty=weeks%26===0&&root.EarthPersonas?.dutiesFor?.(current.id)?.[m.dutyIndex];
    const specialistGain=duty&&duty.axis!==current.skill&&duty.axis!==current.secondary?gain(p,m,duty.axis,1):0;
    skillGrowth+=specialistGain;
    const inducted=weeks===(current.trainingWeeks>=52?8:2);
    const message=inducted?p.name+' finished the local induction at '+current.employer+' and can organise their own round.':
      weeks%26===0?p.name+' has completed '+weeks+' working weeks as '+current.label+'. '+(skillGrowth?
        'Practising the job developed '+skillGrowth+' skill point'+(skillGrowth===1?'':'s')+'.'+(specialistGain?' Their '+duty.label.toLowerCase()+' assignment developed '+duty.axis+'.':''):'Their demonstrated service continues at their current skill range.'):'';
    return {message};
  }
  function teach(p,m,j,oldCredits,newCredits){
    // Practice occurs throughout the term. Each milestone is earned only once.
    const delta=n=>Math.floor(newCredits*n/j.trainingWeeks)-Math.floor(oldCredits*n/j.trainingWeeks);
    gain(p,m,j.skill,delta(Math.min(24,Math.ceil(j.trainingWeeks/4))));
    gain(p,m,j.secondary,delta(Math.min(14,Math.ceil(j.trainingWeeks/7))));
  }
  function tick(world,site){
    const week=world.week,events=[],panel=[],moves=[];
    root.EarthEmployers?.review(world,site);
    for(const [id,m] of Object.entries(site.careers||{})){
      const p=profile(site,id);if(!p||!residentHere(site,id))continue;
      if(m.processedWeek===week)continue;
      const a=m.application,t=m.training;
      let changed=false;
      const announce=text=>{note(m,week,text);events.push(text);changed=true;};
      if(a?.phase==='notice' && a.coverId && !residentHere(site,a.coverId)){
        const oldName=a.coverName;delete a.coverId;delete a.coverName;delete a.coverScope;
        announce(oldName+' moved away before the handover. '+p.name+' needs another available colleague.');
      }
      if(t && !t.paused && t.lastWeek<week){
        const j=jobs[t.targetId],credits=Math.min(j.trainingWeeks,t.credits+(t.pace==='intensive'?2:1));
        const priorPhase=coursePhase(j,t.credits).phase,newPhase=coursePhase(j,credits).phase;
        teach(p,m,j,t.credits,credits);t.credits=credits;t.lastWeek=week;changed=true;
        if(t.pace==='intensive')m.reducedWorkWeek=week;
        if(newPhase!==priorPhase && credits<j.trainingWeeks)announce(p.name+' began '+newPhase.toLowerCase()+' for the '+j.label+' qualification.');
        if(credits===j.trainingWeeks){
          m.qualifications[j.id]=week;delete m.training;
          announce(p.name+' completed the '+j.label+' course. '+j.employer+' can now consider the qualification alongside skills and samples.');
        }
      }
      if(a && ['screening','waiting'].includes(a.phase)&&week>=a.dueWeek&&Object.hasOwn(specialistSites,a.targetId)){
        panel.push({id,p,m,a,j:jobs[a.targetId]});
      }else if(a && a.phase==='screening' && week>=a.dueWeek){
        const j=jobs[a.targetId],missing=screening(p,m,j);
        if(missing.length){a.phase='deferred';a.dueWeek=week+1;a.reason=missing.join(', ')+'.';
          announce(j.employer+' deferred '+p.name+'’s application. Remaining requirements include '+a.reason);}
        else{a.phase='offer';a.dueWeek=week+3;delete a.reason;
          announce(j.employer+' offered '+p.name+' the '+j.label+' post. The worker has through week '+a.dueWeek+' to decide.');}
      }else if(a?.phase==='offer' && week>a.dueWeek){
        a.phase='deferred';a.dueWeek=week+1;a.reason='The previous offer expired.';
        announce(p.name+' let the offer expire. Their existing post continues.');
      }else if(a?.phase==='notice' && week>=a.dueWeek){
        const prior=employment(site,p,m),target=jobs[a.targetId];
        const part=scope(site,a,prior.id),fullCover=a.coverId&&part!=='admin';
        const reference=fullCover?2:a.early?-2:1;
        m.references[prior.id]=reference;
        m.latestReference={jobId:prior.id,employer:prior.employer,quality:reference,week};
        if(m.agreedPlan===target.id)delete m.agreedPlan;
        m.departure={oldRole:prior.label,oldEmployer:prior.employer,occupation:prior.occupation,coverId:a.coverId||null,throughWeek:week+1};
        if(part)m.departure.coverScope=part;
        if(root.EarthEmployers)moves.push({person:p,from:prior,to:target,appointed:!!m.jobId});
        const duty=chooseDuty(site,world,p,m,target);
        m.jobId=target.id;m.joinedWeek=week;delete m.application;
        const outcome=fullCover?' handed the work to '+a.coverName+' and recorded a strong reference.':part==='admin'?
          ' has '+a.coverName+' handling '+supportTask(prior.id)+'. The professional round is still open. '+(a.early?'Early departure affected the reference.':'The employer recorded the full notice.'):
          a.early?' is short-staffed after the early release and recorded a poor reference.':' accepted the full notice and needs temporary cover.';
        announce(p.name+' started as '+target.label+' at '+target.employer+'. '+prior.employer+outcome+(duty?' Their regular assignment is '+duty.label.toLowerCase()+'.':''));
      }
      const credited=clockService(world,site,p,m);
      if(credited){changed=true;if(credited.message)announce(credited.message);}
      if(m.specialistRelief&&week>m.specialistRelief.week){delete m.specialistRelief;changed=true;}
      if(m.relief && week>m.relief.week+1){delete m.relief;changed=true;}
      if(m.departure && week>m.departure.throughWeek){delete m.departure;changed=true;}
      if(changed){m.revision++;m.processedWeek=week;}
    }
    // Resolve expired reservations and actual handovers before awarding this
    // week's seats. Earlier submissions take priority, with demonstrated
    // skill, portfolio and a stable local ID deciding a simultaneous cohort.
    if(moves.length)events.push(...root.EarthEmployers.transition(world,site,moves));
    const filed=a=>a.appliedWeek??Math.max(1,a.dueWeek-2);
    const merit=r=>demonstrated(r.p,r.m,r.j);
    panel.sort((a,b)=>filed(a.a)-filed(b.a)||merit(b)-merit(a)||a.id.localeCompare(b.id));
    for(const {p,m,a,j} of panel){
      const wasWaiting=a.phase==='waiting',missing=screening(p,m,j);
      let text='';
      if(missing.length){
        a.phase='deferred';a.dueWeek=week+1;a.reason=missing.join(', ')+'.';
        text=j.employer+' deferred '+p.name+'’s application. Remaining requirements include '+a.reason;
      }else if(openings(site,j.id)>0){
        a.phase='offer';a.dueWeek=week+3;delete a.reason;
        text=j.employer+' reserved the '+j.label+' post for '+p.name+'. They have through week '+a.dueWeek+' to decide.';
      }else{
        a.appliedWeek=filed(a);a.phase='waiting';a.dueWeek=week+1;delete a.reason;
        if(!wasWaiting)text=j.employer+' added '+p.name+' to the qualified waiting list. All funded posts are held. Next review in week '+a.dueWeek+'.';
      }
      if(text){note(m,week,text);events.push(text);}
      m.revision++;m.processedWeek=week;
    }
    return events;
  }
  const porterSlot=id=>typeof id==='string'&&/^carrier-[0-8]-[0-8]$/.test(id);
  const routeId=link=>'carrier-'+link.from+'-'+link.to;
  const changedTrade=m=>Boolean(m?.jobId&&m.jobId!=='courier');
  function previousLane(m,link){
    const previous=m?.latestReference?.jobId;
    return Boolean(m?.departure&&(previous==='origin'||previous==='courier'&&link||
      !previous&&['Supply porter','Garden courier','Exchange porter'].includes(m.departure.oldRole)));
  }
  const operatingLinks=site=>Array.isArray(site?.buildings)?root.CommonEarthSim?.productiveLinks?.(site)||[]:[];
  function activeLane(site,id,links){
    return porterSlot(id)?(links||operatingLinks(site)).find(link=>routeId(link)===id)||null:null;
  }
  function laneWorker(site,world,link){
    const id=routeId(link),m=memory(site,id),guest=root.EarthCommunityLife?.profile?.(site,id);
    if(!residentHere(site,id)||guest&&guest.kind!=='carrier'&&m?.jobId!=='courier')return null;
    if(!changedTrade(m))return id;
    const week=world?.week??site.autonomy?.week??0;
    if(previousLane(m,link)&&m.departure.throughWeek>=week&&m.departure.coverId)return m.departure.coverId;
    if(site.autonomy?.week===week){
      for(const [other,row] of Object.entries(site.autonomy.people||{})){
        const today=row.history?.[0];
        if(today?.week===week&&today.kind==='cover'&&today.laneId===id&&today.target===id)return other;
      }
    }
    return null;
  }
  function supplyLane(site,world,id,link=activeLane(site,id)){
    if(!link)return null;
    const worker=laneWorker(site,world,link),coverId=worker&&worker!==id?worker:null;
    const coverName=coverId?profile(site,coverId)?.name||null:null;
    const label=(link.resource==='food'?'Garden supply run':'Market supply run')+' · lots '+(link.from+1)+' and '+(link.to+1);
    const effect='1 extra '+(link.resource==='food'?'food':'fund')+' this week';
    const status=coverId?'covered':worker?'staffed':'vacant';
    const description=label+'. '+(coverId?(coverName||'A neighbour')+' covers this run and supplies '+effect+'.':
      worker?(profile(site,id)?.name||'The local porter')+' staffs this run and supplies '+effect+'.':
      'The porter now works elsewhere. The run needs cover to supply '+effect+'.');
    return {...link,label,status,coverId,coverName,description};
  }
  function coverage(site,world){
    const gaps=[];let links;
    for(const [id,m] of Object.entries(site.careers||{})){
      if(!residentHere(site,id))continue;
      const gap=m.departure,active=gap&&world.week<=gap.throughWeek,porter=porterSlot(id);
      const link=porter&&changedTrade(m)?activeLane(site,id,links??=operatingLinks(site)):null;
      if(active&&!(porter&&previousLane(m,link))){
        const jobId=departingPost(m),part=scope(site,gap,jobId);
        const round={personId:id,...gap};
        if(requiresCredential(jobId))round.credential=jobId;
        if(part==='admin'){round.adminId=gap.coverId;round.coverId=null;}
        gaps.push(round);
      }
      if(link){
        const cover=laneWorker(site,world,link),venue=link.resource==='food'?'garden':'market';
        gaps.push({personId:id,laneId:id,venue,oldRole:link.resource==='food'?'Garden courier':'Exchange porter',
          occupation:link.resource==='food'?'food':'exchange',coverId:cover,from:link.from,to:link.to});
      }
    }
    return gaps;
  }
  function weeklyAdjustment(site,world){
    const delta=root.EarthEmployers?.rates(site,world)||{};let links;
    const add=(key,amount)=>{delta[key]=(delta[key]||0)+amount;};
    for(const [id,m] of Object.entries(site.careers||{})){
      const j=get(jobs,m.jobId),p=profile(site,id);if(!p||!residentHere(site,id))continue;
      if(j && world.week>m.joinedWeek && (world.week-m.joinedWeek)%j.interval===0&&(!requiresCredential(j.id)||!onOtherDuty(site,id,m,world.week)))add(j.metric,1);
      if(m.specialistRelief?.week===world.week&&canCoverPost(site,id,m.specialistRelief.targetId)){
        add(jobs[m.specialistRelief.targetId].metric,1);add(replacementGoods[m.specialistRelief.occupation],-1);
      }
      if(m.reducedWorkWeek===world.week || m.training?.pace==='intensive'&&!m.training.paused)add(replacementGoods[(j||origin(p)).occupation],-1);
      if(m.relief?.week===world.week-1)add(replacementGoods[m.relief.occupation],1);
      const gap=m.departure;
      if(gap && world.week<=gap.throughWeek){
        const porter=porterSlot(id),link=porter?activeLane(site,id,links??=operatingLinks(site)):null;
        const laneDeparture=porter&&previousLane(m,link);
        // The link itself pays only when staffed. Its old employer must not
        // also lose a generic exchange unit for the same vacant assignment.
        const unstaffed=!gap.coverId||scope(site,gap,departingPost(m))==='admin';
        if(unstaffed&&!laneDeparture)add(replacementGoods[gap.occupation],-1);
        if(gap.coverId&&(!laneDeparture||link&&changedTrade(m))){
          const worker=profile(site,gap.coverId),coverJob=get(jobs,state(site,gap.coverId).jobId)||(worker&&origin(worker));
          const occupation=laneDeparture&&link.resource==='food'?'food':gap.occupation;
          if(coverJob && coverJob.occupation!==occupation)add(replacementGoods[coverJob.occupation],-1);
        }
      }
    }
    return delta;
  }
  function valid(site,week){
    if(site.employers!==undefined&&!root.EarthEmployers?.valid(site,week))return false;
    if(site.careers===undefined)return true;
    if(!record(site.careers))return false;
    const values=(map,keys,min,max)=>record(map)&&Object.entries(map).every(([k,n])=>keys.includes(k)&&int(n,min,max));
    const ids=catalog.map(j=>j.id);
    const personOK=id=>safeId(id)&&Boolean(profile(site,id)),reliefBookings=new Set();
    for(const [id,m] of Object.entries(site.careers)){
      if(!personOK(id)||!record(m)||!int(m.revision,1)||!values(m.skills,axes,0,100)||!values(m.qualifications,ids,1,week)||
        !values(m.portfolios,ids,0,3)||!values(m.references,[...ids,'origin'],-2,2)||!Array.isArray(m.history)||m.history.length>10||
        !m.history.every(h=>record(h)&&int(h.week,1,week)&&label(h.text)))return false;
      const owner=profile(site,id);
      if(Object.entries(m.skills).some(([axis,value])=>value<bounds(owner,axis).min||value>bounds(owner,axis).max))return false;
      const relief=m.specialistRelief;
      if(relief!==undefined&&(!record(relief)||!Object.hasOwn(specialistSites,relief.targetId)||!int(relief.week,2,week+1)||!Object.hasOwn(replacementGoods,relief.occupation)||(!int(m.lastPracticeWeek,relief.week-1,week))))return false;
      if(relief){
        const slot=relief.targetId+'/'+relief.week;if(reliefBookings.has(slot))return false;reliefBookings.add(slot);
      }
      if(m.relief!==undefined && (!record(m.relief)||!int(m.relief.week,1,week)||!Object.hasOwn(replacementGoods,m.relief.occupation)))return false;
      if(m.agreedPlan!=null && !get(jobs,m.agreedPlan))return false;
      const ref=m.latestReference;
      if(ref!==undefined && (!record(ref)||![...ids,'origin'].includes(ref.jobId)||!label(ref.employer)||!int(ref.quality,-2,2)||!int(ref.week,1,week)||m.references[ref.jobId]!==ref.quality))return false;
      if(m.jobId!=null && (!get(jobs,m.jobId)||!int(m.joinedWeek,1,week)))return false;
      if(m.dutyIndex!=null&&!int(m.dutyIndex,0,2))return false;
      if(m.experience!=null && (!values(m.experience,ids,0,week)||Object.values(m.experience).reduce((sum,n)=>sum+n,0)>week))return false;
      if(['lastPracticeWeek','lastTeachingWeek','processedWeek','reducedWorkWeek','manualWeek'].some(k=>m[k]!=null&&!int(m[k],1,week)))return false;
      const t=m.training,a=m.application,d=m.departure;
      if([a,d].some(v=>v?.coverScope!==undefined&&(!v.coverId||!['admin','qualified'].includes(v.coverScope))))return false;
      if(['training','application','departure'].some(k=>m[k]!==undefined&&!record(m[k])))return false;
      if(t&&(!get(jobs,t.targetId)||!int(t.credits,0,jobs[t.targetId].trainingWeeks-1)||!int(t.startedWeek,1,week)||!int(t.lastWeek,t.startedWeek,week)||
        !['evening','intensive'].includes(t.pace)||typeof t.paused!=='boolean'||typeof t.autonomous!=='boolean'))return false;
      if(t?.recognised!==undefined){
        const prior=t.recognised;
        if(!record(prior)||!relatedTrades[t.targetId]?.includes(prior.sourceId)||
          !int(prior.credits,1,Math.min(t.credits,Math.floor(jobs[t.targetId].trainingWeeks/4))))return false;
      }
      if(t?.placement!==undefined){
        const visit=t.placement;
        if(!record(visit)||!int(visit.week,t.startedWeek,week)||!label(visit.name)||visit.format!=null&&!['placement','review'].includes(visit.format)||
          ![jobs[t.targetId].skill,jobs[t.targetId].secondary].includes(visit.axis)||typeof visit.sample!=='boolean')return false;
      }
      if(a&&(!get(jobs,a.targetId)||!['screening','offer','notice','deferred','waiting'].includes(a.phase)||!int(a.dueWeek,1,week+8)||typeof a.autonomous!=='boolean'||a.appliedWeek!=null&&!int(a.appliedWeek,1,week)||
        a.phase==='waiting'&&(!Object.hasOwn(specialistSites,a.targetId)||!int(a.appliedWeek,1,week))||
        ['early','releaseAsked'].some(k=>a[k]!==undefined&&typeof a[k]!=='boolean')||a.phase==='deferred'&&!label(a.reason)||a.coverId!=null&&(!personOK(a.coverId)||a.coverId===id||!label(a.coverName))))return false;
      if(d&&(!label(d.oldRole)||!label(d.oldEmployer)||!Object.hasOwn(replacementGoods,d.occupation)||!int(d.throughWeek,1,week+2)||d.coverId!=null&&(!personOK(d.coverId)||d.coverId===id)))return false;
    }
    return true;
  }
  root.EarthCareers=Object.freeze({axes:Object.freeze(axes),catalog,fits:canFit,routes,rationale,waitingAlternative,placement,attendPlacement,canCoverPost,requiresCredential,handoverDuty,departureForMove,openings,serviceWeeks,specialistShift,coverCommitment,laneWorker,supplyLane,view,role,work,command,projectLesson,hobbyPractice,tick,weeklyAdjustment,coverage,valid});
})(typeof window==='undefined'?globalThis:window);
