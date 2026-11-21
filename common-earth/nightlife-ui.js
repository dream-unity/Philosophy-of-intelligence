(function(root){
  'use strict';
  function mount({sim,street,enterStreet,worldChanged,notify}){
    const doc=root.document,$=id=>doc.getElementById(id);
    const clock=root.EarthDayClock,life=root.EarthNightlife,clockDialog=$('world-time-dialog'),room=$('leisure-dialog');
    if(!clockDialog||!room||!clock||!life)return null;
    const make=(tag,text)=>{const e=doc.createElement(tag);e.textContent=text;return e;};
    const button=(text,fn)=>{const b=make('button',text);b.type='button';b.addEventListener('click',fn);return b;};
    const put=(id,value)=>{const e=$(id);if(e.textContent!==value)e.textContent=value;};
    const lookup=id=>root.EarthCommunityLife.lookup(sim.state,id);
    let selected='nightclub',townId='',renderKey='',phaseKey='',match=null,atDoor=false,onTrip=0;
    const select=$('station-select');
    let cabinet=null,session=null;
    const pads=['◆','●','▲'],padNames=['Diamond','Circle','Triangle'];
    const bestKey='common-earth.signal-best.v1';
    let roundTimer=0,barTimer=0,nextTimer=0;
    function readBest(){try{const n=Number(root.localStorage?.getItem(bestKey));return Number.isSafeInteger(n)&&n>0&&n<=5?n:0;}catch{return 0;}}
    function saveBest(points){const prev=readBest();if(points>prev){try{root.localStorage?.setItem(bestKey,String(points));}catch{/* Ignore storage errors. */}}}
    function clearMatchTimers(){
      clearTimeout(roundTimer);clearInterval(barTimer);clearTimeout(nextTimer);
      roundTimer=0;barTimer=0;nextTimer=0;
      const meter=$('station-timer');if(meter)meter.hidden=true;
    }
    const currentTown=()=>lookup(townId);
    const player=()=>root.EarthAgency?.actorId(sim.active())||'steward';
    function showClock(){if(sim.active()&&!clockDialog.open){clockDialog.showModal();tick();}}
    async function pace(value){
      const result=await sim.perform('setWorldPace',value);
      if(!result.ok){notify(result.message,true);return;}
      tick();worldChanged();
    }
    for(const rate of clock.rates)$('world-rates').append(button(rate+'×',()=>pace(rate)));
    for(const b of clockDialog.querySelectorAll('[data-until]'))b.addEventListener('click',()=>pace(b.dataset.until));
    $('world-time').addEventListener('click',showClock);doc.addEventListener('earthworldclock',showClock);
    function open(kind='nightclub',siteId=sim.active()?.id){
      const site=lookup(siteId);if(!site)return;
      if(clockDialog.open)clockDialog.close();
      cabinet?.close();clearMatchTimers();
      selected=life.find(kind)?.id||'nightclub';townId=site.id;match=null;renderKey='';
      $('station-play').hidden=false;$('station-pads').hidden=true;$('station-select').disabled=false;
      if(!room.open)room.showModal();paint();
    }
    function choose(id){open(id,townId);}
    for(const v of life.venues)$('venue-choices').append(button(v.name,()=>choose(v.id)));
    $('venue-directory').addEventListener('click',()=>open());
    $('clock-venues').addEventListener('click',()=>open());
    $('venue-phase')?.addEventListener('click',()=>{
      const c=clock.read(sim.state);
      pace(c.night?'sunrise':'sunset');
    });
    $('venue-walk').addEventListener('click',()=>{
      const site=currentTown(),venue=life.find(selected),trip=++onTrip;
      if(!site||site.id!==sim.active()?.id)return;
      room.close();enterStreet();
      const sc=street(),who=player();
      if(sc?.getState().mode==='drive')sc.toggleVehicle();
      if(!sc?.focusVenue(venue.id,who,()=>{
        if(onTrip!==trip||sim.active()?.id!==site.id||player()!==who)return;
        open(venue.id,site.id);
      }))notify('Return to the street on foot to visit '+venue.name+'.',true);
      else if(!room.open)notify('Walking to '+venue.sign+'.');
    });
    function doorProof(site,venue){
      const who=player(),proof=street()?.venueProof(venue,who);
      return proof?.siteId===site.id&&proof.actor===who;
    }
    function stationChoice(){
      const tetris=select.value==='0';
      put('station-game',tetris?'Tetris':'Signal Match');
      put('station-play',tetris?'Play Tetris':'Play a round');
      if(!match){
        const best=readBest();
        put('station-prompt',tetris?'Fit falling pieces into complete horizontal lines to clear them.':
          'Match five symbols within four seconds each (keys 1, 2, 3 or buttons). Choose a resident to challenge or an open station to play solo.'+(best?' Best: '+best+'/5.':''));
      }
    }
    select.addEventListener('change',()=>{clearMatchTimers();match=null;$('station-select').disabled=false;$('station-pads').hidden=true;$('station-play').hidden=false;stationChoice();});
    function paint(){
      const site=currentTown();if(!site){room.close();return;}
      const w=sim.state,c=clock.read(w),v=life.find(selected);
      const self=site.id===w.activeId;
      atDoor=self&&doorProof(site,selected);
      if(cabinet?.active&&(!atDoor||session.actor!==player()||session.generation!==(site.foundingRevision||0)))cabinet?.close();
      const key=[site.id,selected,c.night,Math.floor(c.time/25000),atDoor,self,w.actionRevision,w.workRevision,w.week].join('|');
      if(key===renderKey)return;renderKey=key;
      const list=life.guests(w,site,c).filter(r=>r.venue===selected);
      const guests=list.map(r=>root.EarthPersonas.profile(site,r.id));
      put('leisure-town',site.name);put('venue-type',v.name);put('venue-name',v.sign);put('venue-detail',v.detail);
      for(const [i,b] of [...$('venue-choices').children].entries())b.setAttribute('aria-pressed',String(life.venues[i].id===selected));
      const ctx=$('venue-portrait').getContext('2d');
      if(ctx){ctx.clearRect(0,0,520,330);root.EarthNightlifeArt?.draw(ctx,selected,260,224,71,c.night);}
      const people=$('venue-attendance'),ul=doc.createElement('ul');
      people.replaceChildren(make('h3',selected==='arcade'?'Station floor':c.night?'Tonight’s company':'Daytime'));
      if(selected==='arcade'){
        for(const table of life.tables(w,site,c)){
          const names=table.pair.map(r=>root.EarthPersonas.profile(site,r.id)?.name);
          const text=names.length===2?names.join(' vs ')+(c.time%clock.day-clock.half>=25000?' · '+table.points.join(' – '):' · warm-up'):
            names.length?names[0]+' · solo practice':'Open for play';
          const label=table.seats.length===1?'Station '+(table.seats[0]+1):'Stations '+table.seats.map(n=>n+1).join(' & ');
          ul.append(make('li',label+(table.seats[0]===0?' · Tetris':' · Signal Match')+' · '+text));
        }
        people.append(ul);
        const old=select.value;
        select.replaceChildren(...Array.from({length:6},(_,i)=>{
          const r=list.find(row=>row.seat===i),option=make('option','Station '+(i+1)+(i===0?' · Tetris':' · Signal Match')+' · '+(r?root.EarthPersonas.profile(site,r.id).name:'Solo'));
          option.value=String(i);return option;
        }));
        select.value=old||'0';
        stationChoice();
      }else{
        people.append(make('p',guests.length?guests.map(p=>p.name).join(' · '):
          c.night?'The room is open. Guests arrive when their work is finished.':selected==='cafe'?'The reading terrace is open. The evening reading group meets after sunset.':'The dance floor opens at 6:00 PM.'));
      }
      $('venue-walk').hidden=!self||atDoor;put('venue-walk','Walk to '+v.sign);
      const phaseBtn=$('venue-phase');
      if(phaseBtn){
        const showPhase=self&&!c.night&&selected!=='arcade';
        phaseBtn.hidden=!showPhase;
        if(showPhase)put('venue-phase','Run to sunset (6:00 PM)');
      }
      $('station-room').hidden=selected!=='arcade'||!atDoor||!self;
    }
    function setPadsDisabled(disabled){
      for(const b of [...$('station-pads').children])b.disabled=disabled;
    }
    function nextSignal(){
      clearMatchTimers();
      if(!match)return;
      if(match.turn>=5){
        saveBest(match.points);
        $('station-select').disabled=false;
        const rival=match.rival,result=rival?(match.points>rival.points?'You won':match.points===rival.points?'Draw':rival.name+' won'):'Round complete';
        const best=readBest();
        put('station-prompt',result+' · You '+match.points+'/5'+(rival?' · '+rival.name+' '+rival.points+'/5':'')+(best?' · Best '+best+'/5':'')+'.');
        $('station-pads').hidden=true;$('station-play').hidden=false;match=null;return;
      }
      match.locked=false;
      match.symbol=Math.floor(Math.random()*pads.length);match.start=performance.now();
      setPadsDisabled(false);
      put('station-prompt',(match.rival?'Playing '+match.rival.name+' · ':'Solo · ')+'Round '+(match.turn+1)+'/5 · Score '+match.points+' · Match '+padNames[match.symbol]+' '+pads[match.symbol]);
      const meter=$('station-timer'),bar=$('station-timer-bar');
      if(meter&&bar){
        meter.hidden=false;bar.style.width='100%';
        barTimer=root.setInterval(()=>{
          if(!match||match.locked)return;
          const pct=Math.max(0,100-(performance.now()-match.start)/40);
          bar.style.width=pct.toFixed(1)+'%';
        },60);
      }
      roundTimer=root.setTimeout(()=>resolveSignal(-1,true),4000);
    }
    function resolveSignal(index,timedOut=false){
      if(!match||match.locked||match.turn>=5)return;
      match.locked=true;clearMatchTimers();setPadsDisabled(true);
      const hit=!timedOut&&index===match.symbol&&performance.now()-match.start<=4000;
      if(hit)match.points++;
      const feedback=hit?'Matched '+padNames[match.symbol]+' '+pads[match.symbol]+'!':
        timedOut?'Time’s up · needed '+padNames[match.symbol]+' '+pads[match.symbol]+'.':
        'Missed · needed '+padNames[match.symbol]+' '+pads[match.symbol]+'.';
      match.turn++;
      put('station-prompt',feedback+' Score '+match.points+'/'+match.turn+'.');
      nextTimer=root.setTimeout(()=>nextSignal(),match.turn>=5?650:520);
    }
    for(let i=0;i<pads.length;i++){
      const b=button((i+1)+' '+pads[i],()=>resolveSignal(i,false));
      b.setAttribute('aria-label',(i+1)+' · '+padNames[i]);$('station-pads').append(b);
    }
    room.addEventListener('keydown',e=>{
      if(!match||match.locked||e.ctrlKey||e.metaKey||e.altKey)return;
      const idx=['1','2','3'].indexOf(e.key);
      if(idx!==-1){e.preventDefault();resolveSignal(idx,false);}
    });
    $('station-pads').hidden=true;
    $('station-play').addEventListener('click',()=>{
      const site=currentTown();if(selected!=='arcade'||!site||site.id!==sim.active()?.id||!doorProof(site,'arcade'))return;
      if(select.value==='0'){
        const actor=player();
        session={actor,generation:site.foundingRevision||0};
        cabinet??=root.EarthTetrisUI.mount(doc);
        cabinet.open(root.EarthAgency.identity(site,actor).name);
        return;
      }
      const c=clock.read(sim.state),other=life.guests(sim.state,site,c).find(r=>r.venue==='arcade'&&r.seat===Number($('station-select').value));
      const rival=other?{name:root.EarthPersonas.profile(site,other.id).name,points:life.score(other.key,Math.floor(c.time/25000))}:null;
      match={turn:0,points:0,rival,locked:false};$('station-select').disabled=true;$('station-play').hidden=true;$('station-pads').hidden=false;nextSignal();
    });
    room.addEventListener('close',()=>{if(room.open)return;clearMatchTimers();cabinet?.close();match=null;$('station-select').disabled=false;$('station-play').hidden=false;$('station-pads').hidden=true;});
    function tick(){
      const w=sim.state,active=sim.active(),c=clock.read(w);
      $('world-time').disabled=!active;$('venue-directory').disabled=!active;
      put('day-indicator',c.phase);put('day-time',c.label);put('time-rate',c.rate+'×');
      $('world-time').toggleAttribute('data-night',c.night);
      if(clockDialog.open){
        put('world-clock-reading',c.phase+' '+(c.cycle+1)+' · '+c.label+' · '+c.rate+'×');
        for(const [i,b] of [...$('world-rates').children].entries())b.setAttribute('aria-pressed',String(clock.rates[i]===c.rate));
      }
      const phase=[active?.id,w.dayClock?.origin,c.cycle,c.night,c.rate].join('/');
      if(phase!==phaseKey){phaseKey=phase;doc.dispatchEvent(new Event('earthdaychange'));}
      if(room.open)paint();
    }
    const timer=root.setInterval(()=>{if(!doc.hidden)tick();},400);
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)tick();});tick();
    return {open,tick};
  }
  root.EarthNightlifeUI={mount};
})(globalThis);
