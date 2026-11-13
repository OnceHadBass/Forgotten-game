// The record that outlives a campaign. Each expedition that ends is found by
// the next one, as a camp in the ruin and a list of names.

import { speciesName } from './game';
import type { Campaign, Ledger } from './types';

const LEDGER = 'forgotten.ledger';
const SAVE = 'forgotten.campaign';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows and previews have no storage. The game still plays.
  }
}

export const loadLedger = (): Ledger => read<Ledger>(LEDGER) ?? { expeditions: [] };
export const loadCampaign = (): Campaign | null => {
  const c = read<Campaign>(SAVE);
  return c && c.version === 1 ? c : null;
};
export const saveCampaign = (c: Campaign | null): void => write(SAVE, c);

export function entryFor(c: Campaign): Ledger['expeditions'][number] {
  return {
    n: c.expedition,
    days: c.over?.day ?? c.day,
    deepest: c.site.deepest,
    dead: c.people.filter((p) => p.status !== 'ok').map((p) => p.name),
    end: c.over?.kind ?? 'fallen',
    named: c.guide.map((k, id) => (k.seen ? speciesName(c, id) : '')).filter(Boolean),
  };
}

export function recordExpedition(c: Campaign): void {
  const ledger = loadLedger();
  if (ledger.expeditions.some((e) => e.n === c.expedition)) return;
  ledger.expeditions.push(entryFor(c));
  write(LEDGER, ledger);
}
