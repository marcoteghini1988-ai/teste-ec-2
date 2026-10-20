import test from 'node:test';
import assert from 'node:assert/strict';
import {publishVerifiedEliteLeaderboard} from './elitePublicProjection.mjs';

test('Pubblicazione classifica leggibile separata dal registro e dal portafoglio Admin',async()=>{
 const values={
  'eliteVerifiedWeeks/settimana_2026_42/results':{
   human_alpha:{verified:true,isBot:false,weekKey:'settimana_2026_42',trophies:45,wins:3,losses:1,draws:0,processedRooms:{secret_room:true}},
   bot_beta:{verified:true,isBot:true,weekKey:'settimana_2026_42',trophies:999,wins:99,losses:0,draws:0}
  },
  'serverProfiles/human_alpha/nickname':'Eroica',
 };
 const writes={};
 const db={ref(path){return {
  async get(){return {val:()=>values[path]??null}},
  async set(v){writes[path]=v;}
 }}};
 const result=await publishVerifiedEliteLeaderboard(db,'settimana_2026_42');
 assert.equal(result,1);
 const projection=writes['elitePublicWeeks/settimana_2026_42'];
 assert.equal(projection.players.human_alpha.nickname,'Eroica');
 assert.ok(!JSON.stringify(projection).includes('secret_room'));
 assert.ok(!('bot_beta' in projection.players));
 assert.equal(Object.keys(writes).length,1);
});
