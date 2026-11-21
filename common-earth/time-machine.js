/* Checkpoints live outside the simulation. Forking never embeds a world inside
   the next save, and optional time travel never consumes the autosave quota. */
(function(root){
  'use strict';
  const slots={origin:1,week:3,order:2,manual:3};
  const buckets=Object.entries(slots).flatMap(([kind,n])=>Array.from({length:n},(_,i)=>kind+'-'+i));
  function create(){
    const memory=new Map();let opening,temporary=false;
    function database(){
      if(opening)return opening;
      return opening=new Promise(resolve=>{
        const unavailable=()=>{temporary=true;resolve(null);};
        try{
          if(!root.indexedDB){unavailable();return;}
          const request=root.indexedDB.open('common-earth.time-machine.v1',1);
          request.onupgradeneeded=()=>{for(const table of ['moments','titles'])request.result.createObjectStore(table);};
          request.onsuccess=()=>resolve(request.result);request.onerror=unavailable;request.onblocked=unavailable;
        }catch{unavailable();}
      });
    }
    const key=(slot,kind)=>slot+'/'+kind;
    async function fetch(slot,kind,full){
      const id=key(slot,kind),db=await database();
      if(memory.has(id))return full?memory.get(id):memory.get(id).meta;
      if(!db)return null;
      return new Promise(resolve=>{
        try{
          const req=db.transaction(full?'moments':'titles').objectStore(full?'moments':'titles').get(id);
          req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null);
        }catch{resolve(null);}
      });
    }
    function snapshot(w,kind,title){
      if(!Object.hasOwn(slots,kind)||!w.dayClock||!w.sites.length)return null;
      const at=Date.now(),c=root.EarthDayClock.read(w,at);
      return {meta:{kind,title,week:w.week,at,elapsed:c.time,label:c.label,origin:w.dayClock.origin,revision:w.actionRevision||0},world:JSON.stringify(w)};
    }
    async function write(slot,row){
      if(!row)return false;
      const meta=row.meta,kind=meta.kind,head=key(slot,kind+'-head'),db=await database();
      function next(last){
        if(last?.origin===meta.origin&&(kind==='origin'||last.revision>meta.revision||last.at>meta.at))return false;
        const i=last?.origin===meta.origin?(last.index+1)%slots[kind]:0;
        meta.bucket=kind+'-'+i;return {origin:meta.origin,revision:meta.revision,at:meta.at,index:i};
      }
      if(db){
        const saved=await new Promise(resolve=>{
          try{
            const tx=db.transaction(['moments','titles'],'readwrite'),titles=tx.objectStore('titles');
            const request=titles.get(head);
            request.onsuccess=()=>{
              const h=next(request.result);if(!h)return;
              const id=key(slot,meta.bucket);
              tx.objectStore('moments').put(row,id);titles.put(meta,id);titles.put(h,head);
            };
            tx.oncomplete=()=>resolve(true);tx.onabort=tx.onerror=()=>resolve(false);
          }catch{resolve(false);}
        });
        if(saved){if(meta.bucket)memory.delete(key(slot,meta.bucket));return true;}
      }
      temporary=true;const h=next(memory.get(head));
      if(h){memory.set(head,h);memory.set(key(slot,meta.bucket),row);}
      return true;
    }
    function capture(slot,w,kind,title){return write(slot,snapshot(w,kind,title));}
    async function list(slot,origin){
      const rows=await Promise.all(buckets.map(bucket=>fetch(slot,bucket,false)));
      return rows.filter(r=>r&&r.origin===origin).sort((a,b)=>b.at-a.at||b.revision-a.revision);
    }
    async function restore(slot,selected,origin){
      if(!selected||!buckets.includes(selected.bucket))return null;
      const row=await fetch(slot,selected.bucket,true),m=row?.meta;
      if(!m||m.origin!==origin||m.at!==selected.at||m.revision!==selected.revision)return null;
      const w=root.CommonEarthSim.readSave(row.world);if(!w?.dayClock)return null;
      const at=Date.now(),shift=at-m.at;
      w.dayClock={origin:m.origin,at,elapsed:m.elapsed,rate:1};
      if(w.constructionThrough!=null)w.constructionThrough=at;
      const move=(obj,field)=>{if(Number.isSafeInteger(obj?.[field]))obj[field]=Math.max(0,obj[field]+shift);};
      move(w.communityLife?.journey,'start');
      for(const s of [...w.sites,...(w.communityLife?.outposts||[])]){
        move(s.handline,'castAt');move(s.pursuits?.ticket,'started');move(s.communityLife?.border?.street,'nextStrike');
      }
      const raw=JSON.stringify(w);return root.CommonEarthSim.readSave(raw)?raw:null;
    }
    async function clearSlot(slot){
      if(typeof slot!=='string'||!slot)return false;
      const keys=[...buckets,...Object.keys(slots).map(kind=>kind+'-head')].map(k=>key(slot,k));
      for(const k of keys)memory.delete(k);
      const db=await database();
      if(db){
        await new Promise(resolve=>{
          try{
            const tx=db.transaction(['moments','titles'],'readwrite');
            const moments=tx.objectStore('moments'),titles=tx.objectStore('titles');
            for(const k of keys){moments.delete(k);titles.delete(k);}
            tx.oncomplete=()=>resolve(true);tx.onabort=tx.onerror=()=>resolve(true);
          }catch{resolve(true);}
        });
      }
      return true;
    }
    return {capture,snapshot,write,list,restore,clearSlot,get temporary(){return temporary;}};
  }
  root.EarthTimeMachine={create};
})(globalThis);
