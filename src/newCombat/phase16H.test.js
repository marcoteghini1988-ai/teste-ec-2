import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHASE16H_TERRAIN_IDS,PHASE16H_TERRAINS,getPhase16HTerrainOffers,describePhase16HTerrain,
 PHASE16H_CHALLENGES,getPhase16HSectorChallenge,PHASE16H_DAILY_BOUNTIES,
 selectPhase16HDailyBounties,migratePhase16HDailyBounties,getPhase16HBountyProgress} from './phase16HProgression.js';

const allTerrains=[...PHASE16H_TERRAIN_IDS.map(id=>({id})),{id:'frost_bite'},{id:'spectral_multiplier'}];
test('16H: otto Terreni principali unici, con descrizioni coerenti al Poker',()=>{
 assert.equal(PHASE16H_TERRAIN_IDS.length,8);
 assert.equal(new Set(PHASE16H_TERRAIN_IDS).size,8);
 assert(Object.values(PHASE16H_TERRAINS).every(t=>t.description&&t.description.length>30));
 assert.equal(getPhase16HTerrainOffers(allTerrains).length,8);
 assert.equal(describePhase16HTerrain('frost_bite'),null);
 assert(describePhase16HTerrain('resonance_lock',2).includes('riarmo'));
});
test('16H: una Carta Terreno storica già comprata o equipaggiata resta visibile',()=>{
 const got=getPhase16HTerrainOffers(allTerrains,{frost_bite:{unlocked:true}},['spectral_multiplier']);
 assert.equal(got.length,10);
 assert(got.some(x=>x.id==='frost_bite'));
 assert(got.some(x=>x.id==='spectral_multiplier'));
 assert.equal(getPhase16HTerrainOffers(allTerrains,{frost_bite:{unlocked:false}}).length,8);
});
test('16H: 120 settori con obiettivi realizzabili dal Poker e no vecchi operatori',()=>{
 for(const planet of [1,2,3,6,7,8,9,11,14,17,19,20]) for(let sector=1;sector<=10;sector++){
  const challenge=getPhase16HSectorChallenge(planet,sector);
  assert(challenge?.id&&challenge?.desc&&typeof challenge?.check==='function');
  assert(!/\[\/\]|45 secondi|75 secondi/.test(challenge.desc));
 }
 assert.equal(getPhase16HSectorChallenge(1,10).id,'boss_mastery');
 assert.equal(getPhase16HSectorChallenge(4,1).id,getPhase16HSectorChallenge(3,1).id);
});
test('16H: obiettivi prima del primo boss non impongono abilità ancora bloccate',()=>{
 for(let n=1;n<=9;n++)assert(!['module_used','boost_strike'].includes(getPhase16HSectorChallenge(1,n).id));
});
test('16H: una sfida Poker non si completa con un campo telemetria mancante',()=>{
 for(const c of PHASE16H_CHALLENGES.filter(c=>c.id!=='no_exchange'))assert.equal(c.check({}),false,c.id);
 assert.equal(getPhase16HSectorChallenge(20,10).check({validPokerCombos:2}),false);
 assert.equal(getPhase16HSectorChallenge(20,10).check({validPokerCombos:3}),true);
});
test('16H: contratti giornalieri deterministici e fondati su statistiche vere',()=>{
 const a=selectPhase16HDailyBounties('2026-10-15'),b=selectPhase16HDailyBounties('2026-10-15');
 assert.deepEqual(a,b);assert.equal(a.length,3);
 assert.equal(new Set(a.map(x=>x.id)).size,3);
 assert(PHASE16H_DAILY_BOUNTIES.every(x=>x.target>0 && x.reward && !['op_div','fast_strike'].includes(x.type)));
 assert.equal(getPhase16HBountyProgress('poker_valid',{validPokerCombos:2}),2);
 assert.equal(getPhase16HBountyProgress('counter_wins',{winningResponses:1}),1);
 assert.equal(getPhase16HBountyProgress('weapon_damage',{weaponDamage:50}),50);
 assert.equal(getPhase16HBountyProgress('card_swaps',{exchangesUsed:2}),2);
 assert.equal(getPhase16HBountyProgress('poker_valid',{}),0);
});
test('16H: migrano i vecchi contratti senza azzerare progresso o premi riscattati',()=>{
 const old={date:'2026-10-15',allCompletedClaimed:true,bounties:[
  {id:'bounty_div',type:'op_div',target:3,progress:2,completed:false,claimed:false},
  {id:'bounty_fast',type:'fast_strike',target:2,progress:2,completed:true,claimed:true},
  {id:'bounty_hearts',type:'suit_hearts',target:8,progress:5,completed:false,claimed:false}
 ]};
 const migrated=migratePhase16HDailyBounties(old);
 assert.equal(migrated.bounties[0].id,'bounty_poker');assert.equal(migrated.bounties[0].progress,2);
 assert.equal(migrated.bounties[1].id,'bounty_counter');assert.equal(migrated.bounties[1].claimed,true);
 assert.equal(migrated.bounties[2].progress,5);
 assert.equal(migrated.allCompletedClaimed,true);
 assert.equal(old.bounties[0].id,'bounty_div');
});
test('16H: registrazione della telemetria e liquidazione restano in un punto solo',()=>{
 const preview=readFileSync(new URL('../NewCombatPhase3Preview.jsx',import.meta.url),'utf8');
 const campaign=readFileSync(new URL('./phase13Campaign.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 for(const field of ['validPokerCombos','winningResponses','multiSuitShots','boostActivations','weaponDamage']){
  assert(preview.includes(`stats.${field}`),field);assert(campaign.includes(`${field}:`),field);
 }
 assert(app.includes('const added = getPhase16HBountyProgress'));
 assert(app.includes('phase13SettlementGuard.current.claim'));
});
