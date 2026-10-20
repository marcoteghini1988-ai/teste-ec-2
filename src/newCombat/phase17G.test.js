import test from 'node:test';
import assert from 'node:assert/strict';
import {createF17GProgression,f17gAdvanceCredits,f17gSettleBattle,f17gPilotLevel,f17gShopBeforeAttempt,f17gCurrentEquipment} from './phase17GProgression.js';
import {simulateF17DEconomy,f17dCampaignReward} from './phase17DEconomy.js';
import {getWeaponDefinition} from './weaponCatalog.js';
import {ARMORY_STARTERS} from './phase7Armory.js';

const result=(winner,extras={})=>({result:winner,auditOK:true,exchanges:4,battleCreditsEarned:0,battleDustEarned:0,battleDiamondsEarned:0,...extras});
test('17G: il profilo tattico usa transazioni reali, senza arma Pesante gratuita prima del 21',()=>{
 const x=simulateF17DEconomy({profile:'tattico',starsPerSector:2});
 assert.equal(x.ledger.length,120);
 assert.equal(x.ledger[0].equipped.heavy,null);
 assert.equal(x.ledger[19].equipped.heavy,null);
 assert.equal(x.ledger[20].equipped.heavy,null); // possibile ritardo per Polvere insufficiente
 assert.equal(x.ledger[21].equipped.heavy,'es_common_heavy_01');
 assert.equal(x.ledger[119].equipped.medium,'es_rare_medium_03');
 assert.equal(x.ledger[119].equipped.light,'es_legendary_light_02');
 assert(x.purchases.some(t=>t.item==='arma es_legendary_light_02'));
 for(const w of Object.values(x.ledger[119].equipped))assert(getWeaponDefinition(w));
});
test('17G: il nuovo piano non modifica starter/ID storici',()=>{
 const s=createF17GProgression();f17gShopBeforeAttempt(s);
 assert.deepEqual(s.armory.equipped,ARMORY_STARTERS);
 assert.deepEqual(s.armory.equipped,{light:'es_common_light_01',medium:'es_common_medium_03',heavy:null});
});
test('17G: sconfitta non sblocca settore o premio di prima vittoria, ma assegna telemetria',()=>{
 const s=createF17GProgression();f17gShopBeforeAttempt(s);
 f17gSettleBattle(s,result('enemy',{exchanges:4}));
 assert.equal(s.sector,1);
 assert.equal(s.stats.losses,1);
 assert.equal(s.stats.wins,0);
 assert.equal(s.xp,32);
 assert.equal(s.stats.earnedTelemetryDust,46);
 assert.equal(s.stars,0);
});
test('17G: premio dorato accredita anche in sconfitta e non clampa crediti a 200',()=>{
 const s=createF17GProgression();
 f17gSettleBattle(s,result('enemy',{battleCreditsEarned:15,battleDiamondsEarned:2,battleDustEarned:20}));
 assert(s.wallet.credits>200);
 assert.equal(s.wallet.diamonds,2);
 assert.equal(s.stats.earnedGoldenCredits,15);
 assert.equal(s.sector,1);
});
test('17G: Draw non sblocca settore e non finge una vittoria',()=>{
 const s=createF17GProgression();f17gSettleBattle(s,result('draw'));
 assert.equal(s.stats.losses,1);
 assert.equal(s.sector,1);
});
test('17G: vittoria accredita una sola volta XP, stelle, capsula e passa al settore seguente',()=>{
 const s=createF17GProgression({starsPerSector:3});
 for(let i=0;i<5;i++){
  const sec=i+1;
  f17gShopBeforeAttempt(s);
  f17gSettleBattle(s,result('player'));
  assert.equal(s.sector,sec+1);
 }
 assert.equal(s.stats.attempts,5);
 assert.equal(s.stars,15);
 assert.equal(s.capsules,1);
 assert.equal(s.stats.losses,0);
});
test('17G: 120 prime vittorie senza sconfitte mantengono campagna e pilota 100',()=>{
 const s=createF17GProgression({profile:'tattico',starsPerSector:2});
 for(let i=0;i<120;i++){
  f17gShopBeforeAttempt(s);
  f17gSettleBattle(s,result('player'));
 }
 assert.equal(s.sector,121);
 assert.equal(s.stats.wins,120);
 assert.equal(s.stars,240);
 assert.equal(s.capsules,16);
 assert.equal(f17gPilotLevel(s.xp),100);
 assert.equal(s.stats.spentCredits,960);
 assert(s.stats.waitMinutes>0);
});
test('17G: ricarica Crediti limita al cap ma non cancella ricompense oltre cap',()=>{
 const s=createF17GProgression();s.wallet.credits=199;
 f17gAdvanceCredits(s,10);
 assert.equal(s.wallet.credits,200);
 assert.equal(s.creditClock,0);
 s.wallet.credits=230;
 f17gAdvanceCredits(s,60);
 assert.equal(s.wallet.credits,230);
 assert.equal(s.creditClock,0);
});
test('17G: negozio usa il livello XP realmente guadagnato da vittorie e sconfitte',()=>{
 const s=createF17GProgression({profile:'tattico'});
 s.xp=1000000;
 f17gShopBeforeAttempt(s);
 assert(f17gCurrentEquipment(s).pilotLevel===100);
 assert.equal(s.armory.equipped.heavy,null);
});
test('17G: esclude conteggio di duelli non auditati e di timeout',()=>{
 const s=createF17GProgression();
 assert.throws(()=>f17gSettleBattle(s,result('timeout')));
 assert.throws(()=>f17gSettleBattle(s,result('player',{auditOK:false})));
 assert.equal(s.sector,1);assert.equal(s.stats.attempts,0);
});
