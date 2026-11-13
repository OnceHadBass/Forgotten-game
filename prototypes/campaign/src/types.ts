export type Sense = 'light' | 'sound' | 'near';
export type BehaviourId = 'spines' | 'snare' | 'spores' | 'shriek' | 'burst' | 'mend' | 'lantern' | 'leech';
export type Plan = 'reeds' | 'fan' | 'pods' | 'mat' | 'spire' | 'pitcher' | 'crown' | 'bramble';
export type Pattern = 'veins' | 'bands' | 'spots' | 'rim';
export type Route = 'lit' | 'dark' | 'run';

/** Dealt per campaign: nothing about the look or name says what it does. */
export interface Species {
  id: number;
  name: string;
  behaviour: BehaviourId;
  sense: Sense;
  plan: Plan;
  pattern: Pattern;
  hue: number;
  glow: number;
  vivid: boolean;
}

/** What the expedition has earned about a species. The UI shows only this. */
export interface Knowledge {
  seen: boolean;
  sense: boolean;
  behaviour: boolean;
  researched: boolean;
  progress: number;
  given?: string;
}

export type Spec = 'Biologist' | 'Engineer' | 'Soldier' | 'Scout' | 'Medic' | 'Linguist';
export type Trait = 'Light-footed' | 'Iron stomach' | 'Cautious' | 'Resourceful' | 'Night owl' | 'Steady';
export type Job = 'lab' | 'wire' | 'infirmary' | 'fabricator' | 'rest';

export interface Person {
  id: number;
  name: string;
  spec: Spec;
  trait: Trait;
  job: Job;
  status: 'ok' | 'dead' | 'gone';
  wound: number;
  exposure: number;
  runs: number;
  epitaph?: string;
}

export type ModuleId = 'ops' | 'lab' | 'wire' | 'stores' | 'infirmary' | 'fabricator' | 'mess';

export interface Module {
  id: ModuleId;
  growth: number;
  lost: boolean;
  /** The species at this stretch of the wire. Shown only once it's been met below. */
  species: number;
}

export type RelicFn = 'hush' | 'lattice' | 'foretell' | 'tending' | 'choir' | 'memorywork';

export interface Relic {
  form: string;
  fn: RelicFn;
  identified: boolean;
  progress: number;
  where: 'base' | 'field' | 'lost' | 'body';
}

export type Focus = { kind: 'species'; id: number } | { kind: 'relic'; id: number } | { kind: 'glyphs' };

export interface Stores {
  salvage: number;
  medkits: number;
  probes: number;
  cells: number;
  rounds: number;
  relicCells: number;
  samples: number[];
  grafts: number[];
  readings: number;
}

export interface Body {
  name: string;
  layer: number;
  key: string;
  relics: number[];
  fragments: number;
}

/** What the ruin remembers between runs. */
export interface Site {
  deepest: number;
  runs: number;
  cut: Record<string, number>;
  caches: Record<number, { salvage: number; supplies: boolean }>;
  relicTaken: boolean[];
  sealedOpened: boolean[];
  seenEvents: string[];
  routeUse: Record<Route, number>;
  bodies: Body[];
  oldCampFound: boolean;
}

export type RoomKind =
  | 'growth' | 'glyphs' | 'hatch' | 'vault'
  | 'cache' | 'relay' | 'relic' | 'wonder' | 'horror' | 'sealed' | 'oldcamp';

export interface Plant {
  sp: number;
  /** Below the Threshold, bodies carry an organ from a second species. */
  extra: number | null;
  /** Whether the operative has noticed the second organ yet. */
  extraKnown: boolean;
  awake: boolean;
  gone: boolean;
  sampled: boolean;
  harvested: boolean;
}

export interface Room {
  key: string;
  kind: RoomKind;
  title: string;
  text: string;
  plants: Plant[];
  pile: number;
  done: boolean;
  event: string | null;
  body: Body | null;
  scoutUsed: boolean;
  lootBait: boolean;
}

export interface LogLine {
  t: string;
  tone: 'say' | 'bad' | 'good' | 'note' | 'white';
}

export interface Pack {
  salvage: number;
  samples: number[];
  readings: number;
  relicCells: number;
  wonders: string[];
  fragments: number;
  tags: string[];
}

export interface Run {
  who: number;
  layer: number;
  pos: number;
  side: boolean;
  phase: 'entry' | 'door' | 'far' | 'lift' | 'over';
  room: Room | null;
  /** The spine room waited in while a side room is visited. */
  held: Room | null;
  hp: number;
  downs: number;
  cell: number;
  wake: number;
  wakeAdded: boolean;
  exposure: number;
  medkits: number;
  probes: number;
  rounds: number;
  spareCells: number;
  relic: number | null;
  relicCharges: number;
  grafts: number[];
  pack: Pack;
  poison: number;
  stalked: boolean;
  wakeHidden: boolean;
  sealedDoor: boolean;
  caltrops: boolean;
  creature: boolean;
  liftBeats: number;
  uplinked: number[];
  collapsed: Record<number, number>;
  doneSides: string[];
  cuts: string[];
  log: LogLine[];
  cause: string;
  outcome: null | 'extracted' | 'dead' | 'abandoned';
}

export type EndKind = 'fallen' | 'spent' | 'depart' | 'reinforce' | 'open';

export interface Campaign {
  version: 1;
  seed: number;
  rng: number;
  expedition: number;
  day: number;
  hope: number;
  strain: number;
  species: Species[];
  guide: Knowledge[];
  relicDeal: { form: string; fn: RelicFn }[];
  relics: Relic[];
  fragments: number;
  translated: number;
  translateProgress: number;
  lore: string[];
  modules: Module[];
  people: Person[];
  stores: Stores;
  focus: Focus | null;
  fabUsed: number;
  site: Site;
  board: string[];
  night: string[];
  wonders: string[];
  prior: PriorExpedition | null;
  run: Run | null;
  over: null | { kind: EndKind; day: number };
}

export interface PriorExpedition {
  n: number;
  days: number;
  deepest: number;
  dead: string[];
  end: EndKind;
  named: string[];
}

export interface Ledger {
  expeditions: PriorExpedition[];
}
