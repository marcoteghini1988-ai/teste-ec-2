/** Fase 17K: trial CONTROFATTUALE delle Pesanti, NON una modifica di produzione.
 * Mutazione temporanea e sincrona di UN oggetto del catalogo, protetta da finally.
 * Il bot avversario non deve equipaggiare quell'ID: il test verifica questa precondizione.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {ARSENAL_48} from '../src/newCombat/weaponCatalog.js';
import {phase17EnemyLoadout} from '../src/newCombat/phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from '../src/newCombat/phase16ACatalog.js';
import {playF17GBattle} from './f17g_battle.mjs';
import {withF17KTemporaryPattern} from './f17k_trial_scope.mjs';
const root=new URL('../',import.meta.url);
const snaps=JSON.parse(readFileSync(new URL('FASE_17I_EQUIPAGGIAMENTI_REALI.json',root),'utf8')).snapshots;
const sectors=(process.env.SECTORS||'80,110').split(',').map(Number);
const epochs=Number(process.env.EPOCHS||4), reps=Number(process.env.REPLICATES||16),budget=Number(process.env.BUDGET||32);
const prefix=process.env.OUTPUT||'FASE_17K_PATTERN_AB';
const variants=[['originale',null],['aggiungi_scala4','straight_4'],['aggiungi_colore4','flush_4']];
const all=[],snapshots=[];
const avg=(a,k)=>a.length?+(a.reduce((n,r)=>n+(r[k]||0),0)/a.length).toFixed(3):null;
for(const sector of sectors){
 const snap=snaps.find(x=>x.sector===sector&&x.profile==='potenziato');
 if(!snap)throw Error(`Snapshot mancante: ${sector}`);
 const weaponId=snap.gear.armory.equipped.heavy;
 const def=ARSENAL_48.find(w=>w.id===weaponId);
 if(!def || def.weaponClass!=='heavy')throw Error('La Pesante nello snapshot non e valida');
 const ps=PHASE16A_CAMPAIGN_PLANETS[Math.floor((sector-1)/10)].id,ns=(sector-1)%10+1;
 const enemy=phase17EnemyLoadout(ps,ns);
 if(Object.values(enemy).includes(weaponId))throw Error(`Controllo contaminato: arma ${weaponId} usata anche dal boss`);
 const original=def.allowedPokerPatterns;
 const pristine=[...original];
 if(variants.some(([_,pattern])=>pattern&&original.includes(pattern)))throw Error(`Pattern gia presente: ${weaponId}`);
 snapshots.push({sector,playerWeaponId:weaponId,enemyLoadout:enemy,originalPatterns:[...original],source:'17I: equipaggiamento posseduto, nessun nuovo acquisto'});
 for(let epoch=0;epoch<epochs;epoch++)for(let rep=0;rep<reps;rep++){
  for(const [variant,add] of variants){
   {
    const r=withF17KTemporaryPattern(weaponId,add,()=>playF17GBattle(sector,'potenziato',rep,budget,snap.gear,epoch,{trackWeaponUsage:true}));
    if(!r.auditOK || !['player','enemy','draw'].includes(r.result))throw Error(`${sector} ${epoch} ${rep} ${variant}: ${r.errors||r.result}`);
    const usage=r.weaponUsage.player[weaponId]||{attempts:0,salvos:0,shots:0,damage:0,ammoGained:0};
    all.push({sector,epoch,replica:rep,budget,variant,heavyId:weaponId,playerWin:Number(r.result==='player'),result:r.result,exchanges:r.exchanges,playerDamage:r.playerDamage,enemyDamage:r.enemyDamage,passes:r.playerPasses,heavyAttempts:usage.attempts,heavySalvos:usage.salvos,heavyShots:usage.shots,heavyDamage:usage.damage,enemyModuleActivations:r.enemyModuleActivations,auditOK:r.auditOK});
   }
  }
 }
 if(def.allowedPokerPatterns!==original || JSON.stringify(original)!==JSON.stringify(pristine))throw Error('Il catalogo e stato modificato');
 console.log('sector',sector,'complete',all.length,'duels, weapon',weaponId, 'budget',budget);
}
const summaries=[];
for(const sector of sectors){
 const chunk=all.filter(r=>r.sector===sector),base=chunk.filter(r=>r.variant==='originale');
 for(const [variant] of variants){
  const rows=chunk.filter(r=>r.variant===variant);
  const wins=rows.filter(r=>r.result==='player').length;
  const b=rows.reduce((acc,r,i)=>{const x=base[i];if(r.playerWin>x.playerWin)acc.better++;if(r.playerWin<x.playerWin)acc.worse++;if(r.result!==x.result)acc.changedOutcome++;return acc;},{better:0,worse:0,changedOutcome:0});
  summaries.push({sector,variant,duels:rows.length,winCount:wins,winPct:+(100*wins/rows.length).toFixed(2),avgExchanges:avg(rows,'exchanges'),avgPlayerDamage:avg(rows,'playerDamage'),avgHeavySalvos:avg(rows,'heavySalvos'),avgHeavyDamage:avg(rows,'heavyDamage'),avgPasses:avg(rows,'passes'),...b});
 }
}
const csvKeys=Object.keys(all[0]);
writeFileSync(new URL(`${prefix}_DUELLI.csv`,root),[csvKeys.join(','),...all.map(x=>csvKeys.map(k=>JSON.stringify(x[k])).join(','))].join('\n')+'\n');
writeFileSync(new URL(`${prefix}_RISULTATI.json`,root),JSON.stringify({phase:'17K',experiment:'offline transient heavy pattern trial ONLY, no production mutation; player-owned gear snapshot from 17I',budget,epochs,reps,sectors,totalDuels:all.length,auditedDuels:all.filter(x=>x.auditOK).length,snapshots,summary:summaries,limitations:['Manipolazione in memoria limitata al test; la UI non espone queste varianti','Le armi avversarie vengono verificate diverse dalla Pesante giocatore','Non e simulata la scelta dinamica di acquisti successivi','Un aumento di spari non equivale a bilanciamento migliore: confronto PvP e tutta campagna necessario','IA a budget ridotto rispetto alla UI di produzione']},null,2)+'\n');
console.log('FINISHED',all.length,'audit',all.every(x=>x.auditOK));
console.table(summaries.map(({sector,variant,winPct,avgExchanges,avgHeavySalvos,avgHeavyDamage,better,worse})=>({sector,variant,winPct,avgExchanges,avgHeavySalvos,avgHeavyDamage,better,worse})));
