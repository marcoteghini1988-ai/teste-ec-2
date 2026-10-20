import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TURN_PHASES } from './config.js';
import { createPhase6Duel } from './phase6Engine.js';
import { createPhase12CampaignTactics } from './phase12CampaignAbilities.js';
import { isPhase13CampaignEligible,createPhase13Environment,initializePhase13CampaignState,
  getPhase13Time,commitPhase13Move,exchangePhase13Cards,resolvePhase13Environment,
  advancePhase13BossIfNeeded,finishPhase13Animation,validatePhase13Settlement,
  createPhase13OnceGuard,getPhase13BossPhases, getPhase13EnemyPilotId, recoverPhase13Stalemate } from './phase13Campaign.js';

const card=(id,value,suit='hearts')=>({id,value,suit});
const mkCards=(prefix,nums)=>nums.map((n,i)=>card(`${prefix}${i}`,n,['hearts','diamonds','spades','clubs'][i%4]));
const context=(planet=1,level=1,modifier='standard')=>({gameMode:'adventure',activeAdventure:{planet,level,modifier:{id:modifier}},sectorMode:'classic',hasNetworkOpponent:false});
const fixture=(planet=1,level=1,modifier='standard',anom=null)=> {
  const p=mkCards('p',[7,7,3,4,9,10,11,12,1,13]);
  const e=mkCards('e',[8,8,3,4,9,10,11,12,1,13]);
  const a={hearts:90,diamonds:90,spades:90,clubs:90};
  const duel=createPhase6Duel({playerHand:p.slice(0,7),playerDeck:p.slice(7),enemyHand:e.slice(0,7),enemyDeck:e.slice(7),playerHp:200,enemyHp:80,playerAmmo:a,enemyAmmo:a,ether:8});
  return initializePhase13CampaignState({...duel,
    campaignSession:{planet,sector:level},
    campaignTactics:createPhase12CampaignTactics({planet,sector:level,
      playerPilotId:'pilot_com_1',enemyPilotId:getPhase13EnemyPilotId(planet,level)})},
    {planet,sector:level,modifier,anomaly:anom});
};
const finished=(planet,level,outcome='player')=>{
  const s=fixture(planet,level);
  const max=getPhase13BossPhases(planet,level);
  return {...s,phase:TURN_PHASES.FINISHED,actor:null,winner:outcome,
    campaignBossTrack:{...s.campaignBossTrack,current:max,cleared:max-1},
    round:8,hp:{player:outcome==='player'?130:0,enemy:outcome==='enemy'?18:0}};
};
test('F13: l’intera campagna Classica 20×10 è migrabile, niente PvP',()=>{
  for(let p=1;p<=20;p++) for(let s=1;s<=10;s++) assert.equal(isPhase13CampaignEligible(context(p,s)),true,`${p}/${s}`);
  for(const modifier of ['standard','fast_timer','no_pass','boss_combined']) assert.equal(isPhase13CampaignEligible(context(19,10,modifier)),true);
  assert.equal(isPhase13CampaignEligible({...context(),gameMode:'pvp'}),false);
  assert.equal(isPhase13CampaignEligible({...context(),hasNetworkOpponent:true}),false);
  assert.equal(isPhase13CampaignEligible({...context(),sectorMode:'vector'}),false);
  assert.equal(isPhase13CampaignEligible(context(21,1)),false);
  assert.equal(isPhase13CampaignEligible(context(1,11)),false);
  assert.equal(isPhase13CampaignEligible(context(1,1,'unknown')),false);
});
test('F13: timer limitati ai turni con pausa animazioni e tempi diversi per campi rapidi',()=>{
  const s=fixture(2,3,'fast_timer');
  assert.equal(getPhase13Time(s),20);
  assert.equal(getPhase13Time({...s,phase:TURN_PHASES.RESPONSE}),20);
  assert.equal(getPhase13Time({...s,phase:TURN_PHASES.PREPARE}),35);
  assert.equal(getPhase13Time({...s,phase:TURN_PHASES.ANIMATE}),null);
  assert.equal(getPhase13Time({...s,phase:TURN_PHASES.FINISHED}),null);
  assert.equal(getPhase13Time(fixture(1,1)),25);
  assert.equal(getPhase13Time(fixture(2,10,'boss_combined')),25,'un boss non deve avere timer punitivo');
});
test('F13: le anomalie non entrano prima del settore globale 14; determinate per battaglia',()=>{
  assert.equal(createPhase13Environment({planet:1,sector:10}).anomaly,'normal');
  assert.equal(createPhase13Environment({planet:2,sector:3}).anomaly,'normal');
  const a=createPhase13Environment({planet:5,sector:4});
  assert.deepEqual(a,createPhase13Environment({planet:5,sector:4}));
  assert.throws(()=>createPhase13Environment({planet:1,sector:1,anomaly:'unknown'}));
});
test('F13: modificatore no_pass vieta cambi anche al computer, senza mutare stato',()=>{
  const s={...fixture(2,2,'no_pass'),phase:TURN_PHASES.PREPARE};
  const before=JSON.stringify(s);
  assert.throws(()=>exchangePhase13Cards(s,'player',[0]),/blocca/i);
  assert.equal(JSON.stringify(s),before);
  assert.equal(fixture(2,2).campaignEnvironment.swapsDisabled,false);
});
test('F13: operatore vietato blocca il Boost, non il Poker e non consuma risorse',()=>{
  const s=fixture(2,5,'standard','op_lock_add');
  s.boost.player.energy=45;
  const placements=s.player.hand.slice(0,4).map((c,slot)=>({card:c,slot}));
  const before=JSON.stringify(s);
  assert.throws(()=>commitPhase13Move(s,'player',placements,false,'es_common_light_01',
    {cost:15,operation:'+',cardIds:[s.player.hand[4].id,s.player.hand[5].id]}),/bloccato/i);
  assert.equal(JSON.stringify(s),before);
  const next=commitPhase13Move(s,'player',placements,false,'es_common_light_01');
  assert.equal(next.phase,TURN_PHASES.RESPONSE);
});
test('F13: risonanza Cuori non colpisce più volte allo stesso scambio',()=>{
  const s={...fixture(2,5,'standard','hearts_res'),phase:TURN_PHASES.ANIMATE,
    result:{volleys:{player:{shots:2,damage:15},enemy:{shots:0,damage:0}}},
    moves:{player:{committedCards:[card('a',7),card('b',8),card('c',2,'clubs')]},enemy:null}};
  const hp=s.hp.enemy;
  const a=resolvePhase13Environment(s);
  assert.equal(a.hp.enemy,hp-4);
  assert.equal(resolvePhase13Environment(a),a);
});
test('F17: boss di tutti i pianeti con UNA sola barra e nessuna ripartenza',()=>{
 for(let n=1;n<=20;n++)assert.equal(getPhase13BossPhases(n,10),1);
 assert.equal(getPhase13BossPhases(20,9),1);
 const s=fixture(20,10,'boss_combined');
 const dead={...s,phase:TURN_PHASES.ANIMATE,winner:'player',hp:{...s.hp,enemy:0}};
 const finished=finishPhase13Animation(dead);
 assert.equal(finished.phase,TURN_PHASES.FINISHED);
 assert.equal(finished.winner,'player');
 assert.equal(finished.hp.enemy,0);
 assert.equal(finished.campaignBossTrack.current,1);
 assert.deepEqual(finished.board,s.board);
 assert.deepEqual(finished.enemy.deck,s.enemy.deck);
});
test('F13: il divieto cambi non provoca stallo infinito dopo due doppi PASSA',()=>{
  let s=fixture(3,6,'no_pass');
  const initial=s.player.hand.map(c=>c.id).join(',');
  for(let i=0;i<2;i++) {
    s={...s,phase:TURN_PHASES.ANIMATE,winner:null,
      moves:{player:{passed:true},enemy:{passed:true}},
      result:{winner:null,damagePercent:[0,0],nextOpener:'enemy',opener:'player',responder:'enemy',volleys:{player:{shots:0,damage:0},enemy:{shots:0,damage:0}}}};
    s=finishPhase13Animation(s);
    assert.equal(s.phase,TURN_PHASES.PREPARE);
  }
  assert.equal(s.campaignStalemateRounds,0);
  assert.notEqual(s.player.hand.map(c=>c.id).join(','),initial);
  assert.equal(s.history.at(-1).includes('rimescolamento automatico'),true);
});
test('F13: tutti i 200 settori possono finalizzare un esito valido senza aggirare i boss',()=>{
  for(let planet=1;planet<=20;planet++) for(let sector=1;sector<=10;sector++) {
    const g=finished(planet,sector);
    const result=validatePhase13Settlement(g,context(planet,sector),{elapsedMs:15000},null);
    assert.equal(result.ok,true,`${planet}/${sector}: ${result.reason}`);
    assert.deepEqual(result.meta.starsEarned,[true,true,false]);
  }
  const inconsistent={...fixture(20,10),phase:TURN_PHASES.FINISHED,winner:'player',campaignBossTrack:{planet:20,sector:10,current:2,max:4,cleared:1}};
  assert.equal(validatePhase13Settlement(inconsistent,context(20,10)).ok,false);
  assert.equal(validatePhase13Settlement(finished(3,2),context(3,3)).ok,false);
  assert.equal(validatePhase13Settlement(finished(2,10),context(2,10,'unknown')).ok,false);
});
test('F13: premi unico gestore e schermata legacy non montata per i settori migrati',()=>{
  const app=readFileSync(fileURLToPath(new URL('../App.tsx',import.meta.url)),'utf8');
  const ui=readFileSync(fileURLToPath(new URL('../NewCombatPhase3Preview.jsx',import.meta.url)),'utf8');
  assert.match(app,/step === 'game' && isPhase13CampaignEligible/);
  assert.match(app,/step === 'game' && !isPhase13CampaignEligible/);
  assert.match(app,/handleGameEnd\(validation\.report\.outcome/);
  assert.match(app,/onBattleComplete=\{handlePhase13CampaignComplete\}/);
  assert.match(ui,/finishPhase13Animation/);
  assert.match(ui,/exchangePhase13Cards/);
  const guard=createPhase13OnceGuard();
  assert.equal(guard.claim('sector1'),true);assert.equal(guard.claim('sector1'),false);
});
