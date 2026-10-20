import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase6Duel} from './phase6Engine.js';
import {getPhase9CandidateMoves,planPhase9Attack} from './phase9AI.js';
import {getPhase4MoveOptions} from './phase4Engine.js';
import {ARSENAL_48} from './weaponCatalog.js';
const card=(i,value,suit)=>({id:i,value,suit});
const hand=[card('a',9,'diamonds'),card('b',9,'clubs'),card('c',2,'hearts'),card('d',3,'diamonds'),card('e',4,'spades'),card('f',5,'clubs'),card('g',13,'spades')];
const init=()=>createPhase6Duel({opener:'enemy',enemyHand:hand,playerHand:[],enemyDeck:[],playerDeck:[],
 enemyLoadout:{light:null,medium:null,heavy:'es_common_heavy_01'},
 playerLoadout:{light:null,medium:null,heavy:null},
 enemyAmmo:{hearts:30,diamonds:30,clubs:30,spades:30},playerAmmo:{hearts:0,diamonds:0,clubs:0,spades:0}});
test('17M: la ricerca valutata in 40 mosse esplora quaterne distinte e trova una Scala utilizzabile',()=>{
 const game=init(),before=JSON.stringify(game);
 const candidates=getPhase9CandidateMoves(game,'enemy',{maxEvaluations:40});
 assert(candidates.some(x=>x.choice.score.patternId==='straight_4'&&x.choice.activationMode==='secondary'));
 const move=planPhase9Attack(game,'enemy',{maxEvaluations:40});
 assert(move?.choice.canFire);
 assert(getPhase4MoveOptions(game,'enemy',move.placements).some(x=>x.canFire&&x.weaponId===move.weaponId));
 assert.equal(JSON.stringify(game),before,'non modificare mano, banco o serbatoi');
});
test('17M: la correzione dell IA non modifica le 16 Pesanti e la loro singola alternativa',()=>{
 const heavies=ARSENAL_48.filter(w=>w.weaponClass==='heavy');
 assert.equal(heavies.length,16);
 for(const w of heavies){
  assert.equal(w.allowedPokerPatterns.length,3,w.id);
  assert.equal(w.allowedPokerPatterns.filter(p=>p===w.secondaryActivationPattern).length,1,w.id);
  assert(!w.allowedPokerPatterns.includes('one_pair')&&!w.allowedPokerPatterns.includes('three_of_a_kind'),w.id);
 }
});
test('17M: la ricerca non inventa mosse quando la Pesante non è equipaggiata',()=>{
 const game=init();game.arsenal.enemy.heavy=null;
 assert.equal(getPhase9CandidateMoves(game,'enemy',{maxEvaluations:40}).length,0);
});
