// The campaign: the base, its people, the growth at the wire, research, hope
// and the passing of days. Pure and seeded; the UI only calls these.

import { BEHAVIOURS, BOARD, BODY_HUES, GLOW_HUES, LORE, MODULES, NAME_FIRST, NAME_SECOND, PEOPLE, PLANS, RELIC_FORMS, SPECS, TRAITS, TUNE } from './data';
import { chance, fork, int, pick, range, shuffle } from './rng';
import type { BehaviourId, Campaign, Focus, Job, Knowledge, Ledger, Module, ModuleId, Person, RelicFn, Sense, Spec } from './types';

const OUTER: readonly ModuleId[] = ['lab', 'wire', 'stores', 'infirmary', 'fabricator', 'mess'];
const DEFAULT_JOB: Record<Spec, Job> = {
  Biologist: 'lab', Linguist: 'lab', Soldier: 'wire', Scout: 'wire', Medic: 'infirmary', Engineer: 'fabricator',
};

export function newCampaign(seed: number, ledger: Ledger): Campaign {
  const h = fork(seed, 1);
  const behaviours = shuffle(h, Object.keys(BEHAVIOURS) as BehaviourId[]);
  const senses = shuffle<Sense>(h, ['light', 'light', 'light', 'sound', 'sound', 'sound', 'near', 'near']);
  const plans = shuffle(h, PLANS);
  const firsts = shuffle(h, NAME_FIRST);
  const vivid = shuffle(h, [0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 2);
  const species = behaviours.map((behaviour, id) => {
    const band = pick(h, BODY_HUES);
    return {
      id, behaviour, sense: senses[id], plan: plans[id],
      name: `${firsts[id]} ${pick(h, NAME_SECOND[plans[id]])}`,
      pattern: pick(h, ['veins', 'bands', 'spots', 'rim'] as const),
      hue: Math.round(range(h, band[0], band[1])) % 360,
      glow: Math.round(range(h, GLOW_HUES[0], GLOW_HUES[1])),
      vivid: vivid.includes(id),
    };
  });

  const forms = shuffle(h, RELIC_FORMS);
  const fns = shuffle<RelicFn>(h, ['hush', 'lattice', 'foretell', 'tending', 'choir', 'memorywork']);
  const specs: Spec[] = [...SPECS, ...Array.from({ length: TUNE.roster - SPECS.length }, () => pick(h, SPECS))];
  const people: Person[] = shuffle(h, PEOPLE).slice(0, TUNE.roster).map((name, id) => ({
    id, name, spec: specs[id], trait: pick(h, TRAITS), job: DEFAULT_JOB[specs[id]],
    status: 'ok', wound: 0, exposure: 0, runs: 0,
  }));

  const modules: Module[] = (Object.keys(MODULES) as ModuleId[]).map((id) => ({
    id, growth: id === 'ops' ? 0 : Math.round(range(h, 4, 16)), lost: false, species: int(h, 8),
  }));

  const prior = ledger.expeditions[ledger.expeditions.length - 1] ?? null;
  return {
    version: 1, seed, rng: h.rng, expedition: (prior?.n ?? 0) + 1, day: 1,
    hope: TUNE.startHope, strain: 0, species,
    guide: species.map((): Knowledge => ({ seen: false, sense: false, behaviour: false, researched: false, progress: 0 })),
    relicDeal: [0, 1, 2].map((i) => ({ form: forms[i], fn: fns[i] })),
    relics: [], fragments: 0, translated: 0, translateProgress: 0, lore: [],
    modules, people,
    stores: { salvage: 8, medkits: 6, probes: 4, cells: 1, rounds: 18, relicCells: 0, samples: species.map(() => 0), grafts: species.map(() => 0), readings: 0 },
    focus: null, fabUsed: 0,
    site: { deepest: 0, runs: 0, cut: {}, caches: {}, relicTaken: [false, false, false], sealedOpened: [false, false, false], seenEvents: [], routeUse: { lit: 0, dark: 0, run: 0 }, bodies: [], oldCampFound: false },
    board: ['Twenty-five came down. Ten are left. The ship is not going back up.'],
    night: [], wonders: [], prior, run: null, over: null,
  };
}

// ── reading the state ───────────────────────────────────────────────────────

export const mod = (c: Campaign, id: ModuleId): Module => c.modules.find((m) => m.id === id)!;
export const living = (c: Campaign): Person[] => c.people.filter((p) => p.status === 'ok');
export const speciesName = (c: Campaign, id: number): string => c.guide[id].given || c.species[id].name;
export const literacy = (c: Campaign): number => TUNE.literacy.filter((n) => c.translated >= n).length;
export const pulseLevel = (c: Campaign): number => (c.strain < 1 ? 0 : c.strain < 2.5 ? 1 : 2);
export const PULSE = ['Stable', 'Strain', 'Surge'] as const;
export const moodIndex = (c: Campaign): number => (c.hope >= 70 ? 0 : c.hope >= 45 ? 1 : c.hope >= 22 ? 2 : 3);

export function cannotDeploy(p: Person): string | null {
  if (p.status !== 'ok') return 'gone';
  if (p.wound > 0) return `hurt, ${p.wound} day${p.wound > 1 ? 's' : ''}`;
  if (p.exposure >= 70) return 'too sick to go down';
  return null;
}

function hopeFactor(c: Campaign): number {
  return c.hope >= 70 ? 1.25 : c.hope >= 35 ? 1 : c.hope >= 20 ? 0.75 : 0.5;
}

/** Hands on a job today. `away` is whoever went below, or spent the day clearing. */
export function jobPoints(c: Campaign, job: Job, bonus: Spec | null, away: number | null = null): number {
  let n = 0;
  for (const p of living(c)) {
    if (p.job !== job || p.id === away || p.wound > 0) continue;
    n += p.spec === bonus ? (job === 'wire' ? 1.5 : 2) : 1;
  }
  return n * hopeFactor(c);
}

/** How much the wire crew's work is worth against a species: you can only fight what you understand. */
export function knowFactor(k: Knowledge): number {
  return k.researched ? 2 : k.behaviour ? 1.3 : k.sense ? 1 : k.seen ? 0.8 : 0.6;
}

export function hopeShift(c: Campaign, n: number): void {
  c.hope = Math.max(0, Math.min(100, c.hope + n));
}

// ── jobs, lab, fabricator ───────────────────────────────────────────────────

export function setJob(c: Campaign, id: number, job: Job): void {
  const needs = job === 'lab' ? 'lab' : job === 'infirmary' ? 'infirmary' : job === 'fabricator' ? 'fabricator' : null;
  if (needs && mod(c, needs).lost) return;
  c.people[id].job = job;
}

export interface Project {
  focus: Focus;
  title: string;
  detail: string;
  progress: number;
  cost: number;
}

export function projects(c: Campaign): Project[] {
  const list: Project[] = [];
  c.species.forEach((s, id) => {
    const k = c.guide[id];
    if (k.seen && !k.researched && c.stores.samples[id] > 0) {
      list.push({ focus: { kind: 'species', id }, title: `Study ${speciesName(c, id)}`, detail: 'Everything it does, how to hold it at the wire, and how to keep its cuttings alive.', progress: k.progress, cost: TUNE.speciesCost });
    }
  });
  c.relics.forEach((r, id) => {
    if (r.where === 'base' && !r.identified) {
      list.push({ focus: { kind: 'relic', id }, title: `Work out the ${r.form}`, detail: 'Slow, and safe. The other way to find out is to use it down there.', progress: r.progress, cost: TUNE.relicCost });
    }
  });
  if (c.stores.readings > 0) {
    list.push({ focus: { kind: 'glyphs' }, title: `Translate glyph readings (${c.stores.readings})`, detail: `Warden literacy ${literacy(c)} of 3. ${c.translated} readings translated.`, progress: c.translateProgress, cost: TUNE.readingCost });
  }
  return list;
}

const sameFocus = (a: Focus | null, b: Focus): boolean =>
  !!a && a.kind === b.kind && (a.kind === 'glyphs' || a.id === (b as { id: number }).id);

export function currentProject(c: Campaign): Project | null {
  const list = projects(c);
  return list.find((p) => sameFocus(c.focus, p.focus)) ?? list[0] ?? null;
}

function research(c: Campaign, away: number | null, night: string[]): void {
  if (mod(c, 'lab').lost) return;
  const p = currentProject(c);
  if (!p) return;
  const f = p.focus;
  if (f.kind === 'species') {
    const k = c.guide[f.id];
    k.progress += jobPoints(c, 'lab', 'Biologist', away);
    if (k.progress >= TUNE.speciesCost) {
      k.researched = k.sense = k.behaviour = true;
      c.stores.samples[f.id]--;
      hopeShift(c, 1.5);
      night.push(`The lab has the measure of the ${speciesName(c, f.id)}. The wire crew know how to hold it now.`);
    }
  } else if (f.kind === 'relic') {
    const r = c.relics[f.id];
    r.progress += jobPoints(c, 'lab', 'Engineer', away);
    if (r.progress >= TUNE.relicCost) {
      r.identified = true;
      night.push(`The ${r.form} is understood. The lab will not say they are comfortable with it.`);
    }
  } else {
    c.translateProgress += jobPoints(c, 'lab', 'Linguist', away);
    while (c.translateProgress >= TUNE.readingCost && c.stores.readings > 0) {
      c.translateProgress -= TUNE.readingCost;
      c.stores.readings--;
      const before = literacy(c);
      c.translated++;
      if (literacy(c) > before) {
        c.lore.push(LORE[before]);
        hopeShift(c, 4);
        night.push(`The glyphs gave something up. ${LORE[before]}`);
      }
    }
    if (c.stores.readings === 0) c.translateProgress = 0;
  }
}

export const fabLeft = (c: Campaign): number =>
  mod(c, 'fabricator').lost ? 0 : Math.max(0, Math.floor(jobPoints(c, 'fabricator', 'Engineer')) - c.fabUsed);

export type Make = 'medkit' | 'probe' | 'cell' | 'rounds';
export const MAKES: Record<Make, { name: string; cost: number; text: string }> = {
  medkit: { name: 'Medkit', cost: 5, text: 'Mends 35.' },
  probe: { name: 'Probe', cost: 2, text: 'Thrown at a plant, it shows what the plant does.' },
  cell: { name: 'Spare suit cell', cost: 4, text: 'A full torch, once.' },
  rounds: { name: 'Six rounds', cost: 2, text: 'For when quiet has already failed.' },
};

export function make(c: Campaign, what: Make): boolean {
  const cost = MAKES[what].cost;
  if (fabLeft(c) < 1 || c.stores.salvage < cost) return false;
  c.stores.salvage -= cost;
  c.fabUsed++;
  if (what === 'medkit') c.stores.medkits++;
  if (what === 'probe') c.stores.probes++;
  if (what === 'cell') c.stores.cells++;
  if (what === 'rounds') c.stores.rounds += 6;
  return true;
}

/** Culture a cutting of a studied species into something an operative can carry. */
export function culture(c: Campaign, sp: number): boolean {
  if (fabLeft(c) < 1 || !c.guide[sp].researched || c.stores.salvage < 2 || c.stores.samples[sp] < 1) return false;
  c.stores.salvage -= 2;
  c.stores.samples[sp]--;
  c.stores.grafts[sp]++;
  c.fabUsed++;
  return true;
}

export function canBurn(c: Campaign, id: ModuleId): string | null {
  const m = mod(c, id);
  if (m.lost || id === 'ops') return 'Nothing to burn back here.';
  if (!c.guide[m.species].behaviour) return 'Nobody knows what this growth does. Nothing can be mixed against it.';
  if (c.stores.samples[m.species] < 1) return 'Needs a sample of it.';
  if (c.stores.salvage < 3) return 'Needs 3 kg of salvage.';
  if (fabLeft(c) < 1) return 'No hands free at the fabricator.';
  return null;
}

/** Herbicide. It works. Something below takes note each time. */
export function burnBack(c: Campaign, id: ModuleId): boolean {
  if (canBurn(c, id)) return false;
  const m = mod(c, id);
  c.stores.salvage -= 3;
  c.stores.samples[m.species]--;
  c.fabUsed++;
  m.growth = Math.max(0, m.growth - TUNE.herbicide * (c.guide[m.species].researched ? 1.4 : 1));
  c.strain += 1;
  return true;
}

export function canAscend(c: Campaign): boolean {
  return !mod(c, 'fabricator').lost && c.stores.salvage >= TUNE.ascent.salvage && c.stores.relicCells >= TUNE.ascent.relicCells;
}

export function ascend(c: Campaign): void {
  if (canAscend(c)) c.over = { kind: 'depart', day: c.day };
}

/** Send someone into a lost module with a blade. It takes their day. */
export function reclaim(c: Campaign, id: ModuleId, who: number): void {
  const m = mod(c, id);
  const p = c.people[who];
  if (!m.lost || cannotDeploy(p)) return;
  const k = c.guide[m.species];
  const odds = 0.45 + (k.behaviour ? 0.2 : 0) + (k.researched ? 0.2 : 0) + (p.spec === 'Soldier' ? 0.15 : 0);
  const night: string[] = [];
  if (chance(c, odds)) {
    m.lost = false;
    m.growth = 70;
    hopeShift(c, 5);
    night.push(`${p.name} cut the ${MODULES[id].name.toLowerCase()} clear by hand. It is ours again, for now.`);
  } else {
    p.wound = 4;
    hopeShift(c, -2);
    night.push(`${p.name} went into the ${MODULES[id].name.toLowerCase()} with a blade and was carried out. It is still lost.`);
  }
  endDay(c, who, night);
}

// ── the day turning ─────────────────────────────────────────────────────────

function grow(c: Campaign, away: number | null, night: string[]): void {
  const fronts = c.modules.filter((m) => m.id !== 'ops' && !m.lost);
  const lost = OUTER.length - fronts.length;
  const defence = jobPoints(c, 'wire', 'Soldier', away) * (mod(c, 'wire').lost ? 0.5 : 1);
  for (const m of fronts) {
    const rate = (TUNE.growthBase + c.day * TUNE.growthPerDay + c.day * c.day * TUNE.growthPerDaySq) * range(c, 0.5, 1.5) * (1 + 0.25 * lost);
    const held = (defence * TUNE.defencePerPoint * knowFactor(c.guide[m.species])) / Math.max(1, fronts.length);
    m.growth = Math.max(0, Math.min(100, m.growth + rate - held));
    if (m.growth >= 100) {
      m.lost = true;
      hopeShift(c, -9);
      night.push(`The ${MODULES[m.id].name.toLowerCase()} is gone. The growth came through the floor panels in the night. ${MODULES[m.id].lostText}`);
      if (m.id === 'stores') c.stores.salvage = Math.floor((c.stores.salvage * 2) / 3);
      for (const p of living(c)) {
        if ((m.id === 'lab' && p.job === 'lab') || (m.id === 'infirmary' && p.job === 'infirmary') || (m.id === 'fabricator' && p.job === 'fabricator')) p.job = 'wire';
      }
    }
  }
  const ops = mod(c, 'ops');
  const nowLost = c.modules.filter((m) => m.lost).length;
  ops.growth = Math.max(0, Math.min(100, ops.growth + (nowLost ? TUNE.opsPerLost * nowLost : -3)));
  if (ops.growth >= 100) c.over = { kind: 'fallen', day: c.day };
}

function mendPeople(c: Campaign, away: number | null): void {
  const infirmaryLost = mod(c, 'infirmary').lost;
  let care = infirmaryLost ? 0 : jobPoints(c, 'infirmary', 'Medic', away);
  const hurt = living(c).filter((p) => p.wound > 0).sort((a, b) => b.wound - a.wound);
  for (const p of hurt) {
    if (!infirmaryLost || c.day % 2 === 0) p.wound--;
    if (care >= 1 && p.wound > 0) {
      p.wound--;
      care--;
    }
  }
  const ease = infirmaryLost ? 2 : care > 0 || hurt.length === 0 ? 9 : 5;
  for (const p of living(c)) if (p.id !== away) p.exposure = Math.max(0, p.exposure - ease);
}

export function endDay(c: Campaign, away: number | null, carried: string[] = []): void {
  if (c.over) return;
  const night = [...carried];
  research(c, away, night);
  grow(c, away, night);
  mendPeople(c, away);

  hopeShift(c, mod(c, 'mess').lost ? -1.5 : -0.7);
  if (c.hope < 20 && chance(c, 0.25)) {
    const stay = living(c).filter((p) => p.id !== away);
    if (stay.length > 1) {
      const p = pick(c, stay);
      p.status = 'gone';
      p.epitaph = `Walked out through the wire, day ${c.day}.`;
      hopeShift(c, -4);
      night.push(`${p.name} walked out through the wire before dawn. Nobody stopped them.`);
    }
  }
  c.strain = Math.max(0, c.strain - 0.12);
  c.board.unshift(pick(c, BOARD[moodIndex(c)]));
  c.board.length = Math.min(c.board.length, 6);

  if (!c.over && living(c).length === 0) c.over = { kind: 'spent', day: c.day };
  c.night = night;
  c.fabUsed = 0;
  c.day++;
}
