# Brief: the plant pass (brought forward, before 3b)

29 September 2026, after Nathan's playtest of 0.11.0. The build list's model pass for plants, brought forward because the playtest showed the plants are the weak point now the ruin looks real.

## What Nathan asked for

- **Greener, fuller foliage:** plants built of leaves with volume, not zero-thickness sheets. 0.11.1 took a first step on the decor (folded leaves, both sides lit, greener, more varied).
- **Blur the line between growth and threat.** At the moment every active species is obvious, so there's no mystery about what's going to come at you. His picks:
  - **One leaf language:** active species are built from the same leaves, palette and fullness as the decor, so they sit in the growth instead of standing out as models.
  - **Some glowing decor:** faint light from harmless growth (glow moss, spore specks, lit fungi), so not every light in the dark is a threat. Emissive only, no new lights (rule 8).
  - **Some species dim when asleep:** a sleeping glow species glows faintly and brightens when it wakes, so asleep it reads more like the growth around it.
  - **Active species marked by colour and pattern, movement and sound:** that's how you learn to tell them apart, not by their being the only models in the room.
- **Plants cluster where the god rays land** (done in 0.11.1 for placement; the look of a lush pool can go further here).

## What it changes

- **Rule 10 (CLAUDE.md), last sentence:** "Decor growth never uses a species body plan, never trembles, never glows and never speaks" becomes something like: decor never trembles and never speaks; it may glow faintly (never a light); species are built from the decor's leaf kit, and what marks them out is dealt per campaign (colour, pattern), plus the mood tells shared by every species. Looks still never give behaviour away.
- **Awake glow plants look different:** a known gap (glow materials are shared per species) closes. That needs per-cluster glow intensity, driven from `flora_mood_changed` in the view.
- **`floraLooks`:** body plans rebuilt from shared leaf, stem and bulb parts (`render/flora-models.ts`), keeping the per-campaign dealing.
- **The glow-plant burn-out** in the torch up close (a known gap): plants get the decor's light shoulder on arriving light.

## Questions to settle before building

- How many decor glow kinds, and in which layers? (A guess: glow moss and spore specks in the Threshold, more in the Interior.)
- Which species dim when asleep: all glow species, or a dealt subset per campaign? (Dealt keeps it a thing you learn.)
- Pattern marks: stripes, spots or veins in the leaf colour, dealt per species per campaign?
