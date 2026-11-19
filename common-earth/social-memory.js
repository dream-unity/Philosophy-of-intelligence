/* A working relationship belongs to the people. Stable personal identities
   prevent a migrant from inheriting the friendships of a reused street slot. */
(function(root){
  'use strict';
  const kinds=Object.freeze({
    visit:[1,'made time to meet'],meal:[1,'shared a meal'],listen:[1,'listened and followed up'],
    project:[2,'worked together on a project'],lesson:[2,'shared a practical lesson'],
    cover:[2,'covered a colleague’s work'],office:[2,'helped organise handover records'],kept:[2,'kept a promise'],missed:[-3,'missed a promised date']
  });
  const cap=12,identities=new WeakMap(),safeInteger=Number.isSafeInteger,isArray=Array.isArray;
  const kindFlags=new Map(Object.keys(kinds).map((kind,index)=>[kind,1<<index]));
  const integer=(n,min,max)=>safeInteger(n)&&n>=min&&n<=max;
  const string=(s,max)=>typeof s==='string'&&s.length>0&&s.length<=max;
  function legacyToken(p){
    let key=identities.get(p);
    if(!key){key=JSON.stringify([p.name,p.home||'',p.originRole||p.role||'']);identities.set(p,key);}
    return key;
  }
  const token=p=>p.identityKey||legacyToken(p);
  // A legacy tie has only a name, home region, role and last known street
  // slot. Upgrade it at the next shared encounter with that same local.
  function matches(entry,person){
    return entry.identity===token(person)||entry.identity[0]==='['&&entry.id===person.id&&
      legacyToken(person)===entry.identity;
  }
  function effective(entry,week){
    const seasons=Math.max(0,Math.floor((week-entry.week)/26));
    return Math.sign(entry.strength)*Math.max(0,Math.abs(entry.strength)-seasons);
  }
  function strength(row,other,week){
    if(!row?.ties?.length||!other)return 0;
    const entry=row.ties.find(t=>matches(t,other));
    return entry?effective(entry,week):0;
  }
  function record(row,peer,week,kind){
    if(!peer||!Object.hasOwn(kinds,kind)||!integer(week,1,Number.MAX_SAFE_INTEGER))return false;
    const ties=row.ties||=[],key=token(peer);
    let item=ties.find(t=>matches(t,peer));
    if(item&&week<item.week||item?.week===week&&item.seen.includes(kind))return false;
    if(!item){
      if(ties.length===cap){
        let replace=0;
        for(let i=1;i<ties.length;i++){
          const old=ties[replace],next=ties[i];
          if(Math.abs(effective(next,week))<Math.abs(effective(old,week))||
            Math.abs(effective(next,week))===Math.abs(effective(old,week))&&next.week<old.week)replace=i;
        }
        ties.splice(replace,1);
      }
      item={id:peer.id,name:peer.name,identity:key,strength:0,week,kind,seen:[]};ties.push(item);
    }
    const previous=effective(item,week);
    if(item.week!==week)item.seen=[];
    item.seen.push(kind);
    item.id=peer.id;item.identity=key;item.week=week;item.kind=kind;item.strength=Math.max(-6,Math.min(10,previous+kinds[kind][0]));
    return true;
  }
  function contacts(site,id,week){
    const ties=site.autonomy?.people?.[id]?.ties;
    if(!ties?.length)return [];
    let indexed=null;
    function resolve(entry){
      const near=root.EarthPersonas?.profile(site,entry.id)||site.residents?.find(p=>p.id===entry.id);
      if(near&&matches(entry,near) && root.EarthCommunityLife?.present?.(site,entry.id)!==false)return near;
      if(!indexed){
        const people=root.EarthPersonas?.list(site)||site.residents||[];
        indexed=new Map(people.map(p=>[token(p),p]));
      }
      return indexed.get(entry.identity);
    }
    return ties.map(entry=>{
      const peer=resolve(entry);
      return {id:peer?.id||entry.id,name:entry.name,strength:effective(entry,week),kind:entry.kind,
        week:entry.week,here:!!peer,reason:kinds[entry.kind][1]};
    }).filter(v=>v.strength).sort((a,b)=>Math.abs(b.strength)-Math.abs(a.strength)||b.week-a.week||a.name.localeCompare(b.name));
  }
  function valid(ties,week){
    if(!isArray(ties)||ties.length>cap)return false;
    const peers=new Set();
    for(const entry of ties){
      if(!entry||!string(entry.id,512)||!string(entry.name,512)||!string(entry.identity,1040)||
        !integer(entry.strength,-6,10)||!integer(entry.week,1,week)||peers.has(entry.identity))return false;
      peers.add(entry.identity);
      const current=kindFlags.get(entry.kind),seen=entry.seen;
      if(!current||!isArray(seen)||!seen.length||seen.length>kindFlags.size)return false;
      if(seen.length===1){if(seen[0]!==entry.kind)return false;continue;}
      let mask=0;
      for(const kind of seen){
        const flag=kindFlags.get(kind);
        if(!flag||(mask&flag))return false;
        mask|=flag;
      }
      if(!(mask&current))return false;
    }
    return true;
  }
  root.EarthRelationships=Object.freeze({record,strength,contacts,valid});
})(typeof window==='undefined'?globalThis:window);
