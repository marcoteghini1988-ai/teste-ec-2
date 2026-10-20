import {randomBytes} from 'node:crypto';
import {getAuth} from 'firebase-admin/auth';
import {createOnlinePokerSession,viewOnlinePokerSession} from '../src/newCombat/pvpOnlineProtocol.js';
import {createPhase7Armory} from '../src/newCombat/phase7Armory.js';
import {ensurePokerServerWallet} from './ensurePokerServerWallet.mjs';
import {chooseOnlinePokerPair,reserveOnlinePokerPair,reservedOnlinePokerPairs} from '../src/pvpConnectivity.js';

/** Assegna la stanza da ADMIN: i client non leggono mai stato canonico né lo creano. */
export async function ensureOnlinePokerRoom(db,roomId,uids,channel){
 if(!['training','elite'].includes(channel)||uids.length!==2||uids[0]===uids[1])throw Error('Coppia o canale invalidi');
 for(const uid of uids){const user=await getAuth().getUser(uid);if(!user||user.disabled)throw Error('Identità Firebase non verificata');}
 // Crea un ledger ufficiale vuoto SOLO su identita' Admin verificata.
 // Il saldo locale non viene mai importato o usato per le vincite competitive.
 for(const uid of uids) await ensurePokerServerWallet(db,uid);
 const roomRef=db.ref(`pokerAuthority/${roomId}`);
 let snap=await roomRef.get();
 if(!snap.exists()){
   const defaults=createPhase7Armory().equipped;
   const players=await Promise.all(uids.map(async uid=>{
     const p=(await db.ref(`serverProfiles/${uid}`).get()).val()||{};
     return {uid,loadout:p.pokerEquipped||defaults,levels:p.pokerLevels||{},hp:p.pokerHp||180};
   }));
   const session={...createOnlinePokerSession({roomId,players,serverSecret:randomBytes(36).toString('base64url')}),channel,createdAt:Date.now()};
   const res=await roomRef.transaction(v=>v===null?session:undefined,undefined,false);
   snap=res.snapshot;
 }
 const session=snap.val();
 if(!session||session.channel!==channel||uids.some(uid=>!(uid in session.participants)))throw Error('Stanza non corrispondente alla prenotazione');
 const updates={};
 for(const uid of uids){
   updates[`pokerViews/${uid}/${roomId}`]=viewOnlinePokerSession(session,uid);
   updates[`pokerRoomAssigned/${uid}`]={roomId,channel,assignedAt:Date.now()};
 }
 await db.ref().update(updates);
 return session;
}
/** Recupera anche le coppie prenotate prima di un riavvio worker. */
export async function matchOnlinePokerQueues(db,now=Date.now()){
 for(const channel of ['training','elite']){
   const root=db.ref(`pokerWaitQueue/${channel}`);
   let queue=(await root.get()).val()||{};
   const pair=chooseOnlinePokerPair(queue,now);
   if(pair){
     const roomId=`room_poker_${randomBytes(9).toString('hex')}`;
     const result=await root.transaction(q=>reserveOnlinePokerPair(q,pair,roomId,now)||undefined,undefined,false);
     queue=result.snapshot.val()||queue;
   }
   for(const {roomId,uids} of reservedOnlinePokerPairs(queue,now)){
     try{
       await ensureOnlinePokerRoom(db,roomId,uids,channel);
       const changes={};for(const uid of uids)changes[`pokerWaitQueue/${channel}/${uid}`]=null;
       await db.ref().update(changes);
     }catch(error){
       console.warn('Provisioning stanza',roomId,error.message);
       // Nessun finto successo: recupera al ciclo successivo; il client può ripiegare su IA solo senza prenotazione.
     }
   }
 }
}
