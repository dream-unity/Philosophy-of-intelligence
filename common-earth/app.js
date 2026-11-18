(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const controls = (root, selector) => Array.from(root.querySelectorAll(selector));
  const node = (tag, cls, content) => {
    const result = document.createElement(tag);
    if (cls) result.className = cls;
    if (content != null) result.textContent = content;
    return result;
  };
  function button(label, callback, cls = 'secondary-button') {
    const result = node('button', cls, label);
    result.type = 'button';
    result.addEventListener('click', callback);
    return result;
  }
  const show = (id, visible) => { if ($(id)) $(id).hidden = !visible; };
  const put = (id, value) => { if ($(id)) $(id).textContent = value ?? ''; };
  const listen = (id, event, fn) => $(id)?.addEventListener(event, fn);
  const groups = {people:'People',build:'Build',research:'Research',work:'Work',council:'Council',routes:'Routes'};
  const start = {name:'Stone Town',region:'Zanzibar, Tanzania',lat:-6.1622,lon:39.1922,water:false};
  const sim = window.CommonEarthSim.create();
  let selected = start, view = 'world', group = 'people', visiting = null, peers = false, encounter = null, placement = null, street = null;
  let toastTimer;
  function notify(message, error = false) {
    const box = $('toast');
    if (!message || !box) return;
    clearTimeout(toastTimer);
    box.textContent = message;
    box.hidden = false;
    box.dataset.state = error ? 'warning' : 'notice';
    box.classList.add('visible','is-visible');
    toastTimer = setTimeout(() => {box.classList.remove('visible','is-visible'); box.hidden = true;}, 8000);
  }
  function presentResult(result) {
    if (result?.message) {
      notify(result.message,!result.ok);
      put('action-outcome',result.message); show('action-outcome',true);
    }
    return !!result?.ok;
  }
  function formatCoord(value, positive, negative) {
    return Math.abs(value).toFixed(2) + '° ' + (value < 0 ? negative : positive);
  }
  function coords(point) { return formatCoord(point.lat,'N','S')+'  ·  '+formatCoord(point.lon,'E','W'); }
  function known(point) {
    return sim.state.sites.find(s => s.id === point?.id || (Math.abs(s.lat-point?.lat)<.0005 && Math.abs(s.lon-point?.lon)<.0005));
  }
  function hideDialog(id) {
    const el=$(id);
    if (el?.matches('[popover]') && el.hidePopover) el.hidePopover();
    else if(el?.open) el.close();
  }
  function inView(id) {
    const el=$(id);
    if (!el) return;
    const top=el.getBoundingClientRect().top;
    if(top < 0 || top > innerHeight*.76) el.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  const atlas = window.EarthAtlas.mount($('globe-canvas'),{
    lat:7,lon:32,zoom:1,
    onSelect:point => choosePlace(point,false),
    onError:() => notify('The globe artwork could not load. You can still choose a place using Places.',true)
  });
  let voyageStyle='exchange',planOpen=false,reportOpen=false;
  function renderVoyage() {
    const el=$('voyage-console'),nav=window.EarthVoyages,site=sim.active();
    if(!el || !nav)return;
    el.replaceChildren();el.hidden=!site;
    if(!site)return;
    const v=sim.state.voyage;
    if(v) {
      const scene=nav.scene(v);
      el.append(node('small','kicker','Expedition · Stage '+scene.number+' of '+scene.total),
        node('h3','',scene.title),node('p','',scene.prompt),
        node('p','voyage-stats','Day '+v.days+' / '+v.targetDays+' · Supplies '+v.supplies+' · Readiness '+v.readiness+' · Goodwill '+v.goodwill+' · Knowledge '+v.knowledge));
      for(const option of nav.choices(v)) {
        const b=button('',async()=>{
          const from={...v.position},result=await sim.perform('sail',option.id);
          if(!presentResult(result))return;
          const arrival=sim.state.voyage?.position||sim.state.lastVoyage.position;
          if(!sim.state.voyage){selected={...v.target};reportOpen=true;planOpen=false;}
          render();
          atlas.journey(from,arrival,{duration:950});
        },'voyage-choice');
        b.append(node('strong','',option.label),node('small','',option.available?option.description:option.reason));
        b.disabled=!option.available;el.append(b);
      }
      if(v.log.length)el.append(node('p','voyage-note',v.log.at(-1).text));
      return;
    }
    if(reportOpen&&sim.state.lastVoyage) {
      const last=sim.state.lastVoyage;
      const reward=Object.entries(last.reward).map(([k,v])=>'+'+v+' '+k).join(' · ');
      el.append(node('small','kicker','Expedition report'),node('h3','',last.headline),node('p','',last.lesson),
        node('p','voyage-stats',last.origin.name+' · '+reward),button('Close report',()=>{reportOpen=false;renderVoyage();},'text-button'));
      return;
    }
    const target=known(selected)||selected,plan=nav.preview(site,target,voyageStyle);
    if(!plan.ok) {
      el.append(node('p','voyage-note','To plan an expedition from '+site.name+', select a destination at least 10 km away.'));
      return;
    }
    if(!planOpen) {
      el.append(button('Plan expedition here',()=>{planOpen=true;renderVoyage();},'secondary-button'));
      return;
    }
    el.append(node('small','kicker','Expedition'),node('h3','','From '+site.name));
    const label=node('label','', 'Purpose of the journey');
    const select=node('select','voyage-select');
    for(const style of nav.styles){const option=node('option','',style.label);option.value=style.id;select.append(option);}
    select.value=voyageStyle;select.addEventListener('change',()=>{voyageStyle=select.value;renderVoyage();el.querySelector('select')?.focus();});
    label.append(select);el.append(label,node('p','',plan.description),node('p','voyage-stats',plan.distance.toLocaleString()+' km · '+plan.legs+' stages · aim for '+plan.targetDays+' expedition days.'),
      node('small','voyage-note',plan.note));
    const startTrip=button('Depart · 1 effort, '+plan.cost.funds+' funds, '+plan.cost.food+' food',async()=>{
      if(presentResult(await sim.perform('beginVoyage',target,voyageStyle))) {reportOpen=false;render();atlas.focus(site.lat,site.lon,1.15);}
    },'primary');
    startTrip.disabled=sim.state.effort<1||site.funds<plan.cost.funds||site.food<plan.cost.food;
    el.append(startTrip);
    if(startTrip.disabled)el.append(node('p','voyage-note','Earn the listed resources or advance the week for more effort.'));
    el.append(button('Close plan',()=>{planOpen=false;renderVoyage();},'text-button'));
  }
  function markers() {
    atlas.setSites(sim.state.sites.map(s=>({...s,active:s.id===sim.state.activeId})));
    const routes = sim.state.routes.map(route => ({
      from:sim.state.sites.find(s=>s.id===(route.from || route.fromId || route.a)),
      to:sim.state.sites.find(s=>s.id===(route.to || route.toId || route.b))
    })).filter(r=>r.from&&r.to);
    if(sim.state.voyage)routes.push({from:sim.state.voyage.origin,to:sim.state.voyage.target,preview:true});
    atlas.setRoutes?.(routes);
    atlas.setSelection(selected);
  }
  function choosePlace(point,fly=true) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return;
    selected=point;planOpen=false;reportOpen=false;
    if ($('found-name')) $('found-name').value='';
    if(fly) atlas.focus(point.lat,point.lon,1.6);
    atlas.setSelection(point);
    inspect();
    hideDialog('places-dialog');
    if (view !== 'world') setView('world'); 
  }
  function inspect() {
    const site=known(selected);
    const scenario=window.EarthNavigation.scenario(selected);
    put('place-name',site?.name||selected.name);
    put('place-type',site ? (site.water?'Floating community':'Established community') :
      selected.region|| (selected.water?'Open water':'Landfall'));
    put('place-coords',coords(selected));
    put('place-description',site ? (site.population+' residents · '+site.era+'. Visit to meet the people who live here.') :
      (scenario ? 'Fictional opening · '+scenario.brief : '') || selected.caption || (selected.water ?
      'Found a floating community here. Its residents will depend on the food and supplies you can grow, recover or exchange.' :
      'Start a neighbourhood here. Meet its first residents and decide together what this place needs.'));
    show('found-area',!site); show('visit-button',!!site);
    renderVoyage();
    if ($('found-name')) $('found-name').placeholder=selected.water?'Name your floating community':'Name your community';
  }
  function placeButton(p) {
    const b=button('',()=>choosePlace(p),'place-result');
    b.append(node('strong','',p.name),node('small','',p.caption||p.region||coords(p)));
    return b;
  }
  function searchPlaces() {
    const query=$('place-search')?.value.trim()||'';
    if(!query){$('place-results').replaceChildren();return;}
    const results=window.EarthNavigation.search(query,9);
    $('place-results').replaceChildren(...results.map(placeButton));
    if(!results.length) $('place-results').append(node('p','empty-state','No match. Try another spelling or enter coordinates below.'));
  }
  function setView(next) {
    const changed=next!==view;
    if (next==='street' && !sim.active()) return;
    if(next==='world' && view==='street') cancelPlacement();
    view=next;
    document.body.dataset.mapView=view;
    const isStreet=view==='street';
    show('atlas-stage',!isStreet);show('street-stage',isStreet); show('street-controls',isStreet);
    show('site-inspector',!isStreet);show('actions-panel',isStreet);
    for(const [id,isActive] of [['world-view',!isStreet],['street-view',isStreet]]) {
      $(id).setAttribute('aria-pressed',String(isActive));
      $(id).classList.toggle('active',isActive);
    }
    if(isStreet) {
      if(!street) street=window.EarthStreet.mount($('street-canvas'),{
        onInteract:interactAt,onPlace:placeBuilding,onHint:text=>put('street-hint',text),
        onState:state=>{
          const driving=state.mode==='drive';
          const vehicle=$('street-vehicle');
          if(vehicle) {
            vehicle.setAttribute('aria-pressed',String(driving));
            vehicle.textContent=driving?'Leave van':'Use van';
            vehicle.setAttribute('title',driving?'Leave the van':'Use the community van');
          }
          if(!state.placement && placement){placement=null;show('cancel-placement',false);}
        }
      });
      put('street-title',sim.active().name);street.setSite(sim.active());
      requestAnimationFrame(()=>street.resize());
    } else requestAnimationFrame(()=>atlas.resize());
    if(changed && matchMedia('(max-width: 760px)').matches) requestAnimationFrame(()=>$(isStreet?'street-stage':'atlas-stage').scrollIntoView({block:'start',behavior:'instant'}));
    render();
  }
  async function openSite(s) {
    if(!s) return;
    const result=await sim.perform('visit',s.id);
    if(result && !result.ok){presentResult(result);return;}
    visiting=null;peers=false;encounter=null;placement=null;group='people';
    choosePlace(s,false);setView('street');hideDialog('society-dialog');
  }
  async function found() {
    if(known(selected)){openSite(known(selected));return;}
    const result=await sim.perform('found',{...selected},$('found-name').value.trim()||undefined);
    if(!presentResult(result))return;
    const site=sim.active();
    if(site){selected={...site};group='people';visiting=null;peers=false;encounter=null;setView('street');}
  }
  function selectGroup(next) {
    if(!groups[next])return;
    cancelPlacement();
    group=next;visiting=null;peers=false;encounter=null;
    renderActions();
  }
  function cancelPlacement() {
    placement=null;street?.setPlacement(null);show('cancel-placement',false);
  }
  async function applyAction(id,plot) {
    const result=await sim.perform('act',id,plot);
    if(presentResult(result)) {
      if(placement) cancelPlacement();
      street?.setSite(sim.active());
    }
    render();
    return result;
  }
  function confirmReclaim(plot) {
    const preview=sim.previewReclaim(plot);
    if(!preview.available){notify(preview.reason,true);return;}
    const list=$('actions-list');list.replaceChildren(node('h3','',preview.label),node('p','action-description',preview.text));
    list.append(button('Dismantle this building',async()=>{
      presentResult(await sim.perform('reclaim',plot));encounter=null;street.setSite(sim.active());render();
    },'action-button'),button('Keep building',renderActions,'text-button'));
  }
  function placeBuilding({plot}) {
    if(placement) applyAction(placement.id,plot);
  }
  function requestAction(action) {
    if(!action.available) { notify(action.reason || 'This choice is currently unavailable.',true);return; }
    if(action.id.startsWith('reclaim:')){confirmReclaim(action.plot);return;}
    if(group==='build') {
      placement=action;street.setPlacement(action.kind||action.id.split(':').pop());
      show('cancel-placement',true);
      notify('Choose a numbered plot for '+action.label+'. Use the arrows and Enter on the district map, or choose a plot below.');
      renderActions();inView('street-stage');return;
    }
    if(action.id.startsWith('courier:')) {
      const target=action.id==='courier:pick'?'market':'resident';
      const id=action.id.split(':')[2];
      if(encounter?.type!==target || (id && encounter.residentId!==id) || !nearEncounter()) {
        if(target==='market') street.focusMarket();else street.focusResident(id);
        notify(target==='market'?'Follow the route to the market to collect the delivery.':'Follow the route to the recipient.');inView('street-stage');return;
      }
    }
    applyAction(action.id);
  }
  function nearEncounter() {
    if(!encounter||!street) return false;
    const state=street.getState();
    return Math.hypot(state.x-encounter.x,state.y-encounter.y)<2.9;
  }
  function interactAt(event) {
    if(!sim.active())return;
    cancelPlacement();
    encounter=event;visiting=null;peers=false;
    if(event.type==='resident') {group='people';visiting=event.residentId;}
    else if(event.type==='market') group='work';
    else if(event.type==='building') group='build';
    else return;
    renderActions();
    inView('actions-panel');
  }
  function actionRow(a) {
    const card=node('article','action-card');
    const title=node('strong','action-label',a.label);
    const descriptor=node('p','action-description',a.description||'');
    const call=button(a.available?'Choose':'Unavailable',()=>requestAction(a),'action-button');
    call.disabled=!a.available;
    call.setAttribute('aria-label',a.label);
    card.append(title,descriptor);
    const costs=[a.cost+' effort',...Object.entries(a.goods||{}).map(([key,value])=>value+' '+key)];
    card.append(node('small','action-cost',costs.join(' · ')));
    if(!a.available&&a.reason)card.append(node('small','action-reason',a.reason));
    card.append(call);
    return card;
  }
  function renderActions() {
    const site=sim.active();
    if(!site || view!=='street') return;
    const list=$('actions-list');
    list.replaceChildren();
    for(const tab of controls($('action-tabs'),'[data-group]')) {
      const active=tab.dataset.group===group;
      tab.setAttribute('aria-pressed',String(active));tab.classList.toggle('active',active);
    }
    put('actions-heading',groups[group]);
    const actions=sim.actions(group);
    if(placement) {
      put('actions-heading','Choose a plot');
      list.append(node('p','action-description',placement.label+' · Select a vacant plot on the district map or use its number here.'));
      const grid=node('div','quick-picks');
      for(let plot=0;plot<9;plot++){
        const preview=sim.previewBuild(placement.kind,plot);
        const b=button('',()=>placeBuilding({plot}),'plot-choice');
        b.append(node('strong','','Plot '+(plot+1)),node('small','',preview.ok?preview.forecast:'Occupied'));
        b.setAttribute('title',preview.text);b.setAttribute('aria-label',preview.text);b.disabled=!preview.available;
        grid.append(b);
      }
      list.append(grid,button('Cancel placement',()=>{cancelPlacement();renderActions();}));
      return;
    }
    const context=$('decision-context');
    if(context) {
      const notes=[];
      if(group==='council') {
        if(site.issue) notes.push(site.issue.title+' · Vote by week '+site.issue.deadline+'. '+site.issue.prompt);
        if(sim.state.charter) notes.push('Charter: '+sim.overview().charter.name+'. '+sim.overview().charter.text);
        for(const pending of site.pending) notes.push('The effects of a council vote will be known in week '+pending.week+'.');
        if(!site.issue && sim.state.charter && !site.pending.length) notes.push('The council has no open vote this week.');
      } else if(group==='routes') {
        for(const r of sim.state.routes.filter(r=>r.from===site.id||r.to===site.id)) {
          const target=sim.state.sites.find(s=>s.id===(r.from===site.id?r.to:r.from));
          notes.push(target.name+' · '+r.lastStatus);
        }
      } else if(group==='people') {
        for(const p of site.residents.filter(r=>r.promise)) notes.push('Promise to '+p.name+' · due week '+p.promise.dueWeek+'.');
      } else if(group==='work'&&site.delivery) {
        const person=site.residents.find(r=>r.id===site.delivery.residentId);
        notes.push('Parcel on board · '+person.name+' is waiting at home.');
      }
      context.replaceChildren(...notes.map(t=>node('p','',t)));context.hidden=!notes.length;
    }
    if(group==='people') {
      const person=site.residents.find(r=>r.id===visiting);
      if(peers && window.EarthNeighbours){
        const work=window.EarthNeighbours.summary(site);
        put('actions-heading',work.title);
        list.append(button('← All residents',()=>{peers=false;renderActions();},'text-button'),node('p','action-description',work.body));
        const links=node('ul','peer-links');
        for(const pair of work.links)links.append(node('li','',pair.names.join(' & ')+' · '+pair.status));
        list.append(links);
        for(const a of actions.filter(x=>x.peerProject))list.append(actionRow(a));
        if(work.history.length)list.append(node('p','resident-line',work.history[0].text));
        return;
      }
      if(!person) {
        list.append(node('p','action-description','Choose a resident to walk to their door. Their requests give you a place to start.'));
        for(const r of site.residents) {
          const item=node('article','action-card');
          item.append(node('strong','action-label',r.name),node('p','action-description',r.role+' · '+r.value),
            button('Meet '+r.name.split(' ')[0],()=>{street.focusResident(r.id);notify('On the way to '+r.name+'.');inView('street-stage');},'action-button'));
          list.append(item);
        }
        if(window.EarthNeighbours)list.append(button('Shared projects between neighbours →',()=>{peers=true;renderActions();},'secondary-button'));
        return;
      }
      list.append(button('← All residents',()=>{visiting=null;peers=false;encounter=null;renderActions();},'text-button'));
      put('actions-heading',person.name);
      list.append(node('p','resident-line',person.role+' · '+person.value+' · Bond '+person.bond));
      const delivery=(sim.actions('work')||[]).find(a=>a.id==='courier:deliver:'+person.id);
      if(delivery)list.append(actionRow(delivery));
      for(const a of actions.filter(a=>a.residentId===person.id||a.id.includes(':'+person.id)))list.append(actionRow(a));
    } else {
      if(encounter?.type==='building'&&group==='build') {
        list.append(node('p','resident-line',encounter.label+' · Plot '+(encounter.plot+1)),button('Review dismantling',()=>confirmReclaim(encounter.plot),'text-button'));
      }
      for(const action of actions)list.append(actionRow(action));
      if(!actions.length) {
        const text=group==='routes' ? (sim.state.sites.length>1?'All available partners are linked.':'Found a second community on the Earth atlas to plan an exchange.') : group==='research'?'This community has completed its research.':group==='council'?'The next agenda opens as weeks pass.':'More choices open as the community develops.';
        list.append(node('p','empty-state',text));
      }
    }
  }
  const resourceLabels={funds:'Funds',materials:'Materials',food:'Food',population:'Residents',trust:'Trust',wellbeing:'Wellbeing'};
  function render() {
    const site=sim.active(), overview=sim.overview(), state=sim.state;
    put('action-budget',site ? state.effort+' effort · '+site.funds+' funds · '+site.materials+' materials · '+site.food+' food' : '');
    put('week','Week '+state.week);put('effort',state.effort+' / '+window.CommonEarthSim.maxEffort);put('objective',overview.objective);
    put('era',overview.era||site?.era||'');put('forecast',overview.forecast);
    show('settlement-status',!!site);$('advance-week').disabled=!site;$('street-view').disabled=!site;
    if($('society-open')) $('society-open').disabled=!site;
    const resources=$('resource-strip');
    resources.replaceChildren();
    if(site) for(const [key,label] of Object.entries(resourceLabels)){
      const metric=node('div','resource');metric.append(node('span','resource-label',label),node('strong','resource-value',site[key]));resources.append(metric);
    }
    $('site-list').replaceChildren(...state.sites.map(s=>{
      const b=button('',()=>openSite(s),'site-entry');
      b.append(node('strong','',s.name),node('small','',s.region+' · '+s.population+' residents'));return b;
    }));
    $('journal-list').replaceChildren(...state.journal.slice(0,100).map(entry=>{
      const e=node('li','journal-entry');e.append(node('small','', 'Week '+entry.week),node('p','',entry.text));return e;
    }));
    if(!state.journal.length)$('journal-list').append(node('li','empty-state','Your first entry is written when you found a community.'));
    if($('route-status')){
      const routes=state.routes.map(r=>{
        const from=state.sites.find(s=>s.id===r.from),to=state.sites.find(s=>s.id===r.to);
        const item=node('article','route-entry');
        item.append(node('strong','',from.name+' ↔ '+to.name),node('p','',r.lastStatus));return item;
      });
      $('route-status').replaceChildren(...routes);
    }
    inspect();markers();renderActions();renderForecast();
  }
  function renderForecast() {
    const el=$('week-summary'),site=sim.active();
    if(!el)return;
    const details=el.closest('details');
    if(details && !details.open)return;
    if(!site){el.textContent='Found a community to see its first forecast.';return;}
    const next=sim.forecastNext();
    el.replaceChildren(node('strong','','If you advance to week '+next.week));
    for(const f of next.sites){
      const entry=node('section','forecast-entry');
      const net=Object.entries(f.delta).filter(([,n])=>n).map(([k,n])=>(n>0?'+':'')+n+' '+k).join(' · ')||'No net change';
      entry.append(node('h3','',f.name),node('p','',net));
      for(const text of f.highlights)entry.append(node('small','',text));
      el.append(entry);
    }
  }
  $('week-summary')?.closest('details')?.addEventListener('toggle',renderForecast);
  listen('world-view','click',()=>setView('world'));
  listen('street-view','click',()=>setView('street'));
  listen('visit-button','click',()=>openSite(known(selected)));
  listen('found-button','click',e=>{e.preventDefault();found();});
  listen('found-name','keydown',e=>{if(e.key==='Enter'){e.preventDefault();found();}});
  listen('zoom-in','click',()=>atlas.zoomBy(1.45));listen('zoom-out','click',()=>atlas.zoomBy(1/1.45));
  listen('recenter','click',()=>atlas.focus(selected.lat,selected.lon,1));
  listen('advance-week','click',async()=>{if(presentResult(await sim.perform('advance'))){cancelPlacement();street?.setSite(sim.active());render();}});
  listen('action-tabs','click',e=>{const target=e.target.closest('[data-group]');if(target)selectGroup(target.dataset.group);});
  listen('street-interact','click',()=>street?.interact());listen('street-vehicle','click',()=>street?.toggleVehicle());
  listen('street-controls','click',e=>{const target=e.target.closest('[data-move]');if(target)street?.move(target.dataset.move);});
  listen('cancel-placement','click',()=>{cancelPlacement();renderActions();});
  listen('street-open-actions','click',()=>{inView('actions-panel');});
  listen('place-search','input',searchPlaces);
  listen('coords-form','submit',e=>{
    e.preventDefault();
    const lat=$('latitude').valueAsNumber,lon=$('longitude').valueAsNumber;
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180) {notify('Use a latitude from −90 to 90 and a longitude from −180 to 180.',true);return;}
    const p=atlas.locate(lat,lon);
    if(!p){notify('The chart is still loading. Choose a named place or try again shortly.',true);return;}
    choosePlace(p);
  });
  const starts=window.EarthNavigation.featured();
  $('quick-picks').replaceChildren(...starts.map(p=>button(p.name,()=>choosePlace(p),'place-chip')));
  searchPlaces();
  if(sim.saveIssue) notify('Browser storage is unavailable. Progress can be played in this tab.',true);
  if(sim.active()) {
    selected={...sim.active()};atlas.focus(selected.lat,selected.lon,1);
  }
  sim.subscribe((_world,notice)=>{
    if(!notice.external)return;
    cancelPlacement();visiting=null;peers=false;encounter=null;
    if(!sim.active()){selected=start;setView('world');}
    else {street?.setSite(sim.active());render();}
    if(notice.message)notify(notice.message);
  });
  setView('world');
})();
