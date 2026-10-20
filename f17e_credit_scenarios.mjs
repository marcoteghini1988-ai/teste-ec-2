import {writeFileSync} from 'node:fs';
import {simulateF17ECredits} from '../src/newCombat/phase17DEconomy.js';
const cases=[
 ['rapido_4_9', {normalMinutes:4,bossMinutes:9}],
 ['lento_8_15',{normalMinutes:8,bossMinutes:15}],
 ['rapido_boss_ritentato',{normalMinutes:4,bossMinutes:9,bossRetries:1}],
 ['rapido_1_retry_normale',{normalMinutes:4,bossMinutes:9,normalRetries:1}],
 ['rapido_bonus_5_garantiti_IPOTESI',{normalMinutes:4,bossMinutes:9,bonusCreditsOnWin:5}],
 ];
const data=cases.map(([name,settings])=>({scenario:name,settings,...simulateF17ECredits(settings)}));
const csvFields=['scenario','totalSectors','totalAttempts','totalSpentCredits','totalBattleMinutes','totalWaitingMinutes','totalElapsedMinutes','passiveCreditsRegenerated','bonusCreditsGranted','finalCredits','firstWaitSector'];
writeFileSync(new URL('../FASE_17E_CREDITI_SCENARI.csv',import.meta.url),csvFields.join(',')+'\n'+data.map(d=>csvFields.map(k=>JSON.stringify(k==='scenario'?d.scenario:d.summary[k])).join(',')).join('\n')+'\n');
writeFileSync(new URL('../FASE_17E_CREDITI_SCENARI.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.table(data.map(d=>({scenario:d.scenario,...d.summary})));
