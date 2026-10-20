/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { BOARD_SLOT_COUNT, MAX_PLACED_CARDS_PER_ACTION, PHASE_MAX_SECONDS, TURN_PHASES, WEAPON_SLOTS } from './config.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/boardRules.js ──


/** Uno slot libero va occupato prima di sostituire carte già presenti. */
export function resolveBoardPlacementSlot(board, intendedSlot) {
  if (!Array.isArray(board) || board.length !== BOARD_SLOT_COUNT) return null;
  if (!Number.isInteger(intendedSlot) || intendedSlot < 0 || intendedSlot >= BOARD_SLOT_COUNT) return null;
  if (board[intendedSlot] == null) return intendedSlot;
  const emptyIndex = board.findIndex(c => c == null);
  return emptyIndex < 0 ? intendedSlot : emptyIndex;
}


/** Quante carte è obbligatorio calare prima di poter confermare la mossa. */
export function requiredBoardPlacements(board, availableHandCount, maxCards = MAX_PLACED_CARDS_PER_ACTION, blockedSlots = []) {
  if (!Array.isArray(board) || board.length !== BOARD_SLOT_COUNT) return 0;
  return Math.min(
    board.filter((card, index) => card == null && !blockedSlots.includes(index)).length,
    Math.max(0, Math.floor(Number(availableHandCount) || 0)),
    maxCards
  );
}

/**
 * Simula un piazzamento senza mutare banco né mano.
 * placements: [{slot: 0..4, card: {id,...}}]
 * Ogni slot inizialmente vuoto VA riempito se si hanno abbastanza carte,
 * fino a MAX_PLACED_CARDS_PER_ACTION. A banco vuoto sono obbligatorie 4 carte.
 */
export function applyBoardPlacements(board, placements, { availableCardIds = null, maxCards = MAX_PLACED_CARDS_PER_ACTION, blockedSlots = [] } = {}) {
  if (!Array.isArray(board) || board.length !== BOARD_SLOT_COUNT) return { valid: false, error: 'board_size' };
  if (!Array.isArray(placements) || placements.length > maxCards) return { valid: false, error: 'placement_limit' };
  const next = [...board];
  const replaced = [];
  const seenSlots = new Set();
  const seenCards = new Set();
  const empty = board.map((card, index) => card == null && !blockedSlots.includes(index) ? index : null).filter(x => x !== null);
  const available = availableCardIds == null ? null : new Set(availableCardIds);
  for (const placement of placements) {
    if (!placement || !Number.isInteger(placement.slot) || placement.slot < 0 || placement.slot >= BOARD_SLOT_COUNT)
      return { valid: false, error: 'invalid_slot' };
    const { slot, card } = placement;
    if (blockedSlots.includes(slot)) return { valid: false, error: 'anomaly_blocked_slot' };
    if (!card || typeof card.id === 'undefined') return { valid: false, error: 'invalid_card' };
    if (seenSlots.has(slot)) return { valid: false, error: 'duplicate_slot' };
    if (seenCards.has(card.id)) return { valid: false, error: 'duplicate_card' };
    if (available && !available.has(card.id)) return { valid: false, error: 'not_in_hand' };
    seenSlots.add(slot); seenCards.add(card.id);
    if (next[slot] != null) replaced.push(next[slot]);
    next[slot] = card;
  }
  const mustFill = requiredBoardPlacements(board, available ? available.size : maxCards, maxCards, blockedSlots);
  if (empty.some(i => !seenSlots.has(i)) && placements.length < mustFill)
    return { valid: false, error: 'must_fill_empty_slots', requiredEmpty: mustFill };
  // Riempire vuoti prima delle sostituzioni, se il turno dispone di abbastanza carte.
  const filledOriginalEmpty = empty.filter(i => seenSlots.has(i)).length;
  if (filledOriginalEmpty < mustFill) return { valid: false, error: 'must_fill_empty_slots', requiredEmpty: mustFill };
  return { valid: true, board: next, placedCardIds: [...seenCards], replacedCards: replaced, emptySlots: next.filter(c => c == null).length };
}
export function removeCommittedCards(board, committedIds) {
  if (!Array.isArray(board) || board.length !== BOARD_SLOT_COUNT) throw new Error('Banco non valido');
  const ids = new Set(committedIds);
  return board.map(card => card && ids.has(card.id) ? null : card);
}

// ── ORIGINE CONSOLIDATA: src/newCombat/turnRules.js ──

/** Specifica pura del ciclo; anteprima UI e motore PVE della Fase 3 in phase3Engine.js. PvP Firebase ancora legacy. */
export function createTurnCycle(openerId) {
  return { phase: TURN_PHASES.ATTACK, openerId, responderId: null, confirmed: [], maxSeconds: PHASE_MAX_SECONDS.attack, timerPaused: false };
}
export function nextPhase(phase) {
  if (phase === TURN_PHASES.ATTACK) return TURN_PHASES.RESPONSE;
  if (phase === TURN_PHASES.RESPONSE) return TURN_PHASES.RESOLVE;
  if (phase === TURN_PHASES.RESOLVE) return TURN_PHASES.ANIMATE;
  if (phase === TURN_PHASES.ANIMATE) return TURN_PHASES.PREPARE;
  if (phase === TURN_PHASES.PREPARE) return TURN_PHASES.ATTACK;
  throw new Error(`Fase sconosciuta: ${phase}`);
}
export function phaseTimerSeconds(phase) { return PHASE_MAX_SECONDS[phase] ?? null; }
/** Scadenza senza conferma: ATTACCO/RISPOSTA = passa, PREPARAZIONE = pronto automatico. */
export function getTimeoutAction(phase) {
  if (phase === TURN_PHASES.ATTACK || phase === TURN_PHASES.RESPONSE) return 'pass';
  if (phase === TURN_PHASES.PREPARE) return 'auto_ready';
  return 'none'; // risoluzione e animazioni non hanno timer
}
export function shouldPauseDecisionTimer(phase) {
  return phase === TURN_PHASES.ANIMATE || phase === TURN_PHASES.RESOLVE;
}

// ── ORIGINE CONSOLIDATA: src/newCombat/loadoutMigration.js ──

/**
 * NON sovrascrive eclissi_equipped_weapons: fino alla migrazione del combattimento
 * bisogna mantenere i 4 hardpoint usati dalla campagna attiva.
 * Le 20 armi legacy non hanno classe Media: il nuovo slot rimane vuoto,
 * senza attribuire silenziosamente categorie false.
 */
export function previewLegacyLoadoutMigration(legacyEquipped, legacyDatabase) {
  const original = Array.isArray(legacyEquipped) ? [...legacyEquipped] : [];
  const map = new Map((legacyDatabase || []).map(weapon => [weapon.id, weapon]));
  const picked = new Set();
  const next = { light: null, medium: null, heavy: null, boost: null };
  for (const weaponClass of ['light', 'heavy']) {
    const id = original.find(id => {
      const weapon = map.get(id);
      return weapon && weapon.weight === weaponClass && weapon.type === 'poker' && !picked.has(id);
    });
    if (id) { next[weaponClass] = id; picked.add(id); }
  }
  return { proposed: next, oldEquippedPreserved: original, unresolvedLegacyWeapons: original.filter(id => !picked.has(id)),
    requiresPlayerConfirmation: true, schemaVersion: 2 };
}
export function validateClassLoadout(loadout, catalog) {
  const weapons = new Map(catalog.map(w => [w.id, w]));
  const invalid = [];
  for (const slot of WEAPON_SLOTS) {
    if (slot.isWeapon === false) continue;
    const id = loadout?.[slot.weaponClass];
    if (id && weapons.get(id)?.weaponClass !== slot.weaponClass) invalid.push(slot.weaponClass);
  }
  return { valid: invalid.length === 0, invalidSlots: invalid };
}
