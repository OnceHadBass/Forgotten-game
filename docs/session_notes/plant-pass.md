# The plant pass

29 September 2026. Version 0.12.0. No save change and no new lights. The brief is `plant-pass-brief.md`.

## Nathan's notes on 0.11.1

- Everything still lacks texture: plants most (especially the active ones); the walls have shape but feel too smooth; the operative feels generic (a session of its own later).
- Foliage better, but it should look like the real thing.
- Thickets need to be taller, so you know they block the way.
- Active plants need to be more impressive: they were blocky, "a bunch of green spikes".
- Plant movement should be organic: shrink in one spot and grow in the next, a wave, not a block that wobbles along. Spreading shouldn't just pop in.
- Sound is too synthy: that's the next pass, from recordings he's gathering (`sound-shortlist.md`).

**His choices:**
- textured leaf cards;
- recordings plus synthesis for sound;
- plants first, then sound.

## The leaf atlas

`tools/textures/leaves.py` (numpy/scipy, fixed seeds, ours outright): a 4 × 4 atlas of 256 px tiles in three 1024 px WebP images.

- **Leaves:** broad, palmate, serrated, frilled.
- **Fronds and blades:** fern frond, grass tuft, strap, hanging moss, spiky, feathered plume, petal, tendril.
- **Clusters:** leaflets.
- **Wrapping, opaque tiles:** bark, fleshy skin, blistered skin.

What each leaf carries:
- a midrib and secondary veins (parallel ones for straps and grass);
- a pillowed blade;
- browned, bitten, torn edges;
- blotches, speckle, yellowing and red flushes.

The three images:
- **Albedo:** detail around mid-grey, so the plant's own colour comes from its material. Alpha is the cut-out.
- **Mask:** veins, bands, spots and rim, for dealt patterns and glowing veins.
- **Normal map.**

The cut-out area is bled with the nearest leaf colour, so mipmaps don't fringe dark. `--preview` writes a tinted contact sheet; `--check` regenerates in memory and compares.

## The foliage kit

`render/foliage.ts`: one language for decor and species.

**Geometry:**
- `card`: a leaf on a bending spine, arching, drooping and twisting, folded along its midrib, mapped to one tile. `cardTip` says where its tip lands.
- `stem`: a tube along a path, with parallel-transported rings.
- `lathe` and `pod`: lumpy bodies of revolution.

**The one material:**
- the atlas as detail, with an alpha cut-out and the leaf normal map;
- both faces lit as the upper face;
- a soft ceiling on the light arriving (`DECOR_LIGHT`);
- waxy, never glossy, specular;
- dealt pattern colour from the mask;
- glowing veins.

Decor adds a slow sway and lies down on the camera side of the operative. Species cast torch shadows through an alpha-tested depth material, so their shadows are leaf-shaped, not card-shaped.

## Decor

Rebuilt from cards:
- grass (crossed cards);
- ferns (arching fronds, with young ones in the middle);
- a new broad-leaved understorey on short stalks, along walls and in daylight;
- moss curtains;
- thickets.

**Thickets:** now about 2 m tall. They're straps standing up, fronds arching over, and broad leaves crowding the base, so you can't see through. The first version had a smooth dark "heart", which showed as a pale egg in the torch, so it's gone.

## Species

Eight body plans, all from the kit, 1.9× scale (was 1.55):

| Plan | What it is |
|---|---|
| **reeds** | straps in a fan, seed stalks with plumes |
| **fan** | a rosette of big lobed leaves round a bud |
| **pods** | fleshy pods in bracts |
| **mat** | a creeping mat of leaflets, tendril runners |
| **spire** | a stem with leaves spiralling up it, a frond crown |
| **pitcher** (new) | flared tubes with lids |
| **crown** (new) | a trunk and an arching crown of fronds |
| **bramble** (new) | arching thorny canes |

Each species gets three shape variants per campaign, as before.

**Dealt per campaign** (`FloraLook`):
- colour: a body lightness in the decor's range, so brightness doesn't mark a species out;
- a pattern: which of veins, bands, spots or rim carry a second colour, and what colour;
- `dimAsleep` for glow species.

Twins copy their original's marks. Accents are now a deep red or an acid green (the old chartreuse was too close to the suit's yellow).

**Glow:**
- Glow species get their own materials per plant.
- A plant dealt `dimAsleep` glows at 18% asleep and brightens as it wakes. Its cluster's glow light follows (the mean of its plants' levels).
- Spent plants fade out.
- The veins glow faintly and the bulbs strongly.

**The colour fix (the biggest single change in how it looks):** three's `Color.setHSL` works in linear space by default. Every plant and decor colour was about three times the stone's brightness, so under the torch everything green went cream. They're now specified in sRGB, like the stone's hex colours. Concealed species were retuned to match: camouflage contrast 5.3 levels of 255 at the look seed (4.1 at the values pass).

## Movement

- **Creepers move in a wave** (`CREEP_VIEW` in `systems/view.ts`). Every 0.7 m a creeper re-roots:
  - a copy stays where it was, slumps, shrinks and sinks away over 1.6 s;
  - the plant regrows from 30% where it now stands, height first, spread following.

  The old wobble is now a slow strain toward where it's going. Rolling burrs still roll.
- **Shoots grow in** from nothing over 1.8 s and unfurl, where they used to pop in.

## Stone

- **A finer grain close up:** the same surface and normal textures at 3.7× the scale, shifted, add tone and relief (`STONE_SURFACE.detail`).
- **Moss and grime** gather in the joins and pits and along the foot of walls (`STONE_SURFACE.moss`).

## Checks

- **Unit:** 277 tests. New ones:
  - the leaf kit (a card stays inside its tile; the tip is where `cardTip` says; parts merge);
  - dealt marks (every species patterned per campaign, twins copying, never yellow or white).
- **Smoke:** 124 checks, all passing.
- **`e2e/plants.mjs`** (new): every species of the look seed, torchlit and zoomed in, plus a heliotrope crawling and a shoot growing in. It writes `e2e/screenshots/plants/`; compose the contact sheet with PIL.
- **Look:** 158 draw calls, about 198k triangles.

## Not done from the brief

- **Glowing decor:** faint lit moss and spore specks. It fits the same material (the glow-veins term, per instance); next time.
- **Glow lights and voices of creepers** still stay where the cluster grew (a known gap).

## For Nathan on a real GPU

- Do the plants read as plants now, and do the species stand out by their marks rather than by being drawn differently?
- Thickets: tall enough to read as a wall of growth?
- A creeper on the move: does the wave read?
- Walls up close: is the finer grain and the moss in the joins enough texture?

## 0.12.1: playtest fixes (29 Sept)

Nathan's notes on 0.12.0:
- much more atmospheric;
- active plants pop in when they wake (asleep and incognito, then suddenly there and glowing): it needs a coming-alive animation;
- being stung to death by something asleep until you touched it feels punitive;
- saturation up a little;
- some plants should be easy to see (colour, shape or movement), some hidden;
- thickets and tall foliage pop up and down like the walls: they should stay, and it's fine for the operative to be hidden in them;
- the foliage is almost all green, and should look more alien.

He also asked for a script to bulk-download the sound recordings.

**Waking takes a moment** (`FLORA_MOOD.stir`, 1.4 s):
- `wake()` makes the plant alert at once: the event, the voice, the guide, the view.
- Its alert behaviours are applied only when the stir runs out (`takeHold`), and a trigger-on-wake fires only then.
- Step back while it stirs and it never reaches you (unit test).
- Settling cancels a stir.
- Tests about other things run with the stir at 0 (which applies at once, as before).

**Set off while stirring** (`provoke`): shots, probes and samples trigger a plant at once and, if it's still stirring, again as its alert behaviours take hold (a probed puffcap still goes off).

**Young shoots** (`FLORA_MOOD.youth`, 3 s): a spread shoot grows in and can't be woken until it's grown. The spreading snare Nathan met could put shoots round his feet that woke at once.

**The glow comes alive:**
- A plant's light rises over the stir with a guttering flicker (`lit`, eased up at 1.1/s, down at 0.5/s), and blooms once fully awake.
- Each plant now drives its own glow materials in `animateWorld` (pulse × level); the glow pool drives only the lights.
- `e2e/plants.mjs` captures a glowing plant waking (`wakePlant` on the debug handle).

**Colour:**
- Species saturation is 0.4–0.65 (was 0.3–0.55).
- Body hues now include teal-blues, violets and rust as well as greens and deep reds.
- One or two species per campaign are dealt **vivid** (saturation 0.7–0.85, lighter, strong marks); twins of a vivid species are vivid too.
- Accents are darker, so an acid-green tip no longer blooms like glow.
- Decor colour comes in seeded regions (`regions`, 9 m value noise) of six families: green (the most), teal, violet, wine, rust, blue-grey.
  - A fifth of plants take a random family.
  - Grass leans green.

**Tall growth stays standing:** ferns, understorey and thickets no longer lie down on the camera side of the operative.

**Sound:** `tools/sounds/fetch_freesound.py` (standard-library Python) searches Freesound for every shortlist term:
- CC0 only;
- most downloaded first;
- five per term, into one folder per section;
- a `credits.csv` of every file;
- runs again skip what's already there.

Previews (OGG, about 190 kbps) need only an API key. `--originals` walks through the one-off OAuth2 login for the uploaded WAVs. Tested against a mocked API; it can't reach Freesound from here. Nathan doubts it will work for him, so how to source the recordings is the next conversation.

**Checks:** 282 unit tests (the stir, provoking through it, young shoots, vivid species, colour regions); smoke test 124 checks, all passing. Smoke checks of awake behaviour now wait out the stir (`STIR_STEPS`), and the glow-through-wall check uses a source with no members (a real cluster may be dimmed asleep).
