/** Utility test ONLY: transient pattern overlay on a nested *unfrozen* list.
 * weaponCatalog.js freezes weapon definitions; the allowedPokerPatterns array
 * is restored by identity and contents even when the duel throws.
 * Must NEVER be called concurrently or in UI; synchronous callbacks only.
 */
import {getWeaponDefinition} from '../src/newCombat/weaponCatalog.js';
export function withF17KTemporaryPattern(weaponId,additionalPattern,callback){
 if(typeof callback!=='function')throw Error('Callback mancante');
 const weapon=getWeaponDefinition(weaponId);
 if(!weapon || weapon.weaponClass!=='heavy')throw Error(`Pesante sconosciuta: ${weaponId}`);
 const patterns=weapon.allowedPokerPatterns, original=[...patterns];
 if(additionalPattern!==null && (typeof additionalPattern!=='string'||!additionalPattern.trim()||patterns.includes(additionalPattern)))throw Error('Figura aggiuntiva non valida o duplicata');
 try {
  if(additionalPattern)patterns.push(additionalPattern);
  const result=callback();
  if(result&&typeof result.then==='function')throw Error('I trial devono essere sincroni');
  return result;
 }finally{patterns.splice(0,patterns.length,...original);}
}
