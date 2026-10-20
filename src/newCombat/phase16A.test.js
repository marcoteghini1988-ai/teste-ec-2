import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASE16A_CAMPAIGN_PLANETS,PHASE16A_CAMPAIGN_PLANET_IDS,PHASE16A_RIFTS,PHASE16A_CONTENT,PHASE16A_STAR_MILESTONES, getCampaignPlanetIndex,getVisibleCampaignPlanet,getNextCampaignPlanet,getGlobalCampaignSector,getCampaignStarsTotal,migrateCampaignCapsuleClaims } from './phase16ACatalog.js';
test('16A: 12 pianeti ordinati, 120 settori, boss finali di ciascun pianeta',()=>{
 assert.equal(PHASE16A_CAMPAIGN_PLANETS.length,12);
 assert.deepEqual(PHASE16A_CAMPAIGN_PLANET_IDS,[1,2,3,6,7,8,9,11,14,17,19,20]);
 assert(PHASE16A_CAMPAIGN_PLANETS.every(p=>p.bossSector===10));
 assert.equal(new Set(PHASE16A_CAMPAIGN_PLANET_IDS).size,12);
 assert.equal(getGlobalCampaignSector(20,{20:11}),120);
 assert.equal(getGlobalCampaignSector(6,{6:1}),31);
});
test('16A: salvataggi vecchi non rinumerati, progressione salta pianeti esclusi',()=>{
 assert.equal(getNextCampaignPlanet(3),6);
 assert.equal(getNextCampaignPlanet(8),9);
 assert.equal(getNextCampaignPlanet(20),null);
 assert.equal(getVisibleCampaignPlanet(5),3);
 assert.equal(getCampaignPlanetIndex(18),10);
 assert.equal(getCampaignPlanetIndex(20),12);
});
test('16A: 12 reliquie, sei fusioni di due, tutti differenti',()=>{
 assert.equal(PHASE16A_RIFTS.length,6);
 assert.equal(new Set(PHASE16A_RIFTS.map(r=>r.id)).size,6);
 assert.equal(new Set(PHASE16A_RIFTS.map(r=>r.itemId)).size,6);
 const relics=PHASE16A_RIFTS.flatMap(r=>r.relicsRequired);
 assert.equal(new Set(relics).size,12);
 assert.deepEqual(relics,PHASE16A_CAMPAIGN_PLANET_IDS.map(id=>`relic_p${id}`));
 assert(PHASE16A_RIFTS.every(r=>r.id.startsWith('rift_16a_')));
});
test('16A: stelle da soli settori selezionati, capsule max 360',()=>{
 const map={'P1_L1':[true,true,true],'P4_L1':[true,true,true],'P20_L10':[true,true,false]};
 assert.equal(getCampaignStarsTotal(map),5);
 assert.equal(PHASE16A_STAR_MILESTONES.length,24);
 assert.equal(PHASE16A_STAR_MILESTONES.at(-1),360);
});
test('16A: ricompense capsule pregresse mantenute, collezioni non distrutte',()=>{
 const old={90:true,210:true,390:true,600:true,15:true};
 const migrated=migrateCampaignCapsuleClaims(old);
 assert.deepEqual(old,{90:true,210:true,390:true,600:true,15:true});
 assert.equal(migrated[180],true);assert.equal(migrated[270],true);assert.equal(migrated[360],true);
 assert.equal(migrated[600],true);assert.equal(migrated[15],true);
});
test('16A: 12 zodiacali, 20 planetari, 16 piloti, due mazzi capsule',()=>{
 assert.equal(PHASE16A_CONTENT.zodiacModules.length,12);
 assert.equal(PHASE16A_CONTENT.extraPlanetModules.length,20);
 assert.equal(PHASE16A_CONTENT.pilotIds.length,16);
 assert.equal(PHASE16A_CONTENT.capsuleDecks.length,2);
 assert.equal(PHASE16A_CONTENT.terrainIds.length,8);
});
