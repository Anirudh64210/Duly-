/**
 * Every path the app uses, packaged or in the repository (SPEC-W1 points 16 and 19).
 * Nothing else computes a path.
 */
import { join, resolve } from "node:path";

/** What Electron says about where the app is. */
export interface Place {
  packaged: boolean;
  /** app.getAppPath(): the desktop folder in the repository, app.asar when packaged. */
  appPath: string;
  /** process.resourcesPath: Contents/Resources when packaged. */
  resourcesPath: string;
}

export interface AppPaths {
  packaged: boolean;
  /** The built screen. */
  web: string;
  /** The folder holding case.schema.json and desktop_case_bridge.schema.json. */
  contracts: string;
  /** python-manifest.json, checked before the bundled engine starts; none in the repository. */
  manifest: string | null;
  /** Where the engine runs from: engine-root when packaged, the repository root otherwise. */
  engineRoot: string;
  /** The bundled runtime when packaged; none in the repository. */
  resources: string | null;
}

/** The repository root: the folder above the desktop folder. */
export function repoRoot(appPath: string): string {
  return resolve(appPath, "..");
}

export function webDist(root: string): string {
  return join(root, "web", "dist");
}

export function appPaths(place: Place): AppPaths {
  if (place.packaged) {
    return {
      packaged: true,
      web: join(place.appPath, "web"),
      contracts: join(place.appPath, "contracts"),
      manifest: join(place.resourcesPath, "python-manifest.json"),
      engineRoot: join(place.resourcesPath, "engine-root"),
      resources: place.resourcesPath,
    };
  }
  const root = repoRoot(place.appPath);
  return {
    packaged: false,
    web: webDist(root),
    contracts: join(root, "contracts"),
    manifest: null,
    engineRoot: root,
    resources: null,
  };
}

export interface EngineCommand {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

function only(values: Record<string, string | undefined>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [name, value] of Object.entries(values)) if (value !== undefined) kept[name] = value;
  return kept;
}

/**
 * The command that starts the engine on this socket. The token is not here: it goes to the
 * engine's stdin (point 9). The environment is reduced to PATH, HOME, TMPDIR and DULY_ENV.
 */
export function engineCommand(
  paths: AppPaths,
  socket: string,
  env: Readonly<Record<string, string | undefined>>,
): EngineCommand {
  if (paths.resources !== null) {
    return {
      command: join(paths.resources, "python", "bin", "python3"),
      args: [
        "-I",
        "-B",
        join(paths.engineRoot, "duly_engine.py"),
        "--mode",
        "packaged",
        "--socket",
        socket,
      ],
      cwd: paths.engineRoot,
      env: only({ PATH: "/usr/bin:/bin", HOME: env.HOME, TMPDIR: env.TMPDIR, DULY_ENV: "desktop" }),
    };
  }
  return {
    command: "uv",
    args: ["run", "python", "-m", "api.desktop_main", "--mode", "repo", "--socket", socket],
    cwd: paths.engineRoot,
    env: only({ PATH: env.PATH, HOME: env.HOME, TMPDIR: env.TMPDIR, DULY_ENV: "dev" }),
  };
}

/** The --smoke and --shots modes are for the repository; a packaged app ignores them. */
export function repoOnly<T>(packaged: boolean, read: () => T): T | null {
  return packaged ? null : read();
}

/** --verify-start: wait for health, then quit (make desktop-verify, point 25). */
export function verifyStart(argv: readonly string[]): boolean {
  return argv.includes("--verify-start");
}
