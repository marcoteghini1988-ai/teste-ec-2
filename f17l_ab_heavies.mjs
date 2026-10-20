/** 17L — comparison in actual simulator, without writing to the game catalog. */
import {writeFileSync} from 'node:fs';
import {ARSENAL_48} from '../src/newCombat/weaponCatalog.js';
import {playF17GBattle} from './f17g_battle.mjs';
const heavies=ARSENAL_48.filter(w=>w.weaponClass==='heavy');
const sectors=[21,51,80,110],replicas=3,budget=16,profiles=['potenziato'];
const rows=[];
for(const mode of ['originale','doppia_attivazione']){
 const removed=[];
 try {
  if(mode==='originale')for(const weapon of heavies){
   const idx=weapon.allowedPokerPatterns.indexOf(weapon.secondaryActivationPattern);
   if(idx<0)throw Error('secondary mode missing: '+weapon.id);
   weapon.allowedPokerPatterns.splice(idx,1);removed.push([weapon,idx]);
  }
  for(const sector of sectors)for(const profile of profiles)for(let replica=0;replica<replicas;replica++){
   const b=playF17GBattle(sector,profile,replica,budget,null,0,{trackWeaponUsage:true});
   if(!b.auditOK || b.result==='error')throw Error(JSON.stringify({sector,profile,replica,error:b.errors}));
   const heavyShots=Object.entries(b.weaponUsage?.player||{}).filter(([id])=>id.includes('_heavy_')).reduce((sum,[,v])=>sum+v.shots,0);
   rows.push({mode,sector,profile,replica,winner:b.result,rounds:b.exchanges,heavyShots,playerDamage:b.playerDamage,enemyDamage:b.enemyDamage});
  }
 }finally{
  for(const [weapon,idx] of removed)weapon.allowedPokerPatterns.splice(idx,0,weapon.secondaryActivationPattern);
 }
}
const aggregate=Object.fromEntries(['originale','doppia_attivazione'].map(mode=>{
 const sub=rows.filter(x=>x.mode===mode);
 const avg=field=>+(sub.reduce((a,r)=>a+r[field],0)/sub.length).toFixed(2);
 return [mode,{battles:sub.length,wins:sub.filter(x=>x.winner==='player').length,avgRounds:avg('rounds'),avgHeavyShots:avg('heavyShots'),avgDamage:avg('playerDamage')}];
}));
const result={status:'sonda_preliminare_non_bilanciamento_definitivo',budget,sectors,replicas,aggregate,rows};
writeFileSync('FASE_17L_AB_DUELLI.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(aggregate,null,2));
