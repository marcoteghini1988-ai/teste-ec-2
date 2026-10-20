/** Inizializzazione Admin una sola volta; NON importa il saldo locale.
 * Chi ha già un saldo verificato non viene mai sovrascritto.
 */
import {publishEliteWalletView} from './publishEliteWalletView.mjs';
export async function ensurePokerServerWallet(db,uid,now=Date.now()){
  if(!/^[a-zA-Z0-9_-]{3,128}$/.test(String(uid)))throw Error('UID non valido');
  const walletRef=db.ref(`serverWallets/${uid}`);
  const result=await walletRef.transaction(current=>current===null?{diamonds:0,createdAt:now}:undefined,undefined,false);
  if(!result.snapshot.exists())throw Error(`Portafoglio non disponibile per ${uid}`);
  await publishEliteWalletView(db,uid);
  return result.committed;
}
