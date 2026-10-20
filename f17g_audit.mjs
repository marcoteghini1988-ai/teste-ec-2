/** Fase 17G: verifica ex-post dei dati pubblicati, non un sostituto dei test motore. */
import {readFileSync,writeFileSync} from 'node:fs';
import {f17dSectorCost} from '../src/newCombat/phase17DEconomy.js';
const root=new URL('../',import.meta.url);
const load=(name)=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const parseCsv=(name)=>{
 const raw=readFileSync(new URL(name,root),'utf8').trim().split(/\r?\n/);
 const header=raw[0].split(',');return raw.slice(1).map(row=>{
  const fields=[],rx=/(?:"(?:[^"\\]|\\.)*"|[^,]*)(?:,|$)/g;let m;
  while((m=rx.exec(row))&&m[0]){const s=m[0].endsWith(',')?m[0].slice(0,-1):m[0];fields.push(s===''?'':JSON.parse(s));if(!m[0].endsWith(','))break;}
  return Object.fromEntries(header.map((key,i)=>[key,fields[i]]));
 });
};
const campaign=load('FASE_17G_CAMPAGNA_SEQUENZIALE_RISULTATI.json');
const rows=parseCsv('FASE_17G_CAMPAGNA_SEQUENZIALE_DUELLI.csv');
const boss=load('FASE_17G_BOSS_S50_S60_RISULTATI.json');
const poker=load('FASE_17G_48_ARMI_DISPONIBILITA_POKER.json');
const errors=[];
for(const s of campaign.summaries){
 const runs=rows.filter(r=>r.profile===s.profile);
 if(runs.length!==s.attempts)errors.push(`${s.profile}: attempts ${runs.length} != ${s.attempts}`);
 if(!runs.every(r=>r.auditOK&&['player','enemy','draw'].includes(r.result)))errors.push(`${s.profile}: audit/stato battaglia`);
 if(runs.filter(r=>r.result==='player').length!==s.wins||runs.filter(r=>r.result!=='player').length!==s.losses)errors.push(`${s.profile}: partite vinte/perse`);
 if(runs.reduce((a,r)=>a+f17dSectorCost((r.sector-1)%10+1),0)!==s.spentCredits)errors.push(`${s.profile}: crediti totali`);
 if(runs.some(r=>r.creditBalance<0||r.actualPilotLevel<1||r.actualPilotLevel>100))errors.push(`${s.profile}: saldi o livelli invalidi`);
 for(let sec=1;sec<=s.sectorCompleted;sec++){
  const block=runs.filter(r=>r.sector===sec);
  if(!block.length||block.at(-1).result!=='player'||block.slice(0,-1).some(r=>r.result==='player'))errors.push(`${s.profile}: settore ${sec} non sequenziale`);
 }
 if(s.completed!== (s.wins===120))errors.push(`${s.profile}: completamento`);
}
if(boss.groups.some(g=>!g.auditValid||g.duels!==boss.replicas))errors.push('Boss: audit o numero prove non valido');
if(poker.rows.length!==48||poker.rows.some(r=>r.openingPct>r.oneBankPct))errors.push('48 armi: conteggi fuori limite');
const report={phase:'17G',auditedBattles:rows.length,validBattleAudits:rows.filter(r=>r.auditOK).length,completedProfiles:campaign.summaries.filter(r=>r.completed).length,bossProbeBattles:boss.groups.reduce((a,b)=>a+b.duels,0),pokerWeapons:poker.rows.length,pokerHands:poker.reps,errors,passed:errors.length===0};
writeFileSync(new URL('FASE_17G_AUDIT_INTEGRATO.json',root),JSON.stringify(report,null,2)+'\n');
console.log(report);
if(errors.length)process.exitCode=1;
