import {collectMatches} from './case-graph.js';
import {matchAtom} from './case-predicates.js';

// 100 genuinely distinct Super-super Easy intelligence cases (10 domains × 10 families).
// Immediately intelligible single-step officer calls calibrated as the gentlest entry tier:
// short direct orders (7–16 words), confirmed dispatches, zero single-category shortcuts,
// variable 1–4 target counts, and full role diversity across all six intelligence roles.

function overlap({id, domain, title, order, hint, a, b}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const ea = matchAtom(g, x, a);
        if (!ea.length) return null;
        const eb = matchAtom(g, x, b);
        if (!eb.length) return null;
        return proof ? x + ': ' + g.fmt(ea[0]) + ' · ' + g.fmt(eb[0]) + '.' : 'ok';
      }, proof);
    }
  };
}

function exceptOne({id, domain, title, order, hint, inc, exc}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const ea = matchAtom(g, x, inc);
        if (!ea.length) return null;
        if (matchAtom(g, x, exc).length) return null;
        return proof ? x + ': ' + g.fmt(ea[0]) + '.' : 'ok';
      }, proof);
    }
  };
}

function unionTwo({id, domain, title, order, hint, a, b}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const ea = matchAtom(g, x, a);
        const eb = matchAtom(g, x, b);
        if (!ea.length && !eb.length) return null;
        if (!proof) return 'ok';
        const parts = [];
        if (ea.length) parts.push(g.fmt(ea[0]));
        if (eb.length) parts.push(g.fmt(eb[0]));
        return x + ': ' + parts.join(' · ') + '.';
      }, proof);
    }
  };
}

function bothSites({id, domain, title, order, hint, dir0, dir1, exc = null}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const e0 = (dir0 === 'out' ? g.out(x) : g.in(x)).find(e => e.incident === 0);
        if (!e0) return null;
        const e1 = (dir1 === 'out' ? g.out(x) : g.in(x)).find(e => e.incident === 1);
        if (!e1) return null;
        if (exc && matchAtom(g, x, exc).length) return null;
        return proof ? x + ': ' + g.fmt(e0) + ' · ' + g.fmt(e1) + '.' : 'ok';
      }, proof);
    }
  };
}

function timeWindow({id, domain, title, order, hint, dir, times, exc}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: false,
    evaluate(g, _anchor, proof) {
      return collectMatches(g.people, x => {
        const list = (dir === 'out' ? g.out(x) : g.in(x)).filter(e => times.includes(e.time));
        if (!list.length) return null;
        if (exc && matchAtom(g, x, exc).length) return null;
        return proof ? x + ': ' + g.fmt(list[0]) + '.' : 'ok';
      }, proof);
    }
  };
}

function anchorTouch({id, domain, title, order, hint, dir = 'any', exc = null}) {
  return {
    id, tier: 'super-super-easy', domain, title, order, hint, useAnchor: true,
    evaluate(g, anchor, proof) {
      return collectMatches(g.people, x => {
        if (x === anchor) return null;
        const links = dir === 'out'
          ? g.direct(anchor, x)
          : dir === 'in'
            ? g.direct(x, anchor)
            : g.between(anchor, x);
        if (!links.length) return null;
        if (exc && matchAtom(g, x, exc).length) return null;
        return proof ? x + ': ' + g.fmt(links[0]) + '.' : 'ok';
      }, proof);
    }
  };
}

export const superSuperEasyFamilies = [
  // =========================================================================
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts | Embassy / Depot
  // =========================================================================
  overlap({
    id: 'sse-00', domain: 0, title: 'Cleared leaker',
    order: 'Drop anyone cleared by a Friend who also leaks as a Double agent.',
    hint: 'Find who a Friend clears, then check who also leaks as a Double agent.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['double'], dir: 'out'}
  }),
  overlap({
    id: 'sse-01', domain: 0, title: 'Warned attacker',
    order: 'Take out anyone warned by a Civilian who also targets as a Foe.',
    hint: 'Find who a Civilian warns, then check who also targets as a Foe.',
    a: {roles: ['civilian'], dir: 'in'}, b: {roles: ['foe'], dir: 'out'}
  }),
  overlap({
    id: 'sse-02', domain: 0, title: 'Audited outsider',
    order: 'Eliminate anyone audited by a Spy who also contacts as a Foreigner.',
    hint: 'Find who a Spy audits, then check who also contacts as a Foreigner.',
    a: {roles: ['spy'], dir: 'in'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  exceptOne({
    id: 'sse-03', domain: 0, title: 'Uncleared mark',
    order: 'Fire on anyone targeted by a Foe — unless cleared by a Friend.',
    hint: 'Check who a Foe targets, then spare anyone cleared by a Friend.',
    inc: {roles: ['foe'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-04', domain: 0, title: 'Unaudited leaker',
    order: 'Neutralize anyone who leaks as a Double agent, except anyone audited by a Spy.',
    hint: 'Find who leaks as a Double agent, then spare anyone audited by a Spy.',
    inc: {roles: ['double'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-05', domain: 0, title: 'Unwarned contact',
    order: 'Engage anyone contacted by a Foreigner — unless warned by a Civilian.',
    hint: 'Check who a Foreigner contacts, then spare anyone warned by a Civilian.',
    inc: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-06', domain: 0, title: 'Active striker or mole',
    order: 'Take down anyone who targets as a Foe or leaks as a Double agent.',
    hint: 'Mark everyone initiating a Foe or Double agent contact.',
    a: {roles: ['foe'], dir: 'out'}, b: {roles: ['double'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-07', domain: 0, title: 'Cleared or warned',
    order: 'Shoot anyone cleared by a Friend or warned by a Civilian.',
    hint: 'Mark everyone cleared by a Friend or warned by a Civilian.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['civilian'], dir: 'in'}
  }),
  bothSites({
    id: 'sse-08', domain: 0, title: 'Embassy and Depot contact',
    order: 'Engage anyone contacted at both the Embassy and the Depot.',
    hint: 'Find everyone contacted on both operational sites.',
    dir0: 'in', dir1: 'in'
  }),
  anchorTouch({
    id: 'sse-09', domain: 0, title: 'Reached by {name}',
    order: 'Take down anyone {name} reaches directly.',
    hint: 'Find everyone {name} initiates a contact toward.',
    dir: 'out'
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals | Alley / Station
  // =========================================================================
  overlap({
    id: 'sse-10', domain: 1, title: 'Ambushed watcher',
    order: 'Fire on anyone who shadows as a Spy while ambushed by a Foe.',
    hint: 'Find who shadows as a Spy, then check who is also ambushed by a Foe.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['foe'], dir: 'in'}
  }),
  overlap({
    id: 'sse-11', domain: 1, title: 'Compromised escort',
    order: 'Neutralize anyone who escorts as a Friend while fed a Double agent’s leak.',
    hint: 'Find who escorts as a Friend, then check who receives a Double agent’s leak.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['double'], dir: 'in'}
  }),
  overlap({
    id: 'sse-12', domain: 1, title: 'Signaled witness',
    order: 'Engage anyone who spots as a Civilian while signaled by a Foreigner.',
    hint: 'Find who spots as a Civilian, then check who is also signaled by a Foreigner.',
    a: {roles: ['civilian'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-13', domain: 1, title: 'Unshadowed attacker',
    order: 'Take down anyone who ambushes as a Foe — unless shadowed by a Spy.',
    hint: 'Find who ambushes as a Foe, then spare anyone shadowed by a Spy.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-14', domain: 1, title: 'Unescorted recipient',
    order: 'Shoot anyone fed a Double agent’s leak, except anyone escorted by a Friend.',
    hint: 'Find who receives a Double agent’s leak, then spare anyone escorted by a Friend.',
    inc: {roles: ['double'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-15', domain: 1, title: 'Unspotted signaler',
    order: 'Drop anyone who signals as a Foreigner — unless spotted by a Civilian.',
    hint: 'Find who signals as a Foreigner, then spare anyone spotted by a Civilian.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-16', domain: 1, title: 'Active watcher or witness',
    order: 'Take out anyone who shadows as a Spy or spots as a Civilian.',
    hint: 'Mark everyone shadowing as a Spy or spotting as a Civilian.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['civilian'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-17', domain: 1, title: 'Ambushed or signaled',
    order: 'Eliminate anyone ambushed by a Foe or signaled by a Foreigner.',
    hint: 'Mark everyone ambushed by a Foe or signaled by a Foreigner.',
    a: {roles: ['foe'], dir: 'in'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  bothSites({
    id: 'sse-18', domain: 1, title: 'Alley and Station actor',
    order: 'Shoot anyone who initiates contacts at both the Alley and the Station.',
    hint: 'Find everyone initiating contacts on both operational sites.',
    dir0: 'out', dir1: 'out'
  }),
  anchorTouch({
    id: 'sse-19', domain: 1, title: 'Reaching {name}',
    order: 'Drop anyone who reaches {name} directly.',
    hint: 'Find everyone initiating a contact toward {name}.',
    dir: 'in'
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits | Border / Port
  // =========================================================================
  overlap({
    id: 'sse-20', domain: 2, title: 'Vouched recruit',
    order: 'Take down anyone recruited by a Foreigner who is also vouched for by a Friend.',
    hint: 'Find who a Foreigner recruits, then keep anyone also vouched for by a Friend.',
    a: {roles: ['foreigner'], dir: 'in'}, b: {roles: ['friend'], dir: 'in'}
  }),
  overlap({
    id: 'sse-21', domain: 2, title: 'Tracked recipient',
    order: 'Shoot anyone fed a Double agent’s leak who is also tracked by a Spy.',
    hint: 'Find who receives a Double agent’s leak, then keep anyone tracked by a Spy.',
    a: {roles: ['double'], dir: 'in'}, b: {roles: ['spy'], dir: 'in'}
  }),
  overlap({
    id: 'sse-22', domain: 2, title: 'Reported target',
    order: 'Drop anyone pressured by a Foe who is also reported by a Civilian.',
    hint: 'Find who a Foe pressures, then keep anyone also reported by a Civilian.',
    a: {roles: ['foe'], dir: 'in'}, b: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-23', domain: 2, title: 'Unvouched recruit',
    order: 'Take out anyone recruited by a Foreigner — unless vouched for by a Friend.',
    hint: 'Check who a Foreigner recruits, then spare anyone vouched for by a Friend.',
    inc: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-24', domain: 2, title: 'Untracked target',
    order: 'Eliminate anyone pressured by a Foe, except anyone tracked by a Spy.',
    hint: 'Check who a Foe pressures, then spare anyone tracked by a Spy.',
    inc: {roles: ['foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-25', domain: 2, title: 'Unreported leaker',
    order: 'Fire on anyone who leaks as a Double agent — unless reported by a Civilian.',
    hint: 'Find who leaks as a Double agent, then spare anyone reported by a Civilian.',
    inc: {roles: ['double'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-26', domain: 2, title: 'Recruiter or leaker',
    order: 'Engage anyone who recruits as a Foreigner or leaks as a Double agent.',
    hint: 'Mark everyone recruiting as a Foreigner or leaking as a Double agent.',
    a: {roles: ['foreigner'], dir: 'out'}, b: {roles: ['double'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-27', domain: 2, title: 'Vouched or tracked',
    order: 'Take down anyone vouched for by a Friend or tracked by a Spy.',
    hint: 'Mark everyone vouched for by a Friend or tracked by a Spy.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['spy'], dir: 'in'}
  }),
  bothSites({
    id: 'sse-28', domain: 2, title: 'Border to Port',
    order: 'Take out anyone contacted at the Border who also initiates a contact at the Port.',
    hint: 'Find who is contacted at the Border and initiates a contact at the Port.',
    dir0: 'in', dir1: 'out'
  }),
  anchorTouch({
    id: 'sse-29', domain: 2, title: 'Unvouched contact of {name}',
    order: 'Eliminate anyone in direct contact with {name} — unless vouched for by a Friend.',
    hint: 'Find everyone directly contacting {name}, then spare anyone vouched for by a Friend.',
    dir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs | Market / Plaza
  // =========================================================================
  overlap({
    id: 'sse-30', domain: 3, title: 'Deceptive tipster',
    order: 'Take out anyone who tips off as a Civilian and also misleads as a Double agent.',
    hint: 'Find who tips off as a Civilian, then check who also misleads as a Double agent.',
    a: {roles: ['civilian'], dir: 'out'}, b: {roles: ['double'], dir: 'out'}
  }),
  overlap({
    id: 'sse-31', domain: 3, title: 'Two-faced ally',
    order: 'Eliminate anyone who confirms as a Friend and also targets as a Foe.',
    hint: 'Find who confirms as a Friend, then check who also targets as a Foe.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['foe'], dir: 'out'}
  }),
  overlap({
    id: 'sse-32', domain: 3, title: 'Briefing watcher',
    order: 'Fire on anyone who monitors as a Spy and also briefs as a Foreigner.',
    hint: 'Find who monitors as a Spy, then check who also briefs as a Foreigner.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  exceptOne({
    id: 'sse-33', domain: 3, title: 'Unwarned dupe',
    order: 'Neutralize anyone misled by a Double agent — unless tipped off by a Civilian.',
    hint: 'Check who a Double agent misleads, then spare anyone tipped off by a Civilian.',
    inc: {roles: ['double'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-34', domain: 3, title: 'Unmonitored asset',
    order: 'Engage anyone briefed by a Foreigner, except anyone monitored by a Spy.',
    hint: 'Check who a Foreigner briefs, then spare anyone monitored by a Spy.',
    inc: {roles: ['foreigner'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-35', domain: 3, title: 'Unconfirmed striker',
    order: 'Take down anyone who targets as a Foe — unless confirmed by a Friend.',
    hint: 'Find who targets as a Foe, then spare anyone confirmed by a Friend.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-36', domain: 3, title: 'Tipped off or monitored',
    order: 'Shoot anyone tipped off by a Civilian or monitored by a Spy.',
    hint: 'Mark everyone tipped off by a Civilian or monitored by a Spy.',
    a: {roles: ['civilian'], dir: 'in'}, b: {roles: ['spy'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-37', domain: 3, title: 'Striker or briefer',
    order: 'Drop anyone who targets as a Foe or briefs as a Foreigner.',
    hint: 'Mark everyone targeting as a Foe or briefing as a Foreigner.',
    a: {roles: ['foe'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  bothSites({
    id: 'sse-38', domain: 3, title: 'Market to Plaza',
    order: 'Fire on anyone who initiates a contact at the Market and is contacted at the Plaza.',
    hint: 'Find who initiates a contact at the Market and is contacted at the Plaza.',
    dir0: 'out', dir1: 'in'
  }),
  anchorTouch({
    id: 'sse-39', domain: 3, title: 'Unmonitored contact of {name}',
    order: 'Neutralize anyone in direct contact with {name} — unless monitored by a Spy.',
    hint: 'Find everyone directly contacting {name}, then spare anyone monitored by a Spy.',
    dir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to | Bridge / Tunnel
  // =========================================================================
  overlap({
    id: 'sse-40', domain: 4, title: 'Backed and struck',
    order: 'Neutralize anyone backed by a Friend who is also struck by a Foe.',
    hint: 'Find who a Friend backs, then keep anyone also struck by a Foe.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['foe'], dir: 'in'}
  }),
  overlap({
    id: 'sse-41', domain: 4, title: 'Traced target',
    order: 'Engage anyone traced by a Spy who is also struck by a Foe.',
    hint: 'Find who a Spy traces, then keep anyone also struck by a Foe.',
    a: {roles: ['spy'], dir: 'in'}, b: {roles: ['foe'], dir: 'in'}
  }),
  overlap({
    id: 'sse-42', domain: 4, title: 'Warned courier',
    order: 'Take down anyone warned by a Civilian who also receives a Double agent’s relay.',
    hint: 'Find who a Civilian warns, then keep anyone receiving a Double agent’s relay.',
    a: {roles: ['civilian'], dir: 'in'}, b: {roles: ['double'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-43', domain: 4, title: 'Untraced ally',
    order: 'Shoot anyone backed by a Friend, except anyone traced by a Spy.',
    hint: 'Check who a Friend backs, then spare anyone traced by a Spy.',
    inc: {roles: ['friend'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-44', domain: 4, title: 'Unbacked witness',
    order: 'Drop anyone warned by a Civilian — unless backed by a Friend.',
    hint: 'Check who a Civilian warns, then spare anyone backed by a Friend.',
    inc: {roles: ['civilian'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-45', domain: 4, title: 'Unwarned trace',
    order: 'Take out anyone traced by a Spy — unless warned by a Civilian.',
    hint: 'Check who a Spy traces, then spare anyone warned by a Civilian.',
    inc: {roles: ['spy'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-46', domain: 4, title: 'Backer or tracer',
    order: 'Eliminate anyone who backs as a Friend or traces as a Spy.',
    hint: 'Mark everyone backing as a Friend or tracing as a Spy.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['spy'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-47', domain: 4, title: 'Relay or handoff recipient',
    order: 'Fire on anyone receiving a Double agent’s relay or a Foreigner’s handoff.',
    hint: 'Mark everyone receiving a relay from a Double agent or handoff from a Foreigner.',
    a: {roles: ['double'], dir: 'in'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  bothSites({
    id: 'sse-48', domain: 4, title: 'Unbacked Bridge and Tunnel contact',
    order: 'Engage anyone contacted at both the Bridge and the Tunnel — unless backed by a Friend.',
    hint: 'Find who is contacted on both sites, then spare anyone backed by a Friend.',
    dir0: 'in', dir1: 'in', exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorTouch({
    id: 'sse-49', domain: 4, title: 'Unwarned contact of {name}',
    order: 'Take down anyone in direct contact with {name} — unless warned by a Civilian.',
    hint: 'Find everyone directly contacting {name}, then spare anyone warned by a Civilian.',
    dir: 'any', exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults | Dock / Vault
  // =========================================================================
  overlap({
    id: 'sse-50', domain: 5, title: 'Identified alibi',
    order: 'Shoot anyone who corroborates as a Friend while identified by a Civilian.',
    hint: 'Find who corroborates as a Friend, then check who is identified by a Civilian.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['civilian'], dir: 'in'}
  }),
  overlap({
    id: 'sse-51', domain: 5, title: 'Deceived verifier',
    order: 'Drop anyone who verifies as a Spy while deceived by a Double agent.',
    hint: 'Find who verifies as a Spy, then check who is deceived by a Double agent.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['double'], dir: 'in'}
  }),
  overlap({
    id: 'sse-52', domain: 5, title: 'Accused consultant',
    order: 'Take out anyone who consults as a Foreigner while accused by a Foe.',
    hint: 'Find who consults as a Foreigner, then check who is accused by a Foe.',
    a: {roles: ['foreigner'], dir: 'out'}, b: {roles: ['foe'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-53', domain: 5, title: 'Unverified alibi',
    order: 'Eliminate anyone who corroborates as a Friend, except anyone verified by a Spy.',
    hint: 'Find who corroborates as a Friend, then spare anyone verified by a Spy.',
    inc: {roles: ['friend'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-54', domain: 5, title: 'Uncorroborated verifier',
    order: 'Fire on anyone who verifies as a Spy — unless corroborated by a Friend.',
    hint: 'Find who verifies as a Spy, then spare anyone corroborated by a Friend.',
    inc: {roles: ['spy'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-55', domain: 5, title: 'Uncorroborated witness',
    order: 'Neutralize anyone who identifies as a Civilian — unless corroborated by a Friend.',
    hint: 'Find who identifies as a Civilian, then spare anyone corroborated by a Friend.',
    inc: {roles: ['civilian'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-56', domain: 5, title: 'Corroborator or witness',
    order: 'Engage anyone who corroborates as a Friend or identifies as a Civilian.',
    hint: 'Mark everyone corroborating as a Friend or identifying as a Civilian.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['civilian'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-57', domain: 5, title: 'Accused or deceived',
    order: 'Take down anyone accused by a Foe or deceived by a Double agent.',
    hint: 'Mark everyone accused by a Foe or deceived by a Double agent.',
    a: {roles: ['foe'], dir: 'in'}, b: {roles: ['double'], dir: 'in'}
  }),
  bothSites({
    id: 'sse-58', domain: 5, title: 'Unverified Dock and Vault actor',
    order: 'Shoot anyone who initiates contacts at both the Dock and the Vault — unless verified by a Spy.',
    hint: 'Find who initiates contacts on both sites, then spare anyone verified by a Spy.',
    dir0: 'out', dir1: 'out', exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorTouch({
    id: 'sse-59', domain: 5, title: 'Unaccused contact of {name}',
    order: 'Drop anyone in direct contact with {name} — unless accused by a Foe.',
    hint: 'Find everyone directly contacting {name}, then spare anyone accused by a Foe.',
    dir: 'any', exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets | Convoy / Airfield
  // =========================================================================
  overlap({
    id: 'sse-60', domain: 6, title: 'Briefed striker',
    order: 'Eliminate anyone who strikes as a Foe while fed a Double agent’s leak.',
    hint: 'Find who strikes as a Foe, then check who receives a Double agent’s leak.',
    a: {roles: ['foe'], dir: 'out'}, b: {roles: ['double'], dir: 'in'}
  }),
  overlap({
    id: 'sse-61', domain: 6, title: 'Corrected visitor',
    order: 'Fire on anyone who meets as a Foreigner while corrected by a Civilian.',
    hint: 'Find who meets as a Foreigner, then check who is corrected by a Civilian.',
    a: {roles: ['foreigner'], dir: 'out'}, b: {roles: ['civilian'], dir: 'in'}
  }),
  overlap({
    id: 'sse-62', domain: 6, title: 'Logged leaker',
    order: 'Neutralize anyone who leaks as a Double agent while logged by a Spy.',
    hint: 'Find who leaks as a Double agent, then check who is logged by a Spy.',
    a: {roles: ['double'], dir: 'out'}, b: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-63', domain: 6, title: 'Unlogged recipient',
    order: 'Engage anyone fed a Double agent’s leak, except anyone logged by a Spy.',
    hint: 'Check who receives a Double agent’s leak, then spare anyone logged by a Spy.',
    inc: {roles: ['double'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-64', domain: 6, title: 'Uncorrected target',
    order: 'Take down anyone struck by a Foe — unless corrected by a Civilian.',
    hint: 'Check who a Foe strikes, then spare anyone corrected by a Civilian.',
    inc: {roles: ['foe'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-65', domain: 6, title: 'Uncleared visitor',
    order: 'Shoot anyone who meets as a Foreigner — unless cleared by a Friend.',
    hint: 'Find who meets as a Foreigner, then spare anyone cleared by a Friend.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-66', domain: 6, title: 'Clearer or striker',
    order: 'Drop anyone who clears as a Friend or strikes as a Foe.',
    hint: 'Mark everyone clearing as a Friend or striking as a Foe.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['foe'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-67', domain: 6, title: 'Logged or met',
    order: 'Take out anyone logged by a Spy or met by a Foreigner.',
    hint: 'Mark everyone logged by a Spy or met by a Foreigner.',
    a: {roles: ['spy'], dir: 'in'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-68', domain: 6, title: 'Early uncleared contact',
    order: 'Take out anyone contacted before 03:00 — unless cleared by a Friend.',
    hint: 'Check the 01:00 and 02:00 dispatches, then spare anyone cleared by a Friend.',
    dir: 'in', times: [1, 2], exc: {roles: ['friend'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-69', domain: 6, title: 'Late unlogged actor',
    order: 'Eliminate anyone who initiates a contact after 04:00 — unless logged by a Spy.',
    hint: 'Check the 05:00 and 06:00 dispatches, then spare anyone logged by a Spy.',
    dir: 'out', times: [5, 6], exc: {roles: ['spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds | Bank / Customs
  // =========================================================================
  overlap({
    id: 'sse-70', domain: 7, title: 'Coerced and compromised',
    order: 'Engage anyone coerced by a Foe who is also compromised by a Double agent.',
    hint: 'Find who a Foe coerces, then keep anyone also compromised by a Double agent.',
    a: {roles: ['foe'], dir: 'in'}, b: {roles: ['double'], dir: 'in'}
  }),
  overlap({
    id: 'sse-71', domain: 7, title: 'Alibied asset',
    order: 'Take down anyone compromised by a Double agent who also gets a Friend’s alibi.',
    hint: 'Find who a Double agent compromises, then keep anyone given a Friend’s alibi.',
    a: {roles: ['double'], dir: 'in'}, b: {roles: ['friend'], dir: 'in'}
  }),
  overlap({
    id: 'sse-72', domain: 7, title: 'Exposed vetter',
    order: 'Shoot anyone exposed by a Civilian who also vets as a Spy.',
    hint: 'Find who a Civilian exposes, then keep anyone who also vets as a Spy.',
    a: {roles: ['civilian'], dir: 'in'}, b: {roles: ['spy'], dir: 'out'}
  }),
  exceptOne({
    id: 'sse-73', domain: 7, title: 'Unvetted backer',
    order: 'Drop anyone who funds as a Foreigner, except anyone vetted by a Spy.',
    hint: 'Find who funds as a Foreigner, then spare anyone vetted by a Spy.',
    inc: {roles: ['foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-74', domain: 7, title: 'Unalibied mole',
    order: 'Take out anyone who compromises as a Double agent — unless given a Friend’s alibi.',
    hint: 'Find who compromises as a Double agent, then spare anyone given a Friend’s alibi.',
    inc: {roles: ['double'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-75', domain: 7, title: 'Unexposed coercer',
    order: 'Eliminate anyone who coerces as a Foe — unless exposed by a Civilian.',
    hint: 'Find who coerces as a Foe, then spare anyone exposed by a Civilian.',
    inc: {roles: ['foe'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-76', domain: 7, title: 'Compromiser or exposer',
    order: 'Fire on anyone who compromises as a Double agent or exposes as a Civilian.',
    hint: 'Mark everyone compromising as a Double agent or exposing as a Civilian.',
    a: {roles: ['double'], dir: 'out'}, b: {roles: ['civilian'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-77', domain: 7, title: 'Alibied or funded',
    order: 'Neutralize anyone given a Friend’s alibi or funded by a Foreigner.',
    hint: 'Mark everyone given a Friend’s alibi or funded by a Foreigner.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-78', domain: 7, title: 'Early unexposed actor',
    order: 'Fire on anyone who initiates a contact before 03:00 — unless exposed by a Civilian.',
    hint: 'Check the 01:00 and 02:00 dispatches, then spare anyone exposed by a Civilian.',
    dir: 'out', times: [1, 2], exc: {roles: ['civilian'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-79', domain: 7, title: 'Late unalibied contact',
    order: 'Neutralize anyone contacted after 04:00 — unless given a Friend’s alibi.',
    hint: 'Check the 05:00 and 06:00 dispatches, then spare anyone given a Friend’s alibi.',
    dir: 'in', times: [5, 6], exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts | Quarter / Harbor
  // =========================================================================
  overlap({
    id: 'sse-80', domain: 8, title: 'Protector and host',
    order: 'Drop anyone who protects as a Friend and also hosts as a Foreigner.',
    hint: 'Find who protects as a Friend, then check who also hosts as a Foreigner.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  overlap({
    id: 'sse-81', domain: 8, title: 'Leaking watcher',
    order: 'Take out anyone who watches as a Spy and also leaks as a Double agent.',
    hint: 'Find who watches as a Spy, then check who also leaks as a Double agent.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['double'], dir: 'out'}
  }),
  overlap({
    id: 'sse-82', domain: 8, title: 'Hunting host',
    order: 'Eliminate anyone who shelters as a Civilian and also hunts as a Foe.',
    hint: 'Find who shelters as a Civilian, then check who also hunts as a Foe.',
    a: {roles: ['civilian'], dir: 'out'}, b: {roles: ['foe'], dir: 'out'}
  }),
  exceptOne({
    id: 'sse-83', domain: 8, title: 'Unsheltered ward',
    order: 'Fire on anyone protected by a Friend, except anyone sheltered by a Civilian.',
    hint: 'Check who a Friend protects, then spare anyone sheltered by a Civilian.',
    inc: {roles: ['friend'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-84', domain: 8, title: 'Unprotected subject',
    order: 'Neutralize anyone watched by a Spy — unless protected by a Friend.',
    hint: 'Check who a Spy watches, then spare anyone protected by a Friend.',
    inc: {roles: ['spy'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-85', domain: 8, title: 'Unwatched guest',
    order: 'Engage anyone sheltered by a Civilian — unless watched by a Spy.',
    hint: 'Check who a Civilian shelters, then spare anyone watched by a Spy.',
    inc: {roles: ['civilian'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-86', domain: 8, title: 'Watcher or host',
    order: 'Take down anyone who watches as a Spy or hosts as a Foreigner.',
    hint: 'Mark everyone watching as a Spy or hosting as a Foreigner.',
    a: {roles: ['spy'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-87', domain: 8, title: 'Protected or hunted',
    order: 'Shoot anyone protected by a Friend or hunted by a Foe.',
    hint: 'Mark everyone protected by a Friend or hunted by a Foe.',
    a: {roles: ['friend'], dir: 'in'}, b: {roles: ['foe'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-88', domain: 8, title: 'First or last contact',
    order: 'Engage anyone contacted at 01:00 or 06:00 — unless watched by a Spy.',
    hint: 'Check the 01:00 and 06:00 dispatches, then spare anyone watched by a Spy.',
    dir: 'in', times: [1, 6], exc: {roles: ['spy'], dir: 'in'}
  }),
  timeWindow({
    id: 'sse-89', domain: 8, title: 'First or last actor',
    order: 'Take down anyone who initiates a contact at 01:00 or 06:00 — unless sheltered by a Civilian.',
    hint: 'Check the 01:00 and 06:00 dispatches, then spare anyone sheltered by a Civilian.',
    dir: 'out', times: [1, 6], exc: {roles: ['civilian'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10) — vouches for, targets, shadows, leaks to, tips off, meets | Bunker / Tower
  // =========================================================================
  overlap({
    id: 'sse-90', domain: 9, title: 'Met striker',
    order: 'Fire on anyone who targets as a Foe while met by a Foreigner.',
    hint: 'Find who targets as a Foe, then check who is also met by a Foreigner.',
    a: {roles: ['foe'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'in'}
  }),
  overlap({
    id: 'sse-91', domain: 9, title: 'Targeted leaker',
    order: 'Neutralize anyone who leaks as a Double agent while targeted by a Foe.',
    hint: 'Find who leaks as a Double agent, then check who is also targeted by a Foe.',
    a: {roles: ['double'], dir: 'out'}, b: {roles: ['foe'], dir: 'in'}
  }),
  overlap({
    id: 'sse-92', domain: 9, title: 'Shadowed voucher',
    order: 'Engage anyone who vouches as a Friend while shadowed by a Spy.',
    hint: 'Find who vouches as a Friend, then check who is also shadowed by a Spy.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['spy'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-93', domain: 9, title: 'Untipped voucher',
    order: 'Take down anyone who vouches as a Friend, except anyone tipped off by a Civilian.',
    hint: 'Find who vouches as a Friend, then spare anyone tipped off by a Civilian.',
    inc: {roles: ['friend'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-94', domain: 9, title: 'Untipped shadower',
    order: 'Shoot anyone who shadows as a Spy — unless tipped off by a Civilian.',
    hint: 'Find who shadows as a Spy, then spare anyone tipped off by a Civilian.',
    inc: {roles: ['spy'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  exceptOne({
    id: 'sse-95', domain: 9, title: 'Unshadowed tipster',
    order: 'Drop anyone who tips off as a Civilian — unless shadowed by a Spy.',
    hint: 'Find who tips off as a Civilian, then spare anyone shadowed by a Spy.',
    inc: {roles: ['civilian'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  unionTwo({
    id: 'sse-96', domain: 9, title: 'Voucher or visitor',
    order: 'Take out anyone who vouches as a Friend or meets as a Foreigner.',
    hint: 'Mark everyone vouching as a Friend or meeting as a Foreigner.',
    a: {roles: ['friend'], dir: 'out'}, b: {roles: ['foreigner'], dir: 'out'}
  }),
  unionTwo({
    id: 'sse-97', domain: 9, title: 'Tipped off or leaked to',
    order: 'Eliminate anyone tipped off by a Civilian or fed a Double agent’s leak.',
    hint: 'Mark everyone tipped off by a Civilian or fed a Double agent’s leak.',
    a: {roles: ['civilian'], dir: 'in'}, b: {roles: ['double'], dir: 'in'}
  }),
  anchorTouch({
    id: 'sse-98', domain: 9, title: 'Direct contact of {name}',
    order: 'Shoot anyone in direct contact with {name}.',
    hint: 'Mark everyone who directly reaches or is reached by {name}.',
    dir: 'any'
  }),
  timeWindow({
    id: 'sse-99', domain: 9, title: 'Mid-window contact',
    order: 'Drop anyone contacted at 03:00 or 04:00 — unless vouched for by a Friend.',
    hint: 'Check the 03:00 and 04:00 dispatches, then spare anyone vouched for by a Friend.',
    dir: 'in', times: [3, 4], exc: {roles: ['friend'], dir: 'in'}
  })
];
