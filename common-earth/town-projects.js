/* Outdoor works sit on the existing buildable lots; the art is decoded only when
   such a project is visible. Keep the procedural project visible during loading. */
(() => {
  'use strict';
  const frames = {
    garden:  {crop:[3,4,378,215], width:6.1, front:1.49},
    wetland: {crop:[387,11,378,202], width:5.8, front:1.45},
    pier:    {crop:[5,228,373,216], width:5.9, front:1.46},
    depot:   {crop:[90,452,203,216], width:4.70, front:1.29},
    seaFarm: {crop:[387,230,378,211], width:5.9, front:1.45}
  };
  const script = typeof document === 'undefined' ? null : document.currentScript?.src;
  const file = script ? new URL('art/outdoor-projects.webp', script).href : 'art/outdoor-projects.webp';
  let sheet=null, loading=false, mask=null;
  const listeners=new Set();
  function watch(callback){listeners.add(callback);return ()=>listeners.delete(callback);}
  function frameFor(site,kind){
    let name=kind;
    if(kind==='garden'&&site.water)name='seaFarm';
    if(kind==='pier'&&!site.water)name='depot';
    return frames[name];
  }
  function draw(ctx,site,kind,project,x,y,unit){
    const frame=frameFor(site,kind);
    if(!frame)return false;
    if(!sheet){
      if(!loading&&typeof Image==='function'){
        loading=true;
        const image=new Image();
        image.decoding='async';
        image.onload=()=>{sheet=image;for(const callback of listeners)callback();};
        image.src=file;
      }
      return false;
    }
    const [sx,sy,w,h]=frame.crop;
    const [px,py]=project(x,y);
    const span=frame.width*unit,height=h/w*span;
    ctx.drawImage(sheet,sx,sy,w,h,px-span/2,py+frame.front*unit-height,span,height);
    return true;
  }
  function hitMask(){
    try{
      const tile=document.createElement('canvas');
      tile.width=Math.ceil(sheet.naturalWidth/4);tile.height=Math.ceil(sheet.naturalHeight/4);
      const g=tile.getContext('2d',{willReadFrequently:true});
      g.drawImage(sheet,0,0,tile.width,tile.height);
      const rgba=g.getImageData(0,0,tile.width,tile.height).data;
      const alpha=new Uint8Array(tile.width*tile.height);
      for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
      return {width:tile.width,alpha};
    }catch{return false;}
  }
  function contains(site,kind,dx,dy,unit){
    const frame=frameFor(site,kind);
    if(!frame||!sheet||!(unit>0))return undefined;
    const [sx,sy,w,h]=frame.crop,scale=frame.width*unit/w;
    const x=dx/scale+w/2,y=(dy-frame.front*unit)/scale+h;
    if(x<0||x>=w||y<0||y>=h)return false;
    if(mask===null)mask=hitMask();
    if(!mask)return undefined;
    return mask.alpha[Math.floor((sy+y)/4)*mask.width+Math.floor((sx+x)/4)]>=50;
  }
  window.EarthTownProjects=Object.freeze({draw,contains,watch});
})();
