import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {getWeaponDefinition} from './weaponCatalog.js';
import {describePokerVolleys, pokerVolleyProfile, portalAnchorForSlot} from './pokerVolleyVfx.js';
import './pokerCombatEffects.css';

// Solo presentazione: non cambia HP, danni, munizioni, Poker o tempi dei turni.
// Questa è la VFX usata dalla PLANCIA CLASSIC, non dalla schermata tecnica nascosta.
const RIFT_PALETTES = {
  burst:  ['#ffae54', '#ffe49b', '#7c2412'],
  beam:   ['#5deaff', '#d2fdff', '#0b3c79'],
  arc:    ['#8aa9ff', '#e2e8ff', '#30258f'],
  shard:  ['#f4ce89', '#ffffff', '#663768'],
  pulse:  ['#60f2d6', '#b3fff2', '#13575e'],
  orbit:  ['#d29aff', '#ffe8ff', '#402071'],
  plasma: ['#ff84ac', '#fff0c6', '#76234b'],
  spear:  ['#8fe5ff', '#e2fbff', '#185da0'],
};
// R6: UNA sola tabella per le immagini dei varchi. Il colpo resta definito dall'ID arma,
// in pokerVolleyVfx.js, e NON dipende dalla scelta di questa immagine.
const PORTAL_SHEETS=Object.freeze({
  burst:'/assets/portal_sequences/burst.png',
  beam:'/assets/portal_sequences/pulse.png',
  arc:'/assets/portal_sequences/arc.png',
  shard:'/assets/portal_sequences/shard.png',
  pulse:'/assets/portal_sequences/pulse.png',
  orbit:'/assets/portal_sequences/orbit.png',
  plasma:'/assets/portal_sequences/plasma.png',
  spear:'/assets/portal_sequences/shard.png',
  toxic:'/assets/portal_sequences/toxic.png',
});
const portalSheetFor=(signature,weapon)=>{
  const text=`${weapon?.name||''} ${signature?.effectName||''}`.toLowerCase();
  if(/tossic|corros|velen|acido|spora|nebbia|poison|toxic/.test(text))return PORTAL_SHEETS.toxic;
  return PORTAL_SHEETS[signature?.family]||PORTAL_SHEETS.orbit;
};
// R7 — sequenze sprite 2x3, una per famiglia. Il colpo resta separato e definito dalla carta arma.
if(typeof window!=='undefined' && typeof Image!=='undefined'){
  Object.values(PORTAL_SHEETS).forEach(src=>{const preload=new Image();preload.src=src;});
}
const point=(element)=>{
  const rect=element.getBoundingClientRect();
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
};
const element=(tag,className,container)=>{
  const child=document.createElement(tag);
  child.className=className;
  container.appendChild(child);
  return child;
};
const place=(node,coord)=>{
  node.style.left=`${coord.x}px`;
  node.style.top=`${coord.y}px`;
};
const setPalette=(node,signature)=>{
  const [primary,highlight,shadow]=RIFT_PALETTES[signature.family]||RIFT_PALETTES.burst;
  node.style.setProperty('--rift-main',primary);
  node.style.setProperty('--rift-highlight',highlight);
  node.style.setProperty('--rift-shadow',shadow);
  node.style.setProperty('--rift-rarity',signature.glow);
  node.style.setProperty('--rift-pulse',`${signature.pulseMs}ms`);
  node.style.setProperty('--rift-tint',`${signature.tint}deg`);
  node.style.setProperty('--rift-tilt',`${signature.tilt}deg`);
};

/**
 * Appare solamente durante la fase 'animate' del Poker in ClassicBattleView.
 * Un varco VERTICALE si apre SOPRA la carta arma esatta,
 * il colpo attraversa il tavolo e raggiunge l'HUD HP avversario.
 * Immagini WEBP trasparenti + animazione CSS; colpi sempre specifici delle 48 carte.
 */
export default function PokerCombatEffects({volleys,opener='player',weapons=[],enemyWeapons=[]}) {
  const layerRef=useRef(null);
  useEffect(()=>{
    const layer=layerRef.current;
    if(!layer||typeof document==='undefined'||!volleys)return;
    let cancelled=false;
    const timers=[];
    const animations=[];
    let currentFrame=0;
    const later=(fn,ms)=>{
      const id=window.setTimeout(()=>{if(!cancelled)fn();},ms);
      timers.push(id);
    };
    const removeLater=(node,delay)=>later(()=>node.remove(),delay);
    const fire=(side,volley,order)=>{
      const weapon=getWeaponDefinition(volley.weaponId);
      const signature=pokerVolleyProfile(weapon);
      if(!weapon||!signature?.projectile||!volley.shots)return;
      const isEnemy=side==='enemy';
      // Associazione IDENTITARIA: lato, ID arma e indice fisico dello slot.
      // Mai cercare un'altra carta con lo stesso nome o un container della fila.
      const equipped=isEnemy?enemyWeapons:weapons;
      const configured=equipped.find(w=>w.id===weapon.id);
      const selector=isEnemy?'[data-enemy-weapon-slot="true"]':'[data-player-weapon-slot="true"]';
      const candidates=Array.from(document.querySelectorAll(selector)).filter(node=>
        node.dataset.weaponId===weapon.id && (
          !configured || String(configured.slotIdx)===node.dataset.weaponSlotIndex
        )
      );
      const slot=candidates.find(node=>{
        const r=node.getBoundingClientRect();
        return r.width>8&&r.height>8&&r.bottom>0&&r.top<window.innerHeight&&r.right>0&&r.left<window.innerWidth;
      });
      const hp=document.getElementById(isEnemy?'classicPlayerHpDock':'classicEnemyHpDock');
      if(!slot||!hp){
        console.warn('[Eclissi Varco] Slot o barra HP non trovati:',side,weapon.id,{slot:!!slot,hp:!!hp});
        return;
      }
      const begin=110+order*1130;
      const shots=Math.min(12,Math.max(1,Math.round(volley.shots)));
      const interval=Math.min(signature.projectile.intervalMs,Math.floor(900/shots));
      // Coordinate lette DALLA CARTA effettiva al momento della comparsa,
      // dopo le animazioni di posizionamento delle carte (non quando monta React).
      let aperture=null;
      let portal=null;
      let caption=null;
      let tether=null;
      const trackPortal=()=>{
        if(cancelled||!portal?.isConnected||!slot.isConnected)return;
        // La plancia Classic usa trasformazioni 3D: seguire il rect reale a ogni frame.
        aperture=portalAnchorForSlot(slot.getBoundingClientRect(),signature,window.innerWidth,window.innerHeight,side);
        place(portal,aperture);
        portal.style.setProperty('--rift-gate-width',`${aperture.width}px`);
        portal.style.setProperty('--rift-gate-height',`${aperture.height}px`);
        if(tether){
          const gap=aperture.cardY-aperture.gateFootY;
          tether.style.display=gap>1&&gap<55?'block':'none';
          tether.style.left=`${aperture.cardX}px`;
          tether.style.top=`${aperture.gateFootY}px`;
          tether.style.height=`${Math.max(0,gap)}px`;
        }
        if(caption){
          const captionY=Math.max(13,Math.min(window.innerHeight-16,aperture.y-aperture.height/2-13));
          place(caption,{x:aperture.x,y:captionY});
        }
        currentFrame=window.requestAnimationFrame(trackPortal);
      };
      later(()=>{
        if(!slot.isConnected)return;
        aperture=portalAnchorForSlot(slot.getBoundingClientRect(),signature,window.innerWidth,window.innerHeight,side);
        slot.classList.add('es-rift-source-active');
        later(()=>slot.classList.remove('es-rift-source-active'),2240);
        portal=element('div',`es-rift-gate es-rift-${signature.family} es-rift-motif-${signature.motif} ${side} es-rift-placement-${aperture.placement} ${volley.boostApplied?'es-rift-boosted':''}`,layer);
        place(portal,aperture);
        setPalette(portal,signature);
        portal.style.setProperty('--rift-gate-width',`${aperture.width}px`);
        portal.style.setProperty('--rift-gate-height',`${aperture.height}px`);
        portal.setAttribute('aria-label',`Varco verticale ${weapon.name}, effetto ${signature.effectName}`);
        portal.setAttribute('data-rift-weapon-id',weapon.id);
        portal.setAttribute('data-rift-side',side);
        portal.setAttribute('data-rift-slot-index',String(slot.dataset.weaponSlotIndex));
        portal.setAttribute('data-rift-effect-id',signature.effectId);
        portal.setAttribute('data-rift-projectile',signature.projectile.shape);
        // La porta ha un volume proprio: architrave, fiancate, fondo, cuore
        // e bordo sono piani distinti con translateZ / rotateY, non un'ellisse piatta.
        element('span','es-rift-rear-frame',portal);
        element('span','es-rift-depth-bridge',portal);
        element('span','es-rift-floor-shadow',portal);
        const door=element('div','es-rift-door',portal);
        element('span','es-rift-backplane',door);
        element('span','es-rift-left-wall',door);
        element('span','es-rift-right-wall',door);
        element('span','es-rift-depth',door);
        element('span','es-rift-mouth',door);
        element('span','es-rift-halo',door);
        element('span','es-rift-vertical-axis',door);
        element('span','es-rift-sparks',door);
        element('span','es-rift-orbit es-rift-orbit-one',door);
        element('span','es-rift-orbit es-rift-orbit-two',door);
        // Il varco realistico resta SOPRA la carta e davanti agli strati CSS 3D.
        // Non influisce sul tipo di proiettile calcolato dalla scheda arma.
        const portalArt=element('span','es-rift-art',door);
        const portalSheet=portalSheetFor(signature,weapon);
        portalArt.style.backgroundImage=`url("${portalSheet}")`;
        portalArt.setAttribute('aria-hidden','true');
        portal.dataset.portalImage=portalSheet;
        if(volley.boostApplied){element('span','es-rift-boost-crown',door);}
        portal.style.setProperty('--rift-gate-lifetime','2220ms');
        // Piede del varco -> testa della STESSA carta, sempre sul medesimo asse X.
        tether=element('div','es-rift-card-tether',layer);
        setPalette(tether,signature);
        removeLater(tether,2250);
        removeLater(portal,2250);
        caption=element('div','es-rift-caption',layer);
        // Descrizione discreta, separata dal portale e dal colpo.
        const captionY=Math.max(13,Math.min(window.innerHeight-16,aperture.y-aperture.height/2-13));
        place(caption,{x:aperture.x,y:captionY});
        caption.textContent=volley.boostApplied
          ? `⚡ BOOST · ${weapon.name} · ${signature.projectile.label} · +${volley.boostDamage||0} danni (${volley.boostPercent||0}%)`
          : `${weapon.name} · ${signature.projectile.label} · ${volley.shots} colpi`;
        setPalette(caption,signature);
        removeLater(caption,2050);
        trackPortal();
      },begin);
      for(let i=0;i<shots;i++)later(()=>{
        // Niente proiettile se lo slot non è più visibile o la porta non è nata.
        if(!aperture || !slot.isConnected)return;
        // Il varco segue la carta: anche il colpo parte dalla sua posizione corrente.
        aperture=portalAnchorForSlot(slot.getBoundingClientRect(),signature,window.innerWidth,window.innerHeight,side);
        const target=point(hp);
        const horizontal=(i%3-1)*5;
        const finish={x:target.x+horizontal,y:target.y+Math.sin(i*1.47)*4};
        const dx=finish.x-aperture.x;
        const dy=finish.y-aperture.y;
        const angle=Math.atan2(dy,dx)*180/Math.PI;
        // Il tipo fisico di colpo deve essere disponibile PRIMA di leggere shape/size.
        // In R3 l'ordine inverso lanciava ReferenceError ed impediva ogni proiettile personalizzato.
        const projectile=signature.projectile;
        // Traiettoria propria del COLPO della carta arma, non della famiglia del varco.
        const guided=['missile','drone','serpent','compass','astral','paradox'].includes(projectile.shape);
        const deviation=guided?(i%2?1:-1)*Math.max(10,projectile.size*.8):0;
        const shot=element('div',`es-rift-projectile es-weapon-shot-${projectile.shape} es-weapon-variant-${projectile.variant} ${volley.boostApplied?'es-rift-shot-boost':''}`,layer);
        place(shot,aperture);
        setPalette(shot,signature);
        shot.dataset.weaponId=weapon.id;
        shot.dataset.effectId=signature.effectId;
        shot.dataset.projectileShape=projectile.shape;
        shot.dataset.projectileName=projectile.label;
        shot.style.setProperty('--shot-size',`${projectile.size}px`);
        shot.style.setProperty('--shot-length',`${projectile.length}px`);
        shot.style.setProperty('--shot-core',projectile.primary);
        shot.style.setProperty('--shot-edge',projectile.highlight);
        // Corpo e scia separati: proiettili fisici diversi, porta invariata.
        element('span','es-shot-tail',shot);
        element('span','es-shot-core',shot);
        const start=`translate3d(-50%,-50%,0) rotate(${angle}deg) scale(.42)`;
        const middle=`translate3d(calc(-50% + ${dx*.47+(guided?deviation:0)}px), calc(-50% + ${dy*.47+(guided?deviation*.55:0)}px), 0) rotate(${angle}deg) scale(1.1)`;
        const end=`translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) rotate(${angle}deg) scale(.58)`;
        const flight=shot.animate([
          {transform:start,opacity:.3},
          {transform:middle,opacity:1,offset:.47},
          {transform:end,opacity:.95},
        ],{duration:projectile.travelMs,easing:'ease-in',fill:'forwards'});
        animations.push(flight);
        flight.onfinish=()=>{
          shot.remove();
          if(cancelled)return;
          hp.classList.remove('es-rift-hp-impact');
          void hp.offsetWidth;
          hp.classList.add('es-rift-hp-impact');
          later(()=>hp.classList.remove('es-rift-hp-impact'),240);
          const impact=element('div',`es-rift-impact es-rift-${signature.family} ${volley.boostApplied?'es-rift-boost-impact':''}`,layer);
          place(impact,finish);
          setPalette(impact,signature);
          removeLater(impact,400);
        };
      },begin+430+i*interval);
    };
    describePokerVolleys(volleys,opener).forEach(({side,volley},order)=>fire(side,volley,order));
    return ()=>{
      cancelled=true;
      timers.forEach(id=>window.clearTimeout(id));
      animations.forEach(animation=>animation.cancel());
      window.cancelAnimationFrame(currentFrame);
      layer.replaceChildren();
      document.querySelectorAll('.es-rift-hp-impact').forEach(hp=>hp.classList.remove('es-rift-hp-impact'));
      document.querySelectorAll('.es-rift-source-active').forEach(node=>node.classList.remove('es-rift-source-active'));
    };
  },[volleys,opener]);
  if(typeof document==='undefined')return null;
  return createPortal(<div ref={layerRef} className="es-poker-battle-vfx-layer" role="presentation" aria-label="Varchi dimensionali e colpi verso le barre HP" />,document.body);
}
