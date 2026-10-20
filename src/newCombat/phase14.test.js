import test from 'node:test';
import assert from 'node:assert/strict';
import { ARSENAL_48 } from './weaponCatalog.js';
import { TURN_PHASES } from './config.js';
import {createPhase14Memory,resolvePhase14WeaponEffects,PHASE14_EFFECT_IDS} from './phase14WeaponEffects.js';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase13CampaignState,commitPhase13Move,advancePhase13BossIfNeeded} from './phase13Campaign.js';

const suits=['hearts','spades','diamonds','clubs'];
const card=(id,value,suit)=>({id,value,suit});
const move=(side,weaponId,patternId='one_pair')=>({weaponId,score:{patternId,cardIds:[`${side}-1`,`${side}-2`,`${side}-3`,`${side}-4`]},
  committedCards:[card(`${side}-1`,7,'hearts'),card(`${side}-2`,7,'spades'),card(`${side}-3`,6,'diamonds'),card(`${side}-4`,5,'clubs')]});
function scene(weapon,options={}) {
  const other=ARSENAL_48[0];
  return {phase:TURN_PHASES.ANIMATE,round:2,
    hp:{player:150,enemy:150},initialHp:{player:200,enemy:200},
    ammo:{player:{hearts:40,diamonds:40,clubs:40,spades:40},enemy:{hearts:40,diamonds:40,clubs:40,spades:40}},
    boost:{player:{energy:25,target:6},enemy:{energy:25,target:6}},
    result:{winner:'attacker',opener:'player',responder:'enemy',volleys:{
      player:{weaponId:weapon.id,shots:4,fullShots:4,damage:20,damagePercent:100,suit:weapon.ammoSuit},
      enemy:{weaponId:other.id,shots:4,fullShots:4,damage:8,damagePercent:50,suit:other.ammoSuit}}},
    moves:{player:move('p',weapon.id),enemy:move('e',other.id)},
    weaponEffects:options.memory||createPhase14Memory(),history:[],...options};
}

test('F14: 48 armi distinte hanno 48 passivi reali registrati, nessuno pending',()=>{
  assert.equal(ARSENAL_48.length,48);
  assert.equal(new Set(PHASE14_EFFECT_IDS).size,48);
  for (const w of ARSENAL_48){
    assert.equal(w.effect.implementation,'phase14_active');
    const mem=createPhase14Memory();
    mem.player.lastPattern='one_pair';mem.player.lastWeapon=w.id;mem.player.streak=1;
    const base=scene(w,{weaponEffects:mem});
    if(w.effect.id==='raffica_modulata') base.result.volleys.player.shots=2;
    const before=JSON.stringify(base);
    const after=resolvePhase14WeaponEffects(base);
    assert.equal(JSON.stringify(base),before,`${w.id}: ha mutato lo stato input`);
    assert.equal(after.result.weaponEffectsResolved,true,w.id);
    assert.ok(after.result.weaponEffectsLog.some(e=>e.id===w.effect.id),`${w.id}: passivo non attivato`);
    assert.equal(resolvePhase14WeaponEffects(after),after,`${w.id}: duplica gli effetti`);
    for(const s of ['player','enemy']) {
      assert.ok(Number.isInteger(after.hp[s]) && after.hp[s]>=0 && after.hp[s]<=200,w.id);
      assert.ok(after.boost[s].energy>=0 && after.boost[s].energy<=45,w.id);
      for(const suit of suits)assert.ok(after.ammo[s][suit]>=0,w.id);
    }
    assert.equal(after.moves.player.weaponId,w.id);
    assert.equal(after.result.winner,base.result.winner,'Il rango Poker non può cambiare');
  }
});

test('F14: il colpo ritardato viene calcolato nel prossimo scambio, non due volte',()=>{
  const weapon=ARSENAL_48.find(w=>w.effect.id==='ritardo_impatto');
  let first=resolvePhase14WeaponEffects(scene(weapon));
  assert.equal(first.hp.enemy,150);
  assert.equal(first.weaponEffects.player.delayed,4);
  assert.equal(resolvePhase14WeaponEffects(first),first);
  let next=scene(ARSENAL_48[0],{round:3,weaponEffects:first.weaponEffects});
  next.result.volleys.player={weaponId:null,shots:0,damage:0};next.moves.player={passed:true};
  next.result.volleys.enemy={weaponId:null,shots:0,damage:0};next.moves.enemy={passed:true};
  next=resolvePhase14WeaponEffects(next);
  assert.equal(next.hp.enemy,146);
  assert.equal(next.weaponEffects.player.delayed,0);
  assert.equal(resolvePhase14WeaponEffects(next),next);
});

test('F14: le protezioni difendono la salva successiva, non quella in cui nascono',()=>{
  const evade=ARSENAL_48.find(w=>w.effect.id==='scatto_evasivo');
  let first=resolvePhase14WeaponEffects(scene(evade));
  assert.equal(first.hp.player,150);
  assert.equal(first.weaponEffects.player.guard,5);
  let next=resolvePhase14WeaponEffects(scene(ARSENAL_48[0],{round:3,weaponEffects:first.weaponEffects}));
  assert.equal(next.hp.player,155);
  assert.equal(next.weaponEffects.player.guard,0);
});

test('F14: niente sparo significa niente nuovo effetto ma i danni ritardati maturano',()=>{
  const weapon=ARSENAL_48.find(w=>w.effect.id==='segno_prescelto');
  const s=scene(weapon);
  s.result.volleys.player={weaponId:null,shots:0,damage:0};
  s.result.volleys.enemy={weaponId:null,shots:0,damage:0};
  const after=resolvePhase14WeaponEffects(s);
  assert.equal(after.result.weaponEffectsLog.length,0);
  assert.equal(after.hp.player,150);assert.equal(after.hp.enemy,150);
});

test('F14: anche l’AI usa lo stesso passivo senza leggere le carte avversarie',()=>{
  const w=ARSENAL_48.find(w=>w.effect.id==='recupero_carica');
  let s=scene(ARSENAL_48[0]);
  s.result.volleys.player={weaponId:null,shots:0,damage:0};
  s.result.volleys.enemy={...s.result.volleys.enemy,weaponId:w.id,suit:w.ammoSuit};
  const before=s.ammo.enemy[w.ammoSuit];
  s=resolvePhase14WeaponEffects(s);
  assert.equal(s.ammo.enemy[w.ammoSuit],before+3);
  assert.ok(s.result.weaponEffectsLog.some(x=>x.side==='enemy'&&x.id===w.effect.id));
});

test('F14: nel settore campagna i passivi entrano solo alla risoluzione della risposta',()=>{
  const p=[card('p1',7,'hearts'),card('p2',7,'spades'),card('p3',4,'clubs'),card('p4',5,'diamonds'),card('p5',8,'hearts')];
  const e=[card('e1',8,'hearts'),card('e2',8,'spades'),card('e3',5,'clubs'),card('e4',6,'diamonds'),card('e5',9,'hearts')];
  const a={hearts:30,spades:30,diamonds:30,clubs:30};
  const duel=createPhase6Duel({playerHand:p,enemyHand:e,playerAmmo:a,enemyAmmo:a});
  let s=initializePhase13CampaignState(duel,{planet:1,sector:1});
  s=commitPhase13Move(s,'player',p.slice(0,4).map((card,slot)=>({card,slot})),false,'es_common_light_01');
  assert.equal(s.result,null);
  const result=commitPhase13Move(s,'enemy',e.slice(0,4).map((card,i)=>({card,slot:[0,1,2,4][i]})),false,'es_common_light_01');
  assert.equal(result.phase,TURN_PHASES.ANIMATE);
  assert.equal(result.result.weaponEffectsResolved,true);
  assert.equal(resolvePhase14WeaponEffects(result),result);
});

test('F17: senza nuove fasi i passivi persistenti del boss non vengono resettati',()=>{
  const w=ARSENAL_48[0];let s=scene(w,{campaignBossTrack:{planet:11,sector:10,current:1,max:1,cleared:0},
    campaignTactics:{bossPhase:1},winner:'player'});
  s.weaponEffects.player.delayed=7;
  s.weaponEffects.enemy.nextAttack=8;
  const after=advancePhase13BossIfNeeded(s);
  assert.strictEqual(after,s);
  assert.equal(after.weaponEffects.player.delayed,7);
  assert.equal(after.weaponEffects.enemy.nextAttack,8);
});
