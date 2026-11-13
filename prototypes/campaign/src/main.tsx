import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Base } from './base';
import { ENDINGS, LAYERS } from './data';
import { Descent } from './descent';
import { newCampaign, speciesName } from './game';
import { loadCampaign, loadLedger, recordExpedition, saveCampaign } from './ledger';
import type { Campaign, Ledger } from './types';

const NUMBER = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n: number): string => NUMBER[n] ?? String(n);

function Title({ ledger, saved, begin, resume }: { ledger: Ledger; saved: Campaign | null; begin: () => void; resume: () => void }) {
  const n = (ledger.expeditions[ledger.expeditions.length - 1]?.n ?? 0) + 1;
  return (
    <div class="title">
      <p class="eyebrow">Base camp · a campaign prototype</p>
      <h1>FORGOTTEN</h1>
      <p class="lede">An expedition followed a signal to a world that is slowly digesting it. Ten people, a ruin that goes down a long way, and a wire that the growth crosses a little further every night.</p>
      <div class="row">
        {saved && !saved.over && <button class="btn go" onClick={resume}>Continue expedition {saved.expedition}, day {saved.day}</button>}
        <button class={`btn${saved && !saved.over ? '' : ' go'}`} onClick={begin}>Begin expedition {n}</button>
      </div>
      <ul class="how">
        <li><b>Send one person down a day.</b> Everyone else works: the lab, the wire, the infirmary, the fabricator.</li>
        <li><b>Nothing about a plant's look says what it does.</b> Scan, probe, take cuttings. What you learn stays learned, and it is the only thing that does.</li>
        <li><b>Noise is the price of everything.</b> Power is allowed. It is never free.</li>
        <li><b>Bring things home.</b> Salvage keeps the base running. Wonders keep the people in it.</li>
      </ul>
      {ledger.expeditions.length > 0 && (
        <div class="ledger">
          <h4>The ones who followed the signal before you</h4>
          {ledger.expeditions.slice().reverse().map((e) => (
            <p><b>Expedition {e.n}.</b> {e.days} days. {e.deepest ? `Reached ${LAYERS[e.deepest]}.` : 'Never went below.'} {ENDINGS[e.end].title}. {count(e.dead.length)} name{e.dead.length === 1 ? '' : 's'} on the wall.</p>
          ))}
        </div>
      )}
    </div>
  );
}

function End({ c, again }: { c: Campaign; again: () => void }) {
  const e = ENDINGS[c.over!.kind];
  const wall = c.people.filter((p) => p.status !== 'ok');
  const known = c.guide.filter((k) => k.seen).length;
  return (
    <div class={`title end ${c.over!.kind}`}>
      <p class="eyebrow">Expedition {c.expedition} · day {c.over!.day}</p>
      <h1>{e.title.toUpperCase()}</h1>
      <p class="lede">{e.text}</p>
      <div class="ledger">
        <h4>What was learned</h4>
        <p>{known} of {c.species.length} species met{known ? `: ${c.guide.map((k, id) => (k.seen ? speciesName(c, id) : '')).filter(Boolean).join(', ')}` : ''}. Deepest point: {c.site.deepest ? LAYERS[c.site.deepest] : 'the surface'}. {c.wonders.length} wonder{c.wonders.length === 1 ? '' : 's'} brought home.</p>
        <h4>The wall</h4>
        {wall.length === 0 && <p>Nobody. All ten.</p>}
        {wall.map((p) => <p><b>{p.name}</b> <span class="dim">{p.spec}. {p.epitaph}</span></p>)}
      </div>
      <p class="hint">The next expedition will find what this one left.</p>
      <button class="btn go" onClick={again}>Follow the signal again</button>
    </div>
  );
}

function App() {
  const [c, setC] = useState<Campaign | null>(null);
  const [, setTick] = useState(0);
  const [seenDay, setSeenDay] = useState(1);
  const [ledger, setLedger] = useState<Ledger>(loadLedger);

  const act = (fn: () => void): void => {
    fn();
    if (c) {
      if (c.over) {
        recordExpedition(c);
        saveCampaign(null);
        setLedger(loadLedger());
      } else saveCampaign(c);
    }
    setTick((t) => t + 1);
  };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [c?.run === null, c?.over, c === null]);

  const begin = (): void => {
    const fresh = newCampaign((Date.now() ^ (Math.random() * 0x7fffffff)) | 0, ledger);
    saveCampaign(fresh);
    setSeenDay(1);
    setC(fresh);
  };
  if (!c) {
    const saved = loadCampaign();
    return <Title ledger={ledger} saved={saved} begin={begin} resume={() => { setSeenDay(saved?.day ?? 1); setC(saved); }} />;
  }
  if (c.over) return <End c={c} again={() => setC(null)} />;
  if (c.run) return <Descent c={c} act={act} />;
  return <Base c={c} act={act} restart={() => { saveCampaign(null); setC(null); }} seenDay={seenDay} setSeenDay={setSeenDay} />;
}

render(<App />, document.getElementById('app')!);
