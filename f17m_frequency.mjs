import {playF17GBattle} from './f17g_battle.mjs';
import {writeFileSync} from 'node:fs';
const sectors=(process.env.SECTORS||'21,25,30,39,40,49,50,59,60,79,80,89,90,99,100,109,110,119,120').split(',').map(Number);
const profiles=(process.env.PROFILES||'frugale,potenziato,tattico').split(',');
const replicas=Number(process.env.REPLICAS||6),budget=Number(process.env.BUDGET||24);
const rows=[];
for(const sector of sectors)for(const profile of profiles)for(let replica=0;replica<replicas;replica++){
 const b=playF17GBattle(sector,profile,replica,budget,null,2,{trackWeaponUsage:true});
 if(!b.auditOK)throw Error(JSON.stringify(b));
 const classes=Object.fromEntries(['light','medium','heavy'].map(cls=>[cls,Object.entries(b.weaponUsage?.player||{}).filter(([id])=>id.includes('_'+cls+'_')).reduce((a,[,v])=>({salvos:a.salvos+v.salvos,shots:a.shots+v.shots,damage:a.damage+v.damage}),{salvos:0,shots:0,damage:0})]));
 rows.push({sector,boss:sector%10===0,profile,replica,result:b.result,exchanges:b.exchanges,classes});
}
const summary={};for(const grp of ['normali','boss','all']){
 const a=rows.filter(r=>grp==='all'||(grp==='boss')===r.boss); const avg=(f)=>Number((a.reduce((p,r)=>p+f(r),0)/a.length).toFixed(3));
 summary[grp]={count:a.length,rounds:avg(r=>r.exchanges),wins:avg(r=>+(r.result==='player'))};
 for(const c of ['light','medium','heavy'])summary[grp][c]={salvos:avg(r=>r.classes[c].salvos),damage:avg(r=>r.classes[c].damage)};
}
const data={replicas,budget,rows,summary};
writeFileSync(process.env.OUT||'FASE_17M_FREQUENZE_BASE.json',JSON.stringify(data,null,2));console.log(JSON.stringify(summary,null,2));
