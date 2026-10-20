import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createPhase6Duel} from './phase6Engine.js';
import {TURN_PHASES} from './config.js';
import {
  CAMPAIGN_PILOT_V2,CAMPAIGN_BOSS_V2,CAMPAIGN_MODIFIERS_V2,CAMPAIGN_ANOMALIES_V2,
  createPhase12CampaignTactics,resolvePhase12CampaignExchange
} from './phase12CampaignAbilities.js';
const card=(value,suit,id)=>({id,suit,value});
const fixture=(pilot='pilot_com_2',enemy='pilot_sentinel_1',{boss=false,enemyDamage=6,playerDamage=10,playerHp=55}={})=>{
  const state=createPhase6Duel({playerHp:80,enemyHp:80});
  const tactics=createPhase12CampaignTactics({playerPilotId:pilot,enemyPilotId:enemy,playerPilotLevel:3,planet:boss?5:1,sector:boss?10:1});
  return {...state,campaignTactics:tactics,phase:TURN_PHASES.ANIMATE,round:3,hp:{player:playerHp,enemy:55},
    moves:{player:{score:{tier:10},committedCards:[card(8,'hearts','p1'),card(8,'diamonds','p2')]},enemy:{score:{tier:9},committedCards:[card(9,'spades','e1'),card(9,'clubs','e2')]}},
    result:{opener:'player',responder:'enemy',winner:'attacker',
      volleys:{player:{weaponId:'wp',shots:4,damage:playerDamage,suit:'hearts',damagePercent:100},enemy:{weaponId:'we',shots:2,damage:enemyDamage,suit:'spades',damagePercent:50}},boostResolved:true}
  };
};
test('fase12: 53 piloti originali identificati senza perdere personaggi',()=>{
  const s=readFileSync(fileURLToPath(new URL('../pilotsSystem.jsx',import.meta.url)),'utf8');
  const ids=[...s.matchAll(/id: '(pilot_(?:com|rare|epic|leg|boss|sentinel)_\d+)'/g)].map(m=>m[1]);
  assert.equal(ids.length,53);
  assert.equal(Object.keys(CAMPAIGN_PILOT_V2).length,ids.length);
  for(const id of ids)assert.ok(CAMPAIGN_PILOT_V2[id],id);
});
test('fase12: boss 1–20, 4 modificatori e 6 anomalie censiti',()=>{
  assert.equal(Object.keys(CAMPAIGN_BOSS_V2).length,20);
  assert.equal(Object.keys(CAMPAIGN_MODIFIERS_V2).length,4);
  assert.equal(Object.keys(CAMPAIGN_ANOMALIES_V2).length,6);
  for(let n=1;n<=20;n++)assert.ok(CAMPAIGN_BOSS_V2[n]);
});
test('fase12: parametro pilota valido, livello, no id inventati',()=>{
  assert.equal(createPhase12CampaignTactics({playerPilotLevel:99}).levels.player,5);
  assert.throws(()=>createPhase12CampaignTactics({playerPilotId:'pilot_fake'}));
  assert.throws(()=>createPhase12CampaignTactics({planet:21}));
  assert.equal(createPhase12CampaignTactics().boss,null);
});
test('fase12: colpo vincente riceve bonus pilota una sola volta',()=>{
  const s=fixture();
  const t=resolvePhase12CampaignExchange(s);
  assert.equal(t.hp.enemy,53);
  assert.equal(t.hp.player,55); // la corazza della sentinella recupera HP al nemico, non al giocatore
  assert.ok(t.result.campaignAbilitiesResolved);
  assert.deepEqual(resolvePhase12CampaignExchange(t),t);
  assert.equal(t.result.winner,'attacker');
});
test('fase12: fuori dalla campagna, preparazione o assenza volée nessun effetto',()=>{
  const s=fixture();
  const sandbox={...s,campaignTactics:undefined};
  assert.strictEqual(resolvePhase12CampaignExchange(sandbox),sandbox);
  const preparing={...s,phase:TURN_PHASES.PREPARE};
  assert.strictEqual(resolvePhase12CampaignExchange(preparing),preparing);
});
test('fase12: Boost del pilota segue cap a 45 e non cambia forza Poker',()=>{
  const s=fixture('pilot_com_1','pilot_sentinel_7');
  s.boost.player.energy=44;
  const t=resolvePhase12CampaignExchange(s);
  assert.equal(t.boost.player.energy,45);
  assert.equal(t.moves.player.score.tier,10);
});
test('fase12: armi matematiche vecchie non necessarie per abilitare un pilota',()=>{
  for (const id of ['pilot_com_1','pilot_com_2','pilot_com_3','pilot_com_4']) {
    const s=fixture(id);
    const t=resolvePhase12CampaignExchange(s);
    assert.equal(t.result.campaignAbilitiesResolved,true);
  }
});
test('fase12: bersaglio sconfitto non si resuscita con abilità di cura',()=>{
  const s=fixture('pilot_com_2','pilot_boss_11');
  s.hp.enemy=0;
  const t=resolvePhase12CampaignExchange(s);
  assert.equal(t.hp.enemy,0);
  assert.equal(t.winner,'player');
});
test('fase12: boss pianeta 5, trigger picche su mosse vere',()=>{
  const s=fixture('pilot_com_1','pilot_sentinel_5',{boss:true});
  assert.equal(s.campaignTactics.boss.planet,5);
  const t=resolvePhase12CampaignExchange(s);
  assert.ok(t.result.campaignEffects.some(e=>e.description.includes('Sovratensione ionica')));
});
test('fase12: tutte le abilità dei boss sono simulabili senza modificare le carte',()=>{
  for(let n=1;n<=20;n++){
    const s=fixture('pilot_com_1','pilot_sentinel_1',{boss:true});
    s.campaignTactics=createPhase12CampaignTactics({playerPilotId:'pilot_com_1',enemyPilotId:'pilot_sentinel_1',planet:n,sector:10});
    const original=JSON.stringify(s.moves);
    const t=resolvePhase12CampaignExchange(s);
    assert.equal(t.result.campaignAbilitiesResolved,true,n);
    assert.equal(JSON.stringify(t.moves),original,n);
    assert.ok(t.hp.player>=0 && t.hp.enemy>=0,n);
  }
});
test('fase12: App passa pilota e livello all’arena senza modificare la modalità PvP',()=>{
  const app=readFileSync(fileURLToPath(new URL('../App.tsx',import.meta.url)),'utf8');
  const screen=readFileSync(fileURLToPath(new URL('../NewCombatPhase3Preview.jsx',import.meta.url)),'utf8');
  assert.match(app,/campaignPilotId=\{selectedPilot\}/);
  assert.match(app,/campaignPilotLevel=\{pilotInventory\?\.\[selectedPilot\]\?\.level\|\|1\}/);
  assert.match(screen,/commitCombatMove\(s,'enemy'/);
  assert.match(screen,/resolvePhase12CampaignExchange\(commitPhase5Move/);
});
test('fase12: tossina si applica allo scambio successivo una sola volta, mai al secondo',()=>{
  const state=fixture('pilot_boss_3','pilot_sentinel_2');
  const poisoned=resolvePhase12CampaignExchange(state);
  assert.equal(poisoned.pilotStatus.poison.enemy,2);
  assert.ok(poisoned.result.campaignEffects.some(e=>e.kind==='status'));
  const subsequent={...poisoned,round:4,result:{...state.result,campaignAbilitiesResolved:false},
    moves:{player:{score:null,committedCards:[]},enemy:{score:null,committedCards:[]}}};
  subsequent.result.volleys={player:{shots:0,damage:0},enemy:{shots:0,damage:0}};
  const tick=resolvePhase12CampaignExchange(subsequent);
  assert.equal(tick.hp.enemy,poisoned.hp.enemy-2);
  assert.equal(tick.pilotStatus.poison.enemy,0);
  assert.strictEqual(resolvePhase12CampaignExchange(tick),tick);
});
test('fase12: seme dominante segue le anomalie senza nuove barre HP',()=>{
  const s=fixture('pilot_com_1','pilot_sentinel_20',{boss:true});
  s.campaignTactics=createPhase12CampaignTactics({playerPilotId:'pilot_com_1',enemyPilotId:'pilot_sentinel_20',planet:20,sector:10,bossPhase:1});
  const hit=resolvePhase12CampaignExchange(s);
  assert.ok(hit.result.phase16DBossEffects.some(e=>e.description.includes('Dominio Picche')));
  const phase2={...s,phase17Anomalies:{triggered:1}};
  const miss=resolvePhase12CampaignExchange(phase2);
  assert.equal(miss.result.phase16DBossEffects.some(e=>e.kind==='damage'),false);
});
