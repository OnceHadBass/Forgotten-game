// A species as it looks this campaign: body plan, colour and pattern are all
// dealt, so nothing here can be read for behaviour. Awake plants tremble, the
// same for every species: it shows mood, never nature.

import { fork, int, range } from './rng';
import type { RngHost } from './rng';
import type { Species } from './types';

interface Shape {
  d: string;
  /** Centre line, for veins and bands. */
  spine: string;
  tip: [number, number];
  w: number;
}

const f = (n: number): string => n.toFixed(1);

function leaf(x0: number, y0: number, angle: number, len: number, width: number, bend: number): Shape {
  const a = (angle * Math.PI) / 180;
  const tx = x0 + Math.sin(a) * len;
  const ty = y0 - Math.cos(a) * len;
  const mx = (x0 + tx) / 2 + Math.cos(a) * bend;
  const my = (y0 + ty) / 2 + Math.sin(a) * bend;
  const nx = Math.cos(a) * width;
  const ny = Math.sin(a) * width;
  return {
    d: `M${f(x0)} ${f(y0)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(x0)} ${f(y0)}Z`,
    spine: `M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`,
    tip: [tx, ty],
    w: width,
  };
}

function blob(cx: number, cy: number, rx: number, ry: number): Shape {
  return {
    d: `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`,
    spine: `M${f(cx - rx * 0.7)} ${f(cy)}L${f(cx + rx * 0.7)} ${f(cy)}`,
    tip: [cx, cy - ry * 0.4],
    w: rx,
  };
}

function build(s: Species, h: RngHost): Shape[] {
  const out: Shape[] = [];
  const j = (a: number, b: number): number => range(h, a, b);
  switch (s.plan) {
    case 'reeds':
      for (let i = 0; i < 8; i++) out.push(leaf(38 + i * 3.4 + j(-2, 2), 92, j(-24, 24), j(46, 78), j(2.2, 3.6), j(-9, 9)));
      break;
    case 'fan':
      for (let i = 0; i < 7; i++) out.push(leaf(50, 92, -66 + i * 22 + j(-4, 4), j(52, 68), j(7, 10), j(-4, 4)));
      break;
    case 'pods':
      out.push(leaf(50, 92, j(-6, 6), 62, 2.4, j(-8, 8)));
      for (let i = 0; i < 5; i++) out.push(blob(50 + (i % 2 ? 1 : -1) * j(9, 17), 78 - i * 12 + j(-3, 3), j(7, 10), j(8, 12)));
      break;
    case 'mat':
      for (let i = 0; i < 10; i++) out.push(blob(j(20, 80), j(74, 90), j(11, 19), j(4.5, 7.5)));
      break;
    case 'spire':
      for (let i = 0; i < 6; i++) out.push(blob(50 + j(-2, 2), 86 - i * 13, 17 - i * 2.4, 8.5 - i * 0.6));
      out.push(leaf(50, 22, j(-5, 5), 14, 2.2, 0));
      break;
    case 'pitcher':
      out.push({ d: 'M36 92Q16 60 38 34L62 34Q84 60 64 92Z', spine: 'M50 90Q48 60 50 36', tip: [50, 34], w: 20 });
      out.push(blob(50, 34, 15, 5));
      for (let i = 0; i < 3; i++) out.push(leaf(30 + i * 20, 92, -40 + i * 40 + j(-6, 6), j(18, 26), 5, j(-3, 3)));
      break;
    case 'crown':
      for (let i = 0; i < 9; i++) out.push(leaf(50, 74, -100 + i * 25 + j(-5, 5), j(30, 44), j(5, 7.5), j(-6, 6)));
      out.push(blob(50, 72, 11, 9));
      break;
    case 'bramble':
      for (let i = 0; i < 7; i++) {
        const x = j(18, 44);
        out.push(leaf(x, 92, j(8, 62) * (i % 2 ? 1 : -1) + (i % 2 ? 0 : 40), j(40, 66), 1.9, j(18, 30) * (i % 2 ? 1 : -1)));
      }
      for (let i = 0; i < 6; i++) out.push(leaf(j(24, 76), j(50, 84), j(-180, 180), j(6, 10), 2.4, 0));
      break;
  }
  return out;
}

export function Portrait({ s, seed, awake = false, known = true }: { s: Species; seed: number; awake?: boolean; known?: boolean }) {
  if (!known) {
    return (
      <svg class="portrait unknown" viewBox="0 0 100 100" role="img" aria-label="Not yet seen">
        <ellipse cx="50" cy="92" rx="26" ry="4" fill="var(--stone-0)" />
        <text x="50" y="66" text-anchor="middle" class="q">?</text>
      </svg>
    );
  }
  const h = fork(seed, 900, s.id);
  const shapes = build(s, h);
  const sat = s.vivid ? 62 : 36;
  const body = `hsl(${s.hue} ${sat}% ${s.vivid ? 30 : 23}%)`;
  const shade = `hsl(${s.hue} ${sat}% 13%)`;
  const rim = `hsl(${s.hue} ${sat + 10}% 44%)`;
  const glow = `hsl(${s.glow} 82% 64%)`;
  const spots: [number, number, number][] = [];
  if (s.pattern === 'spots') for (const sh of shapes) for (let i = 0; i < 2; i++) spots.push([sh.tip[0] + range(h, -4, 4), sh.tip[1] + range(h, 2, 14), 0.8 + int(h, 3) * 0.4]);
  return (
    <svg class={`portrait${awake ? ' awake' : ''}`} viewBox="0 0 100 100" role="img" aria-label={s.name}>
      <ellipse cx="50" cy="92" rx="30" ry="4.5" fill="var(--stone-0)" opacity="0.8" />
      <g class="body">
        {shapes.map((sh) => (
          <path d={sh.d} fill={body} stroke={s.pattern === 'rim' ? rim : shade} stroke-width={s.pattern === 'rim' ? 1.1 : 0.7} stroke-linejoin="round" />
        ))}
        {s.pattern === 'bands' && shapes.map((sh) => <path d={sh.spine} fill="none" stroke={shade} stroke-width={Math.min(9, sh.w * 1.1)} stroke-dasharray="1.6 5" opacity="0.9" />)}
        {s.pattern === 'veins' && shapes.map((sh) => <path class="glow" d={sh.spine} fill="none" stroke={glow} stroke-width="0.9" stroke-linecap="round" />)}
        {spots.map(([x, y, r]) => <circle class="glow" cx={f(x)} cy={f(y)} r={r} fill={glow} />)}
        {shapes.filter((_, i) => i % 3 === 0).map((sh) => <circle class="glow tip" cx={f(sh.tip[0])} cy={f(sh.tip[1])} r="1.3" fill={glow} />)}
      </g>
    </svg>
  );
}
