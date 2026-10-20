import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVerifiedRoomToWeek} from './elitePokerResults.mjs';
import {assertClosedEliteWeekKey} from '../src/eliteServices.js';
const week='settimana_2026_42';
const participants={human_alpha:'player',human_beta:'enemy'};
test('il risultato di entrambi i giocatori è atomico, idempotente e verificato',()=>{
 const first=applyVerifiedRoomToWeek(null,'room_001',participants,'player',week,100);
 assert.equal(first.results.human_alpha.wins,1);
 assert.equal(first.results.human_beta.losses,1);
 assert.equal(first.results.human_alpha.trophies,15);
 assert.equal(first.results.human_beta.trophies,0);
 assert.equal(applyVerifiedRoomToWeek(first,'room_001',participants,'player',week,101),undefined);
 const second=applyVerifiedRoomToWeek(first,'room_002',participants,'draw',week,200);
 assert.equal(second.results.human_alpha.draws,1);
 assert.equal(second.results.human_beta.draws,1);
});
test('il congelamento impedisce di modificare retroattivamente i premi e i risultati',()=>{
 const before=applyVerifiedRoomToWeek(null,'room_001',participants,'player',week,100);
 const frozen={...before,lockedAt:900};
 assert.equal(applyVerifiedRoomToWeek(frozen,'room_002',participants,'enemy',week,950),undefined);
 assert.deepEqual(frozen.results,before.results);
});
test('la liquidazione rifiuta settimane future, correnti e identificativi non validi',()=>{
 assert.equal(assertClosedEliteWeekKey('settimana_2026_41',week),true);
 assert.throws(()=>assertClosedEliteWeekKey(week,week));
 assert.throws(()=>assertClosedEliteWeekKey('settimana_2027_01',week));
 assert.throws(()=>assertClosedEliteWeekKey('../wallets',week));
});
