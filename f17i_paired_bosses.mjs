/** F17I identical economic inventory and seeded hands per scenario.
 * HP adjustment is used ONLY in this experiment, not in production balance.
 * No-epic and prior-tier cases remove equipment; they do not grant purchases.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {f17iPreviousOwnedTier,f17iNoEpics,f17iSummarizePairs} from '../src/newCombat/tacticalAnalysis.js';
const snapshot=JSON.parse(readFileSync(new URL('../FASE_17I_EQUIPAGGIAMENTI_REALI.json',import.meta.url)));
const replicates=Number(process.env.REPLICATES||30),budget=Number(process.env.BUDGET||16);
if(!Number.isInteger(replicates)||replicates<1||replicates>500)throw Error('Invalid replicas');
const rows=[];const changed=[];
const focus=process.env.FOCUS||'';
const suffix=process.env.OUTPUT_SUFFIX||'';
const outCSV=new URL(`../FASE_17I_BOSS_AB_DUELLI${suffix}.csv`,import.meta.url),outJSON=new URL(`../FASE_17I_BOSS_AB_RISULTATI${suffix}.json`,import.meta.url);
for(const item of snapshot.snapshots){
 if(focus&&focus!==`${item.profile}:${item.sector}`)continue;
 const prior=f17iPreviousOwnedTier(item.gear);
 changed.push({sector:item.sector,profile:item.profile,changed:prior.changed});
 const scenarios=[['controllo',item.gear,{}],['senza_epici',f17iNoEpics(item.gear),{}],['boss_hp_meno_10',item.gear,{enemyHpMultiplier:0.90}]];
 if(prior.changed.length)scenarios.push(['armi_precedenti_possedute',prior.gear,{}]);
 for(let retry=0;retry<replicates;retry++){
  for(const [name,gear,opts] of scenarios){
   // Same sector, same replica, same epoch, same starting RNG and AI budget.
   const r=playF17GBattle(item.sector,item.profile,retry,budget,gear,snapshot.epoch,opts);
   rows.push({sector:item.sector,profile:item.profile,scenario:name,replica:retry,epoch:snapshot.epoch,
    result:r.result,exchanges:r.exchanges,playerHP:r.playerHP,enemyHP:r.enemyHP,playerPasses:r.playerPasses,
    playerShots:r.playerShots,playerDamage:r.playerDamage,enemyDamage:r.enemyDamage,
    playerModuleActivations:r.playerModuleActivations,enemyModuleActivations:r.enemyModuleActivations,
    auditOK:r.auditOK,errors:r.errors});
   if(!r.auditOK||!['player','enemy','draw'].includes(r.result))throw Error(`Invalid ${item.sector}/${item.profile}/${name}/${retry}: ${r.errors}`);
  }
 }
 console.log('17I A/B',item.profile,item.sector,replicates,'replicas');
 const cols=Object.keys(rows[0]);
 writeFileSync(outCSV,cols.join(',')+'\n'+rows.map(r=>cols.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n')+'\n');
 writeFileSync(outJSON,JSON.stringify({phase:'17I',source:'F17H 120-sector sequential ledger with genuine bought gear, snapshot epoch 0',budget,replicates,matchedSeeds:true,
   caveats:['AI budget lower than 2200 UI','identical gear/seed across scenarios, not long-term economic A/B','boss_hp_meno_10 experimental only','No epic = remove passive abilities (not necessarily frequent triggers)'],
   total:rows.length,auditOK:rows.every(x=>x.auditOK),groups:f17iSummarizePairs(rows),previousTierChanges:changed},null,2)+'\n');
}
