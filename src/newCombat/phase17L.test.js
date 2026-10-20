import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL_48} from './weaponCatalog.js';
import {createPhase4Duel,commitPhase4Move,getPhase4MoveOptions} from './phase4Engine.js';
import {getPhase4WeaponOptions,getPhase4Profile} from './phase4Weapons.js';
const c=(id,value,suit)=>({id,value,suit});
const straight=[c('s2',2,'hearts'),c('s3',3,'diamonds'),c('s4',4,'clubs'),c('s5',5,'spades')];
const flush=[c('f2',2,'clubs'),c('f5',5,'clubs'),c('f9',9,'clubs'),c('f11',11,'clubs')];
const poker=[c('p9h',9,'hearts'),c('p9d',9,'diamonds'),c('p9c',9,'clubs'),c('p9s',9,'spades')];
const placement=cards=>cards.map((card,slot)=>({slot,card}));
function duel(weaponId,hand=straight,ammo={hearts:20,diamonds:20,clubs:20,spades:20}){
 return createPhase4Duel({playerHand:[...hand,c('x',13,'hearts')],enemyHand:[],playerHp:400,enemyHp:400,
  playerAmmo:ammo,enemyAmmo:ammo,playerLoadout:{light:null,medium:null,heavy:weaponId},enemyLoadout:{light:null,medium:null,heavy:null}});
}
function fireAgainstPass(weaponId,hand=straight,ammo){
 let game=duel(weaponId,hand,ammo);game=commitPhase4Move(game,'player',placement(hand),false,weaponId);
 return commitPhase4Move(game,'enemy',[],true);
}
test('17L: ciascuna Pesante conserva le due firme originali e aggiunge una sola alternativa',()=>{
 const heavy=ARSENAL_48.filter(w=>w.weaponClass==='heavy');assert.equal(heavy.length,16);
 assert.equal(heavy.filter(w=>w.secondaryActivationPattern==='straight_4').length,8);
 assert.equal(heavy.filter(w=>w.secondaryActivationPattern==='flush_4').length,8);
 for(const w of heavy){
  assert.equal(w.allowedPokerPatterns.length,3,w.id);
  assert.equal(new Set(w.allowedPokerPatterns).size,3,w.id);
  assert(w.allowedPokerPatterns.includes(w.secondaryActivationPattern));
  assert(!['one_pair','two_pair','three_of_a_kind'].includes(w.secondaryActivationPattern));
 }
 assert.equal(ARSENAL_48.filter(w=>w.weaponClass!=='heavy').every(w=>!w.secondaryActivationPattern),true);
});
test('17L: Scala 4 attiva davvero una Pesante con una singola salva ridotta',()=>{
 const weapon='es_common_heavy_01',g=duel(weapon);
 const options=getPhase4MoveOptions(g,'player',placement(straight));
 const heavy=options.find(o=>o.weaponId===weapon);
 assert.equal(heavy.score.patternId,'straight_4');assert.equal(heavy.activationMode,'secondary');
 assert.equal(heavy.previewShots,1);assert.equal(heavy.canFire,true);
 const battle=fireAgainstPass(weapon);
 assert.equal(battle.moves.player.score.patternId,'straight_4');
 assert.deepEqual(battle.result.damagePercent,[100,0]);
 assert.equal(battle.result.volleys.player.damagePercent,100,'il confronto Poker resta al 100%');
 assert.equal(battle.result.volleys.player.salvoPercent,50,'la salva secondaria è limitata');
 assert.equal(battle.result.volleys.player.activationMode,'secondary');
 assert.equal(battle.result.volleys.player.shots,1);
 assert.equal(battle.result.volleys.player.damage,getPhase4Profile(weapon).damagePerShot);
 assert.equal(battle.ammo.player.hearts,21,'ricarica +2 cuori, consumo un solo proiettile');
 assert.equal(battle.hp.enemy,400-getPhase4Profile(weapon).damagePerShot);
});
test('17L: Colore 4 è alternativo per le altre Pesanti ed evita la salva doppia',()=>{
 const weapon='es_common_heavy_02';const battle=fireAgainstPass(weapon,flush);
 assert.equal(battle.moves.player.score.patternId,'flush_4');
 assert.equal(battle.result.volleys.player.activationMode,'secondary');
 assert.equal(battle.result.volleys.player.shots,1);
});
test('17L: il Poker originale resta la salva completa da 2 proiettili',()=>{
 const weapon='es_common_heavy_01';const battle=fireAgainstPass(weapon,poker);
 assert.equal(battle.moves.player.score.patternId,'four_of_a_kind');
 assert.equal(battle.result.volleys.player.activationMode,'primary');
 assert.equal(battle.result.volleys.player.salvoPercent,100);
 assert.equal(battle.result.volleys.player.shots,2);
 assert.equal(battle.result.volleys.player.damage,getPhase4Profile(weapon).damagePerShot*2);
});
test('17L: non si aggirano munizioni esaurite né gli altri slot',()=>{
 const weapon='es_common_heavy_01';const ammo={hearts:0,diamonds:0,clubs:0,spades:0};
 const noHearts=[c('d2',2,'diamonds'),c('c3',3,'clubs'),c('s4',4,'spades'),c('d5',5,'diamonds')];
 let game=duel(weapon,noHearts,ammo);
 const option=getPhase4MoveOptions(game,'player',placement(noHearts)).find(o=>o.weaponClass==='heavy');
 assert.equal(option.canFire,false);
 const original=JSON.stringify(game);
 assert.throws(()=>commitPhase4Move(game,'player',placement(noHearts),false,weapon),/Munizioni insufficienti/);
 assert.equal(JSON.stringify(game),original);
 assert.equal(getPhase4WeaponOptions(straight,{light:null,medium:null,heavy:weapon},ammo).some(o=>o.weaponClass==='light'),false);
});
test('17L: nella modalità alternativa il perdente non spara più del vincitore',()=>{
 const weapon='es_common_heavy_01';const winning=[c('e9h',9,'hearts'),c('e9d',9,'diamonds'),c('e9c',9,'clubs'),c('e9s',9,'spades')];
 let g=createPhase4Duel({playerHand:straight,enemyHand:winning,playerHp:400,enemyHp:400,
  playerAmmo:{hearts:20},enemyAmmo:{hearts:20},playerLoadout:{light:null,medium:null,heavy:weapon},enemyLoadout:{light:null,medium:null,heavy:weapon}});
 g=commitPhase4Move(g,'player',placement(straight),false,weapon);
 g=commitPhase4Move(g,'enemy',placement(winning),false,weapon);
 assert.equal(g.result.volleys.player.shots,1);
 assert.equal(g.result.volleys.enemy.shots,2);
 assert.equal(g.result.volleys.player.activationMode,'secondary');
 assert.equal(g.result.volleys.enemy.activationMode,'primary');
});

test('17L: tutte le 16 Pesanti possono sparare con la figura alternativa anche in PvP',()=>{
 for(const w of ARSENAL_48.filter(w=>w.weaponClass==='heavy')){
  const cards=w.secondaryActivationPattern==='straight_4'?straight:flush;
  const state=duel(w.id,cards,{hearts:30,diamonds:30,clubs:30,spades:30});
  const choice=getPhase4MoveOptions(state,'player',placement(cards)).find(o=>o.weaponId===w.id);
  assert(choice?.canFire,w.id);
  assert.equal(choice.score.patternId,w.secondaryActivationPattern,w.id);
  assert.equal(choice.activationMode,'secondary',w.id);
  const result=fireAgainstPass(w.id,cards,{hearts:30,diamonds:30,clubs:30,spades:30});
  assert.equal(result.result.volleys.player.shots,1,w.id);
  assert.equal(result.result.volleys.player.campaignScale,1,w.id);
  assert.equal(result.result.volleys.player.damage,getPhase4Profile(w.id).damagePerShot,w.id);
 }
});
