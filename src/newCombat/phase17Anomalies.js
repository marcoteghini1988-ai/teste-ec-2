/**
 * FASE 17 — primo nucleo delle anomalie boss nella campagna Poker.
 * Una SOLA barra HP. Le anomalie cambiano temporaneamente regole e scelte,
 * senza cancellare carte, azzerare i mazzi o creare nuove vite del boss.
 * Numeri e soglie sono ancora provvisori, non il bilanciamento finale.
 */
import {TURN_PHASES} from './config.js';
import {getWeaponDefinition} from './weaponCatalog.js';

const BOSS_PLANS=Object.freeze({
  1:['meteor'],2:['meteor'],3:['freeze'],6:['collapse'],7:['freeze'],
  8:['meteor'],9:['collapse'],11:['freeze','collapse'],
  14:['meteor','freeze'],17:['collapse','meteor','freeze'],
  19:['meteor','freeze','meteor'],20:['freeze','collapse','meteor','freeze']
});
export const PHASE17_ANOMALY_CATALOG=Object.freeze({
  freeze:{name:'Congelamento tattico',icon:'❄️',description:'Un’arma del giocatore viene congelata temporaneamente.'},
  collapse:{name:'Collasso del banco',icon:'🌀',description:'Due slot del tavolo sono sigillati; le carte presenti restano intatte.'},
  meteor:{name:'Pioggia di meteoriti',icon:'☄️',description:'Impatto annunciato: una salva con tre semi diversi protegge il giocatore.'}
});
const classOf=weaponId=>getWeaponDefinition(weaponId)?.weaponClass||null;
const suits=cards=>new Set((cards||[]).map(card=>({H:'hearts',D:'diamonds',C:'clubs',S:'spades','♥':'hearts','♦':'diamonds','♣':'clubs','♠':'spades'})[card?.suit]||card?.suit).filter(s=>['hearts','diamonds','clubs','spades'].includes(s)));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function createPhase17Anomalies(planet,sector){
 return {planet,sector,plan:sector===10?(BOSS_PLANS[planet]||[]):[],triggered:0,active:null,events:[]};
}
export function getPhase17BlockedSlots(state){
 return state?.phase17Anomalies?.active?.kind==='collapse'?[3,4]:[];
}
export function isPhase17WeaponFrozen(state,side,weaponClass){
 return side==='player' && state?.phase17Anomalies?.active?.kind==='freeze' && state.phase17Anomalies.active.weaponClass===weaponClass;
}
export function getPhase17AnomalyNotice(state){
 const active=state?.phase17Anomalies?.active;
 if(!active)return null;
 const catalog=PHASE17_ANOMALY_CATALOG[active.kind];
 const extra=active.kind==='freeze'?` · ${({light:'LEGGERA',medium:'MEDIA',heavy:'PESANTE'}[active.weaponClass]||active.weaponClass)} congelata`
  :active.kind==='collapse'?' · SLOT 4 e 5 INATTIVI'
  :` · impatto fra ${active.remaining} ${active.remaining===1?'scambio':'scambi'}`;
 return `${catalog.icon} ${catalog.name}${extra} · durata ${active.remaining} ${active.remaining===1?'scambio':'scambi'}`;
}
/** La scelta dell'arma è tattica: prima l'ultima usata, altrimenti una classe
 * realmente equipaggiata. Se il giocatore ha soltanto un'arma, non la congela. */
function selectWeapon(state){
 const loadout=state?.arsenal?.player||{};
 const equipped=['light','medium','heavy'].filter(k=>Boolean(loadout[k]));
 if(equipped.length<=1)return null;
 const recent=classOf(state?.moves?.player?.weaponId);
 return recent&&equipped.includes(recent)?recent:equipped.at(-1);
}
function makeActive(state,kind){
 if(kind==='freeze'){
   const weaponClass=selectWeapon(state);
   // Senza alternative non si proibisce l'unica arma; l'anomalia ripiega sui meteoriti.
   return weaponClass?{kind,weaponClass,remaining:2}:{kind:'meteor',remaining:2,countered:false};
 }
 if(kind==='collapse'){
   // Una bomba sulle future caselle sigillate non deve diventare impossibile da disinnescare.
   const bombId=state.phase16B?.bomb?.onBoard?.cardId;
   const canUseThreeSlots=Object.values(state.arsenal?.player||{}).some(id=>{
     const patterns=getWeaponDefinition(id)?.allowedPokerPatterns||[];
     return patterns.some(pattern=>['one_pair','three_of_a_kind','straight_3','flush_3'].includes(pattern));
   });
   // Il collasso non può rendere impossibile qualsiasi tiro con le armi disponibili.
   if(!canUseThreeSlots || (bombId && [3,4].some(index=>state.board?.[index]?.id===bombId)))return {kind:'meteor',remaining:2,countered:false};
   return {kind,remaining:1};
 }
 return {kind:'meteor',remaining:2,countered:false};
}
/** Esegue UN SOLO tick a fine scambio. Questo metodo va chiamato dopo
 * l'animazione e PRIMA della preparazione seguente, solo per la campagna boss. */
export function advancePhase17Anomalies(state){
 const memory=state?.phase17Anomalies;
 if(!memory || memory.sector!==10 || !memory.plan.length || state.phase!==TURN_PHASES.PREPARE || state.winner || (state.hp?.enemy??0)<=0) return state;
 let {active}=memory;
 let hp=state.hp;
 const events=[];
 if(active){
   if(active.kind==='meteor'){
     const defended=suits(state.moves?.player?.committedCards).size>=3 && (state.result?.volleys?.player?.shots||0)>0;
     active={...active,countered:Boolean(active.countered||defended)};
     if(defended)events.push('☄️ Meteoriti: salva con tre semi diversi, protezione riuscita');
   }
   active={...active,remaining:active.remaining-1};
   if(active.remaining<=0){
     if(active.kind==='meteor'){
       if(active.countered)events.push('☄️ Impatto meteoriti neutralizzato dalla combinazione Poker');
       else{
         const damage=Math.min(12,Math.max(0,hp.player));
         hp={...hp,player:hp.player-damage};
         events.push(`☄️ Meteoriti: ${damage} danni al giocatore`);
       }
     }else events.push(`${PHASE17_ANOMALY_CATALOG[active.kind].icon} ${PHASE17_ANOMALY_CATALOG[active.kind].name} terminata`);
     active=null;
   }
 }
 // Non si accumulano anomalie. La prossima parte SOLO dopo la scadenza;
 // nessun cambiamento della barra HP, delle carte o del risultato Poker.
 let triggered=memory.triggered;
 const thresholds=memory.plan.length===1?[0.65]
   :memory.plan.length===2?[0.72,0.40]
   :memory.plan.length===3?[0.78,0.52,0.26]
   :[0.85,0.65,0.43,0.22];
 if(!active && triggered<memory.plan.length && hp.player>0){
   const maxHp=Math.max(1,state.initialHp?.enemy||1);
   if(hp.enemy/maxHp<=thresholds[triggered]){
     active=makeActive(state,memory.plan[triggered]);triggered++;
     events.push(`⚠️ ${PHASE17_ANOMALY_CATALOG[active.kind].name}: ${getPhase17AnomalyNotice({phase17Anomalies:{active}})}`);
   }
 }
 const next={...state,hp,winner:hp.player<=0?'enemy':state.winner,
   phase17Anomalies:{...memory,triggered,active,events},
   history:[...state.history,...events].slice(-20)};
 return hp.player<=0?{...next,phase:TURN_PHASES.FINISHED,actor:null}:next;
}
