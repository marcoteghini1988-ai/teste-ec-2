import test from 'node:test';
import assert from 'node:assert/strict';
import {previousRomePokerWeekKey,settleVerifiedEliteWeek} from './eliteSettlementService.mjs';
import {getRomePokerWeekKey} from './elitePokerResults.mjs';
const NOW=Date.parse('2026-10-19T10:00:00Z');
const WEEK=previousRomePokerWeekKey(NOW);
const copy=v=>v===undefined?undefined:structuredClone(v);
function memoryDb(initial={}){
 const values=new Map(Object.entries(initial));
 const ref=path=>({
  async get(){const v=values.get(path)??null;return {val:()=>copy(v),exists:()=>v!==null};},
  async set(v){values.set(path,copy(v));},
  async update(patch){let v=values.get(path)||{};values.set(path,{...v,...copy(patch)});},
  async transaction(fn){const before=copy(values.get(path)??null);const next=fn(copy(before));
   if(next===undefined)return {committed:false,snapshot:{val:()=>copy(before),exists:()=>before!==null}};
   values.set(path,copy(next));return {committed:true,snapshot:{val:()=>copy(next),exists:()=>next!==null}};
  }
 });
 return {db:{ref},values};
}
const record=(wins,trophies)=>({weekKey:WEEK,verified:true,isBot:false,wins,trophies,losses:0,draws:0});
test('la settimana precedente si ricava dal calendario romano, anche a cavallo di anno',()=>{
 assert.equal(previousRomePokerWeekKey(NOW),'settimana_2026_42');
 const jan=Date.parse('2027-01-04T12:00:00Z');
 assert.notEqual(getRomePokerWeekKey(jan),previousRomePokerWeekKey(jan));
});
test('chiusura Élite automatizzabile: podio umano, accredito e retry idempotente',async()=>{
 const {db,values}=memoryDb({
  [`eliteVerifiedWeeks/${WEEK}`]:{weekKey:WEEK,results:{human_aa:record(8,120),human_bb:record(6,90),human_cc:record(2,40),bot_cc:{...record(999,999),isBot:true}}},
  'serverWallets/human_aa':{diamonds:5},'serverWallets/human_bb':{diamonds:0},'serverWallets/human_cc':{diamonds:1}
 });
 const first=await settleVerifiedEliteWeek(db,WEEK,{now:NOW});
 assert.equal(first.status,'settled');assert.equal(first.winners,3);
 assert.equal(values.get('serverWallets/human_aa').diamonds,105);
 assert.equal(values.get('serverWallets/human_bb').diamonds,50);
 assert.equal(values.get('serverWallets/human_cc').diamonds,26);
 assert.equal(values.get('eliteWalletViews/human_aa').diamonds,105);
 const repeat=await settleVerifiedEliteWeek(db,WEEK,{now:NOW+9000});
 assert.equal(repeat.status,'already-settled');
 assert.equal(values.get('serverWallets/human_aa').diamonds,105);
 assert.equal(values.get('eliteWeekSettlements/'+WEEK).status,'complete');
});
test('nessun accredito per settimane correnti o quando non vi sono umani verificati',async()=>{
 const {db,values}=memoryDb({[`eliteVerifiedWeeks/${WEEK}`]:{weekKey:WEEK,results:{bot_cc:{...record(50,900),isBot:true}}}});
 await assert.rejects(()=>settleVerifiedEliteWeek(db,getRomePokerWeekKey(NOW),{now:NOW}),/non ancora chiusa/);
 assert.equal((await settleVerifiedEliteWeek(db,WEEK,{now:NOW})).status,'no-verified-players');
 assert.equal([...values.keys()].some(key=>key.startsWith('serverWallets/')),false);
});
