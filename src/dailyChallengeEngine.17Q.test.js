import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDailyChallengeConfig, generateDailyGhostLeaderboard,
  getVisibleLeaderboard, consumePendingDailyReward, saveDailyChallengeData,
  loadDailyChallengeData
} from './dailyChallengeEngine.js';

test('Sfida del Giorno: configurazione identica per la stessa data', () => {
  assert.deepEqual(generateDailyChallengeConfig('2026-10-16'),generateDailyChallengeConfig('2026-10-16'));
});
test('Sfida del Giorno: 150 partecipanti sintetici riproducibili', () => {
  const a=generateDailyGhostLeaderboard('2026-10-16');
  const b=generateDailyGhostLeaderboard('2026-10-16');
  assert.equal(a.length,150);
  assert.deepEqual(a,b);
  assert.equal(new Set(a.map(x=>x.nickname)).size,150);
});
test('Non crea risultati con orario futuro per simulare fittiziamente 15 arrivi', () => {
  assert.equal(getVisibleLeaderboard([{id:'future',minuteOfDay:1440,turns:1,timeElapsedMs:1,remainingHpPct:1}]).length,0);
});
test('Sfida del Giorno: il riscatto locale funziona una volta sola', () => {
  const m=new Map();
  const previous=globalThis.localStorage;
  globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
  try {
    saveDailyChallengeData({ pendingReward:{ forDate:'2026-10-15', claimed:false, rewards:{diamonds:7} } });
    const claim=consumePendingDailyReward('2026-10-15');
    assert.equal(claim.reward.rewards.diamonds,7);
    assert.equal(loadDailyChallengeData().pendingReward.claimed,true);
    assert.equal(consumePendingDailyReward('2026-10-15'),null);
    assert.equal(consumePendingDailyReward('2026-10-14'),null);
  } finally {globalThis.localStorage=previous;}
});
