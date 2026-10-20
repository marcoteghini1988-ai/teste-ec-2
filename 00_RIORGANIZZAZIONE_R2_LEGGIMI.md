# Eclissi Stellare — R2 / consolidamento reale dei moduli

## Base e ambito
La R2 parte dal progetto R1 ripulito. **Non modifica la resa grafica dei varchi**: questa fase serve a diminuire la frammentazione, mantenendo invariati gli esiti del motore, i timer e il sistema Boost. Non considera risolto il problema visivo dei varchi dimensionali.

## Consolidamento completato
La riorganizzazione incorpora **25 moduli operativi in 10 file di responsabilità**, con **20 vecchi file eliminati** e **5 nuovi file introdotti**: saldo **−15 file di codice**. I moduli non sono lasciati come semplici wrapper: il codice e le esportazioni sono stati spostati nei file riuniti, aggiornando gli import in UI, test, server e strumenti.

| Nuovo file / file consolidato | Moduli di origine |
|---|---|
| `src/newCombat/combatBasics.js` | `boardRules`, `turnRules`, `loadoutMigration` |
| `src/newCombat/pokerRules.js` | `duelRules`, `pokerRules` |
| `src/newCombat/phase5Engine.js` | `boostRules`, `phase5Engine` |
| `src/newCombat/phase10Audit.js` | `phase9ModeAdapter`, `phase10Audit`, `phase11Campaign` |
| `src/newCombat/tacticalAnalysis.js` | `phase17IProbe`, `phase17JAdvisor` |
| `src/newCombat/phase17DEconomy.js` | `phase17DEconomy`, `phase17ECreditFlow` |
| `src/newCombat/phase16FModules.js` | `phase16FModules`, `phase17EEnemyModules` |
| `src/eliteServices.js` | `elitePublicLeaderboard`, `eliteWeeklyAwards`, `eliteServerWalletView`, `eliteWeekSettlementGuards` |
| `src/pvpConnectivity.js` | `pokerOnlineQueue`, `pvpQueueProtocol`, `pokerRoomReconnect` |
| `src/pvpBootstrap.js` | `pvpPokerBootstrap`, `competitiveBootstrap` |

## Installazione in StackBlitz

### Opzione A — Progetto completo (più semplice per un progetto nuovo)
Usa `ECLISSI_STELLARE_R2_PROGETTO_COMPLETO.zip` come versione di partenza. È già privo dei 20 vecchi file. Fai un backup di eventuali modifiche personali prima di sostituire una copia esistente.

### Opzione B — Aggiornamento della R1 senza reinstallarla
1. Fai un backup della cartella del progetto corrente.
2. Estrai il pacchetto `ECLISSI_STELLARE_R2_SOLO_MODIFICHE.zip` nella radice del progetto e sovrascrivi i file indicati, **mantenendo i percorsi**.
3. Apri il terminale del progetto e avvia `npm run cleanup:r2` per eliminare **soltanto** i 20 vecchi moduli assorbiti. La pulizia si rifiuta di eseguire se i nuovi moduli non sono presenti.
4. Esegui `npm run check:structure` e poi `npm run verify:logic`.
5. Avvia l'anteprima e verifica Avventura, Boost, PvP, Banco e Shop. La riorganizzazione non costituisce collaudo visivo delle modalità.

**Non basta trascinare i nuovi file:** gli ZIP sovrapposti non eliminano automaticamente i 20 vecchi file. Senza lo script di pulizia rimarrebbero duplicati nel repository, anche se non più importati.

## Verifiche effettuate
- R1 prima del consolidamento: **414 superati / 424** test.
- R2 dopo il consolidamento: **414 superati / 424** test. I 10 fallimenti hanno gli stessi titoli e sono preesistenti (timer storici 25/25/35 e alcune asserzioni sulle regole/costi).
- **707 import locali** risolti senza file mancanti.
- **175 file di codice** analizzati per errori sintattici: zero errori di parsing.
- Tutte le **107 esportazioni** dei moduli raggruppati sono presenti nei moduli finali.
- Import dinamici di ingresso (`src/newCombat/index.js`, economia, moduli nemici, rete, PvP, servizi Élite) riusciti.
- Il build completo `npm run build` **non è stato verificato**: `npm ci --offline` si è fermato perché la cache locale non contiene `yargs-parser`. Nessuna affermazione di collaudo completo browser.

## Limiti e lavoro rimanente
Questa è la **prima ondata di consolidamento R2**, non un collasso indiscriminato di ogni file. I grandi componenti (per esempio `App.tsx` e `ClassicBattleView.jsx`) e la parte PvP con server rimangono separati: unirli senza test browser comporterebbe rischi maggiori. Il renderer dei varchi ha un percorso unico da R1, ma **la porta verticale effettiva non è ancora confermata sulla plancia reale**.

## Nuovi strumenti di manutenzione
- `npm run cleanup:r2` — rimuove solo i 20 vecchi moduli dopo l'aggiornamento.
- `npm run check:structure` — segnala duplicazioni obsolete e import mancanti, compresi quelli del consolidamento R2.
