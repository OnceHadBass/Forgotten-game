// The operative: a jointed hard suit, suit yellow, the only yellow in the
// ruin. Legs follow where they are walking, the body follows the aim, and
// every action has a pose. Faces +x.

import * as THREE from 'three';
import { BLADES, GUNS } from './data';
import type { World } from './state';

type M = THREE.MeshStandardMaterial;
const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): M => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const group = (x: number, y: number, z: number, ...kids: THREE.Object3D[]): THREE.Group => { const g = new THREE.Group(); g.position.set(x, y, z); g.add(...kids); return g; };
const box = (w: number, h: number, d: number): THREE.BoxGeometry => new THREE.BoxGeometry(w, h, d);
const cap = (r: number, len: number): THREE.CapsuleGeometry => new THREE.CapsuleGeometry(r, len, 4, 10);

/** Suit cloth: yellow, worn, with grime in the folds and a hazard band. */
function suitTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e2b020'; g.fillRect(0, 0, 128, 128);
  let s = 7;
  const r = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${40 + r() * 40},${30 + r() * 20},10,${0.05 + r() * 0.1})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 10, 1 + r() * 4); }
  g.fillStyle = 'rgba(20,18,10,0.85)';
  for (let x = -16; x < 128; x += 22) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 11, 70); g.lineTo(x + 21, 84); g.lineTo(x + 10, 84); g.fill(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,240,190,${0.15 + r() * 0.2})`; g.beginPath(); const x = r() * 128, y = r() * 128; g.moveTo(x, y); g.lineTo(x + r() * 14 - 7, y + r() * 8 - 4); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface Rig {
  root: THREE.Group; hips: THREE.Group; torso: THREE.Group; head: THREE.Group;
  thigh: THREE.Group[]; shin: THREE.Group[]; upper: THREE.Group[]; fore: THREE.Group[];
  blades: THREE.Object3D[]; guns: THREE.Object3D[]; skin: M; lamp: THREE.Mesh; yaw: number; flash: number;
}

export function operative(): Rig {
  const suit = mat(0xffffff, { map: suitTexture(), emissive: 0x2a1e00, roughness: 0.62 });
  const joint = mat(0x1a1d20, { roughness: 0.85 });
  const plate = mat(0x2b3034, { roughness: 0.45, metalness: 0.55 });
  const steel = mat(0xc3ccd0, { roughness: 0.42, metalness: 0.8 });
  const glass = mat(0x06090b, { roughness: 0.08, metalness: 0.9 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1dc).multiplyScalar(1.05) });
  const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf0bf2c).multiplyScalar(1.5) });

  const leg = (z: number): [THREE.Group, THREE.Group] => {
    const shin = group(0, -0.42, 0, mesh(cap(0.085, 0.26).translate(0, -0.2, 0), suit), mesh(box(0.16, 0.12, 0.16).translate(0, -0.03, 0), plate), mesh(box(0.3, 0.11, 0.17).translate(0.06, -0.42, 0), joint));
    const thigh = group(0, 0, z, mesh(cap(0.105, 0.24).translate(0, -0.2, 0), suit), shin);
    return [thigh, shin];
  };
  const [thighL, shinL] = leg(0.14), [thighR, shinR] = leg(-0.14);

  // weapons: one of each kind is shown, to match what is carried
  const blades = [
    group(0, 0, 0, mesh(box(0.2, 0.04, 0.05).translate(0.02, 0, 0), joint), mesh(box(0.78, 0.022, 0.13).translate(0.5, 0, 0.02), steel), mesh(box(0.2, 0.022, 0.09).translate(0.96, 0, 0), steel)),
    group(0, 0, 0, mesh(box(0.26, 0.04, 0.05).translate(0.02, 0, 0), joint), mesh(box(0.06, 0.05, 0.22).translate(0.15, 0, 0), plate), mesh(box(1.25, 0.02, 0.075).translate(0.8, 0, 0), steel)),
    group(0, 0, 0, mesh(box(0.2, 0.04, 0.05).translate(0.02, 0, 0), joint), mesh(box(0.5, 0.022, 0.08).translate(0.38, 0, 0), steel), mesh(new THREE.TorusGeometry(0.16, 0.022, 4, 10, 2.6).rotateX(Math.PI / 2), steel, 0.62, 0, 0.14)),
    group(0, 0, 0, mesh(box(1.0, 0.05, 0.05).translate(0.45, 0, 0), joint), mesh(box(0.26, 0.2, 0.34).translate(0.95, 0, 0), plate), mesh(box(0.1, 0.22, 0.36).translate(1.1, 0, 0), steel)),
  ];
  const guns = [
    group(0, 0, 0, mesh(box(0.26, 0.09, 0.045).translate(0.13, 0.02, 0), plate), mesh(box(0.07, 0.14, 0.045).translate(0.03, -0.07, 0), joint)),
    group(0, 0, 0, mesh(box(0.55, 0.1, 0.07).translate(0.27, 0.02, 0), plate), mesh(box(0.2, 0.09, 0.06).translate(-0.06, -0.03, 0), joint), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6).rotateZ(Math.PI / 2), steel, 0.5, 0.0, 0)),
    group(0, 0, 0, mesh(box(0.7, 0.08, 0.05).translate(0.35, 0.02, 0), plate), mesh(box(0.08, 0.2, 0.045).translate(0.3, -0.1, 0), joint), mesh(box(0.2, 0.08, 0.05).translate(-0.08, -0.02, 0), joint)),
  ];
  const arm = (z: number, held: THREE.Object3D[]): [THREE.Group, THREE.Group] => {
    const hand = group(0, -0.36, 0, mesh(new THREE.SphereGeometry(0.07, 8, 6), joint), ...held);
    const fore = group(0, -0.32, 0, mesh(cap(0.065, 0.2).translate(0, -0.17, 0), suit), mesh(box(0.15, 0.1, 0.15).translate(0, -0.26, 0), plate), hand);
    const upper = group(0.02, 1.42, z, mesh(new THREE.SphereGeometry(0.115, 10, 8), plate), mesh(cap(0.078, 0.18).translate(0, -0.17, 0), suit), fore);
    return [upper, fore];
  };
  // held things point along the forearm, which hangs down: turn them to point "forward" out of the fist
  for (const o of [...blades, ...guns]) { o.rotation.z = -Math.PI / 2; }
  const [upperR, foreR] = arm(-0.3, blades), [upperL, foreL] = arm(0.3, guns);

  const lamp = mesh(new THREE.SphereGeometry(0.035, 8, 6), glow, 0.25, 1.36, 0.12);
  const head = group(0.02, 1.68, 0,
    mesh(new THREE.SphereGeometry(0.2, 14, 10).scale(1.05, 1, 0.98), suit),
    mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0.9, 1.0).rotateZ(-Math.PI / 2).scale(1, 0.62, 1.05), glass, 0.06, -0.01, 0),
    mesh(box(0.02, 0.016, 0.22), amber, 0.215, 0.07, 0),
    mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.08, 14), plate, 0, -0.17, 0),
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), joint, -0.12, 0.3, -0.12));
  const torso = group(0, 0, 0,
    mesh(cap(0.2, 0.26).scale(1, 1, 1.2), suit, 0, 1.2, 0),
    mesh(box(0.2, 0.26, 0.4), plate, 0.14, 1.26, 0),
    mesh(box(0.24, 0.5, 0.46), joint, -0.26, 1.22, 0),
    mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 8), plate, -0.38, 1.22, 0.11), mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 8), plate, -0.38, 1.22, -0.11),
    mesh(box(0.34, 0.1, 0.48), joint, 0, 0.98, 0),
    lamp, head, upperL, upperR);
  const hips = group(0, 0.92, 0, mesh(cap(0.16, 0.12).rotateX(Math.PI / 2), joint, 0, 0, 0), thighL, thighR);
  torso.position.y = -0.92;
  hips.add(torso);
  const root = new THREE.Group();
  root.add(hips);
  return { root, hips, torso, head, thigh: [thighL, thighR], shin: [shinL, shinR], upper: [upperL, upperR], fore: [foreL, foreR], blades, guns, skin: suit, lamp, yaw: 0, flash: 0 };
}

const ease = (k: number): number => k * k * (3 - 2 * k);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export function animate(r: Rig, w: World, t: number, dt: number): void {
  const p = w.player, gear = w.camp.gear;
  r.blades.forEach((o, i) => (o.visible = i === gear.blade.base));
  r.guns.forEach((o, i) => (o.visible = i === gear.gun.base));
  r.root.position.set(p.x, 0, p.z);
  const [tl, tr] = r.thigh, [sl, sr] = r.shin, [ul, ur] = r.upper, [fl, fr] = r.fore;
  for (const o of [r.hips, r.torso, r.head, tl, tr, sl, sr, ul, ur, fl, fr]) o.rotation.set(0, 0, 0);
  r.hips.position.set(0, 0.92, 0); r.hips.scale.setScalar(1);

  const moving = p.moving > 0 && p.state !== 'dodge';
  // legs go where the feet are going; the body turns to the aim
  let legs = moving ? wrap(p.mdir - p.face) : 0, back = 1;
  if (Math.abs(legs) > Math.PI / 2) { legs = wrap(legs + Math.PI); back = -1; }
  r.yaw += wrap(legs - r.yaw) * Math.min(1, dt * 10);
  r.root.rotation.y = -(p.state === 'dodge' ? Math.atan2(p.ddz, p.ddx) : p.face + r.yaw);
  r.torso.rotation.y = p.state === 'dodge' ? 0 : r.yaw;

  const ph = p.moving * 2.15, go = moving ? 1 : 0, breath = Math.sin(t * 1.7);
  // stride: thigh swings, knee folds on the way through, hips rise and fall
  tl.rotation.z = Math.sin(ph) * 0.75 * go * back; tr.rotation.z = -Math.sin(ph) * 0.75 * go * back;
  sl.rotation.z = -Math.max(0, Math.sin(ph - 1.1 * back)) * 1.15 * go - 0.06; sr.rotation.z = -Math.max(0, Math.sin(ph + Math.PI - 1.1 * back)) * 1.15 * go - 0.06;
  r.hips.position.y = 0.92 - Math.abs(Math.cos(ph)) * 0.05 * go - (moving ? 0.02 : 0) + breath * 0.004;
  r.hips.rotation.z = -0.1 * go * back;
  r.torso.rotation.z = -0.06 * go + breath * 0.012;
  r.torso.rotation.x = Math.sin(ph) * 0.05 * go;
  r.head.rotation.y = -r.yaw * 0.3;

  // arms at the ready: blade low on the right, gun close on the left
  ur.rotation.set(0.25, 0, 0.35 + Math.sin(ph) * 0.12 * go); fr.rotation.z = 1.05;
  ul.rotation.set(-0.2, 0, 0.55 - Math.sin(ph) * 0.1 * go); fl.rotation.z = 0.95;
  const blade = BLADES[gear.blade.base];

  if (p.state === 'swing') {
    const heavy = p.combo === 2, total = heavy ? 0.52 : 0.34, hit = heavy ? 0.2 : 0.11;
    const arc = ((blade.arc + 20) * Math.PI) / 360, dir = p.combo === 1 ? -1 : 1;
    // wind back, cut through, follow through
    const k = p.t < hit ? -ease(p.t / hit) * 0.35 - 0.65 : -1 + 2 * ease(Math.min(1, (p.t - hit) / (total * 0.35)));
    if (heavy) {
      const up = p.t < hit ? ease(p.t / hit) : 1 - ease(Math.min(1, (p.t - hit) / 0.12));
      ur.rotation.set(0, 0, 0.5 + up * 2.3); fr.rotation.z = 0.3 + up * 0.9;
      ul.rotation.set(0, 0, 0.4 + up * 1.9); fl.rotation.z = 0.6;
      r.torso.rotation.z = 0.25 * up - 0.45 * (1 - up);
      r.hips.position.y -= 0.14 * (1 - up);
      tl.rotation.z = 0.7 * (1 - up); sl.rotation.z = -0.7 * (1 - up); tr.rotation.z = -0.5 * (1 - up);
    } else {
      r.torso.rotation.y += dir * k * 0.75;
      ur.rotation.set(dir * 0.25, dir * k * arc * 0.55, 1.45); fr.rotation.z = 0.12;
      ul.rotation.set(-0.5, 0, 0.2 - k * dir * 0.3);
      r.torso.rotation.z = -0.16;
      tl.rotation.z = 0.5; sl.rotation.z = -0.35; tr.rotation.z = -0.4; sr.rotation.z = -0.2;
      r.hips.position.y -= 0.07;
    }
  } else if (p.state === 'dodge') {
    // a tucked roll along the ground
    const k = Math.min(1, p.t / 0.3);
    r.hips.rotation.z = -k * Math.PI * 2;
    r.hips.position.y = 0.5 + Math.sin(k * Math.PI) * 0.12;
    r.torso.rotation.z = -0.9; tl.rotation.z = tr.rotation.z = 1.5; sl.rotation.z = sr.rotation.z = -2.1;
    ur.rotation.z = ul.rotation.z = 1.2; fr.rotation.z = fl.rotation.z = 1.6;
  } else if (p.state === 'dead') {
    r.flash = Math.min(1, r.flash + dt * 1.6);
    const k = ease(r.flash);
    r.hips.rotation.z = k * 1.5; r.hips.position.y = 0.92 - k * 0.72;
    r.torso.rotation.z = k * 0.2; tl.rotation.z = -k * 0.3; tr.rotation.z = k * 0.5; sr.rotation.z = -k * 0.9;
    ur.rotation.set(0, 0, k * 2.4); ul.rotation.set(-k * 0.9, 0, k * 1.2); r.head.rotation.z = k * 0.4;
  } else {
    r.flash = 0;
    const gun = GUNS[gear.gun.base];
    const kick = Math.max(0, p.fireCd / gun.rate);
    if (kick > 0.01) { // gun arm out, kicking back with each shot
      ul.rotation.set(0, 0, 1.5 + kick * kick * 0.35); fl.rotation.z = 0.05 + kick * kick * 0.3;
      r.torso.rotation.y += 0.25; r.torso.rotation.z += kick * kick * 0.06;
    }
    if (p.hurtT < 0.22) { const f = 1 - p.hurtT / 0.22; r.torso.rotation.z += 0.35 * f; r.head.rotation.z = 0.3 * f; r.hips.position.y -= 0.06 * f; }
    if (p.snared > 0) { r.torso.rotation.y += Math.sin(t * 22) * 0.2; ur.rotation.z = 1.2 + Math.sin(t * 19) * 0.4; tl.rotation.z = Math.sin(t * 17) * 0.3; }
  }
  r.skin.emissive.setHex(p.invuln > 0 && p.hurtT < 0.5 && Math.sin(t * 50) > 0 ? 0xffffff : 0x2a1e00);
  r.lamp.visible = p.torch;
}
