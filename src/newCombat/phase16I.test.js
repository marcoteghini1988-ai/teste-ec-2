import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPhase13Environment} from './phase13Campaign.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {createPhase6Duel} from './phase6Engine.js';
import {initializePhase13CampaignState} from './phase13Campaign.js';
import {initializePhase15} from './phase15LegacyPassives.js';
import {initializePhase16B,commitPhase16BMove,finishPhase16BAnimation,markPhase16BReady} from './phase16BCombat.js';
import {initializePhase16C} from './phase16CEpics.js';
import {initializePhase16E} from './phase16EDecks.js';
import {initializePhase16F} from './phase16FModules.js';
import {initializePhase16G} from './phase16GPilots.js';
import {defaultPhase4Loadout} from './phase4Weapons.js';
import {TURN_PHASES} from './config.js';
const c=(id,value,suit)=>({id,value,suit,displayVal:String(value)});
const hand1=[c('p1',9,'hearts'),c('p2',9,'diamonds'),c('p3',3,'spades'),c('p4',4,'clubs'),c('p5',5,'hearts'),c('p6',6,'clubs'),c('p7',7,'spades')];
const hand2=[c('e1',8,'hearts'),c('e2',8,'diamonds'),c('e3',2,'spades'),c('e4',4,'clubs'),c('e5',5,'hearts'),c('e6',6,'clubs'),c('e7',7,'spades')];
function start(planet=1,sector=6){
 const duel=createPhase6Duel({playerHand:hand1,enemyHand:hand2,playerDeck:[c('d1',10,'clubs'),c('d2',11,'spades'),c('d3',12,'diamonds')],enemyDeck:[c('d4',10,'hearts')],playerAmmo:{hearts:80,diamonds:80,clubs:80,spades:80},enemyAmmo:{hearts:80,diamonds:80,clubs:80,spades:80},playerHp:100,enemyHp:100});
 const full=initializePhase13CampaignState({...duel,campaignSession:{planet,sector}},{planet,sector});
 return initializePhase16G(initializePhase16F(initializePhase16E(initializePhase16C(initializePhase16B(initializePhase15(full,{deckId:'planet_char_1',deckLevel:1}))))));
}
test('16I: ordine reale dei dodici pianeti governa le soglie senza alterare ID storici',()=>{
 for(let i=0;i<PHASE16A_CAMPAIGN_PLANETS.length;i++){
  const {id}=PHASE16A_CAMPAIGN_PLANETS[i];
  const env=createPhase13Environment({planet:id,sector:1});
  assert.equal(env.globalSector,i*10+1,`pianeta ${id}`);
 }
 assert.equal(createPhase13Environment({planet:2,sector:4}).globalSector,14);
 assert.equal(createPhase13Environment({planet:6,sector:1}).globalSector,31);
 assert.equal(createPhase13Environment({planet:20,sector:10}).globalSector,120);
 assert.equal(createPhase13Environment({planet:1,sector:6}).anomaly,'normal');
});
test('16I: sblocchi di campagna e interfaccia usano gli indici nuovi',()=>{
 const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
 assert(app.includes('const currentGlobalSectorNum = (getCampaignPlanetIndex(currentAdvPlanet) - 1) * 10 + currentAdvLevel;'));
 assert(!app.includes('const globalSector = (currentAdvPlanet - 1) * 10 + currentAdvLevel;'));
});
test('16I: catena completa di sistemi di battaglia e doppio turno senza creare nuovi premi',()=>{
 let s=start();
 for(const key of ['phase16B','phase16C','phase16E','phase16F','phase16G','legacyPassives'])assert(s[key],key);
 assert.equal(s.board.length,5);
 s=commitPhase16BMove(s,'player',hand1.slice(0,4).map((card,slot)=>({slot,card})),false,defaultPhase4Loadout().light);
 assert.equal(s.phase,TURN_PHASES.RESPONSE);
 s=commitPhase16BMove(s,'enemy',hand2.slice(0,4).map((card,i)=>({slot:[0,1,4,2][i],card})),false,defaultPhase4Loadout().light);
 assert.equal(s.phase,TURN_PHASES.ANIMATE);
 assert(s.result?.volleys);
 const earnings={...s.phase16B.earnings};
 s=finishPhase16BAnimation(s);
 assert.equal(s.phase,TURN_PHASES.PREPARE);
 assert.deepEqual(s.phase16B.earnings,earnings);
 s=markPhase16BReady(s,'player');
 s=markPhase16BReady(s,'enemy');
 assert([TURN_PHASES.ATTACK,TURN_PHASES.RESPONSE].includes(s.phase));
 assert.equal(s.board.length,5);
});
