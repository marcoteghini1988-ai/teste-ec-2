/** Liquidazione verificata e idempotente della settimana Élite.
 * Da invocare esclusivamente con credenziali Firebase Admin. Nessun client
 * modifica leaderboard verificata, registro premi o saldi ufficiali.
 */
import {computeVerifiedEliteAwards, creditVerifiedEliteAward} from '../src/eliteServices.js';
import {assertClosedEliteWeekKey} from '../src/eliteServices.js';
import {getRomePokerWeekKey} from './elitePokerResults.mjs';
import {publishEliteWalletView} from './publishEliteWalletView.mjs';

const WEEK=/^settimana_\d{4}_(?:[1-9]|[1-4]\d|5[0-3])$/;

export function previousRomePokerWeekKey(now=Date.now()){
  if(!Number.isFinite(now))throw Error('Tempo server invalido');
  // Sette giorni prima mantiene la stessa posizione nel calendario ISO, anche al cambio d'anno.
  return getRomePokerWeekKey(now-7*86400000);
}

export async function settleVerifiedEliteWeek(db,weekKey,{now=Date.now()}={}){
  if(!WEEK.test(String(weekKey)))throw Error('Settimana Élite non valida');
  assertClosedEliteWeekKey(weekKey,getRomePokerWeekKey(now));
  const weekRef=db.ref(`eliteVerifiedWeeks/${weekKey}`);
  // Il blocco della settimana e la fotografia dei risultati sono atomici.
  const freeze=await weekRef.transaction(current=>{
    if(!current?.results || !Object.keys(current.results).length || current.lockedAt)return undefined;
    return {...current,lockedAt:now};
  },undefined,false);
  const week=freeze.snapshot.val();
  if(!week?.lockedAt || !week.results) return {status:'no-results',weekKey};

  const winners=computeVerifiedEliteAwards(Object.entries(week.results).map(([id,score])=>({ ...score,playerId:id })),weekKey);
  if(!winners.length)return {status:'no-verified-players',weekKey};
  const settlementRef=db.ref(`eliteWeekSettlements/${weekKey}`);
  const locked=await settlementRef.transaction(current=>current||{
    weekKey,winners,createdAt:now,status:'pending'
  },undefined,false);
  const frozen=locked.snapshot.val();
  if(!Array.isArray(frozen?.winners)||frozen.weekKey!==weekKey)throw Error('Piano premi non valido');
  if(frozen.status==='complete')return {status:'already-settled',weekKey,winners:frozen.winners.length};
  for(const award of frozen.winners){
    const walletRef=db.ref(`serverWallets/${award.playerId}`);
    const response=await walletRef.transaction(wallet=>creditVerifiedEliteAward(wallet,award),undefined,false);
    if(!response.snapshot.exists())throw Error(`Portafoglio non presente: ${award.playerId}`);
    // Ricostruisce la vista anche se il primo tentativo è stato interrotto dopo l'accredito.
    await publishEliteWalletView(db,award.playerId);
  }
  await settlementRef.update({status:'complete',completedAt:now});
  return {status:'settled',weekKey,winners:frozen.winners.length};
}
