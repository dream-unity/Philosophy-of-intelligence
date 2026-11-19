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
    if(teacher.lastPracticeWeek===week||student.lastPracticeWeek===week)return {ok:false,reason:'One of us already used this week’s personal practice session.'};
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
    if(state(site,id).lastPracticeWeek===week)return {ok:false,reason:'This week’s personal practice session is already used.'};
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
  function consent(world,p,m,j,action,speaker){
    if(!speaker||speaker===p.id)return '';
    const playable=p.kind!=='carrier'&&!/^carrier-/.test(p.id);
    if(['withdraw','release','pause','pace','accept','resume','leaveCourse'].includes(action)){
      return playable?'Play as '+p.name+' to make this decision about their employment or study.':
        p.name+' manages this decision personally. Meet them to discuss a course, application or offer.';
    }
    if(action==='mentor')return playable?'Play as '+p.name+' and meet the mentor.':
      p.name+' arranges their own lessons. You can meet them to suggest practice or a work sample.';
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
      if(score<learner+3||other.lastPracticeWeek===week||other.training?.pace==='intensive'&&!other.training.paused)continue;
      const priority=score+(root.EarthIntroductions?.level(site,p.id,person.id,j.skill,week)||0);
      if(!best||priority>level||priority===level&&person.id<best.id){best=person;level=priority;}
    }
    return best;
  }
  function coverFor(site,p,old){
    const axis={food:'care',repair:'craft',exchange:'organisation'}[old.occupation];
    const assigned=new Set(Object.values(site.careers||{}).flatMap(m=>[m.application?.coverId,m.departure?.coverId]).filter(Boolean));
    let best=null,bestScore=-1;
    for(const other of people(site)){
      if(other.id===p.id||assigned.has(other.id))continue;
      const m=state(site,other.id);
      if(m.application?.phase==='notice'||m.training?.pace==='intensive'&&!m.training.paused)continue;
      const post=get(jobs,m.jobId)||origin(other);
      const score=skill(other,m,axis)+(post.occupation===old.occupation?25:0);
      if(score>bestScore){best=other;bestScore=score;}
    }
    return best;
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
    const revision=m.revision||0,choices=[];
    const speaker=context.speakerId??root.EarthAgency?.actorId(site)??id;
    const skills=Object.fromEntries(axes.map(k=>[k,skill(p,m,k)]));
    function add(action,text,detail,gate='',extra={}){
      const reason=gate||consent(world,p,m,j,action,speaker);
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
      const taken=m.lastPracticeWeek===week||site.autonomy?.people?.[id]?.contribution?.week===week?'This person already used their personal practice session this week.':'';
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
          const through=coverCommitment(site,id,week);
          const committed=through?'The worker promised cover through week '+through+'. The offer can be reconsidered after that shift.':'';
          if(speaker===id)add('accept','Accept the offer','Start a notice period at '+current.employer+'. The new post begins after the handover.',committed);
          else add('discussOffer','Discuss the offer with '+p.name,'They weigh the offer against conditions at their current workplace and decide whether to give notice.',committed);
        }
        if(a.phase==='notice'){
          const cover=context.matchPeople!==false&&!a.coverId?coverFor(site,p,current):null;
          if(cover)add('handover','Arrange cover with '+cover.name,'They can take up the old duties through the first two weeks after departure. They may step away from their own trade.', '', {coverId:cover.id,coverName:cover.name});
          if(!a.releaseAsked&&a.dueWeek>week+1)add('release','Request an early release',current.employer+' can refuse if important work is uncovered. Leaving urgently without cover affects their future reference.');
        }else add('withdraw','Withdraw application','Keep the current job and all completed learning.');
      }else if(!sameJob && active)add('apply','Apply to '+j.employer,'Only one live job application is considered at a time.','Finish or withdraw the current application first.');
    }
    return {personId:id,name:p.name,career:current.label,careerId:current.id,employer:current.employer,
      skills,aptitude:Object.fromEntries(axes.map(k=>[k,aptitude(p,k)])),bounds:Object.fromEntries(axes.map(k=>[k,bounds(p,k)])),
      history:(m.history||[]).map(h=>({...h})),training:t?{...t,...coursePhase(jobs[t.targetId],t.credits)}:null,application:a?{...a}:null,
      qualifications:{...m.qualifications},portfolios:{...m.portfolios},references:{...m.references},latestReference:m.latestReference?{...m.latestReference}:null,agreedPlan:m.agreedPlan||null,
      targetId:j?.id,qualified:j?qualified(p,m,j):false,missing:j?screening(p,m,j):[],
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
        m.application={targetId,phase:'screening',dueWeek:week+2,autonomous};
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
    const week=world.week,events=[];
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
      if(a && a.phase==='screening' && week>=a.dueWeek){
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
      if(m.relief && week>m.relief.week+1){delete m.relief;changed=true;}
      if(m.departure && week>m.departure.throughWeek){delete m.departure;changed=true;}
      if(changed){m.revision++;m.processedWeek=week;}
    }
    return events;
  }
  function coverage(site,world){
    const gaps=[];
    for(const [id,m] of Object.entries(site.careers||{})){
      if(m.departure && world.week<=m.departure.throughWeek)gaps.push({personId:id,...m.departure});
    }
    return gaps;
  }
  function weeklyAdjustment(site,world){
    const delta={};
    const add=(key,amount)=>{delta[key]=(delta[key]||0)+amount;};
    for(const [id,m] of Object.entries(site.careers||{})){
      const j=get(jobs,m.jobId),p=profile(site,id);if(!p)continue;
      if(j && world.week>m.joinedWeek && (world.week-m.joinedWeek)%j.interval===0)add(j.metric,1);
      if(m.reducedWorkWeek===world.week || m.training?.pace==='intensive'&&!m.training.paused)add(replacementGoods[(j||origin(p)).occupation],-1);
      if(m.relief?.week===world.week-1)add(replacementGoods[m.relief.occupation],1);
      const gap=m.departure;
      if(gap && world.week<=gap.throughWeek){
        if(!gap.coverId)add(replacementGoods[gap.occupation],-1);
        else{
          const worker=profile(site,gap.coverId),coverJob=get(jobs,state(site,gap.coverId).jobId)||(worker&&origin(worker));
          if(coverJob && coverJob.occupation!==gap.occupation)add(replacementGoods[coverJob.occupation],-1);
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
    const personOK=id=>safeId(id)&&Boolean(profile(site,id));
    for(const [id,m] of Object.entries(site.careers)){
      if(!personOK(id)||!record(m)||!int(m.revision,1)||!values(m.skills,axes,0,100)||!values(m.qualifications,ids,1,week)||
        !values(m.portfolios,ids,0,3)||!values(m.references,[...ids,'origin'],-2,2)||!Array.isArray(m.history)||m.history.length>10||
        !m.history.every(h=>record(h)&&int(h.week,1,week)&&label(h.text)))return false;
      const owner=profile(site,id);
      if(Object.entries(m.skills).some(([axis,value])=>value<bounds(owner,axis).min||value>bounds(owner,axis).max))return false;
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
      if(a&&(!get(jobs,a.targetId)||!['screening','offer','notice','deferred'].includes(a.phase)||!int(a.dueWeek,1,week+8)||typeof a.autonomous!=='boolean'||
        ['early','releaseAsked'].some(k=>a[k]!==undefined&&typeof a[k]!=='boolean')||a.phase==='deferred'&&!label(a.reason)||a.coverId!=null&&(!personOK(a.coverId)||a.coverId===id||!label(a.coverName))))return false;
      if(d&&(!label(d.oldRole)||!label(d.oldEmployer)||!Object.hasOwn(replacementGoods,d.occupation)||!int(d.throughWeek,1,week+2)||d.coverId!=null&&(!personOK(d.coverId)||d.coverId===id)))return false;
    }
    return true;
  }
  root.EarthCareers=Object.freeze({axes:Object.freeze(axes),catalog,fits:canFit,view,role,work,command,projectLesson,hobbyPractice,tick,weeklyAdjustment,coverage,valid});
})(typeof window==='undefined'?globalThis:window);
