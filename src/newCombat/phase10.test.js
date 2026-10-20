import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditPhase10Duel, createPhase10Handoff } from './phase10Audit.js';
import { createPhase6Duel, finishPhase6Animation, expirePhase6Preparation } from './phase6Engine.js';
import { commitPhase5Move } from './phase5Engine.js';
import { planPhase9Attack, planPhase9Preparation, executePhase9Preparation } from './phase9AI.js';
import { TURN_PHASES } from './config.js';

const suits=['hearts','diamonds','clubs','spades'];
const ammo={hearts:20,diamonds:20,clubs:20,spades:20};
const cards=(prefix,ranks)=>ranks.map((value,i)=>({id:`${prefix}${i}`,value,suit:suits[i%4]}));
const duel=opts=>createPhase6Duel({playerHand:cards('p',[8,8,5,6,10,11,12]),enemyHand:cards('e',[7,7,2,4,9,10,13]),playerDeck:cards('pd',[2,4,8,9]),enemyDeck:cards('ed',[5,7,10,11]),playerAmmo:ammo,enemyAmmo:ammo,ether:4,...opts});

test('F10: snapshot valido, nessuna duplicazione di carte e risorse sane',()=>{
 const g=duel();const before=JSON.stringify(g);
 const check=auditPhase10Duel(g);
 assert.equal(check.ok,true,check.errors.join('; '));
 assert.equal(check.cardCount,22);
 assert.equal(JSON.stringify(g),before,'L’audit non modifica il duello');
});
test('F10: blocco ID duplicati in mano/mazzo e HP negativi',()=>{
 const g=duel();
 const broken={...g,hp:{...g.hp,enemy:-3},enemy:{...g.enemy,hand:[{...g.player.hand[0]}]}};
 const check=auditPhase10Duel(broken);
 assert.equal(check.ok,false);
 assert.ok(check.errors.some(e=>e.includes('Carta duplicata')));
 assert.ok(check.errors.some(e=>e.includes('HP negativi')));
});
test('F10: il risultato non può sbloccare ricompense da una partita in corso',()=>{
 const g=duel();const handoff=createPhase10Handoff(g,{gameMode:'adventure',activeAdventure:{planet:1,level:1}});
 assert.equal(handoff.ok,false);
 assert.match(handoff.reason,/non è ancora terminato/);
});
test('F10: handoff a partita finita è read-only e non scrive progressi',()=>{
 const original=duel();const g={...original,phase:TURN_PHASES.FINISHED,winner:'player'};
 const before=JSON.stringify(g);
 const check=createPhase10Handoff(g,{gameMode:'adventure',activeAdventure:{planet:5,level:10}});
 assert.equal(check.ok,true);
 assert.equal(check.report.outcome,'player');assert.equal(check.report.isBoss,true);
 assert.equal(check.report.planet,5);assert.equal(check.report.sector,10);
 assert.equal(check.canCommitCampaign,false);assert.equal(check.canAwardRewards,false);
 assert.equal(JSON.stringify(g),before);
});
test('F10: un incontro PvP di rete non può creare handoff locale',()=>{
 const g={...duel(),phase:TURN_PHASES.FINISHED,winner:'enemy'};
 const result=createPhase10Handoff(g,{gameMode:'pvp',hasNetworkOpponent:true});
 assert.equal(result.ok,false);assert.match(result.reason,/server/);
});
test('F10: dopo doppio PASSA il computer investe almeno un cambio legale',()=>{
 let g=duel({playerHand:cards('p',[3,5,7,9,11,13,2]),enemyHand:cards('e',[2,4,6,8,10,12,1])});
 g=commitPhase5Move(g,'player',[],true);g=commitPhase5Move(g,'enemy',[],true);
 g=finishPhase6Animation(g);
 const plan=planPhase9Preparation(g,'enemy');
 assert.equal(plan.swap.length,1);
 const next=executePhase9Preparation(g,'enemy');
 assert.ok(next.preparation.statistics.enemy.swaps>=1);
 assert.equal(next.preparation.statistics.player.swaps,0);
 assert.equal(next.ready.player,false);
 assert.equal(next.ready.enemy,true);
});

test('F10: 16 duelli end-to-end finiscono senza stallo e mantengono invarianti',()=>{
 const newDeck=(seed,prefix)=>{
  let x=seed;const deck=[];
  for(let i=0;i<52;i++) deck.push({id:`${prefix}${i}`,value:1+Math.floor(i/4),suit:suits[i%4]});
  for(let i=51;i>0;i--){x=(x*1664525+1013904223)>>>0;const j=x%(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
 };
 for(let k=0;k<16;k++) {
  const p=newDeck(k+1,`a${k}-`),e=newDeck(k+500,`b${k}-`);
  let g=createPhase6Duel({playerHand:p.splice(0,7),playerDeck:p,enemyHand:e.splice(0,7),enemyDeck:e,
   playerAmmo:ammo,enemyAmmo:ammo,playerHp:90,enemyHp:90,ether:4});
  let actions=0;
  while(g.phase!==TURN_PHASES.FINISHED && actions++<120) {
   if([TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(g.phase)) {
     const side=g.actor;
     const move=planPhase9Attack(g,side,{maxEvaluations:250});
     g=commitPhase5Move(g,side,move?.placements||[],!move,move?.weaponId,move?.boost||null);
   } else if(g.phase===TURN_PHASES.ANIMATE) g=finishPhase6Animation(g);
   else if(g.phase===TURN_PHASES.PREPARE) {
     g=executePhase9Preparation(g,'enemy');g=expirePhase6Preparation(g,35);
   } else assert.fail(`Fase non prevista: ${g.phase}`);
   const integrity=auditPhase10Duel(g);
   assert.ok(integrity.ok,`Seed ${k} azione ${actions}: ${integrity.errors.join(', ')}`);
  }
  assert.equal(g.phase,TURN_PHASES.FINISHED,`Seed ${k} bloccato allo scambio ${g.round}`);
 }
});
test('F10: UI verifica risultato e mostra solo resoconto non monetizzabile',()=>{
 const ui=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert.match(ui,/createPhase10Handoff/);assert.match(ui,/nessun premio o avanzamento registrato/);
 assert.match(app,/initialPlayerHp=\{playerHp\}/);assert.match(app,/initialEnemyHp=\{aiHp\}/);
});
