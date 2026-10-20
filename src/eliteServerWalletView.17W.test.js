import test from 'node:test';
import assert from 'node:assert/strict';
import {projectEliteServerWalletView,readEliteServerWalletView} from './eliteServices.js';
import {resumablePokerRoom} from './pvpConnectivity.js';
const room='room_poker_abcdef987654';
test('un wallet non inizializzato non diventa un saldo zero fittizio',()=>{
 assert.equal(projectEliteServerWalletView(null),null);
 assert.equal(projectEliteServerWalletView({}),null);
 assert.equal(projectEliteServerWalletView({diamonds:-1}),null);
 assert.equal(readEliteServerWalletView({diamonds:999,source:'browser'}),null);
});
test('la vista wallet mostra solo saldo e ultimi premi, senza ledger o segreti',()=>{
 const wallet={diamonds:175,serverSecret:'NO',credentials:'NO',eliteSettledWeeks:{
   settimana_2026_2:50,settimana_2026_11:100,settimana_2025_52:25,
   junk:1,settimana_2026_12:500
 }};
 const output=projectEliteServerWalletView(wallet);
 assert.equal(output.diamonds,175);
 assert.deepEqual(output.recentEliteAwards.map(a=>a.weekKey),['settimana_2026_11','settimana_2026_2','settimana_2025_52']);
 assert.equal(JSON.stringify(output).includes('NO'),false);
 assert.deepEqual(readEliteServerWalletView(output).recentEliteAwards,output.recentEliteAwards);
});
test('riconnessione solo con stanza Poker attiva, canale giusto e vista privata',()=>{
 const assignment={channel:'elite',roomId:room};
 const privateView={roomId:room,protocol:'poker-online-17T',status:'active',version:0,me:{side:'player'}};
 assert.equal(resumablePokerRoom(assignment,privateView,'elite').roomId,room);
 assert.equal(resumablePokerRoom(assignment,{...privateView,status:'finished'},'elite'),null);
 assert.equal(resumablePokerRoom(assignment,{...privateView,me:null},'elite'),null);
 assert.equal(resumablePokerRoom(assignment,privateView,'training'),null);
 assert.equal(resumablePokerRoom({...assignment,roomId:'../bad'},privateView,'elite'),null);
});
