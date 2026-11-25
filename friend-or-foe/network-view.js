import {resolvedNetwork, winningNetworkRoutes, explainNetworkConflict} from './network-case.js?v=trail';

const roles = {
  friend: {label:'Friend', channel:'Aid'},
  foe: {label:'Foe', channel:'Alerts'},
  spy: {label:'Spy', channel:'Alerts'},
  double: {label:'Double agent', channel:'Alerts'},
  civilian: {label:'Civilian', channel:'Aid'},
  foreigner: {label:'Foreigner', channel:'Aid'}
};

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function idTag(text) {
  return el('small', 'nw-id', text);
}

// The two candidates in each case take opposite roles. The contact in
// parentheses belongs to that candidate regardless of which role they take.
const eventRoles = {
  dispute: [
    ['friend','Friend → aid recipient','The helper gives aid to their contact'],
    ['foe','Challenger → Foe','The challenger alerts the foe']
  ],
  inquiry: [
    ['spy','Subject → Spy → handler','The subject’s activity alerts the spy, who alerts the handler'],
    ['double','Double agent → secret recipient + handler','The double agent alerts both their contact and the handler']
  ],
  haven: [
    ['civilian','Protector → Civilian','The contact shelters the civilian'],
    ['foreigner','Request sender → Foreigner → host','The visitor carries their contact’s request to the host']
  ]
};

function sceneBoard(evidence) {
  const board = el('section','nw-scenes');
  board.setAttribute('aria-label','Cases and possible actions');
  board.append(el('p','nw-tip','Each pair splits its two roles. (Name) = personal contact.'));
  const groups = new Map();
  for (const scene of evidence.incidents) {
    if (!groups.has(scene.type)) {
      const group = el('section','nw-case-group');
      const rules = el('div','nw-rules');
      for (const [key, route, action] of eventRoles[scene.type]) {
        const {channel} = roles[key];
        const line = el('div','nw-rule nw-' + channel.toLowerCase());
        const sign = el('strong','nw-channel',channel);
        const flow = el('b','nw-flow',route);
        flow.title = action;
        line.append(sign,document.createTextNode(' '),flow);
        rules.append(line);
      }
      group.append(rules);
      groups.set(scene.type, group);
      board.append(group);
    }
    const row = el('div','nw-case');
    row.append(idTag(scene.id));
    for (const [i, name] of scene.members.entries()) {
      const person = el('span','nw-person');
      person.append(el('b','',name),el('span','nw-contact',' (' + scene.contacts[i] + ')'));
      row.append(document.createTextNode(' '),person);
    }
    if (scene.type === 'inquiry' || scene.type === 'haven') {
      const context = el('span','nw-context');
      context.append(el('span','',scene.type === 'inquiry' ? 'handler ' : 'host '),el('b','',scene.anchor));
      row.append(document.createTextNode(' '),context);
    }
    groups.get(scene.type).append(row);
  }
  return board;
}

function shortFact(fact) {
  const node = el('span','nw-fact');
  node.title = fact.text ?? fact.short;
  if (fact.incident && fact.kind !== 'link') node.append(idTag(fact.incident),document.createTextNode(' '));
  node.append(document.createTextNode(fact.short));
  return node;
}

function reportBoard(evidence) {
  const board = el('section','nw-reports');
  board.setAttribute('aria-label','Verified record and witnesses');
  board.append(el('p','nw-tip','Witnesses with the claimed role tell the truth. Impostors lie.'));
  const list = el('ul','nw-report-list');
  const sorted = [...evidence.reports].sort((a,b) => Number(b.kind === 'record') - Number(a.kind === 'record'));
  let witnessesStarted = false;
  for (const report of sorted) {
    if (!witnessesStarted && report.kind === 'witness') {
      const headers = el('li','nw-columns');
      headers.append(el('div','','Claimed role'), document.createTextNode(' '), el('div','','Witness says'));
      list.append(headers);
      witnessesStarted = true;
    }
    const record = report.kind === 'record';
    const entry = el('li','nw-report' + (record ? ' nw-record' : ''));
    if (report.source) {
      const source = el('div');
      if (record) {
        source.append(el('span','nw-flag','Verified'), document.createTextNode(' '),shortFact(report.source));
      } else {
        const witness = report.source;
        const credential = el('span','nw-who');
        credential.title = witness.text;
        credential.append(el('b','',witness.actor), document.createTextNode(' '), idTag(witness.incident),
          document.createTextNode(' '), el('span','',roles[witness.role].label));
        source.append(credential);
      }
      entry.append(source);
    }
    const claim = el('div', report.source ? '' : 'nw-single');
    if (record) claim.append(el('span','nw-flag','Verified'),document.createTextNode(' '));
    if (!record) claim.append(el('span','nw-sr',' says '));
    claim.append(shortFact(report.claim));
    entry.append(claim);
    list.append(entry);
  }
  board.append(list);
  return board;
}

export function renderNetwork(root, evidence) {
  const panel = el('div','network-view');
  const heading = el('header','nw-order');
  const question = el('h2');
  const words = evidence.order.split(/\b(aid(?:s|ed|ing)?|alert(?:s|ed|ing)?)\b/gi);
  for (const [i, word] of words.entries()) {
    if (i % 2 === 0) question.append(document.createTextNode(word));
    else question.append(el('span', /^aid/i.test(word) ? 'nw-aid-word' : 'nw-alert-word', word));
  }
  heading.append(question);
  const chains = {
    end: 'Never repeat a name or a case.',
    warning: 'Start in I1 or I2. Never repeat a name or a case.',
    aid: 'Start in H1 or H2. Never repeat a name or a case.',
    reach: 'Never repeat a name or a case.', return: 'Never repeat a name or a case.'
  };
  const note = chains[evidence.query] ?? (['betrayal','rescue'].includes(evidence.query) ? '' : 'Use two different cases.');
  if (note) heading.append(el('p','nw-tip',note));
  const content = el('div','nw-content');
  content.append(sceneBoard(evidence),reportBoard(evidence));
  panel.append(heading,content);
  root.replaceChildren(panel);
}

export function renderNetworkGuide(root) {
  const guide = el('div','network-guide');
  const sections = [
    ['Read the cases','The two people in each dispute split Friend and Foe. An inquiry pairs Spy and Double agent. A haven pairs Civilian and Foreigner. People can play different roles toward different contacts in other cases.'],
    ['Follow both actions','Both people contribute their role’s arrows in that case. An arrow shows who passes aid or an alert. A watched subject’s activity alerts the spy, who alerts the handler. A double agent alerts both their own contact and the handler. A foreigner carries someone’s request to a host.'],
    ['Identify the contact','Friend means the helper, whose contact receives the aid. A Foe’s contact is the challenger. A Spy’s contact is the watched subject. A Double agent’s contact is the secret recipient. A Civilian’s contact is the protector. A Foreigner is the visitor whose contact sent the request.'],
    ['Follow the evidence','A verified record is true. A report can name someone by a role in another case. Each witness presents a credential about their own act and makes a claim about another case. If their credential is genuine, their claim is true. If they claimed the other person’s role, their claim is false. You can reason from either end.'],
    ['Take the two shots','Use the resolved arrows to follow the order. For an alternating chain, alternate aid and alerts at each step. Never repeat a name or a case.']
  ];
  for (const [title,text] of sections) {
    const section = el('section');
    section.append(el('h3','',title),el('p','',text));
    guide.append(section);
  }
  const worked = el('section', 'nw-worked');
  worked.append(el('h3','','Worked example'));
  for (const [label,text] of [
    ['I1 candidates','Tess (Nia) and Samp (Sol).'],
    ['Record','D1 · Mira gave supplies to Pia.'],
    ['Witness','Ivo, the other D1 candidate, claims Friend. He says Tess watched Nia in I1.'],
    ['Deduction','Mira was the D1 Friend. Ivo lied, so Tess did not watch her contact Nia. That makes Samp the spy.']
  ]) {
    const line = el('p');
    line.append(el('b','',label), document.createTextNode(' · ' + text));
    worked.append(line);
  }
  guide.append(worked);
  root.replaceChildren(guide);
}

export function renderNetworkResult(root, trial, result) {
  const section = el('section','network-result');
  const reasons = winningNetworkRoutes(trial);
  const routes = el('ul','nw-winning');
  for (const reason of reasons) routes.append(el('li','',reason));
  section.append(el('h3','','Why ' + trial.pair.join(' and ')), routes);
  if (!result?.correct) {
    const wrong = result?.selected?.find(n => !trial.pair.includes(n));
    const conflict = explainNetworkConflict(trial, wrong);
    if (conflict) section.append(el('p','nw-conflict',conflict));
  }
  const list = el('div','nw-resolved');
  for (const scene of resolvedNetwork(trial)) {
    const row = el('div','nw-actual');
    row.append(idTag(scene.id));
    const details = el('div');
    for (const person of scene.assignments) {
      const line = el('p');
      line.append(el('b','',roles[person.role].label), document.createTextNode(' · ' + person.text));
      details.append(line);
    }
    row.append(details);
    list.append(row);
  }
  section.append(list);
  root.replaceChildren(section);
}
