# PlayCounter upstream relationship

## Current base

| Field                | Value                                      |
| -------------------- | ------------------------------------------ |
| Upstream project     | PlayCounter                                |
| Upstream repository  | https://github.com/zntr1/PlayCounter       |
| Upstream remote      | `upstream`                                 |
| Current base commit  | `e7423dbf858dfaeb3b9252d7c47648d403ceef85` |
| Current base release | `v1.1.16`                                  |
| Last synchronization | 2026-09-11                                 |
| Fork repository      | https://github.com/collerim/LudusAtlas     |

The LudusAtlas fork foundation began from upstream `v1.1.5`. The first upstream
synchronization incorporated PlayCounter `v1.1.7`, including its session,
release-notes, emulator matching, contribution-status, and tour improvements.
Git history is intentionally preserved. LudusAtlas is an independent fork and
must not imply official affiliation with the PlayCounter maintainers.

The 2026-09-11 synchronization incorporates the 113 upstream commits through
`e7423db` (v1.1.16), preserving both published LudusAtlas commits. It adds
local library imports, optional launching/controller navigation, global hotkeys,
monitor-selectable popups, game details, and upstream tracking improvements.
The public backend/ingestion removal follows upstream; see `BACKEND.md`.
LudusAtlas remains version 0.1.0 with its own identity and disabled updater.

## Intentional divergence

The following areas are expected to diverge:

- Tauri product identity, bundle identifier, executable/library names, app
  icons, window/tray branding, and user-facing LudusAtlas strings
- updater and LudusAtlas-only GitHub release workflows
- LudusAtlas documentation and fork CI
- `apps/desktop/src/ludusatlas/` for durable database, canonical identity,
  providers, analytics, Compass, migration, and services
- thin integration hooks that mirror completed PlayCounter sessions or expose
  detected-game observations to the LudusAtlas boundary
- LudusAtlas backup extensions and safe PlayCounter migration behavior

Phase A currently changes the branding/configuration files, `backup.ts` identity
handling, update policy/UI, CI and Windows release workflows, and documentation.
The release workflows never deploy the inherited API, landing site, Azure
storage, or PlayCounter signing resources. The generated LudusAtlas icon source
is `assets/branding/ludusatlas-app-icon.png`.

The inherited `landing/` site and `scripts/landing-seo/` generator remain only
as guarded upstream history. Their Azure workflow is removed, and their scripts
fail closed during ordinary LudusAtlas development and publishing.

## Areas to keep close to upstream

Avoid modifying these unless an integration genuinely requires a narrow hook:

- OS process scanners under `apps/desktop/src-tauri/src/process/`
- `apps/desktop/src/tracker.ts`
- `apps/desktop/src/store.ts` and `persistence.ts`
- Community request/response contracts and API routes
- Community contribution, approval, rejection, and upgrade behavior
- emulator detection/resolution
- inherited local runtime/session semantics

Generic fixes that would benefit PlayCounter should be kept in separable
commits so they can be proposed upstream.

## Recommended update procedure

1. Confirm the working tree is clean and record the current LudusAtlas test
   baseline.
2. Run `git fetch upstream --tags`.
3. Select a reviewed PlayCounter release or commit; do not merge every upstream
   commit automatically.
4. Create `sync/playcounter-x.y.z` from LudusAtlas `main`.
5. Merge the selected upstream branch or tag with a normal Git merge. Do not
   rebase published LudusAtlas history.
6. Resolve conflicts by preserving LudusAtlas modules and the smallest possible
   upstream integration hooks.
7. Update the base commit, release, synchronization date, and divergence notes
   in this file.
8. Run the checklist below and smoke-test the Windows package before merging the
   synchronization branch.

## Conflict guidance

- Prefer upstream behavior in scanner, tracker, Community, and emulator code
  unless a documented LudusAtlas hook would be lost.
- Prefer LudusAtlas values in Tauri identity, branding, update configuration,
  secure storage, SQLite migrations, provider code, and Compass.
- Never restore a PlayCounter updater endpoint or PlayCounter bundle identifier
  during conflict resolution.
- Never equate a PlayCounter numeric game ID with an external provider ID.
- Keep localStorage compatibility keys and internal event names when changing
  them would create migration risk without product value.
- Re-run migration and Community tests after any conflict in backup,
  persistence, store, tracker, shared contracts, or API code.

## Post-merge checklist

- TypeScript typecheck and frontend/API builds
- Desktop and API unit tests
- Rust tests and `cargo check` on Windows and macOS
- Windows Tauri package smoke build
- app identifier remains `app.ludusatlas.desktop`
- no updater endpoint references PlayCounter releases
- process detection starts/stops sessions correctly
- unknown and ambiguous process flows still work
- Community match, suggestion, contribution status, rejection, and correction
  flows still work
- PlayCounter backup migration does not mutate source data or clone its install
  UUID
- existing milestone progress, backup import/export, emulator detection, tray,
  autostart, and notification behavior remain intact

## Automated boundary checks

Run `pnpm check:fork-boundaries` after every upstream merge. GitHub Actions also
runs this check for pull requests, `main` pushes, preview builds, and releases.
It blocks mobile files, inherited Azure publishing, PlayCounter release URLs in
release-sensitive code, non-Windows bundle targets, and changes to the
LudusAtlas product, executable, Rust package, updater, or version identity.

PlayCounter compatibility is intentionally not banned globally. The check
requires the legacy PlayCounter executable and installer patterns to remain in
the Windows ignored-process list, while the archived upstream landing scripts
must retain their explicit opt-in guard.
