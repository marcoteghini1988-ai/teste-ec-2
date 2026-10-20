import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL_48,getWeaponDefinition} from './weaponCatalog.js';
import {f17jRecommendOwned} from './tacticalAnalysis.js';
import {withF17KTemporaryPattern} from '../../tools/f17k_trial_scope.mjs';
import {equipPhase7Weapon} from './phase7Armory.js';
const heavy='es_epic_heavy_01';
test('17K: prova offline conserva identita e contenuto della definizione originale',()=>{
 const weapon=getWeaponDefinition(heavy), arr=weapon.allowedPokerPatterns, original=[...arr];
 const r=withF17KTemporaryPattern(heavy,'flush_4',()=>{
  assert.equal(getWeaponDefinition(heavy),weapon);
  assert(arr.includes('flush_4'));
  return 42;
 });
 assert.equal(r,42);assert.equal(getWeaponDefinition(heavy).allowedPokerPatterns,arr);assert.deepEqual(arr,original);
});
test('17K: errore nel duello non lascia tracce nel catalogo',()=>{
 const original=[...getWeaponDefinition(heavy).allowedPokerPatterns];
 assert.throws(()=>withF17KTemporaryPattern(heavy,'flush_4',()=>{throw Error('errore simulato')}),/errore simulato/);
 assert.deepEqual(getWeaponDefinition(heavy).allowedPokerPatterns,original);
});
test('17K: non modifica armi non esaminate, rifiuta doppioni',()=>{
 const compare=getWeaponDefinition('es_epic_heavy_02'),initial=[...compare.allowedPokerPatterns];
 assert.throws(()=>withF17KTemporaryPattern(heavy,'four_of_a_kind',()=>true),/duplicata/);
 withF17KTemporaryPattern(heavy,'flush_4',()=>assert.deepEqual(compare.allowedPokerPatterns,initial));
 assert.deepEqual(compare.allowedPokerPatterns,initial);
});
test('17K: prova non permette mutazioni asincrone',()=>{
 const arr=getWeaponDefinition(heavy).allowedPokerPatterns,old=[...arr];
 assert.throws(()=>withF17KTemporaryPattern(heavy,'flush_4',()=>Promise.resolve('no')),/sincroni/);
 assert.deepEqual(arr,old);
});
test('17K: il consigliatore non aggiunge armi, livelli o risorse',()=>{
 const armory={schemaVersion:1,owned:{es_common_light_01:true,es_common_medium_03:true,es_common_heavy_01:true,es_epic_medium_03:true,es_epic_heavy_01:true},
  equipped:{light:'es_common_light_01',medium:'es_epic_medium_03',heavy:'es_epic_heavy_01'},levels:{es_common_light_01:3,es_common_medium_03:2,es_common_heavy_01:2,es_epic_medium_03:3,es_epic_heavy_01:3}};
 const gear={armory, pilotLevel:68,epics:[],wallet:{dust:1234,diamonds:7}};
 const rates=Object.fromEntries(ARSENAL_48.map(w=>[w.id,w.allowedPokerPatterns.includes('one_pair')?80:w.id==='es_common_medium_03'?43:0.5]));
 const original=structuredClone(gear);const rec=f17jRecommendOwned(gear,rates);
 assert.deepEqual(gear,original);
 assert.deepEqual(rec.gear.armory.owned,armory.owned);
 assert.deepEqual(rec.gear.armory.levels,armory.levels);
 assert.deepEqual(rec.gear.wallet,gear.wallet);
 for(const id of Object.values(rec.gear.armory.equipped).filter(Boolean))assert.equal(armory.owned[id],true);
});
test('17K: equipaggiamento alternativo e solo tra acquistate',()=>{
 const state={schemaVersion:1,owned:{es_common_heavy_01:true,es_epic_heavy_01:true},equipped:{light:null,medium:null,heavy:'es_epic_heavy_01'},levels:{es_common_heavy_01:2,es_epic_heavy_01:3}};
 const result=equipPhase7Weapon(state,'es_common_heavy_01');
 assert.equal(result.ok,true);assert.equal(result.state.equipped.heavy,'es_common_heavy_01');
 assert.equal(result.state.levels.es_common_heavy_01,2);
 const fake=equipPhase7Weapon(state,'es_legendary_heavy_01');assert.equal(fake.ok,false);
});
