# Poker PvP online — Fase 17T (backend di sviluppo, NON distribuito)

È stato implementato un **arbitro puro** che usa il medesimo motore Fase 6 / 5 / 12 / 14 della campagna e valida le azioni contro lo stato canonico: mano, board, slot, armi, Boost, fasi e timeout. I test verificano il rifiuto di carte inventate, turni falsi e azioni con versione scaduta. La mano e il mazzo dell'altro giocatore non sono nella vista privata di chi riceve un evento.

**Non è ancora un multiplayer pubblico operativo.** Il matchmaking umano attuale usa ancora le vecchie `rooms/` legacy. `createPokerRoom.mjs` crea *manualmente* una stanza per due UID Firebase Auth verificati, e `pokerWorker.mjs` elabora azioni sulla RTDB, ma è necessario distribuire worker, collegare login e UI client e collaudare due telefoni; non farlo in produzione senza regole di sicurezza.

## Richieste del client futuro

- Firebase Auth (anche anonima) e ID autentico (`auth.uid`), non il generatore `usr_timestamp` della lobby legacy.
- Il server assegna `pokerRoomAssigned/<uid>`, e pubblica `pokerViews/<uid>/<roomId>` solo a quel partecipante.
- Il client invia un'unica azione in `pokerIntents/<roomId>/<uid>/<actionId>` con `expectedVersion`, `type`, eventualmente `placements:[{slot,cardId}]`, `weaponId`, `boost`, `indices`, `handIndex`, `deckIndex`.
- I contenitori canonici `pokerAuthority`, `serverWallets`, `eliteVerifiedWeeks` e `eliteWeekSettlements` **non devono mai essere scrivibili o leggibili dal client**.
- Il worker scrive `pokerActionResults/<uid>/<actionId>` per conferme/errori. Le azioni sono transazionali; i retry con lo stesso ID non sono duplicati.
- Il processo amministrativo `settleEliteWeek.mjs` NON riceve ancora punteggi firmati da questo worker e non deve essere lanciato su classifiche locali o bot.

## Regole RTDB minime da integrare con quelle già esistenti

**Non sovrascrivere la policy esistente** senza analizzarla. Per i rami *nuovi* (non ancora popolati) valgono queste restrizioni concettuali:

```
"pokerAuthority": { ".read": false, ".write": false },
"pokerViews": { "$uid": { ".read": "auth != null && auth.uid == $uid", ".write": false } },
"pokerRoomAssigned": { "$uid": { ".read": "auth != null && auth.uid == $uid", ".write": false } },
"pokerIntents": { "$room": { "$uid": {
  ".read": "auth != null && auth.uid == $uid",
  "$actionId": { ".write": "auth != null && auth.uid == $uid && !data.exists() && newData.exists()",
                 ".validate": "newData.child('expectedVersion').isNumber() && newData.child('type').isString()" }
} } },
"pokerActionResults": { "$uid": { ".read": "auth != null && auth.uid == $uid", ".write": false } },
"serverWallets": { ".read": false, ".write": false },
"eliteVerifiedWeeks": { ".read": false, ".write": false },
"eliteWeekSettlements": { ".read": false, ".write": false }
```

Nota: regole `.read`/.write` ai livelli superiori possono prevalere; occorre testare esplicitamente **deny** con Firebase Emulator. Tutte le istanze del worker devono essere protette dal service account Admin. Con l'autenticazione anonima si ottiene una sessione UID, ma per un torneo pubblico e per gli acquisti vanno aggiunti recupero account, profili server non falsificabili e anti-abuso.

## Esecuzione amministrativa (solo dopo setup Firebase)

```
cd server
npm install
export FIREBASE_DATABASE_URL="https://..."
export GOOGLE_APPLICATION_CREDENTIALS="/path/credenziali-admin.json"
node createPokerRoom.mjs UID_1 UID_2 training
node pokerWorker.mjs
```

## Limiti espliciti

1. Nessun test reale Firebase a due dispositivi; questo worker esegue polling una volta al secondo e **non** implementa presenza/disconnessione, riequilibrio tempi per lag o riconnessione.
2. Nessuna assegnazione di trofei, missioni o diamanti da questo worker: va prima completata la firma server dei risultati e l'identità online.
3. Mancano la UI per il PvP remoto e la sostituzione dell'abbinamento legacy con quello Firebase Auth.
4. La build Vite dipende ancora da pacchetti npm non presenti nell'ambiente attuale.
