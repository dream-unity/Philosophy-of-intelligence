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
  const uniforms={
    guard:   {jacket:'#697b64',light:'#8b9a7c',trim:'#dcc183',cap:'#566850'},
    scout:   {jacket:'#78866a',light:'#9da486',trim:'#9bc6b6',cap:'#536c59'},
    engineer:{jacket:'#7b7962',light:'#aaa084',trim:'#e2ae68',cap:'#696a53'},
    medic:   {jacket:'#738b82',light:'#a3b7a7',trim:'#f2e6c8',cap:'#667f73'}
  };
  const complexions=['#c99a76','#91674f','#d8af8f','#ae795a','#84614c'];
  function ink(c,points,color,width){
    c.beginPath();c.moveTo(...points[0]);
    for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
    if(width){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    else{c.closePath();c.fillStyle=color;c.fill();}
  }
  function oval(c,x,y,rx,ry,color){
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
  }
  function selection(c,rx,ry){
    c.beginPath();c.ellipse(0,.015,rx,ry,0,0,Math.PI*2);
    c.strokeStyle='#514b30';c.lineWidth=.065;c.stroke();
    c.strokeStyle='#f3d586';c.lineWidth=.032;c.stroke();
  }
  function soldier(c,sx,sy,size,actor,pose={}){
    if(!(size>0)||!actor)return;
    const uniform=uniforms[actor.type]||uniforms.guard;
    const skin=complexions[Math.abs(Number(actor.id)||0)%complexions.length]||complexions[0];
    c.save();c.translate(sx,sy);c.scale(size,size);c.lineJoin='round';c.lineCap='round';
    if(pose.mini){
      // A head and shoulders stays distinct from the circular civilian markers.
      if(pose.selected)selection(c,.53,.27);
      ink(c,[[-.41,.03],[-.32,-.30],[0,-.43],[.32,-.30],[.41,.03]],'#273e38');
      ink(c,[[-.30,-.04],[-.22,-.27],[.22,-.27],[.30,-.04]],uniform.light);
      oval(c,0,-.54,.20,.22,skin);oval(c,-.015,-.66,.24,.13,uniform.cap);
      c.restore();return;
    }
    const dx=pose.dx??1,dy=pose.dy??0,side=dx-dy>=0?1:-1,back=dx+dy<-.15;
    const swing=pose.walking?Math.sin(pose.phase||0):0,lift=pose.walking?Math.abs(swing)*.018:0;
    oval(c,.05,.020,.210,.078,'rgba(31,43,35,.26)');
    if(pose.selected)selection(c,.25,.11);
    c.scale(side,1);
    // Each foot stays grounded over its half of the walking cycle.
    for(const near of [-1,1]){
      const hip=.055*near,travel=near*swing*.125,foot=hip+travel;
      const ankle=-.055-Math.max(0,-near*swing)*.046;
      ink(c,[[hip,-.325-lift],[hip+travel*.6+.022,-.183-lift],[foot,ankle]],near<0?'#3e514c':'#51635a',.088);
      ink(c,[[foot,ankle],[foot+.008,ankle+.039],[foot+.064,ankle+.042]],'#393e36',.057);
    }
    c.translate(0,-lift);
    const arm=(near)=>{
      const shoulder=near*.106,hand=near*.136-near*swing*.090;
      ink(c,[[shoulder,-.569],[near*.127-near*swing*.042,-.471],[hand,-.388]],near<0?'#45594e':uniform.jacket,.068);
      ink(c,[[hand,-.400],[hand+.009,-.365]],skin,.042);
      if(near>0)ink(c,[[shoulder+.012,-.551],[shoulder+.031,-.516]],uniform.trim,.042);
    };
    arm(-1);
    ink(c,[[-.123,-.572],[-.055,-.627],[.064,-.626],[.126,-.571],[.077,-.326],[-.085,-.319]],uniform.jacket);
    ink(c,[[-.12,-.567],[-.06,-.617],[-.046,-.35],[-.087,-.335]],uniform.light);
    if(back){
      ink(c,[[-.086,-.563],[.066,-.571],[.082,-.408],[.045,-.383],[-.083,-.399]],'#50655a');
      ink(c,[[-.080,-.549],[.071,-.555],[.070,-.507],[-.078,-.494]],'#80917a');
    }else{
      ink(c,[[-.082,-.585],[.085,-.384]],'#a9a48a',.032);
      ink(c,[[-.091,-.37],[.084,-.375]],'#484b3c',.040);
      c.fillStyle='#b59b6c';c.fillRect(-.018,-.386,.041,.029);
      ink(c,[[.009,-.607],[.041,-.554],[.077,-.604]],'#465e53');
      if(actor.type==='engineer'){
        ink(c,[[.020,-.384],[.108,-.393],[.093,-.306],[.018,-.305]],'#9b8056');
        ink(c,[[.037,-.383],[.044,-.424]],'#c8ccba',.023);
      }
      if(actor.type==='medic'){
        ink(c,[[-.117,-.410],[-.024,-.401],[-.026,-.322],[-.120,-.332]],'#e0d7b3');
        ink(c,[[-.09,-.369],[-.048,-.363]],'#9c5847',.014);
        ink(c,[[-.069,-.386],[-.071,-.347]],'#9c5847',.014);
      }
      if(actor.type==='scout')ink(c,[[-.061,-.597],[.054,-.589],[.010,-.536]],'#95ae9a');
    }
    if(actor.type==='guard'||actor.type==='scout'||pose.firing){
      c.save();c.translate(.035,-.49);if(!pose.firing)c.rotate(-.38);
      ink(c,[[-.15,.024],[-.06,-.008],[.16,-.008]],'#423d32',.052);
      ink(c,[[.08,-.019],[.35,-.019]],'#354342',.030);
      ink(c,[[.015,.005],[.001,.064]],'#4c4637',.038);
      oval(c,.085,.012,.027,.020,skin);c.restore();
    }
    arm(1);
    oval(c,.001,-.666,.075,.088,skin);
    ink(c,[[-.086,-.675],[-.075,-.725],[-.047,-.754],[.037,-.761],[.083,-.725],[.091,-.681]],uniform.cap);
    ink(c,[[-.069,-.732],[-.028,-.751],[.041,-.748]],uniform.light,.013);
    ink(c,[[-.077,-.689],[.079,-.694],[back?.082:.122,-.684]],'#405349',.022);
    if(!back){
      oval(c,.012,-.661,.017,.022,skin);
      ink(c,[[.061,-.668],[.073,-.668]],'#604c3b',.008);
    }
    c.restore();
  }

  // Surfaces are projected from the truck's own forward / lateral axes so the
  // windscreen, open passenger bed and wheels turn together at each heading.
  function truckBody(c,heading,passengers,driving,night){
    const dx=Math.cos(heading*Math.PI/4),dy=Math.sin(heading*Math.PI/4);
    const depthU=dx+dy,depthV=dx-dy,nearU=depthU>=0?1:-1,nearV=depthV>=0?1:-1;
    const project=(u,v,h=0)=>[u*depthV-v*depthU,(u*depthU+v*depthV)*.51-h];
    const face=(points,fill)=>ink(c,points.map(p=>project(...p)),fill);
    const edge=(a,b,color,w)=>ink(c,[project(...a),project(...b)],color,w);
    function block(u,v,l,w,z,h,top,front,side){
      const r=u+l,t=v+w,fu=nearU>0?r:u,fv=nearV>0?t:v,high=z+h;
      face([[fu,v,z],[fu,t,z],[fu,t,high],[fu,v,high]],front);
      face([[u,fv,z],[r,fv,z],[r,fv,high],[u,fv,high]],side);
      face([[u,v,high],[r,v,high],[r,t,high],[u,t,high]],top);
    }
    function disc(u,v,z,r,color){
      const pts=[];for(let i=0;i<16;i++){const a=Math.PI*i/8;pts.push([u+r*Math.cos(a),v,z+r*Math.sin(a)]);}
      face(pts,color);
    }
    function wheel(u,v){
      disc(u,v,.22,.202,'#2c3431');disc(u,v+Math.sign(v)*.014,.22,.137,'#414a44');
      disc(u,v+Math.sign(v)*.017,.22,.093,'#798172');disc(u,v+Math.sign(v)*.020,.22,.041,'#b4b29b');
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        disc(u+Math.cos(a)*.064,v+Math.sign(v)*.023,.22+Math.sin(a)*.064,.01,'#4d584e');
      }
    }
    const olive='#71806a',edgeGreen='#405647',roof=night?'#788c76':'#97a58a',metal='#aaac91';
    face([[-1.18,-.52,0],[1.25,-.52,0],[1.30,.48,0],[1.19,.61,0],[-1.1,.61,0]],'rgba(33,44,36,.28)');
    for(const u of [-.78,.74])wheel(u,-nearV*.50);
    block(-1.12,-.44,2.28,.88,.23,.17,'#536459','#3d4e45','#3f5046');
    for(const u of [-.78,.74])wheel(u,nearV*.50);
    function cabin(){
      block(.18,-.47,.99,.94,.38,.25,olive,'#758569','#566c57');
      const sill=nearV*.474;
      block(.24,nearV>0?.458:-.568,.31,.110,.288,.044,'#929880','#65705f','#515d51');
      face([[.78,sill,.480],[1.14,sill,.47],[1.14,sill,.536],[.80,sill,.545]],'#5f715b');
      edge([.22,sill,.455],[.64,sill,.455],'#88947c',.014);
      block(.87,-.46,.31,.92,.62,.084,roof,'#78836c','#526956');
      const lo=.235,hi=.89,vl=nearV*.455;
      block(lo,-.46,hi-lo,.92,.63,.41,olive,'#717e65','#61765e');
      face([[lo+.07,vl,.754],[hi-.09,vl,.754],[hi-.09,vl,.998],[lo+.07,vl,.998]],'#314e50');
      face([[lo+.09,vl,.949],[hi-.13,vl,.982],[hi-.13,vl,.998],[lo+.09,vl,.998]],'#a0bec0');
      if(driving){
        const [hx,hy]=project(.62,vl,.865);oval(c,hx,hy,.048,.064,'#aa876c');oval(c,hx,hy-.046,.055,.027,'#596d59');
      }
      edge([lo+.16,vl,.708],[lo+.24,vl,.708],metal,.025);
      edge([lo+.09,sill,.702],[lo+.09,sill,.465],'#4a624f',.012);
      edge([hi-.06,sill,.70],[hi-.06,sill,.468],'#4a624f',.012);
      // The same gold wing as the hangar door marks the base fleet.
      face([[.45,sill,.592],[.56,sill,.615],[.522,sill,.579],[.45,sill,.556],[.375,sill,.574],[.36,sill,.598]],'#c4b787');
      const fu=nearU>0?hi:lo;
      face([[fu,-.36,.765],[fu,.36,.765],[fu,.36,.995],[fu,-.36,.995]],nearU>0?'#749497':'#59716b');
      edge([fu,-.08,.769],[fu,-.08,.997],edgeGreen,.025);
      if(nearU>0){
        face([[fu,-.35,.956],[fu,-.02,.994],[fu,.32,.994],[fu,.10,.959]],'#9dad9f');
        edge([fu,.06,.797],[fu,.26,.854],'#475e56',.012);
      }
      const mirror=nearV*.543;
      edge([hi-.05,vl,.798],[hi-.03,mirror,.849],edgeGreen,.022);
      edge([hi-.03,mirror,.838],[hi-.03,mirror,.906],'#85958a',.035);
      block(.20,-.485,.718,.97,1.030,.046,roof,'#78846b','#5f725d');
      for(const v of [-.31,.31])edge([.25,v,1.08],[.85,v,1.08],'#a0ac91',.019);
      for(const v of [-.19,.19])edge([.92,v,.707],[1.115,v,.707],'#88987c',.018);
      if(nearU>0){
        for(const v of [-.358,.358])edge([1.173,v-.054,.572],[1.173,v+.054,.572],night?'#ffe5ac':'#d9d0a7',.069);
        for(let i=0;i<4;i++)edge([1.176,-.19,.48+i*.032],[1.176,.19,.48+i*.032],'#364a41',.016);
      }
      block(1.145,-.50,.09,1,.36,.075,'#899286','#59665a','#47574a');
    }
    function bed(){
      block(-1.135,-.48,1.33,.96,.38,.11,'#8d856d','#727c62','#596751');
      for(let j=0;j<5;j++){
        const v=-.38+j*.18;
        edge([-1.09,v,.493],[.13,v,.493],'#726c59',.013);
      }
      const rail=v=>{
        block(-1.125,v-.018,1.29,.036,.49,.153,'#a3a389','#7b876d','#75826a');
        for(const z of [.68,.79])edge([-1.128,v,z],[.161,v,z],olive,.048);
        for(const u of [-1.115,-.686,-.252,.15])edge([u,v,.47],[u,v,.823],edgeGreen,.039);
      };
      rail(-nearV*.46);
      for(const v of [-.38,.29])block(-1.04,v,1.17,.115,.505,.065,'#97937a','#747861','#646f5b');
      const tailgate=()=>block(-1.143,-.46,.045,.92,.475,.30,'#959b81','#6b7c65','#64775f');
      if(nearU>0)tailgate();
      // Occupied benches show one capped passenger per occupied visible seat.
      for(const side of [-nearV,nearV]){
        for(let j=0;j<3;j++){
          const i=j*2+(side>0?1:0);if(i>=passengers)continue;
          const [x,y]=project(-.90+j*.37,side*.243,.475);
          ink(c,[[x-.068,y-.09],[x-.059,y-.242],[x+.035,y-.259],[x+.072,y-.09]],j%2?'#617464':'#7b8970');
          oval(c,x,y-.295,.060,.069,complexions[i%complexions.length]);oval(c,x,y-.345,.073,.029,'#52644f');
        }
      }
      if(nearU<0)tailgate();
      rail(nearV*.46);
      // A rolled canvas top and two straps distinguish the open troop carrier.
      const far=-nearV*.42;
      edge([-1.10,far,.85],[.14,far,.85],'#a09d79',.087);
      for(const u of [-.90,-.12])edge([u,far-.027,.893],[u,far+.028,.810],'#595e49',.034);
      if(nearU<0){
        for(const v of [-.37,.37])edge([-1.17,v-.039,.455],[-1.17,v+.039,.455],'#c27f62',.049);
        for(const v of [-.34,.34])edge([-1.15,v,.50],[-1.15,v,.74],'#4b5e4d',.039);
        edge([-1.15,-.40,.675],[-1.15,.40,.675],'#8a957c',.018);
        edge([-1.16,-.12,.536],[-1.16,.12,.536],'#c1b994',.039);
      }
    }
    if(nearU>0){bed();cabin();}else{cabin();bed();}
  }
  const truckStamps=new Map(),truckDensity=64;
  function truck(c,sx,sy,size,pose={}){
    if(!(size>0))return;
    const dx=pose.dx??1,dy=pose.dy??0;
    const heading=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
    const passengers=Math.max(0,Math.min(6,Math.floor(pose.passengers||0)));
    c.save();c.translate(sx,sy);c.scale(size,size);c.lineCap='round';c.lineJoin='round';
    if(pose.mini){
      if(pose.selected)selection(c,.71,.35);
      ink(c,[[-.66,-.10],[-.37,-.42],[.40,-.42],[.66,-.15],[.36,.12],[-.4,.12]],'#2a5144');
      ink(c,[[-.46,-.15],[-.29,-.31],[.10,-.31],[-.04,-.14]],'#acaf87');
      ink(c,[[.09,-.16],[.22,-.31],[.38,-.31],[.48,-.16]],'#a2c0ab');
      c.restore();return;
    }
    if(pose.selected)selection(c,1.55,.68);
    const key=heading*32+passengers*4+(pose.driving?2:0)+(pose.night?1:0);
    let tile=truckStamps.get(key);
    if(!tile&&typeof document!=='undefined'){
      const next=document.createElement('canvas');next.width=256;next.height=200;
      const brush=next.getContext('2d');
      if(brush){
        brush.translate(128,131);brush.scale(truckDensity,truckDensity);brush.lineCap='round';brush.lineJoin='round';
        truckBody(brush,heading,passengers,pose.driving,pose.night);
        if(truckStamps.size>=24)truckStamps.delete(truckStamps.keys().next().value);
        truckStamps.set(key,next);tile=next;
      }
    }
    if(tile)c.drawImage(tile,-128/truckDensity,-131/truckDensity,256/truckDensity,200/truckDensity);
    else truckBody(c,heading,passengers,pose.driving,pose.night);
    c.restore();
  }

  function marker(c,sx,sy,size,kind){
    if(!(size>0))return;
    const id=String(kind||'').toLowerCase();
    c.save();c.translate(sx,sy);c.scale(size,size);c.lineCap='round';c.lineJoin='round';
    const p=brushes(c);
    if(/jet|aircraft|fighter|wing/.test(id))jet(p,0,0,0);
    else if(/tank|armou?r|crawler/.test(id))tank(p,0,0,0);
    else if(/chrono|time|rewind/.test(id))chronometer(p,0,0,0,.7,true);
    else soldier(c,0,0,1,{type:id},{mini:true});
    c.restore();
  }
  function inventory(ctx,sx,sy,unit,types){
    for(const kind of types){
      if(kind!=='jet'&&kind!=='tank')continue;
      const air=kind==='jet',x=air?-.98:1.01,y=air?.77:.82;
      marker(ctx,sx+(x-y)*unit,sy+((x+y)*.51-.11)*unit,unit*(air?.93:.87),kind);
    }
  }
  root.EarthBaseArt=Object.freeze({draw,marker,inventory,soldier,truck});
})(globalThis);
