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
  const shortcuts=[get('region-open'),get('region-mini')];
  const street=controls('.scene-tools button,.scene-strip button,#housing-bar button').filter(b=>!b.hidden);
  for(const [width,height] of sizes){
    frame.width=width;frame.height=height;
    for(const size of [100,150]){
      doc.documentElement.style.fontSize=size+'%';
      for(const wide of [true,false]){
        doc.body.classList.toggle('street-expanded',wide);
        const name=[width+'×'+height,size+'%',wide?'expanded':'standard'].join(' ');
        checkButtons([...shortcuts,...street],name+' street');
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
if(process.argv.includes('--html')){
  process.stdout.write(page);
}else{
  const dir=mkdtempSync(join(tmpdir(),'common-earth-navigation-'));
  try{
    const file=join(dir,'check.html');writeFileSync(file,page);
    const output=execFileSync(process.env.CHROME_BIN||'google-chrome',[
      '--headless','--disable-dev-shm-usage','--disable-gpu','--no-first-run',
      '--user-data-dir='+join(dir,'profile'),'--dump-dom','--virtual-time-budget=3000',pathToFileURL(file).href
    ],{maxBuffer:8*1024*1024,timeout:60000,stdio:['ignore','pipe','pipe']}).toString();
    const report=output.match(/<pre id="result"[^>]*>([\s\S]*?)<\/pre>/)?.[0];
    if(!report?.includes('data-layout="pass"'))throw new Error(report||'The layout check did not complete.');
    console.log(report.replace(/<[^>]+>/g,''));
  }finally{rmSync(dir,{recursive:true,force:true});}
}
