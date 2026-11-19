/* Common Earth local worlds. The first world's original key is retained. Every
   additional registry entry has its own storage key so tabs creating worlds do
   not replace one another's lists. Import always allocates a fresh destination. */
(() => {
  'use strict';

  const LEGACY='common-earth.world.v1',FIRST='original';
  const REGISTRY='common-earth.slots.v1.',DATA='common-earth.playthrough.v1.';
  const LAST='common-earth.last-world.v1',TAB='common-earth.tab-world.v1';
  const FORMAT='common-earth-world',MAX_FILE_BYTES=16000000,MAX_VALUES=800000;
  const SUMMARY_CACHE_BYTES=4000000;
  const sizeMessage='Choose a Common Earth JSON file of 16 MB or less.';
  const validId=id=>id===FIRST || typeof id==='string' && /^[a-z0-9][a-z0-9-]{5,70}$/.test(id);
  const dataKey=id=>id===FIRST?LEGACY:DATA+id;
  const fail=message=>({ok:false,message});
  const ok=(message,extra={})=>({ok:true,message,...extra});
  const cleanName=value=>String(value??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim().replace(/\s+/g,' ').slice(0,64);
  const bytes=text=>new TextEncoder().encode(text).length;
  function memory() {
    const map=new Map();
    return {get length(){return map.size;},key(i){return Array.from(map.keys())[i]??null;},
      getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
  }
  function uid(){
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    if(window.crypto?.getRandomValues)return Array.from(window.crypto.getRandomValues(new Uint32Array(4)),v=>v.toString(36)).join('-');
    return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
  }
  function optionalStorage(key){
    try{return window[key] || null;}catch(error){return null;}
  }
  function get(store,key) {
    if(!store)return null;
    try{return store.getItem(key);}catch(error){return null;}
  }
  function put(store,key,value) {
    if(!store)return false;
    try{store.setItem(key,value);return store.getItem(key)===value;}catch(error){return false;}
  }
  function probe(store){
    if(!store)return {read:false,write:false};
    let readable=false,probeKey;
    try{
      store.getItem(LEGACY);readable=true;
      probeKey=REGISTRY+'probe-'+uid();
      store.setItem(probeKey,'1');
      return {read:true,write:store.getItem(probeKey)==='1'};
    }catch(error){return {read:readable,write:false};}
    finally{if(probeKey)try{store.removeItem(probeKey);}catch(error){/* No progress data touched. */}}
  }
  function summaryOf(w) {
    const sites=Array.isArray(w?.sites)?w.sites:[];
    return {week:Number.isSafeInteger(w?.week)?w.week:1,settlements:sites.length,routes:Array.isArray(w?.routes)?w.routes.length:0,
      first:cleanName(sites[0]?.name),active:cleanName(sites.find(s=>s?.id===w.activeId)?.name),
      names:sites.slice(0,4).map(s=>cleanName(s?.name)).filter(Boolean)};
  }
  function safeShape(obj) {
    // Keep only the current branch on the call stack, including in a large
    // transport file. No domain object is spread until the whole tree passes.
    let count=0;
    function visit(value,depth){
      if(++count>MAX_VALUES||depth>40)return false;
      if(value===null||typeof value!=='object')return true;
      if(Array.isArray(value)){
        if(value.length>MAX_VALUES-count)return false;
        for(const item of value)if(!visit(item,depth+1))return false;
      }else{
        for(const key of Object.keys(value)){
          if(key==='__proto__'||key==='prototype'||key==='constructor'||!visit(value[key],depth+1))return false;
        }
      }
      return true;
    }
    return visit(obj,0);
  }
  function checkFile(text) {
    // A UTF-16 code unit takes at most three UTF-8 bytes. Small inputs need
    // no second, encoded copy to establish that they fit.
    if(typeof text!=='string' || text.length>MAX_FILE_BYTES ||
      (text.length>MAX_FILE_BYTES/3 && bytes(text)>MAX_FILE_BYTES))return fail(sizeMessage);
    let content;
    try{content=JSON.parse(text.replace(/^\uFEFF/,''));}catch(error){return fail('This file contains incomplete or invalid JSON.');}
    if(!content || typeof content!=='object' || Array.isArray(content) || !safeShape(content))return fail('This file has an unsupported structure.');
    let name='',world=content;
    if(Object.hasOwn(content,'format')){
      if(content.format!==FORMAT)return fail('This file belongs to another application.');
      if(content.version!==1)return fail('This save-file edition is unsupported. Keep the file for a compatible edition.');
      name=cleanName(content.name);world=content.world;
    }
    if(!world || typeof world!=='object' || world.version!==1)return fail('This world edition is unsupported. The current game reads version 1.');
    const result=window.CommonEarthSim.migrateDetachedSave(world);
    if(!result)return fail('This file failed the game’s integrity check. Your current world is still open.');
    const info=summaryOf(result);
    return {ok:true,snapshot:JSON.stringify(result),name:name||info.first||'Imported world',info};
  }
  function createBlank(){
    const blank=window.CommonEarthSim.create({storage:null});
    try{return JSON.stringify(blank.state);}finally{blank.destroy();}
  }
  function open(options={}) {
    const native=options.storage!==undefined?options.storage:optionalStorage('localStorage');
    const requested=window.EarthWorldStorage?.wrap(native)||native;
    const session=options.session!==undefined?options.session:optionalStorage('sessionStorage');
    const access=probe(requested),durable=access.read?requested:null,temp=memory();
    const retained=new Set(),subscribers=new Set(),views=new Set();
    const locks=options.locks!==undefined?options.locks:window.navigator?.locks;
    let engine,id,unsubscribe,review=null,closed=false,lastSaveMessage='';
    const identity=options.idGenerator || uid;
    function metadata(s,slot) {
      if(slot===FIRST)return {id:FIRST,name:'First world',created:0};
      let blob=get(s,REGISTRY+slot);
      if(!blob)return null;
      try{
        const m=JSON.parse(blob);
        return m.version===1 && m.id===slot && validId(slot) && cleanName(m.name) && Number.isFinite(m.created)?
          {id:slot,name:cleanName(m.name),created:m.created}:null;
      }catch(error){return null;}
    }
    function availableStore(slot){
      if(slot===FIRST)return durable||temp;
      if(metadata(temp,slot))return temp;
      return metadata(durable,slot)?durable:null;
    }
    function backing(slot){return retained.has(slot)?temp:availableStore(slot);}
    // Compare the stored text before reusing a summary. Another tab, an older
    // game edition or a recovered in-memory turn can replace a slot at any time.
    let headers=new Map();
    function storedSummary(source,slot,nextCache,budget) {
      const raw=get(source,dataKey(slot));
      let entry=headers.get(slot);
      if(!entry || raw!==entry.raw){
        let world=null;
        try{if(raw)world=JSON.parse(raw);}catch{/* An unreadable world still has a registry entry. */}
        entry={raw,summary:summaryOf(world)};
      }
      if((raw?.length||0)<=budget.remaining){
        budget.remaining-=raw?.length||0;
        nextCache.set(slot,entry);
      }
      return {...entry.summary,names:[...entry.summary.names]};
    }
    function entries(){
      const slots=new Map([[FIRST,{id:FIRST,name:'First world',created:0}]]);
      for(const source of [durable,temp]){
        if(!source)continue;
        try{
          for(let i=0;i<source.length;i++){
            const k=source.key(i);
            if(typeof k!=='string'||!k.startsWith(REGISTRY))continue;
            const slot=k.slice(REGISTRY.length),m=validId(slot)?metadata(source,slot):null;
            if(m)slots.set(slot,m);
          }
        }catch(error){/* Already readable entries remain available. */}
      }
      return Array.from(slots.values()).sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
    }
    function list() {
      const nextCache=new Map(),budget={remaining:SUMMARY_CACHE_BYTES};
      const worlds=entries().map(meta=>{
        const s=backing(meta.id),selected=meta.id===id;
        const info=selected?summaryOf(engine.state):storedSummary(s,meta.id,nextCache,budget);
        return {...meta,...info,selected,temporary:!durable||s===temp};
      });
      headers=nextCache;
      return worlds;
    }
    function current(){
      const source=availableStore(id),meta=metadata(source,id);
      if(!meta)return undefined;
      return {...meta,...summaryOf(engine.state),selected:true,temporary:!durable||retained.has(id)||source===temp};
    }
    function status(){
      const mode=backing(id)===temp||!durable?'temporary':access.write&&!engine.saveIssue?'autosave':'limited';
      const message=mode==='temporary'?'This world is in this tab only. Export a file before closing it.':
        mode==='limited'?engine.saveMessage||'Browser storage cannot write this world. Export a copy to keep this turn.':
        'Autosave is working in this browser.';
      return {mode,message,durable:mode==='autosave'};
    }
    function notifyViews(){for(const view of views)view();}
    function inform(world,notice) {
      for(const fn of subscribers)fn(world,notice);
      // The saved-world list shows weeks and communities, not work percentages.
      // Keep the focused Open button in place while a crew is on the clock.
      const message=status().message;
      if(!notice.construction || message!==lastSaveMessage)notifyViews();
      lastSaveMessage=message;
    }
    function preserveUnsaved(){
      if(!engine || !durable || backing(id)!==durable || !engine.saveIssue)return;
      if(engine.newerSaveText && !engine.hasUnsavedChoice)return;
      const raw=get(durable,dataKey(id));
      try{if(raw && JSON.parse(raw)?.version>1 && !engine.hasUnsavedChoice)return;}catch(error){/* Keep a recovered legacy turn in memory. */}
      const state=JSON.stringify(engine.state);
      if(state!==raw){temp.setItem(dataKey(id),state);retained.add(id);}
    }
    function activate(slot,announce) {
      const target=backing(slot);
      if(!target)return fail('That saved world is no longer on this device.');
      if(engine && slot===id)return ok('This world is already open.');
      let next;
      try{next=window.CommonEarthSim.create({storage:target,key:dataKey(slot),compressStorage:target!==temp});}
      catch(error){return fail('This world could not be opened. The previous world is still selected.');}
      preserveUnsaved();
      if(unsubscribe)unsubscribe();
      if(engine)engine.destroy();
      id=slot;engine=next;
      lastSaveMessage=status().message;
      unsubscribe=next.subscribe((state,notice)=>{
        if(!notice.external && target===durable && !next.saveIssue)access.write=true;
        inform(state,notice);
      });
      put(session,TAB,id);
      if(target===durable)put(durable,LAST,id);
      review=null;
      const name=metadata(availableStore(slot),slot)?.name||'World';
      const msg='Opened '+name+'.';
      if(announce)inform(engine.state,{external:true,switched:true,message:msg});
      return ok(msg,{id});
    }
    const remembered=[get(session,TAB),get(durable,LAST),FIRST].find(slot=>validId(slot)&&availableStore(slot));
    activate(remembered||FIRST,false);
    const sim={};
    for(const key of Object.keys(engine)){
      if(['subscribe','destroy','perform'].includes(key))continue;
      if(typeof engine[key]==='function')sim[key]=(...args)=>engine[key](...args);
      else Object.defineProperty(sim,key,{enumerable:true,get:()=>key==='saveIssue'?status().mode!=='autosave':key==='saveMessage'?(status().mode==='autosave'?'':status().message):engine[key]});
    }
    sim.subscribe=fn=>{subscribers.add(fn);return ()=>subscribers.delete(fn);};
    sim.perform=async(...args)=>{
      const scope=engine,result=await scope.perform(...args);
      return scope===engine?result:fail('The action belongs to the previously open world.');
    };
    function serial(fn) {
      if(closed)return Promise.resolve(fail('This saved-world collection is closed.'));
      if(!locks?.request)return Promise.resolve().then(fn);
      let acquired=false;
      return Promise.resolve().then(()=>locks.request('common-earth.saved-worlds.v1',()=>{acquired=true;return fn();})).catch(e=>{
        if(!acquired && (e?.name==='SecurityError'||e?.name==='NotSupportedError'))return fn();
        return fail('The local saved-world collection is unavailable.');
      });
    }
    function uniqueName(input) {
      const original=cleanName(input)||'Untitled world';
      const used=new Set(entries().map(m=>m.name.toLocaleLowerCase()));
      let n=1,label=original;
      while(used.has(label.toLocaleLowerCase())){
        const suffix=' ('+(++n)+')';
        label=original.slice(0,64-suffix.length)+suffix;
      }
      return label;
    }
    function rollback(source,key,value) {
      try{if(source.getItem(key)===value)source.removeItem(key);}catch(error){/* An unregistered new payload cannot replace another world. */}
    }
    function register(name,payload,importFile=false) {
      let readyStore=access.write?durable:temp;
      let slot;
      for(let i=0;i<12;i++){
        const candidate=identity();
        if(validId(candidate) && candidate!==FIRST && !availableStore(candidate) && get(readyStore,dataKey(candidate))===null){slot=candidate;break;}
      }
      if(!slot)return fail('Could not allocate a separate save. Your current world is still open.');
      const label=uniqueName(name),meta=JSON.stringify({version:1,id:slot,name:label,created:Date.now()});
      const key=dataKey(slot),labelKey=REGISTRY+slot;
      function writeRegistration(source){
        if(!put(source,key,payload)){rollback(source,key,payload);return 'There is too little writable browser storage for this world. Your current world is still open.';}
        if(!put(source,labelKey,meta)){rollback(source,labelKey,meta);rollback(source,key,payload);return 'The browser could not register the new world. Your current world is still open.';}
        return '';
      }
      let issue=writeRegistration(readyStore);
      if(issue && importFile && readyStore!==temp){
        readyStore=temp;
        issue=writeRegistration(readyStore);
      }
      if(issue)return fail(issue);
      const activated=activate(slot,true);
      if(!activated.ok){rollback(readyStore,labelKey,meta);rollback(readyStore,key,payload);}
      else if(importFile && readyStore===temp)return ok(activated.message+' This imported world is in this tab only. Keep your file and export changes before closing the tab.',{id:slot,temporary:true});
      return activated;
    }
    function create(name){return serial(()=>register(name||'New world',createBlank()));}
    function copy(name){
      const scope=engine,sourceName=current().name;
      return serial(()=>{
        if(scope!==engine)return fail('The source world has changed. Choose the world to copy again.');
        scope.sync();
        const raw=scope.newerSaveText||get(backing(id),dataKey(id));
        try{if(raw&&JSON.parse(raw)?.version>1&&!scope.hasUnsavedChoice)return fail('A newer edition is needed to copy this world.');}catch(error){/* A recovered valid state can be copied. */}
        const sourceId=id,diverged=scope.hasDiverged;
        const result=register(name||sourceName+' copy',JSON.stringify(scope.state));
        if(result.ok && diverged){
          // The copy now holds this branch. Reveal the other tab's saved turn
          // immediately when the player selects the original world again.
          retained.delete(sourceId);temp.removeItem(dataKey(sourceId));notifyViews();
        }
        return result;
      });
    }
    function select(slot){return serial(()=>validId(slot)?activate(slot,true):fail('Unknown saved world.'));}
    function exportWorld(){
      const meta=current();
      engine.sync();
      const fileBase=(meta.name||'Common Earth').normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,50)||'Common-Earth';
      const legacyRaw=engine.newerSaveText||get(backing(id),dataKey(id));
      try{
        if(legacyRaw && JSON.parse(legacyRaw)?.version>1 && !engine.hasUnsavedChoice)return {ok:true,filename:fileBase+'-original.json',text:legacyRaw};
      }catch(error){/* Export the recovered turn. */}
      const file={format:FORMAT,version:1,name:meta.name,world:engine.state};
      return {ok:true,filename:fileBase+'-week-'+engine.state.week+'.json',text:JSON.stringify(file)};
    }
    function prepareImport(text) {
      review=null;
      const r=checkFile(text);
      if(!r.ok)return r;
      const token=uid();
      review={token,snapshot:r.snapshot};
      return {ok:true,token,name:r.name,info:r.info};
    }
    function confirmImport(token,name){
      const request=review;
      return serial(()=>{
        if(!review || request!==review || token!==review.token)return fail('Review the selected file again before importing.');
        const r=register(name||'Imported world',review.snapshot,true);
        if(r.ok)review=null;
        return r;
      });
    }
    function onStore(e){
      if(!e.key || e.key.startsWith(REGISTRY)){notifyViews();return;}
      // The active engine handles its own storage events. Refresh a visible
      // collection when another tab advances an inactive world.
      if(e.key===dataKey(id))return;
      if(e.key===LEGACY || e.key.startsWith(DATA) && validId(e.key.slice(DATA.length)))notifyViews();
    }
    if(window.addEventListener)window.addEventListener('storage',onStore);
    function dispose(){
      closed=true;review=null;headers.clear();
      unsubscribe?.();engine.destroy();subscribers.clear();views.clear();
      window.removeEventListener?.('storage',onStore);
    }
    sim.destroy=dispose;
    const book={sim,list,current,status,create,copy,select,exportWorld,prepareImport,confirmImport,
      cancelImport(){review=null;},watch(fn){views.add(fn);return ()=>views.delete(fn);},
      mount(el,options){return mount(el,book,options);},dispose};
    return book;
  }
  function mount(el,book,{section=false}={}) {
    if(!el){const noop=()=>{};noop.refresh=noop;return noop;}
    function node(tag,text,cls) {
      const n=document.createElement(tag);
      if(text!==null && text!==undefined)n.textContent=text;
      if(cls)n.className=cls;
      return n;
    }
    function button(label,fn){
      const b=node('button',label,'save-button');b.type='button';b.addEventListener('click',fn);return b;
    }
    const details=section?null:node('details',null,'save-manager');
    const body=node('div',null,'save-body'),statusLine=node('p',null,'save-status'),list=node('ul',null,'save-list');
    const notice=node('p',null,'save-notice');notice.setAttribute('role','status');notice.hidden=true;
    const setNote=(text,error=false)=>{notice.textContent=text;notice.hidden=!text;notice.classList.toggle('warning',error);};
    let work=false,revision=0,lastId=null,displayed='';
    const review=node('section',null,'save-review');review.hidden=true;
    function clearReview(){
      revision++;book.cancelImport();review.replaceChildren();review.hidden=true;
    }
    async function run(fn){
      if(work)return;
      work=true;body.setAttribute('aria-busy','true');
      try{
        const r=await fn();setNote(r.message,!r.ok);return r;
      }catch(error){setNote('The change could not be completed. Your current world is still available.',true);}
      finally{work=false;body.removeAttribute('aria-busy');refresh();}
    }
    const nameLabel=node('label','World name','save-label'),name=node('input');
    name.type='text';name.maxLength=64;name.placeholder='Name your new world';name.autocomplete='off';nameLabel.append(name);
    const createRow=node('div',null,'save-buttons');
    createRow.append(button('Start empty world',()=>run(async()=>{
      const r=await book.create(name.value);if(r.ok)name.value='';return r;
    })),button('Copy current world',()=>run(async()=>{
      const r=await book.copy(name.value);if(r.ok)name.value='';return r;
    })));
    const transport=node('div',null,'save-buttons');
    const file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
    const pickFile=button('Import JSON…',()=>{file.value='';file.click();});
    const exportButton=button('Export current world',()=>{
      try{
        const out=book.exportWorld(),href=URL.createObjectURL(new Blob([out.text],{type:'application/json'}));
        const a=node('a');a.href=href;a.download=out.filename;document.body.append(a);a.click();a.remove();
        window.setTimeout(()=>URL.revokeObjectURL(href),10000);
        setNote('Prepared '+out.filename+' for download.');
      }catch(error){setNote('The browser could not create a download.',true);}
    });
    transport.append(exportButton,pickFile,file);
    file.addEventListener('change',async()=>{
      clearReview();const ticket=revision,source=file.files?.[0];if(!source)return;
      if(source.size>MAX_FILE_BYTES){setNote(sizeMessage,true);return;}
      try{
        const raw=await source.text();if(ticket!==revision)return;
        const prepared=book.prepareImport(raw);
        if(!prepared.ok){setNote(prepared.message,true);return;}
        const title=node('h4','Review this import');
        const p=prepared.info;
        const summary=node('p','Week '+p.week+' · '+p.settlements+' '+(p.settlements===1?'community':'communities')+' · '+p.routes+' '+(p.routes===1?'route':'routes'));
        const places=p.names.length?node('p',p.names.join(' · ')+(p.settlements>p.names.length?' …':'')):null;
        const label=node('label','Name for the imported copy','save-label'),input=node('input');
        input.type='text';input.maxLength=64;input.value=prepared.name;label.append(input);
        const row=node('div',null,'save-buttons');
        row.append(button('Import as separate world',()=>run(async()=>{
          const r=await book.confirmImport(prepared.token,input.value);
          if(r.ok){clearReview();file.value='';}
          return r;
        })),button('Cancel',()=>{clearReview();file.value='';setNote('Import cancelled.');pickFile.focus();}));
        review.replaceChildren(title,summary);if(places)review.append(places);
        review.append(label,row);review.hidden=false;setNote('Review the file before adding a separate world.');input.focus();
      }catch(error){setNote('The browser could not read that file.',true);}
    });
    function refresh() {
      if(work || details && !details.open || section && el.closest?.('[hidden]'))return;
      const slots=book.list(),current=slots.find(slot=>slot.selected),status=book.status();
      if(lastId!==null && current.id!==lastId)clearReview();
      lastId=current.id;
      if(statusLine.textContent!==status.message)statusLine.textContent=status.message;
      // Construction and personal jobs can save while this sheet has focus.
      // Keep the same controls until a value shown in the list actually changes.
      const signature=JSON.stringify(slots.map(slot=>[slot.id,slot.name,slot.week,slot.settlements,slot.temporary,slot.selected]));
      if(displayed===signature)return;
      displayed=signature;
      list.replaceChildren();
      for(const slot of slots){
        const li=node('li'),info=node('div'),title=node('strong',slot.name),meta=node('small',
          'Week '+slot.week+' · '+slot.settlements+' '+(slot.settlements===1?'community':'communities')+(slot.temporary?' · tab only':''));
        info.append(title,meta);li.append(info);
        if(slot.selected){const currentLabel=node('span','Open','save-current');currentLabel.setAttribute('aria-label','Current world');li.append(currentLabel);}
        else {
          const select=button('Open',()=>run(()=>book.select(slot.id)));
          select.setAttribute('aria-label','Open '+slot.name);li.append(select);
        }
        list.append(li);
      }
    }
    body.append(statusLine,list,nameLabel,createRow,transport,review,notice);
    if(details){
      details.append(node('summary','Saved worlds'),body);
      details.addEventListener('toggle',refresh);
      el.replaceChildren(details);
    }else el.replaceChildren(body);
    function refreshVisible(){
      // Closed popovers and hidden Chronicle tabs do not need a storage scan.
      if(section && (el.closest?.('[hidden]') || el.getClientRects?.().length===0))return;
      refresh();
    }
    const off=book.watch(refreshVisible);
    if(section)refreshVisible();
    function cleanup(){off();clearReview();el.replaceChildren();}
    cleanup.refresh=refresh;
    return cleanup;
  }
  window.EarthSaves=Object.freeze({open,maxBytes:MAX_FILE_BYTES});
})();
