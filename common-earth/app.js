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
  const book=window.EarthSaves?.open();
  const sim=book?.sim||window.CommonEarthSim.create();
  const savedWorlds=book && $('saved-worlds') ? book.mount($('saved-worlds'),{section:true}):null;
  const planning=window.EarthPlanner && $('planning-table') ? window.EarthPlanner.mount($('planning-table'),sim):null;
  const learning=window.EarthGoals && $('learning-goal') ? window.EarthGoals.mount($('learning-goal'),{sim,onResult:presentResult,onChange:render}):null;
  let city=null,shiftStop=null,researchPage='eras',councilPage='agenda';
  let selected = start, view = 'world', group = 'people', visiting = null, peers = false, encounter = null, placement = null, street = null;
  let toastTimer, recordsPage='events',journalLimit=20,journalFilter='all';
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
    if(!point)return null;
    return sim.state.sites.find(s=>{
      if(s.id===point.id)return true;
      const d=Math.PI/180;
      const h=Math.sin((s.lat-point.lat)*d/2)**2+Math.cos(s.lat*d)*Math.cos(point.lat*d)*Math.sin((s.lon-point.lon)*d/2)**2;
      return 12742*Math.asin(Math.sqrt(Math.min(1,h)))<10;
    });
  }
  function hideDialog(id) {
    const el=$(id);
    if (!el)return;
    if(el.matches('[popover]') && el.hidePopover) el.hidePopover();
    else if(el.classList.contains('sheet-fallback'))el.querySelector('[popovertargetaction="hide"]')?.click();
    else if(el.open) el.close();
  }
  function focusActions() {
    if(view!=='street')return;
    $('actions-heading')?.focus({preventScroll:true});inView('actions-panel');
  }
  function followStreet() {if(street?.getState().travelling)inView('street-stage');}
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
  let voyageStyle='exchange',planOpen=false,reportOpen=false,showBeacons=true;
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
    const partners=window.EarthPartners?.list(sim.state,sim.active())||[];
    atlas.setBeacons?.(showBeacons?partners:[]);
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
    if($('commission-at-founding'))$('commission-at-founding').checked=false;
    if($('commission-brief'))$('commission-brief').open=false;
    if ($('found-name')) $('found-name').value='';
    if(fly) atlas.focus(point.lat,point.lon,1.6);
    atlas.setSelection(point);
    inspect();
    hideDialog('places-dialog');
    if (view !== 'world') setView('world');
  }
  function inspect() {
    const partner=selected.kind==='partner'&&sim.active()&&window.EarthPartners?.get(sim.state,sim.active(),selected.partnerId);
    const site=partner?null:known(selected);
    const partnerPanel=$('partner-inspector');if(partnerPanel){partnerPanel.hidden=!partner;partnerPanel.replaceChildren();}
    if(partner && partnerPanel){
      put('place-name',partner.name);put('place-type',partner.locality+' · Independent cooperative');
      put('place-coords',coords(partner));put('place-description',partner.interest);
      show('found-area',false);show('visit-button',false);show('voyage-console',false);
      partnerPanel.append(node('p','resident-line',partner.delegate+' · '+partner.relation),node('blockquote','partner-voice',partner.voice),
        node('p','action-description','Offers '+partner.exportGood+' · Needs '+partner.importGood+'. Local reserve '+partner.reserve+' · Surplus '+partner.surplus+'.'),
        node('p','action-cost',partner.status),node('p','voyage-note',partner.activity||''));
      for(const a of sim.actions('routes').filter(a=>a.partnerId===partner.partnerId))partnerPanel.append(actionRow(a));
      return;
    }
    const scenario=window.EarthCampaigns?.preview(selected)||window.EarthNavigation.scenario(selected);
    put('commission-title',scenario?.title);put('commission-step',scenario?.firstStep||scenario?.question);
    show('commission-brief',!!scenario);
    put('place-name',site?.name||selected.name);
    put('place-type',site ? (site.water?'Floating community':'Established community') :
      selected.region|| (selected.water?'Open water':'Landfall'));
    put('place-coords',coords(selected));
    put('place-description',site ? (site.population+' residents · '+site.era+'. Visit to meet the people who live here.') :
      (scenario ? 'Fictional opening · '+scenario.brief : '') || selected.caption || (selected.water ?
      'Found a floating community here. Its residents will depend on the food and supplies you can grow, recover or exchange.' :
      'Start a neighbourhood here. Meet its first residents and decide together what this place needs.'));
    show('found-area',!site); show('visit-button',!!site);
    if($('found-terms')){
      const offer=sim.foundingOffer?.(selected);
      put('found-terms',[offer?.reason,offer?.terms].filter(Boolean).join(' '));show('found-terms',!!sim.active()&&!site);
      $('found-button').disabled=offer?(!site&&!offer.available):false;
    }
    if($('found-button')) {
      const original=$('found-button').firstChild;
      if(original?.nodeType===Node.TEXT_NODE)original.nodeValue=selected.water?'Found a floating community ':'Found a community ';
    }
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
    if (next!=='world' && !sim.active()) return;
    if(next!=='street' && view==='street') {cancelPlacement();shiftStop=null;}
    view=next;
    document.body.dataset.mapView=view;
    const isStreet=view==='street',isWorld=view==='world',isCity=view==='city';
    show('atlas-stage',isWorld);show('street-stage',isStreet);show('street-controls',isStreet);show('city-stage',isCity);
    show('site-inspector',isWorld);show('actions-panel',isStreet);show('city-panel',isCity);
    for(const [id,isActive] of [['world-view',isWorld],['street-view',isStreet],['city-view',isCity]]) {
      if(!$(id))continue;
      $(id).setAttribute('aria-pressed',String(isActive));
      $(id).classList.toggle('active',isActive);
    }
    if(isStreet) {
      if(!street) street=window.EarthStreet.mount($('street-canvas'),{
        onInteract:interactAt,onPlace:placeBuilding,onHint:text=>put('street-hint',text),
        onState:state=>{
          put('street-location',state.nearby?.label||'Local district');
          const driving=state.mode==='drive';
          const vehicle=$('street-vehicle');
          if(vehicle) {
            vehicle.setAttribute('aria-pressed',String(driving));
            vehicle.textContent=driving?'Leave van':'Use van';
            vehicle.setAttribute('title',driving?'Leave the van':'Use the community van');
          }
          if(!state.placement && placement){placement=null;show('cancel-placement',false);renderActions();}
        }
      });
      put('street-title',sim.active().name);street.setSite(sim.active());
      requestAnimationFrame(()=>street.resize());
    } else if(isCity && window.EarthCity && $('city-map')) {
      if(!city)city=window.EarthCity.mount({mapRoot:$('city-map'),panel:$('city-panel'),sim,onStreet:()=>setView('street'),onResult:presentResult,onChange:render,onRehearse:planning?.compareCity});
      requestAnimationFrame(()=>city?.render());
    } else requestAnimationFrame(()=>atlas.resize());
    if(changed && matchMedia('(max-width: 760px)').matches) requestAnimationFrame(()=>$(isStreet?'street-stage':isCity?'city-stage':'atlas-stage').scrollIntoView({block:'start',behavior:'instant'}));
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
    const result=await sim.perform('found',{...selected},$('found-name').value.trim()||undefined,$('commission-at-founding')?.checked?'accept':'later');
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
      presentResult(await sim.perform('reclaim',plot,preview.buildingId));encounter=null;street.setSite(sim.active());render();
    },'action-button'),button('Keep building',renderActions,'text-button'));
  }
  function placeBuilding({plot}) {
    if(placement) applyAction(placement.id,plot);
  }
  function requestAction(action) {
    if(action.partner){applyAction(action.id);return;}
    if(action.group==='people' && action.residentId && !action.peerProject && encounter?.type==='resident' && !nearEncounter()){
      street.focusResident(action.residentId);notify('Returning to the resident to continue the conversation.');inView('street-stage');return;
    }
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
    const day=window.EarthShifts?.view(sim.active(),sim.state.week);
    if(day) {
      const stop=day.stops.find(s=>s.id===shiftStop && window.EarthShifts.matches(s.venue,event)) ||
        day.stops.find(s=>(s.available||s.current) && !s.visited && window.EarthShifts.matches(s.venue,event));
      if(stop && window.EarthShifts.matches(stop.venue,event)) {
        shiftStop=null;group='people';visiting=day.residentId;
        if(stop.current){renderActions();focusActions();return;}
        sim.perform('arriveShift',stop.id).then(result=>{presentResult(result);street.setSite(sim.active());render();focusActions();});return;
      }
    }
    if(event.type==='resident') {group='people';visiting=event.residentId;}
    else if(event.type==='market') group='work';
    else if(event.type==='building') group='build';
    else return;
    renderActions();
    focusActions();
  }
  function portrait(site,person) {
    const canvas=node('canvas','resident-portrait');canvas.width=48;canvas.height=48;
    canvas.setAttribute('aria-hidden','true');window.EarthStreet.portrait(canvas,site,person);return canvas;
  }
  function actionRow(a) {
    const card=node('article','action-card');
    const title=node('strong','action-label',a.label);
    const descriptor=node('p','action-description',a.description||'');
    const call=button(a.available?'Choose':'Unavailable',()=>requestAction(a),'action-button');
    call.disabled=!a.available;
    call.setAttribute('aria-label',a.label);call.dataset.action=a.id;
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
    const previous=list.contains(document.activeElement)?document.activeElement.dataset.action:null;
    if(previous)requestAnimationFrame(()=>{
      if(document.activeElement!==document.body && document.activeElement!==list)return;
      const retained=Array.from(list.querySelectorAll('button[data-action]')).find(b=>b.dataset.action===previous&&!b.disabled);
      (retained||$('actions-heading'))?.focus({preventScroll:true});
    });
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
        if(site.issue && councilPage==='agenda') notes.push(site.issue.title+' · Vote by week '+site.issue.deadline+'. '+site.issue.prompt);
        if(sim.state.charter && councilPage==='agenda') notes.push('Charter: '+sim.overview().charter.name+'. '+sim.overview().charter.text);
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
      const day=window.EarthShifts?.view(site,sim.state.week);
      if(day){renderShift(list,site,day);return;}
      const person=site.residents.find(r=>r.id===visiting);
      if(peers && window.EarthNeighbours){
        const work=window.EarthNeighbours.summary(site);
        put('actions-heading',work.title);
        list.append(button('← All residents',()=>{peers=false;renderActions();},'text-button'),node('p','action-description',work.body));
        const links=node('ul','peer-links');
        for(const pair of work.links){
          const link=node('li','',pair.names.join(' & ')+' · '+pair.status);
          if(pair.handover)link.append(node('small','peer-agreement',pair.handover));
          links.append(link);
        }
        list.append(links);
        for(const a of actions.filter(x=>x.peerProject))list.append(actionRow(a));
        if(work.history.length)list.append(node('p','resident-line',work.history[0].text));
        return;
      }
      if(!person) {
        list.append(node('p','action-description','Choose a resident to walk to their door. Their requests give you a place to start.'));
        for(const r of site.residents) {
          const item=node('article','action-card resident-card');
          if(window.EarthStreet.portrait)item.append(portrait(site,r));
          item.append(node('strong','action-label',r.name),node('p','action-description',r.role+' · '+r.value),
            button('Meet '+r.name.split(' ')[0],()=>{street.focusResident(r.id);if(street.getState().travelling){notify('On the way to '+r.name+'.');followStreet();}},'action-button'));
          list.append(item);
        }
        if(window.EarthNeighbours)list.append(button('Shared projects between neighbours →',()=>{peers=true;renderActions();},'secondary-button'));
        return;
      }
      list.append(button('← All residents',()=>{visiting=null;peers=false;encounter=null;renderActions();},'text-button'));
      put('actions-heading',person.name);
      const bio=node('div','resident-bio');
      if(window.EarthStreet.portrait)bio.append(portrait(site,person));
      bio.append(node('p','resident-line',person.role+' · '+person.value+' · Bond '+person.bond));list.append(bio);
      const delivery=(sim.actions('work')||[]).find(a=>a.id==='courier:deliver:'+person.id);
      if(delivery)list.append(actionRow(delivery));
      for(const a of actions.filter(a=>a.residentId===person.id||a.id.includes(':'+person.id)))list.append(actionRow(a));
      if(window.EarthShifts){
        const gate=window.EarthShifts.gate(sim.state,site,person.id);
        const card=node('article','action-card');
        card.append(node('strong','action-label','A day with '+person.name),node('p','action-description','Join their morning round. Decide how to fit paid work, care and their own plans into six hours.'));
        const b=button('Spend a day together',async()=>{
          if(!nearEncounter()){street.focusResident(person.id);notify('Meet '+person.name+' at home to start the day.');return;}
          if(presentResult(await sim.perform('beginShift',person.id))){street.setSite(sim.active());render();}
        },'action-button');b.disabled=!gate.available;if(!gate.available)card.append(node('small','action-reason',gate.reason));card.append(b);list.append(card);
      }
    } else {
      if(encounter?.type==='building'&&group==='build') {
        list.append(node('p','resident-line',encounter.label+' · Plot '+(encounter.plot+1)),button('Review dismantling',()=>confirmReclaim(encounter.plot),'text-button'));
      }
      if(group==='council' && window.EarthCampaigns) {
        const commission=window.EarthCampaigns.summary(sim.state,site);
        const legacy=window.EarthLegacy?.summary(sim.state,site);
        const pages=[['agenda','Agenda & charter'],['commission','Local commission']];
        if(legacy?.unlocked)pages.push(['legacy','Succession']);
        if(councilPage==='legacy'&&!legacy?.unlocked)councilPage='agenda';
        const choices=subnav(list,pages,councilPage,next=>{councilPage=next;renderActions();});
        if(choices==='agenda'&&sim.state.charter){
          const progress=window.EarthLegacy?.charterProgress?.(sim.state);
          if(progress){
            const details=node('details','charter-progress');details.open=progress.priority&&!progress.ratified;
            details.append(node('summary','','Charter progress'));
            for(const item of progress.rows){
              const row=node('div','charter-milestone');
              row.append(node('strong','',(item.met?'Met · ':'')+item.label),node('p','',item.detail));
              if(!item.met&&item.action)row.append(button(item.action.label,()=>followCharter(item.action),'text-button'));
              details.append(row);
            }
            list.append(details);
          }
        }
        if(choices==='legacy'){
          list.append(node('h3','',legacy.title),node('p','action-description',legacy.description));
          if(legacy.current)list.append(node('p','resident-line',legacy.current));
          if(legacy.comparison)list.append(node('p','action-description',legacy.comparison));
          for(const entry of legacy.decisions)list.append(node('p','action-description',entry));
          for(const archive of legacy.archives||[]){
            const history=node('details','shift-guide');history.append(node('summary','',archive.title));
            for(const entry of archive.lines)history.append(node('p','action-description',entry));list.append(history);
          }
        }
        if(choices==='commission'){
          list.append(node('h3','',commission.title),node('p','action-description',commission.brief),node('p','resident-line',commission.question));
          if(['active','ready','trial'].includes(commission.phase)){
            list.append(node('p','action-description',commission.requesters));
            const ms=node('ul','peer-links');
            for(const m of commission.milestones)ms.append(node('li','',(m.met?'Complete · ':'Open · ')+m.label+'. '+m.detail));
            list.append(ms,node('p','voyage-note',commission.support));
          }
          if(commission.reviewWeek)list.append(node('p','', 'Council review in week '+commission.reviewWeek+'.'));
          if(commission.outcome)list.append(node('p','resident-line',commission.outcome));
        }
        for(const a of actions.filter(a=>choices==='legacy'?a.legacy:choices==='commission'?a.campaign:!a.campaign&&!a.legacy))list.append(actionRow(a));
        return;
      }
      if(group==='research'&&window.EarthStrategy){
        const summary=window.EarthStrategy.summary(sim.state,site);
        subnav(list,[['eras','Eras'],['roster','Crews'],['schools','Schools']],researchPage,next=>{researchPage=next;renderActions();});
        if(researchPage==='roster'){
          const ul=node('ul','peer-links');
          for(const crew of summary.crews){
            const delta=crew.delta>0?'+'+crew.delta:String(crew.delta);
            ul.append(node('li','',crew.name+' · '+crew.count+' · '+crew.lead+'. '+crew.yield+' · Current change '+delta+' versus balanced.'));
          }
          list.append(ul,node('p','resident-line',summary.rotation));
        } else if(researchPage==='schools'){
          if(summary.lesson)list.append(node('p','resident-line',summary.lesson));
          for(const school of summary.schools)list.append(node('p','action-description',school.name+' · '+school.status+' '+school.effect));
          if(summary.schools.some(s=>s.id==='larder'&&['learned','operating'].includes(s.state)))list.append(node('p','action-cost','Larder reserve '+summary.reserve+' / 6 food.'));
        }
        const filtered=actions.filter(a=>researchPage==='eras'?!a.strategyKind:researchPage==='roster'?a.strategyKind==='roster':['study','exchange'].includes(a.strategyKind));
        for(const a of filtered)list.append(actionRow(a));
        if(!filtered.length && researchPage==='eras')list.append(node('p','empty-state','All local eras have been reached.'));
        return;
      }
      const availableActions=actions.filter(a=>!a.partner);
      if(group==='routes'&&window.EarthPartners){
        const near=window.EarthPartners.list(sim.state,site)[0];
        if(near)list.append(button('Meet independent neighbours on Earth',()=>choosePlace(near),'secondary-button'));
      }
      for(const action of availableActions)list.append(actionRow(action));
      if(!availableActions.length) {
        const text=group==='routes' ? (sim.state.sites.length>1?'All available partners are linked.':'Found a second community on the Earth atlas to plan an exchange.') : group==='research'?'This community has completed its research.':group==='council'?'The next agenda opens as weeks pass.':'More choices open as the community develops.';
        list.append(node('p','empty-state',text));
      }
    }
  }
  function subnav(parent,options,active,change) {
    const bar=node('div','action-subnav');bar.setAttribute('role','group');
    for(const [id,label] of options){const b=button(label,()=>change(id),'place-chip');b.setAttribute('aria-pressed',String(id===active));bar.append(b);}
    parent.append(bar);return active;
  }
  function renderShift(list,site,day) {
    put('actions-heading',day.title);
    list.append(node('p','resident-line',day.name+' · '+day.clock+' · '+day.timeLeft+' left'),node('p','action-description',day.brief),
      node('p','action-cost',day.householdLabel),node('p','action-description',day.priorityLabel));
    const guide=node('details','shift-guide');guide.append(node('summary','','How the day works'),node('p','',day.guide));list.append(guide);
    if(day.currentStopId){
      const current=day.stops.find(s=>s.id===day.currentStopId);
      list.append(node('h3','',current.label),node('p','action-description',current.detail));
      for(const option of day.choices){
        const card=node('article','action-card');
        card.append(node('strong','action-label',option.label),node('p','action-description',option.detail),node('small','action-cost',option.available?option.terms:option.reason));
        const b=button('Choose',async()=>{
          if(!street.atStop(current.venue)){shiftStop=current.id;street.focusStop(current.venue);notify('Returning to '+current.venueName+' together.');return;}
          if(presentResult(await sim.perform('chooseShift',option.id))){street.setSite(sim.active());render();}
        },'action-button');
        b.setAttribute('aria-label',option.label);b.disabled=!option.available;card.append(b);list.append(card);
      }
    }
    for(const stop of day.stops.filter(s=>!s.current)){
      const card=node('article','action-card');
      card.append(node('strong','action-label',stop.label),node('p','action-description',stop.venueName+' · '+stop.window+' · '+stop.arrival));
      if(!stop.visited) {
        const check=node('details','shift-guide');check.append(node('summary','','Plan this stop'));
        for(const option of stop.choices)check.append(node('p','action-description',option.label+' · '+(option.available?option.terms:option.reason)));
        card.append(check);
      }
      const b=button(stop.visited?'Visit completed':'Go together',()=>{
        shiftStop=stop.id;const ok=street.focusStop(stop.venue);
        if(!ok){shiftStop=null;notify('Choose another approach to this venue.',true);}else inView('street-stage');
      },'action-button');
      b.setAttribute('aria-label','Visit '+stop.label);b.disabled=!stop.available;
      if(!stop.available)card.append(node('small','action-reason',stop.reason));card.append(b);list.append(card);
    }
    if(day.history.length)list.append(node('p','resident-line',day.history.map(item=>item.clock+' · '+item.label).join(' / ')));
    list.append(button(day.finishLabel,async()=>{
      if(presentResult(await sim.perform('finishShift'))){shiftStop=null;street.setSite(sim.active());render();}
    },'secondary-button'));
  }
  async function followCharter(step) {
    if(!step)return;
    const target=sim.state.sites.find(s=>s.id===step.siteId);
    if(target && target.id!==sim.state.activeId){
      await openSite(target);
      if(sim.state.activeId!==target.id)return;
    }
    if(step.kind==='atlas'){setView('world');$('places-open')?.click();return;}
    if(view!=='street')setView('street');
    if(step.kind==='resident'){
      selectGroup('people');street.focusResident(step.residentId);followStreet();return;
    }
    if(step.group==='council')councilPage='agenda';
    if(step.group==='research')researchPage='eras';
    selectGroup(step.group||'council');
    const control=Array.from($('actions-list').querySelectorAll('[data-action]')).find(row=>row.dataset.action===step.actionId);
    if(!control){focusActions();return;}
    const card=control.closest('article')||control;
    card.tabIndex=-1;card.focus({preventScroll:true});card.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function nextObjective() {
    const site=sim.active();if(!site)return null;
    const heard=site.residents.filter(r=>r.heard),waiting=site.residents.find(r=>r.promise);
    const meet=person=>{
      if(view!=='street')setView('street');
      selectGroup('people');street.focusResident(person.id);followStreet();
    };
    const open=target=>{if(view!=='street')setView('street');selectGroup(target);focusActions();};
    const charter=window.EarthLegacy?.charterProgress?.(sim.state);
    if(sim.state.completed&&window.EarthLegacy)return {label:'Review council succession',action:()=>{councilPage='legacy';open('council');}};
    if(charter?.priority&&charter.next)return {label:charter.next.label,detail:charter.summary,action:()=>followCharter(charter.next)};
    if(!heard.length)return {label:'Meet '+site.residents[0].name,action:()=>meet(site.residents[0])};
    if(!site.stats.kept){
      const person=waiting||heard[0];
      return {label:waiting?'Review your promise to '+person.name:'Discuss a promise with '+person.name,action:()=>meet(person)};
    }
    if(!sim.state.charter)return {label:'Visit the council',action:()=>{councilPage='agenda';open('council');}};
    if(site.tech.length<3){
      const research=sim.actions('research').find(a=>a.id.startsWith('research:'));
      if(research?.id==='research:apprenticeship'&&!site.buildings.some(b=>['workshop','hall'].includes(b.kind)))
        return {label:'Review community buildings',action:()=>open('build')};
      if(research?.id==='research:exchange'&&!sim.state.routes.some(r=>[r.from,r.to].includes(site.id))) {
        if(sim.state.sites.length>1)return {label:'Open the route desk',action:()=>open('routes')};
        return {label:'Find a second home on Earth',action:()=>{setView('world');$('places-open')?.click();}};
      }
      return {label:'Open research',action:()=>{researchPage='eras';open('research');}};
    }
    return {label:'Review the network charter',action:()=>{councilPage='agenda';open('council');}};
  }
  const resourceLabels={funds:'Funds',materials:'Materials',food:'Food',population:'Residents',trust:'Trust',wellbeing:'Wellbeing'};
  function render() {
    const site=sim.active(), overview=sim.overview(), state=sim.state;
    put('action-budget',site ? state.effort+' effort · '+site.funds+' funds · '+site.materials+' materials · '+site.food+' food' : '');
    put('week','Week '+state.week);put('effort',state.effort+' / '+window.CommonEarthSim.maxEffort);put('objective',overview.objective);
    put('era',overview.era||site?.era||'');put('forecast',overview.forecast);
    show('settlement-status',!!site);$('advance-week').disabled=!site;$('street-view').disabled=!site;
    if($('city-view'))$('city-view').disabled=!site;
    if($('beacon-toggle'))$('beacon-toggle').disabled=!site;
    const guide=nextObjective();if(guide){put('objective-action',guide.label);if(guide.detail)put('objective',guide.detail);}show('objective-action',!!guide);show('follow-objective',!!guide);
    if($('society-open')) $('society-open').disabled=!site;
    const resources=$('resource-strip');
    resources.replaceChildren();
    if(site) for(const [key,label] of Object.entries(resourceLabels)){
      const metric=node('div','resource');metric.append(node('span','resource-label',label),node('strong','resource-value',site[key]));resources.append(metric);
    }
    show('week-review-open',!!sim.lastWeek?.());
    if(sheetOpen('society-dialog'))renderSociety();
    if(sheetOpen('journal-dialog'))renderRecords();
    if(view==='world'){inspect();markers();}
    renderActions();renderForecast();planning?.render();
    show('goal-details',!!site && !!learning);learning?.render();
    if(view==='city')city?.render();
  }
  function sheetOpen(id){
    const sheet=$(id);
    return !!sheet && (sheet.classList.contains('sheet-fallback') || (typeof HTMLElement.prototype.showPopover==='function' && sheet.matches(':popover-open')));
  }
  function renderSociety(){
    const state=sim.state;
    $('site-list').replaceChildren(...state.sites.map(s=>{
      const b=button('',()=>openSite(s),'site-entry');
      b.append(node('strong','',s.name),node('small','',s.region+' · '+s.population+' residents'));return b;
    }));
    if($('route-status')){
      const routes=state.routes.map(r=>{
        const from=state.sites.find(s=>s.id===r.from),to=state.sites.find(s=>s.id===r.to);
        const item=node('article','route-entry');
        item.append(node('strong','',from.name+' ↔ '+to.name),node('p','',r.lastStatus));return item;
      });
      $('route-status').replaceChildren(...routes);
    }
    const partners=window.EarthPartners?.list(state,sim.active())||[];
    const panel=$('partner-list');
    if(panel){
      panel.replaceChildren();
      if(partners.length){
        panel.append(node('h3','','Independent neighbours'));
        for(const p of partners){
          const b=button('',()=>{hideDialog('society-dialog');choosePlace(p);},'site-entry');
          b.append(node('strong','',p.name),node('small','',p.locality+' · '+p.distanceKm.toLocaleString()+' km · '+p.relation));panel.append(b);
        }
      }
    }
  }
  function renderRecords(){
    if(!$('records-views'))return;
    for(const b of controls($('records-views'),'[data-records]')){
      const active=b.dataset.records===recordsPage;b.setAttribute('aria-pressed',String(active));
      show('records-'+b.dataset.records,active);
    }
    const latest=sim.lastWeek?.();
    show('week-review-open',!!latest);
    if(recordsPage==='review'){
      const panel=$('records-review');panel.replaceChildren();
      if(!latest){panel.append(node('p','empty-state','Advance a week to see its outcome here.'));return;}
      panel.append(node('h3','','Week '+latest.week+' in review'));
      for(const item of latest.sites){
        const d=node('details','week-report-site');d.open=item.id===sim.state.activeId;
        d.append(node('summary','',item.name));
        const metrics=node('dl','report-ledger');
        for(const [key,label] of Object.entries(resourceLabels)){
          const delta=item.delta[key]||0;metrics.append(node('dt','',label),node('dd','',item.closing[key]+' ('+(delta>0?'+':'')+delta+')'));
        }
        d.append(metrics);
        if(item.arrivals||item.departures)d.append(node('p','action-cost',item.arrivals+' shipment arrivals · '+item.departures+' departures.'));
        for(const line of item.highlights)d.append(node('p','action-description',line));
        if(item.totalEvents>item.highlights.length)d.append(node('small','', 'More entries are recorded under Events.'));
        panel.append(d);
      }
      return;
    }
    if(recordsPage==='saves'){savedWorlds?.refresh();return;}
    if(recordsPage!=='events')return;
    show('journal-filter-label',sim.state.sites.length>1);
    const filter=$('journal-filter');
    if(!sim.state.sites.some(s=>s.id===journalFilter))journalFilter='all';
    const choices=[['all','All communities'],...sim.state.sites.map(s=>[s.id,s.name])];
    if(choices.length!==filter.options.length||choices.some(([id,name],i)=>filter.options[i]?.value!==id||filter.options[i]?.text!==name)){
      filter.replaceChildren(...choices.map(([id,name])=>{const o=node('option','',name);o.value=id;return o;}));
    }
    filter.value=journalFilter;
    const entries=sim.state.journal.filter(e=>journalFilter==='all'||e.siteId===journalFilter);
    $('journal-list').replaceChildren(...entries.slice(0,journalLimit).map(entry=>{
      const e=node('li','journal-entry');
      const place=sim.state.sites.find(s=>s.id===entry.siteId);
      e.append(node('small','','Week '+entry.week+(place&&sim.state.sites.length>1?' · '+place.name:'')),node('p','',entry.text));return e;
    }));
    if(!entries.length)$('journal-list').append(node('li','empty-state','No events recorded here yet.'));
    show('earlier-events',entries.length>journalLimit);
  }
  listen('records-views','click',e=>{
    const b=e.target.closest('[data-records]');if(b){recordsPage=b.dataset.records;renderRecords();}
  });
  listen('society-open','click',renderSociety);
  listen('journal-dialog','toggle',e=>{if(e.newState==='open'&&recordsPage==='saves')savedWorlds?.refresh();});
  listen('journal-open','click',()=>{renderRecords();if(recordsPage==='saves')requestAnimationFrame(()=>savedWorlds?.refresh());});
  listen('journal-filter','change',()=>{journalFilter=$('journal-filter').value;journalLimit=20;renderRecords();});
  listen('earlier-events','click',()=>{journalLimit+=30;renderRecords();});
  listen('week-review-open','click',()=>{recordsPage='review';renderRecords();});
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
  for(const id of ['objective-action','follow-objective'])listen(id,'click',()=>nextObjective()?.action());
  listen('beacon-toggle','change',()=>{showBeacons=$('beacon-toggle').checked;markers();});
  listen('street-wide','click',()=>{
    const expanded=document.body.classList.toggle('street-expanded');
    const control=$('street-wide');
    control.setAttribute('aria-pressed',String(expanded));
    control.title=expanded?'Restore street view':'Expand street view';
    requestAnimationFrame(()=>{
      street?.resize();
      if(expanded)$('street-stage')?.scrollIntoView({block:'start',behavior:'instant'});
    });
  });
  listen('world-view','click',()=>setView('world'));
  listen('street-view','click',()=>setView('street'));
  listen('city-view','click',()=>setView('city'));
  listen('visit-button','click',()=>openSite(known(selected)));
  listen('found-button','click',e=>{e.preventDefault();found();});
  listen('found-name','keydown',e=>{if(e.key==='Enter'){e.preventDefault();found();}});
  listen('zoom-in','click',()=>atlas.zoomBy(1.45));listen('zoom-out','click',()=>atlas.zoomBy(1/1.45));
  listen('recenter','click',()=>atlas.focus(selected.lat,selected.lon,1));
  listen('advance-week','click',async()=>{if(presentResult(await sim.perform('advance'))){cancelPlacement();street?.setSite(sim.active());render();}});
  listen('action-tabs','click',e=>{const target=e.target.closest('[data-group]');if(target)selectGroup(target.dataset.group);});
  listen('street-interact','click',()=>street?.interact());listen('street-vehicle','click',()=>street?.toggleVehicle());
  const heldDirections=new Map();
  listen('street-controls','pointerdown',e=>{
    const b=e.target.closest('[data-move]');if(!b||!street||e.button!==0)return;
    if(!street.holdMove)return;
    e.preventDefault();b.setPointerCapture(e.pointerId);heldDirections.set(e.pointerId,b.dataset.move);
    street.holdMove(b.dataset.move);
  });
  function releasePad(e){
    const dir=heldDirections.get(e.pointerId);if(!dir)return;
    heldDirections.delete(e.pointerId);street?.releaseMove(dir);
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen('street-controls',event,releasePad);
  listen('street-controls','click',e=>{
    const b=e.target.closest('[data-move]');if(b&&(!street?.holdMove||e.detail===0))street?.move(b.dataset.move);
  });
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
    if(notice.switched){
      journalFilter='all';journalLimit=20;
      street?.destroy();street=null;city?.destroy();city=null;group='people';researchPage='eras';councilPage='agenda';
      selected=sim.active()?{...sim.active()}:start;planOpen=false;reportOpen=false;shiftStop=null;
      setView('world');atlas.focus(selected.lat,selected.lon,1);put('action-outcome','');show('action-outcome',false);
    }
    cancelPlacement();visiting=null;peers=false;encounter=null;
    if(!sim.active()){selected=start;setView('world');}
    else {street?.setSite(sim.active());render();}
    if(notice.message)notify(notice.message);
  });
  setView('world');
})();
