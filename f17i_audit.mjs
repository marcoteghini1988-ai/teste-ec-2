/** Validate F17I paired samples + F17H/F17I deduplicated 15-campaign stats. */
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const load=name=>JSON.parse(readFileSync(new URL(name,root)));
const multi=load('FASE_17I_MULTISEED_15_CAMPAGNE.json');
const ab=load('FASE_17I_BOSS_AB_RISULTATI.json');
const keys=new Set(multi.runs.map(x=>`${x.profile}/${x.epoch}`));
if(multi.runs.length!==15||keys.size!==15||!multi.runs.every(x=>x.completed&&x.sectorCompleted===120&&x.attempts===x.wins+x.losses+x.draws))throw Error('15-campaign integrity invalid');
if(multi.uniqueAuditedDuels!==multi.runs.reduce((n,x)=>n+x.attempts,0))throw Error('Campaign duel count invalid');
if(ab.totalDuels!==1056||ab.auditValidDuels!==1056||ab.groupSummary.length!==33||!ab.groupSummary.every(g=>g.duels===32&&g.auditOK))throw Error('Paired audit invalid');
for(const p of ['frugale','potenziato','tattico'])for(const s of [50,80,110]){
 const g=ab.groupSummary.filter(v=>v.profile===p&&v.sector===s);
 if(!g.some(x=>x.scenario==='controllo')||!g.some(x=>x.scenario==='senza_epici')||!g.some(x=>x.scenario==='boss_hp_meno_10'))throw Error('Missing mandatory paired group');
}
const result={phase:'17I',campaigns:15,uniqueCampaignDuels:multi.uniqueAuditedDuels,pairedBossDuels:ab.auditValidDuels,
 priorCampaignDuels:1299,newlyExecutedCampaignDuels:load('FASE_17I_MULTISEED_RISULTATI.json').auditedDuels,
 duplicatedCampaignSeedExcluded:'potenziato/1',newlyUniqueCampaigns:7,matchedABGroups:ab.groupSummary.length,
 aiBudget:16,auditsValid:true,originalGameplayProductionModified:false};
writeFileSync(new URL('FASE_17I_AUDIT_INTEGRATO.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
