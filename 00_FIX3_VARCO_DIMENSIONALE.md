# FIX 3 — Varco dimensionale al posto dell'ologramma arma

## Obiettivo
Sostituire la proiezione dell'arma completa con un effetto più leggero e leggibile:

**carta sorgente -> varco orizzontale -> colpo -> impatto sulla barra HP**

## File realmente modificati
1. `src/newCombat/WeaponVisuals.jsx`
2. `src/newCombat/weaponVisuals.css`

## Cosa cambia
- `WeaponProjection` non usa più l'immagine completa dell'ologramma arma.
- `WeaponSlotHologram` non mostra più la sagoma dell'arma: durante lo sparo appare un mini-varco sullo slot arma.
- È stato introdotto un sistema di famiglie visive basato su nome/effetto/direzione artistica dell'arma.

## Famiglie visive attualmente gestite
- `portal` — varchi dimensionali, singolarità, vuoto, cosmico
- `laser` — raggi, luce, specchi, archivi, prismi
- `arc` — elettrico, fulmine, tesla, impulsi conduttivi
- `flare` — fuoco, fiamme, magma, colpi incandescenti
- `wave` — onde, vibrazioni, gravità, battiti, impulsi d'urto
- `toxic` — corrosivo, veleno, tossine, spore
- `shard` — lame, falci, aghi, schegge, rimbalzi
- `burst` — esplosivi, bombe, missili, razzi, armi pesanti
- `kinetic` — fallback generale per raffiche e colpi cinetici

## Comportamento visivo
- la carta arma pulsa come sorgente;
- davanti alla carta si apre un varco orizzontale;
- dal varco escono da 1 a 4 tracce di colpo visuali (in funzione dei colpi sparati);
- sulla destra/sinistra è presente la barra bersaglio con flash di impatto;
- per il lato nemico l'intera sequenza è specchiata.

## Verifiche eseguite
- controllo manuale del punto di aggancio nel progetto reale;
- verifica strutturale dei componenti React modificati;
- packaging dei soli file interessati.

## Verifiche NON completate
- build completa Vite/TypeScript non eseguita in questo ambiente perché l'installazione di `node_modules` non è andata a termine nel container;
- collaudo visivo nel browser da eseguire sul progetto locale.

## Come applicare
Se vuoi aggiornare una copia esistente del progetto, basta sostituire i 2 file in `src/newCombat/`.
