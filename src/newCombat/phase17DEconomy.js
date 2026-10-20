/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { PHASE16A_CAMPAIGN_PLANETS } from './phase16ACatalog.js';
import { phase17CampaignDustAward, phase17CampaignXpAward, phase17ExpectedPilotLevel } from './phase17Balance.js';
import { ARSENAL_48 } from './weaponCatalog.js';
import { createPhase7Armory, buyPhase7Weapon, upgradePhase7Weapon, equipPhase7Weapon } from './phase7Armory.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/phase17DEconomy.js ──

export const F17D_SECTORS=120;
export const F17D_START_RESOURCES=Object.freeze({dust:100,diamonds:0,credits:200,voidCrystals:0,primordialMatter:0});
export const F17D_UPGRADES=Object.freeze({2:{dust:450,voidCrystals:0,primordialMatter:0},3:{dust:1100,voidCrystals:0,primordialMatter:0},4:{dust:2200,voidCrystals:2,primordialMatter:0},5:{dust:3500,voidCrystals:4,primordialMatter:0},6:{dust:5000,voidCrystals:6,primordialMatter:0},7:{dust:7500,voidCrystals:8,primordialMatter:2},8:{dust:10500,voidCrystals:10,primordialMatter:3},9:{dust:15000,voidCrystals:12,primordialMatter:5}});
export const F17D_UPGRADE_LEVELS=Object.freeze({2:12,3:25,4:35,5:48,6:60,7:70,8:82,9:95});
export function f17dSector(s){if(!Number.isInteger(s)||s<1||s>120)throw Error('Settore deve essere 1..120');const p=PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)];return {planet:p.id,planetName:p.name,sector:(s-1)%10+1,globalSector:s};}
export function f17dWalletCap(level){const lv=Number(level)||1;return lv>=85?20000:lv>=66?12500:lv>=50?7500:lv>=31?5000:lv>=15?2500:1500;}
export function f17dSectorCost(localSector){return localSector<=5?5:localSector<=9?10:15;}
export function f17dCampaignReward(planet,sector,{replay=false,flawlessBoss=false}={}){
 const mult=replay?.5:1;
 let diamonds=0,dust=phase17CampaignDustAward(planet,sector,false);
 if(!replay){if(sector===5)diamonds=3;if(sector===10){diamonds=Math.floor(6+planet*.5);dust+=150+planet*15;}}
 const reward={dust:Math.floor(dust*mult),diamonds,xp:phase17CampaignXpAward(planet,sector,replay)};
 if(sector===10&&flawlessBoss)return {dust:reward.dust*2,diamonds:reward.diamonds*2,xp:reward.xp*2};
 return reward;
}
export function f17dCapsuleReward(milestone){
 if(!Number.isInteger(milestone)||milestone<15||milestone>360||milestone%15)throw Error('Capsula sconosciuta');
 const idx=milestone/15;let dust=120+idx*40,diamonds=idx%2===0?Math.floor(idx/2):0,ether=Math.min(10,Math.floor(idx/4)+1),voidCrystals=idx>=15&&idx%5===0?1:0,primordialMatter=idx>=30&&idx%5===0?1:0;
 let unlockItem=null;
 if(milestone===90)unlockItem={type:'terrain',id:'entropic_refraction'};
 if(milestone===180)unlockItem={type:'ability',id:'singularity_core'};
 if(milestone===270)unlockItem={type:'deck',id:'ophiuchus'};
 if(milestone===360){dust=3000;diamonds=30;ether=15;voidCrystals=5;primordialMatter=3;unlockItem={type:'deck',id:'supreme_eclipse'};}
 return {milestone,dust,diamonds,ether,voidCrystals,primordialMatter,unlockItem};
}
const cls=['light','medium','heavy'];
export const F17D_PURCHASE_PLANS=Object.freeze({frugale:{rarities:['common'],deck:false,moduleLevel:1,terrain:false,suitPolicy:'distinct'},equilibrato:{rarities:['common','rare','epic'],deck:true,moduleLevel:3,terrain:true,suitPolicy:'distinct'},potenziato:{rarities:['common','rare','epic','legendary'],deck:true,moduleLevel:9,terrain:true,suitPolicy:'distinct'},tattico:{rarities:['common','rare','epic','legendary'],deck:true,moduleLevel:3,terrain:true,suitPolicy:'tactical'},stress_concentrato:{rarities:['common','rare','epic','legendary'],deck:true,moduleLevel:9,terrain:true,suitPolicy:'first'}});
const rarityStart=Object.freeze({common:1,rare:21,epic:51,legendary:91});
const rarityPilot=Object.freeze({common:1,rare:18,epic:42,legendary:75});
export const f17dSelectWeapon=(r,weaponClass,policy='distinct')=>{
 const wantedSuit={light:'spades',medium:r==='legendary'?'diamonds':'clubs',heavy:'hearts'}[weaponClass];
 // 17G: profilo di test che evita spese che peggiorano l'accessibilita' Poker.
 // Non modifica il catalogo, le transazioni, gli sblocchi o i prezzi di produzione.
 if(policy==='tactical'){
  const ids={common:{heavy:'es_common_heavy_01'},rare:{light:'es_rare_light_04',medium:'es_rare_medium_03'},epic:{light:'es_epic_light_04'},legendary:{light:'es_legendary_light_02'}};
  return ids[r]?.[weaponClass]||null;
 }
 const options=ARSENAL_48.filter(w=>w.weaponClass===weaponClass&&w.rarityKey===r);
 return (policy==='distinct'?options.find(w=>w.ammoSuit===wantedSuit):null)?.id||options[0]?.id;
};
/** Scenario SENZA farming, senza vittorie gratuite, con un solo primo completamento.
 * I livelli e le ricompense simulano una vittoria conseguita: NON implica
 * che un profilo sappia effettivamente vincere il duello del settore.
 * creditShortfall è una necessità di rigenerazione/bonus, non saldo negativo.
 */
export function simulateF17DEconomy({profile='equilibrato',starsPerSector=1,flawlessBoss=false,assumeFirstRift=false}={}){
 const plan=F17D_PURCHASE_PLANS[profile];if(!plan)throw Error('Profilo ignoto');
 if(!Number.isInteger(starsPerSector)||starsPerSector<1||starsPerSector>3)throw Error('Stelle 1..3');
 let armory=createPhase7Armory(),wallet={...F17D_START_RESOURCES},moduleLevel=0,deckLevel=0,terrainLevel=0,hasGaia=false;
 let totalStars=0,claimedCapsules=0,totalSpentDust=0,totalLostDust=0,spentDiamonds=0,creditNeeded=0,firstCreditShortage=null;
 const ledger=[],purchases=[];
 const pay=(name,cost,sector)=>{
   const price={dust:0,diamonds:0,voidCrystals:0,primordialMatter:0,...cost};
   if(Object.entries(price).some(([k,v])=>(wallet[k]||0)<v))return false;
   for(const [key,value]of Object.entries(price))wallet[key]-=value;
   totalSpentDust+=price.dust;spentDiamonds+=price.diamonds;
   purchases.push({sector,item:name,...price});return true;
 };
 const grant=(reward,level)=>{
   const incoming=Math.max(0,reward.dust||0),cap=f17dWalletCap(level),newDust=wallet.dust+incoming;
   totalLostDust+=Math.max(0,newDust-cap);
   wallet.dust=Math.min(cap,newDust);
   wallet.diamonds+=reward.diamonds||0;
   // Cristalli/Materia delle capsule solo se il varco è stabilizzato;
   // non attribuiamo nuovi cristalli tramite overflow perché dipendono da
   // un buffer locale e dal suo stato precedente.
   if(earnedRift) {
      wallet.voidCrystals+=reward.voidCrystals||0;
      wallet.primordialMatter+=reward.primordialMatter||0;
   }
 };
 let earnedRift=false;
 for(let globalSector=1;globalSector<=120;globalSector++){
   const {planet,sector}=f17dSector(globalSector);
   const pilotLevel=phase17ExpectedPilotLevel(globalSector-1);
   const actionsStart=purchases.length;
   // Crediti di ingresso NON garantiti dal premio standard. Si registrano
   // il consumo totale e la prima carenza SENZA inventare acquisti/refill.
   const costCredit=f17dSectorCost(sector);
   creditNeeded+=costCredit;
   wallet.credits=Math.max(0,F17D_START_RESOURCES.credits-creditNeeded);
   if(creditNeeded>F17D_START_RESOURCES.credits && firstCreditShortage===null)firstCreditShortage=globalSector;
   const buy=(id)=>{
     const tx=buyPhase7Weapon(armory,id,wallet.dust,pilotLevel);
     if(!tx.ok || !pay(`arma ${id}`,{dust:tx.cost},globalSector))return false;
     const equipped=equipPhase7Weapon(tx.state,id);
     if(!equipped.ok)throw Error('Acquisto valido ma equip fallito');
     armory=equipped.state;return true;
   };
   const upgrade=(id)=>{
     const tx=upgradePhase7Weapon(armory,id,pilotLevel,wallet.dust);
     if(!tx.ok || !pay(`upgrade ${id} lv${tx.state.levels[id]}`,{dust:tx.cost},globalSector))return false;
     armory=tx.state;return true;
   };
   if(globalSector>=21 && !armory.equipped.heavy)buy(f17dSelectWeapon('common','heavy',plan.suitPolicy));
   // Priorità trasparente: aggiornare prima il livello delle armi esistenti.
   for(const c of cls){
     const id=armory.equipped[c];if(!id)continue;
     for(let next=(armory.levels[id]||1)+1;next<=4;next++){
       const ok=upgrade(id);if(!ok)break;
     }
   }
   // Nuove rarità solo dopo il settore di ingresso e il livello pilota.
   for(const rar of plan.rarities.slice(1)){
     if(globalSector<rarityStart[rar]||pilotLevel<rarityPilot[rar])continue;
     for(const c of cls){
       if(c==='heavy'&&globalSector<21)continue;
       const target=f17dSelectWeapon(rar,c,plan.suitPolicy);if(!target)continue;
       const currently=armory.equipped[c];
       if(armory.owned[target])continue;
       const currentlyRank=ARSENAL_48.find(w=>w.id===currently)?.rarityKey;
       const rank=['common','rare','epic','legendary'];
       if(rank.indexOf(currentlyRank)>=rank.indexOf(rar))continue;
       buy(target);
     }
   }
   // Immediatamente dopo l'acquisto il nuovo equipaggiamento è LV1: non
   // saltiamo livelli gratuiti. Si torna a salire solo con nuove transazioni.
   for(const c of cls){
     const id=armory.equipped[c];if(!id)continue;
     for(let tries=0;tries<3;tries++)if(!upgrade(id))break;
   }
   // Sblocco GRATIS previsto dalla UI all'ingresso Terra S9 (modulo Ariete)
   // e Terra S10 (mazzo Ariete, NON una passiva planetaria 16E).
   if(globalSector===9)moduleLevel=1;
   if(globalSector===10 && !hasGaia)deckLevel=1;
   // Il primo mazzo Gaia richiede davvero 10 Diamanti e boss P1 sconfitto;
   // i 10 Diamanti non sono regalati dal solo arrivo a S11.
   if(plan.deck&&globalSector>=11&&!hasGaia&&wallet.diamonds>=10){
     if(pay('mazzo Gaia', {diamonds:10},globalSector)){hasGaia=true;deckLevel=1;}
   }
   if(plan.terrain&&globalSector>=8&&!terrainLevel&&pay('Terreno Criostasi',{dust:200},globalSector))terrainLevel=1;
   // Costi 1..9 effettivi UI: polvere + cristalli + materia e soglia pilota.
   // Non eseguiamo upgrade in cantiere istantanei: inventario operativo viene
   // accreditato al settore successivo (modello favorevole con tempo trascorso).
   if(moduleLevel && moduleLevel<plan.moduleLevel){
     const next=moduleLevel+1,cost=F17D_UPGRADES[next];
     if(pilotLevel>=F17D_UPGRADE_LEVELS[next] && pay(`modulo Ariete lv${next}`,cost,globalSector))moduleLevel=next;
   }
   if(plan.deck&&hasGaia&&deckLevel<Math.min(3,plan.moduleLevel)){
     const next=deckLevel+1,cost=F17D_UPGRADES[next];
     if(pilotLevel>=F17D_UPGRADE_LEVELS[next] && pay(`mazzo Gaia lv${next}`,cost,globalSector))deckLevel=next;
   }
   const entry={globalSector,planet,sector,pilotLevel,hpLoadout:pilotLevel,creditsEntry:costCredit,
     creditShortfallCumulative:Math.max(0,creditNeeded-F17D_START_RESOURCES.credits),
     beforeBattleDust:wallet.dust,beforeBattleDiamonds:wallet.diamonds,
     armory:structuredClone(armory),moduleLevel,deckId:hasGaia?'planet_char_1':deckLevel?'aries':'neutral_starter',deckLevel:deckLevel||1,
     terrainLevel,epics:earnedRift?[{id:'epic_item_8',level:1}]:[],
     purchasesBefore:purchases.slice(actionsStart).map(p=>p.item)};
   // Ipotesi: ciascun duello è stato VINTO una volta, senza premio sconfitte.
   const reward=f17dCampaignReward(planet,sector,{flawlessBoss});
   const levelAfter=phase17ExpectedPilotLevel(globalSector);
   grant(reward,levelAfter);
   if(globalSector>=20 && assumeFirstRift)earnedRift=true; // Fusione NON automatica: scenario opt-in
   totalStars+=starsPerSector;
   while((claimedCapsules+1)*15<=totalStars && claimedCapsules<24){
     claimedCapsules++;
     const capsule=f17dCapsuleReward(claimedCapsules*15);
     grant(capsule,levelAfter);
   }
   ledger.push({...entry,pilotLevelAfter:levelAfter,awardedDust:reward.dust,awardedDiamonds:reward.diamonds,
     afterRewardDust:wallet.dust,afterRewardDiamonds:wallet.diamonds,capsulesClaimed:claimedCapsules,
     dustLostCumulative:totalLostDust,totalSpentDust,armoryLevels:Object.fromEntries(cls.map(c=>[c,entry.armory.levels[entry.armory.equipped[c]]||0])),
     equipped:entry.armory.equipped});
 }
 return {profile,starsPerSector,flawlessBoss,assumeFirstRift,ledger,purchases,summary:{
   purchaseSuitPolicy:plan.suitPolicy,assumedRiftFused:assumeFirstRift,sectorCount:ledger.length,earnedXp:ledger.reduce((a,r)=>a+f17dCampaignReward(r.planet,r.sector,{flawlessBoss}).xp,0),
   finalLevel:phase17ExpectedPilotLevel(120),creditsRequired:creditNeeded,initialCredits:F17D_START_RESOURCES.credits,
   creditsToRecoverWithoutBattleBonuses:Math.max(0,creditNeeded-F17D_START_RESOURCES.credits),firstCreditShortage,
   dustSpent:totalSpentDust,dustLostToWalletCap:totalLostDust,diamondsSpent:spentDiamonds,
   finalResources:wallet,stars:totalStars,capsulesClaimed:claimedCapsules,
   finalArsenal:ledger.at(-1).equipped,finalWeaponLevels:ledger.at(-1).armoryLevels,
   purchasedCount:purchases.length,hasGaia,moduleLevel,terrainLevel,deckLevel,
   battleWinRateMeasured:false
 }};
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase17ECreditFlow.js ──

const CAP=200,REGEN_MINUTES=3;
const nonnegative=(v,name)=>{if(!Number.isFinite(v)||v<0)throw Error(`${name} non valido`);return v;};
const integer=(v,name)=>{if(!Number.isInteger(v)||v<0)throw Error(`${name} non intero`);return v;};
export function simulateF17ECredits({normalMinutes=4,bossMinutes=9,normalRetries=0,bossRetries=0,
  bonusCreditsOnWin=0}={}){
 nonnegative(normalMinutes,'durata normale');nonnegative(bossMinutes,'durata boss');
 integer(normalRetries,'sconfitte normali');integer(bossRetries,'sconfitte boss');integer(bonusCreditsOnWin,'premio crediti');
 let credits=F17D_START_RESOURCES.credits,clock=0,regenClock=0,waitMinutes=0,
   regeneration=0,lostRegenCap=0,spent=0,bonusGranted=0,attempts=0;
 const ledger=[];
 // Timer di rigenerazione: una frazione di 3 minuti viene conservata;
 // mentre il portafoglio è al cap, i tick si perdono e il timer riparte.
 const advance=(minutes)=>{
  if(credits>=CAP){regenClock=0;clock+=minutes;return;}
  let remaining=minutes;
  while(remaining>0){
   const toTick=REGEN_MINUTES-regenClock;
   const step=Math.min(remaining,toTick);remaining-=step;clock+=step;regenClock+=step;
   if(regenClock>=REGEN_MINUTES-1e-8){regenClock=0;if(credits<CAP){credits++;regeneration++;}else lostRegenCap++;}
   if(credits>=CAP){clock+=remaining;remaining=0;regenClock=0;}
  }
 };
 for(let globalSector=1;globalSector<=F17D_SECTORS;globalSector++){
  const sector=(globalSector-1)%10+1,boss=sector===10,cost=f17dSectorCost(sector),
    duration=boss?bossMinutes:normalMinutes,retries=boss?bossRetries:normalRetries;
  const start=clock,waitBefore=waitMinutes;
  for(let tryIndex=0;tryIndex<=retries;tryIndex++){
   if(credits<cost){
    const need=cost-credits;
    const wait=Math.max(0,need*REGEN_MINUTES-regenClock);
    advance(wait);waitMinutes+=wait;
   }
   if(credits<cost)throw Error('Ricarica simulata insufficiente');
   credits-=cost;spent+=cost;attempts++;
   advance(duration);
   if(tryIndex===retries&&bonusCreditsOnWin){
    credits+=bonusCreditsOnWin;bonusGranted+=bonusCreditsOnWin;
    // Il gioco può superare cap 200 con un premio, non inventare un hard-cap:
    // la UI interrompe soltanto la ricarica passiva sopra al massimo.
   }
  }
  ledger.push({globalSector,sector,boss,attempts:retries+1,costPerEntry:cost,
    elapsedMinutes:+(clock-start).toFixed(4),waitingMinutes:+(waitMinutes-waitBefore).toFixed(4),creditsRemaining:credits,
    creditsSpentCumulative:spent});
 }
 return {ledger,summary:{totalSectors:F17D_SECTORS,totalAttempts:attempts,totalSpentCredits:spent,
   totalBattleMinutes:+(attempts*0+ledger.reduce((s,r)=>s+r.attempts*(r.boss?bossMinutes:normalMinutes),0)).toFixed(2),
   totalWaitingMinutes:+waitMinutes.toFixed(2),totalElapsedMinutes:+clock.toFixed(2),
   passiveCreditsRegenerated:regeneration,bonusCreditsGranted:bonusGranted,finalCredits:credits,
   initialCredits:F17D_START_RESOURCES.credits,firstWaitSector:ledger.find(r=>r.waitingMinutes>0)?.globalSector||null,
   noLootAssumption:bonusCreditsOnWin===0,normalRetries,bossRetries}}
}
