/** Eclissi Stellare R2 — elimina soltanto moduli legacy consolidati.
 *  Eseguire dopo aver importato l'aggiornamento R2 nel progetto.
 *  Default: anteprima senza modifiche. --apply: cancellazione.
 */
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const grouped={
  'src/newCombat/combatBasics.js':['src/newCombat/boardRules.js','src/newCombat/turnRules.js','src/newCombat/loadoutMigration.js'],
  'src/newCombat/pokerRules.js':['src/newCombat/duelRules.js'],
  'src/newCombat/phase5Engine.js':['src/newCombat/boostRules.js'],
  'src/newCombat/phase10Audit.js':['src/newCombat/phase9ModeAdapter.js','src/newCombat/phase11Campaign.js'],
  'src/newCombat/tacticalAnalysis.js':['src/newCombat/phase17IProbe.js','src/newCombat/phase17JAdvisor.js'],
  'src/newCombat/phase17DEconomy.js':['src/newCombat/phase17ECreditFlow.js'],
  'src/newCombat/phase16FModules.js':['src/newCombat/phase17EEnemyModules.js'],
  'src/eliteServices.js':['src/elitePublicLeaderboard.js','src/eliteWeeklyAwards.js','src/eliteServerWalletView.js','src/eliteWeekSettlementGuards.js'],
  'src/pvpConnectivity.js':['src/pokerOnlineQueue.js','src/pvpQueueProtocol.js','src/pokerRoomReconnect.js'],
  'src/pvpBootstrap.js':['src/pvpPokerBootstrap.js','src/competitiveBootstrap.js'],
};
const errors=[];
for(const [destination,legacy] of Object.entries(grouped)){
  const p=join(root,destination);
  if(!existsSync(p))errors.push(`Manca il nuovo modulo ${destination}`);
  // Verifica che il nuovo file contenga davvero i nomi esportati dai vecchi file.
  else if(!readFileSync(p,'utf8').includes('ORIGINE CONSOLIDATA'))errors.push(`Modulo non riconosciuto come R2: ${destination}`);
}
if(errors.length){console.error('Pulizia interrotta:');for(const e of errors)console.error(' - '+e);process.exit(1)}
const found=Object.values(grouped).flat().filter(relative=>existsSync(join(root,relative)));
if(!process.argv.includes('--apply')){
  console.log(`Anteprima: ${found.length} moduli vecchi da eliminare. Nessuna modifica effettuata.`);
  found.forEach(p=>console.log(' - '+p));
  console.log('Per eseguire: npm run cleanup:r2');
}else{
  found.forEach(relative=>unlinkSync(join(root,relative)));
  console.log(`R2: eliminati ${found.length} file legacy. Nuovi moduli conservati.`);
  console.log('Ora esegui: npm run check:structure');
}
