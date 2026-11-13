// The view: reads the world and writes three.js objects, never the reverse.
// One shadow-casting torch, a suit light and four pooled glow lights; the
// count never changes at run time.

import * as THREE from 'three';
import { BLADES, LAYERS, RARITY_COLOUR, T, TUNE } from './data';
import { FLOOR, THICKET, WALL, centre, idx, tx } from './level';
import { creature, operative, plantGeometry, propMesh, srgb, thicketGeometry, tuftGeometry } from './models';
import type { Creature, PlantGeo, Rig } from './models';
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
  g.fillStyle = '#8f8f8f'; g.fillRect(0, 0, 512, 512);
  // flagstones of uneven size, each its own grey
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 120 + rnd() * 60;
    g.fillStyle = `rgb(${v},${v},${v + 3})`;
    const off = y % 2 ? 64 : 0;
    g.fillRect(x * 128 + off + 2, y * 128 + 2, 124, 124);
    g.fillRect(x * 128 + off - 512 + 2, y * 128 + 2, 124, 124);
  }
  for (let i = 0; i < 5000; i++) { const v = rnd() * 255; g.fillStyle = `rgba(${v},${v},${v},0.06)`; g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 3, 2 + rnd() * 3); }
  g.strokeStyle = 'rgba(20,24,26,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) { g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rnd() * 50 - 25; y += rnd() * 50 - 25; g.lineTo(x, y); } g.stroke(); }
  // moss in the joins
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(40,${70 + rnd() * 40},50,0.16)`; const y = Math.floor(rnd() * 4) * 128, x = rnd() * 512; g.beginPath(); g.arc(x, y + rnd() * 6, 3 + rnd() * 7, 0, 7); g.fill(); }
});

const glowTex = (): THREE.CanvasTexture => canvasTexture(128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});

interface PlantView { root: THREE.Group; glow: THREE.MeshBasicMaterial; pool: THREE.MeshBasicMaterial; base: THREE.Color; level: number }
interface EnemyView { c: Creature; bar: THREE.Mesh | null; yaw: number }
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
  private bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, flatShading: true, side: THREE.DoubleSide });
  private glowMap = glowTex();
  private stone = stoneTex();
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
  private time = 0;
  // particles
  private N = 1100; private pPos = new Float32Array(this.N * 3); private pVel = new Float32Array(this.N * 3); private pCol = new Float32Array(this.N * 3);
  private pSize = new Float32Array(this.N); private pLife = new Float32Array(this.N); private pMax = new Float32Array(this.N); private pGrav = new Float32Array(this.N);
  private pNext = 0; private points: THREE.Points; private pBase = new Float32Array(this.N * 3);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.add(this.level, this.ents, this.hemi, this.torch, this.torch.target, this.suit, this.rig.root);
    this.torch.castShadow = true;
    this.torch.shadow.mapSize.set(1024, 1024);
    this.torch.shadow.bias = -0.0015;
    this.torch.shadow.camera.near = 0.5; this.torch.shadow.camera.far = 30;
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 1.5); this.pool.push(l); this.scene.add(l); }
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
      fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.1, d), 1.0); }',
    }));
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight, a = w / h;
    this.renderer.setSize(w, h, false);
    const v = a < 1 ? VIEW * 0.82 : VIEW;
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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(l.w * T, l.h * T).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.stone, color: new THREE.Color(look.floor).multiplyScalar(1.5), roughness: 0.93 }));
    floor.position.set((l.w * T) / 2, 0, (l.h * T) / 2);
    (floor.material as THREE.MeshStandardMaterial).map!.repeat.set(l.w / 2, l.h / 2);
    floor.receiveShadow = true;
    this.level.add(floor);

    // Walls: every wall tile is a block, so the mass reads as solid. Blocks beside
    // open floor can sink (the cutaway); light is stopped by full-height copies that never sink.
    const box = new THREE.BoxGeometry(T, WALL_H, T).translate(0, WALL_H / 2, 0);
    const col = new Float32Array(box.getAttribute('position').count * 3);
    for (let i = 0; i < col.length / 3; i++) { const top = box.getAttribute('normal').getY(i) > 0.5; col.fill(top ? 0.34 : 1, i * 3, i * 3 + 3); }
    box.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cells: number[] = [];
    for (let i = 0; i < l.tiles.length; i++) if (l.tiles[i] === WALL) cells.push(i);
    const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.wall).multiplyScalar(1.25), map: this.stone, roughness: 0.9, vertexColors: true });
    const walls = new THREE.InstancedMesh(box, wallMat, cells.length);
    const border: number[] = [];
    this.wallAt = new Int32Array(l.w * l.h).fill(-1);
    this.wallScale = new Float32Array(cells.length).fill(1);
    seedN = 5 + w.depth;
    cells.forEach((cell, n) => {
      const x = cell % l.w, y = (cell / l.w) | 0;
      let open = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < l.w && b < l.h && l.tiles[idx(l, a, b)] !== WALL) open = true; }
      if (open) { border.push(cell); this.wallAt[cell] = n; }
      const hgt = 1 + (open ? rnd() * 0.16 - 0.04 : 0.02);
      walls.setMatrixAt(n, M.compose(P.set(centre(x), 0, centre(y)), Q.identity(), S.set(1, hgt, 1)));
      walls.setColorAt(n, C.setScalar(0.82 + rnd() * 0.3));
      this.wallScale[n] = hgt;
    });
    walls.receiveShadow = true;
    walls.frustumCulled = false;
    this.walls = walls;
    const proxy = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), border.length);
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
        for (let i = 0, n = rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 0; i < n; i++) rocks.push([centre(x) + edge[0] * (0.6 + rnd() * 0.3) + (edge[1] ? rnd() * 1.8 - 0.9 : 0), centre(y) + edge[1] * (0.6 + rnd() * 0.3) + (edge[0] ? rnd() * 1.8 - 0.9 : 0), 0.5 + rnd() * 1.3]);
      } else if (rnd() < 0.1) spots.push([centre(x) + rnd() * 1.6 - 0.8, centre(y) + rnd() * 1.6 - 0.8, 0.5 + rnd() * 0.6]);
    }
    for (const p of w.plants) for (let i = 0; i < 4; i++) { const a = rnd() * 6.28, d = 0.5 + rnd() * 0.9; spots.push([p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, 0.6 + rnd() * 0.8]); }
    for (const b of w.breaches) for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = rnd() * 2.6; spots.push([b.x + Math.cos(a) * d, b.z + Math.sin(a) * d, 0.9 + rnd() * 1.1]); }
    const tufts = new THREE.InstancedMesh(tuftGeometry(), this.bodyMat, Math.max(1, spots.length));
    tufts.count = spots.length;
    spots.forEach(([x, z, sc], n) => { tufts.setMatrixAt(n, M.compose(P.set(x, 0, z), Q.setFromAxisAngle(S.set(0, 1, 0), rnd() * 6.28), S.set(sc, sc * (0.8 + rnd() * 0.6), sc))); tufts.setColorAt(n, C.setRGB(0.7 + rnd() * 0.6, 0.8 + rnd() * 0.5, 0.7 + rnd() * 0.5)); });
    tufts.receiveShadow = true; tufts.frustumCulled = false;
    const rubble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(look.wall).multiplyScalar(1.1), roughness: 0.95, flatShading: true }), Math.max(1, rocks.length));
    rubble.count = rocks.length;
    rocks.forEach(([x, z, sc], n) => rubble.setMatrixAt(n, M.compose(P.set(x, 0.07 * sc, z), Q.setFromAxisAngle(S.set(rnd(), rnd(), rnd()).normalize(), rnd() * 6), S.set(sc, sc * 0.7, sc * (0.7 + rnd() * 0.6)))));
    rubble.castShadow = true; rubble.receiveShadow = true; rubble.frustumCulled = false;
    this.level.add(tufts, rubble);

    // Daylight through the broken roof: a shaft and a pool, no light of its own beyond the pooled one.
    for (const b of w.breaches) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.0, 10, 18, 1, true).translate(0, 5, 0), new THREE.MeshBasicMaterial({ color: 0xbcd4e6, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.glowMap, color: 0x9fb8c8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      shaft.position.set(b.x, 0, b.z); pool.position.set(b.x, 0.05, b.z);
      this.level.add(shaft, pool);
    }
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
      else if (f.k === 'gore') { this.spray(f.x, f.z, srgb(300, 0.5, 0.25), f.n, 5, 0.24, 0.5); this.spray(f.x, f.z, srgb(190, 0.3, 0.3), f.n / 2, 3, 0.16, 0.6); }
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
        this.flashes.push({ x: f.x, z: f.z, c: srgb(40, 0.8, 0.7), t: 0, max: 0.09, power: 40 });
        this.spray(f.x2, f.z2, srgb(40, 0.6, 0.6), 5, 3, 0.14, 0.2, 1.1);
      }
    }
  }

  // ── every frame ───────────────────────────────────────────────────────────

  update(w: World, dt: number): void {
    this.time += dt;
    const p = w.player, t = this.time;
    const dark = !p.torch;

    // the operative
    const r = this.rig;
    r.root.position.set(p.x, 0, p.z);
    r.root.rotation.y = -p.face;
    const walk = Math.sin(p.moving * 2.3);
    r.legL.position.x = walk * 0.22; r.legR.position.x = -walk * 0.22;
    r.body.position.y = Math.abs(walk) * 0.04;
    r.body.rotation.set(0, 0, 0); r.body.scale.setScalar(1);
    r.arm.rotation.set(0, -0.5, -0.25);
    if (p.state === 'swing') {
      const heavy = p.combo === 2, total = heavy ? 0.52 : 0.34, k = Math.min(1, p.t / (total * 0.7));
      const arc = ((BLADES[w.camp.gear.blade.base].arc + 30) * Math.PI) / 360;
      const dir = p.combo === 1 ? -1 : 1;
      const e = k < 0.3 ? -1 : -1 + 2 * Math.min(1, (k - 0.3) / 0.35);
      r.arm.rotation.set(0, dir * e * arc, heavy ? -0.5 + k : -0.1);
      r.body.rotation.y = dir * e * 0.35;
    } else if (p.state === 'dodge') { r.body.scale.set(1.1, 0.6, 1.1); r.body.rotation.z = -0.5; }
    else if (p.state === 'dead') { r.body.rotation.z = -1.45; r.body.position.y = -0.55; }
    r.skin.emissive.setHex(p.invuln > 0 && p.hurtT < 0.5 && Math.sin(t * 50) > 0 ? 0xffffff : 0x2a1e00);
    r.root.visible = true;

    // light
    const cellGlow = p.torch ? 1 : 0;
    this.torch.intensity += ((cellGlow * (p.cell < 12 ? 90 + Math.sin(t * 30) * 45 : 170)) - this.torch.intensity) * Math.min(1, dt * 14);
    this.torch.position.set(p.x + Math.cos(p.face) * 0.55, 3.1, p.z + Math.sin(p.face) * 0.55);
    this.torch.target.position.set(p.x + Math.cos(p.face) * 8.5, 0, p.z + Math.sin(p.face) * 8.5);
    this.suit.position.set(p.x, 2.2, p.z);
    this.suit.intensity = dark ? 7 : 15;
    this.hemi.intensity += ((dark ? 2.6 : 4.2) - this.hemi.intensity) * Math.min(1, dt * 3);
    // dust in the beam
    if (p.torch && Math.random() < dt * 40) {
      const d = 2 + Math.random() * 13, a = p.face + (Math.random() - 0.5) * 0.85;
      this.particle(p.x + Math.cos(a) * d, 0.3 + Math.random() * 1.8, p.z + Math.sin(a) * d, (Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2, C.setRGB(0.16, 0.15, 0.13), 0.07, 1.6);
    }

    this.cutaway(w, dt);
    const lights: { x: number; z: number; c: THREE.Color; power: number }[] = [];
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
    const lead = 0.13;
    P.set(p.x + Math.cos(p.face) * VIEW * lead * 0.5, 0, p.z + Math.sin(p.face) * VIEW * lead * 0.5);
    this.target.lerp(P, Math.min(1, dt * 5));
    this.shake = Math.max(0, this.shake - dt * 2.6);
    const sh = this.shake * this.shake * 0.9;
    this.camera.position.copy(this.target).add(CAM).add(P.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    this.camera.lookAt(P.copy(this.camera.position).sub(CAM));
    this.renderer.render(this.scene, this.camera);
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
      if (p.dead) { if (v) { this.ents.remove(v.root); this.plants.delete(p.id); } continue; }
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
        v = { root, glow, pool, base, level: 0.3 };
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
      v.root.scale.set(p.scale * swell, p.scale * (awake ? 1.14 : 1) * swell, p.scale * swell);
      v.root.visible = this.inView(p.x, p.z);
      if (v.level > 0.9) lights.push({ x: p.x, z: p.z, c: v.base, power: v.level * 9 });
    }
  }

  private syncEnemies(w: World, dt: number, lights: { x: number; z: number; c: THREE.Color; power: number }[]): void {
    const t = this.time;
    for (const e of w.enemies) {
      let v = this.enemies.get(e.id);
      if (e.dead && e.deadT > 0.4) { if (v) { this.ents.remove(v.c.root); this.enemies.delete(e.id); } continue; }
      if (!v) {
        const c = creature(e.type);
        c.skin = c.skin.clone();
        c.body.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial && o.material.color.getHex() === c.skin.color.getHex() && o.material.roughness === c.skin.roughness) o.material = c.skin; });
        if (e.elite) c.root.scale.setScalar(1.25);
        this.ents.add(c.root);
        v = { c, bar: null, yaw: e.face };
        this.enemies.set(e.id, v);
      }
      const { root, body, skin, extra, legs } = v.c;
      root.position.set(e.x, 0, e.z);
      root.visible = this.inView(e.x, e.z);
      // Nothing alive turns on the spot: the body follows the heading a beat behind.
      const turn = e.type === 'unlit' ? 60 : e.state === 'windup' ? 18 : 9;
      v.yaw += Math.atan2(Math.sin(e.face - v.yaw), Math.cos(e.face - v.yaw)) * Math.min(1, dt * turn);
      root.rotation.y = -v.yaw;
      body.scale.setScalar(1); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
      if (e.dead) { const k = 1 - e.deadT / 0.4; body.scale.set(1 + (1 - k) * 0.5, k, 1 + (1 - k) * 0.5); continue; }
      const pale = e.type === 'tender' || e.type === 'warden';
      skin.emissive.setHex(e.flash > 0 || (e.type === 'warden' && e.state === 'windup') ? 0xffffff : e.state === 'windup' && !pale ? 0x5a1810 : pale ? 0x8fa3ad : 0x000000);
      const speed = Math.hypot(e.sx, e.sz), go = Math.min(1, speed / 1.5), g = e.gait, breath = Math.sin(t * 1.8 + e.id);
      const lean = Math.atan2(Math.sin(e.face - v.yaw), Math.cos(e.face - v.yaw));
      if (e.type === 'mite') {
        body.position.y = go * Math.abs(Math.sin(g * 9)) * 0.06;
        body.rotation.set(lean * 0.6, 0, Math.sin(g * 9) * 0.12 * go);
        legs.forEach((l, i) => { l.rotation.x = (l.userData.rx as number) + Math.sin(g * 18 + i * 2.1) * 0.5 * go; });
      }
      if (e.type === 'skulker') {
        const [head, tail] = extra;
        // a bounding gait: front and back pairs out of step, the spine flexing between them
        legs.forEach((l, i) => { l.rotation.z = Math.sin(g * 2.6 + (i < 2 ? 0 : 2.2) + (i % 2 ? 0.5 : 0)) * 0.75 * go; });
        body.rotation.set(lean * 0.5, Math.sin(g * 2.6) * 0.07 * go, Math.sin(g * 2.6 + 1) * 0.06 * go);
        body.position.y = Math.abs(Math.sin(g * 2.6)) * 0.09 * go + breath * 0.012;
        tail.rotation.y = Math.sin(t * 2.2 + e.id) * 0.35 - lean * 1.5; tail.rotation.z = 0.15 + breath * 0.05;
        head.rotation.y = e.state === 'idle' ? Math.sin(t * 0.6 + e.id * 2) * 0.6 : lean; head.rotation.z = e.state === 'idle' ? Math.sin(t * 0.37 + e.id) * 0.2 - 0.1 : 0;
        if (e.state === 'windup') { body.scale.set(0.9, 0.72, 1.1); body.position.x = -0.3; head.rotation.z = -0.35; tail.rotation.z = 0.7; legs.forEach((l, i) => { l.rotation.z = i < 2 ? 0.6 : -0.5; }); }
        else if (e.state === 'strike') { body.scale.set(1.3, 0.85, 0.92); legs.forEach((l, i) => { l.rotation.z = i < 2 ? 1.1 : -1.1; }); }
        else if (e.state === 'recover') body.rotation.z = -0.08;
      }
      if (e.type === 'spitter') {
        const s = e.state === 'windup' ? 1 + (1 - e.t / 0.55) * 0.7 : 1 + breath * 0.08;
        extra[0].scale.setScalar(s);
        body.position.y = Math.sin(g * 5) * 0.06 * go + breath * 0.025;
        body.rotation.set(Math.sin(g * 2.5) * 0.06 * go, 0, -0.1 * go + (e.state === 'windup' ? 0.25 : 0));
        legs.forEach((l, i) => { const ph = Math.sin(g * 5 + i * 2.09) * 0.3 * go; l.rotation.x = (l.userData.rx as number) + ph * Math.sin(i * 2.09); l.rotation.z = (l.userData.rz as number) - ph * Math.cos(i * 2.09) - ph * 0.5; });
      }
      if (e.type === 'husk') {
        const [armL, armR, torso] = extra;
        const up = e.state === 'windup' ? 1 - e.t / 0.8 : 0, step = Math.sin(g * 1.6);
        // it heaves itself along: weight thrown from one side to the other
        legs[0].rotation.z = step * 0.5 * go; legs[1].rotation.z = -step * 0.5 * go;
        torso.rotation.set(step * 0.13 * go, 0, 0.14 + Math.abs(step) * 0.05 * go + breath * 0.012 - up * 0.3);
        torso.position.y = Math.abs(Math.cos(g * 1.6)) * 0.07 * go;
        armL.rotation.z = -step * 0.45 * go - up * 2.6; armR.rotation.z = step * 0.45 * go - up * 2.6;
        if (e.state === 'strike') { torso.rotation.z = 0.5; armL.rotation.z = armR.rotation.z = 0.9; }
        if (e.state === 'recover') torso.rotation.z = 0.32;
      }
      if (e.type === 'unlit' && !e.frozen && e.state !== 'recover') { body.rotation.z = -0.3; extra[0].rotation.z = extra[1].rotation.z = -1.1; body.position.x = Math.sin(t * 60) * 0.03; }
      else if (e.type === 'unlit') extra[0].rotation.z = extra[1].rotation.z = 0;
      if (e.type === 'grazer') { body.position.y = 0.75 + Math.sin(t * 2.3 + e.id) * 0.25; extra[0].rotation.x = Math.PI / 2 + Math.sin(t * 50 + e.id) * 0.7; extra[1].rotation.x = Math.PI / 2 - Math.sin(t * 50 + e.id) * 0.7; lights.push({ x: e.x, z: e.z, c: GRAZER, power: 2.6 }); }
      if (e.type === 'warden') { extra[1].rotation.y = t * (e.phase ? 5 : 0.8); extra[0].rotation.y = -t; body.position.y = Math.sin(t * 1.4 + e.id) * 0.2; lights.push({ x: e.x, z: e.z, c: WARDEN, power: e.phase ? 9 : 4 }); }
      if (e.type === 'tender') { extra[1].rotation.y = t * 1.5; extra[0].rotation.y = -t; body.position.y = Math.sin(t * 1.4) * 0.15; }
      if (e.state === 'stagger') body.rotation.z = 0.3;

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
      if (!o) { o = propMesh(q.kind); o.position.set(q.x, 0, q.z); o.rotation.y = q.kind === 'urn' || q.kind === 'crate' || q.kind === 'body' ? q.rot : 0; this.ents.add(o); this.props.set(q.id, o); }
      if (q.used && (q.kind === 'urn' || q.kind === 'crate')) o.visible = false;
      const spin = o.getObjectByName('spin');
      if (spin) { spin.rotation.z = t * 0.35; lights.push({ x: q.x, z: q.z, c: white, power: 6 }); }
      const lamp = o.getObjectByName('lamp');
      if (lamp) {
        if (q.kind === 'plinth') { lamp.visible = !q.used; lamp.rotation.y = t; lamp.position.y = 1.5 + Math.sin(t * 2) * 0.1; if (!q.used) lights.push({ x: q.x, z: q.z, c: white, power: 16 }); }
        if (q.kind === 'chest') lamp.visible = !q.used;
        if (q.kind === 'lift') { lamp.visible = w.liftT >= 0 ? Math.sin(t * 16) > 0 : Math.sin(t * 2.5) > 0.6; if (lamp.visible) lights.push({ x: q.x, z: q.z, c: yellow, power: 5 }); }
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
