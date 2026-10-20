/** F17G confronto controllato, non tuning: tutte le armi sono acquistate realmente in F17D.
 * La IA sintetica non sostituisce un playtest umano. */
import {writeFileSync} from 'node:fs';
import {playF17GBattle,f17gEconomySnapshot} from './f17g_battle.mjs';
const sectors=(process.env.SECTORS||'50,60').split(',').map(Number);
const profiles=(process.env.PROFILES||'frugale,potenziato,tattico').split(',');
const replicas=Math.max(1,Number(process.env.REPLICAS||25));
const budget=Math.max(1,Number(process.env.BUDGET||50));
const rows=[];
for(const sector of sectors){
 for(const profile of profiles){
  for(let attempt=0;attempt<replicas;attempt++){
   const r=playF17GBattle(sector,profile,attempt,budget);
   rows.push({...r,attempt});
  }
  const subset=rows.filter(r=>r.sector===sector&&r.profile===profile);
  console.log(sector,profile,subset.filter(r=>r.result==='player').length,'/',subset.length,'valid',subset.every(r=>r.auditOK));
 }
}
const headers=Object.keys(rows[0]);
writeFileSync(new URL('../FASE_17G_BOSS_S50_S60_DUELLI.csv',import.meta.url),headers.join(',')+'\n'+rows.map(r=>headers.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n')+'\n');
const groups=sectors.flatMap(sector=>profiles.map(profile=>{
 const r=rows.filter(v=>v.sector===sector&&v.profile===profile);
 const wins=r.filter(v=>v.result==='player').length;
 return {sector,profile,duels:r.length,wins,winRate:+(100*wins/r.length).toFixed(2),averageExchanges:+(r.reduce((a,b)=>a+b.exchanges,0)/r.length).toFixed(2),playerPasses:r.reduce((a,b)=>a+b.playerPasses,0),enemyModuleActivations:r.reduce((a,b)=>a+b.enemyModuleActivations,0),auditValid:r.every(v=>v.auditOK),gear:f17gEconomySnapshot(sector,profile).equipped};
}));
writeFileSync(new URL('../FASE_17G_BOSS_S50_S60_RISULTATI.json',import.meta.url),JSON.stringify({method:'F17F combat engine unchanged; same seeded draws for same sector/replica; AI 50 evaluations/move; F17D star=2 theoretical purchase budget',sectors,profiles,replicas,budget,groups},null,2)+'\n');
console.table(groups.map(({sector,profile,duels,winRate,averageExchanges,auditValid})=>({sector,profile,duels,winRate,averageExchanges,auditValid})));
