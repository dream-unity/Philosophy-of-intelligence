(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The labels are positions in a creative curriculum. They are not IQ scores.
  const STAGE_DATA = [
    {
      id: 'circle', name: 'Circle', verb: 'Notice', chapter: 'A place to begin',
      tagline: 'One feature. A clear return.',
      description: 'Select one relevant feature without having to remember an earlier moment.',
      lesson: 'Read the requested property of the named item. Colour, shape and number are separate features; noticing one accurately is a complete trial.',
      workedExample: 'A card says blue triangle, value 4. If the question asks for its colour, blue answers it; triangle and 4 belong to different features.',
      breathBridge: 'During an ordinary breath, notice one sound, sensation, word or image. A quiet or unremarkable observation counts. There is nothing to hold or change.',
      steps: [
        { title: 'Find the item', body: 'Locate the name mentioned in the question.' },
        { title: 'Select one feature', body: 'Read only the requested property.' },
        { title: 'Return', body: 'If attention wanders, locate the item again. Returning is part of the task.' }
      ], skills: ['Selective attention', 'Feature discrimination']
    },
    {
      id: 'half-circle', name: 'Half-circle', verb: 'Bind', chapter: 'Give experience an address',
      tagline: 'An item belongs somewhere.',
      description: 'Keep an item connected to its location through a short hidden-recall interval.',
      lesson: 'The question names a location before the study scene is hidden. Use that cue to encode its item-location pair, then retrieve the item. Recognising an item is different from remembering where it was.',
      workedExample: 'The window holds a silver key and the shelf holds a red cup. Asked about the window, recall the key rather than any object that appeared.',
      breathBridge: 'Give one observation a short label and a familiar location. Use the label to return to that particular observation; a word works as well as a vivid image.',
      steps: [
        { title: 'Study a pair', body: 'Attend to an item and its location together.' },
        { title: 'Hide the scene', body: 'Allow the representation to leave view before answering.' },
        { title: 'Retrieve the binding', body: 'Choose the item that belonged to the named location.' }
      ], skills: ['Item-location binding', 'Brief recall']
    },
    {
      id: 'triangle', name: 'Triangle', verb: 'Connect', chapter: 'A relationship earns its place',
      tagline: 'Two facts can support a third.',
      description: 'Combine two stated relationships and draw the directed connection they support.',
      lesson: 'Use both supplied facts. Select the starting node first and the destination second. Direction is part of the answer.',
      workedExample: 'If A is before B and B is before C, connect A to C when asked for first to last. Connecting C to A reverses the supported direction.',
      breathBridge: 'Compare a present observation with one earlier observation on one stated dimension. Name what is alike or different and retain the direction of the comparison.',
      steps: [
        { title: 'Read both links', body: 'Keep the shared middle item in view.' },
        { title: 'Infer the endpoints', body: 'Determine which item starts and which finishes the requested relation.' },
        { title: 'Connect in order', body: 'Choose the start, then the destination.' }
      ], skills: ['Relational integration', 'Directional inference']
    },
    {
      id: 'square', name: 'Square', verb: 'Return', chapter: 'The right past moment',
      tagline: 'Retrieve the record. Then compare.',
      description: 'Retrieve the exact N-back observation and compare one declared feature with the current record.',
      lesson: 'N counts prior committed observations, not elapsed seconds or breathing cycles. First identify the record exactly N positions back, then judge the requested feature. The first N observations fill the history and are not scored.',
      workedExample: 'With history Cedar, Kite, Moon and N = 2, compare the current record with Kite. Choosing Moon because it resembles the current card would use the wrong observation.',
      breathBridge: 'Let natural breaths accompany encoding and return. If reasoning takes longer, pause the observation counter while breathing continues. A new committed observation advances the history.',
      steps: [
        { title: 'Encode the current record', body: 'Notice its name, colour, shape and value.' },
        { title: 'Retrieve exactly N back', body: 'Count backward through committed observations; select that record identity.' },
        { title: 'Compare the named feature', body: 'Judge only the dimension requested. Identity and comparison receive separate feedback.' }
      ], skills: ['Temporal binding', 'Exact N-back retrieval', 'Feature comparison']
    },
    {
      id: 'pentagon', name: 'Pentagon', verb: 'Contextualise', chapter: 'The rule depends on the setting',
      tagline: 'Know which comparison applies.',
      description: 'Use a declared context to select the relevant comparison, including when the context is missing.',
      lesson: 'A pair can have different winners under different rules. Find the active mode before comparing. Missing mode information can make a unique answer impossible.',
      workedExample: 'Display mode selects greater height; carrying mode selects lower weight. The tallest object need not be the easiest to carry.',
      breathBridge: 'After noticing a change, add one contextual fact such as task, setting or instruction. Treat an explanation as a possibility unless the evidence establishes it.',
      steps: [
        { title: 'Find the context', body: 'Read the mode named for this trial.' },
        { title: 'Choose its rule', body: 'Identify which feature and direction the mode uses.' },
        { title: 'Apply or withhold', body: 'Compare correctly, or report that the missing context prevents a unique selection.' }
      ], skills: ['Context-sensitive rules', 'Calibrated uncertainty']
    },
    {
      id: 'hexagon', name: 'Hexagon', verb: 'Organise', chapter: 'From items to an episode',
      tagline: 'Cue, response, consequence.',
      description: 'Reconstruct a small system using the ordering relationships supplied in its description.',
      lesson: 'Order all three events using the stated relationships. The explanation defines this model; do not substitute a familiar real-world sequence or infer an additional cause from timing alone.',
      workedExample: 'A detector signals first, the valve responds to that signal, and the reading settles after the valve changes. Preserve those dependencies when arranging the cards.',
      breathBridge: 'Across several observations, distinguish a cue, a response and a consequence. Sequence is observable; causation remains a separate claim to check.',
      steps: [
        { title: 'Find the initiating cue', body: 'Which event has no earlier event in the supplied chain?' },
        { title: 'Follow the response', body: 'Which event is explicitly triggered next?' },
        { title: 'Place the consequence', body: 'Arrange all three cards without dropping a role.' }
      ], skills: ['Role binding', 'Dependency order']
    },
    {
      id: 'prism', name: 'Triangular prism', verb: 'Map', chapter: 'Two systems meet',
      tagline: 'Match roles across different surfaces.',
      description: 'Map the cue, response and consequence of one system onto another system.',
      lesson: 'Match what each element does in its system. Similar words or objects can be distracting; all three role correspondences must agree.',
      workedExample: 'A sensor warning maps to a booking alert because each initiates a response. The valve movement maps to the booking adjustment, and the settled reading maps to the cleared clash.',
      breathBridge: 'Retrieve two small episodes. Map their initiating conditions, responses and outcomes, then notice one difference that limits the analogy.',
      steps: [
        { title: 'Understand each system', body: 'Read its cue, response and result.' },
        { title: 'Map roles', body: 'Connect each left element to the right element doing the corresponding job.' },
        { title: 'Check the whole mapping', body: 'Every right element is used exactly once.' }
      ], skills: ['Structural analogy', 'Three-role mapping']
    },
    {
      id: 'heptagon', name: 'Heptagon', verb: 'Abstract', chapter: 'A pattern becomes a function',
      tagline: 'Find the condition. Carry it through.',
      description: 'Derive a rule from explicit cases, apply it to a new case and predict its defined effect.',
      lesson: 'Choose the rule that explains every supplied case, including negative cases. Then use that same rule to select an action and its stipulated result.',
      workedExample: 'If the gate opens only when both signals are present, one signal alone is insufficient. The condition, chosen action and expected consequence must stay connected.',
      breathBridge: 'Express a recurring relation as a tentative function: under these conditions, this response may have this effect. Include a condition where it should not apply.',
      steps: [
        { title: 'Fit all cases', body: 'Check positive and negative examples against each candidate rule.' },
        { title: 'Apply the condition', body: 'Use the new case without changing the rule.' },
        { title: 'Carry the effect forward', body: 'Predict the consequence explicitly defined by the system.' }
      ], skills: ['Rule induction', 'Conditional function', 'Consequence prediction']
    },
    {
      id: 'octagon', name: 'Octagon', verb: 'Transfer', chapter: 'A function travels with its limits',
      tagline: 'Map the role. Check the scope. Predict.',
      description: 'Transfer a relation into a different domain, checking its conditions before predicting an outcome.',
      lesson: 'Match functional roles before importing a calculation. A rule transfers only when its required conditions hold. Missing conditions can leave the new result unresolved.',
      workedExample: 'Reserved capacity maps to calendar bookings. Total slots minus bookings gives free slots when each booking uses one distinct slot. Overlapping bookings require additional information.',
      breathBridge: 'Try a stored function in an unfamiliar, low-stakes situation. State the role mapping and its conditions, predict what follows, then check the result and preserve any exception.',
      steps: [
        { title: 'Map the source role', body: 'Find the corresponding role in the new domain.' },
        { title: 'Check the boundary', body: 'Separate a satisfied condition, a failed condition and missing information.' },
        { title: 'Predict within scope', body: 'Carry the function across only when the supplied conditions license it.' }
      ], skills: ['Cross-domain transfer', 'Boundary conditions', 'Supported prediction']
    },
    {
      id: 'cube', name: 'Cube', verb: 'Coordinate', chapter: 'Two complete accounts',
      tagline: 'Belief, goal, action, outcome.',
      description: 'Coordinate the four stated roles in one account with the corresponding roles in another.',
      lesson: 'Keep a reported belief distinct from a desired goal, a chosen action and an observed outcome. These are stipulated fictional accounts; do not infer another person’s mind from a single action.',
      workedExample: 'Wanting an accurate answer is a goal. Believing that asking helps accuracy is a belief. Asking is an action; receiving clarification is its reported outcome.',
      breathBridge: 'Represent two episodes with four fields. Mark beliefs or goals as reported, remembered or hypothesised, and keep that provenance when comparing them.',
      steps: [
        { title: 'Separate the four roles', body: 'Identify what was believed, wanted, done and observed.' },
        { title: 'Map both accounts', body: 'Match each role while allowing its content to differ.' },
        { title: 'Preserve distinctions', body: 'An intended consequence and an actual outcome are different entries.' }
      ], skills: ['Four-role mapping', 'Perspective coordination', 'Provenance']
    },
    {
      id: 'dodecahedron', name: 'Dodecahedron', verb: 'Select', chapter: 'A repertoire with an index',
      tagline: 'Choose the useful function.',
      description: 'Select the applicable rule from a small library and apply its transformation.',
      lesson: 'A repertoire helps only when its entries have clear conditions. Find the rule matching the case, then perform that rule’s operation. An unlisted category supplies no default rule.',
      workedExample: 'Striped tokens use add 3; spotted tokens use double. A spotted token valued 5 becomes 10. A new pattern needs a rule before it can be transformed.',
      breathBridge: 'Give each stored function an address and a short applicability cue. Retrieve the relevant function instead of trying to activate the entire palace.',
      steps: [
        { title: 'Read the index', body: 'Each function has a condition and a transformation.' },
        { title: 'Choose one entry', body: 'Use the current case to select the relevant rule.' },
        { title: 'Apply that entry', body: 'Carry its operation through, or recognise that the library supplies none.' }
      ], skills: ['Function selection', 'Indexed retrieval', 'Application']
    },
    {
      id: 'icosahedron', name: 'Icosahedron', verb: 'Discriminate', chapter: 'Let explanations compete',
      tagline: 'Seek the observation that separates models.',
      description: 'Choose a diagnostic test and update the competing explanations in light of its result.',
      lesson: 'Useful evidence distinguishes predictions. A test on which two models agree cannot separate them. One fitting observation does not prove a model universally true.',
      workedExample: 'One model follows warmth, another follows a blue marker. A warm red trial separates them; a warm blue trial does not.',
      breathBridge: 'Keep two plausible explanations for a pattern. Ask which ordinary observation could distinguish them, and let new evidence change their status.',
      steps: [
        { title: 'Compare predictions', body: 'Identify a test on which the models disagree.' },
        { title: 'Inspect the result', body: 'Use only the result actually supplied.' },
        { title: 'Update proportionately', body: 'Retain what fits and mark what conflicts; avoid claiming more than the test establishes.' }
      ], skills: ['Model comparison', 'Diagnostic evidence', 'Revision']
    },
    {
      id: 'geodesic', name: 'Geodesic sphere', verb: 'Repair', chapter: 'Examine the operator',
      tagline: 'Find the process error. Repair that step.',
      description: 'Inspect a recorded attempt, diagnose a lag, role or scope error, and make the smallest warranted correction.',
      lesson: 'A plausible conclusion can come from a wrong operation. Check which observation was retrieved, which roles were assigned and whether a rule stayed inside its stated scope. Some traces are already correct.',
      workedExample: 'With three prior records and N = 2, choosing the newest record is a retrieval-position error. Correct the selected record before recomputing the comparison; keep the original observations unchanged.',
      breathBridge: 'Let your manner of comparing become material for the next return. Identify one specific process slip, repair that operation and check the next attempt without rewriting earlier experience.',
      steps: [
        { title: 'Read the preserved trace', body: 'Separate original observations from the previous attempted operation.' },
        { title: 'Locate the fault', body: 'Check exact lag, role assignment and rule scope; do not invent an error if none is shown.' },
        { title: 'Repair the operation', body: 'Change the faulty step while retaining the source records.' }
      ], skills: ['Process diagnosis', 'Error-specific repair', 'Metacognitive revision']
    },
    {
      id: 'sphere', name: 'Sphere', verb: 'Revise', chapter: 'Change how the next return works',
      tagline: 'Choose, infer, encounter, revise.',
      description: 'Identify a function, make a prediction and revise its status when new evidence arrives.',
      lesson: 'Keep the original observations intact. A new result can support a provisional rule, expose a boundary, or require reopening the rule. Revision updates the interpretation rather than rewriting the evidence.',
      workedExample: 'Two light-load cases fit add 3. Predict the next light-load result, then inspect a new observation. A heavy-load exception may expose a scope limit; a light-load exception challenges the rule within its own scope.',
      breathBridge: 'Let a habit of observing or interpreting become the next observation. Change one process rule, try it on a later return, and keep both the earlier record and the revision.',
      steps: [
        { title: 'Choose the supported function', body: 'Find the rule that fits the earlier cases.' },
        { title: 'Commit a prediction', body: 'Apply it before reading the new evidence.' },
        { title: 'Revise its status', body: 'Respond to the evidence without erasing the original observations.' }
      ], skills: ['Relational synthesis', 'Prediction', 'Evidence-led self-revision']
    }
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  const STAGES = deepFreeze(STAGE_DATA.map(function (stage, index) {
    return Object.assign({}, stage, {
      index: index, label: 70 + index * 10,
      lagUnit: stage.id === 'square' ? 'committed observations' : 'not applicable'
    });
  }));
  const STAGE_IDS = STAGES.map(function (stage) { return stage.id; });
  const COLORS = ['teal', 'coral', 'blue', 'gold', 'violet', 'green'];
  const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'star', 'hexagon'];
  const NAMES = ['Cedar', 'Otter', 'Kite', 'Fern', 'Comet', 'Reed', 'Robin', 'Shell', 'Willow', 'Pebble', 'Lark', 'Maple', 'Harbour', 'Moss', 'Finch', 'Drift', 'Spruce', 'Aster', 'Pine', 'Orchid', 'Brook', 'Quartz', 'Birch', 'Acorn'];
  const ADJECTIVES = ['Quiet', 'Bright', 'Amber', 'Gentle', 'Silver', 'Little', 'Distant', 'Patient', 'Clear', 'Hidden', 'Open', 'Swift', 'Warm', 'Still', 'Soft', 'Early', 'Fresh', 'Deep', 'Calm', 'Wild', 'Pale', 'Round', 'Blue', 'Green'];
  const LOCI = ['window', 'shelf', 'doorway', 'table', 'lamp', 'garden gate'];

  function hash(value) {
    let h = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function random(seed) {
    let state = hash(seed);
    return function () {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function integer(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
  function pick(rng, list) { return list[integer(rng, 0, list.length - 1)]; }
  function shuffle(rng, list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = integer(rng, 0, i);
      const item = out[i]; out[i] = out[j]; out[j] = item;
    }
    return out;
  }
  function take(rng, list, count) { return shuffle(rng, list).slice(0, count); }
  function scheduledVariant(context, name, variants) {
    const block = Math.floor(context.ordinal / variants.length);
    const order = shuffle(random(context.seed + '|' + name + '|' + block), variants);
    return order[context.ordinal % variants.length];
  }
  function options(rng, entries) {
    return shuffle(rng, entries.map(function (entry, index) {
      return typeof entry === 'string' ? { id: 'option-' + index, label: entry } : Object.assign({}, entry);
    }));
  }
  function numberOptions(rng, answer, extra, distractorCount = 3, maximum = Infinity) {
    const offsets = [1, 2, 3, 4, 6, 8];
    const pool = offsets.flatMap(function (offset) { return [answer - offset, answer + offset]; });
    if (extra !== undefined) pool.push(extra);
    const candidates = Array.from(new Set(pool)).filter(function (value) {
      return Number.isFinite(value) && value >= 0 && value <= maximum && value !== answer;
    });
    const below = candidates.filter(function (value) { return value < answer; });
    const above = candidates.filter(function (value) { return value > answer; });
    const count = Math.min(distractorCount, candidates.length);
    // Vary numeric rank as well as display position: neither smallest nor
    // second-smallest must become a substitute for applying the function.
    const lowerCount = integer(rng, Math.max(0, count - above.length), Math.min(count, below.length));
    const values = [answer].concat(take(rng, below, lowerCount), take(rng, above, count - lowerCount));
    return options(rng, values.map(function (value) { return { id: 'number-' + value, label: String(value) }; }));
  }
  function featureText(record) {
    return record.features.color + ' ' + record.features.shape + ', value ' + record.features.value;
  }
  function makeContext(stageId, input) {
    const config = input || {};
    const seed = config.seed === undefined ? 'form' : String(config.seed);
    const ordinal = Number.isFinite(Number(config.ordinal)) ? Math.max(0, Math.floor(Number(config.ordinal))) : 0;
    const lag = Number.isFinite(Number(config.lag)) ? Math.max(1, Math.min(12, Math.floor(Number(config.lag)))) : 1;
    if (config.history !== undefined && !Array.isArray(config.history)) throw new TypeError('Challenge history must be an array.');
    return {
      seed: seed, ordinal: ordinal, lag: lag, history: config.history || [],
      focusFeature: ['color', 'shape', 'value'].includes(config.focusFeature) ? config.focusFeature : null,
      rng: random(seed + '|' + stageId + '|' + ordinal),
      id: stageId + '-' + hash(seed).toString(36) + '-' + ordinal
    };
  }
  function base(context, stageId, data) {
    const stage = STAGES[STAGE_IDS.indexOf(stageId)];
    return Object.assign({
      id: context.id, stageId: stageId, title: stage.verb,
      principle: stage.lesson, transferPrompt: stage.breathBridge
    }, data);
  }

  function circle(c) {
    const rng = c.rng;
    const names = take(rng, NAMES, 3);
    const items = names.map(function (name, index) {
      const color = pick(rng, COLORS), shape = pick(rng, SHAPES), value = integer(rng, 1, 9);
      return { id: 'item-' + index, name: name, color: color, shape: shape, value: value, label: name + ': ' + color + ' ' + shape + ', value ' + value };
    });
    const target = pick(rng, items);
    const feature = pick(rng, ['color', 'shape', 'value']);
    const value = target[feature];
    const pool = feature === 'color' ? COLORS : feature === 'shape' ? SHAPES : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const candidates = [value].concat(take(rng, pool.filter(function (entry) { return entry !== value; }), 3));
    return base(c, 'circle', {
      kind: 'choice', channel: 'observation', title: 'Find one feature',
      prompt: 'What is the ' + (feature === 'color' ? 'colour' : feature) + ' of ' + target.name + '?',
      source: { title: 'Three observations', body: 'Every feature is stated. Attend to the named item and requested property.', items: items },
      options: options(rng, candidates.map(function (entry, i) { return { id: 'feature-' + i, label: String(entry) }; })),
      answer: 'feature-0',
      explanation: target.name + ' is recorded as a ' + target.color + ' ' + target.shape + ' with value ' + target.value + '. Its ' + feature + ' is ' + value + '.',
      hint: 'Find ' + target.name + ' first. Then read only its ' + feature + '.'
    });
  }

  function halfCircle(c) {
    const rng = c.rng;
    const loci = take(rng, LOCI, 3);
    const things = take(rng, ['silver key', 'red cup', 'paper boat', 'wooden spoon', 'green kite', 'blue ribbon', 'small bell', 'yellow stone', 'striped scarf', 'glass marble', 'white feather', 'brass compass'], 4);
    const target = integer(rng, 0, 2);
    return base(c, 'half-circle', {
      kind: 'recall', channel: 'binding', title: 'Keep the item with its place',
      prompt: 'After hiding the scene, which item was at the ' + loci[target] + '?',
      study: { title: 'Study these bindings', body: 'Keep each item connected to its location. Hide this scene before recalling.', items: loci.map(function (locus, i) { return { id: 'binding-' + i, label: 'At the ' + locus + ': ' + things[i] + '.', role: locus }; }) },
      source: { title: 'Recall the location', body: 'Retrieve the item that belonged at the ' + loci[target] + '. An item being familiar does not establish its location.', items: [] },
      options: options(rng, things.map(function (thing, i) { return { id: 'thing-' + i, label: thing }; })),
      answer: 'thing-' + target,
      explanation: 'The study scene placed the ' + things[target] + ' at the ' + loci[target] + '. This tests the item-location pairing.',
      hint: 'Revisit the location mentally, then retrieve its item. Reopening the study scene is supported practice.'
    });
  }

  function triangle(c) {
    const rng = c.rng;
    const names = take(rng, NAMES, 3);
    const relation = pick(rng, [
      { middle: 'comes before', reverse: 'comes after', start: 'first', end: 'last' },
      { middle: 'is taller than', reverse: 'is shorter than', start: 'tallest', end: 'shortest' },
      { middle: 'is north of', reverse: 'is south of', start: 'northernmost', end: 'southernmost' }
    ]);
    const givenEdges = [];
    const facts = [0, 1].map(function (index) {
      const reversed = rng() < 0.5;
      givenEdges.push({ from: 'node-' + (reversed ? index + 1 : index), to: 'node-' + (reversed ? index : index + 1), label: reversed ? relation.reverse : relation.middle });
      return { id: 'fact-' + index, label: reversed ? names[index + 1] + ' ' + relation.reverse + ' ' + names[index] + '.' : names[index] + ' ' + relation.middle + ' ' + names[index + 1] + '.' };
    });
    const reverseTask = rng() < 0.5;
    const first = reverseTask ? 2 : 0, second = reverseTask ? 0 : 2;
    return base(c, 'triangle', {
      kind: 'connect', channel: 'relation', title: 'Connect the inferred endpoints',
      prompt: 'Select the ' + (reverseTask ? relation.end : relation.start) + ' item first, then the ' + (reverseTask ? relation.start : relation.end) + ' item. The connection is directed.',
      source: { title: 'Two stated relationships', body: 'Use both facts to determine the two endpoints. Only the supplied ordering matters.', items: shuffle(rng, facts) },
      nodes: shuffle(rng, names.map(function (name, index) { return { id: 'node-' + index, label: name }; })),
      givenEdges: givenEdges,
      answer: ['node-' + first, 'node-' + second],
      explanation: 'The complete ordering is ' + names.join(' → ') + ' from ' + relation.start + ' to ' + relation.end + '. The requested direction is ' + names[first] + ' → ' + names[second] + '.',
      hint: 'Find the item shared by both facts, then put the three items in order before choosing endpoints.'
    });
  }

  function balancedMatch(seed, ordinal) {
    const block = Math.floor(ordinal / 10);
    const schedule = shuffle(random(seed + '|square-balanced|' + block), [true, true, true, true, true, false, false, false, false, false]);
    return schedule[ordinal % 10];
  }
  function recordName(c) {
    const used = new Set(c.history.map(function (record) { return record.label; }));
    const start = hash(c.id) % (ADJECTIVES.length * NAMES.length);
    for (let i = 0; i < ADJECTIVES.length * NAMES.length; i += 1) {
      const value = (start + i * 29) % (ADJECTIVES.length * NAMES.length);
      const candidate = ADJECTIVES[Math.floor(value / NAMES.length)] + ' ' + NAMES[value % NAMES.length];
      if (!used.has(candidate)) return candidate;
    }
    return 'Record ' + hash(c.id).toString(36);
  }
  function square(c) {
    const historyIds = new Set();
    c.history.forEach(function (record) {
      if (!record || typeof record.id !== 'string' || !record.id || typeof record.label !== 'string' || !record.features || typeof record.features !== 'object') {
        throw new TypeError('Square history must contain committed memory records with id, label and features.');
      }
      if (historyIds.has(record.id)) throw new TypeError('Every committed memory record must have a distinct occurrence id.');
      historyIds.add(record.id);
    });
    const rng = c.rng;
    const current = {
      id: 'memory-' + c.id, label: recordName(c),
      features: { color: pick(rng, COLORS), shape: pick(rng, SHAPES), value: integer(rng, 1, 9) },
      locus: pick(rng, LOCI)
    };
    const warmup = c.history.length < c.lag;
    let target, feature, expectedClass;
    if (!warmup) {
      target = clone(c.history[c.history.length - c.lag]);
      feature = c.focusFeature || pick(rng, ['color', 'shape', 'value']);
      const original = target.features[feature];
      if (original === undefined || original === null) {
        expectedClass = 'unknown';
      } else if (balancedMatch(c.seed, c.ordinal)) {
        current.features[feature] = original;
        expectedClass = 'match';
      } else {
        const pool = feature === 'color' ? COLORS : feature === 'shape' ? SHAPES : [1, 2, 3, 4, 5, 6, 7, 8, 9];
        current.features[feature] = pick(rng, pool.filter(function (value) { return value !== original; }));
        expectedClass = 'nonmatch';
      }
    }
    const source = {
      title: 'Current observation: ' + current.label,
      body: (c.focusFeature ? 'Guided focus: ' + (c.focusFeature === 'color' ? 'colour' : c.focusFeature) + '. Keep the record name and this feature together. ' : 'Mixed-feature practice: keep the name and all three features available. ') + 'Commit this observation after the trial. N counts prior committed observations; the current observation is not yet in history.',
      items: [{ id: current.id, label: current.label + ': ' + featureText(current) + '. Locus: ' + current.locus + '.', color: current.features.color, shape: current.features.shape, value: current.features.value }]
    };
    if (warmup) {
      return base(c, 'square', {
        kind: 'warmup', warmup: true, channel: 'binding', title: 'Build the return path',
        prompt: 'Warmup ' + (c.history.length + 1) + ' of ' + c.lag + ': study and commit this record. ' + (c.focusFeature ? 'The comparison feature for this practice is ' + (c.focusFeature === 'color' ? 'colour' : c.focusFeature) + '. ' : 'Later trials can ask about colour, shape or value. ') + 'There is no ' + c.lag + '-back target yet.',
        source: source, memoryRecord: current, focusFeature: c.focusFeature, comparedFeature: c.focusFeature, answer: 'continue',
        explanation: 'This record fills the history. Warmup is not an assessment attempt.',
        hint: 'Notice the record name and its features. You can take as much time as you need.'
      });
    }
    const distractors = shuffle(rng, c.history.filter(function (record) { return record.id !== target.id && record.label !== target.label; })).slice(0, 2);
    const bindingCandidates = [{ id: target.id, label: target.label }];
    distractors.forEach(function (record) {
      if (!bindingCandidates.some(function (item) { return item.id === record.id || item.label === record.label; })) bindingCandidates.push({ id: record.id, label: record.label });
    });
    if (!bindingCandidates.some(function (item) { return item.label === current.label; })) bindingCandidates.push({ id: current.id, label: current.label });
    let extra = 0;
    while (bindingCandidates.length < 4) {
      const label = 'Unstored ' + NAMES[(hash(c.id) + extra) % NAMES.length];
      if (!bindingCandidates.some(function (item) { return item.label === label; })) bindingCandidates.push({ id: 'unstored-' + c.id + '-' + extra, label: label });
      extra += 1;
    }
    return base(c, 'square', {
      kind: 'sequence', channel: 'relation', channels: { binding: 'binding', relation: 'relation' },
      title: 'Retrieve, then compare',
      prompt: 'Use the exact ' + c.lag + '-back record. First identify it, then compare only its ' + (feature === 'color' ? 'colour' : feature) + ' with the current observation.',
      source: source, memoryRecord: current, reference: target, focusFeature: c.focusFeature, comparedFeature: feature, expectedClass: expectedClass,
      steps: [
        { id: 'binding', prompt: 'Which record was committed exactly ' + c.lag + ' observation' + (c.lag === 1 ? '' : 's') + ' before the current one?', options: options(rng, bindingCandidates) },
        { id: 'relation', prompt: 'Does the current record have the same ' + (feature === 'color' ? 'colour' : feature) + ' as that exact earlier record?', options: options(rng, [{ id: 'match', label: 'Same ' + (feature === 'color' ? 'colour' : feature) }, { id: 'nonmatch', label: 'Different ' + (feature === 'color' ? 'colour' : feature) }, { id: 'unknown', label: 'The earlier record does not supply this feature' }]) }
      ],
      answer: { binding: target.id, relation: expectedClass },
      explanation: 'Exactly ' + c.lag + ' observations back is ' + target.label + '. Its ' + feature + ' is ' + (target.features[feature] == null ? 'not recorded' : target.features[feature]) + '; the current ' + feature + ' is ' + current.features[feature] + '. ' + (expectedClass === 'unknown' ? 'A comparison cannot be established from the recorded feature.' : expectedClass === 'match' ? 'They match on the requested feature.' : 'They differ on the requested feature.'),
      hint: 'Retrieve the identity by its position in the committed history before judging the requested feature.'
    });
  }

  function pentagon(c) {
    const rng = c.rng;
    const names = take(rng, NAMES, 2);
    const heights = [integer(rng, 3, 8), integer(rng, 9, 14)];
    const weights = [integer(rng, 2, 6), integer(rng, 7, 11)];
    if (rng() < 0.5) heights.reverse();
    if (rng() < 0.5) weights.reverse();
    const mode = scheduledVariant(c, 'pentagon-context', ['known', 'known', 'known', 'known', 'missing']) === 'missing' ? 'missing' : pick(rng, ['display', 'carrying']);
    const heightWinner = heights[0] > heights[1] ? 0 : 1;
    const weightWinner = weights[0] < weights[1] ? 0 : 1;
    const winner = mode === 'display' ? heightWinner : mode === 'carrying' ? weightWinner : heightWinner === weightWinner ? heightWinner : -1;
    return base(c, 'pentagon', {
      kind: 'choice', channel: 'relation', title: 'Let the context choose the rule',
      prompt: 'Which object is selected for this trial?',
      source: {
        title: 'Two modes, two criteria',
        body: 'DISPLAY mode selects the greater height. CARRYING mode selects the lower weight. Active mode: ' + (mode === 'missing' ? 'not supplied' : mode.toUpperCase()) + '.',
        items: names.map(function (name, i) { return { id: 'object-' + i, label: name + ': height ' + heights[i] + ', weight ' + weights[i] + '.' }; })
      },
      options: options(rng, [{ id: 'object-0', label: names[0] }, { id: 'object-1', label: names[1] }, { id: 'unknown', label: 'The supplied information does not determine one object' }]),
      answer: winner < 0 ? 'unknown' : 'object-' + winner,
      expectedClass: winner < 0 ? 'unknown' : undefined,
      explanation: mode === 'missing' ? (winner < 0 ? 'The modes select different objects. Without the active mode, one selection is not established.' : 'Although the mode is missing, both stated modes select ' + names[winner] + ', so the selected object is still determined.') : (mode === 'display' ? 'Display mode uses greater height. ' : 'Carrying mode uses lower weight. ') + names[winner] + ' satisfies that criterion.',
      hint: 'Compare the mode rules first. If mode information is missing, check whether the two rules would agree.'
    });
  }

  const SYSTEMS = [
    { title: 'Reservoir model', cue: 'level warning', action: 'valve adjustment', outcome: 'stable level', body: 'A level warning triggers a valve adjustment. The stable level occurs after that adjustment.' },
    { title: 'Booking model', cue: 'clash alert', action: 'booking change', outcome: 'clear schedule', body: 'A clash alert triggers a booking change. The clear schedule follows that change.' },
    { title: 'Workshop model', cue: 'size mismatch', action: 'tool adjustment', outcome: 'fitting part', body: 'A size mismatch triggers a tool adjustment. A fitting part is produced after that adjustment.' },
    { title: 'Library model', cue: 'missing label notice', action: 'label replacement', outcome: 'findable book', body: 'A missing label notice triggers a label replacement. The book becomes findable after that replacement.' },
    { title: 'Garden model', cue: 'dry-bed signal', action: 'watering change', outcome: 'target moisture', body: 'A dry-bed signal triggers a watering change. Target moisture is recorded after that change.' },
    { title: 'Route model', cue: 'closure notice', action: 'route change', outcome: 'open route', body: 'A closure notice triggers a route change. The open route is obtained after that change.' },
    { title: 'Studio model', cue: 'echo warning', action: 'panel adjustment', outcome: 'clear recording', body: 'An echo warning triggers a panel adjustment. The clear recording follows that adjustment.' },
    { title: 'Puzzle model', cue: 'blocked-path signal', action: 'tile move', outcome: 'open path', body: 'A blocked-path signal triggers a tile move. The open path appears after that move.' },
    { title: 'Pulse model A', cue: 'amber pulse', action: 'silver pulse', outcome: 'blue pulse', body: 'An amber pulse triggers a silver pulse. A blue pulse appears after the silver pulse. These pulse roles are defined only by this model.' },
    { title: 'Pulse model B', cue: 'blue pulse', action: 'amber pulse', outcome: 'silver pulse', body: 'A blue pulse triggers an amber pulse. A silver pulse appears after the amber pulse. These pulse roles are defined only by this model.' }
  ];
  function hexagon(c) {
    const rng = c.rng, system = pick(rng, SYSTEMS);
    const entries = [{ id: 'cue', label: system.cue }, { id: 'response', label: system.action }, { id: 'consequence', label: system.outcome }];
    return base(c, 'hexagon', {
      kind: 'order', channel: 'binding', title: 'Rebuild the episode',
      prompt: 'Arrange all three cards from initiating cue to response to consequence. Select them in order.',
      source: { title: system.title, body: 'Use this stipulated sequence: ' + system.body, items: [] },
      options: options(rng, entries), answer: ['cue', 'response', 'consequence'],
      explanation: system.cue + ' → ' + system.action + ' → ' + system.outcome + '. The events follow the order supplied by the model; timing alone would not establish an additional causal claim.',
      hint: 'Find what triggers something else, then what that response produces.'
    });
  }
  function prism(c) {
    const rng = c.rng;
    const systems = scheduledVariant(c, 'prism-surface-trap', ['ordinary', 'ordinary', 'ordinary', 'ordinary', 'relabelled']) === 'relabelled' ? shuffle(rng, SYSTEMS.slice(-2)) : take(rng, SYSTEMS, 2);
    const roles = ['cue', 'action', 'outcome'];
    const answer = {};
    roles.forEach(function (role) { answer['left-' + role] = 'right-' + role; });
    return base(c, 'prism', {
      kind: 'mapping', channel: 'mapping', title: 'Map the roles',
      prompt: 'Match every element in the first model to the element with the same role in the second model. Use each target once.',
      source: { title: systems[0].title, body: systems[0].body, items: [] },
      secondary: { title: systems[1].title, body: systems[1].body, items: [] },
      left: shuffle(rng, roles.map(function (role) { return { id: 'left-' + role, label: systems[0][role] }; })),
      right: shuffle(rng, roles.map(function (role) { return { id: 'right-' + role, label: systems[1][role] }; })),
      answer: answer,
      explanation: systems[0].cue + ' corresponds to ' + systems[1].cue + ' (cue); ' + systems[0].action + ' to ' + systems[1].action + ' (response); and ' + systems[0].outcome + ' to ' + systems[1].outcome + ' (consequence).',
      hint: 'Match jobs in the chain: what initiates, what responds, and what results.'
    });
  }

  const BOOLEAN_RULES = [
    { id: 'both', label: 'Open when both signals are present', test: function (a, b) { return a && b; } },
    { id: 'either', label: 'Open when at least one signal is present', test: function (a, b) { return a || b; } },
    { id: 'exactly-one', label: 'Open when exactly one signal is present', test: function (a, b) { return a !== b; } }
  ];
  function heptagon(c) {
    const rng = c.rng, rule = pick(rng, BOOLEAN_RULES), a = rng() < 0.5, b = rng() < 0.5;
    const opens = rule.test(a, b);
    const flags = take(rng, ['sun', 'leaf', 'wave', 'star', 'moon', 'ring'], 2);
    const cases = [[false, false], [true, false], [false, true], [true, true]].map(function (pair, i) {
      return { id: 'case-' + i, label: flags[0] + ' ' + (pair[0] ? 'present' : 'absent') + '; ' + flags[1] + ' ' + (pair[1] ? 'present' : 'absent') + ' → gate ' + (rule.test(pair[0], pair[1]) ? 'opens' : 'waits') + '.' };
    });
    return base(c, 'heptagon', {
      kind: 'function', channel: 'function', channels: { rule: 'function', action: 'function', effect: 'function' },
      title: 'Build and apply the function',
      prompt: 'One listed rule describes every training case. Find it, apply it to the new signals, then predict the defined effect.',
      source: { title: 'Gate training cases', body: 'When the gate opens, the parcel passes. When it waits, the parcel stays. New case: ' + flags[0] + ' ' + (a ? 'present' : 'absent') + '; ' + flags[1] + ' ' + (b ? 'present' : 'absent') + '.', items: shuffle(rng, cases) },
      steps: [
        { id: 'rule', prompt: 'Which condition fits every case?', options: options(rng, BOOLEAN_RULES.map(function (entry) { return { id: entry.id, label: entry.label }; })) },
        { id: 'action', prompt: 'Under that rule, what does the gate do in the new case?', options: options(rng, [{ id: 'open', label: 'Open' }, { id: 'wait', label: 'Wait' }]) },
        { id: 'effect', prompt: 'What consequence does the supplied model predict?', options: options(rng, [{ id: 'passes', label: 'The parcel passes' }, { id: 'stays', label: 'The parcel stays' }, { id: 'unknown', label: 'No consequence is defined' }]) }
      ],
      answer: { rule: rule.id, action: opens ? 'open' : 'wait', effect: opens ? 'passes' : 'stays' },
      explanation: 'The cases support: ' + rule.label.toLowerCase() + '. The new case makes this condition ' + (opens ? 'true' : 'false') + ', so the gate ' + (opens ? 'opens and the parcel passes.' : 'waits and the parcel stays.'),
      hint: 'A case with exactly one signal distinguishes “both” from “at least one”. The case with both present distinguishes “exactly one”.'
    });
  }

  const TRANSFER_DOMAINS = [
    { title: 'Calendar', total: 'total slots', allocated: 'booking entries', free: 'unbooked slots', unit: 'slot' },
    { title: 'Theatre', total: 'total seats', allocated: 'reservation entries', free: 'available seats', unit: 'seat' },
    { title: 'Warehouse', total: 'total spaces', allocated: 'allocation entries', free: 'empty spaces', unit: 'space' },
    { title: 'Library shelf', total: 'total positions', allocated: 'placement entries', free: 'free positions', unit: 'position' },
    { title: 'Project allocation', total: 'total units', allocated: 'commitment entries', free: 'uncommitted units', unit: 'unit' }
  ];
  function octagon(c) {
    const rng = c.rng, domain = pick(rng, TRANSFER_DOMAINS);
    const total = integer(rng, 10, 24), allocated = integer(rng, 3, total - 3), predicted = total - allocated;
    const applies = scheduledVariant(c, 'octagon-scope', ['inside', 'inside', 'outside', 'inside', 'unknown']);
    return base(c, 'octagon', {
      kind: 'sequence', channel: 'function', channels: { map: 'mapping', scope: 'function', prediction: 'function' },
      title: 'Transfer a function with its conditions',
      prompt: 'Map the source role into the target domain, check the scope condition, then make a supported prediction.',
      source: {
        title: 'Source: a capacity function',
        body: 'A system has a total number of positions and a count of allocation records. Each record uses one position. When every record uses a DIFFERENT position, remaining positions = total positions minus allocation records. This rule supplies no exact result when allocations overlap or their distinctness is unknown.',
        items: []
      },
      secondary: {
        title: 'Target: ' + domain.title,
        body: 'Each target entry uses one ' + domain.unit + '.',
        items: [{ id: 'total', label: domain.total + ': ' + total + '.' }, { id: 'allocated', label: domain.allocated + ': ' + allocated + '.' }, { id: 'distinct', label: applies === 'inside' ? 'Every entry uses a different ' + domain.unit + '.' : applies === 'outside' ? 'Some entries refer to the same ' + domain.unit + '; the number of distinct occupied positions is not supplied.' : 'Whether entries use different positions is not recorded.' }]
      },
      steps: [
        { id: 'map', prompt: 'Which target quantity corresponds to the source’s ALLOCATION RECORDS?', options: options(rng, [{ id: 'total', label: domain.total }, { id: 'allocated', label: domain.allocated }, { id: 'remaining', label: domain.free }]) },
        { id: 'scope', prompt: 'Does the target satisfy the function’s distinct-position condition?', options: options(rng, [{ id: 'inside', label: 'Yes, every allocation uses a different position' }, { id: 'outside', label: 'No, the allocations overlap' }, { id: 'unknown', label: 'The necessary distinction is not recorded' }]) },
        { id: 'prediction', prompt: 'How many ' + domain.free + ' does the supplied function establish?', options: options(rng, numberOptions(rng, predicted, total, 2, total).map(function (option) { return { id: option.id.replace('number-', 'value-'), label: option.label }; }).concat([{ id: 'no-prediction', label: 'No exact value is established by this rule' }])) }
      ],
      answer: { map: 'allocated', scope: applies, prediction: applies === 'inside' ? 'value-' + predicted : 'no-prediction' },
      expectedClass: applies === 'unknown' ? 'unknown' : undefined,
      explanation: domain.allocated + ' maps to allocation records. ' + (applies === 'inside' ? 'The positions are distinct, so remaining capacity is ' + total + ' − ' + allocated + ' = ' + predicted + '.' : applies === 'outside' ? 'The entries overlap and the distinct occupied count is missing. Subtracting the number of entries would not establish the exact remaining capacity.' : 'The necessary distinctness condition is unknown. The supplied rule therefore does not establish an exact remaining count.'),
      hint: 'Map the role before importing the subtraction. Check whether entry count also equals distinct occupied-position count.'
    });
  }

  const ACCOUNTS = [
    { title: 'A report from a workshop', belief: 'An early size check will reveal a mismatch.', goal: 'Make a part that fits.', action: 'Measured the part before cutting.', outcome: 'Found a mismatch and changed the cut.' },
    { title: 'A report from a meeting', belief: 'A question will clarify the request.', goal: 'Understand the requested task.', action: 'Asked what the final result should contain.', outcome: 'Received a more precise description.' },
    { title: 'A report from a journey', belief: 'The route notice may affect this trip.', goal: 'Reach the destination using an open route.', action: 'Read the notice before choosing a route.', outcome: 'Selected a route without the listed closure.' },
    { title: 'A report from a studio', belief: 'Listening back may expose a timing error.', goal: 'Make the timing consistent.', action: 'Replayed the recording.', outcome: 'Heard an uneven pause.' },
    { title: 'A report from a library', belief: 'Checking the catalogue can locate the book.', goal: 'Find the requested book.', action: 'Searched the catalogue.', outcome: 'Located its shelf entry.' },
    { title: 'A report from a garden', belief: 'A moisture reading can guide the next watering.', goal: 'Keep moisture in the chosen range.', action: 'Read the moisture indicator.', outcome: 'Learned that watering could wait.' },
    { title: 'A report from a prototype trial', belief: 'A heavier base will prevent tipping.', goal: 'Keep the prototype upright.', action: 'Added a heavier base.', outcome: 'The prototype still tipped during the trial.' },
    { title: 'A report from a message exchange', belief: 'A shorter message will make the request clearer.', goal: 'Make the request easy to understand.', action: 'Removed an example from the message.', outcome: 'The recipient asked for an example.' }
  ];
  function cube(c) {
    const rng = c.rng, accounts = take(rng, ACCOUNTS, 2);
    const roles = ['belief', 'goal', 'action', 'outcome'];
    const answer = {};
    roles.forEach(function (role) { answer['left-' + role] = 'right-' + role; });
    function accountSource(account) {
      return { title: account.title, body: 'The account explicitly supplies what was believed, wanted, done and observed. Match functional roles across the two accounts.', items: shuffle(rng, roles.map(function (role) { return { id: role, label: (role === 'belief' ? 'Reported thought: ' : role === 'goal' ? 'Stated aim: ' : role === 'action' ? 'Chosen step: ' : 'Observed result: ') + account[role] }; })) };
    }
    return base(c, 'cube', {
      kind: 'mapping', channel: 'mapping', title: 'Keep four roles distinct',
      prompt: 'Match the four roles across these accounts. Each target is used once; similar subject matter is not the matching rule.',
      source: accountSource(accounts[0]), secondary: accountSource(accounts[1]),
      left: shuffle(rng, roles.map(function (role) { return { id: 'left-' + role, label: accounts[0][role] }; })),
      right: shuffle(rng, roles.map(function (role) { return { id: 'right-' + role, label: accounts[1][role] }; })),
      answer: answer,
      explanation: 'Map belief to belief, goal to goal, action to action and observed outcome to observed outcome. A desired result belongs to the goal role; an actual reported result belongs to outcome.',
      hint: 'Ask of each statement: was this thought, wanted, done, or observed?'
    });
  }

  function dodecahedron(c) {
    const rng = c.rng;
    const patterns = take(rng, ['striped', 'spotted', 'plain', 'checked', 'wavy', 'dotted'], 4);
    const add = integer(rng, 2, 5), subtract = integer(rng, 1, 3), value = integer(rng, 5, 12);
    const entries = [
      { id: 'add', pattern: patterns[0], label: 'For ' + patterns[0] + ' tokens, add ' + add + '.', apply: function (x) { return x + add; } },
      { id: 'double', pattern: patterns[1], label: 'For ' + patterns[1] + ' tokens, double the value.', apply: function (x) { return x * 2; } },
      { id: 'subtract', pattern: patterns[2], label: 'For ' + patterns[2] + ' tokens, subtract ' + subtract + '.', apply: function (x) { return x - subtract; } }
    ];
    const index = scheduledVariant(c, 'dodecahedron-library', ['listed', 'listed', 'listed', 'listed', 'unlisted']) === 'unlisted' ? 3 : integer(rng, 0, 2);
    const entry = entries[index];
    const numericAnchor = (entry || pick(rng, entries)).apply(value);
    const otherOutputs = entries.map(function (item) { return item.apply(value); }).filter(function (output) { return output !== numericAnchor; });
    const numericChoices = numberOptions(rng, numericAnchor, pick(rng, otherOutputs), 2).map(function (option) { return { id: option.id.replace('number-', 'value-'), label: option.label }; });
    return base(c, 'dodecahedron', {
      kind: 'function', channel: 'function', channels: { select: 'function', apply: 'function' },
      title: 'Choose from a function library',
      prompt: 'Select the rule for this token, then apply exactly that rule.',
      source: { title: 'Indexed functions', body: 'Current token: ' + patterns[index] + ', value ' + value + '. These are the complete supplied rules; there is no default for unlisted patterns.', items: shuffle(rng, entries.map(function (item) { return { id: item.id, label: item.label }; })) },
      steps: [
        { id: 'select', prompt: 'Which library entry applies?', options: options(rng, entries.map(function (item) { return { id: item.id, label: item.label }; }).concat([{ id: 'none', label: 'No supplied rule covers this pattern' }])) },
        { id: 'apply', prompt: 'What transformed value is established?', options: options(rng, numericChoices.concat([{ id: 'unknown', label: 'No transformed value is established' }])) }
      ],
      answer: { select: entry ? entry.id : 'none', apply: entry ? 'value-' + entry.apply(value) : 'unknown' },
      expectedClass: entry ? undefined : 'unknown',
      explanation: entry ? entry.label + ' Starting from ' + value + ', this gives ' + entry.apply(value) + '.' : 'The ' + patterns[index] + ' pattern has no library entry. Selecting an unrelated function would invent a rule.',
      hint: 'Use the pattern as the library index before considering the number.'
    });
  }

  function icosahedron(c) {
    const rng = c.rng;
    const featureA = pick(rng, ['warm', 'bright', 'dry']);
    const oppositeA = { warm: 'cool', bright: 'dim', dry: 'damp' }[featureA];
    const featureB = pick(rng, ['blue', 'gold', 'green']);
    const oppositeB = pick(rng, COLORS.filter(function (color) { return color !== featureB; }));
    const diagnosticA = rng() < 0.5;
    const diagnosticSetting = diagnosticA ? featureA : oppositeA;
    const diagnosticMarker = diagnosticA ? oppositeB : featureB;
    const tests = [
      { id: 'separates', label: diagnosticSetting + ' with a ' + diagnosticMarker + ' marker' },
      { id: 'both-on', label: featureA + ' with a ' + featureB + ' marker' },
      { id: 'both-off', label: oppositeA + ' with a ' + oppositeB + ' marker' }
    ];
    const result = scheduledVariant(c, 'icosahedron-result', ['known', 'known', 'known', 'known', 'missing']) === 'missing' ? null : rng() < 0.5;
    const update = result === null ? 'unresolved' : result === diagnosticA ? 'model-a' : 'model-b';
    return base(c, 'icosahedron', {
      kind: 'sequence', channel: 'revision', channels: { test: 'revision', update: 'revision' },
      title: 'Separate the explanations',
      prompt: 'First choose a test on which the models disagree. Then interpret the supplied result of that diagnostic test.',
      source: { title: 'Two deterministic models', body: 'Model A: the lamp is on exactly when the setting is ' + featureA + '. Model B: the lamp is on exactly when the marker is ' + featureB + '. Assume these models make the stated predictions without measurement error for this exercise.', items: [] },
      steps: [
        { id: 'test', prompt: 'Which test gives different predictions from A and B?', options: options(rng, tests) },
        { id: 'update', prompt: 'New evidence: the ' + diagnosticSetting + ' / ' + diagnosticMarker + '-marker test ' + (result === null ? 'has no recorded result yet.' : 'produced a lamp that was ' + (result ? 'ON.' : 'OFF.')) + ' What does this establish?', options: options(rng, [{ id: 'model-a', label: 'A fits this result; B conflicts with it' }, { id: 'model-b', label: 'B fits this result; A conflicts with it' }, { id: 'unresolved', label: 'No result is available to distinguish the models yet' }, { id: 'proved', label: 'One fitting result proves its model universally true' }]) }
      ],
      answer: { test: 'separates', update: update },
      expectedClass: result === null ? 'unknown' : undefined,
      explanation: 'On the ' + diagnosticSetting + ' / ' + diagnosticMarker + '-marker test, A predicts ' + (diagnosticA ? 'ON' : 'OFF') + ' and B predicts ' + (diagnosticA ? 'OFF' : 'ON') + '. ' + (result === null ? 'Without a recorded result, neither can be preferred using this test.' : (result ? 'ON' : 'OFF') + ' agrees with ' + (update === 'model-a' ? 'A' : 'B') + ' and conflicts with the other model for this trial; universal truth is not established.'),
      hint: 'Compute each model’s prediction separately. Look for disagreement, then use the actual result.'
    });
  }

  function geodesic(c) {
    const rng = c.rng;
    const variant = scheduledVariant(c, 'geodesic-trace', [0, 1, 2, 3]);
    const diagnoses = [
      { id: 'lag', label: 'Wrong retrieval position: the trace used a different lag' },
      { id: 'roles', label: 'Role swap: the trace exchanged cue and response' },
      { id: 'scope', label: 'Scope extension: the trace applied a rule beyond its stated conditions' },
      { id: 'none', label: 'No process error is shown in this trace' }
    ];
    let source, repairOptions, answer, explanation;
    if (variant === 0 || variant === 3) {
      const lag = integer(rng, 2, 4), historyLength = lag + integer(rng, 1, 3);
      const names = take(rng, NAMES, historyLength + 1);
      const target = historyLength - lag;
      const selected = variant === 0 ? historyLength - 1 : target;
      source = {
        title: 'Preserved retrieval trace',
        body: 'Task: identify the record exactly ' + lag + ' committed observations before CURRENT ' + names[historyLength] + '. History is shown from OLDEST to NEWEST below; the current record is not in that history. Previous attempt selected ' + names[selected] + '.',
        items: names.slice(0, historyLength).map(function (name, index) { return { id: 'history-' + index, label: 'Committed position ' + (index + 1) + ': ' + name + '.' }; })
      };
      repairOptions = [
        { id: 'correct-record', label: (variant === 0 ? 'Change the selected record to ' : 'Keep the selected record ') + names[target] + '; preserve the history' },
        { id: 'oldest-record', label: 'Select ' + names[0] + ' because it is the oldest available record' },
        { id: 'current-record', label: 'Select current ' + names[historyLength] + ' as if it were already a prior record' }
      ];
      answer = { diagnose: variant === 0 ? 'lag' : 'none', repair: 'correct-record' };
      explanation = 'Counting backward from the current observation gives ' + names[historyLength - 1] + ' at 1-back and ' + names[target] + ' at ' + lag + '-back. ' + (variant === 0 ? 'The earlier attempt selected 1-back, so change the retrieval position while preserving the history.' : 'The earlier attempt already used the exact requested record. Retain it; no correction to the source is warranted.');
    } else if (variant === 1) {
      const system = pick(rng, SYSTEMS);
      source = {
        title: 'Preserved role-assignment trace', body: system.body,
        items: [
          { id: 'draft-cue', label: 'Previous attempt assigned CUE = ' + system.action + '.' },
          { id: 'draft-action', label: 'Previous attempt assigned RESPONSE = ' + system.cue + '.' },
          { id: 'draft-outcome', label: 'Previous attempt assigned CONSEQUENCE = ' + system.outcome + '.' }
        ]
      };
      repairOptions = [
        { id: 'restore-roles', label: 'Cue = ' + system.cue + '; response = ' + system.action + '; consequence = ' + system.outcome },
        { id: 'reverse-all', label: 'Cue = ' + system.outcome + '; response = ' + system.action + '; consequence = ' + system.cue },
        { id: 'rewrite-source', label: 'Change the original model so the earlier assignment becomes true' }
      ];
      answer = { diagnose: 'roles', repair: 'restore-roles' };
      explanation = 'The source names ' + system.cue + ' as the initiating cue and ' + system.action + ' as its response. The trace swapped those two roles; restore their assignments and retain the source.';
    } else {
      const increment = integer(rng, 2, 5), input = integer(rng, 4, 9);
      source = {
        title: 'Preserved scope trace',
        body: 'Supplied rule: for STRIPED tokens, add ' + increment + ' to the value. No rule is supplied for other patterns.',
        items: [{ id: 'case', label: 'Case: a SPOTTED token with value ' + input + '.' }, { id: 'draft', label: 'Previous attempt: apply add ' + increment + ' and report ' + (input + increment) + ' as the established result.' }]
      };
      repairOptions = [
        { id: 'limit-rule', label: 'Retain the striped-token rule and mark the spotted-token result as not established' },
        { id: 'universalise', label: 'Declare that all token patterns use add ' + increment },
        { id: 'reverse-rule', label: 'Subtract ' + increment + ' because the pattern is different' }
      ];
      answer = { diagnose: 'scope', repair: 'limit-rule' };
      explanation = 'The arithmetic follows the stated operation, but the operation was licensed only for striped tokens. Repair the unsupported extension; neither the same nor the opposite effect is established for spotted tokens.';
    }
    return base(c, 'geodesic', {
      kind: 'sequence', channel: 'revision', channels: { diagnose: 'revision', repair: 'revision' },
      title: 'Diagnose the operation, then repair it',
      prompt: 'Inspect the preserved task and earlier attempt. Identify the process issue, then choose the smallest supported repair.',
      source: source,
      steps: [
        { id: 'diagnose', prompt: 'What process error, if any, is actually shown?', options: options(rng, diagnoses) },
        { id: 'repair', prompt: 'Which response repairs the operation while respecting the original evidence?', options: options(rng, repairOptions) }
      ],
      answer: answer, explanation: explanation,
      hint: 'Check what was retrieved, which role each element received and whether the rule covered this case. Preserve the original observations.'
    });
  }

  function sphere(c) {
    const rng = c.rng;
    const amount = integer(rng, 2, 5), first = integer(rng, 6, 10), second = first + integer(rng, 2, 4), next = integer(rng, 12, 17);
    const functions = [
      { id: 'add', label: 'Add ' + amount + ' to the input', apply: function (value) { return value + amount; } },
      { id: 'subtract', label: 'Subtract ' + amount + ' from the input', apply: function (value) { return value - amount; } },
      { id: 'multiply', label: 'Multiply the input by ' + amount, apply: function (value) { return value * amount; } }
    ];
    const selected = pick(rng, functions);
    const prediction = selected.apply(next);
    const variant = scheduledVariant(c, 'sphere-evidence', [0, 1, 2]);
    const feedback = variant === 2 ? prediction : prediction - integer(rng, 1, amount);
    const condition = variant === 0 ? 'HEAVY load' : 'LIGHT load';
    const revision = variant === 0 ? 'boundary' : variant === 1 ? 'reopen' : 'retain';
    return base(c, 'sphere', {
      kind: 'sequence', channel: 'revision', channels: { map: 'mapping', infer: 'function', revise: 'revision' },
      title: 'Choose, infer, revise',
      prompt: 'Commit a function and prediction from the earlier observations. The final step then supplies new evidence about its status.',
      source: {
        title: 'Earlier observations, preserved',
        body: 'All earlier cases used LIGHT load. Choose the listed function that fits both input-output relationships. Treat the function as provisional, not a universal law.',
        items: [{ id: 'earlier-a', label: 'LIGHT load: input ' + first + ' → output ' + selected.apply(first) + '.' }, { id: 'earlier-b', label: 'LIGHT load: input ' + second + ' → output ' + selected.apply(second) + '.' }]
      },
      steps: [
        { id: 'map', prompt: 'Which listed function fits both earlier relationships?', options: options(rng, functions.map(function (entry) { return { id: entry.id, label: entry.label }; })) },
        { id: 'infer', prompt: 'Before seeing new evidence, what does that function predict for input ' + next + ' under LIGHT load?', options: numberOptions(rng, prediction, next * amount) },
        { id: 'revise', prompt: 'NEW OBSERVATION: input ' + next + ' under ' + condition + ' produced output ' + feedback + '. How should the provisional interpretation change?', options: options(rng, [{ id: 'boundary', label: 'Keep the earlier light-load findings; treat heavy load as outside the tested scope and investigate it' }, { id: 'reopen', label: 'A light-load counterexample challenges the rule within its tested setting; check the record and reopen the rule' }, { id: 'retain', label: 'This light-load result supports retaining the rule provisionally; further cases can still challenge it' }, { id: 'erase', label: 'Replace the earlier observations so they agree with the newest result' }]) }
      ],
      answer: { map: selected.id, infer: 'number-' + prediction, revise: revision },
      explanation: 'The rule “' + selected.label + '” fits both earlier cases and predicts ' + prediction + ' for input ' + next + '. ' + (variant === 0 ? 'The discrepant result used a different load, so it exposes a possible scope boundary without erasing the earlier findings.' : variant === 1 ? 'The discrepant result used the same light-load setting. It challenges the rule within that setting and warrants checking and revision.' : 'The new light-load result agrees with the prediction. It supports the rule provisionally without proving it universal.'),
      hint: 'Preserve observations and change interpretations. Check whether the new result agrees, and whether the context changed.'
    });
  }

  const GENERATORS = {
    circle: circle, 'half-circle': halfCircle, triangle: triangle, square: square,
    pentagon: pentagon, hexagon: hexagon, prism: prism, heptagon: heptagon,
    octagon: octagon, cube: cube, dodecahedron: dodecahedron,
    icosahedron: icosahedron, geodesic: geodesic, sphere: sphere
  };

  function generateChallenge(stageId, config) {
    if (!Object.prototype.hasOwnProperty.call(GENERATORS, stageId)) throw new RangeError('Unknown FORM stage: ' + stageId);
    return deepFreeze(GENERATORS[stageId](makeContext(stageId, config)));
  }
  function answerFor(challenge) {
    if (!challenge || !Object.prototype.hasOwnProperty.call(challenge, 'answer')) throw new TypeError('A challenge with an answer is required.');
    return clone(challenge.answer);
  }
  function sameArray(a, b) {
    return Array.isArray(a) && a.length === b.length && a.every(function (value, index) { return value === b[index]; });
  }
  function plainResponse(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function evaluateChallenge(challenge, response) {
    if (!challenge || typeof challenge !== 'object' || !Object.prototype.hasOwnProperty.call(challenge, 'answer')) throw new TypeError('A valid challenge is required.');
    const result = { correct: false, channelResults: {}, explanation: challenge.explanation || '' };
    if (challenge.warmup || challenge.kind === 'warmup') return result;
    function score(channel, correct, total) {
      const name = channel || challenge.channel || 'relation';
      if (!result.channelResults[name]) result.channelResults[name] = { correct: 0, total: 0 };
      result.channelResults[name].correct += correct;
      result.channelResults[name].total += total;
    }
    if (challenge.kind === 'function' || challenge.kind === 'sequence') {
      const value = plainResponse(response) ? response : {};
      let correct = plainResponse(response) && Object.keys(response).length === challenge.steps.length;
      challenge.steps.forEach(function (step) {
        const matches = Object.prototype.hasOwnProperty.call(value, step.id) && value[step.id] === challenge.answer[step.id];
        score(challenge.channels && challenge.channels[step.id] || challenge.channel, matches ? 1 : 0, 1);
        correct = correct && matches;
      });
      result.correct = Boolean(correct);
    } else if (challenge.kind === 'mapping') {
      const value = plainResponse(response) ? response : {};
      const keys = Object.keys(challenge.answer);
      const matches = keys.reduce(function (count, key) { return count + (Object.prototype.hasOwnProperty.call(value, key) && value[key] === challenge.answer[key] ? 1 : 0); }, 0);
      const values = keys.map(function (key) { return value[key]; });
      result.correct = plainResponse(response) && Object.keys(value).length === keys.length && matches === keys.length && new Set(values).size === keys.length;
      score(challenge.channel, matches, keys.length);
    } else if (challenge.kind === 'order') {
      result.correct = sameArray(response, challenge.answer);
      const matches = Array.isArray(response) ? challenge.answer.reduce(function (count, value, index) { return count + (response[index] === value ? 1 : 0); }, 0) : 0;
      score(challenge.channel, matches, challenge.answer.length);
    } else if (challenge.kind === 'connect') {
      result.correct = sameArray(response, challenge.answer);
      score(challenge.channel, result.correct ? 1 : 0, 1);
    } else {
      result.correct = typeof response === 'string' && response === challenge.answer;
      score(challenge.channel, result.correct ? 1 : 0, 1);
    }
    return result;
  }

  return Object.freeze({ STAGES: STAGES, generateChallenge: generateChallenge, evaluateChallenge: evaluateChallenge, answerFor: answerFor });
});
