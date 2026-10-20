/**
 * ECLISSI STELLARE — FASE 7. Inventario del NUOVO arsenale.
 * Salvataggio separato dall'hardpoint legacy, senza cancellare acquisti e livelli storici.
 * Prezzi temporanei per testare l'acquisto; NON sono il bilanciamento finale.
 */
import { ARSENAL_48, getWeaponDefinition } from './weaponCatalog.js';
import { defaultPhase4Loadout } from './phase4Weapons.js';

export const ARMORY_V2_STORAGE_KEY = 'eclissi_arsenal_v2';
export const ARMORY_V2_SCHEMA_VERSION = 1;
export const ARMORY_CLASSES = Object.freeze(['light','medium','heavy']);
export const ARMORY_CLASSES_LABELS = Object.freeze({light:'LEGGERA',medium:'MEDIA',heavy:'PESANTE'});
export const ARMORY_TEST_PRICES = Object.freeze({common:60,rare:180,epic:450,legendary:1000});
export const ARMORY_STARTERS = Object.freeze({...defaultPhase4Loadout(),medium:'es_common_medium_03',heavy:null});
export const F17_WEAPON_LEVEL_MAX=4;
export const F17_WEAPON_UPGRADE_LEVELS=Object.freeze({2:12,3:35,4:70});
export const F17_WEAPON_UPGRADE_PRICES=Object.freeze({2:250,3:950,4:2700});
const allIds = new Set(ARSENAL_48.map(w=>w.id));

export function getPhase7ArmoryPrice(weaponId) {
  const weapon=getWeaponDefinition(weaponId);
  return weapon ? ARMORY_TEST_PRICES[weapon.rarityKey] : null;
}
export function createPhase7Armory() {
  return {schemaVersion:ARMORY_V2_SCHEMA_VERSION,
    owned:Object.fromEntries(Object.values(ARMORY_STARTERS).filter(Boolean).map(id=>[id,true])),
    equipped:{...ARMORY_STARTERS},levels:Object.fromEntries(Object.values(ARMORY_STARTERS).filter(Boolean).map(id=>[id,1]))};
}
/** Sanitizza anche salvataggi vecchi/corrotti: nessun ID esterno, nessuna arma non posseduta. */
export function normalizePhase7Armory(raw) {
  const defaults=createPhase7Armory();
  if(!raw || typeof raw!=='object') return defaults;
  const owned={...defaults.owned};
  for(const [id,value] of Object.entries(raw.owned && typeof raw.owned==='object' ? raw.owned : {})) {
    if(allIds.has(id) && value===true) owned[id]=true;
  }
  const equipped={};
  for(const weaponClass of ARMORY_CLASSES) {
    const id=raw.equipped?.[weaponClass];
    const weapon=getWeaponDefinition(id);
    equipped[weaponClass]=id===null&&weaponClass==='heavy'?null:owned[id] && weapon?.weaponClass===weaponClass ? id : defaults.equipped[weaponClass];
  }
  const levels={};
  for(const id of Object.keys(owned)) levels[id]=Math.min(4,Math.max(1,Math.floor(Number(raw.levels?.[id])||1)));
  return {schemaVersion:ARMORY_V2_SCHEMA_VERSION, owned, equipped,levels};
}
export function getPhase7OwnedWeapons(armory) {
  const state=normalizePhase7Armory(armory);
  return ARSENAL_48.filter(w=>state.owned[w.id]);
}
/** La transazione restituisce un risultato: nessuna mutazione se fallisce. */
export function buyPhase7Weapon(armory,weaponId,availableDust,pilotLevel=100) {
  const state=normalizePhase7Armory(armory);
  const weapon=getWeaponDefinition(weaponId);
  if(!weapon) return {ok:false, reason:'Arma sconosciuta',state,cost:0};
  if(state.owned[weaponId]) return {ok:false, reason:'Arma già posseduta',state,cost:0};
  if(pilotLevel<getPhase7UnlockLevel(weaponId))return {ok:false,reason:`Richiede pilota livello ${getPhase7UnlockLevel(weaponId)}`,state,cost:0};
  const price=getPhase7ArmoryPrice(weaponId);
  if(!Number.isFinite(availableDust)||availableDust<price)
    return {ok:false,reason:'Polvere stellare insufficiente',state,cost:0};
  return {ok:true,reason:'Arma acquistata',state:{...state,owned:{...state.owned,[weaponId]:true},levels:{...state.levels,[weaponId]:1}},cost:price};
}
export function equipPhase7Weapon(armory,weaponId) {
  const state=normalizePhase7Armory(armory);
  const weapon=getWeaponDefinition(weaponId);
  if(!weapon) return {ok:false,reason:'Arma sconosciuta',state};
  if(!state.owned[weaponId]) return {ok:false,reason:'Acquista prima quest’arma',state};
  return {ok:true,reason:'Equipaggiamento aggiornato',state:{...state,equipped:{...state.equipped,[weapon.weaponClass]:weaponId}}};
}

/** Upgrade armi nuovo Poker: progressione separata dagli Hardpoint legacy. */
export function upgradePhase7Weapon(armory,weaponId,pilotLevel,availableDust){
 const state=normalizePhase7Armory(armory),w=getWeaponDefinition(weaponId);
 if(!w||!state.owned[weaponId])return {ok:false,reason:'Arma non posseduta',state,cost:0};
 const next=(state.levels?.[weaponId]||1)+1;
 if(next>F17_WEAPON_LEVEL_MAX)return {ok:false,reason:'Arma già al livello massimo',state,cost:0};
 if(Number(pilotLevel)<F17_WEAPON_UPGRADE_LEVELS[next])return {ok:false,reason:`Richiede pilota livello ${F17_WEAPON_UPGRADE_LEVELS[next]}`,state,cost:0};
 const rarityMultiplier={common:1,rare:1.5,epic:2,legendary:2.5}[w.rarityKey]||1;
 const cost=Math.round(F17_WEAPON_UPGRADE_PRICES[next]*rarityMultiplier);
 if(Number(availableDust)<cost)return {ok:false,reason:'Polvere stellare insufficiente',state,cost:0};
 return {ok:true,reason:`Arma potenziata al livello ${next}`,state:{...state,levels:{...state.levels,[weaponId]:next}},cost};
}
export function getPhase7UnlockLevel(weaponId){
 const w=getWeaponDefinition(weaponId);
 return w?Math.max(({common:1,rare:18,epic:42,legendary:75}[w.rarityKey]||1),w.weaponClass==='heavy'?18:1):Infinity;
}
