# ECLISSI STELLARE — CONSEGNA UNICA, GRAFICA INVARIATA

## Come provarla con la grafica già esistente

1. Caricare **tutta** questa cartella su StackBlitz o GitHub, senza sostituire parti di codice di un altro progetto.
2. In un ambiente con connessione a npm, eseguire `npm ci`, poi `npm run preflight`, `npm run verify:logic`, `npm run build` e `npm run dev`.
3. La compilazione deve riuscire prima di parlare di gioco collaudato. Questa prova **non è stata possibile** nell'ambiente in cui è stato preparato lo ZIP (rete verso npm non disponibile).
4. Per usare solo campagna, missioni, Sfida del Giorno e PvP contro bot, **lasciare disattivato** `VITE_POKER_ONLINE_ENABLED` (comportamento predefinito). La grafica e gli asset presenti non sono stati modificati.
5. Per il PvP umano, leggere `server/POKER_17U_BACKEND.md`, `server/POKER_17V_BACKEND.md` e `server/POKER_17W_RTDB_RULES_ADDENDUM.json`. Occorre abilitare Firebase Anonymous Auth, distribuire regole RTDB verificate e mantenere il worker Admin in esecuzione su un server. Solo **dopo** il test fra due account si può impostare `VITE_POKER_ONLINE_ENABLED=true` e ricompilare.

## Modifiche di questa consegna

- Unificata la procedura dei premi settimanali Élite in `server/eliteSettlementService.mjs`.
- `server/pokerWorker.mjs` controlla automaticamente la **settimana di Roma precedente ogni cinque minuti** quando è in esecuzione, liquidando i premi umani verificati; tentativi ripetuti non duplicano i diamanti.
- Il comando manuale `cd server && node settleEliteWeek.mjs settimana_2026_42` rimane disponibile per recuperare settimane non liquidate.
- Aggiunti test di liquidazione, preflight e workflow GitHub Actions che potrà verificare la compilazione in ambiente online.
- La struttura delle carte, immagini, ologrammi, 48 armi, 12 pianeti, 120 settori, 3 missioni giornaliere e bot è preservata.

## Limitazioni reali: prima di chiamarlo pronto per il lancio

- **Build Vite e UI completa non collaudate** qui perché le dipendenze npm mancano e il registro npm non è raggiungibile.
- **PvP reale non testato** su due dispositivi; non sono state fornite credenziali né autorizzazioni per distribuire Firebase. Gli account e le regole Firebase devono essere verificati dal proprietario.
- **Saldo Élite separato dal negozio locale**: non considerarlo spendibile finché non esiste un'integrazione server autorevole di inventario, acquisti e premi; non usare i salvataggi locali come prova di acquisti competitivi.
- La **Sfida del Giorno** conserva il punteggio locale, non certifica risultati fra dispositivi; le classifiche sintetiche servono solo al lancio.
- I test automatici verificano la logica e i guardrail; NON sostituiscono la prova nel browser del gioco completo.

Questa è **una consegna del codice migliorato**, non una dichiarazione falsa di pubblicazione già pronta. Se la build online segnala errori, i relativi log serviranno a risolverli senza reimpostare la grafica o il bilanciamento.
