# ECLISSI STELLARE — UNA SOLA PROVA DELLA VERSIONE COMPLETA

Non servono i vecchi ZIP: in questo archivio ci sono **tutti i file della base ufficiale** e le correzioni della 17P.

## Avvio (PC o StackBlitz con accesso npm)

1. Estrarre lo ZIP conservando le cartelle `src`, `public/assets` e tutti i file originali.
2. Nella cartella principale: `npm ci`.
3. Verificare: `npm run build` (la build è un controllo tecnico, diverso dalle simulazioni).
4. Avviare: `npm run dev` e aprire l'URL indicato dalla console; per provare da smartphone usare il browser sulla pagina raggiungibile dal dispositivo.
5. Usare una partita normale della **nuova campagna** e poi, quando disponibile, un boss. Verificare visivamente carte, banco, preparazione, armi, premi e salvataggi.

## Controllo rapido durante la partita

- Fase d'attacco **25 s**, risposta **25 s**, preparazione **35 s**; nei campi `fast_timer` attacco/risposta 20 s. Il tempo residuo del giocatore cala di 3 s quando usa un cambio da 2–3 carte, NON cala per l'avversario.
- **7 carte** proprie, **5 slot** del banco condiviso, **massimo 4** da piazzare e **fino a due cambi** (1–3 carte ognuno) in preparazione.
- Leggera con Coppia/Doppia coppia secondo arma, Media con le sue combinazioni, Pesante con Scala/Colore da quattro a **un colpo** oppure Poker/figura speciale originale fino a **due colpi**; devono esserci munizioni e nessun blocco.
- Gli incontri **non** finiscono obbligatoriamente a 4/5/8/9 turni. Se il giocatore conferma prima del termine, non aspetta il timer.

**Nota importante:** il PvP online è ancora la schermata/motore precedenti, non va confuso col nuovo PvE Poker. Questo test singolo certifica soprattutto la campagna; non certifica il multiplayer online.

Se `npm ci` non riesce, non eliminare i file originali o sostituire lo ZIP con una fase vecchia; conservare il messaggio di errore e comunicarlo.
