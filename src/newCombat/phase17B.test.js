import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {phase17GlobalSector,phase17Features,phase17ExpectedPilotLevel,phase17PilotHp,phase17EnemyHp,
  phase17CampaignXpAward,phase17CampaignDustAward,F17_TOTAL_XP_TO_100,phase17EnemyLoadout,
  phase17EnemyWeaponLevels,phase17PlayerBattleLoadout,phase17PlayerWeaponLevels,phase17StartingAmmo} from './phase17Balance.js';
import {PHASE16A_CAMPAIGN_PLANETS} from './phase16ACatalog.js';
import {createPhase7Armory,normalizePhase7Armory,buyPhase7Weapon,upgradePhase7Weapon,equipPhase7Weapon} from './phase7Armory.js';
import {createPhase6Duel} from './phase6Engine.js';
import {getPhase4Profile,getPhase4WeaponOptions} from './phase4Weapons.js';
import {getWeaponDefinition} from './weaponCatalog.js';
import {setPhase4EquippedWeapon} from './phase4Engine.js';

const sectorAt=s=>({planet:PHASE16A_CAMPAIGN_PLANETS[Math.floor((s-1)/10)].id,sector:(s-1)%10+1});
test('17B: 120 settori, 12 id storici, XP totale per raggiungere massimo pilota',()=>{
  let xp=0,previous=0;
  for(let s=1;s<=120;s++){
    const {planet,sector}=sectorAt(s);
    assert.equal(phase17GlobalSector(planet,sector),s);
    const award=phase17CampaignXpAward(planet,sector);
    assert.ok(award>0);
    xp+=award;
    assert.ok(phase17ExpectedPilotLevel(s)>=previous);
    previous=phase17ExpectedPilotLevel(s);
  }
  assert.equal(xp,F17_TOTAL_XP_TO_100);
  assert.equal(phase17ExpectedPilotLevel(120),100);
  assert.equal(phase17ExpectedPilotLevel(0),1);
});
test('17B: HP crescenti senza salti dovuti agli ID planetari, boss singola barra',()=>{
  assert.equal(phase17PilotHp(1),50);
  assert.equal(phase17PilotHp(100),400); // F17C: massimo mantenuto, salve e soglie coordinate
  let old=0;
  for(let s=1;s<=120;s++){
    const {planet,sector}=sectorAt(s);
    const value=phase17EnemyHp(planet,sector);
    assert.ok(value>=32);
    if(sector!==10&&sector!==1)assert.ok(value>=old-40,'progressione HP normale non cade drasticamente');
    if(sector===10)assert.ok(value>phase17EnemyHp(planet,9));
    old=value;
  }
});
test('17B: Jolly ed Etere introdotti insieme e terza arma più tardi',()=>{
  const f=s=>{const {planet,sector}=sectorAt(s);return phase17Features(planet,sector);};
  assert.equal(f(1).allowJokers,false);
  assert.equal(f(14).allowEther,false);
  assert.equal(f(15).allowEther,true);
  assert.equal(f(15).allowJokers,true);
  assert.equal(f(20).allowHeavy,false);
  assert.equal(f(21).allowHeavy,true);
  assert.equal(f(10).allowPlanetaryDeck,false);
  assert.equal(f(11).allowPlanetaryDeck,true);
});
test('17B: inventario nuovo due armi, pesante bloccata all inizio, old saves preservati',()=>{
  const base=createPhase7Armory();
  assert.equal(Object.keys(base.owned).length,2);
  assert.equal(base.equipped.heavy,null);
  const first=phase17PlayerBattleLoadout(base,1,1);
  assert.ok(first.light && first.medium && !first.heavy);
  const old=normalizePhase7Armory({owned:{es_common_heavy_01:true,es_legendary_medium_01:true},equipped:{heavy:'es_common_heavy_01',medium:'es_legendary_medium_01'}});
  assert.equal(old.owned.es_common_heavy_01,true);
  assert.equal(old.equipped.heavy,'es_common_heavy_01');
  assert.equal(phase17PlayerBattleLoadout(old,1,1).heavy,null);
  assert.equal(phase17PlayerBattleLoadout(old,1,1).medium,base.equipped.medium);
  assert.equal(phase17PlayerBattleLoadout(old,3,1).heavy,'es_common_heavy_01');
});
test('17B: armi 1-4 migliorie reali, costo e pilota verificati, HP/munizioni non alterati',()=>{
  const base=createPhase7Armory(),id=base.equipped.light;
  assert.equal(upgradePhase7Weapon(base,id,1,9999).ok,false);
  const tx=upgradePhase7Weapon(base,id,12,9999);
  assert.equal(tx.ok,true);
  assert.equal(tx.state.levels[id],2);
  const l1=getPhase4Profile(id,1),l2=getPhase4Profile(id,2);
  assert.ok(l2.damagePerShot>l1.damagePerShot);
  assert.equal(l2.fullSalvo,l1.fullSalvo);
  assert.equal(phase17PlayerWeaponLevels(tx.state,tx.state.equipped).light,2);
  assert.equal(normalizePhase7Armory(JSON.parse(JSON.stringify(tx.state))).levels[id],2);
});
test('17B: i 120 avversari evolvono in tre classi/rarità/livelli senza usare Epici',()=>{
  for(let s=1;s<=120;s++){
    const {planet,sector}=sectorAt(s);
    const loadout=phase17EnemyLoadout(planet,sector);
    assert.ok(getWeaponDefinition(loadout.light));
    assert.ok(getWeaponDefinition(loadout.medium));
    assert.equal(Boolean(loadout.heavy),s>=21);
    const levels=phase17EnemyWeaponLevels(planet,sector);
    assert.ok(levels.light>=1 && levels.light<=4);
    const start=createPhase6Duel({playerLoadout:createPhase7Armory().equipped,enemyLoadout:loadout,enemyWeaponLevels:levels,playerHand:[],enemyHand:[],playerDeck:[],enemyDeck:[]});
    assert.equal(start.arsenal.enemy.heavy,loadout.heavy);
    assert.equal(start.weaponLevels.enemy.medium,levels.medium);
  }
  const last=sectorAt(120);
  assert.equal(phase17EnemyWeaponLevels(last.planet,last.sector).heavy,4);
  assert.equal(getWeaponDefinition(phase17EnemyLoadout(last.planet,last.sector).heavy).rarityKey,'legendary');
});
test('17B: premi aumentano, replay inferiori, acquisto di rango bloccato a livello basso',()=>{
  assert.ok(phase17CampaignDustAward(1,1)>0);
  assert.ok(phase17CampaignDustAward(20,10)>phase17CampaignDustAward(1,1));
  assert.ok(phase17CampaignDustAward(20,10,true)<phase17CampaignDustAward(20,10));
  assert.ok(phase17CampaignXpAward(20,10,true)<phase17CampaignXpAward(20,10));
  const id='es_legendary_light_04',state=createPhase7Armory();
  assert.equal(buyPhase7Weapon(state,id,100000,1).ok,false);
  assert.equal(buyPhase7Weapon(state,id,100000,75).ok,true);
});
test('17B: arena non anticipa una Pesante acquistata in vecchio salvataggio',()=>{
  const state=createPhase6Duel({playerHand:[],enemyHand:[],playerDeck:[],enemyDeck:[]});
  const campaign={...state,campaignEnvironment:{},campaignSession:{planet:1,sector:1}};
  assert.throws(()=>setPhase4EquippedWeapon(campaign,'player','heavy','es_common_heavy_01'),/non ancora sbloccata/);
});
test('17B: schermata campagna usa nuova fonte di valori e conserva tutorial al termine dei bilanciamenti',()=>{
  const ui=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  assert.match(ui,/phase17CampaignXpAward\(planet,level,isReplay\)/);
  assert.match(ui,/phase17EnemyHp\(activeAdventure\.planet,activeAdventure\.level\)/);
  assert.match(ui,/createStandardDeck\(chosenDeck,playerLevel,features\.allowJokers\)/);
  assert.match(ui,/phase17PlayerBattleLoadout/);
});

test('17B: munizioni iniziali reali per due classi, mai munizioni per terza arma bloccata',()=>{
 const armory=createPhase7Armory();
 const ammo=phase17StartingAmmo(phase17PlayerBattleLoadout(armory,1,1));
 assert.equal(Object.values(ammo).reduce((a,b)=>a+b,0),8);
 assert.equal(ammo.spades,4);
 assert.equal(ammo.clubs,4);
 const later=phase17StartingAmmo(phase17EnemyLoadout(20,10));
 assert.equal(Object.values(later).reduce((a,b)=>a+b,0),10);
});
