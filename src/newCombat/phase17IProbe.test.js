import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase7Armory,buyPhase7Weapon,equipPhase7Weapon} from './phase7Armory.js';
import {f17iPreviousOwnedTier,f17iNoEpics,f17iSummarizePairs} from './tacticalAnalysis.js';
const gear=()=>({armory:createPhase7Armory(),epics:[{id:'epic_item_8',level:1}],pilotLevel:42});
test('17I removes Epic effects only from copied loadout',()=>{
 const original=gear(),copy=f17iNoEpics(original);
 assert.equal(copy.epics.length,0); assert.equal(original.epics.length,1);
 copy.armory.levels.es_fake=4; assert.equal(original.armory.levels.es_fake,undefined);
});
test('17I previous tier never grants unowned weapons',()=>{
 const original=gear(),{gear:less,changed}=f17iPreviousOwnedTier(original);
 assert.deepEqual(changed,[]);assert.deepEqual(less.armory.equipped,original.armory.equipped);
});
test('17I lower tier uses owned weapon and preserves actual upgrade levels',()=>{
 let g=gear(); const id='es_rare_light_04';
 const acquired=buyPhase7Weapon(g.armory,id,999999,100);
 assert.equal(acquired.ok,true);
 const equip=equipPhase7Weapon(acquired.state,id);
 assert.equal(equip.ok,true);g.armory=equip.state;
 const before=structuredClone(g);
 const chosen=f17iPreviousOwnedTier(g);
 assert.equal(chosen.changed.length,1);
 assert.equal(chosen.gear.armory.equipped.light,'es_common_light_01');
 assert.equal(g.armory.equipped.light,id);
 assert.deepEqual(chosen.gear.armory.levels,before.armory.levels);
});
test('17I aggregate counts draws but not as wins',()=>{
 const v=f17iSummarizePairs([{sector:50,profile:'x',scenario:'a',result:'draw',exchanges:4,playerShots:3,playerPasses:1,auditOK:true},
  {sector:50,profile:'x',scenario:'a',result:'player',exchanges:8,playerShots:5,playerPasses:2,auditOK:true}]);
 assert.equal(v[0].wins,1);assert.equal(v[0].draws,1);assert.equal(v[0].avgExchanges,6);assert.equal(v[0].winRate,50);
});
