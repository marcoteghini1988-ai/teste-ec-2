import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePokerServerWallet} from './ensurePokerServerWallet.mjs';
import {publishEliteWalletView} from './publishEliteWalletView.mjs';
import {creditVerifiedEliteAward} from '../src/eliteServices.js';
import {readFileSync} from 'node:fs';
const makeDb=()=>{
 const data=new Map();
 const ref=path=>({
  async get(){return {val:()=>structuredClone(data.get(path)??null),exists:()=>data.has(path)};},
  async set(value){data.set(path,structuredClone(value));},
  async transaction(updater){const before=data.get(path)??null,after=updater(structuredClone(before));
   if(after===undefined)return {committed:false,snapshot:{val:()=>before,exists:()=>before!=null}};
   data.set(path,structuredClone(after));return {committed:true,snapshot:{val:()=>after,exists:()=>true}};
  }
 });return {db:{ref},data};
};
test('bootstrap server del portafoglio: idempotente, senza riprendere crediti locali',async()=>{
 const {db,data}=makeDb();
 assert.equal(await ensurePokerServerWallet(db,'human_001',100),true);
 assert.equal(data.get('serverWallets/human_001').diamonds,0);
 assert.equal(data.get('eliteWalletViews/human_001').diamonds,0);
 const award={playerId:'human_001',rank:1,diamonds:100,weekKey:'settimana_2026_41'};
 data.set('serverWallets/human_001',creditVerifiedEliteAward(data.get('serverWallets/human_001'),award));
 assert.equal(await ensurePokerServerWallet(db,'human_001',200),false);
 assert.equal(data.get('serverWallets/human_001').diamonds,100);
 assert.equal(data.get('eliteWalletViews/human_001').recentEliteAwards[0].weekKey,award.weekKey);
 assert.equal(await publishEliteWalletView(db,'human_001') .then(x=>x.diamonds),100);
 await assert.rejects(()=>ensurePokerServerWallet(db,'../injection',100));
});
test('regole Firebase: proiezione per UID leggibile ma non scrivibile dal client',()=>{
 const rules=JSON.parse(readFileSync(new URL('./POKER_17W_RTDB_RULES_ADDENDUM.json',import.meta.url)));
 assert.equal(rules.serverWallets['.read'],false);
 assert.equal(rules.serverWallets['.write'],false);
 assert.equal(rules.eliteWalletViews.$uid['.write'],false);
 assert.match(rules.eliteWalletViews.$uid['.read'],/auth.uid === \$uid/);
});

test('client invia azioni soltanto alla stanza assegnata dal server',()=>{
 const rules=JSON.parse(readFileSync(new URL('./POKER_17W_RTDB_RULES_ADDENDUM.json',import.meta.url)));
 const action=rules.pokerIntents.$roomId.$uid.$actionId;
 assert.match(action['.write'],/pokerRoomAssigned/);
 assert.match(action['.write'],/roomId'\)\.val\(\) === \$roomId/);
 assert.match(action['.validate'],/attack/);
 assert.match(action['.validate'],/ready/);
});
