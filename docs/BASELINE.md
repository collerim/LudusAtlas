# Foundation baseline

Baseline date: 2026-08-21 (Asia/Shanghai)

## Source state

- Branch: `main`
- Working tree before changes: clean
- Origin: `https://github.com/collerim/LudusAtlas.git`
- Upstream: `https://github.com/zntr1/PlayCounter.git`
- HEAD/upstream base: `7f6b7c0cad82616489ca38dcf53db679df2b3510`
- Release tag: `v1.1.5`

## Inspected areas

- monorepo/package manifests and version scripts
- Tauri configuration, capabilities, Rust startup/tray/filesystem commands,
  SQLite plugin registration, and updater registration
- Windows, macOS, and Linux `ProcessScanner` implementations
- tracker initialization, matching, Community upgrade and contribution polling,
  local/manual corrections, persistence, and session limits
- Community API request schemas, routes, shared contracts, and repository
  identity use
- backup transfer/import semantics and install UUID adoption
- existing Achievements UI and milestone implementation
- GitHub deployment/build workflows and dormant macOS build definition

## Untouched baseline results

| Check                              | Result                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| Shared TypeScript build            | passed                                                  |
| Desktop unit tests                 | 28 files, 254 tests passed                              |
| API unit tests                     | 3 files passed, 1 skipped; 21 passed, 10 skipped        |
| Desktop TypeScript build/typecheck | passed                                                  |
| API TypeScript build               | passed                                                  |
| Vite production frontend build     | passed (1,771 modules)                                  |
| Rust tests/check/Tauri package     | not run: no Rust toolchain is installed on this machine |

The Vite build emitted an existing Tailwind warning when invoked directly from
the sandbox shell because the shell could not enter the OneDrive directory; the
build still completed. No source test failed before LudusAtlas changes.

The repository pins pnpm 9.15.4. The bundled workspace runner provides pnpm 11,
whose package-manager shim attempted dependency reinstalls and rejected esbuild
postinstall scripts. Equivalent repository-local TypeScript, Vitest, and Vite
binaries were invoked directly for the baseline. CI uses the pinned pnpm 9
version and is not subject to that local shim mismatch.

## PlayCounter v1.1.7 synchronization verification

Synchronization date: 2026-08-22 (Asia/Shanghai)

- Upstream commit: `1329e0c481d911fe7fca42ac6fc30363de2eae10`
- Upstream release: `v1.1.7`
- LudusAtlas version: `0.1.0`
- Product identity, backup isolation, disabled updater, and Windows-only release
  boundaries retained
- PlayCounter v1.1.7 session management, release notes, emulator matching,
  emulator contribution status, and expanded emulator guide retained

| Check                           | Result                                           |
| ------------------------------- | ------------------------------------------------ |
| Shared TypeScript typecheck     | passed                                           |
| Desktop unit tests              | 34 files, 298 tests passed                       |
| API unit tests                  | 3 files passed, 1 skipped; 23 passed, 11 skipped |
| Desktop TypeScript typecheck    | passed                                           |
| API TypeScript typecheck        | passed                                           |
| IGDB seed TypeScript typecheck  | passed                                           |
| API TypeScript build            | passed                                           |
| IGDB seed TypeScript build      | passed                                           |
| Vite production frontend build  | passed (1,776 modules)                           |
| Fork boundary checks            | passed                                           |
| Desktop version synchronization | passed (`0.1.0`)                                 |
| Rust tests/check/Tauri package  | not run: no Rust toolchain is installed locally  |

The GitHub CI and preview workflows run Rust validation and the native Tauri
NSIS build on Windows, so the locally unavailable native verification remains
part of the repository gate.
