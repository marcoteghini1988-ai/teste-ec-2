import test from 'node:test';
import assert from 'node:assert/strict';
import { ARSENAL_48 } from './newCombat/weaponCatalog.js';
import { createDailyPokerConfig, createDailyPokerDeck, createDailyPokerArmory, buildDailyPokerResult, isDailyPokerDate, DAILY_POKER_RULESET } from './dailyPokerChallenge.js';
import { generateDailyChallengeConfig, generateDailyGhostLeaderboard } from './dailyChallengeEngine.js';
import { normalizePhase7Armory } from './newCombat/phase7Armory.js';

test('F17R: due telefoni con la stessa data ricevono lo stesso assetto quotidiano',()=>{
  const first=generateDailyChallengeConfig('2026-10-16');
  assert.equal(first.ruleset,DAILY_POKER_RULESET);
  assert.equal(first.mode,'poker');
  assert.deepEqual(first,generateDailyChallengeConfig('2026-10-16'));
  assert.equal(first.attackSeconds,25);
  assert.equal(first.responseSeconds,25);
  assert.equal(first.preparationSeconds,35);
});
test('F17R: un mese di sfide usa 3 armi vere, con livello e slot validi',()=>{
  for(let day=16;day<=31;day++)for(const month of [10,11]){
    const date=`2026-${month}-${String(Math.min(day,28)).padStart(2,'0')}`;
    const config=createDailyPokerConfig(date);
    for(const [cls,id] of Object.entries(config.assignedWeapons)){
      assert.ok(ARSENAL_48.some(w=>w.id===id&&w.weaponClass===cls));
      assert.equal(normalizePhase7Armory(createDailyPokerArmory(config)).equipped[cls],id);
    }
    assert.ok(config.playerHp>0&&config.aiHp>config.playerHp);
  }
});
test('F17R: stessi mazzi e carte iniziali su client indipendenti',()=>{
  for(const side of ['player','enemy']){
    const a=createDailyPokerDeck('2026-10-16',side);
    const b=createDailyPokerDeck('2026-10-16',side);
    assert.deepEqual(a,b);
    assert.equal(a.length,52);
    assert.equal(new Set(a.map(card=>card.id)).size,52);
    assert.equal(new Set(a.map(card=>card.suit+card.value)).size,52);
    assert.ok(a.every(card=>card.isJoker===false));
  }
  assert.notDeepEqual(createDailyPokerDeck('2026-10-16','player'),createDailyPokerDeck('2026-10-17','player'));
});
test('F17R: la sfida non dipende da inventario, pilota o crediti personali',()=>{
  const a=createDailyPokerConfig('2026-10-17');
  const armory=createDailyPokerArmory(a);
  assert.equal(Object.keys(armory.owned).length,3);
  assert.equal(armory.levels[a.assignedWeapons.heavy],a.weaponLevel);
  assert.equal(a.noCampaignRewards,true);
  assert.throws(()=>createDailyPokerArmory({...a,assignedWeapons:{...a.assignedWeapons,heavy:a.assignedWeapons.light}}));
});
test('F17R: il report deriva soltanto da esito, HP, tempo e scambi reali',()=>{
  const cfg=createDailyPokerConfig('2026-10-16');
  const result=buildDailyPokerResult(cfg,{winner:'player',round:6,hp:{player:100,enemy:0}},
    {elapsedMs:225000},new Date('2026-10-16T12:00:00Z'));
  assert.equal(result.victory,true);
  assert.equal(result.turns,5);
  assert.equal(result.timeElapsedMs,225000);
  assert.equal(result.remainingHpPct,100/cfg.playerHp);
  assert.equal(result.forDate,cfg.dateStr);
  assert.throws(()=>buildDailyPokerResult(cfg,{winner:null,round:5,hp:{player:100}}, {elapsedMs:225000}));
});
test('F17R: le classifiche IA Poker hanno tempi coerenti e riproducibili',()=>{
  const a=generateDailyGhostLeaderboard('2026-10-16');
  const b=generateDailyGhostLeaderboard('2026-10-16');
  assert.deepEqual(a,b);
  assert.equal(a.length,150);
  assert.ok(a.every(bot=>bot.turns>=4 && bot.timeElapsedMs>=120000));
});
test('F17R: giorni precedenti conservano il contratto storico',()=>{
  assert.equal(isDailyPokerDate('2026-10-15'),false);
  assert.equal(isDailyPokerDate('2026-10-16'),true);
  assert.notEqual(generateDailyChallengeConfig('2026-10-15').mode,'poker');
});
test('F17R: il duello Poker con assetto giornaliero supera anche l’audit del motore', async()=>{
  const {createPhase6Duel}=await import('./newCombat/phase6Engine.js');
  const {createPhase12CampaignTactics}=await import('./newCombat/phase12CampaignAbilities.js');
  const {initializePhase13CampaignState}=await import('./newCombat/phase13Campaign.js');
  const {initializePhase15}=await import('./newCombat/phase15LegacyPassives.js');
  const {initializePhase16B}=await import('./newCombat/phase16BCombat.js');
  const {initializePhase16C}=await import('./newCombat/phase16CEpics.js');
  const {initializePhase16E}=await import('./newCombat/phase16EDecks.js');
  const {initializePhase16F}=await import('./newCombat/phase16FModules.js');
  const {initializePhase16G}=await import('./newCombat/phase16GPilots.js');
  const {auditPhase10Duel}=await import('./newCombat/phase10Audit.js');
  const {phase17StartingAmmo}=await import('./newCombat/phase17Balance.js');
  const cfg=createDailyPokerConfig('2026-10-16');
  const p=createDailyPokerDeck(cfg.dateStr,'player'),e=createDailyPokerDeck(cfg.dateStr,'enemy');
  const armory=createDailyPokerArmory(cfg);
  const levels={light:cfg.weaponLevel,medium:cfg.weaponLevel,heavy:cfg.weaponLevel};
  let state=createPhase6Duel({playerHand:p.slice(0,7),playerDeck:p.slice(7),enemyHand:e.slice(0,7),enemyDeck:e.slice(7),
    board:Array(5).fill(null),ether:0,playerAmmo:phase17StartingAmmo(cfg.assignedWeapons),
    enemyAmmo:phase17StartingAmmo(cfg.assignedWeapons),playerLoadout:armory.equipped,
    enemyLoadout:cfg.assignedWeapons,playerHp:cfg.playerHp,enemyHp:cfg.aiHp,
    playerWeaponLevels:levels,enemyWeaponLevels:levels});
  state={...state,campaignTactics:createPhase12CampaignTactics({playerPilotId:cfg.pilotId,playerPilotLevel:2,
    enemyPilotLevel:2,enemyPilotId:cfg.enemyPilotId,planet:9,sector:9,modifier:'standard'})};
  state=initializePhase13CampaignState({...state,campaignSession:{planet:9,sector:9}},
    {planet:9,sector:9,modifier:'standard'});
  state=initializePhase15(state,{deckId:'neutral_starter',deckLevel:1,deckTraits:[],module:null,terrains:[],epics:[]});
  state=initializePhase16G(initializePhase16F(initializePhase16E(initializePhase16C(initializePhase16B(state))),{}));
  assert.deepEqual(auditPhase10Duel(state).errors,[]);
  assert.equal(state.phase,'attack');
  assert.deepEqual(state.arsenal.player,state.arsenal.enemy);
});
test('F17R: l’App apre la Sfida Poker direttamente, senza passare per il motore legacy',async()=>{
  const {readFileSync}=await import('node:fs');
  const app=readFileSync(new URL('./App.tsx',import.meta.url),'utf8');
  const view=readFileSync(new URL('./NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
  assert.match(app,/gameMode === 'daily_challenge' && activeAdventure\?\.dailyConfig\?\.mode === 'poker'/);
  assert.match(app,/<DailyPokerChallengeBattle/);
  assert.match(view,/disabled=\{fixedLoadout\|\|/);
});
