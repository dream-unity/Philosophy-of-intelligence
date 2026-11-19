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
  const known=(site,id)=>id==='steward'||site.residents.some(p=>p.id===id)||/^walker-[0-4]$|^driver$|^carrier-[0-8]-[0-8]$/.test(id);
  const pair=(site,from,to)=>site.agency?.visits?.find(v=>v.from===from&&v.to===to);
  const familiar=(site,a,b,week)=>[pair(site,a,b),pair(site,b,a)].some(v=>v&&v.week>=week-4);
  const topics=(site,world,id)=>{
    const actor=root.EarthAgency.actorId(site);
    const options=[['news','How are things?'],['work','What are you working on?'],['purpose','Who depends on your work?'],['interests','What do you enjoy outside work?'],['listen','Make time to listen']];
    if(pair(site,actor,id))options.push(['followup','How did that turn out?']);
    const introductions=root.EarthIntroductions?.topics(site,world,id)||[];
    options.push(['meal','Share a meal · 1 food']);return options.map(([id,label])=>({id,label})).concat(introductions);
  };
  const lower=s=>s[0].toLowerCase()+s.slice(1);
  function describe(site,world,target,speaker,topic,meeting){
    if(topic.startsWith('intro:'))return root.EarthIntroductions?.converse(site,world,target.id,speaker.id,topic,meeting)||null;
    const id=target.id,voice=voices.find(([re])=>re.test(target.role))||[null,'I enjoy taking time to get a piece of work right.','We share the work that keeps this neighbourhood going.'];
    const plan=root.EarthAutonomy?.view(site,world,id),project=plan?.project,career=site.careers?.[id],visit=pair(site,speaker.id,id);
    const course=career?.training&&root.EarthCareers?.catalog?.find(j=>j.id===career.training.targetId)?.label;
    const goal=project?.title||(course&&course+' training')||target.interests?.[0]||target.role;
    const publicAgenda=site.civicInitiatives?.active;
    const vote=publicAgenda?.votes?.find(v=>v.personId===id);
    const heard=site.agency?.meals?.find(m=>m.to===id&&m.week===world.week);
    const sent=site.agency?.meals?.find(m=>m.to===speaker.id&&m.from===id&&m.week===world.week);
    const partner=project?.partnerName&&project.partnerId!==id?project.partnerName:null;
    const urgentFood=site.food<Math.ceil(site.population/5),employed=career&&root.EarthCareers?.view(world,site,id);
    const make=words=>({ok:true,message:target.name+' · “'+words+'”'});
    function current(){
      if(project){
        const title=lower(project.title),withWhom=partner?' '+partner+' is helping.':'';
        if(project.finishedWeek)return 'We finished the project “'+project.title+'”. '+(project.effect||voice[2]);
        const opening=project.phase==='Proposed'?'I’d like to ':project.phase==='Waiting'?'I’m waiting for a chance to ':'I’m trying to ';
        const next=project.next?.replace(/[.!?]+$/,'');
        if(project.phase==='Waiting')return opening+title+'.'+withWhom+(next?' '+next+'.':'');
        return opening+title+'.'+withWhom+(next?' Next I’ll '+lower(next)+'.':'');
      }
      if(plan&&['rest','visit','host','cover','gather','learn','apply','commitment'].includes(plan.kind))return plan.reason;
      if(employed?.training)return 'I’m keeping up with '+goal+' alongside my work. I have completed '+employed.training.credits+' course credits.';
      return '';
    }
    if(topic==='interests')return make(target.outsideWork||'I like '+goal+'.');
    if(topic==='work'){
      const activity=current();
      if(employed?.application?.phase==='notice')return make('I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. I’m serving notice through week '+employed.application.dueWeek+'. '+(employed.application.coverName?employed.application.coverName+' is taking the handover.':voice[2]));
      return make((employed?'I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. ':'')+(activity||voice[1]));
    }
    if(topic==='purpose'){
      if(project)return make((partner?partner+' and I have agreed to work together. ':'')+(project.beneficiaryName&&project.beneficiaryId!==id?'I’m doing it with '+project.beneficiaryName+' in mind. ':'')+
        (project.why||voice[2])+(project.effect?' '+project.effect:''));
      return make(voice[2]+' '+(site.construction?.[0]?'Right now the community has '+site.construction[0].name+' under construction.':urgentFood?'This week we need more food to cover the household share.':target.outsideWork||''));
    }
    if(topic==='news'){
      let latest='';
      if(sent)latest='It was good to share that meal with you.';
      else if(heard)latest='I shared a meal with '+(root.EarthAgency.identity(site,heard.from)?.name||'a neighbour')+' this week.';
      else if(target.promise)latest='I’m counting on the promise due in week '+target.promise.dueWeek+'.';
      else if(site.fleet?.incident&&id==='driver')latest='The co-op missed a pickup when the truck was taken. I want to see that put right.';
      else if(vote)latest=publicAgenda.leadId===id?'I proposed '+publicAgenda.title+' for '+publicAgenda.beneficiaryName+'. '+vote.reason:
        'We’re discussing '+publicAgenda.title+'. '+vote.reason;
      else if(id==='driver'&&site.fleet?.records?.[0]?.actor==='driver')latest=site.fleet.records[0].text;
      else if(current())latest=current();
      else if(career?.jobId&&career.history?.length)latest=career.history[0].text;
      else if(urgentFood)latest='With only '+site.food+' food in the pantry I’m worried we won’t have enough for this week’s meals.';
      else if(site.issue&&/steward|convenor/i.test(target.role))latest='People have until week '+site.issue.deadline+' to vote on “'+site.issue.title+'”.';
      else if(site.pursuits?.cart&&/courier|porter|driver|carpenter/i.test(target.role))latest=site.pursuits.cart.builder+' built a handcart for our supply trips.';
      else if(visit&&visit.week<world.week)latest='I remember our week '+visit.week+' conversation about '+visit.subject+'.';
      else if(/baker|grower|trader/i.test(target.role))latest='I counted '+site.food+' food in the stores this week.';
      else if(/driver|courier/i.test(target.role))latest='I’m keeping an eye on which workplace is ready to receive the next load.';
      else if(target.interests?.[1])latest='When I’m off duty I’m looking forward to '+target.interests[1]+'.';
      return make(voice[1]+(latest?' '+latest:''));
    }
    if(topic==='listen'){
      if(visit?.week===world.week)return make('I remember, you made time for me earlier. '+(current()||voice[2]));
      const a=site.agency||={actor:'steward',meals:[]};a.visits||=[];
      a.visits=a.visits.filter(v=>v.from!==speaker.id||v.to!==id);
      a.visits.unshift({from:speaker.id,to:id,week:world.week,subject:String(goal).slice(0,100),food:site.food,role:target.role});
      a.visits.length=Math.min(a.visits.length,128);
      return {...make((target.traits?.sociability>=60?'I’m glad you asked. ':'I don’t usually bring this up first. ')+(current()||voice[2])+' Ask me about it next time.'),changed:true};
    }
    if(topic==='followup'){
      if(!visit)return {ok:false,message:'Make time to listen first.'};
      const changed=visit.role!==target.role?'My work has changed since then. I’m now a '+target.role.toLowerCase()+'.':
        project&&project.title===visit.subject?'We have completed '+project.progress+' of '+project.total+' steps. '+(project.next||''):
        visit.food!==site.food?'We had '+visit.food+' food then. There are '+site.food+' in the pantry today.':
        current()||target.outsideWork||voice[2];
      return make('You remembered our conversation in week '+visit.week+' about “'+visit.subject+'”. '+changed);
    }
    return null;
  }
  function valid(site,week){
    if(root.EarthIntroductions&&!root.EarthIntroductions.valid(site,week))return false;
    const visits=site.agency?.visits;if(visits===undefined)return true;
    if(!Array.isArray(visits)||visits.length>128)return false;
    const seen=new Set();
    return visits.every(v=>{
      if(!v||typeof v.from!=='string'||typeof v.to!=='string'||!known(site,v.to)||v.from===v.to||
        !(root.EarthAgency?.canPlay?.(site,v.from)??(v.from==='steward'||site.residents.some(r=>r.id===v.from)))||!Number.isSafeInteger(v.week)||v.week<1||v.week>week||
        !Number.isSafeInteger(v.food)||v.food<0||typeof v.subject!=='string'||!v.subject.length||v.subject.length>100||
        typeof v.role!=='string'||v.role.length>100)return false;
      const key=v.from+'|'+v.to;if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  root.EarthDialogue=Object.freeze({describe,topics,familiar,valid});
})(typeof window==='undefined'?globalThis:window);
