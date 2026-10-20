/** F17P: test di congelamento della versione di bilanciamento candidato.
 * Le durate sono massimi di scelta, mai turni fissi o salve imposte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHASE_MAX_SECONDS,BOARD_SLOT_COUNT,MAX_PLACED_CARDS_PER_ACTION} from './config.js';
import {getPhase3Time} from './phase3Engine.js';
import {createPhase13Environment,getPhase13Time,getPhase13BossPhases} from './phase13Campaign.js';
import {ARSENAL_48} from './weaponCatalog.js';
import {F17F_CAMPAIGN_TUNING,phase17EnemyHp,phase17EnemyDamageScale,phase17Features} from './phase17Balance.js';
import {getPhase6RemainingSeconds} from './phase6Engine.js';

const testState={phase:'prepare',ready:{player:false,enemy:false},preparation:{timePenaltySeconds:{player:3,enemy:0}}};
test('17P: tre fasi 25/25/35, senza timer in animazione',()=>{
 assert.deepEqual(PHASE_MAX_SECONDS,{attack:25,response:25,prepare:35});
 for(const [phase,value] of [['attack',25],['response',25],['prepare',35],['animate',null]])
  assert.equal(getPhase3Time(phase),value);
});
test('17P: campagna normale e boss usano il tempo pieno per decidere',()=>{
 for(const modifier of ['standard','boss_combined','no_pass']){
  const env=createPhase13Environment({planet:2,sector:10,modifier});
  assert.equal(env.attackSeconds,25);assert.equal(env.responseSeconds,25);assert.equal(env.preparationSeconds,35);
 }
 assert.equal(getPhase13BossPhases(2,10),1);
});
test('17P: il campo rapido mantiene la propria identita senza comprimere la preparazione',()=>{
 const env=createPhase13Environment({planet:2,sector:3,modifier:'fast_timer'});
 assert.equal(env.attackSeconds,20);assert.equal(env.responseSeconds,20);assert.equal(env.preparationSeconds,35);
 assert.equal(getPhase13Time({phase:'attack',campaignEnvironment:env}),20);
 assert.equal(getPhase13Time({phase:'prepare',campaignEnvironment:env}),35);
});
test('17P: i tre tempi di default vengono letti anche senza modificatori',()=>{
 for(const [phase,value] of [['attack',25],['response',25],['prepare',35],['animate',null]])
  assert.equal(getPhase13Time({phase}),value);
});
test('17P: penalita dei cambi sottratta soltanto dal timer personale',()=>{
 assert.equal(getPhase6RemainingSeconds(testState,'player',10),22);
 assert.equal(getPhase6RemainingSeconds(testState,'enemy',10),25);
 assert.equal(getPhase6RemainingSeconds(testState,'player',32.1),0);
 assert.equal(getPhase6RemainingSeconds(testState,'enemy',32.1),3);
});
test('17P: 7 in mano, 5 nel banco e 4 carte impegnabili senza nuove figure facili per le Pesanti',()=>{
 assert.equal(BOARD_SLOT_COUNT,5);assert.equal(MAX_PLACED_CARDS_PER_ACTION,4);
 const heavies=ARSENAL_48.filter(w=>w.weaponClass==='heavy');
 assert.equal(ARSENAL_48.length,48);assert.equal(heavies.length,16);
 for(const w of heavies){
  assert(w.allowedPokerPatterns.includes(w.secondaryActivationPattern));
  assert(!w.allowedPokerPatterns.includes('one_pair')&&!w.allowedPokerPatterns.includes('two_pair'),w.id);
 }
});
test('17P: la curva PvE e le caratteristiche Poker restano preservate',()=>{
 assert.equal(F17F_CAMPAIGN_TUNING.normalHpFactor,.9);
 assert.equal(F17F_CAMPAIGN_TUNING.bossHpFactor,1.5);
 assert(phase17EnemyHp(2,10)>phase17EnemyHp(2,9));
 assert(phase17EnemyDamageScale(2,10)<phase17EnemyDamageScale(2,9));
 assert.equal(phase17Features(3,1).allowHeavy,true);
});
test('17P: interfaccia allinea l inizializzazione del cronometro con i timer globali',()=>{
 const ui=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 assert(ui.includes('useState(PHASE_MAX_SECONDS.attack)'));
 assert(ui.includes('getPhase6RemainingSeconds(active'));
 assert(ui.includes('getPhase13Time(current.current)'));
});
