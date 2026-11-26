import {collectMatches} from './case-graph.js';
import {matchAtom, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Super Easy intelligence cases (10 domains × 10 families).
// Direct, crisp officer calls integrating 2+ categories (or timing / explicit exception)
// with zero single-file shortcuts, zero arithmetic scoring, and variable target counts (1–4).

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

function anchorDirect({id, domain, title, order, hint, incRoles, incDir = 'any', req = null, exc = null}) {
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
    order: 'Shoot anyone a Friend vouches for who also leaks as a Double agent or meets a Foreigner.',
    hint: 'Check who a Friend vouches for, then look for them acting as a Double agent or Foreigner.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-01', domain: 0, title: 'False voucher',
    order: 'Shoot anyone who vouches as a Friend while also targeting as a Foe or leaking as a Double agent.',
    hint: 'Start with the Friends doing the vouching, then check if they also act in Foe or Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-02', domain: 0, title: 'Compromised ally',
    order: 'Shoot anyone named in the Friend file who also appears in Double agent or Foreigner.',
    hint: 'Look at everyone in Friend, then keep those also listed under Double agent or Foreigner.',
    inc: {roles: ['friend']}, req: {roles: ['double', 'foreigner']}
  }),
  direct({
    id: 'se-03', domain: 0, title: 'Unbacked mole',
    order: 'Shoot anyone named in the Double agent file who has no Friend vouching for them.',
    hint: 'Find everyone in Double agent, then rule out anyone backed by a Friend.',
    inc: {roles: ['double']}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-04', domain: 0, title: 'Bitter ally',
    order: 'Shoot anyone named in both Friend and Foe, unless a Spy shadows them.',
    hint: 'Find who appears in both Friend and Foe, then rule out anyone under Spy watch.',
    inc: {roles: ['friend']}, req: {roles: ['foe']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-05', domain: 0, title: 'Active traitor',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe — excluding anyone who vouches as a Friend.',
    hint: 'Find who leaks in Double agent or targets in Foe, then cross off active Friend vouchers.',
    inc: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'out'}
  }),
  direct({
    id: 'se-06', domain: 0, title: 'Exposed recipient',
    order: 'Shoot anyone who receives a Double agent’s leak or is met by a Foreigner — unless a Friend vouches for them.',
    hint: 'Check who receives a Double agent leak or Foreigner meeting, then exclude anyone backed by a Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-07', domain: 0, title: 'Turned insider',
    order: 'Shoot anyone who vouches as a Friend and also appears in the Foreigner or Double agent file.',
    hint: 'Start with active Friend vouchers, then keep anyone also named in Foreigner or Double agent.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foreigner', 'double']}
  }),
  direct({
    id: 'se-08', domain: 0, title: 'Openly trusted, secretly marked',
    order: 'Shoot anyone named in Friend or Civilian who is also targeted by a Foe or receives a Double agent’s leak.',
    hint: 'Find who is targeted by a Foe or fed a leak, then keep those also in Friend or Civilian.',
    inc: {roles: ['foe', 'double'], dir: 'in'}, req: {roles: ['friend', 'civilian']}
  }),
  direct({
    id: 'se-09', domain: 0, title: 'Unprotected turncoat',
    order: 'Shoot anyone who leaks as a Double agent or meets a Foreigner — unless a Friend vouches for them.',
    hint: 'Check who acts in Double agent or Foreigner, then rule out anyone vouched for by a Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10)
  // =========================================================================
  direct({
    id: 'se-10', domain: 1, title: 'Unwatched mole',
    order: 'Shoot anyone named in the Double agent file who is not shadowed by a Spy.',
    hint: 'Check everyone in Double agent, then rule out anyone a Spy shadows.',
    inc: {roles: ['double']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-11', domain: 1, title: 'Unwatched hostile',
    order: 'Shoot anyone who targets as a Foe or meets as a Foreigner without a Spy shadowing them.',
    hint: 'Check active actors in Foe and Foreigner, then rule out anyone under Spy watch.',
    inc: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-12', domain: 1, title: 'Compromised watcher',
    order: 'Shoot anyone who shadows as a Spy while also appearing in Foe or Double agent.',
    hint: 'Find the Spies doing the shadowing, then see who also appears in Foe or Double agent.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foe', 'double']}
  }),
  direct({
    id: 'se-13', domain: 1, title: 'Flagged and exposed',
    order: 'Shoot anyone shadowed by a Spy who also appears in Foe or Foreigner.',
    hint: 'Start with suspects shadowed by a Spy, then keep those also listed under Foe or Foreigner.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['foe', 'foreigner']}
  }),
  direct({
    id: 'se-14', domain: 1, title: 'Blind-spot civilian',
    order: 'Shoot anyone named in the Civilian file who is neither shadowed by a Spy nor vouched for by a Friend.',
    hint: 'Check everyone in Civilian, then cross off anyone backed by a Friend or shadowed by a Spy.',
    inc: {roles: ['civilian']}, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),
  direct({
    id: 'se-15', domain: 1, title: 'Spy in hostile hands',
    order: 'Shoot anyone in the Spy file who is targeted by a Foe or met by a Foreigner.',
    hint: 'Check who appears in Spy, then keep those targeted by a Foe or met by a Foreigner.',
    inc: {roles: ['spy']}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-16', domain: 1, title: 'Unwatched threat',
    order: 'Shoot anyone in Foe or Double agent who has no contact in the Spy file at all.',
    hint: 'Check everyone in Foe and Double agent, then exclude anyone named anywhere in Spy.',
    inc: {roles: ['foe', 'double']}, exc: {roles: ['spy']}
  }),
  direct({
    id: 'se-17', domain: 1, title: 'Shadowed ally',
    order: 'Shoot anyone vouched for by a Friend who is also shadowed by a Spy.',
    hint: 'Find suspects backed by a Friend, then check who is also shadowed by a Spy.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-18', domain: 1, title: 'Watcher on the take',
    order: 'Shoot anyone who shadows as a Spy while also receiving a Double agent’s leak or Civilian tip-off.',
    hint: 'Start with active Spies, then keep those fed a leak or tip-off.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['double', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-19', domain: 1, title: 'Watched and warned',
    order: 'Shoot anyone shadowed by a Spy who is also tipped off by a Civilian or targeted by a Foe.',
    hint: 'Find suspects shadowed by a Spy, then keep those tipped off by a Civilian or targeted by a Foe.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['civilian', 'foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10)
  // =========================================================================
  direct({
    id: 'se-20', domain: 2, title: 'Unmonitored foreign drop',
    order: 'Shoot anyone named in the Foreigner file who is not shadowed by a Spy.',
    hint: 'Check everyone in Foreigner, then rule out anyone shadowed by a Spy.',
    inc: {roles: ['foreigner']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-21', domain: 2, title: 'Foreigner with a mole',
    order: 'Shoot anyone named in both Foreigner and Double agent.',
    hint: 'Look for overlap between the Foreigner and Double agent files.',
    inc: {roles: ['foreigner']}, req: {roles: ['double']}
  }),
  direct({
    id: 'se-22', domain: 2, title: 'Foreigner and Foe',
    order: 'Shoot anyone named in both Foreigner and Foe.',
    hint: 'Look for suspects appearing in both Foreigner and Foe.',
    inc: {roles: ['foreigner']}, req: {roles: ['foe']}
  }),
  direct({
    id: 'se-23', domain: 2, title: 'Foreigner among civilians',
    order: 'Shoot anyone named in both Foreigner and Civilian.',
    hint: 'Check which suspects show up in both Foreigner and Civilian.',
    inc: {roles: ['foreigner']}, req: {roles: ['civilian']}
  }),
  direct({
    id: 'se-24', domain: 2, title: 'Foreigner’s inside contact',
    order: 'Shoot anyone met by a Foreigner who also appears in Friend or Civilian.',
    hint: 'Find who a Foreigner meets, then keep anyone also named in Friend or Civilian.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['friend', 'civilian']}
  }),
  direct({
    id: 'se-25', domain: 2, title: 'Foreign recruiter',
    order: 'Shoot anyone who meets someone as a Foreigner — unless a Friend vouches for them or a Spy shadows them.',
    hint: 'Check active Foreigner contacts, then exclude anyone backed by a Friend or shadowed by a Spy.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-26', domain: 2, title: 'Foreign reach',
    order: 'Shoot anyone in the Foreigner file who also targets as a Foe or leaks as a Double agent.',
    hint: 'Start with everyone in Foreigner, then check who acts in Foe or Double agent.',
    inc: {roles: ['foreigner']}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-27', domain: 2, title: 'Unwarned foreign target',
    order: 'Shoot anyone named in Foreigner who has no contact in the Civilian file.',
    hint: 'Check everyone in Foreigner, then rule out anyone also named in Civilian.',
    inc: {roles: ['foreigner']}, exc: {roles: ['civilian']}
  }),
  direct({
    id: 'se-28', domain: 2, title: 'Foreign contact under cover',
    order: 'Shoot anyone met by a Foreigner who vouches as a Friend or shadows as a Spy.',
    hint: 'Find who a Foreigner meets, then check if they vouch as a Friend or shadow as a Spy.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['friend', 'spy'], dir: 'out'}
  }),
  direct({
    id: 'se-29', domain: 2, title: 'Foreigner without cover',
    order: 'Shoot anyone named in Foreigner who has no Friend vouching for them.',
    hint: 'Check everyone in Foreigner, then cross off anyone backed by a Friend.',
    inc: {roles: ['foreigner']}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10)
  // =========================================================================
  direct({
    id: 'se-30', domain: 3, title: 'Endangered informant',
    order: 'Shoot anyone named in Civilian who is targeted by a Foe or met by a Foreigner.',
    hint: 'Find everyone in Civilian, then check who is targeted by a Foe or met by a Foreigner.',
    inc: {roles: ['civilian']}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-31', domain: 3, title: 'Compromised witness',
    order: 'Shoot anyone who tips off as a Civilian while also appearing in Double agent or Foe.',
    hint: 'Check active Civilian informants, then see who also appears in Double agent or Foe.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['double', 'foe']}
  }),
  direct({
    id: 'se-32', domain: 3, title: 'Unshielded tip recipient',
    order: 'Shoot anyone tipped off by a Civilian who has no Friend vouching for them.',
    hint: 'Find who a Civilian tips off, then exclude anyone backed by a Friend.',
    inc: {roles: ['civilian'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-33', domain: 3, title: 'Informant in the dark',
    order: 'Shoot anyone who tips off as a Civilian without a Spy shadowing them.',
    hint: 'Check active Civilian informants, then rule out anyone shadowed by a Spy.',
    inc: {roles: ['civilian'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-34', domain: 3, title: 'Civilian mole',
    order: 'Shoot anyone named in both Civilian and Double agent.',
    hint: 'Look for overlap between Civilian and Double agent.',
    inc: {roles: ['civilian']}, req: {roles: ['double']}
  }),
  direct({
    id: 'se-35', domain: 3, title: 'Civilian under watch',
    order: 'Shoot anyone named in both Civilian and Spy, excluding anyone backed by a Friend.',
    hint: 'Find who appears in both Civilian and Spy, then cross off anyone backed by a Friend.',
    inc: {roles: ['civilian']}, req: {roles: ['spy']}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-36', domain: 3, title: 'Tipped off and leaked to',
    order: 'Shoot anyone tipped off by a Civilian who also receives a Double agent’s leak or is met by a Foreigner.',
    hint: 'Start with Civilian tip recipients, then keep those also fed a leak or met by a Foreigner.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-37', domain: 3, title: 'Hostile civilian',
    order: 'Shoot anyone named in Civilian who also targets as a Foe or leaks as a Double agent.',
    hint: 'Start with everyone in Civilian, then see who acts in Foe or Double agent.',
    inc: {roles: ['civilian']}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-38', domain: 3, title: 'Warned ally in danger',
    order: 'Shoot anyone in Friend or Civilian who is targeted by a Foe, unless shadowed by a Spy.',
    hint: 'Find who is targeted by a Foe and named in Friend or Civilian, then rule out anyone under Spy watch.',
    inc: {roles: ['foe'], dir: 'in'}, req: {roles: ['friend', 'civilian']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-39', domain: 3, title: 'Unwarned hostile',
    order: 'Shoot anyone who targets as a Foe — excluding anyone tipped off by a Civilian.',
    hint: 'Find active Foes, then cross off anyone who received a Civilian tip-off.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (Direct Multi-File Intersections) (10)
  // =========================================================================
  direct({
    id: 'se-40', domain: 4, title: 'Two covert channels',
    order: 'Shoot anyone named in at least two of Foe, Double agent, and Foreigner.',
    hint: 'Check which suspects appear in two or more of Foe, Double agent, and Foreigner.',
    inc: {roles: ['foe', 'double', 'foreigner']}, minDistinct: 2
  }),
  direct({
    id: 'se-41', domain: 4, title: 'Two overt channels',
    order: 'Shoot anyone named in at least two of Friend, Spy, and Civilian.',
    hint: 'Check which suspects appear in two or more of Friend, Spy, and Civilian.',
    inc: {roles: ['friend', 'spy', 'civilian']}, minDistinct: 2
  }),
  direct({
    id: 'se-42', domain: 4, title: 'Cross-channel actor',
    order: 'Shoot anyone who acts in at least two of Friend, Foe, Spy, and Double agent.',
    hint: 'Check who initiates contact in two or more of Friend, Foe, Spy, and Double agent.',
    inc: {roles: ['friend', 'foe', 'spy', 'double'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-43', domain: 4, title: 'Cross-channel recipient',
    order: 'Shoot anyone targeted, shadowed, leaked to, or met across at least two of Foe, Spy, Double agent, and Foreigner.',
    hint: 'Check who is on the receiving end in two or more of Foe, Spy, Double agent, and Foreigner.',
    inc: {roles: ['foe', 'spy', 'double', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-44', domain: 4, title: 'Double-exposed contact',
    order: 'Shoot anyone named in at least two of Spy, Double agent, and Foreigner — unless a Friend vouches for them.',
    hint: 'Find overlap across Spy, Double agent, and Foreigner, then exclude anyone backed by a Friend.',
    inc: {roles: ['spy', 'double', 'foreigner']}, minDistinct: 2, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-45', domain: 4, title: 'Overlapping cover',
    order: 'Shoot anyone named in at least two of Friend, Civilian, and Foreigner — unless shadowed by a Spy.',
    hint: 'Find overlap across Friend, Civilian, and Foreigner, then rule out anyone shadowed by a Spy.',
    inc: {roles: ['friend', 'civilian', 'foreigner']}, minDistinct: 2, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-46', domain: 4, title: 'Active on two fronts',
    order: 'Shoot anyone who acts in at least two of Foe, Double agent, Civilian, and Foreigner.',
    hint: 'Check who acts in two or more of Foe, Double agent, Civilian, and Foreigner.',
    inc: {roles: ['foe', 'double', 'civilian', 'foreigner'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-47', domain: 4, title: 'Caught in two crosshairs',
    order: 'Shoot anyone on the receiving end in at least two of Friend, Foe, Civilian, and Foreigner.',
    hint: 'Check who receives contact in two or more of Friend, Foe, Civilian, and Foreigner.',
    inc: {roles: ['friend', 'foe', 'civilian', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-48', domain: 4, title: 'Covert bridge',
    order: 'Shoot anyone named in Friend or Civilian who also appears in Foe, Double agent, or Foreigner — excluding anyone who shadows as a Spy.',
    hint: 'Check suspects in Friend or Civilian who also appear in Foe, Double agent, or Foreigner, then rule out active Spies.',
    inc: {roles: ['friend', 'civilian']}, req: {roles: ['foe', 'double', 'foreigner']}, exc: {roles: ['spy'], dir: 'out'}
  }),
  direct({
    id: 'se-49', domain: 4, title: 'Unwatched multi-file contact',
    order: 'Shoot anyone named in at least two of Friend, Foe, and Civilian — excluding anyone in Spy.',
    hint: 'Find overlap across Friend, Foe, and Civilian, then exclude anyone in Spy.',
    inc: {roles: ['friend', 'foe', 'civilian']}, minDistinct: 2, exc: {roles: ['spy']}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10)
  // =========================================================================
  direct({
    id: 'se-50', domain: 5, title: 'Friend and Foe mark',
    order: 'Shoot anyone vouched for by a Friend who is also targeted by a Foe.',
    hint: 'Check who is backed by a Friend and also targeted by a Foe.',
    inc: {roles: ['friend'], dir: 'in'}, req: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-51', domain: 5, title: 'Voucher turned enemy',
    order: 'Shoot anyone who vouches as a Friend and also targets as a Foe.',
    hint: 'Check who vouches in Friend and also targets in Foe.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe'], dir: 'out'}
  }),
  direct({
    id: 'se-52', domain: 5, title: 'Informant turned mole',
    order: 'Shoot anyone who tips off as a Civilian and also leaks as a Double agent.',
    hint: 'Check who acts in Civilian and also leaks in Double agent.',
    inc: {roles: ['civilian'], dir: 'out'}, req: {roles: ['double'], dir: 'out'}
  }),
  direct({
    id: 'se-53', domain: 5, title: 'Watcher turned mole',
    order: 'Shoot anyone who shadows as a Spy and also leaks as a Double agent.',
    hint: 'Check who shadows in Spy and also leaks in Double agent.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['double'], dir: 'out'}
  }),
  direct({
    id: 'se-54', domain: 5, title: 'Shadowed and backed',
    order: 'Shoot anyone shadowed by a Spy who also vouches as a Friend or tips off as a Civilian.',
    hint: 'Find suspects shadowed by a Spy, then check who acts in Friend or Civilian.',
    inc: {roles: ['spy'], dir: 'in'}, req: {roles: ['friend', 'civilian'], dir: 'out'}
  }),
  direct({
    id: 'se-55', domain: 5, title: 'Hostile receiving cover',
    order: 'Shoot anyone who targets as a Foe while a Friend vouches for them or a Civilian tips them off.',
    hint: 'Find active Foes, then keep those backed by a Friend or tipped off by a Civilian.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-56', domain: 5, title: 'Mole under Friend cover',
    order: 'Shoot anyone who leaks as a Double agent while a Friend vouches for them or a Spy shadows them.',
    hint: 'Find active Double agents, then keep those backed by a Friend or shadowed by a Spy.',
    inc: {roles: ['double'], dir: 'out'}, req: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-57', domain: 5, title: 'Contradictory drop',
    order: 'Shoot anyone met by a Foreigner who is also targeted by a Foe or tipped off by a Civilian.',
    hint: 'Find who a Foreigner meets, then check if a Foe targets them or a Civilian tips them off.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['foe', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-58', domain: 5, title: 'Spy working with outsiders',
    order: 'Shoot anyone named in Spy who also appears in Foreigner.',
    hint: 'Look for overlap between the Spy and Foreigner files.',
    inc: {roles: ['spy']}, req: {roles: ['foreigner']}
  }),
  direct({
    id: 'se-59', domain: 5, title: 'Conflicted insider',
    order: 'Shoot anyone named in both Friend and Double agent.',
    hint: 'Look for overlap between the Friend and Double agent files.',
    inc: {roles: ['friend']}, req: {roles: ['double']}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10)
  // =========================================================================
  timed({
    id: 'se-60', domain: 6, title: 'Cover before betrayal',
    order: 'Shoot anyone named in Friend earlier than they appear in Double agent or Foreigner.',
    hint: 'Compare the dispatch times: Friend must come earlier than Double agent or Foreigner.',
    early: {roles: ['friend']}, late: {roles: ['double', 'foreigner']}
  }),
  timed({
    id: 'se-61', domain: 6, title: 'Late surveillance',
    order: 'Shoot anyone named in Foe or Double agent before a Spy shadowed them.',
    hint: 'Check dispatch times: the Foe or Double agent contact must precede the Spy watch.',
    early: {roles: ['foe', 'double']}, late: {roles: ['spy'], dir: 'in'}
  }),
  timed({
    id: 'se-62', domain: 6, title: 'Warning too late',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner before a Civilian tipped them off.',
    hint: 'Check dispatch times: Foe or Foreigner must be earlier than the Civilian tip-off.',
    early: {roles: ['foe', 'foreigner'], dir: 'in'}, late: {roles: ['civilian'], dir: 'in'}
  }),
  timed({
    id: 'se-63', domain: 6, title: 'Early tip, late leak',
    order: 'Shoot anyone named in Civilian earlier than they appear in Double agent or Foreigner.',
    hint: 'Compare dispatch times: Civilian must precede Double agent or Foreigner.',
    early: {roles: ['civilian']}, late: {roles: ['double', 'foreigner']}
  }),
  timed({
    id: 'se-64', domain: 6, title: 'Backed after hostility',
    order: 'Shoot anyone named in Foe earlier than a Friend vouched for them.',
    hint: 'Check dispatch times: Foe must be earlier than the Friend vouching.',
    early: {roles: ['foe']}, late: {roles: ['friend'], dir: 'in'}
  }),
  timed({
    id: 'se-65', domain: 6, title: 'Meeting before the hit',
    order: 'Shoot anyone named in Foreigner earlier than they appear in Foe.',
    hint: 'Compare dispatch times: Foreigner must precede Foe.',
    early: {roles: ['foreigner']}, late: {roles: ['foe']}
  }),
  timed({
    id: 'se-66', domain: 6, title: 'Shadowed before the leak',
    order: 'Shoot anyone shadowed by a Spy earlier than they appear in Double agent or Foreigner.',
    hint: 'Compare dispatch times: the Spy watch must precede Double agent or Foreigner.',
    early: {roles: ['spy'], dir: 'in'}, late: {roles: ['double', 'foreigner']}
  }),
  timed({
    id: 'se-67', domain: 6, title: 'Tipped off before the hit',
    order: 'Shoot anyone named in Civilian earlier than they appear in Foe.',
    hint: 'Compare dispatch times: Civilian must precede Foe.',
    early: {roles: ['civilian']}, late: {roles: ['foe']}
  }),
  timed({
    id: 'se-68', domain: 6, title: 'Leak before cover',
    order: 'Shoot anyone named in Double agent earlier than they appear in Friend or Spy.',
    hint: 'Compare dispatch times: Double agent must precede Friend or Spy.',
    early: {roles: ['double']}, late: {roles: ['friend', 'spy']}
  }),
  timed({
    id: 'se-69', domain: 6, title: 'Late foreign contact',
    order: 'Shoot anyone named in Friend or Spy earlier than they appear in Foreigner.',
    hint: 'Compare dispatch times: Friend or Spy must precede Foreigner.',
    early: {roles: ['friend', 'spy']}, late: {roles: ['foreigner']}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10)
  // =========================================================================
  direct({
    id: 'se-70', domain: 7, title: 'Leak fed to a hostile',
    order: 'Shoot anyone who receives a Double agent’s leak and also appears in Foe.',
    hint: 'Find who receives a Double agent leak, then check who also appears in Foe.',
    inc: {roles: ['double'], dir: 'in'}, req: {roles: ['foe']}
  }),
  direct({
    id: 'se-71', domain: 7, title: 'Hostile under Spy watch',
    order: 'Shoot anyone targeted by a Foe who also appears in Spy.',
    hint: 'Find who is targeted by a Foe, then keep anyone also named in Spy.',
    inc: {roles: ['foe'], dir: 'in'}, req: {roles: ['spy']}
  }),
  direct({
    id: 'se-72', domain: 7, title: 'Foreigner’s mole',
    order: 'Shoot anyone met by a Foreigner who also leaks as a Double agent or targets as a Foe.',
    hint: 'Check who a Foreigner meets, then see if they act in Double agent or Foe.',
    inc: {roles: ['foreigner'], dir: 'in'}, req: {roles: ['double', 'foe'], dir: 'out'}
  }),
  direct({
    id: 'se-73', domain: 7, title: 'Tipped-off traitor',
    order: 'Shoot anyone tipped off by a Civilian who also leaks as a Double agent or meets a Foreigner.',
    hint: 'Find who a Civilian tips off, then check if they act in Double agent or Foreigner.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-74', domain: 7, title: 'Unbacked Foe target',
    order: 'Shoot anyone targeted by a Foe who has no Friend vouching for them and no Civilian tip-off.',
    hint: 'Check who a Foe targets, then exclude anyone backed by a Friend or tipped off by a Civilian.',
    inc: {roles: ['foe'], dir: 'in'}, exc: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-75', domain: 7, title: 'Shadowed leak recipient',
    order: 'Shoot anyone who receives a Double agent’s leak while shadowed by a Spy or met by a Foreigner.',
    hint: 'Check who receives a Double agent leak, then keep those shadowed by a Spy or met by a Foreigner.',
    inc: {roles: ['double'], dir: 'in'}, req: {roles: ['spy', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-76', domain: 7, title: 'Double agent with civilian link',
    order: 'Shoot anyone in Double agent who also tips off as a Civilian or vouches as a Friend.',
    hint: 'Check everyone in Double agent, then keep those who act in Civilian or Friend.',
    inc: {roles: ['double']}, req: {roles: ['civilian', 'friend'], dir: 'out'}
  }),
  direct({
    id: 'se-77', domain: 7, title: 'Foe with foreign backing',
    order: 'Shoot anyone who targets as a Foe and is also named in Foreigner or Spy.',
    hint: 'Check active Foes, then keep those also named in Foreigner or Spy.',
    inc: {roles: ['foe'], dir: 'out'}, req: {roles: ['foreigner', 'spy']}
  }),
  direct({
    id: 'se-78', domain: 7, title: 'Unwatched informant target',
    order: 'Shoot anyone tipped off by a Civilian who is also named in Foe or Foreigner — unless shadowed by a Spy.',
    hint: 'Start with Civilian tip recipients in Foe or Foreigner, then exclude anyone under Spy watch.',
    inc: {roles: ['civilian'], dir: 'in'}, req: {roles: ['foe', 'foreigner']}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-79', domain: 7, title: 'Unchecked leak',
    order: 'Shoot anyone who receives a Double agent’s leak — excluding anyone shadowed by a Spy or backed by a Friend.',
    hint: 'Check who receives a Double agent leak, then rule out anyone backed by a Friend or shadowed by a Spy.',
    inc: {roles: ['double'], dir: 'in'}, exc: {roles: ['spy', 'friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10)
  // =========================================================================
  direct({
    id: 'se-80', domain: 8, title: 'Actor and target',
    order: 'Shoot anyone who vouches as a Friend while also being targeted by a Foe or shadowed by a Spy.',
    hint: 'Check active Friend vouchers who are also targeted by a Foe or shadowed by a Spy.',
    inc: {roles: ['friend'], dir: 'out'}, req: {roles: ['foe', 'spy'], dir: 'in'}
  }),
  direct({
    id: 'se-81', domain: 8, title: 'Shadowed shadow',
    order: 'Shoot anyone who shadows as a Spy while also being met by a Foreigner or backed by a Friend.',
    hint: 'Check active Spies who are also met by a Foreigner or backed by a Friend.',
    inc: {roles: ['spy'], dir: 'out'}, req: {roles: ['foreigner', 'friend'], dir: 'in'}
  }),
  direct({
    id: 'se-82', domain: 8, title: 'Covert actor with overt cover',
    order: 'Shoot anyone who leaks as a Double agent or meets as a Foreigner while also appearing in Friend or Civilian.',
    hint: 'Find active Double agents and Foreigners, then keep those also listed under Friend or Civilian.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, req: {roles: ['friend', 'civilian']}
  }),
  direct({
    id: 'se-83', domain: 8, title: 'Overt actor under covert pressure',
    order: 'Shoot anyone who vouches as a Friend or tips off as a Civilian while targeted by a Foe or leaked to by a Double agent.',
    hint: 'Check active Friends and Civilians who are also targeted by a Foe or fed a leak.',
    inc: {roles: ['friend', 'civilian'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'in'}
  }),
  direct({
    id: 'se-84', domain: 8, title: 'Pure covert operator',
    order: 'Shoot anyone in Double agent or Foreigner who never appears in Friend or Civilian.',
    hint: 'Check everyone in Double agent and Foreigner, then cross off anyone named in Friend or Civilian.',
    inc: {roles: ['double', 'foreigner']}, exc: {roles: ['friend', 'civilian']}
  }),
  direct({
    id: 'se-85', domain: 8, title: 'Pure overt target',
    order: 'Shoot anyone in Friend or Civilian who never appears in Foe, Double agent, or Foreigner.',
    hint: 'Check everyone in Friend and Civilian, then cross off anyone in Foe, Double agent, or Foreigner.',
    inc: {roles: ['friend', 'civilian']}, exc: {roles: ['foe', 'double', 'foreigner']}
  }),
  direct({
    id: 'se-86', domain: 8, title: 'Hostile without allies',
    order: 'Shoot anyone in Foe or Spy who never appears in Friend or Civilian.',
    hint: 'Check everyone in Foe and Spy, then exclude anyone named in Friend or Civilian.',
    inc: {roles: ['foe', 'spy']}, exc: {roles: ['friend', 'civilian']}
  }),
  direct({
    id: 'se-87', domain: 8, title: 'Unflagged outsider',
    order: 'Shoot anyone in Foreigner or Civilian who never appears in Spy or Foe.',
    hint: 'Check everyone in Foreigner and Civilian, then exclude anyone named in Spy or Foe.',
    inc: {roles: ['foreigner', 'civilian']}, exc: {roles: ['spy', 'foe']}
  }),
  direct({
    id: 'se-88', domain: 8, title: 'Shadowed dual contact',
    order: 'Shoot anyone in Spy or Double agent who never appears in Friend or Foreigner.',
    hint: 'Check everyone in Spy and Double agent, then exclude anyone named in Friend or Foreigner.',
    inc: {roles: ['spy', 'double']}, exc: {roles: ['friend', 'foreigner']}
  }),
  direct({
    id: 'se-89', domain: 8, title: 'Covert recipient only',
    order: 'Shoot anyone targeted by a Foe or met by a Foreigner who never vouches as a Friend or shadows as a Spy.',
    hint: 'Check who a Foe targets or a Foreigner meets, then cross off active Friends and Spies.',
    inc: {roles: ['foe', 'foreigner'], dir: 'in'}, exc: {roles: ['friend', 'spy'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (Named-Contact Anchor Calls) (10)
  // =========================================================================
  anchorDirect({
    id: 'se-90', domain: 9, title: '{name}’s exposed circle',
    order: 'Shoot anyone directly linked to {name} who is not shadowed by a Spy.',
    hint: 'Find every contact linked to {name} in any file, then rule out anyone shadowed by a Spy.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-91', domain: 9, title: '{name}’s unbacked contacts',
    order: 'Shoot anyone directly linked to {name} who has no Friend vouching for them.',
    hint: 'Find every contact linked to {name}, then exclude anyone backed by a Friend.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-92', domain: 9, title: '{name}’s covert associates',
    order: 'Shoot anyone directly linked to {name} who also appears in Foe, Double agent, or Foreigner.',
    hint: 'Find {name}’s direct contacts, then keep those also listed under Foe, Double agent, or Foreigner.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    req: {roles: ['foe', 'double', 'foreigner']}
  }),
  anchorDirect({
    id: 'se-93', domain: 9, title: '{name}’s overt associates',
    order: 'Shoot anyone directly linked to {name} who also appears in Friend or Civilian.',
    hint: 'Find {name}’s direct contacts, then keep those also listed under Friend or Civilian.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    req: {roles: ['friend', 'civilian']}
  }),
  anchorDirect({
    id: 'se-94', domain: 9, title: 'Recipients of {name}',
    order: 'Shoot anyone {name} acts upon directly who is not backed by a Friend.',
    hint: 'Check every contact where {name} is the actor, then exclude anyone backed by a Friend.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], incDir: 'out',
    exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-95', domain: 9, title: 'Handlers of {name}',
    order: 'Shoot anyone who acts directly upon {name} — excluding anyone shadowed by a Spy.',
    hint: 'Check every contact directed toward {name}, then exclude anyone shadowed by a Spy.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'], incDir: 'in',
    exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-96', domain: 9, title: '{name}’s unwatched contacts',
    order: 'Shoot anyone directly linked to {name} who also appears in Spy or Double agent.',
    hint: 'Find {name}’s direct contacts, then keep those also named in Spy or Double agent.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    req: {roles: ['spy', 'double']}
  }),
  anchorDirect({
    id: 'se-97', domain: 9, title: '{name}’s unwarned contacts',
    order: 'Shoot anyone directly linked to {name} who never appears in Civilian.',
    hint: 'Find {name}’s direct contacts, then rule out anyone named in Civilian.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    exc: {roles: ['civilian']}
  }),
  anchorDirect({
    id: 'se-98', domain: 9, title: '{name}’s hostile reach',
    order: 'Shoot anyone directly linked to {name} who targets as a Foe or meets as a Foreigner.',
    hint: 'Find {name}’s direct contacts, then keep those who act in Foe or Foreigner.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    req: {roles: ['foe', 'foreigner'], dir: 'out'}
  }),
  anchorDirect({
    id: 'se-99', domain: 9, title: '{name}’s sheltered leads',
    order: 'Shoot anyone directly linked to {name} who is vouched for by a Friend or shadowed by a Spy.',
    hint: 'Find {name}’s direct contacts, then keep those backed by a Friend or shadowed by a Spy.',
    incRoles: ['friend', 'foe', 'spy', 'double', 'civilian', 'foreigner'],
    req: {roles: ['friend', 'spy'], dir: 'in'}
  })
];
