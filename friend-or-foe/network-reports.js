// Reports concern people and their contacts. A link binds the same person in
// two different incidents, for example, a spy who also received aid.
const partnerRoles = {friend:'foe', foe:'friend', spy:'double', double:'spy', civilian:'foreigner', foreigner:'civilian'};
const analystTerms = {
  friend:['helper','aid recipient'], foe:['foe','challenger'],
  spy:['spy','subject'], double:['double agent','secret recipient'],
  civilian:['civilian','protector'], foreigner:['visitor','request sender']
};
export const oppositeRole = role => partnerRoles[role];

function term(selector) {
  return selector.incident+'’s '+analystTerms[selector.role][selector.end==='actor'?0:1];
}
export function linkSentence(left,right,negated) {
  const subject = term(left);
  if (right.end === 'actor') return subject+(negated?' wasn’t ':' was ')+term(right)+'.';
  const object = right.incident+'’s '+analystTerms[right.role][0];
  const verb = {
    friend:negated?' didn’t receive aid from ':' received aid from ',
    foe:negated?' didn’t challenge ':' challenged ',
    spy:negated?' wasn’t watched by ':' was watched by ',
    double:negated?' wasn’t the secret recipient of ':' was the secret recipient of ',
    civilian:negated?' didn’t shelter ':' sheltered ',
    foreigner:negated?' didn’t send a request with ':' sent a request with '
  }[right.role];
  return subject+verb+object+'.';
}
export function resolveEndpoint(evidence,selector,world) {
  const index=evidence.incidents.findIndex(s=>s.id===selector.incident);
  const scene=evidence.incidents[index];
  const member=((world >> index)&1) ^ Number(selector.role!==scene.role);
  return (selector.end==='actor'?scene.members:scene.contacts)[member];
}
export function factHolds(evidence,fact,world) {
  if (fact.kind==='link') {
    return (resolveEndpoint(evidence,fact.left,world)===resolveEndpoint(evidence,fact.right,world))!==fact.negated;
  }
  const index=evidence.incidents.findIndex(scene=>scene.id===fact.incident);
  if(index<0)return false;
  const scene=evidence.incidents[index];
  const member=scene.members.indexOf(fact.actor);
  if(member<0 || fact.contact!==scene.contacts[member] || fact.anchor!==scene.anchor) return false;
  return fact.role === (member===((world >> index)&1) ? scene.role : oppositeRole(scene.role));
}
export function reportHolds(evidence,report,world) {
  const observed=factHolds(evidence,report.claim,world);
  if (report.kind==='record') return observed && (!report.source || factHolds(evidence,report.source,world));
  return factHolds(evidence,report.source,world)===observed;
}
export function explainReport(evidence,report,world) {
  const p=report.claim;
  if (p.kind==='link') {
    const a=resolveEndpoint(evidence,p.left,world), b=resolveEndpoint(evidence,p.right,world);
    const same=a===b;
    return same ? a+' was both '+term(p.left)+' and '+term(p.right)+'.' :
      term(p.left)+' was '+a+', while '+term(p.right)+' was '+b+'.';
  }
  return p.short+(factHolds(evidence,p,world)?' — true.':' — false.');
}
export function groundedFact(scene,role,member) {
  const actor=scene.members[member], contact=scene.contacts[member], anchor=scene.anchor;
  const text = {
    friend:actor+' helped '+contact, foe:contact+' challenged '+actor,
    spy:actor+' watched '+contact+' for '+anchor, double:actor+' briefed '+contact+' and '+anchor,
    civilian:contact+' sheltered '+actor, foreigner:actor+' took '+contact+'’s request to '+anchor
  }[role];
  return {incident:scene.id,actor,contact,anchor,role,text,short:text};
}
function oppositeFact(board, fact) {
  if (fact.kind === 'link') {
    const negated = !fact.negated;
    const text = linkSentence(fact.left, fact.right, negated);
    return {...fact, negated, text, short:text};
  }
  const scene = board.incidents.find(s => s.id === fact.incident);
  return groundedFact(scene, oppositeRole(fact.role), scene.members.indexOf(fact.actor));
}

// A false credential accompanied by a false statement is consistent for
// exactly the same assignments as its true-credential, true-statement twin.
// Vary both together so counting apparent liars cannot solve the last row.
export function varyTestimony(evidence, reports, draw = Math.random, mask = null) {
  return reports.map((report, index) => {
    if (report.kind !== 'witness') return report;
    const reverse = mask === null ? draw() < .5 : Boolean(mask & (1 << index));
    if (!reverse) return report;
    return {...report, source:oppositeFact(evidence, report.source), claim:oppositeFact(evidence, report.claim)};
  });
}
