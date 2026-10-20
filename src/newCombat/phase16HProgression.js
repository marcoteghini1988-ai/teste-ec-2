/** Fase 16H — cataloghi compatti e obiettivi verificabili nel Poker.
 * Nessuna scrittura di inventari, valuta o salvataggi in questo modulo.
 * Gli ID dei terreni e delle missioni legacy rimangono validi nei salvataggi.
 */
import { PHASE16A_CONTENT, PHASE16A_CAMPAIGN_PLANET_IDS, getVisibleCampaignPlanet } from './phase16ACatalog.js';

export const PHASE16H_TERRAIN_IDS = Object.freeze([...PHASE16A_CONTENT.terrainIds]);
const specs = [
  ['cryo_stasis', 'Subisci una salva: recupera HP una volta per battaglia.'],
  ['magnetic_valve', 'Subisci una salva: converti parte dell’impatto in energia Boost.'],
  ['charge_splitter', 'Effettua una salva valida: recupera munizioni del seme utilizzato.'],
  ['entropic_filter', 'Subisci una salva senza una combinazione Poker valida: recupera HP.'],
  ['resonance_lock', 'Spara con una figura di almeno quattro carte: recupera Boost.'],
  ['suit_catalyst', 'Spara con almeno tre semi diversi: recupera munizioni.'],
  ['quantum_polarizer', 'Spara con una combinazione di un solo seme: infliggi danno supplementare.'],
  ['algebraic_refraction', 'Spara utilizzando il Boost matematico: recupera una parte dell’energia.']
];
export const PHASE16H_TERRAINS = Object.freeze(Object.fromEntries(specs.map(([id,description])=>[id,Object.freeze({id,description})])));
export function describePhase16HTerrain(id, level=1) {
  const terrain=PHASE16H_TERRAINS[id];
  if(!terrain)return null;
  const lv=Math.min(3,Math.max(1,Math.floor(Number(level)||1)));
  return `${terrain.description} Livello ${lv}: effetto incrementale${lv>=2?', riarmo con Etere una sola volta per battaglia se previsto':''}.`;
}
/** Le vecchie proprietà e le carte già equipaggiate non vengono cancellate né nascoste. */
export function getPhase16HTerrainOffers(cards=[],owned={},equipped=[]) {
  const keep = new Set([...PHASE16H_TERRAIN_IDS,
    ...Object.entries(owned||{}).filter(([,value])=>Boolean(value?.unlocked)).map(([id])=>id),
    ...(Array.isArray(equipped)?equipped:[]).filter(Boolean)]);
  const selected=(Array.isArray(cards)?cards:[]).filter(card=>card&&keep.has(card.id));
  const order=id=>PHASE16H_TERRAIN_IDS.indexOf(id);
  return selected.sort((a,b)=>{
    const ia=order(a.id),ib=order(b.id);
    return (ia<0?999:ia)-(ib<0?999:ib);
  });
}
const nonnegative=n=>Math.max(0,Math.floor(Number(n)||0));
/** Una statistica mai registrata non soddisfa automaticamente le sfide. */
export const PHASE16H_CHALLENGES=Object.freeze([
  Object.freeze({id:'valid_poker',name:'Precisione Poker',desc:'Effettua almeno 2 salve con combinazioni Poker valide',check:s=>nonnegative(s?.validPokerCombos)>=2}),
  Object.freeze({id:'counter_response',name:'Risposta Perfetta',desc:'Vinci un confronto Poker rispondendo al nemico',check:s=>nonnegative(s?.winningResponses)>=1}),
  Object.freeze({id:'no_exchange',name:'Disciplina di Mano',desc:'Vinci senza effettuare cambi di carte',check:s=>nonnegative(s?.exchangesUsed)===0}),
  Object.freeze({id:'multi_suits',name:'Versatilità dei Semi',desc:'Gioca una salva valida con almeno tre semi diversi',check:s=>nonnegative(s?.multiSuitShots)>=1}),
  Object.freeze({id:'boost_strike',name:'Colpo Calcolato',desc:'Esegui almeno una salva con Boost matematico riuscito',check:s=>nonnegative(s?.boostActivations)>=1}),
  Object.freeze({id:'module_used',name:'Modulo in Azione',desc:'Attiva almeno una volta il tuo Modulo Abilità',check:s=>nonnegative(s?.moduleActivations)>=1})
]);
export function getPhase16HSectorChallenge(planetId,sector){
  const id=Number(planetId),level=Number(sector);
  // Coordinate storiche di salvataggi precedenti: usa il pianeta visibile equivalente.
  const safeId=PHASE16A_CAMPAIGN_PLANET_IDS.includes(id)?id:getVisibleCampaignPlanet(id);
  if(!Number.isInteger(level)||level<1||level>10)
    return PHASE16H_CHALLENGES[0];
  if(level===10)return {id:'boss_mastery',name:'Maestria del Boss',desc:'Sconfiggi il boss realizzando almeno tre salve Poker valide',check:s=>nonnegative(s?.validPokerCombos)>=3};
  // Le prime missioni non dipendono da Moduli, Boost o equipaggiamenti ancora bloccati.
  const planetOrder=PHASE16A_CAMPAIGN_PLANET_IDS.indexOf(safeId);
  const pool=planetOrder===0 ? PHASE16H_CHALLENGES.slice(0,4) : PHASE16H_CHALLENGES;
  return pool[(planetOrder*7 + level*3)%pool.length];
}
export const PHASE16H_DAILY_BOUNTIES=Object.freeze([
  Object.freeze({id:'bounty_poker',name:'Mano Sicura',desc:'Effettua 3 salve con combinazioni Poker valide',target:3,type:'poker_valid',reward:{dust:350,credits:15,xp:80,diamonds:0}}),
  Object.freeze({id:'bounty_hearts',name:'Sintesi Vitale',desc:'Gioca 8 carte del seme Cuori',target:8,type:'suit_hearts',reward:{dust:300,credits:15,xp:70,diamonds:0}}),
  Object.freeze({id:'bounty_counter',name:'Ribaltamento',desc:'Vinci 2 confronti Poker rispondendo',target:2,type:'counter_wins',reward:{dust:400,credits:20,xp:90,diamonds:0}}),
  Object.freeze({id:'bounty_damage',name:'Potenza di Fuoco',desc:'Infliggi 60 HP di danni complessivi con le armi',target:60,type:'weapon_damage',reward:{dust:350,credits:15,xp:80,diamonds:0}}),
  Object.freeze({id:'bounty_swaps',name:'Tattica di Cambio',desc:'Effettua 4 cambi di carte in preparazione',target:4,type:'card_swaps',reward:{dust:300,credits:20,xp:70,diamonds:0}})
]);
const oldToNew=Object.freeze({bounty_div:'bounty_poker',bounty_fast:'bounty_counter',bounty_four_suits:'bounty_damage',bounty_module:'bounty_swaps'});
/** Conserva premi già riscattati e progresso odierno quando il tipo di missione cambia. */
export function migratePhase16HDailyBounties(saved={}) {
  if(!saved || !Array.isArray(saved.bounties))return saved;
  let changed=false;
  const migrated=saved.bounties.map(b=>{
    const id=oldToNew[b.id]||b.id;
    const canonical=PHASE16H_DAILY_BOUNTIES.find(x=>x.id===id);
    if(!canonical)return b; // missione sconosciuta storica: non distruggere salvataggi
    const progress=Math.min(canonical.target,nonnegative(b.progress));
    if(id!==b.id||b.type!==canonical.type||b.target!==canonical.target)changed=true;
    return {...canonical,progress,completed:Boolean(b.completed)||progress>=canonical.target,claimed:Boolean(b.claimed)};
  });
  return changed?{...saved,bounties:migrated,allCompletedClaimed:Boolean(saved.allCompletedClaimed)}:saved;
}
/** Ordine giornaliero riproducibile, indipendente dall'ordine dei risultati JS sort. */
export function selectPhase16HDailyBounties(date,count=3) {
  const days=String(date).replace(/\D/g,'').split('').reduce((acc,ch)=>(acc*31+Number(ch))>>>0,17);
  const ordered=[...PHASE16H_DAILY_BOUNTIES];
  for(let i=ordered.length-1;i>0;i--){const j=(days+(i+1)*17+i*i)% (i+1);[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}
  return ordered.slice(0,Math.min(count,ordered.length)).map(b=>({...b,progress:0,completed:false,claimed:false}));
}
export function getPhase16HBountyProgress(type,stats={}) {
  switch(type){
    case 'poker_valid':return nonnegative(stats.validPokerCombos);
    case 'suit_hearts':return nonnegative(stats.heartsPlayed);
    case 'counter_wins':return nonnegative(stats.winningResponses);
    case 'weapon_damage':return nonnegative(stats.weaponDamage);
    case 'card_swaps':return nonnegative(stats.exchangesUsed??stats.swaps);
    // Compatibilità: gli altri modi possono ancora usare vecchi contratti del medesimo giorno.
    case 'op_div':return nonnegative(stats.opCounts?.['/']);
    case 'module_act':return nonnegative(stats.moduleActivations);
    case 'four_suits':return nonnegative(stats.goldenOrComboCount);
    case 'fast_strike':return nonnegative(stats.fastStrikesCount);
    default:return 0;
  }
}
