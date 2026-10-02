import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  nativeTheme,
  protocol,
  safeStorage,
  session,
  shell,
  type WebContents,
} from "electron";

import { APP_ORIGIN, APP_SCHEME } from "./about";
import { CASE_CHANNEL, createCaseBridge, loadChecker, mayUseCase } from "./casefile";
import { healthWaitMs, startEngine } from "./engine";
import {
  WINDOW,
  decideFrameNavigation,
  decideNavigation,
  decideNewWindow,
  decidePermission,
  webPreferences,
} from "./guard";
import { LAUNCH_FILE, Milestones, launchedBefore, readLaunches, recordLaunch } from "./launch";
import { checkRuntime } from "./manifest";
import { FLASH_GROUND, FLASH_MS, GROUND, GROUND_DARK } from "./pages";
import { appPaths, engineCommand, repoOnly, repoRoot, verifyStart, webDist } from "./paths";
import { createAppHandler, fetchOverSocket, readInside } from "./protocol";
import { smokeFolder } from "./screen";
import { runShots } from "./shotrun";
import { NO_ENGINE, refusedInApp, shotsFolder, webSamples } from "./shots";
import { runSmoke } from "./smoke";
import { checkSocket, prepareFolder, socketPlace } from "./socket";

const INDEX = `${APP_ORIGIN}/index.html`;

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function guard(contents: WebContents): void {
  contents.on("will-navigate", (event) => {
    const decision = decideNavigation(event.url);
    if (decision === "stay") return;
    event.preventDefault();
    if (decision === "open_outside") void shell.openExternal(event.url);
  });
  contents.on("will-frame-navigate", (event) => {
    // The page itself is handled by will-navigate, which also fires for it.
    if (event.isMainFrame) return;
    if (decideFrameNavigation(event.url) !== "stay") event.preventDefault();
  });
  contents.on("will-redirect", (event) => {
    if (decideNavigation(event.url) !== "stay") event.preventDefault();
  });
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (decideNewWindow(url) === "open_outside") void shell.openExternal(url);
    return { action: "deny" };
  });
}

function launch(folder: string | null, verify: boolean): void {
  const marks = new Milestones();
  let window: BrowserWindow | null = null;

  app.on("second-instance", () => {
    if (window === null) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.on("web-contents-created", (_event, contents) => guard(contents));

  void app.whenReady().then(async () => {
    marks.mark("app_ready");
    const refuse = session.defaultSession;
    refuse.setPermissionRequestHandler((_contents, permission, callback) =>
      callback(decidePermission(permission)),
    );
    refuse.setPermissionCheckHandler((_contents, permission) => decidePermission(permission));

    const paths = appPaths({
      packaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
    });
    const userData = app.getPath("userData");
    const launches = join(userData, LAUNCH_FILE);
    const version = app.getVersion();
    const firstLaunch = !launchedBefore(await readLaunches(launches), version);
    const place = socketPlace(userData, tmpdir());
    const uid = process.getuid?.() ?? -1;
    const manifest = paths.manifest;

    const engine = startEngine({
      command: engineCommand(paths, place.socket, process.env),
      socket: place.socket,
      check: () => checkSocket(fs.lstatSync(place.socket, { throwIfNoEntry: false }), uid),
      preflight: async () => {
        try {
          fs.mkdirSync(dirname(place.folder), { recursive: true });
          prepareFolder(fs, place, uid);
        } catch (error) {
          return String(error);
        }
        const refused = manifest === null ? null : await checkRuntime(manifest);
        marks.mark("runtime_checked");
        return refused;
      },
      timeoutMs: healthWaitMs(firstLaunch),
      step: (name) => marks.mark(name),
    });
    const stop = () => {
      engine.stop();
      if (place.temporary) fs.rmSync(place.folder, { recursive: true, force: true });
    };
    app.on("before-quit", stop);
    app.on("window-all-closed", () => {
      stop();
      app.quit();
    });

    if (verify) {
      const view = await engine.ready;
      if (view.state !== "ready" && view.state !== "starting") {
        process.stderr.write(`${view.lines.join("\n")}\n`);
      }
      stop();
      app.exit(view.state === "ready" ? 0 : 1);
      return;
    }

    const flashFont = wordmarkFont(paths.web);
    let flashPending = true;
    protocol.handle(
      APP_SCHEME,
      createAppHandler({
        webDist: paths.web,
        engine: () => engine.view(),
        flashFont,
        takeFlash: () => {
          const take = flashPending;
          flashPending = false;
          return take;
        },
        fetch: fetchOverSocket,
        readFile: readInside,
        refuse: refusedInApp,
        retry: () => engine.restart(),
        copy: (text) => clipboard.writeText(text),
      }),
    );

    const answer = createCaseBridge({
      folder: app.getPath("userData"),
      checker: loadChecker(paths.contracts),
      cipher: {
        available: () => safeStorage.isEncryptionAvailable(),
        encrypt: (text) => safeStorage.encryptString(text),
        decrypt: (data) => safeStorage.decryptString(data),
      },
    });
    ipcMain.handle(CASE_CHANNEL, (event, message: unknown) => {
      const frame = event.senderFrame;
      const main = frame !== null && frame === event.sender.mainFrame;
      if (!mayUseCase(frame?.url, main)) throw new Error("not the app's page");
      return answer(message);
    });

    const shown = new BrowserWindow({
      ...WINDOW,
      // Black from the first frame, so the flash is never preceded by a blank window.
      backgroundColor: FLASH_GROUND,
      webPreferences: webPreferences(join(__dirname, "preload.js"), version),
    });
    window = shown;
    shown.on("closed", () => {
      window = null;
      stop();
    });

    const show = async () => {
      if (shown.isDestroyed()) return;
      try {
        await shown.loadURL(INDEX);
      } catch (error) {
        process.stderr.write(`duly: the window did not load: ${String(error)}\n`);
      }
    };
    await show();
    marks.mark("window_shown");
    const flashShown = Date.now();
    await engine.ready;
    // The intro plays whole; the screen then picks up its last frame (web launchFlash.ts).
    let flashing = true;
    const leaveFlash = async () => {
      if (!flashing) return;
      flashing = false;
      const left = FLASH_MS - (Date.now() - flashShown);
      if (left > 0) await new Promise((done) => setTimeout(done, left));
    };
    const reload = async () => {
      if (engine.view().state === "ready") await leaveFlash();
      await show();
      if (engine.view().state === "ready") {
        marks.mark("first_page_loaded");
        // Behind the screen from now on, e.g. while the window is resized.
        if (!shown.isDestroyed()) {
          shown.setBackgroundColor(nativeTheme.shouldUseDarkColors ? GROUND_DARK : GROUND);
        }
      }
    };
    engine.onChange(() => void reload());
    await reload();
    // One line per launch, with the milestones reached (point 24).
    await recordLaunch(launches, marks.line(version)).catch(() => undefined);

    if (folder !== null) {
      const code = await runSmoke(shown, folder);
      stop();
      app.exit(code);
    }
  });
}

/** The shots run: no engine and no case; the shots page draws from the samples it holds. */
function launchShots(folder: string): void {
  void app.whenReady().then(async () => {
    const refuse = session.defaultSession;
    refuse.setPermissionRequestHandler((_contents, permission, callback) =>
      callback(decidePermission(permission)),
    );
    refuse.setPermissionCheckHandler((_contents, permission) => decidePermission(permission));
    app.on("web-contents-created", (_event, contents) => guard(contents));

    const root = repoRoot(app.getAppPath());
    protocol.handle(
      APP_SCHEME,
      createAppHandler({
        webDist: webDist(root),
        engine: () => NO_ENGINE,
        fetch: () => Promise.reject(new Error("no engine in a shots run")),
        readFile: readInside,
      }),
    );
    const code = await runShots({
      folder,
      webDist: webDist(root),
      samples: webSamples(root),
      preload: join(__dirname, "preload.js"),
      version: app.getVersion(),
    });
    app.exit(code);
  });
}

function fromArgs(read: (argv: readonly string[]) => string | null): string | null | "bad" {
  try {
    return read(process.argv);
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
    return "bad";
  }
}

// The repository's own modes are ignored in a packaged app (SPEC-W1 point 19).
const shots = repoOnly(app.isPackaged, () => fromArgs(shotsFolder));
const folder = repoOnly(app.isPackaged, () => fromArgs(smokeFolder));
if (folder === "bad" || shots === "bad") {
  app.exit(2);
} else if (shots !== null) {
  launchShots(shots);
} else if (!app.requestSingleInstanceLock()) {
  if (folder !== null) process.stderr.write("smoke: Duly is already open\n");
  app.exit(folder === null ? 0 : 1);
} else {
  launch(folder, verifyStart(process.argv));
}

/**
 * The screen's Instrument Sans 700, for the flash, as a data URL so it is drawn in the first
 * frame. Its built file name carries a hash.
 */
function wordmarkFont(web: string): string | undefined {
  try {
    const assets = join(web, "assets");
    const name = fs
      .readdirSync(assets)
      .find((file) => /^instrument-sans-latin-700-normal-.*\.woff2$/.test(file));
    if (name === undefined) return undefined;
    return `data:font/woff2;base64,${fs.readFileSync(join(assets, name)).toString("base64")}`;
  } catch {
    return undefined;
  }
}
