import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPhase17Anomalies,PHASE17_ANOMALY_CATALOG,getPhase17BlockedSlots,
  isPhase17WeaponFrozen,advancePhase17Anomalies,getPhase17AnomalyNotice} from './phase17Anomalies.js';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase13CampaignState,finishPhase13Animation,getPhase13BossPhases} from './phase13Campaign.js';
import {getPhase4MoveOptions,commitPhase4Move} from './phase4Engine.js';
import {getPhase9CandidateMoves} from './phase9AI.js';
import {applyBoardPlacements,requiredBoardPlacements} from './combatBasics.js';
import {defaultPhase4Loadout} from './phase4Weapons.js';
import {TURN_PHASES} from './config.js';
const c=(id,n,s)=>({id,value:n,suit:s});
function start(planet=20,sector=10){
 const cards=[c('p1',8,'hearts'),c('p2',8,'diamonds'),c('p3',8,'spades'),c('p4',8,'clubs'),c('p5',2,'clubs'),c('p6',3,'hearts'),c('p7',4,'spades')];
 const opp=cards.map((card,i)=>({...card,id:`e${i}`}));
 const duel=createPhase6Duel({playerHand:cards,enemyHand:opp,playerAmmo:{hearts:80,diamonds:80,clubs:80,spades:80},enemyAmmo:{hearts:80,diamonds:80,clubs:80,spades:80},playerHp:120,enemyHp:150});
 return initializePhase13CampaignState(duel,{planet,sector});
}
function endRound(state,enemyHp=100,playerMove=null){
 return advancePhase17Anomalies({...state,phase:TURN_PHASES.PREPARE,round:(state.round||1)+1,
   hp:{...state.hp,enemy:enemyHp},winner:null,
   moves:{player:playerMove??{committedCards:[]},enemy:null},
   result:{volleys:{player:{shots:playerMove?.committedCards?.length?2:0,damage:10},enemy:{shots:0,damage:0}}}});
}
test('17: una sola barra HP, dodici boss e zero eventi nei settori normali',()=>{
 for(const planet of [1,2,3,6,7,8,9,11,14,17,19,20]){
   assert.equal(getPhase13BossPhases(planet,10),1);
   assert.ok(createPhase17Anomalies(planet,10).plan.length);
   assert.equal(createPhase17Anomalies(planet,9).plan.length,0);
 }
 assert.equal(Object.keys(PHASE17_ANOMALY_CATALOG).length,3);
 const s=start(20,10);
 const dead=finishPhase13Animation({...s,winner:'player',hp:{player:100,enemy:0},phase:TURN_PHASES.ANIMATE});
 assert.equal(dead.phase,TURN_PHASES.FINISHED);
 assert.equal(dead.hp.enemy,0);
 assert.equal(dead.campaignBossTrack.current,1);
 assert.equal(dead.phase17Anomalies.triggered,0);
});
test('17: il congelamento sceglie arma realmente equipaggiata e lascia alternative',()=>{
 const s=start(20);
 const after=endRound(s,120,{weaponId:s.arsenal.player.medium,committedCards:[]});
 assert.equal(after.phase17Anomalies.active.kind,'freeze');
 assert.equal(after.phase17Anomalies.active.weaponClass,'medium');
 assert.equal(isPhase17WeaponFrozen(after,'player','medium'),true);
 assert.equal(isPhase17WeaponFrozen(after,'player','light'),false);
 assert.equal(isPhase17WeaponFrozen(after,'enemy','medium'),false);
 const placements=after.player.hand.slice(0,4).map((card,i)=>({card,slot:i}));
 const options=getPhase4MoveOptions({...after,phase:TURN_PHASES.ATTACK,actor:'player'},'player',placements);
 const frozen=options.filter(x=>x.weaponClass==='medium');
 assert.ok(frozen.every(x=>x.frozenByAnomaly&&!x.canFire));
 assert.match(getPhase17AnomalyNotice(after),/MEDIA/);
 const one={...s,arsenal:{...s.arsenal,player:{light:s.arsenal.player.light,medium:null,heavy:null}}};
 const safe=endRound(one,100);
 assert.equal(safe.phase17Anomalies.active.kind,'meteor','mai bloccare l’unica arma');
});
test('17: collasso sigilla due slot senza alterare il banco e limita le combinazioni reali',()=>{
 const s=start(6);
 const original=[c('a',9,'hearts'),c('b',9,'diamonds'),c('c',9,'spades'),c('d',9,'clubs'),c('x',5,'hearts')];
 const active={...s,board:original,phase17Anomalies:{...s.phase17Anomalies,active:{kind:'collapse',remaining:1}}};
 assert.deepEqual(getPhase17BlockedSlots(active),[3,4]);
 assert.equal(requiredBoardPlacements(active.board,7,4,[3,4]),0);
 assert.equal(applyBoardPlacements(active.board,[{slot:4,card:c('new',2,'clubs')}],{blockedSlots:[3,4]}).error,'anomaly_blocked_slot');
 const placements=[{slot:0,card:c('q',10,'hearts')}];
 const scores=getPhase4MoveOptions(active,'player',placements);
 assert.ok(scores.every(option=>option.score.cardIds.every(id=>!['d','x'].includes(id))),'le carte sigillate non contribuiscono al Poker');
 assert.deepEqual(active.board,original,'sigillare non significa cancellare carte');
});
test('17: anche la IA cerca soltanto nei tre slot utilizzabili',()=>{
 const state=start(6);
 const active={...state,phase:TURN_PHASES.ATTACK,actor:'enemy',phase17Anomalies:{...state.phase17Anomalies,active:{kind:'collapse',remaining:1}}};
 const options=getPhase9CandidateMoves(active,'enemy',{maxEvaluations:100});
 assert(options.every(x=>x.placements.every(p=>p.slot<=2)));
});
test('17: meteoriti hanno preavviso, 12 danni solo alla scadenza e non due volte',()=>{
 const s=start(2);
 const announced=endRound(s,90);
 assert.equal(announced.phase17Anomalies.active.kind,'meteor');
 assert.equal(announced.hp.player,120);
 const tick=endRound(announced,90);
 assert.equal(tick.hp.player,120);
 assert.equal(tick.phase17Anomalies.active.remaining,1);
 const impact=endRound(tick,90);
 assert.equal(impact.hp.player,108);
 assert.equal(impact.phase17Anomalies.active,null);
 assert.equal(endRound(impact,90).hp.player,108);
});
test('17: tre semi differenti nella salva contrastano i meteoriti senza creare carte',()=>{
 let s=endRound(start(2),90);
 s=endRound(s,90,{committedCards:[c('a',4,'hearts'),c('b',4,'diamonds'),c('c',4,'spades')]});
 const impact=endRound(s,90);
 assert.equal(impact.hp.player,120);
 assert.match(impact.history.join(' '),/neutralizzato/);
});
test('17: le anomalie terminano e nessun KO richiama un’altra fase o attiva effetti postumi',()=>{
 let s=endRound(start(20),120);
 s=endRound(s,120);
 assert.equal(s.phase17Anomalies.active.kind,'freeze');
 s=endRound(s,120);
 assert.equal(s.phase17Anomalies.active,null);
 assert.equal(s.phase17Anomalies.triggered,1);
 const ko={...s,hp:{...s.hp,enemy:0},winner:'player'};
 const dead=advancePhase17Anomalies(ko);
 assert.strictEqual(dead,ko);
 assert.equal(dead.phase17Anomalies.triggered,1);
});
test('17: l’interfaccia espone anomalie e disabilita lo slot sigillato',()=>{
 const ui=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 assert.match(ui,/SIGILLATO/);
 assert.match(ui,/getPhase17AnomalyNotice/);
 assert.match(ui,/frozenByAnomaly/);
});
test('17: il collasso evita bombe già presenti nei due slot e l’assenza di armi per 3 carte',()=>{
 const s=start(6);
 const board=[null,null,null,c('hidden',7,'clubs'),null];
 const withBomb={...s,board,phase16B:{bomb:{onBoard:{cardId:'hidden',turnsLeft:3}}}};
 const after=endRound(withBomb,60);
 assert.equal(after.phase17Anomalies.active.kind,'meteor');
 const heavyOnly={...s,arsenal:{...s.arsenal,player:{light:null,medium:null,heavy:s.arsenal.player.heavy}}};
 assert.equal(endRound(heavyOnly,60).phase17Anomalies.active.kind,'meteor');
});
