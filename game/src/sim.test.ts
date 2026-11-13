import { describe, expect, it } from 'vitest';
import { FLOOR, WALL, distances, generate, idx, tx } from './level';
import { createWorld, step, settle } from './sim';
import { newCampaign } from './state';
import type { Input, World } from './state';

/** A bot that walks at the nearest thing and hits it, dodging now and then. */
function bot(w: World, i: number): Input {
  const p = w.player;
  let tx2 = p.x, tz2 = p.z, best = 1e9;
  for (const e of w.enemies) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (!e.dead && d < best) { best = d; tx2 = e.x; tz2 = e.z; } }
  const d = Math.hypot(tx2 - p.x, tz2 - p.z) || 1;
  return { mx: (tx2 - p.x) / d, mz: (tz2 - p.z) / d, aimX: tx2, aimZ: tz2, attack: best < 3, fire: best > 3 && best < 12 && i % 3 === 0, dodge: i % 97 === 0, interact: i % 31 === 0, graft: i % 211 === 0, relic: false, torch: false, medkit: p.hp < 40, cycle: 0 };
}

describe('level', () => {
  it('joins every room and puts the hatch far from the start', () => {
    for (let seed = 1; seed <= 25; seed++) for (const depth of [1, 2, 3, 4]) {
      const l = generate(seed * 131, depth);
      const s = l.rooms[l.start];
      const d = distances(l, tx(s.cx), tx(s.cz));
      for (const r of l.rooms) expect(d[idx(l, tx(r.cx), tx(r.cz))]).toBeGreaterThanOrEqual(0);
      expect(l.rooms[l.hatch].far).toBeGreaterThan(depth === 4 ? 4 : 12);
      expect(l.tiles[idx(l, tx(s.cx), tx(s.cz))]).toBe(FLOOR);
      expect(l.tiles[0]).toBe(WALL);
    }
  });
});

describe('simulation', () => {
  it('runs every layer without losing track of anything', () => {
    for (const depth of [1, 2, 3, 4]) {
      const c = newCampaign(42 + depth);
      const w = createWorld(c, depth);
      expect(w.enemies.length).toBeGreaterThan(0);
      for (let i = 0; i < 60 * 90 && !w.outcome; i++) { step(w, bot(w, i), 1 / 60); w.fx.length = 0; }
      const p = w.player;
      for (const v of [p.x, p.z, p.hp, p.cell]) expect(Number.isFinite(v)).toBe(true);
      for (const e of w.enemies) expect(Number.isFinite(e.x + e.z + e.hp)).toBe(true);
      console.log(`depth ${depth}: ${w.enemies.length} creatures, ${w.plants.length} plants, kills ${p.kills}, hp ${Math.round(p.hp)}, downs ${p.downs}, outcome ${w.outcome}`);
      expect(p.kills).toBeGreaterThan(0);
    }
  });

  it('replays exactly from a seed', () => {
    const run = (): string => {
      const w = createWorld(newCampaign(7), 2);
      for (let i = 0; i < 1500 && !w.outcome; i++) { step(w, bot(w, i), 1 / 60); w.fx.length = 0; }
      return JSON.stringify([w.player.x, w.player.hp, w.enemies.map((e) => [e.x, e.hp])]);
    };
    expect(run()).toBe(run());
  });

  it('a death leaves the gear below for the next operative', () => {
    const c = newCampaign(9);
    const w = createWorld(c, 1);
    w.outcome = 'dead';
    settle(w);
    expect(c.roster[0].alive).toBe(false);
    expect(c.fallen.length).toBe(1);
    expect(createWorld(c, 1).props.some((p) => p.kind === 'body')).toBe(true);
  });
});
