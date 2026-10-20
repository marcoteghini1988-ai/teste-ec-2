import test from 'node:test';
import assert from 'node:assert/strict';
import { TURN_PHASES } from './config.js';
import { commitPhase5Move } from './phase5Engine.js';
import { createPhase6Duel, finishPhase6Animation, exchangePhase6Cards,extractPhase6WithEther,
  markPhase6Ready,getPhase6RemainingSeconds,expirePhase6Preparation,
  planPhase6AIPreparation,executePhase6AIPreparation,PHASE6_SWAP_COSTS,PHASE6_ETHER_COST } from './phase6Engine.js';
const c=(value,suit='hearts',id=`${suit}_${value}`)=>({value,suit,id});
const baseHand=()=>[c(7,'hearts','h7'),c(7,'clubs','c7'),c(2,'spades','s2'),c(4,'diamonds','d4'),c(11,'hearts','h11'),c(3,'clubs','c3'),c(12,'spades','s12')];
const aiHand=()=>[c(8,'hearts','e8'),c(8,'clubs','e8c'),c(5,'clubs','e5'),c(13,'diamonds','e13'),c(6,'spades','e6'),c(3,'hearts','e3'),c(2,'clubs','e2')];
const deck=()=>[c(7,'diamonds','d7'),c(9,'hearts','h9'),c(12,'diamonds','d12'),c(10,'spades','s10'),c(5,'diamonds','d5'),c(1,'hearts','ha')];
const create=(opts={})=>createPhase6Duel({playerHand:baseHand(),enemyHand:aiHand(),playerDeck:deck(),enemyDeck:deck().map(card=>({...card,id:'e_'+card.id})),ether:12,...opts});
const prepared=(opts={})=>{
  let g=create(opts);
  g=commitPhase5Move(g,'player',[],true);
  g=commitPhase5Move(g,'enemy',[],true);
  return finishPhase6Animation(g);
};
test('Etere iniziale equo fra giocatore e computer, con possibile riserva esplicita',()=>{
  const duel=create({ether:8});
  assert.equal(duel.player.ether,8);
  assert.equal(duel.enemy.ether,8);
  assert.equal(create({ether:8,enemyEther:5}).enemy.ether,5);
});
test('Preparazione della F6 dopo l’animazione, doppio ready e nessun blocco',()=>{
  let g=prepared();
  assert.equal(g.phase,TURN_PHASES.PREPARE);
  assert.equal(g.player.exchangesLeft,2);
  g=markPhase6Ready(g,'player');
  assert.equal(g.ready.player,true);assert.equal(g.ready.enemy,false);
  g=markPhase6Ready(g,'enemy');
  assert.equal(g.phase,TURN_PHASES.ATTACK);
  assert.equal(g.round,2);
  assert.equal(g.preparation.timePenaltySeconds.player,0);
});
test('Penalità legacy accurate: 1 carta = +3 HP avversario; nessuna perdita di tempo',()=>{
  let g=prepared(); g={...g,hp:{...g.hp,enemy:100}};
  const handBefore=g.player.hand.length;
  const cardId=g.player.hand[0].id;
  g=exchangePhase6Cards(g,'player',[0]);
  assert.equal(g.hp.enemy,103);
  assert.equal(g.hp.player,120);
  assert.equal(g.preparation.timePenaltySeconds.player,0);
  assert.equal(g.player.hand.length,handBefore);
  assert.ok(g.player.discard.some(x=>x.id===cardId));
  assert.equal(g.player.exchangesLeft,1);
});
test('2 carte = +3 HP avversario e −3s SOLO per chi cambia',()=>{
  let g=prepared();g={...g,hp:{...g.hp,enemy:102}};
  g=exchangePhase6Cards(g,'player',[0,1]);
  assert.equal(g.hp.enemy,105);
  assert.equal(g.preparation.timePenaltySeconds.player,3);
  assert.equal(g.preparation.timePenaltySeconds.enemy,0);
  assert.equal(getPhase6RemainingSeconds(g,'player',10),22);
  assert.equal(getPhase6RemainingSeconds(g,'enemy',10),25);
  assert.equal(g.hp.player,120);
});
test('3 carte = +3 HP avversario, −3s propri, −3 HP propri',()=>{
  let g=prepared();g={...g,hp:{player:28,enemy:70}};
  g=exchangePhase6Cards(g,'player',[0,1,2]);
  assert.equal(g.hp.player,25);assert.equal(g.hp.enemy,73);
  assert.equal(g.preparation.timePenaltySeconds.player,3);
  assert.equal(g.preparation.statistics.player.cardsSwapped,3);
});
test('Cambi consecutivi (max 2): penalità e statistiche cumulative',()=>{
  let g=prepared();g={...g,hp:{player:22,enemy:70}};
  g=exchangePhase6Cards(g,'player',[0,1]);
  g=exchangePhase6Cards(g,'player',[0,1,2]);
  assert.equal(g.hp.enemy,76);assert.equal(g.hp.player,19);
  assert.equal(g.preparation.timePenaltySeconds.player,6);
  assert.equal(g.preparation.statistics.player.swaps,2);
  assert.equal(g.preparation.statistics.player.cardsSwapped,5);
  assert.throws(()=>exchangePhase6Cards(g,'player',[0]),/massimo 2/);
});
test('Hp curati non superano il massimo, danno fino allo zero conclude la battaglia',()=>{
  let g=prepared();
  g=exchangePhase6Cards(g,'player',[0]);
  assert.equal(g.hp.enemy,g.initialHp.enemy);
  let fatal=prepared();fatal={...fatal,hp:{player:3,enemy:90}};
  fatal=exchangePhase6Cards(fatal,'player',[0,1,2]);
  assert.equal(fatal.hp.player,0);
  assert.equal(fatal.winner,'enemy');assert.equal(fatal.phase,TURN_PHASES.FINISHED);
});
test('Immunità future del pilota: ogni penalità disattivabile separatamente',()=>{
  let g=prepared();g={...g,hp:{player:50,enemy:50}};
  g=exchangePhase6Cards(g,'player',[0,1,2],{noEnemyHeal:true,noTimeLoss:true,noSelfDamage:true});
  assert.deepEqual(g.hp,{player:50,enemy:50});
  assert.equal(g.preparation.timePenaltySeconds.player,0);
  assert.equal(g.preparation.statistics.player.swaps,1);
});
test('Una mossa invalida non causa effetti collaterali: indici, doppioni, pronta, fase sbagliata',()=>{
  const g=prepared(); const snapshot=JSON.stringify(g);
  assert.throws(()=>exchangePhase6Cards(g,'player',[]),/da 1 a 3/);
  assert.throws(()=>exchangePhase6Cards(g,'player',[1,1]),/da 1 a 3/);
  assert.throws(()=>exchangePhase6Cards(g,'player',[20]),/Carta non valida/);
  assert.equal(JSON.stringify(g),snapshot);
  const ready=markPhase6Ready(g,'player');
  assert.throws(()=>exchangePhase6Cards(ready,'player',[0]),/preparazione/);
  assert.throws(()=>exchangePhase6Cards(create(),'player',[0]),/preparazione/);
});
test('Estrazione Etere: carta scelta del mazzo, costo preciso e nessun doppio consumo',()=>{
  let g=prepared();
  const card=g.player.deck[2];
  const old=g.player.hand[0];
  const ether=g.player.ether;
  g=extractPhase6WithEther(g,'player',0,2);
  assert.equal(g.player.ether,ether-PHASE6_ETHER_COST);
  assert.equal(g.player.hand[0].id,card.id);
  assert.ok(g.player.discard.some(c=>c.id===old.id));
  assert.equal(g.preparation.statistics.player.etherExtracts,1);
  assert.equal(g.preparation.timePenaltySeconds.player,0);
  assert.equal(g.player.exchangesLeft,2,'Etere non consuma operazioni di cambio');
  assert.equal(g.player.deck.some(c=>c.id===card.id),false);
});
test('Etere insufficiente / scelta invalida non mutano lo stato',()=>{
  const g=prepared({ether:3}); const snap=JSON.stringify(g);
  assert.throws(()=>extractPhase6WithEther(g,'player',0,0),/insufficiente/);
  const enough=prepared({ether:6}); const snapEnough=JSON.stringify(enough);
  assert.throws(()=>extractPhase6WithEther(enough,'player',0,999),/Indici non validi/);
  assert.equal(JSON.stringify(enough),snapEnough);
  assert.equal(JSON.stringify(g),snap);
});
test('Preparazione indipendente: il PRONTO di uno non blocca l’altro',()=>{
  let g=prepared();g={...g,hp:{...g.hp,player:90}};
  g=markPhase6Ready(g,'player');
  assert.equal(g.phase,TURN_PHASES.PREPARE);
  g=exchangePhase6Cards(g,'enemy',[0]);
  assert.equal(g.ready.player,true);
  assert.equal(g.hp.player,93);
  g=markPhase6Ready(g,'enemy');
  assert.equal(g.phase,TURN_PHASES.ATTACK);
});
test('Scadenze personali: cambio 2 carte anticipa solo la propria chiusura',()=>{
  let g=prepared();g=exchangePhase6Cards(g,'player',[0,1]);
  assert.equal(getPhase6RemainingSeconds(g,'player',31.9),1);
  assert.equal(getPhase6RemainingSeconds(g,'enemy',31.9),4);
  g=expirePhase6Preparation(g,32.05);
  assert.equal(g.ready.player,true);assert.equal(g.ready.enemy,false);
  assert.equal(g.phase,TURN_PHASES.PREPARE);
  g=expirePhase6Preparation(g,35.1);
  assert.equal(g.phase,TURN_PHASES.ATTACK);
});
test('Preparazione finita: scadenza non crea turni supplementari e nessuna doppia risoluzione',()=>{
  let g=prepared();
  g=expirePhase6Preparation(g,40);
  assert.equal(g.round,2);assert.equal(g.phase,TURN_PHASES.ATTACK);
  const snap=JSON.stringify(g);
  assert.equal(JSON.stringify(expirePhase6Preparation(g,70)),snap);
});
test('Computer: scelta senza mutazione, cambio onesto, READY automatico e simmetria penalità',()=>{
  let g=prepared(); g={...g,hp:{player:70,enemy:80}};
  const snap=JSON.stringify(g);
  const plan=planPhase6AIPreparation(g,'enemy');
  assert.ok(Array.isArray(plan.swaps));
  assert.equal(JSON.stringify(g),snap);
  const after=executePhase6AIPreparation(g,'enemy');
  assert.equal(after.ready.enemy,true);
  assert.equal(after.phase,TURN_PHASES.PREPARE);
  assert.equal(after.ready.player,false);
  assert.equal(after.hp.player,70+after.preparation.statistics.enemy.swaps*3);
  assert.equal(after.preparation.timePenaltySeconds.player,0);
});
test('AI può usare Etere per trasformare una coppia in tris senza consumare cambio',()=>{
  let g=prepared();
  g={...g,enemy:{...g.enemy,
    hand:[c(8,'hearts','e8'),c(8,'clubs','e8c'),c(3,'diamonds','ex3'),c(4,'clubs','ex4')],
    deck:[c(8,'spades','ex8'),...deck().map(card=>({...card,id:'other'+card.id}))],
    ether:5,exchangesLeft:0}};
  const preparedByAi=executePhase6AIPreparation(g,'enemy');
  assert.equal(preparedByAi.enemy.ether,1);
  assert.equal(preparedByAi.enemy.hand.filter(c=>c.value===8).length,3);
  assert.equal(preparedByAi.preparation.statistics.enemy.etherExtracts,1);
});
test('Le soglie e i costi sono documentati e non alterati',()=>{
  assert.equal(PHASE6_SWAP_COSTS.one.enemyHeal,3);
  assert.equal(PHASE6_SWAP_COSTS.two.ownTimeSeconds,3);
  assert.equal(PHASE6_SWAP_COSTS.three.selfDamage,3);
  assert.equal(PHASE6_ETHER_COST,4);
});
