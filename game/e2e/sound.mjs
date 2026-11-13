// Nobody here can listen, so every sound is rendered offline and measured:
// how loud, how long, roughly how bright, and whether a busy moment clips.
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const { chromium } = createRequire('/')('/opt/node-tools/node_modules/playwright/index.js');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
p.setDefaultTimeout(180000);
const site = await serve('?debug&low');
await p.goto(site.url);
await p.waitForFunction(() => window.__game?.booted);
const out = await p.evaluate(async () => {
  const G = window.__game, SR = 44100;
  const measure = (buf) => {
    const l = buf.getChannelData(0), r = buf.getChannelData(1);
    let peak = 0, first = -1, last = 0, sum = 0, n = 0, zc = 0, side = 0;
    for (let i = 0; i < l.length; i++) {
      const v = Math.max(Math.abs(l[i]), Math.abs(r[i]));
      if (v > peak) peak = v;
      if (v > 0.003) { if (first < 0) first = i; last = i; sum += l[i] * l[i] + r[i] * r[i]; n += 2; side += Math.abs(l[i] - r[i]); }
      if (i && (l[i] >= 0) !== (l[i - 1] >= 0)) zc++;
    }
    return { peak: +peak.toFixed(3), rms: +(Math.sqrt(sum / Math.max(1, n))).toFixed(3), secs: +((last - Math.max(0, first)) / SR).toFixed(2), bright: Math.round(zc / 2 / (l.length / SR)), wide: +(side / Math.max(1, n)).toFixed(3) };
  };
  const one = async (name, secs = 4) => { const ctx = new OfflineAudioContext(2, SR * secs, SR); const a = new G.Audio(); a.volume = 0.55; a.start(ctx); a.solo(); a.play(name); return measure(await ctx.startRendering()); };
  const sounds = {};
  for (const name of Object.keys(G.RECIPES)) sounds[name] = await one(name, name === 'death' || name === 'rumble' ? 6 : 4.5);
  const voices = [];
  for (let v = 0; v < 6; v++) { const ctx = new OfflineAudioContext(2, SR * 3, SR); const a = new G.Audio(); a.start(ctx); a.solo(); a.testVoice(v, 196); voices.push(measure(await ctx.startRendering())); }
  const beds = {};
  for (const d of [1, 2, 3, 4]) { const ctx = new OfflineAudioContext(2, SR * 8, SR); const a = new G.Audio(); a.start(ctx); a.setLayer(d); beds[d] = measure(await ctx.startRendering()); }
  // a bad moment: a fight, a shot, a scream and an explosion in the same half second
  const ctx = new OfflineAudioContext(2, SR * 4, SR); const a = new G.Audio(); a.start(ctx);
  for (const s of ['shot', 'boom', 'shriek', 'thunk', 'hurt', 'slam', 'growl', 'swingHeavy', 'kill', 'smash', 'shotgun', 'stabilise']) a.play(s);
  const busy = measure(await ctx.startRendering());
  return { sounds, beds, busy, voices };
});
import { writeFileSync } from 'node:fs';
if (process.env.SOUND_JSON) writeFileSync(process.env.SOUND_JSON, JSON.stringify(out));
const rows = Object.entries(out.sounds).sort((a, c) => c[1].rms - a[1].rms);
console.log('sound            peak   rms   secs  bright(Hz)');
for (const [n, m] of rows) console.log(`${n.padEnd(14)} ${String(m.peak).padStart(6)} ${String(m.rms).padStart(6)} ${String(m.secs).padStart(5)} ${String(m.bright).padStart(6)}`);
console.log('plant voices (peak):', out.voices.map((v) => v.peak).join(' '), '| bright:', out.voices.map((v) => v.bright).join(' '));
console.log('beds', JSON.stringify(out.beds));
console.log('busy moment', JSON.stringify(out.busy));
const bad = rows.filter(([, m]) => m.peak > 0.97 || m.peak < 0.02 || m.secs < 0.01);
console.log(bad.length ? `OUT OF RANGE: ${bad.map(([n, m]) => `${n} (peak ${m.peak})`).join(', ')}` : `all ${rows.length} sounds within range`);
console.log(out.busy.peak <= 1 ? 'busy moment does not clip' : `BUSY MOMENT CLIPS at ${out.busy.peak}`);
await b.close();
site.close();
