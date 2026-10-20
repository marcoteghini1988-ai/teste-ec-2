# Fase 17S — preparazione premi server Élite (NON attiva in produzione)

Il file `settleEliteWeek.mjs` è un **comando amministrativo**. Non è stato distribuito su Firebase, non è un job programmato e **non può essere eseguito** nel browser del gioco. La cartella `server` usa `firebase-admin` separatamente dal gioco. Nessuna credenziale è inclusa.

## Requisiti prima del rilascio

1. Integrare una vera identità per ciascun account (`auth.uid`) e un portafoglio autoritativo su `/serverWallets/<uid>` con `diamonds` numerico.
2. Proteggere `/eliteVerifiedWeeks`, `/eliteWeekSettlements` e `/serverWallets` con regole che **negano qualsiasi scrittura diretta dal client**. È possibile farlo senza dare accesso a questi rami ai giocatori: il processo amministrativo usa Firebase Admin. Non sovrascrivere le regole attuali senza testare il resto del gioco.
3. Implementare un validatore autorevole delle partite PvP: deve firmare e pubblicare i soli punteggi verificati (`verified: true`, `weekKey`, `trophies`, `wins`, `isBot: false`) su `/eliteVerifiedWeeks/<weekKey>/results/<uid>`.
4. Congelare i punteggi al termine della settimana (Europe/Rome), poi lanciare **manualmente o con scheduler server** il processo amministrativo. Il codice rifiuta la settimana corrente.
5. Collegare il portafoglio server alla UI del gioco e prevedere una procedura di riconciliazione per vecchi salvataggi. Il gioco attuale conserva ancora crediti e diamanti in localStorage.

## Regole di liquidazione (codificate e testate)

- Podio fra **solo i partecipanti umani verificati dal server**, non tra i 500 bot di lancio. Premi: 100/50/25 diamanti. A parità di trofei, vittorie; poi ID stabile.
- Snapshot dell'elenco premi congelata al primo tentativo di settlement; un rilancio usa lo stesso elenco.
- Transazione sul singolo portafoglio, con `eliteSettledWeeks[weekKey]` come chiave idempotente: ogni giocatore viene pagato **al massimo una volta** per settimana.
- Se manca lo snapshot verificato o il portafoglio del vincitore, l'operazione fallisce e non finge il pagamento.

**Limite presente:** finché il motore PvP online e il validatore server non sono pronti, i risultati con cui alimentare questa procedura non esistono. L'esistenza dello script non equivale a premi online già funzionanti.
