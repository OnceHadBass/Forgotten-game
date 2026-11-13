// The base between descents: modules the growth can take, people with jobs,
// the lab, wounds and hope. Pure and seeded.

import { BEHAVIOURS, BOARD, MODULES, TUNE, UPGRADES, WONDERS } from './data';
import type { Job, ModuleId, UpgradeId } from './data';
import { chance, pick, range } from './rng';
import type { RngHost } from './rng';
import type { Campaign } from './state';

export const mod = (c: Campaign, id: ModuleId): Campaign['modules'][number] => c.modules.find((m) => m.id === id)!;
export const moodIndex = (c: Campaign): number => (c.hope >= 70 ? 0 : c.hope >= 45 ? 1 : c.hope >= 22 ? 2 : 3);
export const hopeShift = (c: Campaign, n: number): void => { c.hope = Math.max(0, Math.min(100, c.hope + n)); };
const hopeFactor = (c: Campaign): number => (c.hope >= 70 ? 1.25 : c.hope >= 35 ? 1 : c.hope >= 20 ? 0.75 : 0.5);

/** Hands on a job today. Whoever went below, or is hurt, does not count. */
export function hands(c: Campaign, job: Job, away: number | null): number {
  return c.roster.filter((p, i) => p.alive && p.job === job && i !== away && p.wound <= 0).length * hopeFactor(c);
}

/** The wire crew can only hold what the field guide understands. */
export const knowFactor = (c: Campaign): number => 0.6 + 0.1 * c.guide.filter((k) => k.behaviour).length;

export function setJob(c: Campaign, i: number, job: Job): void {
  const needs = job === 'lab' ? 'lab' : job === 'infirmary' ? 'infirmary' : job === 'workshop' ? 'workshop' : null;
  if (!(needs && mod(c, needs).lost)) c.roster[i].job = job;
}

export function upgradeCost(c: Campaign, id: UpgradeId): number {
  const u = UPGRADES.find((x) => x.id === id)!;
  return Math.ceil(u.cost * (c.upgrades[id] + 1) * Math.max(0.6, 1 - 0.1 * hands(c, 'workshop', null)));
}

export function buy(c: Campaign, id: UpgradeId): boolean {
  const u = UPGRADES.find((x) => x.id === id)!, cost = upgradeCost(c, id);
  if (mod(c, 'workshop').lost || c.upgrades[id] >= u.max || c.salvage < cost) return false;
  c.salvage -= cost; c.upgrades[id]++;
  return true;
}

export const worst = (c: Campaign): Campaign['modules'][number] | null => c.modules.filter((m) => !m.lost).sort((a, b) => b.growth - a.growth)[0] ?? null;

/** Herbicide. It works. Something below takes note each time. */
export function burn(c: Campaign): boolean {
  const m = worst(c);
  if (!m || c.salvage < TUNE.growth.burnCost) return false;
  c.salvage -= TUNE.growth.burnCost;
  m.growth = Math.max(0, m.growth - TUNE.growth.burn);
  c.pulse += 1;
  return true;
}

/** Send whoever is going down into a lost module with a blade instead. It takes their day. */
export function reclaim(c: Campaign, id: ModuleId, h: RngHost): void {
  const m = mod(c, id), who = c.roster[c.current];
  if (!m.lost || !who.alive || who.wound > 0) return;
  const lines: string[] = [];
  if (chance(h, 0.4 + 0.06 * c.guide.filter((k) => k.behaviour).length)) {
    m.lost = false; m.growth = 68; hopeShift(c, 5);
    lines.push(`${who.name} cut the ${MODULES[id].name.toLowerCase()} clear by hand. It is ours again, for now.`);
  } else {
    who.wound = 3; hopeShift(c, -2);
    lines.push(`${who.name} went into the ${MODULES[id].name.toLowerCase()} with a blade and was carried out. It is still lost.`);
  }
  passDay(c, h, c.current, lines);
}

/** A day passes: the lab works, the growth comes on, the hurt mend, hope wears. */
export function passDay(c: Campaign, h: RngHost, away: number | null, lines: string[] = []): void {
  if (c.over) return;
  // the lab
  const lab = mod(c, 'lab').lost ? 0 : hands(c, 'lab', away);
  if (lab > 0) {
    const todo = c.guide.findIndex((k) => k.samples > 0 && !k.behaviour);
    if (todo >= 0) {
      c.study[todo] += lab;
      if (c.study[todo] >= 3) { c.guide[todo].sense = c.guide[todo].behaviour = true; hopeShift(c, 1.5); lines.push(`The lab has the measure of the ${c.species[todo].name}. ${BEHAVIOURS[c.species[todo].behaviour].does}`); }
    } else if (c.gear.relic && !c.gear.relic.known) {
      c.bench += lab;
      if (c.bench >= 4) { c.bench = 0; c.gear.relic.known = true; lines.push(`The ${c.gear.relic.form} is understood. The lab will not say they are comfortable with it.`); }
    } else {
      const known = c.species.filter((s) => c.guide[s.id].behaviour && BEHAVIOURS[s.behaviour].graft && c.stock[s.id] < 2);
      c.culture += lab;
      if (known.length && c.culture >= 4) { c.culture = 0; const s = pick(h, known); c.stock[s.id]++; lines.push(`The lab has a ${BEHAVIOURS[s.behaviour].graft!.name.toLowerCase()} growing in a jar. It goes down with whoever goes next.`); }
    }
  }
  // the growth
  const fronts = c.modules.filter((m) => !m.lost);
  const lost = c.modules.length - fronts.length;
  const held = (hands(c, 'wire', away) * (mod(c, 'wire').lost ? 0.5 : 1) * TUNE.growth.hold * knowFactor(c)) / Math.max(1, fronts.length) + c.upgrades.wire * 0.5;
  for (const m of fronts) {
    const rate = (TUNE.growth.base + c.day * TUNE.growth.perDay) * range(h, 0.5, 1.5) * (1 + 0.25 * lost);
    m.growth = Math.max(0, Math.min(100, m.growth + rate - held));
    if (m.growth < 100) continue;
    m.lost = true; hopeShift(c, -8);
    lines.push(`The ${MODULES[m.id].name.toLowerCase()} is gone. The growth came through the floor panels in the night. ${MODULES[m.id].lost}`);
    if (m.id === 'stores') c.salvage = Math.floor((c.salvage * 2) / 3);
    for (const p of c.roster) if (p.job === m.id) p.job = 'wire';
  }
  const gone = c.modules.filter((m) => m.lost).length;
  c.growth = Math.max(0, Math.min(100, c.growth + (gone ? TUNE.growth.ops * gone : -3)));
  // people
  const care = mod(c, 'infirmary').lost ? 0 : hands(c, 'infirmary', away);
  for (const p of c.roster) if (p.alive && p.wound > 0) p.wound = Math.max(0, p.wound - (mod(c, 'infirmary').lost ? 0.5 : 1) - (care > 0 ? 1 : 0));
  hopeShift(c, mod(c, 'mess').lost ? -2 : -1);
  if (c.hope < 20 && chance(h, 0.25)) {
    const stay = c.roster.map((p, i) => ({ p, i })).filter((x) => x.p.alive && x.i !== c.current);
    if (stay.length) { const { p } = pick(h, stay); p.alive = false; p.epitaph = `Walked out through the wire, day ${c.day}.`; hopeShift(c, -4); lines.push(`${p.name} walked out through the wire before dawn. Nobody stopped them.`); }
  }
  c.pulse = Math.max(0, c.pulse - 0.34);
  c.board.unshift(pick(h, BOARD[moodIndex(c)]));
  c.board.length = Math.min(c.board.length, 5);
  c.day++;
  c.night = lines;
  if (c.growth >= 100) c.over = 'fallen';
  else if (!c.roster.some((p) => p.alive)) c.over = 'spent';
  if (!c.roster[c.current].alive || c.roster[c.current].wound > 0) { const next = c.roster.findIndex((p) => p.alive && p.wound <= 0); if (next >= 0) c.current = next; }
}

/** Wonders the operative lived to tell. */
export function tellWonders(c: Campaign, seen: string[], lines: string[]): void {
  const first = c.roster[c.current].name.split(' ')[0];
  for (const id of seen) {
    if (c.wonders.includes(id) && id !== 'tags') continue;
    if (!c.wonders.includes(id)) c.wonders.push(id);
    hopeShift(c, 8);
    lines.push(`${first} ${WONDERS[id.replace(/\d+$/, '')].told}`);
  }
}
