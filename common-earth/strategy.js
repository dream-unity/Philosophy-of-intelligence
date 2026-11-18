/* Common Earth: allocation of local work and the transmission of civic knowledge.
   Read helpers use the passed site. Only action callbacks, protect and tick commit
   changes to it, so the weekly forecast can run the same rules on a detached world. */
(() => {
  'use strict';

  const ROLES = [
    {id:'pantry',name:'Food crews',resource:'food',units:2,lead:0},
    {id:'bench',name:'Repair crews',resource:'materials',units:1,lead:1},
    {id:'dispatch',name:'Exchange crews',resource:'funds',units:1,lead:2}
  ];
  const SCHOOLS = {
    larder:{
      name:'Community larder',role:0,facilities:['garden','wetland'],facility:'a garden or water commons',
      effect:'Banks up to 2 surplus food each week (capacity 6). With at least 3 in reserve, preserving the harvest adds 1 food to weekly production. Reserves top up household stocks toward 3 before shortages.',
      human:'A neighbour can draw on stores the district put aside in a better week.'
    },
    toolbank:{
      name:'Tool library',role:1,facilities:['workshop'],facility:'a repair workshop',
      effect:'Borrowing shared tools saves 1 material on every new district building.',
      human:'A building crew can borrow fittings and tools instead of buying another set.'
    },
    relay:{
      name:'Dispatch school',role:2,facilities:['market','pier'],facility:'a neighbourhood market or exchange depot',
      effect:'Adds room for 1 extra unit on each outgoing trade shipment, when the receiving district needs it.',
      human:'Two dispatchers can combine small loads without waiting for another shipment.'
    }
  };
  const ids=Object.keys(SCHOOLS);
  const GOAL=3;
  const STUDY_COST={funds:4,materials:2};
  const own=(obj,key)=>Object.hasOwn(obj,key);
  const nonnegativeInteger=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const exactSchool=key=>typeof key==='string' && ids.includes(key);
  const balanced=()=>({
    version:1,crew:[1,1,1],rotationWeek:0,rotations:0,learned:[],projects:{},studying:null,
    active:null,pending:null,reserve:0,history:[]
  });
  const read=site=>site.strategy || balanced();
  const write=site=>site.strategy || (site.strategy=balanced());
  function valid(s) {
    if(s==null)return true;
    if(!s || s.version!==1 || !Array.isArray(s.crew) || s.crew.length!==3 ||
       !s.crew.every(n=>nonnegativeInteger(n,3)) || s.crew.reduce((n,m)=>n+m,0)!==3 ||
       !nonnegativeInteger(s.rotationWeek) || !nonnegativeInteger(s.rotations,2) || !nonnegativeInteger(s.reserve,6) ||
       !Array.isArray(s.learned) || !s.learned.every(exactSchool) || new Set(s.learned).size!==s.learned.length ||
       !s.projects || typeof s.projects!=='object' || Array.isArray(s.projects)) return false;
    for(const [id,p] of Object.entries(s.projects)) {
      if(!exactSchool(id) || s.learned.includes(id) || !p || !nonnegativeInteger(p.lessons,GOAL-1) ||
         (p.guest!==null && typeof p.guest!=='string'))return false;
    }
    if(s.studying!==null && !own(s.projects,s.studying))return false;
    if(s.active!==null&&!s.learned.includes(s.active))return false;
    if(s.pending!==null && (!s.pending || !s.learned.includes(s.pending.id) || !nonnegativeInteger(s.pending.week)))return false;
    return Array.isArray(s.history) && s.history.length<=8 && s.history.every(item=>item && nonnegativeInteger(item.week) && typeof item.text==='string');
  }
  const hasFacility=(site,school)=>site.buildings.some(b=>school.facilities.includes(b.kind));
  const staffed=(site,school)=>read(site).crew[school.role]>0 && hasFacility(site,school);
  function pace(site,id) {
    const s=read(site),p=s.projects[id],school=SCHOOLS[id];
    if(!p || !school || !staffed(site,school))return 0;
    return Math.min(GOAL-p.lessons,2,s.crew[school.role]);
  }
  function rates(site) {
    const s=read(site),result={food:0,materials:0,funds:0};
    ROLES.forEach((role,i)=>{result[role.resource]=(s.crew[i]-1)*role.units;});
    if(s.reserve>=3 && enabled(site,'larder'))result.food++;
    if(s.studying){
      const school=SCHOOLS[s.studying];
      result[ROLES[school.role].resource]-=pace(site,s.studying);
    }
    return result;
  }
  function enabled(site,id) {
    return site.strategy?.active===id && staffed(site,SCHOOLS[id]);
  }
  const buildDiscount=site=>enabled(site,'toolbank')?1:0;
  const cargoBonus=site=>enabled(site,'relay')?1:0;
  function keep(s,week,text) {
    s.history.unshift({week,text});
    if(s.history.length>8)s.history.length=8;
    return text;
  }
  function addStock(site,key,n) {
    site[key]=Math.min(Number.MAX_SAFE_INTEGER,site[key]+n);
  }
  function returnReserve(site,s) {
    if(!s.reserve)return '';
    const amount=s.reserve;
    addStock(site,'food',amount);s.reserve=0;
    return ' Released '+amount+' banked food to the public pantry.';
  }
  // Called after any due freight/council settlements and before the shortage
  // check. A larder can move only food physically present in the district.
  function protect(site,production) {
    const s=site.strategy;
    if(!s)return [];
    if(!enabled(site,'larder')){
      const released=returnReserve(site,s);
      return released?[released.trim()]:[];
    }
    const projected=site.food+production.food;
    if(projected<3 && s.reserve>0){
      const n=Math.min(s.reserve,3-projected);
      s.reserve-=n;addStock(site,'food',n);
      return ['The community larder released '+n+' food before households collected their shares. The reserve now holds '+s.reserve+' food.'];
    }
    const bank=Math.max(0,Math.min(2,6-s.reserve,site.food,projected-9));
    if(bank) {
      site.food-=bank;s.reserve+=bank;
      return ['The food crew banked '+bank+' surplus food before trade. '+s.reserve+' of 6 reserve spaces are filled.'];
    }
    return [];
  }
  function switchSchool(site,s,id) {
    const release=s.active==='larder' && id!=='larder'?returnReserve(site,s):'';
    s.active=id;s.pending=null;
    return SCHOOLS[id].name+' is the district’s operating school.'+release;
  }
  function lead(site,school) {return site.residents[ROLES[school.role].lead];}
  function goodsLabel(n,name){return Math.abs(n)===1?({materials:'material',funds:'fund'}[name] || name):name;}
  function signed(n,name) {return (n>0?'+':'')+n+' '+goodsLabel(n,name);}
  function rotationsThisWeek(s,week){return s.rotationWeek===week?s.rotations:0;}
  function rotationText(s,week) {
    const n=rotationsThisWeek(s,week);
    if(!n)return 'One free crew move this week. Each extra food crew yields 2 food, each repair crew 1 material and each exchange crew 1 fund per week.';
    if(n===1)return 'The free weekly move is used. A second move costs 1 effort and 2 funds. The next weekly move is free.';
    return 'Both moves are used. The next free rotation opens next week.';
  }
  function studyGate(site,id) {
    const school=SCHOOLS[id],person=lead(site,school);
    if(!person.heard)return 'First listen to '+person.name+', who would lead the study.';
    if(!hasFacility(site,school))return 'Build '+school.facility+' for this study.';
    if(read(site).crew[school.role]===0)return 'Assign at least one '+ROLES[school.role].name.toLowerCase().replace('crews','crew')+' first.';
    return '';
  }
  function lessonText(site,id){
    const school=SCHOOLS[id],s=read(site),project=s.projects[id];
    if(!project)return 'Three lessons. One assigned crew completes one lesson per week, and two or three complete up to two. Each lesson diverts one '+({food:'food',materials:'material',funds:'fund'}[ROLES[school.role].resource])+' from weekly production.';
    if(id!==s.studying)return project.lessons+' of 3 lessons saved. The study is paused.';
    const next=pace(site,id),units=ROLES[school.role].resource;
    if(!next)return project.lessons+' of 3 lessons. Training is waiting for '+(read(site).crew[school.role]===0?'a '+ROLES[school.role].name.toLowerCase().replace('crews','crew'):school.facility)+'.';
    const left=GOAL-project.lessons;
    const weeks=Math.ceil(left/Math.min(2,s.crew[school.role]));
    return project.lessons+' of 3 lessons. At this roster the next weekly turn completes '+next+' and diverts '+next+' '+goodsLabel(next,units)+' from production. '+weeks+' weekly turn'+(weeks===1?'':'s')+' to finish.';
  }
  function gainBond(person) {
    const old=person.bond;
    person.bond=Math.min(10,old+1);
    return person.name+'’s bond '+(person.bond===old?'remained at '+old:'rose to '+person.bond);
  }
  function connected(world,source,target) {
    return world.routes.some(r=>r.from===source.id && r.to===target.id || r.to===source.id && r.from===target.id);
  }
  function rosterActions(world,site,add) {
    const s=read(site),used=rotationsThisWeek(s,world.week);
    for(let from=0;from<ROLES.length;from++){
      if(!s.crew[from])continue;
      for(let to=0;to<ROLES.length;to++){
        if(to===from)continue;
        const old=ROLES[from],next=ROLES[to];
        const hypothetical={...site,strategy:{...s,crew:[...s.crew]}};
        hypothetical.strategy.crew[from]--;hypothetical.strategy.crew[to]++;
        const before=rates(site),after=rates(hypothetical);
        const delta=Object.keys(before).filter(k=>after[k]!==before[k]).map(k=>signed(after[k]-before[k],k)).join(' · ');
        const effect=s.active && staffed(site,SCHOOLS[s.active])!==staffed(hypothetical,SCHOOLS[s.active]) ?
          ' '+SCHOOLS[s.active].name+(staffed(hypothetical,SCHOOLS[s.active])?' will operate.':' will be unstaffed.'):'';
        add('research','strategy:move:'+old.id+':'+next.id,'Move one crew from '+old.name.split(' ')[0].toLowerCase()+' to '+next.name.split(' ')[0].toLowerCase(),
          (delta||'No change in weekly output')+' per week with this roster.'+effect,
          {strategyKind:'roster',fromRole:old.id,toRole:next.id,effort:used===1?1:0,goods:used===1?{funds:2}:{},
            gate:used>=2?'The next free crew move is available next week.':''},
          ()=>{
            const d=write(site);d.crew[from]--;d.crew[to]++;
            if(d.rotationWeek!==world.week){d.rotationWeek=world.week;d.rotations=0;}
            d.rotations++;
            return keep(d,world.week,'One crew moved from '+old.name.toLowerCase().replace(' crews','')+' to '+next.name.toLowerCase().replace(' crews','')+'. '+(delta||'No change in output')+' per week.'+effect);
          });
      }
    }
  }
  function schoolActions(world,site,add) {
    const s=read(site);
    for(const id of ids){
      const school=SCHOOLS[id],person=lead(site,school);
      const meta={strategyKind:'study',school:id};
      if(s.learned.includes(id)){
        if(s.active===id || s.pending?.id===id)continue;
        const gate=studyGate(site,id);
        add('research','strategy:schedule:'+id,'Staff '+school.name.toLowerCase()+' next week',
          'The current practice operates for this weekly turn. Then '+school.name.toLowerCase()+' takes its place. '+school.effect,
          {...meta,effort:0,gate},()=>{
            const d=write(site);d.pending={id,week:world.week+1};
            return keep(d,world.week,'Scheduled '+school.name.toLowerCase()+' to take over at the end of the advance to week '+d.pending.week+'.');
          });
        add('research','strategy:activate:'+id,'Switch to '+school.name.toLowerCase()+' today',
          'Spend 1 effort and 2 funds to change the operating school immediately. '+school.effect,
          {...meta,effort:1,goods:{funds:2},gate},()=>{const d=write(site);return keep(d,world.week,switchSchool(site,d,id));});
        continue;
      }
      if(s.studying===id){
        add('research','strategy:pause','Pause '+school.name.toLowerCase(),
          'Return study time to regular production. Completed lessons and the original study fee are kept.',
          {...meta,effort:0},()=>{
            const d=write(site);d.studying=null;
            return keep(d,world.week,'Paused '+school.name.toLowerCase()+' at '+d.projects[id].lessons+' of 3 lessons.');
          });
        continue;
      }
      const existing=s.projects[id],gate=s.studying?'Pause or finish '+SCHOOLS[s.studying].name.toLowerCase()+' before starting another study.':studyGate(site,id);
      const text=(existing?'Continue with '+existing.lessons+' of 3 lessons already complete. ':'Research with '+person.name+'. ')+school.effect+' '+lessonText(site,id);
      add('research','strategy:study:'+id,(existing?'Resume ':'Study ')+school.name.toLowerCase(),text,
        {...meta,effort:existing?0:1,goods:existing?{}:{...STUDY_COST},gate},()=>{
          const d=write(site);d.studying=id;
          if(!d.projects[id])d.projects[id]={lessons:0,guest:null};
          return keep(d,world.week,person.name+' is leading '+school.name.toLowerCase()+'. '+lessonText(site,id));
        });
    }
    if(s.pending){
      add('research','strategy:hold','Keep the current operating school','Cancel the scheduled change to '+SCHOOLS[s.pending.id].name.toLowerCase()+'.',
        {strategyKind:'study',school:s.pending.id,effort:0},()=>{
          const d=write(site);d.pending=null;return keep(d,world.week,'The scheduled school change was withdrawn.');
        });
    }
  }
  function exchangeActions(world,site,add) {
    const s=read(site),id=s.studying;
    if(!id || s.projects[id].guest || s.projects[id].lessons>=GOAL-1)return;
    const school=SCHOOLS[id],student=lead(site,school);
    for(const other of world.sites){
      if(other.id===site.id || !connected(world,site,other) || !other.strategy?.learned.includes(id))continue;
      const teacher=lead(other,school);
      const gate=!staffed(other,school)?other.name+' needs a staffed '+school.name.toLowerCase()+' facility to offer a lesson.':'';
      add('research','strategy:guest:'+other.id,'Invite '+teacher.name+' from '+other.name,
        'A teaching exchange along the existing trade route adds one lesson now. The partner receives a 1-fund honorarium, and both mentors gain up to 1 bond.',
        {strategyKind:'exchange',school:id,targetId:other.id,effort:1,goods:{funds:1},gate},
        ()=>{
          const d=write(site),project=d.projects[id];project.guest=other.id;project.lessons++;
          addStock(other,'funds',1);
          const bonds=gainBond(teacher)+'. '+gainBond(student)+'.';
          const note=teacher.name+' shared a lesson with '+student.name+' over the route to '+site.name+'. '+other.name+' received the 1-fund honorarium.';
          keep(write(other),world.week,note);
          return keep(d,world.week,note+' '+project.lessons+' of 3 lessons completed. '+bonds);
        });
    }
  }
  function actions(world,site,add) {
    rosterActions(world,site,add);schoolActions(world,site,add);exchangeActions(world,site,add);
  }
  function tick(world,site) {
    const s=site.strategy;
    if(!s)return [];
    const notes=[];
    if(s.studying){
      const id=s.studying,school=SCHOOLS[id],person=lead(site,school),project=s.projects[id],done=pace(site,id);
      if(done){
        project.lessons+=done;
        if(project.lessons===GOAL){
          s.learned.push(id);delete s.projects[id];s.studying=null;
          let note=person.name+' completed '+school.name.toLowerCase()+'. ';
          if(!s.active)note+=switchSchool(site,s,id)+' '+school.human;
          else note+='Staff this school when the district is ready to change its practice.';
          notes.push(keep(s,world.week,note));
        }else notes.push(keep(s,world.week,person.name+' taught '+done+' lesson'+(done===1?'':'s')+' in '+school.name.toLowerCase()+'. '+project.lessons+' of 3 complete.'));
      }
    }
    if(s.pending && s.pending.week<=world.week){
      const id=s.pending.id;
      if(staffed(site,SCHOOLS[id]))notes.push(keep(s,world.week,switchSchool(site,s,id)));
      else {
        s.pending=null;
        notes.push(keep(s,world.week,'The change to '+SCHOOLS[id].name.toLowerCase()+' was deferred because its facility or crew was unavailable. The previous school remains in place.'));
      }
    }
    return notes;
  }
  function summary(world,site) {
    if(!site)return null;
    const s=read(site),yieldDelta=rates(site);
    const crews=ROLES.map((role,i)=>({id:role.id,name:role.name,count:s.crew[i],lead:site.residents[role.lead].name,
      yield:role.units+' '+goodsLabel(role.units,role.resource)+' per extra crew',delta:yieldDelta[role.resource]}));
    const schools=ids.map(id=>{
      const x=SCHOOLS[id],p=s.projects[id],on=s.active===id;
      const state=on?'operating':s.learned.includes(id)?'learned':s.studying===id?'studying':p?'paused':'unlearned';
      const status=on?staffed(site,x)?'Staffed and operating.':'Waiting for its facility and crew.':
        s.pending?.id===id?'Scheduled for the end of the advance to week '+s.pending.week+'.':
        p?lessonText(site,id):state==='learned'?'Ready to staff.':studyGate(site,id)||'Ready to study.';
      return {id,name:x.name,mentor:lead(site,x).name,facility:x.facility,effect:x.effect,state,status};
    });
    return {crews,schools,rotation:rotationText(s,world.week),active:s.active?SCHOOLS[s.active].name:null,
      study:s.studying?SCHOOLS[s.studying].name:null,lesson:s.studying?lessonText(site,s.studying):'One local study can run at a time.',
      reserve:s.reserve,last:s.history[0]?.text || null,
      charter:'Learned methods stay with the district. One learned school can operate at a time.'};
  }
  window.EarthStrategy=Object.freeze({actions,rates,protect,buildDiscount,cargoBonus,tick,summary,valid});
})();
