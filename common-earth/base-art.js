/* An isometric public garrison. Cache the four ground/lighting variants at
   street scale so neighbouring towns can share the same painted surfaces. */
(function(root){
  'use strict';
  const density=64,width=592,height=455,originX=296,originY=278;
  const stamps=new Map();
  const iso=(x,y,z=0)=>[x-y,(x+y)*.51-z];
  function brushes(c){
    function polygon(points,fill,stroke,weight=.018){
      c.beginPath();c.moveTo(...points[0]);
      for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
      c.closePath();if(fill){c.fillStyle=fill;c.fill();}
      if(stroke){c.strokeStyle=stroke;c.lineWidth=weight;c.stroke();}
    }
    const face=(points,color,edge,weight)=>polygon(points.map(p=>iso(...p)),color,edge,weight);
    function line(a,b,color,weight=.025){
      c.beginPath();c.moveTo(...iso(...a));c.lineTo(...iso(...b));c.strokeStyle=color;c.lineWidth=weight;c.stroke();
    }
    function floor(x,y,w,d,z,color,edge){
      face([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color,edge);
    }
    function box(x,y,w,d,z,h,top,front,side){
      const f=y+d,r=x+w,t=z+h;
      face([[x,f,z],[r,f,z],[r,f,t],[x,f,t]],front);
      face([[r,f,z],[r,y,z],[r,y,t],[r,f,t]],side);
      floor(x,y,w,d,t,top);
    }
    function disc(x,y,z,rx,ry,color,stroke,weight=.018){
      const [sx,sy]=iso(x,y,z);
      c.beginPath();c.ellipse(sx,sy,rx,ry,0,0,Math.PI*2);
      if(color){c.fillStyle=color;c.fill();}
      if(stroke){c.strokeStyle=stroke;c.lineWidth=weight;c.stroke();}
    }
    function glow(x,y,z,r,rgb){
      const [sx,sy]=iso(x,y,z),g=c.createRadialGradient(sx,sy,0,sx,sy,r);
      g.addColorStop(0,'rgba('+rgb+',.54)');g.addColorStop(.38,'rgba('+rgb+',.17)');g.addColorStop(1,'rgba('+rgb+',0)');
      c.fillStyle=g;c.fillRect(sx-r,sy-r,r*2,r*2);
    }
    return {polygon,face,line,floor,box,disc,glow};
  }

  function technician(p,x,y,z,coat,cap){
    const {line,disc,face}=p;
    disc(x+.025,y+.01,z,.11,.052,'rgba(26,35,35,.32)');
    line([x-.04,y,z+.19],[x-.044,y+.035,z+.02],'#394446',.054);
    line([x+.038,y,z+.19],[x+.05,y-.012,z+.018],'#263b3b',.056);
    face([[x-.065,y,z+.17],[x+.07,y,z+.17],[x+.076,y,z+.33],[x-.077,y,z+.33]],coat);
    line([x-.083,y,z+.31],[x-.087,y+.026,z+.19],coat,.041);
    line([x+.083,y,z+.31],[x+.082,y+.022,z+.19],'#546b65',.044);
    disc(x,y,z+.38,.055,.066,'#b68e72');
    disc(x,y,z+.425,.070,.031,cap);line([x-.02,y+.025,z+.415],[x+.057,y+.051,z+.412],cap,.022);
  }
  function jet(p,x,y,z,s=1){
    const point=(u,v,h)=>[x+u*s,y+v*s,z+h*s],plane=(v,col)=>p.face(v.map(a=>point(...a)),col);
    p.disc(x+.055*s,y,z,.63*s,.19*s,'rgba(30,43,47,.27)');
    // A broad delta silhouette, pearl paint and amber tail bands.
    plane([[0,-.52,.105],[-.15,-.13,.11],[-.55,.31,.08],[-.14,.25,.13],[-.12,.48,.13],[.14,.47,.13],[.15,.25,.13],[.55,.30,.08],[.14,-.13,.11]],'#718792');
    plane([[0,-.63,.14],[-.115,-.04,.18],[-.10,.38,.16],[0,.5,.12],[.12,.34,.15],[.1,-.04,.18]],'#c9d6d6');
    plane([[0,-.64,.14],[0,-.09,.23],[.1,-.04,.18],[.075,.27,.18],[.141,.34,.15]],'#a1b3ba');
    plane([[-.052,-.24,.185],[0,-.36,.19],[.052,-.18,.19],[.043,-.06,.215],[-.045,-.07,.22]],'#45929b');
    plane([[-.13,.37,.16],[-.18,.36,.41],[-.065,.18,.19]],'#dca75b');
    plane([[.08,.37,.15],[.15,.36,.40],[.12,.16,.17]],'#b5844c');
    plane([[-.44,.25,.09],[-.37,.19,.10],[-.22,.19,.104],[-.25,.23,.105]],'#f1d093');
    plane([[.44,.25,.09],[.37,.19,.10],[.22,.19,.104],[.25,.23,.105]],'#e2bd81');
  }
  function tank(p,x,y,z,s=1){
    const {box,line,disc}=p;
    const block=(a,b,w,d,h,ht,...colors)=>box(x+a*s,y+b*s,w*s,d*s,z+h*s,ht*s,...colors);
    disc(x+.05*s,y,z,.52*s,.21*s,'rgba(27,40,39,.28)');
    for(const offset of [-.30,.17]){
      block(offset,-.30,.13,.61,.015,.13,'#5f6257','#464b46','#384543');
      for(let k=0;k<5;k++)line([x+(offset+.13)*s,y+(-.26+.116*k)*s,z+.04*s],[x+(offset+.13)*s,y+(-.26+.116*k)*s,z+.115*s],'#77796b',.025*s);
    }
    block(-.27,-.27,.54,.54,.13,.14,'#9b9d7d','#7a846c','#626d61');
    block(-.16,-.115,.33,.29,.265,.13,'#afb092','#8b957b','#6f7f6e');
    disc(x+.065*s,y-.028*s,z+.405*s,.071*s,.032*s,'#667c6c','#a2a78b',.011*s);
    line([x-.075*s,y+.12*s,z+.34*s],[x-.075*s,y+.48*s,z+.35*s],'#667666',.077*s);
  }
  function chronometer(p,x,y,z,s=1,night=false){
    const {box,face,line,glow}=p;
    box(x-.42*s,y-.32*s,.84*s,.64*s,z,.14*s,'#6e8e97','#536b75','#415964');
    const rim=[],inside=[];
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,dx=Math.cos(a),dz=Math.sin(a);
      rim.push([x+dx*.37*s,y,z+(.62+dz*.48)*s]);inside.push([x+dx*.282*s,y+.015*s,z+(.62+dz*.371)*s]);
    }
    face(rim,'#61818d','#b0bfc1',.024*s);face(inside,night?'#487987':'#3b626e','#94e6dc',.025*s);
    for(let i=0;i<12;i++)line(rim[i],inside[i],i%3?'#99b0b6':'#e7c788',(i%3?.014:.04)*s);
    for(const ribbon of [-1,1]){
      face([[x-.16*s,y+.025*s,z+(.62+.22*ribbon)*s],[x+.16*s,y+.025*s,z+(.62+.22*ribbon)*s],[x,y+.025*s,z+.62*s]],ribbon===1?'#bce5db':'#76cbd0');
    }
    if(night)glow(x,y+.06*s,z+.62*s,.42*s,'94,212,222');
  }

  function ground(p,water,night){
    const {box,floor,face,line,disc}=p;
    face([[-1.98,-1.82],[2.10,-1.8],[2.27,2.04],[-1.83,2.13]],'rgba(26,36,38,.26)');
    if(water){
      for(const x of [-1.72,-.60,.57,1.67])for(const y of [-1.66,1.65])
        box(x,y,.14,.14,-.29,.35,'#9c9786','#6d6e60','#565f59');
    }
    box(-1.98,-1.88,3.96,3.84,-.06,.15,water?'#858c81':'#a39e89','#858772','#6a746b');
    floor(-1.89,-1.80,3.78,3.66,.095,'#808984');
    for(let i=0;i<7;i++){
      const q=-1.77+i*.56;
      line([-1.88,q,.097],[1.88,q,.097],'#717d77',.012);
      for(let j=0;j<6;j++){
        const x=-1.46+j*.62+(i%2)*.22;
        if(x<1.83)line([x,q,.097],[x,q+.54,.097],'#75817b',.012);
      }
    }
    floor(-1.64,.38,1.63,1.18,.102,'#939a91','#abb0a1');floor(.24,.52,1.37,.94,.102,'#737e7a');
    for(const x of [.28,1.54])line([x,.53,.105],[x,1.41,.105],'#c4bd93',.023);
    // A west-facing walk meets the town's ring street, also on floating bases.
    box(-2.72,-.53,1.0,1.06,-.027,.13,water?'#b3a58d':'#a5a795','#828876','#7a8172');
    for(const y of [-.48,.48])line([-2.72,y,.109],[-1.73,y,.109],'#d7cdae',.035);
    if(water)for(let i=0;i<5;i++)line([-2.66+i*.16,-.46,.106],[-2.66+i*.16,.46,.106],'#908870',.015);
    for(const x of [-1.84,1.83])for(const y of [-1.73,1.73]){
      disc(x,y,.111,.062,.031,'#a6a187','#b8af93',.011);
      if(night)p.glow(x,y,.12,.17,'207,175,108');
    }
  }

  function hangar(p,night){
    const {box,face,line,floor}=p,x=-1.69,y=-1.43,w=1.64,d=1.59,z=.11,h=.70,front=y+d;
    box(x,y,w,d,z,h,'#99a7a0','#9eaba1','#6a7e78');
    const rise=t=>z+h+.43*Math.sin(t*Math.PI);
    const metal=['#b4c1b6','#bbc8ba','#c3cfc1','#bfcebf','#a8bbb1','#91a69e','#7d978f','#718c86'];
    for(let i=0;i<8;i++){
      const a=i/8,b=(i+1)/8,l=x+w*a,r=x+w*b;
      face([[l,y,rise(a)],[r,y,rise(b)],[r,front,rise(b)],[l,front,rise(a)]],metal[i]);
      face([[l,front,z+h],[r,front,z+h],[r,front,rise(b)],[l,front,rise(a)]],'#9caea2');
      line([l,front+.012,rise(a)],[r,front+.012,rise(b)],'#d9d9bf',.051);
      for(const v of [.18,.43,.68,.93])line([l,y+d*v,rise(a)+.007],[r,y+d*v,rise(b)+.007],'#78958b',.017);
    }
    box(x+.11,front,1.42,.018,z,.68,'#b1b8a7','#526860','#5e716a');
    for(let i=0;i<6;i++){
      const xx=x+.145+i*.223;
      floor(xx,front+.03,.19,.01,z+.64,'#82948a');
      face([[xx,front+.022,z+.037],[xx+.203,front+.022,z+.037],[xx+.203,front+.022,z+.634],[xx,front+.022,z+.634]],i<4?'#667d73':'#344d48');
      line([xx,front+.026,z+.37],[xx+.203,front+.026,z+.37],i<4?'#84978a':'#5e746b',.017);
    }
    box(x+.05,front+.03,1.54,.12,.81,.055,'#cac8ac','#b3b397','#8c9889');
    for(const xx of [x+.14,x+1.49]){
      box(xx,front+.08,.08,.07,.76,.055,'#f0ca88',night?'#ffe09e':'#c3b488','#ab956e');
      if(night)p.glow(xx,front+.12,.78,.27,'255,206,135');
    }
    // The workshop insignia: one wing on either side of a copper medallion.
    const cx=x+w*.5;
    for(const k of [-1,1])face([[cx+k*.05,front+.02,1.005],[cx+k*.27,front+.02,1.08],[cx+k*.17,front+.02,.984],[cx+k*.048,front+.02,.968]],'#e4cc92');
    face([[cx,front+.024,1.091],[cx+.064,front+.024,1.026],[cx,front+.024,.96],[cx-.064,front+.024,1.026]],'#b78752');
  }

  function tower(p,night){
    const {box,face,line,disc,glow}=p,x=.23,y=-1.43;
    box(x-.28,y-.24,.56,.48,.11,.88,'#9fa89b','#98a89d','#6b807b');
    line([x-.17,y+.244,.18],[x-.17,y+.244,.97],'#657c78',.033);
    line([x-.07,y+.244,.18],[x-.07,y+.244,.96],'#657c78',.033);
    for(let i=0;i<6;i++)line([x-.17,y+.25,.23+i*.12],[x-.07,y+.25,.23+i*.12],'#8d9b8c',.021);
    box(x-.4,y-.32,.80,.64,.99,.09,'#a6b7ab','#b4b9a7','#82988e');
    box(x-.33,y-.28,.66,.56,1.09,.34,'#809a97',night?'#8ac3bc':'#6a9493',night?'#62a4a3':'#587e82');
    for(const a of [-.29,-.10,.09,.28])line([x+a,y+.285,1.10],[x+a,y+.285,1.42],'#486361',.029);
    for(const b of [-.23,.00,.23])line([x+.335,y+b,1.1],[x+.335,y+b,1.42],'#46605f',.029);
    box(x-.38,y-.32,.76,.64,1.43,.10,'#bdc3b1','#8c9e92','#708c80');
    for(const a of [-.18,.18])for(const b of [-.11,.11])line([x+a,y+b,1.53],[x,y,2.38],'#65766f',.034);
    for(let i=0;i<4;i++){
      const h=1.58+i*.17,span=(2.38-h)*.19;
      line([x-span,y+.05,h],[x+span*.68,y+.035,h+.15],'#a2aca0',.018);
      line([x+span,y+.05,h],[x-span*.68,y+.035,h+.15],'#758a7e',.017);
    }
    line([x,y,2.27],[x,y,2.64],'#657b75',.027);disc(x,y,2.54,.045,.042,night?'#ffd49a':'#dd9c70');
    if(night)glow(x,y,2.54,.20,'255,178,120');
    face([[x+.06,y-.12,1.73],[x+.07,y-.13,1.92],[x+.36,y-.10,1.88],[x+.52,y-.06,1.94],[x+.5,y-.05,1.77],[x+.31,y-.09,1.72]],'#456c70');
    line([x+.12,y-.12,1.83],[x+.33,y-.095,1.80],'#d3c18a',.030);
  }

  function lab(p,night){
    const {box,floor,face,line}=p,x=.76,y=-1.41,w=.98,d=1.06,front=y+d;
    box(x,y,w,d,.10,.78,'#92a7a3','#81928c','#6c827e');
    box(x-.035,y-.03,w+.07,d+.06,.825,.078,'#b7bdad','#9eac9e','#82988a');
    floor(x+.09,y+.07,w-.18,d-.14,.91,'#7b918b');
    for(let i=0;i<3;i++){
      const xx=x+.09+i*.273;
      face([[xx,front+.012,.30],[xx+.22,front+.012,.30],[xx+.22,front+.012,.69],[xx,front+.012,.69]],night?'#7dd1ca':'#68999c');
      line([xx+.01,front+.018,.32],[xx+.19,front+.018,.66],night?'#b4e4d3':'#9ab7b0',.018);
    }
    chronometer(p,x+.49,y+.47,.91,.72,night);
    for(const b of [-1.23,-1.05,-.87])line([x+w+.005,b,.56],[x+w+.005,b+.10,.56],'#455e61',.046);
  }
  function westGate(p,night){
    const {box,line}=p;
    for(const [y,d] of [[-1.83,1.17],[.66,1.18]]){
      box(-1.90,y,.125,d,.10,.19,'#bcbba5','#a4ab98','#889784');
      for(const offset of [0,d*.5,d-.06])box(-1.89,y+offset,.10,.067,.28,.17,'#a3a997','#83958b','#627f76');
      line([-1.84,y,.425],[-1.84,y+d-.04,.425],'#9da38f',.026);
    }
    for(const y of [-.70,.57]){
      box(-1.98,y,.19,.13,.10,.47,'#bec2ae','#8f9e8e','#708778');
      box(-1.96,y+.015,.14,.10,.58,.065,'#ebcf98',night?'#ffdeb0':'#c9b98c','#b7ab86');
      if(night)p.glow(-1.9,y+.05,.61,.23,'255,202,121');
    }
  }
  function frontFence(p){
    const {box,line}=p;
    box(-1.89,1.78,3.77,.125,.10,.15,'#bcbba5','#a4ab98','#889784');
    for(let i=0;i<5;i++)box(-1.88+i*.92,1.794,.067,.10,.25,.14,'#a3a997','#83958b','#627f76');
    line([-1.87,1.85,.363],[1.88,1.85,.363],'#9da38f',.026);
  }
  function render(c,sx,sy,unit,night,water){
    c.save();c.translate(sx,sy);c.scale(unit,unit);c.lineCap='round';c.lineJoin='round';
    const p=brushes(c);ground(p,water,night);westGate(p,night);
    // Depth order follows the street diagonal, from the rear sheds to the gate.
    hangar(p,night);tower(p,night);lab(p,night);
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      technician(p,-.52+col*.28,1.19+row*.23,.113,row?'#667e72':'#819083','#4b6862');
    }
    frontFence(p);c.restore();
  }
  function draw(c,sx,sy,unit,night=false,water=false){
    if(!(unit>0))return;
    const key=(night?2:0)+(water?1:0);
    if(!stamps.has(key)){
      const tile=typeof document==='undefined'?null:document.createElement('canvas');
      if(tile){tile.width=width;tile.height=height;}
      const ctx=tile?.getContext('2d');
      if(ctx)render(ctx,originX,originY,density,night,water);
      stamps.set(key,ctx?tile:null);
    }
    const tile=stamps.get(key);
    if(!tile){render(c,sx,sy,unit,night,water);return;}
    const scale=unit/density;
    c.drawImage(tile,sx-originX*scale,sy-originY*scale,width*scale,height*scale);
  }
  function marker(c,sx,sy,size,kind){
    if(!(size>0))return;
    const id=String(kind||'').toLowerCase();
    c.save();c.translate(sx,sy);c.scale(size,size);c.lineCap='round';c.lineJoin='round';
    const p=brushes(c);
    if(/jet|aircraft|fighter|wing/.test(id))jet(p,0,0,0);
    else if(/tank|armou?r|crawler/.test(id))tank(p,0,0,0);
    else if(/chrono|time|rewind/.test(id))chronometer(p,0,0,0,.7,true);
    else{
      const shade=/engineer|signal/.test(id)?'#bd9c61':/medic|support/.test(id)?'#a8bbb2':/scout|recon/.test(id)?'#87977b':'#637e79';
      technician(p,-.19,-.06,0,shade,'#465e59');technician(p,.13,.045,0,shade,'#4e635b');
    }
    c.restore();
  }
  function inventory(ctx,sx,sy,unit,types){
    let crew=0;
    for(const kind of types){
      const aircraft=kind==='jet',vehicle=kind==='tank';
      const x=aircraft?-.98:vehicle?1.01:-.63+.37*crew++,y=aircraft?.77:vehicle?.82:1.40;
      marker(ctx,sx+(x-y)*unit,sy+((x+y)*.51-.11)*unit,unit*(aircraft?.93:vehicle?.87:.55),kind);
    }
  }
  root.EarthBaseArt=Object.freeze({draw,marker,inventory});
})(globalThis);
