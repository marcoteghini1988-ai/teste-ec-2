import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase6Duel} from './phase6Engine.js';
import {TURN_PHASES} from './config.js';
import {initializePhase15} from './phase15LegacyPassives.js';
import {ARSENAL_48} from './weaponCatalog.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {PHASE16E_DECKS,getPhase16EDeckTraits,describePhase16EDeck,initializePhase16E,
 resolvePhase16EExchange,applyPhase16EExchange,applyPhase16EHandGuard,applyPhase16ERevival} from './phase16EDecks.js';
const light=ARSENAL_48.find(x=>x.weaponClass==='light');
const medium=ARSENAL_48.find(x=>x.weaponClass==='medium');
const card=(id,suit='spades')=>({id,value:9,suit});
function battle(planet,level=3,{playerHp=70,enemyHp=80,playerShot=12,enemyShot=8,
 round=2,phase=TURN_PHASES.ANIMATE,env='normal',weaponId=light.id}={}){
 const duel=createPhase6Duel({playerHp:100,enemyHp:100});
 const payload={...duel,phase,round,hp:{player:playerHp,enemy:enemyHp},initialHp:{player:100,enemy:100},
  campaignEnvironment:{anomaly:env,swapsDisabled:false},
  moves:{player:{committedCards:[card('a')],score:{patternId:'one_pair'}},enemy:{committedCards:[card('e')]}},
  result:{opener:'player',responder:'enemy',winner:'attacker',volleys:{
   player:{shots:playerShot?2:0,damage:playerShot,weaponId,suit:'spades'},
   enemy:{shots:enemyShot?2:0,damage:enemyShot,weaponId:medium.id,suit:'clubs'}
  }}};
 return initializePhase16E(initializePhase15(payload,{deckId:`planet_char_${planet}`,deckLevel:level}));
}
const next=(s,changes={})=>({...s,round:s.round+1,phase:TURN_PHASES.ANIMATE,result:{...s.result,...changes}});

test('16E: dodici mazzi di pianeti attivi, ID originali e testi unici',()=>{
 assert.deepEqual(Object.keys(PHASE16E_DECKS).slice(0,12),PHASE16A_CAMPAIGN_PLANETS.map(p=>p.deck));
 assert.equal(new Set(Object.values(PHASE16E_DECKS).map(x=>x.description)).size,14);
 assert.equal(getPhase16EDeckTraits('neutral_starter'),null);
 assert.equal(initializePhase16E(initializePhase15(createPhase6Duel({}),{deckId:'aries'})).phase16E,undefined);
 for(const p of PHASE16A_CAMPAIGN_PLANETS) assert.match(describePhase16EDeck(p.deck,1),/Livello/);
});
test('16E: Gaia dà HP iniziali; dal livello 3 protegge il primo colpo una sola volta',()=>{
 const a=battle(1,3);assert.equal(a.hp.player,80);assert.equal(a.initialHp.player,110);
 const b=resolvePhase16EExchange(a);assert(b.hp.player>80);assert.equal(b.phase16E.usedShield,true);
 assert.equal(resolvePhase16EExchange(b),b);
 const c=resolvePhase16EExchange(next(b));assert.equal(c.hp.player,b.hp.player);
});
test('16E: Tharsis aumenta danno solo dopo salve successive, azzera la serie se non spara',()=>{
 let a=battle(2,3);let b=resolvePhase16EExchange(a);
 assert.equal(b.hp.enemy,80);assert.equal(b.phase16E.streak,1);
 b=resolvePhase16EExchange(next(b));assert(b.hp.enemy<80);
 const pass=next(b);pass.result={...pass.result,volleys:{...pass.result.volleys,player:{shots:0,damage:0}}};
 b=resolvePhase16EExchange(pass);assert.equal(b.phase16E.streak,0);
});
test('16E: Afrodite guarisce una sola volta per preparazione reale, nessun cambio extra',()=>{
 const a=battle(3,4,{phase:TURN_PHASES.PREPARE,playerHp:66});
 const after={...a,preparation:{...a.preparation,lastAction:{type:'swap'}}};
 const b=applyPhase16EExchange(a,after,'player');
 assert(b.hp.player>66);assert.equal(b.phase16E.lastSwapRound,a.round);
 assert.equal(applyPhase16EExchange(a,b,'player'),b);
 assert.equal(applyPhase16EExchange(a,after,'enemy'),after);
});
test('16E: Crono protegge soltanto dal primo impatto',()=>{
 const a=battle(6,3);const b=resolvePhase16EExchange(a);
 assert(b.hp.player>70);assert.equal(b.phase16E.usedShield,true);
 assert.equal(resolvePhase16EExchange(next(b)).hp.player,b.hp.player);
});
test('16E: Urano protegge solo in un settore effettivamente anomalo',()=>{
 const a=resolvePhase16EExchange(battle(7,3));assert.equal(a.hp.player,70);assert.equal(a.phase16E.usedAnomaly,false);
 const b=resolvePhase16EExchange(battle(7,3,{env:'op_lock_mul'}));assert(b.hp.player>70);assert(b.phase16E.usedAnomaly);
});
test('16E: Nettuno modifica solamente il numero di Jolly reali e non inventa combinazioni',()=>{
 assert.deepEqual(getPhase16EDeckTraits('planet_char_8',1),[{type:'joker_deck_count',count:3}]);
 assert.deepEqual(getPhase16EDeckTraits('planet_char_8',5),[{type:'joker_deck_count',count:4}]);
 assert.deepEqual(getPhase16EDeckTraits('planet_char_8',5),getPhase16EDeckTraits('planet_char_8',9));
});
test('16E: Plutone sacrifica HP senza mai uccidere il proprietario',()=>{
 const a=resolvePhase16EExchange(battle(9,4,{playerHp:20}));assert(a.hp.player<20);assert(a.hp.enemy<80);
 const b=resolvePhase16EExchange(battle(9,4,{playerHp:1}));assert.equal(b.hp.player,1);assert.equal(b.hp.enemy,80);
});
test('16E: Europa riduce il costo Etere ma non produce estrazioni gratuite',()=>{
 assert.deepEqual([1,4,7].map(level=>getPhase16EDeckTraits('planet_char_11',level)[0].cost),[3,2,1]);
});
test('16E: Proxima neutralizza una sola riduzione mano da Malus',()=>{
 const a=battle(14,2);const withMalus={...a,phase16B:{player:{handLimit:5},enemy:{}}};
 const b=applyPhase16EHandGuard(withMalus);assert.equal(b.phase16B.player.handLimit,0);assert(b.phase16E.usedHandGuard);
 const c=applyPhase16EHandGuard({...b,phase16B:{...b.phase16B,player:{handLimit:5}}});
 assert.equal(c.phase16B.player.handLimit,5);
});
test('16E: Haumea ricarica Boost solo dopo classi arma differenti',()=>{
 let a=battle(17,4),b=resolvePhase16EExchange(a);
 assert.equal(b.boost.player.energy,0);
 b=resolvePhase16EExchange(next(b));assert.equal(b.boost.player.energy,0);
 const swapped=next(b);swapped.result={...swapped.result,volleys:{...swapped.result.volleys,player:{...swapped.result.volleys.player,weaponId:medium.id}}};
 b=resolvePhase16EExchange(swapped);assert(b.boost.player.energy>0);
});
test('16E: Io crea ustione per scambi, senza timer; non applica più volte nello stesso scambio',()=>{
 let b=resolvePhase16EExchange(battle(19,3));assert.equal(b.hp.enemy,80);assert(b.phase16E.poisonPending>0);
 b=resolvePhase16EExchange(next(b));assert(b.hp.enemy<80);
 assert.equal(resolvePhase16EExchange(b),b);
});
test('16E: Encelado torna in vita una volta per battaglia e non dopo stato già concluso',()=>{
 let a=battle(20);a={...a,hp:{...a.hp,player:0},winner:'enemy'};
 const b=applyPhase16ERevival(a);assert(b.hp.player>0);assert.equal(b.winner,null);assert(b.phase16E.revived);
 const c=applyPhase16ERevival({...b,hp:{...b.hp,player:0}});assert.equal(c.hp.player,0);
 assert.equal(applyPhase16ERevival({...a,phase:TURN_PHASES.FINISHED}).hp.player,0);
});

test('16E integrazione: il Malus mano ridotta non elimina carte grazie a Proxima, ma solo una volta',async()=>{
 const {renewGoldenCards}=await import('./phase16BCombat.js');
 let b=battle(14,4,{phase:TURN_PHASES.ATTACK});
 const hand=Array.from({length:7},(_,i)=>({id:`hand${i}`,suit:'hearts',value:i+1}));
 b={...b,player:{...b.player,hand},phase16B:{player:{handLimit:5},enemy:{handLimit:0}}};
 const saved=renewGoldenCards(b);
 assert.equal(saved.player.hand.length,7);assert(saved.phase16E.usedHandGuard);
 const next=renewGoldenCards({...saved,phase16B:{...saved.phase16B,player:{handLimit:5}}});
 assert.equal(next.player.hand.length,5);
});
test('16E integrazione: lo scontro completo applica rinascita di Encelado dopo eventi 16B e 16C',async()=>{
 const {initializePhase16B,resolvePhase16BExchange}=await import('./phase16BCombat.js');
 const {initializePhase16C}=await import('./phase16CEpics.js');
 let a=battle(20,3,{playerHp:0,phase:TURN_PHASES.ANIMATE});
 a=initializePhase16C(initializePhase16B(a));
 a={...a,winner:'enemy',result:{...a.result,phase16EResolved:true}};
 const b=resolvePhase16BExchange(a);
 assert(b.hp.player>0 && b.phase16E.revived && b.winner===null);
});

test('16E: due mazzi esclusivi mantengono ID e sblocchi originali senza vecchi timer',()=>{
 assert.equal(Object.keys(PHASE16E_DECKS).length,14);
 for(const id of ['ophiuchus','supreme_eclipse']){assert.deepEqual(getPhase16EDeckTraits(id,3),[]);assert(describePhase16EDeck(id));}
 const o=resolvePhase16EExchange({...battle(1),phase16E:{...battle(1).phase16E,id:'ophiuchus'}});
 assert(o.phase16E);
});
