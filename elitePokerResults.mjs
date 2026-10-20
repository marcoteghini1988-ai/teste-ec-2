/** Solo Admin: risultati reali verificati dal Poker server, mai dai client/bot. */
export function getRomePokerWeekKey(ms=Date.now()){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
 const d=new Date(`${date}T00:00:00Z`);const day=d.getUTCDay()||7;
 d.setUTCDate(d.getUTCDate()+4-day);
 const start=new Date(Date.UTC(d.getUTCFullYear(),0,1));
 return `settimana_${d.getUTCFullYear()}_${Math.ceil((((d-start)/86400000)+1)/7)}`;
}
export function accumulateVerifiedPokerResult(before,roomId,won,weekKey,now){
 const s=before||{weekKey,verified:true,isBot:false,trophies:0,wins:0,losses:0,draws:0,processedRooms:{}};
 if(s.weekKey!==weekKey||s.processedRooms?.[roomId])return undefined;
 return {...s,verified:true,isBot:false,trophies:Math.max(0,(s.trophies||0)+(won===true?15:won===false?-10:0)),
   wins:(s.wins||0)+(won===true?1:0),losses:(s.losses||0)+(won===false?1:0),draws:(s.draws||0)+(won===null?1:0),
   processedRooms:{...s.processedRooms,[roomId]:true},updatedAt:now};
}
/** Una sola transazione per i DUE giocatori: il podio non può essere
 * congelato dopo aver contabilizzato soltanto metà di un duello. */
export function applyVerifiedRoomToWeek(current,roomId,participants,winner,weekKey,now) {
 if(current?.lockedAt) return undefined;
 const roles=Object.entries(participants||{});
 if(roles.length!==2 || !roles.every(([,side])=>side==='player'||side==='enemy') || roles[0][1]===roles[1][1]) return undefined;
 const results={...(current?.results||{})};
 let changed=false;
 for(const [uid,side] of roles){
   const won=winner==='draw'?null:winner===side;
   const next=accumulateVerifiedPokerResult(results[uid],roomId,won,weekKey,now);
   if(next){results[uid]=next;changed=true;}
 }
 return changed?{...(current||{}),weekKey,results,updatedAt:now}:undefined;
}
export async function recordVerifiedOnlinePokerResult(db,roomId,session){
 if(!session||session.status!=='finished'||session.channel!=='elite'||session.protocol!=='poker-online-17T'||
   !['player','enemy','draw'].includes(session.state?.winner))return false;
 const weekKey=getRomePokerWeekKey(session.createdAt||session.completedAt);
 const roles=Object.entries(session.participants||{});
 if(roles.length!==2)return false;
 const r=await db.ref(`eliteVerifiedWeeks/${weekKey}`).transaction(
   current=>applyVerifiedRoomToWeek(current,roomId,session.participants,session.state.winner,weekKey,session.completedAt||Date.now()),
   undefined,false);
 if(!r.snapshot.exists())throw Error('Persistenza risultati Élite fallita');
 return r.committed;
}
