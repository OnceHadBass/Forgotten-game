# Save schema

Campaign saves are JSON. Settings are stored separately and never travel with a campaign.

## Where saves live

IndexedDB database `alien-roguelite`, object store `kv`, string values:

| Key | Value |
|---|---|
| `slot:1` … `slot:3` | A save file (below), compact JSON |
| `slot:N:backup` | The previous valid save for that slot, written before every overwrite |
| `meta` | `{ "lastSlot": N }` — the slot Continue offers |
| `settings` | Settings JSON (see `src/game/settings.ts`), normalised on load |

If IndexedDB is unavailable or fails a write probe, an in-memory store is used and the title screen warns that saves won't be kept.

## Save file — version 5 (current)

```jsonc
{
  "format": "alien-roguelite/campaign",   // identifies the file; anything else is rejected
  "saveVersion": 5,                        // schema version; drives migrations
  "gameVersion": "0.10.0",                  // build that wrote it (informational)
  "savedAt": "2026-09-26T16:46:00.000Z",
  "campaign": {
    "id": "k3x9…-mfz…",                    // stable identity, survives export/import
    "seed": 3141592653,                    // uint32, fixed for the campaign
    "rngState": 3141592653,                // uint32, position of the master random stream
    "designation": "ZE-8041 d",            // bureaucratic planet designation
    "createdAt": "2026-09-26T16:40:00.000Z",
    "day": 1,                              // integer ≥ 1; advances at base (Session 11+)
    "playTimeSeconds": 254.3,
    "operative": {                         // stand-in until the roster (Session 14)
      "callsign": "OP-07",
      "name": "Ruth Achterberg",
      "specialisation": "Demolitions"
    },
    "supplies": {
      "medkits": 9                         // base stock; each run takes up to 3
    },
    "stats": {
      "runsStarted": 2,
      "runsLost": 1,                       // runs where the operative died
      "runsExtracted": 1,                  // runs that ended with the lift back up
      "runsAbandoned": 0,                  // runs quit from the menu (haul left behind)
      "downs": 3,
      "medkitsUsed": 4,
      "distanceMetres": 412.8,
      "torchSeconds": 190.2
    },
    "fieldGuide": {                        // keyed by species id; an entry appears on first sighting
      "needle_fan": {
        "name": "Vesper veil",             // generated once, never changed
        "binomial": "Hylia lacrimosa",
        "firstSeenDay": 1,
        "scans": 1,                        // scanning reveals senses and links…
        "senses": ["presence", "light"],   // …hearing | light | presence | touch
        "links": "none",                   // kin | all | none; null until scanned
        "seen": {                          // behaviours witnessed (operative or probe), by mood
          "spines": { "asleep": true, "awake": false }
        },
        "sampled": false                   // true: everything known
      }
    },
    "samples": {                           // at base, by species (carried samples arrive on extraction)
      "velvet_moss": 1
    },
    "materials": {                         // at base, by item id (src/data/items); extraction only
      "warden_alloy": 3,
      "glyph_plate": 1
    },
    "sites": {                             // what's known of each site, by site id
      "warden_ruin": { "deepest": 2 }      // deepest layer reached (integer ≥ 1)
    },
    "caches": {                            // field caches, by "<level id>:<col>,<row>"
      "warden_ruin:1:14,22": {
        "items": { "warden_alloy": 2, "field_dressing": 1, "pistol_rounds": 2 },  // medkits and clips of 8 as items
        "disturbed": false                 // something got in since last opened (shown once)
      }
    }
  }
}
```

Run state (operative position, torch battery, anything carried) is never saved. Loading a campaign always starts a fresh run.

Medkits carried on a run have already left `supplies.medkits`. How a run ends decides what comes back:

- **Extracted** (the lift): unused medkits, samples and the pack's contents join the base stock.
- **Abandoned** (quit from the menu): unused medkits come back; samples and the pack are left behind. (0.9.1 briefly let quitting keep the haul; 0.10 restored this rule.)
- **Uplinked** mid-run (Session 10): samples and glyph readings sent from a relay join the base stock at once and are saved straight away, whatever happens after.
- **Lost** (death): nothing comes back.

Closing the page mid-run settles nothing, so it counts as losing the carried medkits. `sites.<id>.deepest` is written the moment a deeper layer is reached. Field-guide knowledge is written into the campaign as it's learned, so a save made mid-run includes it and death doesn't erase it. A save made mid-run (pause → Save, or the page being hidden) therefore shows the base stock without the carried kits.

## Version 4 (Session 9)

As version 5 without `caches`. The v4 → v5 migration adds it, empty.

## Version 3 (Session 6)

As version 4 without `materials`, `sites`, `stats.runsExtracted` and `stats.runsAbandoned`. The v3 → v4 migration adds them empty (zero).

## Version 2 (Session 3)

As version 3 without `fieldGuide` and `samples`. The v2 → v3 migration adds both, empty.

## Version 1 (Session 2)

As version 2 without `supplies` and without `stats.runsLost`, `stats.downs`, `stats.medkitsUsed`. The v1 → v2 migration adds `supplies: { medkits: 12 }` (the full starting stock) and zeroes the three new stats.

## Loading pipeline

1. `JSON.parse` — failure: "The save data couldn't be read…"
2. `format` check — failure: "This isn't a campaign save from this game."
3. `migrate()` from the file's `saveVersion` to `SAVE_VERSION` — a newer file is refused with "…comes from a newer version of the game…"
4. `validateSaveFile()` — every field type-checked; failure lists the first problems ("The save is damaged: campaign.day should be at least 1").

A slot that fails any step shows as **Damaged save** with Export (raw text), Delete, and Restore previous save when the backup is valid.

## Changing the schema

1. Bump `SAVE_VERSION` in `src/game/save/schema.ts`
2. Add a migration keyed by the *old* version in `src/game/save/migrations.ts` (never edit a shipped one)
3. Update `validateSaveFile()` and the `Campaign` type
4. Add a test in `migrations.test.ts` that upgrades a real old-version file
5. Add a "Version N" section to this document and move "(current)" to it

## History

| Version | Build | Change |
|---|---|---|
| 1 | 0.2.0 (Session 2) | First format |
| 2 | 0.3.0 (Session 3) | Base medkit stock; downs, lost runs and medkits used |
| 3 | 0.6.0 (Session 6) | Field guide (names, senses, links, witnessed behaviour, sampled) and base sample store |
| 4 | 0.9.0 (Session 9) | Base material store, sites (deepest layer reached), extracted and abandoned run counts |
| 5 | 0.10.0 (Session 10) | Field caches |
