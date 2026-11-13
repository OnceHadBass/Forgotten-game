// The HUD and the screens round the game: plain DOM over the canvas. It shows
// only what the field guide has earned about a plant, never the species data.

import { BEHAVIOURS, ENDINGS, LAYERS, RARITY_COLOUR, RELICS, TUNE, UPGRADES } from './data';
import type { EndKind } from './data';
import { FLOOR, THICKET, WALL, idx, tx } from './level';
import type { View } from './render';
import { itemLines, rarityName, speciesName } from './state';
import type { Item } from './data';
import type { Campaign, Fx, World } from './state';

const el = (tag: string, cls = '', html = ''): HTMLElement => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export interface Actions { begin: () => void; resume: () => void; descend: (depth: number) => void; buy: (id: string) => void; burn: () => void; who: (i: number) => void; ending: (k: EndKind) => void; unpause: () => void; restart: () => void; mute: () => void }

function itemCard(it: Item, label: string): string {
  return `<div class="item" style="--c:${RARITY_COLOUR[it.rarity]}"><i>${label} · ${rarityName(it)}</i><b>${esc(it.name)}</b>${itemLines(it).map((l) => `<span>${l}</span>`).join('')}</div>`;
}

export class Hud {
  root = el('div', 'hud');
  private overlay = el('div', 'overlay');
  private bars = el('div', 'bars');
  private kit = el('div', 'kit');
  private where = el('div', 'where');
  private prompt = el('div', 'prompt');
  private toasts = el('div', 'toasts');
  private labels = el('div', 'labels');
  private card = el('div', 'card');
  private compare = el('div', 'compare');
  private boss = el('div', 'boss');
  private vignette = el('div', 'vignette');
  private map = document.createElement('canvas');
  private nums: HTMLElement[] = [];
  private labelPool: HTMLElement[] = [];
  private lastKit = '';
  private lastBars = '';

  constructor(parent: HTMLElement, private act: Actions) {
    this.map.width = this.map.height = 168;
    this.map.className = 'map';
    this.root.append(this.vignette, this.labels, this.where, this.map, this.boss, this.toasts, this.card, this.compare, this.prompt, this.bars, this.kit);
    parent.append(this.root, this.overlay);
    this.overlay.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
      if (!b || b.hasAttribute('disabled')) return;
      const [a, arg] = b.dataset.a!.split(':');
      if (a === 'begin') act.begin(); if (a === 'resume') act.resume(); if (a === 'descend') act.descend(+arg);
      if (a === 'buy') act.buy(arg); if (a === 'burn') act.burn(); if (a === 'who') act.who(+arg);
      if (a === 'ending') act.ending(arg as EndKind); if (a === 'unpause') act.unpause(); if (a === 'restart') act.restart(); if (a === 'mute') act.mute();
    });
  }

  show(play: boolean): void { this.root.style.display = play ? '' : 'none'; if (play) this.overlay.innerHTML = ''; this.overlay.classList.toggle('on', !play); }

  // ── screens ───────────────────────────────────────────────────────────────

  title(saved: Campaign | null): void {
    this.show(false);
    this.overlay.innerHTML = `<div class="sheet title">
      <p class="eyebrow">An isometric descent</p><h1>FORGOTTEN</h1>
      <p class="lede">An expedition followed a signal to a world that is slowly digesting it. Below the base is a ruin that goes down a long way. Take a blade and a torch. Bring back what you can carry.</p>
      <div class="row">${saved && !saved.over ? `<button class="btn go" data-a="resume">Continue · day ${saved.day}</button>` : ''}<button class="btn ${saved && !saved.over ? '' : 'go'}" data-a="begin">New expedition</button></div>
      ${CONTROLS}
    </div>`;
  }

  pause(): void {
    this.overlay.classList.add('on');
    this.overlay.innerHTML = `<div class="sheet"><h2>Paused</h2>${CONTROLS}<div class="row"><button class="btn go" data-a="unpause">Back to it</button><button class="btn" data-a="mute">Sound on / off</button></div></div>`;
  }

  base(c: Campaign): void {
    this.show(false);
    const who = c.roster[c.current];
    const dead = c.roster.filter((p) => !p.alive);
    const pulse = c.pulse < 0.5 ? 'Stable' : c.pulse < 1.5 ? 'Strain' : 'Surge';
    const g = c.gear;
    this.overlay.innerHTML = `<div class="sheet base">
      <header><h1>BASE CAMP</h1><div class="readouts"><div><i>Day</i><b>${c.day}</b></div><div><i>Salvage</i><b>${c.salvage}</b></div><div><i>The Pulse</i><b class="p${pulse}">${pulse}</b></div></div></header>
      ${c.night.map((l) => `<p class="night">${esc(l)}</p>`).join('')}
      <div class="cols">
        <section>
          <h4>The wire</h4>
          <div class="growth"><i style="width:${c.growth}%"></i></div>
          <p class="hint">The growth is ${Math.round(c.growth)}% of the way to Operations. It comes on every day you spend. At 100% the base falls.</p>
          <div class="row"><button class="btn" data-a="burn" ${c.salvage < TUNE.growth.burnCost ? 'disabled' : ''}>Burn it back · ${TUNE.growth.burnCost} salvage</button><span class="hint">It works. Something below notices each time: the Pulse climbs, and the ruin hits harder.</span></div>
          <h4>Workshop</h4>
          ${UPGRADES.map((u) => { const n = c.upgrades[u.id], cost = u.cost * (n + 1); return `<div class="row"><button class="btn" data-a="buy:${u.id}" ${n >= u.max || c.salvage < cost ? 'disabled' : ''}>${u.name} ${'●'.repeat(n)}${'○'.repeat(u.max - n)}${n >= u.max ? '' : ` · ${cost}`}</button><span class="hint">${u.text}</span></div>`; }).join('')}
        </section>
        <section>
          <h4>Who goes down</h4>
          <div class="roster">${c.roster.map((p, i) => (p.alive ? `<button class="btn who ${i === c.current ? 'on' : ''}" data-a="who:${i}">${esc(p.name)}<span>${p.runs ? `${p.runs} descent${p.runs > 1 ? 's' : ''}` : 'has not been below'}</span></button>` : '')).join('')}</div>
          <h4>${esc(who.name)} carries</h4>
          <div class="gear">${itemCard(g.blade, 'Blade')}${itemCard(g.gun, 'Gun')}${itemCard(g.suit, 'Suit')}${g.relic ? `<div class="item" style="--c:#f3fbff"><i>Relic</i><b>${g.relic.known ? RELICS[g.relic.fn].name : `A ${g.relic.form}`}</b><span>${g.relic.known ? RELICS[g.relic.fn].does : 'Nobody knows what it does.'}</span></div>` : ''}</div>
          <h4>Field guide</h4>
          <div class="guide">${c.species.map((s, i) => { const k = c.guide[i]; return k.seen ? `<div><b style="color:hsl(${s.hue} 45% 55%)">${esc(s.name)}</b><span>wakes to ${k.sense ? (s.sense === 'near' ? 'something close' : s.sense === 'light' ? 'torchlight' : 'noise') : '?'}</span><span>${k.behaviour ? BEHAVIOURS[s.behaviour].does : '?'}</span></div>` : '<div class="dim"><b>Not yet met</b></div>'; }).join('')}</div>
          ${dead.length ? `<h4>The wall</h4>${dead.map((p) => `<p class="hint"><b>${esc(p.name)}</b> ${esc(p.epitaph ?? '')}</p>`).join('')}` : ''}
        </section>
      </div>
      <footer class="row"><button class="btn ghost" data-a="restart">Abandon expedition</button><span class="grow"></span>
        ${[1, 2, 3, 4].filter((d) => d <= c.deepest).map((d) => `<button class="btn ${d === c.deepest ? 'go' : ''}" data-a="descend:${d}">Descend to ${LAYERS[d].name}</button>`).join('')}
      </footer>
    </div>`;
  }

  vault(): void {
    this.show(false);
    this.overlay.innerHTML = `<div class="sheet title"><p class="eyebrow">The door is unguarded</p><h1 class="white">THE VAULT</h1>
      <p class="lede">A door the size of the wall, white light in its seams, and the hum of the whole planet behind it. Three things can be done here.</p>
      <div class="stack"><button class="btn white" data-a="ending:open">Open it</button><button class="btn white" data-a="ending:reinforce">Tend the lock, as the Wardens did</button><button class="btn" data-a="ending:depart">Take what the Tender guarded and leave</button></div></div>`;
  }

  ending(c: Campaign): void {
    this.show(false);
    const e = ENDINGS[c.over!];
    const dead = c.roster.filter((p) => !p.alive);
    this.overlay.innerHTML = `<div class="sheet title end"><p class="eyebrow">Day ${c.day}</p><h1 class="${c.over === 'fallen' || c.over === 'spent' ? 'bad' : 'white'}">${e.title.toUpperCase()}</h1><p class="lede">${e.text}</p>
      <h4>The wall</h4>${dead.length ? dead.map((p) => `<p class="hint"><b>${esc(p.name)}</b> ${esc(p.epitaph ?? '')}</p>`).join('') : '<p class="hint">Nobody. All eight.</p>'}
      <div class="row"><button class="btn go" data-a="begin">Follow the signal again</button></div></div>`;
  }

  // ── in play ───────────────────────────────────────────────────────────────

  say(t: string, tone = ''): void {
    const d = el('p', tone, esc(t));
    this.toasts.append(d);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => d.classList.add('out'), 5200);
    setTimeout(() => d.remove(), 6000);
  }

  fx(fx: Fx[], view: View): void {
    for (const f of fx) {
      if (f.k === 'say') this.say(f.t, f.tone);
      if (f.k !== 'hit' || f.who === 'plant') continue;
      const s = view.project(f.x + (Math.random() - 0.5) * 0.6, 2, f.z);
      const d = this.nums.find((n) => !n.isConnected) ?? el('span');
      d.className = `num ${f.who}${f.crit ? ' crit' : ''}`;
      d.textContent = String(f.n);
      d.style.left = `${s.x}px`; d.style.top = `${s.y}px`;
      if (!this.nums.includes(d)) this.nums.push(d);
      this.labels.append(d);
      setTimeout(() => d.remove(), 650);
    }
  }

  update(w: World, view: View): void {
    const p = w.player, c = w.camp, g = c.gear;
    const bars = `${Math.ceil(p.hp)}|${Math.round(p.cell)}|${p.dodges}|${p.torch}|${p.downs}`;
    if (bars !== this.lastBars) {
      this.lastBars = bars;
      this.bars.innerHTML = `<div class="bar hp"><i style="width:${(p.hp / p.maxHp) * 100}%"></i><b>${Math.ceil(p.hp)}</b></div>
        <div class="bar cell ${p.torch ? '' : 'off'}"><i style="width:${(p.cell / p.maxCell) * 100}%"></i><b>${p.torch ? 'TORCH' : p.cell < TUNE.torch.relight ? 'DEAD' : 'OFF'}</b></div>
        <div class="pips">${Array.from({ length: p.maxDodges }, (_, i) => `<i class="${i < p.dodges ? 'on' : ''}"></i>`).join('')}<span>${p.downs ? `downed ${p.downs} of ${TUNE.downs}` : ''}</span></div>`;
    }
    const sp = p.graftSel, graft = p.grafts[sp] > 0 ? BEHAVIOURS[c.species[sp].behaviour].graft : null;
    const kit = `${g.blade.name}|${g.gun.name}|${p.ammo}|${p.medkits}|${sp}|${p.grafts[sp]}|${g.relic?.known}|${g.relic?.form}|${p.relicCharges}|${p.salvage}`;
    if (kit !== this.lastKit) {
      this.lastKit = kit;
      this.kit.innerHTML = `<div style="--c:${RARITY_COLOUR[g.blade.rarity]}"><i>LMB</i><b>${esc(g.blade.name)}</b></div>
        <div style="--c:${RARITY_COLOUR[g.gun.rarity]}"><i>RMB · ${p.ammo}</i><b>${esc(g.gun.name)}</b></div>
        <div style="--c:#37d3bf"><i>Q · ${graft ? p.grafts[sp] : 0}</i><b>${graft ? graft.name : 'No grafts'}</b></div>
        <div style="--c:#f3fbff"><i>R · ${g.relic ? p.relicCharges : 0}</i><b>${g.relic ? (g.relic.known ? RELICS[g.relic.fn].name : `A ${g.relic.form}`) : 'No relic'}</b></div>
        <div><i>H</i><b>${p.medkits} medkit${p.medkits === 1 ? '' : 's'}</b></div>
        <div style="--c:#f0bf2c"><i>Salvage</i><b>${p.salvage}</b></div>`;
    }
    this.where.innerHTML = `<b>${LAYERS[w.depth].name.toUpperCase()}</b><span>${esc(c.roster[c.current].name)} · day ${c.day}</span>`;
    this.prompt.textContent = w.liftT >= 0 ? `The lift: ${Math.ceil(w.liftT)}` : w.prompt ? `E · ${w.prompt}` : '';
    this.prompt.classList.toggle('lift', w.liftT >= 0);
    const hurt = Math.max(0, 1 - p.hurtT * 2.2), low = p.hp < p.maxHp * 0.3 ? 0.35 + Math.sin(w.time * 7) * 0.15 : 0;
    this.vignette.style.setProperty('--hurt', String(Math.max(hurt, low)));
    this.vignette.classList.toggle('dark', !p.torch);
    this.vignette.classList.toggle('still', w.still > 0);

    const boss = w.boss;
    this.boss.style.display = boss && !boss.dead && boss.alert > 0 ? '' : 'none';
    if (boss) this.boss.innerHTML = `<b>THE TENDER</b><div class="bar"><i style="width:${Math.max(0, (boss.hp / boss.maxHp) * 100)}%"></i></div>`;

    // a plant under the cursor: what the guide knows, nothing more
    const h = w.hover;
    if (h) {
      const s = c.species[h.sp], k = c.guide[h.sp], at = view.project(h.x, 2.4, h.z);
      this.card.style.display = '';
      this.card.style.left = `${at.x + 18}px`; this.card.style.top = `${at.y}px`;
      this.card.innerHTML = k.seen
        ? `<b style="color:hsl(${s.hue} 45% 60%)">${esc(speciesName(c, h.sp))}</b><span class="${h.mood === 'asleep' ? '' : 'bad'}">${h.mood === 'asleep' ? 'Dormant' : 'Awake'}</span><span><i>Wakes to</i> ${k.sense ? (s.sense === 'near' ? 'something close' : s.sense === 'light' ? 'torchlight' : 'noise') : '?'}</span><span><i>Does</i> ${k.behaviour ? BEHAVIOURS[s.behaviour].does : '?'}</span>${k.behaviour && BEHAVIOURS[s.behaviour].graft ? `<span class="life">Cut it for a ${BEHAVIOURS[s.behaviour].graft!.name.toLowerCase()}</span>` : ''}`
        : '<b>Something growing</b><span>Not close enough to make out.</span>';
    } else this.card.style.display = 'none';

    // loot worth stopping for gets a label; what is underfoot gets compared
    let n = 0;
    for (const l of w.loot) {
      if (l.gone || (l.kind !== 'item' && l.kind !== 'relic') || Math.hypot(l.x - p.x, l.z - p.z) > 16) continue;
      const d = this.labelPool[n] ?? (this.labelPool[n] = el('span', 'loot'));
      n++;
      const at = view.project(l.x, 1.3, l.z);
      d.textContent = l.item ? l.item.name : l.relic!.known ? RELICS[l.relic!.fn].name : `A ${l.relic!.form}`;
      d.style.cssText = `left:${at.x}px;top:${at.y}px;--c:${l.item ? RARITY_COLOUR[l.item.rarity] : '#f3fbff'}`;
      if (!d.isConnected) this.labels.append(d);
    }
    for (let i = n; i < this.labelPool.length; i++) this.labelPool[i].remove();
    const near = w.near && 'vx' in w.near ? w.near : null;
    if (near?.item) { this.compare.style.display = ''; this.compare.innerHTML = itemCard(near.item, 'On the ground') + itemCard(g[near.item.slot], 'Carried'); }
    else if (near?.relic) { this.compare.style.display = ''; this.compare.innerHTML = `<div class="item" style="--c:#f3fbff"><i>Relic</i><b>${near.relic.known ? RELICS[near.relic.fn].name : `A ${near.relic.form}`}</b><span>${near.relic.known ? RELICS[near.relic.fn].does : 'Nothing about its shape says what it does.'}</span></div>`; }
    else this.compare.style.display = 'none';

    this.minimap(w);
  }

  private mapT = 0;
  private minimap(w: World): void {
    if (w.time - this.mapT < 0.2 && w.time > this.mapT) return;
    this.mapT = w.time;
    const l = w.level, g = this.map.getContext('2d')!, S = this.map.width, R = 21, k = S / (R * 2);
    const px = tx(w.player.x), pz = tx(w.player.z);
    g.clearRect(0, 0, S, S);
    g.save();
    // turn the map so that up on the map is up on the screen
    g.translate(S / 2, S / 2); g.rotate(Math.PI / 4); g.translate(-S / 2, -S / 2);
    for (let y = pz - R; y < pz + R; y++) for (let x = px - R; x < px + R; x++) {
      if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue;
      const i = idx(l, x, y), t = l.tiles[i];
      if (t === WALL || !(w.explored[i] || w.revealed)) continue;
      g.fillStyle = t === THICKET ? '#1f5a3c' : w.explored[i] ? (t === FLOOR ? '#5d6b71' : '#5d6b71') : '#2a3439';
      g.fillRect((x - px + R) * k, (y - pz + R) * k, k + 0.5, k + 0.5);
    }
    const mark = (x: number, z: number, c: string, s = 3): void => { g.fillStyle = c; g.fillRect((x / 2 - px + R) * k - s / 2, (z / 2 - pz + R) * k - s / 2, s + k, s + k); };
    for (const q of w.props) {
      const seen = w.revealed || w.explored[idx(l, tx(q.x), tx(q.z))];
      if (!seen) continue;
      if (q.kind === 'lift') mark(q.x, q.z, '#f0bf2c'); if (q.kind === 'hatch' || q.kind === 'door') mark(q.x, q.z, '#cdd6d9');
      if (q.kind === 'plinth' && !q.used) mark(q.x, q.z, '#ffffff', 4); if (q.kind === 'chest' && !q.used) mark(q.x, q.z, '#d9c98a', 2); if (q.kind === 'body' && !q.used) mark(q.x, q.z, '#b08a18', 2);
    }
    g.restore();
    g.fillStyle = '#f0bf2c'; g.beginPath(); g.arc(S / 2, S / 2, 3, 0, 7); g.fill();
  }
}

const CONTROLS = `<div class="controls">
  <span><kbd>W A S D</kbd> move</span><span><kbd>Mouse</kbd> aim the torch</span><span><kbd>Left click</kbd> blade (hold for a combo)</span><span><kbd>Right click</kbd> gun (loud)</span>
  <span><kbd>Space</kbd> dodge</span><span><kbd>E</kbd> interact, swap gear</span><span><kbd>Q</kbd> throw a graft · <kbd>Tab</kbd> next</span><span><kbd>R</kbd> relic</span>
  <span><kbd>F</kbd> torch on / off</span><span><kbd>H</kbd> medkit</span><span><kbd>Esc</kbd> pause</span></div>
  <p class="hint">Nothing about a plant's look says what it does. Watch what wakes it: light, noise, or coming close. Cut down what you understand and it leaves a piece you can use. With the torch off you are harder to see, and some things only move in the dark.</p>`;
