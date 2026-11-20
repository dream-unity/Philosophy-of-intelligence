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
    const ctx=()=>({site:selection?.site,id:selection?.id,slot,generation});
    const current=k=>selection&&k.site===selection.site&&k.id===selection.id&&k.slot===book.current().id&&k.generation===(ready()?.foundingRevision||0);
    const area=get('field-town'),drivers=get('field-driver');
    function run(q,after,key=ctx()){
      busy=busy.then(async()=>{
        if(!current(key))return;
        const s=ready(),result=await sim.perform('baseOrder',{site:s.id,generation:key.generation,version:domain.view(s).version||0,...q});
        if(!current(key))return;
        get('field-status').textContent=result.message;
        if(result.ok)after?.();else if(q.steer)release(false);
        stamp='';render();street()?.fieldRefresh?.();
      }).catch(()=>{if(current(key))get('field-status').textContent='This order could not be saved. Select the unit and try again.';});
      return busy;
    }
    function release(stop=true){
      if(!held)return false;
      const pedal=held==='pedal';clearTimeout(repeat);held='';
      if(stop&&selection&&(!pedal||field.courseOpen(sim.state,domain.view(ready()))))run({action:pedal?'brake':'stopField',id:selection.id});
      return true;
    }
    function clear(){
      if(!selection)return;
      release();clearTimeout(refreshTimer);delete doc.body.dataset.fieldCommand;selection=null;stamp='';bar.hidden=true;street()?.showField?.(null);
    }
    function select(site,id,bring=true,destination=''){
      const s=root.EarthCommunityLife.lookup(sim.state,site),b=s&&domain.view(s);
      if(!b||id!=='truck'&&!b.units.some(u=>u.id===id))return;
      const mission=b.missions.find(m=>!m.manual&&m.ids.includes(id));
      if(mission){
        sim.perform('baseOrder',{site:s.id,generation:s.foundingRevision||0,version:b.version||0,action:'takeField',id}).then(result=>{
          if(result.ok)select(site,id,bring,destination);else notify(result.message,true);
        });return;
      }
      release();slot=book.current().id;generation=s.foundingRevision||0;
      selection={site,id};stamp='';enterStreet();
      const stage=get('street-stage');if(bar.nextElementSibling!==stage)stage.before(bar);
      render();if(destination&&[...area.options].some(o=>o.value===destination))area.value=destination;
      get('field-status').textContent='';
      street()?.showField?.(selection,bring);if(bring){bar.scrollIntoView({block:'nearest',behavior:'instant'});get('street-canvas')?.focus({preventScroll:true});}
    }
    function render(){
      if(!selection)return;
      const s=ready(),b=s&&domain.view(s),id=selection.id,u=b?.units.find(v=>v.id===id);
      if(!s||(s.foundingRevision||0)!==generation||slot!==book.current().id||id!=='truck'&&!u||doc.body.dataset.mapView!=='street'||
         doc.body.hasAttribute('data-district-crossing')||doc.body.hasAttribute('data-observing-town')){clear();return;}
      bar.hidden=false;doc.body.dataset.fieldCommand='';
      const towns=domain.towns(sim.state),truck=id==='truck',at=pointOf(s,'truck'),p=pointOf(s,id);
      const near=v=>Math.hypot(pointOf(s,v.id).x-at.x,pointOf(s,v.id).y-at.y)<=.105;
      const nearby=b.units.filter(v=>field.personnel(v)&&near(v)&&!b.missions.some(m=>!m.manual&&m.ids.includes(v.id)));
      clearTimeout(refreshTimer);if(at.moving||p.moving)refreshTimer=setTimeout(render,250);
      const key=[s.id,id,b.version,sim.state.regionalWorld?.step,truck?at.moving:p.moving,nearby.map(v=>v.id),towns.map(t=>t.id+t.name)].join('/');
      if(key===stamp)return;stamp=key;
      get('field-name').textContent=(truck?'Military truck':name(u))+' · '+s.name;
      const riders=b.units.filter(v=>v.aboard),driver=b.units.find(v=>v.id===b.driver);
      const place=field.townAt(sim.state,s,p),passengers=riders.filter(v=>v!==driver);
      get('field-detail').textContent=truck?[(at.moving?'Moving':'Parked')+(place?' · '+place.name:' · between towns'),
        driver?name(driver)+' at the wheel':'Requires a soldier driver',passengers.length?'On board · '+passengers.map(name).join(', '):''].filter(Boolean).join(' · '):field.status(sim.state,s,u);
      if(truck&&!at.moving&&b.truck?.route&&!field.courseOpen(sim.state,b))get('field-status').textContent='Arrived. You can unload here.';
      get('field-truck').hidden=truck;
      const old=area.value;
      area.replaceChildren(...towns.map(t=>{const o=el('option',t.name);o.value=t.id;return o;}));
      area.value=towns.some(t=>t.id===old)?old:(b.missions.find(m=>m.manual&&m.phase==='awaiting')?.target||s.id);
      const oldDriver=drivers.value;drivers.replaceChildren(...nearby.map(v=>{const o=el('option',name(v));o.value=v.id;return o;}));
      if(nearby.some(v=>v.id===Number(oldDriver)))drivers.value=oldDriver;
      drivers.hidden=!truck||!nearby.length;
      get('field-drive').hidden=truck?!nearby.length:!field.personnel(u);
      get('field-drive').disabled=at.moving||(!truck&&!near(u))||(truck&&Number(drivers.value)===b.driver);
      get('field-board').hidden=truck||u.aboard;get('field-board').disabled=!truck&&(!near(u)||at.moving);
      get('field-load').hidden=!truck;get('field-load').disabled=at.moving||!b.units.some(v=>!v.aboard&&near(v));
      get('field-unload').hidden=truck?!riders.length:!u.aboard;get('field-unload').disabled=at.moving;
      get('field-unload').textContent=truck?'Unload all':'Disembark';
      get('field-go').textContent=truck?'Set gate destination':'Move to east gate';
      get('field-go').disabled=truck?!driver:u.aboard;
      get('field-stop').disabled=!p.moving&&!(truck&&field.courseOpen(sim.state,b));
      get('field-power').hidden=!truck;get('field-power').disabled=!b.driver||!field.courseOpen(sim.state,b);
      get('field-hint').textContent=truck?'Tap a road to set your course. Hold Drive to move and release to brake, or steer with the arrows.':'Tap ground to move, or steer with the arrows. Drag to look around.';
    }
    function move(areaId,point,steer=false){
      const s=ready();if(!s)return false;
      const b=domain.view(s),id=selection.id;
      if(id==='truck'&&!b.driver||b.units.find(u=>u.id===id)?.aboard){
        get('field-status').textContent=id==='truck'?'Choose a nearby soldier to take the wheel.':'Select the truck to drive, or disembark to walk.';return true;
      }
      run({action:'moveField',id,area:areaId,point,steer},()=>street()?.followField?.());return true;
    }
    function steer(direction,hold){
      if(!selection)return false;
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
    function aim(t){
      const g=root.EarthRegionalWorld.geography(sim.state,t),pin=g.project(t);
      return field.regional(pin,25,12);
    }
    get('field-find').onclick=()=>street()?.showField?.(selection,true);
    get('field-done').onclick=clear;
    get('field-look').onclick=()=>{const t=root.EarthCommunityLife.lookup(sim.state,area.value);if(t)street()?.fieldView?.(t.id,aim(t));};
    get('field-go').onclick=()=>{const t=root.EarthCommunityLife.lookup(sim.state,area.value);if(t)move(t.id,aim(t));};
    const pedal=get('field-power');
    function accelerate(){
      if(held==='pedal'||pedal.disabled)return;
      release(false);held='pedal';const k=ctx();
      function pulse(){
        if(held!=='pedal'||!current(k))return;
        if(!field.courseOpen(sim.state,domain.view(ready()))){release(false);get('field-status').textContent='Arrived. You can unload here.';render();return;}
        run({action:'accelerate',id:'truck'},()=>street()?.followField(),k).then(()=>{
          if(held==='pedal'&&current(k))repeat=setTimeout(pulse,750);
        });
      }
      pulse();
    }
    pedal.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();pedal.setPointerCapture?.(e.pointerId);accelerate();};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])pedal.addEventListener(type,()=>{if(held==='pedal')release();});
    pedal.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)accelerate();}};
    pedal.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(held==='pedal')release();}};
    pedal.onblur=()=>{if(held==='pedal')release();};
    pedal.onclick=e=>{if(e.detail===0&&!held)run({action:'accelerate',id:'truck'},()=>street()?.followField());};
    get('field-stop').onclick=()=>{release(false);run({action:'stopField',id:selection.id});};
    get('field-board').onclick=()=>run({action:'board',id:selection.id});
    get('field-drive').onclick=()=>{const id=selection.id==='truck'?Number(drivers.value):selection.id,s=selection.site;run({action:'drive',id},()=>select(s,'truck'));};
    get('field-load').onclick=async()=>{
      const s=ready(),k=ctx(),at=pointOf(s,'truck');
      for(const u of domain.view(s).units){if(!current(k))break;const p=pointOf(s,u.id);
        if(!u.aboard&&Math.hypot(p.x-at.x,p.y-at.y)<=.105)await run({action:'board',id:u.id},null,k);}
    };
    get('field-unload').onclick=()=>run({action:'unload',id:selection.id});
    get('field-truck').onclick=()=>select(selection.site,'truck');
    drivers.onchange=()=>{stamp='';render();};
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden)release();});root.addEventListener('blur',()=>release());
    sim.subscribe(render);
    function vehicle(){
      if(!selection)return false;
      const id=selection.id==='truck'?(domain.view(ready()).driver?'field-unload':'field-drive'):'field-board';
      const b=get(id);if(!b.hidden&&!b.disabled)b.click();return true;
    }
    return {select,clear,render,move,steer,release,vehicle,releaseDirection:dir=>{if(held===dir)release(performance.now()-pressedAt>130);},selected:()=>selection};
  }
  root.EarthBaseFieldUI={mount};
})(globalThis);
