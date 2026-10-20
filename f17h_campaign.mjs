/** Campaign v17H - multi-seed battle audit with earned 1/2/3-star challenges,
 * actual no-revive boss bonuses, voluntary epic rifts, two-slot forge, draw refunds.
 * Uses full F17G duel FSM. Does NOT overwrite savegames or gameplay catalog.
 */
import {writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {createF17HProgression,f17hShopBeforeAttempt,f17hSettleBattle,f17hCurrentEquipment,f17hPilotLevel} from '../src/newCombat/phase17HProgression.js';
const epochs=(process.env.EPOCHS||'0,1,2,3,4').split(',').map(Number);
const profiles=(process.env.PROFILES||'frugale,potenziato,tattico').split(',');
const budget=Number(process.env.BUDGET||16),maxRetries=Number(process.env.MAX_RETRIES||24);
const prefix=process.env.OUTPUT||'FASE_17H_CAMPAGNE';
const results=[],summaries=[];
for(const epoch of epochs)for(const profile of profiles){
 const s=createF17HProgression({profile,fuseEpics:process.env.FUSE_EPICS!=='0'});
 let failed=false,stopReason='';
 for(let sector=1;sector<=120;sector++){
  let won=false;
  for(let retry=0;retry<maxRetries;retry++){
   f17hShopBeforeAttempt(s);
   const gear=f17hCurrentEquipment(s);
   const r=playF17GBattle(sector,profile,retry,budget,gear,epoch);
   if(!r.auditOK||!['player','enemy','draw'].includes(r.result)){
    results.push({epoch,...r,failed:true});failed=true;stopReason=r.errors||r.result;break;
   }
   f17hSettleBattle(s,r);
   const h=s.history.at(-1);
   results.push({epoch,...r,credits:h.creditBalance,pilotLevel:h.pilotLevel,stars:h.stars, fusions:h.fusions,forgePending:h.forgePending,
    light:gear.armory.equipped.light,medium:gear.armory.equipped.medium,heavy:gear.armory.equipped.heavy,epicIds:gear.epics.map(x=>x.id).join('|'),
    totalMinutes:h.overallMinutes});
   if(r.result==='player'){won=true;break;}
  }
  if(!won){failed=true;if(!stopReason)stopReason=`Retry limit reached at ${sector}`;break;}
 }
 const summary={epoch,profile,completed:s.sector===121&&!failed,sectorCompleted:s.sector-1,stopReason,
  ...s.stats,starsEarned:s.stars,capsules:s.capsules,relics:Object.keys(s.relics).length,epicsFused:Object.keys(s.fused).length,
  finalLevel:f17hPilotLevel(s.xp),endingDust:s.wallet.dust,endingDiamonds:s.wallet.diamonds,endingCrystals:s.wallet.voidCrystals,
  waitMinutes:s.stats.waitMinutes,totalMinutes:s.clock,uncompletedForgeJobs:s.forgeQueue.length,
  endingWeapons:s.armory.equipped};
 summaries.push(summary);
 console.log('17H',epoch,profile,'completed',summary.completed,'sector',summary.sectorCompleted,'attempts',summary.attempts,'stars',summary.starsEarned,'epics',summary.epicsFused,'boss flawless',summary.flawlessBosses);
 // checkpoint per interruzioni: report soltanto delle campagne terminate/fermate.
 const cols=['epoch','sector','profile','replica','result','exchanges','playerHP','playerHPmax','playerShots','winningResponses','multiSuitShots','boostActivations','swapPlayer','playerModuleActivations','usedRevive','playerDamage','enemyDamage','auditOK','errors','credits','pilotLevel','stars','fusions','forgePending','epicIds','totalMinutes'];
 writeFileSync(new URL(`../${prefix}_DUELLI.csv`,import.meta.url),cols.join(',')+'\n'+results.map(row=>cols.map(c=>JSON.stringify(row[c]??'')).join(',')).join('\n')+'\n');
 writeFileSync(new URL(`../${prefix}_RISULTATI.json`,import.meta.url),JSON.stringify({phase:'17H',scenario:'Independent epochs, 3 profiles, combat FSM F17G, forged upgrades with two slots, optional fused epics, actual challenge metrics; modeled minutes; no browser UI replay',budget,maxRetries,epochs,profiles,totalDuels:results.length,auditedDuels:results.filter(r=>r.auditOK).length,summaries},null,2)+'\n');
}
