// A rigged, animated figure driven by the simulation. Looping clips (idle,
// walking) play by themselves; everything with a moment that matters (a
// swing, a roll, a slam) is scrubbed to the simulation's own clock, so the
// blade lands on the frame the hit does.

import * as THREE from 'three';
import { instance } from './assets';
import type { ModelName } from './assets';

export class Puppet {
  root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private now = '';
  private mats: THREE.MeshStandardMaterial[] = [];
  parts = new Map<string, THREE.Object3D>();

  constructor(model: ModelName, height: number, recolour?: (c: THREE.Color) => void) {
    const got = instance(model)!;
    const box = new THREE.Box3().setFromObject(got.scene);
    // the kit's figures face +z; everything here faces +x
    got.scene.rotation.y = Math.PI / 2;
    got.scene.scale.setScalar(height / 2.2);
    void box;
    this.root.add(got.scene);
    this.mixer = new THREE.AnimationMixer(got.scene);
    for (const c of got.clips) this.actions.set(c.name, this.mixer.clipAction(c));
    got.scene.traverse((o) => {
      this.parts.set(o.name, o);
      if (o instanceof THREE.Mesh) { const m = o.material as THREE.MeshStandardMaterial; this.mats.push(m); if (recolour && m.map) m.map = recoloured(m.map, recolour); m.roughness = 0.7; m.metalness = 0.05; }
    });
  }

  show(names: string[], on: boolean): void { for (const n of names) { const o = this.parts.get(n); if (o) o.visible = on; } }

  private to(name: string): THREE.AnimationAction | null {
    const a = this.actions.get(name);
    if (!a) return null;
    if (this.now !== name) {
      const prev = this.actions.get(this.now);
      prev?.fadeOut(0.12);
      a.reset().setEffectiveWeight(1).fadeIn(0.12).play();
      this.now = name;
    }
    return a;
  }

  /** A looping clip, at a given speed. */
  loop(name: string, speed = 1): void {
    const a = this.to(name);
    if (a) { a.paused = false; a.setLoop(THREE.LoopRepeat, Infinity); a.timeScale = speed; }
  }

  /** A clip held at a fraction of its length (0 to 1), from..to selecting part of it. */
  scrub(name: string, k: number, from = 0, to = 1): void {
    const a = this.to(name);
    if (!a) return;
    a.paused = true; a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.time = a.getClip().duration * (from + (to - from) * Math.max(0, Math.min(1, k)));
  }

  flash(hex: number): void { for (const m of this.mats) m.emissive.setHex(hex); }
  update(dt: number): void { this.mixer.update(dt); }
}

const done = new Map<string, THREE.Texture>();
/** The kit's figures share one colour chart. Repaint a copy of it. */
function recoloured(src: THREE.Texture, fn: (c: THREE.Color) => void): THREE.Texture {
  const key = src.uuid + fn.toString().length;
  const got = done.get(key);
  if (got) return got;
  const img = src.image as HTMLImageElement | ImageBitmap, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img as CanvasImageSource, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), col = new THREE.Color();
  for (let i = 0; i < d.data.length; i += 4) { col.setRGB(d.data[i] / 255, d.data[i + 1] / 255, d.data[i + 2] / 255); fn(col); d.data[i] = col.r * 255; d.data[i + 1] = col.g * 255; d.data[i + 2] = col.b * 255; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = src.colorSpace; t.flipY = src.flipY; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.magFilter = src.magFilter; t.minFilter = src.minFilter;
  done.set(key, t);
  return t;
}
