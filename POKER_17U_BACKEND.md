# 17U — PvP umano Poker con matchmaking gestito dall'arbitro (INTEGRAZIONE TECNICA)

## Integrazione codificata

- La lobby può usare una sessione **Firebase Auth** per identificare ogni giocatore (sign-in anonimo iniziale, utile per test; per un lancio pubblico occorre account recuperabile).
- Il client inserisce soltanto un ticket in `pokerWaitQueue/<training|elite>/<UID>`. Il worker Admin accoppia in modo transazionale gli utenti, legge `serverProfiles` e crea `pokerAuthority/<roomId>`. **Il client non crea stanze.**
- `pokerRoomAssigned/<uid>` comunica il risultato e `pokerViews/<uid>/<roomId>` contiene soltanto la vista privata. L'interfaccia `PvpOnlinePokerBattle` mostra 7 carte, 5 slot, scelta arma, attacco, passa, fino a 2 cambi di 3 carte e pronto.
- Ogni azione ha `expectedVersion` e ID proprio, e arriva a `pokerIntents/<room>/<uid>/<actionId>`; il worker valuta la mossa, verifica UID, sequenza/slot/carte e risponde in `pokerActionResults`. Il client **non scrive** HP, stato, carte o risultato.
- Il server usa soltanto vittorie reali di duelli umani Élite terminati per `eliteVerifiedWeeks/<week>/results/<uid>`, con marcatura per stanza per evitare il doppio accredito. **La classifica locale con bot resta separata da questo registro verificato.**
- I bot restano attivi se non c'è un concorrente; le tre missioni della campagna e la Sfida del Giorno sono intatte.

## Attivazione deliberatamente protetta

L'interfaccia nuova è **disabilitata di default**: impostare `VITE_POKER_ONLINE_ENABLED=true` nel frontend **solo dopo** aver distribuito l'arbitro, configurato Firebase Auth (almeno metodo anonimo in ambiente di prova) e le regole RTDB corrette. Con flag assente resta il comportamento 17T (compreso PvP legacy). Questo evita di presentare un backend inesistente come funzionante.

1. Configurare credenziali Admin con `FIREBASE_DATABASE_URL` e `GOOGLE_APPLICATION_CREDENTIALS`; installare dipendenze con `cd server && npm install`.
2. **Integrare**, non sostituire alla cieca, i rami del file `POKER_17U_RTDB_RULES_ADDENDUM.json` nelle regole RTDB esistenti. Negare letture/scritture generali al livello padre: in Firebase un permesso `.read` o `.write` concesso a un nodo padre **prevale** su un divieto nel figlio. Non abilitare il flag prima di testare regole di accesso con due utenti diversi e un estraneo.
3. Avviare `node server/pokerWorker.mjs` come processo affidabile; non è una Cloud Function, non garantisce uptime né scalabilità. Per collaudi, usare due account connessi a Firebase Auth.
4. Testare con **due dispositivi**, disconnessione, reconnessione, condizioni di gara del fallback IA e disallineamento dell'orologio. I timer sono assegnati dal server e mostrati dal client.
5. Verificare che gli acquisti dell'arsenale nel client siano sincronizzati nel ramo Admin `serverProfiles`. Senza questo passaggio il server usa il **set iniziale** (mai accettare equipaggiamento dichiarato dal client).
6. Verificare che il saldo diamanti lato client sia aggiornato solo da un portafoglio server autorevole; `settleEliteWeek.mjs` accredita `serverWallets` e non modifica direttamente i salvataggi locali.

## Rischi da chiudere prima della pubblicazione

- Il worker attuale interroga i rami periodicamente ed è un **servizio di sviluppo**, non scalabile. Non abbiamo attivato né collaudato nessun Firebase reale in questo ambiente.
- Il vecchio PvP in modalità flag disattivato non è autorevole; la nuova modalità va attivata e collaudata prima della pubblicazione competitiva.
- Il sistema Élite 17U registra risultati verificati da motore, ma la sincronizzazione completa della classifica visibile e del portafoglio giocatore richiede ulteriore integrazione; niente premi reali online dichiarati come attivi.
- Manca il recupero del profilo su cambio dispositivo: sign-in anonimo è soltanto un punto di avvio tecnico.
- L'abbandono del browser non fa perdere automaticamente il duello: occorre una regola specifica di resa/scadenza partita e una gestione delle sessioni abbandonate.
