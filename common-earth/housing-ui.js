/* The housing register uses the district currently under inspection. Focusing
   a dwelling only moves the regional camera, including in observer mode. */
(function(root){
  'use strict';
  function mount({sim,inspected,scene,townCentre}){
    const doc=root.document,stage=doc.getElementById('street-stage');
    if(!stage||!root.EarthHousing)return null;
    const el=(tag,text)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;return n;};
    const bar=el('div');bar.id='housing-bar';bar.hidden=true;
    const toggle=el('button');toggle.type='button';toggle.setAttribute('aria-haspopup','dialog');toggle.setAttribute('aria-controls','housing-directory');
    const centre=el('button','Town Centre');centre.type='button';centre.id='town-centre-shortcut';
    centre.setAttribute('aria-haspopup','dialog');centre.setAttribute('aria-controls','town-centre');
    centre.addEventListener('click',()=>{const site=inspected();if(site)townCentre?.(site.id);});
    bar.append(centre,toggle);stage.before(bar);
    const dialog=el('dialog');dialog.id='housing-directory';dialog.setAttribute('aria-labelledby','housing-title');
    const head=el('header'),title=el('h2'),close=el('button','Close');title.id='housing-title';
    close.type='button';head.append(title,close);
    const summary=el('p'),filters=el('label'),filter=el('select'),body=el('div');
    filters.textContent='Show ';filters.append(filter);body.className='housing-results';
    for(const [id,text] of [['people','Residents'],['unhoused','Residents without housing'],['vacant','Vacancies and reservations'],['works','Housing under construction'],['records','Housing history']]){
      const option=el('option',text);option.value=id;filter.append(option);
    }
    const policy=el('details'),policyTitle=el('summary','Housing relief'),terms=el('p'),choices=el('select'),pick=el('label','Council response '),apply=el('button','Set relief policy'),feedback=el('p');
    for(const [id,text] of [['reserve','Protect household reserves'],['emergency','Release emergency reserves'],['private','Voluntary household help']]){
      const option=el('option',text);option.value=id;choices.append(option);
    }
    pick.append(choices);apply.type='button';feedback.setAttribute('role','status');policy.append(policyTitle,terms,pick,apply,feedback);
    dialog.append(head,summary,filters,policy,body);doc.body.append(dialog);
    const descriptions={reserve:'Protect two weeks of meals and six funds. Surplus food and willing hosts can support households.',
      emergency:'Release food down to the last unit, ask residents to make time for urgent support visits, and pay willing owners one fund for four weeks of shelter.',
      private:'Households can still give money or offer a room. The council holds its reserves.'};
    let reliefQuote=null;
    choices.addEventListener('change',()=>{terms.textContent=descriptions[choices.value];});
    apply.addEventListener('click',async()=>{
      if(apply.disabled||!reliefQuote)return;
      apply.disabled=true;
      try{
        const result=await sim.perform('communityLife',{...reliefQuote,level:choices.value,action:'housingRelief',actor:'steward'});
        feedback.textContent=result.message;
        refresh(true);
      }finally{apply.disabled=false;}
    });
    let stamp='',contentStamp='',townId='';
    function dismiss(){if(dialog.open)dialog.close();else dialog.removeAttribute('open');toggle.focus({preventScroll:true});}
    close.addEventListener('click',dismiss);
    function pointButton(town,house){
      if(!house?.point)return null;
      const b=el('button','Show on map');b.type='button';b.dataset.house=house.key||house.label;b.setAttribute('aria-label','Show '+house.label+' on map');
      b.addEventListener('click',()=>{
        const live=inspected();if(!live||live.id!==town.id){refresh(true);return;}
        const geo=root.EarthRegionalWorld.geography(sim.state,live),t=geo.towns.find(v=>v.site.id===live.id),s=scene();
        if(!t||!s?.inspectRegion)return;
        const at=root.EarthRegionalRender.regionalPoint(t,house.point.x,house.point.y);
        dismiss();s.inspectRegion(at.x,at.y,{zoom:1.6,picked:true});
      });return b;
    }
    function contents(site){
      const report=root.EarthHousing.view(sim.state,site),byHome=new Map(report.homes.map(h=>[h.key,h]));
      title.textContent=site.name+' housing';
      summary.textContent=report.population+' residents · '+report.occupied+' housed · '+report.unmet+' without housing · '+
        report.capacity+' completed places · '+report.visitors+' visiting';
      const canSet=site.id===sim.active()?.id&&site.id===sim.state.communityLife?.homeId&&root.EarthAgency.actorId(site)==='steward'&&!sim.state.communityLife?.journey;
      const current=site.housing?.relief||'reserve';
      const sameQuote=reliefQuote?.site===site.id&&reliefQuote.prior===current;
      reliefQuote={site:site.id,week:sim.state.week,generation:site.foundingRevision||0,prior:current};
      if(!sameQuote||!canSet){choices.value=current;terms.textContent=descriptions[current];}
      pick.hidden=apply.hidden=!canSet;
      const entries=[];
      const row=(name,detail,house)=>entries.push({name,detail,house});
      if(filter.value==='people'||filter.value==='unhoused'){
        for(const r of report.rows){
          if(filter.value==='unhoused'&&(r.home||r.uncounted))continue;
          const h=byHome.get(r.home);
          const occupancy=h?h.label+(h.owner===r.key?' · owner':h.owner?' · staying with owner':' · residential rights'):
            r.uncounted?'Named in the street roster; not included in the historical census total.':
            'Without housing'+(r.weeks?' · '+r.weeks+' weeks':'')+(r.crisis?' · Asked for company and urgent support in week '+r.crisis:'')+(r.help?' · '+r.help:'');
          row(r.name,(r.away?'Away · ':'')+occupancy,h);
        }
        if(report.anonymous&&filter.value==='people')row('Other household members',report.anonymous+' people in the historical census have no individual street records. '+report.anonymousMissing+' lack housing.');
        else if(report.anonymousMissing)row('Other household members',report.anonymousMissing+' people without individual street records lack housing.');
      }else if(filter.value==='vacant'){
        for(const h of report.homes){
          const free=h.places-h.occupants.length-h.anonymous-h.reserved.length;
          if(!free&&!h.reserved.length)continue;
          const details=[];
          if(free)details.push(free+' vacant'+(h.available?' · available for allocation':' · rights held by '+h.ownerName));
          for(const r of h.reserved)details.push('Reserved for '+r.name);
          row(h.label,details.join(' · '),h);
        }
      }else if(filter.value==='records'){
        for(const entry of site.housing?.support||[])row('Week '+entry.week,entry.text);
        for(const entry of site.housing?.losses||[])row('Week '+entry.week,entry.text);
        for(const lease of site.housing?.leases||[]){
          const tenant=report.rows.find(r=>r.key===lease.tenant),owner=report.rows.find(r=>r.key===lease.owner);
          if(owner&&tenant)row('Emergency lodging',owner.name+' hosts '+tenant.name+' through week '+lease.through,byHome.get(lease.home));
        }
        if(!entries.length)row('Housing records','No emergency lodging agreements, support visits or deaths have been recorded.');
      }else{
        for(const h of report.works)row(h.label,h.places+' future places · '+h.detail,h);
      }
      const next=JSON.stringify([site.id,filter.value,...entries.map(r=>[r.name,r.detail,r.house?.key,r.house?.point])]);
      if(contentStamp===next)return;
      contentStamp=next;
      const focus=body.contains(doc.activeElement)?doc.activeElement.dataset.house:null;
      const scroll=dialog.scrollTop,items=doc.createDocumentFragment();
      for(const {name,detail,house} of entries){
        const article=el('article'),description=el('div');description.append(el('strong',name),el('p',detail));article.append(description);
        const b=pointButton(site,house);if(b)article.append(b);items.append(article);
      }
      if(!items.childNodes.length)items.append(el('p',filter.value==='unhoused'?'Every resident currently has a place to live.':
        filter.value==='works'?'There are no housing worksites in this town.':filter.value==='vacant'?'There are no vacant or reserved places.':'There are no resident records.'));
      body.replaceChildren(items);
      if(focus){const nextButton=[...body.querySelectorAll('button')].find(b=>b.dataset.house===focus);(nextButton||filter).focus({preventScroll:true});}
      dialog.scrollTop=scroll;
    }
    function refresh(force=false){
      const site=inspected();
      bar.hidden=!site;
      if(!site){if(dialog.open)dismiss();stamp='';return;}
      const w=sim.state;
      const current=[site.id,w.week,w.actionRevision,w.workRevision,w.productionSerial,site.population,site.city?.serial,site.housing?.week].join('/');
      if(stamp===current&&!force)return;
      stamp=current;
      if(site.id!==townId){townId=site.id;filter.value='people';}
      const capacity=root.EarthCityModel.housingCapacity(site),unmet=root.EarthHousing.need(w,site);
      const text=site.name+' · '+site.population+' / '+capacity+(unmet?' · '+unmet+' unhoused':'');
      if(toggle.textContent!==text)toggle.textContent=text;
      toggle.setAttribute('aria-label',site.name+' housing directory, '+site.population+' residents, '+capacity+' completed places, '+unmet+' without housing');
      toggle.title='Population / completed housing capacity';
      if(dialog.open)contents(site);
    }
    filter.addEventListener('change',()=>{if(inspected())contents(inspected());});
    toggle.addEventListener('click',()=>{
      const s=inspected();if(!s)return;contents(s);
      if(!dialog.open&&dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
      close.focus();
    });
    return {refresh};
  }
  root.EarthHousingUI=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
