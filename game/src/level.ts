// A layer of the ruin: a tile grid of rooms joined by corridors, seeded so a
// campaign's layout of a layer stays the same from run to run.

import { T } from './data';
import { chance, fork, int, shuffle } from './rng';
import type { RngHost } from './rng';

export const WALL = 0, FLOOR = 1, THICKET = 2;
export type RoomKind = 'start' | 'hall' | 'nest' | 'relic' | 'cache' | 'hatch' | 'garden' | 'arena';

export interface Room { x: number; y: number; w: number; h: number; kind: RoomKind; cx: number; cz: number; far: number }
export interface Level {
  w: number; h: number; depth: number;
  tiles: Uint8Array;
  /** Room index per tile, -1 in corridors and walls. */
  roomAt: Int8Array;
  rooms: Room[];
  start: number; hatch: number;
}

export const idx = (l: Level, tx: number, ty: number): number => ty * l.w + tx;
export const tx = (x: number): number => Math.floor(x / T);
export const centre = (t: number): number => (t + 0.5) * T;

export function tileAt(l: Level, x: number, z: number): number {
  const a = tx(x), b = tx(z);
  return a < 0 || b < 0 || a >= l.w || b >= l.h ? WALL : l.tiles[idx(l, a, b)];
}

function carve(l: Level, x: number, y: number): void {
  if (x > 0 && y > 0 && x < l.w - 1 && y < l.h - 1) l.tiles[idx(l, x, y)] = FLOOR;
}

function corridor(l: Level, a: Room, b: Room, h: RngHost): void {
  let x = Math.floor(a.x + a.w / 2), y = Math.floor(a.y + a.h / 2);
  const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
  const xFirst = chance(h, 0.5);
  const stepX = (): void => { while (x !== bx) { x += Math.sign(bx - x); carve(l, x, y); carve(l, x, y + 1); } };
  const stepY = (): void => { while (y !== by) { y += Math.sign(by - y); carve(l, x, y); carve(l, x + 1, y); } };
  if (xFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
}

/** Steps from a tile to every reachable tile. Thickets count as open: they can be cut. */
export function distances(l: Level, sx: number, sy: number, out?: Int16Array, limit = 9999): Int16Array {
  const d = out ?? new Int16Array(l.w * l.h);
  d.fill(-1);
  const queue = [idx(l, sx, sy)];
  d[queue[0]] = 0;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (d[i] >= limit) continue;
    const x = i % l.w, y = (i / l.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const j = idx(l, x + dx, y + dy);
      if (x + dx < 0 || y + dy < 0 || x + dx >= l.w || y + dy >= l.h || l.tiles[j] === WALL || d[j] >= 0) continue;
      d[j] = d[i] + 1;
      queue.push(j);
    }
  }
  return d;
}

export function generate(seed: number, depth: number): Level {
  const h = fork(seed, 500 + depth);
  const size = depth === 4 ? 34 : 44 + depth * 4;
  const l: Level = { w: size, h: size, depth, tiles: new Uint8Array(size * size), roomAt: new Int8Array(size * size).fill(-1), rooms: [], start: 0, hatch: 0 };

  if (depth === 4) {
    l.rooms.push(room(4, 13, 6, 6), room(15, 8, 16, 16));
  } else {
    const want = 9 + depth * 2;
    for (let tries = 0; tries < 400 && l.rooms.length < want; tries++) {
      const w = 4 + int(h, 5), hh = 4 + int(h, 5);
      const x = 2 + int(h, size - w - 4), y = 2 + int(h, size - hh - 4);
      if (l.rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + hh + 2 > r.y)) continue;
      l.rooms.push(room(x, y, w, hh));
    }
  }
  l.rooms.forEach((r, i) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { carve(l, x, y); l.roomAt[idx(l, x, y)] = i; }
  });

  // Join every room to its nearest joined neighbour, then add a couple of loops.
  const joined = [0];
  const degree = l.rooms.map(() => 0);
  while (joined.length < l.rooms.length) {
    let best = [0, 0, 1e9];
    for (const a of joined) l.rooms.forEach((r, b) => {
      if (joined.includes(b)) return;
      const d = Math.hypot(r.cx - l.rooms[a].cx, r.cz - l.rooms[a].cz);
      if (d < best[2]) best = [a, b, d];
    });
    corridor(l, l.rooms[best[0]], l.rooms[best[1]], h);
    degree[best[0]]++; degree[best[1]]++;
    joined.push(best[1]);
  }
  for (let i = 0; i < 2 && l.rooms.length > 4; i++) {
    const a = int(h, l.rooms.length), b = int(h, l.rooms.length);
    if (a !== b) corridor(l, l.rooms[a], l.rooms[b], h);
  }

  l.start = depth === 4 ? 0 : int(h, l.rooms.length);
  const s = l.rooms[l.start];
  const d = distances(l, tx(s.cx), tx(s.cz));
  l.rooms.forEach((r) => (r.far = d[idx(l, tx(r.cx), tx(r.cz))]));
  l.hatch = l.rooms.reduce((best, r, i) => (r.far > l.rooms[best].far ? i : best), 0);
  s.kind = 'start';
  l.rooms[l.hatch].kind = depth === 4 ? 'arena' : 'hatch';

  if (depth < 4) {
    const rest = shuffle(h, l.rooms.map((_, i) => i).filter((i) => i !== l.start && i !== l.hatch));
    // The relic sits at a dead end, as far from the way in as the layout allows.
    rest.sort((a, b) => (degree[a] === 1 ? 0 : 1) - (degree[b] === 1 ? 0 : 1) || l.rooms[b].far - l.rooms[a].far);
    const kinds: RoomKind[] = ['relic', 'cache', 'nest', 'garden', 'nest', 'garden', 'cache'];
    rest.forEach((i, n) => (l.rooms[i].kind = kinds[n] ?? 'hall'));

    // Growth across some passages: it has to be cut through.
    const corridors: number[] = [];
    for (let i = 0; i < l.tiles.length; i++) if (l.tiles[i] === FLOOR && l.roomAt[i] < 0) corridors.push(i);
    for (let n = 0; n < 4 + depth * 2 && corridors.length; n++) {
      const c = corridors[int(h, corridors.length)];
      const cx = c % l.w, cy = (c / l.w) | 0;
      if (d[c] < 5) continue;
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        const j = idx(l, x, y);
        if (l.tiles[j] === FLOOR && l.roomAt[j] < 0) l.tiles[j] = THICKET;
      }
    }
  }
  return l;
}

function room(x: number, y: number, w: number, h: number): Room {
  return { x, y, w, h, kind: 'hall', cx: (x + w / 2) * T, cz: (y + h / 2) * T, far: 0 };
}

// ── moving through it ───────────────────────────────────────────────────────

const blocks = (t: number, ghost: boolean): boolean => t === WALL || (t === THICKET && !ghost);

/** Slide a circle through the grid. `ghost` passes through thickets (creatures do). */
export function moveCircle(l: Level, e: { x: number; z: number }, dx: number, dz: number, r: number, ghost: boolean): boolean {
  let hit = false;
  for (const axis of [0, 1]) {
    let nx = e.x + (axis === 0 ? dx : 0), nz = e.z + (axis === 1 ? dz : 0);
    const x0 = tx(nx - r), x1 = tx(nx + r), z0 = tx(nz - r), z1 = tx(nz + r);
    for (let b = z0; b <= z1; b++) for (let a = x0; a <= x1; a++) {
      const t = a < 0 || b < 0 || a >= l.w || b >= l.h ? WALL : l.tiles[idx(l, a, b)];
      if (!blocks(t, ghost)) continue;
      const px = Math.max(a * T, Math.min(nx, (a + 1) * T)), pz = Math.max(b * T, Math.min(nz, (b + 1) * T));
      const ox = nx - px, oz = nz - pz, dd = ox * ox + oz * oz;
      if (dd >= r * r) continue;
      hit = true;
      if (dd > 1e-6) { const k = r / Math.sqrt(dd); nx = px + ox * k; nz = pz + oz * k; }
      else if (axis === 0) nx = e.x; else nz = e.z;
    }
    e.x = nx; e.z = nz;
  }
  return hit;
}

/** Whether stone lies between two points. Growth does not block sight or light. */
export function los(l: Level, x0: number, z0: number, x1: number, z1: number): boolean {
  const d = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.ceil(d / 0.6);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (tileAt(l, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t) === WALL) return false;
  }
  return true;
}

/** Distance along a ray to the first wall. */
export function rayWall(l: Level, x: number, z: number, dx: number, dz: number, max: number): number {
  for (let d = 0.3; d < max; d += 0.3) if (tileAt(l, x + dx * d, z + dz * d) === WALL) return d;
  return max;
}

export function randomFloor(l: Level, r: Room, h: RngHost, margin = 0): { x: number; z: number } {
  const m = Math.min(margin, Math.floor((Math.min(r.w, r.h) - 1) / 2));
  return { x: (r.x + m + (r.w - 2 * m) * (0.08 + 0.84 * (int(h, 1000) / 1000))) * T, z: (r.y + m + (r.h - 2 * m) * (0.08 + 0.84 * (int(h, 1000) / 1000))) * T };
}
