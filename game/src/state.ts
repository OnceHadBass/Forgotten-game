// Types for the world in play and the campaign round it, plus item rolling
// and the save. The campaign is what outlives a descent.

import { AFFIXES, BEHAVIOURS, BLADES, BODY_HUES, GLOW_HUES, GUNS, NAME_FIRST, NAME_SECOND, PEOPLE, PLANS, RARITY, RELIC_FORMS, SUITS, TUNE, UPGRADES } from './data';
import type { AffixId, BehaviourId, EndKind, EnemyId, Item, Job, ModuleId, Plan, RelicFn, Sense, Slot, UpgradeId } from './data';
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
  version: 4; seed: number; day: number; growth: number; pulse: number; salvage: number;
  upgrades: Record<UpgradeId, number>;
  roster: { name: string; alive: boolean; runs: number; epitaph?: string; job: Job; wound: number }[];
  /** The six modules round Operations. `growth` above is Operations itself. */
  modules: { id: ModuleId; growth: number; lost: boolean }[];
  hope: number; wonders: string[]; board: string[];
  /** Lab work: study per species, the relic on the bench, and cultured grafts waiting for the next descent. */
  study: number[]; bench: number; culture: number; stock: number[];
  expedition: number; prior: { n: number; days: number; dead: string[] } | null;
  current: number;
  species: Species[]; guide: Knowledge[];
  relicDeal: { form: string; fn: RelicFn }[]; relicTaken: boolean[];
  deepest: number; gear: Gear; fallen: Fallen[];
  lore: number; night: string[]; over: EndKind | null;
  /** 1: seen. 2: it has drawn blood, or died to you, and the operative has its measure. */
  bestiary: Partial<Record<EnemyId, number>>;
  /** Things already explained once. */
  told: Record<string, boolean>;
}

export type Mood = 'asleep' | 'stir' | 'awake';
export interface Plant { id: number; sp: number; x: number; z: number; r: number; scale: number; rot: number; hp: number; mood: Mood; t: number; lit: number; calm: number; cd: number; fuse: number; pool: number; spawned: number; dead: boolean; flash: number; wind: number; surge: number }

export type EState = 'idle' | 'chase' | 'windup' | 'strike' | 'recover' | 'stagger';
export interface Enemy { id: number; type: EnemyId; x: number; z: number; r: number; hp: number; maxHp: number; state: EState; t: number; face: number; vx: number; vz: number; alert: number; homeX: number; homeZ: number; cd: number; flash: number; frozen: boolean; slow: number; dead: boolean; deadT: number; tx: number; tz: number; phase: number; wander: number; elite: boolean;
  /** Smoothed velocity, distance walked (drives the gait) and when it last chose to move. */
  sx: number; sz: number; gait: number; st: number }

export type PropKind = 'urn' | 'crate' | 'chest' | 'plinth' | 'lift' | 'hatch' | 'body' | 'glyph' | 'door' | 'mark' | 'wheel' | 'camp';
export interface Prop { id: number; kind: PropKind; x: number; z: number; r: number; hp: number; used: boolean; rot: number; data: number }

export type LootKind = 'salvage' | 'medkit' | 'ammo' | 'cell' | 'item' | 'graft' | 'relic' | 'sample';
export interface Loot { id: number; kind: LootKind; x: number; z: number; vx: number; vz: number; t: number; n: number; item: Item | null; relic: Relic | null; gone: boolean }

export interface Proj { id: number; x: number; z: number; vx: number; vz: number; life: number; dmg: number; r: number; gone: boolean }
export type ZoneKind = 'cloud' | 'gum' | 'caltrop' | 'decoy' | 'flare' | 'friendcloud';
export interface Zone { id: number; kind: ZoneKind; x: number; z: number; r: number; life: number; max: number; gone: boolean; tick: number }

export type Fx =
  | { k: 'slash'; x: number; z: number; a: number; reach: number; arc: number; heavy: boolean }
  | { k: 'hit'; x: number; z: number; n: number; crit: boolean; who: 'enemy' | 'plant' | 'player'; label?: string }
  | { k: 'text'; x: number; z: number; t: string; c: string }
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
  relicCharges: number; salvage: number; samples: number; kills: number; moving: number; mdir: number; hurtT: number; lowSaid: boolean; inCloud: number;
}

export interface Input { mx: number; mz: number; aimX: number; aimZ: number; attack: boolean; fire: boolean; dodge: boolean; interact: boolean; graft: boolean; relic: boolean; torch: boolean; medkit: boolean; cycle: number }

export interface World {
  camp: Campaign; level: Level; depth: number; rng: RngHost; time: number; nextId: number;
  player: Player; enemies: Enemy[]; plants: Plant[]; props: Prop[]; loot: Loot[]; projs: Proj[]; zones: Zone[];
  fx: Fx[]; flow: Int16Array; flowT: number; explored: Uint8Array; revealed: boolean;
  hitstop: number; still: number; prompt: string | null; near: Loot | Prop | null; hover: Plant | null; hoverE: Enemy | null;
  outcome: null | 'extracted' | 'dead' | 'descend' | 'won'; liftT: number; wonders: string[]; choirT: number;
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

export function newCampaign(seed: number, prior: Campaign['prior'] = null): Campaign {
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
    version: 4, seed, day: 1, growth: 0, pulse: 0, salvage: 0,
    modules: (['lab', 'wire', 'stores', 'infirmary', 'workshop', 'mess'] as const).map((id) => ({ id, growth: Math.round(range(h, 4, 14)), lost: false })),
    hope: 62, wonders: [], board: ['Sixteen came down. Eight are left. The ship is not going back up.'],
    study: species.map(() => 0), bench: 0, culture: 0, stock: species.map(() => 0), expedition: (prior?.n ?? 0) + 1, prior,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>,
    roster: shuffle(h, PEOPLE).slice(0, 8).map((name, i) => ({ name, alive: true, runs: 0, job: (['wire', 'lab', 'wire', 'lab', 'infirmary', 'wire', 'workshop', 'wire'] as const)[i], wound: 0 })),
    current: 0, species,
    guide: species.map(() => ({ seen: false, sense: false, behaviour: false, samples: 0 })),
    relicDeal: [0, 1, 2].map((i) => ({ form: forms[i], fn: fns[i] })), relicTaken: [false, false, false],
    deepest: 1, gear: starterGear(), fallen: [], lore: 0, night: [], over: null, bestiary: {}, told: {},
  };
}

export const starterGear = (): Gear => ({ blade: makeItem('blade', 0, 1, []), gun: makeItem('gun', 0, 1, []), suit: makeItem('suit', 0, 1, []), relic: null });
export const speciesName = (c: Campaign, id: number): string => c.species[id].name;

const SAVE = 'forgotten.game.v4';
const LEDGER = 'forgotten.ledger';

/** The last expedition that ended, for the next one to find. */
export function loadPrior(): Campaign['prior'] {
  try { return JSON.parse(localStorage.getItem(LEDGER) ?? 'null') as Campaign['prior']; } catch { return null; }
}
export function recordExpedition(c: Campaign): void {
  try { localStorage.setItem(LEDGER, JSON.stringify({ n: c.expedition, days: c.day, dead: c.roster.filter((p) => !p.alive).map((p) => p.name) })); } catch { /* no storage */ }
}
export function loadCampaign(): Campaign | null {
  try {
    const c = JSON.parse(localStorage.getItem(SAVE) ?? 'null') as Campaign | null;
    return c && c.version === 4 ? c : null;
  } catch { return null; }
}
export function saveCampaign(c: Campaign | null): void {
  try { if (c) localStorage.setItem(SAVE, JSON.stringify(c)); else localStorage.removeItem(SAVE); } catch { /* no storage: the game still plays */ }
}

