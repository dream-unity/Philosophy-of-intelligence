(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FormShapePractice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // These are teaching interpretations of the site's symbolic shape progression.
  // They do not define measured cognitive capacities or physiological outcomes.
  const INTRO = 'Each shape adds a way of organising experience. Practise its relation through both exercises, using your own observations. The shape is a teaching scaffold; the timer does not assess your understanding.';
  const BREATH_BACK = 'Notice what is present. At a comfortable moment, recall an earlier observation before looking at its note, then compare and revise. One return may take several natural breaths. N counts committed observations, not breaths or seconds. Notes are optional: you can do this mentally, but an unaided recollection is not an independently verified original.';

  const STAGES = [
    {
      id: 'circle', name: 'Circle', verb: 'Notice', defaultLag: 1,
      theory: 'Begin with one relation: attention returning to one chosen feature. Describe what is present before explaining what it means. A faint sensation, no clear sensation, or a wandering mind can all be noticed accurately.',
      heart: {
        notice: 'Place attention gently around the heart area. Choose one feature of your experience: warmth, pressure, movement, or the absence of a clear sensation. Let the source exercise guide breathing and sincere warmth without requiring either to feel a particular way.',
        recall: 'At a later comfortable moment, remember the one feature you chose. If you made a note, recall before revealing it; otherwise acknowledge that this is your present memory of it.',
        relate: 'Return to that same feature now. Describe it simply: still noticeable, changed, or unclear. Do not turn a subtle feeling into a claim about heart function.',
        revise: 'If you drifted to another feature or added an explanation, name that and return to the original feature. The return itself is the practice.'
      },
      body: {
        notice: 'Follow the current mapping prompt and select one concrete feature: a location, a texture, a degree of intensity, or no clear sensation. Keep the description close to what you actually notice.',
        recall: 'Before consulting your note, remember that one feature from the earlier observation. Uncertainty is a useful part of the recollection.',
        relate: 'Notice the same feature in the present body. Say whether it seems similar, different, or uncertain; you do not need to name an emotion.',
        revise: 'If an interpretation replaced the sensation, separate the two and return to describing the sensation. Do not force a feeling to appear.'
      },
      readiness: ['I can choose one feature and return to it after attention wanders.', 'I can describe an observation without needing to explain it.', 'I have tried this return in both exercises and can recognise uncertainty.']
    },
    {
      id: 'half-circle', name: 'Half-circle', verb: 'Bind', defaultLag: 1,
      theory: 'Coordinate two elements: an observation and its address. Give the observation a brief label and place that label at a familiar mental location. The memory address helps retrieval; it is distinct from the bodily location of a sensation.',
      heart: {
        notice: 'Give one actual heart-area observation a short label. Place the label at a familiar mental address, such as your doorway. Keep that address separate from where you feel the sensation in your body.',
        recall: 'Return to the mental address and retrieve the observation attached to it before revealing a note. Recall the feature itself, not just the label.',
        relate: 'Check that the label still points to that particular earlier observation. Compare it with the present experience without replacing the earlier one.',
        revise: 'If two observations share an address and become confused, distinguish their labels or use different addresses. Keep the original record unchanged.'
      },
      body: {
        notice: 'Name one sensation briefly and notice its bodily location. Assign its label to a familiar mental address; the memory location and the bodily location serve different purposes.',
        recall: 'Use the mental address to retrieve the sensation and its bodily location before consulting any note.',
        relate: 'Connect the retrieved label to the correct sensation. Check whether you have recalled the same body area and quality, rather than a similar sensation elsewhere.',
        revise: 'Repair a mistaken label or address explicitly. If the sensation moved, record that as a new observation rather than moving the old record.'
      },
      readiness: ['I can retrieve an observation through its label and mental address.', 'I can distinguish a memory address from the bodily location being described.', 'I can keep the earlier observation separate from the present one in both exercises.']
    },
    {
      id: 'triangle', name: 'Triangle', verb: 'Connect', defaultLag: 1,
      theory: 'Coordinate three terms: the present observation, an earlier observation, and a named relation between them. Integrate them by comparing one explicit dimension. Keep the direction clear: what changed from then to now?',
      heart: {
        notice: 'Choose one dimension of your present experience, such as the felt warmth around the heart area or how steadily attention returns there. Describe only what is accessible.',
        recall: 'Recall the earlier observation on that same dimension before revealing it. Keep the remembered description separate from what you feel now.',
        relate: 'Connect then to now: what seems similar, stronger, softer, steadier, or unclear on the chosen dimension? A change in experience does not establish its cause.',
        revise: 'If the note differs from your recollection, keep both accounts and correct the comparison using the original. If there is no note, leave the memory check provisional.'
      },
      body: {
        notice: 'Choose one mapping dimension for a particular sensation, such as location, quality, or intensity. Describe that dimension before moving to an interpretation.',
        recall: 'Recall the earlier description of the same sensation and dimension before looking at its note.',
        relate: 'Name the relation from the earlier description to the present one. Compare location with location or quality with quality, rather than treating different dimensions as interchangeable.',
        revise: 'If you compared unlike dimensions or a different sensation, identify the mismatch and make a narrower comparison. It is acceptable for the relation to remain unclear.'
      },
      readiness: ['I can keep the present observation, earlier observation, and their relation distinct.', 'I can name the comparison dimension and its direction.', 'I can correct a comparison when the original differs from my recollection in either exercise.']
    },
    {
      id: 'square', name: 'Square', verb: 'Return', defaultLag: 1,
      theory: 'Add a fourth term: the earlier observation’s position in the stream. Coordinate the current observation, the retrieved observation, their relation, and the exact return position. N-back means N committed observations back; breathing continues freely while you work.',
      heart: {
        notice: 'Make one clear observation in the heart exercise and commit it when ready. Choose a return distance you can manage; there is no need to commit a new observation on every breath.',
        recall: 'Count back exactly N committed observations and recall that record before revealing it. Until N earlier observations exist, simply build the history.',
        relate: 'First check that you retrieved the right moment. Then compare the same chosen feature with the present experience; resemblance alone does not identify the correct record.',
        revise: 'Distinguish a wrong return position from an inaccurate recollection or comparison. Repair the specific error without altering the original observation.'
      },
      body: {
        notice: 'Commit an observation when a body feature is clear enough to describe. The 30-second mapping prompt changes independently of this observation count.',
        recall: 'Recall exactly N committed observations back, even if that record concerns an earlier mapping dimension. Do not substitute the most similar sensation.',
        relate: 'Check the record’s identity before comparing. If the earlier and current records concern different dimensions, state that difference and choose an explicit common dimension if one exists.',
        revise: 'If you returned to the wrong position, repair the temporal link first. Leave incomparable features incomparable instead of inventing a match.'
      },
      readiness: ['I can return to the intended observation without using breath cycles as the counter.', 'I can separate record identity from a comparison of its features.', 'I can maintain a comfortable return distance in both exercises before choosing a longer one.']
    },
    {
      id: 'pentagon', name: 'Pentagon', verb: 'Contextualise', defaultLag: 1,
      theory: 'Add the setting in which a relation holds. A comparison can change with attention, posture, the current instruction, or other conditions. Describe the relevant context and distinguish an observed association from an explanation.',
      heart: {
        notice: 'Notice the heart-area experience together with one contextual fact: which teaching phase you are in, your posture, or whether you are following your own rhythm or the optional pacer.',
        recall: 'Retrieve an earlier observation and its context before viewing the record. Do not assume that the same instruction or posture was present.',
        relate: 'Compare both the experience and the context. Ask whether the comparison remains fair when the instruction or setting differs; mark missing context as unknown.',
        revise: 'Narrow a conclusion that ignored a contextual difference. Record a possible influence as a possibility, not proof that it caused the feeling.'
      },
      body: {
        notice: 'Describe a body sensation and the context of noticing it, including the current mapping dimension. Notice whether attention has just moved to this area.',
        recall: 'Recall the earlier sensation together with the conditions in which you noticed it. Use a note to check the context if available.',
        relate: 'Ask whether a reported difference reflects a comparable observation or a change in what you attended to. Sensations may change, and descriptions may also become more detailed.',
        revise: 'Keep both possibilities when the evidence cannot distinguish them. Add the missing context to future observations without rewriting the old one.'
      },
      readiness: ['I can name a context that matters to a comparison.', 'I can distinguish changed experience from changed attention or description.', 'I can keep an explanation provisional when context is missing in either exercise.']
    },
    {
      id: 'hexagon', name: 'Hexagon', verb: 'Organise', defaultLag: 1,
      theory: 'Organise an episode by its roles: cue, response, and observed result. Preserve the sequence across several observations. Something happening after a response does not, by itself, show that the response caused it.',
      heart: {
        notice: 'Notice a small episode: a cue such as wandering attention, your response such as returning gently to the heart area, and what you observe afterward. Do not force a result.',
        recall: 'Retrieve the earlier parts of the episode before consulting their notes. Keep the initiating cue, your action, and the later observation in order.',
        relate: 'Connect cue to response to observed result. Separate what you chose to do from what actually followed, including no noticeable change.',
        revise: 'If the expected result did not occur, preserve that outcome. Replace a causal claim with a description of the sequence unless stronger evidence is available.'
      },
      body: {
        notice: 'Notice what prompted attention to a body area, how you responded, and what you sensed afterward. Merely naming a sensation is a response; changing it is not required.',
        recall: 'Recall the episode’s cue and response before revealing earlier notes, then identify the actual later observation.',
        relate: 'Arrange the three roles without letting a possible emotion name stand in for an observed result. Note when a role is missing or unclear.',
        revise: 'Repair a swapped role or missing step. Keep timing and causation separate, especially when attention itself may have changed the description.'
      },
      readiness: ['I can describe an episode using cue, response, and observed result.', 'I can distinguish an intended result from what actually followed.', 'I can preserve an uncertain or unchanged outcome in both exercises.']
    },
    {
      id: 'prism', name: 'Triangular prism', verb: 'Map', defaultLag: 1,
      theory: 'Connect two three-role episodes by what their parts do. Map cue to cue, response to response, and result to result. A useful analogy also names a difference that limits it.',
      heart: {
        notice: 'Form a current cue–response–result episode in the heart exercise. Keep the details concrete, including an absent or uncertain result.',
        recall: 'Retrieve another episode from this exercise or the body exercise. Reconstruct each of its three roles before reviewing its notes.',
        relate: 'Map corresponding roles across the two episodes. Returning attention may play a similar role even when the sensations themselves differ.',
        revise: 'Name a difference in context, response, or result that could break the analogy. Keep the episodes separate rather than merging their details.'
      },
      body: {
        notice: 'Describe one body-mapping episode with its cue, response, and observed result. Do not identify an episode solely by an emotion label.',
        recall: 'Recall a second episode and its roles before revealing the earlier record. It may come from a different body area or the heart exercise.',
        relate: 'Compare roles, not just similar words or sensations. Ask whether each initiating condition, response, and result actually corresponds.',
        revise: 'Retain one meaningful mismatch. If a role has no counterpart, use a partial analogy and leave that part unmapped.'
      },
      readiness: ['I can reconstruct two episodes without mixing their sources.', 'I can map roles rather than relying only on surface similarity.', 'I can state a limit to an analogy using experiences from both exercises.']
    },
    {
      id: 'heptagon', name: 'Heptagon', verb: 'Abstract', defaultLag: 1,
      theory: 'Express a recurring relation as a provisional function: under a stated condition, a response may be followed by a stated effect. Include exceptions and a boundary. A personal pattern is a hypothesis, not a universal rule.',
      heart: {
        notice: 'Notice a current episode and the conditions in which it occurs. Keep the response gentle and within the ordinary exercise; do not manipulate breathing to produce a desired effect.',
        recall: 'Retrieve earlier relevant episodes, including one that did not fit the pattern if available. Check their original conditions and results.',
        relate: 'Form a bounded statement: when this condition is present, this response may be followed by this observed effect. Say when the statement would not apply.',
        revise: 'If an exception appears, narrow or withdraw the function. Do not turn a repeated feeling into a claim about measured heart coherence.'
      },
      body: {
        notice: 'Describe a body-mapping episode and its conditions without assigning a fixed emotional meaning to the sensation.',
        recall: 'Retrieve relevant earlier episodes, looking for differences as well as repetitions. Check whether the same response and result were actually recorded.',
        relate: 'State a tentative condition–response–effect relation about your practice. Specify a boundary, such as a context or kind of sensation for which you have no evidence.',
        revise: 'Preserve an exception instead of relabelling it to fit. A recurring body pattern may have several meanings, or no clear emotional meaning.'
      },
      readiness: ['I can state a tentative function with an explicit condition and boundary.', 'I can look for exceptions instead of keeping only confirming episodes.', 'I can revise a personal pattern after practising it in both exercises.']
    },
    {
      id: 'octagon', name: 'Octagon', verb: 'Transfer', defaultLag: 1,
      theory: 'Carry a bounded function to another setting. Map the roles, check the conditions, and make a modest prediction before observing the result. Transfer is something to examine, not something guaranteed by similarity.',
      heart: {
        notice: 'Choose a tentative function from body mapping or an earlier heart session. Identify the present conditions before applying it here.',
        recall: 'Retrieve the original function, its supporting episode, and its boundary before revealing your notes. Keep the source setting explicit.',
        relate: 'Map its roles to the heart exercise and predict a small observable result. Use only the ordinary exercise; the response must remain comfortable.',
        revise: 'Compare the prediction with what followed. Record where the transfer held, failed, or remained uncertain without changing the original prediction.'
      },
      body: {
        notice: 'Choose a tentative function from the heart exercise or another mapping context. Check the present sensation and context before carrying it across.',
        recall: 'Recall the function’s condition, response, expected effect, and limits, then consult the earlier record if one exists.',
        relate: 'Map the roles to this body-mapping situation. State what you expect to notice and a difference that would make the analogy unsuitable.',
        revise: 'Observe without forcing the predicted sensation. Keep a failed or inconclusive transfer as useful evidence about the function’s scope.'
      },
      readiness: ['I can map a function into another setting and check its conditions.', 'I can state a modest prediction before seeing the result.', 'I can retain a failed or uncertain transfer between the two exercises.']
    },
    {
      id: 'cube', name: 'Cube', verb: 'Coordinate', defaultLag: 1,
      theory: 'Hold two contextual accounts, each with four distinct parts: belief or expectation, goal, action, and observed outcome. Compare matching roles while preserving the source of each account. An expectation is not evidence that its outcome occurred.',
      heart: {
        notice: 'Describe the current account: what you expected, what you intended to practise, what you actually did, and what you observed. Leave an unknown part unknown.',
        recall: 'Retrieve a second account from a prior heart or body session. Reconstruct all four parts before consulting its record.',
        relate: 'Compare expectation with expectation, goal with goal, action with action, and outcome with outcome. Notice where an unchanged goal accompanied a different result.',
        revise: 'Correct any place where a hoped-for feeling became an assumed outcome. Preserve the two accounts and their different contexts.'
      },
      body: {
        notice: 'Separate what you expected a sensation to mean, your aim in mapping it, your actual attention or action, and what you observed afterward.',
        recall: 'Recall a second four-part account, perhaps from the heart exercise, before checking its notes. Do not fill a missing observation with its expectation.',
        relate: 'Map the corresponding roles while keeping each sensation and setting attached to its own account. Compare results without assuming identical inner states.',
        revise: 'If expectation shaped your description, record that uncertainty. Distinguish the body observation from the meaning you gave it.'
      },
      readiness: ['I can keep expectation, goal, action, and outcome distinct within an account.', 'I can compare two accounts while preserving their contexts and sources.', 'I can recognise when expectation has been mistaken for observation in either exercise.']
    },
    {
      id: 'dodecahedron', name: 'Dodecahedron', verb: 'Retrieve', defaultLag: 1,
      theory: 'Organise several provisional functions so their conditions can guide retrieval. Select a function because it fits the present situation, not because it is familiar or appealing. Keep its supporting observations, exceptions, and limits connected.',
      heart: {
        notice: 'Describe the present heart-practice situation before choosing a response. Identify the condition that matters to your current aim.',
        recall: 'Retrieve a relevant function from your earlier heart or body practice, together with its evidence and limits. If none fits, say so rather than inventing a fit.',
        relate: 'Explain why this function is more appropriate here than another you know. Apply it only within its stated scope and note the actual result.',
        revise: 'Update the function’s retrieval cue or boundary when the result reveals a mismatch. Preserve the observations from which it was formed.'
      },
      body: {
        notice: 'Name the current mapping context and what is uncertain. The same sensation label can occur in different situations.',
        recall: 'Retrieve a function whose conditions match this situation, including an exception if one has been recorded. Do not retrieve solely by an emotion name.',
        relate: 'Connect the chosen function to the present conditions and compare it with a plausible alternative. An inapplicable function can remain useful elsewhere.',
        revise: 'Refine the index or condition if it retrieved the wrong function. Keep “no suitable function yet” available as an honest conclusion.'
      },
      readiness: ['I can retrieve a function by its conditions and remember its limits.', 'I can distinguish a suitable function from a merely familiar one.', 'I can leave a situation unresolved when no stored function fits either exercise.']
    },
    {
      id: 'icosahedron', name: 'Icosahedron', verb: 'Differentiate', defaultLag: 1,
      theory: 'Hold competing explanations of the same observation. Identify what future observation could distinguish them before deciding. If both accounts fit the available evidence, retain the uncertainty.',
      heart: {
        notice: 'Describe a change during heart practice without explaining it yet. Keep felt warmth, ease, or steadiness distinct from a physiological measurement.',
        recall: 'Retrieve the relevant original observations and contexts before checking them. Separate what was noticed from the interpretation added later.',
        relate: 'Offer two plausible accounts, such as changed sensation and changed attention. Name a later observation that might distinguish them during ordinary comfortable practice.',
        revise: 'Use the later evidence to narrow, retain, or reject an account. If your observations cannot separate the accounts, keep both provisional.'
      },
      body: {
        notice: 'Describe a sensation and any tentative meaning-tone separately. A location or texture does not identify a unique emotion.',
        recall: 'Recall earlier observations that support or challenge the possible meanings, then compare with their original notes if available.',
        relate: 'Keep at least two possible accounts, including a non-emotional one where appropriate. State what ordinary observation would help distinguish them without provoking distress.',
        revise: 'Revise only as far as the evidence supports. An ambiguous sensation can remain ambiguous; a confident label is not required.'
      },
      readiness: ['I can hold competing explanations without deciding prematurely.', 'I can name evidence that would distinguish them before looking for it.', 'I can retain uncertainty when observations from either exercise do not decide the issue.']
    },
    {
      id: 'geodesic', name: 'Geodesic sphere', verb: 'Repair', defaultLag: 1,
      theory: 'Examine how you built the relation. Check the selected observation, return position, recalled detail, role mapping, context, and scope. Repair the particular operation that failed while preserving the original evidence.',
      heart: {
        notice: 'Notice a point where a conclusion about the heart exercise feels unclear or inconsistent. Start with the observations that led to it.',
        recall: 'Reconstruct the path from the earlier observation through recollection and comparison to the conclusion before revealing your records.',
        relate: 'Check each link: correct earlier moment, faithful recollection, comparable feature, relevant context, and appropriately bounded conclusion. Identify the weakest supported link.',
        revise: 'Repair that specific link and repeat a simpler comparison if useful. A reasoning error does not require changing or intensifying the breathing exercise.'
      },
      body: {
        notice: 'Choose one unclear body-mapping conclusion and identify its original sensation description. Keep the description separate from its later interpretation.',
        recall: 'Recall how the mapping dimensions and prior observations entered the conclusion, then inspect the original notes if you have them.',
        relate: 'Look for a changed return target, mixed dimensions, swapped episode roles, missing context, or a meaning assigned too confidently. Name the precise problem.',
        revise: 'Repair only what the evidence warrants. Preserve earlier notes and append the correction so you can see how the understanding changed.'
      },
      readiness: ['I can trace a conclusion back through the operations that produced it.', 'I can identify a specific weak link instead of treating the whole practice as a failure.', 'I can repair a relation while preserving original observations in both exercises.']
    },
    {
      id: 'sphere', name: 'Sphere', verb: 'Integrate', defaultLag: 1,
      theory: 'Coordinate the earlier operations flexibly: notice, retrieve, relate, contextualise, map, predict, and revise. Build a bounded model from several episodes, then let later evidence change it. Integration includes knowing when a simpler shape is sufficient.',
      heart: {
        notice: 'Describe the present heart-practice episode and choose the operations it actually needs. Keep the breath comfortable; complexity belongs to the relations you examine.',
        recall: 'Retrieve relevant observations and functions from both exercises, including exceptions. Check sources before treating the recollection as established.',
        relate: 'Connect the episodes into a bounded account of your practice. State one modest prediction, the conditions under which it applies, and what evidence would make you revise it.',
        revise: 'Return later to compare the prediction with observation. Keep what remains supported, change what does not, and use a simpler shape whenever it helps you see clearly.'
      },
      body: {
        notice: 'Describe a current body-mapping episode while keeping sensation, possible meaning, context, and response distinct. Select only the relations needed to understand it.',
        recall: 'Retrieve relevant episodes and functions from heart and body practice. Include observations that resist your preferred account.',
        relate: 'Integrate them into a provisional model with explicit limits. Make a prediction before observing a later episode, and name a result that would challenge the model.',
        revise: 'Append the later evidence and change the model where warranted. Keep an uncertain meaning uncertain, and return to simple noticing when more interpretation adds nothing.'
      },
      readiness: ['I can choose a useful operation without making every observation complicated.', 'I can connect evidence from both exercises while retaining exceptions and limits.', 'I can make a bounded prediction and later revise the model without rewriting its original evidence.']
    }
  ];

  function freeze(value) {
    Object.values(value).forEach(child => {
      if (child && typeof child === 'object') freeze(child);
    });
    return Object.freeze(value);
  }
  freeze(STAGES);
  function getStage(id) { return STAGES.find(stage => stage.id === id) || STAGES[0]; }
  return Object.freeze({ STAGES, INTRO, BREATH_BACK, getStage });
});
