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
      cabinet?.close();
      selected=life.find(kind)?.id||'nightclub';townId=site.id;match=null;renderKey='';
      $('station-play').hidden=false;$('station-pads').hidden=true;$('station-select').disabled=false;
      if(!room.open)room.showModal();paint();
    }
    function choose(id){open(id,townId);}
    for(const v of life.venues)$('venue-choices').append(button(v.name,()=>choose(v.id)));
    $('venue-directory').addEventListener('click',()=>open());
    $('clock-venues').addEventListener('click',()=>open());
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
      if(!match)put('station-prompt',tetris?'Fit falling pieces into complete horizontal lines to clear them.':
        'Match five symbols. You have four seconds for each one. Choose a resident to challenge or an open station to play solo.');
    }
    select.addEventListener('change',()=>{match=null;stationChoice();});
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
      if($('venue-phase'))put('venue-phase',selected==='cafe'?'Open all day · Books & espresso served now':c.night?'Evening session · '+c.label:'Daytime hours · '+c.label);
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
      $('station-room').hidden=selected!=='arcade'||!atDoor||!self;
      const cafeRoom=$('cafe-room');
      if(cafeRoom){
        const showCafe=selected==='cafe'&&self;
        cafeRoom.hidden=!showCafe;
        if(showCafe)renderCafe(site,cafeRoom);
      }
    }
    function renderCafe(site,host){
      const st=life.ensureCafe(site);
      const actor=player();
      const who=root.EarthAgency?.identity?.(site,actor)?.name||'Steward';
      const purseBal=root.EarthPurses?.account?.(site,actor)?.balance??0;
      const townFunds=site.funds||0;
      const book=life.BOOKS.find(b=>b.id===st.bookId)||life.BOOKS[0];
      const pageIdx=Math.max(0,Math.min(book.pages.length-1,st.page||0));
      host.replaceChildren();

      // 1. Seating & Reading Table Bar
      const seatPanel=doc.createElement('div');seatPanel.className='cafe-panel';
      const seatBar=doc.createElement('div');seatBar.className='cafe-seat-bar';
      const seatInfo=doc.createElement('div');
      seatInfo.append(
        make('strong',st.seated?who+' is seated at a Reading Room table':'Take a seat at The Reading Room'),
        make('p',st.seated?'Relaxed at the terrace table with books and coffee within reach.':'Sit down to read a book on screen or enjoy a freshly brewed coffee.')
      );
      const seatBtn=button(st.seated?'Stand up':'Sit at a reading table',async()=>{
        const res=await sim.perform('cafeSit',{siteId:site.id,actorId:actor,sit:!st.seated});
        notify(res.message,!res.ok);
        renderKey='';paint();worldChanged();
      });
      if(!st.seated)seatBtn.className='primary-gold';
      seatBar.append(seatInfo,seatBtn);
      seatPanel.append(seatBar);
      host.append(seatPanel);

      // 2. Book Shelf (6 books) & On-Screen Multi-Page Reader
      const booksPanel=doc.createElement('div');booksPanel.className='cafe-panel';
      booksPanel.append(make('h3','Bookshelf ('+life.BOOKS.length+' Books)'));
      booksPanel.append(make('p','Choose any book below to sit down and read its pages right on your screen.'));
      const shelf=doc.createElement('div');shelf.className='cafe-book-shelf';
      for(const b of life.BOOKS){
        const btn=button('',async()=>{
          const res=await sim.perform('cafeBook',{siteId:site.id,bookId:b.id,page:0});
          if(!res.ok)notify(res.message,true);
          renderKey='';paint();
        });
        btn.className='cafe-book-btn';
        btn.setAttribute('aria-pressed',String(b.id===book.id&&st.seated));
        const t=make('strong',b.title);
        const meta=make('small',b.author+' · '+b.genre);
        btn.append(t,meta);
        shelf.append(btn);
      }
      booksPanel.append(shelf);

      if(st.seated){
        const reader=doc.createElement('article');reader.className='cafe-reader';
        reader.setAttribute('aria-label','Book reader');
        reader.append(make('h4',book.title));
        const auth=make('div',book.author+' · '+book.genre+' · Page '+(pageIdx+1)+' of '+book.pages.length);
        auth.className='reader-author';
        reader.append(auth);
        reader.append(make('p',book.pages[pageIdx]));
        const nav=doc.createElement('div');nav.className='cafe-reader-nav';
        const prev=button('← Previous page',async()=>{
          await sim.perform('cafeBook',{siteId:site.id,bookId:book.id,page:Math.max(0,pageIdx-1)});
          renderKey='';paint();
        });
        prev.disabled=pageIdx<=0;
        const counter=make('span','Page '+(pageIdx+1)+' / '+book.pages.length);
        const next=button('Next page →',async()=>{
          await sim.perform('cafeBook',{siteId:site.id,bookId:book.id,page:Math.min(book.pages.length-1,pageIdx+1)});
          renderKey='';paint();
        });
        next.disabled=pageIdx>=book.pages.length-1;
        nav.append(prev,counter,next);
        reader.append(nav);
        booksPanel.append(reader);
      }
      host.append(booksPanel);

      // 3. Espresso Counter — Order, Pay & Drink Coffee
      const coffeePanel=doc.createElement('div');coffeePanel.className='cafe-panel';
      coffeePanel.append(make('h3','Espresso Counter'));
      coffeePanel.append(make('p',who+'’s purse: '+purseBal+' funds · Town funds: '+townFunds+' funds · Cups served: '+(st.cupsServed||0)));
      if(st.cup&&st.cup.sipsLeft>0){
        const cupBox=doc.createElement('div');cupBox.className='cafe-cup-box';
        const cupText=doc.createElement('div');
        cupText.append(
          make('strong','Steaming cup: '+st.cup.name),
          make('p',st.cup.sipsLeft+' of '+st.cup.totalSips+' sips remaining · Paid '+st.cup.price+' fund'+(st.cup.price===1?'':'s')+' from '+(st.cup.paidFrom==='purse'?'personal purse':'town funds')+'.')
        );
        const drinkBtn=button('Drink Coffee ('+st.cup.sipsLeft+' left)',async()=>{
          const res=await sim.perform('drinkCafeCoffee',{siteId:site.id,actorId:actor});
          notify(res.message,!res.ok);
          renderKey='';paint();worldChanged();
        });
        drinkBtn.className='primary-gold';
        cupBox.append(cupText,drinkBtn);
        coffeePanel.append(cupBox);
      }
      const menu=doc.createElement('div');menu.className='cafe-menu';
      for(const d of life.COFFEE_MENU){
        const row=doc.createElement('div');row.className='cafe-drink-row';
        const info=doc.createElement('div');
        info.append(make('strong',d.name+' — '+d.price+' fund'+(d.price===1?'':'s')),make('p',d.detail));
        const orderBtn=button('Order & Pay ('+d.price+'f)',async()=>{
          const res=await sim.perform('orderCafeCoffee',{siteId:site.id,actorId:actor,drinkId:d.id});
          notify(res.message,!res.ok);
          renderKey='';paint();worldChanged();
        });
        orderBtn.disabled=purseBal<d.price&&townFunds<d.price;
        row.append(info,orderBtn);
        menu.append(row);
      }
      coffeePanel.append(menu);
      host.append(coffeePanel);
    }
    function updateStationTimer(){
      const bar=$('station-timer-bar'),wrap=$('station-timer');
      if(!wrap||!bar)return;
      if(!match||match.turn>=5){wrap.hidden=true;return;}
      wrap.hidden=false;
      const pct=Math.max(0,Math.min(100,100*(1-(performance.now()-match.start)/4000)));
      bar.style.width=pct.toFixed(1)+'%';
    }
    function nextSignal(){
      if(!match)return;
      if(match.turn===5){
        $('station-select').disabled=false;
        const rival=match.rival,result=rival?(match.points>rival.points?'You won':match.points===rival.points?'Draw':rival.name+' won'):'Round complete';
        put('station-prompt',result+' · You '+match.points+'/5'+(rival?' · '+rival.name+' '+rival.points+'/5':'')+'.');
        $('station-pads').hidden=true;$('station-play').hidden=false;
        if($('station-timer'))$('station-timer').hidden=true;
        return;
      }
      match.symbol=Math.floor(Math.random()*pads.length);match.start=performance.now();
      put('station-prompt',(match.rival?'Playing '+match.rival.name+' · ':'Solo · ')+'Round '+(match.turn+1)+'/5 · Match '+padNames[match.symbol]+' '+pads[match.symbol]);
      updateStationTimer();
    }
    for(let i=0;i<pads.length;i++){
      const b=button(pads[i],()=>{
        if(!match||match.turn>=5)return;
        if(i===match.symbol&&performance.now()-match.start<=4000)match.points++;
        match.turn++;nextSignal();
      });b.setAttribute('aria-label',padNames[i]);$('station-pads').append(b);
    }
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
      match={turn:0,points:0,rival};$('station-select').disabled=true;$('station-play').hidden=true;$('station-pads').hidden=false;nextSignal();
    });
    room.addEventListener('close',()=>{if(room.open)return;cabinet?.close();match=null;$('station-play').hidden=false;$('station-pads').hidden=true;});
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
      if(room.open){paint();updateStationTimer();}
    }
    const timer=root.setInterval(()=>{if(!doc.hidden)tick();},400);
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)tick();});tick();
    return {open,tick};
  }
  root.EarthNightlifeUI={mount};
})(globalThis);
