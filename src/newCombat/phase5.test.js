import test from 'node:test';
import assert from 'node:assert/strict';
import { TURN_PHASES } from './config.js';
import { markPhase3Ready } from './phase3Engine.js';
import { finishPhase5Animation } from './phase5Engine.js';
import { createPhase5Duel, commitPhase5Move, resolvePhase5Boost, getBoostCalculationSuggestions, getPhase5CandidateMove, nextBoostTarget, BOOST_ENERGY_CAP } from './phase5Engine.js';
import { checkBoostCalculation } from './phase5Engine.js';
const c=(v,s='hearts',id=`${v}-${s}`)=>({id,value:v,suit:s});
const hand=(pair=9)=>[c(pair,'spades'),c(pair,'hearts'),c(2,'clubs'),c(4,'diamonds'),c(5,'hearts'),c(10,'clubs'),c(3,'diamonds')];
const enemy=[c(8,'spades','es8'),c(8,'clubs','ec8'),c(3,'hearts','eh3'),c(4,'diamonds','ed4'),c(6,'spades','es6'),c(10,'hearts','eh10'),c(12,'clubs','ec12')];
const setup=(o={})=>createPhase5Duel({playerHand:hand(),enemyHand:enemy,playerBoostEnergy:31,playerBoostTarget:15,...o});
const put4=(cards,slots=[0,1,2,3])=>slots.map((slot,i)=>({slot,card:cards[i]}));
const pBoost=(cost=30,op='+',cards=hand())=>({cost,operation:op,cardIds:[cards[4].id,cards[5].id]});
const response=()=>put4(enemy,[0,1,4,3]);
test('Serbatoi indipendenti con soglia massima 45; bersaglio persistente',()=>{
 const s=setup({playerBoostEnergy:83,enemyBoostEnergy:-12});
 assert.equal(BOOST_ENERGY_CAP,45);
 assert.equal(s.boost.player.energy,45);
 assert.equal(s.boost.enemy.energy,0);
 assert.equal(s.boost.player.target,15);
 assert.equal(nextBoostTarget(15,2,'player')!==15,true);
});
test('Vittoria Poker: Boost +50%, due carte consumate, 1 energia rimasta, nuovo bersaglio',()=>{
 let s=setup();
 s=commitPhase5Move(s,'player',put4(hand()),false,'es_common_light_01',pBoost());
 assert.equal(s.boost.player.energy,31,'energia non anticipata prima della risposta');
 s=commitPhase5Move(s,'enemy',response());
 assert.equal(s.phase,TURN_PHASES.ANIMATE);
 assert.equal(s.result.winner,'attacker');
 assert.equal(s.result.volleys.player.shots,4);
 assert.equal(s.result.volleys.player.boostDamage,4);
 assert.equal(s.result.volleys.player.damage,12);
 assert.equal(s.hp.enemy,108);
 assert.equal(s.boost.player.energy,1);
 assert.notEqual(s.boost.player.target,15);
 assert.equal(s.player.hand.some(x=>x.id===hand()[4].id),false);
 assert.equal(s.player.discard.filter(x=>[hand()[4].id,hand()[5].id].includes(x.id)).length,2);
 assert.equal(s.ammo.player.spades,5);
 assert.equal(s.result.boostEnergySpent.player,30);
 assert.equal(s.result.boostEnergyGained.player,0);
});
test('Se perdi, Boost richiesto NON spende risorse e accumuli i valori delle tue carte sconfitte',()=>{
 const lower=hand(7);
 let s=setup({playerHand:lower});
 s=commitPhase5Move(s,'player',put4(lower),false,'es_common_light_01',pBoost(30,'+',lower));
 s=commitPhase5Move(s,'enemy',response());
 assert.equal(s.result.winner,'responder');
 assert.equal(s.result.volleys.player.damage,4,'solo danno base al 50%');
 assert.equal(s.result.volleys.player.boostStatus.startsWith('NON ATTIVATO'),true);
 assert.equal(s.boost.player.energy,45,'31 + 14 limitati a 45');
 assert.equal(s.boost.player.target,15);
 assert.equal(s.player.hand.some(x=>x.id===lower[4].id),true);
 assert.equal(s.result.boostEnergyGained.player,14);
 assert.equal(s.result.boostEnergySpent.player,0);
});
test('Parità: nessuno guadagna energia e nessuno consuma Boost',()=>{
 const eq=[c(9,'spades','esp9'),c(9,'clubs','ecl9'),...enemy.slice(2)];
 let s=setup({enemyHand:eq});
 s=commitPhase5Move(s,'player',put4(hand()),false,'es_common_light_01',pBoost());
 s=commitPhase5Move(s,'enemy',put4(eq,[0,1,4,3]));
 assert.equal(s.result.winner,null);
 assert.equal(s.boost.player.energy,31);
 assert.equal(s.boost.enemy.energy,0);
 assert.equal(s.result.volleys.player.boostDamage,0);
});
test('Passare non crea energia e il colpo senza risposta può attivare Boost',()=>{
 let s=setup();
 s=commitPhase5Move(s,'player',put4(hand()),false,'es_common_light_01',pBoost(15));
 s=commitPhase5Move(s,'enemy',[],true);
 assert.equal(s.boost.player.energy,16);
 assert.equal(s.hp.enemy,110,'8 + 25% = 10');
 assert.equal(s.result.boostEnergyGained.enemy,0);
 assert.throws(()=>commitPhase5Move(setup(),'player',[],true,null,pBoost()),/passando/);
});
test('Divisione esatta: bonus operazione +15%, sommato alla soglia +25%',()=>{
 const h=[c(9,'spades'),c(9,'hearts'),c(2,'clubs'),c(4,'diamonds'),c(12,'hearts'),c(2,'spades','div2'),c(3,'diamonds')];
 let s=setup({playerHand:h,playerBoostEnergy:17,playerBoostTarget:6});
 s=commitPhase5Move(s,'player',put4(h),false,'es_common_light_01',{cost:15,operation:'/',cardIds:[h[4].id,h[5].id]});
 s=commitPhase5Move(s,'enemy',[],true);
 assert.equal(s.result.volleys.player.boostPercent,40);
 assert.equal(s.result.volleys.player.boostDamage,3,'round(8 * 0.40)');
 assert.equal(s.boost.player.energy,2);
 assert.equal(s.result.volleys.player.damage,11);
});
test('30 energetici disponibili: soglia 15 e residuo 14 se ne hai 29',()=>{
 let s=setup({playerBoostEnergy:29});
 s=commitPhase5Move(s,'player',put4(hand()),false,'es_common_light_01',pBoost(15));
 s=commitPhase5Move(s,'enemy',[],true);
 assert.equal(s.boost.player.energy,14);
 assert.equal(s.result.volleys.player.boostPercent,25);
});
test('Validazione: combinazione errata, energia insufficiente, carte del banco, doppio ID',()=>{
 const h=hand();const places=put4(h);
 const before=setup({playerBoostEnergy:17});
 const snapshot=JSON.stringify(before);
 const call=choice=>commitPhase5Move(before,'player',places,false,'es_common_light_01',choice);
 assert.throws(()=>call(pBoost(30)),/Energia/);
 assert.throws(()=>call({cost:15,operation:'*',cardIds:[h[4].id,h[5].id]}),/Calcolo/);
 assert.throws(()=>call({cost:15,operation:'+',cardIds:[h[0].id,h[5].id]}),/fuori dal banco/);
 assert.throws(()=>call({cost:15,operation:'+',cardIds:[h[4].id,h[4].id]}),/diverse/);
 assert.throws(()=>call({cost:15,operation:'+',cardIds:['fake',h[5].id]}),/non disponibile/);
 assert.equal(JSON.stringify(before),snapshot,'nessuna mutazione su fallimento');
});
test('Risoluzione idempotente e valori carta reali: Re vale 13, Jolly non trasformato zero',()=>{
 const kings=[c(13,'spades'),c(13,'clubs'),c(2,'hearts'),c(3,'diamonds')];
 let s=setup({playerHand:kings,playerBoostEnergy:0});
 s=commitPhase5Move(s,'player',put4(kings));
 s=commitPhase5Move(s,'enemy',response());
 assert.equal(s.result.boostEnergyGained.enemy,16,'perde una coppia di 8');
 const str=JSON.stringify(s);
 assert.equal(JSON.stringify(resolvePhase5Boost(s)),str);
});
test('Calcolo: niente arrotondamenti in divisione, due carte reali, niente jolly non trasformato',()=>{
 assert.equal(checkBoostCalculation(c(10),c(3), '/', 3),false);
 assert.equal(checkBoostCalculation(c(12),c(2), '/', 6),true);
 assert.equal(checkBoostCalculation(c(6),c(3),'-',3),true);
 assert.equal(checkBoostCalculation({id:'joker1',isJoker:true,value:6},c(1),'+',7),false);
 assert.deepEqual(getBoostCalculationSuggestions([c(10),c(5),c(2)],[c(5).id],12).map(s=>s.operation),['+']);
});
test('AI usa le regole comuni e propone Boost soltanto quando possibile',()=>{
 const s=setup({enemyBoostEnergy:30,enemyBoostTarget:11});
 const orig=JSON.stringify(s);
 const proposal=getPhase5CandidateMove(s,'player',130);
 assert.ok(proposal);
 assert.equal(JSON.stringify(s),orig);
 if(proposal.boost) assert.equal(proposal.boost.cost,30);
});

test('Risposta del giocatore: il Boost si applica anche quando vince chi risponde',()=>{
  let s=setup({opener:'enemy'});
  s=commitPhase5Move(s,'enemy',put4(enemy));
  const playerPlacement=put4(hand(),[0,1,4,3]);
  const suggestion={cost:15,operation:'+',cardIds:[hand()[4].id,hand()[5].id]};
  s=commitPhase5Move(s,'player',playerPlacement,false,'es_common_light_01',suggestion);
  assert.equal(s.result.winner,'responder');
  assert.equal(s.result.volleys.player.boostApplied,true);
  assert.equal(s.result.volleys.player.boostDamage,2);
  assert.equal(s.hp.enemy,110);
  assert.equal(s.boost.player.energy,16);
  assert.equal(s.result.nextOpener,'player');
});
test('Bersaglio immutato attraverso animazione, preparazione e turno successivo senza Boost',()=>{
 let s=setup({playerBoostEnergy:0});
 s=commitPhase5Move(s,'player',put4(hand()),false,'es_common_light_01');
 s=commitPhase5Move(s,'enemy',[],true);
 assert.equal(s.boost.player.target,15);
 s=finishPhase5Animation(s);
 assert.equal(s.phase,TURN_PHASES.PREPARE);
 s=markPhase3Ready(s,'player');
 s=markPhase3Ready(s,'enemy');
 assert.equal(s.phase,TURN_PHASES.ATTACK);
 assert.equal(s.round,2);
 assert.equal(s.boost.player.target,15);
 assert.equal(s.boost.player.energy,0);
 assert.equal(s.result,null);
});
test('Nessun Boost se nella mano restano meno di due carte valide',()=>{
 const h=[c(9,'spades'),c(9,'hearts'),c(2,'clubs'),c(4,'diamonds')];
 const s=setup({playerHand:h,playerBoostEnergy:45});
 assert.deepEqual(getBoostCalculationSuggestions(h,h.map(c=>c.id),15),[]);
 assert.throws(()=>commitPhase5Move(s,'player',put4(h),false,'es_common_light_01',
   {cost:45,operation:'+',cardIds:[h[0].id,h[1].id]}),/fuori dal banco/);
});
