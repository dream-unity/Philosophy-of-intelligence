/* A Street activity describes the physical actions an observer can see. The
   simulation owns orders, production, employment and project completion. */
(function(root){
  'use strict';

  function action(id,phase,label,prop,gesture,duration){
    return Object.freeze({id,phase,label,prop,gesture,duration});
  }
  function series(id,goal,...steps){
    return Object.freeze({id,goal,steps:Object.freeze(steps),duration:steps.reduce((n,s)=>n+s.duration,0)});
  }
  const prepare=(id,label,prop,gesture)=>action(id,'prepare',label,prop,gesture,2.5);
  const work=(id,label,prop,gesture)=>action(id,'work',label,prop,gesture,4.5);
  const hand=(id,label,prop,gesture)=>action(id,'handover',label,prop,gesture,3);
  const read=action('read-lesson','study','Reading a lesson','book','read',4);
  const rehearse=action('try-exercise','study','Trying a practice exercise','slate','write',5);
  const notes=action('revise-notes','study','Checking a worked example','book','point',3);
  const gather=work('gather-produce','Gathering produce','basket','reach');
  const pack=hand('pack-basket','Packing a harvest basket','basket','place');
  const sort=prepare('sort-seeds','Sorting seeds','basket','reach');
  const sow=work('plant-seeds','Planting seeds','trowel','tend');
  const saw=work('fit-joint','Fitting a timber joint','hammer','strike');
  const parts=prepare('check-parts','Checking the fittings','wrench','reach');
  const mend=work('tighten-fitting','Tightening a fitting','wrench','turn');
  const record=hand('record-result','Recording the result','ledger','write');
  const sketch=prepare('sketch-design','Sketching a design','slate','write');
  const measure=work('check-measurements','Checking measurements','slate','point');
  const collect=work('sort-sample','Sorting a sample','sample','reach');
  const lecture=work('show-example','Showing a worked example','slate','point');
  const lesson=prepare('set-out-lesson','Setting out a lesson','book','place');
  const log=prepare('check-route','Checking the delivery list','ledger','read');
  const lift=work('load-crate','Loading a supply crate','crate','lift');
  const unload=hand('unload-crate','Unloading a supply crate','crate','place');
  const loadParcel=work('collect-parcel','Collecting a parcel','parcel','lift');
  const deliver=hand('deliver-parcel','Setting down a delivery','parcel','place');
  const offer=work('sort-orders','Sorting market orders','parcel','reach');
  const listen=action('listen','social','Listening to a neighbour','none','listen',4.5);
  const speak=action('reply','social','Sharing a thought','none','speak',4);
  const greet=action('greet','social','Greeting a neighbour','none','point',2.5);
  const wait=action('wait-at-meeting','social','Waiting for a neighbour','none','sit',5);
  const rest=action('sit-down','rest','Taking a quiet break','none','sit',5.5);
  const sip=action('drink','rest','Having a drink','cup','lift',3.5);
  const tune=prepare('tune','Tuning an instrument','instrument','turn');
  const play=work('play-phrase','Rehearsing a phrase','instrument','play');

  const routines=Object.freeze({
    dispatch:series('dispatch','Keep the dispatch stop ready',log,work('check-dispatch-orders','Checking outstanding supply orders','ledger','write'),hand('file-dispatch-notes','Filing the dispatch notes','book','place')),
    returnTruck:series('return-truck','Return the empty truck to dispatch',log),
    inspect:series('inspect','Decide whether to settle here',prepare('read-listings','Reading the posted services','book','read'),work('compare-rota','Comparing the local work rota','ledger','write'),hand('note-fit','Making notes about life here','slate','write')),
    pantryCover:series('pantry-cover','Cover the pantry round',prepare('read-pantry','Checking the household order and pantry tally','ledger','read'),
      work('sort-pantry','Sorting baskets for the households on the round','basket','reach'),hand('stage-pantry','Setting the round’s baskets at the counter','basket','place')),
    departure:series('departure','Prepare for a neighbourhood visit',prepare('review-handover','Checking the handover list','ledger','read'),
      work('annotate-handover','Writing the outstanding jobs on the exchange rota','ledger','write'),hand('post-handover','Leaving the handover list at the exchange','book','place')),
    inspectHome:series('inspect-home','Assess the neighbourhood before moving',prepare('review-room','Reading the housing notice','book','read'),work('inspect-frontage','Looking over the shared frontage','slate','point'),hand('record-fit','Recording what would suit daily life','ledger','write')),
    dispute:series('dispute','Seek an emergency pantry collection',log,work('challenge-order','Checking the unfilled collection request','ledger','point'),record),
    waterBed:series('water-bed','Water the growing bed',prepare('check-soil','Checking the soil around the plants','sample','reach'),work('water-bed','Watering the roots along the bed','wateringCan','pour'),hand('log-water','Recording the watering round','ledger','write')),
    restBeds:series('rest-beds','Protect a resting patch',prepare('check-edge','Checking the boundaries of the patch','ruler','measure'),work('set-marker','Setting a resting-boundary stake','hammer','strike'),hand('post-rest','Recording when collection may resume','ledger','write')),
    surveyFish:series('survey-fish','Select a shore fishing station',prepare('check-shore-map','Reading the shore-station map','book','read'),work('sound-line','Checking the line depth at the quay','rod','lift'),hand('mark-station','Marking the chosen station','slate','write')),
    restoreBeds:series('restore-beds','Keep the growing ground productive',prepare('inspect-bed','Checking which part of the bed needs rest','slate','point'),work('spread-compost','Spreading compost across the recovering bed','trowel','tend'),hand('mark-rest','Marking the patch for recovery','slate','write')),
    restoreWood:series('restore-wood','Care for the next cutting',prepare('inspect-stools','Inspecting the coppice stools','slate','point'),work('protect-regrowth','Protecting the new coppice shoots','trowel','tend'),hand('record-coppice','Recording the protected cutting boundary','ledger','write')),
    restoreWater:series('restore-water','Protect the growing water',prepare('inspect-line','Inspecting the growing line','ledger','read'),work('mark-water','Marking the resting section of water','line','lift'),hand('record-water','Recording the protected water boundary','slate','write')),
    marketMeal:series('market-meal','Prepare meals for the shared store',prepare('check-lot','Checking the available food lot','ledger','read'),work('cook-lot','Preparing a batch of meals','cup','turn'),hand('pack-meals','Packing portions for the pantry','basket','place')),
    makeWare:series('make-ware','Make goods for the stall',prepare('mark-cloth','Marking the cloth against the pattern','ruler','measure'),work('sew-ware','Stitching the cut pieces at the bench','cloth','stitch'),hand('fold-ware','Folding the finished piece for sale','cloth','place')),
    weaveWare:series('weave-ware','Weave an item for the stall',prepare('dress-weave','Laying out the fibre strips','ruler','measure'),work('weave-body','Interlacing strips in the working frame','weaving','weave'),hand('bind-edge','Binding the finished edge','weaving','weave')),
    fitWare:series('fit-ware','Build an item for the stall',measure,saw,hand('check-work','Checking the finished joints','ruler','measure')),
    makeFlute:series('make-flute','Finish a practice flute',prepare('mark-holes','Marking the finger holes','ruler','measure'),work('test-flute','Testing the pitch of the finished flute','flute','play'),hand('wrap-flute','Wrapping the flute for sale','parcel','place')),
    makeDrum:series('make-drum','Finish a frame drum',prepare('check-frame','Checking the drum frame','ruler','measure'),work('tighten-skin','Lacing the drumhead to the rim','drum','turn'),hand('test-drum','Tapping the head to test the tension','drum','play')),
    houseFootings:series('house-footings','Lay a courtyard foundation',sketch,work('set-footings','Checking the foundation line','ruler','measure'),record),
    houseFrame:series('house-frame','Build the timber frame',measure,work('fix-frame','Fixing a stud to the timber frame','hammer','strike'),record),
    houseFinish:series('house-finish','Finish the courtyard home',parts,work('fit-door','Fitting the front-door hardware','wrench','turn'),hand('check-door','Checking the new door clearance','ruler','measure')),
    deed:series('house-deed','Register a dwelling at the exchange',prepare('read-deed','Reading the title and agreed sale terms','book','read'),work('sign-deed','Signing the property record','ledger','write'),hand('file-deed','Handing over the signed papers','parcel','place')),
    stockStall:series('stock-stall','Stock the private stall',prepare('check-price','Checking the stall inventory','ledger','read'),work('unpack-stock','Unpacking the stallholder’s own stock','crate','lift'),hand('display-stock','Arranging goods on the sales table','parcel','place')),
    shop:series('shop','Buy something from a neighbour',prepare('inspect-ware','Inspecting the item at the stall','parcel','turn'),work('pay-maker','Counting payment for the stallholder','purse','pay'),hand('wrap-purchase','Packing the purchase to carry home','parcel','lift')),
    marketSale:series('market-sale','Release a surplus lot to the exchange',prepare('read-offer','Checking the exchange offer','ledger','read'),work('weigh-lot','Weighing the surplus lot','crate','lift'),hand('hand-over-lot','Handing the sold lot to the exchange','crate','place')),
    closedRoute:series('closed-route','Wait for the way to open',action('find-way','travel','Waiting for a clear approach','slate','read',4)),
    roadWait:series('road-wait','Keep the delivery route safe',action('give-way','travel','Waiting for the way to clear','none','sit',3)),
    gardener:series('gardener','Tend the garden',sort,sow,pack),
    grower:series('grower','Prepare a harvest',sow,gather,pack),
    seedkeeper:series('seedkeeper','Prepare the next planting',collect,sort,sow),
    baker:series('baker','Fill a bakery order',prepare('portion-dough','Portioning dough','basket','reach'),work('shape-loaves','Shaping loaves','none','turn'),hand('pack-loaves','Packing loaves','basket','place')),
    cook:series('cook','Prepare shared meals',prepare('sort-ingredients','Sorting ingredients','basket','reach'),work('stir-pot','Stirring the meal','cup','turn'),hand('set-portions','Setting out portions','basket','place')),
    refuse:series('refuse','Collect and sort reusable material',prepare('inspect-load','Checking collected material','crate','reach'),work('sort-load','Separating reusable pieces','basket','place'),unload),
    carpenter:series('carpenter','Fit a timber joint',measure,saw,hand('set-timber','Setting the finished piece aside','crate','place')),
    repairer:series('repairer','Return a tool to use',parts,mend,record),
    engineer:series('engineer','Test a public works fitting',sketch,mend,measure),
    mathematician:series('mathematician','Check a calculation',prepare('write-question','Writing a problem','slate','write'),work('work-calculation','Working through a calculation','slate','write'),hand('check-proof','Checking the steps','book','point')),
    geneticist:series('geneticist','Catalogue seed samples',prepare('label-sample','Labelling a seed sample','ledger','write'),collect,record),
    surveyor:series('surveyor','Survey the neighbourhood buildings',prepare('read-floor-plan','Reading the building survey plan','book','read'),
      work('measure-frontage','Measuring the shared building frontage','ruler','measure'),hand('record-survey','Recording the frontage measurements','ledger','write')),
    handoverAdmin:series('handover-admin','Keep the outgoing employer’s appointment records current',
      prepare('read-handover-register','Checking the appointment register','book','read'),
      work('update-handover-diary','Updating appointment and referral records','ledger','write'),
      hand('pass-handover-notes','Leaving the records for the qualified colleague','book','place')),
    handoverSchedule:series('handover-schedule','Keep the outgoing employer’s work schedule current',
      prepare('read-handover-rota','Reading the employer’s duty schedule','book','read'),
      work('update-handover-records','Updating the duty rota and handover records','ledger','write'),
      hand('pass-schedule-notes','Leaving the handover notes for the qualified colleague','book','place')),
    'practice-nurse':series('practice-nurse','Prepare the neighbourhood follow-up round',
      prepare('review-home-round','Checking the household follow-up rota','ledger','read'),
      work('pack-home-round','Packing the clinic supplies for the home-visit round','basket','place'),
      hand('confirm-followup','Writing the next follow-up appointment','ledger','write')),
    nurse:series('nurse','Prepare the clinic for visitors',prepare('check-clinic','Checking the clinic list','ledger','read'),work('sort-clinic','Sorting clinic supplies','basket','reach'),hand('stock-clinic','Setting supplies out for the next visit','basket','place')),
    police:series('police','Review neighbourhood concerns',prepare('read-concerns','Reading residents’ concerns','ledger','read'),work('mark-location','Marking a location on a district map','slate','point'),record),
    musician:series('musician','Rehearse a piece',tune,play,work('repeat-passage','Repeating a difficult passage','instrument','play')),
    teacher:series('teacher','Prepare a lesson',lesson,lecture,hand('set-exercise','Writing a practice exercise','slate','write')),
    driver:series('driver','Deliver the co-op supplies',log,lift,unload),
    porter:series('porter','Move supplies between workplaces',prepare('check-stock','Checking the stock','ledger','read'),lift,unload),
    courier:series('courier','Deliver a market parcel',log,loadParcel,deliver),
    trader:series('trader','Fill market orders',prepare('read-orders','Reading market orders','ledger','read'),offer,deliver),
    convenor:series('convenor','Prepare a neighbourhood meeting',prepare('read-agenda','Checking the meeting agenda','book','read'),work('record-motion','Drafting a proposal','ledger','write'),hand('post-agenda','Setting out the agenda','book','place')),
    build:series('build','Work on the construction site',parts,saw,measure),
    study:series('study','Study and practise',read,rehearse,notes),
    apply:series('apply','Prepare an application',prepare('read-posting','Reading the job posting','book','read'),work('write-application','Writing an application','ledger','write'),hand('file-application','Putting the application in order','parcel','place')),
    rest:series('rest','Recover energy',rest,sip),
    visit:series('visit','Spend time with a neighbour',greet,speak,listen),
    host:series('host','Welcome a visitor',greet,listen,speak),
    waiting:series('waiting','Meet a neighbour',wait,action('look-for-friend','social','Looking out for a neighbour','none','listen',3.5)),
    gather:series('gather','Stock the community pantry',gather,pack,hand('stock-pantry','Putting away the harvest','basket','place')),
    preserve:series('preserve','Put surplus food into community stores',prepare('sort-surplus','Sorting the surplus harvest','basket','reach'),work('pack-food','Packing a food crate','crate','lift'),hand('store-crate','Putting food into stores','crate','place')),
    pickup:series('pickup','Collect the supply load',log,lift),
    dropoff:series('dropoff','Deliver the supply load',unload,record),
    delivery:series('delivery','Deliver a parcel',deliver,record)
  });
  const projects=Object.freeze({
    research:{plan:series('research-plan','Plan a research question',read,sketch),work:series('research-work','Investigate a question',collect,measure,record),finish:series('research-finish','Share the findings',record,hand('display-findings','Setting out the findings','slate','place'))},
    build:{plan:series('build-plan','Design the build',measure,sketch),work:routines.build,finish:series('build-finish','Finish the build',mend,hand('check-finish','Checking the final fit','wrench','turn'))},
    food:{plan:series('food-plan','Plan a planting',sort,sketch),work:routines.grower,finish:series('food-finish','Share the harvest',pack,hand('set-out-harvest','Setting out the harvest','basket','place'))},
    teach:{plan:series('teach-plan','Prepare a shared lesson',read,lesson),work:routines.teacher,finish:series('teach-finish','Share the finished lesson',lecture,hand('pass-lesson','Setting out the lesson notes','book','place'))}
  });
  const hobbies=Object.freeze({
    music:routines.musician,
    numeracy:series('puzzle','Explore a number puzzle',sketch,measure,record),
    craft:series('model','Make a small model',sketch,saw,measure),
    communication:series('oral-history','Record an oral history',greet,listen,record),
    care:series('field-notes','Keep a nature journal',collect,sketch,record),
    stamina:series('walking-notes','Explore a walking route',prepare('check-map','Reading a walking map','book','read'),work('note-route','Sketching the route','slate','write'),record),
    organisation:series('catalogue','Organise a collection',collect,record,hand('file-notes','Filing the collection notes','book','place'))
  });
  const planPractice=series('practice-plan','Plan a practice session',sketch,read);
  const finishPractice=series('practice-finish','Review the practice session',record,hand('store-practice-notes','Putting away practice notes','book','place'));
  const planMusic=series('music-plan','Choose a passage to practise',prepare('choose-piece','Choosing a passage from the score','book','read'),tune);
  const finishMusic=series('music-finish','Play the finished passage',play,hand('put-away-instrument','Putting the instrument away','instrument','place'));
  // In a town with a visiting instructor or club shuttle the figure depicts
  // the local meeting. A future ambition alone never puts a person in orbit.
  const dreamSteps={
    balcony:[['Measuring the kitchen doorway','slate','point'],['Showing a scale drawing','slate','point'],['Preparing balcony fittings','wrench','turn'],['Checking the balcony joinery','wrench','point']],
    skydive:[['Matching club dates to shifts','ledger','read'],['Taking briefing notes','slate','write'],['Filling in the booking','ledger','write'],['Checking the shuttle departure board','book','read']],
    space:[['Recording field measurements','slate','write'],['Showing repeatable field results','sample','point'],['Presenting research to the panel','slate','point'],['Working through a crew exercise','slate','write'],['Reporting the mission findings','book','point']],
    ensemble:[['Marking difficult bars in the score','book','write'],['Rehearsing a complete tune','instrument','play'],['Trying the hall programme','instrument','play'],['Playing the neighbourhood set','instrument','play']],
    orchard:[['Sketching the light around the beds','slate','write'],['Placing the nursery order','ledger','write'],['Tending the young fruit tree','trowel','tend'],['Weighing the first picking','basket','lift']],
    archive:[['Writing an interview invitation','book','write'],['Recording a neighbourhood story','ledger','write'],['Handing over marked transcripts','parcel','place'],['Setting out the listening-room materials','book','place']],
    toolroom:[['Recording tool requests','ledger','write'],['Checking bench dimensions','slate','point'],['Refurbishing shared tools','wrench','turn'],['Returning recovered fittings','crate','place']],
    supper:[['Comparing shift endings','ledger','read'],['Preparing a trial supper','cup','turn'],['Marking collection shifts','slate','write'],['Laying out late-shift portions','basket','place']],
    trail:[['Marking a stop on the walking map','slate','point'],['Timing the distance between benches','slate','write'],['Revising the newcomers’ guide','book','write'],['Leaving the walking guide at the exchange','book','place']]
  };
  const dreamRoutines={};
  for(const [dream,steps] of Object.entries(dreamSteps)){
    dreamRoutines[dream]=steps.map(([label,prop,gesture],index)=>{
      const id=dream+'-'+(index+1);
      const begin=prop==='instrument'?tune:prop==='wrench'?parts:prop==='trowel'?sort:prop==='basket'?prepare('set-baskets','Setting out the baskets','basket','place'):read;
      return series(id,label,begin,action(id+'-work','work',label,prop,gesture,8),record);
    });
  }
  const harvests={
    millet:['Cutting ripe millet heads','sickle','cut'],nuts:['Gathering fallen orchard nuts','basket','reach'],
    herbs:['Cutting kitchen herbs','sickle','cut'],shellfish:['Collecting mature shellfish in a shore basket','basket','reach'],
    cloth:['Sorting the reusable cloth','cloth','place'],flax:['Gathering the retted flax fibre','weaving','weave'],
    timber:['Sawing a usable timber length','saw','saw'],stone:['Splitting a stone sample','pick','strike'],clay:['Lifting workable clay','trowel','tend'],
    reed:['Cutting a bundle of reeds','sickle','cut'],salvage:['Removing a reusable fitting','wrench','turn'],grain:['Cutting ripe grain','sickle','cut'],
    pulses:['Picking mature pods','basket','reach'],roots:['Lifting roots from the bed','trowel','tend'],fruit:['Picking ripe fruit','basket','lift'],
    berries:['Gathering berries','basket','reach'],greens:['Cutting leafy greens','sickle','cut'],mushrooms:['Selecting mature mushrooms','basket','reach'],
    kelp:['Lifting kelp from the growing line','line','lift'],fish:['Drawing in the handline catch','rod','lift']
  };
  const harvestPlans={};
  for(const [resource,[label,prop,gesture]] of Object.entries(harvests)){
    const id='harvest-'+resource;
    const step=work(id,label,prop,gesture);
    harvestPlans[resource]=series(id,label,prepare(id+'-check','Checking the '+resource+' collection','ledger','read'),step,
      hand(id+'-pack','Packing collected '+resource,'basket','place'));
  }
  const harvestStep=id=>own(harvestPlans,id)?.steps[1]||null;
  const favours={
    supper:{goods:['Passing over a food basket','basket','place','Receiving portions for the late shift','basket','lift'],
      time:['Taking the late collection list','ledger','read','Indicating the late pickup','slate','point']},
    bench:{goods:['Passing over a replacement fitting','wrench','place','Checking the new fitting','wrench','turn'],
      time:['Straightening the original hinge','hammer','strike','Holding the loose fitting','wrench','point']},
    meeting:{goods:['Contributing the shared return fare','parcel','place','Recording the fare contribution','ledger','write'],
      time:['Writing down a neighbour’s statement','ledger','write','Explaining the statement','none','speak']}
  };
  function favour(kind,method,recipient){
    const row=own(favours,kind)&&own(favours[kind],method);if(!row)return null;
    const offset=recipient?3:0,id='help-'+kind+'-'+method+(recipient?'-receive':'-offer');
    return action(id,'social',row[offset],row[offset+1],row[offset+2],6);
  }
  const roles={
    'seed keeper':'seedkeeper','garden courier':'porter','exchange porter':'porter','supply porter':'porter','foot courier':'courier',
    'co-op delivery driver':'driver','practice nurse':'practice-nurse','building surveyor':'surveyor','high-school teacher':'teacher','police officer':'police','refuse collector':'refuse',
    'market trader':'trader','exchange worker':'trader','community steward':'convenor','steward':'convenor',
    'council steward':'convenor','school lead':'teacher','builder':'build','dismantling crew':'build'
  };
  const domains={food:'grower',repair:'repairer',exchange:'trader'};
  const venues={garden:'grower',workshop:'repairer',market:'trader',hall:'convenor',bench:'rest',dock:'porter',pier:'porter'};
  const own=(table,key)=>typeof key==='string'&&Object.hasOwn(table,key)?table[key]:null;
  const demonstrations=new Map();
  function placement(input){
    const role=own(routines,input.placementJob);
    if(!role||!['learner','mentor'].includes(input.placementSide))return null;
    const id='placement-'+input.placementSide+'-'+role.id;
    if(demonstrations.has(id))return demonstrations.get(id);
    // The middle step is the trade itself for jobs such as carpentry where
    // measuring the work before fitting the joint is also a work step.
    const duty=role.steps[1]?.phase==='work'?role.steps[1]:role.steps.find(step=>step.phase==='work')||role.steps[0];
    const routine=input.placementSide==='mentor'?series(id,role.goal,
      prepare(id+'-brief','Going over the day’s task with the learner','slate','point'),
      action(id+'-demonstrate','work',duty.label+' alongside the learner',duty.prop,duty.gesture,6),
      hand(id+'-review','Reviewing the learner’s notes together','book','point')):
      series(id,role.goal,prepare(id+'-brief','Checking the task sheet with the mentor','book','read'),
        action(id+'-study','study','Recording the steps of the demonstration','slate','write',6),
        hand(id+'-review','Showing the mentor the completed notes','slate','point'));
    demonstrations.set(id,routine);return routine;
  }
  function routine(input){
    const kind=input.kind;
    if((kind==='learn'&&input.placementSide==='learner'||kind==='commitment'&&input.placementSide==='mentor')){
      const demonstration=placement(input);if(demonstration)return demonstration;
    }
    if(kind==='paidOrder'){
      if(input.orderPhase==='deliver'){
        const prop=input.resource==='parcel'?'parcel':input.orderGood==='food'?'basket':'crate';
        return series('order-delivery',input.goal,hand('put-down-order','Handing over '+input.amount+' '+input.cargo,prop,'place'),
          hand('sign-order-receipt','Signing for the reserved wage','ledger','write'));
      }
      if(input.orderGood==='retail')return routine({kind:'marketSupply',activity:'makeWare',ware:input.resource});
      if(input.resource==='fish')return harvestPlans.fish;
      if(own(harvestPlans,input.resource))return harvestPlans[input.resource];
      return series('order-collection',input.goal,prepare('read-order','Checking the order and its destination','ledger','read'),
        work('collect-order','Collecting '+input.cargo,input.resource==='parcel'?'parcel':'crate','lift'));
    }
    if(kind==='freight'&&['food','materials'].includes(input.good)&&Number.isSafeInteger(input.amount)&&input.amount>0){
      const cargo=input.amount+' '+input.good,prop=input.good==='food'?'basket':'crate';
      return series('regional-freight','Prepare an inter-district consignment',log,
        work('load-freight','Loading '+cargo+' for the neighbouring district',prop,'lift'),
        hand('file-freight','Checking the consignment against the dispatch note','ledger','write'));
    }
    if(kind==='commitment'||kind==='cover'){
      if(input.handoverScope==='admin')return /^(practice nurse|nurse)$/i.test(input.handoverRole)?routines.handoverAdmin:routines.handoverSchedule;
      if(input.handoverScope==='qualified'&&typeof input.handoverRole==='string'){
        const role=input.handoverRole.toLowerCase(),duty=own(routines,own(roles,role)||role);
        if(duty)return duty;
      }
    }
    if(input.shipmentPhase&&own(harvestPlans,input.resource)){
      const crop=input.resource,id='basket-'+input.shipmentPhase+'-'+crop;
      const moving=input.shipmentPhase==='unload';
      const label=moving?'Handing '+crop+' to the shared pantry':'Lifting the settled '+crop+' basket';
      return series(id,label,hand(id+'-handover',label,'basket',moving?'place':'lift'));
    }
    if(kind==='dream')return own(dreamRoutines,input.dreamId)?.[input.step-1]||own(hobbies,input.axis)||routines.study;
    if(kind==='pantryCover'||kind==='departure'||kind==='inspect'||kind==='inspectHome'||kind==='returnTruck'||kind==='dispute'||kind==='closedRoute')return routines[kind];
    if(kind==='gather'&&own(harvestPlans,input.resource))return harvestPlans[input.resource];
    if(kind==='wage')return routines.trader;
    if(kind==='marketSupply'){
      if(input.activity==='tendPatch'){
        if(input.patchCare==='irrigate')return routines.waterBed;
        if(input.patchCare==='dressSoil')return routines.restoreBeds;
        return input.resource==='timber'?routines.restoreWood:input.venue==='dock'?routines.restoreWater:routines.restBeds;
      }
      if(input.activity==='makeWare'){
        const shop=root.EarthResidentShops?.products?.[input.ware]?.shop;
        return shop==='weaving'?routines.weaveWare:shop==='joinery'?routines.fitWare:input.ware==='flute'?routines.makeFlute:input.ware==='drum'?routines.makeDrum:routines.makeWare;
      }
      if(input.activity==='buildHome')return input.homeStage===2?routines.houseFrame:input.homeStage===3?routines.houseFinish:routines.houseFootings;
      return own({deed:routines.deed,stockStall:routines.stockStall,shop:routines.shop,sell:routines.marketSale},input.activity)||routines.marketMeal;
    }
    if(kind==='commitment'&&input.errandKind){
      const promise=input.pledge,prop=own({food:'basket',materials:'crate',funds:'parcel'},promise?.good);
      if(prop&&Number.isSafeInteger(promise.amount)&&promise.amount>0){
        const goods=promise.amount+' promised '+promise.good,recipient=input.recipient;
        const peer=input.peerName?' '+(recipient?'from ':'to ')+input.peerName:'';
        const label=(recipient?'Receiving ':'Handing over ')+goods+peer,id='help-pledge-'+promise.good+(recipient?'-receive':'-offer');
        return series(id,label,hand(id+'-handover',label,prop,recipient?'lift':'place'));
      }
      const stage=favour(input.errandKind,input.method,input.recipient);
      if(stage)return series(stage.id,stage.label,stage);
    }
    if(kind==='project'){
      if(input.projectKind==='hobby'){
        if(input.projectPhase==='plan')return input.axis==='music'?planMusic:planPractice;
        if(input.projectPhase==='finish')return input.axis==='music'?finishMusic:finishPractice;
        return own(hobbies,input.axis)||hobbies.craft;
      }
      const project=own(projects,input.projectKind);
      if(input.projectKind==='food'&&input.resource==='fish'&&input.projectPhase==='plan')return routines.surveyFish;
      if(input.projectKind==='food'&&input.projectPhase==='work'&&own(harvestPlans,input.resource))return harvestPlans[input.resource];
      if(project)return own(project,input.projectPhase)||project.work;
    }
    if(kind==='learn'||kind==='study'||input.training&&(!kind||kind==='routine'))return routines.study;
    if(input.specialistId&&own(routines,input.specialistId))return routines[input.specialistId];
    if(kind==='cover'||kind==='commitment'&&input.civic===true)return own(routines,own(venues,input.venue))||routines.trader;
    if(['rest','visit','host','waiting','gather','preserve','apply','pickup','dropoff','delivery','dispatch','roadWait','build'].includes(kind))return routines[kind];
    const career=own(routines,input.careerId);
    if(career)return career;
    const role=typeof input.role==='string'?input.role.toLowerCase():'';
    return own(routines,own(roles,role)||role)||own(routines,own(domains,input.occupation))||own(routines,own(venues,input.venue))||routines.convenor;
  }
  function plan(input={}){
    const chosen=routine(input),venue=typeof input.venue==='string'?input.venue:'';
    const driver=chosen===routines.driver,porter=chosen===routines.porter,courier=chosen===routines.courier;
    const pledged=chosen.id.startsWith('help-pledge-')&&!input.recipient;
    const loadedBasket=input.shipmentPhase==='unload',travel=action(chosen.id+'-travel','travel',pledged?'Carrying '+input.pledge.amount+' promised '+input.pledge.good+(input.peerName?' to '+input.peerName:''):loadedBasket?'Carrying '+input.resource+' to the shared pantry':chosen===routines.returnTruck?'Returning the empty truck to dispatch':driver?'Driving '+(input.destination?'to '+input.destination:'the supply route'):porter?'Carrying a supply crate':courier?'Carrying a parcel':'Walking to '+(input.destination||'the next stop'),
      pledged?chosen.steps[0].prop:loadedBasket?'basket':porter?'crate':courier?'parcel':'none',pledged||loadedBasket||porter||courier?'carry':'walk',0);
    if(input.kind==='paidOrder'&&input.orderPhase==='deliver'){
      const cargo=input.resource==='parcel'?'parcel':input.orderGood==='food'?'basket':'crate';
      const carried=action('carrying-order','travel','Carrying '+input.amount+' '+input.cargo+' to '+input.destination,cargo,'carry',0);
      return Object.freeze({id:chosen.id,goal:input.goal,assignment:input.assignment,venue,steps:chosen.steps,duration:chosen.duration,pace:1,travel:carried});
    }
    const patience=input.personality?.traits?.patience??input.personality?.patience;
    const pace=Number.isFinite(patience)?1.12-.0024*Math.max(0,Math.min(100,patience)):1;
    return Object.freeze({id:chosen.id,goal:input.goal||chosen.goal,assignment:input.assignment||null,venue,steps:chosen.steps,duration:chosen.duration/pace,pace,travel});
  }
  function stage(plan,seconds,moving=false){
    if(moving)return plan.travel;
    let at=Number.isFinite(seconds)?Math.max(0,seconds)%plan.duration*plan.pace:0;
    for(let index=0;index<plan.steps.length;index++){
      const step=plan.steps[index];if(at<step.duration)return step;at-=step.duration;
    }
    return plan.steps[0];
  }
  root.EarthStreetActivity=Object.freeze({plan,stage,favour,harvestStep});
})(typeof window==='undefined'?globalThis:window);
