/** FASE 16C — i sei Epici PASSIVI della campagna Poker.
 * Non modifica gli inventari storici: usa soltanto le reliquie già fuse ed equipaggiate.
 * Le soglie numeriche sono provvisorie per il bilanciamento della fase 17.
 */
import { TURN_PHASES, POKER_PATTERNS } from './config.js';
import { getWeaponDefinition } from './weaponCatalog.js';
import { evaluateExactPokerPattern, normalizePokerRank, normalizePokerSuit, isPokerJoker } from './pokerRules.js';
import { comparePokerScores } from './pokerRules.js';
import { DICE_FACES, activatePhase16BDice } from './phase16BCombat.js';

export const PHASE16C_EPICS=Object.freeze({
  'epic_item_1':'Anello Bifasico di Möbius',
  'epic_item_6':'Pendolo d’Entropia',
  'epic_item_7':'Monolite Dielettrico',
  'epic_item_8':'Calice di Drenaggio',
  'epic_item_9':'Matrice di Probabilità',
  'epic_item_3':'Astrolabio a Coordinate Libere',
});
const ITEMS=Object.keys(PHASE16C_EPICS);
const CLASSES=['light','medium','heavy'];
const OPPOSITE=s=>s==='player'?'enemy':'player';
const append=(state,text)=>({...state,history:[...state.history,text].slice(-20)});
export const hasPhase16CEpic=(s,id)=>Boolean(s.phase16C?.equipped?.includes(id));
const hpLow=state=>state.hp.player<=state.initialHp.player*0.30;
const coolHeat=()=>({light:0,medium:0,heavy:0});
export const PHASE16C_HEAT_LIMIT=100;
export const PHASE16C_HEAT_PER_SHOT=Object.freeze({light:40,medium:50,heavy:65});
const normalizeRank=card=>normalizePokerRank(card)||0;
const rankDescending=(a,b)=>((normalizeRank(b)===1?14:normalizeRank(b))-(normalizeRank(a)===1?14:normalizeRank(a)));
const availableCardIds=cards=>new Set(cards.map(c=>c.id));
const SUITS=['hearts','diamonds','clubs','spades'];

/** Produce candidati strategici reali, senza enumerare milioni di combinazioni. */
export function analyzePhase16CMobius(state){
  const hand=state.player.hand||[],deck=state.player.deck||[];
  const pool=[...hand,...deck], byRank=new Map(), bySuit=new Map(SUITS.map(s=>[s,[]]));
  const jokers=[];
  for(const card of pool){
    if(isPokerJoker(card)){jokers.push(card);continue;}
    const r=normalizeRank(card),s=normalizePokerSuit(card.suit);
    if(!r)continue;
    if(!byRank.has(r))byRank.set(r,[]);
    byRank.get(r).push(card);
    if(bySuit.has(s))bySuit.get(s).push(card);
  }
  const rows=[...byRank.entries()].sort((a,b)=>(b[0]===1?14:b[0])-(a[0]===1?14:a[0]));
  for(const arr of bySuit.values())arr.sort(rankDescending);
  for(const arr of byRank.values())arr.sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit));
  let best=null;
  const patterns=[...new Set(CLASSES.flatMap(wc=>getWeaponDefinition(state.arsenal?.player?.[wc])?.allowedPokerPatterns||[]))]
    .filter(id=>POKER_PATTERNS.some(p=>p.id===id && p.count<=4));
  const tryOffer=(target,patternId)=>{
    if(!target?.length)return;
    const score=evaluateExactPokerPattern(target,patternId);
    if(!score)return;
    const waiting=target.filter(c=>!hand.some(h=>h.id===c.id));
    if(waiting.length>10) return;
    // Preferire la combinazione migliore, poi quella che richiede meno pescate.
    if(!best||comparePokerScores(score,best.score)>0||
       (comparePokerScores(score,best.score)===0&&waiting.length<best.missing.length))
      best={score,cards:target,missing:waiting,already:target.filter(c=>hand.some(h=>h.id===c.id))};
  };
  const takeRank=(rank,count,fromSuit=null)=>{
    const own=(fromSuit?bySuit.get(fromSuit)?.filter(c=>normalizeRank(c)===rank):byRank.get(rank))||[];
    return [...own.slice(0,count),...jokers.slice(0,Math.max(0,count-own.length))].slice(0,count);
  };
  for(const patternId of patterns){
    const size=POKER_PATTERNS.find(x=>x.id===patternId).count;
    if(['one_pair','three_of_a_kind','four_of_a_kind'].includes(patternId)){
      for(const [rank] of rows){const picked=takeRank(rank,size);if(picked.length===size)tryOffer(picked,patternId);}
    }else if(patternId==='two_pair'){
      for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
        const a=byRank.get(rows[i][0])||[],b=byRank.get(rows[j][0])||[];
        const c=[...a.slice(0,2),...b.slice(0,2)];
        if(c.length===4)tryOffer(c,patternId);
        else if(c.length+jokers.length>=4)tryOffer([...c,...jokers.slice(0,4-c.length)],patternId);
      }
    }else if(patternId==='flush_4'){
      for(const cards of bySuit.values()){
        const picked=[...cards.slice(0,size),...jokers.slice(0,Math.max(0,size-cards.length))].slice(0,size);
        if(picked.length===size)tryOffer(picked,patternId);
      }
    }else if(['straight_4','straight_flush_4'].includes(patternId)){
      const suited=patternId==='straight_flush_4';
      for(const suit of (suited?SUITS:[null]))for(let start=11;start>=1;start--){
        const selected=[],used=new Set();
        for(let r=start;r<start+size;r++){
          const normal=r===14?1:r;
          const poolForRank=suited?bySuit.get(suit)?.filter(c=>normalizeRank(c)===normal):byRank.get(normal);
          const card=poolForRank?.find(c=>!used.has(c.id));
          if(card){selected.push(card);used.add(card.id);}else{
            const joker=jokers.find(c=>!used.has(c.id));
            if(joker){selected.push(joker);used.add(joker.id);}else break;
          }
        }
        if(selected.length===size)tryOffer(selected,patternId);
      }
    }
  }
  return best;
}
/** Porta le carte mancanti nelle dieci pescate (posizioni 1,3,5,7). */
export function arrangePhase16CMobiusDeck(deck,missing){
  const ids=new Set(missing.map(c=>c.id));
  const chosen=missing.map(c=>deck.find(d=>d.id===c.id)).filter(Boolean);
  const remaining=deck.filter(c=>!ids.has(c.id));
  const count=Math.min(10,deck.length),positions=[0,2,4,6,8,1,3,5,7,9].slice(0,chosen.length);
  const positionsSet=new Set(positions);const reordered=[],rest=[...remaining];let index=0;
  for(let i=0;i<deck.length;i++) reordered.push(positionsSet.has(i)?chosen[index++]:rest.shift());
  return reordered;
}
export function initializePhase16C(state){
  if(state.phase16C)return state;
  const equipped=(state.legacyPassives?.loadout?.epics||[]).map(x=>x.id).filter(id=>ITEMS.includes(id));
  return {...state,phase16C:{equipped,mobius:{used:false,announcement:null},
    pendulum:{pending:false,active:false,visibleCards:[]},matrix:{available:false,used:false},
    diceOffer:null,heat:{player:coolHeat(),enemy:coolHeat()},lastResolvedRound:0,
    dustDamageRemainder:0,notice:null}};
}
export function getPhase16CHeat(state,side,weaponClass){
  if(side==='player'&&hasPhase16CEpic(state,'epic_item_7'))return 0;
  return state.phase16C?.heat?.[side]?.[weaponClass]||0;
}
export function getPhase16CWeaponAdaptation(state,side,weaponClass,weapon){
  return side==='player'&&weaponClass==='heavy'&&state.phase16C?.matrix.available&&!state.phase16C?.matrix.used
    ? [...new Set([...(weapon?.allowedPokerPatterns||[]),'one_pair','three_of_a_kind'])] : null;
}
export function consumePhase16CMatrix(state,side,option){
  if(side!=='player'||!state.phase16C?.matrix.available||!option||option.weaponClass!=='heavy'||!
      ['one_pair','three_of_a_kind'].includes(state.moves?.player?.score?.patternId))return state;
  const weapon=getWeaponDefinition(option.weaponId);
  if(weapon?.allowedPokerPatterns.includes(state.moves.player.score.patternId))return state; // si consuma solo se necessaria
  return append({...state,phase16C:{...state.phase16C,matrix:{available:false,used:true},notice:'MATRICE: arma Pesante attivata con combinazione inferiore'}},'MATRICE DI PROBABILITÀ: adattamento consumato (un solo utilizzo per battaglia).');
}
/** Idempotente: richiesto una sola volta per scambio, DOPO Bomba/Dorata/Malus. */
export function resolvePhase16CExchange(state){
  if(!state.phase16C||state.phase!==TURN_PHASES.ANIMATE||!state.result?.volleys||state.phase16C.lastResolvedRound===state.round)return state;
  let phase={...state.phase16C}, next=state;
  const heat={player:{...phase.heat.player},enemy:{...phase.heat.enemy}};
  for(const side of ['player','enemy']){
    const volley=state.result.volleys[side];
    const weapon=getWeaponDefinition(volley?.weaponId);
    for(const wc of CLASSES)heat[side][wc]=Math.max(0,heat[side][wc]-20);
    if(weapon?.weaponClass&&volley.shots>0){
      if(side==='player'&&hasPhase16CEpic(state,'epic_item_7'))heat[side][weapon.weaponClass]=0;
      else heat[side][weapon.weaponClass]+=PHASE16C_HEAT_PER_SHOT[weapon.weaponClass];
    }
  }
  phase.heat=heat;
  if(hasPhase16CEpic(state,'epic_item_8')){
    const damage=(Math.max(0,state.result.volleys.player?.damage||0)+Math.max(0,state.result.volleys.enemy?.damage||0));
    const total=(phase.dustDamageRemainder||0)+damage,award=Math.floor(total/10);
    phase.dustDamageRemainder=total%10;
    if(award){next={...next,phase16B:{...next.phase16B,earnings:{...next.phase16B.earnings,dust:next.phase16B.earnings.dust+award}}};}
  }
  if(hasPhase16CEpic(state,'epic_item_6')&&state.result.volleys.enemy?.damage>0)
    phase.pendulum={...phase.pendulum,pending:true};
  phase.lastResolvedRound=state.round;
  return {...next,phase16C:phase};
}
/** Invocato al vero ingresso in preparazione, non per ciascun rerender React. */
export function beginPhase16CPreparation(state){
  if(!state.phase16C||state.phase!==TURN_PHASES.PREPARE)return state;
  let next=state,phase={...state.phase16C};
  if(hasPhase16CEpic(state,'epic_item_6')){
    phase.pendulum={pending:false,active:Boolean(phase.pendulum.pending),visibleCards:phase.pendulum.pending?state.player.deck.slice(0,6):[]};
  }
  if(hasPhase16CEpic(state,'epic_item_9')&&!phase.matrix.used&&!phase.matrix.available&&hpLow(state)){
    phase.matrix={available:true,used:false};phase.notice='MATRICE ATTIVA: Pesante utilizzabile una volta con Coppia o Tris';
  }
  if(hasPhase16CEpic(state,'epic_item_1')&&!phase.mobius.used&&hpLow(state)){
    const best=analyzePhase16CMobius(state);
    const message=best?{pattern:best.score.label,cards:best.cards.map(c=>({id:c.id,value:c.value,suit:c.suit,isJoker:c.isJoker})),
      already:best.already.length,missing:best.missing.length}
      :{pattern:'Nessuna combinazione compatibile disponibile',cards:[],already:0,missing:0};
    next={...next,player:{...state.player,deck:best?arrangePhase16CMobiusDeck(state.player.deck,best.missing):state.player.deck}};
    phase.mobius={used:true,announcement:message};phase.notice=`ANELLO DI MÖBIUS: ${message.pattern}`;
  }
  if(phase.pendulum.active)phase.pendulum.visibleCards=next.player.deck.slice(0,6);
  return {...next,phase16C:phase};
}
export function clearPhase16CPendulum(state){
  if(!state.phase16C)return state;
  return {...state,phase16C:{...state.phase16C,pendulum:{...state.phase16C.pendulum,active:false,visibleCards:[]}}};
}
/** Astrolabio: un lancio -> due facce reali -> scelta libera, nessun lancio aggiuntivo gratuito. */
export function offerPhase16CDice(state,random=Math.random){
  if(!hasPhase16CEpic(state,'epic_item_3')||!state.phase16B?.player?.diceReady||state.phase!==TURN_PHASES.PREPARE||state.ready.player)
    throw Error('Astrolabio non disponibile');
  if(state.phase16C.diceOffer)return state;
  const a=Math.min(5,Math.floor(random()*6)),roll=Math.min(5,Math.floor(random()*6));
  // Assicurare due opzioni realmente differenti: l'Epico deve offrire una scelta.
  const b=roll===a ? (a+1+Math.floor(random()*5))%6 : roll;
  return {...state,phase16C:{...state.phase16C,diceOffer:[a,b]}};
}
export function selectPhase16CDice(state,index){
  const offer=state.phase16C?.diceOffer;
  if(!offer||!Number.isInteger(index)||index<0||index>1)throw Error('Scegli una delle due facce offerte');
  const next=activatePhase16BDice(state,'player',offer[index]);
  return {...next,phase16C:{...next.phase16C,diceOffer:null}};
}
export function isPhase16CPendulumFree(state,side){return side==='player'&&Boolean(state.phase16C?.pendulum?.active);}
export const PHASE16C_DICE_LABELS=Object.freeze(Object.fromEntries(DICE_FACES.map((k,i)=>[i,k])));
