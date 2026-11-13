// A bot that plays the way a careful person might: it fights what it can
// see, sidesteps wind-ups, heals, and otherwise heads for the hatch. Its
// tallies are the yardstick for tuning; it is not a pass/fail on fun.
import { describe, expect, it } from 'vitest';
import { ENEMIES, T } from './data';
import { THICKET, distances, idx, los, tx } from './level';
import { createWorld, step } from './sim';
import { makeItem, newCampaign } from './state';
import type { Input, World } from './state';

function play(w: World, toHatch: Int16Array, i: number): Input {
  const p = w.player, l = w.level;
  const input: Input = { mx: 0, mz: 0, aimX: p.x + Math.cos(p.face), aimZ: p.z + Math.sin(p.face), attack: false, fire: false, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: p.hp < p.maxHp * 0.45, cycle: 0 };
  let target = null, best = 13;
  for (const e of w.enemies) {
    if (e.dead || e.type === 'grazer' || (e.type === 'warden' && e.phase === 0)) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < best && los(l, p.x, p.z, e.x, e.z)) { best = d; target = e; }
  }
  const threat = w.enemies.find((e) => !e.dead && e.state === 'windup' && e.type !== 'mite' && Math.hypot(e.x - p.x, e.z - p.z) < ENEMIES[e.type].range + 1);
  if (target) {
    const dx = (target.x - p.x) / best, dz = (target.z - p.z) / best;
    input.aimX = target.x; input.aimZ = target.z;
    const reach = 2.2 + target.r;
    if (best > reach) { input.mx = dx; input.mz = dz; } else input.attack = true;
    if (best > 5 && p.ammo > 0 && i % 2 === 0) input.fire = true;
    if (threat && p.dodges > 0 && i % 6 === 0) { input.dodge = true; input.mx = -dz; input.mz = dx; }
    // a ring on the floor means get out of it, not sidestep
    if (threat && (threat.type === 'husk' || (threat.type === 'tender' && threat.phase === 3))) { const d = Math.hypot(threat.x - p.x, threat.z - p.z) || 1; input.mx = (p.x - threat.x) / d; input.mz = (p.z - threat.z) / d; input.attack = false; }
    if (p.hp < p.maxHp * 0.3 && p.medkits === 0) { input.mx = -dx; input.mz = -dz; input.attack = false; }
    return input;
  }
  // nothing in sight: walk downhill towards the hatch, cutting growth in the way
  const a = tx(p.x), b = tx(p.z);
  let bx = a, bz = b, bv = toHatch[idx(l, a, b)];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const v = toHatch[idx(l, a + dx, b + dz)]; if (v >= 0 && v < bv) { bv = v; bx = a + dx; bz = b + dz; } }
  const gx = (bx + 0.5) * T, gz = (bz + 0.5) * T, d = Math.hypot(gx - p.x, gz - p.z) || 1;
  input.mx = (gx - p.x) / d; input.mz = (gz - p.z) / d; input.aimX = gx; input.aimZ = gz;
  if (l.tiles[idx(l, bx, bz)] === THICKET) input.attack = true;
  if (bv === 0) input.interact = i % 10 === 0;
  return input;
}

export function descend(seed: number, maxDepth: number): { depth: number; dead: boolean; hp: number[]; kills: number; time: number } {
  const c = newCampaign(seed);
  let w = createWorld(c, 1);
  const hp: number[] = [];
  let t = 0;
  for (;;) {
    const h = w.level.rooms[w.level.hatch];
    const toHatch = distances(w.level, tx(h.cx), tx(h.cz));
    for (let i = 0; i < 60 * 420 && !w.outcome; i++) { step(w, play(w, toHatch, i), 1 / 60); w.fx.length = 0; t++; }
    if (w.outcome !== 'descend' || w.depth >= maxDepth) { hp.push(Math.round(w.player.hp)); return { depth: w.depth, dead: w.outcome === 'dead', hp, kills: w.player.kills, time: Math.round(t / 60) }; }
    hp.push(Math.round(w.player.hp));
    w = createWorld(c, w.depth + 1, w.player);
  }
}

describe('balance', () => {
  it('a careful bot usually clears the Threshold and usually does not clear the Works', () => {
    const N = 12;
    const reach = [0, 0, 0, 0], runs = [];
    for (let s = 1; s <= N; s++) { const r = descend(s * 977, 4); runs.push(r); for (let d = 1; d <= 3; d++) if (r.depth > d || (r.depth === d && !r.dead)) reach[d]++; }
    console.log('cleared layer 1/2/3:', reach.slice(1).map((n) => `${n}/${N}`).join(' '), '| avg time', Math.round(runs.reduce((a, r) => a + r.time, 0) / N), 's | avg kills', Math.round(runs.reduce((a, r) => a + r.kills, 0) / N));
    console.log(runs.map((r) => `${r.depth}${r.dead ? 'x' : ''}[${r.hp.join(',')}]`).join(' '));
    expect(reach[1]).toBeGreaterThanOrEqual(N * 0.6);
  });

  it('the Tender can be beaten by a geared operative, and is not a pushover', () => {
    let won = 0, time = 0;
    const N = 10;
    for (let s = 1; s <= N; s++) {
      const c = newCampaign(s * 53);
      c.upgrades.plating = 3; c.upgrades.belt = 2;
      c.gear.blade = makeItem('blade', 1, 2, ['keen', 'swift']);
      const w = createWorld(c, 4);
      const door = w.props.find((q) => q.kind === 'door')!;
      const to = distances(w.level, tx(door.x - 2), tx(door.z));
      let i = 0;
      for (; i < 60 * 300 && !w.outcome && !w.boss!.dead; i++) { step(w, play(w, to, i), 1 / 60); w.fx.length = 0; }
      if (w.boss!.dead) { won++; time += i / 60; }
    }
    console.log(`Tender beaten ${won}/${N}${won ? `, in about ${Math.round(time / won)} s` : ''}`);
    expect(won).toBeGreaterThan(0);
    expect(won).toBeLessThan(N);
  });
});
