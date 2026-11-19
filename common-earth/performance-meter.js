/* Optional on-device diagnostics. Open the normal game with ?profile=1. */
(function(root){
  'use strict';
  if(!root.document || !root.location?.search || new URLSearchParams(root.location.search).get('profile')!=='1')return;
  const now=()=>root.performance.now();
  const series=new Map(),scenes=new WeakMap(),gestures=new Set();
  let pulse=0,lastPulse=0;
  function record(key,value){
    if(!Number.isFinite(value)||value<0)return;
    let sample=series.get(key);
    if(!sample){sample={values:new Float64Array(360),count:0};series.set(key,sample);}
    sample.values[sample.count++%sample.values.length]=value;
  }
  function sample(key){
    const stream=series.get(key);
    if(!stream||!stream.count)return null;
    const n=Math.min(stream.count,stream.values.length);
    const values=Array.from(stream.values.subarray(0,n)).sort((a,b)=>a-b);
    return {n,median:values[Math.floor((n-1)/2)],p95:values[Math.ceil(n*.95)-1],
      average:values.reduce((sum,v)=>sum+v,0)/n};
  }
  function scene(canvas){
    let state=scenes.get(canvas);
    if(!state){state={last:0,input:null,eventAt:0};scenes.set(canvas,state);}
    return state;
  }
  // Separately sample what the browser delivers while an actual finger is on
  // the canvas. This distinguishes sparse host frames from expensive painting.
  function heartbeat(at){
    pulse=0;
    if(!gestures.size||root.document.hidden){lastPulse=0;return;}
    if(lastPulse)record('host',at-lastPulse);
    lastPulse=at;pulse=root.requestAnimationFrame(heartbeat);
  }
  function begin(canvas){
    const state=scene(canvas);state.last=0;state.eventAt=0;state.input=null;
    gestures.add(canvas);
    if(!pulse)pulse=root.requestAnimationFrame(heartbeat);
  }
  function end(canvas){
    gestures.delete(canvas);
    if(!gestures.size){if(pulse)root.cancelAnimationFrame(pulse);pulse=0;lastPulse=0;}
  }
  function input(canvas,event){
    const state=scene(canvas),at=now();
    const eventAt=event.timeStamp>0&&event.timeStamp<=at?event.timeStamp:at;
    if(state.input===null)state.input=eventAt;
    if(event.type==='pointermove'){
      if(state.eventAt)record('events',at-state.eventAt);
      state.eventAt=at;record('delivery',at-eventAt);
    }
  }
  function painted(canvas,started,moving){
    const at=now(),state=scene(canvas);
    record('draw',at-started);
    if(moving&&state.last)record('frame',at-state.last);
    state.last=moving?at:0;
    if(state.input!==null){record('input',at-state.input);state.input=null;}
  }
  function suspend(canvas){end(canvas);scenes.delete(canvas);}
  if(root.PerformanceObserver?.supportedEntryTypes?.includes('longtask')){
    const observer=new root.PerformanceObserver(list=>{
      for(const task of list.getEntries())record('longtask',task.duration);
    });
    observer.observe({type:'longtask',buffered:true});
  }
  const millis=n=>n.toFixed(n<10?1:0)+' ms';
  function show(){
    const doc=root.document,panel=doc.createElement('details'),head=doc.createElement('summary'),body=doc.createElement('div');
    head.textContent='Performance';panel.append(head,body);
    Object.assign(panel.style,{position:'fixed',top:'4.8rem',right:'.7rem',zIndex:'150',maxWidth:'min(30rem, 92vw)',
      background:'#142b2f',color:'#f1eedc',border:'1px solid #758b80',borderRadius:'.35rem',padding:'.45rem .65rem',
      font:'14px/1.5 system-ui, sans-serif',boxShadow:'0 2px 10px #0006',maxHeight:'75dvh',overflow:'auto'});
    head.style.cursor='pointer';body.style.whiteSpace='pre-line';doc.body.append(panel);
    function draw(){
      if(!panel.open||doc.hidden)return;
      const nav=root.performance.getEntriesByType('navigation')[0],items=[];
      if(nav){
        items.push('HTML response '+millis(nav.responseEnd-nav.startTime));
        if(nav.domContentLoadedEventEnd)items.push('Page ready '+millis(nav.domContentLoadedEventEnd-nav.startTime));
      }
      const frame=sample('frame');
      items.push(frame?'Active motion '+(1000/frame.average).toFixed(1)+' FPS · p95 interval '+millis(frame.p95)+' ('+frame.n+' intervals)':'Drag the map to measure active motion.');
      for(const [key,label] of [['host','Browser frame interval during drag'],['events','Drag event interval'],['delivery','Event delivery'],['longtask','Page long tasks'],['draw','Scene drawing'],['input','Touch to completed draw'],['path','Street pathfinding'],['open','World open'],['week','Week simulation'],['workerWeek','Worker week simulation'],['production','Production round'],['productionUI','Production interface refresh'],['workerProduction','Worker production round'],['save','World save']]){
        const value=sample(key);
        if(value)items.push(label+' '+millis(value.median)+' median · '+millis(value.p95)+' p95 ('+value.n+')');
      }
      body.textContent=items.join('\n');
    }
    panel.addEventListener('toggle',draw);root.setInterval(draw,1250);
  }
  root.EarthPerformance=Object.freeze({now,finish:(key,at)=>record(key,now()-at),record,begin,end,input,painted,suspend,sample});
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})(typeof window==='undefined'?globalThis:window);
