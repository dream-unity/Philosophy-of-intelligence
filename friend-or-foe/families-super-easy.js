import {collectMatches} from './case-graph.js';
import {matchAtom, matchTemporal} from './case-predicates.js';

// 100 genuinely distinct Super Easy intelligence cases (10 domains × 10 families).
// Every order is an immediately intelligible, directional officer call matched to its domain's
// operational verbs, using two-role entry checks or multi-role exceptions so target counts
// span 1–4 naturally with zero single-role shortcuts, zero "tied to" phrasing, and zero role pooling.

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
  // DOMAIN 0: Cover & Betrayal (10) — clears, targets, audits, leaks to, warns, contacts
  // =========================================================================
  direct({
    id: 'se-00', domain: 0, title: 'Traitor in the ranks',
    order: 'Eliminate anyone cleared by a Friend or audited by a Spy who also leaks as a Double agent or contacts as a Foreigner.',
    hint: 'Find who is cleared by a Friend or audited by a Spy, then check if they leak as a Double agent or contact as a Foreigner.',
    inc: {roles: ['friend', 'spy'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-01', domain: 0, title: 'False voucher',
    order: 'Burned clearance: fire on anyone who clears as a Friend or warns as a Civilian while targeting as a Foe or leaking as a Double agent.',
    hint: 'Start with active Friends and Civilians, then check who also targets as a Foe or leaks as a Double agent.',
    inc: {roles: ['friend', 'civilian'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  direct({
    id: 'se-02', domain: 0, title: 'Compromised ally',
    order: 'Station breach — take down anyone cleared by a Friend or warned by a Civilian who also receives a Double agent’s leak or Foreigner’s contact.',
    hint: 'Check who a Friend clears or a Civilian warns, then keep anyone also receiving a leak or Foreigner contact.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, req: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-03', domain: 0, title: 'Unbacked mole or striker',
    order: 'Insider betrayal: neutralize anyone who leaks as a Double agent or targets as a Foe, except anyone cleared by a Friend.',
    hint: 'Find active Double agents and Foes, then rule out anyone a Friend clears.',
    inc: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-04', domain: 0, title: 'Bitter target under cover',
    order: 'False cover — take out anyone cleared by a Friend or targeted by a Foe who is also audited by a Spy or contacted by a Foreigner.',
    hint: 'Find who is cleared by a Friend or targeted by a Foe, then check if a Spy audits or a Foreigner contacts them.',
    inc: {roles: ['friend', 'foe'], dir: 'in'}, req: {roles: ['spy', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-05', domain: 0, title: 'Active traitor without badge',
    order: 'Shoot anyone who leaks as a Double agent or targets as a Foe — excluding anyone who clears as a Friend.',
    hint: 'Find who leaks as a Double agent or targets as a Foe, then cross off active Friends.',
    inc: {roles: ['double', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'out'}
  }),
  direct({
    id: 'se-06', domain: 0, title: 'Exposed recipient',
    order: 'Cover blown — drop anyone who receives a Double agent’s leak or a Foreigner’s contact; hold fire on anyone cleared by a Friend.',
    hint: 'Check who receives a leak or Foreigner contact, then exclude anyone cleared by a Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-07', domain: 0, title: 'Audited double dealer',
    order: 'Burned clearance: engage anyone who clears as a Friend or audits as a Spy without any Civilian warning them.',
    hint: 'Find active Friends and Spies, then cross off anyone a Civilian warns.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-08', domain: 0, title: 'Turned ally',
    order: 'Station breach: eliminate anyone who targets as a Foe or contacts as a Foreigner — unless audited by a Spy.',
    hint: 'Find active Foes and Foreigners, then rule out anyone audited by a Spy.',
    inc: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-09', domain: 0, title: 'Cover blown by warning',
    order: 'Insider betrayal: fire on anyone warned by a Civilian or audited by a Spy who also targets as a Foe or leaks as a Double agent.',
    hint: 'Check who a Civilian warns or Spy audits, then see if they target as a Foe or leak as a Double agent.',
    inc: {roles: ['civilian', 'spy'], dir: 'in'}, req: {roles: ['foe', 'double'], dir: 'out'}
  }),

  // =========================================================================
  // DOMAIN 1: Surveillance & Blind Spots (10) — escorts, ambushes, shadows, leaks to, spots, signals
  // =========================================================================
  direct({
    id: 'se-10', domain: 1, title: 'Blind-spot attacker',
    order: 'Shoot anyone who ambushes as a Foe or leaks as a Double agent; hold fire on anyone shadowed by a Spy.',
    hint: 'Find active Foes and Double agents, then rule out anyone a Spy shadows.',
    inc: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-11', domain: 1, title: 'Unwatched signaler',
    order: 'Dead drop watched: drop anyone who signals as a Foreigner or leaks as a Double agent, except anyone shadowed by a Spy.',
    hint: 'Find active Foreigners and Double agents, then cross off anyone a Spy shadows.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-12', domain: 1, title: 'Turned watcher',
    order: 'Blind-spot ambush — engage anyone who shadows as a Spy or spots as a Civilian while ambushing as a Foe or signaling as a Foreigner.',
    hint: 'Start with active Spies and Civilians, then check who also ambushes as a Foe or signals as a Foreigner.',
    inc: {roles: ['spy', 'civilian'], dir: 'out'}, req: {roles: ['foe', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-13', domain: 1, title: 'Shadowed quarry',
    order: 'Compromised tail: eliminate anyone shadowed by a Spy or spotted by a Civilian who is also ambushed by a Foe or signaled by a Foreigner.',
    hint: 'Check who a Spy shadows or Civilian spots, then keep anyone also ambushed by a Foe or signaled by a Foreigner.',
    inc: {roles: ['spy', 'civilian'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-14', domain: 1, title: 'Unescorted target',
    order: 'Watcher exposed — fire on anyone ambushed by a Foe or signaled by a Foreigner; hold fire on anyone escorted by a Friend.',
    hint: 'Check who a Foe ambushes or Foreigner signals, then exclude anyone a Friend escorts.',
    inc: {roles: ['foe', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-15', domain: 1, title: 'Escort under ambush',
    order: 'Take down anyone who escorts as a Friend or shadows as a Spy while ambushed by a Foe or fed a Double agent’s leak.',
    hint: 'Find active Friends and Spies, then see if a Foe ambushes or Double agent leaks to them.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, req: {roles: ['foe', 'double'], dir: 'in'}
  }),
  direct({
    id: 'se-16', domain: 1, title: 'Unwatched escort or witness',
    order: 'Escort off-script: neutralize anyone escorted by a Friend or spotted by a Civilian — unless shadowed by a Spy.',
    hint: 'Find who a Friend escorts or Civilian spots, then cross off anyone a Spy shadows.',
    inc: {roles: ['friend', 'civilian'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-17', domain: 1, title: 'Spotter on the payroll',
    order: 'Dead drop watched: take out anyone who spots as a Civilian or escorts as a Friend while receiving a Double agent’s leak or Foreigner’s signal.',
    hint: 'Check active Civilians and Friends, then keep anyone receiving a leak or Foreigner signal.',
    inc: {roles: ['civilian', 'friend'], dir: 'out'}, req: {roles: ['double', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-18', domain: 1, title: 'Shadowed leak',
    order: 'Blind-spot ambush — shoot anyone who leaks as a Double agent or signals as a Foreigner; hold fire on anyone spotted by a Civilian.',
    hint: 'Find active Double agents and Foreigners, then exclude anyone a Civilian spots.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-19', domain: 1, title: 'Ambush without escort',
    order: 'Compromised tail: drop anyone ambushed by a Foe or fed a Double agent’s leak, except anyone escorted by a Friend.',
    hint: 'Find who a Foe ambushes or Double agent leaks to, then cross off anyone a Friend escorts.',
    inc: {roles: ['foe', 'double'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 2: Foreign Contact (10) — vouches for, pressures, tracks, leaks to, reports, recruits
  // =========================================================================
  direct({
    id: 'se-20', domain: 2, title: 'Foreigner’s active recruit',
    order: 'Take down anyone recruited by a Foreigner or pressured by a Foe — unless fed a Double agent’s leak.',
    hint: 'Check who a Foreigner recruits or Foe pressures, then exclude anyone a Double agent leaks to.',
    inc: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-21', domain: 2, title: 'Recruiter in plain sight',
    order: 'Station asset turned: neutralize anyone who recruits as a Foreigner or pressures as a Foe, sparing anyone vouched for by a Friend.',
    hint: 'Find active Foreigners and Foes, then rule out anyone a Friend vouches for.',
    inc: {roles: ['foreigner', 'foe'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-22', domain: 2, title: 'Recruited insider',
    order: 'Cross-border breach — take out anyone who recruits as a Foreigner or leaks as a Double agent while vouching as a Friend or reporting as a Civilian.',
    hint: 'Find active Foreigners and Double agents, then see if they also vouch as a Friend or report as a Civilian.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, req: {roles: ['friend', 'civilian'], dir: 'out'}
  }),
  direct({
    id: 'se-23', domain: 2, title: 'Untracked recruit',
    order: 'External handler: shoot anyone recruited by a Foreigner or fed a Double agent’s leak, except anyone tracked by a Spy.',
    hint: 'Find who a Foreigner recruits or Double agent leaks to, then rule out anyone a Spy tracks.',
    inc: {roles: ['foreigner', 'double'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-24', domain: 2, title: 'Unpressured recruiter',
    order: 'Border leak: drop anyone who recruits as a Foreigner or leaks as a Double agent — unless pressured by a Foe.',
    hint: 'Find active Foreigners and Double agents, then cross off anyone a Foe pressures.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-25', domain: 2, title: 'Pressured ally',
    order: 'Engage anyone vouched for by a Friend or tracked by a Spy who is also pressured by a Foe or recruited by a Foreigner.',
    hint: 'Check who a Friend vouches for or Spy tracks, then keep anyone pressured by a Foe or recruited by a Foreigner.',
    inc: {roles: ['friend', 'spy'], dir: 'in'}, req: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-26', domain: 2, title: 'Border recruiter with cover',
    order: 'Foreign contact in play — eliminate anyone who recruits as a Foreigner or leaks as a Double agent while vouched for by a Friend or reported by a Civilian.',
    hint: 'Find active Foreigners and Double agents, then keep anyone vouched for by a Friend or reported by a Civilian.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, req: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-27', domain: 2, title: 'Recruited mole',
    order: 'Station asset turned: fire on anyone recruited by a Foreigner or pressured by a Foe who also leaks as a Double agent or tracks as a Spy.',
    hint: 'Find who a Foreigner recruits or Foe pressures, then check if they leak as a Double agent or track as a Spy.',
    inc: {roles: ['foreigner', 'foe'], dir: 'in'}, req: {roles: ['double', 'spy'], dir: 'out'}
  }),
  direct({
    id: 'se-28', domain: 2, title: 'Reported without vouching',
    order: 'Cross-border breach: take down anyone reported by a Civilian or tracked by a Spy — unless vouched for by a Friend.',
    hint: 'Check who a Civilian reports or Spy tracks, then exclude anyone a Friend vouches for.',
    inc: {roles: ['civilian', 'spy'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-29', domain: 2, title: 'Tracker under pressure',
    order: 'External handler: neutralize anyone who tracks as a Spy or reports as a Civilian, sparing anyone pressured by a Foe.',
    hint: 'Find active Spies and Civilians, then cross off anyone a Foe pressures.',
    inc: {roles: ['spy', 'civilian'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 3: Civilian Tip-Offs (10) — confirms, targets, monitors, misleads, tips off, briefs
  // =========================================================================
  direct({
    id: 'se-30', domain: 3, title: 'Tipped off without briefing',
    order: 'Engage anyone tipped off by a Civilian or monitored by a Spy; hold fire on anyone briefed by a Foreigner.',
    hint: 'Check who a Civilian tips off or Spy monitors, then rule out anyone a Foreigner briefs.',
    inc: {roles: ['civilian', 'spy'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-31', domain: 3, title: 'Informant turned attacker',
    order: 'Compromised witness: eliminate anyone who tips off as a Civilian or confirms as a Friend while targeting as a Foe or briefing as a Foreigner.',
    hint: 'Find active Civilians and Friends, then check who also targets as a Foe or briefs as a Foreigner.',
    inc: {roles: ['civilian', 'friend'], dir: 'out'}, req: {roles: ['foe', 'foreigner'], dir: 'out'}
  }),
  direct({
    id: 'se-32', domain: 3, title: 'Misled witness',
    order: 'Street misdirection: fire on anyone misled by a Double agent or briefed by a Foreigner — unless targeted by a Foe.',
    hint: 'Check who a Double agent misleads or Foreigner briefs, then rule out anyone a Foe targets.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-33', domain: 3, title: 'Targeted witness',
    order: 'Tainted brief: take down anyone tipped off by a Civilian or confirmed by a Friend who is also targeted by a Foe or misled by a Double agent.',
    hint: 'Check who a Civilian tips off or Friend confirms, then see if a Foe targets or Double agent misleads them.',
    inc: {roles: ['civilian', 'friend'], dir: 'in'}, req: {roles: ['foe', 'double'], dir: 'in'}
  }),
  direct({
    id: 'se-34', domain: 3, title: 'Unconfirmed deceiver',
    order: 'Informant in play: neutralize anyone who misleads as a Double agent or briefs as a Foreigner — excluding anyone who confirms as a Friend.',
    hint: 'Find active Double agents and Foreigners, then cross off active Friends.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['friend'], dir: 'out'}
  }),
  direct({
    id: 'se-35', domain: 3, title: 'Briefed informant',
    order: 'Take out anyone briefed by a Foreigner or targeted by a Foe, except anyone tipped off by a Civilian.',
    hint: 'Check who a Foreigner briefs or Foe targets, then exclude anyone a Civilian tips off.',
    inc: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-36', domain: 3, title: 'Unconfirmed monitor',
    order: 'Burned tip-off: shoot anyone who monitors as a Spy or tips off as a Civilian — unless confirmed by a Friend.',
    hint: 'Find active Spies and Civilians, then rule out anyone a Friend confirms.',
    inc: {roles: ['spy', 'civilian'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-37', domain: 3, title: 'Confirmer under fire',
    order: 'Compromised witness: drop anyone who confirms as a Friend or monitors as a Spy, sparing anyone targeted by a Foe.',
    hint: 'Find active Friends and Spies, then cross off anyone a Foe targets.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-38', domain: 3, title: 'Briefed striker',
    order: 'Street misdirection — engage anyone who targets as a Foe or misleads as a Double agent; hold fire on anyone briefed by a Foreigner.',
    hint: 'Find active Foes and Double agents, then rule out anyone a Foreigner briefs.',
    inc: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-39', domain: 3, title: 'Double-checked tip-off',
    order: 'Tainted brief: eliminate anyone who receives contacts from at least two of Civilian, Spy, and Foreigner.',
    hint: 'Check the recipients of Civilian, Spy, and Foreigner dispatches for anyone reached by two or more.',
    inc: {roles: ['civilian', 'spy', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),

  // =========================================================================
  // DOMAIN 4: Proxy Chains (10) — backs, strikes, traces, relays to, warns, hands off to
  // =========================================================================
  direct({
    id: 'se-40', domain: 4, title: 'Two-role operator',
    order: 'Take out anyone who initiates contacts in at least two of Friend, Foe, and Spy.',
    hint: 'Check the active senders in Friend, Foe, and Spy for anyone initiating in two or more.',
    inc: {roles: ['friend', 'foe', 'spy'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-41', domain: 4, title: 'Cross-channel relay',
    order: 'Chain of proxies: shoot anyone who initiates contacts in at least two of Double agent, Civilian, and Foreigner.',
    hint: 'Check the active senders in Double agent, Civilian, and Foreigner for overlap.',
    inc: {roles: ['double', 'civilian', 'foreigner'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-42', domain: 4, title: 'Struck from two sides',
    order: 'Cutout exposed — drop anyone who receives contacts from at least two of Foe, Double agent, and Spy.',
    hint: 'Check the recipients of Foe, Double agent, and Spy for anyone reached by two or more.',
    inc: {roles: ['foe', 'double', 'spy'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-43', domain: 4, title: 'Backed and handed off',
    order: 'Compromised middleman: engage anyone who receives contacts from at least two of Friend, Civilian, and Foreigner.',
    hint: 'Check the recipients of Friend, Civilian, and Foreigner for anyone reached by two or more.',
    inc: {roles: ['friend', 'civilian', 'foreigner'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-44', domain: 4, title: 'Unbacked courier',
    order: 'Rogue relay: eliminate anyone who relays as a Double agent or hands off as a Foreigner — unless backed by a Friend.',
    hint: 'Find who relays as a Double agent or hands off as a Foreigner, then rule out anyone backed by a Friend.',
    inc: {roles: ['double', 'foreigner'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-45', domain: 4, title: 'Unwarned striker',
    order: 'Fire on anyone who strikes as a Foe or hands off as a Foreigner, sparing anyone warned by a Civilian.',
    hint: 'Find who strikes as a Foe or hands off as a Foreigner, then cross off anyone warned by a Civilian.',
    inc: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-46', domain: 4, title: 'Shadow proxy',
    order: 'Proxy breach — take down anyone who initiates contacts in at least two of Friend, Double agent, and Foreigner.',
    hint: 'Check the active senders in Friend, Double agent, and Foreigner for overlap.',
    inc: {roles: ['friend', 'double', 'foreigner'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-47', domain: 4, title: 'Handoff target outside Spy ranks',
    order: 'Chain of proxies: neutralize anyone handed off to by a Foreigner or struck by a Foe — excluding anyone who traces as a Spy.',
    hint: 'Check who a Foreigner hands off to or Foe strikes, then exclude active Spies.',
    inc: {roles: ['foreigner', 'foe'], dir: 'in'}, exc: {roles: ['spy'], dir: 'out'}
  }),
  direct({
    id: 'se-48', domain: 4, title: 'Relay without backing',
    order: 'Cutout exposed: take out anyone relayed to by a Double agent or traced by a Spy — unless backed by a Friend.',
    hint: 'Check who a Double agent relays to or Spy traces, then exclude anyone a Friend backs.',
    inc: {roles: ['double', 'spy'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-49', domain: 4, title: 'Multi-role sender',
    order: 'Compromised middleman: shoot anyone who initiates contacts in at least two of Foe, Spy, and Civilian.',
    hint: 'Check the active senders in Foe, Spy, and Civilian for anyone initiating in two or more.',
    inc: {roles: ['foe', 'spy', 'civilian'], dir: 'out'}, minDistinct: 2
  }),

  // =========================================================================
  // DOMAIN 5: Alibi & Contradiction (10) — corroborates, accuses, verifies, deceives, identifies, consults
  // =========================================================================
  direct({
    id: 'se-50', domain: 5, title: 'Accused despite alibi',
    order: 'Fire on anyone corroborated by a Friend or verified by a Spy; hold fire on anyone accused by a Foe.',
    hint: 'Find who a Friend corroborates or Spy verifies, then cross off anyone a Foe accuses.',
    inc: {roles: ['friend', 'spy'], dir: 'in'}, exc: {roles: ['foe'], dir: 'in'}
  }),
  direct({
    id: 'se-51', domain: 5, title: 'Unidentified accuser',
    order: 'False verification: take down anyone who accuses as a Foe or deceives as a Double agent, except anyone identified by a Civilian.',
    hint: 'Find active Foes and Double agents, then exclude anyone identified by a Civilian.',
    inc: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-52', domain: 5, title: 'Contradicted witness',
    order: 'Colluding sources: neutralize anyone identified by a Civilian or consulted by a Foreigner — unless verified by a Spy.',
    hint: 'Check who a Civilian identifies or Foreigner consults, then rule out anyone a Spy verifies.',
    inc: {roles: ['civilian', 'foreigner'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-53', domain: 5, title: 'Corroborator turned accuser',
    order: 'Fabricated account: take out anyone who corroborates as a Friend or verifies as a Spy, sparing anyone deceived by a Double agent.',
    hint: 'Find active Friends and Spies, then cross off anyone a Double agent deceives.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, exc: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-54', domain: 5, title: 'Deceived insider',
    order: 'Alibi broken — shoot anyone deceived by a Double agent or accused by a Foe; hold fire on anyone consulted by a Foreigner.',
    hint: 'Check who a Double agent deceives or Foe accuses, then exclude anyone a Foreigner consults.',
    inc: {roles: ['double', 'foe'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-55', domain: 5, title: 'Cross-examined consultant',
    order: 'Drop anyone who consults as a Foreigner or identifies as a Civilian, except anyone corroborated by a Friend.',
    hint: 'Find active Foreigners and Civilians, then rule out anyone a Friend corroborates.',
    inc: {roles: ['foreigner', 'civilian'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-56', domain: 5, title: 'Witness under consultation',
    order: 'Contradicted witness: engage anyone identified by a Civilian or corroborated by a Friend — unless consulted by a Foreigner.',
    hint: 'Check who a Civilian identifies or Friend corroborates, then exclude anyone a Foreigner consults.',
    inc: {roles: ['civilian', 'friend'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-57', domain: 5, title: 'Deceiver or witness unverified',
    order: 'False verification: eliminate anyone who deceives as a Double agent or identifies as a Civilian, sparing anyone verified by a Spy.',
    hint: 'Find active Double agents and Civilians, then cross off anyone a Spy verifies.',
    inc: {roles: ['double', 'civilian'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-58', domain: 5, title: 'Unverified accused',
    order: 'Colluding sources — fire on anyone accused by a Foe or consulted by a Foreigner; hold fire on anyone verified by a Spy.',
    hint: 'Find who a Foe accuses or Foreigner consults, then exclude anyone a Spy verifies.',
    inc: {roles: ['foe', 'foreigner'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-59', domain: 5, title: 'Competing accounts',
    order: 'Fabricated account: take down anyone who receives contacts from at least two of Friend, Foe, and Double agent.',
    hint: 'Check the recipients of Friend, Foe, and Double agent for anyone reached by two or more.',
    inc: {roles: ['friend', 'foe', 'double'], dir: 'in'}, minDistinct: 2
  }),

  // =========================================================================
  // DOMAIN 6: Chronology & Timing (10) — clears, strikes, logs, leaks to, corrects, meets
  // =========================================================================
  timed({
    id: 'se-60', domain: 6, title: 'Leaked after correction',
    order: 'Drop anyone corrected by a Civilian or logged by a Spy earlier than they leaked as a Double agent or met as a Foreigner.',
    hint: 'Compare the timestamps: Civilian/Spy incoming must be earlier than their outgoing Double agent/Foreigner move.',
    early: {roles: ['civilian', 'spy'], dir: 'in'}, late: {roles: ['double', 'foreigner'], dir: 'out'}
  }),
  timed({
    id: 'se-61', domain: 6, title: 'Cleared after a strike',
    order: 'Acted after the breach: engage anyone struck by a Foe or met by a Foreigner earlier than a Friend cleared or Spy logged them.',
    hint: 'Check who a Foe struck or Foreigner met, then verify a Friend cleared or Spy logged them later.',
    early: {roles: ['foe', 'foreigner'], dir: 'in'}, late: {roles: ['friend', 'spy'], dir: 'in'}
  }),
  timed({
    id: 'se-62', domain: 6, title: 'Logged before betraying',
    order: 'Out of sequence — eliminate anyone logged by a Spy or cleared by a Friend earlier than they struck as a Foe or leaked as a Double agent.',
    hint: 'Verify the Spy log or Friend clearance timestamp is earlier than their Foe strike or Double agent leak.',
    early: {roles: ['spy', 'friend'], dir: 'in'}, late: {roles: ['foe', 'double'], dir: 'out'}
  }),
  timed({
    id: 'se-63', domain: 6, title: 'Meeting before clearance',
    order: 'Post-correction move: fire on anyone met by a Foreigner or fed a Double agent’s leak earlier than a Friend cleared or Civilian corrected them.',
    hint: 'Check who a Foreigner met or Double agent leaked to, then confirm a Friend or Civilian reached them later.',
    early: {roles: ['foreigner', 'double'], dir: 'in'}, late: {roles: ['friend', 'civilian'], dir: 'in'}
  }),
  timed({
    id: 'se-64', domain: 6, title: 'Struck after clearance',
    order: 'Too late to clear — take down anyone cleared by a Friend or corrected by a Civilian earlier than a Foe struck or Foreigner met them.',
    hint: 'Compare timestamps: Friend/Civilian incoming must happen before Foe/Foreigner incoming.',
    early: {roles: ['friend', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'foreigner'], dir: 'in'}
  }),
  timed({
    id: 'se-65', domain: 6, title: 'Early leak, late audit',
    order: 'Neutralize anyone who leaked as a Double agent or struck as a Foe earlier than a Spy logged or Civilian corrected them.',
    hint: 'Find active Double agents and Foes, then confirm a Spy logged or Civilian corrected them later.',
    early: {roles: ['double', 'foe'], dir: 'out'}, late: {roles: ['spy', 'civilian'], dir: 'in'}
  }),
  timed({
    id: 'se-66', domain: 6, title: 'Late correction after meeting',
    order: 'Wrong side of the clock — take out anyone who met as a Foreigner or cleared as a Friend earlier than a Civilian corrected or Foe struck them.',
    hint: 'Find active Foreigners and Friends, then confirm a Civilian corrected or Foe struck them later.',
    early: {roles: ['foreigner', 'friend'], dir: 'out'}, late: {roles: ['civilian', 'foe'], dir: 'in'}
  }),
  timed({
    id: 'se-67', domain: 6, title: 'Spy log before strike',
    order: 'Acted after the breach: shoot anyone logged by a Spy or corrected by a Civilian earlier than a Foe struck or Double agent leaked to them.',
    hint: 'Verify the Spy log or Civilian correction happened earlier than the Foe strike or Double agent leak.',
    early: {roles: ['spy', 'civilian'], dir: 'in'}, late: {roles: ['foe', 'double'], dir: 'in'}
  }),
  timed({
    id: 'se-68', domain: 6, title: 'Cleared before meeting abroad',
    order: 'Out of sequence — drop anyone cleared by a Friend or logged by a Spy earlier than they met as a Foreigner or cleared as a Friend.',
    hint: 'Check who a Friend cleared or Spy logged earlier than their outgoing Foreigner or Friend move.',
    early: {roles: ['friend', 'spy'], dir: 'in'}, late: {roles: ['foreigner', 'friend'], dir: 'out'}
  }),
  timed({
    id: 'se-69', domain: 6, title: 'Acted before correction',
    order: 'Post-correction move: engage anyone who struck as a Foe or met as a Foreigner earlier than a Friend cleared or Spy logged them.',
    hint: 'Compare timestamps: their outgoing Foe/Foreigner move must precede the Friend clearance or Spy log.',
    early: {roles: ['foe', 'foreigner'], dir: 'out'}, late: {roles: ['friend', 'spy'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 7: Tainted Sources (10) — alibis, coerces, vets, compromises, exposes, funds
  // =========================================================================
  direct({
    id: 'se-70', domain: 7, title: 'Funded or vetted without exposure',
    order: 'Neutralize anyone funded by a Foreigner or vetted by a Spy; hold fire on anyone exposed by a Civilian.',
    hint: 'Check who a Foreigner funds or Spy vets, then exclude anyone a Civilian exposes.',
    inc: {roles: ['foreigner', 'spy'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-71', domain: 7, title: 'Compromised without exposure',
    order: 'Compromised backer: take out anyone compromised by a Double agent or funded by a Foreigner, except anyone exposed by a Civilian.',
    hint: 'Find who a Double agent compromises or Foreigner funds, then cross off anyone a Civilian exposes.',
    inc: {roles: ['double', 'foreigner'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-72', domain: 7, title: 'Unalibied funder or vetter',
    order: 'Bought alibi: shoot anyone who funds as a Foreigner or vets as a Spy — unless given a Friend’s alibi.',
    hint: 'Find active Foreigners and Spies, then rule out anyone with a Friend alibi.',
    inc: {roles: ['foreigner', 'spy'], dir: 'out'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-73', domain: 7, title: 'Uncompromised ally',
    order: 'Dirty funding: drop anyone given a Friend’s alibi or Spy’s vetting, sparing anyone compromised by a Double agent.',
    hint: 'Find who gets a Friend alibi or Spy vetting, then cross off anyone a Double agent compromises.',
    inc: {roles: ['friend', 'spy'], dir: 'in'}, exc: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-74', domain: 7, title: 'Silent coercer',
    order: 'Coerced vetting — engage anyone who coerces as a Foe or compromises as a Double agent, sparing them if they also expose as a Civilian.',
    hint: 'Find active Foes and Double agents, then exclude anyone who also exposes as a Civilian.',
    inc: {roles: ['foe', 'double'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'out'}
  }),
  direct({
    id: 'se-75', domain: 7, title: 'Unalibied witness',
    order: 'Eliminate anyone exposed by a Civilian or coerced by a Foe, except anyone given a Friend’s alibi.',
    hint: 'Check who a Civilian exposes or Foe coerces, then rule out anyone with a Friend alibi.',
    inc: {roles: ['civilian', 'foe'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-76', domain: 7, title: 'Vetter with hidden ties',
    order: 'Paid witness: fire on anyone who vets as a Spy or exposes as a Civilian — unless funded by a Foreigner.',
    hint: 'Find active Spies and Civilians, then cross off anyone a Foreigner funds.',
    inc: {roles: ['spy', 'civilian'], dir: 'out'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-77', domain: 7, title: 'Alibi provider without funding',
    order: 'Compromised backer: take down anyone who gives a Friend’s alibi or Spy’s vetting, sparing anyone funded by a Foreigner.',
    hint: 'Find active Friends and Spies, then exclude anyone a Foreigner funds.',
    inc: {roles: ['friend', 'spy'], dir: 'out'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-78', domain: 7, title: 'Tainted and unvetted',
    order: 'Bought alibi — neutralize anyone coerced by a Foe or compromised by a Double agent; hold fire on anyone vetted by a Spy.',
    hint: 'Find who a Foe coerces or Double agent compromises, then cross off anyone a Spy vets.',
    inc: {roles: ['foe', 'double'], dir: 'in'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-79', domain: 7, title: 'Double-tainted contact',
    order: 'Dirty funding: take out anyone who receives contacts from at least two of Foe, Foreigner, and Civilian.',
    hint: 'Check the recipients of Foe, Foreigner, and Civilian for anyone reached by two or more.',
    inc: {roles: ['foe', 'foreigner', 'civilian'], dir: 'in'}, minDistinct: 2
  }),

  // =========================================================================
  // DOMAIN 8: Double Lives (10) — protects, hunts, watches, leaks to, shelters, hosts
  // =========================================================================
  direct({
    id: 'se-80', domain: 8, title: 'Protector who hunts',
    order: 'Eliminate anyone who protects as a Friend or shelters as a Civilian — unless watched by a Spy.',
    hint: 'Find active Friends and Civilians, then exclude anyone a Spy watches.',
    inc: {roles: ['friend', 'civilian'], dir: 'out'}, exc: {roles: ['spy'], dir: 'in'}
  }),
  direct({
    id: 'se-81', domain: 8, title: 'Host who stays off the hunt',
    order: 'Double life exposed: fire on anyone who hosts as a Foreigner or leaks as a Double agent; stand down if they also hunt as a Foe.',
    hint: 'Find active Foreigners and Double agents, then cross off anyone who also hunts as a Foe.',
    inc: {roles: ['foreigner', 'double'], dir: 'out'}, exc: {roles: ['foe'], dir: 'out'}
  }),
  direct({
    id: 'se-82', domain: 8, title: 'Hunter without a mole',
    order: 'Shelter breached — take down anyone who hunts as a Foe or hosts as a Foreigner; hold fire on anyone fed a Double agent’s leak.',
    hint: 'Find active Foes and Foreigners, then rule out anyone a Double agent leaks to.',
    inc: {roles: ['foe', 'foreigner'], dir: 'out'}, exc: {roles: ['double'], dir: 'in'}
  }),
  direct({
    id: 'se-83', domain: 8, title: 'Sheltered guest',
    order: 'Protector playing both sides: neutralize anyone sheltered by a Civilian or hosted by a Foreigner, except anyone protected by a Friend.',
    hint: 'Check who a Civilian shelters or Foreigner hosts, then exclude anyone a Friend protects.',
    inc: {roles: ['civilian', 'foreigner'], dir: 'in'}, exc: {roles: ['friend'], dir: 'in'}
  }),
  direct({
    id: 'se-84', domain: 8, title: 'Unsheltered quarry',
    order: 'Two masters at once: take out anyone hunted by a Foe or fed a Double agent’s leak — unless sheltered by a Civilian.',
    hint: 'Check who a Foe hunts or Double agent leaks to, then exclude anyone a Civilian shelters.',
    inc: {roles: ['foe', 'double'], dir: 'in'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-85', domain: 8, title: 'Protected mole',
    order: 'Shoot anyone protected by a Friend or watched by a Spy, sparing anyone hosted by a Foreigner.',
    hint: 'Find who a Friend protects or Spy watches, then cross off anyone a Foreigner hosts.',
    inc: {roles: ['friend', 'spy'], dir: 'in'}, exc: {roles: ['foreigner'], dir: 'in'}
  }),
  direct({
    id: 'se-86', domain: 8, title: 'Watchers under cover',
    order: 'Turned guardian — drop anyone who watches as a Spy or hunts as a Foe; hold fire on anyone sheltered by a Civilian.',
    hint: 'Find active Spies and Foes, then exclude anyone a Civilian shelters.',
    inc: {roles: ['spy', 'foe'], dir: 'out'}, exc: {roles: ['civilian'], dir: 'in'}
  }),
  direct({
    id: 'se-87', domain: 8, title: 'Double-hatted operator',
    order: 'Double life exposed: engage anyone who initiates contacts in at least two of Friend, Spy, and Foreigner.',
    hint: 'Check the active senders in Friend, Spy, and Foreigner for overlap.',
    inc: {roles: ['friend', 'spy', 'foreigner'], dir: 'out'}, minDistinct: 2
  }),
  direct({
    id: 'se-88', domain: 8, title: 'Dual-sheltered suspect',
    order: 'Shelter breached — eliminate anyone who receives contacts from at least two of Friend, Spy, and Double agent.',
    hint: 'Check the recipients of Friend, Spy, and Double agent for overlap.',
    inc: {roles: ['friend', 'spy', 'double'], dir: 'in'}, minDistinct: 2
  }),
  direct({
    id: 'se-89', domain: 8, title: 'Hosted without watch',
    order: 'Protector playing both sides: fire on anyone hosted by a Foreigner or watched by a Spy, sparing anyone hunted by a Foe.',
    hint: 'Check who a Foreigner hosts or Spy watches, then rule out anyone a Foe hunts.',
    inc: {roles: ['foreigner', 'spy'], dir: 'in'}, exc: {roles: ['foe'], dir: 'in'}
  }),

  // =========================================================================
  // DOMAIN 9: Command & Leverage (10) — vouches for, targets, shadows, leaks to, tips off, meets
  // =========================================================================
  anchorDirect({
    id: 'se-90', domain: 9, title: '{name}’s outgoing contacts',
    order: 'Shoot anyone {name} directly reaches in any role, sparing them if a Friend vouches for them.',
    hint: 'Find everyone {name} reaches directly, then rule out anyone a Friend vouches for.',
    incRoles: null, incDir: 'out', exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-91', domain: 9, title: '{name}’s incoming sources',
    order: 'Handler compromised: drop anyone who directly reaches {name} in any role — unless a Spy shadows them.',
    hint: 'Find everyone reaching {name} directly, then rule out anyone a Spy shadows.',
    incRoles: null, incDir: 'in', exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-92', domain: 9, title: '{name}’s unbacked circle',
    order: 'Command breach: engage anyone sharing a direct contact with {name} in any role — unless a Friend vouches for them.',
    hint: 'Find everyone in direct contact with {name}, then exclude anyone a Friend vouches for.',
    incRoles: null, incDir: 'any', exc: {roles: ['friend'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-93', domain: 9, title: '{name}’s unwatched circle',
    order: 'Asset under leverage: eliminate anyone sharing a direct contact with {name} in any role; stand down if a Spy shadows them.',
    hint: 'Find everyone in direct contact with {name}, then exclude anyone a Spy shadows.',
    incRoles: null, incDir: 'any', exc: {roles: ['spy'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-94', domain: 9, title: '{name}’s active contacts',
    order: 'Shadow reach — fire on anyone sharing a direct contact with {name} who also targets as a Foe or leaks as a Double agent.',
    hint: 'Find {name}’s direct contacts, then keep anyone who targets as a Foe or leaks as a Double agent.',
    incRoles: null, incDir: 'any', req: {roles: ['foe', 'double'], dir: 'out'}
  }),
  anchorDirect({
    id: 'se-95', domain: 9, title: '{name}’s foreign or ally contacts',
    order: 'Take down anyone sharing a direct contact with {name} who also vouches as a Friend or meets as a Foreigner.',
    hint: 'Find {name}’s direct contacts, then keep anyone who vouches as a Friend or meets as a Foreigner.',
    incRoles: null, incDir: 'any', req: {roles: ['friend', 'foreigner'], dir: 'out'}
  }),
  anchorDirect({
    id: 'se-96', domain: 9, title: '{name}’s untipped circle',
    order: 'Chain of leverage: neutralize anyone sharing a direct contact with {name} in any role — unless a Civilian tips them off.',
    hint: 'Find everyone in direct contact with {name}, then exclude anyone a Civilian tips off.',
    incRoles: null, incDir: 'any', exc: {roles: ['civilian'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-97', domain: 9, title: '{name}’s watched contacts',
    order: 'Handler compromised: take out anyone sharing a direct contact with {name} who is shadowed by a Spy or met by a Foreigner.',
    hint: 'Find {name}’s direct contacts, then keep those shadowed by a Spy or met by a Foreigner.',
    incRoles: null, incDir: 'any', req: {roles: ['spy', 'foreigner'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-98', domain: 9, title: '{name}’s untargeted circle',
    order: 'Command breach — shoot anyone sharing a direct contact with {name} in any role, sparing them if a Foe targets them.',
    hint: 'Find everyone in direct contact with {name}, then cross off anyone a Foe targets.',
    incRoles: null, incDir: 'any', exc: {roles: ['foe'], dir: 'in'}
  }),
  anchorDirect({
    id: 'se-99', domain: 9, title: '{name}’s unreached partners',
    order: 'Asset under leverage: drop anyone sharing a direct contact with {name} in any role — unless a Foreigner meets them.',
    hint: 'Find everyone in direct contact with {name}, then rule out anyone a Foreigner meets.',
    incRoles: null, incDir: 'any', exc: {roles: ['foreigner'], dir: 'in'}
  })
];
