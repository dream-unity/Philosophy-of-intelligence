/* Public venues occupy three permanent civic frontages. Nightly invitations
   belong to residents, so watching a different town never rerolls its guests. */
(function(root){
  'use strict';
  const venues=[
    {id:'nightclub',name:'Night club',sign:'Afterglow',x:21,y:2.35,detail:'A mirror ball turns above the open dance floor.'},
    {id:'cafe',name:'Café',sign:'The Reading Room',x:3,y:20.35,detail:'An espresso counter, shelves of books and reading tables on the terrace.'},
    {id:'arcade',name:'Video game store',sign:'Pixel Exchange',x:21,y:8.35,detail:'Play Tetris at Station 1 or Signal Match at Stations 2–6.'}
  ];
  const find=id=>venues.find(v=>v.id===id);
  function hash(s){
    let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);
    return h>>>0;
  }
  function invitations(world,site,cycle){
    const people=root.EarthDistrictGrowth.members(site).filter(p=>(p.id.startsWith('walker-')||p.id.startsWith('carrier-'))&&
      p.id!==(site.id===world.activeId?(site.agency?.actor||'steward'):null)&&!site.communityLife.away[p.id]);
    const preferences=p=>{
      const t=p.traits||{},a=p.aptitudes||{};
      return {nightclub:(t.sociability||50)/2+(a.music||50)/3,cafe:(t.patience||50)/2+(t.curiosity||50)/3,
        arcade:(t.curiosity||50)/2+(a.numeracy||50)/3};
    };
    const available=people.map(p=>({p,likes:preferences(p),
      free:!root.EarthDistrictOrders.commitment(world,site,p)&&!root.EarthDistrictGrowth.work(site,p.id)})),out=[];
    // Give the two-player venues company first. Larger towns fill additional cabinets.
    const slots=['arcade','cafe','nightclub','arcade','cafe','nightclub','arcade','arcade','nightclub','cafe','arcade','arcade'];
    for(const venue of slots.slice(0,Math.min(slots.length,Math.max(6,Math.ceil(people.length*.68))))){
      if(!available.length)break;
      const affinity=row=>row.likes[venue]+hash([site.id,cycle,venue,row.p.identityKey].join('/'))%44;
      available.sort((a,b)=>Number(b.free)-Number(a.free)||affinity(b)-affinity(a)||a.p.id.localeCompare(b.p.id));
      const {p}=available.shift();out.push({id:p.id,key:p.identityKey,venue,seat:out.filter(r=>r.venue===venue).length});
    }
    return out;
  }
  function tonight(world,site,clock=root.EarthDayClock.read(world)){
    if(!clock.night||!site?.communityLife)return [];
    return site.nightlife?.cycle===clock.cycle?site.nightlife.guests:invitations(world,site,clock.cycle);
  }
  function prepare(world,site){
    if(!world.dayClock||!site.communityLife)return;
    const clock=root.EarthDayClock.read(world);
    if(clock.night&&site.nightlife?.cycle!==clock.cycle)site.nightlife={cycle:clock.cycle,guests:invitations(world,site,clock.cycle)};
  }
  function occupied(world,site,row){
    if(!row)return true;
    const p=root.EarthPersonas.profile(site,row.id);
    return !p||p.identityKey!==row.key||root.EarthCommunityLife.present(site,row.id)===false||
      site.id===world.activeId&&row.id===(site.agency?.actor||'steward')||
      !!root.EarthDistrictOrders.commitment(world,site,p)||!!root.EarthDistrictGrowth.work(site,row.id);
  }
  function guests(world,site,clock){
    return tonight(world,site,clock).filter(row=>!occupied(world,site,row));
  }
  function place(row){
    const v=find(row.venue),pair=Math.floor(row.seat/2);
    const spread=row.venue==='nightclub'?.72:.43;
    return {x:v.x+(pair-1)*.82+(row.seat%2?1:-1)*spread*.5,y:v.y+2.24+(pair%2)*.36,
      objectX:v.x+(pair-1)*.82,objectY:v.y+1.55,label:v.name+(row.venue==='arcade'?' · Station '+(row.seat+1):'')};
  }
  function seated(row){
    const v=find(row.venue),n=row.seat;
    if(v.id==='arcade')return {x:v.x-.87+(n%3)*.86,y:v.y-.10+Math.floor(n/3)*.97,z:.14};
    if(v.id==='nightclub')return {x:v.x+(n%2?.56:-.48),y:v.y+(n<2?.10:.69),z:1.48};
    return {x:v.x+(n<2?-.91:.84)+(n%2?.36:-.30),y:v.y+1.23,z:.13};
  }
  function score(key,round){return 1+hash(key+'/'+round)%5;}
  function tables(world,site,clock){
    const list=guests(world,site,clock),arcade=list.filter(r=>r.venue==='arcade'),round=Math.floor(clock.time/25000);
    return [[0],[1],[2,3],[4,5]].map(seats=>{
      const pair=arcade.filter(r=>seats.includes(r.seat)).sort((a,b)=>a.seat-b.seat);
      return {seats,pair,round,points:seats[0]===0?[]:pair.map(r=>score(r.key,round))};
    });
  }
  const BOOKS=[
    {
      id:'aerodynamics-wing',
      title:'Aerodynamics of the Enchanted Wing',
      author:'Archmage Linnea Vance',
      genre:'Natural Philosophy',
      pages:[
        'To ride a dragon is to converse with moving air. Unlike rigid gliders, a living wing twists along its outer primaries, harvesting vertical momentum from warm coastal thermals while banking smoothly into crosswinds.',
        'Novice Wizards make the mistake of pulling hard against the reins during a steep dive. Instead, allow gravity to build airspeed along the spine, then flare the trailing membrane—every knot of descent converts cleanly into soaring altitude.',
        'Above all, remember the bond of stewardship: a hungry dragon loses flame pressure and wing endurance. Keepers who replenish the stable larder each day earn a partner capable of crossing entire oceans without fatigue.'
      ]
    },
    {
      id:'charts-open-sea',
      title:'Charts of the Open Sea',
      author:'Captain Mateo Solis',
      genre:'Navigation',
      pages:[
        'Generations of harbour pilots kept their keels inside the shallow breakwater, mistaking calm shoals for the edge of the world. Beyond the last timber jetty lies deep cerulean water open to every compass heading.',
        'Read the swell lines when sailing past the reef: long, spaced crests mean deep water and steady trade winds. Set your bow toward the open horizon and keep an eye on the harbour compass bearing to find your way home.',
        'At dusk the sea turns slate and copper. Coastal lanterns blink along the quay while distant fishing boats drift under clear constellations—proof that the ocean belongs to anyone brave enough to cast off.'
      ]
    },
    {
      id:'common-ground',
      title:'The Architecture of Common Ground',
      author:'Maren Lindholm',
      genre:'Civic Craft',
      pages:[
        'A thriving community never traps itself behind walls built too close to its own streets. Good boundaries give vehicles room to turn, pedestrians space to gather, and builders open land to expand as new families arrive.',
        'Every house raised on clear ground welcomes neighbours who bring fresh skills—gardeners, bakers, pilots, and stable keepers. Expand the town perimeter before the centre crowds, and leave quiet courtyards where people meet by chance.',
        'Place workshops near supply roads, keep airfields and long runways cleanly outside residential blocks, and reserve the waterfront for timber piers and sea breeze.'
      ]
    },
    {
      id:'roasted-beans',
      title:'A Brief History of Roasted Beans',
      author:'Tariq Al-Mansoor',
      genre:'Culinary Essays',
      pages:[
        'Before dawn in stone-walled port towns, the first sound on the street is the steady crackle of green coffee tumbling over hot iron. Light roasts carry jasmine and citrus; darker pulls yield toasted cocoa and warm spice.',
        'In The Reading Room, a cup is never rushed. Whether it is a sharp single espresso, a velvety flat white, or a fragrant cardamom latte, the steam softens the morning air while pages turn at the terrace tables.',
        'Paying a fair coin at the counter keeps the roaster turning, rewards the barista’s craft, and turns a simple beverage into a daily civic ritual.'
      ]
    },
    {
      id:'first-watch',
      title:'Chronicles of the First Watch',
      author:'Commander Priya Nair',
      genre:'History',
      pages:[
        'Our earliest garrison stood on a cramped pad beside the eastern cottages, where propellers rattled kitchen shutters and jets barely cleared the fence. Rebuilding the airfield with a proper long runway changed everything.',
        'With clear tarmac stretching twenty-two lengths beside the control tower, aircraft accelerate cleanly to rotation speed, climb high into the clouds, and patrol distant horizons without disturbing the town streets below.',
        'Strength without restraint is mere noise; discipline, clear perimeters, and careful stewardship keep both sky and settlement safe.'
      ]
    },
    {
      id:'starlight-zanzibar',
      title:'Starlight Over the Quay',
      author:'Amina Juma',
      genre:'Short Fiction',
      pages:[
        'She took the corner seat beneath the striped awning with a cold brew tonic and an open atlas. Across the harbour, lateen sails tilted gently as the evening tide slid past the coral seawall.',
        'High above the tiled roofs, a faint emerald shimmer traced an arc across the dusk—a Wizard banking an enchanted dragon out toward the sea before letting loose a harmless ribbon of golden fire for the sheer joy of flight.',
        'Down on the terrace, nobody hurried. Coffee cooled slowly in stoneware mugs, books lay open beside brass lamps, and the town breathed easily into the night.'
      ]
    }
  ];
  const COFFEE_MENU=[
    {id:'espresso',name:'House Espresso',price:1,detail:'Crisp double shot pulled from dark coastal roast.'},
    {id:'flat-white',name:'Coastal Flat White',price:2,detail:'Velvety micro-foam over rich double espresso.'},
    {id:'cardamom-latte',name:'Spiced Cardamom Latte',price:2,detail:'Steamed milk infused with freshly crushed green cardamom.'},
    {id:'cold-brew',name:'Cold Brew Tonic',price:2,detail:'Slow-steeped chilled coffee brightened with citrus tonic.'},
    {id:'pour-over',name:'Single-Origin Pour-Over',price:3,detail:'Hand-poured floral filter brew served in a glass carafe.'}
  ];
  function ensureCafe(site){
    if(!site)return {seated:false,seatedActor:null,bookId:BOOKS[0].id,page:0,cup:null,cupsServed:0,history:[]};
    if(!site.cafeState||typeof site.cafeState!=='object'){
      site.cafeState={seated:false,seatedActor:null,bookId:BOOKS[0].id,page:0,cup:null,cupsServed:0,history:[]};
    }
    if(!BOOKS.some(b=>b.id===site.cafeState.bookId))site.cafeState.bookId=BOOKS[0].id;
    if(!Number.isInteger(site.cafeState.page)||site.cafeState.page<0)site.cafeState.page=0;
    if(!Array.isArray(site.cafeState.history))site.cafeState.history=[];
    return site.cafeState;
  }
  function sitAtCafe(world,site,actorId,sit=true){
    if(!site)return {ok:false,message:'Open a town first.'};
    const st=ensureCafe(site);
    st.seated=Boolean(sit);
    st.seatedActor=sit?(actorId||site.agency?.actor||'steward'):null;
    if(world)world.actionRevision=(world.actionRevision||0)+1;
    const who=root.EarthAgency?.identity?.(site,actorId||'steward')?.name||'You';
    return {ok:true,seated:st.seated,message:st.seated?who+' sat down at a terrace table in The Reading Room.':who+' stood up from the reading table.'};
  }
  function selectBook(world,site,bookId,page=0){
    if(!site)return {ok:false,message:'Open a town first.'};
    const book=BOOKS.find(b=>b.id===bookId);
    if(!book)return {ok:false,message:'Choose one of the books on the shelf.'};
    const st=ensureCafe(site);
    st.seated=true;
    st.bookId=book.id;
    st.page=Math.max(0,Math.min(book.pages.length-1,Math.floor(Number(page)||0)));
    if(world)world.actionRevision=(world.actionRevision||0)+1;
    return {ok:true,book,page:st.page,message:'Opened “'+book.title+'” (Page '+(st.page+1)+' of '+book.pages.length+').'};
  }
  function orderCoffee(world,site,actorId,drinkId){
    if(!site)return {ok:false,message:'Open a town first.'};
    const drink=COFFEE_MENU.find(d=>d.id===drinkId);
    if(!drink)return {ok:false,message:'Choose a coffee from the menu.'};
    const actor=actorId||site.agency?.actor||'steward';
    const who=root.EarthAgency?.identity?.(site,actor)?.name||'Resident';
    const acct=root.EarthPurses?.account?.(site,actor);
    const held=root.EarthNeighbourErrands?.heldGoods?.(site,world?.week||1)||{};
    const freeFunds=Math.max(0,(site.funds||0)-(held.funds||0));
    let paidFrom='purse';
    if(acct&&acct.balance>=drink.price){
      acct.balance-=drink.price;
      if(Array.isArray(acct.entries)){
        acct.entries.unshift({week:world?.week||1,amount:-drink.price,kind:'expense',note:'Ordered '+drink.name+' at The Reading Room.'});
        if(acct.entries.length>24)acct.entries.length=24;
      }
      // Pay a local resident barista/café keeper or credit community funds
      const barista=(site.residents||[]).find(r=>r.id!==actor&&root.EarthCommunityLife?.present?.(site,r.id)!==false);
      if(barista&&root.EarthPurses?.account){
        const bAcct=root.EarthPurses.account(site,barista.id);
        bAcct.balance+=drink.price;
        if(Array.isArray(bAcct.entries)){
          bAcct.entries.unshift({week:world?.week||1,amount:drink.price,kind:'income',note:'Café sale: '+drink.name+' at The Reading Room.'});
          if(bAcct.entries.length>24)bAcct.entries.length=24;
        }
      }else{
        site.funds=(site.funds||0)+drink.price;
      }
    }else if(freeFunds>=drink.price){
      site.funds-=drink.price;
      paidFrom='community';
    }else{
      return {ok:false,message:'Not enough money for '+drink.name+' ('+drink.price+' funds needed in purse or town funds).'};
    }
    const st=ensureCafe(site);
    st.seated=true;
    st.seatedActor=actor;
    st.cup={id:drink.id,name:drink.name,price:drink.price,sipsLeft:3,totalSips:3,buyerId:actor,paidFrom};
    st.cupsServed=(st.cupsServed||0)+1;
    st.history.unshift({week:world?.week||1,actor:who,drink:drink.name,price:drink.price,paidFrom});
    if(st.history.length>12)st.history.length=12;
    if(world)world.actionRevision=(world.actionRevision||0)+1;
    return {ok:true,cup:st.cup,paidFrom,message:who+' paid '+drink.price+' fund'+(drink.price===1?'':'s')+' ('+(paidFrom==='purse'?'personal purse':'town funds')+') for '+drink.name+'.'};
  }
  function drinkCoffee(world,site,actorId){
    if(!site)return {ok:false,message:'Open a town first.'};
    const st=ensureCafe(site);
    if(!st.cup||st.cup.sipsLeft<=0)return {ok:false,message:'Order a coffee from the counter first.'};
    const actor=actorId||site.agency?.actor||'steward';
    const who=root.EarthAgency?.identity?.(site,actor)?.name||'You';
    const drinkName=st.cup.name;
    st.cup.sipsLeft--;
    let finished=false;
    if(st.cup.sipsLeft<=0){
      finished=true;
      st.cup=null;
      site.wellbeing=Math.min(100,(site.wellbeing||50)+1);
    }
    if(world)world.actionRevision=(world.actionRevision||0)+1;
    return {
      ok:true,finished,sipsLeft:st.cup?st.cup.sipsLeft:0,
      message:finished?who+' finished '+drinkName+'. Warm, restored, and ready for the day (+1 community wellbeing).':
        who+' took a slow sip of '+drinkName+' ('+st.cup.sipsLeft+' sip'+(st.cup.sipsLeft===1?'':'s')+' left).'
    };
  }
  function validCafe(c){
    if(c==null)return true;
    if(typeof c!=='object')return false;
    if(typeof c.seated!=='boolean')return false;
    if(c.bookId!=null&&typeof c.bookId!=='string')return false;
    if(c.page!=null&&(!Number.isInteger(c.page)||c.page<0||c.page>20))return false;
    if(c.cup!=null&&(typeof c.cup!=='object'||typeof c.cup.name!=='string'||!Number.isInteger(c.cup.sipsLeft)||c.cup.sipsLeft<0||c.cup.sipsLeft>10))return false;
    return true;
  }
  function valid(s){
    if(s==null)return true;
    return Number.isSafeInteger(s.cycle)&&s.cycle>=0&&Array.isArray(s.guests)&&s.guests.length<=12&&
      s.guests.every(r=>r&&typeof r.id==='string'&&typeof r.key==='string'&&!!find(r.venue)&&Number.isInteger(r.seat)&&r.seat>=0&&r.seat<6)&&
      new Set(s.guests.map(r=>r.id)).size===s.guests.length&&new Set(s.guests.map(r=>r.venue+'/'+r.seat)).size===s.guests.length;
  }
  root.EarthNightlife=Object.freeze({
    venues,find,tonight,prepare,guests,place,seated,score,tables,valid,
    BOOKS,COFFEE_MENU,ensureCafe,sitAtCafe,selectBook,orderCoffee,drinkCoffee,validCafe
  });
})(globalThis);

