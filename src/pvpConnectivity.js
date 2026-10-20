/** Eclissi Stellare — R2: moduli consolidati per responsabilità. */

// ── ORIGINE CONSOLIDATA: src/pokerOnlineQueue.js ──
/** Coppie online 17U: solo profili in attesa della medesima coda; nessun client crea stanze. */
export const POKER_ONLINE_CHANNELS=Object.freeze(['training','elite']);
export function chooseOnlinePokerPair(queue, now=Date.now()) {
  if(!queue || typeof queue!=='object') return null;
  const waiting=Object.entries(queue).filter(([uid,t])=>
    /^[a-zA-Z0-9_-]{4,128}$/.test(uid)&&t?.uid===uid&&t.status==='waiting'&&
    Number.isSafeInteger(t.joinedAt)&&t.joinedAt<=now&&now-t.joinedAt<30000)
    .sort((a,b)=>a[1].joinedAt-b[1].joinedAt || a[0].localeCompare(b[0]));
  return waiting.length>=2?waiting.slice(0,2).map(([uid])=>uid):null;
}
export function reserveOnlinePokerPair(queue,pair,roomId,now=Date.now()){
  if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]|| !/^room_poker_[a-zA-Z0-9_-]{8,}$/.test(roomId))return null;
  if(pair.some(uid=>queue?.[uid]?.status!=='waiting'||queue[uid].uid!==uid||now-queue[uid].joinedAt>=30000))return null;
  return {...queue,...Object.fromEntries(pair.map(uid=>[uid,{...queue[uid],status:'reserved',matchRoomId:roomId,reservedAt:now}]))};
}
export function reservedOnlinePokerPairs(queue,now=Date.now()){
  const groups=new Map();
  for(const [uid,t] of Object.entries(queue||{}))if(t?.uid===uid&&t.status==='reserved'&&
    /^room_poker_[a-zA-Z0-9_-]{8,}$/.test(t.matchRoomId||'')&&Number.isSafeInteger(t.reservedAt)&&now-t.reservedAt<60000){
    if(!groups.has(t.matchRoomId))groups.set(t.matchRoomId,[]);
    groups.get(t.matchRoomId).push(uid);
  }
  return [...groups.entries()].filter(([,uids])=>uids.length===2).map(([roomId,uids])=>({roomId,uids}));
}

/** Cancellazione atomica: se il server ha prenotato la coppia, non cancellarla. */
export function cancelWaitingPokerTicket(ticket) {
  if (ticket?.status !== 'waiting') return undefined;
  return null;
}

// ── ORIGINE CONSOLIDATA: src/pvpQueueProtocol.js ──
// Fase 17S: protocollo puro di abbinamento per RTDB.
// L'intera coppia viene riservata con UNA transazione sul nodo della coda:
// due client non possono assegnare lo stesso ticket in due partite diverse.
export const MATCHMAKING_TICKET_TTL_MS = 15000;

export function findQueuePartner(queue, myId, now, ttlMs = MATCHMAKING_TICKET_TTL_MS) {
  if (!queue || !myId) return null;
  const waiting = Object.entries(queue)
    .filter(([id, ticket]) => id && ticket && ticket.status === 'waiting' &&
      Number.isFinite(Number(ticket.timestamp)) &&
      Number(ticket.timestamp) <= now && now - Number(ticket.timestamp) < ttlMs)
    .sort(([idA, a], [idB, b]) => Number(a.timestamp) - Number(b.timestamp) || idA.localeCompare(idB));
  const index = waiting.findIndex(([id]) => id === myId);
  // Il secondo ticket di ciascuna coppia effettua la prenotazione.
  if (index < 1 || index % 2 !== 1) return null;
  const [opponentId, opponent] = waiting[index - 1];
  return { opponentId, opponent };
}

export function reserveQueuePair(queue, myId, roomId, now) {
  const match = findQueuePartner(queue, myId, now);
  if (!match || !roomId) return null;
  const myTicket = queue[myId];
  const opponentTicket = queue[match.opponentId];
  if (!myTicket || !opponentTicket || myTicket.status !== 'waiting' || opponentTicket.status !== 'waiting') return null;
  return {
    ...queue,
    [myId]: { ...myTicket, status: 'matched', matchRoomId: roomId, pairedWith: match.opponentId },
    [match.opponentId]: { ...opponentTicket, status: 'matched', matchRoomId: roomId, pairedWith: myId }
  };
}

export function removeWaitingTicket(queue, myId) {
  if (!queue || !queue[myId] || queue[myId].status !== 'waiting') return undefined;
  const next = { ...queue };
  delete next[myId];
  return Object.keys(next).length ? next : null;
}

export function releaseFailedPair(queue, roomId) {
  if (!queue || !roomId) return undefined;
  const next = { ...queue };
  let changed = false;
  for (const [id, ticket] of Object.entries(next)) {
    if (ticket?.status === 'matched' && ticket.matchRoomId === roomId) {
      next[id] = { ...ticket, status: 'waiting', matchRoomId: null, pairedWith: null };
      changed = true;
    }
  }
  return changed ? next : undefined;
}

export function makePvpRoomId(leftId, rightId) {
  const safe = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const ids = [safe(leftId), safe(rightId)].sort();
  if (!ids[0] || !ids[1] || ids[0] === ids[1]) throw new Error('Invalid PvP peer IDs');
  return `room_pvp_${ids[0]}_${ids[1]}`;
}

// ── ORIGINE CONSOLIDATA: src/pokerRoomReconnect.js ──
/** Riconnessione: riaprire SOLO una partita ancora attiva assegnata allo stesso UID. */
export function resumablePokerRoom(assignment, privateView, channel) {
  if(!assignment || !privateView || !['elite','training'].includes(channel))return null;
  if(assignment.channel!==channel || !/^room_poker_[a-zA-Z0-9_-]{8,}$/.test(String(assignment.roomId||'')))return null;
  if(privateView.protocol!=='poker-online-17T' || privateView.roomId!==assignment.roomId || privateView.status!=='active')return null;
  if(!['player','enemy'].includes(privateView.me?.side) || !Number.isSafeInteger(privateView.version))return null;
  return {roomId:assignment.roomId,channel,mode:'poker',isOnlinePoker:true,isGhostMatch:false};
}
