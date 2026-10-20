import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase6Duel} from './phase6Engine.js';
import {TURN_PHASES} from './config.js';
import {createPhase12CampaignTactics,resolvePhase12CampaignExchange} from './phase12CampaignAbilities.js';
import {PHASE16A_CAMPAIGN_PLANET_IDS} from './phase16ACatalog.js';
import {PHASE16D_BOSS_PROFILES,getPhase16DBossBrief,resolvePhase16DBossExchange} from './phase16DBosses.js';
import {advancePhase13BossIfNeeded} from './phase13Campaign.js';
const card=(id,suit)=>({id,value:10,suit});
function battle(planet,{
 pCards=[card('p1','hearts'),card('p2','diamonds')],
 eCards=[card('e1','spades'),card('e2','clubs')],
 playerHp=70,enemyHp=65,playerBoost=14,enemyBoost=0,
 bossWins=true,pShot=10,eShot=8,bossPhase=1,playerDiscard=[],
 bossMemory=undefined
}={}){
 const d=createPhase6Duel({playerHp:100,enemyHp:100});
 return {...d,phase:TURN_PHASES.ANIMATE,round:3,hp:{player:playerHp,enemy:enemyHp},
  initialHp:{player:100,enemy:100},
  player:{...d.player,discard:playerDiscard},
  boost:{player:{...d.boost.player,energy:playerBoost},enemy:{...d.boost.enemy,energy:enemyBoost}},
  ammo:{player:{...d.ammo.player},enemy:{...d.ammo.enemy}},
  bossMemory,
  campaignBossTrack:{planet,sector:10,current:bossPhase,max:planet===20?4:planet===17?3:[11,14].includes(planet)?2:1,cleared:bossPhase-1},
  campaignTactics:createPhase12CampaignTactics({planet,sector:10,bossPhase,playerPilotId:'pilot_com_3',enemyPilotId:`pilot_sentinel_${planet}`}),
  moves:{player:{committedCards:pCards},enemy:{committedCards:eCards}},
  result:{opener:'player',responder:'enemy',winner:bossWins?'responder':'attacker',volleys:{player:{shots:pShot?2:0,damage:pShot,suit:'hearts'},enemy:{shots:eShot?2:0,damage:eShot,suit:'spades'}}}
 };
}
const resolve=state=>resolvePhase12CampaignExchange(state);
const effects=s=>s.result.phase16DBossEffects;

test('16D: dodici boss solo nei pianeti attivi; nessuna rinumerazione per i salvataggi',()=>{
 assert.deepEqual(Object.keys(PHASE16D_BOSS_PROFILES).map(Number),PHASE16A_CAMPAIGN_PLANET_IDS);
 assert.equal(new Set(Object.values(PHASE16D_BOSS_PROFILES).map(b=>b.ability)).size,12);
 for(const planet of PHASE16A_CAMPAIGN_PLANET_IDS){
  const g=battle(planet);assert.equal(getPhase16DBossBrief(g).planet,planet);
  const a=resolve(g);assert.equal(a.result.phase16DBossResolved,true);
  assert.equal(a.result.campaignAbilitiesResolved,true);
  assert.strictEqual(resolve(a),a,'un boss non può risolvere due volte lo stesso scambio');
  assert.deepEqual(a.moves,g.moves,'i boss non modificano le carte o i risultati Poker');
 }
 assert.equal(getPhase16DBossBrief(battle(4)),null,'un boss rimosso resta fuori dalla campagna');
});
test('16D: Gaia riduce un primo colpo, ma tre semi diversi spezzano la corazza',()=>{
 const intact=resolve(battle(1));
 assert(intact.hp.enemy>65);assert.equal(intact.bossMemory.phase16D.shieldUsed,true);
 const broken=resolve(battle(1,{pCards:[card('p1','hearts'),card('p2','diamonds'),card('p3','clubs')]}));
 assert.equal(broken.hp.enemy,65);assert.match(effects(broken)[0].description,/spezzata/);
 const next=resolve(battle(1,{bossMemory:intact.bossMemory}));assert.equal(next.hp.enemy,65);
});
test('16D: Marte cresce solo con vittorie del boss e si interrompe se perde',()=>{
 let g=resolve(battle(2));assert.equal(g.hp.player,68);
 g=resolve(battle(2,{bossMemory:g.bossMemory}));assert.equal(g.hp.player,66);
 g=resolve(battle(2,{bossMemory:g.bossMemory,bossWins:false}));assert.equal(g.hp.player,70);
 assert.equal(g.bossMemory.phase16D.streak,0);
});
test('16D: Venere avvelena nel prossimo scambio senza utilizzare i timer',()=>{
 const g=resolve(battle(3));assert.equal(g.pilotStatus.poison.player,3);
 assert(effects(g).some(e=>e.kind==='status'));
});
test('16D: Saturno guadagna risorse solo vincendo come rispondente',()=>{
 const g=resolve(battle(6));assert.equal(g.boost.enemy.energy,5);
 const no=resolve(battle(6,{bossWins:false}));assert.equal(no.boost.enemy.energy,0);
});
test('16D: Urano ruba Boost reale e non oltrepassa il serbatoio',()=>{
 const g=resolve(battle(7,{playerBoost:14}));assert.equal(g.boost.player.energy,8);assert(g.boost.enemy.energy>=6);
 const no=resolve(battle(7,{playerBoost:0,pShot:0}));assert.equal(no.boost.player.energy,0);
});
test('16D: Nettuno finalizza solo il giocatore con HP bassi',()=>{
 const low=resolve(battle(8,{playerHp:35}));assert.equal(low.hp.player,27);
 const high=resolve(battle(8,{playerHp:65}));assert.equal(high.hp.player,65);
});
test('16D: Plutone paga HP propri per il colpo cremisi',()=>{
 const g=resolve(battle(9,{eCards:[card('e1','hearts'),card('e2','diamonds')]}));
 assert.equal(g.hp.enemy,60);assert.equal(g.hp.player,61);
 const no=resolve(battle(9,{eCards:[card('e1','clubs')]}));assert.equal(no.hp.enemy,65);
});
test('16D: Europa rigenera ma il seme Cuori contrasta il potere',()=>{
 const healed=resolve(battle(11,{pCards:[card('p1','spades')]}));assert.equal(healed.hp.enemy,71);
 const blocked=resolve(battle(11,{pCards:[card('p1','hearts')]}));assert.equal(blocked.hp.enemy,65);
});
test('16D: Proxima carica il reattore su tre salve, poi lo azzera',()=>{
 let g=resolve(battle(14));assert.equal(g.bossMemory.phase16D.charge,4);
 g=resolve(battle(14,{bossMemory:g.bossMemory}));assert.equal(g.bossMemory.phase16D.charge,8);
 g=resolve(battle(14,{bossMemory:g.bossMemory}));assert.equal(g.bossMemory.phase16D.charge,0);
 assert.equal(g.hp.player,58);
 assert.match(getPhase16DBossBrief(g).status,/0\/12/);
});
test('16D: Haumea agisce soltanto sugli scarti esistenti',()=>{
 const cards=Array.from({length:8},(_,i)=>card(`d${i}`,'spades'));
 const g=resolve(battle(17,{playerDiscard:cards}));assert.equal(g.hp.player,65);assert(g.boost.enemy.energy>=4);
 const no=resolve(battle(17));assert.equal(no.hp.player,70);
});
test('16D: Io alterna carica, eruzione, raffreddamento e torna all’inizio',()=>{
 let g=resolve(battle(19));assert.equal(g.bossMemory.phase16D.cycle,1);assert.equal(g.bossMemory.phase16D.charge,6);
 g=resolve(battle(19,{bossMemory:g.bossMemory}));assert.equal(g.hp.player,64);assert.equal(g.bossMemory.phase16D.cycle,2);
 g=resolve(battle(19,{bossMemory:g.bossMemory}));assert.equal(g.hp.player,70);assert.equal(g.bossMemory.phase16D.cycle,0);
});
test('17: Encelado cambia seme con le anomalie senza cambiare HP',()=>{
 const active=resolve(battle(20));assert.equal(active.hp.player,63);
 const blocked=resolve(battle(20,{pCards:[card('p1','spades'),card('p2','hearts')]}));
 assert.equal(blocked.hp.player,70);assert.equal(blocked.boost.player.energy,17);
 const nextPhase=resolve({...battle(20,{eCards:[card('e1','spades')]}),phase17Anomalies:{triggered:1}});assert.equal(nextPhase.hp.player,70);
 assert.match(getPhase16DBossBrief({...battle(20),phase17Anomalies:{triggered:1}}).status,/Cuori/);
});
test('F17: boss sconfitto non attiva abilità postume né ricarica la barra',()=>{
 const dead=resolve(battle(14,{enemyHp:0}));
 assert.equal(dead.hp.enemy,0);assert.equal(effects(dead).length,0);
 const mid=battle(20,{bossMemory:{phase16D:{cycle:2,charge:10}}});
 const next=advancePhase13BossIfNeeded({...mid,winner:'player'});
 assert.strictEqual(next.winner,'player');
 assert.equal(next.campaignBossTrack.current,1);
 assert.deepEqual(next.bossMemory,mid.bossMemory);
});
test('16D: solo i boss ricevono abilità 16D, i settori ordinari e il PvP non le ricevono',()=>{
 const g=battle(1);
 assert.strictEqual(resolvePhase16DBossExchange({...g,campaignTactics:{...g.campaignTactics,sector:9}}).result,g.result);
 const outside={...g,campaignTactics:null};assert.strictEqual(resolvePhase16DBossExchange(outside),outside);
});
