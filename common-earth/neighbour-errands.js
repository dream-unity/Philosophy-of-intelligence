/* A neighbour can ask for help. The player carries that request to a different
   person whose commitments constrain the deal, then back to the original neighbour.
   A conversation never spends a resource before the work is carried out. */
(function(root){
  'use strict';
  const stories={
    supper:{
      title:'A place at the late table',subject:'Who missed the last supper?',good:'food',amount:2,axis:'care',
      custodian:/grower|seed keeper|baker|cook|garden/i,
      opening:'I brought the serving bowls in before the late crew came home. One of them had washed their hands and set out a plate.',
      ask:'Find out whether we can keep a basket back for them, or help me move the collection to the end of their shift.',
      goodsLabel:'Promise a supper basket',timeLabel:'Offer to run a late collection',
      useGoods:'Set out the supper basket',useTime:'Run the late collection together',
      goodsEffect:'Two portions went onto the late table. The neighbours coming off shift could eat together.',
      timeEffect:'We took the collection round after the shift. The neighbours who usually find an empty doorstep could take their own share.',
      reminder:'I’ve left the bowls out this time.',metric:'wellbeing'
    },
    bench:{
      title:'The spare hinge',subject:'What happened to the folding bench?',good:'materials',amount:1,axis:'craft',
      custodian:/repairer|carpenter|engineer|mechanic/i,
      opening:'There’s a folding bench leaning against my wall. The board is sound. The hinge is the same size as the ones we keep for repairs.',
      ask:'See whether a fitting can leave the cupboard. If it needs to stay there, the two of us could true the bent one instead.',
      goodsLabel:'Promise a spare fitting',timeLabel:'Offer a repair session',
      useGoods:'Fit the replacement hinge',useTime:'Straighten the hinge together',
      goodsEffect:'The spare fitting went into the bench. The next learner has a steady place to work.',
      timeEffect:'We straightened the old hinge on the bench. The repair cupboard still has its spare fitting and the learner saw how we did it.',
      reminder:'I’ve kept that board straight and dry.',metric:'wellbeing'
    },
    meeting:{
      title:'The chair by the door',subject:'Why did you leave that chair empty?',good:'funds',amount:1,axis:'organisation',
      custodian:/convenor|steward|trader|organiser|organizer/i,
      opening:'I put a chair by the door for someone finishing late. The last ride had already gone by the time they could leave.',
      ask:'Ask about a fare from the common purse. If it’s already spoken for, we could take the agenda round and bring their own words back.',
      goodsLabel:'Promise to cover the fare',timeLabel:'Offer to carry their statement',
      useGoods:'Arrange the return ride',useTime:'Visit and record their words',
      goodsEffect:'The fare covered a return ride. The neighbour took the chair and spoke for themselves.',
      timeEffect:'We read the statement back to its author before taking it to the meeting. Their words were entered in the minutes.',
      reminder:'The chair is still beside the door.',metric:'trust'
    }
  };
  const followups={
    supper:{...stories.supper,title:'A basket for the far doorstep',subject:'Who still can’t reach the collection?',
      opening:'The late table is working. A neighbour told me the walk home with a full basket is the part they can’t manage.',
      ask:'Ask what can go into a smaller doorstep parcel. If the pantry can’t spare it, we could spend the round taking their usual basket home.',
      goodsLabel:'Promise a doorstep parcel',timeLabel:'Offer a doorstep round',
      useGoods:'Prepare the doorstep parcel',useTime:'Carry the usual basket together',
      goodsEffect:'Two portions were packed for the far doorstep. The resident could bring them inside one at a time.',
      timeEffect:'We walked the usual basket all the way home. The receiver showed us where the long climb starts.',
      reminder:'I’ve got the doorstep address here.'},
    bench:{...stories.bench,title:'The carrier’s sideboard',subject:'Who is using the repaired bench?',
      opening:'Someone brought a handcart to the bench we repaired. A split sideboard lets the little parcels slide into the road.',
      ask:'Ask if a new sideboard can come from the repair stock. If the wood is spoken for, we can bind the sound pieces and let the carrier finish the fit.',
      goodsLabel:'Promise a replacement board',timeLabel:'Offer to bind the split board',
      useGoods:'Fit the new sideboard',useTime:'Bind and fit the old board',
      goodsEffect:'The new sideboard holds the carrier’s small parcels inside the cart.',
      timeEffect:'We bound the split sideboard with the carrier. They fitted it and can repeat the repair without us.',
      reminder:'The carrier left the damaged board at our bench.'},
    meeting:{...stories.meeting,title:'The voice after closing time',subject:'Whose words were missing from the minutes?',
      opening:'Someone read the minutes from our meeting after they closed their stall. They had a different account of what happened and want the room to hear it.',
      ask:'See whether the common purse can pay their ride from closing time. If it can’t, we can take down their account and read it back for their approval.',
      goodsLabel:'Promise a ride after closing',timeLabel:'Offer to take their account',
      useGoods:'Arrange the after-hours ride',useTime:'Take and confirm the account',
      goodsEffect:'The late trader travelled to the meeting and gave their own account.',
      timeEffect:'We took down the account and read it back at the stall. The trader approved the words that went into the minutes.',
      reminder:'I’ve kept their copy of the minutes with mine.'}
  };
  const storyFor=row=>(row.variant==='followup'?followups:stories)[row.kind];
  const outcomeFor=row=>row.unserved?'We walked the late route and recorded who was still waiting. There was too little food to put supper on their tables.':
    storyFor(row)[row.method==='goods'?'goodsEffect':'timeEffect'];
  const limit=48,openStatus=new Set(['asked','agreed']);
  const appointments=new WeakMap(),empty=Object.freeze([]);
  const venues={supper:'market',bench:'workshop',meeting:'hall'};
  const causes={shortage:'supper',spoilage:'supper',vacancy:'bench',construction:'bench',dispatch:'meeting',hearing:'meeting'};
  const firstDue=row=>row.week+(row.origin==='neighbours'?3:2);
  const records=site=>site?.agency?.arrangements?.rows||[];
  function heldGoods(site,week){
    const held={food:0,materials:0,funds:0};
    for(const row of records(site)){
      if(row.status!=='agreed'||row.method!=='goods'||row.workWeek!=null||row.dueWeek<week)continue;
      const story=stories[row.kind];if(story)held[story.good]+=story.amount;
    }
    return held;
  }
  const person=(site,id)=>root.EarthAgency?.identity(site,id);
  const member=(site,id)=>root.EarthCommunityLife?.residency?.(site,id)==='member'||
    (!root.EarthCommunityLife?.residency&&Boolean(root.EarthAgency?.canPlay?.(site,id)));
  const visible=(site,id)=>root.EarthCommunityLife?.present?.(site,id)!==false;
  const said=(p,words,changed=false)=>({ok:true,message:p.name+' · “'+words+'”',...(changed?{changed:true}:{})});
  const fail=message=>({ok:false,message});
  const count=(n,good)=>n+' '+(n===1&&good==='materials'?'material':n===1&&good==='funds'?'fund':good);
  const active=(row,week)=>openStatus.has(row.status)&&week<=row.dueWeek;
  const bounded=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
  const name=(site,id)=>person(site,id)?.name||'Neighbour';
  function subjectOf(p){
    if(/seed|cook|baker|grower|gardener|nurse/i.test(p.role))return 'supper';
    if(/carpenter|engineer|repairer|mathematician|mechanic/i.test(p.role))return 'bench';
    if(/convenor|steward|courier|porter|trader|teacher|driver/i.test(p.role))return 'meeting';
    return ['craft','numeracy'].includes(p.strengths?.[0])?'bench':p.strengths?.[0]==='care'?'supper':'meeting';
  }
  function contactFor(site,owner,actor,story,list=root.EarthPersonas?.list(site)||site.residents){
    let best=null,score=-1;
    for(const profile of list){
      if(profile.id===owner.id||profile.id===actor.id||!member(site,profile.id)||!visible(site,profile.id))continue;
      const occupation=root.EarthCareers?.role?.(site,profile.id)||profile.role;
      const skill=site.careers?.[profile.id]?.skills?.[story.axis]??profile.aptitudes?.[story.axis]??0;
      // A recognised trade gives the request a natural first contact. A trusted
      // colleague can break a tie between people with comparable experience.
      const familiar=site.agency?.visits?.some(v=>v.from===owner.id&&v.to===profile.id||v.to===owner.id&&v.from===profile.id);
      const value=(story.custodian.test(occupation)?100:0)+skill+(familiar?8:0);
      if(value>score){best=profile;score=value;}
    }
    return best;
  }
  function reliability(site,a,b,week){
    const last=records(site).find(r=>r.finishedWeek>=week-6&&['kept','missed'].includes(r.status)&&
      (r.actorId===a&&(r.requesterId===b||r.contactId===b)||r.actorId===b&&(r.requesterId===a||r.contactId===a)));
    return last?.status==='kept'?1:last?.status==='missed'?-1:0;
  }
  function priority(site,world,row){
    const story=storyFor(row),goods=story.good,slot={food:0,materials:1,funds:2}[goods];
    const promised=site.residents.find(p=>p.slot===slot);
    const outstanding=promised?.promise?Math.max(0,[3,2,3][slot]-(promised.promise.advance?.[goods]||0)):0;
    const meals=goods==='food'?Math.ceil(site.population/5):0;
    const other=records(site).filter(r=>r.id!==row.id&&r.status==='agreed'&&r.workWeek==null&&r.dueWeek>=world.week&&r.method==='goods'&&stories[r.kind].good===goods);
    const committed=other.reduce((n,r)=>n+stories[r.kind].amount,0);
    // Some storekeepers wait for a sound replacement after a real spoilage.
    // Their reserve belongs to these negotiations and expires with that loss.
    const loss=site.resourceLedger?.lastLoss;
    const damaged=goods==='food'&&loss&&loss.week>=world.week-1&&
      Object.entries(loss.bins||{}).find(([crop,n])=>n>0&&['roots','fruit','berries','greens','mushrooms','kelp'].includes(crop));
    const keeper=damaged&&person(site,row.contactId),traits=keeper?.traits;
    const reserve=traits&&traits.patience>=65&&traits.patience-traits.adaptability>=15?1:0;
    const floor=outstanding+meals+committed+reserve;
    const lines=[];
    if(meals)lines.push(count(meals,'food')+' for the household round');
    if(outstanding)lines.push(count(outstanding,goods)+' promised to '+promised.name);
    if(committed)lines.push(count(committed,goods)+' already offered to other neighbours');
    if(reserve)lines.push('one portion I’m holding back until we replace the '+({roots:'root vegetables',fruit:'orchard fruit',greens:'leaf greens',kelp:'seaweed'}[damaged[0]]||damaged[0])+' that spoiled in week '+loss.week);
    const cautious=reliability(site,row.actorId,row.requesterId,world.week)<0||reliability(site,row.actorId,row.contactId,world.week)<0;
    return {floor,lines,stock:site[goods],cautious,goodsAvailable:!cautious&&site[goods]-story.amount>=floor};
  }
  function calendarNote(site,row){
    const claim=site.residents.find(r=>r.promise?.by===row.actorId&&r.promise.dueWeek<=row.dueWeek);
    if(claim)return ' '+claim.name+' is already expecting you by week '+claim.promise.dueWeek+'. We need to fit the visits around one another.';
    const job=site.careers?.[row.actorId],notice=job?.application;
    if(notice?.phase==='notice'&&notice.dueWeek<=row.dueWeek)return ' Your work handover is due in week '+notice.dueWeek+'. I’d check which day your old crew still needs you.';
    if(job?.training?.pace==='intensive'&&!job.training.paused)return ' You already have an intensive study timetable. Allow for the time it takes to meet in person.';
    return '';
  }
  function terms(site,world,row){
    const story=storyFor(row),p=priority(site,world,row),owner=name(site,row.requesterId);
    const stock=(story.good==='food'?'The pantry has ':story.good==='materials'?'The cupboard holds ':'The common purse has ')+count(p.stock,story.good)+'. ';
    const floor=p.lines.length?'From that I need '+p.lines.join(' and ')+'. ':'I haven’t promised any of it elsewhere. ';
    const goods=p.cautious?'Last time the help never arrived. I’d like to see you give the time yourself before I put our supplies against your name again.':p.goodsAvailable?'I could let '+owner+' have '+count(story.amount,story.good)+' if you come back while it is still free.':
      'I can’t release '+count(story.amount,story.good)+' today.';
    return stock+floor+goods+' You can also give your time.'+calendarNote(site,row);
  }
  function rowsFor(site,world,actorId){
    return records(site).filter(row=>actorId==null||row.actorId===actorId).map(row=>{
      const story=storyFor(row),nextId=row.status==='asked'?row.contactId:row.status==='agreed'?row.requesterId:null;
      const finished=row.status==='kept'?outcomeFor(row):
        row.status==='missed'?'The agreed help did not arrive.':row.releaseCause==='requesterAway'?'The requester had left the community before the handover. The agreement was released.':
        row.status==='withdrawn'?'The enquiry closed before anyone committed.':'';
      const next=row.status==='agreed'&&row.workWeek!=null?name(site,row.actorId)+' has set out to meet '+name(site,row.requesterId)+' at the '+venues[row.kind]+'.':
        nextId?'Meet '+name(site,nextId)+(row.status==='asked'?' to hear what else is already promised.':' to carry out the agreement by week '+row.dueWeek+'.'):finished;
      const dateHistory=row.dateDecision==='agreed'?' The requester moved the date from week '+firstDue(row)+' to week '+row.dueWeek+'.':
        row.dateDecision==='declined'?' The requester kept the original date, week '+row.dueWeek+'.':'';
      return {...row,title:story.title,reason:story.opening,nextId,next:next+dateHistory,outcome:finished};
    });
  }
  function concern(site,world,kind){
    if(kind==='supper'){
      const loss=site.resourceLedger?.lastLoss;
      if(loss?.week===world.week&&Object.values(loss.bins||{}).some(amount=>amount>0))
        return 'Some of this week’s food spoiled before the kitchen could use it. Can I tell you who missed the serving round?';
      if(site.food<Math.ceil(site.population/5))return 'We can’t set aside enough for all the households. Will you hear what happened after the last shift?';
    }
    if(kind==='bench'){
      const job=root.EarthCareers?.catalog?.find(post=>post.metric==='repair'&&site.employers?.[post.id]?.open?.length);
      if(job){const former=site.employers[job.id].open[0].name;
        return 'Nobody has taken '+former+'’s old post at '+job.employer+' yet. I have a small repair that could get someone back to work.';}
    }
    if(kind==='meeting'&&site.fleet?.incident)return 'The co-op missed a pickup. I’m trying to reach someone who works through the meeting. Do you have a moment?';
    return '';
  }
  function localNeeds(site,world){
    const needs=[],week=world.week,servings=Math.ceil(site.population/5);
    if(site.food<servings*2)needs.push(['shortage','We counted '+site.food+' food for a round that takes '+servings+'.']);
    const loss=site.resourceLedger?.lastLoss;
    if(loss?.week>=week-1&&Object.values(loss.bins||{}).some(n=>n>0))
      needs.push(['spoilage','The kitchen lost part of its crop in week '+loss.week+'.']);
    const vacancy=root.EarthCareers?.catalog?.find(j=>j.metric==='repair'&&site.employers?.[j.id]?.open?.length);
    if(vacancy)needs.push(['vacancy',vacancy.employer+' was still trying to replace '+site.employers[vacancy.id].open[0].name+'.']);
    const build=site.construction?.find(j=>j.name);
    if(build)needs.push(['construction','The crew drawing materials for '+build.name+' also needed the repair cupboard.']);
    if(site.fleet?.incident)needs.push(['dispatch','The usual truck pickup was missed in week '+site.fleet.incident.week+'.']);
    if(site.issue?.deadline>=week)needs.push(['hearing','People had only until week '+site.issue.deadline+' to answer the notice. We wanted late workers heard at the next meeting.']);
    return needs;
  }
  function timeConflict(site,world,p){
    const id=p.id,career=site.careers?.[id];
    return !member(site,id)||!visible(site,id)||site.shift?.residentId===id||site.purses?.tickets?.[id]||
      site.workforce?.members?.[id]?.jobId||site.fleet?.custody?.actor===id||
      career?.training?.pace==='intensive'&&!career.training.paused||career?.application?.phase==='notice'||
      root.EarthCareers?.handoverDuty?.(site,id,world.week)||root.EarthCareers?.specialistShift?.(site,id,world.week)||
      site.residents.some(r=>r.promise&&(r.id===id||r.promise.by===id));
  }
  function checkNeighbourOffer(site,world,row){
    const helper=person(site,row.actorId),keeper=person(site,row.contactId),owner=person(site,row.requesterId);
    if(!helper||!keeper||!owner||![helper,keeper,owner].every(p=>visible(site,p.id)&&member(site,p.id)))return '';
    const refusal=timeConflict(site,world,helper)||timeConflict(site,world,owner);
    const trust=root.EarthRelationships?.strength(site.autonomy?.people?.[helper.id],owner,world.week)||0;
    const claim=priority(site,world,row),margin=claim.stock-claim.floor-stories[row.kind].amount;
    const keeperTrust=root.EarthRelationships?.strength(site.autonomy?.people?.[keeper.id],helper,world.week)||0;
    const authority=stories[row.kind].custodian.test(root.EarthCareers?.role?.(site,keeper.id)||keeper.role);
    const supplyCleared=authority&&keeperTrust>=-1&&claim.goodsAvailable&&margin>=((keeper.traits?.patience??50)>65?2:1);
    const tired=(site.autonomy?.people?.[helper.id]?.energy??5)<3;
    if(trust<=-3||refusal||tired&&!supplyCleared){
      row.status='withdrawn';row.finishedWeek=world.week;
      row.reply=trust<=-3?'trust':refusal?'duty':'rest';
      return helper.name+' declined the request from '+owner.name+'. '+declineText(row);
    }
    const axis=stories[row.kind].axis;
    const skill=site.careers?.[helper.id]?.skills?.[axis]??helper.aptitudes?.[axis]??0;
    const personalVisit=!tired&&(trust>=3||skill>=58&&(helper.traits?.patience??50)+(helper.traits?.sociability??50)>=110);
    const grant=supplyCleared&&!personalVisit;
    if(personalVisit&&supplyCleared)row.volunteered=true;
    row.review={stock:claim.stock,floor:claim.floor,why:!authority?'authority':keeperTrust< -1?'trust':!supplyCleared?'reserve':grant?'release':'volunteer'};
    row.method=grant?'goods':'time';row.agreedWeek=world.week;row.status='agreed';
    return grant?keeper.name+' cleared '+count(stories[row.kind].amount,stories[row.kind].good)+' for '+helper.name+
      ' to take to '+owner.name+' by week '+row.dueWeek+'.':
      helper.name+' offered a personal work session to '+owner.name+(row.volunteered?' so the stores could keep their spare supplies.':' after '+keeper.name+' reviewed the other claims.')+' They arranged to meet by week '+row.dueWeek+'.';
  }
  function declineText(row){
    return row.reply==='trust'?'Their earlier dealings made another commitment difficult.':
      row.reply==='duty'?'Their existing appointments took precedence.':'The helper needed a week to rest.';
  }
  function reviseDelivery(site,world,row){
    if(row.playerTerms||row.status!=='agreed'||row.method!=='goods'||row.workWeek!=null||row.agreedWeek>=world.week)return '';
    const claim=priority(site,world,row);
    if(claim.goodsAvailable)return '';
    const helper=person(site,row.actorId),owner=person(site,row.requesterId);
    if(!helper||!owner||timeConflict(site,world,helper)||timeConflict(site,world,owner)||
      (site.autonomy?.people?.[helper.id]?.energy??5)<3)return '';
    const keeper=name(site,row.contactId),bond=root.EarthRelationships?.strength(site.autonomy?.people?.[owner.id],helper,world.week)||0;
    if(bond<0||(owner.traits?.adaptability??50)<48&&row.dueWeek>world.week)return '';
    row.method='time';row.changedWeek=world.week;
    return keeper+' could no longer spare '+count(stories[row.kind].amount,stories[row.kind].good)+'. '+owner.name+' accepted '+helper.name+
      '’s offer to keep the appointment with their own time instead.';
  }
  function neighbourDecisions(site,world){
    // The original resident never signs on the player's behalf. A temporary
    // viewpoint also keeps control of their own reply while the player is there.
    if(!world.communityLife||!root.EarthAutonomy||world.week<=site.founded+1||world.week>Number.MAX_SAFE_INTEGER-4)return '';
    const rows=records(site),week=world.week,controlled=world.activeId===site.id?root.EarthAgency.actorId(site):null;
    const pending=rows.find(r=>r.origin==='neighbours'&&active(r,week));
    if(pending){
      if(pending.week>=week||[pending.actorId,pending.requesterId,pending.contactId].includes(controlled))return '';
      if(pending.status==='agreed')return reviseDelivery(site,world,pending);
      return checkNeighbourOffer(site,world,pending);
    }
    if(rows.some(r=>r.origin==='neighbours'&&week-(r.finishedWeek||r.week)<5))return '';
    const needs=localNeeds(site,world).filter(([cause])=>!rows.some(r=>r.cause===cause&&week-r.week<13));
    if(!needs.length||rows.length>=limit&&rows.every(r=>openStatus.has(r.status)))return '';
    const occupied=new Set(['steward',controlled]);
    for(const r of rows)if(active(r,week)||r.week===week)for(const id of [r.actorId,r.requesterId,r.contactId])occupied.add(id);
    const candidates=(root.EarthPersonas?.list(site)||[]).filter(p=>!occupied.has(p.id)&&!timeConflict(site,world,p)&&
      (site.autonomy?.people?.[p.id]?.energy??5)>=2);
    if(candidates.length<3)return '';
    for(const [cause,detail] of needs){
      const kind=causes[cause],story=stories[kind],recent=p=>rows.find(r=>r.requesterId===p.id&&r.kind===kind&&r.status==='kept');
      const requesters=candidates.filter(p=>subjectOf({role:root.EarthCareers?.role?.(site,p.id)||p.role,strengths:p.strengths})===kind&&
        week-(recent(p)?.finishedWeek??-100)>5);
      requesters.sort((a,b)=>(b.traits?.initiative??50)-(a.traits?.initiative??50));
      const owner=requesters[0];if(!owner)continue;
      const helpers=candidates.filter(p=>p!==owner).map(p=>{
        const trust=root.EarthRelationships?.strength(site.autonomy?.people?.[owner.id],p,week)||0;
        const skill=site.careers?.[p.id]?.skills?.[story.axis]??p.aptitudes?.[story.axis]??40;
        return {p,trust,score:skill+(p.traits?.sociability??50)/4+(p.traits?.initiative??50)/5+trust*5};
      }).filter(o=>o.trust>-3).sort((a,b)=>b.score-a.score);
      const helper=helpers[0]?.p;if(!helper)continue;
      const keeper=contactFor(site,owner,helper,story,candidates);if(!keeper)continue;
      const agency=site.agency||={actor:'steward',meals:[]},book=agency.arrangements||={serial:0,rows:[]};
      if(book.serial>=Number.MAX_SAFE_INTEGER)return '';
      if(book.rows.length>=limit)book.rows.splice(book.rows.findLastIndex(r=>!openStatus.has(r.status)),1);
      const prior=recent(owner),row={id:++book.serial,kind,...(prior?{variant:'followup'}:{}),origin:'neighbours',cause,detail:detail.slice(0,256),
        actorId:helper.id,requesterId:owner.id,contactId:keeper.id,week,dueWeek:week+3,status:'asked'};
      book.rows.unshift(row);
      return owner.name+' asked '+helper.name+' about “'+storyFor(row).title+'”. '+detail+' '+keeper.name+' will review what is already promised.';
    }
    return '';
  }
  function witness(site,world,id){
    return records(site).find(r=>r.origin==='neighbours'&&[r.requesterId,r.actorId,r.contactId].includes(id)&&
      (active(r,world.week)||r.finishedWeek>=world.week-2))||null;
  }
  function account(site,world,id,speaker,row){
    if(!row||![row.actorId,row.requesterId,row.contactId].includes(id))return null;
    const owner=name(site,row.requesterId),helper=name(site,row.actorId),keeper=name(site,row.contactId),story=storyFor(row);
    const mine=id===row.requesterId,clerk=id===row.contactId;
    const intro=mine?'I asked '+helper+' whether we could do something. '+row.detail+' ':
      clerk?owner+' asked me to look over the other claims. ':'I took '+owner+'’s request to '+keeper+'. ';
    let waiting='We’re waiting to hear what '+keeper+' can release.';
    if(clerk&&row.status==='asked'){
      const p=priority(site,world,row);
      waiting='I counted '+count(p.stock,story.good)+'. '+(p.lines.length?'First I need '+p.lines.join(' and ')+'. ':'The usual commitments are covered. ')+
        'I’ll check with '+helper+' before putting anything aside.';
    }
    const decision=row.status==='asked'?waiting:
      row.status==='kept'?(mine?'They came back as agreed. ':clerk?'I heard back from '+owner+'. ':'We got there in week '+row.finishedWeek+'. ')+outcomeFor(row):
      row.status==='agreed'?(row.method==='goods'?'We set aside '+count(story.amount,story.good)+' for the handover. ':
        (row.volunteered?'We could have used the spare supplies. ':'The supplies had other claims. ')+(mine||clerk?helper+' offered their own time. ':'I offered my own time. '))+'We agreed on week '+row.dueWeek+' at the latest.':
      row.status==='missed'?(mine?'I waited for the help until week '+row.dueWeek+'. It didn’t arrive.':
        'The help never reached '+owner+' in time. We had counted on week '+row.dueWeek+'.'):
      row.reply?declineText(row):'We let that arrangement go.';
    const other=[clerk?row.actorId:mine?row.contactId:row.requesterId,row.actorId,row.contactId,row.requesterId]
      .find(key=>key!==id&&key!==speaker&&visible(site,key)&&member(site,key));
    const why=row.changedWeek?' We changed to a work session in week '+row.changedWeek+' when the spare stock was needed elsewhere.':
      clerk&&row.review?.why==='authority'?' I could review their idea, but I couldn’t sign common supplies out for this.':
      clerk&&row.review?.why==='trust'?' I wasn’t ready to put a public allocation against their name.':
      clerk&&row.review?.why==='reserve'?' On the day we decided, there were '+count(row.review.stock,story.good)+' in store and '+row.review.floor+' already needed a place in my calculation.':'';
    return {ok:true,message:name(site,id)+' · “'+intro+decision+why+'”',...(other?{followContact:other}:{})};
  }
  function greeting(site,world,actorId,targetId){
    const row=records(site).find(r=>r.actorId===actorId&&active(r,world.week)&&
      (r.status==='asked'?r.contactId:r.requesterId)===targetId);
    if(!row){
      if(!site.resourceLedger?.lastLoss&&site.food>=Math.ceil(site.population/5)&&!site.employers&&!site.fleet?.incident)return null;
      const target=person(site,targetId),actor=person(site,actorId);
      if(!target||!actor)return null;
      const kind=subjectOf(target),words=concern(site,world,kind);
      if(!words||!offer(site,world,target,actor)?.contact)return null;
      return {key:'concern-'+kind+'-'+world.week,topic:'errand:hear:'+kind,words,initiated:true};
    }
    const story=storyFor(row);
    return {key:'arrangement-'+row.id+'-'+row.status,topic:'errand:'+(row.status==='asked'?'terms':'recall')+':'+row.id,
      words:row.status==='asked'?'I’ve checked what’s already spoken for. Come over and I’ll tell you what I can spare.':story.reminder};
  }
  function offer(site,world,owner,actor){
    if(world.week>Number.MAX_SAFE_INTEGER-2||!member(site,owner.id)||!member(site,actor.id)||!visible(site,owner.id)||owner.id===actor.id)return null;
    const all=records(site),week=world.week;
    if(all.some(r=>(r.actorId===actor.id||r.requesterId===owner.id)&&(active(r,week)||r.week===week)))return null;
    if(all.length>=limit&&!all.some(r=>!openStatus.has(r.status)))return null;
    const kind=subjectOf(owner),previous=all.find(r=>r.requesterId===owner.id&&r.kind===kind&&r.status==='kept');
    // A finished repair stays repaired. Later help concerns a different
    // household using what was built, and remembers who made it possible.
    if(previous&&week-previous.finishedWeek<(previous.variant==='followup'?13:2))return null;
    const variant=previous?'followup':null,story=storyFor({kind,variant});
    return {kind,variant,previous,story,contact:contactFor(site,owner,actor,story)};
  }
  function topics(site,world,owner,actor){
    if(!site||world?.activeId!==site.id||!actor||!owner||!member(site,actor.id)||!member(site,owner.id))return [];
    const mine=records(site).find(r=>r.actorId===actor.id&&active(r,world.week));
    const opt=(verb,id,label)=>({id:'errand:'+verb+':'+id,label,context:true});
    if(!mine){
      const proposal=offer(site,world,owner,actor);
      if(!proposal?.contact)return [];
      if(concern(site,world,proposal.kind))return [opt('hear',proposal.kind,'Tell me what happened'),
        opt('ask',proposal.kind,'I’ll ask '+proposal.contact.name+' what can be spared')];
      return [opt('ask',proposal.kind,proposal.story.subject)];
    }
    const story=storyFor(mine),options=[];
    if(mine.contactId===owner.id&&mine.workWeek==null){
      options.push(opt('terms',mine.id,'What has already been promised?'));
      if(mine.status==='asked'||mine.method==='time')options.push(opt('goods',mine.id,story.goodsLabel));
      if(mine.status==='asked'||mine.method==='goods')options.push(opt('time',mine.id,story.timeLabel));
    }
    if(mine.requesterId===owner.id){
      options.push(opt('recall',mine.id,'Where did we leave this?'));
      if(mine.status==='agreed'){
        options.push(opt('finish',mine.id,story[mine.method==='goods'?'useGoods':'useTime']));
        if(mine.workWeek==null&&!mine.dateDecision&&mine.dueWeek<Number.MAX_SAFE_INTEGER&&world.week>=mine.dueWeek-1)
          options.push(opt('later',mine.id,'Could we meet one week later?'));
      }else{
        if(!visible(site,mine.contactId)||!member(site,mine.contactId))options.push(opt('redirect',mine.id,'Who else can check the commitments?'));
        options.push(opt('decline',mine.id,'Leave it with them for now'));
      }
    }
    return options;
  }
  function converse(site,world,owner,actor,topic,proof){
    if(!site||world?.activeId!==site.id||!actor||root.EarthAgency.actorId(site)!==actor.id||!owner||!member(site,owner.id)||!member(site,actor.id)||
      !visible(site,owner.id)||proof?.mode!=='walk'||proof.siteId!==site.id||proof.actor!==actor.id||proof.target!==owner.id||
      ![proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)||Math.hypot(proof.x-proof.tx,proof.y-proof.ty)>1.56)
      return fail('Meet the named neighbour on foot to discuss the arrangement.');
    const [,action,key]=topic.split(':');
    if(!topics(site,world,owner,actor).some(o=>o.id===topic))return fail('That arrangement has changed. Ask about what is needed now.');
    if(action==='hear'){
      const {contact,story}=offer(site,world,owner,actor);
      return said(owner,story.opening+' '+story.ask+' '+contact.name+' keeps track of the other claims.');
    }
    if(action==='ask'){
      const {kind,contact,variant,previous,story}=offer(site,world,owner,actor);
      const agency=site.agency||={actor:actor.id,meals:[]};
      const book=agency.arrangements||={serial:0,rows:[]};
      if(book.serial>=Number.MAX_SAFE_INTEGER)return fail('The book has no space for a new arrangement.');
      if(book.rows.length>=limit)book.rows.splice(book.rows.findLastIndex(r=>!openStatus.has(r.status)),1);
      const row={id:++book.serial,kind,...(variant?{variant}:{}),actorId:actor.id,requesterId:owner.id,contactId:contact.id,week:world.week,dueWeek:world.week+2,status:'asked'};
      book.rows.unshift(row);
      const memory=previous?(previous.actorId===actor.id?'You':name(site,previous.actorId))+
        (previous.method==='time'?' gave us the time':' brought the supplies')+' for the earlier round in week '+previous.finishedWeek+'. ':'';
      return said(owner,memory+story.opening+' '+contact.name+' keeps track of the other claims. '+story.ask,true);
    }
    const row=records(site).find(r=>r.id===Number(key)&&r.actorId===actor.id),story=storyFor(row);
    if(action==='terms')return said(owner,terms(site,world,row));
    if(action==='redirect'){
      const substitute=contactFor(site,owner,actor,story);
      if(!substitute)return said(owner,'I can’t find anyone else here who can check the outstanding claims. Leave it with me for now.');
      row.contactId=substitute.id;
      return said(owner,'The first contact is away. '+substitute.name+' can look over the commitments with you.',true);
    }
    if(action==='decline'){row.status='withdrawn';row.finishedWeek=world.week;return said(owner,'Thanks for telling me. I won’t count on you for this one.',true);}
    if(action==='recall'){
      if(row.status==='asked')return said(owner,story.reminder+' '+name(site,row.contactId)+' knows what’s already promised.');
      if(row.workWeek!=null)return said(owner,story.reminder+' I’ve come to the '+venues[row.kind]+' for our appointment.');
      return said(owner,story.reminder+' I’m expecting '+(row.method==='goods'?count(story.amount,story.good):'your time on the rota')+' by week '+row.dueWeek+'.');
    }
    if(action==='later'){
      const meals=Math.ceil(site.population/5),urgent=row.kind==='supper'&&site.food<=meals;
      const agenda=row.kind==='meeting'&&site.issue?.deadline>=world.week&&site.issue.deadline<=row.dueWeek;
      const uneasy=reliability(site,actor.id,owner.id,world.week)<0;
      const traits=owner.traits||{},flexible=(traits.patience??50)+(traits.adaptability??50)>=114;
      const reason=urgent?'There’s only the next household round in the pantry. The late crew would go another week without their share.':
        agenda?'The vote closes in week '+site.issue.deadline+'. If we meet later their words can’t change it.':
        uneasy?'The last time we agreed to meet, the help didn’t arrive. I need to see this arrangement kept.':
        !flexible?story.reminder+' I arranged my own week around the date we agreed. I’d like to keep it.':'';
      row.dateAskedWeek=world.week;row.dateDecision=reason?'declined':'agreed';
      if(reason)return said(owner,reason+' I’m counting on week '+row.dueWeek+'.',true);
      const old=row.dueWeek++;
      return said(owner,'I can make room one week later. I’ll tell '+name(site,row.contactId)+' we moved it from week '+old+' to week '+row.dueWeek+'.',true);
    }
    const chosen=action==='finish'?row.method:action,p=priority(site,world,row);
    if(row.workWeek==null&&chosen==='goods'&&!p.goodsAvailable)return said(owner,terms(site,world,row)+(action==='finish'?' Talk to '+name(site,row.contactId)+' if you can offer your time instead.':''));
    if(action!=='finish'){
      row.status='agreed';row.method=chosen;row.agreedWeek=world.week;delete row.volunteered;
      if(row.origin==='neighbours'){row.playerTerms=true;delete row.changedWeek;delete row.review;}
      return said(owner,(chosen==='goods'?'I’ll put your name beside '+count(story.amount,story.good)+'. ':'I’ll put you down for the visit. ')+
        'Take that agreement back to '+name(site,row.requesterId)+' by the end of week '+row.dueWeek+'.',true);
    }
    if(row.workWeek==null)pay(site,world,row);
    finish(site,row,world.week);
    return {...said(owner,outcomeFor(row)+' I’ll remember who came back. We used '+costOf(row)+'.',true),
      neighbourHelp:{actorId:actor.id,targetId:owner.id,kind:row.kind,method:chosen}};
  }
  function costOf(row){
    const story=storyFor(row);
    return row.method==='goods'?count(story.amount,story.good):'one local work session';
  }
  function pay(site,world,row){
    const story=storyFor(row);
    if(row.method==='goods'){
      site[story.good]-=story.amount;
      if(story.good==='food')root.EarthProvisions?.reconcile?.(site,world.week);
    }else{
      if(row.kind==='supper'&&site.food<Math.ceil(site.population/5))row.unserved=true;
    }
  }
  function finish(site,row,week){
    const story=storyFor(row);
    row.status='kept';row.finishedWeek=week;appointments.delete(site);
    root.EarthAutonomy?.remember?.(site,week,row.actorId,row.requesterId,'kept');
    root.EarthAutonomy?.remember?.(site,week,row.actorId,row.contactId,'kept');
    const metric=row.unserved?'trust':story.metric;site[metric]=Math.min(100,site[metric]+1);
    const resident=site.residents.find(r=>r.id===row.requesterId);if(resident)resident.bond=Math.min(10,resident.bond+1);
    return name(site,row.actorId)+' met '+name(site,row.requesterId)+' for “'+story.title+'”. '+outcomeFor(row);
  }
  function deliveryWorker(site,resident){
    const p=resident.promise,h=p?.handover;
    if(!h)return p?.by||null;
    const worker=person(site,h.worker);
    return worker&&member(site,h.worker)&&visible(site,h.worker)&&(!h.key||h.key===worker.identityKey)?h.worker:p.by;
  }
  function relayTerms(site,world,receiver,talker,worker){
    const p=receiver.promise;
    if(!p?.by||p.by!==talker.id||receiver.id===worker.id||talker.id===worker.id||!member(site,worker.id)||!member(site,talker.id))return null;
    const balance=root.CommonEarthSim?.promiseBalance?.(receiver);
    const parcel=balance&&Object.entries(balance).find(([,n])=>n>0);
    if(!parcel)return null;
    const [good,amount]=parcel;
    const trust=root.EarthAutonomy?.bond?.(site,worker.id,talker.id,world.week)||0;
    const customerTrust=root.EarthAutonomy?.bond?.(site,worker.id,receiver.id,world.week)||0;
    const held=site.residents.some(r=>r!==receiver&&r.promise?.dueWeek===p.dueWeek&&deliveryWorker(site,r)===worker.id);
    const career=site.careers?.[worker.id];
    const conflict=held||records(site).some(r=>r.status==='agreed'&&r.dueWeek===p.dueWeek&&r.actorId===worker.id)||
      career?.application?.phase==='notice'&&career.application.dueWeek===p.dueWeek;
    const ref=receiver.slot+':'+p.start+':'+p.dueWeek;
    const fee=trust>=2||customerTrust>=2?0:Math.max(1,Math.ceil(amount/2));
    const gate=p.handover?'Another worker has taken this booking.':
      p.dueWeek<=world.week?'The delivery window is already open. I would need time to arrange my own round.':
      trust<0?'I want us to settle our last missed arrangement before I promise to carry anything.':
      customerTrust<=-3?'I need to speak with the recipient about our last handover first.':
      conflict?'I already promised my time to someone else that week.':
      career?.training?.pace==='intensive'&&!career.training.paused?'My intensive course takes the time I would need for the handover.':'';
    const payGate=fee&&!root.EarthPurses?.canTransfer?.(site,talker.id,worker.id,fee)?'The booking costs '+count(fee,'funds')+' from your own purse.':'';
    return {good,amount,fee,gate,payGate,ref,due:p.dueWeek,terms:'I can carry '+count(amount,good)+' to '+receiver.name+' in week '+p.dueWeek+
      (fee?' for a booking fee of '+count(fee,'funds')+'.':' as a favour.')+' You still need to leave the promised goods available.'};
  }
  function relayTopics(site,world,worker,talker){
    if(!worker||!talker||world?.activeId!==site.id)return [];
    const result=[];
    for(const receiver of site.residents){
      const p=receiver.promise,h=p?.handover;
      if(!p?.by||p.by!==talker.id)continue;
      const ref=receiver.slot+':'+p.start+':'+p.dueWeek;
      if(h?.worker===worker.id&&deliveryWorker(site,receiver)===worker.id&&world.week<p.dueWeek){
        result.push({id:'relay:release:'+ref,label:'Release the delivery booking for '+receiver.name+
          (h.fee?' · worker keeps the booking fee':'')});continue;
      }
      if(h&&receiver.id===worker.id&&!h.informed&&deliveryWorker(site,receiver)===h.worker){
        result.push({id:'relay:notify:'+ref,label:'Tell '+receiver.name+' who is making the delivery',context:true});continue;
      }
      const terms=relayTerms(site,world,receiver,talker,worker);if(!terms||h)continue;
      result.push({id:'relay:terms:'+ref,label:'Could you cover my delivery to '+receiver.name+'?',context:true});
      if(!terms.gate&&!terms.payGate)result.push({id:'relay:book:'+ref+':'+terms.fee,label:
        terms.fee?'Book the handover · '+terms.fee+' personal fund'+(terms.fee===1?'':'s'):'Agree the handover as a favour'});
    }
    return result;
  }
  function relay(site,world,worker,talker,topic,proof){
    if(world?.activeId!==site.id||root.EarthAgency.actorId(site)!==talker.id||proof?.mode!=='walk'||proof.siteId!==site.id||
      proof.actor!==talker.id||proof.target!==worker.id||![proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)||
      Math.hypot(proof.x-proof.tx,proof.y-proof.ty)>1.56||!relayTopics(site,world,worker,talker).some(o=>o.id===topic))return fail('Meet the people involved and check the current agreement.');
    const [,verb,slot]=topic.split(':'),receiver=site.residents.find(p=>p.slot===Number(slot)),p=receiver.promise;
    if(verb==='release'){
      delete p.handover;
      return said(worker,'I’ve released the time. You’re responsible for getting the supplies to '+receiver.name+' by week '+p.dueWeek+'.',true);
    }
    if(verb==='notify'){
      p.handover.informed=true;
      return said(worker,'I’ll look for '+name(site,p.handover.worker)+' at the handover in week '+p.dueWeek+'. I still have your name on the agreement.',true);
    }
    const terms=relayTerms(site,world,receiver,talker,worker);
    if(verb==='terms')return said(worker,terms.gate||terms.terms+(terms.payGate?' '+terms.payGate:''));
    if(terms.gate||terms.payGate)return fail(terms.gate||terms.payGate);
    if(terms.fee){
      const paid=root.EarthPurses.transferPerson(world,site,talker.id,worker.id,terms.fee,'Delivery booking for '+receiver.name+' in week '+terms.due);
      if(!paid.ok)return paid;
    }
    p.handover={worker:worker.id,key:worker.identityKey||null,week:world.week,fee:terms.fee,informed:false};
    return {...said(worker,'I’ve booked week '+terms.due+' to carry '+count(terms.amount,terms.good)+' to '+receiver.name+
      '. You can let them know to expect me.',true),followContact:receiver.id};
  }
  function promisedDelivery(site,person,week){
    const promise=person.promise,worker=deliveryWorker(site,person);
    if(!promise?.by||!worker||worker===person.id||promise.dueWeek!==week||
      !member(site,worker)||!member(site,person.id)||!visible(site,worker)||!visible(site,person.id))return null;
    const balance=root.CommonEarthSim?.promiseBalance?.(person);
    if(!balance)return null;
    const kind=['supper','bench','meeting'][person.slot],good=stories[kind]?.good,amount=balance[good];
    if(!Number.isSafeInteger(amount)||amount<1)return null;
    return {siteId:site.id,generation:site.foundingRevision||0,week,ordinary:true,
      rowId:'pledge:'+person.slot+':'+promise.start+':'+promise.dueWeek,actorId:worker,targetId:person.id,
      good,amount,kind,method:'goods',venue:venues[kind]};
  }
  function deliverable(site,week,quote){
    const {good,amount}=quote;
    let held=good==='food'?Math.ceil(site.population/5):0;
    for(const p of site.residents){
      if(p.id!==quote.targetId&&p.promise)held+=root.CommonEarthSim.promiseBalance(p)[good]||0;
    }
    for(const row of records(site)){
      if(row.status==='agreed'&&row.dueWeek>=week&&row.method==='goods'&&row.workWeek==null&&storyFor(row).good===good)held+=storyFor(row).amount;
    }
    return site[good]-amount>=held;
  }
  function ordinaryOffers(site,world,id,controlled){
    const result=[];
    for(const resident of site.residents){
      if(deliveryWorker(site,resident)!==id||resident.id===controlled)continue;
      const q=promisedDelivery(site,resident,world.week);
      if(q&&deliverable(site,world.week,q)){
        const title='Deliver '+count(q.amount,q.good)+' to '+resident.name;
        result.push({rowId:q.rowId,target:q.targetId,ordinary:true,score:132,venue:q.venue,title,activity:title,goal:'Keep my promise to '+resident.name,
          reason:'I promised '+resident.name+' these supplies for week '+world.week+'. I can carry them over in person.'});
      }
    }
    return result;
  }
  function assignments(site,world,id){
    if(!records(site).length&&!site.residents.some(p=>p.promise?.dueWeek===world.week&&deliveryWorker(site,p)===id))return empty;
    if(!visible(site,id)||!member(site,id))return empty;
    const controlled=world.activeId===site.id?root.EarthAgency?.actorId(site):null;
    if(controlled===id)return empty;
    const offers=ordinaryOffers(site,world,id,controlled);
    const row=records(site).find(r=>r.actorId===id&&r.status==='agreed'&&r.workWeek==null&&r.agreedWeek<world.week&&r.dueWeek>=world.week);
    if(!row||row.requesterId===controlled||!visible(site,row.requesterId)||!member(site,row.requesterId))return offers;
    const p=priority(site,world,row);
    if(row.method==='goods'&&!p.goodsAvailable)return offers;
    const story=storyFor(row),title=story[row.method==='goods'?'useGoods':'useTime'];
    const partner=name(site,row.requesterId);
    offers.push({rowId:row.id,target:row.requesterId,score:world.week===row.dueWeek?126:105,venue:venues[row.kind],
      title,activity:title,goal:story.title,reason:'I gave '+partner+' my word. We can meet at the '+venues[row.kind]+' for “'+story.title+'”.'});
    return offers;
  }
  const assignment=(site,world,id)=>assignments(site,world,id)[0]||null;
  function work(site,world,id,rowId){
    const a=assignments(site,world,id).find(choice=>choice.rowId===rowId);if(!a)return null;
    if(a.ordinary)return {item:{week:world.week,kind:'commitment',errand:true,ordinary:true,rowId,venue:a.venue,target:a.target,
      goal:a.goal,title:a.title,activity:a.activity,reason:a.reason},note:name(site,id)+' set out to '+a.title[0].toLowerCase()+a.title.slice(1)+'.'};
    const row=records(site).find(r=>r.id===rowId);
    pay(site,world,row);row.workWeek=world.week;
    if(row.method==='time')row.localSession=true;
    appointments.delete(site);
    return {item:{week:world.week,kind:'commitment',errand:true,rowId,venue:a.venue,target:a.target,goal:a.goal,title:a.title,activity:a.activity,reason:a.reason},
      note:name(site,id)+' set out for the '+a.venue+' to keep an agreement with '+name(site,row.requesterId)+'.'};
  }
  function workingArrangements(site,week){
    const book=site?.agency?.arrangements;if(!book)return empty;
    const cached=appointments.get(site);if(cached?.book===book&&cached.week===week)return cached.rows;
    const rows=Object.freeze(book.rows.filter(r=>r.status==='agreed'&&r.workWeek===week).map(r=>Object.freeze({
      siteId:site.id,generation:site.foundingRevision||0,week,rowId:r.id,actorId:r.actorId,targetId:r.requesterId,
      kind:r.kind,method:r.method,venue:venues[r.kind]
    })));
    appointments.set(site,{book,week,rows});return rows;
  }
  function working(site,week){
    const rich=workingArrangements(site,week);
    const deliveries=[];
    for(const person of site?.residents||[]){
      if(!person.promise?.by||person.promise.dueWeek!==week)continue;
      const q=promisedDelivery(site,person,week);
      if(q&&pairedDuty(site,q,week))deliveries.push(Object.freeze(q));
    }
    return deliveries.length?Object.freeze([...rich,...deliveries]):rich;
  }
  function pairedDuty(site,row,week){
    const place=venues[row.kind];
    const target=row.targetId||row.requesterId;
    return [[row.actorId,target],[target,row.actorId]].every(([id,other])=>{
      const duty=site.autonomy?.people?.[id]?.history?.[0];
      return duty?.week===week&&duty.errand===true&&duty.venue===place&&duty.target===other&&
        (row.ordinary?duty.ordinary===true&&duty.rowId===row.rowId:!duty.ordinary);
    });
  }
  function deliver(site,world,quote,settle){
    const controlled=world.activeId===site.id?root.EarthAgency?.actorId(site):null;
    if(controlled===quote.actorId||controlled===quote.targetId)return null;
    const resident=site.residents.find(p=>p.id===quote.targetId),current=resident&&promisedDelivery(site,resident,world.week);
    if(!current||current.rowId!==quote.rowId||current.actorId!==quote.actorId||current.good!==quote.good||
      current.amount!==quote.amount||current.kind!==quote.kind||current.method!==quote.method||current.venue!==quote.venue||
      !pairedDuty(site,current,world.week)||!deliverable(site,world.week,current)||typeof settle!=='function')return null;
    site[current.good]-=current.amount;
    if(current.good==='food')root.EarthProvisions?.reconcile?.(site,world.week);
    return settle(resident,name(site,current.actorId)+' personally delivered '+count(current.amount,current.good)+'.',world,current.actorId);
  }
  function closeDeliveries(site,world,settle){
    const notes=[];
    for(const q of working(site,world.week))if(q.ordinary){
      const note=deliver(site,world,q,settle);if(note)notes.push(note);
    }
    return notes;
  }
  function finishAt(site,world,quote,proof,settle){
    if(!site||world.activeId!==site.id||quote?.siteId!==site.id||quote.generation!==(site.foundingRevision||0)||quote.week!==world.week)
      return fail('That appointment belongs to a different place or week.');
    const row=quote.ordinary===true?quote:records(site).find(r=>r.id===quote.rowId&&r.actorId===quote.actorId&&r.requesterId===quote.targetId&&
      r.kind===quote.kind&&r.method===quote.method&&r.status==='agreed'&&r.workWeek===world.week);
    const target=row?.targetId||row?.requesterId;
    if(!row||!visible(site,row.actorId)||!visible(site,target)||row.actorId===(root.EarthAgency?.actorId(site)||'steward')||target===(root.EarthAgency?.actorId(site)||'steward'))return fail('The named appointment has already changed.');
    const place=venues[row.kind];
    if(quote.venue!==place||!pairedDuty(site,row,world.week)||
      proof?.siteId!==site.id||proof.actorId!==row.actorId||proof.targetId!==target||
      proof.visible!==true||proof.mode!=='walk'||proof.venue!==place||
      ![proof.x,proof.y,proof.tx,proof.ty].every(Number.isFinite)||Math.hypot(proof.x-proof.tx,proof.y-proof.ty)>1.56)
      return fail('The two neighbours must meet on foot at the arranged venue.');
    if(quote.ordinary){
      const message=deliver(site,world,quote,settle);
      return message?{ok:true,changed:true,message}:fail('The promised parcel or the household reserve has changed.');
    }
    return {ok:true,changed:true,message:finish(site,row,world.week)};
  }
  function closeWeek(site,world){
    const events=[];
    for(const row of records(site)){
      if(!openStatus.has(row.status))continue;
      const requesterAway=!visible(site,row.requesterId)||!member(site,row.requesterId);
      if(row.status==='agreed'&&row.workWeek!=null&&row.workWeek<world.week&&!requesterAway){
        // The same paid visit completes at the close of its scheduled week when
        // nobody watched it live. The receipt can only be made once.
        events.push(finish(site,row,row.workWeek));continue;
      }
      if(world.week<=row.dueWeek&&!(requesterAway&&row.workWeek!=null&&row.workWeek<world.week))continue;
      if(row.status==='agreed'&&requesterAway){
        if(row.workWeek!=null&&row.method==='goods'){
          const story=storyFor(row);site[story.good]=Math.min(Number.MAX_SAFE_INTEGER,site[story.good]+story.amount);
        }
        row.status='withdrawn';row.finishedWeek=world.week;row.releaseCause='requesterAway';appointments.delete(site);
        events.push(name(site,row.actorId)+' was released from “'+storyFor(row).title+'” because '+name(site,row.requesterId)+' was away for the handover.');
        continue;
      }
      const missed=row.status==='agreed';
      row.status=missed?'missed':'withdrawn';row.finishedWeek=world.week;
      if(!missed)continue;
      root.EarthAutonomy?.remember?.(site,world.week,row.actorId,row.requesterId,'missed');
      root.EarthAutonomy?.remember?.(site,world.week,row.actorId,row.contactId,'missed');
      const metric=site.trust;site.trust=Math.max(0,metric-1);
      const resident=site.residents.find(p=>p.id===row.requesterId);if(resident)resident.bond=Math.max(0,resident.bond-1);
      events.push(name(site,row.requesterId)+' waited for '+name(site,row.actorId)+' to return for “'+storyFor(row).title+'”. The help did not arrive.'+(site.trust<metric?' Community trust fell by one.':''));
    }
    const next=neighbourDecisions(site,world);if(next)events.push(next);
    return events;
  }
  function valid(site,week){
    for(const person of site.residents){
      const pledge=person.promise,h=pledge?.handover;
      if(h!==undefined&&(!h||!pledge.by||!(root.EarthAgency.canPlay(site,h.worker)||root.EarthPersonas?.isPorterId?.(h.worker))||h.worker===pledge.by||h.worker===person.id||
        !bounded(h.week,week)||h.week<pledge.start||h.week>=pledge.dueWeek||!Number.isInteger(h.fee)||h.fee<0||h.fee>4||
        typeof h.informed!=='boolean'||h.key!==null&&(typeof h.key!=='string'||!h.key.length||h.key.length>1040)))return false;
      if(!person.promise?.by||person.promise.dueWeek!==week)continue;
      const q=promisedDelivery(site,person,week);
      if(!q)continue;
      const matching=[q.actorId,q.targetId].some(id=>{const d=site.autonomy?.people?.[id]?.history?.[0];return d?.week===week&&d.ordinary&&d.rowId===q.rowId;});
      if(matching&&!pairedDuty(site,q,week))return false;
    }
    const b=site.agency?.arrangements;if(b===undefined)return true;
    if(!b||!bounded(b.serial)||!Array.isArray(b.rows)||!b.rows.length||b.rows.length>limit||b.rows[0]?.id!==b.serial)return false;
    const weeks=new Set(),owners=new Set(),actors=new Set();
    const named=id=>typeof id==='string'&&Boolean(root.EarthPersonas?.profile(site,id)||root.EarthAgency?.identity(site,id));
    return b.rows.every((r,i)=>{
      if(!r||!bounded(r.id,b.serial)||i>0&&r.id>=b.rows[i-1].id||!Object.hasOwn(stories,r.kind)||r.variant!==undefined&&r.variant!=='followup'||!bounded(r.week,week)||r.dueWeek!==firstDue(r)+(r.dateDecision==='agreed'?1:0)||
        ![r.actorId,r.requesterId,r.contactId].every(named)||new Set([r.actorId,r.requesterId,r.contactId]).size!==3||
        !['asked','agreed','kept','missed','withdrawn'].includes(r.status))return false;
      if(r.origin!==undefined||r.cause!==undefined||r.detail!==undefined||r.reply!==undefined){
        if(r.origin!=='neighbours'||!Object.hasOwn(causes,r.cause)||causes[r.cause]!==r.kind||
          [r.actorId,r.requesterId,r.contactId].includes('steward')||typeof r.detail!=='string'||!r.detail.length||r.detail.length>256||
          r.reply!==undefined&&(r.status!=='withdrawn'||!['trust','duty','rest'].includes(r.reply)))return false;
      }
      if(r.volunteered!==undefined&&(r.volunteered!==true||r.origin!=='neighbours'||!r.agreedWeek||r.method!=='time'))return false;
      if(r.review!==undefined&&(!r.review||r.origin!=='neighbours'||!r.agreedWeek||!Number.isSafeInteger(r.review.stock)||r.review.stock<0||
        !Number.isSafeInteger(r.review.floor)||r.review.floor<0||!['authority','trust','reserve','volunteer','release'].includes(r.review.why)))return false;
      if(r.changedWeek!==undefined&&(r.origin!=='neighbours'||r.method!=='time'||!bounded(r.changedWeek,Math.min(week,r.dueWeek))||r.changedWeek<=r.agreedWeek))return false;
      if(r.playerTerms!==undefined&&(r.playerTerms!==true||r.origin!=='neighbours'||!r.agreedWeek))return false;
      if(r.unserved!==undefined&&(r.unserved!==true||r.kind!=='supper'||r.method!=='time'||r.status!=='kept'&&r.workWeek==null))return false;
      if(r.releaseCause!==undefined&&(r.status!=='withdrawn'||r.releaseCause!=='requesterAway'||r.workWeek==null&&r.finishedWeek<=r.dueWeek))return false;
      const committed=['agreed','kept','missed'].includes(r.status)||r.releaseCause==='requesterAway',closed=!openStatus.has(r.status);
      if(committed?(!['goods','time'].includes(r.method)||!bounded(r.agreedWeek,Math.min(r.dueWeek,week))||r.agreedWeek<r.week):
        (r.method!==undefined||r.agreedWeek!==undefined))return false;
      if(r.dateDecision!==undefined||r.dateAskedWeek!==undefined){
        if(!committed||!['agreed','declined'].includes(r.dateDecision)||!bounded(r.dateAskedWeek,Math.min(week,firstDue(r)))||r.dateAskedWeek<firstDue(r)-1)return false;
      }
      if(r.workWeek!==undefined&&(!committed||!bounded(r.workWeek,Math.min(week,r.dueWeek))||
        r.workWeek<=r.agreedWeek||!['agreed','kept','withdrawn'].includes(r.status)))return false;
      if(r.localSession!==undefined&&(r.localSession!==true||r.method!=='time'||r.workWeek==null))return false;
      if(r.status==='agreed'&&r.workWeek!==undefined&&(r.workWeek!==week||!pairedDuty(site,r,week)))return false;
      if(closed?(!bounded(r.finishedWeek,week)||r.finishedWeek<(r.agreedWeek||r.week)):r.finishedWeek!==undefined)return false;
      if(r.status==='kept'&&r.finishedWeek>r.dueWeek||r.status==='missed'&&r.finishedWeek<=r.dueWeek)return false;
      const byActor=r.week+'/'+r.actorId,byOwner=r.week+'/'+r.requesterId;
      if(weeks.has('a'+byActor)||weeks.has('r'+byOwner))return false;
      weeks.add('a'+byActor);weeks.add('r'+byOwner);
      if(!active(r,week))return true;
      if(owners.has(r.requesterId)||actors.has(r.actorId))return false;
      owners.add(r.requesterId);actors.add(r.actorId);return true;
    });
  }
  root.EarthNeighbourErrands=Object.freeze({heldGoods,topics,deliveryWorker,relayTopics,relay,converse,arrangements:rowsFor,greeting,reliability,witness,account,assignment,assignments,work,working,finishAt,closeDeliveries,closeWeek,valid});
})(typeof window==='undefined'?globalThis:window);
