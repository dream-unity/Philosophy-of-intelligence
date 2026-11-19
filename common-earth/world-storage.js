/* Compress only complete world payloads at the browser storage boundary.
   Registry records and exported files stay in their ordinary JSON format. */
(function(root){
  'use strict';
  const marker='~CEW1~',threshold=512*1024,maxLength=32*1024*1024,chunkSize=16384;
  const escape=0x8000,matchFirst=escape+1,maxMatch=0xd7ff-matchFirst+4,distanceLimit=0x8000;
  const wrappers=new WeakMap(),natives=new WeakMap(),recent=[],cacheLimit=24*1024*1024;
  let cachedUnits=0;
  const multiply=Math.imul,fromUnits=String.fromCharCode,min=Math.min;
  const endian=new Uint8Array(new Uint16Array([1]).buffer)[0]?'utf-16le':'utf-16be';
  const decoder=typeof TextDecoder==='function'?new TextDecoder(endian,{ignoreBOM:true,fatal:true}):null;
  function checksum(text){
    let a=1,b=0;
    for(let start=0;start<text.length;start+=4096){
      const end=min(start+4096,text.length);
      for(let i=start;i<end;i++){a+=text.charCodeAt(i);b+=a;}
      a%=65521;b%=65521;
    }
    return (b*65536+a)>>>0;
  }
  // A literal below 0x8000 uses its own code unit. Higher literals use an
  // escape. A match stores length and backward distance in two code units.
  // The representation never sends an unpaired surrogate to browser storage.
  function compress(text){
    const dictionary=new Int32Array(65536),out=new Uint16Array(chunkSize),parts=[];
    let filled=0,position=0,emitted=0;
    function emit(code){
      out[filled++]=code;emitted++;
      if(filled===chunkSize){parts.push(fromUnits.apply(null,out));filled=0;}
    }
    function hash(i){
      return multiply((text.charCodeAt(i)*31+text.charCodeAt(i+1))*31+text.charCodeAt(i+2),2654435761)^text.charCodeAt(i+3)*40503;
    }
    while(position<text.length){
      let count=0,offset=0;
      if(position+3<text.length){
        const slot=(hash(position)>>>8)&65535,prior=dictionary[slot]-1;
        dictionary[slot]=position+1;offset=position-prior;
        if(prior>=0&&offset<=distanceLimit&&text.charCodeAt(prior)===text.charCodeAt(position)&&
          text.charCodeAt(prior+1)===text.charCodeAt(position+1)&&text.charCodeAt(prior+2)===text.charCodeAt(position+2)&&
          text.charCodeAt(prior+3)===text.charCodeAt(position+3)){
          count=4;const limit=min(maxMatch,text.length-position);
          while(count<limit&&text.charCodeAt(prior+count)===text.charCodeAt(position+count))count++;
        }
      }
      if(count){
        emit(matchFirst+count-4);emit(offset-1);position+=count;
        if(position+1<text.length){
          const tail=position-2;
          dictionary[(hash(tail)>>>8)&65535]=tail+1;
        }
      }else{
        const code=text.charCodeAt(position++);
        if(code>=escape)emit(escape);
        emit(code&0x7fff);
      }
    }
    if(emitted+35>=text.length)return text;
    if(filled)parts.push(fromUnits.apply(null,out.subarray(0,filled)));
    const payload=parts.join('');
    return marker+text.length.toString(36)+'.'+checksum(text).toString(36)+'.'+checksum(payload).toString(36)+'.'+payload;
  }
  function header(text){
    if(!text.startsWith(marker))return null;
    const first=text.indexOf('.',marker.length),second=first<0?-1:text.indexOf('.',first+1);
    const end=second<0?-1:text.indexOf('.',second+1);
    if(first<0||second<0||end<0||end>marker.length+25)return null;
    const fields=[text.slice(marker.length,first),text.slice(first+1,second),text.slice(second+1,end)];
    if(fields.some(s=>!s.length||s.length>7||!/^[0-9a-z]+$/.test(s)))return null;
    const [length,hash,packedHash]=fields.map(s=>parseInt(s,36));
    if(length<threshold||length>maxLength||hash>0xffffffff||packedHash>0xffffffff||text.length-end-1>=length)return null;
    return {length,hash,packedHash,start:end+1};
  }
  function expand(packed,head){
    const out=new Uint16Array(head.length);
    let at=0;
    for(let i=head.start;i<packed.length;i++){
      const code=packed.charCodeAt(i);
      if(code<escape){
        if(at===out.length)return null;
        out[at++]=code;continue;
      }
      const next=packed.charCodeAt(++i);
      if(!Number.isInteger(next)||next>=escape)return null;
      if(code===escape){
        if(at===out.length)return null;
        out[at++]=escape+next;continue;
      }
      const count=code-matchFirst+4,distance=next+1;
      if(code>0xd7ff||distance>at||at+count>out.length)return null;
      for(let end=at+count;at<end;at++)out[at]=out[at-distance];
    }
    if(at!==out.length)return null;
    if(decoder){
      try{
        const raw=decoder.decode(out);
        return checksum(raw)===head.hash?raw:null;
      }catch{}
      // A directly imported JSON string can contain an unpaired surrogate.
      // Decode those code units exactly instead of retaining replacement text.
    }
    const parts=[];
    for(let i=0;i<at;i+=chunkSize)parts.push(fromUnits.apply(null,out.subarray(i,i+chunkSize)));
    const raw=parts.join('');
    return checksum(raw)===head.hash?raw:null;
  }
  function remember(raw,packed){
    const units=raw.length+(raw===packed?0:packed.length);
    if(units>cacheLimit)return;
    recent.unshift({raw,packed,units});cachedUnits+=units;
    while(recent.length>2||cachedUnits>cacheLimit)cachedUnits-=recent.pop().units;
  }
  function prepare(raw){
    if(typeof raw!=='string'||raw.length<threshold||raw.length>maxLength)return raw;
    const prior=recent.find(p=>p.raw===raw);if(prior)return prior.packed;
    const packed=compress(raw);remember(raw,packed);return packed;
  }
  function prime(raw,packed){
    if(typeof raw!=='string'||typeof packed!=='string'||raw.length<threshold)return false;
    if(recent.some(p=>p.raw===raw&&p.packed===packed))return true;
    const h=header(packed);
    if(!h||h.length!==raw.length||h.hash!==checksum(raw)||h.packedHash!==checksum(packed.slice(h.start)))return false;
    remember(raw,packed);return true;
  }
  function unpack(packed){
    if(typeof packed!=='string'||!packed.startsWith(marker))return packed;
    const previous=recent.find(p=>p.packed===packed);if(previous)return previous.raw;
    const h=header(packed);
    if(!h||h.packedHash!==checksum(packed.slice(h.start)))return packed;
    const raw=expand(packed,h);
    // The simulation's existing recovery path recognises unreadable JSON and
    // tries the last complete turn. Retain the failing physical value on disk.
    if(raw==null)return packed;
    remember(raw,packed);return raw;
  }
  function wrap(storage,worldKey){
    if(!storage)return storage;
    const native=natives.get(storage)||storage;
    let entry=wrappers.get(native);
    if(!entry){
      const keys=new Set();
      function payload(k){return standardKey(k)||keys.has(k);}
      const adapter={
        get length(){return native.length;},
        key:index=>native.key(index),
        getItem(k){const name=String(k),value=native.getItem(name);return payload(name)?unpack(value):value;},
        setItem(k,value){const name=String(k),raw=String(value);native.setItem(name,payload(name)?prepare(raw):raw);},
        removeItem:k=>native.removeItem(k)
      };
      // Some storage providers can read and write but cannot remove a backup.
      if(typeof native.removeItem!=='function')delete adapter.removeItem;
      entry={adapter,keys};wrappers.set(native,entry);natives.set(adapter,native);
    }
    if(worldKey&&!standardKey(worldKey)){entry.keys.add(worldKey);entry.keys.add(worldKey+'.previous');}
    return entry.adapter;
  }
  function standardKey(k){return k==='common-earth.world.v1'||k==='common-earth.world.v1.previous'||k.startsWith('common-earth.playthrough.v1.');}
  const nativeOf=storage=>natives.get(storage)||storage;
  root.EarthWorldStorage=Object.freeze({wrap,nativeOf,prepare,prime,unpack});
})(typeof window==='undefined'?globalThis:window);
