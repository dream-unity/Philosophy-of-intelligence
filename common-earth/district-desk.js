/* The atlas and the Street directory read the same settlements the calendar advances.
   Watching uses a detached scene. Only a journey can move the original resident. */
(function(root){
  'use strict';
  const findTown=(world,id)=>world.sites.find(s=>s.id===id)||world.communityLife?.outposts.find(s=>s.id===id);
  const funds=n=>n+' '+(n===1||n===1n?'fund':'funds');
  function mount({sim,hud,street,enterStreet,travel,redraw,notify,inspectWork,buildingAction,openTownCentre}){
    const doc=root.document,$=id=>doc.getElementById(id);
    const el=(tag,value,css)=>{const item=doc.createElement(tag);if(value!=null)item.textContent=value;if(css)item.className=css;return item;};
    function btn(label,run){const b=el('button',label);b.type='button';b.addEventListener('click',run);return b;}
    function options(field,items,value){field.replaceChildren(...items.map(([key,label])=>{const o=el('option',label);o.value=key;return o;}));field.value=value;}
    function text(id,value){const field=$(id);if(field.textContent!==value)field.textContent=value;}
    const near=()=>root.EarthCommunityLife.neighbours(sim.state,sim.active());
    let directoryKey='',atlasWorld=null,scene=null,watchedId=null,watchedFrom=null,sceneKey='',selectedId='',observedWeek=0;
    const observer=$('district-observer'),selector=$('observer-person'),canvas=$('observer-canvas');
    let pointInspector=null,housing=null;
    const observerGoals=$('observer-goals');let observerGoalsKey='';
    function renderObservedGoals(){
      const world=sim.state,site=watchedId&&findTown(world,watchedId);
      if(!site||!observerGoals?.open)return;
      const key=[sceneKey,selectedId].join('/');if(observerGoalsKey===key)return;observerGoalsKey=key;
      const report=$('observer-goal-report'),need=hud.observeNeed(site);
      report.replaceChildren(el('h3','Town goal'),el('p',need.detail));
      if(!selectedId)return;
      const person=root.EarthPersonas.profile(site,selectedId),intent=root.EarthAutonomy.view(site,world,selectedId);
      if(!person||!intent)return;
      report.append(el('h3',person.name+'’s aim'),el('p',intent.dream?.title||intent.goal));
      const impact=root.EarthInterdependence.exchange(site,world,selectedId);
      if(impact.town)report.append(el('p','What this resident needs · '+impact.town));
      if(impact.person)report.append(el('p','What this resident contributes · '+impact.person));
    }
    observerGoals?.addEventListener('toggle',renderObservedGoals);
    function activity(snapshot){
      selectedId=snapshot?.id||'';
      if(selector.value!==selectedId)selector.value=selectedId;
      text('observer-activity',snapshot?[snapshot.name,snapshot.label].filter(Boolean).join(' · '):'Town overview');
      text('observer-purpose',snapshot?[...new Set([snapshot.venue,snapshot.assignment,snapshot.goal,snapshot.completedSession&&'Earlier this week · '+snapshot.completedSession].filter(Boolean))].join(' · '):'');
      renderObservedGoals();
    }
    function close(focus=false){
      pointInspector?.clear();
      if(!watchedId)return;
      watchedId=null;watchedFrom=null;selectedId='';sceneKey='';
      observerGoals.open=false;observerGoalsKey='';
      scene?.destroy();scene=null;observer.hidden=true;delete doc.body.dataset.observingTown;ribbon();
      doc.dispatchEvent(new Event('earthobserverchange'));
      if(focus){street()?.resize();$('scene-open-neighbours').focus({preventScroll:true});}
    }
    function syncObserved(force=false){
      const world=sim.state,site=findTown(world,watchedId),home=sim.active();
      if(!site||!home){close();return;}
      // The Street renderer owns its own caches. Refresh with the town after a
      // calendar turn, a migration or physical construction completing.
      const works=(site.construction||[]).map(j=>[j.id,j.phase,j.workers?.length].join('/')).join('|');
      const stamp=[site.id,world.week,world.actionRevision,site.foundingRevision,site.buildings.length,works].join(':');
      if(!force&&sceneKey===stamp)return;
      sceneKey=stamp;observedWeek=world.week;
      const wanted=selectedId;
      const copy=typeof root.structuredClone==='function'?root.structuredClone(site):JSON.parse(JSON.stringify(site));
      scene.setSite(copy);
      const shift=root.EarthConstruction?.view(copy,world);
      if(shift)scene.setConstruction(shift);
      const people=root.EarthPersonas.list(copy).filter(p=>scene.activityOf(p.id));
      const id=people.some(p=>p.id===wanted)?wanted:'';
      options(selector,[['','Whole town'],...people.map(p=>[p.id,p.name+' · '+(root.EarthCareers.role(copy,p.id)||p.role)])],id);
      text('observer-title',site.name+' · '+site.era);text('observer-from',home.name);
      if($('observer-reception'))text('observer-reception',root.EarthCommunityLife.communityCharacter?.(site)?.summary||'');
      text('observer-town-goal',hud.observeNeed(site).label);
      if(id&&scene.observePerson(id))activity(scene.activityOf(id));
      else{
        activity(null);
        text('observer-purpose',site.population+' residents · '+site.food+' food in public stores · Week '+world.week);
      }
      $('observer-travel').disabled=!near().some(s=>s.id===site.id);
    }
    function watch(id,resume=null){
      const site=findTown(sim.state,id),origin=sim.active();
      if(!site||!origin)return false;
      shutLedger();close();enterStreet();hud.close(false);
      watchedId=id;watchedFrom=origin.id;observer.hidden=false;
      doc.body.dataset.observingTown='true';selectedId=resume?.person||'';sceneKey='';
      doc.dispatchEvent(new Event('earthobserverchange'));
      try{
        scene=root.EarthStreet.mount(canvas,{spectator:true,getWeek:()=>observedWeek,getWorld:()=>sim.state,onObservation:activity});
        syncObserved(true);scene.resize();
        const camera=resume?.camera,here=scene.regionalCamera?.();
        if(camera&&here&&camera.originId===here.originId&&camera.siteId===site.id&&
          Number.isFinite(camera.x)&&Number.isFinite(camera.y)&&Number.isFinite(camera.zoom)){
          scene.setExploration?.(camera.exploration);
          scene.inspectRegion?.(camera.x,camera.y,{zoom:camera.zoom,picked:false});
        }
        ribbon();
        if(!resume){observer.scrollIntoView({block:'nearest'});selector.focus({preventScroll:true});}
        return true;
      }catch(error){close(true);notify('These streets could not be drawn. You can still travel here through Towns.',true);return false;}
    }
    function snapshot(){
      const target=watchedId&&findTown(sim.state,watchedId);
      if(!target)return null;
      return {from:watchedFrom,to:target.id,founded:target.founded,revision:target.foundingRevision||0,person:selectedId,camera:selectedId?null:scene?.regionalCamera?.()||null};
    }
    function restore(saved){
      if(!saved||typeof saved.to!=='string'||saved.from!==sim.active()?.id)return false;
      const target=findTown(sim.state,saved.to);
      if(!target||target.founded!==saved.founded||(target.foundingRevision||0)!==saved.revision)return false;
      return watch(target.id,saved);
    }
    function refreshWork(siteIds){
      if(!scene||!watchedId||!siteIds?.includes(watchedId))return;
      const keyBefore=sceneKey;syncObserved();
      if(scene&&keyBefore===sceneKey){
        const town=findTown(sim.state,watchedId),shift=town&&root.EarthConstruction?.view(town,sim.state);
        if(shift)scene.setConstruction(shift);
      }
    }
    selector.addEventListener('change',()=>{
      if(!scene)return;
      if(selector.value){if(!scene.observePerson(selector.value))syncObserved(true);}
      else{scene.observePerson(null);scene.recenter();activity(null);syncObserved(true);}
    });
    $('observer-close').addEventListener('click',()=>close(true));
    observer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);}});
    $('observer-travel').addEventListener('click',()=>{const id=watchedId;close();if(id)travel(id);});

    function atlasDirectory(show){
      const panel=$('atlas-districts'),site=sim.active(),world=sim.state;
      panel.hidden=!show||!site||!world.communityLife;
      if(panel.hidden)return;
      const stamp=[site.id,world.week,site.foundingRevision,world.actionRevision,world.sites.length,world.communityLife.outposts.length].join('/');
      if(stamp===directoryKey&&atlasWorld===world)return;directoryKey=stamp;atlasWorld=world;
      const rows=near(),host=$('atlas-district-list');
      if(!rows.length){panel.hidden=true;return;}
      const keeps=doc.activeElement?.dataset.districtCommand,expanded=host.querySelector('details')?.open;
      function districtRow(town){
        const site=findTown(world,town.id),row=el('article',null,'atlas-district-row');
        const description=el('div');description.append(el('strong',town.name),el('small',town.distance.toFixed(1)+' km · '+site.population+' residents · '+(town.rooms?town.rooms+' open beds':'housing full')));
        const character=root.EarthCommunityLife.communityCharacter?.(site);
        if(character)description.append(el('small',character.summary));
        const watchButton=btn('See streets',()=>watch(town.id)),go=btn('Travel',()=>travel(town.id));
        watchButton.setAttribute('aria-label','See streets in '+town.name);go.setAttribute('aria-label','Travel to '+town.name);
        watchButton.dataset.districtCommand='watch-'+town.id;go.dataset.districtCommand='travel-'+town.id;
        row.append(description,watchButton,go);return row;
      }
      host.replaceChildren(...rows.slice(0,4).map(districtRow));
      if(rows.length>4){
        const more=el('details',null,'atlas-more-streets'),list=el('div');let built=false;
        more.append(el('summary','More destinations · '+(rows.length-4)),list);
        const fill=()=>{if(more.open&&!built){list.replaceChildren(...rows.slice(4).map(districtRow));built=true;}};
        more.addEventListener('toggle',fill);more.open=!!expanded;fill();host.append(more);
      }
      if(keeps&&!doc.activeElement?.dataset.districtCommand)Array.from(host.querySelectorAll('button')).find(b=>b.dataset.districtCommand===keeps)?.focus({preventScroll:true});
    }
    const ledger=$('district-ledger'),ledgerBody=$('district-ledger-body');
    let ledgerPage='',ledgerStamp='',accountChoice='',marketPanel=null;
    let developmentSelection={},developmentTown=null;
    function openDevelopment(town=null,selection={}){
      if(!root.EarthDevelopmentLedger)return;
      developmentTown=town?.id||null;developmentSelection=selection;
      if(ledgerPage!=='development')selectLedger('development');
      else{ledgerStamp='';drawLedger();}
      ledgerBody.scrollTop=0;
    }
    if(root.EarthDevelopmentLedger){
      const sceneLink=btn('Development ledger',()=>{openDevelopment();ledger.scrollIntoView({block:'nearest'});});
      sceneLink.className='development-shortcut';$('scene-stores')?.prepend(sceneLink);
    }
    function personalAccount(){
      const site=sim.active();
      return {site,id:root.EarthAgency.actorId(site)};
    }
    function inspectedStores(){
      const world=sim.state;
      if(pointInspector?.openGround())return findTown(world,world.communityLife?.homeId)||sim.active();
      return pointInspector?.town()||findTown(world,watchedId)||sim.active();
    }
    function ribbon(){
      const site=sim.active(),shown=inspectedStores();
      housing?.refresh();
      $('stores-ribbon').hidden=!site;
      if(!site){shutLedger();return;}
      const account=personalAccount(),person=root.EarthPersonas.profile(account.site,account.id);
      text('ribbon-caption',pointInspector?.openGround()?'Home stores':'Public stores');text('ribbon-town',shown.name);text('ribbon-person',person?.name||'Original resident');
      for(const key of ['food','materials'])text('ribbon-'+key,String(shown[key]));
      text('ribbon-funds',funds(shown.funds));text('ribbon-treasury-town',shown.name);
      const cash=account.id==='steward'&&sim.state.communityLife
        ?root.EarthAgency.originalAccounts(sim.state).reduce((total,purse)=>total+BigInt(purse.balance),0n)
        :(account.site.purses?.people?.[account.id]?.balance||0);
      text('ribbon-balance',funds(cash));
      $('ribbon-treasury').setAttribute('aria-label',shown.name+' community treasury, '+funds(shown.funds));
      $('ribbon-resources').title='Inspect stores in '+shown.name;
      $('ribbon-personal').title='Compare household accounts';
      if(ledgerPage)drawLedger();
    }
    const triggers={stock:'ribbon-resources',development:'ribbon-resources',purse:'ribbon-personal',treasury:'ribbon-treasury'};
    function markLedger(){
      for(const id of ['ribbon-resources','ribbon-treasury','ribbon-personal'])
        $(id).setAttribute('aria-expanded',String(id===triggers[ledgerPage]));
    }
    function shutLedger(focus=false){
      if(!ledgerPage)return;
      const trigger=$(triggers[ledgerPage]);
      ledgerPage='';ledgerStamp='';ledger.hidden=true;ledgerBody.replaceChildren();
      markLedger();
      if(focus)trigger.focus({preventScroll:true});
    }
    function openMarket(page,id){
      shutLedger();close();enterStreet();
      if(!hud.openTool('stores'))return;
      if(page==='resources')marketPanel?.openResources(id);
      if(page==='purse')marketPanel?.openPurse();
    }
    function selectLedger(page){
      if(ledgerPage===page){shutLedger(true);return;}
      ledgerPage=page;ledgerStamp='';accountChoice='';ledger.hidden=false;
      markLedger();
      ledgerBody.scrollTop=0;
      drawLedger();$('district-ledger-title').focus({preventScroll:true});
    }
    $('ribbon-resources').addEventListener('click',()=>selectLedger('stock'));
    $('ribbon-treasury').addEventListener('click',()=>selectLedger('treasury'));
    $('ribbon-personal').addEventListener('click',()=>selectLedger('purse'));
    $('district-ledger-close').addEventListener('click',()=>shutLedger(true));
    ledger.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();shutLedger(true);}});

    let priceTown='',stockTown='',comparePrices=false;
    function stockList(site,mine){
      const world=sim.state,market=root.EarthMarket.view(world,site),local=market.local;
      if(stockTown!==site.id){stockTown=site.id;priceTown='';comparePrices=false;}
      const modes=el('div',null,'ledger-modes');
      function refreshFrom(control){
        if(!control.isConnected||ledgerPage!=='stock')return false;
        ledgerStamp='';drawLedger();return true;
      }
      for(const [label,showPrices] of [['Stock and renewal',false],['Compare market prices',true]]){
        const control=btn(label,()=>{
          if(!control.isConnected||comparePrices===showPrices)return;
          comparePrices=showPrices;
          if(refreshFrom(control))ledgerBody.querySelector('.ledger-mode-current')?.focus({preventScroll:true});
        });
        control.setAttribute('aria-pressed',String(comparePrices===showPrices));
        if(comparePrices===showPrices)control.className='ledger-mode-current';
        modes.append(control);
      }
      ledgerBody.append(modes);
      if(comparePrices){
        const peers=(root.EarthCommunityLife?.neighbours(world,site)||[]).filter(p=>p.distance<=70);
        if(!peers.some(p=>p.id===priceTown))priceTown='';
        const peer=priceTown&&findTown(world,priceTown),remote=peer&&root.EarthMarket.view(world,peer),other=remote?.local;
        const picker=el('select',null,'ledger-price-town'),label=el('label','Compare with');
        options(picker,[['','This district only'],...peers.map(p=>[p.id,p.name+' · '+Math.round(p.distance)+' km'])],priceTown);
        picker.addEventListener('change',()=>{
          if(!picker.isConnected)return;
          priceTown=picker.value;
          if(refreshFrom(picker))ledgerBody.querySelector('.ledger-price-town')?.focus({preventScroll:true});
        });
        label.append(picker);if(peers.length)ledgerBody.append(label);
        ledgerBody.append(el('p','Prices are in funds per lot from each district’s own bins and treasury. Each sale can change the next quote. Freight, travel time and losses in transit are separate.'));
        const table=el('table',null,'ledger-prices'),head=el('thead'),header=el('tr'),body=el('tbody');
        const resourceHeading=el('th','Resource');resourceHeading.scope='col';header.append(resourceHeading);
        for(const [town,shop,survey] of [[site,market,local],...(peer?[[peer,remote,other]]:[])]){
          const th=el('th');th.scope='col';th.append(el('strong',town.name),el('small',survey.season+' · '+funds(shop.till)+' in merchant till'));header.append(th);
        }
        head.append(header);
        const here=new Map(local.prices.map(p=>[p.id,p])),there=new Map((other?.prices||[]).map(p=>[p.id,p]));
        function quoteCell(prices){
          const cell=el('td');
          if(!prices){cell.textContent='No local listing';return cell;}
          for(const [key,label] of [['bid','Pays'],['ask','Asks']]){
            const offer=prices[key],line=el('span',null,'ledger-price-line');
            line.append(el('strong',label+' '+offer.price));
            if(!offer.available){line.className+=' ledger-price-blocked';line.append(el('small',' · '+offer.reason));}
            else line.append(el('small',' · '+offer.lots+(key==='bid'?' in public bins':' on shelf')));
            if(offer.expires!=null)line.append(el('small',' · Expires wk '+offer.expires));
            cell.append(line);
          }
          return cell;
        }
        for(const id of new Set([...here.keys(),...there.keys()])){
          const mine=here.get(id),theirs=there.get(id),row=el('tr'),name=el('th',(mine||theirs).name);
          name.scope='row';row.append(name,quoteCell(mine));if(peer)row.append(quoteCell(theirs));body.append(row);
        }
        table.append(head,body);const wrap=el('div',null,'ledger-table-wrap');wrap.append(table);ledgerBody.append(wrap);return;
      }
      const caption=el('p',local.habitat+' · '+local.season+' · '+local.mealNeed+' food needed for the next weekly household share.');
      const table=el('table'),head=el('thead'),titles=el('tr'),body=el('tbody');
      ['Resource','Local supply','Public bins','Merchant','Renewal'].forEach(t=>{const th=el('th',t);th.scope='col';titles.append(th);});head.append(titles);
      for(const item of local.rows){
        const row=el('tr'),name=el('th');name.scope='row';
        if(mine)name.append(btn(item.name,()=>openMarket('resources',item.id)));else name.textContent=item.name;
        const supply=item.local?item.standing+' / '+item.cap:'Imported';
        const renewal=!item.local?'Trade':item.reopens?'Resting until week '+item.reopens:item.caredThrough?'Soil care through week '+item.caredThrough:item.finite?'Finite deposit':item.renew?'Up to '+item.renew+'/wk':'Seasonal rest';
        row.append(name,el('td',supply),el('td',String(item.owned)),el('td',String(item.shelf)),el('td',renewal));body.append(row);
      }
      const fish=root.EarthFisheries?.ground(site,world.week);
      if(fish){
        const row=el('tr'),name=el('th');name.scope='row';
        if(mine)name.append(btn('Fresh catch',()=>{shutLedger();close();enterStreet();hud.openTool('fishing');}));else name.textContent='Fresh catch';
        row.append(name,el('td',fish.available+' / '+fish.capacity),el('td','Pantry'),el('td','—'),el('td','Up to '+fish.recovery+'/wk'));body.append(row);
      }
      table.append(head,body);
      const wrap=el('div',null,'ledger-table-wrap');wrap.append(table);
      ledgerBody.append(caption,wrap);
      if(local.loss)ledgerBody.append(el('p','Lost in storage this week · '+local.loss));
      if(mine)ledgerBody.append(btn('Visit the exchange',()=>openMarket('trade')));
      else ledgerBody.append(el('p',site.name+' decides how to harvest and trade these supplies.'));
    }
    function treasury(site){
      text('district-ledger-title',site.name+' · Community funds');
      ledgerBody.append(el('h3','Treasury balance · '+funds(site.funds)),
        el('p',site.name+' uses this account for recruitment, public works and trade. Residents keep their work income in their personal purses.'));
      if(openTownCentre)ledgerBody.append(btn('Open Town Centre recruitment',()=>openTownCentre(site.id)));
      const arrivals=site.communityLife?.townCentre?.arrivals||[];
      if(arrivals.length){
        ledgerBody.append(el('h3','Recent recruitment payments'));
        const list=el('ul');
        for(const row of arrivals)list.append(el('li','Week '+row.week+' · '+row.name+' · '+(row.price?'Search fee −'+funds(row.price):'Free invitation')));
        ledgerBody.append(list);
      }
      const history=site.growth?.history||[];
      if(history.length){
        ledgerBody.append(el('h3','Recent production rounds'));
        const list=el('ul');
        for(const row of history.slice(0,4))list.append(el('li','Round '+row.round+' · Treasury change '+(row.funds>0?'+':'')+funds(row.funds)+' · Workers received '+funds(row.wages)));
        ledgerBody.append(list);
      }
    }
    function accounts(site){
      const world=sim.state,own=personalAccount(),people=root.EarthPersonas.list(site);
      const originalHome=findTown(world,world.communityLife?.homeId)||sim.active();
      const choices=new Map();
      const add=(s,id,label)=>{
        const key=JSON.stringify([s.id,id]),p=root.EarthPersonas.profile(s,id);
        if(p&&!choices.has(key))choices.set(key,{site:s,id,p,label:label?label+' · '+p.name:p.name});
        return key;
      };
      const defaultKey=add(own.site,own.id,'Current perspective · '+own.site.name);
      add(originalHome,'steward','Original resident · '+originalHome.name);
      for(const town of root.EarthAgency.originalDistricts(world)){
        if(town.purses?.people?.steward)add(town,'steward',town.name);
      }
      for(const p of people){
        if(p.id==='steward'&&site.id===originalHome.id)continue;
        add(site,p.id);
      }
      if(!choices.has(accountChoice))accountChoice=defaultKey;
      const {site:town,id,p}=choices.get(accountChoice);
      const field=el('select'),picker=el('label','Resident account');field.id='ledger-person';
      options(field,[...choices].map(([key,val])=>[key,val.label]),accountChoice);
      field.addEventListener('change',()=>{accountChoice=field.value;ledgerStamp='';drawLedger();$('ledger-person')?.focus({preventScroll:true});});picker.append(field);
      const balance=town.purses?.people?.[id],goods=root.EarthResidentShops?.view(world,town,p,false);
      const status=el('p',town.name+' · '+funds(balance?.balance||0)+' available · '+funds(balance?.earned||0)+' from stock checks · '+funds(balance?.productionIncome||0)+' from work and production.'+(balance?.arrivalSavings?' Brought '+funds(balance.arrivalSavings)+' in prior savings on arrival.':''));
      ledgerBody.append(picker,status);
      if(id==='steward'&&world.communityLife){
        const places=root.EarthAgency.originalAccounts(world);
        if(places.some(a=>a.name!==town.name)||places.length>1)
          ledgerBody.append(el('p','Personal funds across towns · '+places.map(a=>a.name+' '+funds(a.balance)).join(' · ')+'. Choose a town’s account above for its receipts.'));
      }
      const order=root.EarthDistrictGrowth?.work(town,id);
      if(order?.price>0&&order.kind!=='marketSupply')ledgerBody.append(el('p','Current job · '+order.name+' · '+order.payer+' has reserved '+funds(order.price)+'. '+order.action+'.'));
      if(root.EarthDistrictGrowth&&town===sim.active()&&id===own.id&&
        root.EarthCommunityLife.isHome(world,town)&&root.EarthCommunityLife.residency(town,id)==='member'&&!root.EarthCommunityLife.commuting(town,id)){
        const enabled=Boolean(root.EarthDistrictGrowth.goal(town,p).h?.takePaidOrders);
        const generation=town.foundingRevision||0;
        const control=btn(enabled?'Stop taking new paid orders':'Take paid orders while I play',async()=>{
          if(!control.isConnected||control.disabled)return;
          control.disabled=true;
          try{
            const result=await sim.perform('setPaidOrders',{site:town.id,actor:id,owner:p.identityKey||p.id,generation,enabled:!enabled});
            notify?.(result.message,!result.ok);
          }finally{control.disabled=false;}
        });
        ledgerBody.append(control,el('p','Available orders reserve a wage. The worker receives it after completing the job.'));
      }
      if(root.EarthDevelopmentLedger)ledgerBody.append(btn('Follow '+p.name+'’s development',()=>openDevelopment(town,{personId:id})));
      if(root.EarthDistrictGrowth){
        const {h,points,rank,next}=root.EarthDistrictGrowth.goal(town,p);
        ledgerBody.append(el('h3','Individual growth · Level '+(rank+1)),el('p',points+' / '+next+' contribution points · '+(next-points)+' to the next skill milestone.'));
        if(h)ledgerBody.append(el('p','Residential deed '+(h.plot+1)+' · home grade '+h.home+(h.shop?' · commercial lot '+(h.businessPlot+1)+' · '+root.EarthResidentShops.products[h.shop].name+' shop · '+h.stock+' in stock':'')+(h.extension?' · '+h.extension:'')+' · personal stores '+(h.pantry||0)+' food, '+(h.supplies||0)+' materials. '+h.last));
      }
      const possessions=el('div',null,'ledger-possessions');
      for(const item of goods?.items||[])possessions.append(el('span',item.name+' × '+item.count));
      if(goods?.ownShop)possessions.append(el('span','Business · '+goods.ownShop));
      for(const home of goods?.homes||[])if(home.ownerId===id)possessions.append(el('span',home.stage===3?'Owns a courtyard home':'Building a home · stage '+home.stage+' / 3'));
      if(possessions.childNodes.length)ledgerBody.append(possessions);
      const receipts=balance?.entries||[];
      if(receipts.length){
        const lines=el('ol');for(const r of receipts)lines.append(el('li','Week '+r.week+' · '+(r.amount>0?'+':'')+funds(r.amount)+' · Balance '+funds(r.balance)+'. '+r.text));ledgerBody.append(lines);
      }else ledgerBody.append(el('p',p.name+' has no recorded personal transactions here yet.'));
      if(!watchedId&&id===own.id&&town===sim.active()&&(!world.communityLife||root.EarthCommunityLife.isHome(world,town)))
        ledgerBody.append(btn('Open my trading account',()=>openMarket('purse')));
    }
    let ledgerWorld=null;
    function drawLedger(){
      const world=sim.state,site=inspectedStores();if(!site)return;
      const own=personalAccount();
      const stamp=[ledgerPage,site.id,site.foundingRevision,world.week,world.actionRevision,site.resourceLedger?.serial,
        site.exchange?.serial,site.purses?.serial,site.growth?.round,site.funds,world.productionSerial,ledgerPage==='development'&&site.construction?.map(j=>j.id+':'+Math.floor(10*j.work/j.total)).join('|'),own.site.id,own.id,accountChoice,developmentTown,
        ledgerPage==='development'&&developmentSelection.personId,ledgerPage==='development'&&developmentSelection.record].join('/');
      if(ledgerStamp===stamp&&ledgerWorld===world)return;
      ledgerWorld=world;
      const prior=ledgerBody.scrollTop,focusKey=doc.activeElement?.dataset?.developmentFocus;
      const detailsOpen=ledgerBody.querySelector('[data-development-disclosure]')?.open;
      ledgerStamp=stamp;ledgerBody.replaceChildren();
      if(ledgerPage==='development'&&root.EarthDevelopmentLedger){
        const town=findTown(world,developmentTown)||site;
        text('district-ledger-title',town.name+' · Development ledger');
        ledgerBody.append(btn('Resource inventory',()=>selectLedger('stock')));
        root.EarthDevelopmentLedger.render(ledgerBody,world,town,developmentSelection,selection=>openDevelopment(developmentTown?town:null,selection));
        if(detailsOpen){const details=ledgerBody.querySelector('[data-development-disclosure]');if(details)details.open=true;}
        if(focusKey)Array.from(ledgerBody.querySelectorAll('[data-development-focus]')).find(node=>node.dataset.developmentFocus===focusKey)?.focus({preventScroll:true});
        ledgerBody.scrollTop=prior;return;
      }
      if(ledgerPage==='treasury'){treasury(site);ledgerBody.scrollTop=prior;return;}
      if(ledgerPage==='stock'&&root.EarthDevelopmentLedger)ledgerBody.append(btn('Development ledger',()=>openDevelopment()));
      if(ledgerPage==='stock'&&root.EarthDistrictGrowth){
        const g=root.EarthDistrictGrowth.report(site),last=site.growth?.history?.[0],signed=n=>(n>=0?'+':'')+n;
        ledgerBody.append(el('h3',site.era+' · Community growth'),el('p',g.target?(g.points+' / '+g.target+' growth points toward '+g.next+' · '+Math.max(0,g.target-g.points)+' remaining.'):'Stewardship attained · '+g.points+' lifetime growth points.'));
        if(g.target){
          if(world.communityLife&&site.id!==world.communityLife.homeId)ledgerBody.append(el('p','Council route · '+site.stats.resolved+' / '+[1,3,6][site.tech.length]+' completed decisions can also qualify this town.'));
          const tier=site.tech.length,floor=root.EarthCivicInitiatives.reserve(world,site),held=root.EarthNeighbourErrands?.heldGoods?.(site,world.week)||{};
          ledgerBody.append(el('p','For the next era · trust '+site.trust+'/'+(45+tier*5)+' · food '+site.food+'/'+(floor.food+(held.food||0))+' · materials '+site.materials+'/'+(floor.materials+(held.materials||0)+[2,3,3][tier])+' · treasury '+site.funds+'/'+(floor.funds+(held.funds||0)+[5,7,9][tier])+'.'));
        }
        ledgerBody.append(el('p',g.roads+' completed access '+(g.roads===1?'road':'roads')+' · '+g.vehicle+' · '+g.custom+(site.growth?.institution?' · '+site.growth.institution:'')));
        ledgerBody.append(el('p','Members hold their home deed. Businesses buy a free commercial lot for 5 funds and 2 materials. Roads open more lots.'));
        if(last)for(const round of site.growth.history.slice(0,3))ledgerBody.append(el('p','Round '+round.round+' · paid '+round.wages+' in order income · pantry '+signed(round.food)+' · materials '+signed(round.materials)+' · treasury '+signed(round.funds)+'. '+round.events.join(' ')));
        else ledgerBody.append(el('p','Work orders advance while this world is open. Their receipts appear here when goods or funds move.'));
      }
      text('district-ledger-title',ledgerPage==='stock'?site.name+' · Resource inventory':'Personal accounts');
      if(ledgerPage==='stock')stockList(site,site===sim.active()&&!watchedId&&(!world.communityLife||root.EarthCommunityLife.isHome(world,site)));
      else accounts(site);
      ledgerBody.scrollTop=prior;
    }

    let peopleTimer=0,peopleRows=[],comparisonSite='',compareA='',compareB='';
    const compare=$('perspectives'),pairBody=$('perspective-report');
    function compareResidents(){
      if(!compare?.open)return;
      const site=sim.active(),world=sim.state,people=root.EarthPersonas.list(site),actor=root.EarthAgency.actorId(site);
      if(comparisonSite!==site.id){comparisonSite=site.id;compareA='';compareB='';}
      if(!people.some(p=>p.id===compareA))compareA=people.find(p=>p.id===actor)?.id||people[0]?.id;
      const peers=people.filter(p=>p.id!==compareA);
      if(!peers.some(p=>p.id===compareB))compareB=peers[0]?.id;
      const fields=[$('perspective-first'),$('perspective-second')],names=group=>group.map(p=>[p.id,p.name]);
      options(fields[0],names(people),compareA);options(fields[1],names(peers),compareB);
      const pair=root.EarthInterdependence.perspectives(site,world,people,compareA,compareB);
      pairBody.replaceChildren();if(!pair){pairBody.append(el('p','Two residents must be present to compare their perspectives.'));return;}
      const columns=el('div',null,'perspective-columns');
      for(const [self,other] of [[pair.first,pair.second],[pair.second,pair.first]]){
        const section=el('article');
        section.append(el('h4',self.name),el('small',self.role));
        if(self.reason)section.append(el('p','“'+self.reason+'”'));
        if(self.dream)section.append(el('p','Personal aim · '+self.dream));
        if(self.depends)section.append(el('p','Depends on · '+self.depends));
        const m=self.memory;
        section.append(el('p',m?'Last memory of '+other.name+' · Week '+m.week+' · '+m.reason+'.':
          'No personal encounter with '+other.name+' appears in this resident’s current memory.'));
        columns.append(section);
      }
      pairBody.append(columns);
      for(const edge of pair.links.slice(0,4)){
        const source=edge.from===compareA?pair.first:pair.second,recipient=edge.from===compareA?pair.second:pair.first;
        pairBody.append(el('p',source.name+' → '+recipient.name+' · '+edge.label+'. '+edge.detail,'perspective-link'));
      }
    }
    compare?.addEventListener('toggle',compareResidents);
    $('perspective-first')?.addEventListener('change',e=>{compareA=e.target.value;compareResidents();});
    $('perspective-second')?.addEventListener('change',e=>{compareB=e.target.value;compareResidents();});
    function refreshActivities(){
      for(const row of peopleRows){
        const a=street()?.activityOf(row.id);
        const text=a?[a.label,a.venue].filter(Boolean).join(' · '):'Away from the street';
        if(row.activity.textContent!==text)row.activity.textContent=text;
      }
    }
    let peopleQuery='';
    const peopleFilterHost=$('scene-people-filter');
    let peopleSearch=null,peopleCount=null;
    if(peopleFilterHost){
      peopleSearch=doc.createElement('input');
      peopleSearch.id='scene-people-search';
      peopleSearch.type='search';
      peopleSearch.placeholder='Filter residents by name or role';
      peopleSearch.autocomplete='off';
      peopleSearch.setAttribute('aria-label','Filter residents by name or role');
      peopleCount=el('small',null,'people-count');
      peopleCount.id='scene-people-count';
      peopleSearch.addEventListener('input',()=>{peopleQuery=peopleSearch.value.trim().toLowerCase();people();});
      peopleFilterHost.replaceChildren(peopleSearch,peopleCount);
    }
    function people(){
      clearInterval(peopleTimer);
      const site=sim.active(),world=sim.state,me=root.EarthAgency.actorId(site),host=$('scene-resident-list');
      const allRows=root.EarthPersonas.list(site),focus=doc.activeElement?.dataset.personCommand;
      const rows=peopleQuery?allRows.filter(p=>{
        const role=(root.EarthCareers.role(site,p.id)||p.role||'').toLowerCase();
        return p.name.toLowerCase().includes(peopleQuery)||role.includes(peopleQuery);
      }):allRows;
      if(peopleCount)peopleCount.textContent=peopleQuery?rows.length+' of '+allRows.length+' residents':allRows.length+' residents';
      peopleRows=[];
      const articles=rows.map(p=>{
        const row=el('article',null,'resident-directory-row'),isMe=p.id===me;
        const title=el('header');title.append(el('strong',p.name),el('span',root.EarthCareers.role(site,p.id)||p.role));
        const plan=root.EarthAutonomy.view(site,world,p.id);
        const activity=el('p',null,'resident-activity'),aim=plan?.dream?.title||plan?.goal;
        const links=el('div',null,'directory-actions');
        function entry(label,fn,key){const b=btn(label,fn);b.dataset.personCommand=p.id+'/'+key;b.setAttribute('aria-label',label+' · '+p.name);links.append(b);}
        if(!isMe){
          entry('Meet',()=>hud.meetPerson(p.id),'meet');
          entry('See',()=>watch(site.id,{person:p.id}),'watch');
        }
        entry(isMe?'My goals':'Goals',()=>hud.selectPurpose(p.id),'goals');
        row.append(title,activity);if(aim)row.append(el('small','Aim · '+aim));
        const production=root.EarthDistrictGrowth?.goal(site,p)?.h;
        if(production)row.append(el('small','Last contribution · '+production.last));
        row.append(links);peopleRows.push({id:p.id,activity});return row;
      });
      host.replaceChildren(...articles);refreshActivities();compareResidents();
      if(focus)Array.from(host.querySelectorAll('button')).find(b=>b.dataset.personCommand===focus)?.focus({preventScroll:true});
      peopleTimer=setInterval(()=>{if(!doc.hidden&&hud.active()==='people')refreshActivities();},900);
    }
    function leavePeople(){clearInterval(peopleTimer);peopleRows=[];}
    hud.registerTool('people',{render:people,close:leavePeople,invalidate:leavePeople});
    hud.registerTool('district',{render(){
      const site=sim.active();
      $('scene-open-projects').hidden=sim.state.communityLife&&!root.EarthCommunityLife.isHome(sim.state,site);
      $('scene-open-work').hidden=$('scene-open-projects').hidden;
    }});

    let parcel=0,use='homes',pending=false,siteStamp='';
    const box=$('scene-precinct'),model=root.EarthCityModel;
    function plan(){
      const world=sim.state,site=sim.active();
      if(!site||world.communityLife&&!root.EarthCommunityLife.isHome(world,site)){box.replaceChildren(el('p','The host council chooses its own neighbourhood projects.'));return;}
      const stamp=site.id+'/'+(site.foundingRevision||0);
      if(siteStamp!==stamp){siteStamp=stamp;parcel=0;use='homes';}
      const district=model.overview(site),rec=district.records[parcel],field=el('select'),label=el('label','Location');
      options(field,district.records.map(r=>[String(r.id),r.name+' · '+model.nameOf(site,r.use)]),String(rec.id));
      label.append(field);field.addEventListener('change',()=>{parcel=Number(field.value);plan();box.querySelector('select').focus();});
      box.replaceChildren(label,el('p',rec.terrain.note));
      if(rec.target){
        box.append(el('strong',model.nameOf(site,rec.target)+' under construction'),btn('Inspect crew and handover',()=>{hud.close(false);inspectWork(rec.jobId);}));return;
      }
      const uses=model.options.filter(k=>k!==rec.use);if(!uses.includes(use))use=uses[0];
      const proposal=el('select'),pLabel=el('label','Proposed use');
      options(proposal,uses.map(k=>[k,model.nameOf(site,k)]),use);pLabel.append(proposal);
      proposal.addEventListener('change',()=>{use=proposal.value;plan();box.querySelectorAll('select')[1].focus();});
      const q=model.preview(site,world,parcel,use,true);
      box.append(pLabel,el('p',q.purpose||q.reason));
      if(!q.ok)return;
      const {funds:money,materials}=q.cost;
      box.append(el('p',q.people),el('strong',q.forecast),el('p',funds(money)+' · '+materials+' materials. Earliest opening in week '+q.week+'.'));
      if(!q.available)box.append(el('p',q.reason));
      const target=use,index=parcel,week=world.week,revision=world.actionRevision,job=btn('Commission '+q.title,async()=>{
        if(pending||!job.isConnected||hud.active()!=='precinct'||sim.active()?.id!==site.id||target!==use||index!==parcel||week!==sim.state.week||revision!==sim.state.actionRevision)return;
        pending=true;job.disabled=true;
        try{const result=await sim.perform('planCity',index,target);redraw();hud.notify(result.message);}
        finally{pending=false;if(hud.active()==='precinct')plan();}
      });
      job.disabled=pending||!q.available;box.append(job);
    }
    hud.registerTool('precinct',{render:plan});
    function project(index,kind){
      const site=sim.active(),rec=site&&model.overview(site).records[index];
      function stale(){if(hud.active()==='precinct')hud.close(false);return false;}
      if(!rec||!model.options.includes(kind)&&kind!=='cancel')return stale();
      if(kind==='cancel'&&rec.jobId){inspectWork(rec.jobId);return true;}
      if(kind==='cancel'||rec.target&&rec.target!==kind||rec.use===kind)return stale();
      siteStamp=site.id+'/'+(site.foundingRevision||0);parcel=index;use=kind;
      return hud.openTool('precinct');
    }
    const getScene=()=>scene||street();
    housing=root.EarthHousingUI?.mount({sim,inspected:inspectedStores,scene:getScene,townCentre:openTownCentre});
    const region=root.EarthRegionMap?.mount({sim,watch,getScene});
    pointInspector=root.EarthRegionalInspector?.mount({sim,street:getScene,watch,travel,buildingAction,openTownCentre,
      returnStreet:()=>{close();street()?.recenter();},refresh:redraw,ledger:(town,personId)=>{openDevelopment(town,personId?{personId}:{});ledger.scrollIntoView({block:'nearest'});},contextChanged:ribbon});
    $('street-stage')?.addEventListener('earthregionalmeet',e=>hud.meetPerson(e.detail.id));
    return {chart:()=>region?.chart(),selectChart:id=>region?.selectChart(id),watch,inspectBuilding:building=>pointInspector?.inspectBuilding(building),close(focus){region?.close();close(focus);},project,snapshot,restore,refreshWork,observing:()=>!!watchedId,setMarket:panel=>{marketPanel=panel;},
      render(isAtlas){if(isAtlas)pointInspector?.clear();region?.refresh();if(watchedId)syncObserved();pointInspector?.redraw();ribbon();atlasDirectory(isAtlas);}};
  }
  root.EarthDistrictDesk=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
