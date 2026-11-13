# Forgotten: campaign prototype

A playable prototype of the part of the game that isn't built yet: the whole campaign. You run the base, send one person a day into the ruin, and hold the wire against the growth. The descent is abstracted to room-by-room choices, but it keeps the rules that matter to the campaign: knowledge is earned and is power, noise prices everything, and the haul only counts if it gets home.

It exists to answer one question before Sessions 11–17 are built in the real game: is the outer loop a game?

```bash
npm install
```

```bash
npm run build
```

Then open `dist/index.html`. `npm run check` runs the type-check and the tests.

## What it tries out

Each of these is a decision recorded at the top of `docs/game_design.md`.

- **The base is a place.** Seven modules. The growth takes them one at a time and you lose what they did.
- **Everyone has a job.** Whoever goes below doesn't do theirs that day.
- **Field knowledge is the defence manual.** The wire crew hold a species better the more the guide knows about it.
- **Burning it back works, and the Pulse climbs.** Nobody says why until the glyphs are read.
- **Hope has no bar.** Read the mess board. Wonders brought home lift it.
- **Grafts.** A piece cut from a plant you understand keeps doing what the plant does.
- **Relics are dealt.** The form says nothing. Use it and find out, or wait for the lab.
- **Chimeras** below the Threshold, and growth that shifts towards how you usually cross a room.
- **Your dead stay where they fell,** with what they carried.
- **The next expedition finds this one.**

## Layout

- `src/game.ts`: the campaign (base, jobs, lab, fabricator, growth, hope, days). Pure and seeded.
- `src/run.ts`: the descent.
- `src/data.ts`: content and tuning numbers (`TUNE`).
- `src/sim.test.ts`: two bot players (careless and careful) play forty campaigns each. Use the printed tallies when changing `TUNE`.
- `src/base.tsx`, `src/descent.tsx`, `src/main.tsx`, `src/portrait.tsx`: the screens (Preact).

## Balance as of the first build

From the bots, forty campaigns each: careless play loses the base in about 40 days with two or three dead; careful play lasts about 60 days and gets off the planet about one time in eight. The bots never reach the Vault, so the two Vault endings are untested by them.
