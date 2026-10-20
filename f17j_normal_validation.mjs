/** F17J: verifica trasferibilita' del solo cambio armi POSSEDUTE sui normali 81,85,89.
 * L'inventario prima del boss 80 e' congelato, quindi scenario condizionale
 * e NON una nuova campagna cronologica: nessun premio/acquisto successivo simulato.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {f17jRecommendOwned} from '../src/newCombat/tacticalAnalysis.js';
const root=new URL('../',import.meta.url);
const snapshot=JSON.parse(readFileSync(new URL('FASE_17I_EQUIPAGGIAMENTI_REALI.json',root))).snapshots.find(s=>s.profile==='potenziato'&&s.sector===80);
const lines=readFileSync(new URL('FASE_17G_48_ARMI_DISPONIBILITA_POKER.csv',root),'utf8').trim().split('\n');
const rates=Object.fromEntries(lines.slice(1).map(line=>{const a=line.split(',');return [JSON.parse(a[0]),Number(a[6])];}));
const suggestion=f17jRecommendOwned(snapshot.gear,rates);
if(suggestion.changes.length===0)throw Error('Il profilo non cambia, verifica non significativa');
const REPLICATES=Number(process.env.REPLICATES||8),EPOCHS=Number(process.env.EPOCHS||5),BUDGET=Number(process.env.BUDGET||12);
const rows=[];
for(const sector of [81,85,89]){
 for(let epoch=0;epoch<EPOCHS;epoch++)for(let replica=0;replica<REPLICATES;replica++){
  for(const [variant,gear] of [['attuale',snapshot.gear],['consiglio_posseduto',suggestion.gear]]){
   const r=playF17GBattle(sector,'potenziato',replica,BUDGET,gear,epoch,{trackWeaponUsage:true});
   if(!r.auditOK||!['player','enemy','draw'].includes(r.result))throw Error(`${sector}/${epoch}/${replica}/${variant}: ${r.errors}`);
   rows.push({sector,epoch,replica,variant,result:r.result,exchanges:r.exchanges,playerDamage:r.playerDamage,playerPasses:r.playerPasses,playerShots:r.playerShots,auditOK:r.auditOK});
  }
 }
 console.log('NORMAL DONE',sector);
}
const groups=[81,85,89].map(s=>({sector:s,variants:['attuale','consiglio_posseduto'].map(name=>{
 const x=rows.filter(r=>r.sector===s&&r.variant===name);
 return {variant:name,n:x.length,wins:x.filter(r=>r.result==='player').length,avgExchanges:+(x.reduce((a,b)=>a+b.exchanges,0)/x.length).toFixed(2),avgPlayerDamage:+(x.reduce((a,b)=>a+b.playerDamage,0)/x.length).toFixed(2),avgPasses:+(x.reduce((a,b)=>a+b.playerPasses,0)/x.length).toFixed(2)};
})}));
writeFileSync(new URL('FASE_17J_NORMALI_AB.csv',root),[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(x=>JSON.stringify(x)).join(','))].join('\n')+'\n');
writeFileSync(new URL('FASE_17J_NORMALI_AB.json',root),JSON.stringify({phase:'17J',source:'inventario acquisito prima boss 80 mantenuto fisso nei settori 81/85/89',budget:BUDGET,replicates:REPLICATES,epochs:EPOCHS,totalDuels:rows.length,auditOK:rows.every(x=>x.auditOK),changes:suggestion.changes,groups,limitation:'Gli acquisti ed eventi di economia dei settori 81..89 NON vengono simulati: si isola la scelta dello slot prima dell\'ingresso.'},null,2)+'\n');
console.log('NORMAL COMPLETE',rows.length);
