import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhase6Duel } from './phase6Engine.js';
import { initializePhase13CampaignState } from './phase13Campaign.js';
import { initializePhase15 } from './phase15LegacyPassives.js';
import { defaultPhase4Loadout } from './phase4Weapons.js';
import { TURN_PHASES } from './config.js';
import { initializePhase16B,commitPhase16BMove,resolvePhase16BExchange,
  activatePhase16BDice,activatePhase16BMalus,markPhase16BReady,MALUS_EFFECTS } from './phase16BCombat.js';
const c=(id,value,suit)=>({id,value,suit,displayVal:String(value)});
const a=[c('a',8,'hearts'),c('b',8,'diamonds'),c('c',6,'spades'),c('d',4,'clubs')];
const b=[c('e',2,'hearts'),c('f',2,'diamonds'),c('g',3,'clubs'),c('h',10,'spades')];
function game(sector=6){
  return initializePhase16B(initializePhase15(initializePhase13CampaignState(
    createPhase6Duel({playerHand:a,enemyHand:b,playerDeck:[c('p',9,'hearts')],enemyDeck:[c('q',7,'diamonds')],
      playerAmmo:{hearts:20,diamonds:20,clubs:20,spades:20},enemyAmmo:{hearts:20,diamonds:20,clubs:20,spades:20},
      playerHp:100,enemyHp:100}),{planet:1,sector}),{}));
}
const prepared=(g,side='player')=>({...g,phase:TURN_PHASES.PREPARE,ready:{player:false,enemy:false}});
test('16B: la Fase 16A mantiene 12 pianeti, la Carta Dorata inizia dal settore 6',()=>{
 assert.equal(game(1).player.hand.some(x=>x.isGolden),false);
 assert.equal(game(6).player.hand.filter(x=>x.isGolden).length,1);
 assert.equal(game(6).phase16B.earnings.diamonds,0);
});
test('16B: conta la combinazione Poker valida, senza duplicare la ricarica per categoria',()=>{
 const g=game(); const placements=a.map((card,i)=>({slot:i,card}));
 const moved=commitPhase16BMove(g,'player',placements,false,defaultPhase4Loadout().light);
 assert.equal(moved.phase,TURN_PHASES.RESPONSE);
 assert.deepEqual(moved.phase16B.player.dicePatterns,['one_pair']);
 assert.equal(moved.phase16B.player.diceReady,false);
});
test('16B: quattro semi premiano 1 Diamante, con Carta Dorata 2, risoluzione idempotente',()=>{
 const g=game();
 const cards=[c('r1',3,'hearts'),c('r2',4,'diamonds'),c('r3',5,'clubs'),c('r4',6,'spades')];
 const movement={score:{patternId:'straight_4'},committedCards:cards};
 const state={...g,phase:TURN_PHASES.ANIMATE,moves:{player:movement,enemy:{passed:true}},
   result:{winner:'attacker',opener:'player',responder:'enemy',volleys:{player:{damage:8,shots:4},enemy:{damage:0,shots:0}}}};
 const normal=resolvePhase16BExchange(state);
 assert.equal(normal.phase16B.earnings.diamonds,1);
 const gold=resolvePhase16BExchange({...state,moves:{...state.moves,player:{...movement,committedCards:[{...cards[0],isGolden:true},...cards.slice(1)]}}});
 assert.equal(gold.phase16B.earnings.diamonds,2);
 assert.equal(gold.hp.player,100);
 assert.deepEqual(gold.phase16B.earnings,resolvePhase16BExchange(gold).phase16B.earnings);
 assert.equal(state.phase16B.usedGoldIds.length,0,'la risoluzione non muta lo stato precedente');
});
test('16B: Carta Dorata ♦ Polvere, ♣ crediti e ♠ danno puro',()=>{
 const g=game();
 const base={...g,phase:TURN_PHASES.ANIMATE,
  result:{opener:'player',responder:'enemy',winner:'attacker',volleys:{player:{damage:8,shots:2},enemy:{damage:0,shots:0}}}};
 for(const [suit,type,expected] of [['diamonds','dust',20],['clubs','credits',15]]){
  const gold={...base,moves:{player:{score:{patternId:'one_pair'},committedCards:[{...c(`gold-${suit}`,2,suit),isGolden:true},c('other',2,'spades')]},enemy:{passed:true}}};
  assert.equal(resolvePhase16BExchange(gold).phase16B.earnings[type],expected);
 }
 const gold={...base,moves:{player:{score:{patternId:'one_pair'},committedCards:[{...c('gold-spade',2,'spades'),isGolden:true},c('other',2,'hearts')]},enemy:{passed:true}}};
 assert.equal(resolvePhase16BExchange(gold).hp.enemy,92);
});
test('16B: dado pronto dopo tre combinazioni diverse; lancio consuma carica e applica effetto reale',()=>{
 const g=prepared(game());
 const ready={...g,phase16B:{...g.phase16B,player:{...g.phase16B.player,diceReady:true,dicePatterns:['one_pair','three_of_a_kind','straight']}}};
 const rolled=activatePhase16BDice(ready,'player',4);
 assert.equal(rolled.player.ether,g.player.ether+2);
 assert.equal(rolled.phase16B.player.diceReady,false);
 assert.deepEqual(rolled.phase16B.player.dicePatterns,[]);
 assert.throws(()=>activatePhase16BDice(rolled,'player',4),/non pronto/);
 const module=activatePhase16BDice(ready,'player',0);
 assert.equal(module.phase16B.player.moduleCharge,1);
});
test('16B: 12 Malus non ripetibili, uno dei tre disponibili; nessun doppio utilizzo',()=>{
 assert.equal(MALUS_EFFECTS.length,12);
 const g=prepared(game());
 const malus={...g,phase16B:{...g.phase16B,player:{...g.phase16B.player,malusCharge:3,malusChoices:['direct_hit','boost_drain','skip_prepare']}}};
 const after=activatePhase16BMalus(malus,'player','direct_hit');
 assert.equal(after.hp.enemy,92);
 assert.deepEqual(after.phase16B.player.usedMalus,['direct_hit']);
 assert.equal(after.phase16B.player.malusCharge,0);
 assert.throws(()=>activatePhase16BMalus(after,'player','direct_hit'),/non disponibile/);
 const skip=activatePhase16BMalus(malus,'player','skip_prepare');
 assert.equal(skip.phase16B.enemy.skipNextPreparation,true);
});
test('16B: bomba su carta del banco, il giocatore sceglie serbatoio; tre occasioni',()=>{
 const g=game();
 const marked=c('bomb',8,'hearts');
 const state={...g,board:[marked,c('mate',8,'diamonds'),c('other1',6,'spades'),c('other2',7,'clubs'),null],
   phase16B:{...g.phase16B,bomb:{onBoard:{cardId:'bomb',turnsLeft:3,spawnRound:1},inTank:null,lastSpawnRound:1}}};
 const next=commitPhase16BMove(state,'player',[{slot:4,card:state.player.hand[2]}],false,defaultPhase4Loadout().light,null,'heavy');
 assert.equal(next.phase16B.bomb.onBoard,null);
 assert.equal(next.phase16B.bomb.inTank.weaponClass,'heavy');
 assert.equal(next.phase16B.bomb.inTank.receiver,'enemy');
 assert.equal(next.phase16B.bomb.inTank.turnsLeft,3);
});
test('16B: la preparazione torna al combattimento, conservando la barra e il deck',()=>{
 let g=prepared(game());g={...g,ready:{player:false,enemy:true}};
 const next=markPhase16BReady(g,'player');
 assert.equal(next.phase,TURN_PHASES.ATTACK);
 assert.equal(next.phase16B.player.malusCharge,0);
 assert.equal(next.board.length,5);
});
test('16B: quattro semi con Doppia Coppia non danno il premio riservato a Scala o Poker',()=>{
 const g=game(),cards=[c('z1',9,'hearts'),c('z2',9,'diamonds'),c('z3',4,'clubs'),c('z4',4,'spades')];
 const state={...g,phase:TURN_PHASES.ANIMATE,moves:{player:{score:{patternId:'two_pair'},committedCards:cards},enemy:{passed:true}},
   result:{winner:'attacker',opener:'player',responder:'enemy',volleys:{player:{damage:8,shots:4},enemy:{damage:0,shots:0}}}};
 assert.equal(resolvePhase16BExchange(state).phase16B.earnings.diamonds,0);
});
test('16B: mano ridotta a cinque non viene riempita a sette durante la preparazione',()=>{
 let g=prepared(game());
 g={...g,player:{...g.player,hand:[...g.player.hand,c('i',4,'spades'),c('l',5,'clubs'),c('m',6,'diamonds')]},
   ready:{player:false,enemy:true},phase16B:{...g.phase16B,player:{...g.phase16B.player,handLimit:5}}};
 const next=markPhase16BReady(g,'player');
 assert.equal(next.phase,TURN_PHASES.ATTACK);
 assert.equal(next.player.hand.length,5);
 assert.equal(next.phase16B.player.handLimit,0);
});
