/** Fase 17K — campagna economica sequenziale, controllo vs equipaggiamento adattivo.
 * L'IA non riceve armi nuove: il consigliatore puo' SOLO equipaggiare quelle pagate.
 * Le regole del negozio 17H, le stelle, i boss, Cantiere e le ricompense restano autentiche.
 * Offline: NON e un comando o una policy della UI.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {playF17GBattle} from './f17g_battle.mjs';
import {f17jRecommendOwned} from '../src/newCombat/tacticalAnalysis.js';
import {equipPhase7Weapon} from '../src/newCombat/phase7Armory.js';
import {createF17HProgression,f17hShopBeforeAttempt,f17hSettleBattle,f17hCurrentEquipment,f17hPilotLevel} from '../src/newCombat/phase17HProgression.js';
const root=new URL('../',import.meta.url);
const src=readFileSync(new URL('FASE_17G_48_ARMI_DISPONIBILITA_POKER.csv',root),'utf8').trim().split('\n');
const rates=Object.fromEntries(src.slice(1).map(line=>{const cols=line.split(',');return [JSON.parse(cols[0]),Number(cols[6])];}));
const epochs=(process.env.EPOCHS||'0,1').split(',').map(Number);
const budget=Number(process.env.BUDGET||12),maxRetries=Number(process.env.MAX_RETRIES||24);
const profile=process.env.PROFILE||'potenziato',prefix=process.env.OUTPUT||'FASE_17K_CAMPAGNA_ACQUISTI';
const rows=[],summaries=[];
function dump(){
 const keys=['epoch','variant','sector','retry','result','exchanges','playerHP','enemyHP','playerDamage','heavyId','mediumId','lightId','changeIds','pilotLevel','stars','fusions','forgePending','creditBalance','dustBalance','totalMinutes','auditOK'];
 writeFileSync(new URL(`${prefix}_DUELLI.csv`,root),[keys.join(','),...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n')+'\n');
 writeFileSync(new URL(`${prefix}_RISULTATI.json`,root),JSON.stringify({phase:'17K',profile,budget,maxRetries,epochs,records:rows.length,auditedDuels:rows.filter(r=>r.auditOK).length,summaries,notes:['Controllo e adattivo hanno gli stessi seed per settore e retry; le storie divergono dopo esiti diversi','Solo armi gia acquistate; costo equipaggiamento zero come nel codice del gioco','Il programma 17H di acquisti continua dopo ogni battaglia, incluso cantiere e fusione','Il consigliatore 17J usa stima per mani 7 carte, non conosce le carte future','I tempi di battaglia sono modellati, non osservati su smartphone']},null,2)+'\n');
}
for(const epoch of epochs)for(const variant of ['originale','adattivo']){
 const state=createF17HProgression({profile});let stopReason='',changeCount=0;
 sectorLoop:for(let sector=1;sector<=120;sector++){
  for(let retry=0;retry<maxRetries;retry++){
   f17hShopBeforeAttempt(state);
   let gear=f17hCurrentEquipment(state),changes=[];
   if(variant==='adattivo'){
    const suggested=f17jRecommendOwned(gear,rates);
    changes=suggested.changes;
    for(const change of changes){
     if(!state.armory.owned[change.to])throw Error('Arma NON posseduta, il trial non e valido');
     const result=equipPhase7Weapon(state.armory,change.to);
     if(!result.ok)throw Error(`Impossibile equipaggiare ${change.to}`);
     state.armory=result.state;
    }
    changeCount+=changes.length;
    gear=f17hCurrentEquipment(state);
   }
   const outcome=playF17GBattle(sector,profile,retry,budget,gear,epoch);
   if(!outcome.auditOK||!['player','enemy','draw'].includes(outcome.result)){
    stopReason=`Errore duel ${sector} retry ${retry}: ${outcome.errors||outcome.result}`;break sectorLoop;
   }
   f17hSettleBattle(state,outcome);
   const hist=state.history.at(-1);
   rows.push({epoch,variant,sector,retry,result:outcome.result,exchanges:outcome.exchanges,playerHP:outcome.playerHP,enemyHP:outcome.enemyHP,
    playerDamage:outcome.playerDamage,heavyId:gear.armory.equipped.heavy,mediumId:gear.armory.equipped.medium,lightId:gear.armory.equipped.light,
    changeIds:changes.map(x=>`${x.from}>${x.to}`).join('|'),pilotLevel:hist.pilotLevel,stars:hist.stars,fusions:hist.fusions,
    forgePending:hist.forgePending,creditBalance:hist.creditBalance,dustBalance:state.wallet.dust,totalMinutes:hist.overallMinutes,auditOK:outcome.auditOK});
   if(outcome.result==='player')continue sectorLoop;
  }
  stopReason=`Retry limit ${maxRetries} reached at sector ${sector}`;break;
 }
 const summary={epoch,variant,completed:state.sector===121,sectorCompleted:state.sector-1,stopReason,attempts:state.stats.attempts,losses:state.stats.losses,draws:state.stats.draws,
  changeCount,stars:state.stars,fusions:state.stats.fusions,capsules:state.capsules,finalPilotLevel:f17hPilotLevel(state.xp),
  waitMinutes:+state.stats.waitMinutes.toFixed(2),totalMinutes:+state.clock.toFixed(2),dustSpent:state.stats.dustSpent,dustOverflow:state.stats.dustOverflow,
  finalEquip:{...state.armory.equipped}};
 summaries.push(summary);dump();
 console.log('COMPLETED campaign',epoch,variant,'sector',summary.sectorCompleted,'attempts',summary.attempts,'changed',changeCount,'valid',rows.every(r=>r.auditOK));
}
console.log('FINISHED',rows.length,'duels, completed',summaries.filter(s=>s.completed).length,'/',summaries.length);
