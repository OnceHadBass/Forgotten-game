// The descent screen. Everything shown about a plant comes from the field
// guide, never from the species data: what you have not earned shows as "?".

import { useEffect, useRef } from 'preact/hooks';
import { BEHAVIOURS, LAYERS, RELICS, SENSE_TEXT, TUNE } from './data';
import { literacy, speciesName } from './game';
import { Portrait } from './portrait';
import * as R from './run';
import type { Campaign, Plant, Route, Run, Sense } from './types';

type Act = (fn: () => void) => void;

const WAKE_WORDS = ['silent', 'quiet', 'quiet', 'stirring', 'stirring', 'listening', 'listening', 'awake', 'awake', 'hunting', 'hunting'];
const ROUTE_SENSE: Record<Route, Sense> = { lit: 'light', dark: 'near', run: 'sound' };
const ROUTES: { id: Route; name: string; note: string }[] = [
  { id: 'lit', name: 'Torch on, keeping your distance', note: `Costs ${TUNE.cellLit}% of the cell.` },
  { id: 'dark', name: 'Torch off, along the wall', note: 'Costs nothing. You will brush against things.' },
  { id: 'run', name: 'Run for the far door', note: 'Fast and loud.' },
];

function Meter({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone: string }) {
  return (
    <div class={`meter ${tone}`}>
      <i>{label}</i>
      <span class="bar"><i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></span>
      <b>{Math.round(value)}</b>
    </div>
  );
}

function PlantCard({ c, p, i, act }: { c: Campaign; p: Plant; i: number; act: Act }) {
  const r = c.run!;
  const s = c.species[p.sp];
  const k = c.guide[p.sp];
  const door = r.phase === 'door' && !r.creature;
  if (p.gone) return <div class="plant gone"><span class="dim">Where the {speciesName(c, p.sp)} was.</span></div>;
  return (
    <div class={`plant${p.awake ? ' awake' : ''}`}>
      <Portrait s={s} seed={c.seed} awake={p.awake} />
      <div class="facts">
        <b>{speciesName(c, p.sp)}</b>
        <span class={p.awake ? 'bad' : 'dim'}>{p.awake ? 'Awake. Standing tall, trembling.' : 'Dormant.'}</span>
        <span><i>Wakes to</i> {k.sense ? SENSE_TEXT[s.sense] : '?'}</span>
        <span><i>Does</i> {k.behaviour ? BEHAVIOURS[s.behaviour].does : '?'}</span>
        {p.extraKnown && p.extra !== null && (
          <span class="note">Part of it is {c.guide[p.extra].seen ? `a ${speciesName(c, p.extra)}` : 'something you have not met'}{c.guide[p.extra].sense ? ` (wakes to ${SENSE_TEXT[c.species[p.extra].sense]})` : ''}.</span>
        )}
      </div>
      {door && (
        <div class="verbs">
          <button class="btn sm" disabled={r.cell < TUNE.scanCell} onClick={() => act(() => R.scan(c, i))} title="What wakes it, then what it does. Pings, and ends in a flash.">Scan · {TUNE.scanCell}%</button>
          <button class="btn sm" disabled={r.probes < 1} onClick={() => act(() => R.probe(c, i))} title="Throw a probe at it and watch what it does from here. Noisy.">Probe · {r.probes}</button>
          <button class="btn sm" disabled={p.sampled} onClick={() => act(() => R.cutting(c, i))} title="Go close and take a sample. Tells you everything. The lab wants these.">Cutting</button>
          {k.behaviour && <button class="btn sm life" disabled={p.harvested} onClick={() => act(() => R.harvest(c, i))} title={BEHAVIOURS[s.behaviour].graft.use}>Take a {BEHAVIOURS[s.behaviour].graft.name.toLowerCase()}</button>}
          <button class="btn sm" onClick={() => act(() => R.cut(c, i))} title="Machete. Close work, and it thrashes.">Cut down</button>
          <button class="btn sm" disabled={r.rounds < 1} onClick={() => act(() => R.shoot(c, i))} title="Heard everywhere.">Shoot</button>
        </div>
      )}
      {r.creature && R.canLure(c, i) && <button class="btn sm life" onClick={() => act(() => R.lure(c, i))}>Lead the skulker through it</button>}
    </div>
  );
}

/** What the guide says each way across would wake. Unknowns are shown as unknowns. */
function routeRisk(c: Campaign, r: Run, route: Route): string {
  const wakes: string[] = [];
  let unknown = 0, awake = 0;
  for (const p of r.room!.plants) {
    if (p.gone) continue;
    if (p.awake) { awake++; continue; }
    const k = c.guide[p.sp];
    if (!k.sense) unknown++;
    else if (c.species[p.sp].sense === ROUTE_SENSE[route]) wakes.push(speciesName(c, p.sp));
    if (p.extraKnown && p.extra !== null && c.guide[p.extra].sense && c.species[p.extra].sense === ROUTE_SENSE[route]) wakes.push(`the ${speciesName(c, p.extra)} in it`);
  }
  const parts: string[] = [];
  if (wakes.length) parts.push(`Wakes ${wakes.join(', ')}.`);
  if (unknown) parts.push(`${unknown} you cannot predict.`);
  if (awake) parts.push(`${awake} already awake will act.`);
  if (!parts.length) parts.push('Nothing you know of will wake.');
  if (route === 'dark' && r.stalked) parts.push('It moves when unlit.');
  return parts.join(' ');
}

function Debrief({ c, act }: { c: Campaign; act: Act }) {
  const r = c.run!;
  const p = c.people[r.who];
  const samples = r.pack.samples.reduce((a, b) => a + b, 0);
  const title = r.outcome === 'dead' ? `${p.name} is lost` : r.outcome === 'extracted' ? 'Up on the lift' : 'Walked out';
  return (
    <div class={`card debrief ${r.outcome}`}>
      <h2>{title}</h2>
      {r.outcome === 'dead' && <p>Lost in {LAYERS[r.layer]} to {r.cause}. Nothing carried comes home. What the suit learned was sent as it was learned, and is in the field guide. Someone could bring the tags back.</p>}
      {r.outcome === 'extracted' && <p>Home with {r.pack.salvage} kg of salvage, {samples} sample{samples === 1 ? '' : 's'}, {r.pack.readings} glyph reading{r.pack.readings === 1 ? '' : 's'}{r.pack.relicCells ? `, ${r.pack.relicCells} relic cell${r.pack.relicCells > 1 ? 's' : ''}` : ''}{r.pack.fragments ? ' and a fragment of a key' : ''}.{r.pack.wonders.length ? ' And something to tell them in the mess.' : ''}</p>}
      {r.outcome === 'abandoned' && <p>The pack stayed below. The belt kit and whatever the suit learned came home.</p>}
      <button class="btn go" onClick={() => act(() => R.settle(c))}>{r.outcome === 'dead' ? 'Tell the base' : 'Back to base'}</button>
    </div>
  );
}

export function Descent({ c, act }: { c: Campaign; act: Act }) {
  const r = c.run!;
  const p = c.people[r.who];
  const room = r.room;
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { logEnd.current?.parentElement?.scrollTo({ top: 1e6 }); }, [r.log.length]);

  const weight = R.packWeight(r);
  const side = R.sideHere(c);
  const far = r.phase === 'far' && !r.creature;
  const rel = r.relic === null ? null : c.relics[r.relic];
  const where = r.phase === 'entry' ? 'The lift beacon' : r.phase === 'lift' ? 'Waiting for the lift' : room?.title ?? '';
  const cache = c.site.caches[r.layer];
  const fragments = c.fragments + r.pack.fragments;
  const lit = literacy(c);

  return (
    <div class={`descent layer${r.layer}${r.cell <= 0 ? ' dark' : ''}`}>
      <header class="top">
        <h1>{LAYERS[r.layer].toUpperCase()} <span>{where}{r.side ? ' · side passage' : ''}</span></h1>
        <div class="readouts"><div><i>{p.spec}</i><b>{p.name}</b></div><div><i>Downed</i><b>{Math.min(2, r.downs)} of 2</b></div></div>
      </header>

      <div class="status">
        <Meter label="Health" value={r.hp} tone="hp" />
        <Meter label="Torch cell" value={r.cell} tone="cell" />
        <Meter label="Sickness" value={p.exposure + r.exposure} tone="sick" />
        <Meter label={`Pack ${weight.toFixed(0)} kg`} value={weight} max={TUNE.hardLimit} tone={weight > TUNE.comfortable ? 'heavy' : 'pack'} />
        <div class={`wake w${r.wakeHidden ? 'x' : r.wake}`}>
          <i>The ruin is</i>
          <span class="pips">{Array.from({ length: 10 }, (_, i) => <i class={!r.wakeHidden && i < r.wake ? 'on' : ''} />)}</span>
          <b>{r.wakeHidden ? 'impossible to read' : WAKE_WORDS[r.wake]}</b>
        </div>
      </div>

      <div class="cols">
        <section class="scene">
          {r.phase === 'over' ? <Debrief c={c} act={act} /> : (
            <>
              {room && r.phase !== 'entry' && r.phase !== 'lift' && (
                <div class="plants">
                  {room.plants.map((pl, i) => <PlantCard c={c} p={pl} i={i} act={act} />)}
                  {room.plants.length === 0 && <p class="dim empty">Nothing grows in here.</p>}
                </div>
              )}

              {r.creature && (
                <div class="card creature">
                  <h3>A skulker</h3>
                  <p>It hunts by your light and it hears well. Nothing else can be done until it is dealt with.</p>
                  <div class="row">
                    <button class="btn" onClick={() => act(() => R.fightBlade(c))}>Machete. Let it come.</button>
                    <button class="btn" disabled={r.rounds < 2} onClick={() => act(() => R.fightGun(c))}>Two shots (loud)</button>
                    <button class="btn" onClick={() => act(() => R.hide(c))}>Torch off. Do not breathe.</button>
                  </div>
                </div>
              )}

              {r.phase === 'entry' && (
                <div class="card">
                  <p>The beacon ticks. A doorway ahead, a hand too tall and a hand too narrow.</p>
                  <div class="row">
                    <button class="btn go" onClick={() => act(() => R.goOn(c))}>Go in</button>
                    <button class="btn" onClick={() => act(() => R.callLift(c))}>Call the lift</button>
                  </div>
                </div>
              )}

              {r.phase === 'door' && !r.creature && room && (
                <div class="card">
                  <h3>Cross the room</h3>
                  <div class="routes">
                    {ROUTES.map((x) => {
                      const why = R.canRoute(c, x.id);
                      return (
                        <button class="route" disabled={!!why} onClick={() => act(() => R.cross(c, x.id))}>
                          <b>{x.name}</b>
                          <span class="hint">{why ?? x.note}</span>
                          <span class="risk">{routeRisk(c, r, x.id)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {room.plants.some((x) => !x.gone && x.awake) && (
                    <div class="row"><button class="btn" onClick={() => act(() => R.waitItOut(c))}>Wait in the doorway for them to settle</button><span class="hint">Costs time, and time down here is sickness.</span></div>
                  )}
                </div>
              )}

              {far && room && (
                <div class="card">
                  <h3>The far side</h3>
                  <div class="stack">
                    {room.body && <div class="row"><button class="btn white" onClick={() => act(() => R.feature(c, 'tags'))}>Take {room.body.name}'s tags</button><span class="hint">Yellow in the growth. Suit yellow.</span></div>}
                    {room.pile > 0 && <div class="row"><button class="btn" onClick={() => act(() => R.searchPile(c))}>Search the salvage pile</button><span class="hint">About {room.pile} kg. Takes a moment and makes a noise.</span></div>}
                    {room.kind === 'glyphs' && !room.done && <div class="row"><button class="btn" onClick={() => act(() => R.feature(c))}>Read the glyph wall</button><span class="hint">Readings for the lab.</span></div>}
                    {room.kind === 'relay' && !room.done && <div class="row"><button class="btn" disabled={r.cell < TUNE.uplinkCell} onClick={() => act(() => R.feature(c))}>Send from the relay · {TUNE.uplinkCell}%</button><span class="hint">Samples and readings reach base now, whatever happens next. It hums.</span></div>}
                    {room.kind === 'cache' && (
                      <div class="row">
                        {(!cache || cache.supplies) && <button class="btn" onClick={() => act(() => R.feature(c, 'supplies'))}>Open the locker</button>}
                        <button class="btn" disabled={r.pack.salvage < 1} onClick={() => act(() => R.feature(c, 'stow'))}>Stow salvage</button>
                        <button class="btn" disabled={!cache || cache.salvage < 1} onClick={() => act(() => R.feature(c, 'take'))}>Take stowed ({cache?.salvage ?? 0} kg)</button>
                      </div>
                    )}
                    {room.kind === 'relic' && !c.site.relicTaken[r.layer - 1] && <div class="row"><button class="btn white" onClick={() => act(() => R.feature(c))}>Go to the white light</button></div>}
                    {room.kind === 'sealed' && !c.site.sealedOpened[r.layer - 1] && (
                      <div class="row"><button class="btn white" disabled={lit < 2} onClick={() => act(() => R.feature(c))}>Open the sealed door</button><span class="hint">{lit < 2 ? 'Signs you cannot read, and a door that will not answer. The lab needs more glyph readings.' : 'It reads STORES.'}</span></div>
                    )}
                    {room.kind === 'oldcamp' && !c.site.oldCampFound && <div class="row"><button class="btn white" onClick={() => act(() => R.feature(c))}>Look round the camp</button><span class="hint">Lockers like yours. Suits like yours.</span></div>}
                    {room.kind === 'vault' && (
                      <div class="stack">
                        <p>A door the size of the wall. White light in its seams. The hum comes from behind it.</p>
                        <div class="row"><button class="btn white" disabled={fragments < 3} onClick={() => act(() => R.feature(c, 'open'))}>Open the Vault</button><span class="hint">{fragments} of 3 key fragments.</span></div>
                        <div class="row"><button class="btn white" disabled={lit < 3} onClick={() => act(() => R.feature(c, 'reinforce'))}>Carry out the maintenance protocol</button><span class="hint">{lit < 3 ? `You cannot read it yet. Warden literacy ${lit} of 3.` : 'You can read every line of it.'}</span></div>
                      </div>
                    )}
                    <div class="row onward">
                      {r.side && <button class="btn go" onClick={() => act(() => R.leaveSide(c))}>Back to the main way</button>}
                      {!r.side && r.pos < 4 && <button class="btn go" onClick={() => act(() => R.goOn(c))}>Next room</button>}
                      {!r.side && room.kind === 'hatch' && <button class="btn go" onClick={() => act(() => R.forceHatch(c))}>Force the hatch down (loud)</button>}
                      {side && !side.done && <button class="btn" disabled={!side.open} onClick={() => act(() => R.goSide(c))}>{side.open ? 'Take the side passage' : 'Side passage: collapsed'}</button>}
                      {!r.side && <button class="btn" onClick={() => act(() => R.callLift(c))}>Call the lift ({r.pos + 2} to wait out)</button>}
                    </div>
                  </div>
                </div>
              )}

              {r.phase === 'lift' && !r.creature && (
                <div class="card">
                  <p>{r.liftBeats > 0 ? `The winch is grinding. ${r.liftBeats} more to wait out, and everything that hears it is coming to look.` : 'The cage is down.'}</p>
                  <button class="btn go" onClick={() => act(() => R.liftBeat(c))}>{r.liftBeats > 0 ? 'Hold on' : 'Get in'}</button>
                </div>
              )}

              <div class="belt">
                <button class="btn sm" disabled={r.medkits < 1 || r.hp >= TUNE.hp} onClick={() => act(() => R.useMedkit(c))}>Medkit · {r.medkits}</button>
                <button class="btn sm" disabled={r.spareCells < 1} onClick={() => act(() => R.useCell(c))}>Spare cell · {r.spareCells}</button>
                {rel && <button class="btn sm white" disabled={r.relicCharges < 1} onClick={() => act(() => R.useRelic(c))} title={rel.identified ? RELICS[rel.fn].does : 'You do not know what it does.'}>{rel.identified ? RELICS[rel.fn].name : `Use the ${rel.form}`} · {r.relicCharges}</button>}
                {r.grafts.map((n, sp) => n > 0 && <button class="btn sm life" onClick={() => act(() => R.useGraft(c, sp))} title={BEHAVIOURS[c.species[sp].behaviour].graft.use}>{BEHAVIOURS[c.species[sp].behaviour].graft.name} · {n}</button>)}
                <span class="dim">{r.rounds} rounds{r.caltrops ? ' · fronds scattered behind' : ''}{r.sealedDoor ? ' · door gummed' : ''}{r.poison ? ' · spores in the lungs' : ''}{r.stalked ? ' · something at the edge of the beam' : ''}</span>
                {r.layer === 1 && r.phase !== 'lift' && !r.creature && <button class="btn sm ghost" onClick={() => act(() => R.abandon(c))}>Drop the pack and walk out</button>}
              </div>
            </>
          )}
        </section>

        <section class="log" aria-live="polite">
          {r.log.map((l) => <p class={l.tone}>{l.t}</p>)}
          <div ref={logEnd} />
        </section>
      </div>
    </div>
  );
}
