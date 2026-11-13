// Content only, no logic. Tuning numbers live in TUNE.

import type { BehaviourId, Job, ModuleId, Plan, RelicFn, Sense, Spec, Trait } from './types';

export const TUNE = {
  roster: 10,
  startHope: 62,
  hp: 100,
  comfortable: 18,
  hardLimit: 27,
  cellLit: 6,
  cellRun: 4,
  scanCell: 15,
  uplinkCell: 15,
  growthBase: 2.3,
  growthPerDay: 0.09,
  growthPerDaySq: 0.0015,
  defencePerPoint: 2.4,
  herbicide: 38,
  opsPerLost: 5,
  speciesCost: 4,
  relicCost: 4,
  readingCost: 1.4,
  literacy: [6, 15, 27],
  ascent: { salvage: 45, relicCells: 2 },
} as const;

export const LAYERS = ['', 'the Threshold', 'the Interior', 'the Works'] as const;

export const SENSE_TEXT: Record<Sense, string> = {
  light: 'torchlight',
  sound: 'noise',
  near: 'something close',
};

export interface BehaviourData {
  kind: 'harm' | 'boon';
  /** Field-guide wording once witnessed. */
  does: string;
  /** What the operative says the first time. */
  first: string;
  graft: { name: string; use: string };
}

export const BEHAVIOURS: Record<BehaviourId, BehaviourData> = {
  spines: {
    kind: 'harm',
    does: 'Lashes out with spines when woken. Deep punctures.',
    first: 'It went through the suit like paper. Spines. Noted, with feeling.',
    graft: { name: 'Needle frond', use: 'Scatter it behind you. The next thing that hunts you treads on it.' },
  },
  snare: {
    kind: 'harm',
    does: 'Grips whatever passes and feeds on the suit cell while it holds.',
    first: 'It has my leg and the torch is dimming. It is drinking the cell.',
    graft: { name: 'Creeper gum', use: 'Gum a door shut behind you. Nothing follows you to the lift.' },
  },
  spores: {
    kind: 'harm',
    does: 'Breathes a cloud that drifts after you and lingers in the lungs.',
    first: 'The cloud turned. It turned to follow me. I can taste it through the filter.',
    graft: { name: 'Spore pod', use: 'Break it in a room. Everything growing there withers, quietly.' },
  },
  shriek: {
    kind: 'harm',
    does: 'Does no harm itself. It screams, and everything that hears it wakes.',
    first: 'That was not a human sound. And now the whole place is listening.',
    graft: { name: 'Shrieker bulb', use: 'Throw it down another passage. The ruin listens over there instead.' },
  },
  burst: {
    kind: 'harm',
    does: 'Swells and bursts when woken. The blast carries, and so does the sound.',
    first: 'It just went off. My ears are ringing and something answered it.',
    graft: { name: 'Blister pod', use: 'A grenade that grew. Clears a room of growth and whatever is hunting. Loud.' },
  },
  mend: {
    kind: 'boon',
    does: 'Left asleep, being near it closes wounds. Woken, it clams shut.',
    first: 'Huh. I feel better just being close to the leaves here.',
    graft: { name: 'Mending leaf', use: 'Press it to a wound. It keeps working for a while after it is cut.' },
  },
  lantern: {
    kind: 'boon',
    does: 'Left asleep, its light tops up a suit cell. Woken, it closes up dark.',
    first: 'The cell gauge is climbing. It is feeding the suit. Why would it do that?',
    graft: { name: 'Light pod', use: 'A light that is not your torch. Charges the cell. Some things will not come near it.' },
  },
  leech: {
    kind: 'harm',
    does: 'Puts fine roots through the suit seals. You carry the sickness home.',
    first: 'There are threads in the wrist seal. I can feel it in my teeth.',
    graft: { name: 'Leech root', use: 'Turned round, it draws the sickness out of you instead.' },
  },
};

export const NAME_FIRST = [
  'Ashen', 'Sallow', 'Drift', 'Hollow', 'Thresh', 'Marrow', 'Quill', 'Sable', 'Wend', 'Gault',
  'Murk', 'Cinder', 'Slake', 'Tallow', 'Brack', 'Vesper', 'Loam', 'Sedge', 'Fallow', 'Knell',
] as const;

export const NAME_SECOND: Record<Plan, readonly string[]> = {
  reeds: ['reed', 'rush', 'sedge'],
  fan: ['fan', 'frond'],
  pods: ['gall', 'pod'],
  mat: ['felt', 'mat'],
  spire: ['spire', 'spike'],
  pitcher: ['urn', 'cup'],
  crown: ['crown', 'whorl'],
  bramble: ['briar', 'tangle'],
};

export const PLANS: readonly Plan[] = ['reeds', 'fan', 'pods', 'mat', 'spire', 'pitcher', 'crown', 'bramble'];

/** Plant bodies: greens, teal-blues, violets, deep reds, rust. Never yellow, never white. */
export const BODY_HUES: readonly [number, number][] = [[98, 150], [165, 200], [255, 288], [345, 362], [14, 26]];
/** Glow stays in the teal to magenta band. */
export const GLOW_HUES: readonly [number, number] = [168, 318];

export const PEOPLE = [
  'Ines Okafor', 'Tobias Rahn', 'Mirela Dascalu', 'Kofi Asante', 'Hana Sorensen', 'Dmitri Vale',
  'Priya Nambiar', 'Lorcan Hale', 'Yuki Tamura', 'Esther Mbeki', 'Aurel Kovac', 'Noor Haddad',
  'Signe Lund', 'Mateus Prado', 'Wren Calloway', 'Ioana Petric', 'Dag Ostrow', 'Lien Tran',
  'Cormac Reyes', 'Saba Qureshi', 'Tamsin Voss', 'Emeka Dike', 'Rosalind Achterberg', 'Jun Park',
] as const;

export const SPECS: readonly Spec[] = ['Biologist', 'Engineer', 'Soldier', 'Scout', 'Medic', 'Linguist'];
export const TRAITS: readonly Trait[] = ['Light-footed', 'Iron stomach', 'Cautious', 'Resourceful', 'Night owl', 'Steady'];

export const SPEC_TEXT: Record<Spec, string> = {
  Biologist: 'Lab work counts double on species. Below, every cutting yields two.',
  Engineer: 'Counts double at the fabricator. Below, a relic gives one more use.',
  Soldier: 'Counts for more on the wire. Below, things that bite do half the harm.',
  Scout: 'Below, the first noise made in each room goes unheard.',
  Medic: 'Counts double in the infirmary. Below, medkits mend more.',
  Linguist: 'Lab work counts double on glyphs. Below, reads twice as much from a wall.',
};

export const TRAIT_TEXT: Record<Trait, string> = {
  'Light-footed': 'Running for the far door makes no extra noise.',
  'Iron stomach': 'Spores and roots do half their harm.',
  Cautious: 'Carries one more probe.',
  Resourceful: 'Carries four more rounds.',
  'Night owl': 'Better at going unseen with the torch off.',
  Steady: 'Gets up from being downed with more left.',
};

export const JOBS: Record<Job, { name: string; needs: ModuleId | null; text: string }> = {
  lab: { name: 'Lab', needs: 'lab', text: 'Works on whatever the lab is set to.' },
  wire: { name: 'The wire', needs: null, text: 'Cuts the growth back from the perimeter.' },
  infirmary: { name: 'Infirmary', needs: 'infirmary', text: 'Gets the hurt back on their feet sooner.' },
  fabricator: { name: 'Fabricator', needs: 'fabricator', text: 'Each hand allows one job at the fabricator a day.' },
  rest: { name: 'Resting', needs: null, text: 'Doing nothing, which some days is the job.' },
};

export const MODULES: Record<ModuleId, { name: string; col: number; row: number; lostText: string }> = {
  lab: { name: 'Lab', col: 0, row: 0, lostText: 'No research until it is cleared.' },
  wire: { name: 'Wire post', col: 1, row: 0, lostText: 'Work on the wire counts for half.' },
  stores: { name: 'Stores', col: 2, row: 0, lostText: 'A third of the salvage went with it.' },
  infirmary: { name: 'Infirmary', col: 0, row: 1, lostText: 'The hurt mend slowly, the sick hardly at all.' },
  ops: { name: 'Operations', col: 1, row: 1, lostText: '' },
  fabricator: { name: 'Fabricator', col: 2, row: 1, lostText: 'Nothing can be made.' },
  mess: { name: 'Mess', col: 1, row: 2, lostText: 'Nowhere to sit together. Hope drains twice as fast.' },
};

export const RELIC_FORMS = [
  'ribbed rod', 'hollow disc', 'folded lattice', 'cold bead on a wire', 'split prism', 'ring that hums',
] as const;

export const RELICS: Record<RelicFn, { name: string; does: string; used: string }> = {
  hush: {
    name: 'The Hush',
    does: 'Everything that was listening for you stops.',
    used: 'A pressure in the ears, then nothing. The whole ruin has lost the thread of me.',
  },
  lattice: {
    name: 'Warden Lattice',
    does: 'Unmakes everything growing in the room, without a sound. The Pulse notices.',
    used: 'White lines through the air. Where the growth was there is clean stone. Far below, something changed pitch.',
  },
  foretell: {
    name: 'Foretell',
    does: 'Shows the room a moment ahead: what would wake each thing in it.',
    used: 'I watched myself cross the room three ways, and saw what woke each time.',
  },
  tending: {
    name: 'The Tending Hand',
    does: 'Mends the body past what medicine can. The sickness it leaves is worse.',
    used: 'The wounds closed like water. My hands will not stop shaking.',
  },
  choir: {
    name: 'Choir-call',
    does: 'A chord. Every waking thing in the room settles, and what hunts turns away.',
    used: 'One chord, and the room breathed out. Even the thing in the doorway turned and went.',
  },
  memorywork: {
    name: 'Memorywork',
    does: 'Ends everything in the room. Takes something you knew in payment.',
    used: 'The room is empty. There was a species I knew. There is a gap where it was.',
  },
};

export const ROOM_TITLES: Record<number, readonly string[]> = {
  1: ['Collapsed gallery', 'Pillar hall', 'Drain passage', 'Low vault', 'Stair foot', 'Breached chamber', 'Root-split corridor', 'Flooded steps'],
  2: ['Conduit hall', 'Ribbed passage', 'Cistern', 'Slotted gallery', 'Long room of niches', 'Tilted floor', 'Lightless nave', 'Duct crossing'],
  3: ['Turbine well', 'The cold stacks', 'Humming causeway', 'Gantry over nothing', 'Coil chamber', 'The tended aisle', 'Pressure door', 'Lower manifold'],
};

export const ROOM_TEXT: Record<number, readonly string[]> = {
  1: [
    'Daylight comes down through a breach and stops a little way in. Past that it is the torch or nothing.',
    'Dust hangs in the beam. The doorways are a hand too tall and a hand too narrow.',
    'Water runs somewhere under the floor. The walls are wet to shoulder height.',
    'Rubble along the wall bases. Something has grown through it and then stopped.',
  ],
  2: [
    'No daylight has been here. The stone is grey-green and fitted without mortar.',
    'Niches along both walls, each the same wrong height. Nothing in them.',
    'The air is still enough to hear the suit fan. The growth here is taller.',
    'Channels in the floor run towards the next door, dry, and too regular to be drains.',
  ],
  3: [
    'A hum in the floor, steady. This part is not a ruin. It is running.',
    'White light, very faint, in seams along the ceiling. It has been on for a long time.',
    'The growth keeps to the edges here, as if the middle of the room were kept clear.',
    'Machinery behind the walls. The plants lean towards it.',
  ],
};

export const HEARD = [
  'Something creaks, twice, and waits.',
  'A dry rustle from the left. Then the same from the right, lower.',
  'A slow click, like a tongue.',
  'Breath. Not mine.',
  'Dripping, and under it a groan too long to be stone.',
] as const;

export interface EventData {
  id: string;
  kind: 'wonder' | 'horror';
  title: string;
  text: string;
  /** What the mess board says if the operative gets home to tell it. */
  told?: string;
}

export const EVENTS: readonly EventData[] = [
  {
    id: 'pulse', kind: 'wonder', title: 'The Pulse passing',
    text: 'Every glowing thing in the room flares at once, then the next room, then the next, a wave crossing the ruin from below. It points at something. Then it is dark again and nobody will ever explain it.',
    told: 'saw the whole ruin light up in a wave. Drew it on the board. People keep stopping to look.',
  },
  {
    id: 'choir', kind: 'wonder', title: 'The choir room',
    text: 'With the torch off and one foot on a worn mark in the floor, the creaks and clicks and breaths of the room fall into a single chord. It holds for as long as you stand there.',
    told: 'hummed a chord in the mess that the plants make. Three people cried and could not say why.',
  },
  {
    id: 'garden', kind: 'wonder', title: 'The tended garden',
    text: 'Rows. Sleeping plants in rows, evenly spaced, and a thing of pale struts moving along them, turning each one a little towards the seams of light. It does not look up.',
    told: 'says something down there is still gardening. The idea that anything is being looked after has gone round the whole base.',
  },
  {
    id: 'machine', kind: 'wonder', title: 'A machine still running',
    text: 'A wheel the height of the room, turning once in the time it takes to cross the floor. No dust on it. It has been doing this since before there were people.',
    told: 'timed a wheel that has been turning for longer than the species. Somebody has chalked its count on the mess wall.',
  },
  {
    id: 'sky', kind: 'wonder', title: 'Sky',
    text: 'The roof is gone for thirty metres and it is raining, real rain, through real light. Colour, for the first time in an hour. Small pale flowers have opened all over the floor to drink it.',
    told: 'brought back a flask of rain and one of the small pale flowers. It is on the mess table in a mug.',
  },
  {
    id: 'vast', kind: 'wonder', title: 'Something vast going by',
    text: 'Dust falls from the ceiling in lines. Every plant in the room goes silent together. Something very large passes on the other side of a great deal of stone, and takes a long time to finish passing.',
    told: 'felt something enormous go past behind the walls. Oddly, people slept better for knowing the place is not empty.',
  },
  {
    id: 'unlit', kind: 'horror', title: 'At the edge of the beam',
    text: 'Something stands where the torchlight gives out. It has not moved. It was further away a moment ago. It was further away when the beam was on the other wall.',
  },
  {
    id: 'voice', kind: 'horror', title: 'The voice that plays back',
    text: 'Footsteps behind, in step with yours. They stop when you stop. Then, from the dark ahead, the winch of a lift nobody called, and your own voice saying something you said an hour ago.',
  },
  {
    id: 'inside', kind: 'horror', title: 'The untouched pile',
    text: 'A salvage pile, a good one, alloy and a coil of filament, sitting in the middle of a clean floor. The walls of this room are not quite the colour of stone, and they are warm.',
  },
  {
    id: 'shape', kind: 'horror', title: 'The shape it grew in',
    text: 'A plant has grown in the outline of something that died in it. Two arms, raised. The growth is thickest where the mouth would have been.',
  },
] as const;

export const LORE: readonly string[] = [
  'The signs along the walls resolve into words. Most say the same three things: STORES. KEEP. DO NOT WAKE.',
  'A procedural record, generations long. They did not build the signal. They followed it here, as we did, and found the thing already old.',
  'The maintenance protocol, entire. And one line, repeated at every hatch: the growth is the lock. Tend it. Those who burn it open the door.',
];

/** Mess-board lines by mood, best to worst. */
export const BOARD: readonly (readonly string[])[] = [
  [
    'Someone has started a sweepstake on what the wheel is for.',
    'Two volunteers for the wire before the rota went up.',
    'Hana is teaching people the plant names. They are learning them.',
    'The mess was loud tonight. Good loud.',
  ],
  [
    'Rota filled. Nobody argued.',
    'Someone mended the mess door. Nobody was asked to.',
    'Quiet at dinner. Not a bad quiet.',
    'Cards after shift. The same four people.',
  ],
  [
    'A place was laid at dinner for someone who is not coming back.',
    'The rota has two blanks on it.',
    'Somebody has stopped winding the day clock.',
    'An argument about the signal. Whether anyone is listening to ours.',
  ],
  [
    'Nobody ate together tonight.',
    'The wire shift was one short. Nobody said who.',
    'Someone has scratched every name off the rota and written NO ONE IS COMING.',
    'A pack is missing from stores, and a pair of boots.',
  ],
];

export const MOODS = ['holding together', 'steady', 'fraying', 'coming apart'] as const;

export const ENDINGS = {
  fallen: {
    title: 'The base has fallen',
    text: 'Operations went dark with the growth through the floor. Whoever was left walked out into it or stayed. The signal goes on. Eventually someone else will follow it.',
  },
  spent: {
    title: 'No one left to send',
    text: 'The last name is on the wall. There is nobody to read it. The growth takes the base in a season, gently, the way it takes everything.',
  },
  depart: {
    title: 'Departure',
    text: 'The ascent stage lifts on relic cells through the overcast. Behind you the ruin keeps its count. You will report what you found, and you already know that somebody will come back for it.',
  },
  reinforce: {
    title: 'Reinforcement',
    text: 'You do what the Wardens stopped doing. You tend the lock. The burning stops, the growth settles round the base like a hand closing gently, and far below the hum steadies. Those who keep watch: that is you now.',
  },
  open: {
    title: 'The Vault',
    text: 'Three fragments, one door. It opens the way an eye does. What is inside is not a monster and is not a gift, and the record of this expedition becomes a different kind of document from here on.',
  },
} as const;
