/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */

// ── ORIGINE CONSOLIDATA: src/elitePublicLeaderboard.js ──
/** Classifica Élite pubblica: solo risultati di duelli umani verificati dall'arbitro.
 * I piloti IA sono aggiunti unicamente dal bootstrap client, mai al registro premi.
 */
const UID = /^[a-zA-Z0-9_-]{3,128}$/;
const WEEK = /^settimana_\d{4}_(?:[1-9]|[1-4]\d|5[0-3])$/;
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;

export function publicElitePlayersFromVerified(scores, profiles, weekKey) {
  if (!WEEK.test(String(weekKey))) throw new Error('Settimana Élite non valida');
  const players = {};
  for (const [uid, row] of Object.entries(scores || {})) {
    if (!UID.test(uid) || !row || row.verified !== true || row.isBot !== false || row.weekKey !== weekKey) continue;
    if (!integer(row.trophies, 1000000) || !integer(row.wins, 100000) ||
        !integer(row.losses, 100000) || !integer(row.draws, 100000)) continue;
    const rawName = profiles?.[uid]?.nickname;
    const nickname = typeof rawName === 'string' && rawName.trim()
      ? rawName.trim().slice(0,28).replace(/[<>]/g,'')
      : 'Pilota verificato';
    players[uid] = {
      nickname, trophies: row.trophies, wins: row.wins,
      losses: row.losses, draws: row.draws,
      verified: true, isBot: false
    };
  }
  return players;
}

export function publicElitePlayersToRoster(players) {
  return Object.entries(players || {}).filter(([uid,p])=>UID.test(uid) && p?.verified === true && p?.isBot === false &&
      integer(p.trophies,1000000) && integer(p.wins,100000) && integer(p.losses,100000))
    .map(([id,p])=>({
      id, nickname: typeof p.nickname === 'string' ? p.nickname.slice(0,28) : 'Pilota verificato',
      trophies:p.trophies, wins:p.wins, losses:p.losses, level: null,
      isBot:false, isRealOnline:true, verified:true
    }));
}

// ── ORIGINE CONSOLIDATA: src/eliteWeeklyAwards.js ──
// Fase 17S — calcolo PURO del podio, da usare unicamente con punteggi
// verificati da un backend, mai con la classifica sintetica in localStorage.
export const ELITE_WEEKLY_DIAMONDS = Object.freeze([100, 50, 25]);

export function computeVerifiedEliteAwards(entries, weekKey) {
  if (!/^settimana_\d{4}_(?:[1-9]|[1-4]\d|5[0-3])$/.test(String(weekKey))) {
    throw new Error('Invalid Elite week');
  }
  const unique = new Map();
  for (const item of Array.isArray(entries) ? entries : []) {
    if (!item || item.isBot || item.verified !== true || item.weekKey !== weekKey) continue;
    const id = String(item.playerId || '');
    if (!/^[a-zA-Z0-9_-]{3,128}$/.test(id)) continue;
    const trophies = Number(item.trophies);
    if (!Number.isSafeInteger(trophies) || trophies < 0 || trophies > 1000000) continue;
    const wins = Number(item.wins);
    if (!Number.isSafeInteger(wins) || wins < 0 || wins > 100000) continue;
    const record = { playerId: id, trophies, wins };
    const previous = unique.get(id);
    if (!previous || trophies > previous.trophies || (trophies === previous.trophies && wins > previous.wins)) {
      unique.set(id, record);
    }
  }
  const ranked = [...unique.values()]
    .sort((a,b)=>b.trophies-a.trophies || b.wins-a.wins || a.playerId.localeCompare(b.playerId));
  return ranked.slice(0,ELITE_WEEKLY_DIAMONDS.length)
    .map((player,i)=>({ ...player, rank:i+1, diamonds: ELITE_WEEKLY_DIAMONDS[i], weekKey }));
}

// Usato esclusivamente dal server: con un'unica transazione sul portafoglio
// il premio settimanale viene accreditato zero o una volta, anche ai retry.
export function creditVerifiedEliteAward(wallet, award) {
  if (!award || !/^[a-zA-Z0-9_-]{3,128}$/.test(String(award.playerId)) ||
      !/^settimana_\d{4}_(?:[1-9]|[1-4]\d|5[0-3])$/.test(String(award.weekKey)) ||
      ELITE_WEEKLY_DIAMONDS[award.rank - 1] !== award.diamonds) {
    throw new Error('Invalid signed Elite award');
  }
  const existing = wallet && typeof wallet === 'object' ? wallet : {};
  if (existing.eliteSettledWeeks?.[award.weekKey]) return undefined;
  const previous = Number(existing.diamonds);
  if (!Number.isSafeInteger(previous) || previous < 0) throw new Error('Invalid server diamond wallet');
  if (!Number.isSafeInteger(previous + award.diamonds)) throw new Error('Wallet overflow');
  return { ...existing,
    diamonds: previous + award.diamonds,
    eliteSettledWeeks: { ...(existing.eliteSettledWeeks || {}), [award.weekKey]: award.diamonds }
  };
}

// ── ORIGINE CONSOLIDATA: src/eliteServerWalletView.js ──
/** Proiezione READ-ONLY per il proprietario: un client non puo' accreditarla.
 * Il portafoglio e i registri settimanali restano nel ramo Admin serverWallets.
 * Ritorna null per portafogli non inizializzati, invece di inventare 0 diamanti.
 */
const ELITE_WALLET_WEEK=/^settimana_(\d{4})_(0?[1-9]|[1-4]\d|5[0-3])$/;
const REWARDS=new Set([25,50,100]);

export function projectEliteServerWalletView(wallet) {
  if (!wallet || typeof wallet !== 'object' || !Number.isSafeInteger(wallet.diamonds) || wallet.diamonds < 0) return null;
  const awards = Object.entries(wallet.eliteSettledWeeks || {})
    .filter(([week, amount])=>ELITE_WALLET_WEEK.test(week) && Number.isSafeInteger(amount) && REWARDS.has(amount))
    .sort((a,b)=>{
      const x=ELITE_WALLET_WEEK.exec(a[0]), y=ELITE_WALLET_WEEK.exec(b[0]);
      return Number(y[1])-Number(x[1]) || Number(y[2])-Number(x[2]);
    })
    .slice(0,5)
    .map(([weekKey,diamonds])=>({weekKey,diamonds}));
  return { diamonds:wallet.diamonds, recentEliteAwards:awards, source:'verified-server-wallet' };
}

export function readEliteServerWalletView(value) {
  if (!value || value.source !== 'verified-server-wallet' || !Number.isSafeInteger(value.diamonds) || value.diamonds < 0) return null;
  return {diamonds:value.diamonds, recentEliteAwards:Array.isArray(value.recentEliteAwards)?value.recentEliteAwards:[]};
}

// ── ORIGINE CONSOLIDATA: src/eliteWeekSettlementGuards.js ──
/** Solo il server liquida settimane concluse: impedisce anticipi e chiavi malformate. */
export function assertClosedEliteWeekKey(targetWeekKey, currentWeekKey) {
  const parse = value => {
    const m = /^settimana_(\d{4})_(0?[1-9]|[1-4]\d|5[0-3])$/.exec(String(value));
    if (!m) throw Error('Settimana Élite non valida');
    return Number(m[1]) * 100 + Number(m[2]);
  };
  if (parse(targetWeekKey) >= parse(currentWeekKey)) throw Error('Settimana non ancora chiusa');
  return true;
}
