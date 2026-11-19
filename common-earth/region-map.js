/* Local distances and both camera surfaces share one north-up projection. */
(function(root){
  'use strict';
  function mount({sim,watch}){
    const get=id=>document.getElementById(id),panel=get('region-view'),mini=get('region-mini'),
      small=mini.querySelector('canvas'),map=get('region-land'),field=get('region-town'),info=get('region-info');
    let animation=0,fit=true,terrain=null,terrainKey="";
    let towns=[],origin=null,radius=10,camera={x:0,y:0},zoom=1,drag=null,menuKey='',miniView,mainView;
    const bound=(n,min,max)=>Math.max(min,Math.min(max,n));
    const lonScale=()=>111*Math.max(.01,Math.cos(origin.lat*Math.PI/180));
    function refresh(){
      const world=sim.state,here=sim.active();
      if(!here){mini.hidden=true;close();return;}
      mini.hidden=false;
      const all=[...world.sites,...(world.communityLife?.outposts||[])],cluster=here.communityLife?.cluster||here.id;
      const anchor=all.find(s=>s.id===cluster)||here;
      if(origin?.id!==anchor.id){camera={x:0,y:0};zoom=1;}
      origin=anchor;
      towns=all.map(site=>({site,x:(((site.lon-origin.lon+540)%360)-180)*lonScale(),y:(site.lat-origin.lat)*111}))
        .filter(t=>t.site.id===here.id||t.site.communityLife?.cluster===cluster||Math.hypot(t.x,t.y)<=70);
      radius=Math.max(10,...towns.map(t=>Math.max(Math.abs(t.x),Math.abs(t.y))+4));
      for(const t of towns)t.people=root.EarthDistrictGrowth.members(t.site);
      const key=towns.map(t=>[t.site.id,t.site.name,t.site.era].join('/')).join('|');
      if(key!==menuKey){
        menuKey=key;field.replaceChildren(new Option('See community…',''),...towns.map(t=>new Option(t.site.name+' · '+t.site.era,t.site.id)));
      }
      if(!panel.hidden&&!grid.hidden)liveGrid(true);
      draw();
    }
    function surface(canvas,cx,cy,miniature){
      const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
      const ratio=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
      const xmin=Math.min(...towns.map(t=>t.x)),xmax=Math.max(...towns.map(t=>t.x)),ymin=Math.min(...towns.map(t=>t.y)),ymax=Math.max(...towns.map(t=>t.y));
      if(miniature||fit){cx=(xmin+xmax)/2;cy=(ymin+ymax)/2;if(!miniature)camera={x:cx,y:cy};}
      const g=canvas.getContext('2d'),scale=Math.min(w/(Math.max(4,xmax-xmin)+4),h/(Math.max(4,ymax-ymin)+5))*(miniature?1:zoom);
      g.setTransform(ratio,0,0,ratio,0,0);
      const labels=[];
      const screen=t=>({x:w/2+(t.x-cx)*scale,y:h/2-(t.y-cy)*scale});
      const ground=(x,y)=>({x:cx+(x-w/2)/scale,y:cy-(y-h/2)/scale});
      // The global mask is coarse at village scale. Blend it with the actual
      // surveyed settlement surfaces so a land community has a continuous shore.
      const extent=radius*4,key=origin.id+towns.map(t=>[t.x,t.y,t.site.water]).join('|');
      if(key!==terrainKey){
        terrainKey=key;terrain=document.createElement('canvas');terrain.width=terrain.height=640;
        const brush=terrain.getContext('2d'),pixels=brush.createImageData(640,640);
        const mask=(x,y)=>root.EarthRouteTerrain.waterAt({lat:origin.lat+y/111,lon:origin.lon+x/lonScale()})?-1:1;
        const samples=Array.from({length:33},(_,j)=>Array.from({length:33},(_,i)=>mask((i/32*2-1)*extent,(1-j/32*2)*extent)));
        for(let j=0;j<640;j++)for(let i=0;i<640;i++){
          const x=(i/639*2-1)*extent,y=(1-j/639*2)*extent;
          let weight=.13,total=0;
          for(const t of towns){const d=((t.x-x)**2+(t.y-y)**2),q=2/(1+d*.12);
            total+=q*(t.site.water?-1:1);weight+=q;}
          // Sample around the point to soften the chart's raster boundaries.
          const u=i*32/639,v=j*32/639,a=Math.min(31,Math.floor(u)),b=Math.min(31,Math.floor(v));
          const mix=(l,r,t)=>l+(r-l)*t;
          const macro=mix(mix(samples[b][a],samples[b][a+1],u-a),mix(samples[b+1][a],samples[b+1][a+1],u-a),v-b);
          const relief=Math.sin(x*1.4+y*.54)*.4+Math.sin(y*2.03-x*.49)*.3+Math.cos(x*.53-y*.68)*.45;
          const height=total/weight+macro*.54-.36+relief*.14;
          const grain=Math.sin(x*11+y*7)*1.8+Math.cos(y*17-x*2)*2+relief*8;
          const base=height<-.12?[59,107,117]:height<-.015?[80,137,140]:height<.035?[177,171,132]:
            height<.3?[131,149,109]:[112,138,99];
          const n=(j*640+i)*4;for(let k=0;k<3;k++)pixels.data[n+k]=base[k]+grain;pixels.data[n+3]=255;
        }
        brush.putImageData(pixels,0,0);
      }
      const corner=screen({x:-extent,y:extent});
      g.fillStyle='#587e78';g.fillRect(0,0,w,h);g.drawImage(terrain,corner.x,corner.y,extent*2*scale,extent*2*scale);
      for(const town of towns){
        if(town.site.id===origin.id)continue;
        const a=screen(town),b=screen({x:0,y:0});
        g.beginPath();g.moveTo(a.x,a.y);
        g.quadraticCurveTo(a.x*.45+b.x*.55+scale*.4,a.y*.55+b.y*.45-scale*.35,b.x,b.y);
        g.lineWidth=miniature?1:2;g.strokeStyle=town.site.water?'#a3d0c9':'#c7bf9f';g.setLineDash([3,4]);g.stroke();g.setLineDash([]);
      }
      for(const town of towns){
        const freight=town.site.communityLife?.freight,target=freight&&towns.find(t=>t.site.id===freight.to);
        if(!target)continue;
        const a=screen(town),b=screen(target);g.strokeStyle='#efc985';g.setLineDash([4,4]);
        g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.setLineDash([]);
      }
      const seconds=matchMedia('(prefers-reduced-motion: reduce)').matches?0:performance.now()/1000;
      for(const town of towns){
        const site=town.site,p=screen(town);
        if(miniature){
          const nearest=Math.min(14,...towns.filter(t=>t!==town).map(t=>Math.hypot(t.x-town.x,t.y-town.y)));
          const unit=bound(nearest*scale*.085,1,2.2);
          root.EarthRegionSettlement.draw(g,town,p,unit,seconds,true);
          if(site.id===sim.state.activeId){g.strokeStyle='#ffdc9f';g.lineWidth=1;g.strokeRect(p.x-5,p.y-4,10,8);}
          continue;
        }
        if(p.x < -160 || p.x>w+160 || p.y < -160 || p.y>h+160)continue;
        const nearest=Math.min(14,...towns.filter(t=>t!==town).map(t=>Math.hypot(t.x-town.x,t.y-town.y)));
        const unit=bound(nearest*scale*.094,5,32);
        const size=root.EarthRegionSettlement.draw(g,town,p,unit,seconds);
        labels.push({town,x:p.x-size.w/2,y:p.y-size.h/2-unit,w:size.w,h:size.h+unit});
        const caption=site.name,sub=site.era+' · '+site.population+' residents';
        g.font='600 13px system-ui';const width=Math.max(g.measureText(caption).width,g.measureText(sub).width)+14;
        const x=bound(p.x-width/2,1,w-width-1),y=bound(p.y+size.h*.48+4,2,h-40);
        labels.push({town,x,y,w:width,h:35});g.fillStyle='#142c2bf2';g.fillRect(x,y,width,35);
        g.fillStyle='#ffedc9';g.fillText(caption,x+7,y+14);g.font='11px system-ui';g.fillStyle='#d1e0d3';g.fillText(sub,x+7,y+28);
      }
      if(miniature&&!panel.hidden){const p=screen(camera);g.strokeStyle='white';g.strokeRect(p.x-3,p.y-3,6,6);}
      return {ground,scale,screen,labels};
    }
    function draw(){
      if(!origin)return;
      miniView=surface(small,0,0,true);
      if(panel.hidden)return;
      mainView=surface(map,camera.x,camera.y,false);
      info.textContent='Week '+sim.state.week+' · '+towns.length+' communities · '+(origin.lat+camera.y/111).toFixed(3)+'°, '+(((origin.lon+camera.x/lonScale()+540)%360)-180).toFixed(3)+'°';
    }
    function centre(p){fit=false;camera={x:bound(p.x,-radius,radius),y:bound(p.y,-radius,radius)};draw();}
    function close(){panel.hidden=true;drag=null;clearTimeout(animation);animation=0;liveGrid(false);}
    function animate(){clearTimeout(animation);if(panel.hidden)return;if(!document.hidden&&grid.hidden)draw();animation=setTimeout(animate,220);}
    const grid=get('region-streets'),previews=new Map();
    function startPreview(preview){
      preview.scene=root.EarthStreet.mount(preview.canvas,{spectator:true,thumbnail:true,getWeek:()=>sim.state.week,getWorld:()=>sim.state});
      preview.scene.setSite(structuredClone(preview.site));
      const workers=root.EarthConstruction?.view(preview.site,sim.state);
      if(workers)preview.scene.setConstruction(workers);
      preview.scene.resize();
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
      grid.hidden=!open;get('region-layout').textContent=open?'Regional terrain':'Live streets';
      if(!open){for(const {scene,button} of previews.values()){gridObserver?.unobserve(button);scene?.destroy();button.remove();}previews.clear();return;}
      for(const town of towns){
        const site=town.site,stamp=[site.id,sim.state.week,sim.state.actionRevision,sim.state.workRevision].join('/');
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
        if(preview.scene&&preview.stamp!==stamp){
          preview.scene.setSite(structuredClone(site));const workers=root.EarthConstruction?.view(site,sim.state);if(workers)preview.scene.setConstruction(workers);
          preview.scene.resize();preview.stamp=stamp;
        }
      }
    }
    get('region-layout').onclick=()=>liveGrid(grid.hidden);
    function streets(id){close();watch(id);field.value='';}
    function point(event,canvas){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
    function pick(p,view,tolerance){
      return towns.map(t=>({t,d:Math.hypot(t.x-p.x,t.y-p.y)*view.scale})).sort((a,b)=>a.d-b.d).find(o=>o.d<=tolerance)?.t;
    }
    mini.addEventListener('click',event=>{
      if(!miniView)return;
      const q=point(event,small),p=event.detail?miniView.ground(q.x,q.y):{x:0,y:0};
      const town=event.detail&&pick(p,miniView,4);
      if(town){streets(town.site.id);return;}
      if(panel.hidden){
        panel.hidden=false;zoom=1;fit=!event.detail;
        if(event.detail){
          camera={x:bound(p.x,-radius,radius),y:bound(p.y,-radius,radius)};
          const xs=towns.map(t=>t.x),ys=towns.map(t=>t.y);
          const sx=map.clientWidth/(Math.max(4,Math.max(...xs)-Math.min(...xs))+4);
          const sy=map.clientHeight/(Math.max(4,Math.max(...ys)-Math.min(...ys))+5);
          const distanceX=Math.max(1,...xs.map(x=>Math.abs(x-camera.x))),distanceY=Math.max(1,...ys.map(y=>Math.abs(y-camera.y)));
          zoom=Math.min(1,map.clientWidth*.40/(Math.min(sx,sy)*distanceX),map.clientHeight*.38/(Math.min(sx,sy)*distanceY));
        }
        draw();animate();
      }

      else{liveGrid(false);zoom=2;centre(p);}
      map.focus({preventScroll:true});
    });
    map.addEventListener('pointerdown',e=>{
      if(drag||!mainView)return;
      drag={id:e.pointerId,start:point(e,map),base:{...camera},moved:false};map.setPointerCapture(e.pointerId);
    });
    map.addEventListener('pointermove',e=>{
      if(drag?.id!==e.pointerId)return;
      const p=point(e,map),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
      if(Math.hypot(dx,dy)>4)drag.moved=true;
      if(drag.moved)centre({x:drag.base.x-dx/mainView.scale,y:drag.base.y+dy/mainView.scale});
    });
    map.addEventListener('pointerup',e=>{
      if(drag?.id!==e.pointerId)return;
      const moved=drag.moved;drag=null;if(moved)return;
      const q=point(e,map),p=mainView.ground(q.x,q.y),town=pick(p,mainView,20)||mainView.labels.findLast(l=>q.x>=l.x&&q.x<=l.x+l.w&&q.y>=l.y&&q.y<=l.y+l.h)?.town;
      if(town)streets(town.site.id);else centre(p);
    });
    map.addEventListener('pointercancel',()=>{drag=null;});
    map.addEventListener('keydown',e=>{
      const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
      if(dir){e.preventDefault();centre({x:camera.x+dir[0]*radius/(5*zoom),y:camera.y+dir[1]*radius/(5*zoom)});}
      if(e.key==='Escape'){close();mini.focus();}
    });
    field.addEventListener('change',()=>{if(field.value)streets(field.value);});
    function zoomBy(factor){liveGrid(false);fit=false;zoom=bound(zoom*factor,.3,8);draw();}
    get('region-closer').onclick=()=>zoomBy(1.5);
    get('region-further').onclick=()=>zoomBy(1/1.5);
    map.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?1.2:1/1.2);},{passive:false});
    get('region-fit').onclick=()=>{liveGrid(false);fit=true;zoom=1;draw();};
    get('region-close').onclick=()=>{close();mini.focus();};
    new ResizeObserver(draw).observe(get('street-stage'));
    setInterval(()=>{if(origin&&!document.hidden&&panel.hidden&&mini.offsetWidth)miniView=surface(small,0,0,true);},1200);
    return {refresh,close};
  }
  root.EarthRegionMap={mount};
})(globalThis);
