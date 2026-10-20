/** F17R: assetto Poker del giorno, indipendente da inventario e livello utente. */
import { ARSENAL_48 } from './newCombat/weaponCatalog.js';
import { createPhase7Armory } from './newCombat/phase7Armory.js';
export const DAILY_POKER_RULESET = 'botta-risposta-v2';
export const DAILY_POKER_FIRST_DATE = '2026-10-16';
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rngOf(seed){let s=seed>>>0;return()=>{let t=(s+=0x6d2b79f5);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function isDailyPokerDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>=DAILY_POKER_FIRST_DATE;}
export function createDailyPokerConfig(dateStr){
 if(!isDailyPokerDate(dateStr))throw Error('Data della Sfida Poker non valida');
 const rng=rngOf(hash(`daily-poker-17R:${dateStr}`));
 const rarityKey=['common','rare','epic'][Math.floor(rng()*3)];
 const assignedWeapons={};
 for(const cls of ['light','medium','heavy']){
  const pool=ARSENAL_48.filter(w=>w.weaponClass===cls&&w.rarityKey===rarityKey);
  if(!pool.length)throw Error(`Catalogo incompleto: ${cls}`);
  assignedWeapons[cls]=pool[Math.floor(rng()*pool.length)].id;
 }
 const playerHp=200+Math.floor(rng()*5)*15;
 return Object.freeze({dateStr,mode:'poker',ruleset:DAILY_POKER_RULESET,
  attackSeconds:25,responseSeconds:25,preparationSeconds:35,
  assignedWeapons:Object.freeze(assignedWeapons),weaponLevel:rarityKey==='epic'?1:2,
  rarityKey,playerHp,aiHp:Math.round(playerHp*1.15),
  pilotId:'pilot_com_1',pilotLevel:2,enemyPilotId:'pilot_com_2',
  livesProvided:0,scannerMode:'RESTRICTED',assignedDeck:'neutral_starter',assignedDeckLevel:1,
  noCampaignRewards:true});
}
const SUITS=[['hearts','♥','#f43f5e'],['diamonds','♦','#00f2fe'],['clubs','♣','#10b981'],['spades','♠','#c084fc']];
/** Mazzi Poker completi: stesso seme per lo stesso lato e giorno, zero Math.random. */
export function createDailyPokerDeck(dateStr,side='player'){
 if(!isDailyPokerDate(dateStr)||!['player','enemy'].includes(side))throw Error('Mazzo sfida non valido');
 const rng=rngOf(hash(`${dateStr}:${side}:poker-deck-17R`));
 const cards=[];
 for(const [suit,symbol,color] of SUITS)for(let value=1;value<=13;value++)cards.push({
  id:`daily-${dateStr}-${side}-${suit}-${value}`,value,
  displayVal:({1:'A',11:'J',12:'Q',13:'K'})[value]||String(value),
  suit,symbol,color,glow:color,isCourt:value>=11,isJoker:false,isGolden:false,
 });
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 return cards;
}
export function createDailyPokerArmory(config){
 if(config?.ruleset!==DAILY_POKER_RULESET)throw Error('Regole sfida non valide');
 const equipped=config.assignedWeapons,ids=Object.values(equipped||{});
 if(ids.length!==3||new Set(ids).size!==3)throw Error('Sono necessarie tre armi distinte');
 for(const [cls,id] of Object.entries(equipped))if(!ARSENAL_48.some(w=>w.id===id&&w.weaponClass===cls))throw Error('Arma non valida nello slot');
 const base=createPhase7Armory();
 return {...base,owned:Object.fromEntries(ids.map(id=>[id,true])),equipped:{...equipped},
  levels:Object.fromEntries(ids.map(id=>[id,config.weaponLevel]))};
}
export function buildDailyPokerResult(config,game,telemetry,at=new Date()){
 if(config?.ruleset!==DAILY_POKER_RULESET||!game||!telemetry)throw Error('Risultato incompleto');
 if(!['player','enemy','draw'].includes(game.winner)||!Number.isInteger(game.round)||game.round<1)throw Error('Duello non concluso');
 const elapsedMs=Math.floor(Number(telemetry.elapsedMs)||0);
 if(elapsedMs<1000)throw Error('Durata troppo breve');
 return {victory:game.winner==='player',ruleset:DAILY_POKER_RULESET,forDate:config.dateStr,
  turns:Math.max(1,game.round-1),timeElapsedMs:elapsedMs,
  remainingHpPct:Math.min(1,Math.max(0,(Number(game.hp?.player)||0)/config.playerHp)),timestamp:at.getTime()};
}
