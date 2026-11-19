/* A regional-scale view of the deeds, streets and workplaces in one district.
   Households occupy a stable parcel even when its owner is elsewhere. */
(function(root){
  'use strict';
  function draw(ctx,town,p,unit,time,miniature=false){
    const {site,people}=town,g=site.growth;
    const houses=g?.households||people.map((v,i)=>({name:v.name,owner:v.identityKey,plot:i,home:1,shop:null}));
    const cols=Math.max(3,Math.ceil(Math.sqrt(houses.length))),rows=Math.max(2,Math.ceil(houses.length/cols));
    const project=(x,y)=>[p.x+(x-y)*unit,p.y+(x+y)*unit*.49];
    const startX=-cols/2,startY=-rows/2;
    function poly(points,fill,stroke){
      ctx.beginPath();for(const [i,v] of points.entries()){const [x,y]=project(...v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
    }
    function line(a,b,color,width){
      ctx.beginPath();ctx.moveTo(...project(...a));ctx.lineTo(...project(...b));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    const shops=houses.filter(home=>home.shop);
    const marketRows=shops.length?1+Math.floor(Math.max(...shops.map(home=>home.businessPlot))/cols):0;
    const shopDoor=lot=>[startX+(lot%cols),startY+rows+1.15+Math.floor(lot/cols)*.75];
    const x=startX-.5,y=startY-.5,w=cols+.95,h=rows+1.55+marketRows*.75;
    poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],site.water?'#9e8c69':'#91a079',site.water?'#bcb493':'#91a079');
    for(let r=0;r<rows;r++){
      const by=startY+r+.49;
      line([startX-.45,by],[startX+cols-.45,by],r*cols<(g?.roads||0)?'#79817e':'#c5b593',unit*.25);
    }
    const marketY=startY+rows+.18;
    line([x,marketY],[x+w,marketY],'#9e9b89',unit*.35);
    line([startX-.48,y],[startX-.48,y+h],'#b2ab91',unit*.23);
    const objects=[];
    const architecture=(x,y,kind,slot,size)=>objects.push({depth:x+y,paint(){
      const [sx,sy]=project(x,y);
      if(!miniature&&root.EarthTownArchitecture?.draw(ctx,site,kind,slot,sx,sy,unit*size))return;
      if(miniature){ctx.fillStyle=kind==='home'?'#efcc92':'#c68160';ctx.fillRect(sx-unit*.5,sy-unit*.5,Math.max(1,unit),Math.max(1,unit*.75));return;}
      poly([[x-.30,y-.25],[x+.33,y-.25],[x+.33,y+.26],[x-.30,y+.26]],kind==='home'?'#e4b58d':'#ce8b6c','#79634e');
    }});
    for(const home of houses){
      const col=home.plot%cols,row=Math.floor(home.plot/cols),hx=startX+col,hy=startY+row;
      if(home.home)architecture(hx,hy,'home',(home.plot+home.home-1)%3,.20+.026*home.home);
      if(home.shop){const [sx,sy]=shopDoor(home.businessPlot);architecture(sx,sy,'market',0,.23);}
    }
    architecture(startX+.25,marketY,'exchange',0,.44);
    if(site.housing){
      architecture(startX-.4,marketY-.4,'hall',0,.38);
      for(const t of site.housing.titles){
        if(t.kind==='house'||t.kind==='shop')architecture(startX+t.plot%cols,startY-1-Math.floor(t.plot/cols),t.kind==='shop'?'market':'home',0,.26);
      }
      if(site.housing.project){
        const j=site.housing.project,[px,py]=project(startX+j.plot%cols,startY-1-Math.floor(j.plot/cols));
        ctx.fillStyle='#f1bc70';ctx.fillRect(px,py,Math.max(2,unit*.6),Math.max(1,unit*.3));
      }
    }
    for(const [i,b] of (site.buildings||[]).entries()){
      architecture(startX+1+(i%cols)*.7,marketY+Math.floor(i/cols)*.5,['market','hall','workshop'].includes(b.kind)?b.kind:'workshop',0,.28);
    }
    const settled=new Map(houses.map(h=>[h.owner,h]));
    for(const [i,person] of people.entries()){
      if(miniature&&i%4!==0)continue;
      const home=settled.get(person.identityKey||person.id)||houses[i%houses.length];if(!home)continue;
      const x=startX+home.plot%cols,y=startY+Math.floor(home.plot/cols)+.48;
      const road=home.roadLot||0;
      const destinations={food:[startX,startY-.2],repair:[startX+cols-1,marketY],exchange:[startX+.25,marketY],
        purchase:shopDoor(home.marketLot||0),shop:shopDoor(home.businessPlot||0),
        road:[startX+road%cols,startY+Math.floor(road/cols)+.49],home:[x,y],commitment:[x,marketY]};
      const [tx,ty]=destinations[home.activity]||[startX+.25,marketY];
      const phase=(time*.055+i*.267)%1,walk=Math.min(1,(1-Math.abs(phase*2-1))*1.6);
      const fx=x+(tx-x)*Math.min(1,walk*2),fy=y+(ty-y)*Math.max(0,walk*2-1);
      objects.push({depth:fx+fy+.05,paint(){const [sx,sy]=project(fx,fy),height=Math.max(3,unit*.25);
        if(miniature){ctx.fillStyle='#f9f3d3';ctx.fillRect(sx,sy,1,1);return;}
        ctx.fillStyle=['#e7a854','#5d8587','#b7684b','#879c56'][i%4];ctx.fillRect(sx-1.3,sy-height,2.6,height);
        ctx.fillStyle='#d6b295';ctx.beginPath();ctx.arc(sx,sy-height,1.3,0,Math.PI*2);ctx.fill();
      }});
    }
    const v=g?.vehicle||0,fx=startX+(1-Math.abs((time*.037%1)*2-1))*(cols-.5);
    objects.push({depth:fx+marketY+.1,paint(){const [vx,vy]=project(fx,marketY);
      if(miniature){ctx.fillStyle='#56635b';ctx.fillRect(vx,vy,2,1);return;}
      ctx.fillStyle=['#947451','#a57943','#679a9f','#70b4a0'][v];ctx.fillRect(vx-4-v,vy-4,8+2*v,4+v);
      if(v>=2){ctx.fillStyle='#d3e1dd';ctx.fillRect(vx+2,vy-6,4,3);}
      ctx.fillStyle='#263637';for(const dx of [-3,3]){ctx.beginPath();ctx.arc(vx+dx,vy+v,1.5,0,7);ctx.fill();}
    }});
    objects.sort((a,b)=>a.depth-b.depth).forEach(o=>o.paint());
    return {w:(w+h)*unit,h:(w+h)*unit*.49};
  }
  root.EarthRegionSettlement={draw};
})(globalThis);
