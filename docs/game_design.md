# Project Brief: Forgotten

## Vision

An isometric tactical exploration roguelite set on a hostile alien world, played in the browser. An expedition followed an anomalous signal across deep space and lost their ship on arrival. The survivors hold a small, encroached base while the planet's ecosystem slowly digests them. Each mission is a cautious descent into the layered ruins of an earlier civilisation who came here for the same reason — investigators who built vast infrastructure around something at the planet's heart, and either finished their work or didn't.

The feel sits between *Alien Breed*, *Space Hulk*, *Stalker*, *Subnautica*, and *XCOM*, with thematic atmosphere borrowed from *Annihilation*, *Roadside Picnic*, *Solaris*, and *Blame!*.

The tone is cautious, dark and solitary. Power is allowed and never free: when power is free, the game loses.

## Decisions of November 2026

Taken after the design review (`design_review.md`), with Nathan's go-ahead to decide. Where these disagree with older sections below, these win. A playable prototype of the campaign built on them is in `prototypes/campaign/`.

**1. Loud power costs.** The old rule was "when a system pulls toward loud power fantasy, it loses". The rule is now: *when power is free, the game loses.* The quiet game is the default. Power is something you spend, and the bill is noise, light, sickness or the Pulse. The relic that clears a room also changes the pitch of something far below.

**2. Three strands of reward, three characters.**

- **Human kit is small, dull and dependable.** About five weapons with one upgrade step each, no mod system, plus medkits, probes, cells and rounds. It is the floor you stand on, never the prize. The fabricated tiers T2/T3, the archetype list and weapon and armour mods are cut.
- **Plant pieces are alive, strange and temporary.** A piece cut from a plant keeps one of the plant's behaviours for a while as a usable item (a *graft*): a shrieker bulb is a decoy, creeper gum seals a door, a light pod is a light that is not your torch. You can only harvest what the field guide knows the plant does, so knowledge is the crafting gate. Grafts die when the run ends unless the lab has studied the species, after which the base can culture them. Looks are dealt per campaign, so each campaign's toolkit is rediscovered. Base synthesis becomes "keep it alive", not a second recipe list.
- **Relics are powerful, not understood and irreplaceable.** A relic's form says nothing about its function, which is dealt per campaign. You learn what it does by using it below (fast, dangerous) or on the lab bench (slow, costs days). A live relic is the only white light in the ruin: Warden white is the legendary drop. A relic carried by someone who dies stays with the body until someone goes and gets it.

**3. The surprise budget.** First encounters are where the fear lives, and a fixed pool is spent in a few hours. Unknowns renew: below the Threshold, bodies carry an organ from a second species and wake to what either part senses (chimeras); the ruin's growth shifts towards species that mind how you usually travel; a high Pulse has everything sleeping lightly.

**4. The base is a place, and its people have jobs.** Encroachment takes modules, not points: lose the lab and there is no research until someone clears it with a blade. Lost modules let the growth through to Operations; if that fills, the base falls. What comes at the wire are the species you have met below, and the wire crew can only hold what the field guide understands: field knowledge is the defence manual. Everyone not sent below works (lab, wire, infirmary, fabricator), so sending your best biologist down stalls the lab. The first-pass roster is ten, not twenty-five.

**5. Hope is carried by wonders.** There is no hope bar. It is read off the mess board and off who turns up. Time wears it down, and so do deaths and lost modules. What lifts it is what the operative brings home that is no use to anyone: something seen, a flask of rain, a chord the plants make. Low hope means poorer work and, at the bottom, people walking out through the wire at night.

**6. The growth is the lock.** Not a planet-mind: an immune response the Wardens bred around the Vault. Encroachment is that system digesting a foreign body, the base. Herbicide works, and every use raises the Pulse (below, things sleep lightly and hit harder), and nobody at base knows why until the glyphs are read. The three endings follow from how the base defended itself: Reinforcement means taking up the tending and stopping the burning.

**7. Every expedition is forgotten, and found.** When a campaign ends, the next one finds its camp in the Threshold: the tally marks, the memorial, a locker. The Wardens followed the signal, the earlier humans followed it, so did you. A small ledger outside the save slots carries only this: no power crosses between campaigns.

**8. Reading the walls.** Warden literacy is a second field guide. Glyph readings are translated at the lab; as literacy rises, signs that were always on the walls become legible (STORES, KEEP, DO NOT WAKE), sealed stores open, and at the top the maintenance protocol can be read.

**9. Order of work.** Breadth before depth: a thin whole campaign first (the prototype proves the shape), then the loot slice (grafts, one dealt relic), then more things that move, then renewal. See `technical_design.md` §7.

---

## The Core Conceit

There is something at the heart of this planet. Not a planet-mind, not a hive consciousness — a *thing*: an object, a structure, an anomaly, possibly something that crashed here aeons ago. The previous civilisation discovered it, studied it, and built containment infrastructure around it. The signal the expedition followed is that containment system functioning — a vast machine that has been running for a very long time.

The ecosystem evolved around the contained thing's influence, warping over geological time into the strange biology that now wants the operatives dead. The previous civilisation's fate is unclear: they may have completed their work and left, died maintaining it, scattered, or be sleeping somewhere deep. The deeper a player goes, the more legible the questions become — and at the bottom waits a choice about what to do with the containment itself.

This is closer to Roadside Picnic and Annihilation than to a "living planet" trope.

## Tech Stack

- **Platform:** Browser (desktop first). Desktop wrapper (Tauri/Electron) possible later.
- **Engine:** three.js + TypeScript, built with Vite
- **Perspective:** Isometric 3D — orthographic camera at a fixed angle, low-poly models, real-time shadow-casting lights
- **UI layer:** HTML/CSS overlay for base, research, inventory and field guide screens
- **Optional:** Anthropic API integration for procedural species naming and lore fragment generation (see the pre-deploy note in `technical_design.md` §9 — the key handling must change before the game is hosted anywhere public)

Full architecture in `technical_design.md`.

---

## The Planet

The planet has an expedition designation — bureaucratic, alphanumeric. The previous civilisation's name for it appears in lore fragments and is never reliably translated.

### Geography and phenomena

The ecosystem is warped by long exposure to the contained thing's influence. This produces recurring biome types players will encounter across drop zones:

- **The Overgrowth** — vast forests of unfamiliar biology, canopies moving in slow synchronised pulses
- **The Bone Forests** — regions where the geology is skeletal in form, massive ribs of mineralised material arching overhead. Their origin is contested by the expedition's geologists.
- **Singing Plains** — open grasslands where the wind produces audible chords through evolved plant structures
- **The Sink** — areas of mild gravity anomaly. Side effect of containment field bleed.
- **Mirror Pools** — bodies of liquid with refraction properties that don't match their composition. Reflective behaviour unreliable.
- **Phase Veils** — translucent atmospheric regions where time runs slightly differently. Containment field artefacts.
- **The Deep** — beneath every relic site, a persistent layer connecting them all. Warden infrastructure. The expedition does not know about it at first.

The map is hand-placed, but sites *shift* between visits — passageways open and close, contents change. Whether this is automated Warden maintenance, ecological regrowth, or something else is left ambiguous.

### Sky and time

The sky is overcast and alien-coloured, shifting with the containment field's operational state. Day and night occur but on a longer cycle than Earth-standard. The daylight has a quality that disquiets the expedition's psychologists.

---

## The Signal — "The Pulse"

The Pulse is not a beacon. It is the audible and electromagnetic signature of the containment system at work. The ecosystem evolved around it; species respond to it instinctively because their ancestors did for millions of years.

### Pulse phases

The containment system cycles through operational states. The current phase is visible on the base interface but its meanings are learned through play.

- **Stable phase** — containment functioning normally. Ecosystem at baseline activity.
- **Strain phase** — containment under load. Ecosystem agitated, fauna aggressive, certain flora bloom.
- **Echo phase** — containment artefact residual. Phase Veils expand, Mirror Pools more unreliable, time anomalies intensify.
- **Quiet phase** — brief recalibration. Ecosystem subdued. Excellent for cautious exploration. Brief.
- **Surge phase** — rare. The contained thing pushes against the system. Ecosystem responds violently across the entire planet. Some content is only accessible during Surge and survival is a real question.

### Pulse timing — campaign clock only

The Pulse runs on the **campaign clock**, not in real time. Phases advance as in-game days pass at base (between missions, during research, recovery and fabrication). The phase is **locked for the duration of a run**: whatever phase you launch into is the phase you play.

- Operations shows the current phase and how long it has run
- Research (and the Linguist specialisation) unlocks a forecast of the next phase and a rough window
- Waiting for a phase costs campaign time — and campaign time feeds encroachment
- Some research and deep content is phase-gated. Endgame paths require deliberately launching into specific phases.

This keeps all Pulse decisions strategic and made at base, and makes "do we wait for Quiet, or go now?" a real trade-off against the encroachment clock.

---

## The Previous Civilisation — "The Wardens"

A working term derived from translated fragments. They referred to themselves with a word that translates to *those who keep watch*.

### What we know at the start

Almost nothing. The expedition arrived expecting an active signal source and found extensive ruins instead. The initial assumption was that the Wardens had built the signal as a beacon. The initial assumption was wrong.

### What players will learn

In rough order of revelation:

- They were not humanoid in any familiar sense — body plan is fragmentary in lore
- They arrived following the same signal phenomenon and *discovered* the contained thing rather than creating the signal themselves
- They studied it for what appears to have been many generations
- They built containment infrastructure of staggering scale
- Their fate is unclear — some evidence of evacuation, some of death maintaining the system, some of stasis preservation deep in the relic sites
- The containment system is degrading. The Wardens left maintenance protocols, but no one has been performing them.
- A small number of Wardens may still exist in deep stasis chambers. Whether they should be woken is a question the campaign will pose.

### Wardens in the world

Players never meet a coherent active Warden in the early or mid-game. They encounter:

- **Recordings and logs** — left in relic archives, sometimes triggered by specific actions
- **Holographic remnants** — partial recorded messages, automated guidance
- **Skeletal and fossilised remains** — in places where Wardens died at their posts
- **Maintenance constructs** — autonomous machines built to tend infrastructure. Still functioning. Not hostile but not communicative. They tend.
- **Stasis chambers** — sealed, intact, occupied. Very rare, very late.

---

## Core Loop

Three nested loops at different timescales:

**Run loop (minutes):** Pick an operative → enter a site → explore one or more depth levels → collect samples, materials, and gear → extract or die.

**Mission loop (one site, multiple runs):** Each site has multiple depth layers. Players return across multiple runs, pushing deeper with better gear and knowledge, until they reach and exhaust the deepest chamber.

**Campaign loop (the whole game):** Defend the base against ecosystem encroachment, research samples to unlock fabrication and synthesis, recover lore to assemble the Warden story, spend the roster wisely, and ultimately decide what to do about the contained thing.

---

## Endings

**Departure** — Repair sufficient relic and fabricated tech to construct an escape vessel. Leave the planet. The expedition reports back to humanity. Eventually someone else comes.

**Reinforcement** — Restore and strengthen the containment system. Complete the Wardens' maintenance protocols. The contained thing remains contained. The base survives. The credits roll on a stabilised system.

**The Vault** — Open the containment and confront what is inside. The outcome is ambiguous and varies based on the research and equipment brought to that final encounter. The expedition's records become a different kind of document. Whether it was the right thing to do is for the player to decide.

Each ending requires different research investments and different deep finds across the campaign. None is presented as morally correct.

### Failure states

- **The base falls** — encroachment reaches critical
- **The roster is spent** — the last living operative dies. With no one left to send out, the base falls. Campaign over.

Both are clean roguelite endings. The final screens show what was learned, how far down anyone got, and the names of the dead.

---

## Mission Design: Sites & Runs

### Site structure

Each site is a multi-layer dungeon:

1. **Surface** — overgrown approach, day/night-affected, lower-tier flora and fauna, basic materials and samples
2. **Threshold** — first sealed interiors, deliberate Warden architecture, first lore fragments, higher-tier species
3. **Interior** — deeper Warden infrastructure, still partially maintained, exotic species, significant relic tech and rare materials
4. **Vault tier** — deepest layer, contains the choice-relevant artefacts, accessible only with prerequisite gear or specific Pulse phases

Layouts use hand-designed templates with procedural placement of species, materials, and discoveries within them. Rooms are stitched together at their doorways, sharing walls: an entry, halls and side rooms (some reached by corridors), and a sealed hatch leading on, as far from the entry as the layout allows. A campaign's layout of a layer stays the same from run to run, so it can be learned, but it shifts: each run a passage or two may have collapsed, cutting off a side room or two (never the way on). The HUD names the room you're in.

### Per-level species limit

Each level (each room set within a depth tier) contains **5 to 6 flora species and 2 to 4 fauna species** drawn from the available pool. This bounds the cognitive load — players have a manageable set of unknowns to figure out per run, not fifty. Within that, a level has at most one species that moves after you, two that heal and one of the rarest; deeper layers lean towards rarer species.

### The field guide

Every species encountered is recorded in an in-game field guide. Once a species has been:

- **Encountered** — basic visual entry, name, its voice, no behavioural info
- **Scanned** — what wakes it (sound, light, presence, touch, a neighbour's signal), its mood right now, and what it's linked to. Never what it *does*
- **Probed or witnessed** — the consequence: what it does when it goes off, and how that changes when it's awake
- **Sampled** — full behavioural info plus synthesis potential
- **Researched at base** — complete entry including counter-measures, related species, lore connections

This means: the **first time** a player encounters a species, it is genuinely unknown. They must observe, probe, and approach cautiously. By the third or fourth time, it's known and navigable. The fear and wonder are reserved for the first encounter — exactly where they belong.

The scanner is fabricable early. Relic scanner variants are more efficient and reveal more on a single scan.

### The operative thinks aloud

Whenever something is learned (a new species, a plant seen waking to light, spines, spores drifting after you, a scan flash waking its target, a sample taken) a line of inner monologue appears with the field-guide note it earned: "Huh. I feel better just being close to the leaves here." The field guide fills itself as you play. Right-click a plant for its card beside it, with a picture of the species as it looks this campaign; J opens the full guide, also illustrated.

### Scanning and probing: complementary, never free

Scans and probes must not turn first encounters into a solved puzzle. They answer different questions, and both cost something:

- **The scanner reads conditions, and a little of the consequences.** "Senses sound and light. Currently alert. Linked to 3 nearby." Each scan also gives a tissue reading: one thing the plant does that you didn't know (what it does asleep first, then awake). Knowing it all still takes scans, watching, probes or a sample
- **Scanning draws heavily from the suit cell that powers the torch.** 15% a scan: a full cell holds six. Every scan brings a dead torch closer
- **Scanning takes a moment standing still, starts with a ping and ends with a flash.** Plants that hear will hear the ping; light-sensitive plants along the scan line wake in the flash. Scanning a light-sensitive plant wakes it, and the report says so
- **Probes provoke.** A probe landing on a plant is a touch: spines stab it, snares grab it, pods arm, and the probe sees it all
- **Probes are few (a handful per run) and noisy.** A probe thrown into a room shows what wakes and what it does: worth spending when a room looks like trouble. The noise is part of the risk
- **Sampling needs you close.** Full knowledge costs proximity to the thing you're learning about: taking a sample counts as touching the plant
- **You only notice what you can see.** A plant is logged when the torch finds it, when it glows, or when you're almost on top of it. Camouflaged species in the dark stay unknown until they're a step away
- **Knowledge outlives the operative.** What the suit learns is transmitted to the field guide at once; the physical samples reach the base only if the operative does

### Species names are permanent per campaign

A species is named the first time it is encountered in a campaign, and that name is saved and never changes. Recognising a name on the second encounter is part of how the field guide works. Names come from the local generator, or from the Claude API when enabled — generated once, then cached in the save.

### Difficulty: punishing flora, plentiful early medicine

Flora is meant to hurt. Walking into an unknown cluster should carry real risk, and some first encounters will go badly. The counterweight is medicine:

- **Medkits are abundant early** — a healthy starting stock at base, and frequent finds in surface caches and expedition wreckage
- Early medkits are the tutorial's safety net: players learn that unknown plants are dangerous without losing an operative for every lesson
- Supply tapers as the campaign goes on. By mid-game, medkits come from synthesis and fabrication, and a player who hasn't learned to scan and probe starts paying for it
- Learning a species costs time, torch charge, noise and caution rather than rare resources: scans drain the suit cell, probes are few and loud (see Scanning and probing)

### The run

Limited inventory. An operative can be **downed** twice per run — the suit stabilises them, at a cost in health, Exposure and time. The third time is death, and death is permanent. The run ends on extraction or death; carried items are lost on death unless uplinked or cached. Campaign progress is preserved.

- **The haul is a choice.** Salvage lies about the ruin in piles: Warden alloy, conduit filament, crystal resin, glyph plates, and now and then a relic cell (heavy, and worth it). Deeper layers hold more relic tech. The pack has a comfortable load; over it the operative walks slower and can't sprint, and there's a hard limit beyond that. Searching a pile takes a moment and makes a noise. Rounds and medkits found are used at once, never carried as weight.
- **Down through the hatches.** Each layer's far room has a hatch. Forcing it is loud, and takes the operative down to the next layer with everything they carry and every wound. The deepest hatch so far is sealed from below.
- **Out by the lift.** Every layer's entry has a lift beacon. Calling the lift is a commitment: it takes twenty seconds to come, the winch grinds all the way down (everything that hears comes to look), and once down it waits only a little while before going back up without you.
- **How a run ends decides what comes home.** Ride the lift up, from any layer, and everything carried reaches the base. Quit from the menu and the operative walks out with unused medkits, leaving the haul. Die and nothing comes back. What the suit learned is kept whatever happens.
- **Nothing goes to waste.** Plants that grip feed on what dies against them. A corpse held by one is eaten, slowly, faster with more mouths, and a plant that grows while it feeds grows.

### Uplink and field cache

- **Data uplink points** — expedition relays left in the ruin (one per layer). Standing by one and sending takes eight seconds, costs a share of the torch cell to power, and hums as it goes (everything nearby hears). Walk away and the link drops. When it finishes, every carried sample and every glyph reading is at base, safe whatever happens next, and the pack is lighter: the physical samples and plates stay in the relay's hopper. One transmission per relay per run. Heavy salvage and relic cells still need the lift.
- **Field cache** — expedition lockers (a couple per layer, always in the same places in a campaign's ruin). Stow anything carried, including medkits from the belt and rounds in clips; it's there next run, even if the operative dies. A collapse can put a cache out of reach for a run, and sometimes something gets into one and takes a share (moved by Warden constructs, later).

### Resupply system

Critical for deep runs. Multiple resupply layers:

- **Cache points within sites** — pre-stocked by the player on previous runs, retrievable mid-run
- **Supply drops** — base can drop a limited supply package to a marked surface location. Costs base resources, limited per mission, takes time to arrive.
- **Foraging** — ammo crates, medkits, partial weapons, materials in environmental cover
- **Warden dispensers** — automated relic-era resupply terminals found in deep ruins. Once repaired by an Engineer, they dispense a small amount of materials per mission visit. Powered by relic energy cells; limited charges before requiring further servicing.

Players preparing for a Vault-tier push will cache supplies on earlier runs, repair dispensers en route, and call in drops for the surface stage. Deep runs become logistically planned operations.

### Returning to sites

Deepest reached layer is preserved between runs. Surface and threshold layers repopulate. The ecosystem mix shifts based on Pulse phase and player history at that site.

---

## Operatives

### Solo operations

Missions are conducted by a single operative. The planet's flora network detects clustered bio-signatures and responds with overwhelming force. Two operatives don't double survival — they collapse it. The Wardens discovered this; their ruins are designed for solo passage; their security systems mirror the same logic.

### The roster: 25 bodies

The base begins with **25 expedition survivors**. That's enough that losing people is expected — and few enough that every loss narrows your options. The roster is the campaign's second clock, alongside encroachment.

Sacrifice is part of the design:

- Sending a junior operative on a risky scouting run to learn a species, rather than risking a veteran
- Spending an operative to reach an uplink or cache something deep
- Choosing who gets the scarce augments and relic gear
- Keeping specialists alive because only they can do certain things (an Engineer to repair dispensers, a Linguist to forecast the Pulse)

When the last operative dies, the base falls (see Failure states).

Each operative has:

- **Name and backstory** — 2–3 sentences mixing generated and authored content
- **Portrait** — distinct visual identity
- **Specialisation**
- **Starting stats**
- **One personal trait**
- **Experience and rank** — accrues from missions, unlocks slot improvements and small stat gains

With 25 people, the roster screen needs good sorting and filtering (by specialisation, status, Exposure, rank). A memorial wall in the base lists the dead.

### Specialisations (7)

- **Biologist** — improved sample yield; better synthesis odds on personal samples; identifies more from a single scan
- **Engineer** — better relic interaction; can repair Warden dispensers and constructs; lower mishap risk on mystery items
- **Soldier** — better combat stats; extra weapon and ammo capacity
- **Scout** — quieter movement, wider flashlight cone, better probe accuracy, more detailed scan results
- **Medic** — better field health recovery; mid-run stabilisation; faster post-mission recovery; gets more from each medkit
- **Demolitions** — explosives handling; breaches blocked passages; better experimental weapon outcomes
- **Linguist** — translates Warden fragments faster; derives Pulse forecasts from phase analysis

A 25-person roster starts with at least two of each, plus a few extras weighted toward Soldier and Scout.

### Personal traits (sample)

- *Night Owl* — better at night, penalty by day
- *Xenobotanist* — identifies beneficial flora more readily
- *Light-footed* — lower sound-reactive trigger chance
- *Relic Hunter* — finds hidden caches more often
- *Combat Veteran* — no accuracy penalty under fire
- *Claustrophobic* — penalty in tight sealed interiors
- *Resourceful* — occasional partial ammo recovery
- *Cautious* — better probes, slower movement
- *Iron Stomach* — resistant to spore and contact effects
- *Sharp Memory* — retains scan info across operatives; first scan reveals more

### Exposure

A simple medical system. Operatives accumulate Exposure from:

- Time in deep ruins (containment radiation)
- Untreated contact with hostile flora
- Carrying highly contaminated samples
- Surge-phase missions
- Being downed and stabilised

Exposure manifests as:

- Reduced stats when high
- Required rest periods between missions
- Risk of permanent injury at extreme levels (a replacement augment is needed)
- Need for medical treatment and detox

It is practical, not metaphysical. Medics and medical research reduce its impact. High Exposure doesn't change the operative into something else; it just makes them sick.

### Reinforcements

Rare and narrative-gated. Across a campaign:

- 2 to 3 **cryo-survivors** from wreck debris (early to mid-game)
- 1 to 2 **previous human expedition survivors** found in mid-tier ruins. They have high Exposure but unique field knowledge.
- 1 possible **Warden stasis sleeper** in a deep relic chamber, late-game. Mechanically unique.

Reinforcements slow the roster clock; they never reset it.

---

## Lighting & Day/Night

Mission launch time at surface is selectable. Day offers visibility, night offers stealth and activates nocturnal fauna. Deep ruins always have *some* auxiliary lighting — bioluminescent flora, residual Warden power, ceiling breaks, activatable light sources. Atmospheric, not blackout.

The flashlight is the game's signature. It is a real light that casts real shadows: pillars, ribs and ruined walls throw long shadows that move as the operative turns. What is behind you is dark.

When the torch dies the world goes nearly black, lit only by bioluminescence, until it recharges. Hearing sharpens to compensate: plant voices grow louder, carry further and lose their dull edge. The dark is where you listen.

**Visual style** (detail in `art_direction.md`): in the spirit of Playdead's *INSIDE*. A near-colourless world of cold stone and haze, where colour belongs only to life (bioluminescence) and to power (the operative's suit, Warden light). The torch is a shaft of cool light through dusty air. Each layer of a site has its own stone, haze and light, so going deeper feels like going somewhere else.

---

## The Ecosystem: Flora

### Design principles

- Each level has 5 to 6 species drawn from a large total pool
- **No visual telegraphing of behaviour** — a red vine is not always sticky, an exploding plant is not always recognisably spiky. First encounters are genuinely unknown and require observation, probe testing, or scan
- **Flora is punishing** — contact with an unknown species should be a real risk. Early medkit abundance keeps this from becoming a meat grinder (see Difficulty above)
- Species names and descriptions are generated once per campaign on first encounter and saved (local generator by default, Claude API optional)
- Field guide records what the player has learned; second encounters are informed
- Dangerous species tend to yield the best synthesis materials
- **No audio or camouflage telegraphing either.** Each species' voice and whether it is camouflaged are dealt per campaign, like its looks

### Moods: dormant and alert

Every plant is **dormant** or **alert**. Its senses say what wakes it: noise (sprinting, shrieks, bursts, a scanner ping), torchlight held on it, something coming close, a touch, or a chemical signal from a neighbour. Awake, its behaviour changes, and after a while with nothing to keep it awake it settles again.

- **Asleep, most plants are mild or inert; awake, they are dangerous.** Each species has one clear sense (a few add touch), so what you learn is actionable: a plant that wakes to light can be passed in the dark, even brushed against
- A needle fan barely pricks while asleep and lashes out, further and much harder, once you come close
- A blister pod only arms asleep if you all but walk into it; hold a light on it and it wakes and goes off from metres away
- A dusk orchid heals in the dark and breathes poison the moment a torch finds it, and the cloud drifts after you
- A puffcap is inert until noise wakes it; then its clouds follow you, thinning as they go
- A tar creeper wakes to a touch or a noise, shrieks, crawls after the noise, and grips hard, feeding on the torch's cell while it holds you
- A heliotrope is inert in the dark; light wakes it and it comes for the light, slowly. Switch off and it loses you, crawls to where the light was, and waits
- A tumble burr is rare: a noise wakes it and its burrs snap loose and roll, fast, towards the sound, bursting when they reach someone. Fast things in the ruin are fast for a reason (they roll, they reach); most plants that move crawl
- A lash vine hangs off walls in the dark. Asleep it only snags what brushes it; woken by noise it reaches metres out, catches hold and reels you in to its thorns. It never moves. Walk hard against the pull, or cut it
- A lantern reed closes up under torchlight: rest beside it in the dark
- Velvet moss clams up when it hears noise, and the whole patch goes quiet with it
- A tattler does no harm itself; it senses you coming and shrieks, and everything that hears it wakes
- Ember lace is networked: when it wakes, every plant growing around it wakes too, in a visible wave

Waking is something you catch only if you're watching: the plant tenses and trembles, there's a rustling hiss nearby, and the operative remarks on it ("Did that thing just stir when the light hit it?"). There is no marker, no ring on the ground: if something screams in the dark and then nothing happens, you don't know what it woke. Seeing a plant wake teaches the field guide that sense, without a scan.

### Screams

Screams are the worst sound in the ruin, and they are not human: a long howl through a throat that isn't there (a big cat far off), a burst of harsh corvid cackling, or a deep throbbing roar that climbs into a shriek (howler monkeys, wrong). Each screaming species screams its own way, dealt per campaign. Screams carry a long way and ring round the ruin, and anything that hears them may wake.

### Habitats

Every species grows where it likes: in the glow of luminous plants or well away from it; in corridors, corners, open rooms or along walls; some out of the walls themselves. A level's layout decides where things lurk, and learning a species' habits tells you where to expect it. Wall-growers grow out of the faces turned to the camera and sink with a wall when it's cut away.

### Plants that change

- **Growing:** some swell while a condition holds: a heliotrope in torchlight, a gorge vine while it feeds on your suit
- **Spreading:** some put out new shoots: a woken tar creeper, a feeding gorge vine along its wall
- **Withering:** some die in the light. The nightcap lives in the darkest corners; hold the torch on it for more than a moment and it shrivels, and the sample is gone for good

### Dread

Plants come for you. Some crawl after the light or the noise that woke them (never far from where they grew); spore clouds drift after whoever is nearest; grapplers drain the torch while they hold you, and a dead torch means darkness. Healing plants are few and slow, medicine is scarcer (35 per medkit, 9 at base to start), and an awake plant hurts far more than a sleeping one.

So a room is not just a set of plants but a state. One careless sprint, a scan, or a beam held too long changes what everything in earshot or sight will do next. Awake plants stand taller and tremble: the same for every species, so it tells you a plant's mood, never its nature.

### Concealment

Each campaign one or two species (and their mimic twins) are camouflaged: low, flat, floor-coloured, easy to miss outside the torch beam. Which ones is dealt by the seed, so being hard to see says nothing about what a plant does. Most plants stay visible: a game where everything is invisible is a game about squinting.

### The plants are the soundtrack

There is no score. Every cluster makes its species' sounds (creaks, rustles, clicks, drips, breaths, groans, chirrs) in a loose, uneven rhythm on a shared slow pulse. It should sound like a living place, not a band: timing wanders, calls are skipped, pitches slide; a faint campaign key underneath keeps the room coherent. Voices are placed where the plants grow and muffled behind walls. Awake clusters sing twice as often and higher: a room waking up can be heard before it's seen. Over a campaign the player learns to know species by ear, and mimic twins, identical to look at, always sound different.

### Behaviour pool

A large pool drawn from to populate any given level. Species are *combinations* of behaviours — a single species might be sticky AND sound-reactive AND networked. Combination produces the genuine variety while behaviour primitives remain learnable building blocks.

**Hostile primitives:**

Sticky contact, proximity explosion, glow on touch (attracts), hitchhiker, sound on contact (scream, whistle, signal), flammable, hallucinogenic contact, gunfire-immune path-blocker, animal sound mimicry, spore cloud release, rapid regrowth after cutting, creature-spawning when cut, toxic cover, light-tracking, sound-reactive (triggers on gunfire), networked (signals neighbours), corpse-feeding, chain-reactive cluster, identical mimic species (one dangerous one inert), wall-climbers that grab, sound-seekers (slow movement toward noise), day/night dormancy split, lodging spines, false floors over hazards, weapon-resistant bark, memory-of-paths growth, pulse-phase aligned behaviours.

**Beneficial primitives:**

Healing moss (slow contact regen), stimulant spores (speed burst with crash), bioluminescent sap (temporary low-light enhancement), vibration-sense tendrils (proximity alarm), hardening resin (temporary armour buff), scent-masking pollen, detox root (neutralises plant toxins), oxygen-rich blooms, path-avoiding growth (safer routes), adrenaline contact, harvestable light pods, seed pod grenades, sleeper bloom (safe rest), threshold lichen (allows Phase Veil entry), Pulse-aligned bloom (only blooms in specific phases, top-tier synthesis material).

### Strange species (low-frequency, evocative)

Rare encounters that aren't tied to "everyone was a person who joined the planet" — just genuinely odd biology evolved around containment field bleed:

- **Hand-flora** — anthropomorphic, evolved to that shape for unclear reasons. Not hostile unless attacked. Sampling them yields top-tier biological material.
- **Hum-flora** — emits tonal hums; clusters compose chords; some chords have minor cognitive effects
- **Cooperator plants** — extremely rare. Move in gestures that appear directional. Following their indications sometimes leads somewhere useful. Mechanism unknown.
- **Mirror flora** — visual reflections in their petals are subtly inaccurate. Phase Veil artefact.
- **Listening flora** — featureless, transmits ambient sound to *somewhere*. Conducting missions quietly near them is rewarded.
- **Pitcher traps** — large carnivorous plants containing partially-digested fauna and occasional recovered gear. High-value harvest.
- **Root-deep plants** — small at surface, root systems extending through The Deep. Damaging one has consequences elsewhere.
- **Companion seedlings** — extractable, plantable at base. Become base defences or yield renewable materials over time.

---

## The Ecosystem: Fauna

### Design principles

- 2 to 4 species per level from a large total pool
- Co-evolved with flora; some entities blur kingdom boundaries
- Detection modes vary (visual, auditory, biosign, vibration, chemosensory) and are species-specific
- Day/night and Pulse phase shift active species mix

### Threat categories

- **Ambient** — passive, atmospheric
- **Territorial** — attack only when their space is entered
- **Predatory** — actively hunt
- **Nocturnal / diurnal**
- **Pulse-touched** — only active in specific phases

### Notable archetypes

- **Camouflage mimics** — appear as plant clusters until approached
- **Megafauna** — heard and felt before seen. Tremors. Best avoided.
- **Swarm entities** — collectively lethal, dispersed by area weapons
- **Burrowing ambushers** — vibration-triggered surface attacks
- **Flashlight hunters** — drawn to directed light
- **Blind acoustic predators** — gunfire is catastrophic near them
- **The Followed** — a creature attaches to one operative across missions, follows at distance, never attacks. Sometimes leaves small offerings. Origin unknown.
- **Bonded pairs** — die in twos. Kill one, its partner dies at the base.
- **Echo creatures** — exceptionally intelligent species that learn within a mission. The third encounter in a single run is significantly harder than the first.
- **Warden constructs** — semi-transparent maintenance automatons in deep ruins. Tend infrastructure. Do not engage operatives. Effectively environmental.
- **Pulse-singers** — emit fragments of the Pulse audibly. Killing one briefly disrupts local conditions with unpredictable consequences.

### Fauna sampling

Sampling from corpses within a window post-kill. Each species feeds a parallel research chain. Hybrid synthesis combining fauna and flora produces the most powerful experimental outputs.

---

## Equipment & Combat

### Combat so far (Session 7)

- **Guns are loud.** A pistol shot is heard 18 m away: it wakes every plant that hears, sets off sound-reactive ones, and brings creatures. Firing is a decision, not a reflex
- **The machete is quiet and close,** and it cuts plants down, which kills them: a plant cut to death can't be sampled
- **Cutting a plant takes several blows, and it thrashes** (0.11.0): each cut is heard 6 m off, waking what grows nearby. The machete's reach is short (1.25 m), inside most plants' own, and the arm tires: swing after swing, the recovery gets slower
- **Hack-through growth:** in the Threshold, thickets fill some floor tiles. You can't push through one (creatures can); two machete cuts clear it, loudly (heard 7 m off). A plant can grow inside a thicket, unseen until you're almost on top of it or you cut into it
- **Growth and threat look alike** (0.12.0): plants and the growth around them are made of the same leaves. What marks a species is its colour and the pattern on its leaves (dealt afresh each campaign), its glow, how it moves and its voice. Some glowing species glow only faintly while asleep. Creepers move by re-rooting, withering behind and growing ahead
- **Waking takes a moment** (0.12.1): a plant that wakes comes alive visibly (its light gutters up, it stirs and calls) before its alert behaviour takes hold, about 1.4 s. Brushing something asleep is a warning, not a death sentence, if you step back. New shoots grow in harmless and can't be woken for their first few seconds
- **Some plants are easy to see:** one or two species a campaign are vivid (saturated colour, strong marks); the rest range from plain to hidden
- **Shooting a plant sets it off.** Shoot a blister pod from a distance and it bursts where it stands
- **The skulker hunts by your light.** With your torch on it sees you from far off; in the dark it sees only a few metres, but it hears well. It stalks, rushes, bites, and runs when badly hurt. Plants hurt it as they hurt you

### Loadout

- **One primary weapon**
- **One sidearm** — small slot for pistol or specialty item
- **Machete** — always equipped
- **Flashlight** — directional cone, limited battery, passive recharge
- **Throwables** — probes, grenades, light pods (limited slots)
- **Consumables** — medkits, detox, stimulants
- **Relic slots** — 1 to 2 dedicated, do not compete with weapons
- **General inventory** — samples, ammo, materials, fragments; expandable via exo-frame
- **Drone slot** — see Drones below

**Tools for growth (from the 0.12.0 playtest, for the fabrication sessions).** A spreading snare-and-leech plant filled a corridor; shooting it from range worked, but a pistol shouldn't really stop a plant. Plants want their own answers, each with a cost:
- **Burner:** a short-range incendiary spray. It kills growth and clears thickets fast, but it's loud and very bright (it wakes everything light-sensitive), uses fuel, and fire spreads through dry growth.
- **Defoliant canister:** a thrown or sprayed herbicide cloud. It kills slowly and quietly over an area, and it's the answer to spreaders, but it's heavy and scarce, and it spoils samples.
- **Cutting charge:** a small shaped charge for a thicket or a rooted plant at range. Very loud.
- **Pole tool / long blade:** more reach than the machete, slower, so you can cut a stinger without standing in it.

---

## Weapons: Three Tiers

> **Superseded in part (November 2026, decision 2).** The standard fabricated tier is cut to a small dependable kit with no sub-tiers or mods. Experimental weapons become grafts. Relic functions are dealt per campaign and unknown until used or studied; the named relics below are the pool of functions, not a fixed list of finds.

### Tier system overview

**Standard fabricated weapons** — researched and printed at base, the resupplyable workhorse arsenal. Players use these as their default loadout. Ammo is fabricable. These last forever as long as you keep printing them.

**Experimental weapons** — synthesised from rare biological materials. High power. Limited charges or finite lifespan before degradation. Players will *relish* using them on specific runs and mourn them when they're spent. Not resupplyable in the same form — the recipe might be reproducible but the materials are rare.

**Relic weapons** — recovered from deep ruins. Irreplaceable. Cannot be fabricated. Mostly straightforwardly powerful with a few exotic ones. Players hoard them.

### Standard fabricated tier

**Archetypes:**

- **Ballistic** — pistols, SMGs, assault rifles, marksman rifles, shotguns, heavy machine guns
- **Energy** — pulse pistols, beam rifles, laser carbines. Use rechargeable cells rather than ammo. Cells charged at base.
- **Incendiary** — flamethrowers, incendiary launchers
- **Specialty** — net guns, sonic dispersers, EMP throwers
- **Heavy** — RPG launchers, auto-cannons (rarer printable)

**Sub-tiers within standard:**

- **T1 (early)** — basic versions available from initial research
- **T2 (mid)** — improved variants requiring mid-game research and rarer materials
- **T3 (late)** — top-end fabricated weapons requiring late-game research, exotic materials from deep sites, and high-tier blueprints

**Modifications and attachments:**

A modular system for weapon customisation. Mods are themselves researched and fabricated:

- Scopes, suppressors, extended magazines, recoil compensators
- Underbarrel grenade launchers, secondary energy emitters
- Coating treatments (incendiary rounds, anti-armour, hollow-point)
- Smart-targeting modules (relic salvage components required)
- Bayonets and combat blade attachments

Standard weapons are intended to be the player's normal experience — replaceable, customisable, dependable.

### Experimental tier

Synthesised from biological materials harvested in the field. Powerful and short-lived. Each takes specific samples to produce; players invest deliberately when they expect to need them.

Examples:

- **Spore Lance** — fires guided spore clusters from a rare alien fungus. Spores home toward heat signatures. ~50 shots before the weapon degrades.
- **Sap Cannon** — heavy weapon firing globs of sticky polymer. Immobilises and damages over time. Charges per mission.
- **Scream Repeater** — uses captured sound-reactive plant material as ammunition. Area-effect sonic damage. Material loses potency within a few days of harvest.
- **Bloom Launcher** — fires fast-growing explosive pods. Pods germinate on impact and detonate. Limited charges; bloom material is unstable.
- **Bio-Acid Pistol** — sidearm synthesised from a rare digestive enzyme. Eats through armour. Few shots, but devastating when needed.
- **Hallucinogen Atomiser** — area-of-effect weapon that scrambles enemy AI in a small zone. Limited charges.
- **Living Whip** — a melee weapon derived from grabbing-vine biology. Long reach. Degrades over time as the biological component dies.
- **Pulse Net** — fires an energised mesh that holds large fauna in place briefly. Phase-aligned variants exist for higher tiers.

Experimental weapons should *feel* unstable, biological, and special. Their visual and audio design should make them obviously distinct from the clean fabricated weapons.

### Relic tier

Irreplaceable. Recovered from deep ruins. No fabrication equivalent.

**Standard relics (rewarding, no major downsides):**

- **The Quiet Rifle** — silent fire, exceptional accuracy and damage. Limited finite ammunition.
- **Warden Lattice Pistol** — energy sidearm; no ammunition consumed but cooldown between shots; never runs out
- **Heavy Gauss Rifle** — top-tier ranged. Limited ammunition; can be partially fabricated from rare materials.
- **Plasma Cutter** — close-to-medium range relic; doubles as breaching tool for sealed passages
- **Beam Lance** — heavy weapon; punches through multiple targets in a line
- **Auto-Turret Drone** — deployable. Repositionable. Limited deployment time.
- **Sentinel Carbine** — assault rifle equivalent with enhanced damage and built-in scanner integration

**Specialty relics (situational and brilliant):**

- **The Listening** — scanner that shows the planet's containment-field state as a colour overlay. Sharpens Pulse forecasts.
- **Foretell** — shows one second of imminent future as a translucent overlay. Limited charge; recharges at base.
- **Choir-call** — emits a chord that briefly pauses Warden constructs and certain Pulse-singer fauna
- **Anchor** — temporarily prevents the operative from being detected by anything. Time-limited; cooldown between uses.
- **Vault Key fragments** — required for endgame paths

**Risky relics (small special tier, rare):**

A small number of relics carry real costs. Players who use them know what they're trading.

- **Memorywork** — heavy weapon, devastating. Each shot, the operative loses a small specific benefit — a stat point, a skill, a learned scan. Used as a last resort.
- **The Tending Hand** — repairs damaged equipment or operatives in the field beyond normal medical limits. Accumulates Exposure rapidly.
- **Compass** — points to where the operative will die. Useful information. The operative who carries it tends to be more cautious afterwards.

Most relics fall in the first two categories. The risky tier is small and special.

---

## Defensive Tech & Personal Equipment

This is its own substantial tree, parallel to weapons.

### Armour tiers (T1–T3, plus Warden salvage)

**T1 — Expedition Suit (starting kit)**
- Baseline pressure-sealed survival suit
- Minimal armour value, mod slots for early upgrades
- Built-in stabiliser (what gets a downed operative back up)
- Operatives start with this

**T2 — Combat Hardsuit**
- Researched mid-game, fabricable
- Significant armour, better environmental sealing
- Light / medium / heavy variants

**T3 — Powered Exo-frame**
- Late-game research, expensive to fabricate
- Powered armour with strength augmentation, carry capacity boost, integrated weapon mount
- Heavier, slower, louder, but substantially more survivable. The noise matters: sound-reactive flora and acoustic predators notice.

**Warden salvage** — not a fourth tier but relic variants found in deep ruins. Cannot be fabricated. Each is roughly T2–T3 in protection with one unique passive (Pulse-phase resistance, automatic field generation, etc.). Irreplaceable, like relic weapons.

### Armour modifications

Attachable upgrades for any armour:

- Reactive plating (chance to negate critical hits)
- Cooling systems (immunity to flammable plant effects)
- Stealth coatings (reduce visual detection range)
- Auxiliary lighting arrays (mounted secondary lights)
- Bio-filter systems (immunity to spore and gas effects)
- Medical injector packs (auto-stabilise on critical damage)
- Inventory expansion modules (more slots)

### Augments (cybernetics and prosthetics)

One system covering everything installed in the body, done in the Surgery. Each operative has a limited number of augment slots.

**Elective augments** — chosen upgrades:

- Installation costs research and materials
- Operative is unavailable during recovery (in-game days — which advance the Pulse and encroachment)
- Small chance of rejection on early-tier installs (augment lost; operative survives with a stat penalty)
- Permanent stat improvement or unique ability once installed

**Replacement augments** — for operatives who suffered permanent injury (extreme Exposure or severe wounds). These are the silver lining: a replacement is often *better* than what was lost.

Examples:

- **Subdermal weave** — passive damage resistance
- **Reflex implants** — faster reaction, better dodge chance
- **Optical enhancements** — improved vision range, scan integration; replacement optics add low-light vision
- **Pulmonary filters** — immunity to spore effects
- **Adrenal regulator** — no crash after stimulant use
- **Neural co-processor** — better scanner output, faster threat identification
- **Synthetic muscle** — increased carry capacity, melee damage
- **Subcutaneous medical injector** — auto-heal once per mission
- **Auditory enhancers** — hear distant fauna, predict ambushes
- **Mechanical arm** (replacement) — increased melee, no fatigue
- **Mechanical legs** (replacement) — faster sprint, no stamina penalty on long missions

With 25 operatives and scarce materials, *who* gets augmented is a real roster decision. There is also a campaign question of how many augments an operative can carry before they are no longer entirely the person they started as. Mechanically neutral but narratively rich.

### Drones (3 types)

Companion tech. Each operative has 1 drone slot, expandable to 2 with research.

- **Scout drone** — flies ahead, reveals the map in a small radius, can carry a probe to an unknown plant. No combat capability.
- **Recovery drone** — retrieves samples from hazardous locations the operative can't safely approach
- **Combat drone** — small floating weapon platform. Limited ammunition. Noisy.

Drones can be destroyed. Materials and research required for repair. Higher-tier drones are more durable and capable. Relic drones (rare salvage) are exceptional.

### Consumables (non-permanent enhancements)

Used per mission:

- Medkits (abundant early, scarcer later — see Difficulty)
- Stimpacks (combat boost, Exposure cost)
- Endurance compounds (extended stamina)
- Pain dampeners (ignore wound penalties briefly)
- Combat regulators (steady aim under fire)
- Detox patches (clear toxin effects)

---

## Research, Synthesis & Fabrication

### Synthesis — biological processing

Sample-based consumables and experimental weapons. Recipes unlocked through research on collected flora and fauna.

### Fabrication — blueprint manufacturing

Blueprint + raw materials → standard weapons, armour, ammunition, modifications, drones, base infrastructure.

Powered by the base fabricator. Power management becomes a real concern when running multiple fabrication projects simultaneously.

### Research unlocks

Triggered by:
- Sample submission (flora and fauna)
- Multiple samples of the same species improve outcomes
- Specialised operatives improve specific research types
- Field scanning equipment improves outcomes during missions
- Data recovered from Warden terminals contributes to specific branches
- Lore fragments occasionally unlock unique blueprints

### Tech tree philosophy

Three major branches with significant cross-feeding:

- **Weapons** — standard fabrication, modifications, experimental synthesis
- **Defence** — armour tiers, modifications, augments, drones
- **Infrastructure** — base improvements, encroachment countermeasures, dispenser repair recipes, power management, supply drops, Pulse forecasting

Each branch has T1/T2/T3 progression with branching paths. Two playthroughs should look meaningfully different in their tech progression.

---

## Research Base

### Base structure

- **Lab** — synthesis
- **Fabricator** — manufacturing
- **Surgery** — augment installation
- **Archive** — lore and species records
- **Operations** — mission select, Pulse status and forecast, uplink, roster management
- **Defence** — encroachment countermeasures
- **Medical** — operative recovery and Exposure treatment
- **Drone bay** — drone storage and repair, supply drop dispatch
- **Memorial** — the names of the dead
- **Garden** (optional) — companion seedling cultivation

### Encroachment

> **Superseded in part (November 2026, decisions 4 to 6).** Encroachment takes modules rather than filling one meter, is fought with field knowledge, and burning it back raises the Pulse.

The containment meter. Resources push it back. Sources of containment materials:

- Specific mission objective rewards
- Synthesised herbicides and perimeter charges
- Recovered relic defensive tech
- Companion seedlings (slow renewable contribution)

If encroachment reaches critical, the base falls. Encroachment is the campaign timer preventing indefinite safe grinding. Waiting at base — for a Pulse phase, for recovery, for surgery — always costs encroachment.

---

## Mission Rewards (standard)

Every mission yields multiple categories of reward, not just relics. A typical successful run brings back:

- **Containment materials** — push back encroachment, used by Defence
- **Fabrication raw materials** — metals, polymers, exotic alloys for printing
- **Energy cells** — power for fabricator and certain equipment
- **Biological samples** — flora and fauna, feed Lab research
- **Medical supplies** — medkits and detox, common early, rarer later
- **Standard equipment** — occasional fabricated items, ammunition stockpiles, used gear from previous expeditions
- **Mods and attachments** — sometimes found in supply caches and ruins
- **Lore fragments** — Warden records, expedition logs
- **Experimental ingredients** — rare biological materials for synthesis
- **Relic equipment** — occasional, depth-tier dependent
- **Mystery items** — rare, research required to identify

Deep-run rewards are weighted toward relics, exotic materials, and lore-significant artefacts. Surface and threshold runs are weighted toward containment, fabrication materials, medicine and common samples. Players grind surface runs for base sustenance while pushing deeper for the rarer rewards.

---

## Relic Sites

### Contents by depth

- **Equipment** — relic weapons, armour, drones, scanners
- **Research materials** — exotic specimens enabling otherwise-inaccessible synthesis
- **Lore fragments** — Warden archives in multiple formats (technical, personal, procedural, mythic, recent)
- **Mystery items** — unidentified relic tech. Activation without research risks adverse outcomes.
- **Vault-relevant artefacts** — required for endgame paths, found only in Vault tier

### Lore tone

Warden records vary in tone. Technical manuals for relic equipment (with diagrams that are mostly comprehensible). Personal journals from individual Wardens, often unsettling in mundane ways. Procedural records of vast, centuries-long projects. Occasional fragments that appear to reference recent events — perhaps from the previous human expedition, perhaps from the player's own campaign earlier on.

### Architectural character

Warden sites feel deliberate, alien, and uncomfortable to move through. Doorways at slightly wrong heights. Rooms whose dimensions feel off. Symbols that recur without translation. Architectural language that is functional but not human. Some chambers were clearly inhabited recently — possibly by maintenance constructs, possibly by something else.

The isometric view helps here: ceilings are cut away, but wall heights, doorway proportions and long shadows all read clearly.

---

## Build Order (summary)

Full session-by-session detail is in `technical_design.md` §7.

1. **Foundation** — project, isometric camera, operative movement, mouse aim, shadow-casting flashlight, a test ruin, saves, settings *(done)*
2. **First flora** — seven species from composable behaviours, noise chains, health, downs, medkits *(done)*
3. **Operative, hurt feedback and sound** — animated operative, strong damage feedback, synthesised sound *(done)*
4. **Living flora** — moods and senses, networks, plant voices as the soundtrack, sharper hearing in the dark, concealment *(done)*
5. **Knowledge** — scanner (reads senses and mood), probes, sampling, field guide, species names *(done)*
6. **Combat basics** — service pistol, machete, the skulker (sight that depends on your torch, hearing) *(done)*
7. **Rooms and population** — room templates stitched into a campaign's ruin that shifts between runs, species chosen per level, hatches *(done)*
8. **The run and its haul** — salvage and the pack, hatches down, the lift out, what comes home *(done)*
9. **Cache and uplink** — field caches that keep between runs, relays that send samples and readings home *(done)*
10. **Art direction** — before the base: settle the look while there's still little to redo (first pass done in 0.9.1)
4. **Site structure** — multi-room dungeon, depth layers, extraction, run lifecycle, field cache, basic resupply
5. **Base hub** — base screens, sample inventory, lab with first synthesis recipe, fabricator with first blueprint
6. **Encroachment + standard rewards** — containment meter, reward categories, supply drops
7. **Operatives** — 25-person roster, specialisations, traits, Exposure, permadeath, memorial, roster-wipe failure
8. **Research depth** — full synthesis and fabrication trees, tech tree UI, weapon mods
9. **Pulse phases** — campaign-clock phases, forecasting, phase-dependent species and content
10. **Armour, augments, drones**
11. **Experimental weapons**
12. **Relic tier and lore**
13. **Fauna expansion**
14. **Flora expansion**
15. **Narrative completion** — three endings, final missions

Each step produces a working, playable increment.

---

## Resolved Design Decisions

**Platform and stack:** Browser game. three.js + TypeScript + Vite, isometric 3D with an orthographic camera. HTML/CSS for menus.

**Operative count:** Single per mission. Roster of 25 with permadeath. Sacrifice is expected. Rare reinforcement events.

**Roster wipe:** When the last operative dies, the base falls and the campaign ends.

**Runs:** An operative can be downed twice per run and stabilised by their suit; the third time is death.

**Difficulty:** Flora is punishing. Medkits are abundant early and taper off. Knowledge is never free: scans drain the torch's cell and ping, probes are few and loud, and the scanner reveals what wakes a plant, not what it does.

**Plant moods:** Every plant is dormant or alert; its senses decide what wakes it and waking changes its behaviour.

**Music:** No score. The plants are the soundtrack, one voice per species dealt per campaign; hearing sharpens when the torch dies.

**Pulse timing:** Campaign clock only. Phase is locked for the duration of a run. Forecasting is researchable.

**Species names:** Generated once per campaign on first encounter and saved. Local generator by default; Claude API optional.

**Flora looks:** Body shape and colour are assigned per campaign from five body plans, so appearance never predicts behaviour across campaigns. Within a campaign a species always looks the same. Species that share a body plan get near-identical colours: mimics.

**Hurt feedback:** Getting hurt must be unmistakable: red screen edges pointing toward the source, a brief freeze on heavy hits, shake, the suit flashing, a heartbeat and draining colour at low health (playtest, Session 3).

**Noise:** Sprinting is loud; some plants shriek when touched; bursts are louder still. Sound-reactive plants go off when noise reaches them, so carelessness chains.

**Day/night:** Player-selectable mission launch time at surface. Deep ruins always have auxiliary lighting.

**Saving:** Run-based auto-save. Campaign progress preserved on extraction or death. Run inventory lost unless uplinked or cached.

**Length:** Target 8–12 hours. Architecture supports expansion.

**Reinforcements:** Rare and narrative-gated. 2–3 cryo-survivors, 1–2 prior-expedition survivors with high Exposure, 1 possible Warden stasis sleeper.

**Inventory:** Dedicated relic slots separate from main inventory. Field cache for surplus storage. Exo-frame upgrades expand capacity.

**Endings:** Three (Departure, Reinforcement, The Vault). Determined by cumulative campaign choices and research direction. Two failure states (base falls; roster spent).

**Species variety:** 5–6 flora and 2–4 fauna species per level, drawn from large pools. No visual telegraphing.

**Operative drift:** No metaphysical drift system. Simple medical Exposure with practical consequences.

**Relic balance:** Most relics are straightforwardly rewarding. A small specialty tier is situationally brilliant. A small risky tier carries real costs.

**Resupply:** Multi-layered. Field caches, limited supply drops, foraging, repairable Warden dispensers.

**Scope trim (Sept 2026):** Mechs and the Pilot specialisation cut. Cybernetics and prosthetics merged into Augments. Armour is T1–T3 plus Warden salvage variants. Drones reduced to three types. Seven specialisations.

---

## Later / Expansion

Cut from version 1 to protect scope and tone. Kept here so nothing is lost.

- **Mechs** — Assault, Siege and Recon frames; Warden Sentinel relic mech; the Pilot specialisation. Cut because they fight the cautious solo tone and need a second control scheme for surface-only content. If they return, they suit a separate surface-defence mode when encroachment threatens the base.
- **Medical drone** and **Engineering drone**
- **A fourth armour tier** — Warden salvage stays as relic variants instead
- **Field cybernetic boosters** (temporary stat consumables)
- **Mid-run Pulse shifts** — an "emission" moment where the phase changes during a run with a warning. Considered and deferred in favour of campaign-clock-only.
- **Desktop release** via Tauri or Electron
