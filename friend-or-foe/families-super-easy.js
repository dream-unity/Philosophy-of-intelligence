import {collectMatches} from './case-graph.js';
import {matchAtom, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Super Easy intelligence cases (10 domains × 10 families).
// Every order is an immediately intelligible, directional officer call (zero "tied to" /
// directionless appearance matching, zero single-role shortcuts, variable target counts 1–4).

function direct({id, domain, title, order, hint, inc, req = null, exc = null, minDistinct = 0}) {
  return {
    id, tier: 'super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const a = matchAtom(g, x, inc);
        if (!a.length) return null;
        if (minDistinct > 1 && new Set(a.map(e => e.role)).size < minDistinct) return null;
        let b = null;
        if (req) {
          b = matchAtom(g, x, req);
          if (!b.length) return null;
        }
        if (exc && matchAtom(g, x, exc).length) return null;
        if (!proof) return 'ok';
        const parts = [g.fmt(a[0])];
        if (minDistinct > 1) {
          const second = a.find(e => e.role !== a[0].role);
          if (second) parts.push(g.fmt(second));
        }
        if (b) parts.push(g.fmt(b[0]));
        return x + ': ' + parts.join(' · ') + '.';
      }, proof);
    }
  };
}

function timed({id, domain, title, order, hint, early, late, exc = null}) {
  return {
    id, tier: 'super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        if (exc && matchAtom(g, x, exc).length) return null;
        const pair = matchTemporal(g, x, early, late);
        if (!pair) return null;
        return proof ? x + ': ' + g.fmt(pair[0]) + ' before ' + g.fmt(pair[1]) + '.' : 'ok';
      }, proof);
    }
  };
}

function anchorDirect({id, domain, title, order, hint, incRoles, incDir = 'out', req = null, exc = null}) {
  return {
    id, tier: 'super-easy', domain, title, order, hint, useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor) return null;
        const links = incDir === 'out'
          ? g.direct(anchor, x, incRoles)
          : incDir === 'in'
            ? g.direct(x, anchor, incRoles)
            : g.between(anchor, x, incRoles);
        if (!links.length) return null;
        let extra = null;
        if (req) {
          const found = matchAtom(g, x, req);
          if (!found.length) return null;
          extra = found[0];
        }
        if (exc && matchAtom(g, x, exc).length) return null;
        return proof ? x + ': ' + g.fmt(links[0]) + (extra ? ' · ' + g.fmt(extra) : '') + '.' : 'ok';
      }, proof);
    }
  };
}

export const superEasyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10)
  // =========================================================================
  direct({
    id: 'se-00', domain: 0, title: 'Traitor in the ranks',
    order: 'Shoot anyone a Friend clears who also leaks as a Double agent or contacts someone as a Foreigner.',
    hint: 'Check who a Friend clears, then see if they leak as a Double agent or act as a Foreigner.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-01', domain: 0, title: 'False voucher',
    order: 'Shoot anyone who clears someone as a Friend while also targeting as a Foe or leaking as a Double agent.',
    hint: 'Start with the active Friends, then check who also targets as a Foe or leaks as a Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-02', domain: 0, title: 'Compromised ally',
    order: 'Shoot anyone a Friend clears who also receives a Double agent’s leak or a Foreigner’s contact.',
    hint: 'Check who a Friend clears, then keep those also receiving a Double agent’s leak or Foreigner’s contact.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-03', domain: 0, title: 'Unbacked mole',
    order: 'Shoot anyone who leaks as a Double agent without any Friend clearing them.',
    hint: 'Find who leaks as a Double agent, then rule out anyone cleared by a Friend.',
    inc: {roles: ['double'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-04', domain: 0, title: 'Bitter ally',
    order: 'Shoot anyone cleared by a Friend who is also targeted by a Foe, unless a Spy audits them.',
    hint: 'Find who is both cleared by a Friend and targeted by a Foe, then rule out anyone audited by a Spy.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-05', domain: 0, title: 'Active traitor',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe — excluding anyone who clears someone as a Friend.',
    hint: 'Find who leaks as a Double agent or targets as a Foe, then cross off active Friends.',
    inc: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'out'}
  }),
  direct({
    id: 'se-06', domain: 0, title: 'Exposed recipient',
    order: 'Shoot anyone who receives a Double agent’s leak or a Foreigner’s contact — unless a Friend clears them.',
    hint: 'Check who receives a Double agent’s leak or Foreigner’s contact, then exclude anyone cleared by a Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-07', domain: 0, title: 'Turned insider',
    order: 'Shoot anyone who clears someone as a Friend while also contacted by a Foreigner — unless audited by a Spy.',
    hint: 'Check who clears someone as a Friend, keep anyone contacted by a Foreigner, and exclude anyone audited by a Spy.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-08', domain: 0, title: 'Trusted under attack',
    order: 'Shoot anyone cleared by a Friend or warned by a Civilian who is also targeted by a Foe.',
    hint: 'Check who is cleared by a Friend or warned by a Civilian, then keep those targeted by a Foe.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-09', domain: 0, title: 'Double-crossing voucher',
    order: 'Shoot anyone who clears someone as a Friend while also receiving a Double agent’s leak or a Foe’s strike.',
    hint: 'Find who clears someone as a Friend, then see if they are hit by a Foe or fed a Double agent’s leak.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  direct({
    id: 'se-10', domain: 1, title: 'Unwatched mole',
    order: 'Shoot anyone who receives a Double agent’s leak without a Spy shadowing them.',
    hint: 'Check who receives a Double agent’s leak, then rule out anyone shadowed by a Spy.',
    inc: {roles: ['double'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-11', domain: 1, title: 'Unwatched attacker',
    order: 'Shoot anyone who ambushes as a Foe without a Spy shadowing them.',
    hint: 'Find the Foe attackers, then rule out anyone a Spy shadows.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-12', domain: 1, title: 'Compromised watcher',
    order: 'Shoot anyone who shadows as a Spy while also ambushing as a Foe or leaking as a Double agent.',
    hint: 'Start with active Spies, then keep anyone also acting as a Foe or Double agent.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-13', domain: 1, title: 'Flagged and exposed',
    order: 'Shoot anyone shadowed by a Spy who is also ambushed by a Foe or signaled by a Foreigner.',
    hint: 'Check who Spies shadow, then keep those ambushed by a Foe or signaled by a Foreigner.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-14', domain: 1, title: 'Blind-spot witness',
    order: 'Shoot anyone who spots someone as a Civilian while neither shadowed by a Spy nor escorted by a Friend.',
    hint: 'Find active Civilians, then cross off anyone shadowed by a Spy or escorted by a Friend.',
    inc: {roles: ['civilian'], dir: 'out'}, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  direct({
    id: 'se-15', domain: 1, title: 'Watcher under fire',
    order: 'Shoot anyone who shadows as a Spy while also ambushed by a Foe or signaled by a Foreigner.',
    hint: 'Check active Spies, then keep those ambushed by a Foe or signaled by a Foreigner.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-16', domain: 1, title: 'Unmonitored operator',
    order: 'Shoot anyone who ambushes as a Foe or leaks as a Double agent while neither shadowing nor shadowed by a Spy.',
    hint: 'Find active Foes and Double agents, then rule out anyone involved with a Spy.',
    inc: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['spy']}
  }),
  direct({
    id: 'se-17', domain: 1, title: 'Shadowed insider',
    order: 'Shoot anyone shadowed by a Spy who also escorts someone as a Friend or spots someone as a Civilian.',
    hint: 'Check who Spies shadow, then see if they act as a Friend or Civilian.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['friend', 'civilian'], dir: 'out'}
  }),
  direct({
    id: 'se-18', domain: 1, title: 'Unwatched victim',
    order: 'Shoot anyone ambushed by a Foe who is neither shadowed by a Spy nor escorted by a Friend.',
    hint: 'Find Foe victims, then remove anyone shadowed by a Spy or escorted by a Friend.',
    inc: {roles: ['foe'], dir: 'in'}, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  direct({
    id: 'se-19', domain: 1, title: 'Active watcher, active traitor',
    order: 'Shoot anyone who shadows as a Spy while also leaking as a Double agent or signaling as a Foreigner.',
    hint: 'Check active Spies, then keep anyone also acting as a Double agent or Foreigner.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  direct({
    id: 'se-20', domain: 2, title: 'Unmonitored recruiter',
    order: 'Shoot anyone who recruits as a Foreigner without a Spy tracking them.',
    hint: 'Find active Foreigners, then rule out anyone tracked by a Spy.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-21', domain: 2, title: 'Foreigner’s mole',
    order: 'Shoot anyone recruited by a Foreigner who also leaks as a Double agent.',
    hint: 'Check who a Foreigner recruits, then see if they leak as a Double agent.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['double'], dir: 'out'}
  }),
  direct({
    id: 'se-22', domain: 2, title: 'Foreigner under pressure',
    order: 'Shoot anyone recruited by a Foreigner who is also pressured by a Foe.',
    hint: 'Find who is both recruited by a Foreigner and pressured by a Foe.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-23', domain: 2, title: 'Foreigner’s civilian asset',
    order: 'Shoot anyone recruited by a Foreigner who also reports someone as a Civilian.',
    hint: 'Check who a Foreigner recruits, then keep those who report as a Civilian.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['civilian'], dir: 'out'}
  }),
  direct({
    id: 'se-24', domain: 2, title: 'Foreigner’s inside target',
    order: 'Shoot anyone recruited by a Foreigner who is also vouched for by a Friend or reported by a Civilian.',
    hint: 'Check who a Foreigner recruits, then see if a Friend vouched for them or a Civilian reported them.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-25', domain: 2, title: 'Recruiter in plain sight',
    order: 'Shoot anyone who recruits as a Foreigner while also vouching as a Friend or tracking as a Spy.',
    hint: 'Start with active Foreigners, then see if they also act as a Friend or Spy.',
    inc: {roles: ['foreigner'], dir: 'out'}, req: {roles: ['friend', 'spy'], dir: 'out'}
  }),
  direct({
    id: 'se-26', domain: 2, title: 'Foreigner’s double strike',
    order: 'Shoot anyone who recruits as a Foreigner while also pressuring as a Foe or leaking as a Double agent.',
    hint: 'Find active Foreigners, then keep anyone who also acts as a Foe or Double agent.',
    inc: {roles: ['foreigner'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-27', domain: 2, title: 'Unreported foreign asset',
    order: 'Shoot anyone recruited by a Foreigner without any Civilian reporting them.',
    hint: 'Check who a Foreigner recruits, then rule out anyone reported by a Civilian.',
    inc: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-28', domain: 2, title: 'Unwatched foreign asset',
    order: 'Shoot anyone recruited by a Foreigner who is neither tracked by a Spy nor vouched for by a Friend.',
    hint: 'Check who a Foreigner recruits, then cross off anyone tracked by a Spy or vouched for by a Friend.',
    inc: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  direct({
    id: 'se-29', domain: 2, title: 'Foreigner without cover',
    order: 'Shoot anyone who recruits as a Foreigner without any Friend vouching for them.',
    hint: 'Find active Foreigners, then exclude anyone vouched for by a Friend.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  direct({
    id: 'se-30', domain: 3, title: 'Endangered informant',
    order: 'Shoot anyone who tips off as a Civilian while also targeted by a Foe or briefed by a Foreigner.',
    hint: 'Find active Civilians, then keep those targeted by a Foe or briefed by a Foreigner.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-31', domain: 3, title: 'Compromised witness',
    order: 'Shoot anyone who tips off as a Civilian while also misleading as a Double agent or targeting as a Foe.',
    hint: 'Check active Civilians, then see if they also act as a Double agent or Foe.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['double', 'foe'], dir: 'out'}
  }),
  direct({
    id: 'se-32', domain: 3, title: 'Unprotected witness',
    order: 'Shoot anyone tipped off by a Civilian who is neither confirmed by a Friend nor monitored by a Spy.',
    hint: 'Check who a Civilian tips off, then exclude anyone confirmed by a Friend or monitored by a Spy.',
    inc: {roles: ['civilian'], dir: 'in'}, exc: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-33', domain: 3, title: 'Informant in plain sight',
    order: 'Shoot anyone who tips off as a Civilian while also confirming as a Friend or monitoring as a Spy.',
    hint: 'Find active Civilians, then check if they also confirm as a Friend or monitor as a Spy.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['friend', 'spy'], dir: 'out'}
  }),
  direct({
    id: 'se-34', domain: 3, title: 'Misled informant',
    order: 'Shoot anyone tipped off by a Civilian who is also misled by a Double agent.',
    hint: 'Find who is both tipped off by a Civilian and misled by a Double agent.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-35', domain: 3, title: 'Watched witness',
    order: 'Shoot anyone tipped off by a Civilian who is also monitored by a Spy — unless confirmed by a Friend.',
    hint: 'Check who is both tipped off by a Civilian and monitored by a Spy, then remove anyone confirmed by a Friend.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['spy'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-36', domain: 3, title: 'Tipped off yet threatened',
    order: 'Shoot anyone tipped off by a Civilian who is also targeted by a Foe or briefed by a Foreigner.',
    hint: 'Check who Civilians tip off, then keep those targeted by a Foe or briefed by a Foreigner.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-37', domain: 3, title: 'Warned attacker',
    order: 'Shoot anyone tipped off by a Civilian who also targets as a Foe or misleads as a Double agent.',
    hint: 'Check who Civilians tip off, then keep those acting as a Foe or Double agent.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-38', domain: 3, title: 'Unwatched target',
    order: 'Shoot anyone confirmed by a Friend or tipped off by a Civilian who is targeted by a Foe — unless monitored by a Spy.',
    hint: 'Find who is confirmed by a Friend or tipped off by a Civilian and targeted by a Foe, then cross off anyone monitored by a Spy.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-39', domain: 3, title: 'Unwarned victim',
    order: 'Shoot anyone targeted by a Foe or misled by a Double agent without any Civilian tipping them off.',
    hint: 'Find who is targeted by a Foe or misled by a Double agent, then exclude anyone tipped off by a Civilian.',
    inc: {roles: ['foe', 'double'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Multi-Role Overlap (10)
  // =========================================================================
  direct({
    id: 'se-40', domain: 4, title: 'Two-front operator',
    order: 'Shoot anyone who operates in at least two roles among Foe, Double agent, and Foreigner.',
    hint: 'Find who initiates contacts in at least two of Foe, Double agent, and Foreigner.',
    inc: {roles: ['foe', 'double', 'foreigner'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-41', domain: 4, title: 'Two-role insider',
    order: 'Shoot anyone who operates in at least two roles among Friend, Spy, and Civilian.',
    hint: 'Find who initiates contacts in at least two of Friend, Spy, and Civilian.',
    inc: {roles: ['friend', 'spy', 'civilian'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-42', domain: 4, title: 'Cross-channel operator',
    order: 'Shoot anyone who backs as a Friend or traces as a Spy while also striking as a Foe or relaying as a Double agent.',
    hint: 'Look for someone operating as Friend or Spy and also operating as Foe or Double agent.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-43', domain: 4, title: 'Triple-target magnet',
    order: 'Shoot anyone who receives contacts from at least two roles among Foe, Double agent, and Foreigner.',
    hint: 'Check who is on the receiving end of at least two of Foe, Double agent, and Foreigner.',
    inc: {roles: ['foe', 'double', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-44', domain: 4, title: 'Double-exposed recipient',
    order: 'Shoot anyone who receives contacts from at least two of Spy, Double agent, and Foreigner — unless a Friend backs them.',
    hint: 'Find who receives contacts from at least two of Spy, Double agent, and Foreigner, then exclude anyone backed by a Friend.',
    inc: {roles: ['spy', 'double', 'foreigner'], dir: 'in'}, minDistinct: 2, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-45', domain: 4, title: 'Unwatched overlap',
    order: 'Shoot anyone who receives contacts from at least two of Friend, Civilian, and Foreigner — unless a Spy traces them.',
    hint: 'Find who receives contacts from at least two of Friend, Civilian, and Foreigner, then cross off anyone traced by a Spy.',
    inc: {roles: ['friend', 'civilian', 'foreigner'], dir: 'in'}, minDistinct: 2, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-46', domain: 4, title: 'Active on two fronts',
    order: 'Shoot anyone who operates in at least two roles among Friend, Foe, Spy, and Double agent.',
    hint: 'Look for suspects initiating contacts in two or more of Friend, Foe, Spy, and Double agent.',
    inc: {roles: ['friend', 'foe', 'spy', 'double'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-47', domain: 4, title: 'Caught in the middle',
    order: 'Shoot anyone who receives contacts from at least two roles among Friend, Foe, Spy, and Civilian.',
    hint: 'Find who receives contacts from two or more of Friend, Foe, Spy, and Civilian.',
    inc: {roles: ['friend', 'foe', 'spy', 'civilian'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-48', domain: 4, title: 'Dual courier',
    order: 'Shoot anyone backed by a Friend or warned by a Civilian who also relays as a Double agent or hands off as a Foreigner.',
    hint: 'Check who is backed by a Friend or warned by a Civilian, then keep anyone operating as Double agent or Foreigner.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-49', domain: 4, title: 'Unwatched intermediary',
    order: 'Shoot anyone who operates in at least two of Friend, Foe, and Civilian — unless a Spy traces them.',
    hint: 'Find who operates in at least two of Friend, Foe, and Civilian, then exclude anyone traced by a Spy.',
    inc: {roles: ['friend', 'foe', 'civilian'], dir: 'out'}, minDistinct: 2, exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  direct({
    id: 'se-50', domain: 5, title: 'Corroborated yet accused',
    order: 'Shoot anyone corroborated by a Friend who is also accused by a Foe.',
    hint: 'Find who is both corroborated by a Friend and accused by a Foe.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-51', domain: 5, title: 'Corroborated by two insiders',
    order: 'Shoot anyone corroborated by a Friend who is also verified by a Spy or identified by a Civilian.',
    hint: 'Check who is corroborated by a Friend, then see if a Spy verified them or a Civilian identified them.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['spy', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-52', domain: 5, title: 'Verified yet accused',
    order: 'Shoot anyone verified by a Spy who is also accused by a Foe.',
    hint: 'Find who is both verified by a Spy and accused by a Foe.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-53', domain: 5, title: 'Corroborated yet deceived',
    order: 'Shoot anyone corroborated by a Friend who is also deceived by a Double agent.',
    hint: 'Find who is both corroborated by a Friend and deceived by a Double agent.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-54', domain: 5, title: 'Identified yet accused',
    order: 'Shoot anyone identified by a Civilian who is also accused by a Foe.',
    hint: 'Find who is both identified by a Civilian and accused by a Foe.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-55', domain: 5, title: 'Accuser consulting a Foreigner',
    order: 'Shoot anyone who accuses someone as a Foe while also consulted by a Foreigner.',
    hint: 'Find active Foes who are also consulted by a Foreigner.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-56', domain: 5, title: 'Accused and deceived',
    order: 'Shoot anyone accused by a Foe who is also deceived by a Double agent.',
    hint: 'Find who is both accused by a Foe and deceived by a Double agent.',
    inc: {roles: ['foe'], dir: 'in'}, req: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-57', domain: 5, title: 'Broken alibi',
    order: 'Shoot anyone corroborated by a Friend who also accuses someone as a Foe.',
    hint: 'Check who a Friend corroborates, then keep anyone who also accuses someone as a Foe.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe'], dir: 'out'}
  }),
  direct({
    id: 'se-58', domain: 5, title: 'Foreigner’s verifier',
    order: 'Shoot anyone who verifies someone as a Spy while also consulted by a Foreigner.',
    hint: 'Find active Spies, then keep anyone consulted by a Foreigner.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-59', domain: 5, title: 'Friend turned deceiver',
    order: 'Shoot anyone who corroborates someone as a Friend while also deceiving as a Double agent.',
    hint: 'Find active Friends who also deceive someone as a Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['double'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  timed({
    id: 'se-60', domain: 6, title: 'Clearance before betrayal',
    order: 'Shoot anyone cleared by a Friend earlier than they leaked as a Double agent or met someone as a Foreigner.',
    hint: 'Compare dispatch times: Friend clearance must come earlier than their Double agent or Foreigner action.',
    early: {roles: ['friend'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timed({
    id: 'se-61', domain: 6, title: 'Late surveillance',
    order: 'Shoot anyone who struck as a Foe or leaked as a Double agent before a Spy logged them.',
    hint: 'Compare timestamps: their Foe or Double agent action must happen earlier than the Spy log.',
    early: {roles: ['foe', 'double'], dir: 'out'}, late: {roles: ['spy'], dir: 'in'}
  }),
  timed({
    id: 'se-62', domain: 6, title: 'Relayed after correction',
    order: 'Shoot anyone who cleared someone as a Friend after a Civilian had already corrected them.',
    hint: 'Check timestamps: the Civilian correction must arrive earlier than their Friend clearance.',
    early: {roles: ['civilian'], dir: 'in'}, late: {roles: ['friend'], dir: 'out'}
  }),
  timed({
    id: 'se-63', domain: 6, title: 'Corrected before leaking',
    order: 'Shoot anyone corrected by a Civilian earlier than they leaked as a Double agent or met someone as a Foreigner.',
    hint: 'Compare timestamps: Civilian correction must come earlier than their Double agent or Foreigner action.',
    early: {roles: ['civilian'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timed({
    id: 'se-64', domain: 6, title: 'Cleared after a strike',
    order: 'Shoot anyone struck by a Foe earlier than a Friend cleared them.',
    hint: 'Compare timestamps: the Foe strike must happen earlier than the Friend clearance.',
    early: {roles: ['foe'], dir: 'in'}, late: {roles: ['friend'], dir: 'in'}
  }),
  timed({
    id: 'se-65', domain: 6, title: 'Meeting before the strike',
    order: 'Shoot anyone met by a Foreigner earlier than a Foe struck them.',
    hint: 'Compare timestamps: the Foreigner meeting must come earlier than the Foe strike.',
    early: {roles: ['foreigner'], dir: 'in'}, late: {roles: ['foe'], dir: 'in'}
  }),
  timed({
    id: 'se-66', domain: 6, title: 'Logged before the leak',
    order: 'Shoot anyone logged by a Spy earlier than they received a Double agent’s leak or a Foreigner’s meeting.',
    hint: 'Compare timestamps: the Spy log must come earlier than the Double agent leak or Foreigner meeting.',
    early: {roles: ['spy'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  timed({
    id: 'se-67', domain: 6, title: 'Corrected before the strike',
    order: 'Shoot anyone corrected by a Civilian earlier than a Foe struck them.',
    hint: 'Compare timestamps: the Civilian correction must arrive earlier than the Foe strike.',
    early: {roles: ['civilian'], dir: 'in'}, late: {roles: ['foe'], dir: 'in'}
  }),
  timed({
    id: 'se-68', domain: 6, title: 'Leak before cover',
    order: 'Shoot anyone who leaked as a Double agent earlier than a Friend cleared them or a Spy logged them.',
    hint: 'Compare timestamps: the Double agent leak must occur earlier than Friend clearance or Spy logging.',
    early: {roles: ['double'], dir: 'out'}, late: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  timed({
    id: 'se-69', domain: 6, title: 'Late foreign contact',
    order: 'Shoot anyone cleared by a Friend or logged by a Spy earlier than a Foreigner met them.',
    hint: 'Compare timestamps: Friend clearance or Spy logging must occur earlier than the Foreigner meeting.',
    early: {roles: ['friend', 'spy'], dir: 'in'}, late: {roles: ['foreigner'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  direct({
    id: 'se-70', domain: 7, title: 'Coerced mole',
    order: 'Shoot anyone who compromises someone as a Double agent while also coerced by a Foe.',
    hint: 'Find active Double agents who are also coerced by a Foe.',
    inc: {roles: ['double'], dir: 'out'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-71', domain: 7, title: 'Coerced vetter',
    order: 'Shoot anyone coerced by a Foe who also vets someone as a Spy.',
    hint: 'Find who is coerced by a Foe and also vets someone as a Spy.',
    inc: {roles: ['foe'], dir: 'in'}, req: {roles: ['spy'], dir: 'out'}
  }),
  direct({
    id: 'se-72', domain: 7, title: 'Exposed coercer',
    order: 'Shoot anyone who coerces someone as a Foe while also exposed by a Civilian.',
    hint: 'Find active Foes who are exposed by a Civilian.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-73', domain: 7, title: 'Mole with an alibi',
    order: 'Shoot anyone who compromises someone as a Double agent while also given an alibi by a Friend.',
    hint: 'Find active Double agents who also receive a Friend’s alibi.',
    inc: {roles: ['double'], dir: 'out'}, req: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-74', domain: 7, title: 'Funder with an alibi',
    order: 'Shoot anyone who funds someone as a Foreigner while also given an alibi by a Friend.',
    hint: 'Find active Foreigners who also receive a Friend’s alibi.',
    inc: {roles: ['foreigner'], dir: 'out'}, req: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-75', domain: 7, title: 'Vetted mole',
    order: 'Shoot anyone who compromises someone as a Double agent while also vetted by a Spy.',
    hint: 'Find active Double agents who are vetted by a Spy.',
    inc: {roles: ['double'], dir: 'out'}, req: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-76', domain: 7, title: 'Exposed informer',
    order: 'Shoot anyone compromised by a Double agent who also exposes someone as a Civilian or alibis someone as a Friend.',
    hint: 'Check who a Double agent compromises, then keep anyone acting as a Civilian or Friend.',
    inc: {roles: ['double'], dir: 'in'}, req: {roles: ['civilian', 'friend'], dir: 'out'}
  }),
  direct({
    id: 'se-77', domain: 7, title: 'Funded coercer',
    order: 'Shoot anyone who coerces as a Foe while also funded by a Foreigner or vetted by a Spy.',
    hint: 'Find active Foes who are funded by a Foreigner or vetted by a Spy.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['foreigner', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-78', domain: 7, title: 'Unvetted witness target',
    order: 'Shoot anyone exposed by a Civilian who is also coerced by a Foe or funded by a Foreigner — unless vetted by a Spy.',
    hint: 'Check who a Civilian exposes, keep those coerced by a Foe or funded by a Foreigner, and exclude anyone vetted by a Spy.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-79', domain: 7, title: 'Foreigner’s funded mole',
    order: 'Shoot anyone funded by a Foreigner who is also compromised by a Double agent.',
    hint: 'Find who is both funded by a Foreigner and compromised by a Double agent.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['double'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  direct({
    id: 'se-80', domain: 8, title: 'Protector on a leash',
    order: 'Shoot anyone who protects someone as a Friend while also hosted by a Foreigner or leaked to by a Double agent.',
    hint: 'Find active Friends, then keep anyone hosted by a Foreigner or leaked to by a Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foreigner', 'double'], dir: 'in'}
  }),
  direct({
    id: 'se-81', domain: 8, title: 'Watcher and watched',
    order: 'Shoot anyone who watches someone as a Spy while also protected by a Friend or sheltered by a Civilian.',
    hint: 'Find active Spies, then keep anyone protected by a Friend or sheltered by a Civilian.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-82', domain: 8, title: 'Host with ally or spy cover',
    order: 'Shoot anyone who leaks as a Double agent or hosts as a Foreigner while also protected by a Friend or watched by a Spy.',
    hint: 'Find active Double agents and Foreigners, then keep anyone protected by a Friend or watched by a Spy.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, req: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-83', domain: 8, title: 'Hunter under watch',
    order: 'Shoot anyone who hunts as a Foe while also watched by a Spy.',
    hint: 'Find active Foes who are watched by a Spy.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-84', domain: 8, title: 'Unprotected outsider',
    order: 'Shoot anyone hosted by a Foreigner or leaked to by a Double agent who is neither protected by a Friend nor sheltered by a Civilian.',
    hint: 'Find who a Foreigner hosts or a Double agent leaks to, then exclude anyone protected by a Friend or sheltered by a Civilian.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-85', domain: 8, title: 'Protected without hunter',
    order: 'Shoot anyone protected by a Friend or sheltered by a Civilian who is neither hunted by a Foe nor hosted by a Foreigner.',
    hint: 'Find who is protected by a Friend or sheltered by a Civilian, then cross off anyone hunted by a Foe or hosted by a Foreigner.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-86', domain: 8, title: 'Hunter without shelter',
    order: 'Shoot anyone who hunts as a Foe or watches as a Spy while neither protected by a Friend nor sheltered by a Civilian.',
    hint: 'Find active Foes and Spies, then exclude anyone protected by a Friend or sheltered by a Civilian.',
    inc: {roles: ['foe', 'spy'], dir: 'out'}, exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-87', domain: 8, title: 'Unwatched host',
    order: 'Shoot anyone who hosts as a Foreigner or shelters as a Civilian while neither watched by a Spy nor hunted by a Foe.',
    hint: 'Find active Foreigners and Civilians, then exclude anyone watched by a Spy or hunted by a Foe.',
    inc: {roles: ['foreigner', 'civilian'], dir: 'out'}, exc: {roles: ['spy', 'foe'], dir: 'in'}
  }),
  direct({
    id: 'se-88', domain: 8, title: 'Isolated watcher',
    order: 'Shoot anyone watched by a Spy or leaked to by a Double agent who is neither protected by a Friend nor hosted by a Foreigner.',
    hint: 'Find who is watched by a Spy or leaked to by a Double agent, then exclude anyone protected by a Friend or hosted by a Foreigner.',
    inc: {roles: ['spy', 'double'], dir: 'in'}, exc: {roles: ['friend', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-89', domain: 8, title: 'Double-sided shelter',
    order: 'Shoot anyone who shelters someone as a Civilian while also protected by a Friend or watched by a Spy.',
    hint: 'Find active Civilians who are also protected by a Friend or watched by a Spy.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['friend', 'spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 9: Named-Subject Leads (10)
  // =========================================================================
  anchorDirect({
    id: 'se-90', domain: 9, title: '{name}’s outgoing contacts',
    order: 'Shoot anyone {name} directly reaches in any role — unless a Friend vouches for them.',
    hint: 'Find who {name} acts toward in any dispatch, then exclude anyone vouched for by a Friend.',
    incRoles: null, incDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-91', domain: 9, title: '{name}’s incoming contacts',
    order: 'Shoot anyone who acts directly toward {name} in any role — unless a Spy shadows them.',
    hint: 'Find who acts toward {name} in any dispatch, then exclude anyone shadowed by a Spy.',
    incRoles: null, incDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-92', domain: 9, title: '{name}’s compromised contacts',
    order: 'Shoot anyone {name} reaches directly who also targets as a Foe, leaks as a Double agent, or meets as a Foreigner.',
    hint: 'Find who {name} reaches directly, then keep those who also act as Foe, Double agent, or Foreigner.',
    incRoles: null, incDir: 'out', req: {roles: ['foe', 'double', 'foreigner'], dir: 'out'}
  }),
  anchorDirect({
    id: 'se-93', domain: 9, title: '{name}’s insider contacts',
    order: 'Shoot anyone acting directly toward {name} who is also vouched for by a Friend or tipped off by a Civilian.',
    hint: 'Find who acts toward {name}, then keep those vouched for by a Friend or tipped off by a Civilian.',
    incRoles: null, incDir: 'in', req: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-94', domain: 9, title: '{name}’s unbacked contacts',
    order: 'Shoot anyone acting directly toward {name} who has no Friend vouching for them.',
    hint: 'Find who acts toward {name}, then rule out anyone vouched for by a Friend.',
    incRoles: null, incDir: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-95', domain: 9, title: '{name}’s unwatched targets',
    order: 'Shoot anyone {name} reaches directly who has no Spy shadowing them.',
    hint: 'Find who {name} reaches directly, then rule out anyone shadowed by a Spy.',
    incRoles: null, incDir: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-96', domain: 9, title: '{name}’s watched leaks',
    order: 'Shoot anyone {name} reaches directly who is also shadowed by a Spy or receives a Double agent’s leak.',
    hint: 'Find who {name} reaches directly, then keep anyone shadowed by a Spy or fed a Double agent’s leak.',
    incRoles: null, incDir: 'out', req: {roles: ['spy', 'double'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-97', domain: 9, title: '{name}’s unwarned contacts',
    order: 'Shoot anyone {name} reaches directly without any Civilian tipping them off.',
    hint: 'Find who {name} reaches directly, then exclude anyone tipped off by a Civilian.',
    incRoles: null, incDir: 'out', exc: {roles: ['civilian'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-98', domain: 9, title: '{name}’s allied channel',
    order: 'Shoot anyone {name} vouches for as a Friend, shadows as a Spy, or tips off as a Civilian.',
    hint: 'Check who {name} reaches in Friend, Spy, or Civilian.',
    incRoles: ['friend', 'spy', 'civilian'], incDir: 'out'
  }),
  anchorDirect({
    id: 'se-99', domain: 9, title: '{name}’s shadow callers',
    order: 'Shoot anyone who targets {name} as a Foe, leaks to {name} as a Double agent, or meets {name} as a Foreigner.',
    hint: 'Check who acts toward {name} in Foe, Double agent, or Foreigner.',
    incRoles: ['foe', 'double', 'foreigner'], incDir: 'in'
  })
];
