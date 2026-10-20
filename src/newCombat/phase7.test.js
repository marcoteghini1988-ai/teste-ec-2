import test from 'node:test';
import assert from 'node:assert/strict';
import { ARSENAL_48 } from './weaponCatalog.js';
import {ARMORY_STARTERS,ARMORY_CLASSES,ARMORY_TEST_PRICES,createPhase7Armory,normalizePhase7Armory,buyPhase7Weapon,equipPhase7Weapon,getPhase7OwnedWeapons,getPhase7ArmoryPrice} from './phase7Armory.js';

test('fase7: 48 armi in tre classi e quattro rarità, ciascuna con costo di prova',()=>{
 assert.equal(ARSENAL_48.length,48);
 for(const cls of ARMORY_CLASSES) for(const r of Object.keys(ARMORY_TEST_PRICES))
   assert.equal(ARSENAL_48.filter(w=>w.weaponClass===cls&&w.rarityKey===r).length,4);
 for(const w of ARSENAL_48) assert.ok(getPhase7ArmoryPrice(w.id)>0);
});
test('fase7: 2 armi iniziali, slot Pesante vuoto',()=>{
 const a=createPhase7Armory();
 assert.equal(getPhase7OwnedWeapons(a).length,2);
 assert.equal(a.equipped.heavy,null);
 for(const cls of ARMORY_CLASSES) assert.equal(a.equipped[cls],ARMORY_STARTERS[cls]);
});
test('fase7: acquisto paga solo se valido e non ripetuto',()=>{
 const a=createPhase7Armory();const id='es_rare_heavy_02';
 const insufficient=buyPhase7Weapon(a,id,5);assert.equal(insufficient.ok,false);assert.equal(insufficient.cost,0);
 const p=getPhase7ArmoryPrice(id);const purchased=buyPhase7Weapon(a,id,p);
 assert.equal(purchased.ok,true); assert.equal(purchased.cost,p);assert.equal(purchased.state.owned[id],true);
 assert.equal(buyPhase7Weapon(purchased.state,id,10000).ok,false);
 assert.equal(a.owned[id],undefined);
});
test('fase7: equip consentito solo con arma posseduta e nello slot giusto',()=>{
 const a=createPhase7Armory();const id='es_epic_medium_03';
 assert.equal(equipPhase7Weapon(a,id).ok,false);
 const purchased=buyPhase7Weapon(a,id,9999).state;
 const equipped=equipPhase7Weapon(purchased,id);
 assert.equal(equipped.ok,true);assert.equal(equipped.state.equipped.medium,id);
 assert.equal(equipped.state.equipped.light,ARMORY_STARTERS.light);
 assert.equal(a.equipped.medium,ARMORY_STARTERS.medium);
});
test('fase7: salvataggio adulterato non equipaggia armi sconosciute o non comprate',()=>{
 const repaired=normalizePhase7Armory({owned:{bad:true,es_rare_light_01:false},equipped:{light:'es_rare_light_01',medium:'es_legendary_heavy_01',heavy:'hacker'}});
 assert.equal(repaired.owned.bad,undefined);
 for(const cls of ARMORY_CLASSES) assert.equal(repaired.equipped[cls],ARMORY_STARTERS[cls]);
});
test('fase7: salvo separato e idempotente, preserva acquisti',()=>{
 const a=createPhase7Armory();
 const p=buyPhase7Weapon(a,'es_legendary_light_04',10000).state;
 const e=equipPhase7Weapon(p,'es_legendary_light_04').state;
 assert.deepEqual(normalizePhase7Armory(JSON.parse(JSON.stringify(e))),e);
});
