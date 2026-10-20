import test from 'node:test';
import assert from 'node:assert/strict';
import { ARSENAL_48 } from './weaponCatalog.js';
import { TURN_PHASES } from './config.js';
import { createPhase4Duel, getPhase4MoveOptions, commitPhase4Move, finishPhase4Animation, getPhase4CandidateMove, setPhase4EquippedWeapon } from './phase4Engine.js';
import { calculatePhase4Volley, chargedAmmoFromCards, defaultPhase4Loadout, normalizePhase4Loadout, getPhase4WeaponOptions } from './phase4Weapons.js';
const c=(rank,suit,id=`${suit}${rank}`)=>({id,value:rank,suit});
const playerHand=[c(7,'spades'),c(7,'hearts'),c(2,'clubs'),c(9,'diamonds'),c(5,'hearts'),c(10,'clubs'),c(3,'diamonds')];
const enemyHand=[c(8,'spades','es8'),c(8,'clubs','ec8'),c(3,'hearts','eh3'),c(4,'diamonds','ed4'),c(6,'spades','es6'),c(10,'hearts','eh10'),c(12,'clubs','ec12')];
const create=(override={})=>createPhase4Duel({playerHand,enemyHand,playerHp:120,enemyHp:120, ...override});
const four=(hand)=>hand.slice(0,4).map((card,slot)=>({slot,card}));
const reply=(hand)=>[0,1,4,2].map((slot,i)=>({slot,card:hand[i]}));
test('Le 48 armi usano 3 slot di classe e 4 semi per i serbatoi',()=>{
  assert.equal(ARSENAL_48.length,48);
  const g=create();
  assert.deepEqual(Object.keys(g.arsenal.player),['light','medium','heavy']);
  assert.deepEqual(Object.keys(g.ammo.player).sort(),['clubs','diamonds','hearts','spades']);
  assert.equal(g.arsenal.player.light,'es_common_light_01');
  assert.equal(defaultPhase4Loadout().heavy,'es_common_heavy_01');
  assert.equal(normalizePhase4Loadout({light:'es_legendary_heavy_01'}).light,'es_common_light_01');
});
test('Solo arma del proprio slot e solo prima della prima mossa',()=>{
  let g=create();
  assert.throws(()=>setPhase4EquippedWeapon(g,'player','light','es_common_heavy_01'),/incompatibile/);
  g=setPhase4EquippedWeapon(g,'player','light','es_common_light_04');
  assert.equal(g.arsenal.player.light,'es_common_light_04');
  g=commitPhase4Move(g,'player',[],true);
  assert.throws(()=>setPhase4EquippedWeapon(g,'player','light','es_common_light_02'),/solo prima/);
});
test('La carta consumata carica il seme; la carta residua non viene contata, il jolly non crea munizioni',()=>{
  assert.deepEqual(chargedAmmoFromCards([c(7,'spades'),c(3,'diamonds'),{id:'joker-1',isJoker:true,suit:'joker',value:0}]),{hearts:0,diamonds:3,clubs:0,spades:7});
  let g=create();
  g=commitPhase4Move(g,'player',four(playerHand),false,'es_common_light_01');
  assert.equal(g.moves.player.score.patternId,'one_pair');
  assert.equal(g.moves.player.weaponId,'es_common_light_01');
  assert.equal(g.moves.player.committedCards.length,2);
  assert.equal(g.board.filter(Boolean).length,2);
});
test('Confronto coppia di 8 vs coppia di 7: 100% a computer, 50% a giocatore, consumo una sola volta',()=>{
  let g=create();
  g=commitPhase4Move(g,'player',four(playerHand),false,'es_common_light_01');
  g=commitPhase4Move(g,'enemy',reply(enemyHand),false,'es_common_light_01');
  assert.equal(g.phase,TURN_PHASES.ANIMATE);
  assert.equal(g.result.winner,'responder');
  assert.deepEqual(g.result.damagePercent,[50,100]);
  assert.equal(g.result.volleys.player.shots,2);
  assert.equal(g.result.volleys.player.damage,4);
  assert.equal(g.result.volleys.enemy.shots,4);
  assert.equal(g.result.volleys.enemy.damage,8);
  assert.equal(g.hp.player,112); assert.equal(g.hp.enemy,116);
  assert.equal(g.ammo.player.spades,5); // carica 7, consuma 2
  assert.equal(g.ammo.enemy.spades,4); // carica 8, consuma 4
  assert.equal(g.result.nextOpener,'enemy');
  assert.equal(JSON.stringify(g).includes('NaN'),false);
});
test('Parità: entrambi 50% e metà munizioni',()=>{
  const eqEnemy=[c(7,'spades','e7sp'),c(7,'clubs','e7cl'),...enemyHand.slice(2)];
  let g=create({enemyHand:eqEnemy});
  g=commitPhase4Move(g,'player',four(playerHand));
  g=commitPhase4Move(g,'enemy',reply(eqEnemy));
  assert.deepEqual(g.result.damagePercent,[50,50]);
  assert.equal(g.result.volleys.player.shots,2);
  assert.equal(g.result.volleys.enemy.shots,2);
  assert.equal(g.hp.player,116);
  assert.equal(g.hp.enemy,116);
});
test('Passaggio: chi passa non consuma munizioni né colpisce',()=>{
  let g=create();
  g=commitPhase4Move(g,'player',[],true);
  g=commitPhase4Move(g,'enemy',four(enemyHand));
  assert.deepEqual(g.result.damagePercent,[0,100]);
  assert.equal(g.hp.player,112);
  assert.equal(g.hp.enemy,120);
  assert.equal(g.result.volleys.player.shots,0);
});
test('Doppio passaggio non infligge alcun danno',()=>{
  let g=create();
  g=commitPhase4Move(g,'player',[],true);
  g=commitPhase4Move(g,'enemy',[],true);
  assert.equal(g.hp.player,120);assert.equal(g.hp.enemy,120);
  assert.equal(g.result.volleys.player.damage,0);
});
test('Salva pari con riserva dispari: colpo ridotto consuma metà proiettili e non divide il danno due volte',()=>{
  assert.deepEqual(calculatePhase4Volley({damagePerShot:5,fullSalvo:4},7,50),
    {shots:2,damage:10,fullShots:4,damagePercent:50,ammoPercent:50,remainingAmmo:5});
  assert.deepEqual(calculatePhase4Volley({damagePerShot:5,fullSalvo:4},3,50),
    {shots:1,damage:5,fullShots:2,damagePercent:50,ammoPercent:50,remainingAmmo:2});
  assert.equal(calculatePhase4Volley({damagePerShot:5,fullSalvo:4},1,50).shots,0);
});
test('Il Poker superiore è consigliato prima del danno: tris batte coppia',()=>{
  const board=[c(7,'clubs'),c(7,'diamonds'),c(7,'hearts'),c(12,'spades'),null];
  const loadout={light:'es_common_light_01',medium:'es_common_medium_01',heavy:'es_common_heavy_01'};
  const options=getPhase4WeaponOptions(board,loadout,{spades:40,hearts:40,clubs:40,diamonds:40});
  assert.equal(options[0].weaponClass,'medium');
  assert.equal(options[0].score.patternId,'three_of_a_kind');
  assert.equal(options.find(o=>o.weaponClass==='light')?.score.patternId,'one_pair');
});
test('Arma con combo non compatibile non può sparare nemmeno se il banco forma un Poker valido',()=>{
  let g=create();
  const option=getPhase4MoveOptions(g,'player',four(playerHand));
  assert.equal(option.some(o=>o.weaponClass==='heavy'),false);
  assert.throws(()=>commitPhase4Move(g,'player',four(playerHand),false,'es_common_heavy_01'),/Nessun attacco/);
});
test('Arma selezionata con munizioni insufficienti non consuma carte e non genera danno',()=>{
  const hand=[c(9,'hearts'),c(9,'clubs'),c(3,'diamonds'),c(4,'diamonds')];
  let g=create({playerHand:hand});
  const before=JSON.stringify(g);
  assert.ok(getPhase4MoveOptions(g,'player',four(hand)).some(o=>o.weaponClass==='light' && !o.canFire));
  assert.throws(()=>commitPhase4Move(g,'player',four(hand),false,'es_common_light_01'),/Munizioni insufficienti/);
  assert.equal(JSON.stringify(g),before);
});
test('Armi diverse possono attingere allo stesso serbatoio senza duplicare risorse',()=>{
  let g=create({playerLoadout:{light:'es_common_light_01',medium:'es_common_medium_04',heavy:'es_common_heavy_04'},playerAmmo:{spades:8}});
  assert.equal(g.arsenal.player.medium,'es_common_medium_04');
  assert.equal(g.ammo.player.spades,8);
  assert.equal(Object.keys(g.ammo.player).length,4);
});
test('La risoluzione non viene applicata due volte; la battaglia termina a HP zero',async()=>{
  let g=create({playerHp:5});
  g=commitPhase4Move(g,'player',[],true);
  g=commitPhase4Move(g,'enemy',four(enemyHand));
  assert.equal(g.hp.player,0);
  assert.equal(g.winner,'enemy');
  const unchanged=JSON.stringify(g);
  // Chiamare di nuovo il risolutore deve essere idempotente.
  const {resolvePhase4Volleys}=await import('./phase4Weapons.js');
  assert.equal(JSON.stringify(resolvePhase4Volleys(g)),unchanged);
  g=finishPhase4Animation(g);
  assert.equal(g.phase,TURN_PHASES.FINISHED);
  assert.throws(()=>commitPhase4Move(g,'player',[],true),/terminata/);
});
test('L’AI propone solo armi disponibili e non muta le carte prima della conferma',()=>{
  const g=create();
  const copy=JSON.stringify(g);
  const suggested=getPhase4CandidateMove(g,'player',90);
  assert.ok(suggested);
  assert.ok(getPhase4MoveOptions(g,'player',suggested.placements).some(o=>o.weaponId===suggested.weaponId && o.canFire));
  assert.equal(JSON.stringify(g),copy);
});
