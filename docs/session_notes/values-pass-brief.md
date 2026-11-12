# Making the ruin feel real: the route, and the values pass brief (0.10.3)

This note sets out three stages that sit in front of the Threshold slice, why they come in this order, and a full brief for the first. Stages 2 and 3 get their own briefs when they're reached.

Confirm scope with Nathan before writing code, as usual.

## Where we are

Playtest screenshots from 28 Sept (add them to this folder as `values-pass-before-1.png` and `values-pass-before-2.png`) look OK but simple: the ruin doesn't yet feel like a real place. Looking at them closely, the problem isn't mainly missing content. It's what the world is made of and how light sits on it:

- **Everything reads as a clay render.** Walls, floor and pillars are single flat colours with smooth gradients, so the torch slides across them like light on plastic. The pillars read as painted card, not stone.
- **Torchlit stone burns out.** A wall face square-on to the beam becomes a white lightbox, which breaks the art bible's rule that light never burns out a surface.
- **Darks are dead black.** Outside the beam, forms vanish instead of receding.
- **The grid shows.** Wall tops appear as a checkerboard of black diamonds, the most visible structure on screen, and every wall is the same clean box.
- **Nothing gives scale.** There's no object of known size, so the operative could be 2 m or 20 cm tall.
- **The plants look like programmer art** (stick-and-ball forms). That's outside this route; see "Not in this route".

The Threshold slice as planned (decor, god rays, tunnels, glyphs, props and remains, hack-through) adds density, history and scale. On its own, though, it would drape growth over boxes, and it would still look like growth draped over boxes.

## The route

**Stage 1: Values.** Make the existing geometry sit in believable light: stone that doesn't glow, darks with faint shape, and a cut that reads as one mass. It's small and quick, and it changes no systems. Full brief below.

**Stage 2: Masonry and materials.** Give the world a surface and break the grid: real stone textures with normal and roughness maps, and a modular wall kit with variants, built in Blender. This is the stage that makes the ruin feel solid.

**Stage 3: The Threshold slice**, as in the art bible (items 7–12), on top of the new stone.

### Why this order

**Values before materials**, because you can't judge a material under broken light. While torchlit stone clips to white, a normal map has nothing to show, and textures tuned against burnt-out surfaces would have to be retuned. Stage 1 is also the cheapest stage, and it's likely the single biggest visible improvement per hour spent.

**Materials before content**, because everything else sits on the stone. Decor, props, remains and glyphs are all seen against walls and floors. If the stone reads as plastic, no amount of dressing makes the place real. Doing it the other way round would also mean re-checking every piece of content once the stone changed. The etched glyphs (item 10) in particular depend on raking light across a surface with normal detail, which only exists after stage 2.

**Content last, where it adds the most.** Stage 3 is what supplies scale and story. It lands best once the world under it is convincing.

**Each stage is signed off from look screenshots before the next starts,** as the art bible already asks. Headless screenshots render on the CPU, so Nathan signs off on a real GPU.

## Stage 1: Values pass (full brief)

Aim for a day's work at most. It adds no new systems and no new lights (rule 8), and makes no save change (rule 6).

### 1a. Stone that doesn't glow

**Albedo.** Lower the shared stone materials' base colour and narrow its range. Real damp stone is mid-to-dark. The target is that torchlit stone at 3 m peaks around mid-grey in the final frame (after tone mapping and the grade), never white.

**Macro variation.** In the shared stone materials (where `onBeforeCompile` already injects the bake and the water map), add low-frequency world-space noise to albedo (about ±15%) and roughness. Use two octaves at roughly 1.5 m and 6 m scale. It's world-space, so it needs no seed and has no seams across tiles. Keep it deliberately: in stage 2 this mottling stays on top of the textures to hide their tiling.

**A shoulder on direct light.** In the same injection, after `#include <lights_fragment_end>`, compress `reflectedLight.directDiffuse` and `directSpecular` with a soft knee towards a ceiling. That covers the torch, the glow lights and the suit light in one place. Baked light is already capped. The knee and ceiling go in `src/core/config.ts` (e.g. a `STONE_LIGHT` block), not inline. Keep the existing near-wall dimming (`FLASHLIGHT.nearFull` / `nearDim`): it handles very close range, while the shoulder handles faces square-on at a few metres.

**The white streaks** in the second screenshot (vertical glowing lines between the pillars) are probably wall runnels' gloss catching the torch, or dust in the beam. Find out which, and bring it under the same ceiling.

**Bloom.** After the cap, torchlit stone must stay below the bloom threshold. Only emissives bloom.

### 1b. Darks that keep their shape

Add a faint fill per layer: a `fill` colour and intensity in `LayerLook`, applied to the existing hemisphere/ambient light. Also review the grade's black lift and toe in `render/grade-pass.ts`.

**Constraints:**

- The fill scales with the existing torch-state multipliers (off ×0.6, dead ×0.12), so a dead torch still drops the world to near black. The dark is where you listen.
- The target is that a wall edge 8 m outside the beam is just readable on an ordinary monitor. The void outside the rooms stays black, so rooms still float in it (Stasis).
- It must not give camouflaged species away. A camouflaged plant 4 m outside the beam should be as hard to spot as it is today. Check this in the look shots, because the design depends on it ("you only notice what you can see").
- No new light (rule 8). Plant light senses read the torch only, so the fill never wakes anything.

### 1c. The cut reads as one mass

First find out what draws the diamond edges on wall tops. Candidates: per-instance shading differences, small gaps between instances, contact-shade decals, bevels catching the suit light.

Then make adjacent tops read as one continuous cut section: the same value, no seams, and a faint step lighter than the void so the mass has an edge. Sunken stubs should read as broken tops rather than flat black tiles. Small seeded per-tile height jitter (5–10 cm) or noise on the top faces in the shader is enough for now; the real broken-wall kit is stage 2.

Shadow proxies (rule 9) don't change.

### 1d. Tuning lives in data

New numbers go in `config.ts` or `LayerLook`. Threshold and Interior get tuned values; the works and Vault get sketches (every layer ships with its own `LayerLook`). Update the "How it's built today" section of `docs/art_direction.md`.

### Checks

- **Unit:** `npm run check`. Extend any `LayerLook` validation for the new field.
- **Smoke:** add brightness measurements with `project(x, z)`. A torchlit wall face square-on at 1 m, 3 m and 6 m stays below the ceiling, and a floor point 8 m outside the beam is above pure black with the torch on. The existing checks for a dead torch, glow through walls and torch through walls must still pass.
- **Look:** run `node e2e/look.mjs` before and after, with the same seeds, and save the pairs side by side in `e2e/screenshots/look/`.

### Out of scope for stage 1

Stone textures, the wall kit, decor growth, props, plant models, and any bloom rework beyond keeping stone under the threshold.

### Stage 1 done means

- [ ] No stone surface burns white under the torch at any range
- [ ] The torch pool shows mottling, not a smooth gradient
- [ ] Darks hold faint shape with the torch on; a dead torch is still near black
- [ ] Camouflaged plants outside the beam are no easier to spot
- [ ] Wall tops read as one mass, not a checkerboard
- [ ] All tuning is in `config.ts` / `LayerLook`; the art bible is updated
- [ ] Smoke test passes with the new brightness checks; look shots before and after are saved
- [ ] Commit `art: values pass`, version 0.10.3; update Current State in `CLAUDE.md`

## Stage 2: Masonry and materials (outline)

A full brief is written after stage 1 is signed off, because stage 1's look shots will show how much stage 2 needs to do.

**Stone with a surface.** Use CC0 stone texture sets from ambientCG or Poly Haven. Map them triplanar, so the procedural geometry needs no UVs. Desaturate and tint them into each layer's palette (Threshold dark blue-green slab, Interior grey-green). Normal and roughness maps matter more than colour: they're what make the torch rake across stone. The existing water map darkens and glosses them as it does today, and stage 1's macro mottling sits on top to hide the tiling. Add a texture budget with sizes halved on Low quality, and record every licence for the credits (technical design §9, item 6).

**Walls that aren't boxes.** Build a modular kit in Blender: straight, corner, end, pillar and door frame, each with variants (intact, chamfered, spalled corners, cracked, collapsed top). Build the pieces from scripts in `tools/blender/`, run headless, which export `.glb` files and render previews, so the kit is reproducible and committed. Variants are picked per tile from the campaign seed, so a campaign's ruin looks the same from run to run.

- Pieces stay inside their tile's footprint, so collision and pathfinding don't change.
- The full-height shadow proxies stay authoritative (rule 9). A collapsed top may show a gap, but light never passes the proxy.
- Pieces are drawn as one `InstancedMesh` per variant, so the cutaway still sinks them per instance. The variant count is limited to stay within the ~300 draw-call budget.

**Joins that aren't clean.** Rubble and grime along wall bases, uneven floor slabs (visual only; the walkable surface doesn't change), and crack decals.

## Stage 3: The Threshold slice

As in the art bible, items 7–12: decor growth, god rays, tight-tunnel templates, etched glyphs, expedition props and remains, and hack-through growth. It needs no changes other than coming after stages 1 and 2. Props and remains are where the ruin finally gets objects of known size.

## Not in this route

**Plant models.** The species' stick-and-ball forms will drag the image down once the stone improves. They need their own pass (the "plant slice" the art bible defers translucency to). Schedule it after stage 3, or bring it forward if stage 2's shots make the plants look out of place.

## Knock-on changes to other docs

- **`docs/art_direction.md`:** insert stages 1 and 2 into the build list before item 7 and update the progress line. In the references table, Stasis's "painted texture detail" moves from *Leave* to *Take* as surface detail (texture and wear, not hand-painted). That reverses an earlier call.
- **`CLAUDE.md` Current State:** "Next planned" becomes the values pass, then masonry and materials, then the Threshold slice.
