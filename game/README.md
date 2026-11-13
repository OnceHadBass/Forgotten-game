# Forgotten

An isometric hack-and-slash descent into a living alien ruin, in the browser. three.js and TypeScript, everything built in code (no art or sound assets).

```bash
npm install
```

```bash
npm run build
```

Then open `dist/index.html`. `npm run check` type-checks and runs the unit tests. `node e2e/flow.mjs` (after a build) plays the whole loop in headless Chromium and prints a checklist; `node e2e/shots.mjs` and `node e2e/life.mjs` save screenshots to `e2e/screenshots/`.

## Controls

Keyboard and mouse. WASD to move, the mouse aims the torch, left click swings the blade (hold for a three-hit combo), right click fires, Space dodges, E interacts and swaps gear, Q throws a graft (Tab for the next), R uses the relic, F switches the torch, H uses a medkit, Esc pauses.

## What is in it

- **The descent:** four generated layers (Threshold, Interior, Works, Vault). A layer's layout is fixed for a campaign. A hatch in the far room goes down; a lift beacon where you arrive takes you home with what you carry.
- **The torch:** one real shadow-casting light. Walls between you and the camera sink. With it off you are harder to see.
- **Plants:** eight species whose body, colour, glow, name and sense are dealt per campaign. They wake to light, noise or nearness, stir, then act: lash, grip and drain the cell, breathe clouds that follow you, scream, burst, spill mites, or (asleep) mend you and charge the cell. Creatures are hurt by them too.
- **Knowledge:** hover a plant to see what the guide has earned about it. Watching it wake teaches its sense; watching it act teaches what it does; two samples, or one sample and a few days in the lab, teach both.
- **Grafts:** cut down a plant you understand and it may leave a working piece: a decoy, a grenade, a snare patch, caltrops, a cloud, a heal, a flare. The lab cultures more for the next descent.
- **Guns are for flesh:** a round does a tenth of its damage to most plants (it still wakes them). Only something already about to burst minds being shot.
- **Creatures:** mites in swarms, skulkers that lunge, spitters, husks that slam, a thing that only moves when unlit, and the Tender at the bottom. Each has its own gait and weight. They get a name and a line on first sight, and a note on how to beat them once one has drawn blood or died.
- **A ruin that gets on without you:** grazers feed at glowing plants and are eaten by the ones that sense nearness. One garden a layer is still tended by a Warden construct, harmless until you cut what it tends. The Pulse passes as a wave of light from the way down. Daylight falls through the roof of the Threshold. A choir room, a wheel still turning, a locker that is not a locker.
- **Loot:** blades, guns and suits with rarity and affixes, dropped with a beam and a label and compared when you stand over them. Urns and crates to smash. One relic a layer, in white light, with nothing to say what it does until you use it or the lab works it out. Everything picked up says what it is.
- **The base:** six modules round Operations. The growth takes them one at a time and you lose what they did; lose enough and it reaches Operations. Everyone not sent down works: the lab, the wire, the infirmary, the workshop. The wire crew hold the growth better the more species you understand. Burning it back works and raises the Pulse. Operatives come home hurt and need days to mend.
- **Hope:** no bar. Time wears it down, and so do names on the wall. Wonders seen below lift it, if the operative lives to tell them. Low hope means poorer work and, at the bottom, people walking out through the wire.
- **Death:** eight operatives. A death leaves the gear below with the body for the next one to recover.
- **Endings:** beat the Tender and choose what to do with the Vault. When an expedition ends, the next one finds its camp in the Threshold.

## Layout

- `src/data.ts`: content and tuning (creatures, weapons, affixes, plant behaviours, relics, text).
- `src/level.ts`: layer generation, collision, line of sight.
- `src/sim.ts`: the simulation. Fixed 60 Hz step, seeded, no three.js. It queues `Fx` for the view and audio.
- `src/state.ts`: types, the campaign, item rolling, the save.
- `src/camp.ts`: the base between descents (modules, jobs, lab, wounds, hope). Pure and seeded.
- `src/render.ts`, `src/models.ts`: the view. Reads the world, writes three.js.
- `src/audio.ts`: synthesised sound recipes; the plants are the soundtrack.
- `src/hud.ts`, `src/main.ts`: HUD, screens, input and the loop.

`?debug` on the URL exposes `window.__game` (`world`, `camp`, `step(n, input)`, `hold()`).

## Look and sound

- **Picture:** bloom on anything alive or Warden-made, a grade that keeps colour only where there is light, grain and vignette, colours pulling apart at the edges when hurt. Stone has relief and standing water that the torch glints off; walls are coursed blocks; the floor darkens into the foot of every wall. Ground haze drifts, the beam is visible, spores hang in the air, things that die leave stains.
- **Models:** all built in code. The operative is a jointed hard suit (legs follow the feet, body follows the aim) with poses for walking, strafing, three swings, an overhead chop, a roll, recoil, a flinch, a struggle and a collapse. Creatures are jointed rigs with skin textures: the skulker has a spine that takes a turn a segment at a time, a tail that follows, and a jaw; the husk walks on its knuckles; the spitter steps on three high-kneed legs; the unlit thing holds whatever pose the light caught it in. Plants are made of folded, veined leaves that move in the wind, rear and throw themselves wide to strike, and sag when cut.
- **Picture quality:** full or simple, from the pause menu. It drops to simple by itself if the frame rate is poor.
- **Sound:** every sound is synthesised from layered tones, frequency modulation and filtered noise. Sounds are placed in stereo by where they are on screen, dulled by distance and muffled behind stone, and sent into a long stone reverb. Each layer has its own bed (wind through the breaches, damp and drips, machinery). Plant voices come in six kinds, dealt per campaign and tuned to one key. Creatures have footfalls tied to their gait. A few moments get a stinger.
- **Levels were set by measurement.** `node e2e/sound.mjs` renders every sound offline and reports loudness, length and brightness, and checks that a worst-case pile-up does not clip. `TARGET` in `src/audio.ts` says how loud each should be; `TRIM` holds the corrections.

## Tests

- `src/sim.test.ts`: every layer runs clean, a seed replays exactly, a death leaves the gear below.
- `src/balance.test.ts`: a bot that fights, sidesteps wind-ups and heads for the hatch. With starter gear it clears layer one every time, layer two about half the time and layer three almost never; with good gear it beats the Tender about seven times in ten. Read its printed tallies when changing numbers.
- `src/camp.test.ts`: the base falls in about a month if left alone and holds longer when tended.
- `e2e/sound.mjs`: every sound measured offline; `e2e/closeups.mjs`, `e2e/poses.mjs` and `e2e/life.mjs` save pictures for judging models and set pieces.
- `e2e/flow.mjs`: thirteen checks through the real page, from the first step to an ending and the next expedition.

## Not done

- No touch or gamepad controls: it needs a keyboard and mouse.
- Nobody has heard it. Levels and lengths are measured, so nothing is inaudible or clipping, but whether a sound is *good* needs ears.
- Balance comes from bots and scripted checks. A person will find things they did not.
- The three Vault endings are a choice and a paragraph each; nothing gates them.
