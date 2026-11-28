// Relational Fluid-Intelligence Core for Trauma Doctor (ALL 80 Reasoning Types).
// Every puzzle locks 4–5 active patients inside genuine comparative, causal, equivalence,
// opposition, ratio, dual-axis, or conditional-shift relations across 4 big, zero-filler cards.
// Mathematically guarantees unique targets (1–2) across Tiers 1–3 AND all Tier 4–6 disputed flips.

import {
  pName,
  formatList,
  uniqueSortedIds,
  pickPlayers,
  fact,
  makeCard,
  buildRivalInfo,
} from './semantic-board.js';

export { pName, formatList, uniqueSortedIds, pickPlayers, fact, makeCard, buildRivalInfo };

function chainStr(ids, op = ' > ') {
  return ids.map(pName).join(op);
}

/**
 * 1. TRANSITIVE ORDER CHAIN PUZZLE (4 big cards, 5 active patients A, B, C, D, E).
 * Links patients indirectly across 4 cards (A > B > C > D > E) with randomized card/fact framing
 * and clean dynamic Tier 4–6 flips that swap adjacent top ranks without ever creating a cycle.
 * mode: 'top1' | 'top2' | 'bottom1' | 'second'
 */
export function buildOrderPuzzle(rng, cfg) {
  const [p0, p1, p2, p3, p4] = pickPlayers(rng, 5);
  // True primary order: p0 > p1 > p2 > p3 > p4
  // Each card carries 2 relational comparisons; flipping Card 0 swaps p0<->p1,
  // flipping Card 1 swaps p1<->p2, flipping Card 2 swaps p2<->p3, flipping Card 3 swaps p3<->p4.
  const gt = cfg.gt; // (x, y) => plain English "X is MORE/FASTER/EARLIER than Y"
  const lt = cfg.lt; // (x, y) => plain English "Y is LESS/SLOWER/LATER than X"
  const eqNote = cfg.extra; // optional (x, y) contextual clinical link

  const cards = [
    makeCard({
      index: 0,
      time: cfg.times?.[0] || '01:05',
      wing: cfg.wings?.[0] || 'Trauma Bay',
      wingIndex: 0,
      label: cfg.labels[0],
      shown: [
        fact(gt(p0, p1), [p0, p1], { tag: 'edge', hi: p0, lo: p1 }),
        fact(lt(p3, p2), [p3, p2], { tag: 'edge', hi: p2, lo: p3 }),
      ],
      alt: [
        fact(gt(p1, p0), [p1, p0], { tag: 'edge', hi: p1, lo: p0 }),
        fact(lt(p3, p2), [p3, p2], { tag: 'edge', hi: p2, lo: p3 }),
      ],
    }),
    makeCard({
      index: 1,
      time: cfg.times?.[1] || '01:12',
      wing: cfg.wings?.[1] || 'Triage Log',
      wingIndex: 1,
      label: cfg.labels[1],
      shown: [
        fact(gt(p1, p2), [p1, p2], { tag: 'edge', hi: p1, lo: p2 }),
        fact(lt(p4, p3), [p4, p3], { tag: 'edge', hi: p3, lo: p4 }),
      ],
      alt: [
        fact(gt(p2, p1), [p2, p1], { tag: 'edge', hi: p2, lo: p1 }),
        fact(lt(p4, p3), [p4, p3], { tag: 'edge', hi: p3, lo: p4 }),
      ],
    }),
    makeCard({
      index: 2,
      time: cfg.times?.[2] || '01:18',
      wing: cfg.wings?.[0] || 'Trauma Bay',
      wingIndex: 0,
      label: cfg.labels[2],
      shown: [
        fact(lt(p2, p0), [p2, p0], { tag: 'edge', hi: p0, lo: p2 }),
        fact(eqNote ? eqNote(p1, p3) : gt(p1, p3), [p1, p3], { tag: 'edge', hi: p1, lo: p3 }),
      ],
      alt: [
        fact(lt(p2, p0), [p2, p0], { tag: 'edge', hi: p0, lo: p2 }),
        fact(gt(p3, p1), [p3, p1], { tag: 'edge', hi: p3, lo: p1 }),
      ],
    }),
    makeCard({
      index: 3,
      time: cfg.times?.[3] || '01:24',
      wing: cfg.wings?.[1] || 'Triage Log',
      wingIndex: 1,
      label: cfg.labels[3],
      shown: [
        fact(gt(p2, p4), [p2, p4], { tag: 'edge', hi: p2, lo: p4 }),
        fact(lt(p4, p1), [p4, p1], { tag: 'edge', hi: p1, lo: p4 }),
      ],
      alt: [
        fact(gt(p4, p2), [p4, p2], { tag: 'edge', hi: p4, lo: p2 }),
        fact(lt(p3, p0), [p3, p0], { tag: 'edge', hi: p0, lo: p3 }),
      ],
    }),
  ];

  const pool = [p0, p1, p2, p3, p4];
  const evaluate = (resolved) => {
    // Score by out-degree / transitive dominance (acyclic check via topological Kahn sort)
    const edges = [];
    for (const c of resolved) {
      for (const f of c.facts) {
        if (f.tag === 'edge' && f.hi && f.lo) edges.push([f.hi, f.lo]);
      }
    }
    // Check acyclicity and build reachability
    const reach = new Map(pool.map((id) => [id, new Set()]));
    for (const [hi, lo] of edges) reach.get(hi)?.add(lo);
    for (const k of pool) {
      for (const i of pool) {
        if (reach.get(i).has(k)) {
          for (const j of reach.get(k)) reach.get(i).add(j);
        }
      }
    }
    // Reject cyclic flip worlds
    for (const id of pool) {
      if (reach.get(id).has(id)) return null;
    }
    const ranked = pool
      .slice()
      .sort((a, b) => reach.get(b).size - reach.get(a).size);
    // Ensure strict uniqueness at the requested slot
    const mode = cfg.mode || 'top1';
    let targets = [];
    if (mode === 'top1') {
      if (reach.get(ranked[0]).size !== 4) return null;
      targets = [ranked[0]];
    } else if (mode === 'top2') {
      if (reach.get(ranked[0]).size !== 4 || reach.get(ranked[1]).size !== 3) return null;
      targets = uniqueSortedIds([ranked[0], ranked[1]]);
    } else if (mode === 'second') {
      if (reach.get(ranked[0]).size !== 4 || reach.get(ranked[1]).size !== 3) return null;
      targets = [ranked[1]];
    } else if (mode === 'bottom1') {
      if (reach.get(ranked[4]).size !== 0 || reach.get(ranked[3]).size === 0) return null;
      targets = [ranked[4]];
    }

    const rivalId =
      mode === 'bottom1'
        ? ranked[3]
        : mode === 'top2'
          ? ranked[2]
          : mode === 'second'
            ? ranked[0]
            : ranked[1];

    return {
      targets,
      proof: cfg.proof(ranked, targets),
      rival: {
        patientId: rivalId,
        patientName: pName(rivalId),
        reason: cfg.rival(ranked, rivalId),
      },
      chainSummary: chainStr(ranked, cfg.chainOp || ' > '),
    };
  };

  return {
    scenarioTitle: cfg.title,
    dispatch: cfg.dispatch,
    order: cfg.order,
    hint: cfg.hint,
    bayDefaultLabel: cfg.bayLabel || cfg.title,
    bayLabels: Object.fromEntries(pool.map((id) => [id, cfg.bayLabel || 'Active Eval'])),
    cards,
    evaluate,
  };
}

/**
 * 2. EQUIVALENCE & OPPOSITION NETWORK PUZZLE (Pure RFT Coordination + Opposition).
 * 5 active patients linked across 4 cards by SAME-AS and OPPOSITE-TO clinical relations,
 * anchored by ONE patient's confirmed status. Player must chain 2–3 hops to classify everyone!
 * Flipping any card toggles a SAME <-> OPPOSITE edge, shifting which 1–2 patients end up positive.
 */
export function buildParityPuzzle(rng, cfg) {
  const [a, b, c, d, e] = pickPlayers(rng, 5);
  // Default truth coloring: a = true (anchor), b = true (same a), c = false (opp a), d = false (same c), e = false (opp b)
  // Or if cfg.twoTargets === false: a = false (anchor), b = true (opp a), c = false (same a), d = false (opp b), e = false (same c)
  const anchorPos = cfg.anchorPositive ?? false;
  const targetTwo = cfg.twoTargets ?? true;

  const sameTxt = cfg.same;
  const oppTxt = cfg.opp;
  const anchorPosTxt = cfg.anchorPos;
  const anchorNegTxt = cfg.anchorNeg;

  // Build spanning tree of 4 relational links + 3 reinforcing cross-links
  // Card 0: Anchor on `a` + link (a, b)
  // Card 1: link (b, c) + link (a, d)
  // Card 2: link (c, e) + link (d, e)
  // Card 3: contextual check + link (b, d)
  const relAB = targetTwo ? (anchorPos ? 'same' : 'opp') : (anchorPos ? 'opp' : 'opp');
  // Let's keep it clean & exact:
  // Always anchor `a` as NEGATIVE (safe/cleared/false), so player MUST hop through OPPOSITE links to find targets!
  // Base truth:
  //   a = false (anchor)
  //   b = true  (a OPP b)
  //   c = true  (b SAME c)  [if twoTargets] else false (b OPP c)
  //   d = false (a SAME d)
  //   e = false (c OPP e if twoTargets else d SAME e)
  const bState = true;
  const cState = targetTwo ? true : false;
  const dState = false;
  const eState = false;

  const linkFact = (x, y, rel) =>
    fact(rel === 'same' ? sameTxt(x, y) : oppTxt(x, y), [x, y], { tag: 'rel', x, y, rel });

  const cards = [
    makeCard({
      index: 0,
      time: cfg.times?.[0] || '01:04',
      wing: cfg.wings?.[0] || 'Lab Check',
      wingIndex: 0,
      label: cfg.labels[0],
      shown: [
        fact(anchorNegTxt(a), [a], { tag: 'anchor', id: a, val: false }),
        linkFact(a, b, 'opp'),
      ],
      alt: [
        fact(anchorPosTxt(a), [a], { tag: 'anchor', id: a, val: true }),
        linkFact(a, b, 'opp'),
      ],
    }),
    makeCard({
      index: 1,
      time: cfg.times?.[1] || '01:10',
      wing: cfg.wings?.[1] || 'Bedside Note',
      wingIndex: 1,
      label: cfg.labels[1],
      shown: [
        linkFact(b, c, cState === bState ? 'same' : 'opp'),
        linkFact(a, d, 'same'),
      ],
      alt: [
        linkFact(b, c, cState === bState ? 'opp' : 'same'),
        linkFact(a, d, 'same'),
      ],
    }),
    makeCard({
      index: 2,
      time: cfg.times?.[2] || '01:16',
      wing: cfg.wings?.[0] || 'Lab Check',
      wingIndex: 0,
      label: cfg.labels[2],
      shown: [
        linkFact(c, e, eState === cState ? 'same' : 'opp'),
        linkFact(d, e, 'same'),
      ],
      alt: [
        linkFact(c, e, eState === cState ? 'same' : 'opp'),
        linkFact(d, e, 'opp'),
      ],
    }),
    makeCard({
      index: 3,
      time: cfg.times?.[3] || '01:22',
      wing: cfg.wings?.[1] || 'Bedside Note',
      wingIndex: 1,
      label: cfg.labels[3],
      shown: [
        linkFact(b, d, 'opp'),
        fact(cfg.contextLine(e, a), [e, a], { tag: 'note' }),
      ],
      alt: [
        linkFact(b, d, 'same'),
        fact(cfg.contextLine(e, a), [e, a], { tag: 'note' }),
      ],
    }),
  ];

  const pool = [a, b, c, d, e];
  const evaluate = (resolved) => {
    let anchor = null;
    const rels = [];
    for (const card of resolved) {
      for (const f of card.facts) {
        if (f.tag === 'anchor') anchor = { id: f.id, val: f.val };
        if (f.tag === 'rel') rels.push(f);
      }
    }
    if (!anchor) return null;
    const val = new Map([[anchor.id, anchor.val]]);
    let changed = true;
    let guard = 0;
    while (changed && guard < 20) {
      changed = false;
      guard++;
      for (const r of rels) {
        const hasX = val.has(r.x);
        const hasY = val.has(r.y);
        if (hasX && !hasY) {
          val.set(r.y, r.rel === 'same' ? val.get(r.x) : !val.get(r.x));
          changed = true;
        } else if (!hasX && hasY) {
          val.set(r.x, r.rel === 'same' ? val.get(r.y) : !val.get(r.y));
          changed = true;
        } else if (hasX && hasY) {
          const expected = r.rel === 'same' ? val.get(r.x) === val.get(r.y) : val.get(r.x) !== val.get(r.y);
          if (!expected) return null; // Reject inconsistent flip world
        }
      }
    }
    if (val.size !== pool.length) return null;
    const targets = uniqueSortedIds(pool.filter((id) => val.get(id) === true));
    if (targets.length < 1 || targets.length > 3) return null;
    const negatives = pool.filter((id) => val.get(id) === false);

    return {
      targets,
      proof: cfg.proof(targets, negatives, anchor),
      rival: buildRivalInfo(targets, negatives, (r) => cfg.rival(r, anchor, targets)),
      chainSummary: `Match: ${formatList(targets)} ≠ ${formatList(negatives)}`,
    };
  };

  return {
    scenarioTitle: cfg.title,
    dispatch: cfg.dispatch,
    order: cfg.order,
    hint: cfg.hint,
    bayDefaultLabel: cfg.bayLabel || cfg.title,
    bayLabels: Object.fromEntries(pool.map((id) => [id, cfg.bayLabel || 'Active Eval'])),
    cards,
    evaluate,
  };
}

/**
 * 3. DUAL-AXIS RELATIONAL INTERSECTION / REVERSAL PUZZLE (4 big cards, 4 active patients A, B, C, D).
 * Patients are chained along Axis 1 (e.g., Early Rank / Symptom A / Family Belief / Acuity)
 * AND chained along Axis 2 (e.g., Post-Scan Rank / Symptom B / Real Danger / Consent).
 * Player must cross-link BOTH relational chains to find who satisfies BOTH criteria or reversed rank!
 */
export function buildDualAxisPuzzle(rng, cfg) {
  const [a, b, c, d] = pickPlayers(rng, 4);
  // Axis 1 order: a > b > c > d (top 2 = a, b)
  // Axis 2 order: b > c > d > a (or custom perm where target is unique intersection!)
  // Default target = `b` (or `a` and `b` if two targets):
  // Let's make Axis 1: a > b > c > d, Axis 2: c > a > d > b =>
  //   - Top 2 on Axis 1 = {a, b}; Top 2 on Axis 2 = {c, a} => EXACT intersection = {a}!
  //   - Flipping Card 0 swaps Axis 1 top (b > a > c > d) => Top 2 Axis 1 = {b, a} (still a), wait:
  //     better: Flipping Card 0 swaps a<->c on Axis 1 (c > b > a > d) => intersection = {c}!
  //     Flipping Card 1 swaps a<->b on Axis 2 (c > b > d > a) => intersection = {b}!
  //     Flipping Card 2 swaps c<->d on Axis 2 (d > a > c > b) => intersection = {a}!
  //     Flipping Card 3 swaps b<->d on Axis 1 (a > d > c > b) => intersection = {a}!
  // Wait — even cleaner: store exact ranks directly on facts and combine!
  const ax1Gt = cfg.ax1Gt;
  const ax2Gt = cfg.ax2Gt;

  // Axis 1 default: a > b > c > d (ranks: a:3, b:2, c:1, d:0)
  // Axis 2 default: c > a > b > d (ranks: c:3, a:2, b:1, d:0)
  //   - mode 'bothTop2': Top 2 on Axis 1 ({a,b}) AND Top 2 on Axis 2 ({c,a}) -> {a}!
  //   - mode 'biggestJump': Biggest positive jump from Axis 1 to Axis 2 -> c (1 -> 3 = +2)!
  //   - mode 'biggestDrop': Biggest drop from Axis 1 to Axis 2 -> a (3 -> 2) vs if Axis 2 is c > d > b > a -> a (3 -> 0)!
  const ax2Order =
    cfg.mode === 'biggestDrop' || cfg.mode === 'reversal'
      ? [c, d, b, a]
      : [c, a, b, d];

  const cards = [
    makeCard({
      index: 0,
      time: cfg.times?.[0] || '01:05',
      wing: cfg.wings?.[0] || 'Axis A',
      wingIndex: 0,
      label: cfg.labels[0],
      shown: [
        fact(ax1Gt(a, b), [a, b], { tag: 'ax1', hi: a, lo: b }),
        fact(ax1Gt(b, c), [b, c], { tag: 'ax1', hi: b, lo: c }),
      ],
      alt: [
        fact(ax1Gt(b, a), [b, a], { tag: 'ax1', hi: b, lo: a }),
        fact(ax1Gt(a, c), [a, c], { tag: 'ax1', hi: a, lo: c }),
      ],
    }),
    makeCard({
      index: 1,
      time: cfg.times?.[1] || '01:12',
      wing: cfg.wings?.[0] || 'Axis A',
      wingIndex: 0,
      label: cfg.labels[1],
      shown: [
        fact(ax1Gt(c, d), [c, d], { tag: 'ax1', hi: c, lo: d }),
        fact(ax1Gt(a, c), [a, c], { tag: 'ax1', hi: a, lo: c }),
      ],
      alt: [
        fact(ax1Gt(d, c), [d, c], { tag: 'ax1', hi: d, lo: c }),
        fact(ax1Gt(a, d), [a, d], { tag: 'ax1', hi: a, lo: d }),
      ],
    }),
    makeCard({
      index: 2,
      time: cfg.times?.[2] || '01:18',
      wing: cfg.wings?.[1] || 'Axis B',
      wingIndex: 1,
      label: cfg.labels[2],
      shown: [
        fact(ax2Gt(ax2Order[0], ax2Order[1]), [ax2Order[0], ax2Order[1]], { tag: 'ax2', hi: ax2Order[0], lo: ax2Order[1] }),
        fact(ax2Gt(ax2Order[1], ax2Order[2]), [ax2Order[1], ax2Order[2]], { tag: 'ax2', hi: ax2Order[1], lo: ax2Order[2] }),
      ],
      alt: [
        fact(ax2Gt(ax2Order[1], ax2Order[0]), [ax2Order[1], ax2Order[0]], { tag: 'ax2', hi: ax2Order[1], lo: ax2Order[0] }),
        fact(ax2Gt(ax2Order[0], ax2Order[2]), [ax2Order[0], ax2Order[2]], { tag: 'ax2', hi: ax2Order[0], lo: ax2Order[2] }),
      ],
    }),
    makeCard({
      index: 3,
      time: cfg.times?.[3] || '01:25',
      wing: cfg.wings?.[1] || 'Axis B',
      wingIndex: 1,
      label: cfg.labels[3],
      shown: [
        fact(ax2Gt(ax2Order[2], ax2Order[3]), [ax2Order[2], ax2Order[3]], { tag: 'ax2', hi: ax2Order[2], lo: ax2Order[3] }),
        fact(ax2Gt(ax2Order[0], ax2Order[2]), [ax2Order[0], ax2Order[2]], { tag: 'ax2', hi: ax2Order[0], lo: ax2Order[2] }),
      ],
      alt: [
        fact(ax2Gt(ax2Order[3], ax2Order[2]), [ax2Order[3], ax2Order[2]], { tag: 'ax2', hi: ax2Order[3], lo: ax2Order[2] }),
        fact(ax2Gt(ax2Order[0], ax2Order[3]), [ax2Order[0], ax2Order[3]], { tag: 'ax2', hi: ax2Order[0], lo: ax2Order[3] }),
      ],
    }),
  ];

  const pool = [a, b, c, d];
  function solveAxis(resolved, tag) {
    const reach = new Map(pool.map((id) => [id, new Set()]));
    for (const card of resolved) {
      for (const f of card.facts) {
        if (f.tag === tag && f.hi && f.lo) reach.get(f.hi)?.add(f.lo);
      }
    }
    for (const k of pool) {
      for (const i of pool) {
        if (reach.get(i).has(k)) {
          for (const j of reach.get(k)) reach.get(i).add(j);
        }
      }
    }
    for (const id of pool) {
      if (reach.get(id).has(id)) return null;
    }
    const ranked = pool.slice().sort((x, y) => reach.get(y).size - reach.get(x).size);
    // Must be a strict total order (3, 2, 1, 0)
    if (reach.get(ranked[0]).size !== 3 || reach.get(ranked[1]).size !== 2 || reach.get(ranked[2]).size !== 1) {
      return null;
    }
    return ranked;
  }

  const evaluate = (resolved) => {
    const r1 = solveAxis(resolved, 'ax1');
    const r2 = solveAxis(resolved, 'ax2');
    if (!r1 || !r2) return null;

    const mode = cfg.mode || 'bothTop2';
    let targets = [];
    if (mode === 'bothTop2') {
      const top1 = new Set([r1[0], r1[1]]);
      const top2 = new Set([r2[0], r2[1]]);
      targets = uniqueSortedIds(pool.filter((id) => top1.has(id) && top2.has(id)));
    } else if (mode === 'high1Low2') {
      // Ranked Top 2 on Axis 1, yet Bottom 2 on Axis 2
      const top1 = new Set([r1[0], r1[1]]);
      const bot2 = new Set([r2[2], r2[3]]);
      targets = uniqueSortedIds(pool.filter((id) => top1.has(id) && bot2.has(id)));
    } else if (mode === 'low1High2' || mode === 'reversal') {
      // Ranked Bottom 2 on Axis 1, yet jumped to #1 on Axis 2 (or Top 2 on Axis 2)
      const bot1 = new Set([r1[2], r1[3]]);
      const top2 = new Set([r2[0], r2[1]]);
      targets = uniqueSortedIds(pool.filter((id) => bot1.has(id) && top2.has(id)));
    } else if (mode === 'biggestDrop') {
      const drops = pool.map((id) => ({ id, drop: r2.indexOf(id) - r1.indexOf(id) }));
      drops.sort((x, y) => y.drop - x.drop);
      if (drops[0].drop <= drops[1].drop) return null;
      targets = [drops[0].id];
    } else if (mode === 'top2Axis2') {
      targets = [r2[0]];
    }

    if (targets.length < 1 || targets.length > 2) return null;
    const rivalPool = pool.filter((id) => !targets.includes(id));

    return {
      targets,
      proof: cfg.proof(r1, r2, targets),
      rival: buildRivalInfo(targets, rivalPool, (r) => cfg.rival(r, r1, r2)),
      chainSummary: `Chain 1: ${chainStr(r1)} · Chain 2: ${chainStr(r2)}`,
    };
  };

  return {
    scenarioTitle: cfg.title,
    dispatch: cfg.dispatch,
    order: cfg.order,
    hint: cfg.hint,
    bayDefaultLabel: cfg.bayLabel || cfg.title,
    bayLabels: Object.fromEntries(pool.map((id) => [id, cfg.bayLabel || 'Dual Eval'])),
    cards,
    evaluate,
  };
}

/**
 * 4. RELATIONAL CAUSAL / BOTTLENECK / DEPENDENCY GRAPH PUZZLE (4 big cards, 5 active patients).
 * Traces directed links `X triggers/blocks/precedes Y` to isolate the sole root cause,
 * sole multi-patient bottleneck, or furthest downstream consequence.
 */
export function buildCausalPuzzle(rng, cfg) {
  const [p0, p1, p2, p3, p4] = pickPlayers(rng, 5);
  // Default DAG:
  //   mode 'root': p0 -> p1 -> p2 -> p3, plus p0 -> p4 (so p0 is sole root triggering all 4!)
  //   mode 'bottleneck': p1 -> p0 (p0 blocks p2, p3, p4 -> out-degree 3!)
  //   mode 'leaf': p0 -> p1 -> p2 -> p3 (p3 is furthest downstream endpoint with 0 outgoing)
  const link = cfg.link; // (from, to) => plain English "X triggered/blocked Y"
  const rev = cfg.rev;   // (to, from) => plain English "Y was stalled by X"

  const cards = [
    makeCard({
      index: 0,
      time: cfg.times?.[0] || '01:02',
      wing: cfg.wings?.[0] || 'Event Log',
      wingIndex: 0,
      label: cfg.labels[0],
      shown: [
        fact(link(p0, p1), [p0, p1], { tag: 'dep', from: p0, to: p1 }),
        fact(link(p1, p2), [p1, p2], { tag: 'dep', from: p1, to: p2 }),
      ],
      alt: [
        fact(link(p1, p0), [p1, p0], { tag: 'dep', from: p1, to: p0 }),
        fact(link(p0, p2), [p0, p2], { tag: 'dep', from: p0, to: p2 }),
      ],
    }),
    makeCard({
      index: 1,
      time: cfg.times?.[1] || '01:10',
      wing: cfg.wings?.[1] || 'Ward Impact',
      wingIndex: 1,
      label: cfg.labels[1],
      shown: [
        fact(rev(p3, p2), [p3, p2], { tag: 'dep', from: p2, to: p3 }),
        fact(link(p0, p4), [p0, p4], { tag: 'dep', from: p0, to: p4 }),
      ],
      alt: [
        fact(rev(p3, p2), [p3, p2], { tag: 'dep', from: p2, to: p3 }),
        fact(link(p1, p4), [p1, p4], { tag: 'dep', from: p1, to: p4 }),
      ],
    }),
    makeCard({
      index: 2,
      time: cfg.times?.[2] || '01:18',
      wing: cfg.wings?.[0] || 'Event Log',
      wingIndex: 0,
      label: cfg.labels[2],
      shown: [
        fact(rev(p2, p1), [p2, p1], { tag: 'dep', from: p1, to: p2 }),
        fact(link(p2, p3), [p2, p3], { tag: 'dep', from: p2, to: p3 }),
      ],
      alt: [
        fact(rev(p2, p0), [p2, p0], { tag: 'dep', from: p0, to: p2 }),
        fact(link(p2, p4), [p2, p4], { tag: 'dep', from: p2, to: p4 }),
      ],
    }),
    makeCard({
      index: 3,
      time: cfg.times?.[3] || '01:26',
      wing: cfg.wings?.[1] || 'Ward Impact',
      wingIndex: 1,
      label: cfg.labels[3],
      shown: [
        fact(rev(p4, p0), [p4, p0], { tag: 'dep', from: p0, to: p4 }),
        fact(cfg.summaryLine(p3, p4), [p3, p4], { tag: 'note' }),
      ],
      alt: [
        fact(rev(p4, p1), [p4, p1], { tag: 'dep', from: p1, to: p4 }),
        fact(cfg.summaryLine(p3, p4), [p3, p4], { tag: 'note' }),
      ],
    }),
  ];

  const pool = [p0, p1, p2, p3, p4];
  const evaluate = (resolved) => {
    const outMap = new Map(pool.map((id) => [id, new Set()]));
    const inMap = new Map(pool.map((id) => [id, new Set()]));
    for (const card of resolved) {
      for (const f of card.facts) {
        if (f.tag === 'dep' && f.from && f.to && f.from !== f.to) {
          outMap.get(f.from).add(f.to);
          inMap.get(f.to).add(f.from);
        }
      }
    }
    // Transitive reachability & acyclicity check
    const reach = new Map(pool.map((id) => [id, new Set(outMap.get(id))]));
    for (const k of pool) {
      for (const i of pool) {
        if (reach.get(i).has(k)) {
          for (const j of reach.get(k)) reach.get(i).add(j);
        }
      }
    }
    for (const id of pool) {
      if (reach.get(id).has(id)) return null;
    }

    const mode = cfg.mode || 'root';
    let targets = [];
    if (mode === 'root') {
      const roots = pool.filter((id) => inMap.get(id).size === 0 && reach.get(id).size >= 3);
      if (roots.length !== 1) return null;
      targets = roots;
    } else if (mode === 'bottleneck') {
      const sorted = pool.slice().sort((x, y) => reach.get(y).size - reach.get(x).size);
      if (reach.get(sorted[0]).size <= reach.get(sorted[1]).size) return null;
      targets = [sorted[0]];
    } else if (mode === 'downstream') {
      // Longest path leaf
      const leaves = pool.filter((id) => outMap.get(id).size === 0 && inMap.get(id).size >= 1);
      // pick the one with most ancestors
      const ancCount = (id) => pool.filter((u) => reach.get(u).has(id)).length;
      leaves.sort((x, y) => ancCount(y) - ancCount(x));
      if (!leaves.length || (leaves.length > 1 && ancCount(leaves[0]) === ancCount(leaves[1]))) return null;
      targets = [leaves[0]];
    }

    const ranked = pool.slice().sort((x, y) => reach.get(y).size - reach.get(x).size);
    const rivalId = ranked.find((id) => !targets.includes(id)) || p1;

    return {
      targets,
      proof: cfg.proof(targets, ranked, reach),
      rival: {
        patientId: rivalId,
        patientName: pName(rivalId),
        reason: cfg.rival(rivalId, targets[0], reach),
      },
      chainSummary: chainStr(ranked, ' → '),
    };
  };

  return {
    scenarioTitle: cfg.title,
    dispatch: cfg.dispatch,
    order: cfg.order,
    hint: cfg.hint,
    bayDefaultLabel: cfg.bayLabel || cfg.title,
    bayLabels: Object.fromEntries(pool.map((id) => [id, cfg.bayLabel || 'Chain Audit'])),
    cards,
    evaluate,
  };
}

/**
 * 5. RELATIONAL ARITHMETIC / RATIO / THRESHOLD PROPAGATION PUZZLE (4 big cards, 4 active patients).
 * Anchors ONE patient with a concrete number; EVERY OTHER patient is defined strictly in relation
 * to another patient (`TWICE`, `HALF`, `+delta`, `-delta`) — ZERO pre-computed answers!
 */
export function buildRelativeMathPuzzle(rng, cfg) {
  const [a, b, c, d] = pickPlayers(rng, 4);
  // Base anchor: b = cfg.baseVal (e.g., 20)
  // Card 0: anchor b = baseVal; a = op(b)
  // Card 1: c = op(a); d = op(b)
  // Card 2: secondary check / threshold rule
  // Card 3: cross-comparison confirmation
  const cards = cfg.buildCards([a, b, c, d]);
  const pool = [a, b, c, d];

  const evaluate = (resolved) => {
    const res = cfg.solve(resolved, pool);
    if (!res || !res.targets || res.targets.length < 1 || res.targets.length > 2) return null;
    return res;
  };

  return {
    scenarioTitle: cfg.title,
    dispatch: cfg.dispatch,
    order: cfg.order,
    hint: cfg.hint,
    bayDefaultLabel: cfg.bayLabel || cfg.title,
    bayLabels: Object.fromEntries(pool.map((id) => [id, cfg.bayLabel || 'Calc Eval'])),
    cards,
    evaluate,
  };
}
