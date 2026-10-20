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
const ECONOMY=Object.fromEntries(['frugale','equilibrato','potenziato','stress_concentrato'].map(profile=>[profile,simulateF17DEconomy({profile,starsPerSector:STAR_SCENARIO})]));
function playerGear(s,strategy){return ECONOMY[strategy].ledger[s-1].armory;}
function createBattle(s,strategy){
 const {planet,sector}=sectorAt(s),features=phase17Features(planet,sector);
 const p=makeDeck(`P${s}`,features.allowJokers),e=makeDeck(`E${s}`,features.allowJokers);
 const armory=playerGear(s,strategy),pArms=phase17PlayerBattleLoadout(armory,planet,sector),eArms=phase17EnemyLoadout(planet,sector);
 const level=phase17ExpectedPilotLevel(Math.max(0,s-1));
 const economy=ECONOMY[strategy].ledger[s-1];
 const pilotId='pilot_com_1'; // primo pilota non regalato di grado maggiore
 const pilotLevel=1;
 let battle=createPhase6Duel({
   playerHand:p.slice(0,7),playerDeck:p.slice(7),enemyHand:e.slice(0,7),enemyDeck:e.slice(7),
   playerHp:phase17PilotHp(level),enemyHp:Math.round(phase17EnemyHp(planet,sector)*(sector===10?BOSS_HP_MULT:NORMAL_HP_MULT)),
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
function play(s,strategy,budget=90,maxRounds=45,replica=0){
 seed=(170315+s*1729+replica*33391)>>>0;
 let state=createBattle(s,strategy);
 const counters={playerShots:0,enemyShots:0,playerPasses:0,enemyPasses:0,playerDamage:0,enemyDamage:0,
   swapPlayer:0,swapEnemy:0,anomalies:0,invalid:0,jokers:0};
 const reasons=[];
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
      counters.playerDamage+=state.result?.volleys?.player?.damage||0;
      counters.enemyDamage+=state.result?.volleys?.enemy?.damage||0;
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
    playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,
    ...counters,playerModuleActivations:state.phase16F?.player?.activations||0,enemyModuleActivations:state.phase16F?.enemy?.activations||0,battleCreditsEarned:state.phase16B?.earnings?.credits||0,battleDiamondsEarned:state.phase16B?.earnings?.diamonds||0,auditOK:audit.ok,errors:audit.errors.join(';')};
 }catch(error){return {sector:s,profile:strategy,replica,result:'error',exchanges:state.round-1,
  playerHP:state.hp.player,enemyHP:state.hp.enemy,playerHPmax:state.initialHp.player,enemyHPmax:state.initialHp.enemy,...counters,auditOK:false,
  errors:String(error.message||error).slice(0,300)};}
}
const SAMPLE_SECTORS=(process.env.SECTORS||'1,5,10,11,15,20,21,25,30,31,35,40,41,45,50,51,55,60,61,65,70,71,75,80,81,85,90,91,95,100,101,105,110,111,115,120').split(',').map(Number);
const SAMPLE_PROFILES=(process.env.PROFILES||'frugale,potenziato').split(',');
const perCell=Number(process.argv[2]||2),budget=Number(process.argv[3]||90);
const results=[];
for(const s of SAMPLE_SECTORS)for(const profile of SAMPLE_PROFILES){
 for(let i=0;i<perCell;i++)results.push(play(s,profile,budget,45,i));
 console.log('settore',s,'runs',results.length);
}
const cols=Object.keys(results[0]);
writeFileSync(new URL(`../${OUTPUT_PREFIX}_SIMULAZIONI_BATTAGLIE.csv`,import.meta.url),cols.join(',')+'\n'+results.map(row=>cols.map(k=>JSON.stringify(row[k]??'')).join(',')).join('\n')+'\n');
const summary=[];
for(const s of SAMPLE_SECTORS)for(const profile of SAMPLE_PROFILES){
 const r=results.filter(x=>x.sector===s&&x.profile===profile);
 const valid=r.filter(x=>!['error','timeout'].includes(x.result));
 summary.push({sector:s,profile,matches:r.length,finished:valid.length,winRate:valid.length?+(valid.filter(x=>x.result==='player').length/valid.length*100).toFixed(1):null,
   avgExchanges:valid.length?+(valid.reduce((a,x)=>a+x.exchanges,0)/valid.length).toFixed(1):null,
   fireRate:r.length?+(r.reduce((a,x)=>a+x.playerShots+x.enemyShots,0)/Math.max(1,r.reduce((a,x)=>a+x.playerShots+x.enemyShots+x.playerPasses+x.enemyPasses,0))*100).toFixed(1):null,
   errors:r.filter(x=>x.result==='error').map(x=>x.errors).slice(0,2).join('|')});
}
writeFileSync(new URL(`../${OUTPUT_PREFIX}_RISULTATI_AGGREGATI.json`,import.meta.url),JSON.stringify({method:'17E engine with enemy modules, equipment from 17D purchases (assumed first wins); HP scenario probe; NOT production rule nor human win rate' ,economyProfiles:Object.fromEntries(Object.entries(ECONOMY).map(([k,v])=>[k,v.summary])),starsPerSector:STAR_SCENARIO,samples:results.length,perCell,budget,normalHpMultiplier:NORMAL_HP_MULT,bossHpMultiplier:BOSS_HP_MULT,summary},null,2));
console.table(summary);
