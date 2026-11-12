# Project: Alien Planet Roguelite

An isometric roguelite that runs in the browser, built with three.js + TypeScript. A solo operative explores a hostile alien planet from a fortified base under encroachment, scavenges relic tech and researches alien biology. Full design in `docs/game_design.md`; architecture in `docs/technical_design.md`. Read those before substantive work.

## First action of every session

1. Read this file
2. Read the **Current State** section at the bottom
3. Read any session brief in `docs/session_notes/`
4. Confirm with the user which session is being worked on before writing code

## ⚠ Before deploying anywhere

The Claude API key is currently allowed **for local development only**. Before the game is hosted anywhere public, work through `docs/technical_design.md` §9. In short:

- Vite embeds every `VITE_*` variable in the shipped JavaScript. A build containing `VITE_ANTHROPIC_API_KEY` publishes the key.
- `vite.config.ts` refuses a production build while that variable is set. Never bypass it (`ALLOW_KEY_IN_BUILD=1`) for a public build.
- Replace direct browser calls with pre-generated names, a player-supplied key or a proxy.
- `grep -r "sk-ant" dist/` must return nothing before uploading.

If the user asks to deploy, publish, upload to itch.io or similar, raise this checklist first.

## Stack

- **Rendering:** three.js (`WebGLRenderer`, isolated in `src/core/renderer.ts`), orthographic isometric camera
- **Language:** TypeScript, strict mode, no `any`
- **Build:** Vite. `npm run dev`, `npm run build`, `npm run build:single` (one self-contained HTML file)
- **Entities:** miniplex ECS
- **Collision / pathfinding:** custom circle-vs-grid, grid A* (levels are tile grids)
- **Menus:** plain DOM for the HUD; Preact for menus and (later) base screens, in `src/ui/menu`
- **Saves:** IndexedDB + JSON, versioned, three slots with backups. Schema and rules in `docs/save_schema.md`
- **Audio:** Web Audio buses in `src/audio/mixer.ts` (master, effects, ambience, music)
- **Fonts:** bundled via `@fontsource` (IBM Plex Mono, Big Shoulders Stencil) so builds work offline
- **Tests:** Vitest (`npm test`), Playwright smoke test (`npm run smoke`, needs a build first)
- **Version control:** Git, commit at the end of every session
- **Assets:** free sources only (Kenney, Quaternius, KayKit, OpenGameArt, Freesound) or placeholder primitives
- **Optional:** Claude API for species naming. The game must work fully without it.

## Architectural rules — do not violate

**1. Data-driven content.** Species, weapons, armour, blueprints, lore, biomes, levels — everything content-shaped is typed data in `src/data/`, checked with `satisfies`. Adding content means adding data, not code. If you're hardcoding a species or weapon in a system, stop and add a data type.

**2. Composable behaviours via ECS.** A behaviour is a component (plain data on `Entity` in `src/ecs/components.ts`) plus a system. Species list which behaviour components to attach. A plant that is sticky AND sound-reactive AND networked has three components. Never subclass to combine behaviours. Never put methods on components.

**3. Event bus for cross-system communication.** Declare events and payloads in `src/core/events.ts`. Systems emit; others listen. No direct references between unrelated systems. The HUD never holds an entity reference.

**4. Simulation is separate from rendering.** Simulation systems (`SimSystem`) run at a fixed 60 Hz, receive `dt`, and never touch three.js objects. View code (`src/systems/view.ts`, `src/render/`) reads simulation state and writes three.js objects, never the reverse. The only bridge is functions passed in `SimContext` (e.g. `screenToGround`).

**5. Few globals.** Module singletons are limited to: `events`, `gameState`, `mixer`, and later `pulse`, `claude`. The field guide is not a global: it lives in `Campaign.fieldGuide`, written by the knowledge tracker (`src/app/knowledge.ts`) from events. The `SaveService` is created at boot and passed in, not global. Adding another needs a reason recorded here.

**6. Saves change only through migrations.** Any change to `Campaign` or the save file bumps `SAVE_VERSION`, adds a migration keyed by the old version (never edit a shipped one), updates `validateSaveFile()`, adds a test, and updates `docs/save_schema.md`. Run state is never saved.

**7. Systems read actions, not keys.** Use `input.isActionDown('sprint')`, never raw key codes, so rebinding works everywhere. New actions go in `ACTIONS` and `DEFAULT_BINDINGS` in `src/game/settings.ts`.

**8. Light budget.** At most 1–2 lights whose shadows render every frame (the torch), plus a fixed set of point lights: 6 pooled glow lights for glowing plant clusters, 1 suit light, 1 effects flash. Glow lights cast shadows but render them only when assigned to a plant (`shadow.autoUpdate = false`), so only static geometry may cast into them: anything that moves or disappears sets `customDistanceMaterial = materials.noPointShadow`. Never create a light per entity; assign from a pool. Changing the number of lights, or which ones cast shadows, at runtime recompiles shaders and stutters.

**9. Light never passes through walls.** Anything that can be cut away (walls, door headers, pillars) casts shadows through an invisible full-height copy (`shadowProxy` in `level-builder.ts`), never through its visible mesh. Light sources held by entities are pulled back out of walls (`pullBackFromWalls`). Glow lights are shadowed too (rule 8). The smoke test measures brightness beyond a wall, for the torch and for a glowing plant, to guard this.

**10. Looks and voices never give behaviour away.** Species data holds behaviour only. Shape, colour and concealment come from `floraLooks(seed)`, voices from `floraMusic(seed)`, both dealt per campaign. Never add a visual or audio field to species data that correlates with what a plant does (design rule: no telegraphing). Mood tells (awake plants tremble, sing faster and higher) are the same for every species, so they show state, never nature. Colour is owned (`docs/art_direction.md`): the operative's yellow and the Wardens' white are reserved, plant bodies are greens, teal-blues, violets, deep reds and rust (never yellow or white), glow stays in the teal–magenta band. Decor and species speak one leaf language (`render/foliage.ts`, the plant pass): a species is told from the growth around it by its dealt colour and pattern (`FloraLook.pattern`), its glow, how it moves and its voice, never by being drawn differently. Decor never trembles, never speaks and carries no dealt marks. A woken plant always stirs (`FLORA_MOOD.stir`) before its alert behaviours take hold: never let a sleeping plant go straight to lethal.

**11. All harm goes through `dealDamage()`.** It handles grace, downs, death and armour (pass `type`), and returns whether the hit landed. Plants are harmed through `hurtPlant()` (it wakes them, sets them off, and kills them at zero health). Hazards with cooldowns reset them only when it returns true. Pass `from` when the harm has a direction (the screen shows it) and `tick: true` for damage over time.

**12. Sounds are mapped in one table.** Add a recipe to `src/audio/synth.ts` and a line to `EVENT_SOUNDS` in `src/audio/game-audio.ts`; systems never play sounds directly. Plant voices and screams are the exception by design: `flora-music.ts` plays them from events (`flora_populated`, `flora_mood_changed`, `flora_spent`, `flora_spread`, `noise_made` with a species), never from entities, because each species' voice and scream are dealt per campaign. Every recipe and voice must render below 0.85 peak (the smoke test checks all of them; voices at intensity 1.3 and three pitches).

**13. Moods swap components; systems don't check moods.** A plant's alert behaviour is data (`alerted` in species data, merged by `behavioursFor`). Waking and settling go through `applyMood`, which adds, removes or re-parameterises behaviour components and keeps runtime state (cooldowns, fuses). Behaviour systems never ask whether a plant is awake; they just see the components it has now. Anything that wakes plants (a probe, a scanner ping) makes a noise or calls `wake()`.

**14. Knowledge is earned, never read off the data.** The HUD and field guide only show what `Campaign.fieldGuide` records: senses from scans, behaviours witnessed (by the operative in sight, or a landed probe) via `flora_acted`, everything from a sample. Never display species data directly. Every behaviour a plant can do must emit `flora_acted` (use `acted()` in `systems/flora/common.ts`), or the guide can never learn it.


## File organisation

```
src/
  main.ts      — boot: storage, settings, game, menus
  app/         — the running game (renderer + level + systems) behind a handle the menus drive
  audio/       — mixer, synthesised sound recipes, event → sound table
  core/        — renderer, loop, input, events, config, rng
  ecs/         — Entity type, world, shared queries
  systems/     — simulation systems (one per file) and view systems (view.ts)
  world/       — level parsing, level building, collision, pathfinding
  render/      — materials, models, particles, occluders
  game/        — campaign logic: state, save, runs, flora population and looks (pure, seeded)
  data/        — content only, no logic
  ui/          — HUD (plain DOM) and menus (Preact, ui/menu)
  api/         — optional Claude API client
e2e/           — Playwright smoke test and screenshots
docs/          — design docs, session notes, save schema
```

## Code conventions

- `kebab-case.ts` file names; `camelCase` variables and functions; `PascalCase` types
- Events are past-tense snake_case: `flashlight_toggled`, `sample_collected`
- Tuning numbers go in `src/core/config.ts`, not inline
- Seeded RNG (`createRng`) for anything that should reproduce from a save
- Pure logic gets a colocated `*.test.ts`
- Comments explain *why*, not *what*
- British English in player-facing text

## How sessions work

1. Read this file and any session brief
2. Confirm scope with the user
3. Implement the bounded piece from `docs/technical_design.md` §7
4. `npm run check` (types + unit tests), then `npm run build && npm run smoke`
5. Look at the smoke screenshots in `e2e/screenshots/`; add shots for anything new
6. Commit: `session N: <what was added>`
7. Update **Current State** below; add a note in `docs/session_notes/` if useful

Don't build multiple systems in one session. Don't carry untested work forward.

## Testing notes

- Headless Chromium renders on the CPU at a few fps. The smoke test stops the real-time loop and drives the simulation with `window.__game.loop.step(n)` (60 steps = 1 second; paused games don't advance). Never use wall-clock waits for gameplay checks.
- `window.__game` exists in dev or with `?debug`: `game` (mode, startRun, pause…), `saves`, `gameState`, `player`, `world`, `level`, `loop`, `spot`, `rig`, `teleport(x, z)`, `setAim(x, z)`, `clearFlora()`, `spawnPlant(id, x, z)`, `input.debugSetKey(code, down)`.
- The smoke test runs in the hand-made test ruin (`?debug&level=test_ruin`) so coordinates are fixed; `useLevel(null)` switches later runs to the stitched site, `currentLevel()` returns the level in play. A new unit test that needs a map can use `siteLevel(wardenRuin, 1, seed, run)`.
- Quit a run in the smoke test with `quitRun()`: carrying anything, the quit button asks to confirm (`data-confirming`). `spawnCache(x, z, key)` and `spawnRelay(x, z)` place fixtures; the nearest interactable takes the key, so clear piles nearby first. `game.pack()` reads the pack; `player.pack.items` can be filled directly for a test. The lift takes 20 s of stepped time; the debrief appears 1.8 s of real time after `run_extracted` (wait for it with `waitForFunction`).
- Water: `water()` and `wetAt(x, z)` on the debug handle; `setWetness(n | null)` pins every level's wetness (0: dry). The smoke test runs dry after each boot (puddles darken measured floors; splashing wakes sleeping plants); its water section puts the layer's own water back with `setWetness(null)`.
- The playable artifact is published from `dist/` (the page plus `assets/` as supporting files), not the single-file build: since the stone textures, the 2.4 MB single file trips the artifact service's validation.
- Never run two smoke tests (or a smoke test and `look.mjs`) at the same time: overlapping runs lose early keyboard input and garble a shared log. `hideFlora(true)` on the debug handle stops plants being drawn, for measurements of stone.
- The smoke test now takes about 12 minutes (triplanar stone is slow on the CPU renderer): run it in the background and poll the log if a shell has a time limit.
- `setStoneLight({...})` retunes the stone's light shoulders and mottling at run time (`{}` restores `STONE_LIGHT`). `?debug&seed=N` pins a new campaign's seed; `e2e/look.mjs` uses it (`SEED`, default 20260928) so before/after shots match. `LOOK_OUT=before node e2e/look.mjs` writes a second set, and each set has a `metrics.json` (camouflage contrast, wall square-on).
- `bake(lights)` on the debug handle bakes static lights into the current level (groups 0 daylight, 1 Warden steady, 2 flicker, 3 failing), for look checks.
- `node e2e/look.mjs` (after a build) saves look screenshots of a stitched ruin to `e2e/screenshots/look/`: use it when changing anything visual. Check that nothing burns white.
- The mixer rate-limits sounds (`audio/limiter.ts`); `mixer.log` and `mixer.heard` record requests, before the limiter.
- `mixer.heard` is every sound name played since boot; `mixer.log` is capped at 300 and plant voices fill it.
- Teleport only onto walkable tiles. Check the level text first: a teleport into debris or a wall gets pushed out (this once hid a real bug and wasted an hour).
- The smoke `step()` helper calls `syncGpu()` after each `loop.step(n)`. Without it, renders queue up faster than the software renderer draws them, frames take seconds and screenshots time out (found in Session 4).
- Don't wait a fixed time for a debounced save to land; poll for it with `waitForFunction` (a 400 ms wait was flaky).
- The smoke settings checks rebind the torch to G. Later checks press `input.keyFor('torch')`, not a hard-coded key.
- `project(x, z)` gives a world point's screen position, for measuring brightness of a specific floor area.
- A plant spawned for a test can wake and change under you (a needle fan you set to 500 damage wakes and takes its alert damage). Set `plant.senses = {}` to keep it asleep. `looks(seed)` returns a campaign's plant looks; `music` is the plant-music player; `renderVoiceOffline(timbre, hz)` levels a voice.
- Populations include creatures. The smoke test clears them at run start (`clearCreatures()`) so they don't interfere; `spawnCreature(id, x, z)` places one. Fire with `input.keyFor('attack')` (`Mouse0`) via `debugSetKey`; a real left click on the canvas also fires.
- `spawnPlant(id, x, z, mount?)` takes an optional wall mount `{ nx, nz, height }`. Right-click inspect needs a real mouse move to the plant first (`page.mouse.move`), since aim follows the pointer.
- `makeNoise(x, z, radius)` on the debug handle wakes plants that hear it (asleep puffcaps are inert: wake them first).
- `events` is on the debug handle, for listening to game events from a test. Held actions (scan, sample) need the key held across several `step()` calls; `input.keyFor(action)` gives the current binding.
- Plants are only noticed (and logged) when lit by the torch, glowing, or within 2.5 m. A test that expects a species in the guide should light it or stand close.
- Plant music runs on the audio clock in real time, not the stepped loop: wait for it with `waitForFunction`, not `step()`.
- Anything on a real-time timer in the UI (the lost screen appears 2.2 s after death) needs a generous `waitForFunction` timeout with `polling: 100`; headless runs are slow.
- Unit-test systems with `testContext()` from `src/systems/test-utils.ts`: an open room, scriptable actions and an event log.
- Each smoke run uses a fresh browser context, so IndexedDB starts empty; `page.reload()` keeps it.
- Menu elements the smoke test relies on carry `data-testid` or stable `id`s. Keep them when restyling.

## Model split

- **Opus** — architecture, system design, cross-system debugging, refactoring decisions
- **Sonnet** — implementing a designed system, adding content, writing tests

## What to avoid

- "Build the whole game" sessions
- Bypassing the data-driven pattern to ship faster
- Adding globals or lights without discussion
- Subclassing to combine behaviours
- Reading three.js objects from simulation code
- Skipping commits or the smoke test

---

## Current State

**Phase:** 3 — Mission lifecycle (Phase 2, first entity systems, is complete)
**Last completed session:** Session 10 — Cache and uplink (27 Sept 2026)
**Next planned:** the sound pass: first settle with Nathan how to source recordings (shortlist: `docs/session_notes/sound-shortlist.md`); Nathan plays 0.12.1; then stage 3b (tight tunnels, etched glyphs, expedition props and remains; your own dead is a save change); an operative session of its own. Session 11 — Base shell after the art slices Nathan wants first

**0.12.1 playtest fixes** (end of `docs/session_notes/plant-pass.md`):
- Waking takes a moment: a woken plant stirs for `FLORA_MOOD.stir` (1.4 s), glow guttering up, before its alert behaviours take hold (`mood.stir`, `takeHold`); new shoots can't be woken for `FLORA_MOOD.youth` (3 s)
- Colour: more saturated species, wider hues (teal, violet, rust), one or two vivid species a campaign (`FloraLook.vivid`); decor colour in seeded regions (`DECOR_FAMILIES`); darker accents
- Tall decor no longer flattens under the cutaway; each plant drives its own glow materials (`animateWorld`)
- `tools/sounds/fetch_freesound.py` (untested against the live API; Nathan doubts it will suit): how to source sounds is the next conversation
- Shots, probes and samples set a plant off through its stir (`provoke`): it goes off again when its alert behaviours take hold
- 282 unit tests; smoke test 124 checks

**The plant pass delivered** (0.12.0; detail in `docs/session_notes/plant-pass.md`):
- The leaf atlas (`tools/textures/leaves.py`): 16 tiles of painted leaves, stems and skins (albedo detail, alpha, a mask for veins, bands, spots and rim, and a normal map), 1024 px WebP; boot waits for it (`foliageReady`)
- The foliage kit and material (`render/foliage.ts`): folded leaf cards on bent spines, stems, lathed bodies; one material for decor and species (alpha cut-out, normal map, both faces lit, a ceiling on the light arriving `DECOR_LIGHT`, dealt patterns, glowing veins, waxy specular)
- Decor rebuilt from cards: grass, ferns, a broad-leaved understorey, moss curtains, thickets about 2 m tall
- Species rebuilt on eight body plans (`reeds`, `fan`, `pods`, `mat`, `spire`, and new `pitcher`, `crown`, `bramble`), larger (`PLANT_SCALE` 1.9); patterns dealt per campaign; glow species dim asleep when dealt (`dimAsleep`), their glow lights too; colours in sRGB (setHSL's linear default had made every plant about three times the stone's brightness)
- Creepers move in a wave: re-root every 0.7 m, leaving a withering copy (`CREEP_VIEW`); shoots grow in and unfurl
- Stone: a finer grain close up and moss in the joins (`STONE_SURFACE.detail`, `.moss`)
- 277 unit tests; smoke test 124 checks; `e2e/plants.mjs` shoots every species, a crawl and a shoot

**0.11.1 playtest fixes** (end of `docs/session_notes/stage-3a-growth.md`):
- The "wall glitch" was moss curtains hanging in the air over broken-topped blocks: they now skip `wall_broken`, fit their wall's height and sink with it
- Corridors: walls between the camera and open floor down your aim (up to 9 m) drop, whichever side of the operative (`aimSightline`, `CUTAWAY.hides`); cut walls sink to waist height (`WALL_CUT_HEIGHT` 1.0)
- Plants and decor gather in the daylight under breaches (`sunlit` in `populateLevel`, `DecorWalls.sunlit`)
- Foliage: folded fronds, both sides lit (the decor shader undoes the back-face normal flip), greener and varied (never yellow), thickets built of leaves
- 273 unit tests; smoke test 124 checks

**Stage 3a delivered, with the plant rebalance** (0.11.0; detail in `docs/session_notes/stage-3a-growth.md`):
- Decor growth (`render/decor.ts`): grass, ferns, moss curtains and thicket clumps, instanced per level; slow sway; lies down on the camera side of the operative; no shadows; direct light eased on the light arriving (`DECOR_LIGHT`), so it stays dark green under the torch
- Hack-through growth (`world/thickets.ts`): thicket tiles block the operative only; two machete cuts clear one, each a 7 m `hack` noise; plants can grow inside them, hidden until within 2.2 m (`sightCull`) and noticed only up close (`sighting`); a one-off hint when you push against one (`systems/thickets.ts`)
- Breaches (`world/breaches.ts`, `render/god-rays.ts`): in layers with `LayerLook.daylight` (Threshold 1), up to one per room: a baked daylight pool and an additive shaft with dust. No lights
- Rebalance: machete reach 1.25 m and recover 0.5 s; fatigue per swing (`MELEE`) slows spamming to about half speed; plant health doubled (`radius × scale × 90`); cutting a plant is a 6 m `hack` noise
- 270 unit tests; smoke test 124 checks. Debug handle: `setThicketDensity`, `thickets`, `breaches`, `breachPools`, `scene`. The smoke test runs with thickets off except in its thicket section

**Stage 2b delivered** (0.10.6; detail in `docs/session_notes/stage-2b-kit.md`):
- The wall kit, built headless in Blender by `tools/blender/wall_kit.py`: four wall blocks (intact, spalled, cracked, broken top), three pillars, four rocks, exported as triangle data (`src/assets/kit/wall-kit.json`, `render/wall-kit.ts`); picked and turned per tile from the level seed; one instanced occluder set per piece; shadow proxies stay full blocks (rule 9); debris is rocks; rubble along wall bases
- Only what's in sight is drawn: plants and creatures behind walls are hidden, their glow still spills (`sightCull`)
- The cutaway clears a little more on the camera side (0.3 m, 3.4 m corridor)
- 258 unit tests; smoke test 118 checks

**0.10.5 playtest fixes** (end of `docs/session_notes/stage-2a-stone.md`): the cutaway never drops walls beside or beyond the operative (`cutDecision`, `CUTAWAY` in `systems/view.ts`); switching the torch off dims the world to ×0.3 (was ×0.6); the stone diffuse ceiling is lower (0.12), so torchlit wall faces sit near mid-grey. 254 unit tests; smoke 118 checks

**Stage 2a delivered** (0.10.4; detail in `docs/session_notes/stage-2a-stone.md`):
- Stone texture sets (slab, flagstones, rubble) from `tools/textures/stone.py`, seamless, 512 px over 4 m, mapped triplanar in the stone shader (`render/stone-surfaces.ts`), tinted by each layer; halved on Low
- Water fills the low stone first; standing water is a flat, glossy sheet with its own glint ceiling; the stone still shows under it
- Darker darks fixed: fill roughly doubled per layer (Nathan saw nothing outside the beam at 0.10.3)
- Blender runs headless here through `bpy` in its own virtualenv (`/home/claude/.venv-blender`, not in the repo) for 2b
- 250 unit tests; smoke test 118 checks (about 12 minutes on the CPU renderer)

**Values pass delivered** (0.10.3; detail in `docs/session_notes/values-pass.md`):
- Stone that doesn't glow: darker, narrower albedo; world-space mottling; a soft shoulder on direct diffuse and specular (`STONE_LIGHT`), so torchlit stone peaks around mid-grey and never blooms
- Darks keep their shape: `LayerLook.fill` / `fillIntensity` on the ambient light (dims with torch state); grade contrast as a power curve (no crushed blacks); concealed plants re-matched to the darker floors
- Wall tops read as one mass: room-scale height wander, no per-tile shade, rough top faces, broken stubs
- Sketched looks for the works and the Vault; 250 unit tests; smoke test 117 checks

**Art slice B delivered** (0.10.2; detail in `docs/session_notes/art-slice-b.md`):
- Water (`world/water.ts`, `render/water.ts`): puddles, wall runnels and drips per layer wetness. Wet stone is darker and glossy, and the torch's glint on it is soft-capped. Drops, ripples and a drip plink. Splashing is a noise plants hear (walk 3 m, run 7 m)
- The operative is a hard suit: helmet dome and visor slit, pack, grime, dark joints. The pistol and machete are in the left hand (aim, recoil, reload, machete swing). The suit light fills from the camera side
- 244 unit tests; smoke test 115 checks

**Art slice A delivered** (0.10.1; detail in `docs/session_notes/art-slice-a.md`; the bible is `docs/art_direction.md`):
- Quick wins: the plant card closes when you walk on; thoughts appear beside the operative, leaning away from the aim; recent thoughts in the pause menu
- Colour ownership: yellow suit, warm-white torch and human kit lights, Warden white (dead in the Threshold), yellow noise rings; plant bodies dark green/deep red, glow teal–magenta, rare red/chartreuse accents; the grade keeps only the operative's yellow and bright emissives
- The light bake (`world/light-bake.ts`, `render/baked-light.ts`): per-level RGBA light texture, wall-occluded, 4 flicker groups, injected into the stone materials; no fixtures placed yet
- `LayerLook` gains `wardenLight`, `wetness`, `decorDensity`; layer palettes retuned (Threshold dark blue-green, Interior grey-green)
- 238 unit tests; smoke test 113 checks

**Session 10 delivered** (detail in `docs/session_notes/session-10.md`):
- Quitting from the menu leaves the haul again (0.9.1 had changed it by mistake); the lift, from any layer, brings it home
- Field caches: two per layer, fixed per campaign (`k` markers, `game/caches.ts`); stow/take screen incl. medkits and rounds; saved in the campaign (format 5); sometimes disturbed
- Uplink relays: one per layer (`u` markers); 8 s noisy transmission for 15% of the cell banks carried samples and glyph readings at base (`systems/uplink.ts`)
- 234 unit tests; smoke test 113 checks

**0.9.1 playtest fixes and first visual pass** (detail at the end of `docs/session_notes/session-09.md`; look in `docs/art_direction.md`):
- Dead creatures no longer set plants off (the corpse racket); gripping plants eat corpses (`systems/flora/devour.ts`)
- Sound limiter (`audio/limiter.ts`) and node release in the mixer
- Quitting from the menu briefly kept the haul (reverted in Session 10)
- Torch dims near walls (no burnt-out corners); INSIDE-style grade, haze, visible beam and lit dust, contact shade, per-layer looks (`LayerLook` per site tier)
- 226 unit tests; smoke test 107 checks

**Session 9 delivered** (detail in `docs/session_notes/session-09.md`):
- Loot: items (`src/data/items`), salvage piles on `$` markers from depth tables (`src/data/loot`); searching (hold interact, noisy); the pack with a comfortable load (18 kg: slower, no sprint over it) and a hard limit (27 kg); pack screen (I) with dropping
- Layers: hatches forced open (loud) take the run down to "Interior" (depth 2), everything carried kept; the deepest hatch is sealed; deepest layer recorded per site
- Extraction: lift beacon at every layer's entry; 20 s arrival with winch noise every 4 s; waits 12 s, then leaves without you
- Run outcomes settled and saved at once: extracted (all home), abandoned (medkits only, confirm if carrying), lost (nothing); debrief and lost screens with the haul; save format 4 (materials, sites, run counts)
- `interactable`/`interactor` components (`systems/interact.ts`), `extractionSystem`, lift view (`render/lift.ts`); level changes happen between steps
- 222 unit tests; smoke test 105 checks

**Session 8 delivered** (detail in `docs/session_notes/session-08.md`):
- 17 room templates (`src/data/rooms`) with sockets and markers (`c` den, `>` hatch, `*` glyph); site data (`src/data/sites`)
- Site generator (`src/world/site-gen.ts`): rooms stitched at sockets with shared walls, corridors, the way out far from the entry; one layout per campaign, each run up to two side passages collapse (never the way out)
- Population: species chosen per level with caps (one mover, two healers, one of the rarest), rarer deeper; only reachable ground is populated; creatures lair in dens
- The level is swappable per run (`loadLevel`); HUD shows site and room; hatches are found (monologue), Session 9 opens them
- Plant tinkering: the lash vine (reaches 2.4 m and reels you in; `sticky.reach`/`pull`, tendrils). 14 species
- 208 unit tests; smoke test 94 checks

**Session 7 delivered** (detail in `docs/session_notes/session-07.md`):
- Plant tweaks: slower, rarer crawlers; a rare rolling tumble burr (fast because it rolls); scans also give a tissue reading (one behaviour); probes provoke contact behaviours; nothing grows within 9 m of the start. 13 species
- Weapons: service pistol (hitscan, 8 + 24, reload, 18 m of noise) and machete (arc, quiet, fells plants); damage types and an armour hook; plants have health; mouse buttons bindable
- First creature, the skulker: FSM (wander, investigate, hunt, attack, search, flee, dead), sight that depends on your torch, hearing, grid A*, procedural model with eyeshine, sounds; hurt by plants like you are
- HUD weapon panel and reload bar; 179 unit tests; smoke test 88 checks

**0.6.2 habitats pass** (detail at the end of `docs/session_notes/session-06.md`):
- Habitats: species data says where it grows (lit/dark, corridor/room/corner/edge, floor/wall); population scores every open tile; wall-growers mount on camera-facing wall faces and sink with cut walls (`syncWallPlants`)
- Grow / spread / wither components (`systems/flora/growth.ts`); shoots are spawned by the spawner from `flora_spread`. New species: nightcap (withers in light, rare, harmless), gorge vine (wall grappler that grows and spreads while feeding): 12 species
- Screams: howl, cackle, roar recipes dealt per species per campaign, played far with a heavy echo by the plant music; no rings or toasts for screams, no wake flare
- Right-click a plant: its field-guide card beside it; species portraits (`render/portraits.ts`) in the card and the guide; monologue held 7–9 s, 5.5 s apart, above the hints
- 162 unit tests; smoke test 83 checks

**0.6.1 dread pass** (after playtest; detail at the end of `docs/session_notes/session-06.md`):
- Senses made learnable: one clear sense per species; asleep = mild or inert, awake = dangerous. Passing a light-sensitive plant in the dark is safe. Watching a plant wake teaches its sense
- Wake cue: pale ground flare, rustling hiss, inner-monologue line
- Dread: creeping plants (`creep` component: seek light / noise / presence, leashed), drifting spore clouds, grapplers that drain the torch (`sticky.drain`), new heliotrope species (10 in all); less healing; medkits 35 hp, 9 at base
- Scanner: 15% of the cell, 1.6 s, 10 m ping, ends in a flash that wakes light-sensitive plants in the scan line
- Plant sounds rather than music: creak, rustle, click, breath, drip, groan, chirr; loose timing, skipped calls, detune
- Inner monologue (`src/data/monologue.ts`, `src/app/monologue.ts`): lines with the field-guide note they earned, paced and de-duplicated
- 154 unit tests; smoke test 78 checks

**Session 6 delivered** (detail in `docs/session_notes/session-06.md`):
- Scanner (hold R, stand still): costs 5% of the torch cell, pings (a noise plants hear), reports senses, mood and links, never behaviour
- Probes (T, 3 per run): thrown arc, stop at walls, clatter (noise), wake and set off what they hit, then watch for 8 s as a remote witness
- Sampling (hold E beside a plant): counts as touching it; one per plant; carried samples reach base only on return; knowledge kept regardless
- Field guide: names generated on first sighting (seeded, permanent), layered knowledge (seen / scanned / studied / sampled), screen from pause or J; HUD aim readout, scan card, discovery toasts; save format 3
- Plants are noticed only when lit, glowing or close (camouflage matters)
- 143 unit tests; smoke test 74 checks

**Session 5 delivered** (detail in `docs/session_notes/session-05.md`):
- Moods: every plant dormant or alert; senses (sound, light, presence, touch) wake it; signals wake kin or everything nearby in a wave; alert behaviour swaps components (rule 13). Nine species, two new (tattler, dusk orchid)
- The plants are the soundtrack: a voice per species per campaign, look-ahead sequencer on the music bus, muffled behind walls, awake clusters sing twice as often and higher. Drone removed
- Hearing sharpens in the dark (mixer focus follows the torch)
- Concealment: one or two species per campaign camouflaged
- 121 unit tests; smoke test 66 checks (moods by noise, light and network; plants singing; voice levels; focus)

**Session 4 delivered** (detail in `docs/session_notes/session-04.md`):
- Hurt feedback turned right up after playtest: damage shader (edges, direction wedge, chromatic split, low-health heartbeat and colour drain, poison/snare edges, down grey-out), hit-stop, shake, suit flash, sparks, health bar shake and trail
- Articulated, procedurally animated operative (legs follow movement, body follows aim, torch in the animated hand, lean, flinch, kneel, collapse); footsteps from the gait
- 21 synthesised sounds, room reverb, ambient drone (removed in Session 5), event → sound table; menu sounds
- Fixes: CSS full-screen gradients removed (the shader does it); footsteps counted by stride so long frames don't skip them; PCFSoftShadowMap → PCFShadowMap (three r186)
- 97 unit tests; smoke test with 56 checks (adds animation, torch-from-hand, footsteps, damage overlay, every event's sound, offline level check of all 21 sounds)

**0.4.1 playtest fixes:**
- Glowing plants no longer light other rooms through walls: glow lights cast shadows, rendered once per assignment; plants and pickups opt out of casting into them
- A dead torch now drops the world to near black (ambient ×0.12, suit light ×0.12) until relit; switching it off dims to ×0.6 (×0.3 from 0.10.5). Death darkens the screen much further
- Boot opens storage before creating the renderer (slow first frames could push the storage check past its timeout and silently fall back to memory saves)
- Smoke test: 59 checks (glow through wall, torch death, relight)

**Earlier sessions:** isometric foundation, leak-proof torch, saves (format 2), settings and menus (1–2); seven flora species, noise chains, health/downs/medkits (3).

**Known gaps / notes:**
- **Plant balance:** 0.11.0 answers the 0.10.5 playtest (machete spam, plants that can't hide, the operative outranging them) with fatigue, shorter reach, tougher plants, loud cuts and thickets to hide in. Still to weigh after Nathan plays it: plants that react to being cut (retaliation, spreading), and reach or ambush behaviour for some species
- Probes don't restock (no fabrication yet): 3 per run, fixed. The scanner is standard issue until fabrication (Session 13)
- Creatures aren't in the field guide yet (fauna knowledge with the fauna pool, Session 19); ammo is a fixed 24 spare per run until fabrication
- Knowledge is shared by the whole campaign (the roster, Session 14, may make some of it personal: the Sharp Memory trait)
- Plant sounds have only been heard in headless tests (log and offline levels): they need a listening pass by a human
- Creeping plants move their models, but their glow lights and voice positions stay where the cluster grew
- Portraits render without tone mapping (gamma corrected by hand); they're a touch more saturated than in-world
- Rooms cut off by a collapse are still drawn but empty. Two layers so far; the second's hatch is sealed
- Nothing uses the haul yet (fabricator, Session 13); the debrief returns to the title until the base exists (Session 11). Closing the page mid-run loses the medkits taken for it
- Only wall faces turned to the camera (west and north walls of a tile) grow plants, so every wall-grower is visible
- Glow species dealt `dimAsleep` glow faintly asleep and brighten awake (0.12.0); the others glow the same asleep and awake
- No glTF assets yet; the operative is built in code. Art direction is set (`docs/art_direction.md`); models come with the full pass
- Glow-plant shadows are static: they don't include plants, pickups or the operative. Population keeps plants ≥ 0.5 m from walls
- Six shadowed point lights cost texture lookups on every pixel; if low-end machines struggle, Low quality could turn glow shadows off (a one-off shader recompile)
- The same operative goes out again after dying (roster in Session 14); campaign day doesn't advance (base in Session 11)
