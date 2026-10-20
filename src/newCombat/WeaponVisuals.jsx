import React from 'react';
import { getWeaponDefinition } from './weaponCatalog.js';
import { weaponCardSrc } from './weaponArt.js';
import './weaponVisuals.css';

/** Solo immagini statiche delle carte arma.
 * Tutte le animazioni di combattimento passano da PokerCombatEffects.jsx
 * sulla plancia Classic: non duplicare qui varchi, proiettili o danni. */
export function WeaponCardArt({weapon:source,level=1,className='',style={}}) {
  const weapon=typeof source==='string'?getWeaponDefinition(source):source;
  const image=weaponCardSrc(weapon,level);
  if(!weapon || !image) return null;
  return <img className={`phase8-card-art ${className}`} style={style} src={image} alt={`Carta arma ${weapon.name}, ${weapon.rarity}, ${weapon.classLabel}`} loading="lazy" decoding="async" />;
}
