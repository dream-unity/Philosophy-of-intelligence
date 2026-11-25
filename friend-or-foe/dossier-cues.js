import {caseRoles} from './duty-wheels.js';

const roleKey = {
  friend: ['Fr', 'Friend'], foe: ['Fo', 'Foe'], spy: ['Sp', 'Spy'],
  double: ['Da', 'Double agent'], civilian: ['Ci', 'Civilian'], foreigner: ['Fg', 'Foreigner']
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badge(role) {
  const [code, label] = roleKey[role];
  const token = el('span', 'ds-badge ds-' + role, code);
  token.title = label;
  token.setAttribute('aria-label', label);
  return token;
}

function legend() {
  const key = el('dl', 'ds-legend');
  key.setAttribute('aria-label', 'Role key');
  for (const [role, [, label]] of Object.entries(roleKey)) {
    const entry = el('div');
    const term = el('dt');
    term.append(badge(role));
    entry.append(term, el('dd', '', label));
    key.append(entry);
  }
  return key;
}

function crewStrip(crew, i) {
  const section = el('section', 'ds-crew');
  const name = 'Crew ' + (i === 0 ? 'A' : 'B');
  section.append(el('h3', '', name));
  const lines = el('div', 'ds-wheel');
  for (const [isDuty, data] of [[false, crew.names], [true, crew.stations]]) {
    const line = el('ol', 'ds-track ' + (isDuty ? 'ds-duties' : 'ds-names'));
    line.setAttribute('aria-label', name + (isDuty ? ' clockwise duties, unknown starting name' : ' clockwise names'));
    for (const value of data) {
      const stop = el('li');
      if (isDuty) {
        const station = el('span', 'ds-station');
        for (const [index, role] of value.entries()) {
          if (index) station.append(el('span', 'ds-plus', '+'));
          station.append(badge(role));
        }
        stop.append(station);
      } else {
        stop.textContent = value;
      }
      line.append(stop);
    }
    lines.append(line);
  }
  section.append(lines);
  return section;
}

function pathCell({from, to, role}) {
  const td = el('td');
  const path = el('span', 'ds-path');
  path.append(el('strong', '', from), el('span', 'ds-arrow', '→'), el('strong', '', to), badge(role));
  path.setAttribute('aria-label', from + ' clockwise to ' + to + ', passes ' + roleKey[role][1]);
  td.append(path);
  return td;
}

function reportTable(reports) {
  const table = el('table', 'ds-reports');
  table.setAttribute('aria-label', 'Compare whether these clockwise routes pass the indicated role');
  const head = table.createTHead().insertRow();
  for (const label of ['Crew A route', 'Link', 'Crew B route']) {
    const cell = el('th', '', label);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  for (const {paths, same} of reports) {
    const row = body.insertRow();
    const sign = el('td', 'ds-sign ' + (same ? 'ds-agree' : 'ds-split'), same ? '=' : '≠');
    sign.setAttribute('aria-label', same ? 'both pass or neither passes' : 'exactly one passes');
    row.append(pathCell(paths[0]), sign, pathCell(paths[1]));
  }
  return table;
}

export function renderDossier(root, trial) {
  const panel = el('div', 'dossier-cues');
  const order = el('div', 'ds-order');
  order.append(el('h2', '', trial.order), el('p', '', 'Both rows wrap. Which name holds each crew’s first duty?'));
  const crews = el('div', 'ds-crews');
  trial.crews.forEach((crew, i) => crews.append(crewStrip(crew, i)));
  const reports = el('section', 'ds-evidence');
  reports.append(el('p', 'ds-question', 'Does each route pass its marked role?'), reportTable(trial.reports),
    el('p', 'ds-read', 'Skip start, include end.  = both or neither · ≠ one.'));
  panel.append(order, crews, reports, legend());
  root.replaceChildren(panel);
}

export function renderDossierGuide(root) {
  const guide = el('div', 'dossier-guide');
  const steps = [
    ['Find the shared job', 'Each crew has five names in a clockwise loop, with six roles spread over five stops. Two roles printed together belong to one person. Find that person in each crew.'],
    ['Slide the duties', 'The names and duty stops each keep their printed order. The first duty could line up with any name. Each crew has its own starting position.'],
    ['Trace a report', 'Follow each route clockwise. Skip the starting name and include the ending name. A route passes its role if any visited person holds it. Wrap from the last name back to the first.'],
    ['Compare both routes', 'The equals sign means both routes pass their printed roles, or neither does. The crossed equals sign means exactly one passes. Keep the starting positions that fit every report.']
  ];
  for (const [title, text] of steps) {
    const section = el('section');
    section.append(el('h3', '', title), el('p', '', text));
    guide.append(section);
  }
  const example = el('section', 'ds-example');
  example.append(el('h3', '', 'One report'),
    reportTable([{paths:[{from:'Mira', to:'Sol', role:'friend'}, {from:'Ivo', to:'Tess', role:'spy'}], same:false}]),
    el('p', '', 'If Mira’s route passes Friend, Ivo’s route must miss Spy. If Mira’s route misses Friend, Ivo’s must pass Spy.'));
  guide.append(example);
  root.replaceChildren(guide);
}

export function renderResolvedDossier(root, trial) {
  const roles = caseRoles(trial);
  const table = el('table', 'ds-resolved');
  const head = table.createTHead().insertRow();
  for (const label of ['Role', 'Crew A', 'Crew B']) {
    const cell = el('th', '', label);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  for (const [key, [, label]] of Object.entries(roleKey)) {
    const row = body.insertRow();
    const role = el('th');
    role.scope = 'row';
    role.append(badge(key), el('span', '', label));
    row.append(role, ...roles[key].map(name => el('td', '', name)));
  }
  root.replaceChildren(table);
}
