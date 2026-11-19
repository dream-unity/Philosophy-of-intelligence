/* Project the commitments people have actually made. A project someone hopes to
   finish, an agreed handover and a completed delivery have different meanings. */
(function(root){
  'use strict';
  const nameOf=(site,id)=>root.EarthPersonas?.profile(site,id)?.name||site.residents.find(person=>person.id===id)?.name||
    site.communityLife?.people?.[id]?.profile?.name||'a neighbour';
  const currentActor=site=>root.EarthAgency?.actorId(site)||site.agency?.actor||'steward';
  const boardOpen=new WeakMap();
  const orders=(site,world,id)=>root.EarthDialogue?.arrangements?.(site,world,id)||[];
  function signings(site,world,id){
    const entries=[];
    for(const person of site.residents){
      const p=person.promise;
      if(p?.by===id)entries.push({title:'Promise to '+person.name,who:person.id,due:p.dueWeek,detail:person.value});
    }
    for(const a of orders(site,world,id))if(a.status==='agreed'&&a.actorId===id){
      entries.push({title:a.title,who:a.requesterId,due:a.dueWeek,detail:a.next||a.reason});
    }
    return entries.sort((a,b)=>a.due-b.due||a.title.localeCompare(b.title));
  }
  function anchor(world,site){
    if(!world?.sites?.length||!site)return null;
    const original=root.EarthCommunityLife?.anchor?.(world);
    const home=world.sites.find(s=>s.id===(original?.homeId||world.sites[0].id));
    const origin=world.sites.find(s=>s.id===(original?.originId||world.sites[0].id));
    const id=original?.id||'steward';
    const name=original?.name||(origin&&nameOf(origin,id))||'Community steward';
    const held=world.sites.flatMap(s=>signings(s,world,id).map(r=>({...r,siteId:s.id,siteName:s.name})))
      .sort((a,b)=>a.due-b.due||a.title.localeCompare(b.title));
    const nearest=held[0];
    const atHome=home?.id===site.id;
    const yours=currentActor(site)===id;
    const dutyPlace=original?.dutyPlace||home?.name,dutySiteId=original?.dutySiteId||home?.id;
    const dueAt=dutyPlace?' in '+dutyPlace:'';
    const duty=original?.attended?'Pantry counted'+dueAt+' for week '+original.due:
      original?.coveredBy?'Pantry round'+dueAt+' covered by '+(original.coverName||home&&nameOf(home,original.coveredBy)||'a neighbour')+' for week '+original.due:
      original?.due&&original.due>=world.week?'Pantry round'+dueAt+' · due week '+original.due:'';
    const status=nearest?nearest.title+' · due week '+nearest.due+' in '+nearest.siteName:
      duty?duty:
      home?'Home in '+home.name:'Between communities';
    return {id,name,homeId:home?.id,homeName:home?.name,originId:origin?.id,atHome,yours,status,nearest,held,
      duty,dutySiteId,dutyPlace,dutyWeek:original?.due,roundCovered:!!(original?.attended||original?.coveredBy)};
  }
  function ties(site,world,people){
    const known=new Set(people.map(p=>p.id)),links=[],seen=new Set();
    function link(from,to,label,detail,priority=5){
      if(!known.has(from)||!known.has(to)||from===to)return;
      const key=[from,to,label].join('/');
      if(seen.has(key))return;
      seen.add(key);links.push({from,to,label,detail,priority});
    }
    for(const person of site.residents){
      if(person.promise?.by)link(person.promise.by,person.id,'promised supplies','Due week '+person.promise.dueWeek+'. '+person.value,0);
      for(const record of (person.agreements||[]).slice(0,2)){
        if(record.week<world.week-4)continue;
        link(record.by,person.id,record.status==='kept'?'kept a promise':'missed a promise','Week '+record.week,4);
        if(record.deliveredBy&&record.deliveredBy!==record.by)link(record.deliveredBy,record.by,'helped keep a promise','Delivered supplies to '+person.name+' in week '+record.week+'.',4);
      }
    }
    for(const person of people){
      const c=site.careers?.[person.id],old=c?.departure,app=c?.application;
      if(app?.phase==='notice'&&app.coverId)link(app.coverId,person.id,'agreed to cover a handover','The former team can release '+person.name+' after notice.',1);
      if(old?.coverId&&old.throughWeek>=world.week)link(old.coverId,person.id,'is covering a former post',old.oldEmployer+' needs cover through week '+old.throughWeek+'.',1);
      const appt=site.purses?.tickets?.[person.id];
      if(appt?.clerkId)link(appt.clerkId,person.id,'is verifying a stock check','The worker needs the count before the exchange releases their wage.',2);
      const sponsorship=root.EarthDreams?.supportLink?.(site,person.id);
      if(sponsorship?.from&&sponsorship.week>=world.week-8)
        link(sponsorship.from,person.id,'helped fund a personal goal',sponsorship.detail,2);
      for(const receipt of site.purses?.people?.[person.id]?.entries||[]){
        const pair=receipt.pair;
        if(!pair?.product||pair.from!==person.id||receipt.action!=='purchase'||receipt.week<world.week-4)continue;
        if(!pair.fromIdentity||pair.fromIdentity!==person.identityKey||!pair.toIdentity||
          pair.toIdentity!==root.EarthPersonas?.profile(site,pair.to)?.identityKey)continue;
        link(pair.from,pair.to,pair.product==='courtyardHome'?'bought a home from':'bought from a neighbour','Week '+receipt.week+' · '+receipt.text,3);
      }
      const shift=site.autonomy?.people?.[person.id]?.history?.[0];
      if(shift?.week===world.week&&shift.target){
        if(shift.placementSide==='mentor')link(person.id,shift.target,'supervises a placement',shift.reason,1);
        if(shift.householdSession&&shift.kind==='visit')link(person.id,shift.target,'is introducing a new resident',shift.reason,1);
      }
      for(const a of orders(site,world,person.id)){
        if(a.actorId!==person.id)continue;
        if(a.status==='agreed')link(person.id,a.requesterId,'accepted an errand',a.title+' · due week '+a.dueWeek,0);
        else if(a.status==='asked')link(a.contactId,person.id,'has the missing information',a.title,2);
        else if(a.finishedWeek>=world.week-2&&['kept','missed'].includes(a.status))
          link(person.id,a.requesterId,a.status==='kept'?'fulfilled an agreement':'missed an agreement',a.title+' · '+a.outcome,4);
      }
      const p=site.autonomy?.projects?.owners?.[person.id];
      if(p&&!p.finished){
        if(p.volunteer?.from)link(p.volunteer.from,person.id,'offered a work session','Agreed in week '+p.volunteer.week+'.',2);
        if(p.partnerId)link(p.partnerId,person.id,'shares the project',person.name+' is organising the work.',3);
        if(p.beneficiaryId)link(person.id,p.beneficiaryId,'is working for a neighbour','The project has reached '+p.progress+' sessions.',3);
      }
      const meal=site.autonomy?.people?.[person.id]?.received;
      if(meal?.kind==='food'&&meal.week>=world.week-2)link(meal.ownerId,person.id,'brought food to a neighbour','Week '+meal.week,4);
    }
    for(const m of site.agency?.meals||[])if(m.week===world.week)link(m.from,m.to,'shared a meal','One portion of the town pantry supported this visit.',4);
    for(const [jobId,listing] of Object.entries(site.employers||{})){
      const job=root.EarthCareers?.catalog.find(p=>p.id===jobId);
      if(!job)continue;
      for(const vacancy of listing.open){
        if(vacancy.lastCover?.week===world.week)link(vacancy.lastCover.id,vacancy.formerId,'covered a vacant post',
          job.employer+' kept its '+job.label.toLowerCase()+' service running this week.',1);
      }
      const hire=listing.lastHire;
      if(hire&&hire.week>=world.week-3)link(hire.by,hire.formerId,'took over a former post',
        job.employer+' filled the vacancy in week '+hire.week+', after '+(hire.week-hire.opened)+' open weeks.',3);
    }
    return links.sort((a,b)=>a.priority-b.priority);
  }
  function perspectives(site,world,people,a,b){
    const first=people.find(p=>p.id===a),second=people.find(p=>p.id===b);
    if(!first||!second||a===b)return null;
    const links=ties(site,world,people).filter(edge=>edge.from===a&&edge.to===b||edge.from===b&&edge.to===a);
    const side=(person,peer)=>{
      const plan=root.EarthAutonomy?.view(site,world,person.id);
      const memory=root.EarthAutonomy?.contacts(site,person.id,world.week)?.find(m=>m.here&&m.id===peer.id);
      return {name:person.name,role:root.EarthCareers?.role?.(site,person.id)||person.role,plan:plan?.goal,
        reason:plan?.reason,dream:plan?.dream?.title,memory,depends:exchange(site,world,person.id).town};
    };
    return {first:side(first,second),second:side(second,first),links};
  }
  function maker(box){
    return function(tag,text,className){
      const el=box.ownerDocument.createElement(tag);
      if(text!=null)el.textContent=text;
      if(className)el.className=className;
      return el;
    };
  }
  function choose(make,label,id,select){
    const button=make('button',label,'ties-person');
    button.type='button';
    button.addEventListener('click',()=>select(id));
    return button;
  }
  function appendTown(box,{site,world,people,select,activity,openTool}){
    const make=maker(box),source=anchor(world,site);
    if(source){
      const block=make('div',null,'ties-anchor');
      block.append(make('small','Your original character'),make('strong',source.name),make('span',source.status));
      if(!source.yours&&source.atHome&&people.some(p=>p.id===source.id)){
        block.append(choose(make,'See '+source.name+'’s week',source.id,select));
      }
      if(source.nearest?.siteId===site.id&&people.some(p=>p.id===source.nearest.who)){
        block.append(choose(make,'See the person waiting',source.nearest.who,select));
      }
      if(openTool&&source.duty){
        if(source.nearest)block.append(make('span',source.duty));
        block.append(choose(make,source.dutySiteId===site.id?'Review my pantry round':'Find the route to '+(source.dutyPlace||'my pantry round'),'neighbours',openTool));
      }
      box.append(block);
    }
    const board=make('details',null,'ties-board'),list=make('ul');
    const summary=make('summary','People and their goals · '+people.length);
    board.append(summary);
    const census=root.EarthCommunityLife?.census?.(world,site);
    if(census?.summary)board.append(make('p',census.summary,'scene-muted'));
    board.append(list);box.append(board);
    board.open=boardOpen.get(site)===true;
    const live=new Map();
    let timer=null,built=false;
    function repaint(){
      root.clearTimeout?.(timer);
      if(!board.open||!board.isConnected||board.ownerDocument.hidden||board.closest?.('[hidden]'))return;
      for(const [id,{line,fallback}] of live){
        const action=activity?.(id);
        const latest=action?.label?[action.label,action.venue].filter(Boolean).join(' · '):fallback;
        if(line.textContent!==latest)line.textContent=latest;
      }
      if(typeof root.setTimeout==='function')timer=root.setTimeout(repaint,1100);
    }
    function fill(){
      if(!built){
        const relationships=ties(site,world,people);
        for(const p of people){
          const plan=root.EarthAutonomy?.view(site,world,p.id);
          const role=root.EarthCareers?.role?.(site,p.id)||p.originRole||p.role;
          const row=make('li'),liveLine=make('span','', 'ties-now');
          row.append(choose(make,p.name,p.id,select),make('small',role),liveLine);
          const fallback=plan?.activity||plan?.label||role;
          liveLine.textContent=fallback;live.set(p.id,{line:liveLine,fallback});
          if(plan?.dream)row.append(make('span','Personal goal · '+plan.dream.title));
          const connected=relationships.find(x=>x.from===p.id||x.to===p.id);
          if(connected){
            row.append(make('span',nameOf(site,connected.from)+' '+connected.label+' · '+nameOf(site,connected.to)));
          }else if(plan?.ownProject||plan?.project){
            const project=plan.ownProject||plan.project;
            row.append(make('span','Local project · '+project.title));
          }
          list.append(row);
        }
        built=true;
      }
      repaint();
    }
    board.addEventListener('toggle',()=>{
      if(!board.isConnected)return;
      boardOpen.set(site,board.open);
      if(board.open)fill();else root.clearTimeout?.(timer);
    });
    if(board.open)fill();
  }
  function exchange(site,world,id){
    const plan=root.EarthAutonomy?.view(site,world,id);
    const agreements=signings(site,world,id),career=site.careers?.[id];
    const project=plan?.ownProject||plan?.project,dream=plan?.dream;
    const purse=site.purses?.people?.[id],wage=purse?.entries?.find(r=>r.action==='wage');
    const gift=purse?.entries?.find(r=>['buy','household','donate'].includes(r.action));
    let town=null,person=null;
    if(plan?.received?.week===world.week)town='A basket from '+nameOf(site,plan.received.ownerId)+' restored two energy this week.';
    else if(dream?.blockers?.length)town='For “'+dream.title+'” · '+dream.blockers[0];
    else if(site.purses?.tickets?.[id])town='The exchange reserved a wage for this person’s stock check.';
    else if(wage)town='Week '+wage.week+' · '+wage.text;
    else if(project?.materialCost&&!project.finishedWeek)town='For “'+project.title+'” · '+(project.progress?'Materials for this project have been committed.':project.next);
    else if(dream)town='For “'+dream.title+'” · '+dream.activity+'. '+dream.progressText+'.';
    if(agreements[0])person=agreements[0].title+' is due in week '+agreements[0].due+'.';
    else if(plan?.contribution?.week===world.week)person=plan.contribution.activity;
    else if(gift)person='Week '+gift.week+' · '+gift.text;
    else if(project?.finishedWeek&&project.kind!=='hobby')person='Week '+project.finishedWeek+' · '+project.effect;
    else if(career?.departure&&career.departure.throughWeek>=world.week)person=career.departure.oldEmployer+' is adjusting to this change of staff until week '+career.departure.throughWeek+'.';
    else if(project?.effect&&project.kind!=='hobby')person='If “'+project.title+'” is completed · '+project.effect;
    else if(dream?.earned)person=dream.earned+'. '+dream.community;
    else if(dream?.community)person='If “'+dream.title+'” is completed · '+dream.community;
    return {town,person};
  }
  function appendPerson(box,{site,world,people,id,select}){
    const make=maker(box),name=nameOf(site,id),section=make('section',null,'ties-network');
    const profile=root.EarthPersonas?.profile(site,id);
    if(profile?.description){
      const biography=make('details',null,'ties-profile');
      biography.append(make('summary','About '+name),make('p',profile.description));
      const axes=[...new Set([...(profile.strengths||[]),profile.hobbyAxis].filter(Boolean))];
      if(axes.length){
        const list=make('ul');
        for(const axis of axes){
          const current=site.careers?.[id]?.skills?.[axis]??profile.aptitudes?.[axis],cap=profile.bounds?.[axis]?.max;
          if(Number.isFinite(current)&&Number.isFinite(cap))list.append(make('li',axis.charAt(0).toUpperCase()+axis.slice(1)+' · '+current+'/100 now, with room to reach '+cap+'/100.'));
        }
        if(list.childNodes.length)biography.append(list);
      }
      box.append(biography);
    }
    const impact=exchange(site,world,id);
    if(impact.town||impact.person){
      const flows=make('dl',null,'ties-directions');
      if(impact.town)flows.append(make('dt','What '+name+' depends on'),make('dd',impact.town));
      if(impact.person)flows.append(make('dt','How '+name+' affects the community'),make('dd',impact.person));
      box.append(flows);
    }
    const rows=ties(site,world,people).filter(r=>r.from===id||r.to===id);
    if(rows.length)section.append(make('h4','Who is connected to '+name+'’s plans?'));
    for(const row of rows.slice(0,5)){
      const peer=row.from===id?row.to:row.from;
      const item=make('div',null,'ties-row');
      item.append(choose(make,nameOf(site,peer),peer,select),
        make('p',nameOf(site,row.from)+' '+row.label+' · '+nameOf(site,row.to)+'. '+row.detail));
      section.append(item);
    }
    if(rows.length)box.append(section);
    const memories=root.EarthAutonomy?.contacts?.(site,id,world.week)||[];
    if(memories.length){
      const archive=make('details',null,'ties-memory'),entries=make('ul');
      archive.append(make('summary','People '+name+' remembers · '+memories.length),entries);
      for(const tie of memories){
        const item=make('li');
        if(tie.here)item.append(choose(make,tie.name,tie.id,select));
        else item.append(make('strong',tie.name+' · away'));
        item.append(make('p','Week '+tie.week+' · '+tie.reason+'. '+(tie.strength<0?'Their last dealings left trust strained.':'They can draw on this relationship again.')));
        entries.append(item);
      }
      box.append(archive);
    }
  }
  root.EarthInterdependence=Object.freeze({anchor,signings,ties,exchange,perspectives,appendTown,appendPerson});
})(typeof window==='undefined'?globalThis:window);
