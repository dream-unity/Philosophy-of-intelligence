import {collectMatches, pickHighest} from './case-graph.js';
import {roleNames} from './case-layout.js';

// 100 genuinely distinct Super Easy operational families (10 domains × 10 families).
// Calibrated to immediate, single-stage intelligence judgments with real cognitive conflict
// (direction, specific category distinction, or explicit exception) — zero Safe/Threat binary collapse.

function hasPred(g, name, spec) {
  const {roles, dir = 'any'} = spec;
  if (dir === 'out') return g.out(name, roles);
  if (dir === 'in') return g.in(name, roles);
  return g.touch(name, roles);
}

function makeDirectRule({id, domain, title, order, hint, inc, req = null, exc = null, minDistinct = 0, useAnchor = false}) {
  return {
    id,
    tier: 'super-easy',
    domain,
    title,
    order,
    hint,
    useAnchor,
    evaluate(g, anchor, includeProof) {
      return collectMatches(g.people, name => {
        if (useAnchor && name === anchor) return null;
        const aEdges = hasPred(g, name, inc);
        if (!aEdges.length) return null;
        if (minDistinct > 0 && new Set(aEdges.map(e => e.role)).size < minDistinct) return null;
        let bEdges = null;
        if (req) {
          bEdges = hasPred(g, name, req);
          if (!bEdges.length) return null;
        }
        if (exc && hasPred(g, name, exc).length) return null;
        if (!includeProof) return 'ok';
        const parts = [g.fmt(aEdges[0])];
        if (minDistinct > 1) {
          const second = aEdges.find(e => e.role !== aEdges[0].role);
          if (second) parts.push(g.fmt(second));
        }
        if (bEdges) parts.push(g.fmt(bEdges[0]));
        return name + ': ' + parts.join(' · ') + '.';
      }, includeProof);
    }
  };
}

function makeAnchorDirectRule({id, domain, title, order, hint, incRoles, incDir = 'any', excRoles = null, excDir = 'any', extraReq = null, extraExc = null}) {
  return {
    id,
    tier: 'super-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: true,
    evaluate(g, anchor, includeProof) {
      return collectMatches(g.people, name => {
        if (name === anchor) return null;
        const links = incDir === 'out'
          ? g.direct(anchor, name, incRoles)
          : incDir === 'in'
            ? g.direct(name, anchor, incRoles)
            : g.between(anchor, name, incRoles);
        if (!links.length) return null;
        if (excRoles) {
          const bad = excDir === 'out'
            ? g.direct(anchor, name, excRoles)
            : excDir === 'in'
              ? g.direct(name, anchor, excRoles)
              : g.between(anchor, name, excRoles);
          if (bad.length) return null;
        }
        let exEdge = null;
        if (extraReq) {
          const found = hasPred(g, name, extraReq);
          if (!found.length) return null;
          exEdge = found[0];
        }
        if (extraExc && hasPred(g, name, extraExc).length) return null;
        if (!includeProof) return 'ok';
        return name + ': ' + g.fmt(links[0]) + (exEdge ? ' · ' + g.fmt(exEdge) : '') + '.';
      }, includeProof);
    }
  };
}

function makeRankRule({id, domain, title, order, hint, scoreFn, minScore = 1}) {
  return {
    id,
    tier: 'super-easy',
    domain,
    title,
    order,
    hint,
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      return pickHighest(g.people, name => scoreFn(g, name, includeProof), includeProof, minScore);
    }
  };
}

export const superEasyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-00', domain: 0, title: 'Traitor in the ranks',
    order: 'Shoot the two suspects named in Friend records who also appear in Double agent or Foreigner records.',
    hint: 'Find everyone in Friend first, then check which two also show up in Double agent or Foreigner.',
    inc: {roles: ['friend']}, req: {roles: ['double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-01', domain: 0, title: 'False backing',
    order: 'Shoot the two suspects who back someone as a Friend while also appearing in Foe or Double agent records.',
    hint: 'Only check names on the left of Friend (the backer), then look for them in Foe or Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'double']}
  }),
  makeDirectRule({
    id: 'se-02', domain: 0, title: 'Compromised ally',
    order: 'Shoot the two suspects backed by a Friend who also oppose someone as a Foe or handle a Foreigner asset.',
    hint: 'Start with names on the right of Friend, then check who sits on the left of Foe or Foreigner.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-03', domain: 0, title: 'Unprotected mole',
    order: 'Shoot the two suspects named in Double agent records who have NO Friend backing them.',
    hint: 'List everyone in Double agent, then cross off anyone on the right of a Friend arrow.',
    inc: {roles: ['double']}, exc: {roles: ['friend'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-04', domain: 0, title: 'Bitter ally',
    order: 'Shoot the two suspects named in both Friend and Foe records, excluding anyone watched by a Spy.',
    hint: 'Find who appears in both Friend and Foe, then rule out anyone on the right of Spy.',
    inc: {roles: ['friend']}, req: {roles: ['foe']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-05', domain: 0, title: 'Active traitor',
    order: 'Shoot the two suspects who leak as a Double agent or oppose as a Foe — excluding anyone who backs a Friend.',
    hint: 'Check the left side of Double agent and Foe, then cross off anyone on the left of Friend.',
    inc: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-06', domain: 0, title: 'Leak recipient',
    order: 'Shoot the two suspects receiving a Double agent leak or Foreigner handling, unless a Friend backs them.',
    hint: 'Check the right side of Double agent and Foreigner, then exclude anyone on the right of Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-07', domain: 0, title: 'Covert turncoat',
    order: 'Shoot the two suspects who appear in Spy records AND also in Double agent or Foe records.',
    hint: 'Start with everyone in Spy, then keep only those also named in Double agent or Foe.',
    inc: {roles: ['spy']}, req: {roles: ['double', 'foe']}
  }),
  makeDirectRule({
    id: 'se-08', domain: 0, title: 'Openly trusted, secretly leaked',
    order: 'Shoot the two suspects named in Friend or Civilian records who also receive a Double agent leak or Foe attack.',
    hint: 'Find who sits on the right of Double agent or Foe, then keep those also in Friend or Civilian.',
    inc: {roles: ['double', 'foe'], dir: 'in'}, req: {roles: ['friend', 'civilian']}
  }),
  makeDirectRule({
    id: 'se-09', domain: 0, title: 'Friendless adversary',
    order: 'Shoot the two suspects named in Foe records who never appear in Friend or Civilian records.',
    hint: 'Check everyone in Foe, then remove anyone who appears anywhere in Friend or Civilian.',
    inc: {roles: ['foe']}, exc: {roles: ['friend', 'civilian']}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-10', domain: 1, title: 'Unwatched foreign asset',
    order: 'Shoot the two suspects named in Foreigner records whom no Spy is watching.',
    hint: 'Check everyone in Foreigner, then rule out anyone on the right of a Spy arrow.',
    inc: {roles: ['foreigner']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-11', domain: 1, title: 'Watched and hostile',
    order: 'Shoot the two suspects watched by a Spy who also appear in Foe, Double agent, or Foreigner records.',
    hint: 'Start with names on the right of Spy, then check Foe, Double agent, and Foreigner.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['foe', 'double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-12', domain: 1, title: 'Blind-spot mole',
    order: 'Shoot the two suspects who leak as a Double agent or handle a Foreigner asset, with no Spy watching them.',
    hint: 'Look on the left of Double agent and Foreigner, then drop anyone on the right of Spy.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-13', domain: 1, title: 'Compromised watcher',
    order: 'Shoot the two suspects watching someone as a Spy who also appear in Foe, Double agent, or Foreigner records.',
    hint: 'Check names on the left of Spy, then see which two also show up in Foe, Double agent, or Foreigner.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foe', 'double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-14', domain: 1, title: 'Off-grid adversary',
    order: 'Shoot the two suspects who oppose someone as a Foe while appearing nowhere in Spy records.',
    hint: 'Check the left of Foe, then cross off anyone mentioned anywhere in Spy.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['spy']}
  }),
  makeDirectRule({
    id: 'se-15', domain: 1, title: 'Surveilled witness',
    order: 'Shoot the two suspects named in Spy records who also appear in Civilian records.',
    hint: 'Compare Spy and Civilian to find the two names appearing in both rows.',
    inc: {roles: ['spy']}, req: {roles: ['civilian']}
  }),
  makeDirectRule({
    id: 'se-16', domain: 1, title: 'Silent target',
    order: 'Shoot the two suspects watched by a Spy who never back a Friend and never report as a Civilian.',
    hint: 'Start with names on the right of Spy, then exclude anyone on the left of Friend or Civilian.',
    inc: {roles: ['spy'], dir: 'in'}, exc: {roles: ['friend', 'civilian'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-17', domain: 1, title: 'Unmonitored leak',
    order: 'Shoot the two suspects named in Double agent records who never appear in Spy records.',
    hint: 'Take everyone in Double agent and remove anyone named anywhere in Spy.',
    inc: {roles: ['double']}, exc: {roles: ['spy']}
  }),
  makeDirectRule({
    id: 'se-18', domain: 1, title: 'Watched without cover',
    order: 'Shoot the two suspects named in Spy records who have no Friend backing and no Civilian link.',
    hint: 'Check everyone in Spy, then cross off anyone backed by a Friend or named in Civilian.',
    inc: {roles: ['spy']}, exc: {roles: ['friend', 'civilian']}
  }),
  makeDirectRule({
    id: 'se-19', domain: 1, title: 'Surveillance overlap',
    order: 'Shoot the two suspects who appear in Spy AND in either Friend or Foreigner — excluding Double agents.',
    hint: 'Start with Spy, keep names also in Friend or Foreigner, then drop anyone in Double agent.',
    inc: {roles: ['spy']}, req: {roles: ['friend', 'foreigner']}, exc: {roles: ['double']}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Infiltration (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-20', domain: 2, title: 'Foreigner on the inside',
    order: 'Shoot the two suspects named in Foreigner records who also appear in Friend or Spy records.',
    hint: 'Check everyone in Foreigner, then keep only those also named in Friend or Spy.',
    inc: {roles: ['foreigner']}, req: {roles: ['friend', 'spy']}
  }),
  makeDirectRule({
    id: 'se-21', domain: 2, title: 'Foreigner-civilian bridge',
    order: 'Shoot the two suspects named in Foreigner records who also appear in Civilian or Double agent records.',
    hint: 'Start with Foreigner, then match against Civilian and Double agent.',
    inc: {roles: ['foreigner']}, req: {roles: ['civilian', 'double']}
  }),
  makeDirectRule({
    id: 'se-22', domain: 2, title: 'Unchecked handler',
    order: 'Shoot the two suspects handling someone as a Foreigner or leaking as a Double agent, without being opposed by a Foe.',
    hint: 'Check the left side of Foreigner and Double agent, then exclude anyone on the right of Foe.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-23', domain: 2, title: 'Recruited asset',
    order: 'Shoot the two suspects handled by a Foreigner or opposed by a Foe, excluding anyone in Civilian records.',
    hint: 'Look on the right of Foreigner and Foe, then rule out anyone named in Civilian.',
    inc: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['civilian']}
  }),
  makeDirectRule({
    id: 'se-24', domain: 2, title: 'Border threat',
    order: 'Shoot the two suspects named in Foreigner records who never appear in Friend records.',
    hint: 'List everyone in Foreigner, then drop anyone who appears anywhere in Friend.',
    inc: {roles: ['foreigner']}, exc: {roles: ['friend']}
  }),
  makeDirectRule({
    id: 'se-25', domain: 2, title: 'Foreign backing',
    order: 'Shoot the two suspects handled by a Foreigner who also appear in Friend, Spy, or Civilian records.',
    hint: 'Start with names on the right of Foreigner, then check Friend, Spy, and Civilian.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['friend', 'spy', 'civilian']}
  }),
  makeDirectRule({
    id: 'se-26', domain: 2, title: 'External operator',
    order: 'Shoot the two suspects who handle someone as a Foreigner, or oppose someone as a Foe, while never watched by a Spy.',
    hint: 'Check the left side of Foreigner and Foe, then cross off anyone on the right of Spy.',
    inc: {roles: ['foreigner', 'foe'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-27', domain: 2, title: 'Foreigner and Foe',
    order: 'Shoot the two suspects appearing in Foreigner AND in Foe or Double agent records.',
    hint: 'Start with Foreigner, then keep only names also found in Foe or Double agent.',
    inc: {roles: ['foreigner']}, req: {roles: ['foe', 'double']}
  }),
  makeDirectRule({
    id: 'se-28', domain: 2, title: 'Clean border suspect',
    order: 'Shoot the two suspects named in Foreigner records who have no Civilian report and no Double agent link.',
    hint: 'Check Foreigner first, then remove anyone appearing in Civilian or Double agent.',
    inc: {roles: ['foreigner']}, exc: {roles: ['civilian', 'double']}
  }),
  makeDirectRule({
    id: 'se-29', domain: 2, title: 'Recruiter in plain sight',
    order: 'Shoot the two suspects acting on the left of Foreigner or Friend — excluding anyone opposed by a Foe.',
    hint: 'Check names on the left of Foreigner and Friend, then exclude anyone on the right of Foe.',
    inc: {roles: ['foreigner', 'friend'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Exposure (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-30', domain: 3, title: 'Compromised civilian',
    order: 'Shoot the two suspects named in Civilian records who also appear in Foe, Double agent, or Foreigner records.',
    hint: 'Start with everyone in Civilian, then check Foe, Double agent, and Foreigner.',
    inc: {roles: ['civilian']}, req: {roles: ['foe', 'double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-31', domain: 3, title: 'Unwatched witness',
    order: 'Shoot the two Civilians (reporting to someone) or Friends (backing someone) whom NO Spy is watching.',
    hint: 'Check the left side of Civilian and Friend, then remove anyone on the right of Spy.',
    inc: {roles: ['civilian', 'friend'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-32', domain: 3, title: 'Civilian handler under suspicion',
    order: 'Shoot the two suspects receiving a Civilian report who also appear in Spy, Double agent, or Foreigner records.',
    hint: 'Start with names on the right of Civilian, then check Spy, Double agent, and Foreigner.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['spy', 'double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-33', domain: 3, title: 'Unvetted witness',
    order: 'Shoot the two suspects named in Civilian records who have NO Friend link and NO Spy link.',
    hint: 'Check Civilian first, then cross off anyone appearing anywhere in Friend or Spy.',
    inc: {roles: ['civilian']}, exc: {roles: ['friend', 'spy']}
  }),
  makeDirectRule({
    id: 'se-34', domain: 3, title: 'Civilian cover',
    order: 'Shoot the two suspects reporting as a Civilian or backing a Friend who also appear in Double agent or Foreigner records.',
    hint: 'Check left of Civilian and left of Friend, then match against Double agent and Foreigner.',
    inc: {roles: ['civilian', 'friend'], dir: 'out'}, req: {roles: ['double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-35', domain: 3, title: 'No civilian alibi',
    order: 'Shoot the two suspects receiving a Double agent leak or Foe attack who never appear in Civilian records.',
    hint: 'Check right of Double agent and right of Foe, then drop anyone in Civilian.',
    inc: {roles: ['double', 'foe'], dir: 'in'}, exc: {roles: ['civilian']}
  }),
  makeDirectRule({
    id: 'se-36', domain: 3, title: 'Exposed bystander',
    order: 'Shoot the two suspects named in Civilian AND Friend records (or Civilian AND Foe records) — excluding Spies.',
    hint: 'Check Civilian names also in Friend or Foe, then remove anyone in Spy.',
    inc: {roles: ['civilian']}, req: {roles: ['friend', 'foe']}, exc: {roles: ['spy']}
  }),
  makeDirectRule({
    id: 'se-37', domain: 3, title: 'Civilian contact in the dark',
    order: 'Shoot the two suspects receiving a Civilian report or Friend backing who are ALSO targeted on the right of Foe or Foreigner.',
    hint: 'Find who sits on the right of Civilian or Friend, then check the right of Foe and Foreigner.',
    inc: {roles: ['civilian', 'friend'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-38', domain: 3, title: 'Witness with covert ties',
    order: 'Shoot the two suspects named in Civilian records who also appear in Spy or Double agent records.',
    hint: 'List everyone in Civilian, then keep only those also named in Spy or Double agent.',
    inc: {roles: ['civilian']}, req: {roles: ['spy', 'double']}
  }),
  makeDirectRule({
    id: 'se-39', domain: 3, title: 'Unprotected witness',
    order: 'Shoot the two suspects named in Civilian records who are NOT backed by a Friend.',
    hint: 'Check everyone in Civilian, then drop anyone sitting on the right of Friend.',
    inc: {roles: ['civilian']}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy & Cut-Outs (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-40', domain: 4, title: 'Covert conduit',
    order: 'Shoot the two suspects who BOTH receive a link and send a link across Spy, Double agent, and Foreigner.',
    hint: 'Look across Spy, Double agent, and Foreigner for names appearing on both left and right sides.',
    inc: {roles: ['spy', 'double', 'foreigner'], dir: 'in'}, req: {roles: ['spy', 'double', 'foreigner'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-41', domain: 4, title: 'Overt-to-covert courier',
    order: 'Shoot the two suspects receiving a Friend or Civilian link who also send a Double agent or Foreigner link.',
    hint: 'Find names on the right of Friend or Civilian who sit on the left of Double agent or Foreigner.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-42', domain: 4, title: 'Covert-to-overt relay',
    order: 'Shoot the two suspects receiving a Spy or Double agent link who also send a Friend or Foe link.',
    hint: 'Find names on the right of Spy or Double agent who sit on the left of Friend or Foe.',
    inc: {roles: ['spy', 'double'], dir: 'in'}, req: {roles: ['friend', 'foe'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-43', domain: 4, title: 'Border-to-interior relay',
    order: 'Shoot the two suspects receiving a Foreigner or Civilian link who also send a Spy or Foe link.',
    hint: 'Match the right side of Foreigner or Civilian with the left side of Spy or Foe.',
    inc: {roles: ['foreigner', 'civilian'], dir: 'in'}, req: {roles: ['spy', 'foe'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-44', domain: 4, title: 'Double-sided operator',
    order: 'Shoot the two suspects who BOTH receive a Foe or Foreigner link AND send a Friend or Spy link.',
    hint: 'Find names on the right of Foe or Foreigner who also sit on the left of Friend or Spy.',
    inc: {roles: ['foe', 'foreigner'], dir: 'in'}, req: {roles: ['friend', 'spy'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-45', domain: 4, title: 'One-way dead drop',
    order: 'Shoot the two suspects who receive links in at least two different roles while never sending ANY link.',
    hint: 'Check suspects who only appear on the right side of arrows, and in two or more different rows.',
    inc: {roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], dir: 'in'},
    exc: {roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], dir: 'out'},
    minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-46', domain: 4, title: 'Pure instigator',
    order: 'Shoot the two suspects who send links in at least two different roles while never receiving ANY link.',
    hint: 'Find suspects who only appear on the left side of arrows, across two or more different rows.',
    inc: {roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], dir: 'out'},
    exc: {roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], dir: 'in'},
    minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-47', domain: 4, title: 'Leak-to-witness handler',
    order: 'Shoot the two suspects receiving a Double agent leak who also send a Civilian, Spy, or Friend link.',
    hint: 'Start with names on the right of Double agent, then check the left of Civilian, Spy, and Friend.',
    inc: {roles: ['double'], dir: 'in'}, req: {roles: ['civilian', 'spy', 'friend'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-48', domain: 4, title: 'Watched operator',
    order: 'Shoot the two suspects watched by a Spy who also act on the left of Friend, Foe, or Foreigner.',
    hint: 'Check the right of Spy, then find which two sit on the left of Friend, Foe, or Foreigner.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['friend', 'foe', 'foreigner'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-49', domain: 4, title: 'Active covert sender',
    order: 'Shoot the two suspects who send links in at least two different roles among Foe, Spy, Double agent, and Foreigner.',
    hint: 'Scan the left sides of Foe, Spy, Double agent, and Foreigner for names appearing in two different rows.',
    inc: {roles: ['foe', 'spy', 'double', 'foreigner'], dir: 'out'},
    minDistinct: 2
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-50', domain: 5, title: 'Broken alibi',
    order: 'Shoot the two suspects backed by a Friend who ALSO receive a Foe attack or Double agent leak.',
    hint: 'Find names on the right of Friend, then check the right of Foe and Double agent.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe', 'double'], dir: 'in'}
  }),
  makeDirectRule({
    id: 'se-51', domain: 5, title: 'Two-faced loyalty',
    order: 'Shoot the two suspects who back someone as a Friend AND also oppose someone as a Foe or leak as a Double agent.',
    hint: 'Compare the left side of Friend against the left side of Foe and Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-52', domain: 5, title: 'Watcher turned mole',
    order: 'Shoot the two suspects appearing in Spy records who ALSO leak as a Double agent or handle a Foreigner asset.',
    hint: 'Check everyone in Spy, then look on the left of Double agent and Foreigner.',
    inc: {roles: ['spy']}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-53', domain: 5, title: 'Hostile under civilian cover',
    order: 'Shoot the two suspects appearing in Civilian records who ALSO oppose as a Foe or leak as a Double agent.',
    hint: 'Start with Civilian, then check the left side of Foe and Double agent.',
    inc: {roles: ['civilian']}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  makeDirectRule({
    id: 'se-54', domain: 5, title: 'Unbacked suspect',
    order: 'Shoot the two suspects appearing in at least two of Foe, Double agent, and Foreigner — with NO Friend link.',
    hint: 'Check Foe, Double agent, and Foreigner for repeats, then rule out anyone in Friend.',
    inc: {roles: ['foe', 'double', 'foreigner']}, exc: {roles: ['friend']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-55', domain: 5, title: 'Clear on paper only',
    order: 'Shoot the two suspects named in Friend AND Civilian, OR Friend AND Spy — excluding anyone in Foe.',
    hint: 'Find Friend names also in Civilian or Spy, then cross off anyone in Foe.',
    inc: {roles: ['friend']}, req: {roles: ['civilian', 'spy']}, exc: {roles: ['foe']}
  }),
  makeDirectRule({
    id: 'se-56', domain: 5, title: 'Overt clash',
    order: 'Shoot the two suspects appearing in BOTH Friend and Foe records.',
    hint: 'Compare the Friend row and the Foe row to find the two names in both.',
    inc: {roles: ['friend']}, req: {roles: ['foe']}
  }),
  makeDirectRule({
    id: 'se-57', domain: 5, title: 'Covert clash',
    order: 'Shoot the two suspects appearing in BOTH Spy and Double agent records.',
    hint: 'Compare Spy and Double agent to find the two suspects named in both rows.',
    inc: {roles: ['spy']}, req: {roles: ['double']}
  }),
  makeDirectRule({
    id: 'se-58', domain: 5, title: 'Border clash',
    order: 'Shoot the two suspects appearing in BOTH Civilian and Foreigner records.',
    hint: 'Compare Civilian and Foreigner to spot the two suspects named in both rows.',
    inc: {roles: ['civilian']}, req: {roles: ['foreigner']}
  }),
  makeDirectRule({
    id: 'se-59', domain: 5, title: 'Friend of a hostile front',
    order: 'Shoot the two suspects named in Friend records who also appear in Foreigner or Foe — excluding Civilians.',
    hint: 'Find Friend names also in Foreigner or Foe, then rule out anyone in Civilian.',
    inc: {roles: ['friend']}, req: {roles: ['foreigner', 'foe']}, exc: {roles: ['civilian']}
  }),

  // =========================================================================
  // DOMAIN 6: Perspective & Scope (10 families — anchored to {name})
  // =========================================================================
  makeAnchorDirectRule({
    id: 'se-60', domain: 6, title: 'Direct circle under fire',
    order: 'Shoot the two suspects directly linked to {name} in any row EXCEPT Friend.',
    hint: 'Find every arrow touching {name} across all six rows, then ignore any link in Friend.',
    incRoles: ['foe', 'spy', 'double', 'civilian', 'foreigner'], excRoles: ['friend']
  }),
  makeAnchorDirectRule({
    id: 'se-61', domain: 6, title: 'Covert contacts of {name}',
    order: 'Shoot the two suspects directly linked to {name} in Spy, Double agent, Foreigner, or Foe — excluding Civilian links.',
    hint: 'Check {name}’s contacts in Foe, Spy, Double agent, and Foreigner; skip anyone linked to {name} in Civilian.',
    incRoles: ['foe', 'spy', 'double', 'foreigner'], excRoles: ['civilian']
  }),
  makeAnchorDirectRule({
    id: 'se-62', domain: 6, title: 'Who {name} reaches out to',
    order: 'Shoot the two suspects whom {name} directly points to (left → right) in any row.',
    hint: 'Look only for arrows starting with {name} on the left side across all six rows.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], incDir: 'out'
  }),
  makeAnchorDirectRule({
    id: 'se-63', domain: 6, title: 'Who closes in on {name}',
    order: 'Shoot the two suspects pointing directly at {name} (left → right) in any row.',
    hint: 'Look only for arrows ending with {name} on the right side across all six rows.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], incDir: 'in'
  }),
  makeAnchorDirectRule({
    id: 'se-64', domain: 6, title: 'Hostile contacts around {name}',
    order: 'Shoot the two suspects directly linked to {name} who ALSO appear somewhere in Foe, Double agent, or Foreigner.',
    hint: 'List everyone linked to {name}, then keep those who also show up in Foe, Double agent, or Foreigner.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    extraReq: {roles: ['foe', 'double', 'foreigner']}
  }),
  makeAnchorDirectRule({
    id: 'se-65', domain: 6, title: 'Unwatched contacts of {name}',
    order: 'Shoot the two suspects directly linked to {name} whom NO Spy is watching.',
    hint: 'Find everyone connected to {name}, then rule out anyone on the right of Spy.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    extraExc: {roles: ['spy'], dir: 'in'}
  }),
  makeAnchorDirectRule({
    id: 'se-66', domain: 6, title: 'Unbacked contacts of {name}',
    order: 'Shoot the two suspects directly linked to {name} who have NO Friend backing them.',
    hint: 'Find everyone connected to {name}, then remove anyone on the right of Friend.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    extraExc: {roles: ['friend'], dir: 'in'}
  }),
  makeAnchorDirectRule({
    id: 'se-67', domain: 6, title: 'Overt & border ties to {name}',
    order: 'Shoot the two suspects directly linked to {name} in Friend, Foe, Civilian, or Foreigner — excluding Spy links.',
    hint: 'Check {name}’s links in Friend, Foe, Civilian, and Foreigner; ignore anyone linked to {name} in Spy.',
    incRoles: ['friend', 'foe', 'civilian', 'foreigner'], excRoles: ['spy']
  }),
  makeAnchorDirectRule({
    id: 'se-68', domain: 6, title: 'Contacts of {name} with civilian cover',
    order: 'Shoot the two suspects directly linked to {name} who ALSO appear somewhere in Friend or Civilian.',
    hint: 'List everyone linked to {name}, then check which two also appear in Friend or Civilian.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    extraReq: {roles: ['friend', 'civilian']}
  }),
  makeAnchorDirectRule({
    id: 'se-69', domain: 6, title: 'Active operators tied to {name}',
    order: 'Shoot the two suspects directly linked to {name} who also act on the left of Foe, Spy, Double agent, or Foreigner.',
    hint: 'Find {name}’s direct contacts, then keep those sitting on the left of Foe, Spy, Double agent, or Foreigner.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    extraReq: {roles: ['foe', 'spy', 'double', 'foreigner'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Testimony & Multi-Row Corroboration (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-70', domain: 7, title: 'Multiple covert mentions',
    order: 'Shoot the two suspects appearing in at least two different rows among Foe, Double agent, and Foreigner.',
    hint: 'Check Foe, Double agent, and Foreigner to find names appearing in two or more of those rows.',
    inc: {roles: ['foe', 'double', 'foreigner']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-71', domain: 7, title: 'Double-checked clearance',
    order: 'Shoot the two suspects appearing in at least two different rows among Friend, Spy, and Civilian — excluding anyone in Foe.',
    hint: 'Find repeats across Friend, Spy, and Civilian, then rule out anyone named in Foe.',
    inc: {roles: ['friend', 'spy', 'civilian']}, exc: {roles: ['foe']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-72', domain: 7, title: 'Shadow-channel overlap',
    order: 'Shoot the two suspects appearing in at least two different rows among Spy, Double agent, and Foreigner.',
    hint: 'Scan Spy, Double agent, and Foreigner for names appearing in two or more of those rows.',
    inc: {roles: ['spy', 'double', 'foreigner']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-73', domain: 7, title: 'Domestic overlap',
    order: 'Shoot the two suspects appearing in at least two different rows among Friend, Foe, and Civilian.',
    hint: 'Scan Friend, Foe, and Civilian for names appearing in two or more of those rows.',
    inc: {roles: ['friend', 'foe', 'civilian']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-74', domain: 7, title: 'Twice targeted',
    order: 'Shoot the two suspects sitting on the right side in at least two different rows among Foe, Spy, Double agent, and Foreigner.',
    hint: 'Check the right side of Foe, Spy, Double agent, and Foreigner for names hit in two different rows.',
    inc: {roles: ['foe', 'spy', 'double', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-75', domain: 7, title: 'Twice vouched or watched',
    order: 'Shoot the two suspects sitting on the right side in at least two different rows among Friend, Spy, and Civilian.',
    hint: 'Check the right side of Friend, Spy, and Civilian for names appearing in two different rows.',
    inc: {roles: ['friend', 'spy', 'civilian'], dir: 'in'}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-76', domain: 7, title: 'Covert & border actor',
    order: 'Shoot the two suspects appearing in at least two of Spy, Civilian, and Foreigner — excluding anyone in Friend.',
    hint: 'Find repeats across Spy, Civilian, and Foreigner, then rule out anyone in Friend.',
    inc: {roles: ['spy', 'civilian', 'foreigner']}, exc: {roles: ['friend']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-77', domain: 7, title: 'Hostile & witness overlap',
    order: 'Shoot the two suspects appearing in at least two of Foe, Double agent, and Civilian — excluding anyone in Spy.',
    hint: 'Check Foe, Double agent, and Civilian for names in two rows, then drop anyone in Spy.',
    inc: {roles: ['foe', 'double', 'civilian']}, exc: {roles: ['spy']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-78', domain: 7, title: 'Overt & foreign overlap',
    order: 'Shoot the two suspects appearing in at least two of Friend, Foe, and Foreigner — excluding anyone in Double agent.',
    hint: 'Check Friend, Foe, and Foreigner for names in two rows, then drop anyone in Double agent.',
    inc: {roles: ['friend', 'foe', 'foreigner']}, exc: {roles: ['double']}, minDistinct: 2
  }),
  makeDirectRule({
    id: 'se-79', domain: 7, title: 'All-front repeat',
    order: 'Shoot the two suspects appearing in at least three different rows across the whole dossier.',
    hint: 'Count how many distinct rows each suspect appears in across all six categories.',
    inc: {roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner']}, minDistinct: 3
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives & Pure Profiles (10 families)
  // =========================================================================
  makeDirectRule({
    id: 'se-80', domain: 8, title: 'Purely covert',
    order: 'Shoot the two suspects who appear in Spy or Double agent records, and NOWHERE in Friend, Foe, Civilian, or Foreigner.',
    hint: 'Check Spy and Double agent, then eliminate anyone appearing in any of the other four rows.',
    inc: {roles: ['spy', 'double']}, exc: {roles: ['friend', 'foe', 'civilian', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-81', domain: 8, title: 'Purely border',
    order: 'Shoot the two suspects who appear in Civilian or Foreigner records, and NOWHERE in Friend, Foe, Spy, or Double agent.',
    hint: 'Check Civilian and Foreigner, then rule out anyone named in the top four rows.',
    inc: {roles: ['civilian', 'foreigner']}, exc: {roles: ['friend', 'foe', 'spy', 'double']}
  }),
  makeDirectRule({
    id: 'se-82', domain: 8, title: 'Purely overt',
    order: 'Shoot the two suspects who appear in Friend or Foe records, and NOWHERE in Spy, Double agent, Civilian, or Foreigner.',
    hint: 'Check Friend and Foe, then rule out anyone named in the bottom four rows.',
    inc: {roles: ['friend', 'foe']}, exc: {roles: ['spy', 'double', 'civilian', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-83', domain: 8, title: 'Shadow-only threat',
    order: 'Shoot the two suspects named in Foe, Double agent, or Foreigner who NEVER appear in Friend, Spy, or Civilian.',
    hint: 'Check Foe, Double agent, and Foreigner, then remove anyone in Friend, Spy, or Civilian.',
    inc: {roles: ['foe', 'double', 'foreigner']}, exc: {roles: ['friend', 'spy', 'civilian']}
  }),
  makeDirectRule({
    id: 'se-84', domain: 8, title: 'No covert footprint',
    order: 'Shoot the two suspects named in Friend or Civilian who NEVER appear in Spy, Double agent, or Foreigner.',
    hint: 'Check Friend and Civilian, then eliminate anyone named in Spy, Double agent, or Foreigner.',
    inc: {roles: ['friend', 'civilian']}, exc: {roles: ['spy', 'double', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-85', domain: 8, title: 'No open allegiance',
    order: 'Shoot the two suspects named in Double agent or Foreigner who NEVER appear in Friend or Foe.',
    hint: 'Check Double agent and Foreigner, then drop anyone named in Friend or Foe.',
    inc: {roles: ['double', 'foreigner']}, exc: {roles: ['friend', 'foe']}
  }),
  makeDirectRule({
    id: 'se-86', domain: 8, title: 'Watcher with no enemies',
    order: 'Shoot the two suspects named in Spy or Friend who NEVER appear in Foe or Double agent.',
    hint: 'Check Spy and Friend, then eliminate anyone named in Foe or Double agent.',
    inc: {roles: ['spy', 'friend']}, exc: {roles: ['foe', 'double']}
  }),
  makeDirectRule({
    id: 'se-87', domain: 8, title: 'Ghost in the middle',
    order: 'Shoot the two suspects named in Foe or Spy who NEVER appear in Friend, Civilian, or Foreigner.',
    hint: 'Check Foe and Spy, then remove anyone appearing in Friend, Civilian, or Foreigner.',
    inc: {roles: ['foe', 'spy']}, exc: {roles: ['friend', 'civilian', 'foreigner']}
  }),
  makeDirectRule({
    id: 'se-88', domain: 8, title: 'Outside the wire',
    order: 'Shoot the two suspects named in Foe or Foreigner who NEVER appear in Spy or Civilian.',
    hint: 'Check Foe and Foreigner, then drop anyone named in Spy or Civilian.',
    inc: {roles: ['foe', 'foreigner']}, exc: {roles: ['spy', 'civilian']}
  }),
  makeDirectRule({
    id: 'se-89', domain: 8, title: 'Internal mole profile',
    order: 'Shoot the two suspects named in Friend or Double agent who NEVER appear in Foreigner or Civilian.',
    hint: 'Check Friend and Double agent, then rule out anyone named in Foreigner or Civilian.',
    inc: {roles: ['friend', 'double']}, exc: {roles: ['foreigner', 'civilian']}
  }),

  // =========================================================================
  // DOMAIN 9: Network Leverage & Highest-Activity Calls (10 families)
  // =========================================================================
  makeRankRule({
    id: 'se-90', domain: 9, title: 'Most active in the dossier',
    order: 'Shoot the two suspects appearing the most times across all six rows.',
    hint: 'Count every appearance of each suspect across all six categories and pick the top two.',
    scoreFn(g, name, proof) {
      const list = g.touch(name);
      return {score: list.length, reason: proof ? name + ' appears ' + list.length + ' times across the file.' : ''};
    }
  }),
  makeRankRule({
    id: 'se-91', domain: 9, title: 'Broadest role reach',
    order: 'Shoot the two suspects appearing in the most DIFFERENT categories across all six rows.',
    hint: 'Count how many distinct rows each suspect appears in (a repeat in the same row counts once).',
    scoreFn(g, name, proof) {
      const roles = [...g.distinctRoles(name)];
      return {score: roles.length, reason: proof ? name + ' appears in ' + roles.length + ' categories (' + roles.map(r => roleNames[r]).join(', ') + ').' : ''};
    }
  }),
  makeRankRule({
    id: 'se-92', domain: 9, title: 'Heaviest target',
    order: 'Shoot the two suspects receiving the most incoming arrows across all six rows.',
    hint: 'Count how often each suspect sits on the right side of an arrow across all six rows.',
    scoreFn(g, name, proof) {
      const list = g.in(name);
      return {score: list.length, reason: proof ? name + ' receives ' + list.length + ' contacts (' + list.map(g.fmt).join(' · ') + ').' : ''};
    }
  }),
  makeRankRule({
    id: 'se-93', domain: 9, title: 'Most active instigator',
    order: 'Shoot the two suspects sending the most outgoing arrows across all six rows.',
    hint: 'Count how often each suspect sits on the left side of an arrow across all six rows.',
    scoreFn(g, name, proof) {
      const list = g.out(name);
      return {score: list.length, reason: proof ? name + ' sends ' + list.length + ' contacts (' + list.map(g.fmt).join(' · ') + ').' : ''};
    }
  }),
  makeRankRule({
    id: 'se-94', domain: 9, title: 'Most covertly entangled',
    order: 'Shoot the two suspects with the most links across Spy, Double agent, and Foreigner combined.',
    hint: 'Count every appearance (left or right) in Spy, Double agent, and Foreigner.',
    scoreFn(g, name, proof) {
      const list = g.touch(name, ['spy', 'double', 'foreigner']);
      return {score: list.length, reason: proof ? name + ' has ' + list.length + ' covert/foreign links.' : ''};
    }
  }),
  makeRankRule({
    id: 'se-95', domain: 9, title: 'Highest hostile heat',
    order: 'Shoot the two suspects appearing most often across Foe, Double agent, and Foreigner.',
    hint: 'Count every appearance (left or right) in Foe, Double agent, and Foreigner.',
    scoreFn(g, name, proof) {
      const list = g.touch(name, ['foe', 'double', 'foreigner']);
      return {score: list.length, reason: proof ? name + ' appears ' + list.length + ' times in Foe/Double agent/Foreigner.' : ''};
    }
  }),
  makeRankRule({
    id: 'se-96', domain: 9, title: 'Most connected in the open',
    order: 'Shoot the two suspects with the most links across Friend, Foe, and Civilian combined.',
    hint: 'Count every appearance in Friend, Foe, and Civilian.',
    scoreFn(g, name, proof) {
      const list = g.touch(name, ['friend', 'foe', 'civilian']);
      return {score: list.length, reason: proof ? name + ' has ' + list.length + ' links across Friend, Foe, and Civilian.' : ''};
    }
  }),
  makeRankRule({
    id: 'se-97', domain: 9, title: 'Widest personal network',
    order: 'Shoot the two suspects directly linked to the most DIFFERENT people across all six rows.',
    hint: 'Count distinct contacts per suspect (ignore duplicate links to the same person).',
    scoreFn(g, name, proof) {
      const n = g.neighbors(name);
      return {score: n.length, reason: proof ? name + ' is linked to ' + n.length + ' distinct suspects (' + n.join(', ') + ').' : ''};
    }
  }),
  makeRankRule({
    id: 'se-98', domain: 9, title: 'Most watched & reported',
    order: 'Shoot the two suspects receiving the most links across Spy, Civilian, and Friend.',
    hint: 'Count how often each suspect sits on the right side of Spy, Civilian, and Friend.',
    scoreFn(g, name, proof) {
      const list = g.in(name, ['spy', 'civilian', 'friend']);
      return {score: list.length, reason: proof ? name + ' receives ' + list.length + ' links in Spy/Civilian/Friend.' : ''};
    }
  }),
  makeRankRule({
    id: 'se-99', domain: 9, title: 'Top covert & hostile actor',
    order: 'Shoot the two suspects sending the most links across Foe, Double agent, Foreigner, and Spy.',
    hint: 'Count how often each suspect sits on the left side of Foe, Double agent, Foreigner, and Spy.',
    scoreFn(g, name, proof) {
      const list = g.out(name, ['foe', 'double', 'foreigner', 'spy']);
      return {score: list.length, reason: proof ? name + ' sends ' + list.length + ' covert/hostile links.' : ''};
    }
  })
];
