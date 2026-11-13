// Everything is built in code: plants from a campaign's dealt looks, the
// operative, the creatures, the props. All models face +x.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fork, range } from './rng';
import type { RngHost } from './rng';
import type { Species } from './state';

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
export const srgb = (h: number, s: number, l: number): THREE.Color => new THREE.Color().setHSL((((h % 360) + 360) % 360) / 360, s, l, THREE.SRGBColorSpace);

/** Bake a transform and a per-vertex colour into a primitive so it can be merged. */
function part(g: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number], scale: [number, number, number], colour: (y: number, i: number) => THREE.Color): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g.clone();
  out.applyMatrix4(M.compose(V.set(...pos), Q.setFromEuler(E.set(rot[0], rot[1], rot[2], 'YXZ')), S.set(...scale)));
  const p = out.getAttribute('position');
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) colour(p.getY(i), i).toArray(c, i * 3);
  out.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return out;
}

const CONE = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);

/**
 * One leaf: a strip that rises, bends over under its own weight, swells and
 * comes to a point, folded along a midrib so light catches each half differently.
 */
export function bladeGeo(len: number, width: number, bend: number, n = 6): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  let x = 0, y = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = bend * Math.max(0, (i - 0.5) / n) * t;
    if (i) { x += Math.sin(a) * (len / n); y += Math.cos(a) * (len / n); }
    const half = width * (Math.sin(Math.PI * Math.pow(t, 0.62)) * 0.92 + 0.12 * (1 - t)) * (i === n ? 0 : 1);
    const fold = half * 0.38;
    pos.push(x, y, -half, x - Math.cos(a) * fold, y + Math.sin(a) * fold, 0, x, y, half);
    uv.push(0, t, 0.5, t, 1, t);
    if (i < n) { const b = i * 3; index.push(b, b + 1, b + 4, b, b + 4, b + 3, b + 1, b + 2, b + 5, b + 1, b + 5, b + 4); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Veins and a darker margin, laid over whatever colour the leaf was dealt. */
export function leafTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, '#8a8a8a'); grad.addColorStop(0.2, '#d8d8d8'); grad.addColorStop(0.5, '#f4f4f4'); grad.addColorStop(0.8, '#d8d8d8'); grad.addColorStop(1, '#8a8a8a');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 256); g.stroke();
  g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 1.6;
  for (let y = 8; y < 256; y += 15) { g.beginPath(); g.moveTo(64, y + 14); g.quadraticCurveTo(40, y + 4, 6, y - 6); g.moveTo(64, y + 14); g.quadraticCurveTo(88, y + 4, 122, y - 6); g.stroke(); }
  let s = 13;
  const r = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(30,30,30,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * 128, r() * 256, 1 + r() * 3.5, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const BALL = new THREE.IcosahedronGeometry(1, 1);
const TUBE = new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0);

export interface PlantGeo { body: THREE.BufferGeometry; glow: THREE.BufferGeometry; height: number }

/** A species as it looks this campaign. Nothing here reads its behaviour. */
export function plantGeometry(s: Species, seed: number, variant: number): PlantGeo {
  const h = fork(seed, 900, s.id, variant);
  const j = (a: number, b: number): number => range(h, a, b);
  const sat = s.vivid ? 0.62 : 0.42, lum = s.vivid ? 0.34 : 0.25;
  const base = srgb(s.hue, sat, lum), dark = srgb(s.hue, sat, lum * 0.45), light = srgb(s.hue + 12, sat, lum * 1.7);
  const tmp = new THREE.Color();
  let top = 1.2;
  const body = (y: number, i: number): THREE.Color => {
    const t = Math.max(0, Math.min(1, y / top));
    tmp.copy(dark).lerp(base, t);
    if (s.pattern === 1) tmp.lerp(light, t * t * 0.8);
    if (s.pattern === 2 && Math.sin(y * 14) > 0.3) tmp.lerp(dark, 0.6);
    if (s.pattern === 3 && (i * 7919) % 11 < 2) tmp.lerp(light, 0.7);
    return tmp;
  };
  const glowC = srgb(s.glow, 0.85, 0.62);
  const glowF = (): THREE.Color => glowC;
  const B: THREE.BufferGeometry[] = [], G: THREE.BufferGeometry[] = [];
  const leaf = (x: number, z: number, len: number, w: number, tilt: number, yaw: number, droop = 1): void => {
    B.push(part(bladeGeo(len, w, droop * (0.5 + j(0, 0.7))), [x, 0, z], [0, yaw, -tilt], [1, 1, 1], body));
  };
  const tip = (x: number, y: number, z: number, r: number): void => { G.push(part(BALL, [x, y, z], [0, 0, 0], [r, r, r], glowF)); };

  switch (s.plan) {
    case 'reeds':
      top = 1.9;
      for (let i = 0; i < 10; i++) {
        const len = j(1.0, 1.9), tilt = j(-0.3, 0.3), yaw = j(0, 6.28), x = j(-0.25, 0.25), z = j(-0.25, 0.25);
        leaf(x, z, len, 0.07, Math.abs(tilt) * 0.6, yaw, 0.9);
        if (i % 3 === 0) tip(x - Math.sin(tilt) * Math.cos(yaw) * len, Math.cos(tilt) * len, z + Math.sin(tilt) * Math.sin(yaw) * len, 0.06);
      }
      break;
    case 'fan':
      top = 1.3;
      for (let i = 0; i < 9; i++) { const yaw = (i / 9) * 6.28 + j(-0.2, 0.2); leaf(0, 0, j(1.1, 1.6), 0.24, j(0.25, 0.6), yaw, 1.5); }
      tip(0, 0.25, 0, 0.13);
      break;
    case 'pods':
      top = 1.5;
      B.push(part(TUBE, [0, 0, 0], [0, 0, j(-0.12, 0.12)], [0.07, 1.4, 0.07], body));
      for (let i = 0; i < 4; i++) leaf(0, 0, j(0.5, 0.8), 0.16, j(0.8, 1.1), i * 1.57 + j(-0.4, 0.4), 1.4);
      for (let i = 0; i < 5; i++) { const a = j(0, 6.28), y = 0.45 + i * 0.24, r = j(0.17, 0.25); const x = Math.cos(a) * 0.24, z = Math.sin(a) * 0.24; B.push(part(BALL, [x, y, z], [0, 0, 0], [r, r * 1.2, r], body)); tip(x * 1.5, y + 0.05, z * 1.5, 0.07); }
      break;
    case 'mat':
      top = 0.35;
      for (let i = 0; i < 9; i++) { const a = j(0, 6.28), d = j(0, 0.7), r = j(0.3, 0.52); B.push(part(BALL, [Math.cos(a) * d, 0.06, Math.sin(a) * d], [0, j(0, 3), 0], [r, 0.16, r], body)); if (i % 3 === 0) leaf(Math.cos(a) * d, Math.sin(a) * d, j(0.3, 0.5), 0.1, j(0.4, 0.9), j(0, 6.28), 1.5); if (i % 2) tip(Math.cos(a) * d, 0.2, Math.sin(a) * d, 0.05); }
      break;
    case 'spire':
      top = 2.0;
      for (let i = 0; i < 6; i++) B.push(part(CONE, [j(-0.03, 0.03), i * 0.3, j(-0.03, 0.03)], [0, j(0, 3), 0], [0.42 - i * 0.055, 0.62, 0.42 - i * 0.055], body));
      tip(0, 2.1, 0, 0.09);
      for (let i = 0; i < 5; i++) leaf(0, 0, j(0.5, 0.75), 0.15, j(0.9, 1.2), i * 1.26 + j(-0.3, 0.3), 1.2);
      break;
    case 'pitcher': {
      top = 1.25;
      const pts = [[0.12, 0], [0.34, 0.25], [0.42, 0.6], [0.3, 0.95], [0.38, 1.15], [0.3, 1.2]].map(([x, y]) => new THREE.Vector2(x, y));
      B.push(part(new THREE.LatheGeometry(pts, 8), [0, 0, 0], [0, 0, 0], [1, 1, 1], body));
      for (let i = 0; i < 5; i++) leaf(0, 0, j(0.7, 1.0), 0.2, j(0.7, 1.0), i * 1.26 + j(-0.3, 0.3), 1.2);
      G.push(part(BALL, [0, 1.08, 0], [0, 0, 0], [0.26, 0.05, 0.26], glowF));
      break;
    }
    case 'crown':
      top = 1.0;
      for (let i = 0; i < 13; i++) leaf(0, 0, j(0.8, 1.35), 0.17, j(0.3, 0.9), (i / 13) * 6.28 * 2 + j(-0.15, 0.15), 1.3);
      B.push(part(BALL, [0, 0.22, 0], [0, 0, 0], [0.26, 0.24, 0.26], body));
      tip(0, 0.42, 0, 0.12);
      break;
    case 'bramble':
      top = 1.1;
      for (let i = 0; i < 7; i++) {
        const r = j(0.4, 0.7), yaw = j(0, 6.28);
        B.push(part(new THREE.TorusGeometry(r, 0.035, 4, 10, Math.PI), [j(-0.3, 0.3), 0, j(-0.3, 0.3)], [j(-0.5, 0.5), yaw, 0], [1, j(0.9, 1.6), 1], body));
        for (let t = 0; t < 2; t++) { const a = j(0.5, 2.6); B.push(part(CONE, [Math.cos(a) * r * Math.cos(yaw), Math.sin(a) * r, -Math.cos(a) * r * Math.sin(yaw)], [j(0, 6), j(0, 6), j(0, 6)], [0.035, 0.22, 0.035], body)); }
        if (i % 2) tip(j(-0.4, 0.4), j(0.3, 0.8), j(-0.4, 0.4), 0.06);
      }
      break;
  }
  const bodyG = mergeGeometries(B)!;
  bodyG.computeVertexNormals();
  return { body: bodyG, glow: mergeGeometries(G)!, height: top };
}

/** A tuft of undergrowth. Decor: it never trembles, never glows, carries no marks. */
export function tuftGeometry(): THREE.BufferGeometry {
  const h: RngHost = { rng: 31 };
  const parts: THREE.BufferGeometry[] = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < 8; i++) {
    const a = range(h, 0, 6.28), d = range(h, 0, 0.2), len = range(h, 0.3, 0.8);
    const c = srgb(range(h, 100, 150), 0.42, range(h, 0.13, 0.22)), dk = srgb(125, 0.4, 0.05);
    parts.push(part(bladeGeo(len, range(h, 0.03, 0.06), range(h, 0.4, 1.4), 4), [Math.cos(a) * d, 0, Math.sin(a) * d], [0, range(h, 0, 6.28), -range(h, 0.1, 0.6)], [1, 1, 1], (y) => tmp.copy(dk).lerp(c, Math.min(1, y / 0.6))));
  }
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}

export function thicketGeometry(): THREE.BufferGeometry {
  const h: RngHost = { rng: 77 };
  const parts: THREE.BufferGeometry[] = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < 30; i++) {
    const a = range(h, 0, 6.28), d = range(h, 0, 0.95), len = range(h, 1.3, 2.6);
    const hue = range(h, 105, 150), c = srgb(hue, 0.4, range(h, 0.1, 0.19)), dk = srgb(hue, 0.4, 0.04);
    parts.push(part(bladeGeo(len, range(h, 0.12, 0.3), range(h, 0.3, 1.1)), [Math.cos(a) * d, 0, Math.sin(a) * d], [0, range(h, 0, 6.28), -range(h, 0.0, 0.5)], [1, 1, 1], (y) => tmp.copy(dk).lerp(c, Math.min(1, y / 2))));
  }
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}

// ── figures ─────────────────────────────────────────────────────────────────

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...extra });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const box = (w: number, h: number, d: number): THREE.BoxGeometry => new THREE.BoxGeometry(w, h, d);

export function propMesh(kind: string): THREE.Object3D {
  const g = new THREE.Group();
  const stone = mat(0x6b757a, { roughness: 0.85 });
  const human = mat(0x5a5136, { roughness: 0.8 });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xf0bf2c });
  const white = new THREE.MeshBasicMaterial({ color: 0xf3fbff });
  if (kind === 'urn') {
    const pts = [[0.12, 0], [0.3, 0.15], [0.38, 0.5], [0.22, 0.85], [0.28, 0.98]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(mesh(new THREE.LatheGeometry(pts, 9), stone));
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.012, 3, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8fa3ad }));
    seam.position.y = 0.5; g.add(seam);
  } else if (kind === 'crate') {
    g.add(mesh(box(0.8, 0.6, 0.8), human, 0, 0.3, 0)); const s = new THREE.Mesh(box(0.82, 0.08, 0.82), yellow); s.position.y = 0.45; g.add(s);
  } else if (kind === 'chest') {
    g.add(mesh(box(1.3, 0.7, 0.8), human, 0, 0.35, 0)); const s = new THREE.Mesh(box(1.32, 0.1, 0.82), yellow); s.position.y = 0.62; s.name = 'lamp'; g.add(s);
  } else if (kind === 'plinth') {
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.9, 6), stone, 0, 0.45, 0));
    const r = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), white); r.position.y = 1.5; r.name = 'lamp'; g.add(r);
  } else if (kind === 'lift') {
    g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 8), mat(0x33383b, { metalness: 0.5 }), 0, 0.06, 0));
    for (const a of [0.78, 2.35, 3.92, 5.5]) g.add(mesh(box(0.1, 2.6, 0.1), human, Math.cos(a) * 1.2, 1.3, Math.sin(a) * 1.2));
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), yellow); b.position.y = 2.7; b.name = 'lamp'; g.add(b);
    // the cage that comes down the shaft when it is called
    const cage = new THREE.Group(); cage.name = 'cage'; cage.visible = false;
    cage.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 8), human, 0, 0.16, 0), mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.08, 8), human, 0, 2.5, 0));
    for (let i = 0; i < 8; i++) cage.add(mesh(box(0.04, 2.3, 0.04), mat(0x6f6a55, { metalness: 0.5 }), Math.cos(i * 0.785) * 1.1, 1.33, Math.sin(i * 0.785) * 1.1));
    cage.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 30, 5), mat(0x2a2d2f), 0, 17.5, 0));
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), yellow); cl.position.y = 2.35; cage.add(cl);
    g.add(cage);
  } else if (kind === 'hatch') {
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 8), mat(0x22272a, { metalness: 0.6, roughness: 0.4 }), 0, 0.07, 0));
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 4, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8fa3ad })); r.position.y = 0.16; g.add(r);
  } else if (kind === 'body') {
    const suit = mat(0xb08a18, { emissive: 0x241a00 });
    g.add(mesh(new THREE.CapsuleGeometry(0.28, 0.9, 3, 7).rotateZ(Math.PI / 2), suit, 0, 0.28, 0), mesh(new THREE.SphereGeometry(0.25, 8, 6), suit, 0.8, 0.28, 0));
    const leafM = mat(0x16361f, { roughness: 1 });
    for (let i = 0; i < 9; i++) { const l = mesh(new THREE.ConeGeometry(0.07, 0.5 + (i % 3) * 0.25, 4), leafM, -0.5 + i * 0.16, 0.5, ((i * 37) % 7) * 0.08 - 0.25); l.rotation.z = ((i * 13) % 5) * 0.12 - 0.25; g.add(l); }
  } else if (kind === 'glyph') {
    g.add(mesh(box(2.6, 2.2, 0.2), stone, 0, 1.1, 0));
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(box(0.08 + (i % 3) * 0.12, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x9fb4be })); m.position.set(-1 + (i % 5) * 0.5, 0.6 + Math.floor(i / 5) * 0.5, 0.11); m.name = 'lamp'; g.add(m); }
  } else if (kind === 'mark') {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5f7a80 })); m.position.y = 0.03; g.add(m);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5f7a80 })); d.position.y = 0.03; g.add(d);
  } else if (kind === 'wheel') {
    const rim = new THREE.Group(); rim.name = 'spin'; rim.position.y = 2.6;
    rim.add(mesh(new THREE.TorusGeometry(2.3, 0.14, 6, 28), mat(0x8b949b, { roughness: 0.4, metalness: 0.5 })));
    for (let i = 0; i < 6; i++) { const sp = mesh(box(4.5, 0.08, 0.08), mat(0x8b949b, { metalness: 0.5 })); sp.rotation.z = (i / 6) * Math.PI; rim.add(sp); }
    g.add(rim, mesh(box(0.5, 2.6, 0.9), stone, 0, 1.3, 0));
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), white); s.position.y = 2.6; s.name = 'lamp'; g.add(s);
  } else if (kind === 'camp') {
    g.add(mesh(box(1.1, 0.6, 0.7), human, -0.9, 0.3, 0.2), mesh(box(0.7, 0.5, 0.7), human, 0.7, 0.25, -0.5));
    const tent = mesh(new THREE.ConeGeometry(1.3, 1.5, 4), mat(0x6b5f3a, { roughness: 1 }), 0, 0.75, 0.1); tent.rotation.y = 0.6; g.add(tent);
    const s = new THREE.Mesh(box(1.12, 0.07, 0.72), yellow); s.position.set(-0.9, 0.5, 0.2); g.add(s);
  } else if (kind === 'door') {
    g.add(mesh(box(0.6, 4.2, 7), mat(0x8b949b, { roughness: 0.5, metalness: 0.3 }), 0, 2.1, 0));
    const s = new THREE.Mesh(box(0.62, 4.0, 0.08), white); s.position.y = 2.1; s.name = 'lamp'; g.add(s);
  }
  return g;
}
