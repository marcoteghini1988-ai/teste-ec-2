# PvP Poker 17V: guida attivazione

**Il backend non è stato distribuito.** L'interruttore `VITE_POKER_ONLINE_ENABLED` rimane OFF nella build predefinita.

- Configurare progetto Firebase RTDB e Auth, scaricare credenziali Admin sul server (mai nel repository/frontend).
- Avviare `npm install` nella cartella `server` e configurare le variabili `FIREBASE_DATABASE_URL` e `GOOGLE_APPLICATION_CREDENTIALS` in un ambiente affidabile.
- Integrare i rami di `POKER_17V_RTDB_RULES_ADDENDUM.json` nelle regole RTDB esistenti. Se un parent concede read/write, i divieti figli NON annullano quel permesso. Simulare due utenti diversi ed estraneo prima di pubblicare.
- Il worker `node server/pokerWorker.mjs` crea stanze, valida mosse, contabilizza e pubblica la graduatoria verificata (`elitePublicWeeks`). I bot riempiono i posti liberi solo sul client.
- Alla chiusura settimana il comando amministrativo `node server/settleEliteWeek.mjs settimana_YYYY_N` congela il registro verificato e assegna il podio ai portafogli `serverWallets`. Serve averli inizializzati e associati a identità affidabili; i saldi client non vengono aggiornati automaticamente.
- Testare abbandono, coda contemporanea, smartphone multipli, wallet e chiusura settimana; solo dopo impostare flag ON.

Limiti non ancora affrontati: heartbeat/presenza e resa, migrazione acquisti dal client al server, saldo diamanti server in UI, gestione uptime del worker e deploy produttivo.
