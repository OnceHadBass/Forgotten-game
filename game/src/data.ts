// Content and tuning. No logic. Adding a creature, a weapon or a plant
// behaviour means adding data here.

export const T = 2; // metres per tile

export const TUNE = {
  player: { r: 0.42, speed: 5.4, hp: 100, cell: 100, dodgeSpeed: 15, dodgeTime: 0.3, dodgeInvuln: 0.26, dodgeRegen: 1.5, hurtInvuln: 0.45 },
  torch: { range: 19, cos: Math.cos(0.5), drain: 0.9, recharge: 2.2, relight: 15 },
  light: { wake: 0.55 },
  mood: { stir: 0.95, settle: 7 },
  noise: { step: 0, swing: 5, hit: 7, dodge: 4, urn: 9 },
  medkit: 40,
  downs: 2,
  pickup: 1.5,
  graftCap: 3,
  growth: { perDay: 8, burnCost: 30, burn: 20 },
} as const;

export const LAYERS = [
  { name: '', fog: 0x05080a, wall: 0x4a5257, floor: 0x3a4145, amb: 0x1c2a30 },
  { name: 'The Threshold', fog: 0x061014, wall: 0x4d5a5c, floor: 0x3c4648, amb: 0x1d3036 },
  { name: 'The Interior', fog: 0x070d0b, wall: 0x4a5a50, floor: 0x38443c, amb: 0x1a2c24 },
  { name: 'The Works', fog: 0x08090f, wall: 0x50525f, floor: 0x3c3e4a, amb: 0x20223a },
  { name: 'The Vault', fog: 0x0a0b0e, wall: 0x6a6f78, floor: 0x4a4d55, amb: 0x2a2e3a },
] as const;

// ── plants ──────────────────────────────────────────────────────────────────

export type Sense = 'light' | 'sound' | 'near';
export type BehaviourId = 'spines' | 'snare' | 'spores' | 'shriek' | 'burst' | 'mend' | 'lantern' | 'gall';
export type Plan = 'reeds' | 'fan' | 'pods' | 'mat' | 'spire' | 'pitcher' | 'crown' | 'bramble';

export interface BehaviourData {
  kind: 'harm' | 'boon';
  does: string;
  first: string;
  graft: { name: string; use: string } | null;
}

export const BEHAVIOURS: Record<BehaviourId, BehaviourData> = {
  spines: { kind: 'harm', does: 'Lashes everything in reach with spines.', first: 'Spines. Through the suit like paper. Noted, with feeling.', graft: { name: 'Needle frond', use: 'Scatter it. Things that cross it bleed and stumble.' } },
  snare: { kind: 'harm', does: 'Grips what comes close and drinks the suit cell.', first: 'It has my leg, and the torch is dimming. It is drinking the cell.', graft: { name: 'Creeper gum', use: 'A patch that holds whatever runs into it.' } },
  spores: { kind: 'harm', does: 'Breathes clouds that drift after you.', first: 'The cloud turned. It turned to follow me.', graft: { name: 'Spore pod', use: 'A cloud that eats anything breathing in it.' } },
  shriek: { kind: 'harm', does: 'Screams. Everything that hears it comes.', first: 'That was not a human sound. Now the whole place is listening.', graft: { name: 'Shrieker bulb', use: 'Throw it. The ruin hunts the scream instead of you.' } },
  burst: { kind: 'harm', does: 'Swells and bursts.', first: 'It went off. My ears are ringing and something answered.', graft: { name: 'Blister pod', use: 'A grenade that grew.' } },
  mend: { kind: 'boon', does: 'Asleep, being near it closes wounds.', first: 'Huh. I feel better just being close to the leaves here.', graft: { name: 'Mending leaf', use: 'Press it to a wound.' } },
  lantern: { kind: 'boon', does: 'Asleep, its light feeds the suit cell. Some things will not enter its light.', first: 'The cell gauge is climbing. It is feeding the suit. Why would it do that?', graft: { name: 'Light pod', use: 'A light that is not your torch. Some things cannot move in it.' } },
  gall: { kind: 'harm', does: 'A nest. Woken, it pours out mites.', first: 'It split open and they came out of it. Dozens.', graft: null },
};

export const NAME_FIRST = ['Ashen', 'Sallow', 'Drift', 'Hollow', 'Thresh', 'Marrow', 'Quill', 'Sable', 'Wend', 'Gault', 'Murk', 'Cinder', 'Slake', 'Tallow', 'Brack', 'Vesper', 'Loam', 'Fallow', 'Knell'] as const;
export const NAME_SECOND: Record<Plan, readonly string[]> = {
  reeds: ['reed', 'rush'], fan: ['fan', 'frond'], pods: ['gall', 'pod'], mat: ['felt', 'mat'],
  spire: ['spire', 'spike'], pitcher: ['urn', 'cup'], crown: ['crown', 'whorl'], bramble: ['briar', 'tangle'],
};
export const PLANS: readonly Plan[] = ['reeds', 'fan', 'pods', 'mat', 'spire', 'pitcher', 'crown', 'bramble'];
/** Plant bodies: greens, teal-blues, violets, deep reds, rust. Never yellow, never white. */
export const BODY_HUES: readonly [number, number][] = [[100, 150], [165, 200], [255, 288], [345, 362], [14, 26]];
export const GLOW_HUES: readonly [number, number] = [168, 318];

// ── creatures ───────────────────────────────────────────────────────────────

export type EnemyId = 'mite' | 'skulker' | 'spitter' | 'husk' | 'unlit' | 'tender' | 'grazer' | 'warden';
export interface EnemyData {
  name: string; hp: number; speed: number; r: number; dmg: number;
  sight: number; poise: number; range: number; windup: number; recover: number; loot: number;
}
export const ENEMIES: Record<EnemyId, EnemyData> = {
  mite: { name: 'Mite', hp: 7, speed: 6.4, r: 0.26, dmg: 5, sight: 9, poise: 0, range: 0.9, windup: 0.18, recover: 0.5, loot: 0.06 },
  skulker: { name: 'Skulker', hp: 44, speed: 4.5, r: 0.5, dmg: 16, sight: 8, poise: 12, range: 3.4, windup: 0.42, recover: 0.75, loot: 0.45 },
  spitter: { name: 'Spitter', hp: 28, speed: 3.1, r: 0.5, dmg: 13, sight: 11, poise: 6, range: 11, windup: 0.55, recover: 1.3, loot: 0.45 },
  husk: { name: 'Husk', hp: 150, speed: 2.6, r: 0.9, dmg: 28, sight: 8, poise: 45, range: 2.6, windup: 0.8, recover: 1.1, loot: 1 },
  unlit: { name: '', hp: 90, speed: 6.6, r: 0.45, dmg: 30, sight: 30, poise: 999, range: 1.3, windup: 0.1, recover: 1.6, loot: 1 },
  // Harmless. It feeds at glowing plants, and the plants feed on it.
  grazer: { name: 'Grazer', hp: 5, speed: 3.6, r: 0.22, dmg: 0, sight: 6, poise: 0, range: 0, windup: 0, recover: 0, loot: 0 },
  // A Warden construct. It gardens. It minds if you cut what it tends.
  warden: { name: 'Gardener', hp: 130, speed: 2.2, r: 0.6, dmg: 20, sight: 12, poise: 60, range: 9, windup: 0.7, recover: 1.1, loot: 1 },
  tender: { name: 'The Tender', hp: 820, speed: 2.4, r: 1.3, dmg: 24, sight: 40, poise: 999, range: 14, windup: 1.0, recover: 1.0, loot: 1 },
};

/** What the operative works out about a creature: on first sight, then once it has drawn blood or died. */
export const CREATURES: Record<EnemyId, { cause: string; first: string; trick: string }> = {
  mite: { cause: 'mites', first: 'Mites. Small, fast, and never just one.', trick: 'They pour out of a nest when the nest wakes. Do not wake it, or cut it down first.' },
  skulker: { cause: 'a skulker', first: 'Eyeshine, low to the ground. A skulker. It is watching my torch.', trick: 'It crouches before it lunges. Step aside when it crouches and cut it while it recovers. It sees a lit torch from a long way off.' },
  spitter: { cause: 'a spitter', first: 'Something on three thin legs, with a sac that glows. A spitter.', trick: 'The sac swells before it spits, and it backs away from you. Dodge the glob and close the distance.' },
  husk: { cause: 'a husk', first: 'Big. Slow. Plated in its own moss. A husk.', trick: 'It raises both arms before it slams. Get out of the ring, then hit it while its arms are down.' },
  unlit: { cause: 'the thing that moves when unlit', first: 'Something stands at the edge of the beam. It was further away a moment ago.', trick: 'It only moves when no light is on it. Keep the beam on it, stand by a lantern plant, or throw a light pod.' },
  grazer: { cause: '', first: 'Small lights, drifting between the plants. Grazers, feeding. They scatter when I move.', trick: 'Harmless. Plants that sense nearness take them out of the air: watch which ones.' },
  warden: { cause: 'the gardener', first: 'Rows. Sleeping plants in rows, and a thing of pale struts turning each one a little. It does not look up.', trick: 'It gardens. It only turns on you if you cut what it tends, or strike it. It flashes white before its beam: move then.' },
  tender: { cause: 'the Tender', first: 'It unfolds from the door like a hand opening. The Tender.', trick: 'The beam sweeps: put a pillar between you. The ring spreads: dodge through it. It calls mites.' },
};

/** Said once a campaign, the first time each kind of thing is picked up. */
export const PICKUPS = {
  salvage: 'Salvage. Alloy and filament. The base turns it into kit, if I get it home.',
  ammo: 'Rounds. Right click fires, and everything hears it.',
  medkit: 'A medkit. H to use one.',
  cell: 'A suit cell. The torch will last longer.',
  sample: 'A sample, sealed. Two from the same species and the suit can work out what it does.',
} as const;

// ── items ───────────────────────────────────────────────────────────────────

export type Slot = 'blade' | 'gun' | 'suit';
export interface BladeBase { slot: 'blade'; name: string; dmg: number; speed: number; reach: number; arc: number; knock: number }
export interface GunBase { slot: 'gun'; name: string; dmg: number; rate: number; pellets: number; spread: number; use: number; range: number; noise: number }
export interface SuitBase { slot: 'suit'; name: string }

export const BLADES: readonly BladeBase[] = [
  { slot: 'blade', name: 'Machete', dmg: 14, speed: 1, reach: 2.4, arc: 115, knock: 5 },
  { slot: 'blade', name: 'Long blade', dmg: 21, speed: 0.76, reach: 3.1, arc: 95, knock: 6 },
  { slot: 'blade', name: 'Hook pair', dmg: 9, speed: 1.5, reach: 2.0, arc: 150, knock: 3 },
  { slot: 'blade', name: 'Breaker', dmg: 31, speed: 0.56, reach: 2.6, arc: 160, knock: 11 },
];
export const GUNS: readonly GunBase[] = [
  { slot: 'gun', name: 'Service pistol', dmg: 20, rate: 0.3, pellets: 1, spread: 0.02, use: 1, range: 22, noise: 18 },
  { slot: 'gun', name: 'Scattergun', dmg: 9, rate: 0.8, pellets: 7, spread: 0.24, use: 2, range: 11, noise: 22 },
  { slot: 'gun', name: 'Carbine', dmg: 12, rate: 0.11, pellets: 1, spread: 0.07, use: 1, range: 20, noise: 16 },
];
export const SUITS: readonly SuitBase[] = [{ slot: 'suit', name: 'Expedition suit' }, { slot: 'suit', name: 'Hard suit' }, { slot: 'suit', name: 'Survey rig' }];

export type AffixId =
  | 'keen' | 'swift' | 'long' | 'quiet' | 'leeching' | 'heavy' | 'sundering'
  | 'rapid' | 'piercing' | 'frugal'
  | 'plated' | 'sealed' | 'servo' | 'banked' | 'sprung' | 'grounded';

export const AFFIXES: Record<AffixId, { adj: string; text: string; slots: readonly Slot[] }> = {
  keen: { adj: 'Keen', text: '+25% damage', slots: ['blade', 'gun'] },
  swift: { adj: 'Swift', text: '+22% swing speed', slots: ['blade'] },
  long: { adj: 'Reaching', text: '+0.5 m reach', slots: ['blade'] },
  quiet: { adj: 'Muffled', text: 'Makes far less noise', slots: ['blade', 'gun'] },
  leeching: { adj: 'Leeching', text: 'Kills mend 3', slots: ['blade'] },
  heavy: { adj: 'Heavy', text: 'Staggers and throws back', slots: ['blade'] },
  sundering: { adj: 'Sundering', text: 'Double damage to growth', slots: ['blade'] },
  rapid: { adj: 'Rapid', text: '+25% rate of fire', slots: ['gun'] },
  piercing: { adj: 'Piercing', text: 'Passes through one more', slots: ['gun'] },
  frugal: { adj: 'Frugal', text: 'One shot in four is free', slots: ['gun'] },
  plated: { adj: 'Plated', text: '+25 health', slots: ['suit'] },
  sealed: { adj: 'Sealed', text: 'Spores do far less', slots: ['suit'] },
  servo: { adj: 'Servo', text: '+10% speed', slots: ['suit'] },
  banked: { adj: 'Banked', text: '+35 torch cell', slots: ['suit'] },
  sprung: { adj: 'Sprung', text: '+1 dodge', slots: ['suit'] },
  grounded: { adj: 'Grounded', text: 'Snares cannot hold you', slots: ['suit'] },
};

export const RARITY = ['Worn', 'Fine', 'Wrought', 'Warden-touched'] as const;
/** Human kit is warm, the Wardens are white. Loot colour follows who made it. */
export const RARITY_COLOUR = ['#8b979c', '#d9c98a', '#f0bf2c', '#f3fbff'] as const;

export interface Item { slot: Slot; base: number; rarity: number; affixes: AffixId[]; name: string }

export type RelicFn = 'hush' | 'lattice' | 'still' | 'tending' | 'choir' | 'memorywork';
export const RELIC_FORMS = ['ribbed rod', 'hollow disc', 'folded lattice', 'cold bead on a wire', 'split prism', 'ring that hums'] as const;
export const RELICS: Record<RelicFn, { name: string; does: string; used: string }> = {
  hush: { name: 'The Hush', does: 'Everything hunting you loses the thread.', used: 'A pressure in the ears, then nothing. The ruin has lost the thread of me.' },
  lattice: { name: 'Warden Lattice', does: 'Unmakes growth and sears flesh in a wide ring.', used: 'White lines through the air. Where the growth was there is clean stone.' },
  still: { name: 'Stillness', does: 'The world slows. You do not.', used: 'Everything is moving through honey. Everything but me.' },
  tending: { name: 'The Tending Hand', does: 'Mends you past what medicine can.', used: 'The wounds closed like water. My hands will not stop shaking.' },
  choir: { name: 'Choir-call', does: 'One chord. Every creature in earshot stands stunned.', used: 'One chord, and the room breathed out.' },
  memorywork: { name: 'Memorywork', does: 'Ends everything near you. Takes something you knew in payment.', used: 'The room is empty. There was a species I knew. There is a gap where it was.' },
};

export const UPGRADES = [
  { id: 'plating', name: 'Suit plating', text: '+20 health', max: 3, cost: 30 },
  { id: 'cell', name: 'Cell bank', text: '+25 torch cell', max: 3, cost: 25 },
  { id: 'belt', name: 'Medkit belt', text: 'Carry one more medkit', max: 2, cost: 35 },
  { id: 'holster', name: 'Ammunition', text: '+12 rounds each descent', max: 3, cost: 20 },
  { id: 'satchel', name: 'Graft satchel', text: 'Carry one more of each graft', max: 2, cost: 30 },
  { id: 'wire', name: 'Wire crew', text: 'The growth comes 1.5 slower each day', max: 3, cost: 40 },
] as const;
export type UpgradeId = (typeof UPGRADES)[number]['id'];

export const PEOPLE = ['Ines Okafor', 'Tobias Rahn', 'Mirela Dascalu', 'Kofi Asante', 'Hana Sorensen', 'Dmitri Vale', 'Priya Nambiar', 'Lorcan Hale', 'Yuki Tamura', 'Esther Mbeki', 'Aurel Kovac', 'Noor Haddad', 'Signe Lund', 'Mateus Prado', 'Wren Calloway', 'Lien Tran'] as const;

export const LORE = [
  'STORES. KEEP. DO NOT WAKE. The same three signs, on every wall.',
  'They did not build the signal. They followed it here, as we did, and found the thing already old.',
  'One line at every hatch: the growth is the lock. Tend it. Those who burn it open the door.',
  'A tally of generations. It stops mid-row. Nothing violent. Somebody just stopped counting.',
  'A diagram of this place from above. We have been walking on the lid of something.',
] as const;

export const THOUGHTS = {
  start: ['The lift goes back up. The beacon here will call it down again.', 'Dust in the beam. The doorways are a hand too tall and a hand too narrow.'],
  wake: ['Did that just stir?', 'It is standing taller than it was.', 'Something woke.'],
  dark: ['The torch is dead. The dark is where you listen.'],
  unlit: ['Something stands at the edge of the beam. It was further away a moment ago.'],
  relic: ['White light. The only white light in the ruin.'],
  hatch: ['A hatch. Sealed, but not well. It will be loud.'],
  body: ['Yellow in the growth. Suit yellow.'],
  low: ['I can hear my own heart in the helmet.'],
  thicket: ['Growth across the whole passage. It will have to be cut.'],
  silence: ['Nothing sings in here. Nothing at all.'],
  pulse: ['Every glowing thing flared at once, in a wave, from somewhere below. It came from over there.'],
  garden: ['Rows. Sleeping plants in rows, and a thing of pale struts turning each one a little. It does not look up.'],
  angry: ['It has stopped gardening. It is looking at me.'],
  grazer: ['Small lights, drifting between the plants. Feeding. They scatter when I move.'],
  eaten: ['It took one of the little lights out of the air. So that is what it does.'],
  bullets: ['The round went straight through it. It hardly noticed. It noticed me.'],
  breach: ['Daylight, coming down through the roof. Things grow thicker under it.'],
} as const;

export const ENDINGS = {
  fallen: { title: 'The base has fallen', text: 'The growth came through the floor of Operations in the night. The signal goes on. Eventually someone else will follow it.' },
  spent: { title: 'No one left to send', text: 'The last name is on the wall, and nobody is left to read it.' },
  depart: { title: 'Departure', text: 'You take what the Tender guarded and you leave. Behind you the ruin keeps its count. You already know somebody will come back for it.' },
  reinforce: { title: 'Reinforcement', text: 'You do what the Wardens stopped doing. You tend the lock. The growth settles round the base like a hand closing gently. Those who keep watch: that is you now.' },
  open: { title: 'The Vault', text: 'It opens the way an eye does. What is inside is not a monster and is not a gift, and the record of this expedition becomes a different kind of document from here on.' },
} as const;
export type EndKind = keyof typeof ENDINGS;
