/**
 * ECLISSI STELLARE — FASE 9
 * AI tattica per il nuovo botta-e-risposta: non legge mano/mazzo avversari,
 * non altera pescate né inventa carte. La decisione è ripetibile a parità di
 * informazioni pubbliche e della propria mano.
 * Valori numerici e difficoltà NON rappresentano il bilanciamento finale.
 */
import { MAX_PLACED_CARDS_PER_ACTION, TURN_PHASES, BOOST_LEVELS } from './config.js';
import { comparePokerScores } from './pokerRules.js';
import { getPhase4MoveOptions } from './phase4Engine.js';
import { getBoostCalculationSuggestions } from './phase5Engine.js';
import { normalizePokerRank, normalizePokerSuit } from './pokerRules.js';
import {getPhase17BlockedSlots} from './phase17Anomalies.js';
import { exchangePhase6Cards, extractPhase6WithEther, markPhase6Ready,
  PHASE6_ETHER_COST } from './phase6Engine.js';

const SIDES = ['player', 'enemy'];
const other = side => side === 'player' ? 'enemy' : 'player';
const checkSide = side => { if (!SIDES.includes(side)) throw Error('Parte non valida'); };
const choose = (items, count, start = 0, picked = [], out = []) => {
  if (picked.length === count) { out.push([...picked]); return out; }
  for (let i=start; i<=items.length-(count-picked.length); i++) {
    picked.push(items[i]); choose(items,count,i+1,picked,out); picked.pop();
  }
  return out;
};
const permute = (items, used = [], out = []) => {
  if (!items.length) { out.push(used); return out; }
  for (let i=0;i<items.length;i++) permute(items.filter((_,j)=>j!==i),[...used,items[i]],out);
  return out;
};
const cardStrength = card => normalizePokerRank(card) || 0;
const strengthOfHand = hand => {
  const count = new Map(), suits = new Map();
  for(const card of hand) {
    const v=cardStrength(card), s=normalizePokerSuit(card?.suit);
    if(v) count.set(v,(count.get(v)||0)+1);
    if(s) suits.set(s,(suits.get(s)||0)+1);
  }
  return [...count.values()].reduce((n,v)=>n+v*v,0)*2
    +[...suits.values()].reduce((n,v)=>n+Math.max(0,v-2),0)
    +[...count.keys()].reduce((n,v)=>n+([...count.keys()].includes(v+1)?1:0),0);
};
const getPublicOpponentScore = (state,side) => state.moves?.[other(side)]?.score || null;

/**
 * Ricerca limitata (browser/mobile): prova combinazioni di carte vere e
 * posizionamenti ammissibili. Nessun sort casuale, nessuna lettura futura.
 */
export function getPhase9CandidateMoves(state,side='enemy',{maxEvaluations=2400}={}) {
  checkSide(side);
  if (![TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(state.phase) || state.actor!==side) return [];
  const hand=state[side]?.hand || [];
  const blocked=getPhase17BlockedSlots(state);
  const empties=state.board.map((c,i)=>c==null&&!blocked.includes(i)?i:-1).filter(i=>i>=0);
  const occupied=state.board.map((c,i)=>c!=null&&!blocked.includes(i)?i:-1).filter(i=>i>=0);
  const required=Math.min(empties.length,hand.length,MAX_PLACED_CARDS_PER_ACTION);
  const maxCards=Math.min(MAX_PLACED_CARDS_PER_ACTION,hand.length);
  if(!maxCards) return [];
  const results=[];
  const counts=Array.from({length:maxCards-Math.max(1,required)+1},(_,i)=>Math.max(1,required)+i);
  const budgetPerCount=Math.max(1,Math.floor(Math.max(1,maxEvaluations)/counts.length));
  // Ogni quantità di carte riceve un budget proprio: a banco pieno un
  // tris o una coppia NON può impedire di valutare anche il Poker da 4.
  for(const count of counts) {
    let checked=0;
    const replaceCount=count-required;
    const groups=choose(hand,count).sort((a,b)=>strengthOfHand(b)-strengthOfHand(a));
    // F17M — Budget su combinazioni DISTINTE, non sulle 24 permutazioni
    // della prima quaterna. Ogni gruppo di carte viene esaminato almeno
    // una volta prima dei riordini sul banco; nessuna carta viene inventata.
    const placementsToTry=[];
    for(const replaceSlots of choose(occupied,replaceCount)) {
      const slots=[...empties.slice(0,required),...replaceSlots];
      for(const selected of groups) placementsToTry.push({slots,selected});
    }
    // Prima esploriamo più mani diverse: la vecchia ricerca consumava il
    // budget su permutazioni equivalenti e perdeva Scale/Colori da quattro.
    const explorationBudget=Math.max(1,Math.ceil(budgetPerCount*0.85));
    for(const {slots,selected} of placementsToTry) {
      if(checked>=explorationBudget) break;
      checked++;
      const placements=slots.map((slot,i)=>({slot,card:selected[i]}));
      const options=getPhase4MoveOptions(state,side,placements);
      for(const option of options) if(option.canFire)
        results.push({placements,weaponId:option.weaponId,choice:option});
    }
    // Le permutazioni contano per alcune interazioni del banco (Bomba,
    // carte sigillate). Impieghiamo il budget residuo solo dopo la copertura.
    if(checked<budgetPerCount) {
      outer: for(const {slots,selected} of placementsToTry) {
        for(const arranged of permute(selected)) {
          if(arranged.every((card,i)=>card===selected[i]))continue;
          if(checked++>=budgetPerCount)break outer;
          const placements=slots.map((slot,i)=>({slot,card:arranged[i]}));
          const options=getPhase4MoveOptions(state,side,placements);
          for(const option of options)if(option.canFire)
            results.push({placements,weaponId:option.weaponId,choice:option});
        }
      }
    }
  }
  return results;
}

/** Score primo: superiorità della combinazione. Se siamo in risposta,
 * preferisce vincere sul colpo visibile, poi non spreca carte / munizioni.
 * Il Poker resta prioritario rispetto al danno, come stabilito dall'utente. */
export function evaluatePhase9Candidate(state,side,candidate) {
  checkSide(side);
  const {score,potentialDamage,fullShots,availableAmmo}=candidate.choice;
  const opponentScore=getPublicOpponentScore(state,side);
  const response=state.phase===TURN_PHASES.RESPONSE;
  const outcome=response?comparePokerScores(score,opponentScore):0;
  const winClass=response?(outcome>0?2:outcome===0?1:0):1;
  // Conservare carte utili e non giocare oltre il necessario a parità di rango.
  const after=state[side].hand.filter(c=>!candidate.placements.some(p=>p.card.id===c.id));
  return {winClass,score,damage:potentialDamage,handPotential:strengthOfHand(after),
    cardsUsed:candidate.placements.length,shots:fullShots,ammo:availableAmmo};
}
export function comparePhase9Candidates(a,b,state,side) {
  const x=evaluatePhase9Candidate(state,side,a), y=evaluatePhase9Candidate(state,side,b);
  if(x.winClass!==y.winClass) return x.winClass-y.winClass;
  // Quando possiamo vincere o apriamo il duello, la figura Poker è la priorità.
  const poker=comparePokerScores(x.score,y.score);
  if(poker) return poker;
  if(x.damage!==y.damage) return x.damage-y.damage;
  if(x.handPotential!==y.handPotential) return x.handPotential-y.handPotential;
  if(x.cardsUsed!==y.cardsUsed) return y.cardsUsed-x.cardsUsed;
  return x.ammo-y.ammo;
}
export function planPhase9Attack(state,side='enemy',config={}) {
  checkSide(side);
  const candidates=getPhase9CandidateMoves(state,side,config);
  if(!candidates.length) return null;
  let best=candidates[0];
  for(let i=1;i<candidates.length;i++) if(comparePhase9Candidates(candidates[i],best,state,side)>0) best=candidates[i];
  const result={placements:best.placements,weaponId:best.weaponId,choice:best.choice};
  const energy=state.boost?.[side]?.energy||0;
  if(energy<15) return result;
  const responding=state.phase===TURN_PHASES.RESPONSE;
  const beatsOpponent=comparePokerScores(best.choice.score,getPublicOpponentScore(state,side))>0;
  // Non impegnare Boost per una risposta già persa/pareggiata. In apertura,
  // impiegarlo soltanto da 30 punti, o per una possibile chiusura immediata.
  const opponentHp=state.hp?.[other(side)]??Infinity;
  const worthwhile=responding?beatsOpponent:
    (energy>=30 && best.choice.score.tier>=30) || best.choice.potentialDamage>=opponentHp;
  if(!worthwhile) return result;
  const excluded=new Set(best.placements.map(p=>p.card.id));
  const proposals=getBoostCalculationSuggestions(state[side].hand,[...excluded],state.boost[side].target);
  const bestCalc=proposals[0];
  if(!bestCalc) return result;
  const tier=BOOST_LEVELS.filter(t=>t.cost<=energy).at(-1);
  if(!tier) return result;
  return {...result,boost:{...bestCalc,cost:tier.cost}};
}

/** Piano di preparazione che vede solo le carte della propria mano; la pesca
 * resta casuale. Il mazzo è interrogato ESCLUSIVAMENTE per l'Etere. */
export function planPhase9Preparation(state,side='enemy') {
  checkSide(side);
  if(state.phase!==TURN_PHASES.PREPARE || state.ready?.[side]) return {swap:[],ether:null};
  const p=state[side];
  const ranks=p.hand.map(cardStrength), frequencies=new Map();
  for(const v of ranks) frequencies.set(v,(frequencies.get(v)||0)+1);
  const isolated=p.hand.map((card,index)=>({index,v:cardStrength(card),suit:normalizePokerSuit(card?.suit)}))
    .filter(c=>c.v && frequencies.get(c.v)===1 && !ranks.some(v=>v!==c.v && Math.abs(v-c.v)===1))
    .sort((a,b)=>a.v-b.v);
  // Evita il costo delle sostituzioni se i punti vita sono bassi o la mano è
  // già coerente: per la casualità dei rimpiazzi, nessuna garanzia di profitto.
  const hp=state.hp?.[side]??0;
  // Antistallo: quando ENTRAMBI hanno passato, insistere con la stessa mano
  // causa un ciclo infinito. Il cambio resta una scelta strategica e paga
  // tutte le normali penalità: nessuna carta regalata e nessun bypass del mazzo.
  // Conserviamo le coppie esistenti e cambiamo un singleton, se possibile.
  const bothPassed=state.result?.damagePercent?.every(pct=>pct===0) === true;
  const isolatedIndex=isolated[0]?.index;
  const rankCounts=frequencies;
  const fallbackIndex=p.hand.findIndex(c=>rankCounts.get(cardStrength(c))===1);
  const indexToChange=isolatedIndex??fallbackIndex;
  const wantsSwap=isolated.length>=2 || bothPassed;
  const swap=hp>12 && p.exchangesLeft>0 && p.deck.length>0 && wantsSwap && indexToChange>=0 ? [indexToChange] : [];
  let ether=null;
  if(p.ether>=PHASE6_ETHER_COST && p.deck.length && p.hand.length) {
    const counts=[...frequencies.entries()].filter(([v,n])=>v>0&&n>=2).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    for(const [rank] of counts) {
      const deckIndex=p.deck.findIndex(c=>cardStrength(c)===rank);
      if(deckIndex<0) continue;
      const handIndex=p.hand.findIndex(c=>cardStrength(c)!==rank && frequencies.get(cardStrength(c))===1);
      if(handIndex>=0) {ether={handIndex,deckIndex,cost:PHASE6_ETHER_COST};break;}
    }
  }
  return {swap,ether};
}
export function executePhase9Preparation(state,side='enemy') {
  checkSide(side);
  if(state.phase!==TURN_PHASES.PREPARE || state.ready[side]) return state;
  let next=state;
  // Massimo due cambi già previsti dal motore; la scelta viene rivalutata dopo
  // ogni pescata, senza leggere il mazzo per prevederne l'esito.
  for(let attempt=0;attempt<2;attempt++) {
    const plan=planPhase9Preparation(next,side);
    if(!plan.swap.length) break;
    next=exchangePhase6Cards(next,side,plan.swap);
  }
  const plan=planPhase9Preparation(next,side);
  if(plan.ether) next=extractPhase6WithEther(next,side,plan.ether.handIndex,plan.ether.deckIndex,plan.ether.cost);
  return next.phase===TURN_PHASES.PREPARE?markPhase6Ready(next,side):next;
}
