import { describe, expect, it, vi } from "vitest";

import { appPaths, engineCommand, repoOnly, repoRoot, verifyStart, webDist } from "./paths";

const RES = "/Applications/Duly.app/Contents/Resources";
const PACKAGED = appPaths({ packaged: true, appPath: `${RES}/app.asar`, resourcesPath: RES });
const REPO = appPaths({
  packaged: false,
  appPath: "/repo/desktop",
  resourcesPath: "/repo/node_modules/electron/dist/Electron.app/Contents/Resources",
});
const ENV = {
  PATH: "/opt/homebrew/bin:/usr/bin:/bin",
  HOME: "/Users/ani",
  TMPDIR: "/var/folders/xy/T/",
  DULY_ENV: "prod",
  DULY_LOCAL_TOKEN: "leak",
  PYTHONPATH: "/elsewhere",
  NODE_OPTIONS: "--inspect",
};
const SOCK = "/Users/ani/Library/Application Support/Duly/run/engine.sock";

describe("the paths, packaged (point 19)", () => {
  it("reads the screen and the contracts from inside app.asar, the engine from Resources", () => {
    expect(PACKAGED).toEqual({
      packaged: true,
      web: `${RES}/app.asar/web`,
      contracts: `${RES}/app.asar/contracts`,
      manifest: `${RES}/python-manifest.json`,
      engineRoot: `${RES}/engine-root`,
      resources: RES,
    });
  });
});

describe("the paths, in the repository (point 19)", () => {
  it("reads everything from the repository root", () => {
    expect(REPO).toEqual({
      packaged: false,
      web: "/repo/web/dist",
      contracts: "/repo/contracts",
      manifest: null,
      engineRoot: "/repo",
      resources: null,
    });
    expect(repoRoot("/repo/desktop")).toBe("/repo");
    expect(webDist("/repo")).toBe("/repo/web/dist");
  });
});

describe("the engine command (point 16)", () => {
  it("runs the bundled python, isolated, with the launcher, packaged mode and the socket", () => {
    expect(engineCommand(PACKAGED, SOCK, ENV)).toEqual({
      command: `${RES}/python/bin/python3`,
      args: [
        "-I",
        "-B",
        `${RES}/engine-root/duly_engine.py`,
        "--mode",
        "packaged",
        "--socket",
        SOCK,
      ],
      cwd: `${RES}/engine-root`,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/Users/ani",
        TMPDIR: "/var/folders/xy/T/",
        DULY_ENV: "desktop",
      },
    });
  });

  it("runs uv in the repository in repo mode, with dev", () => {
    expect(engineCommand(REPO, SOCK, ENV)).toEqual({
      command: "uv",
      args: ["run", "python", "-m", "api.desktop_main", "--mode", "repo", "--socket", SOCK],
      cwd: "/repo",
      env: {
        PATH: "/opt/homebrew/bin:/usr/bin:/bin",
        HOME: "/Users/ani",
        TMPDIR: "/var/folders/xy/T/",
        DULY_ENV: "dev",
      },
    });
  });

  it("drops what is not set, and never carries a token", () => {
    expect(engineCommand(PACKAGED, SOCK, {}).env).toEqual({
      PATH: "/usr/bin:/bin",
      DULY_ENV: "desktop",
    });
    expect(engineCommand(REPO, SOCK, {}).env).toEqual({ DULY_ENV: "dev" });
    for (const paths of [PACKAGED, REPO]) {
      expect(JSON.stringify(engineCommand(paths, SOCK, ENV))).not.toContain("leak");
    }
  });
});

describe("the repository's own modes (point 19)", () => {
  it("are read in the repository and ignored when packaged", () => {
    const read = vi.fn(() => "/tmp/smoke");
    expect(repoOnly(false, read)).toBe("/tmp/smoke");
    expect(repoOnly(true, read)).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("knows --verify-start", () => {
    expect(verifyStart(["/Duly", "--verify-start"])).toBe(true);
    expect(verifyStart(["/Duly"])).toBe(false);
  });
});
