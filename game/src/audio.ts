// All sound is synthesised. Recipes are data: layers of swept tones and
// filtered noise. There is no score; the plants are the soundtrack.

import type { World } from './state';

type Layer =
  | { tone: OscillatorType; f0: number; f1: number; dur: number; vol: number; at?: number; attack?: number; vib?: number }
  | { noise: BiquadFilterType; f0: number; f1: number; dur: number; vol: number; at?: number; q?: number; attack?: number };

const RECIPES: Record<string, Layer[]> = {
  swing: [{ noise: 'bandpass', f0: 700, f1: 2600, dur: 0.13, vol: 0.35, q: 1.2 }],
  swingHeavy: [{ noise: 'bandpass', f0: 350, f1: 1800, dur: 0.22, vol: 0.5, q: 1 }],
  thunk: [{ tone: 'sine', f0: 170, f1: 55, dur: 0.12, vol: 0.7 }, { noise: 'lowpass', f0: 2400, f1: 500, dur: 0.06, vol: 0.4 }],
  shot: [{ noise: 'lowpass', f0: 5000, f1: 500, dur: 0.18, vol: 0.9 }, { tone: 'square', f0: 190, f1: 45, dur: 0.14, vol: 0.5 }],
  shotgun: [{ noise: 'lowpass', f0: 3500, f1: 300, dur: 0.34, vol: 1 }, { tone: 'square', f0: 120, f1: 35, dur: 0.25, vol: 0.6 }],
  click: [{ tone: 'square', f0: 1900, f1: 1500, dur: 0.025, vol: 0.2 }],
  hurt: [{ tone: 'sawtooth', f0: 230, f1: 80, dur: 0.22, vol: 0.55 }, { noise: 'lowpass', f0: 1800, f1: 300, dur: 0.15, vol: 0.5 }],
  kill: [{ tone: 'sine', f0: 150, f1: 40, dur: 0.2, vol: 0.7 }, { noise: 'lowpass', f0: 1600, f1: 200, dur: 0.3, vol: 0.45 }],
  pop: [{ tone: 'sine', f0: 640, f1: 180, dur: 0.07, vol: 0.4 }, { noise: 'highpass', f0: 2000, f1: 3000, dur: 0.04, vol: 0.2 }],
  boom: [{ noise: 'lowpass', f0: 900, f1: 80, dur: 0.8, vol: 1 }, { tone: 'sine', f0: 85, f1: 28, dur: 0.6, vol: 0.9 }],
  slam: [{ noise: 'lowpass', f0: 600, f1: 90, dur: 0.45, vol: 0.9 }, { tone: 'sine', f0: 70, f1: 30, dur: 0.4, vol: 0.9 }],
  stir: [{ noise: 'bandpass', f0: 2600, f1: 4200, dur: 0.7, vol: 0.2, q: 2, attack: 0.25 }],
  shriek: [{ tone: 'sawtooth', f0: 520, f1: 1500, dur: 0.5, vol: 0.4, vib: 30 }, { tone: 'sawtooth', f0: 1500, f1: 380, dur: 0.9, vol: 0.4, at: 0.45, vib: 45 }, { noise: 'bandpass', f0: 2000, f1: 900, dur: 1.3, vol: 0.25, q: 3 }],
  growl: [{ tone: 'sawtooth', f0: 82, f1: 58, dur: 0.5, vol: 0.4, vib: 18 }],
  hiss: [{ noise: 'highpass', f0: 2500, f1: 5000, dur: 0.35, vol: 0.3, attack: 0.1 }],
  spit: [{ tone: 'sine', f0: 520, f1: 190, dur: 0.16, vol: 0.4 }, { noise: 'bandpass', f0: 1200, f1: 600, dur: 0.12, vol: 0.3 }],
  coin: [{ tone: 'sine', f0: 1250, f1: 1250, dur: 0.05, vol: 0.22 }, { tone: 'sine', f0: 1880, f1: 1880, dur: 0.09, vol: 0.2, at: 0.05 }],
  pickup: [{ tone: 'triangle', f0: 620, f1: 980, dur: 0.12, vol: 0.3 }],
  equip: [{ tone: 'square', f0: 240, f1: 180, dur: 0.06, vol: 0.3 }, { noise: 'highpass', f0: 3000, f1: 1500, dur: 0.08, vol: 0.25 }],
  medkit: [{ tone: 'triangle', f0: 380, f1: 760, dur: 0.3, vol: 0.35 }],
  dodge: [{ noise: 'lowpass', f0: 500, f1: 1500, dur: 0.2, vol: 0.4 }],
  relic: [{ tone: 'sine', f0: 440, f1: 440, dur: 1.6, vol: 0.3, attack: 0.3 }, { tone: 'sine', f0: 660, f1: 660, dur: 1.6, vol: 0.25, attack: 0.5 }, { tone: 'sine', f0: 990, f1: 990, dur: 1.6, vol: 0.18, attack: 0.7 }],
  charge: [{ tone: 'sine', f0: 180, f1: 900, dur: 0.95, vol: 0.4, attack: 0.5 }],
  winch: [{ tone: 'sawtooth', f0: 52, f1: 58, dur: 1.2, vol: 0.5, vib: 9 }, { noise: 'bandpass', f0: 700, f1: 900, dur: 1.2, vol: 0.2, q: 6 }],
  hatch: [{ noise: 'lowpass', f0: 1200, f1: 100, dur: 0.7, vol: 1 }, { tone: 'square', f0: 110, f1: 70, dur: 0.4, vol: 0.5 }],
  lash: [{ noise: 'bandpass', f0: 3000, f1: 900, dur: 0.12, vol: 0.5, q: 2 }, { tone: 'sine', f0: 300, f1: 120, dur: 0.1, vol: 0.4 }],
  grab: [{ tone: 'sawtooth', f0: 110, f1: 190, dur: 0.25, vol: 0.4 }, { noise: 'lowpass', f0: 600, f1: 1400, dur: 0.25, vol: 0.3 }],
  puff: [{ noise: 'lowpass', f0: 700, f1: 250, dur: 0.5, vol: 0.4, attack: 0.1 }],
  cutdown: [{ noise: 'bandpass', f0: 1800, f1: 500, dur: 0.3, vol: 0.5, q: 1 }],
  smash: [{ noise: 'highpass', f0: 1500, f1: 4000, dur: 0.22, vol: 0.5 }, { tone: 'triangle', f0: 900, f1: 300, dur: 0.1, vol: 0.3 }],
  throw: [{ noise: 'bandpass', f0: 500, f1: 1500, dur: 0.18, vol: 0.3, q: 1 }],
  stabilise: [{ tone: 'square', f0: 110, f1: 440, dur: 0.3, vol: 0.4 }, { noise: 'lowpass', f0: 300, f1: 2000, dur: 0.4, vol: 0.5 }],
  death: [{ tone: 'sawtooth', f0: 200, f1: 30, dur: 1.4, vol: 0.6 }, { noise: 'lowpass', f0: 800, f1: 60, dur: 1.4, vol: 0.5 }],
  unlit: [{ tone: 'sine', f0: 60, f1: 30, dur: 0.9, vol: 1 }, { noise: 'bandpass', f0: 300, f1: 100, dur: 0.7, vol: 0.5, q: 4 }],
  step: [{ noise: 'lowpass', f0: 500, f1: 200, dur: 0.05, vol: 0.12 }],
  voice: [{ tone: 'triangle', f0: 1, f1: 0.94, dur: 0.22, vol: 0.2, attack: 0.04 }],
  heart: [{ tone: 'sine', f0: 60, f1: 40, dur: 0.12, vol: 0.8 }, { tone: 'sine', f0: 55, f1: 38, dur: 0.12, vol: 0.5, at: 0.22 }],
};

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];

export class Audio {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private wet!: GainNode;
  private noise!: AudioBuffer;
  private voiceT = 0; private stepD = 0; private heartT = 0;
  muted = false;

  /** Browsers only allow sound after a click. */
  start(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    const comp = ctx.createDynamicsCompressor();
    this.out = ctx.createGain(); this.out.gain.value = 0.55;
    this.out.connect(comp); comp.connect(ctx.destination);
    // a long stone room
    const len = ctx.sampleRate * 2.4, imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const verb = ctx.createConvolver(); verb.buffer = imp;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.5;
    this.wet.connect(verb); verb.connect(this.out);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // the hum of the place
    for (const f of [54.5, 55.2, 82]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = f > 60 ? 0.012 : 0.03; o.connect(g); g.connect(this.out); o.start(); }
  }

  play(name: string, vol = 1, pitch = 1): void {
    const ctx = this.ctx, layers = RECIPES[name];
    if (!ctx || !layers || this.muted || vol <= 0.01) return;
    for (const l of layers) {
      const t0 = ctx.currentTime + (l.at ?? 0), g = ctx.createGain();
      const peak = l.vol * vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + (l.attack ?? 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + l.dur);
      g.connect(this.out); g.connect(this.wet);
      if ('tone' in l) {
        const o = ctx.createOscillator();
        o.type = l.tone;
        o.frequency.setValueAtTime(l.f0 * pitch, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, l.f1 * pitch), t0 + l.dur);
        if (l.vib) { const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = l.vib; vg.gain.value = l.f0 * 0.06; v.connect(vg); vg.connect(o.frequency); v.start(t0); v.stop(t0 + l.dur); }
        o.connect(g); o.start(t0); o.stop(t0 + l.dur + 0.02);
      } else {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
        s.buffer = this.noise; s.loop = true;
        f.type = l.noise; f.Q.value = l.q ?? 0.7;
        f.frequency.setValueAtTime(l.f0 * pitch, t0);
        f.frequency.exponentialRampToValueAtTime(Math.max(30, l.f1 * pitch), t0 + l.dur);
        s.connect(f); f.connect(g); s.start(t0, Math.random()); s.stop(t0 + l.dur + 0.02);
      }
    }
  }

  /** A sound somewhere in the world: quieter with distance, and sharper when the torch is off. */
  at(w: World, name: string, x: number, z: number, vol = 1): void {
    const d = Math.hypot(x - w.player.x, z - w.player.z);
    this.play(name, vol * Math.max(0, 1 - d / (w.player.torch ? 30 : 38)) ** 1.5);
  }

  update(w: World, dt: number): void {
    if (!this.ctx) return;
    const p = w.player;
    // footsteps from the stride
    if (p.moving > 0 && p.state !== 'dodge') { if (p.moving - this.stepD > 1.5) { this.stepD = p.moving; this.play('step', 1, 0.9 + Math.random() * 0.3); } } else this.stepD = 0;
    // the plants sing: loose, uneven, and faster and higher when awake
    this.voiceT -= dt;
    if (this.voiceT <= 0) {
      this.voiceT = 0.16 + Math.random() * 0.5;
      const near = w.plants.filter((q) => !q.dead && Math.hypot(q.x - p.x, q.z - p.z) < 16);
      if (near.length) {
        const q = near[Math.floor(Math.random() * near.length)];
        const awake = q.mood !== 'asleep';
        if (awake || Math.random() < 0.45) {
          const s = w.camp.species[q.sp];
          const note = 110 * Math.pow(2, (SCALE[(s.glow + q.id) % SCALE.length] + (s.id % 3) * 12 + (awake ? 12 : 0)) / 12);
          RECIPES.voice[0] = { tone: (['triangle', 'sine', 'square'] as const)[s.id % 3], f0: note, f1: note * (0.9 + (s.id % 4) * 0.05), dur: 0.12 + (s.id % 5) * 0.07, vol: s.id % 3 === 2 ? 0.07 : 0.16, attack: 0.02 + (s.id % 3) * 0.03 };
          this.at(w, 'voice', q.x, q.z, (awake ? 1.3 : 0.6) * (p.torch ? 1 : 1.6));
        }
      }
    }
    if (p.hp < p.maxHp * 0.3 && p.state !== 'dead') { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 0.85; this.play('heart', 0.8); } }
  }
}
