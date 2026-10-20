/** FASE 4: adattatore sul motore dei turni della Fase 3, con armi/HP/munizioni effettivi. */
import { createPhase3Duel,commitPhase3Move,finishPhase3Animation, getPhase3CandidateMove } from './phase3Engine.js';
import { applyBoardPlacements } from './combatBasics.js';
import { getPhase4WeaponOptions,normalizePhase4Loadout,normalizeSuitTanks,resolvePhase4Volleys,getPhase4Profile,chargedAmmoFromCards,calculatePhase4Volley } from './phase4Weapons.js';
import { comparePokerScores } from './pokerRules.js';
import { getWeaponDefinition } from './weaponCatalog.js';
import { findBestPokerCombination } from './pokerRules.js';
import {getPhase16CWeaponAdaptation,getPhase16CHeat,PHASE16C_HEAT_LIMIT} from './phase16CEpics.js';
import { TURN_PHASES, MAX_PLACED_CARDS_PER_ACTION } from './config.js';
import {getPhase17BlockedSlots,isPhase17WeaponFrozen} from './phase17Anomalies.js';
import {phase17Features} from './phase17Balance.js';

export function createPhase4Duel({playerLoadout,enemyLoadout,playerAmmo,enemyAmmo,playerHp=120,enemyHp=120,playerWeaponLevels=null,enemyWeaponLevels=null,...oldProps}={}) {
  const initial=createPhase3Duel(oldProps);
  return {...initial,weaponLevels:{player:playerWeaponLevels||{},enemy:enemyWeaponLevels||{}},arsenal:{player:normalizePhase4Loadout(playerLoadout),enemy:normalizePhase4Loadout(enemyLoadout)},
    ammo:{player:normalizeSuitTanks(playerAmmo),enemy:normalizeSuitTanks(enemyAmmo)},
    hp:{player:Math.max(1,Math.floor(Number(playerHp)||120)),enemy:Math.max(1,Math.floor(Number(enemyHp)||120))},
    initialHp:{player:Math.max(1,Math.floor(Number(playerHp)||120)),enemy:Math.max(1,Math.floor(Number(enemyHp)||120))},winner:null};
}
export function getPhase4MoveOptions(state,side,placements=[]) {
  if(!state?.arsenal?.[side] || !Array.isArray(placements) || !placements.length) return [];
  const blockedSlots=getPhase17BlockedSlots(state);
  const placed=applyBoardPlacements(state.board,placements,{availableCardIds:state[side].hand.map(c=>c.id),blockedSlots});
  if(!placed.valid) return [];
  const activeBoard=placed.board.map((card,i)=>blockedSlots.includes(i)?null:card);
  const options=getPhase4WeaponOptions(activeBoard,state.arsenal[side],state.ammo[side],{weaponLevels:state.weaponLevels?.[side]});
  const heavy=getWeaponDefinition(state.arsenal[side]?.heavy);
  const adaptation=getPhase16CWeaponAdaptation(state,side,'heavy',heavy);
  if(heavy && adaptation){
    const native=options.some(option=>option.weaponClass==='heavy');
    if(!native){
      const score=findBestPokerCombination(activeBoard,['one_pair','three_of_a_kind']);
      if(score){
        const profile=getPhase4Profile(heavy.id,state.weaponLevels?.[side]?.heavy||1),spent=activeBoard.filter(c=>c&&score.cardIds.includes(c.id));
        const gained=chargedAmmoFromCards(spent);
        const available=(state.ammo[side]?.[heavy.ammoSuit]||0)+gained[heavy.ammoSuit];
        const volley=calculatePhase4Volley(profile,available,100);
        options.push({weaponId:heavy.id,weaponClass:'heavy',weapon:heavy,score,profile,availableAmmo:available,
          potentialDamage:volley.damage,fullShots:volley.fullShots,canFire:volley.shots>0,
          allowedPatternsOverride:[score.patternId],adaptedByEpic:true});
      }
    }
  }
  return options.map(option=>isPhase17WeaponFrozen(state,side,option.weaponClass)
    ? {...option,canFire:false,frozenByAnomaly:true}:getPhase16CHeat(state,side,option.weaponClass)>=PHASE16C_HEAT_LIMIT
    ? {...option,canFire:false,heatBlocked:true}:option)
    .sort((a,b)=>comparePokerScores(b.score,a.score)||b.potentialDamage-a.potentialDamage);
}
export function commitPhase4Move(state,side,placements=[],isPass=false,weaponId=null) {
  if(state.winner || state.phase===TURN_PHASES.FINISHED) throw Error('Battaglia terminata');
  if(isPass) {
    const next=commitPhase3Move(state,side,[],true);
    return next.phase===TURN_PHASES.ANIMATE?resolvePhase4Volleys(next):next;
  }
  const options=getPhase4MoveOptions(state,side,placements);
  const chosen=weaponId?options.find(option=>option.weaponId===weaponId):options.find(option=>option.canFire);
  if(!chosen) throw Error('Nessun attacco Poker compatibile: scegli un\'arma valida oppure PASSA');
  if(!chosen.canFire) throw Error(chosen.frozenByAnomaly?'Arma congelata dall’anomalia del boss':chosen.heatBlocked?'Arma surriscaldata: attendi il raffreddamento':'Munizioni insufficienti per la salva');
  const next=commitPhase3Move(state,side,placements,false,{allowedPatterns:chosen.allowedPatternsOverride||chosen.weapon.allowedPokerPatterns,weaponId:chosen.weaponId});
  return next.phase===TURN_PHASES.ANIMATE?resolvePhase4Volleys(next):next;
}
export function finishPhase4Animation(state) {
  if(state.winner) return {...state,phase:TURN_PHASES.FINISHED,actor:null};
  return finishPhase3Animation(state);
}
/** AI consuma solo carte della propria mano: medesimi vincoli di armi e serbatoi del giocatore. */
export function getPhase4CandidateMove(state,side,attempts=140) {
  let best=null;
  // Prima scelta semplice: proposta del motore precedente, poi tentativi addizionali.
  const preferred=getPhase3CandidateMove(state,side,attempts);
  const candidates=preferred?[preferred.placements]:[];
  const hand=state[side].hand;
  const blocked=getPhase17BlockedSlots(state);
  const empties=state.board.map((c,i)=>c==null&&!blocked.includes(i)?i:-1).filter(i=>i!==-1);
  const required=Math.min(empties.length,hand.length,MAX_PLACED_CARDS_PER_ACTION);
  for(let n=0;n<attempts;n++) {
    const quantity=Math.min(hand.length,MAX_PLACED_CARDS_PER_ACTION,required + (n % (MAX_PLACED_CARDS_PER_ACTION-required+1)));
    if(quantity===0) continue;
    const cards=[...hand].sort(()=>Math.random()-.5).slice(0,quantity);
    const slots=[...empties.slice(0,required),...state.board.map((_,i)=>i).filter(i=>!empties.includes(i)&&!blocked.includes(i)).sort(()=>Math.random()-.5)].slice(0,quantity);
    if(slots.length!==quantity) continue;
    candidates.push(cards.map((card,i)=>({slot:slots[i],card})));
  }
  for(const placements of candidates) {
    const options=getPhase4MoveOptions(state,side,placements);
    const chosen=options.find(o=>o.canFire);
    if(!chosen) continue;
    const comparison=best?comparePokerScores(chosen.score,best.choice.score):1;
    if(comparison>0 || (comparison===0 && chosen.potentialDamage>best.choice.potentialDamage)) best={placements,weaponId:chosen.weaponId,choice:chosen};
  }
  return best;
}


/** Scelta di una delle 48 armi prima dell'inizio, senza scrivere sui salvataggi legacy. */
export function setPhase4EquippedWeapon(state,side,weaponClass,weaponId) {
  if(state.round!==1 || state.phase!==TURN_PHASES.ATTACK || state.moves.player || state.moves.enemy) throw Error('Equipaggiamento modificabile solo prima dello scambio iniziale');
  if(!['player','enemy'].includes(side)) throw Error('Parte non valida');
  const weapon=getWeaponDefinition(weaponId);
  if(side==='player' && state.campaignEnvironment){
    const features=phase17Features(state.campaignSession?.planet||1,state.campaignSession?.sector||1);
    if(weaponClass==='heavy'&&!features.allowHeavy)throw Error('Arma Pesante non ancora sbloccata');
    const threshold={common:1,rare:21,epic:51,legendary:91}[weapon?.rarityKey]||1;
    if(features.sector<threshold)throw Error('Rarità arma non ancora disponibile in campagna');
  }
  if(!weapon || !['light','medium','heavy'].includes(weaponClass) || weapon.weaponClass!==weaponClass) throw Error('Arma incompatibile con lo slot');
  return {...state,arsenal:{...state.arsenal,[side]:{...state.arsenal[side],[weaponClass]:weaponId}}};
}
