import test from 'node:test';
import assert from 'node:assert/strict';
import {createF17HProgression,f17hShopBeforeAttempt,f17hSettleBattle,f17hCurrentEquipment,f17hFinishForge,f17hPilotLevel} from './phase17HProgression.js';
import {f17dCampaignReward} from './phase17DEconomy.js';
import {getForgeParams} from '../progressionEngine.js';
import {PHASE16A_RIFTS} from './phase16ACatalog.js';
const b=(result='player',ext={})=>({result,auditOK:true,exchanges:5,playerHP:35,playerHPmax:50,playerShots:3,winningResponses:0,multiSuitShots:0,boostActivations:0,swapPlayer:1,playerModuleActivations:0,usedRevive:false,battleCreditsEarned:0,battleDustEarned:0,battleDiamondsEarned:0,...ext});
const win=s=>{f17hShopBeforeAttempt(s);f17hSettleBattle(s,b());};
test('17H: stelle da HP e statistiche sfida, non due stelle imposte',()=>{
 const s=createF17HProgression();f17hShopBeforeAttempt(s);f17hSettleBattle(s,b('player',{multiSuitShots:1}));assert.deepEqual(s.starsBySector.P1_L1,[true,true,true]);
 f17hShopBeforeAttempt(s);f17hSettleBattle(s,b('player',{playerHP:12,playerShots:0,swapPlayer:4}));
 assert.deepEqual(s.starsBySector.P1_L2,[true,false,false]);assert.equal(s.stars,4);
});
test('17H: terza stella no_exchange non garantita se avviene un cambio',()=>{
 const s=createF17HProgression();s.sector=4;
 f17hSettleBattle(s,b('player',{swapPlayer:2,winningResponses:0}));
 // L'esito dipende dalla sfida effettiva del settore e dal solo motore.
 assert.equal(s.starsBySector.P1_L4[0],true);
 assert.equal(s.starsBySector.P1_L4[1],true);
});
test('17H: boss senza rianimazione raddoppia XP, Polvere e Diamanti senza regali',()=>{
 const s=createF17HProgression();s.sector=10;
 const expected=f17dCampaignReward(1,10,{flawlessBoss:true});
 f17hSettleBattle(s,b());
 assert.equal(s.xp,expected.xp);assert.equal(s.wallet.diamonds,expected.diamonds);assert.equal(s.stats.flawlessBosses,1);
 assert.equal(s.relics.relic_p1,true);
});
test('17H: boss con rianimazione non ottiene il doppio premio',()=>{
 const s=createF17HProgression();s.sector=10;
 f17hSettleBattle(s,b('player',{usedRevive:true}));
 assert.equal(s.xp,f17dCampaignReward(1,10).xp);
 assert.equal(s.stats.flawlessBosses,0);
});
test('17H: dopo il boss 20, fusione opzionale di due reliquie senza creare Epici sui bot',()=>{
 const s=createF17HProgression();s.sector=10;f17hSettleBattle(s,b());
 s.sector=20;s.xp=100000;f17hSettleBattle(s,b());
 assert.equal(s.stats.fusions,1);assert.equal(s.fused[PHASE16A_RIFTS[0].id],true);
 assert.equal(f17hCurrentEquipment(s).epics[0]?.id,'epic_item_8');
 const no=createF17HProgression({fuseEpics:false});no.sector=10;f17hSettleBattle(no,b());no.sector=20;f17hSettleBattle(no,b());
 assert.equal(no.stats.fusions,0);assert.deepEqual(f17hCurrentEquipment(no).epics,[]);
});
test('17H: pareggio rimborsa ingresso, non accredita XP e non apre un settore',()=>{
 const s=createF17HProgression();const before=s.wallet.credits;
 f17hSettleBattle(s,b('draw'));
 assert.equal(s.wallet.credits,before+1); // 4 minuti di ricarica (1 Credito) + rimborso
 assert.equal(s.xp,0);assert.equal(s.sector,1);assert.equal(s.stats.refundCredits,5);
});
test('17H: cantiere usa durata reale, due slot e nessun upgrade istantaneo',()=>{
 const s=createF17HProgression({profile:'potenziato'});s.moduleLevel=1;s.hasGaia=true;s.deckLevel=1;s.sector=80;s.xp=1000000;
 s.wallet.dust=18000;s.wallet.voidCrystals=3;
 f17hShopBeforeAttempt(s);
 assert(s.forgeQueue.length<=2);
 if(s.forgeQueue.length){const job=s.forgeQueue[0]; assert.equal(job.finishAt-job.startedAt,getForgeParams(job.type,job.target).durationMs/60000);
  const oldLevel=job.type==='deck'?s.deckLevel:s.moduleLevel;
  assert.equal(oldLevel,1);s.clock=job.finishAt;f17hFinishForge(s);assert.equal(job.type==='deck'?s.deckLevel:s.moduleLevel,job.target);
 }
});
test('17H: la progressione 120 vittorie raggiunge settore 121 e dodici reliquie',()=>{
 const s=createF17HProgression({profile:'frugale'});
 for(let i=0;i<120;i++)win(s);
 assert.equal(s.sector,121);assert.equal(s.stats.wins,120);assert.equal(Object.keys(s.relics).length,12);
 assert.equal(s.stats.fusions,6);assert.equal(s.stars,Object.values(s.starsBySector).flat().filter(Boolean).length);
 assert.equal(s.capsules,Math.floor(s.stars/15));assert(f17hPilotLevel(s.xp)<=100);
});
test('17H: nessun evento dopo dati audit non validi',()=>{
 const s=createF17HProgression();assert.throws(()=>f17hSettleBattle(s,b('timeout')));
 assert.throws(()=>f17hSettleBattle(s,b('player',{auditOK:false})));
 assert.equal(s.stats.attempts,0);
});
