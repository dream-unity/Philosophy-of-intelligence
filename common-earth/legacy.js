/* A voluntary four-week Council handover. Only the elected community delegates
   its agenda. All changes use the usual world, reserves, routes and weekly clock. */
((root) => {
  'use strict';

  const WEEKS = 4;
  const OFFICES = [
    {name:'Pantry steward', aim:'Keep food within reach', brief:'Send spare food to a linked pantry in need. At home, pay for missing staples or share a meal with a resident.'},
    {name:'Workshop steward', aim:'Put tools into people’s hands', brief:'Send spare materials to a linked community in need. At home, repair practical equipment with a resident. A workshop makes the same materials go further.'},
    {name:'Assembly chair', aim:'Bring unheard voices into the room', brief:'Pay for local or linked listening sessions. Residents who have never spoken come first. An assembly hall reduces the cost.'}
  ];
  const has = (site, kind) => site.buildings.some(b => b.kind === kind);
  const foodFloor = site => Math.max(6, Math.ceil(site.population / 5));
  const personById = (site, id) => site.residents.find(p => p.id === id);
  const active = world => world.legacy?.term;
  const governs = (world, site) => Boolean(active(world)?.siteId === site.id);
  const fundsFor = (site, n) => site.funds - n >= 2;
  const units = (n,singular,plural) => n+' '+(n === 1 ? singular : plural);
  const cap = (object, key, increment, limit) => {
    const before = object[key];
    object[key] = Math.min(limit, before + increment);
    return object[key] - before;
  };

  function measure(world) {
    const sites = world.sites;
    if (world.charter === 'care') {
      const supplied = sites.filter(s => s.food >= 6).length;
      const kept = sites.reduce((sum,s) => sum + s.stats.kept, 0);
      return {met:supplied === sites.length && kept >= 2,
        text:supplied+' of '+units(sites.length,'community','communities')+' had at least 6 food, with '+units(kept,'promise','promises')+' kept.'};
    }
    if (world.charter === 'voice') {
      const heard = sites.filter(s => s.residents.every(p => p.heard)).length;
      const cases = sites.reduce((sum,s) => sum + s.stats.resolved, 0);
      return {met:heard >= 2 && cases >= 2,
        text:'All founding residents had spoken in '+units(heard,'community','communities')+'. Councils had resolved '+units(cases,'decision','decisions')+'.'};
    }
    const schools = sites.filter(s => s.tech.includes('apprenticeship')).length;
    const errands = sites.reduce((sum,s) => sum + s.stats.deliveries, 0);
    return {met:schools >= 2 && errands > 0,
      text:units(schools,'community','communities')+' had shared apprenticeships. Residents had received '+units(errands,'street delivery','street deliveries')+'.'};
  }

  function contacts(world, site) {
    const linked = [];
    for (const route of world.routes) {
      const id = route.from === site.id ? route.to : route.to === site.id ? route.from : null;
      if (!id) continue;
      const partner = world.sites.find(s => s.id === id);
      if (partner) linked.push({site:partner, route});
    }
    return linked;
  }

  function chooseContact(term, candidates) {
    const people = [];
    for (const site of candidates) {
      for (const person of site.residents) {
        if (person.id !== term.residentId) people.push({site, person});
      }
    }
    const attended = person => term.reached.includes(person.id);
    people.sort((a,b) => Number(attended(a.person)) - Number(attended(b.person))
      || Number(a.person.heard) - Number(b.person.heard)
      || a.person.bond - b.person.bond);
    return people[0];
  }

  function unmet(world, site, good) {
    let incoming = 0;
    for (const r of world.routes) {
      for (const cargo of r.shipments) {
        if (cargo.to === site.id && cargo.good === good) incoming += cargo.amount;
      }
    }
    const goal = good === 'food' ? foodFloor(site) : 5;
    return Math.max(0, goal - site[good] - incoming);
  }

  function sendSurplus(world, home, term, good, travelTime) {
    if (!travelTime) return '';
    const floor = good === 'food' ? foodFloor(home) : 2;
    const spare = Math.min(good === 'food' ? 3 : 2, home[good] - floor);
    if (spare < 1) return '';
    const partners = contacts(world, home)
      .filter(p => p.route.lastDispatch !== world.week)
      .map(p => ({...p,need:unmet(world,p.site,good)}));
    partners.sort((a,b) => b.need - a.need);
    const receiver = partners[0];
    if (!receiver || !receiver.need) return '';
    const depot = has(home,'pier') || has(receiver.site,'pier');
    const capacity = (depot ? 4 : 2) + (root.EarthStrategy?.cargoBonus(home) || 0);
    const amount = Math.min(spare, receiver.need, capacity), due = world.week + travelTime(home, receiver.site);
    home[good] -= amount;
    receiver.route.shipments.push({from:home.id, to:receiver.site.id, good, amount, due});
    const text = 'Sent '+amount+' '+good+' from '+home.name+' to '+receiver.site.name+'. Delivery is due in week '+due+'.';
    receiver.route.lastDispatch = world.week;
    receiver.route.lastStatus = text;
    if (!term.partners.includes(receiver.site.name)) term.partners.push(receiver.site.name);
    return text;
  }

  function remember(term, p) {
    if (!term.reached.includes(p.id)) term.reached.push(p.id);
  }

  function provision(world, home, term, helpers) {
    const food = term.slot === 0;
    const good = food ? 'food' : 'materials';
    const floor = food ? foodFloor(home) : 2;
    const sent = sendSurplus(world, home, term, good, helpers.travelTime);
    if (sent) return sent;
    const needed = food ? 2 : 1;
    if (home[good] - needed < floor) {
      if (!fundsFor(home, 2)) return 'Kept '+home.name+'’s reserves intact. The proposed '+(food?'meal':'repair')+' could not be funded this week.';
      home.funds -= 2;
      const quantity = food && has(home,'market') ? 4 : 3;
      home[good] += quantity;
      return 'Paid 2 funds to local suppliers for '+quantity+' '+good+'. '+home.name+' kept the purchase in reserve.';
    }
    const p = chooseContact(term, [home]).person;
    home[good] -= needed;
    remember(term, p);
    cap(p, 'bond', 1, 10);
    if (food) {
      const gain = cap(home, 'wellbeing', has(home,'garden') ? 2 : 1, 100);
      return 'Shared 2 food with '+p.name+'’s household through '+(has(home,'garden')?'the community garden':'the pantry')+'. '+(gain?'Local wellbeing rose by '+gain+'.':'Local wellbeing held at 100.');
    }
    const output = has(home,'workshop') ? 3 : 1;
    if (home.food <= foodFloor(home) + 2) {
      home.food += output;
      return 'Used 1 material to repair a food cart with '+p.name+'. The cart brought home '+output+' food.';
    }
    home.funds += output;
    return 'Used 1 material to repair equipment with '+p.name+'. A local customer paid '+output+' '+(output === 1?'fund':'funds')+' into the treasury.';
  }

  function hear(world, home, term) {
    const cost = has(home,'hall') ? 1 : 2;
    if (!fundsFor(home,cost)) return 'Postponed a listening session. The '+cost+'-fund cost would have cut into the treasury reserve.';
    const {site,person} = chooseContact(term,[home,...contacts(world,home).map(p => p.site)]);
    const first = !person.heard;
    home.funds -= cost;
    person.heard = true;
    cap(person,'bond',1,10);
    const trust = cap(site,'trust',1,100);
    remember(term,person);
    if (site.id !== home.id && !term.partners.includes(site.name)) term.partners.push(site.name);
    const testimony = ['who misses the pantry distribution','which repairs routinely go unpaid','who cannot attend ordinary meeting hours'][person.slot];
    return 'Paid '+units(cost,'fund','funds')+' for a session with '+person.name+' in '+site.name+'. '+person.name+' spoke about '+testimony+(first?' for the first time on the public record':'')+'. '+(trust?'Local trust rose by '+trust+'.':'Local trust held at 100.');
  }

  function actions(world, site, add) {
    if (!world.completed || active(world)) return;
    for (const person of site.residents) {
      const office = OFFICES[person.slot];
      add('council','legacy:start:'+person.id,'Elect '+person.name+' as '+office.name.toLowerCase(),
        office.brief+' For the next four weeks '+person.name+' will also choose this council’s votes. Keeps 2 funds and 2 materials in reserve, and at least 6 food for local households.',
        {legacy:true,effort:1,gate:person.heard?'':'Hear '+person.name+' in People before offering the chair.'},() => {
          world.legacy ||= {version:1,term:null,history:[]};
          world.legacy.term = {siteId:site.id,siteName:site.name,residentId:person.id,person:person.name,slot:person.slot,
            start:world.week,opening:measure(world),decisions:[],reached:[],partners:[]};
          return person.name+' accepted a four-week term in '+site.name+'. The handover review is due in week '+(world.week+WEEKS)+'.';
        });
    }
  }

  function tick(world, helpers = {}) {
    const term = active(world);
    if (!term || world.week <= term.start + term.decisions.length) return [];
    const home = world.sites.find(s => s.id === term.siteId);
    if (!home) return [];
    const pending = Boolean(home.issue);
    const vote = pending && helpers.vote?.(home,term.slot);
    const decision = vote || (pending?'Deferred the vote to protect reserves. ':'')+
      (term.slot === 2 ? hear(world,home,term) : provision(world,home,term,helpers));
    const line = 'Week '+world.week+' · '+term.person+' — '+decision;
    term.decisions.push(line);
    const events = [{site:home,text:line}];
    if (term.decisions.length === WEEKS) {
      const closing = measure(world);
      const people = world.sites.flatMap(s => s.residents.filter(p => term.reached.includes(p.id))
        .map(p => s.id === home.id ? p.name : p.name+' at '+s.name));
      const missed = home.residents.filter(p => p.id !== term.residentId && !term.reached.includes(p.id));
      const reach = 'Direct household support or hearings: '+(people.join(', ') || 'none')+'. '+
        (term.partners.length?'Partner communities supported: '+term.partners.join(', ')+'. ':'')+
        (missed.length?'No direct visit was recorded for '+missed.map(p => p.name).join(' or ')+'.':'Every other founding resident at home had a direct visit.');
      const result = closing.met?'The original charter’s conditions held at review.':'The original charter’s conditions were no longer all met at review.';
      const review = {person:term.person,siteName:term.siteName,office:OFFICES[term.slot].name,week:world.week,
        opening:term.opening.text,closing:closing.text,result,reach,decisions:term.decisions.slice()};
      world.legacy.history.unshift(review);
      world.legacy.history.length = Math.min(world.legacy.history.length, 6);
      world.legacy.term = null;
      events.push({site:home,text:term.person+' returned the chair to you. '+result+' '+reach});
    }
    return events;
  }

  function summary(world, site) {
    const term = active(world), archive = world.legacy?.history || [];
    const output = {unlocked:Boolean(world.completed),phase:'locked',title:'Council handover',description:'',current:'',comparison:'',decisions:[],history:[],archives:[]};
    if (!world.completed) return output;
    output.phase = term ? (governs(world,site)?'governing':'elsewhere') : 'ready';
    output.description = 'A resident can chair one community for four weeks. Their decision each week uses its real reserves. Other districts and ordinary play remain in your hands.';
    if (term) {
      output.title = term.person+'’s council';
      output.current = OFFICES[term.slot].aim+' · '+term.siteName+' · '+term.decisions.length+' of 4 weekly decisions.';
      output.comparison = 'At handover: '+term.opening.text;
      output.decisions = term.decisions.slice();
    }
    output.archives = archive.map(record => ({
      title:record.person+' · '+record.office+' · '+record.siteName+' · week '+record.week,
      lines:['At handover: '+record.opening,'At review: '+record.closing,record.result,record.reach,...record.decisions]
    }));
    if (output.archives.length) {
      const last = output.archives[0];
      output.history = [last.title,...last.lines];
    }
    return output;
  }

  function valid(world) {
    const data = world.legacy;
    if (data == null) return true;
    const strings = (array,n) => Array.isArray(array) && array.length <= n && array.every(value => typeof value === 'string');
    if (data.version !== 1 || !Array.isArray(data.history) || data.history.length > 6) return false;
    for (const record of data.history) {
      if (!record || !Number.isInteger(record.week) || !strings(record.decisions,WEEKS) ||
        !['person','siteName','office','opening','closing','result','reach'].every(k => typeof record[k] === 'string')) return false;
    }
    const t = data.term;
    if (t == null) return true;
    const site = world.sites.find(s => s.id === t.siteId);
    const member = site && personById(site,t.residentId);
    return Boolean(world.completed && member && member.slot === t.slot && Number.isInteger(t.start) && t.start >= 1 &&
      t.start <= world.week && t.start+WEEKS > world.week && typeof t.person === 'string' && typeof t.siteName === 'string' &&
      typeof t.opening?.text === 'string' && typeof t.opening.met === 'boolean' && strings(t.decisions,WEEKS-1) &&
      t.decisions.length === world.week-t.start && strings(t.partners,WEEKS) && strings(t.reached,WEEKS));
  }

  root.EarthLegacy = Object.freeze({governs,actions,tick,summary,valid});
})(typeof window === 'undefined' ? globalThis : window);
