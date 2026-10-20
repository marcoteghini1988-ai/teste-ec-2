/** Audit d'integrita' dello stato di bilanciamento: non simula giocatori umani. */
import {writeFileSync,readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {ARSENAL_48} from '../src/newCombat/weaponCatalog.js';
import {getPhase4Profile} from '../src/newCombat/phase4Weapons.js';
import {PHASE16A_CAMPAIGN_PLANETS} from '../src/newCombat/phase16ACatalog.js';
import {F17_UNLOCKS,phase17Features,phase17EnemyHp,phase17PilotHp,phase17ExpectedPilotLevel,
 phase17EnemyDamageScale,phase17EnemyLoadout,phase17EnemyWeaponLevels,
 phase17CampaignDustAward,phase17CampaignXpAward} from '../src/newCombat/phase17Balance.js';
import {getPhase13BossPhases} from '../src/newCombat/phase13Campaign.js';
import {PHASE_MAX_SECONDS} from '../src/newCombat/config.js';
const status={ok:true,errors:[],checks:{weapons:0,sectors:0,heavy:0},timers:PHASE_MAX_SECONDS,pvpProductionIntegrated:false};
try{
 assert.equal(ARSENAL_48.length,48);assert.equal(new Set(ARSENAL_48.map(w=>w.id)).size,48);
 const grouped={};
 for(const w of ARSENAL_48){
  const k=`${w.rarityKey}:${w.weaponClass}`;grouped[k]=(grouped[k]||0)+1;
  assert(['hearts','diamonds','clubs','spades'].includes(w.ammoSuit));
  assert(w.allowedPokerPatterns.length>=2);
  for(let level=1;level<=4;level++){
   const p=getPhase4Profile(w.id,level);assert(p&&p.damagePerShot>0&&p.fullSalvo>0);
  }
  if(w.weaponClass==='heavy'){
   assert.equal(w.allowedPokerPatterns.filter(p=>p===w.secondaryActivationPattern).length,1);
   assert(!w.allowedPokerPatterns.includes('one_pair'));
   assert(!w.allowedPokerPatterns.includes('two_pair'));
   status.checks.heavy++;
  }
  status.checks.weapons++;
 }
 for(const rarity of ['common','rare','epic','legendary'])for(const cls of ['light','medium','heavy'])
  assert.equal(grouped[`${rarity}:${cls}`],4);
 assert.equal(PHASE16A_CAMPAIGN_PLANETS.length,12);
 for(let i=0;i<12;i++)for(let j=1;j<=10;j++){
  const planet=PHASE16A_CAMPAIGN_PLANETS[i].id,sector=j,s=i*10+j;
  const features=phase17Features(planet,sector);
  assert.equal(features.sector,s);
  assert.equal(features.allowHeavy,s>=F17_UNLOCKS.heavy);
  assert.equal(features.allowJokers,s>=F17_UNLOCKS.joker);
  assert.equal(features.allowEther,s>=F17_UNLOCKS.ether);
  assert(phase17EnemyHp(planet,sector)>0);
  assert(phase17PilotHp(phase17ExpectedPilotLevel(s))>0);
  assert(phase17EnemyDamageScale(planet,sector)>0&&phase17EnemyDamageScale(planet,sector)<=1);
  assert(phase17CampaignDustAward(planet,sector)>0);
  assert(phase17CampaignXpAward(planet,sector)>0);
  const loadout=phase17EnemyLoadout(planet,sector), levels=phase17EnemyWeaponLevels(planet,sector);
  assert(loadout.light&&loadout.medium&&(!features.allowHeavy||loadout.heavy));
  assert(Object.values(levels).every(l=>l>=1&&l<=4));
  if(j===10)assert.equal(getPhase13BossPhases(planet,j),1);
  status.checks.sectors++;
 }
 assert.deepEqual(PHASE_MAX_SECONDS,{attack:25,response:25,prepare:35});
 const early=JSON.parse(readFileSync('FASE_17P_VERIFICA_INIZIO.json','utf8'));
 assert.equal(early.rows.length,96);
 assert(early.rows.every(x=>x.auditOK&&['player','enemy','draw'].includes(x.result)));
 status.checks.testBattles=early.rows.length;
 const baseline=JSON.parse(readFileSync('FASE_17O_PVE_8.json','utf8'));
 const pvp=JSON.parse(readFileSync('FASE_17O_PVP_20.json','utf8'));
 assert.equal(baseline.rows.length,384);assert.equal(pvp.rows.length,240);
 assert([...baseline.rows,...pvp.rows].every(x=>x.auditOK));
 status.checks.historicalBattles=624;
 status.limits=['IA simulata, non giocatori umani','Le durate temporali dipendono dalle conferme umane','PvP online usa il GameScreen storico','Browser e telefono non collaudati finche le dipendenze npm non sono disponibili'];
}catch(e){status.ok=false;status.errors.push(e.stack||String(e));}
writeFileSync('FASE_17P_AUDIT_FINALE.json',JSON.stringify(status,null,2));
console.log(JSON.stringify(status,null,2));
if(!status.ok)process.exitCode=1;
