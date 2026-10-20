import test from 'node:test';
import assert from 'node:assert/strict';
import {publicElitePlayersFromVerified,publicElitePlayersToRoster} from './eliteServices.js';
import {mergeBootstrapLeaderboard} from './pvpBootstrap.js';
const weekKey='settimana_2026_42';
const valid={verified:true,isBot:false,weekKey,trophies:30,wins:2,losses:1,draws:0};
test('Proiezione Élite esclude bot, punteggi client non verificati e settimana errata',()=>{
 const data=publicElitePlayersFromVerified({human_alpha:valid,bot_beta:{...valid,isBot:true},
   fake_gamma:{...valid,verified:false},late_delta:{...valid,weekKey:'settimana_2026_41'},
   broken_omega:{...valid,trophies:-12}}, {human_alpha:{nickname:'<Ace> & Allies'}},weekKey);
 assert.deepEqual(Object.keys(data),['human_alpha']);
 assert.equal(data.human_alpha.nickname,'Ace & Allies');
 assert.ok(!('processedRooms' in data.human_alpha));
 assert.equal(data.human_alpha.trophies,30);
 assert.throws(()=>publicElitePlayersFromVerified({}, {},'../serverWallets'));
});
test('La classifica condivisa accetta solo persone verificate e i bot riempiono il resto',()=>{
 const real=publicElitePlayersToRoster({human_alpha:{...valid,nickname:'Ace'},
   bot_beta:{...valid,isBot:true,nickname:'Ghost'},fake_gamma:{...valid,verified:false,nickname:'Fake'}});
 assert.equal(real.length,1);
 assert.equal(real[0].id,'human_alpha');
 const merged=mergeBootstrapLeaderboard(real,[
   {id:'pilot_1',trophies:220,isBot:true},{id:'pilot_2',trophies:100,isBot:true}
 ],3);
 assert.equal(merged.length,3);
 assert.equal(merged.filter(p=>!p.isBot).length,1);
 assert.ok(merged.some(p=>p.id==='human_alpha'));
});
