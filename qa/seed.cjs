const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=function(folder,snapshot){
const dir=path.resolve(folder,'common-earth');
let clock=1750000000000;
class Clock extends Date{static now(){return clock}}
const q=vm.createContext({Date:Clock,console,structuredClone});q.window=q;
for(const [,file] of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="([\w-]+)\.js/g)){
vm.runInContext(fs.readFileSync(dir+'/'+file+'.js','utf8'),q,{filename:file+'.js'});if(file==='simulation')break;}
const sim=q.CommonEarthSim.create({storage:null,snapshot});if(!sim.active())sim.found({name:'Stone Town',lat:-6.1622,lon:39.1922,coastal:true,water:false});
const w=sim.state;
return {sim,q,w,step(){clock+=24100;const r=sim.production(w.productionSerial||0,()=>true);if(!r.ok)throw Error(r.message)},week(){clock+=120000;const r=sim.advance();if(!r.ok)throw Error(r.message)}};
}
const f=module.exports('before');for(let i=0;i<5;i++)f.step();fs.writeFileSync('fixture.json',JSON.stringify(f.w));
