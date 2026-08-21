# Data ownership, migration, and secrets

## Current ownership

| Data                           | Current owner                              | Notes                                                                         |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Runtime tracker state          | PlayCounter-compatible localStorage        | Kept for upstream mergeability                                                |
| Recent sessions                | PlayCounter-compatible localStorage        | Normalized, minimum 60 seconds, capped at 2,500                               |
| Older playtime                 | localStorage aggregates                    | `archivedSeconds` and per-game aggregates; not reconstructed as fake sessions |
| Process/game match cache       | localStorage                               | Includes Community/manual compatibility state                                 |
| Milestones                     | localStorage                               | Existing user progress is preserved                                           |
| Ignored process file           | app-data filesystem                        | Device-local; excluded from transfer backups                                  |
| Install UUID                   | app-data file plus localStorage projection | Anonymous Community idempotency identity                                      |
| LudusAtlas durable domain data | SQLite, planned Phase B                    | Schema and migrations not created in Phase A                                  |

The localStorage key remains `playcounter:v1` inside LudusAtlas's separate Tauri
data partition. Retaining the internal key avoids a risky upstream persistence
rewrite; the distinct bundle identifier keeps official PlayCounter data
separate.

## Backup envelope

LudusAtlas currently retains the `playcounter-backup` format/version-2 envelope
for compatibility and writes `app: "LudusAtlas"`. Transfer data deliberately
excludes active/ambiguous runtime state, machine-local blacklist decisions,
notifications, and delivery markers. It retains durable sessions, cached
matches, settings, milestones, and contribution acknowledgement state.

A LudusAtlas import first writes a recoverable snapshot of current data. A
PlayCounter backup is read through the same structured JSON envelope and is
never modified. Its `installUuid` and `contributionOwnerUuid` are removed before
writing LudusAtlas data, so both installed apps cannot share one anonymous
Community identity. The remaining imported state is normalized and the app is
reloaded.

Direct parsing or mutation of WebView/Chromium LevelDB is explicitly out of
scope. First-run discovery and polished migration UI remain Phase B work.

## SQLite migration policy

Phase B will add a migration ledger and ordered SQL migrations. Every schema
change must be forward-applied; users must never be told to delete their
database. Session mirroring needs stable IDs or deterministic deduplication,
UTC timestamps, a source/device ID, and preservation of archived aggregate
playtime without inventing unavailable historical sessions.

## Secrets

Steam Web API keys and future provider secrets must never be stored in source,
Git, localStorage, plaintext SQLite, logs, errors, crash reports, tests, or
backup files. Only an OS-backed `SecretStore` may persist them. SteamID64 and
non-secret provider settings may live in SQLite or ordinary settings, but no
personal values are committed.

## Future backup/sync

A later LudusAtlas backup may combine the PlayCounter-compatible durable
projection with a versioned export of the SQLite domain database. Secrets remain
excluded. Future sync records will use stable UUIDs, UTC timestamps, explicit
provider namespaces, device IDs, and conflict metadata; no sync server is part
of v1.
