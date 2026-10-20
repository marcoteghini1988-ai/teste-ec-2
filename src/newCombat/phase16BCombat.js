/**
 * FASE 16B — eventi tattici della campagna Poker.
 * Solo carte esistenti, stessi 5 slot e stesse salve F4; nessuna ricompensa
 * persistente fuori dal normale punto di accredito dell'App.
 * Valori numerici provvisori, in attesa del bilanciamento della Fase 17.
 */
import { TURN_PHASES } from './config.js';
import {resolvePhase16CExchange,beginPhase16CPreparation,consumePhase16CMatrix,hasPhase16CEpic} from './phase16CEpics.js';
import {applyPhase16EHandGuard,applyPhase16ERevival} from './phase16EDecks.js';
import {resolvePhase16FExchange,applyPhase16FDiceCharge,trackPhase16FPreparation} from './phase16FModules.js';
import { getWeaponDefinition } from './weaponCatalog.js';
import {getPhase17BlockedSlots} from './phase17Anomalies.js';
import { normalizePokerSuit } from './pokerRules.js';
import { commitPhase13Move, finishPhase13Animation, exchangePhase13Cards } from './phase13Campaign.js';
import { markPhase15Ready } from './phase15LegacyPassives.js';

const OPPOSITE = side => side==='player'?'enemy':'player';
const SIDES=['player','enemy'];
const CLASS=['light','medium','heavy'];
const SUITS=['hearts','diamonds','clubs','spades'];
const LIMIT=20;
export const MALUS_EFFECTS=Object.freeze([
  {id:'direct_hit',name:'Colpo diretto'},
  {id:'lock_weapon',name:'Arma bloccata'},
  {id:'smaller_hand',name:'Mano ridotta'},
  {id:'skip_prepare',name:'Salta preparazione'},
  {id:'ammo_leak',name:'Perdita munizioni'},
  {id:'boost_jam',name:'Interferenza Boost'},
  {id:'spy_hand',name:'Spionaggio'},
  {id:'shuffle_hand',name:'Mano disturbata'},
  {id:'weak_shield',name:'Scudi compromessi'},
  {id:'overheat',name:'Surriscaldamento forzato'},
  {id:'boost_drain',name:'Furto energetico'},
  {id:'reveal_weapon',name:'Arma scoperta'}
]);
const log=(state,message)=>({...state,history:[...state.history,message].slice(-LIMIT)});
const cap=(n,max)=>Math.max(0,Math.min(max,Math.floor(Number(n)||0)));
const newSide=()=>({dicePatterns:[],diceReady:false,malusCharge:0,malusChoices:[],usedMalus:[],skipNextPreparation:false,skipProtection:false,handLimit:0,boostBlocked:0,lockedWeapon:null,attackWeakened:0,weakShield:0,spying:null,weaponRevealed:false,preparationSkips:0,moduleCharge:0});
const groupPattern=pattern=>String(pattern||'').replace(/_[45]$/,'');
const nextOptions=(used,offset)=>{
  const eligible=MALUS_EFFECTS.filter(e=>!used.includes(e.id));
  if(!eligible.length)return [];
  // Campionamento senza rimpiazzo: tre opzioni ogni volta che la barra si riempie.
  for(let i=eligible.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [eligible[i],eligible[j]]=[eligible[j],eligible[i]];
  }
  return eligible.slice(0,3).map(e=>e.id);
};
const cardSuits=cards=>new Set(cards.filter(card=>!card?.isJoker && card?.suit!=='joker').map(c=>normalizePokerSuit(c?.suit)).filter(s=>SUITS.includes(s)));
export function initializePhase16B(state) {
  if(state.phase16B)return state;
  const phase16B={player:newSide(),enemy:newSide(),bomb:{onBoard:null,inTank:null,lastSpawnRound:0},
    earnings:{dust:0,diamonds:0,credits:0},events:[],lastResolvedRound:0,usedGoldIds:[]};
  return (state.campaignEnvironment?.globalSector||0)>=6
    ? grantGoldenCard({...state,phase16B},'player',true)
    : {...state,phase16B};
}
export function grantGoldenCard(state,side='player',force=false){
  if(!state.phase16B || state.phase!==TURN_PHASES.ATTACK || (state.campaignEnvironment?.globalSector||0)<6 || (!force && state.round%3!==1))return state;
  const p=state[side];
  if(!p?.hand?.length || p.hand.some(c=>c.isGolden))return state;
  const index=(state.round+Math.floor((state.campaignEnvironment?.globalSector||0)/3))%p.hand.length;
  return {...state,[side]:{...p,hand:p.hand.map((c,i)=>i===index?{...c,isGolden:true,goldenExpiresRound:state.round+1}:c)}};
}
export function getBombMarkOnCard(state,card){return Boolean(card && state.phase16B?.bomb?.onBoard?.cardId===card.id);}
export function getPhase16BMalusChoices(state,side='player'){return state.phase16B?.[side]?.malusChoices||[];}

// L'IA decide autonomamente il serbatoio. Il giocatore lo sceglie nella UI.
export function commitPhase16BMove(state,side,placements=[],isPass=false,weaponId=null,boost=null,bombTargetClass='medium') {
  if(!state.phase16B)return commitPhase13Move(state,side,placements,isPass,weaponId,boost);
  if(!SIDES.includes(side))throw Error('Giocatore non valido');
  const status=state.phase16B[side],weapon=getWeaponDefinition(weaponId);
  if(!isPass && status.lockedWeapon===weapon?.weaponClass)throw Error('L’arma selezionata è bloccata dal Malus');
  if(!isPass && status.boostBlocked>0 && boost)throw Error('Boost temporaneamente bloccato dal Malus');
  if(!CLASS.includes(bombTargetClass))throw Error('Serbatoio Bomba non valido');
  const oldMarker=state.phase16B.bomb.onBoard;
  const next=commitPhase13Move(state,side,placements,isPass,weaponId,boost);
  const moved=next.moves[side];
  const statusNext={...status, dicePatterns:[...status.dicePatterns]};
  if(moved?.score){
    const category=groupPattern(moved.score.patternId);
    if(!statusNext.diceReady&&!statusNext.dicePatterns.includes(category))statusNext.dicePatterns.push(category);
    if(statusNext.dicePatterns.length>=3)statusNext.diceReady=true;
  }
  const resolver=next.phase===TURN_PHASES.ANIMATE&&next.result?.winner==='responder'&&next.result.responder===side;
  if(resolver){
    statusNext.malusCharge=Math.min(3,statusNext.malusCharge+1);
    if(statusNext.malusCharge>=3&&!statusNext.malusChoices.length){
      statusNext.malusChoices=nextOptions(statusNext.usedMalus,next.round+statusNext.usedMalus.length);
    }
  }
  let bomb={...state.phase16B.bomb};
  if(oldMarker && moved?.committedCards?.some(c=>c.id===oldMarker.cardId)){
    bomb={...bomb,onBoard:null,inTank:{sender:side,receiver:OPPOSITE(side),weaponClass:bombTargetClass,turnsLeft:3,hit:null}};
  }
  if(bomb.inTank?.receiver===side && bomb.inTank.hit===null){
    if(!isPass&&moved?.score&&weapon?.weaponClass===bomb.inTank.weaponClass)
      bomb.inTank={...bomb.inTank,hit:'returned'};
    else {
      bomb.inTank={...bomb.inTank,turnsLeft:bomb.inTank.turnsLeft-1};
      if(bomb.inTank.turnsLeft<=0)bomb.inTank={...bomb.inTank,hit:'expired'};
    }
  }
  if(statusNext.boostBlocked>0)statusNext.boostBlocked-=1;
  if(statusNext.lockedWeapon)statusNext.lockedWeapon=null;
  const phase16B={...state.phase16B,[side]:statusNext,bomb};
  const output=consumePhase16CMatrix({...next,phase16B},side,weapon?{weaponId:weapon.id,weaponClass:weapon.weaponClass}:null);
  return output.phase===TURN_PHASES.ANIMATE?resolvePhase16BExchange(output):output;
}
export function resolvePhase16BExchange(state){
  if(!state.phase16B || state.phase!==TURN_PHASES.ANIMATE || state.phase16B.lastResolvedRound===state.round)return state;
  const old=state.phase16B, hp={...state.hp},earnings={...old.earnings};
  const usedGoldIds=[...old.usedGoldIds];
  const status={player:{...old.player},enemy:{...old.enemy}};
  let bomb={...old.bomb},events=[];
  for(const side of SIDES){
    const cards=state.moves[side]?.committedCards||[];
    if(!state.moves[side]?.score)continue;
    const golden=cards.find(c=>c.isGolden&&!usedGoldIds.includes(c.id));
    if(golden){
      usedGoldIds.push(golden.id);
      const suit=normalizePokerSuit(golden.suit);
      if(suit==='hearts'){
        const amount=Math.min(Math.round((state.initialHp[side]||100)*0.16),state.initialHp[side]-hp[side]);
        hp[side]+=amount;events.push(`${side}: Carta Dorata ♥ +${amount} HP`);
      }else if(suit==='diamonds'){
        if(side==='player')earnings.dust+=20;
        events.push(`${side}: Carta Dorata ♦ +20 Polvere`);
      }else if(suit==='clubs'){
        if(side==='player')earnings.credits+=15;
        events.push(`${side}: Carta Dorata ♣ +15 crediti`);
      }else if(suit==='spades'){
        hp[OPPOSITE(side)]=Math.max(0,hp[OPPOSITE(side)]-8);
        events.push(`${side}: Carta Dorata ♠ 8 danni puri`);
      }
    }
    if(cardSuits(cards).size===4 && ['straight_4','straight_5','four_of_a_kind'].includes(state.moves[side]?.score?.patternId)){
      const diamonds=golden?2:1;
      if(side==='player')earnings.diamonds+=diamonds;
      events.push(`${side}: combinazione quattro semi +${diamonds} Diamant${diamonds===1?'e':'i'}`);
    }
  }
  if(bomb.inTank?.hit){
    const b=bomb.inTank, damage={light:8,medium:14,heavy:22}[b.weaponClass];
    const victim=b.hit==='returned'?b.sender:b.receiver;
    hp[victim]=Math.max(0,hp[victim]-damage);
    events.push(`BOMBA ${b.hit==='returned'?'RESPINTA':'ESPLOSA'}: ${victim} perde ${damage} HP`);
    bomb.inTank=null;
  }
  if(bomb.onBoard){
    if(!state.board.some(c=>c?.id===bomb.onBoard.cardId)){
      // Sostituire la carta senza formare la combinazione NON neutralizza la Bomba.
      hp.player=Math.max(0,hp.player-9);hp.enemy=Math.max(0,hp.enemy-9);
      events.push('BOMBA SUL BANCO: carta eliminata senza disinnesco, −9 HP a entrambi');
      bomb.onBoard=null;
    }
    else if(bomb.onBoard.spawnRound<state.round){
      bomb.onBoard={...bomb.onBoard,turnsLeft:bomb.onBoard.turnsLeft-1};
      if(bomb.onBoard.turnsLeft<=0){
        hp.player=Math.max(0,hp.player-9);hp.enemy=Math.max(0,hp.enemy-9);
        events.push('BOMBA SUL BANCO: entrambi subiscono 9 danni');bomb.onBoard=null;
      }
    }
  }
  if(!bomb.onBoard&&!bomb.inTank && state.round>=2 && state.round-bomb.lastSpawnRound>=2){
    const sealed=getPhase17BlockedSlots(state);
    const available=state.board.filter((card,index)=>Boolean(card)&&!sealed.includes(index));
    if(available.length){const card=available[state.round%available.length];bomb.onBoard={cardId:card.id,turnsLeft:3,spawnRound:state.round};bomb.lastSpawnRound=state.round;events.push('BOMBA comparsa su una carta del banco');}
  }
  for(const side of SIDES){
    if(status[side].weakShield>0 && state.result?.volleys?.[OPPOSITE(side)]?.damage>0){
      hp[side]=Math.max(0,hp[side]-4);status[side].weakShield=0;
      events.push(`${side}: scudi compromessi, −4 HP`);
    }
    if(status[side].attackWeakened>0 && state.result?.volleys?.[side]?.damage>0){
      const reduced=Math.min(4,state.result.volleys[side].damage);
      hp[OPPOSITE(side)]=Math.min(state.initialHp[OPPOSITE(side)],hp[OPPOSITE(side)]+reduced);
      status[side].attackWeakened=0;
      events.push(`${side}: surriscaldamento ha ridotto la salva di ${reduced} HP`);
    }
  }
  const winner=hp.player===0&&hp.enemy===0?'draw':hp.player===0?'enemy':hp.enemy===0?'player':null;
  return resolvePhase16FExchange(applyPhase16ERevival(resolvePhase16CExchange({...state,hp,winner,phase16B:{...old,...status,bomb,earnings,usedGoldIds,lastResolvedRound:state.round,events},
    history:[...state.history,...events].slice(-LIMIT)})));
}

/** La barra è piena dopo tre risposte Poker vincenti (soglia provvisoria). */
export function activatePhase16BMalus(state,side,id){
  if(!state.phase16B || state.phase!==TURN_PHASES.PREPARE||state.ready[side])throw Error('Malus disponibile solo in preparazione');
  const owner=state.phase16B[side];
  if(!owner.malusChoices.includes(id)||owner.usedMalus.includes(id))throw Error('Sabotaggio non disponibile');
  const enemy=OPPOSITE(side),victim={...state.phase16B[enemy]}, me={...owner};
  const hp={...state.hp}, ammo={...state.ammo,[enemy]:{...state.ammo[enemy]}}, boost={...state.boost,[side]:{...state.boost[side]},[enemy]:{...state.boost[enemy]}};
  const users={player:{...state.player},enemy:{...state.enemy}};
  switch(id){
    case 'direct_hit':hp[enemy]=Math.max(0,hp[enemy]-8);break;
    case 'lock_weapon':victim.lockedWeapon='heavy';break;
    case 'smaller_hand':victim.handLimit=5;break;
    case 'skip_prepare':if(state.phase16F?.[enemy]?.skipShield){victim.skipNextPreparation=false;}else if(!victim.skipProtection){victim.skipNextPreparation=true;victim.skipProtection=true;}break;
    case 'ammo_leak':{const tank=ammo[enemy];const best=SUITS.reduce((a,b)=>tank[a]>=tank[b]?a:b);tank[best]=Math.max(0,tank[best]-4);break;}
    case 'boost_jam':victim.boostBlocked=1;break;
    case 'spy_hand':me.spying=users[enemy].hand.slice(0,3).map(c=>({value:c.value,suit:c.suit}));break;
    case 'shuffle_hand':{const p=users[enemy];if(p.hand.length&&p.deck.length)users[enemy]={...p,hand:[...p.hand.slice(1),p.deck[0]],deck:p.deck.slice(1),discard:[...p.discard,p.hand[0]]};break;}
    case 'weak_shield':victim.weakShield=1;break;
    case 'overheat':if(!(enemy==='player'&&hasPhase16CEpic(state,'epic_item_7')))victim.attackWeakened=1;break;
    case 'boost_drain':{const amount=Math.min(5,boost[enemy].energy);boost[enemy].energy-=amount;boost[side].energy=Math.min(45,boost[side].energy+amount);break;}
    case 'reveal_weapon':me.weaponRevealed=true;break;
    default:throw Error('Malus non riconosciuto');
  }
  me.malusChoices=[];me.malusCharge=0;me.usedMalus=[...me.usedMalus,id];
  const phase16F=state.phase16F?.[enemy]?.skipShield && id==='skip_prepare'
    ?{...state.phase16F,[enemy]:{...state.phase16F[enemy],skipShield:false}}:state.phase16F;
  const next={...state,...users,hp,ammo,boost,winner:hp[enemy]===0?side:state.winner,
    ...(hp[enemy]===0?{phase:TURN_PHASES.FINISHED,actor:null}:{}),
    ...(phase16F?{phase16F}:{}),phase16B:{...state.phase16B,[side]:me,[enemy]:victim}};
  return log(next,`${side}: MALUS ${MALUS_EFFECTS.find(x=>x.id===id)?.name}`);
}
export const DICE_FACES=Object.freeze(['module','malus','heal','dust','ether','damage']);
export function activatePhase16BDice(state,side,faceIndex=null){
  if(!state.phase16B||state.phase!==TURN_PHASES.PREPARE||state.ready[side]||!state.phase16B[side].diceReady)throw Error('Dado Quantico non pronto');
  const face=DICE_FACES[faceIndex===null?Math.floor(Math.random()*6):faceIndex];
  if(!face)throw Error('Faccia del dado non valida');
  const status={...state.phase16B[side],diceReady:false,dicePatterns:[]},enemy=OPPOSITE(side);
  const hp={...state.hp},earnings={...state.phase16B.earnings},players={player:{...state.player},enemy:{...state.enemy}};
  const otherStatus={...state.phase16B[enemy]};
  if(face==='module')status.moduleCharge=Math.min(3,status.moduleCharge+1); // storicizzazione vecchia carica; la Fase 16F usa quella del modulo
  if(face==='malus'){otherStatus.malusCharge=Math.max(0,otherStatus.malusCharge-1);if(otherStatus.malusCharge<3)otherStatus.malusChoices=[];}
  if(face==='heal')hp[side]=Math.min(state.initialHp[side],hp[side]+Math.ceil(state.initialHp[side]*0.1));
  if(face==='dust'&&side==='player')earnings.dust+=20;
  if(face==='ether')players[side].ether+=2;
  if(face==='damage')hp[enemy]=Math.max(0,hp[enemy]-8);
  const winner=hp.player===0&&hp.enemy===0?'draw':hp.player===0?'enemy':hp.enemy===0?'player':null;
  const outcome=log({...state,...players,hp,winner,...(winner?{phase:TURN_PHASES.FINISHED}:{}),
    phase16B:{...state.phase16B,[side]:status,[enemy]:otherStatus,earnings,lastDice:{side,face,round:state.round}}},
    `${side}: DADO QUANTICO (${face})`);
  return face==='module' ? applyPhase16FDiceCharge(outcome,side) : outcome;
}
export function exchangePhase16BCards(state,side,indices){
  let next=exchangePhase13Cards(state,side,indices);
  if(next.phase16F?.[side]?.freeSwap)next={...next,phase16F:{...next.phase16F,[side]:{...next.phase16F[side],freeSwap:false}}};
  return trackPhase16FPreparation(next,side,'swap');
}
export function markPhase16BReady(state,side){
  let next=trackPhase16FPreparation(markPhase15Ready(state,side),side,'ready');
  if(next.phase16B?.[side]?.moduleLocked>0)
    next={...next,phase16B:{...next.phase16B,[side]:{...next.phase16B[side],moduleLocked:Math.max(0,next.phase16B[side].moduleLocked-1)}}};
  return next.phase===TURN_PHASES.ATTACK?renewGoldenCards(next):next;
}
export function renewGoldenCards(state){
  let next=applyPhase16EHandGuard(state);
  for(const side of SIDES){
    const status=next.phase16B[side];
    if(status.handLimit>0 && next[side].hand.length>status.handLimit){
      const p=next[side];
      next={...next,[side]:{...p,hand:p.hand.slice(0,status.handLimit),discard:[...p.discard,...p.hand.slice(status.handLimit)]},
        phase16B:{...next.phase16B,[side]:{...status,handLimit:0}}};
    }
    const p=next[side], clean=c=>c?.isGolden&&c.goldenExpiresRound<next.round?{...c,isGolden:false}:c;
    next={...next,[side]:{...p,hand:p.hand.map(clean),deck:p.deck.map(clean),discard:p.discard.map(clean)}};
    next=grantGoldenCard(next,side);
  }
  return applyPhase16EHandGuard(next);
}
export function finishPhase16BAnimation(state){
  let next=finishPhase13Animation(state);
  // Una trasformazione boss azzera i pericoli temporanei del campo: la Bomba
  // non deve restare attaccata a una carta del banco rimosso fra le fasi.
  if(next.phase===TURN_PHASES.PREPARE && next.phase16B){
    for(const side of SIDES){
      if(next.phase!==TURN_PHASES.PREPARE)break;
      const status=next.phase16B[side];
      if(status.skipNextPreparation&&!next.ready[side]){
        next={...next,phase16B:{...next.phase16B,[side]:{...status,skipNextPreparation:false,preparationSkips:status.preparationSkips+1}}};
        next=log(markPhase15Ready(next,side),`${side}: preparazione saltata per Malus`);
      }
    }
  }
  if(next.phase===TURN_PHASES.PREPARE)next=beginPhase16CPreparation(next);
  if(next.phase===TURN_PHASES.ATTACK&&next.phase16B)next=renewGoldenCards(next);
  return next;
}
