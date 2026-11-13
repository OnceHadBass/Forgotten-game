import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const { chromium } = createRequire('/')('/opt/node-tools/node_modules/playwright/index.js');
const out = process.argv[2] ?? new URL('./screenshots', import.meta.url).pathname;
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(180000);
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const check = (name, ok) => console.log(`${ok === true ? 'ok  ' : 'FAIL'} ${name}${ok === true ? '' : ' ' + ok}`);
const site = await serve('?debug&low');
await p.goto(site.url);
await p.waitForFunction(() => window.__game?.booted);
await p.click('text=New expedition');
await p.waitForTimeout(400);
// real-time loop with real input
const x0 = await p.evaluate(() => window.__game.world.player.x);
await p.keyboard.down('KeyD'); await p.waitForTimeout(900); await p.keyboard.up('KeyD');
const x1 = await p.evaluate(() => window.__game.world.player.x);
check('real-time loop moves the operative', Math.abs(x1 - x0) > 0.5);
const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; performance.now() - t < 1000 ? requestAnimationFrame(f) : r(n); }; requestAnimationFrame(f); }));
console.log('     software-renderer fps', fps);
await p.evaluate(() => window.__game.hold());
const g = (fn, a) => p.evaluate(fn, a);
// fight: stand by a skulker and swing until it dies
check('blade kills a skulker and it drops loot', await g(() => {
  const G = window.__game, w = G.world, pl = w.player;
  const e = w.enemies.find((x) => x.type === 'skulker');
  const r = w.level.rooms.find((q) => Math.hypot(q.cx - e.x, q.cz - e.z) < 12);
  pl.x = e.x + 1.6; pl.z = e.z; pl.invuln = 99;
  for (let i = 0; i < 200 && !e.dead; i++) G.step(2, { aimX: e.x, aimZ: e.z, attack: true });
  pl.invuln = 0;
  return e.dead && w.loot.length > 0 && pl.kills >= 1;
}));
await p.screenshot({ path: `${out}/7-kill.png` });
check('salvage is drawn in and collected', await g(() => { const G = window.__game, w = G.world; const l = w.loot.find((q) => q.kind === 'salvage'); if (!l) return 'none'; w.player.x = l.x + 1; w.player.z = l.z; G.step(60); return w.player.salvage > 0; }));
check('cutting an unknown plant leaves a sample; two teach the guide', await g(() => {
  const G = window.__game, w = G.world, pl = w.player; pl.invuln = 999;
  const sp = w.plants.find((q) => !q.dead && w.camp.species[q.sp].behaviour !== 'burst').sp;
  for (const q of w.plants.filter((x) => x.sp === sp).slice(0, 2)) { pl.x = q.x + 1.3; pl.z = q.z; for (let i = 0; i < 80 && !q.dead; i++) G.step(2, { aimX: q.x, aimZ: q.z, attack: true }); G.step(50, { aimX: q.x, aimZ: q.z, mx: -1 }); }
  pl.invuln = 0;
  return w.camp.guide[sp].behaviour || `samples ${w.camp.guide[sp].samples}`;
}));
check('the unlit freezes in the beam and moves without it', await g(() => {
  const G = window.__game, w = G.world, pl = w.player;
  const r = w.level.rooms[w.level.start]; pl.x = r.cx; pl.z = r.cz; pl.invuln = 999;
  w.enemies.forEach((e) => { if (Math.hypot(e.x - pl.x, e.z - pl.z) < 20) e.dead = true; });
  const e = { ...w.enemies[0], id: 9999, type: 'unlit', x: pl.x + 2.5, z: pl.z, hp: 90, maxHp: 90, dead: false, state: 'idle', r: 0.45, vx: 0, vz: 0 };
  w.enemies.push(e);
  pl.torch = true; G.step(60, { aimX: e.x, aimZ: e.z }); const still = Math.abs(e.x - (pl.x + 2.5)) < 0.05;
  G.step(40, { aimX: pl.x - 5, aimZ: pl.z }); const moved = Math.abs(e.x - (pl.x + 2.5)) > 0.5;
  window.__u = e; return (still && moved) || JSON.stringify({ still, moved, x: e.x - pl.x, frozen: e.frozen, state: e.state, torch: pl.torch });
}));
await g(() => { const G = window.__game, w = G.world; G.step(3, { aimX: window.__u.x, aimZ: window.__u.z }); });
await p.screenshot({ path: `${out}/8-unlit.png` });
check('forcing the hatch goes down a layer with everything carried', await g(async () => {
  const G = window.__game, w = G.world, pl = w.player; window.__u.dead = true;
  const h = w.props.find((q) => q.kind === 'hatch'); pl.x = h.x + 1.6; pl.z = h.z; const sal = pl.salvage;
  G.step(3, { interact: true });
  return w.outcome === 'descend' && sal > 0;
}));
await p.evaluate(() => { const G = window.__game; G.step(1); });
await p.evaluate(() => window.__game.hold());
// let the real loop pick the outcome up
await p.evaluate(() => { document.querySelector('.overlay').innerHTML = ''; });
await p.keyboard.press('Escape');
await p.waitForFunction(() => window.__game.world.depth === 2, null, { timeout: 20000 }).then(() => check('layer two is built', true), () => check('layer two is built', false));
await p.evaluate(() => window.__game.hold());
await g(() => window.__game.step(20));
await p.screenshot({ path: `${out}/9-interior.png` });
check('the lift brings the haul home and a day passes', await g(() => {
  const G = window.__game, w = G.world, pl = w.player; pl.invuln = 9999;
  const l = w.props.find((q) => q.kind === 'lift'); pl.x = l.x + 1.5; pl.z = l.z;
  G.step(3, { interact: true }); G.step(60 * 8);
  return w.outcome === 'extracted';
}));
await p.keyboard.press('Escape');
await p.waitForSelector('.base', { timeout: 20000 }).then(() => check('base screen appears', true), () => check('base screen appears', false));
await p.screenshot({ path: `${out}/10-base.png`, fullPage: true });
check('salvage was banked', await g(() => window.__game.camp.salvage > 0 && window.__game.camp.day === 2));
// a death: the operative is lost, the gear stays below
await p.click('text=Descend to The Threshold');
await p.waitForFunction(() => window.__game.world && window.__game.world.time < 1 && !document.querySelector('.base'), null, { timeout: 20000 });
await p.evaluate(() => window.__game.hold());
const before = await g(() => window.__game.camp.roster.filter((x) => x.alive).length);
await g(() => { const G = window.__game, w = G.world; w.cause = 'a test'; w.player.hp = 0; w.player.state = 'dead'; w.outcome = 'dead'; });
await p.keyboard.press('Escape');
await p.waitForSelector('.base', { timeout: 30000 });
check('a death takes a name off the roster and leaves the gear below', await g((n) => { const c = window.__game.camp; return c.roster.filter((x) => x.alive).length === n - 1 && c.fallen.length === 1 && c.hope < 62; }, before));
await p.screenshot({ path: `${out}/11-base-after-death.png`, fullPage: true });
// the bottom: the Tender, the door, an ending, and the next expedition finding this one
await g(() => { window.__game.camp.deepest = 4; });
await p.click('text=Let a day pass');
await p.click('text=Descend to The Vault');
await p.waitForFunction(() => window.__game.world && window.__game.world.depth === 4, null, { timeout: 20000 });
await p.evaluate(() => window.__game.hold());
await g(() => { const G = window.__game, w = G.world, pl = w.player; pl.invuln = 9999; pl.x = w.boss.x - 4; pl.z = w.boss.z; G.step(150, { aimX: w.boss.x, aimZ: w.boss.z }); });
await p.screenshot({ path: `${out}/12-tender.png` });
check('the Tender dies and the door opens', await g(() => { const G = window.__game, w = G.world, pl = w.player; w.boss.hp = 1; for (let i = 0; i < 60 && !w.boss.dead; i++) G.step(2, { aimX: w.boss.x, aimZ: w.boss.z, attack: true, mx: w.boss.x - pl.x, mz: w.boss.z - pl.z }); const d = w.props.find((q) => q.kind === 'door'); pl.x = d.x - 1.6; pl.z = d.z; G.step(12); G.step(3, { interact: true }); return (w.boss.dead && w.outcome === 'won') || JSON.stringify({ dead: w.boss.dead, hp: w.boss.hp, out: w.outcome, prompt: w.prompt, d: Math.hypot(w.boss.x - pl.x, w.boss.z - pl.z), state: pl.state }); }));
await p.keyboard.press('Escape');
await p.waitForSelector('text=Tend the lock', { timeout: 30000 });
await p.screenshot({ path: `${out}/13-vault.png` });
await p.click('text=Tend the lock');
await p.waitForSelector('text=REINFORCEMENT', { timeout: 10000 });
await p.screenshot({ path: `${out}/14-ending.png` });
await p.click('text=Follow the signal again');
await p.waitForFunction(() => window.__game.camp && window.__game.camp.expedition === 2 && window.__game.world.depth === 1, null, { timeout: 20000 });
check('the next expedition finds the last one', await g(() => window.__game.camp.prior?.n === 1 && window.__game.world.props.some((q) => q.kind === 'camp')));
console.log(errors.length ? errors.slice(0, 6).join('\n') : 'no errors');
await b.close();
site.close();
