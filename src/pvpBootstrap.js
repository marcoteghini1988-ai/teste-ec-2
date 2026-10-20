/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { ARSENAL_48 } from './newCombat/weaponCatalog.js';
import { normalizePhase7Armory } from './newCombat/phase7Armory.js';
import { normalizePhase4Loadout } from './newCombat/phase4Weapons.js';

// ── ORIGINE CONSOLIDATA: src/pvpPokerBootstrap.js ──


function hash(s) { let h=2166136261; for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0; }
function rng(seed){let s=seed>>>0;return()=>{let t=(s+=0x6d2b79f5);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const SUITS=[['hearts','♥','#f43f5e'],['diamonds','♦','#00f2fe'],['clubs','♣','#10b981'],['spades','♠','#c084fc']];
/** Ogni lato riceve 52 carte diverse; le due mani non sono lo stesso mazzo. */
export function createPvpPokerDeck(roomId,side){
  if(!/^room_[a-zA-Z0-9_-]{3,160}$/.test(String(roomId)) || !['player','enemy'].includes(side))throw Error('Identificativo PvP non valido');
  const random=rng(hash(`${roomId}:${side}:pvp-poker-17T`));
  const cards=[];
  for(const [suit,symbol,color] of SUITS)for(let value=1;value<=13;value++)cards.push({
    id:`pvp-${side}-${suit}-${value}-${hash(roomId)}`,value,displayVal:({1:'A',11:'J',12:'Q',13:'K'})[value]||String(value),
    suit,symbol,color,isCourt:value>=11,isJoker:false,isGolden:false
  });
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
/** Nessun ID legacy inventato: i vecchi codici vengono mappati solo se presenti nel catalogo Poker. */
export function getPvpGhostArmory(opponent={}){
  const proposed={};
  for(const weaponId of Array.isArray(opponent.equippedWeapons)?opponent.equippedWeapons:[]){
    const item=ARSENAL_48.find(w=>w.legacyId===weaponId || w.id===weaponId);
    if(item && !proposed[item.weaponClass])proposed[item.weaponClass]=item.id;
  }
  return normalizePhase4Loadout(proposed);
}
export function createPvpPokerBotSetup({roomId,armoryV2,opponent={},playerLevel=1}){
  const player=createPvpPokerDeck(roomId,'player'),enemy=createPvpPokerDeck(roomId,'enemy');
  const own=normalizePhase7Armory(armoryV2);
  const botLoadout=getPvpGhostArmory(opponent);
  const levels={};
  for(const cls of ['light','medium','heavy'])levels[cls]=Math.max(1,Math.min(4,Math.floor(Number(own.levels?.[own.equipped[cls]])||1)));
  const botLevels={light:1,medium:1,heavy:1};
  const playerHp=Math.min(400,Math.max(120,120+Math.floor(Math.max(1,Number(playerLevel)||1)/5)*17));
  // Nei BOT di lancio il livello nominale può essere 80–100 in Élite:
  // non deve regalare più HP dell'avversario umano a parità di matchmaking.
  const enemyHp=playerHp;
  return {playerHand:player.slice(0,7),playerDeck:player.slice(7),aiHand:enemy.slice(0,7),aiDeck:enemy.slice(7),
    playerLoadout:own.equipped,enemyLoadout:botLoadout,armoryV2:own,playerWeaponLevels:levels,enemyWeaponLevels:botLevels,
    initialPlayerHp:playerHp,initialEnemyHp:enemyHp};
}
/** Premio locale IA: distinto dai risultati umani che necessitano dell'arbitro server. */
export function buildPvpPokerBotResult(game,telemetry,channel='training'){
  if(!game || !['player','enemy','draw'].includes(game.winner) || game.phase!=='finished')throw Error('Duello Poker non concluso');
  if(channel!=='training' && channel!=='elite')throw Error('Canale PvP non valido');
  const remainingHpPct=Math.min(1,Math.max(0,(Number(game.hp?.player)||0)/(Number(game.initialHp?.player)||1)));
  const combinations=Math.max(0,Math.floor(Number(telemetry?.validPokerCombos)||0));
  const stars=game.winner==='player'?1+Number(remainingHpPct>=0.5)+Number(combinations>=2):0;
  return {outcome:game.winner,isPvP:true,isSimulatedOpponent:true,pvpChannel:channel,
    pvpTrophiesAwarded:channel==='elite'&&stars>0?([0,15,22,30][stars]):0,
    pvpBonusDiamonds:channel==='elite'&&stars===3?1:0,
    turnsElapsed:Math.max(1,game.round), activeTimeElapsedMs:Math.max(1000,Math.floor(telemetry?.elapsedMs)||1000),
    remainingHpPct, matchStats:telemetry || {},isDraw:game.winner==='draw'};
}

// ── ORIGINE CONSOLIDATA: src/competitiveBootstrap.js ──
// Fase 17Q — popolamento di avvio. Bot di gioco, non utenti connessi.
// In futuro può essere disattivato senza migrare identificativi o salvataggi.
export const COMPETITIVE_BOOTSTRAP = Object.freeze({
  enabled: true,
  realOpponentSearchMs: 12000,
  eliteRosterSize: 500,
  dailyChallengeBotCount: 150,
  presentation: 'misto' // Le classifiche possono contenere piloti simulati e reali.
});

export function seededCompetitionRng(seedText) {
  let h = 2166136261;
  for (const char of String(seedText)) {
    h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Un profilo reale sostituisce un profilo sintetico, mai il contrario.
// Ordine di vittoria: punteggio; a pari punti precedenza a persone reali.
export function mergeBootstrapLeaderboard(realPlayers = [], simulatedPlayers = [], size = COMPETITIVE_BOOTSTRAP.eliteRosterSize) {
  const max = Math.max(0, Math.floor(Number(size) || 0));
  const unique = new Map();
  for (const player of realPlayers) {
    if (!player || player.id == null) continue;
    const id = String(player.id);
    if (!id || unique.has(id)) continue;
    unique.set(id, { ...player, id, isBot: false, isRealOnline: true });
  }
  const humans = [...unique.values()].sort((a, b) => (Number(b.trophies) || 0) - (Number(a.trophies) || 0)).slice(0, max);
  const available = Math.max(0, max - humans.length);
  const synthetic = COMPETITIVE_BOOTSTRAP.enabled
    ? simulatedPlayers.filter(p => p && p.isBot && !unique.has(String(p.id))).slice(0, available)
    : [];
  return [...humans, ...synthetic]
    .sort((a, b) => (Number(b.trophies) || 0) - (Number(a.trophies) || 0) || Number(Boolean(a.isBot)) - Number(Boolean(b.isBot)))
    .slice(0, max);
}

export function classifyPvPOpponent(match) {
  if (!match) return 'unknown';
  return match.isGhostMatch || match.opponent?.isBot ? 'simulated' : 'human';
}
