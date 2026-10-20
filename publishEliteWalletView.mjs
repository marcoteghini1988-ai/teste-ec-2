/** Solo Firebase Admin puo' pubblicare la proiezione dei diamanti verificati.
 * Il client legge eliteWalletViews/<proprio UID> e NON scrive mai serverWallets.
 * Una ripetizione dopo un crash e' sicura: la proiezione riflette il ledger.
 */
import {projectEliteServerWalletView} from '../src/eliteServices.js';
export async function publishEliteWalletView(db,uid) {
  if(!/^[a-zA-Z0-9_-]{3,128}$/.test(String(uid)))throw Error('UID wallet invalido');
  const wallet=(await db.ref(`serverWallets/${uid}`).get()).val();
  const publicView=projectEliteServerWalletView(wallet);
  if(!publicView)throw Error(`Portafoglio server assente o non valido: ${uid}`);
  await db.ref(`eliteWalletViews/${uid}`).set({...publicView,updatedAt:Date.now()});
  return publicView;
}
