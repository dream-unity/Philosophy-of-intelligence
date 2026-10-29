(function () {
  'use strict';
  const C = window.FormContent, P = window.FormProgress, S = window.FormSession, G = window.FormGeometry, B = window.FormBreath;
  if (!C || !P || !S || !G || !B) {
    document.getElementById('storage-warning').hidden = false;
    document.getElementById('storage-warning').textContent = 'A game module could not load. Keep all source files together, or open the single-file offline edition.';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const stages = C.STAGES;
  const stageById = id => stages.find(stage => stage.id === id) || stages[0];
  const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  const dateLabel = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, {month:'short',day:'numeric'}) : ''; };
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const loaded = P.loadProgress(storage);
  let state = loaded.state;
  let session = S.restore(state.activeSession);
  let lastResult = null;
  let selectedStage = stages.find(s => !P.stageSummary(state,s.id).practiceComplete)?.id || 'circle';
  let currentView = '';
  let practiceStage = selectedStage;
  let palaceFilter = 'all';
  let selectedLeft = null;
  let studioReveal = false;
  let studioRecallDraft = '';
  let studioHistoryStart = state.journal.length;
  let toastTimer = null;
  let confirmResolver = null;
  let lastPhaseLabel = '';
  let saveWarningShown = false;
  let privateDraftDirty = false;
  let storageConflict = false;
  let savedSnapshot = null;
  try { savedSnapshot = storage ? storage.getItem(P.STORAGE_KEY) : null; } catch (_) {}
  let recoveryRequired = !!loaded.warning && !!storage;
  const motionPreference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionPreference) state.preferences.reducedMotion = true;
  if (loaded.warning) warnStorage(loaded.warning);
  if (state.activeSession && !session) warnStorage('An unfinished mission could not be restored. Your completed practice and palace entries are still available.');
  if (session) state.activeSession = clone(session);
  const breath = new B.BreathGuide({ config:state.preferences.breath, onTick:renderBreath, onState:renderBreath });

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
    $('storage-warning').innerHTML='Saved progress could not be loaded. The original has been kept and automatic saves are paused. Download the saved data before replacing it. <span class="storage-actions"><button id="download-recovery">Download saved data</button><button id="reset-recovery">Start a new local record</button></span>';
    $('download-recovery').addEventListener('click',downloadSavedOriginal);
    $('reset-recovery').addEventListener('click',()=>{$('reset-data').click();});
  }
  function noticeStorageConflict(){
    if(storageConflict)return;
    storageConflict=true;breath.pause();if(session)session=S.pause(session);
    $('storage-warning').hidden=false;
    $('storage-warning').innerHTML='Another tab saved newer progress. This tab is paused so it cannot overwrite those records. Export this tab’s work if you need it, then reload the saved version. <span class="storage-actions"><button id="export-current-tab">Export this tab</button><button id="reload-saved-progress">Reload saved version</button></span>';
    $('export-current-tab').addEventListener('click',()=>{if(recoveryRequired)downloadSavedOriginal();else $('export-data').click();});
    $('reload-saved-progress').addEventListener('click',()=>{location.reload();});
    if(currentView==='practice'&&session)renderMission();
  }
  function canWrite(){
    if(recoveryRequired){toast('Your original saved data is protected. Use the recovery banner or import a valid backup to continue.');return false;}
    if(!storageConflict&&storage){try{if(storage.getItem(P.STORAGE_KEY)!==savedSnapshot)noticeStorageConflict();}catch(_) {}}
    if(storageConflict){toast('This tab is paused to protect newer saved progress. Export or reload using the banner.');return false;}
    return true;
  }
  function persist() {
    state.activeSession = session ? clone(session) : null;
    if(!canWrite())return;
    const result = P.saveProgress(storage,state);
    if(result.ok){try{savedSnapshot=storage.getItem(P.STORAGE_KEY);}catch(_) {}}
    if (!result.ok && !saveWarningShown) { warnStorage('Progress is only in this tab: ' + result.error + ' You can export a copy from the Palace.'); saveWarningShown = true; }
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

  function renderBreath(snapshot) {
    const active = snapshot.running;
    const smooth = snapshot.phase === 'inhale' ? snapshot.progress : 1 - snapshot.progress;
    const scale = active ? .83 + .34 * (0.5 - Math.cos(Math.PI * smooth) / 2) : 1;
    document.documentElement.style.setProperty('--breath-scale',String(scale));
    const phase = active ? (snapshot.phase === 'inhale' ? 'Inhale · notice' : 'Exhale · encode') : snapshot.status === 'paused' ? 'A moment of space' : 'Your own rhythm';
    const detail = active ? Math.max(1,Math.ceil(snapshot.duration-snapshot.elapsed)) + 's · extra cycles are welcome' : snapshot.status === 'paused' ? 'The guide is paused.' : 'Take all the time you need.';
    document.querySelectorAll('.breath-phase').forEach(el => { if(el.textContent!==phase)el.textContent=phase; });
    document.querySelectorAll('.breath-detail').forEach(el => { if(el.textContent!==detail)el.textContent=detail; });
    const status = active ? 'Pause guide' : snapshot.status === 'paused' ? 'Resume guide' : 'Start breath guide';
    document.querySelectorAll('.toggle-breath').forEach(el => { el.textContent=status; });
    $('open-pace').classList.toggle('on',active);
    const headerLabel = active ? (snapshot.phase==='inhale'?'Inhale':'Exhale') + ' · ' + snapshot.duration + 's' : 'Find your rhythm';
    if(lastPhaseLabel!==headerLabel){$('pace-trigger-label').textContent=headerLabel;lastPhaseLabel=headerLabel;}
  }
  function applyMotion() { document.body.classList.toggle('reduced-motion',state.preferences.reducedMotion);$('reduced-motion').checked=state.preferences.reducedMotion; }
  function renderPaceSettings() {
    const config=breath.getSnapshot().config;
    $('inhale-duration').value=config.inhale;$('exhale-duration').value=config.exhale;
    $('inhale-value').textContent=config.inhale+'s';$('exhale-value').textContent=config.exhale+'s';
    $('pace-rate').textContent=(60/(config.inhale+config.exhale)).toFixed(1)+' cycles per minute · no holds';
    $('pace-sound').checked=config.sound;$('pace-volume').value=Math.min(.5,config.volume);
    applyMotion();
  }
  function openPace(){renderPaceSettings();showDialog('pace-dialog');}
  function updatePace(){
    const config={inhale:Number($('inhale-duration').value),exhale:Number($('exhale-duration').value),sound:$('pace-sound').checked,volume:Number($('pace-volume').value)};
    breath.setConfig(config);state.preferences.breath=clone(config);state.preferences.reducedMotion=$('reduced-motion').checked;renderPaceSettings();persist();
  }
  function toggleBreath(){
    const snap=breath.getSnapshot();
    if(snap.running)breath.pause();else if(snap.status==='paused')breath.resume();else breath.start();
  }
  $('open-pace').addEventListener('click',openPace);
  document.querySelectorAll('[data-action="pace"]').forEach(el=>el.addEventListener('click',openPace));
  document.querySelectorAll('.toggle-breath').forEach(el=>el.addEventListener('click',toggleBreath));
  ['inhale-duration','exhale-duration','pace-sound','pace-volume','reduced-motion'].forEach(id=>$(id).addEventListener('input',updatePace));
  $('pace-start').addEventListener('click',()=>{updatePace();if(breath.getSnapshot().status==='paused')breath.resume();else breath.start();$('pace-dialog').close();});
  $('pace-stop').addEventListener('click',()=>{breath.stop();state.preferences.pacing='manual';persist();$('pace-dialog').close();});

  function stageStatus(summary){return summary.mastered?'Independent mastery':summary.ready?'First independent check':summary.practiceComplete?'Practised':summary.attempts?'In practice':'Explore';}
  function renderJourney(){
    const summaries=stages.map(stage=>P.stageSummary(state,stage.id));
    $('stage-path').innerHTML=stages.map((stage,index)=>`<a class="stage-tile ${stage.id===selectedStage?'selected':''}" href="#practice/${esc(stage.id)}" data-stage="${esc(stage.id)}" aria-label="${esc(stage.name)} · ${esc(stageStatus(summaries[index]))}"><span class="stage-number">${String(index+1).padStart(2,'0')}</span><span class="stage-icon" aria-hidden="true">${G.miniIcon(stage.id,65)}</span><span class="stage-name">${esc(stage.name)}</span><span class="stage-status ${summaries[index].practiceComplete?'earned':''}">${esc(stageStatus(summaries[index]))}</span></a>`).join('');
  }

  function sourceHTML(source, className){
    if(!source)return '';
    const items=Array.isArray(source.items)?source.items.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)):[];
    return `<section class="source-card ${className||''}"><p class="eyebrow">${esc(source.title||'SOURCE RECORD')}</p>${source.body?`<p class="source-body">${esc(source.body)}</p>`:''}${items.length?`<div class="source-items">${items.map(item=>`<div class="source-item">${item.color?`<span class="item-color ${item.shape==='circle'?'circle':''}" style="background:${safeColor(item.color)}" aria-hidden="true"></span>`:''}<span class="source-item-content"><span>${esc(item.label)}</span>${item.value!==undefined&&!String(item.label).includes('value '+item.value)?`<small>${esc(item.value)}</small>`:''}</span></div>`).join('')}</div>`:''}</section>`;
  }
  function safeColor(value){const colors={red:'#bc563c',blue:'#487e9c',green:'#38826e',gold:'#bc9347',amber:'#bc9347',violet:'#8171a6',coral:'#bc6b55',teal:'#237a72'};return colors[value]||'#667d70';}
  function answerText(challenge,response){
    if(challenge.kind==='mapping')return (challenge.left||[]).map(left=>{const right=(challenge.right||[]).find(item=>item.id===(response||{})[left.id]);return left.label+' → '+(right?right.label:'not selected');}).join('\n');
    if(challenge.steps)return challenge.steps.map(step=>{const opt=step.options.find(item=>item.id===(response||{})[step.id]);return step.prompt+'\n'+(opt?opt.label:'Not answered');}).join('\n\n');
    const options=challenge.nodes||challenge.options||[];
    if(Array.isArray(response))return response.map(id=>options.find(o=>o.id===id)?.label||id).join(' → ');
    return options.find(o=>o.id===response)?.label||String(response||'Not answered');
  }
  function stageHeading(stage){return `<div class="stage-heading"><div class="stage-heading-art" aria-hidden="true">${G.miniIcon(stage.id,65)}</div><div><p class="eyebrow">PLATE ${String(stage.index+1).padStart(2,'0')} / 14 · ${esc(stage.chapter||'THE JOURNEY')}</p><h1>${esc(stage.name)} <em>/ ${esc(stage.verb)}</em></h1><p>${esc(stage.tagline)}</p></div></div>`;}
  function renderPractice(){
    const stage=stageById(practiceStage);
    $('practice-stage-header').innerHTML=stageHeading(stage);
    $('lag-setting').hidden=stage.id!=='square';
    $('feature-setting').hidden=stage.id!=='square'||(session&&session.stageId===stage.id?session.mode:$('practice-mode').value)!=='guided';
    $('practice-feature').disabled=!!(session&&session.stageId===stage.id);
    if(stage.id==='square'&&session&&session.stageId===stage.id)$('practice-feature').value=session.focusFeature||'mixed';
    const active=session&&session.stageId===stage.id;
    const finished=lastResult&&lastResult.stageId===stage.id&&!active;
    $('lesson-panel').hidden=!!active||!!finished;$('mission-panel').hidden=!active;$('session-result').hidden=!finished;
    $('practice-mode').disabled=!!active;$('practice-lag').disabled=!!active;$('mission-length').disabled=!!active;
    $('practice-mode').value=active?session.mode:$('practice-mode').value||'guided';
    $('practice-lag').value=String(active?session.lag:state.preferences.lag);
    $('mission-length').value=String(active?session.target:state.preferences.sessionLength);
    $('stage-bridge').innerHTML=`<p class="eyebrow">TAKE IT INTO BREATH-BACK</p><h3>${esc(stage.verb)} in your own stream.</h3><p>${esc(stage.breathBridge)}</p><button class="text-button" id="open-studio-bridge">Open the studio →</button>`;
    $('open-studio-bridge').addEventListener('click',()=>{$('studio-stage').value=stage.id;location.hash='studio';});
    if(active)renderMission();else if(finished)renderResult(lastResult);else renderLesson(stage);
  }
  function renderLesson(stage){
    $('lesson-panel').innerHTML=`<p class="eyebrow">ONE NEW OPERATION</p><h2>${esc(stage.tagline)}</h2><p class="lesson-intro">${esc(stage.lesson)}</p><div class="lesson-steps">${(stage.steps||[]).map((step,i)=>`<div class="lesson-step"><span class="step-number">0${i+1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p></div></div>`).join('')}</div><div class="lesson-worked"><p class="eyebrow">A SMALL EXAMPLE</p>${esc(stage.workedExample)}</div><div class="lesson-actions"><button class="button primary" id="start-mission">Build this relation <span aria-hidden="true">↗</span></button><button class="button secondary" id="watch-example">Show a worked challenge</button></div><p class="microcopy">Explore any shape. Guided sessions teach the operation; independent missions check it. No response deadline.</p>`;
    $('start-mission').addEventListener('click',()=>startMission(stage.id));
    $('watch-example').addEventListener('click',()=>showWorked(stage));
  }
  function exampleChallenge(stage){
    let example=S.create(stage.id,{seed:1729,mode:'explore',lag:1});
    while(example.phase==='warmup')example=S.commitWarmup(example);
    return example.challenge;
  }
  function showWorked(stage){
    const challenge=exampleChallenge(stage);
    $('detail-content').innerHTML=`<p class="eyebrow">WORKED EXAMPLE · NOT SCORED</p><h2 id="detail-title">${esc(stage.name)} in practice.</h2><p>${esc(challenge.prompt)}</p>${sourceHTML(challenge.study||challenge.source)}${sourceHTML(challenge.secondary,'secondary-source')}${challenge.reference?sourceHTML({title:'Earlier record',body:challenge.reference.label}):''}<h3>The completed operation</h3><p>${esc(answerText(challenge,C.answerFor(challenge)))}</p><div class="lesson-worked">${esc(challenge.explanation)}</div><p class="microcopy">The mission uses fresh material. You can return to this example at any time.</p>`;
    showDialog('detail-dialog');
  }
  $('practice-help').addEventListener('click',()=>{if(session&&session.stageId===practiceStage){session=S.reveal(S.resume(session));session=S.pause(session);breath.pause();persist();renderMission();}showWorked(stageById(practiceStage));});

  async function startMission(stageId,modeOverride){
    if(!canWrite())return;
    if(session){
      const proceed=await confirmAction('Start a fresh mission?','Your recorded answers stay in your progress. This unfinished mission will close; its observation history will start again.','Start fresh');
      if(!proceed)return;
      if(!canWrite())return;
      state=P.recordSession(state,S.sessionRecord(session,false));
    }
    session=S.create(stageId,{mode:modeOverride||$('practice-mode').value,lag:Number($('practice-lag').value),target:Number($('mission-length').value),focusFeature:$('practice-feature').value==='mixed'?null:$('practice-feature').value});
    practiceStage=stageId;lastResult=null;selectedLeft=null;persist();renderPractice();
    $('mission-panel').scrollIntoView({block:'start',behavior:state.preferences.reducedMotion?'instant':'smooth'});
    $('round-content').querySelector('.round-title')?.focus({preventScroll:true});
  }
  function optionHTML(option,index,selected,disabled,attrs){
    return `<button type="button" class="answer-option ${selected?'selected':''}" ${disabled?'disabled':''} aria-pressed="${selected}" ${attrs||''}><span class="option-marker" aria-hidden="true">${selected?'✓':index+1}</span><span class="option-label">${esc(option.label)}${option.detail?`<small>${esc(option.detail)}</small>`:''}</span></button>`;
  }
  function responseHTML(challenge,locked){
    const response=session.response,kind=challenge.kind;
    if(kind==='choice'||kind==='recall')return `<div class="answer-options" role="group" aria-label="Choose your answer">${challenge.options.map((o,i)=>optionHTML(o,i,response===o.id,locked,`data-choice="${esc(o.id)}"`)).join('')}</div>`;
    if(kind==='connect'||kind==='order'){
      const options=challenge.nodes||challenge.options,selected=Array.isArray(response)?response:[],length=kind==='connect'?2:options.length;
      const tray=Array.from({length},(_,i)=>`${i?'<span class="selection-arrow" aria-hidden="true">→</span>':''}<span class="selection-slot ${selected[i]?'filled':''}">${esc(options.find(o=>o.id===selected[i])?.label||(kind==='connect'?(i?'Destination':'Start'):'Position '+(i+1)))}</span>`).join('');
      return `<p class="mapping-instruction">${kind==='connect'?'Choose the start, then the destination.':'Select cards in the order they belong.'} Select a chosen card again to remove it.</p><div class="selection-tray" aria-label="Your ordered selection">${tray}</div><div class="node-options">${options.map(o=>`<button type="button" class="node-button ${selected.includes(o.id)?'selected':''}" data-node="${esc(o.id)}" ${locked?'disabled':''} aria-pressed="${selected.includes(o.id)}">${o.value!==undefined?`<span class="node-value">${esc(o.value)}</span>`:''}<span>${esc(o.label)}</span>${selected.includes(o.id)?`<span class="node-order">${selected.indexOf(o.id)+1}</span>`:''}</button>`).join('')}</div>`;
    }
    if(kind==='mapping'){
      const pairs=response&&typeof response==='object'?response:{};
      return `<p class="mapping-instruction">Choose an element on the left, then its corresponding role on the right. Each role has one partner.</p><div class="mapping-grid"><div class="mapping-column">${challenge.left.map((n,i)=>`<button class="mapping-node ${selectedLeft===n.id?'selected':''} ${pairs[n.id]?'paired':''}" data-left="${esc(n.id)}" ${locked?'disabled':''} aria-pressed="${selectedLeft===n.id}">${esc(n.label)}${pairs[n.id]?`<span class="pair-badge">PAIR ${i+1}</span>`:''}</button>`).join('')}</div><span class="mapping-join" aria-hidden="true">↔</span><div class="mapping-column">${challenge.right.map(n=>{const paired=challenge.left.find(l=>pairs[l.id]===n.id);return `<button class="mapping-node ${paired?'paired':''}" data-right="${esc(n.id)}" ${locked||!selectedLeft?'disabled':''}>${esc(n.label)}${paired?`<span class="pair-badge">PAIR ${challenge.left.indexOf(paired)+1}</span>`:''}</button>`;}).join('')}</div></div><div class="mapping-links">${challenge.left.filter(n=>pairs[n.id]).map(n=>`<span>${esc(n.label)} ↔ ${esc(challenge.right.find(r=>r.id===pairs[n.id])?.label)}</span>`).join('')}</div>`;
    }
    if(kind==='sequence'||kind==='function'){
      const answers=response||{};
      let firstUnanswered=challenge.steps.findIndex(step=>!answers[step.id]);
      if(firstUnanswered<0)firstUnanswered=challenge.steps.length;
      return `<p class="mapping-instruction">Build the operation one step at a time. Each choice is committed before the next step appears.</p>${challenge.steps.map((step,i)=>{
        if(i>firstUnanswered&&!locked)return `<div class="answer-step pending-step"><span class="answer-step-number">0${i+1}</span><span> The next part appears after your choice.</span></div>`;
        const committed=i<firstUnanswered;
        return `<section class="answer-step"><h3 class="answer-step-title"><span class="answer-step-number">0${i+1}</span>${esc(step.prompt)}</h3><div class="answer-options" role="group" aria-label="Step ${i+1}">${step.options.map((o,j)=>optionHTML(o,j,answers[step.id]===o.id,locked||committed,`data-step="${esc(step.id)}" data-value="${esc(o.id)}"`)).join('')}</div>${committed&&!locked?'<p class="microcopy">Choice committed. Continue with the next part.</p>':''}</section>`;
      }).join('')}`;
    }
    return '';
  }
  function referenceHTML(challenge){
    const r=challenge.reference;
    if(!r)return '';
    return sourceHTML({title:'The exact earlier observation',body:r.label,items:[{label:'Colour',value:r.features?.color},{label:'Shape',value:r.features?.shape},{label:'Value',value:r.features?.value},{label:'Location',value:r.locus}]},'secondary-source');
  }
  function constructionHTML(challenge,feedback){
    const kind=challenge.kind,response=session.response;
    if(!['connect','order','mapping'].includes(kind))return '';
    let nodes=[],edges=[],options={width:560,height:220,label:'Your developing relationship map'};
    if(kind==='connect'){
      nodes=challenge.nodes;
      edges=(challenge.givenEdges||[]).map(edge=>({...edge,label:String(edge.label||'given').replace(/^comes /,'').replace(/^is /,'')}));
      if(Array.isArray(response)&&response.length===2)edges.push({from:response[0],to:response[1],label:feedback?(session.feedback.correct?'inferred':'proposed'):'proposed'});
    }else if(kind==='order'){
      nodes=challenge.options;
      if(Array.isArray(response))edges=response.slice(1).map((id,i)=>({from:response[i],to:id,label:'then'}));
    }else{
      nodes=[...challenge.left.map(n=>({...n,id:'left-'+n.id,column:'left'})),...challenge.right.map(n=>({...n,id:'right-'+n.id,column:'right'}))];
      edges=Object.entries(response||{}).map(([left,right])=>({from:'left-'+left,to:'right-'+right}));
      options={...options,layout:'columns',height:Math.max(challenge.left.length,challenge.right.length)*76+24};
    }
    return `<div class="construction"><p class="eyebrow">${kind==='connect'?'ONE NEW CONNECTION':kind==='order'?'AN EPISODE TAKES FORM':'A STRUCTURE BETWEEN SYSTEMS'}</p>${G.relationSVG(nodes,edges,options)}<p class="microcopy">${feedback?(session.feedback.correct?'Each completed link is supported by the source.':'This preserves your proposal. Use the feedback below to locate what needs to change.'):'The diagram records your construction. Commit it when you are ready to check the source.'}</p></div>`;
  }
  function renderMission(){
    if(!session)return;
    const ch=session.challenge,feedback=session.phase==='feedback',paused=session.phase==='paused';
    $('mission-mode').textContent=(session.mode==='independent'?'Independent mission':'Guided practice')+(session.lag?' · '+session.lag+'-back'+(session.focusFeature?' · '+session.focusFeature+' lens':' · mixed features'):'');
    $('mission-progress').innerHTML=Array.from({length:session.target},(_,i)=>`<span class="progress-bead ${session.results[i]?(session.results[i].correct?'done':'error'):i===session.results.length?'current':''}" title="${i+1}: ${session.results[i]?(session.results[i].correct?'correct':'review'):'not yet completed'}"></span>`).join('');
    $('mission-progress').setAttribute('aria-label',`${session.results.length} of ${session.target} challenges answered`);
    $('mission-progress').setAttribute('role','progressbar');$('mission-progress').setAttribute('aria-valuemin','0');$('mission-progress').setAttribute('aria-valuemax',String(session.target));$('mission-progress').setAttribute('aria-valuenow',String(session.results.length));
    $('pause-mission').textContent=paused?'Resume':'Pause';
    $('round-feedback').hidden=true;
    if(paused){
      $('round-content').innerHTML=`<div class="pause-card">${G.miniIcon(session.stageId,75)}<h2>A moment of space.</h2><p>Your place is saved. The observation counter stays still.</p><button class="button primary" data-round-action="resume">Return to the mission →</button></div>`;
      $('round-controls').innerHTML='';return;
    }
    const study=session.phase==='study',warmup=session.phase==='warmup';
    let sources=study?sourceHTML(ch.study||ch.source):ch.kind==='recall'&&!feedback?'<div class="hidden-memory"><strong>The scene is out of view.</strong><p>Return to the item and its location in memory.</p></div>':sourceHTML(ch.source);
    if(ch.secondary)sources+=sourceHTML(ch.secondary,'secondary-source');
    if(ch.kind==='recall'&&feedback)sources+=sourceHTML(ch.study,'secondary-source');
    const counter=warmup?'HISTORY '+(session.history.length+1)+' / '+session.lag:study?'ENCODE THE SCENE':'CHALLENGE '+Math.min(session.results.length+(feedback?0:1),session.target)+' / '+session.target;
    $('round-content').innerHTML=`<div class="round-meta"><span class="eyebrow">${esc(counter)}</span><span class="pill">${warmup||study?'Unscored preparation':session.aided?'Supported':session.mode==='independent'?'Independent':'Practice'}</span></div><h2 class="round-title" tabindex="-1">${esc(ch.title)}</h2><p class="round-prompt">${esc(ch.prompt)}</p>${sources}${warmup?`<div class="warmup-card"><h3>Give this moment a place.</h3><p>Notice the record’s name and features. This observation fills your history; it is not an answer to score.</p></div>`:study?'<p class="microcopy">Study for as long as you need. When ready, hide the scene and retrieve its binding.</p>':responseHTML(ch,feedback)+constructionHTML(ch,feedback)}${session.reveal&&!feedback?`<div class="lesson-worked"><strong>A little support</strong><p>${esc(ch.hint)}</p>${ch.kind==='recall'?sourceHTML(ch.study):referenceHTML(ch)}</div>`:''}`;
    if(feedback){
      const f=session.feedback;
      $('round-feedback').hidden=false;$('round-feedback').className='round-feedback'+(f.correct?'':' needs-work');
      $('round-feedback').innerHTML=`<h3>${f.correct?'The relation holds.':f.skipped?'A useful place to look again.':'Here is the missing connection.'}</h3><div class="feedback-channels">${Object.entries(f.channelResults||{}).map(([channel,value])=>`<span class="channel-chip">${esc(channel)} · ${esc(value.correct)}/${esc(value.total)}</span>`).join('')}</div><p>${esc(f.explanation)}</p>${referenceHTML(ch)}${!f.correct?`<details><summary>See the complete operation</summary><p class="answer-explanation">${esc(answerText(ch,C.answerFor(ch)))}</p></details>`:''}<p class="microcopy">${session.aided?'Support was part of this trial. This contributes to practice, not independent mastery.':'Recorded once. Breath timing does not affect your score.'}</p>`;
      $('round-controls').innerHTML=`<button class="button primary" data-round-action="next">${session.results.length>=session.target?'Finish the mission':'Build the next relation'} <span aria-hidden="true">→</span></button>`;
    }else if(warmup||study){
      $('round-controls').innerHTML=`<button class="button primary" data-round-action="${warmup?'encode':'hide'}">${warmup?'Place in history':'Hide the scene & retrieve'} →</button>`;
    }else{
      $('round-controls').innerHTML=`<button class="text-button" data-round-action="hint" ${session.reveal?'disabled':''}>${session.reveal?'Support shown':'Give me a cue'}</button>${ch.steps&&session.response&&Object.keys(session.response).length?'<button class="text-button" data-round-action="rebuild">Rebuild with support</button>':''}<button class="text-button" data-round-action="skip">I’m not sure</button><button class="button primary" data-round-action="submit" ${S.responseComplete(ch,session.response)?'':'disabled'}>Commit the relation <span aria-hidden="true">↗</span></button>`;
    }
  }
  function updateResponse(value,focusQuery){
    if(!canWrite())return;
    session=S.setResponse(session,value);persist();renderMission();
    if(focusQuery){const target=$('round-content').querySelector(focusQuery);if(target&&!target.disabled)target.focus({preventScroll:true});}
  }
  $('round-content').addEventListener('click',event=>{
    if(!session||session.phase!=='respond')return;
    const ch=session.challenge,choice=event.target.closest('[data-choice]'),node=event.target.closest('[data-node]'),left=event.target.closest('[data-left]'),right=event.target.closest('[data-right]'),step=event.target.closest('[data-step]');
    if(choice)updateResponse(choice.dataset.choice,`[data-choice="${choice.dataset.choice}"]`);
    if(node){let response=Array.isArray(session.response)?session.response.slice():[];const id=node.dataset.node;if(response.includes(id))response=response.filter(v=>v!==id);else if(response.length<(ch.kind==='connect'?2:ch.options.length))response.push(id);updateResponse(response,`[data-node="${id}"]`);}
    if(left){selectedLeft=left.dataset.left;renderMission();$('round-content').querySelector(`[data-left="${selectedLeft}"]`)?.focus({preventScroll:true});}
    if(right&&selectedLeft){const response={...(session.response||{})};for(const key of Object.keys(response))if(response[key]===right.dataset.right)delete response[key];response[selectedLeft]=right.dataset.right;selectedLeft=null;updateResponse(response);const next=ch.left.find(n=>!response[n.id]);if(next)$('round-content').querySelector(`[data-left="${next.id}"]`)?.focus({preventScroll:true});else $('round-controls').querySelector('[data-round-action="submit"]')?.focus({preventScroll:true});}
    if(step){updateResponse({...session.response,[step.dataset.step]:step.dataset.value});const unanswered=ch.steps.find(s=>!session.response?.[s.id]);const target=unanswered?$('round-content').querySelector(`[data-step="${unanswered.id}"]`):$('round-controls').querySelector('[data-round-action="submit"]');target?.focus({preventScroll:true});}
  });
  async function roundAction(action){
    if(!session)return;
    if(!canWrite())return;
    if(action==='resume'){session=S.resume(session);persist();renderMission();$('round-content').querySelector('.round-title')?.focus({preventScroll:true});return;}
    if(action==='encode')session=S.commitWarmup(session);
    else if(action==='hide')session=S.finishStudy(session);
    else if(action==='hint')session=S.reveal(session);
    else if(action==='rebuild'){session=S.resetResponse(session);toast('A fresh response, with support. Your earlier choices stay in this trial’s record.');}
    else if(action==='submit'||action==='skip'){
      const result=S.submit(session,{skip:action==='skip'});session=result.session;
      if(result.attempt)state=P.recordAttempt(state,result.attempt);
    }else if(action==='next'){
      session=S.advance(session);selectedLeft=null;
      if(session.phase==='complete'){
        state=P.recordSession(state,S.sessionRecord(session,true));lastResult=clone(session);session=null;breath.pause();persist();renderPractice();renderJourney();$('session-result').setAttribute('tabindex','-1');$('session-result').focus({preventScroll:true});return;
      }
    }
    persist();renderMission();
    if(action==='submit'||action==='skip'){$('round-feedback').setAttribute('tabindex','-1');$('round-feedback').focus({preventScroll:true});}
    else if(action!=='hint')$('round-content').querySelector('.round-title')?.focus({preventScroll:true});
  }
  ['round-content','round-controls'].forEach(id=>$(id).addEventListener('click',event=>{const button=event.target.closest('[data-round-action]');if(button)roundAction(button.dataset.roundAction);}));
  $('pause-mission').addEventListener('click',()=>{if(!session||!canWrite())return;if(session.phase==='paused')session=S.resume(session);else{session=S.pause(session);breath.pause();}persist();renderMission();});
  $('end-mission').addEventListener('click',async()=>{
    if(!session)return;session=S.pause(session);breath.pause();persist();renderMission();
    if(!await confirmAction('Close this mission?','Recorded answers remain in your progress. An unfinished mission does not count as a completed practice or independent check.','Close mission'))return;
    if(!canWrite())return;
    state=P.recordSession(state,S.sessionRecord(session,false));session=null;lastResult=null;persist();renderPractice();
  });
  $('practice-mode').addEventListener('change',()=>{if(!session||session.stageId!==practiceStage)renderPractice();});
  ['practice-lag','mission-length'].forEach(id=>$(id).addEventListener('change',()=>{if(session)return;state.preferences.lag=Number($('practice-lag').value);state.preferences.sessionLength=Number($('mission-length').value);persist();}));

  function renderResult(result){
    const stage=stageById(result.stageId),summary=P.stageSummary(state,stage.id),correct=result.results.filter(r=>r.correct).length;
    const channels={};result.results.forEach(r=>Object.entries(r.channelResults||{}).forEach(([key,value])=>{channels[key]||={correct:0,total:0};channels[key].correct+=value.correct;channels[key].total+=value.total;}));
    const next=stages[stage.index+1];
    const status=summary.mastered?'An independent relation, established.':summary.ready?'One independent check is in place.':correct/result.target>=.75?'A new connection has a place.':'Every return gives you information.';
    const guidance=summary.mastered?'You have met this shape’s independent criteria on two different dates. Keep the skill available by applying it in new material.':summary.ready?'Return on another date for a fresh independent check. Repeating today is useful practice; the second date adds evidence of retention.':result.mode==='independent'&&result.target===20?'Review the channels below. A check needs at least 85% overall and in every required channel; Square also requires reliable nonmatch judgements.':'When this feels familiar, try a 20-challenge independent check. Explore the next shape whenever you feel ready.';
    $('session-result').innerHTML=`<div class="result-shape">${G.shapeSVG(stage.id,{size:170,progress:correct/result.target})}</div><p class="eyebrow">MISSION COMPLETE · ${esc(stage.name.toUpperCase())}</p><h2>${esc(status)}</h2><p>${esc(guidance)}</p><div class="result-metrics"><div><strong>${correct}/${result.target}</strong><span>complete operations</span></div><div><strong>${result.results.filter(r=>!r.aided).length}</strong><span>independent attempts</span></div><div><strong>${summary.mastered?'2':summary.ready?'1':'0'}/2</strong><span>qualifying dates</span></div></div><div class="feedback-channels">${Object.entries(channels).map(([key,value])=>`<span class="channel-chip">${esc(key)} · ${esc(value.correct)}/${esc(value.total)}</span>`).join('')}</div><div class="principle-save"><p class="eyebrow">KEEP A USEFUL PRINCIPLE</p><h3>${esc(result.challenge.principle||stage.tagline)}</h3><p>${esc(result.challenge.transferPrompt||stage.breathBridge)}</p><button class="text-button" id="save-principle">Place this in the Palace →</button></div><div class="result-actions"><button class="button primary" id="repeat-mission">Practise ${esc(stage.name)} again</button>${next?`<button class="button secondary" id="next-shape">Explore ${esc(next.name)} →</button>`:'<a class="button secondary" href="#studio">Take it into breath-back →</a>'}</div><p class="microcopy" style="margin-top:18px">This records performance in this practice. It does not measure IQ or establish changes in general intelligence.</p>`;
    $('repeat-mission').addEventListener('click',()=>{lastResult=null;renderPractice();});
    if(next)$('next-shape').addEventListener('click',()=>{lastResult=null;location.hash='practice/'+next.id;});
    $('save-principle').addEventListener('click',()=>{
      if(state.palace.some(p=>p.challengeId===result.challenge.id)){toast('This principle already has a place.');return;}
      if(state.palace.length>=P.LIMITS.palace){toast('Your Palace is full. Export or remove an entry before adding another.');return;}
      if(!storeEntry('palace',{id:uid('principle'),challengeId:result.challenge.id,kind:'principle',private:false,stageId:stage.id,title:result.challenge.principle||stage.tagline,body:result.challenge.transferPrompt||stage.breathBridge,source:clone(result.challenge.source),locus:'Atrium',createdAt:new Date().toISOString(),revisions:[]}))return;persist();toast('The principle is waiting in your Palace.');$('save-principle').disabled=true;
    });
  }

  const studioScaffolds={
    circle:['Notice one feature','Describe what appeared before explaining it.'],
    'half-circle':['Bind it to a place','Give the observation a brief name and put it at a familiar location.'],
    triangle:['Name the relation','Compare on one explicit dimension: shape, tone, meaning, intensity or another feature you choose.'],
    square:['Return to the right moment','Retrieve exactly N committed observations back. Compare your recollection with the preserved source before interpreting it.'],
    pentagon:['Add the context','Which setting or instruction changes the comparison? What remains uncertain?'],
    hexagon:['Build an episode','Distinguish the cue, your response and the observed consequence. Sequence alone does not establish cause.'],
    prism:['Map two episodes','Match the cue, response and consequence across two episodes. Name one difference that could limit the analogy.'],
    heptagon:['Make a provisional function','When [condition], try [response], expect [effect]. Include a case where the rule would not apply.'],
    octagon:['Carry the structure elsewhere','Name a new setting. Which roles map across? What can you predict, and what would break the analogy?'],
    cube:['Hold two contextual systems','For each account, separate reported belief, stated goal, chosen action and observed outcome. Map roles while keeping their sources distinct.'],
    dodecahedron:['Retrieve a useful function','Which earlier rule fits these conditions? Say why it applies here and where it would stop applying.'],
    icosahedron:['Invite competing explanations','Write two possible accounts. Name an observation that would distinguish them before deciding.'],
    geodesic:['Examine your operation','Check whether you chose the wrong earlier moment, swapped roles or stretched a rule beyond its scope. Repair the specific step.'],
    sphere:['Integrate, predict, revise','Connect the episode to a bounded model. Record a prediction now; return later and add evidence as a revision.']
  };
  function studioHistory(){return state.journal.slice(studioHistoryStart);}
  function studioTarget(){const history=studioHistory(),lag=Number($('studio-lag').value);return history.length>=lag?history[history.length-lag]:null;}
  function renderStudio(){
    const stage=stageById($('studio-stage').value||selectedStage),scaffold=studioScaffolds[stage.id];
    $('studio-stage').value=stage.id;
    $('studio-prompt').innerHTML=`<strong>${esc(scaffold[0])}</strong>${esc(scaffold[1])}<p class="microcopy">${esc(stage.breathBridge)}</p>`;
    $('studio-locus').closest('.field-block').hidden=stage.index===0;
    $('studio-lag').disabled=stage.index<2;
    $('studio-relation-field').hidden=stage.index<2;
    $('studio-function-field').hidden=stage.index<7;
    $('studio-prediction-field').hidden=stage.index<7;
    const target=studioTarget(),lag=Number($('studio-lag').value),history=studioHistory();
    $('studio-reference').hidden=stage.index<2;
    if(stage.index>=2){
      $('studio-reference').innerHTML=target?`<p class="eyebrow">RETURN · EXACTLY ${lag} OBSERVATION${lag>1?'S':''} BACK</p><p>Before revealing, recall what appeared. Then compare your recollection with the original.</p><label for="studio-retrieval">My recollection</label><textarea id="studio-retrieval" rows="2" maxlength="3000" placeholder="What was there, before I look again?" ${studioReveal?'readonly':''}>${esc(studioRecallDraft)}</textarea><button type="button" class="text-button" id="reveal-studio-source" ${studioReveal?'disabled':''}>Reveal the preserved source →</button><div id="studio-source-reveal" ${studioReveal?'':'hidden'}><p class="eyebrow">ORIGINAL · ${esc(target.locus||'Atrium')}</p><p>${esc(target.source)}</p><p class="microcopy">A different recollection is information about recall. Keep both records.</p></div>`:`<p class="eyebrow">PREPARING THE HISTORY · ${history.length} / ${lag}</p><p>Place ${lag-history.length} more observation${lag-history.length===1?'':'s'} before a ${lag}-back comparison is available. Preparation is unscored.</p>`;
      if(target)$('reveal-studio-source').addEventListener('click',()=>{studioReveal=true;$('studio-source-reveal').hidden=false;$('reveal-studio-source').disabled=true;$('studio-retrieval').readOnly=true;$('studio-retrieval').setAttribute('aria-label','Recollection committed before source reveal');});
    }
    $('studio-mini-history').innerHTML=`<p class="eyebrow">THIS OBSERVATION STREAM · ${history.length}</p><p class="microcopy">Reloading the practice or changing depth begins a fresh stream. Earlier sources stay in the Palace.</p>${history.slice(-3).reverse().map((entry,i)=>`<div class="studio-history-item"><small>${history.length-i} · ${esc(entry.locus||'Atrium')}</small>${esc(stage.index<2?entry.source:'Observation committed · source kept in the Palace')}</div>`).join('')}<button type="button" class="text-button" id="fresh-stream">Begin a fresh stream</button>`;
    $('fresh-stream').addEventListener('click',async()=>{if(privateDraftDirty&&!await confirmAction('Begin a fresh stream?','The current unfinished observation will be cleared. Your committed sources remain in the Palace.','Begin fresh'))return;resetStudioDraft();studioHistoryStart=state.journal.length;renderStudio();toast('A fresh observation stream is ready.');});
    renderBreath(breath.getSnapshot());
  }
  function resetStudioDraft(){['studio-source','studio-relation','studio-function','prediction-condition','prediction-expected','prediction-trigger'].forEach(id=>$(id).value='');privateDraftDirty=false;studioReveal=false;studioRecallDraft='';}
  $('studio-form').addEventListener('input',event=>{privateDraftDirty=true;if(event.target.id==='studio-retrieval')studioRecallDraft=event.target.value;});
  $('studio-stage').addEventListener('change',()=>{renderStudio();});
  $('studio-lag').addEventListener('change',()=>{studioHistoryStart=state.journal.length;studioReveal=false;studioRecallDraft='';renderStudio();toast('Depth changed. The observation stream starts fresh.');});
  $('studio-form').addEventListener('submit',event=>{
    event.preventDefault();if(!canWrite())return;const source=$('studio-source').value.trim();if(!source){$('studio-source').focus();return;}
    if(state.journal.length>=P.LIMITS.journal){toast('Your observation journal is full. Export or remove an entry before adding another.');return;}
    const stage=stageById($('studio-stage').value),target=stage.index>=2?studioTarget():null;
    const fields=['prediction-condition','prediction-expected','prediction-trigger'],values=fields.map(id=>$(id).value.trim());
    let prediction=null;
    if(stage.index>=7&&values.some(Boolean)){if(values.some(v=>!v)){toast('Complete the situation, prediction and revision trigger, or leave all three empty.');$('studio-prediction-field').open=true;$(fields[values.findIndex(v=>!v)]).focus();return;}prediction={condition:values[0],expected:values[1],revisionTrigger:values[2],committedAt:new Date().toISOString()};}
    if(!storeEntry('journal',{id:uid('observation'),kind:'personal',private:true,stageId:stage.id,title:source.slice(0,72),source,locus:stage.index===0?'Atrium':$('studio-locus').value,relation:stage.index>=2?$('studio-relation').value.trim():'',function:stage.index>=7?$('studio-function').value.trim():'',recollection:target?$('studio-retrieval')?.value.trim()||'':'',referenceId:target?.id||null,referenceSource:target?target.source:null,referenceRevealed:studioReveal,lag:stage.index>=2?Number($('studio-lag').value):0,lagUnit:'observation',createdAt:new Date().toISOString(),prediction,evidence:[],revisions:[]}))return;
    resetStudioDraft();persist();renderStudio();toast('Observation placed. Your original source is preserved.');$('studio-source').focus({preventScroll:true});
  });

  function allEntries(){return [...state.palace.map(p=>({...p,_type:'principle'})),...state.journal.map(p=>({...p,_type:'personal'}))].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  function renderPalace(){
    const entries=allEntries(),visible=entries.filter(e=>palaceFilter==='all'||e._type===palaceFilter);
    $('palace-rooms').innerHTML=['Atrium','Window','Alcove','Bridge','Garden'].map(room=>`<div class="room-card"><span>${room}</span><small>${entries.filter(e=>(e.locus||'Atrium')===room).length.toString().padStart(2,'0')}</small></div>`).join('');
    document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===palaceFilter);b.setAttribute('aria-pressed',String(b.dataset.filter===palaceFilter));});
    $('palace-entries').innerHTML=visible.length?visible.map(entry=>`<button class="palace-entry" data-entry="${esc(entry.id)}"><span class="entry-meta"><span>${esc(String(entry.locus||'Atrium').toUpperCase())} · ${entry._type==='personal'?'PRIVATE OBSERVATION':'PRINCIPLE'}</span><span>${esc(dateLabel(entry.createdAt))}</span></span><h3>${esc(entry.title||String(entry.source||'An observation').slice(0,72))}</h3><p>${esc(entry._type==='personal'?entry.relation||entry.source:entry.body)}</p><span class="entry-footer">${esc(stageById(entry.stageId).name)} · Open & revisit →</span></button>`).join(''):`<div class="empty-state">${G.miniIcon('prism',75)}<h2>A place for the connections.</h2><p>${palaceFilter==='all'?'Finish a mission to keep a principle, or place an observation from the breath-back studio.':'No '+(palaceFilter==='personal'?'observations':'principles')+' here yet.'}</p><a class="button primary" href="#studio">Place an observation ↗</a></div>`;
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
      const removedIndex=state.journal.findIndex(e=>e.id===id);if(removedIndex>=0&&removedIndex<studioHistoryStart)studioHistoryStart=Math.max(0,studioHistoryStart-1);
      state.journal=state.journal.filter(e=>e.id!==id);state.palace=state.palace.filter(e=>e.id!==id);studioHistoryStart=state.journal.length;studioReveal=false;studioRecallDraft='';persist();renderPalace();toast('Entry removed. The next observation stream starts fresh.');
    });showDialog('detail-dialog');
  }
  $('palace-entries').addEventListener('click',event=>{const entry=event.target.closest('[data-entry]');if(entry)showEntry(entry.dataset.entry);});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{palaceFilter=button.dataset.filter;renderPalace();}));
  $('export-data').addEventListener('click',()=>{
    $('detail-content').innerHTML='<p class="eyebrow">TAKE YOUR PRACTICE WITH YOU</p><h2 id="detail-title">A copy of your progress.</h2><p>Export a JSON file you can import into Philosophy of Intelligence on another device. By default it contains practice results and unedited game principles only.</p><label class="checkbox-line"><input id="export-private" type="checkbox"><span>Include private observations, personal revisions and the unfinished mission.</span></label><p class="microcopy">An exported file is readable text. Keep it somewhere appropriate for its contents.</p><div class="dialog-actions"><button class="button primary" id="download-export">Download copy ↗</button></div>';
    $('download-export').addEventListener('click',()=>{persist();const includePrivate=$('export-private').checked;const data=P.exportProgress(state,{includePrivate});const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Philosophy-of-Intelligence-progress-'+new Date().toISOString().slice(0,10)+(includePrivate?'-private':'')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('detail-dialog').close();toast('Your progress copy is ready.');});showDialog('detail-dialog');
  });
  $('import-data').addEventListener('click',()=>{$('import-file').value='';$('import-file').click();});
  $('import-file').addEventListener('change',async()=>{
    const file=$('import-file').files[0];if(!file)return;
    let incoming;try{if(file.size>P.LIMITS.importBytes)throw new Error('Choose a progress file smaller than '+Math.round(P.LIMITS.importBytes/1048576)+' MiB.');incoming=P.importProgress(await file.text());}catch(error){toast('Could not import: '+error.message);return;}
    if(!await confirmAction('Replace this device’s progress?',`The file contains ${incoming.attempts.length} recorded attempts and ${incoming.palace.length+incoming.journal.length} Palace entries. Export the current data first if you want to keep it.`, 'Import & replace'))return;
    if(!storageConflict)recoveryRequired=false;
    if(!canWrite())return;
    breath.stop();state=incoming;session=S.restore(state.activeSession);lastResult=null;studioHistoryStart=state.journal.length;resetStudioDraft();breath.setConfig(state.preferences.breath);applyMotion();$('storage-warning').hidden=true;saveWarningShown=false;persist();renderCurrent();toast('Progress imported. Any unfinished mission is paused.');
  });
  $('reset-data').addEventListener('click',async()=>{
    if(!await confirmAction('Clear your practice data?','This removes practice records, Palace entries and personal observations stored by this practice on this device. Export a copy first if you want to keep them.','Clear all practice data'))return;
    if(!storageConflict)recoveryRequired=false;
    if(!canWrite())return;
    breath.stop();if(modelLab)modelLab.reset();state=P.clearProgress();session=null;lastResult=null;studioHistoryStart=0;selectedStage='circle';resetStudioDraft();breath.setConfig(state.preferences.breath);applyMotion();$('storage-warning').hidden=true;saveWarningShown=false;persist();renderCurrent();toast('A fresh beginning is ready.');
  });
  $('confirm-dialog').addEventListener('close',()=>{if(confirmResolver){const resolve=confirmResolver;confirmResolver=null;resolve(false);}});

  function renderCurrent(){
    if(currentView==='journey')renderJourney();
    if(currentView==='practice')renderPractice();
    if(currentView==='studio')renderStudio();
    if(currentView==='palace')renderPalace();
    if(currentView==='philosophy'){
      $('philosophy-sphere').innerHTML=G.shapeSVG('sphere',{size:280,progress:1});
      $('symbolic-scale').innerHTML=stages.map(stage=>`<div class="scale-row"><span>${esc(stage.name)}</span><span>${stage.label}</span></div>`).join('');
    }
    renderBreath(breath.getSnapshot());
  }
  function route(){
    const parts=location.hash.replace(/^#/,'').split('/'),requested=parts[0];
    const nextView=['journey','practice','studio','palace','philosophy'].includes(requested)?requested:'journey';
    const nextStage=nextView==='practice'?stageById(parts[1]).id:practiceStage;
    if(session&&(nextView!=='practice'||nextStage!==session.stageId)){session=S.pause(session);breath.pause();persist();}
    currentView=nextView;practiceStage=nextStage;
    if(currentView==='practice')selectedStage=practiceStage;
    document.body.dataset.view=currentView;
    document.querySelectorAll('.view').forEach(view=>view.hidden=view.id!=='view-'+currentView);
    document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.dataset.nav===(currentView==='practice'?'journey':currentView);link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    renderCurrent();window.scrollTo({top:0,behavior:'instant'});
    $('main').focus({preventScroll:true});
    if(currentView==='philosophy'&&parts[1]==='lab')$('model-lab').scrollIntoView({block:'start',behavior:state.preferences.reducedMotion?'instant':'smooth'});
    document.title=(currentView==='practice'?stageById(practiceStage).name:currentView==='journey'?'Philosophy of Intelligence':currentView==='studio'?'Breath-back studio':currentView==='palace'?'Your Palace':'The philosophy')+(currentView==='journey'?'':' · Philosophy of Intelligence');
  }
  $('studio-stage').innerHTML=stages.map(stage=>`<option value="${stage.id}">${stage.name} · ${stage.verb}</option>`).join('');
  $('studio-stage').value=selectedStage;
  $('studio-lag').value=String(state.preferences.lag);
  const modelLab=window.FormLab?window.FormLab.mount($('model-lab')):null;
  window.addEventListener('hashchange',route);
  window.addEventListener('storage',event=>{if(event.key===P.STORAGE_KEY||event.key===null)noticeStorageConflict();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){breath.pause();if(session){session=S.pause(session);persist();if(currentView==='practice')renderMission();}}});
  window.addEventListener('pagehide',()=>{breath.pause();if(session)session=S.pause(session);persist();});
  window.addEventListener('beforeunload',event=>{persist();if(privateDraftDirty){event.preventDefault();event.returnValue='';}});
  applyMotion();route();if(recoveryRequired)showRecovery();
})();
