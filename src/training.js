(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  const time = seconds => { const n = Math.max(0, Math.ceil(seconds)); return Math.floor(n / 60).toString().padStart(2,'0') + ':' + (n % 60).toString().padStart(2,'0'); };

  function mount({root: host, stageId, onStageChange}) {
    const D = root.FormShapePractice, E = root.FormExercises, G = root.FormGeometry;
    let storage; try { storage = root.localStorage; } catch (_) { storage = null; }
    const store = root.FormTrainingStore.createStore(storage);
    let stage = D.getStage(stageId), exercise = 'stream', clock = null, audio = new E.ExerciseAudio();
    let unsaved = false, fieldsGeneration = 0, modelState = 0, selectedRelationship = '';
    const testAudio = new E.ExerciseAudio();
    let recorded = false, peek = null, lastBodyStep = -1, lastCue = '', lastPrompt = '', announcement = '';
    let sound = false, heartBell = true, frequency = 10, bellVolume = 1, pacing = 'natural', duration = 15;
    const pacingByExercise = {stream:'natural', heart:'paced', body:'natural'};
    const exerciseNames = {stream:'Consciousness Stream', heart:'Heart-Coherence', body:'Body-Sensation Mapping'};
    const exerciseHints = {stream:'Imagery · meaning · relationship', heart:'Attention · care · relationship', body:'Sensation · context · relationship'};
    const exerciseOrder = ['stream','heart','body'];
    const volumes = {0:1,1:.48,2:.48,3:.48,8:1,10:1,12:1}, drafts = new Map();
    const q = selector => host.querySelector(selector);
    const all = selector => [...host.querySelectorAll(selector)];
    const key = () => stage.id + ':' + exercise;
    function draft() {
      if (!drafts.has(key())) drafts.set(key(), {streamId:uid(),lag:1,source:'',recollection:'',relation:'',revision:'',locked:false,reference:null,revealed:false});
      return drafts.get(key());
    }
    function history() { const d = draft(); return store.data.entries.filter(e => e.streamId === d.streamId && e.stageId === stage.id && e.exercise === exercise); }
    function target() { const d=draft(); if(d.locked)return d.reference; const h=history(); return h.length>=d.lag?h[h.length-d.lag]:null; }
    function staleReference() { const d=draft(); if(!d.locked||!d.reference)return false; const h=history(),exact=h[h.length-d.lag]; return !exact||exact.id!==d.reference.id||exact.source!==d.reference.source; }
    function dirty() { return [...drafts.values()].some(d => ['source','recollection','relation','revision'].some(k => d[k].trim())); }
    function runningSession() { return clock && ['running','paused'].includes(clock.snapshot().status); }
    function message(text) { announcement = text; const el=q('[data-message]'); if(el) el.textContent=text; }
    function save(data) { const result = store.save(data); unsaved = !result.ok; if (!result.ok) message(result.error + ' Your existing record is preserved and can be downloaded below. Any unfinished note remains in this tab.'); renderStorage(); return result; }
    function renderStorage() {
      const el=q('[data-storage]'); if (!el) return;
      el.hidden = !store.warning;
      el.textContent = store.warning || '';
      const recovery=q('[data-original]'); if(recovery) recovery.hidden = !store.warning || !store.originalRaw;
      const reload=q('[data-reload]'); if(reload) reload.hidden = !store.warning;
    }
    function download(text, suffix) {
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'})), link=document.createElement('a');
      link.href=url;link.download='Philosophy-of-Intelligence-'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    function finishRecord(snapshot) {
      if (recorded || !clock || snapshot.elapsedSeconds <= 0) return;
      const data=store.data,id=uid();
      data.sessions.push({id,stageId:stage.id,exercise,endedAt:new Date().toISOString(),seconds:snapshot.elapsedSeconds,completed:snapshot.status==='completed'});
      save(data);recorded=store.data.sessions.some(period=>period.id===id);renderRecord();
      if(!recorded)message('This '+time(snapshot.elapsedSeconds)+' practice period could not be added to the saved record. Your earlier periods and unfinished notes are preserved. Download and clear a full record before starting another timed period.');
    }
    function pause() {
      if (clock && clock.snapshot().status === 'running') clock.pause();
      audio.stop();testAudio.stop();tick();
    }
    function end() {
      audio.stop();testAudio.stop();
      if(!clock)return;
      clock.end();finishRecord(clock.snapshot());tick();renderReadiness();
    }
    function breathBellEnabled() { return exercise==='heart' && heartBell && pacing==='paced'; }
    function audioEnabled() { return sound || breathBellEnabled(); }
    function startAudio() {
      if(audioEnabled() && !audio.start({frequency:sound?frequency:0,bellVolume})) message('Sound is unavailable in this browser. The exercise continues silently.');
    }
    function refreshAudio() {
      audio.stop();
      if(clock?.snapshot().status==='running')startAudio();
    }
    function setPacing(value) {
      pacing=value;pacingByExercise[exercise]=value;
      q('[data-pacing]').value=pacing;lastPrompt='';refreshAudio();tick();
    }
    function soundSummary() { return exercise==='heart'?'Ambient '+(sound?'on':'off'):(sound?'on':'off'); }
    function start() {
      if (runningSession()) return;
      if(store.data.sessions.length>=root.FormTrainingStore.LIMITS.sessions){message('Your record contains '+root.FormTrainingStore.LIMITS.sessions+' practice periods. Download it, then clear it before starting another timed period. You can still practise without the timer.');return;}
      recorded=false;peek=null;lastBodyStep=-1;lastCue='';lastPrompt='';message('');
      clock = new E.ExerciseClock({exercise,duration:duration*60,onComplete:snapshot=>{
        finishRecord(snapshot); if(audioEnabled())audio.complete();
        if(recorded)message(unsaved?'Practice complete. This tab holds your record; download it before leaving because browser storage did not save it.':'Practice complete. Take a moment to review your relationships.');
        renderReadiness();
      }});
      q('[data-return]').open=false;
      clock.start(); startAudio(); tick();
    }
    function resume() {
      if (!clock) return;
      q('[data-return]').open=false;
      clock.resume();startAudio();tick();
    }
    function instructionHTML() {
      if(exercise==='stream') return `<ol class="training-method"><li><strong>Inhale: receive and select.</strong> Eyes closed if comfortable, allow imagery, thought or meaning to arise. Select the current shape’s relationships within that content. A scene may continue; it need not change on every breath.</li><li><strong>Exhale: encode first.</strong> Preserve the selected relationships at the next distinct address in your familiar home. Finish that selection before deliberately retrieving the earlier entry.</li><li><strong>Then retrieve, compare and revise.</strong> Return to the exact scheduled earlier address (one marked entry back by default), recover that entry, and compare it with the current one. Keep both originals; append a correction instead of replacing either.</li></ol><p class="training-fine">This version takes place within the consciousness stream. It requires no body scan or heart-area focus. Spontaneous memories can arise; the order concerns when you deliberately retrieve for comparison.</p>`;
      if(exercise==='heart') return `<ol class="training-method"><li><strong>Heart-focused breathing.</strong> Bring attention to the chest. Imagine the breath moving through this area, without changing how deeply you breathe.</li><li><strong>Heart feeling.</strong> Invite a sincere feeling of love, care or appreciation. Notice what is actually present; warmth does not have to appear.</li><li><strong>Sustain and deepen.</strong> Stay gently with that feeling. When attention wanders, return. A quieter or absent feeling is also an observation.</li></ol><p class="training-fine">The timer moves through these three phases. “Coherence” is the source exercise’s name; this page does not measure heart rhythm or physiological coherence.</p>`;
      return `<p>Follow one sensation through seven dimensions. Each receives 30 seconds, then the sequence repeats. A dimension may be unclear or absent. These prompts help you find content; they are not the relationships counted by the shape.</p><ol class="training-method">${E.BODY_STEPS.map(s=>`<li><strong>${esc(s.label)}.</strong> ${esc(s.prompt)}</li>`).join('')}</ol><p class="training-fine">An emotion name is a tentative interpretation of your experience. A body location or texture does not determine a particular emotion.</p>`;
    }
    function currentModel() { return stage[exercise].model||root.FormRelationalModels?.getModel(stage.id,exercise); }
    function modelParts(model,stateIndex=modelState) {
      const state=model.states?.[stateIndex];
      return {state,relations:state?.relations||model.relations||[],nodes:state?.nodes||model.nodes||[]};
    }
    function modelHTML(model,stateIndex=0) {
      const {state,relations,nodes}=modelParts(model,stateIndex),changed=new Set(state?.changedRelationIds||[]);
      return `<p>${esc(state?.label||model.description||'Complete selected relationships for this entry.')}</p><p class="training-fine">${relations.length} relationship${relations.length===1?'':'s'} across ${nodes.length} roles. ${stateIndex===0?'This is the complete starting model.':changed.size?changed.size+' relationship'+(changed.size===1?' changes':'s change')+' from the previous entry; all others are retained.':'Every relationship is retained from the previous entry.'}</p><ol class="training-register">${relations.map(relation=>`<li${changed.has(relation.id)?' class="training-relationship-changed"':''}><span><button type="button" class="training-relation-link" data-trace-relation="${esc(relation.id)}" aria-pressed="${relation.id===selectedRelationship}" aria-label="Trace ${esc(relation.id)}: ${esc(relation.text)}">${esc(relation.id)}</button>${changed.has(relation.id)?'<small>Changed</small>':''}</span><p>${esc(relation.text)}</p></li>`).join('')}</ol>`;
    }
    function explorerHTML(model) {
      return `<div class="training-model-explorer" data-model-explorer><p class="eyebrow">SEE THE RELATIONSHIPS</p><div class="training-explorer-controls"><label class="training-register-picker">Inspect the whole entry<select data-model-state aria-label="Inspect the whole entry">${(model.states||[{breath:1}]).map((state,i)=>`<option value="${i}">Breath ${i+1} · full model</option>`).join('')}</select></label><label class="training-register-picker">Trace a relationship<select data-model-relation aria-label="Trace a relationship"><option value="">Whole structure</option></select></label></div><p class="training-fine" data-model-state-summary></p><figure class="training-network"><div data-model-diagram></div><div class="training-network-key" aria-label="Diagram legend"><span><i aria-hidden="true"></i>Relationship</span><span><i class="is-changed" aria-hidden="true"></i>Changed since the previous entry</span><span><i class="is-traced" aria-hidden="true"></i>Traced relationship</span></div><figcaption class="training-fine">${stage.id==='circle'?'Two roles, one selected relationship. The Circle icon denotes a complete relational unit; it is not an extra link or a self-loop.':stage.id==='half-circle'?'Two roles, two distinct selected relationships. The two arcs have different meanings; inverse wording alone would still be one relationship.':'Each line is one registered relationship between identified roles. The sentence gives its meaning; the drawing shows how the whole selection is connected.'}</figcaption></figure><div class="training-traced-relationship" data-traced-relationship role="status"></div><details class="training-model-roles" data-model-role-key><summary data-model-role-summary>Numbered role key</summary><dl data-model-role-list></dl></details></div>`;
    }
    function updateExplorer() {
      const model=currentModel();if(!model||!q('[data-model-diagram]'))return;
      const {state,relations,nodes}=modelParts(model),nodeNames=new Map(nodes.map(node=>[node.id,node.label])),nodeNumbers=new Map(nodes.map((node,index)=>[node.id,index+1]));
      if(selectedRelationship&&!relations.some(relation=>relation.id===selectedRelationship))selectedRelationship='';
      const picker=q('[data-model-relation]');
      picker.innerHTML='<option value="">Whole structure</option>'+relations.map(relation=>`<option value="${esc(relation.id)}" ${relation.id===selectedRelationship?'selected':''}>${esc(relation.id)} · ${nodeNumbers.get(relation.from)} ${esc(nodeNames.get(relation.from)||relation.from)} / ${nodeNumbers.get(relation.to)} ${esc(nodeNames.get(relation.to)||relation.to)}</option>`).join('');
      picker.value=selectedRelationship;
      q('[data-model-state-summary]').textContent=(state?.label||model.description||'Complete selected model')+' · '+relations.length+' relationship'+(relations.length===1?'':'s')+' / '+nodes.length+' roles';
      q('[data-model-diagram]').innerHTML=root.FormModelView?root.FormModelView.render(model,modelState+1,selectedRelationship||undefined):'<p class="training-fine">The full relationship register below describes this model.</p>';
      const selected=relations.find(relation=>relation.id===selectedRelationship);
      q('[data-traced-relationship]').innerHTML=selected?`<p class="eyebrow">${esc(selected.id)} · SELECTED RELATIONSHIP</p><p>${esc(selected.text)}</p><p class="training-fine">Roles ${nodeNumbers.get(selected.from)} and ${nodeNumbers.get(selected.to)}: ${esc(nodeNames.get(selected.from)||selected.from)} / ${esc(nodeNames.get(selected.to)||selected.to)} · The full model still contains ${relations.length} relationship${relations.length===1?'':'s'}.</p>`:`<p>Whole structure · ${relations.length} relationship${relations.length===1?'':'s'}</p><p class="training-fine">Choose a relationship to trace its two roles and read its complete meaning. The remaining relationships stay present.</p>`;
      q('[data-model-role-summary]').textContent='Numbered role key · '+nodes.length+' roles';
      q('[data-model-role-list]').innerHTML=nodes.map((node,index)=>`<dt>${index+1} · ${esc(node.id)}</dt><dd>${esc(node.label)}</dd>`).join('');
      all('[data-trace-relation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.traceRelation===selectedRelationship)));
    }
    function bindRegister() {
      all('[data-trace-relation]').forEach(button=>button.addEventListener('click',()=>{selectedRelationship=button.dataset.traceRelation;updateExplorer();q('[data-model-relation]').focus();q('[data-model-explorer]').scrollIntoView({block:'nearest'});}));
    }
    function workedExampleHTML(guide) {
      const examples=guide.examples||[], model=guide.model||root.FormRelationalModels?.getModel(stage.id,exercise);
      const register=guide.register||model?.relations||[];
      const places=examples.map((example,index)=>example.address||D.ADDRESSES[index]);
      return `<section class="training-panel training-examples" aria-labelledby="worked-example-title" data-examples>
        <p class="eyebrow">LEARN THE RELATIONSHIPS</p><h2 id="worked-example-title">Four breaths through ${esc(stage.name)}</h2>
        <p>${esc(stage.preparation||'Read the example first, then practise with your own content.')}</p>${guide.preparation?`<p>${esc(guide.preparation)}</p>`:''}
        <p class="training-fine">Begin a fresh history for this walkthrough. Each current entry preserves the whole selected structure. The memory address and the comparison with the previous entry do not add to its relationship count.</p>
        ${guide.baseline?`<details class="training-example-baseline"><summary>Understand the starting scene</summary><p>${esc(guide.baseline)}</p></details>`:''}
        ${model?explorerHTML(model):''}
        <ol class="training-breath-examples">${examples.map((example,i)=>`<li data-example="${i+1}"><div class="training-example-heading"><span>BREATH ${i+1}</span><small>${esc(places[i])} · ${i===0?'seed the history':'return to '+places[i-1].toLowerCase()}</small></div><dl><dt>Inhale · receive and select</dt><dd>${esc(example.inhale)}</dd><dt>Exhale · encode first</dt><dd>${esc(example.encode)}</dd><dt>${i===0?'Complete the first entry':'Same exhale · retrieve, compare, revise'}</dt><dd>${esc(example.compare)}</dd></dl></li>`).join('')}</ol>
        <p class="training-fine">Use one row per breath only when the full operation fits comfortably. If an entry needs additional natural breaths, finish it at your own pace and count marked entries (N = 1), not actual breaths (B = 1). A large prepared model is a rehearsal, not a demand to invent or recite every relationship in one breath.</p>
        ${register.length?`<details class="training-model" data-model-register><summary>Full relationship register · ${register.length} relationship${register.length===1?'':'s'}</summary><p>${esc(model?.description||'These are the complete selected relationships for the starting model.')}</p>${model?.graphConvention?`<p class="training-fine">${esc(model.graphConvention)}</p>`:''}<div data-model-content>${modelHTML(model||{relations:register})}</div></details>`:''}
      </section>`;
    }
    function render() {
      modelState=0;selectedRelationship='';
      const guide = stage[exercise], ready=store.data.readiness[stage.id]||{};
      host.innerHTML=`<div class="training-topline"><a class="back-link" href="#journey">← All shapes</a><label class="training-shape-picker">Shape <select data-shape aria-label="Choose a shape">${D.STAGES.map((s,i)=>`<option value="${esc(s.id)}" ${s.id===stage.id?'selected':''}>${String(i+1).padStart(2,'0')} · ${esc(s.name)}</option>`).join('')}</select></label></div>
        <header class="training-heading"><span aria-hidden="true">${G.miniIcon(stage.id,86)}</span><div><p class="eyebrow">BREATH-BACK · SHAPE ${String(D.STAGES.indexOf(stage)+1).padStart(2,'0')} OF 14</p><h1>${esc(stage.name)} <em>/ ${esc(stage.verb)}</em></h1><p>${esc(stage.theory)}</p><p class="training-shape-count">${esc(stage.relationCount)} selected relationship${stage.relationCount===1?'':'s'} · ${esc(stage.topology||'')}</p></div></header>
        <div class="training-exercises" role="group" aria-label="Choose an exercise">${exerciseOrder.map((name,i)=>`<button type="button" data-exercise="${name}" aria-pressed="${exercise===name}"><span>0${i+1}</span> ${exerciseNames[name]} <small>${ready[name]?'Self-assessed: ready':exerciseHints[name]}</small></button>`).join('')}</div>
        <div data-storage class="training-notice" role="status" hidden></div><p data-message class="training-message" role="status">${esc(announcement)}</p>
        <div class="training-layout"><div class="training-primary"><section class="training-panel" aria-labelledby="exercise-title">
          <div class="training-panel-heading"><div><p class="eyebrow">THE EXERCISE</p><h2 id="exercise-title">${exerciseNames[exercise]}</h2></div><div class="training-panel-controls"><span data-session-state class="training-state">At your own pace</span><button type="button" class="text-button training-bell-toggle" data-heart-bell aria-pressed="${heartBell}" aria-label="${heartBell?'Mute breath bell':'Enable breath bell'}" title="Rings at each timed inhale and exhale" ${exercise==='heart'?'':'hidden'}>Bell: ${heartBell?'on':'off'}</button></div></div>
          <div data-setup><p>${exercise==='stream'?'Let a scene, thought or meaning arise. Notice the relationships within it, then make a breath-back return.':exercise==='heart'?'Settle attention in the heart area and invite sincere care. Notice meaningful relationships within this experience.':'Attend to sensations and their context. Use the mapping prompts to notice content, then select meaningful relationships within it.'}</p>
          <div class="training-settings"><label>Practice length<select data-duration>${(exercise==='stream'?E.STREAM_DURATIONS:exercise==='heart'?E.HEART_DURATIONS:E.BODY_DURATIONS).map(m=>`<option value="${m}" ${m===duration?'selected':''}>${m<60?m+' minutes':m/60+(m===60?' hour':' hours')}</option>`).join('')}</select></label><label>Breathing<select data-pacing><option value="natural" ${pacing==='natural'?'selected':''}>My own rhythm</option><option value="paced" ${pacing==='paced'?'selected':''}>5 seconds in · 5 seconds out</option></select></label></div>
          <p class="training-fine">Breathe gently, without forcing or holding. Follow your own rhythm whenever that feels more comfortable. Stop if you feel dizzy or uncomfortable. You may end the exercise at any time.</p><button type="button" class="button primary" data-start>Begin ${exercise==='stream'?'stream practice':exercise==='heart'?'heart practice':'body mapping'} <span aria-hidden="true">↗</span></button></div>
          <div data-live hidden><div class="training-session-bar"><span data-timer aria-label="Time remaining">15:00</span><div><button type="button" class="text-button" data-pause>Pause</button><button type="button" class="text-button" data-end>End practice</button></div></div>
            <div class="training-pacer" data-pacer><div data-orb class="training-orb" aria-hidden="true"></div><div class="training-breath-readout"><span data-breath aria-live="polite">Own rhythm</span><small data-breath-count aria-hidden="true"></small></div></div>
            <button type="button" class="text-button training-live-pace" data-live-pace>Use a gentle 5 / 5 guide</button><p data-step-label class="eyebrow training-current-step"></p><h3 data-dimension class="training-dimension" hidden></h3><p data-prompt class="training-prompt"></p><p data-next-step class="training-fine training-centered"></p>
            <div data-body-steps class="training-body-steps" role="group" aria-label="Reread a body dimension" ${exercise==='body'?'':'hidden'}>${E.BODY_STEPS.map((s,i)=>`<button type="button" data-peek="${i}" aria-pressed="false">${esc(s.label)}</button>`).join('')}</div>
            <div class="training-progress" role="progressbar" aria-label="Session time elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-fill></span></div>
            <div data-finished class="training-finish" hidden><h3>Carry the relation forward.</h3><p>For your next return, select and encode the current relationships before deliberately retrieving the scheduled earlier entry. Compare and append any revision while preserving both originals. Time spent records practice, not ability.</p><button type="button" class="button secondary" data-again>Practise again</button></div></div>
          <details class="training-sound"><summary>Sound settings <span data-sound-summary>${soundSummary()}</span></summary><label class="training-check"><input type="checkbox" data-sound ${sound?'checked':''}> ${exercise==='body'?'Enable body mapping bells and ambient sound':'Enable ambient sound'}</label><div class="training-settings"><label>Ambient pulse<select data-frequency>${[0,1,2,3,8,10,12].map(f=>`<option value="${f}" ${f===frequency?'selected':''}>${f===0?'Off · bells only':f+' Hz'}</option>`).join('')}</select></label><label>Bell volume <output data-volume-label>${Math.round(bellVolume*100)}%</output><input data-volume type="range" min="0" max="1.5" step="0.01" value="${bellVolume}" aria-label="Bell volume"></label></div><button type="button" class="text-button" data-test-sound>Test bell</button><p class="training-fine">The source’s bowl tones and ambient options are listening preferences. They do not measure or guarantee a mental state. In your own rhythm, heart practice has no timed breathing bells. Consciousness Stream has no automatic bell cadence.</p></details>
          <details class="training-instructions"><summary>How to practise ${exerciseNames[exercise]}</summary>${instructionHTML()}</details>
        </section>
        ${workedExampleHTML(guide)}
        <details data-return class="training-panel training-return"><summary><span>Make a breath-back return</span><small>Practise mentally, or keep an optional private note.</small></summary><p>Pause the timer and breathe freely. On the inhale, receive and select your current relationships. On the exhale, encode them first at a distinct home address; only then deliberately retrieve the exact earlier entry, compare and revise. The notes below count marked entries (N), independently of the breathing guide.</p><div class="training-return-guide"><strong>${esc(stage.name)} · ${esc(stage.verb)}</strong><p>${esc(guide.recall)}</p></div><form data-return-form><div data-fields></div><button type="submit" class="button primary" data-keep>Keep this entry</button><p class="training-fine">Notes stay in this browser. You can practise all of these steps silently without writing.</p></form></details>
        <section data-readiness class="training-panel training-readiness"></section>
        </div><aside class="training-theory"><p class="eyebrow">APPLY THE SHAPE</p><h2>${esc(stage.name)} in ${exerciseNames[exercise]}</h2><ol>${['notice','recall','relate','revise'].map((part,i)=>`<li><span class="training-step-number">0${i+1}</span><div><h3>${{notice:'Receive & encode',recall:'Retrieve',relate:'Compare',revise:'Revise'}[part]}</h3><p>${esc(guide[part])}</p></div></li>`).join('')}</ol><p class="training-fine">The full breath-back action applies at every shape. The shape organises the current entry’s relationships; encoding, memory addresses, retrieval and comparison are already present from Circle. Breathing never has to become slower or deeper.</p><a class="text-link" href="#philosophy">Read the shape philosophy →</a></aside></div>
        <details class="training-record"><summary>Your practice record <span data-record-count></span></summary><p class="training-fine">Self-assessments describe your judgement, not a test score. Observations may contain personal information; a download includes your private notes.</p><div data-record></div><div class="training-record-actions"><button type="button" class="text-button" data-export>Download practice record (includes notes)</button><button type="button" class="text-button" data-original hidden>Download original saved data</button><button type="button" class="text-button" data-reload hidden>Load saved version</button><button type="button" class="text-button" data-reset>Clear this practice record</button></div></details>
        <p class="training-attribution">Heart and body exercise formats adapted from <a href="https://o0ooooooooooo0o.github.io/Project-Meaning/" target="_blank" rel="noopener noreferrer">Project Meaning</a>. The standalone stream practice and revised relationship atlas follow Philosophy of Intelligence. Heart and body exercise formats retain their distinct attention prompts. <a href="#palace">Earlier saved observations →</a></p>`;
      q('[data-shape]').addEventListener('change',e=>onStageChange(e.target.value));
      q('[data-model-state]')?.addEventListener('change',event=>{const model=currentModel(),index=Number(event.target.value);if(!Number.isInteger(index)||!model.states?.[index])return;modelState=index;q('[data-model-content]').innerHTML=modelHTML(model,index);bindRegister();updateExplorer();});
      q('[data-model-relation]')?.addEventListener('change',event=>{selectedRelationship=event.target.value;updateExplorer();});
      bindRegister();updateExplorer();
      all('[data-exercise]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.exercise===exercise)return;end();clock=null;exercise=el.dataset.exercise;pacing=pacingByExercise[exercise];duration=15;peek=null;lastPrompt='';announcement='';render();}));
      q('[data-duration]').addEventListener('change',e=>duration=Number(e.target.value));
      q('[data-pacing]').addEventListener('change',e=>setPacing(e.target.value));
      q('[data-start]').addEventListener('click',start);q('[data-again]').addEventListener('click',start);
      q('[data-pause]').addEventListener('click',()=>clock.snapshot().status==='running'?pause():resume());
      q('[data-end]').addEventListener('click',end);
      q('[data-live-pace]').addEventListener('click',()=>setPacing(pacing==='natural'?'paced':'natural'));
      q('[data-heart-bell]').addEventListener('click',()=>{heartBell=!heartBell;const button=q('[data-heart-bell]');button.textContent='Bell: '+(heartBell?'on':'off');button.setAttribute('aria-pressed',String(heartBell));button.setAttribute('aria-label',heartBell?'Mute breath bell':'Enable breath bell');refreshAudio();});
      q('[data-sound]').addEventListener('change',e=>{sound=e.target.checked;refreshAudio();q('[data-sound-summary]').textContent=soundSummary();});
      q('[data-frequency]').addEventListener('change',e=>{frequency=Number(e.target.value);bellVolume=volumes[frequency];q('[data-volume]').value=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';refreshAudio();});
      q('[data-volume]').addEventListener('input',e=>{bellVolume=Number(e.target.value);volumes[frequency]=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';refreshAudio();});
      q('[data-test-sound]').addEventListener('click',()=>{if(!testAudio.start({frequency:0,bellVolume})){message('Sound is unavailable in this browser.');return;}testAudio.cue(true);});
      all('[data-peek]').forEach(el=>el.addEventListener('click',()=>{const i=Number(el.dataset.peek);peek=peek===i?null:i;lastPrompt='';tick();}));
      q('[data-return]').addEventListener('toggle',()=>{if(q('[data-return]').open){pause();renderFields();}});
      q('[data-return-form]').addEventListener('submit',saveObservation);
      q('[data-export]').addEventListener('click',()=>download(store.exportJSON(),'practice-private'));
      q('[data-original]').addEventListener('click',()=>download(store.originalRaw,'original-recovery'));
      q('[data-reload]').addEventListener('click',()=>{if(!root.confirm('Load the saved version from this browser? Download this tab’s record first to keep any work that could not be saved. Unfinished notes stay in this tab.'))return;pause();const result=store.reload();if(result.ok){unsaved=false;renderStorage();renderReadiness();renderRecord();renderFields();message('Saved version loaded.');}else message(result.error);});
      q('[data-reset]').addEventListener('click',()=>{if(!root.confirm('Clear this browser’s new practice record, including private notes and self-assessments? Earlier archive data is kept. Download a copy first if you want to keep it.'))return;end();const result=store.reset();if(!result.ok){message(result.error);return;}clock=null;unsaved=false;drafts.clear();message('This practice record has been cleared.');render();});
      renderFields();renderReadiness();renderRecord();renderStorage();tick();
      q('[data-sound-summary]').textContent=soundSummary();
    }
    function renderFields() {
      const d=draft(), old=target(), h=history(), stale=staleReference(), draftKey=key(), generation=++fieldsGeneration;
      const isCurrent=()=>generation===fieldsGeneration&&key()===draftKey&&drafts.get(draftKey)===d;
      q('[data-fields]').innerHTML=`${stale?`<div class="training-notice" role="status"><p>The saved version no longer contains this return’s exact earlier entry. Your current selection, recollection and earlier source remain here; the target has not been changed.</p><button type="button" class="text-button" data-recover-return>Download this unfinished return and begin new history</button></div>`:''}<p class="training-return-phase">${d.revealed?'03 · Compare the preserved entries':d.locked?'02 · Retrieve the exact earlier entry':'01 · Receive and encode the current entry'}</p>
        <label class="training-field">My current relationship${stage.relationCount===1?'':'s'}<textarea data-note="source" rows="3" maxlength="3000" required ${d.locked?'readonly':''} placeholder="Preserve the selected relationships, their roles and meanings. This is the current entry, before deliberate retrieval.">${esc(d.source)}</textarea></label>
        <label class="training-lag">Return distance<select data-lag ${d.locked?'disabled':''}>${[1,2,3,4].map(n=>`<option value="${n}" ${n===d.lag?'selected':''}>${n} marked entr${n===1?'y':'ies'} back (N = ${n})</option>`).join('')}</select></label>
        <p class="training-fine">${h.length} entr${h.length===1?'y':'ies'} in this ${esc(stage.name)} / ${esc(exerciseNames[exercise])} stream. Each entry has its own home address. Extra breaths do not move this return distance.</p>
        ${old?`${!d.locked?`<button type="button" class="button secondary" data-lock-source>Encode current entry, then retrieve →</button><p class="training-fine">Keep the current selection first. Deliberate retrieval starts after this step.</p>`:`<label class="training-field">My recollection, before looking<textarea data-note="recollection" rows="2" maxlength="3000" ${d.revealed?'readonly':''} placeholder="Retrieve from the earlier address, or write ‘I do not recall’.">${esc(d.recollection)}</textarea></label><button type="button" class="text-button" data-reveal ${d.revealed?'disabled':''}>Keep recollection and reveal original →</button>`}
          <div class="training-original" ${d.revealed?'':'hidden'}><p class="eyebrow">PRESERVED ORIGINAL · ${d.lag} BACK</p><p>${d.revealed?esc(old.source):''}</p></div>`:`<p class="training-empty-return">Keep ${Math.max(0,d.lag-h.length)} more entr${d.lag-h.length===1?'y':'ies'} to create a ${d.lag}-back return. Encode the current relationships at their own address. This builds the history; no earlier target is invented.</p>`}
        ${d.revealed?`<label class="training-field">My comparison <span>(optional note)</span><textarea data-note="relation" rows="3" maxlength="3000" placeholder="${esc(stage[exercise].relate)}">${esc(d.relation)}</textarea></label><label class="training-field">My correction or uncertainty <span>(optional note)</span><textarea data-note="revision" rows="2" maxlength="3000" placeholder="${esc(stage[exercise].revise)}">${esc(d.revision)}</textarea></label><p class="training-fine">Compare the exact earlier entry with the encoded current one. Preserve both originals. A changed selection does not by itself make the earlier relationship false.</p>`:''}
        <button type="button" class="text-button" data-fresh>Begin a fresh observation stream</button>`;
      all('[data-note]').forEach(el=>el.addEventListener('input',()=>{const field=el.dataset.note;if(!isCurrent()||el.readOnly||(field==='source'&&d.locked)||(field==='recollection'&&d.revealed)||(['relation','revision'].includes(field)&&!d.revealed))return;d[field]=el.value;}));
      q('[data-lag]').addEventListener('change',e=>{if(!isCurrent()||d.locked)return;d.lag=Number(e.target.value);d.recollection='';d.revealed=false;renderFields();});
      q('[data-lock-source]')?.addEventListener('click',()=>{
        if(!isCurrent()||d.locked)return;
        if(!d.source.trim()){message('First select and describe the current relationships.');q('[data-note="source"]').focus();return;}
        d.reference={id:old.id,source:old.source};d.locked=true;renderFields();message('Current entry encoded. Now retrieve the exact earlier entry before looking.');q('[data-note="recollection"]').focus();
      });
      q('[data-reveal]')?.addEventListener('click',()=>{
        if(!isCurrent()||!d.locked||d.revealed)return;
        if(!d.recollection.trim()){message('Write what you remember, or “I do not recall”, before revealing the original.');q('[data-note="recollection"]').focus();return;}
        d.revealed=true;renderFields();message('Recollection kept. Compare both preserved entries, then append any correction.');q('[data-note="relation"]').focus();
      });
      q('[data-recover-return]')?.addEventListener('click',()=>{if(!isCurrent())return;download(JSON.stringify({kind:'unfinished-breath-back-return',stageId:stage.id,exercise,...d},null,2),'unfinished-return');const source=d.source,lag=d.lag;drafts.delete(key());const fresh=draft();fresh.source=source;fresh.lag=lag;renderFields();message('Unfinished return downloaded. The same current selection is ready to seed a new history; no earlier target has been substituted.');});
      const keep=q('[data-keep]');if(keep){keep.disabled=stale||!!old&&!d.revealed;keep.textContent=old?'Keep this return':'Keep this entry';}
      q('[data-fresh]').addEventListener('click',()=>{if(!isCurrent())return;if(['source','recollection','relation','revision'].some(field=>d[field].trim())&&!root.confirm('Begin a fresh stream and discard the unfinished note for this exercise? Saved observations stay in your record.'))return;drafts.delete(key());renderFields();message('A fresh observation stream is ready.');});
    }
    function saveObservation(event) {
      event.preventDefault();const d=draft(),old=target();
      if(!d.source.trim())return;
      if(staleReference()){message('This return’s exact earlier entry is absent from the loaded record. Download the unfinished return and begin a new history with your current selection.');q('[data-recover-return]').focus();return;}
      if(old&&!d.locked){message('Encode the current entry before deliberately retrieving the earlier one.');q('[data-lock-source]').focus();return;}
      if(old&&!d.revealed){message('Retrieve first, then reveal the preserved original before keeping your comparison. It is fine not to remember.');q('[data-reveal]').focus();return;}
      const data=store.data,id=uid();
      data.entries.push({id,stageId:stage.id,exercise,streamId:d.streamId,createdAt:new Date().toISOString(),source:d.source.trim(),recollection:d.recollection.trim(),referenceId:old?.id||null,referenceSource:old?.source||'',lag:d.lag,relation:d.relation.trim(),revision:d.revision.trim()});
      const result=save(data);
      if(store.data.entries.some(e=>e.id===id)){d.source='';d.recollection='';d.relation='';d.revision='';d.locked=false;d.reference=null;d.revealed=false;renderFields();renderRecord();if(result.ok)message('Entry kept. Its original wording and the earlier original are preserved.');}
    }
    function renderReadiness() {
      const el=q('[data-readiness]');if(!el)return;
      const ready=store.data.readiness[stage.id]||{},next=D.STAGES[D.STAGES.indexOf(stage)+1];
      const other=exerciseOrder[(exerciseOrder.indexOf(exercise)+1)%exerciseOrder.length];
      el.innerHTML=`<p class="eyebrow">WHEN THE SHAPE BECOMES CLEAR</p><h2>Reflect before moving on.</h2><p>Use your own judgement after practice. Can you do the following in this exercise without depending on the prompts?</p><ul>${stage.readiness.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><label class="training-check"><input type="checkbox" data-ready ${ready[exercise]?'checked':''}> I can apply ${esc(stage.name)} in ${exerciseNames[exercise]}.</label><div class="training-readiness-status">${exerciseOrder.map(name=>`<span>${name==='stream'?'Stream':name==='heart'?'Heart':'Body'} ${ready[name]?'✓':'○'}</span>`).join('')}<small>Self-assessed readiness</small></div><p>${ready[exercise]?(next?'You have marked this application ready. Explore '+esc(next.name)+' when you want to practise its organisation.':'You have marked this application ready. Return to any shape when it serves the content you are considering.'):'Practise this application until you can identify its relationships and preserve the full breath-back action. Each exercise has its own self-assessment.'}</p><div class="training-ready-actions"><button type="button" class="text-button" data-other>Try ${exerciseNames[other]} →</button>${next?`<a class="text-link" href="#practice/${esc(next.id)}">Explore ${esc(next.name)} →</a>`:''}</div><p class="training-fine">Every shape and exercise stays available. Readiness is reversible and is never awarded by the timer, a sensation rating, or a number of breaths.</p>`;
      q('[data-ready]').addEventListener('change',e=>{const data=store.data;data.readiness[stage.id]={stream:!!ready.stream,heart:!!ready.heart,body:!!ready.body,[exercise]:e.target.checked};save(data);renderReadiness();renderRecord();all('[data-exercise]').forEach(button=>{const name=button.dataset.exercise;button.querySelector('small').textContent=store.data.readiness[stage.id]?.[name]?'Self-assessed: ready':exerciseHints[name];});});
      q('[data-other]').addEventListener('click',()=>{end();clock=null;exercise=other;pacing=pacingByExercise[exercise];duration=15;peek=null;lastPrompt='';render();q('#exercise-title').scrollIntoView({block:'start'});});
    }
    function renderRecord() {
      const data=store.data;q('[data-record-count]').textContent='· '+data.entries.length+' observation'+(data.entries.length===1?'':'s');
      q('[data-record]').innerHTML=`<p>${data.sessions.length} recorded practice period${data.sessions.length===1?'':'s'} · ${data.entries.length} private observation${data.entries.length===1?'':'s'}</p>${data.entries.slice().reverse().map(e=>`<details class="training-saved-entry"><summary>${esc(D.getStage(e.stageId).name)} · ${exerciseNames[e.exercise]} · ${esc(new Date(e.createdAt).toLocaleString())}</summary><h4>Original observation</h4><p>${esc(e.source)}</p>${e.referenceId?`<h4>Recollection before reveal</h4><p>${esc(e.recollection||'No recollection recorded.')}</p><h4>Original ${e.lag} observation${e.lag===1?'':'s'} back</h4><p>${esc(e.referenceSource)}</p>`:''}${e.relation?`<h4>My comparison</h4><p>${esc(e.relation)}</p>`:''}${e.revision?`<h4>Appended correction</h4><p>${esc(e.revision)}</p>`:''}</details>`).join('')}`;
    }
    function tick() {
      if(!q('[data-live]'))return;
      if(!clock){q('[data-live]').hidden=true;q('[data-setup]').hidden=false;return;}
      const s=clock.tick(),active=['running','paused'].includes(s.status),finished=!active;
      q('[data-live]').hidden=false;q('[data-setup]').hidden=true;
      q('[data-session-state]').textContent=s.status==='running'?'Practising':s.status==='paused'?'Paused':s.status==='completed'?'Complete':'Ended';
      q('[data-timer]').textContent=time(s.remainingSeconds);
      q('[data-pause]').textContent=s.status==='paused'?'Resume':'Pause';q('[data-pause]').hidden=finished;q('[data-end]').hidden=finished;
      q('[data-finished]').hidden=!finished;
      q('[data-live-pace]').hidden=finished;q('[data-live-pace]').textContent=pacing==='natural'?'Use a gentle 5 / 5 guide':'Use my own rhythm';
      q('[data-shape]').disabled=active;all('[data-exercise]').forEach(el=>el.disabled=active);
      const scaled=pacing==='paced'&&s.status==='running';
      const progress=(5-s.breathRemaining)/5;
      q('[data-orb]').style.transform=scaled?'scale('+(0.8+0.65*(s.breathPhase==='inhale'?progress:1-progress))+')':'scale(1)';
      q('[data-pacer]').hidden=exercise==='body'&&pacing==='natural';
      q('[data-breath]').textContent=finished?'Rest':s.status==='paused'?'Own rhythm':pacing==='paced'?(s.breathPhase==='inhale'?'Inhale':'Exhale'):'Own rhythm';
      q('[data-breath-count]').textContent=scaled?Math.max(1,Math.ceil(s.breathRemaining))+' seconds':'Gently · without holds';
      if(s.bodyStepIndex!==lastBodyStep){peek=null;lastBodyStep=s.bodyStepIndex;}
      const promptKey=exercise+':'+(exercise==='body'?(peek??s.bodyStepIndex):(exercise==='heart'?s.heartPhaseIndex:stage.id)+':'+(pacing==='paced'?s.breathPhase:'natural'))+':'+(peek!==null);
      if(promptKey!==lastPrompt){
        lastPrompt=promptKey;
        if(exercise==='stream'){
          q('[data-step-label]').textContent='Consciousness stream · '+stage.name;
          q('[data-dimension]').hidden=true;
          q('[data-prompt]').textContent=pacing==='paced'?(s.breathPhase==='inhale'?'Receive the current scene or meaning. Select its relationships.':'Encode this entry first. Then retrieve the exact earlier entry, compare and revise.'):'Inhale: receive and select. Exhale: encode first, then retrieve, compare and revise.';
          q('[data-next-step]').textContent='Keep the same scene if it remains present. Take extra natural breaths whenever needed; the timer does not choose or count your entries.';
        }else if(exercise==='heart'){
          const p=E.HEART_PHASES[s.heartPhaseIndex];q('[data-step-label]').textContent=p.label;
          q('[data-prompt]').textContent=pacing==='paced'?p[s.breathPhase]:p.inhale+' '+p.exhale;
          q('[data-dimension]').hidden=true;q('[data-next-step]').textContent='Receive → encode → retrieve → compare → revise. Finish at your own pace.';
        }else{
          const i=peek??s.bodyStepIndex,p=E.BODY_STEPS[i];q('[data-step-label]').textContent=peek!==null?'Rereading · the exercise timer continues':'Dimension '+(i+1)+' of 7';
          q('[data-dimension]').hidden=false;q('[data-dimension]').textContent=p.label;q('[data-prompt]').textContent=p.prompt;
          all('[data-peek]').forEach(el=>{el.setAttribute('aria-pressed',String(Number(el.dataset.peek)===i));el.classList.toggle('is-current',Number(el.dataset.peek)===s.bodyStepIndex);});
        }
      }
      if(exercise==='body')q('[data-next-step]').textContent=finished?'Return to your own rhythm.':'Next: '+E.BODY_STEPS[(s.bodyStepIndex+1)%7].label+' · '+Math.ceil(s.stepRemaining)+'s'+(s.status==='paused'?' · paused':'');
      const cueKey=exercise==='heart'?Math.floor(s.elapsedSeconds/5):Math.floor(s.elapsedSeconds/30);
      if(s.status==='running'&&String(cueKey)!==lastCue){lastCue=String(cueKey);if(exercise==='heart'?breathBellEnabled():exercise==='body'&&sound)audio.cue(exercise==='heart'?s.breathPhase==='inhale':s.bodyStepIndex%2===0);}
      const percent=Math.round(s.progress*100);q('[data-fill]').style.width=percent+'%';q('.training-progress').setAttribute('aria-valuenow',String(percent));
    }
    function setStage(id) {
      const next=D.getStage(id);if(next.id===stage.id)return;
      end();clock=null;stage=next;peek=null;lastPrompt='';announcement='';render();
    }
    function storageChanged(event){if(event.key===root.FormTrainingStore.STORAGE_KEY||event.key===null){pause();save(store.data);renderStorage();message('Another tab changed the saved record. Your work in this tab is preserved. Download it before choosing Load saved version in Your practice record.');}}
    render();const interval=setInterval(tick,200);root.addEventListener('storage',storageChanged);
    return {setStage,pause,hasDraft:()=>dirty()||unsaved,destroy(){pause();clearInterval(interval);audio.destroy();testAudio.destroy();root.removeEventListener('storage',storageChanged);}};
  }
  root.FormTraining = Object.freeze({mount});
})(typeof window !== 'undefined' ? window : globalThis);
