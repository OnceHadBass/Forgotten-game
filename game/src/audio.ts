// All sound is synthesised: layers of swept and frequency-modulated tones and
// filtered noise, placed in stereo, dulled by distance and by stone, and sent
// into a long stone reverb. There is no score. The place has a hum, the plants
// have voices dealt per campaign in a shared key, and a few moments get a
// stinger.

import { los } from './level';
import type { World } from './state';

type Tone = { tone: OscillatorType; f0: number; f1?: number; dur: number; vol: number; at?: number; attack?: number; vib?: number; depth?: number; fm?: [number, number] };
type Noise = { noise: BiquadFilterType; f0: number; f1?: number; q?: number; dur: number; vol: number; at?: number; attack?: number };
type Layer = Tone | Noise;
interface Recipe { layers: Layer[]; send?: number; drive?: number; vary?: number }

const R = (layers: Layer[], send = 0.25, vary = 0.05, drive = 0): Recipe => ({ layers, send, vary, drive });

export const RECIPES: Record<string, Recipe> = {
  // the operative
  step: R([{ noise: 'lowpass', f0: 420, f1: 160, dur: 0.07, vol: 0.2 }, { noise: 'highpass', f0: 2600, f1: 4200, dur: 0.035, vol: 0.05, at: 0.012 }], 0.3, 0.14),
  swing: R([{ noise: 'bandpass', f0: 600, f1: 3000, q: 1.4, dur: 0.14, vol: 0.4, attack: 0.03 }, { noise: 'highpass', f0: 5000, f1: 2500, dur: 0.09, vol: 0.1, at: 0.04 }], 0.2, 0.08),
  swingHeavy: R([{ noise: 'bandpass', f0: 260, f1: 1700, q: 1.1, dur: 0.26, vol: 0.55, attack: 0.07 }, { tone: 'sine', f0: 130, f1: 70, dur: 0.2, vol: 0.2, at: 0.05 }], 0.25, 0.06),
  thunk: R([{ tone: 'sine', f0: 190, f1: 52, dur: 0.14, vol: 0.75 }, { noise: 'lowpass', f0: 3000, f1: 420, dur: 0.07, vol: 0.5 }, { noise: 'bandpass', f0: 1100, f1: 500, q: 2, dur: 0.12, vol: 0.3, at: 0.01 }], 0.22, 0.1, 2.5),
  shot: R([{ noise: 'highpass', f0: 3000, f1: 6000, dur: 0.02, vol: 0.9 }, { noise: 'lowpass', f0: 5200, f1: 380, dur: 0.2, vol: 0.9 }, { tone: 'square', f0: 210, f1: 42, dur: 0.16, vol: 0.5 }, { noise: 'lowpass', f0: 900, f1: 200, dur: 0.7, vol: 0.2, at: 0.05 }], 0.6, 0.05, 3),
  shotgun: R([{ noise: 'highpass', f0: 2500, f1: 5000, dur: 0.03, vol: 1 }, { noise: 'lowpass', f0: 3800, f1: 260, dur: 0.36, vol: 1 }, { tone: 'square', f0: 130, f1: 32, dur: 0.28, vol: 0.65 }, { noise: 'lowpass', f0: 700, f1: 150, dur: 1.0, vol: 0.25, at: 0.08 }], 0.7, 0.05, 4),
  click: R([{ tone: 'square', f0: 2100, f1: 1500, dur: 0.02, vol: 0.2 }, { noise: 'highpass', f0: 4000, dur: 0.015, vol: 0.12 }], 0.1),
  dodge: R([{ noise: 'lowpass', f0: 380, f1: 1700, dur: 0.22, vol: 0.4, attack: 0.05 }, { noise: 'lowpass', f0: 300, f1: 120, dur: 0.1, vol: 0.3, at: 0.2 }], 0.2, 0.08),
  hurt: R([{ tone: 'sawtooth', f0: 250, f1: 85, dur: 0.24, vol: 0.5 }, { noise: 'lowpass', f0: 2000, f1: 280, dur: 0.16, vol: 0.55 }, { tone: 'sine', f0: 90, f1: 45, dur: 0.2, vol: 0.5 }], 0.2, 0.1, 3),
  stabilise: R([{ tone: 'square', f0: 110, f1: 660, dur: 0.32, vol: 0.35 }, { noise: 'lowpass', f0: 260, f1: 2600, dur: 0.42, vol: 0.5, attack: 0.2 }, { tone: 'sine', f0: 880, f1: 880, dur: 0.5, vol: 0.2, at: 0.3 }], 0.4),
  medkit: R([{ noise: 'highpass', f0: 3000, f1: 1200, dur: 0.18, vol: 0.2 }, { tone: 'triangle', f0: 390, f1: 780, dur: 0.34, vol: 0.3, attack: 0.05 }], 0.2),
  heart: R([{ tone: 'sine', f0: 62, f1: 40, dur: 0.13, vol: 0.9 }, { tone: 'sine', f0: 56, f1: 38, dur: 0.13, vol: 0.55, at: 0.22 }], 0.05, 0),
  death: R([{ tone: 'sine', f0: 110, f1: 104, dur: 3.2, vol: 0.6, fm: [2.76, 3] }, { tone: 'sawtooth', f0: 180, f1: 28, dur: 1.6, vol: 0.4 }, { noise: 'lowpass', f0: 700, f1: 50, dur: 1.8, vol: 0.5 }], 0.8, 0),
  // things picked up and used
  coin: R([{ tone: 'sine', f0: 1320, dur: 0.06, vol: 0.2, fm: [3.01, 1.2] }, { tone: 'sine', f0: 1980, dur: 0.12, vol: 0.18, at: 0.05, fm: [2.5, 0.8] }], 0.3, 0.08),
  pickup: R([{ tone: 'triangle', f0: 620, f1: 990, dur: 0.13, vol: 0.28 }, { noise: 'highpass', f0: 3500, dur: 0.03, vol: 0.08 }], 0.25, 0.06),
  equip: R([{ tone: 'square', f0: 230, f1: 170, dur: 0.06, vol: 0.3 }, { noise: 'highpass', f0: 2800, f1: 1400, dur: 0.09, vol: 0.28 }, { tone: 'sine', f0: 700, f1: 700, dur: 0.08, vol: 0.12, at: 0.07, fm: [3.5, 1] }], 0.2),
  throw: R([{ noise: 'bandpass', f0: 420, f1: 1700, q: 1.2, dur: 0.2, vol: 0.32, attack: 0.04 }], 0.2, 0.08),
  relic: R([{ tone: 'sine', f0: 440, dur: 2.4, vol: 0.22, attack: 0.3 }, { tone: 'sine', f0: 660, dur: 2.4, vol: 0.18, attack: 0.55 }, { tone: 'sine', f0: 990, dur: 2.4, vol: 0.13, attack: 0.8 }, { tone: 'sine', f0: 1760, dur: 1.2, vol: 0.06, fm: [1.5, 2], at: 0.05 }], 0.8, 0),
  // the ruin and what grows in it
  stir: R([{ noise: 'bandpass', f0: 2400, f1: 4600, q: 2.5, dur: 0.75, vol: 0.22, attack: 0.28 }, { noise: 'highpass', f0: 6000, dur: 0.4, vol: 0.06, at: 0.3, attack: 0.1 }], 0.5, 0.15),
  shriek: R([{ tone: 'sawtooth', f0: 500, f1: 1550, dur: 0.5, vol: 0.4, vib: 31, depth: 0.07 }, { tone: 'sawtooth', f0: 1550, f1: 360, dur: 1.0, vol: 0.4, at: 0.45, vib: 47, depth: 0.09 }, { tone: 'square', f0: 760, f1: 2300, dur: 0.5, vol: 0.12, vib: 23, depth: 0.1 }, { noise: 'bandpass', f0: 2200, f1: 800, q: 3, dur: 1.4, vol: 0.25 }], 0.9, 0.12, 2),
  lash: R([{ noise: 'bandpass', f0: 3400, f1: 800, q: 2, dur: 0.13, vol: 0.55 }, { tone: 'sine', f0: 320, f1: 110, dur: 0.11, vol: 0.4 }], 0.3, 0.1),
  grab: R([{ tone: 'sawtooth', f0: 100, f1: 200, dur: 0.28, vol: 0.4 }, { noise: 'lowpass', f0: 500, f1: 1500, dur: 0.28, vol: 0.32 }, { noise: 'bandpass', f0: 900, f1: 300, q: 4, dur: 0.4, vol: 0.2, at: 0.15 }], 0.3, 0.08),
  puff: R([{ noise: 'lowpass', f0: 800, f1: 220, dur: 0.6, vol: 0.4, attack: 0.12 }, { noise: 'bandpass', f0: 2600, f1: 1200, q: 1, dur: 0.4, vol: 0.1, attack: 0.1 }], 0.5, 0.1),
  cutdown: R([{ noise: 'bandpass', f0: 2000, f1: 450, q: 1, dur: 0.32, vol: 0.5 }, { noise: 'highpass', f0: 5000, f1: 3000, dur: 0.2, vol: 0.12, at: 0.05 }, { tone: 'sine', f0: 150, f1: 70, dur: 0.15, vol: 0.2 }], 0.3, 0.12),
  smash: R([{ noise: 'highpass', f0: 1600, f1: 4500, dur: 0.24, vol: 0.5 }, { tone: 'triangle', f0: 980, f1: 310, dur: 0.1, vol: 0.3, fm: [2.4, 2] }, { tone: 'triangle', f0: 1700, f1: 900, dur: 0.18, vol: 0.12, at: 0.06, fm: [3.1, 2] }, { noise: 'lowpass', f0: 500, f1: 150, dur: 0.15, vol: 0.4 }], 0.45, 0.12),
  boom: R([{ noise: 'lowpass', f0: 1000, f1: 70, dur: 0.9, vol: 1 }, { tone: 'sine', f0: 90, f1: 26, dur: 0.7, vol: 0.9 }, { noise: 'highpass', f0: 2000, f1: 5000, dur: 0.06, vol: 0.5 }], 0.7, 0.08, 4),
  hatch: R([{ noise: 'lowpass', f0: 1300, f1: 90, dur: 0.8, vol: 1 }, { tone: 'square', f0: 112, f1: 66, dur: 0.45, vol: 0.5, fm: [1.41, 4] }, { tone: 'sine', f0: 320, f1: 300, dur: 1.4, vol: 0.2, at: 0.1, fm: [2.7, 3] }], 0.9, 0, 3),
  winch: R([{ tone: 'sawtooth', f0: 50, f1: 58, dur: 1.3, vol: 0.45, vib: 9, depth: 0.1 }, { noise: 'bandpass', f0: 640, f1: 900, q: 7, dur: 1.3, vol: 0.2 }, { tone: 'square', f0: 900, f1: 880, dur: 0.05, vol: 0.12, at: 0.3 }, { tone: 'square', f0: 900, f1: 880, dur: 0.05, vol: 0.12, at: 0.9 }], 0.6),
  pulse: R([{ tone: 'sine', f0: 46, f1: 92, dur: 3.0, vol: 0.7, attack: 1.1 }, { tone: 'sine', f0: 330, f1: 495, dur: 2.6, vol: 0.1, attack: 1.3 }, { tone: 'sine', f0: 660, f1: 990, dur: 2.2, vol: 0.05, attack: 1.4, fm: [1.5, 1] }, { noise: 'lowpass', f0: 200, f1: 900, dur: 2.6, vol: 0.2, attack: 1.2 }], 0.9, 0),
  drip: R([{ tone: 'sine', f0: 1500, f1: 900, dur: 0.07, vol: 0.2 }, { tone: 'sine', f0: 2600, f1: 2200, dur: 0.04, vol: 0.08, at: 0.03 }], 0.95, 0.35),
  rumble: R([{ noise: 'lowpass', f0: 90, f1: 45, dur: 3.5, vol: 0.8, attack: 1.2 }, { tone: 'sine', f0: 38, f1: 30, dur: 3.2, vol: 0.5, attack: 1 }], 0.6, 0.2),
  creak: R([{ tone: 'sawtooth', f0: 140, f1: 96, dur: 0.9, vol: 0.14, vib: 13, depth: 0.2 }, { noise: 'bandpass', f0: 700, f1: 420, q: 9, dur: 0.9, vol: 0.2, attack: 0.2 }], 0.95, 0.3),
  far: R([{ tone: 'sawtooth', f0: 210, f1: 330, dur: 1.2, vol: 0.1, attack: 0.4, vib: 6, depth: 0.05 }, { tone: 'sawtooth', f0: 330, f1: 150, dur: 1.4, vol: 0.1, at: 1.1 }], 1, 0.3),
  wonder: R([{ tone: 'sine', f0: 392, dur: 3.2, vol: 0.14, attack: 0.6 }, { tone: 'sine', f0: 587.3, dur: 3.2, vol: 0.12, attack: 0.9 }, { tone: 'sine', f0: 880, dur: 3.0, vol: 0.09, attack: 1.2 }, { tone: 'sine', f0: 1318.5, dur: 2.4, vol: 0.05, attack: 1.4, fm: [2, 0.6] }], 1, 0),
  // what hunts
  growl: R([{ tone: 'sawtooth', f0: 84, f1: 56, dur: 0.6, vol: 0.4, vib: 21, depth: 0.25, fm: [0.5, 2] }, { noise: 'bandpass', f0: 500, f1: 300, q: 3, dur: 0.6, vol: 0.2, attack: 0.1 }], 0.4, 0.15, 2),
  hiss: R([{ noise: 'highpass', f0: 2400, f1: 5200, dur: 0.4, vol: 0.3, attack: 0.12 }, { noise: 'bandpass', f0: 3200, f1: 1800, q: 5, dur: 0.4, vol: 0.2, attack: 0.1 }], 0.3, 0.15),
  kill: R([{ tone: 'sine', f0: 160, f1: 38, dur: 0.24, vol: 0.7 }, { noise: 'lowpass', f0: 1700, f1: 180, dur: 0.34, vol: 0.5 }, { tone: 'sawtooth', f0: 300, f1: 90, dur: 0.3, vol: 0.2, vib: 30, depth: 0.2 }], 0.35, 0.12, 2),
  pop: R([{ tone: 'sine', f0: 660, f1: 170, dur: 0.07, vol: 0.4 }, { noise: 'highpass', f0: 2200, f1: 3200, dur: 0.04, vol: 0.22 }], 0.25, 0.2),
  chitter: R([{ tone: 'square', f0: 2300, f1: 1900, dur: 0.018, vol: 0.1 }, { tone: 'square', f0: 2700, f1: 2100, dur: 0.018, vol: 0.1, at: 0.045 }, { tone: 'square', f0: 2100, f1: 1700, dur: 0.018, vol: 0.1, at: 0.085 }, { tone: 'square', f0: 2500, f1: 2000, dur: 0.018, vol: 0.08, at: 0.14 }], 0.3, 0.25),
  spit: R([{ tone: 'sine', f0: 540, f1: 180, dur: 0.18, vol: 0.4 }, { noise: 'bandpass', f0: 1300, f1: 550, q: 2, dur: 0.14, vol: 0.32 }, { noise: 'lowpass', f0: 400, f1: 900, dur: 0.1, vol: 0.2, at: 0.02 }], 0.3, 0.1),
  slam: R([{ noise: 'lowpass', f0: 650, f1: 80, dur: 0.5, vol: 0.9 }, { tone: 'sine', f0: 74, f1: 28, dur: 0.45, vol: 0.9 }, { noise: 'highpass', f0: 1800, f1: 3500, dur: 0.05, vol: 0.3 }], 0.55, 0.06, 3),
  huskStep: R([{ tone: 'sine', f0: 70, f1: 38, dur: 0.16, vol: 0.6 }, { noise: 'lowpass', f0: 300, f1: 110, dur: 0.12, vol: 0.4 }], 0.5, 0.12),
  patter: R([{ noise: 'lowpass', f0: 700, f1: 300, dur: 0.035, vol: 0.14 }], 0.3, 0.2),
  whisper: R([{ noise: 'bandpass', f0: 1800, f1: 3400, q: 6, dur: 0.7, vol: 0.14, attack: 0.55 }, { noise: 'bandpass', f0: 900, f1: 1500, q: 9, dur: 0.7, vol: 0.1, attack: 0.5 }], 0.9, 0.3),
  unlit: R([{ tone: 'sine', f0: 62, f1: 28, dur: 1.0, vol: 1 }, { noise: 'bandpass', f0: 320, f1: 90, q: 4, dur: 0.8, vol: 0.5 }, { noise: 'highpass', f0: 5000, f1: 9000, dur: 0.25, vol: 0.2 }], 0.6, 0, 3),
  tinkle: R([{ tone: 'sine', f0: 2640, dur: 0.25, vol: 0.05, fm: [2.01, 0.7] }, { tone: 'sine', f0: 3520, dur: 0.2, vol: 0.03, at: 0.07 }], 0.9, 0.2),
  charge: R([{ tone: 'sine', f0: 170, f1: 920, dur: 0.95, vol: 0.35, attack: 0.5, fm: [2, 1.5] }, { noise: 'bandpass', f0: 800, f1: 4000, q: 6, dur: 0.95, vol: 0.12, attack: 0.6 }], 0.5),
  beam: R([{ tone: 'sawtooth', f0: 220, f1: 226, dur: 0.3, vol: 0.2, fm: [3.0, 2] }, { tone: 'sine', f0: 880, f1: 884, dur: 0.3, vol: 0.12 }, { noise: 'bandpass', f0: 3000, q: 8, dur: 0.3, vol: 0.08 }], 0.5, 0.01),
  // the menus, and the few moments that get more than a noise
  ui: R([{ tone: 'triangle', f0: 760, f1: 700, dur: 0.045, vol: 0.14 }, { noise: 'highpass', f0: 5000, dur: 0.012, vol: 0.05 }], 0.05, 0.02),
  descend: R([{ tone: 'sine', f0: 196, f1: 73.4, dur: 2.4, vol: 0.4, attack: 0.2 }, { tone: 'sine', f0: 293.7, f1: 110, dur: 2.4, vol: 0.2, attack: 0.3 }, { noise: 'lowpass', f0: 900, f1: 120, dur: 2.2, vol: 0.35, attack: 0.3 }], 0.9, 0),
  extract: R([{ tone: 'sine', f0: 196, dur: 2.8, vol: 0.22, attack: 0.3 }, { tone: 'sine', f0: 293.7, dur: 2.8, vol: 0.2, attack: 0.6 }, { tone: 'sine', f0: 392, dur: 2.6, vol: 0.16, attack: 0.9 }, { tone: 'sine', f0: 587.3, dur: 2.2, vol: 0.1, attack: 1.2 }], 0.9, 0),
  boss: R([{ tone: 'sine', f0: 55, f1: 55, dur: 3.5, vol: 0.6, attack: 0.8, fm: [1.5, 2] }, { tone: 'sine', f0: 440, f1: 466, dur: 3, vol: 0.1, attack: 1.2 }, { tone: 'sine', f0: 659, f1: 622, dur: 3, vol: 0.08, attack: 1.4 }], 0.9, 0),
};

/** How loud each sound should peak, at the default volume. Trims are worked out from these by measurement (e2e/sound.mjs). */
export const TARGET: Record<string, number> = {
  step: 0.06, patter: 0.04, ui: 0.06, click: 0.06, swing: 0.2, swingHeavy: 0.28, dodge: 0.15, throw: 0.15,
  thunk: 0.34, kill: 0.34, hurt: 0.4, smash: 0.3, cutdown: 0.25, lash: 0.26, grab: 0.26, pop: 0.16, chitter: 0.1, spit: 0.2, hiss: 0.2, growl: 0.3,
  shot: 0.5, shotgun: 0.58, boom: 0.6, slam: 0.5, hatch: 0.55, shriek: 0.46, unlit: 0.46,
  coin: 0.12, pickup: 0.14, equip: 0.18, medkit: 0.2,
  relic: 0.25, wonder: 0.2, extract: 0.25, descend: 0.34, boss: 0.34, death: 0.42, pulse: 0.36,
  drip: 0.05, creak: 0.06, far: 0.06, rumble: 0.2, whisper: 0.08, tinkle: 0.05, beam: 0.2, charge: 0.3, winch: 0.25, stir: 0.12, puff: 0.15, huskStep: 0.2, heart: 0.25, stabilise: 0.3,
};
export const TRIM: Record<string, number> = { beam: 4.4, boom: 1.49, boss: 0.95, charge: 1.56, chitter: 2.06, click: 1.35, coin: 1.92, creak: 1.33, cutdown: 3.67, death: 1.13, descend: 1.18, dodge: 5.34, drip: 1.81, equip: 2.24, extract: 1.75, far: 0.97, grab: 4.87, growl: 2.09, hatch: 1.44, heart: 1.12, hiss: 0.82, hurt: 2.84, huskStep: 2.5, kill: 2.8, lash: 3.37, medkit: 1.95, patter: 14.3, pickup: 3.32, pop: 1.86, puff: 1.66, pulse: 0.8, relic: 1.65, rumble: 0.69, shot: 4.53, shotgun: 2.92, shriek: 1.04, slam: 2.52, smash: 2.16, spit: 3.02, stabilise: 2.74, step: 6.0, stir: 2.22, swing: 3.92, swingHeavy: 4.17, throw: 5.52, thunk: 4.73, tinkle: 3.12, ui: 2.48, unlit: 1.17, whisper: 3.28, winch: 2.23, wonder: 1.59 };

/** The six ways a plant can sound. Which species gets which is dealt per campaign. */
export function voice(timbre: number, hz: number): Recipe {
  switch (timbre % 6) {
    case 0: return R([{ tone: 'sine', f0: hz * 2, dur: 0.9, vol: 0.13, fm: [3.5, 2.2] }, { tone: 'sine', f0: hz * 4, dur: 0.3, vol: 0.04 }], 0.8, 0.01); // a bell that grew
    case 1: return R([{ noise: 'bandpass', f0: hz * 3, f1: hz * 4.4, q: 14, dur: 0.7, vol: 0.5, attack: 0.3 }, { noise: 'bandpass', f0: hz * 6, f1: hz * 8.6, q: 18, dur: 0.6, vol: 0.2, attack: 0.3 }], 0.7, 0.02); // breath over a reed
    case 2: return R([0, 0.07, 0.13, 0.22].map((at, i) => ({ tone: 'square' as const, f0: hz * 4 * (1 + i * 0.06), f1: hz * 3, dur: 0.022, vol: 0.09, at })), 0.6, 0.03); // clicks, like a tongue
    case 3: return R([{ tone: 'sawtooth', f0: hz, f1: hz * 0.84, dur: 0.6, vol: 0.09, vib: 11, depth: 0.18 }, { noise: 'bandpass', f0: hz * 5, f1: hz * 3.4, q: 10, dur: 0.6, vol: 0.2, attack: 0.15 }], 0.7, 0.03); // a creak
    case 4: return R([{ tone: 'sine', f0: hz * 4, f1: hz * 2, dur: 0.11, vol: 0.2 }, { tone: 'sine', f0: hz * 6, f1: hz * 4, dur: 0.06, vol: 0.07, at: 0.04 }], 0.9, 0.02); // a drop into water
    default: return R([{ tone: 'triangle', f0: hz * 2, f1: hz * 1.94, dur: 0.5, vol: 0.14, vib: 27, depth: 0.5, attack: 0.08 }], 0.7, 0.02); // a chirr
  }
}

const SCALE = [0, 3, 5, 7, 10];
/** Measured, like TRIM: each voice type peaks at about the same level. */
export const VOICE_TRIM = [1.97, 3.0, 1.34, 3.41, 2.78, 1.27];

/** What each layer sounds like when nothing is happening. */
const BEDS = [
  { drone: 55, air: [500, 1.2], airVol: 0.05, hum: 0, drips: 0.25, wind: 1 },
  { drone: 55, air: [620, 1.1], airVol: 0.06, hum: 0, drips: 0.3, wind: 1 },
  { drone: 49, air: [380, 2.5], airVol: 0.035, hum: 0, drips: 0.55, wind: 0.2 },
  { drone: 61.7, air: [900, 4], airVol: 0.03, hum: 0.05, drips: 0.08, wind: 0 },
  { drone: 73.4, air: [1400, 6], airVol: 0.02, hum: 0.08, drips: 0, wind: 0 },
];

export class Audio {
  private ctx: BaseAudioContext | null = null;
  private master!: GainNode; private world!: BiquadFilterNode; private wet!: GainNode; private bed!: GainNode;
  private noise!: AudioBuffer;
  private drones: OscillatorNode[] = []; private airF!: BiquadFilterNode; private airG!: GainNode; private humG!: GainNode;
  private last = new Map<string, number>();
  private steps = new Map<number, number>();
  private voiceT = 0; private stepD = 0; private heartT = 0; private dripT = 3; private farT = 30; private gustT = 0; private gust = 0; private beamT = 0; private chitT = 0; private whisperT = 0;
  private depth = 1; private bossHeard = false;
  muted = false;
  volume = 0.55;
  /** Every sound asked for since the last reset, for tests. */
  heard: string[] = [];

  setVolume(v: number): void { this.volume = v; if (this.ctx) this.master.gain.value = v; }

  /** Browsers only allow sound after a click. A test can pass its own (offline) context. */
  start(given?: BaseAudioContext): void {
    if (this.ctx) { if ('resume' in this.ctx) void (this.ctx as AudioContext).resume(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!given && !Ctx) return;
    const ctx = (this.ctx = given ?? new Ctx());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -9; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    this.world = ctx.createBiquadFilter(); this.world.type = 'lowpass'; this.world.frequency.value = 18000;
    // after the compressor, a soft ceiling: however much happens at once, it rounds off rather than clips
    const ceil = ctx.createWaveShaper(), cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const v = (i / 1023) * 2 - 1; cv[i] = Math.tanh(v * 1.25) / Math.tanh(1.25) * 0.94; }
    ceil.curve = cv;
    this.world.connect(this.master); this.master.connect(comp); comp.connect(ceil); ceil.connect(ctx.destination);
    // a long stone room: a few early slaps off the walls, then a tail that darkens as it dies
    const len = Math.floor(ctx.sampleRate * 3.2), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = imp.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) { const t = i / len, k = 0.5 * (1 - t) + 0.02; lp += ((Math.random() * 2 - 1) - lp) * k; d[i] = lp * Math.pow(1 - t, 2.4) * 2.2; }
      for (const ms of [11, 23, 37, 53, 71]) { const i = Math.floor((ms + c * 4) / 1000 * ctx.sampleRate); d[i] += (0.5 - ms / 200) * (c ? 1 : -1); }
    }
    const verb = ctx.createConvolver(); verb.buffer = imp;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.55;
    this.wet.connect(verb); verb.connect(this.world);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // the bed: a hum in the stone, air moving, and deeper down something running
    this.bed = ctx.createGain(); this.bed.gain.value = 0.36; this.bed.connect(this.world);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.connect(this.bed);
    for (const [mul, type, vol] of [[1, 'sawtooth', 0.05], [1.007, 'sawtooth', 0.05], [0.5, 'sine', 0.12], [1.5, 'sine', 0.02]] as const) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = 55 * mul; g.gain.value = vol;
      o.connect(g); g.connect(lp); o.start(); this.drones.push(o);
    }
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 40; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    const air = ctx.createBufferSource(); air.buffer = this.noise; air.loop = true;
    this.airF = ctx.createBiquadFilter(); this.airF.type = 'bandpass'; this.airF.frequency.value = 500; this.airF.Q.value = 1.2;
    this.airG = ctx.createGain(); this.airG.gain.value = 0.05;
    air.connect(this.airF); this.airF.connect(this.airG); this.airG.connect(this.bed); this.airG.connect(this.wet); air.start();
    this.humG = ctx.createGain(); this.humG.gain.value = 0;
    for (const f of [100, 150.3, 200.6]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = f > 120 ? 0.3 : 1; o.connect(g); g.connect(this.humG); o.start(); }
    const pulse = ctx.createOscillator(), pg = ctx.createGain(), hum2 = ctx.createGain();
    pulse.frequency.value = 0.6; pg.gain.value = 0.4; hum2.gain.value = 0.6; pulse.connect(pg); pg.connect(hum2.gain); pulse.start();
    this.humG.connect(hum2); hum2.connect(this.bed);
    this.setLayer(this.depth);
  }

  /** For measuring one voice type. */
  testVoice(timbre: number, hz: number): void { if (this.ctx) this.make(voice(timbre, hz), 1, 1, 0, 18000); }

  /** For measuring one sound at a time. */
  solo(): void { this.bed.disconnect(); this.airG.disconnect(); }

  /** Each layer has its own bed. 0 is the menus: the bed, quieter. */
  setLayer(depth: number, menu = false): void {
    this.depth = depth; this.bossHeard = false;
    if (!this.ctx) return;
    const b = BEDS[depth], t = this.ctx.currentTime;
    [1, 1.007, 0.5, 1.5].forEach((m, i) => this.drones[i].frequency.setTargetAtTime(b.drone * m, t, 1.5));
    this.airF.frequency.setTargetAtTime(b.air[0], t, 1); this.airF.Q.setTargetAtTime(b.air[1], t, 1);
    this.airG.gain.setTargetAtTime(b.airVol, t, 1); this.humG.gain.setTargetAtTime(b.hum, t, 1.5);
    this.bed.gain.setTargetAtTime(menu ? 0.2 : 0.36, t, 0.8);
    this.world.frequency.setTargetAtTime(18000, t, 0.3);
  }

  private make(rec: Recipe, vol: number, pitch: number, pan: number, cutoff: number): void {
    const ctx = this.ctx!;
    const p = pitch * (1 + (Math.random() * 2 - 1) * (rec.vary ?? 0));
    const sum = ctx.createGain();
    let out: AudioNode = sum;
    if (rec.drive) {
      // a little grit: soft clipping so impacts crunch instead of thud
      const sh = ctx.createWaveShaper(), n = 256, curve = new Float32Array(n), k = rec.drive;
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
      sh.curve = curve; sum.connect(sh); out = sh;
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    const pn = ctx.createStereoPanner(); pn.pan.value = pan;
    out.connect(lp); lp.connect(pn); pn.connect(this.world);
    const send = ctx.createGain(); send.gain.value = rec.send ?? 0.25; pn.connect(send); send.connect(this.wet);
    for (const l of rec.layers) {
      const t0 = ctx.currentTime + (l.at ?? 0), g = ctx.createGain(), peak = Math.max(0.0002, l.vol * vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + (l.attack ?? 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + l.dur);
      g.connect(sum);
      if ('tone' in l) {
        const o = ctx.createOscillator(), f0 = l.f0 * p, f1 = Math.max(18, (l.f1 ?? l.f0) * p);
        o.type = l.tone;
        o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + l.dur);
        if (l.vib) { const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = l.vib; vg.gain.value = f0 * (l.depth ?? 0.06); v.connect(vg); vg.connect(o.frequency); v.start(t0); v.stop(t0 + l.dur + 0.05); }
        if (l.fm) { const m = ctx.createOscillator(), mg = ctx.createGain(); m.frequency.value = f0 * l.fm[0]; mg.gain.setValueAtTime(f0 * l.fm[1], t0); mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f0 * l.fm[1] * 0.05), t0 + l.dur); m.connect(mg); mg.connect(o.frequency); m.start(t0); m.stop(t0 + l.dur + 0.05); }
        o.connect(g); o.start(t0); o.stop(t0 + l.dur + 0.05);
      } else {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
        s.buffer = this.noise; s.loop = true;
        f.type = l.noise; f.Q.value = l.q ?? 0.7;
        f.frequency.setValueAtTime(l.f0 * p, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, (l.f1 ?? l.f0) * p), t0 + l.dur);
        s.connect(f); f.connect(g); s.start(t0, Math.random() * 2); s.stop(t0 + l.dur + 0.05);
      }
    }
  }

  play(name: string, vol = 1, pitch = 1, pan = 0, cutoff = 18000): void {
    const rec = RECIPES[name];
    if (!rec) return;
    if (this.heard.length > 600) this.heard.length = 0;
    this.heard.push(name);
    if (!this.ctx || this.muted || vol <= 0.012) return;
    // the same sound twice in a few milliseconds is one sound, louder: skip it
    const now = this.ctx.currentTime, was = this.last.get(name) ?? -1;
    if (now - was < 0.035) return;
    this.last.set(name, now);
    this.make(rec, vol * (TRIM[name] ?? 1), pitch, pan, cutoff);
  }

  /** Where a sound is: quieter and duller with distance, panned by where it is on screen, muffled behind stone. */
  private place(w: World, x: number, z: number): { vol: number; pan: number; cutoff: number } {
    const p = w.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), reach = p.torch ? 32 : 40;
    const clear = d < 1.5 || los(w.level, p.x, p.z, x, z);
    const near = Math.max(0, 1 - d / reach);
    return { vol: near * near * (clear ? 1 : 0.55), pan: Math.max(-0.85, Math.min(0.85, (dx - dz) / 16)), cutoff: (clear ? 600 + 16000 * near * near : 350 + 900 * near) * (p.torch ? 1 : 1.3) };
  }

  at(w: World, name: string, x: number, z: number, vol = 1, pitch = 1): void {
    const s = this.place(w, x, z);
    this.play(name, vol * s.vol, pitch, s.pan, s.cutoff);
  }

  update(w: World, dt: number): void {
    if (!this.ctx) return;
    const p = w.player, bed = BEDS[this.depth], rnd = Math.random;
    // footsteps from the stride, left then right
    if (p.moving > 0 && p.state !== 'dodge') { if (p.moving - this.stepD > 1.46) { this.stepD = p.moving; this.play('step', 1, Math.floor(p.moving / 1.46) % 2 ? 0.92 : 1.06); } } else this.stepD = 0;

    // the plants: loose, uneven, in one key; faster, higher and closer-sounding when awake
    this.voiceT -= dt;
    if (this.voiceT <= 0) {
      this.voiceT = 0.14 + rnd() * 0.5;
      const near = w.plants.filter((q) => !q.dead && Math.abs(q.x - p.x) + Math.abs(q.z - p.z) < 22);
      if (near.length) {
        const q = near[Math.floor(rnd() * near.length)], awake = q.mood !== 'asleep';
        if (awake || rnd() < 0.42) {
          const s = w.camp.species[q.sp], seed = Math.abs(w.camp.seed);
          const root = 98 * Math.pow(2, (seed % 12) / 12);
          const hz = root * Math.pow(2, (SCALE[(s.id + seed) % 5] + 12 * ((s.id + (seed >> 3)) % 2) + (awake ? 7 : 0)) / 12);
          const sp = this.place(w, q.x, q.z);
          this.heard.push('voice');
          const tm = (s.id + (seed >> 5)) % 6;
          if (!this.muted && sp.vol > 0.02) this.make(voice(tm, hz), sp.vol * VOICE_TRIM[tm] * (awake ? 1.25 : 0.6) * (p.torch ? 1 : 1.5), 1, sp.pan, sp.cutoff);
        }
      }
    }

    // what walks has weight, and you hear it before you see it
    for (const e of w.enemies) {
      if (e.dead || Math.abs(e.x - p.x) + Math.abs(e.z - p.z) > 26) continue;
      const stride = e.type === 'husk' ? 1.96 : e.type === 'skulker' ? 1.2 : e.type === 'tender' ? 1.4 : 0;
      if (!stride) continue;
      const n = Math.floor(e.gait / stride), was = this.steps.get(e.id);
      if (was !== undefined && n !== was) this.at(w, e.type === 'skulker' ? 'patter' : 'huskStep', e.x, e.z, e.type === 'tender' ? 0.7 : 1, e.type === 'tender' ? 1.6 : 1);
      this.steps.set(e.id, n);
    }
    this.chitT -= dt;
    if (this.chitT <= 0) { this.chitT = 0.25 + rnd() * 0.5; const m = w.enemies.find((e) => !e.dead && e.type === 'mite' && e.state !== 'idle' && Math.abs(e.x - p.x) + Math.abs(e.z - p.z) < 14); if (m) this.at(w, 'chitter', m.x, m.z, 0.8); const gz = w.enemies.find((e) => !e.dead && e.type === 'grazer' && Math.abs(e.x - p.x) + Math.abs(e.z - p.z) < 9); if (gz && rnd() < 0.3) this.at(w, 'tinkle', gz.x, gz.z); }
    this.whisperT -= dt;
    if (this.whisperT <= 0) { this.whisperT = 0.7; const u = w.enemies.find((e) => !e.dead && e.type === 'unlit' && !e.frozen && e.state !== 'recover' && Math.hypot(e.x - p.x, e.z - p.z) < 24); if (u) this.at(w, 'whisper', u.x, u.z, 1.2); }
    const boss = w.boss;
    if (boss && !boss.dead) {
      if (boss.alert > 0 && !this.bossHeard) { this.bossHeard = true; this.play('boss'); }
      this.beamT -= dt;
      if (boss.state === 'strike' && boss.phase === 0 && this.beamT <= 0) { this.beamT = 0.22; this.at(w, 'beam', boss.x, boss.z, 1.2); }
    }

    // the place itself: water finding its way down, air through the breaches, things a long way off
    this.dripT -= dt;
    if (this.dripT <= 0) { this.dripT = (0.6 + rnd() * 3) / Math.max(0.05, bed.drips * 2); if (bed.drips > 0) this.play('drip', 0.4 + rnd() * 0.6, 0.7 + rnd() * 0.9, rnd() * 1.6 - 0.8, 3000 + rnd() * 6000); }
    this.farT -= dt;
    if (this.farT <= 0) { this.farT = 22 + rnd() * 40; this.play(rnd() < 0.4 ? 'rumble' : rnd() < 0.5 ? 'creak' : 'far', 0.5 + rnd() * 0.4, 0.7 + rnd() * 0.5, rnd() * 1.6 - 0.8, 900 + rnd() * 1200); }
    this.gustT -= dt;
    if (this.gustT <= 0) { this.gustT = 4 + rnd() * 9; this.gust = bed.wind * (0.4 + rnd()); }
    this.gust = Math.max(0, this.gust - dt * 0.18);
    const t = this.ctx.currentTime;
    this.airG.gain.setTargetAtTime(bed.airVol * (1 + this.gust * 2.2) * (p.torch ? 1 : 1.3), t, 0.6);
    this.airF.frequency.setTargetAtTime(bed.air[0] * (1 + this.gust * 0.7), t, 0.8);

    // hurt badly, the world goes dull and the heart comes up
    const low = p.hp < p.maxHp * 0.3 && p.state !== 'dead';
    this.world.frequency.setTargetAtTime(p.state === 'dead' ? 500 : low ? 1800 : w.still > 0 ? 900 : 18000, t, 0.25);
    if (low) { this.heartT -= dt; if (this.heartT <= 0) { this.heartT = 0.82; this.play('heart', 0.9); } }
  }
}
