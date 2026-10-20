/**
 * Compatibility bridge between the three current Poker weapon classes and the
 * four ORIGINAL Classic Battle slots. This module never renders a substitute
 * battlefield and never changes the combat engine or game state.
 */
import { getWeaponDefinition } from './weaponCatalog.js';
import { weaponCardSrc } from './weaponArt.js';

export const CLASSIC_TO_POKER_CLASS = Object.freeze(['light', 'medium', 'heavy', null]);

export function mapClassicWeaponSlots(legacySlots, pokerBridge, side) {
  if (!pokerBridge) return legacySlots;
  const loadout = pokerBridge.arsenal?.[side] || {};
  const levels = pokerBridge.weaponLevels?.[side] || {};
  return legacySlots.map((slot, index) => {
    const weaponClass = CLASSIC_TO_POKER_CLASS[index];
    const id = weaponClass ? loadout[weaponClass] : null;
    const weapon = id ? getWeaponDefinition(id) : null;
    if (!weapon) return {
      ...slot,
      id: `empty_poker_weapon_${side}_${index}`,
      name: 'LIBERO', icon: '◇', reqDescription: 'NESSUNA ARMA',
      pokerWeaponId: null, pokerAmmoSuit: null, pokerCardImage: null,
      pokerWeaponClass: weaponClass, currentDamage: 0,
    };
    const level = Math.max(1, Math.min(4, Number(levels[weaponClass] || 1)));
    const firingOption = pokerBridge.weaponOptions?.find(option =>
      (option.weaponId || option.id) === weapon.id);
    return {
      ...slot,
      id: weapon.id,
      name: weapon.name,
      icon: weapon.visual?.icon || slot.icon,
      reqDescription: weaponClass.toUpperCase(),
      currentLevel: level,
      currentDamage: firingOption?.potentialDamage ?? 0,
      pokerWeaponId: weapon.id,
      pokerWeaponClass: weaponClass,
      pokerAmmoSuit: weapon.ammoSuit,
      pokerCardImage: weaponCardSrc(weapon, level),
    };
  });
}

export function pokerWeaponAmmo(bridge, side, slot) {
  if (!bridge || !slot?.pokerWeaponId || !slot.pokerAmmoSuit) return 0;
  return Math.max(0, Number(bridge.ammo?.[side]?.[slot.pokerAmmoSuit]) || 0);
}
