// Authored art, loaded at boot: rigged and animated characters and a dungeon
// kit (KayKit, CC0) and scanned stone materials (Poly Haven, CC0). If any of
// it fails to load the game falls back to what it can build in code.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Characters go here as they are chosen ('operative', 'husk'): the code that drives them is in hero.ts and waits for them.
const MODELS = ['box_small', 'box_large', 'crates_stacked', 'barrel_small', 'barrel_large', 'chest', 'chest_gold', 'rubble_large', 'rubble_half', 'trunk_small_A', 'bed_floor', 'table_small', 'keg'] as const;
const TEXTURES = ['monastery_stone_floor', 'dark_rock_02', 'mossy_rock'] as const;
export type ModelName = (typeof MODELS)[number] | 'operative' | 'husk';
export const hasModel = (name: ModelName): boolean => models.has(name);
export type TextureName = (typeof TEXTURES)[number];

const models = new Map<string, GLTF>();
const textures = new Map<string, THREE.Texture>();
export const assets = { ready: false };

export async function loadAssets(progress: (done: number, total: number) => void): Promise<boolean> {
  const gltf = new GLTFLoader(), tex = new THREE.TextureLoader();
  const jobs: Promise<void>[] = [];
  let done = 0;
  const tick = (): void => progress(++done, jobs.length);
  // models arrive as base64 inside JSON (see build.mjs)
  const unpack = (b64: string): ArrayBuffer => { const bin = atob(b64), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; };
  for (const m of MODELS) jobs.push(fetch(`assets/models/${m}.json`).then((r) => r.json() as Promise<{ glb: string }>).then((j) => gltf.parseAsync(unpack(j.glb), '')).then((g) => { models.set(m, g); tick(); }));
  for (const t of TEXTURES) for (const map of ['diff', 'nor', 'rough']) {
    jobs.push(tex.loadAsync(`assets/tex/${t}_${map}.jpg`).then((x) => {
      x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
      x.colorSpace = map === 'diff' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      textures.set(`${t}_${map}`, x); tick();
    }));
  }
  try { await Promise.all(jobs); assets.ready = true; } catch (e) { console.warn('Art assets did not load; using built-in shapes.', e); assets.ready = false; }
  return assets.ready;
}

export const material = (name: TextureName): { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture } | null =>
  assets.ready ? { map: textures.get(`${name}_diff`)!, normalMap: textures.get(`${name}_nor`)!, roughnessMap: textures.get(`${name}_rough`)! } : null;

/** A fresh copy of a model, with its own skeleton and materials, and its animation clips. */
export function instance(name: ModelName): { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | null {
  const g = models.get(name);
  if (!g) return null;
  const scene = cloneSkinned(g.scene);
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = (o.material as THREE.Material).clone();
  });
  return { scene, clips: g.animations };
}

/** A static prop from the kit, scaled so its longest side on the ground is `size` metres. */
export function prop(name: ModelName, size: number): THREE.Object3D | null {
  const got = instance(name);
  if (!got) return null;
  const box = new THREE.Box3().setFromObject(got.scene), s = new THREE.Vector3();
  box.getSize(s);
  const holder = new THREE.Group();
  got.scene.scale.setScalar(size / Math.max(s.x, s.z));
  got.scene.position.y = -box.min.y * (size / Math.max(s.x, s.z));
  holder.add(got.scene);
  return holder;
}
