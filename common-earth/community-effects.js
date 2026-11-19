/* The street history follows recorded outcomes. Older unlabelled inputs remain
   anonymous, and changing a goal never invents a completed result. */
(function(root){
  'use strict';
  function view(world,site,focus=null){
    if(!world||!site)return [];
    const entries=[],names=new Map();
    function person(id){
      if(!names.has(id))names.set(id,root.EarthPersonas?.profile(site,id)?.name||site.residents.find(r=>r.id===id)?.name||null);
      return names.get(id);
    }
    function add(week,title,result,ids){
      if(!Number.isInteger(week)||week>world.week||!result)return;
      const people=[...new Set(ids.filter(Boolean))].map(id=>({id,name:person(id)})).filter(p=>p.name);
      if(focus&&!people.some(p=>p.id===focus))return;
      entries.push({week,title,result,people});
    }
    const donations=new Map();
    for(const [id,account] of Object.entries(site.purses?.people||{})){
      for(const receipt of account.entries){
        if(receipt.action==='donate'){
          const group=donations.get(receipt.week)||new Map();
          group.set(id,(group.get(id)||0)+1);donations.set(receipt.week,group);
        }else if(receipt.action==='buy'||receipt.action==='household'){
          const result=receipt.text.replace(/ (?:Purse now|Household fund now) \d+\.$/,'');
          add(receipt.week,receipt.action==='household'?'Household funds bought pantry food':'A resident supplied the town',result,[id]);
        }
      }
    }
    for(const [week,group] of donations){
      const gifts=Array.from(group,([id,n])=>person(id)+' gave '+n+' personal '+(n===1?'fund':'funds'));
      add(week,'Neighbours pooled money for food',gifts.join('. ')+'. Those contributions went to the household food fund.',[...group.keys()]);
    }
    const fresh=site.provisions?.receipt;
    const units=fresh?.by&&root.EarthProvisions?.traced?.(site,world.week);
    if(units){
      const source=fresh.source==='catch'?'catch':'harvest';
      add(fresh.week,'Fresh food in the pantry',units+' food in the shared pantry came from '+person(fresh.by)+'’s '+source+'.',[fresh.by]);
    }
    for(const crate of site.provisions?.crates||[]){
      if(!crate.sourceBy||crate.sourceBy===crate.by)continue;
      const source=crate.source==='catch'?'caught':'harvested';
      add(crate.week,'Two people stocked a provision crate',person(crate.sourceBy)+' '+source+' '+crate.sourceUnits+
        ' food. '+person(crate.by)+' packed it in crate '+crate.id+', which now holds '+crate.remaining+' food.',[crate.sourceBy,crate.by]);
    }
    for(const e of root.EarthLocalProjects?.completions(site)||[]){
      add(e.week,e.title,e.result,[e.ownerId,e.partnerId,e.input?.ownerId,e.beneficiaryId]);
    }
    for(const p of root.EarthCivicInitiatives?.view(world,site)?.history||[]){
      const approved=['built','commissioned','adopted'].includes(p.phase);
      const sources=p.evidence?' The committee used '+p.evidence.ownerName+'’s project “'+p.evidence.title+'”.':'';
      const text=p.status+(approved?' The town committed '+p.goods.funds+' funds and '+p.goods.materials+' materials.':'')+sources;
      add(p.closedWeek,p.title,text,[p.leadId,p.beneficiaryId,p.evidence?.ownerId,...p.contributions.map(c=>c.personId)]);
    }
    const relief=site.provisions?.lastRelief;
    if(relief){
      add(relief.week,'Food reached households',relief.amount+' reserved food covered '+relief.amount+' of '+relief.shortfall+
        ' missing portions. The crates were packed by '+relief.contributors.map(person).filter(Boolean).join(' and ')+'.',relief.contributors);
    }
    for(const note of site.fleet?.records||[])add(note.week,'Co-op dispatch',note.text,[note.actor,note.otherId]);
    for(const [id,life] of Object.entries(site.careers||{})){
      const old=life.departure,reference=life.latestReference;
      if(!old||!reference)continue;
      const leaving=person(id),cover=old.coverId&&person(old.coverId);
      const text=leaving+' left the '+old.oldRole.toLowerCase()+' post at '+old.oldEmployer+'. '+
        (cover?cover+' agreed to cover that team through week '+old.throughWeek+'.':'The former team needed temporary cover through week '+old.throughWeek+'.');
      add(reference.week,'A workplace changed hands',text,[id,old.coverId]);
    }
    for(const [jobId,listing] of Object.entries(site.employers||{})){
      const hire=listing.lastHire,post=root.EarthCareers?.catalog?.find(j=>j.id===jobId);
      if(hire&&post)add(hire.week,post.employer+' filled its vacancy',
        hire.name+' took over '+hire.formerName+'’s post after '+(hire.week-hire.opened)+' open weeks. '+hire.covered+' relief rounds were staffed and '+hire.missed+' were missed.',
        [hire.by,hire.formerId]);
    }
    for(const row of root.EarthDialogue?.arrangements?.(site,world)||[]){
      if(row.status==='kept'||row.status==='missed')add(row.finishedWeek,row.title,row.outcome,[row.actorId,row.requesterId,row.contactId]);
    }
    for(const p of site.residents){
      for(const record of p.agreements||[]){
        const who=person(record.by)||'The signer',by=record.deliveredBy&&person(record.deliveredBy);
        const result=record.status==='missed'?who+' missed the date agreed with '+p.name+'. ' +p.name+' will ask for a new conversation before trusting another promise.':
          by?by+' brought the agreed supplies to '+p.name+(record.deliveredBy!==record.by?' on behalf of '+who:'')+'.':
          p.name+' accepted the outcome agreed with '+who+'.';
        add(record.week,record.status==='missed'?'A promised delivery was missed':'An agreement was kept',result,[p.id,record.by,record.deliveredBy]);
      }
      if(p.lastMissed&&!p.agreements?.some(r=>r.status==='missed'&&r.week===p.lastMissed.week))add(p.lastMissed.week,'A promised delivery was missed',p.name+' was waiting for '+p.value.toLowerCase()+
        '. The '+(p.lastMissed.revised?'revised ':'')+'agreement expired before the supplies arrived.',[p.id]);
    }
    return entries.sort((a,b)=>b.week-a.week).slice(0,5);
  }
  root.EarthCommunityEffects=Object.freeze({view});
})(typeof window==='undefined'?globalThis:window);
