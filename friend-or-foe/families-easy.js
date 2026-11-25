import {collectMatches, collectPairs, pickTopTwo} from './case-graph.js';

// 100 genuinely distinct Easy operational families (10 domains × 10 families).
// Calibrated to 115–120 IQ (capable 13-year-old): paired with 1 disputed record settled
// via cross-check; combines 2-step operational transfer with contextual exceptions,
// source/recipient perspective, corroboration, and non-collapsible 6-category distinctions.

function edgesByDir(g, name, roles, dir) {
  if (dir === 'out') return g.out(name, roles);
  if (dir === 'in') return g.in(name, roles);
  return g.touch(name, roles);
}

function makeEasyCarry({
  id, domain, title, order,
  firstRoles, firstDir,
  secondRoles, secondDir,
  diffRole = false,
  noReturn = true,
  exc = null,
  reqSelf = null,
  excMid = null
}) {
  return {
    id,
    tier: 'easy',
    domain,
    title,
    order,
    hint: '',
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      return collectMatches(g.people, x => {
        if (exc && edgesByDir(g, x, exc.roles, exc.dir || 'any').length) return null;
        let selfEdge = null;
        if (reqSelf) {
          const s = edgesByDir(g, x, reqSelf.roles, reqSelf.dir || 'any');
          if (!s.length) return null;
          selfEdge = s[0];
        }
        for (const e1 of edgesByDir(g, x, firstRoles, firstDir)) {
          const m = e1.from === x ? e1.to : e1.from;
          if (excMid && edgesByDir(g, m, excMid.roles, excMid.dir || 'any').length) continue;
          for (const e2 of edgesByDir(g, m, secondRoles, secondDir)) {
            if (e2 === e1) continue;
            if (diffRole && e2.role === e1.role) continue;
            const end = e2.from === m ? e2.to : e2.from;
            if (noReturn && end === x) continue;
            if (!includeProof) return 'ok';
            return x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + (selfEdge ? ' · ' + g.fmt(selfEdge) : '') + '.';
          }
        }
        return null;
      }, includeProof);
    }
  };
}

function makeEasyAnchor({
  id, domain, title, order,
  step1Roles, step1Dir,
  step2Roles, step2Dir,
  diffRole = false,
  excludeDirect = false,
  excTarget = null,
  reqTarget = null
}) {
  return {
    id,
    tier: 'easy',
    domain,
    title,
    order,
    hint: '',
    useAnchor: true,
    evaluate(g, anchor, includeProof) {
      const directSet = excludeDirect ? new Set(g.neighbors(anchor)) : null;
      return collectMatches(g.people, x => {
        if (x === anchor) return null;
        if (directSet && directSet.has(x)) return null;
        if (excTarget && edgesByDir(g, x, excTarget.roles, excTarget.dir || 'any').length) return null;
        let tEdge = null;
        if (reqTarget) {
          const t = edgesByDir(g, x, reqTarget.roles, reqTarget.dir || 'any');
          if (!t.length) return null;
          tEdge = t[0];
        }
        for (const e1 of edgesByDir(g, anchor, step1Roles, step1Dir)) {
          const m = e1.from === anchor ? e1.to : e1.from;
          if (m === x) continue;
          for (const e2 of edgesByDir(g, m, step2Roles, step2Dir)) {
            if (e2 === e1) continue;
            if (diffRole && e2.role === e1.role) continue;
            const end = e2.from === m ? e2.to : e2.from;
            if (end === x) {
              return includeProof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + (tEdge ? ' · ' + g.fmt(tEdge) : '') + '.' : 'ok';
            }
          }
        }
        return null;
      }, includeProof);
    }
  };
}

function makeEasyRank({id, domain, title, order, scoreFn, minScore = -Infinity}) {
  return {
    id,
    tier: 'easy',
    domain,
    title,
    order,
    hint: '',
    useAnchor: false,
    evaluate(g, _anchor, includeProof) {
      return pickTopTwo(g.people, x => scoreFn(g, x, includeProof), includeProof, minScore);
    }
  };
}

function makeEasyCustom({id, domain, title, order, useAnchor = false, evaluate}) {
  return {id, tier: 'easy', domain, title, order, hint: '', useAnchor, evaluate};
}

export const easyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal with Exceptions (10 families)
  // =========================================================================
  makeEasyCarry({
    id: 'ea-00', domain: 0, title: 'Unwatched mole’s ally',
    order: 'Shoot the two suspects backed by someone who appears in Double agent or Foreigner — unless a Spy is watching them.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-01', domain: 0, title: 'Compromised voucher without civilian cover',
    order: 'Shoot the two suspects backed by a Friend who also opposes (Foe) or leaks (Double agent) — excluding anyone in Civilian.',
    firstRoles: ['friend'], firstDir: 'in', secondRoles: ['foe', 'double'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-02', domain: 0, title: 'Backing a hunted mole',
    order: 'Shoot the two Friends (left of Friend) backing someone who appears in Foe, Double agent, or Foreigner — unless a Spy watches that backer.',
    firstRoles: ['friend'], firstDir: 'out', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-03', domain: 0, title: 'Betrayed without an ally',
    order: 'Shoot the two suspects linked (either way) to a Double agent via Spy or Civilian, who have NO Friend backing them.',
    firstRoles: ['spy', 'civilian'], firstDir: 'any', secondRoles: ['double'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-04', domain: 0, title: 'Covert ally of a hostile',
    order: 'Shoot the two suspects backed (Friend) or watched (Spy) by someone who opposes as a Foe — excluding anyone who backs a Friend.',
    firstRoles: ['friend', 'spy'], firstDir: 'in', secondRoles: ['foe'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'out'}
  }),
  makeEasyCarry({
    id: 'ea-05', domain: 0, title: 'Unmonitored betrayal trail',
    order: 'Shoot the two suspects receiving a Friend or Civilian link from someone targeted by a Double agent — unless that middleman is watched by a Spy.',
    firstRoles: ['friend', 'civilian'], firstDir: 'in', secondRoles: ['double'], secondDir: 'in',
    excMid: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-06', domain: 0, title: 'Ally of an unbacked target',
    order: 'Shoot the two suspects linked in Friend or Spy to someone opposed by a Foe, when that middleman has NO Civilian link.',
    firstRoles: ['friend', 'spy'], firstDir: 'any', secondRoles: ['foe'], secondDir: 'in',
    excMid: {roles: ['civilian'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-07', domain: 0, title: 'Two-sided voucher',
    order: 'Shoot the two suspects linked in Friend or Civilian to someone in Foreigner, who ALSO appear somewhere in Foe or Double agent.',
    firstRoles: ['friend', 'civilian'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'any',
    reqSelf: {roles: ['foe', 'double'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-08', domain: 0, title: 'Covertly backed',
    order: 'Shoot the two suspects linked in Double agent or Foe to someone backed by a Friend — excluding anyone in Foreigner.',
    firstRoles: ['double', 'foe'], firstDir: 'any', secondRoles: ['friend'], secondDir: 'in',
    exc: {roles: ['foreigner'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-09', domain: 0, title: 'Unchecked loyalty',
    order: 'Shoot the two suspects who back someone (Friend) or report to someone (Civilian) who is NOT watched by a Spy yet appears in Foe or Foreigner.',
    firstRoles: ['friend', 'civilian'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'any',
    excMid: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind-Spot Chains (10 families)
  // =========================================================================
  makeEasyCarry({
    id: 'ea-10', domain: 1, title: 'Watcher compromised by border',
    order: 'Shoot the two suspects watched by a Spy whose watcher also appears in Foreigner or Double agent — unless a Friend backs the suspect.',
    firstRoles: ['spy'], firstDir: 'in', secondRoles: ['foreigner', 'double'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCustom({
    id: 'ea-11', domain: 1, title: 'Blind-spot handler',
    order: 'Shoot the two suspects handling (Foreigner) or opposing (Foe) someone whom NO Spy is watching — excluding anyone in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        for (const e1 of g.out(x, ['foreigner', 'foe'])) {
          if (!g.hasIn(e1.to, 'spy')) return proof ? x + ': ' + g.fmt(e1) + ' (' + e1.to + ' unwatched by Spy).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCarry({
    id: 'ea-12', domain: 1, title: 'Watcher of an active mole',
    order: 'Shoot the two suspects watching (Spy) or backing (Friend) someone who leaks as a Double agent or opposes as a Foe — excluding Civilians.',
    firstRoles: ['spy', 'friend'], firstDir: 'out', secondRoles: ['double', 'foe'], secondDir: 'out',
    exc: {roles: ['civilian'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-13', domain: 1, title: 'Surveillance trail into a leak',
    order: 'Shoot the two suspects linked (either way) in Double agent or Foreigner to someone watched by a Spy — unless a Friend backs them.',
    firstRoles: ['double', 'foreigner'], firstDir: 'any', secondRoles: ['spy'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-14', domain: 1, title: 'Unwatched associate of a watcher',
    order: 'Shoot the two suspects linked (either way) in Friend, Civilian, or Foe to a Spy (left of Spy) — excluding anyone watched by a Spy.',
    firstRoles: ['friend', 'civilian', 'foe'], firstDir: 'any', secondRoles: ['spy'], secondDir: 'out',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-15', domain: 1, title: 'Watcher with no backing',
    order: 'Shoot the two suspects linked in Spy to someone in Foe, Double agent, or Foreigner — when that contact has NO Friend backing.',
    firstRoles: ['spy'], firstDir: 'any', secondRoles: ['foe', 'double', 'foreigner'], secondDir: 'any',
    excMid: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-16', domain: 1, title: 'Shadowed witness handler',
    order: 'Shoot the two suspects receiving a Civilian report or Spy watch from someone who also appears in Foreigner or Foe.',
    firstRoles: ['civilian', 'spy'], firstDir: 'in', secondRoles: ['foreigner', 'foe'], secondDir: 'any'
  }),
  makeEasyCarry({
    id: 'ea-17', domain: 1, title: 'Compromised surveillance target',
    order: 'Shoot the two suspects watched by a Spy who ALSO receive a link from someone in Double agent or Foreigner.',
    firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], firstDir: 'in',
    secondRoles: ['double', 'foreigner'], secondDir: 'any',
    reqSelf: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCustom({
    id: 'ea-18', domain: 1, title: 'Spotting the blind spot',
    order: 'Shoot the two suspects linked (either way) in Foe or Double agent to someone NOT watched by a Spy — excluding anyone in Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        for (const e1 of g.touch(x, ['foe', 'double'])) {
          const m = e1.from === x ? e1.to : e1.from;
          if (!g.hasIn(m, 'spy')) return proof ? x + ': ' + g.fmt(e1) + ' (' + m + ' unwatched by Spy).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCarry({
    id: 'ea-19', domain: 1, title: 'Double-watched suspect',
    order: 'Shoot the two suspects whose Spy watcher OR Civilian informant also appears in Friend or Double agent — excluding anyone in Foe.',
    firstRoles: ['spy', 'civilian'], firstDir: 'in', secondRoles: ['friend', 'double'], secondDir: 'any',
    exc: {roles: ['foe'], dir: 'any'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Infiltration & Double Cut-Outs (10 families)
  // =========================================================================
  makeEasyCarry({
    id: 'ea-20', domain: 2, title: 'Foreigner’s unmonitored proxy',
    order: 'Shoot the two suspects linked in Friend or Civilian to someone handled by a Foreigner — unless a Spy watches the suspect.',
    firstRoles: ['friend', 'civilian'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-21', domain: 2, title: 'Border handler’s blind spot',
    order: 'Shoot the two suspects linked in Foreigner to someone who also appears in Spy or Friend — excluding anyone in Civilian.',
    firstRoles: ['foreigner'], firstDir: 'any', secondRoles: ['spy', 'friend'], secondDir: 'any',
    exc: {roles: ['civilian'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-22', domain: 2, title: 'Foreign-backed aggressor',
    order: 'Shoot the two suspects opposing (Foe) or leaking to (Double agent) someone linked to a Foreigner — unless a Friend backs the suspect.',
    firstRoles: ['foe', 'double'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-23', domain: 2, title: 'External leak conduit',
    order: 'Shoot the two suspects receiving a Double agent leak or Foreigner handling from someone who ALSO appears in Friend or Spy.',
    firstRoles: ['double', 'foreigner'], firstDir: 'in', secondRoles: ['friend', 'spy'], secondDir: 'any'
  }),
  makeEasyCustom({
    id: 'ea-24', domain: 2, title: 'Foreigner without Foe resistance',
    order: 'Shoot the two suspects handled by a Foreigner whose handler is NOT opposed by a Foe — OR who receive a Double agent leak from someone in Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, 'foreigner')) {
          if (!g.hasIn(e1.from, 'foe')) return proof ? x + ': ' + g.fmt(e1) + ' (handler unopposed by Foe).' : 'ok';
        }
        for (const e2 of g.in(x, 'double')) {
          const civ = g.touch(e2.from, 'civilian')[0];
          if (civ) return proof ? x + ': ' + g.fmt(e2) + ' · ' + g.fmt(civ) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCarry({
    id: 'ea-25', domain: 2, title: 'Border shadow',
    order: 'Shoot the two suspects linked (either way) in Spy or Foe to a Foreigner handler (left of Foreigner) — excluding anyone in Friend.',
    firstRoles: ['spy', 'foe'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'out',
    exc: {roles: ['friend'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-26', domain: 2, title: 'Border asset in covert play',
    order: 'Shoot the two suspects receiving any link from someone handled by a Foreigner — excluding direct Foreigner links.',
    firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian'], firstDir: 'in', secondRoles: ['foreigner'], secondDir: 'in'
  }),
  makeEasyCarry({
    id: 'ea-27', domain: 2, title: 'Recruited by an enemy’s friend',
    order: 'Shoot the two suspects linked in Foreigner or Double agent to someone backed by a Friend — excluding anyone watched by a Spy.',
    firstRoles: ['foreigner', 'double'], firstDir: 'any', secondRoles: ['friend'], secondDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-28', domain: 2, title: 'Border contact under watch',
    order: 'Shoot the two suspects linked in Civilian or Friend to someone in Foreigner — who ALSO appear in Spy or Double agent.',
    firstRoles: ['civilian', 'friend'], firstDir: 'any', secondRoles: ['foreigner'], secondDir: 'any',
    reqSelf: {roles: ['spy', 'double'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-29', domain: 2, title: 'Unopposed foreign chain',
    order: 'Shoot the two suspects sending a Friend, Spy, or Civilian link to someone in Foreigner — excluding anyone opposed by a Foe.',
    firstRoles: ['friend', 'spy', 'civilian'], firstDir: 'out', secondRoles: ['foreigner'], secondDir: 'any',
    exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Shield & Compromised Witnesses (10 families)
  // =========================================================================
  makeEasyCarry({
    id: 'ea-30', domain: 3, title: 'Civilian cover blown',
    order: 'Shoot the two suspects reported to by a Civilian whose witness also appears in Foe or Foreigner — unless a Spy watches the suspect.',
    firstRoles: ['civilian'], firstDir: 'in', secondRoles: ['foe', 'foreigner'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-31', domain: 3, title: 'Witness to a leak',
    order: 'Shoot the two suspects linked (either way) in Civilian to someone in Double agent or Foe — excluding anyone in Friend.',
    firstRoles: ['civilian'], firstDir: 'any', secondRoles: ['double', 'foe'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-32', domain: 3, title: 'Hiding behind a civilian',
    order: 'Shoot the two suspects linked in Foe or Foreigner to someone receiving a Civilian report — unless a Friend backs the suspect.',
    firstRoles: ['foe', 'foreigner'], firstDir: 'any', secondRoles: ['civilian'], secondDir: 'in',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-33', domain: 3, title: 'Unvetted witness handler',
    order: 'Shoot the two suspects receiving a Civilian report or Friend backing from someone NOT watched by a Spy, who also appears in Spy or Double agent.',
    firstRoles: ['civilian', 'friend'], firstDir: 'in', secondRoles: ['spy', 'double'], secondDir: 'any',
    excMid: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-34', domain: 3, title: 'Civilian relay to a mole',
    order: 'Shoot the two suspects receiving any link from someone who reports as a Civilian — excluding anyone who also appears in Friend.',
    firstRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], firstDir: 'in',
    secondRoles: ['civilian'], secondDir: 'out', exc: {roles: ['friend'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-35', domain: 3, title: 'Witnessed by an enemy’s ally',
    order: 'Shoot the two suspects linked in Spy or Double agent to a Civilian (left of Civilian) — excluding anyone in Foreigner.',
    firstRoles: ['spy', 'double'], firstDir: 'any', secondRoles: ['civilian'], secondDir: 'out',
    exc: {roles: ['foreigner'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-36', domain: 3, title: 'Bystander in crossfire',
    order: 'Shoot the two suspects linked in Friend or Foe to someone in Civilian — who ALSO appear in Double agent or Foreigner.',
    firstRoles: ['friend', 'foe'], firstDir: 'any', secondRoles: ['civilian'], secondDir: 'any',
    reqSelf: {roles: ['double', 'foreigner'], dir: 'any'}
  }),
  makeEasyCarry({
    id: 'ea-37', domain: 3, title: 'Witness whose handler is targeted',
    order: 'Shoot the two suspects reporting as a Civilian OR backing as a Friend to someone opposed by a Foe or handled by a Foreigner.',
    firstRoles: ['civilian', 'friend'], firstDir: 'out', secondRoles: ['foe', 'foreigner'], secondDir: 'in'
  }),
  makeEasyCarry({
    id: 'ea-38', domain: 3, title: 'Silent witness link',
    order: 'Shoot the two suspects receiving a Spy, Foe, or Foreigner link from someone in Civilian — excluding anyone backed by a Friend.',
    firstRoles: ['spy', 'foe', 'foreigner'], firstDir: 'in', secondRoles: ['civilian'], secondDir: 'any',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyCarry({
    id: 'ea-39', domain: 3, title: 'Compromised local contact',
    order: 'Shoot the two suspects sending a Double agent or Foe link to someone linked to a Civilian — excluding anyone watched by a Spy.',
    firstRoles: ['double', 'foe'], firstDir: 'out', secondRoles: ['civilian'], secondDir: 'any',
    exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy & Two-Way Cut-Outs (10 families)
  // =========================================================================
  makeEasyCustom({
    id: 'ea-40', domain: 4, title: 'Unwatched pipeline end',
    order: 'Follow a Friend or Spy arrow to a middleman, then a Double agent or Foreigner arrow (no return). Shoot the two at the end not watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e2 of g.in(x, ['double', 'foreigner'])) {
          for (const e1 of g.in(e2.from, ['friend', 'spy'])) {
            if (e1.from !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-41', domain: 4, title: 'Unbacked pipeline source',
    order: 'Follow a Civilian or Foreigner arrow, then a Foe or Double agent arrow (no return). Shoot the two senders who have NO Friend backing.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e1 of g.out(x, ['civilian', 'foreigner'])) {
          for (const e2 of g.out(e1.to, ['foe', 'double'])) {
            if (e2.to !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-42', domain: 4, title: 'Covert middleman without cover',
    order: 'Shoot the two middlemen receiving a Friend or Spy arrow and sending a Foe, Double agent, or Foreigner arrow (no return) — excluding Civilians.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        for (const e1 of g.in(x, ['friend', 'spy'])) {
          for (const e2 of g.out(x, ['foe', 'double', 'foreigner'])) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-43', domain: 4, title: 'Hostile-to-domestic relay end',
    order: 'Follow a Foe or Double agent arrow, then a Friend, Spy, or Civilian arrow (no return). Shoot the two at the end who are NOT in Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'foreigner')) return null;
        for (const e2 of g.in(x, ['friend', 'spy', 'civilian'])) {
          for (const e1 of g.in(e2.from, ['foe', 'double'])) {
            if (e1.from !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-44', domain: 4, title: 'Two-step covert bridge',
    order: 'Follow two outgoing arrows in DIFFERENT categories among Spy, Double agent, Civilian, and Foreigner (no return). Shoot the two at the end not backed by a Friend.',
    evaluate(g, _a, proof) {
      const set = ['spy', 'double', 'civilian', 'foreigner'];
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        for (const e2 of g.in(x, set)) {
          for (const e1 of g.in(e2.from, set)) {
            if (e1.from !== x && e1.role !== e2.role) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-45', domain: 4, title: 'Relay through an unwatched cut-out',
    order: 'Follow two outgoing arrows in DIFFERENT categories where the middleman is NOT watched by a Spy (no return) — shoot the two senders who appear in Foe or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['foe', 'foreigner'])) return null;
        for (const e1 of g.out(x)) {
          if (g.hasIn(e1.to, 'spy')) continue;
          for (const e2 of g.out(e1.to)) {
            if (e2.to !== x && e2.role !== e1.role) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + ' (unwatched cut-out).' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-46', domain: 4, title: 'Double-hop from a Friend or Foe',
    order: 'Follow a Friend or Foe arrow, then a Spy or Foreigner arrow (no return). Shoot the two at the end.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e2 of g.in(x, ['spy', 'foreigner'])) {
          for (const e1 of g.in(e2.from, ['friend', 'foe'])) {
            if (e1.from !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-47', domain: 4, title: 'Silent cut-out',
    order: 'Shoot the two middlemen receiving a Double agent or Foreigner arrow and passing on a Spy or Civilian arrow (no return).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const e1 of g.in(x, ['double', 'foreigner'])) {
          for (const e2 of g.out(x, ['spy', 'civilian'])) {
            if (e2.to !== e1.from) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-48', domain: 4, title: 'Unbacked courier origin',
    order: 'Follow a Spy or Double agent arrow, then a Friend or Civilian arrow (no return). Shoot the two senders not watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        for (const e1 of g.out(x, ['spy', 'double'])) {
          for (const e2 of g.out(e1.to, ['friend', 'civilian'])) {
            if (e2.to !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-49', domain: 4, title: 'Border-to-overt origin',
    order: 'Follow a Civilian or Foreigner arrow, then a Friend or Foe arrow (no return). Shoot the two senders not in Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'spy')) return null;
        for (const e1 of g.out(x, ['civilian', 'foreigner'])) {
          for (const e2 of g.out(e1.to, ['friend', 'foe'])) {
            if (e2.to !== x) return proof ? x + ': ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10 families)
  // =========================================================================
  makeEasyCustom({
    id: 'ea-50', domain: 5, title: 'Two-way covert clash',
    order: 'Find the pair linked in BOTH directions across two DIFFERENT categories (A → B in one row, B → A in another). Shoot both.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const e1 of g.edges) {
        for (const e2 of g.direct(e1.to, e1.from)) {
          if (e2.role !== e1.role) {
            pairs.push({a: e1.from, b: e1.to, reason: g.fmt(e1) + ' vs ' + g.fmt(e2) + '.'});
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-51', domain: 5, title: 'Shortcut contradiction',
    order: 'Find a direct arrow A → B where A also reaches B in two steps (via a middleman) using DIFFERENT categories from the direct arrow. Shoot A and B.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const d of g.edges) {
        for (const e1 of g.out(d.from)) {
          if (e1.to === d.to || e1.role === d.role) continue;
          for (const e2 of g.direct(e1.to, d.to)) {
            if (e2.role !== d.role) {
              pairs.push({a: d.from, b: d.to, reason: g.fmt(d) + ' vs ' + g.fmt(e1) + ' → ' + g.fmt(e2) + '.'});
            }
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-52', domain: 5, title: 'Double link between the same pair',
    order: 'Find two suspects connected directly in TWO DIFFERENT categories (same or opposite direction). Shoot both.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (let i = 0; i < g.people.length; i++) {
        for (let j = i + 1; j < g.people.length; j++) {
          const a = g.people[i], b = g.people[j];
          const links = g.between(a, b);
          if (new Set(links.map(e => e.role)).size >= 2) {
            pairs.push({a, b, reason: g.fmt(links[0]) + ' · ' + g.fmt(links.find(e => e.role !== links[0].role)) + '.'});
          }
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-53', domain: 5, title: 'Friend with a covert return',
    order: 'Find the pair where one acts on the other in Friend, Spy, or Civilian, and the other answers in Foe, Double agent, or Foreigner. Shoot both.',
    evaluate(g, _a, proof) {
      const open = ['friend', 'spy', 'civilian'];
      const hot = ['foe', 'double', 'foreigner'];
      const pairs = [];
      for (const e1 of g.edges) {
        if (!open.includes(e1.role)) continue;
        const back = g.direct(e1.to, e1.from, hot)[0];
        if (back) pairs.push({a: e1.from, b: e1.to, reason: g.fmt(e1) + ' answered by ' + g.fmt(back) + '.'});
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-54', domain: 5, title: 'Broken ally triangle',
    order: 'Find a Friend or Civilian arrow A → B where someone else links to BOTH A and B via Foe, Double agent, or Foreigner. Shoot A and B.',
    evaluate(g, _a, proof) {
      const pairs = [];
      for (const d of g.edges) {
        if (d.role !== 'friend' && d.role !== 'civilian') continue;
        for (const m of g.people) {
          if (m === d.from || m === d.to) continue;
          const l1 = g.between(m, d.from, ['foe', 'double', 'foreigner'])[0];
          const l2 = g.between(m, d.to, ['foe', 'double', 'foreigner'])[0];
          if (l1 && l2) pairs.push({a: d.from, b: d.to, reason: g.fmt(d) + ' shadowed by ' + m + ' (' + g.fmt(l1) + ' · ' + g.fmt(l2) + ').'});
        }
      }
      return collectPairs(pairs, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-55', domain: 5, title: 'Backed by a double-dealer',
    order: 'Shoot the two suspects backed by a Friend who ALSO has both an incoming and outgoing link in other categories.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const f of g.in(x, 'friend')) {
          const m = f.from;
          const otherIn = g.in(m).find(e => e.role !== 'friend');
          const otherOut = g.out(m).find(e => e.role !== 'friend');
          if (otherIn && otherOut) {
            return proof ? x + ': ' + g.fmt(f) + ', while ' + m + ' bridges ' + g.fmt(otherIn) + ' & ' + g.fmt(otherOut) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-56', domain: 5, title: 'False friend on the wire',
    order: 'Shoot the two suspects who appear in Friend OR Civilian, never appear in Spy, AND are linked to someone in Double agent or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasTouch(x, ['friend', 'civilian']) || g.hasTouch(x, 'spy')) return null;
        for (const e of g.touch(x)) {
          const other = e.from === x ? e.to : e.from;
          const bad = g.touch(other, ['double', 'foreigner']).find(b => b !== e);
          if (bad) return proof ? x + ': ' + g.fmt(e) + ' → ' + g.fmt(bad) + ' (no Spy cover).' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-57', domain: 5, title: 'Covertly flanked ally',
    order: 'Shoot the two suspects whose direct contacts include BOTH someone in Friend and someone in Double agent — excluding anyone in Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const n = g.neighbors(x);
        for (const f of n) {
          if (!g.hasTouch(f, 'friend')) continue;
          for (const d of n) {
            if (d !== f && g.hasTouch(d, 'double')) {
              return proof ? x + ' connects to Friend-linked ' + f + ' and Double agent-linked ' + d + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-58', domain: 5, title: 'Unwitnessed contradiction',
    order: 'Shoot the two suspects who both send an arrow in Friend, Spy, or Civilian AND receive an arrow in Foe, Double agent, or Foreigner — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const a = g.out(x, ['friend', 'spy', 'civilian'])[0];
        const b = g.in(x, ['foe', 'double', 'foreigner'])[0];
        if (a && b) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-59', domain: 5, title: 'Alibi broken by a watcher',
    order: 'Shoot the two suspects backed by a Friend whose Spy watcher (or Civilian reporter) also touches Foe, Double agent, or Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (!g.hasIn(x, 'friend')) return null;
        for (const w of g.in(x, ['spy', 'civilian'])) {
          const bad = g.touch(w.from, ['foe', 'double', 'foreigner'])[0];
          if (bad) return proof ? x + ': ' + g.fmt(w) + ' · ' + g.fmt(bad) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 6: Perspective & Scope around {name} (10 families)
  // =========================================================================
  makeEasyAnchor({
    id: 'ea-60', domain: 6, title: 'Outsider behind {name}’s circle',
    order: 'Find everyone directly linked to {name}. Shoot the two outsiders (not directly linked to {name}) linked to them in Foe or Double agent.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foe', 'double'], step2Dir: 'any', excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-61', domain: 6, title: 'Foreign reach past {name}',
    order: 'Find everyone directly linked to {name}. Shoot the two outsiders (not linked to {name}) linked to them in Foreigner or Spy.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['foreigner', 'spy'], step2Dir: 'any', excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-62', domain: 6, title: 'Unwatched outsider past {name}',
    order: 'Start at {name}, follow two outgoing arrows (no return), and rule out anyone directly linked to {name} or watched by a Spy. Shoot those two.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'out',
    excludeDirect: true, excTarget: {roles: ['spy'], dir: 'in'}
  }),
  makeEasyAnchor({
    id: 'ea-63', domain: 6, title: 'Hidden approach to {name}',
    order: 'Follow two outgoing arrows in DIFFERENT categories ending at {name} (skipping anyone directly linked to {name}). Shoot the two starters.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'in',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    diffRole: true, excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-64', domain: 6, title: 'Unbacked rival on {name}’s contact',
    order: 'Find who {name} points to. Shoot the two other suspects pointing to those same people — excluding anyone backed by a Friend.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'out',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'in',
    excTarget: {roles: ['friend'], dir: 'in'}
  }),
  makeEasyAnchor({
    id: 'ea-65', domain: 6, title: 'Hostile outsider via {name}’s friend or witness',
    order: 'Start from anyone linked to {name} in Friend, Spy, or Civilian. Shoot the two outsiders (not linked to {name}) who link to them in another category.',
    step1Roles: ['friend', 'spy', 'civilian'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    diffRole: true, excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-66', domain: 6, title: 'Outsider via {name}’s covert trail',
    order: 'Start from anyone linked to {name} in Foe, Double agent, or Foreigner. Shoot the two outsiders (not linked to {name}) linked to them in another category.',
    step1Roles: ['foe', 'double', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    diffRole: true, excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-67', domain: 6, title: 'Same target, covert tie',
    order: 'Find who {name} is linked to (either way). Shoot the two outsiders (not linked to {name}) who point to those contacts in Spy, Double agent, or Foreigner.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['spy', 'double', 'foreigner'], step2Dir: 'in', excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-68', domain: 6, title: 'Target of {name}’s contacts',
    order: 'Find who {name} is linked to (either way). Shoot the two outsiders (not linked to {name}) whom those contacts point to in Friend, Foe, or Civilian.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'civilian'], step2Dir: 'out', excludeDirect: true
  }),
  makeEasyAnchor({
    id: 'ea-69', domain: 6, title: 'Compromised outsider past {name}',
    order: 'Find outsiders (not directly linked to {name}) two links away from {name} who ALSO appear in Double agent or Foreigner. Shoot those two.',
    step1Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step1Dir: 'any',
    step2Roles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], step2Dir: 'any',
    excludeDirect: true, reqTarget: {roles: ['double', 'foreigner'], dir: 'any'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Testimony & Independent Channels (10 families)
  // =========================================================================
  makeEasyCustom({
    id: 'ea-70', domain: 7, title: 'Two independent incoming roles',
    order: 'Shoot the two suspects receiving arrows from TWO DIFFERENT senders in TWO DIFFERENT categories — excluding anyone backed by a Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const inc = g.in(x);
        for (let i = 0; i < inc.length; i++) {
          for (let j = i + 1; j < inc.length; j++) {
            if (inc[i].from !== inc[j].from && inc[i].role !== inc[j].role) {
              return proof ? x + ': ' + g.fmt(inc[i]) + ' · ' + g.fmt(inc[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-71', domain: 7, title: 'Two independent outgoing roles',
    order: 'Shoot the two suspects sending arrows to TWO DIFFERENT people in TWO DIFFERENT categories — excluding anyone watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const out = g.out(x);
        for (let i = 0; i < out.length; i++) {
          for (let j = i + 1; j < out.length; j++) {
            if (out[i].to !== out[j].to && out[i].role !== out[j].role) {
              return proof ? x + ': ' + g.fmt(out[i]) + ' · ' + g.fmt(out[j]) + '.' : 'ok';
            }
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-72', domain: 7, title: 'Same-category corroboration',
    order: 'Shoot the two suspects appearing TWICE in the same category row (on either side).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        for (const r of g.roles) {
          const list = g.touch(x, r);
          if (list.length >= 2) return proof ? x + ' appears twice in ' + list.map(g.fmt).join(' & ') + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-73', domain: 7, title: 'Corroborated without a Friend',
    order: 'Shoot the two suspects linked to at least THREE different people across the file, while NEVER appearing in Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        const n = g.neighbors(x);
        if (n.length >= 3) return proof ? x + ' links to ' + n.length + ' suspects (' + n.join(', ') + ') with no Friend record.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-74', domain: 7, title: 'Corroborated without surveillance',
    order: 'Shoot the two suspects linked to at least THREE different people across the file, while NEVER watched by a Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'spy')) return null;
        const n = g.neighbors(x);
        if (n.length >= 3) return proof ? x + ' links to ' + n.length + ' suspects (' + n.join(', ') + ') unwatched by Spy.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-75', domain: 7, title: 'Three-category footprint without Civilian',
    order: 'Shoot the two suspects appearing in at least THREE different categories across the file, while NEVER appearing in Civilian.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const roles = [...g.distinctRoles(x)];
        if (roles.length >= 3) return proof ? x + ' spans ' + roles.length + ' categories with no Civilian link.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-76', domain: 7, title: 'Unwitnessed covert target',
    order: 'Shoot the two suspects receiving arrows from at least TWO different people, with at least one arrow in Foe, Double agent, or Foreigner — and NO Civilian link.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'civilian')) return null;
        const inc = g.in(x);
        const senders = new Set(inc.map(e => e.from));
        const hot = inc.find(e => ['foe', 'double', 'foreigner'].includes(e.role));
        if (senders.size >= 2 && hot) return proof ? x + ' hit by ' + senders.size + ' senders including ' + g.fmt(hot) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-77', domain: 7, title: 'Independent covert & overt links',
    order: 'Shoot the two suspects linked to TWO DIFFERENT people: one via Friend or Foe, and another via Spy or Double agent — excluding Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'foreigner')) return null;
        for (const a of g.touch(x, ['friend', 'foe'])) {
          const p1 = a.from === x ? a.to : a.from;
          for (const b of g.touch(x, ['spy', 'double'])) {
            const p2 = b.from === x ? b.to : b.from;
            if (p1 !== p2) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-78', domain: 7, title: 'Independent covert & border links',
    order: 'Shoot the two suspects linked to TWO DIFFERENT people: one via Spy or Double agent, and another via Civilian or Foreigner — excluding Friend.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'friend')) return null;
        for (const a of g.touch(x, ['spy', 'double'])) {
          const p1 = a.from === x ? a.to : a.from;
          for (const b of g.touch(x, ['civilian', 'foreigner'])) {
            const p2 = b.from === x ? b.to : b.from;
            if (p1 !== p2) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-79', domain: 7, title: 'Independent overt & border links',
    order: 'Shoot the two suspects linked to TWO DIFFERENT people: one via Friend or Foe, and another via Civilian or Foreigner — excluding Spy.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, 'spy')) return null;
        for (const a of g.touch(x, ['friend', 'foe'])) {
          const p1 = a.from === x ? a.to : a.from;
          for (const b of g.touch(x, ['civilian', 'foreigner'])) {
            const p2 = b.from === x ? b.to : b.from;
            if (p1 !== p2) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
          }
        }
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives & Cross-Front Collisions (10 families)
  // =========================================================================
  makeEasyCustom({
    id: 'ea-80', domain: 8, title: 'Three-front operator',
    order: 'Shoot the two suspects active in ALL THREE fronts: (Friend/Foe), (Spy/Double agent), AND (Civilian/Foreigner).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const a = g.touch(x, ['friend', 'foe'])[0];
        const b = g.touch(x, ['spy', 'double'])[0];
        const c = g.touch(x, ['civilian', 'foreigner'])[0];
        if (a && b && c) return proof ? x + ' spans all three fronts: ' + g.fmt(a) + ' · ' + g.fmt(b) + ' · ' + g.fmt(c) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-81', domain: 8, title: 'Overt receiver, covert sender',
    order: 'Shoot the two suspects who ONLY receive arrows in Friend/Foe (at least one) and ONLY send arrows in Spy/Double agent/Foreigner (at least one).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const a = g.in(x, ['friend', 'foe'])[0];
        const b = g.out(x, ['spy', 'double', 'foreigner'])[0];
        if (a && b && !g.hasOut(x, ['friend', 'foe']) && !g.hasIn(x, ['spy', 'double', 'foreigner'])) {
          return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-82', domain: 8, title: 'Covert receiver, overt sender',
    order: 'Shoot the two suspects who receive at least one Spy/Double agent/Foreigner arrow and send at least one Friend/Foe/Civilian arrow, while NEVER receiving a Friend arrow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'friend')) return null;
        const a = g.in(x, ['spy', 'double', 'foreigner'])[0];
        const b = g.out(x, ['friend', 'foe', 'civilian'])[0];
        if (a && b) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-83', domain: 8, title: 'Split cover (Spy/Double vs rest)',
    order: 'Shoot the two suspects who send ONLY Spy/Double agent arrows (at least one) and receive ONLY non-Spy/non-Double arrows (at least one), or vice versa.',
    evaluate(g, _a, proof) {
      const cov = r => r === 'spy' || r === 'double';
      return collectMatches(g.people, x => {
        const o = g.out(x), i = g.in(x);
        if (!o.length || !i.length) return null;
        const c1 = o.every(e => cov(e.role)) && i.every(e => !cov(e.role));
        const c2 = o.every(e => !cov(e.role)) && i.every(e => cov(e.role));
        if (c1 || c2) return proof ? x + ' splits direction cleanly between Spy/Double agent and other roles.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-84', domain: 8, title: 'Split cover (Civilian/Foreigner vs rest)',
    order: 'Shoot the two suspects whose outgoing arrows are ALL Civilian/Foreigner and incoming arrows are ALL in other rows (at least one each), or vice versa.',
    evaluate(g, _a, proof) {
      const bord = r => r === 'civilian' || r === 'foreigner';
      return collectMatches(g.people, x => {
        const o = g.out(x), i = g.in(x);
        if (!o.length || !i.length) return null;
        const c1 = o.every(e => bord(e.role)) && i.every(e => !bord(e.role));
        const c2 = o.every(e => !bord(e.role)) && i.every(e => bord(e.role));
        if (c1 || c2) return proof ? x + ' splits direction cleanly between Civilian/Foreigner and other roles.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-85', domain: 8, title: 'Split cover (Friend/Foe vs rest)',
    order: 'Shoot the two suspects whose outgoing arrows are ALL Friend/Foe and incoming arrows are ALL in other rows (at least one each), or vice versa.',
    evaluate(g, _a, proof) {
      const ov = r => r === 'friend' || r === 'foe';
      return collectMatches(g.people, x => {
        const o = g.out(x), i = g.in(x);
        if (!o.length || !i.length) return null;
        const c1 = o.every(e => ov(e.role)) && i.every(e => !ov(e.role));
        const c2 = o.every(e => !ov(e.role)) && i.every(e => ov(e.role));
        if (c1 || c2) return proof ? x + ' splits direction cleanly between Friend/Foe and other roles.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-86', domain: 8, title: 'Double-front receiver',
    order: 'Shoot the two suspects receiving an arrow in Friend/Foe AND an arrow in Civilian/Foreigner, while NEVER sending a Spy or Friend arrow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasOut(x, ['spy', 'friend'])) return null;
        const a = g.in(x, ['friend', 'foe'])[0];
        const b = g.in(x, ['civilian', 'foreigner'])[0];
        if (a && b) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-87', domain: 8, title: 'Double-front sender',
    order: 'Shoot the two suspects sending an arrow in Spy/Double agent AND an arrow in Friend/Foe, while NEVER receiving a Civilian arrow.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasIn(x, 'civilian')) return null;
        const a = g.out(x, ['spy', 'double'])[0];
        const b = g.out(x, ['friend', 'foe'])[0];
        if (a && b) return proof ? x + ': ' + g.fmt(a) + ' · ' + g.fmt(b) + '.' : 'ok';
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-88', domain: 8, title: 'One-sided ally, active rival',
    order: 'Shoot the two suspects who appear in Friend ONLY on the right (backed) and appear in Foe, Double agent, or Foreigner ONLY on the left (acting).',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        const f = g.in(x, 'friend')[0];
        const h = g.out(x, ['foe', 'double', 'foreigner'])[0];
        if (f && h && !g.hasOut(x, 'friend') && !g.hasIn(x, ['foe', 'double', 'foreigner'])) {
          return proof ? x + ': ' + g.fmt(f) + ' · ' + g.fmt(h) + '.' : 'ok';
        }
        return null;
      }, proof);
    }
  }),
  makeEasyCustom({
    id: 'ea-89', domain: 8, title: 'Shadow hub without overt ties',
    order: 'Shoot the two suspects with NO Friend or Foe links who appear in at least TWO different categories among Spy, Double agent, Civilian, and Foreigner.',
    evaluate(g, _a, proof) {
      return collectMatches(g.people, x => {
        if (g.hasTouch(x, ['friend', 'foe'])) return null;
        const roles = [...g.distinctRoles(x)];
        if (roles.length >= 2) return proof ? x + ' has no Friend/Foe links and spans ' + roles.length + ' covert/border roles.' : 'ok';
        return null;
      }, proof);
    }
  }),

  // =========================================================================
  // DOMAIN 9: Network Leverage & Non-Binary Role Scoring (10 families)
  // =========================================================================
  makeEasyRank({
    id: 'ea-90', domain: 9, title: 'Highest covert betrayal risk',
    order: 'Weigh each suspect: +2 per Double agent link, +1 per Foreigner or Foe link, −1 per Friend backing received. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.touch(x, 'double').length + g.touch(x, ['foreigner', 'foe']).length - g.in(x, 'friend').length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (highest covert betrayal risk).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-91', domain: 9, title: 'Highest foreign exposure',
    order: 'Weigh each suspect: +2 per Foreigner link, +1 per Double agent or Civilian link, −1 per Spy watch received. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.touch(x, 'foreigner').length + g.touch(x, ['double', 'civilian']).length - g.in(x, 'spy').length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (highest foreign exposure).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-92', domain: 9, title: 'Highest unmonitored hostility',
    order: 'Weigh each suspect: +2 per Foe link, +1 per Double agent or Foreigner link, −2 per Spy link. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.touch(x, 'foe').length + g.touch(x, ['double', 'foreigner']).length - 2 * g.touch(x, 'spy').length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (highest unmonitored hostility).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-93', domain: 9, title: 'Deepest covert cover',
    order: 'Weigh each suspect: +2 per Spy link, +1 per Friend or Civilian link, −1 per Foe or Foreigner link. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.touch(x, 'spy').length + g.touch(x, ['friend', 'civilian']).length - g.touch(x, ['foe', 'foreigner']).length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (deepest covert cover).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-94', domain: 9, title: 'Most exposed civilian contact',
    order: 'Weigh each suspect: +2 per Civilian link, +1 per Foreigner or Foe link, −1 per Friend or Spy link. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.touch(x, 'civilian').length + g.touch(x, ['foreigner', 'foe']).length - g.touch(x, ['friend', 'spy']).length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (most exposed civilian contact).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-95', domain: 9, title: 'Strongest inside handler',
    order: 'Weigh each suspect: +2 per outgoing Double agent or Foreigner arrow, +1 per incoming Civilian or Friend arrow, −1 per incoming Foe arrow. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.out(x, ['double', 'foreigner']).length + g.in(x, ['civilian', 'friend']).length - g.in(x, 'foe').length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (strongest inside handler).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-96', domain: 9, title: 'Most targeted operative',
    order: 'Weigh each suspect: +2 per incoming Foe or Double agent arrow, +1 per incoming Foreigner or Spy arrow, −1 per outgoing Friend arrow. Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = 2 * g.in(x, ['foe', 'double']).length + g.in(x, ['foreigner', 'spy']).length - g.out(x, 'friend').length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (most targeted operative).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-97', domain: 9, title: 'Heaviest double-life tension',
    order: 'Weigh each suspect: +1 for each link in (Friend, Spy, Civilian) PLUS +2 for each link in (Double agent, Foreigner), ONLY if they have at least one from BOTH groups. Shoot the top two.',
    minScore: 1,
    scoreFn(g, x, proof) {
      const a = g.touch(x, ['friend', 'spy', 'civilian']).length;
      const b = g.touch(x, ['double', 'foreigner']).length;
      if (!a || !b) return null;
      const s = a + 2 * b;
      return {score: s, reason: proof ? x + ' scores ' + s + ' across overt/civilian (' + a + ') and mole/foreign (' + b + ') links.' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-98', domain: 9, title: 'Widest cross-category broker',
    order: 'Count distinct categories each suspect appears in, minus 1 if they appear in Friend, plus 1 if they appear in Double agent. Shoot the top two.',
    scoreFn(g, x, proof) {
      const d = g.distinctRoles(x).size;
      const s = d - (g.hasTouch(x, 'friend') ? 1 : 0) + (g.hasTouch(x, 'double') ? 1 : 0);
      return {score: s, reason: proof ? x + ' scores ' + s + ' (' + d + ' distinct categories adjusted for Friend/Double agent).' : ''};
    }
  }),
  makeEasyRank({
    id: 'ea-99', domain: 9, title: 'Net directional imbalance',
    order: 'Count each suspect’s outgoing links in (Foe, Spy, Double agent, Foreigner) MINUS their incoming links in (Friend, Civilian). Shoot the top two.',
    scoreFn(g, x, proof) {
      const s = g.out(x, ['foe', 'spy', 'double', 'foreigner']).length - g.in(x, ['friend', 'civilian']).length;
      return {score: s, reason: proof ? x + ' scores ' + s + ' (net covert/hostile outreach vs overt/civilian backing).' : ''};
    }
  })
];
