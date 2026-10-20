import test from 'node:test';import assert from 'node:assert/strict';
import {createOnlinePokerSession,applyOnlinePokerAction,viewOnlinePokerSession,hydrateOnlinePokerSession} from './pvpOnlineProtocol.js';
const uidA='tester_1111',uidB='tester_2222';
const init=()=>createOnlinePokerSession({roomId:'room_poker_abcdef0123',serverSecret:'abcd1234abcd1234abcd1234',now:1700000000000,players:[{uid:uidA},{uid:uidB}]});
test('Firebase perde array vuoti e null: il server ripristina il banco e la mano senza inventare carte',()=>{
 const s=init();const rt={...s,usedIds:null,events:null,state:{...s.state,board:null,player:{...s.state.player,discard:null},enemy:{...s.state.enemy,discard:null}}};
 const h=hydrateOnlinePokerSession(rt);assert.equal(h.state.board.length,5);assert.equal(h.state.board.filter(Boolean).length,0);
 assert.deepEqual(h.state.player.discard,[]);assert.deepEqual(h.usedIds,{});
 const view=viewOnlinePokerSession(rt,uidA);assert.equal(view.me.hand.length,7);assert.equal(view.board.length,5);assert.ok(!('deck' in view.me));
 assert.equal(view.me.deckSize,45);
 const next=applyOnlinePokerAction(rt,uidA,{id:'action_example123',expectedVersion:0,type:'attack',pass:true},1700000000100);
 assert.equal(next.state.phase,'response');
});
test('mazzo futuro segreto anche rispetto al proprietario e avversario',()=>{
 const s=init();const a=viewOnlinePokerSession(s,uidA);const b=viewOnlinePokerSession(s,uidB);
 assert.equal(JSON.stringify(a).includes(s.state.player.deck[0].id),false);
 assert.equal(JSON.stringify(a).includes(s.state.enemy.hand[0].id),false);
 assert.equal(JSON.stringify(b).includes(s.state.player.hand[0].id),false);
});
