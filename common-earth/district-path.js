/* A shared path between actual Street districts. The landscape is a single static
 * paint. Only the traveller moves during a crossing, including on touch devices. */
(function(root){
  'use strict';
  function mount(host,sim,action,arrive){
    if(!host)return null;
    const doc=host.ownerDocument;
    const make=(tag,css,text)=>{const el=doc.createElement(tag);if(css)el.className=css;if(text)el.textContent=text;return el;};
    const title=make('strong','trail-title'),distance=make('span','trail-distance'),head=make('header','trail-heading');
    head.append(title,distance);
    const landscape=make('div','trail-landscape'),canvas=make('canvas','trail-terrain'),marker=make('span','trail-traveller');
    canvas.setAttribute('aria-hidden','true');marker.setAttribute('aria-hidden','true');landscape.append(canvas,marker);
    host.tabIndex=-1;
    const note=make('p','trail-note'),menu=make('div','trail-buttons'),control=make('div','trail-control');
    note.setAttribute('role','status');menu.setAttribute('role','group');menu.setAttribute('aria-label','Path controls');control.append(note,menu);
    host.append(head,landscape,control);
    let world=null,trip=null,model=null,markers=[],painted='',phase='',frame=0,lastFrame=0,arrivalSent=false;
    function pin(text,id,callback){
      const button=make('button','trail-pin',text);button.type='button';button.dataset.stop=String(id);button.addEventListener('click',callback);return button;
    }
    function choose(text,callback){
      const button=make('button','',text);button.type='button';button.addEventListener('click',callback);menu.append(button);return button;
    }
    let regionalLine=null,regionalProjection=null;
    function plotCrossing(ctx,w,h){
      const from=sim.active(),region=root.EarthRegionalWorld,render=root.EarthRegionalRender;
      const rows=from&&trip.path&&region?.tripLine?.(world,from,trip);
      if(!render||!rows||rows.length<2){regionalLine=null;regionalProjection=null;return false;}
      regionalLine=rows;
      const west=Math.min(...rows.map(p=>p.x)),east=Math.max(...rows.map(p=>p.x));
      const south=Math.min(...rows.map(p=>p.y)),north=Math.max(...rows.map(p=>p.y));
      const scale=Math.min(w/(east-west+1.3),h/(north-south+1.3));
      const v=render.viewport((east+west)/2,(north+south)/2,w,h,scale,scale);
      regionalProjection=v;
      const geo=region.geography(world,from);
      render.soil(ctx,geo,v,false);render.routeLayer(ctx,world,from,v,false);render.useLayer(ctx,world,from,v,false);
      for(const t of geo.towns)if(render.inView(v,t.x,t.y,.2))render.townPlan(ctx,t,v,false);
      ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      for(const [i,p] of rows.entries()){const screen=v.screen(p.x,p.y);if(i)ctx.lineTo(screen.x,screen.y);else ctx.moveTo(screen.x,screen.y);}
      ctx.strokeStyle='#284e46';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#f7cf85';ctx.lineWidth=2;ctx.stroke();
      markers.forEach((el,i)=>{const [x,y]=bodyAt(model.landmarks[i].fraction);el.style.left=x*100+'%';el.style.top=y*100+'%';});
      return true;
    }
    function points(){
      const mid=model.via==='work'?[.48,.35]:[.47,.68];
      return [[.085,.67],[.245,.53],mid,[.73,.45],[.905,.27]];
    }
    function bodyAt(progress){
      if(regionalLine&&regionalProjection){
        const end=regionalLine.findIndex(p=>p.fraction>=progress);
        const b=regionalLine[end<0?regionalLine.length-1:end],a=regionalLine[Math.max(0,(end<0?regionalLine.length-1:end)-1)];
        const f=b.fraction>a.fraction?(progress-a.fraction)/(b.fraction-a.fraction):0,v=regionalProjection;
        const p=v.screen(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);
        return [p.x/v.w,p.y/v.h];
      }
      const stops=[0,.23,.51,.78,1],p=points();
      let i=0;while(i<3&&progress>stops[i+1])i++;
      const f=(progress-stops[i])/(stops[i+1]-stops[i]);
      return [p[i][0]+(p[i+1][0]-p[i][0])*f,p[i][1]+(p[i+1][1]-p[i][1])*f];
    }
    function paint(force){
      if(!trip||!model||host.hidden)return;
      const w=Math.max(240,Math.round(landscape.clientWidth||600)),h=Math.max(120,Math.round(landscape.clientHeight||240));
      const key=[w,h,model.via,model.from,model.to,model.water,model.distant,trip.path?.join('/')].join('|');if(painted===key&&!force)return;painted=key;
      const dpr=Math.min(root.devicePixelRatio||1,1.35);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      const ctx=canvas.getContext('2d');if(!ctx)return;
      ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
      if(plotCrossing(ctx,w,h))return;
      const water=model.water,far=model.distant;
      const grad=ctx.createLinearGradient(0,0,w*.3,h);grad.addColorStop(0,water?'#a0c6bd':'#afc4a4');grad.addColorStop(1,water?'#537f80':'#789474');
      ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
      let seed=17;for(const c of model.from+model.to)seed=(seed*31+c.charCodeAt(0))>>>0;
      const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
      function polygon(vertices,color){ctx.fillStyle=color;ctx.beginPath();vertices.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();ctx.fill();}
      function stroke(path,color,width,dash){
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash||[]);
        ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.stroke();ctx.setLineDash([]);
      }
      function home(x,y,hue){
        const scale=Math.max(.75,Math.min(1.25,w/610));
        ctx.save();ctx.translate(x*w,y*h);ctx.scale(scale,scale);
        ctx.fillStyle='#526b5d88';ctx.beginPath();ctx.ellipse(3,5,14,4,.15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ead8b9';ctx.fillRect(-8,-7,17,12);ctx.fillStyle=hue;ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-1,-16);ctx.lineTo(13,-6);ctx.fill();
        ctx.fillStyle='#57716b';ctx.fillRect(-4,-2,4,7);ctx.fillRect(2,-3,4,4);ctx.restore();
      }
      if(!water){
        polygon([[0,.13],[.31,.02],[.44,.2],[.18,.31]],'#94ad82');
        polygon([[.12,.78],[.34,.72],[.43,.89],[.16,.97]],'#c6b576');
        polygon([[.31,.48],[.50,.42],[.67,.65],[.42,.84]],'#a8ba79');
        for(let i=0;i<8;i++)stroke([[.30+i*.024,.49-i*.007],[.42+i*.024,.815-i*.020]],'#839852',2);
        const stream=[[-.05,.49],[.18,.40],[.29,.46],[.51,.2],[.8,.15],[1.03,.03]];
        stroke(stream,'#a6bc9c',Math.max(12,w*.024));stroke(stream,'#6c9f9c',Math.max(6,w*.014));
      }else{
        for(let i=0;i<42;i++){const x=rand(),y=rand();stroke([[x,y],[x+.012,y+.002],[x+.029,y-.003]],'#bdd5cc',.8);}
        polygon([[0,.51],[.15,.44],[.26,.56],[.19,.96],[0,1]],'#a4b589');
        polygon([[.71,0],[1,0],[1,.51],[.90,.46],[.75,.23]],'#a9ba92');
      }
      const route=points(),alt=model.via==='work'?[.47,.68]:[.48,.35];
      stroke([route[1],alt,route[3]],water?'#99b8ad':'#afaa8e',Math.max(3,w*.006));
      stroke(route,water?'#cad2b2':'#aa9273',Math.max(12,w*.023));
      stroke(route,water?'#729b96':'#ddd1a2',Math.max(8,w*.014));
      stroke(route,water?'#eee7c4':'#a59467',1.1,[4,6]);
      for(let i=0;i<48;i++){
        const x=rand(),y=rand();if(water||y>.3&&y<.8)continue;
        const r=2+rand()*4;ctx.fillStyle='#56755a';ctx.fillRect(x*w-1,y*h,2,6);
        ctx.fillStyle=i%2?'#638563':'#7c9965';ctx.beginPath();ctx.ellipse(x*w,y*h-2,r*1.25,r,0,0,Math.PI*2);ctx.fill();
      }
      [[.04,.58],[.095,.56],[.13,.64],[.835,.21],[.91,.16],[.955,.25]].forEach(([x,y],i)=>home(x,y,i%2?'#996c53':'#617f75'));
      if(!water){
        home(.45,.28,'#647775');home(.506,.24,'#726b5b');
        for(let i=0;i<4;i++)stroke([[.42+i*.024,.78],[.44+i*.024,.88]],'#687d4b',Math.max(3,w*.008));
      }else{stroke([[.15,.56],[.26,.53]],'#96785b',6);stroke([[.81,.29],[.91,.28]],'#96785b',6);}
      if(far)stroke([route[0],route[1],alt,route[3],route[4]],'#596b65',2,[3,5]);
      markers.forEach((el,i)=>{el.style.left=route[i+1][0]*100+'%';el.style.top=route[i+1][1]*100+'%';});
    }
    function choices(progress){
      const current=model.landmarks.find(n=>Math.abs(n.fraction-progress)<.003);
      const stopped=trip.hold!=null||trip.stop!=null&&progress>=model.landmarks[trip.stop].fraction-.001;
      const status=[current?.id,stopped,trip.via,trip.stop,trip.seen?.join('/'),progress>=.999].join('|');if(phase===status)return;
      phase=status;menu.replaceChildren();
      for(let i=0;i<markers.length;i++){markers[i].disabled=model.landmarks[i].fraction<progress-.004;markers[i].setAttribute('aria-pressed',String(trip.stop===i));}
      if(progress>=.999){note.textContent='Arriving in '+model.to+'.';choose('Enter '+model.to,()=>arrive(trip.to));return;}
      if(stopped){
        note.textContent=current?(trip.seen?.includes(current.id)?current.note:'Stopped at '+current.label+'. Look around or continue.'):'You have stopped on the path.';
        if(current)choose('Look around',()=>action('inspect'));
        if(progress<=.235){
          choose(model.regional?'Via food sources':model.water?'Sheltered channel':model.distant?'Regional connection':'Kitchen garden path',()=>action('commons'));
          choose(model.regional?'Via material sources':model.water?'Working berth':model.distant?'Freight interchange':'Service lane',()=>action('work'));
        }else{
          const next=model.landmarks.find(n=>n.fraction>progress+.003);
          if(next)choose('Continue to '+next.label,()=>action(String(next.id)));
        }
      }else{
        note.textContent='Travelling to '+(trip.stop!=null?model.landmarks[trip.stop].label:model.to)+'. Tap a landmark to stop there.';
        choose('Pause here',()=>action('pause'));
      }
      choose('Go straight to '+model.to,()=>action('direct'));
      choose('Turn back',()=>action('cancel'));
    }
    function animate(now){
      frame=0;if(!trip||doc.hidden||host.hidden)return;
      const p=root.EarthCommunityLife.routeProgress(trip);
      if(now-lastFrame>=40||p>=.999){
        lastFrame=now;const [x,y]=bodyAt(p);marker.style.left=(x*100)+'%';marker.style.top=(y*100)+'%';
        distance.textContent=(p*trip.km).toFixed(1)+' / '+trip.km.toFixed(1)+' km';choices(p);
      }
      if(p>=.999){if(!arrivalSent){arrivalSent=true;arrive(trip.to);}return;}
      if(trip.hold==null&&(trip.stop==null||p<model.landmarks[trip.stop].fraction))frame=root.requestAnimationFrame(animate);
      else {const [x,y]=bodyAt(p);marker.style.left=x*100+'%';marker.style.top=y*100+'%';choices(p);}
    }
    const physicalControls=['street-canvas','street-hud','street-controls','street-actors','actions-panel','calendar-personal-work','advance-week'];
    function setCrossing(active){
      if(doc.body.hasAttribute('data-district-crossing')===active)return;
      doc.body.toggleAttribute('data-district-crossing',active);
      for(const id of physicalControls){
        const element=doc.getElementById(id);
        if(element)element.inert=active;
      }
      doc.dispatchEvent(new Event('earthdistrictcrossing'));
      if(active)host.focus({preventScroll:true});
      else if(host.contains(doc.activeElement))doc.getElementById('scene-open-neighbours')?.focus({preventScroll:true});
    }
    function show(){
      world=sim.state;const fresh=world.communityLife?.journey;if(!fresh)return hide();
      if(frame)root.cancelAnimationFrame(frame);
      trip=fresh;model=root.EarthCommunityLife.trail(world,trip);if(!model)return hide();
      host.hidden=false;marker.classList.toggle('trail-van',trip.vehicle==='van');title.textContent=(trip.vehicle==='van'?'Driving from ':'')+model.from+' to '+model.to;setCrossing(true);
      if(!markers.length){
        markers=model.landmarks.map((_,i)=>{
          const p=pin('',i,()=>{
            if(!trip)return;
            const progress=root.EarthCommunityLife.routeProgress(trip),at=Math.abs(progress-model.landmarks[i].fraction)<.035;
            action(at?'inspect':String(i));
          });landscape.append(p);return p;
        });
      }
      markers.forEach((b,i)=>{b.textContent=model.landmarks[i].label;b.title='Stop at '+model.landmarks[i].label;});
      marker.title=world.communityLife.profile.name;arrivalSent=false;phase='';lastFrame=0;paint();
      frame=root.requestAnimationFrame(animate);
    }
    function hide(){
      if(frame)root.cancelAnimationFrame(frame);frame=0;trip=null;phase='';arrivalSent=false;setCrossing(false);host.hidden=true;
    }
    if(typeof root.ResizeObserver==='function')new root.ResizeObserver(()=>paint(false)).observe(landscape);
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden&&trip)show();});
    return {show,hide};
  }
  root.EarthDistrictPath=Object.freeze({mount});
})(typeof window==='undefined'?globalThis:window);
