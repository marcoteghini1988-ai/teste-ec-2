/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { TURN_PHASES } from './config.js';
import { PHASE16A_CAMPAIGN_PLANETS } from './phase16ACatalog.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/phase16FModules.js ──

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(value)||0)));
const other=side=>side==='player'?'enemy':'player';
const suits=['hearts','diamonds','clubs','spades'];
const shape=(id,name,charge,effect,threshold=3)=>Object.freeze({id,name,charge,effect,threshold});
// Gruppo zodiacale: 12 poteri iniziali, il mazzo zodiacale resta una categoria separata.
const zodiac=[
 shape('aries','Ariete · Impatto Diretto','shots','pure_hit',2),
 shape('taurus','Toro · Sintesi Biologica','received','healing',2),
 shape('gemini','Gemelli · Efficienza Rapida','preparations','free_swap',2),
 shape('cancer','Cancro · Pesca Protettiva','cards_used','refill',5),
 shape('leo','Leone · Furia di Grazia','won','execution',2),
 shape('virgo','Vergine · Precisione Pura','counter','module_lock',2),
 shape('libra','Bilancia · Blindatura Calibrata','received','life_drain',2),
 shape('scorpio','Scorpione · Perforazione Tracciante','big_combo','hand_jam',2),
 shape('sagittarius','Sagittario · Buffer Temporale','preparations','prevent_skip',2),
 shape('capricorn','Capricorno · Ammortizzatore','received','guard',3),
 shape('aquarius','Acquario · Catalizzatore Etere','ether_spent','ether_gain',2),
 shape('pisces','Pesci · Risonanza Algebrica','boost','boost_focus',2)
];
// I moduli planetari restano accessibili nei percorsi esistenti (negozio/sfide),
// inclusi i pianeti rimossi dalla campagna principale.
const planet=[
 shape('planet_char_1','Gaia · Corazza di Emergenza','received','guard',2),
 shape('planet_char_2','Marte · Bombardamento Orbitale','shots','pure_hit',3),
 shape('planet_char_3','Venere · Ricombinazione','swaps','refill',2),
 shape('planet_char_4','Mercurio · Caricatore Quantico','patterns','dice_charge',3),
 shape('planet_char_5','Giove · Vortice Ciclonico','big_combo','ammo_refill',2),
 shape('planet_char_6','Saturno · Crono','counter','prevent_skip',2),
 shape('planet_char_7','Urano · Impulso Ionico','boost','boost_siphon',2),
 shape('planet_char_8','Nettuno · Onda Abissale','joker','pure_hit',2),
 shape('planet_char_9','Plutone · Sifone Oscuro','low_hp','life_drain',2),
 shape('planet_char_10','Titano · Difesa Metanica','received','shield_and_ether',3),
 shape('planet_char_11','Europa · Fonte Criogenica','swaps','healing',2),
 shape('planet_char_12','Ganimede · Campo Ferromagnetico','received','guard',3),
 shape('planet_char_13','Kepler · Risonanza Stellare','multisuit','boost_focus',2),
 shape('planet_char_14','Proxima b · Purificazione','counter','clear_malus',2),
 shape('planet_char_15','TRAPPIST-1e · Arconte','patterns','execution',3),
 shape('planet_char_16','Gliese · Sintesi Etere','ether_spent','ether_gain',2),
 shape('planet_char_17','Haumea · Spinta Cinetica','class_switch','ammo_refill',2),
 shape('planet_char_18','Eris · Discordia','counter','module_lock',2),
 shape('planet_char_19','Io · Magma','shots','burn',3),
 shape('planet_char_20','Encelado · Vuoto Sovrano','received','healing',3)
];
const exclusive=[shape('singularity_core','Singolarità · Buco Nero','class_switch','singularity',3)];
// I due ID storici sono ora mazzi speciali. Soltanto chi li aveva già
// equipaggiati come moduli conserva un potere compatibile; nessun nuovo sblocco.
const legacy=[shape('ophiuchus','Ophiuchus · Retaggio','multisuit','burn',2),
 shape('supreme_eclipse','Eclissi Suprema · Retaggio','boost','singularity',3)];
export const PHASE16F_STANDARD_MODULE_IDS=Object.freeze([...zodiac,...planet,...exclusive].map(x=>x.id));
export const PHASE16F_MODULES=Object.freeze(Object.fromEntries([...zodiac,...planet,...exclusive,...legacy].map(x=>[x.id,x])));
export const PHASE16F_EFFECT_LABELS=Object.freeze({
 pure_hit:'Danno puro',healing:'Recupero HP',free_swap:'Un cambio gratuito',refill:'Pesca fino a 2 carte reali (mano max 9)',
 execution:'Colpo più forte su nemico ferito',module_lock:'Blocco modulo / disturbo Boost nemico',life_drain:'Danno e cura',
 hand_jam:'Mano nemica ridotta',prevent_skip:'Protezione dal prossimo salto preparazione',guard:'Protezione del prossimo colpo',
 ether_gain:'Generazione Etere',boost_focus:'Carica Boost',boost_siphon:'Trasferimento Boost',ammo_refill:'Munizioni del seme più scarico',
 shield_and_ether:'Scudo ed Etere',dice_charge:'Dado Quantico pronto',clear_malus:'Pulizia dei sabotaggi',burn:'Ustione del prossimo colpo',singularity:'Danno, cura e Boost'
});
export const PHASE16F_CHARGE_LABELS=Object.freeze({
 shots:'salve con danno',received:'salve subite',preparations:'preparazioni concluse',cards_used:'carte giocate in combinazioni valide',
 won:'confronti Poker vinti',counter:'risposte Poker vincenti',big_combo:'combinazioni di 4+ carte',ether_spent:'preparazioni con Etere speso',
 boost:'Boost matematici riusciti',swaps:'cambi di carte completati',patterns:'categorie Poker differenti',joker:'salve con Jolly',
 low_hp:'salve con HP sotto metà',multisuit:'combinazioni di 3+ semi',class_switch:'salve con armi di classi differenti'
});
const basic=()=>({points:0,ready:false,activations:0,lastRound:0,lastClass:null,patterns:[],lastPrepKey:null,guard:0,bonusDamage:0,freeSwap:false,skipShield:false,burn:0,locked:0,events:[]});
export function initializePhase16F(state,loadout={},enemyLoadout={}){
 if(state.phase16F)return state;
 const id=loadout?.module?.id,def=PHASE16F_MODULES[id];
 const level=clamp(loadout?.module?.level||1,1,9);
 const aiId=enemyLoadout?.id,aiDef=PHASE16F_MODULES[aiId];
 const aiLevel=clamp(enemyLoadout?.level||1,1,9);
 return {...state,phase16F:{player:{...basic(),id:def?.id||null,level},enemy:{...basic(),id:aiDef?.id||null,level:aiLevel},lastResolvedRound:0}};
}
export const getPhase16FModule=(state,side='player')=>{
 const status=state?.phase16F?.[side];return status?.id?PHASE16F_MODULES[status.id]:null;
};
export const describePhase16FModule=(id,level=1)=>{
 const m=PHASE16F_MODULES[id];return m?`${m.name} · Carica: ${PHASE16F_CHARGE_LABELS[m.charge]} (${m.threshold}). Potere: ${PHASE16F_EFFECT_LABELS[m.effect]}. Livello ${level}.`:null;
};
function accrue(state,side,count,info={}){
 const root=state.phase16F,status=root?.[side],def=PHASE16F_MODULES[status?.id];
 if(!def||!count||status.ready)return state;
 const nextPoints=Math.min(def.threshold,status.points+count);
 return {...state,phase16F:{...root,[side]:{...status,points:nextPoints,ready:nextPoints>=def.threshold,...info}}};
}
/** Chiamare UNA volta dopo la risoluzione del confronto completo: nessuna carica
 * extra per i cicli di render, nè per danni autoinflitti o dal solo dado. */
export function resolvePhase16FExchange(state){
 const data=state?.phase16F;
 if(!data||state.phase!==TURN_PHASES.ANIMATE||!state.result?.volleys||data.lastResolvedRound===state.round)return state;
 let next={...state,phase16F:{...data,lastResolvedRound:state.round}};
 // A ogni scambio i bonus di difesa e del colpo successivo si consumano al massimo una volta.
 for(const side of ['player','enemy']){
  const d=next.phase16F[side];if(!d.id)continue;
  const foe=other(side),incoming=state.result.volleys[foe],own=state.result.volleys[side];
  const ownShot=own?.shots>0&&own.damage>0,incomingShot=incoming?.shots>0&&incoming.damage>0;
  const myMove=state.moves?.[side],cards=myMove?.committedCards||[];
  const pattern=myMove?.score?.patternId?.replace(/_[45]$/,'');
  const winner=state.result.winner==='attacker'?state.result.opener:state.result.winner==='responder'?state.result.responder:null;
  const weaponClass=own?.weaponId&&state.arsenal?.[side] ? Object.entries(state.arsenal[side]).find(([,id])=>id===own.weaponId)?.[0]:null;
  let payload={...next.phase16F[side]},hp={...next.hp};
  if(payload.guard>0&&incomingShot){const amount=Math.min(payload.guard,incoming.damage,Math.max(0,next.initialHp[side]-hp[side]));hp[side]=Math.min(next.initialHp[side],hp[side]+amount);payload.guard=0;}
  if(payload.bonusDamage>0&&ownShot){hp[foe]=Math.max(0,hp[foe]-payload.bonusDamage);payload.bonusDamage=0;}
  if(payload.burn>0&&ownShot){hp[foe]=Math.max(0,hp[foe]-payload.burn);payload.burn=0;}
  const def=PHASE16F_MODULES[payload.id];let gain=0;
  if(!payload.ready){
    if(def.charge==='shots'&&ownShot)gain=1;
    if(def.charge==='received'&&incomingShot)gain=1;
    if(def.charge==='cards_used'&&pattern)gain=cards.length;
    if(def.charge==='won'&&winner===side)gain=1;
    if(def.charge==='counter'&&winner===side&&state.result.responder===side)gain=1;
    if(def.charge==='big_combo'&&pattern&&cards.length>=4)gain=1;
    if(def.charge==='boost'&&ownShot&&own.boostApplied)gain=1;
    if(def.charge==='joker'&&ownShot&&cards.some(c=>c.isJoker||c.suit==='joker'))gain=1;
    if(def.charge==='low_hp'&&ownShot&&hp[side]<=next.initialHp[side]*.5)gain=1;
    if(def.charge==='multisuit'&&pattern&&new Set(cards.map(c=>c.suit).filter(x=>suits.includes(x))).size>=3)gain=1;
    if(def.charge==='patterns'&&pattern&&!payload.patterns.includes(pattern)){gain=1;payload.patterns=[...payload.patterns,pattern];}
    if(def.charge==='class_switch'&&ownShot&&weaponClass){if(payload.lastClass&&payload.lastClass!==weaponClass)gain=1;payload.lastClass=weaponClass;}
  }
  next={...next,hp,phase16F:{...next.phase16F,[side]:payload}};
  if(gain)next=accrue(next,side,gain);
 }
 const hp=next.hp,winner=hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
 return {...next,winner};
}
/** Preparazioni e cambi si contano al termine reale dell'azione, non a ogni frame. */
export function trackPhase16FPreparation(state,side,event){
 const data=state.phase16F,status=data?.[side],def=PHASE16F_MODULES[status?.id];
 if(!def||status.ready)return state;
 const key=`${state.round}-${event}`;
 if(def.charge==='preparations'&&event==='ready'&&status.lastPrepKey!==key){
  const next=accrue(state,side,1,{lastPrepKey:key});return next;
 }
 if(def.charge==='swaps'&&event==='swap')return accrue(state,side,1);
 if(def.charge==='ether_spent'&&event==='ether')return accrue(state,side,1);
 return state;
}
/** Lanciare il dado nero non attiva il Modulo al posto dell'utente. */
export function applyPhase16FDiceCharge(state,side='player'){
 const entry=state.phase16F?.[side];if(!entry?.id)return state;
 return accrue(state,side,1);
}
export function activatePhase16FModule(state,side='player'){
 const data=state.phase16F,entry=data?.[side],def=PHASE16F_MODULES[entry?.id];
 if(!def||!entry.ready||state.phase!==TURN_PHASES.PREPARE||state.ready?.[side])throw Error('Modulo non pronto o fase di utilizzo non valida');
 if(entry.locked>0||state.phase16B?.[side]?.moduleLocked>0)throw Error('Modulo bloccato da un sabotaggio');
 const enemy=other(side),me={...state[side]},foe={...state[enemy]},hp={...state.hp},boost={...state.boost,[side]:{...state.boost[side]},[enemy]:{...state.boost[enemy]}},ammo={...state.ammo,[side]:{...state.ammo[side]}};
 const b={...state.phase16B},status={...entry,points:0,ready:false,activations:entry.activations+1,patterns:[],lastClass:null};
 const lv=entry.level,scale=1+Math.floor((lv-1)/3),n=4+2*scale;
 const events=[];let result=state;
 const heal=(amount)=>{const delta=Math.min(amount,Math.max(0,state.initialHp[side]-hp[side]));hp[side]+=delta;events.push(`+${delta} HP`);};
 const hit=(amount)=>{const delta=Math.min(amount,Math.max(0,hp[enemy]));hp[enemy]-=delta;events.push(`−${delta} HP al nemico`);};
 switch(def.effect){
  case 'pure_hit':hit(n+2);break;
  case 'healing':heal(n+3);break;
  case 'execution':hit(hp[enemy] <= state.initialHp[enemy]*.4?n*2:n);break;
  case 'guard':status.guard=n+3;events.push(`protezione sulla prossima salva: ${status.guard}`);break;
  case 'module_lock':{
   if(b?.[enemy])b[enemy]={...b[enemy],moduleLocked:1,boostBlocked:Math.max(1,b[enemy].boostBlocked||0)};events.push('modulo nemico bloccato; contro i boss interferenza Boost');break;
  }
  case 'life_drain':hit(n);heal(Math.ceil(n/2));break;
  case 'hand_jam':{
   if(b?.[enemy])b[enemy]={...b[enemy],handLimit:Math.max(5,Math.min(b[enemy].handLimit||7,6))};events.push('mano avversaria limitata nella prossima preparazione');break;
  }
  case 'prevent_skip':status.skipShield=true;events.push('prossimo salto preparazione neutralizzato');break;
  case 'shield_and_ether':status.guard=n;me.ether+=1;events.push('scudo e +1 Etere');break;
  case 'ether_gain':me.ether+=Math.min(4,1+scale);events.push('Etere rigenerato');break;
  case 'boost_focus':boost[side].energy=Math.min(45,boost[side].energy+n+2);events.push('Boost caricato');break;
  case 'boost_siphon':{
   const amount=Math.min(boost[enemy].energy,Math.max(0,45-boost[side].energy),n);boost[enemy].energy-=amount;boost[side].energy+=amount;events.push(`trasferiti ${amount} Boost`);break;
  }
  case 'ammo_refill':{
   const suit=suits.slice().sort((a,c)=>(ammo[side][a]||0)-(ammo[side][c]||0))[0];ammo[side][suit]=(ammo[side][suit]||0)+n;events.push(`+${n} munizioni ${suit}`);break;
  }
  case 'refill':{
   const count=Math.min(2,Math.max(0,9-me.hand.length),me.deck.length);me.hand=[...me.hand,...me.deck.slice(0,count)];me.deck=me.deck.slice(count);events.push(`${count} carte reali aggiunte alla mano (max 9)`);break;
  }
  case 'free_swap':status.freeSwap=true;events.push('prossimo cambio gratuito');break;
  case 'clear_malus':{
   if(b?.[side])b[side]={...b[side],lockedWeapon:null,boostBlocked:0,handLimit:0,skipNextPreparation:false,weakShield:0,attackWeakened:0};events.push('penalità del prossimo turno rimosse');break;
  }
  case 'dice_charge':{
   if(b?.[side])b[side]={...b[side],dicePatterns:['one_pair','three_of_a_kind','straight'],diceReady:true};events.push('Dado Quantico pronto');break;
  }
  case 'burn':status.burn=n;events.push('prossimo attacco applica ustione');break;
  case 'singularity':hit(n+2);heal(Math.ceil(n/2));boost[side].energy=Math.min(45,boost[side].energy+scale);break;
  default:throw Error('Effetto modulo non implementato');
 }
 // Evoluzioni: ai livelli 4/7 un modulo acquisisce una seconda/terza sinergia
 // senza cambiare la natura del suo potere iniziale. Valori ancora provvisori.
 if(lv>=4){
  if(['healing','life_drain','guard','shield_and_ether','prevent_skip'].includes(def.effect)){
   boost[side].energy=Math.min(45,boost[side].energy+scale);events.push(`sinergia difensiva +${scale} Boost`);
  }else{
   const suit=suits.find(x=>(ammo[side][x]||0)===Math.min(...suits.map(v=>ammo[side][v]||0)));
   if(suit){ammo[side][suit]=(ammo[side][suit]||0)+scale;events.push(`sinergia balistica +${scale} munizioni ${suit}`);}
  }
 }
 if(lv>=7){status.guard=Math.max(status.guard,2+scale);events.push(`sinergia leggendaria: scudo ${status.guard}`);}
 const winner=hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
 result={...state,[side]:me,[enemy]:foe,hp,boost,ammo,winner,
  ...(winner?{phase:TURN_PHASES.FINISHED}:{}),phase16B:b,
  phase16F:{...data,[side]:status},history:[...state.history,`MODULO ${def.name}: ${events.join(', ')}`].slice(-20)};
 return result;
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase17EEnemyModules.js ──


const ZODIAC=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

export function phase17EEnemyModule(planet,sector){
 const order=PHASE16A_CAMPAIGN_PLANETS.findIndex(p=>p.id===Number(planet));
 const local=Number(sector);
 if(order<0 || !Number.isInteger(local) || local<1 || local>10)return null;
 const global=order*10+local;
 if(global<9)return null; // Il giocatore incontra il primo Modulo da S9.
 // Boss: modulo del proprio pianeta, al posto delle vecchie fasi HP multiple.
 // Normali: rotazione deterministica di Moduli standard, nessuna reliquia Epica.
 const id=local===10?`planet_char_${planet}`:ZODIAC[(order+local-1)%ZODIAC.length];
 if(!PHASE16F_MODULES[id])throw Error(`Modulo IA inesistente ${id}`);
 const level=global>=101?4:global>=71?3:global>=41?2:1;
 return {id,level};
}

/** Valutazione su sola informazione lecita e visibile. Non attiva
 * poteri a vuoto e non aggira le regole di fase, blocchi o ricarica.
 */
export function shouldActivatePhase17EEnemyModule(state){
 const status=state?.phase16F?.enemy;
 if(!status?.id || !status.ready || state.phase!==TURN_PHASES.PREPARE || state.ready?.enemy)return false;
 if(status.locked>0 || state.phase16B?.enemy?.moduleLocked>0)return false;
 const def=PHASE16F_MODULES[status.id];if(!def)return false;
 const ownHp=state.hp?.enemy??0,opponentHp=state.hp?.player??0;
 const missingHp=Math.max(0,(state.initialHp?.enemy||ownHp)-ownHp);
 if(ownHp<=0 || opponentHp<=0)return false;
 if(def.effect==='healing' && missingHp===0)return false;
 if(def.effect==='refill' && (state.enemy?.hand?.length>=9 || !state.enemy?.deck?.length))return false;
 if(def.effect==='boost_siphon' && (!(state.boost?.player?.energy>0)||state.boost?.enemy?.energy>=45))return false;
 if(def.effect==='boost_focus' && state.boost?.enemy?.energy>=45)return false;
 if(def.effect==='clear_malus'){
  const malus=state.phase16B?.enemy||{};
  if(!malus.lockedWeapon && !malus.boostBlocked && !malus.handLimit && !malus.skipNextPreparation && !malus.weakShield && !malus.attackWeakened)return false;
 }
 if(['guard','shield_and_ether'].includes(def.effect) && status.guard>0)return false;
 if(def.effect==='prevent_skip' && status.skipShield)return false;
 if(def.effect==='free_swap' && status.freeSwap)return false;
 return true;
}

export function activatePhase17EEnemyModuleIfReady(state){
 return shouldActivatePhase17EEnemyModule(state)?activatePhase16FModule(state,'enemy'):state;
}
