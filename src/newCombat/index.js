// Punto di ingresso del nuovo motore. NON importare da componenti legacy per ora.
export * from './config.js';
export * from './weaponCatalog.js';
export * from './combatBasics.js';
export * from './pokerRules.js';
export * from './phase5Engine.js';

// Macchina a stati della Fase 3 — indipendente dalla UI e dalle armi.
export * from './phase3Engine.js';

// Balistica e integrazione delle armi nell'anteprima Fase 4.
export * from './phase4Weapons.js';
export * from './phase4Engine.js';

// Energia, calcolo e bonus sui colpi vincenti nell'arena della Fase 5.

// Preparazione strategica, penalità di scambio, Etere e AI (Fase 6).
export * from './phase6Engine.js';

export * from './weaponArt.js';

// Fase 9: tattica AI e contratti di integrazione delle modalità.
export * from './phase9AI.js';
export * from './phase10Audit.js';

export { auditPhase10Duel, createPhase10Handoff } from './phase10Audit.js';
