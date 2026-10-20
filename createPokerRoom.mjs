/** Provisioning amministrativo manuale per collaudare due account Firebase Auth.
 * Uso: FIREBASE_DATABASE_URL=... GOOGLE_APPLICATION_CREDENTIALS=... \
 * node createPokerRoom.mjs UID_1 UID_2 [training|elite]
 * Non usare UID forniti liberamente da un client; devono provenire da Firebase Auth.
 */
import {randomBytes} from 'node:crypto';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {createOnlinePokerSession,viewOnlinePokerSession} from '../src/newCombat/pvpOnlineProtocol.js';
import {createPhase7Armory} from '../src/newCombat/phase7Armory.js';

const [uid1,uid2,channel='training']=process.argv.slice(2);
const valid=uid=>/^[a-zA-Z0-9_-]{4,128}$/.test(String(uid));
if(!valid(uid1)||!valid(uid2)||uid1===uid2||!['training','elite'].includes(channel))throw Error('Due Firebase UID distinti e canale valido richiesti');
if(!process.env.FIREBASE_DATABASE_URL||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('Credenziali Admin e URL Firebase richiesti');
if(!getApps().length)initializeApp({credential:applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});
const db=getDatabase();
for(const uid of [uid1,uid2]){
  const account=await (await import('firebase-admin/auth')).getAuth().getUser(uid);
  if(!account || account.disabled)throw Error('UID inesistente o disabilitato');
}
const profile=async uid=>{
  const snap=await db.ref(`serverProfiles/${uid}`).get();
  const p=snap.val()||{};
  // SOLO profili /serverProfiles scritti da Admin. In assenza si usa equipaggiamento iniziale,
  // non quello che il client pretende di possedere.
  const defaults=createPhase7Armory();
  return {uid,loadout:p.pokerEquipped || defaults.equipped,levels:p.pokerLevels||{},hp:p.pokerHp||180};
};
const players=await Promise.all([profile(uid1),profile(uid2)]);
const roomId=`room_poker_${randomBytes(9).toString('hex')}`;
const session=createOnlinePokerSession({roomId,players,serverSecret:randomBytes(36).toString('base64url')});
const tx=await db.ref(`pokerAuthority/${roomId}`).transaction(v=>v===null?session:undefined,undefined,false);
if(!tx.committed)throw Error('Stanza già presente');
const updates={};
for(const uid of [uid1,uid2]){
  updates[`pokerViews/${uid}/${roomId}`]=viewOnlinePokerSession(session,uid);
  updates[`pokerRoomAssigned/${uid}`]={roomId,channel,assignedAt:Date.now()};
}
await db.ref().update(updates);
console.log(`Stanza Poker pronta: ${roomId} (${channel})`);
