/**
 * FASE 16D — boss della campagna Poker da 12 pianeti.
 * Un profilo = una decisione strategica riconoscibile. Non assegna Epici,
 * non altera le carte e non cambia la graduatoria delle figure Poker.
 * Ogni effetto viene risolto soltanto dopo lo scambio completo.
 * Numeri provvisori (bilanciamento Fase 17).
 */
import {TURN_PHASES} from './config.js';
import {PHASE16A_CAMPAIGN_PLANET_IDS} from './phase16ACatalog.js';

const bounded=(n,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(n)||0)));
const suitOf=c=>({H:'hearts',D:'diamonds',S:'spades',C:'clubs','♥':'hearts','♦':'diamonds','♠':'spades','♣':'clubs'})[c?.suit]||c?.suit;
const SUITS=['spades','hearts','clubs','diamonds'];
const SUIT_NAMES={spades:'Picche',hearts:'Cuori',clubs:'Fiori',diamonds:'Quadri'};
const SUIT_SYMBOLS={spades:'♠',hearts:'♥',clubs:'♣',diamonds:'♦'};
const PROFILES=[
 [1,'Guardiano di Gaia','Corazza tellurica','Assorbe parte del primo colpo, ma tre semi diversi la spezzano.'],
 [2,'Colosso di Tharsis','Assalto progressivo','Ogni vittoria con salva aumenta la pressione. Fermalo per spezzare la serie.'],
 [3,'Matriarca Tossica','Neurotossina','Le salve vincenti avvelenano lo scambio successivo.'],
 [6,'Crono il Distruttore','Controtempo','Se risponde e vince il Poker, accumula Boost e munizioni.'],
 [7,'Sentinella Ionica','Sifone quantico','Intercetta l’energia Boost che conservi; sfruttarla comporta un rischio.'],
 [8,'Leviatano Abissale','Pressione degli abissi','Quando hai pochi HP, le sue salve diventano più pericolose.'],
 [9,'Signore delle Ombre','Patto di sangue','Sacrifica i propri HP per potenziare colpi con carte rosse.'],
 [11,'Idra Criogenica','Rigenerazione criogenica','Recupera HP dopo una salva; i Cuori interrompono la rigenerazione.'],
 [14,'Generatore del Caos','Reattore crescente','Tre salve valide alimentano una scarica. La carica è visibile.'],
 [17,'Cristallo di Risonanza','Memoria degli scarti','Gli scarti del giocatore alimentano il contrattacco.'],
 [19,'Nucleo Magmatico','Ciclo magmatico','Alterna carica, eruzione e raffreddamento su tre scambi.'],
 [20,'Sovrano del Vuoto','Dominio dei semi','Con le anomalie cambia il seme dominante: usarlo può neutralizzare il suo potere.']
];
export const PHASE16D_BOSS_PROFILES=Object.freeze(Object.fromEntries(PROFILES.map(([planet,name,ability,description])=>[planet,Object.freeze({planet,name,ability,description})])));
export const isPhase16DBoss=planet=>Object.hasOwn(PHASE16D_BOSS_PROFILES,Number(planet));

export function getPhase16DBossBrief(state){
 const tactics=state?.campaignTactics;
 if(tactics?.sector!==10||!isPhase16DBoss(tactics.planet))return null;
 const profile=PHASE16D_BOSS_PROFILES[tactics.planet];
 const mem=state.bossMemory?.phase16D||{};
 const phase=1+(state.phase17Anomalies?.triggered||0);
 const text=(tactics.planet===20)?`Dominio variabile: ${SUIT_NAMES[SUITS[(phase-1)%4]]} ${SUIT_SYMBOLS[SUITS[(phase-1)%4]]}`
   :(tactics.planet===14)?`Reattore: ${mem.charge||0}/12`
   :(tactics.planet===19)?`Ciclo: ${['carica','eruzione','raffreddamento'][mem.cycle||0]}`
   :(tactics.planet===2)?`Serie vittorie: ${mem.streak||0}`
   :(tactics.planet===1)?(mem.shieldUsed?'Corazza già consumata':'Corazza ancora attiva')
   :profile.description;
 return {...profile,phase,status:text};
}

/** Un solo passaggio per scambio, lato boss esclusivamente `enemy`. */
export function resolvePhase16DBossExchange(state){
 const tactics=state?.campaignTactics;
 if(tactics?.sector!==10 || !isPhase16DBoss(tactics.planet) || state.phase!==TURN_PHASES.ANIMATE || !state.result?.volleys || state.result.phase16DBossResolved) return state;
 const profile=PHASE16D_BOSS_PROFILES[tactics.planet];
 const hp={...state.hp},initialHp=state.initialHp||{player:100,enemy:100};
 const boost={player:{...state.boost.player},enemy:{...state.boost.enemy}};
 const ammo={player:{...state.ammo.player},enemy:{...state.ammo.enemy}};
 const pilotStatus={...state.pilotStatus,poison:{player:state.pilotStatus?.poison?.player||0,enemy:state.pilotStatus?.poison?.enemy||0}};
 const effects=[];
 const memory={...(state.bossMemory?.phase16D||{})};
 const p=state.result.volleys.player,e=state.result.volleys.enemy;
 const shot=Boolean(e?.shots>0 && e?.damage>0);
 const hit=Boolean(p?.shots>0 && p?.damage>0);
 const winner=state.result.winner;
 const bossWon=(winner==='attacker'&&state.result.opener==='enemy')||(winner==='responder'&&state.result.responder==='enemy');
 const bossReplied=state.result.responder==='enemy';
 const pCards=state.moves?.player?.committedCards||[];
 const eCards=state.moves?.enemy?.committedCards||[];
 const suits=cards=>new Set(cards.map(suitOf).filter(s=>SUITS.includes(s)));
 const playerSuits=suits(pCards),enemySuits=suits(eCards);
 const emit=(kind,amount,description)=>effects.push({side:'enemy',kind,amount,description});
 const damage=(amount,description)=>{
   const n=bounded(amount,0,18);if(!n)return;
   const actual=Math.min(n,hp.player);hp.player-=actual;if(actual)emit('damage',actual,description);
 };
 const heal=(amount,description)=>{
   if(hp.enemy<=0)return;
   const actual=Math.min(bounded(amount,0,12),Math.max(0,initialHp.enemy-hp.enemy));
   if(actual){hp.enemy+=actual;emit('heal',actual,description);}
 };
 const addBoost=(side,amount,description)=>{
   const actual=Math.min(bounded(amount,0,12),Math.max(0,45-boost[side].energy));
   if(actual){boost[side].energy+=actual;effects.push({side,kind:'boost',amount:actual,description});}
 };
 // Se una salva ha già eliminato il boss, non parte un nuovo potere che lo
 // rianimi o infligga danni postumi. Restano i normali effetti di stato preesistenti.
 if(hp.enemy>0 && hp.player>0){
   switch(tactics.planet){
     case 1: // Gaia: una sola difesa per fase; debolezza leggibile e utilizzabile.
       if(hit&&!memory.shieldUsed){
         memory.shieldUsed=true;
         if(playerSuits.size>=3)emit('status',0,'Corazza tellurica spezzata da tre semi diversi');
         else heal(Math.ceil(p.damage*0.35),'Corazza tellurica assorbe parte del primo colpo');
       }
       break;
     case 2: // Marte: pressione solo quando il boss vince davvero con un colpo.
       memory.streak=shot&&bossWon?Math.min(5,(memory.streak||0)+1):0;
       if(memory.streak)damage(Math.min(10,memory.streak*2),'Assalto progressivo di Tharsis');
       break;
     case 3: // Venere: veleno al prossimo scambio, non per secondi.
       if(shot&&bossWon){
         const amount=enemySuits.size>=3?4:3;
         pilotStatus.poison.player=Math.max(pilotStatus.poison.player,amount);
         emit('status',amount,'Neurotossina: danno differito allo scambio successivo');
       }
       break;
     case 6: // Saturno: ricompensa il contrattacco superiore, senza riflettere colpi letali.
       if(shot&&bossWon&&bossReplied){
         addBoost('enemy',5,'Crono anticipa la prossima mossa');
         const suit=e?.suit;
         if(suit&&Number.isFinite(ammo.enemy[suit])){
           ammo.enemy[suit]+=2;emit('ammo',2,'Crono recupera munizioni rispondendo');
         }
       }
       break;
     case 7: // Urano: non drena a caso, ma quando il giocatore investe o conserva Boost.
       if(state.moves?.player?.boost || p?.boostApplied || (hit&&boost.player.energy>=10)){
         const actual=Math.min(6,boost.player.energy);
         boost.player.energy-=actual;
         if(actual)emit('drain',actual,'Sifone ionico sottrae Boost al giocatore');
         addBoost('enemy',Math.max(2,actual),'Sifone ionico alimenta la Sentinella');
       }
       break;
     case 8:
       if(shot&&hp.player<=initialHp.player*0.4)damage(8,'Pressione degli abissi su bersaglio ferito');
       break;
     case 9:
       if(shot&&(enemySuits.has('hearts')||enemySuits.has('diamonds'))){
         if(hp.enemy>15){hp.enemy=Math.max(1,hp.enemy-5);emit('cost',5,'Patto di sangue: il boss sacrifica HP');damage(9,'Ombra cremisi potenziata');}
       }
       break;
     case 11:
       if(shot){
         if(playerSuits.has('hearts'))emit('status',0,'La carta Cuori interrompe la rigenerazione criogenica');
         else heal(6,'Rigenerazione dell’Idra Criogenica');
       }
       break;
     case 14:
       if(shot){
         memory.charge=Math.min(12,(memory.charge||0)+4);
         emit('charge',memory.charge,'Reattore: carica accumulata');
         if(memory.charge>=12){damage(12,'Scarica del Generatore del Caos');memory.charge=0;}
       }
       break;
     case 17: // L'ordine è quello degli scarti effettivi, non carte generate.
       if(shot){
         const count=state.player?.discard?.length||0;
         if(count>=4)addBoost('enemy',Math.min(6,Math.floor(count/2)),'Risonanza degli scarti');
         if(count>=8)damage(5,'Cristallo di Risonanza alimentato dagli scarti');
       }
       break;
     case 19: {
       const cycle=memory.cycle||0;
       if(cycle===0){if(shot)memory.charge=Math.min(12,(memory.charge||0)+6);emit('status',0,'Nucleo magmatico in carica');}
       else if(cycle===1){if(shot&&memory.charge>0)damage(memory.charge,'Eruzione magmatica');memory.charge=0;emit('status',0,'Fase eruzione completata');}
       else emit('status',0,'Nucleo in raffreddamento');
       memory.cycle=(cycle+1)%3;
       break;
     }
     case 20: {
       const phase=1+(state.phase17Anomalies?.triggered||0);
       const dominant=SUITS[(phase-1)%4];
       if(shot && playerSuits.has(dominant) && hit){
         addBoost('player',3,`Il giocatore neutralizza il dominio ${SUIT_NAMES[dominant]}`);
         emit('status',0,`Dominio ${SUIT_NAMES[dominant]} neutralizzato`);
       }else if(shot&&enemySuits.has(dominant)){
         damage(7,`Dominio ${SUIT_NAMES[dominant]} del Sovrano`);
       }
       break;
     }
   }
 }
 const finalWinner=hp.player===0&&hp.enemy===0?'draw':hp.player===0?'enemy':hp.enemy===0?'player':null;
 return {...state,hp,boost,ammo,pilotStatus,bossMemory:{...state.bossMemory,phase16D:memory},winner:finalWinner,
   result:{...state.result,phase16DBossResolved:true,phase16DBossEffects:effects},
   history:[...state.history,...effects.map(x=>`BOSS ${profile.name}: ${x.description}${x.amount?` (${x.amount})`:''}`)].slice(-20)};
}

// Evita disallineamenti fra la campagna ridotta e il catalogo dei boss attivi.
if(PHASE16A_CAMPAIGN_PLANET_IDS.length!==12 || PHASE16A_CAMPAIGN_PLANET_IDS.some(id=>!isPhase16DBoss(id)))
 throw Error('Catalogo boss 16D non coerente con i dodici pianeti della campagna');
