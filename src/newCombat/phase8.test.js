import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync,statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ARSENAL_48 } from './weaponCatalog.js';
import { weaponCardSrc,weaponHologramSrc,weaponArtworkStatus,normalizeArtLevel } from './weaponArt.js';
const root=fileURLToPath(new URL('../../public/',import.meta.url));
function disk(url) { assert.match(url,/^\/assets\/weapons\/[a-z0-9_]+\.png$/);return root+url.slice(1); }
function meta(url) { const f=disk(url);assert.ok(existsSync(f),'Manca '+f);const sig=readFileSync(f).subarray(0,24);assert.equal(sig.subarray(1,4).toString('ascii'),'PNG');return {width:sig.readUInt32BE(16),height:sig.readUInt32BE(20),size:statSync(f).size}; }
test('fase8: tutte le 48 armi hanno carta fisica e due immagini direzionali',()=>{
 assert.equal(ARSENAL_48.length,48);
 for(const w of ARSENAL_48) {
  const card=weaponCardSrc(w.id);const up=weaponHologramSrc(w.id,'player');const down=weaponHologramSrc(w.id,'enemy');
  for(const p of [card,up,down]) assert.ok(p,w.id+' mancante');
  const m=meta(card), u=meta(up),d=meta(down);
  assert.ok(m.width>=350&&m.height>=700,w.id+' card ratio');
  assert.ok(u.width>=350&&d.width>=350&&u.height>=300&&d.height>=300,w.id+' holo dimension');
  assert.notEqual(up,down,w.id+' directions distinct');
 }
});
test('fase8: ogni concept ha immagini proprie senza duplicazioni o path inventati',()=>{
 const nonGatling=ARSENAL_48.filter(w=>w.legacyId!=='wp_gatling');assert.equal(nonGatling.length,47);
 const paths=nonGatling.flatMap(w=>[weaponCardSrc(w),weaponHologramSrc(w,'player'),weaponHologramSrc(w,'enemy')]);
 assert.equal(new Set(paths).size,141);
 for(const w of nonGatling) {
  assert.equal(weaponArtworkStatus(w.id),'concept-illustration');
  assert.ok(weaponCardSrc(w).includes(w.id));
  assert.ok(weaponHologramSrc(w,'enemy').includes(w.id));
  assert.equal(weaponCardSrc(w,4),weaponCardSrc(w,1),'same concept art, upgrades still to be illustrated');
 }
});
test('fase8: Gatling approvata conserva i 4 livelli PNG originali',()=>{
 const id='es_common_light_01';assert.equal(weaponArtworkStatus(id),'approved-gatling');
 for(let lvl=1;lvl<=4;lvl++) {
  assert.equal(weaponCardSrc(id,lvl),`/assets/weapons/gatling_cinetica_lv${lvl}.png`);
  assert.equal(weaponHologramSrc(id,'player',lvl),`/assets/weapons/gatling_holo_up_lv${lvl}.png`);
  assert.equal(weaponHologramSrc(id,'enemy',lvl),`/assets/weapons/gatling_holo_down_lv${lvl}.png`);
 }
});
test('fase8: artwork level clamp, side e id sconosciuti senza errori',()=>{
 assert.equal(normalizeArtLevel(100),4);assert.equal(normalizeArtLevel(-20),1);
 assert.equal(weaponCardSrc('inesistente'),null);
 assert.equal(weaponHologramSrc('inesistente','enemy'),null);
});
test('fase8: renderer collegato a shop, area personale e arena, non altera HP nel rendering',()=>{
 const files=['NewArsenalCatalogPreview.jsx','PersonalLoadoutModal.jsx','NewCombatPhase3Preview.jsx'];
 for(const f of files)assert.match(readFileSync(new URL('../'+f,import.meta.url),'utf8'),/WeaponCardArt/);
 const arena=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 const projection=readFileSync(new URL('./WeaponVisuals.jsx',import.meta.url),'utf8');
 const battle=readFileSync(new URL('../ClassicBattleView.jsx',import.meta.url),'utf8');
 assert.match(battle,/import PokerCombatEffects/);
 assert.match(battle,/<PokerCombatEffects/);
 assert.doesNotMatch(arena,/WeaponSlotHologram|WeaponProjection/);
 assert.doesNotMatch(projection,/weaponHologramSrc|phase8-rift-aperture/);
 assert.doesNotMatch(projection,/setGame\(|setHP\(|resolvePhase4Volleys\(/);
});
