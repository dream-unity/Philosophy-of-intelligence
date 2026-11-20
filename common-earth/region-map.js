/* The street and both map sizes observe the same geography in kilometres. */
(function(root){
  'use strict';
  function mount({sim,watch,getScene}){
    const get=id=>document.getElementById(id),panel=get('region-view'),mini=get('region-mini'),
      small=mini.querySelector('canvas'),map=get('region-land'),field=get('region-town'),
      info=get('region-info'),overlay=get('region-overlay'),stage=get('street-stage'),grid=get('region-streets');
    const model=root.EarthRegionalWorld,paint=root.EarthRegionalRender;
    if(!model||!paint)return null;
    const bound=(v,a,b)=>Math.max(a,Math.min(b,v)),previews=new Map(),cache=new WeakMap(),fingers=new Map();
    let geo=null,towns=[],base=null,camera={x:0,y:0},zoom=1,miniView,mainView,drag=null,pinch=null,
      fit=true,menuKey='',overlayId='',lastScene=null,animation=0,queued=0;
    let stageVisible=true,miniVisible=true,opener=null;
    const dimensions=new WeakMap();
    const street=()=>getScene?.();
    function point(event,canvas){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
    function refresh(){
      const world=sim.state;base=sim.active();
      if(!base){
        mini.hidden=true;miniView=null;cache.get(small)?.refinement?.cancel();cache.delete(small);
        close();geo=null;towns=[];return;
      }
      const next=model.geography(world,base);
      if(!next)return;
      const changed=geo?.origin.id!==next.origin.id;geo=next;towns=geo.towns;
      if(changed){fit=true;zoom=1;camera={x:0,y:0};overlayId='';}
      mini.hidden=false;
      const key=towns.map(t=>[t.site.id,t.site.name,t.site.era].join('/')).join('|');
      if(key!==menuKey){
        menuKey=key;field.replaceChildren(new Option('Inspect a community…',''),...towns.map(t=>new Option(t.site.name,t.site.id)));
        if(overlay){
          if(!towns.some(t=>t.site.id===overlayId))overlayId='';
          overlay.replaceChildren(new Option('Terrain only',''),...towns.map(t=>new Option(t.site.name,t.site.id)));
          overlay.value=overlayId;
        }
      }
      const scene=street();
      if(scene&&scene!==lastScene){scene.setExploration?.(overlayId);lastScene=scene;}
      if(!panel.hidden&&!grid.hidden)liveGrid(true);
      redraw();
    }
    function clip(p){
      return {x:bound(p.x,geo.bounds.minX,geo.bounds.maxX),y:bound(p.y,geo.bounds.minY,geo.bounds.maxY)};
    }
    function project(canvas,miniature){
      // Use the observed CSS size while production updates the surrounding panels.
      const size=dimensions.get(canvas),w=size?.width||canvas.clientWidth,h=size?.height||canvas.clientHeight;
      if(!w||!h||!geo)return null;
      const b=geo.bounds;
      if(miniature)return paint.viewport((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,w,h,w/(b.maxX-b.minX),h/(b.maxY-b.minY));
      const whole=paint.fit(geo,w,h);
      if(fit){camera={x:whole.x,y:whole.y};zoom=1;}
      return paint.viewport(camera.x,camera.y,w,h,whole.sx*zoom,whole.sy*zoom);
    }
    function draw(canvas,miniature){
      const view=project(canvas,miniature);if(!view)return null;
      const ratio=Math.min(root.devicePixelRatio||1,miniature?1.5:2,Math.sqrt(2200000/(view.w*view.h)));
      const pixW=Math.max(1,Math.round(view.w*ratio)),pixH=Math.max(1,Math.round(view.h*ratio));
      if(canvas.width!==pixW||canvas.height!==pixH){canvas.width=pixW;canvas.height=pixH;}
      const w=sim.state,g=canvas.getContext('2d');
      // Keep the map's terrain, plots and rights warm when only its camera
      // footprint or a person moving along a route needs to change.
      const key=[w.week,w.productionSerial,w.actionRevision,w.workRevision,w.regionalWorld?.step,w.regionalWorld?.regions[geo.origin.id]?.mapRevision,menuKey,overlayId,pixW,pixH,ratio,view.sx,view.sy,
        ...towns.map(t=>[t.site.growth?.points,t.site.buildings?.length,t.site.population].join(','))].join('/');
      // Crop short pans from a slightly larger raster. Travellers and the
      // street camera footprint still use the exact current projection.
      const padX=miniature?0:Math.ceil(Math.min(view.w*.14,85)*ratio);
      const padY=miniature?0:Math.ceil(Math.min(view.h*.14,60)*ratio);
      let layer=cache.get(canvas);
      let left=layer?padX+(view.x-layer.area.x)*view.sx*ratio:0;
      let top=layer?padY+(layer.area.y-view.y)*view.sy*ratio:0;
      const changed=!layer||layer.key!==key||layer.world!==w||layer.geo!==geo||
        left<0||left>2*padX||top<0||top>2*padY;
      if(changed){
        layer?.refinement?.cancel();
        const tile=layer?.tile||document.createElement('canvas');
        const tw=pixW+2*padX,th=pixH+2*padY;
        if(tile.width!==tw)tile.width=tw;
        if(tile.height!==th)tile.height=th;
        const area=paint.viewport(view.x,view.y,view.w+2*padX/ratio,view.h+2*padY/ratio,view.sx,view.sy);
        layer={tile,key,world:w,geo,area};
        cache.set(canvas,layer);left=padX;top=padY;
        layer.refinement=paint.tileRefinement?.(
          ()=>cache.get(canvas)===layer&&!document.hidden&&(miniature?miniVisible&&panel.hidden:stageVisible&&!panel.hidden&&grid.hidden),
          ()=>{layer.finish=true;nextPaint();}
        );
      }
      if(changed||layer.finish){
        const {tile,area}=layer,ground=tile.getContext('2d');
        ground.setTransform(ratio,0,0,ratio,0,0);
        paint.soil(ground,geo,area,false,null,changed?layer.refinement?.add:null);
        paint.routeLayer(ground,w,base,area,miniature);
        paint.useLayer(ground,w,base,area,miniature);paint.explored(ground,geo,w,base,area,overlayId);
        for(const t of towns)if(paint.inView(area,t.x,t.y,.8))paint.townPlan(ground,t,area,miniature);
        layer.finish=false;
      }
      layer.refinement?.wake();
      g.setTransform(1,0,0,1,0,0);
      g.drawImage(layer.tile,left,top,pixW,pixH,0,0,pixW,pixH);
      g.setTransform(ratio,0,0,ratio,0,0);
      paint.actors(g,w,base,view,miniature);
      for(const a of root.EarthBaseField?.actors(w,geo)||[]){
        if(paint.inView(view,a.x,a.y,.05))paint.fieldActor(g,a,view,miniature?4:Math.max(7,Math.min(18,view.sx*.013)),false,false,0,true);
      }
      const sceneView=street()?.regionalCamera?.();
      if(sceneView&&sceneView.originId===geo.origin.id){
        const rect=sceneView.footprint,p=view.screen(rect.minX,rect.maxY);
        const centre=view.screen(sceneView.x,sceneView.y);
        const width=(rect.maxX-rect.minX)*view.sx,height=(rect.maxY-rect.minY)*view.sy;
        g.strokeStyle='#142b2b';g.lineWidth=3;g.strokeRect(p.x,p.y,width,height);
        g.strokeStyle='#ffdfa2';g.lineWidth=1.4;g.strokeRect(p.x,p.y,width,height);
        if(width<7||height<7){
          // Brackets locate the true subpixel footprint without inflating its
          // geographic outline into a false area on a small tablet map.
          const r=5;g.beginPath();
          for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
            g.moveTo(centre.x+dx*r,centre.y+dy*(r-2));g.lineTo(centre.x+dx*r,centre.y+dy*r);g.lineTo(centre.x+dx*(r-2),centre.y+dy*r);
          }
          g.strokeStyle='#20332d';g.lineWidth=3;g.stroke();g.strokeStyle='#fff1b1';g.lineWidth=1.5;g.stroke();
        }
      }
      return view;
    }
    function redraw(){
      if(!geo||document.hidden)return;
      if(panel.hidden){if(miniVisible)miniView=draw(small,true);return;}
      if(!stageVisible||!grid.hidden)return;
      mainView=draw(map,false);
      const pos=geo.locate(camera.x,camera.y);
      info.textContent='Week '+sim.state.week+' · '+towns.length+' communities · '+pos.lat.toFixed(3)+'°, '+pos.lon.toFixed(3)+'°';
    }
    function nextPaint(){
      if(!queued)queued=requestAnimationFrame(()=>{queued=0;redraw();});
    }
    function cameraChanged(){
      // Input can arrive several times in one display frame. Keep the inverse
      // projection current for the next finger, then paint the final position.
      mainView=project(map,false);
      nextPaint();
    }
    function centre(p){if(!geo)return;fit=false;camera=clip(p);cameraChanged();}
    function close(restoreFocus=false){
      if(panel.hidden)return;
      panel.hidden=true;drag=null;pinch=null;fingers.clear();
      cache.get(map)?.refinement?.cancel();cache.delete(map);
      clearTimeout(animation);animation=0;liveGrid(false);nextPaint();
      if(restoreFocus){
        opener?.focus({preventScroll:true});
        opener?.scrollIntoView?.({block:'nearest'});
      }
      opener=null;
    }
    function animate(){clearTimeout(animation);if(panel.hidden)return;redraw();animation=setTimeout(animate,900);}
    function open(source){
      if(!geo)return;
      opener=source||get('region-open');panel.hidden=false;fit=true;liveGrid(false);
      field.setAttribute('aria-label',sim.state.communityLife?.journey?'Centre the map on a community':'See community streets');
      animate();map.focus({preventScroll:true});panel.scrollIntoView?.({block:'nearest'});
    }
    function inspect(p,settings={}){
      if(!geo)return;
      const q=clip(p),scene=street();
      if(sim.state.communityLife?.journey){
        if(panel.hidden)open(mini);
        if(!grid.hidden)liveGrid(false);
        zoom=Math.max(zoom,2);centre(q);return;
      }
      if(scene?.fieldMapOrder?.(base.id,q)){close();nextPaint();return;}
      if(scene?.inspectRegion){
        close();scene.setExploration?.(overlayId);
        scene.inspectRegion(q.x,q.y,{zoom:Math.max(.46,scene.regionalCamera?.()?.zoom||.55),...settings});
        nextPaint();return;
      }
      // A new save may still be drawing its first street.
      const t=towns.find(t=>Math.hypot(t.x-q.x,t.y-q.y)<.4);
      if(t)watch(t.site.id);else{open();centre(q);}
    }
    function streets(id){
      const t=towns.find(t=>t.site.id===id);
      if(t)inspect(t,{zoom:.56,picked:true});
      field.value='';
    }
    function syncPreview(preview){
      const site=preview.site,world=sim.state;
      const stamp=[world.week,world.productionSerial,world.actionRevision,world.workRevision].join('/');
      if(preview.source===site&&preview.stamp===stamp)return;
      preview.scene.setSite(structuredClone(site));
      const workers=root.EarthConstruction?.view(site,world);
      if(workers)preview.scene.setConstruction(workers);
      preview.scene.resize();preview.source=site;preview.stamp=stamp;
    }
    function startPreview(preview){
      preview.scene=root.EarthStreet.mount(preview.canvas,{spectator:true,thumbnail:true,getWeek:()=>sim.state.week,getWorld:()=>sim.state});
      syncPreview(preview);
      const locals=root.EarthDistrictGrowth.members(preview.site);
      // A district camera follows a local worker. Keep that choice between
      // rounds so their journey remains continuous as accounts settle.
      const index=Math.abs(Math.round(preview.site.lon*1000)+Math.round(preview.site.lat*1000));
      const byTrade={food:'food',materials:'repair',funds:'exchange'}[preview.site.specialty];
      const busy=locals.filter(person=>root.EarthDistrictGrowth.goal(preview.site,person).h?.activity===byTrade);
      const choices=busy.length?busy:locals;
      for(let i=0;i<choices.length;i++){
        const person=choices[(index+i)%choices.length];
        if(preview.scene.observePerson(person.id)){preview.following=person.name;break;}
      }
      if(!preview.following)preview.scene.toggleOverview();
    }
    const gridObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
      for(const entry of entries){
        const preview=[...previews.values()].find(p=>p.button===entry.target);if(!preview)continue;
        if(entry.isIntersecting&&!preview.scene)startPreview(preview);
        if(!entry.isIntersecting&&preview.scene){preview.scene.destroy();preview.scene=null;preview.stamp='';preview.following='';}
      }
    },{root:grid});
    function liveGrid(open){
      grid.hidden=!open;map.hidden=open;get('region-layout').textContent=open?'Regional terrain':'Live streets';
      if(!open){for(const {scene,button} of previews.values()){gridObserver?.unobserve(button);scene?.destroy();button.remove();}previews.clear();return;}
      for(const [id,preview] of previews){
        if(towns.some(t=>t.site.id===id))continue;
        gridObserver?.unobserve(preview.button);preview.scene?.destroy();preview.button.remove();previews.delete(id);
      }
      for(const town of towns){
        const site=town.site;
        let preview=previews.get(site.id);
        if(!preview){
          const button=document.createElement('button'),canvas=document.createElement('canvas'),label=document.createElement('span');
          button.type='button';button.append(canvas,label);grid.append(button);
          button.onclick=()=>streets(site.id);
          preview={scene:null,button,label,canvas,site};previews.set(site.id,preview);
          if(gridObserver)gridObserver.observe(button);else startPreview(preview);
        }
        preview.site=site;
        const growth=root.EarthDistrictGrowth.report(site);
        preview.label.textContent=site.name+' · '+site.era+' · '+growth.points+(growth.target?'/'+growth.target:'')+' growth';
        if(preview.scene)syncPreview(preview);
      }
    }
    get('region-layout').onclick=()=>{
      liveGrid(grid.hidden);
      if(grid.hidden){nextPaint();map.focus({preventScroll:true});}
    };
    get('region-open')?.addEventListener('click',event=>open(event.currentTarget));
    function selectChart(id){
      overlayId=towns.some(t=>t.site.id===id)?id:'';
      if(overlay)overlay.value=overlayId;
      street()?.setExploration?.(overlayId);redraw();
    }
    overlay?.addEventListener('change',()=>selectChart(overlay.value));
    field.addEventListener('change',()=>{if(field.value)streets(field.value);});
    mini.addEventListener('click',e=>{
      if(!miniView)return;
      if(e.detail===0){open(mini);return;}
      const p=point(e,small);inspect(miniView.ground(p.x,p.y),{picked:true});
    });
    function zoomBy(factor,p){
      if(!geo)return;
      if(!grid.hidden)liveGrid(false);
      const at=p&&mainView?.ground(p.x,p.y);fit=false;zoom=bound(zoom*factor,1,160);
      if(at){
        const next=project(map,false),after=next?.ground(p.x,p.y);
        if(after)camera=clip({x:camera.x+at.x-after.x,y:camera.y+at.y-after.y});
      }
      cameraChanged();
    }
    function beginPinch(){
      const [a,b]=fingers.values(),p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      pinch={anchor:mainView.ground(p.x,p.y),distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};
      drag=null;
    }
    map.addEventListener('pointerdown',e=>{
      if(!mainView||e.button!==0)return;
      const p=point(e,map);fingers.set(e.pointerId,p);
      try{map.setPointerCapture(e.pointerId);}catch{}
      if(fingers.size===1)drag={id:e.pointerId,start:p,base:{...camera},moved:false};
      if(fingers.size===2)beginPinch();
    });
    map.addEventListener('pointermove',e=>{
      if(!fingers.has(e.pointerId))return;
      const p=point(e,map);fingers.set(e.pointerId,p);
      if(pinch){
        const [a,b]=fingers.values(),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        fit=false;zoom=bound(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,160);
        const after=project(map,false).ground(mid.x,mid.y);
        centre({x:camera.x+pinch.anchor.x-after.x,y:camera.y+pinch.anchor.y-after.y});return;
      }
      if(drag?.id!==e.pointerId)return;
      const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
      if(Math.hypot(dx,dy)>6)drag.moved=true;
      if(drag.moved)centre({x:drag.base.x-dx/mainView.sx,y:drag.base.y+dy/mainView.sy});
    });
    function end(e){
      if(!fingers.delete(e.pointerId))return;
      if(pinch){
        if(fingers.size>=2){beginPinch();return;}
        pinch=null;
        if(fingers.size){const [id,p]=fingers.entries().next().value;drag={id,start:p,base:{...camera},moved:true};}
        return;
      }
      if(drag?.id!==e.pointerId)return;
      const moved=drag.moved;drag=null;if(moved||e.type!=='pointerup')return;
      const q=point(e,map),p=mainView.ground(q.x,q.y);
      const marker=towns.map(t=>({t,p:mainView.screen(t.x,t.y)}))
        .map(row=>({...row,d:Math.hypot(row.p.x-q.x,row.p.y-q.y)})).sort((a,b)=>a.d-b.d)[0];
      if(marker&&marker.d<=10)streets(marker.t.site.id);else inspect(p,{picked:true});
    }
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])map.addEventListener(ev,end);
    map.addEventListener('keydown',e=>{
      const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
      if(dir&&mainView){e.preventDefault();centre({x:camera.x+dir[0]*map.clientWidth/(8*mainView.sx),y:camera.y+dir[1]*map.clientHeight/(8*mainView.sy)});}
      if(e.key==='Escape'){e.preventDefault();close(true);}if(e.key==='Enter'){e.preventDefault();inspect(camera,{picked:true});}
    });
    get('region-closer').onclick=()=>zoomBy(1.6);
    get('region-further').onclick=()=>zoomBy(1/1.6);
    map.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?1.2:1/1.2,point(e,map));},{passive:false});
    get('region-fit').onclick=()=>{liveGrid(false);fit=true;zoom=1;redraw();};
    get('region-close').onclick=()=>close(true);
    if(typeof IntersectionObserver!=='undefined'){
      const visibility=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(entry.target===stage)stageVisible=entry.isIntersecting;
          if(entry.target===mini)miniVisible=entry.isIntersecting;
        }
        if(panel.hidden?miniVisible:stageVisible)nextPaint();
      });
      visibility.observe(stage);visibility.observe(mini);
    }
    const sizing=new ResizeObserver(entries=>{
      for(const entry of entries||[])if((entry.target===map||entry.target===small)&&entry.contentRect){
        dimensions.set(entry.target,{width:Math.round(entry.contentRect.width),height:Math.round(entry.contentRect.height)});
      }
      nextPaint();
    });
    sizing.observe(stage);sizing.observe(map);sizing.observe(small);
    let lastMini=0;
    function cameraMoved(){
      const now=performance.now();
      if(panel.hidden&&now-lastMini>=60){lastMini=now;nextPaint();}
    }
    for(const event of ['earthregionalinspect','earthregionalcamera'])stage.addEventListener(event,cameraMoved,{passive:true});
    setInterval(()=>{if(geo&&miniVisible&&!document.hidden&&panel.hidden&&mini.offsetWidth)miniView=draw(small,true);},900);
    return {refresh,close,open,selectChart,chart:()=>overlayId};
  }
  root.EarthRegionMap={mount};
})(typeof window==='undefined'?globalThis:window);
