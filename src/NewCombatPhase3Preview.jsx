import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TURN_PHASES, MAX_PLACED_CARDS_PER_ACTION, BOOST_LEVELS, PHASE_MAX_SECONDS } from './newCombat/config.js';
import { applyBoardPlacements, requiredBoardPlacements } from './newCombat/combatBasics.js';
import { findBestPokerCombination } from './newCombat/pokerRules.js';
import { ARSENAL_48, getWeaponDefinition } from './newCombat/weaponCatalog.js';
import { WeaponCardArt } from './newCombat/WeaponVisuals.jsx';
import { normalizePhase7Armory } from './newCombat/phase7Armory.js';
import { getPhase4MoveOptions, setPhase4EquippedWeapon } from './newCombat/phase4Engine.js';
import { commitPhase5Move, getBoostCalculationSuggestions } from './newCombat/phase5Engine.js';
import { resolvePhase14WeaponEffects } from './newCombat/phase14WeaponEffects.js';
import { initializePhase15, extractPhase15WithEther, getPhase15EtherCost, rearmPhase15Terrain, markPhase15Ready, restorePhase15Hand } from './newCombat/phase15LegacyPassives.js';
import { createPhase6Duel, finishPhase6Animation, exchangePhase6Cards, extractPhase6WithEther, markPhase6Ready, getPhase6RemainingSeconds, expirePhase6Preparation, PHASE6_ETHER_COST } from './newCombat/phase6Engine.js';
import { planPhase9Attack, executePhase9Preparation } from './newCombat/phase9AI.js';
import { describePhase9Battle } from './newCombat/phase10Audit.js';
import { createPhase12CampaignTactics, resolvePhase12CampaignExchange, getCampaignPilotV2, getCampaignPilotAbilityDescription } from './newCombat/phase12CampaignAbilities.js';
import {getPhase16DBossBrief} from './newCombat/phase16DBosses.js';
import {getPhase17BlockedSlots,getPhase17AnomalyNotice,isPhase17WeaponFrozen} from './newCombat/phase17Anomalies.js';
import {phase17Features} from './newCombat/phase17Balance.js';
import {phase17EEnemyModule,activatePhase17EEnemyModuleIfReady} from './newCombat/phase16FModules.js';
import { auditPhase10Duel, createPhase10Handoff } from './newCombat/phase10Audit.js';
import { checkBoostCalculation, MATH_OPERATION_PREVIEW } from './newCombat/phase5Engine.js';
import { getPhase3Time, refillAfterLocalCombatMove } from './newCombat/phase3Engine.js';
import { initializePhase13CampaignState, getPhase13Time, commitPhase13Move,
  finishPhase13Animation, exchangePhase13Cards, preparePhase13AI, isPhase13BoostAllowed } from './newCombat/phase13Campaign.js';
import { initializePhase16B, commitPhase16BMove, finishPhase16BAnimation, exchangePhase16BCards, markPhase16BReady,
  activatePhase16BDice, activatePhase16BMalus, MALUS_EFFECTS, getBombMarkOnCard, renewGoldenCards } from './newCombat/phase16BCombat.js';
import {initializePhase16C,offerPhase16CDice,selectPhase16CDice,getPhase16CHeat,PHASE16C_HEAT_LIMIT,PHASE16C_DICE_LABELS,PHASE16C_EPICS} from './newCombat/phase16CEpics.js';
import {initializePhase16E,PHASE16E_DECKS,describePhase16EDeck} from './newCombat/phase16EDecks.js';
import {initializePhase16F,PHASE16F_MODULES,PHASE16F_CHARGE_LABELS,activatePhase16FModule,trackPhase16FPreparation} from './newCombat/phase16FModules.js';
import {initializePhase16G,PHASE16G_PILOTS} from './newCombat/phase16GPilots.js';
import {describePhase16HTerrain} from './newCombat/phase16HProgression.js';
import './newCombat/phase3Preview.css';
import ClassicPokerFieldBridge from './ClassicPokerFieldBridge.jsx';
import { POKER_VOLLEY_ANIMATION_MS } from './newCombat/pokerVolleyVfx.js';

const labelSide = side => side === 'player' ? 'TU' : 'COMPUTER';
const SUITS = {hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'};
const CLASS_LABELS={light:'LEGGERA',medium:'MEDIA',heavy:'PESANTE'};
const activeWeaponEffects = memory => {
  if(!memory) return 'Nessuno';
  const labels=[['delayed','Impatto ritardato'],['nextAttack','Prossimo colpo +'],['guard','Schermo'],['weak','Attacco indebolito'],['vulnerable','Vulnerabile']];
  const active=labels.filter(([key])=>memory[key]>0).map(([key,label])=>`${label} ${memory[key]}`);
  if(memory.solar>0)active.push(`Solare ${memory.solar}/6`);
  return active.join(' · ')||'Nessuno';
};
const suitOf = card => SUITS[card?.suit] || card?.symbol || '✦';
const cardLabel = card => card?.displayVal || ({1:'A',11:'J',12:'Q',13:'K'}[card?.value] || card?.value || '?');
const red = card => ['hearts','diamonds'].includes(card?.suit) || ['♥','♦'].includes(card?.symbol);
function PokerCard({ card, selected, onClick, small = false, placeholder, disabled = false, bomb = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`phase3-card ${small?'mini':''} ${selected?'selected':''} ${!card?'empty':''}`} aria-label={card?`${cardLabel(card)} ${suitOf(card)}`:placeholder || 'Slot vuoto'}>
    {card ? <><span className={red(card)?'red':''}>{cardLabel(card)}{card.isGolden?' ✨':''}</span><strong className={red(card)?'red':''}>{suitOf(card)}{bomb?' 💣':''}</strong></> : <span className="empty-label">{placeholder || '+'}</span>}
  </button>;
}
const commitCombatMove = (state,side,...args)=>refillAfterLocalCombatMove(
  state.campaignEnvironment ? commitPhase16BMove(state,side,...args)
    : resolvePhase14WeaponEffects(resolvePhase12CampaignExchange(commitPhase5Move(state,side,...args))),side);
const initialCards = (input, start, limit=7) => Array.isArray(input) && input.length ? input.slice(0,limit).map((card,i)=>({...card,id:`phase3-${start}-${i}-${card.id ?? 'card'}`})) : [];
export default function NewCombatPhase3Preview({ onClose, playerHand, playerDeck, aiHand, aiDeck, battleEther = 0, initialBoard, playerAmmo, enemyAmmo, armoryV2, battleContext, initialPlayerHp, initialEnemyHp, enemyPilotLevel = 1, enemyLoadout = null, playerWeaponLevels = null, enemyWeaponLevels = null, campaignMode = false, pvpBotMode = false, pveMode = false, onDuelComplete = null, onBattleComplete = null, onCampaignEtherConsumed = null, campaignPilotId = null, campaignPilotLevel = 1, campaignEnemyPilotId = null, legacyLoadout = null, fixedLoadout = false }) {
  const authorizedArmory = normalizePhase7Armory(armoryV2);
  const campaignFeatures=campaignMode?phase17Features(battleContext?.activeAdventure?.planet||1,battleContext?.activeAdventure?.level||1):null;
  const modeDescription=describePhase9Battle(battleContext);
  const [game, setGame] = useState(() => {
    const duel=createPhase6Duel({
    playerHand: initialCards(playerHand,'p'), enemyHand: initialCards(aiHand,'e'),
    playerDeck: initialCards(playerDeck, 'pd', 500),
    enemyDeck: initialCards(aiDeck, 'ed', 500),
    board: Array.isArray(initialBoard) && initialBoard.length===5 ? [...initialBoard] : Array(5).fill(null),
    ether: battleEther, playerAmmo, enemyAmmo, playerLoadout:authorizedArmory.equipped,
    playerHp:initialPlayerHp, enemyHp:initialEnemyHp,enemyLoadout:enemyLoadout||undefined,playerWeaponLevels,enemyWeaponLevels,
    });
    const combatWithPilots=campaignMode ? {...duel,campaignTactics:createPhase12CampaignTactics({
      playerPilotId:campaignPilotId||'pilot_com_1',
      playerPilotLevel:campaignPilotLevel,
      enemyPilotLevel,
      enemyPilotId:campaignEnemyPilotId||`pilot_sentinel_${battleContext?.activeAdventure?.planet||1}`,
      planet:battleContext?.activeAdventure?.planet||1,
      sector:battleContext?.activeAdventure?.level||1,
      modifier:battleContext?.activeAdventure?.modifier?.id||'standard'
    })} : duel;
    return campaignMode ? initializePhase16G(initializePhase16F(initializePhase16E(initializePhase16C(initializePhase16B(initializePhase15(initializePhase13CampaignState({...combatWithPilots,campaignSession:{
      planet:battleContext?.activeAdventure?.planet,
      sector:battleContext?.activeAdventure?.level,
    }},{planet:battleContext?.activeAdventure?.planet,sector:battleContext?.activeAdventure?.level,
      modifier:battleContext?.activeAdventure?.modifier?.id||'standard'}), legacyLoadout||{})))), legacyLoadout||{},
      phase17EEnemyModule(battleContext?.activeAdventure?.planet,battleContext?.activeAdventure?.level))) : combatWithPilots;
  });
  const advancedToolsRef = useRef(null);
  const current = useRef(game);
  const campaignStartedAt = useRef(Date.now());
  const etherCharged = useRef(0);
  const submittedCampaignResult = useRef(false);
  const inspectedRounds = useRef(new Set());
  const battleTelemetry = useRef({maxSingleHitDmg:0, heartsPlayed:0, opCounts:{}, goldenOrComboCount:0, moduleActivations:0, fastStrikesCount:0,validPokerCombos:0,winningResponses:0,multiSuitShots:0,boostActivations:0,weaponDamage:0});
  // Raccolta una sola volta, a fine confronto: niente statistiche inventate.
  useEffect(() => {
    if (game.phase!==TURN_PHASES.ANIMATE || inspectedRounds.current.has(game.round)) return;
    inspectedRounds.current.add(game.round);
    const move=game.moves?.player;
    const damage=game.result?.volleys?.player?.damage || 0;
    const stats=battleTelemetry.current;
    stats.maxSingleHitDmg=Math.max(stats.maxSingleHitDmg,damage);
    // Un contatore per ogni scambio, non per ogni render: usati da capsule,
    // missioni e terza stella solo dopo la convalida dell'esito.
    if(move?.score && damage>0){
      stats.validPokerCombos++;
      stats.weaponDamage+=Math.max(0,Math.floor(damage));
      if(game.result?.winner==='responder' && game.result?.responder==='player') stats.winningResponses++;
      if(new Set((move.committedCards||[]).map(card=>card?.suit).filter(s=>['hearts','diamonds','clubs','spades'].includes(s))).size>=3)stats.multiSuitShots++;
      if(game.result?.volleys?.player?.boostApplied) stats.boostActivations++;
    }
    stats.heartsPlayed+=(move?.committedCards||[]).filter(card=>card?.suit==='hearts').length;
    const suits=new Set((move?.committedCards||[]).filter(card=>card?.suit && card.suit!=='joker').map(card=>card.suit));
    if(suits.size===4 && damage>0) stats.goldenOrComboCount++;
    const op=move?.boost?.operation;
    if(op && game.result?.volleys?.player?.boostApplied && damage>0)
      stats.opCounts[op]=(stats.opCounts[op]||0)+1;
  },[game.phase,game.round,game.moves,game.result]);
  // Etere reale: addebito immediato e una sola volta, anche se si abbandona.
  useEffect(()=>{
    if(!campaignMode || typeof onCampaignEtherConsumed!=='function') return;
    const stats=game.preparation?.statistics?.player;
    const total=stats?.etherSpent ?? (stats?.etherExtracts||0)*PHASE6_ETHER_COST;
    if(total>etherCharged.current){const delta=total-etherCharged.current;etherCharged.current=total;onCampaignEtherConsumed(delta);}
  },[campaignMode,game.preparation?.statistics?.player?.etherSpent,game.preparation?.statistics?.player?.etherExtracts,onCampaignEtherConsumed]);
  const submitCampaignOutcome = () => {
    const complete = campaignMode ? onBattleComplete : ((pvpBotMode||pveMode) ? onDuelComplete : null);
    if(typeof complete!=='function' || submittedCampaignResult.current || !handoff?.ok || !duelAudit.ok) return;
    submittedCampaignResult.current=true;
    const telemetry={...battleTelemetry.current, moduleActivations:game.phase16F?.player?.activations||0, opCounts:{...battleTelemetry.current.opCounts},
      swaps:game.preparation?.statistics?.player?.swaps||0,
      elapsedMs:Date.now()-campaignStartedAt.current};
    try {
      if(complete(game,telemetry)===false) submittedCampaignResult.current=false;
    } catch(err) {
      submittedCampaignResult.current=false;
      setMessage(err?.message||'Impossibile concludere la battaglia');
    }
  };
  const [draft,setDraft] = useState([]);
  const [selectedHandIndex,setSelectedHandIndex] = useState(null);
  const [swapIndices,setSwapIndices] = useState([]);
  const [etherHandIndex,setEtherHandIndex] = useState(null);
  const [seconds,setSeconds] = useState(PHASE_MAX_SECONDS.attack);
  const [enemySeconds,setEnemySeconds] = useState(PHASE_MAX_SECONDS.attack);
  const [message,setMessage] = useState('');
  const [aiPreview,setAiPreview] = useState(null);
  const [hpBeforeVolley,setHpBeforeVolley] = useState(null);
  const [mobiusPopupDismissed,setMobiusPopupDismissed] = useState(false);
  const mobiusPauseRef=useRef(false);
  const [selectedWeaponId,setSelectedWeaponId] = useState(null);
  const [bombTargetClass,setBombTargetClass] = useState('medium');
  const [boostEnabled,setBoostEnabled] = useState(false);
  const [boostCost,setBoostCost] = useState(15);
  const [boostOperation,setBoostOperation] = useState('+');
  const [boostCardIds,setBoostCardIds] = useState(['','']);
  const apply = useCallback(fn => {
    try {
      const previous=current.current;
      const calculated=fn(previous);
      const next=previous.phase===TURN_PHASES.PREPARE && calculated.phase===TURN_PHASES.ATTACK ? renewGoldenCards(restorePhase15Hand(calculated)) : calculated;
      if (next !== current.current) {
        if(previous.phase!==TURN_PHASES.ANIMATE && next.phase===TURN_PHASES.ANIMATE && next.result?.volleys) setHpBeforeVolley(previous.hp);
        else if(previous.phase===TURN_PHASES.ANIMATE && next.phase!==TURN_PHASES.ANIMATE) setHpBeforeVolley(null);
        current.current = next; setGame(next);
      }
      setMessage('');
      return true;
    } catch (error) { setMessage(error.message || String(error)); return false; }
  }, []);
  const mobiusPopupVisible=campaignMode&&game.phase===TURN_PHASES.PREPARE&&Boolean(game.phase16C?.mobius.announcement)&&!mobiusPopupDismissed;
  mobiusPauseRef.current=mobiusPopupVisible;
  const currentTurnKey = `${game.round}:${game.phase}:${game.actor || 'both'}`;
  const sealedSlots=getPhase17BlockedSlots(game);
  const draftBoard = useMemo(() => {
    const board = [...game.board];
    for (const p of draft) board[p.slot] = p.card;
    return board;
  }, [game.board,draft]);
  const liveAiPreview=aiPreview?.key===currentTurnKey&&game.actor==='enemy'?aiPreview:null;
  const displayBoard=useMemo(()=>{
    if(!liveAiPreview?.placements?.length)return draftBoard;
    const projected=[...draftBoard];
    for(const placement of liveAiPreview.placements)projected[placement.slot]=placement.card;
    return projected;
  },[draftBoard,liveAiPreview]);
  const aiStatus=liveAiPreview?.stage==='placing'?'POSIZIONA LE CARTE':liveAiPreview?.stage==='confirm'?'CONFERMA LA COMBINAZIONE':liveAiPreview?.stage==='pass'?'NESSUNA COMBINAZIONE · PASSA':liveAiPreview?.stage==='select'?'SCEGLIE LE CARTE':'ANALIZZA IL BANCO';
  const availableWeapons = useMemo(() => getPhase4MoveOptions(game,'player',draft).filter(o=>o.weaponClass!==game.phase16B?.player?.lockedWeapon),[game,draft]);
  const recommendedWeapon = availableWeapons.find(option=>option.canFire) || null;
  const chosenWeapon = availableWeapons.find(option=>option.weaponId===selectedWeaponId) || recommendedWeapon;
  const combo = chosenWeapon?.score || findBestPokerCombination(draftBoard.map((card,index)=>sealedSlots.includes(index)?null:card));
  const required = game.phase===TURN_PHASES.PREPARE ? 0 : requiredBoardPlacements(game.board,game.player.hand.length,MAX_PLACED_CARDS_PER_ACTION,sealedSlots);
  const filledOriginal = draft.filter(p=>game.board[p.slot] == null && !sealedSlots.includes(p.slot)).length;
  const myTurn = [TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(game.phase) && game.actor==='player';
  const energy = game.boost?.player?.energy ?? 0;
  const target = game.boost?.player?.target ?? 6;
  const placedIds = useMemo(() => draft.map(placement=>placement.card.id),[draft]);
  const eligibleBoostCards=useMemo(()=>game.player.hand.filter(card=>!placedIds.includes(card.id)),[game.player.hand,placedIds]);
  const boostChoices=useMemo(()=>getBoostCalculationSuggestions(game.player.hand,placedIds,target).filter(choice=>isPhase13BoostAllowed(game,choice)),[game.player.hand,placedIds,target]);
  const selectedBoostCards=boostCardIds.map(id=>eligibleBoostCards.find(card=>String(card.id)===String(id)));
  const boostValid=energy>=boostCost && selectedBoostCards.every(Boolean) &&
    checkBoostCalculation(selectedBoostCards[0],selectedBoostCards[1],boostOperation,target) && isPhase13BoostAllowed(game,{operation:boostOperation});
  const currentTier=BOOST_LEVELS.find(level=>level.cost===boostCost);
  const canAttack = myTurn && draft.length && filledOriginal>=required && Boolean(chosenWeapon?.canFire) && (!boostEnabled || boostValid);
  // Un orologio per fase, senza ripartire dopo i cambi. Le penalità riducono
  // soltanto il tempo personale; il conteggio dell'altro resta invariato.
  useEffect(() => {
    const max = current.current.campaignEnvironment ? getPhase13Time(current.current) : getPhase3Time(current.current.phase);
    if (max == null) { setSeconds(null);setEnemySeconds(null);return; }
    setSeconds(max);setEnemySeconds(max);
    const startedAt = Date.now();
    let completed = false, pausedSince=null, pausedMs=0;
    const interval = setInterval(() => {
      const active = current.current;
      const now=Date.now();
      if(mobiusPauseRef.current){if(pausedSince===null)pausedSince=now;return;}
      if(pausedSince!==null){pausedMs+=now-pausedSince;pausedSince=null;}
      const elapsed = (now-startedAt-pausedMs)/1000;
      if (active.phase===TURN_PHASES.PREPARE) {
        const playerLeft=getPhase6RemainingSeconds(active,'player',elapsed);
        setSeconds(playerLeft);
        setEnemySeconds(getPhase6RemainingSeconds(active,'enemy',elapsed));
        const next=expirePhase6Preparation(active,elapsed);
        if(next!==active) apply(()=>next);
      } else {
        const remaining=Math.max(0,Math.ceil(max-elapsed));
        setSeconds(remaining);
        if(remaining===0 && !completed) {
          completed=true;
          apply(s=>commitCombatMove(s,s.actor,[],true));
        }
      }
    },120);
    return ()=>clearInterval(interval);
  },[currentTurnKey,apply]);
  // Animazione risoluzione (non consuma secondi di decisione).
  useEffect(()=>{
    if (game.phase!==TURN_PHASES.ANIMATE) return;
    const id=setTimeout(()=>{apply(s=>s.campaignEnvironment ? finishPhase16BAnimation(s) : finishPhase6Animation(s));},POKER_VOLLEY_ANIMATION_MS);
    return ()=>clearTimeout(id);
  },[game.phase,game.round,apply]);
  // Il computer dispone sempre dei propri 20 secondi, ma non conferma
  // istantaneamente: 0.8 s analisi, posa visibile a più riprese, conferma a 3.2 s.
  // È UNA sola mossa reale; le carte anticipate sono soltanto un'anteprima grafica.
  useEffect(()=>{
    if (![TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(game.phase) || game.actor!=='enemy') {
      setAiPreview(null);return;
    }
    const key=`${game.round}:${game.phase}:enemy`;
    setAiPreview({key,stage:'thinking',placements:[]});
    let plan=null;
    const ids=[];
    ids.push(setTimeout(()=>{
      const s=current.current;
      if(s.actor!=='enemy'||s.round!==game.round||s.phase!==game.phase)return;
      const suggestion=planPhase9Attack(s,'enemy',{maxEvaluations:2200});
      const blocked=s.phase16B?.enemy?.lockedWeapon;
      const usable=Boolean(suggestion && getWeaponDefinition(suggestion.weaponId)?.weaponClass!==blocked);
      plan={placements:usable?suggestion.placements:[],weaponId:usable?suggestion.weaponId:null,
        boost:usable && s.phase16B?.enemy?.boostBlocked===0 && suggestion?.boost && isPhase13BoostAllowed(s,suggestion.boost) ? suggestion.boost : null};
      setAiPreview({key,stage:usable?'select':'pass',placements:[]});
    },750));
    ids.push(setTimeout(()=>{
      if(plan)setAiPreview({key,stage:plan.placements.length?'placing':'pass',placements:plan.placements.slice(0,Math.max(1,Math.ceil(plan.placements.length/2)))});
    },1450));
    ids.push(setTimeout(()=>{
      if(plan)setAiPreview({key,stage:plan.placements.length?'confirm':'pass',placements:plan.placements});
    },2250));
    ids.push(setTimeout(()=>{
      apply(s=>{
        if(s.phase!==game.phase||s.round!==game.round||s.actor!=='enemy')return s;
        // Se l'AI non ha un piano valido, PASSA; non introdurre mosse inventate.
        return commitCombatMove(s,'enemy',plan?.placements||[],!plan?.placements?.length,plan?.weaponId||null,plan?.boost||null,'heavy');
      });
    },3200));
    return ()=>ids.forEach(clearTimeout);
  },[game.phase,game.actor,game.round,apply]);
  useEffect(()=>{
    if (game.phase!==TURN_PHASES.PREPARE || game.ready.enemy) return;
    const id=setTimeout(()=>apply(s=>{
      let next=s;
      if(next.phase16B?.enemy?.diceReady)next=activatePhase16BDice(next,'enemy');
      const choice=next.phase16B?.enemy?.malusChoices?.[0];
      if(choice&&next.phase===TURN_PHASES.PREPARE)next=activatePhase16BMalus(next,'enemy',choice);
      if(next.winner)return {...next,phase:TURN_PHASES.FINISHED};
      if(next.campaignEnvironment)next=activatePhase17EEnemyModuleIfReady(next);
      if(next.winner)return {...next,phase:TURN_PHASES.FINISHED};
      return next.campaignEnvironment?.swapsDisabled ? preparePhase13AI(next) : executePhase9Preparation(next,'enemy');
    }),2100);
    return ()=>clearTimeout(id);
  },[game.phase,game.ready.enemy,game.round,apply]);
  useEffect(()=>{setDraft([]);setSelectedHandIndex(null);setSwapIndices([]);setEtherHandIndex(null);setSelectedWeaponId(null);setBoostEnabled(false);setBoostCardIds(['','']);setBoostCost(15);setBoostOperation('+');},[currentTurnKey]);

  const putCard = (handIndex, slotIndex=null) => {
    if(!myTurn) return;
    const card=game.player.hand[handIndex];
    if(!card || draft.some(p=>p.card.id===card.id)) return;
    const existingDraft = draft.find(p=>p.slot===slotIndex);
    if(slotIndex!=null && sealedSlots.includes(slotIndex)){setMessage('Slot temporaneamente sigillato dall’anomalia');return;}
    const available=game.board.map((c,i)=> c == null && !sealedSlots.includes(i) && !draft.some(p=>p.slot===i) ? i : -1).find(i=>i>=0);
    let slot=slotIndex;
    if(slot==null) slot=available;
    if(slot==null || slot<0){ setSelectedHandIndex(handIndex);setMessage('Seleziona uno slot occupato da sostituire.');return; }
    if(game.board[slot] && available!==undefined && slotIndex!=null && !existingDraft){slot=available;}
    if(draft.length>=MAX_PLACED_CARDS_PER_ACTION && !existingDraft){setMessage('Massimo quattro carte per mossa.');return;}
    setDraft(prev=>[...prev.filter(p=>p.slot!==slot),{slot,card}]);
    setSelectedHandIndex(null);setMessage('');
  };
  const confirmMove = () => {
    if(!canAttack){setMessage(`Servono ${required} riempimenti obbligatori, una combinazione compatibile e almeno 2 munizioni.`);return;}
    const check=applyBoardPlacements(game.board,draft,{availableCardIds:game.player.hand.map(c=>c.id),blockedSlots:sealedSlots});
    if(!check.valid){setMessage(`Mossa non valida: ${check.error}`);return;}
    apply(s=>commitCombatMove(s,'player',draft,false,chosenWeapon.weaponId,boostEnabled?{cost:boostCost,operation:boostOperation,cardIds:boostCardIds}:null,bombTargetClass));
  };
  const enemyMove=game.moves.enemy?.score;
  const playerMove=game.moves.player?.score;
  const phaseLabel = game.phase===TURN_PHASES.ATTACK ? 'ATTACCO' : game.phase===TURN_PHASES.RESPONSE ? 'RISPOSTA' : game.phase===TURN_PHASES.PREPARE ? 'PREPARAZIONE' : game.phase===TURN_PHASES.FINISHED ? 'BATTAGLIA CONCLUSA' : 'SCONTRO';
  const moveSummary = (move, fallback) => move?.score ? `${getWeaponDefinition(move.weaponId)?.name || 'Arma'} · ${move.score.label} (${move.score.cardIds.length} carte)${move.boost ? ' · ⚡ Boost preparato' : ''}` : move?.passed ? 'PASSA' : fallback;
  const result=game.result;
  const duelAudit=useMemo(()=>auditPhase10Duel(game),[game]);
  const handoff=useMemo(()=>game.phase===TURN_PHASES.FINISHED ? createPhase10Handoff(game,battleContext) : null,[game,battleContext]);
  return createPortal(<div className="phase3-backdrop" role="dialog" aria-modal="true" aria-label={campaignMode?"Battaglia campagna Botta e Risposta":"Collaudo Fase 10 Eclissi Stellare"}>
    <div className="phase3-panel classic-poker-mode">
      {mobiusPopupVisible&&<div role="dialog" aria-modal="true" aria-label="Anello di Möbius attivato" style={{position:'fixed',inset:0,zIndex:50000,background:'rgba(0,7,22,.94)',display:'flex',justifyContent:'center',alignItems:'center',padding:20}}>
        <div style={{maxWidth:520,width:'100%',textAlign:'center',padding:25,background:'linear-gradient(145deg,#10172f,#0c2433)',border:'2px solid #38e8ff',borderRadius:18,boxShadow:'0 0 60px rgba(0,232,255,.3)'}}>
          <div className="phase16c-mobius-symbol" style={{fontSize:45,marginBottom:6}}>🌀✨</div>
          <h2 style={{color:'#aaf4ff',margin:'0 0 12px'}}>ANELLO DI MÖBIUS ATTIVATO</h2>
          <p>Il mazzo è stato riordinato. La tua combinazione futura è:</p>
          <h3 style={{fontSize:25,color:'#fbd37b'}}>{game.phase16C.mobius.announcement.pattern}</h3>
          <p style={{fontSize:14}}>Carte già in mano: {game.phase16C.mobius.announcement.already}. Carte preparate nelle prossime dieci pescate: {game.phase16C.mobius.announcement.missing}.</p>
          <div className="phase16c-mobius-cards" style={{display:'flex',justifyContent:'center',gap:5,flexWrap:'wrap',margin:'18px 0'}}>{game.phase16C.mobius.announcement.cards.map(card=><PokerCard key={card.id} card={card} small disabled/>)}</div>
          <p>Conserva queste carte: sarai tu a decidere quando attivare l'arma.</p>
          <p style={{fontSize:12,color:'#9fc3d5'}}>Il timer è in pausa durante questa comunicazione.</p>
          <button type="button" className="primary" onClick={()=>setMobiusPopupDismissed(true)}>HO CAPITO · CONTINUA</button>
        </div>
      </div>}
      <div className="phase3-header"><div><b>⚔️ ECLISSI STELLARE</b><span>{pveMode?"PVE · POKER":pvpBotMode?"PVP DI LANCIO · AVVERSARIO IA · POKER":fixedLoadout?"SFIDA DEL GIORNO · POKER A EQUIPAGGIAMENTO UGUALE":campaignMode?"CAMPAGNA · BOTTA E RISPOSTA":"FASE 10 · COLLAUDO INTEGRATO · CAMPAGNA INVARIATA"}</span></div><button onClick={() => {if((!campaignMode&&!pvpBotMode) || window.confirm("Abbandonare la battaglia senza ricompense?")) onClose?.();}} className="phase3-close">{campaignMode||pvpBotMode?"ABBANDONA BATTAGLIA ✕":"TORNA ALLA CLASSICA ✕"}</button></div>
      <ClassicPokerFieldBridge
        mode={pveMode?'PVE · POKER':pvpBotMode?'PVP · PILOTA IA':fixedLoadout?'SFIDA DEL GIORNO':campaignMode?'CAMPAGNA · POKER':'DUELLO POKER'}
        phase={game.phase} round={game.round} seconds={seconds} enemySeconds={enemySeconds} actor={game.actor} readyEnemy={Boolean(game.ready.enemy)}
        hp={game.phase===TURN_PHASES.ANIMATE && hpBeforeVolley ? hpBeforeVolley : game.hp} initialHp={game.initialHp} ammo={game.ammo}
        playerEther={game.player.ether||0} playerMalus={game.phase16B?.player?.malusCharge||0}
        enemyMalus={game.phase16B?.enemy?.malusCharge||0} playerModule={game.phase16F?.player}
        enemyModule={game.phase16F?.enemy} playerDice={game.phase16B?.player}
        enemyDice={game.phase16B?.enemy} goldenCard={game.player.hand.find(card=>card?.isGolden)}
        frozenClasses={['light','medium','heavy'].filter(cls=>isPhase17WeaponFrozen(game,'player',cls))}
        hand={game.player.hand} opponentHandSize={game.enemy.hand.length}
        deckSize={game.player.deck.length} opponentDeckSize={game.enemy.deck.length}
        board={displayBoard} blockedSlots={sealedSlots} draftSlots={draft.map(p=>p.slot)}
        aiPreviewSlots={liveAiPreview?.placements?.map(p=>p.slot)||[]} aiStatus={aiStatus}
        selectedHand={game.player.hand.map((card,i)=>(myTurn?(selectedHandIndex===i||draft.some(p=>p.card.id===card.id)):swapIndices.includes(i))?i:-1).filter(i=>i>=0)}
        arsenal={game.arsenal} weaponLevels={game.weaponLevels}
        selectedWeaponId={chosenWeapon?.weaponId} weaponOptions={availableWeapons.filter(o=>o.canFire)}
        onSelectWeapon={setSelectedWeaponId}
        onAbandon={()=>{if((!campaignMode&&!pvpBotMode)||window.confirm("Abbandonare la battaglia senza ricompense?"))onClose?.();}}
        onCardClick={i=>{
          const card=game.player.hand[i];if(!card)return;
          if(myTurn){
            if(draft.some(p=>p.card.id===card.id))return;
            const anyEmpty=draftBoard.some((c,j)=>c==null&&!sealedSlots.includes(j));
            if(anyEmpty)putCard(i);
            else{setSelectedHandIndex(i);setMessage('Tocca lo slot da sostituire.');}
          }else if(game.phase===TURN_PHASES.PREPARE&&!game.ready.player){
            setSwapIndices(prev=>prev.includes(i)?prev.filter(x=>x!==i):prev.length<3?[...prev,i]:prev);
          }
        }}
        onSlotClick={i=>selectedHandIndex!=null&&putCard(selectedHandIndex,i)}
        onPlaceCard={(handIndex,slotIndex)=>putCard(handIndex,slotIndex)}
        canPlay={myTurn} canPrepare={game.phase===TURN_PHASES.PREPARE&&!game.ready.player}
        onAttack={confirmMove} canAttack={Boolean(canAttack)}
        onClear={()=>{setDraft([]);setSwapIndices([]);setSelectedHandIndex(null);setMessage('');}}
        onPass={()=>apply(state=>commitCombatMove(state,'player',[],true))}
        onSwap={()=>{if(apply(state=>state.campaignEnvironment?exchangePhase16BCards(state,'player',swapIndices):exchangePhase6Cards(state,'player',swapIndices)))setSwapIndices([]);}}
        onReady={()=>apply(state=>campaignMode?markPhase16BReady(state,'player'):markPhase6Ready(state,'player'))}
        exchangesLeft={game.player.exchangesLeft}
        ready={Boolean(game.ready.player)} comboLabel={combo?.label||''}
        result={game.phase===TURN_PHASES.FINISHED?{...result,winner:game.winner}:result}
        volley={game.phase===TURN_PHASES.ANIMATE ? game.result?.volleys : null}
        volleyOpener={game.opener}
        finished={game.phase===TURN_PHASES.FINISHED}
        onFinish={(campaignMode||pvpBotMode||pveMode)&&handoff?.ok&&duelAudit.ok&&!submittedCampaignResult.current?submitCampaignOutcome:null}
        systemsAvailable onOpenSystems={()=>{if(advancedToolsRef.current){advancedToolsRef.current.open=true;advancedToolsRef.current.scrollIntoView({behavior:'smooth',block:'start'});}}}
      />
      {message&&<div className="phase3-message" role="alert">{message}</div>}
      <details ref={advancedToolsRef} className="classic-poker-advanced">
        <summary>⚙ MODULI, BOOST, SELEZIONE ARMI E DETTAGLI BATTAGLIA</summary>
        <div className="classic-poker-advanced-content">
      <div className="phase9-mode-banner">{modeDescription.label}{modeDescription.isBoss ? " · BOSS" : ""} · {pvpBotMode?"AVVERSARIO SIMULATO · RISULTATO LOCALE (NON VERIFICATO SERVER)":fixedLoadout?"SFIDA GIORNALIERA · UNA SOLA PARTITA · CLASSIFICA DI LANCIO":campaignMode?"SETTORE DI CAMPAGNA · ESITO E RICOMPENSE DOPO CONFERMA":"SIMULAZIONE: nessuna ricompensa o progresso salvato"}</div>
      {campaignMode && game.campaignEnvironment && <div className="phase9-mode-banner">
        CAMPO: {game.campaignEnvironment.modifier} · ANOMALIA: {game.campaignEnvironment.anomaly}
        {game.campaignEnvironment.blockedBoostOp?` · Operatore Boost ${game.campaignEnvironment.blockedBoostOp} bloccato`:''}
        {game.campaignEnvironment.swapsDisabled?' · Cambi vietati':''}
        {game.campaignBossTrack?.sector===10?' · BOSS: UNA SOLA BARRA HP':''}
      </div>}
      {campaignMode && game.phase17Anomalies?.sector===10 && <div className="phase9-mode-banner" role="status" aria-live="polite" style={{borderColor:game.phase17Anomalies.active?'#e6a957':'#5687a2'}}>
        <strong>⚠️ ANOMALIE BOSS</strong> · {getPhase17AnomalyNotice(game)||'Nessuna attiva — il campo può cambiare durante la battaglia'}
        {game.phase17Anomalies.events?.length>0&&<div>{game.phase17Anomalies.events.join(' · ')}</div>}
      </div>}
      {campaignMode && game.campaignTactics && <div className="phase9-mode-banner">PILOTI: {getCampaignPilotV2(game.campaignTactics.pilots.player)?.name} · Lv {game.campaignTactics.levels.player} / {getCampaignPilotV2(game.campaignTactics.pilots.enemy)?.name} · Lv {game.campaignTactics.levels.enemy}</div>}
      {campaignMode && getPhase16DBossBrief(game) && <div className="phase9-mode-banner" role="status" aria-live="polite" style={{borderColor:'#e4b15a'}}>
        <strong>👑 BOSS · {getPhase16DBossBrief(game).name}</strong> — {getPhase16DBossBrief(game).ability}: {getPhase16DBossBrief(game).status}
      </div>}
      {campaignMode && game.phase===TURN_PHASES.ANIMATE && game.result?.phase16DBossEffects?.length>0 && <div className="phase9-mode-banner phase14-effects" aria-live="polite"><strong>POTERE BOSS: </strong>{game.result.phase16DBossEffects.map((effect,i)=><span key={i}>{effect.description}{effect.amount?` (${effect.amount})`:''}{' · '}</span>)}</div>}
      {campaignMode && game.campaignTactics && <div className="phase9-mode-banner" role="status" style={{borderColor:'#52c9a5'}}>
        👤 PILOTA {PHASE16G_PILOTS[game.campaignTactics.pilots.player]?.name||getCampaignPilotV2(game.campaignTactics.pilots.player)?.name}:
        {' '}{getCampaignPilotAbilityDescription(game.campaignTactics.pilots.player)}
        {game.phase===TURN_PHASES.ANIMATE && game.result?.phase16GPilotEffects?.filter(e=>e.side==='player').map((e,i)=><span key={i}> · {e.description} +{e.amount} {e.kind==='hp'?'HP':e.kind==='ammo'?'munizioni':e.kind==='ether'?'Etere':'Boost'}</span>)}
      </div>}
      {campaignMode && game.legacyPassives && <div className="phase9-mode-banner">
        EQUIPAGGIAMENTO: {game.legacyPassives.loadout.deckId} · {game.legacyPassives.loadout.terrains.length} Terreni · {game.legacyPassives.loadout.epics.length} Epici
        {game.legacyPassives.loadout.terrains.length>0 && <div style={{fontSize:'0.7rem',marginTop:4}} aria-label="Stato Carte Terreno">
          {game.legacyPassives.loadout.terrains.map(t=><span key={t.id} title={describePhase16HTerrain(t.id,t.level)||t.name} style={{display:'inline-block',marginRight:8,opacity:game.legacyPassives.usedTerrain.includes(t.id)?0.58:1}}>
            {game.legacyPassives.usedTerrain.includes(t.id)?'◌ USATA':'◆ PRONTA'} {t.name} · Lv{t.level}
          </span>)}
        </div>}
      </div>}
      {campaignMode && game.phase16B && <div className="phase9-mode-banner" aria-live="polite">
        <b>FASE 16B:</b> 🎲 Dado {game.phase16B.player.diceReady?'PRONTO':`${game.phase16B.player.dicePatterns.length}/3 categorie`}
        {' · '}⚠️ Barra Malus {game.phase16B.player.malusCharge}/3
        {' · '}💣 {game.phase16B.bomb.onBoard?`Banco ${game.phase16B.bomb.onBoard.turnsLeft} scambi`:game.phase16B.bomb.inTank?`Serbatoio ${game.phase16B.bomb.inTank.weaponClass}, ${game.phase16B.bomb.inTank.turnsLeft} occasioni`:'Nessuna bomba attiva'}
        {' · '}Premi maturati 🌟{game.phase16B.earnings.dust} 💎{game.phase16B.earnings.diamonds} 🪙{game.phase16B.earnings.credits}
      </div>}
      {campaignMode && game.phase16F?.enemy?.id && <div className="phase9-mode-banner" role="status" aria-live="polite" style={{borderColor:'#e99174'}}>
        ◈ MODULO IA {PHASE16F_MODULES[game.phase16F.enemy.id]?.name} · {game.phase16F.enemy.ready?'PRONTO':`${game.phase16F.enemy.points}/${PHASE16F_MODULES[game.phase16F.enemy.id]?.threshold}`} · Lv {game.phase16F.enemy.level}
      </div>}
      {campaignMode && game.phase16F?.player?.id && <div className="phase9-mode-banner" role="status" aria-live="polite" style={{borderColor:'#a78bfa'}}>
        🔷 MODULO {PHASE16F_MODULES[game.phase16F.player.id]?.name} · {game.phase16F.player.ready?'PRONTO ⚡':`${game.phase16F.player.points}/${PHASE16F_MODULES[game.phase16F.player.id]?.threshold}`} · Attivazione in preparazione
      </div>}
      {campaignMode && game.phase16E && <div className="phase9-mode-banner" role="status" aria-live="polite" style={{borderColor:'#44aadd'}}>
        🃏 MAZZO {PHASE16E_DECKS[game.phase16E.id]?.name} · {describePhase16EDeck(game.phase16E.id,game.phase16E.level)}
        {game.phase16E.events?.length>0 && game.phase===TURN_PHASES.ANIMATE && <div>{game.phase16E.events.join(' · ')}</div>}
      </div>}
      {campaignMode && game.phase16B?.bomb?.inTank && <div className="phase9-mode-banner" role="status">💣 BOMBA NEL SERBATOIO {game.phase16B.bomb.inTank.weaponClass.toUpperCase()} DI {game.phase16B.bomb.inTank.receiver==='player'?'TUO':'COMPUTER'} · Attiva l'arma prima che scadano le tre occasioni.</div>}
      {campaignMode && game.phase16B?.events?.length>0 && game.phase===TURN_PHASES.ANIMATE && <div className="phase9-mode-banner" aria-live="polite">{game.phase16B.events.join(' · ')}</div>}
      {game.result?.legacyPassivesLog?.length>0 && game.phase===TURN_PHASES.ANIMATE && <div className="phase9-mode-banner phase14-effects" aria-live="polite"><strong>PASSIVI CAMPAGNA: </strong>{game.result.legacyPassivesLog.map((e,i)=><span key={i}>{e.name}: {e.kind} +{e.amount} · </span>)}</div>}

      {game.result?.weaponEffectsLog?.length>0 && game.phase===TURN_PHASES.ANIMATE && <div className="phase9-mode-banner phase14-effects" aria-live="polite"><strong>EFFETTI ARMI: </strong>{game.result.weaponEffectsLog.map((e,i)=><span key={i}>{e.side==='player'?'TU':'CPU'} · {e.description} ({e.amount}){' · '}</span>)}</div>}
      {campaignMode && game.result?.campaignEffects?.length>0 && game.phase===TURN_PHASES.ANIMATE && <div className="phase9-mode-banner" aria-live="polite">{game.result.campaignEffects.map((e,i)=><span key={i}>{e.side==='player'?'TU':'AVVERSARIO'} · {e.description}: {e.kind==='damage'?'−': '+'}{e.amount} {e.kind==='boost'?'Boost':e.kind==='ammo'?'munizioni':e.kind==='status'?'veleno futuro':'HP'} {'  ·  '}</span>)}</div>}
      {!duelAudit.ok && <div role="alert" className="phase9-mode-banner" style={{color:"#ff9a9a"}}>CONTROLLO INTEGRITÀ: {duelAudit.errors.slice(0,2).join(" · ")}</div>}
      <div className="phase3-status">
        <div><small>SCAMBIO</small><strong>{game.round}</strong></div>
        <div className="phase3-phase"><small>FASE</small><strong>{phaseLabel}</strong><span>{game.phase===TURN_PHASES.PREPARE?'Entrambi preparano la mano':game.phase===TURN_PHASES.ANIMATE?'Timer in pausa':game.phase===TURN_PHASES.FINISHED?'Partita terminata':`${labelSide(game.actor)} deve giocare`}</span></div>
        <div className={`phase3-clock ${seconds!==null && seconds<=5?'critical':''}`}><small>{game.phase===TURN_PHASES.PREPARE?'TUO TEMPO RIMASTO':'TEMPO MASSIMO'}</small><strong>{seconds===null?'⏸':game.phase===TURN_PHASES.PREPARE&&game.ready.player?'PRONTO':`${seconds}s`}</strong></div>
      </div>
      <div className="phase4-health-row">
        {['player','enemy'].map(side=><div className="phase4-health" key={side}>
          <span>{labelSide(side)} · HP <b>{game.hp[side]} / {game.initialHp[side]}</b></span>
          <div className="phase4-health-track"><div style={{width:`${100*game.hp[side]/game.initialHp[side]}%`}}/></div>
          <small>Munizioni: {Object.entries(SUITS).map(([s,sym])=>`${sym} ${game.ammo[side][s]}`).join('  ·  ')}</small><small>Etere: <b>{game[side].ether} 🔮</b></small><small>⚡ Energia Boost: <b>{game.boost?.[side]?.energy ?? 0}/45</b>{side==='player'?` · Bersaglio ${game.boost.player.target}`:''}</small><small>Effetti attivi: {activeWeaponEffects(game.weaponEffects?.[side])}</small>
        </div>)}
      </div>
      {game.phase===TURN_PHASES.FINISHED && <div className="phase3-outcome">{game.winner==='draw'?'PAREGGIO':`${labelSide(game.winner)} VINCE LA BATTAGLIA${campaignMode||pvpBotMode?'':' DI PROVA'}`}<div style={{fontSize:'0.72rem',marginTop:7}}>{pvpBotMode?'Risultato contro IA: ricompense locali, non classifica umana verificata':fixedLoadout?'Risultato Poker verificato, pronto alla classifica giornaliera':campaignMode?'Risultato di campagna verificato e pronto alla registrazione':`Rapporto Fase 10: ${handoff?.ok?'stato verificato':'verifica incompleta'} · ${game.round} scambi · nessun premio o avanzamento registrato`}</div>
        {(campaignMode||pvpBotMode||pveMode) && <button type="button" className="primary" disabled={!handoff?.ok||!duelAudit.ok||submittedCampaignResult.current} onClick={submitCampaignOutcome} style={{marginTop:12,padding:'10px 18px',borderRadius:8,fontWeight:900,cursor:'pointer'}}>{submittedCampaignResult.current?'RISULTATO REGISTRATO':'✓ CONCLUDI BATTAGLIA'}</button>}
      </div>}
      {game.round===1 && game.phase===TURN_PHASES.ATTACK && !game.moves.player && !game.moves.enemy && <div className="phase4-loadout">
        <strong>ARSENALE PERSONALE · puoi scegliere solo le armi già sbloccate nello Shop</strong>
        <div className="phase4-loadout-controls">{['light','medium','heavy'].map(cls=><label key={cls}>{CLASS_LABELS[cls]}
          <select value={game.arsenal.player[cls]||''} disabled={fixedLoadout||(cls==='heavy'&&campaignFeatures&&!campaignFeatures.allowHeavy)} onChange={e=>apply(s=>setPhase4EquippedWeapon(s,'player',cls,e.target.value))}>
            {game.arsenal.player[cls]===null && <option value="">BLOCCATA / NON EQUIPAGGIATA</option>}
            {ARSENAL_48.filter(w=>w.weaponClass===cls && authorizedArmory.owned[w.id] && (!campaignFeatures || campaignFeatures.sector>=({common:1,rare:21,epic:51,legendary:91}[w.rarityKey]||1))).map(w=><option key={w.id} value={w.id}>{w.rarity} · {w.name} · {w.ammoSymbol}</option>)}
          </select></label>)}</div>
      </div>}
      <div className="phase8-enemy-arsenal" aria-label="Armi equipaggiate dal computer">
        <strong>ARSENALE AVVERSARIO</strong>
        <div className="phase8-enemy-weapon-slots">{['light','medium','heavy'].map(cls=>{
          const w=getWeaponDefinition(game.arsenal.enemy[cls]);
          const firing=game.phase===TURN_PHASES.ANIMATE && result?.volleys?.enemy?.weaponId===w?.id && (result?.volleys?.enemy?.shots||0)>0;
          return <div className={`phase8-enemy-weapon-tile ${firing?'phase8-firing-origin':''}`} key={cls} style={{borderColor:w?.rarityColor||'#2d7890'}}>
            <WeaponCardArt weapon={w}/><span>{CLASS_LABELS[cls]} · {w?.name||'Slot non equipaggiato'}</span>

          </div>;
        })}</div>
      </div>
      <div className="phase4-armed-slots">{['light','medium','heavy'].map(cls=>{
        const w=getWeaponDefinition(game.arsenal.player[cls]);

        const firing=game.phase===TURN_PHASES.ANIMATE && result?.volleys?.player?.weaponId===w?.id && (result?.volleys?.player?.shots||0)>0;
        return <div className={`phase4-weapon-tile ${firing?'phase8-firing-origin':''}`} key={cls} style={{borderColor:w?.rarityColor||'#2d7890'}}>
          <WeaponCardArt weapon={w}/>
          <div><small>{CLASS_LABELS[cls]} · {w?.rarity||'Da sbloccare'}{isPhase17WeaponFrozen(game,'player',cls)?' · ❄️ CONGELATA':''}</small><b>{w?.name||'SLOT VUOTO'}</b><span>{w?`${w.ammoSymbol} · ${w.effect.name} · LV ${game.weaponLevels?.player?.[cls]||1}`:'Disponibile dopo lo sblocco e l’acquisto'}</span></div>
        </div>;
      })}<div className="phase4-weapon-tile phase5-boost-active"><span className="phase4-weapon-icon">⚡</span><div>
        <small>QUARTO SLOT · {energy}/45 ENERGIA</small><b>BOOST MATEMATICO</b><span>Obiettivo {target} · +25% / +50% / +75%</span>
      </div></div></div>
      <div className="phase3-moves"><div>PRIMO: <b>{moveSummary(game.moves[game.opener],'In attesa')}</b></div><div>RISPOSTA: <b>{moveSummary(game.moves[game.opener==='player'?'enemy':'player'],'In attesa')}</b></div></div>
      {result && <div className="phase3-outcome">{result.winner===null?(result.damagePercent.every(p=>p===0)?'DOPPIO PASSAGGIO — NESSUNO SPARA':'PARITÀ — 50% A ENTRAMBI'):`VANTAGGIO ${labelSide(result.winner==='attacker'?game.opener:(game.opener==='player'?'enemy':'player'))}`} · {result.damagePercent[0]}% / {result.damagePercent[1]}% · Prossima iniziativa: {labelSide(result.nextOpener)}<div className="phase4-volley-row">{['player','enemy'].map(side=><div key={side}><b>{labelSide(side)}:</b> {result.volleys?.[side]?.weaponName||'PASSA'}{result.volleys?.[side]?.activationMode==='secondary'?' · ATTIVAZIONE ALTERNATIVA':''} · {result.volleys?.[side]?.shots||0} colpi · {result.volleys?.[side]?.damage||0} danni {result.volleys?.[side]?.boostApplied ? `(⚡ +${result.volleys?.[side]?.boostDamage} Boost, ${result.volleys?.[side]?.boostEnergySpent} energia)` : ''} · Energia guadagnata: +{result.boostEnergyGained?.[side]||0}</div>)}</div></div>}
      {/* Il riepilogo testuale e sopra. La VFX vera viene renderizzata una sola
          volta dentro ClassicBattleView da PokerCombatEffects.jsx. */}
      <div className="phase3-board-head"><strong>IL BANCO COMUNE</strong><span>{sealedSlots.length?"ANOMALIA: 3 SLOT ATTIVI · 2 SIGILLATI":"5 SLOT"} · FINO A 4 CARTE PER MOSSA</span></div>
      <div className="phase3-board">{draftBoard.map((card,i)=><PokerCard key={i} card={sealedSlots.includes(i)?null:card} bomb={!sealedSlots.includes(i)&&getBombMarkOnCard(game,card)} selected={draft.some(p=>p.slot===i)} placeholder={sealedSlots.includes(i)?"🔒 SIGILLATO":`SLOT ${i+1}`} onClick={()=>selectedHandIndex!=null&&putCard(selectedHandIndex,i)} disabled={sealedSlots.includes(i)||!myTurn||selectedHandIndex==null}/>)}</div>
      {myTurn && <div className="phase3-instructions">{filledOriginal} / {required} slot vuoti obbligatori riempiti · {draft.length}/4 carte posizionate · {combo?`Combinazione: ${combo.label}`:'Nessuna combinazione valida'} </div>}
      {myTurn && <div className="phase4-weapon-choices">
        <strong>SCELTA ARMA · il Poker conta prima del danno</strong>
        {availableWeapons.length===0?<p>Nessuna arma attivabile con le carte sul banco. Prova una combinazione diversa o passa.</p>:
          availableWeapons.map((o,i)=><button key={o.weaponId} type="button"
            className={`${chosenWeapon?.weaponId===o.weaponId?'phase4-picked':''}`}
            title={o.weapon.effect.description}
            disabled={!o.canFire} onClick={()=>setSelectedWeaponId(o.weaponId)}>
            <WeaponCardArt weapon={o.weapon} className="phase8-choice-thumb"/> {o.weapon.name} · {o.weapon.effect.name} · {o.score.label}{o.activationMode==='secondary'?' (salva alternativa ridotta)':''} · {o.weapon.ammoSymbol} {o.availableAmmo} · {o.previewShots ?? o.fullShots} colpi / {o.potentialDamage} danni
            {o.canFire && o.weaponId===recommendedWeapon?.weaponId?' ★ CONSIGLIATA':''}
            {o.adaptedByEpic?' · ⚡ ADATTAMENTO MATRICE':''}{!o.canFire?(o.frozenByAnomaly?' · ❄️ CONGELATA':o.heatBlocked?' · 🌡 SURRISCALDATA':' · MUNIZIONI INSUFFICIENTI'):''}
          </button>)}
      </div>}
      {myTurn && <section className="phase5-boost-panel" aria-label="Boost matematico opzionale">
        <div className="phase5-boost-head">
          <div><strong>⚡ BOOST MATEMATICO · OBIETTIVO {target}</strong><small>Energia disponibile: {energy}/45 · Usa esattamente 2 carte rimaste in mano</small></div>
          <button type="button" disabled={energy<15} className={boostEnabled?'phase5-toggle-active':''}
            onClick={()=>setBoostEnabled(prev=>!prev)}>{boostEnabled?'✓ BOOST SELEZIONATO · DISATTIVA':'ATTIVA BOOST (FACOLTATIVO)'}</button>
        </div>
        {energy<15 && <p className="phase5-hint">Perdi un confronto Poker valido per caricare il Boost. Il bersaglio rimane {target} fino a una riuscita attivazione.</p>}
        {boostEnabled && <>
          <div className="phase5-tiers">{BOOST_LEVELS.map(level=><button key={level.cost} type="button" disabled={energy<level.cost} className={boostCost===level.cost?'active':''}
            onClick={()=>setBoostCost(level.cost)}>{level.cost} energia · +{level.bonusPercent}%</button>)}</div>
          <div className="phase5-calc-grid">
            <label>Carta 1<select value={boostCardIds[0]} onChange={e=>setBoostCardIds([e.target.value,boostCardIds[1]])}>
              <option value="">Scegli carta</option>{eligibleBoostCards.map(c=><option key={c.id} value={c.id}>{cardLabel(c)} {suitOf(c)}</option>)}
            </select></label>
            <label>Operazione<select value={boostOperation} onChange={e=>setBoostOperation(e.target.value)}>
              {Object.entries({'+':'+','-':'−','*':'×','/':'÷'}).map(([op,label])=><option key={op} value={op} disabled={!isPhase13BoostAllowed(game,{operation:op})}>{label} · +{MATH_OPERATION_PREVIEW[op]}%{!isPhase13BoostAllowed(game,{operation:op})?' · BLOCCATO':''}</option>)}
            </select></label>
            <label>Carta 2<select value={boostCardIds[1]} onChange={e=>setBoostCardIds([boostCardIds[0],e.target.value])}>
              <option value="">Scegli carta</option>{eligibleBoostCards.map(c=><option key={c.id} value={c.id}>{cardLabel(c)} {suitOf(c)}</option>)}
            </select></label>
          </div>
          <div className="phase5-boost-footer"><button type="button" disabled={!boostChoices.length} onClick={()=>{
            const best=boostChoices[0];if(best){setBoostCardIds([...best.cardIds]);setBoostOperation(best.operation);}
          }}>✨ TROVA SOLUZIONE {boostChoices.length?`(${boostChoices.length})`:''}</button>
          <span className={boostValid?'phase5-valid':'phase5-invalid'}>{boostValid?`✓ Risultato ${target} · Bonus totale +${(currentTier?.bonusPercent||0)+MATH_OPERATION_PREVIEW[boostOperation]}% se vinci`:'Servono due carte disponibili e un calcolo esatto'}</span></div>
          <p className="phase5-hint">Le due carte e l’energia si consumano solo se vinci il Poker e spari. In caso di sconfitta o parità le conservi.</p>
        </>}
      </section>}
      {game.phase===TURN_PHASES.PREPARE && <div className="phase3-prepare-title">PREPARAZIONE SIMULTANEA — <b>{game.ready.player?'TU PRONTO':`TU ${seconds}s`}</b> · <b>{game.ready.enemy?'COMPUTER PRONTO':`COMPUTER ${enemySeconds}s`}</b></div>}
      <div className="phase3-hand-heading"><strong>LA TUA MANO ({game.player.hand.length})</strong><span>{myTurn?'Tocca una carta per riempire il banco; a banco pieno seleziona lo slot da sostituire':game.phase===TURN_PHASES.PREPARE?'Seleziona 1–3 carte, poi CAMBIA':'Aspetta la tua fase'}</span></div>
      <div className="phase3-hand">{game.player.hand.map((card,i)=><PokerCard key={`${card.id}-${i}`} small card={card} selected={myTurn?selectedHandIndex===i||draft.some(p=>p.card.id===card.id):swapIndices.includes(i)} disabled={game.phase===TURN_PHASES.ANIMATE||game.phase===TURN_PHASES.FINISHED||game.phase===TURN_PHASES.PREPARE&&game.ready.player} onClick={()=>{
        if(myTurn){if(draft.some(p=>p.card.id===card.id))return;const anyEmpty=draftBoard.some((c,i)=>c==null&&!sealedSlots.includes(i));if(anyEmpty)putCard(i);else {setSelectedHandIndex(i);setMessage('Tocca lo slot che vuoi sostituire.');}}
        else if(game.phase===TURN_PHASES.PREPARE){setSwapIndices(prev=>prev.includes(i)?prev.filter(x=>x!==i):prev.length<3?[...prev,i]:prev);}
      }}/>)}</div>
      {message && <div role="alert" className="phase3-message">{message}</div>}
      {myTurn && game.phase16B?.bomb?.onBoard && <div className="phase9-mode-banner">
        💣 Se utilizzi la carta con Bomba, scegli il serbatoio avversario:
        <select value={bombTargetClass} onChange={e=>setBombTargetClass(e.target.value)}>
          <option value="light">Leggera</option><option value="medium">Media</option><option value="heavy">Pesante</option>
        </select>
      </div>}
      {myTurn && <div className="phase3-actions"><button disabled={!canAttack} className="primary" onClick={confirmMove}>⚡ ATTACCA {combo?`· ${combo.label}`:''}</button><button onClick={()=>{setDraft([]);setSelectedHandIndex(null);setMessage('');}}>ANNULLA POSIZIONAMENTI</button><button onClick={()=>apply(s=>commitCombatMove(s,'player',[],true))}>PASSA TURNO</button></div>}
      {game.phase===TURN_PHASES.PREPARE && <div className="phase3-prep-actions">
        <div className="phase3-prepare-resources"><span>CAMBI DISPONIBILI: <b>{game.player.exchangesLeft}/2</b></span><span>ETERE: <b>{game.player.ether} 🔮</b></span><span>Penalità tempo tua: <b>-{game.preparation?.timePenaltySeconds?.player||0}s</b></span></div>
        <div className="phase6-cost-guide" aria-label="Costo dei cambi carta">
          <b>COSTI DI OGNI OPERAZIONE</b>
          <span>1 carta: <strong>+3 HP al nemico</strong></span>
          <span>2 carte: <strong>+3 HP nemico e −3s tuoi</strong></span>
          <span>3 carte: <strong>+3 HP nemico, −3s tuoi e −3 HP tuoi</strong></span>
          {swapIndices.length>0 && <em>Se confermi {swapIndices.length} {swapIndices.length===1?'carta':'carte'}, le penalità si applicano subito. Il tempo dell'altro giocatore non cambia.</em>}
        </div>
        {game.preparation?.lastAction?.side==='player' && <p className="phase6-last-action">{game.preparation.lastAction.type==='swap'?`Ultimo cambio: ${game.preparation.lastAction.count} carte · +${game.preparation.lastAction.enemyHeal} HP nemico · −${game.preparation.lastAction.ownTimeSeconds}s tuoi · −${game.preparation.lastAction.selfDamage} HP tuoi`:`Etere: spesi ${game.preparation.lastAction.cost} 🔮 per scegliere dal mazzo`}</p>}
        {campaignMode && game.phase16F?.player?.id && <div className="phase15-epics" aria-label="Modulo Abilità equipaggiato">
          <strong>🔷 MODULO · {PHASE16F_MODULES[game.phase16F.player.id]?.name}</strong>
          <p>Carica: {game.phase16F.player.points}/{PHASE16F_MODULES[game.phase16F.player.id]?.threshold} · {PHASE16F_CHARGE_LABELS[PHASE16F_MODULES[game.phase16F.player.id]?.charge]} · Lv {game.phase16F.player.level}</p>
          <div className="phase3-actions"><button className={game.phase16F.player.ready?'primary':''}
            disabled={!game.phase16F.player.ready||game.ready.player}
            onClick={()=>apply(s=>activatePhase16FModule(s,'player'))}>⚡ {game.phase16F.player.ready?'ATTIVA MODULO':'MODULO IN RICARICA'}</button></div>
          {game.phase16F.player.guard>0&&<p>🛡 Protezione predisposta: {game.phase16F.player.guard}</p>}
        </div>}
        {campaignMode && game.phase16B && <div className="phase15-epics">
          <strong>🎲 DADO QUANTICO · 3 categorie diverse ({game.phase16B.player.dicePatterns.join(' / ')||'nessuna'})</strong>
          <div className="phase3-actions"><button disabled={game.ready.player||!game.phase16B.player.diceReady} onClick={()=>apply(s=>s.phase16C?.equipped.includes('epic_item_3')?offerPhase16CDice(s):activatePhase16BDice(s,'player'))}>🎲 {game.phase16C?.equipped.includes('epic_item_3')?'MOSTRA 2 FACCE':'LANCIA DADO'} {game.phase16B.player.diceReady?'✓ PRONTO':''}</button></div>
          {game.phase16C?.diceOffer && <div className="phase3-actions">{game.phase16C.diceOffer.map((face,i)=><button key={i} disabled={game.ready.player} onClick={()=>apply(s=>selectPhase16CDice(s,i))}>🎲 SCEGLI {i+1}: {PHASE16C_DICE_LABELS[face]}</button>)}</div>}
          {game.phase16B.lastDice?.side==='player'&&<span>Ultima faccia: {game.phase16B.lastDice.face}</span>}
          {!!game.phase16B.player.malusChoices.length && <><strong>⚠️ BARRA MALUS · scegli UNO dei tre sabotaggi</strong>
            <div className="phase3-actions">{game.phase16B.player.malusChoices.map(id=><button key={id} disabled={game.ready.player} onClick={()=>apply(s=>activatePhase16BMalus(s,'player',id))}>{MALUS_EFFECTS.find(x=>x.id===id)?.name||id}</button>)}</div></>}
          {game.phase16B.player.spying?.length>0 && <span>Spionaggio: {game.phase16B.player.spying.map(c=>`${c.value} ${SUITS[c.suit]||c.suit}`).join(' · ')}</span>}
          {game.phase16B.player.weaponRevealed && <span>Armi avversarie: {Object.entries(game.arsenal.enemy).map(([slot,id])=>`${CLASS_LABELS[slot]||slot} ${getWeaponDefinition(id)?.name||id}`).join(' · ')}</span>}
        </div>}
        {campaignMode && game.legacyPassives?.loadout.terrains.some(t=>t.level>=2 && t.rearmCost>=1) && <div className="phase15-epics">
          <strong>CARTE TERRENO · riarmo facoltativo una volta per battaglia</strong>
          <div className="phase3-actions">{game.legacyPassives.loadout.terrains.filter(t=>t.level>=2&&t.rearmCost>=1).map(item=><button key={item.id}
            disabled={game.ready.player||!game.legacyPassives.usedTerrain.includes(item.id)||game.legacyPassives.rearmedTerrains.includes(item.id)||game.player.ether<item.rearmCost}
            onClick={()=>apply(s=>rearmPhase15Terrain(s,'player',item.id))}>{item.name} · RIARMA ({item.rearmCost} 🔮)</button>)}</div>
        </div>}
        {campaignMode && game.phase16C?.equipped.length>0 && <div className="phase15-epics">
          <strong>✨ FASE 16C · OGGETTI EPICI PASSIVI</strong>
          <div>{game.phase16C.equipped.map(id=><span key={id} style={{display:'inline-block',margin:'4px 8px 4px 0',padding:'5px 9px',border:'1px solid #777',borderRadius:8}}>{PHASE16C_EPICS[id]}</span>)}</div>
          {game.phase16C.notice&&<p role="status">✨ {game.phase16C.notice}</p>}
          {game.phase16C.pendulum.active&&<p role="status">⏳ PENDOLO: cambi gratuiti per questa preparazione (massimo due)</p>}
          {game.phase16C.matrix.available&&!game.phase16C.matrix.used&&<p role="status">⚡ MATRICE: Pesante con Coppia o Tris, disponibile UNA volta</p>}
          {game.phase16C.mobius.announcement&&<p role="status"><strong>🌀 MÖBIUS: {game.phase16C.mobius.announcement.pattern}</strong> · {game.phase16C.mobius.announcement.already} già in mano, {game.phase16C.mobius.announcement.missing} nelle prossime 10 pescate. Conserva le carte della combinazione!</p>}
          {game.phase16C.pendulum.active&&seconds!==null&&seconds>20&&<div className="phase3-ether"><b>⏳ PENDOLO · PROSSIME SEI CARTE (ancora {seconds-20}s di visione)</b><div>{game.phase16C.pendulum.visibleCards.map((card,i)=><PokerCard key={`pendulum-${i}`} card={card} small disabled />)}</div></div>}
          <div>🌡 Calore: {['light','medium','heavy'].map(wc=>`${CLASS_LABELS[wc]} ${getPhase16CHeat(game,'player',wc)}/${PHASE16C_HEAT_LIMIT}`).join(' · ')}{game.phase16C.equipped.includes('epic_item_7')?' · ❄️ MONOLITE: IMMUNITÀ':''}</div>
        </div>}
        <div className="phase3-actions"><button disabled={game.ready.player||(game.campaignEnvironment?.swapsDisabled&&game.phase16E?.id!=='ophiuchus')||swapIndices.length===0||game.player.exchangesLeft===0} onClick={()=>{if(apply(s=>s.campaignEnvironment ? exchangePhase16BCards(s,'player',swapIndices) : exchangePhase6Cards(s,'player',swapIndices)))setSwapIndices([]);}}>CAMBIA {swapIndices.length?`${swapIndices.length} CARTE`: 'CARTE'}</button><button disabled={game.ready.player||game.player.ether<(campaignMode?getPhase15EtherCost(game):PHASE6_ETHER_COST)||!game.player.deck.length||swapIndices.length!==1} onClick={()=>setEtherHandIndex(swapIndices[0])}>ESTRAI CON ETERE ({campaignMode?getPhase15EtherCost(game):PHASE6_ETHER_COST} 🔮)</button><button className="primary" disabled={game.ready.player} onClick={()=>apply(s=>campaignMode?markPhase16BReady(s,'player'):markPhase6Ready(s,'player'))}>✓ PRONTO</button></div>
        {etherHandIndex!=null && !game.ready.player && <div className="phase3-ether"><b>Seleziona la carta del mazzo da estrarre:</b><div>{game.player.deck.map((card,i)=><PokerCard key={`ether-${i}`} card={card} small onClick={()=>{if(apply(s=>campaignMode?trackPhase16FPreparation(extractPhase15WithEther(s,'player',etherHandIndex,i),'player','ether'):extractPhase6WithEther(s,'player',etherHandIndex,i))) {setEtherHandIndex(null);setSwapIndices([]);}}}/>)}</div><button onClick={()=>setEtherHandIndex(null)}>ANNULLA</button></div>}
      </div>}
      <p className="phase3-footnote">{campaignMode?"FASE 16H CAMPAGNA: otto Terreni principali, ricompense e missioni Poker; 33 moduli attivi, 12 mazzi planetari passivi, Oggetti Epici: Möbius, Pendolo, Calice, Monolite, Matrice, Astrolabio. I Terreni si attivano una volta per battaglia. Valori provvisori; controlla la relazione della Fase 15 per le conversioni ancora parziali.":"FASE 10: verifica integrità del duello, prevenzione dello stallo e AI tattica deterministica che usa carte proprie e informazioni pubbliche; preparazione con scelte e costi effettivi. Preparazione simultanea con tempo personale: +3 HP al nemico per cambio, -3s per 2+ carte, -3 HP propri per 3 carte. Campagna e salvataggi separati; balistica ancora da bilanciare, 48 effetti attivati nella Fase 14."}</p>
      <details className="phase3-log"><summary>Registro delle mosse</summary>{game.history.slice(-8).map((entry,i)=><div key={i}>{entry}</div>)}</details>
        </div>
      </details>
    </div>
  </div>, document.body);
}
