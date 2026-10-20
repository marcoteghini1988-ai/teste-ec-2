import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ref,onValue,set} from 'firebase/database';
import {db, firebaseAuth} from './pvpManager.jsx';
import {getWeaponDefinition} from './newCombat/weaponCatalog.js';
import ClassicPokerFieldBridge from './ClassicPokerFieldBridge.jsx';

const panel={padding:12,border:'1px solid #38bdf8',borderRadius:12,background:'rgba(4,13,32,.93)',color:'#e2e8f0'};
const btn={border:'1px solid #64748b',borderRadius:8,padding:'8px 12px',background:'#10284d',color:'white',cursor:'pointer'};
const cardButton=(active=false)=>({...btn,minWidth:46,minHeight:65,borderColor:active?'#fbbf24':'#44617c',background:active?'#63441d':'#13243e',fontSize:17,fontWeight:700});
const suitColor=s=>({hearts:'#fda4af',diamonds:'#67e8f9',clubs:'#86efac',spades:'#d8b4fe'})[s]||'#e2e8f0';
/** Controlli remoti: non costruiscono mai lo stato canonico e non espongono il mazzo avversario. */
export default function PvpOnlinePokerBattle({meta,onLeave,onComplete}) {
 const [view,setView]=useState(null),[connectionError,setConnectionError]=useState('');
 const [selected,setSelected]=useState([]),[placements,setPlacements]=useState([]);
 const [weaponClass,setWeaponClass]=useState('light'),[pending,setPending]=useState(null),[feedback,setFeedback]=useState('');
 const [now,setNow]=useState(Date.now());
 const uid=meta?.authUid, roomId=meta?.roomId;
 const ready=Boolean(uid&&roomId&&db&&firebaseAuth?.currentUser?.uid===uid);
 useEffect(()=>{
   const timer=setInterval(()=>setNow(Date.now()),500);
   return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
   if(!ready){setConnectionError('Autenticazione PvP assente: stanza non disponibile.');return;}
   setConnectionError('');
   return onValue(ref(db,`pokerViews/${uid}/${roomId}`),snap=>{
     const next=snap.val();
     if(next?.roomId!==roomId || next?.me?.side==null){setConnectionError('In attesa del server Poker...');return;}
     setView(next);setConnectionError('');
   },err=>setConnectionError(`Ricezione duello: ${err.message}`));
 },[uid,roomId,ready]);
 useEffect(()=>{setSelected([]);setPlacements([]);},[view?.round,view?.phase,view?.me?.hand?.map(c=>c.id).join('|')]);
 useEffect(()=>{
   if(!ready||!pending?.id)return;
   return onValue(ref(db,`pokerActionResults/${uid}/${pending.id}`),snap=>{
     const result=snap.val();if(!result)return;
     setFeedback(result.ok?'Mossa confermata dal server':`Mossa rifiutata: ${result.error||'riprova'}`);
     setPending(null);
   },err=>{setFeedback(err.message);setPending(null);});
 },[uid,ready,pending?.id]);
 const me=view?.me?.side||'player', opponent=me==='player'?'enemy':'player';
 const myTurn=Boolean(view&&['attack','response'].includes(view.phase)&&view.actor===me);
 const preparation=view?.phase==='prepare', finished=view?.status==='finished';
 const seconds=Math.max(0,Math.ceil(((view?.deadlineAt||now)-now)/1000));
 const armed=view?.arsenal?.[me]||{};
 const canAct=ready&&view?.status==='active'&&!pending;
 const currentWeapon=armed[weaponClass]||armed.light||armed.medium||armed.heavy;
 const toggleCard=id=>{
   if(preparation){setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:old);return;}
   if(!myTurn)return;
   setPlacements(old=>old.filter(p=>p.cardId!==id));
   setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<4?[...old,id]:old);
 };
 const setSlot=slot=>{
   if(!myTurn)return;
   const candidate=selected.find(id=>!placements.some(p=>p.cardId===id));
   if(!candidate){setPlacements(old=>old.filter(p=>p.slot!==slot));return;}
   setPlacements(old=>[...old.filter(p=>p.slot!==slot),{slot,cardId:candidate}]);
 };
 const send=useCallback(async (type,extra={})=>{
   if(!ready||!canAct)return;
   const id=`act_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
   const action={type,expectedVersion:view.version,...extra};
   setPending({id});setFeedback('Invio della mossa al server...');
   try{await set(ref(db,`pokerIntents/${roomId}/${uid}/${id}`),action);}catch(err){setFeedback(`Invio fallito: ${err.message}`);setPending(null);}
 },[ready,canAct,view?.version,uid,roomId]);
 const cards=useMemo(()=>view?.me?.hand||[],[view?.me?.hand]);
 if(!view)return <div style={{...panel,maxWidth:650,margin:'25px auto'}}><h2>PvP Poker online</h2><p>{connectionError||'Connessione alla stanza in corso...'}</p><button style={btn} onClick={onLeave}>Torna alla home</button></div>;
 const winnerText= view.winner==='draw'?'Pareggio':view.winner===me?'Hai vinto':'Vince l’avversario';
 return <div className="classic-online-poker-layout" style={{minHeight:'100vh',background:'radial-gradient(ellipse at 50% 25%,#112b47,#020613 75%)',padding:'10px 6px 35px',color:'#d9faff'}}>
   <div style={{maxWidth:530,margin:'0 auto 10px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12}}>
     <strong>◈ DUELLO ONLINE · {meta?.channel==='elite'?'ÉLITE':'ADDESTRAMENTO'}</strong>
     <button type="button" style={btn} onClick={onLeave}>ESCI ✕</button>
   </div>
   <ClassicPokerFieldBridge mode={meta?.channel==='elite'?'PVP · ÉLITE':'PVP · ADDESTRAMENTO'}
     phase={view.phase} round={view.round} seconds={seconds}
     hp={view.hp} initialHp={view.initialHp} ammo={view.ammo}
     playerSide={me} hand={cards} opponentHandSize={view.opponent?.handSize||0}
     deckSize={view.me?.deckSize} opponentDeckSize={view.opponent?.deckSize}
     arsenal={view.arsenal} weaponLevels={view.weaponLevels}
     board={Array.from({length:5},(_,i)=>{
       const mine=placements.find(p=>p.slot===i);
       return mine?cards.find(c=>c.id===mine.cardId):(view.board?.[i]?.card||view.board?.[i]);
     })}
     draftSlots={placements.map(p=>p.slot)}
     selectedHand={cards.map((card,i)=>selected.includes(card.id)?i:-1).filter(i=>i>=0)}
     selectedWeaponId={currentWeapon}
     weaponOptions={Object.values(armed).filter(Boolean).map(weaponId=>({weaponId}))}
     onAbandon={onLeave}
     onSelectWeapon={weaponId=>{const cls=Object.keys(armed).find(key=>armed[key]===weaponId);if(cls)setWeaponClass(cls);}}
     onCardClick={i=>toggleCard(cards[i].id)} onSlotClick={setSlot}
     onPlaceCard={(handIndex,slot)=>{const card=cards[handIndex];if(!card||!myTurn)return;
       setSelected(old=>old.includes(card.id)?old:[...old,card.id].slice(-4));
       setPlacements(old=>[...old.filter(p=>p.slot!==slot&&p.cardId!==card.id),{slot,cardId:card.id}]);}}
     canPlay={myTurn&&canAct} canPrepare={preparation&&canAct&&!view.ready?.[me]}
     canAttack={myTurn&&canAct&&Boolean(currentWeapon)&&placements.length>0}
     onAttack={()=>send('attack',{placements,weaponId:currentWeapon})}
     onPass={()=>send('attack',{pass:true})}
     onClear={()=>{setPlacements([]);setSelected([]);}}
     onSwap={()=>send('swap',{indices:selected.map(id=>cards.findIndex(c=>c.id===id))})}
     onReady={()=>send('ready')} exchangesLeft={view.me?.exchangesLeft||0}
     ready={Boolean(view.ready?.[me])}
     result={finished?{...view.result,winner:view.winner}:view.result} finished={finished}
     onFinish={finished?()=>onComplete?.(view):null}
   />
   {pending&&<p role="status" style={{textAlign:'center',color:'#facc15'}}>Mossa in convalida dal server...</p>}
   {feedback&&<p role="status" style={{textAlign:'center',fontSize:12}}>{feedback}</p>}
   {connectionError&&<p role="alert" style={{textAlign:'center',color:'#fda4af'}}>{connectionError}</p>}
   <p style={{textAlign:'center',fontSize:11,opacity:.75}}>Le carte dell'altro giocatore restano segrete. Ogni mossa e ogni risultato sono verificati dal server.</p>
 </div>;
}
