import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPhase6Duel} from './phase6Engine.js';
import {createPhase7Armory,buyPhase7Weapon,equipPhase7Weapon} from './phase7Armory.js';

test('fase7 integrazione: loadout acquistato viene accettato dal motore Fase 6',()=>{
  const state=createPhase7Armory();
  const bought=buyPhase7Weapon(state,'es_rare_medium_01',9999);
  const fitted=equipPhase7Weapon(bought.state,'es_rare_medium_01');
  const game=createPhase6Duel({playerLoadout:fitted.state.equipped,playerHand:[],enemyHand:[],playerDeck:[],enemyDeck:[]});
  assert.equal(game.arsenal.player.medium,'es_rare_medium_01');
  assert.equal(game.arsenal.player.light,fitted.state.equipped.light);
});
test('fase7 integrazione: shop, app, area personale e arena ricevono inventario condiviso',()=>{
  const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  const shop=readFileSync(new URL('../ShopModal.jsx',import.meta.url),'utf8');
  const arena=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
  const loadout=readFileSync(new URL('../PersonalLoadoutModal.jsx',import.meta.url),'utf8');
  assert.match(app,/localStorage\.setItem\(ARMORY_V2_STORAGE_KEY/);
  assert.match(app,/onBuyArmoryV2=\{handleBuyArmoryV2\}/);
  assert.match(app,/onEquipArmoryV2=\{handleEquipArmoryV2\}/);
  assert.match(app,/armoryV2=\{armoryV2\}/);
  assert.match(shop,/onBuy=\{onBuyArmoryV2\}/);
  assert.match(shop,/onUpgrade=\{onUpgradeArmoryV2\}/);
  assert.match(shop,/onEquip=\{onEquipArmoryV2\}/);
  assert.match(arena,/authorizedArmory\.owned\[w\.id\]/);
  assert.match(arena,/playerLoadout:authorizedArmory\.equipped/);
  assert.match(loadout,/normalizePhase7Armory\(armoryV2\)/);
});
