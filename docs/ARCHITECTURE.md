# LudusAtlas architecture

## Boundary

LudusAtlas treats PlayCounter as an upstream tracking core rather than as an
implementation detail to rewrite.

```text
PlayCounter core
  process scanning -> process identifiers -> Community matching
  -> activity/session tracking -> completed-session observation

Stable LudusAtlas boundary
  canonical identity -> durable SQLite -> providers -> analytics -> Compass
```

The inherited core currently lives in the existing desktop store, tracker,
localStorage persistence, Community client/API, process scanners, and emulator
modules. New product-domain code should live under
`apps/desktop/src/ludusatlas/` and communicate through small adapters.

## Platform abstraction

Windows is the only current product and packaging target. macOS is a later
desktop target that should share this codebase. iOS and Android are explicitly
out of scope, so the repository does not maintain mobile icon or packaging
resources.

Rust exposes a `ProcessScanner` trait with cfg-selected Windows, macOS, and Linux
implementations. The scanner reports local observations: executable name/path,
PID, start time, and optional emulator context. Those observations answer what
is running on this device; they never define global game identity.

Canonical games, provider identities, achievements, analytics, Compass, and
database code must remain OS-neutral. Paths, executables, bundle identifiers,
credential storage, autostart, packaging, and notification details stay behind
platform adapters.

## Canonical identity

The durable model planned for Phase B separates:

- a stable UUID canonical game record
- external identities such as `steam:1245620`
- PlayCounter/Community references, including their source namespace
- device-local process observations
- explicit, persistent user-confirmed mappings

Numeric IDs from IGDB, Community, and Steam are never interchangeable. A
launcher executable is not a canonical game. Manual mappings override automatic
matching until explicitly changed.

## Durable database

Tauri SQL with SQLite is already linked in the Rust application. Phase B will
add ordered, explicit migrations and a small database service under the
LudusAtlas boundary. Planned durable entities include device identity, canonical
games, external identities, mappings, mirrored sessions, aggregate history,
provider synchronization state, achievement schemas/unlocks/rarity, and score
components.

Records use UUIDs where practical, UTC timestamps, provider namespaces, and a
device ID. Future synchronization is not implemented, but records must not
assume a single computer.

## Provider architecture

Steam will be the first implementation of generic library and achievement
provider interfaces. Remote Steam data is authoritative for owned-library and
achievement coverage, including uninstalled games. Credentials pass through a
`SecretStore` abstraction backed by the Windows credential system and later
macOS Keychain; secrets never enter localStorage, SQLite, logs, fixtures, or
backups.

## Compass

Compass is a deterministic local scoring pipeline:

1. explicit eligibility filtering
2. cached feature calculation
3. centralized weighted/nonlinear scoring
4. stored component scores
5. human-readable reasons
6. stable deterministic ranking

Installation state is a small convenience signal, not a hard requirement.
AI/LLM ranking and cloud synchronization are outside v1.

## Updates and releases

Phase A has no update feed. The updater dependency, plugin initialization,
endpoints, checks, installation UI, and updater artifacts are disabled.

Windows preview and release workflows build NSIS installers entirely with
GitHub-hosted infrastructure. Preview builds are short-lived Actions artifacts;
version-tagged builds become LudusAtlas GitHub releases. Pre-1.0 and semver
prerelease versions are marked as prereleases automatically. Neither workflow
deploys the inherited Community API, PlayCounter Azure resources, or the
archived PlayCounter landing site. The installer is not yet Authenticode-signed.

Re-enabling application self-update requires a LudusAtlas-owned code-signing
certificate, updater signing key, release manifest, rollback plan, and tests.
