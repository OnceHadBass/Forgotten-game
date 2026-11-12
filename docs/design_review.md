# Design review: Forgotten (November 2026)

A review of `game_design.md` and the roadmap in `technical_design.md` §7 against the pitch as Nathan now states it:

> Diablo's isometric hack-and-slash and looting (a nod to Fallout and Borderlands), the ruin exploration of Fallout and Elder Scrolls, the weird living worlds of *Annihilation* and Adrian Tchaikovsky, and the base building and research of XCOM. Fun in the moment; creepy and challenging; surprising, alive and mysterious; the player an explorer, rewarded with adapted plant pieces, human upgrades and relics of great power; the base a fight against the world, time and hope.

Proposals are numbered so they can be accepted, changed or struck one at a time. Nothing here has been applied to the design doc.

## Verdict

The living-world half of the pitch is already the best thing in the design, and it is built: plants with dealt looks and voices, earned knowledge, moods, noise chains, a torch that matters. That is rarer and harder than anything still to come.

The other half (loot, riches, the base, hope) exists only as lists. And the lists are long: six weapon archetypes in three tiers with mods, eight experimental weapons, fifteen relics, three armour tiers with mods, eleven augments, three drones, seven specialisations, ten traits. None of it is playable, and the roadmap doesn't reach any of it until Session 13, relics until Session 23.

So the three biggest findings are:

1. **The pitch and the design doc disagree about power**, and that has to be settled first (§1).
2. **There is no loot yet, only freight.** What you carry out is alloy by the kilo, and nothing uses it. The reward pillar needs a thin, playable slice long before Session 20 (§2).
3. **The campaign's tension isn't playable until Session 16.** Roster, encroachment and the base are where "time and hope" live; twelve sessions have gone on the ruin and none on them. Build a thin whole campaign next, then deepen (§7).

## 1. The one real decision: how loud is this game?

The design doc says: *"The tone is cautious, dark and solitary. When a system pulls toward loud power fantasy, it loses."* The pitch now opens with Diablo and Borderlands. Those pull in opposite directions, and recent playtests show it: the 0.11.0 rebalance (machete fatigue, shorter reach, tougher plants) was the design defending caution against the player's wish to hack.

I'd not resolve it by picking a side. I'd change the rule:

**P1. Loud power isn't forbidden; it costs.** The noise economy already prices every action. Keep the quiet game as the default and make power a thing you *spend*: the relic that clears a room also wakes the floor below; the burner that saves you lights up every light-sensitive thing in sight. The fantasy is not "I mow down hordes" but "I let it off the leash, once, and now I have ninety seconds to get out". That keeps the dread and gives the release that restraint needs. Rewrite the tone line as: *when power is free, the game loses.*

**P2. Take Diablo's itch, not its hordes.** What transfers: the drop you didn't expect, the item you can use *now*, the crunch of a blow landing, greed pulling you one room further. What doesn't: crowds of fodder. A ruin where forty things die per room is not creepy, and the plant sim can't express it.

## 2. Riches: turn the haul into loot

Today's haul is materials, and everything good happens later, at a base that doesn't exist. Diablo's loop works because the drop changes the *next minute*.

**P3. Three strands with three characters.** The pitch names them; make them feel different and stop them competing:

- **Human kit: small, dull, dependable.** Cut the fabricated arsenal to about five weapons, one upgrade step each, no mod system. It is the floor you stand on, not the reward.
- **Plant pieces: alive, strange, temporary** (P4).
- **Relics: powerful, not understood, irreplaceable** (P5).

This is a big scope cut (most of "Weapons: Three Tiers" and "Armour modifications") and it sharpens the identity: power on this planet is never human.

**P4. Grafts: a cut piece keeps its behaviour.** A species is already a set of behaviour components. Let a harvested part carry *one* of them for a while as a usable item: a tattler bulb thrown down a corridor is a decoy that shrieks; a lantern reed pod is a light that isn't your torch; tar creeper gum is a snare; ember lace wakes a room on purpose. Rules:

- You can only harvest what the field guide *knows* the plant does (rule 14 becomes the crafting gate: knowledge is literally power).
- Pieces die: minutes in the pack, longer if the base learns to keep them. No stockpiling.
- Looks are dealt per campaign, so each campaign's toolkit is rediscovered.
- Data only: an item type pointing at a behaviour component (rules 1 and 2 hold).

This makes the game's best system its loot system, gives in-run rewards at once, and delivers "alien plant pieces, adapted for use" without waiting for synthesis trees. Base synthesis later becomes "keep this alive and make it last", not a second recipe list.

**P5. Relics are dealt and unknown, like plants.** The design's "mystery items" are a footnote; make them the rule. A Warden device's form says nothing about its function, which is dealt per campaign. You learn it by using it in the field (fast, dangerous) or researching it at base (slow, costs days and so encroachment). That is *Roadside Picnic* exactly, and it extends rule 14 to a second domain. A fixed list of fifteen named relics will be known from a wiki in a week; fifteen functions dealt across unknown bodies won't.

**P6. White light is the legendary drop.** Colour is owned: Warden white is reserved and dead in the Threshold. So a live relic should be the only white light in the ruin, seen down a corridor, through a doorway, under growth. No rarity colours, no beam of light from the sky: the art direction already built the signal.

**P7. Loot as bait.** A salvage pile that is the lure of something (the room-sized pitcher trap, a false floor) is the mimic chest done as ecology. Rare, and never the same lure twice in a campaign.

## 3. Fun in the moment

The verbs today are walk, shine, listen, scan, cut, shoot, and most of the skill is in *not* doing them. That's the right base, with three gaps.

**P8. Give the escape its own tools.** When a room wakes, running is the action peak of the game, and there's nothing to do in it but hold sprint. Add: doors you can shut behind you (and that things then work at), a shove to break a grip, a flare thrown one way while you go the other. Cheap, and it makes going wrong fun instead of just costly.

**P9. Fight with the ecosystem.** The skulker is already hurt by plants. Build on it until it's the main way to win a fight: lead a hunter through needle fans, wake a tattler to pull a creature off you, feed a corpse to a gorge vine to block a corridor. Every such trick is a story the player tells afterwards. Grafts (P4) are the pocket version.

**P10. More things that move, sooner.** One creature after twelve sessions; the fauna pool is Session 19. A hack-and-slash nod needs things worth hitting. Bring three forward, each a different question: one that hunts by sound, one that only moves unlit (P17), one harmless that other things eat (P12).

**P11. A clock inside the run.** Cautious games tempt players into tedium: creep, scan everything, never be surprised. Exposure from time below is in the design but not built. Build it early and make it legible, so "one more room" is always a wager.

## 4. A world that is alive without you

At present almost everything a plant does is a response to the operative. "Alive" means things happen that you didn't cause.

**P12. A small food web.** Three or four relationships are enough: a grazer that eats glow plants (and so darkens rooms), a plant that hunts the grazer, corpses eaten (built), a pollinator that carries a wake signal from cluster to cluster. Let them run when the player isn't looking and let the player *hear* them: a scream two rooms away that had nothing to do with you is worth more than any scripted scare.

**P13. The ruin remembers.** What you cut stays cut for some runs; what fed, grew; the corridor you always use is the one that's overgrown next time, by species suited to how you travel (sprinters meet listeners, torch-users meet heliotropes). The design lists "memory-of-paths growth"; promote it from a primitive to the rule for how a site changes between runs. This is the Tchaikovsky note: the world adapts to the thing studying it. (Site state is a save change: rule 6.)

**P14. The surprise budget.** The design says fear belongs to the first encounter, and it's right. But with 14–20 species the first encounters are spent in about three hours of a twelve-hour campaign. Unknowns must renew:

- **Chimeras below the Threshold.** *Alien Clay*'s idea, and the ECS is built for it: deeper down, bodies carry organs from two known species. The guide says "part of this is a needle fan". Old knowledge helps and isn't enough.
- **Life stages.** Shoot, mature, ancient: the ancient form of a known species does something its entry doesn't mention.
- **Pulse phases rewrite entries.** In Strain, one sense you've learned is wrong. The guide marks what it no longer trusts.

**P15. Silence.** The plants are the soundtrack, so a room where nothing sings is the cheapest horror available. Use it for what has been stripped bare, and for a room that is holding still.

## 5. The explorer

**P16. Reading the walls.** Glyph readings are already salvage. Make Warden literacy the explorer's progression, a second field guide: signs that were always on the walls become legible over a campaign (*hazard*, *stores*, *do not wake*), so old rooms give up new secrets and the ruin itself becomes a text. This is the Elder Scrolls pleasure of a place that rewards attention, and it costs lore writing rather than systems.

Also, smaller:

- **Let the player rename a species** on first sight. One text field; it turns a generated name into *their* discovery.
- **The map is drawn, not given.** Surveyed rooms are a deliverable the base wants.
- **Firsts are marked**: deepest point, first live relic, first sight of the Deep.
- **Your own dead** (planned for stage 3b): do it, and let the ruin have had time with them. Yellow is the operative's colour alone, so yellow inside green growth can only mean one thing.
- **Set-piece rooms**, a few per site, hand-made, where the camera pulls back: the scale of what the Wardens built should be seen at least once per layer.

## 6. Wonders and horrors

A starter set, each built mostly from systems that exist. The design's "strange species" list (hand-flora, cooperators, the Followed) stands; these add set-pieces.

**Wonders**

- **The Pulse passing.** Once in a run, every glowing plant flares in a wave that crosses the level from one direction. It points at the heart. Nobody explains it.
- **The choir room.** One spot, torch off, where the room's voices resolve into a chord. Something opens to it.
- **The tended garden.** Rows of sleeping, harmless plants and a construct that tends them. Until you cut one.
- **A machine still running.** No use, no loot. It has been doing this for longer than there have been humans.
- **Sky.** One breach wide enough for weather. The only real colour for an hour.
- **Something vast going by.** Dust falls, every plant goes quiet. You never see it, only where it's been.

**Horrors**

- **P17. The thing that moves when unlit.** Frozen in the beam, closing when the cone turns away or the cell dies. The torch is the game's signature and scanning drains it; this creature is that whole economy with teeth.
- **The voice that plays back.** "Sound mimicry" made specific: it repeats your footsteps a room behind, the winch of a lift you didn't call, the last line of an operative who died here.
- **The suit that stands.** A dead operative, upright, worn by a vine.
- **The cache with something added.** Not robbed. Something left in it.
- **The room that is an inside.** Cut the wall and it isn't stone.
- **The plant in the shape of what died in it.**

Budget them: one wonder and one horror a layer at most, several never seen in a given campaign. Scarcity is what keeps them from becoming content.

## 7. The base: the world, time and hope

A containment meter that goes up is not a fight. XCOM's base works because loss is spatial, personal and visible.

**P18. Encroachment takes rooms, not points.** The base is a small map of modules; growth takes them one at a time and you lose what they did (no Surgery until it's cleared). You see the edge moving.

**P19. The same plants, at home.** What reaches the perimeter are the species you've met, with this campaign's looks and voices, and the base can only counter what the field guide understands. Field knowledge becomes the defence manual, which gives every sample a second reason. Now and then a breach is *played*: your own corridors, machete in hand, with the level tech that exists.

**P20. Everyone has a job.** The 25 are not a lives counter: those not deployed staff the lab, the perimeter, the infirmary. Sending your best biologist down stalls the research; keeping her safe stalls the ruin.

**P21. Hope is carried by wonders.** The pitch says "against time and hope", and the design has no hope in it. Don't add a third bar: show it through people (the board in the mess, who volunteers, who stops turning up, who walks out into the Overgrowth one night). Deaths, lost rooms and long waits wear it down. What lifts it is what the explorer brings back that *isn't* useful: a living lantern reed for the mess, a translated Warden lullaby, a view of the sky. That gives a reason to seek wonders that isn't loot, and ties the two halves of the game together.

**P22. Each campaign is an expedition that will be forgotten.** This is what the title is for. The Wardens followed the signal; the earlier humans followed it; so did you. When a campaign fails, the next one finds its base as a ruin site: the memorial wall, a cache, a log in a hand the player recognises. The design's "previous human expedition survivors" and "fragments that reference the player's own campaign" become literal. It's the roguelite meta-loop told as fiction, and it softens losing a twelve-hour campaign without carrying power across. (Needs a small cross-campaign ledger outside the save slots.)

**P23. Optional, and it changes the story: the growth is the containment.** Not a planet-mind: an immune response the Wardens bred or recruited. Encroachment is the system digesting a foreign body, the base. Then every herbicide charge weakens the thing keeping the Vault shut, solo passage has its reason, and the three endings stop being a menu and become the consequence of how you defended yourself. Worth an afternoon's thought before the base is built, because it decides what Defence research *means*.

## 8. Order of work

The roadmap is content-first: Phases 4–9 each add a system in depth. I'd go breadth-first for one pass.

1. **A thin whole campaign** (replaces Sessions 11–17 as first pass): a base of three rooms, eight named operatives with jobs, encroachment that takes rooms, days that pass, one use for the haul, both failure states. Two hours, start to defeat. Find out whether the outer loop is a game.
2. **The loot slice:** grafts (P4), one dealt relic (P5, P6), one human upgrade.
3. **Movers:** three creatures (P10, P17) and the escape tools (P8).
4. **Renewal:** site memory and chimeras (P13, P14).
5. Then deepen whichever of these the playtests say is carrying the game, and add the Pulse, augments and drones only if something is missing without them.

The sound pass and stage 3b, already queued, don't conflict with this; 3b's "your own dead" belongs with item 1's save change.

## 9. What I'd cut or park

- Fabricated weapon tiers T2/T3, the archetype list and weapon mods (P3)
- Armour mods; fold augments to five or six that change how you play, not stats
- Day/night launch choice on the surface, until there is a surface
- Supply drops and dispensers until a playtest shows deep runs need them
- Phase Veils, Mirror Pools and the Sink as *biomes*; keep each as a single wonder

## Decisions for Nathan

1. **P1:** is "loud power costs" the rule, replacing "loud power loses"?
2. **P3:** cut the human arsenal to a small dependable kit, with power living in plants and relics?
3. **P22 / P23:** are failed campaigns found by the next one, and is the growth the containment? Both shape saves and lore, so they're cheaper to decide now.
4. **§8:** thin whole campaign before more depth?
