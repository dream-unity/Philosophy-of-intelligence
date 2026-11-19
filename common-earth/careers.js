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
    job('convenor','Convenor','Community assembly','communication',50,'organisation',42,18,1,'exchange','hall','trust',3,'Bring neighbours together for decisions.')
  ]);
  const jobs=Object.fromEntries(catalog.map(j=>[j.id,j]));
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
  const people=site=>root.EarthPersonas?.list(site)||site.residents||[];
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
    const j=get(jobs,memory(site,id)?.jobId);
    return j?{id:j.id,role:j.label,label:j.label,employer:j.employer,venue:j.venue,occupation:j.occupation,service:j.service}:null;
  }
  const state=(site,id)=>memory(site,id)||{};
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
    if(teacher.lastPracticeWeek===week||student.lastPracticeWeek===week||specialistShift(site,mentorId,week)||specialistShift(site,learnerId,week)||root.EarthPurses?.committed?.(site,mentorId,week)||root.EarthPurses?.committed?.(site,learnerId,week))return {ok:false,reason:'One of us already used this week’s personal practice session.'};
    if(at>=bounds(pupil,axis).max||teaches-at<4)return {ok:false,reason:'This learner needs a different subject or a more experienced mentor.'};
    if(!commit)return {ok:true};
    const m=ensure(site,mentorId),s=ensure(site,learnerId),raised=gain(pupil,s,axis,Math.min(amount,teaches-at,3));
    m.lastTeachingWeek=week;m.lastPracticeWeek=week;s.lastPracticeWeek=week;
    gain(tutor,m,'communication',1);
    note(m,week,'Taught '+pupil.name+' '+axis+' during a practical demonstration.');
    note(s,week,'Gained '+raised+' '+axis+' through a practical demonstration with '+tutor.name+'.');
    m.revision++;s.revision++;
    return {ok:true,gain:raised};
  }
  function hobbyPractice(world,site,id,axis,commit=false,witness=null){
    const p=profile(site,id),week=world.week;
    if(!p||!axes.includes(axis))return {ok:false,reason:'Choose an interest that belongs to this person.'};
    if(state(site,id).lastPracticeWeek===week||specialistShift(site,id,week)||root.EarthPurses?.committed?.(site,id,week))return {ok:false,reason:'This week’s personal practice session is already used.'};
    if(!commit)return {ok:true};
    const m=ensure(site,id),other=witness&&profile(site,witness);
    const raised=gain(p,m,axis,other?2:1);
    m.lastPracticeWeek=week;m.revision++;
    note(m,week,'Practised '+axis+(other?' with feedback from '+other.name:' independently')+
      (raised?' and gained '+raised+' skill point'+(raised===1?'':'s')+'.':'. The session was for enjoyment at the current skill ceiling.'));
    return {ok:true,gain:raised};
  }
  function practicedGain(p,m,axis){
    const room=bounds(p,axis).max-skill(p,m,axis);
    return Math.min(room,clamp(Math.ceil(room/15),1,4));
  }
  const samples=(m,j)=>get(m.portfolios,j.id)||0;
  const qualified=(p,m,j)=>Boolean(get(m.qualifications,j.id)||origin(p).id===j.id);
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
  function canFit(p,j){
    return bounds(p,j.skill).max+6>=j.requiredSkill && bounds(p,j.secondary).max>=j.secondMinimum;
  }
  function consent(world,site,p,m,j,action,speaker){
    if(!speaker||speaker===p.id)return '';
    const playable=root.EarthAgency?.canPlay?.(site,p.id)??(p.kind!=='carrier'&&!/^carrier-/.test(p.id));
    if(['withdraw','release','pause','pace','accept','resume','leaveCourse'].includes(action)){
      return playable?'Play as '+p.name+' to make this decision about their employment or study.':
        p.name+' manages this decision personally. Meet them to discuss a course, application or offer.';
    }
    if(action==='mentor')return playable?'Play as '+p.name+' and meet the mentor.':
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
  function mentorFor(site,p,m,j,week){
    const learner=skill(p,m,j.skill);
    let best=null,level=-Infinity;
    for(const person of people(site)){
      if(person.id===p.id)continue;
      const other=state(site,person.id),score=skill(person,other,j.skill);
      if(score<learner+3||other.lastPracticeWeek===week||other.specialistRelief?.week===week||root.EarthPurses?.committed?.(site,person.id,week)||other.training?.pace==='intensive'&&!other.training.paused)continue;
      const priority=score+(root.EarthIntroductions?.level(site,p.id,person.id,j.skill,week)||0);
      if(!best||priority>level||priority===level&&person.id<best.id){best=person;level=priority;}
    }
    return best;
  }
  function coverFor(site,p,old,week){
    const link=porterSlot(p.id)&&['origin','courier'].includes(old.id)?activeLane(site,p.id):null;
    const occupation=link?.resource==='food'?'food':old.occupation;
    const axis={food:'care',repair:'craft',exchange:'organisation'}[occupation];
    const assigned=new Set(Object.values(site.careers||{}).flatMap(m=>[m.application?.coverId,m.departure?.coverId]).filter(Boolean));
    let best=null,bestScore=-1;
    for(const other of people(site)){
      if(other.id===p.id||assigned.has(other.id)||link&&porterSlot(other.id)&&!changedTrade(state(site,other.id))&&activeLane(site,other.id))continue;
      const m=state(site,other.id);
      if(m.application?.phase==='notice'||m.training?.pace==='intensive'&&!m.training.paused||m.specialistRelief?.week>=week||root.EarthPurses?.committed?.(site,other.id,week))continue;
      const post=get(jobs,m.jobId)||origin(other);
      const score=skill(other,m,axis)+(post.occupation===occupation?25:0);
      if(score>bestScore){best=other;bestScore=score;}
    }
    return best;
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
    const capacity=funded(site,jobs[targetId]),used=Object.values(site.careers||{}).filter(m=>m.jobId===targetId||reserves(m,targetId)).length;
    return Math.max(0,capacity-used);
  }
  function specialistShift(site,id,week){
    const relief=memory(site,id)?.specialistRelief,j=get(jobs,relief?.targetId);
    return j&&relief.week===week?{id:j.id,venue:j.venue,label:j.label,employer:j.employer,metric:j.metric,week}:null;
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
      if(v.specialistRelief?.targetId===j.id&&v.specialistRelief.week===week+1)reliefTaken=id;
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
    const used=today?.week===week&&['project','learn','apply','gather','preserve','cover','wage','visit','host'].includes(today.kind);
    const debt=used||life?.contribution?.week===week||m.lastPracticeWeek===week||m.specialistRelief?.week>=week||
      root.EarthPurses?.committed?.(site,p.id,week);
    const roster=site.workforce?.members?.[p.id],joint=Object.entries(site.autonomy?.projects?.owners||{}).some(([id,goal])=>
      goal.volunteer?.week===week&&(goal.volunteer.from===p.id||id===p.id));
    let reason='';
    if(current.id===j.id)reason='This person already holds the regular post.';
    else if(!qualified(p,m,j)||screening(p,m,j).length)reason='Finish the qualification and demonstrate the entry skills before covering an independent round.';
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
  function status(world,p,m,current){
    const a=m.application,t=m.training,j=get(jobs,a?.targetId);
    if(a?.phase==='screening')return j.employer+' is reviewing the application for '+j.label+'. A decision is due in week '+a.dueWeek+'. '+current.employer+' still employs '+p.name+'.';
    if(a?.phase==='waiting')return p.name+' met the '+j.label+' entry standard and is on the qualified waiting list. '+j.employer+' checks openings again in week '+a.dueWeek+'. Their current work and qualification continue.';
    if(a?.phase==='offer')return j.employer+' offered the '+j.label+' post. Accept by week '+a.dueWeek+' to begin notice at '+current.employer+'.';
    if(a?.phase==='notice')return p.name+' remains '+current.label+' until week '+a.dueWeek+', then starts at '+j.employer+'. '+(a.coverName?a.coverName+' will cover the old post.':'The former team still needs cover.');
    if(t){const target=jobs[t.targetId];return (t.paused?'Study paused at ':'Studying for '+target.label+' · ')+t.credits+'/'+target.trainingWeeks+' credits. '+(t.paused?'Completed credits are retained.':coursePhase(target,t.credits).phase+'. ')+(t.paused?'':t.pace==='intensive'?'Intensive study earns two credits per week and reduces working time.':'Evening study earns one credit each week after work.');
    }
    if(a?.phase==='deferred')return j.employer+' deferred the application. '+a.reason+' Reapply from week '+a.dueWeek+'.';
    return p.name+' works as '+current.label+' at '+current.employer+'.';
  }
  function view(world,site,id,targetId,context={}){
    const p=profile(site,id);if(!p||!world)return null;
    const m=state(site,id),a=m.application,t=m.training,week=world.week;
    const current=get(jobs,m.jobId)||origin(p);
    const j=get(jobs,targetId||a?.targetId||t?.targetId||current.id);
    const revision=m.revision||0,choices=[],posts=opening(world,site,p,m,j,current);
    const speaker=context.speakerId??root.EarthAgency?.actorId(site)??id;
    const skills=Object.fromEntries(axes.map(k=>[k,skill(p,m,k)]));
    function add(action,text,detail,gate='',extra={}){
      const reason=gate||consent(world,site,p,m,j,action,speaker);
      choices.push({id:action,targetId:j.id,label:text,detail,available:!reason,reason,expectedRevision:revision,...extra});
    }
    if(j){
      const studied=t?.targetId===j.id,enrolled=t&&!studied,active=a&&a.phase!=='deferred',appHere=a?.targetId===j.id;
      const sameJob=j.id===current.id;
      const canStudy=qualified(p,m,j);
      if(!canStudy&&!studied)add('enroll','Enrol in '+j.label+' training','Evening study keeps the current job. Complete '+j.trainingWeeks+' credits before employer assessment.',
        enrolled?'Finish, pause and leave, or resume your current course first.':'');
      if(studied){
        if(t.paused)add('resume','Resume training','Carry on with the '+t.credits+' completed credits.');
        else{
          const fast=t.pace==='intensive';
          add('pace',fast?'Switch to evening study':'Request an intensive timetable',fast?'Earn one credit each week and restore full time at work.':
            'Earn two credits each week. Until study finishes, the old team loses one weekly unit of its usual work.');
          add('pause','Pause this course','Keep the completed credits and regain full working time.');
        }
        if(t.paused)add('leaveCourse','Leave the course','Your acquired skills stay. Leaving releases the place and clears these course credits.');
      }
      const taken=m.lastPracticeWeek===week||m.specialistRelief?.week===week||site.autonomy?.people?.[id]?.contribution?.week===week||root.EarthPurses?.committed?.(site,id,week)?'This person already used their personal practice session this week.':'';
      if(posts&&!sameJob&&canStudy)add('specialistRelief','Cover a '+j.label.toLowerCase()+' round',posts.service,posts.relief.reason);
      const reference=employerReference(p,m,j);
      if(reference?.quality<0)add('relief','Take a relief shift for '+reference.employer,
        'Commit this week’s practice session to the former crew. They receive one '+replacementGoods[reference.occupation]+' next week and improve the reference by one point.',taken);
      const lastClass=axis=>skill(p,m,axis)>=bounds(p,axis).max?'At the upper end of this person’s '+axis+' range.':'';
      add('practice','Practise '+j.skill,'Build this skill through personal practice. Current '+skills[j.skill]+' of '+bounds(p,j.skill).max+'.',taken||lastClass(j.skill));
      add('support','Practise '+j.secondary,'Work on the second skill used by '+j.employer+'. Current '+skills[j.secondary]+' of '+bounds(p,j.secondary).max+'.',taken||lastClass(j.secondary));
      const mentor=context.matchPeople!==false&&!taken&&!lastClass(j.skill)?mentorFor(site,p,m,j,week):null;
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
          if(speaker===id)add('accept','Accept the offer','Start a notice period at '+current.employer+'. The new post begins after the handover.',committed);
          else add('discussOffer','Discuss the offer with '+p.name,'They weigh the offer against conditions at their current workplace and decide whether to give notice.',committed);
        }
        if(a.phase==='notice'){
          const cover=context.matchPeople!==false&&!a.coverId?coverFor(site,p,current,week):null;
          if(cover)add('handover','Arrange cover with '+cover.name,'They can take up the old duties through the first two weeks after departure. They may step away from their own trade.', '', {coverId:cover.id,coverName:cover.name});
          if(!a.releaseAsked&&a.dueWeek>week+1)add('release','Request an early release',current.employer+' can refuse if important work is uncovered. Leaving urgently without cover affects their future reference.');
        }else add('withdraw','Withdraw application','Keep the current job and all completed learning.');
      }else if(!sameJob && active)add('apply','Apply to '+j.employer,'Only one live job application is considered at a time.','Finish or withdraw the current application first.');
    }
    return {personId:id,name:p.name,career:current.label,careerId:current.id,employer:current.employer,
      skills,aptitude:Object.fromEntries(axes.map(k=>[k,aptitude(p,k)])),bounds:Object.fromEntries(axes.map(k=>[k,bounds(p,k)])),
      history:(m.history||[]).map(h=>({...h})),training:t?{...t,...coursePhase(jobs[t.targetId],t.credits)}:null,application:a?{...a}:null,
      qualifications:{...m.qualifications},portfolios:{...m.portfolios},references:{...m.references},latestReference:m.latestReference?{...m.latestReference}:null,agreedPlan:m.agreedPlan||null,
      targetId:j?.id,opening:posts,supplyLane:porterSlot(id)?supplyLane(site,world,id):null,qualified:j?qualified(p,m,j):false,missing:j?screening(p,m,j):[],
      fits:j?canFit(p,j):false,stage:a?.phase==='deferred'&&t?'training':a?.phase||(t?'training':'employed'),
      status:status(world,p,m,current),choices,revision};
  }
  function command(world,site,id,action,targetId,expectedRevision,proof,context={}){
    const p=profile(site,id),j=get(jobs,targetId),old=state(site,id);
    if(!p||!j||!world)return fail('Choose a known person and profession.');
    if((old.revision||0)!==expectedRevision)return fail('This career decision changed. Review the person’s current options.');
    const info=view(world,site,id,targetId,{...context,matchPeople:action==='mentor'||action==='handover'}),option=info.choices.find(c=>c.id===action);
    if(!option||!option.available)return fail(option?.reason||'This choice is unavailable at the current career stage.');
    const week=world.week, speaker=context.speakerId??root.EarthAgency?.actorId(site)??id;
    const adopted=speaker!==id&&['enroll','apply'].includes(action),autonomous=Boolean(context.autonomous||adopted);
    if(action==='mentor' && (!proof||proof.actor!==id||proof.target!==option.mentorId||proof.siteId!==site.id||
      proof.mode!=='walk'||![proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)||Math.hypot(proof.x-proof.tx,proof.y-proof.ty)>1.56))return fail('Meet the named mentor on foot for this lesson.');
    if(action==='handover'&&context.coverId && context.coverId!==option.coverId)return fail('The proposed colleague’s availability changed.');
    const m=ensure(site,id),current=get(jobs,m.jobId)||origin(p),a=m.application,t=m.training;
    let message;
    switch(action){
      case 'enroll':
        m.training={targetId,credits:0,startedWeek:week,lastWeek:week,pace:'evening',paused:false,autonomous};
        message=p.name+' enrolled in '+j.label+' training and kept their post at '+current.employer+'.';break;
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
          note(teacher,week,'Mentored '+p.name+' in '+axis+'.');teacher.revision++;who=' with '+guide.name;
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
      case 'discussOffer':
        if(site[replacementGoods[current.occupation]]<4 && (p.traits?.adaptability??50)<55 && j.occupation!==current.occupation){
          delete m.agreedPlan;a.phase='deferred';a.dueWeek=week+1;a.reason=p.name+' chose to stay while the former crew rebuilds its '+replacementGoods[current.occupation]+' stores.';
          message=a.reason+' They can consider the new employer again from week '+a.dueWeek+'.';break;
        }
        // A successful conversation means the applicant chooses to give notice.
      case 'accept':
        a.phase='notice';a.dueWeek=week+(current.trainingWeeks>=52?4:2);
        message=p.name+' accepted the offer. '+current.employer+' expects notice through week '+a.dueWeek+'.';break;
      case 'handover':
        a.coverId=option.coverId;a.coverName=option.coverName;delete a.releaseAsked;
        {const colleague=ensure(site,a.coverId);note(colleague,week,'Agreed to cover '+p.name+' at '+current.employer+'.');colleague.revision++;}
        message=option.coverName+' agreed to cover '+p.name+'’s duties at '+current.employer+' during the change.';break;
      case 'release':{
        const metric=replacementGoods[current.occupation];
        a.releaseAsked=true;
        if(!a.coverId && site[metric]<4)message=current.employer+' declined the early release. '+metric+' are low and nobody has agreed to cover. The original notice ends in week '+a.dueWeek+'.';
        else{a.early=true;a.dueWeek=week+1;message=current.employer+' agreed to release '+p.name+' next week.'+(a.coverId?' '+a.coverName+' will cover the handover.':' The unfilled post will affect the reference.');}
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
  function teach(p,m,j,oldCredits,newCredits){
    // Practice occurs throughout the term. Each milestone is earned only once.
    const delta=n=>Math.floor(newCredits*n/j.trainingWeeks)-Math.floor(oldCredits*n/j.trainingWeeks);
    gain(p,m,j.skill,delta(Math.min(24,Math.ceil(j.trainingWeeks/4))));
    gain(p,m,j.secondary,delta(Math.min(14,Math.ceil(j.trainingWeeks/7))));
  }
  function tick(world,site){
    const week=world.week,events=[],panel=[];
    for(const [id,m] of Object.entries(site.careers||{})){
      const p=profile(site,id);if(!p)continue;
      if(m.processedWeek===week)continue;
      const a=m.application,t=m.training;
      let changed=false;
      const announce=text=>{note(m,week,text);events.push(text);changed=true;};
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
        const prior=get(jobs,m.jobId)||origin(p),target=jobs[a.targetId];
        const reference=a.coverId?2:a.early?-2:1;
        m.references[prior.id]=reference;
        m.latestReference={jobId:prior.id,employer:prior.employer,quality:reference,week};
        if(m.agreedPlan===target.id)delete m.agreedPlan;
        m.departure={oldRole:prior.label,oldEmployer:prior.employer,occupation:prior.occupation,coverId:a.coverId||null,throughWeek:week+1};
        m.jobId=target.id;m.joinedWeek=week;delete m.application;
        announce(p.name+' started as '+target.label+' at '+target.employer+'. '+prior.employer+(a.coverId?' handed the work to '+a.coverName+' and recorded a strong reference.':a.early?' is short-staffed after the early release and recorded a poor reference.':' accepted the full notice and needs temporary cover.'));
      }
      if(m.specialistRelief&&week>m.specialistRelief.week){delete m.specialistRelief;changed=true;}
      if(m.relief && week>m.relief.week+1){delete m.relief;changed=true;}
      if(m.departure && week>m.departure.throughWeek){delete m.departure;changed=true;}
      if(changed){m.revision++;m.processedWeek=week;}
    }
    // Resolve expired reservations and actual handovers before awarding this
    // week's seats. Earlier submissions take priority, with demonstrated
    // skill, portfolio and a stable local ID deciding a simultaneous cohort.
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
    const id=routeId(link),m=memory(site,id);
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
      const gap=m.departure,active=gap&&world.week<=gap.throughWeek,porter=porterSlot(id);
      const link=porter&&changedTrade(m)?activeLane(site,id,links??=operatingLinks(site)):null;
      if(active&&!(porter&&previousLane(m,link)))gaps.push({personId:id,...gap});
      if(link){
        const cover=laneWorker(site,world,link),venue=link.resource==='food'?'garden':'market';
        gaps.push({personId:id,laneId:id,venue,oldRole:link.resource==='food'?'Garden courier':'Exchange porter',
          occupation:link.resource==='food'?'food':'exchange',coverId:cover,from:link.from,to:link.to});
      }
    }
    return gaps;
  }
  function weeklyAdjustment(site,world){
    const delta={};let links;
    const add=(key,amount)=>{delta[key]=(delta[key]||0)+amount;};
    for(const [id,m] of Object.entries(site.careers||{})){
      const j=get(jobs,m.jobId),p=profile(site,id);if(!p)continue;
      if(j && world.week>m.joinedWeek && (world.week-m.joinedWeek)%j.interval===0&&(!Object.hasOwn(specialistSites,j.id)||!onOtherDuty(site,id,m,world.week)))add(j.metric,1);
      if(m.specialistRelief?.week===world.week){
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
        if(!gap.coverId){if(!laneDeparture)add(replacementGoods[gap.occupation],-1);}
        else if(!laneDeparture||link&&changedTrade(m)){
          const worker=profile(site,gap.coverId),coverJob=get(jobs,state(site,gap.coverId).jobId)||(worker&&origin(worker));
          const occupation=laneDeparture&&link.resource==='food'?'food':gap.occupation;
          if(coverJob && coverJob.occupation!==occupation)add(replacementGoods[coverJob.occupation],-1);
        }
      }
    }
    return delta;
  }
  function valid(site,week){
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
      if(['lastPracticeWeek','lastTeachingWeek','processedWeek','reducedWorkWeek','manualWeek'].some(k=>m[k]!=null&&!int(m[k],1,week)))return false;
      const t=m.training,a=m.application,d=m.departure;
      if(['training','application','departure'].some(k=>m[k]!==undefined&&!record(m[k])))return false;
      if(t&&(!get(jobs,t.targetId)||!int(t.credits,0,jobs[t.targetId].trainingWeeks-1)||!int(t.startedWeek,1,week)||!int(t.lastWeek,t.startedWeek,week)||
        !['evening','intensive'].includes(t.pace)||typeof t.paused!=='boolean'||typeof t.autonomous!=='boolean'))return false;
      if(a&&(!get(jobs,a.targetId)||!['screening','offer','notice','deferred','waiting'].includes(a.phase)||!int(a.dueWeek,1,week+8)||typeof a.autonomous!=='boolean'||a.appliedWeek!=null&&!int(a.appliedWeek,1,week)||
        a.phase==='waiting'&&(!Object.hasOwn(specialistSites,a.targetId)||!int(a.appliedWeek,1,week))||
        ['early','releaseAsked'].some(k=>a[k]!==undefined&&typeof a[k]!=='boolean')||a.phase==='deferred'&&!label(a.reason)||a.coverId!=null&&(!personOK(a.coverId)||a.coverId===id||!label(a.coverName))))return false;
      if(d&&(!label(d.oldRole)||!label(d.oldEmployer)||!Object.hasOwn(replacementGoods,d.occupation)||!int(d.throughWeek,1,week+2)||d.coverId!=null&&(!personOK(d.coverId)||d.coverId===id)))return false;
    }
    return true;
  }
  root.EarthCareers=Object.freeze({axes:Object.freeze(axes),catalog,fits:canFit,openings,specialistShift,coverCommitment,laneWorker,supplyLane,view,role,work,command,projectLesson,hobbyPractice,tick,weeklyAdjustment,coverage,valid});
})(typeof window==='undefined'?globalThis:window);
