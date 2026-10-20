import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import { createPhase6Duel } from './phase6Engine.js';
import { TURN_PHASES } from './config.js';
import {isPhase11CampaignEligible,getPhase11BattleMeta,validatePhase11Settlement,createPhase11OnceGuard} from './phase10Audit.js';
const context = (level=1)=>({gameMode:'adventure',activeAdventure:{planet:1,level,modifier:{id:'standard'}},sectorMode:'classic',hasNetworkOpponent:false});
function makeFinished(outcome='player') {
  const card = (v,s,i)=>({id:`${s}${v}${i}`,suit:s,value:v,displayVal:String(v)});
  const state=createPhase6Duel({playerHand:[card(7,'hearts','p')],enemyHand:[card(4,'clubs','e')],playerHp:50,enemyHp:40});
  return {...state,campaignSession:{planet:1,sector:1},phase:TURN_PHASES.FINISHED,winner:outcome,round:4,
    hp:{player:outcome==='player'?35:0,enemy:outcome==='enemy'?25:0}};
}
test('fase11: solo settori classici neutri iniziali, non boss e non PvP',()=>{
  assert.equal(isPhase11CampaignEligible(context(1)),true);
  assert.equal(isPhase11CampaignEligible(context(5)),true);
  assert.equal(isPhase11CampaignEligible(context(6)),false);
  assert.equal(isPhase11CampaignEligible(context(10)),false);
  assert.equal(isPhase11CampaignEligible({...context(1),gameMode:'pvp'}),false);
  assert.equal(isPhase11CampaignEligible({...context(1),hasNetworkOpponent:true}),false);
  assert.equal(isPhase11CampaignEligible({...context(1),sectorMode:'vector'}),false);
  assert.equal(isPhase11CampaignEligible({...context(1),activeAdventure:{...context(1).activeAdventure,modifier:{id:'no_pass'}}}),false);
  assert.equal(isPhase11CampaignEligible({...context(1),activeAdventure:{...context(1).activeAdventure,planet:2}}),false);
});
test('fase11: vittoria verificata accredita stelle da HP e obiettivo effettivo',()=>{
  const state=makeFinished('player');
  const check=validatePhase11Settlement(state,context(),{elapsedMs:37000,swaps:0,maxSingleHitDmg:24},
    {id:'no_exchange',check:(s)=>s.exchangesUsed===0});
  assert.equal(check.ok,true,check.reason);
  assert.deepEqual(check.meta.starsEarned,[true,true,true]);
  assert.equal(check.meta.turnsElapsed,3);
  assert.equal(check.meta.activeTimeElapsedMs,37000);
  assert.equal(check.meta.remainingHpPct,.7);
});
test('fase11: obiettivo non registrato non regala la terza stella',()=>{
  const report=validatePhase11Settlement(makeFinished('player'),context(),{},
    {id:'module',check:s=>s.moduleActivations>0});
  assert.equal(report.ok,true);
  assert.deepEqual(report.meta.starsEarned,[true,true,false]);
});
test('fase11: sconfitta e pareggio non concedono stelle',()=>{
  for(const outcome of ['enemy','draw']) {
    const check=validatePhase11Settlement(makeFinished(outcome),context(),{},
      {check:()=>true});
    assert.equal(check.ok,true,check.reason);
    assert.deepEqual(check.meta.starsEarned,[false,false,false]);
    assert.equal(check.meta.isDraw,outcome==='draw');
  }
});
test('fase11: integrità, contesto e sessione, idempotenza risultato',()=>{
  assert.equal(validatePhase11Settlement({...makeFinished(),phase:TURN_PHASES.ATTACK},context(),{},null).ok,false);
  assert.equal(validatePhase11Settlement(makeFinished(),context(2),{},null).ok,false);
  assert.equal(validatePhase11Settlement(makeFinished(),{...context(),hasNetworkOpponent:true},{},null).ok,false);
  const guard=createPhase11OnceGuard();
  assert.equal(guard.claim('session_1'),true);
  assert.equal(guard.claim('session_1'),false);
  assert.equal(guard.claim('session_2'),true);
  assert.equal(guard.claim(''),false);
});
test('fase11: componente campagna non monta il motore legacy contemporaneamente',()=>{
  const path=fileURLToPath(new URL('../App.tsx',import.meta.url));
  const app=readFileSync(path,'utf8');
  assert.match(app,/step === 'game' && isPhase13CampaignEligible/);
  assert.match(app,/step === 'game' && !isPhase13CampaignEligible/);
  assert.match(app,/onBattleComplete=\{handlePhase13CampaignComplete\}/);
  assert.match(app,/handleGameEnd\(validation\.report\.outcome/);
});
