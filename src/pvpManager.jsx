import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, update, remove, onDisconnect, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { SciFiIcon } from './visualAssets';
import { COMPETITIVE_BOOTSTRAP, seededCompetitionRng, mergeBootstrapLeaderboard } from './pvpBootstrap.js';
import { findQueuePartner, reserveQueuePair, removeWaitingTicket, releaseFailedPair, makePvpRoomId } from './pvpConnectivity.js';
import { cancelWaitingPokerTicket } from './pvpConnectivity.js';
import { resumablePokerRoom } from './pvpConnectivity.js';
import { readEliteServerWalletView } from './eliteServices.js';
import { publicElitePlayersToRoster } from './eliteServices.js';

// ============================================================================
// 1.0 CONFIGURAZIONE FIREBASE RTDB (CON PROTEZIONE DA ISTANZE DUPLICATE)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD-i4ZHkZDvC_jXIJX90bW_X4u8XWrUtnk",
  authDomain: "gioco-eclissi-stellare.firebaseapp.com",
  databaseURL: "https://gioco-eclissi-stellare-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "gioco-eclissi-stellare",
  storageBucket: "gioco-eclissi-stellare.firebasestorage.app",
  messagingSenderId: "24416718121",
  appId: "1:24416718121:web:2608711e904e10a3e6fb38"
};

let firebaseApp = null;
export let db = null;
export let firebaseAuth = null;
export const ONLINE_POKER_ENABLED = import.meta.env.VITE_POKER_ONLINE_ENABLED === 'true';

try {
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getDatabase(firebaseApp);
  firebaseAuth = getAuth(firebaseApp);
} catch (err) {
  console.warn("Inizializzazione Firebase:", err);
}

// ============================================================================
// 1.1 PARAMETRI ECONOMICI & REGOLE PVP
// ============================================================================
export const PVP_TRAINING_ENTRY_CREDITS = 5;
export const PVP_ELITE_DAILY_MATCHES_CAP = 10;
export const PVP_LOSS_TROPHIES = 10;
export const PVP_WIN_CREDITS = 5;       // Rimborso esatto del ticket d'ingresso (giocata a costo zero per chi vince)
export const PVP_WIN_STARDUST = 60;     // Farming polvere stellare incrementato per la Fascia 2
export const PVP_LOSS_STARDUST = 15;
export const PVP_WIN_XP = 80;
export const PVP_LOSS_XP = 25;

// SCAGLIONI TROFEI A STELLE (SOLO LEGA ÉLITE)
export const PVP_ELITE_STAR_REWARDS = Object.freeze({
  1: { 
    stars: 1, 
    percent: 50, 
    trophies: 15, 
    voidCrystals: 1, 
    primordialMatter: 0, 
    chancePrimordial: 0, 
    label: "Vittoria Tattica (+15 🏆, +1 💠)" 
  },
  2: { 
    stars: 2, 
    percent: 75, 
    trophies: 22, 
    voidCrystals: 1, 
    primordialMatter: 0, 
    chancePrimordial: 0.5, 
    label: "Vittoria Dominante (+22 🏆, +1 💠, 50% 🟣)" 
  },
  3: { 
    stars: 3, 
    percent: 100, 
    trophies: 30, 
    diamonds: 1, 
    voidCrystals: 1, 
    primordialMatter: 1, 
    chancePrimordial: 1.0, 
    label: "Vittoria Perfetta (+30 🏆, +1 💎, +1 💠, +1 🟣)" 
  }
});

// SBLOCCO MODALITÀ PVP DAL PROGRESSO NEI SETTORI AVVENTURA (ALLINEATO A SETTORE 11)
export const PVP_MODE_UNLOCKS = Object.freeze({
  classic: { sector: 11, label: 'Classica (4 Operazioni & Poker)' },
  vector: { sector: 21, label: 'Vettore Geometrico' },
  double_stage: { sector: 41, label: 'Convergenza (Banco 2+2 & Poker)' },
  tris: { sector: 61, label: 'Tris Stellare' }
});

export const isPvPModeUnlocked = (mode, currentSector = 1) => {
  const entry = PVP_MODE_UNLOCKS[mode];
  const req = (typeof entry === 'object' && entry !== null) ? entry.sector : (typeof entry === 'number' ? entry : 11);
  return currentSector >= req;
};

// ============================================================================
// 1.2 ROTAZIONE GIORNALIERA ÉLITE & SFIDA DELLA 3ª STELLA
// ============================================================================
export const getDailyPvPMode = () => {
  const day = new Date().getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sab
  if (day === 0) {
    return {
      mode: 'tris',
      title: 'Tris Stellare',
      desc: 'Incastro a 5 Carte [Tavolo Op1 C2 + C3 + C4 + C5 = Target / Parità]',
      star3Challenge: {
        title: 'Armonia Galattica',
        desc: 'Chiudi almeno un incastro con una combinazione pokeristica a 5 carte (da Coppia a Scala Reale).'
      }
    };
  }
  if (day === 1 || day === 4) {
    return {
      mode: 'classic',
      title: 'Modalità Classica',
      desc: '3 Piedistalli Tattici (Calcolo Puro, Pattern Poker, Bomba 3T)',
      star3Challenge: {
        title: 'Precisione Razionale',
        desc: 'Metti a segno almeno un attacco vincente con la Divisione [/] o una Combo 4 Semi.'
      }
    };
  }
  if (day === 2 || day === 5) {
    return {
      mode: 'vector',
      title: 'Vettore Geometrico',
      desc: 'Composizione Radar Vettoriale',
      star3Challenge: {
        title: 'Efficienza Balistica',
        desc: 'Centra il radar sommando algebricamente al massimo 2 carte nel Nucleo.'
      }
    };
  }
  return {
    mode: 'double_stage',
    title: 'Duello di Convergenza',
    desc: 'Banco Comune: centra il Target condiviso in 2 turni concatenati (2+2 carte) e domina con la figura Poker',
    star3Challenge: {
      title: 'Precisione di Convergenza',
      desc: 'Centra il Target condiviso o vinci il duello con il minor Delta o la migliore figura Poker.'
    }
  };
};

export const getWeeklyLeaderboardKey = (date = new Date()) => {
  // Stessa settimana su dispositivi in fusi diversi; rollover in Europe/Rome.
  const romeDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const d = new Date(`${romeDate}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `settimana_${d.getUTCFullYear()}_${weekNo}`;
};

// ============================================================================
// 1.3 POOL DEI 33 PILOTI PER GENERAZIONE AVVERSARI E CLASSIFICHE
// ============================================================================
const POOL_PILOTS = Object.freeze([
  'pilot_com_1', 'pilot_com_2', 'pilot_com_3', 'pilot_com_4',
  'pilot_boss_1', 'pilot_boss_2', 'pilot_boss_3', 'pilot_boss_4',
  'pilot_boss_5', 'pilot_boss_6', 'pilot_boss_7', 'pilot_boss_8',
  'pilot_boss_9', 'pilot_boss_10', 'pilot_boss_11', 'pilot_boss_12',
  'pilot_rare_1', 'pilot_rare_2', 'pilot_rare_3', 'pilot_rare_4',
  'pilot_epic_1', 'pilot_epic_2', 'pilot_epic_3', 'pilot_epic_4',
  'pilot_leg_1', 'pilot_leg_2', 'pilot_leg_3', 'pilot_leg_4',
  'pilot_leg_5', 'pilot_leg_6', 'pilot_boss_18', 'pilot_boss_19', 'pilot_boss_20'
]);

// Helper per generare una Carta Base valida per il banco di Convergenza o Tris
export const generatePvpBaseCard = () => {
  const suits = [
    { id: 'hearts', symbol: '♥', color: '#f43f5e' },
    { id: 'diamonds', symbol: '♦', color: '#00f2fe' },
    { id: 'clubs', symbol: '♣', color: '#10b981' },
    { id: 'spades', symbol: '♠', color: '#c084fc' }
  ];
  const s = suits[Math.floor(Math.random() * suits.length)];
  const rawVal = Math.floor(Math.random() * 13) + 1;
  let displayVal = rawVal.toString();
  if (rawVal === 1) displayVal = 'A';
  else if (rawVal === 11) displayVal = 'J';
  else if (rawVal === 12) displayVal = 'Q';
  else if (rawVal === 13) displayVal = 'K';

  return {
    id: `base_${s.id}_${rawVal}_${Math.random().toString(36).substring(2, 6)}`,
    value: rawVal,
    displayVal,
    suit: s.id,
    symbol: s.symbol,
    color: s.color,
    isCourt: rawVal >= 11,
    isJoker: false,
    isGolden: false
  };
};

// ============================================================================
// 1.4 GENERATORE PROCEDURALE NOMI AD ALTA ENTROPIA (>150.000 COMBINAZIONI)
// ============================================================================
const CLAN_TAGS = [
  '[VOID]', '[APEX]', '[NOVA]', '[ECL]', '[TITAN]', '[WARP]', '[PULSE]', '[NEO]',
  '[ZERO]', '[CHRONO]', '[AURA]', '[NEXUS]', '[HYPER]', '[AETHER]', '[ZENITH]',
  '[SOLAR]', '[DRIFT]', '[VALK]', '[OMEGA]', '[PRIME]'
];

const REAL_NAMES = [
  'Marco', 'Matteo', 'Luca', 'Davide', 'Elena', 'Sofia', 'Chiara', 'Gabriel', 'Noemi',
  'Alessandro', 'Lorenzo', 'Leonardo', 'Giulia', 'Sara', 'Andrea', 'Tommaso', 'Federico',
  'Edoardo', 'Diego', 'Simone', 'Alex', 'Lucas', 'Sarah', 'Liam', 'Noah', 'Ethan',
  'Mason', 'Oliver', 'Logan', 'Emma', 'Chloe', 'Ava', 'Dylan', 'Dmitri', 'Viktor',
  'Kael', 'Boris', 'Nikolai', 'Ivan', 'Sasha', 'Milan', 'Andrei', 'Sven', 'Erik',
  'Lars', 'Astrid', 'Freja', 'Magnus', 'Carlos', 'Mateo', 'Javier', 'Lucia', 'Yuki',
  'Ren', 'Kenji', 'Haruto', 'Kaito', 'Jin', 'Shin', 'Akira'
];

const SCI_FI_PREFIXES = [
  'Nova', 'Star', 'Cosmo', 'Astro', 'Solar', 'Lunar', 'Nebula', 'Zenith', 'Polaris',
  'Orion', 'Eclipse', 'Pulsar', 'Quasar', 'Helix', 'Abyss', 'Comet', 'Aurora', 'Vortex',
  'Quantum', 'Cyber', 'Neon', 'Hyper', 'Vector', 'Matrix', 'Flux', 'Protocol', 'Glitch',
  'Shadow', 'Dark', 'Iron', 'Apex', 'Phantom', 'Ghost', 'Strike', 'Viper', 'Titan'
];

const SCI_FI_SUFFIXES = [
  'Pilot', 'Commander', 'Hunter', 'Blade', 'Knight', 'Rider', 'Scout', 'Gunner',
  'Captain', 'Operative', 'Striker', 'Vanguard', 'Trooper', 'Prime', 'Zero', 'Core',
  'Edge', 'Drift', 'Shift', 'Pulse', 'Hawk', 'Gale', 'Shard', 'Scythe', 'Reign',
  'TTV', 'Pro', 'God', 'Main', 'Exe'
];

export const generateProceduralName = (rng = Math.random) => {
  const pattern = Math.floor(rng() * 6);
  const useClan = rng() < 0.18;
  const clan = useClan ? CLAN_TAGS[Math.floor(rng() * CLAN_TAGS.length)] : '';

  let baseName = '';
  switch (pattern) {
    case 0: {
      const base = REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)];
      const sep = rng() > 0.5 ? '_' : '.';
      const num = Math.floor(rng() * 90) + 10;
      baseName = `${base}${sep}${num}`;
      break;
    }
    case 1: {
      const pre = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const suf = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      baseName = `${pre}${suf}`;
      break;
    }
    case 2: {
      const base = rng() > 0.5 
        ? REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)] 
        : SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      baseName = base;
      break;
    }
    case 3: {
      const pre = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const base = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const num = Math.floor(rng() * 90) + 10;
      baseName = `${pre}_${base}${num}`;
      break;
    }
    case 4: {
      const base = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const slang = rng() > 0.5 ? 'TTV' : 'Pro';
      baseName = `${base}_${slang}`;
      break;
    }
    default: {
      const base = REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)];
      const role = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      baseName = `${base}${role}`;
      break;
    }
  }

  return clan ? `${clan}${baseName}` : baseName;
};

// ============================================================================
// 1.5 GENERATORE GHOST BOT SINGOLO (BILANCIAMENTO CANALE & HARDPOINT)
// ============================================================================
export const generateGhostProfile = (playerLevel = 1, playerTrophies = 0, channel = 'training') => {
  const botNick = generateProceduralName();

  let botLevel = Number(playerLevel) || 1;
  let botTrophies = 0;

  if (channel === 'elite') {
    botLevel = Math.max(80, Math.min(100, (Number(playerLevel) || 80) + (Math.floor(Math.random() * 5) - 2)));
    botTrophies = Math.max(100, Number(playerTrophies || 100) + (Math.floor(Math.random() * 80) - 40));
  } else {
    botLevel = Number(playerLevel) || 1;
  }

  const poolDecks = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'scorpio',
    'planet_char_1', 'planet_char_2', 'planet_char_6', 'planet_char_15', 'planet_char_20'
  ];
  const botDeck = poolDecks[Math.floor(Math.random() * poolDecks.length)];
  const botPilot = POOL_PILOTS[Math.floor(Math.random() * POOL_PILOTS.length)];

  let botDeckLevel = 1;
  if (botLevel >= 66) botDeckLevel = Math.min(9, Math.floor((botLevel - 65) / 5) + 7);
  else if (botLevel >= 31) botDeckLevel = Math.min(6, Math.floor((botLevel - 30) / 6) + 4);
  else botDeckLevel = Math.min(3, Math.max(1, Math.floor(botLevel / 10) + 1));

  return {
    id: `ghost_${Math.random().toString(36).substring(2, 9)}`,
    nickname: botNick,
    level: botLevel,
    deckLevel: botDeckLevel,
    trophies: botTrophies,
    deck: botDeck,
    ability: botDeck,
    pilot: botPilot,
    channel,
    equippedWeapons: ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
    weaponsLevels: {
      wp_gatling: botDeckLevel,
      wp_xbow: botDeckLevel,
      wp_thunderstrike: botDeckLevel,
      wp_orbital_cannon: botDeckLevel
    },
    isBot: true
  };
};

// ============================================================================
// 1.6 CLASSIFICA SETTIMANALE PERSISTENTE CON 500 PILOTI & SIMULAZIONE GIORNALIERA
// ============================================================================
const STORAGE_LEADERBOARD_KEY = 'eclissi_persistent_leaderboard';

// Ogni client ricostruisce gli stessi bot dalla chiave settimana e dal giorno di Roma.
// Una vecchia classifica casuale nel localStorage non prevale sui dati condivisi.
const competitionRomeDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date);

const mondayOfWeek = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export const getPersistentLeaderboardData = (currentWeekKey, dateStr = competitionRomeDate()) => {
  if (!COMPETITIVE_BOOTSTRAP.enabled) return [];
  const monday = mondayOfWeek(dateStr);
  let state = generateNewWeeklyRoster(currentWeekKey, monday);
  for (let day = 1; day <= 6; day++) {
    const d = new Date(`${monday}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + day);
    const activeDate = d.toISOString().slice(0, 10);
    if (activeDate > dateStr) break;
    state = { ...state, pilots: simulateDailyLeaderboardGrowth(state, activeDate), lastSimulatedDate: activeDate };
  }
  // Preserviamo il formato per verifiche offline e compatibilità col vecchio archivio.
  try { localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(state)); } catch (_) {}
  return state.pilots;
};

function generateNewWeeklyRoster(currentWeekKey, monday) {
  const poolDecks = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
    'sagittarius', 'capricorn', 'aquarius', 'pisces', 'planet_char_1', 'planet_char_2',
    'planet_char_6', 'planet_char_9', 'planet_char_15', 'planet_char_20'
  ];

  const totalPilots = COMPETITIVE_BOOTSTRAP.eliteRosterSize;
  const rng = seededCompetitionRng(`elite_roster_${currentWeekKey}`);
  const pilots = [];
  const usedNames = new Set();

  for (let i = 0; i < totalPilots; i++) {
    let name = generateProceduralName(rng);
    while (usedNames.has(name)) {
      name = generateProceduralName(rng);
    }
    usedNames.add(name);

    let minT, maxT, minL, maxL;
    if (i < 20) {
      minT = 850; maxT = 1200; minL = 92; maxL = 100;
    } else if (i < 100) {
      minT = 600; maxT = 849; minL = 86; maxL = 94;
    } else if (i < 300) {
      minT = 350; maxT = 599; minL = 82; maxL = 88;
    } else {
      minT = 100; maxT = 349; minL = 80; maxL = 84;
    }

    const trophies = Math.floor(rng() * (maxT - minT + 1)) + minT;
    const level = Math.floor(rng() * (maxL - minL + 1)) + minL;
    const wins = Math.max(1, Math.floor(trophies / 22));
    const losses = Math.max(0, Math.floor(wins * 0.45));

    pilots.push({
      id: `pilot_${i + 1}`,
      nickname: name,
      level,
      deck: poolDecks[i % poolDecks.length],
      pilot: POOL_PILOTS[i % POOL_PILOTS.length],
      trophies,
      wins,
      losses,
      isBot: true
    });
  }

  pilots.sort((a, b) => b.trophies - a.trophies);

  const payload = {
    weekKey: currentWeekKey,
    version: 2,
    lastSimulatedDate: monday,
    pilots
  };

  return payload;
}

function simulateDailyLeaderboardGrowth(stored, todayStr) {
  if (stored.lastSimulatedDate === todayStr) {
    return stored.pilots;
  }

  const rng = seededCompetitionRng(`elite_growth_${stored.weekKey}_${todayStr}`);
  const updatedPilots = stored.pilots.map((pilot, idx) => {
    let delta = 0;
    if (idx < 50) {
      delta = Math.floor(rng() * 70) + 70;
    } else if (idx < 250) {
      delta = Math.floor(rng() * 60) + 30;
    } else {
      delta = Math.floor(rng() * 50) - 20;
    }

    const nextTrophies = Math.max(100, pilot.trophies + delta);
    const extraWins = delta > 0 ? Math.floor(delta / 22) : 0;
    const extraLosses = delta < 0 ? Math.abs(Math.floor(delta / 10)) : 1;

    return {
      ...pilot,
      trophies: nextTrophies,
      wins: pilot.wins + extraWins,
      losses: pilot.losses + extraLosses,
      pilot: pilot.pilot || POOL_PILOTS[idx % POOL_PILOTS.length]
    };
  });

  updatedPilots.sort((a, b) => b.trophies - a.trophies);

  const payload = {
    ...stored,
    lastSimulatedDate: todayStr,
    pilots: updatedPilots
  };

  return updatedPilots;
}

// ============================================================================
// 2.0 COMPONENTE MATCHMAKING LOBBY
// ============================================================================
// Riferimenti STABILI: la ricerca non deve riavviarsi ogni secondo a causa
// del re-render prodotto dal timer della lobby.
const DEFAULT_PVP_WEAPONS = Object.freeze(['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon']);
const DEFAULT_PVP_WEAPON_LEVELS = Object.freeze({ wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 });
export function MatchmakingLobby({
  myNickname,
  myDeck,
  myPilot = 'pilot_com_1',
  myLevel,
  myTrophies,
  pvpChannel = 'training',
  selectedMode = 'classic',
  myWeapons = DEFAULT_PVP_WEAPONS,
  myWeaponsLevels = DEFAULT_PVP_WEAPON_LEVELS,
  onMatchFound,
  onCancel
}) {
  const [searchTime, setSearchTime] = useState(0);
  const queueTicketRef = useRef(null);
  const matchedRef = useRef(false);
  const unsubRoomsRef = useRef(null);

  useEffect(() => {
    if (ONLINE_POKER_ENABLED) return undefined;
    matchedRef.current = false;
    let disposed = false;
    let processing = false;
    let watchingRoomId = null;
    let joinedQueue = false;
    let roomWaitTimer = null;
    let fallbackRetryTimer = null;
    let unsubQueue = null;
    let unsubRoom = null;
    const activeMode = pvpChannel === 'elite' ? getDailyPvPMode().mode : selectedMode;
    const timer = setInterval(() => setSearchTime(t => t + 1), 1000);
    const myId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const queueKey = `${pvpChannel}_${activeMode}`;
    const queueRef = db ? ref(db, `matchmaking_queue/${queueKey}`) : null;
    const ticketRef = db ? ref(db, `matchmaking_queue/${queueKey}/${myId}`) : null;
    queueTicketRef.current = ticketRef;
    const myInitialHp = Math.min(400, Math.floor(50 + Math.floor((Number(myLevel) || 1) / 5) * 17.5));
    const ownTicket = {
      id: myId, nickname: myNickname, deck: myDeck, pilot: myPilot,
      level: myLevel, trophies: myTrophies,
      equippedWeapons: myWeapons, weaponsLevels: myWeaponsLevels,
      timestamp: Date.now(), status: 'waiting'
    };
    const finish = meta => {
      if (disposed || matchedRef.current) return;
      matchedRef.current = true;
      clearTimeout(roomWaitTimer);
      clearTimeout(fallbackRetryTimer);
      if (unsubQueue) { unsubQueue(); unsubQueue = null; }
      if (unsubRoom) { unsubRoom(); unsubRoom = null; }
      if (ticketRef) remove(ticketRef).catch(() => {});
      onMatchFound(meta);
    };
    const opponentFromTicket = ticket => ({
      id: ticket.id,
      nickname: ticket.nickname,
      deck: ticket.deck,
      pilot: ticket.pilot,
      level: ticket.level,
      trophies: ticket.trophies,
      equippedWeapons: ticket.equippedWeapons || ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
      weaponsLevels: ticket.weaponsLevels || { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 }
    });
    const watchRoom = roomId => {
      if (!db || !roomId || watchingRoomId === roomId || disposed || matchedRef.current) return;
      if (unsubRoom) unsubRoom();
      watchingRoomId = roomId;
      clearTimeout(roomWaitTimer);
      roomWaitTimer = setTimeout(async () => {
        if (disposed || matchedRef.current || !db) return;
        const roomSnapshot = await get(ref(db, `rooms/${roomId}`)).catch(() => null);
        if (!roomSnapshot || roomSnapshot.val()?.status === 'active') return;
        // Stanza mai creata: rilascia solo questa prenotazione.
        await runTransaction(queueRef, current => releaseFailedPair(current, roomId), { applyLocally: false }).catch(() => {});
        watchingRoomId = null;
        if (unsubRoom) { unsubRoom(); unsubRoom = null; }
      }, 8500);
      unsubRoom = onValue(ref(db, `rooms/${roomId}`), snap => {
        const room = snap.val();
        if (!room || room.status !== 'active' || disposed || matchedRef.current) return;
        const isHost = room.p1?.id === myId;
        const myPart = isHost ? room.p1 : room.p2;
        const theirPart = isHost ? room.p2 : room.p1;
        if (myPart?.id !== myId || !theirPart?.id) return;
        finish({ roomId, myPlayerId: myId, myPilot,
          opponent: opponentFromTicket(theirPart),
          isHost, isGhostMatch: false, channel: pvpChannel, mode: room.mode });
      }, err => console.warn('Ascolto stanza PvP:', err));
    };
    const makeRoom = (roomId, opponent) => {
      const oppHp = Math.min(400, Math.floor(50 + Math.floor((Number(opponent.level) || 1) / 5) * 17.5));
      const p1 = { ...opponentFromTicket(opponent), hp: oppHp, maxHp: oppHp, ether: 0, malus: 0 };
      const p2 = { ...opponentFromTicket(ownTicket), hp: myInitialHp, maxHp: myInitialHp, ether: 0, malus: 0 };
      const payload = {
        status: 'active', mode: activeMode, ruleset: 'legacy-v1', channel: pvpChannel,
        turn: opponent.id, p1, p2, createdAt: Date.now()
      };
      if (activeMode === 'double_stage') payload.convergenceState = {
        baseCard: generatePvpBaseCard(), target: Math.floor(Math.random() * 41) + 20,
        turn: 1, subStep: 1, p1T1: 0, p2T1: 0
      };
      else if (activeMode === 'tris') payload.trisState = {
        tableCard: generatePvpBaseCard(), op1: ['+', '-', '*', '/'][Math.floor(Math.random() * 4)],
        op2: '+', target: Math.floor(Math.random() * 30) + 24
      };
      else if (activeMode === 'vector') payload.vectorState = {
        target: Math.floor(Math.random() * 26) + 15,
        parityFilter: Math.random() > 0.5 ? 'PARI' : 'DISPARI'
      };
      // Anche il nodo stanza è creato una sola volta; non sovrascrive uno stato già attivo.
      return runTransaction(ref(db, `rooms/${roomId}`), current => current == null ? payload : undefined,
        { applyLocally: false });
    };

    if (db) {
      // Cleanup su disconnessione prima di pubblicare il ticket.
      onDisconnect(ticketRef).remove()
        .then(() => set(ticketRef, ownTicket))
        .then(() => {
          joinedQueue = true;
          if (disposed || matchedRef.current) { remove(ticketRef).catch(() => {}); return; }
          // Reagisce all'ingresso di nuovi utenti; il vecchio get() fotografava la coda una volta sola.
          unsubQueue = onValue(queueRef, snapshot => {
            if (disposed || matchedRef.current) return;
            const queue = snapshot.val() || {};
            const mine = queue[myId];
            if (mine?.status === 'matched' && mine.matchRoomId) {
              watchRoom(mine.matchRoomId);
              return;
            }
            if (processing || mine?.status !== 'waiting') return;
            const other = findQueuePartner(queue, myId, Date.now());
            if (!other) return;
            processing = true;
            const roomId = makePvpRoomId(myId, other.opponentId);
            // La coppia viene impegnata INSIEME in una sola transazione RTDB.
            runTransaction(queueRef, current =>
              reserveQueuePair(current, myId, roomId, Date.now()) || undefined,
              { applyLocally: false })
              .then(async result => {
                if (!result.committed) return;
                try {
                  if (disposed) throw new Error('Lobby chiusa prima della stanza');
                  const roomResult = await makeRoom(roomId, other.opponent);
                  if (!roomResult.committed) {
                    const existing = await get(ref(db, `rooms/${roomId}`));
                    if (existing.val()?.status !== 'active') throw new Error('Stanza non creata');
                  }
                  watchRoom(roomId);
                } catch (err) {
                  console.warn('Creazione stanza PvP:', err);
                  // Un errore di rete può arrivare DOPO il commit sul server:
                  // prima di liberare la prenotazione, controlliamo la stanza.
                  const existing = await get(ref(db, `rooms/${roomId}`)).catch(() => null);
                  if (!existing) {
                    // Stato indeterminato: mai rilasciare una coppia potenzialmente attiva.
                    watchRoom(roomId);
                  } else if (existing.val()?.status === 'active') {
                    watchRoom(roomId);
                  } else {
                    await runTransaction(queueRef, current => releaseFailedPair(current, roomId),
                      { applyLocally: false }).catch(() => {});
                  }
                }
              })
              .catch(err => console.warn('Prenotazione PvP:', err))
              .finally(() => { processing = false; });
          }, err => console.warn('Ascolto coda PvP:', err));
        })
        .catch(err => console.warn('Iscrizione coda PvP:', err));
    }

    // 12 s di priorità ai giocatori reali: il ripiego IA rimuove il ticket
    // con una transazione, e NON può rubare un abbinamento già prenotato.
    const attemptFallback = async () => {
      if (disposed || matchedRef.current) return;
      if (processing) {
        fallbackRetryTimer = setTimeout(attemptFallback, 400);
        return;
      }
      if (db && joinedQueue) {
        try {
          const result = await runTransaction(queueRef,
            current => removeWaitingTicket(current, myId), { applyLocally: false });
          if (!result.committed) {
            // È già abbinato, oppure una disconnessione ha eliminato il ticket.
            const mine = result.snapshot.val()?.[myId];
            if (mine?.status === 'matched') {
              watchRoom(mine.matchRoomId);
              fallbackRetryTimer = setTimeout(attemptFallback, 1200);
              return;
            }
            if (mine?.status === 'waiting') {
              fallbackRetryTimer = setTimeout(attemptFallback, 400);
              return;
            }
          }
        } catch (err) {
          console.warn('Fallback matchmaking:', err);
          // Nessuna conferma dal server: non attribuiamo due avversari.
          fallbackRetryTimer = setTimeout(attemptFallback, 1800);
          return;
        }
      }
      if (disposed || matchedRef.current) return;
      if (!COMPETITIVE_BOOTSTRAP.enabled) { matchedRef.current = true; onCancel(); return; }
      const ghost = generateGhostProfile(myLevel, myTrophies, pvpChannel);
      finish({ roomId: `room_pvp_bot_${Date.now()}`, myPlayerId: myId,
        myPilot, opponent: ghost, isHost: true, isGhostMatch: true,
        channel: pvpChannel, mode: activeMode });
    };
    const fallbackTimeout = setTimeout(attemptFallback, COMPETITIVE_BOOTSTRAP.realOpponentSearchMs);

    return () => {
      disposed = true;
      clearInterval(timer);
      clearTimeout(fallbackTimeout);
      clearTimeout(fallbackRetryTimer);
      clearTimeout(roomWaitTimer);
      if (unsubQueue) unsubQueue();
      if (unsubRoom) unsubRoom();
      if (ticketRef) remove(ticketRef).catch(() => {});
    };
  }, [myLevel, myTrophies, myPilot, myNickname, myDeck, pvpChannel, selectedMode, myWeapons, myWeaponsLevels, onMatchFound, onCancel]);

  // 17U: accesso alla coda server-authoritative con Firebase Auth.
  // Non pubblica stanze canoniche, mani o premi dal browser. Richiede il worker Admin attivo.
  useEffect(() => {
    if (!ONLINE_POKER_ENABLED) return undefined;
    matchedRef.current = false;
    let disposed=false,unsubAssign=null,heartbeat=null,fallback=null,retry=null;
    let ticketRef=null,authUid=null,serverReserved=false,disconnectHandle=null,queueReady=false,queueFailed=false;
    const started=Date.now(),activeMode='poker';
    const timer=setInterval(()=>setSearchTime(n=>n+1),1000);
    const finish=meta=>{
      if(disposed||matchedRef.current)return;
      matchedRef.current=true;
      clearTimeout(fallback);clearTimeout(retry);
      if(unsubAssign)unsubAssign();
      if(disconnectHandle)disconnectHandle.cancel().catch(()=>{});
      if(ticketRef)runTransaction(ticketRef,cancelWaitingPokerTicket,{applyLocally:false}).catch(()=>{});
      onMatchFound(meta);
    };
    const botFallback=async()=>{
      if(disposed||matchedRef.current)return;
      // Non iniziare un bot mentre l'accesso Auth o l'invio del ticket è in corso:
      // altrimenti il ticket potrebbe arrivare dopo il fallback, creando due incontri.
      if(!queueReady && !queueFailed){retry=setTimeout(botFallback,1200);return;}
      if(serverReserved){
        if(Date.now()-started>65000){
          // Non assegnare un bot quando il server ha già prenotato una coppia.
          // Se il provisioning fallisce, restituisci il ticket di ingresso.
          matchedRef.current=true;onCancel();return;
        }
        retry=setTimeout(botFallback,1600);return;
      }
      if(ticketRef){
        try{
          // Il server può prenotare un ticket tra una GET e una REMOVE.
          // Una transazione evita di cancellare un abbinamento già riservato.
          const cancellation=await runTransaction(ticketRef,cancelWaitingPokerTicket,{applyLocally:false});
          const state=cancellation.snapshot.val();
          if(!cancellation.committed && state?.status==='reserved'){
            serverReserved=true;retry=setTimeout(botFallback,1600);return;
          }
          if(!cancellation.committed && state?.status==='waiting'){
            retry=setTimeout(botFallback,1000);return;
          }
          // Risolvi anche la gara con una stanza appena assegnata.
          const check=await get(ref(db,`pokerRoomAssigned/${authUid}`));
          const a=check.val();
          if(a?.roomId&&a?.channel===pvpChannel&&a.assignedAt>=started-2000){
            finish({roomId:a.roomId,authUid,myPlayerId:authUid,myPilot,opponent:{nickname:'Pilota online'},isGhostMatch:false,isOnlinePoker:true,channel:pvpChannel,mode:activeMode});return;
          }
        }catch(e){console.warn('Coda Poker online:',e);retry=setTimeout(botFallback,1200);return;}
      }
      if(!COMPETITIVE_BOOTSTRAP.enabled){onCancel();return;}
      const ghost=generateGhostProfile(myLevel,myTrophies,pvpChannel);
      finish({roomId:`room_pvp_bot_${Date.now()}`,myPlayerId:authUid||'local',myPilot,opponent:ghost,isHost:true,isGhostMatch:true,channel:pvpChannel,mode:activeMode});
    };
    (async()=>{
      try{
        if(!db||!firebaseAuth)throw Error('Firebase non configurato');
        const user=firebaseAuth.currentUser || (await signInAnonymously(firebaseAuth)).user;
        if(disposed)return;
        authUid=user.uid;
        // Prima di entrare nuovamente in coda, recupera la partita attiva.
        // Non basta una vecchia assegnazione: verifica la vista privata e lo stato.
        const lastAssignment=(await get(ref(db,`pokerRoomAssigned/${authUid}`))).val();
        if(lastAssignment?.roomId && lastAssignment.channel===pvpChannel){
          const lastView=(await get(ref(db,`pokerViews/${authUid}/${lastAssignment.roomId}`))).val();
          const resume=resumablePokerRoom(lastAssignment,lastView,pvpChannel);
          if(resume){
            finish({...resume,authUid,myPlayerId:authUid,myPilot,opponent:{nickname:'Pilota online'}});
            return;
          }
        }
        if(disposed||matchedRef.current)return;
        ticketRef=ref(db,`pokerWaitQueue/${pvpChannel}/${authUid}`);
        unsubAssign=onValue(ref(db,`pokerRoomAssigned/${authUid}`),snap=>{
          const a=snap.val();
          if(!a?.roomId||a.channel!==pvpChannel||a.assignedAt<started-2000)return;
          finish({roomId:a.roomId,authUid,myPlayerId:authUid,myPilot,
            opponent:{nickname:'Pilota online'},isGhostMatch:false,isOnlinePoker:true,channel:pvpChannel,mode:activeMode});
        },err=>console.warn('Assegnazione Poker online:',err));
        disconnectHandle=onDisconnect(ticketRef);
        await disconnectHandle.remove();
        if(disposed)return;
        await set(ticketRef,{uid:authUid,status:'waiting',joinedAt:Date.now(),nickname:String(myNickname||'Pilota').slice(0,28)});
        queueReady=true;
        if(disposed || matchedRef.current){
          await runTransaction(ticketRef,cancelWaitingPokerTicket,{applyLocally:false});
        }
      }catch(err){queueFailed=true;console.warn('Autenticazione/coda PvP Poker:',err);}
    })();
    fallback=setTimeout(botFallback,COMPETITIVE_BOOTSTRAP.realOpponentSearchMs);
    return()=>{
      disposed=true;clearInterval(timer);clearTimeout(fallback);clearTimeout(retry);
      if(unsubAssign)unsubAssign();
      if(disconnectHandle)disconnectHandle.cancel().catch(()=>{});
      if(ticketRef)runTransaction(ticketRef,cancelWaitingPokerTicket,{applyLocally:false}).catch(()=>{});
    };
  },[pvpChannel,myNickname,myLevel,myTrophies,myPilot,onMatchFound,onCancel]);

  const handleCancelClick = () => {
    matchedRef.current = true;
    if (unsubRoomsRef.current) {
      unsubRoomsRef.current();
      unsubRoomsRef.current = null;
    }
    if (queueTicketRef.current) {
      remove(queueTicketRef.current).catch(() => {});
    }
    onCancel();
  };

  const channelTitle = pvpChannel === 'elite' ? 'Lega Élite Mondiale' : 'Canale Addestramento';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.75rem', maxWidth: '400px', width: '100%', textAlign: 'center', border: '2px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.6)' }}>
        <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>DUELLO 1V1 • UMANO O IA</div>
        <h3 style={{ color: '#00f2fe', margin: '0.2rem 0 0.6rem 0', fontWeight: '900', fontSize: '1.2rem' }}>
          {channelTitle}
        </h3>
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '1rem auto' }}>
          <div className="radar-ring" style={{ width: '80px', height: '80px' }} />
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #00f2fe 0%, transparent 70%)', animation: 'pulseGlow 1.2s infinite alternate' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 'bold' }}>
          Cerco prima un giocatore reale... ({searchTime}s)
        </div>
        <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '6px 0 1.25rem 0' }}>
          {pvpChannel === 'elite' ? "Lega Élite: giocatori reali o piloti IA nella fase di lancio (10 partite/giorno)" : "Addestramento contro persone o IA, senza rischio trofei (5 Crediti)"}
        </p>
        <button onClick={handleCancelClick} className="cyber-btn" style={{ width: '100%', padding: '0.65rem', borderColor: '#ef4444', color: '#fca5a5' }}>
          Annulla Ricerca
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 3.0 MODALE CLASSIFICA SETTIMANALE ÉLITE
// ============================================================================
export function WeeklyLeaderboardModal({ myNickname, myTrophies, myPlayerId, myLevel, onClose }) {
  const currentWeekKey = getWeeklyLeaderboardKey();
  const [pilots, setPilots] = useState(() => getPersistentLeaderboardData(currentWeekKey));
  const [officialWallet,setOfficialWallet]=useState(null);
  const [officialWalletStatus,setOfficialWalletStatus]=useState('non-connesso');
  const dailyMode = getDailyPvPMode();

  // Fallback reattivo sul livello pilota salvato localmente
  const effectiveMyLevel = Number(myLevel) > 1 
    ? Number(myLevel) 
    : parseInt(localStorage.getItem('eclissi_level') || '1', 10);

  // Sincronizzazione real-time con i punteggi reali salvati su Firebase RTDB
  useEffect(() => {
    if (!db) return;
    try {
      const lbRef = ONLINE_POKER_ENABLED
        ? ref(db, `elitePublicWeeks/${currentWeekKey}/players`)
        : ref(db, `leaderboards/${currentWeekKey}`);
      const unsub = onValue(lbRef, snapshot => {
        const val = snapshot.val();
        if (ONLINE_POKER_ENABLED) {
          setPilots(mergeBootstrapLeaderboard(publicElitePlayersToRoster(val), getPersistentLeaderboardData(currentWeekKey)));
          return;
        }
        if (!val) return;
        const onlinePlayers = Object.entries(val).map(([pId, data]) => ({
          id: pId,
          nickname: data.nickname || 'Pilota',
          level: Number(data.level) || 1,
          deck: data.deck || 'aries',
          trophies: Number(data.trophies) || 0,
          wins: Number(data.wins) || 0,
          losses: Number(data.losses) || 0,
          isBot: false,
          isRealOnline: true
        }));

        setPilots(mergeBootstrapLeaderboard(onlinePlayers, getPersistentLeaderboardData(currentWeekKey)));
      }, err => console.warn("Lettura classifica Firebase:", err));

      return () => {
        if (typeof unsub === 'function') unsub();
      };
    } catch (_) {}
  }, [currentWeekKey]);

  // Il saldo locale dell'inventario NON e' il saldo verificato della Lega.
  // Lettura esclusivamente dal ramo per-UID proiettato dal servizio Admin.
  useEffect(()=>{
    if(!ONLINE_POKER_ENABLED||!db||!firebaseAuth)return undefined;
    let unlistenWallet=null;
    const unlistenAuth=onAuthStateChanged(firebaseAuth,user=>{
      if(unlistenWallet){unlistenWallet();unlistenWallet=null;}
      setOfficialWallet(null);
      if(!user){setOfficialWalletStatus('non-connesso');return;}
      setOfficialWalletStatus('caricamento');
      unlistenWallet=onValue(ref(db,`eliteWalletViews/${user.uid}`),snapshot=>{
        const projected=readEliteServerWalletView(snapshot.val());
        setOfficialWallet(projected);
        setOfficialWalletStatus(projected?'verificato':'non-inizializzato');
      },error=>{setOfficialWallet(null);setOfficialWalletStatus('errore');console.warn('Saldo ufficiale Élite:',error);});
    });
    return()=>{unlistenAuth();if(unlistenWallet)unlistenWallet();};
  },[]);

  // In Poker online il punteggio ufficiale arriva SOLO dalla proiezione server.
  // I trofei legacy locali non attribuiscono una posizione competitiva verificata.
  const displayedPlayerId = ONLINE_POKER_ENABLED ? (firebaseAuth?.currentUser?.uid || myPlayerId) : myPlayerId;
  const serverMe = ONLINE_POKER_ENABLED ? pilots.find(p => p.id === displayedPlayerId && p.verified === true) : null;
  const displayedTrophies = ONLINE_POKER_ENABLED ? (serverMe?.trophies ?? 0) : myTrophies;
  const filteredPilots = pilots.filter(p => p.id !== displayedPlayerId);
  const combinedList = [
    ...filteredPilots,
    {
      id: displayedPlayerId,
      nickname: myNickname,
      trophies: displayedTrophies,
      isPlayer: true,
      verified: Boolean(serverMe?.verified),
      level: effectiveMyLevel,
      wins: ONLINE_POKER_ENABLED ? (serverMe?.wins ?? 0) : Math.floor(myTrophies / 22),
      losses: ONLINE_POKER_ENABLED ? (serverMe?.losses ?? 0) : 2
    }
  ].sort((a,b)=>b.trophies-a.trophies);
  // La classifica MISTA contiene anche IA, ma il podio in diamanti è reale e verificato.
  const verifiedPodium = ONLINE_POKER_ENABLED
    ? new Map(combinedList.filter(p=>p.verified===true).slice(0,3).map((p,i)=>[p.id,i+1]))
    : new Map();

  const playerRankIndex = combinedList.findIndex(p => p.isPlayer);
  const myRank = playerRankIndex + 1;

  const top10 = combinedList.slice(0, 10);
  const showAroundMe = myRank > 10;
  const aroundMe = showAroundMe 
    ? combinedList.slice(Math.max(10, playerRankIndex - 2), Math.min(combinedList.length, playerRankIndex + 3))
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '1.5px solid #facc15', boxShadow: '0 0 45px rgba(250, 204, 21, 0.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ color: '#fde047', margin: 0, fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SciFiIcon name="trophy" size={20} color="#fde047" /> Classifica Settimanale Élite (500 Piloti)
            </h3>
            <div style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>
              I tuoi Trofei: <strong style={{ color: '#facc15' }}>{displayedTrophies} 🏆</strong> | Posizione: <strong style={{ color: '#00f2fe' }}>#{myRank}</strong>
            </div>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
        </div>

        {ONLINE_POKER_ENABLED&&<div style={{color:'#67e8f9',fontSize:'0.7rem',padding:'0.3rem 0.5rem',border:'1px solid #155e75',borderRadius:7,marginBottom:8}}>
          Diamanti Élite sul server: <strong>{officialWallet ? `${officialWallet.diamonds} 💎` : officialWalletStatus==='non-inizializzato'?'Portafoglio da inizializzare':officialWalletStatus==='caricamento'?'Caricamento...':'Non disponibili'}</strong>
          <div style={{fontSize:'0.61rem',color:'#94a3b8'}}>Saldo verificato della Lega. Non ancora utilizzabile nel negozio locale fino alla sincronizzazione del portafoglio.</div>
          {officialWallet?.recentEliteAwards?.length>0&&<div style={{fontSize:'0.61rem'}}>Ultimo premio: {officialWallet.recentEliteAwards[0].diamonds} 💎 · {officialWallet.recentEliteAwards[0].weekKey}</div>}
        </div>}
        <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #facc15', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.62rem', color: '#fde047', fontWeight: 'bold' }}>MODALITÀ ÉLITE DI OGGI:</div>
          <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '900' }}>{ONLINE_POKER_ENABLED ? 'Duello Poker competitivo' : dailyMode.title}</div>
          <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>{ONLINE_POKER_ENABLED ? 'Sette carte, banco comune e tre classi di armi.' : dailyMode.desc}</div>
        </div>

        <div style={{ color: '#94a3b8', fontSize: '0.65rem', padding: '0 0.3rem 0.4rem' }}>Durante il lancio la classifica mescola piloti IA e giocatori connessi. Gli avversari IA occupano progressivamente meno posti quando arrivano giocatori reali.</div>
        <div style={{ color: '#fbbf24', fontSize: '0.64rem', padding: '0 0.3rem 0.45rem' }}>* Premi solo ai primi tre giocatori REALI con risultati verificati, non ai bot. Liquidazione amministrativa dopo la settimana; nessun premio locale automatico.</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', textTransform: 'uppercase' }}>
            ★ Top 10 Lega Élite (Zona Diamanti)
          </div>
          {top10.map((pilot, idx) => {
            const isMe = pilot.isPlayer;
            const rankNum = idx + 1;
            const eligibleRank = verifiedPodium.get(pilot.id);
            const rankBadge = `${rankNum}°` + (eligibleRank ? ` · ${[100,50,25][eligibleRank-1]} 💎* (reali)` : '');

            return (
              <div
                key={pilot.id || idx}
                className="cyber-panel"
                style={{
                  padding: '0.45rem 0.65rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isMe ? 'rgba(8, 145, 178, 0.45)' : (rankNum <= 3 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.8)'),
                  border: isMe ? '1.5px solid #00f2fe' : (rankNum <= 3 ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.08)')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: rankNum <= 3 ? '#fde047' : '#94a3b8' }}>
                    {rankBadge}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>
                      {pilot.nickname} {isMe && '(Tu)'}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Liv. {pilot.level} • {pilot.wins}V / {pilot.losses}P</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#facc15' }}>
                  {pilot.trophies} 🏆
                </div>
              </div>
            );
          })}

          {showAroundMe && (
            <>
              <div style={{ fontSize: '0.65rem', color: '#00f2fe', fontWeight: '900', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                ↕ Intorno alla tua posizione (#{myRank})
              </div>
              {aroundMe.map((pilot, idx) => {
                const isMe = pilot.isPlayer;
                const pos = Math.max(10, playerRankIndex - 2) + idx + 1;
                const eligibleRank = verifiedPodium.get(pilot.id);
                return (
                  <div
                    key={pilot.id || `around_${idx}`}
                    className="cyber-panel"
                    style={{
                      padding: '0.45rem 0.65rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isMe ? 'rgba(8, 145, 178, 0.45)' : 'rgba(15, 23, 42, 0.8)',
                      border: isMe ? '1.5px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '900', color: isMe ? '#00f2fe' : '#94a3b8' }}>
                        #{pos}{eligibleRank ? ` · ${[100,50,25][eligibleRank-1]} 💎* (reali)` : ''}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>
                          {pilot.nickname} {isMe && '(Tu)'}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Liv. {pilot.level} • {pilot.wins}V / {pilot.losses}P</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: isMe ? '#00f2fe' : '#facc15' }}>
                      {pilot.trophies} 🏆
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchmakingLobby;
