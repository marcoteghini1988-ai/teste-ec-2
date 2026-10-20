/** F17G: sequential original 120-sector combat, all attempts cost Credits, each loss gets
 * telemetry and any actually earned Golden rewards. Progress gated by real wins.
 * Star grants=2/sector scenario; fight times=simulation assumptions; NO forced wins.
 */
import {writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {createF17GProgression,f17gShopBeforeAttempt,f17gSettleBattle,f17gCurrentEquipment,f17gPilotLevel} from '../src/newCombat/phase17GProgression.js';
const profiles=(process.env.PROFILES||'frugale,potenziato,tattico').split(',');
const MAX=Number(process.env.MAX_RETRIES||18),BUDGET=Number(process.env.BUDGET||30);
const results=[],summaries=[];
for(const profile of profiles){
 const s=createF17GProgression({profile,starsPerSector:Number(process.env.STARS||2)});
 let failed=false;
 for(let sector=1;sector<=120;sector++){
  let won=false;
  for(let retry=0;retry<MAX;retry++){
   f17gShopBeforeAttempt(s);
   const gear=f17gCurrentEquipment(s);
   const r=playF17GBattle(sector,profile,retry,BUDGET,gear);
   if(!r.auditOK||!['player','enemy','draw'].includes(r.result)){
    results.push({...r,overallAttempt:s.stats.attempts+1,stalled:true});failed=true;break;
   }
   f17gSettleBattle(s,r);
   const record=s.history.at(-1);
   results.push({...r,overallAttempt:s.stats.attempts,creditBalance:record.creditBalance,actualPilotLevel:record.pilotLevel,totalXp:record.xp,dustBalance:record.dust,elapsedMinutes:record.overallMinutes,
     weaponLight:gear.armory.equipped.light,weaponMedium:gear.armory.equipped.medium,weaponHeavy:gear.armory.equipped.heavy});
   if(r.result==='player'){won=true;break;}
  }
  if(!won){failed=true;console.log(profile,'fermo nel settore',sector,'tentativi totali',s.stats.attempts);break;}
  if(sector%10===0)console.log(profile,'settore',sector,'tentativi',s.stats.attempts,'sconfitte',s.stats.losses,'crediti',s.wallet.credits,'attesa',Math.round(s.stats.waitMinutes));
 }
 summaries.push({profile,completed:s.sector===121&&!failed,sectorReached:Math.min(120,s.sector),sectorCompleted:s.sector-1,...s.stats,finalLevel:f17gPilotLevel(s.xp),starsAssumed:s.stars,capsulesClaimed:s.capsules,creditsRemaining:s.wallet.credits,diamonds:s.wallet.diamonds,dust:s.wallet.dust,
   finalGear:s.armory.equipped,finalWeaponLevels:Object.fromEntries(Object.values(s.armory.equipped).filter(Boolean).map(id=>[id,s.armory.levels[id]])),moduleLevel:s.moduleLevel,
   transactions:s.transactions.length,finalXp:s.xp,totalElapsedMinutes:+s.clock.toFixed(1),
   maxAttemptsPerSector:Math.max(0,...Array.from({length:120},(_,i)=>results.filter(r=>r.profile===profile&&r.sector===i+1).length))});
}
const columns=Object.keys(results.reduce((a,r)=>({...a,...r}),{}));
writeFileSync(new URL('../FASE_17G_CAMPAGNA_SEQUENZIALE_DUELLI.csv',import.meta.url),columns.join(',')+'\n'+results.map(r=>columns.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n')+'\n');
writeFileSync(new URL('../FASE_17G_CAMPAGNA_SEQUENZIALE_RISULTATI.json',import.meta.url),JSON.stringify({phase:'17G',method:'Full original combat FSM F17F; actual victories, losses, golden rewards and telemetry; each attempt pays entry credits; minute duration modeled; 2 stars/sector assumed, not measured; boss flawless doubling and dust overflow crystals NOT granted; no real time forge waits',maxTriesPerSector:MAX,aiBudget:BUDGET,battles:results.length,validAudits:results.filter(x=>x.auditOK).length,summaries},null,2)+'\n');
console.table(summaries.map(x=>({profile:x.profile,completed:x.completed,sector:x.sectorCompleted,attempts:x.attempts,losses:x.losses,creditSpend:x.spentCredits,waitingMinutes:Math.round(x.waitMinutes),level:x.finalLevel,earnedGoldenCredits:x.earnedGoldenCredits,dustOverflow:x.dustOverflow})));
