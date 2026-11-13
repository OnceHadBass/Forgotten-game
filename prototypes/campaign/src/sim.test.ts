import { describe, expect, it } from 'vitest';
import { BEHAVIOURS } from './data';
import { burnBack, canAscend, canBurn, cannotDeploy, culture, endDay, living, make, mod, newCampaign, projects, reclaim, ascend, literacy } from './game';
import * as R from './run';
import type { Campaign, ModuleId, Route } from './types';

const ROUTES: Route[] = ['lit', 'dark', 'run'];
const ROUTE_SENSE = { lit: 'light', dark: 'near', run: 'sound' } as const;

/** Plays one descent. `careful` scans, reads the guide and leaves early; otherwise it runs at everything. */
function descend(c: Campaign, careful: boolean, depth: number): void {
  let guard = 0;
  const r = () => c.run!;
  const resolve = () => {
    while (r().creature && !r().outcome && guard++ < 500) {
      const i = r().room?.plants.findIndex((_, k) => R.canLure(c, k)) ?? -1;
      if (careful && i >= 0) R.lure(c, i);
      else if (r().rounds >= 2 && r().hp < 40) R.fightGun(c);
      else R.fightBlade(c);
    }
  };
  while (!r().outcome && !c.over && guard++ < 500) {
    resolve();
    if (r().outcome) break;
    if (r().hp < 45 && r().medkits > 0) R.useMedkit(c);
    if (r().cell < 20 && r().spareCells > 0) R.useCell(c);
    const ph = r().phase;
    if (ph === 'lift') R.liftBeat(c);
    else if (ph === 'entry') R.goOn(c);
    else if (ph === 'door') {
      const plants = r().room!.plants;
      if (careful) {
        plants.forEach((p, i) => {
          if (!p.gone && !c.guide[p.sp].sense && r().cell > 45) R.scan(c, i);
          if (!p.gone && !p.sampled && c.guide[p.sp].sense && c.species[p.sp].sense !== 'near' && !p.awake) R.cutting(c, i);
        });
        if (plants.some((p) => !p.gone && p.awake)) R.waitItOut(c);
        resolve();
        if (r().outcome || r().phase !== 'door') continue;
      }
      const cost = (route: Route) => plants.reduce((s, p) => {
        if (p.gone) return s;
        const k = c.guide[p.sp];
        const harm = !k.behaviour || BEHAVIOURS[c.species[p.sp].behaviour].kind === 'harm' ? 1 : 0.2;
        const extra = p.extraKnown && p.extra !== null && c.guide[p.extra].sense && c.species[p.extra].sense === ROUTE_SENSE[route] ? 1 : 0;
        return s + extra + (k.sense ? (c.species[p.sp].sense === ROUTE_SENSE[route] ? harm : 0) : 0.34);
      }, route === 'run' ? 0.2 : 0);
      const open = ROUTES.filter((x) => !R.canRoute(c, x));
      const route = careful ? open.sort((a, b) => cost(a) - cost(b))[0] : open.includes('run') ? 'run' : open[0];
      R.cross(c, route);
    } else if (ph === 'far') {
      const room = r().room!;
      if (room.pile > 0 && !room.lootBait) R.searchPile(c);
      if (room.body) R.feature(c, 'tags');
      if (room.kind === 'cache') R.feature(c, 'supplies');
      else if (room.kind === 'vault') {
        R.feature(c, 'reinforce');
        if (!c.over) R.feature(c, 'open');
        if (!c.over) R.callLift(c);
      } else R.feature(c);
      if (c.over) break;
      if (r().phase !== 'far') continue;
      const side = R.sideHere(c);
      if (r().side) R.leaveSide(c);
      else if (side && side.open && !side.done && r().hp > 50) R.goSide(c);
      else if (r().hp < (careful ? 55 : 30) || R.packWeight(r()) > 24 || r().exposure > 45) R.callLift(c);
      else if (room.kind === 'hatch') (r().layer < depth && r().hp > 60 ? R.forceHatch : R.callLift)(c);
      else R.goOn(c);
    }
  }
  expect(guard).toBeLessThan(500);
}

function play(seed: number, careful: boolean): Campaign {
  const c = newCampaign(seed, { expeditions: [] });
  while (!c.over && c.day < 200) {
    if (careful) {
      c.focus = projects(c)[0]?.focus ?? null;
      for (const m of c.modules) {
        if (m.lost && m.id !== 'ops') {
          const p = living(c).find((x) => !cannotDeploy(x) && x.spec === 'Soldier') ?? living(c).find((x) => !cannotDeploy(x));
          if (p) reclaim(c, m.id, p.id);
        } else if (m.growth > 55 && !canBurn(c, m.id as ModuleId)) burnBack(c, m.id as ModuleId);
      }
      while (c.stores.medkits < 4 && make(c, 'medkit'));
      if (canAscend(c)) ascend(c);
      if (c.over) break;
    }
    const ready = living(c).filter((p) => !cannotDeploy(p));
    if (ready.length && (careful || c.day % 2 === 1)) {
      const p = ready[c.day % ready.length];
      const s = c.stores;
      R.startRun(c, p.id, { medkits: Math.min(2, s.medkits), probes: Math.min(2, s.probes), cells: Math.min(1, s.cells), relic: c.relics.findIndex((x) => x.where === 'base') >= 0 ? c.relics.findIndex((x) => x.where === 'base') : null, grafts: s.grafts.map(() => 0), layer: careful ? 3 : 1 });
      descend(c, careful, 1 + Math.min(2, Math.floor(c.site.runs / 4)));
      if (!c.over) R.settle(c);
    } else endDay(c, null);
  }
  return c;
}

describe('campaign', () => {
  it('replays exactly from a seed', () => {
    expect(JSON.stringify(play(11, true))).toBe(JSON.stringify(play(11, true)));
  });

  it('never deals a look that gives behaviour away', () => {
    const plansByBehaviour = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const s of newCampaign(seed, { expeditions: [] }).species) {
        (plansByBehaviour.get(s.behaviour) ?? plansByBehaviour.set(s.behaviour, new Set()).get(s.behaviour)!).add(s.plan);
        expect(s.hue < 40 || s.hue > 90).toBe(true); // never yellow
      }
    }
    for (const plans of plansByBehaviour.values()) expect(plans.size).toBeGreaterThan(4);
  });

  it('ends, one way or another, and care is rewarded', () => {
    const tally = (careful: boolean) => {
      const ends: Record<string, number> = {};
      let days = 0, dead = 0, gone = 0, lit = 0, runs = 0, deep = 0, lostMods = 0;
      const N = 40;
      for (let seed = 1; seed <= N; seed++) {
        const c = play(seed * 7919, careful);
        if (!c.over) c.over = { kind: 'fallen', day: 999 };
        ends[c.over!.kind] = (ends[c.over!.kind] ?? 0) + 1;
        days += c.over!.day; dead += c.people.filter((p) => p.status === 'dead').length; gone += c.people.filter((p) => p.status === 'gone').length; lit += literacy(c); runs += c.site.runs; deep += c.site.deepest; lostMods += c.modules.filter((m) => m.lost).length;
      }
      return { ends, days: Math.round(days / N), dead: +(dead / N).toFixed(1), gone: +(gone / N).toFixed(1), lit: +(lit / N).toFixed(1), runs: Math.round(runs / N), deep: +(deep / N).toFixed(1), lostMods: +(lostMods / N).toFixed(1) };
    };
    const careless = tally(false);
    const careful = tally(true);
    console.log('careless', JSON.stringify(careless));
    console.log('careful ', JSON.stringify(careful));
    const wins = (t: typeof careful) => (t.ends.depart ?? 0) + (t.ends.reinforce ?? 0) + (t.ends.open ?? 0);
    expect(wins(careful)).toBeGreaterThan(wins(careless));
    expect(careless.days).toBeGreaterThan(15);
  });

  it('cultures only what the lab understands', () => {
    const c = newCampaign(3, { expeditions: [] });
    c.stores.samples[0] = 2;
    expect(culture(c, 0)).toBe(false);
    c.guide[0].researched = true;
    expect(culture(c, 0)).toBe(true);
    expect(mod(c, 'ops').growth).toBe(0);
  });
});
