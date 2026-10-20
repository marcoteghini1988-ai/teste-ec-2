import React, { useState } from 'react';
import { ARSENAL_48 } from './newCombat/weaponCatalog';
import {normalizePhase7Armory,getPhase7ArmoryPrice,getPhase7UnlockLevel,F17_WEAPON_UPGRADE_PRICES,F17_WEAPON_UPGRADE_LEVELS,ARMORY_CLASSES_LABELS} from './newCombat/phase7Armory.js';
import { WeaponCardArt } from './newCombat/WeaponVisuals.jsx';

const RARITY_OPTIONS = [['all', 'Tutte'],['common','Comune'],['rare','Rara'],['epic','Epica'],['legendary','Leggendaria']];
const CLASS_OPTIONS = [['all', 'Tutte'],['light','Leggere'],['medium','Medie'],['heavy','Pesanti']];
const MATCH_LABELS = {
  one_pair:'Coppia',two_pair:'Doppia coppia',three_of_a_kind:'Tris',
  straight_4:'Scala (4)',straight_5:'Scala (5)',flush_4:'Colore (4)',flush_5:'Colore (5)',
  full_house:'Full',four_of_a_kind:'Poker',straight_flush_4:'Scala a colore (4)',
  straight_flush_5:'Scala a colore (5)',royal_flush_5:'Scala reale (5)'
};
export default function NewArsenalCatalogPreview({armoryV2,stardust=0,pilotLevel=1,onBuy,onUpgrade,onEquip}) {
  const armory=normalizePhase7Armory(armoryV2);
  const [onlyOwned,setOnlyOwned]=useState(false);
  const [rarity,setRarity] = useState('all');
  const [weaponClass,setWeaponClass] = useState('all');
  const [selected,setSelected] = useState('es_common_light_01');
  const shown = ARSENAL_48.filter(w => (rarity === 'all' || w.rarityKey === rarity) && (weaponClass === 'all' || w.weaponClass === weaponClass) && (!onlyOwned || armory.owned[w.id]));
  const focused = shown.find(w => w.id === selected) || shown[0];
  return (
    <section style={{ padding:'0.65rem', border:'1px solid rgba(56,189,248,0.5)', borderRadius:10, background:'rgba(5,13,32,.94)', color:'#e2e8f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <strong style={{fontSize:'.78rem', color:'#7dd3fc'}}>ARSENALE 2.0 · 48 ARMI</strong>
        <span style={{fontSize:'.58rem',color:'#94a3b8'}}>FASE 8 · CARTE ILLUSTRATE</span>
      </div>
      <p style={{fontSize:'.63rem',lineHeight:1.45,margin:'.35rem 0 .6rem'}}>
        Acquista e scegli le armi del duello 2.0. Ogni slot accetta soltanto la propria classe; il seme determina le munizioni. Potenziamenti progressivi: 4 livelli arma; rarità e Pesante si sbloccano gradualmente. Illustrazioni tecniche provvisorie di ogni modello: i rendering fotorealistici e gli effetti speciali saranno completati in seguito. La campagna e gli Hardpoint originali restano separati.
      </p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:4,margin:'7px 0 10px'}}>
        {[['⚡','LEGGERA'],['◎','MEDIA'],['☄','PESANTE'],['✚','BOOST']].map(([icon,label])=><div key={label} style={{border:'1px solid #334155',borderRadius:5,background:'rgba(15,23,42,.75)',textAlign:'center',padding:'7px 1px'}}><div style={{fontSize:19,color:label==='BOOST'?'#38bdf8':'#facc15'}}>{icon}</div><div style={{fontSize:'.51rem',fontWeight:800}}>{label}</div></div>)}
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>
        {RARITY_OPTIONS.map(([id,label])=><button key={id} type="button" onClick={()=>setRarity(id)} style={{fontSize:'.58rem',padding:'4px 6px',borderRadius:6,border:id===rarity?'1px solid #38bdf8':'1px solid #334155',background:id===rarity?'#0c4a6e':'#0f172a',color:'#f8fafc',cursor:'pointer'}}>{label}</button>)}
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:9}}>
        {CLASS_OPTIONS.map(([id,label])=><button key={id} type="button" onClick={()=>setWeaponClass(id)} style={{fontSize:'.58rem',padding:'4px 6px',borderRadius:6,border:id===weaponClass?'1px solid #facc15':'1px solid #334155',background:id===weaponClass?'#713f12':'#0f172a',color:'#f8fafc',cursor:'pointer'}}>{label}</button>)}
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',margin:'4px 0 8px',fontSize:'.63rem'}}>
        <strong>POSSEDUTE: {Object.keys(armory.owned).length}/48</strong>
        <strong style={{color:'#facc15'}}>POLVERE: {stardust} 🌟</strong>
        <label style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}><input type="checkbox" checked={onlyOwned} onChange={e=>setOnlyOwned(e.target.checked)}/> Solo mie</label>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:5,marginBottom:9}}>
        {['light','medium','heavy'].map(cls=>{
          const w=ARSENAL_48.find(x=>x.id===armory.equipped[cls]);
          return <div key={cls} style={{border:`1px solid ${w?.rarityColor||'#475569'}`,padding:5,borderRadius:6,background:'#0f172a'}}>
            <strong style={{fontSize:'.57rem',color:'#7dd3fc'}}>{ARMORY_CLASSES_LABELS[cls]}</strong>
            <div style={{fontSize:'.6rem'}}>{w?.name||'—'} {w?.ammoSymbol}</div>
          </div>;
        })}
      </div>
      <p style={{fontSize:'.58rem',color:'#94a3b8',margin:'0 0 6px'}}>Visualizzate: {shown.length} / 48. Tocca una scheda per leggere effetto e dettagli.</p>
      {focused && <div style={{display:'flex',gap:10,padding:8,border:`1px solid ${focused.rarityColor}`,borderRadius:8,background:'rgba(15,23,42,.85)',marginBottom:9}}>
        <div style={{flex:'0 0 104px',borderRadius:7,overflow:'hidden',minHeight:100,background:`linear-gradient(155deg,#020617,${focused.rarityColor}5c,#020617)`,border:`1px solid ${focused.rarityColor}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <WeaponCardArt weapon={focused} style={{width:'100%',height:'100%',maxHeight:190,objectFit:'contain'}} />
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:focused.rarityColor,fontSize:'.77rem',fontWeight:900}}>{focused.name}</div>
          <div style={{fontSize:'.57rem',color:'#cbd5e1'}}>{focused.rarity} · {focused.classLabel} · Munizioni {focused.ammoSymbol}</div>
          <div style={{fontSize:'.62rem',color:'#fbbf24',marginTop:5}}>
            {focused.secondaryActivationPattern ? <>
              Attivazione principale (salva completa): {focused.allowedPokerPatterns.filter(p=>p!==focused.secondaryActivationPattern).map(p=>MATCH_LABELS[p]).join(' / ')}
              <div style={{color:'#7dd3fc',marginTop:3}}>Attivazione alternativa: {MATCH_LABELS[focused.secondaryActivationPattern]} · 1 colpo, anche vincendo il Poker. Non sono due salve.</div>
            </> : <>Attiva: {focused.allowedPokerPatterns.map(p=>MATCH_LABELS[p]).join(' / ')}</>}
          </div>
          <div style={{fontSize:'.62rem',fontWeight:900,marginTop:5}}>{focused.effect.name}</div>
          <div style={{fontSize:'.6rem',lineHeight:1.4}}>{focused.effect.description}</div>
          <div style={{fontSize:'.57rem',color:'#94a3b8',marginTop:4}}>Grafica prevista: {focused.visual.artDirection}</div>
          <div style={{fontSize:'.6rem',color:'#facc15',marginTop:5}}>Livello {armory.levels?.[focused.id]||1}/4 · {armory.owned[focused.id]?'✓ Arma posseduta':`Costo provvisorio: ${getPhase7ArmoryPrice(focused.id)} 🌟`}{armory.equipped[focused.weaponClass]===focused.id?' · EQUIPAGGIATA':''}</div>
          <div style={{display:'flex',gap:5,marginTop:7}}>
            {armory.owned[focused.id] ? <button type="button" disabled={armory.equipped[focused.weaponClass]===focused.id} onClick={()=>onEquip?.(focused.id)} style={{background:'#0c4a6e',border:'1px solid #38bdf8',color:'#fff',padding:'6px 9px',borderRadius:6,fontSize:'.65rem',cursor:'pointer'}}>{armory.equipped[focused.weaponClass]===focused.id?'✓ EQUIPAGGIATA':`EQUIPAGGIA ${ARMORY_CLASSES_LABELS[focused.weaponClass]}`}</button>
            : <button type="button" disabled={stardust<getPhase7ArmoryPrice(focused.id)||pilotLevel<getPhase7UnlockLevel(focused.id)} onClick={()=>onBuy?.(focused.id)} style={{background:'#713f12',border:'1px solid #facc15',color:'#fff',padding:'6px 9px',borderRadius:6,fontSize:'.65rem',cursor:'pointer'}}>{pilotLevel<getPhase7UnlockLevel(focused.id)?`SBLOCCO PILOTA LV ${getPhase7UnlockLevel(focused.id)}`:stardust<getPhase7ArmoryPrice(focused.id)?'POLVERE INSUFFICIENTE':`ACQUISTA · ${getPhase7ArmoryPrice(focused.id)} 🌟`}</button>}
          </div>
          {armory.owned[focused.id] && (armory.levels?.[focused.id]||1)<4 && (()=>{
            const next=(armory.levels?.[focused.id]||1)+1;
            const cost=Math.round((F17_WEAPON_UPGRADE_PRICES[next]||0)*({common:1,rare:1.5,epic:2,legendary:2.5}[focused.rarityKey]||1));
            const needed=F17_WEAPON_UPGRADE_LEVELS[next];
            return <button type="button" onClick={()=>onUpgrade?.(focused.id)} disabled={pilotLevel<needed||stardust<cost} style={{marginTop:6,background:'#16345c',color:'#fff',border:'1px solid #60a5fa',borderRadius:6,padding:'5px 8px',fontSize:'.65rem'}}>
              {pilotLevel<needed?`POTENZIAMENTO AL LV PILOTA ${needed}`:stardust<cost?`SERVONO ${cost} POLVERE`:`POTENZIA LV ${next} · ${cost} 🌟`}
            </button>;
          })()}
        </div>
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:5,maxHeight:310,overflowY:'auto'}}>
        {shown.map(w=><button type="button" key={w.id} onClick={()=>setSelected(w.id)} style={{padding:'7px 6px',borderRadius:6,border:`1px solid ${w.id===focused.id?'#fff':w.rarityColor+'80'}`,background:'rgba(15,23,42,.8)',textAlign:'left',color:'#f8fafc',cursor:'pointer'}}>
          <div className="phase8-catalog-item"><WeaponCardArt weapon={w} className="phase8-catalog-thumb"/><div className="phase8-catalog-text"><div style={{color:w.rarityColor,fontSize:'.58rem',fontWeight:900}}>{w.classLabel} · {w.ammoSymbol}</div>
          <div style={{fontSize:'.64rem',fontWeight:800,marginTop:3}}>{w.name}</div>
          <div style={{fontSize:'.53rem',color:'#94a3b8',marginTop:3}}>{w.effect.name}</div><div style={{fontSize:'.51rem',color:armory.equipped[w.weaponClass]===w.id?'#7dd3fc':armory.owned[w.id]?'#86efac':'#facc15'}}>{armory.equipped[w.weaponClass]===w.id?'✓ EQUIPAGGIATA':armory.owned[w.id]?'✓ POSSEDUTA':`${getPhase7ArmoryPrice(w.id)} 🌟`}</div></div></div>
        </button>)}
      </div>
    </section>
  );
}
