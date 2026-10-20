import {readFileSync,writeFileSync} from 'node:fs';
// CSV dalla sonda controllata: valori stringa semplici, nessuna carta con virgole.
const parse=name=>{const [head,...rows]=readFileSync(new URL(`../${name}`,import.meta.url),'utf8').trim().split(/\r?\n/);const keys=head.split(',');return rows.map(r=>Object.fromEntries(r.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((x,i)=>[keys[i],JSON.parse(x)])));};
const withModules=parse('FASE_17E_SIMULAZIONI_BATTAGLIE.csv');
const withoutModules=parse('FASE_17E_SENZA_MODULI_IA_SIMULAZIONI_BATTAGLIE.csv');
const key=x=>`${x.sector}/${x.profile}`;
const baseline=new Map(withoutModules.map(r=>[key(r),r]));
const compare=[];
for(const x of withModules){const y=baseline.get(key(x));if(!y)throw Error(`cella assente ${key(x)}`);
 if(!x.auditOK||!y.auditOK||!['player','enemy','draw'].includes(x.result)||!['player','enemy','draw'].includes(y.result))throw Error(`audit mancante ${key(x)}`);
 compare.push({sector:x.sector,profile:x.profile,modules:x.enemyModuleActivations,
   winnerWith:x.result,winnerWithout:y.result,exchangesWith:x.exchanges,exchangesWithout:y.exchanges,
   deltaExchanges:x.exchanges-y.exchanges,playerHpWith:x.playerHP,playerHpWithout:y.playerHP,deltaPlayerHp:x.playerHP-y.playerHP});}
if(compare.length!==baseline.size)throw Error('I campioni non hanno lo stesso numero di celle');
const avg=(rows,key)=>rows.length?rows.reduce((s,r)=>s+r[key],0)/rows.length:null;
const boss=compare.filter(r=>r.sector%10===0),normal=compare.filter(r=>r.sector%10!==0);
const report={method:'A/B accoppiato 1 replica × 15 settori × 3 profili: stesso seed e IA 75 valutazioni/mossa; inventari 17D acquistati; solo Moduli IA diversi',
  count:compare.length,bossCases:boss.length,normalCases:normal.length,
  aiModuleActivations:compare.reduce((s,r)=>s+r.modules,0),differentWinners:compare.filter(r=>r.winnerWith!==r.winnerWithout).length,
  differentDurations:compare.filter(r=>r.deltaExchanges!==0).length,
  avgExchangesBossWith:+avg(boss,'exchangesWith').toFixed(2),avgExchangesBossWithout:+avg(boss,'exchangesWithout').toFixed(2),
  avgExchangesNormalWith:+avg(normal,'exchangesWith').toFixed(2),avgExchangesNormalWithout:+avg(normal,'exchangesWithout').toFixed(2),
  avgDeltaPlayerHp:+avg(compare,'deltaPlayerHp').toFixed(2),
  caution:'1 replica per cella non stima tasso di vittoria, ne bilanciamento finale. Differenze minime NON provano assenza di effetti.',rows:compare};
writeFileSync(new URL('../FASE_17E_CONFRONTO_MODULI_IA.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined},null,2));
