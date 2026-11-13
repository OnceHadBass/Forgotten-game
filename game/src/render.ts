// The view: reads the world and writes three.js objects, never the reverse.
// One shadow-casting torch, a suit light and four pooled glow lights; the
// count never changes at run time.

import * as THREE from 'three';
import { LAYERS, RARITY_COLOUR, T, TUNE } from './data';
import { FLOOR, THICKET, WALL, centre, idx, rayWall, tx } from './level';
import { animateCreature, creature } from './creatures';
import type { Creature } from './creatures';
import { leafTexture, plantGeometry, propMesh, srgb, thicketGeometry, tuftGeometry } from './models';
import type { PlantGeo } from './models';
import { animate, operative } from './operative';
import type { Rig } from './operative';
import { assets, material, prop } from './assets';
import { animateHero, animateHusk, makeHero, makeHusk } from './hero';
import { Post } from './post';
import type { Puppet } from './puppet';
import type { Fx, World } from './state';

const WALL_H = 2.7, CUT = 0.2, VIEW = 16.5;
const CAM = new THREE.Vector3(1, 1.25, 1).normalize().multiplyScalar(60);
const GRAZER = new THREE.Color(0x7ff0e0), WARDEN = new THREE.Color(0xf3fbff), DAY = new THREE.Color(0xbcd4e6);
const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), C = new THREE.Color();

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let seedN = 1;
const rnd = (): number => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };

const stoneTex = (): THREE.CanvasTexture => canvasTexture(512, (g) => {
  seedN = 11;
  g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, 512, 512);
  const wrap = (draw: (ox: number, oy: number) => void): void => { for (const ox of [0, 512, -512]) for (const oy of [0, 512, -512]) draw(ox, oy); };
  // worn paving: big uneven slabs, each its own grey, edges anything but square
  g.filter = 'blur(10px)';
  for (let i = 0; i < 26; i++) { const v = 105 + rnd() * 70, x = rnd() * 512, y = rnd() * 512, rx = 50 + rnd() * 80, ry = 40 + rnd() * 70, a = rnd() * 3; g.fillStyle = `rgb(${v},${v},${v + 3})`; wrap((ox, oy) => { g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, a, 0, 7); g.fill(); }); }
  g.filter = 'none';
  for (let i = 0; i < 6000; i++) { const v = rnd() * 255; g.fillStyle = `rgba(${v},${v},${v},0.05)`; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 4, 1 + rnd() * 4); }
  // joints and cracks wander; none of them runs true
  for (let i = 0; i < 13; i++) {
    const pts: [number, number][] = []; let x = rnd() * 512, y = rnd() * 512, a = rnd() * 6.28;
    for (let k = 0; k < 14; k++) { pts.push([x, y]); a += rnd() * 1.0 - 0.5; x += Math.cos(a) * 34; y += Math.sin(a) * 34; }
    g.strokeStyle = `rgba(16,20,22,${0.4 + rnd() * 0.3})`; g.lineWidth = 1.4 + rnd() * 1.8; g.lineJoin = 'round';
    wrap((ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke(); });
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(36,${66 + rnd() * 40},46,0.13)`; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 2 + rnd() * 9, 0, 7); g.fill(); }
});

/** Relief from brightness: joints and cracks become grooves the torch can rake across. */
function normalFrom(src: THREE.CanvasTexture, strength: number): THREE.CanvasTexture {
  const img = src.image as HTMLCanvasElement, n = img.width, d = img.getContext('2d')!.getImageData(0, 0, n, n).data;
  const h = (x: number, y: number): number => d[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  const out = canvasTexture(n, (g) => {
    const o = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
      o.data[i] = (-dx / l * 0.5 + 0.5) * 255; o.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; o.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; o.data[i + 3] = 255;
    }
    g.putImageData(o, 0, 0);
  });
  out.colorSpace = THREE.NoColorSpace;
  return out;
}

/** Warden masonry: great weathered monoliths, strata and stains, hardly a joint in them. */
const blockTex = (): THREE.CanvasTexture => canvasTexture(512, (g) => {
  seedN = 23;
  g.fillStyle = '#909090'; g.fillRect(0, 0, 512, 512);
  g.filter = 'blur(18px)';
  for (let i = 0; i < 40; i++) { const v = 90 + rnd() * 90; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; const x = rnd() * 512, y = rnd() * 512, r = 40 + rnd() * 90; for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) { g.beginPath(); g.ellipse(x + ox, y + oy, r * 1.6, r * 0.6, 0, 0, 7); g.fill(); } }
  g.filter = 'none';
  for (let i = 0; i < 7000; i++) { const v = rnd() * 255; g.fillStyle = `rgba(${v},${v},${v},0.045)`; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 4, 1 + rnd() * 3); }
  // strata: long faint beds, never straight, never evenly spaced
  for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(25,28,30,${0.12 + rnd() * 0.2})`; g.lineWidth = 0.8 + rnd() * 1.6; let y = rnd() * 512; for (const oy of [0, 512, -512]) { g.beginPath(); let yy = y + oy; g.moveTo(-10, yy); for (let x = 0; x <= 520; x += 26) { yy += rnd() * 7 - 3.5; g.lineTo(x, yy); } g.stroke(); } }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(20,${40 + rnd() * 30},32,${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * 512, rnd() * 512, 4 + rnd() * 12, 60 + rnd() * 200); } // where water has run
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(15,15,15,${0.2 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 0.8 + rnd() * 2.2, 0, 7); g.fill(); } // pits
});

/** Where water stands: low roughness, so the torch glints off it. */
const puddleTex = (): THREE.CanvasTexture => {
  const t = canvasTexture(256, (g) => {
    seedN = 91;
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256);
    g.filter = 'blur(5px)';
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(20,20,20,${0.55 + rnd() * 0.45})`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 8 + rnd() * 26, 6 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); }
  });
  t.colorSpace = THREE.NoColorSpace;
  return t;
};

const splatTex = (): THREE.CanvasTexture => canvasTexture(128, (g) => {
  seedN = 57;
  g.filter = 'blur(2px)';
  g.fillStyle = '#fff';
  for (let i = 0; i < 22; i++) { const a = rnd() * 6.28, d = rnd() * rnd() * 46; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + rnd() * (16 - d * 0.25), 0, 7); g.fill(); }
});

const hazeTex = (): THREE.CanvasTexture => canvasTexture(256, (g) => {
  seedN = 77;
  g.filter = 'blur(14px)';
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.25})`; const x = rnd() * 256, y = rnd() * 256, r = 16 + rnd() * 40; for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); } }
});

const glowTex = (): THREE.CanvasTexture => canvasTexture(128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});

interface PlantView { root: THREE.Group; glow: THREE.MeshBasicMaterial; pool: THREE.MeshBasicMaterial; base: THREE.Color; level: number; wilt: number; rear: number }
interface EnemyView { c: Creature; bar: THREE.Mesh | null; puppet: Puppet | null }
interface Ring { m: THREE.Mesh; t: number; max: number; r: number; grow: boolean }
interface Flash { x: number; z: number; c: THREE.Color; t: number; max: number; power: number }

export class View {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  private level = new THREE.Group();
  private ents = new THREE.Group();
  private hemi = new THREE.HemisphereLight(0xffffff, 0x0b1114, 1.2);
  private torch = new THREE.SpotLight(0xfff0d8, 0, 30, 0.5, 0.55, 1.15);
  private suit = new THREE.PointLight(0xffdf9e, 15, 11, 1.25);
  private pool: THREE.PointLight[] = [];
  private rig: Rig = operative();
  private plants = new Map<number, PlantView>();
  private enemies = new Map<number, EnemyView>();
  private props = new Map<number, THREE.Object3D>();
  private loot = new Map<number, THREE.Object3D>();
  private zones = new Map<number, THREE.Object3D>();
  private projs = new Map<number, THREE.Object3D>();
  private geo = new Map<string, PlantGeo>();
  private bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: leafTexture(), roughness: 0.55, side: THREE.DoubleSide });
  private glowMap = glowTex();
  private stone = stoneTex();
  private stoneN = normalFrom(this.stone, 2.2);
  private block = blockTex();
  private blockN = normalFrom(this.block, 2.6);
  private puddles = puddleTex();
  private splat = splatTex();
  private haze: THREE.Mesh;
  private cone: THREE.Mesh;
  private decals: THREE.InstancedMesh;
  private decalN = 0;
  private seams: { x: number; z: number }[] = [];
  private post: Post;
  private hero: Puppet | null = null;
  private wind = { value: 0 };
  private lowHp = 0;
  private walls: THREE.InstancedMesh | null = null;
  private wallAt = new Int32Array(0);
  private wallScale = new Float32Array(0);
  private thickets: THREE.InstancedMesh | null = null;
  private thicketAt = new Map<number, number>();
  private rings: Ring[] = [];
  private slashes: { m: THREE.Mesh; t: number }[] = [];
  private tracers: { m: THREE.Mesh; t: number }[] = [];
  private flashes: Flash[] = [];
  private beam: THREE.Mesh;
  private nova: THREE.Mesh;
  private target = new THREE.Vector3();
  private shake = 0;
  shakeScale = 1;
  /** For close-up shots in tests. */
  zoom = 1;
  lead = 0.13;
  private time = 0;
  // particles
  private N = 1100; private pPos = new Float32Array(this.N * 3); private pVel = new Float32Array(this.N * 3); private pCol = new Float32Array(this.N * 3);
  private pSize = new Float32Array(this.N); private pLife = new Float32Array(this.N); private pMax = new Float32Array(this.N); private pGrav = new Float32Array(this.N);
  private pNext = 0; private points: THREE.Points; private pBase = new Float32Array(this.N * 3);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.scene.add(this.level, this.ents, this.hemi, this.torch, this.torch.target, this.suit, this.rig.root);
    this.torch.castShadow = true;
    this.torch.shadow.mapSize.set(2048, 2048);
    this.torch.shadow.radius = 2.5;
    this.torch.shadow.bias = -0.0015;
    this.torch.shadow.camera.near = 0.5; this.torch.shadow.camera.far = 30;
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 1.5); this.pool.push(l); this.scene.add(l); }
    const add = THREE.AdditiveBlending;
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 56).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, blending: add, depthWrite: false, fog: false, opacity: 0 }));
      m.visible = false; this.scene.add(m); this.rings.push({ m, t: 0, max: 1, r: 1, grow: true });
    }
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xfff0c4, transparent: true, blending: add, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      m.visible = false; this.scene.add(m); this.slashes.push({ m, t: 0 });
    }
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.035).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: 0xfff3d0, transparent: true, blending: add, depthWrite: false, fog: false }));
      m.visible = false; this.scene.add(m); this.tracers.push({ m, t: 0 });
    }
    const white = new THREE.MeshBasicMaterial({ color: 0xf3fbff, transparent: true, blending: add, depthWrite: false, fog: false });
    this.beam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.25, 0.5).translate(0.5, 0, 0), white);
    this.nova = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 64).rotateX(Math.PI / 2), white);
    this.beam.visible = this.nova.visible = false;
    this.scene.add(this.beam, this.nova);

    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    pg.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1));
    this.points = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: { scale: { value: 1 } }, transparent: true, blending: add, depthWrite: false, fog: false, vertexColors: true,
      vertexShader: 'attribute float size; uniform float scale; varying vec3 vC; void main(){ vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale; }',
      fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(max(vC, 0.0) * smoothstep(0.5, 0.1, d), 1.0); }',
    }));
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    // ground haze that drifts, a beam you can see, and stains where things have died
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: hazeTex(), transparent: true, opacity: 0.1, blending: add, depthWrite: false, fog: false }));
    (this.haze.material as THREE.MeshBasicMaterial).map!.repeat.set(3, 3);
    this.haze.position.y = 0.7; this.haze.renderOrder = 2;
    this.cone = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 24, 6, -0.5, 1.0).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { power: { value: 0 } }, transparent: true, blending: add, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float power; varying vec3 vP; void main(){ float r = length(vP.xz); float a = abs(atan(-vP.z, vP.x)); float f = pow(clamp(1.0 - r, 0.0, 1.0), 1.6) * smoothstep(0.5, 0.12, a) * smoothstep(0.03, 0.12, r); gl_FragColor = vec4(vec3(1.0, 0.94, 0.82) * f * power, 1.0); }',
    }));
    this.cone.renderOrder = 3;
    this.decals = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.splat, transparent: true, opacity: 0.85, depthWrite: false, fog: false }), 72);
    this.decals.count = 0; this.decals.frustumCulled = false; this.decals.renderOrder = 1;
    this.scene.add(this.haze, this.cone, this.decals);
    // Wind through everything that grows: tips move more than roots, and no two plants in step.
    this.bodyMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.wind;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 swp = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 swp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        float sw = transformed.y * transformed.y * 0.03;
        transformed.x += sin(uTime * 1.3 + swp.x * 0.7 + swp.z * 0.9 + transformed.y * 1.4) * sw;
        transformed.z += cos(uTime * 1.07 + swp.x * 0.5 - swp.z * 0.6 + transformed.y * 1.1) * sw;`);
      // a little light held in the leaf, so growth is never a black cut-out
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.14;');
    };
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.resize();
  }

  low = false;
  /** High: bloom, multisampling, a sharp torch shadow. Low: none of those, for machines that struggle. */
  setQuality(low: boolean): void {
    this.low = low;
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.torch.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    this.torch.shadow.map?.dispose(); this.torch.shadow.map = null;
    this.post = new Post(this.renderer, this.scene, this.camera, low);
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight, a = w / h;
    this.renderer.setSize(w, h, false);
    this.post.resize(w, h);
    const v = (a < 1 ? VIEW * 0.82 : VIEW) / this.zoom;
    this.camera.left = (-v * a) / 2; this.camera.right = (v * a) / 2; this.camera.top = v / 2; this.camera.bottom = -v / 2;
    this.camera.updateProjectionMatrix();
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = (h * this.renderer.getPixelRatio()) / v;
  }

  // ── building a layer ──────────────────────────────────────────────────────

  build(w: World): void {
    const l = w.level, look = LAYERS[w.depth];
    for (const g of [this.level, this.ents]) g.clear();
    for (const m of [this.plants, this.enemies, this.props, this.loot, this.zones, this.projs]) m.clear();
    this.geo.clear();
    this.scene.background = new THREE.Color(look.fog);
    this.scene.fog = new THREE.FogExp2(look.fog, 0.011);
    this.hemi.color.set(look.amb);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(l.w * T, l.h * T).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.stone, normalMap: this.stoneN, normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: this.puddles, roughness: 1, color: new THREE.Color(look.floor).multiplyScalar(1.5) }));
    this.stoneN.repeat.set(l.w / 2, l.h / 2);
    // scanned stone, where it loaded: worn paving underfoot (the standing water stays ours)
    const paving = material('monastery_stone_floor');
    if (paving) { const fm = floor.material as THREE.MeshStandardMaterial; fm.map = paving.map; fm.normalMap = paving.normalMap; fm.normalScale.set(1.4, 1.4); fm.color.set(look.floor).multiplyScalar(3.4); for (const tx2 of [paving.map, paving.normalMap]) tx2.repeat.set(l.w / 2.5, l.h / 2.5); }
    this.puddles.repeat.set(l.w / (w.depth === 2 ? 5 : 9), l.h / (w.depth === 2 ? 5 : 9));
    floor.position.set((l.w * T) / 2, 0, (l.h * T) / 2);
    (floor.material as THREE.MeshStandardMaterial).map!.repeat.set(l.w / 2, l.h / 2);
    floor.receiveShadow = true;
    this.level.add(floor);

    // Walls: every wall tile is a block, so the mass reads as solid. Blocks beside
    // open floor can sink (the cutaway); light is stopped by full-height copies that never sink.
    const tint = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
      const col = new Float32Array(geo.getAttribute('position').count * 3);
      for (let i = 0; i < col.length / 3; i++) col.fill(geo.getAttribute('normal').getY(i) > 0.5 ? 0.36 : 1, i * 3, i * 3 + 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return geo;
    };
    const box = tint(new THREE.BoxGeometry(T, WALL_H, T).translate(0, WALL_H / 2, 0));
    const hewn = tint(new THREE.BoxGeometry(T, WALL_H, T, 5, 6, 5).translate(0, WALL_H / 2, 0));
    const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.wall).multiplyScalar(1.35), map: this.block, normalMap: this.blockN, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9, vertexColors: true, flatShading: true });
    // Hewn, weathered stone: every block is pushed about by one field of noise in world
    // space, so neighbours agree where they meet and no wall is a row of cubes.
    wallMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        attribute vec4 aOpen;
        float vh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(vh(i), vh(i + vec3(1,0,0)), f.x), mix(vh(i + vec3(0,1,0)), vh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(vh(i + vec3(0,0,1)), vh(i + vec3(1,0,1)), f.x), mix(vh(i + vec3(0,1,1)), vh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 wp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        float planted = smoothstep(0.0, 0.7, wp.y);
        // Only faces that look onto open floor move, and only outwards, so the stone always
        // stands in front of the full block that stops the light. Edges shared with a
        // neighbouring block stay shared; exposed corners are worn round.
        vec2 dir = vec2(0.0);
        float hx = position.x / ${(T / 2).toFixed(1)}, hz = position.z / ${(T / 2).toFixed(1)};
        if (hx > 0.98) dir.x += aOpen.x; if (hx < -0.98) dir.x -= aOpen.y;
        if (hz > 0.98) dir.y += aOpen.z; if (hz < -0.98) dir.y -= aOpen.w;
        float dl = length(dir);
        if (dl > 0.0) transformed.xz += dir / dl * (vn(wp * 0.55) * 0.5 + vn(wp * 1.9 + 7.0) * 0.2 + 0.02) * planted;
        // the tops are broken, not levelled: some stretches stand, some have come down
        float crown = smoothstep(0.55, 1.0, position.y / ${WALL_H.toFixed(1)});
        transformed.y += (vn(vec3(wp.x * 0.33, 0.0, wp.z * 0.33)) - 0.6) * 1.5 * crown;
        vec2 wuv = abs(normal.y) > 0.5 ? wp.xz : (abs(normal.x) > 0.5 ? wp.zy : wp.xy);
        #ifdef USE_MAP
          vMapUv = wuv * 0.21;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = wuv * 0.21;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = wuv * 0.21;
        #endif`);
    };
    const scan = material(w.depth === 2 ? 'mossy_rock' : 'dark_rock_02');
    if (scan) { wallMat.map = scan.map; wallMat.normalMap = scan.normalMap; wallMat.roughnessMap = scan.roughnessMap; wallMat.roughness = 1; wallMat.normalScale.set(1.6, 1.6); wallMat.color.set(look.wall).multiplyScalar(w.depth === 2 ? 2.6 : 3.2); }
    const cells: number[] = [], inner: number[] = [];
    for (let i = 0; i < l.tiles.length; i++) {
      if (l.tiles[i] !== WALL) continue;
      const x = i % l.w, y = (i / l.w) | 0;
      let open = false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a2 = x + dx, b2 = y + dy; if (a2 >= 0 && b2 >= 0 && a2 < l.w && b2 < l.h && l.tiles[idx(l, a2, b2)] !== WALL) open = true; }
      (open ? cells : inner).push(i);
    }
    const openTo = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < l.w && y < l.h && l.tiles[idx(l, x, y)] !== WALL;
    const openAttr = new Float32Array(Math.max(1, cells.length) * 4);
    cells.forEach((cell, n) => { const x = cell % l.w, y = (cell / l.w) | 0; openAttr.set([openTo(x + 1, y) ? 1 : 0, openTo(x - 1, y) ? 1 : 0, openTo(x, y + 1) ? 1 : 0, openTo(x, y - 1) ? 1 : 0], n * 4); });
    hewn.setAttribute('aOpen', new THREE.InstancedBufferAttribute(openAttr, 4));
    box.setAttribute('aOpen', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, inner.length) * 4), 4));
    const walls = new THREE.InstancedMesh(hewn, wallMat, Math.max(1, cells.length));
    walls.count = cells.length;
    const mass = new THREE.InstancedMesh(box, wallMat, Math.max(1, inner.length));
    mass.count = inner.length;
    inner.forEach((cell, n) => mass.setMatrixAt(n, M.makeTranslation(centre(cell % l.w), 0, centre((cell / l.w) | 0))));
    mass.frustumCulled = false;
    const border: number[] = [];
    this.wallAt = new Int32Array(l.w * l.h).fill(-1);
    this.wallScale = new Float32Array(cells.length).fill(1);
    seedN = 5 + w.depth;
    cells.forEach((cell, n) => {
      const x = cell % l.w, y = (cell / l.w) | 0;
      let open = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a2 = x + dx, b2 = y + dy; if (a2 >= 0 && b2 >= 0 && a2 < l.w && b2 < l.h && l.tiles[idx(l, a2, b2)] !== WALL) open = true; }
      if (open) border.push(cell);
      this.wallAt[cell] = n;
      walls.setMatrixAt(n, M.makeTranslation(centre(x), 0, centre(y)));
      walls.setColorAt(n, C.setScalar(0.9 + rnd() * 0.16));
    });
    walls.receiveShadow = true;
    walls.frustumCulled = false;
    this.walls = walls;
    this.level.add(mass);
    const proxy = new THREE.InstancedMesh(new THREE.BoxGeometry(T, WALL_H, T).translate(0, WALL_H / 2, 0), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), border.length);
    border.forEach((cell, n) => proxy.setMatrixAt(n, M.makeTranslation(centre(cell % l.w), 0, centre((cell / l.w) | 0))));
    proxy.castShadow = true; proxy.frustumCulled = false;
    this.level.add(walls, proxy);

    const tg = thicketGeometry();
    const tcells: number[] = [];
    for (let i = 0; i < l.tiles.length; i++) if (l.tiles[i] === THICKET) tcells.push(i);
    this.thickets = new THREE.InstancedMesh(tg, this.bodyMat, Math.max(1, tcells.length));
    this.thickets.count = tcells.length;
    this.thicketAt.clear();
    tcells.forEach((cell, n) => { this.thicketAt.set(cell, n); this.thickets!.setMatrixAt(n, M.compose(P.set(centre(cell % l.w), 0, centre((cell / l.w) | 0)), Q.setFromAxisAngle(P.clone().set(0, 1, 0), rnd() * 6), S.set(1, 0.9 + rnd() * 0.4, 1))); });
    this.thickets.frustumCulled = false;
    this.level.add(this.thickets);
    // Undergrowth: thick along the walls, round every plant and under the daylight.
    const spots: [number, number, number][] = [];
    const wallNear = (x: number, y: number): [number, number] | null => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (l.tiles[idx(l, x + dx, y + dy)] === WALL) return [dx, dy]; return null; };
    const rocks: [number, number, number][] = [];
    for (let y = 1; y < l.h - 1; y++) for (let x = 1; x < l.w - 1; x++) {
      if (l.tiles[idx(l, x, y)] !== FLOOR) continue;
      const edge = wallNear(x, y);
      if (edge) {
        for (let i = 0, n = rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0; i < n; i++) spots.push([centre(x) + edge[0] * (0.45 + rnd() * 0.45) + (edge[1] ? rnd() * 1.8 - 0.9 : 0), centre(y) + edge[1] * (0.45 + rnd() * 0.45) + (edge[0] ? rnd() * 1.8 - 0.9 : 0), 0.7 + rnd() * 0.9]);
        for (let i = 0, n = rnd() < 0.45 ? 1 + Math.floor(rnd() * 4) : 0; i < n; i++) rocks.push([centre(x) + edge[0] * (0.45 + rnd() * 0.45) + (edge[1] ? rnd() * 1.8 - 0.9 : 0), centre(y) + edge[1] * (0.45 + rnd() * 0.45) + (edge[0] ? rnd() * 1.8 - 0.9 : 0), 0.5 + rnd() * rnd() * 3.2]);
      } else if (rnd() < 0.1) spots.push([centre(x) + rnd() * 1.6 - 0.8, centre(y) + rnd() * 1.6 - 0.8, 0.5 + rnd() * 0.6]);
    }
    for (const p of w.plants) for (let i = 0; i < 4; i++) { const a = rnd() * 6.28, d = 0.5 + rnd() * 0.9; spots.push([p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, 0.6 + rnd() * 0.8]); }
    for (const b of w.breaches) for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = rnd() * 2.6; spots.push([b.x + Math.cos(a) * d, b.z + Math.sin(a) * d, 0.9 + rnd() * 1.1]); }
    const tufts = new THREE.InstancedMesh(tuftGeometry(), this.bodyMat, Math.max(1, spots.length));
    tufts.count = spots.length;
    spots.forEach(([x, z, sc], n) => { tufts.setMatrixAt(n, M.compose(P.set(x, 0, z), Q.setFromAxisAngle(S.set(0, 1, 0), rnd() * 6.28), S.set(sc, sc * (0.8 + rnd() * 0.6), sc))); tufts.setColorAt(n, C.setRGB(0.7 + rnd() * 0.6, 0.8 + rnd() * 0.5, 0.7 + rnd() * 0.5)); });
    tufts.receiveShadow = true; tufts.frustumCulled = false;
    const rock = new THREE.IcosahedronGeometry(0.2, 1);
    { const rp = rock.getAttribute('position'); for (let i = 0; i < rp.count; i++) { const k = 0.72 + ((Math.sin(rp.getX(i) * 37.1 + rp.getY(i) * 71.3 + rp.getZ(i) * 53.9) * 43758.5) % 1 + 1) % 1 * 0.5; rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k, rp.getZ(i) * k); } rock.computeVertexNormals(); }
    const rubble = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: new THREE.Color(look.wall).multiplyScalar(1.1), roughness: 0.95, flatShading: true }), Math.max(1, rocks.length));
    rubble.count = rocks.length;
    rocks.forEach(([x, z, sc], n) => rubble.setMatrixAt(n, M.compose(P.set(x, 0.07 * sc, z), Q.setFromAxisAngle(S.set(rnd(), rnd(), rnd()).normalize(), rnd() * 6), S.set(sc, sc * 0.7, sc * (0.7 + rnd() * 0.6)))));
    rubble.castShadow = true; rubble.receiveShadow = true; rubble.frustumCulled = false;
    this.level.add(tufts, rubble);
    if (assets.ready) for (let i = 0; i < rocks.length; i += 9) { const [x, z] = rocks[i]; const piece = prop(i % 2 ? 'rubble_half' : 'rubble_large', 1.6 + rnd() * 1.4); if (piece) { piece.position.set(x, 0, z); piece.rotation.y = rnd() * 6.28; this.level.add(piece); } }

    // Daylight through the broken roof: a shaft and a pool, no light of its own beyond the pooled one.
    for (const b of w.breaches) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.0, 30, 18, 1, true).translate(0, 15, 0), new THREE.MeshBasicMaterial({ color: 0xbcd4e6, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.glowMap, color: 0x9fb8c8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      shaft.position.set(b.x, 0, b.z); pool.position.set(b.x, 0.05, b.z);
      this.level.add(shaft, pool);
    }
    // Contact shade: the floor darkens into the foot of every wall, so the stone sits on the ground.
    const K = 8;
    const ao = canvasTexture(l.w * K, (g) => {
      g.filter = 'blur(3px)';
      g.fillStyle = 'rgba(0,0,0,0.85)';
      for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.tiles[idx(l, x, y)] === WALL) g.fillRect(x * K - 2.5, y * K - 2.5, K + 5, K + 5);
    });
    ao.wrapS = ao.wrapT = THREE.ClampToEdgeWrapping; ao.flipY = false;
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(l.w * T, l.h * T).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ao, transparent: true, opacity: 0.6, depthWrite: false, color: 0x000000 }));
    shade.position.set((l.w * T) / 2, 0.015, (l.h * T) / 2);
    shade.renderOrder = 0;
    this.level.add(shade);

    // Warden light, still on in the seams of the lower layers.
    this.seams = [];
    if (w.depth >= 3) {
      const strips: [number, number, number][] = [];
      for (let y = 1; y < l.h - 1; y++) for (let x = 1; x < l.w - 1; x++) {
        if (l.tiles[idx(l, x, y)] !== FLOOR || rnd() > (w.depth === 4 ? 0.2 : 0.1)) continue;
        const e = wallNear(x, y);
        if (e) { strips.push([centre(x) + e[0] * 0.97, centre(y) + e[1] * 0.97, e[0] ? 0 : 1]); this.seams.push({ x: centre(x) + e[0] * 0.6, z: centre(y) + e[1] * 0.6 }); }
      }
      const seam = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.9, 0.05).translate(0, 1.2, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf3fbff).multiplyScalar(1.7), fog: false }), Math.max(1, strips.length));
      seam.count = strips.length;
      strips.forEach(([x, z], n) => seam.setMatrixAt(n, M.makeTranslation(x, 0, z)));
      seam.frustumCulled = false;
      this.level.add(seam);
    }
    (this.haze.material as THREE.MeshBasicMaterial).color.set(look.amb).multiplyScalar(w.depth === 2 ? 3.4 : 2.2);
    this.decals.count = 0; this.decalN = 0;
    this.target.set(w.player.x, 0, w.player.z);
  }

  // ── effects ───────────────────────────────────────────────────────────────

  private particle(x: number, y: number, z: number, vx: number, vy: number, vz: number, c: THREE.Color, size: number, life: number, grav = 0): void {
    const i = this.pNext; this.pNext = (i + 1) % this.N;
    this.pPos.set([x, y, z], i * 3); this.pVel.set([vx, vy, vz], i * 3); this.pBase.set([c.r, c.g, c.b], i * 3);
    this.pSize[i] = size; this.pLife[i] = this.pMax[i] = life; this.pGrav[i] = grav;
  }

  private spray(x: number, z: number, c: THREE.Color, n: number, speed: number, size: number, life: number, y = 0.8): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = speed * (0.3 + Math.random());
      this.particle(x, y, z, Math.cos(a) * s, Math.random() * speed * 0.9, Math.sin(a) * s, c, size * (0.6 + Math.random() * 0.8), life * (0.5 + Math.random()), 9);
    }
  }

  private ring(x: number, z: number, r: number, t: number, colour: THREE.Color, grow: boolean): void {
    const ring = this.rings.find((q) => !q.m.visible) ?? this.rings[0];
    ring.m.visible = true; ring.m.position.set(x, 0.06, z); ring.t = 0; ring.max = t; ring.r = r; ring.grow = grow;
    (ring.m.material as THREE.MeshBasicMaterial).color.copy(colour);
  }

  private colour(c: number): THREE.Color { return c <= 360 ? srgb(c, 0.85, 0.6) : C.clone().setHex(c, THREE.SRGBColorSpace); }

  consume(fx: Fx[], w: World): void {
    for (const f of fx) {
      if (f.k === 'shake') this.shake = Math.max(this.shake, f.n * this.shakeScale);
      else if (f.k === 'ring') this.ring(f.x, f.z, f.r, f.t, this.colour(f.c), true);
      else if (f.k === 'burst') {
        const c = this.colour(f.c);
        this.ring(f.x, f.z, f.r, 0.28, c, true);
        this.spray(f.x, f.z, c, 46, f.r * 3.2, 0.3, 0.55);
        this.flashes.push({ x: f.x, z: f.z, c, t: 0, max: 0.45, power: 60 });
      } else if (f.k === 'leaves') this.spray(f.x, f.z, srgb(f.c, 0.5, 0.2), f.n, 4.5, 0.2, 0.7);
      else if (f.k === 'gore') {
        const i = this.decalN++ % 72, sc = 0.7 + f.n * 0.09 + Math.random() * 0.6;
        this.decals.setMatrixAt(i, M.compose(P.set(f.x, 0.02 + (i % 7) * 0.001, f.z), Q.setFromAxisAngle(S.set(0, 1, 0), Math.random() * 6.28), S.set(sc, 1, sc * (0.7 + Math.random() * 0.6))));
        this.decals.setColorAt(i, C.setRGB(0.05, 0.1 + Math.random() * 0.05, 0.12));
        this.decals.count = Math.min(72, this.decalN); this.decals.instanceMatrix.needsUpdate = true; if (this.decals.instanceColor) this.decals.instanceColor.needsUpdate = true; this.spray(f.x, f.z, srgb(300, 0.5, 0.25), f.n, 5, 0.24, 0.5); this.spray(f.x, f.z, srgb(190, 0.3, 0.3), f.n / 2, 3, 0.16, 0.6); }
      else if (f.k === 'spark') this.spray(f.x, f.z, this.colour(f.c), f.n, 3.5, 0.2, 0.6);
      else if (f.k === 'hit' && f.who !== 'plant') this.spray(f.x, f.z, f.who === 'player' ? srgb(8, 0.8, 0.5) : srgb(45, 0.6, 0.65), f.crit ? 14 : 6, 5, 0.17, 0.25, 1.0);
      else if (f.k === 'thicket') { const n = this.thicketAt.get(idx(w.level, f.tx, f.ty)); if (n !== undefined && this.thickets) { this.thickets.setMatrixAt(n, M.makeScale(0, 0, 0)); this.thickets.instanceMatrix.needsUpdate = true; } }
      else if (f.k === 'slash') {
        const s = this.slashes.find((q) => !q.m.visible) ?? this.slashes[0];
        s.m.geometry.dispose();
        s.m.geometry = new THREE.RingGeometry(f.reach * 0.45, f.reach, 18, 1, -f.arc / 2, f.arc).rotateX(-Math.PI / 2);
        s.m.position.set(f.x, 1.0, f.z); s.m.rotation.y = -f.a; s.m.visible = true; s.t = 0;
        (s.m.material as THREE.MeshBasicMaterial).color.set(f.heavy ? 0xffe08a : 0xfff0c4);
      } else if (f.k === 'shot') {
        const t = this.tracers.find((q) => !q.m.visible) ?? this.tracers[0];
        t.m.position.set(f.x, 1.2, f.z); t.m.scale.x = Math.hypot(f.x2 - f.x, f.z2 - f.z); t.m.rotation.y = -Math.atan2(f.z2 - f.z, f.x2 - f.x); t.m.visible = true; t.t = 0;
        this.flashes.push({ x: f.x, z: f.z, c: srgb(40, 0.8, 0.7), t: 0, max: 0.09, power: 9 });
        this.spray(f.x2, f.z2, srgb(40, 0.6, 0.6), 5, 3, 0.14, 0.2, 1.1);
      }
    }
  }

  // ── every frame ───────────────────────────────────────────────────────────

  update(w: World, dt: number): void {
    this.time += dt;
    const p = w.player, t = this.time;
    const dark = !p.torch;

    const lightsEarly: { x: number; z: number; c: THREE.Color; power: number }[] = [];
    // the operative
    if (assets.ready && !this.hero) { this.hero = makeHero(); this.scene.add(this.hero.root); this.rig.root.visible = false; }
    if (this.hero) animateHero(this.hero, w, t, dt); else animate(this.rig, w, t, dt);

    // light
    const cellGlow = p.torch ? 1 : 0;
    this.torch.intensity += ((cellGlow * (p.cell < 12 ? 90 + Math.sin(t * 30) * 45 : 170)) - this.torch.intensity) * Math.min(1, dt * 14);
    this.torch.position.set(p.x + Math.cos(p.face) * 0.55, 3.1, p.z + Math.sin(p.face) * 0.55);
    this.torch.target.position.set(p.x + Math.cos(p.face) * 8.5, 0, p.z + Math.sin(p.face) * 8.5);
    this.suit.position.set(p.x, 2.2, p.z);
    this.suit.intensity = dark ? 7 : 15;
    this.hemi.intensity += ((dark ? 3.3 : 5.2) - this.hemi.intensity) * Math.min(1, dt * 3);
    this.wind.value = t;
    const reach = Math.min(15, rayWall(w.level, p.x, p.z, Math.cos(p.face), Math.sin(p.face), 15) + 1.2);
    this.cone.position.set(p.x, 1.25, p.z); this.cone.rotation.y = -p.face; this.cone.scale.set(reach, 1, reach);
    (this.cone.material as THREE.ShaderMaterial).uniforms.power.value = this.torch.intensity / 170 * 0.06;
    this.haze.position.x = this.target.x; this.haze.position.z = this.target.z;
    const hm = (this.haze.material as THREE.MeshBasicMaterial).map!;
    hm.offset.set(this.target.x / 80 * 3 + t * 0.004, -this.target.z / 80 * 3 + t * 0.0027);
    // spores on the air, everywhere, always
    if (Math.random() < dt * 9) { const a = Math.random() * 6.28, d = 2 + Math.random() * 12; this.particle(p.x + Math.cos(a) * d, 0.3 + Math.random() * 2, p.z + Math.sin(a) * d, (Math.random() - 0.5) * 0.3, 0.08, (Math.random() - 0.5) * 0.3, C.setRGB(0.06, 0.2, 0.18), 0.09, 3.5); }
    for (const sm of this.seams) if (Math.abs(sm.x - p.x) + Math.abs(sm.z - p.z) < 14) lightsEarly.push({ x: sm.x, z: sm.z, c: WARDEN, power: 5 });
    // dust in the beam
    if (p.torch && Math.random() < dt * 40) {
      const d = 2 + Math.random() * 13, a = p.face + (Math.random() - 0.5) * 0.85;
      this.particle(p.x + Math.cos(a) * d, 0.3 + Math.random() * 1.8, p.z + Math.sin(a) * d, (Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2, C.setRGB(0.16, 0.15, 0.13), 0.07, 1.6);
    }

    this.cutaway(w, dt);
    const lights: { x: number; z: number; c: THREE.Color; power: number }[] = lightsEarly;
    this.syncPlants(w, dt, lights);
    this.syncEnemies(w, dt, lights);
    this.syncRest(w, dt, lights);

    for (const f of this.flashes) { f.t += dt; lights.push({ x: f.x, z: f.z, c: f.c, power: f.power * (1 - f.t / f.max) * 6 }); }
    this.flashes = this.flashes.filter((f) => f.t < f.max);
    lights.sort((a, b) => b.power / (1 + (b.x - p.x) ** 2 + (b.z - p.z) ** 2) - a.power / (1 + (a.x - p.x) ** 2 + (a.z - p.z) ** 2));
    this.pool.forEach((l, i) => {
      const s = lights[i];
      if (!s) { l.intensity = 0; return; }
      l.position.set(s.x, 1.3, s.z); l.color.copy(s.c); l.intensity = s.power;
    });

    for (const q of this.rings) {
      if (!q.m.visible) continue;
      q.t += dt;
      const k = Math.min(1, q.t / q.max);
      q.m.scale.setScalar(q.r * (q.grow ? 0.15 + 0.85 * k : 1));
      (q.m.material as THREE.MeshBasicMaterial).opacity = (1 - k * k) * 0.85;
      if (k >= 1) q.m.visible = false;
    }
    for (const s of this.slashes) { if (!s.m.visible) continue; s.t += dt; (s.m.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - s.t / 0.16); if (s.t > 0.16) s.m.visible = false; }
    for (const s of this.tracers) { if (!s.m.visible) continue; s.t += dt; (s.m.material as THREE.MeshBasicMaterial).opacity = 1 - s.t / 0.07; if (s.t > 0.07) s.m.visible = false; }

    for (let i = 0; i < this.N; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      const k = Math.max(0, this.pLife[i] / this.pMax[i]), j = i * 3;
      this.pVel[j + 1] -= this.pGrav[i] * dt;
      this.pPos[j] += this.pVel[j] * dt; this.pPos[j + 1] += this.pVel[j + 1] * dt; this.pPos[j + 2] += this.pVel[j + 2] * dt;
      if (this.pPos[j + 1] < 0.04) { this.pPos[j + 1] = 0.04; this.pVel[j] *= 0.8; this.pVel[j + 2] *= 0.8; this.pVel[j + 1] = 0; }
      const fade = Math.min(1, k * 2.5) * Math.min(1, (1 - k) * 8 + 0.2);
      this.pCol[j] = this.pBase[j] * fade; this.pCol[j + 1] = this.pBase[j + 1] * fade; this.pCol[j + 2] = this.pBase[j + 2] * fade;
      if (this.pLife[i] <= 0) this.pSize[i] = 0;
    }
    const pg = this.points.geometry;
    pg.getAttribute('position').needsUpdate = true; pg.getAttribute('color').needsUpdate = true; pg.getAttribute('size').needsUpdate = true;

    // camera
    const lead = this.lead;
    P.set(p.x + Math.cos(p.face) * VIEW * lead * 0.5, 0, p.z + Math.sin(p.face) * VIEW * lead * 0.5);
    this.target.lerp(P, Math.min(1, dt * 5));
    this.shake = Math.max(0, this.shake - dt * 2.6);
    const sh = this.shake * this.shake * 0.9;
    this.camera.position.copy(this.target).add(CAM).add(P.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    this.camera.lookAt(P.copy(this.camera.position).sub(CAM));
    this.lowHp += ((p.hp < p.maxHp * 0.3 && p.state !== 'dead' ? 1 : 0) - this.lowHp) * Math.min(1, dt * 3);
    this.post.render(t, Math.max(0, 1 - p.hurtT * 2.2), p.torch ? 0 : 1, w.still > 0 ? 1 : 0, this.lowHp);
  }

  /** Walls between the camera and the operative sink, so you can always see where you stand. */
  private cutaway(w: World, dt: number): void {
    if (!this.walls) return;
    const l = w.level, p = w.player, a = tx(p.x), b = tx(p.z);
    let changed = false;
    for (let y = b - 7; y <= b + 7; y++) for (let x = a - 7; x <= a + 7; x++) {
      if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue;
      const n = this.wallAt[idx(l, x, y)];
      if (n < 0) continue;
      const dx = centre(x) - p.x, dz = centre(y) - p.z, toward = dx + dz, across = Math.abs(dx - dz);
      const want = toward > 0.6 && toward < 11 && across < 6.5 ? CUT : 1;
      const cur = this.wallScale[n];
      if (Math.abs(cur - want) < 0.01) continue;
      const next = cur + (want - cur) * Math.min(1, dt * 9);
      this.wallScale[n] = next;
      this.walls.setMatrixAt(n, M.compose(P.set(centre(x), 0, centre(y)), Q.identity(), S.set(1, next, 1)));
      changed = true;
    }
    if (changed) this.walls.instanceMatrix.needsUpdate = true;
  }

  private syncPlants(w: World, dt: number, lights: { x: number; z: number; c: THREE.Color; power: number }[]): void {
    const t = this.time;
    for (const p of w.plants) {
      let v = this.plants.get(p.id);
      if (p.dead) {
        // cut down, it sags and folds before it is gone
        if (v) { v.wilt += dt; const k = Math.max(0, 1 - v.wilt / 0.55); v.root.scale.set(p.scale * (1 + (1 - k) * 0.5), p.scale * k * k, p.scale * (1 + (1 - k) * 0.5)); v.root.rotation.z = (1 - k) * 0.5; v.glow.color.copy(v.base).multiplyScalar(k * 0.4); v.pool.color.copy(v.base).multiplyScalar(k * 0.1); if (k <= 0) { this.ents.remove(v.root); this.plants.delete(p.id); } }
        continue;
      }
      const s = w.camp.species[p.sp];
      if (!v) {
        const key = `${p.sp}:${p.id % 3}`;
        let g = this.geo.get(key);
        if (!g) { g = plantGeometry(s, w.camp.seed, p.id % 3); this.geo.set(key, g); }
        const root = new THREE.Group();
        const base = srgb(s.glow, 0.85, 0.6);
        const glow = new THREE.MeshBasicMaterial({ color: base.clone() });
        const pool = new THREE.MeshBasicMaterial({ map: this.glowMap, color: base.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        const body = new THREE.Mesh(g.body, this.bodyMat);
        body.castShadow = true; body.receiveShadow = true;
        const disc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2), pool);
        disc.position.y = 0.04; disc.scale.setScalar(1 / p.scale);
        root.add(body, new THREE.Mesh(g.glow, glow), disc);
        root.position.set(p.x, 0, p.z); root.rotation.y = p.rot; root.scale.setScalar(p.scale);
        this.ents.add(root);
        v = { root, glow, pool, base, level: 0.3, wilt: 0, rear: 0 };
        this.plants.set(p.id, v);
      }
      const lantern = s.behaviour === 'lantern' && p.mood === 'asleep';
      let want = p.mood === 'awake' ? 1.6 : p.mood === 'stir' ? 0.4 + (p.t / TUNE.mood.stir) * (0.7 + 0.5 * Math.sin(t * 34)) : lantern ? 1.25 : 0.36 + 0.06 * Math.sin(t * 1.3 + p.wind);
      if (p.fuse > 0 && s.behaviour === 'burst') want = 1.2 + Math.sin(t * 40) * 1.2;
      want += p.surge * 2.4;
      if (p.flash > 0) want = 3;
      v.level += (want - v.level) * Math.min(1, dt * (p.surge > 0.5 ? 30 : 10));
      v.glow.color.copy(v.base).multiplyScalar(v.level);
      v.pool.color.copy(v.base).multiplyScalar(Math.min(1.1, v.level * 0.34));
      const awake = p.mood !== 'asleep';
      // The same tell for every species: awake plants stand taller and tremble.
      const sw = Math.sin(t * 0.9 + p.wind) * 0.035;
      v.root.rotation.z = sw + (awake ? Math.sin(t * 47 + p.wind) * 0.035 : 0);
      v.root.rotation.x = Math.cos(t * 0.7 + p.wind) * 0.03 + (awake ? Math.cos(t * 53) * 0.03 : 0);
      const swell = p.fuse > 0 && s.behaviour === 'burst' ? 1 + (1.15 - p.fuse) * 0.4 : 1;
      // anything that strikes rears first, then throws itself wide; the same motion whatever it is
      const striking = s.behaviour === 'spines' || s.behaviour === 'snare';
      const since = s.behaviour === 'spines' ? 1.5 - p.cd : 3.2 - p.cd;
      const want2 = striking && p.fuse > 0 ? 1 : striking && p.mood === 'awake' && since >= 0 && since < 0.22 ? -1.2 : 0;
      v.rear += (want2 - v.rear) * Math.min(1, dt * (want2 < 0 ? 40 : 12));
      const stir = p.mood === 'stir' ? Math.sin(Math.min(1, p.t / TUNE.mood.stir) * Math.PI) * 0.12 : 0;
      const wide = (1 - Math.min(0, v.rear) * 0.45 - Math.max(0, v.rear) * 0.14) * swell, tall = (awake ? 1.14 : 1) * (1 + Math.max(0, v.rear) * 0.3 + Math.min(0, v.rear) * 0.3 + stir) * swell;
      v.root.scale.set(p.scale * wide, p.scale * tall, p.scale * wide);
      v.root.visible = this.inView(p.x, p.z);
      if (v.level > 0.9) lights.push({ x: p.x, z: p.z, c: v.base, power: v.level * 9 });
    }
  }

  private syncEnemies(w: World, dt: number, lights: { x: number; z: number; c: THREE.Color; power: number }[]): void {
    const t = this.time;
    for (const e of w.enemies) {
      let v = this.enemies.get(e.id);
      if (e.dead && e.deadT > (v?.puppet ? 2.2 : 0.4)) { if (v) { this.ents.remove(v.c.root); this.enemies.delete(e.id); } continue; }
      if (!v) {
        const c = creature(e.type);
        c.yaw = e.face;
        if (e.elite) c.root.scale.setScalar(1.25);
        const puppet = e.type === 'husk' && assets.ready ? makeHusk() : null;
        if (puppet) { c.root.clear(); c.root.add(puppet.root); c.body = new THREE.Group(); }
        this.ents.add(c.root);
        v = { c, bar: null, puppet };
        this.enemies.set(e.id, v);
      }
      const { root, body, skin } = v.c;
      root.position.set(e.x, 0, e.z);
      root.visible = this.inView(e.x, e.z);
      if (v.puppet) {
        // an authored figure: the root carries the heading, the clips do the rest
        if (!e.dead) { const lean = Math.atan2(Math.sin(e.face - v.c.yaw), Math.cos(e.face - v.c.yaw)); v.c.yaw += lean * Math.min(1, dt * 7); }
        root.rotation.y = -v.c.yaw;
        v.puppet.root.position.set(0, 0, 0);
        animateHusk(v.puppet, { ...e, x: 0, z: 0 }, dt);
      }
      if (v.puppet) { if (e.dead) continue; } else if (e.dead) { const k = 1 - e.deadT / 0.4; body.scale.set(1 + (1 - k) * 0.5, Math.max(0.02, k), 1 + (1 - k) * 0.5); body.rotation.z = (1 - k) * 0.6; continue; }
      const pale = e.type === 'tender' || e.type === 'warden';
      skin.emissive.setHex(e.flash > 0 || (e.type === 'warden' && e.state === 'windup') ? 0xffffff : e.state === 'windup' && !pale ? 0x5a1810 : pale ? 0x8fa3ad : 0x000000);
      if (!v.puppet) animateCreature(v.c, e, t, dt);
      if (e.type === 'grazer') lights.push({ x: e.x, z: e.z, c: GRAZER, power: 2.6 });
      if (e.type === 'warden') lights.push({ x: e.x, z: e.z, c: WARDEN, power: e.phase ? 9 : 4 });

      const hurt = e.hp < e.maxHp && e.type !== 'unlit' && e.type !== 'grazer';
      if (hurt && !v.bar) {
        v.bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.09).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: e.type === 'tender' ? 0xf3fbff : 0xd2523f, depthTest: false }));
        v.bar.renderOrder = 5; this.ents.add(v.bar);
      }
      if (v.bar) {
        const wdt = e.type === 'tender' ? 4 : 0.9 + e.r;
        v.bar.quaternion.copy(this.camera.quaternion);
        v.bar.position.set(e.x, e.type === 'tender' ? 4.2 : 1.6 + e.r * 1.4, e.z).add(P.set(-wdt / 2, 0, 0).applyQuaternion(this.camera.quaternion));
        v.bar.scale.x = Math.max(0.001, (e.hp / e.maxHp) * wdt);
      }
    }
    for (const [id, v] of this.enemies) { const e = w.enemies.find((x) => x.id === id); if ((!e || e.dead) && v.bar) { this.ents.remove(v.bar); v.bar = null; } if (!e) { this.ents.remove(v.c.root); this.enemies.delete(id); } }

    const boss = w.boss;
    this.beam.visible = !!boss && !boss.dead && boss.state === 'strike' && boss.phase === 0;
    this.nova.visible = !!boss && !boss.dead && boss.state === 'strike' && boss.phase === 2;
    if (boss && this.beam.visible) { this.beam.position.set(boss.x, 1.2, boss.z); this.beam.rotation.y = -boss.face; this.beam.scale.set(boss.tz, 1, 1); }
    if (boss && this.nova.visible) { this.nova.position.set(boss.x, 0.9, boss.z); this.nova.scale.set(boss.tx, 30, boss.tx); }
    if (boss && !boss.dead && boss.state === 'windup' && boss.phase === 0) { this.beam.visible = true; this.beam.position.set(boss.x, 1.2, boss.z); this.beam.rotation.y = -boss.face; this.beam.scale.set(14, 0.15, 0.12); }
  }

  private syncRest(w: World, dt: number, lights: { x: number; z: number; c: THREE.Color; power: number }[]): void {
    const t = this.time, white = C.clone().setHex(0xf3fbff), yellow = C.clone().setHex(0xf0bf2c);
    for (const q of w.props) {
      let o = this.props.get(q.id);
      if (!o) { o = this.kitProp(q.kind, q.id, q.data) ?? propMesh(q.kind); o.position.set(q.x, 0, q.z); o.rotation.y = q.kind === 'urn' || q.kind === 'crate' || q.kind === 'body' ? q.rot : 0; this.ents.add(o); this.props.set(q.id, o); }
      if (q.used && (q.kind === 'urn' || q.kind === 'crate')) o.visible = false;
      const spin = o.getObjectByName('spin');
      if (spin) { spin.rotation.z = t * 0.35; lights.push({ x: q.x, z: q.z, c: white, power: 6 }); }
      const lamp = o.getObjectByName('lamp');
      if (lamp) {
        if (q.kind === 'plinth') { lamp.visible = !q.used; lamp.rotation.y = t; lamp.position.y = 1.5 + Math.sin(t * 2) * 0.1; if (!q.used) lights.push({ x: q.x, z: q.z, c: white, power: 16 }); }
        if (q.kind === 'chest') lamp.visible = !q.used;
        if (q.kind === 'lift') { const cage = o.getObjectByName('cage'); if (cage) { cage.visible = w.liftT >= 0; cage.position.y = Math.max(0, w.liftT) * 2.6; }
          lamp.visible = w.liftT >= 0 ? Math.sin(t * 16) > 0 : Math.sin(t * 2.5) > 0.6; if (lamp.visible) lights.push({ x: q.x, z: q.z, c: yellow, power: 5 }); }
        if (q.kind === 'door') lights.push({ x: q.x - 1.5, z: q.z, c: white, power: w.boss?.dead ? 22 : 5 });
        if (q.kind === 'glyph' && !q.used) lights.push({ x: q.x, z: q.z + 1, c: white, power: 2.5 });
      }
    }
    for (const b of w.breaches) {
      lights.push({ x: b.x, z: b.z, c: DAY, power: 11 });
      if (Math.random() < dt * 14) this.particle(b.x + (Math.random() - 0.5) * 2.4, 5 + Math.random() * 3, b.z + (Math.random() - 0.5) * 2.4, 0, -0.5, 0, C.setRGB(0.2, 0.24, 0.27), 0.07, 5);
    }
    for (const l of w.loot) {
      let o = this.loot.get(l.id);
      if (l.gone) { if (o) { this.ents.remove(o); this.loot.delete(l.id); } continue; }
      if (!o) {
        const g = new THREE.Group();
        const basic = (c: THREE.ColorRepresentation): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: c });
        let core: THREE.Mesh;
        if (l.kind === 'salvage') core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshStandardMaterial({ color: 0xa9b3b8, metalness: 0.8, roughness: 0.3, emissive: 0x3a4044 }));
        else if (l.kind === 'medkit') core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), basic(0xf3d27a));
        else if (l.kind === 'ammo') core = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), basic(0xb48a2c));
        else if (l.kind === 'cell') core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), basic(0xfff1dc));
        else if (l.kind === 'graft') core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), basic(srgb(w.camp.species[l.n].glow, 0.85, 0.6)));
        else if (l.kind === 'sample') core = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), basic(srgb(w.camp.species[l.n].hue, 0.5, 0.35)));
        else {
          const col = l.kind === 'relic' ? '#f3fbff' : RARITY_COLOUR[l.item!.rarity];
          core = new THREE.Mesh(l.kind === 'relic' ? new THREE.OctahedronGeometry(0.24) : new THREE.BoxGeometry(0.9, 0.08, 0.16), basic(col));
          const tall = l.kind === 'relic' ? 7 : 1.2 + (l.item!.rarity) * 1.4;
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, tall, 5).translate(0, tall / 2, 0), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
          const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.glowMap, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
          disc.position.y = 0.05; g.add(beam, disc);
        }
        core.name = 'core'; g.add(core); this.ents.add(g); o = g; this.loot.set(l.id, o);
      }
      o.position.set(l.x, 0, l.z);
      o.visible = this.inView(l.x, l.z);
      const core = o.getObjectByName('core')!;
      core.position.y = 0.45 + Math.sin(t * 3 + l.id) * 0.1 + Math.max(0, 0.35 - l.t) * 3;
      core.rotation.y = t * 2 + l.id;
      if (l.kind === 'relic') lights.push({ x: l.x, z: l.z, c: white, power: 14 });
    }
    for (const z of w.zones) {
      let o = this.zones.get(z.id);
      if (z.gone) { if (o) { this.ents.remove(o); this.zones.delete(z.id); } continue; }
      if (!o) {
        const col = z.kind === 'cloud' ? 0x9c4fb8 : z.kind === 'friendcloud' ? 0x2fb8a6 : z.kind === 'gum' ? 0x16463f : z.kind === 'caltrop' ? 0x3d6a4a : z.kind === 'flare' ? 0xbff5ee : 0xd04bd0;
        const flat = z.kind === 'gum' || z.kind === 'caltrop';
        o = new THREE.Mesh(flat ? new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2) : new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: flat ? null : this.glowMap, color: col, transparent: true, opacity: flat ? 0.55 : 0.8, blending: flat ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
        this.ents.add(o); this.zones.set(z.id, o);
      }
      const cloud = z.kind === 'cloud' || z.kind === 'friendcloud';
      o.position.set(z.x, cloud ? 0.9 : 0.05, z.z);
      o.scale.setScalar(z.kind === 'flare' ? 0.6 : z.kind === 'decoy' ? 0.5 + Math.sin(t * 20) * 0.2 : z.r * (cloud ? 1 + Math.sin(t * 2 + z.id) * 0.08 : 1));
      ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.min(1, z.life) * (cloud ? 0.5 : 0.6);
      if (cloud && Math.random() < dt * 30) { const a = Math.random() * 6.28, d = Math.random() * z.r; this.particle(z.x + Math.cos(a) * d, 0.3 + Math.random() * 1.5, z.z + Math.sin(a) * d, 0, 0.3, 0, C.setHex(z.kind === 'cloud' ? 0x5a2a70 : 0x1c6f66), 0.35, 0.9); }
      if (z.kind === 'flare') { lights.push({ x: z.x, z: z.z, c: C.clone().setHex(0xbff5ee), power: 34 * Math.min(1, z.life) }); if (Math.random() < dt * 25) this.particle(z.x, 0.3, z.z, (Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2, C.setHex(0x8fe8dd), 0.16, 0.6, 3); }
    }
    for (const pr of w.projs) {
      let o = this.projs.get(pr.id);
      if (pr.gone) { if (o) { this.ents.remove(o); this.projs.delete(pr.id); } continue; }
      if (!o) { o = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe06ae0 })); this.ents.add(o); this.projs.set(pr.id, o); }
      o.position.set(pr.x, 1.0, pr.z);
      this.particle(pr.x, 1.0, pr.z, 0, 0, 0, C.setHex(0x8a2f8a), 0.22, 0.25);
      lights.push({ x: pr.x, z: pr.z, c: C.clone().setHex(0xe06ae0), power: 6 });
    }
  }

  /** Human kit comes from the authored set where there is a piece for it. */
  private kitProp(kind: string, id: number, data: number): THREE.Object3D | null {
    if (!assets.ready) return null;
    if (kind === 'crate') return prop((['box_small', 'box_large', 'barrel_small', 'crates_stacked'] as const)[id % 4], id % 4 === 3 ? 1.5 : 0.95);
    if (kind === 'chest') { const g = prop(data === 1 ? 'chest_gold' : 'chest', 1.5); const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf0bf2c).multiplyScalar(1.6) })); lamp.position.y = 1.1; lamp.name = 'lamp'; g?.add(lamp); return g; }
    if (kind === 'camp') {
      const g = new THREE.Group();
      const put = (o: THREE.Object3D | null, x: number, z: number, r: number): void => { if (o) { o.position.set(x, 0, z); o.rotation.y = r; g.add(o); } };
      put(prop('bed_floor', 1.9), -1.1, 0.3, 0.4); put(prop('table_small', 1.1), 0.9, -0.6, 0.2); put(prop('crates_stacked', 1.4), 1.2, 0.9, 1.1); put(prop('barrel_large', 0.9), -0.2, -1.2, 0); put(prop('trunk_small_A', 0.9), 0.1, 1.1, 2.2);
      return g;
    }
    return null;
  }

  /** Off-screen things are not drawn and cast no shadows. The screen is about 30 m across. */
  private inView(x: number, z: number): boolean { return Math.abs(x - this.target.x) < 30 && Math.abs(z - this.target.z) < 30 && Math.abs(x - this.target.x - (z - this.target.z)) < 36; }

  // ── screen and ground ─────────────────────────────────────────────────────

  project(x: number, y: number, z: number): { x: number; y: number } {
    P.set(x, y, z).project(this.camera);
    return { x: (P.x * 0.5 + 0.5) * window.innerWidth, y: (-P.y * 0.5 + 0.5) * window.innerHeight };
  }

  /** Where a screen point meets the floor. The only bridge the simulation gets from the view. */
  ground(sx: number, sy: number): { x: number; z: number } {
    P.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1, -1).unproject(this.camera);
    const d = CAM.clone().normalize().negate();
    const k = -P.y / d.y;
    return { x: P.x + d.x * k, z: P.z + d.z * k };
  }
}
