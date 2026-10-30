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

  // Compact teaching shown before the practice controls. Detailed registers remain
  // available for inspection; a named local sample never stands for the full model.
  const SHORT_LESSONS = {
    circle: {
      essence: 'Keep one meaningful relationship between two roles. Remember who relates to whom and how; two objects still make one relationship.',
      stream: 'Ocean contains boat.',
      heart: 'Remembered kindness supports appreciation.',
      body: 'Chair supports torso, as felt in this moment.'
    },
    'half-circle': {
      essence: 'Keep two distinct relationships between the same roles. Reversing the wording of one meaning does not create another.',
      stream: 'Ocean contains boat; boat enables passage across ocean.',
      heart: 'Remembered kindness supports appreciation; appreciation gives that memory personal significance.',
      body: 'Chair supports torso; chair also restricts its movement.'
    },
    triangle: {
      essence: 'Connect three roles with three meaningful relationships. State the closing link explicitly; the first two do not prove it.',
      stream: 'Ocean contains boat; boat enables fisher; fisher depends on ocean.',
      heart: 'Kindness memory supports appreciation; appreciation values friend; memory represents the friend’s kindness.',
      body: 'Chair supports torso; torso contains felt pressure; pressure registers contact with chair.'
    },
    square: {
      essence: 'Keep four roles connected by four relationships in a closed cycle. Preserve each meaning, including the link back to the start.',
      stream: 'Ocean contains boat; boat enables fisher; fisher supplies village; village depends on ocean.',
      heart: 'Kindness memory supports appreciation; appreciation expresses care; care values friend; memory represents the friend’s kindness.',
      body: 'Chair supports torso; torso contains pressure; pressure informs support judgment; that judgment concerns chair.'
    },
    pentagon: {
      essence: 'Separate another role within the cycle and preserve all five relationships. Count the actual links, without retaining an extra shortcut.',
      stream: 'Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village depends on ocean.',
      heart: 'Kindness memory supports appreciation; appreciation expresses care; care motivates a wish; the wish concerns friend’s wellbeing; memory represents friend’s kindness.',
      body: 'Chair supports torso; torso contains pressure; pressure informs description; description supports support judgment; that judgment concerns chair.'
    },
    hexagon: {
      essence: 'Connect a context or constraint within a six-link cycle. Name how it relates to both neighbours, keeping every earlier role distinct.',
      stream: 'Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village sets quota; quota constrains ocean extraction.',
      heart: 'Memory supports appreciation; appreciation expresses care; care motivates a wish; the wish concerns friend’s wellbeing; friend belongs to context; context gives memory meaning.',
      body: 'Chair supports torso; torso contains pressure; pressure informs description; description supports judgment; judgment is interpreted within context; context includes chair as support.'
    },
    heptagon: {
      essence: 'Distinguish another role and its two connections within a seven-link cycle. Keep agency, experience and interpretation separate as the structure grows.',
      stream: 'Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village authorises council; council sets quota; quota constrains ocean extraction.',
      heart: 'Memory supports appreciation; appreciation expresses care; care motivates a wish; the wish concerns friend’s wellbeing; friend belongs to context; context informs interpretation; interpretation frames memory.',
      body: 'Chair supports torso; torso contains pressure; pressure informs description; description supports judgment; judgment is compared with expected support; expectation is shaped by context; context includes chair.'
    },
    octagon: {
      essence: 'Keep eight relationships connected while distinguishing experience from its representation, expectation or interpretation. Preserve uncertainty instead of making the model seem complete.',
      stream: 'Ocean contains boat; boat enables fisher; fisher harvests catch; catch nourishes village; village authorises council; council sets quota; quota accords with stock estimate; estimate represents ocean stock.',
      heart: 'Memory supports appreciation; appreciation expresses care; care motivates a wish; the wish concerns friend’s wellbeing; friend belongs to context; context informs interpretation; interpretation acknowledges uncertainty; uncertainty limits memory claims.',
      body: 'Chair supports torso; torso contains pressure; pressure draws attention; attention selects description; description informs judgment; judgment is compared with expectation; context shapes expectation; context includes chair.'
    },
    prism: {
      essence: 'Join two complete three-link systems with three explicit bridges: nine relationships. Name what each bridge preserves or contrasts.',
      stream: 'Ocean contains boat; boat enables fisher; fisher depends on ocean. Forest contains path; path enables walker; walker depends on forest. Bridge ocean–forest as environments, boat–path as access, fisher–walker as dependent agents.',
      heart: 'Kindness memory supports appreciation; appreciation values friend; memory represents friend’s kindness. Pet memory supports fondness; fondness values pet; pet memory represents pet. Bridge the memories as representations, the feelings as valuing, and friend–pet as care recipients.',
      body: 'Chair supports torso; torso contains pressure; pressure registers chair contact. Floor supports feet; feet contain sole sensation; sensation registers floor contact. Bridge chair–floor as supports, torso–feet as supported regions, pressure–sensation as contact signals.'
    },
    cube: {
      essence: 'Join two complete four-link cycles with four role bridges: twelve relationships. Preserve each system and the limits of their correspondence.',
      stream: 'Ocean contains boat; boat enables fisher; fisher supplies village; village depends on ocean. Land contains irrigation; irrigation enables grower; grower supplies town; town depends on land. Bridge environments, work infrastructure, producers and dependent communities.',
      heart: 'Memory supports appreciation; appreciation expresses care; care values friend; memory represents friend’s kindness. Pet memory supports fondness; fondness expresses animal care; animal care values pet; pet memory represents pet. Bridge representations, valuing feelings, care and recipients.',
      body: 'Chair supports torso; torso contains pressure; pressure informs support judgment; judgment concerns chair. Floor supports feet; feet contain sole sensation; sensation informs footing judgment; judgment concerns floor. Bridge supporting surfaces, supported regions, contact signals and support interpretations.'
    },
    dodecahedron: {
      essence: 'Connect shared pentagonal cycles into thirty relationships. Keep shared roles consistent and all links recoverable; one local patch is only part of the model.',
      stream: 'Local sample: tank supplies watering system; watering system sustains garden; garden yields produce. Recover these within the full thirty-link cooperative model.',
      heart: 'Local sample: care intention guides heart attention; attention notices a felt response; response informs a meaning hypothesis. Recover these within the full thirty-link practice model.',
      body: 'Local sample: mapping intention selects a bodily episode; episode grounds sensation description; description constrains a provisional emotion name. Recover these within the full thirty-link mapping model.'
    },
    icosahedron: {
      essence: 'Connect shared triads into thirty relationships, organised differently from the Dodecahedron. Keep requirements, intentions and achieved results distinguishable.',
      stream: 'Local triad: safety shapes accessibility; safety sets vessel-design requirements; accessibility sets vessel-design requirements. Keep this triad within the full thirty-link ferry model.',
      heart: 'Local triad: gentleness limits continuity’s effort; gentleness forbids forcing a felt response; continuity allows that response to fluctuate. Keep all thirty practice relationships recoverable.',
      body: 'Local triad: specificity makes uncertainty precise; specificity constrains the sensation record; uncertainty qualifies that record. Keep all thirty mapping relationships recoverable.'
    },
    geodesic: {
      essence: 'Replace direct links with named mediators: sixty mediated links plus sixty compatibility requirements. Check their shared connections; compatibility remains a requirement until established.',
      stream: 'Local sample: service brief states safety commitment; that commitment defines the safety target. Check its compatibility with the access commitment within the full 120-link ferry model.',
      heart: 'Local sample: gentleness establishes a no-forcing rule; that rule does not demand a particular feeling. Check its compatibility with fluctuation allowance within the full 120-link practice model.',
      body: 'Local sample: uncertainty supplies a sensation uncertainty marker; that marker qualifies the sensation record. Check its compatibility with descriptive precision within the full 120-link mapping model.'
    },
    sphere: {
      essence: 'Enter the same complete 120-link network through different roles. Keep its relationships, conflicts and limits recoverable; revise without erasing earlier versions.',
      stream: 'Local entry: safety commitment defines the safety target. Enter the same ferry model through accessibility next; recover all 120 links and locate any conflicting requirements.',
      heart: 'Local entry: a no-forcing rule does not demand a particular feeling. Enter the same practice model through sincerity next; recover all 120 links and retain any unresolved tension.',
      body: 'Local entry: a sensation uncertainty marker qualifies the sensation record. Enter the same mapping model through specificity next; recover all 120 links without converting uncertainty into certainty.'
    }
  };

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

  // Teaching follows the pacer's phase, not its cycle count: a timed breath
  // never commits an entry, advances an address or changes a return target.
  const INHALE_CUES = {
    circle: 'Select two roles and one meaning linking them.',
    'half-circle': 'Hold two distinct meanings between the same two roles; reversing one link does not add another.',
    triangle: 'Connect three roles; name all three links, including the closing one.',
    square: 'Connect four roles in a closed cycle; name each of its four links.',
    pentagon: 'Connect five roles in a closed cycle; name all five links without adding a shortcut.',
    hexagon: 'Include a context or constraint; name its two connections within the six-link cycle.',
    heptagon: 'Distinguish seven roles; name each meaningful link around the complete seven-link cycle.',
    octagon: 'Connect eight roles in an eight-link cycle; distinguish any representation from what it represents.',
    prism: 'Join two complete three-link triangles with three explicit correspondences or contrasts: nine links.',
    cube: 'Join two complete four-link cycles with four explicit role bridges: twelve links.',
    dodecahedron: 'Hold all thirty links; follow shared pentagons without counting a shared link twice.',
    icosahedron: 'Hold all thirty links; follow shared triangles and distinguish aims from achieved results.',
    geodesic: 'Replace thirty direct links with sixty links through named mediators; add sixty compatibility requirements.',
    sphere: 'Enter the same 120-link whole through another role; keep every link recoverable.'
  };

  function phaseCues(stage, exercise) {
    let example;
    if (stage.relationCount <= 4) example = SHORT_LESSONS[stage.id][exercise];
    else if (stage.relationCount <= 8) example = {
      stream: 'Start: ocean contains boat; boat enables fisher. Complete the cycle.',
      heart: 'Start: memory supports appreciation; appreciation expresses care. Complete the cycle.',
      body: 'Start: chair supports torso; torso contains pressure. Complete the cycle.'
    }[exercise];
    else if (stage.relationCount < 30) example = {
      stream: stage.id === 'prism' ? 'Try ocean / boat / fisher and forest / path / walker.' : 'Try fishing and cultivation: environments, infrastructure, producers and communities.',
      heart: 'Try two systems of care: memories of a friend and a pet.',
      body: 'Try two supports: chair / torso and floor / feet.'
    }[exercise];
    else example = 'Learn the full example below; a local part is not the whole. Take extra breaths as needed.';
    return {
      inhale: INHALE_CUES[stage.id],
      exhale: 'Picture this ' + (stage.relationCount === 1 ? 'relationship' : 'whole model') + ' at a new home location. Then recall the previous entry, compare meanings, and append any correction. Keep both originals.',
      example
    };
  }

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
      cues: phaseCues(stage, exercise),
      shortExample: SHORT_LESSONS[stage.id][exercise],
      notice: EXERCISE_CONTEXT[exercise] + ' On the inhale, select ' + (stage.relationCount === 1 ? 'one complete meaningful relationship' : 'the full declared ' + stage.relationCount + '-link organisation') + '. On the exhale, encode it at a distinct home-palace address before deliberately seeking the earlier target. If fewer links are available, encode an honest partial selection with its actual count and uncertainty. That entry may support a return without completing the intended shape; do not invent the missing links.',
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
      essence: SHORT_LESSONS[row[0]].essence,
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

