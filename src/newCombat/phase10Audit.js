/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */
import { TURN_PHASES, SUITS } from './config.js';
import { BOOST_ENERGY_CAP } from './phase5Engine.js';

// ── ORIGINE CONSOLIDATA: src/newCombat/phase9ModeAdapter.js ──
/**
 * FASE 9 — contratti per migrazione modalità. NESSUN premio/salvataggio/HP
 * della campagna viene scritto da questo adattatore. PvP reale escluso finché
 * esisterà un'autorità di rete per convalidare simultaneamente le mosse.
 */
export const PHASE9_SUPPORTED_MODES=Object.freeze(['adventure','daily_challenge','pve','training','pvp']);
const safeInt=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
export function describePhase9Battle({gameMode='adventure',activeAdventure=null,bettingTier=1,isBoss=false,hasNetworkOpponent=false}={}) {
  const normalized=PHASE9_SUPPORTED_MODES.includes(gameMode)?gameMode:'training';
  const planet=safeInt(activeAdventure?.planet,1,20,1);
  const sector=safeInt(activeAdventure?.level,1,10,1);
  const boss=Boolean(isBoss || (['adventure','daily_challenge'].includes(normalized)&&sector===10));
  const realPvP=normalized==='pvp' && Boolean(hasNetworkOpponent);
  const label=normalized==='adventure'?`Campagna · Pianeta ${planet} · Settore ${sector}`:
    normalized==='daily_challenge'?'Sfida giornaliera':normalized==='pve'?'Sfida PvE':
    normalized==='pvp'?'PvP': 'Allenamento';
  return Object.freeze({mode:normalized,label,planet,sector,isBoss:boss,
    difficultyCategory:boss?'boss':'normal',bettingTier:safeInt(bettingTier,1,4,1),
    previewAllowed:!realPvP,networkAuthoritative:realPvP,
    writesCampaignProgress:false,awardsRewards:false,
    ruleset:'botta-risposta-v2'});
}
export function validatePhase9BattleLaunch(descriptor) {
  if(!descriptor?.previewAllowed) return {ok:false,reason:'Il PvP reale richiede prima la convalida delle mosse sul server.'};
  return {ok:true,reason:'Arena di prova isolata da progressione e ricompense.'};
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase10Audit.js ──


const sides=['player','enemy'];
const inRange=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;

export function auditPhase10Duel(state) {
  const errors=[];
  if (!state || typeof state!=='object') return {ok:false,errors:['Stato della battaglia mancante']};
  if(!Object.values(TURN_PHASES).includes(state.phase)) errors.push('Fase sconosciuta');
  if(!Array.isArray(state.board)||state.board.length!==5) errors.push('Banco diverso da cinque slot');
  const cards=[];
  (state.board||[]).forEach((c,i)=>{if(c) cards.push([`board.${i}`,c]);});
  for(const side of sides) {
    const own=state[side];
    if(!own || !Array.isArray(own.hand) || !Array.isArray(own.deck) || !Array.isArray(own.discard)) {
      errors.push(`Carte ${side} non valide`);continue;
    }
    for(const zone of ['hand','deck','discard']) own[zone].forEach((c,i)=>cards.push([`${side}.${zone}.${i}`,c]));
    if(!inRange(state.hp?.[side],0,Number.MAX_SAFE_INTEGER)) errors.push(`HP negativi o invalidi: ${side}`);
    const tanks=state.ammo?.[side];
    if(!tanks || SUITS.some(suit=>!Number.isInteger(tanks[suit])||tanks[suit]<0)) errors.push(`Serbatoi invalidi: ${side}`);
    if(!Number.isInteger(state.boost?.[side]?.energy)||!inRange(state.boost?.[side]?.energy,0,BOOST_ENERGY_CAP)) errors.push(`Energia Boost non valida: ${side}`);
  }
  const idLocations=new Map();
  for(const [where,card] of cards) {
    if(!card || card.id==null) {errors.push(`Carta senza ID: ${where}`);continue;}
    const id=String(card.id);
    if(idLocations.has(id)) errors.push(`Carta duplicata: ${id} (${idLocations.get(id)} / ${where})`);
    else idLocations.set(id,where);
  }
  if (state.phase===TURN_PHASES.FINISHED && !['player','enemy','draw'].includes(state.winner)) errors.push('Risultato finale non valido');
  if (state.phase!==TURN_PHASES.FINISHED && state.winner && ![TURN_PHASES.ANIMATE,TURN_PHASES.PREPARE].includes(state.phase)) errors.push('Vincitore presente fuori dal risultato finale');
  return {ok:errors.length===0,errors,cardCount:cards.length,rounds:state.round||0};
}

export function createPhase10Handoff(state, battleContext={}) {
  const inspection=auditPhase10Duel(state);
  const mode=describePhase9Battle(battleContext);
  if(!inspection.ok) return {ok:false,reason:'Lo stato del duello non supera il controllo di integrità',errors:inspection.errors};
  if(state.phase!==TURN_PHASES.FINISHED) return {ok:false,reason:'Il duello non è ancora terminato',errors:[]};
  if(mode.networkAuthoritative) return {ok:false,reason:'Il PvP reale necessita di convalida server',errors:[]};
  const report=Object.freeze({
    schemaVersion:1,
    ruleset:'botta-risposta-v2',
    mode:mode.mode,
    planet:mode.planet,
    sector:mode.sector,
    isBoss:mode.isBoss,
    outcome:state.winner,
    playerHp:state.hp.player,
    enemyHp:state.hp.enemy,
    playerMaxHp:state.initialHp?.player??null,
    enemyMaxHp:state.initialHp?.enemy??null,
    exchanges:Math.max(0,(state.round||1)-1),
    boosterEnergy:{player:state.boost.player.energy,enemy:state.boost.enemy.energy},
  });
  // Questo è deliberatamente un report read-only: premi, sfide, boss, salvataggi,
  // perdite/vite e strumenti della campagna devono essere migrati insieme.
  return {ok:true,report,canCommitCampaign:false,canAwardRewards:false,requires:['progressione campagna','ricompense/boss','effetti armi','abilità piloti/terreno','test UI e build','PvP server autorevole']};
}

// ── ORIGINE CONSOLIDATA: src/newCombat/phase11Campaign.js ──


export const CAMPAIGN_V2_MIGRATION = Object.freeze({
  planet: 1, minSector: 1, maxSector: 5, modifier: 'standard', sectorMode: 'classic',
});

export function isPhase11CampaignEligible({gameMode, activeAdventure, sectorMode='classic', hasNetworkOpponent=false}={}) {
  if (gameMode!=='adventure' || hasNetworkOpponent || sectorMode!=='classic') return false;
  const planet=activeAdventure?.planet, sector=activeAdventure?.level;
  return planet===CAMPAIGN_V2_MIGRATION.planet &&
    Number.isInteger(sector) && sector>=CAMPAIGN_V2_MIGRATION.minSector && sector<=CAMPAIGN_V2_MIGRATION.maxSector &&
    activeAdventure?.modifier?.id===CAMPAIGN_V2_MIGRATION.modifier;
}

export function getPhase11BattleMeta(report, telemetry={}, challenge=null) {
  if (!report || report.ruleset!=='botta-risposta-v2' || report.mode!=='adventure' ||
      report.isBoss || report.planet!==1 || !Number.isInteger(report.sector) ||
      report.sector<1 || report.sector>5 ||
      !['player','enemy','draw'].includes(report.outcome) ||
      !Number.isFinite(report.playerHp) || !Number.isFinite(report.playerMaxHp) || report.playerMaxHp<=0 ||
      !Number.isInteger(report.exchanges) || report.exchanges<0) return null;
  const isWin=report.outcome==='player';
  const finalHpRatio=Math.max(0,Math.min(1,report.playerHp/report.playerMaxHp));
  const stats={
    totalTimeElapsed:Math.max(1,Math.floor((Number(telemetry.elapsedMs)||1000)/1000)),
    finalHp:report.playerHp, maxHp:report.playerMaxHp,
    exchangesUsed:Math.max(0,Number(telemetry.swaps)||0),
    opCounts:telemetry.opCounts || {},
    maxSingleHitDmg:Math.max(0,Number(telemetry.maxSingleHitDmg)||0),
    goldenOrComboCount:Math.max(0,Number(telemetry.goldenOrComboCount)||0),
    moduleActivations:Math.max(0,Number(telemetry.moduleActivations)||0),
    heartsPlayed:Math.max(0,Number(telemetry.heartsPlayed)||0),
    fastStrikesCount:Math.max(0,Number(telemetry.fastStrikesCount)||0),
  };
  // La terza stella deriva dalle azioni realmente registrate. Non viene
  // concessa in automatico per abilita' del motore legacy non ancora portate.
  const thirdStar=isWin && typeof challenge?.check==='function' && Boolean(challenge.check(stats));
  return {
    isDraw:report.outcome==='draw', isPvP:false, usedRevive:false,
    turnsElapsed:Math.max(1,report.exchanges),
    activeTimeElapsedMs:Math.max(1000,Number(telemetry.elapsedMs)||1000),
    remainingHpPct:Math.round(finalHpRatio*100)/100,
    matchStats:stats,
    starsEarned:isWin?[true,finalHpRatio>=.5,thirdStar]:[false,false,false],
    adventureChallenge:challenge?{challenge,stats,starsEarned:isWin?[true,finalHpRatio>=.5,thirdStar]:[false,false,false]}:null,
    ruleset:report.ruleset,
  };
}

/** Chiamare solo su azione esplicita dopo fine scontro, con sessionId univoco. */
export function validatePhase11Settlement(state, context, telemetry, challenge) {
  if(!isPhase11CampaignEligible({gameMode:context?.gameMode,activeAdventure:context?.activeAdventure,
    sectorMode:context?.sectorMode,hasNetworkOpponent:context?.hasNetworkOpponent})) return {ok:false,reason:'Settore non ancora migrato'};
  if(state?.campaignSession?.planet!==context.activeAdventure.planet ||
      state?.campaignSession?.sector!==context.activeAdventure.level)
    return {ok:false,reason:'Identificativo della sessione non coerente con il settore'};
  const audit=auditPhase10Duel(state);
  if(!audit.ok) return {ok:false,reason:'Stato non valido',errors:audit.errors};
  const handoff=createPhase10Handoff(state,context);
  if(!handoff.ok) return {ok:false,reason:handoff.reason};
  if(handoff.report.planet!==context.activeAdventure.planet || handoff.report.sector!==context.activeAdventure.level)
    return {ok:false,reason:'Settore del rapporto diverso dal settore attivo'};
  const meta=getPhase11BattleMeta(handoff.report,telemetry,challenge);
  if(!meta) return {ok:false,reason:'Statistiche della campagna incomplete'};
  return {ok:true,report:handoff.report,meta};
}

export function createPhase11OnceGuard() {
  const consumed=new Set();
  return {
    claim(sessionKey) {
      if(typeof sessionKey!=='string'||!sessionKey||consumed.has(sessionKey)) return false;
      consumed.add(sessionKey);return true;
    },
    has(sessionKey) {return consumed.has(sessionKey);},
  };
}
