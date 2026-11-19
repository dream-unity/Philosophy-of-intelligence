/* Development is an index into the simulation's own agreements, work and receipts.
   Opening a book must not register a household, allocate a job, or move a resident. */
(function (root) {
  'use strict';
  const goods = stock => ['funds','materials','food'].filter(key => stock?.[key] > 0)
    .map(key => stock[key]+' '+key).join(', ') || 'none';
  const titleCase = value => value ? value[0].toUpperCase()+value.slice(1) : '';
  const participant = (id, role, detail = '') => ({id, role, detail});

  function records(world, site) {
    const entries = [];
    const civic = root.EarthCivicInitiatives?.view(world, site);
    for (const proposal of [civic?.active, ...(civic?.history || [])].filter(Boolean)) {
      const people = [participant(proposal.leadId,'Proposer',proposal.reason), participant(proposal.beneficiaryId,'Affected resident',proposal.benefit)];
      const details = [proposal.status];
      for (const vote of proposal.votes || []) people.push(participant(vote.personId,titleCase(vote.stance), vote.reason));
      for (const pledge of proposal.contributions || []) {
        const allotment = [pledge.funds && pledge.funds+' funds', pledge.materials && pledge.materials+' materials', pledge.labour && pledge.labour+' labour'].filter(Boolean);
        people.push(participant(pledge.personId,'Pledged in week '+pledge.week,allotment.join(', ')));
      }
      if (proposal.evidence) people.push(participant(proposal.evidence.ownerId,'Supplied evidence',proposal.evidence.title));
      for (const id of proposal.works?.people || []) people.push(participant(id,'Worked on site','Week '+proposal.works.week));
      const spent = ['commissioned','built','adopted'].includes(proposal.phase);
      details.push((spent?'Public funds spent and materials used · ':'Quoted cost · ')+goods(proposal.goods));
      if (!proposal.closedWeek) details.push('Authorised by residents · '+goods(proposal.pledged)+' · '+proposal.labour+' of '+proposal.effort+' shifts pledged · next review week '+proposal.reviewWeek);
      entries.push({key:'civic/'+proposal.id, title:proposal.title, kind:'Council', status:titleCase(proposal.phase), details, people,
        related:[proposal.jobId && 'site/'+proposal.jobId, proposal.evidence && 'project/'+proposal.evidence.id].filter(Boolean)});
    }
    for (const job of site.construction || []) {
      const workers = Object.entries(site.workforce?.members || {}).filter(([,w]) => w.jobId===job.id);
      const people = workers.map(([id,w]) => participant(id, w.rest?'On a rest break':'Assigned to the crew'));
      for (const id of job.partners || []) people.push(participant(id,'Project partner'));
      const remaining = Math.max(0,job.total-job.work);
      const status = job.paused?'Paused':!remaining?'Ready to open':workers.length?'Crew assigned':'Awaiting a crew';
      entries.push({key:'site/'+job.id, title:job.name, kind:'Worksite', status, people,
        details:[job.work+' / '+job.total+' work completed · '+remaining+' work remaining', 'Contract already paid · '+goods(job.paid)]});
    }
    const completed = root.EarthLocalProjects?.completions(site) || [];
    const recent = new Set(completed.map(item => item.id));
    for (const id of Object.keys(site.autonomy?.projects?.owners || {})) {
      const project = root.EarthLocalProjects?.view(site,world,id,null);
      if (!project || recent.has(project.id)) continue;
      entries.push({key:'project/'+project.id,title:project.title,kind:'Resident project',status:project.phase,
        details:[project.goal,project.progress+' / '+project.total+' sessions completed',project.next,
          project.materialCost && (project.progress?'Materials already committed · ':'Materials needed · ')+project.materialCost,
          project.finishedWeek?project.effect:'Expected result · '+project.effect].filter(Boolean),
        people:[participant(id,'Organiser',project.why),participant(project.partnerId,'Collaborator'),participant(project.volunteerId,'Agreed to help'),participant(project.beneficiaryId,'Intended beneficiary')]});
    }
    for (const p of completed) entries.push({key:'project/'+p.id,title:p.title,kind:'Resident project',status:'Finished in week '+p.week,
      details:[p.result], people:[participant(p.ownerId,'Organiser'),participant(p.partnerId,'Collaborator'),participant(p.beneficiaryId,'Affected resident'),participant(p.input?.ownerId,'Provided '+(p.input?.kind||'supplies'))]});

    // Order IDs connect an active job to its subsequent wage, output and dues.
    const orders = new Map();
    const people = root.EarthPersonas?.list(site) || site.residents || [];
    const owners = new Map(people.map(p=>[p.identityKey||p.id,p]));
    const centre=site.centre;
    if(centre){
      const j=centre.project;
      if(j){
        const proposer=people.find(p=>p.name===j.proposer),future=centre.incoming?.key===j.buyer?centre.incoming?.name:null;
        const participants=[participant(j.worker,'Contracted builder')];if(proposer)participants.push(participant(proposer.id,'Proposer'));
        orders.set(j.id,{key:'order/'+j.id,kind:'Town Centre contract',title:(j.kind==='home'?'Two-room dwelling':j.kind==='shop'?'Cooperative store':'Repair workshop')+' · plot '+(j.plot+1),
          status:['Materials reserved','Materials delivered','Frame completed'][j.stage],people:participants,
          details:[j.reason,'Commissioned by '+j.proposer+'. Three funds in escrow for the builder. '+j.delivered+' of 4 materials on site.',future?'Reserved for '+future+'.':''].filter(Boolean)});
      }
      for(const plot of centre.plots.filter(d=>d.contract)){
        const peopleAt=Object.entries(centre.rights).filter(([,id])=>id===plot.id).map(([k])=>owners.get(k)).filter(Boolean);
        const builder=people.find(p=>p.name===plot.builder),sale=plot.lastSale;
        entries.push({key:'order/'+plot.contract,kind:'Completed civic works',title:plot.title,status:'Opened in week '+plot.opened,
          people:[...(builder?[participant(builder.id,'Built the property')]:[]),...peopleAt.map(p=>participant(p.id,'Lives here'))],
          details:[plot.beds?plot.beds+' completed places · '+peopleAt.length+' named occupants.':(plot.sales||0)+' cooperative sales.',
            sale?sale.clerkName+' sold provisions to '+sale.buyerName+' in week '+sale.week+'.':''].filter(Boolean)});
      }
    }
    for(const row of site.practice?.open||[]){
      if(!['housing','design'].includes(row.subject))continue;
      entries.push({key:'booking/'+row.actorKey,title:root.EarthPractice.tasks[row.subject].name,kind:'Agreed work',status:'Booked in week '+row.week,
        details:[row.route==='commission'?'Commissioned for the weekly close.':'The participants still need to carry out the agreed work.',
          row.fee?'Agreed labour fee · '+row.fee+' funds payable upon completion.':'Independent labour.',
          row.plot==null?'':'Building plot '+(row.plot+1)+' · stage '+row.stage],
        people:[participant(row.actor,'Organiser'),participant(row.peer,row.route==='commission'?'Commissioned worker':'Instructor')]});
    }
    for(const row of site.practice?.events||[]){
      if(!['housing','design'].includes(row.subject)||!row.outcome)continue;
      const owner=owners.get(row.actorKey),helper=owners.get(row.peerKey);
      entries.push({key:['practical-work',row.week,row.subject,row.actorKey].join('/'),title:root.EarthPractice.tasks[row.subject].name,
        kind:'Completed work',status:row.place+' · week '+row.week,
        details:[row.result,'Carried out by '+row.by+(row.fee?' · '+row.fee+' funds paid for labour':' · independent labour')],
        people:[participant(owner?.id,'Organiser'),participant(helper?.id,row.route==='commission'?'Commissioned worker':'Instructor')]});
    }
    const byDeed = new Map((site.growth?.households||[]).map(h=>[h.plot,h]));
    const shops = new Map();
    for(const h of byDeed.values()){
      const proprietor=owners.get(h.owner),product=root.EarthResidentShops?.products?.[h.shop];
      if(!proprietor||!product)continue;
      const shop={key:'shop/'+h.owner,title:proprietor.name+'’s '+product.shop+' shop',kind:'Business',status:'Trading on lot '+(h.businessPlot+1),
        details:[product.name+' · '+h.stock+' ready to sell', (h.businessFunds||0)+' funds in the business till · '+(h.hires||0)+' paid shifts completed'],
        people:[participant(proprietor.id,'Proprietor')],related:[]};
      shops.set(proprietor.id,shop);entries.push(shop);
    }
    const road = site.growth?.road;
    if(road){
      const recipient=byDeed.get(road.lot),crew=road.owners.map(key=>participant(owners.get(key)?.id,'Road crew'));
      if(recipient)crew.push(participant(owners.get(recipient.owner)?.id,'Receives access','The completed road opens another trading frontage.'));
      orders.set(road.id,{key:'order/'+road.id,kind:'Public works',title:'Access road to lot '+(road.lot+1),status:'Reserved in round '+road.round,
        details:['The site holds 2 funds for wages and 3 materials. Both crew members need an available shift to lay the road.'],people:crew});
    }
    for(const household of byDeed.values()){
      const project=household.build;if(!project)continue;
      const name=project.shop?(root.EarthResidentShops?.products[project.shop]?.name||project.shop)+' shop':project.extension;
      orders.set(project.id,{key:'order/'+project.id,kind:'Property',title:name,status:'Under construction',
        details:['Two building materials are stored at the site. The owner needs an available shift to finish.'],
        people:[participant(owners.get(household.owner)?.id,'Deed holder',household.last)]});
    }
    for (const p of people) {
      const job = root.EarthDistrictGrowth?.work?.(site,p.id);
      if (!job?.id) continue;
      const project=orders.get(job.id);
      if(project){
        project.people.push(participant(p.id,'Working here',job.action));
        continue;
      }
      const contributors=[participant(p.id,'Assigned worker',job.reason)];
      const employer=shops.get(job.employerId);
      if(employer){
        employer.people.push(participant(p.id,'Hired worker',job.action));
        employer.related.push('order/'+job.id);
        contributors.push(participant(job.employerId,'Employer',employer.title+' committed the wage and commissioned this stock.'));
      }else if(job.beneficiaryId){
        contributors.push(participant(job.beneficiaryId,'Receives the order',job.destination));
      }
      orders.set(job.id,{key:'order/'+job.id,kind:'Funded work',title:job.name,status:titleCase(job.phase),
        details:[job.action,job.reason,'Leg '+job.step+' of '+job.steps+' · '+job.amount+' '+job.resource,
          job.tool && 'Equipment · '+job.tool,job.source && 'Source · '+job.source,job.destination && 'Destination · '+job.destination,
          'Wage reserved by '+job.payer+' · '+job.price+' funds'].filter(Boolean),people:contributors});
    }
    for (const round of site.growth?.history || []) {
      const transfers=root.EarthDistrictGrowth?.transfers?.(round)||round.transfers||[];
      if(transfers.length || round.events?.length){
        const delta=n=>(n>0?'+':'')+n;
        const accounts={key:'round/'+round.round,kind:'District accounts',title:'Round '+round.round+' · week '+round.week,status:'Settled',
          details:['Public treasury '+delta(round.funds)+' · pantry '+delta(round.food)+' · building store '+delta(round.materials),...(round.events||[])],
          people:[],transfers,related:[...new Set(transfers.filter(t=>t.workId).map(t=>'order/'+t.workId))]};
        entries.push(accounts);
      }
      for(const tr of transfers){
      if (!tr.workId) continue;
      let order=orders.get(tr.workId);
      if (!order) {
        order={key:'order/'+tr.workId,kind:'Account entry',title:tr.reason || tr.good+' transfer',status:'Round '+round.round,details:[],people:[]};
        orders.set(tr.workId,order);
      }
      order.details.push('Round '+round.round+' · '+tr.from+' → '+tr.to+' · '+tr.amount+' '+tr.good+(tr.reason?' · '+tr.reason:''));
      order.people.push(participant(tr.personId,'Named in the receipt'));
      if(tr.reason==='Employer received commissioned stock'||tr.reason==='Employer reserved the wage'){
        const shop=shops.get(tr.personId);if(shop && !shop.related.includes(order.key))shop.related.push(order.key);
      }
      }
    }
    for(const h of byDeed.values()){
      if(!h.access)continue;
      const owner=owners.get(h.owner),roadEntry=orders.get(h.access);
      if(roadEntry && owner)roadEntry.people.push(participant(owner.id,'Receives road access','The road reaches their plot and gives them access to another trading frontage.'));
    }
    entries.push(...orders.values());
    for (const entry of entries) {
      entry.people=entry.people.filter(p => p.id);
      entry.details=Array.from(new Set(entry.details.filter(Boolean)));
    }
    return entries;
  }

  function render(host,world,site,selection,onSelect) {
    const doc=host.ownerDocument || root.document;
    const el=(tag,text,cls) => {const n=doc.createElement(tag); if(text!=null)n.textContent=text; if(cls)n.className=cls; return n;};
    const action=(label,next) => {const b=el('button',label);b.type='button';b.dataset.developmentFocus=label;b.addEventListener('click',()=>{if(b.isConnected)onSelect(next);});return b;};
    const people=root.EarthPersonas?.list(site) || site.residents || [];
    const who=new Map(people.map(p=>[p.id,p]));
    const entries=records(world,site), employee=who.get(selection.personId),selected=entries.find(p=>p.key===selection.record);
    const box=el('section',null,'development-book');
    const line=text=>{if(text)box.append(el('p',text));};
    function pick(label,current,options,change){
      const field=el('select'),l=el('label',label);field.dataset.developmentFocus=label;
      for (const [value,name] of options){const option=el('option',name);option.value=value;field.append(option);}
      field.value=current;field.addEventListener('change',()=>{if(field.isConnected)change(field.value);});l.append(field);box.append(l);
    }
    function nextRecord(record){onSelect({record});}
    function showLinks(results) {
      if(!results.length)return;
      const nav=el('div',null,'development-links');
      for(const item of results){nav.append(action(item.title,{record:item.key}));}
      box.append(nav);
    }
    pick('Follow a resident',employee?.id || '',[['','Community overview'],...people.map(p=>[p.id,p.name])],id=>onSelect({personId:id}));
    if(employee){
      const linked=entries.filter(entry=>entry.people.some(p=>p.id===employee.id));
      const goal=root.EarthDistrictGrowth?.goal(site,employee), account=site.purses?.people?.[employee.id];
      box.append(el('h3',employee.name));
      if(goal)line('Level '+(goal.rank+1)+' · '+goal.points+' contribution points · '+(goal.next-goal.points)+' to level '+(goal.rank+2));
      const ambition=root.EarthDreams?.view?.(site,world,employee.id),job=root.EarthDistrictGrowth?.work?.(site,employee.id);
      if(ambition){line(ambition.title+' · '+ambition.progressText);line(ambition.next);}
      if(job){line('Current work · '+job.action);line(job.reason);}
      if(goal?.h?.last)line(goal.h.last);
      if(goal?.h?.shop){
        const shop=entries.find(e=>e.kind==='Business'&&e.people.some(p=>p.id===employee.id&&p.role==='Proprietor'));
        if(shop){box.append(el('h4','Business assets'));line(shop.details.join(' · '));box.append(action(shop.title,{record:shop.key}));}
      }
      if(goal?.h?.access)line('An access road reaches this household’s residential lot. The district has an additional trading frontage.');
      line('Personal funds · '+(account?.balance||0));
      const regional=root.EarthRegionalWorld?.residentRecord?.(world,site,employee.id);
      if(regional?.journey)line(regional.journey.detail);
      if(regional?.records?.length)line(regional.records[0].text);
      const impact=root.EarthCommunityEffects?.view(world,site,employee.id)||[];
      if(impact.length){box.append(el('h4','Recorded outcomes'));for(const e of impact.slice(0,3))line('Week '+e.week+' · '+e.result);}
      if(linked.length){box.append(el('h4','Work and decisions involving '+employee.name));showLinks(linked);}
      else line('No named project or payment has been recorded for this resident here yet.');
    }else{
      const floor=root.EarthCivicInitiatives?.reserve(world,site)||{};
      const held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
      const balances=el('dl',null,'development-balances');
      for(const key of ['funds','food','materials']){
        const total=site[key]||0,promised=held[key]||0,protectedAmount=floor[key]||0;
        const row=el('div');row.append(el('dt',key==='funds'?'Treasury':titleCase(key)),el('dd',String(total)),el('small',Math.max(0,total-promised-protectedAmount)+' spendable · '+promised+' pledged · reserve '+protectedAmount));balances.append(row);
      }
      box.append(balances);
      const g=root.EarthDistrictGrowth?.report(site);
      if(g)line(g.target?g.points+' / '+g.target+' growth points · '+(Math.max(0,g.target-g.points))+' to '+g.next:site.era+' · '+g.points+' lifetime growth points');
      const ongoing=root.EarthDistrictOrders?.overview?.(site);
      if(ongoing)line(ongoing.orders+' active orders · '+ongoing.reserved+' funds held in order escrow · '+ongoing.cargo+' goods in transit · '+ongoing.buyerFunds+' funds with visiting freight buyers');
      const region=root.EarthRegionalWorld?.ledger?.(world,site);
      if(region){
        const detail=el('details'),summary=el('summary','Exploration and neighbouring communities');detail.append(summary);detail.dataset.developmentDisclosure='region';
        detail.append(el('p',region.knownCells+' known parcels · '+region.journeys.length+' journeys underway'));
        for(const j of region.journeys)detail.append(el('p',j.name+' · '+j.activity+' · '+j.detail));
        for(const w of region.works)detail.append(el('p',[w.label,w.builder&&'built by '+w.builder,w.week!=null&&'week '+w.week].filter(Boolean).join(' · ')));
        for(const c of region.contacts)detail.append(el('p',c.name+' · '+c.terms+' · trust '+c.trust+' · '+c.detail));
        for(const x of region.records.slice(0,4))detail.append(el('p','Week '+x.week+' · '+x.text));
        box.append(detail);
      }
      if(entries.length){
        const p=selected||entries[0];
        pick('Inspect a project or receipt',p.key,entries.map(e=>{
          const first=who.get(e.people[0]?.id);
          return [e.key,e.kind+' · '+e.title+(first?' · '+first.name:'')];
        }),nextRecord);
        box.append(el('h3',p.title));line(p.status);
        for(const detail of p.details)line(detail);
        if(p.transfers?.length){
          const list=el('ol');
          for(const tr of p.transfers){
            const receipt=el('li');
            receipt.append(el('span',tr.from+' → '+tr.to+' · '+tr.amount+' '+tr.good+' · '+tr.reason));
            if(tr.workId)receipt.append(action('Trace this transfer',{record:'order/'+tr.workId}));
            list.append(receipt);
          }
          box.append(list);
        }
        const members=new Map();
        for(const person of p.people){
          let roles=members.get(person.id);if(!roles){roles=new Map();members.set(person.id,roles);}
          const labels=roles.get(person.detail)||new Set();labels.add(person.role);roles.set(person.detail,labels);
        }
        for(const [id,roles] of members){
          const person=who.get(id);if(!person)continue;
          const reasons=[...roles].map(([detail,labels])=>[...labels,detail].filter(Boolean).join(' · '));
          const row=el('div',null,'development-contributor');row.append(action(person.name,{personId:id}),el('span',reasons.map(reason=>/[.!?]$/.test(reason)?reason:reason+'.').join(' ')));box.append(row);
        }
        const attached=entries.filter(e=>p.related?.includes(e.key)||e.related?.includes(p.key));
        if(attached.length && !p.transfers?.length)showLinks(attached);
      }else line('Projects appear here when residents undertake work or present a proposal.');
    }
    host.append(box);
  }
  root.EarthDevelopmentLedger=Object.freeze({records,render});
})(typeof window==='undefined'?globalThis:window);
