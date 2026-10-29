(function () {
  'use strict';
  const C = window.FormShapePractice, P = window.FormProgress, G = window.FormGeometry;
  if (!C || !P || !G) {
    document.getElementById('storage-warning').hidden = false;
    document.getElementById('storage-warning').textContent = 'A site module could not load. Keep all source files together, or open the single-file offline edition.';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stages = C.STAGES;
  const stageById = id => stages.find(stage => stage.id === id) || stages[0];
  const dateLabel = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, {month:'short',day:'numeric'}) : ''; };
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const loaded = P.loadProgress(storage);
  let state = loaded.state;
  // Earlier sessions are opaque archive data. No retired lesson engine runs
  // or rewrites them; private exports retain the validated original record.
  let selectedStage = 'circle';
  let training = null;
  let mountedStage = null;
  let currentView = '';
  let practiceStage = selectedStage;
  let palaceFilter = 'all';
  let toastTimer = null;
  let confirmResolver = null;
  let saveWarningShown = false;
  let storageConflict = false;
  let savedSnapshot = null;
  try { savedSnapshot = storage ? storage.getItem(P.STORAGE_KEY) : null; } catch (_) {}
  let archiveWarning = loaded.warning;
  let recoveryRequired = !!archiveWarning && !!storage;
  const motionPreference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionPreference) state.preferences.reducedMotion = true;

  function toast(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
  }
  function warnStorage(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = false; }
  function downloadSavedOriginal(){
    if(typeof savedSnapshot!=='string'||!savedSnapshot){toast('The browser did not allow the saved value to be read. Its existing storage has not been replaced.');return;}
    const url=URL.createObjectURL(new Blob([savedSnapshot],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='Philosophy-of-Intelligence-recovery-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function showRecovery(){
    $('storage-warning').hidden=false;
    $('storage-warning').innerHTML='This archive could not be loaded. Its original data has been kept. Download it before replacing the archive. <span class="storage-actions"><button id="download-recovery">Download saved data</button><button id="reset-recovery">Start a new archive</button></span>';
    $('download-recovery').addEventListener('click',downloadSavedOriginal);
    $('reset-recovery').addEventListener('click',()=>{$('reset-data').click();});
  }
  function noticeStorageConflict(){
    if(storageConflict)return;
    storageConflict=true;
    $('storage-warning').hidden=currentView!=='palace';
    $('storage-warning').innerHTML='Another tab saved newer archive records. This tab cannot overwrite them. Export this tab’s archive if you need it, then reload the saved version. <span class="storage-actions"><button id="export-current-tab">Export this archive</button><button id="reload-saved-progress">Reload saved version</button></span>';
    $('export-current-tab').addEventListener('click',()=>{if(recoveryRequired)downloadSavedOriginal();else $('export-data').click();});
    $('reload-saved-progress').addEventListener('click',()=>{location.reload();});
  }
  function canWrite(){
    if(recoveryRequired){toast('Your original saved data is protected. Use the recovery banner or import a valid backup to continue.');return false;}
    if(!storageConflict&&storage){try{if(storage.getItem(P.STORAGE_KEY)!==savedSnapshot)noticeStorageConflict();}catch(_) {}}
    if(storageConflict){toast('Newer archive records are protected. Export or reload using the banner.');return false;}
    return true;
  }
  function persist() {
    if(!canWrite())return;
    const result = P.saveProgress(storage,state);
    if(result.ok){try{savedSnapshot=storage.getItem(P.STORAGE_KEY);}catch(_) {}}
    if (!result.ok && !saveWarningShown) { warnStorage('This archive is only in this tab: ' + result.error + ' You can export a copy here.'); saveWarningShown = true; }
  }
  function storeEntry(collection,entry,index){
    if(!canWrite())return false;
    const entries=state[collection].slice();
    if(Number.isInteger(index)&&index>=0)entries[index]=entry;else entries.push(entry);
    if(!P.canStorePrivate({...state,[collection]:entries})){
      toast('This entry would exceed your journal’s capacity. Your draft is still here. Export and remove an older entry before saving it.');return false;
    }
    state[collection]=entries;return true;
  }
  function showDialog(id) {
    const dialog = $(id);
    if (!dialog.open) dialog.showModal();
  }
  function confirmAction(title,message,buttonLabel) {
    if (confirmResolver) confirmResolver(false);
    $('confirm-title').textContent = title; $('confirm-message').textContent = message; $('confirm-ok').textContent = buttonLabel || 'Continue';
    showDialog('confirm-dialog');
    return new Promise(resolve => { confirmResolver = resolve; });
  }
  function finishConfirm(value) { $('confirm-dialog').close(); const resolve = confirmResolver; confirmResolver = null; if (resolve) resolve(value); }
  $('confirm-ok').addEventListener('click',() => finishConfirm(true));
  $('confirm-cancel').addEventListener('click',() => finishConfirm(false));
  $('confirm-dialog').addEventListener('cancel',() => { const resolve=confirmResolver;confirmResolver=null;if(resolve)resolve(false); });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close(); } });
  });

  function applyMotion() { document.body.classList.toggle('reduced-motion',state.preferences.reducedMotion); }
  function renderJourney(){
    $('stage-path').innerHTML=stages.map((stage,index)=>`<a class="stage-tile ${stage.id===selectedStage?'selected':''}" href="#practice/${esc(stage.id)}" data-stage="${esc(stage.id)}" aria-label="${esc(stage.name)} · Explore"><span class="stage-number">${String(index+1).padStart(2,'0')}</span><span class="stage-icon" aria-hidden="true">${G.miniIcon(stage.id,65)}</span><span class="stage-name">${esc(stage.name)}</span><span class="stage-status">Explore</span></a>`).join('');
  }

  function sourceHTML(source, className){
    if(!source)return '';
    const items=Array.isArray(source.items)?source.items.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
    return `<section class="source-card ${className||''}"><p class="eyebrow">${esc(source.title||'SOURCE RECORD')}</p>${source.body?`<p class="source-body">${esc(source.body)}</p>`:''}${items.length?`<div class="source-items">${items.map(item=>`<div class="source-item">${item.color?`<span class="item-color ${item.shape==='circle'?'circle':''}" style="background:${safeColor(item.color)}" aria-hidden="true"></span>`:''}<span class="source-item-content"><span>${esc(item.label)}</span>${item.value!==undefined&&!String(item.label).includes('value '+item.value)?`<small>${esc(item.value)}</small>`:''}</span></div>`).join('')}</div>`:''}</section>`;
  }
  function safeColor(value){const colors={red:'#bc563c',blue:'#487e9c',green:'#38826e',gold:'#bc9347',amber:'#bc9347',violet:'#8171a6',coral:'#bc6b55',teal:'#237a72'};return colors[value]||'#667d70';}
  function renderPractice(){
    const root=$('training-root');
    if(!window.FormTraining){
      root.innerHTML='<div class="empty-state"><h1>Practice could not load.</h1><p>Reload this page to load the practice files.</p><a class="button secondary" href="#journey">Return to the shapes</a></div>';
      return;
    }
    if(!training){
      training=window.FormTraining.mount({
        root,
        stageId:practiceStage,
        onStageChange(id){
          const stage=stageById(id);
          const target='#practice/'+stage.id;
          if(location.hash!==target)location.hash=target;
        }
      });
      mountedStage=practiceStage;
    }else if(mountedStage!==practiceStage){
      training.setStage(practiceStage);
      mountedStage=practiceStage;
    }
  }

  function allEntries(){return [...state.palace.map(p=>({...p,_type:'principle'})),...state.journal.map(p=>({...p,_type:'personal'}))].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  function renderPalace(){
    const entries=allEntries(),visible=entries.filter(e=>palaceFilter==='all'||e._type===palaceFilter);
    $('palace-rooms').innerHTML=['Atrium','Window','Alcove','Bridge','Garden'].map(room=>`<div class="room-card"><span>${room}</span><small>${entries.filter(e=>(e.locus||'Atrium')===room).length.toString().padStart(2,'0')}</small></div>`).join('');
    document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===palaceFilter);b.setAttribute('aria-pressed',String(b.dataset.filter===palaceFilter));});
    $('palace-entries').innerHTML=visible.length?visible.map(entry=>`<button class="palace-entry" data-entry="${esc(entry.id)}"><span class="entry-meta"><span>${esc(String(entry.locus||'Atrium').toUpperCase())} · ${entry._type==='personal'?'PRIVATE OBSERVATION':'PRINCIPLE'}</span><span>${esc(dateLabel(entry.createdAt))}</span></span><h3>${esc(entry.title||String(entry.source||'An observation').slice(0,72))}</h3><p>${esc(entry._type==='personal'?entry.relation||entry.source:entry.body)}</p><span class="entry-footer">${esc(stageById(entry.stageId).name)} · Open & revisit →</span></button>`).join(''):`<div class="empty-state">${G.miniIcon('prism',75)}<h2>A place for the connections.</h2><p>${palaceFilter==='all'?'Your saved observations and principles are kept here. Open practice to continue exploring a shape.':'No '+(palaceFilter==='personal'?'observations':'principles')+' here yet.'}</p><a class="button primary" href="#practice/${esc(selectedStage)}">Open practice ↗</a></div>`;
  }
  function findEntry(id){return state.palace.find(e=>e.id===id)||state.journal.find(e=>e.id===id);}
  function predictionHTML(entry){
    const prediction=entry.prediction;if(!prediction||typeof prediction!=='object')return '';
    const evidence=Array.isArray(entry.evidence)?entry.evidence.filter(e=>e&&typeof e==='object'):[];
    return `<section class="prediction-record"><p class="eyebrow">PREDICTION KEPT · ${esc(dateLabel(prediction.committedAt))}</p><h3>When might it apply?</h3><p>${esc(prediction.condition)}</p><h3>What I expect to observe</h3><p>${esc(prediction.expected)}</p><h3>What would make me revise it</h3><p>${esc(prediction.revisionTrigger)}</p></section><section class="evidence-record"><h3>Return with an observation</h3>${evidence.map(e=>`<div class="revision-item"><small>${esc(dateLabel(e.at))} · ${e.verdict==='supports'?'SUPPORTS':e.verdict==='challenges'?'CHALLENGES':'STILL UNCLEAR'}</small><p>${esc(e.observation)}</p>${e.revision?`<strong>My revision</strong><p>${esc(e.revision)}</p>`:''}</div>`).join('')}<label for="evidence-observation">What happened?</label><p class="field-help">Describe the observation separately from your explanation.</p><textarea id="evidence-observation" rows="3" maxlength="3000" placeholder="The observation I can report…"></textarea><label for="evidence-verdict">How does it bear on the prediction?</label><select id="evidence-verdict"><option value="unclear">Still unclear</option><option value="supports">Supports it</option><option value="challenges">Challenges it</option></select><label for="evidence-revision">What will you change, if anything?</label><textarea id="evidence-revision" rows="2" maxlength="3000" placeholder="A narrower rule, an alternative explanation, or another test…"></textarea><button class="button primary" id="save-evidence">Add evidence and revision</button><p class="microcopy">Your original prediction stays visible. This is private self-review; The practice does not determine whether your interpretation is true.</p></section>`;
  }
  function showEntry(id){
    const entry=findEntry(id);if(!entry)return;
    const personal=state.journal.includes(entry),revisions=Array.isArray(entry.revisions)?entry.revisions.filter(r=>r&&typeof r==='object'):[];
    $('detail-content').innerHTML=`<p class="eyebrow">${personal?'PRIVATE OBSERVATION':'PRESERVED PRINCIPLE'} · ${esc(entry.locus||'Atrium')}</p><h2 id="detail-title">${esc(entry.title||'An observation')}</h2>${personal?`<h3>Original observation</h3><p>${esc(entry.source)}</p>${entry.referenceSource?`<h3>The earlier source · ${esc(entry.lag)}-back</h3><p>${esc(entry.referenceSource)}</p><h3>Recollection before reveal</h3><p>${esc(entry.recollection||'No recollection recorded.')}</p>`:''}${entry.relation?`<h3>Relation / interpretation</h3><p>${esc(entry.relation)}</p>`:''}${entry.function?`<h3>A function to test</h3><p>${esc(entry.function)}</p>`:''}`:`<p>${esc(entry.body)}</p>${typeof entry.source==='object'?sourceHTML(entry.source):''}`}${predictionHTML(entry)}<div class="revision-list"><h3>Later notes</h3>${revisions.length?revisions.map(r=>`<div class="revision-item"><small>${esc(dateLabel(r.at))}</small><br>${esc(r.text)}</div>`).join(''):'<p class="microcopy">The original stays as written. New interpretations are added below it.</p>'}<label for="revision-text">Add a later note</label><textarea id="revision-text" rows="3" maxlength="3000" placeholder="What changed? What evidence supports the revision?"></textarea><div class="dialog-actions"><button class="button secondary" id="delete-entry">Remove entry</button><button class="button primary" id="save-revision">Add revision</button></div></div>`;
    if(entry.prediction)$('save-evidence').addEventListener('click',()=>{const observation=$('evidence-observation').value.trim();if(!observation){$('evidence-observation').focus();return;}const evidence=Array.isArray(entry.evidence)?entry.evidence:[];if(evidence.length>=20){toast('This prediction has 20 evidence records. Export it before beginning a new prediction.');return;}const collection=personal?'journal':'palace';if(!storeEntry(collection,{...entry,evidence:[...evidence,{observation,verdict:$('evidence-verdict').value,revision:$('evidence-revision').value.trim(),at:new Date().toISOString()}],private:true},state[collection].findIndex(e=>e.id===id)))return;persist();showEntry(id);$('evidence-observation').focus({preventScroll:true});toast('Evidence added beside your original prediction.');});
    $('save-revision').addEventListener('click',()=>{const note=$('revision-text').value.trim();if(!note)return;if(revisions.length>=20){toast('This entry has reached 20 revisions. Export it before starting another.');return;}const collection=personal?'journal':'palace';if(!storeEntry(collection,{...entry,revisions:[...revisions,{at:new Date().toISOString(),text:note}],private:true},state[collection].findIndex(e=>e.id===id)))return;persist();showEntry(id);$('revision-text').focus({preventScroll:true});toast('Revision added. The original is unchanged.');});
    $('delete-entry').addEventListener('click',async()=>{
      $('detail-dialog').close();if(!await confirmAction('Remove this entry?','This removes the entry and its revisions from this device. Other entries keep their own preserved reference sources.','Remove entry')){showEntry(id);return;}
      if(!canWrite())return;
      state.journal=state.journal.filter(e=>e.id!==id);state.palace=state.palace.filter(e=>e.id!==id);persist();renderPalace();toast('Entry removed.');
    });showDialog('detail-dialog');
  }
  $('palace-entries').addEventListener('click',event=>{const entry=event.target.closest('[data-entry]');if(entry)showEntry(entry.dataset.entry);});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{palaceFilter=button.dataset.filter;renderPalace();}));
  $('export-data').addEventListener('click',()=>{
    $('detail-content').innerHTML='<p class="eyebrow">KEEP YOUR ARCHIVE</p><h2 id="detail-title">A copy of your archive.</h2><p>Export these saved records as a JSON file. Use the export control inside practice for your current training.</p><label class="checkbox-line"><input id="export-private" type="checkbox"><span>Include private observations, personal revisions and earlier private records.</span></label><p class="microcopy">An exported file is readable text. Keep it somewhere appropriate for its contents.</p><div class="dialog-actions"><button class="button primary" id="download-export">Download copy ↗</button></div>';
    $('download-export').addEventListener('click',()=>{const includePrivate=$('export-private').checked;const data=P.exportProgress(state,{includePrivate});const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Philosophy-of-Intelligence-archive-'+new Date().toISOString().slice(0,10)+(includePrivate?'-private':'')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('detail-dialog').close();toast('Your archive copy is ready.');});showDialog('detail-dialog');
  });
  $('import-data').addEventListener('click',()=>{$('import-file').value='';$('import-file').click();});
  $('import-file').addEventListener('change',async()=>{
    const file=$('import-file').files[0];if(!file)return;
    let incoming;try{if(file.size>P.LIMITS.importBytes)throw new Error('Choose a progress file smaller than '+Math.round(P.LIMITS.importBytes/1048576)+' MiB.');incoming=P.importProgress(await file.text());}catch(error){toast('Could not import: '+error.message);return;}
    if(!await confirmAction('Replace this archive?',`The file contains ${incoming.palace.length+incoming.journal.length} archive entries. Export the current archive first if you want to keep it. Current training uses its own records.`, 'Import & replace'))return;
    if(!storageConflict)recoveryRequired=false;
    if(!canWrite())return;
    state=incoming;archiveWarning=null;applyMotion();$('storage-warning').hidden=true;saveWarningShown=false;persist();renderCurrent();toast('Archive imported.');
  });
  $('reset-data').addEventListener('click',async()=>{
    if(!await confirmAction('Clear this archive?','This removes the earlier records and observations in this archive on this device. Export a copy first if you want to keep them. Current training records stay separate.','Clear archive'))return;
    if(!storageConflict)recoveryRequired=false;
    if(!canWrite())return;
    state=P.clearProgress();archiveWarning=null;applyMotion();$('storage-warning').hidden=true;saveWarningShown=false;persist();renderCurrent();toast('Archive cleared.');
  });
  $('confirm-dialog').addEventListener('close',()=>{if(confirmResolver){const resolve=confirmResolver;confirmResolver=null;resolve(false);}});

  function renderCurrent(){
    if(currentView==='journey')renderJourney();
    if(currentView==='practice')renderPractice();
    if(currentView==='palace')renderPalace();
    if(currentView==='philosophy')$('philosophy-sphere').innerHTML=G.shapeSVG('sphere',{size:280,progress:1});
  }
  function route(){
    const parts=location.hash.replace(/^#/,'').split('/');
    const requested=parts[0]==='studio'?'practice':parts[0];
    const nextView=['journey','practice','palace','philosophy'].includes(requested)?requested:'journey';
    const nextStage=nextView==='practice'?stageById(parts[0]==='studio'?selectedStage:parts[1]||selectedStage).id:practiceStage;
    if(training&&(nextView!=='practice'||nextStage!==practiceStage))training.pause();
    currentView=nextView;practiceStage=nextStage;
    if(currentView==='practice')selectedStage=practiceStage;
    if(parts[0]==='studio')window.history.replaceState(null,'','#practice/'+practiceStage);
    document.body.dataset.view=currentView;
    document.querySelectorAll('.view').forEach(view=>view.hidden=view.id!=='view-'+currentView);
    document.querySelectorAll('[data-nav]').forEach(link=>{
      const active=link.dataset.nav===currentView;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      if(link.dataset.nav==='practice')link.href='#practice/'+selectedStage;
    });
    $('storage-warning').hidden=currentView!=='palace'||(!archiveWarning&&!storageConflict&&!saveWarningShown);
    if(currentView==='palace'&&archiveWarning&&!storageConflict)warnStorage(archiveWarning);
    renderCurrent();window.scrollTo({top:0,behavior:'instant'});
    $('main').focus({preventScroll:true});
    if(currentView==='palace'&&recoveryRequired)showRecovery();
    document.title=(currentView==='practice'?stageById(practiceStage).name:currentView==='journey'?'Philosophy of Intelligence':currentView==='palace'?'Your archive':'The philosophy')+(currentView==='journey'?'':' · Philosophy of Intelligence');
  }
  window.addEventListener('hashchange',route);
  window.addEventListener('storage',event=>{if(event.key===P.STORAGE_KEY||event.key===null)noticeStorageConflict();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&training)training.pause();});
  window.addEventListener('pagehide',()=>{if(training)training.pause();});
  window.addEventListener('beforeunload',event=>{if(training&&training.hasDraft()){event.preventDefault();event.returnValue='';}});
  applyMotion();route();
})();
