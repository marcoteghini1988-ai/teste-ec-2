// Gatling: proiezione legata allo slot effettivo di chi attacca.
// Il file PNG trasparente conserva la sagoma approvata per il livello; Three.js
// aggiunge profondità/oscillazione, e l'animazione emerge dalla carta.
import * as THREE from 'three';
import { playSound } from './audio';
import './gatlingHologram.css';

const normalizeLevel = level => Math.max(1, Math.min(4, Math.round(Number(level) || 1)));

function findCardSlot(weapon, isEnemyAttacking) {
  const selector = isEnemyAttacking ? '[data-enemy-weapon-slot]' : '[data-player-weapon-slot]';
  const slots = [...document.querySelectorAll(selector)];
  const id = weapon?.id || weapon?.weaponId;
  if (!id) return null;

  // Preferenza assoluta allo slot dell'arma che sta sparando.
  const index = weapon?.slotIdx ?? weapon?.slotIndex;
  if (index !== undefined && index !== null) {
    const exact = slots.find(el => el.dataset.weaponId === id && String(el.dataset.weaponSlotIndex) === String(index));
    if (exact) return exact;
  }
  // Vecchi salvataggi senza slotIdx: usa comunque soltanto il lato e l'arma corretti.
  return slots.find(el => el.dataset.weaponId === id) || null;
}

export function projectGatlingHologram(weapon, passedLevel, { targetDockId, targetX, targetY, isEnemyAttacking = false, onComplete } = {}) {
  if (typeof document === 'undefined') return false;
  const source = findCardSlot(weapon, isEnemyAttacking);
  if (!source) return false;
  const box = source.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;

  const level = normalizeLevel(source.dataset.weaponLevel || passedLevel);
  const imageSrc = isEnemyAttacking
    ? `/assets/weapons/gatling_holo_down_lv${level}.png`
    : `/assets/weapons/gatling_holo_up_lv${level}.png`;
  const target = document.getElementById(targetDockId);
  const targetBox = target?.getBoundingClientRect();
  const tx = Number.isFinite(targetX) ? targetX : (targetBox ? targetBox.left + targetBox.width / 2 : innerWidth / 2);
  const ty = Number.isFinite(targetY) ? targetY : (targetBox ? targetBox.top + targetBox.height / 2 : innerHeight / 2);

  // L'asse verticale punta dal bordo della CARTA verso l'avversario.
  // player = su, nemico = giù. Nessun posizionamento rispetto al centro dello schermo.
  const direction = isEnemyAttacking ? 1 : -1;
  const centerX = box.left + box.width / 2;
  const cardEdgeY = isEnemyAttacking ? box.bottom - 2 : box.top + 2;
  const width = Math.max(112, Math.min(175, window.innerWidth * 0.35));
  const height = width;
  const left = centerX - width / 2;
  const top = direction > 0 ? cardEdgeY : cardEdgeY - height;
  const hue = isEnemyAttacking ? '#ff648d' : '#4fe8ff';

  const host = document.createElement('div');
  host.className = `gatling-holo-host ${isEnemyAttacking ? 'enemy' : 'player'}`;
  host.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;--holo:${hue};`;
  const platform = document.createElement('div');
  platform.className = 'gatling-holo-platform';
  const scans = document.createElement('div');
  scans.className = 'gatling-holo-scans';
  const caption = document.createElement('div');
  caption.className = 'gatling-holo-caption';
  caption.textContent = `GATLING · LV ${level}`;
  host.append(platform, scans, caption);
  document.body.appendChild(host);

  const sourceStyleClass = isEnemyAttacking ? 'gatling-holo-source-enemy' : 'gatling-holo-source-player';
  source.classList.add('gatling-holo-source', sourceStyleClass);

  let renderer = null;
  let scene = null;
  let texture = null;
  let model = null;
  let frame = 0;
  let completed = false;
  let usingFallback = false;
  let retracting = false;
  let lastShot = -1000;
  const shots = new Set();
  const started = performance.now();
  const duration = 2650;
  const retractAt = duration - 380;
  const shotsStart = 670;
  const shotsEnd = 1900;

  function cleanup() {
    if (completed) return;
    completed = true;
    cancelAnimationFrame(frame);
    for (const shot of shots) shot.remove();
    shots.clear();
    source.classList.remove('gatling-holo-source', sourceStyleClass);
    if (scene) scene.traverse(item => {
      if (item.isMesh) { item.geometry?.dispose(); item.material?.dispose(); }
    });
    texture?.dispose();
    renderer?.dispose();
    renderer?.domElement?.remove();
    host.remove();
    onComplete?.();
  }

  function projectile() {
    // Bocca della Gatling: gli asset sono già orientati in alto o in basso.
    const sx = centerX;
    const sy = cardEdgeY + direction * height * 0.79;
    const dx = tx - sx;
    const dy = ty - sy;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const bullet = document.createElement('div');
    bullet.className = 'gatling-holo-bullet';
    bullet.style.cssText = `left:${sx}px;top:${sy}px;--shot:${hue};`;
    document.body.appendChild(bullet);
    shots.add(bullet);
    const release = () => {
      shots.delete(bullet);
      bullet.remove();
      target?.classList.add('bar-hit-flash', 'bar-shiver');
      setTimeout(() => target?.classList.remove('bar-hit-flash', 'bar-shiver'), 130);
    };
    if (typeof bullet.animate === 'function') {
      const anim = bullet.animate([
        { transform: `rotate(${angle}deg) scaleX(.5)`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${angle}deg) scaleX(1.15)`, opacity: 1 }
      ], { duration: 320, easing: 'ease-in', fill: 'forwards' });
      anim.onfinish = release;
    } else {
      bullet.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}deg)`;
      setTimeout(release, 320);
    }
    try { playSound('plasma_damage'); } catch (_) { /* audio opzionale */ }
  }

  function update(time) {
    if (completed) return false;
    const elapsed = time - started;
    if (!retracting && elapsed >= retractAt) {
      retracting = true;
      host.classList.add('retracting');
    }
    if (elapsed >= shotsStart && elapsed < shotsEnd && elapsed - lastShot >= 150) {
      projectile();
      lastShot = elapsed;
    }
    if (elapsed >= duration) { cleanup(); return false; }
    return true;
  }

  function startFallback() {
    if (usingFallback || completed) return;
    usingFallback = true;
    renderer?.domElement?.remove();
    renderer?.dispose();
    renderer = null;
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = `Ologramma Gatling Cinetica livello ${level}`;
    img.className = 'gatling-holo-fallback-art';
    host.appendChild(img);
    const tick = t => {
      if (!update(t)) return;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'gatling-holo-canvas';
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    camera.position.set(0, 0, 7.8);
    camera.lookAt(0, 0, 0);
    model = new THREE.Group();
    scene.add(model);
    // Nessuna rotazione forzata dell'illustrazione: ogni lato usa il proprio asset dedicato.
    texture = new THREE.TextureLoader().load(imageSrc, undefined, undefined, () => startFallback());
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(3.65, 3.25);
    const front = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.98, side: THREE.DoubleSide, depthWrite: false }));
    model.add(front);
    const aura = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 3.35), new THREE.MeshBasicMaterial({ map: texture, color: isEnemyAttacking ? 0xff7894 : 0x5ce8ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.position.z = -0.15;
    model.add(aura);

    const tick = time => {
      if (usingFallback || !update(time)) return;
      const elapsed = time - started;
      model.rotation.z = Math.sin(elapsed * 0.003) * 0.018;
      const emerge = Math.min(1, elapsed / 320);
      const retractFactor = elapsed >= retractAt ? Math.max(0, 1 - ((elapsed - retractAt) / (duration - retractAt))) : 1;
      const travel = emerge * retractFactor;
      model.rotation.y = Math.sin(elapsed * 0.0017) * 0.10;
      model.position.y = direction * (-0.85 + travel * 0.85) + Math.sin(elapsed * 0.003) * 0.04;
      model.scale.setScalar(0.62 + travel * 0.38);
      aura.scale.copy(model.scale);
      front.material.opacity = 0.25 + travel * 0.73;
      aura.material.opacity = (.10 + .06 * Math.sin(elapsed * 0.011)) * (0.4 + travel * 0.6);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  } catch (err) {
    console.warn('Gatling: WebGL non disponibile, mantengo la proiezione con PNG.', err);
    startFallback();
  }
  return true;
}
