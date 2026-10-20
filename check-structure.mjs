import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';

// Un solo punto di ingresso: index.html -> /src/main.tsx.
// Questa verifica evita di reintrodurre file ombra in radice e due renderer VFX.
const root=process.cwd();
const shadowNames=[
 'App.tsx','ClassicBattleView.jsx','ClassicPokerFieldBridge.jsx',
 'NewCombatPhase3Preview.jsx','PvpOnlinePokerBattle.jsx','visualAssets.jsx',
 'PokerCombatEffects.jsx','WeaponVisuals.jsx','pokerCombatEffects.css',
 'pokerVolleyVfx.js','PokerBoostMathPanel.jsx','pokerBoostMathPanel.css',
 'classicPokerArena.css','ClassicBattlePokerConnector.jsx'
];
const errors=[];
// R2 — ogni responsabilità consolidata ha un solo file operativo.
const r2GroupedModules={
 'src/newCombat/combatBasics.js':['boardRules.js','turnRules.js','loadoutMigration.js'],
 'src/newCombat/pokerRules.js':['duelRules.js'],
 'src/newCombat/phase5Engine.js':['boostRules.js'],
 'src/newCombat/phase10Audit.js':['phase9ModeAdapter.js','phase11Campaign.js'],
 'src/newCombat/tacticalAnalysis.js':['phase17IProbe.js','phase17JAdvisor.js'],
 'src/newCombat/phase17DEconomy.js':['phase17ECreditFlow.js'],
 'src/newCombat/phase16FModules.js':['phase17EEnemyModules.js'],
 'src/eliteServices.js':['elitePublicLeaderboard.js','eliteWeeklyAwards.js','eliteServerWalletView.js','eliteWeekSettlementGuards.js'],
 'src/pvpConnectivity.js':['pokerOnlineQueue.js','pvpQueueProtocol.js','pokerRoomReconnect.js'],
 'src/pvpBootstrap.js':['pvpPokerBootstrap.js','competitiveBootstrap.js'],
};
for(const [destination,legacy] of Object.entries(r2GroupedModules)){
 if(!existsSync(join(root,destination)))errors.push(`Modulo R2 mancante: ${destination}`);
 const destinationFolder=dirname(destination);
 for(const name of legacy)if(existsSync(join(root,destinationFolder,name)))
  errors.push(`Modulo non consolidato in R2: ${join(destinationFolder,name)}`);
}

for (const name of shadowNames) if(existsSync(join(root,name)))errors.push(`Copia inattiva nella radice: ${name}`);
const files={
 preview:join(root,'src/NewCombatPhase3Preview.jsx'),
 battle:join(root,'src/ClassicBattleView.jsx'),
 cards:join(root,'src/newCombat/WeaponVisuals.jsx'),
 vfx:join(root,'src/newCombat/PokerCombatEffects.jsx'),
 profile:join(root,'src/newCombat/pokerVolleyVfx.js'),
};
for (const [name,path] of Object.entries(files)) if (!existsSync(path)) errors.push(`File mancante: ${name} (${path})`);
if(!errors.length){
 const source=Object.fromEntries(Object.entries(files).map(([name,path])=>[name,readFileSync(path,'utf8')]));
 if(!source.battle.includes("import PokerCombatEffects from './newCombat/PokerCombatEffects.jsx'"))errors.push('Classic non importa il renderer condiviso');
 if(!source.battle.includes('<PokerCombatEffects'))errors.push('Classic non monta il renderer condiviso');
 if(/WeaponProjection|WeaponSlotHologram/.test(source.preview))errors.push('Renderer VFX parallelo nel pannello tecnico');
 if(/WeaponProjection|WeaponSlotHologram|weaponHologramSrc/.test(source.cards))errors.push('WeaponVisuals contiene ancora renderer alternativi');
 if(!source.vfx.includes("from './pokerVolleyVfx.js'"))errors.push('VFX non usa la mappatura unica arma-effetto');
}
// Controllo delle dipendenze locali del progetto (non richiede npm install).
// Le dipendenze esterne React, Firebase, Vite non vengono risolte da questo script.
const extensions=['','.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.css'];
const importRegex=/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
let importCount=0;
const scanFolder=folder=>{
  if(!existsSync(folder))return;
  for(const entry of readdirSync(folder)){
    const target=join(folder,entry);
    if(statSync(target).isDirectory()){scanFolder(target);continue;}
    if(!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry))continue;
    const content=readFileSync(target,'utf8');
    importRegex.lastIndex=0;
    for(const match of content.matchAll(importRegex)){
      importCount++;
      const base=resolve(dirname(target),match[1]);
      if(!extensions.some(ext=>existsSync(base+ext) && statSync(base+ext).isFile()) &&
         !['index.js','index.ts','index.tsx'].some(name=>existsSync(join(base,name))))
        errors.push(`Import mancante in ${target.slice(root.length+1)}: ${match[1]}`);
    }
  }
};
['src','server','tools'].forEach(folder=>scanFolder(join(root,folder)));

if (errors.length){for(const e of errors)console.error('✗',e);process.exitCode=1;}
else console.log(`OK: nessun file ombra; pipeline VFX unica; ${importCount} import locali verificati.`);
