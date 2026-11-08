(() => {
  const qualities = [
    ['upperLeftTip', 'Devotion', 'let yourself care about what you choose to do'],
    ['upperLeftInner', 'Confidence', 'find the feeling of being able to begin'],
    ['topInner', 'Resolve', 'feel a decision settle'],
    ['lowerLeftTip', 'Ambition', 'feel the wish to reach a little further'],
    ['bottomInner', 'Commitment', 'feel your willingness to return to a chosen course'],
    ['upperRightInner', 'Initiation', 'find the moment of readiness just before you begin'],
    ['lowerRightInner', 'Discipline', 'feel ready to repeat a chosen action'],
    ['lowerRightTip', 'Restraint', 'feel the space in which you can pause'],
    ['upperRightTip', 'Patience', 'let yourself stay present while you wait'],
    ['lowerLeftInner', 'Composure', 'feel a little steadiness as you breathe'],
    ['bottomTip', 'Endurance', 'find a degree of effort you could sustain'],
    ['topTip', 'Authorship', 'feel that the next choice is yours']
  ].map(([id, label, invitation], index) => Object.freeze({id, label, invitation, index}));

  const stageRows = [
    ['circle', 'One quality', 1, 'Bring one quality forward from the heart. Stay with it for a complete inhale and exhale. Move to the next quality on the next inhale.'],
    ['half-circle', 'Two qualities together', 2, 'Bring the two highlighted qualities into the same breath. Keep both present through the exhale. On the next inhale, enter the next pair.'],
    ['triangle', 'A three-quality blend', 3, 'Feel three qualities together. Notice what the third contributes to the other two, then change to the next trio on the next inhale.'],
    ['square', 'A four-quality blend', 4, 'Invite four qualities into one felt state. Keep each recognisable as you breathe out. A new combination begins on the next inhale.'],
    ['pentagon', 'Five qualities in balance', 5, 'Hold five qualities together for the full breath. Give the quieter qualities as much attention as the ones you find easily. Change blends on the next inhale.'],
    ['hexagon', 'Give one quality more time', 5, 'Keep five qualities present. Let attention touch each one during the inhale and again during the exhale. Linger a little longer on the lead. A different quality leads the next breath.'],
    ['heptagon', 'Expand and gather', 5, 'Let the lead quality spread on the inhale and gather back towards the heart on the exhale. Keep the other four present. Try the same movement with a different lead on the next breath.'],
    ['octagon', 'Pass the lead', 5, 'Expand one quality as you inhale. As you exhale, let it soften while a second quality comes forward. Within the same blend, begin the next breath through the quality that came forward.'],
    ['prism', 'Expand a pair', 5, 'Bring two qualities forward together on the inhale. Let them soften together on the exhale while the other three hold steady. The pair shifts by one place on the next breath.'],
    ['cube', 'Balance two pairs', 5, 'Keep one quality steady. On the inhale, bring one pair forward while the other pair softens. Reverse their balance on the exhale, keeping all five within reach.'],
    ['dodecahedron', 'Expand in layers', 5, 'Keep the lead steady at the heart. Widen into one pair during the first half of the inhale and the other pair during the second. Gather them back in reverse order on the exhale.'],
    ['icosahedron', 'Hold two rhythms', 5, 'Let one quality grow throughout the inhale and soften throughout the exhale. Within each of those phases, let a second quality swell and ease once. Keep the other three steady.'],
    ['geodesic', 'Tune a small change', 5, 'Keep one quality steady as a reference. Bring a second forward by two small degrees on the inhale. On the exhale, return by the same two degrees. Find the smallest shift you can recognise.'],
    ['sphere', 'Embody the whole', 5, 'Use one quality to enter the blend. Widen into all five on the inhale, then gather them into one felt sense of agency on the exhale. Notice which choice feels available. Recover the whole through a different quality on the next breath.']
  ];
  const stages = Object.fromEntries(stageRows.map(([id, title, count, prompt], index) => [
    id, Object.freeze({id, level:index + 1, title, count, prompt})
  ]));
  const canonical = qualities.map(quality => quality.id);
  const byId = new Map(qualities.map(quality => [quality.id, quality]));

  function asId(value) {
    if (Number.isInteger(value)) return qualities[value]?.id;
    return byId.has(value) ? value : undefined;
  }

  function orderedIds(order, start, count) {
    let ids = Array.isArray(order) ? [...new Set(order.map(asId).filter(Boolean))] : [];
    if (ids.length === 0) ids = [...canonical];
    if (ids.length < count) {
      ids.push(...canonical.filter(id => !ids.includes(id)).slice(0, count - ids.length));
    }
    const origin = ids.indexOf(asId(start));
    return origin > 0 ? ids.slice(origin).concat(ids.slice(0, origin)) : ids;
  }

  // A circular shift brings in fresh qualities immediately. After that orbit,
  // take a new spacing between positions until every distinct blend was used.
  const schedules = new Map();
  function combinationSchedule(length, count) {
    const cacheKey = length + '/' + count;
    if (schedules.has(cacheKey)) return schedules.get(cacheKey);
    const schedule = [];
    const visited = new Set();

    function appendOrbit(seed) {
      for (let offset = 0; offset < length; offset++) {
        const shifted = seed.map(position => (position + offset) % length);
        const mask = shifted.reduce((bits, index) => bits | (1 << index), 0);
        if (visited.has(mask)) continue;
        visited.add(mask);
        schedule.push(shifted);
      }
    }
    function choose(next, picked) {
      if (picked.length === count) {
        appendOrbit(picked);
        return;
      }
      const remaining = count - picked.length;
      for (let index = next; index <= length - remaining; index++) choose(index + 1, [...picked, index]);
    }
    choose(0, []);
    schedules.set(cacheKey, schedule);
    return schedule;
  }

  const clip = number => Math.min(1, Math.max(0, number));
  const smooth = fraction => {
    const t = clip(fraction);
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, fraction) => a + (b - a) * smooth(fraction);
  const list = labels => {
    if (labels.length === 1) return labels[0];
    return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  };

  function frame(options = {}) {
    const stage = Object.hasOwn(stages, options.stageId) ? stages[options.stageId] : stages.circle;
    const order = orderedIds(options.order, options.start, stage.count);
    const breath = Number.isSafeInteger(options.breath) ? Math.max(0, options.breath) : 0;
    const phase = options.phase === 'exhale' ? 'exhale' : 'inhale';
    const inhale = phase === 'inhale';
    const p = Number.isFinite(options.progress) ? clip(options.progress) : 0;
    const schedule = combinationSchedule(order.length, stage.count);
    const block = stage.level < 6 ? breath : Math.floor(breath / 5);
    const ids = schedule[block % schedule.length].map(position => order[position]);
    const slot = breath % stage.count;
    const members = ids.map(id => ({...byId.get(id), emphasis:0.65, role:'together'}));

    // a–e are consecutive qualities in the current five. They rotate around
    // the same blend for five breaths before the next blend enters.
    const around = n => members[(slot + n) % members.length];
    const [a, b, c, d, e] = [0, 1, 2, 3, 4].map(around);
    const set = (member, value) => { member.emphasis = clip(value); };
    const foreground = (...group) => {
      members.forEach(member => { member.role = group.includes(member) ? 'lead' : 'support'; });
    };
    let cue;
    let phaseCue;
    let focus = null;
    if (stage.level <= 5) {
      if (stage.count === 1) {
        foreground(a);
        set(a, 1);
        phaseCue = a.label;
        cue = inhale ? 'Begin at the heart and ' + a.invitation + '.' :
          'Stay with ' + a.label.toLowerCase() + ' through the end of the exhale.';
      } else {
        phaseCue = list(members.map(member => member.label));
        members.forEach(member => set(member, 1));
        cue = inhale ? 'Bring ' + phaseCue.toLowerCase() + ' forward together.' :
          'Keep the blend present as you breathe out. Can you still feel each quality?';
      }
    } else if (stage.level === 6) {
      // The blend stays present while attention makes a brief pass over it.
      // The lead receives 24% of each phase and each of the others gets 19%.
      const attendedSlot = p < 0.24 ? 0 : Math.min(4, 1 + Math.floor((p - 0.24 + 1e-12) / 0.19));
      const start = attendedSlot === 0 ? 0 : 0.24 + (attendedSlot - 1) * 0.19;
      const duration = attendedSlot === 0 ? 0.24 : 0.19;
      const localProgress = clip((p - start) / duration);
      focus = around(attendedSlot);
      foreground(a);
      set(a, 0.68);
      set(focus, focus.emphasis + 0.25 * Math.sin(Math.PI * localProgress) ** 2);
      phaseCue = focus.label + (focus === a ? ' · longer turn' : '');
      cue = 'Keep all five present as attention passes across them. Linger a little longer on ' + a.label.toLowerCase() + '.';
    } else if (stage.level === 7) {
      foreground(a);
      set(a, mix(0.66, 1, inhale ? p : 1 - p));
      phaseCue = (inhale ? 'Expand ' : 'Gather ') + a.label.toLowerCase();
      cue = inhale ? 'Let ' + a.label.toLowerCase() + ' spread gently from the heart.' :
        'Gather ' + a.label.toLowerCase() + ' towards the heart. Keep the rest of the blend present.';
    } else if (stage.level === 8) {
      const transfer = inhale ? 0 : smooth(p);
      const lastInBlock = slot === 4;
      const nextPositions = schedule[(block + 1) % schedule.length];
      const nextBlockLead = order[nextPositions[0]];
      const carry = lastInBlock ? members.find(member => member.id === nextBlockLead && member !== a) : b;
      const receiver = carry || b;
      set(a, 0.9 + (inhale ? 0.1 * Math.sin(Math.PI * p) : -0.25 * transfer));
      set(receiver, 0.65 + 0.25 * transfer);
      foreground(transfer < 0.5 ? a : receiver);
      phaseCue = inhale ? a.label + ' leads' : a.label + ' → ' + receiver.label;
      cue = inhale ? 'Let ' + a.label.toLowerCase() + ' fill the foreground of this blend.' :
        'Ease ' + a.label.toLowerCase() + ' back as ' + receiver.label.toLowerCase() + ' comes forward.';
      if (!inhale && lastInBlock) cue += ' The next inhale opens a fresh blend.';
    } else if (stage.level === 9) {
      foreground(a, b);
      [a, b].forEach(member => set(member, mix(0.65, 1, inhale ? p : 1 - p)));
      phaseCue = list([a.label, b.label]);
      cue = 'Let ' + phaseCue.toLowerCase() + (inhale ? ' expand together.' : ' settle back together.') + ' Keep the other three steady.';
    } else if (stage.level === 10) {
      const balance = inhale ? smooth(p) : 1 - smooth(p);
      [a, b].forEach(member => set(member, 0.52 + 0.42 * balance));
      [c, d].forEach(member => set(member, 0.94 - 0.42 * balance));
      foreground(...(balance >= 0.5 ? [a,b] : [c,d]));
      const rising = inhale ? [a,b] : [c,d];
      const easing = inhale ? [c,d] : [a,b];
      phaseCue = list(rising.map(member => member.label)) + ' rising';
      cue = 'Bring ' + list(rising.map(member => member.label.toLowerCase())) + ' forward while ' +
        list(easing.map(member => member.label.toLowerCase())) + ' soften. Keep ' + e.label.toLowerCase() + ' steady.';
    } else if (stage.level === 11) {
      const openness = inhale ? p : 1 - p;
      const inner = smooth(2 * openness);
      const outer = smooth(2 * openness - 1);
      set(a, 0.85);
      [b,c].forEach(member => set(member, 0.5 + 0.42 * inner));
      [d,e].forEach(member => set(member, 0.5 + 0.42 * outer));
      const layer = openness < 0.5 ? [b,c] : [d,e];
      foreground(...layer);
      phaseCue = list(layer.map(member => member.label));
      cue = (inhale ? 'Widen into ' : 'Gently draw in ') + phaseCue.toLowerCase() + '. Keep ' + a.label.toLowerCase() + ' steady at the heart.';
    } else if (stage.level === 12) {
      const slow = inhale ? smooth(p) : 1 - smooth(p);
      const quick = Math.sin(Math.PI * p) ** 2;
      set(a, 0.58 + 0.36 * slow);
      set(b, 0.58 + 0.36 * quick);
      foreground(a, b);
      phaseCue = a.label + ' and ' + b.label;
      cue = 'Let ' + a.label.toLowerCase() + (inhale ? ' widen' : ' soften') + ' over this whole ' + phase +
        '. At the same time, let ' + b.label.toLowerCase() + (p < 0.5 ? ' swell.' : ' ease back.');
    } else if (stage.level === 13) {
      const openness = inhale ? p : 1 - p;
      const first = smooth(openness / 0.35);
      const second = smooth((openness - 0.6) / 0.3);
      set(a, 0.66 + 0.12 * first + 0.12 * second);
      set(b, 0.66);
      foreground(a);
      phaseCue = a.label + ' beside ' + b.label;
      if (openness <= 0.35) {
        cue = inhale ? 'Let ' + a.label.toLowerCase() + ' come forward by the smallest shift you can recognise.' :
          'Ease ' + a.label.toLowerCase() + ' back beside ' + b.label.toLowerCase() + '.';
      } else if (openness < 0.6) {
        cue = 'Hold that shade of ' + a.label.toLowerCase() + '. Use ' + b.label.toLowerCase() + ' as your steady reference.';
      } else {
        cue = inhale ? 'Give ' + a.label.toLowerCase() + ' one more gentle degree of emphasis.' :
          'Begin easing ' + a.label.toLowerCase() + ' back by one small degree.';
      }
    } else {
      // Starting through a different member each breath rehearses recovery of
      // the same whole. Openness is a suggested scope of attention, not arousal.
      const openness = inhale ? smooth(p) : 1 - smooth(p);
      members.forEach(member => set(member, 0.48 + 0.44 * openness));
      if (inhale && p < 0.5) {
        foreground(a);
        set(a, mix(0.9, 0.48 + 0.44 * openness, p * 2));
      }
      phaseCue = inhale ? (p < 0.5 ? 'Enter through ' + a.label : 'All five together') : 'Agency as a whole';
      cue = inhale ? 'Enter through ' + a.label.toLowerCase() + ' and widen to include the whole blend.' :
        'Gather the blend into one felt sense of agency. What small choice is yours now?';
    }
    const leaders = members.filter(member => member.role === 'lead');
    return {
      stage, order, breath, phase, ids,
      indices:members.map(member => member.index), members,
      leadId:leaders[0]?.id ?? null, leadIndex:leaders[0]?.index ?? null,
      leadIds:leaders.map(member => member.id), focusId:focus?.id ?? null, focusIndex:focus?.index ?? null, cue, phaseCue
    };
  }
  window.AgencyPractice = Object.freeze({qualities:Object.freeze(qualities), stages:Object.freeze(stages), frame});
})();
