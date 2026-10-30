// R11: ogni carta arma ha un profilo di tiro e una geometria distinti.
// Non altera i danni: l'effetto termina chiamando onComplete una sola volta.
const PROFILES = Object.freeze({
  'wp_gatling': { shape: 'tracer', count: 4, color: '#67e8f9' },
  'wp_fuse_bolts': { shape: 'harpoon', count: 2, color: '#fb923c' },
  'wp_disc_blades': { shape: 'disc', count: 3, color: '#a78bfa' },
  'wp_xbow': { shape: 'arrow', count: 4, color: '#d9f99d' },
  'wp_siege_cannon': { shape: 'shell', count: 1, color: '#f97316' },
  'wp_blood_siphon': { shape: 'siphon', count: 3, color: '#fb7185' },
  'wp_flak_cannon': { shape: 'shrapnel', count: 5, color: '#facc15' },
  'wp_kinetic_drill': { shape: 'drill', count: 1, color: '#94a3b8' },
  'wp_micro_missiles': { shape: 'rocket', count: 3, color: '#fbbf24' },
  'wp_apocalypse_torpedo': { shape: 'torpedo', count: 1, color: '#ef4444' },
  'wp_thunderstrike': { shape: 'lightning', count: 2, color: '#93c5fd' },
  'wp_railgun': { shape: 'beam', count: 1, color: '#22d3ee' },
  'wp_seismic_wave': { shape: 'wave', count: 2, color: '#d6d3d1' },
  'wp_tesla_arc': { shape: 'arc', count: 3, color: '#818cf8' },
  'wp_cross_laser': { shape: 'cross', count: 2, color: '#f0abfc' },
  'wp_orbital_cannon': { shape: 'pillar', count: 1, color: '#fef08a' },
  'wp_meteor_strike': { shape: 'meteor', count: 2, color: '#fdba74' },
  'wp_cryo_fracture': { shape: 'crystal', count: 4, color: '#bae6fd' },
  'wp_singularity_blackhole': { shape: 'void', count: 1, color: '#c4b5fd' },
  'wp_reactor_bomb': { shape: 'reactor', count: 1, color: '#4ade80' },
});

const SVG = {
 tracer:'<path d="M4 12 L30 12" stroke="white" stroke-width="3"/><path d="M0 12 L15 12" stroke="currentColor" stroke-width="5"/>',
 harpoon:'<path d="M3 12 H27 M22 5 L32 12 L22 19" fill="none" stroke="currentColor" stroke-width="4"/>',
 disc:'<circle cx="16" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="5"/><path d="M8 5 L24 19 M24 5 L8 19" stroke="white" stroke-width="2"/>',
 arrow:'<path d="M2 12 H30 M21 4 L31 12 L21 20" fill="none" stroke="currentColor" stroke-width="3"/>',
 shell:'<path d="M3 4 H23 Q34 12 23 20 H3 Z" fill="currentColor"/><path d="M7 4 V20" stroke="white" stroke-width="3"/>',
 siphon:'<path d="M3 12 Q9 -6 16 12 T30 12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="28" cy="12" r="4" fill="white"/>',
 shrapnel:'<path d="M16 0 L20 9 L32 7 L24 15 L30 24 L16 19 L2 24 L8 15 L0 7 L12 9 Z" fill="currentColor"/>',
 drill:'<path d="M0 5 L24 5 L32 12 L24 19 L0 19 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M4 18 L13 6 M13 18 L22 6" stroke="white" stroke-width="3"/>',
 rocket:'<path d="M3 8 L22 5 L32 12 L22 19 L3 16 Z" fill="currentColor"/><path d="M3 8 L-4 3 L0 12 L-4 21 L3 16" fill="orange"/>',
 torpedo:'<path d="M0 7 L24 4 Q37 12 24 20 L0 17 Z" fill="currentColor"/><circle cx="19" cy="12" r="4" fill="white"/>',
 lightning:'<path d="M17 0 L4 14 H15 L10 24 L30 8 H18 L24 0" fill="currentColor"/>',
 beam:'<path d="M0 9 H32 V15 H0 Z" fill="currentColor"/><path d="M0 12 H32" stroke="white" stroke-width="2"/>',
 wave:'<path d="M2 22 Q7 2 12 22 T22 22 T32 22" stroke="currentColor" stroke-width="4" fill="none"/>',
 arc:'<path d="M2 12 L9 4 L14 17 L20 6 L25 20 L32 12" fill="none" stroke="currentColor" stroke-width="4"/>',
 cross:'<path d="M0 0 L32 24 M32 0 L0 24" stroke="currentColor" stroke-width="4"/>',
 pillar:'<path d="M10 0 H22 L28 24 H4 Z" fill="currentColor" opacity=".85"/><path d="M16 0 V24" stroke="white" stroke-width="3"/>',
 meteor:'<path d="M0 0 L23 6 L31 13 L24 21 L15 17 Z" fill="currentColor"/><circle cx="23" cy="13" r="8" fill="orange"/>',
 crystal:'<path d="M16 0 L29 12 L16 24 L3 12 Z" fill="currentColor"/><path d="M16 0 V24 M3 12 H29" stroke="white" stroke-width="2"/>',
 void:'<circle cx="16" cy="12" r="11" fill="currentColor"/><circle cx="16" cy="12" r="7" fill="#080518"/><ellipse cx="16" cy="12" rx="16" ry="5" fill="none" stroke="white" stroke-width="2"/>',
 reactor:'<circle cx="16" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="16" cy="12" r="4" fill="white"/><path d="M16 0 V5 M16 19 V24 M0 12 H6 M26 12 H32" stroke="currentColor" stroke-width="3"/>'
};
export function fireUniqueWeaponVFX(weapon, level=1, {onComplete, isEnemyAttacking=false}={}) {
 const p=PROFILES[weapon?.id];
 if (!p || typeof document==='undefined') return false;
 const target=document.getElementById(isEnemyAttacking?'classicPlayerHpDock':'classicEnemyHpDock');
 const origin=document.getElementById(isEnemyAttacking?'classicEnemyHpDock':'classicPlayerHpDock');
 if (!target || !origin) return false;
 const a=origin.getBoundingClientRect(), b=target.getBoundingClientRect();
 const sx=a.left+a.width/2, sy=a.top+a.height/2, tx=b.left+b.width/2, ty=b.top+b.height/2;
 const power=Math.max(1,Math.min(4,Math.floor(Number(level)||1)));
 const count=Math.min(26,Math.round(p.count*(1+(power-1)*.65)));
 const duration=460+Math.min(count,10)*24;
 let finished=false;
 const done=()=>{if(finished)return;finished=true;target.classList.add('bar-hit-flash','bar-shiver');setTimeout(()=>target.classList.remove('bar-hit-flash','bar-shiver'),220);onComplete?.();};
 const nodes=[];
 for(let i=0;i<count;i++){
   const el=document.createElement('div');
   el.style.cssText='position:fixed;left:0;top:0;width:32px;height:24px;pointer-events:none;z-index:999999;will-change:transform,opacity;';
   el.style.color=p.color;
   el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 32 24" style="overflow:visible;filter:drop-shadow(0 0 7px ${p.color})">${SVG[p.shape]}</svg>`;
   document.body.appendChild(el);nodes.push(el);
   const spread=(i-(count-1)/2)*Math.min(12,90/count);
   const dx=tx-sx,dy=ty-sy;
   const angle=Math.atan2(dy,dx)*180/Math.PI;
   const wobble=(p.shape==='wave'||p.shape==='arc'||p.shape==='siphon')?24:8;
   const start=`translate(${sx}px,${sy+spread}px) rotate(${angle}deg) scale(${.7+power*.1})`;
   const mid=`translate(${sx+dx*.48+wobble*Math.sin(i*2)}px,${sy+dy*.48+spread*.5}px) rotate(${angle+(p.shape==='disc'?210:0)}deg) scale(${1+power*.08})`;
   const end=`translate(${tx}px,${ty+spread*.18}px) rotate(${angle+(p.shape==='disc'?540:0)}deg) scale(.45)`;
   const delay=i*Math.max(20,80-power*14);
   const anim=el.animate([{transform:start,opacity:0},{transform:mid,opacity:1,offset:.52},{transform:end,opacity:0}],{duration,easing:'ease-in',delay,fill:'forwards'});
   anim.onfinish=()=>el.remove();
 }
 const total=duration+(count-1)*Math.max(20,80-power*14);
 setTimeout(()=>{nodes.forEach(n=>n.remove());done();},total+20);
 return true;
}
