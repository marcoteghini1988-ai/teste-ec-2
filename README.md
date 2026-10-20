# Versione corrente — Collaudo funzionale senza ritocchi grafici

Aprire **[GUIDA_UNICA_COLLAUDO.md](GUIDA_UNICA_COLLAUDO.md)**. I vecchi checkpoint rimangono sotto solo per riferimento.

**Fase 17B:** prima curva integrata XP/HP/armi/dotazione IA e risorse, starter a due armi; test 272/272. Leggi `FASE_17B_LEGGIMI.md`. La build e il bilanciamento finale sono da verificare.

# VERSIONE CORRENTE — FASE 17A

Boss con una sola barra HP e prima integrazione delle anomalie tattiche nel Poker. Vedere `FASE_17A_LEGGIMI.md` e `CHECKLIST_FASE_17A.md` per cosa e implementato e cosa resta da bilanciare.

---

## Stato aggiornato — FASE 16I

Collaudo automatico dei sistemi Fase 16H e fix all'indice globale dei pianeti selezionati: **254/254 test superati**. Il progetto mantiene 12 pianeti / 120 settori e gli ID legacy nei salvataggi. **Build Vite e collaudo grafico restano da effettuare su StackBlitz** a causa delle dipendenze non installabili nell'ambiente di lavoro. Vedi `FASE_16I_LEGGIMI.md` e `CHECKLIST_FASE_16I.md`.

# **FASE 16H — Terreni, negozio e progressione Poker**

Ultimo checkpoint completo: **16H**. Leggi `FASE_16H_LEGGIMI.md` e `CHECKLIST_FASE_16H.md`. Base ufficiale: Fase 16G completa. **Prossimo lavoro: collaudo visivo, correzioni e bilanciamento Fase 17.**

---

> **FASE 16F:** vedi `FASE_16F_LEGGIMI.md` per i moduli abilità Poker e `CHECKLIST_FASE_16F.md` per i test.

> **Ultima fase completa: 16E — Mazzi planetari Poker.** Leggi `FASE_16E_LEGGIMI.md` per i 12 passivi di campagna, i due mazzi Capsule e le verifiche. Il prossimo sviluppo è la Fase 16F (Moduli).

# FASE 16D — Dodici boss esclusivi per la campagna Poker

I dodici boss della campagna a 120 livelli hanno abilità tattiche specifiche (Gaia, Marte, Venere, Saturno, Urano, Nettuno, Plutone, Europa, Proxima b, Haumea, Io ed Encelado). Test automatici: **204/204**. Consulta `FASE_16D_LEGGIMI.md` e `CHECKLIST_FASE_16D.md`. Base: Fase 16C integrale; Fasi 16E–16H e bilanciamento ancora da realizzare.

---

# FASE 16C — Sei Oggetti Epici passivi

Per le nuove abilità e la verifica vedere `FASE_16C_LEGGIMI.md` e `CHECKLIST_FASE_16C.md`. Base: Fase 16B integra.

---

# ECLISSI STELLARE — FASE 16B

Nuove regole di Bomba, Carta Dorata, Dado Quantico e Barra Malus nel combattimento campagna.

Consulta `FASE_16B_LEGGIMI.md` e `CHECKLIST_FASE_16B.md` per funzioni, limiti e collaudo.

> **VERSIONE DI LAVORO: FASE 16A (15 ottobre 2026)**  
> Nuova campagna 12 pianeti / 120 settori, sei varchi e 360 stelle.  
> Le nuove abilità Epiche non sono ancora attive (Fase 16C).  
> Leggi `FASE_16A_LEGGIMI.md` e `CHECKLIST_FASE_16A.md` per le modifiche e i test.  

> **FASE 11:** integrazione reale del Botta e Risposta nella campagna Terra settori 1–5; per dettagli e limiti leggere [FASE_11_LEGGIMI.md](FASE_11_LEGGIMI.md).

## CHECKPOINT CORRENTE — FASE 10

Il nuovo duello Botta e Risposta ha superato il collaudo automatizzato integrato; nella campagna Classica è ancora attivabile solo tramite «PROVA FASE 10 · COLLAUDO COMPLETO». L'anteprima non accredita avanzamenti, premi o statistiche legacy.

Leggere **`FASE_10_LEGGIMI.md`** per risultati/limiti e **`CHECKLIST_MIGRAZIONE_CAMPAGNA.md`** prima di qualsiasi sostituzione definitiva della campagna.

## FASE 9 — AI strategica e adattatore modalità (checkpoint attuale)

Il nuovo duello di prova utilizza adesso il pianificatore Poker deterministico della Fase 9, la preparazione AI con penalità e un adattatore che riconosce campagna/boss/sfide **senza scrivere nel progresso originale**. Il PvP reale resta sul motore legacy in attesa della convalida server. Le 48 armi, i loro asset e lo Shop della Fase 8 rimangono. Vedi `FASE_9_LEGGIMI.md` per file modificati, 104 test, limiti di compilazione e lavori non ancora completati.

---

## FASE 8 — Carte e ologrammi (checkpoint)

Catalogo 48 illustrazioni collegate alla UI: Gatling originale approvata + 47 concept art tecniche, 94 nuove proiezioni direzionali. Shop, area personale, equipaggiamento, scelta arma e duello di prova usano gli stessi asset e gli stessi ID. Il gioco della campagna e il vecchio sistema Gatling non sono stati alterati. Consulta `FASE_8_LEGGIMI.md` per limiti e test.

# Eclissi Stellare — checkpoint Fase 7

**Ultimo archivio di partenza:** `Eclissi_Stellare_FASE_06_Preparazione_Strategica.zip`.

La **Fase 7** aggiunge nello Shop l'inventario acquistabile per le **48 armi** suddivise in **Leggera, Media, Pesante** e **Comune, Rara, Epica, Leggendaria**. Le armi si acquistano con Polvere stellare, si equipaggiano per classe e vengono salvate sotto `eclissi_arsenal_v2`. L'area personale e l'arena di prova utilizzano il loadout scelto. Le immagini Gatling, la campagna legacy e i salvataggi storici sono conservati. I costi sono provvisori e gli effetti speciali non sono ancora integrati.

**Dettagli e test:** `FASE_7_LEGGIMI.md`.

---

> **CHECKPOINT ATTUALE: FASE 6 (14 ottobre 2026)** — Preparazione contemporanea da 30 secondi, due cambi da 1–3 carte con penalità reali su HP e tempo personale, Etere e preparazione AI. Vedi `FASE_6_LEGGIMI.md`. Lo ZIP completo di questa fase diventa la base per ogni modifica successiva.

> **FASE 5 (14 ottobre 2026)** — Nell'anteprima Classica il Boost matematico è ora giocabile: energia dalle combinazioni sconfitte, soglie 15/30/45, bersaglio persistente, due carte per il calcolo, bonus +/−/×/÷ e danno extra SOLO se si vince il Poker. Combattimento legacy e salvataggi invariati. Vedi `FASE_5_LEGGIMI.md`.

> **FASE 4 (14 ottobre 2026)** — Nell'anteprima Classica sono stati collegati tre slot armi, 48 armi selezionabili, quattro serbatoi per seme, confronto Poker e danni/HP al 100% o 50%. Il vecchio combattimento della campagna resta intatto. Vedi `FASE_4_LEGGIMI.md` per istruzioni e limitazioni.

**Cronologia:** la Fase 2 è stata mantenuta nell’archivio per documentazione; il checkpoint da utilizzare ora è la Fase 6. Le 48 armi della Fase 1 rimangono in `src/newCombat/weaponCatalog.js`.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.


## Fase 12 — Piloti e boss campagna
Adattamento abilità dei 53 piloti presenti nel database e 20 profili boss nel nuovo motore di campagna.
I piloti sono attivi solo nei settori già migrati (Terra 1–5); i boss hanno logica di simulazione, ma non sono ancora migrati dalla campagna legacy. Dettagli in `FASE_12_LEGGIMI.md`.

> **FASE 13:** estensione del combattimento nuovo ai settori classici PvE, boss con fasi multiple, modificatori e anomalie sul Boost; per modifiche, verifiche e limiti leggere [FASE_13_LEGGIMI.md](FASE_13_LEGGIMI.md).


## Fase 14 — Armi con effetti di gameplay
I 48 passivi del nuovo arsenale sono collegati agli scambi nella campagna e nell’arena di prova. Le abilità sono mostrate nell’interfaccia e si risolvono una volta per scambio, senza cambiare il vincitore Poker. Vedi `FASE_14_LEGGIMI.md` e `CATALOGO_48_EFFETTI_FASE14.md`. Bilanciamento e passivi legacy restano in fasi successive.

### FASE 15 — Compatibilità passivi della campagna

Consultare `FASE_15_LEGGIMI.md` per la conversione delle 20 carte Terreno, dei 10 Oggetti Epici e dei passivi dei mazzi. I nuovi effetti operano nella campagna Classica Botta e Risposta senza cambiare il vecchio sistema delle altre modalità. Numeri provvisori; test grafici Vite/StackBlitz ancora da eseguire.


## Fase 16G — Piloti tattici Poker
I 16 piloti principali ora applicano vantaggi condizionati da strategie specifiche nel Poker, senza duplicare i bonus dei mazzi o dei moduli. Inventari e piloti legacy conservati. Vedi `FASE_16G_LEGGIMI.md` e `CHECKLIST_FASE_16G.md`.

## Fase 17C — Prove di battaglia complete e curva danni

Vedi `FASE_17C_LEGGIMI.md` e `CHECKLIST_FASE_17C.md`. Il progetto conserva tutta la Fase 17B, ricalibra le salve e le armi Leggere, coordina gli HP e propone un coefficiente di difficoltà dei soli bot PvE. Inclusi campione di 162 combattimenti integri, generatore CSV dei 120 settori e cinque nuovi test. **Non è ancora bilanciamento finale** né build StackBlitz certificata.
