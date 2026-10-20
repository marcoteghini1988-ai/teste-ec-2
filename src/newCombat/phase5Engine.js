/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { BOOST_LEVELS, TURN_PHASES } from './config.js';
import { normalizePokerRank, isPokerJoker } from './pokerRules.js';
import { createPhase4Duel, commitPhase4Move, finishPhase4Animation, getPhase4CandidateMove } from './phase4Engine.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/boostRules.js ──

export const MATH_OPERATION_PREVIEW = Object.freeze({ '+': 0, '-': 5, '*': 10, '/': 15 });
export function spendBoostEnergy(energy, cost) {
  if (!Number.isInteger(energy) || energy < 0 || !BOOST_LEVELS.some(level => level.cost === cost) || energy < cost)
    return { valid: false, reason: 'INSUFFICIENT_OR_INVALID_TIER' };
  return { valid: true, remaining: energy - cost, bonusPercent: BOOST_LEVELS.find(level => level.cost === cost).bonusPercent };
}
export function checkBoostCalculation(cardA, cardB, operation, target) {
  if (!cardA || !cardB || cardA.id === cardB.id || !Object.hasOwn(MATH_OPERATION_PREVIEW, operation)) return false;
  if ((isPokerJoker(cardA) && !cardA.isTransformed) || (isPokerJoker(cardB) && !cardB.isTransformed)) return false;
  const a=normalizePokerRank(cardA), b=normalizePokerRank(cardB);
  if (![a,b,target].every(Number.isInteger)) return false;
  if (operation === '+') return a + b === target;
  if (operation === '-') return a - b === target;
  if (operation === '*') return a * b === target;
  return b !== 0 && a / b === target;
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase5Engine.js ──


export const BOOST_ENERGY_CAP = BOOST_LEVELS.at(-1).cost;
const SIDES=['player','enemy'];
const other = side => side==='player'?'enemy':'player';
const clampEnergy = n => Math.max(0,Math.min(BOOST_ENERGY_CAP,Math.floor(Number(n)||0)));
const cleanTarget = n => Number.isInteger(n) && n>=2 && n<=20 ? n : 6;

/** Bersagli personali deterministici per i test, poi rinnovati dopo un uso riuscito. */
export function nextBoostTarget(oldTarget, round=1, side='player') {
  const base=cleanTarget(oldTarget);
  const next=2+((base-2+5+Math.max(0,round)+(side==='enemy'?3:0))%19);
  return next===base ? 2+((base-1)%19) : next;
}
export function createPhase5Duel({playerBoostEnergy=0,enemyBoostEnergy=0,playerBoostTarget=6,enemyBoostTarget=6,...props}={}) {
  return {...createPhase4Duel(props),boost:{
    player:{energy:clampEnergy(playerBoostEnergy),target:cleanTarget(playerBoostTarget)},
    enemy:{energy:clampEnergy(enemyBoostEnergy),target:cleanTarget(enemyBoostTarget)}
  }};
}

export function getBoostValue(card) {
  if (!card || (isPokerJoker(card) && !card.isTransformed)) return 0;
  return normalizePokerRank(card)||0;
}
export function boostEnergyFromLostMove(move) {
  return move?.score && Array.isArray(move.committedCards) ?
    move.committedCards.reduce((sum,card)=>sum+getBoostValue(card),0) : 0;
}

/** Convalida PRIMA di sottrarre carte alla mano e prima di consumare munizioni. */
export function validateBoostForMove(state,side,placements,choice) {
  if (!choice) return null;
  if (!SIDES.includes(side) || !state.boost?.[side]) throw Error('Boost non disponibile');
  const {cost,operation,cardIds}=choice;
  const spent=spendBoostEnergy(state.boost[side].energy,cost);
  if (!spent.valid) throw Error('Energia Boost insufficiente per la soglia scelta');
  if (!Array.isArray(cardIds) || cardIds.length!==2 || cardIds[0]===cardIds[1]) throw Error('Il Boost richiede due carte diverse della mano');
  const placed=new Set((placements||[]).map(p=>p.card?.id));
  if (cardIds.some(id=>placed.has(id))) throw Error('Le carte Boost devono restare in mano, fuori dal banco');
  const hand=state[side].hand;
  const cards=cardIds.map(id=>hand.find(c=>c.id===id));
  if (cards.some(card=>!card || getBoostValue(card)===0)) throw Error('Carta Boost non disponibile nella mano');
  const target=state.boost[side].target;
  if (!checkBoostCalculation(cards[0],cards[1],operation,target)) throw Error('Calcolo Boost errato: raggiungi il numero obiettivo con due carte');
  return {cost,operation,cardIds:[...cardIds],target,
    bonusPercent:spent.bonusPercent,operatorBonusPercent:MATH_OPERATION_PREVIEW[operation]};
}

/** Proposte non obbligatorie: un click per risolvere, oppure calcolo manuale. */
export function getBoostCalculationSuggestions(hand,placedCardIds,target) {
  const exclude=new Set(placedCardIds||[]), results=[];
  const cards=(hand||[]).filter(card=>!exclude.has(card.id) && getBoostValue(card)>0);
  for(let i=0;i<cards.length;i++) for(let j=0;j<cards.length;j++) {
    if(i===j) continue;
    for(const operation of ['/', '*', '-', '+']) {
      // + e × sono commutative: non mostrare due volte la stessa soluzione.
      if ((operation==='+' || operation==='*') && j<i) continue;
      if(checkBoostCalculation(cards[i],cards[j],operation,target))
        results.push({cardIds:[cards[i].id,cards[j].id],operation,
          operatorBonusPercent:MATH_OPERATION_PREVIEW[operation]});
    }
  }
  return results.sort((a,b)=>b.operatorBonusPercent-a.operatorBonusPercent);
}

/**
 * F4 calcola esattamente una volta HP/munizioni; la F5 aggiunge il solo extra.
 * Idempotente: se richiamata una seconda volta, non accredita né addebita nulla.
 */
export function resolvePhase5Boost(state) {
  if (state.phase!==TURN_PHASES.ANIMATE || !state.result?.volleys || !state.boost || state.result.boostResolved) return state;
  const hp={...state.hp};
  const boost={player:{...state.boost.player},enemy:{...state.boost.enemy}};
  const player={...state.player},enemy={...state.enemy};
  const sides={player,enemy};
  const volleys={...state.result.volleys};
  const winnerSide=state.result.winner==='attacker'?state.result.opener
    :state.result.winner==='responder'?state.result.responder:null;
  const loserSide=winnerSide?other(winnerSide):null;
  const gained={player:0,enemy:0};
  const spent={player:0,enemy:0};
  // Il perdente guadagna SOLO i valori della propria figura Poker impegnata.
  if(loserSide) {
    gained[loserSide]=boostEnergyFromLostMove(state.moves[loserSide]);
    boost[loserSide].energy=clampEnergy(boost[loserSide].energy+gained[loserSide]);
  }
  for(const side of SIDES) {
    const volley=volleys[side];
    const choice=state.moves[side]?.boost;
    const permitted=side===winnerSide && choice && volley?.damagePercent===100 && volley?.shots>0;
    if(!permitted) {
      volleys[side]={...volley,boostApplied:false,boostDamage:0,boostPercent:0,boostEnergySpent:0,
        boostStatus:choice?'NON ATTIVATO: confronto non vinto':'NESSUNO'};
      continue;
    }
    // Riesegue il controllo delle due carte, ancora presenti nella mano dopo la posa.
    const hand=sides[side].hand;
    const cards=choice.cardIds.map(id=>hand.find(card=>card.id===id));
    const valid=cards.every(Boolean) && checkBoostCalculation(cards[0],cards[1],choice.operation,boost[side].target);
    const payment=spendBoostEnergy(boost[side].energy,choice.cost);
    if(!valid || !payment.valid) throw Error('Boost non coerente con lo stato dello scontro');
    boost[side].energy=payment.remaining;
    spent[side]=choice.cost;
    const bonusPercent=payment.bonusPercent+MATH_OPERATION_PREVIEW[choice.operation];
    const extra=Math.round(volley.damage*bonusPercent/100);
    hp[other(side)]=Math.max(0,hp[other(side)]-extra);
    const used=new Set(choice.cardIds);
    sides[side]={...sides[side],hand:hand.filter(card=>!used.has(card.id)),
      discard:[...sides[side].discard,...cards]};
    boost[side].target=nextBoostTarget(boost[side].target,state.round,side);
    volleys[side]={...volley,damage:volley.damage+extra,boostApplied:true,boostDamage:extra,
      boostPercent:bonusPercent,boostOperation:choice.operation,boostEnergySpent:choice.cost,boostStatus:'ATTIVATO'};
  }
  const winner=hp.player<=0 && hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
  return {...state,...sides,boost,hp,winner,
    result:{...state.result,volleys,boostResolved:true,boostEnergyGained:gained,boostEnergySpent:spent},
    history:[...state.history,`Boost: TU +${gained.player} energia / COMPUTER +${gained.enemy}; bonus danni TU +${volleys.player.boostDamage} / COMPUTER +${volleys.enemy.boostDamage}.`].slice(-20)};
}
export function commitPhase5Move(state,side,placements=[],isPass=false,weaponId=null,boostChoice=null) {
  if(isPass && boostChoice) throw Error('Non puoi attivare Boost passando il turno');
  const validChoice=isPass?null:validateBoostForMove(state,side,placements,boostChoice);
  const phase4=commitPhase4Move(state,side,placements,isPass,weaponId);
  const next=validChoice?{...phase4,moves:{...phase4.moves,[side]:{...phase4.moves[side],boost:validChoice}}}:phase4;
  return next.phase===TURN_PHASES.ANIMATE?resolvePhase5Boost(next):next;
}
export const finishPhase5Animation=finishPhase4Animation;
export function getPhase5CandidateMove(state,side,attempts=140) {
  const suggestion=getPhase4CandidateMove(state,side,attempts);
  if(!suggestion || !state.boost?.[side] || state.boost[side].energy<15) return suggestion;
  const excluded=suggestion.placements.map(p=>p.card.id);
  const calculation=getBoostCalculationSuggestions(state[side].hand,excluded,state.boost[side].target)[0];
  const tier=BOOST_LEVELS.filter(level=>level.cost<=state.boost[side].energy).at(-1);
  return calculation && tier ? {...suggestion,boost:{...calculation,cost:tier.cost}} : suggestion;
}
