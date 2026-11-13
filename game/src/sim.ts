// The simulation: fixed-step, seeded, and blind to three.js. It mutates the
// World and queues Fx for the view and the audio to play.

import { BEHAVIOURS, BLADES, ENEMIES, GUNS, LORE, RELICS, T, THOUGHTS, TUNE } from './data';
import type { BehaviourId, EnemyId } from './data';
import { FLOOR, THICKET, WALL, centre, distances, generate, idx, los, moveCircle, randomFloor, rayWall, tileAt, tx } from './level';
import type { Room } from './level';
import { chance, fork, int, pick, range } from './rng';
import type { RngHost } from './rng';
import { has, rollItem, speciesName, starterGear } from './state';
import type { Campaign, Enemy, Input, Loot, LootKind, Plant, Player, Prop, PropKind, World, Zone, ZoneKind } from './state';

const dist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
const angDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const YELLOW = 0xf0bf2c, WHITE = 0xf3fbff, HARM = 0xd2523f;

// ── making a world ──────────────────────────────────────────────────────────

export function newPlayer(c: Campaign): Player {
  const suit = c.gear.suit;
  const maxHp = TUNE.player.hp + c.upgrades.plating * 20 + (has(suit, 'plated') ? 25 : 0);
  const maxCell = TUNE.player.cell + c.upgrades.cell * 25 + (has(suit, 'banked') ? 35 : 0);
  const maxDodges = 2 + (has(suit, 'sprung') ? 1 : 0);
  return {
    x: 0, z: 0, face: 0, vx: 0, vz: 0, hp: maxHp, maxHp, cell: maxCell, maxCell, torch: true,
    state: 'free', t: 0, combo: 0, comboT: 0, struck: false, buffer: false,
    dodges: maxDodges, maxDodges, dodgeT: 0, ddx: 0, ddz: 0, invuln: 0, downs: 0, fireCd: 0, snared: 0, slowStill: 0,
    medkits: 2 + c.upgrades.belt, maxMedkits: 2 + c.upgrades.belt, ammo: 24 + c.upgrades.holster * 12,
    grafts: c.species.map(() => 0), graftSel: 0, graftCap: TUNE.graftCap + c.upgrades.satchel,
    relicCharges: 2, salvage: 0, samples: 0, kills: 0, moving: 0, hurtT: 9, lowSaid: false,
  };
}

export function createWorld(camp: Campaign, depth: number, carry?: Player): World {
  const level = generate(camp.seed, depth);
  const rng = fork(camp.seed, 700 + depth, camp.day);
  const start = level.rooms[level.start];
  const player = carry ?? newPlayer(camp);
  player.x = start.cx; player.z = start.cz + 1.5; player.state = 'free'; player.relicCharges = 2;
  const w: World = {
    camp, level, depth, rng, time: 0, nextId: 1, player, enemies: [], plants: [], props: [], loot: [], projs: [], zones: [],
    fx: [], flow: new Int16Array(level.w * level.h), flowT: 0, explored: new Uint8Array(level.w * level.h), revealed: false,
    hitstop: 0, still: 0, prompt: null, near: null, hover: null, outcome: null, liftT: -1, said: {}, boss: null, cause: '',
    wave: -1, waveT: 32, waveX: level.rooms[level.hatch].cx, waveZ: level.rooms[level.hatch].cz, breaches: [],
  };
  populate(w);
  w.fx.push({ k: 'say', t: pick(rng, THOUGHTS.start) });
  return w;
}

function addProp(w: World, kind: PropKind, x: number, z: number, data = 0): Prop {
  const p: Prop = { id: w.nextId++, kind, x, z, r: kind === 'urn' ? 0.45 : kind === 'crate' ? 0.55 : 0.8, hp: 1, used: false, rot: range(w.rng, 0, 6.28), data };
  w.props.push(p);
  return p;
}

function free(w: World, x: number, z: number, gap: number): boolean {
  if (tileAt(w.level, x, z) !== FLOOR) return false;
  return !w.props.some((p) => dist(p.x, p.z, x, z) < gap + p.r) && !w.plants.some((p) => dist(p.x, p.z, x, z) < gap + p.r);
}

function spot(w: World, r: Room, gap: number, margin = 0): { x: number; z: number } | null {
  for (let i = 0; i < 14; i++) {
    const p = randomFloor(w.level, r, w.rng, margin);
    if (free(w, p.x, p.z, gap)) return p;
  }
  return null;
}

export function addPlant(w: World, sp: number, x: number, z: number): Plant {
  const scale = range(w.rng, 0.85, 1.25);
  const p: Plant = { id: w.nextId++, sp, x, z, r: 0.55 * scale, scale, rot: range(w.rng, 0, 6.28), hp: 26 * scale, mood: 'asleep', t: 0, lit: 0, calm: 0, cd: range(w.rng, 0, 1), fuse: -1, pool: 40, spawned: 0, dead: false, flash: 0, wind: range(w.rng, 0, 6.28), surge: 0 };
  w.plants.push(p);
  return p;
}

export function addEnemy(w: World, type: EnemyId, x: number, z: number, elite = false): Enemy {
  const d = ENEMIES[type];
  const tough = (1 + 0.2 * (w.depth - 1) + 0.12 * w.camp.pulse) * (elite ? 2.2 : 1);
  const e: Enemy = { id: w.nextId++, type, x, z, r: d.r * (elite ? 1.25 : 1), hp: d.hp * tough, maxHp: d.hp * tough, state: 'idle', t: 0, face: range(w.rng, 0, 6.28), vx: 0, vz: 0, alert: 0, homeX: x, homeZ: z, cd: range(w.rng, 0, 1.5), flash: 0, frozen: false, slow: 1, dead: false, deadT: 0, tx: x, tz: z, phase: 0, wander: range(w.rng, 0, 4), elite };
  w.enemies.push(e);
  return e;
}

function pack(w: World, r: Room, type: EnemyId, n: number, elite = false): void {
  for (let i = 0; i < n; i++) {
    const p = spot(w, r, 0.5);
    if (p) addEnemy(w, type, p.x, p.z, elite && i === 0);
  }
}

function populate(w: World): void {
  const { level: l, rng: h, depth, camp } = w;
  const start = l.rooms[l.start];
  addProp(w, 'lift', start.cx, start.cz - 1.5);
  const by = (b: BehaviourId): number => camp.species.findIndex((s) => s.behaviour === b);
  // Each layer grows five of the eight species, so there is always something not yet met further down.
  const local = fork(camp.seed, 40 + depth);
  const species = [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => camp.species[s].behaviour !== 'gall').sort(() => range(local, -1, 1)).slice(0, 4 + Math.min(depth, 3));

  if (depth === 4) {
    const arena = l.rooms[l.hatch];
    w.boss = addEnemy(w, 'tender', arena.cx + 6, arena.cz);
    addProp(w, 'door', arena.cx + 14.5, arena.cz);
    for (let i = 0; i < 8; i++) { const p = spot(w, arena, 1.2); if (p && dist(p.x, p.z, arena.cx, arena.cz) > 6) addPlant(w, pick(h, species), p.x, p.z); }
    for (let i = 0; i < 4; i++) { const p = spot(w, start, 0.8, 0); if (p && dist(p.x, p.z, w.player.x, w.player.z) > 2) addProp(w, 'crate', p.x, p.z); }
    return;
  }

  let glyph = false, tended = false;
  for (const r of l.rooms) {
    const area = r.w * r.h;
    if (r.kind === 'hatch') addProp(w, 'hatch', r.cx, r.cz);
    if (r.kind === 'relic') addProp(w, camp.relicTaken[depth - 1] ? 'chest' : 'plinth', r.cx, r.cz);
    if (r.kind === 'cache') { addProp(w, 'chest', r.cx, r.cz); for (let i = 0; i < 3; i++) { const p = spot(w, r, 0.7); if (p) addProp(w, 'crate', p.x, p.z); } }
    if (r.kind === 'start') { for (let i = 0; i < 2; i++) { const p = spot(w, r, 1, 0); if (p && dist(p.x, p.z, w.player.x, w.player.z) > 2.5) addProp(w, 'crate', p.x, p.z); } continue; }
    if (!glyph && (r.kind === 'hall' || r.kind === 'garden')) { glyph = true; addProp(w, 'glyph', (r.x + r.w / 2) * T, r.y * T + 0.3); }
    for (let i = 0, n = 1 + int(h, 3); i < n; i++) { const p = spot(w, r, 0.6); if (p) addProp(w, 'urn', p.x, p.z); }

    if (depth === 1 && w.breaches.length < 4 && r.kind !== 'relic' && chance(h, 0.45)) { const p = spot(w, r, 1.2, 1); if (p) w.breaches.push(p); }
    if (r.kind === 'garden' && !tended) {
      // The tended garden: rows, evenly spaced, and something still looking after them.
      tended = true;
      for (let gy = r.y + 1; gy < r.y + r.h - 1; gy += 2) for (let gx = r.x + 1; gx < r.x + r.w - 1; gx++) {
        const x = (gx + 0.5) * T, z = (gy + 0.5) * T;
        if (free(w, x, z, 0.7) && dist(x, z, r.cx, r.cz) > 1.5) addPlant(w, chance(h, 0.4) ? pick(h, [by('mend'), by('lantern')]) : pick(h, species), x, z);
      }
      addEnemy(w, 'warden', r.cx, r.cz);
      pack(w, r, 'grazer', 4);
      continue;
    }
    const plants = Math.floor(area / (r.kind === 'garden' ? 5 : 10)) + (depth > 1 ? 1 : 0);
    for (let i = 0; i < plants; i++) {
      const p = spot(w, r, 0.9);
      if (!p) continue;
      const boon = r.kind === 'garden' && chance(h, 0.35) ? pick(h, [by('mend'), by('lantern')]) : pick(h, species);
      addPlant(w, boon, p.x, p.z);
    }

    const big = depth >= 2 && chance(h, 0.2 + depth * 0.1);
    if (r.kind === 'nest') {
      for (let i = 0; i < 2; i++) { const p = spot(w, r, 1.2); if (p) addPlant(w, by('gall'), p.x, p.z); }
      pack(w, r, 'mite', 5 + depth);
    } else if (r.kind === 'relic') {
      pack(w, r, depth === 1 ? 'skulker' : 'husk', 1, true);
      pack(w, r, 'skulker', depth);
    } else if (r.kind === 'hatch') {
      pack(w, r, 'skulker', 1 + depth); if (depth > 1) pack(w, r, 'husk', 1); pack(w, r, 'spitter', depth - 1);
    } else if (r.kind === 'cache') {
      pack(w, r, 'spitter', 1 + (depth > 1 ? 1 : 0)); pack(w, r, 'mite', 3);
    } else {
      const roll = int(h, 4);
      if (roll === 0) pack(w, r, 'mite', 5 + depth * 2);
      else if (roll === 1) { pack(w, r, 'skulker', 1 + (depth > 1 ? 1 : 0)); if (depth > 1) pack(w, r, 'spitter', 1); }
      else if (roll === 2) { pack(w, r, 'skulker', 1); pack(w, r, 'mite', 3); }
      else if (roll === 3) pack(w, r, 'grazer', 3 + int(h, 4));
      if (big) pack(w, r, 'husk', 1);
    }
  }
  if (depth >= 2) {
    const far = l.rooms.filter((r) => r.far > 14 && r.kind !== 'start');
    for (let i = 0; i < depth - 1 && far.length; i++) { const r = pick(h, far); const p = spot(w, r, 0.5); if (p) addEnemy(w, 'unlit', p.x, p.z); }
  }
  const rooms = l.rooms.filter((r) => r.kind !== 'start');
  for (const f of camp.fallen.filter((b) => b.depth === depth)) {
    const p = spot(w, pick(h, rooms), 1);
    if (p) addProp(w, 'body', p.x, p.z, camp.fallen.indexOf(f));
  }
}

// ── knowledge, noise, harm ──────────────────────────────────────────────────

const seen = (w: World, x: number, z: number): boolean => dist(x, z, w.player.x, w.player.z) < 17 && los(w.level, x, z, w.player.x, w.player.z);

function sayOnce(w: World, key: keyof typeof THOUGHTS): void {
  if (w.said[key]) return;
  w.said[key] = true;
  w.fx.push({ k: 'say', t: pick(w.rng, THOUGHTS[key]) });
}

function wake(w: World, p: Plant, cause: 'light' | 'sound' | 'near' | 'hurt'): void {
  p.calm = 0;
  if (p.mood !== 'asleep' || p.dead) return;
  p.mood = 'stir';
  p.t = cause === 'hurt' ? TUNE.mood.stir * 0.6 : 0;
  w.fx.push({ k: 'sound', s: 'stir', x: p.x, z: p.z });
  const k = w.camp.guide[p.sp];
  if (cause !== 'hurt' && !k.sense && seen(w, p.x, p.z)) {
    k.sense = true;
    w.fx.push({ k: 'say', t: `${pick(w.rng, THOUGHTS.wake)} The ${speciesName(w.camp, p.sp)} wakes to ${cause === 'light' ? 'torchlight' : cause === 'sound' ? 'noise' : 'something close'}.`, tone: 'note' });
  }
}

function acted(w: World, p: Plant): void {
  const k = w.camp.guide[p.sp];
  if (k.behaviour || !seen(w, p.x, p.z)) return;
  k.behaviour = true;
  w.fx.push({ k: 'say', t: BEHAVIOURS[w.camp.species[p.sp].behaviour].first, tone: 'note' });
}

export function noise(w: World, x: number, z: number, radius: number, own = true): void {
  if (radius <= 0) return;
  if (own && radius >= 9) w.fx.push({ k: 'ring', x, z, r: radius, t: 0.5, c: YELLOW });
  for (const p of w.plants) if (!p.dead && w.camp.species[p.sp].sense === 'sound' && dist(p.x, p.z, x, z) < radius) wake(w, p, 'sound');
  for (const e of w.enemies) {
    if (e.dead || e.type === 'unlit' || e.type === 'warden' || dist(e.x, e.z, x, z) > radius * 1.15) continue;
    if (e.type === 'grazer') { e.alert = 3; e.tx = x; e.tz = z; continue; }
    e.alert = Math.max(e.alert, 5);
    if (e.state === 'idle') { e.state = 'chase'; e.tx = x; e.tz = z; }
  }
}

export function hurtPlayer(w: World, amount: number, cause: string, fx = 0, fz = 0): boolean {
  const p = w.player;
  if (p.invuln > 0 || p.state === 'dead' || w.outcome) return false;
  const n = Math.max(1, Math.round(amount * (1 + 0.15 * (w.depth - 1) + 0.1 * w.camp.pulse)));
  p.hp -= n; p.invuln = TUNE.player.hurtInvuln; p.hurtT = 0; w.cause = cause;
  w.fx.push({ k: 'hit', x: p.x, z: p.z, n, crit: false, who: 'player' }, { k: 'shake', n: 0.35 + n * 0.012 }, { k: 'sound', s: 'hurt', x: p.x, z: p.z });
  if (fx || fz) { const d = Math.hypot(p.x - fx, p.z - fz) || 1; p.vx += ((p.x - fx) / d) * 6; p.vz += ((p.z - fz) / d) * 6; }
  if (p.hp < p.maxHp * 0.3 && !p.lowSaid) { p.lowSaid = true; sayOnce(w, 'low'); }
  if (p.hp > 0) return true;
  if (p.downs < TUNE.downs) {
    p.downs++; p.hp = 35; p.invuln = 1.6;
    w.fx.push({ k: 'burst', x: p.x, z: p.z, r: 4.5, c: YELLOW }, { k: 'say', t: `Down. The suit stabiliser fires. That is ${p.downs} of ${TUNE.downs}.`, tone: 'bad' }, { k: 'sound', s: 'stabilise', x: p.x, z: p.z });
    for (const e of w.enemies) { const d = dist(e.x, e.z, p.x, p.z); if (!e.dead && d < 4.5) hurtEnemy(w, e, 8, (e.x - p.x) / (d || 1), (e.z - p.z) / (d || 1), 14); }
    return true;
  }
  p.hp = 0; p.state = 'dead'; w.outcome = 'dead';
  w.fx.push({ k: 'sound', s: 'death', x: p.x, z: p.z }, { k: 'shake', n: 1 });
  return true;
}

function anger(w: World, e: Enemy): void {
  if (e.phase === 1) return;
  e.phase = 1; e.state = 'chase'; e.alert = 999;
  w.fx.push({ k: 'sound', s: 'charge', x: e.x, z: e.z }, { k: 'ring', x: e.x, z: e.z, r: 3, t: 0.6, c: WHITE });
  sayOnce(w, 'angry');
}

function drop(w: World, kind: LootKind, x: number, z: number, n = 1, extra: Partial<Loot> = {}): void {
  const a = range(w.rng, 0, 6.28), s = range(w.rng, 2, 5);
  w.loot.push({ id: w.nextId++, kind, x, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, t: 0, n, item: null, relic: null, gone: false, ...extra });
}

function spill(w: World, x: number, z: number, rich: number): void {
  const h = w.rng;
  for (let i = 0, n = Math.round(rich * range(h, 1, 3)); i < n; i++) drop(w, 'salvage', x, z, 1 + int(h, 2 + w.depth));
  if (chance(h, 0.16 * rich)) drop(w, 'ammo', x, z, 6);
  if (chance(h, 0.07 * rich)) drop(w, 'medkit', x, z);
  if (chance(h, 0.05 * rich)) drop(w, 'cell', x, z, 40);
  if (chance(h, 0.11 * rich)) drop(w, 'item', x, z, 1, { item: rollItem(h, w.depth, rich > 1.5 ? 0.3 : 0) });
}

export function hurtEnemy(w: World, e: Enemy, amount: number, kx: number, kz: number, knock: number, crit = false): void {
  if (e.dead) return;
  e.hp -= amount; e.flash = 0.14; e.alert = Math.max(e.alert, 7);
  if (e.type === 'warden') anger(w, e);
  if (e.state === 'idle' && e.type !== 'grazer' && e.type !== 'warden') e.state = 'chase';
  w.fx.push({ k: 'hit', x: e.x, z: e.z, n: Math.round(amount), crit, who: 'enemy' });
  const d = ENEMIES[e.type];
  if (amount >= d.poise * (e.elite ? 1.6 : 1) && e.type !== 'tender') {
    e.vx += kx * knock; e.vz += kz * knock;
    if (e.state !== 'strike' || d.poise < 20) { e.state = 'stagger'; e.t = 0.24; }
  }
  if (e.hp > 0) return;
  e.dead = true; e.deadT = 0; w.player.kills++;
  w.fx.push({ k: 'gore', x: e.x, z: e.z, n: e.type === 'mite' ? 5 : 16 }, { k: 'sound', s: e.type === 'mite' ? 'pop' : 'kill', x: e.x, z: e.z });
  if (has(w.camp.gear.blade, 'leeching')) w.player.hp = Math.min(w.player.maxHp, w.player.hp + 3);
  if (e.type === 'grazer') { w.player.kills--; return; }
  if (e.type === 'warden') { drop(w, 'item', e.x, e.z, 1, { item: rollItem(w.rng, w.depth, 0.75) }); w.fx.push({ k: 'burst', x: e.x, z: e.z, r: 4, c: WHITE }); }
  if (e.type === 'mite') { if (chance(w.rng, 0.25)) drop(w, 'salvage', e.x, e.z, 1); }
  else spill(w, e.x, e.z, d.loot * (e.elite ? 3 : 1) + 0.6);
  if (e.elite || e.type === 'husk' || e.type === 'unlit') drop(w, 'item', e.x, e.z, 1, { item: rollItem(w.rng, w.depth, e.elite ? 0.35 : 0.1) });
  if (e.type === 'tender') {
    w.fx.push({ k: 'burst', x: e.x, z: e.z, r: 9, c: WHITE }, { k: 'shake', n: 1.2 }, { k: 'say', t: 'It folds up like a hand closing. The door behind it is unguarded.', tone: 'white' });
    for (let i = 0; i < 3; i++) drop(w, 'item', e.x, e.z, 1, { item: rollItem(w.rng, 4, 0.6) });
  }
}

function killPlant(w: World, p: Plant, drops: boolean): void {
  if (p.dead) return;
  p.dead = true;
  const s = w.camp.species[p.sp];
  w.fx.push({ k: 'leaves', x: p.x, z: p.z, c: s.hue, n: 22 }, { k: 'sound', s: 'cutdown', x: p.x, z: p.z });
  if (s.behaviour === 'burst' && p.fuse !== -2) { acted(w, p); explode(w, p.x, p.z, 3.4, 30, 55, s.glow); }
  if (!drops) return;
  const k = w.camp.guide[p.sp];
  const graft = BEHAVIOURS[s.behaviour].graft;
  // You can only take a working piece from something you understand.
  if (k.behaviour && graft && chance(w.rng, 0.7)) drop(w, 'graft', p.x, p.z, p.sp);
  else if (!k.behaviour) drop(w, 'sample', p.x, p.z, p.sp);
}

export function hurtPlant(w: World, p: Plant, amount: number): void {
  if (p.dead) return;
  p.hp -= amount; p.flash = 0.14;
  w.fx.push({ k: 'leaves', x: p.x, z: p.z, c: w.camp.species[p.sp].hue, n: 5 }, { k: 'hit', x: p.x, z: p.z, n: Math.round(amount), crit: false, who: 'plant' });
  wake(w, p, 'hurt');
  for (const e of w.enemies) if (e.type === 'warden' && !e.dead && dist(e.x, e.z, p.x, p.z) < 16) anger(w, e);
  if (p.hp <= 0) killPlant(w, p, true);
}

function breakProp(w: World, p: Prop): void {
  if (p.used || (p.kind !== 'urn' && p.kind !== 'crate')) return;
  p.used = true;
  w.fx.push({ k: 'spark', x: p.x, z: p.z, c: p.kind === 'urn' ? 0x9aa6aa : 0xb89a50, n: 14 }, { k: 'sound', s: 'smash', x: p.x, z: p.z });
  noise(w, p.x, p.z, TUNE.noise.urn, false);
  if (p.kind === 'crate') { drop(w, 'ammo', p.x, p.z, 6); if (chance(w.rng, 0.4)) drop(w, 'medkit', p.x, p.z); if (chance(w.rng, 0.3)) drop(w, 'cell', p.x, p.z, 40); drop(w, 'salvage', p.x, p.z, 2); }
  else spill(w, p.x, p.z, 1.1);
}

export function explode(w: World, x: number, z: number, r: number, dmgPlayer: number, dmgEnemy: number, glow: number): void {
  w.fx.push({ k: 'burst', x, z, r, c: glow }, { k: 'shake', n: 0.7 }, { k: 'sound', s: 'boom', x, z });
  const p = w.player;
  if (dmgPlayer > 0 && dist(p.x, p.z, x, z) < r + 0.3 && los(w.level, x, z, p.x, p.z)) hurtPlayer(w, dmgPlayer, 'a blast', x, z);
  for (const e of w.enemies) { const d = dist(e.x, e.z, x, z); if (!e.dead && d < r + e.r) hurtEnemy(w, e, dmgEnemy, (e.x - x) / (d || 1), (e.z - z) / (d || 1), 12); }
  for (const q of w.plants) if (!q.dead && dist(q.x, q.z, x, z) < r && (q.x !== x || q.z !== z)) hurtPlant(w, q, 30);
  for (const q of w.props) if (dist(q.x, q.z, x, z) < r) breakProp(w, q);
  clearThickets(w, x, z, r);
  noise(w, x, z, 16, false);
}

function clearThickets(w: World, x: number, z: number, r: number): number {
  let n = 0;
  const l = w.level;
  for (let b = tx(z - r); b <= tx(z + r); b++) for (let a = tx(x - r); a <= tx(x + r); a++) {
    if (a < 0 || b < 0 || a >= l.w || b >= l.h || l.tiles[idx(l, a, b)] !== THICKET) continue;
    const px = Math.max(a * T, Math.min(x, (a + 1) * T)), pz = Math.max(b * T, Math.min(z, (b + 1) * T));
    if (dist(px, pz, x, z) > r) continue;
    l.tiles[idx(l, a, b)] = FLOOR; n++;
    w.fx.push({ k: 'thicket', tx: a, ty: b }, { k: 'leaves', x: centre(a), z: centre(b), c: 130, n: 26 });
  }
  return n;
}

function zone(w: World, kind: ZoneKind, x: number, z: number, r: number, life: number): Zone {
  const zn: Zone = { id: w.nextId++, kind, x, z, r, life, max: life, gone: false, tick: 0 };
  w.zones.push(zn);
  return zn;
}

/** Torchlight, a flare, or a sleeping lantern plant. */
function lit(w: World, x: number, z: number): boolean {
  const p = w.player;
  if (p.torch && p.state !== 'dead') {
    const d = dist(x, z, p.x, p.z);
    if (d < TUNE.torch.range && d > 0.01) {
      const c = ((x - p.x) * Math.cos(p.face) + (z - p.z) * Math.sin(p.face)) / d;
      if ((c > TUNE.torch.cos || d < 1.6) && los(w.level, p.x, p.z, x, z)) return true;
    }
  }
  for (const zn of w.zones) if (zn.kind === 'flare' && dist(x, z, zn.x, zn.z) < zn.r) return true;
  return false;
}

// ── the player ──────────────────────────────────────────────────────────────

function strike(w: World): void {
  const p = w.player, blade = w.camp.gear.blade, b = BLADES[blade.base];
  const heavy = p.combo === 2;
  const reach = b.reach + (has(blade, 'long') ? 0.5 : 0) + (heavy ? 0.3 : 0);
  const half = ((b.arc + (heavy ? 30 : 0)) * Math.PI) / 360;
  const base = b.dmg * (has(blade, 'keen') ? 1.25 : 1) * (heavy ? 1.75 : 1);
  const knock = b.knock * (has(blade, 'heavy') ? 2 : 1) * (heavy ? 1.8 : 1);
  const cx = Math.cos(p.face), cz = Math.sin(p.face);
  const inArc = (x: number, z: number, r: number): boolean => {
    const d = dist(x, z, p.x, p.z);
    return d < reach + r && (d < r + 0.6 || Math.abs(angDiff(Math.atan2(z - p.z, x - p.x), p.face)) < half);
  };
  let hits = 0;
  for (const e of w.enemies) {
    if (e.dead || !inArc(e.x, e.z, e.r) || !los(w.level, p.x, p.z, e.x, e.z)) continue;
    const crit = chance(w.rng, 0.12);
    hurtEnemy(w, e, base * range(w.rng, 0.9, 1.1) * (crit ? 1.8 : 1) * (has(blade, 'heavy') ? 1 : 1), cx, cz, knock, crit);
    hits++;
  }
  for (const q of w.plants) if (!q.dead && inArc(q.x, q.z, q.r)) { hurtPlant(w, q, base * (has(blade, 'sundering') ? 2 : 1)); hits++; }
  for (const q of w.props) if (!q.used && (q.kind === 'urn' || q.kind === 'crate') && inArc(q.x, q.z, q.r)) { breakProp(w, q); hits++; }
  for (const a of [-half * 0.7, 0, half * 0.7]) for (const d of [reach * 0.55, reach]) {
    hits += clearThickets(w, p.x + Math.cos(p.face + a) * d, p.z + Math.sin(p.face + a) * d, 0.5);
  }
  const quiet = has(blade, 'quiet') ? 0.4 : 1;
  w.fx.push({ k: 'slash', x: p.x, z: p.z, a: p.face, reach, arc: half * 2, heavy }, { k: 'sound', s: heavy ? 'swingHeavy' : 'swing', x: p.x, z: p.z });
  if (hits) {
    w.hitstop = heavy ? 0.085 : 0.05;
    w.fx.push({ k: 'shake', n: heavy ? 0.5 : 0.22 }, { k: 'sound', s: 'thunk', x: p.x, z: p.z });
    noise(w, p.x, p.z, TUNE.noise.hit * quiet, false);
  } else noise(w, p.x, p.z, TUNE.noise.swing * quiet, false);
}

function fire(w: World): void {
  const p = w.player, gun = w.camp.gear.gun, g = GUNS[gun.base];
  if (p.ammo < g.use) { w.fx.push({ k: 'sound', s: 'click', x: p.x, z: p.z }); p.fireCd = 0.3; return; }
  if (!(has(gun, 'frugal') && chance(w.rng, 0.25))) p.ammo -= g.use;
  p.fireCd = g.rate / (has(gun, 'rapid') ? 1.25 : 1);
  const dmg = g.dmg * (has(gun, 'keen') ? 1.25 : 1);
  for (let i = 0; i < g.pellets; i++) {
    const a = p.face + range(w.rng, -g.spread, g.spread);
    const dx = Math.cos(a), dz = Math.sin(a);
    const max = rayWall(w.level, p.x, p.z, dx, dz, g.range);
    const along = (x: number, z: number, r: number): number => {
      const t = (x - p.x) * dx + (z - p.z) * dz;
      return t > 0 && t < max && Math.abs((x - p.x) * dz - (z - p.z) * dx) < r + 0.12 ? t : -1;
    };
    const targets: { t: number; hit: () => void }[] = [];
    for (const e of w.enemies) { const t = e.dead ? -1 : along(e.x, e.z, e.r); if (t > 0) targets.push({ t, hit: () => hurtEnemy(w, e, dmg * range(w.rng, 0.9, 1.1), dx, dz, 5) }); }
    for (const q of w.plants) { const t = q.dead ? -1 : along(q.x, q.z, q.r * 0.8); if (t > 0) targets.push({ t, hit: () => hurtPlant(w, q, dmg) }); }
    for (const q of w.props) { const t = q.used || (q.kind !== 'urn' && q.kind !== 'crate') ? -1 : along(q.x, q.z, q.r); if (t > 0) targets.push({ t, hit: () => breakProp(w, q) }); }
    targets.sort((a2, b2) => a2.t - b2.t);
    const through = 1 + (has(gun, 'piercing') ? 1 : 0);
    targets.slice(0, through).forEach((t) => t.hit());
    const end = targets.length >= through ? targets[through - 1].t : max;
    w.fx.push({ k: 'shot', x: p.x + dx * 0.7, z: p.z + dz * 0.7, x2: p.x + dx * end, z2: p.z + dz * end });
  }
  w.fx.push({ k: 'sound', s: g.pellets > 1 ? 'shotgun' : 'shot', x: p.x, z: p.z }, { k: 'shake', n: g.pellets > 1 ? 0.45 : 0.18 });
  noise(w, p.x, p.z, g.noise * (has(gun, 'quiet') ? 0.4 : 1));
}

function throwGraft(w: World, input: Input): void {
  const p = w.player;
  const sp = p.graftSel;
  if (!(p.grafts[sp] > 0)) return;
  p.grafts[sp]--;
  const b = w.camp.species[sp].behaviour;
  const a = Math.atan2(input.aimZ - p.z, input.aimX - p.x);
  const d = Math.min(dist(input.aimX, input.aimZ, p.x, p.z), 10, rayWall(w.level, p.x, p.z, Math.cos(a), Math.sin(a), 10) - 0.5);
  const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
  const glow = w.camp.species[sp].glow;
  w.fx.push({ k: 'sound', s: 'throw', x: p.x, z: p.z }, { k: 'spark', x, z, c: glow, n: 10 });
  if (b === 'mend') { p.hp = Math.min(p.maxHp, p.hp + 35); w.fx.push({ k: 'spark', x: p.x, z: p.z, c: glow, n: 16 }); }
  if (b === 'burst') explode(w, x, z, 3.6, 30, 60, glow);
  if (b === 'spores') zone(w, 'friendcloud', x, z, 2.8, 7);
  if (b === 'snare') zone(w, 'gum', x, z, 2.8, 9);
  if (b === 'spines') zone(w, 'caltrop', x, z, 2.4, 11);
  if (b === 'shriek') { zone(w, 'decoy', x, z, 1, 7); w.fx.push({ k: 'sound', s: 'shriek', x, z }); }
  if (b === 'lantern') zone(w, 'flare', x, z, 7, 14);
  nextGraft(w, 0);
}

function nextGraft(w: World, dir: number): void {
  const p = w.player, n = p.grafts.length;
  if (dir === 0 && p.grafts[p.graftSel] > 0) return;
  for (let i = 1; i <= n; i++) {
    const j = (p.graftSel + (dir < 0 ? -i : i) + n * 2) % n;
    if (p.grafts[j] > 0) { p.graftSel = j; return; }
  }
}

function useRelic(w: World): void {
  const p = w.player, rel = w.camp.gear.relic;
  if (!rel || p.relicCharges < 1) return;
  p.relicCharges--;
  const first = !rel.known;
  rel.known = true;
  w.fx.push({ k: 'burst', x: p.x, z: p.z, r: 6, c: WHITE }, { k: 'sound', s: 'relic', x: p.x, z: p.z }, { k: 'shake', n: 0.5 }, { k: 'say', t: `${first ? `${RELICS[rel.fn].name}. ` : ''}${RELICS[rel.fn].used}`, tone: 'white' });
  if (rel.fn === 'hush') { for (const e of w.enemies) if (e.type !== 'tender') { e.alert = 0; e.state = 'idle'; } for (const q of w.plants) if (q.mood !== 'asleep' && q.fuse < 0) q.mood = 'asleep'; }
  if (rel.fn === 'lattice') {
    for (const q of w.plants) if (dist(q.x, q.z, p.x, p.z) < 9) { q.fuse = -2; killPlant(w, q, false); }
    for (const e of w.enemies) { const d = dist(e.x, e.z, p.x, p.z); if (d < 9) hurtEnemy(w, e, 60, (e.x - p.x) / (d || 1), (e.z - p.z) / (d || 1), 10); }
    clearThickets(w, p.x, p.z, 9);
    w.camp.pulse += 0.5; // the cost: something below takes note
  }
  if (rel.fn === 'still') w.still = 5;
  if (rel.fn === 'tending') { p.hp = p.maxHp; p.invuln = 1.2; }
  if (rel.fn === 'choir') for (const e of w.enemies) if (!e.dead && dist(e.x, e.z, p.x, p.z) < 22) { e.state = 'stagger'; e.t = e.type === 'tender' ? 2 : 4.5; }
  if (rel.fn === 'memorywork') {
    for (const q of w.plants) if (dist(q.x, q.z, p.x, p.z) < 14) { q.fuse = -2; killPlant(w, q, false); }
    for (const e of w.enemies) if (dist(e.x, e.z, p.x, p.z) < 14) hurtEnemy(w, e, e.type === 'tender' ? 160 : 500, 0, 0, 0);
    const known = w.camp.guide.map((k, id) => ({ k, id })).filter((x) => x.k.sense || x.k.behaviour);
    if (known.length) { const lost = pick(w.rng, known); lost.k.sense = lost.k.behaviour = false; lost.k.samples = 0; w.fx.push({ k: 'say', t: `The ${speciesName(w.camp, lost.id)}. I know the name. I cannot remember one thing about it.`, tone: 'bad' }); }
  }
}

function collect(w: World, l: Loot): void {
  const p = w.player;
  let ok = true;
  if (l.kind === 'salvage') p.salvage += l.n;
  else if (l.kind === 'ammo') p.ammo += l.n;
  else if (l.kind === 'cell') p.cell = Math.min(p.maxCell, p.cell + l.n);
  else if (l.kind === 'medkit') { if (p.medkits < p.maxMedkits) p.medkits++; else ok = false; }
  else if (l.kind === 'graft') { if (p.grafts[l.n] < p.graftCap) { p.grafts[l.n]++; nextGraft(w, 0); } else ok = false; }
  else if (l.kind === 'sample') {
    const k = w.camp.guide[l.n];
    p.samples++; k.samples++;
    if (k.samples >= 2 && !k.behaviour) { k.sense = k.behaviour = true; w.fx.push({ k: 'say', t: `Two samples of the ${speciesName(w.camp, l.n)}, and the suit has it worked out. ${BEHAVIOURS[w.camp.species[l.n].behaviour].does}`, tone: 'note' }); }
  }
  if (!ok) return;
  l.gone = true;
  w.fx.push({ k: 'sound', s: l.kind === 'salvage' ? 'coin' : 'pickup', x: l.x, z: l.z });
}

function interact(w: World, press: boolean): void {
  const p = w.player;
  w.prompt = null; w.near = null;
  let best = 2.3;
  for (const l of w.loot) {
    if (l.gone || (l.kind !== 'item' && l.kind !== 'relic')) continue;
    const d = dist(l.x, l.z, p.x, p.z);
    if (d < best) { best = d; w.near = l; w.prompt = l.kind === 'relic' ? 'Take it' : 'Swap'; }
  }
  for (const q of w.props) {
    const d = dist(q.x, q.z, p.x, p.z) - q.r;
    if (d > best || q.kind === 'urn' || q.kind === 'crate') continue;
    const text =
      q.kind === 'lift' ? (w.liftT >= 0 ? null : 'Call the lift')
      : q.kind === 'hatch' ? 'Force the hatch (loud)'
      : q.kind === 'chest' && !q.used ? 'Open the locker'
      : q.kind === 'plinth' && !q.used ? 'Take the white light'
      : q.kind === 'body' && !q.used ? `Recover ${w.camp.fallen[q.data]?.name ?? 'them'}`
      : q.kind === 'glyph' && !q.used ? 'Read the wall'
      : q.kind === 'door' && w.boss?.dead ? 'The Vault' : null;
    if (text) { best = d; w.near = q; w.prompt = text; }
  }
  if (!press || !w.near) return;
  const n = w.near;
  if ('vx' in n) {
    if (n.kind === 'relic' && n.relic) {
      if (w.camp.gear.relic) drop(w, 'relic', p.x, p.z, 1, { relic: w.camp.gear.relic });
      w.camp.gear.relic = n.relic; n.gone = true; p.relicCharges = Math.max(p.relicCharges, 2);
      w.fx.push({ k: 'sound', s: 'relic', x: p.x, z: p.z }, { k: 'say', t: n.relic.known ? RELICS[n.relic.fn].name : `A ${n.relic.form}. I have no idea what it does. It fits the hand as if it has been waiting.`, tone: 'white' });
    } else if (n.item) {
      const old = w.camp.gear[n.item.slot];
      w.camp.gear[n.item.slot] = n.item; n.gone = true;
      drop(w, 'item', p.x, p.z, 1, { item: old });
      w.fx.push({ k: 'sound', s: 'equip', x: p.x, z: p.z });
      if (n.item.slot === 'suit') refit(w);
    }
    return;
  }
  if (n.kind === 'lift') { w.liftT = 7; w.fx.push({ k: 'say', t: 'The winch starts to grind. Everything that hears it is coming to look.', tone: 'note' }); }
  if (n.kind === 'hatch') { noise(w, n.x, n.z, 22); w.fx.push({ k: 'sound', s: 'hatch', x: n.x, z: n.z }); w.outcome = 'descend'; }
  if (n.kind === 'chest') { n.used = true; w.fx.push({ k: 'sound', s: 'equip', x: n.x, z: n.z }); drop(w, 'item', n.x, n.z, 1, { item: rollItem(w.rng, w.depth, 0.25) }); drop(w, 'medkit', n.x, n.z); spill(w, n.x, n.z, 2); }
  if (n.kind === 'plinth') {
    n.used = true; w.camp.relicTaken[w.depth - 1] = true;
    const deal = w.camp.relicDeal[w.depth - 1];
    drop(w, 'relic', n.x, n.z + 1.2, 1, { relic: { form: deal.form, fn: deal.fn, known: false }, vx: 0, vz: 0 });
    w.fx.push({ k: 'burst', x: n.x, z: n.z, r: 5, c: WHITE }, { k: 'sound', s: 'relic', x: n.x, z: n.z });
    noise(w, n.x, n.z, 20, false);
  }
  if (n.kind === 'body') {
    n.used = true;
    const f = w.camp.fallen[n.data];
    if (f) {
      for (const it of [f.gear.blade, f.gear.gun, f.gear.suit]) if (it.rarity > 1 || it.affixes.length) drop(w, 'item', n.x, n.z, 1, { item: it });
      if (f.gear.relic) drop(w, 'relic', n.x, n.z, 1, { relic: f.gear.relic });
      f.depth = -1;
      w.fx.push({ k: 'say', t: `${f.name}. The ruin has had time with them. I took the tags. Somebody should know.`, tone: 'white' });
    }
  }
  if (n.kind === 'glyph') {
    n.used = true; w.revealed = true;
    const line = LORE[Math.min(w.camp.lore, LORE.length - 1)];
    w.camp.lore++;
    w.fx.push({ k: 'say', t: `${line} And a plan of this level, cut into the stone.`, tone: 'white' }, { k: 'sound', s: 'relic', x: n.x, z: n.z });
  }
  if (n.kind === 'door') w.outcome = 'won';
}

/** New suit, new limits. */
function refit(w: World): void {
  const p = w.player, fresh = newPlayer(w.camp);
  p.maxHp = fresh.maxHp; p.hp = Math.min(p.hp, p.maxHp);
  p.maxCell = fresh.maxCell; p.cell = Math.min(p.cell, p.maxCell);
  p.maxDodges = fresh.maxDodges; p.dodges = Math.min(p.dodges, p.maxDodges);
}

function stepPlayer(w: World, input: Input, dt: number): void {
  const p = w.player, P = TUNE.player;
  if (p.state === 'dead') return;
  p.invuln -= dt; p.fireCd -= dt; p.snared -= dt; p.hurtT += dt; p.comboT -= dt;
  if (p.comboT < 0 && p.state === 'free') p.combo = 0;
  p.face = Math.atan2(input.aimZ - p.z, input.aimX - p.x);
  if (p.dodges < p.maxDodges) { p.dodgeT += dt; if (p.dodgeT > P.dodgeRegen) { p.dodgeT = 0; p.dodges++; } }

  if (input.torch) {
    if (p.torch) p.torch = false;
    else if (p.cell > TUNE.torch.relight) p.torch = true;
    w.fx.push({ k: 'sound', s: 'click', x: p.x, z: p.z });
  }
  if (p.torch) { p.cell -= TUNE.torch.drain * dt; if (p.cell <= 0) { p.cell = 0; p.torch = false; sayOnce(w, 'dark'); } }
  else p.cell = Math.min(p.maxCell, p.cell + TUNE.torch.recharge * dt);

  if (input.medkit && p.medkits > 0 && p.hp < p.maxHp) { p.medkits--; p.hp = Math.min(p.maxHp, p.hp + TUNE.medkit); w.fx.push({ k: 'sound', s: 'medkit', x: p.x, z: p.z }, { k: 'spark', x: p.x, z: p.z, c: YELLOW, n: 12 }); }
  if (input.cycle) nextGraft(w, input.cycle);
  if (input.graft) throwGraft(w, input);
  if (input.relic) useRelic(w);

  const grounded = has(w.camp.gear.suit, 'grounded');
  const ml = Math.hypot(input.mx, input.mz);
  if (input.dodge && p.dodges > 0 && p.state !== 'dodge') {
    p.state = 'dodge'; p.t = 0; p.dodges--; p.invuln = Math.max(p.invuln, P.dodgeInvuln); p.snared = 0;
    p.ddx = ml > 0.1 ? input.mx / ml : Math.cos(p.face); p.ddz = ml > 0.1 ? input.mz / ml : Math.sin(p.face);
    w.fx.push({ k: 'sound', s: 'dodge', x: p.x, z: p.z });
    noise(w, p.x, p.z, TUNE.noise.dodge, false);
  }

  let speed = P.speed * (has(w.camp.gear.suit, 'servo') ? 1.1 : 1) * (p.snared > 0 && !grounded ? 0.18 : 1);
  if (p.state === 'dodge') {
    p.t += dt;
    moveCircle(w.level, p, p.ddx * P.dodgeSpeed * dt, p.ddz * P.dodgeSpeed * dt, P.r, false);
    if (p.t > P.dodgeTime) p.state = 'free';
  } else {
    if (p.state === 'swing') {
      const sp = BLADES[w.camp.gear.blade.base].speed * (has(w.camp.gear.blade, 'swift') ? 1.22 : 1);
      const heavy = p.combo === 2;
      p.t += dt * sp;
      if (input.attack && p.t > 0.12) p.buffer = true;
      speed *= 0.35;
      if (p.t < 0.16) moveCircle(w.level, p, Math.cos(p.face) * 5 * dt, Math.sin(p.face) * 5 * dt, P.r, false);
      if (!p.struck && p.t > (heavy ? 0.2 : 0.11)) { p.struck = true; strike(w); }
      if (p.t > (heavy ? 0.52 : 0.34)) {
        p.state = 'free'; p.comboT = 0.45; p.combo = (p.combo + 1) % 3;
        if (p.buffer) { p.state = 'swing'; p.t = 0; p.struck = false; p.buffer = false; }
      }
    } else if (input.attack) { p.state = 'swing'; p.t = 0; p.struck = false; p.buffer = false; }
    else if (input.fire && p.fireCd <= 0) fire(w);
    if (ml > 0.1) moveCircle(w.level, p, (input.mx / ml) * speed * dt, (input.mz / ml) * speed * dt, P.r, false);
    p.moving = ml > 0.1 ? p.moving + dt * speed : 0;
  }
  // knockback
  if (Math.abs(p.vx) + Math.abs(p.vz) > 0.05) { moveCircle(w.level, p, p.vx * dt, p.vz * dt, P.r, false); p.vx *= 1 - Math.min(1, 9 * dt); p.vz *= 1 - Math.min(1, 9 * dt); }
  // pushing against growth
  if (ml > 0.1 && tileAt(w.level, p.x + (input.mx / ml) * 0.9, p.z + (input.mz / ml) * 0.9) === THICKET) sayOnce(w, 'thicket');

  for (const l of w.loot) {
    if (l.gone || l.kind === 'item' || l.kind === 'relic' || l.t < 0.35) continue;
    const d = dist(l.x, l.z, p.x, p.z);
    if (d < 0.7) collect(w, l);
    else if (d < (l.kind === 'salvage' ? 4 : TUNE.pickup + 1)) { l.x += ((p.x - l.x) / d) * 9 * dt; l.z += ((p.z - l.z) / d) * 9 * dt; }
  }
  interact(w, input.interact);

  if (w.liftT >= 0) {
    const lift = w.props.find((q) => q.kind === 'lift')!;
    if (dist(lift.x, lift.z, p.x, p.z) > 5) { w.liftT = -1; w.fx.push({ k: 'say', t: 'Too far from the beacon. The winch stops.', tone: 'note' }); }
    else {
      const before = Math.floor(w.liftT / 1.75);
      w.liftT -= dt;
      if (Math.floor(w.liftT / 1.75) !== before) { noise(w, lift.x, lift.z, 24); w.fx.push({ k: 'sound', s: 'winch', x: lift.x, z: lift.z }); }
      if (w.liftT <= 0) w.outcome = 'extracted';
    }
  }
}

// ── plants ──────────────────────────────────────────────────────────────────

function stepPlants(w: World, dt: number): void {
  const pl = w.player, alive = pl.state !== 'dead';
  const grazers = w.enemies.filter((e) => e.type === 'grazer' && !e.dead);
  for (const p of w.plants) {
    if (p.dead) continue;
    p.flash -= dt; p.cd -= dt;
    const s = w.camp.species[p.sp], b = s.behaviour;
    const dp = dist(p.x, p.z, pl.x, pl.z);
    if (dp > 34) continue;
    let stim = false;
    p.surge = Math.max(0, p.surge - dt * 1.6);
    if (w.wave >= 0 && Math.abs(dist(p.x, p.z, w.waveX, w.waveZ) - w.wave) < 2.5) p.surge = 1;
    if (s.sense === 'near' && alive && dp < 2.7) { stim = true; wake(w, p, 'near'); }
    // The ruin does not wait for you: anything feeding too close wakes it as well.
    if (s.sense === 'near' && p.mood === 'asleep' && grazers.some((e) => dist(e.x, e.z, p.x, p.z) < 1.5)) wake(w, p, 'near');
    if (s.sense === 'light') {
      if (dp < TUNE.torch.range + 8 && lit(w, p.x, p.z)) { p.lit += dt; stim = true; if (p.lit > TUNE.light.wake) wake(w, p, 'light'); }
      else p.lit = Math.max(0, p.lit - dt);
    }
    if (p.mood === 'stir') {
      p.t += dt;
      if (p.t >= TUNE.mood.stir) {
        p.mood = 'awake'; p.t = 0; p.calm = 0;
        if (b === 'shriek') p.cd = 0;
        if (b === 'burst') p.fuse = 1.15;
        if (b === 'gall') { p.cd = 0; p.t = 0; }
      }
      continue;
    }
    if (p.mood === 'asleep') {
      if (b === 'mend' && alive && dp < 2.6 && p.pool > 0 && pl.hp < pl.maxHp) { const n = 5 * dt; pl.hp = Math.min(pl.maxHp, pl.hp + n); p.pool -= n; acted(w, p); if (chance(w.rng, dt * 5)) w.fx.push({ k: 'spark', x: pl.x, z: pl.z, c: s.glow, n: 1 }); }
      if (b === 'lantern' && alive && dp < 2.8 && pl.cell < pl.maxCell) { pl.cell = Math.min(pl.maxCell, pl.cell + 7 * dt); acted(w, p); }
      continue;
    }
    // awake
    if (stim) p.calm = 0; else p.calm += dt;
    if (p.calm > TUNE.mood.settle && p.fuse < 0) { p.mood = 'asleep'; p.lit = 0; continue; }
    if (b === 'burst' && p.fuse > 0) { p.fuse -= dt; if (p.fuse <= 0) { acted(w, p); p.fuse = -2; p.dead = true; explode(w, p.x, p.z, 3.4, 30, 55, s.glow); w.fx.push({ k: 'leaves', x: p.x, z: p.z, c: s.hue, n: 20 }); } }
    if (b === 'shriek' && p.cd <= 0) { p.cd = 5.5; acted(w, p); w.fx.push({ k: 'sound', s: 'shriek', x: p.x, z: p.z }, { k: 'ring', x: p.x, z: p.z, r: 24, t: 0.9, c: hsl(s.glow) }); noise(w, p.x, p.z, 26, false); }
    if (b === 'spores' && p.cd <= 0 && dp < 12) { p.cd = 3.6; acted(w, p); zone(w, 'cloud', p.x, p.z, 1.9, 6.5); w.fx.push({ k: 'sound', s: 'puff', x: p.x, z: p.z }); }
    if (b === 'gall' && p.spawned < 12 && p.cd <= 0) {
      acted(w, p);
      const a = range(w.rng, 0, 6.28);
      const e = addEnemy(w, 'mite', p.x + Math.cos(a) * 0.8, p.z + Math.sin(a) * 0.8);
      e.state = 'chase'; e.alert = 9; p.spawned++;
      w.fx.push({ k: 'sound', s: 'pop', x: p.x, z: p.z }, { k: 'spark', x: p.x, z: p.z, c: s.glow, n: 4 });
      p.cd = p.spawned % 6 === 0 ? 9 : 0.3;
    }
    if (b === 'spines' || b === 'snare') {
      const reach = b === 'spines' ? 2.9 : 2.5;
      if (p.fuse > 0) {
        p.fuse -= dt;
        if (p.fuse <= 0) {
          p.fuse = -1; acted(w, p);
          w.fx.push({ k: 'burst', x: p.x, z: p.z, r: reach, c: s.glow }, { k: 'sound', s: b === 'spines' ? 'lash' : 'grab', x: p.x, z: p.z });
          if (alive && dp < reach + 0.3) {
            if (b === 'spines') hurtPlayer(w, 17, `the ${s.name}`, p.x, p.z);
            else if (pl.invuln <= 0) { pl.snared = 1.5; pl.cell = Math.max(0, pl.cell - 14); hurtPlayer(w, 6, `the ${s.name}`); }
          }
          for (const e of w.enemies) { const d = dist(e.x, e.z, p.x, p.z); if (!e.dead && d < reach + e.r && e.type !== 'tender' && e.type !== 'warden') { if (e.type === 'grazer' && seen(w, p.x, p.z)) sayOnce(w, 'eaten'); hurtEnemy(w, e, b === 'spines' ? 22 : 8, (e.x - p.x) / (d || 1), (e.z - p.z) / (d || 1), 4); if (b === 'snare') e.slow = 0.15; } }
        }
      } else if (p.cd <= 0) {
        const target = (alive && dp < reach) || w.enemies.some((e) => !e.dead && e.type !== 'mite' && e.type !== 'tender' && e.type !== 'warden' && dist(e.x, e.z, p.x, p.z) < reach);
        if (target) { p.fuse = 0.42; p.cd = b === 'spines' ? 1.5 : 3.2; p.calm = 0; w.fx.push({ k: 'ring', x: p.x, z: p.z, r: reach, t: 0.42, c: hsl(s.glow) }); }
      }
    }
  }
}

const hsl = (h: number): number => {
  const f = (n: number): number => { const k = (n + h / 30) % 12; return Math.round(255 * (0.6 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return (f(0) << 16) | (f(8) << 8) | f(4);
};

// ── creatures ───────────────────────────────────────────────────────────────

function steer(w: World, e: Enemy, tx2: number, tz2: number, speed: number, dt: number): void {
  const l = w.level;
  let gx = tx2, gz = tz2;
  if (!los(l, e.x, e.z, tx2, tz2)) {
    // follow the flow field downhill towards the player
    const a = tx(e.x), b = tx(e.z);
    let best = w.flow[idx(l, a, b)];
    if (best < 0) return;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const v = w.flow[idx(l, a + dx, b + dz)];
      if (v < 0 || v >= best) continue;
      if (dx && dz && (l.tiles[idx(l, a + dx, b)] === WALL || l.tiles[idx(l, a, b + dz)] === WALL)) continue;
      best = v; gx = centre(a + dx); gz = centre(b + dz);
    }
  }
  const d = dist(gx, gz, e.x, e.z);
  if (d < 0.05) return;
  e.face = Math.atan2(gz - e.z, gx - e.x);
  moveCircle(l, e, ((gx - e.x) / d) * speed * dt, ((gz - e.z) / d) * speed * dt, e.r, true);
}

function stepEnemies(w: World, dt: number): void {
  const pl = w.player, alive = pl.state !== 'dead', l = w.level;
  const decoy = w.zones.find((z) => z.kind === 'decoy');
  const lanterns = w.plants.filter((p) => !p.dead && p.mood === 'asleep' && w.camp.species[p.sp].behaviour === 'lantern');
  for (const e of w.enemies) {
    if (e.dead) { e.deadT += dt; continue; }
    const d = ENEMIES[e.type];
    e.flash -= dt; e.cd -= dt; e.alert -= dt;
    const slow = e.slow; e.slow = Math.min(1, e.slow + dt * 0.7);
    if (Math.abs(e.vx) + Math.abs(e.vz) > 0.05) { moveCircle(l, e, e.vx * dt, e.vz * dt, e.r, true); e.vx *= 1 - Math.min(1, 8 * dt); e.vz *= 1 - Math.min(1, 8 * dt); }
    const dp = dist(e.x, e.z, pl.x, pl.z);
    if (dp > 40 && e.type !== 'tender') continue;
    const sees = alive && dp < d.sight * (pl.torch ? 1.7 : 0.75) && los(l, e.x, e.z, pl.x, pl.z);
    if (sees) { if (e.alert <= 0 && (e.type === 'skulker' || e.type === 'husk' || e.type === 'spitter')) w.fx.push({ k: 'sound', s: 'growl', x: e.x, z: e.z }); e.alert = 6; e.tx = pl.x; e.tz = pl.z; }
    const speed = d.speed * slow * (e.elite ? 1.1 : 1);
    const lured = decoy && e.type !== 'unlit' && e.type !== 'tender' && dist(e.x, e.z, decoy.x, decoy.z) < 18;
    const gx = lured ? decoy.x : sees ? pl.x : e.tx, gz = lured ? decoy.z : sees ? pl.z : e.tz;

    if (e.state === 'stagger') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; continue; }

    if (e.type === 'unlit') {
      e.frozen = lit(w, e.x, e.z) || lanterns.some((p) => dist(p.x, p.z, e.x, e.z) < 5);
      if (e.frozen && dp < 13 && pl.torch) sayOnce(w, 'unlit');
      if (e.state === 'recover') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; continue; }
      if (e.frozen || !alive || dp > 26) continue;
      steer(w, e, pl.x, pl.z, speed, dt);
      if (dp < d.range + pl.x * 0 && hurtPlayer(w, d.dmg, 'the thing that moves when unlit', e.x, e.z)) { e.state = 'recover'; e.t = d.recover; w.fx.push({ k: 'sound', s: 'unlit', x: e.x, z: e.z }); }
      continue;
    }

    if (e.type === 'tender') { stepTender(w, e, dt, dp); continue; }

    if (e.type === 'grazer') {
      if (alive && dp < 4.5 && sees) { e.alert = 2.5; e.tx = pl.x; e.tz = pl.z; sayOnce(w, 'grazer'); }
      if (e.alert > 0) { // scatter, away from whatever startled it
        const a = Math.atan2(e.z - e.tz, e.x - e.tx) + Math.sin(w.time * 9 + e.id) * 0.8;
        e.face = a;
        moveCircle(l, e, Math.cos(a) * speed * 1.7 * dt, Math.sin(a) * speed * 1.7 * dt, e.r, true);
        e.wander = 0;
        continue;
      }
      e.wander -= dt;
      if (e.wander < 0) { // drift to something glowing and feed
        e.wander = range(w.rng, 2.5, 7);
        const near = w.plants.filter((q) => !q.dead && dist(q.x, q.z, e.x, e.z) < 11 && los(l, e.x, e.z, q.x, q.z));
        const q = near.length ? pick(w.rng, near) : null;
        const a = range(w.rng, 0, 6.28);
        e.homeX = q ? q.x + Math.cos(a) * 1.1 : e.x + Math.cos(a) * 3; e.homeZ = q ? q.z + Math.sin(a) * 1.1 : e.z + Math.sin(a) * 3;
      }
      if (dist(e.x, e.z, e.homeX, e.homeZ) > 0.3 && los(l, e.x, e.z, e.homeX, e.homeZ)) steer(w, e, e.homeX, e.homeZ, speed * 0.55, dt);
      continue;
    }

    if (e.type === 'warden') {
      if (e.phase === 0) { // gardening: walk the rows, settle what is restless
        if (dp < 11 && sees) sayOnce(w, 'garden');
        e.wander -= dt;
        const rows = w.plants.filter((q) => !q.dead && dist(q.x, q.z, e.homeX, e.homeZ) < 12);
        if (e.wander < 0 && rows.length) { e.wander = range(w.rng, 3, 5); const q = pick(w.rng, rows); e.tx = q.x; e.tz = q.z + 1.1; if (q.mood === 'awake' && q.fuse < 0) q.mood = 'asleep'; q.hp = Math.min(26 * q.scale, q.hp + 10); }
        if (dist(e.x, e.z, e.tx, e.tz) > 0.3) steer(w, e, e.tx, e.tz, speed * 0.6, dt);
        continue;
      }
      if (e.state === 'windup') {
        e.t -= dt;
        if (e.t <= 0) {
          const len = rayWall(l, e.x, e.z, Math.cos(e.face), Math.sin(e.face), 14);
          const t = (pl.x - e.x) * Math.cos(e.face) + (pl.z - e.z) * Math.sin(e.face);
          const off = Math.abs((pl.x - e.x) * Math.sin(e.face) - (pl.z - e.z) * Math.cos(e.face));
          w.fx.push({ k: 'shot', x: e.x, z: e.z, x2: e.x + Math.cos(e.face) * len, z2: e.z + Math.sin(e.face) * len }, { k: 'sound', s: 'lash', x: e.x, z: e.z });
          if (t > 0 && t < len && off < 0.7) hurtPlayer(w, d.dmg, 'the gardener', e.x, e.z);
          e.state = 'recover'; e.t = d.recover;
        }
        continue;
      }
      if (e.state === 'recover') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; continue; }
      if (sees && dp < d.range) { e.state = 'windup'; e.t = d.windup; e.face = Math.atan2(pl.z - e.z, pl.x - e.x); w.fx.push({ k: 'sound', s: 'charge', x: e.x, z: e.z }, { k: 'ring', x: e.x, z: e.z, r: 1.6, t: d.windup, c: WHITE }); }
      else steer(w, e, pl.x, pl.z, speed, dt);
      continue;
    }

    if (e.state === 'idle') {
      if (e.alert > 0) { e.state = 'chase'; continue; }
      e.wander -= dt;
      if (e.wander < 0) { e.wander = range(w.rng, 2, 5); const a = range(w.rng, 0, 6.28); e.tx = e.homeX + Math.cos(a) * 2.5; e.tz = e.homeZ + Math.sin(a) * 2.5; }
      if (dist(e.x, e.z, e.tx, e.tz) > 0.4 && los(l, e.x, e.z, e.tx, e.tz)) steer(w, e, e.tx, e.tz, speed * 0.3, dt);
      continue;
    }
    if (e.state === 'chase') {
      if (e.alert <= 0 && !lured) { e.state = 'idle'; e.tx = e.homeX; e.tz = e.homeZ; continue; }
      const dg = dist(e.x, e.z, gx, gz);
      if (lured) { if (dg > 1.2) steer(w, e, gx, gz, speed, dt); continue; }
      if (e.type === 'spitter') {
        if (sees && dp < 5) { e.face = Math.atan2(pl.z - e.z, pl.x - e.x); moveCircle(l, e, -Math.cos(e.face) * speed * dt, -Math.sin(e.face) * speed * dt, e.r, true); }
        else if (!sees || dp > 9) steer(w, e, gx, gz, speed, dt);
        if (sees && dp < d.range && e.cd <= 0) { e.state = 'windup'; e.t = d.windup; e.face = Math.atan2(pl.z - e.z, pl.x - e.x); }
        continue;
      }
      if (sees && dp < d.range && e.cd <= 0) {
        e.state = 'windup'; e.t = d.windup * (e.type === 'mite' ? 1 : 1); e.face = Math.atan2(pl.z - e.z, pl.x - e.x);
        if (e.type === 'husk') w.fx.push({ k: 'ring', x: e.x, z: e.z, r: 3.3, t: d.windup, c: HARM }, { k: 'sound', s: 'growl', x: e.x, z: e.z, v: 1.4 });
        if (e.type === 'skulker') w.fx.push({ k: 'sound', s: 'hiss', x: e.x, z: e.z });
        continue;
      }
      if (dg > (e.type === 'skulker' && e.cd > 0 ? 4 : 0.6)) steer(w, e, gx, gz, speed, dt);
      else if (e.type === 'skulker') { // circle while the lunge comes back
        e.face = Math.atan2(pl.z - e.z, pl.x - e.x);
        moveCircle(l, e, -Math.sin(e.face) * speed * 0.6 * dt * (e.id % 2 ? 1 : -1), Math.cos(e.face) * speed * 0.6 * dt * (e.id % 2 ? 1 : -1), e.r, true);
      }
      continue;
    }
    if (e.state === 'windup') {
      e.t -= dt;
      if (e.t > 0) continue;
      e.state = 'strike'; e.t = e.type === 'skulker' ? 0.3 : 0.12; e.phase = 0;
      if (e.type === 'spitter') {
        const a = Math.atan2(pl.z + pl.vz * 0.2 - e.z, pl.x - e.x);
        w.projs.push({ id: w.nextId++, x: e.x, z: e.z, vx: Math.cos(a) * 9.5, vz: Math.sin(a) * 9.5, life: 2.4, dmg: d.dmg, r: 0.35, gone: false });
        w.fx.push({ k: 'sound', s: 'spit', x: e.x, z: e.z });
      }
      if (e.type === 'husk') {
        w.fx.push({ k: 'burst', x: e.x, z: e.z, r: 3.3, c: 20 }, { k: 'shake', n: 0.6 }, { k: 'sound', s: 'slam', x: e.x, z: e.z });
        if (dp < 3.3 + 0.3) hurtPlayer(w, d.dmg, 'a husk', e.x, e.z);
        for (const q of w.plants) if (!q.dead && dist(q.x, q.z, e.x, e.z) < 3.3) hurtPlant(w, q, 20);
        for (const q of w.props) if (dist(q.x, q.z, e.x, e.z) < 3.3) breakProp(w, q);
      }
      if (e.type === 'mite' && dp < 1.3) hurtPlayer(w, d.dmg, 'mites', e.x, e.z);
      continue;
    }
    if (e.state === 'strike') {
      e.t -= dt;
      if (e.type === 'skulker') {
        moveCircle(l, e, Math.cos(e.face) * 15 * slow * dt, Math.sin(e.face) * 15 * slow * dt, e.r, true);
        if (!e.phase && dist(e.x, e.z, pl.x, pl.z) < e.r + TUNE.player.r + 0.25 && hurtPlayer(w, d.dmg * (e.elite ? 1.4 : 1), 'a skulker', e.x, e.z)) e.phase = 1;
      }
      if (e.t <= 0) { e.state = 'recover'; e.t = d.recover; e.cd = d.recover + range(w.rng, 0.3, 1.2); }
      continue;
    }
    if (e.state === 'recover') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; }
  }
  // keep them from stacking
  const es = w.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (a.dead) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, dd = dx * dx + dz * dz;
      if (dd >= rr * rr || dd < 1e-6) continue;
      const dl = Math.sqrt(dd), push = (rr - dl) / 2;
      moveCircle(l, a, (-dx / dl) * push, (-dz / dl) * push, a.r, true);
      moveCircle(l, b, (dx / dl) * push, (dz / dl) * push, b.r, true);
    }
    const dx = a.x - pl.x, dz = a.z - pl.z, rr = a.r + TUNE.player.r - 0.1, dd = dx * dx + dz * dz;
    if (dd < rr * rr && dd > 1e-6 && a.state !== 'strike') { const dl = Math.sqrt(dd); moveCircle(l, a, (dx / dl) * (rr - dl), (dz / dl) * (rr - dl), a.r, true); }
  }
}

/** The Tender: a sweeping beam, a ring to dodge through, and it calls the nests. */
function stepTender(w: World, e: Enemy, dt: number, dp: number): void {
  const pl = w.player, d = ENEMIES.tender;
  if (e.alert <= 0 && dp > 13) return;
  e.alert = 99;
  const rage = e.hp < e.maxHp * 0.5;
  if (e.state === 'idle' || e.state === 'chase') {
    e.state = 'chase';
    if (dp > 5) steer(w, e, pl.x, pl.z, d.speed * (rage ? 1.4 : 1), dt);
    if (e.cd <= 0) {
      e.phase = (e.phase + 1) % 3;
      e.state = 'windup'; e.t = rage ? 0.75 : d.windup;
      e.face = Math.atan2(pl.z - e.z, pl.x - e.x) - 0.9;
      w.fx.push({ k: 'sound', s: 'charge', x: e.x, z: e.z });
      if (e.phase === 2) w.fx.push({ k: 'ring', x: e.x, z: e.z, r: 2, t: e.t, c: WHITE });
    }
    return;
  }
  if (e.state === 'windup') {
    e.t -= dt;
    if (e.t <= 0) { e.state = 'strike'; e.t = e.phase === 2 ? 1.5 : 1.7; e.tx = 0; if (e.phase === 1) for (let i = 0; i < (rage ? 6 : 4); i++) { const a = range(w.rng, 0, 6.28); const m = addEnemy(w, 'mite', e.x + Math.cos(a) * 2, e.z + Math.sin(a) * 2); m.state = 'chase'; m.alert = 20; } }
    return;
  }
  if (e.state === 'strike') {
    e.t -= dt;
    if (e.phase === 0) { // the beam sweeps
      e.face += 1.15 * dt * (rage ? 1.3 : 1);
      const len = rayWall(w.level, e.x, e.z, Math.cos(e.face), Math.sin(e.face), d.range);
      const t = (pl.x - e.x) * Math.cos(e.face) + (pl.z - e.z) * Math.sin(e.face);
      const off = Math.abs((pl.x - e.x) * Math.sin(e.face) - (pl.z - e.z) * Math.cos(e.face));
      if (t > 0 && t < len && off < 0.75) hurtPlayer(w, d.dmg, 'the Tender', e.x, e.z);
      e.tz = len;
    } else if (e.phase === 2) { // the ring: dodge through it
      const before = e.tx;
      e.tx += 11 * dt;
      if (dp >= before - 0.5 && dp <= e.tx + 0.5) hurtPlayer(w, d.dmg, 'the Tender', e.x, e.z);
    }
    if (e.t <= 0) { e.state = 'chase'; e.cd = rage ? 1.1 : 1.9; }
  }
}

// ── everything else ─────────────────────────────────────────────────────────

function stepZones(w: World, dt: number): void {
  const pl = w.player;
  for (const z of w.zones) {
    z.life -= dt; z.tick -= dt;
    if (z.life <= 0) { z.gone = true; continue; }
    const tick = z.tick <= 0;
    if (tick) z.tick = z.kind === 'decoy' ? 1 : 0.25;
    if (z.kind === 'cloud') {
      const d = dist(z.x, z.z, pl.x, pl.z);
      if (d > 0.3 && d < 14) { z.x += ((pl.x - z.x) / d) * 1.5 * dt; z.z += ((pl.z - z.z) / d) * 1.5 * dt; }
      if (tick && d < z.r && pl.state !== 'dead') { pl.hp -= (has(w.camp.gear.suit, 'sealed') ? 0.8 : 2.4) * (1 + 0.15 * (w.depth - 1)); pl.hurtT = 0; w.cause = 'spores in the lungs'; if (pl.hp <= 0) { pl.hp = 1; hurtPlayer(w, 5, 'spores in the lungs'); } }
    }
    if (!tick) continue;
    if (z.kind === 'decoy') { noise(w, z.x, z.z, 13, false); w.fx.push({ k: 'ring', x: z.x, z: z.z, r: 6, t: 0.5, c: YELLOW }); }
    for (const e of w.enemies) {
      if (e.dead || dist(e.x, e.z, z.x, z.z) > z.r + e.r) continue;
      if (z.kind === 'gum') e.slow = 0.18;
      if (z.kind === 'caltrop') hurtEnemy(w, e, 4, 0, 0, 0);
      if (z.kind === 'friendcloud') hurtEnemy(w, e, 4.5, 0, 0, 0);
      if (z.kind === 'cloud' && e.type !== 'tender') hurtEnemy(w, e, 1.2, 0, 0, 0);
    }
  }
  for (const pr of w.projs) {
    pr.life -= dt; pr.x += pr.vx * dt; pr.z += pr.vz * dt;
    if (pr.life <= 0 || tileAt(w.level, pr.x, pr.z) === WALL) { pr.gone = true; w.fx.push({ k: 'spark', x: pr.x, z: pr.z, c: 300, n: 6 }); continue; }
    if (dist(pr.x, pr.z, pl.x, pl.z) < pr.r + TUNE.player.r && hurtPlayer(w, pr.dmg, 'a spitter', pr.x - pr.vx, pr.z - pr.vz)) pr.gone = true;
  }
  for (const l of w.loot) {
    l.t += dt;
    if (Math.abs(l.vx) + Math.abs(l.vz) > 0.1) { moveCircle(w.level, l, l.vx * dt, l.vz * dt, 0.2, false); l.vx *= 1 - Math.min(1, 6 * dt); l.vz *= 1 - Math.min(1, 6 * dt); }
  }
}

function explore(w: World): void {
  const l = w.level, p = w.player, a = tx(p.x), b = tx(p.z), R = 6;
  for (let y = b - R; y <= b + R; y++) for (let x = a - R; x <= a + R; x++) {
    if (x < 0 || y < 0 || x >= l.w || y >= l.h || w.explored[idx(l, x, y)]) continue;
    if ((x - a) ** 2 + (y - b) ** 2 <= R * R && los(l, p.x, p.z, centre(x), centre(y))) w.explored[idx(l, x, y)] = 1;
  }
  const r = l.roomAt[idx(l, a, b)];
  if (r >= 0) {
    const kind = l.rooms[r].kind;
    if (kind === 'relic' && !w.camp.relicTaken[w.depth - 1]) sayOnce(w, 'relic');
    if (kind === 'hatch') sayOnce(w, 'hatch');
  }
  for (const q of w.props) if (q.kind === 'body' && !q.used && dist(q.x, q.z, p.x, p.z) < 6) sayOnce(w, 'body');
  for (const q of w.breaches) if (dist(q.x, q.z, p.x, p.z) < 5) sayOnce(w, 'breach');
}

export function step(w: World, input: Input, dt: number): void {
  if (w.hitstop > 0) { w.hitstop -= dt; return; }
  w.time += dt;
  stepPlayer(w, input, dt);
  w.still -= dt;
  const slow = w.still > 0 ? 0.22 : 1;
  w.flowT -= dt;
  if (w.flowT <= 0) { w.flowT = 0.25; distances(w.level, tx(w.player.x), tx(w.player.z), w.flow, 34); explore(w); }
  w.waveT -= dt;
  if (w.waveT <= 0 && w.depth < 4) {
    w.waveT = range(w.rng, 70, 110) / (1 + w.camp.pulse * 0.4); w.wave = 0;
    w.fx.push({ k: 'sound', s: 'pulse', x: w.player.x, z: w.player.z }, { k: 'shake', n: 0.25 });
    sayOnce(w, 'pulse');
  }
  if (w.wave >= 0) { w.wave += 26 * dt; if (w.wave > 160) w.wave = -1; }
  stepPlants(w, dt * slow);
  stepEnemies(w, dt * slow);
  stepZones(w, dt * slow);
  w.hover = null;
  let best = 1.4;
  for (const p of w.plants) { const d = dist(p.x, p.z, input.aimX, input.aimZ); if (!p.dead && d < best) { best = d; w.hover = p; } }
  for (const p of w.plants) if (!p.dead && !w.camp.guide[p.sp].seen && dist(p.x, p.z, w.player.x, w.player.z) < 9 && (lit(w, p.x, p.z) || dist(p.x, p.z, w.player.x, w.player.z) < 3)) w.camp.guide[p.sp].seen = true;
  if (w.loot.length > 40 || w.zones.length > 6 || w.projs.length > 6) { w.loot = w.loot.filter((l) => !l.gone); w.zones = w.zones.filter((z) => !z.gone); w.projs = w.projs.filter((p) => !p.gone); }
  if (w.enemies.length > 90) w.enemies = w.enemies.filter((e) => !e.dead || e.deadT < 3);
}

/** What the campaign keeps when a descent ends. */
export function settle(w: World): string[] {
  const c = w.camp, p = w.player, who = c.roster[c.current];
  const lines: string[] = [];
  c.deepest = Math.max(c.deepest, Math.min(4, w.depth));
  if (w.outcome === 'dead') {
    who.alive = false; who.epitaph = `Lost in ${['', 'the Threshold', 'the Interior', 'the Works', 'the Vault'][w.depth]}, day ${c.day}, to ${w.cause || 'the ruin'}.`;
    c.fallen.push({ name: who.name, depth: w.depth, gear: c.gear });
    c.gear = starterGear();
    lines.push(`${who.name} did not come back. ${who.epitaph}`, 'What they carried is still down there with them.');
    const next = c.roster.findIndex((x) => x.alive);
    if (next >= 0) c.current = next;
  } else {
    who.runs++;
    c.salvage += p.salvage;
    lines.push(`${who.name} came up on the lift with ${p.salvage} salvage${p.samples ? ` and ${p.samples} sample${p.samples > 1 ? 's' : ''}` : ''}.`);
    if (p.kills > 0) lines.push(`${p.kills} thing${p.kills > 1 ? 's' : ''} killed below. The ruin will have noticed.`);
  }
  c.fallen = c.fallen.filter((f) => f.depth > 0);
  c.night = lines;
  return lines;
}

export type { RngHost };
