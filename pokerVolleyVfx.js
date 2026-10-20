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

/**
 * R3 — proiettile fisico DEFINITO DALLA CARTA ARMA, non dal vortice/varco.
 * Ogni ID del catalogo ha una voce esplicita. shape identifica la geometria
 * riconoscibile in battaglia; colori/dimensioni sono propri dell'arma.
 * L'effetto speciale (effect.id) resta separato: non decide mai il proiettile.
 */
const PROJECTILE_SPECS = Object.freeze({
  es_common_light_01:     ['kinetic',     'Dardi cinetici',             '#68f0eb','#d4fffe', 11],
  es_common_light_02:     ['needle',      'Spillo luminoso',            '#70d5ff','#f3feff', 10],
  es_common_light_03:     ['crescent',    'Falce rotante',             '#f5a86b','#fff1cc', 18],
  es_common_light_04:     ['needle',      'Ago gravitico',             '#ba99ff','#e6dcff', 12],
  es_common_medium_01:    ['lightning',   'Doppio arco elettrico',     '#a6c6ff','#f5f8ff', 21],
  es_common_medium_02:    ['prism',       'Raggio prismatico',          '#81ffe0','#ffd1ff', 16],
  es_common_medium_03:    ['ring',        'Anello fotonico',           '#ffb459','#fff2bb', 20],
  es_common_medium_04:    ['harpoon',     'Arpione elettrico',         '#8bd9ff','#fff3d6', 20],
  es_common_heavy_01:     ['shell',       'Obice esplosivo',            '#ff8b69','#ffdaab', 24],
  es_common_heavy_02:     ['missile',     'Missile con pinne blu',      '#68aafa','#ffdddd', 27],
  es_common_heavy_03:     ['gravity',     'Sfera gravitazionale',      '#9bec88','#e2ffd7', 30],
  es_common_heavy_04:     ['flame',       'Getto di fiamma stellare',  '#65dffe','#fff5ba', 30],
  es_rare_light_01:       ['drone',       'Microdrone Vespa',          '#ffde73','#d5faff', 17],
  es_rare_light_02:       ['twinbeam',    'Doppio miraggio',           '#86eaff','#dcbaff', 14],
  es_rare_light_03:       ['lance',       'Lancia di luce',            '#a3ecff','#fff3d5', 18],
  es_rare_light_04:       ['lightning',   'Scarica rossa filamentosa','#fa5275','#fff1f1', 18],
  es_rare_medium_01:      ['magnetic',    'Nucleo magnetico',          '#c0c9d9','#a1f4e8', 22],
  es_rare_medium_02:      ['sniper',      'Colpo di precisione Nyx',  '#bd90ff','#f6e2ff', 13],
  es_rare_medium_03:      ['twinbeam',    'Raggi giallo e blu',       '#ffdb69','#74dcff', 17],
  es_rare_medium_04:      ['drill',       'Trivella elettromagnetica','#70b9ff','#ffe1a0', 21],
  es_rare_heavy_01:       ['star',        'Colpo stellare Quasar',     '#ffde7e','#fffefa', 29],
  es_rare_heavy_02:       ['missile',     'Sciame di micro-missili',   '#79d9ff','#ffffff', 18],
  es_rare_heavy_03:       ['ice',         'Scheggia criogenica',       '#7edfff','#e7fcff', 26],
  es_rare_heavy_04:       ['void',        'Proiettile di vuoto',       '#9f72d9','#e6cfff', 31],
  es_epic_light_01:       ['tachyon',     'Dardo tachionico',          '#fdd978','#fffdf6', 12],
  es_epic_light_02:       ['blades',      'Lamelle luminose',         '#c5b8fc','#ffffff', 18],
  es_epic_light_03:       ['serpent',     'Serpe di plasma',           '#89e897','#d8baff', 21],
  es_epic_light_04:       ['paradox',     'Proiettile paradossale',    '#af97ff','#ffe3f5', 22],
  es_epic_medium_01:      ['solar',       'Impulso solare Helios',     '#ffb04a','#fff1a1', 25],
  es_epic_medium_02:      ['triple',      'Tripla saetta Idra',        '#8fedbd','#bcaaff', 21],
  es_epic_medium_03:      ['lightblade',  'Lama luminosa blu',        '#71d4ff','#e3faff', 27],
  es_epic_medium_04:      ['antimatter',  'Nucleo antimateria',        '#b295fb','#f0e9ff', 25],
  es_epic_heavy_01:       ['astral',      'Colpo orbitale Orione',     '#a8dbff','#fff0d0', 29],
  es_epic_heavy_02:       ['star',        'Sfera solare concentrata',  '#ffac66','#fff1b1', 33],
  es_epic_heavy_03:       ['wave',        'Onda gravitazionale',      '#83b5ff','#e7dbff', 35],
  es_epic_heavy_04:       ['plasma',      'Salva di plasma corale',   '#ff7387','#ffe2ba', 33],
  es_legendary_light_01:  ['filament',    'Filo energetico infinito', '#a8eaff','#fffdf3', 15],
  es_legendary_light_02:  ['ghost',       'Colpo fantasma',            '#b7f6ff','#ffffff', 17],
  es_legendary_light_03:  ['chrono',      'Artiglio temporale',        '#cbbaff','#ffefc5', 20],
  es_legendary_light_04:  ['quill',       'Penna laser dorata',        '#f9cb79','#ffffff', 18],
  es_legendary_medium_01: ['compass',     'Colpo guidato stellare',   '#b5eaff','#fff3c3', 25],
  es_legendary_medium_02: ['eclipse',     'Lama di eclisse',          '#e9b95b','#faf2de', 28],
  es_legendary_medium_03: ['rune',        'Sigillo runico',            '#b3b8ff','#f7dfff', 27],
  es_legendary_medium_04: ['twinpulse',   'Doppio impulso energetico','#70cfff','#fa8294', 26],
  es_legendary_heavy_01:  ['singularity', 'Micro-singolarità oscura', '#a4a2ff','#f0ddff', 35],
  es_legendary_heavy_02:  ['supernova',   'Nucleo di supernova',       '#ffbc7f','#ffffff', 39],
  es_legendary_heavy_03:  ['portalshot',  'Proiettile tra portali',   '#bc8bff','#ffe4a0', 35],
  es_legendary_heavy_04:  ['sigil',       'Colpo con glifi cosmici',   '#e5c06d','#f5e2ff', 37],
});

export const WEAPON_PROJECTILES = PROJECTILE_SPECS;

/** Definizione fisica indipendente dal varco, controllabile per ogni arma. */
export function weaponProjectileProfile(weapon) {
  const spec=PROJECTILE_SPECS[weapon?.id];
  if(!spec) return null;
  const [shape,label,primary,highlight,size]=spec;
  const ordinal=Number(weapon.id.match(/_(\d+)$/)?.[1] || 1);
  // Parametri coerenti con la classe dell'arma, non scelti in base al vortice.
  const heavy=weapon.weaponClass==='heavy';
  return {
    weaponId:weapon.id, shape,label,primary,highlight,size,
    length: Math.round(size*(shape==='sniper'||shape==='filament'||shape==='twinbeam'?4:shape==='missile'?2.7:2.1)),
    travelMs:heavy?550:weapon.weaponClass==='medium'?455:390,
    intervalMs:shape==='missile'?145:shape==='lightning'?135:shape==='triple'?185:heavy?180:100,
    // Differenzia i due ugelli o colpi senza cambiare la forma fisica della carta.
    variant:ordinal,
  };
}

export function pokerVolleyProfile(weapon) {
  if (!weapon?.id) return null;
  const effectId=weapon.effect?.id || '';
  const key = `${weapon.id}:${effectId}:${weapon.visual?.hologramStyle || ''}`;
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const name = `${weapon.name || ''} ${weapon.effect?.name || ''} ${weapon.visual?.hologramStyle || ''}`.toLowerCase();
  const projectile=weaponProjectileProfile(weapon);
  const fallback = /arco|ionico|elettric|tesla|fulmine|volt|scarica/.test(name) ? 'arc'
    : /laser|raggio|prisma|lente|aurora|faro|luce/.test(name) ? 'beam'
    : /onda|gravita|gravit|marea|anello/.test(name) ? 'pulse'
    : /missil|sciame|drone|mirage|gemell/.test(name) ? 'orbit'
    : /lama|falce|spillo|ago|dardo/.test(name) ? 'shard'
    : /martello|obice|mortaio|cataclisma/.test(name) ? 'plasma'
    : /gatling|mitragl|raffica|colpo/.test(name) ? 'burst'
    : 'burst';
  const family = EFFECT_PORTAL_FAMILIES[effectId] || fallback;
  return {
    signature: key,
    family,
    effectId,
    projectile,
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
