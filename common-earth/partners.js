/* Independent fictional civic groups. Natural Earth populated-place anchors.
 * The city simulation pays player action costs, advances the common clock, and
 * forecasts on detached state. An agreement belongs to the home that signed it. */
(function(root){
  'use strict';
  const groups=[
    {key:'tidebench',name:'Tide Bench Circle',locality:'Kochi, India',lat:10.017,lon:76.222,delegate:'Ira',role:'repair coordinator',exportGood:'materials',importGood:'food',reserve:3,offset:2,
     interest:'The repair circle recovers fittings. Its volunteer shifts depend on a shared meal.',voice:'If I send the last spare, the next pump stays broken. Show me what stays on our shelf.',held:'a kit for the next repair shift'},
    {key:'dawn-table',name:'Dawn Table',locality:'Dakar, Senegal',lat:14.7178,lon:-17.4751,delegate:'Sali',role:'kitchen steward',exportGood:'food',importGood:'materials',reserve:4,offset:0,
     interest:'The kitchens can share meals when their own tables are covered. Spare crates keep food moving between them.',voice:'We count the people at the late table before we count the baskets we can send.',held:'meal baskets for the late sitting'},
    {key:'shelf',name:'Slope Shelf Co-op',locality:'Salvador, Brazil',lat:-12.968,lon:-38.4819,delegate:'Lia',role:'storekeeper',exportGood:'food',importGood:'funds',reserve:3,offset:3,
     interest:'The co-op pools a weekly harvest. Driver payments matter as much as the crop.',voice:'A full shelf at the depot does not pay the person carrying it uphill.',held:'food for its neighbourhood shelves'},
    {key:'key-room',name:'Key Room Exchange',locality:'Porto, Portugal',lat:41.152,lon:-8.6219,delegate:'Noa',role:'booking secretary',exportGood:'funds',importGood:'materials',reserve:3,offset:4,
     interest:'The shared workroom earns booking fees. Replacement fittings keep the benches open.',voice:'The fee pot belongs to everyone who keeps this room open. I cannot empty it for a visitor.',held:'next week’s room bookings'},
    {key:'winter-rota',name:'Winter Rota',locality:'Halifax, Canada',lat:44.65,lon:-63.6,delegate:'Kit',role:'shift organiser',exportGood:'materials',importGood:'funds',reserve:4,offset:1,
     interest:'Members gather reusable timber and fittings. Paid relief shifts keep the work from falling on the same people.',voice:'A promised shift is someone’s afternoon. Tell us early if you cannot cover it.',held:'fittings promised to its own crews'},
    {key:'river-bench',name:'River Bench',locality:'Hobart, Australia',lat:-42.85,lon:147.295,delegate:'Jo',role:'roster keeper',exportGood:'funds',importGood:'food',reserve:3,offset:5,
     interest:'A repair rota earns small fees. Shared food lets people stay for a second shift.',voice:'If supper is settled, another pair of hands can stay and finish the job.',held:'the shared shift fund'}
  ];
  const byKey=new Map(groups.map(d=>[d.key,d]));
  const made=[2,2,1,2,2,1],used=[2,1,3,1,1,2];
  const phase=(week,d)=>(week+d.offset)%6;
  const minStock=(week,d)=>d.reserve+Number([1,2].includes(phase(week,d)));
  const bounded=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const qty=(n,good)=>n+' '+good;
  function fresh(d,week){return {met:false,standing:0,stock:d.reserve+2+phase(week,d)%4,inputs:2+phase(week,d)%3,cooldown:0,agreement:null,offer:null,history:[]};}
  function view(world,d){return world.partners?.[d.key]||fresh(d,world.week);}
  function write(world,d,week=world.week){
    if(!world.partners)world.partners={};
    if(!world.partners[d.key])world.partners[d.key]=fresh(d,week);
    return world.partners[d.key];
  }
  function log(state,week,text){
    state.history.unshift({week,text});state.history.length=Math.min(state.history.length,7);
    return text;
  }
  const relationship=n=>n<=-2?'Guarded':n<0?'Cautious':n===0?'New contact':n===1?'On speaking terms':n<4?'Trusted trading partners':'Longstanding partners';
  const depositFor=state=>state.standing<0?2:1;
  function km(a,b){
    const rad=Math.PI/180,x=Math.sin((a.lat-b.lat)*rad/2),y=Math.sin((a.lon-b.lon)*rad/2);
    return 12742*Math.asin(Math.sqrt(bounded(x*x+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*y*y,0,1)));
  }
  function travel(distance){return distance<=1800?1:distance<=7500?2:3;}
  function status(state,d,world) {
    const a=state.agreement,o=state.offer;
    if(a?.phase==='pledge')return 'Holding '+qty(a.reserved,d.exportGood)+'. The balance is due by the end of week '+a.due+'.';
    if(a?.phase==='outbound')return qty(a.paid,d.importGood)+' is travelling to '+d.name+'. Arrival in week '+a.due+'.';
    if(a?.phase==='return')return qty(a.returned,d.exportGood)+' is travelling home. Arrival in week '+a.due+'.';
    if(a?.phase==='forfeit')return 'The forfeited deposit is on its way to the group, due in week '+a.due+'.';
    if(o)return (o.kind==='bulk'?'The delegate approved the larger terms.':'The delegate offered different terms.')+' Reply by the end of week '+o.due+'.';
    if(state.cooldown>world.week)return 'Local members are using the next shift. Talks reopen in week '+state.cooldown+'.';
    return state.met?'Open to a proposal.':'Available for a first meeting.';
  }
  function get(world,home,key) {
    const d=byKey.get(key);if(!d||!home)return null;
    const state=view(world,d),distance=Math.round(km(home,d)),reserve=minStock(world.week,d);
    const a=state.agreement,o=state.offer,signer=world.sites.find(s=>s.id===(a?.homeId||o?.homeId));
    return {id:'partner-'+d.key,partnerId:d.key,kind:'partner',water:false,lat:d.lat,lon:d.lon,name:d.name,locality:d.locality,region:d.locality,
      delegate:d.delegate+', '+d.role,interest:d.interest,voice:d.voice,distance,distanceKm:distance,weeks:travel(distance),standing:state.standing,relation:state.met?relationship(state.standing):'Unmet',
      exportGood:d.exportGood,importGood:d.importGood,stock:state.stock,inputs:state.inputs,reserve,surplus:Math.max(0,state.stock-reserve),met:state.met,
      activity:state.activity||'',status:status(state,d,world)+(signer&&signer.id!==home.id?' Signed from '+signer.name+'.':''),history:state.history.map(h=>({...h})),agreement:a?{...a}:null,offer:o?{...o}:null};
  }
  function list(world,home){return home?groups.map(d=>get(world,home,d.key)).sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name)):[];}
  function answerReserve(world,site,d,state,count,total,days){
    const deposit=depositFor(state);
    state.stock-=count;state.offer=null;
    state.agreement={phase:'pledge',homeId:site.id,days,due:world.week+2,paid:deposit,balance:total-deposit,reserved:count,returned:0};
    return log(state,world.week,d.delegate+' set aside '+qty(count,d.exportGood)+' for '+site.name+'. Your deposit is '+qty(deposit,d.importGood)+'. Dispatch the '+qty(total-deposit,d.importGood)+' balance by the end of week '+(world.week+2)+'.');
  }
  function release(world,d,state) {
    const a=state.agreement;
    state.stock+=a.reserved;state.standing=bounded(state.standing-1,-3,4);
    state.agreement={...a,phase:'forfeit',due:world.week+a.days,reserved:0,balance:0};
    return log(state,world.week,d.name+' released the reserved '+d.exportGood+' to its members. The '+qty(a.paid,d.importGood)+' booking deposit goes to the group. Standing fell to '+state.standing+'.');
  }
  function actions(world,site,add){
    if(!site)return;
    for(const d of groups) {
      const state=view(world,d),p=get(world,site,d.key),days=p.weeks,deposit=depositFor(state);
      const opt=(verb,title,description,terms,run)=>add('routes','partner:'+d.key+':'+verb,title,description,{partner:true,partnerId:d.key,...terms},()=>run(write(world,d)));
      if(!state.met){
        opt('meet','Meet '+d.delegate,'Take one effort to hear the '+d.role+' speak for '+d.name+'. “'+d.voice+'”',{},s=>{
          s.met=true;return log(s,world.week,d.delegate+' of '+d.name+' opened talks. “'+d.voice+'” The group offers '+d.exportGood+' and uses '+d.importGood+'.');
        });continue;
      }
      const a=state.agreement,o=state.offer;
      if(a){
        if(a.phase==='pledge' && a.homeId===site.id){
          opt('dispatch','Honour the booking','Pay the '+qty(a.balance,d.importGood)+' balance and dispatch the full consignment. The reserved return is due in '+(2*a.days)+' weeks.',{goods:{[d.importGood]:a.balance}},s=>{
            const pact=s.agreement;
            s.agreement={...pact,phase:'outbound',paid:pact.paid+pact.balance,balance:0,due:world.week+pact.days};
            return log(s,world.week,site.name+' dispatched '+qty(s.agreement.paid,d.importGood)+' to '+d.name+'. The reserved return is due in week '+(world.week+2*pact.days)+'.');
          });
          opt('release','Release the booking','Give up the deposit and lose one standing. Members regain their reserved '+d.exportGood+'.',{effort:0},s=>release(world,d,s));
        }
        continue;
      }
      if((o && o.homeId!==site.id) || state.cooldown>world.week)continue;
      const fixed=(count,cost,verb,title)=>{
        const needed=count-p.surplus;
        const refusal=state.standing<=-2?d.delegate+' declined to reserve more stock after two broken commitments. A completed member-led consignment can rebuild standing.':
          needed>0?d.delegate+' is protecting '+qty(p.reserve,d.exportGood)+' for local members. '+needed+' more would be needed to guarantee this return.':'';
        opt(verb,title,'Put '+qty(deposit,d.importGood)+' into booking escrow now and promise '+qty(cost-deposit,d.importGood)+' more within two weeks. The group holds '+qty(count,d.exportGood)+' for you. Missing the balance forfeits the deposit and lowers standing.',
          {goods:{[d.importGood]:deposit},gate:refusal},
          s=>answerReserve(world,site,d,s,count,cost,days));
      };
      const flexible=()=>{
        const max=state.standing>=2?4:3;
        opt('share','Give the group first call','Send '+qty(2,d.importGood)+' now. After its own needs are met, the group will return up to '+qty(max,d.exportGood)+'. It may keep everything. The outbound leg takes '+days+' week'+(days===1?'':'s')+'.',
          {goods:{[d.importGood]:2}},s=>{
            s.offer=null;s.agreement={phase:'outbound',homeId:site.id,days,due:world.week+days,paid:2,balance:0,reserved:0,returned:0,limit:max};
            return log(s,world.week,site.name+' sent '+qty(2,d.importGood)+'. '+d.delegate+' will decide what the group can spare in week '+(world.week+days)+'.');
          });
      };
      if(o){
        if(o.kind==='bulk')fixed(4,4,'sign','Sign the larger booking');
        else {fixed(2,3,'sign','Take the smaller guaranteed booking');flexible();}
        opt('decline','Leave the offer open for another time','Close these talks without cost or loss of standing. A new proposal can be made next week.',{effort:0},s=>{
          s.offer=null;s.cooldown=world.week+1;return log(s,world.week,'The talks ended without a booking. '+d.delegate+' will hear a new proposal next week.');
        });continue;
      }
      fixed(2,3,'book','Book a guaranteed return');
      flexible();
      opt('ask','Propose a larger exchange','Ask for '+qty(4,d.exportGood)+' against '+qty(4,d.importGood)+'. The delegate weighs standing and uncommitted stock before consenting. A conversation costs one effort.',{},s=>{
        const trusted=s.standing>=2,plenty=s.stock-minStock(world.week,d)>=4;
        const approved=trusted&&plenty;
        s.offer={homeId:site.id,kind:approved?'bulk':'counter',due:world.week+2};
        const why=approved?'We can stand behind four units for this booking.':
          !trusted?'Our members want two completed exchanges in good standing before we commit four. We can discuss a smaller booking or let our members decide what to return.':
          'Our ledger cannot spare four units after local needs. We can discuss a smaller booking or a share decided on arrival.';
        return log(s,world.week,d.delegate+' replied, “'+why+'” The offer stays open through week '+s.offer.due+'. Stock is held when both sides sign.');
      });
    }
  }
  function domestic(d,s,week){
    const i=phase(week,d);
    // Local activity continues even when the player has never visited. An
    // imported input supports production; protected stocks are set by members.
    s.inputs+=Number(i%2===0);
    const worked=Number(s.inputs>0);
    s.inputs-=worked;
    const raised=made[i]+worked,consumed=Math.min(s.stock+raised,used[i]);
    s.stock=bounded(s.stock+raised-consumed,0,12);
    s.activity='Week '+week+' · Members brought in '+qty(raised,d.exportGood)+' and used '+consumed+' locally.'+
      (consumed<used[i]?' The local call exceeded the available stock.':worked?' One '+d.importGood+' unit supported the shift.':' The group worked without imported support.');
  }
  function tick(world,{apply}){
    const events=[];
    for(const d of groups){
      const s=write(world,d,world.week-1);
      const event=(siteId,text,type=null)=>{log(s,world.week,text);events.push({siteId,text,type});};
      if(s.offer && s.offer.due<world.week)s.offer=null;
      let a=s.agreement;
      const due=a && a.due<=world.week;
      if(a?.phase==='pledge' && a.due<world.week){
        const message=release(world,d,s);
        events.push({siteId:a.homeId,text:message,type:null});
        a=s.agreement;
      }
      const arrived=a && a.phase==='outbound' && a.due===world.week;
      if(arrived)s.inputs+=a.paid;
      if(a?.phase==='forfeit' && a.due===world.week){
        s.inputs+=a.paid;event(a.homeId,d.name+' received the forfeited '+qty(a.paid,d.importGood)+'. Talks can reopen next week.');
        s.agreement=null;s.cooldown=world.week+1;
      }
      domestic(d,s,world.week);
      if(arrived){
        const amount=a.reserved || Math.min(a.limit,Math.max(0,s.stock-minStock(world.week,d)));
        if(!a.reserved)s.stock-=amount;
        s.standing=bounded(s.standing+1,-3,4);
        if(amount){
          s.agreement={...a,phase:'return',due:world.week+a.days,returned:amount};
          const reason=a.reserved?'The group kept its guaranteed booking.':'Members protected '+d.held+' and voted to release '+qty(amount,d.exportGood)+'.';
          event(a.homeId,d.name+' received '+qty(a.paid,d.importGood)+'. '+reason+' Return cargo of '+qty(amount,d.exportGood)+' is due in week '+s.agreement.due+'. Standing '+s.standing+'.');
        }else{
          s.agreement=null;s.cooldown=world.week+1;
          event(a.homeId,d.name+' received '+qty(a.paid,d.importGood)+'. Members kept their remaining '+d.exportGood+' for '+d.held+'. They sent no return cargo. Standing '+s.standing+' for respecting their decision.');
        }
      }else if(due && a.phase==='return'){
        const home=world.sites.find(z=>z.id===a.homeId);
        if(home){
          const delta=apply(home,{[d.exportGood]:a.returned});
          event(home.id,qty(delta[d.exportGood],d.exportGood)+' arrived from '+d.name+' at '+home.name+'.', 'arrivals');
        }
        s.agreement=null;s.cooldown=world.week+1;
      }
    }
    return events;
  }
  function valid(data,ids){
    if(data==null)return true;
    if(typeof data!=='object' || Array.isArray(data))return false;
    const int=(v,lo,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
    return Object.entries(data).every(([key,s])=>{
      if(!byKey.has(key)||!s||s.activity!=null&&typeof s.activity!=='string'||typeof s.met!=='boolean'||!int(s.standing,-3,4)||!int(s.stock,0)||!int(s.inputs,0)||!int(s.cooldown,0))return false;
      if(!Array.isArray(s.history)||s.history.length>7||!s.history.every(e=>e&&int(e.week,1)&&typeof e.text==='string'))return false;
      const a=s.agreement,o=s.offer;
      if((a||o)&&!s.met)return false;
      if(o && (!ids.has(o.homeId)||!['bulk','counter'].includes(o.kind)||!int(o.due,1)))return false;
      if(!a)return true;
      if(o||!ids.has(a.homeId)||!['pledge','outbound','return','forfeit'].includes(a.phase)||!int(a.days,1,3)||!int(a.due,1)||!int(a.paid,1,4)||!int(a.balance,0,3)||!int(a.reserved,0,4)||!int(a.returned,0,4))return false;
      if(a.phase==='pledge')return [2,4].includes(a.reserved)&&a.balance>0;
      if(a.phase==='return')return a.returned>0&&a.balance===0;
      if(a.phase==='forfeit')return a.reserved===0 && a.balance===0;
      return a.balance===0 && (a.reserved===2||a.reserved===4||a.reserved===0&&int(a.limit,3,4));
    });
  }
  root.EarthPartners=Object.freeze({list,get,actions,tick,valid});
})(typeof window==='undefined'?globalThis:window);
