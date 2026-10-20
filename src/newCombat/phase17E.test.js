import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase16F,PHASE16F_MODULES} from './phase16FModules.js';
import {initializePhase16B} from './phase16BCombat.js';
import {phase17EEnemyModule,shouldActivatePhase17EEnemyModule,activatePhase17EEnemyModuleIfReady} from './phase16FModules.js';
import {simulateF17ECredits} from './phase17DEconomy.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {TURN_PHASES} from './config.js';
const sample=(module='aries', ready=true,level=1)=>{
 const duel=initializePhase16B(createPhase6Duel({playerHp:100,enemyHp:100}));
 const g=initializePhase16F(duel,{module:{id:'aries',level:1}},{id:module,level});
 return {...g,phase:TURN_PHASES.PREPARE,ready:{player:false,enemy:false},
  phase16F:{...g.phase16F,enemy:{...g.phase16F.enemy,ready,points:ready?PHASE16F_MODULES[module].threshold:0}}};
};
test('17E: i 120 settori hanno moduli IA reali, senza sblocco prima di S9',()=>{
 let configured=0;
 for(const p of PHASE16A_CAMPAIGN_PLANETS)for(let sector=1;sector<=10;sector++){
  const entry=phase17EEnemyModule(p.id,sector);const global=(p.order-1)*10+sector;
  if(global<9){assert.equal(entry,null);continue;}
  assert(entry);assert(PHASE16F_MODULES[entry.id]);configured++;
  assert(entry.level>=1&&entry.level<=4);
  if(sector===10)assert.equal(entry.id,`planet_char_${p.id}`);
 }
 assert.equal(configured,112);
 assert.equal(phase17EEnemyModule(5,10),null,'Giove legacy non viene travestito da pianeta di campagna');
});
test('17E: inizializzazione IA conserva quella del giocatore e i save precedenti',()=>{
 const fresh=initializePhase16F(createPhase6Duel({}),{module:{id:'taurus',level:3}},{id:'aries',level:2});
 assert.equal(fresh.phase16F.player.id,'taurus');assert.equal(fresh.phase16F.player.level,3);
 assert.equal(fresh.phase16F.enemy.id,'aries');assert.equal(fresh.phase16F.enemy.level,2);
 const legacy=initializePhase16F(createPhase6Duel({}),{module:{id:'aries',level:1}});
 assert.equal(legacy.phase16F.enemy.id,null);
 assert.strictEqual(initializePhase16F(legacy,{},{}),legacy);
});
test('17E: IA attiva un modulo solo se pronto e in preparazione reale',()=>{
 const g=sample(),before=g.hp.player;
 const result=activatePhase17EEnemyModuleIfReady(g);
 assert(result.hp.player<before);assert.equal(result.phase16F.enemy.activations,1);assert.equal(result.phase16F.enemy.ready,false);
 assert.strictEqual(activatePhase17EEnemyModuleIfReady(result),result);
 const attacking={...g,phase:TURN_PHASES.ATTACK};assert.strictEqual(activatePhase17EEnemyModuleIfReady(attacking),attacking);
});
test('17E: nessun attacco modulo se bloccato, preparazione fatta o giocatore KO',()=>{
 const g=sample();
 for(const state of [
  {...g,phase16B:{...g.phase16B,enemy:{...g.phase16B.enemy,moduleLocked:1}}},
  {...g,phase16F:{...g.phase16F,enemy:{...g.phase16F.enemy,locked:1}}},
  {...g,ready:{...g.ready,enemy:true}},
  {...g,hp:{...g.hp,player:0}},
  {...g,phase16F:{...g.phase16F,enemy:{...g.phase16F.enemy,ready:false}}}
 ])assert.strictEqual(activatePhase17EEnemyModuleIfReady(state),state);
});
test('17E: IA non spreca cura a vita piena, né la pesca a mano già piena',()=>{
 let g=sample('taurus');assert(!shouldActivatePhase17EEnemyModule(g));
 g={...g,hp:{...g.hp,enemy:50}};assert(shouldActivatePhase17EEnemyModule(g));
 const healed=activatePhase17EEnemyModuleIfReady(g);assert(healed.hp.enemy>50&&healed.hp.enemy<=100);
 g=sample('cancer');g.enemy={...g.enemy,hand:Array(9).fill({value:2})};assert(!shouldActivatePhase17EEnemyModule(g));
});
test('17E: I moduli IA non conferiscono Epici o alterano salvataggi',()=>{
 const g=sample('planet_char_1');const state=activatePhase17EEnemyModuleIfReady(g);
 assert.equal(state.phase16F.enemy.activations,1);
 assert.equal(state.phase16C?.enemy?.epics?.length||0,0);
 assert(!JSON.stringify(state).includes('epic_item_'));
});
test('17E: audit crediti senza pause non può fingere un percorso gratuito',()=>{
 const s=simulateF17ECredits({normalMinutes:0,bossMinutes:0});
 assert.equal(s.ledger.length,120);assert.equal(s.summary.totalSpentCredits,960);
 assert.equal(s.summary.totalWaitingMinutes,2280);assert.equal(s.summary.firstWaitSector,27);
 assert.equal(s.summary.totalBattleMinutes,0);assert.equal(s.summary.finalCredits,0);
});
test('17E: la ricarica durante il duello riduce le attese, i retry aumentano spesa',()=>{
 const fast=simulateF17ECredits({normalMinutes:4,bossMinutes:9});
 const slow=simulateF17ECredits({normalMinutes:8,bossMinutes:15});
 const retry=simulateF17ECredits({normalMinutes:4,bossMinutes:9,bossRetries:1});
 assert(fast.summary.totalWaitingMinutes>0);
 assert(slow.summary.totalWaitingMinutes<fast.summary.totalWaitingMinutes);
 assert.equal(retry.summary.totalAttempts,132);
 assert.equal(retry.summary.totalSpentCredits,1140);
 assert(retry.summary.totalWaitingMinutes>fast.summary.totalWaitingMinutes);
});
test('17E: no loot casuale inventato, bonus garantiti solo scenario esplicito',()=>{
 const baseline=simulateF17ECredits(),bonused=simulateF17ECredits({bonusCreditsOnWin:5});
 assert.equal(baseline.summary.bonusCreditsGranted,0);
 assert.equal(bonused.summary.bonusCreditsGranted,600);
 assert(bonused.summary.totalWaitingMinutes<baseline.summary.totalWaitingMinutes);
 assert.throws(()=>simulateF17ECredits({bossRetries:-1}));
});
test('17E: l\'interfaccia attiva il Modulo IA e non gli assegna Epici',()=>{
 const view=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 assert.match(view,/phase17EEnemyModule\(battleContext\?\.activeAdventure\?\.planet/);
 assert.match(view,/activatePhase17EEnemyModuleIfReady\(next\)/);
 assert.match(view,/MODULO IA/);
});
