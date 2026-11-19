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
  function encodeBlock(text,dictionary,history){
    const out=new Uint16Array(chunkSize),parts=[];
    let filled=0,position=0;
    function emit(code){
      out[filled++]=code;
      if(filled===chunkSize){parts.push(fromUnits.apply(null,out));filled=0;}
    }
    function hash(i){
      return multiply((text.charCodeAt(i)*31+text.charCodeAt(i+1))*31+text.charCodeAt(i+2),2654435761)^text.charCodeAt(i+3)*40503;
    }
    while(position<text.length){
      let count=0,offset=0;
      if(position+3<text.length){
        const slot=(hash(position)>>>8)&65535,prior=dictionary[slot]-1;
        dictionary[slot]=position+1;
        if(history){
          // Keep a short chain only for the optional dense pass. A recently
          // used JSON prefix may lead to a much longer match one receipt back.
          history[position&32767]=prior>=0&&position-prior<distanceLimit?position-prior:0;
          let candidate=prior,attempts=12;
          const limit=min(maxMatch,text.length-position);
          while(candidate>=0&&position-candidate<=distanceLimit&&attempts--){
            if(text.charCodeAt(candidate+count)===text.charCodeAt(position+count)&&
               text.charCodeAt(candidate)===text.charCodeAt(position)&&
               text.charCodeAt(candidate+1)===text.charCodeAt(position+1)&&
               text.charCodeAt(candidate+2)===text.charCodeAt(position+2)&&
               text.charCodeAt(candidate+3)===text.charCodeAt(position+3)){
              let length=4;
              while(length<limit&&text.charCodeAt(candidate+length)===text.charCodeAt(position+length))length++;
              if(length>count){count=length;offset=position-candidate;if(count===limit||count>=1024)break;}
            }
            const back=history[candidate&32767];if(!back)break;candidate-=back;
          }
        }else if(prior>=0&&position-prior<=distanceLimit&&text.charCodeAt(prior)===text.charCodeAt(position)&&
          text.charCodeAt(prior+1)===text.charCodeAt(position+1)&&text.charCodeAt(prior+2)===text.charCodeAt(position+2)&&
          text.charCodeAt(prior+3)===text.charCodeAt(position+3)){
          offset=position-prior;count=4;const limit=min(maxMatch,text.length-position);
          while(count<limit&&text.charCodeAt(prior+count)===text.charCodeAt(position+count))count++;
        }
      }
      if(count){
        emit(matchFirst+count-4);emit(offset-1);
        const end=position+count;
        if(history){
          for(let i=position+1;i<end&&i+3<text.length;i++){
            const slot=(hash(i)>>>8)&65535,back=i+1-dictionary[slot];
            history[i&32767]=dictionary[slot]&&back<distanceLimit?back:0;
            dictionary[slot]=i+1;
          }
        }else if(end+1<text.length){
          const tail=end-2;
          dictionary[(hash(tail)>>>8)&65535]=tail+1;
        }
        position=end;
      }else{
        const code=text.charCodeAt(position++);
        if(code>=escape)emit(escape);
        emit(code&0x7fff);
      }
    }
    if(filled)parts.push(fromUnits.apply(null,out.subarray(0,filled)));
    return parts.join('');
  }
  // Each block starts with an empty match dictionary. Joining their encoded
  // payloads therefore produces exactly the same stream format older readers
  // already understand, including back-references within a block.
  const blockMin=64*1024,blockMax=256*1024,modulus=65521;
  const reusableSize=text=>text.length>=threshold*2&&text.length<=cacheLimit;
  let lastBlocks=null;
  function joinChecksum(sum,part,length){
    const a=sum&65535;
    const nextA=(a+(part&65535)-1+modulus)%modulus;
    const nextB=((sum>>>16)+(part>>>16)+(length%modulus)*(a-1)+modulus)%modulus;
    return (nextB*65536+nextA)>>>0;
  }
  function packedText(length,rawSum,payloadSum,payload){
    return marker+length.toString(36)+'.'+rawSum.toString(36)+'.'+payloadSum.toString(36)+'.'+payload;
  }
  function compressWhole(text,dense=false){
    const payload=encodeBlock(text,new Int32Array(65536),dense?new Uint16Array(distanceLimit):null);
    if(payload.length+35>=text.length)return text;
    return packedText(text.length,checksum(text),checksum(payload),payload);
  }
  function compress(text,dense=false){
    if(!reusableSize(text)){lastBlocks=null;return compressWhole(text,dense);}
    const dictionary=new Int32Array(65536),history=dense?new Uint16Array(distanceLimit):null,parts=[],next=new Map();
    const mode=dense?'dense':'normal';
    const minSize=text.length>4*1024*1024?256*1024:blockMin,maxSize=text.length>4*1024*1024?1024*1024:blockMax;
    let rawSum=1,packedSum=1,packedLength=0,boundary=0,used=false;
    for(let start=0;start<text.length;){
      let end=min(text.length,start+maxSize);
      if(end<text.length){
        // Prefer a district header so editing one local record does not move
        // every later boundary. Arbitrary strings still have bounded blocks.
        if(boundary>=0&&boundary<start+minSize)boundary=text.indexOf(',"region":',start+minSize);
        if(boundary>=start+minSize&&boundary<end)end=boundary;
      }
      const raw=text.slice(start,end);
      const prior=lastBlocks?.get(raw.length)?.find(item=>item.raw===raw);
      // Keep slices of the current source; each size mode can reuse the same
      // district boundary and checksum. An edit only re-encodes affected blocks.
      const block=prior?{...prior,raw}:{raw,rawSum:checksum(raw)};
      if(!block[mode]){
        if(used){dictionary.fill(0);if(history)history.fill(0);}
        used=true;
        const packed=encodeBlock(raw,dictionary,history);
        block[mode]={packed,sum:checksum(packed)};
      }
      const sameLength=next.get(raw.length);
      if(sameLength)sameLength.push(block);else next.set(raw.length,[block]);
      const encoded=block[mode];
      parts.push(encoded.packed);
      packedLength+=encoded.packed.length;
      rawSum=joinChecksum(rawSum,block.rawSum,raw.length);
      packedSum=joinChecksum(packedSum,encoded.sum,encoded.packed.length);
      start=end;
    }
    if(packedLength+35>=text.length){lastBlocks=null;return text;}
    lastBlocks=next;
    return packedText(text.length,rawSum,packedSum,parts.join(''));
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
      if(++i===packed.length)return null;
      const next=packed.charCodeAt(i);
      if(next>=escape)return null;
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
  function remember(raw,packed,dense=false){
    const units=raw.length+(raw===packed?0:packed.length);
    if(units>cacheLimit)return;
    const existing=recent.findIndex(entry=>entry.raw===raw);
    if(existing!==-1)cachedUnits-=recent.splice(existing,1)[0].units;
    recent.unshift({raw,packed,units,dense});cachedUnits+=units;
    while(recent.length>2||cachedUnits>cacheLimit)cachedUnits-=recent.pop().units;
  }
  function prepare(raw){
    if(typeof raw!=='string'||raw.length<threshold||raw.length>maxLength)return raw;
    const prior=recent.find(p=>p.raw===raw);if(prior)return prior.packed;
    const packed=compress(raw);remember(raw,packed);return packed;
  }
  function prepareDense(raw){
    const packed=prepare(raw);
    if(typeof raw!=='string'||raw.length<threshold||raw.length>maxLength)return packed;
    if(recent.some(item=>item.raw===raw&&item.dense))return packed;
    const alternative=compress(raw,true);
    const best=alternative.length<packed.length?alternative:packed;
    remember(raw,best,true);
    return best;
  }
  function tightest(raw,packed){
    if(!reusableSize(raw)||recent.some(item=>item.raw===raw&&item.dense==='whole'))return packed;
    const whole=compressWhole(raw,true);
    const best=whole.length<packed.length?whole:packed;
    remember(raw,best,'whole');return best;
  }
  function prime(raw,packed,dense=false){
    if(typeof raw!=='string'||typeof packed!=='string'||raw.length<threshold)return false;
    const cached=recent.find(p=>p.raw===raw&&p.packed===packed);
    if(cached){if(dense&&!cached.dense)cached.dense=true;return true;}
    const h=header(packed);
    if(!h||h.length!==raw.length||h.hash!==checksum(raw)||h.packedHash!==checksum(packed.slice(h.start)))return false;
    remember(raw,packed,dense);return true;
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
      function writeWorld(name,raw){
        const packed=prepare(raw);
        try{native.setItem(name,packed);return packed;}
        catch(error){
          if(error?.name==='SecurityError')throw error;
          const dense=prepareDense(raw);
          if(dense.length<packed.length){
            try{native.setItem(name,dense);return dense;}catch(retry){error=retry;}
          }
          // A single dictionary can recover the remaining block-boundary
          // overhead when a save is right at the device's storage limit.
          const whole=tightest(raw,dense);
          if(whole.length>=dense.length)throw error;
          native.setItem(name,whole);return whole;
        }
      }
      const adapter={
        get length(){return native.length;},
        key:index=>native.key(index),
        writeWorld,
        getItem(k){const name=String(k),value=native.getItem(name);return payload(name)?unpack(value):value;},
        setItem(k,value){
          const name=String(k),raw=String(value);
          if(!payload(name)){native.setItem(name,raw);return;}
          writeWorld(name,raw);
        },
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
  root.EarthWorldStorage=Object.freeze({wrap,nativeOf,prepare,prepareDense,prime,unpack});
})(typeof window==='undefined'?globalThis:window);
