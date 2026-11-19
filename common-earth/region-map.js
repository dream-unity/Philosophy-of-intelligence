/* Local distances and both camera surfaces share one north-up projection. */
(function(root){
  'use strict';
  function mount({sim,watch}){
    const get=id=>document.getElementById(id),panel=get('region-view'),mini=get('region-mini'),
      small=mini.querySelector('canvas'),map=get('region-land'),field=get('region-town'),info=get('region-info');
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
      const key=towns.map(t=>[t.site.id,t.site.name,t.site.era].join('/')).join('|');
      if(key!==menuKey){
        menuKey=key;field.replaceChildren(new Option('See community…',''),...towns.map(t=>new Option(t.site.name+' · '+t.site.era,t.site.id)));
      }
      draw();
    }
    function surface(canvas,cx,cy,span,miniature){
      const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
      const ratio=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
      const g=canvas.getContext('2d'),scale=Math.min(w,h)/(2*span);
      g.setTransform(ratio,0,0,ratio,0,0);
      const labels=[];
      const screen=t=>({x:w/2+(t.x-cx)*scale,y:h/2-(t.y-cy)*scale});
      const ground=(x,y)=>({x:cx+(x-w/2)/scale,y:cy-(y-h/2)/scale});
      const step=miniature?6:22;
      for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
        const p=ground(x+step/2,y+step/2),lat=origin.lat+p.y/111,lon=origin.lon+p.x/lonScale();
        const water=root.EarthRouteTerrain.waterAt({lat,lon});
        const shade=Math.round(3*Math.sin(p.x*.8)+3*Math.cos(p.y*.7));
        g.fillStyle=water?'hsl(186 32% '+(29+shade)+'%)':'hsl(119 15% '+(33+shade)+'%)';
        g.fillRect(x,y,step,step);
      }
      for(const town of towns){
        const freight=town.site.communityLife?.freight,target=freight&&towns.find(t=>t.site.id===freight.to);
        if(!target)continue;
        const a=screen(town),b=screen(target);g.strokeStyle='#efc985';g.setLineDash([4,4]);
        g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.setLineDash([]);
      }
      for(const town of towns){
        const {site}=town,p=screen(town),size=miniature?3:7;
        g.fillStyle='#193934';g.strokeStyle=site.id===sim.state.activeId?'#fff0be':'#acdfbc';
        g.lineWidth=miniature?1:2;g.beginPath();g.arc(p.x,p.y,size+site.tech.length,0,Math.PI*2);g.fill();g.stroke();
        if(!miniature){
          // Footprints and building work come from the same saved lots as the street scene.
          const lot=(plot)=>({x:p.x-18+(plot%3)*6,y:p.y+16+Math.floor(plot/3)*5});
          for(const building of site.buildings){const b=lot(building.plot);g.fillStyle='#e6ce9d';g.fillRect(b.x,b.y,5,4);}
          for(const job of site.construction||[]){if(job.scope!=='street')continue;const b=lot(job.plot);g.strokeStyle='#ffba70';g.strokeRect(b.x,b.y,5,4);}
          const lines=[site.name,site.era+' · '+site.population+' residents'];
          const job=site.construction?.[0],project=site.civicInitiatives?.active;
          if(job||project)lines.push(job?'Building '+job.name+' · '+Math.floor(100*job.work/job.total)+'%':project.title);
          if(site.id!==sim.state.communityLife?.homeId&&site.tech.length<3){
            const level=site.tech.length,goal=[1,3,6][level];
            lines.push(['Neighbourhood','Federation','Stewardship'][level]+' goal · '+Math.min(goal,site.stats.resolved)+'/'+goal+' council outcomes');
          }
          g.font='13px system-ui';const width=Math.max(...lines.map(l=>g.measureText(l).width))+14;
          const x=bound(p.x+12,2,w-width-2),y=p.y-12;
          if(p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h){
            labels.push({town,x,y,w:width,h:lines.length*17+5});
            g.fillStyle='#162c29ed';g.fillRect(x,y,width,lines.length*17+5);
            lines.forEach((line,i)=>{g.fillStyle=i?'#c1d9c9':'#ffebc4';g.fillText(line,x+7,y+15+i*17);});
          }
        }
      }
      if(miniature&&!panel.hidden){const p=screen(camera);g.strokeStyle='white';g.strokeRect(p.x-3,p.y-3,6,6);}
      return {ground,scale,screen,labels};
    }
    function draw(){
      if(!origin)return;
      miniView=surface(small,0,0,radius,true);
      if(panel.hidden)return;
      mainView=surface(map,camera.x,camera.y,radius/zoom,false);
      info.textContent='Week '+sim.state.week+' · '+towns.length+' communities · '+(origin.lat+camera.y/111).toFixed(3)+'°, '+(((origin.lon+camera.x/lonScale()+540)%360)-180).toFixed(3)+'°';
    }
    function centre(p){camera={x:bound(p.x,-radius,radius),y:bound(p.y,-radius,radius)};draw();}
    function close(){panel.hidden=true;drag=null;}
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
      panel.hidden=false;zoom=event.detail?2:1;centre(p);map.focus({preventScroll:true});
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
    get('region-fit').onclick=()=>{zoom=1;centre({x:0,y:0});};
    get('region-close').onclick=()=>{close();mini.focus();};
    new ResizeObserver(draw).observe(get('street-stage'));
    return {refresh,close};
  }
  root.EarthRegionMap={mount};
})(globalThis);
