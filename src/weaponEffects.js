// ============================================================================
// WEAPON COMBAT EFFECTS ENGINE (VFX BALISTICI & INTERAZIONE CON LA BARRA HP)
// ============================================================================

import { playSound } from './audio';
import { projectGatlingHologram } from './gatlingHologram';

// Helper per ottenere layer e barra HP bersaglio (giocatore o avversario)
function getCombatElements(targetDockId = 'classicEnemyHpDock') {
  let layer = document.getElementById('classic-projectiles-layer');
  if (!layer && typeof document !== 'undefined') {
    layer = document.body;
  }
  const targetHpDock = document.getElementById(targetDockId) || 
    document.getElementById('classicEnemyHpDock') || 
    document.getElementById('classicPlayerHpDock');
  const enemyHpFill = targetHpDock?.querySelector('.enemy-hp-fill-3d') || 
    targetHpDock?.querySelector('.player-hp-fill-3d');
  return { layer, targetHpDock, enemyHpDock: targetHpDock, enemyHpFill };
}

// ----------------------------------------------------------------------------
// 1. ARCO-X BALISTICO (arrow_barrage)
// ----------------------------------------------------------------------------
function executeArrowBarrage({ level = 1, targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const arrowConfig = {
    1: { count: 4, delayMs: 90 },
    2: { count: 8, delayMs: 60 },
    3: { count: 14, delayMs: 35 }
  };

  const cfg = arrowConfig[level] || arrowConfig[1];
  let hits = 0;
  const arrowColor = isEnemyAttacking ? '#f43f5e' : '#38bdf8';

  for (let i = 0; i < cfg.count; i++) {
    setTimeout(() => {
      try { playSound('arrow_launch'); } catch (_) {}

      const arrow = document.createElement('div');
      arrow.className = 'flight-arrow-screen';
      arrow.style.position = 'fixed';
      arrow.style.width = '4px';
      arrow.style.height = '24px';
      arrow.style.background = `linear-gradient(180deg, #ffffff 0%, ${arrowColor} 100%)`;
      arrow.style.borderRadius = '2px';
      arrow.style.boxShadow = `0 0 12px ${arrowColor}`;
      arrow.style.pointerEvents = 'none';
      arrow.style.zIndex = '999999';
      layer.appendChild(arrow);

      const spawnX = startX + (Math.random() - 0.5) * 60;
      const hitX = targetX + (Math.random() - 0.5) * 30;
      const dx = hitX - spawnX;
      const dy = targetY - startY;
      const angleRad = Math.atan2(dy, dx) + Math.PI / 2;

      arrow.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) rotate(${angleRad}rad) scale(1.3)`, opacity: 0.95 },
        { transform: `translate3d(${hitX}px, ${targetY}px, 0) rotate(${angleRad}rad) scale(0.65)`, opacity: 1 }
      ], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)', fill: 'forwards' }).onfinish = () => {
        arrow.remove();
        targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
        void targetHpDock.offsetWidth;
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        try { playSound('plasma_damage'); } catch (_) {}

        hits++;
        if (hits === cfg.count) onComplete?.();
      };
    }, i * cfg.delayMs);
  }
}

// ----------------------------------------------------------------------------
// 2. LASER A INCISIONE RADIALE SVG (railgun_beam)
// ----------------------------------------------------------------------------
function executeLaserSweep({
  level = 1,
  emitterX,
  emitterY,
  startEdgeX,
  targetEdgeX,
  targetY,
  durationMs = 450,
  onComplete,
  targetDockId,
  isEnemyAttacking = false
}) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('plasma_damage'); } catch (_) {}

  const beamColor = isEnemyAttacking ? '#f43f5e' : '#00f2fe';
  const glowColor = isEnemyAttacking ? '#fda4af' : '#a5f3fc';
  const beamWidth = level === 3 ? 11 : (level === 2 ? 8 : 5);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'fixed';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100vw';
  svg.style.height = '100dvh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '999998';

  const beamGlow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  beamGlow.setAttribute('stroke', beamColor);
  beamGlow.setAttribute('stroke-width', (beamWidth * 2.8).toString());
  beamGlow.setAttribute('stroke-linecap', 'round');
  beamGlow.setAttribute('opacity', '0.65');
  beamGlow.style.filter = `drop-shadow(0 0 16px ${beamColor})`;

  const beamCore = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  beamCore.setAttribute('stroke', '#ffffff');
  beamCore.setAttribute('stroke-width', beamWidth.toString());
  beamCore.setAttribute('stroke-linecap', 'round');

  const emitterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  emitterCircle.setAttribute('cx', emitterX.toString());
  emitterCircle.setAttribute('cy', emitterY.toString());
  emitterCircle.setAttribute('r', '14');
  emitterCircle.setAttribute('fill', '#ffffff');
  emitterCircle.setAttribute('stroke', beamColor);
  emitterCircle.setAttribute('stroke-width', '4');
  emitterCircle.style.filter = `drop-shadow(0 0 18px ${beamColor})`;

  const impactCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  impactCircle.setAttribute('r', '12');
  impactCircle.setAttribute('fill', '#ffffff');
  impactCircle.setAttribute('stroke', glowColor);
  impactCircle.setAttribute('stroke-width', '4');
  impactCircle.style.filter = `drop-shadow(0 0 22px ${beamColor})`;

  svg.appendChild(beamGlow);
  svg.appendChild(beamCore);
  svg.appendChild(emitterCircle);
  svg.appendChild(impactCircle);
  layer.appendChild(svg);

  targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');

  const animStart = performance.now();
  let lastSparkTime = 0;

  function spawnSpark(x, y) {
    const spark = document.createElement('div');
    spark.style.position = 'fixed';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.width = '4px';
    spark.style.height = '4px';
    spark.style.borderRadius = '50%';
    spark.style.backgroundColor = Math.random() > 0.4 ? '#ffffff' : beamColor;
    spark.style.boxShadow = `0 0 8px ${beamColor}`;
    spark.style.pointerEvents = 'none';
    spark.style.zIndex = '999999';
    layer.appendChild(spark);

    const destX = (Math.random() - 0.5) * 60;
    const destY = isEnemyAttacking ? (Math.random() * -30 - 10) : (Math.random() * 30 + 10);

    spark.animate([
      { transform: 'translate(0, 0) scale(1.6)', opacity: 1 },
      { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
    ], { duration: 220, easing: 'ease-out' }).onfinish = () => spark.remove();
  }

  function step(now) {
    const elapsed = now - animStart;
    const progress = Math.min(1, elapsed / durationMs);
    const curX = startEdgeX + (targetEdgeX - startEdgeX) * progress;

    beamGlow.setAttribute('x1', emitterX.toString());
    beamGlow.setAttribute('y1', emitterY.toString());
    beamGlow.setAttribute('x2', curX.toString());
    beamGlow.setAttribute('y2', targetY.toString());

    beamCore.setAttribute('x1', emitterX.toString());
    beamCore.setAttribute('y1', emitterY.toString());
    beamCore.setAttribute('x2', curX.toString());
    beamCore.setAttribute('y2', targetY.toString());

    impactCircle.setAttribute('cx', curX.toString());
    impactCircle.setAttribute('cy', targetY.toString());

    if (now - lastSparkTime > 35) {
      spawnSpark(curX, targetY);
      lastSparkTime = now;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      svg.remove();
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }
  }

  requestAnimationFrame(step);
}

// ----------------------------------------------------------------------------
// 3. TAGLIO FRAZIONATO A X (cross_laser)
// ----------------------------------------------------------------------------
function executeCrossLaser({ level = 1, emitterX, startEdgeX, targetEdgeX, targetY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('plasma_damage'); } catch (_) {}

  const beamColor = isEnemyAttacking ? '#ef4444' : '#38bdf8';
  const width = level === 3 ? 8 : (level === 2 ? 6 : 4);
  const midX = (startEdgeX + targetEdgeX) / 2;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'fixed';
  svg.style.inset = '0';
  svg.style.width = '100vw';
  svg.style.height = '100dvh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '999998';

  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', (midX - 140).toString());
  line1.setAttribute('y1', (targetY - 80).toString());
  line1.setAttribute('x2', (midX + 140).toString());
  line1.setAttribute('y2', (targetY + 80).toString());
  line1.setAttribute('stroke', beamColor);
  line1.setAttribute('stroke-width', width.toString());
  line1.style.filter = `drop-shadow(0 0 16px ${beamColor})`;

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', (midX - 140).toString());
  line2.setAttribute('y1', (targetY + 80).toString());
  line2.setAttribute('x2', (midX + 140).toString());
  line2.setAttribute('y2', (targetY - 80).toString());
  line2.setAttribute('stroke', '#ffffff');
  line2.setAttribute('stroke-width', (width * 0.7).toString());
  line2.style.filter = `drop-shadow(0 0 16px ${beamColor})`;

  svg.appendChild(line1);
  svg.appendChild(line2);
  layer.appendChild(svg);

  svg.animate([
    { opacity: 0, transform: 'scale(0.6)' },
    { opacity: 1, transform: 'scale(1.1)', offset: 0.3 },
    { opacity: 0, transform: 'scale(1.3)' }
  ], { duration: 380, easing: 'ease-out' }).onfinish = () => {
    svg.remove();
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    onComplete?.();
  };
}

// ----------------------------------------------------------------------------
// 4. TORRE TESLA / FULMINE / RAGGIO ORBITALE (lightning_strike, tesla_arc, orbital_pillar)
// ----------------------------------------------------------------------------
function executeTeslaLightning({ level = 1, targetX, targetY, onComplete, targetDockId, isEnemyAttacking = false, isOrbital = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('cannon_hit'); } catch (_) {}

  const boltCount = isOrbital ? 1 : (level === 3 ? 3 : (level === 2 ? 2 : 1));
  const boltColor = isEnemyAttacking ? '#f43f5e' : (isOrbital ? '#38bdf8' : '#00f2fe');
  const boltWidth = isOrbital ? (level === 3 ? 34 : 22) : 8;

  for (let b = 0; b < boltCount; b++) {
    const bolt = document.createElement('div');
    bolt.style.position = 'fixed';
    bolt.style.top = '0px';
    bolt.style.left = `${targetX - boltWidth / 2 + (b - 1) * 16}px`;
    bolt.style.width = `${boltWidth}px`;
    bolt.style.height = `${targetY}px`;
    bolt.style.background = `linear-gradient(180deg, #ffffff 0%, ${boltColor} 60%, transparent 100%)`;
    bolt.style.boxShadow = `0 0 30px ${boltColor}, 0 0 50px #ffffff`;
    bolt.style.pointerEvents = 'none';
    bolt.style.zIndex = '999999';
    layer.appendChild(bolt);

    setTimeout(() => {
      bolt.remove();
    }, 180 + b * 60);
  }

  targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
  setTimeout(() => {
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    onComplete?.();
  }, 280);
}

// ----------------------------------------------------------------------------
// 5. MICRORAZZI / FLAK A SCALINI (micro_missiles & flak_burst)
// ----------------------------------------------------------------------------
function executeMissileSalvo({ level = 1, startX, startY, hpLeft, hpWidth, currentHp, maxHp, damage, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const missileCount = level === 3 ? 6 : (level === 2 ? 4 : 2);
  const dmgStep = damage / missileCount;
  let hits = 0;

  for (let i = 0; i < missileCount; i++) {
    setTimeout(() => {
      try { playSound('arrow_launch'); } catch (_) {}

      const subHp = currentHp - dmgStep * i;
      const hitX = hpLeft + hpWidth * (Math.max(0, subHp) / (maxHp || 1));
      const hitY = targetHpDock.getBoundingClientRect().top + 5;

      const missile = document.createElement('div');
      missile.style.position = 'fixed';
      missile.style.width = '10px';
      missile.style.height = '24px';
      missile.style.background = 'linear-gradient(180deg, #facc15 0%, #ef4444 100%)';
      missile.style.boxShadow = '0 0 14px #facc15';
      missile.style.borderRadius = '3px';
      missile.style.pointerEvents = 'none';
      missile.style.zIndex = '999999';
      layer.appendChild(missile);

      const spawnX = startX + (i % 2 === 0 ? -70 : 70);
      const baseRot = isEnemyAttacking ? 180 : 0;
      const startAngle = isEnemyAttacking ? (i % 2 === 0 ? 160 : 200) : (i % 2 === 0 ? -20 : 20);

      missile.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) rotate(${startAngle}deg) scale(1.2)`, opacity: 1 },
        { transform: `translate3d(${hitX}px, ${hitY}px, 0) rotate(${baseRot}deg) scale(0.7)`, opacity: 1 }
      ], { duration: 240, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' }).onfinish = () => {
        missile.remove();
        targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
        void targetHpDock.offsetWidth;
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        try { playSound('cannon_hit'); } catch (_) {}

        hits++;
        if (hits === missileCount) onComplete?.();
      };
    }, i * 85);
  }
}

// ----------------------------------------------------------------------------
// 6. SIFONE DI SANGUE (blood_siphon)
// ----------------------------------------------------------------------------
function executeBloodSiphon({ level = 1, targetX, targetY, startX, startY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const count = level === 3 ? 4 : (level === 2 ? 3 : 2);
  let finished = 0;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try { playSound('card_slide'); } catch (_) {}

      const orb = document.createElement('div');
      orb.style.position = 'fixed';
      orb.style.width = '14px';
      orb.style.height = '14px';
      orb.style.borderRadius = '50%';
      orb.style.background = 'radial-gradient(circle, #ff4d6d 0%, #c9184a 100%)';
      orb.style.boxShadow = '0 0 16px #ff4d6d';
      orb.style.pointerEvents = 'none';
      orb.style.zIndex = '999999';
      layer.appendChild(orb);

      orb.animate([
        { transform: `translate3d(${startX + (Math.random() - 0.5) * 50}px, ${startY}px, 0) scale(1)`, opacity: 1 },
        { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.6)`, opacity: 1 }
      ], { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        orb.remove();
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        setTimeout(() => targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver'), 140);

        const healOrb = document.createElement('div');
        healOrb.style.position = 'fixed';
        healOrb.style.width = '12px';
        healOrb.style.height = '12px';
        healOrb.style.borderRadius = '50%';
        healOrb.style.background = 'radial-gradient(circle, #a7f3d0 0%, #10b981 100%)';
        healOrb.style.boxShadow = '0 0 16px #10b981';
        healOrb.style.pointerEvents = 'none';
        healOrb.style.zIndex = '999999';
        layer.appendChild(healOrb);

        healOrb.animate([
          { transform: `translate3d(${targetX}px, ${targetY}px, 0)`, opacity: 1 },
          { transform: `translate3d(${startX}px, ${startY}px, 0)`, opacity: 0 }
        ], { duration: 280, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
          healOrb.remove();
          finished++;
          if (finished === count) onComplete?.();
        };
      };
    }, i * 80);
  }
}

// ----------------------------------------------------------------------------
// 7. GATLING CINETICA, DARDI FUSI E LAME ROTANTI (gatling, fuse_bolts, disc_blades)
// ----------------------------------------------------------------------------
function executeGatlingSpray({ level = 1, targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false, mode = 'gatling' }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const bulletCount = level === 3 ? 14 : (level === 2 ? 8 : 4);
  let hits = 0;
  const rot = isEnemyAttacking ? 'rotate(180deg)' : '';

  for (let i = 0; i < bulletCount; i++) {
    setTimeout(() => {
      const bullet = document.createElement('div');
      bullet.style.position = 'fixed';
      bullet.style.pointerEvents = 'none';
      bullet.style.zIndex = '999999';

      if (mode === 'disc_blades') {
        bullet.style.width = '14px';
        bullet.style.height = '14px';
        bullet.style.borderRadius = '50%';
        bullet.style.background = 'radial-gradient(circle, #ffffff 20%, #10b981 80%)';
        bullet.style.boxShadow = '0 0 12px #10b981';
      } else if (mode === 'fuse_bolts') {
        bullet.style.width = '5px';
        bullet.style.height = '20px';
        bullet.style.background = '#f97316';
        bullet.style.boxShadow = '0 0 10px #f97316';
        bullet.style.borderRadius = '2px';
      } else {
        bullet.style.width = '3px';
        bullet.style.height = '18px';
        bullet.style.background = '#facc15';
        bullet.style.boxShadow = '0 0 8px #facc15';
      }

      layer.appendChild(bullet);

      const spawnX = startX + (Math.random() - 0.5) * 30;
      const hitX = targetX + (Math.random() - 0.5) * 20;

      const spin = mode === 'disc_blades' ? 'rotate(720deg)' : rot;

      bullet.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) ${rot} scale(1.2)`, opacity: 1 },
        { transform: `translate3d(${hitX}px, ${targetY}px, 0) ${spin} scale(0.6)`, opacity: 1 }
      ], { duration: 180, easing: 'linear', fill: 'forwards' }).onfinish = () => {
        bullet.remove();
        hits++;
        if (hits % 3 === 0) {
          targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
          void targetHpDock.offsetWidth;
          targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
          try { playSound('arrow_launch'); } catch (_) {}
        }
        if (hits === bulletCount) onComplete?.();
      };
    }, i * 30);
  }
}

// ----------------------------------------------------------------------------
// 8. LAMA SISMICA (seismic_wave)
// ----------------------------------------------------------------------------
function executeSeismicWave({ targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('convergenza'); } catch (_) {}

  const wave = document.createElement('div');
  wave.style.position = 'fixed';
  wave.style.width = '120px';
  wave.style.height = '24px';
  wave.style.borderRadius = '50%';
  wave.style.background = 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.9) 0%, transparent 80%)';
  wave.style.boxShadow = '0 0 25px #10b981';
  wave.style.borderTop = '3px solid #ffffff';
  wave.style.pointerEvents = 'none';
  wave.style.zIndex = '999999';
  layer.appendChild(wave);

  const rot = isEnemyAttacking ? 'rotate(180deg)' : 'rotate(0deg)';

  wave.animate([
    { transform: `translate3d(${startX - 60}px, ${startY}px, 0) ${rot} scale(0.4)`, opacity: 0.5 },
    { transform: `translate3d(${targetX - 60}px, ${targetY}px, 0) ${rot} scale(1.4)`, opacity: 1 }
  ], { duration: 280, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
    wave.remove();
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('cannon_hit'); } catch (_) {}
    onComplete?.();
  };
}

// ----------------------------------------------------------------------------
// 9. TRIVELLA A TORSIONE (kinetic_drill)
// ----------------------------------------------------------------------------
function executeKineticDrill({ targetX, targetY, startX, startY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('arrow_launch'); } catch (_) {}

  const drill = document.createElement('div');
  drill.style.position = 'fixed';
  drill.style.width = '18px';
  drill.style.height = '48px';
  drill.style.background = 'linear-gradient(180deg, #c084fc 0%, #ffffff 50%, #7e22ce 100%)';
  drill.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  drill.style.boxShadow = '0 0 20px #c084fc';
  drill.style.pointerEvents = 'none';
  drill.style.zIndex = '999999';
  layer.appendChild(drill);

  drill.animate([
    { transform: `translate3d(${startX - 9}px, ${startY}px, 0) rotate(0deg) scale(1.3)`, opacity: 1 },
    { transform: `translate3d(${targetX - 9}px, ${targetY}px, 0) rotate(1440deg) scale(0.8)`, opacity: 1 }
  ], { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)', fill: 'forwards' }).onfinish = () => {
    drill.remove();
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('plasma_damage'); } catch (_) {}
    setTimeout(() => {
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }, 180);
  };
}

// ----------------------------------------------------------------------------
// 10. METEORA A 45° (meteor_drop)
// ----------------------------------------------------------------------------
function executeMeteorDrop({ targetX, targetY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('cannon_hit'); } catch (_) {}

  const meteor = document.createElement('div');
  meteor.style.position = 'fixed';
  meteor.style.width = '32px';
  meteor.style.height = '32px';
  meteor.style.borderRadius = '50%';
  meteor.style.background = 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f97316 45%, #ef4444 80%, #000 100%)';
  meteor.style.boxShadow = '0 0 35px #f97316, 0 0 50px #ef4444';
  meteor.style.pointerEvents = 'none';
  meteor.style.zIndex = '999999';
  layer.appendChild(meteor);

  const startOffsetX = targetX - 160;
  const startOffsetY = targetY - 220;

  meteor.animate([
    { transform: `translate3d(${startOffsetX}px, ${startOffsetY}px, 0) rotate(-45deg) scale(1.6)`, opacity: 0.9 },
    { transform: `translate3d(${targetX - 16}px, ${targetY - 16}px, 0) rotate(-45deg) scale(0.9)`, opacity: 1 }
  ], { duration: 290, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
    meteor.remove();
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('plasma_damage'); } catch (_) {}
    setTimeout(() => {
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }, 200);
  };
}

// ----------------------------------------------------------------------------
// 11. FRATTURA CRIOGENICA (cryo_fracture)
// ----------------------------------------------------------------------------
function executeCryoFracture({ targetX, targetY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('convergenza'); } catch (_) {}

  const shardsCount = 8;
  for (let s = 0; s < shardsCount; s++) {
    const shard = document.createElement('div');
    shard.style.position = 'fixed';
    shard.style.width = '8px';
    shard.style.height = '18px';
    shard.style.background = 'linear-gradient(180deg, #ffffff 0%, #06b6d4 100%)';
    shard.style.boxShadow = '0 0 16px #06b6d4';
    shard.style.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
    shard.style.pointerEvents = 'none';
    shard.style.zIndex = '999999';
    layer.appendChild(shard);

    const angle = (s / shardsCount) * Math.PI * 2;
    const destX = targetX + Math.cos(angle) * 70;
    const destY = targetY + Math.sin(angle) * 70;

    shard.animate([
      { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(1.4)`, opacity: 1 },
      { transform: `translate3d(${destX}px, ${destY}px, 0) scale(0)`, opacity: 0 }
    ], { duration: 320, easing: 'ease-out' }).onfinish = () => shard.remove();
  }

  targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
  setTimeout(() => {
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    onComplete?.();
  }, 250);
}

// ----------------------------------------------------------------------------
// 12. SINGOLARITÀ / MICRO BUCO NERO (black_hole)
// ----------------------------------------------------------------------------
function executeBlackHole({ targetX, targetY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('convergenza'); } catch (_) {}

  const hole = document.createElement('div');
  hole.style.position = 'fixed';
  hole.style.width = '44px';
  hole.style.height = '44px';
  hole.style.borderRadius = '50%';
  hole.style.background = 'radial-gradient(circle, #020617 40%, #7e22ce 80%, #facc15 100%)';
  hole.style.boxShadow = '0 0 35px #7e22ce, inset 0 0 15px #facc15';
  hole.style.pointerEvents = 'none';
  hole.style.zIndex = '999999';
  layer.appendChild(hole);

  hole.animate([
    { transform: `translate3d(${targetX - 22}px, ${targetY - 22}px, 0) scale(0)`, opacity: 0 },
    { transform: `translate3d(${targetX - 22}px, ${targetY - 22}px, 0) scale(1.3) rotate(360deg)`, opacity: 1, offset: 0.5 },
    { transform: `translate3d(${targetX - 22}px, ${targetY - 22}px, 0) scale(0) rotate(720deg)`, opacity: 0 }
  ], { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).onfinish = () => {
    hole.remove();
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('plasma_damage'); } catch (_) {}
    onComplete?.();
  };
}

// ----------------------------------------------------------------------------
// 13. SILURO APOCALISSE (apocalypse_torpedo)
// ----------------------------------------------------------------------------
function executeApocalypseTorpedo({ targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('cannon_hit'); } catch (_) {}

  const torpedo = document.createElement('div');
  torpedo.style.position = 'fixed';
  torpedo.style.width = '18px';
  torpedo.style.height = '42px';
  torpedo.style.borderRadius = '8px';
  torpedo.style.background = 'linear-gradient(180deg, #facc15 0%, #ef4444 80%, #000 100%)';
  torpedo.style.boxShadow = '0 0 30px #facc15, 0 0 50px #ef4444';
  torpedo.style.pointerEvents = 'none';
  torpedo.style.zIndex = '999999';
  layer.appendChild(torpedo);

  const rot = isEnemyAttacking ? 180 : 0;

  torpedo.animate([
    { transform: `translate3d(${startX - 9}px, ${startY}px, 0) rotate(${rot}deg) scale(1.5)`, opacity: 0.9 },
    { transform: `translate3d(${targetX - 9}px, ${targetY - 21}px, 0) rotate(${rot}deg) scale(1)`, opacity: 1 }
  ], { duration: 340, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' }).onfinish = () => {
    torpedo.remove();

    // Flash bianco a pieno schermo
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = '#ffffff';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '1000000';
    document.body.appendChild(flash);

    flash.animate([
      { opacity: 0.9 },
      { opacity: 0 }
    ], { duration: 250, easing: 'ease-out' }).onfinish = () => flash.remove();

    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('plasma_damage'); } catch (_) {}

    setTimeout(() => {
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }, 220);
  };
}

// ----------------------------------------------------------------------------
// 14. CANNONE D'ASSEDIO / BOMBA (heavy_cannon & reactor_bomb)
// ----------------------------------------------------------------------------
function executeHeavyCannon({ level = 1, targetX, targetY, startX, startY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const ballSize = 22 + level * 5;
  const ball = document.createElement('div');
  ball.style.position = 'fixed';
  ball.style.width = `${ballSize}px`;
  ball.style.height = `${ballSize}px`;
  ball.style.borderRadius = '50%';
  ball.style.background = 'radial-gradient(circle at 35% 35%, #ffffff 0%, #ef4444 60%, #000 100%)';
  ball.style.boxShadow = '0 0 24px #ef4444, 0 0 35px #ffffff';
  ball.style.pointerEvents = 'none';
  ball.style.zIndex = '999999';
  layer.appendChild(ball);

  ball.animate([
    { transform: `translate3d(${startX - ballSize / 2}px, ${startY}px, 0) scale(1.4)`, opacity: 1 },
    { transform: `translate3d(${targetX - ballSize / 2}px, ${targetY - ballSize / 2}px, 0) scale(0.7)`, opacity: 1 }
  ], { duration: 280, easing: 'cubic-bezier(0.2, 0.7, 0.35, 1)', fill: 'forwards' }).onfinish = () => {
    ball.remove();
    targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
    void targetHpDock.offsetWidth;
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    try { playSound('cannon_hit'); } catch (_) {}
    setTimeout(() => {
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }, 200);
  };
}

// ============================================================================
// DISPATCHER PRINCIPALE DEI COLPI (BIDIREZIONALE SIMMETRICO)
// ============================================================================
export function fireWeaponCombatVFX(weapon, level = 1, { currentHp, maxHp, damage, onComplete, isEnemyAttacking = false }) {
  const targetDockId = isEnemyAttacking ? 'classicPlayerHpDock' : 'classicEnemyHpDock';
  const { layer, targetHpDock } = getCombatElements(targetDockId);

  if (!layer || !targetHpDock) return onComplete?.();

  const rect = targetHpDock.getBoundingClientRect();
  const hpLeft = rect.left;
  const hpWidth = rect.width;
  const targetY = rect.top + rect.height / 2;

  const enemyDock = document.getElementById('classicEnemyHpDock');
  const playerDock = document.getElementById('classicPlayerHpDock');

  let startX = window.innerWidth / 2;
  let startY = isEnemyAttacking ? 15 : (window.innerHeight - 15);

  if (isEnemyAttacking) {
    if (enemyDock) {
      const eRect = enemyDock.getBoundingClientRect();
      startX = eRect.left + eRect.width / 2;
      startY = eRect.top + eRect.height / 2;
    }
  } else {
    if (playerDock) {
      const pRect = playerDock.getBoundingClientRect();
      startX = pRect.left + pRect.width / 2;
      startY = pRect.top + pRect.height / 2;
    }
  }

  const startEdgeX = hpLeft + hpWidth * (Math.max(0, currentHp) / (maxHp || 1));
  const targetEdgeX = hpLeft + hpWidth * (Math.max(0, currentHp - damage) / (maxHp || 1));
  const midPointX = (startEdgeX + targetEdgeX) / 2;

  const fx = weapon?.fxType || 'gatling';

  // La Gatling proietta la sagoma della propria carta, dal proprio slot.
  // Se lo slot non esiste, mantiene l'effetto originale: nessun ologramma arbitrario.
  if (weapon?.id === 'wp_gatling') {
    const projected = projectGatlingHologram(weapon, level, {
      targetDockId, targetX: midPointX, targetY, isEnemyAttacking, onComplete
    });
    if (projected) return;
  }

  // 1. LASER A INCISIONE RADIALE SVG
  if (fx === 'railgun_beam') {
    return executeLaserSweep({
      level,
      emitterX: startX,
      emitterY: startY,
      startEdgeX,
      targetEdgeX,
      targetY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 2. TAGLIO FRAZIONATO A X
  if (fx === 'cross_laser') {
    return executeCrossLaser({
      level,
      emitterX: startX,
      startEdgeX,
      targetEdgeX,
      targetY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 3. TORRE TESLA / FULMINE / RAGGIO ORBITALE
  if (fx === 'lightning_strike' || fx === 'tesla_arc' || fx === 'orbital_pillar') {
    return executeTeslaLightning({
      level,
      targetX: midPointX,
      targetY,
      onComplete,
      targetDockId,
      isEnemyAttacking,
      isOrbital: fx === 'orbital_pillar'
    });
  }

  // 4. MICRORAZZI / FLAK A SCALINI
  if (fx === 'micro_missiles' || fx === 'flak_burst') {
    return executeMissileSalvo({
      level,
      startX,
      startY,
      hpLeft,
      hpWidth,
      currentHp,
      maxHp,
      damage,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 5. SIFONE DI SANGUE
  if (fx === 'blood_siphon') {
    return executeBloodSiphon({
      level,
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId
    });
  }

  // 6. GATLING CINETICA, DARDI FUSI E LAME ROTANTI
  if (fx === 'gatling' || fx === 'disc_blades' || fx === 'fuse_bolts') {
    return executeGatlingSpray({
      level,
      targetX: startEdgeX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking,
      mode: fx
    });
  }

  // 7. ARCO-X BALISTICO
  if (fx === 'arrow_barrage') {
    return executeArrowBarrage({
      level,
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 8. LAMA SISMICA
  if (fx === 'seismic_wave') {
    return executeSeismicWave({
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 9. TRIVELLA A TORSIONE
  if (fx === 'kinetic_drill') {
    return executeKineticDrill({
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId
    });
  }

  // 10. METEORA A 45°
  if (fx === 'meteor_drop') {
    return executeMeteorDrop({
      targetX: midPointX,
      targetY,
      onComplete,
      targetDockId
    });
  }

  // 11. FRATTURA CRIOGENICA
  if (fx === 'cryo_fracture') {
    return executeCryoFracture({
      targetX: midPointX,
      targetY,
      onComplete,
      targetDockId
    });
  }

  // 12. MICRO BUCO NERO
  if (fx === 'black_hole') {
    return executeBlackHole({
      targetX: midPointX,
      targetY,
      onComplete,
      targetDockId
    });
  }

  // 13. SILURO APOCALISSE
  if (fx === 'apocalypse_torpedo') {
    return executeApocalypseTorpedo({
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 14. DEFAULT: CANNONE PESANTE / BOMBA (heavy_cannon & reactor_bomb)
  return executeHeavyCannon({
    level,
    targetX: midPointX,
    targetY,
    startX,
    startY,
    onComplete,
    targetDockId
  });
}
