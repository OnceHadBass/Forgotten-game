# Art direction

**Art bible, v2 (27 Sept 2026).** Written from the full art direction interview with Nathan, on top of the first pass (0.9.1). Where the two differ, this version wins. Each area has a **decision**, the **constraints** it has to live within, and **pushbacks**: places where an idea clashed with the rules and how the clash was settled. The build list and open questions are at the end.

*(The canonical copy lives in the claude.ai Project as `claude/art_direction.md`; this is the repo copy.)*

## The idea in one line

**A Mayan temple that is also an alien machine.** Near the top, nature has broken in: water, roots, dense growth, and daylight through holes in the shell. Lower down, the machine is dead, then half-working, then running and guarded. At its heart is a white silence. Going down, you see less of the planet and more of the machine, and more of the facility is lit.

INSIDE's rule still holds: the world is near-colourless stone and haze, and colour belongs to someone.

## References and what we take from each

| Reference | Take | Leave |
|---|---|---|
| **INSIDE** (cornfield, cave, quarry) | One hue per scene; haze; soft heavy forms; wet floors that double the light; a tiny figure against something vast; the white quarry as the Vault | Scale from height (the isometric cutaway kills it; see Warden architecture) |
| **Stasis** | The closest match to our camera. Rooms floating in black; overgrowth choking the tech; dead machines; hard pools of light in deep dark; clutter getting denser deeper; **surface detail** (texture and wear, not hand-painted: reversed from an earlier *Leave*, in the values pass route) | Its lamp count (our light budget can't afford it: see *Light without lights*) |
| **Orange grass shot** (Peregrino) | Foliage as a massed, instanced field you push through; a whole scene tinted into one mood | A tint strong enough to swallow plant colours |
| **This War of Mine** | Grime and grain at the screen edges; stencil type; the field guide as a charcoal notebook | Side-on cross-section (our wall cutaway already does that job) |
| **Annihilation** (book and film) | The fauna: kingdom-blurring, beautiful and wrong | — |

## Who owns which colour

This table settles the suit and Warden clash (both were orange) and fixes the plant palette. **Every colour on screen belongs to exactly one owner.**

| Owner | Colour | Notes |
|---|---|---|
| **The operative** | Rich yellow suit; slightly warm white torch | Changed from the orange suit. Yellow is **reserved**: no plant, creature or prop is ever dealt it (a small stencil mark on expedition kit is the one exception) |
| **The Wardens** | Bright white | Light strips, panels, construct seams, the Vault. Hard straight lines. **Reserved**: no plant glows white |
| **Plant bodies** | Greens, teal-blues, violets, deep reds and rust (0.12.1: wider, more alien) | Dealt per campaign by `floraLooks`; one or two species per campaign are dealt **vivid** (saturated body, strong marks) so some plants are easy to see |
| **Bioluminescence** | A restricted band: teal → violet → magenta | Never yellow or white, so glow can never be mistaken for the operative or the Wardens |
| **Plant accents** | Rare dark red; rare acid green | Dealt per campaign like every look, so they predict nothing. Kept dark enough under the torch not to read as glow |
| **Creatures** | Earth, bark, pale flesh; eyeshine pale green | Emissive markings stay inside the bioluminescence band |
| **Blood** | Red | It's life, so it's allowed colour. Fresh blood is dark red; old blood is brown-black |
| **Stone and props** | Never saturated | As before |
| **Decor growth** | Regions of green, teal, violet, wine, rust and blue-grey (mostly green) | 0.12.1: colour comes in patches across a level, as growth does, so the ruin looks like somewhere else |

**Pushbacks**

- *Bright yellow plants* (settled). Rich yellow is reserved for the operative, who must always read. The plants' "odd bright yellow" becomes **acid chartreuse**: still a startling yellow-green, never the suit.
- *The torch: a slightly warm white* (agreed). It's a nudge, not amber. The current value, `0xeef2ff`, is in fact faintly blue; what reads as warm today is the dust caught in the beam. Pure white now belongs to the Wardens, so the torch moves a touch to the warm side of white. Everything human in the ruin is then warm, and the torch never matches a Warden panel.
- *The grade.* The grade currently keeps *all* warm hues saturated. With red plants and blood that becomes unfair, because red species would pop while green ones go grey. The grade keeps the saturation of just two things: the operative's yellow band and bright emissive light. Everything else, including plant bodies, gets the same partial desaturation. The amount is set per layer, so the overgrown layers are allowed more green.
- *Existing campaigns.* Restricting `floraLooks` changes how existing campaigns' plants look, because looks are derived from the seed. That's acceptable before release, but it needs a line in the session note.

## 1. Layers: the descent

**Decision:** four layers underground. Hue, material, water, light, sound and creatures all change together from one layer to the next. The organising idea is that **light comes from above at the top and from the machine at the bottom**: god rays through breaches, then the odd flickering light, then working systems, then the machine and its security. Plants thin out as the machines take over.

| Layer | Tier | Hue and haze | Growth | Water | Machines and light | Scale | Hazards and sound | Creatures |
|---|---|---|---|---|---|---|---|---|
| **1. The breached shell** | Threshold (built) | Dark blue-green | Truly overgrown: dense decor you hack through | Lots: puddled corridors, drips in corners, runnels down walls | None working. God rays through holes in the shell; glow plants | Claustrophobic: tight tunnels | Drips, splashing steps, the plant soundtrack | Few |
| **2. The drowned halls** | Interior (built) | Blue-green going grey-green | Heavy | Puddles, drips | Occasional machinery, dead and dark; the odd flickering facility light | Mostly tight; the first oversized fixtures | The buzz of failing lights | The odd skulker in the shadows |
| **3. The works** | New tier | Cold grey, oily, with white islands | Sparse, clinging to machines | Leaks and fluid from broken machines; steam | Lots of machines; more lights and systems working; panels glowing with unknown purpose | Pits and shafts; oversized fixtures | **Environmental risks** (e.g. steam vents, leaking fluid, arcing conduits); hiss, click and whirr join the soundtrack | More, watching |
| **4. The Vault** | Vault | Black, with hard white | Few plants | Condensation, still pools | The machine running; **Warden security** | Shafts with lit machinery far below | Security systems; the machine's hum | **Monsters** |

- **The Vault's heart is the white.** The deepest chamber(s), where the containment sits, are the INSIDE quarry: pale, high-key, vast and empty, with the operative a speck and the apparatus glimpsed at the edges. That's the "mainly white, a little machine" from the interview, now kept for the finale rather than the whole layer.
- **The outdoor Surface approach**, when it's built, looks like layer 1 without a roof: blue-green foliage under the overcast alien sky, which shifts with the Pulse phase.

**Constraints and pushbacks**

- *Tier names.* The design lists Surface, Threshold, Interior and Vault. These four layers are all underground, so "the works" becomes a new tier between Interior and Vault, and the outdoor Surface stays separate. That's a change for `game_design.md` (knock-ons below). The layer names above are working names.
- *Machine hazards may telegraph; plants never do.* Environmental risks and security are machines, not plants, so they're allowed to read honestly: steam hisses before it vents, a conduit sparks before it arcs. The no-telegraphing rule stays with the flora. Both are new gameplay systems, built with their layers.
- *More light deeper cheapens the torch.* The torch is the game's signature. So in layers 3 and 4, deeper light comes as **islands**: pools under working fixtures and glowing panels, with full darkness between them. The Vault's white heart is the one deliberate inversion. For the first time the dark is gone, and the dread flips from "what's out there" to "everything can see me".
- *Static light never wakes plants.* Plant light senses respond to the torch and flashes only, never to baked or fixture light. Otherwise a light-sensitive plant in a lit room would stay awake for ever, and "pass it in the dark" would stop being a lesson. Habitat must also never correlate with senses, or a plant's position would give its sense away.
- Every layer ships with its own `LayerLook`, extended to cover wetness, decor density and the saturation allowance.

## 2. Warden architecture: monolith, then apparatus

**Decision:** near the top, **plain brutalist slabs**, like INSIDE: few seams, chamfered edges, lintels at the wrong heights. Lower down, **the walls open** onto machinery, as in Stasis: conduits, tanks, gantries and pods. The building undresses as you descend.

- **Scale.** The top one or two layers stay **claustrophobic**: tight tunnels choked with growth. Deeper, scale comes from **pits and shafts**, with machinery and lit depths far below through haze, and from **fixtures sized for something bigger**: 1.5 m risers, 6 m doorways, handholds at the wrong height.
  - *Constraint:* isometric view can't show height, because walls sink near the operative and ceilings are cut away. Scale therefore comes from depth (looking *down*) and from proportion, never from towering walls.
  - Pits need a new tile type: a non-walkable drop, with geometry drawn below the floor plane and fogged by depth. That's also where megafauna can be glimpsed.
- **Glyphs are etched only.** They're never lit. They appear when the torch rakes across them: a normal-mapped decal that shows at a glancing angle. Glyph spots are *noticed* the same way plants are (lit by the torch, or very close). Keep your eyes peeled.
- **Warden light is bright white**, in hard straight lines: strips in slab seams, panels, door frames. In layer 1 the strips are dead; in layer 2 the odd one flickers; in layer 3 more of them work; in the Vault they all do. They never burn out a surface (see the rules).
- **Warden constructs** are solid dark shells with white light at the seams (see Creatures).

## 3. The operative: a yellow hard suit

**Decision:** a hard suit. A **bulky helmet with a lit visor slit**, a **pack**, a rich yellow shell with dark joints, and grime on the lower legs. It's built procedurally in code on the existing articulated rig, with better shapes.

- **Silhouette first.** At isometric scale the operative is a few dozen pixels tall, so the helmet dome and the pack are what make them read. No fine detail. The yellow shell and the warm visor carry them against any background, and the torch-side rim catches light.
- The visor glow is slightly warm white, like the torch. The existing suit light is its light source; no new light is added.
- **The pack doesn't change with load** (your call: the HUD carries weight).
- **Specialisation kit comes later**, with the roster session: one kit piece per specialisation (a Scout antenna, a Soldier plate and so on).
- **Weapon models in hand**: the pistol and machete, which are missing today. They come in the same slice as the operative.
- **Portraits are helmet portraits.** No faces. Each has a visor reflection, individual wear and scratches, and a stencilled name and roster number. They're rendered like the plant portraits (`render/portraits.ts`), with grain.

## 4. Plants: species, and the green that isn't

**Decision:** two kinds of plant.

1. **Species**: the real, behavioural plants. Five body plans, dealt per campaign (unchanged). Colours come from the restricted palette above.
2. **Decor growth**: grass, ferns, hanging moss curtains and wall creeper, **lush and alive-looking** and densest in layers 1 and 2 (and the outdoor approach), thinning to almost none in the Vault. It's there to make the player slow down, because anything could be in it.

**Rules that keep decor honest**

- **Decor never uses a species body plan.** It has its own form vocabulary. A careful player can always tell species from decor; a careless one won't. Without this, camouflage and mimic twins would stop meaning anything, and the design warns against "a game about squinting".
- **Decor sways; it never trembles.** Tremble is the one mood tell for species (rule 10), so decor must never fake it. Slow wind sway is fine.
- **Decor has no voice, no glow and no behaviour**, and it's never logged in the field guide.
- **Decor under the cutaway flattens.** Clumps between the camera and the operative sink the way walls do (a per-instance scale).
- **The waking tell stays subtle** (your call): tremble and stand taller, nothing added. The rustling hiss and the monologue line stay too; in dense growth they'll often be how you notice.
- *Translucency* (faked subsurface light on the leaves): deferred until the plant slice, then tried against screenshots.

**Hack-through growth** (a gameplay system, decided):

- **Easy and quick, but loud.** A swing or two clears a clump. Each cut is a noise that plants hear and creatures come to investigate. That's the trade: the machete is quiet against plants, but hacking a path announces you.
- **The machete arc hits whatever is in it.** If a species is inside the swing, it's cut too, through `hurtPlant()` as normal, which wakes it and sets it off. Clumps next to a species are otherwise safe to cut.
- **Decor has its own component, never `hurtPlant()`,** so cutting it never looks like a species dying and never logs anything in the field guide.
- **Blocking clumps are tiles** that become walkable once cut, so pathfinding sees them.

## 5. Creatures: as wild as we can make them

**Decision: kingdom-blurring, in the spirit of Annihilation.** Bark, fronds, slime, chitin and flesh mixed together. The fauna is where the game is allowed to be most imaginative. Creature ideas from the interview:

- **Giant slugs** that try to swallow people
- **Spider-like things** that skitter in the dark and avoid the torch
- **Hulking tree-like things** that pass for plants
- **An ecosystem, not just enemies.** Grazers drink chemical ooze and get preyed on by the others. Some eat the plants. Some suck power out of the machines.

**Rules**

- **Eyeshine is the one tell every creature shares.** It catches the torch as pale green points and says "animal", never what the animal does. A disguised mimic keeps its eyes shut until it moves: its eyeshine is the reveal.
- **Size tiers for isometric view.** *Small* creatures (spiders, under 0.5 m) read by motion and clustered eyeshine, not shape. *Medium* ones (skulker-sized) need a distinct silhouette. *Large* ones (slugs, 3–4 m) fill a corridor, which constrains room templates. *Megafauna* (tree-things) are mostly heard, felt, and glimpsed down pits and shafts. Anything tall **fades or dithers** when it's between the camera and the operative.
- **No lights on creatures.** Glowing markings are emissive only, picked up by bloom (light budget).
- **Warden constructs:** solid dark shells, white light at the seams, deliberate unhurried movement. There's no transparency (it's awkward in three.js and muddy in haze).
- **The skulker is restyled first**, as the template for the family. The rest arrive with the fauna sessions. The ecology (feeding, predation, draining machines) is AI and design work for those sessions; the art bible only sets the look.

## 6. Props: two object languages, and the dead

**Decision:** sparse near the top, cluttered deeper.

- **Expedition kit:** stencils, tape, battered edges, a small yellow stencil mark. Caches, relays, salvage crates and lift beacons all speak this language, so anything interactable made by humans reads at a glance.
- **Warden objects:** seamless, no fasteners, no labels you can read. Dead ones are dark. Live ones carry white light.
- **Supplies are on the dead.** No medkits or rounds lying loose on the floor: they're in the hands or pack of a corpse. Warden salvage (alloy, filament, resin, plates, relic cells) still lies about in piles.
  - *Knock-on:* the loot tables and the `$` markers need a "remains" container type. This is small, but it changes game data.
- **Gore: moderate, fresh and very old.** Old remains are grey bone and a torn suit faded almost to grey, overgrown. Only the living operative is fully yellow. Fresh ones have dark red blood, a body half-held by a gripping plant, drag marks. There's no dismemberment close up.
- **Whose bodies:** both. **Earlier explorers** (the previous human expedition, and whatever creatures kill) are placed by the loot tables. **Your own dead operatives lie where they fell**, in the same campaign layout, with their stencilled names on their suits. Plants that grip eat them slowly (the existing devour system), and they're overgrown more with each run. **If you can get to it, you can loot it.** Weapons, rounds, salvage, relic cells and sealed medkits stay on the body for good. Only perishables go: biological samples, and later any food or organic consumables, are eaten or rot within a run or two. Reaching the body is the real cost: a collapse can cut it off for a run, and a gripping plant that holds it has to be dealt with first. A relic weapon on a dead veteran becomes a reason to send someone back down.
  - At isometric scale, gore reads mostly through **colour and decals**: a dark pool, a smear, a torn suit. Modelled detail won't be visible anyway.
- **Sources:** architecture is procedural. Small props are CC0 meshes (Kenney, Quaternius) **stripped of their textures and given new materials** in our palette. Nothing ships in its kit colours.

## 7. UI: diegetic, with grime at the edges

**Decision:** mostly diegetic in the field, with a thin This War of Mine layer of grime and stencil at the edges. The loud hurt feedback stays, because the playtest asked for it.

- **Field HUD:** only what can't be diegetic: health, torch cell, rounds, pack weight. They're thin, stencilled, and live in a grimed corner strip. The torch cell also shows as beam flicker. The room name appears as a stencil-tape label when you enter a room, then fades.
- **The monologue moves next to the operative** (a trial): short lines projected above them, leaning away from the aim, never covering the aim point. Missed lines can be read back from a **recent thoughts** list in the pause screen or guide.
- **The right-click plant card closes when the operative moves.** You no longer need to right-click again.
- **Field guide: a field notebook.** Charcoal-hatched species illustrations (a hatching pass over the existing portraits), handwritten-style notes, and grime.
- **Base screens: a terminal readout.** IBM Plex Mono, with helmet portraits for the roster.
- **Fonts:** keep IBM Plex Mono and Big Shoulders Stencil.

## Light without lights

This is how everything above fits the light budget (CLAUDE.md rules 8 and 9: the torch, 6 pooled glow lights, 1 suit light, 1 effects flash, and nothing added).

| What you see | How it's made |
|---|---|
| God rays through breaches | Unlit additive shaft geometry, with dust caught in it, plus a **baked** floor pool |
| Flickering facility lights, glowing panels, white strips | Emissive geometry (bloom), plus **baked** light on the floor and walls around them |
| Flicker | The bake stores up to four light groups in the RGBA channels of a per-level light texture; a uniform per group animates flicker at no extra cost |
| Glow plants | The existing 6 pooled glow lights (unchanged) |
| Visor glow | The existing suit light |
| Wet floors | Low roughness in a per-level wetness mask, so the torch lays a streak across puddles. No reflections |
| Creature markings | Emissive only |

**The light bake:** at level build, a pass over the tile grid lays light from each static fixture and breach onto floors and wall faces. It uses the same wall occlusion as the shadow proxies, so **baked light never passes through walls** (rule 9). Cut-away walls change nothing, because the bake uses the full-height walls. This one item unlocks most of the new look.

## Rules

- **Colour is owned.** Every saturated colour belongs to one owner in the colour table. Yellow and white are reserved; the plant palette never deals them.
- **Light must never burn out a surface.** Anything bright that can sit near walls dims with proximity (the torch) or is capped in the bake. That goes for Warden white too.
- **Static light never wakes plants.** Plant senses respond to the torch and flashes only.
- **Decor never uses a species body plan, never trembles, never glows, never speaks.**
- **Scale comes from depth and proportion, not height.** Anything tall fades when it's between the camera and the operative.
- **Human kit reads as human** (stencil, tape, yellow mark). **Warden objects read as Warden** (seamless, white light).
- **Every new layer ships with its own `LayerLook`.**
- **Effects stay unlit geometry or baked light**, never new lights.

## How it's built today (as of the values pass, 0.10.3)

- **The grade** (`render/grade-pass.ts`) is the last pass, after tone mapping. It keeps saturation only for the operative's yellow band and bright emissives (the rest gets the layer's allowance), split-tones (cold darks, faintly warm lights), lifts the blacks, and applies contrast as a power curve pivoting on mid-grey (so darks deepen but are never crushed to black), plus a vignette and luminance-weighted grain.
- **Stone** (`render/baked-light.ts`, injected into the shared stone materials):
  - **Albedo** is mid-to-dark (`LayerLook`), with world-space mottling at 1.5 m and 6 m (±15% albedo, ± roughness). It has no seams and no seed. It stays on top of stage 2's textures to hide their tiling.
  - **Direct light** (torch, glow lights, suit light) eases through a soft knee toward a ceiling (`STONE_LIGHT` in `config.ts`), diffuse and specular separately. Torchlit stone peaks around mid-grey and stays under the bloom threshold; wet gloss comes under the specular ceiling. Baked light is capped separately.
  - **Wall tops** are a cut section: heights wander smoothly at room scale (not per tile), with a few centimetres of jitter. There is no per-tile shade, and a fine noise darkens the top faces. Sunken stubs are broken off at different heights.
- **Darks:** a faint per-layer `fill` rides on the ambient light (no new light) and dims with it (torch off ×0.3, dead ×0.12). The void outside the rooms stays black. Concealed plants take the darker stone's value.
- **Haze:** scene fog in the layer's haze colour; it dims when the torch dies.
- **The torch beam** (`render/beam.ts`): an additive cone with dust noise that stops at the first wall. Slightly warm white.
- **Dust** (`render/spores.ts`): GPU motes, caught bright inside the cone.
- **The torch** dims near walls (`FLASHLIGHT.nearFull` / `nearDim`) for very close range; the stone's shoulder handles faces square-on at a few metres.
- **Contact shade** (`level-builder.ts`): baked gradient decals along wall bases.
- **Layer looks** (`LayerLook` in `src/data/types.ts`, per tier in `src/data/sites`; the works and the Vault have sketches, `worksLook` and `vaultLook`).

## Build list, in order

**How it's ordered:** yes, go top-down by layer, but **shared foundations first**, because every layer uses them. Then each layer is a **vertical slice**, signed off from look screenshots before the next starts. Only layers that exist in play get their full look. The outdoor approach, layer 3 and the Vault get a `LayerLook` sketch now and the full treatment when their content sessions arrive, so there's no polish on places nobody can reach yet.

**Progress:**
- Items 1–4 are done in art slice A (0.10.1, `docs/session_notes/art-slice-a.md`).
- Items 5–6 are done in art slice B (0.10.2, `docs/session_notes/art-slice-b.md`).
- Stage 1, the values pass, is done (0.10.3, `docs/session_notes/values-pass.md`).
- Stage 2a, stone surfaces, water and darks, is done (0.10.4, `docs/session_notes/stage-2a-stone.md`). The brief is `docs/session_notes/stage-2-masonry-brief.md`.
- Stage 2b, the wall kit, is done (0.10.6, `docs/session_notes/stage-2b-kit.md`).
- Stage 3a, the growing slice, is done (0.11.0, `docs/session_notes/stage-3a-growth.md`): item 7 (decor growth, less creeper), item 8 (god rays) and item 12 (hack-through growth), with the plant rebalance.
- 0.11.1 playtest fixes: curtains fit their walls; corridors seen down the aim, walls cut to waist height; growth gathers under the god rays; folded, greener foliage.
- The plant pass is done (0.12.0, `docs/session_notes/plant-pass.md`): one leaf language (a painted leaf atlas, leaf cards, one material) for decor and species; eight body plans; dealt patterns; glow that dims asleep; creepers that move in a wave; a finer grain and moss on the stone.
- Next: the sound pass (recordings: `docs/session_notes/sound-shortlist.md`), then stage 3b, items 9–11; the operative gets a session of its own.

The route in front of the Threshold slice is set out, with its reasons, in `docs/session_notes/values-pass-brief.md`.

**0. Quick wins** (small, do first)
1. The right-click plant card closes when the operative moves.
2. Monologue beside the operative (trial), plus a recent-thoughts list.

**1. Foundations**
3. **Colour ownership:** yellow suit, slightly warm torch, Warden white; the `floraLooks` palette restricted (bodies green and red, glow teal to magenta, rare red and chartreuse; yellow and white reserved); grade retune. Session note on campaign looks changing.
4. **The light bake:** a per-level light texture from static fixtures and breaches, wall-occluded, with 4 flicker groups. `LayerLook` gains the saturation allowance, wetness and decor density.
5. **Water:** the wetness mask and puddle streak, drips (particle, ripple, positional sound), wall runnels, splash footsteps. **Splashing is a noise plants hear**, louder at a run than at a walk (through the existing noise system). Sound recipes via `synth.ts` and `EVENT_SOUNDS`; ambient drip emitters follow the flora-music pattern (events at level build).
6. **The operative:** hard suit, helmet and visor slit, pack, yellow shell; pistol and machete in hand.

**1b. Making the ruin feel real** (inserted from the values pass brief)
- **Stage 1, values:** stone that doesn't glow (lower albedo, mottling, a shoulder on direct light); darks that keep their shape (a faint per-layer fill); wall tops that read as one mass.
- **Stage 2, masonry and materials:**
  - **2a:** stone texture sets (slab, flagstones, rubble) generated by our own script, mapped triplanar and tinted per layer; water that fills the low stone and glints; darks raised.
  - **2b:** a modular wall kit built by scripts in Blender (face panels, corners, pillars, door frames, each with variants), picked per tile from the campaign seed; rubble and grime at the joins.

**2. The breached shell (Threshold): first full slice**
7. **Decor growth:** instanced grass, fern, moss curtain and creeper; sway, never tremble; flattens under the cutaway; shadow rules (small decor casts no torch shadow; nothing sways in the glow-light shadows); halved density on Low quality.
8. **God rays** through shell breaches: shafts, dust, baked pools.
9. **Tight-tunnel room templates** for Threshold.
10. **Etched glyphs:** raking-light decals, noticed when lit.
11. **Expedition props and remains:** the kit language, CC0 re-materialled; corpses carrying medkits and rounds (a loot-table change); fresh and old gore decals. **Your own dead where they fell:** the campaign records where each operative died and what they carried, and perishables drop off run by run. That's a save change (migration, rule 6).
12. **Hack-through growth:** blocking clumps as tiles, quick loud cuts, the machete arc hitting species inside it.

**3. Layer 2, the drowned halls (Interior)**
13. **Heavy growth and puddles** (reusing layer 1's systems at a lower density); **the odd flickering facility light** (bake groups); **occasional dead machinery**, dark, where the slabs start to open; the first oversized fixtures; rising clutter.
14. **Skulker restyle** into the new fauna family, with the eyeshine rule.
15. **Pits and shafts** (a new tile type), built here so layer 3 is ready for them.

**4. Screens**
16. Field HUD pass: grime strip, stencil, room-name tape.
17. Field guide as a notebook: a charcoal hatching pass on the portraits.
18. Helmet portraits (with the roster session).

**5. With their content sessions**
19. **Layer 3, the works** (a new tier): lots of machinery, more working lights and systems, **environmental risks** (a new system; machines are allowed to warn before they hurt), pits and shafts in use.
20. **Layer 4, the Vault:** the running machine, **Warden security** (a new system), monsters, and the white heart.
21. The approach look (when the Surface layer exists).
22. Warden constructs; the fauna family (slugs, spiders, tree-things, grazers); specialisation kit.

**6. Then the look lab:** the tuning panel over the finished look (grade, haze, beam, dust, bloom, bake strength, wetness, decor density per layer), exporting a preset you tune by eye on real hardware.

## Open questions

- **Creatures and hack-through growth:** large creatures push through it and small ones go under; only the operative has to cut. That's my default until the fauna sessions say otherwise.
- **Environmental risks and Warden security:** what they are and do. That's design work for when layers 3 and 4 are built; the art rule (they may warn honestly) is already set.
- **Translucent leaves** and **SSAO:** try them in the plant slice; they're kept only if they earn their frame time.

## Knock-on changes for other docs

- `game_design.md`: four underground layers (Threshold, Interior, a new tier for the works, Vault) plus the outdoor Surface approach; medkits and rounds found on remains; your own dead remain where they fell and can be looted (only perishables go missing); hack-through growth (quick, loud); splashing is noise; environmental risks and Warden security; the operative's colour (yellow, not orange).
- `technical_design.md` §4.3: the light bake; the warm torch colour.
- `CLAUDE.md` rule 10: add "decor never uses a species body plan or trembles", and name the reserved hues.
