// Screenshots of the living-world set pieces: the tended garden, daylight, the Pulse.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/')('/opt/node-tools/node_modules/playwright/index.js');
const out = process.argv[2] ?? new URL('./screenshots', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(new URL('../dist/index.html?debug', import.meta.url).href);
await p.click('text=New expedition');
await p.waitForTimeout(400);
await p.evaluate(() => window.__game.hold());
const g = (fn, a) => p.evaluate(fn, a);
const info = await g(() => {
  const G = window.__game, w = G.world, pl = w.player; pl.invuln = 9999;
  const e = w.enemies.find((x) => x.type === 'warden');
  pl.x = e.homeX + 3.2; pl.z = e.homeZ + 3.2;
  G.step(90, { aimX: e.x, aimZ: e.z });
  return { warden: !!e, grazers: w.enemies.filter((x) => x.type === 'grazer').length, breaches: w.breaches.length };
});
console.log(JSON.stringify(info));
await p.screenshot({ path: `${out}/life-1-garden.png` });
await g(() => { const G = window.__game, w = G.world, pl = w.player; const e = w.enemies.find((x) => x.type === 'warden'); const q = w.plants.filter((x) => !x.dead).sort((a, c) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(c.x - pl.x, c.z - pl.z))[0]; for (let i = 0; i < 30 && e.phase === 0; i++) G.step(3, { aimX: q.x, aimZ: q.z, attack: true, mx: q.x - pl.x, mz: q.z - pl.z }); G.step(36, { aimX: e.x, aimZ: e.z }); });
await p.screenshot({ path: `${out}/life-2-angry.png` });
if (info.breaches) {
  await g(() => { const G = window.__game, w = G.world, pl = w.player; const q = w.breaches[0]; pl.x = q.x + 2.5; pl.z = q.z + 2; w.enemies.forEach((e) => { if (Math.hypot(e.x - q.x, e.z - q.z) < 14 && e.type !== 'grazer') e.dead = true; }); G.step(60, { aimX: q.x - 4, aimZ: q.z }); });
  await p.screenshot({ path: `${out}/life-3-breach.png` });
}
await g(() => { const G = window.__game, w = G.world, pl = w.player; const r = w.level.rooms.filter((x) => x.kind === 'hall' || x.kind === 'nest').sort((a, c) => c.w * c.h - a.w * a.h)[0]; pl.x = r.cx; pl.z = r.cz; w.enemies.forEach((e) => { if (Math.hypot(e.x - r.cx, e.z - r.cz) < 14 && e.type !== 'grazer') e.dead = true; }); G.step(30, { aimX: r.cx - 4, aimZ: r.cz - 2 }); w.waveT = 0; G.step(1, { aimX: r.cx - 4, aimZ: r.cz - 2 }); const d = Math.hypot(pl.x - w.waveX, pl.z - w.waveZ); w.wave = d - 3; G.step(6, { aimX: r.cx - 4, aimZ: r.cz - 2 }); });
await p.screenshot({ path: `${out}/life-4-pulse.png` });
console.log(errors.length ? errors.slice(0, 5).join('\n') : 'no errors');
await b.close();
