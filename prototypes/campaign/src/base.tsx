// The base camp screen: the map with the growth coming in, the people and
// their jobs, the lab, the fabricator, the field guide and what was brought home.

import { useState } from 'preact/hooks';
import { BEHAVIOURS, EVENTS, JOBS, LAYERS, MODULES, MOODS, RELICS, SENSE_TEXT, SPEC_TEXT, TRAIT_TEXT, TUNE } from './data';
import { MAKES, PULSE, ascend, burnBack, canAscend, canBurn, cannotDeploy, culture, currentProject, endDay, fabLeft, literacy, living, make, mod, moodIndex, projects, pulseLevel, reclaim, setJob, speciesName } from './game';
import type { Make } from './game';
import { Portrait } from './portrait';
import { fork, range } from './rng';
import { startRun } from './run';
import type { Campaign, Job, ModuleId, Person } from './types';

type Act = (fn: () => void) => void;
type Tab = 'people' | 'lab' | 'fab' | 'guide' | 'finds' | 'board';

const pct = (n: number): string => `${Math.round(n)}%`;

function BaseMap({ c, picked, pick }: { c: Campaign; picked: ModuleId; pick: (m: ModuleId) => void }) {
  const wild = fork(c.seed, 55);
  const backdrop = Array.from({ length: 70 }, () => {
    const x = range(wild, 0, 300), y = range(wild, 0, 300);
    return `M${x.toFixed(0)} ${y.toFixed(0)}q${range(wild, -30, 30).toFixed(0)} ${range(wild, -30, 30).toFixed(0)} ${range(wild, -40, 40).toFixed(0)} ${range(wild, -40, 40).toFixed(0)}`;
  });
  return (
    <svg class="basemap" viewBox="0 0 300 300" role="group" aria-label="The base and the growth around it">
      <rect width="300" height="300" fill="var(--wild)" />
      <path d={backdrop.join('')} fill="none" stroke="var(--wild-line)" stroke-width="1.4" stroke-linecap="round" />
      {c.modules.map((m, i) => {
        const d = MODULES[m.id];
        const x = d.col * 100 + 7, y = d.row * 100 + 7, w = 86;
        const k = c.guide[m.species];
        const h = fork(c.seed, 60, i);
        const hue = k.seen ? c.species[m.species].hue : 125;
        const n = Math.round(m.growth / 3.2);
        // Vines come in from the module's edges; how far depends on how much is lost.
        const vines = Array.from({ length: n }, () => {
          const side = Math.floor(range(h, 0, 4));
          const t = range(h, 0, w);
          const reach = (m.growth / 100) * range(h, 22, 52);
          const [sx, sy, dx, dy] = side === 0 ? [x + t, y, 0, 1] : side === 1 ? [x + w, y + t, -1, 0] : side === 2 ? [x + t, y + w, 0, -1] : [x, y + t, 1, 0];
          const bend = range(h, -16, 16);
          return `M${sx.toFixed(0)} ${sy.toFixed(0)}q${(dx * reach * 0.5 + dy * bend).toFixed(0)} ${(dy * reach * 0.5 + dx * bend).toFixed(0)} ${(dx * reach).toFixed(0)} ${(dy * reach).toFixed(0)}`;
        });
        return (
          <g key={m.id} class={`module${m.lost ? ' lost' : ''}${picked === m.id ? ' picked' : ''}${m.id === 'ops' ? ' ops' : ''}`} onClick={() => pick(m.id)} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(m.id); }} role="button" aria-label={`${d.name}, growth ${pct(m.growth)}${m.lost ? ', lost' : ''}`}>
            <rect class="pad" x={x} y={y} width={w} height={w} rx="2" />
            <path d={vines.join('')} fill="none" stroke={`hsl(${hue} 42% ${m.lost ? 22 : 30}%)`} stroke-width={m.lost ? 4.5 : 2.4} stroke-linecap="round" />
            <text class="mname" x={x + 6} y={y + 18}>{d.name.toUpperCase()}</text>
            <text class="mpct" x={x + 6} y={y + w - 8}>{m.lost ? 'LOST' : pct(m.growth)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ModuleCard({ c, id, act }: { c: Campaign; id: ModuleId; act: Act }) {
  const m = mod(c, id);
  const d = MODULES[id];
  const k = c.guide[m.species];
  const [who, setWho] = useState(-1);
  const ready = living(c).filter((p) => !cannotDeploy(p));
  if (id === 'ops') {
    const lost = c.modules.filter((x) => x.lost).length;
    return (
      <div class="card">
        <h3>Operations <span class="dim">{pct(m.growth)}</span></h3>
        <p>{lost ? `The growth is coming through from ${lost} lost module${lost > 1 ? 's' : ''}. If it fills this room the base has fallen.` : 'The heart of the base. It holds for as long as everything round it does.'}</p>
      </div>
    );
  }
  const burnWhy = canBurn(c, id);
  return (
    <div class="card">
      <h3>{d.name} <span class="dim">{m.lost ? 'lost' : `growth ${pct(m.growth)}`}</span></h3>
      <div class="front">
        <Portrait s={c.species[m.species]} seed={c.seed} known={k.seen} />
        <p>
          {k.seen
            ? <>What is coming in here is <b>{speciesName(c, m.species)}</b>. {k.researched ? 'The lab has studied it: the wire crew hold it well.' : k.behaviour ? 'You know what it does, which helps the crew.' : 'You have met it below and know little else. The crew cut blind.'}</>
            : <>Nobody recognises what is growing at this stretch of wire. You have not met it below yet, and the crew cut blind.</>}
          {m.lost && <> {d.lostText}</>}
        </p>
      </div>
      {!m.lost && (
        <div class="row">
          <button class="btn" disabled={!!burnWhy} onClick={() => act(() => burnBack(c, id))}>Burn it back</button>
          <span class="hint">{burnWhy ?? '3 kg and a sample of it. It works. The Pulse climbs each time, and nobody knows why.'}</span>
        </div>
      )}
      {m.lost && (
        <div class="row">
          <select id={`reclaim-${id}`} value={who} onChange={(e) => setWho(+(e.target as HTMLSelectElement).value)}>
            <option value={-1}>Send in with a blade…</option>
            {ready.map((p) => <option value={p.id}>{p.name} ({p.spec})</option>)}
          </select>
          <button class="btn" disabled={who < 0} onClick={() => act(() => { reclaim(c, id, who); setWho(-1); })}>Clear it (takes the day)</button>
        </div>
      )}
    </div>
  );
}

function People({ c, act }: { c: Campaign; act: Act }) {
  const gone = c.people.filter((p) => p.status !== 'ok');
  return (
    <div class="stack">
      <p class="hint">Everyone not sent below has a job. Whoever you send does not do theirs that day.</p>
      {living(c).map((p) => {
        const why = cannotDeploy(p);
        return (
          <div class="person" key={p.id}>
            <div class="who">
              <b>{p.name}</b>
              <span class="dim">{p.spec} · {p.trait}{p.runs ? ` · ${p.runs} descent${p.runs > 1 ? 's' : ''}` : ''}</span>
              <span class="hint">{SPEC_TEXT[p.spec]} {TRAIT_TEXT[p.trait]}</span>
            </div>
            <div class="state">
              {why ? <span class="tag bad">{why}</span> : <span class="tag">fit</span>}
              {p.exposure >= 25 && <span class="tag sick">sickness {Math.round(p.exposure)}</span>}
              <select id={`job-${p.id}`} value={p.job} onChange={(e) => act(() => setJob(c, p.id, (e.target as HTMLSelectElement).value as Job))} aria-label={`Job for ${p.name}`}>
                {(Object.keys(JOBS) as Job[]).map((j) => {
                  const needs = JOBS[j].needs;
                  return <option value={j} disabled={!!needs && mod(c, needs).lost}>{JOBS[j].name}</option>;
                })}
              </select>
            </div>
          </div>
        );
      })}
      {gone.length > 0 && (
        <div class="memorial">
          <h4>The wall</h4>
          {gone.map((p) => <p><b>{p.name}</b> <span class="dim">{p.spec}. {p.epitaph}</span></p>)}
        </div>
      )}
    </div>
  );
}

function Lab({ c, act }: { c: Campaign; act: Act }) {
  const list = projects(c);
  const cur = currentProject(c);
  if (mod(c, 'lab').lost) return <p class="hint">The lab is under the growth. Nothing can be studied until someone clears it.</p>;
  return (
    <div class="stack">
      <p class="hint">The lab works on one thing at a time. Hands assigned to the lab move it along each night.</p>
      {list.length === 0 && <p>Nothing to work on. The lab needs samples, glyph readings or something strange on the bench.</p>}
      {list.map((p) => {
        const on = cur === p;
        return (
          <button class={`project${on ? ' on' : ''}`} onClick={() => act(() => { c.focus = p.focus; })} aria-pressed={on}>
            <b>{p.title}</b>
            <span class="hint">{p.detail}</span>
            <span class="bar"><i style={{ width: pct(Math.min(100, (p.progress / p.cost) * 100)) }} /></span>
          </button>
        );
      })}
      {c.lore.length > 0 && (
        <div class="lore">
          <h4>What the walls say</h4>
          {c.lore.map((l) => <p>{l}</p>)}
        </div>
      )}
    </div>
  );
}

function Fab({ c, act }: { c: Campaign; act: Act }) {
  if (mod(c, 'fabricator').lost) return <p class="hint">The fabricator is under the growth. Nothing can be made until someone clears it.</p>;
  const left = fabLeft(c);
  const s = c.stores;
  const cult = c.species.filter((sp) => c.guide[sp.id].researched);
  return (
    <div class="stack">
      <p class="hint">{left} job{left === 1 ? '' : 's'} left today, {s.salvage} kg of salvage. Human kit is dull and dependable. The interesting things you have to find, or grow.</p>
      {(Object.keys(MAKES) as Make[]).map((m) => (
        <div class="row" key={m}>
          <button class="btn" disabled={left < 1 || s.salvage < MAKES[m].cost} onClick={() => act(() => make(c, m))}>{MAKES[m].name} · {MAKES[m].cost} kg</button>
          <span class="hint">{MAKES[m].text}</span>
        </div>
      ))}
      {cult.length > 0 && <h4>Cultured cuttings</h4>}
      {cult.map((sp) => {
        const g = BEHAVIOURS[sp.behaviour].graft;
        return (
          <div class="row" key={sp.id}>
            <button class="btn life" disabled={left < 1 || s.salvage < 2 || s.samples[sp.id] < 1} onClick={() => act(() => culture(c, sp.id))}>{g.name} · 2 kg + sample</button>
            <span class="hint">From {speciesName(c, sp.id)} ({s.samples[sp.id]} sample{s.samples[sp.id] === 1 ? '' : 's'}, {s.grafts[sp.id]} ready). {g.use}</span>
          </div>
        );
      })}
      <h4>The ascent stage</h4>
      <div class="row">
        <button class="btn white" disabled={!canAscend(c)} onClick={() => act(() => ascend(c))}>Raise it and leave</button>
        <span class="hint">{TUNE.ascent.salvage} kg of salvage and {TUNE.ascent.relicCells} relic cells (you have {s.relicCells}). One way off this planet.</span>
      </div>
    </div>
  );
}

function Guide({ c, act }: { c: Campaign; act: Act }) {
  return (
    <div class="guide">
      {c.species.map((s) => {
        const k = c.guide[s.id];
        return (
          <div class={`entry${k.seen ? '' : ' unseen'}`} key={s.id}>
            <Portrait s={s} seed={c.seed} known={k.seen} />
            {k.seen ? (
              <div class="facts">
                <input id={`name-${s.id}`} class="rename" value={speciesName(c, s.id)} maxLength={24} aria-label="Name of this species" onChange={(e) => act(() => { k.given = (e.target as HTMLInputElement).value.trim() || undefined; })} />
                <span><i>Wakes to</i> {k.sense ? SENSE_TEXT[s.sense] : '?'}</span>
                <span><i>Does</i> {k.behaviour ? BEHAVIOURS[s.behaviour].does : '?'}</span>
                <span class="dim">{k.researched ? 'Studied at base.' : `${c.stores.samples[s.id]} sample${c.stores.samples[s.id] === 1 ? '' : 's'} at base.`}</span>
              </div>
            ) : <div class="facts"><span class="dim">Not yet met.</span></div>}
          </div>
        );
      })}
    </div>
  );
}

function Finds({ c }: { c: Campaign }) {
  return (
    <div class="stack">
      <h4>Relics</h4>
      {c.relics.length === 0 && <p class="hint">None. Below, a live relic is the only white light in the ruin. Nothing about its shape says what it does.</p>}
      {c.relics.map((r) => (
        <div class="relic">
          <b class="white">{r.identified ? RELICS[r.fn].name : `A ${r.form}`}</b>
          <span class="hint">{r.identified ? RELICS[r.fn].does : 'Unknown. The lab can work it out slowly, or someone can find out by using it.'}</span>
          <span class="dim">{r.where === 'base' ? 'At base.' : r.where === 'body' ? 'Still below, with whoever carried it.' : 'Lost.'}</span>
        </div>
      ))}
      <p><b class="white">{c.fragments}</b> of 3 key fragments. Warden literacy <b>{literacy(c)}</b> of 3.</p>
      <h4>Wonders brought home</h4>
      {c.wonders.length === 0 && <p class="hint">None yet. They are no use to anyone. They are what keeps the mess table full.</p>}
      {c.wonders.map((id) => <p>{EVENTS.find((e) => e.id === id)!.title}</p>)}
      {c.prior && <p class="dim">Expedition {c.prior.n} came before you. It lasted {c.prior.days} days. Their camp is somewhere in the Threshold.</p>}
    </div>
  );
}

function Deploy({ c, act, close }: { c: Campaign; act: Act; close: () => void }) {
  const ready = living(c).filter((p) => !cannotDeploy(p));
  const s = c.stores;
  const [who, setWho] = useState<number>(ready[0]?.id ?? -1);
  const [medkits, setMedkits] = useState(Math.min(2, s.medkits));
  const [probes, setProbes] = useState(Math.min(2, s.probes));
  const [cells, setCells] = useState(0);
  const [relic, setRelic] = useState(-1);
  const [layer, setLayer] = useState(1);
  const [grafts, setGrafts] = useState<number[]>(s.grafts.map(() => 0));
  const relics = c.relics.map((r, id) => ({ r, id })).filter((x) => x.r.where === 'base');
  const p: Person | undefined = c.people[who];
  const step = (label: string, v: number, set: (n: number) => void, max: number) => (
    <div class="stepper">
      <span>{label}</span>
      <button class="btn sm" onClick={() => set(Math.max(0, v - 1))} aria-label={`Fewer ${label}`}>−</button>
      <b>{v}</b>
      <button class="btn sm" onClick={() => set(Math.min(max, v + 1))} aria-label={`More ${label}`}>+</button>
      <span class="dim">of {max}</span>
    </div>
  );
  return (
    <div class="overlay">
      <div class="sheet">
        <h2>Who goes down?</h2>
        <p class="hint">One person. The growth answers clustered life with everything it has. Two would not double the odds, they would end them.</p>
        <div class="pickwho">
          {ready.map((x) => (
            <button class={`project${who === x.id ? ' on' : ''}`} onClick={() => setWho(x.id)} aria-pressed={who === x.id}>
              <b>{x.name}</b>
              <span class="hint">{x.spec} · {x.trait} · works {JOBS[x.job].name.toLowerCase()}{x.exposure >= 25 ? ` · sickness ${Math.round(x.exposure)}` : ''}</span>
            </button>
          ))}
          {ready.length === 0 && <p>Nobody is fit to go.</p>}
        </div>
        {p && <p class="hint">{SPEC_TEXT[p.spec]} {TRAIT_TEXT[p.trait]}</p>}
        <div class="kit">
          {step('Medkits', medkits, setMedkits, Math.min(3, s.medkits))}
          {step('Probes', probes, setProbes, Math.min(3, s.probes))}
          {step('Spare cells', cells, setCells, Math.min(1, s.cells))}
          {s.grafts.map((n, sp) => n > 0 && step(BEHAVIOURS[c.species[sp].behaviour].graft.name, grafts[sp], (v) => setGrafts(grafts.map((g, i) => (i === sp ? v : g))), Math.min(2, n)))}
        </div>
        {relics.length > 0 && (
          <label class="field">Relic
            <select id="deploy-relic" value={relic} onChange={(e) => setRelic(+(e.target as HTMLSelectElement).value)}>
              <option value={-1}>None. Leave them safe.</option>
              {relics.map(({ r, id }) => <option value={id}>{r.identified ? RELICS[r.fn].name : `The ${r.form} (unknown)`}</option>)}
            </select>
          </label>
        )}
        {c.site.deepest > 1 && (
          <label class="field">Set down at
            <select id="deploy-layer" value={layer} onChange={(e) => setLayer(+(e.target as HTMLSelectElement).value)}>
              {[1, 2, 3].filter((l) => l <= c.site.deepest).map((l) => <option value={l}>{LAYERS[l]}</option>)}
            </select>
          </label>
        )}
        <div class="row end">
          <button class="btn ghost" onClick={close}>Not today</button>
          <button class="btn go" disabled={!p} onClick={() => act(() => startRun(c, who, { medkits, probes, cells, relic: relic < 0 ? null : relic, grafts, layer }))}>Call the lift</button>
        </div>
      </div>
    </div>
  );
}

export function Base({ c, act, restart, seenDay, setSeenDay }: { c: Campaign; act: Act; restart: () => void; seenDay: number; setSeenDay: (n: number) => void }) {
  const [tab, setTab] = useState<Tab>('people');
  const [picked, setPicked] = useState<ModuleId>('ops');
  const [deploying, setDeploying] = useState(false);
  const [sure, setSure] = useState(false);
  const s = c.stores;
  const level = pulseLevel(c);
  const tabs: [Tab, string][] = [['people', 'People'], ['lab', 'Lab'], ['fab', 'Fabricator'], ['guide', 'Field guide'], ['finds', 'Finds'], ['board', 'Mess board']];
  const samples = s.samples.reduce((a, b) => a + b, 0);
  const night = c.day !== seenDay && c.day > 1;

  return (
    <div class="base">
      <header class="top">
        <h1>FORGOTTEN <span>Expedition {c.expedition}</span></h1>
        <div class="readouts">
          <div><i>Day</i><b>{c.day}</b></div>
          <div class={`pulse l${level}`}><i>The Pulse</i><b>{PULSE[level]}</b></div>
          <div class={`mood m${moodIndex(c)}`}><i>The camp is</i><b>{MOODS[moodIndex(c)]}</b></div>
          <div><i>Living</i><b>{living(c).length}</b></div>
        </div>
      </header>

      <div class="cols">
        <section class="left">
          <BaseMap c={c} picked={picked} pick={setPicked} />
          <ModuleCard key={picked} c={c} id={picked} act={act} />
          <div class="stores">
            <span><b>{s.salvage}</b> kg salvage</span><span><b>{s.medkits}</b> medkits</span><span><b>{s.probes}</b> probes</span>
            <span><b>{s.cells}</b> spare cells</span><span><b>{s.rounds}</b> rounds</span><span><b>{samples}</b> samples</span>
            <span><b>{s.readings}</b> readings</span>{s.relicCells > 0 && <span class="white"><b>{s.relicCells}</b> relic cells</span>}
          </div>
        </section>

        <section class="right">
          <nav class="tabs" role="tablist">
            {tabs.map(([id, name]) => <button role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{name}</button>)}
          </nav>
          <div class="panel">
            {tab === 'people' && <People c={c} act={act} />}
            {tab === 'lab' && <Lab c={c} act={act} />}
            {tab === 'fab' && <Fab c={c} act={act} />}
            {tab === 'guide' && <Guide c={c} act={act} />}
            {tab === 'finds' && <Finds c={c} />}
            {tab === 'board' && (
              <div class="stack board">
                <p class="hint">Nobody measures hope. You read it off the mess board. Time wears it down, and so do the names on the wall. What lifts it is what comes home that is no use to anyone.</p>
                {c.board.map((l, i) => <p class={i === 0 ? 'latest' : ''}>{l}</p>)}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer class="bar">
        {sure
          ? <span class="row"><span class="hint">Abandon this expedition? It will not be recorded.</span><button class="btn ghost" onClick={restart}>Yes, abandon</button><button class="btn ghost" onClick={() => setSure(false)}>No</button></span>
          : <button class="btn ghost" onClick={() => setSure(true)}>Abandon expedition</button>}
        <span class="grow" />
        <button class="btn" onClick={() => act(() => endDay(c, null))}>Let the day pass</button>
        <button class="btn go" onClick={() => setDeploying(true)}>Send someone down</button>
      </footer>

      {deploying && <Deploy c={c} act={act} close={() => setDeploying(false)} />}
      {night && (
        <div class="overlay">
          <div class="sheet night">
            <h2>Night {c.day - 1}</h2>
            {c.night.length === 0 && <p>Nothing came through the wire. Nothing came up the lift. The growth moved a little closer, as it does.</p>}
            {c.night.map((l) => <p>{l}</p>)}
            <p class="boardline">On the mess board: “{c.board[0]}”</p>
            <div class="row end"><button class="btn go" onClick={() => setSeenDay(c.day)}>Morning</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
