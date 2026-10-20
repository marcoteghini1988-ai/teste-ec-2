// Verifica senza rete né dipendenze Firebase: transpila soltanto l'interfaccia per eseguire
// il generatore di lega realmente usato dal gioco, senza cambiare gameplay.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { seededCompetitionRng, mergeBootstrapLeaderboard } from '../src/pvpBootstrap.js';
const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/pvpManager.jsx');
const source = fs.readFileSync(p,'utf8');
const output = ts.transpileModule(source, { fileName:p, compilerOptions:{ module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
const memory = new Map();
const modules = { exports: {} };
const reactStub = { useState(){}, useEffect(){}, useRef(){} };
const ctx = {
  module: modules,
  exports: modules.exports,
  console, Date, Math, Intl, setInterval, clearInterval, setTimeout, clearTimeout,
  localStorage: { getItem:k=>memory.get(k)||null, setItem:(k,v)=>memory.set(k,String(v)) },
  require(name){
    if(name==='react') return reactStub;
    if(name==='react/jsx-runtime') return {jsx(){},jsxs(){}};
    if(name==='firebase/app') return {getApps:()=>[], initializeApp:()=>({})};
    if(name==='firebase/database') return {getDatabase:()=>null};
    if(name==='./visualAssets') return { SciFiIcon(){} };
    if(name==='./competitiveBootstrap.js') return { COMPETITIVE_BOOTSTRAP:{enabled:true,realOpponentSearchMs:12000,eliteRosterSize:500}, seededCompetitionRng, mergeBootstrapLeaderboard };
    throw Error('Stub mancante '+name);
  }
};
vm.runInNewContext(output.outputText,ctx,{filename:'pvpManager.jsx'});
assert.notEqual(
  modules.exports.getWeeklyLeaderboardKey(new Date('2026-10-18T21:30:00Z')),
  modules.exports.getWeeklyLeaderboardKey(new Date('2026-10-18T23:30:00Z')),
  'Il lunedì di Roma deve aprire la settimana anche all’estero'
);
const get = modules.exports.getPersistentLeaderboardData;
assert.equal(typeof get,'function');
const a=get('settimana_2026_42','2026-10-12');
const a2=get('settimana_2026_42','2026-10-12');
const b=get('settimana_2026_42','2026-10-16');
const b2=get('settimana_2026_42','2026-10-16');
const c=get('settimana_2026_43','2026-10-19');
assert.equal(a.length,500); assert.equal(b.length,500);
assert.equal(new Set(a.map(x=>x.id)).size,500);
assert.equal(new Set(a.map(x=>x.nickname)).size,500);
assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(a2)));
assert.deepEqual(JSON.parse(JSON.stringify(b)),JSON.parse(JSON.stringify(b2)));
assert.notDeepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
assert.notDeepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(c)));
const real=[{id:'user-1',trophies:1600},{id:'user-2',trophies:1300}];
const merged=mergeBootstrapLeaderboard(real,b,500);
assert.equal(merged.length,500);
assert.equal(merged.filter(x=>x.isBot).length,498);
assert.equal(merged.filter(x=>!x.isBot).length,2);
assert.ok(merged.some(x=>x.id==='user-1') && merged.some(x=>x.id==='user-2'));
const info={
  weekKey:'settimana_2026_42',
  firstDayBots:a.length,
  sameDayReproducible:true,
  lastDayReproducible:true,
  differentDaysProgress:true,
  uniqueBotNames:new Set(a.map(x=>x.nickname)).size,
  simulatedWhen2Real:merged.filter(x=>x.isBot).length,
  botsWhen500Real:mergeBootstrapLeaderboard(Array.from({length:500},(_,i)=>({id:'real'+i,trophies:700+i})),b,500).filter(x=>x.isBot).length,
  tests:'PASS'
};
fs.writeFileSync(new URL('../FASE_17Q_COMPETIZIONE_VERIFICA.json', import.meta.url),JSON.stringify(info,null,2));
console.log(JSON.stringify(info,null,2));
