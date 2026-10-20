/**
 * FASE 15 — adattamento dei passivi storici DELLA CAMPAGNA.
 * Le definizioni originali di mazzi, carte Terreno e reliquie rimangono in App.tsx;
 * a questo motore arrivano soltanto gli oggetti equipaggiati e già sbloccati.
 * Gli effetti non cambiano il rango Poker, né introducono carte nel mazzo.
 * Danno e numeri sono provvisori fino alla Fase 16.
 */
import { TURN_PHASES } from './config.js';
import { exchangePhase6Cards, extractPhase6WithEther, markPhase6Ready, PHASE6_ETHER_COST } from './phase6Engine.js';

const other=side=>side==='player'?'enemy':'player';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Math.floor(Number(n)||0)));
const SIDES=['player','enemy'];
const SUITS=new Set(['hearts','diamonds','clubs','spades']);
const TERRAIN_IDS=Object.freeze(['cryo_stasis','sub_zero_seal','cryo_absorber','frost_bite','magnetic_valve','charge_splitter','gravimetric_anchor','rebound_condenser','frequency_reserve','tachyon_siphon','temporal_singularity','entropic_filter','resonance_lock','suit_catalyst','holographic_prism','spectral_multiplier','sign_inverter','quantum_polarizer','algebraic_refraction','harmonic_matrix']);
export const PHASE15_TERRAIN_IDS=TERRAIN_IDS;
export const PHASE15_EPIC_IDS=Object.freeze(Array.from({length:10},(_,i)=>`epic_item_${i+1}`));
const passiveCategories=Object.freeze({
  damage:new Set(['op_boost','op_flat_bonus','suit_damage_boost','execute_damage','first_try_boost','tolerance_flat_dmg','blood_damage','thorns_damage','poison_dot','high_target_snipe','streak_damage_buildup','cards_count_flat_dmg','joker_play_dmg','high_density_damage','low_hp_rage_dmg','court_card_damage','speed_damage_boost','burn_damage_passive','anomaly_damage_boost','rotation_ops_boost','recoil_halved','armor_pierce','streak_crit_trigger','burn_tick_charge_module','revive_blast_damage','drain_extra_dmg']),
  recovery:new Set(['suit_heal_boost','pass_heal_pct','hit_siphon','overheal_to_damage','hearts_flat_heal','combo_multisuit_heal','phase_clear_heal','exchange_heal_pct','ether_spend_heal','anomaly_heal_pct']),
  shield:new Set(['flat_defense','first_hit_shield','crit_damage_reduction','auto_revive_free','auto_revive_free_pct','revive_freeze_enemy','malus_drain_immunity','malus_hand_immunity','malus_lock_immunity','full_malus_immunity','anomaly_immunity']),
  boost:new Set(['initial_tank_bonus','drain_enemy_tank','tolerance_margin','dice_notches_req','dice_start_notch','dice_roll_burn','empty_tank_punish','high_density_draw','suit_time_boost','suit_dust_boost','suit_time_boost','speed_time_bonus','tolerance_time_reward','initial_ether_bonus','ether_generation_on_hit','suit_dust_boost']),
  preparation:new Set(['hand_size_bonus','deck_extract_discount','free_exchange_no_self_dmg','exchange_no_enemy_heal','free_exchange_time','first_extract_free','pass_draw_boost','joker_deck_count','joker_cost_discount','bypass_anomaly_op','fast_turn_draw','low_hp_hand_expansion','joker_play_dmg']),
  advanced:new Set(['planet_char','zodiac','combo_4suits_mult','victory_reward_mult','perfect_speed_dust','remove_epic_turn_limit','malus_capacity_bonus','high_density_damage','rearm_epic_single','double_epic_potency','capsule_exclusive','copy_enemy_skill','infinite_epic_overcharge','starter'])
});
export function describePhase15Trait(type) {
  if(!type||typeof type!=='string')return 'non riconosciuto';
  const match=Object.entries(passiveCategories).find(([,types])=>types.has(type));
  return match?.[0]||'da riconvertire';
}
const safeItem=(v,allowed,maxLevel)=>{
  if(!v || typeof v.id!=='string' || !allowed.includes(v.id))return null;
  return {id:v.id,level:clamp(v.level,1,maxLevel),name:String(v.name||v.id),rearmCost:clamp(v.rearmCost||0,0,5)};
};
/** Riceve snapshot di equipaggiamento reale, nessun acquisto o modifica di salvataggi. */
export function createPhase15Loadout(raw={}) {
  const traits=(Array.isArray(raw.deckTraits)?raw.deckTraits:[])
    .filter(t=>t&&typeof t.type==='string').map(t=>({...t}));
  const terrains=(Array.isArray(raw.terrains)?raw.terrains:[]).map(t=>safeItem(t,TERRAIN_IDS,3)).filter(Boolean).slice(0,4);
  const epics=(Array.isArray(raw.epics)?raw.epics:[]).map(e=>safeItem(e,PHASE15_EPIC_IDS,3)).filter(Boolean).slice(0,2);
  return {deckId:String(raw.deckId||'neutral_starter'),deckLevel:clamp(raw.deckLevel,1,9),traits,terrains:[...new Map(terrains.map(x=>[x.id,x])).values()],epics:[...new Map(epics.map(x=>[x.id,x])).values()]};
}
export function initializePhase15(state,raw={}) {
  const loadout=createPhase15Loadout(raw);
  // Un set per evitare doppio trigger anche con React StrictMode / turni ricalcolati.
  const traits=loadout.traits;
  const reserve=traits.find(t=>t.type==='initial_tank_bonus');
  const extra=reserve ? Math.min(8,Math.ceil((Number(reserve.bonus)||0)/5)) : 0;
  const boost=extra?{...state.boost,player:{...state.boost.player,energy:clamp(state.boost.player.energy+extra,0,45)}}:state.boost;
  const handTrait=traits.find(t=>t.type==='hand_size_bonus');
  const size=clamp(handTrait?.size||7,7,9);
  let player=state.player;
  if(handTrait && size>player.hand.length && player.deck.length) {
    const count=Math.min(size-player.hand.length,player.deck.length);
    player={...player,hand:[...player.hand,...player.deck.slice(0,count)],deck:player.deck.slice(count)};
  }
  return {...state,player,boost,legacyPassives:{loadout,usedTerrain:[],rearmedTerrains:[],usedEpic:[],eventCount:0},
    ...(state.campaignStageDecks?{campaignStageDecks:{...state.campaignStageDecks,player:[...player.hand,...player.deck]}}:{})};
}
const suitsOf=move=>new Set((move?.committedCards||[]).map(c=>c?.suit).filter(s=>SUITS.has(s)));
const gotShot=(v)=>Boolean(v?.shots>0 && v?.damage>0);

/** Si applica UNA volta alla fine di ogni scambio risolto. */
export function resolvePhase15Passives(state){
  if(!state?.legacyPassives||state.phase!==TURN_PHASES.ANIMATE||!state.result?.volleys||state.result.legacyPassivesResolved)return state;
  const old=state.legacyPassives,config=old.loadout, hp={...state.hp};
  const boost={player:{...state.boost.player},enemy:{...state.boost.enemy}};
  const ammo={player:{...state.ammo.player},enemy:{...state.ammo.enemy}};
  const usedTerrain=[...old.usedTerrain],events=[];
  const volleys=state.result.volleys;
  const me=state.moves.player,foe=state.moves.enemy;
  const win=state.result.winner==='attacker'?state.result.opener:state.result.winner==='responder'?state.result.responder:null;
  const suits=suitsOf(me), shot=gotShot(volleys.player), hit=gotShot(volleys.enemy),
    damage=clamp(volleys.player?.damage,0,999), enemyDamage=clamp(volleys.enemy?.damage,0,999);
  const emit=(name,kind,amount)=>{if(amount>0) events.push({name,kind,amount});};
  const deal=(n,name)=>{const value=Math.min(clamp(n,0,15),hp.enemy);hp.enemy-=value;emit(name,'damage',value);};
  const heal=(n,name)=>{const value=Math.min(clamp(n,0,15),Math.max(0,(state.initialHp?.player||hp.player)-hp.player));hp.player+=value;emit(name,'heal',value);};
  const addBoost=(n,name)=>{const value=Math.min(clamp(n,0,8),45-boost.player.energy);boost.player.energy+=value;emit(name,'boost',value);};
  const ammoUp=(n,name)=>{const suit=volleys.player?.suit;if(!SUITS.has(suit))return;const value=clamp(n,0,6);ammo.player[suit]+=value;emit(name,'ammo',value);};
  // I tratti hanno una conseguenza equivalente nel nuovo sistema, anziché
  // usare vecchi bersagli, timer da 60 secondi, bombe o dadi matematici.
  for(const trait of config.traits){
    const type=trait.type,name=`Mazzo · ${type}`;
    const cards=me?.committedCards||[];
    if(['op_boost','op_flat_bonus'].includes(type) && (!me?.boost || !volleys.player?.boostApplied || (trait.op && trait.op!==me.boost.operation)))continue;
    if(type==='suit_damage_boost' && trait.suit && !suits.has(trait.suit))continue;
    if(['cards_count_flat_dmg','high_density_damage','high_density_draw'].includes(type) && cards.length<(trait.minCards||3))continue;
    if(type==='joker_play_dmg' && !cards.some(c=>c?.isJoker||c?.suit==='joker'))continue;
    if(type==='court_card_damage' && !cards.some(c=>[11,12,13].includes(Number(c?.value))))continue;
    if(type==='execute_damage' && hp.enemy>(state.initialHp?.enemy||100)*0.35)continue;
    if(type==='first_try_boost' && state.round>1)continue;
    switch(type){
      case 'starter':case 'planet_char':case 'zodiac':case 'victory_reward_mult':case 'perfect_speed_dust':
      case 'hand_size_bonus':case 'initial_tank_bonus':case 'joker_deck_count':case 'first_extract_free':case 'deck_extract_discount':
      case 'free_exchange_no_self_dmg':case 'exchange_no_enemy_heal':case 'free_exchange_time':
      case 'bypass_anomaly_op':case 'joker_cost_discount':case 'rearm_epic_single':case 'remove_epic_turn_limit':
      case 'infinite_epic_overcharge':case 'capsule_exclusive':case 'copy_enemy_skill':case 'double_epic_potency':
        break; // benefici fuori dallo scambio: nessun doppio accredito.
      default: {
        const group=describePhase15Trait(type);
        if(group==='damage'&&shot&&win==='player') deal(Math.min(4,trait.bonus||trait.amount||2),name);
        else if(group==='recovery'&&(shot||hit))heal(Math.min(4,trait.heal||trait.amount||2),name);
        else if(group==='shield'&&hit)heal(Math.min(4,trait.bonus||trait.amount||2,enemyDamage),name);
        else if(group==='boost'&&shot)addBoost(2,name);
        else if(group==='advanced'&&shot&&suits.size>=3)addBoost(2,name);
      }
    }
  }
  // Ogni carta terreno posseduta ha un solo innesco per battaglia; NON si
  // ripristina alla trasformazione del boss. Il riarmo pagato è rinviato.
  for(const terrain of config.terrains){
    if(usedTerrain.includes(terrain.id))continue;
    const lv=terrain.level,name=`Terreno · ${terrain.name}`,lowHp=hp.player<=Math.max(1,(state.initialHp?.player||hp.player)*0.5);
    let triggered=true;
    switch(terrain.id){
      case 'cryo_stasis': if(hit)heal(2*lv+1,name);else triggered=false;break;
      case 'sub_zero_seal':if(boost.player.energy<15 && shot)addBoost(3*lv,name);else triggered=false;break;
      case 'cryo_absorber':if(hit&&lowHp)heal(4*lv,name);else triggered=false;break;
      case 'frost_bite':if(hit&&enemyDamage>=8)deal(2*lv,name);else triggered=false;break;
      case 'magnetic_valve':if(hit)addBoost(2*lv,name);else triggered=false;break;
      case 'charge_splitter':if(shot)ammoUp(2*lv,name);else triggered=false;break;
      case 'gravimetric_anchor':if(hit)heal(3*lv,name);else triggered=false;break;
      case 'rebound_condenser':if(hit&&shot)deal(2*lv,name);else triggered=false;break;
      case 'frequency_reserve':if(shot)addBoost(2*lv,name);else triggered=false;break;
      case 'tachyon_siphon':if(shot&&boost.enemy.energy>0){const n=Math.min(2*lv,boost.enemy.energy,45-boost.player.energy);boost.enemy.energy-=n;addBoost(n,name);}else triggered=false;break;
      case 'temporal_singularity':if(hit)heal(2*lv,name);else triggered=false;break;
      case 'entropic_filter':if(!me?.score && hit)heal(3*lv,name);else triggered=false;break;
      case 'resonance_lock':if(shot&&me?.score?.cardIds?.length>=4)addBoost(2*lv,name);else triggered=false;break;
      case 'suit_catalyst':if(shot&&suits.size>=3)ammoUp(lv+1,name);else triggered=false;break;
      case 'holographic_prism':if(!shot && !hit)addBoost(2*lv,name);else triggered=false;break;
      case 'spectral_multiplier':if(shot&&suits.size>=2)deal(2*lv,name);else triggered=false;break;
      case 'sign_inverter':if(hit&&!shot)heal(3*lv,name);else triggered=false;break;
      case 'quantum_polarizer':if(shot&&suits.size===1)deal(2*lv,name);else triggered=false;break;
      case 'algebraic_refraction':if(shot&&me?.boost)addBoost(2*lv,name);else triggered=false;break;
      case 'harmonic_matrix':if(shot&&suits.size>=3){heal(2*lv,name);addBoost(lv,name);}else triggered=false;break;
      default:triggered=false;
    }
    if(triggered)usedTerrain.push(terrain.id);
  }
  const winner=hp.player<=0&&hp.enemy<=0?'draw':hp.player<=0?'enemy':hp.enemy<=0?'player':null;
  return {...state,hp,boost,ammo,winner,legacyPassives:{...old,usedTerrain,eventCount:old.eventCount+events.length},
    result:{...state.result,legacyPassivesResolved:true,legacyPassivesLog:events},
    history:[...state.history,...events.map(e=>`${e.name}: ${e.kind} +${e.amount}`)].slice(-20)};
}

/** Gli epici esistenti diventano comandi volontari nella fase Preparazione. */
export function activatePhase15Epic(state,side,id){
  if(!SIDES.includes(side)||state.phase!==TURN_PHASES.PREPARE||state.ready?.[side])throw Error('Epico: attivabile soltanto nella tua preparazione');
  const old=state.legacyPassives;
  if(!old||side!=='player')throw Error('Oggetti epici disponibili solo per equipaggiamento campagna del giocatore');
  const item=old.loadout.epics.find(e=>e.id===id);
  if(!item)throw Error('Oggetto epico non equipaggiato');
  if(old.usedEpic.includes(id))throw Error('Oggetto epico già attivato in questa battaglia');
  const lv=item.level,player={...state.player,hand:[...state.player.hand],deck:[...state.player.deck],discard:[...state.player.discard]};
  const enemy={...state.enemy,hand:[...state.enemy.hand],deck:[...state.enemy.deck],discard:[...state.enemy.discard]};
  const hp={...state.hp},boost={player:{...state.boost.player},enemy:{...state.boost.enemy}};
  let effect='';
  switch(id){
    case 'epic_item_1': { // sostituisce carte basse con pescate reali
      const n=Math.min(lv+1,player.hand.length,player.deck.length);
      if(!n)throw Error('Servono carte nel mazzo per il portale');
      const cards=player.hand.splice(-n);player.discard.push(...cards);player.hand.push(...player.deck.splice(0,n));
      effect=`${n} carte rinnovate`;break;
    }
    case 'epic_item_2': { // ricombina energia residua senza inventare carte
      const n=Math.min(player.discard.length,lv+1);if(!n)throw Error('Servono scarti per la fusione');
      player.deck.push(...player.discard.splice(0,n));boost.player.energy=clamp(boost.player.energy+n*3,0,45);
      effect=`${n} scarti nel mazzo e +${n*3} Boost`;break;
    }
    case 'epic_item_3':boost.player.target=clamp(boost.player.target-(lv+1),2,20);effect='Obiettivo Boost semplificato';break;
    case 'epic_item_4':boost.enemy.energy=Math.max(0,boost.enemy.energy-(5+lv*4));effect='Interferenza energia avversaria';break;
    case 'epic_item_5':boost.player.energy=clamp(boost.player.energy+lv*5,0,45);effect='Carica gravimetrica';break;
    case 'epic_item_6':hp.player=Math.min(state.initialHp.player,hp.player+(lv*4));effect='Recupero HP da entropia';break;
    case 'epic_item_7':hp.player=Math.min(state.initialHp.player,hp.player+(lv*5));effect='Barriera a riflessione (cura anticipata)';break;
    case 'epic_item_8':{const drain=Math.min(boost.enemy.energy,lv*5);boost.enemy.energy-=drain;boost.player.energy=clamp(boost.player.energy+drain,0,45);effect=`Sifonati ${drain} Boost`;break;}
    case 'epic_item_9':{const n=Math.min(player.discard.length,lv+1);if(!n)throw Error('Nessuno scarto da rimettere nel mazzo');player.deck.push(...player.discard.splice(0,n));effect=`Recuperate ${n} carte dagli scarti`;break;}
    case 'epic_item_10':{const n=Math.min(7-player.hand.length,player.deck.length,lv+1);if(n<=0)throw Error('Mano già piena o mazzo esaurito');player.hand.push(...player.deck.splice(0,n));effect=`Pesca immediata di ${n} carte`;break;}
    default:throw Error('Oggetto epico sconosciuto');
  }
  return {...state,player,enemy,hp,boost,legacyPassives:{...old,usedEpic:[...old.usedEpic,id]},
    history:[...state.history,`EPICO · ${item.name}: ${effect}`].slice(-20)};
}

/** Preparazione: passivi di costo pagati sulla riserva vera del duello. */
export function getPhase15EtherCost(state,side='player') {
  if(side!=='player'||!state.legacyPassives)return PHASE6_ETHER_COST;
  const traits=state.legacyPassives.loadout.traits;
  if(traits.some(t=>t.type==='first_extract_free') && (state.preparation?.statistics?.player?.etherExtracts||0)===0) return 0;
  const costs=traits.filter(t=>t.type==='deck_extract_discount' && Number.isInteger(t.cost)).map(t=>clamp(t.cost,0,PHASE6_ETHER_COST));
  return costs.length?Math.min(PHASE6_ETHER_COST,...costs):PHASE6_ETHER_COST;
}
export function extractPhase15WithEther(state,side,handIndex,deckIndex) {
  const next=extractPhase6WithEther(state,side,handIndex,deckIndex,getPhase15EtherCost(state,side));
  if(side!=='player')return next;
  const trait=state.legacyPassives?.loadout.traits.find(t=>t.type==='ether_spend_heal');
  if(!trait)return next;
  const max=state.initialHp?.player||state.hp.player;
  const restored=Math.min(Math.ceil(max*(Number(trait.healPct)||0)),Math.max(0,max-next.hp.player));
  return {...next,hp:{...next.hp,player:next.hp.player+restored},
    history:[...next.history,`Passivo Etere: +${restored} HP`].slice(-20)};
}
/** Ripristina il limite permanente di 8/9 carte dopo la preparazione. */
export function restorePhase15Hand(next){
  if(next.phase!==TURN_PHASES.ATTACK||!next.legacyPassives)return next;
  const limit=clamp(next.legacyPassives.loadout.traits.find(t=>t.type==='hand_size_bonus')?.size||7,7,9);
  if(limit<=7)return next;
  const player={...next.player,hand:[...next.player.hand],deck:[...next.player.deck],discard:[...next.player.discard]};
  while(player.hand.length<limit){
    if(!player.deck.length&&player.discard.length){player.deck=[...player.discard].reverse();player.discard=[];}
    if(!player.deck.length)break;
    player.hand.push(player.deck.shift());
  }
  return {...next,player};
}
export function markPhase15Ready(state,side){
  return restorePhase15Hand(markPhase6Ready(state,side));
}
export function exchangePhase15Cards(state,side,indices) {
  const traits=side==='player'?state.legacyPassives?.loadout?.traits||[]:[];
  const has=type=>traits.some(t=>t.type===type);
  const pendulumFree=side==='player'&&state.phase16C?.pendulum?.active;
  const moduleFree=Boolean(state.phase16F?.[side]?.freeSwap);
  const next=exchangePhase6Cards(state,side,indices,{
    noEnemyHeal:pendulumFree||moduleFree||has('exchange_no_enemy_heal'),noTimeLoss:pendulumFree||moduleFree||has('free_exchange_time'),
    noSelfDamage:pendulumFree||moduleFree||has('free_exchange_no_self_dmg')
  });
  const healTrait=traits.find(t=>t.type==='exchange_heal_pct');
  if(!healTrait)return next;
  const max=state.initialHp?.[side]||state.hp?.[side]||0;
  const amount=Math.min(Math.ceil(max*Number(healTrait.bonusPct||0)),Math.max(0,max-next.hp[side]));
  return {...next,hp:{...next.hp,[side]:next.hp[side]+amount},
    history:[...next.history,`Passivo scambio: +${amount} HP`].slice(-20)};
}
/** Un solo riarmo per carta a battaglia: addebito tracciato come Etere speso. */
export function rearmPhase15Terrain(state,side,id){
  if(side!=='player'||state.phase!==TURN_PHASES.PREPARE||state.ready?.player)throw Error('Riarmo disponibile solo durante la preparazione');
  const old=state.legacyPassives,item=old?.loadout.terrains.find(t=>t.id===id);
  if(!item)throw Error('Terreno non equipaggiato');
  if(item.level<2||item.rearmCost<1)throw Error('Questo livello Terreno non può essere riarmato');
  if(!old.usedTerrain.includes(id))throw Error('Terreno non ancora consumato');
  if(old.rearmedTerrains.includes(id))throw Error('Terreno già riarmato una volta');
  if(state.player.ether<item.rearmCost)throw Error('Etere insufficiente al riarmo');
  const stats=state.preparation.statistics.player;
  return {...state,player:{...state.player,ether:state.player.ether-item.rearmCost},
    preparation:{...state.preparation,statistics:{...state.preparation.statistics,
      player:{...stats,etherSpent:(stats.etherSpent||0)+item.rearmCost}}},
    legacyPassives:{...old,usedTerrain:old.usedTerrain.filter(v=>v!==id),
      rearmedTerrains:[...old.rearmedTerrains,id]},
    history:[...state.history,`TERRENO · ${item.name} riarmato (-${item.rearmCost} Etere)`].slice(-20)};
}
