/** F17J paired A/B: advisor puo' cambiare SOLO equipaggiamento di armi gia' acquistate. */
import {readFileSync,writeFileSync} from 'node:fs';
import {f17jRecommendOwned} from '../src/newCombat/tacticalAnalysis.js';
import {playF17GBattle} from './f17g_battle.mjs';
const base=new URL('../',import.meta.url);
const snapshots=JSON.parse(readFileSync(new URL('FASE_17I_EQUIPAGGIAMENTI_REALI.json',base))).snapshots;
const csv=readFileSync(new URL('FASE_17G_48_ARMI_DISPONIBILITA_POKER.csv',base),'utf8').trim().split('\n');
const rates=Object.fromEntries(csv.slice(1).map(s=>{const cols=s.split(',');return [JSON.parse(cols[0]),Number(cols[6])];}));
const EPOCHS=Number(process.env.EPOCHS||5),REPLICATES=Number(process.env.REPLICATES||12),BUDGET=Number(process.env.BUDGET||16);
const groups=[],rows=[];
for(const item of snapshots){
 const rec=f17jRecommendOwned(item.gear,rates);
 groups.push({profile:item.profile,sector:item.sector,changes:rec.changes,expectedScoreBefore:rec.originalScore,expectedScoreAfter:rec.estimatedScore});
 if(!rec.changes.length){console.log('UNCHANGED',item.profile,item.sector);continue;}
 for(let epoch=0;epoch<EPOCHS;epoch++)for(let replica=0;replica<REPLICATES;replica++){
  for(const [variant,gear] of [['attuale',item.gear],['consiglio_posseduto',rec.gear]]){
   const r=playF17GBattle(item.sector,item.profile,replica,BUDGET,gear,epoch,{trackWeaponUsage:true});
   if(!r.auditOK||!['player','enemy','draw'].includes(r.result))throw Error(`${variant} ${item.profile} ${item.sector}: ${r.errors}`);
   rows.push({profile:item.profile,sector:item.sector,epoch,replica,variant,result:r.result,exchanges:r.exchanges,playerShots:r.playerShots,playerPasses:r.playerPasses,playerDamage:r.playerDamage,enemyDamage:r.enemyDamage,weaponUsage:JSON.stringify(r.weaponUsage.player),auditOK:r.auditOK});
  }
 }
 console.log('COMPARED',item.profile,item.sector,rows.length);
}
const summary=groups.map(g=>{
 const old=rows.filter(r=>r.profile===g.profile&&r.sector===g.sector&&r.variant==='attuale');
 const proposed=rows.filter(r=>r.profile===g.profile&&r.sector===g.sector&&r.variant==='consiglio_posseduto');
 const agg=a=>({duels:a.length,wins:a.filter(r=>r.result==='player').length,draws:a.filter(r=>r.result==='draw').length,avgPlayerDamage:a.length?+(a.reduce((n,r)=>n+r.playerDamage,0)/a.length).toFixed(2):null,avgPasses:a.length?+(a.reduce((n,r)=>n+r.playerPasses,0)/a.length).toFixed(2):null});
 return {...g,baseline:agg(old),advisor:agg(proposed),changedWinners:old.filter((r,i)=>r.result!==proposed[i]?.result).length};
});
if(!rows.length)throw Error('Nessun cambio suggerito, A/B impossibile');
writeFileSync(new URL('FASE_17J_AB_POSSEDUTE.csv',base),[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(x=>JSON.stringify(x)).join(','))].join('\n')+'\n');
writeFileSync(new URL('FASE_17J_AB_POSSEDUTE.json',base),JSON.stringify({phase:'17J',source:'snapshot del ledger acquistabile 17H riprodotto in 17I',budget:BUDGET,epochs:EPOCHS,replicates:REPLICATES,totalDuels:rows.length,auditOK:rows.every(r=>r.auditOK),groups:summary,caveats:['advisor teorico su dati di mani casuali precedenti','nessuna compravendita o upgrade durante A/B','non misura impatto economico a lungo termine']},null,2)+'\n');
console.log('FINISHED',rows.length,'all auditOK',rows.every(r=>r.auditOK));
