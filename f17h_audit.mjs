import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const p=new URL('../FASE_17H_RISULTATI_MULTISEED.json',import.meta.url);
const j=JSON.parse(readFileSync(p,'utf8'));
assert.equal(j.phase,'17H');assert.equal(j.campaignRuns,8);assert.equal(j.duels,1299);assert.equal(j.auditValid,1299);assert.equal(j.complete,8);
assert.equal(j.profiles.frugale.runs,5);
assert.deepEqual(j.profiles.frugale.epochs,[0,1,2,3,4]);
const runs=j.runs;
for(const run of runs){
 assert.equal(run.completed,true);assert.equal(run.sectorCompleted,120);assert.equal(run.wins,120);
 assert.equal(run.attempts,run.wins+run.losses+run.draws);
 assert.equal(run.relics,12);assert.equal(run.epicsFused,6);
 assert.equal(run.fusions,6);
 assert.equal(run.stats?.attempts,undefined);
 assert(run.refundCredits>=run.draws*5 && run.refundCredits<=run.draws*15);
 assert.equal(run.capsules,Math.floor(run.starsEarned/15));
 assert(run.forgeCompleted<=run.forgeStarted);
 assert.equal(run.flawlessBosses,12);
}
const file=readFileSync(new URL('../FASE_17H_TUTTE_CAMPAGNE_DUELLI.csv',import.meta.url),'utf8').trim().split('\n');
assert.equal(file.length-1,j.duels);
assert(!file.slice(1).some(row=>row.includes('"false"')&&row.includes('auditOK')));
const result={phase:'17H',verified:true,scenarios:8,duels:j.duels,auditValid:j.auditValid,frugaleIndependentSeeds:5,source:'tools/f17h_audit.mjs',issues:[]};
writeFileSync(new URL('../FASE_17H_AUDIT_INTEGRATO.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log('AUDIT 17H OK',JSON.stringify(result));
