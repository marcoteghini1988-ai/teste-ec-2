import test from 'node:test';
import assert from 'node:assert/strict';
import {computeVerifiedEliteAwards} from './eliteServices.js';
const wk='settimana_2026_42';
const pilot=(id,trophies,extra={})=>({playerId:id,trophies,wins:4,verified:true,weekKey:wk,...extra});
test('awards podium by verified trophy points only',()=>{
 const r=computeVerifiedEliteAwards([pilot('real_1',30),pilot('real_2',80),pilot('real_3',50)],wk);
 assert.deepEqual(r.map(x=>x.playerId),['real_2','real_3','real_1']);
 assert.deepEqual(r.map(x=>x.diamonds),[100,50,25]);
});
test('bots and unverified records can never receive the diamonds',()=>{
 const r=computeVerifiedEliteAwards([pilot('bot_1',999,{isBot:true}),pilot('fake_1',998,{verified:false}),pilot('real_1',50)],wk);
 assert.deepEqual(r.map(x=>x.playerId),['real_1']);
});
test('duplicates, mismatched weeks and invalid scores are rejected',()=>{
 const r=computeVerifiedEliteAwards([pilot('real_1',40),pilot('real_1',30),pilot('real_2',60,{weekKey:'settimana_2026_41'}),pilot('real_3',-5)],wk);
 assert.deepEqual(r.map(x=>x.playerId),['real_1']);
 assert.throws(()=>computeVerifiedEliteAwards([], 'current_week'));
});
test('ties resolved consistently independent of input order',()=>{
 const entries=[pilot('real_z',30,{wins:5}),pilot('real_b',30,{wins:6}),pilot('real_a',30,{wins:5})];
 assert.deepEqual(computeVerifiedEliteAwards(entries,wk),computeVerifiedEliteAwards(entries.slice().reverse(),wk));
 assert.deepEqual(computeVerifiedEliteAwards(entries,wk).map(x=>x.playerId),['real_b','real_a','real_z']);
});
import {creditVerifiedEliteAward} from './eliteServices.js';
test('atomic wallet payout can be applied only once',()=>{
 const award=computeVerifiedEliteAwards([pilot('real_1',500)],wk)[0];
 const result=creditVerifiedEliteAward({diamonds:12},award);
 assert.equal(result.diamonds,112);
 assert.equal(creditVerifiedEliteAward(result,award),undefined);
});
test('client cannot switch payout amount or invalid wallet',()=>{
 const award=computeVerifiedEliteAwards([pilot('real_1',500)],wk)[0];
 assert.throws(()=>creditVerifiedEliteAward({diamonds:0},{...award,diamonds:1000}));
 assert.throws(()=>creditVerifiedEliteAward({diamonds:NaN},award));
});
