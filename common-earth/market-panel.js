/* Mounted inside the Street HUD. The ledger is read-only anywhere in the
   district. A transaction walks or drives the character to the real stall. */
(function(root){
  'use strict';
  const title=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function mount(section,{sim,street,version,meet,quayProof,meetQuay,onResult,after,work}){
    if(!section||!root.EarthMarket)return null;
    const doc=section.ownerDocument,body=section.querySelector('[data-market-content]')||section;
    let generation=0,key='',busy=null,trip=null,feedback='',currentSite='',tab='trade',packAt='market',cratesOpen=false,selectedCrate=null;
    function el(tag,text,cls){
      const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;
    }
    function button(text,fn,cls='secondary-button'){
      const b=el('button',text,cls);b.type='button';
      b.addEventListener('click',()=>{if(b.isConnected)fn();});return b;
    }
    function visible(){return Boolean(!doc.hidden&&!section.closest('[hidden]')&&street());}
    function identity(site){return [site.id,site.foundingRevision||0,site.lat,site.lon].join('/');}
    function invalidate(){generation++;key='';trip=null;busy=null;feedback='';currentSite='';tab='trade';packAt='market';cratesOpen=false;selectedCrate=null;}
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)invalidate();});
    function area(name){tab=name;trip=null;generation++;key='';feedback='';render();}
    function show(message){feedback=message;key='';render();}
    function transact(view,option,kind='exchange'){
      if(!option.available||busy||!visible())return;
      const request={week:view.week,actorId:view.actorId,siteId:view.siteId,generation:view.generation,
        serial:view.serial,action:option.action};
      const provision=kind==='provision',quay=provision&&packAt==='quay';
      if(provision){if(option.crateId!=null)request.crateId=option.crateId;}
      else{request.good=option.good;request.price=option.price;}
      const local=street(),phase=generation,ref={type:'market'};
      if(provision&&local.getState?.().mode&&local.getState().mode!=='walk'){
        show('Come ashore or park and step out to handle a provision crate.');return;
      }
      const station=quay?'the waterfront quay':'the exchange counter';
      const position=()=>quay?quayProof?.():local.meeting(ref,true);
      const pending={};trip=pending;
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
          if(result.ok)after?.();
          key='';render();
        }finally{if(busy===operation)busy=null;}
      }
      if(position()){commit();return;}
      const started=quay?meetQuay?.(commit):meet?.(ref,station,commit);
      if(started===false){trip=null;show('Reach '+station+' to complete this action.');}
      else if(trip===pending)show('Travelling to '+station+' for '+(option.title||option.label).toLowerCase()+'.');
    }
    function actionButton(model,o){
      const b=button(o.title,()=>transact(model,o));b.disabled=!o.available;b.dataset.marketAction=o.action+'-'+o.good;
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
      result.append(el('p','Stall till · '+m.till+' funds. Buyers pay more when a shelf is low.','market-help'));
      if(m.loaded)result.append(el('p','On the co-op truck · 1 '+m.loaded+' awaiting delivery. Its return space is reserved.','market-help'));
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
      result.append(el('p','Next round · visitors seek up to '+n.demand+' '+n.customerGood+'. Suppliers offer up to '+n.supply+' '+n.supplyGood+' at '+n.wholesale+' funds each, subject to shelf space and cash.','market-help'));
      return result;
    }
    function provisions(){
      const model=sim.provisionsView?.();if(!model)return null;
      const group=el('details',null,'market-provisions');group.open=cratesOpen;
      group.addEventListener('toggle',()=>{if(group.isConnected)cratesOpen=group.open;});
      group.append(el('summary','Provision crates · '+model.used+'/'+model.capacity));
      const card=el('div',null,'market-page');
      card.append(el('p',model.freshFood+' fresh food · '+model.materials+' materials · '+model.reservedFood+' sealed food reserved for households.','market-help'));
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
        b.disabled=!o.available;b.dataset.marketAction='provision-'+o.action+'-'+(o.crateId??'');row.append(b);
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
      box.append(el('h4','Project chest'),el('p',m.locked.materials+' materials · '+m.locked.funds+' funds · '+m.lockCapacity+' spaces. Held goods are protected from trade and spending.','market-help'));
      for(const good of ['materials','funds']){
        const row=el('div',null,'market-buttons');
        for(const o of m.options.filter(x=>x.good===good&&(x.action==='hold'||x.action==='release')))row.append(actionButton(m,o));
        box.append(row);
      }
      return box;
    }
    function records(m){
      const box=el('div',null,'market-page');
      box.append(el('p','Weekly flow includes household use. One-off decisions, trades and paid deliveries enter the free store when they settle.','market-help'));
      const flows=root.EarthMarket.flowDetail(sim.active(),m.rows),breakdown=el('details');
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
        const entries=el('ul');for(const row of list)entries.append(el('li',row.source+' · '+row.amount+' '+row.good+(row.due?' · week '+row.due:'')));
        box.append(entries);
      }
      if(m.external.length){
        box.append(el('h4','Regional bookings'));
        const bookings=el('ul');
        for(const r of m.external){
          const status=r.phase==='pledge'?'Balance due · '+r.balance+' '+r.good+' in week '+r.due:
            r.phase==='outbound'?'Goods due at the partner in week '+r.due:r.phase==='return'?'Return cargo due in week '+r.due:'Booking closed. The deposit goes to the partner.';
          bookings.append(el('li',r.name+' · '+r.paid+' '+r.good+' paid. '+status));
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
      const stamp=[siteId,sim.state.week,sim.state.actionRevision||0,sim.state.workRevision||0,site.exchange?.serial||0,site.provisions?.serial||0,tab,feedback].join('|');
      if(stamp===key)return;
      const m=sim.marketView?.()||root.EarthMarket.view(sim.state,site);
      if(!m)return;
      const focus=doc.activeElement?.dataset?.marketAction;
      const nav=el('div',null,'market-tabs');
      for(const [id,label] of [['trade','Exchange'],['orders','Orders & reserves'],['records','Accounts']]){
        const b=button(label,()=>area(id),'text-button');
        b.dataset.marketAction='section-'+id;b.setAttribute('aria-pressed',String(id===tab));nav.append(b);
      }
      const items=[stockTable(m),nav,tab==='trade'?tradeshown(m):tab==='orders'?orders(m):records(m)];
      if(feedback){const f=el('p',feedback,'market-feedback');f.setAttribute('role','status');items.push(f);}
      body.replaceChildren(...items);key=stamp;
      if(focus){const same=Array.from(body.querySelectorAll('[data-market-action]')).find(b=>!b.disabled&&b.dataset.marketAction===focus);same?.focus({preventScroll:true});}
    }
    function snapshot(){return {tab,packAt,cratesOpen,selectedCrate};}
    function restore(saved){
      invalidate();
      const site=sim.active();if(!site)return false;
      currentSite=identity(site);
      tab=['trade','orders','records'].includes(saved?.tab)?saved.tab:'trade';
      packAt=saved?.packAt==='quay'&&quayProof&&meetQuay&&street()?.getState?.().waterfront?'quay':'market';
      cratesOpen=saved?.cratesOpen===true;
      if(saved?.selectedCrate!=null&&sim.provisionsView?.()?.crates?.some(c=>c.id===saved.selectedCrate))selectedCrate=saved.selectedCrate;
      render();return true;
    }
    return {open:render,render,snapshot,restore,close:invalidate,invalidate};
  }
  root.EarthMarketPanel=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
