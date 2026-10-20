import test from 'node:test';import assert from 'node:assert/strict';
import {getRomePokerWeekKey,accumulateVerifiedPokerResult} from './elitePokerResults.mjs';
test('Élite liquida risultati una volta per duello e giocatore',()=>{
 const a=accumulateVerifiedPokerResult(null,'room_x',true,'settimana_2026_42',100);
 assert.equal(a.wins,1);assert.equal(a.trophies,15);
 assert.equal(accumulateVerifiedPokerResult(a,'room_x',true,'settimana_2026_42',120),undefined);
 const b=accumulateVerifiedPokerResult(a,'room_y',false,'settimana_2026_42',130);
 assert.equal(b.trophies,5);assert.equal(b.losses,1);
});
test('rilevamento settimana Roma cambia al lunedì',()=>{
 assert.notEqual(getRomePokerWeekKey(Date.parse('2026-10-18T21:00:00Z')),
  getRomePokerWeekKey(Date.parse('2026-10-18T22:01:00Z')));
});
