// Seeded randomness. The state lives on whatever object is passed in, so a
// saved campaign replays exactly from where it stopped.

export interface RngHost {
  rng: number;
}

/** mulberry32 */
export function next(h: RngHost): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const int = (h: RngHost, n: number): number => Math.floor(next(h) * n);
export const range = (h: RngHost, a: number, b: number): number => a + next(h) * (b - a);
export const chance = (h: RngHost, p: number): boolean => next(h) < p;
export const pick = <T>(h: RngHost, list: readonly T[]): T => list[int(h, list.length)];

export function shuffle<T>(h: RngHost, list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(h, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function weighted<T>(h: RngHost, list: readonly T[], weight: (t: T) => number): T {
  const total = list.reduce((s, t) => s + weight(t), 0);
  let r = next(h) * total;
  for (const t of list) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return list[list.length - 1];
}

/** An independent stream for a fixed purpose (a layer's layout, a portrait). */
export function fork(seed: number, ...keys: number[]): RngHost {
  let s = seed | 0;
  for (const k of keys) s = Math.imul(s ^ (k + 0x9e3779b9), 0x85ebca6b) ^ (s >>> 13);
  const h = { rng: s };
  next(h);
  return h;
}
