/* Spoken replies draw on the listener's trade, the last personal agreement
   and the actual town ledger. Only a deliberate visit is remembered. */
(function(root){
  'use strict';
  const voices=[
    [/repairer/i,'I get more out of a morning measuring one broken part than guessing at three repairs.','A usable tool puts somebody else back to work.'],
    [/carpenter/i,'I keep thinking about how the timber will sit once it dries. A hurried cut costs the next worker time.','Every sound joint matters to the person who will use the finished building.'],
    [/grower|gardener/i,'I look at the pantry before deciding what deserves another row in the garden.','If I give more time to the beds, the kitchen has more room to plan meals.'],
    [/seed keeper/i,'I would rather keep a little seed back for the next planting than use the last of it today.','The growers need viable seed for the next crop.'],
    [/convenor|steward/i,'I keep wondering whose voice we missed the last time people made a decision together.','An agreement is easier to keep when the person doing the work helped choose it.'],
    [/baker|cook/i,'I plan the next batch around who still needs a meal. Waiting for flour feels different when people are hungry.','The pantry and the kitchen depend on one another.'],
    [/driver/i,'The part of a delivery I care about is seeing somebody at the kerb who actually needs the load.','The exchange, pantry, repair crew and assembly share the one blue truck.'],
    [/courier|porter/i,'I would sooner hear which doorway is ready than stand there holding a parcel nobody can take.','When one workplace changes its hours, the person carrying the load feels it first.'],
    [/trader/i,'A price only tells me half the story. I want to know which shelf will be empty after the sale.','Selling the last crate can leave a neighbour waiting for the next consignment.'],
    [/nurse/i,'I notice who is managing on their own and who would welcome someone checking in.','A staffed clinic gives the rest of the community time to recover.'],
    [/police/i,'Quiet streets give me time to hear people out before a disagreement grows.','A neighbour who feels heard can bring a problem to the community sooner.'],
    [/refuse/i,'I remember which lanes are easy to miss when everybody wants the main street cleared first.','The households along the whole collection run depend on a dependable crew.'],
    [/mathematician|geneticist/i,'I have a calculation I want to check a second way before anybody relies on it.','A better estimate can save the crew materials they would otherwise have ordered.'],
    [/engineer/i,'I like finding the part of a design that will be awkward for the person who has to maintain it.','The repair crew lives with the decisions we make at the drawing board.'],
    [/teacher/i,'A good day is when somebody explains the idea back to me in their own words.','If one learner can teach a neighbour, the knowledge travels further.'],
    [/musician/i,'I keep hearing one phrase I would like to play more cleanly. Practice is easier when somebody listens.','A performance gives neighbours a reason to come together after work.']
  ];
  function pantryConcern(target,site){
    const meals=Math.ceil(site.population/5),left=site.food;
    if(/baker|cook/i.test(target.role))return 'I’m counting portions for the kitchen. We have '+left+' food to make '+meals+' portions. I’d be glad of another basket.';
    if(/seed/i.test(target.role))return 'We need food now and seed for the next planting. With '+left+' food left, those are two different promises I have to think about.';
    if(/grower|garden/i.test(target.role))return 'The next picking can’t come soon enough. The pantry has '+left+' food and our households need '+meals+'.';
    if(/trader/i.test(target.role))return 'The public pantry has '+left+' food. I’m checking which crates can be bought from the stall before the next round.';
    if(/steward|convenor/i.test(target.role))return 'We have '+meals+' portions to find and '+left+' food in store. I want to hear from the neighbours who need the next basket.';
    if(/driver|courier|porter/i.test(target.role))return 'I’m watching what’s coming into the exchange. We have '+left+' food for '+meals+' portions, so a missed pickup matters.';
    return 'I’m thinking about the next shared meal. We have '+left+' food for '+meals+' portions.';
  }
  function supplyRun(person){
    const lane=/^carrier-([0-8])-([0-8])$/.exec(person.id);
    if(!lane)return null;
    const from=Number(lane[1])+1,to=Number(lane[2])+1;
    if(person.role==='Garden courier')return {
      news:'I carry tools from the workshop on lot '+from+' to the garden on lot '+to+'.',
      purpose:'When the tools reach the growers on lot '+to+', our district can harvest one extra food each week.'
    };
    if(person.role==='Exchange porter')return {
      news:'My run connects the depot on lot '+from+' with the market on lot '+to+'.',
      purpose:'A staffed market on lot '+to+' earns one extra fund each week from the adjoining depot.'
    };
    return null;
  }
  const known=(site,id)=>id==='steward'||site.residents.some(p=>p.id===id)||/^walker-[0-4]$|^driver$|^carrier-[0-8]-[0-8]$/.test(id);
  function samePerson(site,id,key,week){
    if(key)return root.EarthPersonas?.profile(site,id)?.identityKey===key;
    // Earlier entries identified neighbours by their street slot. A new
    // arrival in that slot cannot inherit a meeting held before they came.
    const guest=site.communityLife?.people?.[id];
    return !guest?.originId||guest.since==null||guest.since<=week;
  }
  const pair=(site,from,to)=>site.agency?.visits?.find(v=>v.from===from&&v.to===to&&
    samePerson(site,from,v.fromKey,v.week)&&samePerson(site,to,v.toKey,v.week));
  const familiar=(site,a,b,week)=>[pair(site,a,b),pair(site,b,a)].some(v=>v&&v.week>=week-4)||
    (root.EarthNeighbourErrands?.reliability?.(site,a,b,week)||0)>0;
  const topics=(site,world,id)=>{
    const actor=root.EarthAgency.actorId(site),speaker=root.EarthAgency.identity(site,actor),target=root.EarthAgency.identity(site,id);
    if(!target||root.EarthCommunityLife?.present?.(site,id)===false)return [];
    const visitor=root.EarthCommunityLife?.residency?.(site,id)==='visitor';
    const visiting=world.communityLife&&root.EarthCommunityLife?.isHome?.(world,site)===false;
    const witnessed=root.EarthNeighbourErrands?.witness?.(site,world,id);
    const account=witnessed?[{id:'agreement:'+witnessed.id,label:
      witnessed.requesterId===id?'Who did you ask for help?':witnessed.contactId===id?'What could you set aside for them?':'What did you agree to do?',context:true}]:[];
    const incident=root.EarthFleet?.incidentTopics?.(world,site,id,actor)||[];
    if(visiting&&!visitor)return [
      ...(actor==='steward'?[{id:'shadow',label:'May I accompany you on your rounds?',context:true}]:[]),
      {id:'news',label:'How are things here?'},{id:'work',label:'What do you do here?'},{id:'purpose',label:'Who depends on your work?'},
      {id:'interests',label:'What do you enjoy outside work?'},{id:'dream',label:'What are you hoping to do?'},...account,...incident
    ];
    if(visitor)return [{id:'news',label:'How is your visit going?'},{id:'visit-fit',label:'What would make you stay?'},
      {id:'interests',label:'What do you miss from home?'},{id:'dream',label:'What do you hope to do?'},...incident];
    const options=[['news','How are things?'],['work','What are you working on?'],['purpose','Who depends on your work?'],['interests','What do you enjoy outside work?'],['listen','Make time to listen']];
    const arrangements=[...(root.EarthNeighbourErrands?.relayTopics?.(site,world,target,speaker)||[]),...(root.EarthNeighbourErrands?.topics(site,world,target,speaker)||[])];
    const connection=root.EarthAutonomy?.contacts?.(site,id,world.week)?.find(r=>r.here!==false&&r.id!==actor&&root.EarthCommunityLife?.present?.(site,r.id)!==false);
    if(connection)options.push(['neighbour:'+connection.id,'How are things between you and '+connection.name+'?']);
    if(root.EarthResources&&root.EarthMarket&&/baker|grower|trader|repairer|seed|carpenter|courier|porter|driver|cook|gardener/i.test(target.role))
      options.push(['supplies',/repairer|carpenter/i.test(target.role)?'Which materials would you keep back?':'What would you leave on the shelf?']);
    if(root.EarthAutonomy?.dream?.(site,world,id))options.splice(3,0,['dream','What are you hoping to do?']);
    const previous=pair(site,actor,id);
    if(previous)options.push(['followup',previous.thread?'How did “'+previous.subject+'” turn out?':'How did that turn out?']);
    const introductions=root.EarthIntroductions?.topics(site,world,id)||[];
    const support=root.EarthDreams?.supportTopics?.(site,world,target,speaker)||[];
    options.push(['meal','Share a meal · 1 food']);return [...arrangements,...account,...incident,...options.map(([id,label])=>
      ({id,label,...(id==='followup'&&previous.week<world.week?{context:true}:{})})),...support,...introductions];
  };
  const lower=s=>s[0].toLowerCase()+s.slice(1);
  const teaching={
    stamina:'help someone learn to pace a longer walk',numeracy:'help someone check a calculation without me',
    music:'teach a neighbour one difficult phrase',organisation:'show someone how I plan a week’s supplies',
    care:'help someone learn to look after a neighbour',communication:'practise explaining a tricky idea with someone',
    craft:'show a neighbour how to make a sound repair'
  };
  function workOrder(site,id){
    const order=root.EarthDistrictGrowth?.work?.(site,id);
    if(!order)return null;
    const good=order.resourceName||String(order.action).replace(/^(Collect|Deliver) /,'').split(' to ')[0];
    const pay=order.price+' personal fund'+(order.price===1?'':'s');
    if(order.phase==='build'){
      const action='I’m using the '+order.tool+' at '+order.destination+' to '+lower(order.action)+'.';
      const terms=order.price?order.payer+' reserved '+pay+' for my work on the site.':
        'I committed '+order.amount+' '+good+' from the household to do this work myself.';
      return {order,action,terms};
    }
    const action=order.phase==='collect'?(order.resource==='fish'?'I’m taking the '+order.tool+' to '+order.source+' to land the catch.':
      'I’m going to '+order.source+' for '+good.toLowerCase()+'.'):'I have '+order.amount+' '+good.toLowerCase()+' to hand over at '+order.destination+'.';
    const terms=order.payer+' set aside '+pay+' for me. The payment clears when the goods reach '+(order.beneficiaryName||'the receiver')+'.';
    return {order,action,terms};
  }
  function personalNews(site,world,person){
    const due=site.residents.find(p=>p.promise?.by===person.id&&p.promise.dueWeek<=world.week+1);
    if(due)return {words:'I gave '+due.name+' my word for week '+due.promise.dueWeek+'. My next shift depends on making that delivery.',other:due.id};
    const recent=root.EarthPractice?.latest?.(site,person)?.find(e=>e.week>=world.week-1);
    if(recent){
      const here=person.identityKey||person.id,partner=recent.peerKey===here;
      const words=partner?recent.otherView:recent.route==='commission'?'I hired '+recent.peerName+' for '+root.EarthPractice.tasks[recent.subject].name.toLowerCase()+'.':
        'I worked on '+root.EarthPractice.tasks[recent.subject].name.toLowerCase()+'. '+(recent.outcome===0?'I need more practice.':recent.outcome===1?'I changed my approach after the first try.':'I was able to do it on my first attempt.');
      if(words)return {words};
    }
    const pocket=site.purses?.people?.[person.id],latest=pocket?.entries?.[0];
    const house=site.growth?.households?.find(h=>h.owner===(person.identityKey||person.id));
    if(latest?.week>=world.week-1&&person.traits?.initiative>=60){
      return {words:'My last purse entry was in week '+latest.week+'. '+latest.text};
    }
    if(house?.last&&house.activity&&['shop','home','purchase','road'].includes(house.activity)){
      return {words:house.last};
    }
    return null;
  }
  const needsPlan=new Set(['work','purpose','news','listen','followup']);
  function personalThread(site,world,target,plan,career,kind){
    const arrangement=root.EarthNeighbourErrands?.witness?.(site,world,target.id);
    if(!kind&&arrangement&&['asked','agreed'].includes(arrangement.status)){
      const row=root.EarthNeighbourErrands.arrangements(site,world,arrangement.actorId).find(r=>r.id===arrangement.id);
      if(row)return {kind:'agreement',key:String(row.id),at:0,subject:row.title};
    }
    const job=career?.application?.targetId||career?.training?.targetId;
    const title=job&&root.EarthCareers?.catalog?.find(j=>j.id===job)?.label;
    if((!kind||kind==='career')&&title)return {kind:'career',key:job,at:career.training?.credits||0,subject:'the '+title.toLowerCase()+' post'};
    const project=plan?.project,dream=plan?.dream;
    if(project&&(kind==='project'||!kind&&(!dream||plan.kind==='project'||project.progress>0&&!project.finishedWeek)))
      return {kind:'project',key:project.id,at:project.progress,subject:project.title};
    if((!kind||kind==='dream')&&dream)return {kind:'dream',key:dream.id,at:dream.progress,subject:dream.title};
    return null;
  }
  function rememberThread(site,world,target,speaker,visit,plan,career){
    const point=visit.thread;if(!point)return null;
    const heard='When we spoke in week '+visit.week;
    const make=words=>({ok:true,message:target.name+' · “'+words+'”'});
    if(point.kind==='agreement'){
      const row=site.agency?.arrangements?.rows.find(r=>String(r.id)===point.key);
      if(row)return root.EarthNeighbourErrands?.account?.(site,world,target.id,speaker.id,row)||null;
    }
    if(point.kind==='dream'){
      const d=plan?.dream;
      if(d?.id===point.key){
        const next=d.earned?'I finished in week '+d.completedWeek+'. '+d.community:
          d.progress>point.at?'I’ve done '+(d.progress-point.at)+' more practice '+(d.progress-point.at===1?'session':'sessions')+'. '+d.next:
          'I haven’t moved past that stage. '+(d.blockers[0]||'Next I want to '+lower(d.activity)+'.');
        return make(heard+' I told you about “'+visit.subject+'”. '+next+(d.supportNote?' '+d.supportNote:''));
      }
      const old=d?.achievements?.find(a=>a.id===point.key);
      if(old)return make('You remembered “'+visit.subject+'”. I finished that in '+old.place+' in week '+old.week+'. '+(d.quote||''));
      if(d?.onHold?.title===visit.subject)return make('I’ve kept the work I did on “'+visit.subject+'”. '+d.onHold.reason+' '+d.quote);
    }
    if(point.kind==='project'){
      const p=plan?.project;
      if(p?.id===point.key){
        const work=p.finishedWeek?'We finished in week '+p.finishedWeek+'. '+p.effect:
          p.progress>point.at?'We’ve done '+(p.progress-point.at)+' more of the steps. '+p.next:
          'We’re at the same step. '+p.next;
        return make(heard+' we discussed “'+visit.subject+'”. '+work);
      }
      const old=root.EarthLocalProjects?.completions?.(site)?.find(p=>p.id===point.key);
      if(old)return {...make('You asked about “'+visit.subject+'” in week '+visit.week+'. We finished it in week '+old.week+'. '+old.result),
        ...(old.beneficiaryId&&old.beneficiaryId!==speaker.id&&old.beneficiaryId!==target.id&&root.EarthCommunityLife?.present?.(site,old.beneficiaryId)!==false?{followContact:old.beneficiaryId}:{})};
    }
    if(point.kind==='career'){
      if(career?.jobId===point.key)return make(heard+' I was trying for '+visit.subject+'. '+(career.joinedWeek?'I started in week '+career.joinedWeek+'. ':'I work there now. ')+(plan?.reason||''));
      const a=career?.application;
      if(a?.targetId===point.key)return make('I’m still trying for '+visit.subject+'. '+
        (a.phase==='notice'?'My old crew still needs the handover. I’m due to move on in week '+a.dueWeek+'.':
        a.phase==='offer'?'The employer has offered me a place. I need to decide whether the timing suits me.':
        a.phase==='waiting'?'I qualified, but there isn’t an opening to step into.':
        a.phase==='deferred'?'The employer asked me to come back. '+(a.reason||''):'They are reviewing my application in week '+a.dueWeek+'.'));
      if(career?.training?.targetId===point.key){
        const difference=career.training.credits-point.at;
        return make(heard+' we discussed '+visit.subject+'. '+(career.training.paused?'I put the course on hold.':
          difference>0?'I’ve earned '+difference+' more course '+(difference===1?'credit.':'credits.'):'I’m still working on the same part of the course.'));
      }
    }
    return make(heard+' I mentioned '+visit.subject+'. My attention is on something else now. '+(plan?.reason||target.outsideWork||''));
  }
  function describe(site,world,target,speaker,topic,meeting){
    if(typeof topic!=='string')return {ok:false,message:'Choose a current conversation topic.'};
    if(topic==='shadow'){
      const host=world.communityLife&&root.EarthCommunityLife?.isHome?.(world,site)===false;
      if(!host||world.activeId!==site.id||speaker.id!=='steward'||root.EarthAgency.actorId(site)!==speaker.id||
        root.EarthCommunityLife.residency(site,target.id)!=='member'||!target.identityKey||meeting?.target!==target.id||meeting.mode!=='walk')
        return {ok:false,message:'Ask a resident of the community you are visiting, in person.'};
      const words=(text,changed=false)=>({ok:true,message:target.name+' · “'+text+'”',...(changed?{changed:true}:{})});
      const trust=root.EarthAutonomy?.bond?.(site,target.id,speaker.id,world.week)||0;
      const duty=site.careers?.[target.id]?.application,away=root.EarthCommunityLife?.travelIntent?.(site,target.id);
      if(trust<0)return words('I remember our last arrangement. I’d rather make this round alone.');
      if(away||duty?.phase==='notice'&&duty.dueWeek===world.week)return words('I’ve arranged a handover and I need to give the people waiting for me my full attention.');
      const already=root.EarthAgency.shadowPass(site,world,target.id);
      if(!already)(site.agency||={actor:speaker.id,meals:[]}).shadow={id:target.id,key:target.identityKey,week:world.week};
      return {...words('You can spend a round with me. My work and my neighbours’ agreements will still stand when you head home.',!already),perspective:target.id};
    }
    const note=topic.startsWith('listen:')?topic:null;
    if(note)topic='listen';
    if(root.EarthCommunityLife?.present?.(site,target.id)===false)return {ok:false,message:'This neighbour is away from the district.'};
    if(topic.startsWith('relay:'))return root.EarthNeighbourErrands?.relay?.(site,world,target,speaker,topic,meeting)||{ok:false,message:'The delivery agreement has changed.'};
    if(topic.startsWith('errand:'))return root.EarthNeighbourErrands?.converse(site,world,target,speaker,topic,meeting)||{ok:false,message:'That request has closed.'};
    if(topic.startsWith('intro:'))return root.EarthIntroductions?.converse(site,world,target.id,speaker.id,topic,meeting)||null;
    if(topic.startsWith('agreement:')){
      const row=root.EarthNeighbourErrands?.witness?.(site,world,target.id);
      if(!row||topic!=='agreement:'+row.id)return {ok:false,message:'That discussion has moved on. Ask what this person is arranging now.'};
      return root.EarthNeighbourErrands.account(site,world,target.id,speaker.id,row);
    }
    if(topic==='dream-help'||topic.startsWith('dream-gift:'))return root.EarthDreams?.discussSupport?.(site,world,target,speaker,topic,meeting)||
      {ok:false,message:'The support offer is no longer available.'};
    const id=target.id,tradeVoice=voices.find(([re])=>re.test(target.role))||[null,'I enjoy taking time to get a piece of work right.','We share the work that keeps this neighbourhood going.'];
    const former=target.originRole&&target.originRole.toLowerCase()!==target.role.toLowerCase()&&!/^supply porter$/i.test(target.originRole);
    const oldVoice=former&&voices.find(([re])=>re.test(target.originRole));
    const arrivals=site.communityLife?.people?.[id],oldTown=arrivals?.originId&&arrivals.originId!==site.id&&
      [...(world.sites||[]),...(world.communityLife?.outposts||[])].find(town=>town.id===arrivals.originId);
    const offDuty=target.interests?.[1];
    const voice=former?[null,'I started out doing '+target.originRole.toLowerCase()+' work. '+(oldVoice?.[2]||target.outsideWork||tradeVoice[1]),tradeVoice[2]]:
      oldTown&&offDuty?[null,'I brought my interest in '+offDuty+' with me from '+oldTown.name+'.',tradeVoice[2]]:tradeVoice;
    const plan=needsPlan.has(topic)?root.EarthAutonomy?.view(site,world,id):null,project=plan?.project,career=site.careers?.[id],visit=pair(site,speaker.id,id);
    const course=career?.training&&root.EarthCareers?.catalog?.find(j=>j.id===career.training.targetId)?.label;
    const goal=project?.title||(course&&course+' training')||target.interests?.[0]||target.role;
    const lane=supplyRun(target);
    const publicAgenda=site.civicInitiatives?.active;
    const vote=publicAgenda?.votes?.find(v=>v.personId===id);
    const heard=site.agency?.meals?.find(m=>m.to===id&&m.week===world.week);
    const sent=site.agency?.meals?.find(m=>m.to===speaker.id&&m.from===id&&m.week===world.week);
    const partner=project?.partnerName&&project.partnerId!==id?project.partnerName:null;
    const urgentFood=site.food<Math.ceil(site.population/5);
    const make=words=>({ok:true,message:target.name+' · “'+words+'”'});
    const nameOfSigner=who=>root.EarthAgency.identity(site,who)?.name||'My neighbour';
    const canMakeNote=()=>!(world.communityLife&&root.EarthCommunityLife?.isHome?.(world,site)===false)&&
      root.EarthCommunityLife?.residency?.(site,id)!=='visitor';
    function noteOption(kind,key){
      if(!canMakeNote()||visit?.week===world.week&&visit.thread?.kind===kind&&visit.thread.key===key)return {};
      return {followMemory:{id:'listen:'+kind+':'+key,label:visit?.week===world.week?'Remember this instead':
        kind==='dream'?'Remember this ambition':kind==='career'?'Remember this career plan':'Remember this project'}};
    }
    function current(){
      if(project){
        const title=project.kind==='teach'&&teaching[project.axis]?teaching[project.axis]:lower(project.title),withWhom=partner?' '+partner+' is helping.':'';
        if(project.finishedWeek){
          const perspective=project.ownerId!==id&&project.ownerName?'I worked alongside '+project.ownerName+' to finish “'+project.title+'”. ':
            partner?'I finished “'+project.title+'” with '+partner+'. ':'I finished my project “'+project.title+'”. ';
          return perspective+(project.effect||voice[2]);
        }
        if(project.ownerId!==id&&project.ownerName&&project.phase!=='Proposed'){
          return 'I’m helping '+project.ownerName+' with “'+project.title+'”. '+(project.next||project.why||voice[2]);
        }
        const opening=project.phase==='Proposed'?'I’d like to ':project.phase==='Waiting'?'I’m waiting for a chance to ':'I’m trying to ';
        const next=project.next?.replace(/[.!?]+$/,'');
        if(project.phase==='Waiting')return opening+title+'.'+withWhom+(next?' '+next+'.':'');
        return opening+title+'.'+withWhom+(next?' Next I’ll '+lower(next)+'.':'');
      }
      if(plan&&['rest','visit','host','cover','gather','learn','apply','commitment'].includes(plan.kind))return plan.reason;
      if(career?.training)return 'I’m keeping up with '+goal+' alongside my work. I have completed '+career.training.credits+' course credits.';
      return '';
    }
    const dream=()=>plan?.dream||root.EarthAutonomy?.dream?.(site,world,id);
    if(topic.startsWith('neighbour:')){
      const otherId=topic.slice(10),connection=root.EarthAutonomy?.contacts?.(site,id,world.week)?.find(r=>r.id===otherId);
      if(!connection||connection.here===false||otherId===speaker.id||root.EarthCommunityLife?.present?.(site,otherId)===false)return {ok:false,message:'Ask about one of this person’s current relationships.'};
      const words=connection.strength<0?'I have some reservations about working with '+connection.name+' again. ':
        connection.strength>=3?'I know I can ask '+connection.name+' for help. ':'I’m getting to know '+connection.name+'. ';
      const memories={visit:'We made time to meet',listen:'One of us needed to be heard and the other stayed',meal:'We shared a meal',
        project:'We worked on a project together',lesson:'We stayed for a practical lesson',cover:'We arranged cover for a colleague',
        kept:'The help we had agreed on arrived',missed:'The help we had agreed on never reached the person waiting for it',
        support:'One of us helped the other cover a fee for a personal ambition',office:'We made time to bring the handover records up to date'};
      return {...make(words+(memories[connection.kind]||'We worked together')+' in week '+connection.week+'.'),followContact:otherId};
    }
    if(['truck','truck-testimony','truck-report'].includes(topic)&&site.fleet?.incident)
      return root.EarthFleet?.incidentReply?.(world,site,id,speaker.id,topic);
    if(topic==='supplies'&&root.EarthResources&&root.EarthMarket){
      const market=root.EarthMarket.view(world,site),local=market.local,hardware=/repairer|carpenter/i.test(target.role);
      const suitable=hardware?['Fibre & wood','Minerals']:['Fresh food','Staples'];
      const relevant=local?.rows?.filter(r=>r.local&&suitable.includes(r.family))||[];
      const source=relevant.filter(r=>r.standing>0).sort((a,b)=>b.standing-a.standing)[0],tight=relevant.find(r=>r.standing<r.cap&&r.id!==source?.id);
      const good=hardware?'materials':'food',unit=hardware?'materials':'food',onShelf=market.shelf[good],orders=market.incoming?.filter(r=>r.good===good)||[];
      const arriving=orders.sort((a,b)=>a.due-b.due)[0];
      const offer=market.options.find(o=>o.action==='buy'&&o.good===good);
      const origin=source?(hardware?'I’d check ':'I’d collect ')+source.name.toLowerCase()+' first. There’s some to take '+(source.source?'at the '+source.source.toLowerCase():'locally')+'. ':
        hardware?'I’d ask the exchange for usable offcuts first. ':'I’d check what the growers have already put aside. ';
      const second=tight?(tight.finite?'I’d keep the remaining '+tight.name.toLowerCase()+' for the next repair. ':'I’d give the '+tight.name.toLowerCase()+' time to replenish. '):arriving?'We have '+arriving.amount+' '+unit+' coming in week '+arriving.due+'. ':'';
      const household=hardware?'Our district has '+site.materials+' materials available. ':
        'The households need '+Math.ceil(site.population/5)+' food from our '+site.food+' each week. ';
      return {...make(origin+second+household+'The stall has '+onShelf+' of its own. '+(offer?.available?'Buying one of those costs '+offer.price+' funds.':'It can’t supply us on the current terms.')),followStore:true};
    }
    if(topic==='dream'){
      const d=dream();
      if(!d)return make(target.outsideWork||'I’m making time for '+goal+'.');
      const blocked=Array.isArray(d.blockers)?d.blockers[0]:null;
      const detail=typeof blocked==='string'?blocked:blocked?.reason||d.next;
      return {...make([d.quote||('I’m working towards '+d.title+'.'),detail,d.supportNote].filter(Boolean).join(' ')),...noteOption('dream',d.id)};
    }
    if(root.EarthCommunityLife?.residency?.(site,id)==='visitor'&&['news','visit-fit'].includes(topic)){
      const fit=root.EarthCommunityLife?.visitorFit?.(world,site,id);
      if(fit){
        const who=fit.ties?.[0]?.name,friend=fit.contacts?.[0],concerned=fit.concerned||[];
        if(topic==='news')return make('At home I do '+target.role.toLowerCase()+' work. I’ve come from '+fit.homeName+' to see if I could help '+fit.need+'. '+
          (friend?'I already know '+friend+' here. We have some history together.':who?'I’ve also been thinking about '+who+' back home.':fit.known?'Someone here has already made an introduction.':
            target.traits?.sociability>=60?'I’d like to meet the crew over a meal.':'I’d like to walk the round with someone before I decide.'));
        const welcome=!fit.space?'There isn’t a spare room here yet.':!fit.food?'The pantry would be stretched by another household.':
          !fit.open?'The residents have paused invitations.':concerned.length>=2?concerned.slice(0,2).join(' and ')+' remember agreements we struggled with. They would like to work those out before I settle here.':
          fit.skillMatch?'I know enough to help with '+fit.need+'.':
          'I’d need someone to show me how to help with '+fit.need+'.';
        return make(welcome+' '+(friend&&who?friend+' is here, but '+who+' is still in '+fit.homeName+'. That makes it a hard choice. ':
          who?who+' is still in '+fit.homeName+', and that matters to me. ':
          fit.personalYes?'I can imagine a day of my own here. ':'I’m still deciding whether this daily life would suit me. ')+
          'The residents and I both decide when my visit ends in week '+fit.reviewWeek+'.');
      }
      if(topic==='news')return make('I’m finding out where I’d fit in. I know '+target.role.toLowerCase()+' work, and I’ve been asking who here could use a hand. '+(target.outsideWork||''));
      return make((target.traits?.sociability>=60?'I want people I can work alongside. ':'I need a place where I can have a quiet hour after work. ')+
        'I’d want room to carry on with '+(target.interests?.[1]||'my own plans')+' here.');
    }
    if(topic==='interests')return make(target.outsideWork||'I like '+goal+'.');
    if(topic==='work'){
      const paid=workOrder(site,id);
      if(paid)return make(paid.action+' '+paid.order.reason+' '+paid.terms);
      const employed=career&&root.EarthCareers?.view(world,site,id);
      const occupation=career?.application?.targetId||career?.training?.targetId;
      const bookmark=occupation?noteOption('career',occupation):project?noteOption('project',project.id):{};
      const motion=meeting?.activity;
      const observed=motion?.id===id&&typeof motion.label==='string'&&/^[A-Za-z]+ing\b/.test(motion.label)&&
        ['prepare','work','handover','study','rest','social','travel'].includes(motion.phase)?'I was '+lower(motion.label)+'. ':'';
      const activity=current();
      if(employed?.application?.phase==='notice')return {...make('I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. I’m serving notice through week '+employed.application.dueWeek+'. '+(employed.application.coverName?employed.application.coverName+' is taking the handover.':voice[2])),...bookmark};
      return {...make(observed+(employed?'I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. ':'')+(activity||lane?.news||voice[1])),...bookmark};
    }
    if(topic==='purpose'){
      const covering=site.residents.find(p=>p.promise?.handover?.worker===id&&root.EarthNeighbourErrands?.deliveryWorker?.(site,p)===id);
      if(covering)return {...make('I agreed to carry the delivery to '+covering.name+' in week '+covering.promise.dueWeek+'. '+
        nameOfSigner(covering.promise.by)+' holds the original promise.'),followContact:covering.id};
      if(target.promise?.handover?.informed){
        const worker=root.EarthNeighbourErrands.deliveryWorker(site,target);
        return {...make('I’m expecting '+nameOfSigner(worker)+' with the delivery by week '+target.promise.dueWeek+'. '+nameOfSigner(target.promise.by)+' signed for it.'),followContact:worker};
      }
      const paid=workOrder(site,id);
      if(paid)return make(paid.order.reason+' '+paid.terms);
      // Follow an evidenced link to hear the other side. A named beneficiary,
      // colleague or helper may have a different view of the same commitment.
      const links=root.EarthInterdependence?.ties?.(site,world,root.EarthPersonas?.list(site)||site.residents)||[];
      const link=links.find(l=>(l.from===id||l.to===id)&&l.from!==speaker.id&&l.to!==speaker.id);
      if(link){
        const other=link.from===id?link.to:link.from;
        const peer=root.EarthAgency.identity(site,other),mine=link.from===id;
        if(peer&&root.EarthCommunityLife?.present?.(site,other)!==false){
          const lines={
            'agreed to cover a handover':mine?'I said I’d take the handover for '+peer.name+'.':'I’m counting on '+peer.name+' to take my handover.',
            'is covering a former post':mine?'I’m covering the post '+peer.name+' left.':peer.name+' has taken on the rounds I used to do.',
            'promised supplies':mine?'I told '+peer.name+' I’d bring supplies.':peer.name+' has promised to bring me supplies.',
            'accepted an errand':mine?'I gave '+peer.name+' my word that I’d come back.':peer.name+' gave me their word that they’d come back.',
            'has the missing information':mine?peer.name+' needs to hear what I’ve already promised elsewhere.':'I need to hear what '+peer.name+' has already promised elsewhere.',
            'is verifying a stock check':mine?'I’m the person checking the figures for '+peer.name+'’s shift.':peer.name+' has to check my figures before I’m paid.',
            'offered a work session':mine?'I’ve offered a session to '+peer.name+'’s project.':peer.name+' offered to work a session with me.',
            'shares the project':mine?'I work with '+peer.name+' on their project.':peer.name+' works alongside me on this.',
            'is working for a neighbour':mine?'I have '+peer.name+' in mind when I do this.':peer.name+' has been working on something I can use.',
            'shared a meal':'I shared a meal with '+peer.name+'.',
            'brought food to a neighbour':mine?'I brought food round to '+peer.name+'.':peer.name+' brought food round to me.'
          };
          const words=lines[link.label];
          if(words)return {...make(words+' '+link.detail),followContact:other};
        }
      }
      if(project)return make((partner?partner+' and I have agreed to work together. ':'')+(project.beneficiaryName&&project.beneficiaryId!==id?'I’m doing it with '+project.beneficiaryName+' in mind. ':'')+
        (project.why||voice[2])+(project.effect?' '+project.effect:''));
      return make((lane?.purpose||voice[2])+' '+(site.construction?.[0]?'Right now the community has '+site.construction[0].name+' under construction.':urgentFood?'This week we need more food to cover the household share.':target.outsideWork||''));
    }
    if(topic==='news'){
      let latest='';
      const ownNews=personalNews(site,world,target),paid=workOrder(site,id);
      const shared=root.EarthNeighbourErrands?.arrangements?.(site,world,speaker.id)?.find(row=>row.requesterId===id||row.contactId===id);
      if(shared?.status==='kept'&&shared.finishedWeek>=world.week-2)return make((shared.requesterId===id?'I remember you coming back. ':'I heard what happened after our conversation. ')+shared.outcome);
      if(shared?.status==='missed'&&shared.finishedWeek>=world.week-2){
        const who=root.EarthAgency.identity(site,shared.requesterId)?.name||'the household';
        return make(shared.requesterId===id?'I was counting on you for “'+shared.title+'” in week '+shared.dueWeek+'. When you didn’t come back I had to explain the gap.':
          'I left room for '+who+'’s arrangement through week '+shared.dueWeek+'. They told me afterwards that the help had never arrived.');
      }
      if(shared?.status==='agreed'&&shared.requesterId===id)return make('I’ve kept some time for “'+shared.title+'”. I’m still counting on you by week '+shared.dueWeek+'. '+voice[2]);
      const delivery=site.residents.map(p=>({p,receipt:p.agreements?.[0]})).find(({p,receipt:r})=>
        r?.status==='kept'&&r.by!=='steward'&&r.deliveredBy===r.by&&r.week>=world.week-1&&(id===p.id||id===r.by));
      if(delivery){
        const {p,receipt:r}=delivery,recipient=p.id===id,other=recipient?r.by:p.id;
        const peer=root.EarthAgency.identity(site,other)?.name||'my neighbour';
        const aim=['The baskets reached households whose cupboards had run low.','Our neighbours could borrow tools and try a repair at the bench.',
          'People who needed help getting to the meeting could take part.'][p.slot];
        const opening=recipient?(other===speaker.id?'You':peer)+' brought what we agreed in week '+r.week+'. ':
          'I brought '+(other===speaker.id?'you':peer)+' the supplies we agreed on in week '+r.week+'. ';
        return {...make(opening+aim),...(other!==speaker.id&&root.EarthCommunityLife?.present?.(site,other)!==false?{followContact:other}:{})};
      }
      const witnessed=root.EarthNeighbourErrands?.witness?.(site,world,id);
      if(witnessed&&!sent&&!heard&&!target.promise)return root.EarthNeighbourErrands.account(site,world,id,speaker.id,witnessed);
      if(sent)latest='It was good to share that meal with you.';
      else if(heard)latest='I shared a meal with '+(root.EarthAgency.identity(site,heard.from)?.name||'a neighbour')+' this week.';
      else if(target.promise)latest='I’m counting on the promise due in week '+target.promise.dueWeek+'.';
      else if(ownNews)return {...make(ownNews.words),...(ownNews.other&&ownNews.other!==speaker.id?{followContact:ownNews.other}:{})};
      else if(paid)return make(paid.action+' '+paid.order.reason);
      else if(site.fleet?.incident&&id==='driver')latest='The co-op missed a pickup when the truck was taken. I want to see that put right.';
      else if(lane)latest=lane.news+' '+(urgentFood&&target.role==='Garden courier'?'The pantry holds '+site.food+' food, so the next harvest matters.':lane.purpose);
      else if(urgentFood&&(/baker|grower|seed|cook|trader/i.test(target.role)||target.traits?.initiative>72))
        latest=pantryConcern(target,site);
      else if(vote)latest=publicAgenda.leadId===id?'I proposed '+publicAgenda.title+' for '+publicAgenda.beneficiaryName+'. '+vote.reason:
        'We’re discussing '+publicAgenda.title+'. '+vote.reason;
      else if(id==='driver'&&site.fleet?.records?.[0]?.actor==='driver')latest=site.fleet.records[0].text;
      else if(plan?.kind==='dream'&&dream()){
        const d=dream();latest='Today I’m trying to '+lower(d.activity||d.title)+'. '+d.quote;
      }
      else if(current())latest=current();
      else if(career?.jobId&&career.history?.length)latest=career.history[0].text;
      else if(urgentFood)latest=pantryConcern(target,site);
      else if(site.issue&&/steward|convenor/i.test(target.role))latest='People have until week '+site.issue.deadline+' to vote on “'+site.issue.title+'”.';
      else if(site.pursuits?.cart&&/courier|porter|driver|carpenter/i.test(target.role))latest=site.pursuits.cart.builder+' built a handcart for our supply trips.';
      else if(visit&&visit.week<world.week)latest='I remember our week '+visit.week+' conversation about '+visit.subject+'.';
      else if(/baker|grower|trader/i.test(target.role))latest='I counted '+site.food+' food in the stores this week.';
      else if(/driver|courier/i.test(target.role))latest='I’m keeping an eye on which workplace is ready to receive the next load.';
      else if(target.interests?.[1])latest='When I’m off duty I’m looking forward to '+target.interests[1]+'.';
      if(sent||heard||target.promise||vote||urgentFood||id==='driver'&&site.fleet?.incident)return make(latest+' '+voice[2]);
      // Lead with the resident's live concern so the speech bubble changes as
      // their life changes. Their own trade and temperament remain audible.
      return make(latest?latest+' '+voice[1]:voice[1]);
    }
    if(topic==='listen'){
      if(!canMakeNote())return {ok:false,message:'This resident decides their own commitments in this community.'};
      const subject=personalThread(site,world,target,plan,career,note?.split(':')[1]),focus=subject?.subject||goal;
      if(note&&(!subject||note!=='listen:'+subject.kind+':'+subject.key))return {ok:false,message:'Their plans have changed. Ask them about what they are doing now.'};
      if(visit?.week===world.week&&(!note||subject.kind===visit.thread?.kind&&subject.key===visit.thread.key))
        return make('I remember, you made time for me earlier. '+(current()||voice[2]));
      const a=site.agency||={actor:'steward',meals:[]};a.visits||=[];
      a.visits=a.visits.filter(v=>v.from!==speaker.id||v.to!==id);
      a.visits.unshift({from:speaker.id,to:id,...(speaker.identityKey?{fromKey:speaker.identityKey}:{}),...(target.identityKey?{toKey:target.identityKey}:{}),
        week:world.week,subject:String(focus).slice(0,100),food:site.food,role:target.role,
        ...(subject?{thread:{kind:subject.kind,key:subject.key,at:subject.at}}:{})});
      a.visits.length=Math.min(a.visits.length,128);
      if(note&&visit?.week!==world.week)root.EarthAutonomy?.remember?.(site,world.week,speaker.id,id,'listen');
      const words=subject?.kind==='dream'?(plan.dream.quote+' '+plan.dream.next):
        subject?.kind==='agreement'?'I’d like you to remember “'+focus+'”. Some other people are counting on us.':
        subject?.kind==='career'?'I’ve been thinking a lot about '+focus+'. It would change my day and the one my current crew has planned.':current()||voice[2];
      return {...make((target.traits?.sociability>=60?'I’m glad you asked. ':'I don’t usually bring this up first. ')+words+' Ask me about it next time.'),changed:true};
    }
    if(topic==='followup'){
      if(!visit)return {ok:false,message:'Make time to listen first.'};
      const update=rememberThread(site,world,target,speaker,visit,plan,career);if(update)return update;
      const changed=visit.role!==target.role?'My work has changed since then. I’m now a '+target.role.toLowerCase()+'.':
        project&&project.title===visit.subject?'We have completed '+project.progress+' of '+project.total+' steps. '+(project.next||''):
        visit.food!==site.food?'We had '+visit.food+' food then. There are '+site.food+' in the pantry today.':
        current()||target.outsideWork||voice[2];
      return make('You remembered our conversation in week '+visit.week+' about “'+visit.subject+'”. '+changed);
    }
    return null;
  }
  function valid(site,week){
    if(root.EarthNeighbourErrands&&!root.EarthNeighbourErrands.valid(site,week))return false;
    if(root.EarthIntroductions&&!root.EarthIntroductions.valid(site,week))return false;
    const visits=site.agency?.visits;if(visits===undefined)return true;
    if(!Array.isArray(visits)||visits.length>128)return false;
    const seen=new Set();
    return visits.every(v=>{
      if(!v||typeof v.from!=='string'||typeof v.to!=='string'||!known(site,v.to)||v.from===v.to||
        !(root.EarthAgency?.canPlay?.(site,v.from)??(v.from==='steward'||site.residents.some(r=>r.id===v.from)))||!Number.isSafeInteger(v.week)||v.week<1||v.week>week||
        !Number.isSafeInteger(v.food)||v.food<0||typeof v.subject!=='string'||!v.subject.length||v.subject.length>100||
        typeof v.role!=='string'||v.role.length>100||
        [v.fromKey,v.toKey].some(key=>key!==undefined&&(typeof key!=='string'||!key.length||key.length>1040)))return false;
      if(v.thread!==undefined){
        const t=v.thread;
        if(!t||!['dream','career','agreement','project'].includes(t.kind)||typeof t.key!=='string'||!t.key.length||t.key.length>520||
          !Number.isSafeInteger(t.at)||t.at<0)return false;
      }
      const key=v.from+'|'+v.to;if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  const reads=new Set(['news','work','purpose','interests','dream','dream-help','visit-fit','supplies','truck','followup']);
  function readOnly(topic){
    return typeof topic==='string'&&(reads.has(topic)||topic.startsWith('neighbour:')||/^relay:terms:[0-2]:[1-9]\d*:[1-9]\d*$/.test(topic)||/^agreement:[1-9][0-9]*$/.test(topic)||
      /^errand:(terms|recall):[0-9]+$/.test(topic)||/^errand:hear:(supper|bench|meeting)$/.test(topic)||/^intro:recall:[0-9]+$/.test(topic));
  }
  const arrangements=(site,world,actorId)=>root.EarthNeighbourErrands?.arrangements(site,world,actorId)||[];
  function closeWeek(site,world){
    const notes=root.EarthNeighbourErrands?.closeWeek(site,world)||[];
    const gift=root.EarthDreams?.considerSupport?.(site,world);
    if(gift)notes.push(gift);
    return notes;
  }
  root.EarthDialogue=Object.freeze({describe,workOrder,topics,familiar,valid,arrangements,closeWeek,readOnly});
})(typeof window==='undefined'?globalThis:window);
