// Types for the world in play and the campaign round it, plus item rolling
// and the save. The campaign is what outlives a descent.

import { AFFIXES, BEHAVIOURS, BLADES, BODY_HUES, GLOW_HUES, GUNS, NAME_FIRST, NAME_SECOND, PEOPLE, PLANS, RARITY, RELIC_FORMS, SUITS, TUNE, UPGRADES } from './data';
import type { AffixId, BehaviourId, EndKind, EnemyId, Item, Plan, RelicFn, Sense, Slot, UpgradeId } from './data';
import type { Level } from './level';
import { chance, fork, int, pick, range, shuffle } from './rng';
import type { RngHost } from './rng';

/** Dealt per campaign: nothing about look or name says what it does. */
export interface Species { id: number; name: string; behaviour: BehaviourId; sense: Sense; plan: Plan; hue: number; glow: number; vivid: boolean; pattern: number }
export interface Knowledge { seen: boolean; sense: boolean; behaviour: boolean; samples: number }

export interface Relic { form: string; fn: RelicFn; known: boolean }
export interface Gear { blade: Item; gun: Item; suit: Item; relic: Relic | null }
export interface Fallen { name: string; depth: number; gear: Gear }

export interface Campaign {
  version: 2; seed: number; day: number; growth: number; pulse: number; salvage: number;
  upgrades: Record<UpgradeId, number>;
  roster: { name: string; alive: boolean; runs: number; epitaph?: string }[];
  current: number;
  species: Species[]; guide: Knowledge[];
  relicDeal: { form: string; fn: RelicFn }[]; relicTaken: boolean[];
  deepest: number; gear: Gear; fallen: Fallen[];
  lore: number; night: string[]; over: EndKind | null;
}

export type Mood = 'asleep' | 'stir' | 'awake';
export interface Plant { id: number; sp: number; x: number; z: number; r: number; scale: number; rot: number; hp: number; mood: Mood; t: number; lit: number; calm: number; cd: number; fuse: number; pool: number; spawned: number; dead: boolean; flash: number; wind: number; surge: number }

export type EState = 'idle' | 'chase' | 'windup' | 'strike' | 'recover' | 'stagger';
export interface Enemy { id: number; type: EnemyId; x: number; z: number; r: number; hp: number; maxHp: number; state: EState; t: number; face: number; vx: number; vz: number; alert: number; homeX: number; homeZ: number; cd: number; flash: number; frozen: boolean; slow: number; dead: boolean; deadT: number; tx: number; tz: number; phase: number; wander: number; elite: boolean }

export type PropKind = 'urn' | 'crate' | 'chest' | 'plinth' | 'lift' | 'hatch' | 'body' | 'glyph' | 'door';
export interface Prop { id: number; kind: PropKind; x: number; z: number; r: number; hp: number; used: boolean; rot: number; data: number }

export type LootKind = 'salvage' | 'medkit' | 'ammo' | 'cell' | 'item' | 'graft' | 'relic' | 'sample';
export interface Loot { id: number; kind: LootKind; x: number; z: number; vx: number; vz: number; t: number; n: number; item: Item | null; relic: Relic | null; gone: boolean }

export interface Proj { id: number; x: number; z: number; vx: number; vz: number; life: number; dmg: number; r: number; gone: boolean }
export type ZoneKind = 'cloud' | 'gum' | 'caltrop' | 'decoy' | 'flare' | 'friendcloud';
export interface Zone { id: number; kind: ZoneKind; x: number; z: number; r: number; life: number; max: number; gone: boolean; tick: number }

export type Fx =
  | { k: 'slash'; x: number; z: number; a: number; reach: number; arc: number; heavy: boolean }
  | { k: 'hit'; x: number; z: number; n: number; crit: boolean; who: 'enemy' | 'plant' | 'player' }
  | { k: 'shot'; x: number; z: number; x2: number; z2: number }
  | { k: 'ring'; x: number; z: number; r: number; t: number; c: number }
  | { k: 'burst'; x: number; z: number; r: number; c: number }
  | { k: 'leaves'; x: number; z: number; c: number; n: number }
  | { k: 'gore'; x: number; z: number; n: number }
  | { k: 'shake'; n: number }
  | { k: 'sound'; s: string; x: number; z: number; v?: number }
  | { k: 'say'; t: string; tone?: string }
  | { k: 'spark'; x: number; z: number; c: number; n: number }
  | { k: 'thicket'; tx: number; ty: number };

export interface Player {
  x: number; z: number; face: number; vx: number; vz: number;
  hp: number; maxHp: number; cell: number; maxCell: number; torch: boolean;
  state: 'free' | 'swing' | 'dodge' | 'dead';
  t: number; combo: number; comboT: number; struck: boolean; buffer: boolean;
  dodges: number; maxDodges: number; dodgeT: number; ddx: number; ddz: number;
  invuln: number; downs: number; fireCd: number; snared: number; slowStill: number;
  medkits: number; maxMedkits: number; ammo: number; grafts: number[]; graftSel: number; graftCap: number;
  relicCharges: number; salvage: number; samples: number; kills: number; moving: number; hurtT: number; lowSaid: boolean;
}

export interface Input { mx: number; mz: number; aimX: number; aimZ: number; attack: boolean; fire: boolean; dodge: boolean; interact: boolean; graft: boolean; relic: boolean; torch: boolean; medkit: boolean; cycle: number }

export interface World {
  camp: Campaign; level: Level; depth: number; rng: RngHost; time: number; nextId: number;
  player: Player; enemies: Enemy[]; plants: Plant[]; props: Prop[]; loot: Loot[]; projs: Proj[]; zones: Zone[];
  fx: Fx[]; flow: Int16Array; flowT: number; explored: Uint8Array; revealed: boolean;
  hitstop: number; still: number; prompt: string | null; near: Loot | Prop | null; hover: Plant | null;
  outcome: null | 'extracted' | 'dead' | 'descend' | 'won'; liftT: number;
  /** The Pulse passing: a ring of light spreading from the way down. */
  wave: number; waveT: number; waveX: number; waveZ: number; breaches: { x: number; z: number }[]; said: Record<string, boolean>; boss: Enemy | null; cause: string;
}

// ── items ───────────────────────────────────────────────────────────────────

const BASES = { blade: BLADES, gun: GUNS, suit: SUITS } as const;

export function makeItem(slot: Slot, base: number, rarity: number, affixes: AffixId[]): Item {
  const adj = affixes.map((a) => AFFIXES[a].adj).join(' ');
  const name = `${rarity === 0 ? 'Worn ' : ''}${adj ? `${adj} ` : ''}${rarity === 0 || adj ? BASES[slot][base].name.toLowerCase() : BASES[slot][base].name}`;
  return { slot, base, rarity, affixes, name: name.charAt(0).toUpperCase() + name.slice(1) + (rarity === 3 ? ', Warden-touched' : '') };
}

export function rollItem(h: RngHost, depth: number, lucky = 0): Item {
  const slot = pick(h, ['blade', 'blade', 'gun', 'gun', 'suit'] as const);
  const roll = range(h, 0, 1) + depth * 0.06 + lucky;
  const rarity = roll > 1.12 ? 3 : roll > 0.84 ? 2 : roll > 0.45 ? 1 : 0;
  const pool = (Object.keys(AFFIXES) as AffixId[]).filter((a) => AFFIXES[a].slots.includes(slot));
  const base = slot === 'suit' ? int(h, SUITS.length) : int(h, BASES[slot].length);
  return makeItem(slot, base, rarity, shuffle(h, pool).slice(0, slot === 'suit' ? Math.max(1, rarity) : rarity));
}

export const has = (it: Item, a: AffixId): boolean => it.affixes.includes(a);
export function itemLines(it: Item): string[] {
  const lines: string[] = [];
  if (it.slot === 'blade') {
    const b = BLADES[it.base];
    lines.push(`${Math.round(b.dmg * (has(it, 'keen') ? 1.25 : 1))} damage · ${(b.reach + (has(it, 'long') ? 0.5 : 0)).toFixed(1)} m · ${b.speed >= 1.3 ? 'fast' : b.speed <= 0.6 ? 'very slow' : b.speed < 0.9 ? 'slow' : 'steady'}`);
  } else if (it.slot === 'gun') {
    const g = GUNS[it.base];
    lines.push(`${Math.round(g.dmg * (has(it, 'keen') ? 1.25 : 1))}${g.pellets > 1 ? ` × ${g.pellets}` : ''} damage · ${g.use} round${g.use > 1 ? 's' : ''} a shot`);
  }
  for (const a of it.affixes) lines.push(AFFIXES[a].text);
  return lines;
}
export const rarityName = (it: Item): string => RARITY[it.rarity];

// ── campaign ────────────────────────────────────────────────────────────────

export function newCampaign(seed: number): Campaign {
  const h = fork(seed, 1);
  const behaviours = shuffle(h, Object.keys(BEHAVIOURS) as BehaviourId[]);
  const senses = shuffle<Sense>(h, ['light', 'light', 'light', 'sound', 'sound', 'sound', 'near', 'near']);
  const plans = shuffle(h, PLANS);
  const firsts = shuffle(h, NAME_FIRST);
  const vivid = shuffle(h, [0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 2);
  const species: Species[] = behaviours.map((behaviour, id) => {
    const band = pick(h, BODY_HUES);
    // A nest that only woke to torchlight would never be met in a fight.
    const sense = behaviour === 'gall' && senses[id] === 'light' ? 'sound' : senses[id];
    return { id, behaviour, sense, plan: plans[id], name: `${firsts[id]} ${pick(h, NAME_SECOND[plans[id]])}`, hue: Math.round(range(h, band[0], band[1])) % 360, glow: Math.round(range(h, GLOW_HUES[0], GLOW_HUES[1])), vivid: vivid.includes(id), pattern: int(h, 4) };
  });
  const forms = shuffle(h, RELIC_FORMS);
  const fns = shuffle<RelicFn>(h, ['hush', 'lattice', 'still', 'tending', 'choir', 'memorywork']);
  return {
    version: 2, seed, day: 1, growth: 12, pulse: 0, salvage: 0,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>,
    roster: shuffle(h, PEOPLE).slice(0, 8).map((name) => ({ name, alive: true, runs: 0 })),
    current: 0, species,
    guide: species.map(() => ({ seen: false, sense: false, behaviour: false, samples: 0 })),
    relicDeal: [0, 1, 2].map((i) => ({ form: forms[i], fn: fns[i] })), relicTaken: [false, false, false],
    deepest: 1, gear: starterGear(), fallen: [], lore: 0, night: [], over: null,
  };
}

export const starterGear = (): Gear => ({ blade: makeItem('blade', 0, 1, []), gun: makeItem('gun', 0, 1, []), suit: makeItem('suit', 0, 1, []), relic: null });
export const speciesName = (c: Campaign, id: number): string => c.species[id].name;

const SAVE = 'forgotten.game.v2';
export function loadCampaign(): Campaign | null {
  try {
    const c = JSON.parse(localStorage.getItem(SAVE) ?? 'null') as Campaign | null;
    return c && c.version === 2 ? c : null;
  } catch { return null; }
}
export function saveCampaign(c: Campaign | null): void {
  try { if (c) localStorage.setItem(SAVE, JSON.stringify(c)); else localStorage.removeItem(SAVE); } catch { /* no storage: the game still plays */ }
}

/** A day passes at base: the growth comes on, the Pulse eases. */
export function passDay(c: Campaign, h: RngHost): void {
  c.day++;
  const rate = TUNE.growth.perDay + c.day * 0.25 - c.upgrades.wire * 1.5;
  c.growth = Math.min(100, c.growth + Math.max(2, rate * range(h, 0.7, 1.3)));
  c.pulse = Math.max(0, c.pulse - 0.34);
  if (c.growth >= 100) c.over = 'fallen';
  else if (!c.roster.some((p) => p.alive)) c.over = 'spent';
  if (chance(h, 0.5) && c.growth > 60 && !c.over) c.night.push('The growth has reached the mess windows. People eat with their backs to them.');
}
