import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_SLOT_COUNT, MAX_PLACED_CARDS_PER_ACTION, POKER_PATTERNS } from './config.js';
import { applyBoardPlacements, removeCommittedCards, resolveBoardPlacementSlot, requiredBoardPlacements } from './combatBasics.js';
import { evaluateExactPokerPattern, findBestPokerCombination, listAvailablePokerCombinations, getLegacyPokerPatternIds } from './pokerRules.js';
import { comparePokerScores } from './pokerRules.js';

const card = (rank, suit = 'hearts', prefix = '') => ({ id: `${prefix}${suit}-${rank}`, value: rank, suit });
const joker = (id = 'joker-1') => ({ id, suit: 'joker', isJoker: true, value: 0 });
const seq = (ranks, suit = 'hearts', prefix = '') => ranks.map(n => card(n, suit, prefix));
const placements = (cards, slotOffset = 0) => cards.map((c, i) => ({ slot: slotOffset + i, card: c }));

test('Cinque posti fisici, quattro carte massimo per azione', () => {
  assert.equal(BOARD_SLOT_COUNT, 5);
  assert.equal(requiredBoardPlacements([null,null,null,null,null],7),4);
  assert.equal(requiredBoardPlacements([null,null,null,null,null],2),2);
  assert.equal(requiredBoardPlacements([card(8),card(9),null,null,null],7),3);
  assert.equal(MAX_PLACED_CARDS_PER_ACTION, 4);
  const hand = seq([1, 2, 3, 4, 5]);
  assert.equal(applyBoardPlacements([null, null, null, null, null], placements(hand.slice(0,3)), {availableCardIds:hand.map(c=>c.id)}).valid,false);
  const result = applyBoardPlacements([null,null,null,null,null],placements(hand.slice(0,4)),{availableCardIds:hand.map(c=>c.id)});
  assert.equal(result.valid,true);
  assert.equal(result.board.length,5);
  assert.equal(result.emptySlots,1);
  assert.equal(applyBoardPlacements([null,null,null,null,null],placements(hand),{availableCardIds:hand.map(c=>c.id)}).valid,false);
});

test('Con tre vuoti si gioca 3 obbligatorie + quarta sostituzione opzionale', () => {
  const previous = [card(5),null, null,null,card(9)];
  const hand = seq([7,8,10,11],'spades');
  const play3 = applyBoardPlacements(previous,placements(hand.slice(0,3),1),{availableCardIds:hand.map(c=>c.id)});
  assert.equal(play3.valid,true);
  assert.equal(play3.replacedCards.length,0);
  assert.equal(applyBoardPlacements(previous,[{slot:0,card:hand[0]},{slot:1,card:hand[1]},{slot:2,card:hand[2]}],{availableCardIds:hand.map(c=>c.id)}).error,'must_fill_empty_slots');
  const play4 = applyBoardPlacements(previous,[...placements(hand.slice(0,3),1),{slot:0,card:hand[3]}],{availableCardIds:hand.map(c=>c.id)});
  assert.equal(play4.valid,true);
  assert.deepEqual(play4.replacedCards,[previous[0]]);
  assert.deepEqual(removeCommittedCards(play4.board,hand.slice(0,3).map(c=>c.id)),[hand[3],null,null,null,previous[4]]);
  assert.equal(resolveBoardPlacementSlot(previous,0),1);
});

test('Banco pieno: da una a quattro sostituzioni senza duplicare ID', () => {
  const old = seq([1,2,3,4,5],'clubs');
  const incoming = seq([6,7,8,9],'diamonds');
  const result=applyBoardPlacements(old,placements(incoming),{availableCardIds:incoming.map(c=>c.id)});
  assert.equal(result.valid,true);
  assert.equal(result.board[4],old[4]);
  assert.equal(result.replacedCards.length,4);
  assert.equal(applyBoardPlacements(old,[{slot:0,card:incoming[0]},{slot:1,card:incoming[0]}]).error,'duplicate_card');
  assert.equal(applyBoardPlacements(old,[{slot:0,card:incoming[0]},{slot:0,card:incoming[1]}]).error,'duplicate_slot');
  assert.equal(applyBoardPlacements(old,[{slot:1,card:incoming[0]}],{availableCardIds:[]}).error,'not_in_hand');
});

test('Scala minima da quattro, scala completa da cinque, confronto gerarchico', () => {
  const four = seq([4,5,6,7],'clubs');
  const five = seq([4,5,6,7,8],'clubs');
  const s4=evaluateExactPokerPattern(four,'straight_4');
  const s5=evaluateExactPokerPattern(five,'straight_5');
  assert.ok(s4); assert.ok(s5);
  assert.equal(comparePokerScores(s5,s4),1);
  assert.equal(evaluateExactPokerPattern(four,'straight_5'),null);
  assert.equal(evaluateExactPokerPattern(seq([2,3,5,6]),'straight_4'),null);
  assert.ok(evaluateExactPokerPattern(seq([1,2,3,4]),'straight_4'));
  assert.ok(evaluateExactPokerPattern(seq([11,12,13,1]),'straight_4'));
});

test('Colore minimo quattro / cinque superiore; carta diversa rompe colore', () => {
  const four=seq([2,7,9,11],'hearts');
  const five=[...four,card(13,'hearts')];
  assert.ok(evaluateExactPokerPattern(four,'flush_4'));
  assert.equal(comparePokerScores(evaluateExactPokerPattern(five,'flush_5'),evaluateExactPokerPattern(four,'flush_4')),1);
  assert.equal(evaluateExactPokerPattern([...four.slice(0,3),card(11,'spades')],'flush_4'),null);
});

test('Scala a colore da quattro distinta da vera scala reale da cinque', () => {
  assert.ok(evaluateExactPokerPattern(seq([10,11,12,13],'spades'),'straight_flush_4'));
  assert.equal(evaluateExactPokerPattern(seq([9,10,11,12,13],'spades'),'royal_flush_5'),null);
  assert.ok(evaluateExactPokerPattern(seq([10,11,12,13,1],'spades'),'royal_flush_5'));
  assert.equal(evaluateExactPokerPattern(seq([10,11,12,13,1],'spades'),'straight_flush_4'),null);
  assert.equal(evaluateExactPokerPattern([card(10,'hearts'),...seq([11,12,13,1],'spades')],'royal_flush_5'),null);
});

test('Doppia coppia, full, poker: confronto e valori degli assi', () => {
  const pairs=[card(8,'clubs'),card(8,'diamonds'),card(12,'hearts'),card(12,'spades')];
  const full=[...pairs.slice(0,2), card(8,'spades'), ...pairs.slice(2)];
  assert.deepEqual(evaluateExactPokerPattern(pairs,'two_pair').kickers,[12,8]);
  assert.deepEqual(evaluateExactPokerPattern(full,'full_house').kickers,[8,12]);
  const quads=[card(1,'clubs'),card(1,'diamonds'),card(1,'hearts'),card(1,'spades')];
  assert.deepEqual(evaluateExactPokerPattern(quads,'four_of_a_kind').kickers,[14]);
});

test('Jolly completa coppia, tris, poker e scala interna senza falsi positivi', () => {
  const j=joker();
  assert.ok(evaluateExactPokerPattern([card(7),j],'one_pair'));
  assert.ok(evaluateExactPokerPattern([card(7),card(7,'spades'),j],'three_of_a_kind'));
  assert.ok(evaluateExactPokerPattern([card(7),card(7,'clubs'),card(7,'diamonds'),j],'four_of_a_kind'));
  assert.ok(evaluateExactPokerPattern([card(5),card(6,'clubs'),card(8,'diamonds'),j],'straight_4'));
  assert.equal(evaluateExactPokerPattern([card(4),card(4,'clubs'),card(7,'diamonds'),j],'straight_4'),null);
  assert.ok(evaluateExactPokerPattern([card(8,'clubs'),card(8,'diamonds'),j,joker('joker-2')],'two_pair'));
});

test('Jolly trasformato mantiene il numero scelto, seme flessibile', () => {
  const j={...joker(),isTransformed:true,transformedValue:3};
  assert.ok(evaluateExactPokerPattern([...seq([1,2,4],'hearts'),j],'straight_flush_4'));
  assert.equal(evaluateExactPokerPattern([...seq([8,9,10],'hearts'),j],'straight_4'),null);
  assert.ok(evaluateExactPokerPattern([...seq([9,10,11],'hearts'),joker()],'straight_flush_4'));
  assert.ok(evaluateExactPokerPattern([card(1,'spades'),joker()],'one_pair'));
});

test('Jolly e full/scala reale corretti; 5 Jolly non mandano in loop il motore', () => {
  const cards=[card(13,'hearts'),card(13,'clubs'),card(2,'diamonds'),joker(),joker('joker-2')];
  assert.ok(evaluateExactPokerPattern(cards,'full_house'));
  const royal=[...seq([10,11,12],'spades'),joker(),joker('joker-2')];
  assert.ok(evaluateExactPokerPattern(royal,'royal_flush_5'));
  assert.ok(evaluateExactPokerPattern(Array.from({length:5},(_,i)=>joker(`joker-${i}`)),'royal_flush_5'));
});

test('Selezione migliore figura: categoria prima del valore, IDs esatti', () => {
  const board=[card(13,'hearts'),card(13,'spades'),card(4,'hearts'),card(4,'clubs'),card(4,'diamonds')];
  const best=findBestPokerCombination(board);
  assert.equal(best.patternId,'full_house');
  assert.equal(best.cardIds.length,5);
  assert.ok(listAvailablePokerCombinations(board).some(c=>c.patternId==='three_of_a_kind'));
  assert.equal(findBestPokerCombination(board,['one_pair','three_of_a_kind']).patternId,'three_of_a_kind');
  assert.equal(findBestPokerCombination(board,['straight_4']),null);
  assert.deepEqual(getLegacyPokerPatternIds('straight',4),['straight_4']);
  assert.deepEqual(getLegacyPokerPatternIds('straight',5),['straight_5']);
  assert.deepEqual(getLegacyPokerPatternIds('royal_flush',4),['straight_flush_4']);
});

test('Nessun pattern ha tier duplicato, per evitare classifiche ambigue', () => {
  assert.equal(POKER_PATTERNS.length,new Set(POKER_PATTERNS.map(p=>p.tier)).size);
});
