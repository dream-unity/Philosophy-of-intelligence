(() => {
  const vertices = {
    n:[260,9], ne:[512,154], se:[512,446], s:[260,591], sw:[8,446], nw:[8,154],
    a:[176,154], b:[344,154], c:[428,300], d:[344,446], e:[176,446], f:[92,300], o:[260,300]
  };
  // Original twelve triangular regions of the Agency hexagram.
  const cells = {
    topTip:['n','a','b'], upperRightTip:['b','ne','c'], lowerRightTip:['c','se','d'], bottomTip:['d','e','s'],
    lowerLeftTip:['e','sw','f'], upperLeftTip:['f','nw','a'], topInner:['a','b','o'], upperRightInner:['b','c','o'],
    lowerRightInner:['c','d','o'], bottomInner:['d','e','o'], lowerLeftInner:['e','f','o'], upperLeftInner:['f','a','o']
  };
  const qualityCues = {
    upperLeftTip:['Devotion', 'Devotion · obligation · alignment', 'Feel what it is like to give yourself willingly to something that matters.'],
    upperLeftInner:['Confidence', 'Self-efficacy · confidence · inner authorization', 'Find the quiet sense that you can take the next step.'],
    topInner:['Resolve', 'Self-belief · decisiveness · resolve', 'Feel the moment a choice settles.'],
    lowerLeftTip:['Ambition', 'Ambition · challenge seeking · competitive engagement', 'Find the lift of wanting to reach a little further.'],
    bottomInner:['Commitment', 'Determination · commitment · perseverance', 'Feel the willingness to keep a choice you have made.'],
    upperRightInner:['Initiation', 'Action initiation · clarity of choice · follow-through', 'Find the readiness just before you begin.'],
    lowerRightInner:['Discipline', 'Discipline · execution · reliability', 'Feel the steadiness of returning to the next repetition.'],
    lowerRightTip:['Restraint', 'Redirection · restraint · inhibition', 'Sense an impulse and the steadiness that lets you choose when to act.'],
    upperRightTip:['Patience', 'Patience · resilience · persistence', 'Feel yourself giving the next moment time to arrive.'],
    lowerLeftInner:['Composure', 'Certainty · composure · stability', 'Find the settled feeling that lets you stay present.'],
    bottomTip:['Endurance', 'Willpower · endurance · drive', 'Find a level of effort you feel willing to sustain.'],
    topTip:['Authorship', 'Authorship · choice · execution', 'Feel that the next choice is yours to make.']
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
  function textIfChanged(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }
  function attrIfChanged(node, key, value) {
    const text = String(value);
    if (node.getAttribute(key) !== text) node.setAttribute(key, text);
  }
  function mapRegion(quality, index) {
    const coords = cells[quality.id].map(vertex => vertices[vertex]);
    const x = coords.reduce((sum, coord) => sum+coord[0], 0)/3;
    const y = coords.reduce((sum, coord) => sum+coord[1], 0)/3;
    const title = qualityCues[quality.id][1];
    return `<g class="tm-region" role="button" focusable="true" tabindex="${index ? -1 : 0}"
      data-agency-cell="${escape(quality.id)}" aria-pressed="false" aria-label="${escape(title)}">
      <title>${escape(title)}</title>
      <polygon points="${coords.map(point=>point.join(',')).join(' ')}"></polygon>
      <text class="tm-index" x="${x}" y="${y-5}">${String(index+1).padStart(2,'0')}</text>
      <text class="tm-word" x="${x}" y="${y+15}">${escape(quality.label)}</text>
    </g>`;
  }

  function mount(host, options = {}) {
    if (!host) return;
    const engine = window.AgencyPractice;
    const qualities = engine.qualities;
    const stageId = options.stageId || 'circle';
    const stage = engine.stages[stageId] || engine.stages.circle;
    const known = new Set(qualities.map(item => item.id));
    const cleanOrder = input => [...new Set(Array.isArray(input) ? input : [])].filter(id => known.has(id));
    let order = cleanOrder(options.order);
    let draft = [];
    let editing = false;
    let blind = false;
    let busy = false;
    let lastFrame = null;
    let lastInfo = {};
    const listeners = [];
    const bind = (element, type, listener) => {
      element.addEventListener(type, listener);
      listeners.push(() => element.removeEventListener(type, listener));
    };
    host.classList.add('tm-map','agency-map');
    host.setAttribute('aria-label','Agency hexagram');
    host.innerHTML = `<header class="tm-heading">
      <h2>Agency hexagram</h2>
      <div class="tm-actions">
        ${stageId==='sphere' ? '<button type="button" data-agency-blind aria-pressed="false">Hide quality cues</button>' : ''}
        <button type="button" data-agency-edit aria-expanded="false">Set a personal order</button>
      </div>
    </header>
    <div class="tm-grid">
      <figure><svg class="tm-star" viewBox="0 0 520 600" role="group" aria-label="Agency hexagram qualities">
        ${qualities.map(mapRegion).join('')}
      </svg><figcaption data-agency-caption></figcaption></figure>
      <div class="tm-lesson">
        <div data-agency-practice>
          <div class="agency-stage-head"><div data-agency-pacer></div>
          <div><p class="tm-step" data-agency-step></p><h3 data-agency-title></h3></div></div>
          <p class="tm-feeling" data-agency-instruction></p>
          <p data-agency-phase-cue></p>
          <details class="agency-cue-list" data-agency-cue-list><summary>Felt cues for this breath</summary>
            <ul class="agency-members" data-agency-members aria-label="Qualities for this breath"></ul>
          </details>
        </div>
        <div data-agency-editor hidden>
          <h3>Your sequence</h3>
          <p>Choose triangles in the order you want to practise. Select a triangle again to remove it.</p>
          <p data-agency-draft aria-live="polite"></p>
          <div class="tm-actions">
            <button type="button" data-agency-apply>Use this order</button>
            <button type="button" data-agency-all>Use all twelve in order</button>
            <button type="button" data-agency-cancel>Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
    const q = selector => host.querySelector(selector);
    const regions = Array.from(host.querySelectorAll('[data-agency-cell]'));
    const badges = regions.map(region => region.querySelector('.tm-index'));
    const figure = q('figure');
    const caption = q('[data-agency-caption]');
    const edit = q('[data-agency-edit]');
    const editor = q('[data-agency-editor]');
    const apply = q('[data-agency-apply]');
    const draftText = q('[data-agency-draft]');
    const practice = q('[data-agency-practice]');
    const blindButton = q('[data-agency-blind]');
    const members = q('[data-agency-members]');
    const stepText = q('[data-agency-step]');
    const title = q('[data-agency-title]');
    const guide = q('[data-agency-instruction]');
    const phaseGuide = q('[data-agency-phase-cue]');
    const cueList = q('[data-agency-cue-list]');
    const memberRows = [];
    for (let index=0; index<stage.count; index++) {
      const row = document.createElement('li');
      const label = document.createElement('strong');
      const cue = document.createElement('span');
      const family = document.createElement('small');
      row.append(label, document.createTextNode(' '), cue, family);
      members.appendChild(row);
      memberRows.push({row,label,cue,family});
    }
    const labelFor = id => qualityCues[id][0];
    const announceDraft = () => {
      const summary = draft.map(labelFor).join(' → ');
      const more = Math.max(0, stage.count-draft.length);
      const need = more ? 'Choose '+more+' more '+(more===1?'quality.':'qualities.') : '';
      textIfChanged(draftText, [summary, need].filter(Boolean).join(' · '));
      apply.disabled = more > 0;
    };

    const emphasisLevel = member => Math.min(5, Math.max(1, Math.round(member.emphasis*5)));
    function update(frame, info = {}) {
      if (!frame) return;
      // Continuous attention changes are painted in five discrete shades.
      // Between changes, keep the current SVG, text and accessible names intact.
      if (frame!==lastFrame && info.status==='running' && lastInfo.status==='running' &&
          frame.breath===lastFrame.breath && frame.phase===lastFrame.phase &&
          frame.cue===lastFrame.cue && frame.phaseCue===lastFrame.phaseCue &&
          frame.focusId===lastFrame.focusId && frame.members.every((member,i)=>{
            const prev=lastFrame.members[i];
            return prev && member.id===prev.id && member.role===prev.role && emphasisLevel(member)===emphasisLevel(prev);
          })) return;
      lastFrame = frame;
      lastInfo = info;
      busy = ['running','paused'].includes(info.status);
      if (busy && editing) { editing = false; draft = []; }
      host.classList.toggle('agency-editing', editing);
      host.classList.toggle('agency-blind', blind && !editing);
      editor.hidden = !editing;
      practice.hidden = editing;
      edit.hidden = editing;
      edit.disabled = busy;
      attrIfChanged(edit,'aria-expanded',editing);
      if (blindButton) {
        blindButton.disabled = editing;
        attrIfChanged(blindButton,'aria-pressed',blind);
        textIfChanged(blindButton, blind ? 'Show quality cues' : 'Hide quality cues');
      }
      const hiddenGuide = blind && !editing;
      cueList.hidden = hiddenGuide;
      phaseGuide.hidden = hiddenGuide;
      figure.hidden = hiddenGuide;
      textIfChanged(title,frame.stage.title);
      textIfChanged(stepText, (info.shapeName || stage.name || stageId.replaceAll('-',' ')) + ' · '+stage.count+(stage.count===1?' quality':' qualities'));
      textIfChanged(guide,hiddenGuide ? 'Bring your chosen blend to mind at the heart. Sustain it through the breath and recall how it feels as a whole.' : busy ? frame.cue : frame.stage.prompt);
      textIfChanged(phaseGuide,frame.phaseCue || '');
      if (editing) {
        announceDraft();
        textIfChanged(caption, 'Numbers show your chosen order.');
      } else if (busy) {
        const description = frame.stage.level===6 ? 'The pointer follows your turn. The underlined quality receives a little longer.' :
          stage.count===1 ? 'The shaded triangle is your quality for this breath.' : 'Shaded triangles form the blend. Darker shading shows where attention is directed.';
        textIfChanged(caption, description);
      } else {
        textIfChanged(caption, order.length ? 'Choose a starting triangle. Selecting one outside your sequence returns to the full hexagram.' : 'Choose a starting triangle, then press Start.');
      }

      const active = new Map(frame.members.map(member => [member.id,member]));
      regions.forEach((region,index) => {
        const id = region.dataset.agencyCell;
        const member = active.get(id);
        const draftIndex = editing ? draft.indexOf(id) : -1;
        const selected = editing ? draftIndex>=0 : !!member;
        const lead = !editing && member?.role==='lead';
        const focusedQuality = busy && !editing && frame.focusId===id;
        region.classList.toggle('tm-included',selected);
        region.classList.toggle('tm-current',lead);
        attrIfChanged(region,'aria-disabled',busy);
        attrIfChanged(region,'aria-pressed',selected);
        attrIfChanged(region,'aria-label',qualityCues[id][1]+(lead?' · foreground':'')+(focusedQuality?' · current turn':''));
        const weight = selected && !editing ? emphasisLevel(member) : 0;
        attrIfChanged(region,'data-emphasis',weight);
        const orderIndex = frame.order ? frame.order.indexOf(id) : index;
        const badge = editing ? (draftIndex<0 ? '+' : String(draftIndex+1)) : (orderIndex<0 ? '·' : String(orderIndex+1).padStart(2,'0'));
        textIfChanged(badges[index],focusedQuality ? '▶ '+badge : badge);
      });
      if (!editing) {
        memberRows.forEach(({row,label,cue,family}, index) => {
          const member = frame.members[index];
          row.hidden = !member;
          if (!member) return;
          textIfChanged(label, member.label);
          textIfChanged(cue, qualityCues[member.id][2]);
          textIfChanged(family, qualityCues[member.id][1]);
          row.classList.toggle('agency-lead', member.role==='lead');
        });
      }
    }

    function refresh() { if (lastFrame) update(lastFrame,lastInfo); }
    function returnToGuide() {
      editing = false;
      refresh();
      edit.focus({preventScroll:true});
    }
    function selectCell(id) {
      if (busy) return;
      if (editing) {
        draft = draft.includes(id) ? draft.filter(other => other!==id) : [...draft,id];
        refresh();
        return;
      }
      if (order.length && !order.includes(id)) {
        order=[];
        options.onOrderChange?.([]);
      }
      options.onStartAt?.(id);
    }
    regions.forEach((region,index) => {
      bind(region,'focus', () => regions.forEach(el => attrIfChanged(el,'tabindex',el===region?0:-1)));
      bind(region,'click', () => selectCell(region.dataset.agencyCell));
      bind(region,'keydown', event => {
        if (event.key==='Enter' || event.key===' ') {
          event.preventDefault();
          selectCell(region.dataset.agencyCell);
          return;
        }
        const delta = {ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
        if (!delta && event.key!=='Home' && event.key!=='End') return;
        event.preventDefault();
        const next = event.key==='Home' ? 0 : event.key==='End' ? regions.length-1 : (index+delta+regions.length)%regions.length;
        regions[next].focus({preventScroll:true});
      });
    });
    bind(edit,'click', () => {
      if (busy) return;
      draft=order.slice();
      editing=true;
      refresh();
      regions[0].focus({preventScroll:true});
    });
    bind(apply,'click', () => {
      if (busy || draft.length<stage.count) return;
      order=draft.slice();
      editing=false;
      options.onOrderChange?.(order.slice());
      options.onStartAt?.(order[0]);
      returnToGuide();
    });
    bind(q('[data-agency-all]'),'click', () => {
      if (busy) return;
      order=[];
      editing=false;
      options.onOrderChange?.([]);
      options.onStartAt?.(qualities[0].id);
      returnToGuide();
    });
    bind(q('[data-agency-cancel]'),'click',returnToGuide);
    if (blindButton) bind(blindButton,'click',() => {blind=!blind;refresh();});
    return {update, destroy() {listeners.forEach(remove => remove());}};
  }
  window.TransmutationMap = Object.freeze({mount});
})();
