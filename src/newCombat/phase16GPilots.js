/**
 * FASE 16G — 16 piloti principali: condizioni tattiche della Campagna Poker.
 * I piloti non cambiano la gerarchia delle figure, non regalano combinazioni
 * e non sono moduli a carica. Conservati ID, livelli e sblocchi precedenti.
 * I 37 piloti legacy continuano a usare l'adattatore storico Fase 12.
 */
import {TURN_PHASES} from './config.js';

const CLAMP=(n,min,max)=>Math.max(min,Math.min(max,n));
const OTHER=s=>s==='player'?'enemy':'player';
const SUITS=['hearts','diamonds','clubs','spades'];
const suitOf=c=>({H:'hearts',D:'diamonds',C:'clubs',S:'spades','♥':'hearts','♦':'diamonds','♣':'clubs','♠':'spades'})[c?.suit]||c?.suit;
const modeOf=card=>card?.isJoker || card?.suit==='joker';
const pilot=(id,name,condition,description)=>Object.freeze({id,name,condition,description});
export const PHASE16G_PILOTS=Object.freeze(Object.fromEntries([
 pilot('pilot_com_1','Cadetto Additivo','sconfitta_valida','Perdi un confronto con una figura valida: recuperi energia Boost.'),
 pilot('pilot_com_2','Calibratore Sottrattivo','risposta_coppia','Vinci rispondendo con una Coppia: recuperi munizioni del seme utilizzato.'),
 pilot('pilot_com_3','Cannoniere Balistico','alterna_seme','Spari con un seme diverso dalla tua ultima salva: recuperi munizioni.'),
 pilot('pilot_com_4','Cecchino Quantico','coppia_pura','Vinci con una Coppia senza Jolly: generi energia Boost.'),
 pilot('pilot_rare_1','Il Vendicatore','risposta_perdente','Perdi rispondendo ma resisti a una salva: recuperi una parte degli HP.'),
 pilot('pilot_rare_2',"L'Adrenalinico",'pressione_hp','Sotto il 40% HP, una salva valida rigenera munizioni e Boost.'),
 pilot('pilot_rare_3','Il Baro','jolly_vincente','Vinci sparando con un Jolly nella figura: guadagni Etere e Boost.'),
 pilot('pilot_rare_4','Il Collezionista di Specchi','pareggio_armato','Pareggio Poker con due salve valide: recuperi HP e Boost.'),
 pilot('pilot_epic_1',"L'Artificiere di Bordo",'risposta_dopo_colpo','Dopo aver subito una salva, vinci rispondendo: recuperi HP e munizioni.'),
 pilot('pilot_epic_2',"L'Alchimista Aurico",'tre_semi','Spari con almeno tre semi diversi: recuperi munizioni del serbatoio più scarico e Boost.'),
 pilot('pilot_epic_3','Il Viaggiatore del Tempo','figura_grande_persa','Perdi usando una figura valida di quattro o cinque carte: recuperi Etere e Boost.'),
 pilot('pilot_epic_4','Il Re del Ghiaccio','semi_opposti','Entrambi sparate con colori di semi opposti: ripristini HP e munizioni.'),
 pilot('pilot_leg_1','Il Gran Maestro','tre_figure','Spari usando tre figure Poker differenti: recuperi Boost, munizioni e HP.'),
 pilot('pilot_leg_2','Il Veggente Supremo','due_risposte','Vinci due risposte consecutive: guadagni Etere, Boost e HP.'),
 pilot('pilot_leg_3','Il Fissatore','tre_classi','Spari usando tutte e tre le classi d’arma: rifornisci munizioni, HP e Boost.'),
 pilot('pilot_leg_4','Il Lottatore di Sumo','resistenza_doppia','Resisti a due salve avversarie mentre giochi figure valide: ottieni HP, Boost e munizioni.')
].map(x=>[x.id,x])));
export const PHASE16G_MAIN_IDS=Object.freeze(Object.keys(PHASE16G_PILOTS));
export const getPhase16GPilotDescription=id=>PHASE16G_PILOTS[id]?.description||null;
const fresh=()=>({previousSuit:null,previousClass:null,previousHit:false,patterns:[],classes:[],counterStreak:0,hitStreak:0,lastResolvedRound:null});
export function resetPhase16GForBossPhase(state){
 if(!state.phase16G)return state;
 return {...state,phase16G:{player:fresh(),enemy:fresh(),lastResolvedRound:null,events:[]}};
}
export function initializePhase16G(state){
 if(state.phase16G)return state;
 return {...state,phase16G:{player:fresh(),enemy:fresh(),lastResolvedRound:null,events:[]}};
}
const wonSide=result=>result?.winner==='attacker'?result.opener:result?.winner==='responder'?result.responder:null;
const rankPattern=move=>move?.score?.patternId||move?.score?.id||null;
const shotOf=(state,side)=>state.result?.volleys?.[side]||{};
const weaponClassOf=(state,side)=>{
 const weaponId=shotOf(state,side)?.weaponId;
 const arsenal=state.arsenal?.[side]||{};
 return Object.entries(arsenal).find(([,id])=>id&&id===weaponId)?.[0]||null;
};
function applySide(state,side,store,events){
 const id=state.campaignTactics?.pilots?.[side],def=PHASE16G_PILOTS[id];
 if(!def)return {store,hp:null,boost:null,ammo:null,ether:0};
 const enemy=OTHER(side),own=shotOf(state,side),opp=shotOf(state,enemy);
 const played=state.moves?.[side],cards=played?.committedCards||[];
 const ownShot=own.shots>0&&own.damage>0,enemyShot=opp.shots>0&&opp.damage>0;
 const hasFigure=Boolean(played?.score),winning=wonSide(state.result)===side;
 const responding=state.result?.responder===side;
 const lost=hasFigure&&wonSide(state.result)===enemy;
 const pattern=rankPattern(played);
 const rank=pattern?.replace(/_[45]$/,'')||null;
 const suit=SUITS.includes(own.suit)?own.suit:null;
 const usedSuits=[...new Set(cards.map(suitOf).filter(x=>SUITS.includes(x)))];
 const playedColor=usedSuits.every(x=>['hearts','diamonds'].includes(x))?'red':usedSuits.every(x=>['clubs','spades'].includes(x))?'black':null;
 const theirSuits=(state.moves?.[enemy]?.committedCards||[]).map(suitOf).filter(x=>SUITS.includes(x));
 const foeColor=theirSuits.length&&theirSuits.every(x=>['hearts','diamonds'].includes(x))?'red':theirSuits.length&&theirSuits.every(x=>['clubs','spades'].includes(x))?'black':null;
 const level=CLAMP(state.campaignTactics?.levels?.[side]||1,1,5);
 const step=1+Math.floor((level-1)/2);
 const memory={...store,patterns:[...store.patterns],classes:[...store.classes]};
 const hp={...state.hp},boost={...state.boost,[side]:{...state.boost?.[side]}},ammo={...state.ammo,[side]:{...state.ammo?.[side]}},me={...state[side]};
 let changed=false;
 const add=(kind,n,reason)=>{
  let actual=0;
  if(kind==='hp'){actual=Math.min(n,Math.max(0,(state.initialHp?.[side]||0)-hp[side]));if(hp[side]<=0)actual=0;hp[side]+=actual;}
  if(kind==='boost'){actual=Math.min(n,Math.max(0,45-(boost[side].energy||0)));boost[side].energy=(boost[side].energy||0)+actual;}
  if(kind==='ammo'){
   const target=suit||SUITS.slice().sort((a,b)=>(ammo[side][a]||0)-(ammo[side][b]||0))[0];
   actual=n;ammo[side][target]=(ammo[side][target]||0)+actual;
  }
  if(kind==='ether'){actual=n;me.ether=(me.ether||0)+actual;}
  if(actual){events.push({side,pilot:id,kind,amount:actual,description:reason});changed=true;}
 };
 const firstNewHit=enemyShot && hp[side]>0;
 switch(def.condition){
  case 'sconfitta_valida':if(lost&&ownShot)add('boost',1+step,'Ripresa tattica');break;
  case 'risposta_coppia':if(responding&&winning&&ownShot&&rank==='one_pair')add('ammo',step,'Calibrazione della Coppia');break;
  case 'alterna_seme':if(ownShot&&suit&&store.previousSuit&&suit!==store.previousSuit)add('ammo',step,'Alternanza di munizioni');break;
  case 'coppia_pura':if(winning&&ownShot&&rank==='one_pair'&&!cards.some(modeOf))add('boost',1+step,'Precisione senza Jolly');break;
  case 'risposta_perdente':if(responding&&lost&&firstNewHit)add('hp',1+step,'Riscatto del Vendicatore');break;
  case 'pressione_hp':if(ownShot&&hp[side]>0&&hp[side]<=state.initialHp[side]*.4){add('ammo',step,'Adrenalina: munizioni');add('boost',step,'Adrenalina: Boost');}break;
  case 'jolly_vincente':if(winning&&ownShot&&cards.some(modeOf)){add('ether',1,'Trucco del Jolly');add('boost',step,'Trucco del Jolly');}break;
  case 'pareggio_armato':if(!wonSide(state.result)&&hasFigure&&ownShot&&enemyShot){add('hp',step,'Specchio del pareggio');add('boost',step,'Specchio del pareggio');}break;
  case 'risposta_dopo_colpo':if(responding&&winning&&ownShot&&store.previousHit){add('hp',step+1,'Risposta dopo l’impatto');add('ammo',step,'Risposta dopo l’impatto');}break;
  case 'tre_semi':if(ownShot&&usedSuits.length>=3){add('boost',step,'Triangolazione dei semi');add('ammo',step,'Triangolazione dei semi');}break;
  case 'figura_grande_persa':if(lost&&ownShot&&cards.length>=4){add('ether',1,'Preparazione del futuro');add('boost',step,'Preparazione del futuro');}break;
  case 'semi_opposti':if(ownShot&&enemyShot&&playedColor&&foeColor&&playedColor!==foeColor){add('hp',step+1,'Contrasto termico');add('ammo',step,'Contrasto termico');}break;
  case 'tre_figure':if(ownShot&&rank){const patterns=[...new Set([...memory.patterns,rank])];if(patterns.length>=3){add('boost',step+2,'Maestria di tre figure');add('ammo',step,'Maestria di tre figure');add('hp',step,'Maestria di tre figure');memory.patterns=[];}else memory.patterns=patterns;}break;
  case 'due_risposte':if(responding&&winning&&ownShot){memory.counterStreak=store.counterStreak+1;if(memory.counterStreak>=2){add('ether',1,'Doppia previsione');add('boost',step+1,'Doppia previsione');add('hp',step,'Doppia previsione');memory.counterStreak=0;}}else if(responding)memory.counterStreak=0;break;
  case 'tre_classi':if(ownShot){const klass=weaponClassOf(state,side);if(klass){const classes=[...new Set([...memory.classes,klass])];if(classes.length>=3){add('ammo',step+2,'Triade bellica');add('hp',step,'Triade bellica');add('boost',step+1,'Triade bellica');memory.classes=[];}else memory.classes=classes;}}break;
  case 'resistenza_doppia':if(firstNewHit&&hasFigure){memory.hitStreak=store.hitStreak+1;if(memory.hitStreak>=2){add('hp',step+2,'Tenacia del lottatore');add('boost',step+1,'Tenacia del lottatore');add('ammo',step,'Tenacia del lottatore');memory.hitStreak=0;}}else memory.hitStreak=0;break;
  default:break;
 }
 if(ownShot&&suit)memory.previousSuit=suit;
 memory.previousHit=firstNewHit;
 memory.lastResolvedRound=state.round;
 return {store:memory,hp:changed?hp:null,boost:changed?boost:null,ammo:changed?ammo:null,me:changed?me:null};
}
/** Eseguito una sola volta nello scambio, DOPO il vecchio adattatore e il boss.
 * Non altera risultato e gerarchia Poker; eventuali recuperi HP non rianimano.
 */
export function resolvePhase16GPilotExchange(state){
 if(!state?.phase16G||state.phase!==TURN_PHASES.ANIMATE||!state.result?.volleys||state.phase16G.lastResolvedRound===state.round||state.result.phase16GResolved)return state;
 const events=[];let next={...state};const status={...state.phase16G,lastResolvedRound:state.round};
 for(const side of ['player','enemy']){
  const outcome=applySide(next,side,status[side],events);
  status[side]=outcome.store;
  if(outcome.hp)next={...next,hp:outcome.hp,boost:outcome.boost,ammo:outcome.ammo,[side]:outcome.me};
 }
 status.events=events;
 const hp=next.hp;
 return {...next,phase16G:status,winner:hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null,
   result:{...next.result,phase16GResolved:true,phase16GPilotEffects:events},
   history:[...next.history,...events.map(e=>`PILOTA ${PHASE16G_PILOTS[e.pilot]?.name}: ${e.description} +${e.amount} ${e.kind}`)].slice(-20)};
}
