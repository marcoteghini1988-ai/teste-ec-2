import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {f17dSector,f17dWalletCap,f17dSectorCost,f17dCampaignReward,f17dCapsuleReward,simulateF17DEconomy} from './phase17DEconomy.js';
import {phase17CampaignDustAward,phase17CampaignXpAward,phase17ExpectedPilotLevel} from './phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {normalizePhase7Armory,getPhase7ArmoryPrice,createPhase7Armory} from './phase7Armory.js';
import {getWeaponDefinition} from './weaponCatalog.js';

test('17D: pianeti in ordine storico, 120 settori e costo crediti 960',()=>{
 let credits=0;
 for(let s=1;s<=120;s++){
  const entry=f17dSector(s);
  assert.equal(entry.planet,PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id);
  credits+=f17dSectorCost(entry.sector);
 }
 assert.equal(credits,960);
 assert.throws(()=>f17dSector(121));
});
test('17D: premio di campagna riproduce App (no reward casuale inventato)',()=>{
 for(let s=1;s<=120;s++){
  const {planet,sector}=f17dSector(s);
  const r=f17dCampaignReward(planet,sector);
  const extra=sector===10?150+planet*15:0;
  assert.equal(r.dust,phase17CampaignDustAward(planet,sector)+extra);
  assert.equal(r.diamonds,sector===5?3:sector===10?Math.floor(6+planet*.5):0);
  assert.equal(r.xp,phase17CampaignXpAward(planet,sector));
  assert.equal(f17dCampaignReward(planet,sector,{replay:true}).xp,phase17CampaignXpAward(planet,sector,true));
  assert.equal(f17dCampaignReward(planet,sector,{flawlessBoss:true}).dust,r.dust*(sector===10?2:1));
 }
});
test('17D: tetti portafoglio e capsule 360 stelle uguali alla UI',()=>{
 assert.deepEqual([1,14,15,30,31,50,66,85,100].map(f17dWalletCap),[1500,1500,2500,2500,5000,7500,12500,20000,20000]);
 assert.equal(f17dCapsuleReward(90).unlockItem.id,'entropic_refraction');
 assert.equal(f17dCapsuleReward(180).unlockItem.id,'singularity_core');
 assert.equal(f17dCapsuleReward(270).unlockItem.id,'ophiuchus');
 assert.equal(f17dCapsuleReward(360).unlockItem.id,'supreme_eclipse');
 assert.equal(f17dCapsuleReward(360).dust,3000);
 assert.throws(()=>f17dCapsuleReward(375));
});
test('17D: ogni scenario con armi acquistate e portafoglio mai negativo',()=>{
 for(const profile of ['frugale','equilibrato','potenziato','stress_concentrato'])for(const starsPerSector of [1,2,3]){
  const r=simulateF17DEconomy({profile,starsPerSector});
  assert.equal(r.ledger.length,120);
  assert.equal(r.summary.finalLevel,100);
  assert.equal(r.summary.creditsRequired,960);
  assert.equal(r.summary.firstCreditShortage,27);
  assert.equal(r.summary.capsulesClaimed,starsPerSector*8);
  assert.equal(r.summary.battleWinRateMeasured,false);
  assert.equal(r.summary.earnedXp,491235);
  assert(!r.summary.assumedRiftFused);
  assert(r.ledger.every(v=>v.afterRewardDust>=0&&v.afterRewardDust<=f17dWalletCap(v.pilotLevelAfter)));
  assert(r.purchases.every(p=>p.dust>=0&&p.diamonds>=0));
  for(const line of r.ledger){
   const normalized=normalizePhase7Armory(line.armory);
   assert.deepEqual(normalized,line.armory);
   for(const [c,id] of Object.entries(line.equipped)){if(!id)continue;assert(normalized.owned[id]);assert.equal(getWeaponDefinition(id).weaponClass,c);}
   if(line.globalSector<21)assert.equal(line.equipped.heavy,null);
   if(line.globalSector<51)assert(!Object.values(line.equipped).some(id=>getWeaponDefinition(id)?.rarityKey==='epic'));
   if(line.globalSector<91)assert(!Object.values(line.equipped).some(id=>getWeaponDefinition(id)?.rarityKey==='legendary'));
  }
 }
});
test('17D: acquisti conteggiati senza regali, starter compatibile con 17C',()=>{
 const x=simulateF17DEconomy({profile:'frugale',starsPerSector:1});
 assert.deepEqual(x.ledger[0].equipped,createPhase7Armory().equipped);
 assert.equal(x.ledger[0].moduleLevel,0);
 assert.equal(x.ledger[8].moduleLevel,1); // Ariete gratuito S9
 assert.equal(x.ledger[9].deckId,'aries'); // mazzo onboarding S10, non Gaia
 assert.equal(x.ledger[19].epics.length,0); // fusione NON automatica
 assert.equal(x.summary.diamondsSpent,0);
 assert.equal(x.purchases.filter(a=>a.item.startsWith('arma ')).length,1); // solo Pesante
 assert.equal(x.purchases.find(a=>a.item.startsWith('arma ')).dust,getPhase7ArmoryPrice('es_common_heavy_01'));
});
test('17D: punti di controllo sorgenti UI, senza revisione prematura dei tutorial',()=>{
 const ui=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 for(const x of ['const getLevelReward = (planet, level, isReplay)', 'const getStardustWalletCap = (lvl)', 'const getStarCapsuleReward = (milestone)', 'const cost = (levelNum <= 5 ? 5 : (levelNum <= 9 ? 10 : 15))','buyPhase7Weapon(armoryV2, weaponId, stardust,level)'])assert(ui.includes(x),x);
 assert(ui.includes('recovered = Math.floor(elapsed / 180000)'));
});
