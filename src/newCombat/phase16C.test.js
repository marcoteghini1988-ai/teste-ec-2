import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase13CampaignState} from './phase13Campaign.js';
import {initializePhase15,exchangePhase15Cards} from './phase15LegacyPassives.js';
import {initializePhase16B} from './phase16BCombat.js';
import {TURN_PHASES} from './config.js';
import {defaultPhase4Loadout} from './phase4Weapons.js';
import {getWeaponDefinition} from './weaponCatalog.js';
import {getPhase4MoveOptions,commitPhase4Move} from './phase4Engine.js';
import {evaluateExactPokerPattern} from './pokerRules.js';
import {initializePhase16C,analyzePhase16CMobius,arrangePhase16CMobiusDeck,
 beginPhase16CPreparation,resolvePhase16CExchange,getPhase16CHeat,PHASE16C_HEAT_LIMIT,
 offerPhase16CDice,selectPhase16CDice,consumePhase16CMatrix} from './phase16CEpics.js';
const card=(id,value,suit)=>({id,value,suit,displayVal:String(value)});
const hand=[card('hA1',1,'hearts'),card('hA2',1,'diamonds'),card('h3',3,'spades'),card('h4',4,'hearts'),card('h5',5,'diamonds'),card('h6',6,'clubs'),card('h7',7,'spades')];
const deck=[card('d3',3,'clubs'),card('d8',8,'hearts'),card('dA3',1,'clubs'),card('d10',10,'spades'),card('dA4',1,'spades'),card('d11',11,'hearts'),card('d12',12,'diamonds'),card('d13',13,'clubs'),card('d9',9,'spades'),card('d2',2,'hearts'),card('d4',4,'clubs')];
function game(ids=[],hp=100){
 const loadout={epics:ids.map(id=>({id,level:1,name:id}))};
 return initializePhase16C(initializePhase16B(initializePhase15(initializePhase13CampaignState(
  createPhase6Duel({playerHand:hand,enemyHand:hand.map((c,i)=>({...c,id:`en${i}`})),playerDeck:deck,
   enemyDeck:[card('de',5,'hearts')],playerAmmo:{hearts:90,diamonds:90,clubs:90,spades:90},
   playerHp:100,enemyHp:100}),{planet:1,sector:6}),loadout)));
}
const prepare=g=>({...g,hp:{...g.hp,player:30},phase:TURN_PHASES.PREPARE,ready:{player:false,enemy:false}});
const volleyState=(g,playerDamage,enemyDamage,weaponClass='heavy')=>{
 const weaponId=g.arsenal.player[weaponClass];
 return {...g,phase:TURN_PHASES.ANIMATE,
  result:{opener:'player',responder:'enemy',winner:'attacker',volleys:{player:{weaponId,damage:playerDamage,shots:2},enemy:{weaponId:g.arsenal.enemy.light,damage:enemyDamage,shots:2}}},
  moves:{player:{score:{patternId:'one_pair'},committedCards:[hand[0],hand[1]]},enemy:{score:{patternId:'one_pair'},committedCards:[hand[0],hand[1]]}}};
};
test('16C: sei Epici autorizzati, esclusi ID storici non associati ai varchi',()=>{
 const g=game(['epic_item_1','epic_item_7']);
 assert.deepEqual(g.phase16C.equipped,['epic_item_1','epic_item_7']);
 assert.equal(g.legacyPassives.loadout.epics.length,2,'slot storico resta limitato a due, senza regalare oggetti');
});
test('16C: Möbius analizza solo mano e mazzo; pesca quattro Assi solo se arma li accetta',()=>{
 const g=game(['epic_item_1']);
 // Forza arma Pesante da Poker con profilo del catalogo.
 const heavy=g.arsenal.player.heavy;
 assert(getWeaponDefinition(heavy).allowedPokerPatterns.includes('four_of_a_kind'));
 const best=analyzePhase16CMobius(g);
 assert(best&&best.score.patternId==='four_of_a_kind',`combinazione ${best?.score?.patternId}`);
 assert.equal(best.already.length,2);assert.equal(best.missing.length,2);
 const next=beginPhase16CPreparation(prepare(g));
 assert.equal(next.phase16C.mobius.used,true);
 assert.equal(next.phase16C.mobius.announcement.pattern,'Poker');
 assert(new Set(next.player.deck.slice(0,10).map(c=>c.id)).has('dA3'));
 assert(new Set(next.player.deck.slice(0,10).map(c=>c.id)).has('dA4'));
 assert.deepEqual(new Set(next.player.deck.map(c=>c.id)),new Set(g.player.deck.map(c=>c.id)));
 assert.deepEqual(next.player.hand,g.player.hand);
 assert.deepEqual(beginPhase16CPreparation(next).player.deck,next.player.deck,'nessun secondo rimescolamento');
});
test('16C: il Pendolo mostra sei carte e rende gratuiti entrambi i cambi dopo danni subiti',()=>{
 let g=game(['epic_item_6']);
 g=resolvePhase16CExchange(volleyState(g,8,12));
 assert.equal(g.phase16C.pendulum.pending,true);
 let next=beginPhase16CPreparation({...g,phase:TURN_PHASES.PREPARE});
 assert.equal(next.phase16C.pendulum.active,true);
 assert.deepEqual(next.phase16C.pendulum.visibleCards.map(c=>c.id),deck.slice(0,6).map(c=>c.id));
 const hpBefore={...next.hp};
 const once=exchangePhase15Cards(next,'player',[2,3,4]);
 assert.deepEqual(once.hp,hpBefore);assert.equal(once.player.exchangesLeft,1);
 assert.equal(once.preparation.timePenaltySeconds.player,0);
 const twice=exchangePhase15Cards(once,'player',[2,3,4]);
 assert.deepEqual(twice.hp,hpBefore);assert.equal(twice.player.exchangesLeft,0);
 assert.throws(()=>exchangePhase15Cards(twice,'player',[0]),/massimo 2/);
});
test('16C: Calice converte il danno in Polvere senza pagare due volte lo scambio',()=>{
 let g=game(['epic_item_8']);
 const first=resolvePhase16CExchange(volleyState(g,16,13));
 assert.equal(first.phase16B.earnings.dust,2);
 assert.equal(first.phase16C.dustDamageRemainder,9);
 assert.equal(resolvePhase16CExchange(first).phase16B.earnings.dust,2);
 const second=resolvePhase16CExchange({...first,round:2,phase:TURN_PHASES.ANIMATE});
 assert.equal(second.phase16B.earnings.dust,5);
});
test('16C: Monolite azzera il calore mentre le altre armi lo accumulano',()=>{
 const g=game(['epic_item_7']);
 let fired=resolvePhase16CExchange(volleyState(g,16,8));
 assert.equal(getPhase16CHeat(fired,'player','heavy'),0);
 assert(getPhase16CHeat(fired,'enemy','light')>0);
 assert.equal(fired.phase16C.heat.player.heavy,0);
 const normal=resolvePhase16CExchange(volleyState(game(),16,8));
 assert(normal.phase16C.heat.player.heavy>0);
 assert(getPhase16CHeat(normal,'player','heavy')>0);
});
test('16C: Matrice attivata con HP bassi, permette la Pesante con Coppia e si consuma una volta',()=>{
 let g=beginPhase16CPreparation(prepare(game(['epic_item_9'])));
 assert(g.phase16C.matrix.available);
 const cards=g.player.hand.slice(0,2);
 const placements=[{slot:0,card:cards[0]},{slot:1,card:cards[1]},{slot:2,card:g.player.hand[2]},{slot:3,card:g.player.hand[3]}];
 const options=getPhase4MoveOptions({...g,phase:TURN_PHASES.ATTACK},'player',placements);
 const heavy=options.find(o=>o.weaponClass==='heavy');
 assert(heavy&&heavy.adaptedByEpic&&heavy.score.patternId==='one_pair');
 const committed=commitPhase4Move({...g,phase:TURN_PHASES.ATTACK},'player',placements,false,heavy.weaponId);
 assert.equal(committed.moves.player.score.patternId,'one_pair');
 const spent=consumePhase16CMatrix(committed,'player',{weaponId:heavy.weaponId,weaponClass:'heavy'});
 assert.equal(spent.phase16C.matrix.used,true);assert.equal(spent.phase16C.matrix.available,false);
 assert(!getPhase4MoveOptions(spent,'player',placements).some(o=>o.adaptedByEpic));
});
test('16C: l’Astrolabio offre due dadi e ne applica solo uno',()=>{
 let g=prepare(game(['epic_item_3']));
 g={...g,phase16B:{...g.phase16B,player:{...g.phase16B.player,diceReady:true,dicePatterns:['one_pair','three_of_a_kind','straight_4']}}};
 const offered=offerPhase16CDice(g,()=>0.80);
 assert.deepEqual(offered.phase16C.diceOffer,[4,3]);
 assert.equal(offered.phase16B.player.diceReady,true);
 const chosen=selectPhase16CDice(offered,0);
 assert.equal(chosen.phase16B.player.diceReady,false);
 assert.equal(chosen.player.ether,g.player.ether+2);
 assert.equal(chosen.phase16C.diceOffer,null);
 assert.throws(()=>selectPhase16CDice(chosen,1),/Scegli/);
});
test('16C: carte non duplicate durante il riordino Möbius',()=>{
 const changed=arrangePhase16CMobiusDeck(deck,[deck[2],deck[4]]);
 assert.equal(changed.length,deck.length);
 assert.equal(new Set(changed.map(c=>c.id)).size,deck.length);
 assert(changed.slice(0,10).some(c=>c.id==='dA3'));
});
test('16C: le armi calde non possono sparare; il Monolite consente comunque la salva',()=>{
 const aces=[card('ax1',1,'hearts'),card('ax2',1,'diamonds'),card('ax3',1,'clubs'),card('ax4',1,'spades')];
 const placements=aces.map((c,i)=>({slot:i,card:c}));
 const armed=g=>({...g,player:{...g.player,hand:aces},phase16C:{...g.phase16C,heat:{...g.phase16C.heat,player:{light:0,medium:0,heavy:115}}}});
 const heated=armed(game());
 const heavy=getPhase4MoveOptions(heated,'player',placements).find(x=>x.weaponClass==='heavy');
 assert(heavy && heavy.heatBlocked && !heavy.canFire);
 assert.throws(()=>commitPhase4Move(heated,'player',placements,false,heavy.weaponId),/surriscaldata/);
 const protectedPlayer=armed(game(['epic_item_7']));
 const safe=getPhase4MoveOptions(protectedPlayer,'player',placements).find(x=>x.weaponClass==='heavy');
 assert(safe&&safe.canFire&&!safe.heatBlocked);
 assert.equal(getPhase16CHeat(protectedPlayer,'player','heavy'),0);
});
test('16C: i sei oggetti hanno specialità distinte e catalogo limitato',async()=>{
 const {PHASE16C_EPICS}=await import('./phase16CEpics.js');
 const {PHASE16A_EPIC_IDS}=await import('./phase16ACatalog.js');
 assert.equal(Object.keys(PHASE16C_EPICS).length,6);
 assert.deepEqual(new Set(Object.keys(PHASE16C_EPICS)),new Set(PHASE16A_EPIC_IDS));
});
