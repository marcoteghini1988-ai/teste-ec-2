/** F17F — confronto A/B accoppiato, stesso seed/settore/profilo/replica.
 * Questo è un audit di IA sintetica, non una previsione di percentuali umane.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
function csv(file){
 const text=readFileSync(new URL(file,root),'utf8').trim().split(/\r?\n/);
 const headers=text.shift().split(',');
 return text.map(line=>{
   const pieces=line.match(/(?:"(?:[^"\\]|\\.)*"|[^,]*)?(?:,|$)/g)?.map(s=>s.endsWith(',')?s.slice(0,-1):s)||[];
   const obj={};
   headers.forEach((h,i)=>{const v=pieces[i]??'';try{obj[h]=JSON.parse(v);}catch{obj[h]=v;}});
   return obj;
 });
}
const control=csv('FASE_17F_CONTROL10_SIMULAZIONI_BATTAGLIE.csv');
const tuned=csv('FASE_17F_FINAL10_SIMULAZIONI_BATTAGLIE.csv');
if(control.length!==tuned.length||control.length!==720)throw Error(`Campioni A/B incompleti: ${control.length}/${tuned.length}, richiesti 720/720`);
const key=r=>`${r.sector}|${r.profile}|${r.replica}`;
const byId=new Map(control.map(x=>[key(x),x]));
if(byId.size!==control.length)throw Error('Repliche duplicate A');
if(tuned.some(x=>!byId.has(key(x))))throw Error('Repliche non appaiate');
const valid=r=>r.auditOK===true&&!['error','timeout'].includes(r.result)&&Number.isFinite(r.exchanges);
if([...control,...tuned].some(x=>!valid(x)))throw Error('Campioni con errori o audit invalidi');
const mean=(xs,key)=>xs.length?xs.reduce((s,x)=>s+Number(key(x)),0)/xs.length:0;
const r2=n=>+n.toFixed(2);
function stats(group){
 const a=group.map(r=>byId.get(key(r))),b=group;
 const playerWins=xs=>xs.filter(r=>r.result==='player').length;
 const outcomesChanged=group.filter(x=>byId.get(key(x)).result!==x.result).length;
 return {
  battles:b.length,
  controlsValid:a.length,tunedValid:b.length,
  winRateControl:r2(100*playerWins(a)/a.length),winRateTuned:r2(100*playerWins(b)/b.length),
  avgRoundsControl:r2(mean(a,r=>r.exchanges)),avgRoundsTuned:r2(mean(b,r=>r.exchanges)),
  avgRoundsDelta:r2(mean(b,r=>r.exchanges-byId.get(key(r)).exchanges)),
  longer:b.filter(r=>r.exchanges>byId.get(key(r)).exchanges).length,
  shorter:b.filter(r=>r.exchanges<byId.get(key(r)).exchanges).length,
  changedWinners:outcomesChanged,
  avgPlayerPassesControl:r2(mean(a,r=>r.playerPasses)),avgPlayerPassesTuned:r2(mean(b,r=>r.playerPasses)),
  enemyModuleActivationsControl:a.reduce((s,r)=>s+r.enemyModuleActivations,0),
  enemyModuleActivationsTuned:b.reduce((s,r)=>s+r.enemyModuleActivations,0),
 };
}
const normal=tuned.filter(x=>x.sector%10!==0),boss=tuned.filter(x=>x.sector%10===0);
const perSector=[...new Set(tuned.map(x=>x.sector))].sort((a,b)=>a-b).map(sector=>({sector,kind:sector%10===0?'boss':'normal',...stats(tuned.filter(x=>x.sector===sector))}));
const perProfile=Object.fromEntries(['frugale','potenziato'].map(p=>[p,{
 normal:stats(normal.filter(x=>x.profile===p)),boss:stats(boss.filter(x=>x.profile===p))
}]));
const result={phase:'17F',method:'Poker engine F17E, same 50 AI evaluations and 10 deterministic replicas per sector/profile; 36 sector checkpoints x 2 purchased profiles x 10 replicas, 720 per branch',
 totalPairs:tuned.length,controlVersion:'17E unmodified HP and damage coefficients',tunedVersion:'17F: S1-5 NPC damage 0.50; S6-20 normal 0.62; S1-20 boss 0.52; S21+ normal 0.72 and boss 0.64. HP normal 0.72 early/0.90 later, boss 1.38 early/1.50 later +10; min enemy HP 54',
 normal:stats(normal),boss:stats(boss),byProfile:perProfile,bySector:perSector,
 restrictions:['Inventory purchases assume sector victories and do not model retried campaigns','Simulation AI evaluates 50 moves rather than UI 2200','Not a browser test nor player win-rate','Does not cover all 48 weapons, 33 modules and all terrain/epic/passive combinations']};
writeFileSync(new URL('../FASE_17F_CONFRONTO_AB.json',import.meta.url),JSON.stringify(result,null,2));
const cols=['sector','kind','battles','winRateControl','winRateTuned','avgRoundsControl','avgRoundsTuned','avgRoundsDelta','changedWinners','enemyModuleActivationsControl','enemyModuleActivationsTuned'];
writeFileSync(new URL('../FASE_17F_CONFRONTO_PER_SETTORE.csv',import.meta.url),[cols.join(','),...perSector.map(r=>cols.map(k=>JSON.stringify(r[k])).join(','))].join('\n')+'\n');
console.log('Risultati A/B — norme:',JSON.stringify(result.normal));
console.log('Risultati A/B — boss:',JSON.stringify(result.boss));
console.log('Audit',result.totalPairs,'coppie valide');
