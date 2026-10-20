# Eclissi Stellare — Classic Battle + nuovo Poker

Questo archivio conserva il gioco ed integra il layout tridimensionale ispirato a `ClassicBattleView.jsx` nei duelli Poker.

## Modifiche
- Nuovo `src/ClassicPokerArena.jsx`: avversario in alto, tre carte armi e ologrammi correttamente ancorati agli slot, sette carte giocatore con piedistalli, banco comune 5 slot, stato HP e pulsanti stile Classic.
- Nuovo `src/classicPokerArena.css`: plancia 440px responsiva, colori/gradienti e prospettiva del Classic.
- `src/NewCombatPhase3Preview.jsx`: collega la plancia agli *stessi* callback di attacco, passaggio, scelta arma, posizionamento carte, cambio e pronto. Poteri speciali, selezione avanzata e boost rimangono raggiungibili da ⚙ e dal pannello espandibile.
- `src/PvpOnlinePokerBattle.jsx`: usa la stessa plancia, senza leggere la mano privata dell'avversario e continuando a inviare mosse validate dal server.
- `src/App.tsx`: include già la precedente correzione agli import inutilizzati consegnata per GitHub.
- `src/classicPokerIntegration.test.js`: verifica integrazione e percorsi immagini di 48 armi, 48 ologrammi su/giù.

**Non modificati**: motori Poker, danni, timers, economia, missioni, Firebase, classifiche, grafica Classic storica, percorsi degli asset.

## Prova su StackBlitz
1. Sostituire i file nella repository con il contenuto dell'archivio (oppure usare lo ZIP delle sole modifiche, mantenendo le altre cartelle).
2. Commit e Push tramite GitHub Desktop. Aprire StackBlitz dal progetto GitHub aggiornato, lasciando completare l'installazione.
3. Aprire una battaglia campagna, Sfida del Giorno o PvP IA. Verificare carte e pulsanti nella plancia Classic. Il menu ⚙ contiene le azioni speciali.
4. Per PvP reale serve Firebase correttamente attivo; il test locale non sostituisce una prova fra due account.

## Verifiche in questo ambiente
- 427/427 test Node superati.
- Sintassi JSX verificata con parser TypeScript per tre componenti modificati.
- 144 asset necessari alle 48 armi (48 carte, 48 ologrammi su, 48 giù): tutti presenti.
- Build Vite e prova grafica in browser NON verificate qui: dipendenze npm non disponibili in questo ambiente.

Non caricare chiavi private o `.env` con segreti su GitHub. Sono esclusi dall'archivio.
