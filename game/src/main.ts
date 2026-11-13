// Boot, input and the loop. The simulation runs at a fixed 60 Hz; the view
// draws whatever state it finds.

import { TUNE } from './data';
import type { EndKind, UpgradeId } from './data';
import { UPGRADES } from './data';
import { Audio } from './audio';
import { Hud } from './hud';
import { View } from './render';
import { fork } from './rng';
import { createWorld, settle, step } from './sim';
import { loadCampaign, newCampaign, passDay, saveCampaign } from './state';
import type { Campaign, Input, World } from './state';

const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');
app.append(canvas);
const view = new View(canvas);
const audio = new Audio();
let camp: Campaign | null = null;
let world: World | null = null;
let mode: 'title' | 'base' | 'play' | 'pause' | 'over' = 'title';
let ending = 0;

const keys = new Set<string>();
const once = new Set<string>();
const mouse = { x: innerWidth / 2, y: innerHeight / 2, l: false, r: false };
let wheel = 0;

function startRun(depth: number, carry?: World): void {
  if (!camp) return;
  world = createWorld(camp, depth, carry?.player);
  view.build(world);
  mode = 'play'; ending = 0;
  hud.show(true);
  saveCampaign(camp);
}

function toBase(): void {
  if (!camp) return;
  saveCampaign(camp.over ? null : camp);
  if (camp.over) { mode = 'over'; hud.ending(camp); } else { mode = 'base'; hud.base(camp); }
}

const hud = new Hud(app, {
  begin: () => { audio.start(); camp = newCampaign((Date.now() ^ (Math.random() * 0x7fffffff)) | 0); startRun(1); setTimeout(() => hud.say('Left click to cut. Right click to shoot. Space to dodge. F for the torch.', 'note'), 2500); },
  resume: () => { audio.start(); camp = loadCampaign(); if (camp) toBase(); },
  descend: (d) => { audio.start(); startRun(d); },
  buy: (id) => {
    const u = UPGRADES.find((x) => x.id === id), c = camp;
    if (!u || !c) return;
    const n = c.upgrades[id as UpgradeId], cost = u.cost * (n + 1);
    if (n < u.max && c.salvage >= cost) { c.salvage -= cost; c.upgrades[id as UpgradeId]++; audio.play('equip'); toBase(); }
  },
  burn: () => { const c = camp; if (c && c.salvage >= TUNE.growth.burnCost) { c.salvage -= TUNE.growth.burnCost; c.growth = Math.max(0, c.growth - TUNE.growth.burn); c.pulse += 1; audio.play('boom', 0.5); toBase(); } },
  who: (i) => { if (camp?.roster[i].alive) { camp.current = i; toBase(); } },
  ending: (k: EndKind) => { if (camp) { camp.over = k; toBase(); } },
  unpause: () => { mode = 'play'; hud.show(true); },
  restart: () => { saveCampaign(null); camp = null; world = null; mode = 'title'; hud.title(null); },
  mute: () => { audio.muted = !audio.muted; },
});
hud.title(loadCampaign());

addEventListener('keydown', (e) => {
  if (mode === 'play' && ['Tab', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
  if (!e.repeat) once.add(e.code);
  keys.add(e.code);
  if (e.code === 'Escape' && mode === 'play') { mode = 'pause'; hud.pause(); }
  else if (e.code === 'Escape' && mode === 'pause') { mode = 'play'; hud.show(true); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.l = mouse.r = false; });
addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', (e) => { audio.start(); if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; });
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { wheel = Math.sign(e.deltaY); }, { passive: true });
addEventListener('resize', () => view.resize());

function readInput(w: World): Input {
  const k = (c: string): number => (keys.has(c) ? 1 : 0);
  // Screen up is world (-1, -1); screen right is world (1, -1).
  const up = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown'), right = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft');
  const aim = view.ground(mouse.x, mouse.y);
  const input: Input = {
    mx: right - up, mz: -right - up, aimX: aim.x, aimZ: aim.z,
    attack: mouse.l, fire: mouse.r, dodge: once.has('Space'), interact: once.has('KeyE'), graft: once.has('KeyQ'), relic: once.has('KeyR'),
    torch: once.has('KeyF'), medkit: once.has('KeyH'), cycle: once.has('Tab') ? 1 : wheel,
  };
  if (Math.hypot(aim.x - w.player.x, aim.z - w.player.z) < 0.3) { input.aimX = w.player.x + Math.cos(w.player.face); input.aimZ = w.player.z + Math.sin(w.player.face); }
  once.clear(); wheel = 0;
  return input;
}

function finish(w: World): void {
  const c = w.camp;
  if (w.outcome === 'descend') { startRun(w.depth + 1, w); return; }
  if (w.outcome === 'won') { settle(w); mode = 'over'; hud.vault(); return; }
  settle(w);
  passDay(c, fork(c.seed, 99, c.day));
  toBase();
}

let last = performance.now(), acc = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const w = world;
  if (!w) { view.renderer.clear(); return; }
  if (mode === 'play') {
    acc += dt;
    let input: Input | null = null;
    while (acc >= 1 / 60) {
      acc -= 1 / 60;
      input = input ?? readInput(w);
      step(w, input, 1 / 60);
      // pressed-once actions belong to the first step only
      input = { ...input, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: false, cycle: 0 };
      if (w.fx.length) {
        for (const f of w.fx) if (f.k === 'sound') audio.at(w, f.s, f.x, f.z, f.v ?? 1);
        view.consume(w.fx, w); hud.fx(w.fx, view); w.fx.length = 0;
      }
    }
    audio.update(w, dt);
    hud.update(w, view);
    if (w.outcome) { ending += dt; if (ending > (w.outcome === 'dead' ? 2.4 : w.outcome === 'descend' ? 0.5 : 1)) { finish(w); return; } }
  }
  view.update(w, mode === 'play' ? dt : 0);
}
requestAnimationFrame(frame);

// For tests and tinkering: ?debug exposes the world and a way to step it.
if (location.search.includes('debug')) {
  (window as unknown as Record<string, unknown>).__game = {
    get world() { return world; }, get camp() { return camp; }, view, audio,
    step: (n: number, input: Partial<Input> = {}) => { const w = world!; for (let i = 0; i < n; i++) { step(w, { mx: 0, mz: 0, aimX: w.player.x + 1, aimZ: w.player.z, attack: false, fire: false, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: false, cycle: 0, ...input }, 1 / 60); view.consume(w.fx, w); hud.fx(w.fx, view); w.fx.length = 0; } hud.update(w, view); view.update(w, n / 60); },
    hold: () => { mode = 'pause'; },
  };
}
