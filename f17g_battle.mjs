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
import {planPhase9Attack,executePhase9Preparation} from '../src/newCombat/phase9AI.js';
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
function play(s,strategy,budget=90,maxRounds=45,replica=0,override=null,seedEpoch=0,testOptions={}){
 seed=(170315+s*1729+replica*33391+seedEpoch*2246822519)>>>0;
 if(!Number.isFinite(testOptions.enemyHpMultiplier??1)||(testOptions.enemyHpMultiplier??1)<=0)throw Error('Invalid experimental enemy HP multiplier');
 let state=createBattle(s,strategy,override,testOptions.enemyHpMultiplier??1);
 const counters={playerShots:0,enemyShots:0,playerPasses:0,enemyPasses:0,playerDamage:0,enemyDamage:0,
   swapPlayer:0,swapEnemy:0,anomalies:0,invalid:0,jokers:0,winningResponses:0,multiSuitShots:0,boostActivations:0};
 const reasons=[];
 // F17J: sola telemetria offline, nessun cambio alla FSM o alle decisioni IA.
 const weaponUsage={player:{},enemy:{}};
 try {
  while(state.round<=maxRounds && state.phase!==TURN_PHASES.FINISHED){
   if(state.phase===TURN_PHASES.ATTACK||state.phase===TURN_PHASES.RESPONSE){
    const side=state.actor;
    const plan=planPhase9Attack(state,side,{maxEvaluations:budget});
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
      if(state.phase===TURN_PHASES.PREPARE && side==='enemy')state=activatePhase17EEnemyModuleIfReady(state);
      if(state.winner){state={...state,phase:TURN_PHASES.FINISHED};break;}
      if(state.phase===TURN_PHASES.PREPARE && side==='player'&&state.phase16F?.player?.ready&&!state.phase16B?.player?.moduleLocked){
        state=activatePhase16FModule(state,'player');
       }
      if(state.phase===TURN_PHASES.PREPARE){
       state=state.campaignEnvironment?.swapsDisabled?preparePhase13AI(state):executePhase9Preparation(state,side);
       counters[side==='player'?'swapPlayer':'swapEnemy']+=(state.preparation?.statistics?.[side]?.swaps||0)-before;
      }
    }
   }else throw Error(`Unexpected phase ${state.phase}`);
  }
  const audit=auditPhase10Duel(state);
  return {sector:s,profile:strategy,replica,result:state.winner||'timeout',exchanges:state.round-1,
    playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,usedRevive:Boolean(state.phase16E?.revived),
    ...counters,...(testOptions.trackWeaponUsage?{weaponUsage}:{}),playerModuleActivations:state.phase16F?.player?.activations||0,enemyModuleActivations:state.phase16F?.enemy?.activations||0,battleCreditsEarned:state.phase16B?.earnings?.credits||0,battleDustEarned:state.phase16B?.earnings?.dust||0,battleDiamondsEarned:state.phase16B?.earnings?.diamonds||0,auditOK:audit.ok,errors:audit.errors.join(';')};
 }catch(error){return {sector:s,profile:strategy,replica,result:'error',exchanges:state.round-1,
  playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,...counters,auditOK:false,
  errors:String(error.message||error).slice(0,300)};}
}

/** 17G: originale FSM F17F, parametri dei duelli invariati, economia aggiornata soltanto dalle vittorie pregresse. */
/** Extra last argument reserved for offline 17I paired scenarios; no gameplay change. */
export const playF17GBattle=(sector,profile,attempt=0,budget=50,override=null,seedEpoch=0,testOptions={})=>play(sector,profile,budget,45,attempt,override,seedEpoch,testOptions);
export const f17gEconomySnapshot=(sector,profile)=>ECONOMY[profile]?.ledger[sector-1];
