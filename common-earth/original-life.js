/* Personal commitments travel with the original resident, including while another
   resident is being played. All actions go through their existing street desks. */
(function(root){
  'use strict';
  function due(week,deadline){
    if(deadline<week)return 'Overdue since week '+deadline;
    if(deadline===week)return 'Due this week';
    if(deadline===week+1)return 'Due next week · week '+deadline;
    return 'Due week '+deadline;
  }
  function mount(host,{sim,playAs,pantry,towns,talk,observing}){
    if(!host)return null;
    const doc=host.ownerDocument;
    function el(tag,text,cls){
      const node=doc.createElement(tag);
      if(text)node.textContent=text;
      if(cls)node.className=cls;
      return node;
    }
    function render(){
      const world=sim.state,site=sim.active(),original=root.EarthInterdependence?.anchor(world,site);
      host.replaceChildren();if(!original||!world.communityLife)return;
      const a=root.EarthCommunityLife.anchor(world),actor=root.EarthAgency.actorId(site),mine=original.id===actor;
      const here=site.id,week=world.week,revision=world.actionRevision,journey=world.communityLife.journey,remote=observing?.();
      const current=()=>!host.hidden&&!doc.hidden&&!observing?.()&&sim.active()?.id===here&&
        root.EarthAgency.actorId(sim.active())===actor&&sim.state.week===week&&sim.state.actionRevision===revision;
      function button(box,label,key,act){
        if(remote)return;
        const btn=el('button',label);btn.type='button';btn.dataset.streetCommand=key;
        btn.addEventListener('click',()=>{if(btn.isConnected&&current())return act();});
        box.append(btn);return btn;
      }
      function row(title,detail){
        const box=el('article',null,'district-row');box.append(el('strong',title),el('p',detail));host.append(box);return box;
      }
      const pov=mine?original.name:root.EarthAgency.identity(site,actor)?.name||'another resident';
      const summary=row(original.name,'Home in '+original.homeName+'. Playing as '+pov+' in '+site.name+'.');
      const accounts=world.sites.map(s=>({name:s.name,balance:s.purses?.people?.[original.id]?.balance||0})).filter(p=>p.balance);
      const balance=accounts.reduce((sum,p)=>sum+p.balance,0);
      summary.append(el('p','Personal purse · '+balance+' fund'+(balance===1?'':'s')+
        (accounts.length>1?' ('+accounts.map(p=>p.name+' '+p.balance).join(', ')+')':'')+'.'));
      const absence=root.EarthAgency.recall?.(world,site);
      if(absence){
        const section=row(absence.active?'Since you changed viewpoint':'While you were away',
          'Week '+absence.since+' to '+absence.until+' · '+original.name);
        if(absence.changes.length)for(const detail of absence.changes)section.append(el('p',detail));
        else section.append(el('p','No completed commitments, changes of work or personal gains recorded in that interval.'));
      }
      if(!mine&&!journey&&!remote){
        const handoff=button(summary,'Return to playing as '+original.name,'original-handoff',()=>playAs(original.id));
        handoff.id='scene-original-handoff';
      }
      if(remote){summary.append(el('p','You are watching another town. Return to your street to act.'));return;}
      if(journey){button(summary,'Continue the district crossing','original-crossing',()=>towns());}
      const rota=row('Pantry round · '+a.dutyPlace,a.attended?'Count completed for week '+a.due+'.':
        a.coveredBy?(a.coverName||'A neighbour')+' agreed to cover week '+a.due+'.':
        due(week,a.due)+'. The next cook needs the household count.');
      if(mine&&!journey&&!a.attended&&!a.coveredBy){
        if(a.dutySiteId===here){
          button(rota,'Walk to the exchange and count the pantry','original-round',()=>pantry('round'));
          const helper=root.EarthCommunityLife.coverCandidate(site);
          if(helper)button(rota,'Meet '+helper.name+' to ask for cover','original-cover',()=>pantry('cover',helper.id));
          else rota.append(el('p','Cover requires a trusted neighbour you have heard, with no outstanding promise.'));
        }else button(rota,'Travel to '+a.dutyPlace+' for the round','original-rota-route',()=>towns(a.dutySiteId));
      }
      if(!mine&&!a.attended&&!a.coveredBy)rota.append(el('p',original.name+' can fit the count into an available shift at the exchange. Return to them to arrange cover personally.'));
      const signed=row('Signed commitments',original.held.length?'Agreements signed by '+original.name+'.':'No outstanding signed promises.');
      for(const item of original.held){
        const where=world.sites.find(s=>s.id===item.siteId),person=where?.residents.find(p=>p.id===item.who);
        const detail=el('div',null,'scene-action');signed.append(detail);
        detail.append(el('strong',item.title),el('p',due(week,item.due)+' · '+item.siteName+(item.detail?'. '+item.detail:'.')));
        if(mine&&!journey){
          if(here===item.siteId&&person&&root.EarthCommunityLife.present(site,item.who))
            button(detail,'Meet '+person.name,'original-signer-'+item.who,()=>talk(item.who));
          else button(detail,'Review delivery and travel options','original-delivery',()=>towns());
        }
      }
      const missed=[];
      for(const s of world.sites){
        for(const p of s.residents)for(const r of p.agreements||[])if(r.by===original.id&&r.status==='missed')
          missed.push({week:r.week,text:'Missed the promise to '+p.name+' in '+s.name+'.'});
        for(const r of root.EarthDialogue?.arrangements?.(s,world,original.id)||[])if(r.actorId===original.id&&r.status==='missed')
          missed.push({week:r.finishedWeek,text:r.title+' in '+s.name+'. '+(r.outcome||'The agreement expired.')});
        for(const r of s.communityLife?.log||[])if(r.text.includes(original.name+'’s pantry round had no handover.'))
          missed.push(r);
      }
      if(missed.length){
        missed.sort((a,b)=>b.week-a.week);
        const item=missed[0];row('Latest missed commitment','Week '+item.week+' · '+item.text);
      }
      if(mine&&!journey&&!original.atHome&&(a.dutySiteId!==original.homeId||a.attended||a.coveredBy))
        button(summary,'Travel home to '+original.homeName,'original-home',()=>towns(original.homeId));
    }
    return {render};
  }
  root.EarthOriginalLife=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
