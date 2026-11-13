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
- **Knowledge:** hover a plant to see what the guide has earned about it. Watching it wake teaches its sense; watching it act teaches what it does; two samples teach both.
- **Grafts:** cut down a plant you understand and it may leave a working piece: a decoy, a grenade, a snare patch, caltrops, a cloud, a heal, a flare.
- **A ruin that gets on without you:** grazers drift between glowing plants and feed, and the plants that sense nearness take them out of the air, which teaches you what those plants do from a safe distance. One garden a layer is still tended by a Warden construct: rows of sleeping plants, harmless until you cut one. Every minute or so the Pulse passes as a wave of light from the direction of the way down. Daylight comes through the roof of the Threshold, and growth is thick under it.
- **Creatures:** mites in swarms, skulkers that lunge, spitters, husks that slam, a thing that only moves when unlit, and the Tender at the bottom.
- **Loot:** blades, guns and suits with rarity and affixes, dropped with a beam and a label and compared when you stand over them. Urns and crates to smash. One relic a layer, in white light, with nothing to say what it does until you use it.
- **The base:** between descents. Salvage buys upgrades. The growth advances every day; burning it back works and raises the Pulse. Eight operatives; a death leaves the gear below with the body for the next one to recover.

## Layout

- `src/data.ts`: content and tuning (creatures, weapons, affixes, plant behaviours, relics, text).
- `src/level.ts`: layer generation, collision, line of sight.
- `src/sim.ts`: the simulation. Fixed 60 Hz step, seeded, no three.js. It queues `Fx` for the view and audio.
- `src/state.ts`: types, the campaign, item rolling, the save.
- `src/render.ts`, `src/models.ts`: the view. Reads the world, writes three.js.
- `src/audio.ts`: synthesised sound recipes; the plants are the soundtrack.
- `src/hud.ts`, `src/main.ts`: HUD, screens, input and the loop.

`?debug` on the URL exposes `window.__game` (`world`, `camp`, `step(n, input)`, `hold()`).

## Not done

- No touch controls: it needs a keyboard and mouse.
- Balance has only been played by a bot and by scripted checks, never by a person.
- The base is one screen: no jobs, no modules to lose, no hope. Those rules are prototyped in `../prototypes/campaign/`.
- The Vault endings are three paragraphs of text after the Tender.
