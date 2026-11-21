(function(root){
  'use strict';
  function mount({book,sim,street,enterStreet,field,notify}){
    const domain=root.EarthMilitaryBase,doc=root.document,dialog=doc.getElementById('military-base');
    if(!domain||!dialog)return null;
    const host=doc.getElementById('base-interface');
    const el=(tag,content,cls)=>{const e=doc.createElement(tag);if(content!=null)e.textContent=content;if(cls)e.className=cls;return e;};
    const option=(value,text)=>{const e=el('option',text);e.value=value;return e;};
    const btn=(text,act,key)=>{const b=el('button',text);b.type='button';if(key)b.dataset.key=key;b.onclick=act;return b;};
    const select=(name)=>{const e=el('select');e.setAttribute('aria-label',name);return e;};
    const quantity=([k,n])=>n+' '+(n===1&&k==='materials'?'material':n===1&&k==='funds'?'fund':k);
    const cost=c=>Object.entries(c).filter(([,n])=>n).map(quantity).join(' · ');
    const names={roster:'Barracks',research:'Research',ops:'Operations',time:'Time machine'};
    const baseSelect=select('Command a town base'),storeLine=el('p',null,'base-stores'),portrait=el('canvas'),caption=el('div');
    portrait.width=340;portrait.height=193;portrait.setAttribute('aria-hidden','true');
    const visit=btn('Walk to east gate',()=>{
      const town=site();if(!town||town.id!==sim.active()?.id)return;
      dialog.close();enterStreet();const s=street();
      if(s?.getState().mode==='drive')s.toggleVehicle();
      if(!s?.focusVenue('militaryBase',root.EarthAgency?.actorId(town)||'steward',()=>open(town.id)))notify('Reach the east gate on foot to enter the base.',true);
    },'gate');
    const art=el('div',null,'base-hero');art.append(portrait,caption);
    const nav=el('nav',null,'base-tabs');nav.setAttribute('aria-label','Base departments');
    const content=el('section',null,'base-section'),status=el('p',null,'base-status');status.setAttribute('role','status');
    host.append(baseSelect,art,storeLine,nav,content,status);
    let townId='',tab='roster',key='',pending=false,target='',order='attack',picked=new Set(),known=[],ticket=0,slotId='';
    const site=()=>root.EarthCommunityLife.lookup(sim.state,townId);
    const roster=(b,id)=>b.units.find(u=>u.id===id);
    const unitName=u=>u&&domain.units[u.type]?domain.units[u.type].name+' '+u.id:'Unit';
    function buttonRow(list,name,detail,action){
      const row=el('div',null,'base-row'),copy=el('div');copy.append(el('strong',name),el('p',detail));row.append(copy,action);list.append(row);
    }
    async function action(q){
      if(pending)return;
      const s=site();if(!s)return;
      pending=true;
      try{
        const result=await sim.perform('baseOrder',{site:s.id,generation:s.foundingRevision||0,version:domain.view(s).version||0,...q});
        status.textContent=result.ok&&q.action==='returnBase'?'Recall ordered. Open the truck to see its location.':result.message;
        if(result.ok&&q.action==='dispatch')picked.clear();
      }finally{pending=false;paint(true);}
    }
    function showTab(id){tab=id;status.textContent='';paint(true);if(tab==='time')loadMoments();}
    for(const [id,name] of Object.entries(names))nav.append(btn(name,()=>showTab(id),id));
    baseSelect.onchange=()=>open(baseSelect.value);
    function open(id){
      const t=root.EarthCommunityLife.lookup(sim.state,id||sim.active()?.id);if(!t)return;
      townId=t.id;tab='roster';key='';slotId=book?.current().id;target='';order='attack';known=[];ticket++;picked.clear();status.textContent='';
      if(!dialog.open)dialog.showModal();paint(true);
    }
    function enlist(s,b){
      const list=el('div',null,'base-list');
      for(const [id,u] of Object.entries(domain.units)){
        if(u.tech&&!b.tech.includes(u.tech))continue;
        const a=btn(u.tech?'Build '+u.name.toLowerCase():'Enlist '+u.name.toLowerCase(),()=>action({action:'enlist',type:id}),'buy-'+id);
        a.disabled=!domain.affordable(sim.state,s,u.cost);buttonRow(list,u.name,cost(u.cost)+' · '+u.detail,a);
      }
      content.append(el('h3','Recruit and commission'),list);
      const find=(id)=>{dialog.close();field?.select(s.id,id);};
      const transport=el('div',null,'base-unit-controls');
      transport.append(btn('Find truck on map',()=>find('truck'),'field-truck'));
      const back=btn('Call back truck with all soldiers',()=>action({action:'returnBase'}),'return-base');
      back.disabled=!b.units.some(root.EarthBaseField.personnel);transport.append(back);
      const row=el('div');buttonRow(row,'Military truck','Choose a town and tap Drive. A soldier takes the wheel.',transport);
      content.prepend(row);
      if(!b.units.length){content.append(el('p','New recruits gather beside the truck at the east gate.'));return;}
      const garrison=el('div');content.append(el('h3','Base roster'),garrison);
      const available=new Set(domain.ready(sim.state,s).map(u=>u.id));
      for(const u of b.units){
        const free=available.has(u.id),mission=b.missions.find(m=>m.ids.includes(u.id));
        const state=mission?domain.orders[mission.order]+' · '+(mission.phase==='awaiting'?'awaiting manual transport':mission.phase):u.ready>(sim.state.regionalWorld?.step||0)?'Recovering':root.EarthBaseField.status(sim.state,s,u);
        const drill=btn(u.grade===3?'Fully trained':'Drill',()=>action({action:'train',id:u.id}),'train-'+u.id);
        drill.disabled=!free||u.grade>=3||!domain.affordable(sim.state,s,{food:1,funds:2});
        const controls=el('div',null,'base-unit-controls');
        const locate=btn(mission&&!mission.manual?'Take field command':'Select on map',()=>find(u.id),'field-'+u.id);
        controls.append(locate,drill);drill.disabled||=!!u.aboard||!!u.field&&root.EarthBaseField.moved(sim.state,s,u.id);
        buttonRow(garrison,unitName(u),state+' · Level '+u.grade+(u.grade<3?' · Drill costs 1 food and 2 funds':''),controls);
      }
    }
    function lab(s,b){
      content.append(el('h3','Research workshop'));
      for(const [id,r] of Object.entries(domain.research)){
        const done=b.tech.includes(id),go=btn(done?'Completed':r.name==='Flight research'?'Research flight':'Research '+r.name,()=>action({action:'research',type:id}),'research-'+id);
        go.disabled=done||!domain.affordable(sim.state,s,r.cost);buttonRow(content,r.name,(done?'':cost(r.cost)+' · ')+r.detail,go);
      }
    }
    function operations(w,s,b,towns){
      const available=domain.ready(w,s),ids=new Set(available.map(u=>u.id));
      picked=new Set([...picked].filter(id=>ids.has(id)));
      const group=el('fieldset');group.append(el('legend','Select the units to deploy'));
      const boxes=[];
      for(const u of available){
        const line=el('label',null,'base-unit'),check=el('input');check.type='checkbox';check.checked=picked.has(u.id);
        check.dataset.key='pick-'+u.id;check.onchange=()=>{if(check.checked)picked.add(u.id);else picked.delete(u.id);review();};
        boxes.push({id:u.id,check});
        line.append(check,doc.createTextNode(unitName(u)+' · Level '+u.grade));group.append(line);
      }
      if(available.length>=2){
        const quick=el('div',null,'base-unit-controls');
        quick.append(
          btn('Select all ready',()=>{for(const b of boxes){picked.add(b.id);b.check.checked=true;}review();},'pick-all'),
          btn('Clear selection',()=>{picked.clear();for(const b of boxes)b.check.checked=false;review();},'pick-none')
        );
        group.append(quick);
      }
      if(!available.length)group.append(el('p','Enlist a unit in the barracks to send your first expedition.'));
      const other=towns.filter(t=>t.id!==s.id),targets=select('Mission destination'),choice=select('Mission order');
      for(const t of other)targets.append(option(t.id,t.name));target=other.some(t=>t.id===target)?target:other[0]?.id||'';targets.value=target;
      for(const [id,label] of Object.entries(domain.orders))choice.append(option(id,label));choice.value=order;
      const note=el('p'),send=btn('',()=>action({action:'dispatch',order,target,ids:[...picked]}),'dispatch');
      function review(){
        const t=other.find(t=>t.id===target),war=t&&root.EarthBorderConflict.relation(w,s.id,t.id)?.state==='war';
        note.textContent=order==='attack'?(war?'These communities are at war.':'Preparing this attack declares war on this town.'):
          order==='assist'?(war?'Negotiate peace before reinforcing this town.':'The group will stay at this base until recalled.'):'The group will report the town’s defence after you deliver it.';
        note.textContent+=' Board the selected units, choose the town, tap Drive and drop them off.';
        send.textContent='Prepare '+domain.orders[order].toLowerCase()+(t?' · '+t.name:'');send.disabled=!picked.size||!t||order==='assist'&&war;
      }
      targets.onchange=()=>{target=targets.value;review();};choice.onchange=()=>{order=choice.value;review();};
      const label=(name,node)=>{const wrap=el('label',name,'base-field');wrap.append(node);return wrap;};
      content.append(group,label('Destination',targets),label('Orders',choice),note,send);review();
      if(b.missions.length)content.append(el('h3','Active expeditions'));
      for(const m of b.missions){
        const dest=domain.towns(w).find(t=>t.id===m.target),back=btn(m.manual?'End assignment':'Recall',()=>action({action:'recall',id:m.id}),'recall-'+m.id);
        back.disabled=m.phase==='returning';
        const unitList=m.ids.map(id=>roster(b,id)).filter(Boolean).map(unitName).join(', ')||(m.ids.length+' units');
        buttonRow(content,domain.orders[m.order]+' · '+(dest?.name||'Former town'),unitList+' · '+(m.phase==='awaiting'?'Awaiting manual transport':m.phase),back);
        if(m.manual&&m.phase==='awaiting')content.append(btn('Find transport truck',()=>{dialog.close();field?.select(s.id,'truck',true,m.target);},'transport-'+m.id));
      }
      const incoming=domain.incoming(w,s.id);
      if(incoming.length){
        content.append(el('h3','Incoming groups'));
        for(const {site,mission:m} of incoming)content.append(el('p',site.name+' · '+domain.orders[m.order]+' · '+m.ids.length+' units · '+m.phase));
      }
      const auto=s.militaryBase?b.autonomous:s.id!==w.communityLife.homeId;
      buttonRow(content,'Base command',auto?'The council may spend surplus stores and deploy units.':'You direct spending and deployments.',
        btn(auto?'Take command':'Let town command',()=>action({action:'autonomy',enabled:!auto}),'authority'));
      if(b.log.length){const log=el('ul');for(const r of b.log.slice(0,6))log.append(el('li','Week '+r.week+' · '+r.text));content.append(el('h3','Base log'),log);}
    }
    async function loadMoments(){
      const query=++ticket;const list=await book?.moments?.();if(query!==ticket||!dialog.open||tab!=='time')return;
      known=list||[];paint(true);
    }
    function timeRoom(s,b){
      content.append(el('h3','Time machine'));
      if(!b.tech.includes('time')){
        content.append(el('p','The time lab records history. Research a time machine to open an earlier moment as a new playable world.'),
          btn('Go to research',()=>showTab('research'),'to-lab'));return;
      }
      content.append(el('p','Open the first recorded moment, a recent week or a pre-deployment checkpoint. You can also record three moments of your choosing. Your current timeline will remain in Saved worlds.'));
      if(book?.temporaryMoments)content.append(el('p','This browser keeps recorded moments for this tab only.'));
      content.append(btn('Record this moment',async()=>{
        if(pending)return;pending=true;
        try{const res=await book.markMoment(townId);status.textContent=res.message;}finally{pending=false;loadMoments();}
      },'mark'));
      for(const m of known)buttonRow(content,m.title,'Week '+m.week+' · '+m.label,btn('Open this timeline',async()=>{
        if(pending)return;pending=true;
        try{
          const result=await book.rewind(townId,m);if(result.ok){dialog.close();notify(result.message);}else status.textContent=result.message;
        }finally{pending=false;}
      },'rewind-'+m.bucket));
    }
    function paint(force=false){
      if(!dialog.open)return;
      const w=sim.state,s=site();if(!s||book&&book.current().id!==slotId){dialog.close();return;}
      const b=domain.view(s),towns=domain.towns(w),clock=root.EarthDayClock.read(w);
      const next=[townId,s.foundingRevision,w.actionRevision,w.regionalWorld?.step,clock.night,tab].join('/');
      if(!force&&next===key)return;key=next;
      const focus=doc.activeElement?.dataset.key,scrolled=dialog.scrollTop;
      if(baseSelect.options.length!==towns.length||[...baseSelect.options].some((o,i)=>o.value!==towns[i].id||o.text!==towns[i].name))
        baseSelect.replaceChildren(...towns.map(t=>option(t.id,t.name)));
      baseSelect.value=s.id;
      const occupied=root.EarthCommunityLife.lookup(w,s.communityLife?.border?.occupiedBy);
      caption.replaceChildren(el('h3',s.name),el('p',occupied?'Occupied by '+occupied.name:b.units.length+(b.units.length===1?' unit':' units')+' · '+b.missions.length+(b.missions.length===1?' expedition':' expeditions')));
      visit.hidden=s.id!==sim.active()?.id;caption.append(visit);
      const ctx=portrait.getContext('2d');if(ctx){ctx.clearRect(0,0,340,193);root.EarthBaseArt?.draw(ctx,170,119,30,clock.night,s.water);root.EarthBaseArt?.inventory(ctx,170,119,30,domain.parked(s));}
      storeLine.textContent='Available town stores · '+Object.entries(domain.balance(w,s)).map(quantity).join(' · ');
      for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.key===tab));
      content.replaceChildren();if(tab==='roster')enlist(s,b);else if(tab==='research')lab(s,b);else if(tab==='ops')operations(w,s,b,towns);else timeRoom(s,b);
      if(focus)host.querySelector('[data-key="'+focus+'"]')?.focus({preventScroll:true});dialog.scrollTop=scrolled;
    }
    sim.subscribe(()=>paint());return {open};
  }
  root.EarthBaseUI={mount};
})(globalThis);
