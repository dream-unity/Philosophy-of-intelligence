/* Mounted inside the Street HUD. The ledger is read-only anywhere in the
   district. A transaction walks or drives the character to the real stall. */
(function(root){
  'use strict';
  const title=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function mount(section,{sim,street,version,meet,quayProof,meetQuay,onResult,after,work,openFishing}){
    if(!section||!root.EarthMarket)return null;
    const quantity=root.EarthMarket.quantity;
    const doc=section.ownerDocument,body=section.querySelector('[data-market-content]')||section;
    let generation=0,key='',busy=null,trip=null,feedback='',currentSite='',tab='trade',packAt='market',cratesOpen=false,selectedCrate=null,selectedResource=null,selectedWare=null;
    const restricted=()=>root.EarthCommunityLife?.permission?.(sim.state,sim.active(),'exchange',[])||'';
    function el(tag,text,cls){
      const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;
    }
    function button(text,fn,cls='secondary-button'){
      const b=el('button',text,cls);b.type='button';
      b.addEventListener('click',()=>{if(b.isConnected)fn();});return b;
    }
    function visible(){return Boolean(!doc.hidden&&!section.closest('[hidden]')&&street());}
    function identity(site){return [site.id,site.foundingRevision||0,site.lat,site.lon].join('/');}
    function invalidate(){generation++;key='';trip=null;busy=null;feedback='';currentSite='';tab='trade';packAt='market';cratesOpen=false;selectedCrate=null;selectedResource=null;selectedWare=null;}
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)invalidate();});
    function area(name){tab=name;trip=null;generation++;key='';feedback='';render();}
    function show(message){feedback=message;key='';render();}
    function travelMessage(kind,o,station,mode){
      const moving=mode==='drive'?'Driving':'Walking',action=o.action;
      if(kind==='purseAction'){
        if(action==='check')return 'Walking to '+station+' for the stock count.';
        if(action==='finish')return 'Returning to '+station+' to collect your pay.';
        const purpose={start:'book your paid shift',cancel:'return the wage advance',buy:'buy '+o.good+' for the town',
          donate:'add to the household food fund',household:'buy food with the household fund',makeWare:'make and consign this piece',buyWare:'collect the owner’s offered piece',buyShopStock:'collect your purchase'};
        return moving+' to '+station+' to '+(purpose[action]||(action==='buildHome'?'work on your home':action==='buyHome'?'record your new deed':'review your account'))+'.';
      }
      if(kind==='provision')return moving+' to '+station+' to '+({pack:'pack a provision crate',open:'open the stored crate',
        reserve:'reserve the crate for households',hold:'hold the crate in storage'}[action]||'handle the crate')+'.';
      const purpose={buy:'buy '+o.good,sell:'sell '+o.good,hold:'set aside '+o.good,release:'release '+o.good,
        fund:'commission the '+(o.good==='food'?'gleaning':'timber recovery')+' round',cancel:'recall the delivery crew'};
      const localPurpose=action==='gatherLot'?'collect the quoted local lot':action==='makeBatch'?'prepare the selected batch':
        action==='sellLot'?'sell the district’s raw goods':action==='buyLot'?'buy the quoted raw goods':'';
      return moving+' to '+station+' to '+(purpose[action]||localPurpose||'review the offer')+'.';
    }
    function transact(view,option,kind='exchange'){
      if(!option.available||busy||!visible())return;
      const reason=restricted();if(reason){show(reason);return;}
      const resource=option.resourceSerial!=null;
      const purse=kind==='purseAction',request=purse?option.request:{week:view.week,actorId:view.actorId,siteId:view.siteId,generation:view.generation,
        serial:view.serial,action:option.action};
      const provision=kind==='provision',quay=provision&&packAt==='quay'||resource&&option.venue.type==='quay';
      if(resource)request.resourceSerial=option.resourceSerial;
      if(provision){if(option.crateId!=null)request.crateId=option.crateId;}
      else if(!purse){request.good=option.good;request.price=option.price;}
      const local=street(),phase=generation,ref=purse||resource?option.venue:{type:'market'},workplace=ref.type==='workplace',privateHome=ref.type==='privateHome',districtShop=ref.type==='districtShop';
      if((provision||purse||workplace)&&local.getState?.().mode&&local.getState().mode!=='walk'){
        show('Come ashore or park and step out '+(workplace?'to work at the '+ref.venue+'.':purse?'to handle personal work or funds.':'to handle a provision crate.'));return;
      }
      const station=districtShop?'commercial lot '+(ref.plot+1):privateHome?'courtyard '+(ref.plot+1):resource?option.station:quay?'the waterfront quay':ref.type==='resident'?(view.shift?.clerkName||
        sim.active().residents.find(p=>p.id===ref.residentId)?.name||'the shift clerk'):'the exchange counter';
      const position=()=>districtShop?local.shopProof?.(ref.plot):privateHome?local.privateHomeProof?.(ref.plot):quay?quayProof?.():workplace?local.venueProof?.(ref.venue,view.actorId):local.meeting(ref,true);
      const pending={week:view.week,actorId:view.actorId};trip=pending;
      const present=()=>visible()&&phase===generation&&street()===local&&sim.active()?.id===view.siteId&&
        (sim.active()?.foundingRevision||0)===view.generation&&sim.state.week===view.week&&
        (root.EarthAgency?.actorId?.(sim.active())||'steward')===view.actorId;
      async function commit(){
        if(trip!==pending||!present()||busy)return;
        const sceneVersion=version?.();
        const valid=()=>present()&&version?.()===sceneVersion;
        const operation={};trip=null;busy=operation;
        try{
          const result=await sim.perform(kind,request,()=>valid()?position():null);
          if(!valid())return;
          feedback=result.message;onResult?.(result);
          if(result.ok){
            after?.();
            if(option.action==='gatherLot')street()?.showResourceWork?.(request.actorId,option.good);
          }
          key='';render();
        }finally{if(busy===operation)busy=null;}
      }
      if(position()){commit();return;}
      const started=districtShop?local.focusShop?.(ref.plot,commit):privateHome?local.focusPrivateHome?.(ref.plot,commit):quay?meetQuay?.(commit):workplace?local.focusVenue?.(ref.venue,view.actorId,commit):meet?.(ref,station,commit);
      if(started===false){trip=null;show('Reach '+station+' to complete this action.');}
      else if(trip===pending)show(resource?'Travelling to '+station+' to '+option.title.toLowerCase()+'.':travelMessage(kind,option,station,local.getState?.().mode));
    }
    function actionButton(model,o){
      const b=button(o.title,()=>transact(model,o));b.disabled=!o.available||Boolean(restricted());b.dataset.marketAction=o.action+'-'+o.good;
      return b;
    }
    function appendReason(box,o){if(o.reason)box.append(el('p',o.reason,'market-reason'));}
    function stockTable(m){
      const t=el('table',null,'market-stock'),head=el('thead'),h=el('tr');
      for(const text of ['Goods','Stock','Held','Free','Due','Week'])h.append(el('th',text));
      head.append(h);t.append(head);const rows=el('tbody');
      for(const item of m.rows){
        const r=el('tr');
        const right=item.flow===null?'—':item.flow>0?'+'+item.flow:String(item.flow);
        for(const [i,s] of [item.name,item.stock,item.held,item.free,item.incoming,right].entries())r.append(el(i===0?'th':'td',String(s)));
        rows.append(r);
      }
      t.append(rows);const wrap=el('div',null,'market-table-wrap');wrap.append(t);return wrap;
    }
    function tradeshown(m){
      const result=el('div',null,'market-page');
      if(root.EarthResources)result.append(button('View local harvests, raw stocks and recipes',()=>area('resources'),'text-button'));
      result.append(el('p','Stall till · '+quantity('funds',m.till)+'. Buyers pay more when a shelf is low.','market-help'));
      if(m.wagesHeld)result.append(el('p',m.wagesHeld+' funds are held separately for promised wages.','market-help'));
      if(m.loaded)result.append(el('p','On the co-op truck · '+quantity(m.loaded,1)+' awaiting delivery. Its return space is reserved.','market-help'));
      for(const good of ['food','materials']){
        const block=el('section',null,'market-good'),labels=el('div',null,'market-heading');
        labels.append(el('h4',title(good)),el('span',m.shelf[good]+'/'+m.capacity+' on shelf'));
        block.append(labels);
        const options=m.options.filter(o=>o.good===good&&['buy','sell'].includes(o.action));
        const row=el('div',null,'market-buttons');
        for(const o of options)row.append(actionButton(m,o));
        block.append(row);
        for(const o of options)appendReason(block,o);
        if(options.some(o=>!o.available)&&work){
          const fallback=options.find(o=>o.action==='buy'&&!o.available);
          const need=fallback&&m.rows.find(k=>k.good==='funds').free<fallback.price?'funds':good;
          block.append(button('Work for '+need,()=>work(need),'text-button'));
        }
        result.append(block);
      }
      const n=m.nextRound;
      result.append(el('p','Next round · visitors seek up to '+quantity(n.customerGood,n.demand)+'. Suppliers offer up to '+quantity(n.supplyGood,n.supply)+' at '+quantity('funds',n.wholesale)+' each, subject to shelf space and cash.','market-help'));
      return result;
    }
    function resourcePage(m){
      const local=m.local,box=el('div',null,'market-page');
      if(!local)return box;
      box.append(el('h4',local.habitat+' · '+local.season),
        el('p',local.foodSources+'. '+m.rows[0].free+' food ready for '+local.mealNeed+' household shares this week.','market-help'));
      if(local.compost||local.loss)box.append(el('p','Compost store · '+(local.compost||0)+' of '+local.compostLimit+' soil dressings. Spoiled district produce can return to a growing bed.','market-help'));
      if(local.loss)box.append(el('p','Week '+m.week+' · '+local.loss+' spoiled in the district bins.','market-reason'));
      if(local.fishing){
        const last=sim.active()?.provisions?.landings,sea=el('section',null,'market-good');
        const catcher=last&&(root.EarthPersonas?.profile?.(sim.active(),last.by)?.name||sim.active().residents?.find(p=>p.id===last.by)?.name);
        sea.append(el('h4','Fresh fish · waterfront'),el('p',last?'Latest catch · '+(catcher?catcher+' landed ':'')+last.amount+' food in week '+last.week+
          '. '+(last.week===m.week?last.thisWeek:0)+' landed this week. The catch record includes fish already served or packed.':'A handline catch goes straight into the shared pantry.','market-help'));
        const ground=root.EarthFisheries?.ground?.(sim.active(),m.week);
        if(ground)sea.append(el('p',ground.name+' · '+ground.available+' of '+ground.capacity+' available. Up to '+ground.recovery+' return per week.','market-help'));
        if(openFishing)sea.append(button('Fish at the waterfront',openFishing,'secondary-button'));
        box.append(sea);
      }
      const current=local.rows.find(row=>row.id===selectedResource)||local.rows.find(row=>row.local)||local.rows[0];
      if(!current)return box;
      selectedResource=current.id;
      const table=el('table',null,'market-stock market-resources'),caption=el('caption','Raw goods available in this district'),
        header=el('thead'),head=el('tr'),rows=el('tbody');
      for(const label of ['Resource','Bin','Source','Stall'])head.append(el('th',label));header.append(head);
      for(const row of local.rows){
        const tr=el('tr'),th=el('th'),choose=button(row.name,()=>{
          selectedResource=row.id;trip=null;generation++;key='';feedback='';render();
          body.querySelector('.market-resource-detail')?.scrollIntoView?.({block:'nearest',behavior:'instant'});
        },'text-button');
        choose.dataset.marketAction='resource-'+row.id;choose.setAttribute('aria-pressed',String(row.id===selectedResource));
        if(row.id===selectedResource)tr.className='resource-selected';th.append(choose);
        tr.append(th,el('td',String(row.owned)),el('td',row.local?String(row.standing):'Import'),el('td',String(row.shelf)));rows.append(tr);
      }
      table.append(caption,header,rows);
      const titleBox=el('section',null,'market-resource-detail');
      titleBox.append(el('h4',current.name+' · '+current.family));
      const source=current.local?'Available at the '+current.source+' · '+current.standing+' of '+current.cap+' '+current.unit+'. '+
        (current.finite?'The deposit is finite.':current.renew?'It can recover up to '+current.renew+' next week.':'It will regrow when the season changes.'):
        'Regional suppliers carry this good. It has no local collection site.';
      titleBox.append(el('p',source+' '+current.owned+' of '+local.binLimit+' district storage spaces occupied.','market-help'));
      if(current.reopens)titleBox.append(el('p','Closed for recovery until week '+current.reopens+'. District crews and local suppliers use another source.','market-reason'));
      if(current.caredThrough)titleBox.append(el('p','Aftercare improves weekly recovery through week '+current.caredThrough+'.','market-help'));
      else if(current.pressureUntil)titleBox.append(el('p','Repeated depletion has slowed regrowth through week '+current.pressureUntil+'. Rest the patch or dress suitable soil with compost.','market-reason'));
      if(current.storageWeeks){
        const bin=current.binDate?' Cook or sell the oldest district lot before week '+current.binDate+'.':'';
        const stall=current.stallDate?' The oldest stall lot keeps until the start of week '+current.stallDate+'.':'';
        titleBox.append(el('p','Freshly collected lots keep for '+current.storageWeeks+' weeks.'+bin+stall,'market-help'));
      }
      const actions=el('div',null,'market-buttons');
      function addOption(row,op){
        const b=button(op.title,()=>transact(m,{...op,resourceSerial:local.serial}));
        b.dataset.marketAction=op.action+'-'+op.good;b.disabled=!op.available||Boolean(restricted());
        if(op.reason)b.title=op.reason;row.append(b);return b;
      }
      const moves=local.options.filter(op=>op.good===current.id&&op.action!=='makeBatch');
      const careActions=moves.filter(o=>['restPatch','dressSoil','irrigate','compostLot'].includes(o.action));
      for(const op of moves.filter(o=>!careActions.includes(o)))addOption(actions,op);
      titleBox.append(actions);
      const collection=moves.find(o=>o.action==='gatherLot');
      if(collection)titleBox.append(el('p',collection.available?'Collection point · '+collection.station:collection.reason,'market-help'));
      if(careActions.length){
        const care=el('details'),summary=el('summary','Care for this resource');care.append(summary);
        for(const op of careActions){const row=el('div',null,'market-provision-action');addOption(row,op);row.append(el('p',op.reason||op.detail,'market-help'));care.append(row);}
        titleBox.append(care);
      }
      const recipes=local.recipes.filter(op=>op.inputs?.includes(current.id));
      for(const op of recipes){
        const row=el('div',null,'market-recipe'),info=el('div');
        info.append(el('strong',op.title),el('p',op.detail,'market-help'));row.append(info);
        const b=addOption(row,op);b.textContent='Prepare batch';b.setAttribute('aria-label',op.title);
        titleBox.append(row);if(op.reason)titleBox.append(el('p',op.reason,'market-reason'));
      }
      if(feedback){const outcome=el('p',feedback,'market-feedback');outcome.setAttribute('role','status');titleBox.append(outcome);}
      box.append(titleBox,table);
      return box;
    }
    function provisions(){
      const model=sim.provisionsView?.();if(!model)return null;
      const group=el('details',null,'market-provisions');group.open=cratesOpen;
      group.addEventListener('toggle',()=>{if(group.isConnected)cratesOpen=group.open;});
      group.append(el('summary','Provision crates · '+model.used+'/'+model.capacity));
      const card=el('div',null,'market-page');
      card.append(el('p',model.freshFood+' fresh food · '+quantity('materials',model.materials)+' · '+model.reservedFood+' sealed food reserved for households.','market-help'));
      if(model.lastRelief){
        const r=model.lastRelief;
        card.append(el('p','Week '+r.week+' · crates packed by '+r.contributors.join(', ')+' covered '+r.amount+' of the household shortfall of '+r.shortfall+' food.','market-help'));
      }
      const waterfront=Boolean(street()?.getState?.().waterfront&&meetQuay&&quayProof);
      if(waterfront){
        const label=el('label','Packing station'),field=el('select');
        for(const [id,name] of [['market','Exchange counter'],['quay','Waterfront quay']]){
          const o=el('option',name);o.value=id;field.append(o);
        }
        field.value=packAt;field.addEventListener('change',()=>{packAt=field.value;trip=null;generation++;feedback='';key='';cratesOpen=true;render();});
        label.append(field);card.append(label);
      }else packAt='market';
      const crates=model.crates||[];
      if(!crates.some(crate=>crate.id===selectedCrate))selectedCrate=crates[0]?.id??null;
      if(crates.length>1){
        const label=el('label','Stored crate'),field=el('select');
        for(const crate of crates){
          const opt=el('option',crate.name+' · '+crate.remaining+' food'+(crate.reserved?' · household reserve':''));opt.value=String(crate.id);field.append(opt);
        }
        field.value=String(selectedCrate);
        field.addEventListener('change',()=>{selectedCrate=crates.find(crate=>String(crate.id)===field.value)?.id??null;trip=null;generation++;feedback='';key='';cratesOpen=true;render();});
        label.append(field);card.append(label);
      }
      const chosen=crates.find(crate=>crate.id===selectedCrate);
      if(chosen)card.append(el('p',chosen.name+' · '+chosen.remaining+' food · '+chosen.origin+' · packed by '+chosen.packedBy+' in week '+chosen.week+(chosen.reserved?' · household reserve':''),'market-help'));
      for(const o of (model.options||[]).filter(o=>o.crateId==null||o.crateId===selectedCrate)){
        const row=el('div',null,'market-provision-action'),b=button(o.label,()=>transact(model,o,'provision'));
        b.disabled=!o.available||Boolean(restricted());b.dataset.marketAction='provision-'+o.action+'-'+(o.crateId??'');row.append(b);
        if(o.detail)row.append(el('p',o.detail,'market-help'));appendReason(row,o);card.append(row);
      }
      if(work&&(model.freshFood<2||model.materials<1)){
        const needed=model.freshFood<2?'food':'materials';card.append(button('Work for '+needed,()=>work(needed),'text-button'));
      }
      group.append(card);return group;
    }
    function orders(m){
      const box=el('div',null,'market-page');
      const supply=provisions();if(supply)box.append(supply);
      if(m.batch)box.append(el('p',m.batch.due>m.week?'The crew will bring '+m.batch.amount+' '+m.batch.good+' in week '+m.batch.due+'.':
        m.batch.amount+' '+m.batch.good+' awaits space in the district store.'));
      for(const op of m.options.filter(o=>o.action==='fund'||o.action==='cancel')){
        const card=el('section',null,'market-good');card.append(actionButton(m,op),el('p',op.detail,'market-help'));appendReason(card,op);box.append(card);
      }
      box.append(el('h4','Project chest'),el('p',quantity('materials',m.locked.materials)+' · '+quantity('funds',m.locked.funds)+' · '+m.lockCapacity+' spaces. Held goods are protected from trade and spending.','market-help'));
      for(const good of ['materials','funds']){
        const row=el('div',null,'market-buttons');
        for(const o of m.options.filter(x=>x.good===good&&(x.action==='hold'||x.action==='release')))row.append(actionButton(m,o));
        box.append(row);
      }
      return box;
    }
    function shopsPage(){
      const p=sim.purseView?.(),box=el('div',null,'market-page market-shops');
      if(!p)return box;
      box.append(el('h4','Resident shops'),el('p',p.name+' · '+quantity('funds',p.balance)+' in your purse. '+(p.stalls?.length||0)+' of '+p.stallCapacity+' stands occupied.','market-help'));
      if(!p.stalls?.length)box.append(el('p','The exchange has room for its first maker. Residents can earn a wage, buy a raw lot and offer a finished piece here.','market-help'));
      const action=(card,offer)=>{
        const b=button(offer.title,()=>transact(p,offer,'purseAction'));
        b.dataset.marketAction='purse-'+offer.action+'-'+offer.good+(offer.ownerId?'-'+offer.ownerId:'');
        b.disabled=!offer.available||Boolean(restricted());card.append(b);
        card.append(el('p',offer.detail,'market-help'));appendReason(card,offer);
      };
      for(const stall of p.stalls||[]){
        const card=el('section',null,'market-good');
        card.append(el('h4',stall.name+'’s '+stall.specialty));
        if(!stall.wares.length)card.append(el('p','Sold out. The owner decides when to make more.','market-help'));
        const offered=(p.options||[]).filter(o=>o.action==='buyWare'&&o.ownerId===stall.id);
        if(stall.id===p.personId||!offered.length){
          for(const w of stall.wares)card.append(el('p',w.name+' · '+quantity('funds',w.ask),'market-help'));
        }else for(const o of offered)action(card,o);
        if(stall.id===p.personId){
          const terms=el('details');terms.append(el('summary','Manage the stand'));
          for(const o of (p.options||[]).filter(o=>['markDown','foldStall'].includes(o.action)))action(terms,o);
          card.append(terms);
        }
        box.append(card);
      }
      const neighbourhood=(p.options||[]).filter(o=>o.action==='buyShopStock');
      if(neighbourhood.length){
        const shelves=el('section',null,'market-resource-detail');
        shelves.append(el('h4','Neighbourhood shops'));
        for(const offer of neighbourhood){const owner=el('details');owner.dataset.shopPlot=String(offer.plot);owner.append(el('summary',root.EarthResidentShops.products[offer.good].name+' · Lot '+(offer.plot+1)+' · '+offer.stock+' available'));action(owner,offer);shelves.append(owner);}
        box.append(shelves);
      }
      const recipes=(p.options||[]).filter(o=>o.action==='makeWare');
      if(recipes.length){
        const chosen=recipes.find(o=>o.good===selectedWare)||recipes.find(o=>o.available)||recipes[0];
        selectedWare=chosen.good;
        const card=el('section',null,'market-resource-detail'),label=el('label','Choose a piece to make'),select=el('select');
        label.htmlFor='private-maker-piece';select.id='private-maker-piece';select.dataset.marketAction='maker-piece';
        for(const recipe of recipes){
          const opt=el('option',root.EarthResidentShops.products[recipe.good].name);opt.value=recipe.good;select.append(opt);
        }
        select.value=selectedWare;select.addEventListener('change',()=>{selectedWare=select.value;trip=null;generation++;key='';feedback='';render();});
        card.append(el('h4',p.ownShop?'Work for your '+p.ownShop:'Open your own stand'),label,select);action(card,chosen);box.append(card);
      }
      if(p.homes){
        const register=el('section',null,'market-resource-detail');register.append(el('h4','Courtyard homes'));
        register.append(el('p',p.homes.length+' of '+p.homePlots+' serviced sites occupied. A completed home adds two housing places.','market-help'));
        for(const home of p.homes)register.append(el('p','Plot '+(home.plot+1)+' · '+home.name+' · '+['','Foundations','Frame complete','Ready to live in'][home.stage]+
          (home.price?' · Offered for '+quantity('funds',home.price):''),'market-help'));
        for(const offer of (p.options||[]).filter(o=>o.good==='courtyardHome'))action(register,offer);
        box.append(register);
      }
      if(p.items?.length){
        const list=el('ul');
        for(const item of p.items)list.append(el('li',item.name+' × '+item.count+'. '+item.use));
        box.append(el('h4',p.name+'’s belongings'),list);
      }
      if(p.balance<2)box.append(button('Find paid work',()=>area('purse'),'text-button'));
      return box;
    }
    function pursePage(){
      const p=sim.purseView?.(),box=el('div',null,'market-page');
      if(!p)return box;
      box.append(el('h4',p.name+'’s purse · '+quantity('funds',p.balance)),
        el('p','Household food fund · '+quantity('funds',p.household)+' pooled to stock the district pantry.','market-help'));
      if(p.items?.length)box.append(el('p','Personal belongings · '+p.items.map(i=>i.count+' '+i.name.toLowerCase()).join(', ')+'.','market-help'));
      if(p.stalls)box.append(button('Visit resident shops',()=>area('shops'),'text-button'));
      if(p.shift)box.append(el('p','Shift from week '+p.shift.week+' · '+p.shift.clerkName+' · '+p.shift.good+' inventory.','market-help'));
      for(const o of (p.options||[]).filter(o=>!['buyWare','buyShopStock','makeWare','markDown','foldStall'].includes(o.action)&&o.good!=='courtyardHome')){
        const card=el('section',null,'market-good'),b=button(o.title,()=>transact(p,o,'purseAction'));
        b.dataset.marketAction='purse-'+o.action+'-'+(o.good||'');b.disabled=!o.available||Boolean(restricted());
        card.append(b);if(o.detail)card.append(el('p',o.detail,'market-help'));appendReason(card,o);box.append(card);
      }
      if(work&&!p.shift&&p.options?.length&&!p.options.some(o=>o.available))
        box.append(button('Find paid work for the district treasury',()=>work('funds'),'text-button'));
      if(p.entries?.length){
        const list=el('ol');
        for(const e of p.entries)list.append(el('li','Week '+e.week+' · '+e.text));
        box.append(el('h4',p.name+'’s receipts'),list);
      }
      return box;
    }
    function records(m){
      const box=el('div',null,'market-page');
      box.append(el('p','Weekly flow includes household use. One-off decisions, trades and paid deliveries enter the free store when they settle.','market-help'));
      const flows=root.EarthMarket.flowDetail(sim.active(),m.rows,sim.state),breakdown=el('details');
      breakdown.append(el('summary','Sources and uses this week'));
      const list=el('ul');
      for(const row of m.rows){
        const lines=flows.filter(p=>p.good===row.good).map(p=>p.source+' '+(p.amount>0?'+':'')+p.amount);
        list.append(el('li',row.name+' · '+lines.join(' · ')));
      }
      breakdown.append(list);box.append(breakdown);
      for(const [name,list] of [['Held in the district',m.held],['Confirmed deliveries',m.incoming],['Paid to active worksites',m.spent]]){
        if(!list.length)continue;
        box.append(el('h4',name));
        const entries=el('ul');for(const row of list)entries.append(el('li',row.source+' · '+quantity(row.good,row.amount)+(row.due?' · week '+row.due:'')));
        box.append(entries);
      }
      if(m.external.length){
        box.append(el('h4','Regional bookings'));
        const bookings=el('ul');
        for(const r of m.external){
          const status=r.phase==='pledge'?'Balance due · '+quantity(r.good,r.balance)+' in week '+r.due:
            r.phase==='outbound'?'Goods due at the partner in week '+r.due:r.phase==='return'?'Return cargo due in week '+r.due:'Booking closed. The deposit goes to the partner.';
          bookings.append(el('li',r.name+' · '+quantity(r.good,r.paid)+' paid. '+status));
        }
        box.append(bookings);
      }
      box.append(el('h4','Exchange receipts'));
      const receipts=el('ol');
      if(!m.history.length)box.append(el('p','The operator opens with 3 food, 2 materials and 8 private funds. Your first trade opens the receipt book.','market-help'));
      else{
        for(const entry of m.history)receipts.append(el('li','Week '+entry.week+' · '+entry.text));
        box.append(receipts);
      }
      return box;
    }
    function render(){
      const site=sim.active();if(!site||!visible())return;
      const siteId=identity(site);if(siteId!==currentSite){invalidate();currentSite=siteId;}
      const actor=root.EarthAgency?.actorId?.(site)||'steward';
      if(trip&&(trip.week!==sim.state.week||trip.actorId!==actor)){
        feedback=trip.week!==sim.state.week?'The week changed during the journey. Choose a current offer.':
          'The worker changed during the journey. Choose an offer for the current character.';
        trip=null;key='';
      }
      const stamp=[siteId,sim.state.week,sim.state.actionRevision||0,sim.state.workRevision||0,site.exchange?.serial||0,site.provisions?.serial||0,
        site.purses?.serial||0,site.resourceLedger?.serial||0,tab==='shops'&&site.growth?.round,actor,tab,selectedResource,feedback].join('|');
      if(stamp===key)return;
      const m=['purse','shops'].includes(tab)?null:sim.marketView?.()||root.EarthMarket.view(sim.state,site);
      if(!m&&!['purse','shops'].includes(tab))return;
      const focus=doc.activeElement?.dataset?.marketAction;
      const nav=el('div',null,'market-tabs');
      const areas=[['trade','Exchange'],['orders','Orders & reserves'],['records','Accounts']];
      if(sim.purseView)areas.splice(1,0,['purse','Personal funds']);
      if(root.EarthResidentShops&&sim.purseView)areas.splice(1,0,['shops','Resident shops']);
      if(root.EarthResources)areas.splice(1,0,['resources','Local resources']);
      for(const [id,label] of areas){
        const b=button(label,()=>area(id),'text-button');
        b.dataset.marketAction='section-'+id;b.setAttribute('aria-pressed',String(id===tab));nav.append(b);
      }
      const items=tab==='shops'?[nav,shopsPage()]:tab==='purse'?[nav,pursePage()]:[stockTable(m),nav,tab==='trade'?tradeshown(m):tab==='resources'?resourcePage(m):tab==='orders'?orders(m):records(m)];
      if(feedback&&tab!=='resources'){const f=el('p',feedback,'market-feedback');f.setAttribute('role','status');items.push(f);}
      const restriction=restricted();
      if(restriction)items.unshift(el('p',restriction,'market-feedback'));
      body.replaceChildren(...items);key=stamp;
      if(focus){const same=Array.from(body.querySelectorAll('[data-market-action]')).find(b=>!b.disabled&&b.dataset.marketAction===focus);same?.focus({preventScroll:true});}
    }
    function snapshot(){return {tab,packAt,cratesOpen,selectedCrate,...(selectedResource?{selectedResource}:{}),...(selectedWare?{selectedWare}:{})};}
    function restore(saved){
      invalidate();
      const site=sim.active();if(!site)return false;
      currentSite=identity(site);
      tab=saved?.tab==='shops'&&root.EarthResidentShops&&sim.purseView?'shops':saved?.tab==='purse'&&sim.purseView?'purse':['trade','orders','records'].includes(saved?.tab)||saved?.tab==='resources'&&root.EarthResources?saved.tab:'trade';
      selectedWare=typeof saved?.selectedWare==='string'?saved.selectedWare:null;
      selectedResource=typeof saved?.selectedResource==='string'?saved.selectedResource:null;
      packAt=saved?.packAt==='quay'&&quayProof&&meetQuay&&street()?.getState?.().waterfront?'quay':'market';
      cratesOpen=saved?.cratesOpen===true;
      if(saved?.selectedCrate!=null&&sim.provisionsView?.()?.crates?.some(c=>c.id===saved.selectedCrate))selectedCrate=saved.selectedCrate;
      render();return true;
    }
    function openResources(id){
      const site=sim.active();if(!site||!root.EarthResources)return false;
      if(currentSite!==identity(site)){invalidate();currentSite=identity(site);}
      selectedResource=typeof id==='string'?id:null;area('resources');return true;
    }
    function openPurse(){
      const site=sim.active();if(!site||!sim.purseView)return false;
      if(currentSite!==identity(site)){invalidate();currentSite=identity(site);}
      area('purse');return true;
    }
    function openShop(plot){
      area('shops');
      const shelf=body.querySelector('[data-shop-plot="'+plot+'"]');
      if(shelf){shelf.open=true;shelf.scrollIntoView({block:'nearest'});}
    }
    return {open:render,openShop,openPurse,openResources,render,snapshot,restore,close:invalidate,invalidate};
  }
  root.EarthMarketPanel=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
