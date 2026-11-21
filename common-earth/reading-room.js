/* The Reading Room: an all-day civic café with a library of readable books,
   real espresso counter payments, terrace seating, and cup sipping state. */
(function(root){
  'use strict';

  const BOOKS=Object.freeze([
    Object.freeze({
      id:'shared-quay',
      title:'Notes on the Shared Quay',
      author:'Elena Morales',
      topic:'Civic Trade & Reciprocity',
      pages:Object.freeze([
        'A harbour survives not by the height of its walls, but by the steadiness of its moorings. Every morning on the timber quay, crates of green beans, salted kelp, and hand-planed cedar boards change hands before the mist lifts from the channel. No single ledger captures all of what moves between neighbours; half of an exchange is the quiet promise that the next boat will find the same landing lamp lit.',
        'When a community fixes its own weights and measures, arguments grow shorter and fairer. A basket weighed in the open square needs no armed guard. Buyers can see the bruised fruit beside the firm, and growers hear directly which varieties kept well in damp weather and which ones spoiled before the third morning.',
        'Reciprocity is never instantaneous symmetry. In a hard winter, the upland orchards give timber while the coast shares smoked fish. Two seasons later, when storms tear loose the quay pilings, the carpenters arrive from inland without waiting for an invoice. Memory—kept carefully in the chronicle and around kitchen tables—is the real currency of a durable town.',
        'Keep the quay clear for whoever arrives next. Leave a coiled rope on the bollard, sweep the loose nails from the slipway, and leave a bench facing the tide for anyone who needs an hour to think.'
      ])
    }),
    Object.freeze({
      id:'quiet-intelligence',
      title:'The Architecture of Quiet Intelligence',
      author:'Dr. Kenji Takahashi',
      topic:'Philosophy of Intelligence',
      pages:Object.freeze([
        'We often mistake speed for intelligence and noise for capability. Yet the wisest systems—whether a forest canopy, a mature workshop, or a thoughtful mind—spend most of their energy noticing subtle differences before acting. Intelligence is the craft of matching a response to what is actually present, rather than forcing a pre-written template onto the world.',
        'A good tool extends attention without replacing judgment. When a surveyor measures a doorway twice, or a baker reads the humidity before adjusting the starter, cognition is distributed across hands, timber, air, and memory. The mind does not stop at the skull; it lives in the sketches pinned to workshop walls and the questions neighbours ask one another over coffee.',
        'Collective intelligence fails when dissent becomes costly and succeeds when small experiments are cheap to try. A community that listens to its quietest observer—the repairer who noticed a hairline crack, the courier who saw which lane floods first—learns ten times faster than a hierarchy that only hears its own echoes.',
        'To build an intelligent civilisation is to cultivate patience: leaving room for revision, keeping records honest, and designing shared institutions that grow kinder as they grow more capable.'
      ])
    }),
    Object.freeze({
      id:'tide-tables',
      title:'Tide Tables & Open Water',
      author:'Captain Niamh O’Sullivan',
      topic:'Navigation & Seamanship',
      pages:Object.freeze([
        'Near the breakwater, the water looks tame—a sheltered strip of turquoise where dinghies nudge the pilings. Yet fifty lengths past the outer channel marker, the swell lengthens and the wind speaks in an older dialect. A boat was never built to pace a cage; its hull is a letter addressed to the horizon.',
        'Reading open water begins with the surface skin. Long dark cats-paws warn of a squall line three miles windward; pale green shoals mark sandbars where keel meets bottom; birds wheeling low in tight rings betray a baitball rising from the cold shelf below.',
        'Before casting off into deep water, check three things: the painter knot, the compass bearing back to the harbour headland, and the colour of the western clouds. A confident mariner sails far because they always know the bearing home.',
        'At dusk, the harbour lantern and the red channel buoys trace a quiet geometry across the dark swell. Steering back between the pilings after an afternoon under open sky reminds every sailor why towns were built where land and ocean meet.'
      ])
    }),
    Object.freeze({
      id:'soil-and-rain',
      title:'Soil, Rain & the Long Harvest',
      author:'Amina Diallo',
      topic:'Urban Ecology & Commons',
      pages:Object.freeze([
        'Beneath every paved street lies a living archive of roots, fungi, and stone. When a town builds without leaving permeable earth—orchards, courtyard beds, rain swales—it trades steady abundance for brittle dependence on distant convoys.',
        'Compost is the quiet alchemy of civic life. Kitchen peelings, pruned branches, and seaweed raked after a high spring tide return nitrogen to tired beds within a single season. What a careless settlement throws away as waste, an attentive one turns into next spring’s tomatoes and shaded paths.',
        'Planting diversity is the simplest insurance against surprise. Never trust a single crop to carry a whole winter: pair deep-rooted fruit trees with quick leafy greens, climbing beans along sunlit fences, and hardy herbs beside every kitchen doorstep.',
        'A neighbourhood that smells of damp earth, rosemary, and rain-washed timber heals its residents before a clinic ever opens its doors.'
      ])
    }),
    Object.freeze({
      id:'timber-and-stone',
      title:'A Short History of Timber & Stone',
      author:'Mateo Alvarez',
      topic:'Community Housing & Craft',
      pages:Object.freeze([
        'Every house tells the story of how its builders imagined their neighbours. Thick stone plinths keep winter damp off the floorboards; generous eaves shelter a wooden bench where two people can share tea even in a downpour; wide doorways welcome heavy baskets and unsteady knees alike.',
        'When a town grows, the temptation is to cram cottages wall-to-wall or push newcomers beyond the edge of civic life. Better to expand the surveyed ground thoughtfully—laying out clear boundaries, leaving sunlit lanes between rooflines, and giving every household solid walls and a garden patch of its own.',
        'Good joinery outlives its maker by a century. Mortise and tenon hold without rusting; lime mortar breathes with the seasons instead of cracking; a roof pitched for the local wind stays tight through storms that strip careless work bare.',
        'Shelter is the first foundation of freedom. When a community builds enough sturdy homes for everyone who wishes to join its work, hospitality stops being a slogan and becomes a street address.'
      ])
    }),
    Object.freeze({
      id:'neighbour-letters',
      title:'Letters Between Neighbouring Towns',
      author:'Collected Civic Archive',
      topic:'Diplomacy & Shared Futures',
      pages:Object.freeze([
        'Letter I — From the Upland Mill to the Coastal Exchange: "Our saws have been busy since the thaw. We have twenty lengths of seasoned larch ready whenever your timber cart can spare a morning. Send word if your harbour needs fresh pilings before the autumn equinox."',
        'Letter II — From the Coastal Exchange to the Upland Mill: "Your larch arrived dry and straight as a plumb line. In return we have packed crates of dried figs, lantern oil, and two hand-copied manuals on rainwater cisterns. Our apprentices ask if one of yours might visit for a week in spring."',
        'Letter III — From a Traveller Resting in The Reading Room: "I have walked four valleys this month. The towns that thrive are never the ones with the highest fences, but the ones whose doors open onto clean squares, whose walls protect without suffocating, and whose cafés keep the kettle warm past sunset."',
        'Postscript in the Margin: "If you are reading this on the terrace with a cup of coffee cooling beside your elbow, add a line of your own to the chronicle before the week turns."'
      ])
    })
  ]);

  const MENU=Object.freeze([
    Object.freeze({
      id:'espresso',
      name:'House Espresso',
      price:1,
      sips:3,
      wellbeing:0,
      note:'Dark, brisk, roasted in small batches behind the counter.',
      drinkText:'Warm roasted crema and a clean, bright finish.'
    }),
    Object.freeze({
      id:'cafe-con-leche',
      name:'Spiced Café con Leche',
      price:2,
      sips:4,
      wellbeing:1,
      note:'Steamed milk, cinnamon bark, and double espresso in a stoneware mug.',
      drinkText:'Velvety warm milk with a trace of cinnamon and dark roast.'
    }),
    Object.freeze({
      id:'cold-brew',
      name:'Cold-Brew Citrus Tonic',
      price:2,
      sips:4,
      wellbeing:0,
      note:'Slow-steeped coastal roast poured over tonic and orange peel.',
      drinkText:'Crisp citrus bubbles cut cleanly through the chilled coffee.'
    }),
    Object.freeze({
      id:'coastal-tea',
      name:'Pot of Coastal Herbal Tea',
      price:3,
      sips:5,
      wellbeing:1,
      note:'Lemon verbena, wild thyme, and honey brewed for a long reading session.',
      drinkText:'Fragrant coastal herbs rise in a gentle curl of steam.'
    }),
    Object.freeze({
      id:'cortado-pastry',
      name:'Warm Pastry & Cortado',
      price:3,
      sips:4,
      wellbeing:1,
      note:'Flaky honey-almond pastry served alongside a balanced cortado.',
      drinkText:'Flaky warm pastry paired with a rich, smooth shot of coffee.'
    })
  ]);

  const int=(v,lo=0,hi=1e9)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const byBook=id=>BOOKS.find(b=>b.id===id)||null;
  const byDrink=id=>MENU.find(m=>m.id===id)||null;

  function stateOf(site){
    if(!site)return null;
    if(!obj(site.cafe))site.cafe={orders:0,spent:0,currentDrink:null,bookmarks:{},wellbeingWeek:0};
    if(!obj(site.cafe.bookmarks))site.cafe.bookmarks={};
    return site.cafe;
  }

  function actorId(site){
    return root.EarthAgency?.actorId?.(site)||'steward';
  }

  function actorPurseBalance(site,id=actorId(site)){
    return site?.purses?.people?.[id]?.balance||0;
  }

  function orderCoffee(world,site,drinkId,paymentSource='auto'){
    if(!site)return {ok:false,message:'No community is open.'};
    const item=byDrink(drinkId);
    if(!item)return {ok:false,message:'Choose a drink from the Reading Room counter.'};
    const who=actorId(site);
    const purseBal=actorPurseBalance(site,who);
    const communityFunds=site.funds||0;
    let source=paymentSource;
    if(source==='auto')source=purseBal>=item.price?'purse':communityFunds>=item.price?'community':'none';
    if(source==='purse'&&purseBal<item.price)source=communityFunds>=item.price?'community':'none';
    if(source==='community'&&communityFunds<item.price)return {ok:false,message:'Not enough funds for '+item.name+' ('+item.price+' funds needed).'};
    if(source==='none')return {ok:false,message:'Not enough funds in your purse or community treasury for '+item.name+' ('+item.price+' funds needed).'};

    if(source==='purse'){
      // Deduct from actor personal purse and credit community café receipts cleanly.
      const purse=site.purses?.people?.[who];
      if(!purse||purse.balance<item.price)return {ok:false,message:'Insufficient personal purse balance.'};
      purse.balance-=item.price;
      purse.spent=(purse.spent||0)+item.price;
      if(Array.isArray(purse.history)){
        purse.history.unshift({week:world.week,amount:-item.price,kind:'cafe',text:'Ordered '+item.name+' at The Reading Room'});
        if(purse.history.length>12)purse.history.length=12;
      }
      site.funds=(site.funds||0)+item.price;
    }else{
      site.funds=Math.max(0,(site.funds||0)-item.price);
    }

    const c=stateOf(site);
    c.orders=(c.orders||0)+1;
    c.spent=(c.spent||0)+item.price;
    c.currentDrink={
      id:item.id,
      name:item.name,
      sipsLeft:item.sips,
      maxSips:item.sips,
      orderedWeek:world.week,
      paidBy:source,
      price:item.price,
      wellbeingGranted:false
    };

    const paidLabel=source==='purse'?'personal purse (credited to community café receipts)':'community funds';
    return {
      ok:true,
      message:'Ordered '+item.name+' for '+item.price+(item.price===1?' fund':' funds')+' from '+paidLabel+'. Enjoy it at a reading table.',
      drink:c.currentDrink
    };
  }

  function sipCoffee(world,site){
    if(!site)return {ok:false,message:'No community is open.'};
    const c=stateOf(site),d=c.currentDrink;
    if(!d||d.sipsLeft<=0)return {ok:false,message:'Your cup is empty. Order another drink at the counter.'};
    const item=byDrink(d.id);
    d.sipsLeft=Math.max(0,d.sipsLeft-1);
    let bonus='';
    if(item&&item.wellbeing>0&&!d.wellbeingGranted&&c.wellbeingWeek!==world.week){
      d.wellbeingGranted=true;
      c.wellbeingWeek=world.week;
      site.wellbeing=Math.min(100,(site.wellbeing||0)+item.wellbeing);
      bonus=' (+'+item.wellbeing+' wellbeing)';
    }
    const done=d.sipsLeft===0;
    const msg=done
      ?'Finished your '+d.name+'. '+(item?.drinkText||'')+bonus
      :'Took a warm sip of '+d.name+' ('+d.sipsLeft+'/'+(d.maxSips||3)+' left). '+(item?.drinkText||'')+bonus;
    if(done)c.currentDrink=null;
    return {ok:true,finished:done,sipsLeft:d.sipsLeft,message:msg};
  }

  function setBookmark(site,bookId,pageIndex){
    if(!site)return {ok:false,message:'No community is open.'};
    const book=byBook(bookId);
    if(!book)return {ok:false,message:'That book is not on the Reading Room shelf.'};
    const page=Math.max(0,Math.min(book.pages.length-1,Math.floor(Number(pageIndex)||0)));
    const c=stateOf(site);
    c.bookmarks[book.id]=page;
    return {ok:true,bookId:book.id,page,message:'Bookmarked '+book.title+' at page '+(page+1)+'.'};
  }

  function command(world,site,req){
    if(!obj(req))return {ok:false,message:'Choose a Reading Room action.'};
    if(req.action==='order')return orderCoffee(world,site,req.drinkId,req.source||'auto');
    if(req.action==='sip')return sipCoffee(world,site);
    if(req.action==='bookmark')return setBookmark(site,req.bookId,req.page);
    return {ok:false,message:'Unknown Reading Room request.'};
  }

  function view(world,site){
    const c=site?.cafe||null;
    const who=actorId(site);
    return {
      books:BOOKS,
      menu:MENU,
      currentDrink:c?.currentDrink?{...c.currentDrink}:null,
      bookmarks:{...(c?.bookmarks||{})},
      orders:c?.orders||0,
      spent:c?.spent||0,
      purseBalance:actorPurseBalance(site,who),
      communityFunds:site?.funds||0,
      actorName:root.EarthAgency?.identity?.(site,who)?.name||'Steward'
    };
  }

  function valid(site,week=999999){
    const c=site?.cafe;
    if(c===undefined)return true;
    if(!obj(c))return false;
    if(!int(c.orders,0,100000)||!int(c.spent,0,1000000))return false;
    if(c.wellbeingWeek!==undefined&&!int(c.wellbeingWeek,0,week+1))return false;
    if(c.currentDrink!==null&&c.currentDrink!==undefined){
      const d=c.currentDrink;
      if(!obj(d)||!byDrink(d.id)||!int(d.sipsLeft,0,10)||!int(d.maxSips,1,10)||!int(d.price,1,50))return false;
    }
    if(c.bookmarks!==undefined){
      if(!obj(c.bookmarks))return false;
      for(const [k,v] of Object.entries(c.bookmarks)){
        const b=byBook(k);
        if(!b||!int(v,0,b.pages.length-1))return false;
      }
    }
    return true;
  }

  root.EarthReadingRoom=Object.freeze({BOOKS,MENU,byBook,byDrink,orderCoffee,sipCoffee,setBookmark,command,view,valid});
})(typeof window==='undefined'?globalThis:window);
