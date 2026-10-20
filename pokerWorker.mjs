/** Worker di sviluppo: arbitro RTDB ad azioni serializzate e checkpoint atomici.
 * NON è una Cloud Function distribuita né un servizio scalato automaticamente.
 * La sicurezza dipende dalle regole che legano pokerIntents/<room>/<uid> ad auth.uid.
 */
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {applyOnlinePokerAction,tickOnlinePokerSession,viewOnlinePokerSession} from '../src/newCombat/pvpOnlineProtocol.js';
import {matchOnlinePokerQueues} from './pokerRoomService.mjs';
import {recordVerifiedOnlinePokerResult} from './elitePokerResults.mjs';
import {publishVerifiedEliteLeaderboard} from './elitePublicProjection.mjs';
import {getRomePokerWeekKey} from './elitePokerResults.mjs';
import {previousRomePokerWeekKey,settleVerifiedEliteWeek} from './eliteSettlementService.mjs';
if(!process.env.FIREBASE_DATABASE_URL||!process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('Credenziali Admin obbligatorie');
if(!getApps().length)initializeApp({credential:applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});
const db=getDatabase();
let busy=false;
let lastSettlementCheck=0;
const MAX_ACTIONS_PER_TICK=100;
// I risultati Élite vengono proiettati pubblicamente solo dopo essere stati salvati.
// La marcatura è l'ultimo passaggio: un riavvio a metà operazione permette il retry.
async function finalizeEliteRoom(roomId, session) {
 if(session?.status!=='finished'||session.channel!=='elite')return;
 if((await db.ref(`elitePublishedRooms/${roomId}`).get()).exists())return;
 await recordVerifiedOnlinePokerResult(db,roomId,session);
 const weekKey=getRomePokerWeekKey(session.createdAt||session.completedAt);
 await publishVerifiedEliteLeaderboard(db,weekKey);
 await db.ref(`elitePublishedRooms/${roomId}`).set({weekKey,publishedAt:Date.now()});
}

async function cycle(){
 if(busy)return;
 busy=true;
 try{
  await matchOnlinePokerQueues(db);
  // Liquidazione automatica: una volta ogni 5 minuti controlla la settimana chiusa.
  // Le transazioni del ledger impediscono gli accrediti doppi al riavvio.
  if(Date.now()-lastSettlementCheck>=300000){
    lastSettlementCheck=Date.now();
    try{
      const week=previousRomePokerWeekKey();
      await settleVerifiedEliteWeek(db,week);
    }catch(error){console.warn('Premi Élite in attesa di liquidazione:',error);}
  }
  const root=await db.ref('pokerAuthority').get();
  const entries=Object.entries(root.val()||{}).filter(([,s])=>s?.status==='active');
  for(const [roomId] of entries){
   const roomRef=db.ref(`pokerAuthority/${roomId}`);
   const pending=await db.ref(`pokerIntents/${roomId}`).get();
   let processed=0;
   for(const [uid,commands] of Object.entries(pending.val()||{})){
    for(const [actionId,action] of Object.entries(commands||{})){
     if(processed++>=MAX_ACTIONS_PER_TICK)break;
     let failure=null;
     const now=Date.now();
     let committed=false;
     const outcome=await roomRef.transaction(s=>{
       if(!s||s.status!=='active'){failure='Duello concluso';return undefined;}
       try{
         const next=applyOnlinePokerAction(s,uid,{...action,id:actionId},now);
         failure=null;
         return next;
       }catch(err){failure=err.message;return undefined;}
     },undefined,false).catch(err=>{console.warn('Transazione azione',err);return null;});
     if(!outcome){continue;} // errore di rete: richiesta ancora in attesa
     committed=outcome.committed;
     if(committed){
       const s=outcome.snapshot.val();
       const projection={};
       for(const p of Object.keys(s.participants||{})) projection[`pokerViews/${p}/${roomId}`]=viewOnlinePokerSession(s,p);
       await db.ref().update(projection);
     }
     await db.ref(`pokerActionResults/${uid}/${actionId}`).set({ok:committed,roomId,at:now,error:committed?null:(failure||'Azione scaduta o ripetuta')});
     await db.ref(`pokerIntents/${roomId}/${uid}/${actionId}`).remove();
    }
   }
   const response=await roomRef.transaction(s=>{const next=s?tickOnlinePokerSession(s,Date.now()):null;return next&&next!==s?next:undefined;},undefined,false).catch(()=>null);
   if(response?.committed){
     const s=response.snapshot.val();
     const projection={};
     for(const p of Object.keys(s.participants||{}))projection[`pokerViews/${p}/${roomId}`]=viewOnlinePokerSession(s,p);
     await db.ref().update(projection);
   }
   const latest=await roomRef.get();
   if(latest.val()?.status==='finished') {
      try {await finalizeEliteRoom(roomId,latest.val());}
      catch(error){console.warn('Registrazione risultato Élite:',roomId,error);}
   }
  }
  // Recupera anche risultati conclusi in un ciclo precedente.
  for(const [roomId,s] of Object.entries(root.val()||{}))if(s?.status==='finished'&&s?.channel==='elite') {
    try {await finalizeEliteRoom(roomId,s);}
    catch(error){console.warn('Risultato Élite in sospeso',roomId,error);}
  }
 }catch(error){console.error('Worker Poker:',error);}
 finally{busy=false;}
}
await cycle();
setInterval(cycle,1000);
console.log('Arbitro Poker RTDB avviato, attesa richieste autenticate.');
