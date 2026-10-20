/** Fase 17F: regressioni dei soli coefficienti di difficolta PvE.
 * Nessun cambio alle figure Poker, danni nominali/PvP o salvataggi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {phase17EnemyHp,phase17EnemyDamageScale,F17F_CAMPAIGN_TUNING,phase17PilotHp,phase17ExpectedPilotLevel,phase17EnemyLoadout,phase17EnemyWeaponLevels,phase17PlayerBattleLoadout,phase17StartingAmmo} from './phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {phase17EEnemyModule} from './phase16FModules.js';
import {createPhase7Armory} from './phase7Armory.js';
import {getPhase4Profile,resolvePhase4Volleys} from './phase4Weapons.js';
import {createPhase4Duel} from './phase4Engine.js';
import {getPhase13BossPhases} from './phase13Campaign.js';
import {simulateF17DEconomy} from './phase17DEconomy.js';

const sectorAt=s=>({planet:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id,sector:(s-1)%10+1});

test('17F: difficolta nuove solo in PvE, con coefficiente scalato per fascia',()=>{
 assert.equal(phase17EnemyDamageScale(1,1),.50);
 assert.equal(phase17EnemyDamageScale(1,6),.62);
 assert.equal(phase17EnemyDamageScale(1,10),.52);
 assert.equal(phase17EnemyDamageScale(2,10),.52);
 assert(Object.isFrozen(F17F_CAMPAIGN_TUNING));
 assert.equal(phase17EnemyDamageScale(3,1),.72);
 for(const planet of PHASE16A_CAMPAIGN_PLANETS.slice(2))assert.equal(phase17EnemyDamageScale(planet.id,10),.64);
});

test('17F: tutti e 120 gli HP positivi, con boss a barra unica e ID immutati',()=>{
 assert.equal(phase17PilotHp(1),50);
 assert.equal(phase17PilotHp(100),400);
 for(let s=1;s<=120;s++){
   const {planet,sector}=sectorAt(s);
   const hp=phase17EnemyHp(planet,sector);
   const level=phase17ExpectedPilotLevel(s);
   const original= Math.max(54,Math.round(phase17PilotHp(level)*(sector===10?1.38:.68)+(sector===10?10:0)));
   assert(hp>=original,`HP settore ${s} sotto il riferimento 17E`);
   if(sector===10){
     assert.equal(getPhase13BossPhases(planet,sector),1);
     assert(hp>phase17EnemyHp(planet,9));
     assert.equal(phase17EEnemyModule(planet,sector).id,`planet_char_${planet}`);
   }
 }
});

test('17F: danno nominale armi e PvP non toccati, riduzione PvE dopo munizioni',()=>{
 const id='es_common_light_01';
 const p=getPhase4Profile(id,1);
 assert.equal(p.damagePerShot,2);
 const ammo={hearts:0,diamonds:0,clubs:0,spades:20};
 const state=createPhase4Duel({playerHp:100,enemyHp:100,playerAmmo:ammo,enemyAmmo:ammo,
  playerLoadout:{light:id,medium:null,heavy:null},enemyLoadout:{light:id,medium:null,heavy:null}});
 const card=[{id:'a',value:6,suit:'spades'},{id:'b',value:6,suit:'hearts'}];
 const before={...state,phase:'animate',moves:{player:{passed:true},enemy:{score:{patternId:'one_pair'},weaponId:id,committedCards:card}},
  result:{opener:'enemy',responder:'player',damagePercent:[100,0]}};
 const pvp=resolvePhase4Volleys(before);
 const pve=resolvePhase4Volleys({...before,campaignSession:{planet:2,sector:10}});
 assert.equal(pvp.result.volleys.enemy.damage,8);
 assert.equal(pve.result.volleys.enemy.damage,Math.round(8*.52));
 assert.deepEqual(pvp.ammo.enemy,pve.ammo.enemy);
});

test('17F: armi e munizioni del bot non alterate; nessun Oggetto Epico aggiunto',()=>{
 for(let s=1;s<=120;s++){
  const {planet,sector}=sectorAt(s);
  const gear=phase17EnemyLoadout(planet,sector),levels=phase17EnemyWeaponLevels(planet,sector);
  assert(gear.light&&gear.medium);
  assert.equal(Boolean(gear.heavy),s>=21);
  assert(levels.light>=1&&levels.light<=4);
  assert.equal(phase17EEnemyModule(planet,sector)!==null,s>=9);
 }
});

test('17F: economia invariata, comprese transazioni reali e prima carenza di Crediti',()=>{
 for(const profile of ['frugale','equilibrato','potenziato','stress_concentrato']){
  const econ=simulateF17DEconomy({profile,starsPerSector:2});
  assert.equal(econ.ledger.length,120);
  assert.equal(econ.summary.creditsRequired,960);
  assert.equal(econ.summary.creditsToRecoverWithoutBattleBonuses,760);
  assert.equal(econ.summary.firstCreditShortage,27);
  assert.equal(econ.summary.finalLevel,100);
  assert.deepEqual(econ.ledger[0].equipped,createPhase7Armory().equipped);
 }
});

test('17F: accesso starter mantiene 2 armi senza terza gratuita',()=>{
 const ar=createPhase7Armory();
 const l=phase17PlayerBattleLoadout(ar,1,1);
 assert.equal(l.heavy,null);
 assert.equal(Object.values(phase17StartingAmmo(l)).reduce((a,b)=>a+b,0),8);
});
