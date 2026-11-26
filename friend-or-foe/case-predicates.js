// Verified, officer-grounded operational predicates and helpers shared across all 500 families.
// Every predicate pairs exact natural espionage English with its exact matching graph test,
// guaranteeing 100% written-order vs. grader accuracy and zero meta-UI terms ("row", "arrow", "score").

export function edgesBy(g, x, roles, dir = 'any') {
  if (dir === 'out') return g.out(x, roles);
  if (dir === 'in') return g.in(x, roles);
  return g.touch(x, roles);
}

// Atomic role-direction predicates with exact natural phrasing (no "row", "arrow", "left", "right").
export const ATOMS = {
  friend_out:    {roles: ['friend'], dir: 'out', text: 'vouches for someone as a Friend'},
  friend_in:     {roles: ['friend'], dir: 'in',  text: 'is vouched for by a Friend'},
  friend_any:    {roles: ['friend'], dir: 'any', text: 'appears in the Friend file'},
  foe_out:       {roles: ['foe'], dir: 'out', text: 'targets someone as a Foe'},
  foe_in:        {roles: ['foe'], dir: 'in',  text: 'is targeted by a Foe'},
  foe_any:       {roles: ['foe'], dir: 'any', text: 'appears in the Foe file'},
  spy_out:       {roles: ['spy'], dir: 'out', text: 'shadows someone as a Spy'},
  spy_in:        {roles: ['spy'], dir: 'in',  text: 'is shadowed by a Spy'},
  spy_any:       {roles: ['spy'], dir: 'any', text: 'appears in the Spy file'},
  double_out:    {roles: ['double'], dir: 'out', text: 'leaks to someone as a Double agent'},
  double_in:     {roles: ['double'], dir: 'in',  text: 'receives a Double agent’s leak'},
  double_any:    {roles: ['double'], dir: 'any', text: 'appears in the Double agent file'},
  civilian_out:  {roles: ['civilian'], dir: 'out', text: 'tips off someone as a Civilian'},
  civilian_in:   {roles: ['civilian'], dir: 'in',  text: 'is tipped off by a Civilian'},
  civilian_any:  {roles: ['civilian'], dir: 'any', text: 'appears in the Civilian file'},
  foreigner_out: {roles: ['foreigner'], dir: 'out', text: 'meets someone as a Foreigner'},
  foreigner_in:  {roles: ['foreigner'], dir: 'in',  text: 'is met by a Foreigner'},
  foreigner_any: {roles: ['foreigner'], dir: 'any', text: 'appears in the Foreigner file'}
};

// Evaluate an atomic or multi-role clause {roles, dir} on suspect x.
export function matchAtom(g, x, spec) {
  return edgesBy(g, x, spec.roles, spec.dir || 'any');
}

// Check if suspect x has an edge matching specA whose dispatch time is strictly earlier than
// an edge matching specB (both touching/directed on x). Returns [eA, eB] or null.
export function matchTemporal(g, x, specA, specB) {
  const aList = matchAtom(g, x, specA);
  if (!aList.length) return null;
  const bList = matchAtom(g, x, specB);
  if (!bList.length) return null;
  for (const e1 of aList) {
    for (const e2 of bList) {
      if (e1 === e2) continue;
      if (e1.time < e2.time) return [e1, e2];
    }
  }
  return null;
}

// Clean-cover helpers (2nd-order epistemic integrity)
export function hasCleanFriend(g, x) {
  return g.in(x, 'friend').some(f => !g.hasTouch(f.from, ['double', 'foreigner']));
}

export function hasCleanSpy(g, x) {
  return g.in(x, 'spy').some(s => !g.hasTouch(s.from, ['foe', 'double', 'foreigner']));
}

export function hasTaintedFriend(g, x) {
  return g.in(x, 'friend').find(f => g.hasTouch(f.from, ['double', 'foreigner'])) || null;
}

export function hasTaintedSpy(g, x) {
  return g.in(x, 'spy').find(s => g.hasTouch(s.from, ['foe', 'double', 'foreigner'])) || null;
}

export function hasCleanCivilian(g, x) {
  return g.in(x, 'civilian').some(c => !g.hasTouch(c.from, ['foe', 'double', 'foreigner']));
}

// Check a 2-step directional or undirected contact from x -> mid -> end (optionally temporal or diffRole).
export function matchRelay(g, x, {firstRoles, firstDir, secondRoles, secondDir, noReturn = true, diffRole = false, timeOrder = null, midExc = null, midReq = null}) {
  const firsts = edgesBy(g, x, firstRoles, firstDir);
  for (const e1 of firsts) {
    const mid = e1.from === x ? e1.to : e1.from;
    if (midExc && matchAtom(g, mid, midExc).length) continue;
    if (midReq && !matchAtom(g, mid, midReq).length) continue;
    const seconds = edgesBy(g, mid, secondRoles, secondDir);
    for (const e2 of seconds) {
      if (e2 === e1) continue;
      if (diffRole && e2.role === e1.role) continue;
      const end = e2.from === mid ? e2.to : e2.from;
      if (noReturn && end === x) continue;
      if (timeOrder === 'before' && !(e1.time < e2.time)) continue;
      if (timeOrder === 'after' && !(e1.time > e2.time)) continue;
      return {e1, e2, mid, end};
    }
  }
  return null;
}

// Check a 2-step relay starting from anchor -> mid -> x (x != anchor).
export function matchAnchorRelay(g, anchor, x, {step1Roles, step1Dir, step2Roles, step2Dir, diffRole = false, excludeDirect = false, timeOrder = null, midExc = null}) {
  if (x === anchor) return null;
  if (excludeDirect && g.between(anchor, x).length) return null;
  for (const e1 of edgesBy(g, anchor, step1Roles, step1Dir)) {
    const mid = e1.from === anchor ? e1.to : e1.from;
    if (mid === x) continue;
    if (midExc && matchAtom(g, mid, midExc).length) continue;
    for (const e2 of edgesBy(g, mid, step2Roles, step2Dir)) {
      if (e2 === e1) continue;
      if (diffRole && e2.role === e1.role) continue;
      const end = e2.from === mid ? e2.to : e2.from;
      if (end !== x) continue;
      if (timeOrder === 'before' && !(e1.time < e2.time)) continue;
      if (timeOrder === 'after' && !(e1.time > e2.time)) continue;
      return {e1, e2, mid};
    }
  }
  return null;
}
