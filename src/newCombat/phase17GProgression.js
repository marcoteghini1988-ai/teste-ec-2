/** Fase 17G - ledger deterministico per campagna sequenziale con sconfitte.
 * Motore di ANALISI, non cambia prezzi/oggetti/savegame di produzione.
 * Solo successi sbloccano il settore seguente. Le ricompense Dorate provengono
 * dal motore vero, quelle della Rotta Stellare dipendono da stelle IPOTIZZATE.
 */
import {ARSENAL_48} from './weaponCatalog.js';
import {buyPhase7Weapon,createPhase7Armory,upgradePhase7Weapon,equipPhase7Weapon} from './phase7Armory.js';
import {F17D_START_RESOURCES,F17D_UPGRADES,F17D_UPGRADE_LEVELS,F17D_PURCHASE_PLANS,f17dSelectWeapon,f17dSector,f17dSectorCost,f17dWalletCap,f17dCapsuleReward,f17dCampaignReward} from './phase17DEconomy.js';
import {phase17XpThreshold} from './phase17Balance.js';
import {calculateTelemetryOnDefeat} from '../progressionEngine.js';
const CLASSES=['light','medium','heavy'];
const MIN_RARITY_SECTOR={common:1,rare:21,epic:51,legendary:91};
const MIN_RARITY_LEVEL={common:1,rare:18,epic:42,legendary:75};
const CREDIT_CAP=200;
const REGEN_STEP=3;
export function f17gPilotLevel(xp){let lv=1,total=Math.max(0,xp);while(lv<100&&total>=phase17XpThreshold(lv)){total-=phase17XpThreshold(lv);lv++;}return lv;}
export function createF17GProgression({profile='tattico',starsPerSector=2,normalMinutes=4,bossMinutes=9}={}){
 if(!F17D_PURCHASE_PLANS[profile])throw Error(`Profilo ignoto: ${profile}`);
 if(![1,2,3].includes(starsPerSector))throw Error('Stelle ipotetiche 1..3');
 if(!Number.isFinite(normalMinutes)||normalMinutes<0||!Number.isFinite(bossMinutes)||bossMinutes<0)throw Error('Tempi non validi');
 return {profile,starsPerSector,normalMinutes,bossMinutes,sector:1,wallet:{...F17D_START_RESOURCES},armory:createPhase7Armory(),xp:0,stars:0,capsules:0,
  moduleLevel:0,deckLevel:0,terrainLevel:0,hasGaia:false,transactions:[],history:[],stats:{attempts:0,wins:0,losses:0,spentCredits:0,waitMinutes:0,battleMinutes:0,recoveredCredits:0,earnedGoldenCredits:0,earnedGoldenDust:0,earnedGoldenDiamonds:0,earnedTelemetryXp:0,earnedTelemetryDust:0,dustSpent:0,dustOverflow:0},creditClock:0,clock:0};
}
export function f17gAdvanceCredits(state,minutes){
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
 const incoming=Math.max(0,reward.dust||0), cap=f17dWalletCap(f17gPilotLevel(state.xp));
 const sum=wallet.dust+incoming;
 state.stats.dustOverflow+=Math.max(0,sum-cap);
 wallet.dust=Math.min(cap,sum);
 wallet.diamonds+=reward.diamonds||0;
 // Solo materiali effettivamente posseduti. Nessuna fusione/reliquia gratuita.
 // Non attribuire i cristalli delle capsule senza verifica del varco.
}
function pay(state,item,cost){
 const price={dust:0,diamonds:0,voidCrystals:0,primordialMatter:0,...cost};
 if(Object.entries(price).some(([key,v])=>state.wallet[key]<v))return false;
 for(const [key,value] of Object.entries(price))state.wallet[key]-=value;
 state.stats.dustSpent+=price.dust;
 state.transactions.push({sector:state.sector,item,cost:price});return true;
}
export function f17gShopBeforeAttempt(state){
 if(state.sector>120)throw Error('Campagna completa');
 const {profile,armory}=state,plan=F17D_PURCHASE_PLANS[profile],pilotLevel=f17gPilotLevel(state.xp),sector=state.sector;
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
  if(pilotLevel>=F17D_UPGRADE_LEVELS[next]&&pay(state,`modulo Ariete lv${next}`,F17D_UPGRADES[next]))state.moduleLevel=next;
 }
 if(plan.deck&&state.hasGaia&&state.deckLevel<Math.min(3,plan.moduleLevel)){
  const next=state.deckLevel+1;
  if(pilotLevel>=F17D_UPGRADE_LEVELS[next]&&pay(state,`mazzo Gaia lv${next}`,F17D_UPGRADES[next]))state.deckLevel=next;
 }
}
export function f17gCurrentEquipment(state){return {armory:structuredClone(state.armory),deckId:state.hasGaia?'planet_char_1':state.deckLevel?'aries':'neutral_starter',deckLevel:state.deckLevel||1,moduleLevel:state.moduleLevel,terrainLevel:state.terrainLevel,epics:[],pilotLevel:f17gPilotLevel(state.xp)};}
export function f17gSettleBattle(state,battle){
 if(state.sector>120)throw Error('Campagna gia completata');
 const {planet,sector}=f17dSector(state.sector);
 const cost=f17dSectorCost(sector);
 if(!['player','enemy','draw'].includes(battle.result)||!battle.auditOK)throw Error('Non contabilizzare duelli falliti o non auditati');
 if(state.wallet.credits<cost){const wait=3*(cost-state.wallet.credits)-state.creditClock;f17gAdvanceCredits(state,wait);state.stats.waitMinutes+=wait;}
 if(state.wallet.credits<cost)throw Error('Credito insufficiente');
 state.wallet.credits-=cost;
 state.stats.spentCredits+=cost;
 state.stats.attempts++;
 const simulatedMinutes=Math.max(sector===10?state.bossMinutes:state.normalMinutes,Math.ceil(battle.exchanges)+(sector===10?1:0));
 f17gAdvanceCredits(state,simulatedMinutes);state.stats.battleMinutes+=simulatedMinutes;
 // Premi del combattimento ricavati dalle carte REALI, anche dopo sconfitta.
 const extra={dust:battle.battleDustEarned||0,diamonds:battle.battleDiamondsEarned||0,credits:battle.battleCreditsEarned||0};
 grant(state,extra);state.wallet.credits+=extra.credits;
 state.stats.earnedGoldenCredits+=extra.credits;
 state.stats.earnedGoldenDust+=extra.dust;
 state.stats.earnedGoldenDiamonds+=extra.diamonds;
 if(battle.result==='player'){
  state.stats.wins++;
  const reward=f17dCampaignReward(planet,sector); // NO raddoppio flawless non verificato nella sonda.
  state.xp+=reward.xp;
  grant(state,reward);
  state.stars+=state.starsPerSector; // Scenario: due stelle, NON misura della battle.
  while((state.capsules+1)*15<=state.stars&&state.capsules<24){
   state.capsules++;
   grant(state,f17dCapsuleReward(state.capsules*15));
  }
  state.sector++;
 } else {
  state.stats.losses++;
  const telemetry=calculateTelemetryOnDefeat(battle.exchanges,f17dWalletCap(f17gPilotLevel(state.xp)));
  state.xp+=telemetry.xpEarned;
  grant(state,telemetry);
  state.stats.earnedTelemetryXp+=telemetry.xpEarned;
  state.stats.earnedTelemetryDust+=telemetry.dustEarned;
 }
 state.history.push({sector:state.sector-(battle.result==='player'?1:0),attempt:state.stats.attempts,result:battle.result,exchanges:battle.exchanges,entryCost:cost,
  minutes:simulatedMinutes,creditBalance:state.wallet.credits, xp:state.xp,pilotLevel:f17gPilotLevel(state.xp),dust:state.wallet.dust,
  goldenCredits:extra.credits,dustOverflow:state.stats.dustOverflow,overallMinutes:+state.clock.toFixed(2)});
}
