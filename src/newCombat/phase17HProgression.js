/** Fase 17H - ledger sperimentale con stelle osservate, boss, forge, epici.
 * Motore di ANALISI, non cambia prezzi/oggetti/savegame di produzione.
 * Solo successi sbloccano il settore seguente. Le ricompense Dorate e le stelle derivano dal motore e dal catalogo sfide.
 */
import {ARSENAL_48} from './weaponCatalog.js';
import {buyPhase7Weapon,createPhase7Armory,upgradePhase7Weapon,equipPhase7Weapon} from './phase7Armory.js';
import {F17D_START_RESOURCES,F17D_UPGRADES,F17D_UPGRADE_LEVELS,F17D_PURCHASE_PLANS,f17dSelectWeapon,f17dSector,f17dSectorCost,f17dWalletCap,f17dCapsuleReward,f17dCampaignReward} from './phase17DEconomy.js';
import {phase17XpThreshold} from './phase17Balance.js';
import {calculateTelemetryOnDefeat,getForgeParams} from '../progressionEngine.js';
import {PHASE16A_RIFTS} from './phase16ACatalog.js';
import {getPhase16HSectorChallenge} from './phase16HProgression.js';
const CLASSES=['light','medium','heavy'];
const MIN_RARITY_SECTOR={common:1,rare:21,epic:51,legendary:91};
const MIN_RARITY_LEVEL={common:1,rare:18,epic:42,legendary:75};
const CREDIT_CAP=200;
const REGEN_STEP=3;
export function f17hPilotLevel(xp){let lv=1,total=Math.max(0,xp);while(lv<100&&total>=phase17XpThreshold(lv)){total-=phase17XpThreshold(lv);lv++;}return lv;}
export function createF17HProgression({profile='tattico',normalMinutes=4,bossMinutes=9,fuseEpics=true}={}){
 if(!F17D_PURCHASE_PLANS[profile])throw Error(`Profilo ignoto: ${profile}`);
 if(!Number.isFinite(normalMinutes)||normalMinutes<0||!Number.isFinite(bossMinutes)||bossMinutes<0)throw Error('Tempi non validi');
 return {profile,normalMinutes,bossMinutes,sector:1,fuseEpics,starsBySector:{},relics:{},fused:{},forgeQueue:[],overflowBuffer:0,wallet:{...F17D_START_RESOURCES},armory:createPhase7Armory(),xp:0,stars:0,capsules:0,
  moduleLevel:0,deckLevel:0,terrainLevel:0,hasGaia:false,transactions:[],history:[],stats:{attempts:0,wins:0,losses:0,spentCredits:0,waitMinutes:0,battleMinutes:0,recoveredCredits:0,earnedGoldenCredits:0,earnedGoldenDust:0,earnedGoldenDiamonds:0,earnedTelemetryXp:0,earnedTelemetryDust:0,dustSpent:0,dustOverflow:0,crystalsFromOverflow:0,flawlessBosses:0,earnedThirdStars:0,forgeStarted:0,forgeCompleted:0,draws:0,refundCredits:0,fusions:0},creditClock:0,clock:0};
}
export function f17hAdvanceCredits(state,minutes){
 let remain=Math.max(0,minutes);
 if(state.wallet.credits>=CREDIT_CAP){state.creditClock=0;state.clock+=remain;return;}
 while(remain>0){
  const part=Math.min(remain,REGEN_STEP-state.creditClock);
  remain-=part;state.clock+=part;state.creditClock+=part;
  if(state.creditClock>=REGEN_STEP-1e-8){state.creditClock=0;if(state.wallet.credits<CREDIT_CAP){state.wallet.credits++;state.stats.recoveredCredits++;}}
  if(state.wallet.credits>=CREDIT_CAP){state.clock+=remain;remain=0;state.creditClock=0;}
 }
}
function grant(state,reward){
 const wallet=state.wallet;
 const incoming=Math.max(0,reward.dust||0), cap=f17dWalletCap(f17hPilotLevel(state.xp));
 const sum=wallet.dust+incoming,overflow=Math.max(0,sum-cap);
 state.stats.dustOverflow+=overflow;
 wallet.dust=Math.min(cap,sum);
 wallet.diamonds+=reward.diamonds||0;
 // Buffer locale: 400 Polvere in eccesso/1 Cristallo (solo dopo varco).
 // Silo di livello 1: max quattro cristalli, materia non disponibile.
 if(overflow>0&&Object.keys(state.fused).length>0){
  state.overflowBuffer+=overflow;
  const n=Math.min(Math.floor(state.overflowBuffer/400),Math.max(0,4-wallet.voidCrystals));
  wallet.voidCrystals+=n;state.stats.crystalsFromOverflow+=n;state.overflowBuffer-=n*400;
 }
 if(Object.keys(state.fused).length)wallet.voidCrystals=Math.min(4,wallet.voidCrystals+(reward.voidCrystals||0));
 // Non attribuiamo Materia senza serbatoio adeguato, né usiamo Etere delle capsule.
}
function pay(state,item,cost){
 const price={dust:0,diamonds:0,voidCrystals:0,primordialMatter:0,...cost};
 if(Object.entries(price).some(([key,v])=>state.wallet[key]<v))return false;
 for(const [key,value] of Object.entries(price))state.wallet[key]-=value;
 state.stats.dustSpent+=price.dust;
 state.transactions.push({sector:state.sector,item,cost:price});return true;
}
/** Cantiere di due slot con durata UI; no accelerazione con Etere. */
export function f17hFinishForge(state){
 const completed=state.forgeQueue.filter(j=>j.finishAt<=state.clock+1e-8);
 for(const job of completed){
  if(job.type==='ability')state.moduleLevel=job.target;
  else if(job.type==='deck')state.deckLevel=job.target;
  else if(job.type==='terrain')state.terrainLevel=job.target;
  state.stats.forgeCompleted++;
 }
 state.forgeQueue=state.forgeQueue.filter(j=>j.finishAt>state.clock+1e-8);
 return completed;
}
function startForge(state,type,target,item,cost){
 if(state.forgeQueue.length>=2||state.forgeQueue.some(j=>j.type===type))return false;
 if(!pay(state,item,cost))return false;
 state.forgeQueue.push({type,target,item,startedAt:state.clock,finishAt:state.clock+getForgeParams(type,target).durationMs/60000});
 state.stats.forgeStarted++;return true;
}
export function f17hShopBeforeAttempt(state){
 f17hFinishForge(state);
 if(state.sector>120)throw Error('Campagna completa');
 const {profile,armory}=state,plan=F17D_PURCHASE_PLANS[profile],pilotLevel=f17hPilotLevel(state.xp),sector=state.sector;
 const buy=(id)=>{
  if(!id)return false;
  const tx=buyPhase7Weapon(state.armory,id,state.wallet.dust,pilotLevel);
  if(!tx.ok||!pay(state,`arma ${id}`,{dust:tx.cost}))return false;
  const equipped=equipPhase7Weapon(tx.state,id);
  if(!equipped.ok)throw Error('Equip non valido');
  state.armory=equipped.state;return true;
 };
 const upgrade=(id)=>{
  if(!id)return false;
  const tx=upgradePhase7Weapon(state.armory,id,pilotLevel,state.wallet.dust);
  if(!tx.ok||!pay(state,`upgrade ${id} lv${tx.state.levels[id]}`,{dust:tx.cost}))return false;
  state.armory=tx.state;return true;
 };
 if(sector>=21&&!state.armory.equipped.heavy)buy(f17dSelectWeapon('common','heavy',plan.suitPolicy));
 for(const cls of CLASSES){let id=state.armory.equipped[cls];if(id)for(let n=0;n<3;n++)if(!upgrade(id))break;}
 for(const rarity of plan.rarities.slice(1)){
  if(sector<MIN_RARITY_SECTOR[rarity]||pilotLevel<MIN_RARITY_LEVEL[rarity])continue;
  for(const cls of CLASSES){
   if(cls==='heavy'&&sector<21)continue;
   const target=f17dSelectWeapon(rarity,cls,plan.suitPolicy);
   if(!target||state.armory.owned[target])continue;
   const existing=ARSENAL_48.find(x=>x.id===state.armory.equipped[cls]);
   if(['common','rare','epic','legendary'].indexOf(existing?.rarityKey)>=['common','rare','epic','legendary'].indexOf(rarity))continue;
   buy(target);
  }
 }
 for(const cls of CLASSES){let id=state.armory.equipped[cls];if(id)for(let n=0;n<3;n++)if(!upgrade(id))break;}
 if(sector===9&&state.moduleLevel===0)state.moduleLevel=1;
 if(sector===10&&state.deckLevel===0)state.deckLevel=1;
 if(plan.deck&&sector>=11&&!state.hasGaia&&pay(state,'mazzo Gaia',{diamonds:10})){state.hasGaia=true;state.deckLevel=1;}
 if(plan.terrain&&sector>=8&&!state.terrainLevel&&pay(state,'Terreno Criostasi',{dust:200}))state.terrainLevel=1;
 if(state.moduleLevel>0&&state.moduleLevel<plan.moduleLevel){
  const next=state.moduleLevel+1;
  if(pilotLevel>=F17D_UPGRADE_LEVELS[next])startForge(state,'ability',next,`modulo Ariete lv${next}`,F17D_UPGRADES[next]);
 }
 if(plan.deck&&state.hasGaia&&state.deckLevel<Math.min(3,plan.moduleLevel)){
  const next=state.deckLevel+1;
  if(pilotLevel>=F17D_UPGRADE_LEVELS[next])startForge(state,'deck',next,`mazzo Gaia lv${next}`,F17D_UPGRADES[next]);
 }
}
export function f17hCurrentEquipment(state){return {armory:structuredClone(state.armory),deckId:state.hasGaia?'planet_char_1':state.deckLevel?'aries':'neutral_starter',deckLevel:state.deckLevel||1,moduleLevel:state.moduleLevel,terrainLevel:state.terrainLevel,epics:PHASE16A_RIFTS.filter(r=>state.fused[r.id]).slice(0,f17hPilotLevel(state.xp)>=60?2:f17hPilotLevel(state.xp)>=20?1:0).map(r=>({id:r.itemId,level:1})),pilotLevel:f17hPilotLevel(state.xp)};}
export function f17hSettleBattle(state,battle){
 if(state.sector>120)throw Error('Campagna gia completata');
 const {planet,sector}=f17dSector(state.sector);
 const cost=f17dSectorCost(sector);
 if(!['player','enemy','draw'].includes(battle.result)||!battle.auditOK)throw Error('Non contabilizzare duelli falliti o non auditati');
 if(battle.result==='player'&&(!['playerHP','playerHPmax','playerShots','swapPlayer','winningResponses','multiSuitShots','boostActivations','playerModuleActivations'].every(k=>Number.isFinite(battle[k]))||typeof battle.usedRevive!=='boolean'))throw Error('17H: risultato privo di metriche per stelle/boss');
 if(state.wallet.credits<cost){const wait=3*(cost-state.wallet.credits)-state.creditClock;f17hAdvanceCredits(state,wait);state.stats.waitMinutes+=wait;}
 if(state.wallet.credits<cost)throw Error('Credito insufficiente');
 state.wallet.credits-=cost;
 state.stats.spentCredits+=cost;
 state.stats.attempts++;
 const simulatedMinutes=Math.max(sector===10?state.bossMinutes:state.normalMinutes,Math.ceil(battle.exchanges)+(sector===10?1:0));
 f17hAdvanceCredits(state,simulatedMinutes);state.stats.battleMinutes+=simulatedMinutes;f17hFinishForge(state);
 // Premi del combattimento ricavati dalle carte REALI, anche dopo sconfitta.
 const extra={dust:battle.battleDustEarned||0,diamonds:battle.battleDiamondsEarned||0,credits:battle.battleCreditsEarned||0};
 grant(state,extra);state.wallet.credits+=extra.credits;
 state.stats.earnedGoldenCredits+=extra.credits;
 state.stats.earnedGoldenDust+=extra.dust;
 state.stats.earnedGoldenDiamonds+=extra.diamonds;
 if(battle.result==='player'){
  state.stats.wins++;
  const flawless=sector===10 && battle.usedRevive===false;
  if(flawless)state.stats.flawlessBosses++;
  const reward=f17dCampaignReward(planet,sector,{flawlessBoss:flawless});
  state.xp+=reward.xp;
  grant(state,reward);
  const hpRatio=battle.playerHPmax>0?Math.max(0,battle.playerHP/battle.playerHPmax):0;
  const challenge=getPhase16HSectorChallenge(planet,sector);
  const metrics={validPokerCombos:battle.playerShots,winningResponses:battle.winningResponses,
   exchangesUsed:battle.swapPlayer,multiSuitShots:battle.multiSuitShots,
   boostActivations:battle.boostActivations,moduleActivations:battle.playerModuleActivations};
  const starFlags=[true,hpRatio>=.5,Boolean(challenge.check(metrics))];
  state.starsBySector[`P${planet}_L${sector}`]=starFlags;
  state.stars+=starFlags.filter(Boolean).length;
  if(starFlags[2])state.stats.earnedThirdStars++;
  if(sector===10){
   state.relics[`relic_p${planet}`]=true;
   if(state.fuseEpics)for(const r of PHASE16A_RIFTS){
    if(!state.fused[r.id]&&r.relicsRequired.every(id=>state.relics[id])){
     state.fused[r.id]=true;state.stats.fusions++;
    }
   }
  }
  while((state.capsules+1)*15<=state.stars&&state.capsules<24){
   state.capsules++;
   grant(state,f17dCapsuleReward(state.capsules*15));
  }
  state.sector++;
 } else if(battle.result==='draw'){
  state.stats.draws++;state.wallet.credits+=cost;state.stats.refundCredits+=cost;
 } else {
  state.stats.losses++;
  const telemetry=calculateTelemetryOnDefeat(battle.exchanges,f17dWalletCap(f17hPilotLevel(state.xp)));
  state.xp+=telemetry.xpEarned;
  grant(state,telemetry);
  state.stats.earnedTelemetryXp+=telemetry.xpEarned;
  state.stats.earnedTelemetryDust+=telemetry.dustEarned;
 }
 state.history.push({sector:state.sector-(battle.result==='player'?1:0),attempt:state.stats.attempts,result:battle.result,exchanges:battle.exchanges,entryCost:cost,
  minutes:simulatedMinutes,creditBalance:state.wallet.credits, xp:state.xp,pilotLevel:f17hPilotLevel(state.xp),dust:state.wallet.dust,
  goldenCredits:extra.credits,dustOverflow:state.stats.dustOverflow,overallMinutes:+state.clock.toFixed(2),stars:state.stars,fusions:state.stats.fusions,forgePending:state.forgeQueue.length});
}
