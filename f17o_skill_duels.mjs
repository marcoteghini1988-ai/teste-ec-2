/** F17E: scontri completi con Moduli IA del motore 17C con equipaggiamento comprato nel budget F17D. NOT a browser test.
 * A deterministic PRNG shuffles *real cards*. Both fighters are controlled by the
 * same public-information tactical AI and follow the actual attack/response/prep FSM.
 */
import {writeFileSync} from 'node:fs';
import {simulateF17DEconomy} from '../src/newCombat/phase17DEconomy.js';
import {createPhase6Duel} from '../src/newCombat/phase6Engine.js';
import {initializePhase13CampaignState} from '../src/newCombat/phase13Campaign.js';
import {initializePhase15} from '../src/newCombat/phase15LegacyPassives.js';
import {initializePhase16B,commitPhase16BMove,finishPhase16BAnimation,markPhase16BReady,activatePhase16BDice,activatePhase16BMalus} from '../src/newCombat/phase16BCombat.js';
import {initializePhase16C} from '../src/newCombat/phase16CEpics.js';
import {initializePhase16E} from '../src/newCombat/phase16EDecks.js';
import {initializePhase16F,activatePhase16FModule} from '../src/newCombat/phase16FModules.js';
import {phase17EEnemyModule,activatePhase17EEnemyModuleIfReady} from '../src/newCombat/phase16FModules.js';
import {initializePhase16G} from '../src/newCombat/phase16GPilots.js';
import {createPhase12CampaignTactics} from '../src/newCombat/phase12CampaignAbilities.js';
import {getPhase13EnemyPilotId} from '../src/newCombat/phase13Campaign.js';
import {planPhase9Attack,executePhase9Preparation,getPhase9CandidateMoves,comparePhase9Candidates,planPhase9Preparation} from '../src/newCombat/phase9AI.js';
import {exchangePhase6Cards,markPhase6Ready,extractPhase6WithEther} from '../src/newCombat/phase6Engine.js';
import {normalizePokerRank,normalizePokerSuit} from '../src/newCombat/pokerRules.js';
import {preparePhase13AI} from '../src/newCombat/phase13Campaign.js';
import {createPhase7Armory} from '../src/newCombat/phase7Armory.js';
import {PHASE16A_CAMPAIGN_PLANETS} from '../src/newCombat/phase16ACatalog.js';
import {ARSENAL_48,getWeaponDefinition} from '../src/newCombat/weaponCatalog.js';
import {phase17ExpectedPilotLevel,phase17PilotHp,phase17EnemyHp,phase17PlayerBattleLoadout,phase17PlayerWeaponLevels,phase17EnemyLoadout,phase17EnemyWeaponLevels,phase17EnemyWeaponLevel,phase17Features,phase17StartingAmmo} from '../src/newCombat/phase17Balance.js';
import {auditPhase10Duel} from '../src/newCombat/phase10Audit.js';
import {TURN_PHASES} from '../src/newCombat/config.js';
import {isPhase13BoostAllowed} from '../src/newCombat/phase13Campaign.js';
const AI_MODULES_ENABLED=process.env.ENEMY_MODULES!=='0';
const OUTPUT_PREFIX=`FASE_17F_${(process.env.SCENARIO||'BASE').replace(/[^A-Za-z0-9_]/g,'')}`;
const NORMAL_HP_MULT=Number(process.env.NORMAL_HP_MULT||1);
const BOSS_HP_MULT=Number(process.env.BOSS_HP_MULT||1);
let seed=170315;
const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
// Deck e probabilita' tattiche ripetibili: stesso seed per replica e settore
// a prescindere dal profilo (non e' un test di RNG del browser).
Math.random=rnd;
const suits=['hearts','diamonds','clubs','spades'];
const makeDeck=(prefix,withJokers)=>{
 const arr=[];
 for(const suit of suits)for(let value=1;value<=13;value++)arr.push({id:`${prefix}-${suit}-${value}`,suit,value});
 if(withJokers)for(let i=0;i<2;i++)arr.push({id:`${prefix}-joker-${i}`,suit:'joker',value:0,isJoker:true});
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[arr[j],arr[i]]=[arr[i],arr[j]];}
 return arr;
};
const sectorAt=s=>({planet:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id,sector:(s-1)%10+1});
const STAR_SCENARIO=Number(process.env.STARS||2);
const ECONOMY=Object.fromEntries(['frugale','equilibrato','potenziato','stress_concentrato','tattico'].map(profile=>[profile,simulateF17DEconomy({profile,starsPerSector:STAR_SCENARIO})]));
function playerGear(s,strategy){return ECONOMY[strategy].ledger[s-1].armory;}
function createBattle(s,strategy,override=null,testEnemyHpMultiplier=1){
 const {planet,sector}=sectorAt(s),features=phase17Features(planet,sector);
 const p=makeDeck(`P${s}`,features.allowJokers),e=makeDeck(`E${s}`,features.allowJokers);
 const armory=override?.armory||playerGear(s,strategy),pArms=phase17PlayerBattleLoadout(armory,planet,sector),eArms=phase17EnemyLoadout(planet,sector);
 const level=override?.pilotLevel||phase17ExpectedPilotLevel(Math.max(0,s-1));
 const economy=override||ECONOMY[strategy].ledger[s-1];
 const pilotId='pilot_com_1'; // primo pilota non regalato di grado maggiore
 const pilotLevel=1;
 let battle=createPhase6Duel({
   playerHand:p.slice(0,7),playerDeck:p.slice(7),enemyHand:e.slice(0,7),enemyDeck:e.slice(7),
   playerHp:phase17PilotHp(level),enemyHp:Math.round(phase17EnemyHp(planet,sector)*(sector===10?BOSS_HP_MULT:NORMAL_HP_MULT)*testEnemyHpMultiplier),
   playerAmmo:phase17StartingAmmo(pArms),enemyAmmo:phase17StartingAmmo(eArms),
   playerLoadout:pArms,enemyLoadout:eArms,
   playerWeaponLevels:phase17PlayerWeaponLevels(armory,pArms),enemyWeaponLevels:phase17EnemyWeaponLevels(planet,sector),
   ether:0});
 battle={...battle,campaignTactics:createPhase12CampaignTactics({playerPilotId:pilotId,playerPilotLevel:pilotLevel,
   enemyPilotId:getPhase13EnemyPilotId(planet,sector),enemyPilotLevel:Math.min(5,1+Math.floor((s-1)/24)),planet,sector,modifier:'standard'})};
 const raw={deckId:economy.deckId,deckLevel:economy.deckLevel,
   terrains:economy.terrainLevel?[{id:'cryo_stasis',level:economy.terrainLevel,name:'Criostasi'}]:[],
   epics:economy.epics,
   module:economy.moduleLevel?{id:'aries',level:economy.moduleLevel}:null};
 return initializePhase16G(initializePhase16F(initializePhase16E(initializePhase16C(initializePhase16B(initializePhase15(initializePhase13CampaignState({...battle,campaignSession:{planet,sector}},{planet,sector}),raw)))),raw,AI_MODULES_ENABLED?phase17EEnemyModule(planet,sector):null));
}
// FASE 17O: quattro archetipi sperimentali, non IA commerciali o predizioni umane.
const TIERS={
  principiante:{budget:12,swaps:0,style:'first'},
  base:{budget:35,swaps:1,style:'normal'},
  intermedio:{budget:100,swaps:1,style:'normal'},
  esperto:{budget:220,swaps:2,style:'normal'},
};
const classFor=id=>getWeaponDefinition(id)?.weaponClass||'none';
const other=side=>side==='player'?'enemy':'player';
const rank=card=>normalizePokerRank(card)||0;
const suit=card=>normalizePokerSuit(card?.suit)||'';
// Valuta soltanto mano propria e banco pubblico, non carte o mazzi avversari.
function cardRetention(state,side){
 const hand=state[side].hand;
 const board=state.board.filter(Boolean);
 const all=[...hand,...board];
 const ranks=all.map(rank);
 const suitCounts=new Map();const rankCounts=new Map();
 for(const c of all){const r=rank(c),t=suit(c);rankCounts.set(r,(rankCounts.get(r)||0)+1);suitCounts.set(t,(suitCounts.get(t)||0)+1);}
 return hand.map((c,i)=>{
  const r=rank(c),t=suit(c);
  const ownRank=hand.filter(x=>rank(x)===r).length;
  const proximity=(ranks.some(x=>x===r-1)?1:0)+(ranks.some(x=>x===r+1)?1:0);
  const flush=Math.max(0,(suitCounts.get(t)||0)-2);
  // Finestre quasi complete per scala a quattro e valori utili sul banco.
  let straight=0;
  for(let lo=1;lo<=11;lo++){
   const vals=new Set(ranks.filter(x=>x>=lo&&x<lo+4));
   if(r>=lo&&r<lo+4) straight=Math.max(straight,vals.size);
  }
  return {index:i,score: (ownRank-1)*7+(rankCounts.get(r)>1?4:0)+proximity*1.3+flush*1.3+Math.max(0,straight-2)*2+(r>=10?.6:0)};
 });
}
function tierPlan(state,side,tier){
 const cfg=TIERS[tier]||TIERS.base;
 if(cfg.style==='first'){
  const cand=getPhase9CandidateMoves(state,side,{maxEvaluations:cfg.budget});
  // Il novizio vede poche possibilità e sceglie fra le prime, senza leggere la mano opposta.
  const pick=cand.length?cand[Math.floor(rnd()*Math.min(3,cand.length))]:null;
  return pick?{placements:pick.placements,weaponId:pick.weaponId,choice:pick.choice}:null;
 }
 if(tier==='esperto'){
  const candidates=getPhase9CandidateMoves(state,side,{maxEvaluations:cfg.budget});
  if(!candidates.length)return null;
  // Prima il risultato del confronto Poker, poi la protezione delle carte
  // utili: un esperto non sacrifica una risposta vincente per tenere una Scala.
  const scores=cardRetention(state,side);
  const retained=new Map(state[side].hand.map((c,i)=>[c.id,scores[i].score]));
  let best=candidates[0];
  for(const cand of candidates.slice(1)){
    const compare=comparePhase9Candidates(cand,best,state,side);
    if(compare>0){best=cand;continue;}
    // Se la figura e il danno sono identici, conserva la mano piu' promettente.
    if(compare===0){
      const remaining=c=>[...retained.entries()].filter(([id])=>!c.placements.some(p=>p.card.id===id)).reduce((n,[,v])=>n+v,0);
      if(remaining(cand)>remaining(best))best=cand;
    }
  }
  return {placements:best.placements,weaponId:best.weaponId,choice:best.choice};
 }
 return planPhase9Attack(state,side,{maxEvaluations:cfg.budget});
}
function tierPrep(state,side,tier){
 if(state.phase!==TURN_PHASES.PREPARE||state.ready?.[side])return state;
 if(tier==='principiante') return markPhase6Ready(state,side);
 let next=state;
 if(tier==='base'){
  // Base: un cambio mirato di una carta isolata, non ottimizzazione perfetta.
  const plan=planPhase9Preparation(next,side);
  if(plan.swap.length&&next[side].exchangesLeft>0)next=exchangePhase6Cards(next,side,plan.swap.slice(0,1));
 }else{
  const ops=tier==='intermedio'?1:2;
  for(let i=0;i<ops;i++){
   if(next.phase!==TURN_PHASES.PREPARE||next[side].exchangesLeft<=0||!next[side].deck.length||next.hp[side]<=24)break;
   const vals=cardRetention(next,side).sort((a,b)=>a.score-b.score);
   const worthwhile=vals.filter(v=>v.score<(tier==='esperto'?4.1:2.2));
   if(worthwhile.length<1)break;
   const choice=worthwhile.slice(0,tier==='esperto'?3:2).map(v=>v.index);
   if(!choice.length)break;
   next=exchangePhase6Cards(next,side,choice);
  }
 }
 // Piano Etere legale, solo se il mazzo e' ispezionabile dalla regola Etere.
 if(next.phase===TURN_PHASES.PREPARE && tier!=='base'){
  const plan=planPhase9Preparation(next,side);
  if(plan.ether) next=extractPhase6WithEther(next,side,plan.ether.handIndex,plan.ether.deckIndex,plan.ether.cost);
 }
 return next.phase===TURN_PHASES.PREPARE?markPhase6Ready(next,side):next;
}
function play(s,strategy,budget=90,maxRounds=45,replica=0,override=null,seedEpoch=0,testOptions={}){
 seed=(170315+s*1729+replica*33391+seedEpoch*2246822519)>>>0;
 if(!Number.isFinite(testOptions.enemyHpMultiplier??1)||(testOptions.enemyHpMultiplier??1)<=0)throw Error('Invalid experimental enemy HP multiplier');
 let state=createBattle(s,strategy,override,testOptions.enemyHpMultiplier??1);
 // Modalita' PvP paritaria: due persone con lo stesso arsenale acquistato,
 // stessi HP/munizioni e nessun vantaggio PvE o modulo del boss.
 if(testOptions.pvp){
  const gear=override?.armory||playerGear(s,strategy),{planet,sector}=sectorAt(s);
  const arms=phase17PlayerBattleLoadout(gear,planet,sector),levels=phase17PlayerWeaponLevels(gear,arms);
  const pd=makeDeck('pvp-player',false),ed=makeDeck('pvp-enemy',false);
  const hp=phase17PilotHp(phase17ExpectedPilotLevel(80));
  state=initializePhase16B(createPhase6Duel({
   playerHand:pd.slice(0,7),playerDeck:pd.slice(7),enemyHand:ed.slice(0,7),enemyDeck:ed.slice(7),
   opener:replica%2?'enemy':'player',playerHp:hp,enemyHp:hp,
   playerLoadout:arms,enemyLoadout:arms,playerWeaponLevels:levels,enemyWeaponLevels:levels,
   playerAmmo:phase17StartingAmmo(arms),enemyAmmo:phase17StartingAmmo(arms),ether:0,
  }));
 }
 const tiers={player:testOptions.tier||'intermedio',enemy:testOptions.opponentTier||(testOptions.pvp?'base':'intermedio')};
 const classes={player:{light:0,medium:0,heavy:0},enemy:{light:0,medium:0,heavy:0}};
 const swaps={player:0,enemy:0},cardsExchanged={player:0,enemy:0};
 const counters={playerShots:0,enemyShots:0,playerPasses:0,enemyPasses:0,playerDamage:0,enemyDamage:0,
   swapPlayer:0,swapEnemy:0,anomalies:0,invalid:0,jokers:0,winningResponses:0,multiSuitShots:0,boostActivations:0};
 const reasons=[];
 // F17J: sola telemetria offline, nessun cambio alla FSM o alle decisioni IA.
 const weaponUsage={player:{},enemy:{}};
 try {
  while(state.round<=maxRounds && state.phase!==TURN_PHASES.FINISHED){
   if(state.phase===TURN_PHASES.ATTACK||state.phase===TURN_PHASES.RESPONSE){
    const side=state.actor;
    const plan=tierPlan(state,side,tiers[side]);
    const locked=state.phase16B?.[side]?.lockedWeapon;
    const usable=plan&&getWeaponDefinition(plan.weaponId)?.weaponClass!==locked;
    const choice=usable && state.phase16B?.[side]?.boostBlocked===0 && plan.boost&&isPhase13BoostAllowed(state,plan.boost)?plan.boost:null;
    const previous=state;
    state=commitPhase16BMove(state,side,usable?plan.placements:[],!usable,usable?plan.weaponId:null,choice,'medium');
    if(usable) {counters[side+'Shots']++;if(plan.placements.some(p=>p.card.isJoker))counters.jokers++;}
    else counters[side+'Passes']++;
    if(state.phase===TURN_PHASES.ANIMATE){
      if(state.result?.winner==='responder'&&state.result?.responder==='player')counters.winningResponses++;
      if(state.result?.volleys?.player?.boostApplied)counters.boostActivations++;
      const played=state.moves?.player?.committedCards||[];
      if(state.result?.volleys?.player?.shots>0 && new Set(played.filter(c=>c?.suit&&c.suit!=='joker').map(c=>c.suit)).size>=3)counters.multiSuitShots++;
      for(const fighter of ['player','enemy']) {
       const volley=state.result?.volleys?.[fighter];
       if((volley?.shots||0)>0){const cls=classFor(volley.weaponId);if(cls in classes[fighter])classes[fighter][cls]++;}
      }
      counters.playerDamage+=state.result?.volleys?.player?.damage||0;
      counters.enemyDamage+=state.result?.volleys?.enemy?.damage||0;
      if(testOptions.trackWeaponUsage){
       for(const fighter of ['player','enemy']){
        const volley=state.result?.volleys?.[fighter];
        if(!volley?.weaponId)continue;
        const record=weaponUsage[fighter][volley.weaponId]||={attempts:0,salvos:0,shots:0,damage:0,ammoGained:0};
        record.attempts++;if((volley.shots||0)>0)record.salvos++;
        record.shots+=volley.shots||0;record.damage+=volley.damage||0;
        record.ammoGained+=volley.gainedAmmo||0;
        weaponUsage[fighter][volley.weaponId]=record;
       }
      }
    }
   }else if(state.phase===TURN_PHASES.ANIMATE){
     const before=state.phase17Anomalies?.triggered||0;
     state=finishPhase16BAnimation(state);
     counters.anomalies+=Math.max(0,(state.phase17Anomalies?.triggered||0)-before);
   }else if(state.phase===TURN_PHASES.PREPARE){
    for(const side of ['player','enemy']){
      if(state.phase!==TURN_PHASES.PREPARE)break;
      if(state.ready[side])continue;
      const before=state.preparation?.statistics?.[side]?.swaps||0;
      if(state.phase16B?.[side]?.diceReady)state=activatePhase16BDice(state,side);
      const choice=state.phase16B?.[side]?.malusChoices?.[0];
      if(state.phase===TURN_PHASES.PREPARE&&choice)state=activatePhase16BMalus(state,side,choice);
      if(state.winner){state={...state,phase:TURN_PHASES.FINISHED};break;}
      if(state.phase===TURN_PHASES.PREPARE && side==='enemy' && !testOptions.pvp)state=activatePhase17EEnemyModuleIfReady(state);
      if(state.winner){state={...state,phase:TURN_PHASES.FINISHED};break;}
      if(state.phase===TURN_PHASES.PREPARE && side==='player'&&state.phase16F?.player?.ready&&!state.phase16B?.player?.moduleLocked){
        state=activatePhase16FModule(state,'player');
       }
      if(state.phase===TURN_PHASES.PREPARE){
       state=state.campaignEnvironment?.swapsDisabled?preparePhase13AI(state):tierPrep(state,side,tiers[side]);
       counters[side==='player'?'swapPlayer':'swapEnemy']+=(state.preparation?.statistics?.[side]?.swaps||0)-before;
       swaps[side]+=(state.preparation?.statistics?.[side]?.swaps||0)-before;
      }
    }
   }else throw Error(`Unexpected phase ${state.phase}`);
  }
  const audit=auditPhase10Duel(state);
  return {sector:s,profile:strategy,replica,tier:tiers.player,opponentTier:tiers.enemy,pvp:!!testOptions.pvp,result:state.winner||'timeout',exchanges:state.round-1,classes,swaps,
    playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,usedRevive:Boolean(state.phase16E?.revived),
    ...counters,...(testOptions.trackWeaponUsage?{weaponUsage}:{}),playerModuleActivations:state.phase16F?.player?.activations||0,enemyModuleActivations:state.phase16F?.enemy?.activations||0,battleCreditsEarned:state.phase16B?.earnings?.credits||0,battleDustEarned:state.phase16B?.earnings?.dust||0,battleDiamondsEarned:state.phase16B?.earnings?.diamonds||0,auditOK:audit.ok,errors:audit.errors.join(';')};
 }catch(error){return {sector:s,profile:strategy,replica,tier:tiers.player,opponentTier:tiers.enemy,pvp:!!testOptions.pvp,result:'error',exchanges:state.round-1,classes,swaps,
  playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,...counters,auditOK:false,
  errors:String(error.message||error).slice(0,300)};}
}

/** 17G: originale FSM F17F, parametri dei duelli invariati, economia aggiornata soltanto dalle vittorie pregresse. */
/** Extra last argument reserved for offline 17I paired scenarios; no gameplay change. */
export const playF17GBattle=(sector,profile,attempt=0,budget=50,override=null,seedEpoch=0,testOptions={})=>play(sector,profile,budget,45,attempt,override,seedEpoch,testOptions);
export const f17gEconomySnapshot=(sector,profile)=>ECONOMY[profile]?.ledger[sector-1];

const sectors=(process.env.SECTORS||'31,41,51,71,81,101,40,60,80,100').split(',').map(Number);
const mode=process.env.MODE||'pve';
const repetitions=Number(process.env.REPS||4);
const output=process.env.OUT||'FASE_17O_SKILL_DUELLI.json';
const tiersList=['principiante','base','intermedio','esperto'];
const rows=[];
const first=Date.now();
if(mode==='pve') {
 for(const tier of tiersList){
  for(const sector of sectors)for(let rep=0;rep<repetitions;rep++){
   const row=play(sector,'tattico',0,36,rep,null,8,{tier,opponentTier:'base',trackWeaponUsage:false});
   rows.push(row);
   if(!row.auditOK)console.error('AUDIT',tier,sector,rep,row.errors);
  }
  console.log('completed',tier,'rows',rows.length,'elapsed',((Date.now()-first)/1000).toFixed(1));
 }
} else {
 const matches=[['principiante','base'],['principiante','intermedio'],['principiante','esperto'],['base','intermedio'],['base','esperto'],['intermedio','esperto']];
 for(const [a,b] of matches){
  for(let rep=0;rep<repetitions;rep++){
   // Ogni abbinamento viene giocato con entrambi i posti scambiati.
   for(const [player,enemy] of [[a,b],[b,a]]){
    const row=play(81,'tattico',0,40,rep,null,50,{tier:player,opponentTier:enemy,pvp:true});
    rows.push(row);if(!row.auditOK)console.error('AUDIT',player,enemy,rep,row.errors);
   }
  }
  console.log('completed PvP',a,b,'rows',rows.length,'elapsed',((Date.now()-first)/1000).toFixed(1));
 }
}
writeFileSync(output,JSON.stringify({mode,repetitions,sectors,rows},null,2));
const ok=rows.filter(r=>r.auditOK&&r.result!=='timeout');console.log('TOTAL',JSON.stringify({rows:rows.length,auditValid:ok.length,errors:rows.filter(r=>!r.auditOK).length,output,seconds:((Date.now()-first)/1000).toFixed(1)}));
