import test from 'node:test';
import assert from 'node:assert/strict';
import {findQueuePartner,reserveQueuePair,removeWaitingTicket,releaseFailedPair,makePvpRoomId} from './pvpConnectivity.js';
const ticket = (id, timestamp=1000) => ({id, timestamp, status:'waiting',nickname:id});
test('single ticket waits without pairing itself', () => {
 assert.equal(findQueuePartner({a:ticket('a')},'a',1000), null);
});
test('newer ticket pairs with older one', () => {
 const q={a:ticket('a',1000),b:ticket('b',1002)};
 assert.equal(findQueuePartner(q,'a',1003),null);
 assert.equal(findQueuePartner(q,'b',1003).opponentId,'a');
 const paired=reserveQueuePair(q,'b',makePvpRoomId('a','b'),1003);
 assert.equal(paired.a.status,'matched');
 assert.equal(paired.b.status,'matched');
 assert.equal(findQueuePartner(paired,'b',1003),null);
 assert.equal(q.a.status,'waiting'); // pure: no mutation
});
test('four waiting participants pair once without overlap',()=>{
 let q={a:ticket('a',1000),b:ticket('b',1001),c:ticket('c',1002),d:ticket('d',1003)};
 q=reserveQueuePair(q,'b',makePvpRoomId('a','b'),1004);
 q=reserveQueuePair(q,'d',makePvpRoomId('c','d'),1004);
 assert.equal(q.a.pairedWith,'b');assert.equal(q.b.pairedWith,'a');
 assert.equal(q.c.pairedWith,'d');assert.equal(q.d.pairedWith,'c');
 assert.equal(reserveQueuePair(q,'c','unexpected',1004),null);
});
test('expired or invalid tickets cannot match',()=>{
 const q={a:ticket('a',1000),b:ticket('b',19000),c:ticket('c',19001)};
 assert.equal(findQueuePartner(q,'b',19002),null);
 assert.equal(findQueuePartner(q,'c',19002).opponentId,'b');
});
test('same timestamp pairs in stable id order',()=>{
 const q={z:ticket('z',1000),a:ticket('a',1000)};
 assert.equal(findQueuePartner(q,'z',1000).opponentId,'a');
});
test('bot fallback only removes tickets still waiting',()=>{
 const q={a:ticket('a'),b:{...ticket('b'),status:'matched'}};
 assert.equal(removeWaitingTicket(q,'b'),undefined);
 assert.deepEqual(Object.keys(removeWaitingTicket(q,'a')),['b']);
 assert.equal(removeWaitingTicket({a:ticket('a')},'a'),null);
});
test('failed room creation can safely release exactly that reservation',()=>{
 let q=reserveQueuePair({a:ticket('a',1000),b:ticket('b',1001)},'b','room_1',1002);
 const next=releaseFailedPair(q,'room_1');
 assert.equal(next.a.status,'waiting');
 assert.equal(next.b.status,'waiting');
 assert.equal(releaseFailedPair(q,'room_2'),undefined);
});
test('room keys stable and sanitized',()=>{
 assert.equal(makePvpRoomId('abc','xyz'),makePvpRoomId('xyz','abc'));
 assert.throws(()=>makePvpRoomId('a','a'));
});
