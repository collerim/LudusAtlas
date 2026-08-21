import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files = {
  rootPackage: "package.json",
  desktopPackage: "apps/desktop/package.json",
  tauriConfig: "apps/desktop/src-tauri/tauri.conf.json",
  cargoManifest: "apps/desktop/src-tauri/Cargo.toml",
  tauriCapabilities: "apps/desktop/src-tauri/capabilities/default.json",
  updaterPolicy: "apps/desktop/src/updater.ts",
  backup: "apps/desktop/src/backup.ts",
  backupTest: "apps/desktop/src/backup.test.ts",
  ignoredWindowsProcesses:
    "apps/desktop/src-tauri/resources/ignored-processes/windows.txt",
  archivedLandingBuild: "scripts/landing-seo/build.mjs",
  archivedLandingIndexNow: "scripts/landing-seo/indexnow.mjs",
};

const failures = [];
const gitSafeDirectory = process.cwd().replaceAll("\\", "/");
const trackedFiles = [
  ...new Set(
    execFileSync(
      "git",
      ["-c", `safe.directory=${gitSafeDirectory}`, "ls-files", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean)
      .map(normalizePath),
  ),
];

checkNoMobileFiles();
await checkNoConflictMarkers();
await checkWorkflows();
await checkProductIdentity();
await checkUpdaterBoundary();
await checkCompatibilityAllowlist();
await checkBackupCompatibility();
await checkArchivedLandingBoundary();
await checkSensitiveReleaseReferences();

if (failures.length > 0) {
  process.stderr.write(
    `LudusAtlas fork-boundary checks failed:\n${failures
      .map((failure) => `  - ${failure}`)
      .join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write("LudusAtlas fork boundaries are intact.\n");

function checkNoMobileFiles() {
  const mobileFiles = trackedFiles.filter((path) =>
    /(^|\/)(android|ios)(\/|$)/i.test(path),
  );

  if (mobileFiles.length > 0) {
    fail(
      `Mobile files are tracked even though LudusAtlas is Windows-only: ${mobileFiles.join(", ")}`,
    );
  }
}

async function checkNoConflictMarkers() {
  const startMarker = "<".repeat(7);
  const middleMarker = "=".repeat(7);
  const endMarker = ">".repeat(7);

  for (const path of trackedFiles) {
    const contents = await readText(path, false);
    if (contents === undefined || contents.includes("\0")) continue;

    if (
      contents.includes(startMarker) &&
      contents.includes(middleMarker) &&
      contents.includes(endMarker)
    ) {
      fail(`${path} still contains unresolved merge conflict markers.`);
    }
  }
}

async function checkWorkflows() {
  const workflowFiles = trackedFiles.filter((path) =>
    /^\.github\/workflows\/.*\.ya?ml$/i.test(path),
  );

  for (const path of workflowFiles) {
    const contents = await readText(path);
    if (contents === undefined) continue;

    rejectMatch(
      path,
      contents,
      /azure\/(?:static-web-apps-deploy|webapps-deploy)|azure_static_web_apps|azure-static-web-apps/i,
      "inherited Azure deployment",
    );
    rejectMatch(
      path,
      contents,
      /github\.com\/zntr1\/PlayCounter\/releases/i,
      "PlayCounter release URL",
    );
    rejectMatch(
      path,
      contents,
      /\bPlayCounter(?:-[^\s"']*)?\.exe\b/i,
      "PlayCounter executable or installer",
    );
    rejectMatch(
      path,
      contents,
      /scripts[\\/]landing-seo|(?:^|[\s"'])landing[\\/]/im,
      "archived PlayCounter landing deployment",
    );
  }

  await requireText(
    ".github/workflows/prod-deploy.yml",
    [/runs-on:\s*windows-latest/i, /ludusatlas\.exe/i, /LudusAtlas-Setup/i],
    "Windows LudusAtlas release safeguards",
  );
  await requireText(
    ".github/workflows/test-deploy.yml",
    [/runs-on:\s*windows-latest/i, /ludusatlas\.exe/i, /LudusAtlas-Windows/i],
    "Windows LudusAtlas preview safeguards",
  );
}

async function checkProductIdentity() {
  const rootPackage = await readJson(files.rootPackage);
  const desktopPackage = await readJson(files.desktopPackage);
  const tauriConfig = await readJson(files.tauriConfig);
  const cargoManifest = await readText(files.cargoManifest);

  if (rootPackage?.name !== "ludusatlas") {
    fail(`${files.rootPackage} must keep the package name ludusatlas.`);
  }
  if (tauriConfig?.productName !== "LudusAtlas") {
    fail(`${files.tauriConfig} must keep productName set to LudusAtlas.`);
  }
  if (tauriConfig?.identifier !== "app.ludusatlas.desktop") {
    fail(
      `${files.tauriConfig} must keep identifier set to app.ludusatlas.desktop.`,
    );
  }
  if (tauriConfig?.bundle?.createUpdaterArtifacts !== false) {
    fail(`${files.tauriConfig} must keep updater artifacts disabled.`);
  }

  const bundleTargets = tauriConfig?.bundle?.targets;
  if (
    !Array.isArray(bundleTargets) ||
    bundleTargets.length !== 1 ||
    bundleTargets[0] !== "nsis"
  ) {
    fail(`${files.tauriConfig} must target only the Windows NSIS installer.`);
  }

  const cargoName = cargoManifest?.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  const cargoVersion = cargoManifest?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  const cargoLibrary = cargoManifest?.match(
    /^\[lib\]\s*\r?\nname\s*=\s*"([^"]+)"/m,
  )?.[1];

  if (cargoName !== "ludusatlas") {
    fail(`${files.cargoManifest} must keep the Rust package name ludusatlas.`);
  }
  if (cargoLibrary !== "ludusatlas_lib") {
    fail(
      `${files.cargoManifest} must keep the Rust library name ludusatlas_lib.`,
    );
  }

  const versions = new Map([
    [files.rootPackage, rootPackage?.version],
    [files.desktopPackage, desktopPackage?.version],
    [files.tauriConfig, tauriConfig?.version],
    [files.cargoManifest, cargoVersion],
  ]);
  const uniqueVersions = new Set([...versions.values()].filter(Boolean));
  if (
    [...versions.values()].some((version) => !version) ||
    uniqueVersions.size !== 1
  ) {
    fail(
      `LudusAtlas version metadata must stay independent and synchronized: ${[
        ...versions,
      ]
        .map(([path, version]) => `${path}=${version ?? "missing"}`)
        .join(", ")}`,
    );
  }
}

async function checkUpdaterBoundary() {
  await requireText(
    files.updaterPolicy,
    [
      /automaticChecksEnabled:\s*false/,
      /manualChecksEnabled:\s*false/,
      /releaseFeedConfigured:\s*false/,
    ],
    "disabled LudusAtlas updater policy",
  );

  const capabilities = await readJson(files.tauriCapabilities);
  const updaterPermissions = Array.isArray(capabilities?.permissions)
    ? capabilities.permissions.filter(
        (permission) =>
          typeof permission === "string" && permission.startsWith("updater:"),
      )
    : [];
  if (updaterPermissions.length > 0) {
    fail(
      `${files.tauriCapabilities} must not declare updater permissions: ${updaterPermissions.join(", ")}`,
    );
  }

  const desktopPackage = await readJson(files.desktopPackage);
  if (
    desktopPackage?.dependencies?.["@tauri-apps/plugin-updater"] ||
    desktopPackage?.devDependencies?.["@tauri-apps/plugin-updater"]
  ) {
    fail(
      `${files.desktopPackage} must not depend on the Tauri updater plugin.`,
    );
  }

  const cargoManifest = await readText(files.cargoManifest);
  if (/^tauri-plugin-updater\s*=/m.test(cargoManifest ?? "")) {
    fail(`${files.cargoManifest} must not depend on tauri-plugin-updater.`);
  }
}

async function checkCompatibilityAllowlist() {
  const contents = await readText(files.ignoredWindowsProcesses);
  if (contents === undefined) return;

  const entries = new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#")),
  );

  for (const required of [
    "playcounter.exe",
    "playcounter*-setup.exe",
    "ludusatlas.exe",
    "ludusatlas*-setup.exe",
  ]) {
    if (!entries.has(required)) {
      fail(
        `${files.ignoredWindowsProcesses} must retain compatibility entry ${required}.`,
      );
    }
  }
}

async function checkBackupCompatibility() {
  await requireText(
    files.backup,
    [
      /app:\s*"PlayCounter"\s*\|\s*"LudusAtlas"/,
      /if\s*\(envelope\.app\s*===\s*"PlayCounter"\)/,
      /delete\s+data\.installUuid/,
      /delete\s+data\.contributionOwnerUuid/,
    ],
    "safe PlayCounter backup migration",
  );
  await requireText(
    files.backupTest,
    [
      /imports PlayCounter durable data without cloning its Community identity/,
      /expect\(imported\)\.not\.toHaveProperty\("installUuid"\)/,
      /expect\(imported\)\.not\.toHaveProperty\("contributionOwnerUuid"\)/,
    ],
    "PlayCounter backup identity regression coverage",
  );
}

async function checkArchivedLandingBoundary() {
  for (const path of [
    files.archivedLandingBuild,
    files.archivedLandingIndexNow,
  ]) {
    await requireText(
      path,
      [/ALLOW_ARCHIVED_PLAYCOUNTER_LANDING\s*!==\s*"1"/],
      "explicit archived-landing opt-in guard",
    );
  }
}

async function checkSensitiveReleaseReferences() {
  const sensitiveFiles = trackedFiles.filter(
    (path) =>
      path === "package.json" ||
      path.startsWith(".github/") ||
      path.startsWith("apps/desktop/") ||
      path.startsWith("scripts/ci/"),
  );

  for (const path of sensitiveFiles) {
    const contents = await readText(path, false);
    if (contents === undefined || contents.includes("\0")) continue;

    rejectMatch(
      path,
      contents,
      /github\.com\/zntr1\/PlayCounter\/releases/i,
      "PlayCounter updater or release URL",
    );
  }
}

async function requireText(path, patterns, description) {
  const contents = await readText(path);
  if (contents === undefined) return;

  for (const pattern of patterns) {
    if (!pattern.test(contents)) {
      fail(`${path} is missing required ${description}: ${pattern}`);
    }
  }
}

function rejectMatch(path, contents, pattern, description) {
  if (pattern.test(contents)) {
    fail(`${path} contains forbidden ${description}.`);
  }
}

async function readJson(path) {
  const contents = await readText(path);
  if (contents === undefined) return undefined;

  try {
    return JSON.parse(contents);
  } catch (error) {
    fail(
      `${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

async function readText(path, required = true) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (required) {
      fail(
        `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return undefined;
  }
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function fail(message) {
  failures.push(message);
}
