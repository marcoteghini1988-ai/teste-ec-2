import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOnlinePokerPair,reserveOnlinePokerPair,reservedOnlinePokerPairs} from './pvpConnectivity.js';
const t=1700000000000;
const initial={p123:{uid:'p123',status:'waiting',joinedAt:t-2000},p456:{uid:'p456',status:'waiting',joinedAt:t-1000},p789:{uid:'p789',status:'waiting',joinedAt:t-200}};
test('coppia più vecchia deterministica e terzo non prenotato',()=>{
 const pair=chooseOnlinePokerPair(initial,t);assert.deepEqual(pair,['p123','p456']);
 const q=reserveOnlinePokerPair(initial,pair,'room_poker_12345678',t);
 assert.equal(q.p789.status,'waiting');assert.equal(q.p123.status,'reserved');
 assert.equal(chooseOnlinePokerPair(q,t),null);
 assert.deepEqual(reservedOnlinePokerPairs(q,t),[{roomId:'room_poker_12345678',uids:['p123','p456']}]);
});
test('non si prenota una coppia due volte',()=>{
 const q=reserveOnlinePokerPair(initial,['p123','p456'],'room_poker_12345678',t);
 assert.equal(reserveOnlinePokerPair(q,['p123','p456'],'room_poker_87654321',t),null);
});
test('ticket scaduti o identificativi falsificati ignorati',()=>{
 assert.equal(chooseOnlinePokerPair({p123:{uid:'other',status:'waiting',joinedAt:t-50},p456:initial.p456},t),null);
 assert.equal(chooseOnlinePokerPair({p123:{uid:'p123',status:'waiting',joinedAt:t-30001},p456:initial.p456},t),null);
});
test('prenotazione recuperabile da worker dopo riavvio',()=>{
 const q=reserveOnlinePokerPair(initial,['p123','p456'],'room_poker_12345678',t);
 assert.equal(reservedOnlinePokerPairs(q,t+45000).length,1);
 assert.equal(reservedOnlinePokerPairs(q,t+60001).length,0);
});
