import {writeFileSync} from 'node:fs';
import {PHASE16A_CAMPAIGN_PLANETS} from '../src/newCombat/phase16ACatalog.js';
import {phase17ExpectedPilotLevel,phase17PilotHp,phase17EnemyHp,phase17CampaignXpAward,phase17CampaignDustAward,phase17EnemyLoadout,phase17EnemyWeaponLevels,phase17EnemyDamageScale} from '../src/newCombat/phase17Balance.js';
import {getPhase4Profile} from '../src/newCombat/phase4Weapons.js';
const rows=[];
for(let s=1;s<=120;s++){
 const {id,name}=PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)],sector=(s-1)%10+1;
 const arms=phase17EnemyLoadout(id,sector), levels=phase17EnemyWeaponLevels(id,sector);
 rows.push({settoreGlobale:s,pianeta:name,pianetaId:id,settorePianeta:sector,
  livelloPilotaIngresso:phase17ExpectedPilotLevel(s-1),hpGiocatoreIngresso:phase17PilotHp(phase17ExpectedPilotLevel(s-1)),
  livelloPilotaDopoPrimaVittoria:phase17ExpectedPilotLevel(s),hpGiocatoreDopoPrimaVittoria:phase17PilotHp(phase17ExpectedPilotLevel(s)),
  hpNemico:phase17EnemyHp(id,sector),dannoIAfattore:phase17EnemyDamageScale(id,sector),
  armaLeggeraNemica:arms.light,armaMediaNemica:arms.medium,armaPesanteNemica:arms.heavy||'',livelloArmiNemiche:levels.light,
  colpiLeggeraSalva:getPhase4Profile(arms.light,levels.light).damagePerShot*4,
  colpiMediaSalva:getPhase4Profile(arms.medium,levels.medium).damagePerShot*4,
  colpiPesanteSalva:arms.heavy?getPhase4Profile(arms.heavy,levels.heavy).damagePerShot*2:0,
  esperienzaPrimaVittoria:phase17CampaignXpAward(id,sector),polverePrimaVittoria:phase17CampaignDustAward(id,sector)});
}
const header=Object.keys(rows[0]);
const csv=header.join(',')+'\n'+rows.map(row=>header.map(k=>JSON.stringify(row[k])).join(',')).join('\n')+'\n';
writeFileSync(new URL('../FASE_17C_CURVA_120_SETTORI.csv',import.meta.url),csv);
console.log('Generated',rows.length,'records, boss final',rows.at(-1));
