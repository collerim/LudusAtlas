# LudusAtlas

**A personal game atlas built on PlayCounter's activity-tracking core.**

LudusAtlas is a long-term, cross-platform desktop product for automatic game
activity tracking, a durable personal library and history, platform
achievements, completion analytics, and explainable recommendations through
Compass. Windows is the first production target. The architecture is kept
compatible with a future macOS build from the same Tauri, React, TypeScript,
and Rust codebase. LudusAtlas does not target iOS or Android; no mobile app is
planned or maintained.

The project is in active fork development. The current foundation preserves
PlayCounter tracking and Community compatibility; the LudusAtlas SQLite,
Steam Web API, platform-achievement, canonical-identity, and Compass phases are not yet
complete.

## Relationship to PlayCounter

LudusAtlas is based on the open-source
[PlayCounter](https://github.com/zntr1/PlayCounter) project by zntr1 and keeps
its Git history. PlayCounter remains the upstream project and provides the
process scanners, activity/session tracking, emulator detection, local
compatibility state, and Community process-identification flow.

LudusAtlas is an independent fork. It is not an official PlayCounter release
and is not affiliated with or endorsed by PlayCounter's maintainers. The MIT
license and upstream attribution are preserved in [LICENSE](./LICENSE) and
[docs/UPSTREAM.md](./docs/UPSTREAM.md).

## Current foundation

- Automatic process-based activity tracking on Windows
- Existing macOS and Linux scanner abstractions retained as upstream internals;
  they are not current release targets
- PlayCounter Community matching, manual correction, contribution, and status
  polling retained without a protocol fork
- Existing local session history, emulator support, milestones, and
  PlayCounter-compatible JSON backup handling retained
- A separate application identifier (`app.ludusatlas.desktop`) so LudusAtlas
  and PlayCounter use different application-data locations
- Safe PlayCounter backup import: durable data transfers, but the PlayCounter
  install/contribution UUID is not cloned into LudusAtlas
- Automatic and manual application updates disabled until LudusAtlas has its
  own separately signed release feed

## Steam status

The inherited local Steam library importer is available, alongside Xbox import,
optional direct game launching, controller navigation, and global hotkeys.
See [STEAM_LOCAL_DATA.md](./STEAM_LOCAL_DATA.md) for local Steam data handling.

Steam Web API integration is a planned library and achievement provider. The future
setup will require a SteamID64 and a Steam Web API key, with the API key stored
in OS-backed secure credential storage. No real Steam credential should be
placed in source code, Git, localStorage, plaintext SQLite, logs, fixtures, or
chat.

Steam Web API synchronization and platform achievements are not implemented in
the current foundation phase.

## Privacy and local data

- Activity tracking and play history remain local to the device.
- Community matching sends only the process identifiers required by the
  existing PlayCounter protocol. On Windows this is the executable filename,
  never its full path.
- Community contributions and feedback are sent only through the existing user
  actions and preferences.
- A random LudusAtlas install UUID is used as a pseudonymous installation key; a
  PlayCounter UUID is not copied during migration. Inherited presence reporting
  sends this ID at startup and hourly, including while running in the tray.
  Presence reports do not include game names or play history.
- Local Steam import sends selected AppIDs for metadata resolution, without
  uploading account names, playtime, or install paths.
- Secrets are excluded from the existing backup format and from the planned
  LudusAtlas durable-data backup design.

See [docs/DATA.md](./docs/DATA.md) for current ownership boundaries and
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the phased architecture.

## Project structure

| Path              | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `apps/desktop`    | Tauri 2 + React 19 + TypeScript desktop application       |
| `packages/shared` | Shared PlayCounter API and model contracts                |
| `landing`         | Guarded PlayCounter archive; never deployed by LudusAtlas |

The upstream public backend and ingestion tools were removed in the v1.1.16
synchronization; their historical MIT source remains in Git history. See
[BACKEND.md](./BACKEND.md) for the upstream boundary.

## Development

Requirements: Node.js 22, pnpm 9.15.4 through Corepack, the Rust toolchain, and
the Tauri prerequisites for Windows.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check:fork-boundaries
pnpm turbo run test typecheck build
pnpm desktop:dev
```

## Windows preview and release builds

LudusAtlas release automation is self-contained in this repository and never
deploys the inherited API, PlayCounter Azure resources, or the archived landing
site.

- **Preview:** run `Build LudusAtlas Windows preview` from GitHub Actions. It
  builds an NSIS installer and stores it as a 14-day workflow artifact.
- **Release:** synchronize the desktop version with
  `pnpm desktop:version <version>`, commit it, then push the matching tag (for
  example `v0.1.0`). `Release LudusAtlas for Windows` validates the tag, builds
  the installer, creates a checksum, and publishes a GitHub release. Versions
  below 1.0 and versions with prerelease suffixes are marked as prereleases;
  stable 1.x versions are published as normal releases.
- The release workflow can also be started manually with the configured version
  as its input.

Development installers are currently unsigned and Windows may show an
unknown-publisher or SmartScreen warning. Application self-update remains
disabled until LudusAtlas has its own Authenticode certificate and separately
signed updater feed.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Data ownership and migration](./docs/DATA.md)
- [Upstream synchronization](./docs/UPSTREAM.md)
- [Foundation baseline](./docs/BASELINE.md)

## License

MIT. See [LICENSE](./LICENSE). LudusAtlas includes and modifies work from
PlayCounter, Copyright (c) zntr1, used under the MIT License.
