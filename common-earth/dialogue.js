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
  const pair=(site,from,to)=>site.agency?.visits?.find(v=>v.from===from&&v.to===to);
  const familiar=(site,a,b,week)=>[pair(site,a,b),pair(site,b,a)].some(v=>v&&v.week>=week-4)||
    (root.EarthNeighbourErrands?.reliability?.(site,a,b,week)||0)>0;
  const topics=(site,world,id)=>{
    const actor=root.EarthAgency.actorId(site),speaker=root.EarthAgency.identity(site,actor),target=root.EarthAgency.identity(site,id);
    if(!target||root.EarthCommunityLife?.present?.(site,id)===false)return [];
    const visitor=root.EarthCommunityLife?.residency?.(site,id)==='visitor';
    const visiting=world.communityLife&&root.EarthCommunityLife?.isHome?.(world,site)===false;
    if(visiting&&!visitor)return [
      {id:'news',label:'How are things here?'},{id:'work',label:'What do you do here?'},{id:'purpose',label:'Who depends on your work?'},
      {id:'interests',label:'What do you enjoy outside work?'},{id:'dream',label:'What are you hoping to do?'}
    ];
    if(visitor)return [{id:'news',label:'How is your visit going?'},{id:'visit-fit',label:'What would make you stay?'},
      {id:'interests',label:'What do you miss from home?'},{id:'dream',label:'What do you hope to do?'}];
    const options=[['news','How are things?'],['work','What are you working on?'],['purpose','Who depends on your work?'],['interests','What do you enjoy outside work?'],['listen','Make time to listen']];
    const arrangements=root.EarthNeighbourErrands?.topics(site,world,target,speaker)||[];
    const connection=root.EarthAutonomy?.contacts?.(site,id,world.week)?.find(r=>r.here!==false&&r.id!==actor&&root.EarthCommunityLife?.present?.(site,r.id)!==false);
    if(connection)options.push(['neighbour:'+connection.id,'How are things between you and '+connection.name+'?']);
    if(site.fleet?.incident)options.push(['truck','What happened on the delivery run?']);
    if(root.EarthResources&&root.EarthMarket&&/baker|grower|trader|repairer|seed|carpenter|courier|porter|driver|cook|gardener/i.test(target.role))
      options.push(['supplies',/repairer|carpenter/i.test(target.role)?'Which materials would you keep back?':'What would you leave on the shelf?']);
    if(root.EarthAutonomy?.dream?.(site,world,id))options.splice(3,0,['dream','What are you hoping to do?']);
    if(pair(site,actor,id))options.push(['followup','How did that turn out?']);
    const introductions=root.EarthIntroductions?.topics(site,world,id)||[];
    options.push(['meal','Share a meal · 1 food']);return [...arrangements,...options.map(([id,label])=>({id,label})),...introductions];
  };
  const lower=s=>s[0].toLowerCase()+s.slice(1);
  const teaching={
    stamina:'help someone learn to pace a longer walk',numeracy:'help someone check a calculation without me',
    music:'teach a neighbour one difficult phrase',organisation:'show someone how I plan a week’s supplies',
    care:'help someone learn to look after a neighbour',communication:'practise explaining a tricky idea with someone',
    craft:'show a neighbour how to make a sound repair'
  };
  function describe(site,world,target,speaker,topic,meeting){
    if(typeof topic!=='string')return {ok:false,message:'Choose a current conversation topic.'};
    if(root.EarthCommunityLife?.present?.(site,target.id)===false)return {ok:false,message:'This neighbour is away from the district.'};
    if(topic.startsWith('errand:'))return root.EarthNeighbourErrands?.converse(site,world,target,speaker,topic,meeting)||{ok:false,message:'That request has closed.'};
    if(topic.startsWith('intro:'))return root.EarthIntroductions?.converse(site,world,target.id,speaker.id,topic,meeting)||null;
    const id=target.id,tradeVoice=voices.find(([re])=>re.test(target.role))||[null,'I enjoy taking time to get a piece of work right.','We share the work that keeps this neighbourhood going.'];
    const former=target.originRole&&target.originRole.toLowerCase()!==target.role.toLowerCase()&&!/^supply porter$/i.test(target.originRole);
    const oldVoice=former&&voices.find(([re])=>re.test(target.originRole));
    const arrivals=site.communityLife?.people?.[id],oldTown=arrivals?.originId&&arrivals.originId!==site.id&&
      [...(world.sites||[]),...(world.communityLife?.outposts||[])].find(town=>town.id===arrivals.originId);
    const offDuty=target.interests?.[1];
    const voice=former?[null,'I started out doing '+target.originRole.toLowerCase()+' work. '+(oldVoice?.[2]||target.outsideWork||tradeVoice[1]),tradeVoice[2]]:
      oldTown&&offDuty?[null,'I brought my interest in '+offDuty+' with me from '+oldTown.name+'.',tradeVoice[2]]:tradeVoice;
    const plan=root.EarthAutonomy?.view(site,world,id),project=plan?.project,career=site.careers?.[id],visit=pair(site,speaker.id,id);
    const course=career?.training&&root.EarthCareers?.catalog?.find(j=>j.id===career.training.targetId)?.label;
    const goal=project?.title||(course&&course+' training')||target.interests?.[0]||target.role;
    const lane=supplyRun(target);
    const publicAgenda=site.civicInitiatives?.active;
    const vote=publicAgenda?.votes?.find(v=>v.personId===id);
    const heard=site.agency?.meals?.find(m=>m.to===id&&m.week===world.week);
    const sent=site.agency?.meals?.find(m=>m.to===speaker.id&&m.from===id&&m.week===world.week);
    const partner=project?.partnerName&&project.partnerId!==id?project.partnerName:null;
    const urgentFood=site.food<Math.ceil(site.population/5),employed=career&&root.EarthCareers?.view(world,site,id);
    const make=words=>({ok:true,message:target.name+' · “'+words+'”'});
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
      if(employed?.training)return 'I’m keeping up with '+goal+' alongside my work. I have completed '+employed.training.credits+' course credits.';
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
        kept:'The help we had agreed on arrived',missed:'The help we had agreed on never reached the person waiting for it'};
      return {...make(words+(memories[connection.kind]||'We worked together')+' in week '+connection.week+'.'),followContact:otherId};
    }
    if(topic==='truck'&&site.fleet?.incident){
      const incident=site.fleet.incident,driver=root.EarthAgency.identity(site,'driver'),taken=root.EarthAgency.identity(site,incident.actor);
      if(id===incident.actor)return {...make((incident.independent?'I took the truck myself when the pantry was empty. ':'I took the truck without a dispatch booking. ')+
        'People had counted on '+(driver?.name||'the driver')+' for the ordinary pickup. The incident is still open.'),followContact:driver?.id};
      if(id==='driver')return {...make('A pickup was missed. The truck was taken by '+(taken?.name||'a neighbour')+' in week '+incident.week+
        '. I need to see the missed work put right before I can trust the rota again.'),followContact:taken?.id};
      return {...make('The next person on the run had planned around the blue truck. '+(driver?.name||'The driver')+
        ' had a pickup to make when it was taken. '+voice[2]),followContact:driver?.id};
    }
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
      return make([d.quote||('I’m working towards '+d.title+'.'),detail].filter(Boolean).join(' '));
    }
    if(root.EarthCommunityLife?.residency?.(site,id)==='visitor'&&['news','visit-fit'].includes(topic)){
      const fit=root.EarthCommunityLife?.visitorFit?.(world,site,id);
      if(fit){
        const who=fit.ties?.[0]?.name;
        if(topic==='news')return make('I’m here from '+fit.homeName+' for the week. People tell me they could use help '+fit.need+'. '+
          (fit.known?'Someone has already taken the trouble to introduce me.':'I’d like to meet someone who lives with that work each day.'));
        const welcome=!fit.space?'There isn’t a spare room here yet.':!fit.food?'The pantry would be stretched by another household.':
          !fit.open?'The residents have paused invitations.':fit.skillMatch?'I know enough to help with '+fit.need+'.':
          'I’d need someone to show me how to help with '+fit.need+'.';
        return make(welcome+' '+(who?who+' is still in '+fit.homeName+', and that matters to me. ':
          fit.personalYes?'I can imagine a day of my own here. ':'I’m still deciding whether this daily life would suit me. ')+
          'I’ll decide when my visit ends in week '+fit.reviewWeek+'.');
      }
      if(topic==='news')return make('I’m finding out where I’d fit in. I know '+target.role.toLowerCase()+' work, and I’ve been asking who here could use a hand. '+(target.outsideWork||''));
      return make((target.traits?.sociability>=60?'I want people I can work alongside. ':'I need a place where I can have a quiet hour after work. ')+
        'I’d want room to carry on with '+(target.interests?.[1]||'my own plans')+' here.');
    }
    if(topic==='interests')return make(target.outsideWork||'I like '+goal+'.');
    if(topic==='work'){
      const motion=meeting?.activity;
      const observed=motion?.id===id&&typeof motion.label==='string'&&/^[A-Za-z]+ing\b/.test(motion.label)&&
        ['prepare','work','handover','study','rest','social','travel'].includes(motion.phase)?'I was '+lower(motion.label)+'. ':'';
      const activity=current();
      if(employed?.application?.phase==='notice')return make('I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. I’m serving notice through week '+employed.application.dueWeek+'. '+(employed.application.coverName?employed.application.coverName+' is taking the handover.':voice[2]));
      return make(observed+(employed?'I work as '+employed.career.toLowerCase()+' at '+employed.employer+'. ':'')+(activity||lane?.news||voice[1]));
    }
    if(topic==='purpose'){
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
      if(sent)latest='It was good to share that meal with you.';
      else if(heard)latest='I shared a meal with '+(root.EarthAgency.identity(site,heard.from)?.name||'a neighbour')+' this week.';
      else if(target.promise)latest='I’m counting on the promise due in week '+target.promise.dueWeek+'.';
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
    if(root.EarthNeighbourErrands&&!root.EarthNeighbourErrands.valid(site,week))return false;
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
  const reads=new Set(['news','work','purpose','interests','dream','visit-fit','supplies','truck','followup']);
  function readOnly(topic){
    return typeof topic==='string'&&(reads.has(topic)||topic.startsWith('neighbour:')||
      /^errand:(terms|recall):[0-9]+$/.test(topic)||/^errand:hear:(supper|bench|meeting)$/.test(topic)||/^intro:recall:[0-9]+$/.test(topic));
  }
  const arrangements=(site,world,actorId)=>root.EarthNeighbourErrands?.arrangements(site,world,actorId)||[];
  const closeWeek=(site,world)=>root.EarthNeighbourErrands?.closeWeek(site,world)||[];
  root.EarthDialogue=Object.freeze({describe,topics,familiar,valid,arrangements,closeWeek,readOnly});
})(typeof window==='undefined'?globalThis:window);
