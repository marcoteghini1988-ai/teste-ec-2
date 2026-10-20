/**
 * FASE 12 — piloti/boss della CAMPAGNA per Botta e Risposta.
 * Regole deterministiche, nessun operatore matematico delle vecchie armi;
 * il calcolo sopravvive soltanto nello slot Boost.
 * Nessuna scrittura di inventario, XP o ricompense.
 */
import { TURN_PHASES } from './config.js';
import {isPhase16DBoss,resolvePhase16DBossExchange,PHASE16D_BOSS_PROFILES} from './phase16DBosses.js';
import {PHASE16G_PILOTS,getPhase16GPilotDescription,resolvePhase16GPilotExchange} from './phase16GPilots.js';

const SIDES=['player','enemy'];
const other=s=>s==='player'?'enemy':'player';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const suitOf=c=>({H:'hearts',D:'diamonds',S:'spades',C:'clubs','♥':'hearts','♦':'diamonds','♠':'spades','♣':'clubs'})[c?.suit] || c?.suit;
const cardsFor=(state,side)=>state.moves?.[side]?.committedCards || [];
const isColor=(cards,color)=>cards.some(c=>color==='red'?['hearts','diamonds'].includes(suitOf(c)):['clubs','spades'].includes(suitOf(c)));

// Catalogo delle carte pilota realmente presenti in pilotsSystem.jsx.
// Il primo campo identifica una meccanica, non il vecchio operatore matematico.
const DATA=[
 ['pilot_com_1','Riserva tattica','boost'],['pilot_com_2','Correzione di mira','strike'],
 ['pilot_com_3','Raffica disciplinata','ammo'],['pilot_com_4','Precisione criogenica','counter'],
 ['pilot_boss_1','Corazza tellurica','shield'],['pilot_boss_2','Distorsione di Tharsis','streak'],
 ['pilot_boss_3','Neurotossina','venom'],['pilot_boss_4','Radiazione solare','strike'],
 ['pilot_rare_1','Finestra di vendetta','revenge'],['pilot_rare_2','Sovraccarico vitale','revenge'],
 ['pilot_rare_3','Asso nella manica','boost'],['pilot_rare_4','Riflesso cinetico','counter'],
 ['pilot_boss_5','Sovratensione di picche','spades'],['pilot_boss_6','Distorsione cronotopica','streak'],
 ['pilot_boss_7','Parassitismo quantico','boost'],['pilot_boss_8','Pressione degli abissi','finisher'],
 ['pilot_boss_9','Patto di sangue','red'],['pilot_boss_10','Corazza spinata','shield'],
 ['pilot_boss_11','Rigenerazione oceanica','heal'],['pilot_boss_12','Gabbia ferromagnetica','shield'],
 ['pilot_epic_1','Deviazione balistica','counter'],['pilot_epic_2','Transmutazione aurica','ammo'],
 ['pilot_epic_3','Previsione del banco','boost'],['pilot_epic_4','Era glaciale','shield'],
 ['pilot_leg_1','Maestria universale','pattern'],['pilot_leg_2','Preveggenza rapida','boost'],
 ['pilot_leg_3','Accumulo trifase','streak'],['pilot_leg_4','Terremoto reattivo','counter'],
 ['pilot_leg_5','Risonanza cremisi','red'],['pilot_leg_6','Eclisse ossidiana','black'],
 ['pilot_boss_18','Inversione termica','venom'],['pilot_boss_19','Ciclo magmatico','streak'],
 ['pilot_boss_20','Dominio dei quattro semi','suits'],
 ['pilot_sentinel_1','Scudo tellurico','shield'],['pilot_sentinel_2','Mira di Tharsis','strike'],
 ['pilot_sentinel_3','Tossina di Venere','venom'],['pilot_sentinel_4','Scarica solare','strike'],
 ['pilot_sentinel_5','Impulso ionico','spades'],['pilot_sentinel_6','Eco temporale','streak'],
 ['pilot_sentinel_7','Condensatore quantico','boost'],['pilot_sentinel_8','Morsa oceanica','finisher'],
 ['pilot_sentinel_9','Ombra cremisi','red'],['pilot_sentinel_10','Scudo idrocarburico','shield'],
 ['pilot_sentinel_11','Cura criogenica','heal'],['pilot_sentinel_12','Magnetismo difensivo','shield'],
 ['pilot_sentinel_13','Riflesso fotonico','counter'],['pilot_sentinel_14','Riserva del reattore','boost'],
 ['pilot_sentinel_15','Accordo armonico','pattern'],['pilot_sentinel_16','Vettore di Lagrange','finisher'],
 ['pilot_sentinel_17','Accumulo orbitale','streak'],['pilot_sentinel_18','Entropia residua','venom'],
 ['pilot_sentinel_19','Fiamma di Io','streak'],['pilot_sentinel_20','Risonanza dei semi','suits']
];
export const CAMPAIGN_PILOT_V2=Object.freeze(Object.fromEntries(DATA.map(([id,name,kind])=>
  [id,Object.freeze({id,name,kind})])));
export const getCampaignPilotV2=id=>CAMPAIGN_PILOT_V2[id] || null;
export const CAMPAIGN_ABILITY_EXPLANATIONS=Object.freeze({
 boost:'Quando partecipa allo scontro ricarica una piccola quantità di energia Boost.',
 strike:'Se vince il confronto, aggiunge danno alla salva.',
 ammo:'Dopo una salva recupera munizioni del seme dell’arma utilizzata.',
 counter:'Se entrambi sparano, produce un piccolo contrattacco.',
 shield:'Se viene colpito, recupera parte degli HP appena persi.',
 streak:'I successivi scambi vinti aumentano la pressione offensiva.',
 venom:'Un colpo vincente applica veleno nel prossimo scambio, senza consumo di tempo.',
 revenge:'Con meno della metà degli HP una salva valida infligge danno supplementare.',
 spades:'Usare Picche nella combinazione aggiunge danno.',
 finisher:'Aumenta la pressione offensiva contro un avversario con pochi HP.',
 red:'Le combinazioni con Cuori o Quadri aggiungono un effetto offensivo.',
 black:'Le combinazioni con Fiori o Picche aggiungono un effetto offensivo.',
 heal:'Una salva valida può rigenerare HP.',
 pattern:'Combinazioni Poker di almeno quattro carte diventano più efficaci.',
 suits:'Combinazioni che usano semi diversi ricaricano il Boost.'
});
export const getCampaignPilotAbilityDescription=id=>getPhase16GPilotDescription(id)||CAMPAIGN_ABILITY_EXPLANATIONS[getCampaignPilotV2(id)?.kind] || 'Nessuna abilità definita';


export const CAMPAIGN_BOSS_V2=Object.freeze(Object.fromEntries([
 [1,'Guardiano di Gaia','shield','La terra assorbe parte del primo colpo'],
 [2,'Colosso di Tharsis','streak','Le salve consecutive aumentano la pressione'],
 [3,'Matriarca Tossica','venom','Infligge veleno dopo uno scambio, non in base ai secondi'],
 [4,'Arconte Solare','red','Carte rosse amplificano il colpo'],
 [5,'Occhio del Vortice','spades','Le picche rilasciano un impulso ionico'],
 [6,'Crono il Distruttore','counter','Le risposte parziali generano un contraccolpo'],
 [7,'Sentinella Ionica','boost','La perdita di un confronto ricarica il Boost'],
 [8,'Leviatano Abissale','finisher','Colpo più forte quando il bersaglio è ferito'],
 [9,'Signore delle Ombre','blood','Sacrifica HP per una salva cremisi più potente'],
 [10,'Colosso di Metano','shield','Un guscio chimico assorbe gli impatti'],
 [11,'Idra Criogenica','heal','Recupero graduale in seguito a una salva valida'],
 [12,"Titano d’Acciaio",'shield','Protezione aggiuntiva a salute bassa'],
 [13,'Eco dei Mondi','counter','Riflette energia dalle salve subite'],
 [14,'Generatore del Caos','reactor','Accumula energia e la rilascia in un colpo'],
 [15,'Arconte dei Sette','seventh','Ogni settimo scontro efficace genera un impulso'],
 [16,'Custode di Lagrange','gap','Reagisce a un forte divario di HP'],
 [17,'Cristallo di Risonanza','discard','Trasforma gli scarti in un piccolo impulso'],
 [18,'Entità della Discordia','venom','Danno residuo dopo il colpo'],
 [19,'Nucleo Magmatico','magma','Sequenza di carica, scarica e raffreddamento'],
 [20,'Sovrano del Vuoto','sovereign','Il seme dominante cambia secondo la fase del boss']
 ].map(([planet,name,kind,description])=>{
   const upgraded=PHASE16D_BOSS_PROFILES[planet];
   return [planet,Object.freeze(upgraded?{planet,name:upgraded.name,kind:'phase16d',description:upgraded.description,ability:upgraded.ability}:{planet,name,kind,description})];
 })));

export const CAMPAIGN_BOSS_16D=PHASE16D_BOSS_PROFILES;

export const CAMPAIGN_MODIFIERS_V2=Object.freeze({
 standard:{id:'standard',description:'Campo neutro'},
 fast_timer:{id:'fast_timer',description:'Riduzione tempo di attacco/risposta (da adattare quando i settori sono migrati)'},
 no_pass:{id:'no_pass',description:'Blocco cambio carte in preparazione (da attivare con migrazione del settore)'},
 boss_combined:{id:'boss_combined',description:'Pressione aggiuntiva del boss; fase multipla necessaria'}
});
export const CAMPAIGN_ANOMALIES_V2=Object.freeze({
 normal:{id:'normal',description:'Nessuna anomalia'},
 hearts_res:{id:'hearts_res',description:'Bonus di risonanza per carte Cuori della combinazione'},
 op_lock_add:{id:'op_lock_add',description:'Blocca + nello slot Boost (non blocca il Poker)'},
 op_lock_sub:{id:'op_lock_sub',description:'Blocca − nello slot Boost (non blocca il Poker)'},
 op_lock_mul:{id:'op_lock_mul',description:'Blocca × nello slot Boost (non blocca il Poker)'},
 op_lock_div:{id:'op_lock_div',description:'Blocca ÷ nello slot Boost (non blocca il Poker)'}
});

export function createPhase12CampaignTactics({playerPilotId='pilot_com_1',playerPilotLevel=1,enemyPilotId='pilot_sentinel_1',enemyPilotLevel=1,planet=1,sector=1,bossPhase=1,modifier='standard'}={}) {
  if(!getCampaignPilotV2(playerPilotId) || !getCampaignPilotV2(enemyPilotId)) throw Error('Pilota campagna non presente nel catalogo adattato');
  if(!Number.isInteger(planet)||planet<1||planet>20||!Number.isInteger(sector)||sector<1||sector>10) throw Error('Pianeta o settore non valido');
  return Object.freeze({pilots:Object.freeze({player:playerPilotId,enemy:enemyPilotId}),
    levels:Object.freeze({player:clamp(Math.floor(playerPilotLevel)||1,1,5),enemy:clamp(Math.floor(enemyPilotLevel)||1,1,5)}),
    planet,sector,bossPhase:clamp(Math.floor(bossPhase)||1,1,4),modifier,
    boss:sector===10?CAMPAIGN_BOSS_V2[planet]:null});
}

/** Risoluzione UNA VOLTA dopo la salva Poker e dopo il Boost. Non cambia il vincitore Poker. */
export function resolvePhase12CampaignExchange(state) {
  if(!state?.campaignTactics || state.phase!==TURN_PHASES.ANIMATE || !state.result?.volleys || state.result.campaignAbilitiesResolved) return state;
  const tactics=state.campaignTactics;
  const hp={...state.hp}, boost={player:{...state.boost.player},enemy:{...state.boost.enemy}};
  const ammo={player:{...state.ammo.player},enemy:{...state.ammo.enemy}};
  const effects=[];
  const sourceHp={...state.hp};
  const bossMemory={...state.bossMemory,charge:state.bossMemory?.charge||0,streak:state.bossMemory?.streak||0};
  const previousPoison=state.pilotStatus?.poison || {player:0,enemy:0};
  const poison={player:0,enemy:0};
  const winnerSide=state.result.winner==='attacker'?state.result.opener:state.result.winner==='responder'?state.result.responder:null;
  const addDmg=(source,value,why)=>{
    const amount=clamp(Math.floor(value)||0,0,24);
    if(amount<=0) return;
    hp[other(source)]=Math.max(0,hp[other(source)]-amount);
    effects.push({side:source,kind:'damage',amount,description:why});
  };
  const heal=(side,value,why)=>{
    const amount=clamp(Math.floor(value)||0,0,12);
    const actual=Math.min(amount,Math.max(0,state.initialHp[side]-hp[side]));
    if(!actual || sourceHp[side]<=0)return;
    hp[side]+=actual;effects.push({side,kind:'heal',amount:actual,description:why});
  };
  const addBoost=(side,value,why)=>{
    const actual=Math.min(clamp(value,0,12),45-boost[side].energy);
    if(!actual)return;
    boost[side].energy+=actual;effects.push({side,kind:'boost',amount:actual,description:why});
  };
  // Danno differito: si attiva una sola volta nello scambio successivo.
  // Non dipende dalla velocità con cui il giocatore usa i 20 secondi.
  for(const side of SIDES) {
    const delayed=clamp(Number(previousPoison[side])||0,0,8);
    if(delayed>0){hp[side]=Math.max(0,hp[side]-delayed);
      effects.push({side:other(side),kind:'damage',amount:delayed,description:'Tossina dello scambio precedente'});}
  }
  const applyVenom=(source,amount,label)=>{
    const value=clamp(amount,0,8);
    poison[other(source)]=Math.max(poison[other(source)],value);
    effects.push({side:source,kind:'status',amount:value,description:label});
  };
  // Calcoli entrambi gli effetti su uno snapshot del confronto; un'abilità
  // non può riattivarsi quando cambiano gli HP durante la stessa risoluzione.
  for(const side of SIDES) {
    // I dodici boss 16D usano un potere esclusivo: niente bonus generico
    // della carta pilota boss, che sommerebbe effetti doppi e poco leggibili.
    if(side==='enemy' && tactics.sector===10 && isPhase16DBoss(tactics.planet)) continue;
    // I 16 piloti principali hanno regole 16G esclusive nella nuova Campagna.
    // Nessuna duplicazione del generico bonus della Fase 12.
    if(state.phase16G && PHASE16G_PILOTS[tactics.pilots[side]]) continue;
    const pilot=CAMPAIGN_PILOT_V2[tactics.pilots[side]];
    const level=tactics.levels[side];
    const own=state.result.volleys[side];
    const enemy=state.result.volleys[other(side)];
    const ownCards=cardsFor(state,side);
    const shot=own?.shots>0 && own?.damage>0;
    const hit=enemy?.shots>0 && enemy?.damage>0;
    const winning=side===winnerSide;
    const damage=2+level;
    switch(pilot.kind) {
      case 'strike': if(shot&&winning) addDmg(side,damage,'Mira del pilota');break;
      case 'shield': if(hit) heal(side,damage,'Corazza del pilota');break;
      case 'heal': if(shot) heal(side,damage,'Rigenerazione tattica');break;
      case 'boost': if(shot||hit) addBoost(side,1+Math.ceil(level/2),'Riserva Boost del pilota');break;
      case 'ammo': if(shot&&own?.suit) { const n=1+Math.floor(level/3);ammo[side][own.suit]+=n;effects.push({side,kind:'ammo',amount:n,description:'Recupero proiettili'}); } break;
      case 'counter': if(hit&&shot) addDmg(side,Math.ceil(damage/2),'Contromisura del pilota');break;
      case 'revenge': if(shot && sourceHp[side]<state.initialHp[side]*0.5) addDmg(side,damage+2,'Contrattacco disperato');break;
      case 'streak': if(shot && winning) addDmg(side,Math.min(8,1+Math.floor(state.round/2)+level),'Pressione crescente');break;
      case 'venom': if(shot&&winning) applyVenom(side,Math.max(1,Math.ceil(level/2)),'Tossina al prossimo scambio');break;
      case 'finisher': if(shot && sourceHp[other(side)]<state.initialHp[other(side)]*0.5) addDmg(side,damage,'Pressione dell’abisso');break;
      case 'red': if(shot && isColor(ownCards,'red')) addDmg(side,damage,'Risonanza rossa');break;
      case 'black': if(shot && isColor(ownCards,'black')) addDmg(side,damage,'Risonanza nera');break;
      case 'spades': if(shot&&ownCards.some(c=>suitOf(c)==='spades')) addDmg(side,damage,'Sovratensione picche');break;
      case 'suits': if(shot) {const distinct=new Set(ownCards.map(suitOf).filter(Boolean));if(distinct.size>=2)addBoost(side,distinct.size,'Risonanza dei semi');}break;
      case 'pattern': if(shot&&ownCards.length>=4) addDmg(side,damage,'Maestria delle combinazioni');break;
      default: break;
    }
  }
  if(tactics.boss && tactics.sector===10 && !isPhase16DBoss(tactics.planet)) {
    const b=tactics.boss, side='enemy';
    const own=state.result.volleys.enemy, enemy=state.result.volleys.player;
    const shot=own?.shots>0&&own.damage>0;
    const gotHit=enemy?.shots>0&&enemy.damage>0;
    const cards=cardsFor(state,side);
    const charge=bossMemory.charge;
    switch(b.kind) {
      case 'shield':if(gotHit)heal(side,4,'Difesa speciale boss');break;
      case 'streak':if(shot){bossMemory.streak++;addDmg(side,Math.min(8,bossMemory.streak*2),'Assalto progressivo boss');} else bossMemory.streak=0;break;
      case 'venom':if(shot)applyVenom(side,3,'Veleno del boss al prossimo scambio');break;
      case 'red':if(shot&&isColor(cards,'red'))addDmg(side,5,'Risonanza solare');break;
      case 'spades':if(shot&&cards.some(c=>suitOf(c)==='spades'))addDmg(side,5,'Sovratensione ionica');break;
      case 'counter':if(shot&&gotHit)addDmg(side,3,'Contromisura temporale');break;
      case 'boost':if(gotHit)addBoost(side,4,'Assorbimento ionico');break;
      case 'finisher':if(shot&&sourceHp.player<state.initialHp.player/2)addDmg(side,6,'Pressione dell’abisso');break;
      case 'blood':if(shot&&isColor(cards,'red')&&sourceHp.enemy>12){hp.enemy=Math.max(1,hp.enemy-4);addDmg(side,8,'Patto di sangue');effects.push({side,kind:'cost',amount:4,description:'Sacrificio del boss'});}break;
      case 'heal':if(shot)heal(side,6,'Recupero criogenico');break;
      case 'reactor':if(shot){bossMemory.charge=Math.min(20,charge+4);if(bossMemory.charge>=12){addDmg(side,bossMemory.charge,'Scarica del reattore');bossMemory.charge=0;}}break;
      case 'seventh':if(shot&&state.round%7===0)addDmg(side,10,'Settimo impulso');break;
      case 'gap':if(shot&&Math.abs(sourceHp.player-sourceHp.enemy)>40)addDmg(side,6,'Divario gravitazionale');break;
      case 'discard':if(shot){const discards=(state.player.discard?.length||0)+(state.enemy.discard?.length||0);addDmg(side,Math.min(8,Math.floor(discards/5)),'Pressione dei detriti');}break;
      case 'magma':if(shot){if(state.round%3===1)bossMemory.charge=Math.min(16,charge+5);else if(state.round%3===2){addDmg(side,charge,'Eruzione magmatica');bossMemory.charge=0;} }break;
      case 'sovereign':if(shot){const suit=['spades','hearts','clubs','diamonds'][(tactics.bossPhase-1)%4];if(cards.some(c=>suitOf(c)===suit))addDmg(side,7,'Dominio elementale del sovrano');}break;
      default:break;
    }
  }
  const winner=hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
  const next={...state,hp,boost,ammo,bossMemory,pilotStatus:{poison},winner,
    result:{...state.result,campaignAbilitiesResolved:true,campaignEffects:effects},
    history:[...state.history,...effects.map(e=>`Pilota/Boss ${e.side}: ${e.description} (${e.kind} ${e.amount}).`)].slice(-20)};
  return resolvePhase16GPilotExchange(resolvePhase16DBossExchange(next));
}
