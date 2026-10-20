import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelWaitingPokerTicket} from './pvpConnectivity.js';
test('Fallback può ritirare solo ticket ancora in attesa: non cancella prenotazioni',()=>{
 assert.equal(cancelWaitingPokerTicket({status:'waiting'}),null);
 assert.equal(cancelWaitingPokerTicket({status:'reserved',matchRoomId:'room_poker_123456789'}),undefined);
 assert.equal(cancelWaitingPokerTicket(null),undefined);
});
