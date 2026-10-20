/**
 * FASE 14 — Effetti effettivi delle 48 armi dell'Arsenale 2.0.
 * Si applicano solo dopo la risoluzione di Poker, salve, Boost, piloti e campo.
 * Nessun effetto modifica il vincitore del confronto Poker o altera le carte.
 * Ogni evento viene risolto una volta sola per scambio; i passivi futuri
 * appartengono ai due giocatori e non sono timer in secondi.
 * Numeri provvisori: bilanciamento in una fase separata.
 */
import { ARSENAL_48, getWeaponDefinition } from './weaponCatalog.js';
import { TURN_PHASES } from './config.js';

const SIDES=['player','enemy'];
const other=side=>side==='player'?'enemy':'player';
const clamp=(n,lo=0,hi=999)=>Math.max(lo,Math.min(hi,Math.floor(Number(n)||0)));
const BASE=()=>({
  delayed:0,nextAttack:0,guard:0,weak:0,vulnerable:0,
  lastPattern:null,lastWeapon:null,streak:0,solar:0,archive:null,
});
export const createPhase14Memory=()=>({player:BASE(),enemy:BASE()});
export const PHASE14_EFFECT_IDS=Object.freeze(ARSENAL_48.map(w=>w.effect.id));
const asMemory=m=>Object.fromEntries(SIDES.map(s=>[s,{...BASE(),...(m?.[s]||{})}]));
const suitCount=cards=>new Set((cards||[]).map(c=>c?.suit).filter(s=>['spades','clubs','diamonds','hearts'].includes(s))).size;
const pokerSize=move=>move?.score?.cardIds?.length||0;
const category=move=>move?.score?.patternId||null;

/** Non opera se la salva non è ancora stata risolta; non duplica i costi. */
export function resolvePhase14WeaponEffects(state) {
  if(state?.phase!==TURN_PHASES.ANIMATE || !state.result?.volleys || state.result.weaponEffectsResolved) return state;
  const memory=asMemory(state.weaponEffects);
  const hp={...state.hp},boost={player:{...state.boost?.player},enemy:{...state.boost?.enemy}};
  const ammo={player:{...state.ammo?.player},enemy:{...state.ammo?.enemy}};
  const events=[];
  const volleys=state.result.volleys;
  const effective={player:clamp(volleys.player?.damage),enemy:clamp(volleys.enemy?.damage)};
  const fired=Object.fromEntries(SIDES.map(s=>[s,Boolean(volleys[s]?.shots>0 && volleys[s]?.weaponId)]));
  const push=(side,id,kind,amount,detail)=>events.push({side,id,kind,amount,description:detail});
  const deal=(side,n,id,label)=>{const amount=Math.min(clamp(n,0,16),hp[other(side)]);if(amount>0){hp[other(side)]-=amount;push(side,id,'damage',amount,label);}return amount;};
  const heal=(side,n,id,label)=>{const amount=Math.min(clamp(n,0,12),Math.max(0,(state.initialHp?.[side]??hp[side])-hp[side]));if(amount>0){hp[side]+=amount;push(side,id,'heal',amount,label);}return amount;};
  const addAmmo=(side,suit,n,id,label)=>{const amount=clamp(n,0,5);if(amount>0&&suit in ammo[side]){ammo[side][suit]+=amount;push(side,id,'ammo',amount,label);}};
  const takeAmmo=(side,suit,n,id,label)=>{const target=other(side);if(!(suit in ammo[target]))return;const amount=Math.min(clamp(n,0,5),ammo[target][suit]);if(amount){ammo[target][suit]-=amount;push(side,id,'ammo_drained',amount,label);}};
  const addBoost=(side,n,id,label)=>{if(!boost[side]||!Number.isFinite(boost[side].energy))return;const amount=Math.min(clamp(n,0,8),Math.max(0,45-boost[side].energy));if(amount>0){boost[side].energy+=amount;push(side,id,'boost',amount,label);}};
  const takeBoost=(side,n,id,label)=>{const target=other(side);if(!boost[target]||!Number.isFinite(boost[target].energy))return;const amount=Math.min(clamp(n,0,8),boost[target].energy);if(amount>0){boost[target].energy-=amount;push(side,id,'boost_drained',amount,label);}};
  const delayed=(side,n,id,label)=>{const amount=clamp(n,0,10);memory[side].delayed=Math.min(12,memory[side].delayed+amount);push(side,id,'delayed',amount,label);};
  const nextAttack=(side,n,id,label)=>{const amount=clamp(n,0,10);memory[side].nextAttack=Math.min(14,memory[side].nextAttack+amount);push(side,id,'next_attack',amount,label);};
  const guard=(side,n,id,label)=>{const amount=clamp(n,0,10);memory[side].guard=Math.min(12,memory[side].guard+amount);push(side,id,'guard',amount,label);};
  const weaken=(side,n,id,label)=>{const target=other(side),amount=clamp(n,0,10);memory[target].weak=Math.min(12,memory[target].weak+amount);push(side,id,'weaken',amount,label);};
  const vuln=(side,n,id,label)=>{const target=other(side),amount=clamp(n,0,10);memory[target].vulnerable=Math.min(12,memory[target].vulnerable+amount);push(side,id,'vulnerability',amount,label);};

  // Consumo degli effetti provenienti dagli scambi precedenti su snapshot delle salve.
  // I nuovi stati creati più sotto non possono essere consumati in questo scambio.
  for(const side of SIDES){
    const p=memory[side],id='passivo_persistente';
    if(p.delayed){deal(side,p.delayed,id,'Impatto rinviato dello scambio precedente');p.delayed=0;}
    if(fired[side] && p.nextAttack){deal(side,p.nextAttack,id,'Vantaggio preparato nell’ultimo scambio');p.nextAttack=0;}
    if(fired[other(side)] && p.vulnerable){deal(other(side),p.vulnerable,id,'Vulnerabilità dello scambio precedente');p.vulnerable=0;}
    if(fired[side] && p.weak){heal(other(side),Math.min(p.weak,effective[side]),id,'Attacco indebolito nello scambio precedente');p.weak=0;}
    if(fired[other(side)] && p.guard){heal(side,Math.min(p.guard,effective[other(side)]),id,'Schermo difensivo preparato');p.guard=0;}
  }

  // Ogni arma possiede UN id di effetto esclusivo. Entrambe vengono risolte
  // sulla stessa salva già determinata, senza modificare rango o risposta Poker.
  for(const side of SIDES){
    const volley=volleys[side],move=state.moves?.[side];
    const weapon=getWeaponDefinition(volley?.weaponId);
    if(!fired[side]||!weapon)continue;
    const id=weapon.effect.id,pattern=category(move),size=pokerSize(move),suit=weapon.ammoSuit;
    const shots=clamp(volley.shots),hit=effective[side],full=shots>=volley.fullShots;
    const p=memory[side],enemy=memory[other(side)];
    const repeat=pattern&&p.lastPattern===pattern;
    const sameWeapon=p.lastWeapon===weapon.id;
    const streak=sameWeapon?Math.min(4,p.streak+1):1;
    // Non usare bonus all'attacco per vincere una mano Poker inferiore.
    switch(id){
      case 'raffica_modulata': if(!full)addAmmo(side,suit,1,id,'Recupero colpo da raffica modulata');break;
      case 'marchio_luminoso':nextAttack(side,3,id,'Marchio luminoso: prossimo attacco');break;
      case 'colpo_ritorno':if(shots>=2)deal(side,2,id,'Secondo impatto della falce');break;
      case 'puntura_critica':if(repeat)deal(side,4,id,'Precisione della stessa combinazione');break;
      case 'catena_conduttiva':if(fired[other(side)])deal(side,3,id,'Arco conduttivo sulla risposta');break;
      case 'rifrazione':if(suitCount(move?.committedCards)===1)deal(side,4,id,'Raggio rifratto monoseme');else addBoost(side,2,id,'Prisma: energia riflessa');break;
      case 'sovraccarico_progressivo':if(streak>1)deal(side,Math.min(6,streak*2),id,'Ritmo della turbina');break;
      case 'penetrazione_schermata':if(enemy.guard>0)deal(side,4,id,'Arpione perfora lo scudo');else vuln(side,2,id,'Schermo avversario esposto');break;
      case 'onda_urto':if(full)deal(side,4,id,'Onda d’urto della salva completa');break;
      case 'ritardo_impatto':delayed(side,4,id,'Impatto pesante programmato');break;
      case 'campo_gravita':vuln(side,4,id,'Campo gravitazionale: bersaglio esposto');break;
      case 'residuo_termico':addBoost(side,3,id,'Recupero di calore in energia Boost');break;
      case 'scatto_evasivo':guard(side,5,id,'Impulso evasivo al prossimo confronto');break;
      case 'eco_olografica':nextAttack(side,4,id,'Eco olografica del prossimo sparo');break;
      case 'taglio_cromatico':if(suitCount(move?.committedCards)>=2)deal(side,4,id,'Taglio policromatico');break;
      case 'interferenza':takeBoost(side,3,id,'Disturbo del serbatoio Boost avversario');break;
      case 'sottrazione_magnetica':takeAmmo(side,volleys[other(side)]?.suit||suit,3,id,'Sottrazione magnetica proiettili');break;
      case 'mira_anticipata':nextAttack(side,5,id,'Finestra di mira anticipata');break;
      case 'scelta_frequenza':if(shots>=4)deal(side,3,id,'Frequenza offensiva');else guard(side,4,id,'Frequenza difensiva');break;
      case 'recupero_carica':addAmmo(side,suit,3,id,'Recupero di carica del raggio');break;
      case 'stordimento_reattore':weaken(side,5,id,'Reattore nemico sotto pressione');break;
      case 'sciame_guidato':nextAttack(side,6,id,'Droni guidati al prossimo attacco');break;
      case 'frattura_criogenica':weaken(side,4,id,'Gelo: scarica nemica indebolita');break;
      case 'richiamo_astrale':nextAttack(side,6,id,'Faro astrale attivo');break;
      case 'colpo_fuori_fase':deal(side,3,id,'Proiettile fuori fase');break;
      case 'finta_multipla':guard(side,6,id,'Traiettorie fantasma difensive');break;
      case 'curva_inseguitrice':if(volley.damagePercent===50)deal(side,5,id,'Inseguimento sulla risposta perdente');else deal(side,2,id,'Spirale inseguitrice');break;
      case 'inversione_rotta':addAmmo(side,suit,2,id,'Recupero munizioni tramite inversione');break;
      case 'risonanza_impulsi':deal(side,Math.min(6,size),id,'Impulsi sincronizzati alla mano Poker');break;
      case 'tre_traiettorie':deal(side,Math.min(6,Math.ceil(shots/2)),id,'Tre traiettorie convergenti');break;
      case 'taglio_persistente':delayed(side,5,id,'Fenditura persistente');break;
      case 'erosione':takeBoost(side,4,id,'Erosione delle riserve Boost');break;
      case 'colpo_orbitale':delayed(side,7,id,'Colpo orbitale in arrivo');break;
      case 'accumulo_solare':p.solar=Math.min(6,p.solar+2);if(p.solar>=6){deal(side,6,id,'Accumulo solare liberato');p.solar=0;}else push(side,id,'charge',p.solar,'Energia solare accumulata');break;
      case 'onda_gravitazionale':weaken(side,6,id,'Onda gravitazionale sulla prossima salva');break;
      case 'fuoco_corale':if(full)deal(side,6,id,'Erettori plasma sincronizzati');else deal(side,2,id,'Fuoco corale parziale');break;
      case 'traccia_immortale':nextAttack(side,6,id,'Traccia della prossima traiettoria');break;
      case 'sparo_invisibile':deal(side,3,id,'Impatto invisibile oltre le difese');break;
      case 'battito_differito':delayed(side,7,id,'Battito temporale dello scambio successivo');break;
      case 'segno_prescelto':vuln(side,7,id,'Marchio del destino sulla difesa');break;
      case 'bersaglio_stellare':nextAttack(side,8,id,'Vettore stellare per il prossimo colpo');break;
      case 'intermittenza_solare':guard(side,4,id,'Schermo intermittente');deal(side,2,id,'Lampo solare');break;
      case 'archivio_tattico':if(repeat)deal(side,7,id,'Combinazione riconosciuta dall’archivio');else addBoost(side,2,id,'Archivio di Poker aggiornato');break;
      case 'doppio_impulso':deal(side,Math.min(6,Math.ceil(shots/2)),id,'Secondo impulso della macchina');break;
      case 'micro_singolarita':takeAmmo(side,suit,4,id,'Attrazione munizioni nella singolarità');break;
      case 'esplosione_stadi':deal(side,full&&size>=5?8:4,id,'Detonazione in più stadi');break;
      case 'traiettoria_portale':deal(side,4,id,'Impatto attraverso il portale');break;
      case 'sigillo_finale':vuln(side,9,id,'Sigillo cosmico sul prossimo attacco');break;
      default:throw Error(`Effetto arma ${id} privo di implementazione`);
    }
    p.streak=streak;p.lastWeapon=weapon.id;p.lastPattern=pattern;
  }
  const winner=hp.player===0&&hp.enemy===0?'draw':hp.player===0?'enemy':hp.enemy===0?'player':null;
  return {...state,hp,boost,ammo,winner,weaponEffects:memory,
    result:{...state.result,weaponEffectsResolved:true,weaponEffectsLog:events},
    history:[...state.history,...events.map(e=>`Arma ${e.side==='player'?'TU':'CPU'} · ${e.description} (${e.kind}: ${e.amount})`)].slice(-20)};
}
