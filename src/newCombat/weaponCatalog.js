// FASE 1 — Catalogo dei 48 progetti arma, NON attivati nella battaglia legacy.
// Classe = slot; seme = riserva munizioni; pattern = combinazioni ammesse.
// I valori di danno, prezzi, cooldown e i gestori effettivi verranno introdotti nelle fasi successive.
// NON passare ARSENAL_48 direttamente ai vecchi componenti finché non sono migrati.
export const ARSENAL_48 = Object.freeze([
  {
    "id": "es_common_light_01",
    "name": "Gatling Cinetica",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair"
    ],
    "effect": {
      "id": "raffica_modulata",
      "name": "Raffica modulata",
      "description": "Recupera 1 proiettile del proprio seme quando spara una salva parziale.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Mitragliatrice rotante di metallo scuro, nastri di dardi cinetici, scie color turchese.",
      "hologramStyle": "light_raffica_modulata",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {
        "1": "/assets/weapons/gatling_cinetica_lv1.png",
        "2": "/assets/weapons/gatling_cinetica_lv2.png",
        "3": "/assets/weapons/gatling_cinetica_lv3.png",
        "4": "/assets/weapons/gatling_cinetica_lv4.png"
      },
      "hologramUpByLevel": {
        "1": "/assets/weapons/gatling_holo_up_lv1.png",
        "2": "/assets/weapons/gatling_holo_up_lv2.png",
        "3": "/assets/weapons/gatling_holo_up_lv3.png",
        "4": "/assets/weapons/gatling_holo_up_lv4.png"
      },
      "hologramDownByLevel": {
        "1": "/assets/weapons/gatling_holo_down_lv1.png",
        "2": "/assets/weapons/gatling_holo_down_lv2.png",
        "3": "/assets/weapons/gatling_holo_down_lv3.png",
        "4": "/assets/weapons/gatling_holo_down_lv4.png"
      }
    },
    "legacyId": "wp_gatling",
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_light_02",
    "name": "Spillo Pulsar",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind"
    ],
    "effect": {
      "id": "marchio_luminoso",
      "name": "Marchio luminoso",
      "description": "Dopo uno sparo prepara +3 danni per il prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Microcarabina a tre ugelli, fascio luminoso sottile, condensatori azzurri.",
      "hologramStyle": "light_marchio_luminoso",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_light_02_card.png", "2": "/assets/weapons/es_common_light_02_card.png", "3": "/assets/weapons/es_common_light_02_card.png", "4": "/assets/weapons/es_common_light_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_light_02_holo_up.png", "2": "/assets/weapons/es_common_light_02_holo_up.png", "3": "/assets/weapons/es_common_light_02_holo_up.png", "4": "/assets/weapons/es_common_light_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_light_02_holo_down.png", "2": "/assets/weapons/es_common_light_02_holo_down.png", "3": "/assets/weapons/es_common_light_02_holo_down.png", "4": "/assets/weapons/es_common_light_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_light_03",
    "name": "Falce di Rimbalzo",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair"
    ],
    "effect": {
      "id": "colpo_ritorno",
      "name": "Colpo di ritorno",
      "description": "Infligge 2 danni aggiuntivi se spara almeno 2 proiettili.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Due dischi a falce su braccio magnetico, metallizzazione rame, traiettoria arcuata.",
      "hologramStyle": "light_colpo_ritorno",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_light_03_card.png", "2": "/assets/weapons/es_common_light_03_card.png", "3": "/assets/weapons/es_common_light_03_card.png", "4": "/assets/weapons/es_common_light_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_light_03_holo_up.png", "2": "/assets/weapons/es_common_light_03_holo_up.png", "3": "/assets/weapons/es_common_light_03_holo_up.png", "4": "/assets/weapons/es_common_light_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_light_03_holo_down.png", "2": "/assets/weapons/es_common_light_03_holo_down.png", "3": "/assets/weapons/es_common_light_03_holo_down.png", "4": "/assets/weapons/es_common_light_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_light_04",
    "name": "Ago Gravitico",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind"
    ],
    "effect": {
      "id": "puntura_critica",
      "name": "Puntura critica",
      "description": "Infligge 4 danni extra ripetendo la stessa categoria Poker dell'attacco precedente.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Fucile a spillo con singola lunga canna, lente viola e scarica sottile.",
      "hologramStyle": "light_puntura_critica",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_light_04_card.png", "2": "/assets/weapons/es_common_light_04_card.png", "3": "/assets/weapons/es_common_light_04_card.png", "4": "/assets/weapons/es_common_light_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_light_04_holo_up.png", "2": "/assets/weapons/es_common_light_04_holo_up.png", "3": "/assets/weapons/es_common_light_04_holo_up.png", "4": "/assets/weapons/es_common_light_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_light_04_holo_down.png", "2": "/assets/weapons/es_common_light_04_holo_down.png", "3": "/assets/weapons/es_common_light_04_holo_down.png", "4": "/assets/weapons/es_common_light_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_medium_01",
    "name": "Doppio Arco Ionico",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "straight_4"
    ],
    "effect": {
      "id": "catena_conduttiva",
      "name": "Catena conduttiva",
      "description": "Infligge 3 danni extra se anche l'avversario ha sparato nello scambio.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Due elettrodi a ferro di cavallo, archi elettrici bianchi.",
      "hologramStyle": "medium_catena_conduttiva",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_medium_01_card.png", "2": "/assets/weapons/es_common_medium_01_card.png", "3": "/assets/weapons/es_common_medium_01_card.png", "4": "/assets/weapons/es_common_medium_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_medium_01_holo_up.png", "2": "/assets/weapons/es_common_medium_01_holo_up.png", "3": "/assets/weapons/es_common_medium_01_holo_up.png", "4": "/assets/weapons/es_common_medium_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_medium_01_holo_down.png", "2": "/assets/weapons/es_common_medium_01_holo_down.png", "3": "/assets/weapons/es_common_medium_01_holo_down.png", "4": "/assets/weapons/es_common_medium_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_medium_02",
    "name": "Cannone a Prisma",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "flush_4"
    ],
    "effect": {
      "id": "rifrazione",
      "name": "Rifrazione",
      "description": "Con un solo seme nella combinazione infligge 4 danni extra; altrimenti recupera 2 Boost.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Canone esagonale traslucido, cristallo centrale, raggi prismatici.",
      "hologramStyle": "medium_rifrazione",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_medium_02_card.png", "2": "/assets/weapons/es_common_medium_02_card.png", "3": "/assets/weapons/es_common_medium_02_card.png", "4": "/assets/weapons/es_common_medium_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_medium_02_holo_up.png", "2": "/assets/weapons/es_common_medium_02_holo_up.png", "3": "/assets/weapons/es_common_medium_02_holo_up.png", "4": "/assets/weapons/es_common_medium_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_medium_02_holo_down.png", "2": "/assets/weapons/es_common_medium_02_holo_down.png", "3": "/assets/weapons/es_common_medium_02_holo_down.png", "4": "/assets/weapons/es_common_medium_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_medium_03",
    "name": "Turbina Fotonica",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "two_pair",
      "straight_4"
    ],
    "effect": {
      "id": "sovraccarico_progressivo",
      "name": "Sovraccarico progressivo",
      "description": "Ripetere la stessa arma in scambi consecutivi aumenta progressivamente il danno extra (max 6).",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Turbina di anelli concentrici, rotore brillante arancione.",
      "hologramStyle": "medium_sovraccarico_progressivo",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_medium_03_card.png", "2": "/assets/weapons/es_common_medium_03_card.png", "3": "/assets/weapons/es_common_medium_03_card.png", "4": "/assets/weapons/es_common_medium_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_medium_03_holo_up.png", "2": "/assets/weapons/es_common_medium_03_holo_up.png", "3": "/assets/weapons/es_common_medium_03_holo_up.png", "4": "/assets/weapons/es_common_medium_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_medium_03_holo_down.png", "2": "/assets/weapons/es_common_medium_03_holo_down.png", "3": "/assets/weapons/es_common_medium_03_holo_down.png", "4": "/assets/weapons/es_common_medium_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_medium_04",
    "name": "Scudo-Arpione",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "flush_4"
    ],
    "effect": {
      "id": "penetrazione_schermata",
      "name": "Penetrazione schermata",
      "description": "Se il nemico ha una difesa preparata infligge 4 danni extra, altrimenti applica +2 vulnerabilità futura.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Arpione elettrico e campo frontale semicircolare.",
      "hologramStyle": "medium_penetrazione_schermata",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_medium_04_card.png", "2": "/assets/weapons/es_common_medium_04_card.png", "3": "/assets/weapons/es_common_medium_04_card.png", "4": "/assets/weapons/es_common_medium_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_medium_04_holo_up.png", "2": "/assets/weapons/es_common_medium_04_holo_up.png", "3": "/assets/weapons/es_common_medium_04_holo_up.png", "4": "/assets/weapons/es_common_medium_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_medium_04_holo_down.png", "2": "/assets/weapons/es_common_medium_04_holo_down.png", "3": "/assets/weapons/es_common_medium_04_holo_down.png", "4": "/assets/weapons/es_common_medium_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_heavy_01",
    "name": "Obice del Crepuscolo",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "straight_flush_4",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "onda_urto",
      "name": "Onda d’urto",
      "description": "A salva piena infligge 4 danni extra.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Obice compatto enorme con bocca stellata, detonazione circolare.",
      "hologramStyle": "heavy_onda_urto",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_heavy_01_card.png", "2": "/assets/weapons/es_common_heavy_01_card.png", "3": "/assets/weapons/es_common_heavy_01_card.png", "4": "/assets/weapons/es_common_heavy_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_heavy_01_holo_up.png", "2": "/assets/weapons/es_common_heavy_01_holo_up.png", "3": "/assets/weapons/es_common_heavy_01_holo_up.png", "4": "/assets/weapons/es_common_heavy_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_heavy_01_holo_down.png", "2": "/assets/weapons/es_common_heavy_01_holo_down.png", "3": "/assets/weapons/es_common_heavy_01_holo_down.png", "4": "/assets/weapons/es_common_heavy_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_heavy_02",
    "name": "Lanciatore Leviatano",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "full_house",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "ritardo_impatto",
      "name": "Ritardo d’impatto",
      "description": "Prepara 4 danni ritardati da infliggere nel prossimo scambio.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Lanciatori gemelli, missile con pinne blu, scia di plasma.",
      "hologramStyle": "heavy_ritardo_impatto",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_heavy_02_card.png", "2": "/assets/weapons/es_common_heavy_02_card.png", "3": "/assets/weapons/es_common_heavy_02_card.png", "4": "/assets/weapons/es_common_heavy_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_heavy_02_holo_up.png", "2": "/assets/weapons/es_common_heavy_02_holo_up.png", "3": "/assets/weapons/es_common_heavy_02_holo_up.png", "4": "/assets/weapons/es_common_heavy_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_heavy_02_holo_down.png", "2": "/assets/weapons/es_common_heavy_02_holo_down.png", "3": "/assets/weapons/es_common_heavy_02_holo_down.png", "4": "/assets/weapons/es_common_heavy_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_heavy_03",
    "name": "Mortaio Gravem",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "straight_flush_4",
      "four_of_a_kind",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "campo_gravita",
      "name": "Campo di gravità",
      "description": "Rende il bersaglio vulnerabile a 4 danni extra quando verrà colpito nello scambio successivo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Mortaio sferico corazzato, vortice verde opaco.",
      "hologramStyle": "heavy_campo_gravita",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_heavy_03_card.png", "2": "/assets/weapons/es_common_heavy_03_card.png", "3": "/assets/weapons/es_common_heavy_03_card.png", "4": "/assets/weapons/es_common_heavy_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_heavy_03_holo_up.png", "2": "/assets/weapons/es_common_heavy_03_holo_up.png", "3": "/assets/weapons/es_common_heavy_03_holo_up.png", "4": "/assets/weapons/es_common_heavy_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_heavy_03_holo_down.png", "2": "/assets/weapons/es_common_heavy_03_holo_down.png", "3": "/assets/weapons/es_common_heavy_03_holo_down.png", "4": "/assets/weapons/es_common_heavy_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_common_heavy_04",
    "name": "Forgia Stellare",
    "rarity": "Comune",
    "rarityKey": "common",
    "rarityColor": "#10b981",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "residuo_termico",
      "name": "Residuo termico",
      "description": "Ogni attacco attivo recupera 3 punti di energia Boost.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone fusorio con mantello metallico e fiamme azzurre.",
      "hologramStyle": "heavy_residuo_termico",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_common_heavy_04_card.png", "2": "/assets/weapons/es_common_heavy_04_card.png", "3": "/assets/weapons/es_common_heavy_04_card.png", "4": "/assets/weapons/es_common_heavy_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_common_heavy_04_holo_up.png", "2": "/assets/weapons/es_common_heavy_04_holo_up.png", "3": "/assets/weapons/es_common_heavy_04_holo_up.png", "4": "/assets/weapons/es_common_heavy_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_common_heavy_04_holo_down.png", "2": "/assets/weapons/es_common_heavy_04_holo_down.png", "3": "/assets/weapons/es_common_heavy_04_holo_down.png", "4": "/assets/weapons/es_common_heavy_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_light_01",
    "name": "Vespa Quantum",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair"
    ],
    "effect": {
      "id": "scatto_evasivo",
      "name": "Scatto evasivo",
      "description": "Prepara una protezione da 5 danni per il prossimo attacco ricevuto.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Droni-vespa luminosi attorno a una pistola orbitante.",
      "hologramStyle": "light_scatto_evasivo",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_light_01_card.png", "2": "/assets/weapons/es_rare_light_01_card.png", "3": "/assets/weapons/es_rare_light_01_card.png", "4": "/assets/weapons/es_rare_light_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_light_01_holo_up.png", "2": "/assets/weapons/es_rare_light_01_holo_up.png", "3": "/assets/weapons/es_rare_light_01_holo_up.png", "4": "/assets/weapons/es_rare_light_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_light_01_holo_down.png", "2": "/assets/weapons/es_rare_light_01_holo_down.png", "3": "/assets/weapons/es_rare_light_01_holo_down.png", "4": "/assets/weapons/es_rare_light_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_light_02",
    "name": "Gemelli Mirage",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind"
    ],
    "effect": {
      "id": "eco_olografica",
      "name": "Eco olografica",
      "description": "Prepara 4 danni aggiuntivi per il prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Due proiettori speculari, miraggi ciano e lilla.",
      "hologramStyle": "light_eco_olografica",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_light_02_card.png", "2": "/assets/weapons/es_rare_light_02_card.png", "3": "/assets/weapons/es_rare_light_02_card.png", "4": "/assets/weapons/es_rare_light_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_light_02_holo_up.png", "2": "/assets/weapons/es_rare_light_02_holo_up.png", "3": "/assets/weapons/es_rare_light_02_holo_up.png", "4": "/assets/weapons/es_rare_light_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_light_02_holo_down.png", "2": "/assets/weapons/es_rare_light_02_holo_down.png", "3": "/assets/weapons/es_rare_light_02_holo_down.png", "4": "/assets/weapons/es_rare_light_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_light_03",
    "name": "Lancia Aurora",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair",
      "straight_4"],
    "effect": {
      "id": "taglio_cromatico",
      "name": "Taglio cromatico",
      "description": "Se la combinazione consumata contiene almeno due semi diversi infligge 4 danni extra.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Una lancia di luce con fibra prismatica e base artica.",
      "hologramStyle": "light_taglio_cromatico",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_light_03_card.png", "2": "/assets/weapons/es_rare_light_03_card.png", "3": "/assets/weapons/es_rare_light_03_card.png", "4": "/assets/weapons/es_rare_light_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_light_03_holo_up.png", "2": "/assets/weapons/es_rare_light_03_holo_up.png", "3": "/assets/weapons/es_rare_light_03_holo_up.png", "4": "/assets/weapons/es_rare_light_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_light_03_holo_down.png", "2": "/assets/weapons/es_rare_light_03_holo_down.png", "3": "/assets/weapons/es_rare_light_03_holo_down.png", "4": "/assets/weapons/es_rare_light_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_light_04",
    "name": "Scintilla Nera",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "one_pair",
      "flush_4"
    ],
    "effect": {
      "id": "interferenza",
      "name": "Interferenza",
      "description": "Sottrae fino a 3 punti dal Boost dell'avversario.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Pistola monoblocco nera con scariche rosse filamentose.",
      "hologramStyle": "light_interferenza",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_light_04_card.png", "2": "/assets/weapons/es_rare_light_04_card.png", "3": "/assets/weapons/es_rare_light_04_card.png", "4": "/assets/weapons/es_rare_light_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_light_04_holo_up.png", "2": "/assets/weapons/es_rare_light_04_holo_up.png", "3": "/assets/weapons/es_rare_light_04_holo_up.png", "4": "/assets/weapons/es_rare_light_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_light_04_holo_down.png", "2": "/assets/weapons/es_rare_light_04_holo_down.png", "3": "/assets/weapons/es_rare_light_04_holo_down.png", "4": "/assets/weapons/es_rare_light_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_medium_01",
    "name": "Spettro Ferrico",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "straight_4"
    ],
    "effect": {
      "id": "sottrazione_magnetica",
      "name": "Sottrazione magnetica",
      "description": "Rimuove fino a 3 munizioni dal serbatoio avversario legato al suo ultimo sparo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Cannone a ferri di cavallo fluttuanti, flusso magnetico.",
      "hologramStyle": "medium_sottrazione_magnetica",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_medium_01_card.png", "2": "/assets/weapons/es_rare_medium_01_card.png", "3": "/assets/weapons/es_rare_medium_01_card.png", "4": "/assets/weapons/es_rare_medium_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_medium_01_holo_up.png", "2": "/assets/weapons/es_rare_medium_01_holo_up.png", "3": "/assets/weapons/es_rare_medium_01_holo_up.png", "4": "/assets/weapons/es_rare_medium_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_medium_01_holo_down.png", "2": "/assets/weapons/es_rare_medium_01_holo_down.png", "3": "/assets/weapons/es_rare_medium_01_holo_down.png", "4": "/assets/weapons/es_rare_medium_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_medium_02",
    "name": "Lente di Nyx",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "flush_4"
    ],
    "effect": {
      "id": "mira_anticipata",
      "name": "Mira anticipata",
      "description": "Prepara un bonus di 5 danni per il prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Cannone telescopico a tripla lente viola.",
      "hologramStyle": "medium_mira_anticipata",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_medium_02_card.png", "2": "/assets/weapons/es_rare_medium_02_card.png", "3": "/assets/weapons/es_rare_medium_02_card.png", "4": "/assets/weapons/es_rare_medium_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_medium_02_holo_up.png", "2": "/assets/weapons/es_rare_medium_02_holo_up.png", "3": "/assets/weapons/es_rare_medium_02_holo_up.png", "4": "/assets/weapons/es_rare_medium_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_medium_02_holo_down.png", "2": "/assets/weapons/es_rare_medium_02_holo_down.png", "3": "/assets/weapons/es_rare_medium_02_holo_down.png", "4": "/assets/weapons/es_rare_medium_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_medium_03",
    "name": "Raggio Bifronte",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "two_pair",
      "straight_5"
    ],
    "effect": {
      "id": "scelta_frequenza",
      "name": "Scelta di frequenza",
      "description": "Se spara almeno 4 colpi usa automaticamente la frequenza offensiva (+3 danni); altrimenti quella difensiva (schermo +4).",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Doppia canna asimmetrica, raggio giallo e blu.",
      "hologramStyle": "medium_scelta_frequenza",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_medium_03_card.png", "2": "/assets/weapons/es_rare_medium_03_card.png", "3": "/assets/weapons/es_rare_medium_03_card.png", "4": "/assets/weapons/es_rare_medium_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_medium_03_holo_up.png", "2": "/assets/weapons/es_rare_medium_03_holo_up.png", "3": "/assets/weapons/es_rare_medium_03_holo_up.png", "4": "/assets/weapons/es_rare_medium_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_medium_03_holo_down.png", "2": "/assets/weapons/es_rare_medium_03_holo_down.png", "3": "/assets/weapons/es_rare_medium_03_holo_down.png", "4": "/assets/weapons/es_rare_medium_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_medium_04",
    "name": "Draga Volt",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "full_house"
    ],
    "effect": {
      "id": "recupero_carica",
      "name": "Recupero di carica",
      "description": "Recupera 3 munizioni del proprio seme dopo uno sparo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Trivella elettromagnetica, piccole celle incandescenti.",
      "hologramStyle": "medium_recupero_carica",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_medium_04_card.png", "2": "/assets/weapons/es_rare_medium_04_card.png", "3": "/assets/weapons/es_rare_medium_04_card.png", "4": "/assets/weapons/es_rare_medium_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_medium_04_holo_up.png", "2": "/assets/weapons/es_rare_medium_04_holo_up.png", "3": "/assets/weapons/es_rare_medium_04_holo_up.png", "4": "/assets/weapons/es_rare_medium_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_medium_04_holo_down.png", "2": "/assets/weapons/es_rare_medium_04_holo_down.png", "3": "/assets/weapons/es_rare_medium_04_holo_down.png", "4": "/assets/weapons/es_rare_medium_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_heavy_01",
    "name": "Martello Quasar",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "straight_flush_4",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "stordimento_reattore",
      "name": "Stordimento del reattore",
      "description": "Indebolisce fino a 5 danni del prossimo sparo avversario.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Maglio cosmico sospeso, stella in miniatura alla testa.",
      "hologramStyle": "heavy_stordimento_reattore",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_heavy_01_card.png", "2": "/assets/weapons/es_rare_heavy_01_card.png", "3": "/assets/weapons/es_rare_heavy_01_card.png", "4": "/assets/weapons/es_rare_heavy_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_heavy_01_holo_up.png", "2": "/assets/weapons/es_rare_heavy_01_holo_up.png", "3": "/assets/weapons/es_rare_heavy_01_holo_up.png", "4": "/assets/weapons/es_rare_heavy_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_heavy_01_holo_down.png", "2": "/assets/weapons/es_rare_heavy_01_holo_down.png", "3": "/assets/weapons/es_rare_heavy_01_holo_down.png", "4": "/assets/weapons/es_rare_heavy_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_heavy_02",
    "name": "Arca di Tritone",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "full_house",
      "flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "sciame_guidato",
      "name": "Sciame guidato",
      "description": "I droni preparano +6 danni per il prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Batteria navale circolare, missili piccoli luminosi.",
      "hologramStyle": "heavy_sciame_guidato",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_heavy_02_card.png", "2": "/assets/weapons/es_rare_heavy_02_card.png", "3": "/assets/weapons/es_rare_heavy_02_card.png", "4": "/assets/weapons/es_rare_heavy_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_heavy_02_holo_up.png", "2": "/assets/weapons/es_rare_heavy_02_holo_up.png", "3": "/assets/weapons/es_rare_heavy_02_holo_up.png", "4": "/assets/weapons/es_rare_heavy_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_heavy_02_holo_down.png", "2": "/assets/weapons/es_rare_heavy_02_holo_down.png", "3": "/assets/weapons/es_rare_heavy_02_holo_down.png", "4": "/assets/weapons/es_rare_heavy_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_heavy_03",
    "name": "Cataclisma Polare",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "straight_flush_5",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "frattura_criogenica",
      "name": "Frattura criogenica",
      "description": "Il gelo riduce fino a 4 danni del prossimo sparo avversario.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Artiglieria glaciale con cristalli fratturati.",
      "hologramStyle": "heavy_frattura_criogenica",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_heavy_03_card.png", "2": "/assets/weapons/es_rare_heavy_03_card.png", "3": "/assets/weapons/es_rare_heavy_03_card.png", "4": "/assets/weapons/es_rare_heavy_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_heavy_03_holo_up.png", "2": "/assets/weapons/es_rare_heavy_03_holo_up.png", "3": "/assets/weapons/es_rare_heavy_03_holo_up.png", "4": "/assets/weapons/es_rare_heavy_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_heavy_03_holo_down.png", "2": "/assets/weapons/es_rare_heavy_03_holo_down.png", "3": "/assets/weapons/es_rare_heavy_03_holo_down.png", "4": "/assets/weapons/es_rare_heavy_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_rare_heavy_04",
    "name": "Faro del Vuoto",
    "rarity": "Rara",
    "rarityKey": "rare",
    "rarityColor": "#38bdf8",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "straight_flush_4",
      "full_house",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "richiamo_astrale",
      "name": "Richiamo astrale",
      "description": "Il faro prepara +6 danni per il prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Torre-cannone con lente su vortice nero.",
      "hologramStyle": "heavy_richiamo_astrale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_rare_heavy_04_card.png", "2": "/assets/weapons/es_rare_heavy_04_card.png", "3": "/assets/weapons/es_rare_heavy_04_card.png", "4": "/assets/weapons/es_rare_heavy_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_rare_heavy_04_holo_up.png", "2": "/assets/weapons/es_rare_heavy_04_holo_up.png", "3": "/assets/weapons/es_rare_heavy_04_holo_up.png", "4": "/assets/weapons/es_rare_heavy_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_rare_heavy_04_holo_down.png", "2": "/assets/weapons/es_rare_heavy_04_holo_down.png", "3": "/assets/weapons/es_rare_heavy_04_holo_down.png", "4": "/assets/weapons/es_rare_heavy_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_light_01",
    "name": "Colibrì Tachionico",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind"
    ],
    "effect": {
      "id": "colpo_fuori_fase",
      "name": "Colpo fuori fase",
      "description": "Il proiettile fuori fase infligge 3 danni extra immediati.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Carabina sottile con ali meccaniche e scintille color oro.",
      "hologramStyle": "light_colpo_fuori_fase",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_light_01_card.png", "2": "/assets/weapons/es_epic_light_01_card.png", "3": "/assets/weapons/es_epic_light_01_card.png", "4": "/assets/weapons/es_epic_light_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_light_01_holo_up.png", "2": "/assets/weapons/es_epic_light_01_holo_up.png", "3": "/assets/weapons/es_epic_light_01_holo_up.png", "4": "/assets/weapons/es_epic_light_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_light_01_holo_down.png", "2": "/assets/weapons/es_epic_light_01_holo_down.png", "3": "/assets/weapons/es_epic_light_01_holo_down.png", "4": "/assets/weapons/es_epic_light_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_light_02",
    "name": "Sette Veli",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair",
      "straight_4"],
    "effect": {
      "id": "finta_multipla",
      "name": "Finta multipla",
      "description": "Le copie illusorie preparano una protezione da 6 danni per il prossimo attacco ricevuto.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Sette lamelle flottanti intorno a una canna di luce.",
      "hologramStyle": "light_finta_multipla",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_light_02_card.png", "2": "/assets/weapons/es_epic_light_02_card.png", "3": "/assets/weapons/es_epic_light_02_card.png", "4": "/assets/weapons/es_epic_light_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_light_02_holo_up.png", "2": "/assets/weapons/es_epic_light_02_holo_up.png", "3": "/assets/weapons/es_epic_light_02_holo_up.png", "4": "/assets/weapons/es_epic_light_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_light_02_holo_down.png", "2": "/assets/weapons/es_epic_light_02_holo_down.png", "3": "/assets/weapons/es_epic_light_02_holo_down.png", "4": "/assets/weapons/es_epic_light_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_light_03",
    "name": "Serpe Nebulare",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "one_pair",
      "flush_4"
    ],
    "effect": {
      "id": "curva_inseguitrice",
      "name": "Curva inseguitrice",
      "description": "Infligge 5 danni extra se il Poker è perso (salva al 50%), altrimenti 2 danni extra.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Lama a serpente di plasma verde e viola.",
      "hologramStyle": "light_curva_inseguitrice",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_light_03_card.png", "2": "/assets/weapons/es_epic_light_03_card.png", "3": "/assets/weapons/es_epic_light_03_card.png", "4": "/assets/weapons/es_epic_light_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_light_03_holo_up.png", "2": "/assets/weapons/es_epic_light_03_holo_up.png", "3": "/assets/weapons/es_epic_light_03_holo_up.png", "4": "/assets/weapons/es_epic_light_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_light_03_holo_down.png", "2": "/assets/weapons/es_epic_light_03_holo_down.png", "3": "/assets/weapons/es_epic_light_03_holo_down.png", "4": "/assets/weapons/es_epic_light_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_light_04",
    "name": "Chiave del Paradosso",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind",
      "straight_4"],
    "effect": {
      "id": "inversione_rotta",
      "name": "Inversione di rotta",
      "description": "Recupera 2 proiettili del seme dell'arma dopo lo sparo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Dispositivo a forma di chiave con geometrie impossibili.",
      "hologramStyle": "light_inversione_rotta",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_light_04_card.png", "2": "/assets/weapons/es_epic_light_04_card.png", "3": "/assets/weapons/es_epic_light_04_card.png", "4": "/assets/weapons/es_epic_light_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_light_04_holo_up.png", "2": "/assets/weapons/es_epic_light_04_holo_up.png", "3": "/assets/weapons/es_epic_light_04_holo_up.png", "4": "/assets/weapons/es_epic_light_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_light_04_holo_down.png", "2": "/assets/weapons/es_epic_light_04_holo_down.png", "3": "/assets/weapons/es_epic_light_04_holo_down.png", "4": "/assets/weapons/es_epic_light_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_medium_01",
    "name": "Matrice Helios",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "flush_4"
    ],
    "effect": {
      "id": "risonanza_impulsi",
      "name": "Risonanza a impulsi",
      "description": "Infligge fino a 6 danni extra in base al numero di carte della combinazione Poker.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Matrice triangolare solare con nuclei arancio.",
      "hologramStyle": "medium_risonanza_impulsi",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_medium_01_card.png", "2": "/assets/weapons/es_epic_medium_01_card.png", "3": "/assets/weapons/es_epic_medium_01_card.png", "4": "/assets/weapons/es_epic_medium_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_medium_01_holo_up.png", "2": "/assets/weapons/es_epic_medium_01_holo_up.png", "3": "/assets/weapons/es_epic_medium_01_holo_up.png", "4": "/assets/weapons/es_epic_medium_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_medium_01_holo_down.png", "2": "/assets/weapons/es_epic_medium_01_holo_down.png", "3": "/assets/weapons/es_epic_medium_01_holo_down.png", "4": "/assets/weapons/es_epic_medium_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_medium_02",
    "name": "Idra Sinaptica",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "full_house"
    ],
    "effect": {
      "id": "tre_traiettorie",
      "name": "Tre traiettorie",
      "description": "Infligge fino a 6 danni extra in proporzione al numero di proiettili sparati.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Tre teste di serpente metalliche con occhi al neon.",
      "hologramStyle": "medium_tre_traiettorie",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_medium_02_card.png", "2": "/assets/weapons/es_epic_medium_02_card.png", "3": "/assets/weapons/es_epic_medium_02_card.png", "4": "/assets/weapons/es_epic_medium_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_medium_02_holo_up.png", "2": "/assets/weapons/es_epic_medium_02_holo_up.png", "3": "/assets/weapons/es_epic_medium_02_holo_up.png", "4": "/assets/weapons/es_epic_medium_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_medium_02_holo_down.png", "2": "/assets/weapons/es_epic_medium_02_holo_down.png", "3": "/assets/weapons/es_epic_medium_02_holo_down.png", "4": "/assets/weapons/es_epic_medium_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_medium_03",
    "name": "Orizzonte Blu",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "straight_4",
      "flush_5"
    ],
    "effect": {
      "id": "taglio_persistente",
      "name": "Taglio persistente",
      "description": "Prepara un taglio da 5 danni che colpirà nel prossimo scambio.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Artiglieria a lama di luce blu orizzontale.",
      "hologramStyle": "medium_taglio_persistente",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_medium_03_card.png", "2": "/assets/weapons/es_epic_medium_03_card.png", "3": "/assets/weapons/es_epic_medium_03_card.png", "4": "/assets/weapons/es_epic_medium_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_medium_03_holo_up.png", "2": "/assets/weapons/es_epic_medium_03_holo_up.png", "3": "/assets/weapons/es_epic_medium_03_holo_up.png", "4": "/assets/weapons/es_epic_medium_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_medium_03_holo_down.png", "2": "/assets/weapons/es_epic_medium_03_holo_down.png", "3": "/assets/weapons/es_epic_medium_03_holo_down.png", "4": "/assets/weapons/es_epic_medium_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_medium_04",
    "name": "Corvo di Antimateria",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "straight_5",
      "full_house"
    ],
    "effect": {
      "id": "erosione",
      "name": "Erosione",
      "description": "Erode fino a 4 punti di energia Boost avversaria dopo lo sparo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Cannone corvino con piume metalliche e fumo cosmico.",
      "hologramStyle": "medium_erosione",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_medium_04_card.png", "2": "/assets/weapons/es_epic_medium_04_card.png", "3": "/assets/weapons/es_epic_medium_04_card.png", "4": "/assets/weapons/es_epic_medium_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_medium_04_holo_up.png", "2": "/assets/weapons/es_epic_medium_04_holo_up.png", "3": "/assets/weapons/es_epic_medium_04_holo_up.png", "4": "/assets/weapons/es_epic_medium_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_medium_04_holo_down.png", "2": "/assets/weapons/es_epic_medium_04_holo_down.png", "3": "/assets/weapons/es_epic_medium_04_holo_down.png", "4": "/assets/weapons/es_epic_medium_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_heavy_01",
    "name": "Giudizio di Orione",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "straight_flush_5",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "colpo_orbitale",
      "name": "Colpo orbitale",
      "description": "Prepara un impatto orbitale da 7 danni nello scambio successivo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone a telescopio con costellazione Orione.",
      "hologramStyle": "heavy_colpo_orbitale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_heavy_01_card.png", "2": "/assets/weapons/es_epic_heavy_01_card.png", "3": "/assets/weapons/es_epic_heavy_01_card.png", "4": "/assets/weapons/es_epic_heavy_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_heavy_01_holo_up.png", "2": "/assets/weapons/es_epic_heavy_01_holo_up.png", "3": "/assets/weapons/es_epic_heavy_01_holo_up.png", "4": "/assets/weapons/es_epic_heavy_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_heavy_01_holo_down.png", "2": "/assets/weapons/es_epic_heavy_01_holo_down.png", "3": "/assets/weapons/es_epic_heavy_01_holo_down.png", "4": "/assets/weapons/es_epic_heavy_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_heavy_02",
    "name": "Cripta del Sole",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "full_house",
      "flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "accumulo_solare",
      "name": "Accumulo solare",
      "description": "Accumula 2 cariche solari per sparo; a 6 cariche le converte in 6 danni extra.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Arma sarcofago d’oro nero con nucleo stellare.",
      "hologramStyle": "heavy_accumulo_solare",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_heavy_02_card.png", "2": "/assets/weapons/es_epic_heavy_02_card.png", "3": "/assets/weapons/es_epic_heavy_02_card.png", "4": "/assets/weapons/es_epic_heavy_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_heavy_02_holo_up.png", "2": "/assets/weapons/es_epic_heavy_02_holo_up.png", "3": "/assets/weapons/es_epic_heavy_02_holo_up.png", "4": "/assets/weapons/es_epic_heavy_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_heavy_02_holo_down.png", "2": "/assets/weapons/es_epic_heavy_02_holo_down.png", "3": "/assets/weapons/es_epic_heavy_02_holo_down.png", "4": "/assets/weapons/es_epic_heavy_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_heavy_03",
    "name": "Anello di Marea",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "straight_flush_4",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "onda_gravitazionale",
      "name": "Onda gravitazionale",
      "description": "Riduce fino a 6 danni del successivo sparo avversario.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Anello gigante ruotante sopra il cannone.",
      "hologramStyle": "heavy_onda_gravitazionale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_heavy_03_card.png", "2": "/assets/weapons/es_epic_heavy_03_card.png", "3": "/assets/weapons/es_epic_heavy_03_card.png", "4": "/assets/weapons/es_epic_heavy_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_heavy_03_holo_up.png", "2": "/assets/weapons/es_epic_heavy_03_holo_up.png", "3": "/assets/weapons/es_epic_heavy_03_holo_up.png", "4": "/assets/weapons/es_epic_heavy_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_heavy_03_holo_down.png", "2": "/assets/weapons/es_epic_heavy_03_holo_down.png", "3": "/assets/weapons/es_epic_heavy_03_holo_down.png", "4": "/assets/weapons/es_epic_heavy_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_epic_heavy_04",
    "name": "Cattedrale di Plasma",
    "rarity": "Epica",
    "rarityKey": "epic",
    "rarityColor": "#c084fc",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "straight_flush_5",
      "royal_flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "fuoco_corale",
      "name": "Fuoco corale",
      "description": "Infligge 6 danni extra a salva piena, altrimenti 2.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone gotico con guglie luminose rosse.",
      "hologramStyle": "heavy_fuoco_corale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_epic_heavy_04_card.png", "2": "/assets/weapons/es_epic_heavy_04_card.png", "3": "/assets/weapons/es_epic_heavy_04_card.png", "4": "/assets/weapons/es_epic_heavy_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_epic_heavy_04_holo_up.png", "2": "/assets/weapons/es_epic_heavy_04_holo_up.png", "3": "/assets/weapons/es_epic_heavy_04_holo_up.png", "4": "/assets/weapons/es_epic_heavy_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_epic_heavy_04_holo_down.png", "2": "/assets/weapons/es_epic_heavy_04_holo_down.png", "3": "/assets/weapons/es_epic_heavy_04_holo_down.png", "4": "/assets/weapons/es_epic_heavy_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_light_01",
    "name": "Filo dell’Eternità",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "one_pair",
      "straight_5"
    ],
    "effect": {
      "id": "traccia_immortale",
      "name": "Traccia immortale",
      "description": "La scia prepara +6 danni al prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Sottile fucile d’argento con filamento infinito.",
      "hologramStyle": "light_traccia_immortale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_light_01_card.png", "2": "/assets/weapons/es_legendary_light_01_card.png", "3": "/assets/weapons/es_legendary_light_01_card.png", "4": "/assets/weapons/es_legendary_light_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_light_01_holo_up.png", "2": "/assets/weapons/es_legendary_light_01_holo_up.png", "3": "/assets/weapons/es_legendary_light_01_holo_up.png", "4": "/assets/weapons/es_legendary_light_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_light_01_holo_down.png", "2": "/assets/weapons/es_legendary_light_01_holo_down.png", "3": "/assets/weapons/es_legendary_light_01_holo_down.png", "4": "/assets/weapons/es_legendary_light_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_light_02",
    "name": "Luce Fantasma",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "one_pair",
      "two_pair",
      "flush_4"],
    "effect": {
      "id": "sparo_invisibile",
      "name": "Sparo invisibile",
      "description": "Il colpo non intercettato infligge 3 danni extra immediati.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Arma trasparente sospesa con bagliori azzurri.",
      "hologramStyle": "light_sparo_invisibile",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_light_02_card.png", "2": "/assets/weapons/es_legendary_light_02_card.png", "3": "/assets/weapons/es_legendary_light_02_card.png", "4": "/assets/weapons/es_legendary_light_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_light_02_holo_up.png", "2": "/assets/weapons/es_legendary_light_02_holo_up.png", "3": "/assets/weapons/es_legendary_light_02_holo_up.png", "4": "/assets/weapons/es_legendary_light_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_light_02_holo_down.png", "2": "/assets/weapons/es_legendary_light_02_holo_down.png", "3": "/assets/weapons/es_legendary_light_02_holo_down.png", "4": "/assets/weapons/es_legendary_light_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_light_03",
    "name": "Artiglio del Tempo",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "one_pair",
      "three_of_a_kind",
      "straight_4"],
    "effect": {
      "id": "battito_differito",
      "name": "Battito differito",
      "description": "Prepara 7 danni da infliggere nello scambio successivo.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Artiglio cromato su quadrante di orologio astrale.",
      "hologramStyle": "light_battito_differito",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_light_03_card.png", "2": "/assets/weapons/es_legendary_light_03_card.png", "3": "/assets/weapons/es_legendary_light_03_card.png", "4": "/assets/weapons/es_legendary_light_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_light_03_holo_up.png", "2": "/assets/weapons/es_legendary_light_03_holo_up.png", "3": "/assets/weapons/es_legendary_light_03_holo_up.png", "4": "/assets/weapons/es_legendary_light_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_light_03_holo_down.png", "2": "/assets/weapons/es_legendary_light_03_holo_down.png", "3": "/assets/weapons/es_legendary_light_03_holo_down.png", "4": "/assets/weapons/es_legendary_light_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_light_04",
    "name": "Penna del Destino",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "light",
    "classLabel": "Leggera",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "one_pair",
      "flush_5"
    ],
    "effect": {
      "id": "segno_prescelto",
      "name": "Segno prescelto",
      "description": "Marca l'avversario per subire 7 danni extra al prossimo colpo ricevuto.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "⚡",
      "artDirection": "Penna laser regale con piume metalliche d’oro.",
      "hologramStyle": "light_segno_prescelto",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_light_04_card.png", "2": "/assets/weapons/es_legendary_light_04_card.png", "3": "/assets/weapons/es_legendary_light_04_card.png", "4": "/assets/weapons/es_legendary_light_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_light_04_holo_up.png", "2": "/assets/weapons/es_legendary_light_04_holo_up.png", "3": "/assets/weapons/es_legendary_light_04_holo_up.png", "4": "/assets/weapons/es_legendary_light_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_light_04_holo_down.png", "2": "/assets/weapons/es_legendary_light_04_holo_down.png", "3": "/assets/weapons/es_legendary_light_04_holo_down.png", "4": "/assets/weapons/es_legendary_light_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_medium_01",
    "name": "Bussola di Andromeda",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "straight_5"
    ],
    "effect": {
      "id": "bersaglio_stellare",
      "name": "Bersaglio stellare",
      "description": "Il vettore di tiro prepara +8 danni al prossimo attacco riuscito.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Cannone bussola a quattro punte, galassia centrale.",
      "hologramStyle": "medium_bersaglio_stellare",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_medium_01_card.png", "2": "/assets/weapons/es_legendary_medium_01_card.png", "3": "/assets/weapons/es_legendary_medium_01_card.png", "4": "/assets/weapons/es_legendary_medium_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_medium_01_holo_up.png", "2": "/assets/weapons/es_legendary_medium_01_holo_up.png", "3": "/assets/weapons/es_legendary_medium_01_holo_up.png", "4": "/assets/weapons/es_legendary_medium_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_medium_01_holo_down.png", "2": "/assets/weapons/es_legendary_medium_01_holo_down.png", "3": "/assets/weapons/es_legendary_medium_01_holo_down.png", "4": "/assets/weapons/es_legendary_medium_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_medium_02",
    "name": "Corona di Eclisse",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "straight_4",
      "straight_flush_4"
    ],
    "effect": {
      "id": "intermittenza_solare",
      "name": "Intermittenza solare",
      "description": "Il lampo infligge 2 danni extra e prepara uno schermo da 4 danni.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Cerchio eclissato di oro e nero intorno alla canna.",
      "hologramStyle": "medium_intermittenza_solare",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_medium_02_card.png", "2": "/assets/weapons/es_legendary_medium_02_card.png", "3": "/assets/weapons/es_legendary_medium_02_card.png", "4": "/assets/weapons/es_legendary_medium_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_medium_02_holo_up.png", "2": "/assets/weapons/es_legendary_medium_02_holo_up.png", "3": "/assets/weapons/es_legendary_medium_02_holo_up.png", "4": "/assets/weapons/es_legendary_medium_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_medium_02_holo_down.png", "2": "/assets/weapons/es_legendary_medium_02_holo_down.png", "3": "/assets/weapons/es_legendary_medium_02_holo_down.png", "4": "/assets/weapons/es_legendary_medium_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_medium_03",
    "name": "Biblioteca degli Astri",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "full_house",
      "flush_5"
    ],
    "effect": {
      "id": "archivio_tattico",
      "name": "Archivio tattico",
      "description": "Ripetere una categoria Poker infligge 7 danni extra; cambiarla recupera 2 Boost.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Pannelli runici fluttuanti attorno a un emettitore.",
      "hologramStyle": "medium_archivio_tattico",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_medium_03_card.png", "2": "/assets/weapons/es_legendary_medium_03_card.png", "3": "/assets/weapons/es_legendary_medium_03_card.png", "4": "/assets/weapons/es_legendary_medium_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_medium_03_holo_up.png", "2": "/assets/weapons/es_legendary_medium_03_holo_up.png", "3": "/assets/weapons/es_legendary_medium_03_holo_up.png", "4": "/assets/weapons/es_legendary_medium_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_medium_03_holo_down.png", "2": "/assets/weapons/es_legendary_medium_03_holo_down.png", "3": "/assets/weapons/es_legendary_medium_03_holo_down.png", "4": "/assets/weapons/es_legendary_medium_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_medium_04",
    "name": "Macchina del Crepuscolo",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "medium",
    "classLabel": "Media",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "three_of_a_kind",
      "straight_flush_5"
    ],
    "effect": {
      "id": "doppio_impulso",
      "name": "Doppio impulso",
      "description": "Il secondo impulso aggiunge fino a 6 danni in base ai proiettili sparati.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "◎",
      "artDirection": "Motore cilindrico a doppio nucleo azzurro e rosso.",
      "hologramStyle": "medium_doppio_impulso",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_medium_04_card.png", "2": "/assets/weapons/es_legendary_medium_04_card.png", "3": "/assets/weapons/es_legendary_medium_04_card.png", "4": "/assets/weapons/es_legendary_medium_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_medium_04_holo_up.png", "2": "/assets/weapons/es_legendary_medium_04_holo_up.png", "3": "/assets/weapons/es_legendary_medium_04_holo_up.png", "4": "/assets/weapons/es_legendary_medium_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_medium_04_holo_down.png", "2": "/assets/weapons/es_legendary_medium_04_holo_down.png", "3": "/assets/weapons/es_legendary_medium_04_holo_down.png", "4": "/assets/weapons/es_legendary_medium_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_heavy_01",
    "name": "Trono della Singolarità",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "hearts",
    "ammoSymbol": "♥",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "royal_flush_5",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "micro_singolarita",
      "name": "Micro-singolarità",
      "description": "Assorbe fino a 4 munizioni dal serbatoio avversario dello stesso seme dell'arma.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone-trono nero con disco di accrescimento.",
      "hologramStyle": "heavy_micro_singolarita",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_heavy_01_card.png", "2": "/assets/weapons/es_legendary_heavy_01_card.png", "3": "/assets/weapons/es_legendary_heavy_01_card.png", "4": "/assets/weapons/es_legendary_heavy_01_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_heavy_01_holo_up.png", "2": "/assets/weapons/es_legendary_heavy_01_holo_up.png", "3": "/assets/weapons/es_legendary_heavy_01_holo_up.png", "4": "/assets/weapons/es_legendary_heavy_01_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_heavy_01_holo_down.png", "2": "/assets/weapons/es_legendary_heavy_01_holo_down.png", "3": "/assets/weapons/es_legendary_heavy_01_holo_down.png", "4": "/assets/weapons/es_legendary_heavy_01_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_heavy_02",
    "name": "Ultima Supernova",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "diamonds",
    "ammoSymbol": "♦",
    "allowedPokerPatterns": [
      "straight_flush_5",
      "royal_flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "esplosione_stadi",
      "name": "Esplosione a stadi",
      "description": "Infligge 8 danni extra con almeno 5 carte Poker e salva piena; altrimenti 4.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Lanciatore stellare con sfera bianca pronta a esplodere.",
      "hologramStyle": "heavy_esplosione_stadi",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_heavy_02_card.png", "2": "/assets/weapons/es_legendary_heavy_02_card.png", "3": "/assets/weapons/es_legendary_heavy_02_card.png", "4": "/assets/weapons/es_legendary_heavy_02_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_heavy_02_holo_up.png", "2": "/assets/weapons/es_legendary_heavy_02_holo_up.png", "3": "/assets/weapons/es_legendary_heavy_02_holo_up.png", "4": "/assets/weapons/es_legendary_heavy_02_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_heavy_02_holo_down.png", "2": "/assets/weapons/es_legendary_heavy_02_holo_down.png", "3": "/assets/weapons/es_legendary_heavy_02_holo_down.png", "4": "/assets/weapons/es_legendary_heavy_02_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_heavy_03",
    "name": "Portale del Nulla",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "clubs",
    "ammoSymbol": "♣",
    "allowedPokerPatterns": [
      "four_of_a_kind",
      "full_house",
      "straight_4"
    ],
    "secondaryActivationPattern": "straight_4",
    "effect": {
      "id": "traiettoria_portale",
      "name": "Traiettoria portale",
      "description": "L'impatto attraverso il portale infligge 4 danni extra.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone a due portali esagonali viola e oro.",
      "hologramStyle": "heavy_traiettoria_portale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_heavy_03_card.png", "2": "/assets/weapons/es_legendary_heavy_03_card.png", "3": "/assets/weapons/es_legendary_heavy_03_card.png", "4": "/assets/weapons/es_legendary_heavy_03_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_heavy_03_holo_up.png", "2": "/assets/weapons/es_legendary_heavy_03_holo_up.png", "3": "/assets/weapons/es_legendary_heavy_03_holo_up.png", "4": "/assets/weapons/es_legendary_heavy_03_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_heavy_03_holo_down.png", "2": "/assets/weapons/es_legendary_heavy_03_holo_down.png", "3": "/assets/weapons/es_legendary_heavy_03_holo_down.png", "4": "/assets/weapons/es_legendary_heavy_03_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  },
  {
    "id": "es_legendary_heavy_04",
    "name": "Sentenza Cosmica",
    "rarity": "Leggendaria",
    "rarityKey": "legendary",
    "rarityColor": "#facc15",
    "weaponClass": "heavy",
    "classLabel": "Pesante",
    "ammoSuit": "spades",
    "ammoSymbol": "♠",
    "allowedPokerPatterns": [
      "straight_flush_4",
      "royal_flush_5",
      "flush_4"
    ],
    "secondaryActivationPattern": "flush_4",
    "effect": {
      "id": "sigillo_finale",
      "name": "Sigillo finale",
      "description": "Il sigillo espone l'avversario a 9 danni extra al prossimo colpo ricevuto.",
      "implementation": "phase14_active"
    },
    "visual": {
      "icon": "☄",
      "artDirection": "Cannone monumentale inciso con glifi stellari.",
      "hologramStyle": "heavy_sigillo_finale",
      "cardAspect": "original_weapon_card"
    },
    "assets": {
      "cardImageByLevel": {"1": "/assets/weapons/es_legendary_heavy_04_card.png", "2": "/assets/weapons/es_legendary_heavy_04_card.png", "3": "/assets/weapons/es_legendary_heavy_04_card.png", "4": "/assets/weapons/es_legendary_heavy_04_card.png"},
      "hologramUpByLevel": {"1": "/assets/weapons/es_legendary_heavy_04_holo_up.png", "2": "/assets/weapons/es_legendary_heavy_04_holo_up.png", "3": "/assets/weapons/es_legendary_heavy_04_holo_up.png", "4": "/assets/weapons/es_legendary_heavy_04_holo_up.png"},
      "hologramDownByLevel": {"1": "/assets/weapons/es_legendary_heavy_04_holo_down.png", "2": "/assets/weapons/es_legendary_heavy_04_holo_down.png", "3": "/assets/weapons/es_legendary_heavy_04_holo_down.png", "4": "/assets/weapons/es_legendary_heavy_04_holo_down.png"}
    },
    "legacyId": null,
    "balance": null,
    "status": "mechanics_active_visuals_provisional"
  }
].map(weapon => Object.freeze(weapon)));
export const WEAPONS_BY_ID = new Map(ARSENAL_48.map(weapon => [weapon.id, weapon]));
export const getWeaponDefinition = id => WEAPONS_BY_ID.get(id) || null;
export const listWeapons = ({ rarity, weaponClass, ammoSuit } = {}) => ARSENAL_48.filter(w =>
  (!rarity || w.rarityKey === rarity) &&
  (!weaponClass || w.weaponClass === weaponClass) &&
  (!ammoSuit || w.ammoSuit === ammoSuit)
);
