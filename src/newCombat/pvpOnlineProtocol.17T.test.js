import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnlinePokerSession,applyOnlinePokerAction,tickOnlinePokerSession,viewOnlinePokerSession} from './pvpOnlineProtocol.js';
import {getPhase4MoveOptions} from './phase4Engine.js';
import {planPhase9Attack} from './phase9AI.js';
const u1='user_pvp_aaaaa',u2='user_pvp_bbbbb';
const START=1750000000000;
const init=()=>createOnlinePokerSession({roomId:'room_pvp_valid_123',serverSecret:'abcdefghijklmnopqrstuvwx1234',now:START,
  players:[{uid:u1,hp:190,loadout:{light:'es_common_light_01',medium:'es_common_medium_03',heavy:null}},
    {uid:u2,hp:190,loadout:{light:'es_common_light_01',medium:'es_common_medium_03',heavy:null}}]});
const a=(type,id,expectedVersion,extra={})=>({type,id,expectedVersion,...extra});
test('sessione valida, mazzi e segreti esclusi dalle viste incrociate',()=>{
 const s=init(),a=viewOnlinePokerSession(s,u1),b=viewOnlinePokerSession(s,u2);
 assert.equal(a.me.hand.length,7);assert.equal(b.me.hand.length,7);
 assert.equal(a.opponent.handSize,7);assert.equal(b.opponent.handSize,7);
 assert.ok(a.me.hand.every(c=>!b.me.hand.some(d=>d.id===c.id)));
 assert.equal(JSON.stringify(a).includes('pvp-enemy'),false);
 assert.equal(JSON.stringify(b).includes('pvp-player'),false);
 assert.ok(!('state' in a));assert.ok(!('serverSecret' in a));
 assert.throws(()=>viewOnlinePokerSession(s,'intruder'));
});
test('due azioni simultanee non possono usare la stessa versione o lo stesso ID',()=>{
 const s=init();
 const s2=applyOnlinePokerAction(s,u1,a('attack','action_12345',0,{pass:true}),START+1000);
 assert.equal(s2.state.phase,'response');
 assert.equal(s2.version,1);
 assert.throws(()=>applyOnlinePokerAction(s2,u2,a('attack','action_22222',0,{pass:true}),START+1100),/Versione/);
 assert.throws(()=>applyOnlinePokerAction(s2,u1,a('attack','action_33333',1,{pass:true}),START+1100),/Non è il tuo turno/);
 const s3=applyOnlinePokerAction(s2,u2,a('attack','action_44444',1,{pass:true}),START+1200);
 assert.equal(s3.state.phase,'animate');
 assert.throws(()=>applyOnlinePokerAction(s3,u1,a('attack','action_12345',2,{pass:true}),START+1300),/già elaborata/);
 assert.equal(tickOnlinePokerSession(s3,START+2800).state.phase,'prepare');
});
test('lato non appartenente, carta inventata e arma non equipaggiata vengono respinti',()=>{
 const s=init();
 assert.throws(()=>applyOnlinePokerAction(s,'stranger',a('attack','action_a12345',0,{pass:true}),START),/Non partecipante/);
 assert.throws(()=>applyOnlinePokerAction(s,u1,a('attack','action_b12345',0,{placements:[{slot:0,cardId:'fake'}],weaponId:'es_common_light_01'}),START),/Carta assente/);
 const legitimate=s.state.player.hand[0].id;
 assert.throws(()=>applyOnlinePokerAction(s,u1,a('attack','action_c12345',0,{placements:[{slot:0,cardId:legitimate}],weaponId:'fake-weapon'}),START),/Arma non equipaggiata/);
});
test('i timeout vengono gestiti soltanto dal server con tempi 25 / 25 / 35',()=>{
 const initial=init();
 assert.throws(()=>applyOnlinePokerAction(initial,u1,a('timeout','action_ttt123',0),START+500),/solo al server/);
 const after=tickOnlinePokerSession(initial,START+25000);
 assert.equal(after.state.phase,'response');
 assert.equal(after.phaseStartedAt,START+25000);
 const after2=tickOnlinePokerSession(after,START+50000);
 assert.equal(after2.state.phase,'animate');
 const prepare=tickOnlinePokerSession(after2,START+52000);
 assert.equal(prepare.state.phase,'prepare');
 const ready=tickOnlinePokerSession(prepare,START+87000);
 assert.equal(ready.state.phase,'attack');
 assert.equal(ready.state.round,2);
});
test('cambi in preparazione costano tempo personale e non concedono una terza operazione',()=>{
 const first=applyOnlinePokerAction(init(),u1,a('attack','action_oneaaa',0,{pass:true}),START+1000);
 const second=applyOnlinePokerAction(first,u2,a('attack','action_twoaaa',1,{pass:true}),START+1200);
 const prep=tickOnlinePokerSession(second,START+2800);
 assert.equal(prep.state.phase,'prepare');
 const swapped=applyOnlinePokerAction(prep,u1,a('swap','action_swapaa',prep.version,{indices:[0,1,2]}),START+3000);
 assert.equal(swapped.state.player.exchangesLeft,1);
 assert.equal(swapped.state.preparation.timePenaltySeconds.player,3);
 assert.equal(swapped.state.preparation.timePenaltySeconds.enemy,0);
 const swapped2=applyOnlinePokerAction(swapped,u1,a('swap','action_swapbb',swapped.version,{indices:[0]}),START+3100);
 assert.equal(swapped2.state.player.exchangesLeft,0);
 assert.throws(()=>applyOnlinePokerAction(swapped2,u1,a('swap','action_swapcc',swapped2.version,{indices:[0]}),START+3200));
});
test('attacco reale del motore Poker con quattro carte e arma Leggera',()=>{
 const old=init();
 const hand=old.state.player.hand.map(c=>({...c}));
 for(let i=0;i<4;i++){hand[i].value=[8,8,3,10][i];hand[i].displayVal=String(hand[i].value);hand[i].suit=['spades','hearts','clubs','diamonds'][i];}
 const s={...old,state:{...old.state,player:{...old.state.player,hand}}};
 const placements=hand.slice(0,4).map((card,slot)=>({cardId:card.id,slot}));
 const next=applyOnlinePokerAction(s,u1,a('attack','action_realpoker',0,{placements,weaponId:'es_common_light_01'}),START+300);
 assert.equal(next.state.phase,'response');
 assert.equal(next.state.moves.player.score.patternId,'one_pair');
 assert.equal(next.state.player.hand.length,3);
 assert.equal(next.state.arsenal.player.light,'es_common_light_01');
 assert.equal(next.state.board.length,5);
 assert.throws(()=>applyOnlinePokerAction(s,u1,a('attack','action_injectcard',0,{placements:[{slot:0,cardId:s.state.enemy.hand[0].id}],weaponId:'es_common_light_01'}),START+300),/Carta assente/);
});
