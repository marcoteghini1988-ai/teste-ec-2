/** F17J: 48 armi misurate nel motore di duello completo (NON simulazione acquisti).
 * Per isolare le condizioni di sparo si inserisce UNA arma di test in uno slot
 * con livello pari al livello gia raggiunto nel medesimo slot dal profilo frugale.
 * Il test e' controfattuale: NESSUNA arma viene regalata nel percorso economico.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {ARSENAL_48} from '../src/newCombat/weaponCatalog.js';
import {f17jWeaponCatalogAudit} from '../src/newCombat/tacticalAnalysis.js';
import {playF17GBattle} from './f17g_battle.mjs';
const dir=new URL('../',import.meta.url);
const snapshots=JSON.parse(readFileSync(new URL('FASE_17I_EQUIPAGGIAMENTI_REALI.json',dir))).snapshots;
const ref=snapshots.find(x=>x.profile==='frugale'&&x.sector===110);
const src=readFileSync(new URL('FASE_17G_48_ARMI_DISPONIBILITA_POKER.csv',dir),'utf8').trim().split('\n');
const rates=Object.fromEntries(src.slice(1).map(line=>{const a=line.split(',');return [JSON.parse(a[0]),Number(a[6])];}));
const catalog=f17jWeaponCatalogAudit(rates);
const EPOCHS=Number(process.env.EPOCHS||5),BUDGET=Number(process.env.BUDGET||16),SECTOR=110;
const rows=[];
for(const w of ARSENAL_48){
 const gear=structuredClone(ref.gear),current=gear.armory.equipped[w.weaponClass];
 const inheritedLevel=gear.armory.levels[current];
 gear.armory.owned[w.id]=true;gear.armory.levels[w.id]=inheritedLevel;
 gear.armory.equipped[w.weaponClass]=w.id;
 for(let epoch=0;epoch<EPOCHS;epoch++){
  const r=playF17GBattle(SECTOR,'frugale',0,BUDGET,gear,epoch,{trackWeaponUsage:true});
  if(!r.auditOK||!['player','enemy','draw'].includes(r.result))throw Error(`${w.id} epoch${epoch}: ${r.errors}`);
  const t=r.weaponUsage.player[w.id]||{salvos:0,shots:0,damage:0,ammoGained:0};
  rows.push({weaponId:w.id,rarity:w.rarityKey,weaponClass:w.weaponClass,epoch,sector:SECTOR,trialLevel:inheritedLevel,simulatedNotPurchased:true,result:r.result,exchanges:r.exchanges,playerPasses:r.playerPasses,playerDamage:r.playerDamage,usageSalvos:t.salvos,usageShots:t.shots,usageDamage:t.damage,usageAmmoGained:t.ammoGained,auditOK:r.auditOK});
 }
 console.log('weapon probe',w.id,rows.length,'duels');
}
const summary=catalog.map(c=>{
 const data=rows.filter(x=>x.weaponId===c.id),sum=k=>data.reduce((a,b)=>a+b[k],0);
 return {...c,duels:data.length,usedInBattles:data.filter(x=>x.usageSalvos>0).length,usagePct:+(100*data.filter(x=>x.usageSalvos>0).length/data.length).toFixed(1),avgSalvos:+(sum('usageSalvos')/data.length).toFixed(3),avgShots:+(sum('usageShots')/data.length).toFixed(3),avgDamageFromTestWeapon:+(sum('usageDamage')/data.length).toFixed(2),duelWinPct:+(100*data.filter(x=>x.result==='player').length/data.length).toFixed(1)};
});
writeFileSync(new URL('FASE_17J_AUDIT_48_DUELS.csv',dir),[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(x=>JSON.stringify(x)).join(','))].join('\n')+'\n');
writeFileSync(new URL('FASE_17J_AUDIT_48_ARMI.csv',dir),[Object.keys(summary[0]).join(','),...summary.map(r=>Object.values(r).map(x=>JSON.stringify(x)).join(','))].join('\n')+'\n');
writeFileSync(new URL('FASE_17J_AUDIT_48_ARMI.json',dir),JSON.stringify({phase:'17J',description:'Campione limitato 5 semi, settore 110, livello dello slot sostituito. Ogni arma in un equipaggiamento virtuale, NON acquistato. Banco, mano, seme, Jolly, calore e IA gestiti dal motore di battaglia; non indica la probabilità generica di utilizzo in tutti i settori.',budget:BUDGET,epochs:EPOCHS,totalDuels:rows.length,auditOK:rows.every(x=>x.auditOK),summary},null,2)+'\n');
console.log('Completed',rows.length,rows.every(x=>x.auditOK));
