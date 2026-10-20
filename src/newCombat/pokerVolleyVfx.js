/** Animazione solamente visiva: HP, Poker, munizioni ed effetti di gioco
 * rimangono proprietà del motore. Le firme qui sono basate su ARMA + EFFETTO,
 * non assegnate a caso a ogni combattimento. */
export const POKER_VOLLEY_ANIMATION_MS = 3400;

/** Ogni effetto del catalogo 48 armi riceve una famiglia di colpo pertinente.
 * All'interno della famiglia il singolo ID determina colore, apertura,
 * geometria, ritmo e traiettoria: due armi non sono identiche. */
export const EFFECT_PORTAL_FAMILIES = Object.freeze({
  raffica_modulata:'burst', marchio_luminoso:'beam', colpo_ritorno:'shard', puntura_critica:'spear',
  catena_conduttiva:'arc', rifrazione:'beam', sovraccarico_progressivo:'pulse', penetrazione_schermata:'spear',
  onda_urto:'pulse', ritardo_impatto:'orbit', campo_gravita:'orbit', residuo_termico:'plasma',
  scatto_evasivo:'orbit', eco_olografica:'beam', taglio_cromatico:'spear', interferenza:'arc',
  sottrazione_magnetica:'arc', mira_anticipata:'beam', scelta_frequenza:'beam', recupero_carica:'arc',
  stordimento_reattore:'plasma', sciame_guidato:'orbit', frattura_criogenica:'shard', richiamo_astrale:'orbit',
  colpo_fuori_fase:'spear', finta_multipla:'shard', curva_inseguitrice:'plasma', inversione_rotta:'orbit',
  risonanza_impulsi:'pulse', tre_traiettorie:'spear', taglio_persistente:'beam', erosione:'plasma',
  colpo_orbitale:'orbit', accumulo_solare:'plasma', onda_gravitazionale:'pulse', fuoco_corale:'burst',
  traccia_immortale:'beam', sparo_invisibile:'spear', battito_differito:'pulse', segno_prescelto:'spear',
  bersaglio_stellare:'beam', intermittenza_solare:'plasma', archivio_tattico:'beam', doppio_impulso:'pulse',
  micro_singolarita:'orbit', esplosione_stadi:'plasma', traiettoria_portale:'orbit', sigillo_finale:'pulse',
});

const FAMILIES = ['burst','beam','arc','shard','pulse','orbit','plasma','spear'];

export function pokerVolleyProfile(weapon) {
  if (!weapon?.id) return null;
  const effectId=weapon.effect?.id || '';
  const key = `${weapon.id}:${effectId}:${weapon.visual?.hologramStyle || ''}`;
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const name = `${weapon.name || ''} ${weapon.effect?.name || ''} ${weapon.visual?.hologramStyle || ''}`.toLowerCase();
  const fallback = /arco|ionico|elettric|tesla|fulmine|volt|scarica/.test(name) ? 'arc'
    : /laser|raggio|prisma|lente|aurora|faro|luce/.test(name) ? 'beam'
    : /onda|gravita|gravit|marea|anello/.test(name) ? 'pulse'
    : /missil|sciame|drone|mirage|gemell/.test(name) ? 'orbit'
    : /lama|falce|spillo|ago|dardo/.test(name) ? 'shard'
    : /martello|obice|mortaio|cataclisma/.test(name) ? 'plasma'
    : /gatling|mitragl|raffica|colpo/.test(name) ? 'burst'
    : FAMILIES[hash % FAMILIES.length];
  const family = EFFECT_PORTAL_FAMILIES[effectId] || fallback;
  return {
    signature: key,
    family,
    effectId,
    effectName: weapon.effect?.name || weapon.name,
    spread: 8 + (hash % 18),
    interval: 80 + ((hash >>> 4) % 35),
    travelMs: 260 + ((hash >>> 10) % 170),
    size: 7 + ((hash >>> 16) % 9) + (weapon.weaponClass === 'heavy' ? 5 : 0),
    glow: weapon.rarityColor || '#38bdf8',
    // Individuazione visiva stabile di ciascuna delle 48 armi.
    motif: hash % 4,
    tilt: ((hash >>> 7) % 23) - 11,
    tint: ((hash >>> 13) % 41) - 20,
    pulseMs: 430 + ((hash >>> 17) % 320),
    gateWidth: (weapon.weaponClass === 'heavy' ? 86 : weapon.weaponClass === 'medium' ? 78 : 70) + (hash % 7),
    gateHeight: (weapon.weaponClass === 'heavy' ? 130 : weapon.weaponClass === 'medium' ? 122 : 114) + ((hash >>> 3) % 8),
    projectileCurve: ((hash >>> 12) % 23) - 11,
  };
}

export function describePokerVolleys(volleys, opener='player') {
  const ordered = opener === 'enemy' ? ['enemy','player'] : ['player','enemy'];
  return ordered.map(side => ({side, volley:volleys?.[side]}))
    .filter(({volley}) => Boolean(volley?.weaponId && volley.shots > 0));
}

/**
 * FIX 7 — la porta appartiene allo slot della carta che ha sparato.
 * Coordinate globali basate su getBoundingClientRect() (inclusi gli scale 3D della plancia).
 * Non può più "saltare" sotto la carta dell'avversario solo per un controllo di viewport:
 * ridimensioniamo il varco per tenerlo SOPRA, con il piede in corrispondenza della carta.
 */
export function portalAnchorForSlot(rect, profile, viewportWidth, viewportHeight, side='player') {
  // Coordinate dello slot VERO (getBoundingClientRect include lo scale 3D di Classic).
  // La porta rimane nella STESSA colonna della carta; in cima alla finestra può
  // sovrapporsi di poco alla carta anziché essere ridotta a un ovale orizzontale.
  const clamp=(v,min,max)=>Math.min(Math.max(v,min),Math.max(min,max));
  const vw=Math.max(80,Number(viewportWidth)||80);
  const vh=Math.max(80,Number(viewportHeight)||80);
  const cardX=(Number(rect.left)||0)+(Number(rect.width)||0)/2;
  const cardTop=Number(rect.top)||0;
  const scale=vw<500?0.79:vw<850?0.9:1;
  const heightDesired=profile.gateHeight*scale;
  const widthDesired=profile.gateWidth*scale;
  const height=Math.min(heightDesired,vh*0.42);
  const width=Math.min(widthDesired,height*.55,Math.max(28,2*Math.min(cardX-3,vw-cardX-3)));
  const x=clamp(cardX,width/2+3,vw-width/2-3);
  // Il piede naturale è 5 px sopra la carta; niente spostamento su altri slot.
  const naturalFoot=cardTop-5;
  const y=clamp(naturalFoot-height/2,height/2+3,vh-height/2-3);
  return {
    x,y,width,height,placement:'above',scale:height/profile.gateHeight,
    cardX,cardY:cardTop,gateFootY:y+height/2,side,
  };
}
