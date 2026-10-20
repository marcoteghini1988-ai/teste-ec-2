/** F17F — inventario e requisito di Poker delle 48 armi, NON probabilita di pesca.
 * Serve a diagnosticare upgrade meno affidabili delle armi comuni.
 */
import {writeFileSync} from 'node:fs';
import {ARSENAL_48,getWeaponDefinition} from '../src/newCombat/weaponCatalog.js';
import {simulateF17DEconomy} from '../src/newCombat/phase17DEconomy.js';
const categories=['one_pair','two_pair','three_of_a_kind','straight_4','flush_4','full_house','four_of_a_kind','straight_flush_4','royal_flush_5'];
const rows=ARSENAL_48.map(w=>({id:w.id,rarity:w.rarityKey,weaponClass:w.weaponClass,ammoSuit:w.ammoSuit,
  allowedPatterns:w.allowedPokerPatterns.join('|'),patterns:w.allowedPokerPatterns.length,
  requiresAtLeastFourCards:w.allowedPokerPatterns.every(x=>!['one_pair','two_pair','three_of_a_kind'].includes(x)),
  acceptsPair:w.allowedPokerPatterns.includes('one_pair'),acceptsTwoPair:w.allowedPokerPatterns.includes('two_pair'),acceptsTris:w.allowedPokerPatterns.includes('three_of_a_kind'),
  requiresFullHouseOrStronger:w.allowedPokerPatterns.every(x=>['full_house','four_of_a_kind','straight_flush_4','straight_flush_5','royal_flush_5'].includes(x))}));
if(rows.length!==48)throw Error('Catalogo non ha 48 armi');
const cols=Object.keys(rows[0]);
writeFileSync(new URL('../FASE_17F_AUDIT_48_ARMI.csv',import.meta.url),[cols.join(','),...rows.map(r=>cols.map(c=>JSON.stringify(r[c])).join(','))].join('\n')+'\n');
const snapshots=[];
for(const profile of ['frugale','equilibrato','potenziato','stress_concentrato']){
 const e=simulateF17DEconomy({profile,starsPerSector:2});
 for(const sector of [1,21,51,91,120]){
  const armory=e.ledger[sector-1].armory,gear=armory.equipped;
  const weapons=['light','medium','heavy'].map(c=>getWeaponDefinition(gear[c])).filter(Boolean);
  const suits=weapons.map(x=>x.ammoSuit);
  snapshots.push({profile,sector,ids:weapons.map(x=>x.id).join('|'),suits:suits.join('|'),uniqueSuits:new Set(suits).size,weaponCount:weapons.length,
   pairEnabledClasses:weapons.filter(x=>x.allowedPokerPatterns.includes('one_pair')).length,
   twoPairEnabledClasses:weapons.filter(x=>x.allowedPokerPatterns.includes('two_pair')).length,
   mustBuildFourOrMoreClasses:weapons.filter(x=>x.allowedPokerPatterns.every(y=>!['one_pair','two_pair','three_of_a_kind'].includes(y))).length});
 }
}
const h=Object.keys(snapshots[0]);
writeFileSync(new URL('../FASE_17F_EQUIPAGGIAMENTO_E_POKER.csv',import.meta.url),[h.join(','),...snapshots.map(r=>h.map(c=>JSON.stringify(r[c])).join(','))].join('\n')+'\n');
console.log('Armi classificate:',rows.length,'Campioni equipaggiamento:',snapshots.length);
console.log('Armi Pesanti con pattern impegnativi:',rows.filter(x=>x.weaponClass==='heavy'&&x.requiresFullHouseOrStronger).length);
