import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase15Loadout,initializePhase15,resolvePhase15Passives,activatePhase15Epic,
  PHASE15_TERRAIN_IDS,PHASE15_EPIC_IDS,describePhase15Trait} from './phase15LegacyPassives.js';
import {TURN_PHASES} from './config.js';
const c=(i,s='hearts')=>({id:`c${i}`,value:i,suit:s});
const make=(terrain=[],epics=[],traits=[])=>initializePhase15({
 phase:TURN_PHASES.ANIMATE,ready:{player:false,enemy:false},
 hp:{player:80,enemy:100},initialHp:{player:100,enemy:100},
 boost:{player:{energy:8,target:6},enemy:{energy:8,target:6}},
 ammo:{player:{hearts:5,diamonds:5,clubs:5,spades:5},enemy:{hearts:5,diamonds:5,clubs:5,spades:5}},
 moves:{player:{committedCards:[c(3),c(3,'clubs'),c(3,'spades'),c(4,'diamonds')],score:{cardIds:['c3','c4']}},enemy:{committedCards:[c(3,'hearts')],score:{cardIds:['c3']}}},
 result:{winner:'attacker',opener:'player',responder:'enemy',volleys:{player:{shots:4,damage:24,suit:'hearts'},enemy:{shots:2,damage:12,suit:'diamonds'}}},
 player:{hand:[c(2),c(4),c(7)],deck:[c(9),c(10),c(11)],discard:[c(5),c(6)]},
 enemy:{hand:[c(2,'spades')],deck:[c(5,'clubs')],discard:[]},
 history:[],
 },{deckId:'test',deckTraits:traits,terrains:terrain.map(id=>({id,level:2,name:id})),
 epics:epics.map(id=>({id,level:2,name:id}))});
test('F15 cataloghi: 20 terreni e 10 epici senza identificativi ripetuti',()=>{
 assert.equal(PHASE15_TERRAIN_IDS.length,20);assert.equal(new Set(PHASE15_TERRAIN_IDS).size,20);
 assert.equal(PHASE15_EPIC_IDS.length,10);assert.equal(new Set(PHASE15_EPIC_IDS).size,10);
});
test('F15 loadout filtra ID illegittimi, livelli e slot massimi',()=>{
 const l=createPhase15Loadout({deckId:'x',deckLevel:99,terrains:[...PHASE15_TERRAIN_IDS,'falso'].map(id=>({id,level:99})),epics:[...PHASE15_EPIC_IDS,'falso'].map(id=>({id,level:99}))});
 assert.equal(l.deckLevel,9);assert.equal(l.terrains.length,4);assert.equal(l.epics.length,2);
 assert.ok(l.terrains.every(v=>v.level===3));assert.ok(l.epics.every(v=>v.level===3));
});
test('F15 niente doppia applicazione delle abilità nello stesso scambio',()=>{
 const s=make(['charge_splitter'],[],[{type:'suit_damage_boost',bonus:3}]);
 const x=resolvePhase15Passives(s);assert.notDeepEqual(x.ammo,s.ammo);
 assert.deepEqual(resolvePhase15Passives(x),x);
 assert.equal(x.result.legacyPassivesResolved,true);
 assert.equal(x.legacyPassives.usedTerrain.length,1);
});
test('F15 tutti i 20 terreni hanno una risposta sicura a uno scambio',()=>{
 for(const id of PHASE15_TERRAIN_IDS){
  const a=resolvePhase15Passives(make([id]));
  assert.ok(a.result.legacyPassivesResolved,id);
  assert.ok(a.hp.player>=0 && a.hp.enemy>=0,id);
  assert.ok(a.boost.player.energy<=45 && a.boost.enemy.energy<=45,id);
  assert.ok(a.legacyPassives.usedTerrain.every(x=>PHASE15_TERRAIN_IDS.includes(x)),id);
 }
});
test('F15 terreno mai equipaggiato non si attiva; il recupero conserva il massimo HP',()=>{
 const a=resolvePhase15Passives(make());assert.equal(a.legacyPassives.usedTerrain.length,0);
 const b=resolvePhase15Passives(make(['cryo_stasis']));assert.ok(b.hp.player<=100);
});
test('F15 gli effetti dei mazzi non cambiano la gerarchia Poker',()=>{
 const state=make([],[],[{type:'op_flat_bonus',bonus:3},{type:'initial_tank_bonus',amount:2}]);
 const x=resolvePhase15Passives(state);
 assert.equal(x.result.winner,state.result.winner);
 assert.equal(x.moves.player.score.cardIds.length,2);
 assert.deepEqual(x.moves,state.moves);
});
test('F15 epici non sono disponibili in attacco, se non posseduti o se già usati',()=>{
 const a=make([],['epic_item_5']);
 assert.throws(()=>activatePhase15Epic(a,'player','epic_item_5'),/preparazione/);
 const b={...a,phase:TURN_PHASES.PREPARE};
 assert.throws(()=>activatePhase15Epic(b,'player','epic_item_1'),/equipaggiato/);
 const x=activatePhase15Epic(b,'player','epic_item_5');
 assert.equal(x.legacyPassives.usedEpic.length,1);
 assert.throws(()=>activatePhase15Epic(x,'player','epic_item_5'),/già attivato/);
});
test('F15 tutti i dieci epici possono attivarsi con risorse valide',()=>{
 for(const id of PHASE15_EPIC_IDS){
  const s={...make([],[id]),phase:TURN_PHASES.PREPARE};
  const x=activatePhase15Epic(s,'player',id);
  assert.equal(x.legacyPassives.usedEpic[0],id,id);
  assert.ok(x.player.hand.every(c=>c.id),id);
  assert.ok(x.player.deck.length>=0 && x.player.discard.length>=0,id);
  assert.ok(x.boost.player.energy<=45,id);
 }
});
test('F15 epici non alterano carte totali: generazione mai dal nulla',()=>{
 const size=p=>p.hand.length+p.deck.length+p.discard.length;
 for(const id of PHASE15_EPIC_IDS){
  const s={...make([],[id]),phase:TURN_PHASES.PREPARE};
  const before=size(s.player),x=activatePhase15Epic(s,'player',id);
  assert.equal(size(x.player),before,`doppia carta: ${id}`);
 }
});
test('F15 le categorie dei vecchi tratti riconoscono tutti i tipi originali',()=>{
 for(const type of ['op_boost','deck_extract_discount','anomaly_heal_pct','drain_extra_dmg','victory_reward_mult'])
  assert.notEqual(describePhase15Trait(type),'da riconvertire');
});
test('F15 lo sconto Etere e la gratuità primo uso sono coerenti', async()=>{
 const {getPhase15EtherCost,extractPhase15WithEther}=await import('./phase15LegacyPassives.js');
 const base=make([],[],[{type:'deck_extract_discount',cost:1},{type:'first_extract_free'}]);
 const s={...base,phase:TURN_PHASES.PREPARE,preparation:{statistics:{player:{etherExtracts:0,etherSpent:0},enemy:{etherExtracts:0,etherSpent:0}},timePenaltySeconds:{player:0,enemy:0}}};
 s.player.ether=4;
 assert.equal(getPhase15EtherCost(s),0);
 const x=extractPhase15WithEther(s,'player',0,0);
 assert.equal(x.player.ether,4); assert.equal(x.preparation.statistics.player.etherSpent,0);
 assert.equal(getPhase15EtherCost(x),1);
 const y=extractPhase15WithEther(x,'player',0,0);
 assert.equal(y.player.ether,3);assert.equal(y.preparation.statistics.player.etherSpent,1);
});
test('F15 passivi cambio eliminano solo le penalità previste dal mazzo',async()=>{
 const {exchangePhase15Cards}=await import('./phase15LegacyPassives.js');
 const base=make([],[],[{type:'free_exchange_time'},{type:'exchange_no_enemy_heal'},{type:'free_exchange_no_self_dmg'}]);
 const s={...base,phase:TURN_PHASES.PREPARE,preparation:{statistics:{player:{swaps:0,cardsSwapped:0,etherExtracts:0,etherSpent:0},enemy:{swaps:0,cardsSwapped:0,etherExtracts:0,etherSpent:0}},timePenaltySeconds:{player:0,enemy:0}}};
 s.player.exchangesLeft=2;
 const x=exchangePhase15Cards(s,'player',[0,1,2]);
 assert.equal(x.hp.player,s.hp.player);assert.equal(x.hp.enemy,s.hp.enemy);
 assert.equal(x.preparation.timePenaltySeconds.player,0);
 assert.equal(x.player.exchangesLeft,1);
});
test('F15 riarmo Terreno consuma Etere reale, al massimo una volta',async()=>{
 const {rearmPhase15Terrain}=await import('./phase15LegacyPassives.js');
 const base=make(['cryo_stasis']);
 const s={...base,phase:TURN_PHASES.PREPARE,player:{...base.player,ether:5},
  legacyPassives:{...base.legacyPassives,usedTerrain:['cryo_stasis'],loadout:{...base.legacyPassives.loadout,terrains:[{id:'cryo_stasis',name:'Crio',level:2,rearmCost:1}]}},
  preparation:{statistics:{player:{etherExtracts:0,etherSpent:0},enemy:{etherExtracts:0,etherSpent:0}},timePenaltySeconds:{player:0,enemy:0}}};
 const x=rearmPhase15Terrain(s,'player','cryo_stasis');
 assert.equal(x.player.ether,4);assert.equal(x.preparation.statistics.player.etherSpent,1);
 assert.deepEqual(x.legacyPassives.usedTerrain,[]);
 assert.throws(()=>rearmPhase15Terrain(x,'player','cryo_stasis'));
});
test('F15 mazzo livello alto concede solo carte esistenti e riserva Boost iniziale',()=>{
 const s=make([],[],[{type:'hand_size_bonus',size:9},{type:'initial_tank_bonus',bonus:15}]);
 assert.equal(s.player.hand.length,6);
 assert.equal(s.player.deck.length,0);
 assert.equal(s.boost.player.energy,11);
});
