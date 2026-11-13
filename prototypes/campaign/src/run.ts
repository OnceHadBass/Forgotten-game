// The descent, in miniature: one operative, room by room. It keeps the rules
// of the real game that matter to the campaign: knowledge is earned and is
// power, noise is the price of everything, and what you carry only counts if
// you get it home.

import { BEHAVIOURS, EVENTS, HEARD, LAYERS, RELICS, ROOM_TEXT, ROOM_TITLES, SENSE_TEXT, TUNE } from './data';
import { endDay, hopeShift, literacy, pulseLevel, speciesName } from './game';
import { chance, fork, int, pick, range, shuffle, weighted } from './rng';
import type { Campaign, Plant, Person, Room, RoomKind, Route, Run, Sense, Species } from './types';

export interface Loadout {
  medkits: number;
  probes: number;
  cells: number;
  relic: number | null;
  grafts: number[];
  /** The lift can set down at any layer already reached. */
  layer: number;
}

export interface Layout {
  spine: RoomKind[];
  sides: { at: number; kind: RoomKind }[];
}

const ROUTE_FOR: Record<Sense, Route> = { light: 'lit', near: 'dark', sound: 'run' };

/** A doubled body wakes to what either part senses. */
const wakesTo = (c: Campaign, p: Plant, sense: Sense): boolean =>
  c.species[p.sp].sense === sense || (p.extra !== null && c.species[p.extra].sense === sense);
const SENSE_OF: Record<Route, Sense> = { lit: 'light', dark: 'near', run: 'sound' };

/** A layer's rooms are fixed for the campaign, so the ruin can be learned. */
export function layout(c: Campaign, layer: number): Layout {
  const h = fork(c.seed, 100 + layer);
  const spine: RoomKind[] = ['growth', 'growth', 'growth', 'growth', layer === 3 ? 'vault' : 'hatch'];
  spine[1 + int(h, 3)] = 'glyphs';
  const kinds: RoomKind[] =
    layer === 1 ? ['cache', 'relay', 'relic', 'wonder', ...(c.prior ? (['oldcamp'] as const) : [])]
    : layer === 2 ? ['cache', 'relay', 'relic', 'horror', 'sealed']
    : ['relay', 'relic', 'wonder', 'horror', 'sealed'];
  const at = shuffle(h, [0, 1, 2, 3, 4]);
  return { spine, sides: kinds.map((kind, i) => ({ at: at[i], kind })) };
}

const run = (c: Campaign): Run => c.run!;
const who = (c: Campaign): Person => c.people[run(c).who];
const keyOf = (r: Run): string => `${r.layer}:${r.side ? 's' : ''}${r.pos}`;
const keyHash = (r: Run): number => r.layer * 100 + r.pos + (r.side ? 50 : 0);

function say(c: Campaign, t: string, tone: 'say' | 'bad' | 'good' | 'note' | 'white' = 'say'): void {
  const r = run(c);
  r.log.push({ t, tone });
  if (r.log.length > 80) r.log.shift();
}

export const packWeight = (r: Run): number =>
  r.pack.salvage + r.pack.relicCells * 3 + r.pack.samples.reduce((s, n) => s + n, 0) * 0.2;

export function sideHere(c: Campaign): { kind: RoomKind; open: boolean; done: boolean } | null {
  const r = run(c);
  if (r.side || r.pos < 0) return null;
  const lay = layout(c, r.layer);
  const i = lay.sides.findIndex((s) => s.at === r.pos);
  if (i < 0) return null;
  return { kind: lay.sides[i].kind, open: r.collapsed[r.layer] !== i, done: r.doneSides.includes(`${r.layer}:s${r.pos}`) };
}

// ── starting ────────────────────────────────────────────────────────────────

export function startRun(c: Campaign, id: number, load: Loadout): void {
  const p = c.people[id];
  const s = c.stores;
  const rounds = Math.min(s.rounds, 12 + (p.trait === 'Resourceful' ? 4 : 0));
  s.medkits -= load.medkits;
  s.probes -= load.probes;
  s.cells -= load.cells;
  s.rounds -= rounds;
  load.grafts.forEach((n, sp) => (s.grafts[sp] -= n));
  if (load.relic !== null) c.relics[load.relic].where = 'field';
  const h = fork(c.seed, 7, c.site.runs);
  const collapsed: Record<number, number> = {};
  for (const layer of [1, 2, 3]) if (chance(h, 0.5)) collapsed[layer] = int(h, layout(c, layer).sides.length);
  c.site.runs++;
  c.run = {
    who: id, layer: Math.max(1, Math.min(load.layer, c.site.deepest, 3)), pos: -1, side: false, phase: 'entry', room: null, held: null,
    hp: TUNE.hp, downs: 0, cell: 100, wake: 0, wakeAdded: false, exposure: 0,
    medkits: load.medkits, probes: load.probes + (p.trait === 'Cautious' ? 1 : 0), rounds, spareCells: load.cells,
    relic: load.relic, relicCharges: load.relic === null ? 0 : 2 + (p.spec === 'Engineer' ? 1 : 0),
    grafts: load.grafts.slice(),
    pack: { salvage: 0, samples: c.species.map(() => 0), readings: 0, relicCells: 0, wonders: [], fragments: 0, tags: [] },
    poison: 0, stalked: false, wakeHidden: false, sealedDoor: false, caltrops: false, creature: false,
    liftBeats: 0, uplinked: [], collapsed, doneSides: [], cuts: [], log: [], cause: '', outcome: null,
  };
  say(c, `The lift lets ${p.name.split(' ')[0]} off at ${LAYERS[c.run.layer]} and goes back up. The beacon here will call it down again.`, 'note');
  if (pulseLevel(c) > 0) say(c, 'The hum in the stone is higher than it was. Things down here will be sleeping lightly.', 'note');
}

// ── rooms ───────────────────────────────────────────────────────────────────

function makeRoom(c: Campaign, kind: RoomKind): Room {
  const r = run(c);
  const key = keyOf(r);
  const fixed = fork(c.seed, 300, keyHash(r));
  const h = fork(c.seed, 400, keyHash(r), c.site.runs);
  const total = c.site.routeUse.lit + c.site.routeUse.dark + c.site.routeUse.run;
  // The ruin adapts to how you travel: the growth along your usual way is the kind that minds it.
  const weight = (s: Species): number => (c.site.runs > 2 && total > 0 ? 1 + (2 * c.site.routeUse[ROUTE_FOR[s.sense]]) / total : 1);

  let count =
    kind === 'growth' ? 1 + int(h, 2) + (r.layer > 1 && chance(h, 0.45) ? 1 : 0)
    : kind === 'relic' ? 2 + (r.layer > 1 ? 1 : 0)
    : kind === 'hatch' ? 2
    : kind === 'glyphs' || kind === 'vault' ? 1
    : kind === 'cache' || kind === 'relay' ? int(h, 2)
    : 0;
  if (c.site.cut[key]) count = Math.max(0, count - 1);

  const awakeOdds = r.wake * 0.1 + pulseLevel(c) * 0.2;
  const plants: Plant[] = [];
  for (let i = 0; i < Math.min(3, count); i++) {
    const sp = weighted(h, c.species, weight).id;
    const extra = r.layer > 1 && chance(h, r.layer === 3 ? 0.5 : 0.3) ? (sp + 1 + int(h, 7)) % 8 : null;
    plants.push({ sp, extra, extraKnown: false, awake: chance(h, awakeOdds), gone: false, sampled: false, harvested: false });
  }

  let event: string | null = null;
  if (kind === 'wonder' || kind === 'horror' || (kind === 'growth' && r.pos > 0 && chance(h, 0.14))) {
    const want = kind === 'growth' ? (chance(h, 0.5) ? 'wonder' : 'horror') : kind;
    const open = EVENTS.filter((e) => e.kind === want && !c.site.seenEvents.includes(e.id) && (e.id !== 'unlit' || r.layer > 1));
    if (open.length) event = pick(h, open).id;
  }

  let pile = 0;
  if (kind === 'growth' && chance(h, 0.65)) pile = Math.round(range(h, 3, 6) * (0.6 + r.layer * 0.5));
  if (kind === 'relic' && c.site.relicTaken[r.layer - 1]) pile = 4 + 3 * r.layer;
  if ((kind === 'wonder' || kind === 'horror') && !event) pile = 4 * r.layer;

  return {
    key, kind, plants, pile, event, done: false, scoutUsed: false, lootBait: false,
    title: pick(fixed, ROOM_TITLES[r.layer]),
    text: pick(fixed, ROOM_TEXT[r.layer]),
    body: c.site.bodies.find((b) => b.key === key) ?? null,
  };
}

function enterRoom(c: Campaign, kind: RoomKind): void {
  const r = run(c);
  if (!r.wakeAdded && r.wake > 0) r.wake--;
  r.wakeAdded = false;
  r.exposure += 1 + 2 * r.layer;
  const room = (r.room = makeRoom(c, kind));
  r.phase = 'door';
  say(c, `${room.title}. ${room.text}`, 'note');
  if (r.poison > 0) {
    r.poison--;
    hurt(c, who(c).trait === 'Iron stomach' ? 6 : 12, 'spores in the lungs');
    if (r.outcome) return;
  }
  const live = room.plants.filter((p) => !p.gone);
  if (live.length) {
    say(c, pick(c, HEARD));
    for (const p of live) {
      c.guide[p.sp].seen = true;
      if (p.awake) say(c, `The ${speciesName(c, p.sp)} is already awake. Standing tall, trembling.`, 'bad');
    }
  } else if (kind === 'growth') {
    say(c, 'Nothing sings in here. Nothing at all.');
  }
  if (room.event) witness(c, room.event);
  if (chance(c, Math.min(0.8, Math.max(0, (r.wake - 1) * 0.1 + (r.layer - 1) * 0.05 + pulseLevel(c) * 0.08)))) creatureComes(c);
  if (!live.length) r.phase = 'far';
}

function witness(c: Campaign, id: string): void {
  const r = run(c);
  const e = EVENTS.find((x) => x.id === id)!;
  c.site.seenEvents.push(id);
  say(c, `${e.title}. ${e.text}`, e.kind === 'wonder' ? 'white' : 'bad');
  if (e.kind === 'wonder') r.pack.wonders.push(id);
  if (id === 'vast') r.wake = 0;
  if (id === 'sky') r.hp = Math.min(TUNE.hp, r.hp + 10);
  if (id === 'unlit') r.stalked = true;
  if (id === 'voice') {
    r.wakeHidden = true;
    addWake(c, 2, false);
    say(c, 'I can no longer tell which sounds are the ruin and which are it.', 'bad');
  }
  if (id === 'inside') {
    r.room!.pile = 12;
    r.room!.lootBait = true;
  }
  if (id === 'shape') {
    const dead = c.people.find((p) => p.status === 'dead');
    if (dead) say(c, `There is yellow in the growth. Suit yellow. I think this was ${dead.name}.`, 'bad');
    r.exposure += 4;
    r.pack.readings += 2;
    say(c, 'A glyph plate, grown into the chest of it. I take a reading and do not look up.');
  }
}

function creatureComes(c: Campaign): void {
  const r = run(c);
  if (r.creature) return;
  if (r.caltrops) {
    r.caltrops = false;
    say(c, 'Something came fast out of the dark behind, and trod on the fronds. It is not coming any further.', 'good');
    return;
  }
  r.creature = true;
  say(c, 'Eyeshine, low, at the edge of the light. A skulker. It has my torch and it is deciding.', 'bad');
}

function addWake(c: Campaign, n: number, own = true): void {
  const r = run(c);
  if (own && who(c).spec === 'Scout' && r.room && !r.room.scoutUsed) {
    r.room.scoutUsed = true;
    n--;
  }
  if (n <= 0) return;
  r.wake = Math.min(10, r.wake + n);
  r.wakeAdded = true;
}

function hurt(c: Campaign, amount: number, cause: string): void {
  const r = run(c);
  const n = Math.max(1, Math.round(amount));
  r.hp -= n;
  r.cause = cause;
  say(c, `−${n}  (${cause})`, 'bad');
  if (r.hp > 0) return;
  r.downs++;
  if (r.downs > 2) {
    r.hp = 0;
    finish(c, 'dead');
    return;
  }
  r.hp = who(c).trait === 'Steady' ? 45 : 30;
  r.exposure += 10;
  say(c, `Down. The suit stabiliser fires and gets me up again. That is ${r.downs} of 2.`, 'bad');
}

function finish(c: Campaign, outcome: 'extracted' | 'dead' | 'abandoned'): void {
  const r = run(c);
  r.outcome = outcome;
  r.phase = 'over';
  r.creature = false;
}

// ── what plants do ──────────────────────────────────────────────────────────

function learnSense(c: Campaign, p: Plant, sense: Sense): void {
  // Seeing it wake teaches the sense of whichever part answered.
  const sp = c.species[p.sp].sense === sense ? p.sp : p.extra!;
  if (sp !== p.sp) {
    p.extraKnown = true;
    say(c, `Only part of it woke. The part that is ${c.guide[sp].seen ? `a ${speciesName(c, sp)}` : 'something else'}.`, 'note');
  }
  const k = c.guide[sp];
  if (k.sense || !k.seen) return;
  k.sense = true;
  say(c, `Did that just stir? The ${speciesName(c, sp)} wakes to ${SENSE_TEXT[sense]}. Noted.`);
}

function acts(c: Campaign, p: Plant, on: 'you' | 'probe' | 'creature'): void {
  const r = run(c);
  const mult = 1 + 0.35 * (r.layer - 1) + 0.15 * pulseLevel(c);
  const iron = who(c).trait === 'Iron stomach' ? 0.5 : 1;
  for (const sp of p.extra === null ? [p.sp] : [p.sp, p.extra]) {
    const b = c.species[sp].behaviour;
    const k = c.guide[sp];
    const name = speciesName(c, sp);
    if (sp !== p.sp) p.extraKnown = true;
    if (sp !== p.sp) say(c, k.seen ? `Part of this is a ${name}.` : 'Part of this is something else. Something I have not met.', 'note');
    if (!k.behaviour && sp === p.sp) {
      k.behaviour = true;
      say(c, on === 'you' ? BEHAVIOURS[b].first : `Watched it from here. ${name}: ${BEHAVIOURS[b].does}`, on === 'you' ? 'say' : 'good');
    }
    if (b === 'shriek') {
      addWake(c, 3, false);
      say(c, 'It screams. A long howl through a throat that is not there.', 'bad');
    }
    if (b === 'burst') {
      p.gone = true;
      addWake(c, 2, false);
    }
    if (on !== 'you') continue;
    const cause = `the ${name}`;
    if (b === 'spines') hurt(c, 34 * mult, cause);
    if (b === 'burst') hurt(c, 45 * mult, cause);
    if (b === 'snare') {
      r.cell = Math.max(0, r.cell - 30);
      hurt(c, 18 * mult, cause);
    }
    if (b === 'spores') {
      r.poison = 2;
      hurt(c, 16 * mult * iron, cause);
    }
    if (b === 'leech') {
      r.exposure += 12 * iron;
      hurt(c, 5, cause);
    }
    if (BEHAVIOURS[b].kind === 'boon') say(c, `The ${name} clams shut. Whatever it might have given, it will not now.`);
    if (r.outcome) return;
  }
}

/** Anything done within arm's reach of a plant. */
function reach(c: Campaign, p: Plant): void {
  if (!p.awake && wakesTo(c, p, 'near')) {
    p.awake = true;
    learnSense(c, p, 'near');
  }
  if (p.awake) acts(c, p, 'you');
}

const plantAt = (c: Campaign, i: number): Plant | null => {
  const r = run(c);
  const p = r.room?.plants[i];
  return p && !p.gone && !r.creature && !r.outcome && r.phase === 'door' ? p : null;
};

export function scan(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p || r.cell < TUNE.scanCell) return;
  r.cell -= TUNE.scanCell;
  addWake(c, 1);
  const k = c.guide[p.sp];
  const s = c.species[p.sp];
  if (!k.sense) {
    k.sense = true;
    say(c, `Scan: the ${speciesName(c, p.sp)} wakes to ${SENSE_TEXT[s.sense]}. Currently ${p.awake ? 'alert' : 'dormant'}.`, 'good');
  } else if (!k.behaviour) {
    k.behaviour = true;
    say(c, `Tissue reading on the ${speciesName(c, p.sp)}: ${BEHAVIOURS[s.behaviour].does}`, 'good');
  } else {
    say(c, `Scan: ${p.awake ? 'alert' : 'dormant'}. Nothing I did not know.`);
  }
  if (p.extra !== null) p.extraKnown = true;
  if (p.extra !== null) say(c, c.guide[p.extra].seen ? `The reading is doubled. Part of it is a ${speciesName(c, p.extra)}.` : 'The reading is doubled. Two things are growing as one.', 'note');
  if (wakesTo(c, p, 'light') && !p.awake) {
    p.awake = true;
    say(c, 'The scan ends in a flash, and the flash woke it.', 'bad');
  }
}

export function probe(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p || r.probes < 1) return;
  r.probes--;
  addWake(c, 1);
  say(c, 'The probe clatters in against it.');
  p.awake = true;
  acts(c, p, 'probe');
}

export function cut(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p) return;
  addWake(c, 1);
  reach(c, p);
  if (r.outcome) return;
  p.gone = true;
  if (!r.cuts.includes(r.room!.key)) r.cuts.push(r.room!.key);
  say(c, `Cut the ${speciesName(c, p.sp)} down. It thrashed. There will be no sample from that one.`);
}

export function cutting(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p || p.sampled) return;
  reach(c, p);
  if (r.outcome || p.gone) return;
  p.sampled = true;
  const k = c.guide[p.sp];
  k.sense = k.behaviour = true;
  r.pack.samples[p.sp] += who(c).spec === 'Biologist' ? 2 : 1;
  say(c, `A cutting of the ${speciesName(c, p.sp)}, sealed. The suit has read the rest off it: ${BEHAVIOURS[c.species[p.sp].behaviour].does}`, 'good');
}

/** Take a living piece that keeps doing what the plant does. Only if you know what that is. */
export function harvest(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p || p.harvested || !c.guide[p.sp].behaviour) return;
  reach(c, p);
  if (r.outcome || p.gone) return;
  p.harvested = true;
  r.grafts[p.sp]++;
  const g = BEHAVIOURS[c.species[p.sp].behaviour].graft;
  say(c, `Took a ${g.name.toLowerCase()} off it, still twitching. ${g.use}`, 'good');
}

export function shoot(c: Campaign, i: number): void {
  const r = run(c);
  const p = plantAt(c, i);
  if (!p || r.rounds < 1) return;
  r.rounds--;
  addWake(c, 3);
  say(c, 'One shot. It goes round the ruin and comes back.', 'bad');
  if (c.species[p.sp].behaviour === 'burst') acts(c, p, 'probe');
  p.gone = true;
  for (const q of r.room!.plants) {
    if (!q.gone && !q.awake && wakesTo(c, q, 'sound')) {
      q.awake = true;
      learnSense(c, q, 'sound');
    }
  }
}

export function waitItOut(c: Campaign): void {
  const r = run(c);
  if (r.phase !== 'door' || r.creature || r.outcome) return;
  r.exposure += 5;
  let settled = 0;
  for (const p of r.room!.plants) {
    if (!p.gone && p.awake && chance(c, 0.6)) {
      p.awake = false;
      settled++;
    }
  }
  say(c, settled ? 'Stood still in the doorway until the trembling stopped. The clock in the suit kept counting.' : 'Waited. They did not settle. The sickness does not wait.');
  if (chance(c, Math.max(0, (r.wake - 1) * 0.06))) creatureComes(c);
}

export function canRoute(c: Campaign, route: Route): string | null {
  const r = run(c);
  if (route !== 'dark' && r.cell <= 0) return 'The torch is dead.';
  if (route === 'run' && packWeight(r) > TUNE.comfortable) return 'Too heavy to run.';
  return null;
}

export function cross(c: Campaign, route: Route): void {
  const r = run(c);
  if (r.phase !== 'door' || r.creature || r.outcome || canRoute(c, route)) return;
  c.site.routeUse[route]++;
  if (route === 'lit') r.cell = Math.max(0, r.cell - TUNE.cellLit);
  if (route === 'run') {
    r.cell = Math.max(0, r.cell - TUNE.cellRun);
    if (who(c).trait !== 'Light-footed') addWake(c, 1);
  }
  say(c, route === 'lit' ? 'Torch on, slowly, keeping my distance.' : route === 'dark' ? 'Torch off. Along the wall by touch.' : 'Running for the far door.', 'note');
  if (route === 'dark' && r.stalked) {
    say(c, 'The moment the light went, it moved.', 'bad');
    hurt(c, 35, 'the thing that moves when unlit');
    if (r.outcome) return;
  }
  for (const p of r.room!.plants) {
    if (p.gone) continue;
    const s = c.species[p.sp];
    if (!p.awake && wakesTo(c, p, SENSE_OF[route])) {
      p.awake = true;
      learnSense(c, p, SENSE_OF[route]);
    }
    if (p.awake) {
      acts(c, p, 'you');
      if (r.outcome) return;
    } else if (BEHAVIOURS[s.behaviour].kind === 'boon') {
      const k = c.guide[p.sp];
      if (!k.behaviour) {
        k.behaviour = true;
        say(c, BEHAVIOURS[s.behaviour].first);
      }
      if (s.behaviour === 'mend') r.hp = Math.min(TUNE.hp, r.hp + 15);
      if (s.behaviour === 'lantern') r.cell = Math.min(100, r.cell + 15);
      say(c, s.behaviour === 'mend' ? '+15, from the leaves.' : 'Cell +15, from its light.', 'good');
    }
  }
  if (r.cell <= 0) say(c, 'The torch gutters and dies. The dark is where you listen.', 'bad');
  r.phase = 'far';
}

// ── the far side of a room ──────────────────────────────────────────────────

const atFar = (c: Campaign): boolean => {
  const r = run(c);
  return r.phase === 'far' && !r.creature && !r.outcome;
};

function load(c: Campaign, kg: number): number {
  const r = run(c);
  const took = Math.max(0, Math.min(kg, Math.floor(TUNE.hardLimit - packWeight(r))));
  r.pack.salvage += took;
  return took;
}

export function searchPile(c: Campaign): void {
  const r = run(c);
  const room = r.room!;
  if (!atFar(c) || room.pile <= 0) return;
  addWake(c, 1);
  if (room.lootBait) {
    say(c, 'The floor closed on my arm to the shoulder. The pile was never salvage. It was a tongue.', 'bad');
    r.cell = Math.max(0, r.cell - 20);
    hurt(c, 28, 'the room that is an inside');
    if (r.outcome) return;
    room.lootBait = false;
    room.pile = 5;
  }
  const took = load(c, room.pile);
  room.pile -= took;
  say(c, took ? `Searched the pile: ${took} kg of alloy and filament.${room.pile ? ' The pack will not take the rest.' : ''}` : 'The pack is full. Not another kilo.', took ? 'good' : 'note');
  if (took && chance(c, 0.25)) {
    r.pack.readings++;
    say(c, 'A glyph plate under it. Took a reading.', 'good');
  }
  if (took && chance(c, 0.2)) {
    r.rounds += 3;
    say(c, 'Three rounds in an expedition pouch. Somebody else was here.', 'good');
  }
}

export type Choice = 'supplies' | 'stow' | 'take' | 'open' | 'reinforce' | 'tags';

export function feature(c: Campaign, choice: Choice | null = null): void {
  const r = run(c);
  const room = r.room!;
  if (!atFar(c)) return;
  const L = r.layer - 1;

  if (choice === 'tags' && room.body) {
    const b = room.body;
    r.pack.tags.push(b.name);
    r.pack.fragments += b.fragments;
    for (const id of b.relics) {
      c.relics[id].where = 'field';
      if (r.relic === null) {
        r.relic = id;
        r.relicCharges = 1;
      }
    }
    c.site.bodies = c.site.bodies.filter((x) => x !== b);
    room.body = null;
    say(c, `${b.name}. The ruin has had time with them. I took the tags${b.relics.length ? ', and what they were carrying' : ''}. Somebody should know.`, 'white');
    return;
  }

  switch (room.kind) {
    case 'glyphs': {
      if (room.done) return;
      room.done = true;
      const n = who(c).spec === 'Linguist' ? 4 : 2;
      r.pack.readings += n;
      say(c, `A wall of glyphs, floor to ceiling. ${n} readings taken.`, 'good');
      if (literacy(c) >= 1) {
        const lay = layout(c, r.layer);
        const names: Partial<Record<RoomKind, string>> = { cache: 'A LOCKER', relay: 'A RELAY', relic: 'KEEP', wonder: 'SEE', horror: 'DO NOT WAKE', sealed: 'STORES', oldcamp: 'OTHERS' };
        say(c, `I can read some of it now. Signs for the side passages on this level: ${lay.sides.map((s) => names[s.kind]).join(', ')}.`, 'white');
      }
      return;
    }
    case 'relay': {
      if (room.done || r.cell < TUNE.uplinkCell) return;
      room.done = true;
      r.cell -= TUNE.uplinkCell;
      addWake(c, 1);
      const n = r.pack.samples.reduce((s, x) => s + x, 0) + r.pack.readings;
      r.pack.samples.forEach((x, sp) => (c.stores.samples[sp] += x));
      r.pack.samples = r.pack.samples.map(() => 0);
      c.stores.readings += r.pack.readings;
      r.pack.readings = 0;
      say(c, `The relay hums for eight long seconds. ${n} samples and readings are at base now, whatever happens to me.`, 'good');
      return;
    }
    case 'cache': {
      const cache = (c.site.caches[r.layer] ??= { salvage: 0, supplies: true });
      if (choice === 'supplies' && cache.supplies) {
        cache.supplies = false;
        r.medkits++;
        r.rounds += 4;
        say(c, 'An expedition locker. A medkit and four rounds, left by someone who meant to come back.', 'good');
      }
      if (choice === 'stow' && r.pack.salvage > 0) {
        cache.salvage += r.pack.salvage;
        say(c, `Stowed ${r.pack.salvage} kg in the locker. It will be here next time, whoever comes.`, 'note');
        r.pack.salvage = 0;
      }
      if (choice === 'take' && cache.salvage > 0) {
        const took = load(c, cache.salvage);
        cache.salvage -= took;
        say(c, `Took ${took} kg out of the locker.`, 'note');
      }
      return;
    }
    case 'relic': {
      if (c.site.relicTaken[L]) return;
      c.site.relicTaken[L] = true;
      const deal = c.relicDeal[L];
      c.relics.push({ form: deal.form, fn: deal.fn, identified: false, progress: 0, where: 'field' });
      r.pack.fragments++;
      say(c, `White light. The only white light in the ruin, and it is coming from a ${deal.form} on a plinth. Beside it, a shard of something that is plainly part of a key.`, 'white');
      if (r.relic === null) {
        r.relic = c.relics.length - 1;
        r.relicCharges = 2 + (who(c).spec === 'Engineer' ? 1 : 0);
        say(c, 'I have no idea what it does. It fits the hand as if it has been waiting.', 'white');
      }
      return;
    }
    case 'sealed': {
      if (c.site.sealedOpened[L] || literacy(c) < 2) return;
      c.site.sealedOpened[L] = true;
      const took = load(c, 12);
      r.pack.relicCells++;
      r.medkits++;
      say(c, `The door reads STORES, and now it opens to a hand. ${took} kg of clean alloy, a relic cell, heavy and warm, and something I think is a Warden medkit.`, 'white');
      return;
    }
    case 'oldcamp': {
      if (c.site.oldCampFound || !c.prior) return;
      c.site.oldCampFound = true;
      const took = load(c, 8);
      r.medkits++;
      r.pack.readings++;
      const names = c.prior.dead.slice(0, 4).join(', ');
      say(c, `A camp. Ours. Expedition ${c.prior.n}: the same suits, the same lockers, ${c.prior.days} days of tally marks on the wall.${names ? ` A memorial scratched beside them: ${names}.` : ''} They followed the signal too. Nobody told us.`, 'white');
      say(c, `Took ${took} kg and a medkit from what they left. They would have wanted that. I think.`, 'note');
      return;
    }
    case 'vault': {
      if (choice === 'open' && c.fragments + r.pack.fragments >= 3) c.over = { kind: 'open', day: c.day };
      if (choice === 'reinforce' && literacy(c) >= 3) c.over = { kind: 'reinforce', day: c.day };
      return;
    }
    default:
  }
}

export function goOn(c: Campaign): void {
  const r = run(c);
  if (r.creature || r.outcome || r.side || (r.phase !== 'far' && r.phase !== 'entry') || r.pos >= 4) return;
  r.pos++;
  enterRoom(c, layout(c, r.layer).spine[r.pos]);
}

export function goSide(c: Campaign): void {
  const r = run(c);
  const s = sideHere(c);
  if (!atFar(c) || !s || !s.open || s.done) return;
  r.held = r.room;
  r.side = true;
  say(c, 'A side passage. Narrower. The air is different.', 'note');
  enterRoom(c, s.kind);
}

export function leaveSide(c: Campaign): void {
  const r = run(c);
  if (!atFar(c) || !r.side) return;
  r.doneSides.push(keyOf(r));
  r.side = false;
  r.room = r.held;
  r.held = null;
  r.phase = 'far';
}

export function forceHatch(c: Campaign): void {
  const r = run(c);
  if (!atFar(c) || r.side || r.room!.kind !== 'hatch') return;
  addWake(c, 2);
  r.layer++;
  r.pos = -1;
  r.room = null;
  r.phase = 'entry';
  r.wake = Math.ceil(r.wake / 2);
  c.site.deepest = Math.max(c.site.deepest, r.layer);
  say(c, `The hatch gives with a crack they will have heard everywhere. Down the ladder to ${LAYERS[r.layer]}. A lift beacon here too.`, 'note');
}

// ── the lift ────────────────────────────────────────────────────────────────

export function callLift(c: Campaign): void {
  const r = run(c);
  if (r.creature || r.outcome || r.side || (r.phase !== 'far' && r.phase !== 'entry')) return;
  r.liftBeats = r.pos + 2;
  r.phase = 'lift';
  addWake(c, 2, false);
  say(c, r.pos < 0 ? 'Called the lift. The winch starts to grind somewhere far above.' : `Back the way I came, ${r.pos + 1} room${r.pos ? 's' : ''} to the beacon, with the winch grinding all the way down and everything coming to look.`, 'note');
}

export function liftBeat(c: Campaign): void {
  const r = run(c);
  if (r.phase !== 'lift' || r.creature || r.outcome) return;
  if (r.liftBeats <= 0) {
    say(c, 'The cage. The gate. Up.', 'good');
    finish(c, 'extracted');
    return;
  }
  r.liftBeats--;
  if (r.sealedDoor) {
    say(c, 'The gummed door holds. Things are working at the other side of it.');
  } else if (chance(c, r.wake * 0.07)) {
    if (chance(c, 0.5)) creatureComes(c);
    else {
      say(c, 'Something I woke on the way in was waiting on the way out.', 'bad');
      hurt(c, range(c, 12, 20), 'growth on the way out');
    }
  } else {
    say(c, pick(c, ['The winch grinds. Nothing comes. Yet.', 'A room behind me, something falls over.', 'Counting seconds. Losing count.']));
  }
}

export function abandon(c: Campaign): void {
  const r = run(c);
  if (r.layer !== 1 || r.phase === 'lift' || r.creature || r.outcome) return;
  say(c, 'Dropped the pack and walked out the way I came in.', 'note');
  finish(c, 'abandoned');
}

// ── things carried ──────────────────────────────────────────────────────────

const free = (c: Campaign): boolean => !run(c).outcome && run(c).phase !== 'over';

export function useMedkit(c: Campaign): void {
  const r = run(c);
  if (!free(c) || r.medkits < 1 || r.hp >= TUNE.hp) return;
  r.medkits--;
  r.hp = Math.min(TUNE.hp, r.hp + (who(c).spec === 'Medic' ? 50 : 35));
  say(c, 'Medkit.', 'good');
}

export function useCell(c: Campaign): void {
  const r = run(c);
  if (!free(c) || r.spareCells < 1) return;
  r.spareCells--;
  r.cell = 100;
  say(c, 'Fresh cell. The beam comes back hard and cool.', 'good');
}

const clearRoom = (r: Run): void => r.room?.plants.forEach((p) => (p.gone = true));

export function useRelic(c: Campaign): void {
  const r = run(c);
  if (!free(c) || r.relic === null || r.relicCharges < 1) return;
  const rel = c.relics[r.relic];
  r.relicCharges--;
  rel.identified = true;
  say(c, `${RELICS[rel.fn].name}. ${RELICS[rel.fn].used}`, 'white');
  if (rel.fn === 'hush') {
    r.wake = 0;
    r.creature = false;
  }
  if (rel.fn === 'lattice') {
    clearRoom(r);
    c.strain += 1;
  }
  if (rel.fn === 'foretell') {
    for (const p of r.room?.plants ?? []) {
      if (!p.gone && !c.guide[p.sp].sense) {
        c.guide[p.sp].sense = true;
        say(c, `The ${speciesName(c, p.sp)} wakes to ${SENSE_TEXT[c.species[p.sp].sense]}.`, 'good');
      }
    }
  }
  if (rel.fn === 'tending') {
    r.hp = TUNE.hp;
    r.poison = 0;
    r.exposure += 20;
  }
  if (rel.fn === 'choir') {
    r.room?.plants.forEach((p) => (p.awake = false));
    r.creature = false;
  }
  if (rel.fn === 'memorywork') {
    clearRoom(r);
    r.creature = false;
    const known = c.guide.map((k, id) => ({ k, id })).filter((x) => x.k.sense || x.k.behaviour);
    if (known.length) {
      const lost = pick(c, known);
      lost.k.sense = lost.k.behaviour = lost.k.researched = false;
      lost.k.progress = 0;
      say(c, `The ${speciesName(c, lost.id)}. I know the name. I cannot remember one thing about it.`, 'bad');
    }
  }
  if (r.phase === 'door' && r.room && r.room.plants.every((p) => p.gone)) r.phase = 'far';
}

export function useGraft(c: Campaign, sp: number): void {
  const r = run(c);
  if (!free(c) || r.grafts[sp] < 1) return;
  r.grafts[sp]--;
  const b = c.species[sp].behaviour;
  say(c, `${BEHAVIOURS[b].graft.name}.`, 'good');
  if (b === 'spines') {
    if (r.creature) {
      r.creature = false;
      say(c, 'It came on, and trod on the fronds, and stopped coming.', 'good');
    } else r.caltrops = true;
  }
  if (b === 'snare') {
    r.sealedDoor = true;
    r.wake = Math.max(0, r.wake - 2);
  }
  if (b === 'spores') clearRoom(r);
  if (b === 'shriek') {
    r.wake = Math.max(0, r.wake - 4);
    r.creature = false;
    say(c, 'It screams down the other passage and the whole ruin turns its head that way.');
  }
  if (b === 'burst') {
    clearRoom(r);
    r.creature = false;
    addWake(c, 3, false);
  }
  if (b === 'mend') r.hp = Math.min(TUNE.hp, r.hp + 30);
  if (b === 'lantern') {
    r.cell = Math.min(100, r.cell + 40);
    if (r.stalked) say(c, 'The thing at the edge of the beam has gone. It does not like this light.', 'good');
    r.stalked = false;
  }
  if (b === 'leech') r.exposure -= 15;
  if (r.phase === 'door' && r.room && r.room.plants.every((p) => p.gone)) r.phase = 'far';
}

// ── the skulker ─────────────────────────────────────────────────────────────

export function fightBlade(c: Campaign): void {
  const r = run(c);
  if (!r.creature) return;
  r.creature = false;
  addWake(c, 1);
  say(c, 'It rushed. I had the machete up. It was close and it was ugly.');
  hurt(c, range(c, 18, 36) * (who(c).spec === 'Soldier' ? 0.5 : 1), 'a skulker');
}

export function fightGun(c: Campaign): void {
  const r = run(c);
  if (!r.creature || r.rounds < 2) return;
  r.rounds -= 2;
  r.creature = false;
  addWake(c, 3);
  say(c, 'Two shots. It drops. The noise does not.', 'bad');
  const n = int(c, 9);
  if (n > 3) hurt(c, n, 'a skulker');
}

export function hide(c: Campaign): void {
  const r = run(c);
  if (!r.creature) return;
  if (r.stalked) {
    say(c, 'Torch off. And the other thing moved.', 'bad');
    hurt(c, 35, 'the thing that moves when unlit');
    if (r.outcome) return;
  }
  if (chance(c, 0.7 - r.wake * 0.05 + (who(c).trait === 'Night owl' ? 0.2 : 0))) {
    r.creature = false;
    say(c, 'Torch off, not breathing. It came within a metre, listened, and went.', 'good');
  } else {
    say(c, 'It heard my heart, or the suit fan. It did not need to see.', 'bad');
    hurt(c, 25 * (who(c).spec === 'Soldier' ? 0.5 : 1), 'a skulker');
  }
}

/** Fight with the ecosystem: lead what hunts you through something you understand. */
export function canLure(c: Campaign, i: number): boolean {
  const r = run(c);
  const p = r.room?.plants[i];
  if (!r.creature || !p || p.gone) return false;
  const b = c.species[p.sp].behaviour;
  return c.guide[p.sp].behaviour && (b === 'spines' || b === 'snare' || b === 'burst' || b === 'spores');
}

export function lure(c: Campaign, i: number): void {
  const r = run(c);
  if (!canLure(c, i)) return;
  const p = r.room!.plants[i];
  r.creature = false;
  p.awake = true;
  say(c, `I put the ${speciesName(c, p.sp)} between us and let it come. The plant did the rest. Something will eat what is left.`, 'good');
  acts(c, p, 'creature');
}

// ── coming home, or not ─────────────────────────────────────────────────────

export function settle(c: Campaign): void {
  const r = run(c);
  if (!r.outcome) return;
  const p = who(c);
  const s = c.stores;
  const night: string[] = [];
  for (const key of Object.keys(c.site.cut)) if (--c.site.cut[key] <= 0) delete c.site.cut[key];
  for (const key of r.cuts) c.site.cut[key] = 2;
  c.site.deepest = Math.max(c.site.deepest, r.layer);

  if (r.outcome === 'dead') {
    p.status = 'dead';
    p.epitaph = `Lost in ${LAYERS[r.layer]}, day ${c.day}, to ${r.cause}.`;
    hopeShift(c, -12);
    const relics = c.relics.map((x, id) => ({ x, id })).filter((e) => e.x.where === 'field').map((e) => e.id);
    relics.forEach((id) => (c.relics[id].where = 'body'));
    c.site.bodies.push({ name: p.name, layer: r.layer, key: `${r.layer}:${Math.max(0, r.pos)}`, relics, fragments: r.pack.fragments });
    night.push(`${p.name} did not come back. ${p.epitaph} What the suit learned reached us. Nothing else did.`);
  } else {
    s.medkits += r.medkits;
    s.probes += r.probes;
    s.cells += r.spareCells;
    s.rounds += r.rounds;
    r.grafts.forEach((n, sp) => {
      if (c.guide[sp].researched) s.grafts[sp] += n;
    });
    for (const rel of c.relics) if (rel.where === 'field') rel.where = 'base';
    c.fragments += r.pack.fragments;
    p.runs++;
    p.wound = Math.min(4, Math.ceil((TUNE.hp - r.hp) / 25));
    p.exposure = Math.max(0, p.exposure + r.exposure);
    const first = p.name.split(' ')[0];
    if (r.outcome === 'extracted') {
      s.salvage += r.pack.salvage;
      s.relicCells += r.pack.relicCells;
      s.readings += r.pack.readings;
      r.pack.samples.forEach((n, sp) => (s.samples[sp] += n));
      hopeShift(c, 3);
      night.push(`${p.name} came up on the lift with ${r.pack.salvage} kg.`);
    } else {
      night.push(`${p.name} walked out with nothing but the belt kit. Alive, which is not nothing.`);
    }
    for (const id of r.pack.wonders) {
      c.wonders.push(id);
      hopeShift(c, 9);
      night.push(`${first} ${EVENTS.find((e) => e.id === id)!.told}`);
    }
    for (const name of r.pack.tags) {
      hopeShift(c, 4);
      night.push(`${first} brought ${name}'s tags home. They are on the wall with the others.`);
    }
  }
  c.run = null;
  if (!c.over) endDay(c, p.id, night);
}
