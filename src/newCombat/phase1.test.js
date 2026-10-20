import test from 'node:test';
import assert from 'node:assert/strict';
import { ARSENAL_48, listWeapons } from './weaponCatalog.js';
import { BOARD_SLOT_COUNT, MAX_PLACED_CARDS_PER_ACTION, WEAPON_SLOTS, PHASE_MAX_SECONDS } from './config.js';
import { applyBoardPlacements, removeCommittedCards } from './combatBasics.js';
import { evaluateExactPokerPattern, findBestPokerCombination } from './pokerRules.js';
import { comparePokerScores, resolveExchange, calculateAmmoUsage } from './pokerRules.js';
import { checkBoostCalculation, spendBoostEnergy } from './phase5Engine.js';
import { previewLegacyLoadoutMigration, validateClassLoadout } from './combatBasics.js';
import { createTurnCycle, nextPhase, getTimeoutAction, shouldPauseDecisionTimer } from './combatBasics.js';
const c=(v,s='hearts',i='')=>({id:`${v}_${s}_${i}`,value:v,suit:s});
test('catalogo 48 univoche: 4 per ogni rarità e classe',()=>{
 assert.equal(ARSENAL_48.length,48);
 assert.equal(new Set(ARSENAL_48.map(w=>w.id)).size,48);
 assert.equal(new Set(ARSENAL_48.map(w=>w.effect.id)).size,48);
 assert.equal(ARSENAL_48.find(w=>w.legacyId==='wp_gatling').ammoSuit,'spades');
 for(const rarity of ['common','rare','epic','legendary']) for(const weaponClass of ['light','medium','heavy']) {
  const weapons=listWeapons({rarity,weaponClass});
  assert.equal(weapons.length,4,`${rarity} ${weaponClass}`);
  assert.deepEqual(new Set(weapons.map(w=>w.ammoSuit)),new Set(['hearts','diamonds','clubs','spades']));
  assert.ok(weapons.every(w=>w.effect.description && w.visual.artDirection && w.allowedPokerPatterns.length>0));
 }
});
test('tre classi + Boost; quattro semi disponibili',()=>{
 assert.deepEqual(WEAPON_SLOTS.map(s=>s.weaponClass),['light','medium','heavy','boost']);
 assert.equal(PHASE_MAX_SECONDS.attack,25); assert.equal(PHASE_MAX_SECONDS.response,25); assert.equal(PHASE_MAX_SECONDS.prepare,35);
 assert.equal(BOARD_SLOT_COUNT,5);assert.equal(MAX_PLACED_CARDS_PER_ACTION,4);
});
test('banco vuoto: obbligatorio posare 4 carte, 5 slot restano',()=>{
 const cards=[c(1),c(2),c(3),c(4)];const placements=cards.map((card,slot)=>({slot,card}));
 const result=applyBoardPlacements([null,null,null,null,null],placements);
 assert.equal(result.valid,true);assert.equal(result.board.length,5);assert.equal(result.emptySlots,1);
 assert.equal(applyBoardPlacements([null,null,null,null,null],placements.slice(0,3)).error,'must_fill_empty_slots');
});
test('slot vuoti prima, quarta carta facoltativa per sostituire',()=>{
 const old=c(5,'clubs'); const retained=c(10,'diamonds'); const next=[c(8,'hearts'),c(8,'diamonds'),c(8,'spades'),c(12,'clubs')];
 const a=applyBoardPlacements([null,null,null,old,retained],next.slice(0,3).map((card,slot)=>({slot,card})));
 assert.equal(a.valid,true);assert.equal(a.emptySlots,0);
 const b=applyBoardPlacements([null,null,null,old,retained],next.map((card,slot)=>({slot,card})));
 assert.equal(b.valid,true);assert.equal(b.emptySlots,0);
 const invalid=applyBoardPlacements([null,null,null,old,retained],[{slot:3,card:next[0]}]);
 assert.equal(invalid.valid,false);
});
test('tutte e quattro le sostituzioni consentite su banco pieno',()=>{
 const old=[c(2),c(3),c(4),c(5),c(6)];
 const newer=[c(7),c(8),c(9),c(10)];
 const result=applyBoardPlacements(old,newer.map((card,slot)=>({slot,card})));
 assert.equal(result.valid,true);assert.equal(result.replacedCards.length,4);assert.equal(result.board[4].id,old[4].id);
});
test('nessuna carta duplicata, rimozione soltanto delle carte impegnate',()=>{
 const card=c(8);assert.equal(applyBoardPlacements([null,null,null,null,null],[{slot:0,card},{slot:1,card}]).error,'duplicate_card');
 const board=[c(7,'hearts'),c(7,'clubs'),c(3,'clubs'),null,null];
 assert.equal(removeCommittedCards(board,[board[0].id,board[1].id])[2].id,board[2].id);
});
test('scala/colore da quattro, versione da cinque superiore',()=>{
 const st4=[c(5,'hearts'),c(6,'diamonds'),c(7,'clubs'),c(8,'spades')];
 const st5=[...st4,c(9,'hearts')];
 const four=findBestPokerCombination(st4,['straight_4','straight_5']);
 const five=findBestPokerCombination(st5,['straight_4','straight_5']);
 assert.equal(four.patternId,'straight_4');assert.equal(five.patternId,'straight_5');assert.equal(comparePokerScores(four,five),-1);
 const flush4=[c(2,'spades'),c(5,'spades'),c(9,'spades'),c(12,'spades')];
 assert.equal(findBestPokerCombination(flush4,['flush_4','flush_5']).patternId,'flush_4');
 assert.equal(findBestPokerCombination([...flush4,c(13,'spades')],['flush_4','flush_5']).patternId,'flush_5');
});
test('la scala reale richiede 10-J-Q-K-A stesso seme',()=>{
 const real=[c(10,'spades'),c(11,'spades'),c(12,'spades'),c(13,'spades'),c(1,'spades')];
 assert.ok(evaluateExactPokerPattern(real,'royal_flush_5'));
 assert.equal(evaluateExactPokerPattern([c(9,'spades'),...real.slice(0,4)],'royal_flush_5'),null);
});
test('confronto tris prevale su coppia; pari genera danno e ammo a metà',()=>{
 const pair=findBestPokerCombination([c(13,'hearts'),c(13,'clubs')]);
 const tris=findBestPokerCombination([c(4,'hearts'),c(4,'clubs'),c(4,'spades')]);
 assert.equal(comparePokerScores(tris,pair),1);
 assert.deepEqual(resolveExchange({score:tris},{score:pair}).damagePercent,[100,50]);
 assert.deepEqual(resolveExchange({score:pair},{score:pair}).ammoPercent,[50,50]);
 assert.deepEqual(resolveExchange({score:tris},null).damagePercent,[100,0]);
 assert.deepEqual(resolveExchange(null,{score:pair}).damagePercent,[0,100]);
});
test('mezza salva senza doppia penalizzazione: dispari resta da decidere',()=>{
 assert.deepEqual(calculateAmmoUsage(6,50),{resolved:true,shots:3});
 assert.equal(calculateAmmoUsage(5,50).reason,'ODD_SALVO_ROUNDING_UNDECIDED');
});
test('Boost soglie e residui, calcolo su due carte',()=>{
 assert.equal(spendBoostEnergy(17,15).remaining,2);
 assert.equal(spendBoostEnergy(31,30).remaining,1);
 assert.equal(spendBoostEnergy(29,15).remaining,14);
 assert.equal(spendBoostEnergy(29,30).valid,false);
 assert.equal(checkBoostCalculation(c(4),c(2),'+' ,6),true);
 assert.equal(checkBoostCalculation(c(4),c(2),'-' ,2),true);
 assert.equal(checkBoostCalculation(c(4),c(2),'*' ,8),true);
 assert.equal(checkBoostCalculation(c(4),c(2),'/' ,2),true);
});
test('migrazione di anteprima preserva 4 slot legacy e non inventa un’arma media',()=>{
 const defs=[{id:'l',weight:'light',type:'poker'},{id:'h',weight:'heavy',type:'poker'},{id:'m',weight:'light',type:'math'}];
 const original=['l','h','m','unused'];
 const result=previewLegacyLoadoutMigration(original,defs);
 assert.deepEqual(result.oldEquippedPreserved,original);
 assert.deepEqual(result.proposed,{light:'l',medium:null,heavy:'h',boost:null});
 assert.deepEqual(result.unresolvedLegacyWeapons,['m','unused']);
 assert.equal(validateClassLoadout({light:'es_common_light_01',medium:'es_rare_medium_02',heavy:'es_legendary_heavy_04'},ARSENAL_48).valid,true);
 assert.equal(validateClassLoadout({light:'es_rare_heavy_01'},ARSENAL_48).valid,false);
});
test('sequenza delle fasi e timer non fissi',()=>{
 assert.equal(createTurnCycle('p1').phase,'attack');
 assert.equal(nextPhase('attack'),'response');assert.equal(nextPhase('response'),'resolve');
 assert.equal(nextPhase('resolve'),'animate');assert.equal(nextPhase('animate'),'prepare');assert.equal(nextPhase('prepare'),'attack');
 assert.equal(getTimeoutAction('attack'),'pass'); assert.equal(getTimeoutAction('response'),'pass'); assert.equal(getTimeoutAction('prepare'),'auto_ready');
 assert.equal(shouldPauseDecisionTimer('animate'),true);assert.equal(shouldPauseDecisionTimer('attack'),false);
});
