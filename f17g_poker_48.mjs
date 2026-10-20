/** 17G: probabilita' combinatoria di figure su 52 carte senza Jolly.
 * Due condizioni sintetiche: banco vuoto (massimo 4 carte proprie) e
 * una carta pubblica al banco (+ massimo 4 proprie). NON e' un turno reale:
 * non simula armi calde, ammo, avversari, sostituzioni, timer o IA.
 */
import {writeFileSync} from 'node:fs';
import {ARSENAL_48} from '../src/newCombat/weaponCatalog.js';
import {POKER_PATTERNS} from '../src/newCombat/config.js';
import {evaluateExactPokerPattern} from '../src/newCombat/pokerRules.js';
const suits=['hearts','diamonds','clubs','spades'];
const deck=suits.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${suit}${i+1}`,suit,value:i+1})));
let seed=170317;
const rnd=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
function subsets(arr,k){const out=[];function go(i,part){if(part.length===k){out.push([...part]);return}for(let j=i;j<=arr.length-(k-part.length);j++)go(j+1,[...part,arr[j]]);}go(0,[]);return out;}
const reps=Number(process.env.REPS||3000),count=Object.fromEntries(ARSENAL_48.map(w=>[w.id,{empty:0,bank1:0}]));
for(let sample=0;sample<reps;sample++){
 const cards=[...deck];for(let k=0;k<8;k++){const j=k+Math.floor(rnd()*(52-k));[cards[k],cards[j]]=[cards[j],cards[k]];}
 const hand=cards.slice(0,7),publicCard=cards[7],foundEmpty=new Set(),foundBank=new Set();
 const boardSingles=[...subsets(hand,2),...subsets(hand,3),...subsets(hand,4)];
 for(const p of POKER_PATTERNS){
  if(p.count<=4 && boardSingles.some(c=>c.length===p.count&&evaluateExactPokerPattern(c,p.id))){foundEmpty.add(p.id);foundBank.add(p.id);}
  if(p.count===5 && subsets(hand,4).some(c=>evaluateExactPokerPattern([...c,publicCard],p.id)))foundBank.add(p.id);
 }
 for(const w of ARSENAL_48){
  if(w.allowedPokerPatterns.some(p=>foundEmpty.has(p)))count[w.id].empty++;
  if(w.allowedPokerPatterns.some(p=>foundBank.has(p)))count[w.id].bank1++;
 }
}
const rows=ARSENAL_48.map(w=>({id:w.id,rarity:w.rarityKey,class:w.weaponClass,suit:w.ammoSuit,patterns:w.allowedPokerPatterns.join('|'),samples:reps,
  openingPct:+(100*count[w.id].empty/reps).toFixed(2),oneBankPct:+(100*count[w.id].bank1/reps).toFixed(2)}));
const h=Object.keys(rows[0]);
writeFileSync(new URL('../FASE_17G_48_ARMI_DISPONIBILITA_POKER.csv',import.meta.url),h.join(',')+'\n'+rows.map(r=>h.map(k=>JSON.stringify(r[k])).join(',')).join('\n')+'\n');
writeFileSync(new URL('../FASE_17G_48_ARMI_DISPONIBILITA_POKER.json',import.meta.url),JSON.stringify({reps,description:'Same deck sampling each weapon. Empty bank: valid pattern requiring <=4 cards from 7. One public bank card: can also form a 5-card hand using four private. No jokers, ammo, heat, preparation, enemy or attack legality.',rows},null,2)+'\n');
console.table(rows.filter(x=>['es_common_medium_03','es_rare_medium_03','es_epic_medium_03','es_legendary_medium_02','es_legendary_medium_04','es_legendary_light_02'].includes(x.id)).map(x=>({id:x.id,openingPct:x.openingPct,oneBankPct:x.oneBankPct})));
