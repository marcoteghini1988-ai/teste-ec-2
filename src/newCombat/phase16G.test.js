import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase6Duel} from './phase6Engine.js';
import {TURN_PHASES} from './config.js';
import {PHASE16G_PILOTS,PHASE16G_MAIN_IDS,initializePhase16G,resolvePhase16GPilotExchange,getPhase16GPilotDescription} from './phase16GPilots.js';
import {createPhase12CampaignTactics,resolvePhase12CampaignExchange} from './phase12CampaignAbilities.js';
import {PHASE16A_CONTENT} from './phase16ACatalog.js';
const c=(id,suit,isJoker=false)=>({id,suit,value:9,isJoker});
function battle(id,{
 winner='attacker',opener='player',responder='enemy',pShot=10,eShot=5,
 pCards=[c('a','hearts'),c('b','diamonds')],eCards=[c('e','spades'),c('f','clubs')],
 pattern='one_pair',pHP=55,eHP=60,round=2,pClass='medium',state=null
}={}){
 const initial=state||createPhase6Duel({playerHp:100,enemyHp:100});
 const ars={light:'test-light',medium:'test-medium',heavy:'test-heavy'};
 const out={...initial,arsenal:{...initial.arsenal,player:ars},phase:TURN_PHASES.ANIMATE,round,
  hp:{player:pHP,enemy:eHP},initialHp:{player:100,enemy:100},
  campaignTactics:createPhase12CampaignTactics({playerPilotId:id,playerPilotLevel:3,enemyPilotId:'pilot_sentinel_1',planet:1,sector:1}),
  moves:{player:{score:pattern?{patternId:pattern}:null,committedCards:pCards},enemy:{score:{patternId:'one_pair'},committedCards:eCards}},
  result:{opener,responder,winner,volleys:{player:{weaponId:ars[pClass],damage:pShot,shots:pShot?2:0,suit:'hearts'},enemy:{weaponId:'other',damage:eShot,shots:eShot?2:0,suit:'spades'}}}
 };
 return state ? out : initializePhase16G(out);
}
const resolve=state=>resolvePhase16GPilotExchange(state);
const effects=state=>state.result.phase16GPilotEffects;
const baseCase={
 pilot_com_1:{winner:'responder'},pilot_com_2:{winner:'responder',opener:'enemy',responder:'player'},
 pilot_com_3:{},pilot_com_4:{},pilot_rare_1:{winner:'attacker',opener:'enemy',responder:'player'},
 pilot_rare_2:{pHP:34},pilot_rare_3:{pCards:[c('j','joker',true),c('h','hearts')]},
 pilot_rare_4:{winner:'tie'},pilot_epic_1:{winner:'responder',opener:'enemy',responder:'player'},
 pilot_epic_2:{pCards:[c('h','hearts'),c('d','diamonds'),c('s','spades')]},
 pilot_epic_3:{winner:'responder',pCards:[c('a','hearts'),c('b','diamonds'),c('d','clubs'),c('f','spades')],pattern:'straight_4'},
 pilot_epic_4:{pCards:[c('a','hearts'),c('b','hearts')],eCards:[c('a','clubs'),c('b','clubs')]},
 pilot_leg_1:{},pilot_leg_2:{winner:'responder',opener:'enemy',responder:'player'},
 pilot_leg_3:{},pilot_leg_4:{}
};
test('16G: esattamente 16 piloti principali (4 per rarità), senza cambiare ID originali',()=>{
 assert.deepEqual(PHASE16G_MAIN_IDS,PHASE16A_CONTENT.pilotIds);
 assert.equal(PHASE16G_MAIN_IDS.length,16);
 assert.equal(new Set(Object.values(PHASE16G_PILOTS).map(p=>p.condition)).size,16);
 for(const id of PHASE16G_MAIN_IDS)assert(getPhase16GPilotDescription(id)?.length>15);
 assert.equal(getPhase16GPilotDescription('pilot_boss_1'),null);
});
test('16G: abilità comuni, rare, epiche — condizioni realmente distinte',()=>{
 for(const [id,options] of Object.entries(baseCase).slice(0,12)){
  let s=battle(id,options);
  if(id==='pilot_com_3')s.phase16G.player.previousSuit='spades';
  if(id==='pilot_epic_1')s.phase16G.player.previousHit=true;
  const before={hp:s.hp.player,boost:s.boost.player.energy,ammo:s.ammo.player.hearts,ether:s.player.ether};
  const a=resolve(s);
  assert(effects(a).some(e=>e.side==='player'),`${id} deve produrre almeno un effetto utile`);
  assert(a.hp.player>=before.hp,`${id} non deve provocare autodanno`);
  assert.deepEqual(a.moves,s.moves,`${id}: le carte Poker devono restare immutate`);
  assert.equal(a.result.winner,s.result.winner,`${id}: Poker invariato`);
  assert.strictEqual(resolve(a),a,`${id}: un solo accredito per confronto`);
 }
});
test('16G: i leggendari richiedono una progressione reale, nessun regalo al primo colpo',()=>{
 for(const id of PHASE16G_MAIN_IDS.slice(12)){
  let s=battle(id,baseCase[id]);
  let a=resolve(s);
  assert.equal(effects(a).filter(e=>e.side==='player').length,0,id);
  if(id==='pilot_leg_1'){
   s=battle(id,{round:3,pattern:'three_of_a_kind',state:a});a=resolve(s);
   s=battle(id,{round:4,pattern:'straight_4',state:a});a=resolve(s);
  }else if(id==='pilot_leg_2'){
   s=battle(id,{...baseCase[id],round:3,state:a});a=resolve(s);
  }else if(id==='pilot_leg_3'){
   s=battle(id,{round:3,pClass:'light',state:a});a=resolve(s);
   s=battle(id,{round:4,pClass:'heavy',state:a});a=resolve(s);
  }else{
   s=battle(id,{round:3,state:a});a=resolve(s);
  }
  assert(effects(a).some(e=>e.side==='player'),`${id}: premiata la progressione richiesta`);
 }
});
test('16G: condizioni non soddisfatte non danno bonus; senza combattimento non succede nulla',()=>{
 assert.equal(effects(resolve(battle('pilot_com_1',{winner:'attacker'}))).length,0);
 assert.equal(effects(resolve(battle('pilot_rare_3',{pCards:[c('h','hearts'),c('d','diamonds')]}))).length,0);
 const b=battle('pilot_com_4');const p=resolve({...b,phase:TURN_PHASES.PREPARE});assert.strictEqual(p.phase16G,b.phase16G);
});
test('16G: integrazione con la Fase 12 non raddoppia il vecchio bonus pilota',()=>{
 const b=battle('pilot_com_1',{winner:'responder',pHP:80});
 const a=resolvePhase12CampaignExchange(b);
 assert(a.result.campaignAbilitiesResolved);
 assert(a.result.phase16GResolved);
 assert(a.result.phase16GPilotEffects.some(e=>e.description.includes('Ripresa')));
 assert.equal(a.result.campaignEffects.filter(e=>e.side==='player').length,0,'rimosso il bonus generico del pilota principale');
 assert.strictEqual(resolvePhase12CampaignExchange(a),a);
 const legacy=battle('pilot_boss_3');
 const old=resolvePhase12CampaignExchange(legacy);
 assert(old.result.campaignEffects.some(e=>e.description.includes('Tossina')),'le ricompense storiche conservano i poteri 12');
 assert.equal(old.result.phase16GPilotEffects.length,0);
});
test('16G: niente competenze nei vecchi motori privi della fase 16G',()=>{
 const b=battle('pilot_com_1');const {phase16G, ...without}=b;
 assert.strictEqual(resolvePhase16GPilotExchange(without),without);
});
