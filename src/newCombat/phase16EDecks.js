/** FASE 16E — mazzi planetari passivi nel Poker della campagna.
 * Nessun ID storico rinumerato; i moduli rimangono una categoria distinta.
 * I valori sono prototipali, da bilanciare dopo le prove.
 */
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {getWeaponDefinition} from './weaponCatalog.js';
import {TURN_PHASES} from './config.js';

const descriptions={
  1:['Gaia','HP iniziali aggiuntivi; dal livello 3 una protezione al primo colpo.'],
  2:['Tharsis','Salve consecutive con danno crescente; una salva mancata interrompe la serie.'],
  3:['Afrodite','Il primo cambio reale di ogni preparazione recupera una piccola quantità di HP.'],
  6:['Anelli di Crono','Riduce una volta per battaglia la prima salva avversaria subita.'],
  7:['Sentinella Ionica','Mitiga una volta per battaglia il primo colpo in un settore con anomalia o interdizione.'],
  8:['Leviatano','Inserisce Jolly Quantici supplementari nel mazzo reale.'],
  9:['Ombre','Una salva valida può consumare HP propri (mai l’ultimo) per aumentare il danno.'],
  11:['Idra','Riduce il costo in Etere dell’estrazione mirata.'],
  14:['Generatore','Blocca una volta per battaglia la riduzione della mano causata da un Malus.'],
  17:['Risonanza','Alternare classi di armi in salve valide ricarica parte del Boost.'],
  19:['Nucleo Magmatico','Una salva valida può applicare ustione al successivo scambio, senza timer.'],
  20:['Sovrano','Una rianimazione automatica una sola volta per battaglia.']
};
export const PHASE16E_DECKS=Object.freeze({
  ...Object.fromEntries(PHASE16A_CAMPAIGN_PLANETS.map(p=>[p.deck,Object.freeze({id:p.deck,planet:p.id,name:descriptions[p.id][0],description:descriptions[p.id][1]})])),
  ophiuchus:Object.freeze({id:'ophiuchus',planet:null,name:'Ophiuchus',description:'Neutralizza le restrizioni delle anomalie e amplifica lievemente salve con Picche.'}),
  supreme_eclipse:Object.freeze({id:'supreme_eclipse',planet:null,name:'Eclissi Suprema',description:'Recupera parte del Boost dopo un calcolo riuscito; ai livelli alti si cura giocando figure multiseme.'})
});
export const isPhase16EDeck=id=>Object.prototype.hasOwnProperty.call(PHASE16E_DECKS,id);
const limit=(n,low,high)=>Math.max(low,Math.min(high,Math.floor(Number(n)||0)));
export function getPhase16EDeckTraits(id,level=1){
  if(!isPhase16EDeck(id))return null; // non toccare mazzi speciali o legacy
  const lv=limit(level,1,9);
  if(['ophiuchus','supreme_eclipse'].includes(id))return [];
  if(id==='planet_char_8')return [{type:'joker_deck_count',count:lv>=4?4:3}];
  if(id==='planet_char_11')return [{type:'deck_extract_discount',cost:lv>=7?1:lv>=4?2:3}];
  return []; // gli altri effetti sono gestiti da eventi dedicati, non dal vecchio motore generico
}
export function describePhase16EDeck(id,level=1){
  const d=PHASE16E_DECKS[id];
  return d?`${d.description} (Livello ${limit(level,1,9)}; valori in prova)` : null;
}
export function initializePhase16E(state){
  if(state.phase16E)return state;
  const id=state.legacyPassives?.loadout?.deckId;
  if(!isPhase16EDeck(id))return state;
  const level=limit(state.legacyPassives.loadout.deckLevel,1,9);
  let next=state;
  if(id==='planet_char_1'){
    const bonus=4+level*2;
    next={...next,initialHp:{...next.initialHp,player:next.initialHp.player+bonus},hp:{...next.hp,player:next.hp.player+bonus}};
  }
  return {...next,phase16E:{id,level,lastRound:0,streak:0,lastWeapon:null,
    usedShield:false,usedAnomaly:false,usedHandGuard:false,revived:false,
    lastSwapRound:null,poisonPending:0,events:[]}};
}
const actualShot=volley=>Boolean(volley?.shots>0&&volley?.damage>0);
/** Effetti di scambio: reali, singoli per round, e sempre dopo la risoluzione armi/boss. */
export function resolvePhase16EExchange(state){
  const active=state.phase16E;
  if(!active || state.phase!==TURN_PHASES.ANIMATE||!state.result?.volleys||active.lastRound===state.round)return state;
  const {id,level:lv}=active, hp={...state.hp};
  const boost={...state.boost,player:{...state.boost.player}};
  const memory={...active,lastRound:state.round,events:[]};
  const emit=(msg)=>memory.events.push(msg);
  const playerShot=actualShot(state.result.volleys.player);
  const enemyShot=actualShot(state.result.volleys.enemy);
  const heal=(n)=>{
    if(hp.player<=0)return 0;
    const amount=Math.min(limit(n,0,16),Math.max(0,(state.initialHp?.player||hp.player)-hp.player));
    hp.player+=amount;return amount;
  };
  const addDamage=(n)=>{
    if(!playerShot || hp.enemy<=0)return 0;
    const amount=Math.min(limit(n,0,18),hp.enemy);
    hp.enemy-=amount;return amount;
  };
  if(memory.poisonPending>0){
    const dot=Math.min(hp.enemy,memory.poisonPending);
    hp.enemy-=dot;memory.poisonPending=0;
    if(dot)emit(`Nucleo Magmatico: ustione −${dot} HP`);
  }
  switch(id){
    case 'ophiuchus':{
      if(playerShot && (state.moves?.player?.committedCards||[]).some(c=>c.suit==='spades')){
        const n=addDamage(Math.min(8,1+Math.ceil(lv/2)));if(n)emit(`Ophiuchus: Picche +${n} danni`);
      }
      break;
    }
    case 'supreme_eclipse':{
      if(playerShot && state.result.volleys.player.boostApplied){
        const n=Math.min(45-boost.player.energy,2+Math.ceil(lv/2));boost.player.energy+=n;
        if(n)emit(`Eclissi Suprema: risonanza calcolo +${n} Boost`);
      }
      if(lv>=4 && playerShot && new Set((state.moves?.player?.committedCards||[]).map(c=>c?.suit).filter(x=>x&&x!=='joker')).size>=3){
        const n=heal(1+Math.ceil(lv/3));if(n)emit(`Eclissi Suprema: sinergia semi +${n} HP`);
      }
      break;
    }
    case 'planet_char_1':{
      if(lv>=3&&!memory.usedShield&&enemyShot){
        const n=heal(2+Math.ceil(lv/2));memory.usedShield=true;
        if(n)emit(`Gaia: prima protezione +${n} HP`);
      }
      break;
    }
    case 'planet_char_2':{
      if(playerShot){memory.streak=Math.min(3,memory.streak+1);
        if(memory.streak>1){const n=addDamage(Math.min(12,(memory.streak-1)*(1+Math.ceil(lv/3))));if(n)emit(`Tharsis: raffica consecutiva +${n} danni`);}
      }else memory.streak=0;
      break;
    }
    case 'planet_char_6':{
      if(enemyShot&&!memory.usedShield){const n=heal(3+Math.ceil(lv/2));memory.usedShield=true;if(n)emit(`Crono: prima salva attenuata di ${n} HP`);}
      break;
    }
    case 'planet_char_7':{
      const env=state.campaignEnvironment;
      const hazardous=Boolean(env&&(env.anomaly&&env.anomaly!=='normal'||env.swapsDisabled||env.blockedBoostOp));
      if(hazardous&&enemyShot&&!memory.usedAnomaly){
        const n=heal(2+Math.ceil(lv/2));memory.usedAnomaly=true;
        if(n)emit(`Sentinella Ionica: anomalia mitigata di ${n} HP`);
      }
      break;
    }
    case 'planet_char_9':{
      if(playerShot&&hp.player>1){
        const cost=Math.min(1+Math.floor(lv/4),hp.player-1);
        hp.player-=cost;const n=addDamage(cost*(2+Math.floor(lv/4)));
        if(n)emit(`Ombre: sacrificati ${cost} HP per +${n} danni`);
      }
      break;
    }
    case 'planet_char_17':{
      if(playerShot){
        const weapon=getWeaponDefinition(state.result.volleys.player.weaponId);
        const klass=weapon?.weaponClass||null;
        if(klass && memory.lastWeapon && memory.lastWeapon!==klass){
          const n=Math.min(45-boost.player.energy,1+Math.ceil(lv/3));
          boost.player.energy+=n;if(n)emit(`Risonanza: cambio classe +${n} Boost`);
        }
        if(klass)memory.lastWeapon=klass;
      }
      break;
    }
    case 'planet_char_19':{
      if(playerShot&&hp.enemy>0){memory.poisonPending=Math.min(6,1+Math.ceil(lv/3));emit(`Nucleo Magmatico: prossima ustione −${memory.poisonPending} HP`);}
      break;
    }
    default: break; // Venere/preparazione, Nettuno/deck, Europa/Etere, Proxima/Malus, Encelado/KO
  }
  const winner=hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
  return {...state,hp,boost,winner,phase16E:memory,
    result:{...state.result,phase16EResolved:true},
    history:[...state.history,...memory.events].slice(-20)};
}
/** Cura di Venere alla PRIMA sostituzione reale in ciascuna preparazione; non offre cambi extra. */
export function applyPhase16EExchange(stateBefore,stateAfter,side){
  const a=stateAfter.phase16E;
  if(!a||side!=='player'||a.id!=='planet_char_3'||stateAfter.preparation?.lastAction?.type!=='swap'||a.lastSwapRound===stateAfter.round)return stateAfter;
  const amount=stateAfter.hp.player>0?Math.min(2+Math.ceil(a.level/2),Math.max(0,stateAfter.initialHp.player-stateAfter.hp.player)):0;
  return {...stateAfter,hp:{...stateAfter.hp,player:stateAfter.hp.player+amount},
    phase16E:{...a,lastSwapRound:stateAfter.round},
    history:[...stateAfter.history,`Afrodite: primo cambio +${amount} HP`].slice(-20)};
}
/** Proxima annulla soltanto il primo Malus di riduzione mano; la scelta Malus rimane spesa. */
export function applyPhase16EHandGuard(state){
  const a=state.phase16E;
  if(!a||a.id!=='planet_char_14'||a.usedHandGuard||!state.phase16B?.player?.handLimit)return state;
  return {...state,phase16E:{...a,usedHandGuard:true},phase16B:{...state.phase16B,player:{...state.phase16B.player,handLimit:0}},
    history:[...state.history,'Generatore: una riduzione mano neutralizzata'].slice(-20)};
}
/** Encelado: salva un solo KO, senza interrompere vittorie / progressioni normali. */
export function applyPhase16ERevival(state){
  const a=state.phase16E;
  if(!a||a.id!=='planet_char_20'||a.revived||state.hp.player>0||!state.initialHp?.player||state.phase===TURN_PHASES.FINISHED)return state;
  const restored=Math.max(1,Math.ceil(state.initialHp.player*(0.10+0.01*a.level)));
  return {...state,hp:{...state.hp,player:restored},winner:null,
    phase16E:{...a,revived:true},history:[...state.history,`Sovrano: rinascita automatica con ${restored} HP`].slice(-20)};
}
