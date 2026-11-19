/* Neighbours spend one discretionary work session at a time. Supplies are paid
   before work begins. Results are earned once, by the people who finish the job. */
(function(root){
  'use strict';
  const plans={
    research:{venue:'workshop',axis:'numeracy',total:4,cost:1,titles:['Test which seed trays lose the least water','Measure where deliveries lose time','Compare packing methods for soft produce','Test a more readable tool-setting guide'],steps:['Agree on a comparison','Take the first measurements','Repeat the observations','Ask a neighbour to check the result'],
      goals:['Produce a field note another grower can test','Find a delivery change the co-op can try','Find out which packing method protects a second load','Leave instructions a new apprentice can follow'],benefit:'Two tested field notes become available for a later food round or practical lesson.'},
    build:{venue:'workshop',axis:'craft',total:4,cost:2,titles:['Build a stackable pantry crate','Fit a carrying rack for collections','Make a shallow tray for fragile food','Fit a removable divider to a collection box'],steps:['Measure a load with its user','Cut and prepare the fittings','Assemble the frame','Load-test it with another worker'],
      goals:['Carry more produce in a single pantry run','Make heavy collections easier to carry','Keep ripe produce intact on the way home','Let two households share one collection box'],benefit:'A finished carrier provides three load assists for later food rounds.'},
    food:{venue:'garden',axis:'care',total:3,cost:0,titles:['Collect surplus for the doorstep pantry','Organise a second harvest round','Arrange an after-shift food collection','Recover sound produce from the sorting table','Fill the pantry’s smaller household baskets'],steps:['Find growers with food to spare','Sort and prepare the collection','Deliver the load with a neighbour'],
      goals:['Reach a household that misses collection','Bring the second picking into the shared pantry','Leave food for people who finish work late','Keep good food from being thrown away','Make a pantry collection manageable on foot'],benefit:'The crew delivers two food. A carrier or a field note can recover one additional food, using one assist.'},
    hobby:{venue:'bench',axis:'music',total:3,cost:0,titles:['Develop a favourite pastime'],steps:['Choose a small challenge','Practise the difficult part','Try the finished piece'],
      goals:['Improve something I enjoy doing outside work'],benefit:'The owner develops their personal skill within its learning ceiling. A willing neighbour can offer feedback.'},
    teach:{venue:'hall',axis:'communication',total:3,cost:0,titles:['Teach a neighbour a practical skill','Work through a difficult skill together'],steps:['Find a learner who wants the session','Rehearse a practical example','Let the learner demonstrate it'],
      goals:['Help someone do a task independently','Pass on knowledge through supervised practice'],benefit:'The learner gains up to two skill points, or three with a tested field note. Both people use their personal practice session.'}
  };
  const kinds=Object.keys(plans),axes=['numeracy','music','communication','care','craft','stamina','organisation'];
  const trades={research:/repairer|mathemat|scien|engineer|genetic|seed keep/i,build:/carpent|craft|mechanic|builder/i,food:/grower|baker|cook|trader|courier|porter/i,teach:/convenor|teach|nurs|musici|steward/i,hobby:/artist|writer|musici/i};
  const hobbyTopics={
    music:['Learn a tune for a neighbour','Pick a tune within reach','Rehearse one difficult phrase','Play the whole tune'],
    numeracy:['Make a puzzle someone else can solve','Choose a problem','Check the possible answers','Try the clues with fresh eyes'],
    communication:['Tell a local story in my own words','Pick a story to tell','Rehearse the awkward passage','Give a short reading'],
    care:['Grow a cutting as a gift','Choose a cutting','Tend the new roots','Prepare the rooted plant to share'],
    craft:['Make a small keepsake by hand','Sketch a keepsake','Practise the hardest detail','Show the finished piece'],
    stamina:['Learn a longer walking circuit','Choose a manageable route','Try the difficult section','Walk the complete circuit'],
    organisation:['Put a personal collection in order','Choose an organising question','Try a small classification','Share the finished index']
  };
  const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
  const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
  const record=x=>x!=null&&typeof x==='object'&&!Array.isArray(x);
  const person=(site,id)=>root.EarthPersonas?.profile(site,id)||site.residents?.find(p=>p.id===id);
  const selected=(site,world)=>site.id===world.activeId?(root.EarthAgency?.actorId(site)||site.agency?.actor||'steward'):null;
  const jobRole=(site,p)=>root.EarthCareers?.role(site,p.id)||p.originRole||p.role||'community member';
  const multiply=Math.imul;
  function hash(s,n=2166136261){
    for(let i=0;i<s.length;i++)n=multiply(n^s.charCodeAt(i),16777619);
    return n>>>0;
  }
  function aptitude(p,axis,site){return site.careers?.[p.id]?.skills?.[axis]??p.aptitudes?.[axis]??45;}
  function field(site,world,owner,previous){
    const serial=(previous?.serial||0)+1;
    const seed=hash([site.id,site.lat,owner.id,serial].join('|')),order=hash(seed+'-');
    const role=jobRole(site,owner);
    const need=site.food<2*Math.ceil(site.population/5),supplies=site.autonomy?.projects;
    const sorted=kinds.map((kind,i)=>{
      const plan=plans[kind],social=kind==='teach'?owner.traits?.sociability:kind==='research'?owner.traits?.curiosity:owner.traits?.initiative;
      const personal=(aptitude(owner,kind==='hobby'?(owner.hobbyAxis||'music'):plan.axis,site)+(social??50))/5;
      const familiarity=trades[kind].test(role)?19:0,variation=hash(String(i),order)%19;
      const backlog=kind==='research'?(supplies?.notes||0):kind==='build'?(supplies?.assists||0):0;
      const score=personal+familiarity+variation+(kind==='food'&&need?8:0)-backlog*4-(previous?.kind===kind?26:0);
      return {kind,score};
    }).sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind));
    const repairer=owner.originRole==='Repairer'&&owner.hobbyAxis==='music';
    const kind=(serial===1&&repairer||serial%4===0&&previous?.kind!=='hobby')?'hobby':sorted[0].kind;
    const skills=axes.slice().sort((a,b)=>aptitude(owner,b,site)-aptitude(owner,a,site));
    return {kind,variant:seed%plans[kind].titles.length,serial,started:world.week,progress:0,
      axis:kind==='teach'?skills[0]:kind==='hobby'?(owner.hobbyAxis||skills[0]):plans[kind].axis,
      partnerId:null,beneficiaryId:null,lastWorked:null,finished:null,blocked:null};
  }
  function state(site){
    site.autonomy||={week:0,people:Object.create(null),effects:{}};
    return site.autonomy.projects||={notes:0,assists:0,owners:Object.create(null)};
  }
  function jobId(id,project){return id+'/'+project.serial;}
  function evidence(id,p){
    return {ownerId:id,serial:p.serial,kind:p.kind,variant:p.variant,axis:p.axis,week:p.finished,
      partnerId:p.partnerId,beneficiaryId:p.beneficiaryId,result:p.result,...(p.input?{input:{...p.input}}:{}),...(p.delivered?{delivered:p.delivered}:{}),...(p.caught?{caught:p.caught}:{}),...(p.carriedBy?{carriedBy:p.carriedBy}:{})};
  }
  function evidenceRows(store){
    if(store?.completed)return store.completed;
    return Object.entries(store?.owners||{}).filter(([,p])=>p.finished).map(([id,p])=>evidence(id,p))
      .sort((a,b)=>b.week-a.week||a.ownerId.localeCompare(b.ownerId)).slice(0,16);
  }
  function completions(site){
    return evidenceRows(site?.autonomy?.projects).map(e=>{
      const title=e.kind==='hobby'?hobbyTopics[e.axis][0]:e.kind==='teach'?'Teach '+e.axis:plans[e.kind].titles[e.variant];
      return {id:jobId(e.ownerId,e),kind:e.kind,axis:e.axis,week:e.week,title,result:e.result,ownerId:e.ownerId,
        ownerName:person(site,e.ownerId)?.name||null,partnerId:e.partnerId,partnerName:e.partnerId?person(site,e.partnerId)?.name||null:null,
        beneficiaryId:e.beneficiaryId,beneficiaryName:e.beneficiaryId?person(site,e.beneficiaryId)?.name||null:null,
        input:e.input?{...e.input,ownerName:person(site,e.input.ownerId)?.name||null}:null};
    });
  }
  function latestHarvest(site,week){
    const e=site.autonomy?.projects?.completed?.find(e=>e.week===week&&e.kind==='food'&&e.delivered);
    return e?{by:e.ownerId,amount:e.caught||e.delivered,...(e.caught?{source:'catch'}:{})}:null;
  }
  function ownerOf(site,id){
    const owners=site.autonomy?.projects?.owners;
    return own(owners,id)?owners[id]:null;
  }
  function joining(site,world,id,from,commit=false){
    const owner=person(site,id),helper=person(site,from);
    if(!owner||!helper||from===id)return {ok:false,reason:'Meet the person whose project you want to help.'};
    const current=site.autonomy?.projects,ephemeral=!ownerOf(site,id),p=ownerOf(site,id)||field(site,world,owner,null);
    if(p.finished)return {ok:false,reason:'This project is complete.'};
    if(site.careers?.[id]?.specialistRelief?.week===world.week+1||site.careers?.[from]?.specialistRelief?.week===world.week+1)
      return {ok:false,reason:'Next week already includes an agreed specialist relief round. We can plan another shared session after it.'};
    const existing=Object.values(current?.owners||{}).find(goal=>goal.volunteer?.from===from&&goal.volunteer.week===world.week);
    if(existing||p.volunteer?.week===world.week)return {ok:false,reason:'A shared session has already been agreed for next week.'};
    const block=resourceBlock(site,p,current||{notes:0,assists:0});
    if(block)return {ok:false,reason:block};
    const a=site.residents?.find(r=>r.id===id),b=site.residents?.find(r=>r.id===from);
    if(a&&b&&(site.neighbourWork?.links?.[[a.slot,b.slot].sort().join('-')]||0)<0)
      return {ok:false,reason:'Our last shared work was strained. I would like to rebuild trust before we book another session.'};
    const familiar=root.EarthDialogue?.familiar?.(site,id,from,world.week)||root.EarthIntroductions?.level?.(site,from,id,p.axis,world.week)>0||
      site.agency?.meals?.some(m=>m.week>=world.week-2&&(m.from===id&&m.to===from||m.from===from&&m.to===id));
    if(p.kind==='hobby'&&p.progress<2&&(owner.traits?.sociability??50)<38&&!familiar)
      return {ok:false,reason:'I would like to practise on my own first. Get to know me, or come back when I have something to show.'};
    if(p.kind==='teach'){
      if(p.partnerId&&p.partnerId!==from)return {ok:false,reason:'I am finishing this lesson with the learner I promised to teach.'};
      const teach=root.EarthCareers?.projectLesson?.({week:world.week+1},site,id,from,p.axis,false);
      if(!teach?.ok)return {ok:false,reason:teach?.reason||'I need a learner who can use this practice.'};
    }
    if(!commit)return {ok:true,projectId:jobId(id,p)};
    const store=state(site);
    if(ephemeral)Object.defineProperty(store.owners,id,{value:p,enumerable:true,configurable:true,writable:true});
    p.volunteer={from,week:world.week};p.blocked=null;
    return {ok:true,message:owner.name+' accepted '+helper.name+'’s offer of a shared session in week '+(world.week+1)+'. Their next task is to '+(p.kind==='hobby'?hobbyTopics[p.axis][p.progress+1]:plans[p.kind].steps[p.progress]).toLowerCase()+'.'};
  }
  function releaseOffers(site,world,events){
    for(const [id,p] of Object.entries(site.autonomy?.projects?.owners||{})){
      if(!p.volunteer||p.volunteer.week>=world.week)continue;
      const from=person(site,p.volunteer.from),owner=person(site,id);
      if(owner&&from)events.push(owner.name+' and '+from.name+' postponed their agreed work session. '+
        (selected(site,world)===id?owner.name+' is choosing their own activities.':p.blocked||'Another commitment came first.'));
      delete p.volunteer;
    }
  }
  function needFor(p){return plans[p.kind].cost;}
  function needsPartner(p){return p.kind==='teach'?p.progress!==1:p.progress===plans[p.kind].total-1;}
  function reserve(site){
    // Leave basic repair supplies and any named bench promise with the district.
    const promise=site.residents?.find(p=>p.slot===1)?.promise;
    return 2+(promise?Math.max(0,2-(promise.advance?.materials||0)):0);
  }
  function putSupplies(store,kind,count,ownerId){
    const name=kind+'From',before=store[kind],added=Math.min(count,6-before);
    const shelf=store[name]||=Array(before).fill(null);
    for(let i=0;i<added;i++)shelf.push(ownerId);
    store[kind]+=added;return added;
  }
  function useSupply(store,kind){
    if(!store[kind])return null;
    const shelf=store[kind+'From']||=Array(store[kind]).fill(null);
    store[kind]--;return shelf.shift()||null;
  }
  function resourceBlock(site,p,store){
    const cost=needFor(p);
    if(p.kind==='food'&&p.crop==='fish'&&site.handline&&!site.buildings?.some(b=>b.kind==='fishingDock'))return 'Someone is using the shared handline. I will wait for the float to be brought in.';
    if(p.progress===0 && cost && (site.materials||0)<cost+reserve(site))
      return 'Waiting for '+cost+' spare material'+(cost===1?'':'s')+' after the district repair reserve.';
    if(p.kind==='build'&&p.progress===0&&store.assists>=4)return 'Existing carriers can still take several loads. The crew is using those first.';
    if(p.kind==='research'&&p.progress===0&&store.notes>=4)return 'The co-op still has untried field notes. The next experiment waits for a field trial.';
    if(p.progress===plans[p.kind].total-1&&p.kind==='research'&&store.notes>=6)return 'The field-note shelf is full. I need a crew to try one before I publish ours.';
    if(p.progress===plans[p.kind].total-1&&p.kind==='build'&&store.assists>=6)return 'The collection crews have enough spare carriers. I will finish the handover when they take one out.';
    return '';
  }
  function why(site,owner,p){
    const goal=plans[p.kind].goals[p.variant],role=jobRole(site,owner).toLowerCase();
    if(p.kind==='teach')return 'In my work as '+role+' I have learned '+p.axis+'. I want a neighbour to be able to use it without me.';
    if(p.kind==='hobby')return owner.outsideWork||'I want to spend time on '+p.axis+' outside my regular job.';
    if(p.kind==='research')return 'I want to check the measurements before people change how they work. '+goal+'.';
    if(p.kind==='build')return 'I can use my hands to solve a problem somebody else has on collection day. '+goal+'.';
    return site.food<2*Math.ceil(site.population/5)?'Our stores cover less than two weeks of meals. A second collection would help now.':'Some growers have a little left after the first collection. I want it to reach a neighbour.';
  }
  function projectStep(p,plan,crop){
    if(p.kind==='hobby')return hobbyTopics[p.axis][p.progress+1];
    if(!crop)return plan.steps[p.progress];
    if(crop.id==='fish')return ['Choose a station at the quay','Tend the fishing line at the shore station','Land the fish with a neighbour and take them to the pantry'][p.progress];
    return ['Arrange a picking with the '+crop.place+' crew','Sort the '+crop.name+' at the '+crop.place,'Carry the '+crop.name+' to the pantry'][p.progress];
  }
  function publicView(site,world,id,intent){
    let ownerId=id,p=ownerOf(site,id);
    if(intent?.kind==='project'&&intent.week===world.week){
      const marker=intent.projectId?.lastIndexOf('/'),actingOwner=marker>0?intent.projectId.slice(0,marker):null,shared=ownerOf(site,actingOwner);
      if(shared&&jobId(actingOwner,shared)===intent.projectId){ownerId=actingOwner;p=shared;}
    }
    const owner=person(site,ownerId);if(!owner)return null;
    if(!p){
      if(id===selected(site,world))return null;
      p=field(site,world,owner,null);
    }
    const plan=plans[p.kind],partner=p.partnerId&&person(site,p.partnerId),benefit=p.beneficiaryId&&person(site,p.beneficiaryId);
    const tracker=site.autonomy?.projects||{notes:0,assists:0};
    const blocked=p.blocked||(!p.finished&&resourceBlock(site,p,tracker))||null;
    const crop=p.kind==='food'?root.EarthResources?.projectCrop(world,site,ownerId,p.crop):null;
    const title=p.kind==='teach'?'Teach '+p.axis+' through a practical example':p.kind==='hobby'?hobbyTopics[p.axis][0]:plan.titles[p.variant];
    const step=projectStep(p,plan,crop);
    const next=p.finished?'The work is complete. Its result is recorded in the district.':blocked||step+'.';
    return {id:jobId(ownerId,p),kind:p.kind,title,goal:p.kind==='teach'?'Help a neighbour practise '+p.axis:plan.goals[p.variant],
      why:why(site,owner,p),venue:crop?.venue||plan.venue,phase:p.finished?'Completed':p.volunteer?'Shared session agreed':blocked?'Waiting':p.progress?'In progress':'Proposed',
      progress:p.progress,total:plan.total,ownerId,ownerName:owner.name,partnerId:partner?.id||null,partnerName:partner?.name||null,
      beneficiaryId:benefit?.id||null,beneficiaryName:benefit?.name||null,role:id===ownerId?'Organiser':p.kind==='teach'?'Learner':'Collaborator',
      axis:p.axis,next,effect:p.finished?p.result:plan.benefit,materialCost:plan.cost,finishedWeek:p.finished,
      supplies:{fieldNotes:tracker.notes,loadAssists:tracker.assists},
      volunteerId:p.volunteer?.from||null,volunteerName:p.volunteer&&person(site,p.volunteer.from)?.name||null};
  }
  function pastime(site,id,sessions){
    const owner=person(site,id);if(!owner||!sessions)return null;
    const axis=sessions.axis,topic=hobbyTopics[axis],progress=(sessions.count-1)%3+1,finished=progress===3;
    return {id:id+'/pastime-'+Math.ceil(sessions.count/3),kind:'hobby',title:topic[0],goal:'Spend time on '+axis+' outside work',
      why:owner.outsideWork,venue:'bench',phase:finished?'Completed':'In progress',progress,total:3,ownerId:id,ownerName:owner.name,
      partnerId:null,partnerName:null,beneficiaryId:null,beneficiaryName:null,role:'Practitioner',axis,
      next:finished?'Choose another challenge when you want to practise again.':topic[progress+1]+'.',
      effect:'These sessions earned '+sessions.gained+' '+axis+' within the individual learning range.',finishedWeek:finished?sessions.lastWeek:null,materialCost:0};
  }
  function prepare(site,world,all){
    const store=state(site),tasks=[];
    for(const self of all){
      if(self.id===selected(site,world))continue;
      let p=ownerOf(site,self.id);
      if(!p||p.finished&&world.week-p.finished>=3){
        p=field(site,world,self.profile,p);
        if(!['teach','hobby'].includes(p.kind)){
          let best=-Infinity;const order=hash(p.kind+world.week+self.id);
          for(const q of all){
            if(q===self||q.id===selected(site,world))continue;
            const relevance=p.kind==='food'?(8-q.row.energy)*3:
              p.kind==='build'&&/courier|porter|grower|driver/i.test(q.profile.role)?15:
              p.kind==='research'&&q.row.path?12:0;
            const score=relevance+hash(q.id,order)%13;
            if(score>best){best=score;p.beneficiaryId=q.id;}
          }
        }
        Object.defineProperty(store.owners,self.id,{value:p,enumerable:true,configurable:true,writable:true});
      }
      if(p.finished)continue;
      p.blocked=resourceBlock(site,p,store)||null;
      if(!self.free){p.blocked=(self.base.reason||'I already made another commitment.').slice(0,199);continue;}
      if(p.blocked)continue;
      const wait=Math.min(24,(world.week-(p.lastWorked||p.started))*3);
      const volunteer=p.volunteer?.week===world.week-1?all.find(q=>q.id===p.volunteer.from):null;
      const score=(volunteer?145:53)+wait+(p.progress?6:0)+(self.traits.initiative??50)/8+(self.wasAdvised==='project'?35:0)+
        (p.kind==='food'&&site.food<2*Math.ceil(site.population/5)?5:0);
      tasks.push({kind:'project',self,score,project:p,volunteer});
    }
    return {store,tasks,places:new Map(),paid:0};
  }
  function partnerFor(site,world,self,p,all){
    const willing=all.filter(q=>q!==self&&q.free&&q.wasAdvised!=='rest'&&
      (p.kind!=='teach'||!p.partnerId||p.partnerId===q.id)&&
      !(self.slot!=null&&q.slot!=null&&(site.neighbourWork?.links?.[[self.slot,q.slot].sort().join('-')]||0)<0)&&
      !(q.row.energy<3&&q.traits.patience<65)&&
      !(p.kind==='teach'&&!root.EarthCareers?.projectLesson?.(world,site,self.id,q.id,p.axis,false)?.ok));
    if(!willing.length)return null;
    const order=hash(self.id+'|');
    const score=q=>{
      const fit=p.kind==='teach'?aptitude(self.profile,p.axis,site)-aptitude(q.profile,p.axis,site):aptitude(q.profile,p.axis,site)/2;
      const trust=site.agency?.meals?.some(m=>m.week>=world.week-2&&(m.to===q.id&&m.from===self.id||m.to===self.id&&m.from===q.id))?9:0;
      const listening=root.EarthDialogue?.familiar?.(site,self.id,q.id,world.week)?6:0;
      return fit+q.traits.sociability/8+(q.id===p.partnerId?13:0)+trust+listening+(hash(q.id+'|'+world.week,order)%6);
    };
    const laneWorkers=new Set();
    if(p.kind==='food'&&p.progress===plans.food.total-1){
      for(const link of root.CommonEarthSim?.productiveLinks?.(site)||[]){
        if(link.resource!=='food')continue;
        const worker=root.EarthCareers?.laneWorker?.(site,world,link);
        if(worker)laneWorkers.add(worker);
      }
    }
    let best=null,highest=-Infinity;
    for(const q of willing){
      const value=score(q)+(laneWorkers.has(q.id)?40:0);
      if(value>highest||value===highest&&q.id<best.id){best=q;highest=value;}
    }
    return best;
  }
  function assign(site,world,all,work,option,effects){
    const {self,project:p}=option,plan=plans[p.kind],{store,places}=work;
    if(!self.free||p.finished||p.lastWorked===world.week)return null;
    const crop=p.kind==='food'?root.EarthResources?.projectCrop(world,site,self.id,p.crop):null;
    const venue=crop?.venue||plan.venue;
    if(p.kind==='food'&&root.EarthResources&&!crop){
      p.blocked='The local food beds need time to recover before another picking.';return null;
    }
    if(crop?.id==='fish'&&site.handline&&!site.buildings?.some(b=>b.kind==='fishingDock')){
      p.blocked='The shared float is in use. I will return to the quay when its catch is landed.';return null;
    }
    const slots=1+Number(site.buildings?.some(b=>b.kind===(venue==='dock'?'fishingDock':venue)));
    if((places.get(venue)||0)>=slots){p.blocked='The '+venue+' work session is booked. I will try another week.';return null;}
    if(!p.progress&&plan.cost&&work.paid){p.blocked='Another team has the materials session this week. I will keep my plan.';return null;}
    const block=resourceBlock(site,p,store);if(block){p.blocked=block;return null;}
    const paired=needsPartner(p),invited=option.volunteer;
    const volunteer=invited&&(invited.free||invited.base.kind==='player'&&!invited.reserved)&&!invited.duty?invited:null;
    if(invited&&!volunteer){p.blocked='Our agreed shared session conflicts with another commitment.';return null;}
    if(volunteer&&p.kind==='teach'&&p.partnerId&&p.partnerId!==volunteer.id){p.blocked='I already promised this lesson to my original learner.';return null;}
    const partner=volunteer||(paired?partnerFor(site,world,self,p,all):null);
    if(paired&&!partner&&p.kind!=='hobby'){
      if(p.kind==='teach'&&p.partnerId&&world.week-p.lastWorked>=4){
        p.blocked='The original learner cannot continue this week. I will begin a new lesson with someone who has time.';
        p.progress=0;p.partnerId=null;p.beneficiaryId=null;p.lastWorked=null;
      }else p.blocked=p.kind==='teach'?'I need a willing learner with time to practise '+p.axis+'.':'I need a neighbour who can spare a session to test or deliver the work.';
      return null;
    }
    let lesson=null,noteMaker=null;
    if(p.kind==='hobby'&&p.progress===plan.total-1){
      lesson=root.EarthCareers?.hobbyPractice?.(world,site,self.id,p.axis,true,partner?.id);
      if(!lesson?.ok){p.blocked=lesson?.reason||'I need a free personal practice session.';return null;}
    }
    if(p.kind==='teach'&&p.progress===plan.total-1){
      lesson=root.EarthCareers.projectLesson(world,site,self.id,partner.id,p.axis,true,store.notes>0?3:2);
      if(!lesson.ok){p.blocked=lesson.reason;return null;}
      if(store.notes>0)noteMaker=useSupply(store,'notes');
      if(noteMaker)p.input={kind:'field note',ownerId:noteMaker};
    }
    const noteId=jobId(self.id,p),stage=p.progress===0?'plan':p.progress+1===plan.total?'finish':'work';
    if(crop)p.crop=crop.id;
    const action=projectStep(p,plan,crop),prior=p.progress;
    let note='';
    if(!p.progress && plan.cost){
      site.materials-=plan.cost;work.paid++;
      note=self.name+' set aside '+plan.cost+' material'+(plan.cost===1?'':'s')+' for the project “'+plan.titles[p.variant]+'”.';
    }
    if(partner){p.partnerId=partner.id;if(p.kind==='teach'||!p.beneficiaryId)p.beneficiaryId=partner.id;}
    p.progress++;p.lastWorked=world.week;p.blocked=null;
    if(p.progress===plan.total){
      const ledger=store.completed||=evidenceRows(store);
      p.finished=world.week;
      if(p.kind==='research'){const added=putSupplies(store,'notes',2,self.id);p.result='The co-op received '+added+' tested field note'+(added===1?'':'s')+'.';}
      if(p.kind==='build'){const added=putSupplies(store,'assists',3,self.id);p.result='A new carrier is ready for '+added+' shared load'+(added===1?'':'s')+'.';}
      if(p.kind==='food'){
        if(crop&&partner)p.carriedBy=partner.base.kind==='player'?self.id:partner.id;
        const extra=crop&&crop.available<3?null:store.assists>0?'carrier':store.notes>0?'note':null;
        const maker=extra&&person(site,useSupply(store,extra==='carrier'?'assists':'notes'));
        if(maker)p.input={kind:extra==='carrier'?'carrier':'field note',ownerId:maker.id};
        const desired=extra?3:2;
        const beneficiary=(!crop||crop.available>=2)&&all.find(q=>q.id===p.beneficiaryId&&q.id!==selected(site,world)&&q.row.energy<3);
        const harvested=crop?root.EarthResources.harvestForProject(world,site,crop,desired,!beneficiary):{amount:desired,stored:null};
        if(beneficiary){
          beneficiary.row.energy=Math.min(8,beneficiary.row.energy+2);
          beneficiary.row.received={week:world.week,ownerId:self.id,kind:'food'};
        }
        const ingredient=root.EarthResources?.useForPantry(world,site,self.id);
        const raw=harvested.stored;
        const food=harvested.amount+Number(Boolean(ingredient))-Number(Boolean(beneficiary))-Number(Boolean(raw));effects.food=(effects.food||0)+food;p.delivered=food;
        if(crop?.id==='fish'){
          p.caught=harvested.amount-Number(Boolean(beneficiary));
          root.EarthProvisions?.landing?.(world,site,self.id,harvested.amount);
        }
        p.result='The pantry received '+food+' food'+(p.caught?' including '+p.caught+' from the shore catch':'')+(extra==='carrier'?' using '+(maker?maker.name+'’s':'a shared')+' carrier':extra==='note'?' using '+(maker?maker.name+'’s':'a tested')+' field note':'')+'.'+
          (beneficiary?' One further basket fed '+beneficiary.name+' and restored two energy.':'')+
          (ingredient?' The crew cooked one stored lot of '+ingredient.source+' into an extra household portion.':'')+
          (raw?' With meals covered, one basket of '+raw.name+' went into the raw goods bin for later use or sale.':'');
      }
      if(p.kind==='teach'&&lesson)p.result=partner.name+' gained '+lesson.gain+' '+p.axis+' through supervised practice with '+self.name+
        (noteMaker?' using a field note from '+person(site,noteMaker).name:'')+'.';
      if(p.kind==='hobby')p.result=self.name+(lesson.gain?' gained '+lesson.gain+' '+p.axis:' enjoyed the practice at their current skill ceiling')+
        (partner?' with feedback from '+partner.name: ' while practising independently')+'.';
      p.result=p.result.slice(0,450);
      ledger.unshift(evidence(self.id,p));ledger.length=Math.min(16,ledger.length);
      note=self.name+(partner?' and '+partner.name:'')+' finished their project. '+p.result;
    }
    places.set(venue,(places.get(venue)||0)+1);
    self.free=false;
    const label=p.kind==='teach'?'Teach '+p.axis:p.kind==='hobby'?hobbyTopics[p.axis][0]:plan.titles[p.variant];
    const who=partner?' with '+partner.name:'';
    const item={week:world.week,kind:'project',reason:(action+who+'. '+(p.result||plan.goals[p.variant]+'.')).slice(0,450),venue,target:partner?.id||null,
      projectId:noteId,projectKind:p.kind,axis:p.axis,phase:stage,activity:action,title:label,progress:p.progress,total:plan.total};
    if(partner){
      if(partner.base.kind!=='player')partner.item={...item,target:self.id,reason:('I agreed to '+(p.kind==='teach'?(prior?'demonstrate my practice':'learn '+p.axis):p.kind==='hobby'?'offer feedback':'work on this')+' with '+self.name+'. '+(p.result||action+'.')).slice(0,450)};
      partner.free=false;partner.reserved=true;
      if(volunteer){
        note=note||partner.name+' kept the agreed session with '+self.name+'. '+action+'.';
        partner.row.contribution={week:world.week,ownerId:self.id,projectId:noteId,activity:action};
        if(partner.base.kind==='player'){partner.row.contact=Math.max(0,partner.row.contact-2);partner.row.energy=Math.max(0,partner.row.energy-1);}
        delete p.volunteer;
      }
    }
    return {item,note};
  }
  function valid(site,week){
    const store=site?.autonomy?.projects;if(store==null)return true;
    if(!record(store)||!int(store.notes,0,6)||!int(store.assists,0,6)||!record(store.owners)||Object.keys(store.owners).length>64)return false;
    for(const kind of ['notes','assists']){
      const shelf=store[kind+'From'];
      if(shelf!=null&&(!Array.isArray(shelf)||shelf.length!==store[kind]||shelf.some(id=>id!=null&&!person(site,id))))return false;
    }
    const validInput=p=>p.input==null||Boolean(record(p.input)&&person(site,p.input.ownerId)&&
      (p.kind==='food'&&['field note','carrier'].includes(p.input.kind)||p.kind==='teach'&&p.input.kind==='field note'));
    if(store.completed!=null){
      const ledger=store.completed,known=new Set();
      if(!Array.isArray(ledger)||ledger.length>16||!ledger.every((e,i)=>{
        if(!record(e)||!validInput(e)||!person(site,e.ownerId)||!int(e.serial,1,Number.MAX_SAFE_INTEGER)||!own(plans,e.kind)||!int(e.variant,0,plans[e.kind].titles.length-1)||
          !axes.includes(e.axis)||!int(e.week,1,week)||i&&e.week>ledger[i-1].week||e.delivered!=null&&(e.kind!=='food'||!int(e.delivered,1,4))||e.caught!=null&&(e.kind!=='food'||!int(e.caught,1,e.delivered||0))||typeof e.result!=='string'||e.result.length>450||
          [e.partnerId,e.beneficiaryId].some(id=>id!=null&&(id===e.ownerId||!person(site,id)))||
          e.carriedBy!=null&&(e.kind!=='food'||!e.delivered||![e.ownerId,e.partnerId].includes(e.carriedBy)))return false;
        const key=jobId(e.ownerId,e);if(known.has(key))return false;known.add(key);return true;
      }))return false;
    }
    const bookings=new Set();
    return Object.entries(store.owners).every(([id,p])=>{
      if(!person(site,id)||!record(p)||p.crop!=null&&(p.kind!=='food'||typeof p.crop!=='string'||p.crop.length>32||root.EarthResources?.isCrop&&!root.EarthResources.isCrop(p.crop))||!validInput(p)||p.input!=null&&!p.finished||!own(plans,p.kind)||!int(p.variant,0,plans[p.kind].titles.length-1)||!int(p.serial,1,Number.MAX_SAFE_INTEGER)||
        !int(p.started,1,week)||!int(p.progress,0,plans[p.kind].total)||!axes.includes(p.axis))return false;
      if([p.partnerId,p.beneficiaryId].some(q=>q!=null&&(q===id||!person(site,q)))||
        p.carriedBy!=null&&(p.kind!=='food'||!p.crop||!p.delivered||!p.finished||![id,p.partnerId].includes(p.carriedBy)))return false;
      if(p.volunteer!=null){
        const booking=p.volunteer.from+'|'+p.volunteer.week;
        if(!record(p.volunteer)||!int(p.volunteer.week,p.started,week)||p.volunteer.from===id||
          !(root.EarthAgency?.canPlay?.(site,p.volunteer.from)??(p.volunteer.from==='steward'||site.residents?.some(r=>r.id===p.volunteer.from)))||bookings.has(booking))return false;
        bookings.add(booking);
      }
      if((p.progress===0)!==(p.lastWorked==null)||p.lastWorked!=null&&!int(p.lastWorked,p.started,week))return false;
      if((p.progress===plans[p.kind].total)!==(p.finished!=null)||p.finished!=null&&(p.finished!==p.lastWorked||typeof p.result!=='string'||p.result.length>450)||
        p.delivered!=null&&(p.kind!=='food'||!p.finished||!int(p.delivered,1,4))||p.caught!=null&&(p.crop!=='fish'||!int(p.caught,1,p.delivered||0)))return false;
      return p.blocked==null||typeof p.blocked==='string'&&p.blocked.length<200;
    });
  }
  root.EarthLocalProjects=Object.freeze({view:publicView,pastime,completions,latestHarvest,prepare,assign,joining,releaseOffers,valid});
})(typeof window==='undefined'?globalThis:window);
