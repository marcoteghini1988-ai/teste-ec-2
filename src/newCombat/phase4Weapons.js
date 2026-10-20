/**
 * ECLISSI STELLARE — FASE 4. Armi e balistica del nuovo duello.
 * I numeri sono parametri DI PROVA, NON il bilanciamento finale di shop/campagna.
 * L'identità delle 48 armi vive in weaponCatalog.js; nessun doppione di definizioni.
 */
import { ARSENAL_48, getWeaponDefinition } from './weaponCatalog.js';
import { findBestPokerCombination, normalizePokerSuit, normalizePokerRank, isPokerJoker } from './pokerRules.js';
import { comparePokerScores } from './pokerRules.js';
import { SUITS } from './config.js';
import {phase17EnemyDamageScale} from './phase17Balance.js';

export const PHASE4_TEST_PROFILE = Object.freeze({
  light: Object.freeze({ damagePerShot: 2, fullSalvo: 4 }),
  medium: Object.freeze({ damagePerShot: 4, fullSalvo: 4 }),
  heavy: Object.freeze({ damagePerShot: 8, fullSalvo: 2 }),
});
const CLASSES = ['light','medium','heavy'];
export const emptySuitTanks = () => ({hearts:0, diamonds:0, clubs:0, spades:0});
export function normalizeSuitTanks(tanks) {
  const next=emptySuitTanks();
  for(const suit of SUITS) next[suit]=Math.max(0,Math.floor(Number(tanks?.[suit])||0));
  return next;
}
export function defaultPhase4Loadout() {
  return Object.fromEntries(CLASSES.map(weaponClass=>[weaponClass,ARSENAL_48.find(w=>w.weaponClass===weaponClass && w.rarityKey==='common')?.id || null]));
}
export function normalizePhase4Loadout(loadout) {
  const defaults=defaultPhase4Loadout();
  const result={};
  for(const weaponClass of CLASSES) {
    const id=Object.prototype.hasOwnProperty.call(loadout||{},weaponClass)?loadout[weaponClass]:defaults[weaponClass];
    if(id===null){result[weaponClass]=null;continue;}
    const w=getWeaponDefinition(id);
    result[weaponClass]=w?.weaponClass===weaponClass ? id : defaults[weaponClass];
  }
  return result;
}
export function getPhase4Profile(weaponId, level=1) {
  const weapon=getWeaponDefinition(weaponId);
  if(!weapon) return null;
  // La Gatling conserva la balistica del livello 1 del catalogo legacy.
  const base=weapon.legacyId==='wp_gatling' ? { damagePerShot:2, fullSalvo:4 } : PHASE4_TEST_PROFILE[weapon.weaponClass];
  const rarity={common:0,rare:1,epic:2,legendary:3}[weapon.rarityKey]||0;
  const lv=Math.max(1,Math.min(4,Math.floor(Number(level)||1)));
  // Incrementi interi: i colpi restano sempre multipli pari e Joker non genera munizioni.
  return {damagePerShot:base.damagePerShot+(lv-1)*(weapon.weaponClass==='light'?3:weapon.weaponClass==='medium'?8:18)+rarity,fullSalvo:base.fullSalvo};
}
export function chargedAmmoFromCards(cards) {
  const tanks=emptySuitTanks();
  for(const card of cards||[]) {
    if(isPokerJoker(card)) continue; // Un jolly non crea munizioni di un seme immaginario.
    const suit=normalizePokerSuit(card?.suit);
    if(!(suit in tanks)) continue;
    tanks[suit] += Math.max(0,normalizePokerRank(card) || 0);
  }
  return tanks;
}
/**
 * Salve PARI: in questo modo il colpo parziale usa esattamente metà proiettili
 * e metà danno. Un proiettile isolato resta nel serbatoio per il turno successivo.
 */
export function calculatePhase4Volley(profile, availableAmmo, percent) {
  if(!profile || !Number.isInteger(profile.fullSalvo) || profile.fullSalvo<=0 || profile.fullSalvo%2!==0 ||
    !Number.isFinite(profile.damagePerShot) || profile.damagePerShot<=0 || ![0,50,100].includes(percent)) throw Error('Profilo balistico non valido');
  const fullShots=Math.min(profile.fullSalvo,2*Math.floor(Math.max(0,Math.floor(availableAmmo))/2));
  const shots=percent===100?fullShots:percent===50?fullShots/2:0;
  return {shots, damage:shots*profile.damagePerShot, fullShots, damagePercent:percent,
    ammoPercent:percent, remainingAmmo:Math.max(0,Math.floor(availableAmmo)-shots)};
}
/** L'arma è attivata SOLO da una delle combinazioni che essa supporta. */
export function getPhase4WeaponOptions(board, loadout, tanks, {readyOnly=false,weaponLevels=null}={}) {
  const normalized=normalizePhase4Loadout(loadout);
  const list=[];
  for(const weaponClass of CLASSES) {
    const weapon=getWeaponDefinition(normalized[weaponClass]);
    if(!weapon) continue;
    const score=findBestPokerCombination(board, weapon.allowedPokerPatterns);
    if(!score) continue;
    const profile=getPhase4Profile(weapon.id,weaponLevels?.[weaponClass]||1);
    const spent=board.filter(card=>card && score.cardIds.includes(card.id));
    const gained=chargedAmmoFromCards(spent);
    const available=(tanks?.[weapon.ammoSuit]||0)+gained[weapon.ammoSuit];
    // F17L: due MODALITÀ di accensione, non due colpi extra.
    // La figura élite mantiene la salva completa; Scala/Colore da 4 consente
    // una singola salva ridotta (un colpo della Pesante, senza cambiare il Poker).
    const secondary=weaponClass==='heavy' && score.patternId===weapon.secondaryActivationPattern;
    const volley=calculatePhase4Volley(profile,available,secondary?50:100);
    if(readyOnly && volley.shots===0) continue;
    list.push({weaponId:weapon.id,weaponClass,weapon,score,profile,availableAmmo:available,
      activationMode:secondary?'secondary':'primary',previewShots:volley.shots,
      potentialDamage:volley.damage, fullShots:volley.fullShots, canFire:volley.shots>0});
  }
  return list.sort((a,b)=>comparePokerScores(b.score,a.score)||b.potentialDamage-a.potentialDamage || b.availableAmmo-a.availableAmmo);
}
export function resolvePhase4Volleys(state) {
  if(!state?.result || state.phase!=='animate' || !state.arsenal || !state.ammo || !state.hp || state.result.volleys) return state;
  const sides=[state.result.opener,state.result.responder];
  const ammo={player:normalizeSuitTanks(state.ammo.player),enemy:normalizeSuitTanks(state.ammo.enemy)};
  const hp={...state.hp};
  const volleys={};
  for(let i=0;i<sides.length;i++) {
    const side=sides[i];
    const move=state.moves[side];
    const percent=state.result.damagePercent[i];
    const weapon=getWeaponDefinition(move?.weaponId);
    if(!weapon || !move?.score || percent===0) {
      volleys[side]={weaponId:null,weaponName:null,shots:0,damage:0,damagePercent:0,ammoPercent:0};
      continue;
    }
    const gained=chargedAmmoFromCards(move.committedCards);
    for(const suit of SUITS) ammo[side][suit]+=gained[suit];
    const profile=getPhase4Profile(weapon.id,state.weaponLevels?.[side]?.[weapon.weaponClass]||1);
    const available=ammo[side][weapon.ammoSuit];
    const secondary=weapon.weaponClass==='heavy' && move.score.patternId===weapon.secondaryActivationPattern;
    // Il confronto Poker resta quello reale (percent). Solo la salva è limitata
    // a metà nella modalità alternativa: niente doppi colpi, danni o munizioni.
    const salvoPercent=secondary?Math.min(percent,50):percent;
    const volley=calculatePhase4Volley(profile,available,salvoPercent);
    ammo[side][weapon.ammoSuit]=volley.remainingAmmo;
    const target=side==='player'?'enemy':'player';
    const campaignScale=side==='enemy' && state.campaignSession
      ? phase17EnemyDamageScale(state.campaignSession.planet,state.campaignSession.sector) : 1;
    const dealt= Math.round(volley.damage*campaignScale);
    hp[target]=Math.max(0,hp[target]-dealt);
    volleys[side]={...volley,damagePercent:percent,salvoPercent,
      activationMode:secondary?'secondary':'primary',damage:dealt,unscaledDamage:volley.damage,
      campaignScale,weaponId:weapon.id,weaponName:weapon.name,suit:weapon.ammoSuit,
      gainedAmmo:gained[weapon.ammoSuit]};
  }
  const winner=hp.player<=0 && hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
  return {...state,hp,ammo,winner, result:{...state.result,volleys},
    history:[...state.history,`Salve: TU ${volleys.player.damage} danni / COMPUTER ${volleys.enemy.damage} danni. HP ${hp.player}–${hp.enemy}.`].slice(-20)};
}
