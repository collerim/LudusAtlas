import {
  AlertTriangle,
  Download,
  FolderInput,
  FolderOpen,
  Gamepad2,
  Info,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import type { LibraryProviderId } from "@playcounter/shared";
import {
  chooseEmulatorBinary,
  forgetImportedLibraryData,
  forgetEmulatorManualBinary,
  openUserIgnoredProcessesFolder,
  reloadIgnoredProcesses,
  setEmulatorIgnored,
} from "../../tracker";
import { emulatorAssetUrls } from "../../emulators/assets";
import { adapterFor } from "../../emulators/registry";
import { exportLocalData, importLocalData } from "../../backup";
import { useAppStore, useIsOffline } from "../../store";
import { UPDATE_POLICY } from "../../updater";
import { Panel, ProviderBadge } from "../components";
import { Button, Modal } from "../primitives";
import { DEFAULT_ACCENT_COLOR } from "../../theme";
import { currentPlatform } from "../../platform";
import { previewDesktopOverlay } from "../../desktopOverlayBridge";
import { DesktopOverlayMonitorSelect } from "../DesktopOverlayMonitorSelect";
import { HotkeyInput } from "../HotkeyInput";
import type { DesktopOverlayKind } from "../../desktopOverlays";
import { TutorialSettingsPanel } from "../tour/TourUI";
import { resolveEmulatorBinary } from "../../emulatorLaunch";
import { launchFileBaseName } from "../../gameLaunch";
import { findReleaseNote } from "../../releaseNotes";

type LaunchFileForgetScope = "executables" | "emulators" | "all";

const OVERLAY_PREVIEWS: ReadonlyArray<readonly [DesktopOverlayKind, string]> = [
  ["action-required", "Choice required"],
  ["first-detection", "First detection"],
  ["session-start", "Game start"],
  ["session-summary", "Session summary"],
  ["current-session", "Current session"],
  ["milestone", "Milestone"],
  ["discovery", "Discovery"],
];

export function SettingsView() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [uuidInfoOpen, setUuidInfoOpen] = useState(false);
  const [startupSyncing, setStartupSyncing] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [reloadingIgnored, setReloadingIgnored] = useState(false);
  const [confirmForgetLibrary, setConfirmForgetLibrary] =
    useState<LibraryProviderId | null>(null);
  const [confirmForgetLaunchFiles, setConfirmForgetLaunchFiles] =
    useState<LaunchFileForgetScope | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [emulatorSyncing, setEmulatorSyncing] = useState<string | null>(null);
  const isOffline = useIsOffline();
  const installUuid = useAppStore((state) => state.installUuid);
  const settings = useAppStore((state) => state.settings);
  const setLaunchOnStartup = useAppStore((state) => state.setLaunchOnStartup);
  const setShowDurationDays = useAppStore((state) => state.setShowDurationDays);
  const setAutoShareIgnoredProcesses = useAppStore(
    (state) => state.setAutoShareIgnoredProcesses,
  );
  const setEmulatorSetting = useAppStore((state) => state.setEmulatorSetting);
  const setDesktopOverlaySetting = useAppStore(
    (state) => state.setDesktopOverlaySetting,
  );
  const setLauncherSetting = useAppStore((state) => state.setLauncherSetting);
  const forgetExecutableLaunchTargets = useAppStore(
    (state) => state.forgetExecutableLaunchTargets,
  );
  const forgetEmulatorLaunchTargets = useAppStore(
    (state) => state.forgetEmulatorLaunchTargets,
  );
  const executableLaunchTargetCount = useAppStore(
    (state) => state.launchTargets.size + state.manualLaunchTargets.size,
  );
  const importedSteamCount = useAppStore((state) => {
    let count = 0;
    for (const entry of state.libraryImports.values()) {
      if (entry.provider === "steam") count += 1;
    }
    return count;
  });
  const importedXboxCount = useAppStore((state) => {
    let count = 0;
    for (const entry of state.libraryImports.values()) {
      if (entry.provider === "xbox") count += 1;
    }
    return count;
  });
  const forgetLibraryLabel = confirmForgetLibrary === "xbox" ? "Xbox" : "Steam";
  const emulatorLaunchTargetCount = useAppStore(
    (state) =>
      state.emulatorAutoBinaries.size +
      state.emulatorManualBinaries.size +
      state.emulatorAutoLaunchTargets.size +
      state.emulatorManualLaunchTargets.size +
      state.emulatorLaunchCandidates.size,
  );
  const emulatorAutoBinaries = useAppStore(
    (state) => state.emulatorAutoBinaries,
  );
  const emulatorManualBinaries = useAppStore(
    (state) => state.emulatorManualBinaries,
  );
  const setAccentColor = useAppStore((state) => state.setAccentColor);
  const knownEmulators = useAppStore((state) => state.knownEmulators);
  const ignoredProcessCount = useAppStore(
    (state) => state.ignoredProcesses.size,
  );
  const userIgnoredProcessesPath = useAppStore(
    (state) => state.userIgnoredProcessesPath,
  );
  const addToast = useAppStore((state) => state.addToast);
  const openCurrentReleaseNotes = useAppStore(
    (state) => state.openCurrentReleaseNotes,
  );

  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncStartupState() {
      setStartupSyncing(true);
      setStartupError(null);
      try {
        const enabled = await isEnabled();
        if (!cancelled) setLaunchOnStartup(enabled);
      } catch (error) {
        if (!cancelled) setStartupError(formatError(error));
      } finally {
        if (!cancelled) setStartupSyncing(false);
      }
    }

    void syncStartupState();

    return () => {
      cancelled = true;
    };
  }, [setLaunchOnStartup]);

  async function handleLaunchOnStartupChange(enabled: boolean) {
    setStartupSyncing(true);
    setStartupError(null);

    try {
      if (enabled) await enable();
      else await disable();
      setLaunchOnStartup(enabled);
    } catch (error) {
      setStartupError(formatError(error));
    } finally {
      setStartupSyncing(false);
    }
  }

  async function handleEmulatorIgnored(emulatorId: string, ignored: boolean) {
    setEmulatorSyncing(emulatorId);
    try {
      await setEmulatorIgnored(emulatorId, ignored);
      addToast({
        tone: "success",
        title: ignored ? "Emulator ignored" : "Emulator enabled",
        detail: ignored
          ? "LudusAtlas will hide this emulator and stop detecting games inside it. Existing games and history are kept."
          : "LudusAtlas will detect games inside this emulator again.",
      });
    } catch (error) {
      addToast({
        tone: "error",
        title: "Emulator setting failed",
        detail: formatError(error),
      });
    } finally {
      setEmulatorSyncing(null);
    }
  }

  async function handleChooseEmulatorBinary(emulatorId: string) {
    try {
      const binary = await chooseEmulatorBinary(emulatorId);
      if (!binary) return;
      addToast({
        tone: "success",
        title: "Emulator program saved",
        detail: `${launchFileBaseName(binary.exePath)} can now be used to start emulator games.`,
      });
    } catch (error) {
      addToast({
        tone: "error",
        title: "Emulator program not set",
        detail: formatError(error),
      });
    }
  }

  function handleForgetEmulatorBinary(emulatorId: string, label: string) {
    forgetEmulatorManualBinary(emulatorId);
    addToast({
      tone: "info",
      title: "Emulator program forgotten",
      detail: `LudusAtlas will learn ${label} again when it sees it running.`,
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportLocalData();
      if ("cancelled" in result) return;
      addToast({
        tone: "success",
        title: "Backup exported",
        detail: result.path,
      });
    } catch (error) {
      addToast({
        tone: "error",
        title: "Export failed",
        detail: formatError(error),
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await importLocalData();
      if ("cancelled" in result) return;
      // On success the window reloads, so this toast is best-effort.
      addToast({
        tone: "success",
        title: "Backup imported",
        detail: `${result.sessions} sessions restored. Reloading…`,
      });
    } catch (error) {
      addToast({
        tone: "error",
        title: "Import failed",
        detail: formatError(error),
      });
    } finally {
      setImporting(false);
    }
  }

  const installedReleaseNote = findReleaseNote(appVersion);
  const displayedEmulators = new Map(knownEmulators);
  for (const rawEmulatorId of settings.ignoredEmulatorIds ?? []) {
    const emulatorId = rawEmulatorId.trim().toLowerCase();
    if (!emulatorId || displayedEmulators.has(emulatorId)) continue;
    const adapter = adapterFor(emulatorId);
    displayedEmulators.set(emulatorId, {
      emulatorId,
      label: adapter?.label ?? emulatorId,
      firstSeenAt: "",
      lastSeenAt: "",
      hostExeNames: [],
    });
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <SettingsPanel
        dataTour="settings-general"
        description="Control background behavior and how playtimes are shown."
        title="General"
      >
        <SettingsRow
          description="Strongly recommended. LudusAtlas starts when you sign in so it can detect every game session; if disabled, tracking only works after you open the app manually."
          title="Launch on startup"
        >
          <input
            type="checkbox"
            checked={settings.launchOnStartup}
            disabled={startupSyncing}
            onChange={(event) =>
              void handleLaunchOnStartupChange(event.target.checked)
            }
            className="h-5 w-5 accent-accent disabled:opacity-50"
          />
        </SettingsRow>
        {!settings.launchOnStartup && !startupSyncing ? (
          <div className="flex items-start gap-3 rounded-lg border border-danger-border bg-danger-tint px-4 py-3 text-sm text-danger">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Auto-start is disabled</div>
              <p className="mt-1 leading-5">
                This is not recommended. LudusAtlas cannot detect or record
                sessions until you open it manually.
              </p>
            </div>
          </div>
        ) : null}
        {startupError ? (
          <p className="break-words text-sm text-danger">{startupError}</p>
        ) : null}
        <SettingsRow
          description="Shows long playtimes as days and hours instead of total hours."
          title="Show days in playtime"
        >
          <input
            type="checkbox"
            checked={settings.showDurationDays}
            onChange={(event) => setShowDurationDays(event.target.checked)}
            className="h-5 w-5 accent-accent"
          />
        </SettingsRow>
      </SettingsPanel>

      <SettingsPanel
        title="Keyboard shortcuts"
        description="Global hotkeys work while LudusAtlas is running, including in the system tray."
      >
        <SettingsRow
          title="Bring LudusAtlas to front"
          description="Show and focus LudusAtlas from any app."
        >
          <HotkeyInput
            setting="showWindowHotkey"
            label="Bring LudusAtlas to front"
          />
        </SettingsRow>
        <SettingsRow
          title="Show current session time"
          description={
            currentPlatform() === "macos"
              ? "Desktop popups are not supported on macOS."
              : "Show a brief popup without leaving your game, even when automatic popups are off. Press again to cycle through active games. Uses the display selected under Desktop popups."
          }
        >
          <HotkeyInput
            setting="currentSessionHotkey"
            label="Show current session time"
            disabled={currentPlatform() === "macos"}
          />
        </SettingsRow>
      </SettingsPanel>

      <SettingsPanel
        dataTour="settings-appearance"
        description="Personalize LudusAtlas's interactive controls and highlights."
        title="Appearance"
      >
        <SettingsRow
          description="Choose an accent color. LudusAtlas adjusts it automatically for readable contrast in both themes."
          title="Accent color"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Choose accent color"
              value={settings.accentColor ?? DEFAULT_ACCENT_COLOR}
              onChange={(event) => setAccentColor(event.target.value)}
              className="h-9 w-11 cursor-pointer rounded-md border border-border bg-surface p-1"
            />
            <span className="w-[4.5rem] font-mono text-xs text-text-muted">
              {settings.accentColor ?? DEFAULT_ACCENT_COLOR}
            </span>
            <Button
              variant="ghost"
              disabled={!settings.accentColor}
              onClick={() => setAccentColor(null)}
            >
              Reset
            </Button>
          </div>
        </SettingsRow>
      </SettingsPanel>

      {currentPlatform() !== "macos" ? (
        <SettingsPanel
          dataTour="settings-notifications"
          description="Short popups on your desktop while you play. They disappear on their own."
          title="Desktop popups"
        >
          <SettingsRow
            description="Show popups even while LudusAtlas is open and focused, or running in the tray."
            title="Show desktop popups"
          >
            <input
              type="checkbox"
              checked={settings.desktopOverlaysEnabled === true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "desktopOverlaysEnabled",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent"
            />
          </SettingsRow>
          <SettingsRow
            description="Popups appear at the top right of this display. If it is disconnected, LudusAtlas uses your primary monitor."
            title="Popup monitor"
          >
            <DesktopOverlayMonitorSelect />
          </SettingsRow>
          <SettingsRow
            description="Popup when LudusAtlas needs you to pick between possible games. Click it to open Now Playing."
            title="Choices that need review"
          >
            <input
              type="checkbox"
              checked={settings.overlayActionRequired !== false}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlayActionRequired",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <SettingsRow
            description="Popup when LudusAtlas recognizes a game for the first time."
            title="First-time detections"
          >
            <input
              type="checkbox"
              checked={settings.overlayFirstDetections !== false}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlayFirstDetections",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <SettingsRow
            description="Popup each time tracking starts."
            title="Every game start"
          >
            <input
              type="checkbox"
              checked={settings.overlaySessionStarts === true}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlaySessionStarts",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <SettingsRow
            description="Popup after sessions of 10 minutes or more."
            title="Session summaries"
          >
            <input
              type="checkbox"
              checked={settings.overlaySessionSummaries !== false}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlaySessionSummaries",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <SettingsRow
            description="Popup when you unlock a new playtime milestone."
            title="Milestones"
          >
            <input
              type="checkbox"
              checked={settings.overlayMilestones !== false}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlayMilestones",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <SettingsRow
            description="Popup when LudusAtlas finds an app it does not know. Click it to open Discovered. Only apps found while this is on are included."
            title="New discoveries"
          >
            <input
              type="checkbox"
              checked={settings.overlayDiscoveries === true}
              disabled={settings.desktopOverlaysEnabled !== true}
              onChange={(event) =>
                setDesktopOverlaySetting(
                  "overlayDiscoveries",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          {settings.desktopOverlaysEnabled === true ? (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs text-text-faint">
                Preview a popup with sample data. Works for every kind, even the
                ones switched off above.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {OVERLAY_PREVIEWS.map(([kind, label]) => (
                  <Button
                    key={kind}
                    variant="secondary"
                    onClick={() => previewDesktopOverlay(kind)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </SettingsPanel>
      ) : null}

      {currentPlatform() === "windows" ? (
        <SettingsPanel
          dataTour="settings-launcher"
          description="Decide whether LudusAtlas may remember game files on this PC, start games for you, and be steered with a controller."
          title="Game launching"
        >
          <SettingsRow
            description="Keep the file paths of the games and emulators LudusAtlas recognized on this PC. Turning this off deletes the saved paths and stops LudusAtlas from learning new ones."
            title="Remember launch paths"
          >
            <input
              type="checkbox"
              checked={settings.rememberLaunchPaths !== false}
              onChange={(event) => {
                if (event.target.checked) {
                  setLauncherSetting("rememberLaunchPaths", true);
                } else {
                  setConfirmForgetLaunchFiles("all");
                }
              }}
              className="h-5 w-5 accent-accent"
            />
          </SettingsRow>
          <SettingsRow
            description="Show Play buttons in My Games and let LudusAtlas start games for you. Needs remembered launch paths."
            title="Launch games directly"
          >
            <input
              type="checkbox"
              checked={settings.gameLaunchingEnabled === true}
              disabled={settings.rememberLaunchPaths === false}
              onChange={(event) =>
                setLauncherSetting("gameLaunchingEnabled", event.target.checked)
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>

          <div className="rounded-lg border border-border bg-bg/40 px-4 py-3 text-xs leading-5 text-text-muted">
            LudusAtlas starts the game file you picked directly, or hands a
            saved game file to a supported emulator. Games managed by a
            launcher, and games that ask for administrator rights, may still
            need their normal shortcut. Remembered paths stay on this device and
            are left out of backups.
          </div>
          <SettingsRow
            description="Move through LudusAtlas with a controller. Needs direct game launching turned on."
            title={
              <span className="flex items-center gap-2">
                <Gamepad2 size={17} className="text-accent" />
                Controller navigation
              </span>
            }
          >
            <input
              type="checkbox"
              checked={settings.controllerNavigationEnabled === true}
              disabled={settings.gameLaunchingEnabled !== true}
              onChange={(event) =>
                setLauncherSetting(
                  "controllerNavigationEnabled",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-accent disabled:opacity-50"
            />
          </SettingsRow>
          <div className="grid gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-text">
                  Saved game files
                </div>
                <div className="mt-0.5 text-xs text-text-faint">
                  {executableLaunchTargetCount} saved game file{" "}
                  {executableLaunchTargetCount === 1 ? "path" : "paths"}
                </div>
              </div>
              <Button
                variant="secondary"
                icon={Trash2}
                disabled={executableLaunchTargetCount === 0}
                onClick={() => setConfirmForgetLaunchFiles("executables")}
              >
                Forget game files
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
              <div>
                <div className="text-sm font-medium text-text">
                  Emulator launch files
                </div>
                <div className="mt-0.5 text-xs text-text-faint">
                  {emulatorLaunchTargetCount} saved emulator or content{" "}
                  {emulatorLaunchTargetCount === 1 ? "path" : "paths"}
                </div>
              </div>
              <Button
                variant="secondary"
                icon={Trash2}
                disabled={emulatorLaunchTargetCount === 0}
                onClick={() => setConfirmForgetLaunchFiles("emulators")}
              >
                Forget emulator files
              </Button>
            </div>
          </div>
        </SettingsPanel>
      ) : null}

      <SettingsPanel
        dataTour="settings-emulators"
        description="Detect the game running inside a supported emulator, including DOSBox and Dolphin."
        title="Emulators"
      >
        <SettingsRow
          description="Reads the emulator's window title and start-up options on this PC to work out which game is loaded. Full paths and window titles never leave your PC."
          title="Detect emulator games"
        >
          <input
            type="checkbox"
            checked={settings.emulatorDetection ?? true}
            onChange={(event) =>
              setEmulatorSetting("emulatorDetection", event.target.checked)
            }
            className="h-5 w-5 accent-accent"
          />
        </SettingsRow>
        <SettingsRow
          description="Sends the recognized game name or disc ID (such as a DOSBox program or a Dolphin disc file) to look it up in the database. Folder paths and unclear window titles stay on this PC."
          title="Look up recognized content"
        >
          <input
            type="checkbox"
            checked={settings.emulatorContentLookup ?? true}
            disabled={!(settings.emulatorDetection ?? true)}
            onChange={(event) =>
              setEmulatorSetting("emulatorContentLookup", event.target.checked)
            }
            className="h-5 w-5 accent-accent disabled:opacity-50"
          />
        </SettingsRow>
        {displayedEmulators.size > 0 ? (
          <div className="grid gap-3 border-t border-border pt-5">
            <div>
              <h3 className="font-medium text-text">Detected emulators</h3>
              <p className="mt-1 text-sm text-text-muted">
                Ignored emulators are hidden and no games inside them are
                tracked. Existing games, mappings, and history are preserved.
              </p>
            </div>
            {[...displayedEmulators.values()].map((emulator) => {
              const adapter = adapterFor(emulator.emulatorId);
              const ignored = (settings.ignoredEmulatorIds ?? []).some(
                (id) => id.toLowerCase() === emulator.emulatorId.toLowerCase(),
              );
              const imageSrc = emulatorAssetUrls[emulator.emulatorId];
              const binary = resolveEmulatorBinary(
                emulator.emulatorId,
                emulatorAutoBinaries,
                emulatorManualBinaries,
              );
              const hasManualBinary = emulatorManualBinaries.has(
                emulator.emulatorId,
              );
              return (
                <div
                  key={emulator.emulatorId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-bg/60 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium text-text">
                        {emulator.label}
                      </div>
                      <div className="truncate text-xs text-text-faint">
                        {ignored
                          ? "Ignored and hidden"
                          : emulator.hostExeNames.join(", ") || "Enabled"}
                      </div>
                      {adapter?.launch ? (
                        <div
                          className="mt-1 truncate text-xs text-text-muted"
                          title={binary?.exePath}
                        >
                          Launch program:{" "}
                          {binary
                            ? `${launchFileBaseName(binary.exePath)}${
                                hasManualBinary ? " (selected)" : " (detected)"
                              }`
                            : "not set"}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {adapter?.launch ? (
                      <>
                        <Button
                          variant="secondary"
                          icon={FolderOpen}
                          onClick={() =>
                            void handleChooseEmulatorBinary(emulator.emulatorId)
                          }
                        >
                          {binary ? "Change program" : "Set program"}
                        </Button>
                        {hasManualBinary ? (
                          <Button
                            variant="secondary"
                            icon={RotateCcw}
                            onClick={() =>
                              handleForgetEmulatorBinary(
                                emulator.emulatorId,
                                emulator.label,
                              )
                            }
                          >
                            Use detected
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    <Button
                      variant={ignored ? "primary" : "secondary"}
                      loading={emulatorSyncing === emulator.emulatorId}
                      disabled={
                        emulatorSyncing !== null ||
                        !(settings.emulatorDetection ?? true)
                      }
                      onClick={() =>
                        void handleEmulatorIgnored(
                          emulator.emulatorId,
                          !ignored,
                        )
                      }
                    >
                      {ignored ? "Enable" : "Ignore"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </SettingsPanel>

      <SettingsPanel
        description="Tune how LudusAtlas finds apps and retries unknown ones."
        title="Discovery"
      >
        <SettingsRow
          dataTour="settings-sharing"
          description="When you ignore an app LudusAtlas does not recognize, it sends the file name, your platform, and an anonymous install ID to the PlayCounter Community service. Playtime and game history are never sent."
          title="Share apps you ignore"
        >
          <input
            type="checkbox"
            checked={settings.autoShareIgnoredProcesses}
            onChange={(event) =>
              setAutoShareIgnoredProcesses(event.target.checked)
            }
            className="h-5 w-5 accent-accent"
          />
        </SettingsRow>
        <SettingsRow
          description="Apps in this list are skipped before LudusAtlas tries to match them. Built-in system defaults plus your own file."
          title="Ignored apps"
        >
          <Button
            icon={RotateCcw}
            loading={reloadingIgnored}
            onClick={async () => {
              setReloadingIgnored(true);
              try {
                await reloadIgnoredProcesses();
                addToast({
                  tone: "success",
                  title: "Ignore list reloaded",
                  detail: "LudusAtlas read the list again and rescanned.",
                });
              } catch (error) {
                addToast({
                  tone: "error",
                  title: "Reload failed",
                  detail: formatError(error),
                });
              } finally {
                setReloadingIgnored(false);
              }
            }}
          >
            Reload
          </Button>
        </SettingsRow>
        <div className="grid gap-2 text-sm">
          <div>
            <span className="font-medium">Loaded entries: </span>
            <span>{ignoredProcessCount}</span>
          </div>
          <div className="grid gap-1">
            <span className="font-medium">User file</span>
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1 break-all font-mono text-xs text-text-faint">
                {userIgnoredProcessesPath ?? "Unavailable"}
              </span>
              <Button
                icon={FolderOpen}
                disabled={!userIgnoredProcessesPath}
                onClick={() =>
                  void openUserIgnoredProcessesFolder().catch((error) =>
                    addToast({
                      tone: "error",
                      title: "Folder unavailable",
                      detail: formatError(error),
                    }),
                  )
                }
              >
                Folder
              </Button>
            </div>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        description="Manage durable playtime imported from local game launchers. Install paths and path-scoped links always stay on this PC."
        title="Library import"
      >
        <SettingsRow
          description="Removes the Steam mark, the imported Steam playtime, the game files Steam linked, and where they are installed. Sessions LudusAtlas recorded itself are kept."
          title={
            <span className="flex items-center gap-2">
              <ProviderBadge provider="steam" variant="mark" />
              Forget imported Steam data
            </span>
          }
        >
          <Button
            variant="danger"
            disabled={importedSteamCount === 0}
            onClick={() => setConfirmForgetLibrary("steam")}
          >
            Forget {importedSteamCount || "all"}
          </Button>
        </SettingsRow>
        <SettingsRow
          description="Removes the Xbox mark, the imported Xbox playtime, and the game files Xbox linked. Sessions LudusAtlas recorded itself are kept."
          title={
            <span className="flex items-center gap-2">
              <ProviderBadge provider="xbox" variant="mark" />
              Forget imported Xbox data
            </span>
          }
        >
          <Button
            variant="danger"
            disabled={importedXboxCount === 0}
            onClick={() => setConfirmForgetLibrary("xbox")}
          >
            Forget {importedXboxCount || "all"}
          </Button>
        </SettingsRow>
      </SettingsPanel>

      <SettingsPanel
        dataTour="settings-backup"
        description="Move your play history and game cache to another PC. Backups are plain JSON files."
        title="Backup & transfer"
      >
        <SettingsRow
          dataTour="settings-backup-export"
          description="Save all local data (play history, game cache, settings) to a JSON file you can copy to another PC."
          title="Export data"
        >
          <div className="flex shrink-0 justify-end">
            <Button
              icon={Download}
              loading={exporting}
              onClick={() => void handleExport()}
            >
              Export
            </Button>
          </div>
        </SettingsRow>
        <SettingsRow
          dataTour="settings-backup-import"
          description="Replace all local data with a backup file. Your current data is backed up automatically first."
          title="Import data"
        >
          <div className="flex shrink-0 justify-end">
            <Button
              icon={Upload}
              loading={importing}
              onClick={() => setConfirmImport(true)}
            >
              Import
            </Button>
          </div>
        </SettingsRow>
      </SettingsPanel>

      <SettingsPanel
        description="Tutorials and task guides are available from the Help menu in the top-right corner."
        title="Help & tutorials"
      >
        <TutorialSettingsPanel />
      </SettingsPanel>

      <SettingsPanel
        dataTour="settings-updates"
        description="Release-feed safety for this development build."
        title="Updates"
      >
        <SettingsRow
          title="Release notes"
          description="See what changed in the version you're running."
        >
          <Button
            variant="secondary"
            disabled={!installedReleaseNote}
            title={
              installedReleaseNote
                ? undefined
                : "No release notes for this version"
            }
            onClick={openCurrentReleaseNotes}
          >
            View
          </Button>
        </SettingsRow>
        <div>
          <h3 className="font-medium text-text">App updates disabled</h3>
          <p className="mt-1 text-sm text-text-muted">
            {UPDATE_POLICY.message}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            No LudusAtlas or third-party release endpoint is configured.
          </p>
        </div>
      </SettingsPanel>
      {installUuid ? (
        <div className="flex items-center gap-1.5 px-1 text-xs text-text-muted">
          <p className="min-w-0">
            User UUID:{" "}
            <span className="select-all break-all font-mono">
              {installUuid}
            </span>
          </p>
          <div
            className="relative shrink-0"
            onMouseEnter={() => setUuidInfoOpen(true)}
            onMouseLeave={() => setUuidInfoOpen(false)}
            onFocus={() => setUuidInfoOpen(true)}
            onBlur={() => setUuidInfoOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setUuidInfoOpen(false);
            }}
          >
            <button
              type="button"
              aria-label="About your user UUID"
              aria-describedby={uuidInfoOpen ? "user-uuid-info" : undefined}
              className="flex rounded p-1 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Info size={14} aria-hidden="true" />
            </button>
            {uuidInfoOpen ? (
              <div className="absolute bottom-full right-0 z-10 w-64 max-w-[calc(100vw-2rem)] pb-2">
                <p
                  id="user-uuid-info"
                  role="tooltip"
                  className="rounded-md border border-border bg-surface px-3 py-2 leading-relaxed text-text shadow-raised"
                >
                  A random ID that recognizes your installation without an
                  account. Used to count active installations and link your
                  community suggestions and reports.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {confirmImport ? (
        <ImportDataDialog
          onCancel={() => setConfirmImport(false)}
          onConfirm={() => {
            setConfirmImport(false);
            void handleImport();
          }}
        />
      ) : null}
      {confirmForgetLibrary ? (
        <Modal
          size="sm"
          labelId="forget-library-title"
          title={`Forget imported ${forgetLibraryLabel} data?`}
          subtitle="Your recorded LudusAtlas sessions will be kept."
          icon={Trash2}
          onClose={() => setConfirmForgetLibrary(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirmForgetLibrary(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  forgetImportedLibraryData(confirmForgetLibrary);
                  setConfirmForgetLibrary(null);
                }}
              >
                Forget imported data
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-muted">
            {forgetLibraryLabel} badges and imported playtime floors will
            disappear. You can import the library again at any time.
          </p>
        </Modal>
      ) : null}
      {confirmForgetLaunchFiles ? (
        <ForgetLaunchFilesDialog
          scope={confirmForgetLaunchFiles}
          count={
            confirmForgetLaunchFiles === "executables"
              ? executableLaunchTargetCount
              : confirmForgetLaunchFiles === "emulators"
                ? emulatorLaunchTargetCount
                : executableLaunchTargetCount + emulatorLaunchTargetCount
          }
          onCancel={() => setConfirmForgetLaunchFiles(null)}
          onConfirm={() => {
            if (confirmForgetLaunchFiles === "all") {
              setLauncherSetting("rememberLaunchPaths", false);
              addToast({
                tone: "success",
                title: "Launch paths are no longer stored",
                detail:
                  "Saved game and emulator paths were forgotten. Starting games from LudusAtlas and controller navigation were turned off.",
              });
            } else if (confirmForgetLaunchFiles === "executables") {
              forgetExecutableLaunchTargets();
              addToast({
                tone: "success",
                title: "Saved game files forgotten",
                detail: "Emulator programs and game files were left untouched.",
              });
            } else {
              forgetEmulatorLaunchTargets();
              addToast({
                tone: "success",
                title: "Emulator launch files forgotten",
                detail: "Saved paths for regular games were left untouched.",
              });
            }
            setConfirmForgetLaunchFiles(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SettingsPanel({
  title,
  description,
  children,
  dataTour,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <Panel dataTour={dataTour} className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </Panel>
  );
}

function SettingsRow({
  title,
  description,
  children,
  className,
  dataTour,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  className?: string;
  dataTour?: string;
}) {
  return (
    <div
      data-tour={dataTour}
      className={`flex items-start justify-between gap-5 ${className ?? ""}`}
    >
      <div className="min-w-0">
        <h3 className="font-medium text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ForgetLaunchFilesDialog({
  scope,
  count,
  onCancel,
  onConfirm,
}: {
  scope: LaunchFileForgetScope;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const emulatorFiles = scope === "emulators";
  const disablingStorage = scope === "all";
  return (
    <Modal
      size="sm"
      labelId="forget-launch-files-dialog-title"
      eyebrow="Direct game launching"
      title={
        disablingStorage
          ? "Stop remembering launch paths?"
          : emulatorFiles
            ? "Forget emulator launch files?"
            : "Forget saved game files?"
      }
      icon={Gamepad2}
      onClose={onCancel}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" icon={Trash2} onClick={onConfirm}>
            {disablingStorage ? "Stop remembering" : `Forget ${count || "all"}`}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-text-muted">
        {disablingStorage
          ? `This removes ${count === 0 ? "any" : `all ${count}`} saved game and emulator ${count === 1 ? "path" : "paths"}, stops LudusAtlas from learning new ones, and turns off starting games from LudusAtlas and controller navigation.`
          : emulatorFiles
            ? `This removes ${count} saved emulator program and game ${count === 1 ? "path" : "paths"}, including files such as ISO, RVZ, and DOSBox programs. Paths for regular games stay intact.`
            : `This removes ${count} saved ${count === 1 ? "path" : "paths"} for regular games. Emulator programs and game files stay intact.`}{" "}
        Play history and game matches are not changed.
        {!disablingStorage
          ? " LudusAtlas can learn the paths again the next time it sees the game running."
          : " You can turn path storage back on at any time."}
      </p>
    </Modal>
  );
}

function ImportDataDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      size="sm"
      labelId="import-data-dialog-title"
      eyebrow="Settings"
      title="Import backup?"
      icon={FolderInput}
      onClose={onCancel}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" icon={FolderOpen} onClick={onConfirm}>
            Choose file
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-text-muted">
        This replaces your current play history, game cache, and settings with
        the contents of the backup file. Your current data is saved to a backup
        file first, and LudusAtlas reloads when the import finishes.
      </p>
    </Modal>
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
