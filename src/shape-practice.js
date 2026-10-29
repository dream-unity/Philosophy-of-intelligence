(function (root, factory) {
  'use strict';
  const models = typeof module === 'object' && module.exports ? require('./relational-models.js') : root.FormRelationalModels;
  const api = factory(models);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormShapePractice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (models) {
  'use strict';

  if (!models || typeof models.getModel !== 'function') throw new Error('Load relational-models.js before shape-practice.js.');

  // These are declared teaching conventions, not a measured cognitive or physiological scale.
  const INTRO = 'Circle begins with one explicit conceptual relationship, such as ocean contains boat: two contents, one relationship. Half-circle holds two distinct relationships. Later shapes organise more selected relationships; properties, palace addresses and routine comparisons do not define their count. Every shape uses the complete breath-back procedure in consciousness streaming, heart practice or body mapping.';
  const BREATH_BACK = 'Inhale: receive and select the current relationship or full relational model. Exhale: encode it at a distinct address in your home memory palace first; then deliberately retrieve the scheduled earlier entry, compare and append a note while preserving both originals. The notebook uses N committed entries back. N counts committed observations, not breaths or seconds. The four-breath examples use B = 1 only when each complete entry fits one ordinary breath; then N = 1 and B = 1 coincide. If work takes extra breaths, continue normally, keep an already-started return target fixed, and use honest breath anchors or explicitly practise four N = 1 entries instead. A continuing scene or unchanged selection is valid; do not force novelty. Never substitute the most similar record for the scheduled target.';
  const ADDRESSES = Object.freeze(['doorway', 'hallway shelf', 'desk', 'window']);

  const METADATA = [
  [
    "circle",
    "Circle",
    "Relate",
    1,
    "Two identified roles joined by one explicit conceptual relationship. The circular frame is not another link.",
    "One meaningful relationship is the complete current unit: ocean contains boat, for example. Two objects do not make two relationships. Preserve both relata and the meaning that connects them. Full encoding, exact return, comparison and revision already operate here.",
    "I can identify both roles and their one selected meaning; an isolated object or property is not a complete relation."
  ],
  [
    "half-circle",
    "Half-circle",
    "Coordinate",
    2,
    "Two distinct conceptual links between the same two identified roles.",
    "Coordinate two substantive meanings, such as ocean contains boat and boat enables passage across ocean. Containment and function are distinct; contains and is contained by restate one relationship. Nothing new is unlocked in the memory or return procedure.",
    "I can distinguish two meanings without counting inverse wording twice."
  ],
  [
    "triangle",
    "Triangle",
    "Close",
    3,
    "Three roles with all three pair connections explicitly represented.",
    "Select three meaningful relationships that connect three roles. Ocean contains boat; boat enables fisher; fisher depends on ocean is one example. The closing relation must have its own stated basis; the first two do not automatically prove it.",
    "I can recover all three pair connections and state the basis of the closing link."
  ],
  [
    "square",
    "Square",
    "Connect",
    4,
    "A four-role cycle with four distinct selected links.",
    "A four-link cycle can join environment, means, provision and dependence. Its shape describes connectivity; the predicates need not form a causal loop or share one direction. A change in selected meaning does not automatically make the previous meaning false.",
    "I can preserve the four-role closure while distinguishing changed selection from changed facts."
  ],
  [
    "pentagon",
    "Pentagon",
    "Extend",
    5,
    "A five-role cycle; five unique content relationships.",
    "Adding a role can separate a relationship that was previously compressed. Keep the five specific connections visible. Replacing one closing link with two gives one additional link; retaining the old link as well creates an extra chord and changes the count.",
    "I can show where a role was introduced and count the resulting five links without an uncounted shortcut."
  ],
  [
    "hexagon",
    "Hexagon",
    "Contextualise",
    6,
    "A six-role closed cycle with six selected conceptual links.",
    "Bring a relevant rule, context or constraint into the selected network through explicit relationships. Merely adding the word context does not complete a link. The six registered meanings remain the current content; palace addressing and historical comparison do not become extra sides.",
    "I can state exactly how the selected context or constraint connects to its two neighbouring roles."
  ],
  [
    "heptagon",
    "Heptagon",
    "Differentiate",
    7,
    "A seven-role closed cycle with seven selected links.",
    "Differentiate another role and articulate its relationships, such as council authorises a rule or context informs an interpretation. Agency, representation and experience remain distinct. Each selected link needs a meaning, not merely a place in a seven-item list.",
    "I can distinguish the added role from its neighbours and recover both links involving it."
  ],
  [
    "octagon",
    "Octagon",
    "Represent",
    8,
    "An eight-role closed cycle with eight selected links.",
    "An explicit representation, expectation or uncertainty can become part of the selected system. Keep the representation distinct from what it represents and keep its limits visible. Eight related roles do not establish eight links unless the full cycle is specified.",
    "I can keep a representation and its target distinct, including disagreement and uncertainty."
  ],
  [
    "prism",
    "Triangular prism",
    "Bridge",
    9,
    "Two three-link triads plus three specified bridges: six roles, nine links.",
    "Hold two complete triads together with three precise correspondences or contrasts. These bridges count because they are selected present content. They are separate from the routine historical comparison, which remains available at every shape and adds no source links.",
    "I can recover both complete triads and each bridge’s stated basis, including a meaningful mismatch."
  ],
  [
    "cube",
    "Cube",
    "Coordinate systems",
    12,
    "Two four-link cycles plus four role bridges: eight roles, twelve links.",
    "Coordinate two four-role systems without merging their sources. A bridge may preserve one function while failing in another respect. Keep the scope of all four correspondences explicit and revise affected bridges when an internal relation changes.",
    "I can recover both four-link cycles and all four bridges without treating a partial match as total identity."
  ],
  [
    "dodecahedron",
    "Dodecahedron",
    "Connect cycles",
    30,
    "Twenty roles, thirty unique edges and twelve pentagonal faces.",
    "Use a declared thirty-link network whose local pentagons share roles and edges consistently. Thirty relationships are required for the full model; one remembered patch is not the whole. A failed, negated or contested relationship can be represented without pretending it is a functioning support.",
    "I can recover the shared roles and all thirty selected links, and distinguish a local patch from the declared full model."
  ],
  [
    "icosahedron",
    "Icosahedron",
    "Connect triads",
    30,
    "Twelve roles, thirty unique edges and twenty triangular faces.",
    "Reorganise thirty relationships into a network of shared triads. The count is the same as the Dodecahedron; the organisation differs. Keep constraints, aims and interpretations explicit without confusing an intended outcome with evidence that it occurred.",
    "I can recover the thirty-link triangular organisation and distinguish its aims, requirements and achieved results."
  ],
  [
    "geodesic",
    "Geodesic sphere",
    "Refine",
    120,
    "A specified subdivided icosahedral mesh: forty-two roles, 120 edges and eighty triangular faces.",
    "Refine thirty direct relationships through thirty named mediators, giving sixty links, and add sixty explicit compatibility requirements. The old direct links are replaced in this counted mesh. Requirements, unmet requirements and proposed repairs remain distinguishable; pairwise agreement alone does not prove the whole system feasible.",
    "I can recover the sixty mediated links and sixty compatibility requirements without double-counting the old direct links."
  ],
  [
    "sphere",
    "Sphere",
    "Integrate",
    120,
    "The same declared finite 120-link network, accessible through several entry points.",
    "Hold the declared network as an integrated whole while its constituent meanings, conflicts and limits remain recoverable. Changing attentional entry is not itself a model change. Unlike Circle’s one explicit relationship, this whole retains its many internal relationships even when given one name.",
    "I can enter the same full model through different roles, identify an exact conflict and preserve earlier versions."
  ]
];

  const STREAM_EXAMPLES = {
  "circle": {
    "baseline": "Ocean and boat remain available in one imagined scene. Select exactly one complete relationship on each inhale; the selected meaning may change.",
    "notes": "Two contents can participate in one relationship. Earlier meanings may remain true while another is foregrounded. Every source entry keeps its own address; the historical comparison does not add a second selected source link."
  },
  "half-circle": {
    "baseline": "Each row selects two distinct conceptual relationships between two contents.",
    "notes": "This does not claim that every cage only restricts or every harbour always shelters. These are the selected meanings of the illustrative encounters."
  },
  "triangle": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher depends on ocean.",
    "notes": "Fear, trust and dependence are meanings in the imagined experience, not claims inferred solely from seeing a fisher."
  },
  "square": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher supplies village; village depends on ocean.",
    "notes": ""
  },
  "pentagon": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village depends on ocean.",
    "notes": "This is a change in selected interpretation. Selling and nourishment need not be mutually exclusive facts."
  },
  "hexagon": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village sets quota; quota constrains ocean extraction.",
    "notes": ""
  },
  "heptagon": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village authorises council; council sets quota; quota constrains ocean extraction.",
    "notes": ""
  },
  "octagon": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village authorises council; council sets quota; quota accords with stock estimate; estimate represents ocean stock.",
    "notes": "A constructed resolution is not evidence that the estimate is accurate or the policy will succeed outside the imagined model."
  },
  "prism": {
    "baseline": "Ocean contains boat; boat enables fisher; fisher depends on ocean. Forest contains path; path enables walker; walker depends on forest. Bridges: ocean-forest as environments; boat-path as means of access; fisher-walker as dependent agents.",
    "notes": "Correspondence and contrast are both explicit relationships. Keep their precise basis recoverable; \"similar scenes\" is insufficient."
  },
  "cube": {
    "baseline": "Fishing cycle: ocean contains boat; boat enables fisher; fisher supplies village; village depends on ocean. Cultivation cycle: land contains irrigation; irrigation enables grower; grower supplies town; town depends on land. Bridges: ocean-land as environments; boat-irrigation as work-enabling infrastructure; fisher-grower as producers; village-town as dependent communities.",
    "notes": ""
  },
  "dodecahedron": {
    "baseline": "Use the complete imagined cooperative relationship register below. It includes water provision, food production, maintenance and governance. All thirty links are selected; the following changes are full-model versions.",
    "notes": "All four are encounters with a familiar constructed model. A single workshop-pump thought without recovery of the other relations is a local patch, not the full Dodecahedron."
  },
  "icosahedron": {
    "baseline": "Use the complete ferry-design relationship register below: service brief, budget, five aims and five implementation choices. This changes organisation from the Dodecahedron while keeping thirty links.",
    "notes": ""
  },
  "geodesic": {
    "baseline": "Refine the thirty ferry links through thirty named mechanisms, giving sixty links. Add sixty pairwise compatibility requirements across the twenty original triangular contexts. The full relationship register specifies the whole mesh.",
    "notes": "Replacing old direct links by two mediated links matters: retaining the old thirty as well would give 150 counted links, not this 120-link mesh."
  },
  "sphere": {
    "baseline": "Use the same declared finite ferry model. Hold it as one whole while its aims, dependencies, mediators, conflicts and unknowns remain recoverable.",
    "notes": "Circle explicitly represents one selected relationship. Sphere integrates a declared finite network whose constituent relations remain recoverable. One name for that network does not make its count one."
  }
};

  const EXERCISE_CONTEXT = {
    stream: 'Receive images, words, memories and meanings in the consciousness stream. This standalone exercise does not require attention to bodily sensations, heartbeat or the heart area.',
    heart: 'Continue the heart exercise’s gentle attention and sincere feeling in the normal way. Select conceptual relationships within the care, memory or felt-meaning experience that is actually available. Do not substitute an expected feeling or a claim about measured heart coherence.',
    body: 'Continue the body-mapping prompt in the normal way. Sensation descriptions can supply evidence for a selected relationship, but location, texture and intensity alone do not define shape count. The examples are constructed seated encounters; they do not assign a fixed emotion or diagnosis to a sensation.'
  };

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function getExamples(stage, exercise, model) {
    const rows = model.fourBreaths;
    if (!rows || rows.length !== 4) throw new Error('Four examples required for ' + stage.id + '/' + exercise);
    return rows.map(function (row, index) {
      const inhale = Array.isArray(row) ? row[0] : row.inhale;
      const comparison = Array.isArray(row) ? row[1] : row.compare;
      return {
        inhale: inhale,
        address: ADDRESSES[index],
        encode: 'On the exhale, encode the complete current ' + (stage.relationCount === 1 ? 'relationship' : stage.relationCount + '-link model') + ' at your ' + ADDRESSES[index] + ', including its selected meanings and uncertainties. ' + (index ? 'Keep earlier addresses and their original entries intact; retrieve only after this encoding.' : 'This is the first address of this separate run.'),
        compare: comparison
      };
    });
  }

  function buildGuide(stage, exercise) {
    const model = models.getModel(stage.id, exercise);
    if (!model || !Array.isArray(model.relations) || model.relations.length !== stage.relationCount) {
      throw new Error('The complete relation register is missing for ' + stage.id + '/' + exercise);
    }
    const source = exercise === 'stream' ? STREAM_EXAMPLES[stage.id] : null;
    const baseline = source ? source.baseline : stage.relationCount < 30 ? model.relations.map(relation => relation.text).join(' ') : 'Prepare the complete ' + model.title + ' model and all ' + stage.relationCount + ' selected relationships in its register. The four encounters below are versions of that full model.';
    return {
      notice: EXERCISE_CONTEXT[exercise] + ' On the inhale, select ' + (stage.relationCount === 1 ? 'one complete meaningful relationship' : 'the full declared ' + stage.relationCount + '-link organisation') + '. On the exhale, encode it at a distinct home-palace address before deliberately seeking the earlier target.',
      recall: 'Only after current encoding, retrieve exactly N committed entries back before revealing any earlier note. Until N earlier entries exist, seed history. In the four-breath B = 1 rehearsal, return to the preceding breath’s entry; a matching older entry is not a substitute. Recover roles and meanings, not only the model’s name.',
      relate: 'Compare the complete current and retrieved selections under identified role correspondences. Distinguish preserved meaning, changed meaning, different participants and uncertainty. A historical comparison is an annotation, not another counted relationship in the current source model. ' + (source && source.notes ? source.notes : 'Changing which relationship is foregrounded need not make the earlier relationship false.'),
      revise: 'Keep both original entries at their own addresses. Append the comparison or a warranted correction with its reason. Label deliberate construction and inference separately from what appeared. If a registered link cannot be recovered, record the partial model and its actual count instead of filling the gap to claim the shape.',
      baseline: baseline,
      preparation: EXERCISE_CONTEXT[exercise] + (stage.relationCount >= 30 && exercise !== 'stream' ? ' This is a represented practice episode: attention, interpretation and review are roles inside the imagined model. Only their explicitly selected internal relationships count. Your actual encoding, retrieval and comparison of that model remain the full procedure outside its count.' : '') + ' These are illustrative possibilities, not required arrivals or outcomes. “Keep” and “retain” refer to the model already present in the current encounter; they do not instruct you to retrieve an old palace record before encoding.',
      register: model.relations,
      model: model,
      examples: getExamples(stage, exercise, model)
    };
  }

  const STAGES = METADATA.map(function (row) {
    const stage = {
      id: row[0], name: row[1], verb: row[2], defaultLag: 1,
      relationCount: row[3], topology: row[4], theory: row[5],
      preparation: 'Use a separate room or four distinct sublocations in your home for this run: doorway, hallway shelf, desk and window. Keep every entry at its own stable address. ' + (row[3] >= 30 ? 'Learn the full register before rehearsing. A familiar model may be reactivated as a whole; inventing or reading ' + row[3] + ' links is not a one-inhale requirement. Use four record-paced entries if the full work takes extra breaths.' : 'The four-breath rehearsal assumes one complete selection, encoding and return fits each ordinary breath. Otherwise use four record-paced entries without holding or forcing the breath.') + ' Palace bindings, note labels and routine historical comparisons do not add source links.',
      readiness: [row[6], 'I can encode the full current selection before retrieving the exact scheduled earlier entry, with both originals retained.', 'I can distinguish experience, construction and inference. If the scene lacks enough supported links, I choose a simpler selection or explicitly prepare a model rather than inventing links to complete a count.']
    };
    ['stream', 'heart', 'body'].forEach(exercise => { stage[exercise] = buildGuide(stage, exercise); });
    return stage;
  });
  freeze(STAGES);
  function getStage(id) { return STAGES.find(stage => stage.id === id) || STAGES[0]; }
  return Object.freeze({ STAGES, INTRO, BREATH_BACK, ADDRESSES, getStage });
});
