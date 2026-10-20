/** Fase 8: unico punto di accesso agli asset. Non riscrive i percorsi di Gatling.
 * Le altre 47 schede usano concept art di livello 1 anche ai livelli 2–4:
 * i livelli visivi dedicati arriveranno con gli upgrade/bilanciamenti.
 */
import { getWeaponDefinition } from './weaponCatalog.js';
export function normalizeArtLevel(value) {
  return Math.max(1, Math.min(4, Math.trunc(Number(value) || 1)));
}
export function weaponCardSrc(idOrWeapon, level=1) {
  const weapon=typeof idOrWeapon==='string'?getWeaponDefinition(idOrWeapon):idOrWeapon;
  return weapon?.assets?.cardImageByLevel?.[String(normalizeArtLevel(level))] || null;
}
export function weaponHologramSrc(idOrWeapon, side='player', level=1) {
  const weapon=typeof idOrWeapon==='string'?getWeaponDefinition(idOrWeapon):idOrWeapon;
  if(!weapon) return null;
  const key=side==='enemy'?'hologramDownByLevel':'hologramUpByLevel';
  return weapon.assets?.[key]?.[String(normalizeArtLevel(level))] || null;
}
export function weaponArtworkStatus(idOrWeapon) {
  const weapon=typeof idOrWeapon==='string'?getWeaponDefinition(idOrWeapon):idOrWeapon;
  if(!weapon) return 'missing';
  return weapon.legacyId==='wp_gatling'?'approved-gatling':'concept-illustration';
}
