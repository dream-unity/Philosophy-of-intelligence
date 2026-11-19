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
  const roles={
    'seed keeper':'seedkeeper','garden courier':'porter','exchange porter':'porter','supply porter':'porter','foot courier':'courier',
    'co-op delivery driver':'driver','high-school teacher':'teacher','police officer':'police','refuse collector':'refuse',
    'market trader':'trader','exchange worker':'trader','community steward':'convenor','steward':'convenor',
    'council steward':'convenor','school lead':'teacher','builder':'build','dismantling crew':'build'
  };
  const domains={food:'grower',repair:'repairer',exchange:'trader'};
  const venues={garden:'grower',workshop:'repairer',market:'trader',hall:'convenor',bench:'rest',dock:'porter',pier:'porter'};
  const own=(table,key)=>typeof key==='string'&&Object.hasOwn(table,key)?table[key]:null;
  function routine(input){
    const kind=input.kind;
    if(kind==='project'){
      if(input.projectKind==='hobby'){
        if(input.projectPhase==='plan')return input.axis==='music'?planMusic:planPractice;
        if(input.projectPhase==='finish')return input.axis==='music'?finishMusic:finishPractice;
        return own(hobbies,input.axis)||hobbies.craft;
      }
      const project=own(projects,input.projectKind);
      if(project)return own(project,input.projectPhase)||project.work;
    }
    if(kind==='learn'||kind==='study'||input.training&&(!kind||kind==='routine'))return routines.study;
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
    const travel=action(chosen.id+'-travel','travel',driver?'Driving the supply route':porter?'Carrying a supply crate':courier?'Carrying a parcel':'Walking to '+(input.destination||'the next stop'),
      porter?'crate':courier?'parcel':'none',porter||courier?'carry':'walk',0);
    const patience=input.personality?.traits?.patience??input.personality?.patience;
    const pace=Number.isFinite(patience)?1.12-.0024*Math.max(0,Math.min(100,patience)):1;
    return Object.freeze({id:chosen.id,goal:input.goal||chosen.goal,venue,steps:chosen.steps,duration:chosen.duration/pace,pace,travel});
  }
  function stage(plan,seconds,moving=false){
    if(moving)return plan.travel;
    let at=Number.isFinite(seconds)?Math.max(0,seconds)%plan.duration*plan.pace:0;
    for(let index=0;index<plan.steps.length;index++){
      const step=plan.steps[index];if(at<step.duration)return step;at-=step.duration;
    }
    return plan.steps[0];
  }
  root.EarthStreetActivity=Object.freeze({plan,stage});
})(typeof window==='undefined'?globalThis:window);
