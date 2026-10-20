/** FASE 16A — definizioni di campagna indipendenti dagli ID storici.
 * NON alterare gli ID originali: salvataggi, boss, grafica e mazzi li usano tuttora.
 */
export const PHASE16A_CAMPAIGN_PLANETS = Object.freeze([
  { id: 1, name: 'Terra', relic: 'relic_p1', deck: 'planet_char_1' },
  { id: 2, name: 'Marte', relic: 'relic_p2', deck: 'planet_char_2' },
  { id: 3, name: 'Venere', relic: 'relic_p3', deck: 'planet_char_3' },
  { id: 6, name: 'Saturno', relic: 'relic_p6', deck: 'planet_char_6' },
  { id: 7, name: 'Urano', relic: 'relic_p7', deck: 'planet_char_7' },
  { id: 8, name: 'Nettuno', relic: 'relic_p8', deck: 'planet_char_8' },
  { id: 9, name: 'Plutone', relic: 'relic_p9', deck: 'planet_char_9' },
  { id: 11, name: 'Europa', relic: 'relic_p11', deck: 'planet_char_11' },
  { id: 14, name: 'Proxima b', relic: 'relic_p14', deck: 'planet_char_14' },
  { id: 17, name: 'Haumea', relic: 'relic_p17', deck: 'planet_char_17' },
  { id: 19, name: 'Io', relic: 'relic_p19', deck: 'planet_char_19' },
  { id: 20, name: 'Encelado', relic: 'relic_p20', deck: 'planet_char_20' }
].map((planet,index)=>Object.freeze({...planet, order:index+1, bossSector:10})));
export const PHASE16A_CAMPAIGN_PLANET_IDS=Object.freeze(PHASE16A_CAMPAIGN_PLANETS.map(p=>p.id));
export const PHASE16A_MAX_STARS=PHASE16A_CAMPAIGN_PLANETS.length*10*3;
export const PHASE16A_TOTAL_SECTORS=PHASE16A_CAMPAIGN_PLANETS.length*10;
export const PHASE16A_STAR_MILESTONES=Object.freeze(Array.from({length:PHASE16A_MAX_STARS/15},(_,i)=>(i+1)*15));
// Gli ID rift_1..rift_10 appartengono alla vecchia Cripta: non riutilizzarli,
// altrimenti un varco legacy sarebbe riconosciuto come una fusione nuova.
const draftRifts=[
  { planets:[1,2], itemId:'epic_item_8', name:'Varco I — Calice di Drenaggio', color:'#d946ef', desc:'Danni inflitti e subiti trasformati in Polvere Stellare.' },
  { planets:[3,6], itemId:'epic_item_6', name:'Varco II — Pendolo d’Entropia', color:'#c084fc', desc:'Dopo un colpo subito: sei carte future visibili e cambi gratuiti.' },
  { planets:[7,8], itemId:'epic_item_7', name:'Varco III — Monolite Dielettrico', color:'#14b8a6', desc:'Le armi equipaggiate non si surriscaldano.' },
  { planets:[9,11], itemId:'epic_item_9', name:'Varco IV — Matrice di Probabilità', color:'#84cc16', desc:'Sotto il 30% HP: un tiro Pesante con Coppia o Tris.' },
  { planets:[14,17], itemId:'epic_item_1', name:'Varco V — Anello di Möbius', color:'#00f2fe', desc:'Sotto il 30% HP: la migliore combinazione nelle dieci pescate successive.' },
  { planets:[19,20], itemId:'epic_item_3', name:'Varco VI — Astrolabio', color:'#10b981', desc:'Con il dado pronto: due risultati, il giocatore ne sceglie uno.' }
];
export const PHASE16A_RIFTS=Object.freeze(draftRifts.map((r,i)=>Object.freeze({
  id:`rift_16a_${i+1}`,number:i+1,roman:['I','II','III','IV','V','VI'][i],
  name:r.name,codeName:r.name.split('— ')[1],itemId:r.itemId,
  relicsRequired:r.planets.map(n=>`relic_p${n}`),bossPlanets:r.planets,
  color:r.color,glow:r.color,desc:r.desc
})));
export const PHASE16A_EPIC_IDS=Object.freeze(PHASE16A_RIFTS.map(r=>r.itemId));
// L'indice di avanzamento (1..12) non coincide con l'ID del pianeta (1,2,3,6,...20).
// Per salvataggi storici fermati su un pianeta ora escluso: ultimo pianeta mantenuto precedente.
export function getCampaignPlanetIndex(originalId){
  const n=Number(originalId);
  if(!Number.isFinite(n)) return 1;
  const pos=PHASE16A_CAMPAIGN_PLANET_IDS.indexOf(n);
  if(pos>=0) return pos+1;
  let last=1;
  PHASE16A_CAMPAIGN_PLANET_IDS.forEach((id,i)=>{if(id<=n)last=i+1;});
  return last;
}
export function getVisibleCampaignPlanet(originalId){
  return PHASE16A_CAMPAIGN_PLANET_IDS[getCampaignPlanetIndex(originalId)-1];
}
export function getNextCampaignPlanet(originalId){
  const index=getCampaignPlanetIndex(originalId);
  return PHASE16A_CAMPAIGN_PLANET_IDS[index]??null;
}
export function getGlobalCampaignSector(originalId,unlockedLevels={}){
  const id=getVisibleCampaignPlanet(originalId);
  const level=Math.max(1,Math.min(11,Number(unlockedLevels?.[id])||1));
  return Math.min(PHASE16A_TOTAL_SECTORS,(getCampaignPlanetIndex(id)-1)*10+level);
}
export function getCampaignStarsTotal(starsMap={}){
  let count=0;
  for(const id of PHASE16A_CAMPAIGN_PLANET_IDS){
    for(let level=1;level<=10;level++){
      const stars=starsMap?.[`P${id}_L${level}`];
      if(Array.isArray(stars)) count+=stars.slice(0,3).filter(Boolean).length;
    }
  }
  return Math.min(PHASE16A_MAX_STARS,count);
}
// Salvataggi 600 stelle: gli esclusivi già riscattati restano riscattati
// anche ai nuovi traguardi 180/270/360; nessuna rimozione delle chiavi storiche.
export function migrateCampaignCapsuleClaims(previous={}){
  const next={...previous};
  for(const [oldMilestone,newMilestone] of [[90,90],[210,180],[390,270],[600,360]]){
    if(previous?.[oldMilestone])next[newMilestone]=true;
  }
  return next;
}
export const PHASE16A_CONTENT=Object.freeze({
  neutralDeck:'neutral_starter',
  campaignDecks:PHASE16A_CAMPAIGN_PLANETS.map(p=>p.deck),
  zodiacModules:['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'],
  extraPlanetModules:Array.from({length:20},(_,i)=>`planet_char_${i+1}`),
  capsuleModule:'singularity_core',
  capsuleDecks:['ophiuchus','supreme_eclipse'],
  pilotIds:['pilot_com_1','pilot_com_2','pilot_com_3','pilot_com_4','pilot_rare_1','pilot_rare_2','pilot_rare_3','pilot_rare_4','pilot_epic_1','pilot_epic_2','pilot_epic_3','pilot_epic_4','pilot_leg_1','pilot_leg_2','pilot_leg_3','pilot_leg_4'],
  terrainIds:['cryo_stasis','magnetic_valve','charge_splitter','entropic_filter','resonance_lock','suit_catalyst','quantum_polarizer','algebraic_refraction']
});
