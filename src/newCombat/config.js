/** FASE 1: specifica stabile; il combattimento classico rimane abilitato. */
export const NEW_COMBAT_ENABLED = false;
export const BOARD_SLOT_COUNT = 5;
export const MAX_PLACED_CARDS_PER_ACTION = 4;
export const WEAPON_SLOTS = Object.freeze([
  { slot: 0, weaponClass: 'light', label: 'ARMA LEGGERA' },
  { slot: 1, weaponClass: 'medium', label: 'ARMA MEDIA' },
  { slot: 2, weaponClass: 'heavy', label: 'ARMA PESANTE' },
  { slot: 3, weaponClass: 'boost', label: 'BOOST MATEMATICO', isWeapon: false },
]);
export const SUITS = Object.freeze(['hearts', 'diamonds', 'clubs', 'spades']);
export const TURN_PHASES = Object.freeze({ ATTACK: 'attack', RESPONSE: 'response', RESOLVE: 'resolve', PREPARE: 'prepare', ANIMATE: 'animate', FINISHED: 'finished' });
export const PHASE_MAX_SECONDS = Object.freeze({ attack: 20, response: 20, prepare: 30 });
export const BOOST_LEVELS = Object.freeze([
  { cost: 15, bonusPercent: 25 }, { cost: 30, bonusPercent: 50 }, { cost: 45, bonusPercent: 75 }
]);
// Punteggi provvisori della gerarchia: da verificare prima dell'integrazione in PvP.
export const POKER_PATTERNS = Object.freeze([
  { id: 'one_pair', label: 'Coppia', count: 2, tier: 10 },
  { id: 'two_pair', label: 'Doppia coppia', count: 4, tier: 20 },
  { id: 'three_of_a_kind', label: 'Tris', count: 3, tier: 30 },
  { id: 'straight_4', label: 'Scala minima', count: 4, tier: 40 },
  { id: 'straight_5', label: 'Scala completa', count: 5, tier: 41 },
  { id: 'flush_4', label: 'Colore minimo', count: 4, tier: 50 },
  { id: 'flush_5', label: 'Colore completo', count: 5, tier: 51 },
  { id: 'full_house', label: 'Full', count: 5, tier: 60 },
  { id: 'four_of_a_kind', label: 'Poker', count: 4, tier: 70 },
  { id: 'straight_flush_4', label: 'Scala a colore minima', count: 4, tier: 80 },
  { id: 'straight_flush_5', label: 'Scala a colore completa', count: 5, tier: 81 },
  { id: 'royal_flush_5', label: 'Scala reale', count: 5, tier: 90 },
]);
