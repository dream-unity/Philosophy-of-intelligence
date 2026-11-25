import {collectMatches, pickHighest} from './case-graph.js';

// 100 genuinely distinct Very Easy operational families (10 domains × 10 families).
// Calibrated to 105–110 IQ (capable 10-year-old): carry a relationship from one
// category/context into another across confirmed records, with helpful non-spoiling guidance.

function edgesByDir(g, name, roles, dir) {
  if (dir === 'out') return g.out(name, roles);
  if (dir === 'in') return g.in(name, roles);
  return g.touch(name, roles);
}

// Generic 2-step carrier: suspect `x` has a `first` edge to intermediary `m` (where `m !== x`),
// and `m` has a `second` edge (optionally excluding self-return to `x`), plus optional exception on `x`.
function makeCarryRule({
  id, domain, title, order, hint,
  firstRoles, firstDir,           // relation from suspect x to intermediary m ('out' | 'in' | 'any')
  secondRoles, secondDir,         // relation on intermediary m ('out' | 'in' | 'any')
  noReturn = true,                // if true, second edge must not simply point back to x
  diffRole = false,               // if true, second edge must be in a different category from first
  exc = null                      // optional {roles, dir} excluding x
}) {
  return {
    id,
    tier: 'very-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      return collectMatches(g.people, x => {
        if (exc && edgesByDir(g, x, exc.roles, exc.dir || 'any').length) return null;
        for (const e1 of edgesByDir(g, x, firstRoles, firstDir)) {
          const m = e1.from === x ? e1.to : e1.from;
          for (const e2 of edgesByDir(g, m, secondRoles, secondDir)) {
            if (e2 === e1) continue;
            if (diffRole && e2.role === e1.role) continue;
            const end = e2.from === m ? e2.to : e2.from;
            if (noReturn && end === x) continue;
            return includeProof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, includeProof);
    }
  };
}

// Generic 2-step relay from anchor {name}: start at {name}, follow step1 to m, then step2 to target x != {name}.
function makeAnchorCarryRule({
  id, domain, title, order, hint,
  step1Roles, step1Dir,
  step2Roles, step2Dir,
  diffRole = false,
  excludeDirectToAnchor = false,
  excOnTarget = null
}) {
  return {
    id,
    tier: 'very-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: true,
    evaluate(g, anchor, includeProof) {
      const directSet = excludeDirectToAnchor ? new Set(g.neighbors(anchor)) : null;
      return collectMatches(g.people, x => {
        if (x === anchor) return null;
        if (directSet && directSet.has(x)) return null;
        if (excOnTarget && edgesByDir(g, x, excOnTarget.roles, excOnTarget.dir || 'any').length) return null;
        for (const e1 of edgesByDir(g, anchor, step1Roles, step1Dir)) {
          const m = e1.from === anchor ? e1.to : e1.from;
          if (m === x) continue;
          for (const e2 of edgesByDir(g, m, step2Roles, step2Dir)) {
            if (e2 === e1) continue;
            if (diffRole && e2.role === e1.role) continue;
            const end = e2.from === m ? e2.to : e2.from;
            if (end === x) {
              return includeProof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
            }
          }
        }
        return null;
      }, includeProof);
    }
  };
}

// Generic 2-step chain endpoint rule: follow step1 (a -> m), then step2 (m -> b), b != a;
// pick either 'start' (a) or 'end' (b) or 'mid' (m).
function makeRelayRule({
  id, domain, title, order, hint,
  step1Roles, step2Roles,
  pickEnd = 'end', // 'start' | 'end' | 'mid'
  diffRole = false,
  exc = null
}) {
  return {
    id,
    tier: 'very-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      const hits = new Map();
      for (const e1 of g.edges) {
        if (!step1Roles.includes(e1.role)) continue;
        for (const e2 of g.out(e1.to, step2Roles)) {
          if (e2.to === e1.from) continue;
          if (diffRole && e2.role === e1.role) continue;
          const target = pickEnd === 'start' ? e1.from : pickEnd === 'mid' ? e1.to : e2.to;
          if (exc && edgesByDir(g, target, exc.roles, exc.dir || 'any').length) continue;
          if (!hits.has(target)) {
            hits.set(target, includeProof ? target + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : '');
          }
        }
      }
      const pair = [...hits.keys()].sort();
      return {pair, proof: includeProof ? [...new Set(pair.map(n => hits.get(n)))] : []};
    }
  };
}

function makeIndirectRankRule({id, domain, title, order, hint, scoreFn}) {
  return {
    id,
    tier: 'very-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      return pickHighest(g.people, x => scoreFn(g, x, includeProof), includeProof, 1);
    }
  };
}

export const veryEasyFamilies = [
  // =========================================================================
  // DOMAIN 0: Compromised Ally Chains (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-00', domain: 0, title: 'Tainted voucher',
    order: 'Shoot the two suspects backed by a Friend who also leaks as a Double agent or handles a Foreigner asset.',
    hint: 'Find who backs whom in Friend, then check whether that Friend backer sits on the left of Double agent or Foreigner.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-01', domain: 0, title: 'Backing a mole',
    order: 'Shoot the two Friends (left of Friend) backing someone who appears in Double agent or Foreigner records.',
    hint: 'Follow each Friend arrow to the backed person, then check if that person shows up in Double agent or Foreigner.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-02', domain: 0, title: 'Friend of a hostile',
    order: 'Shoot the two suspects backed by a Friend who also appears in Foe records — excluding anyone watched by a Spy.',
    hint: 'Check Friend backers who appear in Foe, follow their Friend arrow, then rule out anyone watched by a Spy.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeCarryRule({
    id: 've-03', domain: 0, title: 'Shielding an adversary',
    order: 'Shoot the two suspects who back a Friend OR report as a Civilian to someone who opposes as a Foe.',
    hint: 'Find who opposes someone in Foe, then trace back who backs them as a Friend or reports to them as a Civilian.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-04', domain: 0, title: 'Ally under leak',
    order: 'Shoot the two suspects linked (either way) in Friend to someone receiving a Double agent leak.',
    hint: 'Check the right side of Double agent first, then look for anyone connected to those people in Friend.',
    firstRoles: ['friend'], firstDir: 'any', secondRoles: ['double'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-05', domain: 0, title: 'Ally under foreign hand',
    order: 'Shoot the two suspects linked (either way) in Friend to someone handled by a Foreigner.',
    hint: 'Find who sits on the right of Foreigner, then check who is paired with them in Friend.',
    firstRoles: ['friend'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-06', domain: 0, title: 'Exposed backer',
    order: 'Shoot the two suspects backing someone as a Friend when that person is ALSO watched by a Spy or opposed by a Foe.',
    hint: 'Follow each Friend arrow right, then check whether that person is on the right of Spy or Foe.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['spy', 'foe'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-07', domain: 0, title: 'Unwatched friend of a mole',
    order: 'Shoot the two suspects backed by a Friend or reported to by a Civilian whose partner appears in Double agent.',
    hint: 'Find who appears in Double agent, then follow their outgoing Friend or Civilian arrows.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-08', domain: 0, title: 'Backing a spy’s target',
    order: 'Shoot the two suspects linked in Friend or Civilian to someone watched by a Spy — excluding anyone in Foe.',
    hint: 'Find who is watched by a Spy, look for their partners in Friend or Civilian, then drop anyone in Foe.',
    firstRoles: ['friend', 'civilian'], firstDir: 'any', secondRoles: ['spy'], secondDir: 'in',
    exc: {roles: ['foe'], dir: 'any'}
  }),
  makeCarryRule({
    id: 've-09', domain: 0, title: 'Compromised circle',
    order: 'Shoot the two suspects whose Friend backer is targeted by a Foe or handled by a Foreigner.',
    hint: 'Check the left side of Friend; if that backer sits on the right of Foe or Foreigner, shoot the person they back.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance Transfers (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-10', domain: 1, title: 'Compromised surveillance',
    order: 'Shoot the two suspects watched by a Spy who also appears in Double agent or Foreigner records.',
    hint: 'Check who sits on the left of Spy; if that watcher is also in Double agent or Foreigner, shoot who they watch.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-11', domain: 1, title: 'Watcher on a live lead',
    order: 'Shoot the two Spies (left of Spy) watching someone who also appears in Foe or Double agent records.',
    hint: 'Follow each Spy arrow to the watched person, then check if that person appears in Foe or Double agent.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foe', 'double'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-12', domain: 1, title: 'Watcher on a foreign lead',
    order: 'Shoot the two Spies (left of Spy) watching someone who also appears in Foreigner or Civilian records.',
    hint: 'Check the right side of Spy; if that person appears in Foreigner or Civilian, shoot the Spy watching them.',
    firstRoles: ['spy'], firstDir: 'out', secondRoles: ['foreigner', 'civilian'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-13', domain: 1, title: 'Shadowed by a friend’s contact',
    order: 'Shoot the two suspects watched by a Spy who is backed by a Friend or reported to by a Civilian.',
    hint: 'Check each Spy watcher (left of Spy) to see if they sit on the right of Friend or Civilian.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['friend', 'civilian'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-14', domain: 1, title: 'Surveillance blind spot',
    order: 'Shoot the two suspects linked (either way) in Spy to someone who opposes as a Foe or leaks as a Double agent.',
    hint: 'Find who acts on the left of Foe or Double agent, then look for their partner in the Spy row.',
    firstRoles: ['spy'], firstDir: 'any', secondRoles: ['foe', 'double'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-15', domain: 1, title: 'Tracked back to the handler',
    order: 'Shoot the two suspects who handle (Foreigner) or back (Friend) someone watched by a Spy.',
    hint: 'Check the right side of Spy first, then find who sits on the left of Foreigner or Friend pointing to them.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['spy'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-16', domain: 1, title: 'Watcher under fire',
    order: 'Shoot the two suspects watched by a Spy whose watcher is opposed by a Foe or leaked to by a Double agent.',
    hint: 'Check the left side of Spy; if that watcher sits on the right of Foe or Double agent, shoot who they watch.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-17', domain: 1, title: 'Shadowed through a witness',
    order: 'Shoot the two suspects reported to by a Civilian who is watched by a Spy or backed by a Friend.',
    hint: 'Find Civilians (left of Civilian) who sit on the right of Spy or Friend, then shoot who they report to.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['spy', 'friend'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-18', domain: 1, title: 'Unmonitored associate',
    order: 'Shoot the two suspects linked in Spy to someone in Foreigner or Friend — excluding anyone in Foe.',
    hint: 'Find Spy partners of people in Foreigner or Friend, then cross off anyone appearing in Foe.',
    firstRoles: ['spy'], firstDir: 'any', secondRoles: ['foreigner', 'friend'], secondDir: 'any',
    exc: {roles: ['foe'], dir: 'any'}
  }),
  makeCarryRule({
    id: 've-19', domain: 1, title: 'Leak from under watch',
    order: 'Shoot the two suspects receiving a Double agent leak or Foe attack from someone watched by a Spy.',
    hint: 'Find who sits on the right of Spy, then follow any Double agent or Foe arrow leaving them.',
    firstRoles: ['double', 'foe'], firstDir: 'in', secondRoles: ['spy'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Handler Cut-Outs (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-20', domain: 2, title: 'Foreigner’s inside contact',
    order: 'Shoot the two suspects backed by someone who appears in Foreigner records.',
    hint: 'Find everyone in Foreigner, then follow any Friend arrow leaving those people.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-21', domain: 2, title: 'Foreign handler’s double life',
    order: 'Shoot the two suspects handled by a Foreigner whose handler also appears in Friend or Spy records.',
    hint: 'Check the left side of Foreigner; if that handler also appears in Friend or Spy, shoot the asset they handle.',
    firstRoles: ['foreigner'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-22', domain: 2, title: 'Border recruiter’s target',
    order: 'Shoot the two Foreigner handlers (left of Foreigner) managing someone who appears in Civilian or Friend records.',
    hint: 'Check the right side of Foreigner; if that asset appears in Civilian or Friend, shoot their Foreigner handler.',
    firstRoles: ['foreigner'], firstDir: 'out', secondRoles: ['civilian', 'friend'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-23', domain: 2, title: 'Foreigner-fed leak',
    order: 'Shoot the two suspects receiving a Double agent leak or Civilian report from someone in Foreigner records.',
    hint: 'Find everyone in Foreigner, then follow outgoing Double agent or Civilian arrows from them.',
    firstRoles: ['double', 'civilian'], firstDir: 'in', secondRoles: ['foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-24', domain: 2, title: 'Foreigner’s covert reach',
    order: 'Shoot the two suspects linked (either way) in Spy or Double agent to someone handled by a Foreigner.',
    hint: 'Start with names on the right of Foreigner, then find their partners in Spy or Double agent.',
    firstRoles: ['spy', 'double'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-25', domain: 2, title: 'Asset opposing an enemy',
    order: 'Shoot the two suspects opposed by someone in Foreigner records (or handled by someone in Foe records).',
    hint: 'Follow Foe arrows leaving anyone in Foreigner, or Foreigner arrows leaving anyone in Foe.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'any', diffRole: true
  }),
  makeCarryRule({
    id: 've-26', domain: 2, title: 'Unwatched foreign circle',
    order: 'Shoot the two suspects linked in Foreigner to someone in Foe or Double agent — excluding anyone watched by a Spy.',
    hint: 'Find Foreigner partners of people in Foe or Double agent, then drop anyone on the right of Spy.',
    firstRoles: ['foreigner'], firstDir: 'any', secondRoles: ['foe', 'double'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeCarryRule({
    id: 've-27', domain: 2, title: 'Asset’s handler chain',
    order: 'Shoot the two suspects who watch (Spy) or back (Friend) someone handled by a Foreigner.',
    hint: 'Find who sits on the right of Foreigner, then trace back who watches them in Spy or backs them in Friend.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-28', domain: 2, title: 'Border-to-witness link',
    order: 'Shoot the two suspects linked (either way) in Civilian to someone who appears in Foreigner records.',
    hint: 'Find everyone in Foreigner, then look for anyone paired with them in Civilian.',
    firstRoles: ['civilian'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-29', domain: 2, title: 'Recruiting a mole',
    order: 'Shoot the two suspects handling someone (Foreigner) OR watching someone (Spy) who leaks as a Double agent.',
    hint: 'Check the left side of Double agent, then find who sits on the left of Foreigner or Spy pointing to them.',
    firstRoles: ['foreigner', 'spy'], firstDir: 'out', secondRoles: ['double'], secondDir: 'out'
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Conduit & Witness Chains (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-30', domain: 3, title: 'Tainted witness report',
    order: 'Shoot the two suspects reported to by a Civilian who also appears in Foe or Double agent records.',
    hint: 'Check the left side of Civilian; if that witness appears in Foe or Double agent, shoot who they report to.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-31', domain: 3, title: 'Civilian reporting to a mole',
    order: 'Shoot the two Civilians (left of Civilian) reporting to someone who appears in Double agent or Foreigner records.',
    hint: 'Check the right side of Civilian; if that recipient is in Double agent or Foreigner, shoot the Civilian reporting to them.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['double', 'foreigner'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-32', domain: 3, title: 'Civilian reporting to a foe',
    order: 'Shoot the two Civilians (left of Civilian) reporting to someone who appears in Foe or Spy records.',
    hint: 'Check who receives a Civilian report; if they also appear in Foe or Spy, shoot the Civilian who reported to them.',
    firstRoles: ['civilian'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-33', domain: 3, title: 'Witness shielded by a friend',
    order: 'Shoot the two suspects backed by someone who appears in Civilian records.',
    hint: 'Find everyone named in Civilian, then follow any outgoing Friend arrow from those people.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-34', domain: 3, title: 'Hostile targeting a witness',
    order: 'Shoot the two suspects who oppose (Foe) or handle (Foreigner) someone named in Civilian records.',
    hint: 'Find everyone in Civilian, then look on the left of Foe and Foreigner for arrows pointing to them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-35', domain: 3, title: 'Civilian’s covert leak',
    order: 'Shoot the two suspects receiving a Double agent leak or Spy watch from someone in Civilian records.',
    hint: 'Find everyone in Civilian, then follow any outgoing Double agent or Spy arrows leaving them.',
    firstRoles: ['double', 'spy'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-36', domain: 3, title: 'Witness handler’s ally',
    order: 'Shoot the two suspects linked in Friend or Spy to someone receiving a Civilian report.',
    hint: 'Check the right side of Civilian first, then find their partners in Friend or Spy.',
    firstRoles: ['friend', 'spy'], firstDir: 'any', secondRoles: ['civilian'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-37', domain: 3, title: 'Unbacked civilian contact',
    order: 'Shoot the two suspects linked in Civilian to someone in Friend or Spy — excluding anyone in Double agent.',
    hint: 'Find Civilian partners of people in Friend or Spy, then cross off anyone in Double agent.',
    firstRoles: ['civilian'], firstDir: 'any', secondRoles: ['friend', 'spy'], secondDir: 'any',
    exc: {roles: ['double'], dir: 'any'}
  }),
  makeCarryRule({
    id: 've-38', domain: 3, title: 'Witnessed hostile',
    order: 'Shoot the two suspects opposed by someone who receives a Civilian report or Friend backing.',
    hint: 'Find who sits on the right of Civilian or Friend, then follow any outgoing Foe arrow from them.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['civilian', 'friend'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-39', domain: 3, title: 'Exposed witness handler',
    order: 'Shoot the two suspects receiving a Civilian report from someone who is also handled by a Foreigner or opposed by a Foe.',
    hint: 'Check the left side of Civilian; if that witness sits on the right of Foreigner or Foe, shoot who they report to.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 4: Double Agent Leak Trails (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-40', domain: 4, title: 'Leak through a friend',
    order: 'Shoot the two suspects receiving a Friend backing or Spy watch from someone who leaks as a Double agent.',
    hint: 'Check the left side of Double agent, then follow outgoing Friend or Spy arrows from those moles.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['double'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-41', domain: 4, title: 'Mole’s foreign buyer',
    order: 'Shoot the two suspects receiving a Double agent leak from someone who also appears in Foreigner or Friend records.',
    hint: 'Check the left side of Double agent; if that mole appears in Foreigner or Friend, shoot who they leak to.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['foreigner', 'friend'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-42', domain: 4, title: 'Leaking to an enemy’s circle',
    order: 'Shoot the two Double agents (left of Double agent) leaking to someone who appears in Foe or Spy records.',
    hint: 'Check the right side of Double agent; if that recipient is in Foe or Spy, shoot the mole leaking to them.',
    firstRoles: ['double'], firstDir: 'out', secondRoles: ['foe', 'spy'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-43', domain: 4, title: 'Handling a mole',
    order: 'Shoot the two suspects linked (either way) in Foreigner or Foe to someone who leaks as a Double agent.',
    hint: 'Check the left side of Double agent, then find their partners in Foreigner or Foe.',
    firstRoles: ['foreigner', 'foe'], firstDir: 'any', secondRoles: ['double'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-44', domain: 4, title: 'Second-hand leak',
    order: 'Shoot the two suspects linked (either way) in Friend or Civilian to someone receiving a Double agent leak.',
    hint: 'Start with names on the right of Double agent, then find their partners in Friend or Civilian.',
    firstRoles: ['friend', 'civilian'], firstDir: 'any', secondRoles: ['double'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-45', domain: 4, title: 'Unwatched leak recipient',
    order: 'Shoot the two suspects receiving a Double agent leak from someone in Spy or Civilian — excluding backed Friends.',
    hint: 'Check moles who appear in Spy or Civilian, follow their Double agent arrow, then drop anyone backed by a Friend.',
    firstRoles: ['double'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeCarryRule({
    id: 've-46', domain: 4, title: 'Mole’s handler',
    order: 'Shoot the two suspects who handle (Foreigner) or back (Friend) someone in Double agent records.',
    hint: 'Find everyone in Double agent, then trace back who handles them in Foreigner or backs them in Friend.',
    firstRoles: ['foreigner', 'friend'], firstDir: 'out', secondRoles: ['double'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-47', domain: 4, title: 'Covert fallout',
    order: 'Shoot the two suspects opposed (Foe) or handled (Foreigner) by someone receiving a Double agent leak.',
    hint: 'Start with names on the right of Double agent, then follow outgoing Foe or Foreigner arrows from them.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'in', secondRoles: ['double'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-48', domain: 4, title: 'Leak under surveillance',
    order: 'Shoot the two suspects watched by someone who appears in Double agent records.',
    hint: 'Find everyone named in Double agent, then follow any outgoing Spy arrows leaving them.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['double'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-49', domain: 4, title: 'Betrayed witness',
    order: 'Shoot the two suspects linked (either way) in Double agent to someone named in Civilian or Foreigner.',
    hint: 'Find everyone in Civilian or Foreigner, then look for their partners in Double agent.',
    firstRoles: ['double'], firstDir: 'any', secondRoles: ['civilian', 'foreigner'], secondDir: 'any'
  }),

  // =========================================================================
  // DOMAIN 5: Hostile Escalation & Contagion (10 families)
  // =========================================================================
  makeCarryRule({
    id: 've-50', domain: 5, title: 'Enemy of a friend',
    order: 'Shoot the two suspects who oppose (Foe) or leak to (Double agent) someone backed by a Friend.',
    hint: 'Check who sits on the right of Friend, then find who sits on the left of Foe or Double agent pointing at them.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['friend'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-51', domain: 5, title: 'Targeted by a spy’s contact',
    order: 'Shoot the two suspects opposed by a Foe who also appears in Spy or Civilian records.',
    hint: 'Check the left side of Foe; if that aggressor also appears in Spy or Civilian, shoot who they oppose.',
    firstRoles: ['foe'], firstDir: 'in', secondRoles: ['spy', 'civilian'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-52', domain: 5, title: 'Aggressor’s hidden backer',
    order: 'Shoot the two suspects linked (either way) in Friend or Foreigner to someone who opposes as a Foe.',
    hint: 'Find who sits on the left of Foe, then look for their partners in Friend or Foreigner.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'any', secondRoles: ['foe'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-53', domain: 5, title: 'Hostile target’s shadow',
    order: 'Shoot the two suspects linked (either way) in Spy or Double agent to someone opposed by a Foe.',
    hint: 'Start with names on the right of Foe, then find their partners in Spy or Double agent.',
    firstRoles: ['spy', 'double'], firstDir: 'any', secondRoles: ['foe'], secondDir: 'in'
  }),
  makeCarryRule({
    id: 've-54', domain: 5, title: 'Foe’s covert ally',
    order: 'Shoot the two suspects backed (Friend) or handled (Foreigner) by someone who appears in Foe records.',
    hint: 'Find everyone in Foe, then follow outgoing Friend or Foreigner arrows from them.',
    firstRoles: ['friend', 'foreigner'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-55', domain: 5, title: 'Opposing a witness',
    order: 'Shoot the two suspects opposing (Foe) or leaking to (Double agent) someone who reports as a Civilian.',
    hint: 'Find Civilians on the left of Civilian, then trace who opposes them in Foe or leaks to them in Double agent.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'out'
  }),
  makeCarryRule({
    id: 've-56', domain: 5, title: 'Retaliation risk',
    order: 'Shoot the two suspects linked (either way) in Foe to someone in Double agent or Foreigner — excluding Spies.',
    hint: 'Find Foe partners of people in Double agent or Foreigner, then rule out anyone in Spy.',
    firstRoles: ['foe'], firstDir: 'any', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'any'}
  }),
  makeCarryRule({
    id: 've-57', domain: 5, title: 'Hostile spillover',
    order: 'Shoot the two suspects receiving a Spy watch or Civilian report from someone who appears in Foe records.',
    hint: 'Find everyone in Foe, then follow outgoing Spy or Civilian arrows leaving them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-58', domain: 5, title: 'Watching an aggressor',
    order: 'Shoot the two suspects watching (Spy) or reporting to (Civilian) someone in Foe records.',
    hint: 'Find everyone in Foe, then check who sits on the left of Spy or Civilian pointing to them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'out', secondRoles: ['foe'], secondDir: 'any'
  }),
  makeCarryRule({
    id: 've-59', domain: 5, title: 'Ally of the hunted',
    order: 'Shoot the two suspects backed by someone who is opposed by a Foe or betrayed by a Double agent.',
    hint: 'Find who sits on the right of Foe or Double agent, then follow outgoing Friend arrows leaving them.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'in'
  }),

  // =========================================================================
  // DOMAIN 6: Anchor Two-Step Perspective around {name} (10 families)
  // =========================================================================
  makeAnchorCarryRule({
    id: 've-60', domain: 6, title: 'Second-step hostile from {name}',
    order: 'Start at {name}, follow any outgoing arrow, then follow a Foe, Double agent, or Foreigner arrow (no return). Shoot the two reached.',
    hint: 'Follow arrows leaving {name} first, then follow outgoing Foe, Double agent, or Foreigner arrows from those contacts.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'out'
  }),
  makeAnchorCarryRule({
    id: 've-61', domain: 6, title: 'Second-step ally from {name}',
    order: 'Start at {name}, follow any outgoing arrow, then follow a Friend, Spy, or Civilian arrow (no return). Shoot the two reached.',
    hint: 'Follow arrows leaving {name}, then follow outgoing Friend, Spy, or Civilian arrows from those contacts.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'spy', 'civilian'], step2Dir: 'out'
  }),
  makeAnchorCarryRule({
    id: 've-62', domain: 6, title: 'Indirect approach to {name}',
    order: 'Follow a Foe, Double agent, or Foreigner arrow, then ANY arrow straight into {name} (no return). Shoot the two who started.',
    hint: 'Work one step backward from {name}, then trace incoming Foe, Double agent, or Foreigner arrows into those contacts.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'in'
  }),
  makeAnchorCarryRule({
    id: 've-63', domain: 6, title: 'Covert reach from {name}',
    order: 'Start at {name}, follow any link (either way), then follow a Spy or Double agent link (either way, not direct to {name}). Shoot those two.',
    hint: 'List {name}’s direct contacts, then find who those contacts touch in Spy or Double agent (skipping {name}’s own direct contacts).',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['spy', 'double'], step2Dir: 'any', excludeDirectToAnchor: true
  }),
  makeAnchorCarryRule({
    id: 've-64', domain: 6, title: 'Border reach from {name}',
    order: 'Start at {name}, follow any link (either way), then follow a Civilian or Foreigner link (not directly linked to {name}). Shoot those two.',
    hint: 'List {name}’s direct contacts, then find who they touch in Civilian or Foreigner without touching {name} directly.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['civilian', 'foreigner'], step2Dir: 'any', excludeDirectToAnchor: true
  }),
  makeAnchorCarryRule({
    id: 've-65', domain: 6, title: 'Overt reach from {name}',
    order: 'Start at {name}, follow any link (either way), then follow a Friend or Foe link (not directly linked to {name}). Shoot those two.',
    hint: 'List {name}’s direct contacts, then find who they touch in Friend or Foe without touching {name} directly.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe'], step2Dir: 'any', excludeDirectToAnchor: true
  }),
  makeAnchorCarryRule({
    id: 've-66', domain: 6, title: 'Two steps out of {name} (different roles)',
    order: 'Start at {name} and follow two outgoing arrows in DIFFERENT categories (no return). Shoot the two suspects you reach.',
    hint: 'Follow {name}’s outgoing arrows first, then take an outgoing arrow in a different row from each contact.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out', diffRole: true
  }),
  makeAnchorCarryRule({
    id: 've-67', domain: 6, title: 'Two steps into {name} (different roles)',
    order: 'Follow two outgoing arrows in DIFFERENT categories ending at {name} (no return). Shoot the two suspects who started.',
    hint: 'Work back one arrow into {name}, then work back a second arrow in a different row.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in', diffRole: true
  }),
  makeAnchorCarryRule({
    id: 've-68', domain: 6, title: 'Unwatched second-step from {name}',
    order: 'Follow any two links (either way) from {name} without touching {name} directly — excluding anyone watched by a Spy. Shoot those two.',
    hint: 'Find contacts of {name}’s direct contacts (skipping {name}’s own neighbors), then remove anyone watched by a Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirectToAnchor: true, excOnTarget: {roles: ['spy'], dir: 'in'}
  }),
  makeAnchorCarryRule({
    id: 've-69', domain: 6, title: 'Unbacked second-step from {name}',
    order: 'Follow any two outgoing arrows from {name} (no return) — excluding anyone backed by a Friend. Shoot the two reached.',
    hint: 'Trace two outgoing arrows from {name}, then rule out anyone on the right of Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excOnTarget: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Shared Intermediary around {name} (10 families)
  // =========================================================================
  makeAnchorCarryRule({
    id: 've-70', domain: 7, title: 'Rival targeting {name}’s contact',
    order: 'Find everyone {name} points an arrow to. Shoot the two other suspects who ALSO point an arrow to those same people.',
    hint: 'Check {name}’s outgoing arrows first, then look for other senders pointing to those exact same targets.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in'
  }),
  makeAnchorCarryRule({
    id: 've-71', domain: 7, title: 'Sharing a sender with {name}',
    order: 'Find everyone pointing an arrow at {name}. Shoot the two other suspects whom those same senders ALSO point to.',
    hint: 'Find arrows ending at {name}, then follow other outgoing arrows leaving those same senders.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out'
  }),
  makeAnchorCarryRule({
    id: 've-72', domain: 7, title: 'Hostile rival on {name}’s contact',
    order: 'Find everyone directly linked to {name}. Shoot the two other suspects who oppose (Foe), leak to (Double agent), or handle (Foreigner) them.',
    hint: 'List {name}’s direct contacts, then check who sits on the left of Foe, Double agent, or Foreigner pointing to them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double', 'foreigner'], step2Dir: 'in'
  }),
  makeAnchorCarryRule({
    id: 've-73', domain: 7, title: 'Watched contact shared with {name}',
    order: 'Find everyone directly linked to {name}. Shoot the two other suspects who back (Friend), watch (Spy), or report to (Civilian) them.',
    hint: 'List {name}’s direct contacts, then check who sits on the left of Friend, Spy, or Civilian pointing to them.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'spy', 'civilian'], step2Dir: 'in'
  }),
  makeAnchorCarryRule({
    id: 've-74', domain: 7, title: 'Different-role rival on {name}’s target',
    order: 'Find who {name} points to. Shoot the two other suspects pointing to those same people in a DIFFERENT category.',
    hint: 'Follow {name}’s outgoing arrows, then check other rows for different senders pointing to those same targets.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in', diffRole: true
  }),
  makeAnchorCarryRule({
    id: 've-75', domain: 7, title: 'Different-role twin of {name}',
    order: 'Find who points to {name}. Shoot the two other suspects those same senders point to in a DIFFERENT category.',
    hint: 'Check arrows into {name}, then look in other rows for outgoing arrows from those same senders.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out', diffRole: true
  }),
  makeAnchorCarryRule({
    id: 've-76', domain: 7, title: 'Covert overlap with {name}’s circle',
    order: 'Find everyone linked to {name} in Friend, Foe, or Civilian. Shoot the two other suspects linked to those people in Spy, Double agent, or Foreigner.',
    hint: 'Check {name}’s contacts in Friend, Foe, and Civilian, then look for those contacts in Spy, Double agent, and Foreigner.',
    step1Roles: ['friend', 'foe', 'civilian'], step1Dir: 'any',
    step2Roles: ['spy', 'double', 'foreigner'], step2Dir: 'any'
  }),
  makeAnchorCarryRule({
    id: 've-77', domain: 7, title: 'Overt overlap with {name}’s covert circle',
    order: 'Find everyone linked to {name} in Spy, Double agent, or Foreigner. Shoot the two other suspects linked to those people in Friend, Foe, or Civilian.',
    hint: 'Check {name}’s contacts in Spy, Double agent, and Foreigner, then match them in Friend, Foe, and Civilian.',
    step1Roles: ['spy', 'double', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'civilian'], step2Dir: 'any'
  }),
  makeAnchorCarryRule({
    id: 've-78', domain: 7, title: 'Border link into {name}’s circle',
    order: 'Find everyone linked to {name} in Friend, Foe, Spy, or Double agent. Shoot the two other suspects linked to them in Civilian or Foreigner.',
    hint: 'Find {name}’s contacts in the top four rows, then look for their partners in Civilian or Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double'], step1Dir: 'any',
    step2Roles: ['civilian', 'foreigner'], step2Dir: 'any'
  }),
  makeAnchorCarryRule({
    id: 've-79', domain: 7, title: 'Surveillance on {name}’s target',
    order: 'Find who {name} points to. Shoot the two other suspects linked (either way) to those targets in Spy, Double agent, or Foreigner.',
    hint: 'Follow {name}’s outgoing arrows, then look for those targets in Spy, Double agent, and Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['spy', 'double', 'foreigner'], step2Dir: 'any'
  }),

  // =========================================================================
  // DOMAIN 8: Two-Role Relays & Cut-Out Bridges (10 families)
  // =========================================================================
  makeRelayRule({
    id: 've-80', domain: 8, title: 'Ally-to-mole pipeline',
    order: 'Follow a Friend or Civilian arrow to a middleman, then a Double agent or Foreigner arrow (no returns). Shoot the two at the end.',
    hint: 'Connect the right side of Friend/Civilian to the left side of Double agent/Foreigner, and shoot who ends the chain.',
    step1Roles: ['friend', 'civilian'], step2Roles: ['double', 'foreigner'], pickEnd: 'end'
  }),
  makeRelayRule({
    id: 've-81', domain: 8, title: 'Source of a covert pipeline',
    order: 'Follow a Friend or Spy arrow to a middleman, then a Foe or Double agent arrow (no returns). Shoot the two who started it.',
    hint: 'Connect Friend/Spy into Foe/Double agent (without looping back), and shoot the original senders.',
    step1Roles: ['friend', 'spy'], step2Roles: ['foe', 'double'], pickEnd: 'start'
  }),
  makeRelayRule({
    id: 've-82', domain: 8, title: 'Foreign-to-domestic relay',
    order: 'Follow a Foreigner or Double agent arrow to a middleman, then a Friend or Civilian arrow (no returns). Shoot the two at the end.',
    hint: 'Connect Foreigner/Double agent into Friend/Civilian, and shoot the two final recipients.',
    step1Roles: ['foreigner', 'double'], step2Roles: ['friend', 'civilian'], pickEnd: 'end'
  }),
  makeRelayRule({
    id: 've-83', domain: 8, title: 'Covert middleman',
    order: 'Shoot the two middlemen who receive a Friend or Civilian arrow and pass on a Foe, Double agent, or Foreigner arrow (no return).',
    hint: 'Find suspects sitting on the right of Friend/Civilian and on the left of Foe/Double agent/Foreigner to a third person.',
    step1Roles: ['friend', 'civilian'], step2Roles: ['foe', 'double', 'foreigner'], pickEnd: 'mid'
  }),
  makeRelayRule({
    id: 've-84', domain: 8, title: 'Surveillance relay',
    order: 'Follow a Spy or Civilian arrow to a middleman, then a Friend or Foreigner arrow (no returns). Shoot the two at the end.',
    hint: 'Connect Spy/Civilian into Friend/Foreigner without returning to the start, and shoot the final targets.',
    step1Roles: ['spy', 'civilian'], step2Roles: ['friend', 'foreigner'], pickEnd: 'end'
  }),
  makeRelayRule({
    id: 've-85', domain: 8, title: 'Hostile relay origin',
    order: 'Follow a Foe or Foreigner arrow to a middleman, then a Spy or Double agent arrow (no returns). Shoot the two who started it.',
    hint: 'Connect Foe/Foreigner into Spy/Double agent without looping back, and shoot the starting senders.',
    step1Roles: ['foe', 'foreigner'], step2Roles: ['spy', 'double'], pickEnd: 'start'
  }),
  makeRelayRule({
    id: 've-86', domain: 8, title: 'Double-hop betrayal',
    order: 'Follow two arrows in DIFFERENT categories among Foe, Double agent, and Foreigner (no returns). Shoot the two at the end.',
    hint: 'Chain two different rows among Foe, Double agent, and Foreigner, and shoot the two final targets.',
    step1Roles: ['foe', 'double', 'foreigner'], step2Roles: ['foe', 'double', 'foreigner'], pickEnd: 'end', diffRole: true
  }),
  makeRelayRule({
    id: 've-87', domain: 8, title: 'Covert-to-overt middleman',
    order: 'Shoot the two middlemen who receive a Spy, Double agent, or Foreigner arrow and pass on a Friend or Foe arrow (no return).',
    hint: 'Find who receives a Spy/Double/Foreigner link and sends a Friend/Foe link to someone else.',
    step1Roles: ['spy', 'double', 'foreigner'], step2Roles: ['friend', 'foe'], pickEnd: 'mid'
  }),
  makeRelayRule({
    id: 've-88', domain: 8, title: 'Domestic-to-shadow origin',
    order: 'Follow a Friend, Foe, or Civilian arrow into a Spy, Double agent, or Foreigner arrow (no returns) — excluding watched targets. Shoot the two who started.',
    hint: 'Chain a Friend/Foe/Civilian arrow into a Spy/Double/Foreigner arrow, then rule out senders watched by a Spy.',
    step1Roles: ['friend', 'foe', 'civilian'], step2Roles: ['spy', 'double', 'foreigner'], pickEnd: 'start',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeRelayRule({
    id: 've-89', domain: 8, title: 'Border bridge',
    order: 'Shoot the two middlemen who receive a Foreigner or Foe arrow and send a Spy or Civilian arrow to a third person.',
    hint: 'Match the right side of Foreigner/Foe to the left side of Spy/Civilian (excluding two-person loops).',
    step1Roles: ['foreigner', 'foe'], step2Roles: ['spy', 'civilian'], pickEnd: 'mid'
  }),

  // =========================================================================
  // DOMAIN 9: Indirect Leverage & Reach Rankings (10 families)
  // =========================================================================
  makeIndirectRankRule({
    id: 've-90', domain: 9, title: 'Widest two-step reach',
    order: 'Follow two outgoing arrows in DIFFERENT categories (no returns). Shoot the two senders who reach the most different people.',
    hint: 'For each suspect, trace two outgoing steps in different rows and count distinct endpoints.',
    scoreFn(g, x, proof) {
      const reached = new Set();
      for (const e1 of g.out(x)) {
        for (const e2 of g.out(e1.to)) {
          if (e2.to !== x && e2.role !== e1.role) reached.add(e2.to);
        }
      }
      return {score: reached.size, reason: proof ? x + ' reaches ' + reached.size + ' suspects in 2 steps (' + [...reached].join(', ') + ').' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-91', domain: 9, title: 'Most exposed to two-step approaches',
    order: 'Follow two outgoing arrows in DIFFERENT categories (no returns). Shoot the two targets reached by the most different senders.',
    hint: 'Trace two arrows backward in different rows from each suspect and count distinct starting senders.',
    scoreFn(g, x, proof) {
      const senders = new Set();
      for (const e2 of g.in(x)) {
        for (const e1 of g.in(e2.from)) {
          if (e1.from !== x && e1.role !== e2.role) senders.add(e1.from);
        }
      }
      return {score: senders.size, reason: proof ? x + ' is reached by ' + senders.size + ' senders in 2 steps (' + [...senders].join(', ') + ').' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-92', domain: 9, title: 'Most covertly connected circle',
    order: 'Check every suspect’s direct contacts across all six rows. Shoot the two whose contacts appear most often in Spy, Double agent, and Foreigner.',
    hint: 'List a suspect’s direct contacts, then count how many Spy, Double agent, and Foreigner links touch those contacts.',
    scoreFn(g, x, proof) {
      let score = 0;
      for (const n of g.neighbors(x)) score += g.touch(n, ['spy', 'double', 'foreigner']).length;
      return {score, reason: proof ? x + '’s direct contacts carry ' + score + ' covert/foreign links.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-93', domain: 9, title: 'Most hostile neighborhood',
    order: 'Check every suspect’s direct contacts. Shoot the two whose contacts have the most Foe and Double agent links.',
    hint: 'For each suspect, tally all Foe and Double agent appearances among their direct contacts.',
    scoreFn(g, x, proof) {
      let score = 0;
      for (const n of g.neighbors(x)) score += g.touch(n, ['foe', 'double']).length;
      return {score, reason: proof ? x + '’s contacts hold ' + score + ' Foe/Double agent links.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-94', domain: 9, title: 'Deepest Friend & Civilian circle',
    order: 'Check every suspect’s direct contacts. Shoot the two whose contacts have the most Friend and Civilian links.',
    hint: 'List a suspect’s direct contacts, then count how many Friend and Civilian links touch them.',
    scoreFn(g, x, proof) {
      let score = 0;
      for (const n of g.neighbors(x)) score += g.touch(n, ['friend', 'civilian']).length;
      return {score, reason: proof ? x + '’s contacts hold ' + score + ' Friend/Civilian links.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-95', domain: 9, title: 'Broadest second-ring reach',
    order: 'Count how many DIFFERENT suspects sit two links away (either way, not directly linked). Shoot the top two.',
    hint: 'Find contacts of each suspect’s direct contacts, excluding the suspect and their direct contacts.',
    scoreFn(g, x, proof) {
      const direct = new Set([x, ...g.neighbors(x)]);
      const ring2 = new Set();
      for (const n of g.neighbors(x)) {
        for (const m of g.neighbors(n)) if (!direct.has(m)) ring2.add(m);
      }
      return {score: ring2.size, reason: proof ? x + ' has ' + ring2.size + ' second-ring contacts (' + [...ring2].join(', ') + ').' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-96', domain: 9, title: 'Most surveilled associates',
    order: 'Check every suspect’s direct contacts. Shoot the two whose contacts are watched by the most Spies or handled by the most Foreigners.',
    hint: 'For each suspect, check their direct contacts on the right side of Spy and Foreigner.',
    scoreFn(g, x, proof) {
      let score = 0;
      for (const n of g.neighbors(x)) score += g.in(n, ['spy', 'foreigner']).length;
      return {score, reason: proof ? x + '’s contacts receive ' + score + ' Spy/Foreigner links.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-97', domain: 9, title: 'Key covert hub',
    order: 'Follow two outgoing arrows where at least one is Spy, Double agent, or Foreigner (no returns). Shoot the two senders reaching the most people.',
    hint: 'Trace two outgoing steps with at least one covert/foreign step and count distinct endpoints.',
    scoreFn(g, x, proof) {
      const cov = new Set(['spy', 'double', 'foreigner']);
      const reached = new Set();
      for (const e1 of g.out(x)) {
        for (const e2 of g.out(e1.to)) {
          if (e2.to !== x && (cov.has(e1.role) || cov.has(e2.role))) reached.add(e2.to);
        }
      }
      return {score: reached.size, reason: proof ? x + ' reaches ' + reached.size + ' suspects via covert/foreign 2-step chains.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-98', domain: 9, title: 'Most vulnerable to covert chains',
    order: 'Follow two outgoing arrows where at least one is Foe, Double agent, or Foreigner (no returns). Shoot the two targets hit by the most senders.',
    hint: 'Trace two steps back with at least one Foe, Double agent, or Foreigner step and count distinct senders.',
    scoreFn(g, x, proof) {
      const hot = new Set(['foe', 'double', 'foreigner']);
      const senders = new Set();
      for (const e2 of g.in(x)) {
        for (const e1 of g.in(e2.from)) {
          if (e1.from !== x && (hot.has(e1.role) || hot.has(e2.role))) senders.add(e1.from);
        }
      }
      return {score: senders.size, reason: proof ? x + ' is targeted by ' + senders.size + ' senders via 2-step hostile chains.' : ''};
    }
  }),
  makeIndirectRankRule({
    id: 've-99', domain: 9, title: 'Heaviest operational footprint',
    order: 'Count each suspect’s own links PLUS how many different categories their direct contacts appear in. Shoot the top two.',
    hint: 'Add a suspect’s own link count to the number of distinct categories held by their direct contacts.',
    scoreFn(g, x, proof) {
      const own = g.touch(x).length;
      const roles = new Set();
      for (const n of g.neighbors(x)) for (const r of g.distinctRoles(n)) roles.add(r);
      const score = own + roles.size;
      return {score, reason: proof ? x + ' scores ' + score + ' (' + own + ' own links + ' + roles.size + ' neighbor categories).' : ''};
    }
  })
];
