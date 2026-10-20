import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL_48,getWeaponDefinition} from './weaponCatalog.js';
import {getPhase4Profile,resolvePhase4Volleys} from './phase4Weapons.js';
import {createPhase4Duel} from './phase4Engine.js';
import {phase17PilotHp,phase17EnemyHp,phase17EnemyDamageScale,phase17EnemyWeaponLevel,phase17GlobalSector,phase17Features} from './phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {getPhase13BossPhases} from './phase13Campaign.js';
const sectorAt=s=>({planet:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id,sector:(s-1)%10+1});

test('17C: ogni Leggera dispone di Coppia, restano i pattern avanzati originali',()=>{
 const lights=ARSENAL_48.filter(w=>w.weaponClass==='light');
 assert.equal(lights.length,16);
 for(const weapon of lights){
  assert(weapon.allowedPokerPatterns.includes('one_pair'),`manca attacco Leggera per ${weapon.id}`);
  assert(weapon.allowedPokerPatterns.some(p=>p!=='one_pair'),`manca specializzazione ${weapon.id}`);
 }
 assert(!getWeaponDefinition('es_legendary_heavy_04').allowedPokerPatterns.includes('one_pair'));
});
test('17C: 48 armi crescono per livello e rispettano salve pari',()=>{
 for(const weapon of ARSENAL_48){
  const damage=Array.from({length:4},(_,i)=>getPhase4Profile(weapon.id,i+1).damagePerShot);
  assert(damage.every((x,i)=>i===0||x>damage[i-1]),weapon.id);
  assert([2,4].includes(getPhase4Profile(weapon.id,4).fullSalvo));
 }
 const final=Object.fromEntries(['light','medium','heavy'].map(cls=>[
  cls,getPhase4Profile(ARSENAL_48.find(w=>w.weaponClass===cls&&w.rarityKey==='legendary').id,4)
 ]));
 assert(final.light.damagePerShot<final.medium.damagePerShot);
 assert(final.medium.fullSalvo===4&&final.heavy.fullSalvo===2);
});
test('17C: pilot HP 50-400, NPC HP positivo e boss una sola barra',()=>{
 assert.equal(phase17PilotHp(1),50);
 assert.equal(phase17PilotHp(100),400);
 let prevHp=0;
 for(let lv=1;lv<=100;lv++){
  const hp=phase17PilotHp(lv);
  assert(hp>=prevHp);prevHp=hp;
 }
 for(let s=1;s<=120;s++){
  const {planet,sector}=sectorAt(s);
  assert.equal(phase17GlobalSector(planet,sector),s);
  assert(phase17EnemyHp(planet,sector)>=54);
  if(sector===10){
   assert.equal(getPhase13BossPhases(planet,sector),1);
   assert(phase17EnemyHp(planet,sector)>phase17EnemyHp(planet,9));
  }
 }
});
test('17C: potenziamenti IA seguono soglie pilota senza anticipare terza arma',()=>{
 const checkpoints=[[1,1],[16,1],[17,2],[42,2],[43,3],[84,3],[85,4],[120,4]];
 for(const [sector,lv] of checkpoints)assert.equal(phase17EnemyWeaponLevel(sector),lv);
 assert.equal(phase17Features(1,14%10||10).allowJokers,false); // Terra settore 4: starter senza Jolly
 const s15=sectorAt(15);assert.equal(phase17Features(s15.planet,s15.sector).allowJokers,true);
 const s21=sectorAt(21);assert.equal(phase17Features(s21.planet,s21.sector).allowHeavy,true);
});
test('17C: difficoltà PvE interviene sul danno del bot, non su proiettili o PvP',()=>{
 const weaponId='es_common_light_01';
 const ammo={hearts:0,diamonds:0,clubs:0,spades:20};
 const base=createPhase4Duel({playerHp:100,enemyHp:100,playerAmmo:ammo,enemyAmmo:ammo,
   playerLoadout:{light:weaponId,medium:null,heavy:null},enemyLoadout:{light:weaponId,medium:null,heavy:null}});
 const cards=[{id:'ex',value:8,suit:'spades'},{id:'ey',value:8,suit:'hearts'}];
 const turn={...base,phase:'animate',moves:{player:{passed:true},enemy:{score:{patternId:'one_pair'},weaponId,committedCards:cards}},
   result:{opener:'enemy',responder:'player',damagePercent:[100,0]}};
 const inPvp=resolvePhase4Volleys(turn);
 const inPve=resolvePhase4Volleys({...turn,campaignSession:{planet:1,sector:2}});
 assert.equal(inPvp.result.volleys.enemy.damage,8);
 assert.equal(inPve.result.volleys.enemy.damage,Math.round(8*phase17EnemyDamageScale(1,2)));
 assert(inPve.hp.player>inPvp.hp.player);
 assert.deepEqual(inPve.ammo.enemy,inPvp.ammo.enemy);
 assert.equal(inPve.result.volleys.enemy.unscaledDamage,inPvp.result.volleys.enemy.damage);
});
