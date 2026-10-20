/** Fase 17B: prima curva INTEGRATA: XP, HP, armi, nemici, ricompense e sblocchi.
 * ID planetari sempre storici; i calcoli usano esclusivamente l'ordine della campagna.
 * Numeri sperimentali in attesa di playtest e simulazioni Poker complete.
 */
import {getCampaignPlanetIndex} from './phase16ACatalog.js';
import {ARSENAL_48,getWeaponDefinition} from './weaponCatalog.js';
/** Fase 17F: tuning sperimentale PvE integrato, confrontato A/B con F17E.
 * Nessuna modifica alle formule nominali delle 48 armi e a PvP.
 * Non sono durate imposte; cambiano soltanto HP nemici e mitigazione salve IA.
 */
export const F17F_CAMPAIGN_TUNING=Object.freeze({
 normalHpFactor:0.90,
 earlyNormalHpFactor:0.72,
 earlyBossHpFactor:1.38,
 bossHpFactor:1.50,
 bossHpFlat:10,
 earlyEnemyDamageFactor:0.62,
 openingEnemyDamageFactor:0.50,
 earlyBossEnemyDamageFactor:0.52,
 normalEnemyDamageFactor:0.72,
 bossEnemyDamageFactor:0.64,
});
export const F17_MAX_PILOT_LEVEL=100;
export const F17_MAX_WEAPON_LEVEL=4;
export const F17_UNLOCKS=Object.freeze({planetaryDeck:11,ether:15,joker:15,heavy:21,rare:21,epic:51,legendary:91});
export const F17_WEAPON_UPGRADE_PILOT_LEVELS=Object.freeze({2:12,3:35,4:70});
export const F17_WEAPON_UPGRADE_DUST=Object.freeze({2:250,3:950,4:2700});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Math.floor(Number(x)||0)));
export function phase17GlobalSector(planet,sector){
 return clamp((getCampaignPlanetIndex(planet)-1)*10+clamp(sector,1,10),1,120);
}
export function phase17XpThreshold(level){const l=clamp(level,1,99);return 120+l*45+Math.floor(Math.pow(l,1.3)*15);}
export const F17_TOTAL_XP_TO_100=Array.from({length:99},(_,i)=>phase17XpThreshold(i+1)).reduce((a,b)=>a+b,0);
function totalXpThroughSector(globalSector){
 const s=clamp(globalSector,0,120);
 return Math.round(s*180+(F17_TOTAL_XP_TO_100-120*180)*Math.pow(s/120,2.2));
}
export function phase17CampaignXpAward(planet,sector,replay=false){
 const s=phase17GlobalSector(planet,sector);
 const first=totalXpThroughSector(s)-totalXpThroughSector(s-1);
 return replay?Math.max(20,Math.round(first*.18)):first;
}
export function phase17ExpectedPilotLevel(globalSector){
 let budget=totalXpThroughSector(clamp(globalSector,0,120)),level=1;
 while(level<100&&budget>=phase17XpThreshold(level)){budget-=phase17XpThreshold(level);level++;}
 return level;
}
export function phase17PilotHp(level){
 const t=(clamp(level,1,100)-1)/99;
 return Math.min(400,50+Math.round(350*Math.pow(t,.98)));
}
export function phase17EnemyHp(planet,sector){
 const s=phase17GlobalSector(planet,sector);
 const expected=phase17PilotHp(phase17ExpectedPilotLevel(s));
 const boss=sector===10;
 const early=s<=20;
 const coefficient=boss
   ? (early?F17F_CAMPAIGN_TUNING.earlyBossHpFactor:F17F_CAMPAIGN_TUNING.bossHpFactor)
   : (early?F17F_CAMPAIGN_TUNING.earlyNormalHpFactor:F17F_CAMPAIGN_TUNING.normalHpFactor);
 return Math.max(54,Math.round(expected*coefficient+(boss?F17F_CAMPAIGN_TUNING.bossHpFlat:0)));
}
export function phase17CampaignDustAward(planet,sector,replay=false){
 const s=phase17GlobalSector(planet,sector);
 const amount=Math.round(55+9*s+(sector===10?120+2*s:0));
 return replay?Math.floor(amount*.35):amount;
}
/** Difficoltà PvE: la potenza nominale dell'arma resta identica in negozio/PvP.
 * Riduce la pressione delle salve dell'IA nel solo combattimento di campagna,
 * lasciando intatti Poker, munizioni, rarità, livelli e bonus del boss. */
export function phase17EnemyDamageScale(planet,sector){
 const s=phase17GlobalSector(planet,sector);
 if(sector===10)return s<=20?F17F_CAMPAIGN_TUNING.earlyBossEnemyDamageFactor:F17F_CAMPAIGN_TUNING.bossEnemyDamageFactor;
 if(s<=5)return F17F_CAMPAIGN_TUNING.openingEnemyDamageFactor;
 if(s<=20)return F17F_CAMPAIGN_TUNING.earlyEnemyDamageFactor;
 return F17F_CAMPAIGN_TUNING.normalEnemyDamageFactor;
}
export function phase17EnemyWeaponRarity(globalSector){
 const s=clamp(globalSector,1,120);
 return s>=F17_UNLOCKS.legendary?'legendary':s>=F17_UNLOCKS.epic?'epic':s>=F17_UNLOCKS.rare?'rare':'common';
}
export function phase17EnemyWeaponLevel(globalSector){
 const s=clamp(globalSector,1,120);
 return s>=85?4:s>=43?3:s>=17?2:1;
}
export function phase17EnemyLoadout(planet,sector){
 const s=phase17GlobalSector(planet,sector);
 const rarity=phase17EnemyWeaponRarity(s);
 const chosen={};
 for(const weaponClass of ['light','medium','heavy']){
   if(weaponClass==='heavy'&&s<F17_UNLOCKS.heavy){chosen[weaponClass]=null;continue;}
   const options=ARSENAL_48.filter(w=>w.weaponClass===weaponClass&&w.rarityKey===rarity);
   // Identità reale dal catalogo, nessuna arma inventata.
   chosen[weaponClass]=s<=20 && weaponClass==='medium' ? 'es_common_medium_03' : options[(Math.floor((s-1)/10)+(weaponClass==='medium'?1:0))%options.length]?.id||null;
 }
 return chosen;
}
export function phase17EnemyWeaponLevels(planet,sector){
 const s=phase17GlobalSector(planet,sector),lv=phase17EnemyWeaponLevel(s);
 return {light:lv,medium:lv,heavy:s>=F17_UNLOCKS.heavy?lv:1};
}
export function phase17PlayerBattleLoadout(armory,planet,sector){
 const s=phase17GlobalSector(planet,sector);
 const base=armory?.equipped||{};
 const commonFor=cls=>cls==='medium'?'es_common_medium_03':ARSENAL_48.find(w=>w.weaponClass===cls&&w.rarityKey==='common')?.id||null;
 const result={light:base.light||commonFor('light'),medium:base.medium||commonFor('medium'),heavy:s>=F17_UNLOCKS.heavy?base.heavy||null:null};
 // In campagna le armi storiche restano salvate; nelle missioni iniziali non
 // si possono anticipare rarità che le regole non hanno ancora introdotto.
 for(const cls of ['light','medium','heavy']){
   const w=getWeaponDefinition(result[cls]);
   if(!w)continue;
   const min={common:1,rare:F17_UNLOCKS.rare,epic:F17_UNLOCKS.epic,legendary:F17_UNLOCKS.legendary}[w.rarityKey]||1;
   if(s<min)result[cls]=cls==='heavy'?null:commonFor(cls);
 }
 return result;
}
export function phase17PlayerWeaponLevels(armory,loadout){
 return Object.fromEntries(['light','medium','heavy'].map(cls=>[cls,clamp(armory?.levels?.[loadout?.[cls]]||1,1,4)]));
}
export function phase17Features(planet,sector){
 const s=phase17GlobalSector(planet,sector);
 return {sector:s,allowJokers:s>=F17_UNLOCKS.joker,allowEther:s>=F17_UNLOCKS.ether,allowPlanetaryDeck:s>=F17_UNLOCKS.planetaryDeck,allowHeavy:s>=F17_UNLOCKS.heavy};
}

/** Una salva iniziale per ciascuna arma disponibile, da munizioni REALI.
 * Evita stalli delle prime partite: le salve successive consumano i serbatoi.
 * Non crea carte, Jolly, munizioni dopo il primo avvio o salve senza Poker. */
export function phase17StartingAmmo(loadout){
 const tanks={hearts:0,diamonds:0,clubs:0,spades:0};
 for(const cls of ['light','medium','heavy']){
   const weapon=getWeaponDefinition(loadout?.[cls]);
   if(weapon&&weapon.ammoSuit in tanks)tanks[weapon.ammoSuit]+=cls==='heavy'?2:4;
 }
 return tanks;
}
