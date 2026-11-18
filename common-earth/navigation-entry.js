/* Featured landings and their commission briefs are embedded in the page.
   Load the detailed Natural Earth tables when a search, route or map pick needs them. */
(() => {
  'use strict';
  const data=document.getElementById('earth-opening-places');
  const openings=JSON.parse(data.textContent);
  const url=new URL(data.dataset.src,document.baseURI).href;
  let loading=null;
  function load(){
    if(window.EarthNavigation!==entry)return Promise.resolve(window.EarthNavigation);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=url;
      function failed(){
        script.remove();loading=null;
        reject(new Error('Place details could not load.'));
      }
      script.onerror=failed;
      script.onload=()=>{
        if(window.EarthNavigation===entry){failed();return;}
        resolve(window.EarthNavigation);
      };
      document.head.appendChild(script);
    });
    return loading;
  }
  function featured(){return openings.filter(row=>row.featured).map(row=>({...row.place}));}
  function scenario(point){
    if(!point||!Number.isFinite(point.lat)||!Number.isFinite(point.lon))return null;
    const rad=Math.PI/180;
    for(const row of openings){
      const pin=row.place;
      const h=Math.sin((point.lat-pin.lat)*rad/2)**2+Math.cos(point.lat*rad)*Math.cos(pin.lat*rad)*Math.sin((point.lon-pin.lon)*rad/2)**2;
      if(12742*Math.asin(Math.min(1,Math.sqrt(h)))<=40)return {...row.story};
    }
    return null;
  }
  const entry={featured,scenario,load,searchAsync:(...args)=>load().then(nav=>nav.searchAsync(...args))};
  window.EarthNavigation=Object.freeze(entry);
})();
