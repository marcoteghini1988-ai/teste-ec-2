/**
 * FASE 13 — Campagna Botta e Risposta.
 * Isola le regole PvE da UI, ricompense e persistenza legacy.
 * I numeri qui sono provvisori: non sono il bilanciamento finale.
 */
import { TURN_PHASES, PHASE_MAX_SECONDS } from './config.js';
import { auditPhase10Duel, createPhase10Handoff } from './phase10Audit.js';
import { finishPhase6Animation, exchangePhase6Cards, extractPhase6WithEther, markPhase6Ready } from './phase6Engine.js';
import { planPhase9Preparation } from './phase9AI.js';
import { resolvePhase12CampaignExchange } from './phase12CampaignAbilities.js';
import { commitPhase5Move } from './phase5Engine.js';
import { createPhase14Memory, resolvePhase14WeaponEffects } from './phase14WeaponEffects.js';
import { resolvePhase15Passives, exchangePhase15Cards } from './phase15LegacyPassives.js';
import {resolvePhase16EExchange,applyPhase16EExchange} from './phase16EDecks.js';
import { getCampaignPlanetIndex } from './phase16ACatalog.js';
import {createPhase17Anomalies,advancePhase17Anomalies} from './phase17Anomalies.js';

const MODIFIERS=new Set(['standard','fast_timer','no_pass','boss_combined']);
const ANOMALIES=['normal','hearts_res','op_lock_add','op_lock_sub','op_lock_mul','op_lock_div'];
const OP_BY_ANOMALY=Object.freeze({op_lock_add:'+',op_lock_sub:'-',op_lock_mul:'*',op_lock_div:'/'});
const pad=(number,min,max)=>Math.min(max,Math.max(min,Math.floor(Number(number)||min)));
const other=side=>side==='player'?'enemy':'player';

export function isPhase13CampaignEligible({gameMode,activeAdventure,sectorMode='classic',hasNetworkOpponent=false}={}) {
  const p=activeAdventure?.planet, s=activeAdventure?.level;
  return gameMode==='adventure' && !hasNetworkOpponent && sectorMode==='classic' &&
    Number.isInteger(p)&&p>=1&&p<=20 && Number.isInteger(s)&&s>=1&&s<=10 &&
    MODIFIERS.has(activeAdventure?.modifier?.id || 'standard');
}
export function getPhase13BossPhases(planet,sector) {
  return 1; // F17: un solo combattimento e una sola barra HP anche per i boss storici
}
export function createPhase13Environment({planet,sector,modifier='standard',anomaly=null}={}) {
  if(!Number.isInteger(planet)||planet<1||planet>20||!Number.isInteger(sector)||sector<1||sector>10)
    throw Error('Coordinate del settore non valide');
  if(!MODIFIERS.has(modifier)) throw Error('Modificatore non supportato');
  // Nel vecchio gioco le anomalie sono possibili dal settore globale 14.
  // Una stessa battaglia conserva la propria anomalia per impedire reroll UI.
  // L'ID storico del pianeta non corrisponde alla posizione nella campagna 16A.
  const globalSector=(getCampaignPlanetIndex(planet)-1)*10+sector;
  const id=anomaly ?? (globalSector<14 ? 'normal' : ANOMALIES[(planet*7+sector*3)%ANOMALIES.length]);
  if(!ANOMALIES.includes(id)) throw Error('Anomalia non supportata');
  return Object.freeze({modifier,anomaly:id,blockedBoostOp:OP_BY_ANOMALY[id]||null,
    // Tempi per decidere, non durata imposta: la conferma anticipata resta possibile.
    // I boss non subiscono piu' la scorciatoia 'boss_combined' da 15 secondi:
    // la loro sfida richiede tempo per preparare Scala/Poker e usare i cambi.
    attackSeconds:modifier==='fast_timer'?20:PHASE_MAX_SECONDS.attack,
    responseSeconds:modifier==='fast_timer'?20:PHASE_MAX_SECONDS.response,
    preparationSeconds:PHASE_MAX_SECONDS.prepare,
    swapsDisabled:modifier==='no_pass',globalSector});
}
export function createPhase13BossTrack(planet,sector) {
  return {planet,sector,current:1,max:getPhase13BossPhases(planet,sector),cleared:0};
}
export function initializePhase13CampaignState(state,{planet,sector,modifier='standard',anomaly=null}={}) {
  const env=createPhase13Environment({planet,sector,modifier,anomaly});
  const track=createPhase13BossTrack(planet,sector);
  return {...state,campaignEnvironment:env,campaignBossTrack:track,
    phase17Anomalies:createPhase17Anomalies(planet,sector),
    // Le carte esistono gia': snapshot di mazzi reali, nessuna carta inventata.
    campaignStageDecks:{player:[...state.player.hand,...state.player.deck],enemy:[...state.enemy.hand,...state.enemy.deck]}};
}
export function getPhase13Time(state) {
  if(state.phase===TURN_PHASES.ATTACK) return state.campaignEnvironment?.attackSeconds??PHASE_MAX_SECONDS.attack;
  if(state.phase===TURN_PHASES.RESPONSE) return state.campaignEnvironment?.responseSeconds??PHASE_MAX_SECONDS.response;
  if(state.phase===TURN_PHASES.PREPARE) return state.campaignEnvironment?.preparationSeconds??PHASE_MAX_SECONDS.prepare;
  return null;
}
export function isPhase13BoostAllowed(state,choice) {
  return state.phase16E?.id==='ophiuchus' || !choice || choice.operation!==state.campaignEnvironment?.blockedBoostOp;
}
export function resolvePhase13Environment(state) {
  if(state.phase!==TURN_PHASES.ANIMATE || !state.result?.volleys || !state.campaignEnvironment || state.result.campaignEnvironmentResolved) return state;
  const env=state.campaignEnvironment, hp={...state.hp}, effects=[];
  if(env.anomaly==='hearts_res') for(const side of ['player','enemy']) {
    const volley=state.result.volleys[side];
    if(!volley || volley.shots<=0 || volley.damage<=0) continue;
    const hearts=(state.moves[side]?.committedCards||[]).filter(c=>c?.suit==='hearts'||c?.suit==='♥').length;
    if(!hearts) continue;
    const damage=Math.min(8,hearts*2);
    hp[other(side)]=Math.max(0,hp[other(side)]-damage);
    effects.push({side,kind:'damage',amount:damage,description:'Risonanza Cuori del campo'});
  }
  const winner=hp.player===0&&hp.enemy===0?'draw':hp.player===0?'enemy':hp.enemy===0?'player':null;
  return {...state,hp,winner,
    result:{...state.result,campaignEnvironmentResolved:true,campaignEnvironmentEffects:effects},
    history:[...state.history,...effects.map(e=>`${e.side}: ${e.description} (+${e.amount} danni)`)].slice(-20)};
}
export function commitPhase13Move(state,side,placements=[],isPass=false,weaponId=null,boost=null) {
  if(!isPhase13BoostAllowed(state,boost)) throw Error('Operatore Boost bloccato dall’anomalia del settore');
  const next=commitPhase5Move(state,side,placements,isPass,weaponId,boost);
  return resolvePhase16EExchange(resolvePhase15Passives(resolvePhase14WeaponEffects(resolvePhase13Environment(resolvePhase12CampaignExchange(next)))));
}
export function exchangePhase13Cards(state,side,indices) {
  if(state.campaignEnvironment?.swapsDisabled && !(side==='player'&&state.phase16E?.id==='ophiuchus')) throw Error('Il modificatore del settore blocca i cambi di carte');
  const exchanged=state.legacyPassives ? exchangePhase15Cards(state,side,indices) : exchangePhase6Cards(state,side,indices);
  return applyPhase16EExchange(state,exchanged,side);
}
export function preparePhase13AI(state) {
  if(state.phase!==TURN_PHASES.PREPARE || state.ready.enemy) return state;
  if(!state.campaignEnvironment?.swapsDisabled) return state; // usare AI originale fuori da qui
  const suggestion=planPhase9Preparation(state,'enemy');
  let next=state;
  if(suggestion?.ether) {
    const {handIndex,deckIndex,cost}=suggestion.ether;
    next=extractPhase6WithEther(next,'enemy',handIndex,deckIndex,cost);
  }
  return markPhase6Ready(next,'enemy');
}

/** Compatibilita API: dopo la Fase 17 nessuna vittoria intermediaria
 * ricarica HP, mani, mazzi o banco. La prima sconfitta del boss e finale. */
export function getPhase13NextBossHp(planet) {return 0;}
export function advancePhase13BossIfNeeded(state) {return state;}
/** Campo senza cambi: due doppi PASSA consecutivi producono un ricambio
 * ambientale delle carte vere. Non è una scelta del giocatore, non costa HP e
 * non permette di aggirare il divieto di scambio durante la preparazione. */
export function recoverPhase13Stalemate(state) {
  if(state.phase!==TURN_PHASES.PREPARE || !state.campaignEnvironment?.swapsDisabled || (state.campaignStalemateRounds||0)<2) return state;
  let next={...state,campaignStalemateRounds:0};
  for(const side of ['player','enemy']) {
    const p=next[side], count=Math.min(3,p.hand.length);
    if(!count) continue;
    const discarded=p.hand.slice(-count);
    let deck=[...p.deck], discard=[...p.discard,...discarded];
    const hand=p.hand.slice(0,-count || undefined);
    while(hand.length<p.hand.length) {
      if(!deck.length && discard.length){deck=[...discard].reverse();discard=[];}
      if(!deck.length)break;
      hand.push(deck.shift());
    }
    next={...next,[side]:{...p,hand,deck,discard}};
  }
  return {...next,history:[...next.history,'Campo di interdizione: rimescolamento automatico dopo due doppi PASSA.'].slice(-20)};
}
export function finishPhase13Animation(state) {
  const transitioned=advancePhase13BossIfNeeded(state);
  if(transitioned!==state) return transitioned;
  const next=advancePhase17Anomalies(finishPhase6Animation(state));
  if(next.phase!==TURN_PHASES.PREPARE) return next;
  const doublePass=Boolean(state.moves?.player?.passed && state.moves?.enemy?.passed);
  const streak=doublePass?(state.campaignStalemateRounds||0)+1:0;
  return recoverPhase13Stalemate({...next,campaignStalemateRounds:streak});
}

export function validatePhase13Settlement(state,context={},telemetry={},challenge=null) {
  if(!isPhase13CampaignEligible(context)) return {ok:false,reason:'Settore non migrato o contesto non autorizzato'};
  const sector=context.activeAdventure.level,planet=context.activeAdventure.planet;
  if(state?.campaignSession?.planet!==planet || state?.campaignSession?.sector!==sector)
    return {ok:false,reason:'La sessione non corrisponde al settore richiesto'};
  const audit=auditPhase10Duel(state);
  if(!audit.ok) return {ok:false,reason:'Stato del duello non valido',errors:audit.errors};
  const handoff=createPhase10Handoff(state,context);
  if(!handoff.ok) return {ok:false,reason:handoff.reason};
  const r=handoff.report, boss=sector===10, track=state.campaignBossTrack;
  if(r.planet!==planet||r.sector!==sector||r.isBoss!==boss)
    return {ok:false,reason:'Identità del duello differente dal settore'};
  if(!track || track.planet!==planet || track.sector!==sector || track.max!==getPhase13BossPhases(planet,sector) ||
     track.current<1 || track.current>track.max || track.cleared!==track.current-1)
    return {ok:false,reason:'Stato del boss non coerente'};
  const win=r.outcome==='player';
  const hpRatio=pad(Math.round(100*r.playerHp/r.playerMaxHp),0,100)/100;
  const stats={totalTimeElapsed:Math.max(1,Math.floor((Number(telemetry.elapsedMs)||1000)/1000)),
    finalHp:r.playerHp,maxHp:r.playerMaxHp,
    exchangesUsed:Math.max(0,Number(telemetry.swaps)||0),opCounts:telemetry.opCounts||{},
    maxSingleHitDmg:Math.max(0,Number(telemetry.maxSingleHitDmg)||0),
    goldenOrComboCount:Math.max(0,Number(telemetry.goldenOrComboCount)||0),
    moduleActivations:Math.max(0,Number(telemetry.moduleActivations)||0),
    heartsPlayed:Math.max(0,Number(telemetry.heartsPlayed)||0),
    fastStrikesCount:Math.max(0,Number(telemetry.fastStrikesCount)||0),
    validPokerCombos:Math.max(0,Number(telemetry.validPokerCombos)||0),
    winningResponses:Math.max(0,Number(telemetry.winningResponses)||0),
    multiSuitShots:Math.max(0,Number(telemetry.multiSuitShots)||0),
    boostActivations:Math.max(0,Number(telemetry.boostActivations)||0),
    weaponDamage:Math.max(0,Number(telemetry.weaponDamage)||0)};
  const stars=[win,win&&hpRatio>=.5,win&&typeof challenge?.check==='function'&&Boolean(challenge.check(stats))];
  const meta={isDraw:r.outcome==='draw',isPvP:false,usedRevive:false,turnsElapsed:Math.max(1,r.exchanges),
    activeTimeElapsedMs:Math.max(1000,Number(telemetry.elapsedMs)||1000),
    remainingHpPct:hpRatio,matchStats:stats,starsEarned:stars,
    adventureChallenge:challenge?{challenge,stats,starsEarned:stars}:null,ruleset:r.ruleset};
  return {ok:true,report:r,meta};
}
export function createPhase13OnceGuard() {
  const claimed=new Set();
  return {claim(key){if(typeof key!=='string'||!key||claimed.has(key))return false;claimed.add(key);return true;},
    has:key=>claimed.has(key)};
}

/** Alcuni boss storici (13–17) non hanno una carta pilota boss nel catalogo:
 * per loro si usa la sentinella del pianeta più il profilo boss F12. */
export function getPhase13EnemyPilotId(planet,sector) {
  return sector===10 && (planet<=12 || planet>=18) ? `pilot_boss_${planet}` : `pilot_sentinel_${planet}`;
}
