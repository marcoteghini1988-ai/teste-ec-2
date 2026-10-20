/** F17I: capture REAL economical state before target bosses, from duel-driven sequential campaign.
 * Experimental tool, gameplay unchanged. Save first-attempt snapshots only after all preceding victories.
 */
import {writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {createF17HProgression,f17hShopBeforeAttempt,f17hSettleBattle,f17hCurrentEquipment} from '../src/newCombat/phase17HProgression.js';
const profiles=(process.env.PROFILES||'frugale,potenziato,tattico').split(',');
const epoch=Number(process.env.EPOCH||0), budget=Number(process.env.BUDGET||16),maxRetries=Number(process.env.MAX_RETRIES||24);
const targets=new Set((process.env.TARGETS||'50,80,110').split(',').map(Number));
const snapshots=[], summaries=[];
for(const profile of profiles){
 const state=createF17HProgression({profile,fuseEpics:true});
 for(let sector=1;sector<=Math.max(...targets);sector++){
  let won=false;
  for(let attempt=0;attempt<maxRetries;attempt++){
   f17hShopBeforeAttempt(state);
   const gear=f17hCurrentEquipment(state);
   if(targets.has(sector)&&attempt===0){
    snapshots.push({profile,epoch,sector,pilotLevel:gear.pilotLevel,earnedXP:state.xp,spentDust:state.stats.dustSpent,
     wallet:structuredClone(state.wallet),epicsAvailable:gear.epics.map(x=>x.id),ownedWeapons:Object.keys(gear.armory.owned).filter(k=>gear.armory.owned[k]),
     armoryLevels:structuredClone(gear.armory.levels),gear,forgePending:state.forgeQueue.length});
    writeFileSync(new URL('../FASE_17I_EQUIPAGGIAMENTI_REALI.json',import.meta.url),JSON.stringify({epoch,budget,targets:[...targets],snapshots,summaries},null,2));
   }
   const duel=playF17GBattle(sector,profile,attempt,budget,gear,epoch);
   if(!duel.auditOK||!['player','enemy','draw'].includes(duel.result))throw Error(`${sector} ${profile} ${duel.errors}`);
   f17hSettleBattle(state,duel);
   if(duel.result==='player'){won=true;break;}
  }
  if(!won)throw Error(`Retry limit sector=${sector} profile=${profile}`);
 }
 summaries.push({profile,sectorsCompleted:state.sector-1,attempts:state.stats.attempts,losses:state.stats.losses,draws:state.stats.draws,epicsFused:Object.keys(state.fused).length});
 console.log('captured',profile,JSON.stringify(summaries.at(-1)));
 writeFileSync(new URL('../FASE_17I_EQUIPAGGIAMENTI_REALI.json',import.meta.url),JSON.stringify({epoch,budget,targets:[...targets],snapshots,summaries},null,2));
}
