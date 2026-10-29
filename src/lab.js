(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODELS = Object.freeze({ add2: 'Add two', double: 'Double' });
  const CONTEXTS = Object.freeze(['green', 'amber']);
  const mounts = new WeakMap();
  let instanceNumber = 0;
  const copy = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  function checkInput(input) {
    if (!Number.isInteger(input) || input < 0 || input > 8) throw new RangeError('Choose a whole-number input from 0 to 8.');
    return input;
  }

  function checkContext(context) {
    if (!CONTEXTS.includes(context)) throw new RangeError('Choose the green or amber context.');
    return context;
  }

  function candidatePrediction(model, input) {
    checkInput(input);
    if (model === 'add2') return input + 2;
    if (model === 'double') return input * 2;
    throw new RangeError('Choose an available model.');
  }

  function withinModelScope(input, context) {
    checkInput(input);
    checkContext(context);
    return context === 'green' && input <= 6;
  }

  function observeMachine(input, context) {
    return withinModelScope(input, context) ? input + 2 : input * 2;
  }

  // Count distinct conditions, not repeated observations of a deterministic case.
  function compareModels(evidence) {
    const unique = new Map();
    (Array.isArray(evidence) ? evidence : []).forEach(record => {
      if (!record || !Number.isInteger(record.input) || record.input < 0 || record.input > 8 || !CONTEXTS.includes(record.context) || !Number.isFinite(record.output)) return;
      if (withinModelScope(record.input, record.context)) unique.set(record.context + ':' + record.input, record);
    });
    const records = Array.from(unique.values());
    const result = { total: records.length, add2: { agrees: 0, differs: 0 }, double: { agrees: 0, differs: 0 } };
    records.forEach(record => Object.keys(MODELS).forEach(model => {
      result[model][candidatePrediction(model, record.input) === record.output ? 'agrees' : 'differs']++;
    }));
    result.compatible = Object.keys(MODELS).filter(model => result[model].differs === 0);
    return freeze(result);
  }

  function createState() {
    return freeze({
      phase: 'configure', model: 'add2', input: 4, context: 'green',
      revealedExamples: 0, nextId: 1, committed: null, outcome: null, tests: [],
      evidence: [{ id: 'given-1', input: 2, context: 'green', output: 4, kind: 'given' }]
    });
  }

  function transition(state, action) {
    if (!state || !action || typeof action.type !== 'string') return state;
    if (action.type === 'reset') return createState();
    const next = copy(state);
    if (action.type === 'choose-model' && state.phase === 'configure' && Object.prototype.hasOwnProperty.call(MODELS, action.model)) {
      next.model = action.model;
    } else if (action.type === 'choose-input' && state.phase === 'configure' && Number.isInteger(action.input) && action.input >= 0 && action.input <= 8) {
      next.input = action.input;
    } else if (action.type === 'choose-context' && state.phase === 'configure' && CONTEXTS.includes(action.context)) {
      next.context = action.context;
    } else if (action.type === 'reveal-example' && state.phase === 'configure' && state.revealedExamples < 2) {
      const input = state.revealedExamples === 0 ? 3 : 5;
      next.revealedExamples++;
      next.evidence.push({ id: 'given-' + (next.revealedExamples + 1), input, context: 'green', output: observeMachine(input, 'green'), kind: 'given' });
    } else if (action.type === 'commit' && state.phase === 'configure') {
      next.committed = {
        id: 'test-' + state.nextId, model: state.model, input: state.input, context: state.context,
        prediction: candidatePrediction(state.model, state.input), inScope: withinModelScope(state.input, state.context),
        evidenceIds: state.evidence.map(record => record.id)
      };
      next.nextId++;
      next.phase = 'committed';
    } else if (action.type === 'observe' && state.phase === 'committed') {
      const committed = state.committed;
      const output = observeMachine(committed.input, committed.context);
      next.outcome = { output, agrees: output === committed.prediction };
      next.evidence.push({ id: committed.id + '-observation', input: committed.input, context: committed.context, output, kind: 'observed', predictionId: committed.id });
      next.tests.push({ prediction: copy(committed), outcome: copy(next.outcome) });
      next.phase = 'observed';
    } else if (action.type === 'revise' && state.phase === 'observed') {
      next.phase = 'configure';
      next.committed = null;
      next.outcome = null;
    } else {
      return state;
    }
    return freeze(next);
  }

  function scopeText(input, context) {
    if (context === 'amber') return 'Amber changes the context. The green reference does not establish what happens here.';
    if (input > 6) return 'The input is beyond 6. The green reference gives no rule for this region.';
    return 'Green, from 0 to 6: this test is inside the reference’s declared scope.';
  }

  function resultText(state) {
    if (!state.committed || !state.outcome) return '';
    const prediction = state.committed;
    if (!prediction.inScope) return state.outcome.agrees
      ? 'This extension agrees in one case. That new observation does not justify removing every boundary.'
      : 'The extension failed here. A case outside its conditions does not refute the bounded green model.';
    return state.outcome.agrees
      ? 'One more case agrees. Finite examples support a model; they do not prove a universal rule.'
      : 'This result challenges the chosen model inside its stated scope. Reconsider the rule, keeping the observation intact.';
  }

  function evidenceHTML(records) {
    return records.map(record => `<li class="fl-evidence-row"><span class="fl-context fl-${record.context}">${escape(record.context)}</span><span class="fl-evidence-relation"><b>${record.input}</b><span aria-hidden="true">→</span><b>${record.output}</b></span><span class="fl-evidence-kind">${record.kind === 'given' ? 'Given' : 'Observed'}</span></li>`).join('');
  }

  function mount(container) {
    if (!container || typeof container.querySelector !== 'function' || typeof container.addEventListener !== 'function') throw new TypeError('Mount the lab in a DOM element.');
    const previous = mounts.get(container);
    if (previous) previous.destroy();
    const prefix = 'form-lab-' + (++instanceNumber);
    let state = createState();
    let destroyed = false;

    function render() {
      const locked = state.phase !== 'configure';
      const comparison = compareModels(state.evidence);
      const inScope = withinModelScope(state.input, state.context);
      const predicted = candidatePrediction(state.model, state.input);
      const given = state.evidence.filter(record => record.kind === 'given');
      const observed = state.evidence.filter(record => record.kind === 'observed');
      const chosen = comparison[state.model];
      const compatibility = comparison.compatible.length === 2
        ? 'Both rules fit the evidence so far.'
        : comparison.compatible.length === 1
          ? MODELS[comparison.compatible[0]] + ' fits these cases; the other candidate does not.'
          : 'Neither candidate fits all the in-scope cases.';
      const status = state.phase === 'committed' ? 'Prediction kept. Reveal the machine’s outcome when ready.'
        : state.phase === 'observed' ? (state.outcome.agrees ? 'The prediction agrees with this outcome.' : 'The prediction differs from this outcome.')
          : 'Choose a model and a test. Nothing is scored.';

      container.innerHTML = `<div class="form-lab">
        <header class="fl-header"><div><p class="fl-eyebrow">THE MODEL LAB · UNSCORED EXPLORATION</p><h2 id="${prefix}-title">How far does a pattern hold?</h2><p>Build an explanation for a small signal machine. Keep its evidence, change one condition, and discover where your model stops.</p></div><button type="button" class="fl-reset" data-fl-action="reset">Reset experiment</button></header>
        <div class="fl-workspace">
          <section class="fl-evidence" aria-labelledby="${prefix}-evidence-title"><div class="fl-card-heading"><span class="fl-step">01</span><h3 id="${prefix}-evidence-title">Keep the evidence</h3></div><p class="fl-reference">Reference region: <strong>green · inputs 0–6</strong>. Other conditions may use a different rule.</p><ul class="fl-evidence-list">${evidenceHTML(given)}</ul><p class="fl-ambiguity">${escape(compatibility)}</p><div class="fl-candidates"><span><b>+2</b> ${comparison.add2.agrees} agree · ${comparison.add2.differs} differ</span><span><b>×2</b> ${comparison.double.agrees} agree · ${comparison.double.differs} differ</span></div><p class="fl-caption">Distinct green cases within the reference region. Repeating a case does not add a new condition.</p>${state.revealedExamples < 2 ? `<button type="button" class="fl-button fl-secondary" data-fl-action="reveal-example" ${locked ? 'disabled' : ''}>Reveal another given case <span aria-hidden="true">＋</span></button>` : '<p class="fl-evidence-complete">All three given cases are preserved.</p>'}${observed.length ? `<details class="fl-observation-history"><summary>Your observed cases <span>${observed.length}</span></summary><ul class="fl-evidence-list">${evidenceHTML(observed)}</ul></details>` : ''}</section>
          <section class="fl-test" aria-labelledby="${prefix}-test-title"><div class="fl-card-heading"><span class="fl-step">02</span><h3 id="${prefix}-test-title">Make one prediction</h3></div>
            <fieldset class="fl-fieldset" ${locked ? 'disabled' : ''}><legend>A provisional model</legend><div class="fl-segmented">${Object.keys(MODELS).map(model => `<button type="button" data-fl-model="${model}" class="${state.model === model ? 'fl-selected' : ''}" aria-pressed="${state.model === model}"><b>${model === 'add2' ? '+2' : '×2'}</b><span>${MODELS[model]}</span></button>`).join('')}</div></fieldset>
            <div class="fl-settings"><div class="fl-input-setting"><label for="${prefix}-input">Input <output id="${prefix}-input-value" for="${prefix}-input">${state.input}</output></label><input id="${prefix}-input" data-fl-input type="range" min="0" max="8" step="1" value="${state.input}" ${locked ? 'disabled' : ''}><div class="fl-range-labels" aria-hidden="true"><span>0</span><span>6 · boundary</span><span>8</span></div></div><fieldset class="fl-fieldset" ${locked ? 'disabled' : ''}><legend>Context</legend><div class="fl-segmented fl-context-choices">${CONTEXTS.map(context => `<button type="button" data-fl-context="${context}" class="${state.context === context ? 'fl-selected' : ''}" aria-pressed="${state.context === context}"><span class="fl-context-dot fl-dot-${context}" aria-hidden="true"></span>${context === 'green' ? 'Green' : 'Amber'}</button>`).join('')}</div></fieldset></div>
            <div class="fl-prediction ${inScope ? '' : 'fl-extrapolation'}"><span class="fl-eyebrow">${locked ? 'COMMITTED ' : 'PROPOSED '}${inScope ? 'PREDICTION' : 'EXTRAPOLATION'}</span><div class="fl-prediction-equation"><span>${state.input}</span><span class="fl-equation-operation">${state.model === 'add2' ? '+ 2' : '× 2'}</span><span class="fl-equals">=</span><strong>${predicted}</strong></div><p>${inScope ? 'The chosen rule predicts this output.' : 'The chosen rule can calculate a number, but the green reference does not support applying it here.'}</p>${locked ? '<span class="fl-locked">Kept before the outcome was revealed.</span>' : ''}</div>
            ${state.phase === 'observed' ? `<div class="fl-outcome"><span class="fl-eyebrow">OBSERVED OUTPUT</span><strong>${state.outcome.output}</strong><p>${state.outcome.agrees ? 'Agreement in this case.' : 'The machine returned a different result.'}</p><p>${escape(resultText(state))}</p></div>` : ''}
            <div class="fl-test-actions">${state.phase === 'configure' ? `<button type="button" class="fl-button fl-primary" data-fl-action="commit">${inScope ? 'Commit this prediction' : 'Commit this extrapolation'} <span aria-hidden="true">→</span></button>` : state.phase === 'committed' ? '<button type="button" class="fl-button fl-primary" data-fl-action="observe">Reveal the observed outcome <span aria-hidden="true">→</span></button>' : '<button type="button" class="fl-button fl-primary" data-fl-action="revise">Revise & test again <span aria-hidden="true">↗</span></button>'}</div>
          </section>
        </div>
        <p class="fl-status" role="status" aria-live="polite">${escape(status)}</p>
        <div class="fl-lenses" aria-label="Four ways to examine this model">
          <section><p class="fl-lens-number">01 / STRENGTH</p><h3>What supports it?</h3><p>${escape(MODELS[state.model])} agrees with ${chosen.agrees} of ${comparison.total} distinct in-scope observations.${chosen.differs ? ' It disagrees with ' + chosen.differs + '.' : ''} This is evidence about a model, not a score for you.</p></section>
          <section><p class="fl-lens-number">02 / DENSITY</p><h3>What is connected?</h3><p>Input ${state.input}, ${state.context} context, the ${state.model === 'add2' ? 'add-two' : 'doubling'} rule and predicted output ${predicted} form one account. Context must stay connected to the rule’s conditions.</p></section>
          <section><p class="fl-lens-number">03 / PARAMETERS</p><h3>What can vary?</h3><p>${locked ? 'This test keeps' : 'You can change'} the input and context.${locked ? ' Both are locked with the prediction until you begin another test.' : ' Change one at a time to see which difference matters.'}</p></section>
          <section class="${inScope ? '' : 'fl-lens-boundary'}"><p class="fl-lens-number">04 / HORIZON</p><h3>Where does support end?</h3><p>${escape(scopeText(state.input, state.context))}</p></section>
        </div>
        ${state.tests.length ? `<details class="fl-prediction-history"><summary>Preserved predictions <span>${state.tests.length}</span></summary><ol>${state.tests.map(test => `<li><span class="fl-context fl-${test.prediction.context}">${test.prediction.context}</span><span>Input <b>${test.prediction.input}</b> · ${escape(MODELS[test.prediction.model])} predicted <b>${test.prediction.prediction}</b> · observed <b>${test.outcome.output}</b></span><small>${test.prediction.inScope ? 'Inside the reference region' : 'Outside the reference region · extrapolation'}</small></li>`).join('')}</ol></details>` : ''}
        <footer class="fl-footer"><p>A deliberately authored world. These four lenses are working meanings for this philosophy. Your experiments stay only in this view’s memory; reset or reload clears them.</p><details><summary>Inspect how the machine is authored</summary><p>Green inputs from 0 through 6 return the input plus two. Amber inputs, and green inputs above 6, use a different route that doubles the input. This rule is part of the simulator’s definition. Inferring a rule from a few examples is a different claim.</p><p>No scores, intelligence estimates, breathing requirements or health outcomes are attached to this exploration.</p></details></footer>
      </div>`;
    }

    function apply(action, focusSelector) {
      if (destroyed) return;
      const updated = transition(state, action);
      if (updated === state) return;
      state = updated;
      render();
      if (focusSelector) container.querySelector(focusSelector)?.focus({ preventScroll: true });
    }

    function onClick(event) {
      const target = event.target.closest('button');
      if (!target || !container.contains(target) || target.disabled) return;
      if (target.dataset.flModel) apply({ type: 'choose-model', model: target.dataset.flModel }, '[data-fl-model="' + target.dataset.flModel + '"]');
      else if (target.dataset.flContext) apply({ type: 'choose-context', context: target.dataset.flContext }, '[data-fl-context="' + target.dataset.flContext + '"]');
      else if (target.dataset.flAction) {
        const action = target.dataset.flAction;
        const focusSelector = action === 'commit' ? '[data-fl-action="observe"]' : action === 'observe' ? '[data-fl-action="revise"]' : action === 'reset' ? '[data-fl-action="reset"]' : action === 'revise' ? '[data-fl-model="' + state.model + '"]' : '[data-fl-action="reveal-example"]';
        apply({ type: action }, focusSelector);
      }
    }

    function onInput(event) {
      if (!event.target.matches('[data-fl-input]') || state.phase !== 'configure') return;
      const output = container.querySelector('#' + prefix + '-input-value');
      if (output) output.textContent = event.target.value;
    }

    function onChange(event) {
      if (event.target.matches('[data-fl-input]')) apply({ type: 'choose-input', input: Number(event.target.value) }, '[data-fl-input]');
    }

    container.addEventListener('click', onClick);
    container.addEventListener('input', onInput);
    container.addEventListener('change', onChange);
    const controller = {
      getState: () => copy(state),
      reset: () => apply({ type: 'reset' }),
      destroy: () => {
        if (destroyed) return;
        destroyed = true;
        container.removeEventListener('click', onClick);
        container.removeEventListener('input', onInput);
        container.removeEventListener('change', onChange);
        container.innerHTML = '';
        if (mounts.get(container) === controller) mounts.delete(container);
      }
    };
    mounts.set(container, controller);
    render();
    return controller;
  }

  return Object.freeze({ mount, createState, transition, candidatePrediction, observeMachine, withinModelScope, compareModels });
});
