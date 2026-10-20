# Eclissi Stellare — Riorganizzazione R1, senza riscrivere il gioco

## Situazione di partenza
Versione di codice: ECLISSI_STELLARE_FIX9_TEST_EC_COMPLETO.zip, ricavata dallo ZIP `test-ec-main (1).zip` fornito dall'utente. Gli asset delle carte e delle armi sono stati reintegrati dalla versione completa del progetto (FIX 7): il progetto di partenza esportato da StackBlitz non includeva `public/`.

## Cosa è stato fatto
1. Eliminati 15 file vecchi in radice, doppi o non più utilizzati, fra cui le copie di `ClassicBattleView.jsx`, `NewCombatPhase3Preview.jsx`, `PokerCombatEffects.jsx` e CSS. I percorsi attivi dentro `src/` NON sono stati spostati.
2. Tolto il secondo motore di animazione dei varchi dal pannello di dettaglio `src/NewCombatPhase3Preview.jsx`. Gli effetti visivi della battaglia sono ora di competenza esclusiva di `src/newCombat/PokerCombatEffects.jsx`, montato da `src/ClassicBattleView.jsx`. Il pannello tecnico conserva testi e risultati degli attacchi, ma non crea un varco alternativo.
3. Ridotto `src/newCombat/WeaponVisuals.jsx` a `WeaponCardArt`: un unico punto per la semplice immagine della carta arma; rimossi i vecchi mini-varchi.
4. Ripulito `src/newCombat/weaponVisuals.css` da regole per le animazioni eliminate.
5. Aggiornato il test storico del renderer in `src/newCombat/phase8.test.js` e aggiunto il controllo `scripts/check-structure.mjs`.
6. Aggiunto lo script `scripts/cleanup-legacy-shadows.mjs`, per pulire in modo esplicito le vecchie copie anche sul repository StackBlitz. Non cancella i file attivi in `src/`.

## Percorsi ufficiali a cui fare riferimento

- **Avvio**: `index.html` -> `src/main.tsx` -> `src/App.tsx`
- **Interfaccia della battaglia**: `src/ClassicBattleView.jsx`
- **Adattatore dati della battaglia Poker**: `src/ClassicPokerFieldBridge.jsx`
- **Gestore unico dei varchi e proiettili in partita**: `src/newCombat/PokerCombatEffects.jsx`
- **Stili del gestore**: `src/newCombat/pokerCombatEffects.css`
- **Catalogo famiglia / coordinate arma**: `src/newCombat/pokerVolleyVfx.js`
- **Immagini statiche delle armi**: `src/newCombat/WeaponVisuals.jsx`
- **Meccaniche**: restano nei file di fase esistenti sotto `src/newCombat/` (non fuse a rischio di regressioni)
- **PvP server**: resta separato sotto `server/`

Il file storico `newCombat/classicWeaponMapping.js` (in radice) è conservato: non è importato dal percorso attivo, ma non è stato eliminato senza prove sufficienti della sua inutilità definitiva.

## Come aggiornare la copia StackBlitz SENZA reinstallare il progetto

1. Salva un backup ZIP o commit della versione che funziona meglio.
2. Estrai **R1_SOLO_MODIFICHE.zip** sulla radice del repository, sovrascrivendo `src/` e `package.json`, mantenendo gli altri file.
3. Apri il terminale StackBlitz e lancia `npm run cleanup:shadows` per eliminare soltanto le copie vecchie nella radice. Se non vuoi cancellare nulla, lancia invece `node scripts/cleanup-legacy-shadows.mjs` per vedere l'elenco.
4. Esegui `npm run check:structure` e `npm run verify:logic`.
5. Non usare più `PokerCombatEffects.jsx` nella cartella principale: il file valido è sempre `src/newCombat/PokerCombatEffects.jsx`.

## Verifiche realmente eseguite

- Moduli relativi verificati staticamente: 724 import, 0 percorsi irrisolti.
- Test del motore: 359 eseguiti; 349 superati, 10 falliti (in prevalenza aspettative legacy dei timer 25/25/35 invece di 20/20/30).
- Test generali: 424 eseguiti; 414 superati, 10 falliti, stesse anomalie preesistenti.
- Controllo `check:structure`: superato.
- I 48 asset carta previsti sono inclusi nel pacchetto completo.

## Cosa NON è stato ancora collaudato

- La compilazione completa Vite + React e una partita grafica reale in StackBlitz. Le dipendenze front-end non sono state installate in questo ambiente.
- La resa finale dei portali verticali: **questa riorganizzazione elimina le animazioni concorrenti, ma NON certifica che l'effetto 3D sia già quello richiesto.**

## Passi successivi: in ordine

1. Verificare la pipeline VFX unica nel gioco, quindi correggere la geometria della porta verticale senza duplicare file.
2. Solo dopo, raggruppare con prudenza i sistemi di carte/turni e le dipendenze di `src/App.tsx`, mantenendo regressioni e compatibilità con PvP.
3. Non eliminare vecchi file `phaseXX` in blocco: vengono usati dal motore, dalle modalità e dal server.
