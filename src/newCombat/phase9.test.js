import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createPhase6Duel, finishPhase6Animation, exchangePhase6Cards } from './phase6Engine.js';
import { commitPhase5Move } from './phase5Engine.js';
import { getPhase9CandidateMoves, planPhase9Attack, planPhase9Preparation, executePhase9Preparation } from './phase9AI.js';
import { describePhase9Battle, validatePhase9BattleLaunch } from './phase10Audit.js';
import { TURN_PHASES } from './config.js';
import { getPhase4MoveOptions } from './phase4Engine.js';
import { comparePokerScores } from './pokerRules.js';
const suit=['hearts','diamonds','spades','clubs'];
const cards=(prefix,values)=>values.map((value,i)=>({id:`${prefix}${i}`,value,suit:suit[i%4]}));
const ammo={hearts:90,diamonds:90,spades:90,clubs:90};
const create=(params={})=>createPhase6Duel({playerHand:cards('p',[7,7,2,3,5,9,10]),enemyHand:cards('e',[8,8,1,4,6,11,13]),playerAmmo:ammo,enemyAmmo:ammo,playerDeck:cards('pd',[4,10,13,1]),enemyDeck:cards('ed',[2,3,12,7]),ether:8,...params});

test('F9 AI: produce mossa valida e rispetta il banco vuoto a 4 carte',()=>{
 const g=create({opener:'enemy'});
 const before=JSON.stringify(g);
 const move=planPhase9Attack(g,'enemy');
 assert.ok(move,'Il computer deve trovare almeno una coppia');
 assert.equal(move.placements.length,4);
 assert.deepEqual(move.placements.map(p=>p.slot).sort(),[0,1,2,3]);
 assert.ok(getPhase4MoveOptions(g,'enemy',move.placements).some(x=>x.canFire&&x.weaponId===move.weaponId));
 assert.equal(JSON.stringify(g),before,'Nessuna mutazione dello stato');
});
test('F9 AI: scelta deterministica sulla stessa mano e banco, senza casualità artificiale',()=>{
 const g=create({opener:'enemy'});
 const a=planPhase9Attack(g,'enemy');const b=planPhase9Attack(g,'enemy');
 assert.deepEqual(a,b);
});
test('F9 AI: risposta usa la combinazione avversaria già visibile per provare a superarla',()=>{
 let g=create({playerHand:cards('p',[7,7,2,3,4,10,12]),enemyHand:cards('e',[8,8,1,3,9,10,13])});
 g=commitPhase5Move(g,'player',g.player.hand.slice(0,4).map((card,slot)=>({card,slot})),false,'es_common_light_01');
 assert.equal(g.phase,TURN_PHASES.RESPONSE);
 const chosen=planPhase9Attack(g,'enemy');
 assert.ok(chosen);
 assert.ok(comparePokerScores(chosen.choice.score,g.moves.player.score)>0,'Almeno coppia di 8 contro coppia di 7');
 const next=commitPhase5Move(g,'enemy',chosen.placements,false,chosen.weaponId,chosen.boost||null);
 assert.equal(next.result.winner,'responder');
});
test('F9 AI: non usa Boost quando sa già di perdere o pareggiare il confronto',()=>{
 let g=create({playerHand:cards('p',[13,13,1,4,6,10,11]),enemyHand:cards('e',[8,8,2,4,3,11,12]),enemyBoostEnergy:45});
 g=commitPhase5Move(g,'player',g.player.hand.slice(0,4).map((card,slot)=>({card,slot})),false,'es_common_light_01');
 const picked=planPhase9Attack(g,'enemy');
 assert.ok(picked);
 if(comparePokerScores(picked.choice.score,g.moves.player.score)<=0) assert.equal(picked.boost,undefined);
});
test('F9 AI: carta mai inventata e mossa senza accesso a mano e mazzo nascosti',()=>{
 const g=create({opener:'enemy'});
 const hidden={...g,player:{...g.player,hand:new Proxy([],{get(){throw Error('Mano avversaria letta');}}),deck:new Proxy([],{get(){throw Error('Mazzo avversario letto');}})}};
 const move=planPhase9Attack(hidden,'enemy');
 assert.ok(move);
 for(const p of move.placements) assert.ok(g.enemy.hand.some(c=>c.id===p.card.id));
});
test('F9 AI: passa quando il turno non è suo o non c’è una combinazione possibile',()=>{
 const g=create();
 assert.equal(planPhase9Attack(g,'enemy'),null);
 const empty=create({opener:'enemy',enemyHand:[]});
 assert.equal(getPhase9CandidateMoves(empty,'enemy').length,0);
 assert.equal(planPhase9Attack(empty,'enemy'),null);
});
test('F9 AI: preparazione usa le penalità vere e termina con PRONTO senza bloccare avversario',()=>{
 let g=create();
 g=commitPhase5Move(g,'player',[],true);
 g=commitPhase5Move(g,'enemy',[],true);
 g=finishPhase6Animation(g);
 assert.equal(g.phase,TURN_PHASES.PREPARE);
 const plan=planPhase9Preparation(g,'enemy');
 assert.ok(Array.isArray(plan.swap));
 const snapshot=JSON.stringify(g);
 const next=executePhase9Preparation(g,'enemy');
 assert.equal(JSON.stringify(g),snapshot);
 assert.equal(next.ready.enemy,true);
 assert.equal(next.ready.player,false);
 assert.equal(next.preparation.timePenaltySeconds.player,0);
 assert.ok(next.preparation.statistics.enemy.swaps<=2);
});
test('F9 AI: Etere legge il proprio mazzo solo durante l’acquisto mirato e non spende a caso',()=>{
 let g=create();g=commitPhase5Move(g,'player',[],true);g=commitPhase5Move(g,'enemy',[],true);g=finishPhase6Animation(g);
 const hand=cards('test',[8,8,3,4,9]);const desired={id:'inDeck8',value:8,suit:'spades'};
 g={...g,enemy:{...g.enemy,hand,deck:[desired,...cards('extra',[6,7])],ether:8,exchangesLeft:0}};
 const plan=planPhase9Preparation(g,'enemy');
 assert.equal(plan.ether.deckIndex,0);
 const next=executePhase9Preparation(g,'enemy');
 assert.equal(next.enemy.ether,8-4);
 assert.ok(next.enemy.hand.some(c=>c.id==='inDeck8'));
});
test('F9 AI: penalità reali non vengono duplicate da preparazione',()=>{
 let g=create();g=commitPhase5Move(g,'player',[],true);g=commitPhase5Move(g,'enemy',[],true);g=finishPhase6Animation(g);
 const swapped=exchangePhase6Cards(g,'enemy',[0,1]);
 const next=executePhase9Preparation(swapped,'enemy');
 assert.equal(next.preparation.timePenaltySeconds.enemy,3,'I cambi da una carta non sottraggono altri secondi');
});
test('F9 adattatore: riconosce campagna, boss e sfida senza scrivere progressi',()=>{
 const normal=describePhase9Battle({gameMode:'adventure',activeAdventure:{planet:7,level:4}});
 assert.equal(normal.label,'Campagna · Pianeta 7 · Settore 4');
 assert.equal(normal.isBoss,false);
 const boss=describePhase9Battle({gameMode:'adventure',activeAdventure:{planet:7,level:10}});
 assert.equal(boss.isBoss,true);
 assert.equal(boss.writesCampaignProgress,false);
 assert.equal(boss.awardsRewards,false);
 assert.equal(describePhase9Battle({gameMode:'daily_challenge'}).mode,'daily_challenge');
 assert.equal(describePhase9Battle({gameMode:'pve',bettingTier:4}).bettingTier,4);
});
test('F9 adattatore: PvP reale esplicitamente bloccato senza server autorevole',()=>{
 const pvp=describePhase9Battle({gameMode:'pvp',hasNetworkOpponent:true});
 assert.equal(pvp.previewAllowed,false);
 assert.equal(pvp.networkAuthoritative,true);
 assert.equal(validatePhase9BattleLaunch(pvp).ok,false);
 assert.equal(validatePhase9BattleLaunch(describePhase9Battle({gameMode:'training'})).ok,true);
});
test('F9 AI: a banco pieno valuta anche le mosse da quattro carte e trova un Poker',()=>{
 const board=cards('board',[2,3,5,7,9]);
 const g=create({opener:'enemy',board,enemyHand:cards('e',[13,13,13,13,4,6,8])});
 const move=planPhase9Attack(g,'enemy',{maxEvaluations:2400});
 assert.ok(move);
 assert.equal(move.choice.score.patternId,'four_of_a_kind');
 assert.equal(move.placements.length,4);
});
test('F9 interfaccia: usa planner strategico e conserva le protezioni PvP esistenti',()=>{
 const ui=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert.match(ui,/planPhase9Attack\(s,'enemy'/);
 assert.match(ui,/executePhase9Preparation\(next,'enemy'\)/);
 assert.match(ui,/modeDescription\.label/);
 assert.match(app,/!isRealPvP && <div/);
 assert.match(app,/FASE 10 · COLLAUDO COMPLETO/);
});
