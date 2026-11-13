// Everything that walks, built from jointed parts and animated from the
// simulation's state: a spine that bends into a turn, a tail that follows a
// beat behind, knees that fold, a jaw that opens before the lunge. Faces +x.

import * as THREE from 'three';
import type { EnemyId } from './data';
import type { Enemy } from './state';

type Mat = THREE.MeshStandardMaterial;
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const group = (x: number, y: number, z: number, ...kids: THREE.Object3D[]): THREE.Group => { const g = new THREE.Group(); g.position.set(x, y, z); g.add(...kids); return g; };
const ball = (r: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry => new THREE.SphereGeometry(r, 14, 10).scale(sx, sy, sz);
const cap = (r: number, len: number): THREE.BufferGeometry => new THREE.CapsuleGeometry(r, len, 4, 10);
const along = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.rotateZ(-Math.PI / 2);
const basic = (c: number, k = 1): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

const hides = new Map<string, THREE.CanvasTexture[]>();
/** Skin: mottled hide, plated shell or bark, with relief so the torch finds the edges. */
function hide(kind: 'hide' | 'shell' | 'bark'): THREE.CanvasTexture[] {
  const got = hides.get(kind);
  if (got) return got;
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  let s = kind.length * 97;
  const r = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, n, n);
  if (kind === 'hide') for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,40,40' : '230,230,230'},${0.08 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * n, r() * n, 3 + r() * 12, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  if (kind === 'shell') for (let y = -8; y < n; y += 14) for (let x = -8; x < n + 8; x += 16) { const v = 110 + r() * 110; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(x + (Math.round(y / 14) % 2 ? 8 : 0), y, 9, 8, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(20,20,20,0.6)'; g.stroke(); }
  if (kind === 'bark') for (let i = 0; i < 70; i++) { const v = 60 + r() * 150; g.strokeStyle = `rgba(${v},${v},${v},0.6)`; g.lineWidth = 1 + r() * 4; g.beginPath(); let x = r() * n, y = 0; g.moveTo(x, y); while (y < n) { x += r() * 8 - 4; y += 6 + r() * 10; g.lineTo(x, y); } g.stroke(); }
  const d = g.getImageData(0, 0, n, n).data, nc = document.createElement('canvas');
  nc.width = nc.height = n;
  const ng = nc.getContext('2d')!, o = ng.createImageData(n, n);
  const h = (x: number, y: number): number => d[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = (h(x + 1, y) - h(x - 1, y)) * 2.4, dy = (h(x, y + 1) - h(x, y - 1)) * 2.4, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4; o.data[i] = (-dx / l * 0.5 + 0.5) * 255; o.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; o.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; o.data[i + 3] = 255; }
  ng.putImageData(o, 0, 0);
  const map = new THREE.CanvasTexture(c), nrm = new THREE.CanvasTexture(nc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); }
  hides.set(kind, [map, nrm]);
  return [map, nrm];
}
const skinOf = (kind: 'hide' | 'shell' | 'bark', color: number, rough: number): Mat => { const [map, normalMap] = hide(kind); return new THREE.MeshStandardMaterial({ color, map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: rough, metalness: 0.05 }); };

/** A two-bone limb hanging from its top: [upper, lower]. Turning either about z swings it fore and aft. */
function limb(lenU: number, rU: number, lenL: number, rL: number, m: Mat, foot: THREE.Object3D | null = null): [THREE.Group, THREE.Group] {
  const lower = group(0, -lenU, 0, mesh(cap(rL, lenL - rL).translate(0, -lenL / 2, 0), m), mesh(ball(rL * 1.25), m));
  if (foot) { foot.position.y = -lenL; lower.add(foot); }
  return [group(0, 0, 0, mesh(cap(rU, lenU - rU).translate(0, -lenU / 2, 0), m), lower), lower];
}

export interface Creature {
  root: THREE.Group; body: THREE.Group; skin: Mat; yaw: number;
  p: Record<string, THREE.Object3D>; legs: [THREE.Group, THREE.Group][]; chain: THREE.Group[]; tail: THREE.Group[];
}

export function creature(type: EnemyId): Creature {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const p: Record<string, THREE.Object3D> = {}, legs: [THREE.Group, THREE.Group][] = [], chain: THREE.Group[] = [], tail: THREE.Group[] = [];
  let skin: Mat;
  const eyes = (m: THREE.Material, r: number, x: number, y: number, z: number): THREE.Mesh[] => [mesh(ball(r), m, x, y, z), mesh(ball(r), m, x, y, -z)].map((o) => { o.castShadow = false; return o; });

  if (type === 'skulker') {
    skin = skinOf('hide', 0x5a6a70, 0.5);
    const dark = skinOf('hide', 0x30393d, 0.6);
    const jaw = group(0.06, -0.07, 0, mesh(along(new THREE.ConeGeometry(0.1, 0.34, 6)).scale(1, 0.45, 0.85), dark, 0.16, 0, 0));
    for (let i = 0; i < 4; i++) jaw.add(mesh(new THREE.ConeGeometry(0.014, 0.06, 4), basic(0xdfe6e0, 0.8), 0.1 + i * 0.055, 0.035, i % 2 ? 0.05 : -0.05));
    const head = group(0.2, 0.03, 0, mesh(ball(0.17, 1.25, 0.8, 0.9), skin), mesh(along(new THREE.ConeGeometry(0.12, 0.36, 7)).scale(1, 0.6, 0.9), skin, 0.26, 0.0, 0), ...eyes(basic(0xd8fff6, 2.2), 0.032, 0.16, 0.085, 0.105), ...eyes(basic(0xd8fff6, 1.4), 0.02, 0.24, 0.07, 0.085), jaw);
    const neck = group(0.26, 0.09, 0, mesh(along(cap(0.13, 0.2)), skin, 0.08, 0, 0), head);
    const chest = group(0.38, 0.03, 0, mesh(ball(0.3, 1.2, 1, 0.92), skin), neck);
    for (let i = 0; i < 5; i++) chest.add(mesh(new THREE.ConeGeometry(0.04, 0.2 - i * 0.02, 4), dark, 0.2 - i * 0.14, 0.27 - i * 0.012, 0));
    const mid = group(0.4, 0.0, 0, mesh(along(cap(0.2, 0.3)), skin, 0.05, -0.01, 0), chest);
    const hips = group(-0.45, 0.74, 0, mesh(ball(0.25, 1.25, 0.95, 0.88), skin), mid);
    let at: THREE.Group = hips;
    for (let i = 0; i < 5; i++) { const len = 0.26 - i * 0.02, seg = group(i ? -(0.28 - i * 0.02) : -0.24, i ? 0 : 0.04, 0, mesh(along(cap(0.075 - i * 0.012, len)).translate(-len / 2 - 0.02, 0, 0), i > 2 ? dark : skin)); at.add(seg); tail.push(seg); at = seg; }
    const paw = (): THREE.Mesh => mesh(ball(0.07, 1.5, 0.6, 1.1), dark, 0.03, 0, 0);
    for (const z of [0.22, -0.22]) { const l = limb(0.36, 0.08, 0.38, 0.05, skin, paw()); l[0].position.set(0.06, -0.1, z); chest.add(l[0]); legs.push(l); }
    for (const z of [0.2, -0.2]) { const l = limb(0.4, 0.1, 0.4, 0.055, skin, paw()); l[0].position.set(-0.04, -0.06, z); hips.add(l[0]); legs.push(l); }
    body.add(hips);
    chain.push(hips, mid, chest, neck, head);
    p.jaw = jaw;
  } else if (type === 'mite') {
    skin = skinOf('shell', 0x55676c, 0.3);
    const head = group(0.2, 0.2, 0, mesh(ball(0.1, 1.1, 0.8, 1), skin), ...eyes(basic(0xc9f7ee, 2), 0.03, 0.07, 0.04, 0.05));
    for (const z of [0.05, -0.05]) { const m = mesh(along(new THREE.ConeGeometry(0.02, 0.14, 4)), skin, 0.14, -0.02, z); m.rotation.y = z > 0 ? -0.5 : 0.5; head.add(m); }
    body.add(mesh(ball(0.2, 1.3, 0.72, 1), skin, -0.02, 0.24, 0), head);
    for (let i = 0; i < 6; i++) { const l = limb(0.16, 0.02, 0.2, 0.014, skin); l[0].position.set(0.12 - (i >> 1) * 0.13, 0.24, i % 2 ? 0.13 : -0.13); l[0].rotation.x = i % 2 ? -1.9 : 1.9; l[1].rotation.x = i % 2 ? 1.5 : -1.5; body.add(l[0]); legs.push(l); }
    p.head = head;
  } else if (type === 'spitter') {
    skin = skinOf('shell', 0x6a6478, 0.42);
    const sac = new THREE.Mesh(ball(0.26, 1, 1.1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc94fd0).multiplyScalar(1.3), transparent: true, opacity: 0.9 }));
    sac.position.set(0.06, 0.26, 0);
    const bulb = group(0, 1.0, 0, mesh(ball(0.36, 1.1, 0.85, 1), skin), sac, mesh(along(new THREE.ConeGeometry(0.11, 0.3, 7)), skin, 0.42, 0.02, 0), ...eyes(basic(0xffc9f2, 1.8), 0.03, 0.3, 0.12, 0.16));
    for (let i = 0; i < 3; i++) {
      const l = limb(0.75, 0.05, 1.32, 0.032, skin);
      const hip = group(0, -0.05, 0, l[0]);
      hip.rotation.y = i * 2.094 + 1.047; l[0].position.x = 0.2;
      bulb.add(hip); legs.push(l);
    }
    body.add(bulb);
    p.sac = sac; p.bulb = bulb;
  } else if (type === 'husk') {
    skin = skinOf('bark', 0x767d6c, 0.9);
    const moss = new THREE.MeshStandardMaterial({ color: 0x24492d, roughness: 1 });
    const head = group(0.62, 0.95, 0, mesh(ball(0.24, 1.1, 0.9, 1), skin), mesh(ball(0.16, 1.2, 0.5, 1), skin, 0.1, -0.16, 0), ...eyes(basic(0xff9c7a, 2.2), 0.035, 0.2, 0.03, 0.1));
    const torso = group(0.05, 0.95, 0, mesh(ball(0.72, 1, 1.05, 1.05), skin, 0, 0.5, 0), mesh(ball(0.55, 1.1, 0.9, 1.1), skin, -0.32, 0.98, 0), head);
    for (let i = 0; i < 5; i++) torso.add(mesh(ball(0.36, 1, 0.3, 1.25), i % 2 ? moss : skin, -0.5 + i * 0.1, 0.5 + i * 0.26, 0));
    for (let i = 0; i < 9; i++) { const a = i * 2.4, m = mesh(new THREE.ConeGeometry(0.05, 0.3 + (i % 3) * 0.12, 4), moss, -0.35 + Math.cos(a) * 0.3, 1.45 + (i % 2) * 0.06, Math.sin(a) * 0.4); m.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.4); torso.add(m); }
    for (let i = 0; i < 6; i++) { const m = mesh(ball(0.035), basic(0x37d3bf, 1.8), -0.5 + (i % 3) * 0.2, 1.0 + (i >> 1) * 0.16, i % 2 ? 0.42 : -0.42); m.castShadow = false; torso.add(m); }
    for (const z of [0.86, -0.86]) { const l = limb(0.85, 0.2, 0.75, 0.22, skin, mesh(ball(0.3, 1, 0.85, 1), skin)); l[0].position.set(0.22, 1.12, z); torso.add(l[0]); legs.push(l); }
    for (const z of [0.38, -0.38]) { const l = limb(0.48, 0.25, 0.42, 0.2, skin, mesh(ball(0.24, 1.3, 0.6, 1.1), skin)); l[0].position.set(0, 0.93, z); body.add(l[0]); legs.push(l); }
    body.add(mesh(ball(0.48, 1, 0.8, 1.1), skin, 0, 0.92, 0), torso);
    p.torso = torso; p.head = head;
  } else if (type === 'unlit') {
    // No eyes, no glow. It is only ever seen as a shape against lit stone.
    skin = new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 1 });
    const hand = (): THREE.Group => { const h = group(0, 0, 0); for (let i = 0; i < 3; i++) { const f = mesh(new THREE.ConeGeometry(0.014, 0.22, 4).translate(0, -0.11, 0), skin); f.rotation.x = (i - 1) * 0.35; h.add(f); } return h; };
    const head = group(0.03, 0.72, 0, mesh(ball(0.13, 0.9, 1.3, 0.9), skin, 0, 0.12, 0));
    const torso = group(0, 1.2, 0, mesh(cap(0.13, 0.5), skin, 0, 0.36, 0), mesh(ball(0.17, 0.9, 0.7, 1.3), skin, 0, 0.62, 0), head);
    for (const z of [0.22, -0.22]) { const l = limb(0.62, 0.042, 0.72, 0.035, skin, hand()); l[0].position.set(0, 0.64, z); torso.add(l[0]); legs.push(l); }
    for (const z of [0.1, -0.1]) { const l = limb(0.6, 0.065, 0.62, 0.05, skin); l[0].position.set(0, 1.22, z); body.add(l[0]); legs.push(l); }
    body.add(torso);
    p.torso = torso; p.head = head;
  } else if (type === 'grazer') {
    skin = new THREE.MeshStandardMaterial({ color: 0x2a3a3c, roughness: 0.5 });
    const lamp = new THREE.Mesh(ball(0.1, 1.2, 1, 1), basic(0x7ff0e0, 1.8));
    lamp.position.set(-0.13, 0, 0);
    body.add(mesh(ball(0.1, 1.3, 0.9, 0.9), skin, 0.05, 0, 0), lamp);
    for (const z of [0.16, -0.16]) { const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.14), new THREE.MeshBasicMaterial({ color: 0x9fb9b6, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); wing.position.set(0, 0.05, z); p[z > 0 ? 'wingL' : 'wingR'] = wing; body.add(wing); }
  } else {
    // Warden work: struts, a core, rings. Nothing grown.
    skin = new THREE.MeshStandardMaterial({ color: 0xdfe8ec, emissive: 0x8fa3ad, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), basic(0xf3fbff, 1.25));
    core.position.y = 2.1;
    const ring = mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 32).rotateX(Math.PI / 2), skin, 0, 2.1, 0);
    const ring2 = mesh(new THREE.TorusGeometry(0.85, 0.03, 6, 28), skin, 0, 2.1, 0);
    body.add(core, ring, ring2);
    for (let i = 0; i < 6; i++) { const l = limb(1.3, 0.05, 1.7, 0.035, skin); const hip = group(0, 2.0, 0, l[0]); hip.rotation.y = (i / 6) * 6.283; l[0].position.x = 0.5; body.add(hip); legs.push(l); }
    p.core = core; p.ring = ring; p.ring2 = ring2;
    if (type === 'warden') root.scale.setScalar(0.48);
  }
  return { root, body, skin, yaw: 0, p, legs, chain, tail };
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Pose a living creature from what the simulation says it is doing. */
export function animateCreature(c: Creature, e: Enemy, t: number, dt: number): void {
  const { body, legs, chain, tail, p } = c;
  // Nothing alive turns on the spot: the body follows the heading a beat behind.
  const lean = Math.atan2(Math.sin(e.face - c.yaw), Math.cos(e.face - c.yaw));
  c.yaw += lean * Math.min(1, dt * (e.type === 'unlit' ? 60 : e.state === 'windup' ? 18 : 8));
  c.root.rotation.y = -c.yaw;
  // caught in the light it holds whatever pose it had: that is the horror of it
  if (e.type === 'unlit' && (e.frozen || e.state === 'recover')) return;
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.scale.setScalar(1);
  const speed = Math.hypot(e.sx, e.sz), go = Math.min(1, speed / 1.4), g = e.gait, breath = Math.sin(t * 1.8 + e.id);
  const wind = e.state === 'windup', strike = e.state === 'strike';

  if (e.type === 'skulker') {
    const [hips, mid, chest, neck, head] = chain;
    const ph = g * 2.6, crouch = wind ? 1 : 0;
    // the spine takes the turn a segment at a time, and flexes with each bound
    hips.rotation.set(0, -lean * 0.35, Math.sin(ph) * 0.07 * go + crouch * 0.22);
    mid.rotation.set(0, lean * 0.3, -Math.sin(ph) * 0.1 * go - crouch * 0.2);
    chest.rotation.set(0, lean * 0.3, Math.sin(ph + 0.6) * 0.06 * go - crouch * 0.15 + (strike ? 0.2 : 0));
    neck.rotation.set(0, lean * 0.3, 0.1 + crouch * 0.25 + (strike ? 0.25 : 0));
    const idle = e.state === 'idle' ? 1 : 0;
    head.rotation.set(Math.sin(t * 0.9 + e.id) * 0.12 * idle, lean * 0.4 + Math.sin(t * 0.6 + e.id * 2) * 0.55 * idle, -0.12 + Math.sin(t * 0.37 + e.id) * 0.15 * idle);
    p.jaw.rotation.z = -(wind ? 0.5 : strike ? 0.85 : 0.06 + Math.max(0, breath) * 0.06);
    body.position.y = Math.abs(Math.sin(ph)) * 0.07 * go - crouch * 0.2 + breath * 0.008;
    body.rotation.x = lean * 0.35;
    tail.forEach((s, i) => s.rotation.set(0, Math.sin(t * 2.4 - i * 0.7 + e.id) * (0.14 + i * 0.05) - lean * 0.45, 0.1 - crouch * 0.25 + (strike ? 0.2 : 0)));
    legs.forEach(([u, l], i) => {
      const front = i < 2, a = ph + (front ? 0 : 2.3) + (i % 2 ? Math.PI : 0), sw = Math.sin(a) * 0.62 * go;
      u.rotation.z = (front ? -0.2 : 0.5) + sw + (strike ? (front ? 1.2 : -1.0) : 0) + crouch * (front ? 0.5 : 0.35);
      l.rotation.z = (front ? 0.45 : -0.95) - Math.max(0, Math.cos(a)) * 0.75 * go * (front ? -1 : 1) - crouch * (front ? 0.9 : -0.5) + (strike ? (front ? -0.5 : 0.7) : 0);
    });
    if (strike) body.scale.set(1.12, 0.92, 0.95);
  } else if (e.type === 'mite') {
    body.position.y = go * Math.abs(Math.sin(g * 9)) * 0.05;
    body.rotation.set(lean * 0.6, 0, Math.sin(g * 9) * 0.1 * go + (wind ? 0.35 : 0));
    p.head.rotation.y = Math.sin(t * 7 + e.id) * 0.3;
    legs.forEach(([u], i) => { u.rotation.z = Math.sin(g * 18 + i * 2.1) * 0.6 * go; });
  } else if (e.type === 'spitter') {
    const swell = wind ? 1 + (1 - e.t / 0.55) * 0.7 : 1 + breath * 0.07;
    p.sac.scale.setScalar(swell);
    p.bulb.position.y = 1.0 + Math.sin(g * 5) * 0.05 * go + breath * 0.03 - (wind ? 0.12 : 0);
    p.bulb.rotation.set(Math.sin(g * 2.5) * 0.06 * go, 0, (wind ? 0.3 : 0) - 0.08 * go);
    // each leg lifts in turn: knee up, foot down
    legs.forEach(([u, l], i) => { const lift = Math.max(0, Math.sin(g * 5 + i * 2.094)) * 0.3 * go; u.rotation.z = 2.0 + lift + breath * 0.02; l.rotation.z = -2.3 - lift * 1.4; });
  } else if (e.type === 'husk') {
    const up = wind ? 1 - e.t / 0.8 : 0, step = Math.sin(g * 1.6), torso = p.torso;
    // it heaves itself along on its knuckles, weight thrown from one side to the other
    torso.rotation.set(step * 0.12 * go, 0, -0.32 + Math.abs(step) * 0.05 * go + breath * 0.012 + up * 0.55);
    torso.position.y = 0.95 + Math.abs(Math.cos(g * 1.6)) * 0.06 * go;
    p.head.rotation.set(0, lean * 0.6 + (e.state === 'idle' ? Math.sin(t * 0.5 + e.id) * 0.4 : 0), 0.2);
    for (let i = 0; i < 2; i++) { const s = i ? -step : step, [u, l] = legs[i]; u.rotation.z = 0.75 + s * 0.4 * go + up * 2.0; l.rotation.z = -0.45 - Math.max(0, s) * 0.3 * go - up * 0.5; }
    for (let i = 2; i < 4; i++) { const s = i === 2 ? -step : step, [u, l] = legs[i]; u.rotation.z = s * 0.5 * go; l.rotation.z = -Math.max(0, -s) * 0.6 * go; }
    if (strike) { torso.rotation.z = -0.75; legs[0][0].rotation.z = legs[1][0].rotation.z = 1.0; legs[0][1].rotation.z = legs[1][1].rotation.z = -0.1; }
    if (e.state === 'recover') torso.rotation.z = -0.5;
  } else if (e.type === 'unlit') {
    // when nothing is looking it comes fast, bent forward, hands out
    const ph = g * 3.2;
    p.torso.rotation.set(Math.sin(t * 31) * 0.04, 0, -0.5);
    p.head.rotation.set(0, 0, 0.5 + Math.sin(t * 43) * 0.1);
    legs[0][0].rotation.z = 1.5 + Math.sin(ph) * 0.3; legs[0][1].rotation.z = 0.35;
    legs[1][0].rotation.z = 1.2 - Math.sin(ph) * 0.3; legs[1][1].rotation.z = 0.55;
    legs[2][0].rotation.z = Math.sin(ph) * 0.9; legs[2][1].rotation.z = -Math.max(0, Math.cos(ph)) * 1.1;
    legs[3][0].rotation.z = -Math.sin(ph) * 0.9; legs[3][1].rotation.z = -Math.max(0, -Math.cos(ph)) * 1.1;
    body.position.y = -0.08 + Math.abs(Math.sin(ph)) * 0.05;
  } else if (e.type === 'grazer') {
    body.position.y = 0.75 + Math.sin(t * 2.3 + e.id) * 0.25;
    body.rotation.z = Math.sin(t * 3.1 + e.id) * 0.2;
    p.wingL.rotation.x = Math.PI / 2 + Math.sin(t * 50 + e.id) * 0.7; p.wingR.rotation.x = Math.PI / 2 - Math.sin(t * 50 + e.id) * 0.7;
  } else {
    const angry = e.type === 'tender' || e.phase === 1;
    p.ring.rotation.y = t * (angry ? 2.4 : 0.8); p.ring2.rotation.set(t * 0.9, t * 0.6, 0); p.core.rotation.set(t * 0.7, -t, 0);
    p.core.scale.setScalar(wind ? 1.35 : 1 + breath * 0.05);
    body.position.y = Math.sin(t * 1.4 + e.id) * 0.15;
    // six legs walking in two tripods, feet planted wide
    legs.forEach(([u, l], i) => { const lift = Math.max(0, Math.sin(g * 2.2 + (i % 2) * Math.PI)) * 0.25 * go; u.rotation.z = 2.05 + lift + Math.sin(t * 1.4 + e.id) * 0.03; l.rotation.z = -2.45 - lift * 1.3; });
  }
  if (e.state === 'stagger') { body.rotation.z += 0.28; body.position.x -= 0.1; }
  void lerp;
}
