import test from 'node:test';
import assert from 'node:assert/strict';
import {createPvpPokerDeck,getPvpGhostArmory,createPvpPokerBotSetup,buildPvpPokerBotResult} from './pvpBootstrap.js';
import {createPhase6Duel} from './newCombat/phase6Engine.js';
import {auditPhase10Duel} from './newCombat/phase10Audit.js';
import {getWeaponDefinition} from './newCombat/weaponCatalog.js';
import {readFileSync} from 'node:fs';
const room='room_pvp_bot_123';
test('due mazzi PvP indipendenti di 52 carte senza duplicazioni',()=>{
 const a=createPvpPokerDeck(room,'player'),b=createPvpPokerDeck(room,'enemy');
 assert.equal(a.length,52);assert.equal(b.length,52);
 assert.equal(new Set([...a,...b].map(c=>c.id)).size,104);
 assert.deepEqual(createPvpPokerDeck(room,'player'),a);
 assert.notDeepEqual(a,b);
 assert.throws(()=>createPvpPokerDeck('non-valido','enemy'));
});
test('rivali IA usano tre classi Poker reali e non gli ID hardpoint non corrispondenti',()=>{
 const loadout=getPvpGhostArmory({equippedWeapons:['wp_gatling','wp_xbow','wp_orbital_cannon']});
 for(const cls of ['light','medium','heavy']) {
   assert.equal(getWeaponDefinition(loadout[cls])?.weaponClass,cls);
 }
});
test('setup PvP IA non altera arsenale e passa audit del motore reale',()=>{
 const setup=createPvpPokerBotSetup({roomId:room,armoryV2:null,opponent:{level:30},playerLevel:18});
 const game=createPhase6Duel({...setup,enemyHand:setup.aiHand,enemyDeck:setup.aiDeck,playerLoadout:setup.playerLoadout,enemyLoadout:setup.enemyLoadout,
   playerHp:setup.initialPlayerHp,enemyHp:setup.initialEnemyHp});
 assert.equal(auditPhase10Duel(game).ok,true);
 assert.equal(game.player.hand.length,7);
 assert.equal(game.enemy.hand.length,7);
 assert.equal(game.player.deck.length,45);
 assert.equal(game.enemy.deck.length,45);
 assert.ok(game.hp.player>0&&game.hp.enemy>0);
});
test('risultato bot valida solo duello finito, non assegna trofei in Addestramento',()=>{
 const state={winner:'player',phase:'finished',round:7,hp:{player:100},initialHp:{player:160}};
 const t={validPokerCombos:3,elapsedMs:60000};
 const elite=buildPvpPokerBotResult(state,t,'elite');
 assert.equal(elite.pvpTrophiesAwarded,30);
 assert.equal(elite.pvpBonusDiamonds,1);
 assert.equal(elite.isSimulatedOpponent,true);
 assert.equal(buildPvpPokerBotResult(state,t,'training').pvpTrophiesAwarded,0);
 assert.throws(()=>buildPvpPokerBotResult({...state,phase:'prepare'},t,'elite'));
 assert.equal(buildPvpPokerBotResult({...state,winner:'draw'},t,'training').isDraw,true);
});
test('la UI monta Poker per IA e separa PvP umano online dal percorso legacy',()=>{
 const app=readFileSync(new URL('./App.tsx',import.meta.url),'utf8');
 const screen=readFileSync(new URL('./NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 assert.match(app,/gameMode === 'pvp' && pvpMeta\?\.isGhostMatch === true/);
 assert.match(app,/<PvpPokerBotBattle/);
 assert.match(app,/<PvpOnlinePokerBattle/);
 assert.match(app,/pvpMeta\?\.isOnlinePoker === true/);
 assert.match(screen,/pvpBotMode = false/);
 assert.match(screen,/onDuelComplete/);
});
