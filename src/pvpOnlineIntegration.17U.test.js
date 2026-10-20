import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./App.tsx',import.meta.url),'utf8');
const lobby=readFileSync(new URL('./pvpManager.jsx',import.meta.url),'utf8');
const battle=readFileSync(new URL('./PvpOnlinePokerBattle.jsx',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/pokerWorker.mjs',import.meta.url),'utf8');
test('PvP umano Poker montato solo quando il metadato viene assegnato dal server',()=>{
  assert.match(app,/pvpMeta\?\.isOnlinePoker === true/);
  assert.match(app,/<PvpOnlinePokerBattle/);
  assert.match(app,/pvpMeta\?\.isGhostMatch === true/);
  assert.match(app,/pvpMeta\?\.isOnlinePoker === true\)\) && \(/);
});
test('lobby usa UID Firebase Auth e accetta solo stanze assegnate al proprio UID',()=>{
  assert.match(lobby,/signInAnonymously\(firebaseAuth\)/);
  assert.match(lobby,/pokerRoomAssigned\/\$\{authUid\}/);
  assert.match(lobby,/VITE_POKER_ONLINE_ENABLED === 'true'/);
  assert.match(lobby,/COMPETITIVE_BOOTSTRAP\.realOpponentSearchMs/);
});
test('client scrive solo intenti e legge le proiezioni private',()=>{
 assert.match(battle,/pokerIntents\/\$\{roomId\}\/\$\{uid\}\/\$\{id\}/);
 assert.match(battle,/pokerViews\/\$\{uid\}\/\$\{roomId\}/);
 assert.doesNotMatch(battle,/pokerAuthority\/\$\{/);
});
test('worker registra risultati Élite solo tramite arbitro Admin',()=>{
 assert.match(server,/recordVerifiedOnlinePokerResult/);
 assert.match(server,/matchOnlinePokerQueues/);
});
