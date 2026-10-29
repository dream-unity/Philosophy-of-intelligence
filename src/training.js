(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  const time = seconds => { const n = Math.max(0, Math.ceil(seconds)); return Math.floor(n / 60).toString().padStart(2,'0') + ':' + (n % 60).toString().padStart(2,'0'); };

  function mount({root: host, stageId, onStageChange}) {
    const D = root.FormShapePractice, E = root.FormExercises, G = root.FormGeometry;
    let storage; try { storage = root.localStorage; } catch (_) { storage = null; }
    const store = root.FormTrainingStore.createStore(storage);
    let stage = D.getStage(stageId), exercise = 'heart', clock = null, audio = new E.ExerciseAudio();
    let unsaved = false;
    const testAudio = new E.ExerciseAudio();
    let recorded = false, peek = null, lastBodyStep = -1, lastCue = '', lastPrompt = '', announcement = '';
    let sound = false, frequency = 10, bellVolume = 1, pacing = 'natural', duration = 15;
    const volumes = {0:1,1:.48,2:.48,3:.48,8:1,10:1,12:1}, drafts = new Map();
    const q = selector => host.querySelector(selector);
    const all = selector => [...host.querySelectorAll(selector)];
    const key = () => stage.id + ':' + exercise;
    function draft() {
      if (!drafts.has(key())) drafts.set(key(), {streamId:uid(),lag:1,source:'',recollection:'',relation:'',revision:'',revealed:false});
      return drafts.get(key());
    }
    function history() { const d = draft(); return store.data.entries.filter(e => e.streamId === d.streamId && e.stageId === stage.id && e.exercise === exercise); }
    function target() { const h = history(); return h.length >= draft().lag ? h[h.length - draft().lag] : null; }
    function dirty() { return [...drafts.values()].some(d => ['source','recollection','relation','revision'].some(k => d[k].trim())); }
    function runningSession() { return clock && ['running','paused'].includes(clock.snapshot().status); }
    function message(text) { announcement = text; const el=q('[data-message]'); if(el) el.textContent=text; }
    function save(data) { const result = store.save(data); unsaved = !result.ok; if (!result.ok) message(result.error + ' Your current record can be downloaded below.'); renderStorage(); return result; }
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
      recorded = true;
      const data=store.data;
      data.sessions.push({id:uid(),stageId:stage.id,exercise,endedAt:new Date().toISOString(),seconds:snapshot.elapsedSeconds,completed:snapshot.status==='completed'});
      save(data);renderRecord();
    }
    function pause() {
      if (clock && clock.snapshot().status === 'running') clock.pause();
      audio.stop();testAudio.stop();tick();
    }
    function end() {
      if(!clock)return;
      clock.end();audio.stop();finishRecord(clock.snapshot());tick();renderReadiness();
    }
    function startAudio() {
      if(sound && !audio.start({frequency,bellVolume})) message('Sound is unavailable in this browser. The exercise continues silently.');
    }
    function start() {
      if (runningSession()) return;
      recorded=false;peek=null;lastBodyStep=-1;lastCue='';lastPrompt='';message('');
      clock = new E.ExerciseClock({exercise,duration:duration*60,onComplete:snapshot=>{
        finishRecord(snapshot); if(sound)audio.complete();
        message('Practice complete. Take a moment to review what you noticed.');
        renderReadiness();
      }});
      q('[data-return]').open=false;
      clock.start(); startAudio(); tick();
    }
    function resume() {
      if (!clock) return;
      q('[data-return]').open=false;
      clock.resume();lastCue='';startAudio();tick();
    }
    function instructionHTML() {
      if(exercise==='heart') return `<ol class="training-method"><li><strong>Heart-focused breathing.</strong> Bring attention to the chest. Imagine the breath moving through this area, without changing how deeply you breathe.</li><li><strong>Heart feeling.</strong> Invite a sincere feeling of love, care or appreciation. Notice what is actually present; warmth does not have to appear.</li><li><strong>Sustain and deepen.</strong> Stay gently with that feeling. When attention wanders, return. A quieter or absent feeling is also an observation.</li></ol><p class="training-fine">The timer moves through these three phases. “Coherence” is the source exercise’s name; this page does not measure heart rhythm or physiological coherence.</p>`;
      return `<p>Follow one sensation through seven dimensions. Each receives 30 seconds, then the sequence repeats. A dimension may be unclear or absent.</p><ol class="training-method">${E.BODY_STEPS.map(s=>`<li><strong>${esc(s.label)}.</strong> ${esc(s.prompt)}</li>`).join('')}</ol><p class="training-fine">An emotion name is a tentative interpretation of your experience. A body location or texture does not determine a particular emotion.</p>`;
    }
    function render() {
      const guide = stage[exercise], ready=store.data.readiness[stage.id]||{};
      host.innerHTML=`<div class="training-topline"><a class="back-link" href="#journey">← All shapes</a><label class="training-shape-picker">Shape <select data-shape aria-label="Choose a shape">${D.STAGES.map((s,i)=>`<option value="${esc(s.id)}" ${s.id===stage.id?'selected':''}>${String(i+1).padStart(2,'0')} · ${esc(s.name)}</option>`).join('')}</select></label></div>
        <header class="training-heading"><span aria-hidden="true">${G.miniIcon(stage.id,86)}</span><div><p class="eyebrow">BREATH-BACK · SHAPE ${String(D.STAGES.indexOf(stage)+1).padStart(2,'0')} OF 14</p><h1>${esc(stage.name)} <em>/ ${esc(stage.verb)}</em></h1><p>${esc(stage.theory)}</p></div></header>
        <div class="training-exercises" role="group" aria-label="Choose an exercise"><button type="button" data-exercise="heart" aria-pressed="${exercise==='heart'}"><span>01</span> Heart-Coherence <small>${ready.heart?'Self-assessed: ready':'Attention · feeling · return'}</small></button><button type="button" data-exercise="body" aria-pressed="${exercise==='body'}"><span>02</span> Body-Sensation Mapping <small>${ready.body?'Self-assessed: ready':'Sensation · distinction · meaning'}</small></button></div>
        <div data-storage class="training-notice" role="status" hidden></div><p data-message class="training-message" role="status">${esc(announcement)}</p>
        <div class="training-layout"><div class="training-primary"><section class="training-panel" aria-labelledby="exercise-title">
          <div class="training-panel-heading"><div><p class="eyebrow">THE EXERCISE</p><h2 id="exercise-title">${exercise==='heart'?'Heart-Coherence':'Body-Sensation Mapping'}</h2></div><span data-session-state class="training-state">At your own pace</span></div>
          <div data-setup><p>${exercise==='heart'?'Settle your attention in the heart area, invite sincere care, and stay with what you feel.':'Attend to a sensation, distinguish its qualities, and let any meaning remain open to revision.'}</p>
          <div class="training-settings"><label>Practice length<select data-duration>${(exercise==='heart'?E.HEART_DURATIONS:E.BODY_DURATIONS).map(m=>`<option value="${m}" ${m===duration?'selected':''}>${m<60?m+' minutes':m/60+(m===60?' hour':' hours')}</option>`).join('')}</select></label><label>Breathing<select data-pacing><option value="natural" ${pacing==='natural'?'selected':''}>My own rhythm</option><option value="paced" ${pacing==='paced'?'selected':''}>5 seconds in · 5 seconds out</option></select></label></div>
          <p class="training-fine">Breathe gently, without forcing or holding. Follow your own rhythm whenever that feels more comfortable. Stop if you feel dizzy or uncomfortable. You may end the exercise at any time.</p><button type="button" class="button primary" data-start>Begin ${exercise==='heart'?'heart practice':'body mapping'} <span aria-hidden="true">↗</span></button></div>
          <div data-live hidden><div class="training-session-bar"><span data-timer aria-label="Time remaining">15:00</span><div><button type="button" class="text-button" data-pause>Pause</button><button type="button" class="text-button" data-end>End practice</button></div></div>
            <div class="training-pacer" data-pacer><div data-orb class="training-orb" aria-hidden="true"></div><div class="training-breath-readout"><span data-breath aria-live="polite">Own rhythm</span><small data-breath-count aria-hidden="true"></small></div></div>
            <button type="button" class="text-button training-live-pace" data-live-pace>Use a gentle 5 / 5 guide</button><p data-step-label class="eyebrow training-current-step"></p><h3 data-dimension class="training-dimension" hidden></h3><p data-prompt class="training-prompt"></p><p data-next-step class="training-fine training-centered"></p>
            <div data-body-steps class="training-body-steps" role="group" aria-label="Reread a body dimension" ${exercise==='body'?'':'hidden'}>${E.BODY_STEPS.map((s,i)=>`<button type="button" data-peek="${i}" aria-pressed="false">${esc(s.label)}</button>`).join('')}</div>
            <div class="training-progress" role="progressbar" aria-label="Session time elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-fill></span></div>
            <div data-finished class="training-finish" hidden><h3>Carry the relation forward.</h3><p>Return to an earlier observation, compare it with what is present now, and note what needs revising. Time spent is a record of practice, not a judgement of ability.</p><button type="button" class="button secondary" data-again>Practise again</button></div></div>
          <details class="training-sound"><summary>Sound <span data-sound-summary>off</span></summary><label class="training-check"><input type="checkbox" data-sound ${sound?'checked':''}> Enable optional sound</label><div class="training-settings"><label>Ambient pulse<select data-frequency>${[0,1,2,3,8,10,12].map(f=>`<option value="${f}" ${f===frequency?'selected':''}>${f===0?'Off · bells only':f+' Hz'}</option>`).join('')}</select></label><label>Bell volume <output data-volume-label>${Math.round(bellVolume*100)}%</output><input data-volume type="range" min="0" max="1.5" step="0.01" value="${bellVolume}" aria-label="Bell volume"></label></div><button type="button" class="text-button" data-test-sound>Test bell</button><p class="training-fine">The source’s bowl tones and ambient options are listening preferences. They do not measure or guarantee a mental state. In your own rhythm, heart practice has no timed breathing bells.</p></details>
          <details class="training-instructions"><summary>How to practise ${exercise==='heart'?'Heart-Coherence':'Body-Sensation Mapping'}</summary>${instructionHTML()}</details>
        </section>
        <details data-return class="training-panel training-return"><summary><span>Make a breath-back return</span><small>Practise mentally, or keep an optional private note.</small></summary><p>Pause the timer and breathe freely. Notice now, recall an earlier observation before looking, then compare and revise. A return counts an observation you deliberately marked—not every inhale or exhale.</p><div class="training-return-guide"><strong>${esc(stage.name)} · ${esc(stage.verb)}</strong><p>${esc(guide.recall)}</p></div><form data-return-form><div data-fields></div><button type="submit" class="button primary">Keep this observation</button><p class="training-fine">Notes stay in this browser. You can practise all of these steps silently without writing.</p></form></details>
        <section data-readiness class="training-panel training-readiness"></section>
        </div><aside class="training-theory"><p class="eyebrow">APPLY THE SHAPE</p><h2>${esc(stage.name)} in ${exercise==='heart'?'the heart exercise':'body mapping'}</h2><ol>${['notice','recall','relate','revise'].map((part,i)=>`<li><span class="training-step-number">0${i+1}</span><div><h3>${part[0].toUpperCase()+part.slice(1)}</h3><p>${esc(guide[part])}</p></div></li>`).join('')}</ol><p class="training-fine">Keep the exercise gentle as the relation becomes more complex. Change shape when you can apply it with clarity; breathing never has to become slower or deeper.</p><a class="text-link" href="#philosophy">Read the shape philosophy →</a></aside></div>
        <details class="training-record"><summary>Your practice record <span data-record-count></span></summary><p class="training-fine">Self-assessments describe your judgement, not a test score. Observations may contain personal information; a download includes your private notes.</p><div data-record></div><div class="training-record-actions"><button type="button" class="text-button" data-export>Download practice record (includes notes)</button><button type="button" class="text-button" data-original hidden>Download original saved data</button><button type="button" class="text-button" data-reload hidden>Load saved version</button><button type="button" class="text-button" data-reset>Clear this practice record</button></div></details>
        <p class="training-attribution">Exercises adapted from <a href="https://o0ooooooooooo0o.github.io/Project-Meaning/" target="_blank" rel="noopener noreferrer">Project Meaning</a>. Shape instruction follows Philosophy of Intelligence. <a href="#palace">Earlier saved observations →</a></p>`;
      q('[data-shape]').addEventListener('change',e=>onStageChange(e.target.value));
      all('[data-exercise]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.exercise===exercise)return;end();clock=null;exercise=el.dataset.exercise;duration=15;peek=null;lastPrompt='';announcement='';render();}));
      q('[data-duration]').addEventListener('change',e=>duration=Number(e.target.value));
      q('[data-pacing]').addEventListener('change',e=>pacing=e.target.value);
      q('[data-start]').addEventListener('click',start);q('[data-again]').addEventListener('click',start);
      q('[data-pause]').addEventListener('click',()=>clock.snapshot().status==='running'?pause():resume());
      q('[data-end]').addEventListener('click',end);
      q('[data-live-pace]').addEventListener('click',()=>{pacing=pacing==='natural'?'paced':'natural';q('[data-pacing]').value=pacing;lastPrompt='';lastCue='';tick();});
      q('[data-sound]').addEventListener('change',e=>{sound=e.target.checked;audio.stop();if(sound&&clock?.snapshot().status==='running')startAudio();q('[data-sound-summary]').textContent=sound?'on':'off';});
      q('[data-frequency]').addEventListener('change',e=>{frequency=Number(e.target.value);bellVolume=volumes[frequency];q('[data-volume]').value=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';audio.stop();if(sound&&clock?.snapshot().status==='running')startAudio();});
      q('[data-volume]').addEventListener('input',e=>{bellVolume=Number(e.target.value);volumes[frequency]=bellVolume;q('[data-volume-label]').textContent=Math.round(bellVolume*100)+'%';audio.stop();if(sound&&clock?.snapshot().status==='running')startAudio();});
      q('[data-test-sound]').addEventListener('click',()=>{if(!testAudio.start({frequency:0,bellVolume})){message('Sound is unavailable in this browser.');return;}testAudio.cue(true);});
      all('[data-peek]').forEach(el=>el.addEventListener('click',()=>{const i=Number(el.dataset.peek);peek=peek===i?null:i;lastPrompt='';tick();}));
      q('[data-return]').addEventListener('toggle',()=>{if(q('[data-return]').open){pause();renderFields();}});
      q('[data-return-form]').addEventListener('submit',saveObservation);
      q('[data-export]').addEventListener('click',()=>download(store.exportJSON(),'practice-private'));
      q('[data-original]').addEventListener('click',()=>download(store.originalRaw,'original-recovery'));
      q('[data-reload]').addEventListener('click',()=>{if(!root.confirm('Load the saved version from this browser? Download this tab’s record first to keep any work that could not be saved. Unfinished notes stay in this tab.'))return;pause();const result=store.reload();if(result.ok){unsaved=false;renderStorage();renderReadiness();renderRecord();renderFields();message('Saved version loaded.');}else message(result.error);});
      q('[data-reset]').addEventListener('click',()=>{if(!root.confirm('Clear this browser’s new practice record, including private notes and self-assessments? Earlier archive data is kept. Download a copy first if you want to keep it.'))return;end();const result=store.reset();if(!result.ok){message(result.error);return;}clock=null;unsaved=false;drafts.clear();message('This practice record has been cleared.');render();});
      renderFields();renderReadiness();renderRecord();renderStorage();tick();
      q('[data-sound-summary]').textContent=sound?'on':'off';
    }
    function renderFields() {
      const d=draft(), old=target(), h=history();
      q('[data-fields]').innerHTML=`<label class="training-field">My present observation<textarea data-note="source" rows="3" maxlength="3000" required ${d.revealed?'readonly':''} placeholder="What do I actually notice? Unclear or absent is also worth noticing.">${esc(d.source)}</textarea></label><label class="training-lag">Return distance<select data-lag ${d.revealed?'disabled':''}>${[1,2,3,4].map(n=>`<option value="${n}" ${n===d.lag?'selected':''}>${n} marked observation${n===1?'':'s'} back</option>`).join('')}</select></label><p class="training-fine">${h.length} observation${h.length===1?'':'s'} in this ${esc(stage.name)} / ${exercise==='heart'?'heart':'body'} stream. Extra breaths do not move the return distance.</p>${old?`<label class="training-field">My recollection, before looking<textarea data-note="recollection" rows="2" maxlength="3000" ${d.revealed?'readonly':''} placeholder="Recall the earlier observation, or write ‘I do not recall’.">${esc(d.recollection)}</textarea></label><button type="button" class="text-button" data-reveal ${d.revealed?'disabled':''}>Keep recollection and reveal original →</button><div class="training-original" ${d.revealed?'':'hidden'}><p class="eyebrow">PRESERVED ORIGINAL · ${d.lag} BACK</p><p>${d.revealed?esc(old.source):''}</p></div>`:`<p class="training-empty-return">First keep ${Math.max(0,d.lag-h.length)} more observation${d.lag-h.length===1?'':'s'} to create a ${d.lag}-back return. Until then, notice and describe what is here.</p>`}<label class="training-field">The relation I notice <span>(optional)</span><textarea data-note="relation" rows="2" maxlength="3000" placeholder="${esc(stage[exercise].relate)}">${esc(d.relation)}</textarea></label><label class="training-field">What I would revise <span>(optional)</span><textarea data-note="revision" rows="2" maxlength="3000" placeholder="${esc(stage[exercise].revise)}">${esc(d.revision)}</textarea></label><button type="button" class="text-button" data-fresh>Begin a fresh observation stream</button>`;
      all('[data-note]').forEach(el=>el.addEventListener('input',()=>{draft()[el.dataset.note]=el.value;}));
      q('[data-lag]').addEventListener('change',e=>{d.lag=Number(e.target.value);d.recollection='';d.revealed=false;renderFields();});
      q('[data-reveal]')?.addEventListener('click',()=>{if(!d.source.trim()){message('First describe your present observation.');q('[data-note="source"]').focus();return;}d.revealed=true;renderFields();});
      q('[data-fresh]').addEventListener('click',()=>{if(dirty()&&!root.confirm('Begin a fresh stream and discard the unfinished note for this exercise? Saved observations stay in your record.'))return;drafts.delete(key());renderFields();message('A fresh observation stream is ready.');});
    }
    function saveObservation(event) {
      event.preventDefault();const d=draft(),old=target();
      if(!d.source.trim())return;
      if(old&&!d.revealed){message('Recall first, then reveal the preserved original before keeping your comparison. It is fine not to remember.');q('[data-reveal]').focus();return;}
      const data=store.data,id=uid();
      data.entries.push({id,stageId:stage.id,exercise,streamId:d.streamId,createdAt:new Date().toISOString(),source:d.source.trim(),recollection:d.recollection.trim(),referenceId:old?.id||null,referenceSource:old?.source||'',lag:d.lag,relation:d.relation.trim(),revision:d.revision.trim()});
      const result=save(data);
      if(store.data.entries.some(e=>e.id===id)){d.source='';d.recollection='';d.relation='';d.revision='';d.revealed=false;renderFields();renderRecord();if(result.ok)message('Observation kept. Its original wording is preserved.');}
    }
    function renderReadiness() {
      const el=q('[data-readiness]');if(!el)return;
      const ready=store.data.readiness[stage.id]||{},next=D.STAGES[D.STAGES.indexOf(stage)+1];
      el.innerHTML=`<p class="eyebrow">WHEN THE SHAPE BECOMES CLEAR</p><h2>Reflect before moving on.</h2><p>Use your own judgement after practice. Can you do the following in this exercise without depending on the prompts?</p><ul>${stage.readiness.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><label class="training-check"><input type="checkbox" data-ready ${ready[exercise]?'checked':''}> I can apply ${esc(stage.name)} in ${exercise==='heart'?'Heart-Coherence':'Body-Sensation Mapping'}.</label><div class="training-readiness-status"><span>Heart ${ready.heart?'✓':'○'}</span><span>Body ${ready.body?'✓':'○'}</span><small>Self-assessed readiness</small></div><p>${ready.heart&&ready.body?(next?'You have marked both applications ready. Try '+esc(next.name)+' when you want to add its relation.':'You have marked both applications ready. Return to any shape when a simpler relation would make something clearer.'):'Practise this shape in both exercises. Revisit it whenever the relation is uncertain.'}</p><div class="training-ready-actions"><button type="button" class="text-button" data-other>Practise ${exercise==='heart'?'body mapping':'the heart exercise'} →</button>${next?`<a class="text-link" href="#practice/${esc(next.id)}">Explore ${esc(next.name)} →</a>`:''}</div><p class="training-fine">Every shape stays available. Readiness is reversible and is never awarded by the timer, a sensation rating, or a number of breaths.</p>`;
      q('[data-ready]').addEventListener('change',e=>{const data=store.data;data.readiness[stage.id]={heart:!!ready.heart,body:!!ready.body,[exercise]:e.target.checked};save(data);renderReadiness();renderRecord();all('[data-exercise]').forEach(button=>{const e=button.dataset.exercise;button.querySelector('small').textContent=store.data.readiness[stage.id]?.[e]?'Self-assessed: ready':e==='heart'?'Attention · feeling · return':'Sensation · distinction · meaning';});});
      q('[data-other]').addEventListener('click',()=>{end();clock=null;exercise=exercise==='heart'?'body':'heart';duration=15;peek=null;lastPrompt='';render();q('#exercise-title').scrollIntoView({block:'start'});});
    }
    function renderRecord() {
      const data=store.data;q('[data-record-count]').textContent='· '+data.entries.length+' observation'+(data.entries.length===1?'':'s');
      q('[data-record]').innerHTML=`<p>${data.sessions.length} recorded practice period${data.sessions.length===1?'':'s'} · ${data.entries.length} private observation${data.entries.length===1?'':'s'}</p>${data.entries.slice().reverse().map(e=>`<details class="training-saved-entry"><summary>${esc(D.getStage(e.stageId).name)} · ${e.exercise==='heart'?'Heart':'Body'} · ${esc(new Date(e.createdAt).toLocaleString())}</summary><h4>Original observation</h4><p>${esc(e.source)}</p>${e.referenceId?`<h4>Recollection before reveal</h4><p>${esc(e.recollection||'No recollection recorded.')}</p><h4>Original ${e.lag} observation${e.lag===1?'':'s'} back</h4><p>${esc(e.referenceSource)}</p>`:''}${e.relation?`<h4>Relation</h4><p>${esc(e.relation)}</p>`:''}${e.revision?`<h4>Revision</h4><p>${esc(e.revision)}</p>`:''}</details>`).join('')}`;
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
      const promptKey=exercise+':'+(exercise==='heart'?s.heartPhaseIndex+':'+(pacing==='paced'?s.breathPhase:'natural'):(peek??s.bodyStepIndex))+':'+(peek!==null);
      if(promptKey!==lastPrompt){
        lastPrompt=promptKey;
        if(exercise==='heart'){
          const p=E.HEART_PHASES[s.heartPhaseIndex];q('[data-step-label]').textContent=p.label;
          q('[data-prompt]').textContent=pacing==='paced'?p[s.breathPhase]:p.inhale+' '+p.exhale;
          q('[data-dimension]').hidden=true;q('[data-next-step]').textContent='Notice → recall → relate → revise, whenever you are ready.';
        }else{
          const i=peek??s.bodyStepIndex,p=E.BODY_STEPS[i];q('[data-step-label]').textContent=peek!==null?'Rereading · the exercise timer continues':'Dimension '+(i+1)+' of 7';
          q('[data-dimension]').hidden=false;q('[data-dimension]').textContent=p.label;q('[data-prompt]').textContent=p.prompt;
          all('[data-peek]').forEach(el=>{el.setAttribute('aria-pressed',String(Number(el.dataset.peek)===i));el.classList.toggle('is-current',Number(el.dataset.peek)===s.bodyStepIndex);});
        }
      }
      if(exercise==='body')q('[data-next-step]').textContent=finished?'Return to your own rhythm.':'Next: '+E.BODY_STEPS[(s.bodyStepIndex+1)%7].label+' · '+Math.ceil(s.stepRemaining)+'s'+(s.status==='paused'?' · paused':'');
      const cueKey=exercise==='heart'?Math.floor(s.elapsedSeconds/5):Math.floor(s.elapsedSeconds/30);
      if(s.status==='running'&&String(cueKey)!==lastCue){lastCue=String(cueKey);if(sound&&(exercise==='body'||pacing==='paced'))audio.cue(exercise==='heart'?s.breathPhase==='inhale':s.bodyStepIndex%2===0);}
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
