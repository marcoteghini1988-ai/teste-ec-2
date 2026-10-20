import test from 'node:test';
import assert from 'node:assert/strict';
import {playF17GBattle} from '../../tools/f17g_battle.mjs';
test('F17J telemetria reale arme separata dall output preesistente',()=>{
 const a=playF17GBattle(10,'frugale',0,12,null,0,{trackWeaponUsage:true});
 const b=playF17GBattle(10,'frugale',0,12,null,0,{});
 assert.equal(a.auditOK,true);assert.equal(b.auditOK,true);
 assert.equal(a.result,b.result);assert.equal(a.playerShots,b.playerShots);
 assert.equal(a.playerDamage,b.playerDamage);
 assert.ok(a.weaponUsage&&typeof a.weaponUsage.player==='object');
 assert.equal('weaponUsage' in b,false);
 assert.ok(Object.values(a.weaponUsage.player).every(r=>r.damage>=0&&r.shots>=0&&r.attempts>=r.salvos&&r.attempts>0));
});
