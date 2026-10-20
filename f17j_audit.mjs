/** Verifica file risultati F17J; non legge lo stato del gioco. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const data=name=>JSON.parse(readFileSync(new URL(`../${name}`,import.meta.url),'utf8'));
const audit48=data('FASE_17J_AUDIT_48_ARMI.json');
const b12=data('FASE_17J_AB_POSSEDUTE_B12.json');
const b16=data('FASE_17J_AB_POSSEDUTE_B16.json');
const normals=data('FASE_17J_NORMALI_AB.json');
const lines=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8').trim().split('\n').length-1;
assert.equal(audit48.totalDuels,384);assert.equal(audit48.summary.length,48);assert.equal(new Set(audit48.summary.map(x=>x.id)).size,48);assert.equal(lines('FASE_17J_AUDIT_48_DUELS.csv'),384);
assert.equal(b12.totalDuels,320);assert.equal(lines('FASE_17J_AB_POSSEDUTE_B12.csv'),320);
assert.equal(b16.totalDuels,160);assert.equal(lines('FASE_17J_AB_POSSEDUTE_B16.csv'),160);
assert.equal(normals.totalDuels,240);assert.equal(lines('FASE_17J_NORMALI_AB.csv'),240);
assert.ok([audit48,b12,b16,normals].every(x=>x.auditOK));
assert.deepEqual(b12.groups.filter(x=>x.changes.length).map(x=>`${x.profile}:${x.sector}`),['potenziato:80']);
assert.deepEqual(b16.groups.filter(x=>x.changes.length).map(x=>`${x.profile}:${x.sector}`),['potenziato:80']);
const report={phase:'17J',previous:'17I',duelsBySource:{catalog48:audit48.totalDuels,ownedABbudget12:b12.totalDuels,ownedABbudget16:b16.totalDuels,normalOwnedAB:normals.totalDuels},totalNewDuels:audit48.totalDuels+b12.totalDuels+b16.totalDuels+normals.totalDuels,allAuditOK:true,uniqueWeapons:audit48.summary.length,comparisonBudget12:b12.groups.find(x=>x.changes.length>0),comparisonBudget16:b16.groups.find(x=>x.changes.length>0),normalGroups:normals.groups,restrictions:['catalog counterfactual NOT economically purchased','only owned alternatives in AB','normal segment freezes sector-80 gear','budget 12/16 vs UI 2200','very small sample per individual weapon','NO production gameplay balances changed']};
writeFileSync(new URL('../FASE_17J_AUDIT_COMPLETO.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('F17J AUDIT OK',report.totalNewDuels,'full battles +',report.uniqueWeapons,'unique weapons');
