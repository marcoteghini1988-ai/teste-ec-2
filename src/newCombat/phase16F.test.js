import test from 'node:test';
import assert from 'node:assert/strict';
import {TURN_PHASES} from './config.js';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase13CampaignState} from './phase13Campaign.js';
import {initializePhase15} from './phase15LegacyPassives.js';
import {initializePhase16B,exchangePhase16BCards,activatePhase16BDice,markPhase16BReady} from './phase16BCombat.js';
import {initializePhase16C} from './phase16CEpics.js';
import {initializePhase16E} from './phase16EDecks.js';
import {PHASE16F_MODULES,PHASE16F_STANDARD_MODULE_IDS,initializePhase16F,resolvePhase16FExchange,activatePhase16FModule,trackPhase16FPreparation,applyPhase16FDiceCharge,describePhase16FModule} from './phase16FModules.js';
const hand=[{id:'a1',value:1,suit:'hearts'},{id:'a2',value:1,suit:'spades'},{id:'c3',value:3,suit:'diamonds'},{id:'c4',value:4,suit:'clubs'},{id:'c5',value:5,suit:'diamonds'},{id:'c6',value:6,suit:'hearts'},{id:'c7',value:7,suit:'clubs'}];
const deck=Array.from({length:15},(_,i)=>({id:`d${i}`,value:i%13+1,suit:['hearts','diamonds','clubs','spades'][i%4]}));
function game(moduleId='aries',level=1){
 const duel=createPhase6Duel({playerHand:hand,enemyHand:hand.map((c,i)=>({...c,id:`e${i}`})),playerDeck:deck,enemyDeck:deck.map((c,i)=>({...c,id:`ed${i}`})),playerHp:100,enemyHp:100,playerAmmo:{hearts:50,diamonds:50,clubs:50,spades:50}});
 const base=initializePhase16E(initializePhase16C(initializePhase16B(initializePhase15(initializePhase13CampaignState(duel,{planet:1,sector:6}),{deckId:'neutral_starter'}))));
 return initializePhase16F(base,{module:{id:moduleId,level}});
}
function exchange(g,{playerDamage=10,enemyDamage=0,pattern='one_pair',opener='player',winner='attacker',cardCount=2,boostApplied=false,weaponClass='light'}={}){
 return {...g,phase:TURN_PHASES.ANIMATE,result:{opener,responder:opener==='player'?'enemy':'player',winner,volleys:{player:{weaponId:g.arsenal.player[weaponClass],shots:playerDamage>0?2:0,damage:playerDamage,boostApplied},enemy:{weaponId:g.arsenal.enemy.light,shots:enemyDamage>0?2:0,damage:enemyDamage}}},
 moves:{player:{score:pattern?{patternId:pattern}:null,committedCards:pattern?hand.slice(0,cardCount):[]},enemy:{score:null,committedCards:[]}}};
}
const prep=g=>({...g,phase:TURN_PHASES.PREPARE,ready:{player:false,enemy:false}});
test('16F: 33 moduli equipaggiabili, tutte le famiglie e nessuna nuova abilità regalo',()=>{
 assert.equal(PHASE16F_STANDARD_MODULE_IDS.length,33);
 assert.equal(Object.keys(PHASE16F_MODULES).length,35,'i due moduli legacy preesistenti restano supportati');
 for(const [id,m] of Object.entries(PHASE16F_MODULES)){
  assert(m.charge&&m.effect&&m.threshold>=2,`modulo senza specifica: ${id}`);
  assert(describePhase16FModule(id,3)?.includes('Livello 3'));
 }
 assert.equal(game().phase16F.player.id,'aries');
 assert.equal(game('singularity_core').phase16F.player.id,'singularity_core');
 assert.equal(game('ophiuchus').phase16F.player.id,'ophiuchus');
 assert.equal(game('unknown').phase16F.player.id,null);
 assert.equal(game().phase16F.enemy.id,null,'boss/IA non ricevono gratuitamente moduli');
});
test('16F: Ariete si carica con due salve reali; non si duplica lo stesso round',()=>{
 let g=game();g=resolvePhase16FExchange(exchange(g));
 assert.equal(g.phase16F.player.points,1);
 assert.equal(resolvePhase16FExchange(g).phase16F.player.points,1);
 g=resolvePhase16FExchange(exchange({...g,round:2}));
 assert.equal(g.phase16F.player.points,2);assert.equal(g.phase16F.player.ready,true);
 const result=activatePhase16FModule(prep(g));
 assert.equal(result.phase16F.player.activations,1);
 assert.equal(result.phase16F.player.points,0);assert.equal(result.phase16F.player.ready,false);
 assert(result.hp.enemy<g.hp.enemy);
 assert.throws(()=>activatePhase16FModule(result),/non pronto/);
});
test('16F: Toro si carica solo quando subisce una salva',()=>{
 let g=game('taurus');g=resolvePhase16FExchange(exchange(g,{enemyDamage:0}));
 assert.equal(g.phase16F.player.points,0);
 g=resolvePhase16FExchange(exchange({...g,round:2},{playerDamage:0,enemyDamage:10}));
 assert.equal(g.phase16F.player.points,1);
});
test('16F: Vergine si carica solo con risposta Poker vincente',()=>{
 let g=game('virgo');g=resolvePhase16FExchange(exchange(g,{opener:'enemy',winner:'responder'}));
 assert.equal(g.phase16F.player.points,1);
 g=resolvePhase16FExchange(exchange({...g,round:2},{opener:'player',winner:'attacker'}));
 assert.equal(g.phase16F.player.points,1);
});
test('16F: Pesci usa Boost matematico; cambio carta non lo carica',()=>{
 let g=game('pisces');g=resolvePhase16FExchange(exchange(g,{boostApplied:true}));
 assert.equal(g.phase16F.player.points,1);
 g=resolvePhase16FExchange(exchange({...g,round:2}));
 assert.equal(g.phase16F.player.points,1);
});
test('16F: 3 categorie distinte per Mercurio, non tre Coppie',()=>{
 let g=game('planet_char_4');
 for(let i=0;i<3;i++)g=resolvePhase16FExchange(exchange({...g,round:i+1},{pattern:'one_pair'}));
 assert.equal(g.phase16F.player.points,1);
 g=resolvePhase16FExchange(exchange({...g,round:4},{pattern:'straight_4',cardCount:4}));
 assert.equal(g.phase16F.player.points,2);
 g=resolvePhase16FExchange(exchange({...g,round:5},{pattern:'three_of_a_kind',cardCount:3}));
 assert(g.phase16F.player.ready);
});
test('16F: preparazione e cambio hanno cariche differenti e non duplicano PRONTO',()=>{
 let g=game('gemini');g=trackPhase16FPreparation(prep(g),'player','ready');
 assert.equal(g.phase16F.player.points,1);
 assert.equal(trackPhase16FPreparation(g,'player','ready').phase16F.player.points,1);
 g=trackPhase16FPreparation({...g,round:2},'player','ready');assert(g.phase16F.player.ready);
 let s=game('planet_char_3');s=trackPhase16FPreparation(s,'player','swap');
 assert.equal(s.phase16F.player.points,1);
 assert.equal(trackPhase16FPreparation(s,'player','ready').phase16F.player.points,1);
});
test('16F: Dado nero carica il modulo reale senza attivarlo da solo',()=>{
 let g=game('aries');g=applyPhase16FDiceCharge(g,'player');
 assert.equal(g.phase16F.player.points,1);assert.equal(g.phase16F.player.activations,0);
 g=prep(g);g.phase16B.player.diceReady=true;
 g=activatePhase16BDice(g,'player',0);
 assert.equal(g.phase16F.player.ready,true);assert.equal(g.phase16F.player.activations,0);
});
test('16F: Pesca protettiva usa soltanto carte davvero esistenti',()=>{
 let g=prep(game('cancer'));
 g={...g,player:{...g.player,hand:g.player.hand.slice(0,5)},phase16F:{...g.phase16F,player:{...g.phase16F.player,points:5,ready:true}}};
 const after=activatePhase16FModule(g);
 assert.equal(after.player.hand.length,7);
 assert.equal(after.player.deck.length,g.player.deck.length-2);
 assert.deepEqual(after.player.hand.slice(-2),g.player.deck.slice(0,2));
});
test('16F: singolarità, danno e cura limitati agli HP reali',()=>{
 let g=prep(game('singularity_core',6));g={...g,hp:{player:65,enemy:8},phase16F:{...g.phase16F,player:{...g.phase16F.player,points:3,ready:true}}};
 const after=activatePhase16FModule(g);
 assert.equal(after.hp.enemy,0);assert(after.hp.player>g.hp.player);assert(after.hp.player<=100);
 assert.equal(after.phase,TURN_PHASES.FINISHED);
});
test('16F: modulo non può essere usato senza preparazione, anche se pronto',()=>{
 let g=game('aries');g={...g,phase16F:{...g.phase16F,player:{...g.phase16F.player,ready:true,points:2}}};
 assert.throws(()=>activatePhase16FModule(g),/fase/);
});
test('16F: Gemelli prepara davvero il prossimo cambio gratuito (nessun HP o tempo perduto)',()=>{
 let g=prep(game('gemini'));
 g={...g,phase16F:{...g.phase16F,player:{...g.phase16F.player,points:2,ready:true}}};
 g=activatePhase16FModule(g);
 assert(g.phase16F.player.freeSwap);
 const before={...g.hp},enemyHp=g.hp.enemy;
 const after=exchangePhase16BCards(g,'player',[0,1,2]);
 assert.deepEqual(after.hp,before);
 assert.equal(after.hp.enemy,enemyHp);
 assert.equal(after.phase16F.player.freeSwap,false);
 assert.equal(after.preparation.timePenaltySeconds.player,0);
});
test('16F: Sagittario salva da un salto preparazione ma lo scudo si consuma',async()=>{
 const {activatePhase16BMalus}=await import('./phase16BCombat.js');
 let g=prep(game('sagittarius'));
 g={...g,phase16F:{...g.phase16F,player:{...g.phase16F.player,points:2,ready:true}},phase16B:{...g.phase16B,enemy:{...g.phase16B.enemy,malusChoices:['skip_prepare'],malusCharge:3}}};
 g=activatePhase16FModule(g);
 assert(g.phase16F.player.skipShield);
 const blocked=activatePhase16BMalus(g,'enemy','skip_prepare');
 assert.equal(blocked.phase16B.player.skipNextPreparation,false);
 assert.equal(blocked.phase16F.player.skipShield,false);
});
test('16F: i moduli sono separati dalla Fase 16E e sopravvivono a una fase boss',()=>{
 const g=game('aries');
 assert.equal(g.legacyPassives.loadout.deckId,'neutral_starter');
 assert.equal(g.phase16F.player.id,'aries');
 assert.equal(g.phase16F.player.level,1);
});
test('16F: i livelli avanzati danno sinergie senza duplicare carte',()=>{
 let g=prep(game('aries',7));
 g={...g,phase16F:{...g.phase16F,player:{...g.phase16F.player,points:2,ready:true}}};
 const after=activatePhase16FModule(g);
 assert(after.phase16F.player.guard>=2);
 assert.equal(after.player.hand.length,g.player.hand.length);
 assert.equal(after.phase16F.player.activations,1);
});
test('16F: integrazione completa della risoluzione 16B, una carica soltanto per scambio',async()=>{
 const {resolvePhase16BExchange}=await import('./phase16BCombat.js');
 let g=game('aries');
 g=resolvePhase16BExchange(exchange(g));
 assert.equal(g.phase16F.player.points,1);
 assert.equal(resolvePhase16BExchange(g).phase16F.player.points,1);
 g=resolvePhase16BExchange(exchange({...g,round:2}));
 assert.equal(g.phase16F.player.ready,true);
});
test('16F: Vergine interferisce con il Boost anche contro un boss senza modulo',()=>{
 let g=prep(game('virgo'));g={...g,phase16F:{...g.phase16F,player:{...g.phase16F.player,points:2,ready:true}}};
 const next=activatePhase16FModule(g);
 assert.equal(next.phase16B.enemy.boostBlocked,1);
 assert.equal(next.phase16B.enemy.moduleLocked,1);
 assert.equal(next.phase16F.enemy.id,null);
});
