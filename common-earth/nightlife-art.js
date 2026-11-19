/* Six reusable isometric stamps, lit independently for day and night. The
   projection and ground units match the streets, including on floating towns. */
(() => {
  'use strict';

  const density=76, width=536, height=426, originX=268, originY=292;
  const stamps=new Map();
  const project=(x,y,z=0)=>[x-y,(x+y)*.51-z];

  function painter(c,night){
    c.lineJoin='round';c.lineCap='round';
    function poly(points,fill,edge,weight=.014){
      const [first,...rest]=points;
      c.beginPath();c.moveTo(...first);
      for(const p of rest)c.lineTo(...p);
      c.closePath();
      if(fill){c.fillStyle=fill;c.fill();}
      if(edge){c.strokeStyle=edge;c.lineWidth=weight;c.stroke();}
    }
    const face=(vertices,fill,edge,weight)=>poly(vertices.map(p=>project(...p)),fill,edge,weight);
    function line(a,b,color,weight=.026){
      c.beginPath();c.moveTo(...project(...a));c.lineTo(...project(...b));
      c.strokeStyle=color;c.lineWidth=weight;c.stroke();
    }
    function oval(x,y,z,rx,ry,fill,edge){
      const [px,py]=project(x,y,z);
      c.beginPath();c.ellipse(px,py,rx,ry,0,0,Math.PI*2);
      c.fillStyle=fill;c.fill();
      if(edge){c.lineWidth=.016;c.strokeStyle=edge;c.stroke();}
    }
    function floor(x,y,w,d,z,color,edge){
      face([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],color,edge);
    }
    // Raking light on a wall leaves the base in shade and picks up its cornice.
    function wallTone(x,y,z,h,color){
      if(h<.18||!/^#[0-9a-f]{6}$/i.test(color))return color;
      const rgba=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
      const mix=(n,v)=>'rgb('+rgba.map(c=>Math.round(c*(1-n)+v*n)).join(',')+')';
      const g=c.createLinearGradient(...project(x,y,z+h),...project(x,y,z));
      g.addColorStop(0,mix(.11,235));g.addColorStop(.72,color);g.addColorStop(1,mix(.15,39));return g;
    }
    function box(x,y,w,d,z,h,top,front,side){
      face([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],wallTone(x+w*.5,y+d,z,h,front));
      face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],wallTone(x+w,y+d*.5,z,h,side));
      floor(x,y,w,d,z+h,top);
    }
    // Local facade coordinates run horizontally across the wall and down
    // from the top edge. Lettering, tilework and glazing follow its plane.
    function facade(x,y,h,side,paint){
      const [px,py]=project(x,y,h);
      c.save();c.transform(1,side?-.51:.51,0,1,px,py);paint(c);c.restore();
    }
    function legend(x,y,z,side,w,h,label,bg,ink){
      facade(x,y,z,side,g=>{
        g.fillStyle=bg;g.fillRect(0,0,w,h);
        g.strokeStyle=ink;g.lineWidth=.012;g.strokeRect(.035,.027,w-.07,h-.054);
        g.font='bold '+(h*.58)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';
        g.fillStyle=ink;g.fillText(label,w/2,h*.52,w-.13);
      });
    }
    function light(x,y,z,r,rgb){
      if(!night)return;
      const [cx,cy]=project(x,y,z);
      const glow=c.createRadialGradient(cx,cy,0,cx,cy,r);
      glow.addColorStop(0,'rgba('+rgb+',.40)');glow.addColorStop(.42,'rgba('+rgb+',.13)');glow.addColorStop(1,'rgba('+rgb+',0)');
      c.fillStyle=glow;c.fillRect(cx-r,cy-r,r*2,r*2);
    }
    function plinth(w,d,top,edge){
      face([[-w/2+.1,-d/2],[w/2+.12,-d/2+.08],[w/2+.35,d/2+.20],[-w/2+.22,d/2+.16]],'rgba(22,29,29,.23)');
      box(-w/2,-d/2,w,d,0,.075,top,edge,'#68645c');
      for(let j=0;j<8;j++){
        const py=-d/2+(j+.5)*d/8;line([-w/2,py,.078],[w/2,py,.078],'rgba(83,69,56,.22)',.012);
        for(let i=0;i<5;i++){
          const px=-w/2+(i+.24+(j%2)*.43)*w/5;
          line([px,py,.078],[px,Math.min(d/2,py+d/8),.078],'rgba(83,69,56,.21)',.012);
        }
      }
    }
    return {c,night,face,line,oval,floor,box,facade,legend,light,plinth};
  }

  function club(p){
    const {night,face,line,oval,floor,box,facade,legend,light,plinth}=p;
    const rose=night?'#ff86ac':'#db8993',brass=night?'#ffd9a1':'#caa575';
    const x=-1.46,y=-1.03,w=2.88,d=1.98,terrace=1.46,front=y+d;
    plinth(3.22,2.57,'#90857c','#82766e');
    box(x,y,w,d,.08,1.25,'#826d70','#9b6d64','#775851');
    for(const side of [false,true])facade(side?x+w:x,front,1.32,side,g=>{
      const length=side?d:w;
      g.strokeStyle='rgba(226,190,157,.31)';g.lineWidth=.012;
      g.beginPath();
      for(let row=0;row<11;row++){
        const v=row*.118;g.moveTo(0,v);g.lineTo(length,v);
        for(let u=(row%2)*.20;u<length;u+=.4){g.moveTo(u,v);g.lineTo(u,v+.117);}
      }
      g.stroke();
      const bays=side?2:3,span=length/bays;
      for(let i=0;i<bays;i++){
        const u=i*span+.12,ww=span-.24;
        g.fillStyle='#534850';g.fillRect(u,.28,ww,.94);
        g.fillStyle=night?'#d28b9f':'#605d69';g.fillRect(u+.045,.33,ww-.09,.81);
        g.fillStyle='#382e40';g.fillRect(u+.09,.48,ww-.18,.64);
        if(!side&&i===1){g.fillStyle=brass;g.fillRect(u+ww*.47,.42,.022,.77);}
        else for(let j=0;j<4;j++){g.fillStyle=j%2?'#8a6276':'#b38994';g.fillRect(u+.08,.55+j*.105,ww-.16,.022);}
        g.fillStyle='#ceb09a';g.fillRect(u-.025,.22,ww+.05,.076);
      }
    });
    box(x-.08,y-.07,w+.16,d+.14,1.30,.16,'#635266','#493c50','#362e40');
    floor(x+.06,y+.05,w-.12,d-.1,terrace+.007,'#574858');
    const colors=night?['#bf4776','#f1889d','#897bc4','#de9679']:['#986875','#be8e8f','#90839a','#ba9382'];
    for(let i=0;i<5;i++)for(let j=0;j<3;j++)
      floor(-.86+i*.34,-.30+j*.34,.315,.315,terrace+.016,colors[(i*3+j)%4]);
    box(x,-1.05,w,.15,terrace,.89,'#755364','#523b53','#392e42');
    facade(-1.27,-.892,2.24,false,g=>{
      g.fillStyle='#453548';g.fillRect(0,0,2.45,.38);
      const heights=[.11,.19,.28,.15,.24,.08,.21,.29,.13];
      for(let i=0;i<32;i++){
        const h=heights[i%9];
        g.fillStyle=i%4===1?brass:rose;g.fillRect(.07+i*.074,.31-h,.033,h);
      }
    });
    // A DJ booth and a pair of floor-standing speakers face the dance floor.
    box(-.45,-.76,.92,.34,terrace,.34,'#715b68','#564558','#3d3548');
    for(const cx of [-.24,.24]){
      oval(cx,-.58,1.82,.115,.051,'#34303b',brass);oval(cx,-.58,1.825,.029,.014,rose);
    }
    for(const sx of [-1.28,.94]){
      box(sx,-.69,.34,.33,terrace,.62,'#58505b','#39303e','#302c39');
      facade(sx,-.348,2.055,false,g=>{
        for(const [cy,r] of [[.13,.082],[.38,.117]]){
          g.beginPath();g.arc(.17,cy,r,0,Math.PI*2);g.fillStyle='#27232c';g.fill();
          g.strokeStyle='#917783';g.lineWidth=.022;g.stroke();g.beginPath();g.arc(.17,cy,r*.4,0,Math.PI*2);g.fillStyle='#685969';g.fill();
        }
      });
    }
    for(const sx of [-1.37,1.36])line([sx,-.38,1.47],[sx,-.38,2.68],'#635564',.064);
    line([-1.39,-.38,2.69],[1.40,-.38,2.69],'#867581',.054);
    line([.20,-.38,2.69],[.20,-.38,2.55],brass,.018);
    const disco=project(.20,-.38,2.42);
    const mirror=p.c.createLinearGradient(disco[0]-.16,disco[1]-.15,disco[0]+.16,disco[1]+.15);
    mirror.addColorStop(0,'#fff0d3');mirror.addColorStop(.33,'#ced8ce');mirror.addColorStop(.59,'#ad99b5');mirror.addColorStop(1,'#60596d');
    oval(.20,-.38,2.42,.143,.143,mirror,'#bfaebe');
    const [mx,my]=disco;
    p.c.save();p.c.beginPath();p.c.arc(mx,my,.139,0,Math.PI*2);p.c.clip();
    p.c.strokeStyle='rgba(78,68,93,.50)';p.c.lineWidth=.009;
    for(let i=-.12;i<=.13;i+=.043){
      p.c.beginPath();p.c.moveTo(mx+i,my-.145);p.c.quadraticCurveTo(mx+i*1.4,my,mx+i,my+.145);p.c.stroke();
      p.c.beginPath();p.c.moveTo(mx-.14,my+i);p.c.quadraticCurveTo(mx,my+i+.027,mx+.14,my+i);p.c.stroke();
    }
    p.c.restore();
    line([.10,-.38,2.44],[.28,-.38,2.42],'#f1dbca',.013);
    if(night){
      face([[-1.05,-.38,2.6],[-.53,.50,1.49],[.02,.27,1.49]],'rgba(249,112,166,.13)');
      face([[1.05,-.38,2.6],[.09,.67,1.49],[-.36,.32,1.49]],'rgba(141,180,249,.14)');
    }
    for(const sx of [-1.05,1.05]){
      box(sx-.09,-.42,.18,.14,2.51,.11,'#625965','#4d4351','#403946');
      oval(sx,-.28,2.55,.051,.029,sx>0?'#c8daed':rose);light(sx,-.28,2.55,.25,sx>0?'146,200,250':'255,131,171');
    }
    for(const sx of [-1.47,-.55,.47,1.43])line([sx,1,terrace],[sx,1,1.78],'#866b71',.04);
    line([-1.47,1,1.79],[1.43,1,1.79],brass,.034);
    line([1.43,1,1.79],[1.43,-.96,1.79],brass,.034);
    box(-.83,front+.02,1.68,.30,1.0,.26,'#9a7381','#69475c','#503b50');
    legend(-.805,front+.325,1.25,false,1.63,.235,'NIGHT CLUB','#483044',brass);
    line([-.60,front+.32,1.075],[.59,front+.32,1.075],rose,.044);
    box(-.46,front+.025,.92,.25,.075,.075,'#b79280','#907465','#7a665c');
  }

  function cafe(p){
    const {night,face,line,oval,box,facade,legend,light,plinth}=p;
    const x=-1.41,y=-1.05,w=2.72,d=1.59,front=y+d,h=1.62;
    plinth(3.24,2.73,'#c2b59e','#a2927d');
    box(x,y,w,d,.075,h-.075,'#d1b58e','#dfc39b','#b8a37e');
    const glass=night?'#ffd394':'#849a95',frame='#51665d';
    for(const side of [false,true])facade(side?x+w:x,front,1.34,side,g=>{
      const span=side?d/2:w/3,total=side?2:3;
      for(let i=0;i<total;i++){
        const u=i*span+.085,ww=span-.17,door=!side&&i===1;
        const arch=()=>{g.beginPath();g.moveTo(u,1.17);g.lineTo(u,.30);g.quadraticCurveTo(u+ww/2,-.08,u+ww,.30);g.lineTo(u+ww,1.17);g.closePath();};
        arch();g.fillStyle=glass;g.fill();g.strokeStyle=frame;g.lineWidth=.063;g.stroke();
        g.fillStyle=frame;g.fillRect(u+.012,.39,ww-.025,.036);g.fillRect(u+ww/2-.018,.16,.036,1);
        if(door){g.fillRect(u+.045,.98,ww-.09,.18);g.fillStyle='#efcc91';g.fillRect(u+ww*.57,.62,.028,.105);}
        else{
          g.fillStyle=night?'#bd8559':'#6d8278';g.fillRect(u+.04,.88,ww-.08,.05);
          const colors=['#a25e50','#b8a266','#526b67','#c0a593'];
          const n=5;for(let j=0;j<n;j++){
            const bh=.09+(j*7%4)*.024;
            g.fillStyle=colors[(i+j)%4];g.fillRect(u+.08+j*(ww-.18)/n,.88-bh,.055,bh);
          }
          g.fillStyle=frame;g.fillRect(u-.025,1.09,ww+.05,.095);
        }
      }
    });
    for(const side of [0,1,2])box(x+side*w/2-.035,y+.015,.11,d-.03,1.48,.10,'#e3cfb1','#c6b08f','#a5967e');
    const ridge=y+.72;
    face([[x-.13,y-.14,h],[x+w+.13,y-.14,h],[x+w+.04,ridge,h+.47],[x-.04,ridge,h+.47]],'#81938c');
    face([[x-.04,ridge,h+.47],[x+w+.04,ridge,h+.47],[x+w+.13,front+.13,h],[x-.13,front+.13,h]],'#72958a');
    face([[x+w+.13,y-.14,h],[x+w+.04,ridge,h+.47],[x+w+.13,front+.13,h]],'#608074');
    for(let k=0;k<13;k++)line([x-.055+k*.22,ridge,h+.47],[x-.10+k*.22,front+.12,h+.012],'rgba(52,83,75,.53)',.018);
    for(let i=0;i<4;i++){
      const f=(i+.3)/4,q=ridge+f*(front+.13-ridge),z=h+.47-f*.47;
      line([x-.06,q,z+.004],[x+w+.04,q,z+.004],'rgba(197,207,174,.33)',.012);
    }
    line([x-.06,ridge,h+.48],[x+w+.06,ridge,h+.48],'#b0b9a4',.044);
    box(x+.27,y+.12,.24,.31,1.77,.56,'#ae9275','#9c7058','#815e4d');
    box(x+.23,y+.08,.32,.39,2.29,.085,'#d1b190','#b48d6f','#9d7c63');
    // Glazed rooflight, zinc flashing and copper downpipe.
    const glassRoof=[[x+.64,ridge+.12,2.10],[x+1.23,ridge+.12,2.10],[x+1.23,ridge+.48,1.93],[x+.64,ridge+.48,1.93]];
    face(glassRoof,night?'#e8c99a':'#a9c3bd','#456a62',.027);
    for(const u of [.84,1.03])line([x+u,ridge+.12,2.105],[x+u,ridge+.48,1.935],'#5c766b',.022);
    const pipe=x+w+.045;
    line([pipe,front+.04,1.62],[pipe,front+.04,.16],'#9d715c',.046);
    for(let i=0;i<12;i++){
      const px=x-.055+i*(w+.11)/12,sw=(w+.11)/12;
      const clr=i%2?'#e7dabb':'#698776';
      face([[px,front,1.51],[px+sw,front,1.51],[px+sw,front+.53,1.33],[px,front+.53,1.33]],clr);
      face([[px,front+.53,1.33],[px+sw,front+.53,1.33],[px+sw*.86,front+.53,1.23],[px+sw*.13,front+.53,1.23]],i%2?'#d8c5a4':'#547563');
    }
    legend(x+.25,front+.01,1.61,false,2.26,.22,'CAFÉ','#3e6557','#f4e4be');
    // Side blade sign: a porcelain cup on a dark green enamel disc.
    line([x+w,-.55,1.47],[x+w+.29,-.55,1.47],'#594f40',.035);
    const [tx,ty]=project(x+w+.26,-.55,1.27);
    p.c.save();p.c.translate(tx,ty);p.c.scale(1,.90);
    p.c.beginPath();p.c.arc(0,0,.155,0,Math.PI*2);p.c.fillStyle='#365c4f';p.c.fill();p.c.strokeStyle='#caaf7c';p.c.lineWidth=.016;p.c.stroke();
    p.c.fillStyle='#ebd8b5';p.c.fillRect(-.068,-.036,.102,.064);p.c.fillRect(-.079,.046,.132,.014);
    p.c.strokeRect(.036,-.023,.034,.033);p.c.restore();
    function chair(cx,cy){
      box(cx-.10,cy-.09,.20,.18,.27,.035,'#99795b','#796049','#6d5443');
      for(const ox of [-.083,.083])line([cx+ox,cy+.067,.29],[cx+ox*1.4,cy+.085,.078],'#554e45',.026);
      for(const ox of [-.083,.083])line([cx+ox,cy-.08,.28],[cx+ox,cy-.11,.48],'#7f634c',.025);
      line([cx-.09,cy-.11,.475],[cx+.09,cy-.11,.475],'#997c5e',.046);
    }
    for(const [cx,cy] of [[-.91,.96],[.84,1.02]]){
      chair(cx-.32,cy-.025);chair(cx+.32,cy-.025);
      oval(cx,cy,.08,.17,.080,'rgba(60,52,43,.27)');
      line([cx,cy,.10],[cx,cy,.435],'#61554a',.044);
      oval(cx,cy,.11,.125,.06,'#635b50');
      oval(cx,cy,.44,.26,.13,'#d2b987','#937958');
      // Coffee on its saucer and a book spread open on the terrace table.
      oval(cx-.078,cy+.055,.462,.060,.029,'#efe3c8');
      box(cx-.10,cy+.034,.055,.055,.46,.062,'#77543c','#e8d7b9','#c4b69b');
      face([[cx-.008,cy-.104,.46],[cx+.12,cy-.101,.47],[cx+.12,cy+.029,.468],[cx-.008,cy+.034,.46]],'#fff0cd');
      face([[cx-.12,cy-.083,.464],[cx-.008,cy-.104,.46],[cx-.008,cy+.034,.46],[cx-.12,cy+.047,.47]],'#e0cfa7');
      for(let j=0;j<3;j++)line([cx+.018,cy-.074+j*.03,.475],[cx+.098,cy-.074+j*.03,.475],'#b1a487',.008);
    }
    for(const sx of [-1.35,1.30]){
      box(sx-.11,.72,.22,.22,.08,.24,'#aa7b60','#a57454','#855e48');
      for(let j=0;j<6;j++)oval(sx+.065*Math.cos(j*2.4),.83+.052*Math.sin(j*2.4),.37+j%3*.036,.11,.105,['#657957','#809267','#576e58'][j%3]);
    }
    for(const sx of [-1.12,1.14]){
      box(sx,.565,.082,.075,.97,.095,'#f4b873',night?'#ffe4a3':'#dfb67c','#b08f68');
      light(sx,.61,1.01,.25,'255,197,120');
    }
  }

  function arcade(p){
    const {night,face,line,oval,floor,box,facade,legend,light,plinth}=p;
    const teal=night?'#76efdf':'#56b8af',coral=night?'#ffa388':'#d88370';
    const x=-1.48,y=-1.13,w=2.94,d=2.22,front=y+d;
    plinth(3.22,2.60,'#9ba7a2','#818c87');
    floor(x,y,w,d,.081,'#65747c');
    for(let i=0;i<6;i++)for(let j=0;j<4;j++)if((i+j)%2===0)floor(x+i*.49,y+j*.555,.485,.55,.086,'#718087');
    box(x,y,w,.13,.09,1.79,'#637879','#476064','#3e555f');
    box(x,y,.12,d,.09,1.28,'#7c9290','#627674','#556873');
    // Shallow sawtooth canopy leaves the two banks of cabinets visible from above.
    box(x-.06,y-.04,w+.12,.46,1.84,.09,'#acb8ae','#718682','#617c79');
    for(let j=0;j<7;j++){
      const px=x+.04+j*.406;
      face([[px,y-.03,1.94],[px+.39,y-.03,1.94],[px+.39,y+.29,2.08],[px,y+.29,2.08]],j%2?'#829a98':'#9db0a8');
      face([[px,y+.29,2.08],[px+.39,y+.29,2.08],[px+.39,y+.29,1.94],[px,y+.29,1.94]],'#627c80');
    }
    legend(x+.15,y+.14,1.81,false,2.63,.345,'VIDEO GAMES','#284553','#c5efdf');
    line([x-.04,y+.41,1.87],[x+w+.04,y+.41,1.87],teal,.036);
    const palettes=[
      ['#ce8668','#764f55','#4e4051','#f8be77'],['#3a9897','#41626c','#3f505c','#8ce4d0'],
      ['#a984bc','#786182','#55465f','#eeabd6'],['#adb775','#72825c','#4d645b','#e3ed99'],
      ['#d195ad','#875e7e','#614e68','#ffb9c7'],['#6898bd','#536c90','#435372','#b5deff']
    ];
    function cabinet(cx,cy,index){
      const pal=palettes[index],cw=.58,dx=cx-cw/2;
      const silhouette=[[cy-.23,.1],[cy+.28,.1],[cy+.28,.54],[cy+.39,.60],[cy+.39,.69],[cy+.25,.71],[cy+.16,.97],[cy+.25,1.10],[cy+.23,1.19],[cy-.23,1.19]];
      face(silhouette.map(([sy,z])=>[dx+cw,sy,z]),pal[2],pal[0],.015);
      box(dx,cy-.22,cw,.48,.1,.44,pal[1],pal[1],pal[2]);
      face([[dx,cy+.27,.54],[dx+cw,cy+.27,.54],[dx+cw,cy+.39,.60],[dx,cy+.39,.60]],pal[2]);
      face([[dx,cy+.39,.60],[dx+cw,cy+.39,.60],[dx+cw,cy+.39,.69],[dx,cy+.39,.69]],pal[0]);
      face([[dx,cy+.39,.69],[dx+cw,cy+.39,.69],[dx+cw,cy+.24,.72],[dx,cy+.24,.72]],'#444653');
      face([[dx,cy+.25,.71],[dx+cw,cy+.25,.71],[dx+cw,cy+.16,1.03],[dx,cy+.16,1.03]],'#303b49');
      face([[dx+.047,cy+.244,.746],[dx+cw-.047,cy+.244,.746],[dx+cw-.047,cy+.175,.976],[dx+.047,cy+.175,.976]],night?'#284751':'#344954');
      const gameInk=night?pal[3]:pal[0];
      for(let j=0;j<6;j++){
        const px=dx+.083+(j*7%9)*.045;
        const hz=.76+(j*(index+1)%4)*.034;
        line([px,cy+.237-(hz-.76)*.29,hz],[px+.039,cy+.237-(hz-.76)*.29,hz],j%2?'#ecf0ca':gameInk,.025);
      }
      line([dx+.07,cy+.246,.754],[dx+cw-.07,cy+.246,.754],pal[0],.018);
      box(dx,cy-.23,cw,.46,1.04,.145,pal[0],pal[3],pal[2]);
      for(let j=0;j<4;j++)line([dx+.08+j*.105,cy+.237,1.135],[dx+.13+j*.105,cy+.237,1.105],'#515669',.020);
      line([dx+.145,cy+.315,.70],[dx+.145,cy+.315,.775],'#695265',.021);
      oval(dx+.145,cy+.315,.782,.028,.027,coral);
      for(const off of [0,.055])oval(dx+.34+off,cy+.325,.706,.020,.011,'#eec7a0');
      facade(dx,cy+.265,.44,false,g=>{g.fillStyle='#394751';g.fillRect(.18,0,.17,.12);g.fillStyle='#a7b1aa';g.fillRect(.216,.031,.095,.013);});
    }
    for(let row=0;row<2;row++)for(let col=0;col<3;col++)cabinet(-.87+col*.86,-.70+row*.97,3*row+col);
    // A run of high clerestory windows and a translucent end canopy
    // shelter the display without hiding the paired stations from the camera.
    for(let j=0;j<4;j++){
      const cy=y+.47+j*.38;
      face([[x,cy,1.35],[x,cy+.36,1.35],[x,cy+.36,1.73],[x,cy,1.73]],j%2?'#88a8a7':'#aec0b2');
      line([x,cy+.36,1.34],[x,cy+.36,1.76],'#526d71',.032);
    }
    line([x,y+.44,1.76],[x,front,1.76],'#91a59b',.045);
    for(const cy of [y+.08,front+.01])line([x+w,cy,.12],[x+w,cy,1.69],'#586e73',.055);
    for(let j=0;j<4;j++){
      const cy=y+.35+j*.43;
      face([[x+w-.31,cy,1.83],[x+w+.04,cy,1.72],[x+w+.04,cy+.41,1.72],[x+w-.31,cy+.41,1.83]],'rgba(144,192,189,.45)','#729296',.016);
    }
    // A low glazed shop front, with an unobstructed double-width entrance.
    for(const [left,span] of [[x,.84],[.54,.9]]){
      box(left,front-.08,span,.12,.08,.15,'#84958f','#62777c','#4a646c');
      face([[left,front,.24],[left+span,front,.24],[left+span,front,.80],[left,front,.80]],'rgba(163,213,205,.19)');
      for(const u of [left,left+span])line([u,front,.235],[u,front,.81],'#6f8989',.028);
      line([left,front,.81],[left+span,front,.81],'#c4d9cc',.032);
    }
    // A projecting pixel-shaped marquee reads from both street approaches.
    const signX=x+w-.02,signY=y+.2;
    box(signX,signY,.12,.49,1.46,.42,'#56687c','#425563','#39485b');
    facade(signX+.126,signY+.48,1.85,true,g=>{
      const blocks=[[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[0,2],[3,2],[1,3],[2,3]];
      g.fillStyle=teal;for(const [a,b] of blocks)g.fillRect(.085+a*.073,.033+b*.073,.060,.060);
    });
    light(x+.4,y+.36,1.81,.38,'108,230,215');light(x+w-.27,y+.26,1.79,.35,'176,148,242');
  }

  const paint={nightclub:club,cafe,arcade};
  function render(c,kind,sx,sy,unit,night){
    c.save();c.translate(sx,sy);c.scale(unit,unit);
    paint[kind](painter(c,night));c.restore();
  }
  function draw(c,kind,sx,sy,unit,night=false){
    if(!Object.hasOwn(paint,kind)||!(unit>0))return false;
    const key=kind+(night?'-night':'-day');
    if(!stamps.has(key)){
      const tile=typeof document==='undefined'?null:document.createElement('canvas');
      if(tile){tile.width=width;tile.height=height;}
      const ink=tile?.getContext('2d');
      if(ink)render(ink,kind,originX,originY,density,!!night);
      stamps.set(key,ink?tile:null);
    }
    const tile=stamps.get(key);
    if(tile){
      const scale=unit/density;
      c.drawImage(tile,sx-originX*scale,sy-originY*scale,width*scale,height*scale);
    }else render(c,kind,sx,sy,unit,!!night);
    return true;
  }
  globalThis.EarthNightlifeArt=Object.freeze({draw});
})();
