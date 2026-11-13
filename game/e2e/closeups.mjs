// Close-ups for judging models: every plant body plan, every creature, the operative.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/')('/opt/node-tools/node_modules/playwright/index.js');
const out = process.argv[2] ?? new URL('./screenshots', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(120000);
const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(new URL('../dist/index.html?debug', import.meta.url).href);
await p.click('text=New expedition'); await p.waitForTimeout(400);
await p.evaluate(() => {
  const G = window.__game; G.hold(); const w = G.world, pl = w.player;
  document.querySelector('.hud').style.display = 'none';
  w.enemies.forEach((e) => (e.dead = true)); w.plants.forEach((q) => (q.dead = true)); pl.invuln = 9999;
  const r = w.level.rooms.slice().sort((a, c) => c.w * c.h - a.w * a.h)[0];
  pl.x = r.cx; pl.z = r.cz + 1; window.__r = r;
  G.view.zoom = 2.1; G.view.lead = 0; G.view.resize();
});
const g = (fn, a) => p.evaluate(fn, a);
// plants: all eight species in two rows, the back row awake
await g(() => {
  const G = window.__game, w = G.world, pl = w.player, proto = w.plants[0];
  for (let i = 0; i < 8; i++) w.plants.push({ ...proto, id: 9000 + i, sp: i, x: pl.x - 5.2 + (i % 4) * 2.3 + (i > 3 ? 1.1 : 0), z: pl.z - 3.4 - (i % 4) * 2.3 + (i > 3 ? 3.0 : 0) + (i > 3 ? 1.1 : 0), dead: false, mood: i % 2 ? 'awake' : 'asleep', scale: 1.1, r: 0.6, hp: 99, calm: -99, cd: 99, fuse: -1, surge: 0, flash: 0, lit: 0, t: 0 });
  G.step(3, { aimX: pl.x - 4, aimZ: pl.z - 4 });
  for (let i = 0; i < 12; i++) G.view.update(w, 0.2);
});
await p.screenshot({ path: `${out}/close-1-plants.png` });
await g(() => {
  const G = window.__game, w = G.world, pl = w.player; w.plants.forEach((q) => (q.dead = true));
  const proto = w.enemies[0];
  const mk = (type, dx, dz, r, state) => w.enemies.push({ ...proto, id: 8000 + w.enemies.length, type, x: pl.x + dx, z: pl.z + dz, homeX: pl.x + dx, homeZ: pl.z + dz, hp: 500, maxHp: 500, r, dead: false, deadT: 0, state, alert: 0, sx: 2, sz: -2, vx: 0, vz: 0, elite: false, cd: 99, t: 0.3, phase: 0, face: 2.4, frozen: false, gait: 1.3, wander: 99, tx: pl.x + dx, tz: pl.z + dz, st: 1e9 });
  mk('skulker', -3.6, -0.8, 0.5, 'idle'); mk('husk', -1.4, -3.6, 0.9, 'idle'); mk('spitter', -4.6, -4.2, 0.5, 'idle'); mk('mite', -1.8, -0.4, 0.26, 'idle'); mk('mite', -2.4, 0.3, 0.26, 'idle'); mk('unlit', 0.6, -4.6, 0.45, 'idle'); mk('warden', -5.8, -1.6, 0.6, 'idle'); mk('grazer', -0.8, -1.8, 0.22, 'idle');
  w.enemies.forEach((e) => { if (!e.dead) { e.sx = 1.5; e.sz = -1.5; } });
  pl.face = 3.9;
  for (let i = 0; i < 6; i++) G.view.update(w, 0.05);
});
await p.screenshot({ path: `${out}/close-2-creatures.png` });
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
