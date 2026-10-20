/** Fase 17T — arbitro PURO per futuri duelli Poker online.
 * Lo stato canonico e il seed devono risiedere solo sul server autenticato.
 * NON esporre session.state in RTDB pubblica e NON usare questo modulo nel browser
 * per accreditare trofei/diamanti della Lega Élite.
 */
import { randomInt } from 'node:crypto';
import { TURN_PHASES, PHASE_MAX_SECONDS } from './config.js';
import {createPhase6Duel,finishPhase6Animation,exchangePhase6Cards,extractPhase6WithEther,markPhase6Ready,expirePhase6Preparation} from './phase6Engine.js';
import {commitPhase5Move} from './phase5Engine.js';
import {resolvePhase12CampaignExchange} from './phase12CampaignAbilities.js';
import {resolvePhase14WeaponEffects} from './phase14WeaponEffects.js';
import {getWeaponDefinition} from './weaponCatalog.js';
import {auditPhase10Duel} from './phase10Audit.js';
import {normalizePhase4Loadout} from './phase4Weapons.js';
import {phase17StartingAmmo} from './phase17Balance.js';
import {createPvpPokerDeck} from '../pvpBootstrap.js';

const ID=/^[a-zA-Z0-9_-]{4,128}$/;
const other=x=>x==='player'?'enemy':'player';
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const phaseEnd = phase => Number(PHASE_MAX_SECONDS[phase]||0)*1000;

/** In produzione players e segreto arrivano SOLO da profili verificati da Admin. */
export function createOnlinePokerSession({roomId,players,serverSecret,now=Date.now()}={}) {
  assert(/^room_[a-zA-Z0-9_-]{3,160}$/.test(String(roomId)),'Stanza invalida');
  assert(Array.isArray(players)&&players.length===2 && players.every(p=>ID.test(String(p?.uid))) && players[0].uid!==players[1].uid,'Due identità autenticate distinte richieste');
  assert(/^[a-zA-Z0-9_-]{24,128}$/.test(String(serverSecret)), 'Seed segreto server insufficiente');
  assert(Number.isSafeInteger(now) && now>0,'Tempo server invalido');
  const [left,right]=players;
  // SOLO SERVER: shuffle crittograficamente indipendente. Il generatore FNV usato
  // nei BOT locali non è adeguato a nascondere la mano di un umano online.
  const shuffle=cards=>{for(let i=cards.length-1;i>0;i--){const j=randomInt(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;};
  const a=shuffle(createPvpPokerDeck(`room_${serverSecret}_p1`,'player'));
  const b=shuffle(createPvpPokerDeck(`room_${serverSecret}_p2`,'enemy'));
  const pLoad=normalizePhase4Loadout(left.loadout),eLoad=normalizePhase4Loadout(right.loadout);
  const levels=player=>Object.fromEntries(['light','medium','heavy'].map(cls=>[cls,Math.max(1,Math.min(4,Math.floor(Number(player.levels?.[cls])||1)))]));
  const hp=player=>Math.max(100,Math.min(400,Math.floor(Number(player.hp)||180)));
  const state=createPhase6Duel({playerHand:a.slice(0,7),playerDeck:a.slice(7),enemyHand:b.slice(0,7),enemyDeck:b.slice(7),
    playerLoadout:pLoad,enemyLoadout:eLoad,playerWeaponLevels:levels(left),enemyWeaponLevels:levels(right),
    playerHp:hp(left),enemyHp:hp(right),playerAmmo:phase17StartingAmmo(pLoad),enemyAmmo:phase17StartingAmmo(eLoad),ether:0,enemyEther:0});
  assert(auditPhase10Duel(state).ok,'Stato iniziale invalido');
  return {protocol:'poker-online-17T',roomId,participants:{[left.uid]:'player',[right.uid]:'enemy'},
    state,version:0,phaseStartedAt:now,usedIds:{},events:[],status:'active',completedAt:null};
}

/** Firebase RTDB elimina i nodi null e può ricostruire array sparsi come oggetti.
 * Ripristina la forma canonica del motore ad ogni lettura del database. */
export function hydrateOnlinePokerSession(raw){
  if(!raw?.state)return raw;
  const toArray=value=>Array.isArray(value)?value:Object.keys(value||{}).filter(k=>/^\d+$/.test(k))
    .sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]);
  const b=raw.state.board;
  const board=Array.from({length:5},(_,i)=>b?.[i]??null);
  const sides={};
  for(const side of ['player','enemy']){
    const p=raw.state[side]||{};
    sides[side]={...p,hand:toArray(p.hand),deck:toArray(p.deck),discard:toArray(p.discard)};
  }
  return {...raw,usedIds:raw.usedIds||{},events:toArray(raw.events),
    state:{...raw.state,...sides,board,history:toArray(raw.state.history)}};
}

/** La richiesta contiene SOLO ID delle carte, MAI oggetti carta. Il server lega ogni ID
 *  a una carta presente nella mano canonica (un client non può inventarla). */
function placementsForAction(state,side,action) {
  assert(action.placements == null || (Array.isArray(action.placements) && action.placements.length<=4),'Massimo quattro piazzamenti');
  const ids=new Set(),slots=new Set();
  const hand=new Map(state[side].hand.map(c=>[String(c.id),c]));
  return (action.placements || []).map(p=>{
    const id=String(p?.cardId||'');
    assert(hand.has(id)&&!ids.has(id),'Carta assente o duplicata');
    assert(Number.isInteger(p.slot)&&p.slot>=0&&p.slot<5&&!slots.has(p.slot),'Slot non valido');
    ids.add(id);slots.add(p.slot);
    return {slot:p.slot,card:hand.get(id)};
  });
}

/** Transazione pura: il chiamante salva atomically (CAS su version).
 * Il client non può aggiornare direttamente gli HP o il vincitore. */
export function applyOnlinePokerAction(session,uid,action,now=Date.now()) {
  session=hydrateOnlinePokerSession(session);
  assert(session?.protocol==='poker-online-17T' && session.status==='active','Duello non attivo');
  const side=session.participants?.[uid];
  assert(side==='player'||side==='enemy','Non partecipante');
  assert(Number.isSafeInteger(now)&&now>=session.phaseStartedAt,'Tempo non valido');
  assert(action && typeof action==='object' && ID.test(String(action.id)),'Azione senza identificativo valido');
  assert(Number.isSafeInteger(action.expectedVersion)&&action.expectedVersion===session.version,'Versione scaduta');
  assert(!session.usedIds[`${uid}:${action.id}`],'Azione già elaborata');
  const old=session.state;
  const seconds=(now-session.phaseStartedAt)/1000;
  const penalty=old.phase===TURN_PHASES.PREPARE?(old.preparation?.timePenaltySeconds?.[side]||0)*1000:0;
  const timeBudget=Math.max(0,phaseEnd(old.phase)-penalty);
  if(timeBudget>0 && now-session.phaseStartedAt>=timeBudget && action.type!=='timeout')throw Error('Tempo della fase scaduto');
  let next;
  switch(action.type){
    case 'attack':{
      assert([TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(old.phase)&&old.actor===side,'Non è il tuo turno');
      const placements=placementsForAction(old,side,action);
      const passing=action.pass===true;
      assert(passing ? placements.length===0 : placements.length>0,'Mossa o passaggio invalido');
      const weaponId=passing?null:String(action.weaponId||'');
      if(!passing){
        const weapon=getWeaponDefinition(weaponId);
        assert(weapon && old.arsenal[side]?.[weapon.weaponClass]===weaponId,'Arma non equipaggiata');
      }
      const boost=action.boost??null;
      if(boost!==null){
        assert(!passing && [15,30,45].includes(boost.cost) && ['+','-','*','/'].includes(boost.operation) && Array.isArray(boost.cardIds),'Boost non valido');
        assert(boost.cardIds.every(id=>old[side].hand.some(c=>c.id===id)),'Boost con carte estranee');
      }
      next=resolvePhase14WeaponEffects(resolvePhase12CampaignExchange(commitPhase5Move(old,side,placements,passing,weaponId,boost)));
      break;
    }
    case 'swap':
      assert(old.phase===TURN_PHASES.PREPARE,'Non sei in preparazione');
      next=exchangePhase6Cards(old,side,action.indices);
      break;
    case 'ether':
      assert(old.phase===TURN_PHASES.PREPARE,'Non sei in preparazione');
      next=extractPhase6WithEther(old,side,action.handIndex,action.deckIndex);
      break;
    case 'ready':
      assert(old.phase===TURN_PHASES.PREPARE,'Non sei in preparazione');
      next=markPhase6Ready(old,side);break;
    case 'timeout':
      // Scadenze arbitrate dal worker di rete, mai dal giocatore.
      throw Error('Timeout consentito solo al server');
    default:throw Error('Azione non prevista');
  }
  assert(auditPhase10Duel(next).ok,'Il motore ha prodotto uno stato non valido');
  return {
    ...session,state:next,version:session.version+1,
    phaseStartedAt:old.phase!==next.phase?now:session.phaseStartedAt,
    usedIds:{...session.usedIds,[`${uid}:${action.id}`]:true},
    events:[...session.events.slice(-31),{uid,actionId:action.id,type:action.type,version:session.version+1,at:now}],
    status:next.phase===TURN_PHASES.FINISHED?'finished':'active',
    completedAt:next.phase===TURN_PHASES.FINISHED?now:null
  };
}

/** Solo il worker invoca tick: sceglie PASSA/PRONTO quando scade una fase,
 * e avanza l'animazione dopo 1500 ms. */
export function tickOnlinePokerSession(session,now=Date.now()) {
  const original=session;
  session=hydrateOnlinePokerSession(session);
  if(session?.protocol!=='poker-online-17T'||session.status!=='active')return session;
  const old=session.state,elapsed=now-session.phaseStartedAt;
  if(elapsed<0)return session;
  let next=old;
  if(old.phase===TURN_PHASES.ANIMATE && elapsed>=1500)next=finishPhase6Animation(old);
  if(old.phase===TURN_PHASES.PREPARE)next=expirePhase6Preparation(old,elapsed/1000);
  if([TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(old.phase) && elapsed>=phaseEnd(old.phase)){
    next=resolvePhase14WeaponEffects(resolvePhase12CampaignExchange(commitPhase5Move(old,old.actor,[],true)));
  }
  if(next===old)return original;
  assert(auditPhase10Duel(next).ok,'Scadenza ha prodotto stato non valido');
  return {...session,state:next,version:session.version+1,
    phaseStartedAt:next.phase===old.phase?session.phaseStartedAt:now,
    status:next.phase===TURN_PHASES.FINISHED?'finished':'active',completedAt:next.phase===TURN_PHASES.FINISHED?now:null,
    events:[...session.events.slice(-31),{uid:'server',type:'tick',version:session.version+1,at:now}]};
}

/** Stato pubblico compatto: nessun mazzo, mano, seed o scarto segreto del rivale. */
export function viewOnlinePokerSession(session,uid) {
  session=hydrateOnlinePokerSession(session);
  const side=session?.participants?.[uid];
  assert(side==='player'||side==='enemy','Non sei un partecipante');
  const foe=other(side),s=session.state;
  return {
    protocol:session.protocol,roomId:session.roomId,version:session.version,status:session.status,
    phaseStartedAt:session.phaseStartedAt,phase:s.phase,round:s.round,actor:s.actor,opener:s.opener,
    board:s.board,hp:s.hp,initialHp:s.initialHp,ammo:s.ammo,arsenal:s.arsenal,weaponLevels:s.weaponLevels,
    boost:s.boost,ready:s.ready,winner:s.winner,result:s.result,history:s.history,
    deadlineAt:session.phaseStartedAt+(s.phase===TURN_PHASES.ANIMATE?1500:Math.max(0,Number(PHASE_MAX_SECONDS[s.phase]||0)-(s.phase===TURN_PHASES.PREPARE?(s.preparation?.timePenaltySeconds?.[side]||0):0))*1000),
    me:{side,hand:s[side].hand,deckSize:s[side].deck.length,discard:s[side].discard,
      exchangesLeft:s[side].exchangesLeft,ether:s[side].ether},
    opponent:{side:foe,handSize:s[foe].hand.length,deckSize:s[foe].deck.length,
      discardCount:s[foe].discard.length,exchangesLeft:s[foe].exchangesLeft,ether:s[foe].ether}
  };
}
