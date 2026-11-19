// Run with Chrome, or use --html to open the same self-contained check in another browser.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const game=new URL('../common-earth/',import.meta.url);
const read=name=>readFileSync(new URL(name,game),'utf8');
const markup=read('index.html')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<link\b[^>]*>/gi,tag=>{
    const css=tag.match(/href="([\w-]+\.css)(?:\?[^"]*)?"/);
    return css?'<style>'+read(css[1])+'</style>':'';
  });
const pathScript=read('district-path.js');

function check(frame){
  const doc=frame.contentDocument,get=id=>doc.getElementById(id);
  const controls=sel=>Array.from(doc.querySelectorAll(sel));
  const errors=[],sizes=[[1536,824],[1098,642],[915,412],[820,1180],[740,360],[390,844],[320,568]];
  let checks=0;
  function checkButtons(nodes,label){
    for(const button of nodes){
      button.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      const r=button.getBoundingClientRect();
      if(!r.width||!r.height){errors.push(label+' hidden '+button.textContent);continue;}
      const x=Math.min(6,r.width/4),y=Math.min(6,r.height/4);
      for(const [px,py] of [[r.left+x,r.top+y],[r.right-x,r.top+y],[r.left+r.width/2,r.top+r.height/2],[r.left+x,r.bottom-y],[r.right-x,r.bottom-y]]){
        const hit=doc.elementFromPoint(px,py);checks++;
        if(!hit||!button.contains(hit)){
          errors.push(label+' '+(button.id||button.textContent)+' covered by '+(hit?.id||hit?.tagName));break;
        }
      }
    }
  }
  const route=get('district-crossing');
  frame.contentWindow.EarthDistrictPath.mount(route,{});
  const menu=route.querySelector('.trail-buttons');
  for(const text of ['Look around','Via food sources','Via material sources','Go straight to Stone Town Commons','Turn back']){
    const b=doc.createElement('button');b.textContent=text;menu.append(b);
  }
  doc.body.dataset.mapView='street';get('atlas-stage').hidden=true;
  for(const id of ['street-stage','street-controls','street-navigation','region-mini','scene-original-return','housing-bar']){
    if(get(id))get(id).hidden=false;
  }
  get('scene-store-summary').textContent='418 food · 414 materials · 2895 funds';
  get('scene-goal-summary').textContent='Shared apprenticeship';
  get('stores-ribbon').hidden=false;
  for(const [id,value] of Object.entries({'ribbon-town':'Reed Quay','ribbon-treasury-town':'Reed Quay','ribbon-food':'413','ribbon-materials':'412','ribbon-funds':'3001 funds','ribbon-person':'Hamish Juma','ribbon-balance':'0 funds'}))get(id).textContent=value;
  const shortcuts=[get('region-open'),get('region-mini')];
  const street=controls('.scene-tools button,.scene-strip button,#housing-bar button').filter(b=>!b.hidden);
  for(const [width,height] of sizes){
    frame.width=width;frame.height=height;
    for(const size of [100,150]){
      doc.documentElement.style.fontSize=size+'%';
      for(const wide of [true,false]){
        doc.body.classList.toggle('street-expanded',wide);
        const name=[width+'×'+height,size+'%',wide?'expanded':'standard'].join(' ');
        if(!wide){
          checkButtons([get('world-time')],name+' world clock');
          const clock=get('world-time').getBoundingClientRect(),header=doc.querySelector('.masthead').getBoundingClientRect();
          if(clock.left<header.left+header.width*.5||clock.right>header.right+1)errors.push(name+' world clock outside the upper right');
        }
        checkButtons(controls('#stores-ribbon button'),name+' accounts');
        checkButtons([...shortcuts,...street],name+' street');
        get('street-gate').hidden=false;
        get('gate-status').textContent='Ruth Haddad is attacking you · Your energy 77 · Ruth Haddad’s energy 92';
        checkButtons([get('gate-resist'),get('gate-run'),get('gate-withdraw'),...street],name+' gate');
        get('street-gate').hidden=true;
        // A wrapped goal must not stretch a one-line Atlas button to the height of two rows.
        if(shortcuts[0].offsetHeight>shortcuts[1].offsetHeight+8)errors.push(name+' stretched Atlas shortcut');
        route.hidden=false;doc.body.toggleAttribute('data-district-crossing',true);
        checkButtons([...shortcuts,...menu.children],name+' journey');
        route.hidden=true;doc.body.removeAttribute('data-district-crossing');
        get('region-view').hidden=false;
        checkButtons(controls('#region-view nav button,#region-view nav select'),name+' atlas');
        get('region-view').hidden=true;
      }
    }
  }
  return {checks,errors};
}

// srcdoc gives every viewport the real cascade, independent scrolling and native
// hit-testing, without connecting to a player save, downloading art or starting a clock.
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const page='<!doctype html><meta charset="utf-8"><title>Common Earth navigation check</title>'+
  '<pre id="result">Running</pre><iframe title="Game controls"></iframe><script>'+
  'const frame=document.querySelector("iframe");frame.onload=()=>{try{const r=('+check.toString()+')(frame);'+
  'result.textContent=JSON.stringify(r);result.dataset.layout=r.errors.length?"fail":"pass";}'+
  'catch(e){result.textContent=e.stack;result.dataset.layout="fail";}};frame.srcdoc='+
  json(markup.replace('</body>','<script>'+pathScript+'</script></body>'))+';</script>';
// Use the production entry point and a private Chrome profile for the destructive
// controls. Keep the actual save manager, action queue and modal event handlers.
function seedWorld(){
  const book=window.EarthSaves.open(),sim=book.sim;
  window.EarthSaves={...window.EarthSaves,open:()=>book};
  const perform=sim.perform.bind(sim);let lastCommand;
  sim.perform=(command,...args)=>{
    const promise=perform(command,...args);
    if(['diplomacy','baseOrder','manageSite','setWorldPace'].includes(command))lastCommand=promise;
    return promise;
  };
  const founded=sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false});
  if(!founded.ok)throw Error(founded.message);
  window.addEventListener('load',async()=>{
    const result=document.getElementById('flow-result'),get=id=>document.getElementById(id);
    const found=(parent,label)=>Array.from(parent.querySelectorAll('button')).find(b=>b.textContent===label);
    const click=(button)=>{if(!button||button.disabled)throw Error('Expected an enabled control');button.click();};
    const commit=async(button)=>{
      lastCommand=null;click(button);
      if(!lastCommand)throw Error('Expected a game command from '+button.textContent);
      const result=await lastCommand;if(!result.ok)throw Error(result.message);
    };
    const until=async(test,label)=>{
      for(let i=0;i<100;i++){if(test())return;await new Promise(done=>setTimeout(done,20));}
      throw Error(label);
    };
    try{
      const home=sim.active(),other=sim.state.communityLife.outposts[0],id=other.id;
      click(get('world-time'));
      const clock=get('world-time-dialog');
      await commit(found(clock,'12×'));await until(()=>get('time-rate').textContent==='12×','World speed did not change');
      await commit(found(clock,'1×'));await until(()=>get('time-rate').textContent==='1×','Normal speed did not resume');
      click(get('clock-venues'));
      for(const [type,name] of [['Night club','Afterglow'],['Café','The Reading Room'],['Video game store','Pixel Exchange']]){
        click(found(get('venue-choices'),type));
        if(get('venue-name').textContent!==name)throw Error('Missing venue '+name);
      }
      if(get('venue-attendance').querySelectorAll('li').length!==3||get('station-select').options.length!==6)throw Error('Missing paired gaming stations');
      click(get('leisure-dialog').querySelector('form button'));
      click(get('society-open'));
      const row=()=>Array.from(get('site-list').children).find(b=>b.querySelector('strong')?.textContent===other.name);
      click(found(row(),'Restart'));click(get('community-cancel'));
      if(other!==window.EarthCommunityLife.lookup(sim.state,id))throw Error('Cancelled restart changed the town');
      click(found(row(),'Restart'));const gen=other.foundingRevision;await commit(get('community-apply'));
      await until(()=>window.EarthCommunityLife.lookup(sim.state,id)?.foundingRevision!==gen,'Restart did not reset this town');
      click(found(row(),'Delete'));await commit(get('community-apply'));
      await until(()=>!window.EarthCommunityLife.lookup(sim.state,id),'Delete did not remove this town');
      if(sim.active().id!==home.id)throw Error('Deleting a neighbour moved the player');
      click(get('society-town-centre'));
      const dialog=get('town-centre'),foreign=dialog.querySelector('section select'),rival=sim.state.communityLife.outposts.at(-1);
      foreign.value=rival.id;foreign.dispatchEvent(new Event('change'));
      await commit(found(dialog,'Declare war'));
      await until(()=>found(dialog,'Negotiate peace'),'Declaration did not reach the Town Centre');
      await commit(found(dialog,'Negotiate peace'));await until(()=>found(dialog,'Accept ceasefire terms'),'No terms offered');
      await commit(found(dialog,'Accept ceasefire terms'));await until(()=>found(dialog,'Declare war'),'Peace did not take effect');
      if(window.EarthBorderConflict.relation(sim.state,home.id,rival.id)?.state!=='peace')throw Error('Treaty missing from world');
      click(found(dialog,'Open military base'));
      const base=get('military-base'),towns=base.querySelector('select');
      if(towns.options.length!==sim.state.sites.length+sim.state.communityLife.outposts.length)throw Error('Town base is missing');
      await commit(found(base,'Enlist guard'));
      await until(()=>sim.active().militaryBase?.units.some(u=>u.type==='guard'),'Recruit did not spawn at the base');
      click(found(base,'Operations'));
      const guard=base.querySelector('fieldset input');click(guard);
      const target=base.querySelector('[aria-label="Mission destination"]'),otherName=target.selectedOptions[0].textContent;
      await commit(found(base,'Attack '+otherName));
      await until(()=>sim.active().militaryBase?.missions[0]?.target===target.value,'Base deployment did not launch');
      result.dataset.layout='pass';result.textContent='World clock, venues, community management, diplomacy, base recruitment and deployment verified.';
    }catch(error){result.dataset.layout='fail';result.textContent=String(error.stack||error);}
  });
}
if(process.argv.includes('--html')){
  process.stdout.write(page);
}else{
  const dir=mkdtempSync(join(tmpdir(),'common-earth-navigation-'));
  try{
    const file=join(dir,'check.html');writeFileSync(file,page);
    function run(file,resultId){
      const output=execFileSync(process.env.CHROME_BIN||'google-chrome',[
        '--headless','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--allow-file-access-from-files',
        '--user-data-dir='+join(dir,'profile'),'--dump-dom','--virtual-time-budget=15000',pathToFileURL(file).href
      ],{maxBuffer:8*1024*1024,timeout:60000,stdio:['ignore','pipe','pipe']}).toString();
      const report=output.match(new RegExp('<pre id="'+resultId+'"[^>]*>[\\s\\S]*?</pre>'))?.[0];
      if(!report?.includes('data-layout="pass"'))throw new Error(report||'The browser check did not complete.');
      console.log(report.replace(/<[^>]+>/g,''));
    }
    run(file,'result');
    const fixture=join(dir,'seed.js'),flow=join(dir,'flow.html');
    writeFileSync(fixture,'('+seedWorld.toString()+')();');
    writeFileSync(flow,read('index.html').replace('<head>','<head><base href="'+game.href+'">')
      .replace('<script src="app.js','<script src="'+pathToFileURL(fixture).href+'" defer></script><script src="app.js')
      .replace('</body>','<pre id="flow-result">Waiting for the game</pre></body>'));
    run(flow,'flow-result');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
