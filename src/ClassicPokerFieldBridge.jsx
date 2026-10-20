import React, {useMemo,useState,useEffect} from 'react';
import ClassicBattleView from './ClassicBattleView.jsx';
import {getWeaponDefinition} from './newCombat/weaponCatalog.js';
import './newCombat/classicNativeBridge.css';

// SOLO ADATTATORE DATI: il DOM della plancia e i suoi stili restano in ClassicBattleView.jsx (FILE 1).
const slots = ['light','medium','heavy',null];
const physicalSuits = ['spades','hearts','diamonds','clubs'];
const colors = ['#c084fc','#f43f5e','#00f2fe','#10b981'];
const pct = (n,d) => Math.max(0,Math.min(100,Math.round(100*(n||0)/(d||1))));
export default function ClassicPokerFieldBridge({
  mode='CAMPAGNA',phase='attack',round=1,seconds=null,enemySeconds=null,actor=null,readyEnemy=false,
  hp={player:100,enemy:100},initialHp={player:100,enemy:100},ammo={},hand=[],opponentHandSize=7,
  deckSize=0,opponentDeckSize=0,board=[],blockedSlots=[],draftSlots=[],selectedHand=[],
  arsenal={player:{},enemy:{}},weaponLevels={},selectedWeaponId=null,weaponOptions=[],
  playerSide='player',onSelectWeapon,onCardClick,onSlotClick,onPlaceCard,onAttack,onPass,onClear,onSwap,onReady,onFinish,onAbandon,
  canAttack=false,canPlay=false,canPrepare=false,ready=false,exchangesLeft=0,comboLabel='',result=null,finished=false,
  onOpenSystems,systemsAvailable=false,playerEther=0,enemyMalus=0,playerMalus=0,
  playerModule=null,enemyModule=null,playerDice=null,enemyDice=null, goldenCard=null,
  frozenClasses=[],volley=null,volleyOpener='player',aiPreviewSlots=[],aiStatus='ANALIZZA IL BANCO'
}) {
  const enemySide=playerSide==='player'?'enemy':'player';
  const allowedSystems=(canPlay||canPrepare)?onOpenSystems:undefined;
  const prep=phase==='prepare';
  const resolving=phase==='animate';
  const playing=phase==='attack'||phase==='response';
  // Un solo orologio in Attacco/Risposta: l'altro giocatore aspetta, senza consumare tempo.
  // In preparazione i due timer personali scorrono contemporaneamente.
  const playerClock=prep?(ready?'PRONTO':`${seconds ?? 0}s`):resolving?'PAUSA':playing?(actor===playerSide?`${seconds ?? 0}s`:'ATTESA'):'—';
  const enemyClock=prep?(readyEnemy?'PRONTO':`${enemySeconds ?? 0}s`):resolving?'PAUSA':playing?(actor===enemySide?`${seconds ?? 0}s`:'ATTESA'):'—';
  const [swapMode,setSwapMode]=useState(false);
  useEffect(()=>{if(!canPrepare)setSwapMode(false);},[canPrepare]);
  const cards=Array.isArray(board)?board.map(c=>c?.card||c):[];
  const createWeapons=(side)=>slots.map((klass,i)=>{
    const id=klass?arsenal?.[side]?.[klass]:null;
    const def=id?getWeaponDefinition(id):null;
    const level=klass ? weaponLevels?.[side]?.[klass]||1 : 1;
    const ammoCount=klass?(ammo?.[side]?.[def?.ammoSuit]||0):0;
    const asset=def?.assets?.cardImageByLevel?.[level]||def?.assets?.cardImageByLevel?.[1];
    return {id:def?.id||`empty_poker_slot_${i}`,name:def?.name||(klass?'NESSUNA ARMA':'BOOST'),
      newPokerImage:asset||null,
      icon:asset?<img src={asset} alt={def?.name} style={{width:29,height:27,objectFit:'contain'}}/>:(klass?'—':'⚡'),
      suit:physicalSuits[i], ammoSuit:def?.ammoSuit,
      ammo:ammoCount, themeColor:def?.rarityColor||colors[i],
      maxCapacity:Math.max(10,ammoCount), maxSalvo:10,
      currentLevel:level,currentDamage:1,slotIdx:i,
      slotType:'poker',pattern:null,allowedPatterns:[],
      mathOp:null,target:null,isLocked:!def,
      reqDescription:klass?({light:'LEGGERA',medium:'MEDIA',heavy:'PESANTE'}[klass]):'BOOST',
      weaponClass:klass, isFrozen:side===playerSide&&frozenClasses.includes(klass),
    };
  });
  const weapons=useMemo(()=>createWeapons(playerSide),[arsenal,playerSide,weaponLevels,ammo]);
  const enemyWeapons=useMemo(()=>createWeapons(enemySide),[arsenal,enemySide,weaponLevels,ammo]);
  const tankByPosition=Object.fromEntries(weapons.map(w=>[w.suit,w.ammo]));
  const selected=weapons.find(w=>w.id===selectedWeaponId);
  const selectedOption=weaponOptions.find(w=>w.weaponId===selectedWeaponId);
  const bridge={
    enabled:true,canPlay,canPrepare,canAttack,ready,finished,
    weapons,enemyWeapons,weaponOptions,playerSide,selectedWeaponId,selectedWeaponSlot:selected?.slotIdx ?? -1,
    expectedDamage: selectedOption?.potentialDamage || 0,
    draftedCards: cards.filter(c=>c&&draftSlots.some(idx=>cards[idx]===c)),
    selectedHand,blockedSlots,draftCount:draftSlots.length,
    onCardClick,onSlotClick,onPlaceCard,onAttack,onPass,onClear,onSwap,onReady,onFinish,onAbandon,
    onSelectWeapon,onOpenSystems:allowedSystems,
    exchangesLeft,comboLabel,round,phase,mode,systemsAvailable,
    result,volley,volleyOpener,actor,aiPreviewSlots,aiStatus,
  };
  return <ClassicBattleView
    pokerBridge={bridge}
    isPvP={true} isAdv={false} pvpMeta={{opponent:{nickname:mode.startsWith('PVP')?'AVVERSARIO':'AVVERSARIO'}}}
    selectedDeck="neutral_starter" aiDeckTheme="planet_char_1" selectedPilot="pilot_com_1" pilotInventory={{}}
    tableSlots={Array.from({length:5},(_,i)=>blockedSlots.includes(i)?null:cards[i]||null)}
    playerHand={hand} aiHand={Array.from({length:Math.min(7,Math.max(0,opponentHandSize||0))},(_,i)=>({id:`hidden-${i}`}))}
    playerDeck={Array.from({length:Math.max(0,deckSize||0)},()=>null)}
    aiDeck={Array.from({length:Math.max(0,opponentDeckSize||0)},()=>null)}
    playerDiscard={[]} aiDiscard={[]}
    playerTerrainSlots={[null,null,null,null]} aiTerrainSlots={[null,null,null,null]}
    equippedWeapons={weapons.map(w=>w.id)}
    weaponTanks={tankByPosition}
    aiWeaponTanks={Object.fromEntries(enemyWeapons.map(w=>[w.suit,w.ammo]))}
    playerHp={hp?.[playerSide]||0} maxPlayerHp={initialHp?.[playerSide]||1}
    aiHp={hp?.[enemySide]||0} maxAiHp={initialHp?.[enemySide]||1}
    aiTimer={enemyClock} timer={playerClock}
    aiMalusGauge={enemyMalus} playerMalusGauge={playerMalus} malusMaxTicks={3}
    playerTimeTank={0} aiTimeTank={0}
    level={1} lives={3} currentAdvLevel={1} effectiveAiDeckLevel={1}
    battleEther={playerEther} maxBattleEther={Math.max(2,playerEther)} isScannerActive={false}
    selectedAbility={playerModule?.id||null} abilities={playerModule?.id?{[playerModule.id]:{level:playerModule.level||1}}:{}}
    abilityMeter={playerModule?.points||0} isAbilityReady={Boolean(playerModule?.ready)}
    aiAbilityMeter={enemyModule?.points||0} effectiveAiAbilityId={enemyModule?.id||null}
    playerDiceReady={Boolean(playerDice?.diceReady)} playerNotches={Object.fromEntries((playerDice?.dicePatterns||[]).map((name,i)=>[name,true]))}
    aiNotches={Object.fromEntries((enemyDice?.dicePatterns||[]).map((name,i)=>[name,true]))}
    playerGoldenCardId={goldenCard?.id||null} playerGoldenTurns={goldenCard?.turnsRemaining||0}
    handleManualSkillTrigger={allowedSystems} executeQuantumDiceRoll={allowedSystems}
    turn={playing&&actor===playerSide?'player1':'ai'}
    isExchangeMode={canPrepare&&(swapMode||selectedHand.length>0)}
    selectedExchangeIndices={selectedHand}
    downtimeExchangesLeft={exchangesLeft}
    setShowAbandonConfirm={onAbandon}
    setShowDeckExtractModal={allowedSystems}
    toggleScanner={allowedSystems}
    onCardClick={onCardClick}
    handlePassTurn={onPass}
    handleOpenExchangeMode={()=>setSwapMode(true)}
    handleCancelExchangeMode={()=>{setSwapMode(false);onClear?.();}}
    confirmCardExchange={()=>{setSwapMode(false);onSwap?.();}}
  />;
}
