import {writeFileSync} from 'node:fs';
import {getPhase4WeaponOptions,emptySuitTanks} from '../src/newCombat/phase4Weapons.js';
import {phase17EnemyLoadout,phase17EnemyWeaponLevels,phase17PlayerBattleLoadout,phase17PlayerWeaponLevels,phase17ExpectedPilotLevel,phase17PilotHp,phase17EnemyHp,phase17CampaignXpAward,phase17CampaignDustAward,phase17StartingAmmo} from '../src/newCombat/phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from '../src/newCombat/phase16ACatalog.js';
import {createPhase7Armory} from '../src/newCombat/phase7Armory.js';
let seed=17017;
const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const all=[];
for(const suit of ['hearts','diamonds','clubs','spades'])for(let value=1;value<=13;value++)all.push({id:`${suit}-${value}`,value,suit});
const combos=[];for(let a=0;a<4;a++){};
for(let a=0;a<7;a++)for(let b=a+1;b<7;b++)for(let c=b+1;c<7;c++)for(let d=c+1;d<7;d++)combos.push([a,b,c,d]);
function openingProbe(loadout,weaponLevels,jokers=0,samples=220){
  let canFire=0, canChoose=0, totalDamage=0;
  for(let n=0;n<samples;n++){
    const deck=[...all];if(jokers)deck.push({id:'joker1',value:0,suit:'joker',isJoker:true},{id:'joker2',value:0,suit:'joker',isJoker:true});
    for(let k=0;k<7;k++){const idx=k+Math.floor(rand()*(deck.length-k));[deck[k],deck[idx]]=[deck[idx],deck[k]];}
    const hand=deck.slice(0,7);
    let best=0,optionsSeen=false;
    for(const indices of combos){
      const board=[...indices.map(i=>hand[i]),null];
      const options=getPhase4WeaponOptions(board,loadout,phase17StartingAmmo(loadout),{weaponLevels});
      if(options.length)optionsSeen=true;
      for(const option of options)if(option.canFire)best=Math.max(best,option.potentialDamage);
    }
    if(optionsSeen)canChoose++;
    if(best>0){canFire++;totalDamage+=best;}
  }
  return {samples,optionRate:+(canChoose/samples*100).toFixed(1),fireRate:+(canFire/samples*100).toFixed(1),damageWhenFire:+(totalDamage/Math.max(1,canFire)).toFixed(1)};
}
const sectorAt=s=>({planet:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id,sector:(s-1)%10+1});
const armory=createPhase7Armory();
const balanceRows=[];
for(let s=1;s<=120;s++){
 const {planet,sector}=sectorAt(s),loadout=phase17EnemyLoadout(planet,sector),levels=phase17EnemyWeaponLevels(planet,sector);
 balanceRows.push({sectorGlobal:s,planetId:planet,planetName:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].name,sectorLocal:sector,pilotExpected:phase17ExpectedPilotLevel(s),pilotHp:phase17PilotHp(phase17ExpectedPilotLevel(s)),enemyHp:phase17EnemyHp(planet,sector),enemyLight:loadout.light,enemyMedium:loadout.medium,enemyHeavy:loadout.heavy||'',enemyWeaponLevel:levels.light,xpFirst:phase17CampaignXpAward(planet,sector),dustFirst:phase17CampaignDustAward(planet,sector)});
}
const cols=Object.keys(balanceRows[0]);writeFileSync('/mnt/data/eclissi_fase17b_work/FASE_17B_CURVA_120_SETTORI.csv',cols.join(',')+'\n'+balanceRows.map(row=>cols.map(k=>row[k]).join(',')).join('\n')+'\n');
const probes=[];
for(const s of [1,15,21,51,91,120]){
 const {planet,sector}=sectorAt(s),enemyLoadout=phase17EnemyLoadout(planet,sector);
 const enemyLevels=phase17EnemyWeaponLevels(planet,sector);
 const ownLoadout=phase17PlayerBattleLoadout(armory,planet,sector),ownLevels=phase17PlayerWeaponLevels(armory,ownLoadout);
 probes.push({sector:s,side:'starter',...openingProbe(ownLoadout,ownLevels,s>=15?2:0)});
 probes.push({sector:s,side:'enemy',...openingProbe(enemyLoadout,enemyLevels,s>=15?2:0)});
}
const h=Object.keys(probes[0]);writeFileSync('/mnt/data/eclissi_fase17b_work/FASE_17B_SONDA_POKER.csv',h.join(',')+'\n'+probes.map(row=>h.map(k=>row[k]).join(',')).join('\n')+'\n');
console.log('120 sectors table generated; probes:');console.table(probes);
