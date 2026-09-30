import { join } from "node:path";

import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  safeStorage,
  session,
  shell,
  type WebContents,
} from "electron";

import { APP_ORIGIN, APP_SCHEME } from "./about";
import { CASE_CHANNEL, createCaseBridge, loadChecker, mayUseCase } from "./casefile";
import { repoRoot, startEngine, webDist } from "./engine";
import {
  WINDOW,
  decideFrameNavigation,
  decideNavigation,
  decideNewWindow,
  decidePermission,
  webPreferences,
} from "./guard";
import { createAppHandler, readInside } from "./protocol";
import { smokeFolder } from "./screen";
import { runSmoke } from "./smoke";

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

function launch(folder: string | null): void {
  let window: BrowserWindow | null = null;

  app.on("second-instance", () => {
    if (window === null) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.on("web-contents-created", (_event, contents) => guard(contents));

  void app.whenReady().then(async () => {
    const refuse = session.defaultSession;
    refuse.setPermissionRequestHandler((_contents, permission, callback) =>
      callback(decidePermission(permission)),
    );
    refuse.setPermissionCheckHandler((_contents, permission) => decidePermission(permission));

    const appPath = app.getAppPath();
    const engine = startEngine({ appPath, env: process.env });
    app.on("before-quit", () => engine.stop());
    app.on("window-all-closed", () => {
      engine.stop();
      app.quit();
    });

    protocol.handle(
      APP_SCHEME,
      createAppHandler({
        webDist: webDist(repoRoot(appPath)),
        engine: () => engine.view(),
        fetch: (input, init) => fetch(input, init),
        readFile: readInside,
      }),
    );

    const answer = createCaseBridge({
      folder: app.getPath("userData"),
      checker: loadChecker(repoRoot(appPath)),
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
      webPreferences: webPreferences(join(__dirname, "preload.js"), app.getVersion()),
    });
    window = shown;
    shown.on("closed", () => {
      window = null;
      engine.stop();
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
    await engine.ready;
    engine.onEnded(() => void show());
    await show();

    if (folder !== null) {
      const code = await runSmoke(shown, folder);
      engine.stop();
      app.exit(code);
    }
  });
}

function folderFromArgs(): string | null | "bad" {
  try {
    return smokeFolder(process.argv);
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
    return "bad";
  }
}

const folder = folderFromArgs();
if (folder === "bad") {
  app.exit(2);
} else if (!app.requestSingleInstanceLock()) {
  if (folder !== null) process.stderr.write("smoke: Duly is already open\n");
  app.exit(folder === null ? 0 : 1);
} else {
  launch(folder);
}
