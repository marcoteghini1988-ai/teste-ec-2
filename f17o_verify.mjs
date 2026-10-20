// Verifica indipendente dei risultati Fase 17O, senza modificare le regole del gioco.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=file=>JSON.parse(readFileSync(file,'utf8'));
const pve=load('FASE_17O_PVE_8.json'),pvp=load('FASE_17O_PVP_20.json');
const types=['principiante','base','intermedio','esperto'];
assert.equal(pve.rows.length,384);assert.equal(pvp.rows.length,240);
for(const row of [...pve.rows,...pvp.rows]){
 assert.equal(row.auditOK,true,`Audit non valido ${JSON.stringify(row)}`);
 assert.notEqual(row.result,'error');
 assert.ok(types.includes(row.tier)&&types.includes(row.opponentTier));
 assert.ok(row.exchanges>=0&&row.exchanges<=40);
 for(const cls of ['light','medium','heavy'])for(const side of ['player','enemy'])assert.ok(Number.isInteger(row.classes[side][cls])&&row.classes[side][cls]>=0);
}
const fraction=(a,b)=>Math.round(1000*a/b)/10;
const avg=(items,fn)=>Math.round(items.reduce((s,x)=>s+fn(x),0)/items.length*100)/100;
const pveResults=[];
for(const tier of types)for(const boss of [false,true]){
 const sub=pve.rows.filter(r=>r.tier===tier&&(r.sector%10===0)===boss);
 assert.equal(sub.length,48);
 pveResults.push({type:tier,mode:boss?'boss':'normal',duels:sub.length,won:sub.filter(r=>r.result==='player').length,winPct:fraction(sub.filter(r=>r.result==='player').length,sub.length),exchanges:avg(sub,r=>r.exchanges),light:avg(sub,r=>r.classes.player.light),medium:avg(sub,r=>r.classes.player.medium),heavy:avg(sub,r=>r.classes.player.heavy),swaps:avg(sub,r=>r.swaps.player)});
}
const pairs=[];
for(let i=0;i<types.length;i++)for(let j=i+1;j<types.length;j++){
 const a=types[i],b=types[j];
 const sub=pvp.rows.filter(r=>new Set([r.tier,r.opponentTier]).has(a)&&new Set([r.tier,r.opponentTier]).has(b));
 assert.equal(sub.length,40);
 const won=t=>sub.filter(r=>r.result==='player'&&r.tier===t||r.result==='enemy'&&r.opponentTier===t).length;
 pairs.push({playerA:a,playerB:b,duels:40,winsA:won(a),winsB:won(b),draw:sub.filter(r=>r.result==='draw').length,timeout:sub.filter(r=>r.result==='timeout').length,exchanges:avg(sub,r=>r.exchanges)});
}
const result={pveDuels:pve.rows.length,pvpDuels:pvp.rows.length,auditValid:624,pvpConcluded:pvp.rows.filter(r=>r.result!=='timeout').length,notes:'Quattro modelli sperimentali offline; 7 carte reali, 5 slot condivisi, due operazioni di cambio (1-3 carte ciascuna), stesso equipaggiamento per entrambi in PvP, nessun limite forzato alle Pesanti.',pve:pveResults,pvp:pairs};
writeFileSync('FASE_17O_RISULTATI.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({valid:624,winExpertVsNewcomer:pairs.find(r=>r.playerA==='principiante'&&r.playerB==='esperto'),pve:pveResults},null,2));
