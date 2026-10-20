/**
 * ECLISSI STELLARE — FASE 6 / Preparazione strategica.
 * La preparazione è simultanea; ogni partecipante decide indipendentemente.
 * Nessuna funzione blocca o modifica il timer dell'altro partecipante.
 * Il combattimento legacy rimane intatto.
 */
import { TURN_PHASES, PHASE_MAX_SECONDS } from './config.js';
import { normalizePokerRank } from './pokerRules.js';
import { createPhase5Duel, finishPhase5Animation } from './phase5Engine.js';
import { exchangePhase3Cards, extractPhase3WithEther, markPhase3Ready } from './phase3Engine.js';

export const PHASE6_SWAP_COSTS = Object.freeze({
  one: { enemyHeal: 3, ownTimeSeconds: 0, selfDamage: 0 },
  two: { enemyHeal: 3, ownTimeSeconds: 3, selfDamage: 0 },
  three: { enemyHeal: 3, ownTimeSeconds: 3, selfDamage: 3 },
});
export const PHASE6_ETHER_COST = 4;
export const PHASE6_MAX_EXCHANGES = 2;
const SIDES = ['player','enemy'];
const other = side => side === 'player' ? 'enemy' : 'player';
const ensureSide = side => { if (!SIDES.includes(side)) throw Error('Parte non valida'); };
const newPreparation = () => ({
  timePenaltySeconds: {player:0,enemy:0},
  lastAction: null,
  statistics: {player:{swaps:0,cardsSwapped:0,etherExtracts:0,etherSpent:0},enemy:{swaps:0,cardsSwapped:0,etherExtracts:0,etherSpent:0}},
});

export function createPhase6Duel({enemyEther, ...options}={}) {
  const duel=createPhase5Duel(options);
  // Nella prova PvE le due parti ricevono la stessa riserva iniziale di Etere,
  // salvo una riserva specifica esplicitamente fornita per il computer.
  const startingEther=enemyEther === undefined ? (options.ether ?? 0) : enemyEther;
  return {...duel, enemy:{...duel.enemy,ether:Math.max(0,Math.floor(Number(startingEther)||0))},
    preparation:newPreparation()};
}
export function finishPhase6Animation(state) {
  const next=finishPhase5Animation(state);
  return {...next, preparation:{...state.preparation, timePenaltySeconds:{player:0,enemy:0},lastAction:null}};
}
/** Il bonus di un pilota può annullare una singola penalità senza cambiarne le altre. */
export function exchangePhase6Cards(state,side,indices,exemptions={}) {
  ensureSide(side);
  // Prima validiamo e completiamo lo scambio: se non è valido non ci sono effetti collaterali.
  const exchanged=exchangePhase3Cards(state,side,indices);
  const count=indices.length;
  const tariff=PHASE6_SWAP_COSTS[['','one','two','three'][count]];
  const enemy=other(side);
  const currentHp=state.hp?.[side] ?? 0;
  const initialEnemyHp=state.initialHp?.[enemy] ?? state.hp?.[enemy] ?? 0;
  const enemyHeal=exemptions.noEnemyHeal?0:Math.min(tariff.enemyHeal,Math.max(0,initialEnemyHp-(state.hp?.[enemy] ?? 0)));
  const selfDamage=exemptions.noSelfDamage?0:Math.min(tariff.selfDamage,currentHp);
  const ownTimeSeconds=exemptions.noTimeLoss?0:tariff.ownTimeSeconds;
  const hp={...state.hp,[side]:Math.max(0,currentHp-selfDamage),[enemy]:(state.hp?.[enemy] ?? 0)+enemyHeal};
  const prev=state.preparation || newPreparation();
  const statistics={...prev.statistics,[side]:{
    ...prev.statistics[side], swaps:prev.statistics[side].swaps+1,cardsSwapped:prev.statistics[side].cardsSwapped+count
  }};
  const effects={type:'swap',side,count,enemyHeal,selfDamage,ownTimeSeconds};
  const preparation={...prev,statistics,lastAction:effects,timePenaltySeconds:{...prev.timePenaltySeconds,
    [side]:(prev.timePenaltySeconds?.[side] ?? 0)+ownTimeSeconds}};
  const defeated=selfDamage>0 && hp[side]===0;
  return {...exchanged,hp,preparation,
    ...(defeated?{phase:TURN_PHASES.FINISHED,actor:null,winner:enemy}:{}),
    history:[...exchanged.history,`${side==='player'?'Tu':'Computer'}: cambio ${count} carte · avversario +${enemyHeal} HP · tempo -${ownTimeSeconds}s · HP propri -${selfDamage}.`].slice(-20)};
}
export function extractPhase6WithEther(state,side,handIndex,deckIndex,cost=PHASE6_ETHER_COST) {
  ensureSide(side);
  // Il costo viene verificato dal motore Fase 3; nessuna carta è duplicata.
  const next=extractPhase3WithEther(state,side,handIndex,deckIndex,cost);
  const prev=state.preparation || newPreparation();
  const statistics={...prev.statistics,[side]:{...prev.statistics[side],etherExtracts:prev.statistics[side].etherExtracts+1,etherSpent:(prev.statistics[side].etherSpent||0)+cost}};
  return {...next,preparation:{...prev,statistics,lastAction:{type:'ether',side,cost}}};
}
export function markPhase6Ready(state,side) {
  ensureSide(side);
  const next=markPhase3Ready(state,side);
  if (next.phase===TURN_PHASES.ATTACK)
    return {...next,preparation:{...state.preparation,timePenaltySeconds:{player:0,enemy:0},lastAction:null}};
  return next;
}
/** Stesso inizio, ma scadenze personali: un cambio non ruba tempo all'altro. */
export function getPhase6RemainingSeconds(state,side,elapsedSeconds) {
  ensureSide(side);
  if(state.phase!==TURN_PHASES.PREPARE) return null;
  if(state.ready?.[side]) return 0;
  const penalty=state.preparation?.timePenaltySeconds?.[side] ?? 0;
  return Math.max(0,Math.ceil(PHASE_MAX_SECONDS.prepare-Math.max(0,elapsedSeconds)-penalty));
}
/** Gestisce le scadenze individuali con una sola chiamata; nessuna attesa extra. */
export function expirePhase6Preparation(state,elapsedSeconds) {
  if(state.phase!==TURN_PHASES.PREPARE) return state;
  let next=state;
  for(const side of SIDES) {
    if(next.phase!==TURN_PHASES.PREPARE) break;
    if(!next.ready[side] && getPhase6RemainingSeconds(next,side,elapsedSeconds)===0)
      next=markPhase6Ready(next,side);
  }
  return next;
}

/**
 * L'AI seleziona soltanto fra le proprie carte; il mazzo è ispezionato SOLO
 * nell'azione Etere, per la quale anche il giocatore vede le carte del mazzo.
 */
const ranks = cards => cards.map(c=>normalizePokerRank(c)).filter(n=>n>0);
export function planPhase6AIPreparation(state,side='enemy') {
  ensureSide(side);
  if(state.phase!==TURN_PHASES.PREPARE || state.ready[side]) return {swaps:[],ether:null};
  const p=state[side];
  const values=ranks(p.hand);
  const counts=new Map();
  for(const v of values) counts.set(v,(counts.get(v)||0)+1);
  const candidates=p.hand.map((card,index)=>({index,rank:normalizePokerRank(card),freq:counts.get(normalizePokerRank(card))||0}));
  const isolated=candidates.filter(c=>c.rank>0&&c.freq===1 && !values.some(v=>v!==c.rank && Math.abs(v-c.rank)===1));
  // Cambio conservativo: una sola carta morta quando il costo non mette a rischio la partita.
  const canSwap=p.exchangesLeft>0 && p.deck.length>0 && state.hp[side]>9 && isolated.length>=2;
  const swaps=canSwap ? [[isolated[0].index]] : [];
  // L'Etere serve per ottenere una figura già preparata, non per una pescata arbitraria.
  let ether=null;
  if(p.ether>=PHASE6_ETHER_COST && p.deck.length) {
    const ownPairs=candidates.filter(c=>c.freq>=2);
    const targets=new Set((ownPairs.length?ownPairs:candidates).map(c=>c.rank));
    const deckIndex=p.deck.findIndex(c=>targets.has(normalizePokerRank(c)) && normalizePokerRank(c)>0);
    const replace=candidates.find(c=>c.freq===1 && !targets.has(c.rank)) || isolated[0];
    // Senza una coppia già formata, l'AI spende Etere solo se ottiene un tris o una coppia forte.
    const matching=deckIndex>=0?normalizePokerRank(p.deck[deckIndex]):0;
    const handIndex=candidates.find(c=>c.freq===1&&c.rank!==matching)?.index;
    if(deckIndex>=0 && handIndex!=null && ((counts.get(matching)||0)>=2 || (counts.get(matching)||0)===1 && matching>=10))
      ether={handIndex,deckIndex,cost:PHASE6_ETHER_COST};
  }
  return {swaps,ether};
}
export function executePhase6AIPreparation(state,side='enemy') {
  ensureSide(side);
  if(state.phase!==TURN_PHASES.PREPARE || state.ready[side]) return state;
  const plan=planPhase6AIPreparation(state,side);
  let next=state;
  for(const indices of plan.swaps) {
    if(next.phase!==TURN_PHASES.PREPARE || next.ready[side]) break;
    next=exchangePhase6Cards(next,side,indices);
  }
  // Dopo il cambio la posizione nella mano potrebbe essere diversa: rivalutiamo Etere.
  if(next.phase===TURN_PHASES.PREPARE) {
    const refreshed=planPhase6AIPreparation(next,side);
    if(refreshed.ether) next=extractPhase6WithEther(next,side,refreshed.ether.handIndex,refreshed.ether.deckIndex,refreshed.ether.cost);
  }
  return next.phase===TURN_PHASES.PREPARE?markPhase6Ready(next,side):next;
}
