/**
 * ECLISSI STELLARE / FASE 3 — motore puro del ciclo attacco-risposta-preparazione.
 * La UI non decide le regole. Questo motore conserva il banco comune e le carte
 * impegnate, senza toccare il motore/il bilanciamento delle armi (fase 4).
 */
import { BOARD_SLOT_COUNT, MAX_PLACED_CARDS_PER_ACTION, PHASE_MAX_SECONDS, TURN_PHASES } from './config.js';
import { applyBoardPlacements, removeCommittedCards, requiredBoardPlacements } from './combatBasics.js';
import { findBestPokerCombination } from './pokerRules.js';
import { resolveExchange } from './pokerRules.js';
import {getPhase17BlockedSlots} from './phase17Anomalies.js';

const opposite = side => side === 'player' ? 'enemy' : 'player';
export const PHASE3_ACTORS = Object.freeze(['player', 'enemy']);
export const PHASE3_TIMERS = PHASE_MAX_SECONDS;
const validateSide = side => { if (!PHASE3_ACTORS.includes(side)) throw Error('Parte non valida'); };
const clone = cards => Array.isArray(cards) ? [...cards] : [];
const draw = (hand, deck, discard, count = 7) => {
  let d = clone(deck), rest = clone(discard), h = clone(hand);
  while (h.length < count) {
    if (!d.length && rest.length) { d = [...rest].reverse(); rest = []; }
    if (!d.length) break;
    h.push(d.shift());
  }
  return { hand: h, deck: d, discard: rest };
};
export function createPhase3Duel({ playerHand = [], enemyHand = [], playerDeck = [], enemyDeck = [], board = Array(BOARD_SLOT_COUNT).fill(null), ether = 0, opener = 'player' } = {}) {
  validateSide(opener);
  if (!Array.isArray(board) || board.length !== BOARD_SLOT_COUNT) throw Error('Banco non valido');
  return {
    phase: TURN_PHASES.ATTACK, round: 1, opener, actor: opener, board: [...board],
    player: { hand: clone(playerHand), deck: clone(playerDeck), discard: [], exchangesLeft: 2, ether },
    enemy: { hand: clone(enemyHand), deck: clone(enemyDeck), discard: [], exchangesLeft: 2, ether: 0 },
    moves: { player: null, enemy: null }, result: null,
    ready: { player: false, enemy: false }, history: ['Scambio 1: attacco aperto.']
  };
}
export function getPhase3Time(phase) { return PHASE_MAX_SECONDS[phase] ?? null; }
/** Le carte della mossa tornano nella mano ALLA CONFERMA della propria giocata,
 * non dopo la preparazione. Il mazzo e gli scarti sono gli unici serbatoi reali:
 * nessuna carta viene creata o duplicata. Le mani bonus (8/9) restano valide. */
export function refillPhase3HandAfterMove(state,side) {
  validateSide(side);
  const p=state[side];
  const bonus=side==='player' ? Number(state.legacyPassives?.loadout?.traits?.find(t=>t.type==='hand_size_bonus')?.size)||7 : 7;
  const target=Math.max(7,Math.min(9,bonus));
  if(p.hand.length>=target)return state;
  const refilled=draw(p.hand,p.deck,p.discard,target);
  return updateSide(state,side,refilled);
}
/** Reintegro solo nei duelli locali con plancia Classic. Il protocollo PvP
 * online conserva le sue regole server e non viene modificato da questo FIX. */
export function refillAfterLocalCombatMove(state,side) {
  const next=refillPhase3HandAfterMove(state,side);
  // Il Boost di chi ha aperto lo scambio viene consumato solo alla risoluzione:
  // dopo la risposta controlliamo entrambe le mani, non solo l'ultima mossa.
  return next.phase===TURN_PHASES.ANIMATE
    ? refillPhase3HandAfterMove(next,side==='player'?'enemy':'player') : next;
}
export function getMinimumPlacements(state, side) {
  validateSide(side);
  return requiredBoardPlacements(state.board, state[side].hand.length, MAX_PLACED_CARDS_PER_ACTION, getPhase17BlockedSlots(state));
}
const updateSide = (state, side, values) => ({...state, [side]: {...state[side], ...values}});
const log = (state, message) => ({ ...state, history: [...state.history, message].slice(-20) });
export function commitPhase3Move(state, side, placements = [], isPass = false, options = {}) {
  validateSide(side);
  if (![TURN_PHASES.ATTACK, TURN_PHASES.RESPONSE].includes(state.phase) || state.actor !== side) throw Error('Non è il turno di questa parte');
  let next = state;
  let score = null;
  let committedCards = null;
  if (!isPass) {
    if (!Array.isArray(placements) || !placements.length) throw Error('Seleziona carte o passa');
    const availableIds = state[side].hand.map(c => c.id);
    const placed = applyBoardPlacements(state.board, placements, { availableCardIds: availableIds, maxCards: MAX_PLACED_CARDS_PER_ACTION, blockedSlots:getPhase17BlockedSlots(state) });
    if (!placed.valid) throw Error(`Mossa non valida: ${placed.error}`);
    score = findBestPokerCombination(placed.board.map((card,index)=>getPhase17BlockedSlots(state).includes(index)?null:card), options.allowedPatterns || null);
    if (!score) throw Error('Nessuna combinazione Poker valida: puoi cambiare le carte o passare');
    committedCards = placed.board.filter(c => c && score.cardIds.includes(c.id));
    const nextBoard = removeCommittedCards(placed.board, score.cardIds);
    const usedHandIds = new Set(placed.placedCardIds);
    next = updateSide({ ...state, board: nextBoard }, side, {
      hand: state[side].hand.filter(c => !usedHandIds.has(c.id)),
      discard: [...state[side].discard, ...placed.replacedCards, ...placed.board.filter(c => c && score.cardIds.includes(c.id))]
    });
  }
  next = { ...next, moves: { ...next.moves, [side]: score ? {score, side, cardIds: score.cardIds, weaponId: options.weaponId || null, committedCards: options.weaponId ? committedCards : null} : { score: null, side, passed: true } } };
  next = log(next, `${side === 'player' ? 'Giocatore' : 'Computer'}: ${score ? score.label : 'PASSA'}.`);
  if (state.phase === TURN_PHASES.ATTACK) {
    return { ...next, phase: TURN_PHASES.RESPONSE, actor: opposite(side) };
  }
  const openerMove = next.moves[next.opener];
  const responderMove = next.moves[opposite(next.opener)];
  const result = resolveExchange(openerMove, responderMove);
  let nextOpener = result.nextInitiative === 'attacker' ? next.opener
    : result.nextInitiative === 'responder' ? opposite(next.opener)
    : opposite(next.opener); // Parità o doppio passaggio: iniziativa alternata (provvisoria).
  return log({ ...next, phase: TURN_PHASES.ANIMATE, actor: null,
    result: { ...result, nextOpener, opener: next.opener, responder: opposite(next.opener) }
  }, `Confronto: ${result.winner === null ? 'PARITÀ / NESSUN ATTACCO' : (result.winner === 'attacker' ? 'VINCE CHI APRE' : 'VINCE CHI RISPONDE')}.`);
}
export function finishPhase3Animation(state) {
  if (state.phase !== TURN_PHASES.ANIMATE) throw Error('Nessuna animazione in corso');
  return { ...state, phase: TURN_PHASES.PREPARE, ready: {player:false, enemy:false},
    player:{...state.player, exchangesLeft:2}, enemy:{...state.enemy, exchangesLeft:2} };
}
export function exchangePhase3Cards(state, side, indices) {
  validateSide(side);
  if (state.phase !== TURN_PHASES.PREPARE || state.ready[side]) throw Error('Scambio consentito solo in preparazione');
  if (state[side].exchangesLeft < 1 || !Array.isArray(indices) || indices.length < 1 || indices.length > 3 || new Set(indices).size !== indices.length) throw Error('Cambio: da 1 a 3 carte; massimo 2 operazioni');
  if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= state[side].hand.length)) throw Error('Carta non valida');
  const chosen = new Set(indices);
  const p = state[side];
  const removed = p.hand.filter((_,i) => chosen.has(i));
  const refilled = draw(p.hand.filter((_,i)=>!chosen.has(i)),p.deck,[...p.discard,...removed],p.hand.length);
  return log(updateSide(state,side,{...refilled,exchangesLeft:p.exchangesLeft - 1}),`${side === 'player' ? 'Giocatore' : 'Computer'}: cambia ${indices.length} carte (${p.exchangesLeft - 1} cambi rimasti).`);
}
export function extractPhase3WithEther(state, side, handIndex, deckIndex, cost = 4) {
  validateSide(side);
  if (state.phase !== TURN_PHASES.PREPARE || state.ready[side]) throw Error('Etere disponibile solo in preparazione');
  const p = state[side];
  if (p.ether < cost) throw Error('Etere insufficiente');
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= p.hand.length || !Number.isInteger(deckIndex) || deckIndex < 0 || deckIndex >= p.deck.length) throw Error('Indici non validi');
  const hand = [...p.hand], deck = [...p.deck], discarded = hand[handIndex];
  hand[handIndex] = deck.splice(deckIndex,1)[0];
  return log(updateSide(state,side,{hand, deck, discard:[...p.discard,discarded],ether:p.ether-cost}),`${side === 'player' ? 'Giocatore' : 'Computer'}: estrae una carta usando ${cost} Etere.`);
}
export function markPhase3Ready(state, side) {
  validateSide(side);
  if (state.phase !== TURN_PHASES.PREPARE) throw Error('Non siamo in preparazione');
  const ready = {...state.ready, [side]:true};
  if (!ready.player || !ready.enemy) return {...state, ready};
  const p = draw(state.player.hand,state.player.deck,state.player.discard,7);
  const e = draw(state.enemy.hand,state.enemy.deck,state.enemy.discard,7);
  return log({...state, round:state.round+1, phase: TURN_PHASES.ATTACK,
    opener:state.result?.nextOpener ?? opposite(state.opener),
    actor:state.result?.nextOpener ?? opposite(state.opener),
    moves:{player:null,enemy:null}, result:null,
    player: {...state.player,...p}, enemy:{...state.enemy,...e},
    ready:{player:false,enemy:false}},`Scambio ${state.round+1}: nuovo attacco.`);
}
export function getPhase3CandidateMove(state, side, attempts = 80) {
  validateSide(side);
  const hand = state[side].hand;
  if (!hand.length) return null;
  const blocked = getPhase17BlockedSlots(state);
  const empty = state.board.map((c,i) => c == null && !blocked.includes(i) ? i : -1).filter(i=>i >= 0);
  const required = Math.min(empty.length,hand.length,MAX_PLACED_CARDS_PER_ACTION);
  let best = null;
  // Numero di prove contenuto per lasciare l'AI responsiva anche da telefono.
  for (let n = 0; n < attempts; n++) {
    const quantity = Math.min(hand.length,MAX_PLACED_CARDS_PER_ACTION,required + (n % (MAX_PLACED_CARDS_PER_ACTION-required+1)));
    if (!quantity) continue;
    const selected = [...hand].sort(() => Math.random()-0.5).slice(0,quantity);
    const replaceable = state.board.map((_,i)=>i).filter(i=>!blocked.includes(i) && !empty.includes(i)).sort(()=>Math.random()-0.5);
    const slots = [...empty.slice(0,required),...replaceable].slice(0,quantity);
    if (slots.length !== quantity) continue;
    const placements = selected.map((card,i)=>({slot:slots[i],card}));
    const applied = applyBoardPlacements(state.board,placements,{availableCardIds:hand.map(c=>c.id),blockedSlots:blocked});
    if (!applied.valid) continue;
    const score = findBestPokerCombination(applied.board.map((card,i)=>blocked.includes(i)?null:card));
    if (!score) continue;
    const weight = score.tier*1000 + (score.kickers?.[0] || 0)*10 + Math.random();
    if (!best || weight>best.weight) best = {placements,score,weight};
  }
  return best;
}
