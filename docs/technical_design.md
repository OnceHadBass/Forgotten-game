# Technical Design: Alien Planet Roguelite

Companion document to `game_design.md`. This covers the *how*: stack, architecture, system design, data structures, build order, and the practical realities of building a game of this scope as a solo developer working with Claude.

> **Before deploying anywhere, read §9 (Pre-deploy checklist).** The Claude API key handling used in development is not safe for a public build.

---

## 1. Stack

### Decision: three.js + TypeScript in the browser, isometric 3D

The game runs in a web browser. The world is 3D, shown through an orthographic camera at a fixed isometric angle. Menus are HTML/CSS laid over the canvas.

**Why this over Godot's web export:**

- **Lighting is the game.** A flashlight that throws real shadows off pillars and ruined walls is the signature feel. In 3D that's a spotlight with a shadow map — native, cheap and convincing.
- **3D models beat isometric sprites for a solo developer.** Isometric sprites need every animation drawn in 8 directions. A low-poly 3D model covers every angle for free, and free kits (Kenney, Quaternius, KayKit) cover prototyping.
- **Most of the game is menus.** Research, fabrication, the 25-person roster and the field guide are screens, and HTML/CSS is much better at those than any engine's UI toolkit.
- **Everything is plain code.** Claude can build, run, test and screenshot the game end to end without an editor in the loop.

**The trade-off:** Godot gives you collisions, pathfinding, audio and scene management out of the box. Here those are assembled from small libraries or written directly. Because levels are tile-based, the simple versions (grid collision, grid A*) go a long way.

### Stack summary

| Job | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | Type-checked content data as well as code |
| Build / dev server | Vite | Instant reload; static output |
| Rendering | three.js (`WebGLRenderer`) | Renderer creation is isolated in one file so a later move to `WebGPURenderer` is a contained change |
| Post-processing | three.js `EffectComposer` + bloom | Bloom makes bioluminescence glow; toggleable for low-end machines |
| Entities | miniplex (ECS) | Components are plain data; behaviours are component + system (see §3.2) |
| Collision | Custom circle-vs-grid | Levels are tile grids. Rapier only if freeform physics is ever needed |
| Pathfinding | Grid A* on the level grid | recast-navigation-js only if levels go freeform |
| Menus / base screens | Preact + CSS (from Session 2) | HUD stays plain DOM |
| Audio | Web Audio API, synthesised (no files) | Recipes in `src/audio/synth.ts`, event table in `game-audio.ts`, screen-space panning, room reverb, limiter |
| Saves | IndexedDB (small hand-written wrapper), JSON | Memory fallback; export/import; see `docs/save_schema.md` |
| Unit tests | Vitest | Pure logic: collision, parsing, research graph, save migration |
| Smoke tests | Playwright (headless Chromium) | Load the game, check for errors, take screenshots |
| Optional AI naming | Anthropic API | See §4.15 and §9 |

### What costs money

- **Anthropic API** (optional) is the only paid dependency. The game ships with a local name generator and works fully without it.
- Everything else is free and open source. Art: Blender, Krita. Audio: Audacity, Reaper. Free assets: Kenney.nl, Quaternius, KayKit, OpenGameArt, Freesound.

---

## 2. Project Structure

```
alien-roguelite/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts            # Includes the API-key build guard (§9)
├── CLAUDE.md                 # Working instructions for Claude
├── .env.example              # Documents env vars; real .env.local is gitignored
│
├── public/                   # Static assets served as-is
│   ├── models/               # .glb files
│   ├── textures/
│   └── audio/
│
├── src/
│   ├── main.ts               # Boot: create renderer, world, systems, start loop
│   ├── core/                 # Engine-level plumbing
│   │   ├── renderer.ts       # Renderer + post-processing setup (the only file that knows which renderer)
│   │   ├── loop.ts           # Fixed-timestep update, per-frame render
│   │   ├── input.ts          # Keyboard/mouse state
│   │   ├── events.ts         # Typed event bus
│   │   └── config.ts         # Tuning constants
│   ├── ecs/
│   │   ├── components.ts     # The Entity type: every component, as optional fields
│   │   └── world.ts          # miniplex World + shared queries
│   ├── systems/              # One file per system, each a pure function of (world, dt, ctx)
│   ├── world/                # Level parsing, level mesh building, collision, pathfinding
│   ├── render/               # Materials, models, particles, visual-only helpers
│   ├── game/                 # Campaign logic: state, save, field guide, pulse, research, roster
│   ├── data/                 # Content — typed TS modules, no logic
│   │   ├── levels/
│   │   ├── species/{flora,fauna}/
│   │   ├── weapons/{fabricated,experimental,relic}/
│   │   ├── armour/  augments/  drones/
│   │   ├── operatives/       # traits, specialisations, starting roster (25)
│   │   ├── biomes/  sites/  blueprints/  research/  lore/
│   ├── app/                  # The running game: renderer + level + systems behind a handle menus drive
│   ├── audio/                # Web Audio mixer (buses)
│   ├── ui/                   # HUD (plain DOM) and menus (Preact, src/ui/menu)
│   └── api/                  # Optional Claude API client
│
├── e2e/                      # Playwright smoke tests and screenshots
└── docs/
    ├── game_design.md
    ├── technical_design.md
    ├── save_schema.md        # From Session 2
    └── session_notes/
```

This separates **plumbing** (`core/`, `ecs/`), **behaviour** (`systems/`), **campaign logic** (`game/`) and **content** (`data/`). New content — a plant, a weapon, a lore fragment — is a new data entry with no code change.

---

## 3. Architectural Principles

### 3.1 Data-driven content, type-checked

Everything content-shaped is data in `src/data/`, written as TypeScript modules that export typed objects. The compiler checks every species, weapon and blueprint against its type, so a typo in a behaviour name is a build error, not a runtime surprise.

```ts
// src/data/types.ts
export type FloraBehaviourId = 'sticky' | 'scream' | 'healing' | 'spore_cloud' /* … */;

export interface FloraSpecies {
  id: string;
  model: string;                       // path under public/models
  variants?: string[];
  size: number;                        // metres
  rarity: 1 | 2 | 3 | 4 | 5;
  biomes: BiomeId[];
  behaviours: Partial<Record<FloraBehaviourId, BehaviourParams>>;
  sampleYield: Record<MaterialId, number>;
  loreHint?: string;
}

// src/data/species/flora/lantern_reed.ts
export const lanternReed = {
  id: 'lantern_reed',
  model: 'flora/reed_a.glb',
  size: 1.2,
  rarity: 2,
  biomes: ['overgrowth', 'deep'],
  behaviours: {
    healing: { perSecond: 2, radius: 1.5 },
    scream:  { trigger: 'damaged', radius: 12 },
  },
  sampleYield: { fibre: 2, luminous_sap: 1 },
} satisfies FloraSpecies;
```

Display names are **not** in the data. Names are generated per campaign on first encounter and saved (§4.8).

If a visual content editor is ever built, the data can move to JSON with a runtime validator (zod). Until then TypeScript modules are simpler and safer.

### 3.2 Composable behaviours via ECS

The single most important decision in the project. A plant can be sticky AND sound-reactive AND networked. That must never be a class hierarchy.

In an ECS:

- An **entity** is a bag of components (plain data)
- A **behaviour** is a component type plus the system that acts on entities with it
- A **species** lists which behaviour components to attach at spawn, with parameters

```ts
// src/ecs/components.ts (excerpt)
export interface Entity {
  position?: Vector3;
  velocity?: Vector3;
  collider?: { radius: number };
  species?: { id: string };
  sticky?: { slowFactor: number; duration: number; radius: number };
  scream?: { trigger: 'damaged' | 'contact'; radius: number };
  healing?: { perSecond: number; radius: number };
  // …one optional field per component
}

// src/systems/flora/sticky.ts
export function stickySystem(world: World<Entity>, dt: number, ctx: SystemContext) {
  for (const plant of world.with('sticky', 'position')) {
    for (const body of ctx.queries.movers) {
      if (distance2D(plant.position, body.position) < plant.sticky.radius) {
        applySlow(body, plant.sticky.slowFactor, plant.sticky.duration);
        ctx.events.emit('flora_triggered', { speciesId: plant.species!.id, behaviour: 'sticky' });
      }
    }
  }
}
```

Adding a behaviour means: add the component field, write the system, register it, reference it from species data. Behaviours never know about each other; they coordinate only through components and events.

### 3.3 Typed event bus

A single `EventBus` carries cross-system events. The payload type of each event is declared once, so emitters and listeners can't disagree.

```ts
// src/core/events.ts (excerpt)
export interface GameEvents {
  flashlight_toggled: { on: boolean };
  battery_low: { level: number };
  sample_collected: { speciesId: string };
  flora_triggered: { speciesId: string; behaviour: string };
  operative_downed: { operativeId: string; downsLeft: number };
  operative_died: { operativeId: string };
  extraction_started: {};
  pulse_phase_changed: { phase: PulsePhase };
  research_completed: { researchId: string };
  encroachment_changed: { value: number };
}
```

The HUD never holds a reference to the player entity; it listens to events or reads a read-only snapshot. The encroachment system never references the mission.

### 3.4 Few globals

Module-level singletons are limited to: `events` (event bus), `gameState` (active campaign), `mixer` (audio buses), and later `fieldGuide`, `pulse` and `claude` (optional API client). The save service is *not* a global: one `SaveService` is created at boot and passed to the menus, so tests can give it an in-memory store. Adding a global needs a reason written in `CLAUDE.md`.

### 3.5 Simulation separate from rendering

Game logic updates at a **fixed 60 Hz timestep**; rendering happens every animation frame. Systems never read the clock directly — they receive `dt`. This keeps behaviour identical on 60 Hz and 144 Hz screens and makes logic testable without a renderer.

Visual-only code (`render/`) may read simulation state; simulation code never reads from three.js objects. Meshes follow entities, not the other way round.

### 3.6 Saves: versioned JSON in IndexedDB

A save is the *campaign state*, never a moment mid-run (the roguelite tension depends on this). Stored as JSON in IndexedDB, with a `saveVersion` field and migration functions from day one. The game offers **Export save** / **Import save** to a file, because browser storage is per-site and can be cleared.

---

## 4. System-by-System Design

### 4.1 Rendering and the isometric camera

- **Camera:** `OrthographicCamera` placed along the (1, 0.82, 1) diagonal from its target — the classic isometric angle (~35° elevation, 45° azimuth). Zoom sets how many metres are visible; mouse wheel zooms within a clamped range.
- **Follow:** the camera eases toward the operative, with a small look-ahead toward the aim point so you see more of what you're facing.
- **Units:** 1 unit = 1 metre. Level tiles are 2 m.
- **Tone:** ACES tone mapping, sRGB output, exponential fog tinted to the biome.
- **Post:** `EffectComposer` → render → bloom → output. Bloom picks up only bright emissive surfaces (bioluminescence, Warden light). A quality setting turns bloom and shadow resolution down.

### 4.2 Wall cutaway

Isometric games have to stop walls hiding the player. Wall tiles within a few metres of the operative *and on the camera side of them* smoothly sink to a stub. The same test runs for the operative's look point (up to 6 m toward the aim), so facing the camera doesn't show you the back of a wall. Door headers and Warden light strips hide rather than sink. Cutting a wall must never let light through: each cuttable set has an invisible, full-height copy (a `colorWrite: false` material) that does the shadow casting, while the visible mesh casts none. Walls are one `InstancedMesh` per material, so this is a per-instance matrix update, not hundreds of objects. Cut walls sink to waist height (1 m), keeping their shape. **Down the aim** (0.11.1): open floor along the aim is sampled up to 9 m or the first wall, and any wall directly between the camera and that floor drops too, even beyond the operative, so you can see down a corridor before you're in it; a wall you're looking at is never between you and the floor in front of it, so it stays up.

### 4.3 Lighting and visibility

- **Flashlight:** a `SpotLight` at hand height, casting shadows, pointed at the aim point (with a minimum reach so it never points at your feet). The light's origin is pulled back to stay at least 0.2 m from any wall (the torch is held ahead of the body, so pressed against a wall it would otherwise sit inside it), and the shadow camera's near plane sits below that margin. Cone width, range and intensity come from equipment data. Battery drains while on and recharges passively while off; below 15% the beam flickers.
- **Ambient:** a very dim hemisphere light. Ruins are dark by default; what you see is what you light.
- **Bioluminescence:** emissive materials plus a small number of non-shadow point lights.
- **Baked static light** (art slice A): daylight through breaches, Warden strips and facility lamps are never real lights. `bakeLights()` (`world/light-bake.ts`) lays them onto a per-level RGBA texture at 4 texels per tile, one channel per light group, occluded by the grid (walls and pillars) and reaching only half-way into a wall, so baked light never passes through walls. `render/baked-light.ts` injects a lookup into the shared stone materials (`onBeforeCompile`) and animates each group (steady, flicker, failing) with a uniform. Channels are capped, so the bake never burns a surface out. Static light never wakes plants: plant light senses read the torch only.
- **Stone surfaces** (stage 2a): three texture sets (slab for walls and pillars, flagstones for floors, rubble for rubble floors and wall tops), each a packed surface map (tone, roughness, cavity, height) and a normal map, 512 px over 4 m. They're generated by `tools/textures/stone.py` and mapped triplanar in the stone shader, so the procedural geometry needs no UVs. The layer's stone colour tints them. Standing water fills the low parts of the stone first (by height), goes flat and glossy, and has its own higher glint ceiling (still under bloom). The textures are halved on Low quality.
- **The wall kit** (stage 2b): walls, pillars and debris are pieces built in Blender by `tools/blender/wall_kit.py` (headless `bpy`), exported as flat-shaded triangle data with side and top groups (`render/wall-kit.ts`). Each tile picks a piece and a quarter-turn from the level seed. There's one instanced occluder set per piece, so the cutaway still sinks blocks individually; shadow proxies remain plain full-height blocks and cylinders.
- **Sight culling:** plants and creatures the operative has no line of sight to aren't drawn (grid line of sight to the centre and either side, a few times a second). Their glow lights still light what they can reach A plant growing inside a thicket isn't drawn until the operative is within 2.2 m of it.
- **Decor growth** (stage 3a, `render/decor.ts`): grass tufts, ferns against walls, moss curtains on the camera-facing wall faces and thicket clumps, one `InstancedMesh` per kind, placed per level from the grid, the layer's `decorDensity` and a seed (halved on Low quality). A vertex shader sways them slowly and lays them down (to 12% height) on the camera side of the operative, as the walls sink. Moss curtains skip broken-topped blocks, fit their wall's height and sink with it. Leaves fold along a midrib and both sides are lit as the upper side. Growth is thicker in daylight pools, and plant population is drawn toward them too. They cast no shadows. Direct light on them eases toward a ceiling on the light arriving (`DECOR_LIGHT`), so growth stays its own dark green under the torch and never burns out.
- **Foliage** (the plant pass, `render/foliage.ts`): decor and species share one leaf language. `tools/textures/leaves.py` paints a 4 × 4 atlas (albedo detail and cut-out, a mask for veins, bands, spots and rim, a normal map). Plants are leaf cards on bent spines, stems and lathed bodies mapped to it, all in one material: alpha test, normal map, both faces lit, a ceiling on the light arriving, dealt pattern colour, glowing veins. Species cast leaf-shaped torch shadows (an alpha-tested depth material). Glow species have per-plant materials so a sleeping plant can glow dimly (`dimAsleep`); its cluster's glow light follows. Plant colours are given in sRGB (`setHSL(…, SRGBColorSpace)`), like the stone's. Creepers re-root every 0.7 m, leaving a withering copy (`CREEP_VIEW`); shoots grow in. A woken plant stirs before its alert behaviours take hold (`FLORA_MOOD.stir`, `mood.stir`), its glow guttering up meanwhile (each plant drives its own glow materials in `animateWorld`; the glow pool drives only lights); new shoots can't be woken for `FLORA_MOOD.youth`. Tall decor no longer flattens under the cutaway. Decor colour comes in seeded regions of six families (`DECOR_FAMILIES`, `regions`).
- **Stone detail:** a second sample of the stone textures at 3.7× the scale adds tone and relief close up, and moss darkens the joins and wall feet (`STONE_SURFACE.detail`, `.moss`).
- **Breaches and god rays** (stage 3a): `breachesFor()` (`world/breaches.ts`) opens up to one hole per room in layers with `LayerLook.daylight` (the Threshold only, so far). Each gets a pool of baked daylight (bake group 0) and a shaft (`render/god-rays.ts`): an additive open cylinder from the pool up to the hole with drifting dust, soft at its edges, thinned where it stands between the camera and the operative. No lights (rule 8).
- **Stone light** (the values pass): the stone shader compresses direct diffuse and specular light with a soft knee toward a ceiling (`STONE_LIGHT`), after all lights are summed, so no light source can burn stone white or make it bloom. A faint per-layer fill (`LayerLook.fill`) is folded into the hemisphere light's colours, so the light count doesn't change.
- **Standing water** (art slice B): `waterFor()` (`world/water.ts`) derives puddles, wall runnels and drip spots from the grid, the layer's `wetness` and a seed. The stone shader reads them as a second texture: wet floor is darker and glossier (the torch lays a sheen, soft-capped so it never burns out), and runnels streak the wall faces. Drops and ripples are lit meshes, never lights. The simulation reads the same map (`SimContext.water`): wet footsteps are `splash` noises.
- **Torch colour:** a slightly warm white (`0xfff6ea`); Warden light is pure white; everything human is warm.
- **Light budget:** forward rendering means every light costs something on every surface. Budget: **1–2 shadow-casting lights** (flashlight, plus one scripted light when a scene needs it) and a fixed set of point lights: 6 pooled glow lights (assigned to the nearest glowing plant clusters), 1 suit light, 1 effects flash (bursts). The count never changes at runtime; unused lights sit at intensity 0. Glow lights cast shadows so plant light stays in its room, but their cube maps render only when a light is assigned to a plant (`shadow.autoUpdate = false`, 128–512 px by quality); only static geometry (wall proxies, debris) casts into them, and anything that moves opts out with `customDistanceMaterial`.
- **Day/night (surface):** a directional sun/moon light and ambient colour interpolated from the selected launch time. Deep ruins ignore this.
- **Pulse tint:** the current phase shifts ambient and fog colour slightly — purely visual.

### 4.4 Levels: tile grids from text

A level is a text grid in a data file. One character per 2 m tile:

```
#  wall             .  floor            ,  rubble floor
o  pillar           x  debris (solid)   D  doorway with a low lintel
g  glow plant       P  player start
```

`parseLevel()` turns the text into a typed grid (unit-tested). `buildLevel()` turns the grid into instanced meshes, lights and spawn points. Later, room templates are the same format plus spawn markers (flora, fauna, loot, lore, entry/exit) which the site generator stitches together and populates (§4.6).

### 4.5 Player controller

- **Movement:** WASD relative to the screen (W is up the screen), Shift to sprint. Speed from operative stats and armour.
- **Aim:** the mouse ray hits the ground plane; the operative faces the aim point independently of movement.
- **Collision:** circle-vs-grid against solid tiles, resolved per axis so the operative slides along walls.
- **Interaction:** E (from Session 4).
- **Stats:** health, stamina, Exposure, carry weight; effects from flora and consumables are timed modifiers.
- **Downs:** at 0 health the operative is downed; the suit stabilises them (health, Exposure and time cost). Third time is death.

### 4.6 Sites, rooms and population

Each room template (`src/data/rooms`) is a tile grid plus markers (`f` plants, `+` supplies, `c` den, `>` hatch, `*` glyph, `P` start) with `D` sockets on its outer wall. The site generator (`src/world/site-gen.ts`) picks templates suitable for the depth tier, turns and flips them to fit, and joins them at sockets so neighbours share a wall: entry first, then halls and rooms (sometimes through corridors), then the way out from the deepest socket. The layout is seeded per campaign and layer; each run, `shiftLayout` collapses up to two side passages (never on the way from entry to exit). The population pass then chooses 5–6 flora and 2–4 fauna species for the level (by rarity and depth, with caps: one mover, two healers, one of the rarest; biome and Pulse phase later) and distributes them over reachable ground by habitat, with creatures in dens. Hand-designed layouts, procedural contents.

### 4.7 Combat and damage

- **Damage event:** source, target, amount, type (ballistic, energy, fire, sonic, biological, melee), position
- **Health component** with armour reduction by damage type
- **Projectiles:** pooled entities; fast weapons use hitscan (grid ray-march) instead
- **Melee:** arc overlap test in front of the operative. The machete tires (`MELEE`): each swing adds fatigue, which drains over time and lengthens the recovery, so spamming slows to about half speed. Hacking at a plant is a `hack` noise (6 m) where the plant stands
- **Thickets** (stage 3a, `world/thickets.ts`): tiles of growth that block the operative only (`moveCircle` takes a blocker predicate; creatures push through). Placed from noise, favouring walls, never at doors or near the start, exits or anything to pick up; some plants grow inside them. Two machete cuts clear one; each cut is a 7 m `hack` noise and a `thicket_hit` event. Run state only, never saved
- **Noise:** gunfire, sprinting and explosions emit a `noise` event with a radius — the input for sound-reactive flora and acoustic fauna

### 4.7b Flora (built in Session 3)

- **Species** (`src/data/species/flora`) list behaviour components with parameters; `plantEntity()` turns a species into ECS data. Each behaviour is a component plus a system in `src/systems/flora/`.
- **Triggers compose:** contact, proximity and noise all call `triggerPlant()`, which starts whichever of spores, burst and scream the plant has. A species never needs code to combine behaviours.
- **Noise** is a per-step list on `SimContext` (`noise.current` / `noise.next`), so a shriek sets off plants on the following step and chains spread one step at a time, never looping within a step.
- **Damage** always goes through `dealDamage()` in `systems/vitals.ts`, which handles grace, downs and death, and reports whether it landed (so hazards don't spend cooldowns on blocked hits).
- **Population** (`game/flora-population.ts`) and **looks** (`game/flora-looks.ts`) are pure, seeded functions: same campaign + run → same ruin; next run → different. Looks are shuffled per campaign across five body plans; the two species that share a plan get near-identical colours (mimics).
- **Models** (`render/flora-models.ts`) are generated per species per campaign (three variants each) and merged, so a plant is one or two draw calls.

### 4.8 Field guide and species naming

Per species per campaign: knowledge state (`encountered` → `scanned` → `sampled` → `researched`) and a **name fixed on first encounter**. The name comes from the local generator (syllable tables per biome) or, if enabled, the Claude API — once, then saved. The field guide UI shows detail by state.

### 4.9 Enemy AI

Finite state machines per archetype (idle/patrol → alerted → hunting → attacking → fleeing → dying). Detection is components: `visualSense`, `audioSense`, `biosignSense`, `vibrationSense`, `chemoSense`, each with its own systems. The FSM reads what the senses set. Paths come from grid A* with line-of-sight smoothing.

### 4.10 Inventory

Items are data (`src/data/items`: `id`, `name`, `category` salvage / material / relic / supply, `weight`, and for supplies what they load: rounds or medkits). The pack (`pack` component, pure rules in `src/game/inventory.ts`) is a stock of item counts plus carried samples, weighed against a comfortable load (18 kg: over it you're slower and can't sprint) and a hard limit (27 kg: nothing more goes in). Supplies never go in the pack; they're used at once. Salvage piles hold rolled stock from depth tables (`src/data/loot`); searching takes what fits and leaves the rest. The pack screen (I) lists the load and drops things as a pile at your feet. Relic slots and the drone slot come later, as does drag and drop.

### 4.11 Research and fabrication

Research is a prerequisite graph in data (`prerequisites`, `requiredSamples`, `requiredMaterials`, `days`, `unlocks`). The graph resolver is pure and unit-tested. Fabrication consumes materials against unlocked blueprints; power limits parallel jobs.

### 4.12 Pulse (campaign clock)

`pulse` holds the current phase and its start day. Phases advance only when campaign days pass at base (research, surgery, recovery, waiting). The phase is locked for the duration of a run. Transitions are drawn from weighted tables using the campaign's seeded RNG, so they're unpredictable but reproducible from a save. Forecasting is a research unlock that reveals the next phase and a window. Other systems query `pulse.modifier('fauna_aggression')` etc.

### 4.13 Encroachment

A campaign value. Rises with every campaign day; falls with containment materials and defences. Critical = the base falls. Updated on day ticks and mission return, not per frame.

### 4.14 Roster

Twenty-five `Operative` records in `gameState` (name, portrait, backstory, specialisation, trait, stats, rank/XP, equipment, augments, Exposure, status, recovery day). The roster UI needs sort and filter (specialisation, status, Exposure, rank). Death moves the operative to the memorial. When no living operatives remain, the campaign ends.

### 4.15 Optional: Claude API naming

A small client in `src/api/claude.ts`:

- **Off by default.** The game works fully with the local generator.
- **Development only (for now):** the key is read from `VITE_ANTHROPIC_API_KEY` in `.env.local` and sent from the browser with the `anthropic-dangerous-direct-browser-access` header. This is acceptable only on your own machine.
- Results are cached in the save; each species is named once per campaign.
- Model id and prompts live in config, not code.
- Any failure falls back to the local generator silently.

**This must change before any public deployment — see §9.**

### 4.16 Audio

Three buses (effects, ambience, music) into a master with a limiter. Effects also feed a generated room reverb. Sounds are **synthesised** from oscillators, filtered noise and envelopes (`src/audio/synth.ts`), so the game ships no audio files and works offline. Each recipe renders into any `BaseAudioContext`, so the smoke test renders every sound offline and checks it's audible and below clipping.

Which event plays which sound is a data table (`EVENT_SOUNDS` in `src/audio/game-audio.ts`). Positional sounds pan by where they are on screen and fade with distance from the operative (inaudible past 32 m). Continuous states (heartbeat at low health, poison hiss) are driven per frame. Footsteps come from the animation's gait, by surface (floor or rubble).

To use recorded samples later, replace a recipe with one that plays an `AudioBuffer`; names and the event table stay the same. Browsers block audio until the first click or key press; the mixer unlocks on the first gesture.

### 4.17 Hurt feedback

`HurtFeedback` (`src/render/feedback.ts`) turns damage events into uniforms for a full-screen pass (`feedback-pass.ts`, after bloom), camera shake, hit-stop (`Loop.freeze`) and the operative's flinch. Hits (`kind: 'hit'`) flash; damage over time (`kind: 'tick'`) throbs at most every 0.7 s. The pass is skipped entirely when nothing is showing.

---

## 5. Performance

Target: 60 fps on a 5-year-old laptop's integrated graphics at 1080p.

- **Draw calls:** instanced meshes for walls, floors and repeated flora. Keep a scene under ~300 draw calls.
- **Lights:** the budget in §4.3. Shadow-casting lights are the most expensive thing in the game.
- **Shadows:** 1024² flashlight shadow map by default, 2048² on high quality.
- **Pixel ratio:** capped at 2 (1.5 on low quality).
- **Post:** bloom off on low quality.
- **Allocation:** reuse vectors in hot loops; pool projectiles and particles.
- **Culling:** three.js frustum-culls meshes; systems skip distant entities where it doesn't matter.
- **Measure:** an on-screen frame-time readout (toggle with backtick) from Session 1.

---

## 6. Working with Claude

### 6.1 Why this suits Claude

- It's all TypeScript: Claude can read, write, run, test and screenshot the whole game in its own environment
- Type-checked data catches content mistakes at build time
- ECS keeps each behaviour a small, isolated addition
- Each system fits comfortably in one session

### 6.2 `CLAUDE.md`

Every session begins by reading `CLAUDE.md`: overview, rules, conventions, pre-deploy checklist and the **Current State** section. Kept under ~200 lines; detail lives in `docs/`.

### 6.3 Session pattern

1. Read `CLAUDE.md` and any session brief
2. Confirm scope
3. Implement one bounded piece
4. `npm run check` (type check + unit tests) and `npm run smoke` (headless load + screenshot)
5. Play it in the browser (`npm run dev`)
6. Commit: `session N: <what was added>`
7. Update **Current State**; add a session note if useful

### 6.4 What to avoid

- "Build the whole game" sessions
- Hardcoding content in systems to save time
- Subclassing to combine behaviours
- Direct references between unrelated systems
- Reading three.js objects from simulation code

---

## 7. Build Order — Sessions

Each session produces a working, playable, committed increment. The game has a complete loop after Session 12.

### Phase 1: Foundation (1–3)

*Build order changed after Session 2: flora moved ahead of assets and audio, so there was something to interact with sooner.*

**Session 1 — Isometric foundation** *(done — see CLAUDE.md Current State)*
- Vite + TypeScript + three.js project, folder structure, event bus, ECS world
- Fixed-timestep loop, input
- Data-driven test ruin from a text grid (walls, pillars, debris, low-lintel doorways, glow plants)
- Isometric orthographic camera with follow, look-ahead and zoom
- Operative placeholder: screen-relative WASD, sprint, mouse aim, circle-vs-grid collision
- Shadow-casting flashlight with battery, recharge and low-battery flicker
- Wall cutaway, bloom, fog, drifting spores, frame-time readout
- Build guard for the API key (§9)

**Session 2 — State, saves, settings** *(done — see `docs/session_notes/session-02.md`)*
- `gameState`, `Campaign`, saveable seeded RNG with labelled forks; campaign stats
- Three IndexedDB slots with backups, versioning, migrations, validation, damaged-slot restore; export (download/copy) and import (file/paste)
- Settings: quality presets, bloom, frame time, four audio buses, key rebinding with swap-on-conflict
- Preact menus: title, campaigns, export, import, settings, pause; autosave on quit and page hide

**Session 3 — First flora** *(done, brought forward at the user's request — see `docs/session_notes/session-03.md`)*
- Seven species from data, each a mix of behaviour components: sticky, spines, spores, scream, burst, healing, glow, sound-reactive
- Noise events (sprinting, shrieks, bursts) that set off sound-reactive plants: chain reactions
- Seeded population from level markers (`f` any, `h` harmless, `+` medkit); 5–6 species per level; repopulates each run
- Per-campaign looks from five procedural body plans, so shape and colour never give behaviour away; built-in mimics
- Health, timed effects (snared, poisoned, healing), two downs then death, grace period after getting up
- Medkits: taken from base stock (3 per run), used with Q, found on the floor with E; lost on death
- HUD: health, downs, effects, medkits, prompts, hit/heal flashes, down and lost overlays; run-lost screen
- Save format 2 (supplies, downs, lost runs) with the first real migration

### Phase 2: First entity systems (4–7)

**Session 4 — Operative, hurt feedback and sound** *(done — see `docs/session_notes/session-04.md`)*
- Hurt feedback, turned up after playtesting: a full-screen damage shader (red edges, a wedge toward the source, chromatic split, colour drain and heartbeat at low health, poison and snare edges, grey when down), hit-stop, camera shake, the suit flashing red, hit sparks, a shaking health bar with a trail
- Articulated operative built in code: legs follow the walk while the body aims, torch in the animated hand, sprint lean, snared trudge, flinch, kneel when down, collapse on death, status light on the pack
- Procedural animation with footstep timing
- Synthesised sound on the existing buses: 21 sounds (footsteps by surface, torch, hurt, alarm, heartbeat, poison, snare, medkit, pickup, shriek, spores, burst, menus), room reverb, ambient drone bed (replaced by plant voices in Session 5); event → sound table
- glTF loading deferred to when an art direction is chosen: the CC0 rigged characters available (KayKit Adventurers) are fantasy-styled and wrong for this game

**Session 5 — Living flora** *(done — see `docs/session_notes/session-05.md`)*
- Plant moods: every plant dormant or alert; senses (sound, light, presence, touch) decide what wakes it; signals wake kin or every plant nearby in a wave; waking swaps behaviour components for the species' alert set (`applyMood`), keeping runtime state
- Species redesigned around moods; two new species (tattler, dusk orchid): nine in all
- The plants are the soundtrack: per-campaign voices (timbre, register, Euclidean rhythm, motif in one key), a look-ahead sequencer on the music bus, nearest 10 clusters, muffled behind walls; awake clusters sing twice as often and higher. The ambient drone is gone (room tone only)
- Hearing sharpens in the dark: mixer focus (louder, further-carrying, brighter voices) follows the torch
- Concealment: one or two species per campaign camouflaged (flat, floor-coloured)
- No save change: moods are run state; voices and looks derive from the campaign seed

**Session 6 — Knowledge** *(done — see `docs/session_notes/session-06.md`)*
- Scanner: reads senses, mood and links (never behaviour); draws from the torch's cell, needs a moment standing still, and pings (a noise event plants can hear)
- Probes: a handful per run, thrown, noisy; wake and trigger what they hit
- Sampling (up close); field guide state and UI; local name generator; species names fixed per campaign
- Save format 3: field guide knowledge per species, base sample store
- 0.6.2 after playtest: habitats (lit/dark, space, wall-growers), grow/spread/wither, nightcap and gorge vine, animal screams dealt per campaign, right-click field-guide card, species portraits, no wake flare
- 0.6.1 dread pass after playtest: learnable senses (asleep mild, awake dangerous), creeping plants, drifting spores, torch-draining grapplers, costlier scans with a waking flash, organic plant sounds, inner monologue
- Done as planned, plus: plants are noticed only when lit, glowing or close; landed probes witness for the field guide; the knowledge tracker (`src/app/knowledge.ts`) turns events into campaign knowledge

**Session 7 — Combat basics** *(done — see `docs/session_notes/session-07.md`)*
- Weapon data, one fabricated pistol, machete
- Projectiles/hitscan, damage types, armour hook
- One fauna species with an FSM, visual + audio senses (hears the existing noise events), grid A*
- Also: plant tweaks from playtest (slower crawlers, rolling tumble burr, scan tissue readings, probes provoke contact behaviours, nothing near the start)

### Phase 3: Mission lifecycle (8–10)

**Session 8 — Rooms and population** *(done — see `docs/session_notes/session-08.md`)*
- Room templates with sockets and markers, stitched with shared walls; one layout per campaign, passages collapse between runs
- Species selection per level (rarity, depth, caps); population only on reachable ground; creature dens
- Also: the lash vine (reaching, reeling snare)
**Session 9 — The run and its haul** *(done — see `docs/session_notes/session-09.md`)*
- Loot: item data, salvage piles on `$` markers with depth loot tables, the pack (weight, comfortable load, hard limit), dropping
- Extraction by lift (called at each layer's entry, a noisy wait, it waits then leaves), hatches down to the next layer, a sealed deepest hatch
- Run outcomes settled at once: extracted (everything home), abandoned (medkits only), lost (nothing); debrief and lost screens; save format 4 (materials, sites, run counts)
**Session 10 — Cache and uplink** *(done — see `docs/session_notes/session-10.md`)*
- Field caches: `k` markers, two per layer chosen per campaign; stow and take (medkits and rounds too); saved in the campaign (format 5); sometimes disturbed
- Uplink relays: `u` markers, one per layer; an 8 s noisy transmission banks carried samples and glyph readings at base mid-run
- Also: quitting from the menu leaves the haul again (0.9.1 had changed it by mistake)

**Art direction pass (between 10 and 11):** with a whole run playable, settle the look before content multiplies. A first pass shipped in 0.9.1 (`docs/art_direction.md`: INSIDE-style grade, haze, volumetric torch beam and dust, contact shade, per-layer looks); the full pass takes on what that note lists as open.

### Phase 4: Base hub (11–13)

**Session 11 — Base shell:** base screens (Preact, as the menus), base ↔ mission transitions, campaign days, save on transition
**Session 12 — Lab:** synthesis, research graph (unit-tested resolver)
**Session 13 — Fabricator:** blueprints, fabrication, tech tree UI

### Phase 5: Operatives (14–15)

**Session 14 — The 25:** roster data and UI (sort/filter), deployment, memorial, roster-wipe failure
**Session 15 — People:** specialisations, traits, Exposure, medical recovery

### Phase 6: Campaign pressure (16–17)

**Session 16 — Encroachment and rewards:** containment meter, reward categories, supply drops, base-falls failure
**Session 17 — Pulse:** campaign-clock phases, forecasting, phase modifiers, phase-gated content

### Phase 7: Content (18–19)

**Session 18 — Flora pool:** remaining behaviours, ~20 species, biomes, drop zones
**Session 19 — Fauna pool:** archetypes, senses, hybrid synthesis, spawn tables

### Phase 8: Advanced systems (20–22)

**Session 20 — Experimental weapons and dispensers**
**Session 21 — Armour (T1–T3 + Warden salvage) and mods**
**Session 22 — Augments and drones (scout, recovery, combat)**

### Phase 9: Narrative (23–25)

**Session 23 — Relics, scanner upgrades, mystery items**
**Session 24 — Lore fragments and archive**
**Session 25 — Endings and final missions**

### Phase 10: Polish and release (26+)

- Audio and VFX pass, UI consistency, balance, performance on low-end hardware
- Optional Claude API naming wired into the field guide
- **Work through §9 before the first public build**

---

## 8. Risks and Mitigations

**Scope balloons.** The build order is a shippable MVP at every phase. Cut features go to the "Later" list in `game_design.md`, not into the current session.

**Behaviours get tangled.** Keep each behaviour single-purpose. If one does two things, split it. Coordinate via components and events only.

**Save format breaks.** Versioning and migrations from Session 2; `docs/save_schema.md` updated with every change.

**Browser saves get lost.** Export/import from Session 2; a reminder to export after long sessions.

**Performance on weak machines.** Light budget, instancing, quality settings, and a frame-time readout from day one.

**Assembling an engine from parts.** Only add a library when a session needs it; prefer the simple tile-based version first.

**Solo developer burnout.** Bounded sessions, a playable result every time.

---

## 9. Pre-deploy checklist

**Do not host the game anywhere public (itch.io, GitHub Pages, Cloudflare Pages, a friend's server) until every item is done.**

1. **Remove the Claude API key from the client.** Vite copies every `VITE_*` variable into the built JavaScript. Anyone who opens the game can read it and spend on your account. Pick one:
   - **Pre-generate names at build time** (simplest): run the naming once during development, commit the results as data, ship with no API calls at all
   - **Player-supplied key:** a settings field where players paste their own key, stored only in their browser
   - **Proxy:** a small server function (e.g. a Cloudflare Worker) holds the key and forwards limited, rate-limited requests
2. **Confirm the build guard passes.** `vite.config.ts` refuses a production build while `VITE_ANTHROPIC_API_KEY` is set. Do not bypass it (`ALLOW_KEY_IN_BUILD=1`) for a public build.
3. **Search the built output** for `sk-ant` before uploading: `grep -r "sk-ant" dist/` must return nothing.
4. **Rotate the development key** in the Anthropic console if it has ever been in a build that left your machine.
5. **Remove the `anthropic-dangerous-direct-browser-access` header** from any code path that ships.
6. Check asset licences (Kenney/Quaternius are CC0; others vary) and add credits. Record so far:
   - **Stone textures** (`src/assets/stone/`): original, generated by `tools/textures/stone.py`. No third-party material.
   - **Sounds:** synthesised in code (`audio/synth.ts`).
   - **Fonts:** IBM Plex Mono and Big Shoulders Stencil (SIL Open Font Licence), which need a credit line.
7. Test save export/import on the hosting domain — saves are per-site.

---

## 10. Not covered here

- Art direction (palette, model style) — decided during early prototyping
- UI wireframes — per system during implementation
- Audio direction — alongside visual style
- Localisation — defer until release is in sight
- Marketing, distribution, monetisation
- Multiplayer — explicitly not a feature
