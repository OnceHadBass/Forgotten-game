import { describe, expect, it } from 'vitest';
import { burn, mod, passDay, reclaim, setJob } from './camp';
import { fork } from './rng';
import { newCampaign } from './state';

const days = (tend: (c: ReturnType<typeof newCampaign>) => void): number => {
  let total = 0;
  for (let s = 1; s <= 20; s++) {
    const c = newCampaign(s * 31);
    while (!c.over && c.day < 300) { tend(c); passDay(c, fork(c.seed, 99, c.day), null); }
    total += c.day;
  }
  return Math.round(total / 20);
};

describe('the base', () => {
  it('falls if left alone, and holds longer when it is tended', () => {
    const idle = days(() => {});
    const understood = days((c) => c.guide.forEach((k) => (k.behaviour = true)));
    const burning = days((c) => { c.salvage += 12; burn(c); });
    console.log(`base falls on day: idle ${idle}, every species understood ${understood}, burning with 12 salvage a day ${burning}`);
    expect(idle).toBeGreaterThan(20);
    expect(idle).toBeLessThan(80);
    expect(understood).toBeGreaterThan(idle);
    expect(burning).toBeGreaterThan(idle);
  });

  it('a lost lab stops study, and cutting it clear brings it back', () => {
    const c = newCampaign(5);
    mod(c, 'lab').lost = true;
    setJob(c, 0, 'lab');
    expect(c.roster[0].job).not.toBe('lab');
    c.guide.forEach((k) => (k.behaviour = true));
    for (let i = 0; i < 40 && mod(c, 'lab').lost; i++) { c.roster[c.current].wound = 0; reclaim(c, 'lab', fork(1, i)); }
    expect(mod(c, 'lab').lost).toBe(false);
  });

  it('the lab studies a sample into knowledge, then grows grafts', () => {
    const c = newCampaign(8);
    const sp = c.species.findIndex((s) => s.behaviour === 'burst');
    c.guide[sp].samples = 1;
    for (let i = 0; i < 6; i++) passDay(c, fork(2, i), null);
    expect(c.guide[sp].behaviour).toBe(true);
    for (let i = 0; i < 12; i++) passDay(c, fork(3, i), null);
    expect(c.stock[sp]).toBeGreaterThan(0);
  });
});
