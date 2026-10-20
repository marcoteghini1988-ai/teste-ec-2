import {existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';

/** Pulizia opt-in: elimina SOLO vecchi componenti in radice che il gioco non
 * importa piu. Richiede --apply ed esige la presenza della versione attiva. */
const project=process.cwd();
const duplicateTargets={
 'App.tsx':'src/App.tsx',
 'ClassicBattleView.jsx':'src/ClassicBattleView.jsx',
 'ClassicPokerFieldBridge.jsx':'src/ClassicPokerFieldBridge.jsx',
 'NewCombatPhase3Preview.jsx':'src/NewCombatPhase3Preview.jsx',
 'PvpOnlinePokerBattle.jsx':'src/PvpOnlinePokerBattle.jsx',
 'visualAssets.jsx':'src/visualAssets.jsx',
 'PokerCombatEffects.jsx':'src/newCombat/PokerCombatEffects.jsx',
 'WeaponVisuals.jsx':'src/newCombat/WeaponVisuals.jsx',
 'pokerCombatEffects.css':'src/newCombat/pokerCombatEffects.css',
 'pokerVolleyVfx.js':'src/newCombat/pokerVolleyVfx.js'
};
const obsoleteOnly=['ClassicBattlePokerConnector.jsx','classicPokerIntegration.test.js','PokerBoostMathPanel.jsx','pokerBoostMathPanel.css','classicPokerArena.css'];
const missing=Object.entries(duplicateTargets).filter(([shadow,canonical])=>existsSync(resolve(project,shadow))&&!existsSync(resolve(project,canonical)));
if(missing.length){
  missing.forEach(([shadow,canonical])=>console.error(`NON cancello ${shadow}: manca ${canonical}`));
  process.exit(1);
}
const names=[...Object.keys(duplicateTargets),...obsoleteOnly];
const found=names.filter(name=>existsSync(resolve(project,name)));
if(!process.argv.includes('--apply')){
  console.log(`Trovati ${found.length} file ombra:`);
  for(const name of found) console.log(' -',name);
  console.log('Per eliminarli: npm run cleanup:shadows (consigliato dopo un backup Git/ZIP)');
}else{
  for(const name of found){unlinkSync(resolve(project,name));console.log('Eliminato file inattivo:',name);}
  console.log(`Pulizia completata: ${found.length} file rimossi; motore e asset dentro src/ invariati.`);
}
