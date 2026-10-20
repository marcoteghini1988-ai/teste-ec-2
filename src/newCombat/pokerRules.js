/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { POKER_PATTERNS } from './config.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/duelRules.js ──
/** Calcola il risultato provvisorio di un duello, senza applicare HP o munizioni. */
export function comparePokerScores(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.tier !== b.tier) return Math.sign(a.tier - b.tier);
  const length = Math.max(a.kickers?.length || 0, b.kickers?.length || 0);
  for (let i = 0; i < length; i++) {
    const d = (a.kickers?.[i] || 0) - (b.kickers?.[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}
/**
 * Ritorna percentuali, senza implementare una regola arbitraria per le salve dispari.
 * pass/timeout -> nessuna risposta. Parità -> 50% ciascuno.
 */
export function resolveExchange(attacker, responder) {
  if (!attacker?.score && !responder?.score) return { winner: null, damagePercent: [0,0], ammoPercent: [0,0] };
  const outcome = comparePokerScores(attacker?.score, responder?.score);
  const percents = outcome > 0 ? [100, responder?.score ? 50 : 0]
    : outcome < 0 ? [attacker?.score ? 50 : 0, 100] : [50,50];
  return { winner: outcome > 0 ? 'attacker' : outcome < 0 ? 'responder' : null,
    damagePercent: percents, ammoPercent: [...percents],
    nextInitiative: outcome > 0 ? 'attacker' : outcome < 0 ? 'responder' : 'UNDECIDED_TIE' };
}
/** Senza scelta sugli arrotondamenti dei proiettili dispari il motore non consuma munizioni. */
export function calculateAmmoUsage(fullSalvo, percent) {
  if (!Number.isInteger(fullSalvo) || fullSalvo < 0 || ![0,50,100].includes(percent)) throw new Error('Salva non valida');
  const shots = fullSalvo * percent / 100;
  if (!Number.isInteger(shots)) return { resolved: false, reason: 'ODD_SALVO_ROUNDING_UNDECIDED', exactShots: shots };
  return { resolved: true, shots };
}

// ── ORIGINE CONSOLIDATA: src/newCombat/pokerRules.js ──


const DEFINITIONS = new Map(POKER_PATTERNS.map(p => [p.id, p]));
const SUIT_NAMES = {
  '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs', '♠': 'spades',
  heart: 'hearts', diamond: 'diamonds', club: 'clubs', spade: 'spades',
};
export function normalizePokerSuit(suit) {
  return SUIT_NAMES[suit] || String(suit || '').toLowerCase();
}
export function isPokerJoker(card) {
  return !!card && (card.isJoker === true || normalizePokerSuit(card.suit) === 'joker' || String(card.id ?? '').toLowerCase().includes('joker'));
}
export function normalizePokerRank(card) {
  if (!card) return null;
  const raw = isPokerJoker(card) && card.isTransformed && card.transformedValue != null
    ? card.transformedValue : card.value ?? card.rank ?? card.displayVal;
  const key = String(raw ?? '').trim().toUpperCase();
  const parsed = ({ A: 1, J: 11, Q: 12, K: 13 })[key] ?? Number(key);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 14 ? (parsed === 14 ? 1 : parsed) : null;
}
const aceHigh = n => n === 1 ? 14 : n;
const descending = ranks => ranks.slice().sort((a, b) => b - a);
const rankChoices = Array.from({ length: 13 }, (_, i) => 14 - i);

function getScoreForPattern(cards, patternId) {
  const definition = DEFINITIONS.get(patternId);
  if (!definition || !Array.isArray(cards) || cards.length !== definition.count || cards.some(c => !c)) return null;
  const fixed = [];
  let anyJokers = 0;
  for (const card of cards) {
    const suit = normalizePokerSuit(card.suit);
    if (isPokerJoker(card)) {
      const fixedRank = card.isTransformed && card.transformedValue != null ? normalizePokerRank(card) : null;
      if (card.isTransformed && fixedRank === null) return null;
      if (fixedRank === null) anyJokers += 1;
      else fixed.push({ rank: fixedRank, suit: null });
    } else {
      const rank = normalizePokerRank(card);
      if (rank === null || !['hearts', 'diamonds', 'clubs', 'spades'].includes(suit)) return null;
      fixed.push({ rank, suit });
    }
  }
  // Un Jolly trasformato mantiene il valore ma assume qualsiasi seme.
  const ranks = fixed.map(c => c.rank);
  const fixedSuits = new Set(fixed.filter(c => c.suit).map(c => c.suit));
  const suitWorks = fixedSuits.size <= 1;
  const fixedHigh = ranks.map(aceHigh);
  let best = null;
  const offer = kickers => {
    if (!kickers) return;
    if (!best || compareKickers(kickers, best) > 0) best = kickers;
  };
  if (patternId === 'one_pair' || patternId === 'three_of_a_kind' || patternId === 'four_of_a_kind') {
    if (new Set(ranks).size <= 1) offer([ranks.length ? aceHigh(ranks[0]) : 14]);
  } else if (patternId === 'two_pair' || patternId === 'full_house') {
    const targets = patternId === 'two_pair' ? [2, 2] : [3, 2];
    for (const first of rankChoices) for (const second of rankChoices) {
      if (first === second) continue;
      const countFirst = fixedHigh.filter(v => v === first).length;
      const countSecond = fixedHigh.filter(v => v === second).length;
      if (countFirst + countSecond !== fixed.length) continue;
      if (countFirst > targets[0] || countSecond > targets[1]) continue;
      if (patternId === 'two_pair') offer(descending([first, second]));
      else offer([first, second]);
    }
  } else if (patternId === 'flush_4' || patternId === 'flush_5') {
    if (suitWorks) {
      const used = new Set(fixedHigh);
      const wildcardRanks = rankChoices.filter(v => !used.has(v)).slice(0, anyJokers);
      offer(descending([...fixedHigh, ...wildcardRanks]));
    }
  } else if (['straight_4', 'straight_5', 'straight_flush_4', 'straight_flush_5', 'royal_flush_5'].includes(patternId)) {
    const needSuit = patternId.includes('flush');
    if (!needSuit || suitWorks) {
      const count = cards.length;
      for (let start = 1; start <= 15 - count; start++) {
        const seq = Array.from({ length: count }, (_, i) => start + i);
        if (patternId === 'royal_flush_5' && start !== 10) continue;
        if (new Set(ranks).size !== ranks.length) continue;
        const possible = ranks.every(rank => seq.includes(rank) || (rank === 1 && seq.includes(14)));
        if (possible) offer([seq.at(-1)]);
      }
    }
  }
  if (!best) return null;
  return {
    patternId,
    label: definition.label,
    tier: definition.tier,
    kickers: best,
    cardIds: cards.map(c => c.id),
    cardsUsed: cards.length,
    jokerCount: cards.filter(isPokerJoker).length,
  };
}
function compareKickers(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}
export const evaluateExactPokerPattern = getScoreForPattern;

function subsets(cards, count, offset = 0, picked = [], out = []) {
  if (picked.length === count) { out.push([...picked]); return out; }
  for (let i = offset; i <= cards.length - (count - picked.length); i++) {
    picked.push(cards[i]); subsets(cards, count, i + 1, picked, out); picked.pop();
  }
  return out;
}
/** Ogni risultato porta gli ID ESATTI delle carte che vanno poi consumate. */
export function listAvailablePokerCombinations(board, allowedPatterns = null) {
  if (!Array.isArray(board)) return [];
  const cards = board.filter(Boolean);
  const patterns = allowedPatterns == null ? POKER_PATTERNS : POKER_PATTERNS.filter(p => allowedPatterns.includes(p.id));
  const results = [];
  for (const pattern of patterns) {
    if (cards.length < pattern.count) continue;
    let best = null;
    for (const selected of subsets(cards, pattern.count)) {
      const score = evaluateExactPokerPattern(selected, pattern.id);
      if (score && (!best || comparePokerScores(score, best) > 0)) best = score;
    }
    if (best) results.push(best);
  }
  return results.sort((a, b) => comparePokerScores(b, a));
}
export function findBestPokerCombination(board, allowedPatterns = null) {
  return listAvailablePokerCombinations(board, allowedPatterns)[0] || null;
}
/** Compatibilità ID con i vecchi obiettivi di ClassicBattleView. */
export function getLegacyPokerPatternIds(patternId, cardCount) {
  if (patternId === 'straight') return cardCount === 4 ? ['straight_4'] : cardCount === 5 ? ['straight_5'] : [];
  if (patternId === 'flush') return cardCount === 4 ? ['flush_4'] : cardCount === 5 ? ['flush_5'] : [];
  // Nella vecchia modalità 'royal_flush' indicava qualsiasi scala dello stesso seme.
  if (patternId === 'royal_flush') return cardCount === 4 ? ['straight_flush_4'] : cardCount === 5 ? ['straight_flush_5'] : [];
  return [patternId];
}
