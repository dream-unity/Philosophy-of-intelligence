(function(root){
  'use strict';
  function mount({sim,book,street,enterStreet,notify}){
    const domain=root.EarthMilitaryBase,field=root.EarthBaseField,doc=root.document;
    const bar=doc.getElementById('field-controls');
    if(!bar||!field)return null;
    const get=id=>doc.getElementById(id),el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
    const pointOf=(s,id)=>field.position(sim.state,s,id);
    const ready=()=>selection&&root.EarthCommunityLife.lookup(sim.state,selection.site);
    const name=u=>domain.units[u.type].name+' '+u.id;
    let selection=null,stamp='',busy=Promise.resolve(),repeat=0,refreshTimer=0,held='',pressedAt=0,slot='',generation=0;
    const ctx=()=>({selection,site:selection?.site,id:selection?.id,slot,generation});
    const current=k=>selection&&selection===k.selection&&k.slot===book.current().id&&k.generation===(ready()?.foundingRevision||0);
    const area=get('field-town');
    const quick=get('field-quick'),roster=get('field-roster');
    function run(q,after,key=ctx()){
      busy=busy.then(async()=>{
        if(!current(key))return;
        const s=ready(),result=await sim.perform('baseOrder',{site:s.id,generation:key.generation,version:domain.view(s).version||0,...q});
        if(!current(key))return;
        get('field-status').textContent=result.ok&&['driveTown','returnBase','reboard','boardParty','attackHere'].includes(q.action)?'':result.message;
        if(result.ok)after?.(result);else if(q.steer)release(false);
        stamp='';render();street()?.fieldRefresh?.();
      }).catch(()=>{if(current(key))get('field-status').textContent='This order could not be saved. Select the unit and try again.';});
      return busy;
    }
    function release(stop=true){
      if(!held)return false;
      clearTimeout(repeat);held='';
      if(stop&&selection)run({action:'stopField',id:selection.id});
      return true;
    }
    function clear(){
      if(!selection)return;
      release();clearTimeout(refreshTimer);if(roster.open)roster.close();quick.hidden=true;delete doc.body.dataset.fieldCommand;selection=null;stamp='';bar.hidden=true;street()?.showField?.(null);
    }
    function select(site,id,bring=true,destination='',ids=[id]){
      const s=root.EarthCommunityLife.lookup(sim.state,site),b=s&&domain.view(s);
      if(!b||id!=='truck'&&!b.units.some(u=>u.id===id))return;
      const mission=b.missions.find(m=>!m.manual&&m.ids.includes(id));
      if(mission){
        sim.perform('baseOrder',{site:s.id,generation:s.foundingRevision||0,version:b.version||0,action:'takeField',id}).then(result=>{
          if(result.ok)select(site,id,bring,destination);else notify(result.message,true);
        });return;
      }
      release();slot=book.current().id;generation=s.foundingRevision||0;
      if(roster.open)roster.close();
      selection={site,id,ids};stamp='';enterStreet();
      const stage=get('street-stage');if(bar.nextElementSibling!==stage)stage.before(bar);
      render();if(destination&&[...area.options].some(o=>o.value===destination))area.value=destination;
      get('field-status').textContent='';
      street()?.showField?.(selection,bring);
      const rect=bar.getBoundingClientRect();
      if(rect.top<0||stage.getBoundingClientRect().top+120>root.innerHeight)bar.scrollIntoView({block:'start',behavior:'instant'});
      if(bring)get('street-canvas')?.focus({preventScroll:true});
    }
    function render(){
      if(!selection)return;
      const s=ready(),b=s&&domain.view(s),id=selection.id,u=b?.units.find(v=>v.id===id);
      if(!s||(s.foundingRevision||0)!==generation||slot!==book.current().id||id!=='truck'&&!u||doc.body.dataset.mapView!=='street'||
         doc.body.hasAttribute('data-district-crossing')||doc.body.hasAttribute('data-observing-town')){clear();return;}
      bar.hidden=false;quick.hidden=false;doc.body.dataset.fieldCommand='';
      const towns=domain.towns(sim.state),truck=id==='truck',at=pointOf(s,'truck'),p=pointOf(s,id);
      const group=selection.ids.length>1;
      const riders=b.units.filter(v=>v.aboard),incoming=b.units.filter(v=>v.boarding);
      const place=field.townAt(sim.state,s,p),local=place&&place.id!==s.id?place:null;
      const combat=b.missions.find(m=>m.fireAt!=null&&m.target===local?.id);
      const battle=combat&&domain.battle(sim.state,s,combat);
      const target=towns.find(t=>t.id===(b.departure?.target||b.truck?.target));
      const again=truck&&b.units.some(v=>b.lastDrop?.includes(v.id)&&!v.aboard&&!v.boarding);
      const canAttack=local&&!at.moving&&!b.departure&&domain.attackParty(sim.state,s,local)
        .some(v=>truck||selection.ids.includes(v.id));
      clearTimeout(refreshTimer);
      if(at.moving||p.moving||incoming.length||battle)refreshTimer=setTimeout(render,250);
      const key=[s.id,id,b.version,sim.state.regionalWorld?.step,p.moving,at.moving,place?.id,battle?.health,
        canAttack,towns.map(t=>t.id+t.name)].join('/');
      if(key===stamp)return;stamp=key;
      const title=truck?'Military truck':group?selection.ids.length+' soldiers selected':name(u);
      get('field-name').textContent=title+' · '+s.name;
      get('field-selection').textContent=truck?title+' · '+riders.length+' aboard':title;
      const destination=target?.name||'the selected point';
      let detail=truck?(at.moving?'Driving to '+destination:b.departure?'Picking up '+incoming.length+' for '+destination:
        place?'Parked at '+place.name:'Parked between towns'):group?'Tap the truck to board this group.':field.status(sim.state,s,u);
      if(truck&&!at.moving&&!b.departure&&incoming.length)detail+=' · '+incoming.length+' coming to board';
      if(battle)detail+=' · '+local.name+' base defence '+battle.health+' / '+combat.defence;
      else if(local&&b.log[0]?.text&&/captured the military base|repelled the attack/.test(b.log[0].text))detail+=' · '+b.log[0].text;
      get('field-detail').textContent=detail;
      const old=area.value;
      area.replaceChildren(...towns.map(t=>{const o=el('option',t.name);o.value=t.id;return o;}));
      area.value=towns.some(t=>t.id===old)?old:(b.missions.find(m=>m.manual&&m.phase==='awaiting')?.target||target?.id||towns.find(t=>t.id!==s.id)?.id||s.id);
      area.hidden=!truck;get('field-go').hidden=!truck;get('field-go').disabled=!b.units.some(field.personnel);
      get('field-return').hidden=!truck;get('field-return').disabled=!b.units.some(field.personnel);
      get('field-truck').hidden=truck;
      get('field-stop').hidden=group||!(p.moving||truck&&b.departure);
      get('field-board').hidden=truck||(!group&&u.aboard);
      get('field-board').textContent=group?'Board '+selection.ids.length+' soldiers':u?.boarding?'Walking to truck':'Board truck';
      get('field-board').disabled=at.moving||!!b.departure||(!truck&&!field.canBoard(sim.state,b,u));
      get('field-roster-open').hidden=!truck||at.moving||!!b.departure||again||
        !b.units.some(v=>field.personnel(v)&&field.canBoard(sim.state,b,v));
      get('field-reboard').hidden=!again||at.moving||!!b.departure;
      get('field-unload').hidden=at.moving||!!b.departure||(truck?!riders.length:group||!u.aboard);
      get('field-unload').textContent=truck?'Drop off':'Disembark';
      const attack=get('field-attack');attack.hidden=!canAttack;
      if(canAttack){attack.textContent='Attack '+local.name;attack.dataset.town=local.id;}
      if(truck&&!b.units.some(field.personnel))get('field-detail').textContent=detail+' · Enlist a guard to drive.';
    }
    function move(areaId,point,steer=false){
      const s=ready();if(!s)return false;
      const b=domain.view(s),id=selection.id;
      if(selection.ids.length>1){get('field-status').textContent='Tap the military truck to board the selected soldiers.';return true;}
      if(id==='truck'&&steer&&!b.driver||b.units.find(u=>u.id===id)?.aboard){
        get('field-status').textContent=id==='truck'?'Choose a town and tap Drive. A soldier will take the wheel.':'Select the truck to drive, or disembark to walk.';return true;
      }
      run({action:'moveField',id,area:areaId,point,steer},()=>street()?.followField?.());return true;
    }
    function steer(direction,hold){
      if(!selection)return false;
      if(selection.ids.length>1)return true;
      if(held===direction&&hold)return true;
      release(false);
      const vectors={up:[0,1],down:[0,-1],left:[-1,0],right:[1,0]},v=vectors[direction];
      if(!v)return false;
      const k=ctx();
      function step(){
        if(!current(k))return;
        const s=ready(),p=pointOf(s,k.id),length=k.id==='truck'?.075:.024;
        move(s.id,{x:p.x+v[0]*length,y:p.y+v[1]*length},true);
        if(hold)busy.then(()=>{if(held===direction&&current(k))repeat=setTimeout(step,450);});
      }
      if(hold){held=direction;pressedAt=performance.now();}step();return true;
    }
    function travelTo(town){
      run({action:'driveTown',target:town},()=>street()?.followField?.());return true;
    }
    get('field-done').onclick=clear;
    get('field-go').onclick=()=>travelTo(area.value);
    get('field-return').onclick=()=>run({action:'returnBase'},()=>street()?.followField?.());
    get('field-reboard').onclick=()=>run({action:'reboard'});
    get('field-attack').onclick=()=>{
      const target=get('field-attack').dataset.town;
      run({action:'attackHere',target,...(selection.id==='truck'?{}:{ids:selection.ids})});
    };
    get('field-stop').onclick=()=>{release(false);run({action:'stopField',id:selection.id});};
    function boardSelected(){
      const {site,ids}=selection;
      run({action:'boardParty',ids},()=>select(site,'truck',false));
    }
    function tapActor(site,id){
      if(id==='truck'&&selection?.site===site&&selection.id!=='truck'&&
          !get('field-board').hidden&&!get('field-board').disabled){boardSelected();return;}
      select(site,id,false);
    }
    function selectParty(site,ids){
      const s=root.EarthCommunityLife.lookup(sim.state,site),b=s&&domain.view(s);
      if(!b)return;
      const wanted=new Set(ids),party=b.units.filter(u=>wanted.has(u.id)&&field.personnel(u)&&field.canBoard(sim.state,b,u));
      if(party.length)select(site,party[0].id,false,'',party.map(u=>u.id));
    }
    get('field-board').onclick=boardSelected;
    const list=get('field-roster-list'),all=get('field-all'),call=get('field-call');
    function countChecked(){
      const rows=list.querySelectorAll('input'),checked=Array.from(rows).filter(box=>box.checked).length;
      all.checked=!!checked&&checked===rows.length;all.indeterminate=!!checked&&checked<rows.length;
      all.disabled=!rows.length;call.disabled=!checked;call.textContent='Board selected ('+checked+')';
    }
    get('field-roster-open').onclick=()=>{
      const s=ready(),b=domain.view(s);
      get('field-roster-town').textContent=s.name+' military truck';
      const party=b.units.filter(u=>field.personnel(u)&&field.canBoard(sim.state,b,u));
      list.replaceChildren(...party.map(u=>{
        const label=el('label'),box=el('input');box.type='checkbox';box.value=u.id;
        label.className='base-unit';label.append(box,name(u));return label;
      }));
      if(!party.length)list.append(el('p','No soldiers are available to board.'));
      countChecked();roster.showModal();
    };
    list.onchange=countChecked;
    all.onchange=()=>{for(const box of list.querySelectorAll('input'))box.checked=all.checked;countChecked();};
    call.onclick=()=>{
      const ids=Array.from(list.querySelectorAll('input:checked'),box=>Number(box.value));
      roster.close();run({action:'boardParty',ids});
    };
    get('field-unload').onclick=()=>run({action:'unload',id:selection.id});
    get('field-truck').onclick=()=>select(selection.site,'truck');
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)release();});root.addEventListener('blur',()=>release());
    // One wake-up for the next arrival, even if the player closes the field controls.
    let arrivalTimer=0;
    function scheduleBoarding(){
      clearTimeout(arrivalTimer);
      const world=sim.state,time=root.EarthDayClock.now(world),rate=root.EarthDayClock.read(world).rate;
      let earliest=Infinity,town=null,action='';
      const consider=(s,due,command)=>{if(due<earliest){earliest=due;town=s;action=command;}};
      for(const s of domain.towns(world)){
        const b=s.militaryBase;if(!b)continue;
        for(const u of b.units)if(u.boarding)consider(s,u.field.route.at+u.field.route.ms,'finishBoarding');
        for(const m of b.missions)if(m.fireAt!=null)consider(s,domain.battle(world,s,m).end,'settleCombat');
      }
      if(!town||sim.hasDiverged||sim.newerSaveText)return;
      const slotId=book.current().id,site=town.id,gen=town.foundingRevision||0;
      arrivalTimer=setTimeout(async()=>{
        if(slotId===book.current().id){
          const result=await sim.perform('baseOrder',{site,generation:gen,action});
          if(!result.ok){arrivalTimer=setTimeout(scheduleBoarding,1000);return;}
          street()?.fieldRefresh?.();
        }
        scheduleBoarding();
      },Math.max(150,Math.ceil((earliest-time)/rate)));
    }
    sim.subscribe(()=>{scheduleBoarding();render();});scheduleBoarding();
    function vehicle(){
      if(!selection)return false;
      const id=selection.id!=='truck'?'field-board':!get('field-reboard').hidden?'field-reboard':!get('field-unload').hidden?'field-unload':'field-roster-open';
      const b=get(id);if(!b.hidden&&!b.disabled)b.click();return true;
    }
    return {select,selectParty,tapActor,travelTo,clear,render,move,steer,release,vehicle,releaseDirection:dir=>{if(held===dir)release(performance.now()-pressedAt>130);},selected:()=>selection};
  }
  root.EarthBaseFieldUI={mount};
})(globalThis);
