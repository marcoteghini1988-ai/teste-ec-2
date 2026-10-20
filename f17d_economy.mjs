/** F17D audit pre-mercato: acquisti REALI dell'arsenale, 120 prime vittorie.
 * I percorsi con 1/2/3 stelle sono ipotesi, non terze stelle regalate.
 * Niente costo del tempo del cantiere, niente farming/daily o premio Dorata.
 */
import {writeFileSync} from 'node:fs';
import {simulateF17DEconomy} from '../src/newCombat/phase17DEconomy.js';
const profiles=['frugale','equilibrato','potenziato','stress_concentrato'];
const all=[];
for(const starsPerSector of [1,2,3])for(const profile of profiles){
 const v=simulateF17DEconomy({profile,starsPerSector,assumeFirstRift:false});
 all.push(v);
}
const rows=all.flatMap(r=>r.ledger.map(v=>({
  scenario:`${r.profile}_${r.starsPerSector}stella`,...Object.fromEntries(Object.entries(v).filter(([k])=>!['armory','epics','purchasesBefore'].includes(k))),
  acquisti:v.purchasesBefore.join(' | '),
  armi:JSON.stringify(v.equipped),livelliArmi:JSON.stringify(v.armoryLevels)
})));
const keys=Object.keys(rows[0]);
const path=new URL('../FASE_17D_ECONOMIA_120_SETTORI.csv',import.meta.url);
writeFileSync(path,keys.join(',')+'\n'+rows.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n')+'\n');
const report={version:'17D',category:'AUDIT delle possibilità di acquisto; NON misura vittorie',hypotheses:[
 'Tutti i 120 settori vinti al primo tentativo: è una condizione teorica, da verificare con i duelli',
 'Stelle per vittoria 1, 2 o 3 costanti nello scenario; capsule riscattate appena disponibili',
 'Nessun replay, gioco quotidiano, loot Dorata, bonus casuali, ricarica crediti nel tempo, microtransazioni',
 'Portafoglio Polvere con CAP reale del pilota; Polvere eccedente persa (overflow in cristalli non assunto)',
 'Primo modulo Ariete e mazzo Ariete gratuiti al settore 9/10, Gaia comprabile con Diamanti',
 'Oggetti Epici e cristalli da fusione non assegnati automaticamente',
 'I requisiti di tempo del Cantiere NON sono simulati: le migliorie entrano nel settore successivo' ],
 results:all.map(x=>({profile:x.profile,starsPerSector:x.starsPerSector,summary:x.summary,purchases:x.purchases}))};
writeFileSync(new URL('../FASE_17D_ECONOMIA_RISULTATI.json',import.meta.url),JSON.stringify(report,null,2));
console.table(all.map(x=>({profile:x.profile,stars:x.starsPerSector,lossDust:x.summary.dustLostToWalletCap,spentDust:x.summary.dustSpent,diamonds:x.summary.finalResources.diamonds,credMissing:x.summary.creditsToRecoverWithoutBattleBonuses,modLv:x.summary.moduleLevel})));
