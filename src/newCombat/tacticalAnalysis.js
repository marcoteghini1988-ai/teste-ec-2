/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { ARSENAL_48 } from './weaponCatalog.js';
import { getPhase4Profile } from './phase4Weapons.js';
import { getPhase7ArmoryPrice } from './phase7Armory.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/phase17IProbe.js ──

const WEAPONS=new Map(ARSENAL_48.map(w=>[w.id,w]));
const RANK={common:0,rare:1,epic:2,legendary:3};
export function f17iPreviousOwnedTier(gear){
 const candidate=structuredClone(gear),changed=[];
 for(const cls of ['light','medium','heavy']){
  const current=candidate.armory.equipped[cls];
  const rank=RANK[WEAPONS.get(current)?.rarityKey];
  if(rank==null||rank===0)continue;
  const options=Object.keys(candidate.armory.owned).filter(id=>candidate.armory.owned[id])
   .map(id=>WEAPONS.get(id)).filter(w=>w?.weaponClass===cls&&RANK[w.rarityKey]<rank);
  if(!options.length)continue;
  // Pick highest *previous* tier; tie-break on recorded weapon ID.
  options.sort((a,b)=>RANK[b.rarityKey]-RANK[a.rarityKey]||a.id.localeCompare(b.id));
  candidate.armory.equipped[cls]=options[0].id;
  changed.push({class:cls,from:current,to:options[0].id,previousLevel:gear.armory.levels[current],replacementLevel:gear.armory.levels[options[0].id]});
 }
 return {gear:candidate,changed};
}
export function f17iNoEpics(gear){return {...structuredClone(gear),epics:[]};}
export function f17iSummarizePairs(rows){
 const groups={};
 for(const r of rows){
  const key=`${r.sector}|${r.profile}|${r.scenario}`;
  const g=groups[key]||={sector:r.sector,profile:r.profile,scenario:r.scenario,count:0,wins:0,draws:0,exchanges:0,playerPasses:0,shots:0,invalid:0};
  g.count++;g.wins+=Number(r.result==='player');g.draws+=Number(r.result==='draw');g.exchanges+=r.exchanges;
  g.playerPasses+=r.playerPasses;g.shots+=r.playerShots;g.invalid+=Number(!r.auditOK);
 }
 return Object.values(groups).map(g=>({...g,winRate:+(100*g.wins/g.count).toFixed(1),avgExchanges:+(g.exchanges/g.count).toFixed(2),avgPlayerPasses:+(g.playerPasses/g.count).toFixed(2),shotsPerBattle:+(g.shots/g.count).toFixed(2)}));
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase17JAdvisor.js ──

const BY_ID=new Map(ARSENAL_48.map(w=>[w.id,w]));
const CLASSES=['light','medium','heavy'];
export function f17jWeaponScore(weaponId,level,openingRates){
 const weapon=BY_ID.get(weaponId);
 const probability=Number(openingRates?.[weaponId]);
 if(!weapon||!Number.isFinite(probability)||probability<0||probability>100)return 0;
 const profile=getPhase4Profile(weapon.id,level);
 return probability/100*profile.damagePerShot*profile.fullSalvo;
}
export function f17jLoadoutScore(gear,openingRates){
 const ids=CLASSES.map(cls=>gear?.armory?.equipped?.[cls]).filter(Boolean);
 const score=ids.reduce((sum,id)=>sum+f17jWeaponScore(id,gear.armory.levels?.[id]||1,openingRates),0);
 const suits=ids.map(id=>BY_ID.get(id)?.ammoSuit);
 const collisions=suits.length-new Set(suits).size;
 // Piccola penalita' per uso concorrente dello stesso seme; resta un'ipotesi da testare.
 return score*(1-0.10*collisions);
}
export function f17jRecommendOwned(gear,openingRates){
 if(!gear?.armory?.owned||!gear?.armory?.equipped)throw Error('Inventario incompleto');
 const candidate=structuredClone(gear),original=structuredClone(gear);
 const options=CLASSES.map(cls=>{
  const current=original.armory.equipped[cls];
  if(!current)return [null];
  const owned=Object.keys(original.armory.owned).filter(id=>original.armory.owned[id]&&BY_ID.get(id)?.weaponClass===cls);
  if(!owned.includes(current))throw Error('Arma equipaggiata non posseduta: '+current);
  return owned.sort();
 });
 const before=f17jLoadoutScore(original,openingRates);
 let bestScore=before, best=original.armory.equipped;
 for(const l of options[0])for(const m of options[1])for(const h of options[2]){
  const trial={...original,armory:{...original.armory,equipped:{light:l,medium:m,heavy:h}}};
  const rank=f17jLoadoutScore(trial,openingRates);
  // Necessario vantaggio previsto >=5%, in modo da evitare switch marginali.
  if(rank>bestScore*1.05+1e-8){bestScore=rank;best=trial.armory.equipped;}
 }
 candidate.armory.equipped={...best};
 const changes=CLASSES.filter(cls=>original.armory.equipped[cls]!==best[cls]).map(cls=>({class:cls,from:original.armory.equipped[cls],to:best[cls],fromLevel:original.armory.levels[original.armory.equipped[cls]],toLevel:original.armory.levels[best[cls]]}));
 // Tutte le armi rimangono gia' possedute, livello invariato, nessuna risorsa aggiunta.
 return {gear:candidate,changes,originalScore:before,estimatedScore:bestScore};
}
export function f17jWeaponCatalogAudit(openingRates){
 return ARSENAL_48.map(w=>({id:w.id,name:w.name,rarity:w.rarityKey,weaponClass:w.weaponClass,ammoSuit:w.ammoSuit,allowedPatterns:w.allowedPokerPatterns.join('|'),price:getPhase7ArmoryPrice(w.id),openingPct:Number(openingRates?.[w.id]??0),level1DamagePotential:getPhase4Profile(w.id,1).damagePerShot*getPhase4Profile(w.id,1).fullSalvo,level4DamagePotential:getPhase4Profile(w.id,4).damagePerShot*getPhase4Profile(w.id,4).fullSalvo}));
}
