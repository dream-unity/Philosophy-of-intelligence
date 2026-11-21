/* An operating building closes when work is ordered. The lot and its original
   building record stay reserved until the crew clears it or the order is undone. */
(function(root){
  'use strict';

  const isOrder=job=>job?.scope==='street' && job.kind==='dismantle';
  const reject=reason=>({ok:false,available:false,reason,message:reason});
  const material=n=>n+' material'+(n===1?'':'s');
  const orders=site=>Object.values(site.dismantleOrders||{});

  function valid(site){
    const jobs=(site.construction||[]).filter(isOrder),receipts=site.dismantleOrders;
    if(receipts==null)return !jobs.length;
    if(typeof receipts!=='object'||Array.isArray(receipts))return false;
    const entries=Object.entries(receipts),ranks=new Set();
    if(entries.length!==jobs.length)return false;
    for(const [plot,rec] of entries){
      if(!/^[0-8]$/.test(plot)||!rec||!jobs.some(j=>j.plot===Number(plot)&&j.id===rec.id))return false;
      if(!Number.isInteger(rec.rank)||rec.rank<0||rec.rank>=site.buildings.length+jobs.length||ranks.has(rec.rank))return false;
      ranks.add(rec.rank);
    }
    return true;
  }

  function orderSpec(site,plot){
    const b=site?.buildings.find(b=>b.plot===plot),catalogue=root.CommonEarthSim?.buildings;
    if(!b||!catalogue||!Object.hasOwn(catalogue,b.kind))return reject('Choose an occupied district lot.');
    if(!root.EarthConstruction)return reject('Construction crews could not load. Reload the game to try again.');
    if(site.dismantleOrders?.[plot] || site.construction?.some(j=>j.scope==='street'&&j.plot===plot))return reject('This lot already has a work order.');
    const ids=new Set([...(site.buildings||[]),...(site.construction||[])].flatMap(j=>j.original?[j.id,j.original.id]:[j.id]));
    let serial=site.projectSerial||0,id;
    do{
      if(!Number.isSafeInteger(serial+1))return reject('This district cannot record another work order.');
      id=String(site.id).slice(0,420)+'-clear-'+(++serial);
    }while(ids.has(id));
    const recovered=Math.max(1,Math.floor(catalogue[b.kind].materials/2));
    return {ok:true,serial,spec:{id,scope:'street',kind:'dismantle',plot,name:('Dismantle '+b.name.toLowerCase()).slice(0,512),
      paid:{funds:0,materials:0},original:b,recovered}};
  }

  function preview(site,world,plot,withCrew=true){
    const order=orderSpec(site,plot);
    if(!order.ok)return order;
    const {spec}=order;
    const closed={...site,buildings:site.buildings.filter(b=>b.plot!==plot)};
    const staff=withCrew?root.EarthConstruction.preview(closed,world,spec,site):null;
    if(staff&&!staff.ok)return reject(staff.reason||'This lot cannot accept the order.');
    return {ok:true,available:true,reason:'',buildingId:spec.original.id,label:spec.original.name,
      recovered:spec.recovered,partners:[...(spec.original.partners||[])],crew:staff?.job||null};
  }

  function start(site,world,plot,expectedBuildingId){
    const order=orderSpec(site,plot);
    if(!order.ok)return order;
    const {spec}=order;
    if(spec.original.id!==expectedBuildingId)return reject('The building on this lot changed. Review it before dismantling.');
    // The active building array decides priority for markets sharing customers.
    // Count other reserved originals so concurrent undo operations restore it exactly.
    const activeIndex=site.buildings.indexOf(spec.original);
    let rank=activeIndex;
    for(const rec of orders(site).sort((a,b)=>a.rank-b.rank))if(rec.rank<=rank)rank++;
    site.buildings.splice(activeIndex,1);
    let booked;
    try{booked=root.EarthConstruction.start(site,world,spec);}
    catch{booked=reject('The dismantling order could not be reserved.');}
    finally{if(!booked?.ok)site.buildings.splice(activeIndex,0,spec.original);}
    if(!booked.ok)return reject(booked.reason||booked.message);
    site.projectSerial=order.serial;
    (site.dismantleOrders||={})[plot]={id:spec.id,rank};
    return {ok:true,job:booked.job,message:spec.original.name+' closed for dismantling on lot '+(plot+1)+'. The crew will recover '+material(spec.recovered)+' when the lot clears.'};
  }

  function activeOrder(site,jobOrId){
    const id=typeof jobOrId==='string'?jobOrId:jobOrId?.id;
    return site?.construction?.find(j=>j.id===id&&isOrder(j)&&site.dismantleOrders?.[j.plot]?.id===id);
  }
  function canCancel(site,jobOrId){
    const job=activeOrder(site,jobOrId);
    return !!job && job.work===0 && !site.buildings.some(b=>b.plot===job.plot||b.id===job.original.id);
  }
  function release(site,plot){
    delete site.dismantleOrders[plot];
    if(!Object.keys(site.dismantleOrders).length)delete site.dismantleOrders;
  }
  function cancel(site,jobOrId){
    const job=activeOrder(site,jobOrId);
    if(!job)return reject('This dismantling order is no longer active.');
    if(!canCancel(site,job))return reject('Physical dismantling has begun. Reassign the builders to pause this work.');
    const rank=site.dismantleOrders[job.plot].rank;
    const position=rank-orders(site).filter(r=>r.rank<rank).length;
    if(!root.EarthConstruction.cancel(site,job.id))return reject('This dismantling order is no longer active.');
    site.buildings.splice(position,0,job.original);
    release(site,job.plot);
    return {ok:true,message:job.original.name+' reopened on lot '+(job.plot+1)+'.'};
  }

  function finish(site,job){
    const rec=site?.dismantleOrders?.[job?.plot];
    if(!isOrder(job)||!rec||rec.id!==job.id||job.work!==job.total||
      site.construction?.some(j=>j.scope==='street'&&j.plot===job.plot)||site.buildings.some(b=>b.plot===job.plot))
      return reject('This dismantling order has not cleared the lot.');
    release(site,job.plot);
    for(const other of orders(site))if(other.rank>rec.rank)other.rank--;
    const recovered=Math.min(job.recovered,Number.MAX_SAFE_INTEGER-site.materials);
    site.materials+=recovered;
    const partners=site.residents.filter(p=>job.original.partners?.includes(p.id)),effects=[];
    if(partners.length){
      const oldTrust=site.trust;site.trust=Math.max(0,site.trust-2);
      if(oldTrust!==site.trust)effects.push((site.trust-oldTrust)+' trust');
      for(const person of partners){
        const before=person.bond;person.bond=Math.max(0,before-1);
        effects.push(person.name+(before>0?' −1 bond':' stayed at 0 bond'));
      }
    }
    return {ok:true,recovered,message:'Lot '+(job.plot+1)+' cleared. Recovered '+material(recovered)+'.'+(effects.length?' '+effects.join(' · ')+'.':'')};
  }

  root.EarthDismantling=Object.freeze({preview,start,canCancel,cancel,finish,valid});
})(typeof window==='undefined'?globalThis:window);
