// Boot, input and the loop. The simulation runs at a fixed 60 Hz; the view
// draws whatever state it finds.

import { TUNE } from './data';
import type { EndKind, UpgradeId } from './data';
import { Audio } from './audio';
import { Hud } from './hud';
import { View } from './render';
import { fork } from './rng';
import { createWorld, settle, step } from './sim';
import { burn, buy, passDay, reclaim, setJob } from './camp';
import type { Job, ModuleId } from './data';
import { loadCampaign, loadPrior, newCampaign, recordExpedition, saveCampaign } from './state';
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
let demo = false;
let frames = 0;
const DEBUG = location.search.includes('debug');
let slow = 0, measured = 0, held = false;
const fade = document.createElement('div');
fade.className = 'fade';
app.append(fade);

/** Behind the title: a tended garden somewhere in the Threshold, and a torch turning slowly. */
function backdrop(): void {
  const c = newCampaign(20261113);
  const w = createWorld(c, 1);
  const g = w.enemies.find((e) => e.type === 'warden');
  if (g) { w.player.x = g.homeX + 2.5; w.player.z = g.homeZ + 3; }
  for (const e of w.enemies) if (e.type !== 'warden' && e.type !== 'grazer') e.dead = true;
  w.enemies = w.enemies.filter((e) => !e.dead);
  w.waveT = 6;
  world = w; demo = true;
  view.build(w);
}

const keys = new Set<string>();
const once = new Set<string>();
const mouse = { x: innerWidth / 2, y: innerHeight / 2, l: false, r: false };
let wheel = 0;

function startRun(depth: number, carry?: World): void {
  if (!camp) return;
  demo = false;
  world = createWorld(camp, depth, carry?.player);
  view.build(world);
  mode = 'play'; ending = 0;
  setTimeout(() => fade.classList.remove('on'), 80);
  hud.show(true);
  saveCampaign(camp);
}

function toBase(): void {
  if (!camp) return;
  fade.classList.remove('on');
  if (camp.over) recordExpedition(camp);
  saveCampaign(camp.over ? null : camp);
  if (camp.over) { mode = 'over'; hud.ending(camp); } else { mode = 'base'; hud.base(camp); }
}

const hud = new Hud(app, {
  begin: () => { audio.start(); camp = newCampaign((Date.now() ^ (Math.random() * 0x7fffffff)) | 0, loadPrior()); startRun(1); setTimeout(() => hud.say('Left click to cut. Right click to shoot. Space to dodge. F for the torch.', 'note'), 2500); },
  resume: () => { audio.start(); camp = loadCampaign(); if (camp) toBase(); },
  descend: (d) => { audio.start(); const p = camp?.roster[camp.current]; if (p?.alive && p.wound <= 0) startRun(d); },
  buy: (id) => { if (camp && buy(camp, id as UpgradeId)) { audio.play('equip'); toBase(); } },
  burn: () => { if (camp && burn(camp)) { audio.play('boom', 0.5); toBase(); } },
  job: (i, job) => { if (camp) { setJob(camp, i, job as Job); toBase(); } },
  reclaim: (id) => { if (camp) { reclaim(camp, id as ModuleId, fork(camp.seed, 98, camp.day)); toBase(); } },
  wait: () => { if (camp) { passDay(camp, fork(camp.seed, 99, camp.day), null); toBase(); } },
  who: (i) => { if (camp?.roster[i].alive && camp.roster[i].wound <= 0) { camp.current = i; toBase(); } },
  ending: (k: EndKind) => { if (camp) { camp.over = k; toBase(); } },
  unpause: () => { mode = 'play'; held = false; hud.show(true); },
  restart: () => { saveCampaign(null); camp = null; mode = 'title'; backdrop(); hud.title(null); },
  mute: () => { audio.muted = !audio.muted; },
  quality: () => { view.setQuality(!view.low); measured = 999; hud.pause(view.low); },
  settings: (volume, shake) => { audio.setVolume(volume * 1.0); view.shakeScale = shake; try { localStorage.setItem('forgotten.settings', JSON.stringify({ volume, shake })); } catch { /* no storage */ } },
  quit: () => { if (world && mode === 'pause') { world.cause = 'the dark, alone'; world.player.state = 'dead'; world.outcome = 'dead'; mode = 'play'; hud.show(true); } },
});
try { const st = JSON.parse(localStorage.getItem('forgotten.settings') ?? 'null') as { volume: number; shake: number } | null; if (st) { hud.settings = st; audio.setVolume(st.volume); view.shakeScale = st.shake; } } catch { /* defaults */ }
if (location.search.includes('low')) view.setQuality(true);
backdrop();
hud.title(loadCampaign());

addEventListener('keydown', (e) => {
  if (mode === 'play' && ['Tab', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
  if (!e.repeat) once.add(e.code);
  keys.add(e.code);
  if (e.code === 'Escape' && mode === 'play') { mode = 'pause'; hud.pause(view.low); }
  else if (e.code === 'Escape' && mode === 'pause') { mode = 'play'; held = false; hud.show(true); }
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
  const away = c.current;
  passDay(c, fork(c.seed, 99, c.day), away, settle(w));
  toBase();
}

let last = performance.now(), acc = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const w = world;
  if (!w) { view.renderer.clear(); return; }
  if (demo) {
    // under test the software renderer cannot keep a title scene going and answer clicks
    if (DEBUG && frames++ % 40) return;
    // the title scene plays itself: nobody is hurt, nothing is said
    const a = now / 4200, p = w.player;
    p.invuln = 9; p.cell = p.maxCell; p.hp = p.maxHp;
    step(w, { mx: 0, mz: 0, aimX: p.x + Math.cos(a) * 6, aimZ: p.z + Math.sin(a) * 6, attack: false, fire: false, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: false, cycle: 0 }, Math.min(dt, 1 / 30));
    view.consume(w.fx.filter((f) => f.k !== 'shake'), w); w.fx.length = 0;
    view.update(w, dt);
    return;
  }
  if (mode === 'play') {
    // a machine that cannot keep up gets the cheaper picture, once, and is told
    if (!view.low && measured < 240) { measured++; slow += dt; if (measured === 240 && slow / 240 > 0.03) { view.setQuality(true); hud.say('The picture has been simplified to keep things moving. Change it back from the pause menu.', 'note'); } }
    acc += dt;
    let input: Input | null = null;
    while (acc >= 1 / 60) {
      acc -= 1 / 60;
      input = input ?? readInput(w);
      // pressed-once actions belong to the first step that actually runs (a hit-stop must not eat a dodge)
      if (step(w, input, 1 / 60)) input = { ...input, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: false, cycle: 0 };
      if (w.fx.length) {
        for (const f of w.fx) if (f.k === 'sound') audio.at(w, f.s, f.x, f.z, f.v ?? 1);
        view.consume(w.fx, w); hud.fx(w.fx, view); w.fx.length = 0;
      }
    }
    if (input) { if (input.dodge) once.add('Space'); if (input.interact) once.add('KeyE'); if (input.graft) once.add('KeyQ'); if (input.relic) once.add('KeyR'); if (input.torch) once.add('KeyF'); if (input.medkit) once.add('KeyH'); }
    audio.update(w, dt);
    hud.update(w, view);
    if (w.outcome) { fade.classList.toggle('on', ending > (w.outcome === 'dead' ? 1.6 : 0.05)); ending += dt; if (ending > (w.outcome === 'dead' ? 2.4 : w.outcome === 'descend' ? 0.5 : 1)) { finish(w); return; } }
  }
  // held for a test, the scene is only drawn when the test steps it
  if (!(DEBUG && held)) view.update(w, mode === 'play' ? dt : 0);
}
requestAnimationFrame(frame);

// For tests and tinkering: ?debug exposes the world and a way to step it.
if (location.search.includes('debug')) {
  (window as unknown as Record<string, unknown>).__game = {
    get world() { return world; }, get camp() { return camp; }, view, audio,
    step: (n: number, input: Partial<Input> = {}) => { const w = world!; for (let i = 0; i < n; i++) { step(w, { mx: 0, mz: 0, aimX: w.player.x + 1, aimZ: w.player.z, attack: false, fire: false, dodge: false, interact: false, graft: false, relic: false, torch: false, medkit: false, cycle: 0, ...input }, 1 / 60); view.consume(w.fx, w); hud.fx(w.fx, view); w.fx.length = 0; } hud.update(w, view); view.update(w, n / 60); },
    hold: () => { mode = 'pause'; held = true; },
  };
}
