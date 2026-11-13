// The authored figures: which model, which clips, and when.

import * as THREE from 'three';
import { BLADES, GUNS } from './data';
import { Puppet } from './puppet';
import type { Enemy, World } from './state';

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const lum = (c: THREE.Color): number => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;

/** Suit yellow, the only yellow in the ruin: cloth goes yellow, plate stays dark steel. */
function suit(c: THREE.Color): void {
  const l = lum(c), sat = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  if (sat > 0.1 || l > 0.3) c.setRGB(Math.min(0.85, l * 1.25), Math.min(0.62, l * 0.9), l * 0.12);
  else c.setRGB(l * 0.5, l * 0.54, l * 0.58);
}
/** Whatever it was, the growth has had it a long time. */
function mossed(c: THREE.Color): void { const l = lum(c); c.setRGB(l * 0.5, l * 0.62, l * 0.42); }

export function makeHero(): Puppet {
  const h = new Puppet('operative', 1.9, suit);
  h.show(['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword', 'Knight_Cape'], false);
  return h;
}

let fallen = 0;
export function animateHero(h: Puppet, w: World, t: number, dt: number): void {
  const p = w.player, gear = w.camp.gear;
  h.root.position.set(p.x, 0, p.z);
  h.root.rotation.y = -p.face;
  const two = gear.blade.base === 3;
  h.show(['2H_Sword'], two); h.show(['1H_Sword'], !two); h.show(['1H_Sword_Offhand'], gear.blade.base === 2);
  const kind = two ? '2H' : gear.blade.base === 2 ? 'Dualwield' : '1H';
  const kick = Math.max(0, p.fireCd / GUNS[gear.gun.base].rate);
  if (p.state === 'dead') { fallen = Math.min(1, fallen + dt / 1.3); h.scrub('Death_A', fallen); }
  else {
    fallen = 0;
    if (p.state === 'dodge') {
      const rel = wrap(Math.atan2(p.ddz, p.ddx) - p.face);
      h.scrub(Math.abs(rel) < 0.8 ? 'Dodge_Forward' : Math.abs(rel) > 2.35 ? 'Dodge_Backward' : rel > 0 ? 'Dodge_Right' : 'Dodge_Left', p.t / 0.3, 0.05, 0.8);
    } else if (p.state === 'swing') {
      const heavy = p.combo === 2, total = heavy ? 0.52 : 0.34;
      void BLADES;
      h.scrub(heavy ? `${kind}_Melee_Attack_Chop` : p.combo === 1 && kind === '1H' ? '1H_Melee_Attack_Slice_Diagonal' : kind === '1H' ? '1H_Melee_Attack_Slice_Horizontal' : `${kind}_Melee_Attack_Slice`, p.t / total, 0.12, 0.85);
    } else if (kick > 0.02) h.scrub('1H_Ranged_Shoot', 1 - kick, 0.1, 0.9);
    else if (p.hurtT < 0.25) h.scrub('Hit_A', p.hurtT / 0.25, 0, 0.7);
    else if (p.moving > 0) {
      const rel = wrap(p.mdir - p.face), slow = p.snared > 0 ? 0.3 : 1;
      if (Math.abs(rel) < 0.9) h.loop('Running_A', 1.05 * slow);
      else if (Math.abs(rel) > 2.25) h.loop('Walking_Backwards', 2.2 * slow);
      else h.loop(rel > 0 ? 'Running_Strafe_Right' : 'Running_Strafe_Left', 1.05 * slow);
    } else h.loop(two ? '2H_Melee_Idle' : 'Idle');
  }
  h.flash(p.invuln > 0 && p.hurtT < 0.5 && Math.sin(t * 50) > 0 ? 0x888888 : 0x000000);
  h.update(dt);
}

export function makeHusk(): Puppet {
  const h = new Puppet('husk', 2.75, mossed);
  const eyes = h.parts.get('Skeleton_Warrior_Eyes');
  if (eyes instanceof THREE.Mesh) eyes.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a5a).multiplyScalar(2.4) });
  return h;
}

export function animateHusk(h: Puppet, e: Enemy, dt: number): void {
  h.root.position.set(e.x, 0, e.z);
  const speed = Math.hypot(e.sx, e.sz);
  if (e.dead) h.scrub('Death_A', e.deadT / 1.3);
  else if (e.state === 'windup') h.scrub('2H_Melee_Attack_Chop', 1 - e.t / 0.8, 0, 0.42);
  else if (e.state === 'strike') h.scrub('2H_Melee_Attack_Chop', 1 - e.t / 0.12, 0.42, 0.58);
  else if (e.state === 'recover') h.scrub('2H_Melee_Attack_Chop', 1 - e.t / 1.1, 0.58, 1);
  else if (e.state === 'stagger') h.scrub('Hit_A', 0.35);
  else if (speed > 0.25) h.loop('Walking_D_Skeletons', 0.5 + speed / 2.4);
  else h.loop('Idle_Combat', 0.7);
  h.flash(e.flash > 0 ? 0x999999 : e.state === 'windup' ? 0x3a0f08 : 0x000000);
  h.update(dt);
}
