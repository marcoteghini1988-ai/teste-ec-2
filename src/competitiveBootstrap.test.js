import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPETITIVE_BOOTSTRAP, seededCompetitionRng, mergeBootstrapLeaderboard, classifyPvPOpponent } from './pvpBootstrap.js';

test('avvio: i bot restano attivi durante il lancio', () => {
  assert.equal(COMPETITIVE_BOOTSTRAP.enabled, true);
  assert.ok(COMPETITIVE_BOOTSTRAP.realOpponentSearchMs > 4500);
});
test('roster sintetici riproducibili per stessa settimana', () => {
  const a = seededCompetitionRng('settimana_2026_42');
  const b = seededCompetitionRng('settimana_2026_42');
  assert.deepEqual(Array.from({length: 100}, () => a()), Array.from({length: 100}, () => b()));
});
test('roster di settimane diverse hanno semi diversi', () => {
  assert.notEqual(seededCompetitionRng('settimana_2026_42')(), seededCompetitionRng('settimana_2026_43')());
});
test('reali sostituiscono bot progressivamente', () => {
  const bots = Array.from({length: 10}, (_, i) => ({ id: `bot_${i}`, trophies: 100 + i, isBot: true }));
  const humans = Array.from({length: 3}, (_, i) => ({ id: `human_${i}`, trophies: 1100 - i }));
  const list = mergeBootstrapLeaderboard(humans, bots, 10);
  assert.equal(list.length, 10);
  assert.equal(list.filter(p => p.isBot).length, 7);
  assert.equal(list.filter(p => !p.isBot).length, 3);
});
test('non sono duplicati i piloti reali', () => {
  const a = {id: 'human1', trophies: 150};
  const results = mergeBootstrapLeaderboard([a,a], [{id:'bot1',isBot:true,trophies:140}], 10);
  assert.equal(results.length, 2);
  assert.equal(results[0].isBot, false);
});
test('riempimento completamente reale non usa bot', () => {
  const humans = Array.from({length: 5}, (_, i) => ({ id: `real_${i}`, trophies: i }));
  const bots = Array.from({length: 20}, (_, i) => ({ id: `bot_${i}`, isBot: true, trophies: i }));
  const results = mergeBootstrapLeaderboard(humans,bots,5);
  assert.equal(results.filter(p => p.isBot).length, 0);
});
test('classifica fallback: umano non viene marcato come bot', () => {
  assert.equal(classifyPvPOpponent({isGhostMatch:true}), 'simulated');
  assert.equal(classifyPvPOpponent({isGhostMatch:false,opponent:{id:'player'}}), 'human');
});
